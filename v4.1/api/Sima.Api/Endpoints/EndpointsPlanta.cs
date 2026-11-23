using Microsoft.Extensions.Caching.Memory;
using System.Collections.Concurrent;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Sima.Api.Datos;
using Sima.Api.Dominio;
using Sima.Api.Servicios;

namespace Sima.Api.Endpoints;

public record OrdenEntrada(string Equipo, string Titulo, string? Descripcion, string? Prioridad, string? Uid = null, string? Especialidad = null, string? Tipo = null);
public record TomarOrdenEntrada(bool LotoConfirmado);
public record CerrarOrdenEntrada(string? Nota, bool LotoRetirado);
public record VerificarOrdenEntrada(bool Aprobar, string? Nota);
public record ComandoEntrada(string Tag, double Valor);
public record TelemetriaPlcEntrada(string? Estado, List<LecturaEntrada>? Lecturas, List<EstadoEntrada>? Equipos, Dictionary<string, double>? Io, int? CicloMs, long? Ciclos, string? Uid = null);
public record IngestaEntrada(List<LecturaEntrada>? Lecturas);

/// <summary>Última imagen de entradas y salidas de cada PLC (para que la web muestre los LED en vivo).</summary>
public static class ImagenPlc
{
    static readonly ConcurrentDictionary<string, Dictionary<string, double>> Valores = new();
    public static void Poner(string plc, Dictionary<string, double> io) => Valores[plc] = io;
    public static Dictionary<string, double> De(string plc) => Valores.TryGetValue(plc, out var v) ? v : new();
}

public static class EndpointsPlanta
{
    static string CodigoNum(string codigo) => codigo.Replace("-", "");
    /// <summary>Canal de la credencial de dispositivo: «simulador», «gateway» o null si no es válida.</summary>
    static string? Canal(HttpRequest r, IConfiguration cfg)
    {
        var clave = r.Headers["X-API-Key"].ToString();
        if (clave.Length == 0) return null;
        if (clave == (cfg["Ingesta:ApiKey"] ?? "dev-ingesta-key")) return "simulador";
        return cfg["Ingesta:ClaveGateway"] is { Length: >= 16 } g && clave == g ? "gateway" : null;
    }

    static IResult? Prohibido(Plc p, string canal) => (canal, p.Origen) switch
    {
        ("simulador", "real") => Ayudas.Error($"{p.Codigo} es un PLC físico: el simulador no puede alimentarlo ni recibir sus órdenes.", 403),
        ("gateway", not "real") => Ayudas.Error($"{p.Codigo} es un PLC simulado: el gateway de planta solo publica PLC físicos.", 403),
        _ => null,
    };

    public static void MapPlanta(this IEndpointRouteBuilder app, IConfiguration cfg)
    {
        var g = app.MapGroup("/api").RequireAuthorization();

        g.MapGet("/equipos", async (ClaimsPrincipal u, SimaDb db) =>
        {
            if (!u.S().Tiene("planta.ver")) return Ayudas.Sin();
            var abiertas = (await db.Alarmas.AsNoTracking().Where(a => a.Fin == null).ToListAsync()).GroupBy(a => a.EquipoId).ToDictionary(x => x.Key, x => x.Count());
            var lista = await db.Equipos.AsNoTracking().Include(e => e.Sensores).Include(e => e.Plc).Include(e => e.Linea).ThenInclude(l => l!.Area).OrderBy(e => e.Codigo).ToListAsync();
            return Results.Ok(lista.Select(e => new
            {
                e.Id, e.Codigo, e.Nombre, e.Tipo, zona = e.Linea!.Area!.Nombre, linea = e.Linea.Nombre, lineaId = e.LineaId, areaId = e.Linea.AreaId, e.ModeloSimulacion, simulado = e.Plc?.Origen != "real", e.Version, e.Ubicacion, e.Marca, e.Modelo, e.Criticidad, e.Estado, plc = e.Plc?.Codigo, alarmasAbiertas = abiertas.GetValueOrDefault(e.Id),
                sensores = e.Sensores.OrderBy(s => s.Id).Select(s => new { s.Variable, s.Nombre, s.Unidad, s.Ultimo, s.UltimoEn, min = s.EscalaMin, max = s.EscalaMax, s.Nominal, s.Aviso, s.Alarma,
                    nivel = s.Ultimo is null ? "ok" : s.Ultimo >= s.Alarma ? "alarma" : s.Ultimo >= s.Aviso ? "aviso" : "ok" }),
            }));
        });

        g.MapGet("/equipos/{codigo}/historial", async (string codigo, string variable, int? minutos, ClaimsPrincipal u, SimaDb db) =>
        {
            if (!u.S().Tiene("planta.ver")) return Ayudas.Sin();
            var s = await db.Sensores.AsNoTracking().FirstOrDefaultAsync(x => x.Equipo!.Codigo == codigo && x.Variable == variable);
            if (s is null) return Ayudas.Error("No existe ese sensor.", 404);
            var desde = DateTime.UtcNow.AddMinutes(-Math.Clamp(minutos ?? 30, 1, 360));
            return Results.Ok(await db.Lecturas.AsNoTracking().Where(l => l.SensorId == s.Id && l.Ts >= desde).OrderBy(l => l.Ts).Select(l => new { l.Ts, l.Valor }).ToListAsync());
        });

        g.MapGet("/alarmas", async (bool? abiertas, ClaimsPrincipal u, SimaDb db) =>
        {
            if (!u.S().Tiene("planta.ver")) return Ayudas.Sin();
            var q = db.Alarmas.AsNoTracking().AsQueryable();
            if (abiertas == true) q = q.Where(a => a.Fin == null);
            var eq = await db.Equipos.AsNoTracking().ToDictionaryAsync(e => e.Id);
            var se = await db.Sensores.AsNoTracking().ToDictionaryAsync(s => s.Id);
            return Results.Ok((await q.OrderByDescending(a => a.Inicio).Take(200).ToListAsync()).Select(a => new
            { a.Id, equipo = eq[a.EquipoId].Codigo, equipoNombre = eq[a.EquipoId].Nombre, variable = se[a.SensorId].Variable, a.Nivel, a.Mensaje, a.Inicio, a.Fin, a.ReconocidaPor, a.ReconocidaEn, a.Simulado }));
        });

        g.MapPost("/alarmas/{id:int}/reconocer", async (int id, ClaimsPrincipal u, SimaDb db) =>
        {
            if (!u.S().Tiene("planta.registrar")) return Ayudas.Error("Reconocer alarmas es de la sala de control, la supervisión, automatización y mantenimiento.", 403);
            var a = await db.Alarmas.FindAsync(id);
            if (a is null) return Ayudas.Error("No existe esa alarma.", 404);
            a.ReconocidaPor = u.S().Nombre; a.ReconocidaEn = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(new { ok = true });
        });

        // ------------------------------------------------------------------------------------ órdenes de trabajo
        g.MapGet("/ordenes", async (string? estado, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("ordenes.ver")) return Ayudas.Sin();
            var q = db.Ordenes.AsNoTracking().AsQueryable();
            if (s.Alcance("ordenes.ver") == "propio") q = q.Where(o => o.CreadaPorId == s.Id || o.AsignadoAId == s.Id);   // quien opera ve sus avisos
            if (!string.IsNullOrEmpty(estado)) q = q.Where(o => o.Estado == estado);
            var eq = await db.Equipos.AsNoTracking().ToDictionaryAsync(e => e.Id);
            var nombres = await db.Trabajadores.AsNoTracking().ToDictionaryAsync(t => t.Id, t => t.Nombres + " " + t.ApellidoPaterno);
            return Results.Ok((await q.OrderByDescending(o => o.Id).Take(200).ToListAsync()).Select(o => new
            { o.Id, o.Codigo, equipo = eq[o.EquipoId].Codigo, equipoNombre = eq[o.EquipoId].Nombre, equipoTipo = eq[o.EquipoId].Tipo, criticidad = eq[o.EquipoId].Criticidad, o.Titulo, o.Descripcion, o.Prioridad, o.Estado, o.Automatica, o.LotoConfirmado, o.Creada, o.Cerrada,
                o.Tipo, o.Especialidad, o.Programada, o.Version, o.CreadaPorId, o.Simulada, o.CierreSolicitado, o.VerificadaEn,
                verificadaPor = o.VerificadaPorId is null ? null : nombres.GetValueOrDefault(o.VerificadaPorId),
                asignado = o.AsignadoAId is null ? null : nombres.GetValueOrDefault(o.AsignadoAId), o.AsignadoAId }));
        });

        g.MapPost("/ordenes", async (OrdenEntrada e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            if (!u.S().Tiene("ordenes.crear")) return Ayudas.Sin();
            var eq = await db.Equipos.FirstOrDefaultAsync(x => x.Codigo == e.Equipo);
            if (eq is null) return Ayudas.Error("No existe ese equipo.", 404);
            if (string.IsNullOrWhiteSpace(e.Titulo)) return Ayudas.Error("Escriba un título.");
            if (e.Uid is { Length: > 0 } && await db.Ordenes.FirstOrDefaultAsync(x => x.Uid == e.Uid) is { } previa) return Results.Ok(new { previa.Id, previa.Codigo, repetida = true });
            var o = new OrdenTrabajo { Uid = e.Uid, EquipoId = eq.Id, Titulo = e.Titulo.Trim(), Descripcion = e.Descripcion ?? "", Prioridad = e.Prioridad is "baja" or "media" or "alta" or "critica" ? e.Prioridad : "media", CreadaPorId = u.S().Id,
                Especialidad = EndpointsV41.Especialidades.Contains(e.Especialidad) ? e.Especialidad! : "general", Tipo = e.Tipo is "preventiva" or "predictiva" ? e.Tipo : "correctiva" };
            db.Ordenes.Add(o);
            await db.SaveChangesAsync();
            await hub.Clients.Group("planta").SendAsync("orden", new { id = o.Id, codigo = o.Codigo, equipo = eq.Codigo, titulo = o.Titulo, prioridad = o.Prioridad });
            await Avisos.ACargosAsync(hub, Avisos.Mantencion, $"Aviso de falla {o.Codigo} en {eq.Codigo}: {o.Titulo}", "aviso", $"/mantenimiento?orden={o.Id}");
            return Results.Created($"/api/ordenes/{o.Id}", new { o.Id, o.Codigo });
        });

        g.MapPost("/ordenes/{id:int}/tomar", async (int id, TomarOrdenEntrada e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (!s.Tiene("ordenes.ejecutar")) return Ayudas.Error("Su cargo prepara órdenes de trabajo, pero la ejecución la firma el técnico asignado.", 403);
            var o = await db.Ordenes.FindAsync(id);
            if (o is null) return Ayudas.Error("No existe esa orden.", 404);
            if (o.Estado != "abierta") return Ayudas.Error("La orden ya fue tomada o cerrada.", 409);
            // el programa del planificador se respeta: una OT asignada la toma su técnico (o quien supervisa y reasigna)
            if (o.AsignadoAId is { } asignado && asignado != s.Id && !s.Tiene("ordenes.asignar"))
                return Ayudas.Error("Esta orden está asignada a otro técnico. Pida a su supervisor o a planificación que se la reasigne.", 403);
            if (!e.LotoConfirmado) return Ayudas.Error("Antes de iniciar debe confirmar el bloqueo y etiquetado (LOTO) del equipo.");
            var hoy = Reloj.Hoy();
            if (!(await db.Habilitaciones.AsNoTracking().Where(h => h.TrabajadorId == s.Id && h.Nombre == Competencias.Loto).ToListAsync()).Any(h => h.Vencimiento >= hoy))
                return Ayudas.Error("No tiene vigente la habilitación de bloqueo y etiquetado (LOTO). No puede intervenir el equipo hasta renovarla.", 403);
            var eq = await db.Equipos.FirstAsync(x => x.Id == o.EquipoId);
            o.Estado = "en_curso"; o.AsignadoAId = s.Id; o.LotoConfirmado = true;
            EstadosEquipo.Cambiar(db, eq, "en_mantencion", "desktop", false, $"{o.Codigo} iniciada por {s.Nombre} con bloqueo LOTO");
            db.Auditar(s, "inició una orden con bloqueo confirmado", "orden", o.Codigo, $"{eq.Codigo} · {o.Titulo}");
            await db.SaveChangesAsync();      // si otro técnico la tomó al mismo tiempo, la versión (xmin) no coincide y responde 409
            await hub.Clients.Group("planta").SendAsync("equipo", new { codigo = eq.Codigo, estado = eq.Estado });
            await hub.Clients.Group("planta").SendAsync("orden", new { id = o.Id, codigo = o.Codigo, equipo = eq.Codigo, titulo = o.Titulo, prioridad = o.Prioridad, estado = o.Estado });
            await Avisos.ACargosAsync(hub, Avisos.Produccion, $"{eq.Codigo} en mantención: {s.Nombre} inició {o.Codigo} con bloqueo", "aviso", $"/explorador?equipo={eq.Codigo}");
            return Results.Ok(new { ok = true });
        });

        // El técnico termina: retira el bloqueo y pide la verificación. El equipo sigue en mantención (no vuelve a operar
        // por un cierre administrativo); lo libera quien verifica, y la marcha la da operación o el propio PLC.
        g.MapPost("/ordenes/{id:int}/cerrar", async (int id, CerrarOrdenEntrada e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            var o = await db.Ordenes.FindAsync(id);
            if (o is null) return Ayudas.Error("No existe esa orden.", 404);
            if (!(s.Tiene("ordenes.ejecutar") && o.AsignadoAId == s.Id))
                return Ayudas.Error("Solo el técnico que ejecutó la orden pide su verificación de cierre.", 403);
            if (o.Estado != "en_curso") return Ayudas.Error("La orden debe estar en curso para terminarla.", 409);
            if (!e.LotoRetirado) return Ayudas.Error("Para terminar debe retirar el bloqueo y etiquetado.");
            if (string.IsNullOrWhiteSpace(e.Nota) && !await db.Intervenciones.AnyAsync(i => i.OrdenId == o.Id))
                return Ayudas.Error("Registre la intervención o escriba una nota de cierre antes de pedir la verificación.");
            var eq = await db.Equipos.FirstAsync(x => x.Id == o.EquipoId);
            o.Estado = "por_verificar"; o.CierreSolicitado = DateTime.UtcNow;
            if (!string.IsNullOrWhiteSpace(e.Nota)) o.Descripcion = (o.Descripcion + "\nCierre técnico: " + e.Nota.Trim()).Trim();
            db.Auditar(s, "terminó una orden y pidió su verificación", "orden", o.Codigo, $"{eq.Codigo} · {o.Titulo}");
            await db.SaveChangesAsync();
            await hub.Clients.Group("planta").SendAsync("orden", new { id = o.Id, codigo = o.Codigo, equipo = eq.Codigo, titulo = o.Titulo, prioridad = o.Prioridad, estado = o.Estado });
            await Avisos.ACargosAsync(hub, Avisos.Verificadores, $"{o.Codigo} en {eq.Codigo} espera su verificación de cierre ({s.Nombre})", "aviso", $"/mantenimiento?orden={o.Id}");
            return Results.Ok(new { ok = true, estado = o.Estado });
        });

        g.MapPost("/ordenes/{id:int}/verificar", async (int id, VerificarOrdenEntrada e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (!s.Tiene("ordenes.aprobar")) return Ayudas.Error("Verificar el cierre y liberar el equipo es de la supervisión o la jefatura de mantenimiento.", 403);
            var o = await db.Ordenes.FindAsync(id);
            if (o is null) return Ayudas.Error("No existe esa orden.", 404);
            if (o.Estado != "por_verificar") return Ayudas.Error("La orden no está esperando verificación.", 409);
            if (o.AsignadoAId == s.Id) return Ayudas.Error("No puede verificar su propia intervención: lo hace otra persona con esa facultad.", 403);
            var eq = await db.Equipos.Include(x => x.Sensores).Include(x => x.Plc).FirstAsync(x => x.Id == o.EquipoId);
            if (!e.Aprobar)
            {
                if (string.IsNullOrWhiteSpace(e.Nota)) return Ayudas.Error("Indique qué falta para aprobar el cierre.");
                o.Estado = "en_curso"; o.CierreSolicitado = null;
                o.Descripcion = (o.Descripcion + "\nVerificación rechazada: " + e.Nota.Trim()).Trim();
                db.Auditar(s, "rechazó la verificación de una orden", "orden", o.Codigo, e.Nota.Trim());
                await db.SaveChangesAsync();
                await hub.Clients.Group("planta").SendAsync("orden", new { id = o.Id, codigo = o.Codigo, equipo = eq.Codigo, titulo = o.Titulo, prioridad = o.Prioridad, estado = o.Estado });
                await Avisos.AUsuarioAsync(hub, o.AsignadoAId, $"{o.Codigo}: la verificación fue rechazada. {e.Nota.Trim()} Vuelva a bloquear antes de intervenir.", "alarma", $"/mantenimiento?orden={o.Id}");
                return Results.Ok(new { ok = true, estado = o.Estado });
            }
            o.Estado = "cerrada"; o.Cerrada = DateTime.UtcNow; o.VerificadaPorId = s.Id; o.VerificadaEn = DateTime.UtcNow;
            if (!string.IsNullOrWhiteSpace(e.Nota)) o.Descripcion = (o.Descripcion + "\nVerificación: " + e.Nota.Trim()).Trim();
            // liberado a operación: queda detenido (disponible). El estado físico lo vuelve a informar el PLC
            EstadosEquipo.Cambiar(db, eq, "detenido", "desktop", false, $"{o.Codigo} verificada por {s.Nombre}: equipo liberado a operación");
            foreach (var sen in eq.Sensores) sen.Deriva = 0;
            if (eq.PlcId is { } plcId) db.PlcComandos.Add(new PlcComando { PlcId = plcId, Tag = CodigoNum(eq.Codigo) + "_REPARAR", Valor = 1, SolicitadoPor = s.Nombre });
            db.Auditar(s, "verificó una orden y liberó el equipo", "orden", o.Codigo, $"{eq.Codigo} · {o.Titulo}");
            await db.SaveChangesAsync();
            await hub.Clients.Group("planta").SendAsync("equipo", new { codigo = eq.Codigo, estado = eq.Estado });
            await hub.Clients.Group("planta").SendAsync("orden", new { id = o.Id, codigo = o.Codigo, equipo = eq.Codigo, titulo = o.Titulo, prioridad = o.Prioridad, estado = o.Estado });
            await Avisos.AUsuarioAsync(hub, o.AsignadoAId, $"{o.Codigo} verificada por {s.Nombre}. Gracias.", "ok", $"/mantenimiento?orden={o.Id}");
            await Avisos.ACargosAsync(hub, Avisos.Produccion, $"{eq.Codigo} liberado por mantenimiento ({o.Codigo}). Puede reanudar la operación.", "ok", $"/explorador?equipo={eq.Codigo}");
            return Results.Ok(new { ok = true, estado = o.Estado });
        });

        // Operación pone en marcha un equipo liberado. Si su PLC está conectado, la marcha la ordena el PLC (y él informa
        // el estado real); un PLC físico sin conexión no se puede marcar como operando desde aquí.
        g.MapPost("/equipos/{codigo}/reanudar", async (string codigo, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (!(s.Tiene("produccion.registrar") || s.Tiene("produccion.editar") || s.Tiene("plc_comandos.editar"))) return Ayudas.Sin();
            var eq = await db.Equipos.Include(x => x.Plc).FirstOrDefaultAsync(x => x.Codigo == codigo);
            if (eq is null) return Ayudas.Error("No existe ese equipo.", 404);
            if (await db.Ordenes.AnyAsync(o => o.EquipoId == eq.Id && (o.Estado == "en_curso" || o.Estado == "por_verificar")))
                return Ayudas.Error("El equipo tiene una orden de trabajo sin verificar: mantenimiento debe liberarlo primero.", 409);
            if (eq.Estado != "detenido") return Ayudas.Error($"El equipo está {EstadosEquipo.Texto(eq.Estado)}: solo se pone en marcha un equipo detenido.", 409);
            var conectado = eq.Plc?.UltimoContacto is { } t && t > DateTime.UtcNow.AddSeconds(-10);
            if (eq.Plc is not null && conectado)
            {
                db.PlcComandos.Add(new PlcComando { PlcId = eq.Plc.Id, Tag = CodigoNum(eq.Codigo) + "_MARCHA", Valor = 1, SolicitadoPor = s.Nombre });
                db.Auditar(s, "ordenó la marcha de un equipo al PLC", "equipo", eq.Codigo, eq.Plc.Codigo);
                await db.SaveChangesAsync();
                return Results.Ok(new { ok = true, via = "plc" });
            }
            if (eq.Plc?.Origen == "real") return Ayudas.Error($"El PLC {eq.Plc.Codigo} no responde: la marcha se da en la máquina y el estado lo informará el PLC al reconectar.", 409);
            EstadosEquipo.Cambiar(db, eq, "operando", "desktop", true, $"puesta en marcha por {s.Nombre} (planta simulada)");
            db.Auditar(s, "puso en marcha un equipo de la planta simulada", "equipo", eq.Codigo, "");
            await db.SaveChangesAsync();
            await hub.Clients.Group("planta").SendAsync("equipo", new { codigo = eq.Codigo, estado = eq.Estado });
            return Results.Ok(new { ok = true, via = "simulacion" });
        });

        // ------------------------------------------------------------------------------------ PLC
        g.MapGet("/plc", async (ClaimsPrincipal u, SimaDb db) =>
        {
            if (!u.S().Puede("plc", "ver")) return Ayudas.Sin();
            var limite = DateTime.UtcNow.AddSeconds(-10);
            var lista = await db.Plcs.AsNoTracking().Include(p => p.Area).Include(p => p.Modulos).Include(p => p.Equipos).Include(p => p.Puntos).OrderBy(p => p.Codigo).ToListAsync();
            return Results.Ok(lista.Select(p => new
            {
                p.Id, p.Codigo, p.Nombre, p.Fabricante, p.Modelo, p.Direccion, zona = p.Area!.Nombre, p.Origen, estado = p.UltimoContacto is null || p.UltimoContacto < limite ? "sin_conexion" : p.Estado, p.UltimoContacto, p.CicloMs,
                modulos = p.Modulos.Count, puntos = p.Puntos.Count, entradas = p.Puntos.Count(x => x.Tipo is "DI" or "AI"), salidas = p.Puntos.Count(x => x.Tipo is "DO" or "AO"), equipos = p.Equipos.Select(e => e.Codigo).OrderBy(c => c),
            }));
        });

        g.MapGet("/plc/{codigo}", async (string codigo, ClaimsPrincipal u, SimaDb db) =>
        {
            if (!u.S().Puede("plc", "ver")) return Ayudas.Sin();
            var p = await db.Plcs.AsNoTracking().Include(x => x.Area).Include(x => x.Modulos).Include(x => x.Puntos).Include(x => x.Equipos).ThenInclude(e => e.Sensores).FirstOrDefaultAsync(x => x.Codigo == codigo);
            if (p is null) return Ayudas.Error("No existe ese PLC.", 404);
            var limite = DateTime.UtcNow.AddSeconds(-10);
            return Results.Ok(new
            {
                p.Id, p.Codigo, p.Nombre, p.Fabricante, p.Modelo, p.Direccion, zona = p.Area!.Nombre, p.Origen, estado = p.UltimoContacto is null || p.UltimoContacto < limite ? "sin_conexion" : p.Estado, p.UltimoContacto, p.CicloMs,
                modulos = p.Modulos.OrderBy(m => m.Slot).Select(m => new { m.Id, m.Slot, m.Tipo, m.Modelo, m.Canales }),
                puntos = p.Puntos.OrderBy(x => x.ModuloId).ThenBy(x => x.Canal).Select(x => new { x.Id, x.ModuloId, x.Canal, x.Direccion, x.Tag, x.Tipo, x.Descripcion, equipo = p.Equipos.FirstOrDefault(e => e.Id == x.EquipoId)?.Codigo, x.Unidad, x.Minimo, x.Maximo }),
                equipos = p.Equipos.OrderBy(e => e.Codigo).Select(e => new { e.Codigo, e.Nombre, e.Tipo, e.Estado }),
                programa = JsonSerializer.Deserialize<JsonElement>(p.Programa), version = p.VersionPrograma, io = ImagenPlc.De(p.Codigo),
            });
        });

        // el programa ya no se publica directamente: se solicita un cambio y otra persona lo aprueba (EndpointsCambiosPlc)
        g.MapPut("/plc/{codigo}/programa", async (string codigo, JsonElement programa, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (!s.Tiene("plc.editar")) return Ayudas.Sin();
            return await CambiosPlc.SolicitarAsync(db, hub, codigo, programa, s.Id, s.Nombre, "web", programa.TryGetProperty("justificacion", out var j) ? j.GetString() ?? "" : "");
        });

        g.MapPost("/plc/{codigo}/comandos", async (string codigo, ComandoEntrada e, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Puede("plc_comandos", "editar")) return Ayudas.Sin();
            var p = await db.Plcs.Include(x => x.Puntos).FirstOrDefaultAsync(x => x.Codigo == codigo);
            if (p is null) return Ayudas.Error("No existe ese PLC.", 404);
            if (!p.Puntos.Any(x => x.Tag == e.Tag && x.Tipo == "DI") && !e.Tag.EndsWith("_REPARAR")) return Ayudas.Error("Solo se pueden enviar pulsos a entradas digitales del PLC.");
            if (p.UltimoContacto is null || p.UltimoContacto < DateTime.UtcNow.AddSeconds(-10)) return Ayudas.Error("El PLC no está conectado (abra el simulador de PLC).", 409);
            db.PlcComandos.Add(new PlcComando { PlcId = p.Id, Tag = e.Tag, Valor = e.Valor, SolicitadoPor = s.Nombre });
            db.Auditar(s, "envió una orden al PLC", "plc", codigo, $"{e.Tag} = {e.Valor}");
            await db.SaveChangesAsync();
            return Results.Ok(new { ok = true });
        });

        // ------------------------------------------------------------------------------------ ingesta (simulador de PLC o gateway real)
        // Dos credenciales de dispositivo, nunca credenciales de PostgreSQL:
        //   Ingesta:ApiKey        → simulador de PLC: solo puede alimentar PLC con Origen = "simulado".
        //   Ingesta:ClaveGateway  → gateway OPC UA / MQTT de planta: solo PLC con Origen = "real" (vacía = deshabilitado).
        // Así el simulador nunca recibe órdenes destinadas a un PLC físico ni escribe datos que parezcan de maquinaria real.
        var k = app.MapGroup("/api/ingesta");

        k.MapGet("/plc", async (HttpRequest r, SimaDb db) =>
        {
            var canal = Canal(r, cfg);
            if (canal is null) return Ayudas.Error("Clave de ingesta incorrecta.", 401);
            var origen = canal == "simulador" ? "simulado" : "real";
            return Results.Ok(await db.Plcs.AsNoTracking().Where(p => p.Origen == origen).OrderBy(p => p.Codigo).Select(p => new { p.Codigo, p.Nombre, p.Fabricante, p.Modelo, zona = p.Area!.Nombre, p.Origen }).ToListAsync());
        });

        k.MapGet("/plc/{codigo}/config", async (string codigo, HttpRequest r, SimaDb db) =>
        {
            var canal = Canal(r, cfg);
            if (canal is null) return Ayudas.Error("Clave de ingesta incorrecta.", 401);
            var p = await db.Plcs.AsNoTracking().Include(x => x.Area).Include(x => x.Modulos).Include(x => x.Puntos).Include(x => x.Equipos).ThenInclude(e => e.Sensores).FirstOrDefaultAsync(x => x.Codigo == codigo);
            if (p is null) return Ayudas.Error("No existe ese PLC.", 404);
            if (Prohibido(p, canal) is { } no) return no;
            return Results.Ok(new
            {
                plc = new { p.Codigo, p.Nombre, p.Fabricante, p.Modelo, p.Direccion, zona = p.Area?.Nombre, p.CicloMs, p.Origen },
                modulos = p.Modulos.OrderBy(m => m.Slot).Select(m => new { m.Slot, m.Tipo, m.Modelo, m.Canales, id = m.Id }),
                puntos = p.Puntos.OrderBy(x => x.ModuloId).ThenBy(x => x.Canal).Select(x => new { x.Direccion, x.Tag, x.Tipo, x.Descripcion, x.Canal, moduloId = x.ModuloId, equipo = p.Equipos.FirstOrDefault(e => e.Id == x.EquipoId)?.Codigo, variable = p.Equipos.SelectMany(e => e.Sensores).FirstOrDefault(s => s.Id == x.SensorId)?.Variable, x.Unidad, x.Minimo, x.Maximo }),
                equipos = p.Equipos.OrderBy(e => e.Codigo).Select(e => new { e.Codigo, e.Nombre, e.Tipo, e.Criticidad, e.ModeloSimulacion, estadoAdministrativo = e.Estado == "en_mantencion" ? "en_mantencion" : "disponible", sensores = e.Sensores.OrderBy(s => s.Id).Select(s => new { s.Variable, s.Nombre, s.Unidad, min = s.EscalaMin, max = s.EscalaMax, s.Nominal, s.Aviso, s.Alarma }) }),
                programa = JsonSerializer.Deserialize<JsonElement>(p.Programa), version = p.VersionPrograma,
            });
        });

        k.MapPut("/plc/{codigo}/programa", async (string codigo, JsonElement programa, HttpRequest r, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var canal = Canal(r, cfg);
            if (canal is null) return Ayudas.Error("Clave de ingesta incorrecta.", 401);
            var p = await db.Plcs.AsNoTracking().FirstOrDefaultAsync(x => x.Codigo == codigo);
            if (p is not null && Prohibido(p, canal) is { } no) return no;
            return await CambiosPlc.SolicitarAsync(db, hub, codigo, programa, "SIM", "Estación de ingeniería (simulador de PLC)", "simulador", programa.TryGetProperty("justificacion", out var j) ? j.GetString() ?? "" : "");
        });

        k.MapPost("/plc/{codigo}/telemetria", async (string codigo, TelemetriaPlcEntrada e, HttpRequest r, SimaDb db, ProcesadorTelemetria proc, IMemoryCache cache, IHubContext<PlantaHub> hub) =>
        {
            var canal = Canal(r, cfg);
            if (canal is null) return Ayudas.Error("Clave de ingesta incorrecta.", 401);
            var p = await db.Plcs.FirstOrDefaultAsync(x => x.Codigo == codigo);
            if (p is null) return Ayudas.Error("No existe ese PLC.", 404);
            if (Prohibido(p, canal) is { } no) return no;
            // un lote reenviado (mismo Uid) no vuelve a registrar lecturas
            var repetido = e.Uid is { Length: > 0 } && cache.TryGetValue($"tel:{codigo}:{e.Uid}", out _);
            if (e.Uid is { Length: > 0 }) cache.Set($"tel:{codigo}:{e.Uid}", true, TimeSpan.FromMinutes(10));
            var estadoAntes = p.Estado;
            p.Estado = e.Estado is "run" or "stop" or "error" ? e.Estado : "run"; p.UltimoContacto = DateTime.UtcNow;
            if (e.Io is not null) { ImagenPlc.Poner(codigo, e.Io); await proc.AvisarIoAsync(codigo, p.Estado, e.Io, e.Ciclos); }
            var ok = repetido ? 0 : await proc.RegistrarAsync(db, e.Lecturas ?? new(), e.Equipos, default, canal, p.Origen != "real");
            if (p.Estado == "error" && estadoAntes != "error")
            {
                var avisosFalla = new List<(string, object)>();
                await IngestaEventos.FallaDePlcAsync(db, p, await db.Equipos.Where(x => x.PlcId == p.Id).ToListAsync(), canal, p.Origen != "real", null, DateTime.UtcNow, avisosFalla);
                foreach (var (n, d) in avisosFalla) await hub.Clients.Group("planta").SendAsync(n, d);
            }
            if (p.Estado != estadoAntes) Eventos.Agregar(db, "estado_plc", p.Estado == "error" ? "alarma" : p.Estado == "run" ? "ok" : "aviso", $"{p.Codigo} pasó a {p.Estado}", canal, p.Origen != "real", plcId: p.Id, datos: new { desde = estadoAntes, hasta = p.Estado });
            await db.SaveChangesAsync();
            if (p.Estado != estadoAntes) await proc.AvisarPlcAsync(p);
            var pendientes = await db.PlcComandos.Where(c => c.PlcId == p.Id && c.Aplicado == null).OrderBy(c => c.Id).Take(20).ToListAsync();
            foreach (var c in pendientes) c.Aplicado = DateTime.UtcNow;
            if (pendientes.Count > 0) await db.SaveChangesAsync();
            var mantencion = await db.Equipos.AsNoTracking().Where(x => x.PlcId == p.Id && x.Estado == "en_mantencion").Select(x => x.Codigo).ToListAsync();
            return Results.Ok(new { ok, repetido, version = p.VersionPrograma, mantencion, comandos = pendientes.Select(c => new { c.Id, c.Tag, c.Valor }) });
        });

        k.MapPost("/plc/{codigo}/eventos", async (string codigo, List<EventoEntrada> eventos, HttpRequest r, SimaDb db, IngestaEventos ingesta) =>
        {
            var canal = Canal(r, cfg);
            if (canal is null) return Ayudas.Error("Clave de ingesta incorrecta.", 401);
            var p = await db.Plcs.FirstOrDefaultAsync(x => x.Codigo == codigo);
            if (p is null) return Ayudas.Error("No existe ese PLC.", 404);
            if (Prohibido(p, canal) is { } no) return no;
            if (eventos.Count > 500) return Ayudas.Error("Envíe como máximo 500 eventos por lote.");
            var (aceptados, duplicados, rechazados) = await ingesta.ProcesarAsync(db, p, canal, eventos);
            return Results.Ok(new { aceptados, duplicados, rechazados });
        });

        // catálogo para que el simulador incorpore equipos nuevos que tengan un modelo de simulación compatible
        k.MapGet("/catalogo", async (HttpRequest r, SimaDb db) =>
        {
            if (Canal(r, cfg) is null) return Ayudas.Error("Clave de ingesta incorrecta.", 401);
            return Results.Ok(await db.Equipos.AsNoTracking().Where(e => e.ModeloSimulacion != null && (e.Plc == null || e.Plc.Origen == "simulado"))
                .OrderBy(e => e.Codigo).Select(e => new { e.Codigo, e.Nombre, e.Tipo, e.ModeloSimulacion, plc = e.Plc!.Codigo, linea = e.Linea!.Nombre, area = e.Linea.Area!.Nombre, e.Estado }).ToListAsync());
        });

        // compatible con la v2: cualquier gateway puede publicar lecturas sueltas
        app.MapPost("/api/telemetria/ingesta", async (IngestaEntrada e, HttpRequest r, SimaDb db, ProcesadorTelemetria proc) =>
            Canal(r, cfg) is not { } canal ? Ayudas.Error("Clave de ingesta incorrecta.", 401) : Results.Ok(new { aceptadas = await proc.RegistrarAsync(db, e.Lecturas ?? new(), null, default, canal, canal == "simulador") }));
    }
}
