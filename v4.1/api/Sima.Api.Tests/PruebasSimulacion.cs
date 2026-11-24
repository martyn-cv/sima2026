using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Sima.Api.Tests;

/// <summary>
/// Planta simulada: fallas provocadas desde el simulador, diagnóstico sin conocer la causa, reparación evaluada contra la
/// causa real, liberación y corrección de lógica Ladder con aprobación.
/// </summary>
[Collection("api")]
public class PruebasSimulacion(Fabrica f)
{
    HttpClient Control() { var c = f.CreateClient(); c.DefaultRequestHeaders.Add("X-API-Key", "clave-de-prueba"); return c; }

    static async Task<JsonElement> Json(HttpResponseMessage r) => await r.Content.ReadFromJsonAsync<JsonElement>();

    async Task<JsonElement> Falla(int id) => (await f.Leer(Control(), "/api/ingesta/simulacion/fallas?todas=true")).EnumerateArray().First(x => x.GetProperty("id").GetInt32() == id);

    [Fact]
    public async Task EscenarioA_FallaMecanicaSimuladaSeResuelveSoloConLaIntervencionCorrecta()
    {
        var control = Control();
        // los trabajadores no pueden provocar fallas ni ver la causa
        var jm = await f.Entrar("jefe.mantenimiento", "Jefemant2026", "app");
        Assert.Equal(HttpStatusCode.Unauthorized, (await jm.PostAsJsonAsync("/api/ingesta/simulacion/fallas", new { equipo = "IN-02", tipo = "sobrecalentamiento_motor" })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await jm.GetAsync("/api/ingesta/simulacion/fallas")).StatusCode);

        // 1–3: el controlador provoca un sobrecalentamiento con una causa concreta; la máquina cambia de estado
        var r = await control.PostAsJsonAsync("/api/ingesta/simulacion/fallas", new { equipo = "IN-02", tipo = "sobrecalentamiento_motor", causa = "rodamiento_danado", criticidad = "alta" });
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var falla = await Json(r);
        var fid = falla.GetProperty("id").GetInt32(); var ot = falla.GetProperty("ordenId").GetInt32();
        var ficha = await f.Leer(jm, "/api/equipos/IN-02");
        Assert.Equal("falla", ficha.GetProperty("equipo").GetProperty("estado").GetString());

        // 4–5: la operación ve la alarma; mantenimiento recibe la incidencia con los síntomas, nunca con la causa
        var op = await f.Entrar("supervisor.turno", "Supervisor2026", "app");
        Assert.Contains((await f.Leer(op, "/api/alarmas?abiertas=true")).EnumerateArray(), a => a.GetProperty("equipo").GetString() == "IN-02");
        var orden = await f.Leer(jm, $"/api/ordenes/{ot}");
        Assert.Contains("Temperatura del motor", orden.GetProperty("descripcion").GetString());
        Assert.DoesNotContain("odamiento", orden.GetProperty("descripcion").GetString());
        Assert.Equal("electromecanica", orden.GetProperty("especialidad").GetString());
        Assert.Contains((await f.Leer(jm, "/api/notificaciones")).GetProperty("items").EnumerateArray(), n => n.GetProperty("texto").GetString()!.Contains("Nueva incidencia"));

        // 6–8: la jefatura asigna; el técnico toma la orden e inspecciona componentes
        var tec = await f.Entrar("tecnico", "Tecnico2026", "app");
        var idTec = (await f.Leer(tec, "/api/auth/yo")).GetProperty("id").GetString();
        Assert.Equal(HttpStatusCode.OK, (await jm.PostAsJsonAsync($"/api/ordenes/{ot}/planificar", new { version = orden.GetProperty("version").GetUInt32(), asignadoAId = idTec })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await tec.PostAsJsonAsync($"/api/ordenes/{ot}/tomar", new { lotoConfirmado = true })).StatusCode);
        var diag = await f.Leer(tec, $"/api/ordenes/{ot}/diagnostico");
        var comps = diag.GetProperty("componentes").EnumerateArray().ToList();
        var motor = comps.First(c => c.GetProperty("tipo").GetString() == "motor").GetProperty("id").GetInt32();
        var sensor = comps.First(c => c.GetProperty("tipo").GetString() == "sensor").GetProperty("id").GetInt32();
        Assert.Contains("Sin anomalías", (await Json(await tec.PostAsJsonAsync($"/api/ordenes/{ot}/inspecciones", new { componenteId = sensor }))).GetProperty("hallazgo").GetString());
        Assert.Contains("ruido metálico", (await Json(await tec.PostAsJsonAsync($"/api/ordenes/{ot}/inspecciones", new { componenteId = motor }))).GetProperty("hallazgo").GetString());

        // una intervención equivocada (limpieza) queda registrada, pero la máquina no se repara y la orden sigue en curso
        var mala = await tec.PostAsJsonAsync($"/api/ordenes/{ot}/intervenciones", new
        {
            causa = "mecanica", diagnostico = "Suciedad en el motor", accion = "Limpieza del motor", resultado = "resuelto", cerrar = true, lotoRetirado = true,
            componenteId = motor, tipoAccion = "limpieza", pruebas = new[] { new { descripcion = "Prueba en vacío", resultado = "conforme", valores = "" } },
        });
        Assert.Equal(HttpStatusCode.Conflict, mala.StatusCode);
        Assert.Contains("sigue presentando", await mala.Content.ReadAsStringAsync());
        Assert.Equal("en_curso", (await f.Leer(tec, $"/api/ordenes/{ot}")).GetProperty("estado").GetString());
        Assert.Equal("activa", (await Falla(fid)).GetProperty("estadoFisico").GetString());
        // tampoco se puede declarar conforme una prueba mientras persisten los síntomas
        Assert.Equal(HttpStatusCode.Conflict, (await tec.PostAsJsonAsync($"/api/ordenes/{ot}/pruebas", new { descripcion = "Prueba", resultado = "conforme", valores = "" })).StatusCode);

        // 9–12: diagnóstico correcto, repuesto adecuado, reparación y pruebas: ahora sí se pide la liberación
        var repuestos = (await f.Leer(tec, "/api/repuestos")).EnumerateArray().ToList();
        var rodamiento = repuestos.FirstOrDefault(x => x.GetProperty("nombre").GetString()!.Contains("odamiento", StringComparison.OrdinalIgnoreCase) && x.GetProperty("stock").GetInt32() > 0);
        var consumo = rodamiento.ValueKind == JsonValueKind.Object ? new[] { new { repuestoId = rodamiento.GetProperty("id").GetInt32(), cantidad = 1 } } : Array.Empty<object>().Select(_ => new { repuestoId = 0, cantidad = 0 }).ToArray();
        var buena = await tec.PostAsJsonAsync($"/api/ordenes/{ot}/intervenciones", new
        {
            causa = "mecanica", diagnostico = "Rodamiento del motor con juego y ruido", accion = "Cambio de rodamiento del motor de la bomba", resultado = "resuelto", cerrar = true, lotoRetirado = true,
            componenteId = motor, tipoAccion = "reemplazo", repuestos = consumo, pruebas = new[] { new { descripcion = "Prueba con carga nominal", resultado = "conforme", valores = "temperatura estable" } },
        });
        Assert.Equal(HttpStatusCode.Created, buena.StatusCode);
        var fs = await Falla(fid);
        Assert.Equal("resuelta", fs.GetProperty("estadoFisico").GetString());
        Assert.Equal(2, fs.GetProperty("evaluaciones").GetArrayLength());
        Assert.False(fs.GetProperty("evaluaciones")[0].GetProperty("resuelve").GetBoolean());
        Assert.True(fs.GetProperty("evaluaciones")[1].GetProperty("resuelve").GetBoolean());

        // 13–15: el responsable valida y la máquina queda liberada; el simulador ve la orden cerrada
        var sm = await f.Entrar("supervisor.mantenimiento", "Supervmant2026", "app");
        await f.Liberar(ot, sm);
        Assert.Equal("liberado", (await f.Leer(jm, "/api/equipos/IN-02")).GetProperty("equipo").GetProperty("estado").GetString());
        Assert.Equal("cerrada", (await Falla(fid)).GetProperty("orden").GetProperty("estado").GetString());
        Assert.True((await Falla(fid)).GetProperty("tiempos").GetProperty("aReparacion").ValueKind == JsonValueKind.Number);
    }

    [Fact]
    public async Task EscenarioB_ErrorDeLogicaSeCorrigeConUnaVersionAprobadaDelPrograma()
    {
        var control = Control();
        var antes = await f.Leer(control, "/api/ingesta/plc/PLC-03/config");
        var programaOriginal = antes.GetProperty("programa");
        var r = await control.PostAsJsonAsync("/api/ingesta/simulacion/fallas", new { equipo = "EV-02", tipo = "error_logica_ladder" });
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var fid = (await Json(r)).GetProperty("id").GetInt32();
        var despues = await f.Leer(control, "/api/ingesta/plc/PLC-03/config");
        Assert.True(despues.GetProperty("version").GetInt32() > antes.GetProperty("version").GetInt32());
        Assert.NotEqual(programaOriginal.GetProperty("peldanos").GetRawText(), despues.GetProperty("programa").GetProperty("peldanos").GetRawText());

        // la estación de ingeniería propone la corrección; un cambio sin aprobar no repara nada
        var cambio = await control.PutAsJsonAsync("/api/ingesta/plc/PLC-03/programa", new { peldanos = programaOriginal.GetProperty("peldanos"), justificacion = "Se corrige el contacto invertido del peldaño de marcha" });
        Assert.Equal(HttpStatusCode.Accepted, cambio.StatusCode);
        var idCambio = (await Json(cambio)).GetProperty("id").GetInt32();
        Assert.Equal("activa", (await Falla(fid)).GetProperty("estadoFisico").GetString());

        // al aprobar y publicar la versión, el simulador ejecuta la lógica corregida y la falla queda resuelta
        var jm = await f.Entrar("jefe.mantenimiento", "Jefemant2026", "app");
        Assert.Equal(HttpStatusCode.OK, (await jm.PostAsJsonAsync($"/api/plc/cambios/{idCambio}/aprobar", new { comentario = "Revisado en la prueba aislada" })).StatusCode);
        Assert.Equal("resuelta", (await Falla(fid)).GetProperty("estadoFisico").GetString());
    }

    [Fact]
    public async Task ReiniciarElEscenarioRestauraLasCondicionesIniciales()
    {
        var control = Control();
        var r = await control.PostAsJsonAsync("/api/ingesta/simulacion/fallas", new { equipo = "RB-01", tipo = "falla_variador", modo = "intermitente", periodoSeg = 60 });
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var prog = await control.PostAsJsonAsync("/api/ingesta/simulacion/fallas", new { equipo = "IN-03", tipo = "vibracion_anormal", retardoMin = 30 });
        Assert.Equal("programada", (await Json(prog)).GetProperty("estadoFisico").GetString());
        var res = await Json(await control.PostAsync("/api/ingesta/simulacion/reiniciar", null));
        Assert.True(res.GetProperty("canceladas").GetInt32() >= 2);
        var jm = await f.Entrar("jefe.mantenimiento", "Jefemant2026", "app");
        Assert.Equal("operativo", (await f.Leer(jm, "/api/equipos/RB-01")).GetProperty("equipo").GetProperty("estado").GetString());
        Assert.DoesNotContain((await f.Leer(control, "/api/ingesta/simulacion/fallas")).EnumerateArray(), x => x.GetProperty("estadoFisico").GetString() is "activa" or "programada" or "latente");
    }
}
