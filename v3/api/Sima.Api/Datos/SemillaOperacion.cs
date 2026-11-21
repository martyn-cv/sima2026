using Microsoft.EntityFrameworkCore;
using Sima.Api.Dominio;
using Sima.Api.Servicios;

namespace Sima.Api.Datos;

/// <summary>Datos de demostración de pañol, logística, rutinas y producción de los últimos 30 días. Es ficticia.</summary>
public static class SemillaOperacion
{
    public static async Task CargarAsync(SimaDb db, CancellationToken ct = default)
    {
        var rnd = new Random(7);
        var hoy = Reloj.Hoy();

        if (!await db.Herramientas.AnyAsync(ct))
        {
            var lista = new (string n, int cal)[] { ("Juego de llaves combinadas", 0), ("Llaves Allen y Torx", 0), ("Torquímetro", 180), ("Extractor de rodamientos", 0), ("Multímetro digital", 365), ("Pinza amperimétrica", 365), ("Calibrador pie de metro", 365),
                ("Micrómetro", 365), ("Reloj comparador", 365), ("Manómetro", 365), ("Analizador de vibraciones", 365), ("Cámara termográfica", 365), ("Alineador láser", 365), ("Pistola de engrase", 0) };
            for (var i = 0; i < lista.Length; i++)
            {
                var (n, cal) = lista[i];
                var prox = cal == 0 ? (DateOnly?)null : n == "Micrómetro" ? hoy.AddDays(-10) : n == "Manómetro" ? hoy.AddDays(12) : hoy.AddDays(rnd.Next(40, cal - 20));
                db.Herramientas.Add(new Herramienta { Codigo = $"HT-{i + 1:000}", Nombre = n, RequiereCalibracion = cal > 0, CalibracionDias = cal, ProximaCalibracion = prox });
            }
        }
        if (!await db.Repuestos.AnyAsync(ct))
        {
            var r = new (string cod, string n, string tipo, string ub, int st, int min, int costo, bool crit)[]
            {
                ("RP-001", "Rodamiento 6205-2RS", "Rodamiento", "Estante A1", 14, 6, 6800, true), ("RP-002", "Rodamiento 6308", "Rodamiento", "Estante A1", 3, 4, 14500, true), ("RP-003", "Correa trapezoidal B-68", "Correa", "Estante A3", 9, 4, 9200, false),
                ("RP-004", "Correa dentada HTD 8M-1200", "Correa", "Estante A3", 2, 3, 28900, true), ("RP-005", "Sello mecánico 35 mm", "Sello", "Estante B2", 4, 2, 52000, true), ("RP-006", "Filtro de aire comprimido 1/2\"", "Filtro", "Estante B4", 12, 5, 18600, false),
                ("RP-007", "Filtro de aceite compresor GA75", "Filtro", "Estante B4", 1, 2, 41500, true), ("RP-008", "Contactor 25 A 24 VDC", "Eléctrico", "Estante C1", 8, 3, 21300, false), ("RP-009", "Relé térmico 18–25 A", "Eléctrico", "Estante C1", 5, 3, 17400, false),
                ("RP-010", "Fusible 10 A (caja de 10)", "Eléctrico", "Estante C2", 20, 8, 7800, false), ("RP-011", "Sensor PT100 3 hilos", "Instrumentación", "Estante C3", 6, 4, 23500, true), ("RP-012", "Transmisor de presión 0–16 bar", "Instrumentación", "Estante C3", 2, 2, 96000, true),
                ("RP-013", "Sensor inductivo M18", "Instrumentación", "Estante C3", 15, 6, 11200, false), ("RP-014", "Aceite hidráulico ISO 46 (20 L)", "Lubricante", "Bodega líquidos", 7, 4, 58000, false), ("RP-015", "Grasa litio EP2 (cartucho)", "Lubricante", "Bodega líquidos", 40, 15, 2900, false),
                ("RP-016", "Manguera hidráulica 1/2\" 1 m", "Hidráulico", "Estante D1", 6, 3, 31000, false), ("RP-017", "Cilindro neumático 50×100", "Neumático", "Estante D2", 1, 1, 184000, true), ("RP-018", "Electroválvula 5/2 24 VDC", "Neumático", "Estante D2", 4, 3, 43900, false),
                ("RP-019", "Inserto CNMG 120408", "Herramental", "Estante E1", 60, 25, 4200, false), ("RP-020", "Resistencia banda 220 V 500 W", "Eléctrico", "Estante C2", 3, 4, 15800, true),
            };
            foreach (var x in r) db.Repuestos.Add(new Repuesto { Codigo = x.cod, Nombre = x.n, Tipo = x.tipo, Ubicacion = x.ub, Stock = x.st, StockMinimo = x.min, CostoUnitario = x.costo, Critico = x.crit });
        }
        if (!await db.Despachos.AnyAsync(ct))
        {
            var ahora = DateTime.UtcNow;
            var d = new (string dest, string carga, string veh, string cond, string est, double comp)[]
            {
                ("Cliente Rancagua", "Piezas mecanizadas, 3 pallets", "Camión 10 t", "Raúl Soto", "entregado", -52), ("Cliente Temuco", "Envases PET, 12 pallets", "Camión 10 t", "Mario Díaz", "entregado", -30), ("Cliente Valparaíso", "Piezas prensadas, 2 pallets", "Camión 3/4", "Juan Pérez", "entregado", -26),
                ("Cliente Concepción", "Inyectados, 8 pallets", "Camión 10 t", "Raúl Soto", "entregado", -4), ("Cliente Rancagua", "Piezas soldadas, 1 pallet", "Camioneta", "Mario Díaz", "en_ruta", 3), ("Cliente Temuco", "Envases PET, 10 pallets", "Camión 10 t", "Juan Pérez", "en_ruta", 7),
                ("Cliente Valparaíso", "Piezas mecanizadas, 4 pallets", "Camión 3/4", "Raúl Soto", "pendiente", 26), ("Cliente Concepción", "Inyectados, 6 pallets", "Camión 10 t", "Mario Díaz", "pendiente", 52),
            };
            foreach (var x in d)
            {
                var comp = ahora.AddHours(x.comp);
                db.Despachos.Add(new Despacho { Destino = x.dest, Carga = x.carga, Vehiculo = x.veh, Conductor = x.cond, Estado = x.est, Compromiso = comp, Creado = comp.AddHours(-30),
                    Salida = x.est == "pendiente" ? null : comp.AddHours(-8), Entrega = x.est == "entregado" ? comp.AddMinutes(rnd.Next(-90, x.dest == "Cliente Valparaíso" && x.comp < -20 ? 240 : 40)) : null });
            }
        }
        if (!await db.Rutinas.AnyAsync(ct))
        {
            string J(params string[] i) => System.Text.Json.JsonSerializer.Serialize(i);
            db.Rutinas.AddRange(
                new RutinaPlantilla { Nombre = "Inspección del turno", Frecuencia = "turno", Items = J("Ruidos anormales", "Fugas (aceite, aire, agua)", "Temperatura", "Alarmas activas", "Protecciones y resguardos en su lugar") },
                new RutinaPlantilla { Nombre = "Rutina semanal", Frecuencia = "semanal", Items = J("Limpieza de sensores", "Drenaje de condensados", "Revisión de bandas") },
                new RutinaPlantilla { Nombre = "Rutina mensual", Frecuencia = "mensual", Items = J("Inspección de conexiones", "Lubricación según manual", "Holguras", "Vibraciones") },
                new RutinaPlantilla { Nombre = "Rutina trimestral", Frecuencia = "trimestral", Items = J("Calibraciones (personal autorizado)", "Revisión de tableros (personal autorizado)") });
        }
        await db.SaveChangesAsync(ct);

        if (!await db.Produccion.AnyAsync(ct) && await db.Equipos.AnyAsync(ct))
        {
            var equipos = await db.Equipos.ToListAsync(ct);
            foreach (var e in equipos)
            {
                var diaria = e.Tipo.Contains("Torno") || e.Tipo.Contains("Centro") ? 220 : e.Tipo.Contains("Inyectora") ? 1400 : e.Tipo.Contains("Envasadora") ? 6000 : e.Tipo.Contains("Prensa") ? 900 : e.Tipo.Contains("Cinta") ? 8000 : e.Tipo.Contains("Soldadura") ? 160 : e.Tipo.Contains("Robot") ? 700 : 1000;
                var sesgo = e.Criticidad == "alta" ? 0.03 : 0;
                for (var i = 30; i >= 1; i--)
                {
                    var f = hoy.AddDays(-i);
                    if (f.DayOfWeek == DayOfWeek.Sunday) continue;
                    var plan = (int)(diaria * (f.DayOfWeek == DayOfWeek.Saturday ? 0.5 : 1));
                    var prod = (int)(plan * (0.84 + rnd.NextDouble() * 0.15 - sesgo));
                    db.Produccion.Add(new ProduccionDia { EquipoId = e.Id, Fecha = f, UnidadesPlan = plan, UnidadesProducidas = prod, UnidadesBuenas = (int)(prod * (0.965 + rnd.NextDouble() * 0.03)), HorasPlan = f.DayOfWeek == DayOfWeek.Saturday ? 8 : 16 });
                }
                for (var k = rnd.Next(0, 4); k > 0; k--)
                {
                    var ini = DateTime.UtcNow.AddDays(-rnd.Next(2, 29)).AddHours(-rnd.Next(0, 10));
                    db.Paradas.Add(new Parada { EquipoId = e.Id, Inicio = ini, Fin = ini.AddHours(0.5 + rnd.NextDouble() * 4.5), Motivo = "falla" });
                }
                if (rnd.NextDouble() < 0.6) { var ini = DateTime.UtcNow.AddDays(-rnd.Next(3, 28)); db.Paradas.Add(new Parada { EquipoId = e.Id, Inicio = ini, Fin = ini.AddHours(2 + rnd.NextDouble() * 4), Motivo = "mantencion", Automatica = false }); }
            }
            await db.SaveChangesAsync(ct);
        }
    }
}
