using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using Sima.Api.Dominio;
using Sima.Api.Servicios;

namespace Sima.Api.Datos;

public record ResumenImportacion(int Cargos, int Trabajadores, int Contratos, int Terminos, int Asistencias, int Conceptos, int Habilitaciones, int Cuentas)
{
    public override string ToString() => $"cargos {Cargos}, trabajadores {Trabajadores}, contratos {Contratos}, términos {Terminos}, asistencia {Asistencias}, conceptos {Conceptos}, habilitaciones {Habilitaciones}";
}

/// <summary>
/// Lee SIMA_base_de_datos.xlsx y carga la base. Solo toma las columnas «ingresadas»: los estados (activo, cuenta, vigencia…)
/// y las liquidaciones no se importan, el servidor los calcula con las mismas reglas.
/// </summary>
public static class ImportadorExcel
{
    // usuarios de demostración de la versión 2 (su clave se mantiene para no romper lo que ya conocen)
    public static readonly Dictionary<string, string> ClavesDemo = new()
    {
        ["operador"] = "Operador2026", ["supervisor.turno"] = "Supervisor2026", ["tecnico"] = "Tecnico2026", ["supervisor.mantenimiento"] = "Supervmant2026",
        ["jefe.mantenimiento"] = "Jefemant2026", ["confiabilidad"] = "Confiabilidad2026", ["automatizacion"] = "Automatizacion2026", ["instrumentacion"] = "Instrumentacion2026",
        ["panol"] = "Panol2026", ["calidad"] = "Calidad2026", ["prevencion"] = "Prevencion2026", ["gerencia"] = "Gerencia2026", ["finanzas"] = "Finanzas2026",
        ["produccion"] = "Produccion2026", ["jefe.calidad"] = "Jefecalidad2026", ["logistica"] = "Logistica2026", ["rrhh"] = "Rrhh2026", ["comercial"] = "Comercial2026",
    };

    sealed class Fila(Dictionary<string, IXLCell> c)
    {
        public string S(string k) => c.TryGetValue(k, out var x) && !x.IsEmpty() ? x.GetFormattedString().Trim() : "";
        public int I(string k) => c.TryGetValue(k, out var x) && !x.IsEmpty() ? (int)Math.Round(x.GetDouble()) : 0;
        public decimal M(string k) => c.TryGetValue(k, out var x) && !x.IsEmpty() ? (decimal)x.GetDouble() : 0;
        public bool B(string k) => S(k).Equals("SÍ", StringComparison.OrdinalIgnoreCase) || S(k).Equals("SI", StringComparison.OrdinalIgnoreCase);
        public DateOnly? D(string k)
        {
            if (!c.TryGetValue(k, out var x) || x.IsEmpty()) return null;
            if (x.DataType == XLDataType.DateTime) return DateOnly.FromDateTime(x.GetDateTime());
            if (x.DataType == XLDataType.Number) return DateOnly.FromDateTime(DateTime.FromOADate(x.GetDouble()));
            return DateOnly.TryParse(x.GetFormattedString(), out var d) ? d : null;
        }
    }

    static List<Fila> Leer(XLWorkbook wb, string hoja, string clave)
    {
        var ws = wb.Worksheet(hoja);
        var cab = ws.Row(1).CellsUsed().ToDictionary(x => x.GetString().Trim(), x => x.Address.ColumnNumber);
        var lista = new List<Fila>();
        for (var r = 2; r <= ws.LastRowUsed()!.RowNumber(); r++)
        {
            var fila = ws.Row(r);
            if (fila.Cell(cab[clave]).IsEmpty()) break;
            lista.Add(new Fila(cab.ToDictionary(k => k.Key, k => fila.Cell(k.Value))));
        }
        return lista;
    }

    public static async Task<ResumenImportacion> ImportarAsync(SimaDb db, string ruta, string claveInicial, bool reemplazar = true, bool forzarCambioClave = false, CancellationToken ct = default)
    {
        using var wb = new XLWorkbook(ruta);
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        if (reemplazar)
        {
            foreach (var tabla in new[] { "terminos_contrato", "contratos", "asistencia", "conceptos_variables", "habilitaciones", "auditoria" })
                await db.Database.ExecuteSqlRawAsync($"DELETE FROM {tabla}", ct);
            await db.Database.ExecuteSqlRawAsync("UPDATE trabajadores SET \"JefeDirectoId\" = NULL", ct);
            await db.Database.ExecuteSqlRawAsync("DELETE FROM trabajadores", ct);
            foreach (var tabla in new[] { "cargos", "catalogo_conceptos", "parametros", "afp_comisiones", "tramos_impuesto" })
                await db.Database.ExecuteSqlRawAsync($"DELETE FROM {tabla}", ct);
        }
        db.ChangeTracker.Clear();

        // parámetros
        var pw = wb.Worksheet("Parametros");
        for (var r = 4; r <= 40 && !pw.Cell(r, 1).IsEmpty(); r++)
        {
            var clave = pw.Cell(r, 1).GetString().Trim();
            if (clave == "fecha_referencia" || pw.Cell(r, 2).DataType != XLDataType.Number) continue;
            db.Parametros.Add(new Parametro { Clave = clave, Valor = (decimal)pw.Cell(r, 2).GetDouble(), Descripcion = pw.Cell(r, 3).GetString() });
        }
        for (var r = 4; r <= 20 && !pw.Cell(r, 5).IsEmpty(); r++) db.Afps.Add(new AfpComision { Afp = pw.Cell(r, 5).GetString(), Comision = (decimal)pw.Cell(r, 6).GetDouble() });
        for (var r = 4; r <= 20 && !pw.Cell(r, 8).IsEmpty(); r++)
            db.TramosImpuesto.Add(new TramoImpuesto { DesdeUtm = (decimal)pw.Cell(r, 8).GetDouble(), Factor = (decimal)pw.Cell(r, 9).GetDouble(), RebajaUtm = (decimal)pw.Cell(r, 10).GetDouble() });
        foreach (var f in Leer(wb, "Catalogo_Conceptos", "concepto")) db.CatalogoConceptos.Add(new CatalogoConcepto { Concepto = f.S("concepto"), Tipo = f.S("tipo"), Descripcion = f.S("descripcion") });

        // cargos
        var cargos = Leer(wb, "Cargos", "id_cargo");
        foreach (var f in cargos)
            db.Cargos.Add(new Cargo
            {
                Id = f.I("id_cargo"), FamiliaN = f.I("familia_n"), Familia = f.S("familia"), Nombre = f.S("nombre_cargo"), TipoCargo = f.S("tipo_cargo"), PerfilSima = f.S("perfil_sima"), Canal = f.S("canal"),
                SueldoMin = f.I("sueldo_min"), SueldoMax = f.I("sueldo_max"), DotacionObjetivo = f.I("dotacion_objetivo"), ParaQueExiste = f.S("para_que_existe"), QueHace = f.S("que_hace"),
                QueEntrega = f.S("que_entrega"), SeCoordinaCon = f.S("se_coordina_con"), ComoMedir = f.S("como_medir"), Conocimientos = f.S("conocimientos"),
            });
        await db.SaveChangesAsync(ct);

        // trabajadores y cuentas (login = correo corporativo; el alias es el usuario de demostración de la v2)
        var alias = Leer(wb, "Cuentas_SIMA", "id_trabajador").ToDictionary(f => f.S("id_trabajador"), f => f.S("login_demo_anterior"));
        var filas = Leer(wb, "Trabajadores", "id_trabajador");
        var jefes = new Dictionary<string, string>();
        foreach (var f in filas)
        {
            var id = f.S("id_trabajador");
            var al = alias.GetValueOrDefault(id) ?? "";
            var clave = al.Length > 0 && ClavesDemo.TryGetValue(al.Split('@')[0], out var cd) ? cd : claveInicial;
            if (f.S("jefe_directo_id").Length > 0) jefes[id] = f.S("jefe_directo_id");
            db.Trabajadores.Add(new Trabajador
            {
                Id = id, Rut = f.S("rut"), Nombres = f.S("nombres"), ApellidoPaterno = f.S("apellido_paterno"), ApellidoMaterno = f.S("apellido_materno"), Sexo = f.S("sexo"),
                FechaNacimiento = f.D("fecha_nacimiento") ?? default, EstadoCivil = f.S("estado_civil"), Nacionalidad = f.S("nacionalidad"), Telefono = f.S("telefono"),
                CorreoCorporativo = f.S("correo_corporativo").ToLowerInvariant(), CorreoPersonal = f.S("correo_personal"), Domicilio = f.S("domicilio"), Comuna = f.S("comuna"), Region = f.S("region"),
                ContactoEmergencia = f.S("contacto_emergencia"), TelefonoEmergencia = f.S("telefono_emergencia"), Afp = f.S("afp"), SistemaSalud = f.S("sistema_salud"), Banco = f.S("banco"),
                TipoCuenta = f.S("tipo_cuenta"), NumeroCuenta = f.S("numero_cuenta"), FechaIngreso = f.D("fecha_ingreso") ?? default, CargoId = f.I("id_cargo"), Turno = f.S("turno"),
                LoginAlias = al.Length > 0 ? al.ToLowerInvariant() : null, PasswordHash = Claves.Hash(clave),
                DebeCambiarClave = forzarCambioClave && !(al.Length > 0 && ClavesDemo.ContainsKey(al.Split('@')[0])),
            });
        }
        await db.SaveChangesAsync(ct);
        foreach (var (id, jefe) in jefes) await db.Trabajadores.Where(t => t.Id == id).ExecuteUpdateAsync(s => s.SetProperty(t => t.JefeDirectoId, jefe), ct);
        db.ChangeTracker.Clear();

        foreach (var f in Leer(wb, "Contratos", "id_trabajador"))
            db.Contratos.Add(new Contrato
            {
                TrabajadorId = f.S("id_trabajador"), Tipo = f.S("tipo_contrato"), EsActual = f.B("es_actual"), FechaInicio = f.D("fecha_inicio") ?? default, FechaTermino = f.D("fecha_termino"),
                JornadaHoras = f.S("jornada_horas").Length > 0 ? f.I("jornada_horas") : null, SueldoBase = f.I("sueldo_base"), Colacion = f.I("colacion"), Movilizacion = f.I("movilizacion"), Observaciones = f.S("observaciones"),
            });
        foreach (var f in Leer(wb, "Terminos_Contrato", "id_trabajador"))
            db.Terminos.Add(new TerminoContrato
            {
                TrabajadorId = f.S("id_trabajador"), FechaTermino = f.D("fecha_termino") ?? default, Causal = f.S("causal"), AvisoPrevio = f.B("aviso_previo"), FiniquitoMonto = f.I("finiquito_monto"),
                ResponsableId = f.S("responsable_id").Length > 0 ? f.S("responsable_id") : null, Observaciones = f.S("observaciones"),
            });
        foreach (var f in Leer(wb, "Asistencia", "id_trabajador"))
            db.Asistencias.Add(new Asistencia
            {
                Periodo = f.S("periodo"), TrabajadorId = f.S("id_trabajador"), DiasProgramados = f.I("dias_programados"), DiasLicencia = f.I("dias_licencia"),
                DiasPermisoSinGoce = f.I("dias_permiso_sin_goce"), DiasVacaciones = f.I("dias_vacaciones"), HorasExtra = f.I("horas_extra"),
            });
        foreach (var f in Leer(wb, "Conceptos_Variables", "id_trabajador"))
            db.Conceptos.Add(new ConceptoVariable { Periodo = f.S("periodo"), TrabajadorId = f.S("id_trabajador"), Concepto = f.S("concepto"), Monto = f.I("monto"), Observacion = f.S("observacion") });
        foreach (var f in Leer(wb, "Habilitaciones", "id_trabajador"))
            db.Habilitaciones.Add(new Habilitacion { TrabajadorId = f.S("id_trabajador"), Nombre = f.S("habilitacion"), FechaObtencion = f.D("fecha_obtencion") ?? default, VigenciaMeses = f.I("vigencia_meses") });
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return new ResumenImportacion(cargos.Count, filas.Count, db.Contratos.Count(), db.Terminos.Count(), db.Asistencias.Count(), db.Conceptos.Count(), db.Habilitaciones.Count(), filas.Count);
    }
}
