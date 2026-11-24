using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Sima.Api.Dominio;
using Sima.Api.Servicios;

namespace Sima.Api.Datos;

/// <summary>
/// Datos de demostración de los módulos de la v4 (ficticios, como el resto de la base): órdenes de producción con lo que
/// informaron los operadores, no conformidades, eventos de seguridad, un cambio de PLC esperando aprobación y la nómina
/// del último período preparada y lista para la segunda firma.
/// </summary>
public static class SemillaV4
{
    static readonly Dictionary<string, string[]> Productos = new()
    {
        ["Línea 1 · Mecanizado"] = new[] { "Eje de transmisión 40 mm", "Buje de bronce B-12", "Brida mecanizada DN80" },
        ["Línea 2 · Conformado"] = new[] { "Soporte estampado S-200", "Bastidor soldado BX-3", "Pallet de piezas conformadas" },
        ["Línea 3 · Inyección"] = new[] { "Tapa PP 38 mm", "Carcasa ABS C-7", "Conector PA6 negro" },
        ["Línea 4 · Envasado"] = new[] { "Caja x24 tapas", "Pack termo-sellado x12", "Display de exhibición" },
    };
    static readonly string[] Motivos = { "Rebaba", "Medida fuera de tolerancia", "Rechupe", "Mancha o color", "Golpe en manipulación", "Sellado incompleto" };

    public static async Task CargarAsync(SimaDb db, CancellationToken ct = default)
    {
        if (await db.OrdenesProduccion.AnyAsync(ct) || !await db.Equipos.AnyAsync(ct) || !await db.Trabajadores.AnyAsync(ct)) return;
        var rnd = new Random(2611);
        var claves = Productos.Keys.ToList();
        var equipos = await db.Equipos.AsNoTracking().Include(e => e.Linea).Where(e => claves.Contains(e.Linea!.Nombre)).OrderBy(e => e.Codigo).ToListAsync(ct);
        var operadores = await db.Trabajadores.AsNoTracking().Include(t => t.Cargo).Where(t => t.Cargo!.PerfilSima == "operador").ToListAsync(ct);
        var est = await Reglas.CalcularTodosAsync(db);
        operadores = operadores.Where(o => est[o.Id].EstadoLaboral == "Activo").ToList();
        var ahora = DateTime.UtcNow;
        var n = 0;

        // ---- órdenes de producción: últimos 10 días terminadas, hoy en curso y planificadas
        foreach (var e in equipos.Where(e => e.Tipo is not "Cinta transportadora" and not "Robot industrial articulado"))
        {
            var prods = Productos[e.Linea!.Nombre];
            var turnosHoy = new[] { "D", "A", "B", "N" };
            var idx = equipos.IndexOf(e);
            for (var d = 9; d >= -1; d--)
            {
                // días anteriores: turnos D y A terminados · hoy (d = 0): una orden en curso por equipo, rotando los turnos · d = -1: la siguiente, planificada
                foreach (var turno in d > 0 ? new[] { "D", "A" } : new[] { turnosHoy[idx % turnosHoy.Length] })
                {
                    n++;
                    var cant = rnd.Next(4, 12) * 50;
                    var inicio = d > 0 ? ahora.Date.AddDays(-d).AddHours(turno == "D" ? 11 + rnd.Next(0, 2) : 19 + rnd.Next(0, 2)) : d == 0 ? ahora.AddHours(-2 - rnd.NextDouble() * 3) : ahora.AddHours(6);
                    var enCurso = d == 0;
                    var futura = d < 0;
                    var o = new OrdenProduccion
                    {
                        Codigo = $"OP-{inicio:yyMM}-{n:000}", Producto = prods[rnd.Next(prods.Length)], Lote = $"L{inicio:yyMMdd}-{n:000}", EquipoId = e.Id, Turno = turno,
                        Cantidad = cant, Creada = inicio.AddHours(-20), CreadaPor = rnd.Next(2) == 0 ? "Rodrigo Mena" : "Planificación de producción (PPC)",
                        Estado = futura ? "planificada" : enCurso ? "en_curso" : "terminada", Inicio = futura ? null : inicio, Fin = futura || enCurso ? null : inicio.AddHours(7.5),
                    };
                    db.OrdenesProduccion.Add(o);
                    await db.SaveChangesAsync(ct);
                    if (futura) continue;
                    var horas = enCurso ? Math.Max(1, (int)(ahora - inicio).TotalHours) : 7;
                    var turnoOps = operadores.Where(x => x.Turno == turno).ToList();
                    if (turnoOps.Count == 0) turnoOps = operadores;
                    var meta = enCurso ? cant * horas / 8 : (int)(cant * (0.86 + rnd.NextDouble() * 0.16));
                    for (var h = 0; h < horas; h++)
                    {
                        var piezas = Math.Max(1, meta / horas + rnd.Next(-8, 9));
                        var malas = rnd.NextDouble() < 0.55 ? rnd.Next(0, Math.Max(2, piezas / 30)) : 0;
                        var op = turnoOps[(n + h) % turnoOps.Count];
                        db.RegistrosProduccion.Add(new RegistroProduccion { OrdenId = o.Id, OperadorId = op.Id, OperadorNombre = $"{op.Nombres} {op.ApellidoPaterno}", Fecha = inicio.AddHours(h + 0.9), Conformes = piezas - malas, Rechazo = malas, Motivo = malas > 0 ? Motivos[rnd.Next(Motivos.Length)] : "" });
                        o.Producidas += piezas; o.Buenas += piezas - malas;
                    }
                }
            }
        }
        await db.SaveChangesAsync(ct);

        // ---- no conformidades
        var inspectores = await db.Trabajadores.AsNoTracking().Include(t => t.Cargo).Where(t => t.Cargo!.PerfilSima == "calidad_terreno").ToListAsync(ct);
        var ops = await db.OrdenesProduccion.AsNoTracking().Where(o => o.Estado != "planificada").OrderBy(o => o.Id).ToListAsync(ct);
        var tipos = new[] { "dimensional", "visual", "funcional", "material", "dimensional", "visual" };
        var descr = new Dictionary<string, string>
        {
            ["dimensional"] = "Diámetro exterior fuera de tolerancia (+0,08 mm) en muestreo de 20 piezas.", ["visual"] = "Manchas y rebaba visible en la cara A; afecta la apariencia del producto.",
            ["funcional"] = "La tapa no cierra con el torque especificado en 3 de 10 muestras.", ["material"] = "Lote de resina con humedad sobre lo especificado según certificado del proveedor.",
        };
        for (var i = 0; i < 14; i++)
        {
            var o = ops[rnd.Next(ops.Count)];
            var tipo = tipos[rnd.Next(tipos.Length)];
            var insp = inspectores[i % inspectores.Count];
            var fecha = ahora.AddDays(-rnd.Next(0, 28)).AddHours(-rnd.Next(0, 8));
            var estado = i < 3 ? "abierta" : i < 5 ? "en_analisis" : i < 11 ? "liberada" : "rechazada";
            db.NoConformidades.Add(new NoConformidad
            {
                Codigo = $"NC-{i + 1:0000}", Fecha = fecha, OrdenId = o.Id, EquipoId = o.EquipoId, Lote = o.Lote, Producto = o.Producto, Tipo = tipo, Severidad = i % 5 == 0 ? "critica" : i % 3 == 0 ? "mayor" : "menor",
                Descripcion = descr[tipo], Cantidad = rnd.Next(20, 240), Estado = estado, RegistradaPorId = insp.Id, RegistradaPor = $"{insp.Nombres} {insp.ApellidoPaterno}",
                Analisis = estado == "abierta" ? "" : "Causa probable: desgaste del molde / ajuste de parámetros. Se ajustó y se verificó en 30 piezas.",
                Disposicion = estado == "liberada" ? "Se libera tras reinspección al 100 %: piezas dentro de especificación." : estado == "rechazada" ? "Lote rechazado: se reprocesa la resina y se descartan las piezas." : "",
                ResueltaPor = estado is "liberada" or "rechazada" ? "Paula Araya" : null, FechaResolucion = estado is "liberada" or "rechazada" ? fecha.AddHours(rnd.Next(4, 40)) : null,
            });
        }

        // ---- seguridad y salud en el trabajo (sin datos clínicos)
        var zonas = new[] { "Nave 1 · Mecanizado", "Nave 2 · Plásticos", "Nave 3 · Envasado", "Sala de máquinas", "Bodega central", "Patio de carga" };
        var areaDe = await db.Areas.AsNoTracking().ToDictionaryAsync(a => a.Nombre, a => a.Id, ct);
        var eventos = new (string tipo, string sev, string texto, string control)[]
        {
            ("condicion_insegura", "leve", "Derrame de aceite cerca de la prensa sin señalizar.", "Se limpió y se puso cono de advertencia."),
            ("casi_accidente", "grave", "Grúa horquilla retrocede sin alarma sonora en pasillo peatonal.", "Equipo detenido hasta reparar la alarma."),
            ("condicion_insegura", "leve", "Guarda de la cinta CT-02 suelta.", "Se fijó provisoriamente y se pidió OT."),
            ("incidente", "leve", "Corte superficial al manipular rebaba sin guantes adecuados.", "Primeros auxilios en el lugar; se reforzó el uso de guantes anticorte."),
            ("casi_accidente", "grave", "Caída de caja desde estantería alta en bodega.", "Se reorganizó la estantería y se restringió la altura de apilado."),
            ("condicion_insegura", "leve", "Extintor con carga vencida en sala de máquinas.", "Se reemplazó por uno vigente."),
            ("accidente", "grave", "Golpe en la mano al cambiar matriz de la prensa sin bloqueo completo.", "Atención en mutualidad; se reforzó el procedimiento LOTO."),
            ("casi_accidente", "leve", "Piso resbaladizo por condensación en patio de carga.", "Se instaló alfombra antideslizante."),
            ("condicion_insegura", "leve", "Iluminación deficiente en pasillo norte de la Nave 2.", "Se solicitó cambio de luminarias."),
            ("incidente", "leve", "Proyección de viruta al ojo sin lesión; usaba lentes.", "Se revisó la protección de la máquina."),
        };
        var reportantes = await db.Trabajadores.AsNoTracking().Include(t => t.Cargo).Where(t => t.Cargo!.Canal == "app").Take(40).ToListAsync(ct);
        for (var i = 0; i < eventos.Length; i++)
        {
            var (tipo, sev, texto, control) = eventos[i];
            var r = reportantes[(i * 7) % reportantes.Count];
            var fecha = ahora.AddDays(-(i * 14 + rnd.Next(0, 9)));
            var estado = i < 2 ? "reportado" : i < 4 ? "investigacion" : "cerrado";
            db.IncidentesSst.Add(new IncidenteSst
            {
                Codigo = $"SST-{eventos.Length - i:0000}", Fecha = fecha, AreaId = areaDe[zonas[(i * 5) % zonas.Length]], Tipo = tipo, Severidad = sev, Descripcion = texto, ControlInmediato = control, Estado = estado,
                ReportadoPorId = r.Id, ReportadoPor = $"{r.Nombres} {r.ApellidoPaterno}", Responsable = estado == "reportado" ? null : "Patricia (Prevención de riesgos)",
                Cierre = estado == "cerrado" ? "Medidas implementadas y verificadas en terreno. Se difundió en charla de 5 minutos." : "", FechaCierre = estado == "cerrado" ? fecha.AddDays(rnd.Next(2, 9)) : null,
            });
        }

        // ---- un cambio de PLC esperando aprobación (lo preparó automatización; lo aprueba la jefatura)
        var plc = await db.Plcs.FirstOrDefaultAsync(p => p.Codigo == "PLC-02", ct);
        var ing = await db.Trabajadores.AsNoTracking().FirstOrDefaultAsync(t => t.Id == "T044", ct);
        if (plc is not null && ing is not null)
        {
            var prog = JsonSerializer.Deserialize<JsonElement>(plc.Programa);
            if (prog.TryGetProperty("peldanos", out var pel) && pel.GetArrayLength() > 0)
            {
                var lista = JsonSerializer.Deserialize<List<Dictionary<string, JsonElement>>>(pel.GetRawText())!;
                var primero = lista[0];
                primero["comentario"] = JsonSerializer.SerializeToElement((primero.TryGetValue("comentario", out var c) ? c.GetString() : "") + " · con confirmación de guarda cerrada");
                var nuevo = new { version = plc.VersionPrograma, variables = prog.TryGetProperty("variables", out var v) && v.ValueKind == JsonValueKind.Array ? v : (JsonElement?)null, peldanos = lista };
                db.CambiosPlc.Add(new CambioPlc
                {
                    PlcId = plc.Id, VersionBase = plc.VersionPrograma, Programa = JsonSerializer.Serialize(nuevo), Resumen = "1 peldaño modificado", Origen = "web",
                    Justificacion = "Agregar la confirmación de guarda cerrada antes de la marcha, según observación de Prevención (SST-0008).",
                    SolicitadoPorId = ing.Id, SolicitadoPor = $"{ing.Nombres} {ing.ApellidoPaterno}", Fecha = ahora.AddHours(-3),
                });
            }
        }

        // ---- nómina del último período: parámetros validados por Finanzas y cierre preparado por Remuneraciones
        var periodo = await db.Asistencias.AsNoTracking().MaxAsync(a => (string?)a.Periodo, ct);
        var analista = await db.Trabajadores.AsNoTracking().FirstOrDefaultAsync(t => t.Id == "T079", ct);
        var finanzas = await db.Trabajadores.AsNoTracking().FirstOrDefaultAsync(t => t.Id == "T090", ct);
        if (periodo is not null && analista is not null && finanzas is not null)
        {
            db.ValidacionesParametros.Add(new ValidacionParametros { Periodo = periodo, ValidadoPorId = finanzas.Id, ValidadoPor = $"{finanzas.Nombres} {finanzas.ApellidoPaterno}", Fecha = ahora.AddDays(-2), Nota = "UF, UTM, topes imponibles y tasas AFP revisados contra publicación oficial." });
            await db.SaveChangesAsync(ct);
            var liqs = await Liquidador.CalcularPeriodoAsync(db, periodo);
            db.CierresRemuneraciones.Add(new CierreRemuneraciones
            {
                Periodo = periodo, Personas = liqs.Count, TotalHaberes = liqs.Sum(l => (long)l.TotalHaberes), TotalLiquido = liqs.Sum(l => (long)l.LiquidoAPagar),
                PreparadoPorId = analista.Id, PreparadoPor = $"{analista.Nombres} {analista.ApellidoPaterno}", FechaPreparacion = ahora.AddHours(-20),
            });
        }
        await db.SaveChangesAsync(ct);
    }
}
