namespace Sima.Api.Dominio;

/// <summary>
/// Falla ficticia provocada desde el simulador sobre un activo de la planta simulada. Guarda la causa real (que los
/// trabajadores no ven), los síntomas observables, cómo afecta a las variables y qué intervención la resuelve.
/// El estado físico (lo que le pasa a la máquina) es distinto del estado administrativo (la orden de trabajo).
/// Nunca se aplica a equipos conectados a un PLC físico.
/// </summary>
public class FallaSimulada
{
    public int Id { get; set; }
    public string Codigo => $"FS-{Id:0000}";
    public int EquipoId { get; set; }
    public int? ComponenteId { get; set; }               // componente afectado (ficha técnica del equipo)
    public string ComponenteTipo { get; set; } = "";     // motor, variador, sensor, actuador, plc, tablero, bomba, programa…
    public string Tipo { get; set; } = "";               // clave del catálogo (sobrecalentamiento_motor, perdida_comunicacion…)
    public string Causa { get; set; } = "";              // causa real (oculta para quien diagnostica)
    public string CausaClave { get; set; } = "";
    public string Sintomas { get; set; } = "";           // lo observable: es lo único que ve la planta
    public string Criticidad { get; set; } = "alta";     // baja | media | alta | critica
    public string Modo { get; set; } = "inmediata";      // inmediata | programada | intermitente | progresiva
    public DateTime Creada { get; set; } = DateTime.UtcNow;
    public DateTime? InicioProgramado { get; set; }
    public DateTime? Inicio { get; set; }                // cuando empezó a manifestarse
    public DateTime? Fin { get; set; }                   // cuando quedó resuelta o se canceló
    public int PeriodoSeg { get; set; } = 120;           // intermitente: ciclo de aparición
    public int DuracionSeg { get; set; } = 600;          // progresiva: tiempo hasta la falla completa
    public double Severidad { get; set; }                // 0..1 (progresiva crece; intermitente alterna)
    /// <summary>programada | activa | latente (intermitente sin manifestarse) | resuelta | cancelada</summary>
    public string EstadoFisico { get; set; } = "programada";
    public string Variables { get; set; } = "[]";        // JSON: [{variable, efecto}] efectos: sube, baja, erratica, congelada, cero
    public string Impacto { get; set; } = "";
    public double FactorRendimiento { get; set; } = 1;  // 1 = sin pérdida; 0 = máquina detenida
    public string Especialidad { get; set; } = "general";
    public string Acciones { get; set; } = "[]";         // JSON: acciones que la resuelven (reemplazo, ajuste, limpieza…)
    public int? RepuestoId { get; set; }                 // repuesto requerido para resolverla (si aplica)
    public string RepuestoClave { get; set; } = "";
    public string EstadoEquipo { get; set; } = "falla";  // estado al manifestarse: falla | operativo_obs
    public int? OrdenId { get; set; }                    // incidencia que generó (estado administrativo)
    public int? AlarmaId { get; set; }
    public string? Escenario { get; set; }
    public string Datos { get; set; } = "{}";            // fallas de lógica: peldaño original y alterado
    public int IntentosFallidos { get; set; }
    public string CreadaPor { get; set; } = "Controlador de simulación";
}

/// <summary>Cada intervención registrada sobre un equipo con una falla simulada se evalúa contra la causa real.</summary>
public class EvaluacionFalla
{
    public long Id { get; set; }
    public int FallaId { get; set; }
    public int OrdenId { get; set; }
    public int? IntervencionId { get; set; }
    public string TecnicoId { get; set; } = "";
    public string TecnicoNombre { get; set; } = "";
    public int? ComponenteId { get; set; }
    public string Componente { get; set; } = "";
    public string Accion { get; set; } = "";
    public string Repuestos { get; set; } = "";
    public string Diagnostico { get; set; } = "";
    public bool ComponenteCorrecto { get; set; }
    public bool AccionCorrecta { get; set; }
    public bool RepuestoCorrecto { get; set; }
    public bool Resuelve { get; set; }
    public string Motivo { get; set; } = "";
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
}

/// <summary>Conjunto de fallas guardado para repetir un ejercicio de entrenamiento.</summary>
public class EscenarioSimulacion
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public string Descripcion { get; set; } = "";
    public string Definicion { get; set; } = "[]";       // JSON: [{equipo, tipo, causa, componenteId, modo, retardoMin, periodoSeg, duracionSeg, criticidad}]
    public DateTime Creado { get; set; } = DateTime.UtcNow;
    public int Ejecuciones { get; set; }
}

/// <summary>Inspección de un componente durante el diagnóstico de una orden (lo que el técnico observó).</summary>
public class InspeccionComponente
{
    public long Id { get; set; }
    public int OrdenId { get; set; }
    public int? ComponenteId { get; set; }
    public string ComponenteTipo { get; set; } = "";
    public string Componente { get; set; } = "";
    public string Hallazgo { get; set; } = "";
    public string TecnicoId { get; set; } = "";
    public string TecnicoNombre { get; set; } = "";
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
}
