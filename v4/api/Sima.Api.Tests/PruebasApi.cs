using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ClosedXML.Excel;
using Sima.Api.Datos;
using Sima.Api.Servicios;

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
        var cambio = await (await c.PostAsJsonAsync("/api/auth/cambiar-clave", new { actual = "Sima2026!", nueva = "OtraClave#2026" })).Content.ReadFromJsonAsync<JsonElement>();   // una persona nueva debe elegir su clave
        c.DefaultRequestHeaders.Authorization = new("Bearer", cambio.GetProperty("token").GetString());
        Assert.Equal(HttpStatusCode.OK, (await c.GetAsync("/api/directorio")).StatusCode);

        var baja = await rrhh.PostAsJsonAsync("/api/terminos", new { trabajadorId = id, fechaTermino = "2026-11-21", causal = "Renuncia voluntaria (art. 159 N°2)", avisoPrevio = true, finiquitoMonto = 100000 });
        Assert.Equal(HttpStatusCode.OK, baja.StatusCode);
        Assert.Equal("CERRADA", (await baja.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("estadoCuenta").GetString());

        await Task.Delay(GuardiaDeCuentaEspera);
        Assert.Equal(HttpStatusCode.Unauthorized, (await c.GetAsync("/api/directorio")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await f.CreateClient().PostAsJsonAsync("/api/auth/login", new { correo = "prueba.cierre@manuandina.cl", clave = "OtraClave#2026", canal = "app" })).StatusCode);
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
        Assert.Equal(HttpStatusCode.OK, (await f.CreateClient().PostAsJsonAsync("/api/auth/login", new { correo = "prueba.cierre@manuandina.cl", clave = "OtraClave#2026", canal = "app" })).StatusCode);
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

    async Task<(string id, string correo)> NuevoTrabajador(HttpClient rrhh, string rut, string correo)
    {
        var r = await rrhh.PostAsJsonAsync("/api/trabajadores", Trabajador(rut, correo, NuevoContratoIndef));
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        return ((await r.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetString()!, correo);
    }

    [Fact]
    public async Task ElSegundoFactorSeExigeAlIngresarYNoSePuedeReutilizar()
    {
        var rrhh = await f.Entrar("rrhh", "Rrhh2026", "web");
        var (_, correo) = await NuevoTrabajador(rrhh, "7.654.321-6", "prueba.2fa@manuandina.cl");
        // la clave inicial de una persona nueva debe cambiarse: primero se elige una propia
        var c = f.CreateClient();
        var l = await (await c.PostAsJsonAsync("/api/auth/login", new { correo, clave = "Sima2026!", canal = "app" })).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("clave", l.GetProperty("usuario").GetProperty("restringido").GetString());
        c.DefaultRequestHeaders.Authorization = new("Bearer", l.GetProperty("token").GetString());
        Assert.Equal(HttpStatusCode.Forbidden, (await c.GetAsync("/api/directorio")).StatusCode);              // restringido hasta cambiar la clave
        Assert.Equal(HttpStatusCode.BadRequest, (await c.PostAsJsonAsync("/api/auth/cambiar-clave", new { actual = "Sima2026!", nueva = "Sima2026!" })).StatusCode);
        var cambio = await (await c.PostAsJsonAsync("/api/auth/cambiar-clave", new { actual = "Sima2026!", nueva = "ClaveNueva#2026" })).Content.ReadFromJsonAsync<JsonElement>();
        c.DefaultRequestHeaders.Authorization = new("Bearer", cambio.GetProperty("token").GetString());
        Assert.Equal(HttpStatusCode.OK, (await c.GetAsync("/api/directorio")).StatusCode);

        // activar el segundo factor
        var prep = await (await c.PostAsync("/api/auth/2fa/preparar", null)).Content.ReadFromJsonAsync<JsonElement>();
        var secreto = prep.GetProperty("secreto").GetString()!;
        Assert.StartsWith("otpauth://totp/SIMA:", prep.GetProperty("uri").GetString());
        var paso = Totp.Paso(DateTime.UtcNow);
        Assert.Equal(HttpStatusCode.BadRequest, (await c.PostAsJsonAsync("/api/auth/2fa/activar", new { codigo = "000000" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await c.PostAsJsonAsync("/api/auth/2fa/activar", new { codigo = Totp.Codigo(secreto, paso) })).StatusCode);

        // desde ahora el ingreso pide el código; sin él o con uno malo no entra
        var sin = await f.CreateClient().PostAsJsonAsync("/api/auth/login", new { correo, clave = "ClaveNueva#2026", canal = "app" });
        Assert.Equal(HttpStatusCode.Unauthorized, sin.StatusCode);
        Assert.True((await sin.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("requiere2fa").GetBoolean());
        Assert.Equal(HttpStatusCode.Unauthorized, (await f.CreateClient().PostAsJsonAsync("/api/auth/login", new { correo, clave = "ClaveNueva#2026", canal = "app", codigo = "123456" })).StatusCode);
        // el código de la ventana siguiente es válido una sola vez
        var bueno = Totp.Codigo(secreto, paso + 1);
        Assert.Equal(HttpStatusCode.OK, (await f.CreateClient().PostAsJsonAsync("/api/auth/login", new { correo, clave = "ClaveNueva#2026", canal = "app", codigo = bueno })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await f.CreateClient().PostAsJsonAsync("/api/auth/login", new { correo, clave = "ClaveNueva#2026", canal = "app", codigo = bueno })).StatusCode);

        // si pierde el teléfono, Personas quita el segundo factor
        var id = f.NuevaBd().Trabajadores.First(t => t.CorreoCorporativo == correo).Id;
        Assert.Equal(HttpStatusCode.OK, (await rrhh.PostAsync($"/api/cuentas/{id}/quitar-2fa", null)).StatusCode);
        await Task.Delay(GuardiaDeCuentaEspera);
        Assert.Equal(HttpStatusCode.OK, (await f.CreateClient().PostAsJsonAsync("/api/auth/login", new { correo, clave = "ClaveNueva#2026", canal = "app" })).StatusCode);
    }

    [Fact]
    public async Task ElCodigoTotpCoincideConElVectorDePruebaDelRfc6238()
    {
        // RFC 6238, apéndice B: secreto ASCII «12345678901234567890», SHA-1, T = 59 s → 94287082 (los 6 últimos dígitos: 287082)
        var secreto = Totp.Base32(System.Text.Encoding.ASCII.GetBytes("12345678901234567890"));
        Assert.Equal("287082", Totp.Codigo(secreto, 59 / 30));
        Assert.Equal("081804", Totp.Codigo(secreto, 1111111109 / 30));
        await Task.CompletedTask;
    }

    [Fact]
    public async Task ElRestablecimientoDeClaveObligaAElegirUnaPropia()
    {
        var rrhh = await f.Entrar("rrhh", "Rrhh2026", "web");
        var (id, correo) = await NuevoTrabajador(rrhh, "6.543.210-2", "prueba.reset@manuandina.cl");
        var temporal = (await (await rrhh.PostAsync($"/api/cuentas/{id}/restablecer-clave", null)).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("claveTemporal").GetString()!;
        var l = await (await f.CreateClient().PostAsJsonAsync("/api/auth/login", new { correo, clave = temporal, canal = "app" })).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("clave", l.GetProperty("usuario").GetProperty("restringido").GetString());
    }

    // ---------------------------------------------------------------------------------------- módulos de operación
    static JsonElement Buscar(JsonElement lista, string campo, string valor) => lista.EnumerateArray().First(x => x.GetProperty(campo).GetString() == valor);

    [Fact]
    public async Task LasHerramientasConCalibracionVencidaNoSePuedenRetirar()
    {
        var op = await f.Entrar("operador", "Operador2026", "app");
        var lista = await f.Leer(op, "/api/herramientas");
        var micro = Buscar(lista, "nombre", "Micrómetro");
        Assert.Equal("VENCIDA", micro.GetProperty("calibracion").GetString());
        var r = await op.PostAsync($"/api/herramientas/{micro.GetProperty("id").GetInt32()}/retirar", null);
        Assert.Equal(HttpStatusCode.Conflict, r.StatusCode);
        Assert.Contains("calibración", await r.Content.ReadAsStringAsync());

        var llaves = Buscar(lista, "nombre", "Llaves Allen y Torx").GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.OK, (await op.PostAsync($"/api/herramientas/{llaves}/retirar", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await op.PostAsync($"/api/herramientas/{llaves}/retirar", null)).StatusCode);
        var tec = await f.Entrar("tecnico", "Tecnico2026", "app");
        Assert.Equal(HttpStatusCode.Forbidden, (await tec.PostAsync($"/api/herramientas/{llaves}/devolver", null)).StatusCode);   // solo quien la retiró o el pañol
        Assert.Equal(HttpStatusCode.OK, (await op.PostAsync($"/api/herramientas/{llaves}/devolver", null)).StatusCode);

        // instrumentación calibra y desde ese momento se puede retirar
        var ins = await f.Entrar("instrumentacion", "Instrumentacion2026", "app");
        Assert.Equal(HttpStatusCode.Forbidden, (await op.PostAsync($"/api/herramientas/{micro.GetProperty("id").GetInt32()}/calibrar", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await ins.PostAsync($"/api/herramientas/{micro.GetProperty("id").GetInt32()}/calibrar", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await op.PostAsync($"/api/herramientas/{micro.GetProperty("id").GetInt32()}/retirar", null)).StatusCode);
    }

    [Fact]
    public async Task ElStockDeRepuestosSeMuevePorPerfilYNoQuedaNegativo()
    {
        var tec = await f.Entrar("tecnico", "Tecnico2026", "app");
        var rp = Buscar(await f.Leer(tec, "/api/repuestos"), "codigo", "RP-001");
        var id = rp.GetProperty("id").GetInt32(); var stock = rp.GetProperty("stock").GetInt32();
        Assert.Equal(HttpStatusCode.BadRequest, (await tec.PostAsJsonAsync($"/api/repuestos/{id}/movimiento", new { cantidad = -2, nota = "sin orden" })).StatusCode);   // todo egreso va con OT
        var ot = (await f.Leer(tec, "/api/ordenes")).EnumerateArray().First().GetProperty("id").GetInt32();
        var ok = await tec.PostAsJsonAsync($"/api/repuestos/{id}/movimiento", new { cantidad = -2, ordenId = ot, nota = "cambio de rodamiento" });
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        Assert.Equal(stock - 2, (await ok.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("stock").GetInt32());
        Assert.Equal(HttpStatusCode.Conflict, (await tec.PostAsJsonAsync($"/api/repuestos/{id}/movimiento", new { cantidad = -999, ordenId = ot })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await tec.PostAsJsonAsync($"/api/repuestos/{id}/movimiento", new { cantidad = 5 })).StatusCode);      // ingresar es del pañol
        var op = await f.Entrar("operador", "Operador2026", "app");
        Assert.Equal(HttpStatusCode.Forbidden, (await op.PostAsJsonAsync($"/api/repuestos/{id}/movimiento", new { cantidad = -1, ordenId = ot })).StatusCode);
        var pan = await f.Entrar("panol", "Panol2026", "app");
        Assert.Equal(HttpStatusCode.OK, (await pan.PostAsJsonAsync($"/api/repuestos/{id}/movimiento", new { cantidad = 2 })).StatusCode);
        Assert.Equal(stock, Buscar(await f.Leer(pan, "/api/repuestos"), "codigo", "RP-001").GetProperty("stock").GetInt32());
        Assert.Contains((await f.Leer(pan, "/api/repuestos")).EnumerateArray(), x => x.GetProperty("bajoMinimo").GetBoolean());
    }

    [Fact]
    public async Task LogisticaCreaYAvanzaDespachosYLosDemasNoLosVen()
    {
        var log = await f.Entrar("logistica", "Logistica2026", "web");
        var c = await log.PostAsJsonAsync("/api/despachos", new { destino = "Cliente Arica", carga = "Prueba, 1 pallet", vehiculo = "Camioneta", conductor = "Ana Vera", compromiso = DateTime.UtcNow.AddDays(2) });
        Assert.Equal(HttpStatusCode.Created, c.StatusCode);
        var id = (await c.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        Assert.Equal("en_ruta", (await (await log.PostAsync($"/api/despachos/{id}/avanzar", null)).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("estado").GetString());
        Assert.Equal("entregado", (await (await log.PostAsync($"/api/despachos/{id}/avanzar", null)).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("estado").GetString());
        Assert.Equal(HttpStatusCode.Conflict, (await log.PostAsync($"/api/despachos/{id}/avanzar", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await (await f.Entrar("tecnico", "Tecnico2026", "app")).GetAsync("/api/despachos")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await (await f.Entrar("gerencia", "Gerencia2026", "web")).PostAsync($"/api/despachos/{id}/avanzar", null)).StatusCode);
    }

    [Fact]
    public async Task UnaRutinaConHallazgosCreaUnaOrdenYElReenvioNoDuplica()
    {
        var op = await f.Entrar("operador", "Operador2026", "app");
        var rut = await f.Leer(op, "/api/rutinas");
        var turno = Buscar(rut.GetProperty("plantillas"), "frecuencia", "turno");
        var items = turno.GetProperty("items").EnumerateArray().Select(x => x.GetString()!).ToList();
        var cuerpo = new { uid = "prueba-rutina-1", equipo = "TC-01", observaciones = "", resultados = items.Select((t, i) => new { item = t, ok = i != 0, nota = i == 0 ? "ruido en el husillo" : null }).ToList() };
        var r1 = await (await op.PostAsJsonAsync($"/api/rutinas/{turno.GetProperty("id").GetInt32()}/ejecutar", cuerpo)).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, r1.GetProperty("hallazgos").GetInt32());
        Assert.StartsWith("OT-", r1.GetProperty("orden").GetString());
        var r2 = await (await op.PostAsJsonAsync($"/api/rutinas/{turno.GetProperty("id").GetInt32()}/ejecutar", cuerpo)).Content.ReadFromJsonAsync<JsonElement>();   // mismo envío
        Assert.True(r2.GetProperty("repetida").GetBoolean());
        var fila = (await f.Leer(op, "/api/rutinas")).GetProperty("filas").EnumerateArray().First(x => x.GetProperty("equipo").GetString() == "TC-01" && x.GetProperty("frecuencia").GetString() == "turno");
        Assert.False(fila.GetProperty("vencida").GetBoolean());
        Assert.True(fila.GetProperty("ultima").GetProperty("conHallazgos").GetBoolean());
        // la rutina trimestral es de personal autorizado
        var trim = Buscar(rut.GetProperty("plantillas"), "frecuencia", "trimestral");
        var malo = await op.PostAsJsonAsync($"/api/rutinas/{trim.GetProperty("id").GetInt32()}/ejecutar", new { equipo = "TC-01", resultados = new[] { new { item = "a", ok = true }, new { item = "b", ok = true } } });
        Assert.Equal(HttpStatusCode.Forbidden, malo.StatusCode);
        // un reporte con lista incompleta se rechaza
        Assert.Equal(HttpStatusCode.BadRequest, (await op.PostAsJsonAsync($"/api/rutinas/{turno.GetProperty("id").GetInt32()}/ejecutar", new { equipo = "TC-02", resultados = new[] { new { item = "a", ok = true } } })).StatusCode);
    }

    [Fact]
    public async Task ElTraspasoDeTurnoSeArmaConElEstadoDeLaPlantaYSoloLoHacenLasJefaturas()
    {
        var sup = await f.Entrar("supervisor.turno", "Supervisor2026", "app");
        var b = await f.Leer(sup, "/api/traspaso/borrador");
        Assert.Equal(6, b.GetProperty("items").GetArrayLength());
        Assert.True(b.TryGetProperty("equiposFuera", out _) && b.TryGetProperty("repuestosCriticos", out var crit) && crit.GetArrayLength() > 0);
        Assert.Equal(HttpStatusCode.BadRequest, (await sup.PostAsJsonAsync("/api/traspaso", new { revisiones = new[] { true }, notas = "" })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await sup.PostAsJsonAsync("/api/traspaso", new { revisiones = new[] { true, true, true, true, false, true }, notas = "Vigilar CP-01" })).StatusCode);
        Assert.True((await f.Leer(sup, "/api/traspaso")).GetArrayLength() >= 1);
        Assert.Equal(HttpStatusCode.Forbidden, (await (await f.Entrar("operador", "Operador2026", "app")).GetAsync("/api/traspaso/borrador")).StatusCode);
    }

    [Fact]
    public async Task LosIndicadoresSeCalculanConDatosYLasParadasSeRegistranSolas()
    {
        var ger = await f.Entrar("gerencia", "Gerencia2026", "web");
        var k = await f.Leer(ger, "/api/kpis?dias=30");
        Assert.Equal(10, k.GetProperty("kpis").GetArrayLength());
        var oee = Buscar(k.GetProperty("kpis"), "clave", "oee");
        Assert.InRange(oee.GetProperty("valor").GetDouble(), 40, 100);
        Assert.NotEqual("sin datos", Buscar(k.GetProperty("kpis"), "clave", "mttr").GetProperty("estado").GetString());
        Assert.Equal("sin datos", Buscar(k.GetProperty("kpis"), "clave", "costo_unitario").GetProperty("estado").GetString());   // no se inventa
        Assert.Equal(15, k.GetProperty("equipos").GetArrayLength());
        Assert.Equal(HttpStatusCode.Forbidden, (await (await f.Entrar("operador", "Operador2026", "app")).GetAsync("/api/kpis")).StatusCode);

        // una alarma detiene el equipo: se abre una parada, y al normalizarse se cierra
        var c = f.CreateClient(); c.DefaultRequestHeaders.Add("X-API-Key", "clave-de-prueba");
        await c.PostAsJsonAsync("/api/ingesta/plc/PLC-03/telemetria", new { estado = "run", lecturas = new[] { new { equipo = "EV-01", variable = "temp_sellado", valor = 215.0 } }, equipos = new[] { new { equipo = "EV-01", estado = "operando" } } });
        var db = f.NuevaBd(); var ev = db.Equipos.First(e => e.Codigo == "EV-01");
        Assert.Single(db.Paradas.Where(p => p.EquipoId == ev.Id && p.Fin == null));
        await c.PostAsJsonAsync("/api/ingesta/plc/PLC-03/telemetria", new { estado = "run", lecturas = new[] { new { equipo = "EV-01", variable = "temp_sellado", valor = 160.0 } }, equipos = new[] { new { equipo = "EV-01", estado = "operando" } } });
        Assert.Empty(f.NuevaBd().Paradas.Where(p => p.EquipoId == ev.Id && p.Fin == null));
    }

    [Fact]
    public async Task ReenviarUnaFallaConElMismoIdentificadorNoCreaOtraOrden()
    {
        var op = await f.Entrar("operador", "Operador2026", "app");
        var cuerpo = new { equipo = "TC-02", titulo = "Prueba de reenvío sin conexión", prioridad = "media", uid = "uid-prueba-ordenes-1" };
        Assert.Equal(HttpStatusCode.Created, (await op.PostAsJsonAsync("/api/ordenes", cuerpo)).StatusCode);
        var otra = await op.PostAsJsonAsync("/api/ordenes", cuerpo);                      // la app reenvía porque no vio la respuesta
        Assert.Equal(HttpStatusCode.OK, otra.StatusCode);
        Assert.True((await otra.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("repetida").GetBoolean());
        Assert.Equal(1, (await f.Leer(op, "/api/ordenes")).EnumerateArray().Count(o => o.GetProperty("titulo").GetString() == "Prueba de reenvío sin conexión"));
    }
}
