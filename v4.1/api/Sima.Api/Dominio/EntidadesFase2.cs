namespace Sima.Api.Dominio;

// ================================================================================================ liberación de equipos

/// <summary>Prueba que el técnico registra después de intervenir (condición para pedir la liberación).</summary>
public class PruebaOrden
{
    public int Id { get; set; }
    public int OrdenId { get; set; }
    public string? Uid { get; set; }                     // idempotencia (cola sin conexión)
    public string Descripcion { get; set; } = "";        // qué se probó: marcha en vacío, presión, aislamiento…
    public string Resultado { get; set; } = "conforme";  // conforme | no_conforme
    public string Valores { get; set; } = "";            // lecturas o mediciones obtenidas
    public string RegistradaPorId { get; set; } = "";
    public string RegistradaPor { get; set; } = "";
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Una firma del proceso de liberación de un equipo: técnica (supervisión o jefatura de mantenimiento, o un responsable
/// de turno habilitado), seguridad (prevención, si la intervención afecta la seguridad), calidad (si afecta el producto) y
/// producción (confirma que el equipo vuelve al proceso). Cada ronda empieza cuando el técnico pide la liberación.
/// </summary>
public class ValidacionLiberacion
{
    public int Id { get; set; }
    public int OrdenId { get; set; }
    public int EquipoId { get; set; }
    public int Ronda { get; set; }                       // se incrementa cada vez que el técnico vuelve a pedir la liberación
    public string Tipo { get; set; } = "tecnica";        // tecnica | seguridad | calidad | produccion
    public bool Aprobada { get; set; }
    public string Nota { get; set; } = "";
    public string PorId { get; set; } = "";
    public string PorNombre { get; set; } = "";
    public string PorCargo { get; set; } = "";
    public string Plataforma { get; set; } = "";
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
}

/// <summary>Componente de una máquina (motor, variador, sensor, tablero…). Los de demostración quedan marcados.</summary>
public class ComponenteEquipo
{
    public int Id { get; set; }
    public int EquipoId { get; set; }
    public string Tipo { get; set; } = "motor";          // motor | variador | sensor | tablero | actuador | reductor | bomba
    public string Codigo { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string Marca { get; set; } = "";
    public string Modelo { get; set; } = "";
    public string Especificacion { get; set; } = "";     // potencia, tensión, rango…
    public bool Demo { get; set; }                       // dato de demostración (no proviene de la empresa)
}

// ================================================================================================ notificaciones

/// <summary>Notificación dirigida a una persona. Persiste hasta que la lee: no depende de una ventana emergente.</summary>
public class Notificacion
{
    public long Id { get; set; }
    public string UsuarioId { get; set; } = "";
    public string Categoria { get; set; } = "info";      // critica | advertencia | tarea | solicitud | aprobacion | info
    public string Origen { get; set; } = "sistema";      // mantenimiento | produccion | calidad | seguridad | automatizacion | personas | sistema
    public string Texto { get; set; } = "";
    public string? Destino { get; set; }                 // pantalla a la que lleva
    public string? Referencia { get; set; }              // registro relacionado (OT-0061, TC-02…)
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public DateTime? LeidaEn { get; set; }
}

// ================================================================================================ accesos por plataforma

/// <summary>
/// Autorización explícita para una plataforma. El canal del cargo (Excel) da la plataforma por defecto; usar la otra exige
/// un registro aquí con autorización de Personas, y cualquier plataforma se puede revocar. Cada plataforma tiene su propia
/// versión de sesión: revocar Desktop cierra las sesiones de Desktop sin tocar las de la web.
/// </summary>
public class AccesoPlataforma
{
    public int Id { get; set; }
    public string TrabajadorId { get; set; } = "";
    public string Plataforma { get; set; } = "app";      // web | app (SIMA Desktop)
    public bool Habilitado { get; set; }
    public string Motivo { get; set; } = "";
    public string PorId { get; set; } = "";
    public string PorNombre { get; set; } = "";
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public int VersionSesion { get; set; } = 1;
}

/// <summary>Cada intento de inicio de sesión, exitoso o no, con su plataforma.</summary>
public class RegistroAcceso
{
    public long Id { get; set; }
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public string? TrabajadorId { get; set; }
    public string Login { get; set; } = "";
    public string Plataforma { get; set; } = "";
    public string Resultado { get; set; } = "";          // ok | clave_incorrecta | bloqueada | cerrada | suspendida | sin_acceso | codigo_2fa | desconocido
    public string Ip { get; set; } = "";
    public string Agente { get; set; } = "";
}
