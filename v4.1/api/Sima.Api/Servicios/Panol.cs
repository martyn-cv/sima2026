using Microsoft.EntityFrameworkCore;
using Sima.Api.Datos;
using Sima.Api.Dominio;

namespace Sima.Api.Servicios;

/// <summary>
/// Reglas del pañol: lo físico (lo que está en el estante) no es lo mismo que lo disponible (lo físico menos lo
/// reservado por otros). Toda entrada y salida queda en la bitácora del ítem, que no se edita ni se borra.
/// </summary>
public static class Panol
{
    public static readonly string[] Activas = { "solicitada", "reservada", "entregada" };

    /// <summary>Unidades reservadas y aún no retiradas (las vencidas ya no cuentan).</summary>
    public static async Task<int> ReservadoAsync(SimaDb db, string tipo, int itemId, int? excluirOrden = null, int? excluirSolicitud = null)
    {
        var ahora = DateTime.UtcNow;
        return await db.SolicitudesPanol.Where(x => x.Tipo == tipo && x.ItemId == itemId && x.Estado == "reservada" && (x.Vigencia == null || x.Vigencia > ahora)
                                                    && (excluirOrden == null || x.OrdenId != excluirOrden) && (excluirSolicitud == null || x.Id != excluirSolicitud))
            .SumAsync(x => (int?)x.Cantidad) ?? 0;
    }

    public static async Task<Dictionary<int, int>> ReservadosAsync(SimaDb db, string tipo)
    {
        var ahora = DateTime.UtcNow;
        return await db.SolicitudesPanol.AsNoTracking().Where(x => x.Tipo == tipo && x.Estado == "reservada" && (x.Vigencia == null || x.Vigencia > ahora))
            .GroupBy(x => x.ItemId).Select(g => new { g.Key, n = g.Sum(x => x.Cantidad) }).ToDictionaryAsync(x => x.Key, x => x.n);
    }

    public static BitacoraPanol Anotar(SimaDb db, string tipo, int itemId, string evento, string detalle, Sesion? s, int? cantidad = null, int? antes = null, int? despues = null, int? orden = null, int? solicitud = null)
    {
        var b = new BitacoraPanol { Tipo = tipo, ItemId = itemId, Evento = evento, Detalle = detalle, Cantidad = cantidad, StockAntes = antes, StockDespues = despues, OrdenId = orden, SolicitudId = solicitud, PorId = s?.Id ?? "sistema", PorNombre = s?.Nombre ?? "SIMA" };
        db.BitacoraPanol.Add(b);
        return b;
    }

    /// <summary>Las reservas que pasaron su vigencia sin retirarse se liberan y quedan registradas.</summary>
    public static async Task VencerAsync(SimaDb db)
    {
        var ahora = DateTime.UtcNow;
        var vencidas = await db.SolicitudesPanol.Where(x => x.Estado == "reservada" && x.Vigencia != null && x.Vigencia <= ahora).ToListAsync();
        if (vencidas.Count == 0) return;
        foreach (var v in vencidas)
        {
            v.Estado = "vencida";
            Anotar(db, v.Tipo, v.ItemId, "vencimiento", $"Reserva de {v.SolicitanteNombre} vencida sin retirar; vuelve a estar disponible.", null, v.Cantidad, orden: v.OrdenId, solicitud: v.Id);
        }
        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Consumo de repuestos al registrar una intervención: primero se descuenta de lo que ya se entregó para esa orden
    /// (no se vuelve a sacar del stock); el resto sale del stock disponible, respetando lo reservado por otros.
    /// Devuelve un error legible o null.
    /// </summary>
    public static async Task<string?> ConsumirAsync(SimaDb db, Sesion s, OrdenTrabajo o, int repuestoId, int cantidad, int intervencionId)
    {
        var r = await db.Repuestos.FindAsync(repuestoId);
        if (r is null) return $"El repuesto {repuestoId} no existe.";
        var entregadas = await db.SolicitudesPanol.Where(x => x.Tipo == "repuesto" && x.ItemId == repuestoId && x.OrdenId == o.Id && x.Estado == "entregada").OrderBy(x => x.Id).ToListAsync();
        var resto = cantidad;
        foreach (var e in entregadas)
        {
            var libre = e.Cantidad - e.Usada - e.Devuelta;
            if (libre <= 0 || resto <= 0) continue;
            var usa = Math.Min(libre, resto);
            e.Usada += usa; resto -= usa;
            if (e.Usada + e.Devuelta >= e.Cantidad) { e.Estado = "cerrada"; e.CerradaEn = DateTime.UtcNow; }
            Anotar(db, "repuesto", r.Id, "uso", $"{usa} usado(s) en {o.Codigo} (ya entregado por el pañol, no se descuenta de nuevo).", s, usa, r.Stock, r.Stock, o.Id, e.Id);
        }
        if (resto == 0) return null;
        // lo reservado para esta misma orden también puede usarse
        var propias = await db.SolicitudesPanol.Where(x => x.Tipo == "repuesto" && x.ItemId == repuestoId && x.OrdenId == o.Id && x.Estado == "reservada").ToListAsync();
        var reservadoOtros = await ReservadoAsync(db, "repuesto", repuestoId, excluirOrden: o.Id);
        var disponible = r.Stock - reservadoOtros;
        if (disponible < resto) return $"No hay stock disponible de {r.Nombre}: {r.Stock} en estante, {reservadoOtros} reservado(s) para otras órdenes.";
        var antes = r.Stock;
        r.Stock -= resto;
        db.MovimientosRepuesto.Add(new MovimientoRepuesto { RepuestoId = r.Id, Cantidad = -resto, OrdenId = o.Id, IntervencionId = intervencionId, PorId = s.Id, PorNombre = s.Nombre, Nota = $"Intervención en {o.Codigo}" });
        foreach (var p in propias) { p.Estado = "cerrada"; p.Usada = p.Cantidad; p.EntregadaEn = DateTime.UtcNow; p.CerradaEn = DateTime.UtcNow; }
        Anotar(db, "repuesto", r.Id, "uso", $"{resto} usado(s) en {o.Codigo}{(propias.Count > 0 ? " (consume su reserva)" : "")}.", s, -resto, antes, r.Stock, o.Id);
        return null;
    }
}
