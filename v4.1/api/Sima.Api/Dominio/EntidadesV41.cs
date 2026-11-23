namespace Sima.Api.Dominio;

// ================================================================================================ jerarquía de la planta
// Planta → Área → Línea → Equipo → PLC. Antes la zona y la línea eran texto repetido en cada equipo; ahora son entidades
// con identificador propio que comparten las tres aplicaciones.

public class Planta
{
    public int Id { get; set; }
    public string Codigo { get; set; } = "";             // PQ
    public string Nombre { get; set; } = "";
    public string Ciudad { get; set; } = "";
    public List<AreaPlanta> Areas { get; set; } = new();
}

public class AreaPlanta
{
    public int Id { get; set; }
    public int PlantaId { get; set; }
    public Planta? Planta { get; set; }
    public string Codigo { get; set; } = "";             // N1, N2, SM…
    public string Nombre { get; set; } = "";
    public string Tipo { get; set; } = "produccion";     // produccion | servicios | bodega | patio
    public int Orden { get; set; }
    public List<LineaProduccion> Lineas { get; set; } = new();
}

public class LineaProduccion
{
    public int Id { get; set; }
    public int AreaId { get; set; }
    public AreaPlanta? Area { get; set; }
    public string Codigo { get; set; } = "";             // L1…L4, LS
    public string Nombre { get; set; } = "";
    public List<Equipo> Equipos { get; set; } = new();
}

// ================================================================================================ historial operativo
/// <summary>
/// Evento de planta. Lo produce el simulador, un gateway real, la web, la app de escritorio o el propio backend.
/// <c>Uid</c> lo genera quien produce el evento: si llega dos veces (reintento, reconexión), la segunda se ignora.
/// </summary>
public class EventoPlanta
{
    public long Id { get; set; }
    public string Uid { get; set; } = "";
    public DateTime Ts { get; set; } = DateTime.UtcNow;           // cuándo ocurrió en el origen
    public DateTime Recibido { get; set; } = DateTime.UtcNow;     // cuándo lo registró el backend
    public string Origen { get; set; } = "sistema";               // simulador | gateway | web | desktop | sistema
    public bool Simulado { get; set; }                            // true si viene de un PLC simulado: nunca se confunde con maquinaria real
    public string Tipo { get; set; } = "";                        // estado_equipo | estado_plc | alarma | falla | arranque | parada | mantenimiento | produccion | registro
    public string Nivel { get; set; } = "info";                   // info | aviso | alarma | ok
    public int? EquipoId { get; set; }
    public int? PlcId { get; set; }
    public string Mensaje { get; set; } = "";
    public string Datos { get; set; } = "{}";
    public string? UsuarioId { get; set; }
}

/// <summary>Cada cambio de estado de un equipo, con quién o qué lo provocó.</summary>
public class CambioEstadoEquipo
{
    public long Id { get; set; }
    public int EquipoId { get; set; }
    public DateTime Ts { get; set; } = DateTime.UtcNow;
    public string Desde { get; set; } = "";
    public string Hasta { get; set; } = "";
    public string Origen { get; set; } = "sistema";
    public bool Simulado { get; set; }
    public string Causa { get; set; } = "";
    /// <summary>Quién hizo el cambio (vacío cuando lo informa el PLC o el sistema) y desde qué plataforma.</summary>
    public string? PorId { get; set; }
    public string? PorNombre { get; set; }
    public string? PorCargo { get; set; }
}

// ================================================================================================ mantenimiento
/// <summary>Intervención técnica sobre una orden de trabajo (lo que el técnico hizo, con qué y cuánto tardó).</summary>
public class Intervencion
{
    public int Id { get; set; }
    public string? Uid { get; set; }                     // idempotencia: la app de escritorio puede reenviar sin duplicar
    public int OrdenId { get; set; }
    public string TecnicoId { get; set; } = "";
    public string TecnicoNombre { get; set; } = "";
    public DateTime Inicio { get; set; }
    public DateTime Fin { get; set; }
    public string Causa { get; set; } = "mecanica";      // mecanica | electrica | hidraulica | neumatica | electronica | operacional | desgaste
    public string Diagnostico { get; set; } = "";
    public string Accion { get; set; } = "";
    public string Resultado { get; set; } = "resuelto";  // resuelto | parcial | requiere_repuesto
    public string Observaciones { get; set; } = "";
    public DateTime Registrada { get; set; } = DateTime.UtcNow;
    public List<IntervencionHerramienta> Herramientas { get; set; } = new();
}

public class IntervencionHerramienta
{
    public int IntervencionId { get; set; }
    public int HerramientaId { get; set; }
}

/// <summary>Manual, procedimiento o ficha técnica. Si <c>EquipoId</c> es nulo, aplica a todos los equipos de ese <c>TipoEquipo</c>.</summary>
public class Documento
{
    public int Id { get; set; }
    public int? EquipoId { get; set; }
    public string TipoEquipo { get; set; } = "";
    public string Titulo { get; set; } = "";
    public string Clase { get; set; } = "procedimiento"; // manual | procedimiento | ficha | seguridad
    public string Version { get; set; } = "1.0";
    public string Contenido { get; set; } = "";          // texto con pasos numerados
}

/// <summary>Repuestos que usa cada equipo (lista técnica).</summary>
public class EquipoRepuesto
{
    public int EquipoId { get; set; }
    public int RepuestoId { get; set; }
    public int CantidadSugerida { get; set; } = 1;
}
