namespace Sima.Api.Dominio;

/// <summary>
/// Solicitud al pañol de un repuesto o una herramienta. Recorre: solicitada → (revisión) → reservada → entregada →
/// cerrada (usado / devuelto). Mientras está reservada, la cantidad deja de estar disponible para otros aunque siga
/// físicamente en el estante. Una reserva vence si no se retira dentro de su vigencia.
/// </summary>
public class SolicitudPanol
{
    public int Id { get; set; }
    public string Tipo { get; set; } = "repuesto";        // repuesto | herramienta
    public int ItemId { get; set; }
    public int Cantidad { get; set; } = 1;
    public int? OrdenId { get; set; }
    public string Motivo { get; set; } = "";
    public string SolicitanteId { get; set; } = "";
    public string SolicitanteNombre { get; set; } = "";
    public string Estado { get; set; } = "solicitada";    // solicitada | reservada | entregada | cerrada | rechazada | cancelada | vencida
    public DateTime Creada { get; set; } = DateTime.UtcNow;
    public DateTime? Vigencia { get; set; }               // hasta cuándo se mantiene la reserva
    public string? RevisadaPorId { get; set; }
    public string? RevisadaPor { get; set; }
    public DateTime? RevisadaEn { get; set; }
    public string NotaRevision { get; set; } = "";
    public DateTime? EntregadaEn { get; set; }
    public string? EntregadaPor { get; set; }
    public DateTime? CerradaEn { get; set; }
    public int Usada { get; set; }
    public int Devuelta { get; set; }
    public bool Incompatible { get; set; }                // se pidió aunque no figura como compatible con el equipo de la orden
    public uint Version { get; set; }
}

/// <summary>
/// Bitácora del pañol por ítem. Es de solo agregar: SIMA no ofrece forma de editar ni borrar una entrada
/// (la base de datos lo impide con un disparador). Si algo se registró mal, se agrega una corrección.
/// </summary>
public class BitacoraPanol
{
    public long Id { get; set; }
    public string Tipo { get; set; } = "repuesto";        // repuesto | herramienta
    public int ItemId { get; set; }
    public string Evento { get; set; } = "";              // solicitud | reserva | rechazo | entrega | uso | devolucion | ingreso | ajuste | retiro | vencimiento | cancelacion | calibracion
    public string Detalle { get; set; } = "";
    public int? Cantidad { get; set; }
    public int? StockAntes { get; set; }
    public int? StockDespues { get; set; }
    public int? OrdenId { get; set; }
    public int? SolicitudId { get; set; }
    public string PorId { get; set; } = "";
    public string PorNombre { get; set; } = "";
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
}

/// <summary>Entrega de turno del pañol: quién entrega, quién recibe, qué queda fuera y qué queda pendiente.</summary>
public class EntregaTurnoPanol
{
    public int Id { get; set; }
    public string Turno { get; set; } = "";
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public string EntregaId { get; set; } = "";
    public string EntregaNombre { get; set; } = "";
    public string? RecibeId { get; set; }
    public string? RecibeNombre { get; set; }
    public DateTime? RecibidaEn { get; set; }
    public string Pendientes { get; set; } = "";
    public string Observaciones { get; set; } = "";
    public string Estado { get; set; } = "{}";            // JSON: herramientas fuera, reservas activas, solicitudes por revisar, críticos bajo mínimo
}
