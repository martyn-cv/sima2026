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
    public const int VersionMatriz = 6;

    public static readonly string[] PerfilesWeb = { "gerencia", "finanzas_adm", "produccion_ing", "calidad_gestion", "logistica", "rrhh", "comercial" };
    static readonly string[] Todos = { "operador", "supervisor_turno", "tecnico", "supervisor_mant", "jefe_mant", "confiabilidad", "ing_automatizacion", "instrumentacion", "panol", "calidad_terreno", "prevencion", "gerencia", "finanzas_adm", "produccion_ing", "calidad_gestion", "logistica", "rrhh", "comercial" };
    static readonly string[] Terreno = { "operador", "supervisor_turno", "tecnico", "supervisor_mant", "jefe_mant", "confiabilidad", "ing_automatizacion", "instrumentacion", "panol", "calidad_terreno", "prevencion" };
    static readonly string[] Mantencion = { "tecnico", "supervisor_mant", "jefe_mant", "confiabilidad", "ing_automatizacion", "instrumentacion" };

    /// <summary>Recursos controlados. Lo que no aparece aquí (cargos, directorio, equipos, alarmas) lo ve cualquier cuenta activa.</summary>
    public static readonly (string clave, string titulo, string grupo)[] Recursos =
    {
        ("personal", "Fichas de personal", "Personas"), ("contratos", "Contratos", "Personas"), ("terminos", "Desvinculaciones", "Personas"), ("cuentas", "Cuentas de acceso", "Personas"),
        ("asistencia", "Asistencia", "Personas"), ("habilitaciones", "Habilitaciones", "Personas"),
        ("remuneraciones", "Remuneraciones", "Pagos"), ("conceptos", "Conceptos variables", "Pagos"), ("parametros", "Parámetros legales", "Pagos"),
        ("produccion", "Producción", "Operación"), ("calidad", "Calidad", "Operación"), ("sst", "Seguridad y salud", "Operación"), ("kpis", "Indicadores", "Operación"),
        ("despachos", "Despachos", "Operación"), ("repuestos", "Repuestos", "Mantenimiento"), ("herramientas", "Herramientas", "Mantenimiento"), ("ordenes", "Órdenes de trabajo", "Mantenimiento"),
        ("traspaso", "Traspaso de turno", "Mantenimiento"), ("equipos", "Equipos y estructura de planta", "Planta"), ("plc", "Controladores PLC", "Planta"), ("plc_comandos", "Mandos a distancia", "Planta"),
        ("auditoria", "Auditoría", "Organización"), ("permisos", "Permisos por cargo", "Organización"),
    };

    public static readonly Dictionary<string, string> Acciones = new()
    {
        ["ver"] = "Consultar", ["editar"] = "Crear y editar", ["sensibles"] = "Ver datos sensibles", ["agregado"] = "Solo totales", ["preparar"] = "Preparar", ["aprobar"] = "Aprobar",
        ["validar"] = "Validar", ["retirar"] = "Retirar con OT", ["crear"] = "Preparar OT", ["ejecutar"] = "Ejecutar y firmar", ["registrar"] = "Registrar", ["analizar"] = "Analizar",
        ["liberar"] = "Liberar o rechazar", ["reportar"] = "Reportar", ["gestionar"] = "Investigar y cerrar",
    };

    /// <summary>Regla de fábrica: una capacidad para ciertos perfiles o cargos, con su alcance.</summary>
    record Regla(string Cap, string[]? Perfiles = null, int[]? Cargos = null, string Alcance = "empresa", int[]? Excepto = null);

    // Cargos citados en el informe de accesos: 4 jefa adm. planta · 44 jefa RR. HH. · 45 reclutador · 46 analista de remuneraciones · 47 capacitación
    // 49 asistente de personal · 55 gerente de finanzas · 56 contador · 58 tesorería · 59 soporte TI · 23 jefa de mantenimiento · 24 planificador
    // 25 supervisor de mantenimiento · 31 jefa de calidad · 3 gerente de planta · 18/19/22 automatización · 50 prevención de riesgos · 6 jefe de producción · 36 PPC
    static readonly int[] RrhhTodos = { 44, 45, 46, 47, 48, 49 };
    static readonly Regla[] Fabrica =
    {
        new("personal.ver", Cargos: new[] { 44, 45, 46, 47, 48, 49, 4, 55, 56, 58, 1, 2, 3 }),
        new("personal.sensibles", Cargos: new[] { 44, 46, 49, 55, 58 }),
        new("personal.editar", Cargos: new[] { 44, 45, 49 }),
        new("contratos.ver", Cargos: new[] { 44, 45, 46, 49, 4, 55, 1, 2, 3 }),
        new("contratos.editar", Cargos: new[] { 44, 49 }),
        new("terminos.ver", Cargos: new[] { 44, 46, 49, 4, 55, 1, 2, 3 }),
        new("terminos.editar", Cargos: new[] { 44 }),
        new("cuentas.ver", Cargos: new[] { 44, 49, 59, 1 }),
        new("cuentas.editar", Cargos: new[] { 44, 59 }),

        new("remuneraciones.ver", Cargos: new[] { 44, 46, 4, 55, 56, 58 }),
        new("remuneraciones.agregado", Perfiles: new[] { "gerencia" }, Cargos: new[] { 5, 57 }, Alcance: "agregado"),
        new("remuneraciones.preparar", Cargos: new[] { 46, 44 }),
        new("remuneraciones.aprobar", Cargos: new[] { 55, 4 }),
        new("conceptos.ver", Cargos: new[] { 44, 46, 4, 55 }),
        new("conceptos.editar", Cargos: new[] { 46 }),
        new("parametros.ver", Cargos: new[] { 44, 46, 4, 55, 56 }),
        new("parametros.editar", Cargos: new[] { 55, 4 }),
        new("parametros.validar", Cargos: new[] { 55, 4 }),

        new("asistencia.ver", Cargos: new[] { 44, 46, 49, 4, 55, 1, 2, 3 }),
        new("asistencia.ver", Perfiles: new[] { "jefe_mant", "supervisor_mant", "supervisor_turno" }, Alcance: "equipo"),
        new("asistencia.editar", Cargos: new[] { 46, 49 }),
        new("habilitaciones.ver", Cargos: new[] { 44, 47, 49, 1, 2, 3, 50 }),
        new("habilitaciones.ver", Perfiles: new[] { "jefe_mant", "supervisor_mant", "supervisor_turno" }, Alcance: "equipo"),
        new("habilitaciones.editar", Cargos: new[] { 44, 47, 50, 23, 25 }),

        new("auditoria.ver", Cargos: new[] { 1, 44, 55, 59 }),
        new("permisos.ver", Cargos: new[] { 1, 2, 3, 44, 55, 59 }),
        new("permisos.editar", Cargos: new[] { 1, 59 }),

        new("equipos.editar", Cargos: new[] { 3, 23, 24, 18, 22 }),                   // registrar máquinas, áreas y líneas
        new("plc.ver", Perfiles: new[] { "gerencia", "produccion_ing", "ing_automatizacion", "instrumentacion", "jefe_mant", "supervisor_mant", "tecnico", "confiabilidad", "supervisor_turno", "operador" }),
        new("plc.editar", Perfiles: new[] { "ing_automatizacion" }),                  // solicitar cambios de programa
        new("plc.aprobar", Cargos: new[] { 3, 23 }),                                   // publicar lo que otro solicitó
        new("plc_comandos.editar", Cargos: new[] { 18, 19, 22, 7, 8, 23, 25, 6 }),

        new("kpis.ver", Perfiles: new[] { "gerencia", "produccion_ing", "finanzas_adm", "calidad_gestion", "jefe_mant", "supervisor_mant", "supervisor_turno", "confiabilidad", "ing_automatizacion" }, Excepto: new[] { 59, 60 }),
        new("despachos.ver", Perfiles: new[] { "logistica", "comercial", "gerencia", "produccion_ing", "finanzas_adm", "calidad_gestion" }, Excepto: new[] { 59, 60 }),
        new("despachos.editar", Perfiles: new[] { "logistica" }),
        new("traspaso.ver", Perfiles: new[] { "supervisor_turno", "supervisor_mant", "jefe_mant", "gerencia", "produccion_ing" }),
        new("traspaso.editar", Perfiles: new[] { "supervisor_turno", "supervisor_mant", "jefe_mant" }),

        new("repuestos.ver", Perfiles: Todos),
        new("repuestos.editar", Perfiles: new[] { "panol" }, Cargos: new[] { 23, 25 }),
        new("repuestos.retirar", Perfiles: new[] { "panol", "tecnico", "supervisor_mant", "jefe_mant", "confiabilidad", "ing_automatizacion", "instrumentacion" }),
        new("herramientas.ver", Perfiles: Todos),
        new("herramientas.editar", Perfiles: new[] { "instrumentacion", "panol", "jefe_mant", "supervisor_mant" }),

        new("ordenes.ver", Perfiles: Todos),
        new("ordenes.crear", Perfiles: Terreno, Cargos: new[] { 6 }),                    // cualquiera en terreno puede avisar una falla
        new("ordenes.ejecutar", Perfiles: Mantencion, Excepto: new[] { 24 }),          // el planificador prepara, no firma la ejecución técnica
        new("ordenes.aprobar", Cargos: new[] { 23, 25 }),

        new("produccion.ver", Perfiles: new[] { "gerencia", "produccion_ing", "supervisor_turno", "calidad_gestion", "calidad_terreno", "logistica", "comercial" }),
        new("produccion.ver", Cargos: new[] { 5, 57, 4, 55 }, Alcance: "agregado"),
        new("produccion.ver", Perfiles: new[] { "operador" }, Alcance: "propio"),
        new("produccion.editar", Cargos: new[] { 6, 36, 7, 8 }),
        new("produccion.registrar", Perfiles: new[] { "operador", "supervisor_turno" }),

        new("calidad.ver", Perfiles: new[] { "calidad_gestion", "calidad_terreno", "gerencia", "produccion_ing", "supervisor_turno", "logistica", "comercial" }),
        new("calidad.registrar", Perfiles: new[] { "calidad_terreno", "calidad_gestion", "supervisor_turno" }),
        new("calidad.analizar", Cargos: new[] { 31, 32, 34 }),
        new("calidad.liberar", Cargos: new[] { 31 }),

        new("sst.ver", Perfiles: new[] { "prevencion", "gerencia", "jefe_mant", "supervisor_mant", "supervisor_turno" }, Cargos: new[] { 44, 48 }),
        new("sst.reportar", Perfiles: Todos),
        new("sst.gestionar", Cargos: new[] { 50, 3 }),
    };

    /// <summary>Capacidades de fábrica para un cargo (capacidad → alcance). Si varias reglas aplican, gana el alcance más amplio.</summary>
    public static Dictionary<string, string> DeFabrica(int cargoId, string perfil)
    {
        var d = new Dictionary<string, string>();
        foreach (var r in Fabrica)
        {
            if (r.Excepto?.Contains(cargoId) == true) continue;
            if (!(r.Perfiles?.Contains(perfil) == true || r.Cargos?.Contains(cargoId) == true)) continue;
            d[r.Cap] = d.TryGetValue(r.Cap, out var a) ? MasAmplio(a, r.Alcance) : r.Alcance;
        }
        return d;
    }

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
