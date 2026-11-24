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

/// <summary>Escenario C: asignación desde el calendario con disponibilidad, instrucciones, recepción, bitácora y aviso al completar.</summary>
[Collection("api")]
public class PruebasPlanificacion(Fabrica f)
{
    static async Task<JsonElement> Json(HttpResponseMessage r) => await r.Content.ReadFromJsonAsync<JsonElement>();

    [Fact]
    public async Task EscenarioC_AsignacionConInstruccionesLlegaAlTecnicoYElJefeRecibeLosAvances()
    {
        var jm = await f.Entrar("jefe.mantenimiento", "Jefemant2026", "app");
        var tec = await f.Entrar("tecnico", "Tecnico2026", "app");
        var idTec = (await f.Leer(tec, "/api/auth/yo")).GetProperty("id").GetString()!;
        var turno = (await f.Leer(jm, "/api/calendario/tecnicos")).EnumerateArray().First(t => t.GetProperty("id").GetString() == idTec).GetProperty("turno").GetString();
        var r = await jm.PostAsJsonAsync("/api/ordenes", new { equipo = "EV-02", titulo = "Cambio de sellos de las válvulas de llenado", prioridad = "media", tipo = "preventiva", especialidad = "mecanica" });
        var ot = (await Json(r)).GetProperty("id").GetInt32();
        var version = (await f.Leer(jm, $"/api/ordenes/{ot}")).GetProperty("version").GetUInt32();
        // un horario dentro del turno del técnico, mañana
        var hora = turno switch { "A" => 9, "B" => 16, "N" => 23, _ => 10 };
        var dia = DateTime.UtcNow.Date.AddDays(1); while (turno is "D" or null && dia.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) dia = dia.AddDays(1);
        var inicio = DateTime.SpecifyKind(dia.AddHours(hora + 3), DateTimeKind.Utc);       // Chile UTC-3
        var cuerpo = new { version, responsableId = idTec, colaboradores = Array.Empty<string>(), inicio, duracionMin = 90, especialidad = "mecanica", instrucciones = "Usar el kit de sellos KS-12 y torquear a 25 N·m. Probar 20 ciclos.", pruebas = "20 ciclos sin fugas", resultados = "Válvulas sin goteo", confirmar = false };
        var a = await jm.PostAsJsonAsync($"/api/ordenes/{ot}/asignar", cuerpo);
        Assert.True(a.StatusCode is HttpStatusCode.OK, await a.Content.ReadAsStringAsync());

        // una segunda tarea en el mismo horario: el sistema avisa el conflicto y sugiere horarios antes de confirmar
        var r2 = await jm.PostAsJsonAsync("/api/ordenes", new { equipo = "EV-02", titulo = "Inspección de mordazas", prioridad = "baja" });
        var ot2 = (await Json(r2)).GetProperty("id").GetInt32();
        var v2 = (await f.Leer(jm, $"/api/ordenes/{ot2}")).GetProperty("version").GetUInt32();
        var choque = await jm.PostAsJsonAsync($"/api/ordenes/{ot2}/asignar", cuerpo with { version = v2, instrucciones = "" });
        Assert.Equal(HttpStatusCode.Conflict, choque.StatusCode);
        var cj = await Json(choque);
        Assert.True(cj.GetProperty("requiereConfirmacion").GetBoolean());
        Assert.Contains(cj.GetProperty("conflictos").EnumerateArray(), c => c.GetProperty("tipo").GetString() == "solape");
        Assert.True(cj.GetProperty("sugerencias").GetArrayLength() > 0);
        // sin habilitación vigente no se asigna (confiabilidad tiene LOTO vencida en el Excel)
        var conf = await f.Entrar("confiabilidad", "Confiabilidad2026", "app");
        var idConf = (await f.Leer(conf, "/api/auth/yo")).GetProperty("id").GetString()!;
        var bloq = await jm.PostAsJsonAsync($"/api/ordenes/{ot2}/asignar", cuerpo with { version = v2, responsableId = idConf, confirmar = true, instrucciones = "" });
        Assert.Equal(HttpStatusCode.Conflict, bloq.StatusCode);
        Assert.False((await Json(bloq)).GetProperty("requiereConfirmacion").GetBoolean());

        // el técnico ve la tarea con sus instrucciones y confirma la recepción; el jefe recibe el aviso
        var det = await f.Leer(tec, $"/api/ordenes/{ot}");
        Assert.Contains("KS-12", det.GetProperty("planificacion").GetProperty("instrucciones").GetString());
        Assert.Contains((await f.Leer(tec, "/api/notificaciones")).GetProperty("items").EnumerateArray(), n => n.GetProperty("texto").GetString()!.Contains("Se le asignó") && n.GetProperty("texto").GetString()!.Contains("instrucciones"));
        Assert.Equal(HttpStatusCode.Created, (await tec.PostAsJsonAsync($"/api/ordenes/{ot}/bitacora", new { tipo = "recepcion", texto = "" })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await tec.PostAsJsonAsync($"/api/ordenes/{ot}/bitacora", new { tipo = "recursos", texto = "Necesito el kit KS-12: en pañol no aparece" })).StatusCode);
        // el técnico no puede escribir instrucciones; la jefatura sí responde
        Assert.Equal(HttpStatusCode.Forbidden, (await tec.PostAsJsonAsync($"/api/ordenes/{ot}/bitacora", new { tipo = "instruccion", texto = "x" })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await jm.PostAsJsonAsync($"/api/ordenes/{ot}/bitacora", new { tipo = "instruccion", texto = "Use el kit equivalente KS-12B aprobado" })).StatusCode);
        var notJefe = (await f.Leer(jm, "/api/notificaciones")).GetProperty("items").EnumerateArray().Select(n => n.GetProperty("texto").GetString()!).ToList();
        Assert.Contains(notJefe, t => t.Contains("recepción confirmada"));
        Assert.Contains(notJefe, t => t.Contains("solicitud de recursos"));

        // inicio y término quedan en la bitácora y el jefe es avisado al completar
        Assert.Equal(HttpStatusCode.OK, (await tec.PostAsJsonAsync($"/api/ordenes/{ot}/tomar", new { lotoConfirmado = true })).StatusCode);
        await Fabrica.Probar(tec, ot);
        Assert.Equal(HttpStatusCode.OK, (await tec.PostAsJsonAsync($"/api/ordenes/{ot}/cerrar", new { lotoRetirado = true, nota = "Sellos cambiados" })).StatusCode);
        var bit = (await f.Leer(jm, $"/api/ordenes/{ot}/bitacora")).EnumerateArray().Select(x => x.GetProperty("tipo").GetString()).ToList();
        Assert.Equal(new[] { "instruccion", "recepcion", "recursos", "instruccion", "inicio", "completada" }, bit);
        Assert.Contains((await f.Leer(jm, "/api/notificaciones")).GetProperty("items").EnumerateArray(), n => n.GetProperty("texto").GetString()!.Contains("completó su intervención"));
        // el calendario muestra la actividad completada; quien no es del área la ve como «ocupado»
        var cal = await f.Leer(jm, $"/api/calendario?desde={dia:yyyy-MM-dd}&hasta={dia.AddDays(2):yyyy-MM-dd}");
        Assert.Contains(cal.EnumerateArray(), x => x.GetProperty("ordenId").ValueKind == JsonValueKind.Number && x.GetProperty("ordenId").GetInt32() == ot && x.GetProperty("estado").GetString() == "completada");
        var rrhh = await f.Entrar("rrhh", "Rrhh2026", "web");
        var calRrhh = await f.Leer(rrhh, $"/api/calendario?desde={dia:yyyy-MM-dd}&hasta={dia.AddDays(2):yyyy-MM-dd}");
        Assert.All(calRrhh.EnumerateArray().Where(x => x.GetProperty("area").GetString() == "mantenimiento"), x => Assert.Equal("Ocupado", x.GetProperty("titulo").GetString()));
    }
}
