using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Sima.Api.Datos;
using Sima.Api.Dominio;
using Sima.Api.Servicios;

namespace Sima.Api.Endpoints;

public record CapacitacionEntrada(string Tipo, string Titulo, string? Objetivo, DateTime Inicio, int DuracionMin, string? Ubicacion, string? Modalidad, string? Relator, string? Material,
    bool Evaluacion, string? Habilitacion, int? VigenciaMeses, List<string> Participantes, bool Confirmar = false);
public record AsistenciaCapacitacion(List<RegistroAsistencia> Registros);
public record RegistroAsistencia(string TrabajadorId, string Estado, string? Nota);
public record CertificacionEntrada(string TrabajadorId, bool Aprobado, string? Nota);
public record RespuestaConvocatoria(bool Asistire, string? Nota);

/// <summary>
/// Prevención: charlas, capacitaciones, inducciones y simulacros sobre el calendario común. Convocar revisa la agenda de
/// cada persona (nada se cruza en silencio), la asistencia se registra aparte y no equivale a certificar.
/// </summary>
public static class EndpointsPrevencion
{
    static readonly string[] Tipos = { "charla", "capacitacion", "induccion", "simulacro" };
    static readonly JsonSerializerOptions Js = new(JsonSerializerDefaults.Web);
    static DateTime Utc(DateTime d) => d.Kind switch { DateTimeKind.Utc => d, DateTimeKind.Local => d.ToUniversalTime(), _ => DateTime.SpecifyKind(d, DateTimeKind.Utc) };
    static JsonObject Datos(Actividad a) => JsonNode.Parse(string.IsNullOrWhiteSpace(a.Datos) ? "{}" : a.Datos) as JsonObject ?? new JsonObject();

    public static void MapPrevencion(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api").RequireAuthorization();

        // personas convocables: solo nombre, cargo y turno (nada personal)
        g.MapGet("/prevencion/personas", async (ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("sst.gestionar")) return Ayudas.Sin();
            var estados = await Reglas.CalcularTodosAsync(db);
            var lista = await db.Trabajadores.AsNoTracking().Include(t => t.Cargo).OrderBy(t => t.Nombres).Select(t => new { t.Id, nombre = t.Nombres + " " + t.ApellidoPaterno, cargo = t.Cargo!.Nombre, t.CargoId, t.Turno }).ToListAsync();
            return Results.Ok(lista.Where(t => estados.TryGetValue(t.Id, out var e) && e.Activa));
        });

        g.MapGet("/prevencion/actividades", async (DateTime? desde, DateTime? hasta, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("sst.gestionar") && !s.Tiene("sst.ver")) return Ayudas.Sin();
            var d = Utc(desde ?? DateTime.UtcNow.AddDays(-30)); var h = Utc(hasta ?? DateTime.UtcNow.AddDays(60));
            var acts = await db.Actividades.AsNoTracking().Include(a => a.Participantes).Where(a => a.Area == "prevencion" && a.Inicio < h && a.Fin > d).OrderBy(a => a.Inicio).ToListAsync();
            var ids = acts.SelectMany(a => a.Participantes.Select(p => p.TrabajadorId)).Distinct().ToList();
            var personas = await db.Trabajadores.AsNoTracking().Include(t => t.Cargo).Where(t => ids.Contains(t.Id)).ToDictionaryAsync(t => t.Id, t => new { nombre = t.Nombres + " " + t.ApellidoPaterno, cargo = t.Cargo!.Nombre });
            return Results.Ok(acts.Select(a => new
            {
                a.Id, a.Tipo, a.Titulo, a.Descripcion, a.Inicio, a.Fin, a.Ubicacion, a.Estado, a.Restricciones, a.CreadaPor, datos = Datos(a), a.Version,
                participantes = a.Participantes.Select(p => new { id = p.TrabajadorId, personas.GetValueOrDefault(p.TrabajadorId)?.nombre, personas.GetValueOrDefault(p.TrabajadorId)?.cargo, p.Rol, p.Estado, p.Nota, p.RespondioEn }),
            }));
        });

        g.MapPost("/prevencion/actividades", async (CapacitacionEntrada e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (!s.Tiene("sst.gestionar")) return Ayudas.Error("Programar capacitaciones es de prevención de riesgos.", 403);
            if (!Tipos.Contains(e.Tipo)) return Ayudas.Error("Tipo de actividad no válido.");
            if (string.IsNullOrWhiteSpace(e.Titulo)) return Ayudas.Error("Indique el tema.");
            if (e.DuracionMin is < 15 or > 600) return Ayudas.Error("La duración debe estar entre 15 minutos y 10 horas.");
            var participantes = (e.Participantes ?? new()).Where(p => !string.IsNullOrWhiteSpace(p)).Distinct().ToList();
            if (participantes.Count == 0) return Ayudas.Error("Convoque al menos a una persona.");
            var ini = Utc(e.Inicio); var fin = ini.AddMinutes(e.DuracionMin);
            if (ini < DateTime.UtcNow.AddMinutes(-5)) return Ayudas.Error("No se programa en el pasado.");
            var todos = participantes.Append(e.Relator).Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x!).Distinct().ToList();
            var c = await Calendario.RevisarAsync(db, todos, ini, fin);
            // en una charla de prevención, estar fuera de turno se conversa con la jefatura, pero no bloquea
            var bloquean = c.Where(x => x.Bloquea).ToList();
            if (bloquean.Count > 0)
                return Results.Json(new { error = "Hay personas que no se pueden convocar.", requiereConfirmacion = false, conflictos = c.Select(x => new { x.TrabajadorId, x.Persona, x.Tipo, x.Detalle, x.Bloquea }), sugerencias = Array.Empty<DateTime>() }, statusCode: 409);
            if (c.Count > 0 && !e.Confirmar)
            {
                // horarios en que la mayor cantidad de personas está libre: primero todos; si no hay, los que dejan fuera a menos personas
                var sug = await Calendario.SugerirAsync(db, todos, fin - ini, ini);
                var conflictuados = c.Select(x => x.TrabajadorId).Distinct().ToList();
                return Results.Json(new { error = $"{conflictuados.Count} de {todos.Count} personas tienen otra actividad o están fuera de turno en ese horario.", requiereConfirmacion = true,
                    conflictos = c.Select(x => new { x.TrabajadorId, x.Persona, x.Tipo, x.Detalle, x.Bloquea }), sugerencias = sug, libres = todos.Count - conflictuados.Count }, statusCode: 409);
            }
            var datos = new JsonObject { ["objetivo"] = e.Objetivo?.Trim() ?? "", ["modalidad"] = e.Modalidad ?? "presencial", ["material"] = e.Material?.Trim() ?? "", ["evaluacion"] = e.Evaluacion,
                ["habilitacion"] = e.Habilitacion?.Trim() ?? "", ["vigenciaMeses"] = e.VigenciaMeses ?? 12, ["certificados"] = new JsonArray() };
            var a = new Actividad
            {
                Tipo = e.Tipo, Area = "prevencion", Titulo = e.Titulo.Trim(), Descripcion = e.Objetivo?.Trim() ?? "", Inicio = ini, Fin = fin, Ubicacion = e.Ubicacion?.Trim() ?? "", Visibilidad = "area",
                ResponsableId = e.Relator ?? s.Id, CreadaPorId = s.Id, CreadaPor = s.Nombre, Datos = datos.ToJsonString(),
                Restricciones = c.Count == 0 ? "" : "Confirmada con conflictos: " + string.Join("; ", c.Select(x => $"{x.Persona}: {x.Detalle}")),
            };
            foreach (var p in participantes) a.Participantes.Add(new ParticipanteActividad { TrabajadorId = p, Rol = "participante" });
            if (!string.IsNullOrWhiteSpace(e.Relator) && !participantes.Contains(e.Relator)) a.Participantes.Add(new ParticipanteActividad { TrabajadorId = e.Relator, Rol = "responsable", Estado = "confirmado" });
            db.Actividades.Add(a);
            db.Auditar(s, "programó una actividad de prevención", "actividad", a.Titulo, $"{Calendario.Texto(ini)} · {participantes.Count} convocados{(c.Count > 0 ? $" · {c.Select(x => x.TrabajadorId).Distinct().Count()} con conflicto confirmado" : "")}");
            await db.SaveChangesAsync();
            var cuando = $"{Calendario.Texto(ini)}–{Calendario.Texto(fin, "HH:mm")}";
            var conConflicto = c.Select(x => x.TrabajadorId).ToHashSet();
            foreach (var p in participantes.Where(p => p != s.Id))
                await Avisos.AUsuarioAsync(db, hub, p, $"Convocatoria: {a.Titulo} · {cuando}{(a.Ubicacion.Length > 0 ? $" · {a.Ubicacion}" : "")}. Confirme su asistencia en Mi agenda.{(conConflicto.Contains(p) ? " Se cruza con otra actividad suya: su jefatura fue avisada." : "")}",
                    conConflicto.Contains(p) ? "advertencia" : "tarea", "/agenda", "prevencion", $"ACT-{a.Id}");
            // nada se cruza en silencio: quien programó el trabajo que se cruza también se entera
            if (conConflicto.Count > 0)
            {
                var cruces = await db.ParticipantesActividad.AsNoTracking().Where(p => conConflicto.Contains(p.TrabajadorId))
                    .Join(db.Actividades.AsNoTracking().Where(x => x.Id != a.Id && Calendario.Abiertas.Contains(x.Estado) && x.Inicio < fin && x.Fin > ini), p => p.ActividadId, x => x.Id, (p, x) => new { p.TrabajadorId, x.CreadaPorId, x.Area, x.Titulo }).ToListAsync();
                var nombres = c.GroupBy(x => x.TrabajadorId).ToDictionary(x => x.Key, x => x.First().Persona);
                foreach (var cr in cruces.Where(x => x.CreadaPorId != s.Id).GroupBy(x => x.CreadaPorId))
                    await Avisos.AUsuarioAsync(db, hub, cr.Key, $"Prevención convocó a {string.Join(", ", cr.Select(x => nombres.GetValueOrDefault(x.TrabajadorId, x.TrabajadorId)).Distinct())} a «{a.Titulo}» ({cuando}), que se cruza con «{cr.First().Titulo}». Revise si reprograma.", "advertencia", "/plan", "prevencion", $"ACT-{a.Id}");
            }
            await hub.Clients.Group("planta").SendAsync("calendario", new { id = a.Id });
            return Results.Created($"/api/prevencion/actividades/{a.Id}", new { a.Id, convocados = participantes.Count, conflictosConfirmados = conConflicto.Count });
        });

        g.MapPost("/prevencion/actividades/{id:int}/asistencia", async (int id, AsistenciaCapacitacion e, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("sst.gestionar")) return Ayudas.Sin();
            var a = await db.Actividades.Include(x => x.Participantes).FirstOrDefaultAsync(x => x.Id == id && x.Area == "prevencion");
            if (a is null) return Ayudas.Error("No existe esa actividad.", 404);
            if (a.Estado == "cancelada") return Ayudas.Error("La actividad fue cancelada.", 409);
            if (a.Inicio > DateTime.UtcNow) return Ayudas.Error("La asistencia se registra cuando la actividad comienza.", 409);
            foreach (var r in e.Registros)
            {
                if (r.Estado is not ("asistio" or "ausente" or "justificado")) return Ayudas.Error("Estado de asistencia no válido.");
                var p = a.Participantes.FirstOrDefault(x => x.TrabajadorId == r.TrabajadorId);
                if (p is null) return Ayudas.Error("Esa persona no fue convocada.", 404);
                if (r.Estado == "justificado" && string.IsNullOrWhiteSpace(r.Nota) && string.IsNullOrWhiteSpace(p.Nota)) return Ayudas.Error("Una ausencia justificada necesita el motivo.");
                p.Estado = r.Estado; if (!string.IsNullOrWhiteSpace(r.Nota)) p.Nota = r.Nota.Trim();
            }
            if (a.Fin <= DateTime.UtcNow) a.Estado = "completada"; else a.Estado = "en_curso";
            db.Auditar(s, "registró asistencia", "actividad", a.Titulo, $"{a.Participantes.Count(p => p.Estado == "asistio")} asistieron");
            await db.SaveChangesAsync();
            return Results.Ok(new { asistieron = a.Participantes.Count(p => p.Estado == "asistio"), a.Estado, nota = "La asistencia no certifica: la certificación se registra aparte." });
        });

        g.MapPost("/prevencion/actividades/{id:int}/certificar", async (int id, CertificacionEntrada e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (!s.Tiene("sst.gestionar") || !s.Tiene("habilitaciones.editar")) return Ayudas.Error("Certificar es de prevención de riesgos con permiso sobre habilitaciones.", 403);
            var a = await db.Actividades.Include(x => x.Participantes).FirstOrDefaultAsync(x => x.Id == id && x.Area == "prevencion");
            if (a is null) return Ayudas.Error("No existe esa actividad.", 404);
            var p = a.Participantes.FirstOrDefault(x => x.TrabajadorId == e.TrabajadorId);
            if (p is null) return Ayudas.Error("Esa persona no fue convocada.", 404);
            if (p.Estado != "asistio") return Ayudas.Error("Solo se certifica a quien asistió.", 409);
            var d = Datos(a);
            var evaluacion = d["evaluacion"]?.GetValue<bool>() ?? false;
            if (evaluacion && string.IsNullOrWhiteSpace(e.Nota)) return Ayudas.Error("Esta capacitación tiene evaluación: registre el resultado.");
            var certs = d["certificados"] as JsonArray ?? new JsonArray();
            if (certs.Any(x => x?["trabajadorId"]?.GetValue<string>() == e.TrabajadorId)) return Ayudas.Error("Ya se registró la certificación de esta persona.", 409);
            certs.Add(new JsonObject { ["trabajadorId"] = e.TrabajadorId, ["aprobado"] = e.Aprobado, ["nota"] = e.Nota ?? "", ["por"] = s.Nombre, ["fecha"] = DateTime.UtcNow });
            d["certificados"] = certs; a.Datos = d.ToJsonString();
            var hab = d["habilitacion"]?.GetValue<string>() ?? "";
            string? otorgada = null;
            if (e.Aprobado && hab.Length > 0)
            {
                var meses = d["vigenciaMeses"]?.GetValue<int>() ?? 12;
                var h = await db.Habilitaciones.FirstOrDefaultAsync(x => x.TrabajadorId == e.TrabajadorId && x.Nombre == hab);
                if (h is null) db.Habilitaciones.Add(h = new Habilitacion { TrabajadorId = e.TrabajadorId, Nombre = hab });
                h.FechaObtencion = Reloj.Hoy(); h.VigenciaMeses = meses; otorgada = $"{hab} vigente hasta {h.Vencimiento:dd-MM-yyyy}";
            }
            db.Auditar(s, e.Aprobado ? "certificó una capacitación" : "registró una capacitación no aprobada", "actividad", a.Titulo, $"{e.TrabajadorId}{(otorgada is null ? "" : $" · {otorgada}")}");
            await db.SaveChangesAsync();
            await Avisos.AUsuarioAsync(db, hub, e.TrabajadorId, e.Aprobado ? $"Aprobó «{a.Titulo}».{(otorgada is null ? "" : $" Habilitación: {otorgada}.")}" : $"«{a.Titulo}»: no aprobada. Prevención le indicará cómo repetirla.", e.Aprobado ? "info" : "advertencia", "/agenda", "prevencion");
            return Results.Ok(new { aprobado = e.Aprobado, habilitacion = otorgada });
        });

        g.MapPost("/prevencion/actividades/{id:int}/cancelar", async (int id, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (!s.Tiene("sst.gestionar")) return Ayudas.Sin();
            var a = await db.Actividades.Include(x => x.Participantes).FirstOrDefaultAsync(x => x.Id == id && x.Area == "prevencion");
            if (a is null) return Ayudas.Error("No existe esa actividad.", 404);
            if (a.Estado is "completada" or "cancelada") return Ayudas.Error("La actividad ya terminó.", 409);
            a.Estado = "cancelada";
            await db.SaveChangesAsync();
            foreach (var p in a.Participantes.Where(p => p.TrabajadorId != s.Id)) await Avisos.AUsuarioAsync(db, hub, p.TrabajadorId, $"Se canceló «{a.Titulo}» ({Calendario.Texto(a.Inicio)}).", "info", "/agenda", "prevencion");
            await hub.Clients.Group("planta").SendAsync("calendario", new { id = a.Id });
            return Results.Ok(new { a.Estado });
        });

        // ------------------------------------------------------------------------------------ agenda personal
        g.MapGet("/yo/agenda", async (DateTime? desde, DateTime? hasta, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            var d = Utc(desde ?? DateTime.UtcNow.Date.AddDays(-7)); var h = Utc(hasta ?? DateTime.UtcNow.Date.AddDays(30));
            var acts = await db.Actividades.AsNoTracking().Include(a => a.Participantes).Where(a => a.Estado != "cancelada" && a.Inicio < h && a.Fin > d && a.Participantes.Any(p => p.TrabajadorId == s.Id)).OrderBy(a => a.Inicio).ToListAsync();
            var ots = await db.Ordenes.AsNoTracking().Where(o => acts.Select(a => a.OrdenId).Contains(o.Id)).ToDictionaryAsync(o => o.Id, o => o.Codigo);
            return Results.Ok(acts.Select(a =>
            {
                var yo = a.Participantes.First(p => p.TrabajadorId == s.Id);
                return new { a.Id, a.Tipo, a.Area, a.Titulo, a.Descripcion, a.Inicio, a.Fin, a.Ubicacion, a.Estado, a.OrdenId, orden = a.OrdenId is { } o ? ots.GetValueOrDefault(o) : null, a.CreadaPor, rol = yo.Rol, miEstado = yo.Estado, miNota = yo.Nota, convocados = a.Participantes.Count, datos = a.Area == "prevencion" ? Datos(a) : null };
            }));
        });

        g.MapPost("/actividades/{id:int}/responder", async (int id, RespuestaConvocatoria e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            var a = await db.Actividades.Include(x => x.Participantes).FirstOrDefaultAsync(x => x.Id == id);
            if (a is null) return Ayudas.Error("No existe esa actividad.", 404);
            var p = a.Participantes.FirstOrDefault(x => x.TrabajadorId == s.Id);
            if (p is null) return Ayudas.Error("No está convocado a esta actividad.", 403);
            if (a.Estado is "completada" or "cancelada") return Ayudas.Error("La actividad ya terminó.", 409);
            if (!e.Asistire && string.IsNullOrWhiteSpace(e.Nota)) return Ayudas.Error("Indique por qué no puede asistir.");
            p.Estado = e.Asistire ? "confirmado" : "justificado"; p.Nota = (e.Nota ?? "").Trim(); p.RespondioEn = DateTime.UtcNow;
            await db.SaveChangesAsync();
            if (a.CreadaPorId != s.Id)
                await Avisos.AUsuarioAsync(db, hub, a.CreadaPorId, e.Asistire ? $"{s.Nombre} confirmó su asistencia a «{a.Titulo}»." : $"{s.Nombre} no podrá asistir a «{a.Titulo}»: {p.Nota}", e.Asistire ? "info" : "advertencia", a.Area == "prevencion" ? "/capacitaciones" : "/plan", a.Area);
            return Results.Ok(new { p.Estado });
        });
    }
}
