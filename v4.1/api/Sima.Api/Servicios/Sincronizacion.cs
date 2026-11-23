using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Sima.Api.Datos;
using Sima.Api.Dominio;

namespace Sima.Api.Servicios;

/// <summary>
/// Único camino para cambiar el estado de un equipo. Cualquiera sea el origen (simulador, gateway real, web, app de escritorio
/// o el propio backend), el cambio queda en el historial, abre o cierra la parada, genera un evento y se avisa por SignalR.
/// </summary>
public static class EstadosEquipo
{
    public static readonly string[] Validos = { "operando", "alarma", "detenido", "en_mantencion" };

    /// <returns>true si el estado cambió (el llamador debe guardar y avisar).</returns>
    public static bool Cambiar(SimaDb db, Equipo eq, string nuevo, string origen, bool simulado, string causa, DateTime? ts = null, List<(string, object)>? avisos = null)
    {
        if (!Validos.Contains(nuevo) || eq.Estado == nuevo) return false;
        var cuando = ts ?? DateTime.UtcNow;
        var antes = eq.Estado;
        eq.Estado = nuevo;
        Paradas.Cambio(db, eq, antes, cuando);
        db.CambiosEstado.Add(new CambioEstadoEquipo { EquipoId = eq.Id, Ts = cuando, Desde = antes, Hasta = nuevo, Origen = origen, Simulado = simulado, Causa = causa });
        Eventos.Agregar(db, "estado_equipo", nuevo == "alarma" ? "alarma" : nuevo == "operando" ? "ok" : "aviso", $"{eq.Codigo}: {Texto(antes)} → {Texto(nuevo)}{(string.IsNullOrEmpty(causa) ? "" : $" ({causa})")}",
            origen, simulado, equipoId: eq.Id, plcId: eq.PlcId, ts: cuando, datos: new { equipo = eq.Codigo, desde = antes, hasta = nuevo, causa });
        avisos?.Add(("equipo", new { codigo = eq.Codigo, estado = eq.Estado, origen, simulado }));
        return true;
    }

    public static string Texto(string e) => e switch { "operando" => "operando", "alarma" => "con alarma", "detenido" => "detenido", "en_mantencion" => "en mantención", _ => e };
}

/// <summary>Historial de eventos de planta (separado de la auditoría administrativa y de la telemetría).</summary>
public static class Eventos
{
    public static EventoPlanta Agregar(SimaDb db, string tipo, string nivel, string mensaje, string origen, bool simulado, int? equipoId = null, int? plcId = null,
        DateTime? ts = null, object? datos = null, string? uid = null, string? usuarioId = null)
    {
        var e = new EventoPlanta
        {
            Uid = uid ?? $"{origen}:{Guid.NewGuid():N}", Tipo = tipo, Nivel = nivel, Mensaje = mensaje, Origen = origen, Simulado = simulado, EquipoId = equipoId, PlcId = plcId,
            Ts = ts ?? DateTime.UtcNow, Datos = datos is null ? "{}" : JsonSerializer.Serialize(datos), UsuarioId = usuarioId,
        };
        db.Eventos.Add(e);
        return e;
    }

    public static object Dto(EventoPlanta e, IReadOnlyDictionary<int, string> equipos, IReadOnlyDictionary<int, string> plcs) => new
    {
        e.Id, e.Uid, e.Ts, e.Recibido, e.Origen, e.Simulado, e.Tipo, e.Nivel, e.Mensaje,
        equipo = e.EquipoId is { } q ? equipos.GetValueOrDefault(q) : null, plc = e.PlcId is { } p ? plcs.GetValueOrDefault(p) : null,
        datos = JsonSerializer.Deserialize<JsonElement>(e.Datos),
    };
}

public record EventoEntrada(string Uid, DateTime? Ts, string Tipo, string? Equipo, string? Nivel, string? Mensaje, JsonElement? Datos);

/// <summary>
/// Recibe los eventos que produce un PLC (simulado o real). Cada evento trae un Uid generado en el origen: los repetidos se
/// descartan sin efectos, así un reintento después de perder la conexión no duplica alarmas ni órdenes de trabajo.
/// </summary>
public class IngestaEventos(IHubContext<PlantaHub> hub)
{
    public async Task<(int aceptados, int duplicados, List<string> rechazados)> ProcesarAsync(SimaDb db, Plc plc, string origen, IReadOnlyList<EventoEntrada> entrada, CancellationToken ct = default)
    {
        var simulado = plc.Origen != "real";
        var rechazados = new List<string>();
        var validos = entrada.Where(e => !string.IsNullOrWhiteSpace(e.Uid) && e.Uid.Length <= 120).GroupBy(e => e.Uid).Select(g => g.First()).ToList();
        rechazados.AddRange(entrada.Where(e => string.IsNullOrWhiteSpace(e.Uid) || e.Uid.Length > 120).Select(e => e.Tipo));
        var uids = validos.Select(e => $"{plc.Codigo}:{e.Uid}").ToList();
        var vistos = (await db.Eventos.AsNoTracking().Where(e => uids.Contains(e.Uid)).Select(e => e.Uid).ToListAsync(ct)).ToHashSet();
        var nuevos = validos.Where(e => !vistos.Contains($"{plc.Codigo}:{e.Uid}")).OrderBy(e => e.Ts ?? DateTime.UtcNow).ToList();
        if (nuevos.Count == 0) return (0, validos.Count, rechazados);

        var equipos = await db.Equipos.Where(e => e.PlcId == plc.Id).ToListAsync(ct);
        var avisos = new List<(string, object)>();
        var ahora = DateTime.UtcNow;
        foreach (var e in nuevos)
        {
            var ts = e.Ts is { } t && t <= ahora.AddMinutes(1) ? t.ToUniversalTime() : ahora;
            var eq = e.Equipo is null ? null : equipos.FirstOrDefault(x => x.Codigo == e.Equipo);
            if (e.Equipo is not null && eq is null) { rechazados.Add($"{e.Uid}: el equipo {e.Equipo} no pertenece a {plc.Codigo}"); continue; }
            string Dato(string k) => e.Datos is { ValueKind: JsonValueKind.Object } d && d.TryGetProperty(k, out var v) ? v.ToString() : "";
            var nivel = e.Nivel is "info" or "aviso" or "alarma" or "ok" ? e.Nivel : "info";
            var ev = Eventos.Agregar(db, e.Tipo, nivel, e.Mensaje ?? e.Tipo, origen, simulado, eq?.Id, plc.Id, ts, e.Datos, $"{plc.Codigo}:{e.Uid}");

            // un equipo en mantención (con bloqueo LOTO) no cambia por lo que diga el PLC: el estado administrativo manda
            var bloqueado = eq is not null && eq.Estado == "en_mantencion";
            switch (e.Tipo)
            {
                case "arranque" when eq is not null && !bloqueado: EstadosEquipo.Cambiar(db, eq, "operando", origen, simulado, "arranque", ts, avisos); break;
                case "parada" when eq is not null && !bloqueado: EstadosEquipo.Cambiar(db, eq, "detenido", origen, simulado, Dato("motivo") is { Length: > 0 } m ? m : "parada", ts, avisos); break;
                case "recuperacion" when eq is not null && !bloqueado: EstadosEquipo.Cambiar(db, eq, "operando", origen, simulado, "falla despejada", ts, avisos); break;
                case "falla" when eq is not null:
                    if (!bloqueado) EstadosEquipo.Cambiar(db, eq, "alarma", origen, simulado, e.Mensaje ?? "falla", ts, avisos);
                    await OrdenAutomaticaAsync(db, eq, $"Falla en {eq.Nombre}", e.Mensaje ?? "Falla informada por el PLC.", simulado, avisos, ct);
                    break;
                case "estado_plc":
                    var estado = Dato("estado");
                    if (estado is not ("run" or "stop" or "error")) break;
                    if (plc.Estado != estado) { plc.Estado = estado; avisos.Add(("plc", new { codigo = plc.Codigo, estado, simulado })); }
                    // la telemetría pudo cambiar el estado del PLC antes de que llegara este evento: los efectos se aplican igual
                    // (Cambiar no repite un estado y la orden automática no se duplica)
                    if (estado == "error") await FallaDePlcAsync(db, plc, equipos, origen, simulado, e.Mensaje, ts, avisos, ct);
                    break;
                case "produccion" when eq is not null:
                    var piezas = int.TryParse(Dato("piezas"), out var p) ? Math.Clamp(p, 0, 10_000) : 0;
                    var rechazo = int.TryParse(Dato("rechazo"), out var r) ? Math.Clamp(r, 0, piezas) : 0;
                    var op = await db.OrdenesProduccion.FirstOrDefaultAsync(o => o.EquipoId == eq.Id && o.Estado == "en_curso", ct);
                    if (op is not null && piezas > 0)
                    {
                        op.Producidas += piezas; op.Buenas += piezas - rechazo;
                        db.RegistrosProduccion.Add(new RegistroProduccion { OrdenId = op.Id, OperadorId = "PLC", OperadorNombre = $"Contador del {plc.Codigo}", Fecha = ts, Conformes = piezas - rechazo, Rechazo = rechazo, Motivo = rechazo > 0 ? "Rechazo automático" : "" });
                        avisos.Add(("produccion", new { id = op.Id, codigo = op.Codigo, estado = op.Estado, producidas = op.Producidas, buenas = op.Buenas }));
                    }
                    break;
            }
            avisos.Add(("evento", new { ev.Uid, ev.Ts, ev.Origen, ev.Simulado, ev.Tipo, ev.Nivel, ev.Mensaje, equipo = eq?.Codigo, plc = plc.Codigo }));
        }
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("IX_eventos_planta_Uid") == true)
        {
            // otro envío con los mismos eventos llegó al mismo tiempo: se descarta este lote (ya quedó registrado)
            return (0, validos.Count, rechazados);
        }
        foreach (var (n, d) in avisos) await hub.Clients.Group("planta").SendAsync(n, d, ct);
        return (nuevos.Count, validos.Count - nuevos.Count, rechazados);
    }

    /// <summary>Falla de CPU: los equipos del PLC pasan a alarma (salvo los que están en mantención) y se abre una orden.</summary>
    public static async Task FallaDePlcAsync(SimaDb db, Plc plc, List<Equipo> equipos, string origen, bool simulado, string? mensaje, DateTime ts, List<(string, object)> avisos, CancellationToken ct = default)
    {
        foreach (var x in equipos.Where(x => x.Estado != "en_mantencion"))
            EstadosEquipo.Cambiar(db, x, "alarma", origen, simulado, $"falla del {plc.Codigo}", ts, avisos);
        if (equipos.OrderByDescending(x => x.Criticidad == "alta").FirstOrDefault() is { } critico)
            await OrdenAutomaticaAsync(db, critico, $"Falla del controlador {plc.Codigo}", mensaje ?? "El PLC informó un error de CPU.", simulado, avisos, ct);
    }

    static async Task OrdenAutomaticaAsync(SimaDb db, Equipo eq, string titulo, string detalle, bool simulado, List<(string, object)> avisos, CancellationToken ct)
    {
        if (await db.Ordenes.AnyAsync(o => o.EquipoId == eq.Id && o.Automatica && o.Estado != "cerrada", ct)) return;
        var ot = new OrdenTrabajo { EquipoId = eq.Id, Titulo = titulo, Descripcion = detalle, Prioridad = eq.Criticidad == "alta" ? "critica" : "alta", Automatica = true, Simulada = simulado };
        db.Ordenes.Add(ot);
        await db.SaveChangesAsync(ct);
        avisos.Add(("orden", new { id = ot.Id, codigo = ot.Codigo, equipo = eq.Codigo, titulo = ot.Titulo, prioridad = ot.Prioridad, simulada = simulado }));
    }
}
