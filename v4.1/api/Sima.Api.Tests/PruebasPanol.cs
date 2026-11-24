using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Sima.Api.Datos;

namespace Sima.Api.Tests;

/// <summary>Escenario E: solicitud, reserva, entrega y devolución de repuestos y herramientas, con bitácora inmutable.</summary>
[Collection("api")]
public class PruebasPanol(Fabrica f)
{
    static async Task<JsonElement> Json(HttpResponseMessage r) => await r.Content.ReadFromJsonAsync<JsonElement>();

    [Fact]
    public async Task EscenarioE_ReservaSeparaLoFisicoDeLoDisponibleYNoSeRetiraDosVeces()
    {
        var tec = await f.Entrar("tecnico", "Tecnico2026", "app");
        var panol = await f.Entrar("panol", "Panol2026", "app");
        var ot = (await Json(await tec.PostAsJsonAsync("/api/ordenes", new { equipo = "IN-01", titulo = "Ruido en la unidad hidráulica", prioridad = "alta" }))).GetProperty("id").GetInt32();

        // un repuesto compatible con el equipo y otro que no lo es
        var ficha = await f.Leer(tec, "/api/equipos/IN-01");
        var compatibles = ficha.GetProperty("repuestos").EnumerateArray().Select(r => r.GetProperty("id").GetInt32()).ToHashSet();
        var resumen = await f.Leer(panol, "/api/panol/resumen");
        var rep = resumen.GetProperty("repuestos").EnumerateArray().First(r => compatibles.Contains(r.GetProperty("id").GetInt32()) && r.GetProperty("disponible").GetInt32() >= 3);
        var repId = rep.GetProperty("id").GetInt32(); var fisico = rep.GetProperty("fisico").GetInt32(); var disp = rep.GetProperty("disponible").GetInt32();
        var otro = resumen.GetProperty("repuestos").EnumerateArray().First(r => !compatibles.Contains(r.GetProperty("id").GetInt32()) && r.GetProperty("disponible").GetInt32() > 0).GetProperty("id").GetInt32();

        var inc = await tec.PostAsJsonAsync("/api/panol/solicitudes", new { tipo = "repuesto", itemId = otro, cantidad = 1, ordenId = ot, confirmar = false });
        Assert.Equal(HttpStatusCode.Conflict, inc.StatusCode);
        Assert.True((await Json(inc)).GetProperty("requiereConfirmacion").GetBoolean());

        // 1. el técnico pide todo lo disponible menos uno; 2. el pañol revisa y reserva
        var cant = disp - 1;
        var sol = await tec.PostAsJsonAsync("/api/panol/solicitudes", new { tipo = "repuesto", itemId = repId, cantidad = cant, ordenId = ot, motivo = "Cambio por ruido" });
        Assert.Equal(HttpStatusCode.Created, sol.StatusCode);
        var id = (await Json(sol)).GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.Forbidden, (await tec.PostAsJsonAsync($"/api/panol/solicitudes/{id}/revisar", new { aprobar = true })).StatusCode);
        var rv = await panol.PostAsJsonAsync($"/api/panol/solicitudes/{id}/revisar", new { aprobar = true, vigenciaHoras = 8 });
        Assert.True(rv.IsSuccessStatusCode, await rv.Content.ReadAsStringAsync());

        // lo físico no cambia, lo disponible sí
        var tras = (await f.Leer(panol, "/api/panol/resumen")).GetProperty("repuestos").EnumerateArray().First(r => r.GetProperty("id").GetInt32() == repId);
        Assert.Equal(fisico, tras.GetProperty("fisico").GetInt32());
        Assert.Equal(disp - cant, tras.GetProperty("disponible").GetInt32());

        // ni siquiera el pañol puede sacar lo reservado con un retiro directo sin esa orden
        var robo = await panol.PostAsJsonAsync($"/api/repuestos/{repId}/movimiento", new { cantidad = -2, nota = "Retiro directo sin orden", ordenId = (int?)null });
        Assert.Equal(HttpStatusCode.Conflict, robo.StatusCode);

        // 3. entrega: baja el stock físico; una segunda entrega se rechaza
        Assert.True((await panol.PostAsync($"/api/panol/solicitudes/{id}/entregar", null)).IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await panol.PostAsync($"/api/panol/solicitudes/{id}/entregar", null)).StatusCode);
        var entregado = (await f.Leer(panol, "/api/panol/resumen")).GetProperty("repuestos").EnumerateArray().First(r => r.GetProperty("id").GetInt32() == repId);
        Assert.Equal(fisico - cant, entregado.GetProperty("fisico").GetInt32());

        // 4. el técnico usa uno y devuelve el resto
        var mal = await tec.PostAsJsonAsync($"/api/panol/solicitudes/{id}/cerrar", new { usada = cant, devuelta = 1 });
        Assert.Equal(HttpStatusCode.BadRequest, mal.StatusCode);
        Assert.True((await tec.PostAsJsonAsync($"/api/panol/solicitudes/{id}/cerrar", new { usada = 1, devuelta = cant - 1, nota = "Sobró" })).IsSuccessStatusCode);
        var final = (await f.Leer(panol, "/api/panol/resumen")).GetProperty("repuestos").EnumerateArray().First(r => r.GetProperty("id").GetInt32() == repId);
        Assert.Equal(fisico - 1, final.GetProperty("fisico").GetInt32());

        // 5. bitácora por ítem con cada paso, y la base de datos impide editarla
        var bit = (await f.Leer(panol, $"/api/panol/bitacora?tipo=repuesto&itemId={repId}")).EnumerateArray().Select(b => b.GetProperty("evento").GetString()).ToList();
        foreach (var ev in new[] { "solicitud", "reserva", "entrega", "devolucion", "uso" }) Assert.Contains(ev, bit);
        using var scope = f.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SimaDb>();
        await Assert.ThrowsAnyAsync<Exception>(() => db.Database.ExecuteSqlRawAsync("UPDATE bitacora_panol SET \"Detalle\" = 'alterado'"));
        await Assert.ThrowsAnyAsync<Exception>(() => db.Database.ExecuteSqlRawAsync("DELETE FROM bitacora_panol"));
    }

    [Fact]
    public async Task EscenarioE_HerramientaReservadaNoLaRetiraOtroYLaEntregaDeTurnoLaRecibeOtraPersona()
    {
        var tec = await f.Entrar("tecnico", "Tecnico2026", "app");
        var panol = await f.Entrar("panol", "Panol2026", "app");
        var inst = await f.Entrar("instrumentacion", "Instrumentacion2026", "app");
        var her = (await f.Leer(panol, "/api/panol/resumen")).GetProperty("herramientas").EnumerateArray().First(h => h.GetProperty("estado").GetString() == "disponible");
        var hid = her.GetProperty("id").GetInt32();
        var id = (await Json(await tec.PostAsJsonAsync("/api/panol/solicitudes", new { tipo = "herramienta", itemId = hid, cantidad = 1, motivo = "Medición en compresor" }))).GetProperty("id").GetInt32();
        Assert.True((await panol.PostAsJsonAsync($"/api/panol/solicitudes/{id}/revisar", new { aprobar = true })).IsSuccessStatusCode);
        Assert.Equal("reservada", (await f.Leer(panol, "/api/panol/resumen")).GetProperty("herramientas").EnumerateArray().First(h => h.GetProperty("id").GetInt32() == hid).GetProperty("estado").GetString());
        var otro = await inst.PostAsync($"/api/herramientas/{hid}/retirar", null);
        Assert.Equal(HttpStatusCode.Conflict, otro.StatusCode);
        Assert.True((await tec.PostAsync($"/api/herramientas/{hid}/retirar", null)).IsSuccessStatusCode);
        Assert.True((await tec.PostAsync($"/api/herramientas/{hid}/devolver", null)).IsSuccessStatusCode);
        var bit = (await f.Leer(panol, $"/api/panol/bitacora?tipo=herramienta&itemId={hid}")).EnumerateArray().Select(b => b.GetProperty("evento").GetString()).ToList();
        Assert.Contains("retiro", bit); Assert.Contains("devolucion", bit);

        var t = await panol.PostAsJsonAsync("/api/panol/turnos", new { pendientes = "Contar rodamientos del estante B", observaciones = "Sin novedades" });
        Assert.Equal(HttpStatusCode.Created, t.StatusCode);
        var tid = (await Json(t)).GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.Conflict, (await panol.PostAsync($"/api/panol/turnos/{tid}/recibir", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await tec.PostAsync($"/api/panol/turnos/{tid}/recibir", null)).StatusCode);
    }
}
