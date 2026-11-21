using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ClosedXML.Excel;
using Sima.Api.Datos;

namespace Sima.Api.Tests;

[Collection("api")]
public class PruebasApi(Fabrica f)
{
    static readonly object NuevoContratoIndef = new { tipo = "Indefinido", fechaInicio = "2026-09-01", fechaTermino = (string?)null, sueldoBase = 900000, colacion = 50000, movilizacion = 40000, jornadaHoras = 42 };

    static object Trabajador(string rut, string correo, object contrato, int cargoId = 10) => new
    {
        rut, nombres = "Prueba", apellidoPaterno = "Automática", apellidoMaterno = "Test", sexo = "F", fechaNacimiento = "1995-04-12", cargoId, turno = "A", correoCorporativo = correo, contrato, afp = "Modelo", sistemaSalud = "Fonasa",
    };

    [Fact]
    public async Task ImportaElExcelCompleto()
    {
        var rrhh = await f.Entrar("rrhh", "Rrhh2026", "web");
        // (otras pruebas crean trabajadores nuevos: se cuentan solo los del Excel, T001 a T104)
        var t = (await f.Leer(rrhh, "/api/trabajadores")).EnumerateArray().Where(x => int.Parse(x.GetProperty("id").GetString()![1..]) <= 104).ToList();
        Assert.Equal(104, t.Count);
        Assert.Equal(99, t.Count(x => x.GetProperty("estadoCuenta").GetString() == "ACTIVA"));
        Assert.Equal(5, t.Count(x => x.GetProperty("estadoCuenta").GetString() == "CERRADA"));
        var cargos = await f.Leer(rrhh, "/api/cargos");
        Assert.Equal(64, cargos.GetArrayLength());
        Assert.All(cargos.EnumerateArray(), c => Assert.True(c.GetProperty("dotacionActual").GetInt32() >= 1, "todos los cargos tienen al menos una persona activa"));
        var equipos = await f.Leer(rrhh, "/api/equipos");
        Assert.Equal(15, equipos.GetArrayLength());
        Assert.Equal(4, (await f.Leer(await f.Entrar("gerencia", "Gerencia2026", "web"), "/api/plc")).GetArrayLength());
    }

    [Fact]
    public async Task LoginRespetaClaveCanalYEstadoDeCuenta()
    {
        var c = f.CreateClient();
        Task<HttpStatusCode> Login(string u, string clave, string canal) => c.PostAsJsonAsync("/api/auth/login", new { correo = u + "@manuandina.cl", clave, canal }).ContinueWith(r => r.Result.StatusCode);
        Assert.Equal(HttpStatusCode.OK, await Login("rrhh", "Rrhh2026", "web"));
        Assert.Equal(HttpStatusCode.Forbidden, await Login("rrhh", "Rrhh2026", "app"));
        Assert.Equal(HttpStatusCode.Forbidden, await Login("operador", "Operador2026", "web"));
        Assert.Equal(HttpStatusCode.Unauthorized, await Login("operador", "mala", "app"));
        Assert.Equal(HttpStatusCode.Unauthorized, await Login("nadie", "x", "app"));
        // un desvinculado del Excel no puede entrar aunque tenga la clave inicial
        var db = f.NuevaBd();
        var ex = db.Trabajadores.First(t => t.Id == "T100");
        var r = await c.PostAsJsonAsync("/api/auth/login", new { correo = ex.CorreoCorporativo, clave = "Sima2026!", canal = "app" });
        Assert.Equal(HttpStatusCode.Forbidden, r.StatusCode);
        Assert.Contains("cerrada", await r.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task BloqueaLaCuentaTrasCincoIntentos()
    {
        var c = f.CreateClient();
        for (var i = 0; i < 5; i++) await c.PostAsJsonAsync("/api/auth/login", new { correo = "panol@manuandina.cl", clave = "mala", canal = "app" });
        var r = await c.PostAsJsonAsync("/api/auth/login", new { correo = "panol@manuandina.cl", clave = "Panol2026", canal = "app" });
        Assert.Equal((HttpStatusCode)429, r.StatusCode);
        var rrhh = await f.Entrar("rrhh", "Rrhh2026", "web");
        Assert.Equal(HttpStatusCode.OK, (await rrhh.PostAsync("/api/cuentas/" + f.NuevaBd().Trabajadores.First(t => t.LoginAlias == "panol@manuandina.cl").Id + "/desbloquear", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await c.PostAsJsonAsync("/api/auth/login", new { correo = "panol@manuandina.cl", clave = "Panol2026", canal = "app" })).StatusCode);
    }

    [Fact]
    public async Task LosPermisosSeValidanEnElServidor()
    {
        var op = await f.Entrar("operador", "Operador2026", "app");
        Assert.Equal(HttpStatusCode.Forbidden, (await op.GetAsync("/api/trabajadores")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await op.GetAsync("/api/remuneraciones")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await op.GetAsync("/api/contratos")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await op.GetAsync("/api/directorio")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await op.GetAsync("/api/yo/habilitaciones")).StatusCode);
        var fin = await f.Entrar("finanzas", "Finanzas2026", "web");
        Assert.Equal(HttpStatusCode.OK, (await fin.GetAsync("/api/remuneraciones")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await fin.PostAsJsonAsync("/api/terminos", new { trabajadorId = "T001", fechaTermino = "2026-12-01", causal = "x", avisoPrevio = false, finiquitoMonto = 0 })).StatusCode);
        var rrhh = await f.Entrar("rrhh", "Rrhh2026", "web");
        Assert.Equal(HttpStatusCode.Forbidden, (await rrhh.PutAsJsonAsync("/api/parametros/imm", new { valor = 600000 })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await fin.PutAsJsonAsync("/api/parametros/imm", new { valor = 539000 })).StatusCode);
        var sinToken = f.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await sinToken.GetAsync("/api/directorio")).StatusCode);
    }

    [Fact]
    public async Task DesvincularCierraLaCuentaYRevocaLaSesion()
    {
        var rrhh = await f.Entrar("rrhh", "Rrhh2026", "web");
        var alta = await rrhh.PostAsJsonAsync("/api/trabajadores", Trabajador("12.345.678-5", "prueba.cierre@manuandina.cl", NuevoContratoIndef));
        Assert.True(alta.StatusCode == HttpStatusCode.Created, await alta.Content.ReadAsStringAsync());
        var id = (await alta.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;
        var c = f.CreateClient();
        var login = await c.PostAsJsonAsync("/api/auth/login", new { correo = "prueba.cierre@manuandina.cl", clave = "Sima2026!", canal = "app" });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        c.DefaultRequestHeaders.Authorization = new("Bearer", (await login.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString());
        Assert.Equal(HttpStatusCode.OK, (await c.GetAsync("/api/directorio")).StatusCode);

        var baja = await rrhh.PostAsJsonAsync("/api/terminos", new { trabajadorId = id, fechaTermino = "2026-11-21", causal = "Renuncia voluntaria (art. 159 N°2)", avisoPrevio = true, finiquitoMonto = 100000 });
        Assert.Equal(HttpStatusCode.OK, baja.StatusCode);
        Assert.Equal("CERRADA", (await baja.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("estadoCuenta").GetString());

        await Task.Delay(GuardiaDeCuentaEspera);
        Assert.Equal(HttpStatusCode.Unauthorized, (await c.GetAsync("/api/directorio")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await f.CreateClient().PostAsJsonAsync("/api/auth/login", new { correo = "prueba.cierre@manuandina.cl", clave = "Sima2026!", canal = "app" })).StatusCode);
        var detalle = await f.Leer(rrhh, "/api/trabajadores/" + id);
        Assert.Equal("Desvinculado", detalle.GetProperty("resumen").GetProperty("estadoLaboral").GetString());
        Assert.False(detalle.GetProperty("cuenta").GetProperty("accesoApp").GetBoolean());

        // la desvinculación queda en la auditoría y puede corregirse
        var aud = await f.Leer(rrhh, "/api/auditoria");
        Assert.Contains(aud.GetProperty("items").EnumerateArray(), a => a.GetProperty("accion").GetString()!.Contains("desvinculación") && a.GetProperty("entidadId").GetString() == id);
        var terminos = await f.Leer(rrhh, "/api/terminos");
        var tid = terminos.EnumerateArray().First(t => t.GetProperty("trabajadorId").GetString() == id).GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.OK, (await rrhh.DeleteAsync("/api/terminos/" + tid)).StatusCode);
        await Task.Delay(GuardiaDeCuentaEspera);
        Assert.Equal(HttpStatusCode.OK, (await f.CreateClient().PostAsJsonAsync("/api/auth/login", new { correo = "prueba.cierre@manuandina.cl", clave = "Sima2026!", canal = "app" })).StatusCode);
    }

    static readonly TimeSpan GuardiaDeCuentaEspera = Servicios.GuardiaDeCuenta.Vigencia + TimeSpan.FromMilliseconds(500);

    [Fact]
    public async Task UnContratoVencidoSuspendeLaCuentaHastaRenovar()
    {
        var rrhh = await f.Entrar("rrhh", "Rrhh2026", "web");
        var plazo = new { tipo = "Plazo fijo", fechaInicio = "2026-05-01", fechaTermino = "2026-11-20", sueldoBase = 700000, colacion = 0, movilizacion = 0, jornadaHoras = 42 };
        var alta = await rrhh.PostAsJsonAsync("/api/trabajadores", Trabajador("11.111.111-1", "prueba.plazo@manuandina.cl", plazo));
        Assert.True(alta.StatusCode == HttpStatusCode.Created, await alta.Content.ReadAsStringAsync());
        var id = (await alta.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!;
        var r = await f.CreateClient().PostAsJsonAsync("/api/auth/login", new { correo = "prueba.plazo@manuandina.cl", clave = "Sima2026!", canal = "app" });
        Assert.Equal(HttpStatusCode.Forbidden, r.StatusCode);
        Assert.Contains("suspendida", await r.Content.ReadAsStringAsync());

        var renov = await rrhh.PostAsJsonAsync("/api/contratos", new { trabajadorId = id, tipo = "Indefinido", fechaInicio = "2026-11-21", fechaTermino = (string?)null, sueldoBase = 750000, colacion = 0, movilizacion = 0 });
        Assert.Equal(HttpStatusCode.Created, renov.StatusCode);
        await Task.Delay(GuardiaDeCuentaEspera);
        Assert.Equal(HttpStatusCode.OK, (await f.CreateClient().PostAsJsonAsync("/api/auth/login", new { correo = "prueba.plazo@manuandina.cl", clave = "Sima2026!", canal = "app" })).StatusCode);
        var contratos = (await f.Leer(rrhh, "/api/trabajadores/" + id)).GetProperty("contratos");
        Assert.Equal(1, contratos.EnumerateArray().Count(x => x.GetProperty("esActual").GetBoolean()));
    }

    [Fact]
    public async Task ValidaRutCorreoYContratoAlCrearTrabajadores()
    {
        var rrhh = await f.Entrar("rrhh", "Rrhh2026", "web");
        Assert.Equal(HttpStatusCode.BadRequest, (await rrhh.PostAsJsonAsync("/api/trabajadores", Trabajador("12.345.678-9", "x1@manuandina.cl", NuevoContratoIndef))).StatusCode);
        var rutExistente = f.NuevaBd().Trabajadores.First().Rut;
        Assert.Equal(HttpStatusCode.Conflict, (await rrhh.PostAsJsonAsync("/api/trabajadores", Trabajador(rutExistente, "x2@manuandina.cl", NuevoContratoIndef))).StatusCode);
        var malContrato = new { tipo = "Plazo fijo", fechaInicio = "2026-09-01", fechaTermino = (string?)null, sueldoBase = 800000, colacion = 0, movilizacion = 0 };
        Assert.Equal(HttpStatusCode.BadRequest, (await rrhh.PostAsJsonAsync("/api/trabajadores", Trabajador("9.999.999-3", "x3@manuandina.cl", malContrato))).StatusCode);
        var gerencia = await f.Entrar("gerencia", "Gerencia2026", "web");
        Assert.Equal(HttpStatusCode.Forbidden, (await gerencia.PostAsJsonAsync("/api/trabajadores", Trabajador("8.888.888-8", "x4@manuandina.cl", NuevoContratoIndef))).StatusCode);
    }

    [Fact]
    public async Task LasLiquidacionesCoincidenConLasFormulasDelExcel()
    {
        var fin = await f.Entrar("finanzas", "Finanzas2026", "web");
        using var wb = new XLWorkbook(Fabrica.Excel);
        var ws = wb.Worksheet("Remuneraciones");
        var cab = ws.Row(1).CellsUsed().ToDictionary(x => x.GetString(), x => x.Address.ColumnNumber);
        double V(IXLRow r, string k) => r.Cell(cab[k]).CachedValue.GetNumber();
        var esperado = new List<(string periodo, string id, double[] v)>();
        for (var r = 2; !ws.Row(r).Cell(1).IsEmpty(); r++)
        {
            var fila = ws.Row(r);
            esperado.Add((fila.Cell(cab["periodo"]).GetString(), fila.Cell(cab["id_trabajador"]).GetString(),
                new[] { V(fila, "total_imponible"), V(fila, "gratificacion"), V(fila, "descuento_afp"), V(fila, "descuento_salud"), V(fila, "seguro_cesantia"), V(fila, "impuesto_unico"), V(fila, "retencion_honorarios"), V(fila, "total_descuentos"), V(fila, "liquido_a_pagar") }));
        }
        Assert.Equal(296, esperado.Count);
        foreach (var grupo in esperado.GroupBy(e => e.periodo))
        {
            var resp = await f.Leer(fin, "/api/remuneraciones?periodo=" + grupo.Key);
            var calc = resp.GetProperty("liquidaciones").EnumerateArray().ToDictionary(x => x.GetProperty("idTrabajador").GetString()!);
            Assert.Equal(grupo.Count(), calc.Count);
            foreach (var (_, id, v) in grupo)
            {
                var l = calc[id];
                var obtenido = new[] { "totalImponible", "gratificacion", "descuentoAfp", "descuentoSalud", "seguroCesantia", "impuestoUnico", "retencionHonorarios", "totalDescuentos", "liquidoAPagar" }.Select(k => l.GetProperty(k).GetDouble()).ToArray();
                for (var i = 0; i < v.Length; i++) Assert.True(Math.Abs(v[i] - obtenido[i]) <= 1, $"{grupo.Key} {id} columna {i}: Excel {v[i]} ≠ API {obtenido[i]}");
            }
        }
    }

    [Fact]
    public async Task LaTelemetriaAbreAlarmasOrdenesAutomaticasYLasCierra()
    {
        var c = f.CreateClient();
        c.DefaultRequestHeaders.Add("X-API-Key", "clave-de-prueba");
        var malaClave = f.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await malaClave.PostAsJsonAsync("/api/ingesta/plc/PLC-04/telemetria", new { estado = "run" })).StatusCode);

        var cfg = await c.GetFromJsonAsync<JsonElement>("/api/ingesta/plc/PLC-04/config");
        Assert.Equal(2, cfg.GetProperty("equipos").GetArrayLength());
        Assert.True(cfg.GetProperty("programa").GetProperty("peldanos").GetArrayLength() >= 14);

        var r = await c.PostAsJsonAsync("/api/ingesta/plc/PLC-04/telemetria", new
        {
            estado = "run", lecturas = new[] { new { equipo = "CP-01", variable = "temp_descarga", valor = 118.0 }, new { equipo = "CP-01", variable = "presion", valor = 8.0 } }, equipos = new[] { new { equipo = "CP-01", estado = "operando" } },
            io = new Dictionary<string, double> { ["CP01_CONTACTOR"] = 1 },
        });
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var tec = await f.Entrar("tecnico", "Tecnico2026", "app");
        var eq = (await f.Leer(tec, "/api/equipos")).EnumerateArray().First(e => e.GetProperty("codigo").GetString() == "CP-01");
        Assert.Equal("alarma", eq.GetProperty("estado").GetString());
        var alarmas = await f.Leer(tec, "/api/alarmas?abiertas=true");
        Assert.Contains(alarmas.EnumerateArray(), a => a.GetProperty("equipo").GetString() == "CP-01" && a.GetProperty("nivel").GetString() == "alarma");
        var ordenes = await f.Leer(tec, "/api/ordenes?estado=abierta");
        var ot = ordenes.EnumerateArray().First(o => o.GetProperty("equipo").GetString() == "CP-01" && o.GetProperty("automatica").GetBoolean());
        var otId = ot.GetProperty("id").GetInt32();

        // el PLC aparece conectado y con su imagen de E/S
        var plc = await f.Leer(await f.Entrar("automatizacion", "Automatizacion2026", "app"), "/api/plc/PLC-04");
        Assert.Equal("run", plc.GetProperty("estado").GetString());
        Assert.Equal(1, plc.GetProperty("io").GetProperty("CP01_CONTACTOR").GetDouble());

        // bloqueo y etiquetado obligatorio, y solo mantenimiento puede tomar la orden
        Assert.Equal(HttpStatusCode.BadRequest, (await tec.PostAsJsonAsync($"/api/ordenes/{otId}/tomar", new { lotoConfirmado = false })).StatusCode);
        var op = await f.Entrar("operador", "Operador2026", "app");
        Assert.Equal(HttpStatusCode.Forbidden, (await op.PostAsJsonAsync($"/api/ordenes/{otId}/tomar", new { lotoConfirmado = true })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await tec.PostAsJsonAsync($"/api/ordenes/{otId}/tomar", new { lotoConfirmado = true })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await tec.PostAsJsonAsync($"/api/ordenes/{otId}/cerrar", new { nota = "ok", lotoRetirado = false })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await tec.PostAsJsonAsync($"/api/ordenes/{otId}/cerrar", new { nota = "Se limpió el intercambiador", lotoRetirado = true })).StatusCode);

        // al volver a rango la alarma se cierra; la orden de cierre dejó un comando de reparación para el PLC
        var vuelta = await c.PostAsJsonAsync("/api/ingesta/plc/PLC-04/telemetria", new { estado = "run", lecturas = new[] { new { equipo = "CP-01", variable = "temp_descarga", valor = 85.0 } }, equipos = new[] { new { equipo = "CP-01", estado = "operando" } } });
        Assert.DoesNotContain((await f.Leer(tec, "/api/alarmas?abiertas=true")).EnumerateArray(), a => a.GetProperty("equipo").GetString() == "CP-01");
        eq = (await f.Leer(tec, "/api/equipos")).EnumerateArray().First(e => e.GetProperty("codigo").GetString() == "CP-01");
        Assert.Equal("operando", eq.GetProperty("estado").GetString());
        var comandos = (await vuelta.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("comandos");
        Assert.Contains(comandos.EnumerateArray(), x => x.GetProperty("tag").GetString() == "CP01_REPARAR");
    }

    [Fact]
    public async Task LaWebPuedeEnviarOrdenesAlPlcSoloSiEstaConectado()
    {
        var aut = await f.Entrar("automatizacion", "Automatizacion2026", "app");
        var k = f.CreateClient(); k.DefaultRequestHeaders.Add("X-API-Key", "clave-de-prueba");
        var antes = await aut.PostAsJsonAsync("/api/plc/PLC-02/comandos", new { tag = "IN01_MARCHA", valor = 1 });
        Assert.Equal(HttpStatusCode.Conflict, antes.StatusCode);
        await k.PostAsJsonAsync("/api/ingesta/plc/PLC-02/telemetria", new { estado = "run" });
        Assert.Equal(HttpStatusCode.OK, (await aut.PostAsJsonAsync("/api/plc/PLC-02/comandos", new { tag = "IN01_MARCHA", valor = 1 })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await aut.PostAsJsonAsync("/api/plc/PLC-02/comandos", new { tag = "NO_EXISTE", valor = 1 })).StatusCode);
        var resp = await k.PostAsJsonAsync("/api/ingesta/plc/PLC-02/telemetria", new { estado = "run" });
        Assert.Contains((await resp.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("comandos").EnumerateArray(), x => x.GetProperty("tag").GetString() == "IN01_MARCHA");
        var op = await f.Entrar("operador", "Operador2026", "app");
        Assert.Equal(HttpStatusCode.Forbidden, (await op.PostAsJsonAsync("/api/plc/PLC-02/comandos", new { tag = "IN01_MARCHA", valor = 1 })).StatusCode);
    }
}
