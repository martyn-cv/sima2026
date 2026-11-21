using Microsoft.EntityFrameworkCore;
using Sima.Api.Datos;

namespace Sima.Api.Servicios;

public record Liquidacion(
    string Periodo, string IdTrabajador, string Trabajador, string Cargo, string TipoContrato, int DiasTrabajados,
    long SueldoBase, long SueldoProporcional, long Gratificacion, int HorasExtraN, long HorasExtraMonto, long BonosImponibles,
    long TotalImponible, long NoImponibles, long TotalHaberes, long BasePrevisional, long DescuentoAfp, long DescuentoSalud,
    long SeguroCesantia, long BaseTributable, long ImpuestoUnico, long RetencionHonorarios, long OtrosDescuentos,
    long TotalDescuentos, long LiquidoAPagar, string EstadoPago);

public class ParametrosPago
{
    public decimal Imm, Uf, Utm, TopeImponibleUf, TopeCesantiaUf, CotAfp, CotSalud, CesantiaTrabajador, RetencionHonorarios;
    public decimal JornadaHoras, FactorHorasExtra, TopeGratificacionImm, TasaGratificacion;
    public Dictionary<string, decimal> ComisionAfp = new();
    public List<(decimal desde, decimal factor, decimal rebaja)> Tramos = new();

    public static async Task<ParametrosPago> CargarAsync(SimaDb db, CancellationToken ct = default)
    {
        var p = await db.Parametros.AsNoTracking().ToDictionaryAsync(x => x.Clave, x => x.Valor, ct);
        decimal V(string k, decimal def) => p.TryGetValue(k, out var v) ? v : def;
        return new ParametrosPago
        {
            Imm = V("imm", 539000), Uf = V("uf", 40000), Utm = V("utm", 69000), TopeImponibleUf = V("tope_imponible_uf", 90), TopeCesantiaUf = V("tope_cesantia_uf", 135),
            CotAfp = V("cotizacion_afp", 0.10m), CotSalud = V("cotizacion_salud", 0.07m), CesantiaTrabajador = V("cesantia_trabajador", 0.006m),
            RetencionHonorarios = V("retencion_honorarios", 0.1525m), JornadaHoras = V("jornada_semanal_horas", 42), FactorHorasExtra = V("factor_horas_extra", 1.5m),
            TopeGratificacionImm = V("tope_gratificacion_imm", 4.75m), TasaGratificacion = V("tasa_gratificacion", 0.25m),
            ComisionAfp = await db.Afps.AsNoTracking().ToDictionaryAsync(x => x.Afp, x => x.Comision, ct),
            Tramos = (await db.TramosImpuesto.AsNoTracking().OrderBy(x => x.DesdeUtm).ToListAsync(ct)).Select(x => (x.DesdeUtm, x.Factor, x.RebajaUtm)).ToList(),
        };
    }
}

/// <summary>Remuneraciones: mismas fórmulas del Excel, calculadas en el servidor a partir de contratos, asistencia y conceptos.</summary>
public static class Liquidador
{
    static long R(decimal x) => (long)Math.Round(x, 0, MidpointRounding.AwayFromZero);

    public static async Task<List<Liquidacion>> CalcularPeriodoAsync(SimaDb db, string periodo, string? trabajadorId = null, CancellationToken ct = default)
    {
        var p = await ParametrosPago.CargarAsync(db, ct);
        var qa = db.Asistencias.AsNoTracking().Where(a => a.Periodo == periodo);
        if (trabajadorId is not null) qa = qa.Where(a => a.TrabajadorId == trabajadorId);
        var asistencias = await qa.ToListAsync(ct);
        var ids = asistencias.Select(a => a.TrabajadorId).ToList();
        var trabajadores = await db.Trabajadores.AsNoTracking().Include(t => t.Cargo).Where(t => ids.Contains(t.Id)).ToDictionaryAsync(t => t.Id, ct);
        var contratos = (await db.Contratos.AsNoTracking().Where(c => c.EsActual && ids.Contains(c.TrabajadorId)).ToListAsync(ct)).GroupBy(c => c.TrabajadorId).ToDictionary(g => g.Key, g => g.First());
        var tipos = await db.CatalogoConceptos.AsNoTracking().ToDictionaryAsync(c => c.Concepto, c => c.Tipo, ct);
        var conceptos = (await db.Conceptos.AsNoTracking().Where(c => c.Periodo == periodo && ids.Contains(c.TrabajadorId)).ToListAsync(ct)).ToLookup(c => c.TrabajadorId);
        var ultimo = await db.Asistencias.AsNoTracking().MaxAsync(a => a.Periodo, ct);

        var salida = new List<Liquidacion>();
        foreach (var a in asistencias.OrderBy(a => a.TrabajadorId))
        {
            if (!trabajadores.TryGetValue(a.TrabajadorId, out var t)) continue;
            contratos.TryGetValue(a.TrabajadorId, out var c);
            var tipo = c?.Tipo ?? "";
            var hon = tipo == "Honorarios";
            var dias = a.DiasTrabajados;
            decimal sueldoBase = c?.SueldoBase ?? 0;
            var prop = R(sueldoBase * dias / 30m);
            var grat = hon ? 0 : R(Math.Min(p.TasaGratificacion * prop, p.TopeGratificacionImm * p.Imm / 12m * dias / 30m));
            var heMonto = hon ? 0 : R(a.HorasExtra * (sueldoBase * 7m / (30m * p.JornadaHoras)) * p.FactorHorasExtra);
            long bonos = conceptos[a.TrabajadorId].Where(x => tipos.GetValueOrDefault(x.Concepto) == "Haber imponible").Sum(x => (long)x.Monto);
            long otros = conceptos[a.TrabajadorId].Where(x => tipos.GetValueOrDefault(x.Concepto) == "Descuento").Sum(x => (long)x.Monto);
            var imponible = prop + grat + heMonto + bonos;
            var noImp = hon || c is null ? 0 : R((c.Colacion + c.Movilizacion) * dias / 30m);
            var haberes = imponible + noImp;
            var basePrev = hon ? 0 : Math.Min(imponible, R(p.TopeImponibleUf * p.Uf));
            var afp = hon ? 0 : R(basePrev * (p.CotAfp + p.ComisionAfp.GetValueOrDefault(t.Afp)));
            var salud = hon ? 0 : R(basePrev * p.CotSalud);
            var ces = tipo == "Indefinido" ? R(Math.Min(imponible, p.TopeCesantiaUf * p.Uf) * p.CesantiaTrabajador) : 0;
            var baseTrib = hon ? 0 : imponible - afp - salud - ces;
            long imp = 0;
            if (!hon && p.Tramos.Count > 0)
            {
                var utm = baseTrib / p.Utm;
                var tr = p.Tramos.LastOrDefault(x => x.desde <= utm);
                imp = Math.Max(0, R(baseTrib * tr.factor - tr.rebaja * p.Utm));
            }
            var ret = hon ? R(prop * p.RetencionHonorarios) : 0;
            var desc = afp + salud + ces + imp + ret + otros;
            salida.Add(new Liquidacion(periodo, t.Id, t.NombreCompleto, t.Cargo?.Nombre ?? "", tipo, dias, (long)sueldoBase, prop, grat, a.HorasExtra, heMonto, bonos,
                imponible, noImp, haberes, basePrev, afp, salud, ces, baseTrib, imp, ret, otros, desc, haberes - desc, string.CompareOrdinal(periodo, ultimo) == 0 ? "Pendiente" : "Pagada"));
        }
        return salida;
    }
}
