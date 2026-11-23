using Microsoft.AspNetCore.SignalR;

namespace Sima.Api.Servicios;

/// <summary>
/// Notificaciones dirigidas. Cada conexión del hub entra a «u:{id}» (la persona) y «c:{cargo}» (su cargo); además, a
/// «planta» solo si su cargo puede ver la planta. Una notificación lleva texto, nivel y la pantalla a la que lleva; los
/// datos se vuelven a pedir por REST, donde se validan los permisos.
/// </summary>
public static class Avisos
{
    /// <summary>Quien prepara, prioriza y supervisa mantenimiento: jefatura (23), planificación (24) y supervisión (25).</summary>
    public static readonly int[] Mantencion = { 23, 24, 25 };
    /// <summary>Quien verifica cierres de OT y libera equipos: supervisión (25) y jefatura de mantenimiento (23).</summary>
    public static readonly int[] Verificadores = { 25, 23 };
    /// <summary>Quien conduce la operación: jefatura de producción (6), supervisión de turno (7) y líderes de línea (8).</summary>
    public static readonly int[] Produccion = { 6, 7, 8 };

    static object Datos(string texto, string nivel, string? destino) => new { texto, nivel, destino };

    public static Task AUsuarioAsync(IHubContext<PlantaHub> hub, string? id, string texto, string nivel = "info", string? destino = null)
        => id is null ? Task.CompletedTask : hub.Clients.Group($"u:{id}").SendAsync("notificacion", Datos(texto, nivel, destino));

    public static Task ACargosAsync(IHubContext<PlantaHub> hub, IEnumerable<int> cargos, string texto, string nivel = "info", string? destino = null)
        => hub.Clients.Groups(cargos.Select(c => $"c:{c}").ToList()).SendAsync("notificacion", Datos(texto, nivel, destino));
}

/// <summary>Nombres de habilitaciones que el servidor exige (tal como aparecen en la hoja Listas del Excel).</summary>
public static class Competencias
{
    public const string Loto = "Bloqueo y etiquetado (LOTO)";
}
