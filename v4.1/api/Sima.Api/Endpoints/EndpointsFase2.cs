using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Sima.Api.Datos;
using Sima.Api.Dominio;
using Sima.Api.Servicios;

namespace Sima.Api.Endpoints;

public record PlataformaEntrada(bool Habilitado, string? Motivo);

/// <summary>Centro de notificaciones, accesos por plataforma y registro de inicios de sesión.</summary>
public static class EndpointsFase2
{
    public static void MapFase2(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api").RequireAuthorization();

        // ------------------------------------------------------------------------------------ notificaciones (de cada persona)
        g.MapGet("/notificaciones", async (bool? noLeidas, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            var q = db.Notificaciones.AsNoTracking().Where(n => n.UsuarioId == s.Id);
            if (noLeidas == true) q = q.Where(n => n.LeidaEn == null);
            var lista = await q.OrderByDescending(n => n.Id).Take(100).ToListAsync();
            return Results.Ok(new { noLeidas = await db.Notificaciones.CountAsync(n => n.UsuarioId == s.Id && n.LeidaEn == null), items = lista.Select(Avisos.Dto) });
        });
        g.MapPost("/notificaciones/{id:long}/leida", async (long id, ClaimsPrincipal u, SimaDb db) =>
        {
            var n = await db.Notificaciones.FirstOrDefaultAsync(x => x.Id == id && x.UsuarioId == u.S().Id);
            if (n is null) return Ayudas.Error("No existe esa notificación.", 404);
            n.LeidaEn ??= DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(new { ok = true });
        });
        g.MapPost("/notificaciones/leidas", async (ClaimsPrincipal u, SimaDb db) =>
        {
            var id = u.S().Id;
            var n = await db.Notificaciones.Where(x => x.UsuarioId == id && x.LeidaEn == null).ExecuteUpdateAsync(x => x.SetProperty(y => y.LeidaEn, DateTime.UtcNow));
            return Results.Ok(new { marcadas = n });
        });

        // ------------------------------------------------------------------------------------ accesos por plataforma
        g.MapGet("/cuentas/{id}/plataformas", async (string id, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (s.Id != id && !s.Puede("cuentas", "ver")) return Ayudas.Sin();
            var t = await db.Trabajadores.AsNoTracking().Include(x => x.Cargo).FirstOrDefaultAsync(x => x.Id == id);
            if (t is null) return Ayudas.Error("No existe esa persona.", 404);
            var registros = await db.AccesosPlataforma.AsNoTracking().Where(a => a.TrabajadorId == id).ToListAsync();
            var ultimos = await db.RegistrosAcceso.AsNoTracking().Where(r => r.TrabajadorId == id && r.Resultado == "ok").GroupBy(r => r.Plataforma).Select(gr => new { plataforma = gr.Key, fecha = gr.Max(r => r.Fecha) }).ToListAsync();
            return Results.Ok(Plataformas.Todas.Select(p =>
            {
                var r = registros.FirstOrDefault(a => a.Plataforma == p);
                return new
                {
                    plataforma = p, nombre = Plataformas.Nombre(p), porCargo = t.Cargo!.Canal == p, habilitada = r?.Habilitado ?? t.Cargo.Canal == p,
                    autorizacion = r is null ? null : new { r.Habilitado, r.Motivo, r.PorNombre, r.Fecha },
                    ultimoIngreso = ultimos.FirstOrDefault(x => x.plataforma == p)?.fecha,
                };
            }));
        });

        // Autorizar la plataforma que el cargo no trae por defecto es de Personas; revocar cualquiera la puede también
        // soporte TI por seguridad. Revocar cierra en el acto las sesiones de esa plataforma (y solo de esa).
        g.MapPut("/cuentas/{id}/plataformas/{plataforma}", async (string id, string plataforma, PlataformaEntrada e, ClaimsPrincipal u, SimaDb db, GuardiaDeCuenta guardia, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (!Plataformas.Todas.Contains(plataforma)) return Ayudas.Error("Plataforma no válida.", 404);
            if (string.IsNullOrWhiteSpace(e.Motivo)) return Ayudas.Error("Indique el motivo: queda en la auditoría.");
            var t = await db.Trabajadores.Include(x => x.Cargo).FirstOrDefaultAsync(x => x.Id == id);
            if (t is null) return Ayudas.Error("No existe esa persona.", 404);
            if (e.Habilitado ? !s.Tiene("cuentas.plataformas") : !(s.Tiene("cuentas.plataformas") || s.Tiene("cuentas.editar")))
                return Ayudas.Error(e.Habilitado ? "Autorizar una plataforma es de Personas (jefatura de RR. HH.)." : "Revocar el acceso es de Personas o de soporte TI.", 403);
            if (s.Id == id) return Ayudas.Error("No puede cambiar el acceso de su propia cuenta.", 403);
            var (antes, _) = await Plataformas.EstadoAsync(db, t, plataforma);
            var r = await db.AccesosPlataforma.FirstOrDefaultAsync(a => a.TrabajadorId == id && a.Plataforma == plataforma);
            if (r is null) { r = new AccesoPlataforma { TrabajadorId = id, Plataforma = plataforma }; db.AccesosPlataforma.Add(r); }
            r.Habilitado = e.Habilitado; r.Motivo = e.Motivo.Trim(); r.PorId = s.Id; r.PorNombre = s.Nombre; r.Fecha = DateTime.UtcNow;
            if (!e.Habilitado) r.VersionSesion++;                       // las sesiones abiertas en esa plataforma dejan de valer
            db.Auditar(s, e.Habilitado ? $"autorizó {Plataformas.Nombre(plataforma)}" : $"revocó {Plataformas.Nombre(plataforma)}", "cuenta", id, t.NombreCompleto,
                antes ? "con acceso" : "sin acceso", e.Habilitado ? "con acceso" : "sin acceso", e.Motivo);
            await db.SaveChangesAsync();
            guardia.Olvidar(id);
            if (!e.Habilitado) await hub.Clients.Group($"u:{id}").SendAsync("sesionRevocada", new { plataforma, motivo = $"Su acceso a {Plataformas.Nombre(plataforma)} fue revocado." });
            await Avisos.AUsuarioAsync(db, hub, id, e.Habilitado ? $"Personas le autorizó el acceso a {Plataformas.Nombre(plataforma)}." : $"Su acceso a {Plataformas.Nombre(plataforma)} fue revocado: {e.Motivo.Trim()}", "info", null, "personas");
            return Results.Ok(new { ok = true, plataforma, habilitada = e.Habilitado });
        });

        // ------------------------------------------------------------------------------------ registro de inicios de sesión
        g.MapGet("/accesos", async (string? trabajador, string? resultado, string? plataforma, ClaimsPrincipal u, SimaDb db) =>
        {
            if (!u.S().Tiene("auditoria.ver")) return Ayudas.Sin();
            var q = db.RegistrosAcceso.AsNoTracking().AsQueryable();
            if (!string.IsNullOrEmpty(trabajador)) q = q.Where(r => r.TrabajadorId == trabajador);
            if (!string.IsNullOrEmpty(resultado)) q = resultado == "fallidos" ? q.Where(r => r.Resultado != "ok") : q.Where(r => r.Resultado == resultado);
            if (!string.IsNullOrEmpty(plataforma)) q = q.Where(r => r.Plataforma == plataforma);
            var nombres = await db.Trabajadores.AsNoTracking().ToDictionaryAsync(t => t.Id, t => t.Nombres + " " + t.ApellidoPaterno);
            return Results.Ok((await q.OrderByDescending(r => r.Id).Take(300).ToListAsync()).Select(r => new
            {
                r.Id, r.Fecha, r.TrabajadorId, persona = r.TrabajadorId is null ? null : nombres.GetValueOrDefault(r.TrabajadorId), r.Login, r.Plataforma, r.Resultado, r.Ip, r.Agente,
            }));
        });
    }
}
