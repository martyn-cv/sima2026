namespace Sima.Api.Dominio;

// Módulos de operación de planta que venían de la v2: pañol, logística, rutinas, traspaso e indicadores.

public class Herramienta
{
    public int Id { get; set; }
    public string Codigo { get; set; } = "";
    public string Nombre { get; set; } = "";
    public bool RequiereCalibracion { get; set; }
    public int CalibracionDias { get; set; }
    public DateOnly? ProximaCalibracion { get; set; }
    public string Estado { get; set; } = "disponible";    // disponible | retirada
    public string? RetiradaPorId { get; set; }
    public string? RetiradaPorNombre { get; set; }
    public DateTime? RetiradaEn { get; set; }
}

public class Repuesto
{
    public int Id { get; set; }
    public string Codigo { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string Tipo { get; set; } = "";
    public string Bodega { get; set; } = "Pañol central";
    public string Ubicacion { get; set; } = "";
    public int Stock { get; set; }
    public int StockMinimo { get; set; }
    public int CostoUnitario { get; set; }
    public bool Critico { get; set; }
}

public class MovimientoRepuesto
{
    public int Id { get; set; }
    public int RepuestoId { get; set; }
    public int Cantidad { get; set; }                       // positivo ingresa, negativo se retira
    public int? OrdenId { get; set; }
    public string PorId { get; set; } = "";
    public string PorNombre { get; set; } = "";
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public string Nota { get; set; } = "";
}

public class Despacho
{
    public int Id { get; set; }
    public string Origen { get; set; } = "Planta Quilicura";
    public string Destino { get; set; } = "";
    public string Carga { get; set; } = "";
    public string Vehiculo { get; set; } = "";
    public string Conductor { get; set; } = "";
    public string Estado { get; set; } = "pendiente";       // pendiente | en_ruta | entregado
    public DateTime Compromiso { get; set; }
    public DateTime Creado { get; set; } = DateTime.UtcNow;
    public DateTime? Salida { get; set; }
    public DateTime? Entrega { get; set; }
    public string Codigo => $"DSP-{100 + Id}";
}

public class RutinaPlantilla
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public string Frecuencia { get; set; } = "turno";       // turno | semanal | mensual | trimestral
    public string Items { get; set; } = "[]";               // JSON: lista de textos
}

public class EjecucionRutina
{
    public int Id { get; set; }
    public string? Uid { get; set; }                        // identificador del envío: evita duplicados al reenviar sin conexión
    public int RutinaId { get; set; }
    public int EquipoId { get; set; }
    public string PorId { get; set; } = "";
    public string PorNombre { get; set; } = "";
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public string Resultados { get; set; } = "[]";          // JSON: [{item, ok, nota}]
    public string Observaciones { get; set; } = "";
    public bool ConHallazgos { get; set; }
}

public class Traspaso
{
    public int Id { get; set; }
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public string Turno { get; set; } = "";
    public string PorId { get; set; } = "";
    public string PorNombre { get; set; } = "";
    public string Resumen { get; set; } = "{}";             // estado de la planta al momento del traspaso (JSON)
    public string Revisiones { get; set; } = "[]";          // JSON: [{texto, ok}]
    public string Notas { get; set; } = "";
}

public class ProduccionDia
{
    public int Id { get; set; }
    public int EquipoId { get; set; }
    public DateOnly Fecha { get; set; }
    public int UnidadesPlan { get; set; }
    public int UnidadesProducidas { get; set; }
    public int UnidadesBuenas { get; set; }
    public double HorasPlan { get; set; }
}

public class Parada
{
    public int Id { get; set; }
    public int EquipoId { get; set; }
    public DateTime Inicio { get; set; }
    public DateTime? Fin { get; set; }
    public string Motivo { get; set; } = "falla";           // falla | mantencion | detencion
    public bool Automatica { get; set; } = true;
}
