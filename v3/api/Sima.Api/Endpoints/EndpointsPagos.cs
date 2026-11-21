using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sima.Api.Datos;
using Sima.Api.Dominio;
using Sima.Api.Servicios;

namespace Sima.Api.Endpoints;

public record AsistenciaEntrada(string Periodo, string TrabajadorId, int DiasProgramados, int DiasLicencia, int DiasPermisoSinGoce, int DiasVacaciones, int HorasExtra);
public record ConceptoEntrada(string Periodo, string TrabajadorId, string Concepto, int Monto, string? Observacion);
public record ParametroEntrada(decimal Valor);
public record HabilitacionEntrada(string TrabajadorId, string Nombre, DateOnly FechaObtencion, int VigenciaMeses);

public static class EndpointsPagos
{
    public static void MapPagos(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api").RequireAuthorization();

        // ------------------------------------------------------------------------------------ remuneraciones
        g.MapGet("/remuneraciones/periodos", async (ClaimsPrincipal u, SimaDb db) =>
            u.S().Puede("remuneraciones", "ver") ? Results.Ok(await db.Asistencias.AsNoTracking().Select(a => a.Periodo).Distinct().OrderByDescending(p => p).ToListAsync()) : Ayudas.Sin());

        g.MapGet("/remuneraciones", async (string? periodo, ClaimsPrincipal u, SimaDb db) =>
        {
            if (!u.S().Puede("remuneraciones", "ver")) return Ayudas.Sin();
            periodo ??= await db.Asistencias.AsNoTracking().MaxAsync(a => a.Periodo);
            var liqs = await Liquidador.CalcularPeriodoAsync(db, periodo);
            var familias = await db.Trabajadores.AsNoTracking().Include(t => t.Cargo).ToDictionaryAsync(t => t.Id, t => t.Cargo!.Familia);
            var resumen = new
            {
                periodo, trabajadores = liqs.Count, totalHaberes = liqs.Sum(l => l.TotalHaberes), totalImponible = liqs.Sum(l => l.TotalImponible), totalDescuentos = liqs.Sum(l => l.TotalDescuentos),
                totalLiquido = liqs.Sum(l => l.LiquidoAPagar), totalAfp = liqs.Sum(l => l.DescuentoAfp), totalSalud = liqs.Sum(l => l.DescuentoSalud), totalImpuesto = liqs.Sum(l => l.ImpuestoUnico),
                promedioLiquido = liqs.Count == 0 ? 0 : (long)liqs.Average(l => l.LiquidoAPagar),
                porFamilia = liqs.GroupBy(l => familias.GetValueOrDefault(l.IdTrabajador) ?? "—").Select(x => new { familia = x.Key, haberes = x.Sum(l => l.TotalHaberes), personas = x.Count() }).OrderByDescending(x => x.haberes),
                porTipo = liqs.GroupBy(l => l.TipoContrato).Select(x => new { tipo = x.Key, haberes = x.Sum(l => l.TotalHaberes), personas = x.Count() }),
            };
            return Results.Ok(new { resumen, liquidaciones = liqs });
        });

        g.MapGet("/remuneraciones/{periodo}/{id}", async (string periodo, string id, ClaimsPrincipal u, SimaDb db) =>
        {
            if (!u.S().Puede("remuneraciones", "ver")) return Ayudas.Sin();
            var l = (await Liquidador.CalcularPeriodoAsync(db, periodo, id)).FirstOrDefault();
            if (l is null) return Ayudas.Error("No hay liquidación para ese período.", 404);
            var tipos = await db.CatalogoConceptos.AsNoTracking().ToDictionaryAsync(c => c.Concepto, c => c.Tipo);
            var conceptos = (await db.Conceptos.AsNoTracking().Where(c => c.Periodo == periodo && c.TrabajadorId == id).ToListAsync()).Select(c => new { c.Concepto, tipo = tipos.GetValueOrDefault(c.Concepto), c.Monto, c.Observacion });
            return Results.Ok(new { liquidacion = l, conceptos });
        });

        g.MapGet("/parametros", async (ClaimsPrincipal u, SimaDb db) =>
        {
            if (!u.S().Puede("parametros", "ver")) return Ayudas.Sin();
            return Results.Ok(new { parametros = await db.Parametros.AsNoTracking().OrderBy(p => p.Clave).ToListAsync(), afp = await db.Afps.AsNoTracking().OrderBy(a => a.Afp).ToListAsync(), tramos = await db.TramosImpuesto.AsNoTracking().OrderBy(t => t.DesdeUtm).ToListAsync() });
        });

        g.MapPut("/parametros/{clave}", async (string clave, ParametroEntrada e, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Puede("parametros", "editar")) return Ayudas.Sin();
            var p = await db.Parametros.FindAsync(clave);
            if (p is null) return Ayudas.Error("No existe ese parámetro.", 404);
            if (e.Valor < 0) return Ayudas.Error("El valor no puede ser negativo.");
            var antes = p.Valor; p.Valor = e.Valor;
            db.Auditar(s, "cambió un parámetro de remuneraciones", "parámetro", clave, $"{antes} → {e.Valor}");
            await db.SaveChangesAsync();
            return Results.Ok(new { ok = true });
        });

        // ------------------------------------------------------------------------------------ asistencia y conceptos
        g.MapGet("/asistencia", async (string? periodo, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Puede("asistencia", "ver")) return Ayudas.Sin();
            periodo ??= await db.Asistencias.AsNoTracking().MaxAsync(a => a.Periodo);
            var q = db.Asistencias.AsNoTracking().Where(a => a.Periodo == periodo);
            if (Permisos.JefaturasTerreno.Contains(s.Perfil)) { var eq = await Ayudas.EquipoDeAsync(db, s.Id); q = q.Where(a => eq.Contains(a.TrabajadorId)); }
            var nombres = await db.Trabajadores.AsNoTracking().Include(t => t.Cargo).ToDictionaryAsync(t => t.Id);
            return Results.Ok((await q.OrderBy(a => a.TrabajadorId).ToListAsync()).Select(a => new
            {
                a.Id, a.Periodo, a.TrabajadorId, trabajador = nombres[a.TrabajadorId].NombreCompleto, cargo = nombres[a.TrabajadorId].Cargo!.Nombre, a.DiasProgramados, a.DiasLicencia, a.DiasPermisoSinGoce, a.DiasVacaciones,
                a.HorasExtra, diasTrabajados = a.DiasTrabajados, ausentismo = a.DiasProgramados == 0 ? 0 : Math.Round((a.DiasLicencia + a.DiasPermisoSinGoce) / (double)a.DiasProgramados, 4),
            }));
        });

        g.MapPost("/asistencia", async (AsistenciaEntrada e, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Puede("asistencia", "editar")) return Ayudas.Sin();
            if (e.DiasProgramados is < 0 or > 31 || e.DiasLicencia + e.DiasPermisoSinGoce > e.DiasProgramados) return Ayudas.Error("Los días no cuadran con los programados.");
            if (!await db.Trabajadores.AnyAsync(t => t.Id == e.TrabajadorId)) return Ayudas.Error("No existe ese trabajador.", 404);
            var a = await db.Asistencias.FirstOrDefaultAsync(x => x.Periodo == e.Periodo && x.TrabajadorId == e.TrabajadorId);
            if (a is null) db.Asistencias.Add(a = new Asistencia { Periodo = e.Periodo, TrabajadorId = e.TrabajadorId });
            a.DiasProgramados = e.DiasProgramados; a.DiasLicencia = e.DiasLicencia; a.DiasPermisoSinGoce = e.DiasPermisoSinGoce; a.DiasVacaciones = e.DiasVacaciones; a.HorasExtra = e.HorasExtra;
            db.Auditar(s, "registró asistencia", "asistencia", e.TrabajadorId, $"{e.Periodo}: {e.DiasProgramados - e.DiasLicencia - e.DiasPermisoSinGoce} días trabajados, {e.HorasExtra} h extra");
            await db.SaveChangesAsync();
            return Results.Ok(new { a.Id });
        });

        g.MapGet("/conceptos", async (string? periodo, string? trabajadorId, ClaimsPrincipal u, SimaDb db) =>
        {
            if (!u.S().Puede("conceptos", "ver")) return Ayudas.Sin();
            var tipos = await db.CatalogoConceptos.AsNoTracking().ToListAsync();
            var q = db.Conceptos.AsNoTracking().AsQueryable();
            if (!string.IsNullOrEmpty(periodo)) q = q.Where(c => c.Periodo == periodo);
            if (!string.IsNullOrEmpty(trabajadorId)) q = q.Where(c => c.TrabajadorId == trabajadorId);
            var nombres = await db.Trabajadores.AsNoTracking().ToDictionaryAsync(t => t.Id, t => t.Nombres + " " + t.ApellidoPaterno);
            return Results.Ok(new
            {
                catalogo = tipos,
                items = (await q.OrderByDescending(c => c.Periodo).ThenBy(c => c.TrabajadorId).ToListAsync()).Select(c => new { c.Id, c.Periodo, c.TrabajadorId, trabajador = nombres.GetValueOrDefault(c.TrabajadorId), c.Concepto, tipo = tipos.FirstOrDefault(x => x.Concepto == c.Concepto)?.Tipo, c.Monto, c.Observacion }),
            });
        });

        g.MapPost("/conceptos", async (ConceptoEntrada e, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Puede("conceptos", "editar")) return Ayudas.Sin();
            if (!await db.CatalogoConceptos.AnyAsync(c => c.Concepto == e.Concepto)) return Ayudas.Error("Ese concepto no está en el catálogo.");
            if (e.Monto <= 0) return Ayudas.Error("El monto debe ser mayor que cero.");
            if (!await db.Trabajadores.AnyAsync(t => t.Id == e.TrabajadorId)) return Ayudas.Error("No existe ese trabajador.", 404);
            var c = new ConceptoVariable { Periodo = e.Periodo, TrabajadorId = e.TrabajadorId, Concepto = e.Concepto, Monto = e.Monto, Observacion = e.Observacion ?? "" };
            db.Conceptos.Add(c);
            db.Auditar(s, "agregó un concepto variable", "concepto", e.TrabajadorId, $"{e.Periodo}: {e.Concepto} {e.Monto:N0}");
            await db.SaveChangesAsync();
            return Results.Created($"/api/conceptos/{c.Id}", new { c.Id });
        });

        g.MapDelete("/conceptos/{id:int}", async (int id, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Puede("conceptos", "editar")) return Ayudas.Sin();
            var c = await db.Conceptos.FindAsync(id);
            if (c is null) return Ayudas.Error("No existe ese concepto.", 404);
            db.Conceptos.Remove(c);
            db.Auditar(s, "eliminó un concepto variable", "concepto", c.TrabajadorId, $"{c.Periodo}: {c.Concepto} {c.Monto:N0}");
            await db.SaveChangesAsync();
            return Results.Ok(new { ok = true });
        });

        // ------------------------------------------------------------------------------------ habilitaciones
        g.MapGet("/habilitaciones", async (string? estado, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Puede("habilitaciones", "ver")) return Ayudas.Sin();
            var hoy = Reloj.Hoy();
            var q = db.Habilitaciones.AsNoTracking().AsQueryable();
            if (Permisos.JefaturasTerreno.Contains(s.Perfil)) { var eq = await Ayudas.EquipoDeAsync(db, s.Id); q = q.Where(h => eq.Contains(h.TrabajadorId)); }
            var est = await Reglas.CalcularTodosAsync(db);
            var nombres = await db.Trabajadores.AsNoTracking().Include(t => t.Cargo).ToDictionaryAsync(t => t.Id);
            var lista = (await q.ToListAsync()).Where(h => est[h.TrabajadorId].EstadoLaboral == "Activo").Select(h => new
            {
                h.Id, h.TrabajadorId, trabajador = nombres[h.TrabajadorId].NombreCompleto, cargo = nombres[h.TrabajadorId].Cargo!.Nombre, h.Nombre, h.FechaObtencion, h.VigenciaMeses, vence = h.Vencimiento,
                dias = h.Vencimiento.DayNumber - hoy.DayNumber, estado = h.Vencimiento < hoy ? "VENCIDA" : h.Vencimiento.DayNumber - hoy.DayNumber <= 60 ? "POR VENCER" : "VIGENTE",
            }).OrderBy(h => h.dias);
            return Results.Ok(string.IsNullOrEmpty(estado) ? lista : lista.Where(h => h.estado == estado));
        });

        // cualquier persona ve las suyas (app de terreno)
        g.MapGet("/yo/habilitaciones", async (ClaimsPrincipal u, SimaDb db) =>
        {
            var hoy = Reloj.Hoy();
            var id = u.S().Id;
            return Results.Ok((await db.Habilitaciones.AsNoTracking().Where(h => h.TrabajadorId == id).ToListAsync()).Select(h => new
            { h.Id, h.Nombre, h.FechaObtencion, vence = h.Vencimiento, dias = h.Vencimiento.DayNumber - hoy.DayNumber, estado = h.Vencimiento < hoy ? "VENCIDA" : h.Vencimiento.DayNumber - hoy.DayNumber <= 60 ? "POR VENCER" : "VIGENTE" }).OrderBy(h => h.dias));
        });

        g.MapPost("/habilitaciones", async (HabilitacionEntrada e, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Puede("habilitaciones", "editar")) return Ayudas.Sin();
            if (!await db.Trabajadores.AnyAsync(t => t.Id == e.TrabajadorId)) return Ayudas.Error("No existe ese trabajador.", 404);
            if (Permisos.JefaturasTerreno.Contains(s.Perfil) && !(await Ayudas.EquipoDeAsync(db, s.Id)).Contains(e.TrabajadorId)) return Ayudas.Sin();
            if (e.VigenciaMeses <= 0) return Ayudas.Error("La vigencia debe ser positiva.");
            var h = new Habilitacion { TrabajadorId = e.TrabajadorId, Nombre = e.Nombre, FechaObtencion = e.FechaObtencion, VigenciaMeses = e.VigenciaMeses };
            db.Habilitaciones.Add(h);
            db.Auditar(s, "registró una habilitación", "habilitación", e.TrabajadorId, $"{e.Nombre} · {e.VigenciaMeses} meses");
            await db.SaveChangesAsync();
            return Results.Created($"/api/habilitaciones/{h.Id}", new { h.Id });
        });
    }
}
