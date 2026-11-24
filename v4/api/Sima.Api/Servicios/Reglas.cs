using Microsoft.EntityFrameworkCore;
using Sima.Api.Datos;
using Sima.Api.Dominio;

namespace Sima.Api.Servicios;

/// <summary>Reloj reemplazable (las pruebas fijan la fecha con la que se generó el Excel).</summary>
public static class Reloj
{
    public static Func<DateOnly> Hoy { get; set; } = () => DateOnly.FromDateTime(DateTime.Now);
}

public record EstadoTrabajador(string EstadoLaboral, DateOnly? FechaTermino, string? Causal, Contrato? Actual, string EstadoContrato, string EstadoCuenta)
{
    public bool Activa => EstadoCuenta == "ACTIVA";
}

/// <summary>
/// La regla central de la base única: el estado de la cuenta de SIMA sale de los contratos y de las desvinculaciones.
///  - Desvinculado (hay un término con fecha ≤ hoy)  → cuenta CERRADA
///  - Activo con contrato actual vigente              → cuenta ACTIVA
///  - Activo sin contrato vigente                      → cuenta SUSPENDIDA
/// </summary>
public static class Reglas
{
    public static string EstadoContrato(bool desvinculado, Contrato c, DateOnly hoy)
    {
        if (desvinculado) return c.EsActual ? "TERMINADO" : "HISTÓRICO";
        if (!c.EsActual) return "HISTÓRICO";
        return c.FechaTermino is null || c.FechaTermino >= hoy ? "VIGENTE" : "VENCIDO";
    }

    public static EstadoTrabajador Calcular(IEnumerable<TerminoContrato> terminos, IEnumerable<Contrato> contratos, DateOnly hoy)
    {
        var term = terminos.Where(t => t.FechaTermino <= hoy).OrderBy(t => t.FechaTermino).FirstOrDefault();
        var desv = term is not null;
        var actual = contratos.FirstOrDefault(c => c.EsActual);
        var estCont = actual is null ? "SIN CONTRATO" : EstadoContrato(desv, actual, hoy);
        var cuenta = desv ? "CERRADA" : estCont == "VIGENTE" ? "ACTIVA" : "SUSPENDIDA";
        return new EstadoTrabajador(desv ? "Desvinculado" : "Activo", term?.FechaTermino, term?.Causal, actual, estCont, cuenta);
    }

    public static async Task<Dictionary<string, EstadoTrabajador>> CalcularTodosAsync(SimaDb db, IEnumerable<string>? ids = null, CancellationToken ct = default)
    {
        var hoy = Reloj.Hoy();
        var lista = ids?.ToList();
        var qt = db.Terminos.AsNoTracking().AsQueryable();
        var qc = db.Contratos.AsNoTracking().AsQueryable();
        var qw = db.Trabajadores.AsNoTracking().Select(t => t.Id);
        if (lista is not null)
        {
            qt = qt.Where(x => lista.Contains(x.TrabajadorId));
            qc = qc.Where(x => lista.Contains(x.TrabajadorId));
            qw = db.Trabajadores.AsNoTracking().Where(t => lista.Contains(t.Id)).Select(t => t.Id);
        }
        var terminos = (await qt.ToListAsync(ct)).ToLookup(x => x.TrabajadorId);
        var contratos = (await qc.ToListAsync(ct)).ToLookup(x => x.TrabajadorId);
        var res = new Dictionary<string, EstadoTrabajador>();
        foreach (var id in await qw.ToListAsync(ct)) res[id] = Calcular(terminos[id], contratos[id], hoy);
        return res;
    }

    public static async Task<EstadoTrabajador> CalcularUnoAsync(SimaDb db, string id, CancellationToken ct = default)
        => (await CalcularTodosAsync(db, new[] { id }, ct)).GetValueOrDefault(id)
           ?? new EstadoTrabajador("Desconocido", null, null, null, "SIN CONTRATO", "SIN CUENTA");

    public static int Edad(DateOnly nac, DateOnly hoy)
    {
        var e = hoy.Year - nac.Year;
        return nac.AddYears(e) > hoy ? e - 1 : e;
    }

    public static int AntiguedadAnios(DateOnly ingreso, DateOnly hasta) => Math.Max(0, Edad(ingreso, hasta));
}
