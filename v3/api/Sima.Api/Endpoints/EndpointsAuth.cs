using Microsoft.EntityFrameworkCore;
using Sima.Api.Datos;
using Sima.Api.Dominio;
using Sima.Api.Servicios;

namespace Sima.Api.Endpoints;

public record LoginEntrada(string Correo, string Clave, string Canal, string? Codigo = null);
public record CodigoEntrada(string Codigo);
public record DesactivarEntrada(string Clave, string Codigo);
public record CambioClaveEntrada(string Actual, string Nueva);

public static class EndpointsAuth
{
    /// <summary>Qué le falta a la persona antes de usar el sistema: un segundo factor exigido o elegir su propia clave.</summary>
    public static string? Restriccion(Trabajador t, Cargo c, IConfiguration cfg)
        => t.DebeCambiarClave ? "clave" : cfg.GetValue("Seguridad:Exigir2fa", false) && c.Canal == "web" && !t.TotpActivo ? "2fa" : null;

    static async Task<object> PerfilUsuario(SimaDb db, Trabajador t, EstadoTrabajador e, string canal, string? restringido = null)
    {
        var c = t.Cargo ?? await db.Cargos.FindAsync(t.CargoId);
        var jefe = t.JefeDirectoId is null ? null : await db.Trabajadores.AsNoTracking().Where(x => x.Id == t.JefeDirectoId).Select(x => x.Nombres + " " + x.ApellidoPaterno).FirstOrDefaultAsync();
        return new
        {
            id = t.Id, nombre = t.NombreCompleto, correo = t.CorreoCorporativo, cargoId = c!.Id, cargo = c.Nombre, familia = c.Familia, perfil = c.PerfilSima, canal, turno = t.Turno,
            jefe, estadoCuenta = e.EstadoCuenta, permisos = Permisos.ParaPerfil(c.PerfilSima), totpActivo = t.TotpActivo, restringido,
        };
    }

    public static void MapAuth(this IEndpointRouteBuilder app, IConfiguration cfg)
    {
        var g = app.MapGroup("/api/auth");

        g.MapPost("/login", async (LoginEntrada e, SimaDb db, ServicioToken tokens, CifradoSecretos cifrado) =>
        {
            var login = (e.Correo ?? "").Trim().ToLowerInvariant();
            var canal = e.Canal is "web" or "app" ? e.Canal : "app";
            var t = await db.Trabajadores.Include(x => x.Cargo).FirstOrDefaultAsync(x => x.CorreoCorporativo == login || x.LoginAlias == login);
            if (t is null) return Ayudas.Error("Correo o clave incorrectos.", 401);
            if (t.BloqueadoHasta is { } b && b > DateTime.UtcNow) return Ayudas.Error($"Demasiados intentos. Vuelva a intentar en {Math.Ceiling((b - DateTime.UtcNow).TotalMinutes)} min.", 429);
            if (!Claves.Verificar(t.PasswordHash, e.Clave ?? ""))
            {
                t.IntentosFallidos++;
                if (t.IntentosFallidos >= 5) { t.BloqueadoHasta = DateTime.UtcNow.AddMinutes(10); t.IntentosFallidos = 0; }
                await db.SaveChangesAsync();
                return Ayudas.Error("Correo o clave incorrectos.", 401);
            }
            var est = await Reglas.CalcularUnoAsync(db, t.Id);
            if (est.EstadoCuenta == "CERRADA") return Ayudas.Error("Su cuenta está cerrada porque ya no pertenece a la empresa. Consulte con Personas.", 403);
            if (est.EstadoCuenta != "ACTIVA") return Ayudas.Error("Su cuenta está suspendida: no tiene un contrato vigente. Consulte con Personas.", 403);
            if (t.Cargo!.Canal != canal) return Ayudas.Error(t.Cargo.Canal == "web" ? "Este perfil ingresa por la web de administración." : "Este perfil ingresa por la aplicación de terreno.", 403);
            if (t.TotpActivo)
            {
                if (string.IsNullOrWhiteSpace(e.Codigo)) return Results.Json(new { error = "Ingrese el código de su aplicación de autenticación.", requiere2fa = true }, statusCode: 401);
                var paso = Totp.Verificar(cifrado.Descifrar(t.TotpSecreto!), e.Codigo, t.TotpUltimoPaso);
                if (paso is null)
                {
                    t.IntentosFallidos++;
                    if (t.IntentosFallidos >= 5) { t.BloqueadoHasta = DateTime.UtcNow.AddMinutes(10); t.IntentosFallidos = 0; }
                    await db.SaveChangesAsync();
                    return Results.Json(new { error = "El código no es correcto o ya se usó. Espere al siguiente.", requiere2fa = true }, statusCode: 401);
                }
                t.TotpUltimoPaso = paso.Value;
            }
            t.IntentosFallidos = 0; t.BloqueadoHasta = null; t.UltimoAcceso = DateTime.UtcNow;
            await db.SaveChangesAsync();
            var restringido = Restriccion(t, t.Cargo, cfg);
            var (token, vence) = tokens.Crear(t, t.Cargo, canal, restringido);
            return Results.Ok(new { token, vence, usuario = await PerfilUsuario(db, t, est, canal, restringido) });
        });

        g.MapGet("/yo", async (System.Security.Claims.ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            var t = await db.Trabajadores.Include(x => x.Cargo).FirstAsync(x => x.Id == s.Id);
            return Results.Ok(await PerfilUsuario(db, t, await Reglas.CalcularUnoAsync(db, t.Id), s.Canal, Restriccion(t, t.Cargo!, cfg)));
        }).RequireAuthorization();

        g.MapPost("/refrescar", async (System.Security.Claims.ClaimsPrincipal u, SimaDb db, ServicioToken tokens) =>
        {
            var s = u.S();
            var t = await db.Trabajadores.Include(x => x.Cargo).FirstAsync(x => x.Id == s.Id);
            var (token, vence) = tokens.Crear(t, t.Cargo!, s.Canal, Restriccion(t, t.Cargo!, cfg));
            return Results.Ok(new { token, vence });
        }).RequireAuthorization();

        g.MapPost("/cambiar-clave", async (CambioClaveEntrada e, System.Security.Claims.ClaimsPrincipal u, SimaDb db, ServicioToken tokens) =>
        {
            var t = await db.Trabajadores.FirstAsync(x => x.Id == u.S().Id);
            if (!Claves.Verificar(t.PasswordHash, e.Actual ?? "")) return Ayudas.Error("La clave actual no es correcta.", 400);
            if ((e.Nueva ?? "").Length < 8) return Ayudas.Error("La clave nueva debe tener al menos 8 caracteres.");
            if (Claves.Verificar(t.PasswordHash, e.Nueva!)) return Ayudas.Error("La clave nueva debe ser distinta de la actual.");
            t.PasswordHash = Claves.Hash(e.Nueva!); t.DebeCambiarClave = false;
            db.Auditar(u.S(), "cambió su clave", "cuenta", t.Id);
            await db.SaveChangesAsync();
            var cargo = await db.Cargos.FindAsync(t.CargoId);
            var (token, vence) = tokens.Crear(t, cargo!, u.S().Canal, Restriccion(t, cargo!, cfg));
            return Results.Ok(new { ok = true, token, vence });
        }).RequireAuthorization();

        // ---- segundo factor
        g.MapPost("/2fa/preparar", async (System.Security.Claims.ClaimsPrincipal u, SimaDb db, CifradoSecretos cifrado) =>
        {
            var t = await db.Trabajadores.FirstAsync(x => x.Id == u.S().Id);
            if (t.TotpActivo) return Ayudas.Error("El segundo factor ya está activo.", 409);
            var secreto = Totp.NuevoSecreto();
            t.TotpSecreto = cifrado.Cifrar(secreto); t.TotpUltimoPaso = 0;
            await db.SaveChangesAsync();
            return Results.Ok(new { secreto, uri = Totp.Uri(t.CorreoCorporativo, secreto) });
        }).RequireAuthorization();

        g.MapPost("/2fa/activar", async (CodigoEntrada e, System.Security.Claims.ClaimsPrincipal u, SimaDb db, CifradoSecretos cifrado, ServicioToken tokens) =>
        {
            var t = await db.Trabajadores.FirstAsync(x => x.Id == u.S().Id);
            if (t.TotpSecreto is null) return Ayudas.Error("Primero pida el código QR.");
            var paso = Totp.Verificar(cifrado.Descifrar(t.TotpSecreto), e.Codigo, 0);
            if (paso is null) return Ayudas.Error("El código no es correcto. Revise la hora del teléfono e intente con el siguiente.");
            t.TotpActivo = true; t.TotpUltimoPaso = paso.Value;
            db.Auditar(u.S(), "activó el segundo factor", "cuenta", t.Id);
            await db.SaveChangesAsync();
            var cargo = await db.Cargos.FindAsync(t.CargoId);
            var (token, vence) = tokens.Crear(t, cargo!, u.S().Canal, Restriccion(t, cargo!, cfg));
            return Results.Ok(new { ok = true, token, vence });
        }).RequireAuthorization();

        g.MapPost("/2fa/desactivar", async (DesactivarEntrada e, System.Security.Claims.ClaimsPrincipal u, SimaDb db, CifradoSecretos cifrado) =>
        {
            var t = await db.Trabajadores.Include(x => x.Cargo).FirstAsync(x => x.Id == u.S().Id);
            if (cfg.GetValue("Seguridad:Exigir2fa", false) && t.Cargo!.Canal == "web") return Ayudas.Error("Su perfil exige el segundo factor.", 403);
            if (!t.TotpActivo) return Ayudas.Error("El segundo factor no está activo.", 409);
            if (!Claves.Verificar(t.PasswordHash, e.Clave ?? "") || Totp.Verificar(cifrado.Descifrar(t.TotpSecreto!), e.Codigo, t.TotpUltimoPaso) is null) return Ayudas.Error("La clave o el código no son correctos.");
            t.TotpActivo = false; t.TotpSecreto = null;
            db.Auditar(u.S(), "desactivó el segundo factor", "cuenta", t.Id);
            await db.SaveChangesAsync();
            return Results.Ok(new { ok = true });
        }).RequireAuthorization();

        // accesos de demostración para la pantalla de ingreso (se apagan con Demo:Habilitado=false)
        g.MapGet("/demo", async (SimaDb db) =>
        {
            if (!cfg.GetValue("Demo:Habilitado", true)) return Results.Ok(Array.Empty<object>());
            var est = await Reglas.CalcularTodosAsync(db);
            var lista = (await db.Trabajadores.AsNoTracking().Include(t => t.Cargo).Where(t => t.LoginAlias != null).ToListAsync())
                .Where(t => est[t.Id].Activa && ImportadorExcel.ClavesDemo.ContainsKey(t.LoginAlias!.Split('@')[0]))
                .Select(t => new { correo = t.LoginAlias, clave = ImportadorExcel.ClavesDemo[t.LoginAlias!.Split('@')[0]], nombre = t.NombreCompleto, cargo = t.Cargo!.Nombre, perfil = t.Cargo.PerfilSima, canal = t.Cargo.Canal })
                .OrderBy(x => x.canal).ThenBy(x => x.cargo).ToList();
            return Results.Ok(lista);
        });
    }
}
