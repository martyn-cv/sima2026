using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Sima.Api.Datos;
using Sima.Api.Dominio;
using Sima.Api.Servicios;

namespace Sima.Api.Endpoints;

public static class Ayudas
{
    public static Sesion S(this ClaimsPrincipal u) => u.ComoSesion()!;
    public static IResult Sin() => Results.Json(new { error = "No tiene permiso para esta acción." }, statusCode: 403);
    public static IResult Error(string mensaje, int codigo = 400) => Results.Json(new { error = mensaje }, statusCode: codigo);

    public static void Auditar(this SimaDb db, Sesion s, string accion, string entidad, string id, string detalle = "")
        => db.Auditorias.Add(new Auditoria { UsuarioId = s.Id, UsuarioNombre = s.Nombre, Accion = accion, Entidad = entidad, EntidadId = id, Detalle = detalle });

    /// <summary>Personas bajo la jefatura de alguien (directas e indirectas).</summary>
    public static async Task<HashSet<string>> EquipoDeAsync(SimaDb db, string jefeId)
    {
        var pares = await db.Trabajadores.AsNoTracking().Where(t => t.JefeDirectoId != null).Select(t => new { t.Id, J = t.JefeDirectoId! }).ToListAsync();
        var res = new HashSet<string>();
        var cola = new Queue<string>(new[] { jefeId });
        while (cola.Count > 0)
        {
            var j = cola.Dequeue();
            foreach (var p in pares.Where(p => p.J == j && res.Add(p.Id))) cola.Enqueue(p.Id);
        }
        return res;
    }

    public static bool RutValido(string rut)
    {
        var limpio = rut.Replace(".", "").Replace("-", "").Trim().ToUpperInvariant();
        if (limpio.Length < 2 || !limpio[..^1].All(char.IsDigit)) return false;
        var suma = 0; var m = 2;
        foreach (var d in limpio[..^1].Reverse()) { suma += (d - '0') * m; m = m < 7 ? m + 1 : 2; }
        var r = 11 - suma % 11;
        var dv = r == 11 ? '0' : r == 10 ? 'K' : (char)('0' + r);
        return limpio[^1] == dv;
    }

    public static object Resumen(Trabajador t, EstadoTrabajador e, DateOnly hoy) => new
    {
        t.Id, t.Rut, nombre = t.NombreCompleto, cargoId = t.CargoId, cargo = t.Cargo?.Nombre, familia = t.Cargo?.Familia, tipoCargo = t.Cargo?.TipoCargo, perfil = t.Cargo?.PerfilSima, canal = t.Cargo?.Canal,
        t.Turno, t.CorreoCorporativo, t.JefeDirectoId, t.FechaIngreso, edad = Reglas.Edad(t.FechaNacimiento, hoy),
        estadoLaboral = e.EstadoLaboral, fechaTermino = e.FechaTermino, estadoCuenta = e.EstadoCuenta, estadoContrato = e.EstadoContrato,
        tipoContrato = e.Actual?.Tipo, sueldoBase = e.Actual?.SueldoBase, venceContrato = e.Actual?.FechaTermino,
        diasParaVencer = e.Actual?.FechaTermino is { } f && e.EstadoLaboral == "Activo" ? f.DayNumber - hoy.DayNumber : (int?)null,
    };
}
