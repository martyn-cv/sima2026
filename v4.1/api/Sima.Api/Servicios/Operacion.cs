using Microsoft.EntityFrameworkCore;
using Sima.Api.Datos;
using Sima.Api.Dominio;

namespace Sima.Api.Servicios;

/// <summary>Registro automático de paradas: cuando un equipo deja de operar se abre una; al volver a operar, se cierra.</summary>
public static class Paradas
{
    public static void Cambio(SimaDb db, Equipo eq, string antes, DateTime ts)
    {
        if (antes == eq.Estado) return;
        var marchaAntes = EstadosEquipo.Marcha(antes); var marchaAhora = EstadosEquipo.Marcha(eq.Estado);
        if (marchaAntes && !marchaAhora)
            db.Paradas.Add(new Parada
            {
                EquipoId = eq.Id, Inicio = ts,
                Motivo = eq.Estado == EstadosEquipo.Falla ? "falla" : EstadosEquipo.DeMantenimiento.Contains(eq.Estado) ? "mantencion" : eq.Estado == EstadosEquipo.Bloqueado ? "seguridad" : "detencion",
            });
        else if (!marchaAntes && marchaAhora)
            foreach (var p in db.Paradas.Where(x => x.EquipoId == eq.Id && x.Fin == null).ToList()) p.Fin = ts;
    }
}

public record Indicador(string Clave, string Nombre, string Area, double? Valor, double Meta, string Mejor, string Unidad, string Estado, string Nota);
public record IndicadorEquipo(string Codigo, string Nombre, double Disponibilidad, double Rendimiento, double Calidad, double Oee, double MttrHoras, double MtbfHoras, int Fallas, double HorasParada);

/// <summary>Los 10 indicadores del informe. Los que no tienen datos en esta base se informan «sin datos» en vez de inventarse.</summary>
public static class Indicadores
{
    static double Horas(Parada p, DateTime desde, DateTime hasta)
    {
        var ini = p.Inicio < desde ? desde : p.Inicio; var fin = p.Fin ?? hasta; fin = fin > hasta ? hasta : fin;
        return Math.Max(0, (fin - ini).TotalHours);
    }

    public static async Task<(List<Indicador> kpis, List<IndicadorEquipo> equipos)> CalcularAsync(SimaDb db, int dias, CancellationToken ct = default)
    {
        dias = Math.Clamp(dias, 1, 90);
        var hasta = DateTime.UtcNow; var desde = hasta.AddDays(-dias);
        var d0 = DateOnly.FromDateTime(desde);
        var equipos = await db.Equipos.AsNoTracking().OrderBy(e => e.Codigo).ToListAsync(ct);
        var prod = (await db.Produccion.AsNoTracking().Where(x => x.Fecha >= d0).ToListAsync(ct)).ToLookup(x => x.EquipoId);
        var paradas = (await db.Paradas.AsNoTracking().Where(p => p.Fin == null || p.Fin >= desde).ToListAsync(ct)).ToLookup(p => p.EquipoId);

        var filas = new List<IndicadorEquipo>();
        foreach (var e in equipos)
        {
            var pr = prod[e.Id].ToList();
            var horasPlan = pr.Sum(x => x.HorasPlan);
            var ps = paradas[e.Id].ToList();
            var horasParada = Math.Min(horasPlan, ps.Sum(p => Horas(p, desde, hasta)));
            var fallas = ps.Where(p => p.Motivo == "falla").ToList();
            var horasFalla = fallas.Sum(p => Horas(p, desde, hasta));
            var disp = horasPlan <= 0 ? 0 : (horasPlan - horasParada) / horasPlan;
            var rend = pr.Sum(x => x.UnidadesPlan) <= 0 ? 0 : Math.Min(1, (double)pr.Sum(x => x.UnidadesProducidas) / pr.Sum(x => x.UnidadesPlan));
            var cal = pr.Sum(x => x.UnidadesProducidas) <= 0 ? 0 : (double)pr.Sum(x => x.UnidadesBuenas) / pr.Sum(x => x.UnidadesProducidas);
            filas.Add(new IndicadorEquipo(e.Codigo, e.Nombre, disp, rend, cal, disp * rend * cal, fallas.Count == 0 ? 0 : horasFalla / fallas.Count,
                fallas.Count == 0 ? horasPlan : Math.Max(0, horasPlan - horasFalla) / fallas.Count, fallas.Count, horasParada));
        }
        var todas = prod.SelectMany(g => g).ToList();
        var plan = todas.Sum(x => x.UnidadesPlan); var producidas = todas.Sum(x => x.UnidadesProducidas); var buenas = todas.Sum(x => x.UnidadesBuenas);
        var nFallas = filas.Sum(f => f.Fallas);
        var horasPlanTotal = todas.Sum(x => x.HorasPlan);
        var horasFallaTotal = paradas.SelectMany(g => g).Where(p => p.Motivo == "falla").Sum(p => Horas(p, desde, hasta));

        var comprometidos = await db.Despachos.AsNoTracking().Where(d => d.Estado == "entregado" && d.Entrega >= desde).ToListAsync(ct);
        var ordenes = await db.Ordenes.AsNoTracking().Where(o => o.Creada >= desde).ToListAsync(ct);
        var ultimo = await db.Asistencias.AsNoTracking().MaxAsync(a => (string?)a.Periodo, ct);
        var asis = ultimo is null ? new List<Asistencia>() : await db.Asistencias.AsNoTracking().Where(a => a.Periodo == ultimo).ToListAsync(ct);
        var progr = asis.Sum(a => a.DiasProgramados);

        Indicador K(string clave, string nombre, string area, double? v, double meta, string mejor, string unidad, string nota = "")
            => new(clave, nombre, area, v is null ? null : Math.Round(v.Value, 1), meta, mejor, unidad, v is null ? "sin datos" : (mejor == "alto" ? v >= meta : v <= meta) ? "cumple" : "no cumple", nota);
        double? Pct(double a, double b) => b <= 0 ? null : a / b * 100;
        var oeeTotal = filas.Count == 0 ? (double?)null : filas.Average(f => f.Oee) * 100;
        var kpis = new List<Indicador>
        {
            K("cumplimiento_plan", "Cumplimiento del plan", "Producción", Pct(buenas, plan), 95, "alto", "%", $"Últimos {dias} días: unidades buenas contra las planificadas."),
            K("oee", "OEE", "Producción", oeeTotal, 75, "alto", "%", "Disponibilidad × rendimiento × calidad, promedio de los equipos."),
            K("tasa_defectos", "Tasa de defectos", "Calidad", producidas <= 0 ? null : 100 - (double)buenas / producidas * 100, 2, "bajo", "%"),
            K("mttr", "MTTR", "Mantenimiento", nFallas == 0 ? null : horasFallaTotal / nFallas, 4, "bajo", "h", "Tiempo medio de reparación de las paradas por falla."),
            K("mtbf", "MTBF", "Mantenimiento", nFallas == 0 ? null : (horasPlanTotal - horasFallaTotal) / nFallas, 300, "alto", "h", "Tiempo medio entre fallas."),
            K("otif", "OTIF", "Logística", comprometidos.Count == 0 ? null : Pct(comprometidos.Count(d => d.Entrega <= d.Compromiso), comprometidos.Count), 95, "alto", "%", "Despachos entregados a tiempo."),
            K("exactitud_inventario", "Exactitud de inventario", "Logística", null, 98, "alto", "%", "Requiere conteos físicos, que esta base no registra."),
            K("ausentismo", "Ausentismo", "Personas", Pct(asis.Sum(a => a.DiasLicencia + a.DiasPermisoSinGoce), progr), 3, "bajo", "%", ultimo is null ? "" : $"Período {ultimo}."),
            K("costo_unitario", "Costo unitario", "Finanzas", null, 1450, "bajo", "$", "Requiere el costo de producción de un ERP."),
            K("cierre_acciones", "Cierre de acciones", "Mantenimiento", ordenes.Count == 0 ? null : Pct(ordenes.Count(o => o.Estado == "cerrada"), ordenes.Count), 90, "alto", "%", "Órdenes de trabajo cerradas contra las creadas."),
        };
        return (kpis, filas);
    }
}
