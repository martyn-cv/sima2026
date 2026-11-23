using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Sima.Api.Servicios;

namespace Sima.Api.Tests;

/// <summary>
/// Fase 1 del análisis de los 64 cargos (docs/analisis): permisos por id_cargo, consultas de planta con mínimo privilegio y
/// el flujo A completo (asignación respetada, LOTO vigente, verificación por otra persona, liberación sin marcha automática).
/// </summary>
[Collection("api")]
public class PruebasFase1(Fabrica f)
{
    HttpClient Simulador() { var c = f.CreateClient(); c.DefaultRequestHeaders.Add("X-API-Key", "clave-de-prueba"); return c; }
    static string Uid() => Guid.NewGuid().ToString("N");

    // ---------------------------------------------------------------------------------------- matriz por cargo
    [Fact]
    public void LaMatrizDeFabricaSeDefinePorCargoYNoPorPerfil()
    {
        Assert.Equal(64, PermisosCatalogo.PorCargo.Count);
        // mismo perfil (supervisor_turno), distinto trabajo: el líder de línea no ve la asistencia del equipo
        Assert.Equal("equipo", Permisos.DeFabrica(7, "supervisor_turno")["asistencia.ver"]);
        Assert.False(Permisos.DeFabrica(8, "supervisor_turno").ContainsKey("asistencia.ver"));
        // mismo perfil (finanzas_adm): soporte TI administra cuentas pero no ve pagos ni datos sensibles
        var ti = Permisos.DeFabrica(59, "finanzas_adm");
        Assert.True(ti.ContainsKey("cuentas.editar"));
        Assert.DoesNotContain(ti.Keys, k => k.StartsWith("remuneraciones") || k == "personal.sensibles" || k == "personal.ver");
        Assert.True(Permisos.DeFabrica(55, "finanzas_adm").ContainsKey("remuneraciones.aprobar"));
        // nadie de RR. HH. recibe herramientas técnicas de planta
        foreach (var c in new[] { 44, 45, 46, 47, 48, 49 })
            Assert.DoesNotContain(Permisos.DeFabrica(c, "rrhh").Keys, k => k.StartsWith("ordenes") || k.StartsWith("planta") || k.StartsWith("repuestos") || k.StartsWith("plc"));
        // el planificador asigna, pero no firma la ejecución; el técnico ejecuta, pero no asigna
        Assert.True(Permisos.DeFabrica(24, "jefe_mant").ContainsKey("ordenes.asignar"));
        Assert.False(Permisos.DeFabrica(24, "jefe_mant").ContainsKey("ordenes.ejecutar"));
        Assert.False(Permisos.DeFabrica(26, "tecnico").ContainsKey("ordenes.asignar"));
        // todos pueden reportar una condición insegura
        Assert.All(Enumerable.Range(1, 64), c => Assert.True(Permisos.DeFabrica(c, "").ContainsKey("sst.reportar")));
    }

    [Fact]
    public async Task LasConsultasDePlantaYOtExigenSuPermiso()
    {
        var rrhh = await f.Entrar("rrhh", "Rrhh2026", "web");
        foreach (var url in new[] { "/api/equipos", "/api/estructura", "/api/eventos", "/api/alarmas", "/api/ordenes", "/api/repuestos", "/api/herramientas", "/api/operacion/resumen", "/api/equipos/BC-01" })
            Assert.Equal(HttpStatusCode.Forbidden, (await rrhh.GetAsync(url)).StatusCode);
        var fin = await f.Entrar("finanzas", "Finanzas2026", "web");
        Assert.Equal(HttpStatusCode.Forbidden, (await fin.GetAsync("/api/ordenes")).StatusCode);
        // la gerencia de planta sí ve la planta
        Assert.Equal(HttpStatusCode.OK, (await (await f.Entrar("gerencia", "Gerencia2026", "web")).GetAsync("/api/estructura")).StatusCode);
    }

    [Fact]
    public async Task ReconocerAlarmasEsDeQuienLasAtiende()
    {
        var sim = Simulador();
        await sim.PostAsJsonAsync("/api/ingesta/plc/PLC-04/telemetria", new { estado = "run", lecturas = new[] { new { equipo = "CP-01", variable = "temp_descarga", valor = 121.0 } } });
        var sup = await f.Entrar("supervisor.turno", "Supervisor2026", "app");
        var alarma = (await f.Leer(sup, "/api/alarmas?abiertas=true")).EnumerateArray().First(a => a.GetProperty("equipo").GetString() == "CP-01");
        var id = alarma.GetProperty("id").GetInt32();
        Assert.True(alarma.GetProperty("simulado").GetBoolean());
        var op = await f.Entrar("operador", "Operador2026", "app");
        Assert.Equal(HttpStatusCode.Forbidden, (await op.PostAsync($"/api/alarmas/{id}/reconocer", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await sup.PostAsync($"/api/alarmas/{id}/reconocer", null)).StatusCode);
        await sim.PostAsJsonAsync("/api/ingesta/plc/PLC-04/telemetria", new { estado = "run", lecturas = new[] { new { equipo = "CP-01", variable = "temp_descarga", valor = 84.0 } } });
    }

    [Fact]
    public async Task ElOperadorVeSoloSusAvisosDeFalla()
    {
        var op = await f.Entrar("operador", "Operador2026", "app");
        Assert.Equal(HttpStatusCode.Forbidden, (await op.GetAsync("/api/repuestos")).StatusCode);   // el pañol no es parte de su trabajo
        var r = await op.PostAsJsonAsync("/api/ordenes", new { equipo = "TC-01", titulo = "Ruido en el husillo al arrancar", prioridad = "media", uid = Uid() });
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var propia = (await r.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        var mias = (await f.Leer(op, "/api/ordenes")).EnumerateArray().ToList();
        Assert.Contains(mias, o => o.GetProperty("id").GetInt32() == propia);
        var yo = (await f.Leer(op, "/api/auth/yo")).GetProperty("id").GetString();
        Assert.All(mias, o => Assert.True(o.GetProperty("creadaPorId").GetString() == yo || o.GetProperty("asignadoAId").GetString() == yo));
        // y una OT ajena no se abre por su número
        var ajena = (await f.Leer(await f.Entrar("tecnico", "Tecnico2026", "app"), "/api/ordenes")).EnumerateArray().First(o => o.GetProperty("creadaPorId").GetString() != yo).GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.Forbidden, (await op.GetAsync($"/api/ordenes/{ajena}")).StatusCode);
    }

    [Fact]
    public async Task EnLaAppElDirectorioMuestraSoloNombreYCargoDeLosDemas()
    {
        var op = await f.Entrar("operador", "Operador2026", "app");
        var yo = (await f.Leer(op, "/api/auth/yo")).GetProperty("id").GetString();
        var lista = (await f.Leer(op, "/api/directorio")).EnumerateArray().ToList();
        Assert.True(lista.First(x => x.GetProperty("id").GetString() == yo).GetProperty("correo").GetString() is { Length: > 0 });
        Assert.All(lista.Where(x => x.GetProperty("id").GetString() != yo), x => Assert.Equal(JsonValueKind.Null, x.GetProperty("correo").ValueKind));
        // la jefatura de terreno ve los datos de contacto de su equipo; la web, los de todos (hoja Permisos)
        var sup = await f.Entrar("supervisor.turno", "Supervisor2026", "app");
        var supId = (await f.Leer(sup, "/api/auth/yo")).GetProperty("id").GetString();
        Assert.Contains((await f.Leer(sup, "/api/directorio")).EnumerateArray(), x => x.GetProperty("id").GetString() != supId && x.GetProperty("correo").ValueKind == JsonValueKind.String);
        Assert.All((await f.Leer(await f.Entrar("rrhh", "Rrhh2026", "web"), "/api/directorio")).EnumerateArray(), x => Assert.Equal(JsonValueKind.String, x.GetProperty("correo").ValueKind));
    }

    // ---------------------------------------------------------------------------------------- flujo A
    async Task<(int id, uint version)> NuevaOt(HttpClient quien, string equipo)
    {
        var r = await quien.PostAsJsonAsync("/api/ordenes", new { equipo, titulo = $"Prueba de flujo {Uid()[..6]}", prioridad = "alta", especialidad = "mecanica" });
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var id = (await r.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        return (id, (await f.Leer(quien, $"/api/ordenes/{id}")).GetProperty("version").GetUInt32());
    }

    [Fact]
    public async Task UnaOtAsignadaLaTomaSuTecnicoYConLotoVigente()
    {
        var jm = await f.Entrar("jefe.mantenimiento", "Jefemant2026", "app");
        var tec = await f.Entrar("tecnico", "Tecnico2026", "app");
        var ins = await f.Entrar("instrumentacion", "Instrumentacion2026", "app");
        var (ot, ver) = await NuevaOt(jm, "TC-02");

        // asignar es de la planificación y la supervisión, no del técnico ni de producción
        Assert.Equal(HttpStatusCode.Forbidden, (await tec.PostAsJsonAsync($"/api/ordenes/{ot}/planificar", new { version = ver, programada = DateOnly.FromDateTime(DateTime.Today) })).StatusCode);
        var idIns = (await f.Leer(ins, "/api/auth/yo")).GetProperty("id").GetString();
        Assert.Equal(HttpStatusCode.OK, (await jm.PostAsJsonAsync($"/api/ordenes/{ot}/planificar", new { version = ver, asignadoAId = idIns })).StatusCode);

        // otro técnico no puede tomarla y apropiársela
        var r = await tec.PostAsJsonAsync($"/api/ordenes/{ot}/tomar", new { lotoConfirmado = true });
        Assert.Equal(HttpStatusCode.Forbidden, r.StatusCode);
        Assert.Contains("asignada a otro técnico", await r.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.OK, (await ins.PostAsJsonAsync($"/api/ordenes/{ot}/tomar", new { lotoConfirmado = true })).StatusCode);
        // deja el equipo como estaba: termina, verifica la jefatura y queda liberado
        Assert.Equal(HttpStatusCode.OK, (await ins.PostAsJsonAsync($"/api/ordenes/{ot}/cerrar", new { lotoRetirado = true, nota = "Revisión sin hallazgos" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await jm.PostAsJsonAsync($"/api/ordenes/{ot}/verificar", new { aprobar = true })).StatusCode);

        // la habilitación LOTO vencida bloquea el inicio (la cuenta de confiabilidad la tiene vencida en el Excel)
        var (ot2, _) = await NuevaOt(jm, "TC-02");
        var conf = await f.Entrar("confiabilidad", "Confiabilidad2026", "app");
        var bloqueo = await conf.PostAsJsonAsync($"/api/ordenes/{ot2}/tomar", new { lotoConfirmado = true });
        Assert.Equal(HttpStatusCode.Forbidden, bloqueo.StatusCode);
        Assert.Contains("LOTO", await bloqueo.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task ElCierreTecnicoNoPoneLaMaquinaEnMarchaYLaVerificaOtraPersona()
    {
        var jm = await f.Entrar("jefe.mantenimiento", "Jefemant2026", "app");
        var sm = await f.Entrar("supervisor.mantenimiento", "Supervmant2026", "app");
        var tec = await f.Entrar("tecnico", "Tecnico2026", "app");
        var (ot, _) = await NuevaOt(sm, "PH-01");
        Assert.Equal(HttpStatusCode.OK, (await tec.PostAsJsonAsync($"/api/ordenes/{ot}/tomar", new { lotoConfirmado = true })).StatusCode);

        // sin intervención ni nota no se puede terminar
        Assert.Equal(HttpStatusCode.BadRequest, (await tec.PostAsJsonAsync($"/api/ordenes/{ot}/cerrar", new { lotoRetirado = true })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await tec.PostAsJsonAsync($"/api/ordenes/{ot}/cerrar", new { lotoRetirado = true, nota = "Cambio de sello del cilindro" })).StatusCode);
        var detalle = await f.Leer(tec, $"/api/ordenes/{ot}");
        Assert.Equal("por_verificar", detalle.GetProperty("estado").GetString());
        Assert.Equal("en_mantencion", detalle.GetProperty("equipo").GetProperty("estado").GetString());

        // nadie pone en marcha un equipo sin verificar
        var sup = await f.Entrar("supervisor.turno", "Supervisor2026", "app");
        Assert.Equal(HttpStatusCode.Conflict, (await sup.PostAsync("/api/equipos/PH-01/reanudar", null)).StatusCode);

        // rechazar exige un motivo y devuelve la OT al técnico
        Assert.Equal(HttpStatusCode.BadRequest, (await sm.PostAsJsonAsync($"/api/ordenes/{ot}/verificar", new { aprobar = false })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await sm.PostAsJsonAsync($"/api/ordenes/{ot}/verificar", new { aprobar = false, nota = "Falta la prueba de presión" })).StatusCode);
        Assert.Equal("en_curso", (await f.Leer(tec, $"/api/ordenes/{ot}")).GetProperty("estado").GetString());
        Assert.Equal(HttpStatusCode.OK, (await tec.PostAsJsonAsync($"/api/ordenes/{ot}/cerrar", new { lotoRetirado = true, nota = "Prueba de presión a 180 bar conforme" })).StatusCode);

        // el técnico no se verifica a sí mismo; la jefatura sí puede verificar y liberar
        Assert.Equal(HttpStatusCode.Forbidden, (await tec.PostAsJsonAsync($"/api/ordenes/{ot}/verificar", new { aprobar = true })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await jm.PostAsJsonAsync($"/api/ordenes/{ot}/verificar", new { aprobar = true })).StatusCode);
        detalle = await f.Leer(tec, $"/api/ordenes/{ot}");
        Assert.Equal("cerrada", detalle.GetProperty("estado").GetString());
        Assert.False(string.IsNullOrEmpty(detalle.GetProperty("verificadaPor").GetString()));
        Assert.Equal("detenido", detalle.GetProperty("equipo").GetProperty("estado").GetString());   // liberado, pero no en marcha

        // operación da la marcha: por el PLC si está conectado; si no, en la planta simulada
        var marcha = await sup.PostAsync("/api/equipos/PH-01/reanudar", null);
        Assert.Equal(HttpStatusCode.OK, marcha.StatusCode);
        if ((await marcha.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("via").GetString() == "simulacion")
            Assert.Equal("operando", (await f.Leer(tec, "/api/equipos/PH-01")).GetProperty("equipo").GetProperty("estado").GetString());
        // quien no opera ni conduce la producción no puede dar la marcha
        Assert.Equal(HttpStatusCode.Forbidden, (await (await f.Entrar("calidad", "Calidad2026", "app")).PostAsync("/api/equipos/PH-01/reanudar", null)).StatusCode);
    }

    [Fact]
    public async Task VerificarUnaOtNoLiberaElEquipoSiOtraIntervencionSigueAbierta()
    {
        var jm = await f.Entrar("jefe.mantenimiento", "Jefemant2026", "app");
        var tec = await f.Entrar("tecnico", "Tecnico2026", "app");
        var ins = await f.Entrar("instrumentacion", "Instrumentacion2026", "app");
        var (a, _) = await NuevaOt(jm, "CM-01");
        var (b, _) = await NuevaOt(jm, "CM-01");
        Assert.Equal(HttpStatusCode.OK, (await tec.PostAsJsonAsync($"/api/ordenes/{a}/tomar", new { lotoConfirmado = true })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await ins.PostAsJsonAsync($"/api/ordenes/{b}/tomar", new { lotoConfirmado = true })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await tec.PostAsJsonAsync($"/api/ordenes/{a}/cerrar", new { lotoRetirado = true, nota = "Ajuste de correa" })).StatusCode);
        var r = await (await jm.PostAsJsonAsync($"/api/ordenes/{a}/verificar", new { aprobar = true })).Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(r.GetProperty("equipoLiberado").GetBoolean());
        Assert.Equal("en_mantencion", (await f.Leer(tec, "/api/equipos/CM-01")).GetProperty("equipo").GetProperty("estado").GetString());
        // al verificar la última intervención abierta, recién ahí se libera
        Assert.Equal(HttpStatusCode.OK, (await ins.PostAsJsonAsync($"/api/ordenes/{b}/cerrar", new { lotoRetirado = true, nota = "Sensor de temperatura recalibrado" })).StatusCode);
        Assert.True((await (await jm.PostAsJsonAsync($"/api/ordenes/{b}/verificar", new { aprobar = true })).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("equipoLiberado").GetBoolean());
        Assert.Equal("detenido", (await f.Leer(tec, "/api/equipos/CM-01")).GetProperty("equipo").GetProperty("estado").GetString());
    }

    [Fact]
    public async Task UnaOtAutomaticaNacidaDeUnPlcSimuladoQuedaMarcadaComoSimulada()
    {
        await Simulador().PostAsJsonAsync("/api/ingesta/plc/PLC-02/eventos", new[] { new { uid = Uid(), ts = DateTime.UtcNow, tipo = "falla", equipo = "CT-01", nivel = "alarma", mensaje = "Atasco simulado en la cinta" } });
        var tec = await f.Entrar("tecnico", "Tecnico2026", "app");
        var ot = (await f.Leer(tec, "/api/ordenes")).EnumerateArray().First(o => o.GetProperty("equipo").GetString() == "CT-01" && o.GetProperty("automatica").GetBoolean() && o.GetProperty("estado").GetString() != "cerrada");
        Assert.True(ot.GetProperty("simulada").GetBoolean());
    }
}
