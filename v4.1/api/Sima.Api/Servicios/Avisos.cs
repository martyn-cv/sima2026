using Microsoft.EntityFrameworkCore;
using Sima.Api.Datos;
using Sima.Api.Dominio;
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
    /// <summary>Quien firma la liberación técnica: supervisión (25) y jefatura de mantenimiento (23).</summary>
    public static readonly int[] Verificadores = { 25, 23 };
    /// <summary>Quien conduce la operación: jefatura de producción (6), supervisión de turno (7) y líderes de línea (8).</summary>
    public static readonly int[] Produccion = { 6, 7, 8 };
    /// <summary>Quien confirma que un equipo liberado vuelve a producción: supervisión de turno (7) y jefatura de producción (6).</summary>
    public static readonly int[] ConfirmanProduccion = { 7, 6 };
    public static readonly int[] Seguridad = { 50 };
    public static readonly int[] Calidad = { 31, 32 };
    public static readonly int[] Panol = { 30 };

    static readonly string[] Categorias = { "critica", "advertencia", "tarea", "solicitud", "aprobacion", "info" };
    static string Categoria(string nivel) => Categorias.Contains(nivel) ? nivel : nivel switch { "alarma" => "critica", "aviso" => "advertencia", _ => "info" };

    /// <summary>
    /// Guarda la notificación para la persona (persiste hasta que la lee) y la empuja en vivo a sus sesiones abiertas.
    /// «nivel» acepta una categoría (critica, advertencia, tarea, solicitud, aprobacion, info) o un nivel de planta.
    /// </summary>
    public static async Task AUsuarioAsync(SimaDb db, IHubContext<PlantaHub> hub, string? id, string texto, string nivel = "info", string? destino = null, string origen = "sistema", string? referencia = null)
    {
        if (id is null) return;
        var n = new Notificacion { UsuarioId = id, Categoria = Categoria(nivel), Origen = origen, Texto = texto, Destino = destino, Referencia = referencia };
        db.Notificaciones.Add(n);
        await db.SaveChangesAsync();
        await hub.Clients.Group($"u:{id}").SendAsync("notificacion", Dto(n));
    }

    /// <summary>Notifica a todas las personas activas de esos cargos (cada una con su propio estado de lectura).</summary>
    public static async Task ACargosAsync(SimaDb db, IHubContext<PlantaHub> hub, IEnumerable<int> cargos, string texto, string nivel = "info", string? destino = null, string origen = "sistema", string? referencia = null, string? excepto = null)
    {
        var lista = cargos.ToList();
        var est = await Reglas.CalcularTodosAsync(db);
        var ids = (await db.Trabajadores.AsNoTracking().Where(t => lista.Contains(t.CargoId)).Select(t => t.Id).ToListAsync())
            .Where(i => i != excepto && est.TryGetValue(i, out var e) && e.Activa).ToList();
        var nuevas = ids.Select(i => new Notificacion { UsuarioId = i, Categoria = Categoria(nivel), Origen = origen, Texto = texto, Destino = destino, Referencia = referencia }).ToList();
        db.Notificaciones.AddRange(nuevas);
        await db.SaveChangesAsync();
        foreach (var n in nuevas) await hub.Clients.Group($"u:{n.UsuarioId}").SendAsync("notificacion", Dto(n));
    }

    public static object Dto(Notificacion n) => new { n.Id, n.Categoria, n.Origen, n.Texto, n.Destino, n.Referencia, n.Fecha, leida = n.LeidaEn is not null, nivel = n.Categoria };
}

/// <summary>Nombres de habilitaciones que el servidor exige (tal como aparecen en la hoja Listas del Excel).</summary>
public static class Competencias
{
    public const string Loto = "Bloqueo y etiquetado (LOTO)";
    /// <summary>Designación interna: permite firmar la liberación técnica cuando no está la supervisión ni la jefatura.</summary>
    public const string ResponsableTurno = "Responsable de mantenimiento de turno";
}
