using Microsoft.EntityFrameworkCore;
using Sima.Api.Datos;
using Sima.Api.Dominio;

namespace Sima.Api.Servicios;

/// <summary>
/// Calendario empresarial común. Una persona tiene una sola agenda: lo que programa mantenimiento, prevención o
/// producción se cruza aquí antes de confirmarse. Revisa solapes, turno, habilitaciones y estado de la cuenta, y
/// sugiere horarios libres. Quien no tiene por qué conocer el detalle de una actividad solo ve «ocupado».
/// </summary>
public static class Calendario
{
    static readonly TimeZoneInfo Zona = Buscar();
    static TimeZoneInfo Buscar()
    {
        foreach (var id in new[] { "America/Santiago", "Pacific SA Standard Time" })
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); } catch { /* sin datos de zona */ }
        return TimeZoneInfo.Utc;
    }
    public static DateTime ALocal(DateTime utc) => TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), Zona);
    static readonly System.Globalization.CultureInfo Es = System.Globalization.CultureInfo.GetCultureInfo("es-CL");
    /// <summary>Fecha y hora de planta en texto para avisos («jue 26-11 10:00»).</summary>
    public static string Texto(DateTime utc, string formato = "ddd dd-MM HH:mm") => ALocal(utc).ToString(formato, Es);
    public static DateTime AUtc(DateTime local) => TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(local, DateTimeKind.Unspecified), Zona);

    /// <summary>Turnos de la planta (supuesto documentado en docs/DISENO.md): A 06–14, B 14–22, N 22–06 y D 08:00–17:30 de lunes a viernes.</summary>
    public static (TimeSpan inicio, TimeSpan fin, bool soloHabiles) Turno(string t) => t switch
    {
        "A" => (TimeSpan.FromHours(6), TimeSpan.FromHours(14), false),
        "B" => (TimeSpan.FromHours(14), TimeSpan.FromHours(22), false),
        "N" => (TimeSpan.FromHours(22), TimeSpan.FromHours(30), false),
        _ => (TimeSpan.FromHours(8), TimeSpan.FromHours(17.5), true),
    };
    public static string TurnoTexto(string t) => t switch { "A" => "Turno A (06:00–14:00)", "B" => "Turno B (14:00–22:00)", "N" => "Turno N (22:00–06:00)", _ => "Diurno (08:00–17:30, lunes a viernes)" };

    /// <summary>¿La actividad cae completa dentro del turno de la persona?</summary>
    public static bool EnTurno(string turno, DateTime iniUtc, DateTime finUtc)
    {
        var (ti, tf, habiles) = Turno(turno);
        var ini = ALocal(iniUtc); var fin = ALocal(finUtc);
        foreach (var dia in new[] { ini.Date, ini.Date.AddDays(-1) })                     // el turno de noche empieza el día anterior
        {
            if (habiles && dia.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) continue;
            if (ini >= dia + ti && fin <= dia + tf) return true;
        }
        return false;
    }

    public static readonly string[] Abiertas = { "programada", "en_curso" };

    public record Conflicto(string TrabajadorId, string Persona, string Tipo, string Detalle, bool Bloquea);

    static string Generica(Actividad a) => a.Area switch
    {
        "mantenimiento" => "trabajo de mantenimiento",
        "prevencion" => a.Tipo is "charla" or "capacitacion" or "induccion" ? "capacitación de prevención" : "actividad de prevención",
        "produccion" => "tarea productiva",
        _ => "actividad programada",
    };

    /// <summary>Revisa la disponibilidad de cada persona para el intervalo. Lo bloqueante impide confirmar; lo demás exige confirmación consciente.</summary>
    public static async Task<List<Conflicto>> RevisarAsync(SimaDb db, IReadOnlyCollection<string> personas, DateTime ini, DateTime fin, int? excluir = null, IReadOnlyCollection<string>? habilitaciones = null, CancellationToken ct = default)
    {
        var lista = new List<Conflicto>();
        if (fin <= ini) { lista.Add(new("", "", "horario", "La hora de término debe ser posterior a la de inicio.", true)); return lista; }
        var trab = await db.Trabajadores.AsNoTracking().Where(t => personas.Contains(t.Id)).ToDictionaryAsync(t => t.Id, ct);
        var ocup = await db.ParticipantesActividad.AsNoTracking().Where(p => personas.Contains(p.TrabajadorId))
            .Join(db.Actividades.AsNoTracking().Where(a => Abiertas.Contains(a.Estado) && a.Inicio < fin && a.Fin > ini && (excluir == null || a.Id != excluir)), p => p.ActividadId, a => a.Id, (p, a) => new { p.TrabajadorId, a })
            .ToListAsync(ct);
        var hoy = Reloj.Hoy();
        var habs = habilitaciones is { Count: > 0 } ? await db.Habilitaciones.AsNoTracking().Where(h => personas.Contains(h.TrabajadorId) && habilitaciones.Contains(h.Nombre)).ToListAsync(ct) : new();
        foreach (var id in personas.Distinct())
        {
            if (!trab.TryGetValue(id, out var t)) { lista.Add(new(id, id, "persona", "No existe esa persona.", true)); continue; }
            var nombre = $"{t.Nombres} {t.ApellidoPaterno}";
            if (!(await Reglas.CalcularUnoAsync(db, id)).Activa) lista.Add(new(id, nombre, "cuenta", "No tiene la cuenta activa (contrato o estado laboral).", true));
            foreach (var o in ocup.Where(x => x.TrabajadorId == id))
                lista.Add(new(id, nombre, "solape", $"Ocupado de {ALocal(o.a.Inicio):HH:mm} a {ALocal(o.a.Fin):HH:mm} ({Generica(o.a)})", false));
            if (!EnTurno(t.Turno, ini, fin)) lista.Add(new(id, nombre, "turno", $"Fuera de su turno: {TurnoTexto(t.Turno)}", false));
            foreach (var req in habilitaciones ?? Array.Empty<string>())
                if (!habs.Any(h => h.TrabajadorId == id && h.Nombre == req && h.Vencimiento >= hoy))
                    lista.Add(new(id, nombre, "habilitacion", $"Sin habilitación vigente: {req}", true));
        }
        return lista;
    }

    /// <summary>Próximos horarios en que todas las personas están libres y en turno (pasos de 30 minutos, hasta 7 días).</summary>
    public static async Task<List<DateTime>> SugerirAsync(SimaDb db, IReadOnlyCollection<string> personas, TimeSpan duracion, DateTime desde, int? excluir = null, int cuantos = 3, CancellationToken ct = default)
    {
        var res = new List<DateTime>();
        var trab = await db.Trabajadores.AsNoTracking().Where(t => personas.Contains(t.Id)).Select(t => new { t.Id, t.Turno }).ToListAsync(ct);
        var hasta = desde.AddDays(7);
        var ocupado = await db.ParticipantesActividad.AsNoTracking().Where(p => personas.Contains(p.TrabajadorId))
            .Join(db.Actividades.AsNoTracking().Where(a => Abiertas.Contains(a.Estado) && a.Fin > desde && a.Inicio < hasta && (excluir == null || a.Id != excluir)), p => p.ActividadId, a => a.Id, (p, a) => new { a.Inicio, a.Fin }).ToListAsync(ct);
        var inicio = new DateTime(desde.Year, desde.Month, desde.Day, desde.Hour, desde.Minute >= 30 ? 30 : 0, 0, DateTimeKind.Utc).AddMinutes(30);
        for (var t = inicio; t < hasta && res.Count < cuantos; t = t.AddMinutes(30))
        {
            var f = t + duracion;
            if (trab.All(x => EnTurno(x.Turno, t, f)) && !ocupado.Any(o => o.Inicio < f && o.Fin > t))
            {
                res.Add(t);
                var sig = f.Minute % 30 == 0 ? f : f.AddMinutes(30 - f.Minute % 30);   // la siguiente sugerencia, en una media hora exacta
                t = sig.AddMinutes(-30);
            }
        }
        return res;
    }

    /// <summary>¿Puede la persona ver el detalle de la actividad? Si no, la ve como «ocupado».</summary>
    public static bool VeDetalle(Sesion s, Actividad a)
        => a.Visibilidad == "publica" || a.CreadaPorId == s.Id || a.ResponsableId == s.Id || a.Participantes.Any(p => p.TrabajadorId == s.Id)
           || (a.Visibilidad == "area" && ((a.Area == "mantenimiento" && s.Tiene("ordenes.ver") && s.Alcance("ordenes.ver") != "propio")
                                       || (a.Area == "prevencion" && (s.Tiene("sst.gestionar") || s.Tiene("sst.ver")))
                                       || (a.Area == "produccion" && s.Tiene("produccion.ver"))));

    /// <summary>Mantiene la actividad de una orden al día con su estado (en curso, completada o cancelada).</summary>
    public static async Task SincronizarOtAsync(SimaDb db, OrdenTrabajo o, CancellationToken ct = default)
    {
        var a = await db.Actividades.FirstOrDefaultAsync(x => x.OrdenId == o.Id, ct);
        if (a is null) return;
        a.Estado = o.Estado switch { "en_curso" => "en_curso", "por_verificar" or "cerrada" => "completada", _ => "programada" };
    }

    /// <summary>Agrega una entrada a la bitácora de la orden y avisa a quien corresponde.</summary>
    public static ComentarioOrden Anotar(SimaDb db, OrdenTrabajo o, Sesion s, string tipo, string texto)
    {
        var c = new ComentarioOrden { OrdenId = o.Id, Tipo = tipo, Texto = texto.Trim(), AutorId = s.Id, AutorNombre = s.Nombre, AutorCargo = s.Cargo };
        db.ComentariosOrden.Add(c);
        return c;
    }
}
