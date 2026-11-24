namespace Sima.Api.Dominio;

/// <summary>Capacidad que un cargo tiene sobre un recurso, con su alcance (propio, equipo, area, planta, empresa, agregado).</summary>
public class RolPermiso
{
    public int Id { get; set; }
    public int CargoId { get; set; }
    public string Capacidad { get; set; } = "";         // recurso.accion, p. ej. remuneraciones.aprobar
    public string Alcance { get; set; } = "empresa";
    public int Version { get; set; } = 1;
}

/// <summary>Orden de producción de una línea: lo que se planificó, lo que se hizo y lo que salió bueno.</summary>
public class OrdenProduccion
{
    public int Id { get; set; }
    public string Codigo { get; set; } = "";             // OP-2611-001
    public string Producto { get; set; } = "";
    public string Lote { get; set; } = "";
    public int EquipoId { get; set; }                    // la línea se obtiene del equipo (sin texto duplicado)
    public string Turno { get; set; } = "D";
    public int Cantidad { get; set; }
    public int Producidas { get; set; }
    public int Buenas { get; set; }
    public uint Version { get; set; }
    public string Estado { get; set; } = "planificada";  // planificada | en_curso | pausada | terminada
    public DateTime Creada { get; set; } = DateTime.UtcNow;
    public DateTime? Inicio { get; set; }
    public DateTime? Fin { get; set; }
    public string CreadaPor { get; set; } = "";
}

/// <summary>Lo que un operador informa sobre una orden: piezas conformes y rechazadas.</summary>
public class RegistroProduccion
{
    public int Id { get; set; }
    public int OrdenId { get; set; }
    public string OperadorId { get; set; } = "";
    public string OperadorNombre { get; set; } = "";
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public int Conformes { get; set; }
    public int Rechazo { get; set; }
    public string Motivo { get; set; } = "";
}

/// <summary>No conformidad de calidad. Liberar o rechazar un lote exige una facultad explícita.</summary>
public class NoConformidad
{
    public int Id { get; set; }
    public string Codigo { get; set; } = "";             // NC-0001
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public int? OrdenId { get; set; }
    public int? EquipoId { get; set; }
    public string Lote { get; set; } = "";
    public string Producto { get; set; } = "";
    public string Tipo { get; set; } = "dimensional";    // dimensional | visual | funcional | material | documental
    public string Severidad { get; set; } = "menor";     // menor | mayor | critica
    public string Descripcion { get; set; } = "";
    public int Cantidad { get; set; }
    public string Estado { get; set; } = "abierta";      // abierta | en_analisis | liberada | rechazada
    public string RegistradaPorId { get; set; } = "";
    public string RegistradaPor { get; set; } = "";
    public string Analisis { get; set; } = "";
    public string Disposicion { get; set; } = "";
    public string? ResueltaPor { get; set; }
    public DateTime? FechaResolucion { get; set; }
}

/// <summary>Incidente de seguridad y salud en el trabajo. No guarda información clínica.</summary>
public class IncidenteSst
{
    public int Id { get; set; }
    public string Codigo { get; set; } = "";             // SST-0001
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public int AreaId { get; set; }
    public int? EquipoId { get; set; }
    public string Tipo { get; set; } = "casi_accidente"; // condicion_insegura | casi_accidente | incidente | accidente
    public string Severidad { get; set; } = "leve";      // leve | grave | critica
    public string Descripcion { get; set; } = "";
    public string ControlInmediato { get; set; } = "";
    public string Estado { get; set; } = "reportado";    // reportado | investigacion | cerrado
    public string ReportadoPorId { get; set; } = "";
    public string ReportadoPor { get; set; } = "";
    public string? Responsable { get; set; }
    public string Cierre { get; set; } = "";
    public DateTime? FechaCierre { get; set; }
}

/// <summary>Solicitud de cambio del programa de un PLC. Quien solicita no puede aprobar su propio cambio.</summary>
public class CambioPlc
{
    public int Id { get; set; }
    public int PlcId { get; set; }
    public int VersionBase { get; set; }
    public string Programa { get; set; } = "{}";         // programa propuesto (JSON)
    public string Resumen { get; set; } = "";            // peldaños agregados, quitados o modificados
    public string Justificacion { get; set; } = "";
    public string Origen { get; set; } = "web";          // web | simulador
    public string Estado { get; set; } = "pendiente";    // pendiente | aprobado | rechazado
    public string SolicitadoPorId { get; set; } = "";
    public string SolicitadoPor { get; set; } = "";
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public string? RevisadoPorId { get; set; }
    public string? RevisadoPor { get; set; }
    public DateTime? FechaRevision { get; set; }
    public string Comentario { get; set; } = "";
    public int? VersionPublicada { get; set; }
}

/// <summary>Cierre mensual de remuneraciones: lo prepara una persona y lo aprueba otra distinta.</summary>
public class CierreRemuneraciones
{
    public int Id { get; set; }
    public string Periodo { get; set; } = "";
    public string Estado { get; set; } = "preparado";    // preparado | aprobado | rechazado
    public int Personas { get; set; }
    public long TotalHaberes { get; set; }
    public long TotalLiquido { get; set; }
    public string PreparadoPorId { get; set; } = "";
    public string PreparadoPor { get; set; } = "";
    public DateTime FechaPreparacion { get; set; } = DateTime.UtcNow;
    public string? AprobadoPorId { get; set; }
    public string? AprobadoPor { get; set; }
    public DateTime? FechaAprobacion { get; set; }
    public string Comentario { get; set; } = "";
}

/// <summary>Validación formal de los parámetros legales de un período: sin ella no se puede preparar la nómina.</summary>
public class ValidacionParametros
{
    public int Id { get; set; }
    public string Periodo { get; set; } = "";
    public string ValidadoPorId { get; set; } = "";
    public string ValidadoPor { get; set; } = "";
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public string Nota { get; set; } = "";
}
