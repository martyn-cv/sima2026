using Microsoft.EntityFrameworkCore;
using Sima.Api.Dominio;

namespace Sima.Api.Datos;

/// <summary>
/// Ficha técnica y componentes de las 15 máquinas de la planta de demostración. El Excel no trae estos datos, así que todo
/// lo que se carga aquí queda marcado como de demostración (FichaDemo y Demo): la interfaz lo muestra con su distintivo.
/// </summary>
public static class SemillaFase2
{
    record Perfil(string Electrica, string Mecanica, (string tipo, string nombre, string especificacion)[] Componentes);

    static Perfil De(string tipo) => tipo switch
    {
        var t when t.Contains("Torno") || t.Contains("mecanizado") => new("400 V trifásico · 22 kW · 45 A", "Husillo 4.500 rpm · volteo Ø 400 mm",
            new[] { ("motor", "Motor del husillo", "18,5 kW · 1.480 rpm"), ("variador", "Variador del husillo", "22 kW · vectorial"), ("motor", "Servo eje X", "2,5 kW"), ("motor", "Servo eje Z", "3,0 kW"), ("tablero", "Tablero de control", "IP54 · 24 VDC") }),
        var t when t.Contains("Prensa") => new("400 V trifásico · 37 kW", "Fuerza 200 t · carrera 400 mm",
            new[] { ("motor", "Motor de la bomba hidráulica", "37 kW · 1.480 rpm"), ("bomba", "Bomba de pistones", "160 L/min · 250 bar"), ("sensor", "Transductor de presión", "0–400 bar · 4–20 mA"), ("tablero", "Tablero de potencia", "IP54") }),
        var t when t.Contains("soldadura") => new("400 V trifásico · 15 kVA", "Corriente 30–400 A · ciclo 60 %",
            new[] { ("tablero", "Fuente de soldadura", "400 A"), ("motor", "Alimentador de alambre", "24 VDC"), ("sensor", "Sensor de corriente", "0–500 A") }),
        var t when t.Contains("Robot") => new("400 V trifásico · 7,5 kVA", "Carga 120 kg · alcance 2,6 m · 6 ejes",
            new[] { ("motor", "Servomotores ejes 1 a 6", "6 × 2–5 kW"), ("tablero", "Controlador del robot", "IP54"), ("sensor", "Barrera de seguridad", "Categoría 4 · PL e") }),
        var t when t.Contains("Inyectora") => new("400 V trifásico · 45 kW", "Fuerza de cierre 160 t · inyección 280 g",
            new[] { ("motor", "Motor de la bomba", "30 kW · servo"), ("variador", "Variador de la bomba", "37 kW"), ("sensor", "Termocuplas del cilindro", "5 zonas · tipo J"), ("sensor", "Transductor de presión de inyección", "0–2.500 bar") }),
        var t when t.Contains("Cinta") => new("400 V trifásico · 2,2 kW", "Ancho 600 mm · 0,2–1,2 m/s",
            new[] { ("motor", "Motorreductor de arrastre", "2,2 kW · i = 25"), ("variador", "Variador de la cinta", "3 kW"), ("sensor", "Fotocélulas de paso", "S1 y S2 · PNP") }),
        var t when t.Contains("Envasadora") => new("400 V trifásico · 11 kW", "40 envases/min · 0,5–2 L",
            new[] { ("motor", "Motor principal", "7,5 kW"), ("actuador", "Válvulas de llenado", "8 × 24 VDC"), ("sensor", "Mordazas de sellado", "Termocupla tipo K"), ("sensor", "Sensor de nivel", "4–20 mA") }),
        var t when t.Contains("Compresor") => new("400 V trifásico · 55 kW", "Caudal 9,6 m³/min · 8 bar",
            new[] { ("motor", "Motor del compresor", "55 kW · 2.970 rpm"), ("sensor", "Sensor de temperatura de descarga", "PT100"), ("sensor", "Presostato", "0–16 bar") }),
        _ => new("400 V trifásico · 15 kW", "Caudal 120 m³/h · altura 32 m",
            new[] { ("motor", "Motor de la bomba", "15 kW · 2.950 rpm"), ("sensor", "Sensor de vibración", "0–20 mm/s"), ("sensor", "Sensor de temperatura del rodamiento", "PT100") }),
    };

    public static async Task CargarAsync(SimaDb db)
    {
        if (await db.Componentes.AnyAsync()) return;
        var equipos = await db.Equipos.OrderBy(e => e.Codigo).ToListAsync();
        var tecnicos = await db.Trabajadores.Where(t => t.CargoId == 26 || t.CargoId == 27 || t.CargoId == 28).OrderBy(t => t.Id).Select(t => t.Id).ToListAsync();
        var supervisores = await db.Trabajadores.Where(t => t.CargoId == 7 || t.CargoId == 8).OrderBy(t => t.Id).Select(t => t.Id).ToListAsync();
        var i = 0;
        foreach (var e in equipos)
        {
            var p = De(e.Tipo);
            e.Fabricante = e.Marca; e.NumeroSerie = $"{new string(e.Marca.Where(char.IsLetter).Take(3).ToArray()).ToUpperInvariant()}-{2016 + i % 8}-{4100 + i * 37:0000}";
            e.FechaInstalacion = new DateOnly(2016 + i % 8, 1 + i % 12, 1 + (i * 3) % 27);
            e.HorasFuncionamiento = 6_000 + i * 2_150 % 31_000;
            e.EspecElectrica = p.Electrica; e.EspecMecanica = p.Mecanica; e.FichaDemo = true;
            if (tecnicos.Count > 0) e.ResponsableMantId = tecnicos[i % tecnicos.Count];
            if (supervisores.Count > 0) e.ResponsableProdId = supervisores[i % supervisores.Count];
            var n = 1;
            foreach (var (tipo, nombre, esp) in p.Componentes)
                db.Componentes.Add(new ComponenteEquipo { EquipoId = e.Id, Tipo = tipo, Codigo = $"{e.Codigo}-{tipo[..3].ToUpperInvariant()}{n++:00}", Nombre = nombre, Marca = e.Marca, Modelo = "", Especificacion = esp, Demo = true });
            i++;
        }
        await db.SaveChangesAsync();
    }
}
