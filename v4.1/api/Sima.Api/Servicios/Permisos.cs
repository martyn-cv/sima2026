using Microsoft.EntityFrameworkCore;
using Sima.Api.Datos;
using Sima.Api.Dominio;

namespace Sima.Api.Servicios;

/// <summary>
/// Permisos por cargo, con alcance. Cada cargo tiene un conjunto de capacidades «recurso.accion» (por ejemplo
/// remuneraciones.preparar o calidad.liberar) y para cada una un alcance: propio, equipo, area, planta, empresa o agregado.
/// Las capacidades viven en la tabla rol_permisos (base única); aquí están los valores de fábrica y la caché en memoria.
/// El servidor valida cada petición: ocultar un botón en pantalla no es una protección. Lo que no está permitido, se niega.
/// </summary>
public static class Permisos
{
    public const string Ver = "ver", Editar = "editar";
    public const int VersionMatriz = 7;

    public static readonly string[] PerfilesWeb = { "gerencia", "finanzas_adm", "produccion_ing", "calidad_gestion", "logistica", "rrhh", "comercial" };

    /// <summary>Recursos controlados. Lo que no aparece aquí (cargos, directorio) lo ve cualquier cuenta activa.</summary>
    public static readonly (string clave, string titulo, string grupo)[] Recursos =
    {
        ("personal", "Fichas de personal", "Personas"), ("contratos", "Contratos", "Personas"), ("terminos", "Desvinculaciones", "Personas"), ("cuentas", "Cuentas de acceso", "Personas"),
        ("asistencia", "Asistencia", "Personas"), ("habilitaciones", "Habilitaciones", "Personas"),
        ("remuneraciones", "Remuneraciones", "Pagos"), ("conceptos", "Conceptos variables", "Pagos"), ("parametros", "Parámetros legales", "Pagos"),
        ("produccion", "Producción", "Operación"), ("calidad", "Calidad", "Operación"), ("sst", "Seguridad y salud", "Operación"), ("kpis", "Indicadores", "Operación"),
        ("despachos", "Despachos", "Operación"), ("repuestos", "Repuestos", "Mantenimiento"), ("herramientas", "Herramientas", "Mantenimiento"), ("ordenes", "Órdenes de trabajo", "Mantenimiento"),
        ("traspaso", "Traspaso de turno", "Mantenimiento"), ("planta", "Planta en vivo, eventos y alarmas", "Planta"), ("equipos", "Equipos y estructura de planta", "Planta"), ("plc", "Controladores PLC", "Planta"), ("plc_comandos", "Mandos a distancia", "Planta"),
        ("auditoria", "Auditoría", "Organización"), ("permisos", "Permisos por cargo", "Organización"),
    };

    public static readonly Dictionary<string, string> Acciones = new()
    {
        ["ver"] = "Consultar", ["editar"] = "Crear y editar", ["sensibles"] = "Ver datos sensibles", ["agregado"] = "Solo totales", ["preparar"] = "Preparar", ["aprobar"] = "Aprobar",
        ["validar"] = "Validar", ["retirar"] = "Retirar con OT", ["crear"] = "Preparar OT", ["ejecutar"] = "Ejecutar y firmar", ["registrar"] = "Registrar", ["analizar"] = "Analizar",
        ["liberar"] = "Liberar o rechazar", ["reportar"] = "Reportar", ["gestionar"] = "Investigar y cerrar", ["asignar"] = "Asignar y programar",
    };

    /// <summary>
    /// Capacidades de fábrica de un cargo (capacidad → alcance). Salen del catálogo funcional de los 64 cargos
    /// (docs/analisis/cargos/*.yaml → PermisosCatalogo.g.cs): cada capacidad se justifica en la ficha del cargo y no en
    /// el perfil que comparte con otros cargos. Un cargo que no está en el catálogo no recibe nada (mínimo privilegio).
    /// </summary>
    public static Dictionary<string, string> DeFabrica(int cargoId, string perfil)
        => PermisosCatalogo.PorCargo.TryGetValue(cargoId, out var caps) ? caps.ToDictionary(c => c.Capacidad, c => c.Alcance) : new() { ["sst.reportar"] = "propio" };

    static readonly string[] Orden = { "propio", "equipo", "area", "agregado", "planta", "empresa" };
    static string MasAmplio(string a, string b) => Array.IndexOf(Orden, a) >= Array.IndexOf(Orden, b) ? a : b;

    // ---------------------------------------------------------------------------------------------- caché
    static volatile Dictionary<int, Dictionary<string, string>> _porCargo = new();
    static volatile Dictionary<int, string> _perfilDe = new();

    /// <summary>Crea las capacidades de fábrica si la tabla está vacía o es de una versión anterior, y las carga en memoria.</summary>
    public static async Task PrepararAsync(SimaDb db)
    {
        var cargos = await db.Cargos.AsNoTracking().Select(c => new { c.Id, c.PerfilSima }).ToListAsync();
        var version = await db.RolPermisos.AnyAsync() ? await db.RolPermisos.MaxAsync(r => r.Version) : 0;
        if (version < VersionMatriz && cargos.Count > 0)
        {
            db.RolPermisos.RemoveRange(db.RolPermisos);
            foreach (var c in cargos)
                foreach (var (cap, alc) in DeFabrica(c.Id, c.PerfilSima))
                    db.RolPermisos.Add(new RolPermiso { CargoId = c.Id, Capacidad = cap, Alcance = alc, Version = VersionMatriz });
            await db.SaveChangesAsync();
        }
        await RecargarAsync(db);
    }

    public static async Task RecargarAsync(SimaDb db)
    {
        var filas = await db.RolPermisos.AsNoTracking().ToListAsync();
        _porCargo = filas.GroupBy(f => f.CargoId).ToDictionary(g => g.Key, g => g.ToDictionary(f => f.Capacidad, f => f.Alcance));
        _perfilDe = await db.Cargos.AsNoTracking().ToDictionaryAsync(c => c.Id, c => c.PerfilSima);
    }

    static Dictionary<string, string> De(int cargoId, string perfil)
        => _porCargo.TryGetValue(cargoId, out var d) ? d : _perfilDe.ContainsKey(cargoId) ? new() : DeFabrica(cargoId, perfil);

    static bool Controlado(string recurso) => Recursos.Any(r => r.clave == recurso);

    /// <summary>¿El cargo tiene exactamente esta capacidad? «editar» implica «ver».</summary>
    public static bool Tiene(int cargoId, string perfil, string capacidad)
    {
        var d = De(cargoId, perfil);
        if (d.ContainsKey(capacidad)) return true;
        var recurso = capacidad.Split('.')[0];
        return capacidad.EndsWith(".ver") && d.ContainsKey(recurso + ".editar");
    }

    /// <summary>Compatibilidad con la matriz por recurso: «ver» se cumple con cualquier capacidad sobre el recurso.</summary>
    public static bool Puede(int cargoId, string perfil, string recurso, string accion)
    {
        if (!Controlado(recurso)) return true;
        var d = De(cargoId, perfil);
        if (accion == Ver) return d.Keys.Any(k => k.StartsWith(recurso + ".") && k != "sst.reportar" && k != "remuneraciones.agregado" && k != "repuestos.retirar");
        return d.ContainsKey($"{recurso}.{accion}");
    }

    public static string? Alcance(int cargoId, string perfil, string capacidad)
        => De(cargoId, perfil).TryGetValue(capacidad, out var a) ? a : Tiene(cargoId, perfil, capacidad) ? "empresa" : null;

    /// <summary>Lo que recibe el cliente para mostrar u ocultar pantallas (el servidor vuelve a validar todo).</summary>
    public static object ParaCargo(int cargoId, string perfil)
    {
        var mapa = new Dictionary<string, string>();
        foreach (var (k, _, _) in Recursos) mapa[k] = Puede(cargoId, perfil, k, Editar) ? "editar" : Puede(cargoId, perfil, k, Ver) ? "ver" : "no";
        return mapa;
    }

    public static Dictionary<string, string> Capacidades(int cargoId, string perfil) => new(De(cargoId, perfil));
}
