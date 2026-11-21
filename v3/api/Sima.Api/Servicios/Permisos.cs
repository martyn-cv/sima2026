namespace Sima.Api.Servicios;

/// <summary>
/// Matriz de permisos por perfil (hoja «Permisos» del Excel). El servidor valida cada petición:
/// ocultar un botón en pantalla no es una protección.
/// </summary>
public static class Permisos
{
    public const string Ver = "ver", Editar = "editar";

    public static readonly string[] PerfilesWeb = { "gerencia", "finanzas_adm", "produccion_ing", "calidad_gestion", "logistica", "rrhh", "comercial" };
    public static readonly string[] JefaturasTerreno = { "jefe_mant", "supervisor_mant", "supervisor_turno" };

    static readonly string[] Todos = { "operador", "supervisor_turno", "tecnico", "supervisor_mant", "jefe_mant", "confiabilidad", "ing_automatizacion", "instrumentacion", "panol", "calidad_terreno", "prevencion", "gerencia", "finanzas_adm", "produccion_ing", "calidad_gestion", "logistica", "rrhh", "comercial" };

    // recurso → (perfiles que ven, perfiles que editan)
    static readonly Dictionary<string, (string[] ver, string[] editar)> Matriz = new()
    {
        ["personal"] = (new[] { "rrhh", "finanzas_adm", "gerencia" }, new[] { "rrhh" }),
        ["contratos"] = (new[] { "rrhh", "finanzas_adm", "gerencia" }, new[] { "rrhh" }),
        ["terminos"] = (new[] { "rrhh", "finanzas_adm", "gerencia" }, new[] { "rrhh" }),
        ["cuentas"] = (new[] { "rrhh", "finanzas_adm", "gerencia" }, new[] { "rrhh" }),
        ["remuneraciones"] = (new[] { "rrhh", "finanzas_adm", "gerencia" }, new[] { "finanzas_adm" }),
        ["conceptos"] = (new[] { "rrhh", "finanzas_adm" }, new[] { "finanzas_adm" }),
        ["parametros"] = (new[] { "rrhh", "finanzas_adm" }, new[] { "finanzas_adm" }),
        ["asistencia"] = (new[] { "rrhh", "finanzas_adm", "gerencia", "jefe_mant", "supervisor_mant", "supervisor_turno" }, new[] { "rrhh" }),
        ["habilitaciones"] = (new[] { "rrhh", "gerencia", "jefe_mant", "supervisor_mant", "supervisor_turno", "prevencion" }, new[] { "rrhh", "jefe_mant", "supervisor_mant", "prevencion" }),
        ["auditoria"] = (new[] { "rrhh", "finanzas_adm", "gerencia" }, Array.Empty<string>()),
        ["plc"] = (new[] { "gerencia", "produccion_ing", "ing_automatizacion", "instrumentacion", "jefe_mant", "supervisor_mant", "tecnico", "confiabilidad", "supervisor_turno", "operador" }, new[] { "ing_automatizacion", "instrumentacion" }),
        ["kpis"] = (new[] { "gerencia", "produccion_ing", "finanzas_adm", "calidad_gestion", "jefe_mant", "supervisor_mant", "supervisor_turno", "confiabilidad", "ing_automatizacion" }, Array.Empty<string>()),
        ["despachos"] = (new[] { "logistica", "comercial", "gerencia", "produccion_ing", "finanzas_adm", "calidad_gestion" }, new[] { "logistica" }),
        ["traspaso"] = (new[] { "supervisor_turno", "supervisor_mant", "jefe_mant", "gerencia", "produccion_ing" }, new[] { "supervisor_turno", "supervisor_mant", "jefe_mant" }),
        ["repuestos"] = (Todos, new[] { "panol", "jefe_mant", "supervisor_mant" }),
        ["herramientas"] = (Todos, new[] { "instrumentacion", "panol", "jefe_mant", "supervisor_mant" }),
        ["plc_comandos"] = (new[] { "ing_automatizacion" }, new[] { "ing_automatizacion", "supervisor_turno", "jefe_mant", "supervisor_mant", "produccion_ing" }),
    };

    public static bool Puede(string perfil, string recurso, string accion)
    {
        if (!Matriz.TryGetValue(recurso, out var m)) return true;       // cargos, directorio, equipos, alarmas y órdenes: todos los perfiles
        return Array.IndexOf(accion == Editar ? m.editar : m.ver, perfil) >= 0
               || (accion == Ver && Array.IndexOf(m.editar, perfil) >= 0);
    }

    public static object ParaPerfil(string perfil)
    {
        var d = new Dictionary<string, string>();
        foreach (var k in Matriz.Keys) d[k] = Puede(perfil, k, Editar) ? "editar" : Puede(perfil, k, Ver) ? "ver" : "no";
        return d;
    }
}
