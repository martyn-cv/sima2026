using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sima.Api.Datos;
using Sima.Api.Servicios;

namespace Sima.Api.Endpoints;

public record CargoEntrada(int DotacionObjetivo, int SueldoMin, int SueldoMax);

public static class EndpointsOrganizacion
{
    public static void MapOrganizacion(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api").RequireAuthorization();

        g.MapGet("/cargos", async (SimaDb db) =>
        {
            var est = await Reglas.CalcularTodosAsync(db);
            var activos = (await db.Trabajadores.AsNoTracking().Select(t => new { t.Id, t.CargoId }).ToListAsync()).Where(t => est[t.Id].EstadoLaboral == "Activo").GroupBy(t => t.CargoId).ToDictionary(x => x.Key, x => x.Count());
            return Results.Ok((await db.Cargos.AsNoTracking().OrderBy(c => c.Id).ToListAsync()).Select(c => new
            { c.Id, c.FamiliaN, c.Familia, c.Nombre, c.TipoCargo, c.PerfilSima, c.Canal, c.SueldoMin, c.SueldoMax, c.DotacionObjetivo, dotacionActual = activos.GetValueOrDefault(c.Id), brecha = c.DotacionObjetivo - activos.GetValueOrDefault(c.Id),
                c.ParaQueExiste, c.QueHace, c.QueEntrega, c.SeCoordinaCon, c.ComoMedir, c.Conocimientos }));
        });

        g.MapPut("/cargos/{id:int}", async (int id, CargoEntrada e, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("personal.editar") && !s.Tiene("permisos.editar")) return Ayudas.Sin();
            var c = await db.Cargos.FindAsync(id);
            if (c is null) return Ayudas.Error("No existe ese cargo.", 404);
            if (e.SueldoMin > e.SueldoMax || e.DotacionObjetivo < 0) return Ayudas.Error("Revise la banda de sueldo y la dotación.");
            c.DotacionObjetivo = e.DotacionObjetivo; c.SueldoMin = e.SueldoMin; c.SueldoMax = e.SueldoMax;
            db.Auditar(s, "modificó un cargo", "cargo", id.ToString(), $"{c.Nombre}: dotación {e.DotacionObjetivo}, banda {e.SueldoMin:N0}–{e.SueldoMax:N0}");
            await db.SaveChangesAsync();
            return Results.Ok(new { ok = true });
        });

        g.MapGet("/organigrama", async (SimaDb db) =>
        {
            var est = await Reglas.CalcularTodosAsync(db);
            return Results.Ok((await db.Trabajadores.AsNoTracking().Include(t => t.Cargo).OrderBy(t => t.CargoId).ToListAsync()).Where(t => est[t.Id].EstadoLaboral == "Activo")
                .Select(t => new { t.Id, nombre = t.NombreCompleto, cargo = t.Cargo!.Nombre, cargoId = t.CargoId, familia = t.Cargo.Familia, familiaN = t.Cargo.FamiliaN, t.Turno, jefeId = t.JefeDirectoId }));
        });

        g.MapGet("/auditoria", async (string? entidad, string? buscar, int? pagina, ClaimsPrincipal u, SimaDb db) =>
        {
            if (!u.S().Puede("auditoria", "ver")) return Ayudas.Sin();
            var q = db.Auditorias.AsNoTracking().AsQueryable();
            if (!string.IsNullOrEmpty(entidad)) q = q.Where(a => a.Entidad == entidad);
            if (!string.IsNullOrWhiteSpace(buscar)) { var b = buscar.Trim().ToLower(); q = q.Where(a => a.EntidadId.ToLower() == b || a.UsuarioNombre.ToLower().Contains(b) || a.Accion.ToLower().Contains(b) || a.Detalle.ToLower().Contains(b)); }
            var total = await q.CountAsync();
            var items = await q.OrderByDescending(a => a.Id).Skip(((pagina ?? 1) - 1) * 50).Take(50).ToListAsync();
            return Results.Ok(new { total, items });
        });

        g.MapGet("/panel", async (ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            var hoy = Reloj.Hoy();
            object? personas = null;
            if (s.Puede("personal", "ver"))
            {
                var est = await Reglas.CalcularTodosAsync(db);
                var ts = await db.Trabajadores.AsNoTracking().Include(t => t.Cargo).ToListAsync();
                var activos = ts.Where(t => est[t.Id].EstadoLaboral == "Activo").ToList();
                var ultimo = await db.Asistencias.AsNoTracking().MaxAsync(a => (string?)a.Periodo);
                var verPagos = s.Tiene("remuneraciones.ver") || s.Tiene("remuneraciones.agregado");
                var liqs = ultimo is null || !verPagos ? new List<Liquidacion>() : await Liquidador.CalcularPeriodoAsync(db, ultimo);
                var asis = ultimo is null ? new List<Dominio.Asistencia>() : await db.Asistencias.AsNoTracking().Where(a => a.Periodo == ultimo).ToListAsync();
                var vacantes = (await db.Cargos.AsNoTracking().ToListAsync()).Sum(c => Math.Max(0, c.DotacionObjetivo - activos.Count(t => t.CargoId == c.Id)));
                var habil = await db.Habilitaciones.AsNoTracking().ToListAsync();
                var habActivas = habil.Where(h => est[h.TrabajadorId].EstadoLaboral == "Activo").ToList();
                personas = new
                {
                    dotacion = activos.Count, desvinculados = ts.Count - activos.Count, vacantes,
                    terreno = activos.Count(t => t.Cargo!.TipoCargo == "Terreno"), administrativos = activos.Count(t => t.Cargo!.TipoCargo == "Administrativo"),
                    contratos = est.Values.Where(e => e.EstadoLaboral == "Activo" && e.Actual is not null).GroupBy(e => e.Actual!.Tipo).Select(g2 => new { tipo = g2.Key, n = g2.Count() }),
                    cuentas = est.Values.GroupBy(e => e.EstadoCuenta).Select(g2 => new { estado = g2.Key, n = g2.Count() }),
                    porVencer = est.Where(kv => kv.Value.EstadoLaboral == "Activo" && kv.Value.Actual?.FechaTermino is { } f && f.DayNumber - hoy.DayNumber is >= 0 and <= 60)
                        .Select(kv => new { id = kv.Key, nombre = ts.First(t => t.Id == kv.Key).NombreCompleto, cargo = ts.First(t => t.Id == kv.Key).Cargo!.Nombre, vence = kv.Value.Actual!.FechaTermino, dias = kv.Value.Actual.FechaTermino!.Value.DayNumber - hoy.DayNumber }).OrderBy(x => x.dias),
                    habilitacionesVencidas = habActivas.Count(h => h.Vencimiento < hoy), habilitacionesPorVencer = habActivas.Count(h => h.Vencimiento >= hoy && h.Vencimiento.DayNumber - hoy.DayNumber <= 60),
                    porFamilia = activos.GroupBy(t => t.Cargo!.Familia).Select(g2 => new { familia = g2.Key, n = g2.Count() }).OrderByDescending(x => x.n),
                    porTurno = activos.GroupBy(t => t.Turno).Select(g2 => new { turno = g2.Key, n = g2.Count() }).OrderBy(x => x.turno),
                    periodo = ultimo, verPagos, costoHaberes = liqs.Sum(l => l.TotalHaberes), liquidoTotal = liqs.Sum(l => l.LiquidoAPagar),
                    ausentismo = asis.Sum(a => a.DiasProgramados) == 0 ? 0 : Math.Round(asis.Sum(a => a.DiasLicencia + a.DiasPermisoSinGoce) / (double)asis.Sum(a => a.DiasProgramados), 4),
                    horasExtra = asis.Sum(a => a.HorasExtra),
                };
            }
            var equipos = await db.Equipos.AsNoTracking().GroupBy(e => e.Estado).Select(g2 => new { estado = g2.Key, n = g2.Count() }).ToListAsync();
            var planta = new
            {
                equipos, alarmasAbiertas = await db.Alarmas.CountAsync(a => a.Fin == null), alarmasCriticas = await db.Alarmas.CountAsync(a => a.Fin == null && a.Nivel == "alarma"),
                ordenesAbiertas = await db.Ordenes.CountAsync(o => o.Estado != "cerrada"), plcConectados = await db.Plcs.CountAsync(p => p.Estado == "run"), plcTotal = await db.Plcs.CountAsync(),
            };
            return Results.Ok(new { personas, planta });
        });
    }
}
