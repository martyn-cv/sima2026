using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Sima.Api.Datos;
using Sima.Api.Dominio;

namespace Sima.Api.Servicios;

public record CausaFalla(string Clave, string Texto, string Componente, string[] Acciones, string? Repuesto, string Pista);
public record EfectoVariable(string Patron, string Efecto);
public record TipoFalla(string Clave, string Titulo, string Grupo, string Sintomas, EfectoVariable[] Variables, string Especialidad, string Criticidad,
    string EstadoEquipo, double Rendimiento, string Impacto, CausaFalla[] Causas);

/// <summary>
/// Planta simulada: fallas ficticias que el controlador de simulación provoca sobre los activos de SIMA. El servidor es el
/// único dueño del estado: el simulador, SIMA Desktop y SIMA Web leen lo mismo y lo que cambia queda en la base de datos.
/// La causa real queda oculta para quien diagnostica: la falla solo se resuelve cuando una intervención coincide con ella
/// (componente, acción y repuesto). Nunca actúa sobre equipos conectados a un PLC físico.
/// </summary>
public static class Simulacion
{
    // ------------------------------------------------------------------------------------------------ catálogo
    public static readonly Dictionary<string, string> AccionesTexto = new()
    {
        ["reemplazo"] = "Reemplazo de componente", ["ajuste"] = "Ajuste o alineación", ["limpieza"] = "Limpieza", ["lubricacion"] = "Lubricación",
        ["reapriete"] = "Reapriete de fijaciones", ["reconexion"] = "Reconexión o cableado", ["calibracion"] = "Calibración", ["reprogramacion"] = "Reprogramación o parámetros",
    };

    public static readonly Dictionary<string, string> TiposComponente = new()
    {
        ["motor"] = "Motor", ["variador"] = "Variador de frecuencia", ["sensor"] = "Sensor o instrumento", ["actuador"] = "Actuador o válvula", ["bomba"] = "Bomba o sistema hidráulico",
        ["tablero"] = "Tablero eléctrico", ["plc"] = "PLC, módulos y comunicaciones", ["programa"] = "Programa del PLC", ["mecanico"] = "Transmisión mecánica",
    };

    public static readonly TipoFalla[] Catalogo =
    {
        new("sobrecalentamiento_motor", "Sobrecalentamiento de motor", "Eléctrica y mecánica", "Temperatura del motor en aumento sostenido y corriente sobre lo normal.",
            new[] { new EfectoVariable("temp", "sube"), new EfectoVariable("corr", "sube_leve") }, "electromecanica", "alta", "falla", 0.4, "La máquina se detiene por protección térmica.",
            new[] {
                new CausaFalla("rodamiento_danado", "Rodamiento del motor dañado", "motor", new[] { "reemplazo" }, "rodamiento", "Al girar el eje a mano se siente juego y un ruido metálico en el lado acople."),
                new CausaFalla("ventilacion_obstruida", "Ventilación del motor obstruida", "motor", new[] { "limpieza" }, null, "Las aletas y la rejilla del ventilador están cubiertas de polvo y viruta."),
                new CausaFalla("sobrecarga_desalineacion", "Sobrecarga por desalineación del acople", "mecanico", new[] { "ajuste" }, null, "El acople muestra marcas de roce y la alineación está fuera de tolerancia."),
            }),
        new("perdida_comunicacion_plc", "Pérdida de comunicación del PLC", "Automatización", "El equipo deja de informar: las variables quedan congeladas y el PLC no responde.",
            new[] { new EfectoVariable("*", "congelada") }, "automatizacion", "alta", "falla", 0, "Sin datos ni mando remoto: la máquina queda detenida por seguridad.",
            new[] {
                new CausaFalla("conector_red_suelto", "Conector de red suelto en el tablero", "plc", new[] { "reconexion" }, null, "El LED de enlace del puerto de red del PLC está apagado y el conector RJ45 se mueve."),
                new CausaFalla("modulo_comunicacion", "Módulo de comunicación dañado", "plc", new[] { "reemplazo" }, "modulo|tarjeta", "El módulo de comunicación tiene el LED de error fijo en rojo aunque el cable está bien."),
                new CausaFalla("direccion_ip", "Dirección de red mal configurada", "plc", new[] { "reprogramacion" }, null, "El PLC responde en la consola local pero con una dirección IP distinta a la del proyecto."),
            }),
        new("falla_sensor", "Falla de un sensor", "Instrumentación", "Una variable cae a cero o deja de tener sentido físico mientras la máquina opera.",
            new[] { new EfectoVariable("vib|pres|temp", "cero") }, "instrumentacion", "media", "falla", 0.5, "Se pierde una medición de control: la máquina opera con restricciones.",
            new[] {
                new CausaFalla("sensor_danado", "Sensor dañado", "sensor", new[] { "reemplazo" }, "sensor|transductor|termocupla|pt100", "Con el multímetro, el sensor no entrega señal (0 mA) aunque tiene alimentación."),
                new CausaFalla("cable_cortado", "Cable del sensor cortado", "sensor", new[] { "reconexion" }, null, "El cable del sensor está aplastado cerca del pasamuros; no hay continuidad."),
                new CausaFalla("sensor_descalibrado", "Sensor descalibrado", "sensor", new[] { "calibracion" }, null, "Comparado con el instrumento patrón, el sensor marca muy por debajo del valor real."),
            }),
        new("lectura_temperatura_incorrecta", "Lectura incorrecta de temperatura", "Instrumentación", "La temperatura salta entre valores sin relación con el proceso.",
            new[] { new EfectoVariable("temp", "erratica") }, "instrumentacion", "media", "operativo_obs", 0.85, "La máquina sigue, pero el control térmico no es confiable.",
            new[] {
                new CausaFalla("termocupla_descalibrada", "Termocupla descalibrada", "sensor", new[] { "calibracion" }, null, "Frente al termómetro patrón, la lectura tiene una diferencia variable de 15 a 30 °C."),
                new CausaFalla("termocupla_danada", "Termocupla con unión dañada", "sensor", new[] { "reemplazo" }, "termocupla|sensor|pt100", "La vaina de la termocupla está doblada y la resistencia del circuito cambia al moverla."),
                new CausaFalla("blindaje", "Interferencia por blindaje desconectado", "sensor", new[] { "reconexion" }, null, "La malla del cable de la termocupla no está conectada a tierra en el tablero."),
            }),
        new("presion_hidraulica_baja", "Presión hidráulica insuficiente", "Mecánica", "La presión no alcanza el valor de trabajo y los ciclos se alargan.",
            new[] { new EfectoVariable("pres", "baja") }, "mecanica", "alta", "falla", 0.3, "Ciclos incompletos y piezas fuera de especificación.",
            new[] {
                new CausaFalla("fuga_manguera", "Fuga en una manguera de alta presión", "bomba", new[] { "reemplazo" }, "manguera|sello|o-ring", "Hay aceite en el piso bajo la unidad hidráulica y una manguera húmeda en el racor."),
                new CausaFalla("filtro_saturado", "Filtro de succión saturado", "bomba", new[] { "reemplazo", "limpieza" }, "filtro", "El indicador de saturación del filtro está en rojo y la bomba hace ruido de cavitación."),
                new CausaFalla("bomba_desgastada", "Bomba con desgaste interno", "bomba", new[] { "reemplazo" }, "bomba", "La bomba calienta y el caudal medido es 40 % menor al nominal sin fugas visibles."),
            }),
        new("vibracion_anormal", "Vibraciones anormales", "Mecánica", "La vibración sube por sobre el límite de aviso y luego de alarma.",
            new[] { new EfectoVariable("vib", "sube") }, "mecanica", "media", "falla", 0.6, "Riesgo de daño mayor si sigue operando.",
            new[] {
                new CausaFalla("desbalanceo", "Desbalanceo del rotor o del plato", "mecanico", new[] { "ajuste" }, null, "El espectro muestra el pico a 1× la velocidad de giro, fase estable."),
                new CausaFalla("rodamiento_desgastado", "Rodamiento desgastado", "motor", new[] { "reemplazo" }, "rodamiento", "Ruido de rodadura áspero y picos de alta frecuencia en el espectro."),
                new CausaFalla("pernos_sueltos", "Pernos de anclaje sueltos", "mecanico", new[] { "reapriete" }, null, "Dos pernos de la base giran con la mano y la base se mueve al arrancar."),
            }),
        new("falla_variador", "Falla de variador de frecuencia", "Eléctrica", "El variador se detiene con código de error y la corriente del motor cae a cero.",
            new[] { new EfectoVariable("corr", "cero"), new EfectoVariable("vib", "cero") }, "electrica", "alta", "falla", 0, "La máquina queda detenida.",
            new[] {
                new CausaFalla("parametros_sobrecorriente", "Rampa de aceleración mal parametrizada", "variador", new[] { "reprogramacion" }, null, "El historial del variador muestra disparos por sobrecorriente justo al acelerar."),
                new CausaFalla("ventilador_variador", "Ventilador del variador detenido", "variador", new[] { "reemplazo" }, "ventilador", "El variador indica sobretemperatura y su ventilador no gira al energizarlo."),
                new CausaFalla("modulo_potencia", "Módulo de potencia dañado", "variador", new[] { "reemplazo" }, "variador|modulo", "Medición en la salida: una fase en cortocircuito con el variador desenergizado."),
            }),
        new("cinta_detenida", "Detención de cinta transportadora", "Mecánica", "La cinta no avanza aunque tiene orden de marcha.",
            new[] { new EfectoVariable("corr", "cero"), new EfectoVariable("vib", "cero") }, "mecanica", "alta", "falla", 0, "La línea se detiene aguas abajo.",
            new[] {
                new CausaFalla("correa_cortada", "Correa de transmisión cortada", "mecanico", new[] { "reemplazo" }, "correa|banda", "El motor gira libre pero el tambor no; la correa está cortada dentro de la guarda."),
                new CausaFalla("reductor_trabado", "Reductor trabado por falta de lubricación", "motor", new[] { "lubricacion", "reemplazo" }, null, "El reductor está caliente y el eje de salida no gira a mano; el visor de aceite está vacío."),
                new CausaFalla("termico_disparado", "Protección térmica disparada", "tablero", new[] { "ajuste", "reconexion" }, null, "En el tablero, el relé térmico del motor de la cinta está disparado y su ajuste está bajo la corriente nominal."),
            }),
        new("error_io_digital", "Error de entrada o salida digital", "Automatización", "Una señal digital no cambia aunque el elemento de campo sí actúa.",
            new[] { new EfectoVariable("*", "sin_efecto") }, "automatizacion", "media", "falla", 0.5, "La secuencia se detiene esperando una señal.",
            new[] {
                new CausaFalla("canal_digital_danado", "Canal del módulo de entradas dañado", "plc", new[] { "reemplazo" }, "modulo|tarjeta", "Con 24 V en el borne, el LED del canal no enciende; otros canales sí."),
                new CausaFalla("cableado_suelto", "Cable suelto en la bornera", "plc", new[] { "reconexion" }, null, "En la bornera X2 el conductor del sensor está fuera del borne."),
                new CausaFalla("fusible_modulo", "Fusible del grupo de entradas quemado", "tablero", new[] { "reemplazo" }, "fusible", "El portafusible del grupo de entradas 24 VDC está abierto."),
            }),
        new("error_io_analogica", "Error de entrada o salida analógica", "Instrumentación", "Una variable analógica queda fuera de escala o con ruido.",
            new[] { new EfectoVariable("pres|temp|corr", "erratica") }, "instrumentacion", "media", "operativo_obs", 0.8, "El control trabaja con una medición poco confiable.",
            new[] {
                new CausaFalla("lazo_descalibrado", "Lazo 4–20 mA descalibrado", "sensor", new[] { "calibracion" }, null, "Con el calibrador de lazos, 12 mA inyectados se leen como 15,8 mA en el PLC."),
                new CausaFalla("modulo_analogico", "Módulo analógico dañado", "plc", new[] { "reemplazo" }, "modulo|tarjeta", "El canal analógico lee lo mismo con el lazo abierto o cerrado."),
                new CausaFalla("blindaje_analogico", "Blindaje del lazo sin tierra", "sensor", new[] { "reconexion" }, null, "La malla del cable del transmisor está suelta en el tablero."),
            }),
        new("falla_actuador", "Falla de un actuador", "Electromecánica", "El actuador no completa su recorrido o lo hace lento.",
            new[] { new EfectoVariable("pres", "baja_leve") }, "electromecanica", "media", "falla", 0.4, "Ciclos incompletos.",
            new[] {
                new CausaFalla("valvula_solenoide", "Válvula solenoide pegada", "actuador", new[] { "reemplazo", "limpieza" }, "valvula|solenoide", "Con bobina energizada la válvula no conmuta; al golpearla, conmuta."),
                new CausaFalla("sellos_cilindro", "Sellos del cilindro gastados", "actuador", new[] { "reemplazo" }, "sello|cilindro|kit", "Se escucha escape de aire por el vástago y el cilindro baja solo."),
                new CausaFalla("bobina_quemada", "Bobina de la válvula quemada", "actuador", new[] { "reemplazo" }, "bobina|valvula|solenoide", "La bobina mide circuito abierto con el multímetro."),
            }),
        new("perdida_conectividad", "Pérdida de conectividad industrial", "Automatización", "El equipo pierde la red industrial: datos intermitentes o congelados.",
            new[] { new EfectoVariable("*", "congelada") }, "automatizacion", "media", "falla", 0.2, "Sin supervisión remota del equipo.",
            new[] {
                new CausaFalla("switch_industrial", "Switch industrial de la celda dañado", "plc", new[] { "reemplazo" }, "switch", "Los LED del switch de la celda están apagados aunque tiene 24 V."),
                new CausaFalla("cable_red", "Cable de red dañado", "plc", new[] { "reconexion", "reemplazo" }, "cable", "El certificador muestra un par abierto en el cable que baja al equipo."),
            }),
        new("error_logica_ladder", "Error de lógica en el programa", "Automatización", "La máquina no hace lo que el operador pide: una condición del programa no se cumple como debería.",
            Array.Empty<EfectoVariable>(), "automatizacion", "alta", "falla", 0, "La secuencia no arranca o se comporta distinto a lo esperado.",
            new[] { new CausaFalla("contacto_invertido", "Contacto invertido en un peldaño del programa", "programa", new[] { "reprogramacion" }, null, "En la vista en línea del PLC, un peldaño no se energiza aunque sus condiciones físicas están presentes.") }),
        new("bloqueo_maquina", "Bloqueo mecánico de la máquina", "Mecánica", "La máquina se traba: corriente alta y sin movimiento.",
            new[] { new EfectoVariable("corr", "sube"), new EfectoVariable("vib", "cero") }, "mecanica", "critica", "falla", 0, "Máquina detenida.",
            new[] {
                new CausaFalla("atasco_material", "Atasco de material en la zona de trabajo", "mecanico", new[] { "limpieza" }, null, "Hay material acumulado y comprimido en la guía de alimentación."),
                new CausaFalla("herramienta_rota", "Herramienta o inserto quebrado", "mecanico", new[] { "reemplazo" }, "inserto|herramienta|cuchilla", "El inserto está quebrado y un trozo quedó atrapado en el portaherramientas."),
                new CausaFalla("guia_desalineada", "Guía desalineada", "mecanico", new[] { "ajuste" }, null, "La guía lineal está desplazada 3 mm respecto de su marca de referencia."),
            }),
        new("rendimiento_reducido", "Disminución del rendimiento productivo", "Producción", "La máquina sigue operando pero produce menos piezas por hora.",
            new[] { new EfectoVariable("corr", "sube_leve") }, "mecanica", "baja", "operativo_obs", 0.6, "Producción al 60 % de la tasa nominal.",
            new[] {
                new CausaFalla("desgaste_herramienta", "Herramienta desgastada", "mecanico", new[] { "reemplazo" }, "inserto|herramienta|cuchilla", "El filo de la herramienta está redondeado y deja rebaba."),
                new CausaFalla("velocidad_mal_ajustada", "Velocidad de trabajo mal ajustada", "variador", new[] { "reprogramacion", "ajuste" }, null, "La frecuencia de trabajo del variador está fijada en 32 Hz en vez de 50 Hz."),
                new CausaFalla("lubricacion_insuficiente", "Lubricación insuficiente", "mecanico", new[] { "lubricacion" }, null, "Las guías están secas y el depósito de lubricación centralizada está vacío."),
            }),
        new("desgaste_componente", "Desgaste de componentes", "Mecánica", "Vibración y temperatura suben lentamente turno a turno.",
            new[] { new EfectoVariable("vib", "sube"), new EfectoVariable("temp", "sube_leve") }, "mecanica", "media", "falla", 0.7, "Si no se interviene, termina en falla.",
            new[] {
                new CausaFalla("rodamiento_fatiga", "Rodamiento con fatiga", "motor", new[] { "reemplazo" }, "rodamiento", "Pista exterior del rodamiento con descascarado visible al desmontar la tapa."),
                new CausaFalla("correa_gastada", "Correa gastada y destensada", "mecanico", new[] { "reemplazo", "ajuste" }, "correa|banda", "La correa tiene grietas transversales y desliza al arrancar."),
            }),
    };

    public static TipoFalla? Tipo(string clave) => Catalogo.FirstOrDefault(t => t.Clave == clave);
    static readonly JsonSerializerOptions Js = new(JsonSerializerDefaults.Web);
    static List<EfectoVariable> Efectos(FallaSimulada f) => JsonSerializer.Deserialize<List<EfectoVariable>>(f.Variables, Js) ?? new();
    public static List<string> Acciones(FallaSimulada f) => JsonSerializer.Deserialize<List<string>>(f.Acciones, Js) ?? new();
    public static readonly string[] Activas = { "activa", "latente" };
    static bool Coincide(string variable, string patron) => patron == "*" || patron.Split('|').Any(p => variable.Contains(p, StringComparison.OrdinalIgnoreCase));

    // ------------------------------------------------------------------------------------------------ efecto sobre las lecturas
    /// <summary>Fallas que hoy se manifiestan (las intermitentes solo en su fase activa), por equipo.</summary>
    public static async Task<Dictionary<int, List<FallaSimulada>>> ManifiestasAsync(SimaDb db, CancellationToken ct = default)
        => (await db.FallasSimuladas.AsNoTracking().Where(f => f.EstadoFisico == "activa").ToListAsync(ct)).GroupBy(f => f.EquipoId).ToDictionary(g => g.Key, g => g.ToList());

    /// <summary>Aplica a una lectura el efecto de las fallas activas del equipo (es lo que «mide» el sensor de la máquina averiada).</summary>
    public static double Afectar(double valor, Sensor s, IEnumerable<FallaSimulada> fallas)
    {
        foreach (var f in fallas)
            foreach (var ef in Efectos(f).Where(e => Coincide(s.Variable, e.Patron)))
            {
                var k = Math.Clamp(f.Severidad, 0, 1);
                var rango = s.EscalaMax - s.EscalaMin;
                valor = ef.Efecto switch
                {
                    "sube" => valor + k * Math.Max(0, s.Alarma * 1.12 - s.Nominal),
                    "sube_leve" => valor + k * Math.Max(0, (s.Aviso - s.Nominal) * 1.1),
                    "baja" => valor + k * ((s.EscalaMin + 0.12 * (s.Nominal - s.EscalaMin)) - valor),
                    "baja_leve" => valor - k * 0.25 * (s.Nominal - s.EscalaMin),
                    "erratica" => valor + k * (Random.Shared.NextDouble() - 0.5) * rango * 0.5,
                    "cero" => s.EscalaMin + (1 - k) * (valor - s.EscalaMin),
                    "congelada" => s.Ultimo ?? valor,
                    _ => valor,
                };
            }
        return Math.Clamp(valor, s.EscalaMin, s.EscalaMax);
    }

    // ------------------------------------------------------------------------------------------------ inyección
    public record Inyeccion(string Equipo, string Tipo, string? Causa, int? ComponenteId, string? Criticidad, string? Modo, double? RetardoMin, int? PeriodoSeg, int? DuracionSeg, string? Escenario, string? Por);

    public static async Task<(FallaSimulada? falla, string? error)> InyectarAsync(SimaDb db, IHubContext<PlantaHub> hub, Inyeccion e, CancellationToken ct = default)
    {
        var tipo = Tipo(e.Tipo);
        if (tipo is null) return (null, "Tipo de falla desconocido.");
        var eq = await db.Equipos.Include(x => x.Plc).Include(x => x.Componentes).Include(x => x.Sensores).FirstOrDefaultAsync(x => x.Codigo == e.Equipo, ct);
        if (eq is null) return (null, "No existe ese equipo.");
        // seguridad: el simulador nunca escribe sobre maquinaria conectada a un PLC físico
        if (eq.Plc?.Origen == "real") return (null, $"{eq.Codigo} está conectado a un PLC físico: las fallas simuladas solo se aplican a la planta simulada.");
        if (tipo.Clave == "error_logica_ladder" && eq.Plc is null) return (null, "El equipo no tiene un PLC simulado donde provocar un error de lógica.");
        var causa = tipo.Causas.FirstOrDefault(c => c.Clave == e.Causa) ?? tipo.Causas[Random.Shared.Next(tipo.Causas.Length)];
        // componente afectado: el indicado, o uno del tipo que corresponde a la causa
        var comp = e.ComponenteId is { } cid ? eq.Componentes.FirstOrDefault(c => c.Id == cid) : null;
        if (e.ComponenteId is not null && comp is null) return (null, "Ese componente no pertenece al equipo.");
        comp ??= eq.Componentes.Where(c => c.Tipo == causa.Componente).OrderBy(c => c.Id).FirstOrDefault();
        var compTipo = comp?.Tipo ?? causa.Componente;
        int? repuestoId = null;
        if (causa.Repuesto is { } rx)
        {
            var re = new Regex(rx, RegexOptions.IgnoreCase);
            var compatibles = await db.EquipoRepuestos.Where(x => x.EquipoId == eq.Id).Select(x => x.RepuestoId).ToListAsync(ct);
            var lista = await db.Repuestos.AsNoTracking().ToListAsync(ct);
            repuestoId = lista.Where(r => compatibles.Contains(r.Id) && re.IsMatch(r.Nombre)).Select(r => (int?)r.Id).FirstOrDefault()
                ?? lista.Where(r => re.IsMatch(r.Nombre)).Select(r => (int?)r.Id).FirstOrDefault();
        }
        var modo = e.Modo is "intermitente" or "progresiva" ? e.Modo : "inmediata";
        var f = new FallaSimulada
        {
            EquipoId = eq.Id, ComponenteId = comp?.Id, ComponenteTipo = compTipo, Tipo = tipo.Clave, Causa = causa.Texto, CausaClave = causa.Clave,
            Sintomas = tipo.Sintomas, Criticidad = e.Criticidad is "baja" or "media" or "alta" or "critica" ? e.Criticidad : tipo.Criticidad, Modo = modo,
            Variables = JsonSerializer.Serialize(tipo.Variables, Js), Impacto = tipo.Impacto, FactorRendimiento = tipo.Rendimiento, Especialidad = tipo.Especialidad,
            Acciones = JsonSerializer.Serialize(causa.Acciones, Js), RepuestoId = repuestoId, RepuestoClave = causa.Repuesto ?? "", EstadoEquipo = tipo.EstadoEquipo,
            PeriodoSeg = Math.Clamp(e.PeriodoSeg ?? 120, 20, 3600), DuracionSeg = Math.Clamp(e.DuracionSeg ?? 600, 30, 86_400), Escenario = e.Escenario, CreadaPor = e.Por ?? "Controlador de simulación",
        };
        if (e.RetardoMin is > 0) { f.InicioProgramado = DateTime.UtcNow.AddMinutes(e.RetardoMin.Value); f.EstadoFisico = "programada"; }
        db.FallasSimuladas.Add(f);
        await db.SaveChangesAsync(ct);
        Eventos.Agregar(db, "falla_simulada", "aviso", $"{f.Codigo}: {tipo.Titulo} en {eq.Codigo} ({(f.InicioProgramado is null ? modo : $"programada {f.InicioProgramado:HH:mm} UTC")})", "simulador", true, eq.Id, eq.PlcId,
            datos: new { falla = f.Codigo, tipo = f.Tipo, modo });
        await db.SaveChangesAsync(ct);
        if (f.InicioProgramado is null) await ManifestarAsync(db, hub, f, ct);
        return (f, null);
    }

    /// <summary>La falla empieza a notarse: estado del equipo, alarma, error de lógica en el programa e incidencia para mantenimiento.</summary>
    static async Task ManifestarAsync(SimaDb db, IHubContext<PlantaHub> hub, FallaSimulada f, CancellationToken ct)
    {
        var eq = await db.Equipos.Include(x => x.Sensores).Include(x => x.Plc).FirstAsync(x => x.Id == f.EquipoId, ct);
        var tipo = Tipo(f.Tipo)!;
        var primera = f.Inicio is null;
        f.Inicio ??= DateTime.UtcNow;
        f.EstadoFisico = "activa";
        f.Severidad = f.Modo == "progresiva" ? Math.Max(f.Severidad, 0.05) : 1;
        var avisos = new List<(string, object)>();
        if (primera && f.Tipo == "error_logica_ladder" && eq.Plc is not null) AlterarPrograma(eq.Plc, eq, f);
        var estado = f.Modo == "progresiva" && f.Severidad < 1 ? EstadosEquipo.OperativoObs : f.EstadoEquipo;
        if (!EstadosEquipo.Protegido(eq.Estado))
            EstadosEquipo.Cambiar(db, eq, estado, "simulador", true, f.Sintomas, avisos: avisos);
        // alarma visible para la operación (con los síntomas, nunca con la causa)
        if (f.AlarmaId is null && eq.Sensores.FirstOrDefault() is { } sen)
        {
            var al = new Alarma { EquipoId = eq.Id, SensorId = sen.Id, Nivel = estado == EstadosEquipo.Falla ? "alarma" : "aviso", Mensaje = $"{eq.Nombre}: {f.Sintomas}", Simulado = true };
            db.Alarmas.Add(al);
            await db.SaveChangesAsync(ct);
            f.AlarmaId = al.Id;
            avisos.Add(("alarma", new { equipo = eq.Codigo, nivel = al.Nivel, mensaje = al.Mensaje, abierta = true, simulado = true }));
        }
        // incidencia: orden de trabajo correctiva con los síntomas y la especialidad que corresponde
        if (f.OrdenId is null)
        {
            var abierta = await db.Ordenes.Where(o => o.EquipoId == eq.Id && o.Automatica && o.Estado != "cerrada").OrderByDescending(o => o.Id).FirstOrDefaultAsync(ct);
            if (abierta is null)
            {
                abierta = new OrdenTrabajo
                {
                    EquipoId = eq.Id, Titulo = $"{tipo.Titulo} · {eq.Nombre}", Descripcion = $"Síntomas observados: {f.Sintomas}\nImpacto: {f.Impacto}",
                    Prioridad = f.Criticidad == "critica" ? "critica" : f.Criticidad == "alta" ? "alta" : f.Criticidad == "baja" ? "baja" : "media",
                    Automatica = true, Simulada = true, Especialidad = f.Especialidad, Tipo = "correctiva",
                };
                db.Ordenes.Add(abierta);
                await db.SaveChangesAsync(ct);
                avisos.Add(("orden", new { id = abierta.Id, codigo = abierta.Codigo, equipo = eq.Codigo, titulo = abierta.Titulo, prioridad = abierta.Prioridad, simulada = true }));
            }
            else if (!abierta.Descripcion.Contains(f.Sintomas)) abierta.Descripcion += $"\nNuevos síntomas observados: {f.Sintomas}";
            f.OrdenId = abierta.Id;
        }
        await db.SaveChangesAsync(ct);
        foreach (var (n, d) in avisos) await hub.Clients.Group("planta").SendAsync(n, d, ct);
        if (primera)
        {
            var ot = await db.Ordenes.AsNoTracking().FirstAsync(o => o.Id == f.OrdenId, ct);
            await Avisos.ACargosAsync(db, hub, Avisos.Mantencion, $"Nueva incidencia {ot.Codigo} · {eq.Codigo}: {f.Sintomas}", f.Criticidad is "critica" or "alta" ? "critica" : "tarea", $"/mantenimiento?orden={ot.Id}", "mantenimiento", ot.Codigo);
            await Avisos.ACargosAsync(db, hub, Avisos.Produccion, $"{eq.Codigo} {(estado == EstadosEquipo.Falla ? "detenido" : "con observaciones")}: {f.Sintomas}", estado == EstadosEquipo.Falla ? "critica" : "advertencia", $"/explorador?equipo={eq.Codigo}", "produccion", eq.Codigo);
        }
    }

    // ------------------------------------------------------------------------------------------------ lógica Ladder alterada
    record DatosLogica(int Peldano, string Original, string Alterado, string Tag);

    /// <summary>Invierte un contacto de un peldaño del programa del PLC simulado (el original queda guardado para evaluar la corrección).</summary>
    static void AlterarPrograma(Plc plc, Equipo eq, FallaSimulada f)
    {
        var prog = JsonSerializer.Deserialize<JsonElement>(plc.Programa);
        if (!prog.TryGetProperty("peldanos", out var pel) || pel.ValueKind != JsonValueKind.Array || pel.GetArrayLength() == 0) return;
        var peldanos = pel.EnumerateArray().Select(p => JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(p.GetRawText())!).ToList();
        int Puntaje(Dictionary<string, JsonElement> p) => (p.GetValueOrDefault("comentario").ToString().Contains(eq.Codigo, StringComparison.OrdinalIgnoreCase) ? 2 : 0) + (p["condiciones"].GetRawText().Contains("\"NA\"") ? 1 : 0);
        var elegido = peldanos.OrderByDescending(Puntaje).First();
        var original = JsonSerializer.Serialize(elegido);
        var conds = JsonSerializer.Deserialize<List<Dictionary<string, JsonElement>>>(elegido["condiciones"].GetRawText())!;
        var i = conds.FindIndex(c => c.GetValueOrDefault("tipo").ToString() is "NA" or "NC");
        if (i < 0) return;
        var c0 = conds[i];
        var nuevoTipo = c0["tipo"].ToString() == "NA" ? "NC" : "NA";
        c0["tipo"] = JsonSerializer.SerializeToElement(nuevoTipo);
        elegido["condiciones"] = JsonSerializer.SerializeToElement(conds);
        var variables = prog.TryGetProperty("variables", out var v) ? v : default;
        plc.VersionPrograma++;
        plc.Programa = JsonSerializer.Serialize(new { version = plc.VersionPrograma, variables = variables.ValueKind == JsonValueKind.Array ? (JsonElement?)variables : null, peldanos });
        f.Datos = JsonSerializer.Serialize(new DatosLogica(elegido["id"].GetInt32(), original, JsonSerializer.Serialize(elegido), c0.GetValueOrDefault("tag").ToString()), Js);
    }

    static string Normalizar(JsonElement peldano)
    {
        var d = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(peldano.GetRawText())!;
        return (d.TryGetValue("condiciones", out var c) ? c.GetRawText() : "") + "|" + (d.TryGetValue("salida", out var s) ? s.GetRawText() : "");
    }

    /// <summary>
    /// Tras publicar una versión aprobada del programa: si el peldaño alterado volvió a la lógica correcta, la falla de lógica
    /// queda resuelta físicamente (el simulador ejecuta la versión nueva). Devuelve las fallas resueltas.
    /// </summary>
    public static async Task<List<FallaSimulada>> RevisarLogicaAsync(SimaDb db, IHubContext<PlantaHub> hub, Plc plc, CancellationToken ct = default)
    {
        var equipos = await db.Equipos.Where(e => e.PlcId == plc.Id).Select(e => e.Id).ToListAsync(ct);
        var fallas = await db.FallasSimuladas.Where(f => equipos.Contains(f.EquipoId) && f.Tipo == "error_logica_ladder" && Activas.Contains(f.EstadoFisico)).ToListAsync(ct);
        var resueltas = new List<FallaSimulada>();
        var prog = JsonSerializer.Deserialize<JsonElement>(plc.Programa);
        if (!prog.TryGetProperty("peldanos", out var pel)) return resueltas;
        foreach (var f in fallas)
        {
            var d = JsonSerializer.Deserialize<DatosLogica>(f.Datos, Js);
            if (d is null) continue;
            var actual = pel.EnumerateArray().FirstOrDefault(p => p.TryGetProperty("id", out var i) && i.GetInt32() == d.Peldano);
            if (actual.ValueKind != JsonValueKind.Object) continue;
            if (Normalizar(actual) == Normalizar(JsonSerializer.Deserialize<JsonElement>(d.Original)))
            {
                await ResolverAsync(db, hub, f, $"lógica corregida en la versión {plc.VersionPrograma} del programa", ct);
                resueltas.Add(f);
            }
        }
        return resueltas;
    }

    // ------------------------------------------------------------------------------------------------ evolución en el tiempo
    /// <summary>Activa las programadas, alterna las intermitentes y hace crecer las progresivas.</summary>
    public static async Task TicAsync(SimaDb db, IHubContext<PlantaHub> hub, CancellationToken ct = default)
    {
        var ahora = DateTime.UtcNow;
        var lista = await db.FallasSimuladas.Where(f => f.EstadoFisico == "programada" || f.EstadoFisico == "activa" || f.EstadoFisico == "latente").ToListAsync(ct);
        foreach (var f in lista)
        {
            if (f.EstadoFisico == "programada")
            {
                if (f.InicioProgramado <= ahora) await ManifestarAsync(db, hub, f, ct);
                continue;
            }
            if (f.Modo == "intermitente" && f.Inicio is { } ini)
            {
                var enFase = (ahora - ini).TotalSeconds % f.PeriodoSeg < f.PeriodoSeg * 0.45;
                if (enFase && f.EstadoFisico == "latente") await ManifestarAsync(db, hub, f, ct);
                else if (!enFase && f.EstadoFisico == "activa")
                {
                    f.EstadoFisico = "latente"; f.Severidad = 0;
                    var eq = await db.Equipos.FirstAsync(x => x.Id == f.EquipoId, ct);
                    var avisos = new List<(string, object)>();
                    if (eq.Estado == EstadosEquipo.Falla) EstadosEquipo.Cambiar(db, eq, EstadosEquipo.OperativoObs, "simulador", true, "la falla dejó de manifestarse (intermitente)", avisos: avisos);
                    await db.SaveChangesAsync(ct);
                    foreach (var (n, d) in avisos) await hub.Clients.Group("planta").SendAsync(n, d, ct);
                }
            }
            else if (f.Modo == "progresiva" && f.Inicio is { } ini2 && f.EstadoFisico == "activa")
            {
                var antes = f.Severidad;
                f.Severidad = Math.Min(1, Math.Max(0.05, (ahora - ini2).TotalSeconds / f.DuracionSeg));
                if (antes < 1 && f.Severidad >= 1)
                {
                    var eq = await db.Equipos.FirstAsync(x => x.Id == f.EquipoId, ct);
                    var avisos = new List<(string, object)>();
                    if (!EstadosEquipo.Protegido(eq.Estado)) EstadosEquipo.Cambiar(db, eq, f.EstadoEquipo, "simulador", true, $"la falla progresiva llegó a su límite: {f.Sintomas}", avisos: avisos);
                    if (f.AlarmaId is { } aid && await db.Alarmas.FindAsync(new object[] { aid }, ct) is { } al) { al.Nivel = "alarma"; avisos.Add(("alarma", new { equipo = eq.Codigo, nivel = "alarma", mensaje = al.Mensaje, abierta = true, simulado = true })); }
                    await db.SaveChangesAsync(ct);
                    foreach (var (n, d) in avisos) await hub.Clients.Group("planta").SendAsync(n, d, ct);
                }
            }
        }
        await db.SaveChangesAsync(ct);
    }

    // ------------------------------------------------------------------------------------------------ diagnóstico y reparación
    /// <summary>Lo que encuentra quien inspecciona un componente: la pista de la causa si es el afectado, o nada anormal.</summary>
    public static async Task<string> InspeccionarAsync(SimaDb db, int equipoId, int? componenteId, string componenteTipo, CancellationToken ct = default)
    {
        var fallas = await db.FallasSimuladas.AsNoTracking().Where(f => f.EquipoId == equipoId && (f.EstadoFisico == "activa" || f.EstadoFisico == "latente")).ToListAsync(ct);
        foreach (var f in fallas)
        {
            var mismo = f.ComponenteId is { } c ? c == componenteId : f.ComponenteTipo == componenteTipo;
            if (!mismo) continue;
            var causa = Tipo(f.Tipo)?.Causas.FirstOrDefault(x => x.Clave == f.CausaClave);
            return f.EstadoFisico == "latente" ? $"{causa?.Pista} (la falla es intermitente: ahora no se manifiesta)" : causa?.Pista ?? "Se observan anomalías en este componente.";
        }
        return "Sin anomalías visibles en este componente.";
    }

    public record ResultadoEvaluacion(bool HayFallas, bool Resuelta, bool Persiste, string Mensaje);

    /// <summary>
    /// Evalúa una intervención contra las fallas simuladas del equipo. Resuelve la falla solo si coinciden el componente, la
    /// acción y (si corresponde) el repuesto. Si no, la falla sigue activa y, según su tipo, cambia su comportamiento.
    /// </summary>
    public static async Task<ResultadoEvaluacion> EvaluarAsync(SimaDb db, IHubContext<PlantaHub> hub, Sesion s, OrdenTrabajo o, Intervencion i, int? componenteId, string? componenteTipo, string? accion, IReadOnlyCollection<int> repuestos, CancellationToken ct = default)
    {
        var fallas = await db.FallasSimuladas.Where(f => f.EquipoId == o.EquipoId && (f.EstadoFisico == "activa" || f.EstadoFisico == "latente")).ToListAsync(ct);
        if (fallas.Count == 0) return new(false, false, false, "");
        var comp = componenteId is { } cid ? await db.Componentes.AsNoTracking().FirstOrDefaultAsync(c => c.Id == cid && c.EquipoId == o.EquipoId, ct) : null;
        var tipoComp = comp?.Tipo ?? componenteTipo ?? "";
        var nombresRep = await db.Repuestos.AsNoTracking().Where(r => repuestos.Contains(r.Id)).Select(r => r.Nombre).ToListAsync(ct);
        var resueltas = 0;
        foreach (var f in fallas)
        {
            var compOk = f.ComponenteId is { } fc ? fc == comp?.Id : f.ComponenteTipo == tipoComp;
            var accOk = accion is not null && Acciones(f).Contains(accion);
            var repOk = f.RepuestoId is null || repuestos.Contains(f.RepuestoId.Value) || (f.RepuestoClave.Length > 0 && nombresRep.Any(n => Regex.IsMatch(n, f.RepuestoClave, RegexOptions.IgnoreCase)));
            // un error de lógica no se arregla en terreno: se corrige con una versión aprobada del programa
            if (f.Tipo == "error_logica_ladder") { accOk = false; }
            var resuelve = compOk && accOk && repOk;
            var motivo = resuelve ? "La intervención corresponde a la causa." :
                f.Tipo == "error_logica_ladder" ? "La falla está en la lógica del PLC: se corrige con un cambio de programa aprobado." :
                !compOk ? "La intervención se hizo sobre un componente que no es el afectado." : !accOk ? "La acción realizada no corrige la causa." : "Falta el repuesto adecuado para la causa.";
            db.EvaluacionesFalla.Add(new EvaluacionFalla
            {
                FallaId = f.Id, OrdenId = o.Id, IntervencionId = i.Id, TecnicoId = s.Id, TecnicoNombre = s.Nombre, ComponenteId = comp?.Id, Componente = comp?.Nombre ?? (TiposComponente.GetValueOrDefault(tipoComp) ?? "Sin indicar"),
                Accion = accion is null ? "Sin indicar" : AccionesTexto.GetValueOrDefault(accion, accion), Repuestos = string.Join(", ", nombresRep), Diagnostico = i.Diagnostico,
                ComponenteCorrecto = compOk, AccionCorrecta = accOk, RepuestoCorrecto = repOk, Resuelve = resuelve, Motivo = motivo,
            });
            if (resuelve) { await ResolverAsync(db, hub, f, $"intervención de {s.Nombre} en {o.Codigo}", ct); resueltas++; }
            else
            {
                f.IntentosFallidos++;
                // la falla cambia según su naturaleza: la progresiva se acelera; la intermitente se vuelve permanente al tercer intento
                if (f.Modo == "progresiva") f.DuracionSeg = Math.Max(60, (int)(f.DuracionSeg * 0.75));
                if (f.Modo == "intermitente" && f.IntentosFallidos >= 3) { f.Modo = "inmediata"; if (f.EstadoFisico == "latente") { f.EstadoFisico = "activa"; f.Severidad = 1; } }
            }
        }
        await db.SaveChangesAsync(ct);
        var quedan = fallas.Where(f => Activas.Contains(f.EstadoFisico)).ToList();
        return quedan.Count == 0
            ? new(true, true, false, "La planta simulada responde: los síntomas desaparecieron.")
            : new(true, resueltas > 0, true, $"El equipo sigue presentando: {string.Join(" ", quedan.Select(q => q.Sintomas).Distinct())}");
    }

    /// <summary>Si el equipo todavía tiene una falla simulada activa, devuelve sus síntomas (para impedir una liberación que no se sostiene).</summary>
    public static async Task<string?> PersisteAsync(SimaDb db, int equipoId, CancellationToken ct = default)
    {
        var f = await db.FallasSimuladas.AsNoTracking().Where(x => x.EquipoId == equipoId && (x.EstadoFisico == "activa" || x.EstadoFisico == "latente")).Select(x => x.Sintomas).ToListAsync(ct);
        return f.Count == 0 ? null : string.Join(" ", f.Distinct());
    }

    public static async Task ResolverAsync(SimaDb db, IHubContext<PlantaHub> hub, FallaSimulada f, string como, CancellationToken ct = default, bool cancelada = false)
    {
        f.EstadoFisico = cancelada ? "cancelada" : "resuelta"; f.Fin = DateTime.UtcNow; f.Severidad = 0;
        if (f.AlarmaId is { } aid && await db.Alarmas.FindAsync(new object[] { aid }, ct) is { } al && al.Fin is null) al.Fin = DateTime.UtcNow;
        var eq = await db.Equipos.AsNoTracking().FirstAsync(x => x.Id == f.EquipoId, ct);
        Eventos.Agregar(db, "falla_simulada", "ok", $"{f.Codigo} en {eq.Codigo} {(cancelada ? "cancelada" : "resuelta")}: {como}", "simulador", true, eq.Id, eq.PlcId, datos: new { falla = f.Codigo });
        await db.SaveChangesAsync(ct);
        await hub.Clients.Group("planta").SendAsync("alarma", new { equipo = eq.Codigo, nivel = "aviso", mensaje = f.Sintomas, abierta = false }, ct);
    }

    /// <summary>¿Debe mantenerse el estado de falla aunque las lecturas o el PLC digan otra cosa?</summary>
    public static async Task<Dictionary<int, string>> EstadosForzadosAsync(SimaDb db, CancellationToken ct = default)
        => (await db.FallasSimuladas.AsNoTracking().Where(f => f.EstadoFisico == "activa").ToListAsync(ct))
            .GroupBy(f => f.EquipoId).ToDictionary(g => g.Key, g => g.Any(f => f.EstadoEquipo == EstadosEquipo.Falla && (f.Modo != "progresiva" || f.Severidad >= 1)) ? EstadosEquipo.Falla : EstadosEquipo.OperativoObs);
}

/// <summary>Hace avanzar las fallas simuladas en el tiempo (programadas, intermitentes y progresivas).</summary>
public class MotorSimulacion(IServiceScopeFactory fabrica, IConfiguration cfg, ILogger<MotorSimulacion> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        if (!cfg.GetValue("Simulacion:Habilitada", true)) return;
        await Task.Delay(2000, ct);
        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var scope = fabrica.CreateScope();
                await Simulacion.TicAsync(scope.ServiceProvider.GetRequiredService<SimaDb>(), scope.ServiceProvider.GetRequiredService<IHubContext<PlantaHub>>(), ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException) { log.LogWarning(ex, "Motor de simulación"); }
            await Task.Delay(3000, ct);
        }
    }
}
