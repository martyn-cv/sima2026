using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Sima.Api.Tests;

/// <summary>Escenario H: las funciones nuevas se protegen en el servidor, no solo ocultando botones.</summary>
[Collection("api")]
public class PruebasAcceso(Fabrica f)
{
    [Fact]
    public async Task EscenarioH_CadaCargoSoloHaceLoQueLeCorresponde()
    {
        var tec = await f.Entrar("tecnico", "Tecnico2026", "app");
        var op = await f.Entrar("operador", "Operador2026", "app");
        var ot = (await (await tec.PostAsJsonAsync("/api/ordenes", new { equipo = "CM-01", titulo = "Ruido en el husillo", prioridad = "media" })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        var idTec = (await f.Leer(tec, "/api/auth/yo")).GetProperty("id").GetString();

        // un técnico no se asigna órdenes ni reprograma el calendario; un operador no ve el seguimiento del departamento
        Assert.Equal(HttpStatusCode.Forbidden, (await tec.PostAsJsonAsync($"/api/ordenes/{ot}/asignar", new { version = 0u, responsableId = idTec, inicio = DateTime.UtcNow.AddDays(1), duracionMin = 60, confirmar = true })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await op.GetAsync("/api/mantenimiento/seguimiento")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await op.PostAsJsonAsync("/api/calendario/verificar", new { personas = new[] { idTec }, inicio = DateTime.UtcNow, fin = DateTime.UtcNow.AddHours(1) })).StatusCode);
        // prevención y pañol: convocar, ver personas convocables y la entrega de turno son de sus cargos
        Assert.Equal(HttpStatusCode.Forbidden, (await op.GetAsync("/api/prevencion/personas")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await tec.GetAsync("/api/panol/turnos")).StatusCode);
        // la bitácora de una orden la escriben quienes participan o la jefatura
        Assert.Equal(HttpStatusCode.Forbidden, (await op.PostAsJsonAsync($"/api/ordenes/{ot}/bitacora", new { tipo = "avance", texto = "intento" })).StatusCode);
        // el diagnóstico que ve el técnico no trae la causa real de la falla simulada
        var diag = await (await tec.GetAsync($"/api/ordenes/{ot}/diagnostico")).Content.ReadAsStringAsync();
        Assert.DoesNotContain("causaClave", diag, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("\"causa\"", diag, StringComparison.OrdinalIgnoreCase);
        // sin la clave del simulador, nadie con sesión de trabajador maneja la planta virtual
        Assert.Equal(HttpStatusCode.Unauthorized, (await tec.PostAsJsonAsync("/api/ingesta/simulacion/reiniciar", new { })).StatusCode);
    }
}
