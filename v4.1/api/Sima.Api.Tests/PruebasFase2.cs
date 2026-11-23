using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Sima.Api.Servicios;

namespace Sima.Api.Tests;

/// <summary>
/// Fase 2 (definiciones funcionales del proyecto): estados de equipo, liberación jerárquica con seguridad y calidad,
/// bloqueo por seguridad, acceso explícito por plataforma, notificaciones persistentes y auditoría con antes y después.
/// </summary>
[Collection("api")]
public class PruebasFase2(Fabrica f)
{
    const string Clave = "Sima2026!";
    HttpClient Simulador() { var c = f.CreateClient(); c.DefaultRequestHeaders.Add("X-API-Key", "clave-de-prueba"); return c; }

    async Task<int> OtLista(HttpClient creador, HttpClient tecnico, string equipo, bool seguridad, bool calidad)
    {
        var r = await creador.PostAsJsonAsync("/api/ordenes", new { equipo, titulo = $"Intervención de prueba {Guid.NewGuid():N}"[..40], prioridad = "alta" });
        var ot = (await r.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.OK, (await tecnico.PostAsJsonAsync($"/api/ordenes/{ot}/tomar", new { lotoConfirmado = true })).StatusCode);
        await Fabrica.Probar(tecnico, ot);
        Assert.Equal(HttpStatusCode.OK, (await tecnico.PostAsJsonAsync($"/api/ordenes/{ot}/cerrar", new { lotoRetirado = true, nota = "Listo", afectaSeguridad = seguridad, afectaCalidad = calidad })).StatusCode);
        return ot;
    }

    [Fact]
    public void LasCapacidadesValenSoloEnSuPlataforma()
    {
        Assert.False(Permisos.EnPlataforma("remuneraciones.ver", "app"));     // pagos y datos de personas: solo web
        Assert.False(Permisos.EnPlataforma("personal.sensibles", "app"));
        Assert.False(Permisos.EnPlataforma("ordenes.ejecutar", "web"));       // intervenir con LOTO: solo Desktop
        Assert.True(Permisos.EnPlataforma("ordenes.ver", "web"));
        Assert.True(Permisos.EnPlataforma("equipos.liberar_calidad", "web"));
        // un administrador informático no libera máquinas
        Assert.DoesNotContain(Permisos.DeFabrica(59, "finanzas_adm").Keys, k => k.StartsWith("equipos.") || k.StartsWith("ordenes."));
    }

    [Fact]
    public async Task SiLaIntervencionAfectaSeguridadYCalidadFirmanPrevencionYCalidadAntesQueProduccion()
    {
        var jm = await f.Entrar("jefe.mantenimiento", "Jefemant2026", "app");
        var tec = await f.Entrar("tecnico", "Tecnico2026", "app");
        var ot = await OtLista(jm, tec, "IN-01", seguridad: true, calidad: true);
        var lib = (await f.Leer(tec, $"/api/ordenes/{ot}")).GetProperty("liberacion");
        Assert.Equal(new[] { "tecnica", "seguridad", "calidad", "produccion" }, lib.GetProperty("requeridas").EnumerateArray().Select(x => x.GetString()));

        // soporte TI no libera aunque administre cuentas
        var ti = await f.Entrar("constanza.vega", Clave, "web");
        Assert.Equal(HttpStatusCode.Forbidden, (await ti.PostAsJsonAsync($"/api/ordenes/{ot}/validar", new { tipo = "tecnica", aprobar = true })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await jm.PostAsJsonAsync($"/api/ordenes/{ot}/validar", new { tipo = "tecnica", aprobar = true })).StatusCode);

        // producción no confirma mientras falten seguridad y calidad; la jefatura de mantenimiento no firma por calidad
        var sup = await f.Entrar("supervisor.turno", "Supervisor2026", "app");
        var r = await sup.PostAsJsonAsync($"/api/ordenes/{ot}/validar", new { tipo = "produccion", aprobar = true });
        Assert.Equal(HttpStatusCode.Forbidden, r.StatusCode);
        Assert.Contains("seguridad", await r.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.Forbidden, (await jm.PostAsJsonAsync($"/api/ordenes/{ot}/validar", new { tipo = "calidad", aprobar = true })).StatusCode);

        // la bandeja de aprobaciones de prevención y de calidad muestra la liberación que les toca
        var prev = await f.Entrar("prevencion", "Prevencion2026", "app");
        Assert.Contains((await f.Leer(prev, "/api/aprobaciones")).EnumerateArray(), a => a.GetProperty("tipo").GetString() == "liberacion" && a.GetProperty("id").GetInt32() == ot);
        Assert.Equal(HttpStatusCode.OK, (await prev.PostAsJsonAsync($"/api/ordenes/{ot}/validar", new { tipo = "seguridad", aprobar = true, nota = "Resguardos y paro de emergencia verificados" })).StatusCode);
        var cal = await f.Entrar("jefe.calidad", "Jefecalidad2026", "web");
        Assert.Equal(HttpStatusCode.OK, (await cal.PostAsJsonAsync($"/api/ordenes/{ot}/validar", new { tipo = "calidad", aprobar = true, nota = "Primeras piezas dentro de especificación" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await sup.PostAsJsonAsync($"/api/ordenes/{ot}/validar", new { tipo = "produccion", aprobar = true })).StatusCode);

        var d = await f.Leer(tec, $"/api/ordenes/{ot}");
        Assert.Equal("cerrada", d.GetProperty("estado").GetString());
        Assert.Equal(4, d.GetProperty("liberacion").GetProperty("firmas").GetArrayLength());
        Assert.Equal("liberado", d.GetProperty("equipo").GetProperty("estado").GetString());
    }

    [Fact]
    public async Task ElBloqueoPorSeguridadNoLoCambiaUnPlcYSoloPrevencionLoLevanta()
    {
        var sup = await f.Entrar("supervisor.turno", "Supervisor2026", "app");
        var op = await f.Entrar("operador", "Operador2026", "app");
        Assert.Equal(HttpStatusCode.Forbidden, (await op.PostAsJsonAsync("/api/equipos/SD-01/bloquear", new { motivo = "Cortina de soldadura rota" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await sup.PostAsJsonAsync("/api/equipos/SD-01/bloquear", new { motivo = "" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await sup.PostAsJsonAsync("/api/equipos/SD-01/bloquear", new { motivo = "Cortina de soldadura rota" })).StatusCode);
        await Simulador().PostAsJsonAsync("/api/ingesta/plc/PLC-01/telemetria", new { estado = "run", lecturas = Array.Empty<object>(), equipos = new[] { new { equipo = "SD-01", estado = "operando" } } });
        Assert.Equal("bloqueado_seguridad", (await f.Leer(sup, "/api/equipos/SD-01")).GetProperty("equipo").GetProperty("estado").GetString());
        Assert.Equal(HttpStatusCode.Forbidden, (await sup.PostAsJsonAsync("/api/equipos/SD-01/desbloquear", new { motivo = "Se cambió la cortina" })).StatusCode);
        var prev = await f.Entrar("prevencion", "Prevencion2026", "app");
        Assert.Equal(HttpStatusCode.OK, (await prev.PostAsJsonAsync("/api/equipos/SD-01/desbloquear", new { motivo = "Cortina reemplazada e inspeccionada" })).StatusCode);
        Assert.Equal("liberado", (await f.Leer(sup, "/api/equipos/SD-01")).GetProperty("equipo").GetProperty("estado").GetString());

        // la auditoría guarda quién, con qué cargo y plataforma, el estado anterior, el nuevo y el motivo
        var rrhh = await f.Entrar("rrhh", "Rrhh2026", "web");
        var aud = (await f.Leer(rrhh, "/api/auditoria?entidad=equipo&buscar=SD-01")).GetProperty("items").EnumerateArray().ToList();
        var bloqueo = aud.First(a => a.GetProperty("accion").GetString() == "bloqueó un equipo por seguridad");
        Assert.Equal("app", bloqueo.GetProperty("plataforma").GetString());
        Assert.Equal("Supervisor/a de turno", bloqueo.GetProperty("cargo").GetString());
        Assert.Equal("bloqueado_seguridad", bloqueo.GetProperty("valorNuevo").GetString());
        Assert.Equal("Cortina de soldadura rota", bloqueo.GetProperty("motivo").GetString());
    }

    [Fact]
    public async Task CadaPlataformaExigeAutorizacionYSeRevocaPorSeparado()
    {
        var anon = f.CreateClient();
        async Task<HttpResponseMessage> Ingresar(string plataforma) => await anon.PostAsJsonAsync("/api/auth/login", new { correo = "rodrigo.rivera@manuandina.cl", clave = Clave, canal = plataforma });

        // un técnico (canal app) no entra a la web sin autorización, y el intento queda registrado
        var r = await Ingresar("web");
        Assert.Equal(HttpStatusCode.Forbidden, r.StatusCode);
        Assert.Contains("SIMA Web", await r.Content.ReadAsStringAsync());
        var rrhh = await f.Entrar("rrhh", "Rrhh2026", "web");
        var yoTec = await f.Entrar("rodrigo.rivera", Clave, "app");
        var id = (await f.Leer(yoTec, "/api/auth/yo")).GetProperty("id").GetString()!;
        Assert.Contains((await f.Leer(rrhh, $"/api/accesos?trabajador={id}")).EnumerateArray(), a => a.GetProperty("plataforma").GetString() == "web" && a.GetProperty("resultado").GetString() == "sin_acceso");

        // soporte TI no autoriza plataformas; Personas sí, con motivo
        var ti = await f.Entrar("constanza.vega", Clave, "web");
        Assert.Equal(HttpStatusCode.Forbidden, (await ti.PutAsJsonAsync($"/api/cuentas/{id}/plataformas/web", new { habilitado = true, motivo = "Necesita informes" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await rrhh.PutAsJsonAsync($"/api/cuentas/{id}/plataformas/web", new { habilitado = true, motivo = "" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await rrhh.PutAsJsonAsync($"/api/cuentas/{id}/plataformas/web", new { habilitado = true, motivo = "Revisa el historial de equipos desde la oficina" })).StatusCode);
        var web = await Ingresar("web");
        Assert.Equal(HttpStatusCode.OK, web.StatusCode);
        var cuerpoWeb = await web.Content.ReadFromJsonAsync<JsonElement>();
        var perfil = cuerpoWeb.GetProperty("usuario");
        // en la web no tiene las capacidades de terreno (ejecutar OT con bloqueo)
        Assert.False(perfil.GetProperty("capacidades").TryGetProperty("ordenes.ejecutar", out _));
        Assert.True((await f.Leer(yoTec, "/api/auth/yo")).GetProperty("capacidades").TryGetProperty("ordenes.ejecutar", out _));

        // revocar Desktop cierra solo las sesiones de Desktop
        var clienteWeb = f.CreateClient();
        clienteWeb.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", cuerpoWeb.GetProperty("token").GetString());
        Assert.Equal(HttpStatusCode.OK, (await ti.PutAsJsonAsync($"/api/cuentas/{id}/plataformas/app", new { habilitado = false, motivo = "Equipo extraviado" })).StatusCode);
        await Task.Delay(GuardiaDeCuenta.Vigencia + TimeSpan.FromMilliseconds(300));
        Assert.Equal(HttpStatusCode.Unauthorized, (await yoTec.GetAsync("/api/auth/yo")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await clienteWeb.GetAsync("/api/auth/yo")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await Ingresar("app")).StatusCode);

        // se deja la cuenta como estaba
        Assert.Equal(HttpStatusCode.OK, (await rrhh.PutAsJsonAsync($"/api/cuentas/{id}/plataformas/app", new { habilitado = true, motivo = "Equipo recuperado" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await rrhh.PutAsJsonAsync($"/api/cuentas/{id}/plataformas/web", new { habilitado = false, motivo = "Fin de la necesidad" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Ingresar("app")).StatusCode);
    }

    [Fact]
    public async Task LasNotificacionesQuedanGuardadasHastaQueSeLeen()
    {
        var jm = await f.Entrar("jefe.mantenimiento", "Jefemant2026", "app");
        var tec = await f.Entrar("daniel.henriquez", Clave, "app");
        var idTec = (await f.Leer(tec, "/api/auth/yo")).GetProperty("id").GetString();
        var r = await jm.PostAsJsonAsync("/api/ordenes", new { equipo = "CT-02", titulo = "Revisar tensión de la banda", prioridad = "media", especialidad = "mecanica" });
        var ot = (await r.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        var version = (await f.Leer(jm, $"/api/ordenes/{ot}")).GetProperty("version").GetUInt32();
        Assert.Equal(HttpStatusCode.OK, (await jm.PostAsJsonAsync($"/api/ordenes/{ot}/planificar", new { version, asignadoAId = idTec })).StatusCode);
        var bandeja = await f.Leer(tec, "/api/notificaciones?noLeidas=true");
        var n = bandeja.GetProperty("items").EnumerateArray().First(x => x.GetProperty("referencia").GetString() == $"OT-{ot:0000}");
        Assert.Equal("tarea", n.GetProperty("categoria").GetString());
        var antes = bandeja.GetProperty("noLeidas").GetInt32();
        Assert.Equal(HttpStatusCode.OK, (await tec.PostAsync($"/api/notificaciones/{n.GetProperty("id").GetInt64()}/leida", null)).StatusCode);
        Assert.Equal(antes - 1, (await f.Leer(tec, "/api/notificaciones")).GetProperty("noLeidas").GetInt32());
        // nadie lee las notificaciones de otra persona
        Assert.Equal(HttpStatusCode.NotFound, (await jm.PostAsync($"/api/notificaciones/{n.GetProperty("id").GetInt64()}/leida", null)).StatusCode);
    }
}
