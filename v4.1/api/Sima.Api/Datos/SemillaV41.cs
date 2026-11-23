using Microsoft.EntityFrameworkCore;
using Sima.Api.Dominio;

namespace Sima.Api.Datos;

/// <summary>Documentación técnica, lista de repuestos por equipo e historial de intervenciones (datos ficticios de demostración).</summary>
public static class SemillaV41
{
    static readonly Dictionary<string, (string titulo, string pasos)[]> Docs = new()
    {
        ["Torno CNC"] = new[]
        {
            ("Cambio de rodamientos del husillo", "1. Detenga el torno y aplique bloqueo LOTO en el tablero principal.\n2. Retire la cubierta trasera y la correa del husillo.\n3. Mida la vibración de referencia con el analizador (anote el valor).\n4. Extraiga los rodamientos con el extractor hidráulico, sin golpear la pista.\n5. Caliente los rodamientos nuevos a 80 °C con inducción y móntelos.\n6. Ajuste la precarga según la ficha del fabricante.\n7. Gire a mano: debe correr suave y sin ruido.\n8. Retire el bloqueo, haga una prueba en vacío 10 minutos y verifique vibración < 2,5 mm/s."),
            ("Lubricación semanal", "1. Verifique el nivel del depósito de lubricación centralizada.\n2. Rellene con aceite ISO 68 si está bajo el mínimo.\n3. Limpie la viruta acumulada en guías y bancada.\n4. Registre la tarea en SIMA Desktop."),
        },
        ["Centro de mecanizado CNC"] = new[] { ("Alineación del cabezal de 5 ejes", "1. Bloqueo LOTO.\n2. Monte el reloj comparador en el husillo.\n3. Mida la perpendicularidad en X e Y.\n4. Corrija con los tornillos de ajuste del cabezal.\n5. Ejecute el ciclo de calibración automático del control.\n6. Registre los valores finales.") },
        ["Prensa hidráulica"] = new[] { ("Cambio de aceite hidráulico", "1. Baje el carro a su posición inferior y bloquee.\n2. Despresurice el circuito y verifique 0 bar en el manómetro.\n3. Drene el depósito (aceite ISO 46).\n4. Cambie el filtro de retorno.\n5. Llene con aceite nuevo filtrado.\n6. Purgue el aire con ciclos lentos en vacío.\n7. Verifique fugas y temperatura de operación < 60 °C.") },
        ["Inyectora de plástico"] = new[]
        {
            ("Cambio de resistencia de calefacción", "1. Apague la calefacción y espere < 50 °C.\n2. Aplique bloqueo eléctrico.\n3. Mida continuidad de cada resistencia (220 V, 500 W).\n4. Reemplace la resistencia abierta.\n5. Verifique el termopar de esa zona.\n6. Encienda y compruebe que alcanza la temperatura sin sobrepaso."),
            ("Limpieza del molde", "1. Abra el molde en posición de mantenimiento.\n2. Retire residuos con espátula de bronce.\n3. Limpie salidas de gas.\n4. Aplique desmoldante y registre la tarea."),
        },
        ["Cinta transportadora"] = new[] { ("Tensado y alineación de la banda", "1. Detenga la cinta y aplique bloqueo LOTO.\n2. Verifique el desgaste de la banda y los rodillos.\n3. Ajuste los tensores en pasos iguales a ambos lados.\n4. Haga funcionar a baja velocidad y observe el desvío.\n5. Corrija con el rodillo guía hasta centrar la banda.\n6. Verifique la corriente del motor (< 8 A).") },
        ["Envasadora automática"] = new[]
        {
            ("Calibración de la válvula de llenado", "1. Ponga la envasadora en modo manual.\n2. Llene 10 envases de prueba y pese cada uno.\n3. Ajuste el tiempo de apertura de la válvula hasta llegar al peso nominal ± 1 %.\n4. Verifique el sensor de nivel y el sensor de presencia.\n5. Vuelva a modo automático y registre la calibración."),
            ("Cambio de mordaza de sellado", "1. Apague y espere el enfriamiento de la mordaza.\n2. Bloqueo LOTO.\n3. Retire la mordaza y limpie el teflón.\n4. Monte la nueva y ajuste la presión de aire a 6 bar.\n5. Pruebe el sellado con 5 envases."),
        },
        ["Robot industrial articulado"] = new[] { ("Respaldo y verificación de ejes", "1. Respalde el programa del controlador.\n2. Con el robot en modo T1, verifique la posición cero de cada eje.\n3. Revise los cables del brazo por desgaste.\n4. Engrase reductores según plan.\n5. Pruebe la celda con las puertas cerradas.") },
        ["Máquina de soldadura MIG/MAG"] = new[] { ("Cambio de tobera y tubo de contacto", "1. Apague la fuente y desconecte.\n2. Retire la tobera y el tubo de contacto desgastados.\n3. Limpie salpicaduras con pinza.\n4. Monte el tubo del diámetro del alambre (1,0 mm).\n5. Pruebe un cordón y revise el arco.") },
        ["Compresor de aire industrial"] = new[] { ("Cambio de filtro de aceite y separador", "1. Detenga el compresor y descargue el estanque.\n2. Bloqueo LOTO.\n3. Cambie el filtro de aceite (GA75) y el elemento separador.\n4. Revise el nivel de aceite.\n5. Arranque y verifique temperatura de descarga < 100 °C y presión 8 bar.") },
        ["Bomba centrífuga"] = new[] { ("Cambio de sello mecánico", "1. Cierre las válvulas de succión y descarga.\n2. Bloqueo LOTO del motor.\n3. Drene la carcasa.\n4. Desmonte el acople y el impulsor.\n5. Reemplace el sello mecánico de 35 mm.\n6. Monte, alinee el acople con láser y verifique fugas.") },
    };

    static readonly Dictionary<string, string[]> RepuestosPorTipo = new()
    {
        ["Torno CNC"] = new[] { "RP-001", "RP-003", "RP-008", "RP-015", "RP-019" },
        ["Centro de mecanizado CNC"] = new[] { "RP-001", "RP-004", "RP-008", "RP-013", "RP-019" },
        ["Prensa hidráulica"] = new[] { "RP-012", "RP-014", "RP-016", "RP-009" },
        ["Inyectora de plástico"] = new[] { "RP-020", "RP-011", "RP-014", "RP-010" },
        ["Cinta transportadora"] = new[] { "RP-002", "RP-003", "RP-013", "RP-015" },
        ["Envasadora automática"] = new[] { "RP-006", "RP-017", "RP-018", "RP-013" },
        ["Robot industrial articulado"] = new[] { "RP-008", "RP-015", "RP-013" },
        ["Máquina de soldadura MIG/MAG"] = new[] { "RP-008", "RP-010" },
        ["Compresor de aire industrial"] = new[] { "RP-006", "RP-007", "RP-002", "RP-012" },
        ["Bomba centrífuga"] = new[] { "RP-005", "RP-002", "RP-011" },
    };

    public static async Task CargarAsync(SimaDb db, CancellationToken ct = default)
    {
        if (await db.Documentos.AnyAsync(ct) || !await db.Equipos.AnyAsync(ct)) return;
        foreach (var (tipo, docs) in Docs)
        {
            foreach (var (titulo, pasos) in docs) db.Documentos.Add(new Documento { TipoEquipo = tipo, Titulo = titulo, Clase = "procedimiento", Version = "1.2", Contenido = pasos });
            db.Documentos.Add(new Documento { TipoEquipo = tipo, Titulo = "Bloqueo y etiquetado (LOTO)", Clase = "seguridad", Version = "2.0", Contenido = "1. Avise al supervisor y al operador del equipo.\n2. Detenga el equipo con el procedimiento normal.\n3. Abra el seccionador principal y coloque su candado personal.\n4. Instale la tarjeta con su nombre, fecha y motivo.\n5. Libere energías residuales (aire, aceite, resortes).\n6. Intente arrancar: el equipo no debe responder.\n7. Solo quien puso el candado puede retirarlo." });
            db.Documentos.Add(new Documento { TipoEquipo = tipo, Titulo = $"Ficha técnica · {tipo}", Clase = "ficha", Version = "1.0", Contenido = $"Tipo: {tipo}.\nAlimentación: 380 V trifásico, 50 Hz.\nMantenimiento preventivo: cada 500 horas de operación.\nInspección visual: al inicio de cada turno." });
        }
        var equipos = await db.Equipos.AsNoTracking().ToListAsync(ct);
        var repuestos = await db.Repuestos.AsNoTracking().ToDictionaryAsync(r => r.Codigo, r => r.Id, ct);
        foreach (var e in equipos)
            if (RepuestosPorTipo.TryGetValue(e.Tipo, out var cods))
                foreach (var c in cods.Where(repuestos.ContainsKey)) db.EquipoRepuestos.Add(new EquipoRepuesto { EquipoId = e.Id, RepuestoId = repuestos[c], CantidadSugerida = c is "RP-015" or "RP-019" ? 4 : 1 });

        // historial: órdenes cerradas con su intervención
        var tecnicos = await db.Trabajadores.AsNoTracking().Include(t => t.Cargo).Where(t => t.Cargo!.PerfilSima == "tecnico").ToListAsync(ct);
        if (tecnicos.Count > 0)
        {
            var rnd = new Random(41);
            var causas = new[] { ("mecanica", "Rodamiento con juego excesivo", "Se reemplazó el rodamiento y se verificó vibración."), ("electrica", "Contactor con contactos picados", "Se cambió el contactor y se apretaron bornes."), ("hidraulica", "Fuga en manguera de alta presión", "Se reemplazó la manguera y se purgó el circuito."), ("neumatica", "Electroválvula trabada", "Se limpió y se reemplazó la bobina."), ("desgaste", "Correa con grietas", "Se cambió la correa y se tensó según ficha.") };
            foreach (var e in equipos.Take(10))
            {
                for (var k = 0; k < 2; k++)
                {
                    var (causa, diag, accion) = causas[rnd.Next(causas.Length)];
                    var t = tecnicos[rnd.Next(tecnicos.Count)];
                    var ini = DateTime.UtcNow.AddDays(-rnd.Next(5, 80)).AddHours(-rnd.Next(0, 10));
                    var ot = new OrdenTrabajo { EquipoId = e.Id, Titulo = k == 0 ? $"Preventiva de {e.Nombre}" : $"Falla en {e.Nombre}", Descripcion = diag, Prioridad = k == 0 ? "media" : "alta", Tipo = k == 0 ? "preventiva" : "correctiva", Estado = "cerrada", AsignadoAId = t.Id, LotoConfirmado = true, Creada = ini.AddHours(-2), Cerrada = ini.AddHours(2.5) };
                    db.Ordenes.Add(ot);
                    await db.SaveChangesAsync(ct);
                    db.Intervenciones.Add(new Intervencion { OrdenId = ot.Id, TecnicoId = t.Id, TecnicoNombre = $"{t.Nombres} {t.ApellidoPaterno}", Inicio = ini, Fin = ini.AddHours(1 + rnd.NextDouble() * 2), Causa = causa, Diagnostico = diag, Accion = accion, Resultado = "resuelto", Registrada = ini.AddHours(2.5) });
                }
            }
        }
        await db.SaveChangesAsync(ct);
    }
}
