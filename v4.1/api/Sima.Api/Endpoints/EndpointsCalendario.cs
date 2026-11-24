using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Sima.Api.Datos;
using Sima.Api.Dominio;
using Sima.Api.Servicios;

namespace Sima.Api.Endpoints;

public record AsignacionEntrada(uint Version, string ResponsableId, List<string>? Colaboradores, DateTime Inicio, int DuracionMin, DateOnly? FechaLimite, string? Prioridad, string? Especialidad,
    string? Instrucciones, List<int>? Herramientas, List<int>? Repuestos, List<int>? Procedimientos, string? Resultados, string? Pruebas, bool Confirmar = false);
public record VerificacionEntrada(List<string> Personas, DateTime Inicio, DateTime Fin, int? Excluir, List<string>? Habilitaciones);
public record ReprogramacionEntrada(DateTime Inicio, DateTime Fin, bool Confirmar = false);
public record BitacoraEntrada(string Tipo, string Texto);

/// <summary>Calendario empresarial, asignación de órdenes con verificación de disponibilidad, bitácora jefe–técnico y seguimiento del departamento.</summary>
public static class EndpointsCalendario
{
    static readonly string[] PerfilesTecnicos = { "tecnico", "supervisor_mant", "confiabilidad", "instrumentacion", "ing_automatizacion" };
    static readonly string[] TiposTecnico = { "recepcion", "avance", "problema", "ayuda", "recursos", "tiempo", "revision", "comentario" };
    static readonly string[] TiposJefatura = { "instruccion", "comentario" };
    public static readonly Dictionary<string, string> TextoTipo = new()
    {
        ["instruccion"] = "Instrucción", ["recepcion"] = "Recepción confirmada", ["inicio"] = "Intervención iniciada", ["avance"] = "Avance", ["problema"] = "Problema informado",
        ["ayuda"] = "Solicitud de ayuda", ["recursos"] = "Solicitud de recursos", ["tiempo"] = "Solicitud de más tiempo", ["revision"] = "Solicitud de revisión",
        ["completada"] = "Ejecución completada", ["comentario"] = "Comentario",
    };
    static readonly JsonSerializerOptions Js = new(JsonSerializerDefaults.Web);
    /// <summary>Las fechas que llegan sin zona se toman como UTC (PostgreSQL guarda timestamptz).</summary>
    static DateTime Utc(DateTime d) => d.Kind switch { DateTimeKind.Utc => d, DateTimeKind.Local => d.ToUniversalTime(), _ => DateTime.SpecifyKind(d, DateTimeKind.Utc) };

    static IResult ConConflictos(string error, List<Calendario.Conflicto> c, List<DateTime> sug, bool confirmable)
        => Results.Json(new { error, requiereConfirmacion = confirmable, conflictos = c.Select(x => new { x.TrabajadorId, x.Persona, x.Tipo, x.Detalle, x.Bloquea }), sugerencias = sug }, statusCode: 409);

    static object Item(Actividad a, Sesion s, Dictionary<string, string> nombres)
    {
        var ve = Calendario.VeDetalle(s, a);
        var personas = a.Participantes.Select(p => new { id = p.TrabajadorId, nombre = ve ? nombres.GetValueOrDefault(p.TrabajadorId) : null, rol = ve ? p.Rol : null, estado = ve ? p.Estado : null });
        return ve
            ? new { a.Id, a.Tipo, a.Area, a.Titulo, a.Descripcion, a.Inicio, a.Fin, a.Ubicacion, a.Prioridad, a.Estado, a.OrdenId, a.EquipoId, a.ResponsableId, detalle = true, personas, a.Version }
            : new { a.Id, Tipo = "ocupado", a.Area, Titulo = "Ocupado", Descripcion = "", a.Inicio, a.Fin, Ubicacion = "", Prioridad = "", a.Estado, OrdenId = (int?)null, EquipoId = (int?)null, ResponsableId = (string?)null, detalle = false, personas, a.Version };
    }

    public static void MapCalendario(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api").RequireAuthorization();

        // ------------------------------------------------------------------------------------ calendario común
        g.MapGet("/calendario", async (DateTime desde, DateTime hasta, string? area, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            desde = Utc(desde); hasta = Utc(hasta);
            if ((hasta - desde).TotalDays > 62) return Ayudas.Error("Consulte como máximo dos meses.");
            var q = db.Actividades.AsNoTracking().Include(a => a.Participantes).Where(a => a.Estado != "cancelada" && a.Inicio < hasta && a.Fin > desde);
            if (!string.IsNullOrEmpty(area)) q = q.Where(a => a.Area == area || a.Participantes.Any(p => p.TrabajadorId == s.Id));
            var lista = await q.OrderBy(a => a.Inicio).Take(1500).ToListAsync();
            var nombres = await db.Trabajadores.AsNoTracking().ToDictionaryAsync(t => t.Id, t => t.Nombres + " " + t.ApellidoPaterno);
            return Results.Ok(lista.Select(a => Item(a, s, nombres)));
        });

        // técnicos con su turno, habilitaciones y carga: lo que necesita quien asigna
        g.MapGet("/calendario/tecnicos", async (ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("ordenes.asignar") && !(s.Tiene("ordenes.ver") && s.Alcance("ordenes.ver") != "propio")) return Ayudas.Sin();
            var est = await Reglas.CalcularTodosAsync(db);
            var tecs = (await db.Trabajadores.AsNoTracking().Include(t => t.Cargo).ToListAsync()).Where(t => PerfilesTecnicos.Contains(t.Cargo!.PerfilSima) && est.TryGetValue(t.Id, out var e) && e.Activa).ToList();
            var ids = tecs.Select(t => t.Id).ToList();
            var hoy = Reloj.Hoy();
            var habs = await db.Habilitaciones.AsNoTracking().Where(h => ids.Contains(h.TrabajadorId)).ToListAsync();
            var ahora = DateTime.UtcNow;
            var enCurso = await db.Ordenes.AsNoTracking().Where(o => o.Estado == "en_curso" && o.AsignadoAId != null && ids.Contains(o.AsignadoAId)).Select(o => new { o.AsignadoAId, o.Codigo }).ToListAsync();
            var semana = await db.ParticipantesActividad.AsNoTracking().Where(p => ids.Contains(p.TrabajadorId))
                .Join(db.Actividades.AsNoTracking().Where(a => Calendario.Abiertas.Contains(a.Estado) && a.Fin > ahora && a.Inicio < ahora.AddDays(7)), p => p.ActividadId, a => a.Id, (p, a) => new { p.TrabajadorId, a.Inicio, a.Fin }).ToListAsync();
            return Results.Ok(tecs.OrderBy(t => t.CargoId).ThenBy(t => t.Nombres).Select(t => new
            {
                t.Id, nombre = $"{t.Nombres} {t.ApellidoPaterno}", cargo = t.Cargo!.Nombre, t.CargoId, t.Turno, turnoTexto = Calendario.TurnoTexto(t.Turno),
                enTurno = Calendario.EnTurno(t.Turno, ahora, ahora.AddMinutes(1)), otEnCurso = enCurso.FirstOrDefault(o => o.AsignadoAId == t.Id)?.Codigo,
                horasSemana = Math.Round(semana.Where(x => x.TrabajadorId == t.Id).Sum(x => (x.Fin - x.Inicio).TotalHours), 1),
                habilitaciones = habs.Where(h => h.TrabajadorId == t.Id).Select(h => new { h.Nombre, vence = h.Vencimiento, vigente = h.Vencimiento >= hoy }),
            }));
        });

        g.MapPost("/calendario/verificar", async (VerificacionEntrada e, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("ordenes.asignar") && !s.Tiene("sst.gestionar")) return Ayudas.Sin();
            e = e with { Inicio = Utc(e.Inicio), Fin = Utc(e.Fin) };
            var c = await Calendario.RevisarAsync(db, e.Personas, e.Inicio, e.Fin, e.Excluir, e.Habilitaciones);
            var sug = c.Count > 0 ? await Calendario.SugerirAsync(db, e.Personas, e.Fin - e.Inicio, e.Inicio, e.Excluir) : new();
            return Results.Ok(new { conflictos = c.Select(x => new { x.TrabajadorId, x.Persona, x.Tipo, x.Detalle, x.Bloquea }), sugerencias = sug, disponible = c.Count == 0 });
        });

        // reprogramar (arrastrar o cambiar la duración en el calendario): se revisa de nuevo la disponibilidad
        g.MapPut("/calendario/actividades/{id:int}", async (int id, ReprogramacionEntrada e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            e = e with { Inicio = Utc(e.Inicio), Fin = Utc(e.Fin) };
            var a = await db.Actividades.Include(x => x.Participantes).FirstOrDefaultAsync(x => x.Id == id);
            if (a is null) return Ayudas.Error("No existe esa actividad.", 404);
            var puede = a.Area switch { "mantenimiento" => s.Tiene("ordenes.asignar"), "prevencion" => s.Tiene("sst.gestionar"), _ => a.CreadaPorId == s.Id };
            if (!puede) return Ayudas.Error("Su cargo no puede reprogramar esta actividad.", 403);
            if (a.Estado is "completada" or "cancelada") return Ayudas.Error("La actividad ya terminó.", 409);
            if (a.Estado == "en_curso" && e.Inicio != a.Inicio) return Ayudas.Error("La actividad ya empezó: solo se puede ajustar su término.", 409);
            if ((e.Fin - e.Inicio).TotalMinutes < 15) return Ayudas.Error("La duración mínima es de 15 minutos.");
            var personas = a.Participantes.Select(p => p.TrabajadorId).ToList();
            var c = await Calendario.RevisarAsync(db, personas, e.Inicio, e.Fin, a.Id);
            if (c.Any(x => x.Bloquea)) return ConConflictos("No se puede reprogramar: hay restricciones que lo impiden.", c, await Calendario.SugerirAsync(db, personas, e.Fin - e.Inicio, e.Inicio, a.Id), false);
            if (c.Count > 0 && !e.Confirmar) return ConConflictos("Hay conflictos de disponibilidad: revíselos antes de confirmar.", c, await Calendario.SugerirAsync(db, personas, e.Fin - e.Inicio, e.Inicio, a.Id), true);
            var antes = $"{Calendario.ALocal(a.Inicio):dd-MM HH:mm}–{Calendario.ALocal(a.Fin):HH:mm}";
            a.Inicio = e.Inicio; a.Fin = e.Fin;
            if (a.OrdenId is { } oid && await db.Ordenes.FindAsync(oid) is { } o)
            {
                o.Programada = DateOnly.FromDateTime(Calendario.ALocal(e.Inicio));
                Calendario.Anotar(db, o, s, "instruccion", $"Reprogramada: {Calendario.ALocal(e.Inicio):dd-MM HH:mm} a {Calendario.ALocal(e.Fin):HH:mm} (antes {antes}).");
            }
            db.Auditar(s, "reprogramó una actividad", "actividad", a.Id.ToString(), a.Titulo, antes, $"{Calendario.ALocal(e.Inicio):dd-MM HH:mm}–{Calendario.ALocal(e.Fin):HH:mm}");
            await db.SaveChangesAsync();
            foreach (var p in personas.Where(p => p != s.Id))
                await Avisos.AUsuarioAsync(db, hub, p, $"Se reprogramó «{a.Titulo}»: {Calendario.ALocal(e.Inicio):ddd dd-MM HH:mm}–{Calendario.ALocal(e.Fin):HH:mm}", "tarea", a.OrdenId is { } x ? $"/mantenimiento?orden={x}" : "/agenda", a.Area);
            await hub.Clients.Group("planta").SendAsync("calendario", new { id = a.Id });
            return Results.Ok(new { a.Id, a.Inicio, a.Fin });
        });

        // ------------------------------------------------------------------------------------ asignación completa de una orden
        g.MapPost("/ordenes/{id:int}/asignar", async (int id, AsignacionEntrada e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (!s.Tiene("ordenes.asignar")) return Ayudas.Error("Asignar órdenes es de la jefatura, la planificación o la supervisión de mantenimiento.", 403);
            e = e with { Inicio = Utc(e.Inicio) };
            var o = await db.Ordenes.FindAsync(id);
            if (o is null) return Ayudas.Error("No existe esa orden.", 404);
            if (o.Estado is "cerrada" or "por_verificar") return Ayudas.Error("La orden ya fue ejecutada: no se puede reasignar.", 409);
            if (o.Estado == "en_curso" && e.ResponsableId != o.AsignadoAId) return Ayudas.Error("La orden ya está en curso con su técnico: no se puede cambiar el responsable.", 409);
            if (e.DuracionMin is < 15 or > 24 * 60) return Ayudas.Error("La duración debe estar entre 15 minutos y 24 horas.");
            db.Entry(o).Property(x => x.Version).OriginalValue = e.Version;
            var equipo = await db.Equipos.AsNoTracking().FirstAsync(x => x.Id == o.EquipoId);
            var colaboradores = (e.Colaboradores ?? new()).Where(c => c != e.ResponsableId).Distinct().ToList();
            var personas = new List<string> { e.ResponsableId }; personas.AddRange(colaboradores);
            var trab = await db.Trabajadores.AsNoTracking().Include(t => t.Cargo).Where(t => personas.Contains(t.Id)).ToListAsync();
            if (trab.Count != personas.Count || trab.Any(t => !PerfilesTecnicos.Contains(t.Cargo!.PerfilSima))) return Ayudas.Error("Solo se asignan órdenes a personal técnico de mantenimiento.");
            var especialidad = EndpointsV41.Especialidades.Contains(e.Especialidad) ? e.Especialidad! : o.Especialidad;
            var requisitos = new List<string> { Competencias.Loto };
            if (especialidad == "electrica") requisitos.Add("Trabajo eléctrico autorizado");
            var fin = e.Inicio.AddMinutes(e.DuracionMin);
            var actividad = await db.Actividades.Include(a => a.Participantes).FirstOrDefaultAsync(a => a.OrdenId == o.Id);
            var c = await Calendario.RevisarAsync(db, personas, e.Inicio, fin, actividad?.Id, requisitos);
            if (c.Any(x => x.Bloquea)) return ConConflictos("No se puede asignar: hay restricciones que lo impiden.", c, await Calendario.SugerirAsync(db, personas, fin - e.Inicio, e.Inicio, actividad?.Id), false);
            if (c.Count > 0 && !e.Confirmar) return ConConflictos("Hay conflictos de disponibilidad: revíselos antes de confirmar.", c, await Calendario.SugerirAsync(db, personas, fin - e.Inicio, e.Inicio, actividad?.Id), true);

            var nuevoResponsable = o.AsignadoAId != e.ResponsableId;
            var instruccionesNuevas = (e.Instrucciones ?? "").Trim();
            var cambiaronInstrucciones = instruccionesNuevas.Length > 0 && instruccionesNuevas != o.Instrucciones;
            o.AsignadoAId = e.ResponsableId; o.AsignadaPorId = s.Id; o.Especialidad = especialidad;
            if (e.Prioridad is "baja" or "media" or "alta" or "critica") o.Prioridad = e.Prioridad;
            o.Programada = DateOnly.FromDateTime(Calendario.ALocal(e.Inicio)); o.FechaLimite = e.FechaLimite;
            o.Instrucciones = instruccionesNuevas; o.ResultadosEsperados = e.Resultados?.Trim() ?? ""; o.PruebasRequeridas = e.Pruebas?.Trim() ?? "";
            o.HerramientasSugeridas = JsonSerializer.Serialize(e.Herramientas ?? new(), Js); o.RepuestosSugeridos = JsonSerializer.Serialize(e.Repuestos ?? new(), Js); o.Procedimientos = JsonSerializer.Serialize(e.Procedimientos ?? new(), Js);
            if (nuevoResponsable) o.RecibidaEn = null;
            if (actividad is null) { actividad = new Actividad { OrdenId = o.Id, CreadaPorId = s.Id, CreadaPor = s.Nombre }; db.Actividades.Add(actividad); }
            actividad.Tipo = o.Tipo == "preventiva" ? "preventiva" : "ot"; actividad.Area = "mantenimiento";
            actividad.Titulo = $"{o.Codigo} · {equipo.Codigo}: {o.Titulo}"; actividad.Descripcion = o.Instrucciones; actividad.Inicio = e.Inicio; actividad.Fin = fin;
            actividad.Prioridad = o.Prioridad; actividad.EquipoId = o.EquipoId; actividad.ResponsableId = e.ResponsableId; actividad.Ubicacion = equipo.Ubicacion;
            actividad.Estado = o.Estado == "en_curso" ? "en_curso" : "programada";
            var previos = actividad.Participantes.Select(p => p.TrabajadorId).ToList();
            actividad.Participantes.RemoveAll(p => !personas.Contains(p.TrabajadorId));
            foreach (var pid in personas)
            {
                var p = actividad.Participantes.FirstOrDefault(x => x.TrabajadorId == pid);
                if (p is null) actividad.Participantes.Add(p = new ParticipanteActividad { TrabajadorId = pid });
                p.Rol = pid == e.ResponsableId ? "responsable" : "colaborador";
            }
            if (cambiaronInstrucciones) Calendario.Anotar(db, o, s, "instruccion", instruccionesNuevas);
            db.Auditar(s, "asignó una orden de trabajo", "orden", o.Codigo, $"{trab.First(t => t.Id == e.ResponsableId).Nombres} · {Calendario.ALocal(e.Inicio):dd-MM HH:mm} · {e.DuracionMin} min{(colaboradores.Count > 0 ? $" · {colaboradores.Count} colaboradores" : "")}{(c.Count > 0 ? " · confirmada con conflictos" : "")}");
            await db.SaveChangesAsync();
            var cuando = $"{Calendario.ALocal(e.Inicio):ddd dd-MM HH:mm}";
            foreach (var pid in personas.Where(p => p != s.Id))
                await Avisos.AUsuarioAsync(db, hub, pid, pid == e.ResponsableId
                    ? $"{(nuevoResponsable ? "Se le asignó" : "Se actualizó")} {o.Codigo} · {equipo.Codigo}: {o.Titulo} ({cuando}, {e.DuracionMin} min){(o.Instrucciones.Length > 0 ? ". Tiene instrucciones de la jefatura." : "")}"
                    : $"{(previos.Contains(pid) ? "Se actualizó" : "Colabora en")} {o.Codigo} · {equipo.Codigo} ({cuando})", "tarea", $"/mantenimiento?orden={o.Id}", "mantenimiento", o.Codigo);
            await hub.Clients.Group("planta").SendAsync("orden", new { id = o.Id, codigo = o.Codigo, equipo = equipo.Codigo, titulo = o.Titulo, prioridad = o.Prioridad, estado = o.Estado, asignadoAId = o.AsignadoAId });
            await hub.Clients.Group("planta").SendAsync("calendario", new { id = actividad.Id });
            return Results.Ok(new { o.Version, actividad = actividad.Id, conflictosConfirmados = c.Count });
        });

        // ------------------------------------------------------------------------------------ bitácora jefe–técnico
        g.MapGet("/ordenes/{id:int}/bitacora", async (int id, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            var o = await db.Ordenes.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
            if (o is null) return Ayudas.Error("No existe esa orden.", 404);
            var participa = o.AsignadoAId == s.Id || await db.Actividades.AnyAsync(a => a.OrdenId == id && a.Participantes.Any(p => p.TrabajadorId == s.Id));
            if (!participa && !(s.Tiene("ordenes.ver") && s.Alcance("ordenes.ver") != "propio")) return Ayudas.Sin();
            var lista = await db.ComentariosOrden.AsNoTracking().Where(c => c.OrdenId == id).OrderBy(c => c.Id).ToListAsync();
            return Results.Ok(lista.Select(c => new { c.Id, c.Tipo, tipoTexto = TextoTipo.GetValueOrDefault(c.Tipo, c.Tipo), c.Texto, c.AutorNombre, c.AutorCargo, c.Fecha }));
        });

        g.MapPost("/ordenes/{id:int}/bitacora", async (int id, BitacoraEntrada e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            var o = await db.Ordenes.FindAsync(id);
            if (o is null) return Ayudas.Error("No existe esa orden.", 404);
            var actividad = await db.Actividades.AsNoTracking().Include(a => a.Participantes).FirstOrDefaultAsync(a => a.OrdenId == id);
            var ejecutor = o.AsignadoAId == s.Id || actividad?.Participantes.Any(p => p.TrabajadorId == s.Id) == true;
            var jefatura = s.Tiene("ordenes.asignar");
            if (!(ejecutor && TiposTecnico.Contains(e.Tipo)) && !(jefatura && TiposJefatura.Contains(e.Tipo))) return Ayudas.Error("No puede registrar ese tipo de entrada en esta orden.", 403);
            if (o.Estado == "cerrada") return Ayudas.Error("La orden está cerrada.", 409);
            if (e.Tipo != "recepcion" && string.IsNullOrWhiteSpace(e.Texto)) return Ayudas.Error("Escriba el detalle.");
            if (e.Tipo == "recepcion")
            {
                if (o.AsignadoAId != s.Id) return Ayudas.Error("La recepción la confirma el técnico responsable.", 403);
                if (o.RecibidaEn is not null) return Ayudas.Error("Ya confirmó la recepción de esta orden.", 409);
                o.RecibidaEn = DateTime.UtcNow;
            }
            var texto = e.Tipo == "recepcion" && string.IsNullOrWhiteSpace(e.Texto) ? "Recibí la tarea y las instrucciones." : e.Texto;
            var c = Calendario.Anotar(db, o, s, e.Tipo, texto);
            await db.SaveChangesAsync();
            var eq = await db.Equipos.AsNoTracking().FirstAsync(x => x.Id == o.EquipoId);
            if (ejecutor && !jefatura || ejecutor && e.Tipo != "comentario")
            {
                // lo que informa el técnico le llega a quien asignó (o a la jefatura y supervisión, si no hay asignador registrado)
                var nivel = e.Tipo is "problema" or "ayuda" ? "advertencia" : e.Tipo is "recursos" or "tiempo" or "revision" ? "solicitud" : "info";
                var aviso = $"{o.Codigo} · {eq.Codigo}: {TextoTipo[e.Tipo].ToLowerInvariant()} de {s.Nombre}{(e.Tipo == "recepcion" ? "" : $" — {texto}")}";
                if (o.AsignadaPorId is { } jefe && jefe != s.Id) await Avisos.AUsuarioAsync(db, hub, jefe, aviso, nivel, $"/mantenimiento?orden={o.Id}", "mantenimiento", o.Codigo);
                else await Avisos.ACargosAsync(db, hub, Avisos.Verificadores, aviso, nivel, $"/mantenimiento?orden={o.Id}", "mantenimiento", o.Codigo, excepto: s.Id);
            }
            if (jefatura && TiposJefatura.Contains(e.Tipo) && !ejecutor)
                foreach (var p in (actividad?.Participantes.Select(x => x.TrabajadorId) ?? Enumerable.Empty<string>()).Append(o.AsignadoAId).OfType<string>().Distinct().Where(p => p != s.Id))
                    await Avisos.AUsuarioAsync(db, hub, p, $"{o.Codigo} · {eq.Codigo}: {TextoTipo[e.Tipo].ToLowerInvariant()} de {s.Nombre} — {texto}", "tarea", $"/mantenimiento?orden={o.Id}", "mantenimiento", o.Codigo);
            await hub.Clients.Group("planta").SendAsync("bitacora", new { orden = o.Id });
            return Results.Created($"/api/ordenes/{o.Id}/bitacora", new { c.Id, o.RecibidaEn });
        });

        // ------------------------------------------------------------------------------------ seguimiento del departamento
        g.MapGet("/mantenimiento/seguimiento", async (ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("ordenes.asignar") && !s.Tiene("ordenes.aprobar")) return Ayudas.Sin();
            var ahora = DateTime.UtcNow; var hoy = Reloj.Hoy();
            var ots = await db.Ordenes.AsNoTracking().Where(o => o.Estado != "cerrada" || o.Cerrada > ahora.AddDays(-7)).ToListAsync();
            var eqs = await db.Equipos.AsNoTracking().ToDictionaryAsync(e => e.Id, e => new { e.Codigo, e.Nombre, e.Estado, e.Criticidad });
            var nombres = await db.Trabajadores.AsNoTracking().ToDictionaryAsync(t => t.Id, t => t.Nombres + " " + t.ApellidoPaterno);
            var acts = await db.Actividades.AsNoTracking().Where(a => a.OrdenId != null).ToDictionaryAsync(a => a.OrdenId!.Value, a => new { a.Inicio, a.Fin, a.Estado });
            var abiertas = ots.Where(o => o.Estado != "cerrada").ToList();
            object Fila(OrdenTrabajo o) => new
            {
                o.Id, o.Codigo, o.Titulo, o.Prioridad, o.Estado, o.Especialidad, o.Tipo, o.Simulada, equipo = eqs[o.EquipoId].Codigo, equipoNombre = eqs[o.EquipoId].Nombre,
                asignado = o.AsignadoAId is null ? null : nombres.GetValueOrDefault(o.AsignadoAId), o.AsignadoAId, o.RecibidaEn, o.FechaLimite, o.Version,
                inicio = acts.TryGetValue(o.Id, out var a) ? a.Inicio : (DateTime?)null, fin = acts.TryGetValue(o.Id, out var b) ? b.Fin : (DateTime?)null,
            };
            var atrasadas = abiertas.Where(o => (o.FechaLimite is { } fl && fl < hoy) || (o.Estado != "por_verificar" && acts.TryGetValue(o.Id, out var a) && a.Fin < ahora)).ToList();
            var desde30 = ahora.AddDays(-30);
            var recurrentes = (await db.Ordenes.AsNoTracking().Where(o => o.Creada > desde30 && o.Tipo == "correctiva").GroupBy(o => o.EquipoId).Select(gr => new { gr.Key, n = gr.Count() }).Where(x => x.n >= 2).OrderByDescending(x => x.n).ToListAsync())
                .Select(x => new { equipo = eqs[x.Key].Codigo, nombre = eqs[x.Key].Nombre, fallas = x.n });
            var problemas = await db.ComentariosOrden.AsNoTracking().Where(c => c.Fecha > ahora.AddDays(-2) && (c.Tipo == "problema" || c.Tipo == "ayuda" || c.Tipo == "recursos" || c.Tipo == "tiempo")).OrderByDescending(c => c.Id).Take(20).ToListAsync();
            var abiertasIds = abiertas.Select(o => o.Id).ToHashSet();
            return Results.Ok(new
            {
                sinAsignar = abiertas.Where(o => o.AsignadoAId is null).OrderBy(o => o.Prioridad == "critica" ? 0 : o.Prioridad == "alta" ? 1 : 2).Select(Fila),
                enEjecucion = abiertas.Where(o => o.Estado == "en_curso").Select(Fila),
                atrasadas = atrasadas.Select(Fila),
                sinConfirmar = abiertas.Where(o => o.Estado == "abierta" && o.AsignadoAId != null && o.RecibidaEn is null).Select(Fila),
                pendientesLiberacion = abiertas.Where(o => o.Estado == "por_verificar").Select(Fila),
                preventivas = abiertas.Where(o => o.Tipo == "preventiva").OrderBy(o => o.Programada).Take(15).Select(Fila),
                completadas = ots.Where(o => o.Estado == "cerrada").OrderByDescending(o => o.Cerrada).Take(10).Select(Fila),
                equiposDetenidos = eqs.Where(e => !EstadosEquipo.Marcha(e.Value.Estado)).Select(e => new { e.Value.Codigo, e.Value.Nombre, e.Value.Estado, e.Value.Criticidad, orden = abiertas.FirstOrDefault(o => o.EquipoId == e.Key)?.Codigo }),
                recurrentes,
                avisos = problemas.Where(c => abiertasIds.Contains(c.OrdenId)).Select(c => new { c.Id, c.OrdenId, orden = ots.FirstOrDefault(o => o.Id == c.OrdenId)?.Codigo, c.Tipo, tipoTexto = TextoTipo.GetValueOrDefault(c.Tipo, c.Tipo), c.Texto, c.AutorNombre, c.Fecha }),
            });
        });
    }
}
