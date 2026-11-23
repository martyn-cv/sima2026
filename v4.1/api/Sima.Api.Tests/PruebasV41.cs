using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace Sima.Api.Tests;

/// <summary>Integración entre la web, SIMA Desktop y el simulador de PLC sobre la base única (v4.1).</summary>
[Collection("api")]
public class PruebasV41(Fabrica f)
{
    HttpClient Simulador() { var c = f.CreateClient(); c.DefaultRequestHeaders.Add("X-API-Key", "clave-de-prueba"); return c; }
    HttpClient Gateway() { var c = f.CreateClient(); c.DefaultRequestHeaders.Add("X-API-Key", Fabrica.ClaveGateway); return c; }
    static string Uid() => Guid.NewGuid().ToString("N");

    [Fact]
    public async Task Ejemplo1_UnaFallaDelPlcSimuladoLlegaATodasLasAplicacionesSinDuplicarse()
    {
        var sim = Simulador();
        var uid = Uid();
        var lote = new[] { new { uid, ts = DateTime.UtcNow, tipo = "estado_plc", nivel = "alarma", mensaje = "Falla de CPU simulada", datos = new { estado = "error" } } };
        var r = await sim.PostAsJsonAsync("/api/ingesta/plc/PLC-03/eventos", lote);
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.Equal(1, (await r.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("aceptados").GetInt32());

        var tec = await f.Entrar("tecnico", "Tecnico2026", "app");                       // SIMA Desktop
        var eventos = await f.Leer(tec, "/api/eventos?plc=PLC-03");
        Assert.Contains(eventos.EnumerateArray(), e => e.GetProperty("tipo").GetString() == "estado_plc" && e.GetProperty("simulado").GetBoolean());
        var ev01 = await f.Leer(tec, "/api/equipos/EV-01");
        Assert.Equal("alarma", ev01.GetProperty("equipo").GetProperty("estado").GetString());
        Assert.Contains(ev01.GetProperty("historial").EnumerateArray(), h => h.GetProperty("hasta").GetString() == "alarma" && h.GetProperty("origen").GetString() == "simulador");
        var ordenes = (await f.Leer(tec, "/api/ordenes")).EnumerateArray().Count(o => o.GetProperty("titulo").GetString() == "Falla del controlador PLC-03");
        Assert.Equal(1, ordenes);

        // el simulador reintenta el mismo lote (perdió la respuesta): no se duplica nada
        var otra = await (await sim.PostAsJsonAsync("/api/ingesta/plc/PLC-03/eventos", lote)).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, otra.GetProperty("aceptados").GetInt32());
        Assert.Equal(1, otra.GetProperty("duplicados").GetInt32());
        Assert.Equal(1, (await f.Leer(tec, "/api/ordenes")).EnumerateArray().Count(o => o.GetProperty("titulo").GetString() == "Falla del controlador PLC-03"));

        var web = await f.Leer(await f.Entrar("gerencia", "Gerencia2026", "web"), "/api/estructura");             // plataforma web
        var eq = web[0].GetProperty("areas").EnumerateArray().SelectMany(a => a.GetProperty("lineas").EnumerateArray()).SelectMany(l => l.GetProperty("equipos").EnumerateArray()).First(e => e.GetProperty("codigo").GetString() == "EV-01");
        Assert.Equal("alarma", eq.GetProperty("estado").GetString());
    }

    [Fact]
    public async Task ElSimuladorNoPuedeAlimentarUnPlcRealNiElGatewayUnoSimulado()
    {
        await using (var db = f.NuevaBd())
        {
            var p = await db.Plcs.FirstAsync(x => x.Codigo == "PLC-04");
            p.Origen = "real";
            await db.SaveChangesAsync();
        }
        try
        {
            var sim = Simulador();
            Assert.Equal(HttpStatusCode.Forbidden, (await sim.GetAsync("/api/ingesta/plc/PLC-04/config")).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await sim.PostAsJsonAsync("/api/ingesta/plc/PLC-04/telemetria", new { estado = "run", lecturas = Array.Empty<object>() })).StatusCode);
            Assert.DoesNotContain((await f.Leer(sim, "/api/ingesta/plc")).EnumerateArray(), p => p.GetProperty("codigo").GetString() == "PLC-04");
            var gw = Gateway();
            Assert.Equal(HttpStatusCode.OK, (await gw.GetAsync("/api/ingesta/plc/PLC-04/config")).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await gw.GetAsync("/api/ingesta/plc/PLC-01/config")).StatusCode);
        }
        finally
        {
            await using var db = f.NuevaBd();
            (await db.Plcs.FirstAsync(x => x.Codigo == "PLC-04")).Origen = "simulado";
            await db.SaveChangesAsync();
        }
    }

    [Fact]
    public async Task Ejemplo2_LaReparacionDesdeDesktopActualizaOrdenEquipoHistorialYStockEnUnaSolaOperacion()
    {
        var tec = await f.Entrar("tecnico", "Tecnico2026", "app");
        var crear = await tec.PostAsJsonAsync("/api/ordenes", new { equipo = "BC-01", titulo = "Ruido en rodamiento (prueba v4.1)", prioridad = "alta" });
        var ot = (await crear.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.OK, (await tec.PostAsJsonAsync($"/api/ordenes/{ot}/tomar", new { lotoConfirmado = true })).StatusCode);
        var ficha = await f.Leer(tec, "/api/equipos/BC-01");
        Assert.Equal("en_mantencion", ficha.GetProperty("equipo").GetProperty("estado").GetString());
        var rp = ficha.GetProperty("repuestos").EnumerateArray().First(r => r.GetProperty("stock").GetInt32() > 0);
        var stock = rp.GetProperty("stock").GetInt32();
        var herramienta = (await f.Leer(tec, "/api/herramientas")).EnumerateArray().First().GetProperty("id").GetInt32();

        // mientras está en mantención, lo que diga el simulador no cambia el estado administrativo
        await Simulador().PostAsJsonAsync("/api/ingesta/plc/PLC-04/eventos", new[] { new { uid = Uid(), tipo = "arranque", equipo = "BC-01", nivel = "ok", mensaje = "arranque simulado" } });
        Assert.Equal("en_mantencion", (await f.Leer(tec, "/api/equipos/BC-01")).GetProperty("equipo").GetProperty("estado").GetString());

        var uid = Uid();
        var cuerpo = new
        {
            uid, causa = "mecanica", diagnostico = "Rodamiento lado acople con juego", accion = "Cambio de rodamiento y alineación láser", resultado = "resuelto",
            repuestos = new[] { new { repuestoId = rp.GetProperty("id").GetInt32(), cantidad = 1 } }, herramientas = new[] { herramienta }, cerrar = true, lotoRetirado = true,
        };
        var r = await tec.PostAsJsonAsync($"/api/ordenes/{ot}/intervenciones", cuerpo);
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var despues = await f.Leer(tec, "/api/equipos/BC-01");
        Assert.Equal("operando", despues.GetProperty("equipo").GetProperty("estado").GetString());
        Assert.Equal(stock - 1, despues.GetProperty("repuestos").EnumerateArray().First(x => x.GetProperty("id").GetInt32() == rp.GetProperty("id").GetInt32()).GetProperty("stock").GetInt32());
        var inter = despues.GetProperty("intervenciones")[0];
        Assert.Equal("Cambio de rodamiento y alineación láser", inter.GetProperty("accion").GetString());
        Assert.Equal(1, inter.GetProperty("repuestos").GetArrayLength());
        Assert.Equal("cerrada", (await f.Leer(tec, $"/api/ordenes/{ot}")).GetProperty("estado").GetString());

        // la web ve la misma intervención
        var web = await f.Leer(await f.Entrar("gerencia", "Gerencia2026", "web"), "/api/equipos/BC-01");
        Assert.Equal(inter.GetProperty("id").GetInt32(), web.GetProperty("intervenciones")[0].GetProperty("id").GetInt32());

        // reenvío desde la cola sin conexión: no descuenta stock dos veces
        var repetida = await tec.PostAsJsonAsync($"/api/ordenes/{ot}/intervenciones", cuerpo);
        Assert.True((await repetida.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("repetida").GetBoolean());
        Assert.Equal(stock - 1, (await f.Leer(tec, "/api/equipos/BC-01")).GetProperty("repuestos").EnumerateArray().First(x => x.GetProperty("id").GetInt32() == rp.GetProperty("id").GetInt32()).GetProperty("stock").GetInt32());
    }

    [Fact]
    public async Task Ejemplo3_UnaMaquinaRegistradaEnLaWebLaVenDesktopYElSimuladorConElMismoCodigo()
    {
        var ger = await f.Entrar("gerencia", "Gerencia2026", "web");
        var linea = (await f.Leer(ger, "/api/estructura"))[0].GetProperty("areas").EnumerateArray().SelectMany(a => a.GetProperty("lineas").EnumerateArray()).First(l => l.GetProperty("codigo").GetString() == "L1").GetProperty("id").GetInt32();
        var rrhh = await f.Entrar("rrhh", "Rrhh2026", "web");
        Assert.Equal(HttpStatusCode.Forbidden, (await rrhh.PostAsJsonAsync("/api/equipos", new { codigo = "TC-09", nombre = "x", tipo = "Torno CNC", lineaId = linea })).StatusCode);
        var r = await ger.PostAsJsonAsync("/api/equipos", new { codigo = "TC-09", nombre = "Torno de prueba", tipo = "Torno CNC", lineaId = linea, plc = "PLC-01", modeloSimulacion = "maquina", criticidad = "media" });
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var version = (await r.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("version").GetUInt32();

        var tec = await f.Entrar("tecnico", "Tecnico2026", "app");
        var ficha = await f.Leer(tec, "/api/equipos/TC-09");
        Assert.Equal("Línea 1 · Mecanizado", ficha.GetProperty("jerarquia").GetProperty("linea").GetProperty("nombre").GetString());
        Assert.Equal(3, ficha.GetProperty("sensores").GetArrayLength());                 // sensores típicos de un torno
        Assert.Contains((await f.Leer(Simulador(), "/api/ingesta/catalogo")).EnumerateArray(), e => e.GetProperty("codigo").GetString() == "TC-09" && e.GetProperty("modeloSimulacion").GetString() == "maquina");

        // edición concurrente: el segundo que guarda con la versión vieja recibe 409
        var cambio = new { codigo = "TC-09", nombre = "Torno de prueba A", tipo = "Torno CNC", lineaId = linea, version };
        Assert.Equal(HttpStatusCode.OK, (await ger.PutAsJsonAsync("/api/equipos/TC-09", cambio)).StatusCode);
        var tarde = await ger.PutAsJsonAsync("/api/equipos/TC-09", cambio with { nombre = "Torno de prueba B" });
        Assert.Equal(HttpStatusCode.Conflict, tarde.StatusCode);
        Assert.Equal("Torno de prueba A", (await f.Leer(tec, "/api/equipos/TC-09")).GetProperty("equipo").GetProperty("nombre").GetString());
    }

    [Fact]
    public async Task UnLoteDeTelemetriaReenviadoNoSeRegistraDosVeces()
    {
        var sim = Simulador();
        var lote = new { uid = Uid(), estado = "run", lecturas = new[] { new { equipo = "IN-01", variable = "presion", valor = 141.0 } } };
        var a = await (await sim.PostAsJsonAsync("/api/ingesta/plc/PLC-02/telemetria", lote)).Content.ReadFromJsonAsync<JsonElement>();
        var b = await (await sim.PostAsJsonAsync("/api/ingesta/plc/PLC-02/telemetria", lote)).Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(a.GetProperty("repetido").GetBoolean());
        Assert.True(b.GetProperty("repetido").GetBoolean());
        Assert.Equal(0, b.GetProperty("ok").GetInt32());
    }

    [Fact]
    public async Task SiLaTelemetriaInformaElErrorAntesQueElEventoLosEquiposIgualPasanAAlarma()
    {
        var sim = Simulador();
        await sim.PostAsJsonAsync("/api/ingesta/plc/PLC-01/telemetria", new { uid = Uid(), estado = "run" });
        await sim.PostAsJsonAsync("/api/ingesta/plc/PLC-01/telemetria", new { uid = Uid(), estado = "error" });       // primero la telemetría
        var r = await sim.PostAsJsonAsync("/api/ingesta/plc/PLC-01/eventos", new[] { new { uid = Uid(), tipo = "estado_plc", nivel = "alarma", mensaje = "CPU", datos = new { estado = "error" } } });
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var tec = await f.Entrar("tecnico", "Tecnico2026", "app");
        Assert.Equal("alarma", (await f.Leer(tec, "/api/equipos/TC-02")).GetProperty("equipo").GetProperty("estado").GetString());
        Assert.Equal(1, (await f.Leer(tec, "/api/ordenes")).EnumerateArray().Count(o => o.GetProperty("titulo").GetString() == "Falla del controlador PLC-01" && o.GetProperty("estado").GetString() != "cerrada"));
        // una lectura normal informada como «alarma» por el PLC no vuelve el equipo a «operando»
        await sim.PostAsJsonAsync("/api/ingesta/plc/PLC-01/telemetria", new { uid = Uid(), estado = "error", lecturas = new[] { new { equipo = "TC-02", variable = "vibracion", valor = 2.0 } }, equipos = new[] { new { equipo = "TC-02", estado = "alarma" } } });
        Assert.Equal("alarma", (await f.Leer(tec, "/api/equipos/TC-02")).GetProperty("equipo").GetProperty("estado").GetString());
        await sim.PostAsJsonAsync("/api/ingesta/plc/PLC-01/telemetria", new { uid = Uid(), estado = "run", lecturas = new[] { new { equipo = "TC-02", variable = "vibracion", valor = 2.0 } }, equipos = new[] { new { equipo = "TC-02", estado = "operando" } } });
        Assert.Equal("operando", (await f.Leer(tec, "/api/equipos/TC-02")).GetProperty("equipo").GetProperty("estado").GetString());
    }
}
