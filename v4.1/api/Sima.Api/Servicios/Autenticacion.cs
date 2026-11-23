using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.IdentityModel.Tokens;
using Sima.Api.Datos;
using Sima.Api.Dominio;

namespace Sima.Api.Servicios;

public class OpcionesJwt
{
    public string Clave { get; set; } = "cambie-esta-clave-en-produccion-sima-v4-0123456789abcdef";
    public int HorasValidez { get; set; } = 12;
}

/// <summary>Usuario autenticado, ya validado contra la base en cada petición.</summary>
public record Sesion(string Id, string Nombre, string Perfil, string Canal, string Cargo, int CargoId, string Turno)
{
    /// <summary>«ver» se cumple con cualquier capacidad del recurso válida en esta plataforma.</summary>
    public bool Puede(string recurso, string accion)
        => accion == Permisos.Ver && Permisos.Puede(CargoId, Perfil, recurso, accion)
            ? Permisos.Capacidades(CargoId, Perfil, Canal).Keys.Any(k => k.StartsWith(recurso + ".") && k != "sst.reportar" && k != "remuneraciones.agregado" && k != "repuestos.retirar")
              || !Permisos.Recursos.Any(r => r.clave == recurso)
            : Permisos.Puede(CargoId, Perfil, recurso, accion) && Permisos.EnPlataforma($"{recurso}.{accion}", Canal);
    public bool Tiene(string capacidad) => Permisos.Tiene(CargoId, Perfil, capacidad) && Permisos.EnPlataforma(capacidad, Canal);
    public string? Alcance(string capacidad) => Permisos.EnPlataforma(capacidad, Canal) ? Permisos.Alcance(CargoId, Perfil, capacidad) : null;
}

public class ServicioToken(OpcionesJwt o)
{
    public SymmetricSecurityKey LlaveFirma => new(Encoding.UTF8.GetBytes(o.Clave));

    public (string token, DateTime vence) Crear(Trabajador t, Cargo c, string canal, string? restringido = null, int versionPlataforma = 1)
    {
        var vence = DateTime.UtcNow.AddHours(o.HorasValidez);
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, t.Id), new Claim("nombre", t.NombreCompleto), new Claim("perfil", c.PerfilSima),
            new Claim("canal", canal), new Claim("cargo", c.Nombre), new Claim("cargoId", c.Id.ToString()), new Claim("turno", t.Turno), new Claim("ver", t.VersionSesion.ToString()),
            new Claim("pver", versionPlataforma.ToString()),   // versión de sesión de esta plataforma: revocarla no toca la otra
        };
        if (restringido is not null) claims.Add(new Claim("restringido", restringido));   // solo puede configurar su seguridad
        var jwt = new JwtSecurityToken("sima", "sima", claims, expires: vence, signingCredentials: new SigningCredentials(LlaveFirma, SecurityAlgorithms.HmacSha256));
        return (new JwtSecurityTokenHandler().WriteToken(jwt), vence);
    }
}

/// <summary>
/// Comprueba, con un caché de pocos segundos, que la cuenta siga ACTIVA, que la sesión no haya sido revocada (global o en
/// esta plataforma) y que la persona siga autorizada para la plataforma del token.
/// </summary>
public class GuardiaDeCuenta(IMemoryCache cache)
{
    public static readonly TimeSpan Vigencia = TimeSpan.FromSeconds(3);

    public async Task<bool> EsValidaAsync(SimaDb db, string id, int version, string canal, int versionPlataforma)
    {
        var llave = $"cuenta:{id}:{canal}";
        if (!cache.TryGetValue(llave, out (bool activa, int version, bool plataforma, int pver) e))
        {
            var t = await db.Trabajadores.AsNoTracking().Include(x => x.Cargo).FirstOrDefaultAsync(x => x.Id == id);
            if (t is null) return false;
            var est = await Reglas.CalcularUnoAsync(db, id);
            var (permitida, pver) = await Plataformas.EstadoAsync(db, t, canal);
            e = (est.Activa, t.VersionSesion, permitida, pver);   // un cambio de cargo sube VersionSesion: el token anterior deja de valer
            cache.Set(llave, e, Vigencia);
        }
        return e.activa && e.version == version && e.plataforma && e.pver == versionPlataforma;
    }

    public void Olvidar(string id) { cache.Remove($"cuenta:{id}:web"); cache.Remove($"cuenta:{id}:app"); }
}

/// <summary>
/// Acceso por plataforma. El canal del cargo (hoja Cargos del Excel) da la plataforma por defecto; la otra plataforma exige
/// una autorización explícita (registro en accesos_plataforma). Cualquiera de las dos se puede revocar por separado.
/// </summary>
public static class Plataformas
{
    /// <summary>Origen legible de un cambio hecho por una persona: «desktop» (canal app) o «web».</summary>
    public static string Origen(string canal) => canal == "app" ? "desktop" : "web";

    public static readonly string[] Todas = { "web", "app" };
    public static string Nombre(string p) => p == "web" ? "SIMA Web" : "SIMA Desktop";

    public static async Task<(bool permitida, int version)> EstadoAsync(SimaDb db, Trabajador t, string plataforma)
    {
        var canal = t.Cargo?.Canal ?? (await db.Cargos.AsNoTracking().FirstAsync(c => c.Id == t.CargoId)).Canal;
        var a = await db.AccesosPlataforma.AsNoTracking().FirstOrDefaultAsync(x => x.TrabajadorId == t.Id && x.Plataforma == plataforma);
        return (a?.Habilitado ?? canal == plataforma, a?.VersionSesion ?? 1);
    }
}

public static class Claves
{
    static readonly PasswordHasher<Trabajador> Hasher = new();
    public static string Hash(string clave) => Hasher.HashPassword(null!, clave);
    public static bool Verificar(string hash, string clave) => Hasher.VerifyHashedPassword(null!, hash, clave) != PasswordVerificationResult.Failed;
}

public static class SesionExtensions
{
    public static Sesion? ComoSesion(this ClaimsPrincipal u)
    {
        var id = u.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? u.FindFirstValue(ClaimTypes.NameIdentifier);
        if (id is null) return null;
        return new Sesion(id, u.FindFirstValue("nombre") ?? "", u.FindFirstValue("perfil") ?? "", u.FindFirstValue("canal") ?? "", u.FindFirstValue("cargo") ?? "",
            int.TryParse(u.FindFirstValue("cargoId"), out var c) ? c : 0, u.FindFirstValue("turno") ?? "D");
    }
}
