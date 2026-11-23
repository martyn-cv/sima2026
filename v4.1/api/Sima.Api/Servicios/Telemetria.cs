using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Sima.Api.Datos;
using Sima.Api.Dominio;

namespace Sima.Api.Servicios;

[Authorize]
public class PlantaHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var id = Context.User?.ComoSesion()?.Id;
        await Groups.AddToGroupAsync(Context.ConnectionId, "planta");
        if (id is not null) await Groups.AddToGroupAsync(Context.ConnectionId, $"u:{id}");
        await base.OnConnectedAsync();
    }
}

public record LecturaEntrada(string Equipo, string Variable, double Valor, DateTime? Ts = null);
public record EstadoEntrada(string Equipo, string Estado);

/// <summary>
/// Un solo camino para los datos de planta: el simulador de PLC, el simulador interno o un gateway real (OPC UA, MQTT…) llegan aquí.
/// Guarda la lectura, abre o cierra alarmas, cambia el estado del equipo, genera una orden de trabajo automática y avisa por SignalR.
/// </summary>
public class ProcesadorTelemetria(IHubContext<PlantaHub> hub)
{
    static readonly TimeSpan CadenciaHistorial = TimeSpan.FromSeconds(4);

    public async Task<int> RegistrarAsync(SimaDb db, IEnumerable<LecturaEntrada> lecturas, IEnumerable<EstadoEntrada>? estados = null, CancellationToken ct = default, string origen = "interno", bool simulado = true)
    {
        var sensores = await db.Sensores.Include(s => s.Equipo).ToListAsync(ct);
        var porClave = sensores.ToDictionary(s => (s.Equipo!.Codigo, s.Variable));
        var abiertas = await db.Alarmas.Where(a => a.Fin == null).ToListAsync(ct);
        var ahora = DateTime.UtcNow;
        var emitidas = new List<object>();
        var equiposTocados = new HashSet<Equipo>();
        var avisos = new List<(string evento, object datos)>();
        var ok = 0;

        foreach (var l in lecturas)
        {
            if (!porClave.TryGetValue((l.Equipo, l.Variable), out var s) || double.IsNaN(l.Valor)) continue;
            var ts = l.Ts is { } t && t <= ahora ? t : ahora;
            if (s.UltimoEn is null || ts - s.UltimoEn >= CadenciaHistorial) db.Lecturas.Add(new Lectura { SensorId = s.Id, Valor = l.Valor, Ts = ts });
            s.Ultimo = l.Valor; s.UltimoEn = ts;
            ok++;
            emitidas.Add(new { equipo = s.Equipo!.Codigo, variable = s.Variable, valor = Math.Round(l.Valor, 2), ts });
            equiposTocados.Add(s.Equipo!);

            var nivel = l.Valor >= s.Alarma ? "alarma" : l.Valor >= s.Aviso ? "aviso" : "ok";
            var ab = abiertas.FirstOrDefault(a => a.SensorId == s.Id);
            var texto = $"{s.Nombre}: {l.Valor:0.#} {s.Unidad} en {s.Equipo!.Nombre}";
            if (nivel != "ok")
            {
                if (ab is null)
                {
                    ab = new Alarma { EquipoId = s.EquipoId, SensorId = s.Id, Nivel = nivel, Mensaje = texto, Inicio = ts, Simulado = simulado };
                    Eventos.Agregar(db, "alarma", nivel, texto, origen, simulado, s.EquipoId, s.Equipo.PlcId, ts, new { variable = s.Variable, valor = Math.Round(l.Valor, 2), aviso = s.Aviso, alarma = s.Alarma });
                    db.Alarmas.Add(ab); abiertas.Add(ab);
                    avisos.Add(("alarma", new { equipo = s.Equipo.Codigo, nivel, mensaje = texto, abierta = true, simulado }));
                }
                else if (ab.Nivel == "aviso" && nivel == "alarma")
                {
                    ab.Nivel = "alarma"; ab.Mensaje = texto;
                    avisos.Add(("alarma", new { equipo = s.Equipo.Codigo, nivel, mensaje = texto, abierta = true }));
                }
            }
            else if (ab is not null)
            {
                ab.Fin = ts; abiertas.Remove(ab);
                avisos.Add(("alarma", new { equipo = s.Equipo.Codigo, nivel = ab.Nivel, mensaje = ab.Mensaje, abierta = false }));
            }
        }

        var reportados = (estados ?? Array.Empty<EstadoEntrada>()).ToDictionary(e => e.Equipo, e => e.Estado);
        foreach (var codigo in reportados.Keys) { var eq = sensores.Select(s => s.Equipo!).FirstOrDefault(e => e.Codigo == codigo); if (eq is not null) equiposTocados.Add(eq); }
        foreach (var eq in equiposTocados)
        {
            var hayAlarma = abiertas.Any(a => a.EquipoId == eq.Id && a.Nivel == "alarma");
            if (eq.Estado != "en_mantencion")
            {
                var nuevo = hayAlarma ? "alarma" : reportados.TryGetValue(eq.Codigo, out var rep) && rep is "operando" or "detenido" or "alarma" ? rep : eq.Estado == "alarma" ? "operando" : eq.Estado;
                EstadosEquipo.Cambiar(db, eq, nuevo, origen, simulado, hayAlarma ? "variable sobre el límite de alarma" : reportados.ContainsKey(eq.Codigo) ? "informado por el PLC" : "variables normalizadas", ahora, avisos);
            }
            if (hayAlarma && !await db.Ordenes.AnyAsync(o => o.EquipoId == eq.Id && o.Automatica && o.Estado != "cerrada", ct))
            {
                var al = abiertas.First(a => a.EquipoId == eq.Id && a.Nivel == "alarma");
                var ot = new OrdenTrabajo { EquipoId = eq.Id, Titulo = $"Falla en {eq.Nombre}", Descripcion = al.Mensaje, Prioridad = eq.Criticidad == "alta" ? "critica" : "alta", Automatica = true };
                db.Ordenes.Add(ot);
                await db.SaveChangesAsync(ct);
                avisos.Add(("orden", new { id = ot.Id, codigo = ot.Codigo, equipo = eq.Codigo, titulo = ot.Titulo, prioridad = ot.Prioridad }));
            }
        }
        await db.SaveChangesAsync(ct);

        if (emitidas.Count > 0) await hub.Clients.Group("planta").SendAsync("lecturas", emitidas, ct);
        foreach (var (evento, datos) in avisos) await hub.Clients.Group("planta").SendAsync(evento, datos, ct);
        return ok;
    }

    public async Task AvisarIoAsync(string codigo, string estado, Dictionary<string, double> io, long? ciclos) =>
        await hub.Clients.Group("planta").SendAsync("plcIO", new { codigo, estado, io, ciclos });

    public async Task AvisarPlcAsync(Plc plc) => await hub.Clients.Group("planta").SendAsync("plc", new { codigo = plc.Codigo, estado = plc.Estado });
}

/// <summary>Mantiene viva la planta cuando no hay un simulador de PLC conectado (apagable con Simulador:Habilitado=false).</summary>
public class SimuladorInterno(IServiceScopeFactory fabrica, IConfiguration cfg, ILogger<SimuladorInterno> log) : BackgroundService
{
    static double Gauss(double sigma)
    {
        var u1 = 1.0 - Random.Shared.NextDouble(); var u2 = Random.Shared.NextDouble();
        return sigma * Math.Sqrt(-2.0 * Math.Log(u1)) * Math.Cos(2.0 * Math.PI * u2);
    }

    int _vuelta;
    static readonly string[] Motivos = { "Rebaba", "Medida fuera de tolerancia", "Rechupe", "Mancha o color" };

    /// <summary>Contador de piezas de cada equipo que opera con una orden en curso (lo que en la planta real informa el PLC).</summary>
    static async Task ContarProduccionAsync(SimaDb db, IHubContext<PlantaHub> hub, CancellationToken ct)
    {
        var activas = await db.OrdenesProduccion.Where(o => o.Estado == "en_curso").ToListAsync(ct);
        if (activas.Count == 0) return;
        var estados = await db.Equipos.AsNoTracking().ToDictionaryAsync(e => e.Id, e => e.Estado, ct);
        var hoy = Reloj.Hoy();
        foreach (var o in activas.Where(o => estados.GetValueOrDefault(o.EquipoId) == "operando"))
        {
            var piezas = Math.Max(2, o.Cantidad / 240 + Random.Shared.Next(-1, 3));
            var malas = Random.Shared.NextDouble() < 0.25 ? 1 : 0;
            db.RegistrosProduccion.Add(new RegistroProduccion { OrdenId = o.Id, OperadorId = "PLC", OperadorNombre = "Contador automático del PLC", Conformes = piezas - malas, Rechazo = malas, Motivo = malas > 0 ? Motivos[Random.Shared.Next(Motivos.Length)] : "" });
            o.Producidas += piezas; o.Buenas += piezas - malas;
            var dia = await db.Produccion.FirstOrDefaultAsync(p => p.EquipoId == o.EquipoId && p.Fecha == hoy, ct);
            if (dia is null) db.Produccion.Add(dia = new ProduccionDia { EquipoId = o.EquipoId, Fecha = hoy, UnidadesPlan = o.Cantidad, HorasPlan = 16 });
            dia.UnidadesProducidas += piezas; dia.UnidadesBuenas += piezas - malas;
            if (o.Producidas >= o.Cantidad)
            {
                o.Estado = "terminada"; o.Fin = DateTime.UtcNow;
                var siguiente = await db.OrdenesProduccion.Where(x => x.EquipoId == o.EquipoId && x.Estado == "planificada").OrderBy(x => x.Id).FirstOrDefaultAsync(ct);
                if (siguiente is not null) { siguiente.Estado = "en_curso"; siguiente.Inicio = DateTime.UtcNow; }
            }
        }
        await db.SaveChangesAsync(ct);
        foreach (var o in activas) await hub.Clients.Group("planta").SendAsync("produccion", new { id = o.Id, codigo = o.Codigo, estado = o.Estado, producidas = o.Producidas, buenas = o.Buenas }, ct);
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        if (!cfg.GetValue("Simulador:Habilitado", true)) return;
        await Task.Delay(3000, ct);
        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var scope = fabrica.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<SimaDb>();
                var proc = scope.ServiceProvider.GetRequiredService<ProcesadorTelemetria>();
                var limite = DateTime.UtcNow.AddSeconds(-10);
                var libres = (await db.Sensores.Include(s => s.Equipo).ThenInclude(e => e!.Plc).ToListAsync(ct))
                    .Where(s => s.Equipo!.Plc is null || s.Equipo.Plc.UltimoContacto is null || s.Equipo.Plc.UltimoContacto < limite).ToList();
                var operando = libres.Where(s => s.Equipo!.Estado == "operando" && s.Deriva == 0).ToList();
                if (operando.Count > 0 && Random.Shared.NextDouble() < 0.012) operando[Random.Shared.Next(operando.Count)].Deriva = 0.02;
                var lecturas = new List<LecturaEntrada>();
                foreach (var s in libres)
                {
                    var eq = s.Equipo!; var rango = s.EscalaMax - s.EscalaMin;
                    double objetivo;
                    if (eq.Estado is "en_mantencion" or "detenido") objetivo = s.EscalaMin + 0.08 * rango;
                    else { objetivo = s.Nominal + s.Deriva * (s.Alarma * 1.06 - s.Nominal); if (s.Deriva > 0 && eq.Estado != "alarma") s.Deriva = Math.Min(1.0, s.Deriva + 0.06); }
                    var @base = s.Ultimo ?? s.Nominal;
                    lecturas.Add(new LecturaEntrada(eq.Codigo, s.Variable, Math.Clamp(@base + (objetivo - @base) * 0.4 + Gauss(rango * 0.01), s.EscalaMin, s.EscalaMax)));
                }
                if (lecturas.Count > 0) await proc.RegistrarAsync(db, lecturas, ct: ct);
                // si nadie atiende la falla, la planta se recupera sola a los 6 minutos
                var viejas = DateTime.UtcNow.AddMinutes(-6);
                foreach (var eq in libres.Select(s => s.Equipo!).Distinct().Where(e => e.Estado == "alarma"))
                    if (!await db.Alarmas.AnyAsync(a => a.EquipoId == eq.Id && a.Nivel == "alarma" && a.Inicio > viejas, ct))
                        foreach (var s in libres.Where(s => s.EquipoId == eq.Id)) s.Deriva = 0;
                await db.SaveChangesAsync(ct);
                if (++_vuelta % 15 == 0) await ContarProduccionAsync(db, scope.ServiceProvider.GetRequiredService<IHubContext<PlantaHub>>(), ct);
                // retención del historial: 6 horas
                if (Random.Shared.NextDouble() < 0.02) await db.Lecturas.Where(l => l.Ts < DateTime.UtcNow.AddHours(-6)).ExecuteDeleteAsync(ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException) { log.LogWarning(ex, "Simulador interno"); }
            await Task.Delay(2000, ct);
        }
    }
}
