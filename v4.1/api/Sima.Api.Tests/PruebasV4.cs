using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Sima.Api.Tests;

/// <summary>Casos de aceptación del informe «Accesos y necesidades por trabajador» (sección 13).</summary>
[Collection("api")]
public class PruebasV4(Fabrica f)
{
    const string Clave = "Sima2026!";

    [Fact]
    public async Task Caso01_ElOperadorSoloVeSuTrabajoYNoLasRemuneracionesDeOtro()
    {
        var op = await f.Entrar("victor.mena", Clave, "app");                        // T013
        Assert.Equal(HttpStatusCode.Forbidden, (await op.GetAsync("/api/remuneraciones/2026-10/T014")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await op.GetAsync("/api/trabajadores/T014")).StatusCode);
        var ordenes = await f.Leer(op, "/api/produccion/ordenes");
        Assert.All(ordenes.EnumerateArray(), o => Assert.Equal("B", o.GetProperty("turno").GetString()));   // T013 trabaja en el turno B
        Assert.Equal(HttpStatusCode.OK, (await op.GetAsync("/api/yo/habilitaciones")).StatusCode);
    }

    [Fact]
    public async Task Caso02_LaSupervisoraVeLaAsistenciaDeSuEquipoNoDeTodaLaEmpresa()
    {
        var sup = await f.Entrar("supervisor.turno", "Supervisor2026", "app");
        var suya = (await f.Leer(sup, "/api/asistencia?periodo=2026-10")).GetArrayLength();
        var rrhh = await f.Entrar("rrhh", "Rrhh2026", "web");
        var todas = (await f.Leer(rrhh, "/api/asistencia?periodo=2026-10")).GetArrayLength();
        Assert.InRange(suya, 1, todas - 1);
    }

    [Fact]
    public async Task Caso03_LaJefaDeMantenimientoNoVeLiquidacionesNiCuentasBancarias()
    {
        var jm = await f.Entrar("jefe.mantenimiento", "Jefemant2026", "app");
        Assert.Equal(HttpStatusCode.Forbidden, (await jm.GetAsync("/api/remuneraciones")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await jm.GetAsync("/api/trabajadores/T013")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await jm.GetAsync("/api/ordenes")).StatusCode);
    }

    [Fact]
    public async Task Caso04_ElPanolRegistraEgresosSoloAsociadosAUnaOrden()
    {
        var pan = await f.Entrar("panol", "Panol2026", "app");
        var rp = (await f.Leer(pan, "/api/repuestos")).EnumerateArray().First(r => r.GetProperty("stock").GetInt32() > 3).GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.BadRequest, (await pan.PostAsJsonAsync($"/api/repuestos/{rp}/movimiento", new { cantidad = -1 })).StatusCode);
        var ot = (await f.Leer(pan, "/api/ordenes")).EnumerateArray().First().GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.OK, (await pan.PostAsJsonAsync($"/api/repuestos/{rp}/movimiento", new { cantidad = -1, ordenId = ot })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await pan.PutAsJsonAsync("/api/parametros/imm", new { valor = 1 })).StatusCode);
    }

    [Fact]
    public async Task Caso05_AutomatizacionSolicitaCambiosDePlcPeroNoLosPublicaSinAprobacion()
    {
        var aut = await f.Entrar("automatizacion", "Automatizacion2026", "app");
        var det = await f.Leer(aut, "/api/plc/PLC-01");
        var version = det.GetProperty("version").GetInt32();
        var peldanos = JsonSerializer.Deserialize<List<Dictionary<string, JsonElement>>>(det.GetProperty("programa").GetProperty("peldanos").GetRawText())!;
        peldanos[0]["comentario"] = JsonSerializer.SerializeToElement("Cambio de prueba automática");
        var r = await aut.PutAsJsonAsync("/api/plc/PLC-01/programa", new { peldanos, justificacion = "prueba" });
        Assert.Equal(HttpStatusCode.Accepted, r.StatusCode);
        var id = (await r.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        Assert.Equal(version, (await f.Leer(aut, "/api/plc/PLC-01")).GetProperty("version").GetInt32());              // todavía no se publica
        Assert.Equal(HttpStatusCode.Forbidden, (await aut.PostAsJsonAsync($"/api/plc/cambios/{id}/aprobar", new { })).StatusCode);
        var jefa = await f.Entrar("jefe.mantenimiento", "Jefemant2026", "app");
        Assert.Equal(HttpStatusCode.OK, (await jefa.PostAsJsonAsync($"/api/plc/cambios/{id}/aprobar", new { comentario = "ok" })).StatusCode);
        var nuevo = await f.Leer(aut, "/api/plc/PLC-01");
        Assert.Equal(version + 1, nuevo.GetProperty("version").GetInt32());
        Assert.Equal("Cambio de prueba automática", nuevo.GetProperty("programa").GetProperty("peldanos")[0].GetProperty("comentario").GetString());
    }

    [Fact]
    public async Task Caso06_ElPlanificadorPreparaOrdenesPeroNoFirmaLaEjecucion()
    {
        var pl = await f.Entrar("rodrigo.salazar", Clave, "app");                     // T050
        var c = await pl.PostAsJsonAsync("/api/ordenes", new { equipo = "TC-01", titulo = "Preventiva planificada de prueba", prioridad = "baja" });
        Assert.Equal(HttpStatusCode.Created, c.StatusCode);
        var id = (await c.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.Forbidden, (await pl.PostAsJsonAsync($"/api/ordenes/{id}/tomar", new { lotoConfirmado = true })).StatusCode);
        var tec = await f.Entrar("tecnico", "Tecnico2026", "app");
        Assert.Equal(HttpStatusCode.OK, (await tec.PostAsJsonAsync($"/api/ordenes/{id}/tomar", new { lotoConfirmado = true })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await pl.PostAsJsonAsync($"/api/ordenes/{id}/cerrar", new { lotoRetirado = true })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await tec.PostAsJsonAsync($"/api/ordenes/{id}/cerrar", new { lotoRetirado = true, nota = "ok" })).StatusCode);
    }

    [Fact]
    public async Task Caso07_CalidadRegistraNoConformidadesYLiberarExigeFacultad()
    {
        var insp = await f.Entrar("calidad", "Calidad2026", "app");
        var r = await insp.PostAsJsonAsync("/api/calidad/nc", new { producto = "Tapa PP 38 mm", lote = "L-PRUEBA", tipo = "visual", severidad = "mayor", descripcion = "Rebaba en borde", cantidad = 40 });
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var id = (await r.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.Forbidden, (await insp.PostAsJsonAsync($"/api/calidad/nc/{id}/resolver", new { decision = "liberar", disposicion = "ok" })).StatusCode);
        var jefa = await f.Entrar("jefe.calidad", "Jefecalidad2026", "web");
        Assert.Equal(HttpStatusCode.OK, (await jefa.PostAsJsonAsync($"/api/calidad/nc/{id}/resolver", new { decision = "liberar", disposicion = "Reinspección al 100 %" })).StatusCode);
        Assert.Equal("liberada", (await f.Leer(jefa, "/api/calidad/nc")).EnumerateArray().First(n => n.GetProperty("id").GetInt32() == id).GetProperty("estado").GetString());
    }

    [Fact]
    public async Task Caso09y16_LaNominaLaPreparaUnoYLaApruebaOtroTrasValidarParametros()
    {
        var an = await f.Entrar("andres.diaz", Clave, "web");                         // T079 · analista de remuneraciones
        Assert.Equal(HttpStatusCode.Conflict, (await an.PostAsync("/api/remuneraciones/2026-09/preparar", null)).StatusCode);   // sin validación formal
        var gf = await f.Entrar("pablo.henriquez", Clave, "web");                     // T090 · gerente de finanzas
        Assert.Equal(HttpStatusCode.Forbidden, (await gf.PostAsync("/api/remuneraciones/2026-09/preparar", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await gf.PostAsJsonAsync("/api/parametros/validar", new { periodo = "2026-09", nota = "prueba" })).StatusCode);
        var p = await an.PostAsync("/api/remuneraciones/2026-09/preparar", null);
        Assert.Equal(HttpStatusCode.Created, p.StatusCode);
        var id = (await p.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.Forbidden, (await an.PostAsJsonAsync($"/api/remuneraciones/cierres/{id}/aprobar", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await gf.PostAsJsonAsync($"/api/remuneraciones/cierres/{id}/aprobar", new { comentario = "ok" })).StatusCode);
    }

    [Fact]
    public async Task Caso10_SoporteTiRestableceAccesosSinLeerSueldos()
    {
        var ti = await f.Entrar("constanza.vega", Clave, "web");                      // T094
        Assert.Equal(HttpStatusCode.Forbidden, (await ti.GetAsync("/api/remuneraciones")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await ti.GetAsync("/api/trabajadores/T013")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await ti.GetAsync("/api/contratos")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await ti.GetAsync("/api/cuentas")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await ti.PostAsync("/api/cuentas/T015/desbloquear", null)).StatusCode);
    }

    [Fact]
    public async Task Caso15_ElTableroGerencialNoRevelaDatosPersonalesNiSueldos()
    {
        var ge = await f.Entrar("gerencia", "Gerencia2026", "web");
        var ficha = await f.Leer(ge, "/api/trabajadores/T013");
        Assert.Equal(JsonValueKind.Null, ficha.GetProperty("personal").GetProperty("numeroCuenta").ValueKind);
        Assert.Equal(JsonValueKind.Null, ficha.GetProperty("resumen").GetProperty("sueldoBase").ValueKind);
        Assert.Equal(HttpStatusCode.Forbidden, (await ge.GetAsync("/api/remuneraciones")).StatusCode);
        Assert.True((await f.Leer(ge, "/api/panel")).GetProperty("personas").GetProperty("costoHaberes").GetInt64() > 0);   // solo totales
    }

    [Fact]
    public async Task LasLecturasSensiblesQuedanAuditadas()
    {
        var rrhh = await f.Entrar("rrhh", "Rrhh2026", "web");
        await f.Leer(rrhh, "/api/trabajadores/T020");
        var aud = await f.Leer(rrhh, "/api/auditoria?buscar=T020");
        Assert.Contains(aud.GetProperty("items").EnumerateArray(), a => a.GetProperty("accion").GetString() == "consultó datos personales sensibles");
    }

    [Fact]
    public async Task ProduccionRegistradaAlimentaElResumenYLaSeguridadLaVeTodoQuienReporta()
    {
        var jp = await f.Entrar("produccion", "Produccion2026", "web");
        var c = await jp.PostAsJsonAsync("/api/produccion/ordenes", new { equipo = "IN-01", producto = "Tapa PP 38 mm", cantidad = 500, turno = "B" });
        Assert.Equal(HttpStatusCode.Created, c.StatusCode);
        var id = (await c.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        var op = await f.Entrar("victor.mena", Clave, "app");
        Assert.Equal(HttpStatusCode.Conflict, (await op.PostAsJsonAsync($"/api/produccion/ordenes/{id}/registro", new { conformes = 10, rechazo = 0 })).StatusCode);   // aún planificada
        Assert.Equal(HttpStatusCode.OK, (await jp.PostAsJsonAsync($"/api/produccion/ordenes/{id}/estado", new { estado = "en_curso" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await op.PostAsJsonAsync($"/api/produccion/ordenes/{id}/registro", new { conformes = 10, rechazo = 2 })).StatusCode);  // falta el motivo
        var r = await op.PostAsJsonAsync($"/api/produccion/ordenes/{id}/registro", new { conformes = 48, rechazo = 2, motivo = "Rebaba" });
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.Equal(50, (await r.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("producidas").GetInt32());
        var rep = await op.PostAsJsonAsync("/api/sst/incidentes", new { zona = "Nave 2 · Plásticos", tipo = "condicion_insegura", severidad = "leve", descripcion = "Cable suelto en el pasillo" });
        Assert.Equal(HttpStatusCode.Created, rep.StatusCode);
        Assert.All((await f.Leer(op, "/api/sst/incidentes")).EnumerateArray(), i => Assert.StartsWith("Víctor Mena", i.GetProperty("reportadoPor").GetString()));   // solo sus reportes
        Assert.Equal(HttpStatusCode.Forbidden, (await op.GetAsync("/api/sst/resumen")).StatusCode);
    }

    [Fact]
    public async Task LaMatrizDePermisosEstaEnLaBaseYSoloTiYGerenciaGeneralLaEditan()
    {
        var ge = await f.Entrar("elena.salazar", Clave, "web");                       // T001 · gerente general
        var m = await f.Leer(ge, "/api/permisos");
        Assert.Equal(64, m.GetProperty("cargos").GetArrayLength());
        Assert.True(m.GetProperty("puedeEditar").GetBoolean());
        var rrhh = await f.Entrar("rrhh", "Rrhh2026", "web");
        Assert.Equal(HttpStatusCode.Forbidden, (await rrhh.PutAsJsonAsync("/api/permisos/9", new { capacidad = "calidad.ver", alcance = "empresa" })).StatusCode);
    }
}
