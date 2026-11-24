using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Sima.Api.Datos;
using Sima.Api.Dominio;
using Sima.Api.Servicios;

namespace Sima.Api.Endpoints;

public record EquipoEntrada(string Codigo, string Nombre, string Tipo, int LineaId, string? Ubicacion, string? Marca, string? Modelo, string? Criticidad, string? Plc, string? ModeloSimulacion, uint? Version);
public record AreaEntrada(string Codigo, string Nombre, string Tipo);
public record LineaEntrada(int AreaId, string Codigo, string Nombre);
public record ConsumoEntrada(int RepuestoId, int Cantidad);
public record PlanificarEntrada(uint Version, string? AsignadoAId, DateOnly? Programada, string? Prioridad, string? Especialidad, bool QuitarAsignacion = false, bool QuitarFecha = false);
public record IntervencionEntrada(string? Uid, DateTime? Inicio, DateTime? Fin, string Causa, string Diagnostico, string Accion, string Resultado, string? Observaciones,
    List<ConsumoEntrada>? Repuestos, List<int>? Herramientas, bool Cerrar, bool LotoRetirado, List<PruebaEntrada>? Pruebas = null, bool? AfectaSeguridad = null, bool? AfectaCalidad = null,
    int? ComponenteId = null, string? ComponenteTipo = null, string? TipoAccion = null);

/// <summary>Integración v4.1: estructura de planta, ficha completa de equipos, eventos e intervenciones técnicas.</summary>
public static class EndpointsV41
{
    static readonly string[] Causas = { "mecanica", "electrica", "hidraulica", "neumatica", "electronica", "operacional", "desgaste" };
    static readonly string[] Resultados = { "resuelto", "parcial", "requiere_repuesto" };
    public static readonly string[] Especialidades = { "mecanica", "electrica", "electromecanica", "instrumentacion", "automatizacion", "general" };
    static readonly string[] PerfilesTecnicos = { "tecnico", "supervisor_mant", "confiabilidad", "instrumentacion", "ing_automatizacion" };
    static string EstadoPlc(Plc p) => p.UltimoContacto is null || p.UltimoContacto < DateTime.UtcNow.AddSeconds(-10) ? "sin_conexion" : p.Estado;

    public static void MapV41(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api").RequireAuthorization();

        // ================================================================================== estructura de planta
        // nombres de las áreas, para que cualquiera pueda indicar dónde ocurrió un evento de seguridad (no expone la planta)
        g.MapGet("/estructura/areas", async (SimaDb db) => Results.Ok(await db.Areas.AsNoTracking().OrderBy(a => a.Nombre).Select(a => new { a.Id, a.Codigo, a.Nombre }).ToListAsync()));

        g.MapGet("/estructura", async (ClaimsPrincipal u, SimaDb db) =>
        {
            if (!u.S().Tiene("planta.ver")) return Ayudas.Sin();
            var plantas = await db.Plantas.AsNoTracking().Include(p => p.Areas).ThenInclude(a => a.Lineas).ThenInclude(l => l.Equipos).ThenInclude(e => e.Plc).ToListAsync();
            var plcs = await db.Plcs.AsNoTracking().ToListAsync();
            var alarmas = (await db.Alarmas.AsNoTracking().Where(a => a.Fin == null).ToListAsync()).GroupBy(a => a.EquipoId).ToDictionary(x => x.Key, x => x.Count());
            return Results.Ok(plantas.Select(p => new
            {
                p.Id, p.Codigo, p.Nombre, p.Ciudad,
                areas = p.Areas.OrderBy(a => a.Orden).Select(a => new
                {
                    a.Id, a.Codigo, a.Nombre, a.Tipo,
                    plcs = plcs.Where(x => x.AreaId == a.Id).Select(x => new { x.Codigo, x.Nombre, estado = EstadoPlc(x), x.Origen }),
                    lineas = a.Lineas.OrderBy(l => l.Codigo).Select(l => new
                    {
                        l.Id, l.Codigo, l.Nombre,
                        equipos = l.Equipos.OrderBy(e => e.Codigo).Select(e => new { e.Codigo, e.Nombre, e.Tipo, e.Estado, e.Criticidad, plc = e.Plc?.Codigo, simulado = e.Plc?.Origen != "real", e.ModeloSimulacion, alarmas = alarmas.GetValueOrDefault(e.Id) }),
                    }),
                }),
            }));
        });

        g.MapPost("/estructura/areas", async (AreaEntrada e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (!s.Tiene("equipos.editar")) return Ayudas.Sin();
            if (string.IsNullOrWhiteSpace(e.Codigo) || string.IsNullOrWhiteSpace(e.Nombre)) return Ayudas.Error("Indique código y nombre del área.");
            var planta = await db.Plantas.FirstAsync();
            if (await db.Areas.AnyAsync(a => a.PlantaId == planta.Id && a.Codigo == e.Codigo.Trim().ToUpper())) return Ayudas.Error("Ya existe un área con ese código.", 409);
            var a = new AreaPlanta { PlantaId = planta.Id, Codigo = e.Codigo.Trim().ToUpper(), Nombre = e.Nombre.Trim(), Tipo = e.Tipo is "produccion" or "servicios" or "bodega" or "patio" ? e.Tipo : "produccion", Orden = await db.Areas.CountAsync() };
            db.Areas.Add(a);
            db.Auditar(s, "creó un área de planta", "area", a.Codigo, a.Nombre);
            await db.SaveChangesAsync();
            await hub.Clients.Group("planta").SendAsync("estructura", new { tipo = "area", codigo = a.Codigo });
            return Results.Created($"/api/estructura/areas/{a.Id}", new { a.Id });
        });

        g.MapPost("/estructura/lineas", async (LineaEntrada e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (!s.Tiene("equipos.editar")) return Ayudas.Sin();
            if (await db.Areas.FindAsync(e.AreaId) is null) return Ayudas.Error("El área no existe.", 404);
            if (string.IsNullOrWhiteSpace(e.Codigo) || string.IsNullOrWhiteSpace(e.Nombre)) return Ayudas.Error("Indique código y nombre de la línea.");
            if (await db.Lineas.AnyAsync(l => l.AreaId == e.AreaId && l.Codigo == e.Codigo.Trim().ToUpper())) return Ayudas.Error("Ya existe una línea con ese código en el área.", 409);
            var l = new LineaProduccion { AreaId = e.AreaId, Codigo = e.Codigo.Trim().ToUpper(), Nombre = e.Nombre.Trim() };
            db.Lineas.Add(l);
            db.Auditar(s, "creó una línea de producción", "linea", l.Codigo, l.Nombre);
            await db.SaveChangesAsync();
            await hub.Clients.Group("planta").SendAsync("estructura", new { tipo = "linea", codigo = l.Codigo });
            return Results.Created($"/api/estructura/lineas/{l.Id}", new { l.Id });
        });

        // ================================================================================== ficha completa de un equipo
        g.MapGet("/equipos/{codigo}", async (string codigo, ClaimsPrincipal u, SimaDb db) =>
        {
            if (!u.S().Tiene("planta.ver")) return Ayudas.Sin();
            var e = await db.Equipos.AsNoTracking().Include(x => x.Sensores).Include(x => x.Componentes).Include(x => x.Plc).ThenInclude(p => p!.Puntos).Include(x => x.Linea).ThenInclude(l => l!.Area).ThenInclude(a => a!.Planta)
                .FirstOrDefaultAsync(x => x.Codigo == codigo);
            if (e is null) return Ayudas.Error("No existe ese equipo.", 404);
            var nombres = await db.Trabajadores.AsNoTracking().ToDictionaryAsync(t => t.Id, t => t.Nombres + " " + t.ApellidoPaterno);
            var ordenes = await db.Ordenes.AsNoTracking().Where(o => o.EquipoId == e.Id).OrderByDescending(o => o.Id).Take(25).ToListAsync();
            var idsOt = ordenes.Select(o => o.Id).ToList();
            var inter = await db.Intervenciones.AsNoTracking().Include(i => i.Herramientas).Where(i => idsOt.Contains(i.OrdenId)).OrderByDescending(i => i.Fin).ToListAsync();
            var idsInt = inter.Select(i => i.Id).ToList();
            var consumos = await db.MovimientosRepuesto.AsNoTracking().Where(m => m.IntervencionId != null && idsInt.Contains(m.IntervencionId.Value)).ToListAsync();
            var repuestos = await db.Repuestos.AsNoTracking().ToDictionaryAsync(r => r.Id);
            var herramientas = await db.Herramientas.AsNoTracking().ToDictionaryAsync(h => h.Id, h => h.Nombre);
            var lista = await db.EquipoRepuestos.AsNoTracking().Where(x => x.EquipoId == e.Id).ToListAsync();
            var (_, indic) = await Indicadores.CalcularAsync(db, 30);
            var ind = indic.FirstOrDefault(i => i.Codigo == e.Codigo);
            return Results.Ok(new
            {
                equipo = new { e.Codigo, e.Nombre, e.Tipo, e.Marca, e.Modelo, e.Criticidad, e.Estado, estadoTexto = EstadosEquipo.Texto(e.Estado), e.Ubicacion, e.ModeloSimulacion, e.Version, simulado = e.Plc?.Origen != "real", e.LineaId },
                ficha = new
                {
                    e.NumeroSerie, e.Fabricante, e.FechaInstalacion, horasFuncionamiento = Math.Round(e.HorasFuncionamiento), e.EspecElectrica, e.EspecMecanica, demo = e.FichaDemo,
                    responsableMant = e.ResponsableMantId is null ? null : await db.Trabajadores.AsNoTracking().Where(t => t.Id == e.ResponsableMantId).Select(t => t.Nombres + " " + t.ApellidoPaterno).FirstOrDefaultAsync(),
                    responsableProd = e.ResponsableProdId is null ? null : await db.Trabajadores.AsNoTracking().Where(t => t.Id == e.ResponsableProdId).Select(t => t.Nombres + " " + t.ApellidoPaterno).FirstOrDefaultAsync(),
                    proximaPreventiva = await db.Ordenes.AsNoTracking().Where(o => o.EquipoId == e.Id && o.Tipo == "preventiva" && o.Estado != "cerrada" && o.Programada != null).OrderBy(o => o.Programada).Select(o => new { o.Id, o.Codigo, o.Programada }).FirstOrDefaultAsync(),
                },
                componentes = e.Componentes.OrderBy(c => c.Tipo).ThenBy(c => c.Codigo).Select(c => new { c.Id, c.Tipo, c.Codigo, c.Nombre, c.Marca, c.Modelo, c.Especificacion, c.Demo }),
                jerarquia = new { planta = e.Linea!.Area!.Planta!.Nombre, area = new { e.Linea.Area.Id, e.Linea.Area.Codigo, e.Linea.Area.Nombre }, linea = new { e.Linea.Id, e.Linea.Codigo, e.Linea.Nombre } },
                plc = e.Plc is null ? null : new { e.Plc.Codigo, e.Plc.Nombre, e.Plc.Fabricante, e.Plc.Modelo, estado = EstadoPlc(e.Plc), e.Plc.Origen, e.Plc.Direccion,
                    puntos = e.Plc.Puntos.Where(p => p.EquipoId == e.Id).OrderBy(p => p.Tipo).ThenBy(p => p.Canal).Select(p => new { p.Direccion, p.Tag, p.Tipo, p.Descripcion, p.Unidad }) },
                sensores = e.Sensores.OrderBy(s => s.Id).Select(s => new { s.Variable, s.Nombre, s.Unidad, s.Ultimo, s.UltimoEn, min = s.EscalaMin, max = s.EscalaMax, s.Nominal, s.Aviso, s.Alarma, nivel = s.Ultimo is null ? "ok" : s.Ultimo >= s.Alarma ? "alarma" : s.Ultimo >= s.Aviso ? "aviso" : "ok" }),
                indicadores = ind is null ? null : new { ind.Disponibilidad, ind.Rendimiento, ind.Calidad, ind.Oee, ind.MttrHoras, ind.MtbfHoras, ind.Fallas, ind.HorasParada },
                alarmas = await db.Alarmas.AsNoTracking().Where(a => a.EquipoId == e.Id).OrderByDescending(a => a.Id).Take(20).Select(a => new { a.Id, a.Nivel, a.Mensaje, a.Inicio, a.Fin, a.ReconocidaPor, a.Simulado }).ToListAsync(),
                ordenes = ordenes.Select(o => new { o.Id, o.Codigo, o.Titulo, o.Tipo, o.Prioridad, o.Estado, o.Automatica, o.Creada, o.Cerrada, asignado = o.AsignadoAId is null ? null : nombres.GetValueOrDefault(o.AsignadoAId), intervenciones = inter.Count(i => i.OrdenId == o.Id) }),
                intervenciones = inter.Take(15).Select(i => new
                {
                    i.Id, orden = ordenes.First(o => o.Id == i.OrdenId).Codigo, i.TecnicoNombre, i.Inicio, i.Fin, horas = Math.Round((i.Fin - i.Inicio).TotalHours, 1), i.Causa, i.Diagnostico, i.Accion, i.Resultado, i.Observaciones,
                    repuestos = consumos.Where(c => c.IntervencionId == i.Id).Select(c => new { repuestos[c.RepuestoId].Codigo, repuestos[c.RepuestoId].Nombre, cantidad = -c.Cantidad }),
                    herramientas = i.Herramientas.Select(h => herramientas.GetValueOrDefault(h.HerramientaId)),
                }),
                historial = await db.CambiosEstado.AsNoTracking().Where(c => c.EquipoId == e.Id).OrderByDescending(c => c.Id).Take(30).Select(c => new { c.Ts, c.Desde, c.Hasta, c.Origen, c.Simulado, c.Causa, por = c.PorNombre, cargo = c.PorCargo }).ToListAsync(),
                documentos = await db.Documentos.AsNoTracking().Where(d => d.EquipoId == e.Id || (d.EquipoId == null && d.TipoEquipo == e.Tipo)).OrderBy(d => d.Clase).Select(d => new { d.Id, d.Titulo, d.Clase, d.Version, d.Contenido }).ToListAsync(),
                repuestos = lista.Select(x => repuestos[x.RepuestoId]).Select(r => new { r.Id, r.Codigo, r.Nombre, r.Stock, r.StockMinimo, r.Ubicacion, r.Critico, sugerida = lista.First(x => x.RepuestoId == r.Id).CantidadSugerida }),
            });
        });

        g.MapPost("/equipos", async (EquipoEntrada e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (!s.Tiene("equipos.editar")) return Ayudas.Sin();
            var codigo = (e.Codigo ?? "").Trim().ToUpper();
            if (!System.Text.RegularExpressions.Regex.IsMatch(codigo, @"^[A-Z]{2,4}-\d{2,3}$")) return Ayudas.Error("El código debe tener el formato XX-00 (por ejemplo, TC-03).");
            if (string.IsNullOrWhiteSpace(e.Nombre) || string.IsNullOrWhiteSpace(e.Tipo)) return Ayudas.Error("Indique nombre y tipo del equipo.");
            if (await db.Equipos.AnyAsync(x => x.Codigo == codigo)) return Ayudas.Error("Ya existe un equipo con ese código.", 409);
            var linea = await db.Lineas.Include(l => l.Area).FirstOrDefaultAsync(l => l.Id == e.LineaId);
            if (linea is null) return Ayudas.Error("La línea no existe.", 404);
            var plc = e.Plc is { Length: > 0 } ? await db.Plcs.FirstOrDefaultAsync(p => p.Codigo == e.Plc) : null;
            if (e.Plc is { Length: > 0 } && plc is null) return Ayudas.Error("El PLC no existe.", 404);
            var eq = new Equipo
            {
                Codigo = codigo, Nombre = e.Nombre.Trim(), Tipo = e.Tipo.Trim(), LineaId = linea.Id, Ubicacion = e.Ubicacion?.Trim() ?? linea.Area!.Nombre, Marca = e.Marca?.Trim() ?? "", Modelo = e.Modelo?.Trim() ?? "",
                Criticidad = e.Criticidad is "baja" or "media" or "alta" ? e.Criticidad : "media", Estado = EstadosEquipo.Liberado, PlcId = plc?.Id,
                ModeloSimulacion = e.ModeloSimulacion is "cinta" or "llenado" or "maquina" ? e.ModeloSimulacion : null,
            };
            if (SemillaPlanta.Sensores.TryGetValue(eq.Tipo, out var sens))
                foreach (var x in sens) eq.Sensores.Add(new Sensor { Variable = x.Var, Nombre = x.Nombre, Unidad = x.Unidad, EscalaMin = x.Min, EscalaMax = x.Max, Nominal = x.Nom, Aviso = x.Aviso, Alarma = x.Alarma });
            db.Equipos.Add(eq);
            await db.SaveChangesAsync();
            Eventos.Agregar(db, "registro", "info", $"{eq.Codigo} registrado en {linea.Nombre}", "web", false, eq.Id, plc?.Id, usuarioId: s.Id, datos: new { linea = linea.Nombre, eq.ModeloSimulacion });
            db.Auditar(s, "registró un equipo", "equipo", eq.Codigo, $"{eq.Nombre} · {linea.Nombre}");
            await db.SaveChangesAsync();
            await hub.Clients.Group("planta").SendAsync("estructura", new { tipo = "equipo", codigo = eq.Codigo });
            return Results.Created($"/api/equipos/{eq.Codigo}", new { eq.Codigo, eq.Version });
        });

        g.MapPut("/equipos/{codigo}", async (string codigo, EquipoEntrada e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (!s.Tiene("equipos.editar")) return Ayudas.Sin();
            var eq = await db.Equipos.FirstOrDefaultAsync(x => x.Codigo == codigo);
            if (eq is null) return Ayudas.Error("No existe ese equipo.", 404);
            if (e.Version is null) return Ayudas.Error("Falta la versión del registro que está editando.");
            // control optimista: si alguien guardó antes, la versión (xmin) ya no coincide y EF responde con un conflicto (409)
            db.Entry(eq).Property(x => x.Version).OriginalValue = e.Version.Value;
            if (await db.Lineas.FindAsync(e.LineaId) is null) return Ayudas.Error("La línea no existe.", 404);
            eq.Nombre = e.Nombre.Trim(); eq.LineaId = e.LineaId; eq.Ubicacion = e.Ubicacion?.Trim() ?? eq.Ubicacion; eq.Marca = e.Marca?.Trim() ?? eq.Marca; eq.Modelo = e.Modelo?.Trim() ?? eq.Modelo;
            eq.Criticidad = e.Criticidad is "baja" or "media" or "alta" ? e.Criticidad : eq.Criticidad;
            eq.ModeloSimulacion = e.ModeloSimulacion is "cinta" or "llenado" or "maquina" ? e.ModeloSimulacion : e.ModeloSimulacion == "" ? null : eq.ModeloSimulacion;
            db.Auditar(s, "actualizó un equipo", "equipo", eq.Codigo, eq.Nombre);
            await db.SaveChangesAsync();
            await hub.Clients.Group("planta").SendAsync("estructura", new { tipo = "equipo", codigo = eq.Codigo });
            return Results.Ok(new { eq.Codigo, eq.Version });
        });

        // ================================================================================== historial de eventos
        g.MapGet("/eventos", async (string? equipo, string? plc, string? tipo, bool? simulado, long? despues, int? limite, ClaimsPrincipal u, SimaDb db) =>
        {
            if (!u.S().Tiene("planta.ver")) return Ayudas.Sin();
            var q = db.Eventos.AsNoTracking().AsQueryable();
            if (!string.IsNullOrEmpty(equipo)) q = q.Where(e => db.Equipos.Any(x => x.Id == e.EquipoId && x.Codigo == equipo));
            if (!string.IsNullOrEmpty(plc)) q = q.Where(e => db.Plcs.Any(x => x.Id == e.PlcId && x.Codigo == plc));
            if (!string.IsNullOrEmpty(tipo)) q = q.Where(e => e.Tipo == tipo);
            if (simulado is not null) q = q.Where(e => e.Simulado == simulado);
            if (despues is not null) q = q.Where(e => e.Id > despues);
            var lista = await q.OrderByDescending(e => e.Id).Take(Math.Clamp(limite ?? 100, 1, 500)).ToListAsync();
            var eqs = await db.Equipos.AsNoTracking().ToDictionaryAsync(x => x.Id, x => x.Codigo);
            var plcs = await db.Plcs.AsNoTracking().ToDictionaryAsync(x => x.Id, x => x.Codigo);
            return Results.Ok(lista.Select(e => Eventos.Dto(e, eqs, plcs)));
        });

        // ================================================================================== resumen operativo (SIMA Desktop)
        g.MapGet("/operacion/resumen", async (ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("planta.ver")) return Ayudas.Sin();
            var equipos = await db.Equipos.AsNoTracking().ToListAsync();
            var plcs = await db.Plcs.AsNoTracking().ToListAsync();
            var abiertas = await db.Alarmas.AsNoTracking().Where(a => a.Fin == null).ToListAsync();
            var ordenes = await db.Ordenes.AsNoTracking().Where(o => o.Estado != "cerrada").ToListAsync();
            var eqN = equipos.ToDictionary(e => e.Id);
            var (kpis, indic) = await Indicadores.CalcularAsync(db, 7);
            var desde = DateTime.UtcNow.AddHours(-23);
            var alarmas24 = await db.Alarmas.AsNoTracking().Where(a => a.Inicio >= desde.AddHours(-1)).Select(a => new { a.Inicio, a.Nivel }).ToListAsync();
            var inter = await db.Intervenciones.AsNoTracking().OrderByDescending(i => i.Fin).Take(8).ToListAsync();
            var otIds = inter.Select(i => i.OrdenId).ToList();
            var otDe = await db.Ordenes.AsNoTracking().Where(o => otIds.Contains(o.Id)).ToDictionaryAsync(o => o.Id);
            var eqCod = equipos.ToDictionary(e => e.Id, e => e.Codigo);
            var plcCod = plcs.ToDictionary(p => p.Id, p => p.Codigo);
            return Results.Ok(new
            {
                equipos = new
                {
                    total = equipos.Count, operando = equipos.Count(e => EstadosEquipo.Marcha(e.Estado)), alarma = equipos.Count(e => e.Estado == EstadosEquipo.Falla),
                    detenido = equipos.Count(e => e.Estado is EstadosEquipo.Liberado or EstadosEquipo.FueraServicio), mantencion = equipos.Count(e => EstadosEquipo.DeMantenimiento.Contains(e.Estado)),
                    bloqueado = equipos.Count(e => e.Estado == EstadosEquipo.Bloqueado), porEstado = EstadosEquipo.Validos.ToDictionary(x => x, x => equipos.Count(e => e.Estado == x)),
                },
                plcs = new { total = plcs.Count, conectados = plcs.Count(p => EstadoPlc(p) == "run"), falla = plcs.Count(p => EstadoPlc(p) == "error"), desconectados = plcs.Count(p => EstadoPlc(p) == "sin_conexion"), lista = plcs.OrderBy(p => p.Codigo).Select(p => new { p.Codigo, p.Nombre, estado = EstadoPlc(p), p.Origen }) },
                alarmas = new { abiertas = abiertas.Count, criticas = abiertas.Count(a => a.Nivel == "alarma"), recientes = abiertas.OrderByDescending(a => a.Inicio).Take(6).Select(a => new { a.Id, a.Nivel, a.Mensaje, a.Inicio, equipo = eqN[a.EquipoId].Codigo, a.Simulado }) },
                ordenes = new
                {
                    abiertas = ordenes.Count(o => o.Estado == "abierta"), enCurso = ordenes.Count(o => o.Estado == "en_curso"),
                    mias = ordenes.Where(o => o.AsignadoAId == s.Id).Select(o => new { o.Id, o.Codigo, o.Titulo, o.Prioridad, o.Estado, equipo = eqN[o.EquipoId].Codigo }),
                    pendientes = ordenes.Where(o => o.Estado == "abierta").OrderByDescending(o => o.Prioridad == "critica").ThenByDescending(o => o.Prioridad == "alta").Take(6).Select(o => new { o.Id, o.Codigo, o.Titulo, o.Prioridad, o.Estado, equipo = eqN[o.EquipoId].Codigo, o.Creada }),
                },
                disponibilidad = indic.Select(i => new { i.Codigo, i.Nombre, i.Disponibilidad, i.Oee, i.Fallas }),
                kpis = kpis.Where(k => k.Area is "Mantenimiento" or "Producción").Select(k => new { k.Clave, k.Nombre, k.Valor, k.Meta, k.Unidad, k.Estado }),
                alarmasPorHora = Enumerable.Range(0, 24).Select(h => desde.AddHours(h)).Select(h => new { hora = h.ToLocalTime().ToString("HH:00"), alarmas = alarmas24.Count(a => a.Nivel == "alarma" && a.Inicio >= h.AddHours(-1) && a.Inicio < h), avisos = alarmas24.Count(a => a.Nivel == "aviso" && a.Inicio >= h.AddHours(-1) && a.Inicio < h) }),
                intervenciones = inter.Select(i => new { i.Id, orden = otDe.TryGetValue(i.OrdenId, out var o) ? o.Codigo : "", equipo = otDe.TryGetValue(i.OrdenId, out var o2) ? eqCod.GetValueOrDefault(o2.EquipoId) : null, i.TecnicoNombre, i.Fin, i.Causa, i.Accion, i.Resultado }),
                eventos = (await db.Eventos.AsNoTracking().OrderByDescending(e => e.Id).Take(15).ToListAsync()).Select(e => Eventos.Dto(e, eqCod, plcCod)),
            });
        });

        // ================================================================================== órdenes de trabajo: detalle e intervenciones
        g.MapGet("/ordenes/{id:int}", async (int id, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            var o = await db.Ordenes.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
            if (!s.Tiene("ordenes.ver"))
            {
                if (o is null || !Liberaciones.LeePorFirma(s, o)) return Ayudas.Sin();   // sin revelar si la orden existe
            }
            else if (o is null) return Ayudas.Error("No existe esa orden.", 404);
            else if (s.Alcance("ordenes.ver") == "propio" && o.CreadaPorId != s.Id && o.AsignadoAId != s.Id) return Ayudas.Sin();
            var eq = await db.Equipos.AsNoTracking().Include(e => e.Linea).ThenInclude(l => l!.Area).FirstAsync(e => e.Id == o.EquipoId);
            var nombres = await db.Trabajadores.AsNoTracking().ToDictionaryAsync(t => t.Id, t => t.Nombres + " " + t.ApellidoPaterno);
            var inter = await db.Intervenciones.AsNoTracking().Include(i => i.Herramientas).Where(i => i.OrdenId == id).OrderBy(i => i.Inicio).ToListAsync();
            var movs = await db.MovimientosRepuesto.AsNoTracking().Where(m => m.OrdenId == id).ToListAsync();
            var rep = await db.Repuestos.AsNoTracking().ToDictionaryAsync(r => r.Id);
            var herr = await db.Herramientas.AsNoTracking().ToDictionaryAsync(h => h.Id, h => h.Nombre);
            return Results.Ok(new
            {
                o.Id, o.Codigo, o.Titulo, o.Descripcion, o.Tipo, o.Prioridad, o.Estado, o.Automatica, o.LotoConfirmado, o.Creada, o.Cerrada, o.Version, o.AsignadoAId,
                o.Especialidad, o.Programada, o.Simulada, o.CierreSolicitado, o.VerificadaEn, o.CreadaPorId,
                asignado = o.AsignadoAId is null ? null : nombres.GetValueOrDefault(o.AsignadoAId),
                verificadaPor = o.VerificadaPorId is null ? null : nombres.GetValueOrDefault(o.VerificadaPorId),
                liberacion = await Liberaciones.ResumenAsync(db, o),
                planificacion = await PlanificacionAsync(db, o, nombres),
                equipo = new { eq.Codigo, eq.Nombre, eq.Tipo, eq.Estado, area = eq.Linea!.Area!.Nombre, linea = eq.Linea.Nombre },
                intervenciones = inter.Select(i => new { i.Id, i.TecnicoNombre, i.Inicio, i.Fin, i.Causa, i.Diagnostico, i.Accion, i.Resultado, i.Observaciones, herramientas = i.Herramientas.Select(h => herr.GetValueOrDefault(h.HerramientaId)) }),
                repuestos = movs.Select(m => new { rep[m.RepuestoId].Codigo, rep[m.RepuestoId].Nombre, cantidad = -m.Cantidad, m.Fecha, m.PorNombre }),
            });
        });

        // planificación: fecha del programa semanal, técnico asignado, prioridad y especialidad (jefatura, planificador, supervisor)
        g.MapPost("/ordenes/{id:int}/planificar", async (int id, PlanificarEntrada e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (!s.Tiene("ordenes.asignar")) return Ayudas.Error("Planificar y asignar órdenes es de la jefatura, la planificación o la supervisión de mantenimiento.", 403);
            var o = await db.Ordenes.FindAsync(id);
            if (o is null) return Ayudas.Error("No existe esa orden.", 404);
            if (o.Estado == "cerrada") return Ayudas.Error("La orden ya está cerrada.", 409);
            db.Entry(o).Property(x => x.Version).OriginalValue = e.Version;      // si otro la cambió, 409
            var cambios = new List<string>(); var asignadaAhora = false;
            if (e.QuitarAsignacion && o.Estado == "abierta") { o.AsignadoAId = null; cambios.Add("sin asignar"); }
            else if (!string.IsNullOrEmpty(e.AsignadoAId) && e.AsignadoAId != o.AsignadoAId)
            {
                if (o.Estado != "abierta") return Ayudas.Error("La orden ya está en curso: no se puede reasignar.", 409);
                var t = await db.Trabajadores.Include(x => x.Cargo).FirstOrDefaultAsync(x => x.Id == e.AsignadoAId);
                if (t is null || !PerfilesTecnicos.Contains(t.Cargo!.PerfilSima)) return Ayudas.Error("Solo se asignan órdenes a personal técnico de mantenimiento.");
                if (!(await Reglas.CalcularUnoAsync(db, t.Id)).Activa) return Ayudas.Error("Esa persona no tiene la cuenta activa.");
                o.AsignadoAId = t.Id; asignadaAhora = true; cambios.Add($"asignada a {t.Nombres} {t.ApellidoPaterno}");
            }
            if (e.QuitarFecha) { o.Programada = null; cambios.Add("sin fecha"); }
            else if (e.Programada is { } f && f != o.Programada) { o.Programada = f; cambios.Add($"programada el {f:dd-MM}"); }
            if (e.Prioridad is "baja" or "media" or "alta" or "critica" && e.Prioridad != o.Prioridad) { o.Prioridad = e.Prioridad; cambios.Add($"prioridad {e.Prioridad}"); }
            if (Especialidades.Contains(e.Especialidad) && e.Especialidad != o.Especialidad) { o.Especialidad = e.Especialidad!; cambios.Add($"especialidad {e.Especialidad}"); }
            if (cambios.Count == 0) return Results.Ok(new { o.Version });
            db.Auditar(s, "planificó una orden de trabajo", "orden", o.Codigo, string.Join(", ", cambios));
            await db.SaveChangesAsync();
            var eq = await db.Equipos.AsNoTracking().FirstAsync(x => x.Id == o.EquipoId);
            await hub.Clients.Group("planta").SendAsync("orden", new { id = o.Id, codigo = o.Codigo, equipo = eq.Codigo, titulo = o.Titulo, prioridad = o.Prioridad, estado = o.Estado, asignadoAId = o.AsignadoAId });
            if (asignadaAhora) await Avisos.AUsuarioAsync(db, hub, o.AsignadoAId, $"Se le asignó {o.Codigo} · {eq.Codigo}: {o.Titulo}{(o.Programada is { } d ? $" (programada el {d:dd-MM})" : "")}", "tarea", $"/mantenimiento?orden={o.Id}", "mantenimiento", o.Codigo);
            return Results.Ok(new { o.Version, cambios });
        });

        g.MapPost("/ordenes/{id:int}/intervenciones", async (int id, IntervencionEntrada e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (e.Uid is { Length: > 0 } && await db.Intervenciones.AsNoTracking().FirstOrDefaultAsync(i => i.Uid == e.Uid) is { } previa)
                return Results.Ok(new { previa.Id, repetida = true });                       // reenvío desde la cola sin conexión: no se duplica
            var o = await db.Ordenes.FindAsync(id);
            if (o is null) return Ayudas.Error("No existe esa orden.", 404);
            if (!(s.Tiene("ordenes.ejecutar") && o.AsignadoAId == s.Id) && !s.Tiene("ordenes.aprobar"))
                return Ayudas.Error("Solo el técnico asignado (o la jefatura de mantenimiento) puede registrar intervenciones en esta orden.", 403);
            if (o.Estado != "en_curso") return Ayudas.Error("La orden debe estar en curso (con bloqueo confirmado) para registrar una intervención.", 409);
            if (!Causas.Contains(e.Causa) || !Resultados.Contains(e.Resultado)) return Ayudas.Error("Causa o resultado no válidos.");
            if (string.IsNullOrWhiteSpace(e.Diagnostico) || string.IsNullOrWhiteSpace(e.Accion)) return Ayudas.Error("Describa el diagnóstico y la acción realizada.");
            if (e.Cerrar && !e.LotoRetirado) return Ayudas.Error("Para terminar la orden debe confirmar que retiró el bloqueo y etiquetado.");
            if (e.Cerrar && o.AsignadoAId != s.Id) return Ayudas.Error("Solo el técnico que ejecutó la orden pide su liberación.", 403);
            var consumos = (e.Repuestos ?? new()).Where(c => c.Cantidad > 0).GroupBy(c => c.RepuestoId).Select(gr => new ConsumoEntrada(gr.Key, gr.Sum(c => c.Cantidad))).ToList();
            if (consumos.Count > 0 && !s.Tiene("repuestos.retirar")) return Ayudas.Error("Su cargo no puede retirar repuestos.", 403);

            await using var tx = await db.Database.BeginTransactionAsync();       // intervención, consumos y cierre: todo o nada
            var ahora = DateTime.UtcNow;
            var i = new Intervencion
            {
                Uid = e.Uid is { Length: > 0 } ? e.Uid : null, OrdenId = o.Id, TecnicoId = s.Id, TecnicoNombre = s.Nombre, Inicio = e.Inicio ?? o.Creada, Fin = e.Fin is { } f && f <= ahora.AddMinutes(5) ? f : ahora,
                Causa = e.Causa, Diagnostico = e.Diagnostico.Trim(), Accion = e.Accion.Trim(), Resultado = e.Resultado, Observaciones = e.Observaciones?.Trim() ?? "",
                ComponenteId = e.ComponenteId, ComponenteTipo = e.ComponenteTipo ?? "", TipoAccion = e.TipoAccion is { } ta && Simulacion.AccionesTexto.ContainsKey(ta) ? ta : "",
            };
            if (e.ComponenteId is { } cid && !await db.Componentes.AnyAsync(c => c.Id == cid && c.EquipoId == o.EquipoId)) return Ayudas.Error("Ese componente no pertenece al equipo de la orden.");
            if (i.Fin < i.Inicio) i.Inicio = i.Fin.AddMinutes(-30);
            foreach (var h in (e.Herramientas ?? new()).Distinct())
            {
                if (!await db.Herramientas.AnyAsync(x => x.Id == h)) return Ayudas.Error($"La herramienta {h} no existe.", 404);
                i.Herramientas.Add(new IntervencionHerramienta { HerramientaId = h });
            }
            db.Intervenciones.Add(i);
            await db.SaveChangesAsync();
            var stock = new List<object>();
            foreach (var c in consumos)
            {
                var r = await db.Repuestos.FindAsync(c.RepuestoId);
                if (r is null) return Ayudas.Error($"El repuesto {c.RepuestoId} no existe.", 404);
                if (r.Stock < c.Cantidad) return Ayudas.Error($"No hay stock suficiente de {r.Nombre}: quedan {r.Stock}.", 409);
                r.Stock -= c.Cantidad;
                db.MovimientosRepuesto.Add(new MovimientoRepuesto { RepuestoId = r.Id, Cantidad = -c.Cantidad, OrdenId = o.Id, IntervencionId = i.Id, PorId = s.Id, PorNombre = s.Nombre, Nota = $"Intervención en {o.Codigo}" });
                stock.Add(new { r.Id, r.Codigo, r.Stock, bajoMinimo = r.Stock <= r.StockMinimo });
            }
            var eq = await db.Equipos.Include(x => x.Sensores).Include(x => x.Plc).FirstAsync(x => x.Id == o.EquipoId);
            // registrar la intervención pasa el equipo de diagnóstico a mantenimiento
            if (eq.Estado == EstadosEquipo.Diagnostico) EstadosEquipo.Cambiar(db, eq, EstadosEquipo.Mantenimiento, "desktop", false, $"{o.Codigo}: intervención de {s.Nombre}", ahora, por: s);
            // planta simulada: la intervención se evalúa contra la causa real (que el técnico no conoce)
            var sim = await Simulacion.EvaluarAsync(db, hub, s, o, i, e.ComponenteId, e.ComponenteTipo, i.TipoAccion.Length > 0 ? i.TipoAccion : null, consumos.Select(c => c.RepuestoId).ToList());
            foreach (var pr in e.Pruebas ?? new())
            {
                if (string.IsNullOrWhiteSpace(pr.Descripcion) || pr.Resultado is not ("conforme" or "no_conforme")) return Ayudas.Error("Cada prueba necesita una descripción y un resultado (conforme o no conforme).");
                if (pr.Uid is { Length: > 0 } && await db.PruebasOrden.AnyAsync(x => x.Uid == pr.Uid)) continue;
                // en la planta simulada el resultado de la prueba lo da la máquina: si los síntomas siguen, no puede ser conforme
                var noSeSostiene = sim.Persiste && pr.Resultado == "conforme";
                db.PruebasOrden.Add(new PruebaOrden { OrdenId = o.Id, Uid = pr.Uid, Descripcion = pr.Descripcion.Trim(), Resultado = noSeSostiene ? "no_conforme" : pr.Resultado,
                    Valores = (pr.Valores?.Trim() ?? "") + (noSeSostiene ? " · la planta simulada no confirma el resultado: persisten los síntomas" : ""), RegistradaPorId = s.Id, RegistradaPor = s.Nombre, Fecha = ahora });
            }
            Eventos.Agregar(db, "mantenimiento", e.Cerrar ? "ok" : "info", $"{o.Codigo}: {i.Accion}", "desktop", false, eq.Id, eq.PlcId, ahora, new { orden = o.Codigo, i.Causa, i.Resultado, repuestos = consumos.Count, cerrada = e.Cerrar }, usuarioId: s.Id);
            db.Auditar(s, "registró una intervención", "orden", o.Codigo, $"{eq.Codigo} · {i.Causa} · {consumos.Sum(c => c.Cantidad)} repuestos");
            await db.SaveChangesAsync();          // si otra persona movió el mismo repuesto u orden, la versión no coincide: 409 y no queda nada a medias
            if (sim.Persiste && e.Cerrar)
            {
                // la intervención queda registrada (es parte del historial), pero la orden sigue en curso: la máquina no está reparada
                await tx.CommitAsync();
                await hub.Clients.Group("planta").SendAsync("intervencion", new { id = i.Id, orden = o.Codigo, equipo = eq.Codigo, tecnico = s.Nombre, cerrada = false });
                return Ayudas.Error($"La intervención quedó registrada, pero las pruebas no se sostienen. {sim.Mensaje} Revise el diagnóstico: la orden sigue en curso.", 409);
            }
            // terminar no libera el equipo: queda «pendiente de liberación» hasta que firmen quienes corresponde
            if (e.Cerrar && await Ordenes.PedirLiberacionAsync(db, hub, s, o, null, e.AfectaSeguridad, e.AfectaCalidad) is { } error) return error;   // sin pruebas conformes: nada queda a medias
            await tx.CommitAsync();
            await hub.Clients.Group("planta").SendAsync("equipo", new { codigo = eq.Codigo, estado = eq.Estado });
            await hub.Clients.Group("planta").SendAsync("orden", new { id = o.Id, codigo = o.Codigo, equipo = eq.Codigo, titulo = o.Titulo, prioridad = o.Prioridad, estado = o.Estado });
            await hub.Clients.Group("planta").SendAsync("intervencion", new { id = i.Id, orden = o.Codigo, equipo = eq.Codigo, tecnico = s.Nombre, cerrada = e.Cerrar });
            return Results.Created($"/api/ordenes/{o.Id}", new { i.Id, ordenEstado = o.Estado, stock, simulacion = sim.HayFallas ? new { sim.Resuelta, sim.Persiste, sim.Mensaje } : null });
        });
    }

    static readonly System.Text.Json.JsonSerializerOptions JsPlan = new(System.Text.Json.JsonSerializerDefaults.Web);
    /// <summary>Lo que la jefatura definió al asignar: horario, colaboradores, instrucciones, recursos, pruebas y recepción.</summary>
    static async Task<object> PlanificacionAsync(SimaDb db, OrdenTrabajo o, Dictionary<string, string> nombres)
    {
        var a = await db.Actividades.AsNoTracking().Include(x => x.Participantes).FirstOrDefaultAsync(x => x.OrdenId == o.Id);
        List<int> Ids(string j) { if (string.IsNullOrWhiteSpace(j)) return new(); try { return System.Text.Json.JsonSerializer.Deserialize<List<int>>(j, JsPlan) ?? new(); } catch (System.Text.Json.JsonException) { return new(); } }
        var h = Ids(o.HerramientasSugeridas); var r = Ids(o.RepuestosSugeridos); var d = Ids(o.Procedimientos);
        return new
        {
            inicio = a?.Inicio, fin = a?.Fin, actividad = a?.Id, actividadVersion = a?.Version,
            colaboradores = a?.Participantes.Where(p => p.Rol == "colaborador").Select(p => new { id = p.TrabajadorId, nombre = nombres.GetValueOrDefault(p.TrabajadorId) }),
            o.Instrucciones, o.FechaLimite, o.ResultadosEsperados, o.PruebasRequeridas, o.RecibidaEn,
            asignadaPor = o.AsignadaPorId is null ? null : nombres.GetValueOrDefault(o.AsignadaPorId),
            herramientas = await db.Herramientas.AsNoTracking().Where(x => h.Contains(x.Id)).Select(x => new { x.Id, x.Codigo, x.Nombre, x.Estado }).ToListAsync(),
            repuestos = await db.Repuestos.AsNoTracking().Where(x => r.Contains(x.Id)).Select(x => new { x.Id, x.Codigo, x.Nombre, x.Stock }).ToListAsync(),
            procedimientos = await db.Documentos.AsNoTracking().Where(x => d.Contains(x.Id)).Select(x => new { x.Id, x.Titulo, x.Clase }).ToListAsync(),
        };
    }

}
