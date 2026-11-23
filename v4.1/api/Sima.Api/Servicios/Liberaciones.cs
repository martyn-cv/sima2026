using Microsoft.EntityFrameworkCore;
using Sima.Api.Datos;
using Sima.Api.Dominio;
using Sima.Api.Endpoints;
using Microsoft.AspNetCore.SignalR;

namespace Sima.Api.Servicios;

/// <summary>
/// Reglas de la liberación de un equipo después de una orden de trabajo (definición funcional del proyecto):
///  1. El técnico ejecuta, prueba y registra los resultados; luego pide la liberación (el equipo queda «pendiente de liberación»).
///  2. Liberación técnica: supervisión de mantenimiento; si no está, la jefatura o un responsable de mantenimiento de turno
///     con esa habilitación vigente. Si nadie con esa facultad está disponible, el equipo sigue bloqueado y se notifica.
///  3. Seguridad (prevención de riesgos) si la intervención afecta la seguridad; calidad si afecta el producto.
///  4. Producción (supervisión de turno o jefatura de producción) confirma que el equipo vuelve al proceso: recién ahí
///     queda «liberado para producción».
/// Nadie firma una etapa de una intervención que ejecutó o probó. Un administrador informático no tiene estas facultades.
/// La liberación registrada en SIMA no sustituye los procedimientos físicos de bloqueo, aislamiento ni verificación en terreno.
/// </summary>
public static class Liberaciones
{
    public static readonly string[] Tipos = { "tecnica", "seguridad", "calidad", "produccion" };

    public static string Titulo(string tipo) => tipo switch
    {
        "tecnica" => "Liberación técnica", "seguridad" => "Validación de seguridad", "calidad" => "Validación de calidad", "produccion" => "Confirmación de producción", _ => tipo,
    };

    public static List<string> Requeridas(OrdenTrabajo o)
    {
        var r = new List<string> { "tecnica" };
        if (o.AfectaSeguridad) r.Add("seguridad");
        if (o.AfectaCalidad) r.Add("calidad");
        r.Add("produccion");
        return r;
    }

    /// <summary>Firmas aprobadas de la ronda vigente.</summary>
    public static async Task<List<ValidacionLiberacion>> FirmasAsync(SimaDb db, OrdenTrabajo o)
        => await db.Validaciones.AsNoTracking().Where(v => v.OrdenId == o.Id && v.Ronda == o.RondaLiberacion && v.Aprobada).OrderBy(v => v.Fecha).ToListAsync();

    public static List<string> Pendientes(OrdenTrabajo o, IEnumerable<ValidacionLiberacion> firmas)
        => Requeridas(o).Where(t => firmas.All(f => f.Tipo != t)).ToList();

    /// <summary>¿Puede esta persona firmar este tipo de validación? Devuelve el motivo si no puede.</summary>
    public static async Task<string?> NoPuedeAsync(SimaDb db, Sesion s, OrdenTrabajo o, string tipo, List<ValidacionLiberacion> firmas)
    {
        if (!Tipos.Contains(tipo)) return "Tipo de validación no válido.";
        if (!Requeridas(o).Contains(tipo)) return $"Esta intervención no requiere {Titulo(tipo).ToLower()}.";
        if (firmas.Any(f => f.Tipo == tipo)) return $"La {Titulo(tipo).ToLower()} ya fue registrada.";
        // separación de funciones: quien ejecutó o probó no firma ninguna etapa de su propia intervención
        var participo = o.AsignadoAId == s.Id
            || await db.Intervenciones.AnyAsync(i => i.OrdenId == o.Id && i.TecnicoId == s.Id)
            || await db.PruebasOrden.AnyAsync(p => p.OrdenId == o.Id && p.RegistradaPorId == s.Id);
        if (participo) return "No puede validar una intervención que usted ejecutó o probó: la valida otra persona.";
        if (firmas.Any(f => f.PorId == s.Id)) return "Ya firmó otra etapa de esta liberación: cada etapa la firma una persona distinta.";
        switch (tipo)
        {
            case "tecnica":
                if (s.Tiene("equipos.liberar_tecnica")) return null;
                var hoy = Reloj.Hoy();
                var habilitado = s.Tiene("ordenes.ejecutar") && (await db.Habilitaciones.AsNoTracking().Where(h => h.TrabajadorId == s.Id && h.Nombre == Competencias.ResponsableTurno).ToListAsync()).Any(h => h.Vencimiento >= hoy);
                return habilitado ? null : "La liberación técnica la autoriza la supervisión o la jefatura de mantenimiento, o un responsable de turno habilitado.";
            case "seguridad":
                return s.Tiene("equipos.liberar_seguridad") ? null : "La validación de seguridad la hace prevención de riesgos.";
            case "calidad":
                return s.Tiene("equipos.liberar_calidad") ? null : "La validación de calidad la hace la jefatura o la ingeniería de calidad.";
            default:
                if (!s.Tiene("equipos.confirmar_produccion")) return "La confirmación de producción la hace la supervisión de turno o la jefatura de producción.";
                var faltan = Pendientes(o, firmas).Where(p => p != "produccion").ToList();
                return faltan.Count == 0 ? null : $"Antes de confirmar falta: {string.Join(", ", faltan.Select(f => Titulo(f).ToLower()))}.";
        }
    }

    /// <summary>Estado de la liberación para mostrar en las aplicaciones.</summary>
    public static async Task<object> ResumenAsync(SimaDb db, OrdenTrabajo o)
    {
        var firmas = await FirmasAsync(db, o);
        var rechazos = await db.Validaciones.AsNoTracking().Where(v => v.OrdenId == o.Id && !v.Aprobada).OrderByDescending(v => v.Fecha).Take(5).ToListAsync();
        var pruebas = await db.PruebasOrden.AsNoTracking().Where(p => p.OrdenId == o.Id).OrderBy(p => p.Fecha).ToListAsync();
        return new
        {
            ronda = o.RondaLiberacion, o.AfectaSeguridad, o.AfectaCalidad, requeridas = Requeridas(o), pendientes = o.Estado == "por_verificar" ? Pendientes(o, firmas) : new List<string>(),
            firmas = firmas.Select(f => new { f.Tipo, titulo = Titulo(f.Tipo), f.PorNombre, f.PorCargo, f.Plataforma, f.Fecha, f.Nota }),
            rechazos = rechazos.Select(f => new { f.Tipo, titulo = Titulo(f.Tipo), f.PorNombre, f.PorCargo, f.Fecha, f.Nota, f.Ronda }),
            pruebas = pruebas.Select(p => new { p.Id, p.Descripcion, p.Resultado, p.Valores, p.RegistradaPor, p.Fecha }),
        };
    }
}

/// <summary>Pasos del flujo de una OT que se usan desde más de un endpoint (cierre directo o junto con la intervención).</summary>
public static class Ordenes
{
    /// <summary>El técnico pide la liberación: exige pruebas registradas y que la última sea conforme. Devuelve un error o null.</summary>
    public static async Task<IResult?> PedirLiberacionAsync(SimaDb db, Microsoft.AspNetCore.SignalR.IHubContext<PlantaHub> hub, Sesion s, OrdenTrabajo o, string? nota, bool? afectaSeguridad, bool? afectaCalidad, bool guardar = true)
    {
        var ultima = await db.PruebasOrden.AsNoTracking().Where(p => p.OrdenId == o.Id).OrderByDescending(p => p.Fecha).FirstOrDefaultAsync();
        if (ultima is null && db.ChangeTracker.Entries<PruebaOrden>().FirstOrDefault(x => x.Entity.OrdenId == o.Id)?.Entity is { } nueva) ultima = nueva;
        if (ultima is null) return Ayudas.Error("Registre las pruebas que hizo después de intervenir antes de pedir la liberación.");
        if (ultima.Resultado != "conforme") return Ayudas.Error("La última prueba no fue conforme: corrija y vuelva a probar antes de pedir la liberación.");
        var eq = await db.Equipos.FirstAsync(x => x.Id == o.EquipoId);
        var antes = eq.Estado;
        o.Estado = "por_verificar"; o.CierreSolicitado = DateTime.UtcNow; o.RondaLiberacion++;
        if (afectaSeguridad == true) o.AfectaSeguridad = true;
        if (afectaCalidad == true) o.AfectaCalidad = true;
        if (!string.IsNullOrWhiteSpace(nota)) o.Descripcion = (o.Descripcion + "\nCierre técnico: " + nota.Trim()).Trim();
        EstadosEquipo.Cambiar(db, eq, EstadosEquipo.Pendiente, "desktop", false, $"{o.Codigo}: {s.Nombre} terminó y pidió la liberación");
        db.Auditar(s, "terminó una orden y pidió la liberación del equipo", "orden", o.Codigo, $"{eq.Codigo} · requiere: {string.Join(", ", Liberaciones.Requeridas(o))}", antes, eq.Estado, nota);
        if (guardar) await db.SaveChangesAsync();
        await hub.Clients.Group("planta").SendAsync("equipo", new { codigo = eq.Codigo, estado = eq.Estado });
        await hub.Clients.Group("planta").SendAsync("orden", new { id = o.Id, codigo = o.Codigo, equipo = eq.Codigo, titulo = o.Titulo, prioridad = o.Prioridad, estado = o.Estado });
        // si no hay nadie con esa facultad conectado, el equipo sigue bloqueado: la notificación queda guardada para cuando entren
        await Avisos.ACargosAsync(db, hub, Avisos.Verificadores, $"{o.Codigo} · {eq.Codigo} espera su liberación técnica ({s.Nombre} terminó y registró pruebas)", "aprobacion", $"/mantenimiento?orden={o.Id}", "mantenimiento", o.Codigo, excepto: s.Id);
        if (o.AfectaSeguridad) await Avisos.ACargosAsync(db, hub, Avisos.Seguridad, $"{o.Codigo} · {eq.Codigo}: la intervención afecta la seguridad y requiere su validación", "aprobacion", $"/mantenimiento?orden={o.Id}", "seguridad", o.Codigo, excepto: s.Id);
        if (o.AfectaCalidad) await Avisos.ACargosAsync(db, hub, Avisos.Calidad, $"{o.Codigo} · {eq.Codigo}: la intervención afecta la calidad del producto y requiere su validación", "aprobacion", "/aprobaciones", "calidad", o.Codigo, excepto: s.Id);
        return null;
    }

    public static async Task<IResult> ValidarAsync(SimaDb db, Microsoft.AspNetCore.SignalR.IHubContext<PlantaHub> hub, Sesion s, int id, string tipo, bool aprobar, string? nota)
    {
        var o = await db.Ordenes.FindAsync(id);
        if (o is null) return Ayudas.Error("No existe esa orden.", 404);
        if (o.Estado != "por_verificar") return Ayudas.Error("La orden no está esperando su liberación.", 409);
        var firmas = await Liberaciones.FirmasAsync(db, o);
        if (await Liberaciones.NoPuedeAsync(db, s, o, tipo, firmas) is { } motivo) return Ayudas.Error(motivo, 403);
        var eq = await db.Equipos.Include(x => x.Sensores).Include(x => x.Plc).FirstAsync(x => x.Id == o.EquipoId);
        if (!aprobar && string.IsNullOrWhiteSpace(nota)) return Ayudas.Error("Indique qué falta para aprobar.");
        db.Validaciones.Add(new ValidacionLiberacion
        {
            OrdenId = o.Id, EquipoId = eq.Id, Ronda = o.RondaLiberacion, Tipo = tipo, Aprobada = aprobar, Nota = nota?.Trim() ?? "",
            PorId = s.Id, PorNombre = s.Nombre, PorCargo = s.Cargo, Plataforma = s.Canal,
        });
        var antes = eq.Estado;
        if (!aprobar)
        {
            o.Estado = "en_curso"; o.CierreSolicitado = null;
            o.Descripcion = (o.Descripcion + $"\n{Liberaciones.Titulo(tipo)} rechazada: " + nota!.Trim()).Trim();
            EstadosEquipo.Cambiar(db, eq, EstadosEquipo.Mantenimiento, "desktop", false, $"{o.Codigo}: {Liberaciones.Titulo(tipo).ToLower()} rechazada por {s.Nombre}");
            db.Auditar(s, $"rechazó la {Liberaciones.Titulo(tipo).ToLower()}", "orden", o.Codigo, eq.Codigo, antes, eq.Estado, nota);
            await db.SaveChangesAsync();
            await hub.Clients.Group("planta").SendAsync("equipo", new { codigo = eq.Codigo, estado = eq.Estado });
            await hub.Clients.Group("planta").SendAsync("orden", new { id = o.Id, codigo = o.Codigo, equipo = eq.Codigo, titulo = o.Titulo, prioridad = o.Prioridad, estado = o.Estado });
            await Avisos.AUsuarioAsync(db, hub, o.AsignadoAId, $"{o.Codigo}: {Liberaciones.Titulo(tipo).ToLower()} rechazada por {s.Nombre}. {nota.Trim()} Vuelva a bloquear antes de intervenir.", "critica", $"/mantenimiento?orden={o.Id}", "mantenimiento", o.Codigo);
            return Results.Ok(new { ok = true, estado = o.Estado, equipo = eq.Estado });
        }
        var pendientes = Liberaciones.Pendientes(o, firmas.Append(new ValidacionLiberacion { Tipo = tipo })).ToList();
        if (pendientes.Count > 0)
        {
            db.Auditar(s, $"firmó la {Liberaciones.Titulo(tipo).ToLower()}", "orden", o.Codigo, $"{eq.Codigo} · faltan: {string.Join(", ", pendientes)}", null, null, nota);
            await db.SaveChangesAsync();
            await hub.Clients.Group("planta").SendAsync("orden", new { id = o.Id, codigo = o.Codigo, equipo = eq.Codigo, titulo = o.Titulo, prioridad = o.Prioridad, estado = o.Estado });
            // cuando ya solo falta producción, se avisa a quienes la confirman
            if (pendientes.SequenceEqual(new[] { "produccion" }))
                await Avisos.ACargosAsync(db, hub, Avisos.ConfirmanProduccion, $"{eq.Codigo} reparado y validado ({o.Codigo}). Confirme que vuelve al proceso productivo.", "aprobacion", $"/mantenimiento?orden={o.Id}", "produccion", o.Codigo, excepto: s.Id);
            return Results.Ok(new { ok = true, estado = o.Estado, pendientes });
        }
        // última firma (producción): la orden se cierra y el equipo queda liberado para producción
        var tecnica = firmas.FirstOrDefault(f => f.Tipo == "tecnica");
        o.Estado = "cerrada"; o.Cerrada = DateTime.UtcNow; o.VerificadaPorId = tecnica?.PorId; o.VerificadaEn = tecnica?.Fecha;
        var otra = await db.Ordenes.Where(x => x.EquipoId == eq.Id && x.Id != o.Id && (x.Estado == "en_curso" || x.Estado == "por_verificar")).Select(x => x.Id).FirstOrDefaultAsync();
        var liberado = otra == 0;
        if (liberado)
        {
            EstadosEquipo.Cambiar(db, eq, EstadosEquipo.Liberado, "desktop", false, $"{o.Codigo}: liberado para producción (confirmó {s.Nombre})");
            foreach (var sen in eq.Sensores) sen.Deriva = 0;
            if (eq.PlcId is { } plcId) db.PlcComandos.Add(new PlcComando { PlcId = plcId, Tag = eq.Codigo.Replace("-", "") + "_REPARAR", Valor = 1, SolicitadoPor = s.Nombre });
        }
        else EstadosEquipo.Cambiar(db, eq, EstadosEquipo.Mantenimiento, "desktop", false, $"{o.Codigo} cerrada; sigue abierta OT-{otra:0000}");
        db.Auditar(s, liberado ? "confirmó el retorno a producción y cerró la orden" : "cerró la orden (el equipo sigue en mantenimiento por otra OT)", "orden", o.Codigo, eq.Codigo, antes, eq.Estado, nota);
        await db.SaveChangesAsync();
        await hub.Clients.Group("planta").SendAsync("equipo", new { codigo = eq.Codigo, estado = eq.Estado });
        await hub.Clients.Group("planta").SendAsync("orden", new { id = o.Id, codigo = o.Codigo, equipo = eq.Codigo, titulo = o.Titulo, prioridad = o.Prioridad, estado = o.Estado });
        await Avisos.AUsuarioAsync(db, hub, o.AsignadoAId, $"{o.Codigo} cerrada: {eq.Codigo} {(liberado ? "liberado para producción" : "sigue en mantenimiento por otra orden")}.", "info", $"/mantenimiento?orden={o.Id}", "mantenimiento", o.Codigo);
        if (liberado) await Avisos.ACargosAsync(db, hub, Avisos.Produccion, $"{eq.Codigo} liberado para producción ({o.Codigo}). Puede ponerlo en marcha.", "info", $"/explorador?equipo={eq.Codigo}", "produccion", eq.Codigo, excepto: s.Id);
        return Results.Ok(new { ok = true, estado = o.Estado, equipoLiberado = liberado, otraOrden = liberado ? null : $"OT-{otra:0000}" });
    }
}
