using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Sima.Api.Datos;
using Sima.Api.Dominio;
using Sima.Api.Servicios;

namespace Sima.Api.Endpoints;

public record InspeccionEntrada(int? ComponenteId, string? ComponenteTipo);
public record EscenarioEntrada(string Nombre, string? Descripcion, List<Simulacion.Inyeccion> Fallas);
public record VariableSimEntrada(string Equipo, string Variable, double Valor);

/// <summary>
/// Control de simulación (SIMA PLC Simulator) y diagnóstico en terreno. El control solo se usa con la clave del simulador:
/// los trabajadores que resuelven las fallas entran con su cuenta y no tienen esa clave, así que no pueden provocar,
/// ver la causa ni cancelar fallas. Todo opera sobre la planta simulada.
/// </summary>
public static class EndpointsSimulacion
{
    static bool EsControl(HttpRequest r, IConfiguration cfg)
        => r.Headers["X-API-Key"].ToString() is { Length: > 0 } k && k == (cfg["Simulacion:ClaveControl"] ?? cfg["Ingesta:ApiKey"] ?? "dev-ingesta-key");
    static IResult NoAutorizado() => Ayudas.Error("Solo el controlador de simulación (con la clave del simulador) puede usar esta función.", 401);

    static double? Minutos(DateTime? a, DateTime? b) => a is { } x && b is { } y ? Math.Round((y - x).TotalMinutes, 1) : null;

    public static void MapSimulacion(this IEndpointRouteBuilder app, IConfiguration cfg)
    {
        var k = app.MapGroup("/api/ingesta/simulacion");

        k.MapGet("/catalogo", (HttpRequest r) => !EsControl(r, cfg) ? NoAutorizado() : Results.Ok(new
        {
            tipos = Simulacion.Catalogo.Select(t => new { t.Clave, t.Titulo, t.Grupo, t.Sintomas, t.Especialidad, t.Criticidad, t.Impacto, t.EstadoEquipo,
                variables = t.Variables.Select(v => new { v.Patron, v.Efecto }), causas = t.Causas.Select(c => new { c.Clave, c.Texto, c.Componente, acciones = c.Acciones, c.Repuesto }) }),
            acciones = Simulacion.AccionesTexto, componentes = Simulacion.TiposComponente,
        }));

        // la planta completa tal como está en la base: estructura, componentes, sensores, PLC y fallas
        k.MapGet("/planta", async (HttpRequest r, SimaDb db) =>
        {
            if (!EsControl(r, cfg)) return NoAutorizado();
            var areas = await db.Areas.AsNoTracking().Include(a => a.Planta).Include(a => a.Lineas).ThenInclude(l => l.Equipos).ThenInclude(e => e.Sensores).OrderBy(a => a.Id).ToListAsync();
            var comps = await db.Componentes.AsNoTracking().ToListAsync();
            var plcs = await db.Plcs.AsNoTracking().ToDictionaryAsync(p => p.Id);
            var fallas = await db.FallasSimuladas.AsNoTracking().Where(f => Simulacion.Activas.Contains(f.EstadoFisico) || f.EstadoFisico == "programada").ToListAsync();
            var ots = await db.Ordenes.AsNoTracking().Where(o => o.Estado != "cerrada").Select(o => new { o.EquipoId, o.Codigo, o.Estado }).ToListAsync();
            return Results.Ok(areas.GroupBy(a => a.Planta!).Select(gp => new
            {
                planta = gp.Key.Nombre,
                areas = gp.Select(a => new
                {
                    a.Id, a.Codigo, a.Nombre,
                    lineas = a.Lineas.OrderBy(l => l.Id).Select(l => new
                    {
                        l.Id, l.Codigo, l.Nombre,
                        equipos = l.Equipos.OrderBy(e => e.Codigo).Select(e => new
                        {
                            e.Id, e.Codigo, e.Nombre, e.Tipo, e.Estado, e.Criticidad, e.Marca, e.Modelo,
                            plc = e.PlcId is { } pid && plcs.TryGetValue(pid, out var p) ? new { p.Codigo, p.Estado, p.Origen, p.VersionPrograma, p.Fabricante, p.Modelo, p.UltimoContacto } : null,
                            sensores = e.Sensores.OrderBy(s => s.Id).Select(s => new { s.Variable, s.Nombre, s.Unidad, s.Ultimo, s.Nominal, s.Aviso, s.Alarma, min = s.EscalaMin, max = s.EscalaMax }),
                            componentes = comps.Where(c => c.EquipoId == e.Id).Select(c => new { c.Id, c.Tipo, c.Codigo, c.Nombre, c.Especificacion }),
                            fallas = fallas.Where(f => f.EquipoId == e.Id).Select(f => new { f.Id, f.Codigo, f.Tipo, f.EstadoFisico, f.Severidad }),
                            ordenes = ots.Where(o => o.EquipoId == e.Id).Select(o => new { o.Codigo, o.Estado }),
                        }),
                    }),
                }),
            }));
        });

        // fallas con su causa real, el estado administrativo de la incidencia, las intervenciones evaluadas y los tiempos de respuesta
        k.MapGet("/fallas", async (bool? todas, HttpRequest r, SimaDb db) =>
        {
            if (!EsControl(r, cfg)) return NoAutorizado();
            var q = db.FallasSimuladas.AsNoTracking().AsQueryable();
            if (todas != true) q = q.Where(f => f.Creada > DateTime.UtcNow.AddDays(-7));
            var lista = await q.OrderByDescending(f => f.Id).Take(200).ToListAsync();
            var eqs = await db.Equipos.AsNoTracking().ToDictionaryAsync(e => e.Id, e => new { e.Codigo, e.Nombre, e.Estado });
            var comps = await db.Componentes.AsNoTracking().ToDictionaryAsync(c => c.Id, c => c.Nombre);
            var rep = await db.Repuestos.AsNoTracking().ToDictionaryAsync(x => x.Id, x => x.Nombre);
            var otIds = lista.Where(f => f.OrdenId is not null).Select(f => f.OrdenId!.Value).ToList();
            var ots = await db.Ordenes.AsNoTracking().Where(o => otIds.Contains(o.Id)).ToDictionaryAsync(o => o.Id);
            var nombres = await db.Trabajadores.AsNoTracking().ToDictionaryAsync(t => t.Id, t => t.Nombres + " " + t.ApellidoPaterno);
            var ids = lista.Select(f => f.Id).ToList();
            var evals = await db.EvaluacionesFalla.AsNoTracking().Where(e => ids.Contains(e.FallaId)).OrderBy(e => e.Id).ToListAsync();
            var eqIds = lista.Select(f => f.EquipoId).Distinct().ToList();
            var tomas = await db.CambiosEstado.AsNoTracking().Where(c => eqIds.Contains(c.EquipoId) && c.Hasta == EstadosEquipo.Diagnostico).Select(c => new { c.EquipoId, c.Ts }).ToListAsync();
            return Results.Ok(lista.Select(f =>
            {
                var tipo = Simulacion.Tipo(f.Tipo);
                var ot = f.OrdenId is { } oid ? ots.GetValueOrDefault(oid) : null;
                var tomada = tomas.Where(t => t.EquipoId == f.EquipoId && f.Inicio is not null && t.Ts >= f.Inicio).Select(t => (DateTime?)t.Ts).Min();
                return new
                {
                    f.Id, f.Codigo, equipo = eqs.GetValueOrDefault(f.EquipoId), componente = f.ComponenteId is { } c ? comps.GetValueOrDefault(c) : Simulacion.TiposComponente.GetValueOrDefault(f.ComponenteTipo),
                    f.Tipo, titulo = tipo?.Titulo ?? f.Tipo, f.Causa, f.Sintomas, f.Criticidad, f.Modo, f.EstadoFisico, f.Severidad, f.Creada, f.InicioProgramado, f.Inicio, f.Fin, f.Impacto, f.FactorRendimiento,
                    f.Especialidad, acciones = Simulacion.Acciones(f).Select(a => Simulacion.AccionesTexto.GetValueOrDefault(a, a)), repuesto = f.RepuestoId is { } ri ? rep.GetValueOrDefault(ri) : null,
                    f.IntentosFallidos, f.Escenario, f.PeriodoSeg, f.DuracionSeg,
                    orden = ot is null ? null : new { ot.Id, ot.Codigo, ot.Estado, asignado = ot.AsignadoAId is null ? null : nombres.GetValueOrDefault(ot.AsignadoAId), ot.Creada, ot.CierreSolicitado, ot.Cerrada },
                    tiempos = new { aIncidencia = Minutos(f.Inicio, ot?.Creada), aToma = Minutos(f.Inicio, tomada), aReparacion = Minutos(f.Inicio, f.EstadoFisico == "resuelta" ? f.Fin : null), aLiberacion = Minutos(f.Inicio, ot?.Cerrada) },
                    evaluaciones = evals.Where(e => e.FallaId == f.Id).Select(e => new { e.Fecha, e.TecnicoNombre, e.Componente, e.Accion, e.Repuestos, e.Diagnostico, e.ComponenteCorrecto, e.AccionCorrecta, e.RepuestoCorrecto, e.Resuelve, e.Motivo }),
                };
            }));
        });

        k.MapPost("/fallas", async (Simulacion.Inyeccion e, HttpRequest r, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            if (!EsControl(r, cfg)) return NoAutorizado();
            var (f, error) = await Simulacion.InyectarAsync(db, hub, e);
            return error is not null ? Ayudas.Error(error) : Results.Created($"/api/ingesta/simulacion/fallas/{f!.Id}", new { f.Id, f.Codigo, f.EstadoFisico, f.OrdenId });
        });

        // cancelar una falla: la máquina vuelve a su condición normal (si era de lógica, se restaura el peldaño original)
        k.MapPost("/fallas/{id:int}/cancelar", async (int id, HttpRequest r, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            if (!EsControl(r, cfg)) return NoAutorizado();
            var f = await db.FallasSimuladas.FindAsync(id);
            if (f is null) return Ayudas.Error("No existe esa falla.", 404);
            if (f.EstadoFisico is "resuelta" or "cancelada") return Ayudas.Error("La falla ya terminó.", 409);
            await CancelarAsync(db, hub, f);
            return Results.Ok(new { ok = true });
        });

        // restaurar condiciones iniciales: cancela todo, devuelve los equipos simulados a operación y cierra las incidencias del ejercicio
        k.MapPost("/reiniciar", async (HttpRequest r, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            if (!EsControl(r, cfg)) return NoAutorizado();
            var vivas = await db.FallasSimuladas.Where(f => f.EstadoFisico == "programada" || Simulacion.Activas.Contains(f.EstadoFisico)).ToListAsync();
            foreach (var f in vivas) await CancelarAsync(db, hub, f);
            var ordenes = await db.FallasSimuladas.Where(f => f.OrdenId != null).Select(f => f.OrdenId!.Value).Distinct().ToListAsync();
            var abiertas = await db.Ordenes.Where(o => ordenes.Contains(o.Id) && o.Estado != "cerrada").ToListAsync();
            foreach (var o in abiertas) { o.Estado = "cerrada"; o.Cerrada = DateTime.UtcNow; o.Descripcion += "\n[Cerrada por reinicio del escenario de simulación]"; }
            var equipos = await db.Equipos.Include(e => e.Plc).Where(e => e.Estado != EstadosEquipo.Operativo).ToListAsync();
            var avisos = new List<(string, object)>();
            foreach (var e in equipos.Where(e => e.Plc?.Origen != "real")) EstadosEquipo.Cambiar(db, e, EstadosEquipo.Operativo, "simulador", true, "reinicio del escenario de simulación", avisos: avisos);
            foreach (var s in await db.Sensores.ToListAsync()) s.Deriva = 0;
            var alarmas = await db.Alarmas.Where(a => a.Fin == null && a.Simulado).ToListAsync();
            foreach (var a in alarmas) a.Fin = DateTime.UtcNow;
            Eventos.Agregar(db, "simulacion", "info", $"Escenario reiniciado: {vivas.Count} fallas canceladas, {abiertas.Count} incidencias cerradas", "simulador", true);
            await db.SaveChangesAsync();
            foreach (var (n, d) in avisos) await hub.Clients.Group("planta").SendAsync(n, d);
            await hub.Clients.Group("planta").SendAsync("estructura", new { });
            return Results.Ok(new { canceladas = vivas.Count, ordenesCerradas = abiertas.Count, equipos = avisos.Count });
        });

        k.MapPost("/variables", async (VariableSimEntrada e, HttpRequest r, SimaDb db, ProcesadorTelemetria proc) =>
        {
            if (!EsControl(r, cfg)) return NoAutorizado();
            var eq = await db.Equipos.Include(x => x.Plc).FirstOrDefaultAsync(x => x.Codigo == e.Equipo);
            if (eq is null) return Ayudas.Error("No existe ese equipo.", 404);
            if (eq.Plc?.Origen == "real") return Ayudas.Error("Ese equipo está conectado a un PLC físico.", 409);
            var n = await proc.RegistrarAsync(db, new[] { new LecturaEntrada(e.Equipo, e.Variable, e.Valor) }, origen: "simulador", simulado: true);
            return n == 0 ? Ayudas.Error("El equipo no tiene esa variable.") : Results.Ok(new { ok = true });
        });

        k.MapPost("/tic", async (HttpRequest r, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            if (!EsControl(r, cfg)) return NoAutorizado();
            await Simulacion.TicAsync(db, hub);
            return Results.Ok(new { ok = true });
        });

        k.MapGet("/escenarios", async (HttpRequest r, SimaDb db) => !EsControl(r, cfg) ? NoAutorizado()
            : Results.Ok((await db.EscenariosSimulacion.AsNoTracking().OrderBy(x => x.Nombre).ToListAsync()).Select(x => new { x.Id, x.Nombre, x.Descripcion, x.Creado, x.Ejecuciones, fallas = JsonSerializer.Deserialize<JsonElement>(x.Definicion) })));
        k.MapPost("/escenarios", async (EscenarioEntrada e, HttpRequest r, SimaDb db) =>
        {
            if (!EsControl(r, cfg)) return NoAutorizado();
            if (string.IsNullOrWhiteSpace(e.Nombre) || e.Fallas is not { Count: > 0 }) return Ayudas.Error("Indique un nombre y al menos una falla.");
            if (e.Fallas.FirstOrDefault(f => Simulacion.Tipo(f.Tipo) is null) is { } mala) return Ayudas.Error($"Tipo de falla desconocido: {mala.Tipo}.");
            var x = new EscenarioSimulacion { Nombre = e.Nombre.Trim(), Descripcion = e.Descripcion?.Trim() ?? "", Definicion = JsonSerializer.Serialize(e.Fallas, new JsonSerializerOptions(JsonSerializerDefaults.Web)) };
            db.EscenariosSimulacion.Add(x);
            await db.SaveChangesAsync();
            return Results.Created($"/api/ingesta/simulacion/escenarios/{x.Id}", new { x.Id });
        });
        k.MapPost("/escenarios/{id:int}/ejecutar", async (int id, HttpRequest r, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            if (!EsControl(r, cfg)) return NoAutorizado();
            var x = await db.EscenariosSimulacion.FindAsync(id);
            if (x is null) return Ayudas.Error("No existe ese escenario.", 404);
            var fallas = JsonSerializer.Deserialize<List<Simulacion.Inyeccion>>(x.Definicion, new JsonSerializerOptions(JsonSerializerDefaults.Web)) ?? new();
            var creadas = new List<string>(); var errores = new List<string>();
            foreach (var f in fallas)
            {
                var (nueva, error) = await Simulacion.InyectarAsync(db, hub, f with { Escenario = x.Nombre });
                if (nueva is not null) creadas.Add(nueva.Codigo); else errores.Add($"{f.Equipo}: {error}");
            }
            x.Ejecuciones++;
            await db.SaveChangesAsync();
            return Results.Ok(new { creadas, errores });
        });
        k.MapDelete("/escenarios/{id:int}", async (int id, HttpRequest r, SimaDb db) =>
        {
            if (!EsControl(r, cfg)) return NoAutorizado();
            var x = await db.EscenariosSimulacion.FindAsync(id);
            if (x is null) return Ayudas.Error("No existe ese escenario.", 404);
            db.EscenariosSimulacion.Remove(x);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // ------------------------------------------------------------------------------------ diagnóstico en terreno (trabajadores)
        var g = app.MapGroup("/api").RequireAuthorization();

        // lo que el técnico necesita para diagnosticar: componentes del equipo, inspecciones hechas y catálogos de acciones
        g.MapGet("/ordenes/{id:int}/diagnostico", async (int id, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("ordenes.ver")) return Ayudas.Sin();
            var o = await db.Ordenes.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
            if (o is null) return Ayudas.Error("No existe esa orden.", 404);
            var comps = await db.Componentes.AsNoTracking().Where(c => c.EquipoId == o.EquipoId).OrderBy(c => c.Tipo).ThenBy(c => c.Codigo).ToListAsync();
            var insp = await db.InspeccionesComponente.AsNoTracking().Where(x => x.OrdenId == id).OrderBy(x => x.Id).ToListAsync();
            var compatibles = await db.EquipoRepuestos.AsNoTracking().Where(x => x.EquipoId == o.EquipoId).Select(x => x.RepuestoId).ToListAsync();
            return Results.Ok(new
            {
                componentes = comps.Select(c => new { c.Id, c.Tipo, c.Codigo, c.Nombre, c.Especificacion, tipoTexto = Simulacion.TiposComponente.GetValueOrDefault(c.Tipo, c.Tipo) }),
                // sistemas sin ficha propia (PLC, programa, transmisión): se pueden inspeccionar e intervenir igual
                sistemas = Simulacion.TiposComponente.Where(t => !comps.Any(c => c.Tipo == t.Key)).Select(t => new { tipo = t.Key, nombre = t.Value }),
                acciones = Simulacion.AccionesTexto.Select(a => new { clave = a.Key, texto = a.Value }),
                inspecciones = insp.Select(x => new { x.Id, x.Componente, x.Hallazgo, x.TecnicoNombre, x.Fecha }),
                repuestosCompatibles = compatibles,
            });
        });

        g.MapPost("/ordenes/{id:int}/inspecciones", async (int id, InspeccionEntrada e, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            var o = await db.Ordenes.FindAsync(id);
            if (o is null) return Ayudas.Error("No existe esa orden.", 404);
            if (!(s.Tiene("ordenes.ejecutar") && o.AsignadoAId == s.Id)) return Ayudas.Error("Las inspecciones las registra el técnico que ejecuta la orden.", 403);
            if (o.Estado != "en_curso") return Ayudas.Error("Para inspeccionar, tome la orden y bloquee el equipo (LOTO).", 409);
            var comp = e.ComponenteId is { } cid ? await db.Componentes.AsNoTracking().FirstOrDefaultAsync(c => c.Id == cid && c.EquipoId == o.EquipoId) : null;
            if (e.ComponenteId is not null && comp is null) return Ayudas.Error("Ese componente no pertenece al equipo.");
            var tipo = comp?.Tipo ?? e.ComponenteTipo ?? "";
            if (comp is null && !Simulacion.TiposComponente.ContainsKey(tipo)) return Ayudas.Error("Indique qué componente o sistema inspecciona.");
            var hallazgo = await Simulacion.InspeccionarAsync(db, o.EquipoId, comp?.Id, tipo);
            var x = new InspeccionComponente { OrdenId = o.Id, ComponenteId = comp?.Id, ComponenteTipo = tipo, Componente = comp?.Nombre ?? Simulacion.TiposComponente[tipo], Hallazgo = hallazgo, TecnicoId = s.Id, TecnicoNombre = s.Nombre };
            db.InspeccionesComponente.Add(x);
            db.Auditar(s, "inspeccionó un componente", "orden", o.Codigo, $"{x.Componente}: {hallazgo}");
            await db.SaveChangesAsync();
            return Results.Ok(new { x.Id, x.Componente, x.Hallazgo, x.Fecha });
        });
    }

    static async Task CancelarAsync(SimaDb db, IHubContext<PlantaHub> hub, FallaSimulada f)
    {
        if (f.Tipo == "error_logica_ladder" && f.Datos.Length > 2)
        {
            var eq = await db.Equipos.Include(e => e.Plc).FirstAsync(e => e.Id == f.EquipoId);
            var d = JsonSerializer.Deserialize<JsonElement>(f.Datos);
            if (eq.Plc is { } plc && d.TryGetProperty("peldano", out var pid) && d.TryGetProperty("original", out var orig))
            {
                var prog = JsonSerializer.Deserialize<JsonElement>(plc.Programa);
                var original = JsonSerializer.Deserialize<JsonElement>(orig.GetString()!);
                var peldanos = prog.GetProperty("peldanos").EnumerateArray().Select(p => p.TryGetProperty("id", out var i) && i.GetInt32() == pid.GetInt32() ? original : p).ToList();
                plc.VersionPrograma++;
                plc.Programa = JsonSerializer.Serialize(new { version = plc.VersionPrograma, variables = prog.TryGetProperty("variables", out var v) ? (JsonElement?)v : null, peldanos });
            }
        }
        await Simulacion.ResolverAsync(db, hub, f, "cancelada por el controlador de simulación", cancelada: true);
    }
}
