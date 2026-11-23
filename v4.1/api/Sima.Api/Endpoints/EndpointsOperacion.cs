using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Sima.Api.Datos;
using Sima.Api.Dominio;
using Sima.Api.Servicios;

namespace Sima.Api.Endpoints;

public record MovimientoEntrada(int Cantidad, int? OrdenId, string? Nota);
public record DespachoEntrada(string Destino, string Carga, string Vehiculo, string Conductor, DateTime Compromiso);
public record ResultadoItem(string Item, bool Ok, string? Nota);
public record EjecutarRutinaEntrada(string? Uid, string Equipo, List<ResultadoItem> Resultados, string? Observaciones);
public record RevisionEntrada(List<bool> Revisiones, string? Notas);

/// <summary>Pañol, logística, rutinas preventivas, traspaso de turno e indicadores.</summary>
public static class EndpointsOperacion
{
    static readonly string[] RutinasSemanales = { "operador", "supervisor_turno", "tecnico", "supervisor_mant", "jefe_mant", "confiabilidad" };
    static readonly string[] RutinasTrimestrales = { "ing_automatizacion", "instrumentacion", "supervisor_mant", "jefe_mant" };
    public static readonly string[] ItemsTraspaso =
    {
        "Órdenes ejecutadas, pendientes y cantidad conforme/no conforme.", "Equipos fuera de servicio, alarmas, fallas recurrentes y OT abiertas.", "Cambios autorizados de proceso, producto, lote o receta.",
        "Stock crítico, materiales faltantes y disponibilidad de insumos.", "Riesgos emergentes, controles temporales y acciones por resolver.", "Nombres o cargos de responsables y plazo de respuesta.",
    };
    static readonly Dictionary<string, int> Periodos = new() { ["turno"] = 8, ["semanal"] = 24 * 7, ["mensual"] = 24 * 30, ["trimestral"] = 24 * 90 };

    static string EstadoCal(Herramienta h, DateOnly hoy) => !h.RequiereCalibracion ? "SIN CALIBRACIÓN" : h.ProximaCalibracion is null || h.ProximaCalibracion < hoy ? "VENCIDA" : h.ProximaCalibracion.Value.DayNumber - hoy.DayNumber <= 30 ? "POR VENCER" : "VIGENTE";

    public static void MapOperacion(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api").RequireAuthorization();

        // ------------------------------------------------------------------------------------ herramientas
        g.MapGet("/herramientas", async (ClaimsPrincipal u, SimaDb db) =>
        {
            if (!u.S().Tiene("herramientas.ver")) return Ayudas.Sin();
            var hoy = Reloj.Hoy();
            return Results.Ok((await db.Herramientas.AsNoTracking().OrderBy(h => h.Codigo).ToListAsync()).Select(h => new
            { h.Id, h.Codigo, h.Nombre, h.Estado, h.RequiereCalibracion, h.CalibracionDias, proxima = h.ProximaCalibracion, dias = h.ProximaCalibracion is { } p ? p.DayNumber - hoy.DayNumber : (int?)null, calibracion = EstadoCal(h, hoy), retiradaPor = h.RetiradaPorNombre, h.RetiradaPorId, h.RetiradaEn }));
        });

        g.MapPost("/herramientas/{id:int}/retirar", async (int id, ClaimsPrincipal u, SimaDb db) =>
        {
            var h = await db.Herramientas.FindAsync(id);
            if (h is null) return Ayudas.Error("No existe esa herramienta.", 404);
            if (h.Estado != "disponible") return Ayudas.Error($"Ya la tiene {h.RetiradaPorNombre}.", 409);
            if (EstadoCal(h, Reloj.Hoy()) == "VENCIDA") return Ayudas.Error("Su calibración está vencida: no se puede retirar. Pida a instrumentación que la calibre.", 409);
            var s = u.S();
            h.Estado = "retirada"; h.RetiradaPorId = s.Id; h.RetiradaPorNombre = s.Nombre; h.RetiradaEn = DateTime.UtcNow;
            db.Auditar(s, "retiró una herramienta", "herramienta", h.Codigo, h.Nombre);
            await db.SaveChangesAsync();
            return Results.Ok(new { ok = true });
        });

        g.MapPost("/herramientas/{id:int}/devolver", async (int id, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            var h = await db.Herramientas.FindAsync(id);
            if (h is null) return Ayudas.Error("No existe esa herramienta.", 404);
            if (h.Estado != "retirada") return Ayudas.Error("La herramienta ya está en el pañol.", 409);
            if (h.RetiradaPorId != s.Id && !s.Puede("herramientas", "editar")) return Ayudas.Error("Solo quien la retiró o el pañol puede devolverla.", 403);
            h.Estado = "disponible"; h.RetiradaPorId = null; h.RetiradaPorNombre = null; h.RetiradaEn = null;
            db.Auditar(s, "devolvió una herramienta", "herramienta", h.Codigo, h.Nombre);
            await db.SaveChangesAsync();
            return Results.Ok(new { ok = true });
        });

        g.MapPost("/herramientas/{id:int}/calibrar", async (int id, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Puede("herramientas", "editar")) return Ayudas.Sin();
            var h = await db.Herramientas.FindAsync(id);
            if (h is null) return Ayudas.Error("No existe esa herramienta.", 404);
            if (!h.RequiereCalibracion) return Ayudas.Error("Esta herramienta no requiere calibración.", 409);
            h.ProximaCalibracion = Reloj.Hoy().AddDays(h.CalibracionDias);
            db.Auditar(s, "registró una calibración", "herramienta", h.Codigo, $"{h.Nombre}: próxima el {h.ProximaCalibracion}");
            await db.SaveChangesAsync();
            return Results.Ok(new { proxima = h.ProximaCalibracion });
        });

        // ------------------------------------------------------------------------------------ repuestos
        g.MapGet("/repuestos", async (ClaimsPrincipal u, SimaDb db) => !u.S().Tiene("repuestos.ver") ? Ayudas.Sin() : Results.Ok((await db.Repuestos.AsNoTracking().OrderBy(r => r.Codigo).ToListAsync()).Select(r => new
        { r.Id, r.Codigo, r.Nombre, r.Tipo, r.Bodega, r.Ubicacion, r.Stock, r.StockMinimo, r.CostoUnitario, r.Critico, bajoMinimo = r.Stock <= r.StockMinimo, valor = (long)r.Stock * r.CostoUnitario })));

        g.MapGet("/repuestos/{id:int}/movimientos", async (int id, ClaimsPrincipal u, SimaDb db) => !u.S().Tiene("repuestos.ver") ? Ayudas.Sin() :
            Results.Ok(await db.MovimientosRepuesto.AsNoTracking().Where(m => m.RepuestoId == id).OrderByDescending(m => m.Id).Take(30).ToListAsync()));

        g.MapPost("/repuestos/{id:int}/movimiento", async (int id, MovimientoEntrada e, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (e.Cantidad == 0) return Ayudas.Error("La cantidad no puede ser cero.");
            if (e.Cantidad < 0 ? !s.Tiene("repuestos.retirar") : !s.Tiene("repuestos.editar")) return Ayudas.Sin();
            if (e.Cantidad < 0 && e.OrdenId is null && !(s.Tiene("repuestos.editar") && !string.IsNullOrWhiteSpace(e.Nota)))
                return Ayudas.Error("Todo egreso de repuestos debe ir asociado a una orden de trabajo.");
            var r = await db.Repuestos.FindAsync(id);
            if (r is null) return Ayudas.Error("No existe ese repuesto.", 404);
            if (r.Stock + e.Cantidad < 0) return Ayudas.Error($"No hay stock suficiente: quedan {r.Stock}.", 409);
            if (e.OrdenId is { } oid && !await db.Ordenes.AnyAsync(o => o.Id == oid)) return Ayudas.Error("La orden de trabajo no existe.", 404);
            r.Stock += e.Cantidad;
            db.MovimientosRepuesto.Add(new MovimientoRepuesto { RepuestoId = id, Cantidad = e.Cantidad, OrdenId = e.OrdenId, PorId = s.Id, PorNombre = s.Nombre, Nota = e.Nota ?? "" });
            db.Auditar(s, e.Cantidad < 0 ? "retiró repuestos" : "ingresó repuestos", "repuesto", r.Codigo, $"{r.Nombre}: {e.Cantidad:+#;-#}");
            await db.SaveChangesAsync();
            return Results.Ok(new { r.Stock, bajoMinimo = r.Stock <= r.StockMinimo });
        });

        // ------------------------------------------------------------------------------------ despachos
        g.MapGet("/despachos", async (string? estado, ClaimsPrincipal u, SimaDb db) =>
        {
            if (!u.S().Puede("despachos", "ver")) return Ayudas.Sin();
            var q = db.Despachos.AsNoTracking().AsQueryable();
            if (!string.IsNullOrEmpty(estado)) q = q.Where(d => d.Estado == estado);
            return Results.Ok((await q.OrderByDescending(d => d.Id).ToListAsync()).Select(d => new
            { d.Id, d.Codigo, d.Origen, d.Destino, d.Carga, d.Vehiculo, d.Conductor, d.Estado, d.Compromiso, d.Salida, d.Entrega, atrasado = d.Estado != "entregado" ? d.Compromiso < DateTime.UtcNow : d.Entrega > d.Compromiso }));
        });

        g.MapPost("/despachos", async (DespachoEntrada e, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Puede("despachos", "editar")) return Ayudas.Sin();
            if (string.IsNullOrWhiteSpace(e.Destino) || string.IsNullOrWhiteSpace(e.Carga)) return Ayudas.Error("Indique el destino y la carga.");
            var d = new Despacho { Destino = e.Destino.Trim(), Carga = e.Carga.Trim(), Vehiculo = e.Vehiculo ?? "", Conductor = e.Conductor ?? "", Compromiso = e.Compromiso.ToUniversalTime() };
            db.Despachos.Add(d);
            await db.SaveChangesAsync();
            db.Auditar(s, "creó un despacho", "despacho", d.Codigo, $"{d.Destino}: {d.Carga}");
            await db.SaveChangesAsync();
            return Results.Created($"/api/despachos/{d.Id}", new { d.Id, d.Codigo });
        });

        g.MapPost("/despachos/{id:int}/avanzar", async (int id, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Puede("despachos", "editar")) return Ayudas.Sin();
            var d = await db.Despachos.FindAsync(id);
            if (d is null) return Ayudas.Error("No existe ese despacho.", 404);
            if (d.Estado == "entregado") return Ayudas.Error("El despacho ya fue entregado.", 409);
            if (d.Estado == "pendiente") { d.Estado = "en_ruta"; d.Salida = DateTime.UtcNow; } else { d.Estado = "entregado"; d.Entrega = DateTime.UtcNow; }
            db.Auditar(s, d.Estado == "en_ruta" ? "despachó un envío" : "registró una entrega", "despacho", d.Codigo, d.Destino);
            await db.SaveChangesAsync();
            return Results.Ok(new { d.Estado });
        });

        // ------------------------------------------------------------------------------------ rutinas preventivas
        g.MapGet("/rutinas", async (SimaDb db) =>
        {
            var plantillas = await db.Rutinas.AsNoTracking().OrderBy(r => r.Id).ToListAsync();
            var equipos = await db.Equipos.AsNoTracking().OrderBy(e => e.Codigo).ToListAsync();
            var ult = (await db.EjecucionesRutina.AsNoTracking().GroupBy(x => new { x.RutinaId, x.EquipoId }).Select(gr => gr.OrderByDescending(x => x.Fecha).First()).ToListAsync()).ToDictionary(x => (x.RutinaId, x.EquipoId));
            var ahora = DateTime.UtcNow;
            return Results.Ok(new
            {
                plantillas = plantillas.Select(p => new { p.Id, p.Nombre, p.Frecuencia, items = JsonSerializer.Deserialize<string[]>(p.Items), horas = Periodos[p.Frecuencia] }),
                filas = plantillas.SelectMany(p => equipos.Select(e =>
                {
                    ult.TryGetValue((p.Id, e.Id), out var x);
                    return new { rutinaId = p.Id, rutina = p.Nombre, p.Frecuencia, equipo = e.Codigo, equipoNombre = e.Nombre, ultima = x is null ? null : new { x.Fecha, por = x.PorNombre, x.ConHallazgos }, vencida = x is null || (ahora - x.Fecha).TotalHours > Periodos[p.Frecuencia] };
                })),
            });
        });

        g.MapPost("/rutinas/{id:int}/ejecutar", async (int id, EjecutarRutinaEntrada e, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            var p = await db.Rutinas.FindAsync(id);
            if (p is null) return Ayudas.Error("No existe esa rutina.", 404);
            if (p.Frecuencia is "semanal" or "mensual" && !RutinasSemanales.Contains(s.Perfil) || p.Frecuencia == "trimestral" && !RutinasTrimestrales.Contains(s.Perfil))
                return Ayudas.Error("Esta rutina la hace personal autorizado.", 403);
            if (e.Uid is { Length: > 0 } && await db.EjecucionesRutina.AnyAsync(x => x.Uid == e.Uid)) return Results.Ok(new { repetida = true });
            var eq = await db.Equipos.FirstOrDefaultAsync(x => x.Codigo == e.Equipo);
            if (eq is null) return Ayudas.Error("No existe ese equipo.", 404);
            var items = JsonSerializer.Deserialize<string[]>(p.Items)!;
            if (e.Resultados is null || e.Resultados.Count != items.Length) return Ayudas.Error("Responda todos los puntos de la lista.");
            var fallas = e.Resultados.Where(r => !r.Ok).ToList();
            var ej = new EjecucionRutina { Uid = e.Uid, RutinaId = id, EquipoId = eq.Id, PorId = s.Id, PorNombre = s.Nombre, Resultados = JsonSerializer.Serialize(e.Resultados), Observaciones = e.Observaciones ?? "", ConHallazgos = fallas.Count > 0 };
            db.EjecucionesRutina.Add(ej);
            string? orden = null;
            if (fallas.Count > 0)
            {
                var ot = new OrdenTrabajo { EquipoId = eq.Id, Titulo = $"Hallazgo en {p.Nombre.ToLower()} de {eq.Nombre}", Prioridad = eq.Criticidad == "alta" ? "alta" : "media", CreadaPorId = s.Id,
                    Descripcion = string.Join("\n", fallas.Select(f => $"• {f.Item}{(string.IsNullOrWhiteSpace(f.Nota) ? "" : ": " + f.Nota)}")) };
                db.Ordenes.Add(ot);
                await db.SaveChangesAsync();
                orden = ot.Codigo;
            }
            db.Auditar(s, $"hizo la {p.Nombre.ToLower()}", "rutina", eq.Codigo, fallas.Count == 0 ? "sin hallazgos" : $"{fallas.Count} hallazgos");
            await db.SaveChangesAsync();
            return Results.Ok(new { ej.Id, hallazgos = fallas.Count, orden });
        });

        // ------------------------------------------------------------------------------------ traspaso de turno
        g.MapGet("/traspaso/borrador", async (ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Puede("traspaso", "ver")) return Ayudas.Sin();
            var eq = await db.Equipos.AsNoTracking().ToDictionaryAsync(e => e.Id);
            var ordenes = await db.Ordenes.AsNoTracking().Where(o => o.Estado != "cerrada").OrderByDescending(o => o.Id).ToListAsync();
            var nombres = await db.Trabajadores.AsNoTracking().ToDictionaryAsync(t => t.Id, t => t.Nombres + " " + t.ApellidoPaterno);
            var rutinas = await db.Rutinas.AsNoTracking().ToListAsync();
            var ult = (await db.EjecucionesRutina.AsNoTracking().GroupBy(x => new { x.RutinaId, x.EquipoId }).Select(gr => gr.OrderByDescending(x => x.Fecha).First()).ToListAsync()).ToDictionary(x => (x.RutinaId, x.EquipoId));
            var ahora = DateTime.UtcNow;
            var vencidas = rutinas.Where(r => r.Frecuencia == "turno").SelectMany(r => eq.Values.Select(e => (r, e))).Count(x => !ult.TryGetValue((x.r.Id, x.e.Id), out var l) || (ahora - l.Fecha).TotalHours > Periodos["turno"]);
            return Results.Ok(new
            {
                fecha = ahora, turno = s.Turno, items = ItemsTraspaso, rutinasVencidas = vencidas,
                ordenesAbiertas = ordenes.Where(o => o.Estado == "abierta").Select(o => new { o.Codigo, equipo = eq[o.EquipoId].Codigo, o.Titulo, o.Prioridad }),
                ordenesEnCurso = ordenes.Where(o => o.Estado == "en_curso").Select(o => new { o.Codigo, equipo = eq[o.EquipoId].Codigo, o.Titulo, asignado = o.AsignadoAId == null ? null : nombres.GetValueOrDefault(o.AsignadoAId) }),
                equiposFuera = eq.Values.Where(e => e.Estado != "operando").Select(e => new { e.Codigo, e.Nombre, e.Estado }),
                alarmasAbiertas = (await db.Alarmas.AsNoTracking().Where(a => a.Fin == null).ToListAsync()).Select(a => new { equipo = eq[a.EquipoId].Codigo, a.Nivel, a.Mensaje }),
                repuestosCriticos = (await db.Repuestos.AsNoTracking().Where(r => r.Critico && r.Stock <= r.StockMinimo).ToListAsync()).Select(r => new { r.Codigo, r.Nombre, r.Stock, minimo = r.StockMinimo }),
            });
        });

        g.MapGet("/traspaso", async (ClaimsPrincipal u, SimaDb db) =>
            !u.S().Puede("traspaso", "ver") ? Ayudas.Sin() : Results.Ok((await db.Traspasos.AsNoTracking().OrderByDescending(t => t.Id).Take(30).ToListAsync())
                .Select(t => new { t.Id, t.Fecha, t.Turno, por = t.PorNombre, t.Notas, revisiones = JsonSerializer.Deserialize<JsonElement>(t.Revisiones), resumen = JsonSerializer.Deserialize<JsonElement>(t.Resumen) })));

        g.MapPost("/traspaso", async (RevisionEntrada e, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Puede("traspaso", "editar")) return Ayudas.Sin();
            if (e.Revisiones is null || e.Revisiones.Count != ItemsTraspaso.Length) return Ayudas.Error("Responda las seis revisiones.");
            var eq = await db.Equipos.AsNoTracking().ToListAsync();
            var resumen = new
            {
                ordenesAbiertas = await db.Ordenes.CountAsync(o => o.Estado == "abierta"), ordenesEnCurso = await db.Ordenes.CountAsync(o => o.Estado == "en_curso"),
                equiposFuera = eq.Where(x => x.Estado != "operando").Select(x => $"{x.Codigo}: {x.Estado}"), alarmasAbiertas = await db.Alarmas.CountAsync(a => a.Fin == null),
                repuestosCriticosBajos = await db.Repuestos.CountAsync(r => r.Critico && r.Stock <= r.StockMinimo),
            };
            var t = new Traspaso { Turno = s.Turno, PorId = s.Id, PorNombre = s.Nombre, Notas = e.Notas ?? "", Resumen = JsonSerializer.Serialize(resumen),
                Revisiones = JsonSerializer.Serialize(ItemsTraspaso.Select((texto, i) => new { texto, ok = e.Revisiones[i] })) };
            db.Traspasos.Add(t);
            db.Auditar(s, "entregó el turno", "traspaso", s.Turno, $"{e.Revisiones.Count(x => x)} de {e.Revisiones.Count} revisiones");
            await db.SaveChangesAsync();
            return Results.Created($"/api/traspaso/{t.Id}", new { t.Id });
        });

        // ------------------------------------------------------------------------------------ indicadores
        g.MapGet("/kpis", async (int? dias, ClaimsPrincipal u, SimaDb db) =>
        {
            if (!u.S().Puede("kpis", "ver")) return Ayudas.Sin();
            var (kpis, equipos) = await Indicadores.CalcularAsync(db, dias ?? 30);
            return Results.Ok(new { dias = Math.Clamp(dias ?? 30, 1, 90), kpis, equipos });
        });
    }
}
