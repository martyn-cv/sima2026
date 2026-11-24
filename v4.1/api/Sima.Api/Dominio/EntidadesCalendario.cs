namespace Sima.Api.Dominio;

/// <summary>
/// Actividad del calendario empresarial común: trabajos de mantenimiento, charlas y capacitaciones de prevención,
/// reuniones y actividades productivas. Todas comparten la misma tabla para que la disponibilidad de una persona
/// considere todo lo que ya tiene asignado, sin importar qué departamento lo programó.
/// </summary>
public class Actividad
{
    public int Id { get; set; }
    public string Tipo { get; set; } = "ot";             // ot | preventiva | charla | capacitacion | induccion | simulacro | reunion | produccion
    public string Area { get; set; } = "mantenimiento";  // mantenimiento | prevencion | produccion | personas
    public string Titulo { get; set; } = "";
    public string Descripcion { get; set; } = "";
    public DateTime Inicio { get; set; }                 // UTC
    public DateTime Fin { get; set; }
    public string Ubicacion { get; set; } = "";
    public string Prioridad { get; set; } = "media";
    public string Estado { get; set; } = "programada";   // programada | en_curso | completada | cancelada
    public string Visibilidad { get; set; } = "area";    // publica | area | participantes: fuera de eso, los demás solo ven «ocupado»
    public string Restricciones { get; set; } = "";
    public string Recursos { get; set; } = "[]";         // JSON: equipos, salas, materiales
    public int? OrdenId { get; set; }
    public int? EquipoId { get; set; }
    public string? ResponsableId { get; set; }
    public string CreadaPorId { get; set; } = "";
    public string CreadaPor { get; set; } = "";
    public DateTime Creada { get; set; } = DateTime.UtcNow;
    public string Datos { get; set; } = "{}";            // datos propios del tipo (charla: objetivo, modalidad, material, evaluación…)
    public List<ParticipanteActividad> Participantes { get; set; } = new();
    public uint Version { get; set; }
}

public class ParticipanteActividad
{
    public long Id { get; set; }
    public int ActividadId { get; set; }
    public string TrabajadorId { get; set; } = "";
    public string Rol { get; set; } = "participante";    // responsable | colaborador | participante
    public string Estado { get; set; } = "convocado";    // convocado | confirmado | asistio | ausente | justificado
    public DateTime? RespondioEn { get; set; }
    public string Nota { get; set; } = "";
}

/// <summary>
/// Bitácora de una orden de trabajo: instrucciones de la jefatura, confirmación de recepción, avances, problemas,
/// solicitudes y respuestas. Queda guardada (no es una notificación temporal) y se consulta después.
/// </summary>
public class ComentarioOrden
{
    public long Id { get; set; }
    public int OrdenId { get; set; }
    public string Tipo { get; set; } = "comentario";     // instruccion | recepcion | inicio | avance | problema | ayuda | recursos | tiempo | revision | completada | comentario
    public string Texto { get; set; } = "";
    public string AutorId { get; set; } = "";
    public string AutorNombre { get; set; } = "";
    public string AutorCargo { get; set; } = "";
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
}
