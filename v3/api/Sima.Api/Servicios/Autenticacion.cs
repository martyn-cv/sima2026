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
    public string Clave { get; set; } = "cambie-esta-clave-en-produccion-sima-v3-0123456789abcdef";
    public int HorasValidez { get; set; } = 12;
}

/// <summary>Usuario autenticado, ya validado contra la base en cada petición.</summary>
public record Sesion(string Id, string Nombre, string Perfil, string Canal, string Cargo, int CargoId, string Turno)
{
    public bool Puede(string recurso, string accion) => Permisos.Puede(Perfil, recurso, accion);
}

public class ServicioToken(OpcionesJwt o)
{
    public SymmetricSecurityKey LlaveFirma => new(Encoding.UTF8.GetBytes(o.Clave));

    public (string token, DateTime vence) Crear(Trabajador t, Cargo c, string canal, string? restringido = null)
    {
        var vence = DateTime.UtcNow.AddHours(o.HorasValidez);
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, t.Id), new Claim("nombre", t.NombreCompleto), new Claim("perfil", c.PerfilSima),
            new Claim("canal", canal), new Claim("cargo", c.Nombre), new Claim("cargoId", c.Id.ToString()), new Claim("turno", t.Turno), new Claim("ver", t.VersionSesion.ToString()),
        };
        if (restringido is not null) claims.Add(new Claim("restringido", restringido));   // solo puede configurar su seguridad
        var jwt = new JwtSecurityToken("sima", "sima", claims, expires: vence, signingCredentials: new SigningCredentials(LlaveFirma, SecurityAlgorithms.HmacSha256));
        return (new JwtSecurityTokenHandler().WriteToken(jwt), vence);
    }
}

/// <summary>Comprueba, con un caché de pocos segundos, que la cuenta siga ACTIVA y que la sesión no haya sido revocada.</summary>
public class GuardiaDeCuenta(IMemoryCache cache)
{
    public static readonly TimeSpan Vigencia = TimeSpan.FromSeconds(3);

    public async Task<bool> EsValidaAsync(SimaDb db, string id, int version, string canal)
    {
        var llave = $"cuenta:{id}";
        if (!cache.TryGetValue(llave, out (bool activa, int version, string canal) e))
        {
            var t = await db.Trabajadores.AsNoTracking().Include(x => x.Cargo).FirstOrDefaultAsync(x => x.Id == id);
            if (t is null) return false;
            var est = await Reglas.CalcularUnoAsync(db, id);
            e = (est.Activa, t.VersionSesion, t.Cargo!.Canal);
            cache.Set(llave, e, Vigencia);
        }
        return e.activa && e.version == version && e.canal == canal;
    }

    public void Olvidar(string id) => cache.Remove($"cuenta:{id}");
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
