using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Sima.Api.Dominio;

namespace Sima.Api.Datos;

/// <summary>Planta de demostración (los 15 equipos de la v2) con sus 4 PLC, módulos, puntos de E/S y programas en escalera.</summary>
public static class SemillaPlanta
{
    public record SensorDef(string Var, string Nombre, string Unidad, double Min, double Max, double Nom, double Aviso, double Alarma);
    record EqDef(string Cod, string Nombre, string Tipo, string Zona, string Linea, string Ubic, string Marca, string Modelo, string Crit, string Plc);
    record PlcDef(string Cod, string Nombre, string Fab, string Modelo, string Ip, string Zona);

    /// <summary>Sensores típicos por tipo de equipo (también se usan al registrar una máquina nueva desde la web).</summary>
    public static readonly Dictionary<string, SensorDef[]> Sensores = new()
    {
        ["Torno CNC"] = new[] { new SensorDef("vibracion", "Vibración del husillo", "mm/s", 0, 10, 2.0, 4.5, 7.0), new("temp_husillo", "Temperatura del husillo", "°C", 20, 100, 45, 70, 85), new("corriente", "Corriente del motor", "A", 0, 80, 32, 55, 68) },
        ["Centro de mecanizado CNC"] = new[] { new SensorDef("vibracion", "Vibración del husillo", "mm/s", 0, 10, 1.8, 4.5, 7.0), new("temp_husillo", "Temperatura del husillo", "°C", 20, 100, 48, 72, 88), new("corriente", "Corriente del motor", "A", 0, 80, 36, 58, 70) },
        ["Prensa hidráulica"] = new[] { new SensorDef("presion", "Presión del circuito", "bar", 0, 300, 180, 240, 270), new("temp_aceite", "Temperatura del aceite", "°C", 20, 90, 45, 60, 72) },
        ["Inyectora de plástico"] = new[] { new SensorDef("temp_cilindro", "Temperatura del cilindro", "°C", 100, 350, 230, 280, 310), new("presion", "Presión de inyección", "bar", 0, 250, 140, 200, 230) },
        ["Cinta transportadora"] = new[] { new SensorDef("vibracion", "Vibración del reductor", "mm/s", 0, 10, 1.8, 4.5, 7.0), new("corriente", "Corriente del motor", "A", 0, 20, 6.5, 11, 14), new("temp_motor", "Temperatura del motor", "°C", 20, 120, 55, 85, 100) },
        ["Robot industrial articulado"] = new[] { new SensorDef("temp_servo", "Temperatura de servomotor", "°C", 20, 100, 50, 70, 85), new("corriente", "Corriente de ejes", "A", 0, 40, 14, 28, 35) },
        ["Máquina de soldadura MIG/MAG"] = new[] { new SensorDef("corriente", "Corriente de soldadura", "A", 0, 500, 220, 400, 450), new("temp_antorcha", "Temperatura de la antorcha", "°C", 20, 200, 80, 140, 170) },
        ["Envasadora automática"] = new[] { new SensorDef("temp_sellado", "Temperatura de sellado", "°C", 80, 220, 160, 190, 205), new("presion", "Presión de aire", "bar", 0, 10, 6, 8.5, 9.5) },
        ["Compresor de aire industrial"] = new[] { new SensorDef("presion", "Presión de descarga", "bar", 0, 12, 8, 10, 11), new("temp_descarga", "Temperatura de descarga", "°C", 40, 130, 85, 100, 110), new("vibracion", "Vibración", "mm/s", 0, 10, 2.2, 4.5, 7.0) },
        ["Bomba centrífuga"] = new[] { new SensorDef("vibracion", "Vibración", "mm/s", 0, 12, 2.5, 4.5, 7.1), new("temp_rodamiento", "Temperatura del rodamiento", "°C", 20, 110, 55, 80, 95) },
    };

    const string N1 = "Nave 1 · Mecanizado", N2 = "Nave 2 · Plásticos", N3 = "Nave 3 · Envasado", SM = "Sala de máquinas";
    const string L1 = "Línea 1 · Mecanizado", L2 = "Línea 2 · Conformado", L3 = "Línea 3 · Inyección", L4 = "Línea 4 · Envasado", LS = "Servicios";

    static readonly PlcDef[] Plcs =
    {
        new("PLC-01", "PLC Nave 1 · Mecanizado", "Siemens", "S7-1500 · CPU 1511-1 PN", "10.10.1.11", N1),
        new("PLC-02", "PLC Nave 2 · Inyección", "Rockwell", "CompactLogix 5380", "10.10.2.11", N2),
        new("PLC-03", "PLC Nave 3 · Envasado", "Siemens", "S7-1200 · CPU 1215C", "10.10.3.11", N3),
        new("PLC-04", "PLC Sala de máquinas", "Schneider", "Modicon M580", "10.10.4.11", SM),
    };

    static readonly EqDef[] Equipos =
    {
        new("TC-01", "Torno 1", "Torno CNC", N1, L1, "Nave 1, bahía A", "Haas", "ST-20", "alta", "PLC-01"),
        new("TC-02", "El torno grande", "Torno CNC", N1, L1, "Nave 1, bahía A", "Mazak", "QT-200", "media", "PLC-01"),
        new("CM-01", "Centro de 5 ejes", "Centro de mecanizado CNC", N1, L1, "Nave 1, bahía B", "DMG Mori", "DMU 50", "alta", "PLC-01"),
        new("PH-01", "Prensa de 200 t", "Prensa hidráulica", N1, L2, "Nave 1, bahía C", "Schuler", "PH-200", "media", "PLC-01"),
        new("SD-01", "Soldadora MIG 1", "Máquina de soldadura MIG/MAG", N1, L2, "Nave 1, bahía C", "Lincoln", "Power MIG 360", "baja", "PLC-01"),
        new("RB-01", "Robot de paletizado", "Robot industrial articulado", N1, L2, "Nave 1, salida", "FANUC", "M-410iC", "media", "PLC-01"),
        new("IN-01", "Inyectora 1", "Inyectora de plástico", N2, L3, "Nave 2, pasillo norte", "Haitian", "MA1600", "media", "PLC-02"),
        new("IN-02", "La Vieja", "Inyectora de plástico", N2, L3, "Nave 2, fondo", "Engel", "ES-200", "media", "PLC-02"),
        new("IN-03", "Inyectora 3 (pasillo norte)", "Inyectora de plástico", N2, L3, "Nave 2, pasillo norte", "Haitian", "MA2800", "alta", "PLC-02"),
        new("CT-01", "Cinta de salida L3", "Cinta transportadora", N2, L3, "Nave 2, salida", "Interroll", "RollerDrive", "media", "PLC-02"),
        new("EV-01", "Envasadora 1", "Envasadora automática", N3, L4, "Nave 3, línea 1", "Krones", "Modulfill", "media", "PLC-03"),
        new("EV-02", "Envasadora 2", "Envasadora automática", N3, L4, "Nave 3, línea 2", "Krones", "Modulfill", "alta", "PLC-03"),
        new("CT-02", "Cinta de envasado", "Cinta transportadora", N3, L4, "Nave 3, salida", "Interroll", "RollerDrive", "media", "PLC-03"),
        new("CP-01", "Compresor de tornillo", "Compresor de aire industrial", SM, LS, "Sala de máquinas", "Atlas Copco", "GA 75", "alta", "PLC-04"),
        new("BC-01", "Bomba de enfriamiento", "Bomba centrífuga", SM, LS, "Sala de máquinas", "Grundfos", "NK 65", "media", "PLC-04"),
    };

    /// <summary>Escenario del simulador que puede representar este tipo de equipo.</summary>
    public static string ModeloDe(string tipo) => tipo switch
    {
        "Cinta transportadora" => "cinta",
        "Envasadora automática" => "llenado",
        _ => "maquina",
    };

    static string Tag(string cod, string suf) => cod.Replace("-", "") + "_" + suf;

    public static async Task CargarAsync(SimaDb db, CancellationToken ct = default)
    {
        if (await db.Equipos.AnyAsync(ct)) return;
        // jerarquía: Planta → Áreas → Líneas
        var planta = await db.Plantas.FirstOrDefaultAsync(ct) ?? db.Plantas.Add(new Planta { Codigo = "PQ", Nombre = "Planta Quilicura", Ciudad = "Santiago" }).Entity;
        var defAreas = new (string cod, string nombre, string tipo)[] { ("N1", N1, "produccion"), ("N2", N2, "produccion"), ("N3", N3, "produccion"), ("SM", SM, "servicios"), ("BC", "Bodega central", "bodega"), ("PC", "Patio de carga", "patio") };
        var areas = new Dictionary<string, AreaPlanta>();
        for (var i = 0; i < defAreas.Length; i++)
        {
            var (cod, nombre, tipo) = defAreas[i];
            areas[nombre] = await db.Areas.FirstOrDefaultAsync(a => a.Codigo == cod, ct) ?? db.Areas.Add(new AreaPlanta { Planta = planta, Codigo = cod, Nombre = nombre, Tipo = tipo, Orden = i }).Entity;
        }
        var defLineas = new (string cod, string nombre, string area)[] { ("L1", L1, N1), ("L2", L2, N1), ("L3", L3, N2), ("L4", L4, N3), ("LS", LS, SM) };
        var lineas = new Dictionary<string, LineaProduccion>();
        foreach (var (cod, nombre, area) in defLineas)
            lineas[nombre] = await db.Lineas.FirstOrDefaultAsync(l => l.Codigo == cod, ct) ?? db.Lineas.Add(new LineaProduccion { Area = areas[area], Codigo = cod, Nombre = nombre }).Entity;
        await db.SaveChangesAsync(ct);

        foreach (var pd in Plcs)
        {
            var plc = new Plc { Codigo = pd.Cod, Nombre = pd.Nombre, Fabricante = pd.Fab, Modelo = pd.Modelo + " (simulado)", Direccion = pd.Ip, AreaId = areas[pd.Zona].Id, Origen = "simulado", Estado = "sin_conexion" };
            db.Plcs.Add(plc);
            await db.SaveChangesAsync(ct);

            var equipos = new List<(Equipo eq, SensorDef[] sens)>();
            foreach (var ed in Equipos.Where(e => e.Plc == pd.Cod))
            {
                var eq = new Equipo { Codigo = ed.Cod, Nombre = ed.Nombre, Tipo = ed.Tipo, LineaId = lineas[ed.Linea].Id, ModeloSimulacion = ModeloDe(ed.Tipo), Ubicacion = ed.Ubic, Marca = ed.Marca, Modelo = ed.Modelo, Criticidad = ed.Crit, PlcId = plc.Id };
                var sens = Sensores[ed.Tipo];
                foreach (var s in sens) eq.Sensores.Add(new Sensor { Variable = s.Var, Nombre = s.Nombre, Unidad = s.Unidad, EscalaMin = s.Min, EscalaMax = s.Max, Nominal = s.Nom, Aviso = s.Aviso, Alarma = s.Alarma });
                db.Equipos.Add(eq);
                equipos.Add((eq, sens));
            }
            await db.SaveChangesAsync(ct);

            // puntos de entrada/salida: por equipo 3 DI (marcha, paro, emergencia), 3 DO (contactor, luz verde, luz roja) y 1 AI por sensor
            var puntos = new List<(string tipo, string tag, string desc, Equipo eq, Sensor? sensor, string unidad, double min, double max)>();
            foreach (var (eq, _) in equipos)
            {
                puntos.Add(("DI", Tag(eq.Codigo, "MARCHA"), $"{eq.Codigo} · pulsador de marcha", eq, null, "", 0, 1));
                puntos.Add(("DI", Tag(eq.Codigo, "PARO"), $"{eq.Codigo} · pulsador de paro", eq, null, "", 0, 1));
                puntos.Add(("DI", Tag(eq.Codigo, "EMERG"), $"{eq.Codigo} · parada de emergencia", eq, null, "", 0, 1));
                puntos.Add(("DO", Tag(eq.Codigo, "CONTACTOR"), $"{eq.Codigo} · contactor del motor", eq, null, "", 0, 1));
                puntos.Add(("DO", Tag(eq.Codigo, "LUZ_VERDE"), $"{eq.Codigo} · luz verde (en marcha)", eq, null, "", 0, 1));
                puntos.Add(("DO", Tag(eq.Codigo, "LUZ_ROJA"), $"{eq.Codigo} · luz roja (falla)", eq, null, "", 0, 1));
                foreach (var s in eq.Sensores) puntos.Add(("AI", Tag(eq.Codigo, s.Variable.ToUpperInvariant()), $"{eq.Codigo} · {s.Nombre}", eq, s, s.Unidad, s.EscalaMin, s.EscalaMax));
            }

            db.PlcModulos.Add(new PlcModulo { PlcId = plc.Id, Slot = 1, Tipo = "PS", Modelo = "Fuente 24 V / 10 A", Canales = 0 });
            db.PlcModulos.Add(new PlcModulo { PlcId = plc.Id, Slot = 2, Tipo = "CPU", Modelo = pd.Modelo, Canales = 0 });
            var slot = 3;
            var asignados = new List<PlcPunto>();
            foreach (var (tipo, canales, nombre) in new[] { ("DI", 16, "DI 16×24 VDC"), ("DO", 16, "DO 16×24 VDC / 0,5 A"), ("AI", 8, "AI 8×U/I/RTD") })
            {
                var lista = puntos.Where(p => p.tipo == tipo).ToList();
                for (var k = 0; k * canales < lista.Count; k++)
                {
                    var mod = new PlcModulo { PlcId = plc.Id, Slot = slot++, Tipo = tipo, Modelo = nombre, Canales = canales };
                    db.PlcModulos.Add(mod);
                    await db.SaveChangesAsync(ct);
                    foreach (var (p, ch) in lista.Skip(k * canales).Take(canales).Select((p, i) => (p, i)))
                    {
                        var dir = tipo switch { "DI" => $"I{k * 2 + ch / 8}.{ch % 8}", "DO" => $"Q{k * 2 + ch / 8}.{ch % 8}", _ => $"IW{64 + 2 * (k * 8 + ch)}" };
                        asignados.Add(new PlcPunto { PlcId = plc.Id, ModuloId = mod.Id, Canal = ch, Direccion = dir, Tag = p.tag, Tipo = tipo, Descripcion = p.desc, EquipoId = p.eq.Id, SensorId = p.sensor?.Id, Unidad = p.unidad, Minimo = p.min, Maximo = p.max });
                    }
                }
            }
            db.PlcPuntos.AddRange(asignados);
            plc.Programa = ProgramaPlc.Generar(equipos.Select(e => (e.eq.Codigo, e.eq.Nombre, e.eq.Sensores.Select(s => (Tag(e.eq.Codigo, s.Variable.ToUpperInvariant()), s.Alarma, s.Nombre)).ToList())).ToList());
            await db.SaveChangesAsync(ct);
        }
    }
}

/// <summary>Programa de escalera (JSON): se guarda en la base, la web lo muestra y el simulador de PLC lo ejecuta.</summary>
public static class ProgramaPlc
{
    static readonly JsonSerializerOptions Opc = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull };

    static object Na(string tag) => new { tipo = "NA", tag };
    static object Nc(string tag) => new { tipo = "NC", tag };
    static object Cmp(string tag, string op, double valor) => new { tipo = "CMP", tag, op, valor };
    static object O(params object[][] ramas) => new { tipo = "OR", ramas };

    public static string Generar(List<(string cod, string nombre, List<(string tag, double alarma, string desc)> sensores)> equipos)
    {
        var variables = new List<object>();
        var peldanos = new List<object>();
        var n = 1;
        void Peldano(string comentario, object[] condiciones, object salida) => peldanos.Add(new { id = n++, comentario, condiciones, salida });
        foreach (var (cod, nombre, sensores) in equipos)
        {
            string P(string s) => cod.Replace("-", "") + "_" + s;
            variables.Add(new { nombre = P("RUN"), tipo = "bool", descripcion = $"{cod} en marcha (enclavado)" });
            variables.Add(new { nombre = P("FALLA"), tipo = "bool", descripcion = $"{cod} con falla (enclavada)" });
            variables.Add(new { nombre = P("T_DISPARO"), tipo = "timer", preset = 2000, descripcion = $"{cod} retardo de disparo por límite analógico" });
            Peldano($"{cod} · marcha con enclavamiento (paro, emergencia y falla la cortan)",
                new object[] { O(new[] { Na(P("MARCHA")) }, new[] { Na(P("RUN")) }), Nc(P("PARO")), Nc(P("EMERG")), Nc(P("FALLA")) }, new { tipo = "BOBINA", tag = P("RUN") });
            Peldano($"{cod} · contactor del motor", new object[] { Na(P("RUN")) }, new { tipo = "BOBINA", tag = P("CONTACTOR") });
            Peldano($"{cod} · luz verde", new object[] { Na(P("RUN")) }, new { tipo = "BOBINA", tag = P("LUZ_VERDE") });
            Peldano($"{cod} · límite de alarma de cualquier variable (retardo 2 s)",
                new object[] { Na(P("RUN")), O(sensores.Select(s => new[] { Cmp(s.tag, ">=", s.alarma) }).ToArray()) }, new { tipo = "TON", tag = P("T_DISPARO"), preset = 2000 });
            Peldano($"{cod} · la falla se enclava al cumplirse el retardo", new object[] { Na(P("T_DISPARO")) }, new { tipo = "SET", tag = P("FALLA") });
            Peldano($"{cod} · luz roja", new object[] { Na(P("FALLA")) }, new { tipo = "BOBINA", tag = P("LUZ_ROJA") });
            Peldano($"{cod} · rearme de la falla con el paro, si las variables volvieron a rango",
                new object[] { Na(P("PARO")), Nc(P("T_DISPARO")) }, new { tipo = "RESET", tag = P("FALLA") });
        }
        return JsonSerializer.Serialize(new { version = 1, variables, peldanos }, Opc);
    }
}
