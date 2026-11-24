using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Sima.Api.Datos;

namespace Sima.Api.Tests;

/// <summary>Escenario D: charla preventiva sobre el calendario común, sin cruces silenciosos; asistir no es certificar.</summary>
[Collection("api")]
public class PruebasPrevencion(Fabrica f)
{
    static async Task<JsonElement> Json(HttpResponseMessage r) => await r.Content.ReadFromJsonAsync<JsonElement>();

    [Fact]
    public async Task EscenarioD_CharlaDetectaCrucesAvisaYSeparaAsistenciaDeCertificacion()
    {
        var prev = await f.Entrar("prevencion", "Prevencion2026", "app");
        var jm = await f.Entrar("jefe.mantenimiento", "Jefemant2026", "app");
        var tec = await f.Entrar("tecnico", "Tecnico2026", "app");
        var op = await f.Entrar("operador", "Operador2026", "app");
        var idTec = (await f.Leer(tec, "/api/auth/yo")).GetProperty("id").GetString()!;
        var idOp = (await f.Leer(op, "/api/auth/yo")).GetProperty("id").GetString()!;

        // el técnico ya tiene una orden agendada pasado mañana
        var turno = (await f.Leer(jm, "/api/calendario/tecnicos")).EnumerateArray().First(t => t.GetProperty("id").GetString() == idTec).GetProperty("turno").GetString();
        var hora = turno switch { "A" => 9, "B" => 16, "N" => 23, _ => 10 };
        var dia = DateTime.UtcNow.Date.AddDays(2); while (dia.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) dia = dia.AddDays(1);
        var inicio = DateTime.SpecifyKind(dia.AddHours(hora + 3), DateTimeKind.Utc);
        var ot = (await Json(await jm.PostAsJsonAsync("/api/ordenes", new { equipo = "PH-01", titulo = "Revisión de cortina de luz", prioridad = "media" }))).GetProperty("id").GetInt32();
        var v = (await f.Leer(jm, $"/api/ordenes/{ot}")).GetProperty("version").GetUInt32();
        var asig = await jm.PostAsJsonAsync($"/api/ordenes/{ot}/asignar", new { version = v, responsableId = idTec, colaboradores = Array.Empty<string>(), inicio, duracionMin = 120, especialidad = "electrica", confirmar = true });
        Assert.True(asig.IsSuccessStatusCode, await asig.Content.ReadAsStringAsync());

        // un técnico no puede programar charlas
        var charla = new { tipo = "charla", titulo = "Bloqueo y etiquetado en prensas", objetivo = "Repasar el procedimiento LOTO de prensas hidráulicas", inicio = inicio.AddMinutes(30), duracionMin = 45, ubicacion = "Sala de capacitación",
            modalidad = "presencial", relator = (string?)null, material = "Procedimiento PRC-LOTO-02", evaluacion = true, habilitacion = "Bloqueo y etiquetado (LOTO)", vigenciaMeses = 12, participantes = new[] { idTec, idOp }, confirmar = false };
        Assert.Equal(HttpStatusCode.Forbidden, (await tec.PostAsJsonAsync("/api/prevencion/actividades", charla)).StatusCode);

        // el cruce se detecta y se ofrecen horarios; nada queda agendado sin confirmación
        var r = await prev.PostAsJsonAsync("/api/prevencion/actividades", charla);
        Assert.Equal(HttpStatusCode.Conflict, r.StatusCode);
        var j = await Json(r);
        Assert.True(j.GetProperty("requiereConfirmacion").GetBoolean());
        Assert.Contains(j.GetProperty("conflictos").EnumerateArray(), c => c.GetProperty("trabajadorId").GetString() == idTec && c.GetProperty("tipo").GetString() == "solape");
        Assert.True(j.GetProperty("sugerencias").GetArrayLength() > 0);

        // se confirma conscientemente: el técnico y quien agendó su orden quedan avisados
        var ok = await prev.PostAsJsonAsync("/api/prevencion/actividades", charla with { confirmar = true });
        Assert.Equal(HttpStatusCode.Created, ok.StatusCode);
        var act = (await Json(ok)).GetProperty("id").GetInt32();
        var notTec = (await f.Leer(tec, "/api/notificaciones")).GetProperty("items").EnumerateArray().Select(n => n.GetProperty("texto").GetString()!).ToList();
        Assert.Contains(notTec, t => t.StartsWith("Convocatoria: Bloqueo y etiquetado en prensas") && t.Contains("jefatura fue avisada"));
        var notJm = (await f.Leer(jm, "/api/notificaciones")).GetProperty("items").EnumerateArray().Select(n => n.GetProperty("texto").GetString()!).ToList();
        Assert.Contains(notJm, t => t.Contains("Prevención convocó") && t.Contains("Revisión de cortina de luz"));

        // aparece en la agenda personal y la persona responde
        var agenda = await f.Leer(op, "/api/yo/agenda");
        Assert.Contains(agenda.EnumerateArray(), a => a.GetProperty("id").GetInt32() == act && a.GetProperty("miEstado").GetString() == "convocado");
        Assert.True((await op.PostAsJsonAsync($"/api/actividades/{act}/responder", new { asistire = true })).IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await tec.PostAsJsonAsync($"/api/actividades/{act}/responder", new { asistire = false, nota = "" })).StatusCode);
        Assert.True((await tec.PostAsJsonAsync($"/api/actividades/{act}/responder", new { asistire = false, nota = "Tengo la OT de la prensa" })).IsSuccessStatusCode);

        // la asistencia se registra cuando la actividad empieza
        var registros = new { registros = new[] { new { trabajadorId = idOp, estado = "asistio", nota = (string?)null }, new { trabajadorId = idTec, estado = "justificado", nota = (string?)"OT en curso" } } };
        Assert.Equal(HttpStatusCode.Conflict, (await prev.PostAsJsonAsync($"/api/prevencion/actividades/{act}/asistencia", registros)).StatusCode);
        using (var scope = f.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<SimaDb>();
            await db.Actividades.Where(a => a.Id == act).ExecuteUpdateAsync(x => x.SetProperty(a => a.Inicio, DateTime.UtcNow.AddHours(-2)).SetProperty(a => a.Fin, DateTime.UtcNow.AddHours(-1)));
        }
        var asis = await prev.PostAsJsonAsync($"/api/prevencion/actividades/{act}/asistencia", registros);
        Assert.True(asis.IsSuccessStatusCode, await asis.Content.ReadAsStringAsync());

        // asistir no otorga la habilitación; certificar sí, y solo a quien asistió
        bool TieneLoto(JsonElement habs) => habs.EnumerateArray().Any(h => h.GetProperty("nombre").GetString() == "Bloqueo y etiquetado (LOTO)" && h.GetProperty("estado").GetString() != "VENCIDA");
        var antes = TieneLoto(await f.Leer(op, "/api/yo/habilitaciones"));
        Assert.False(antes);
        Assert.Equal(HttpStatusCode.Conflict, (await prev.PostAsJsonAsync($"/api/prevencion/actividades/{act}/certificar", new { trabajadorId = idTec, aprobado = true, nota = "6/7" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await prev.PostAsJsonAsync($"/api/prevencion/actividades/{act}/certificar", new { trabajadorId = idOp, aprobado = true, nota = "" })).StatusCode);
        var cert = await prev.PostAsJsonAsync($"/api/prevencion/actividades/{act}/certificar", new { trabajadorId = idOp, aprobado = true, nota = "Evaluación 6/7" });
        Assert.True(cert.IsSuccessStatusCode, await cert.Content.ReadAsStringAsync());
        Assert.True(TieneLoto(await f.Leer(op, "/api/yo/habilitaciones")));
    }
}
