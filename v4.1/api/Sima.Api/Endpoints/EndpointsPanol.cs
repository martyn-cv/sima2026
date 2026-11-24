using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Sima.Api.Datos;
using Sima.Api.Dominio;
using Sima.Api.Servicios;

namespace Sima.Api.Endpoints;

public record SolicitudPanolEntrada(string Tipo, int ItemId, int Cantidad, int? OrdenId, string? Motivo, int? VigenciaHoras, bool Confirmar = false);
public record RevisionPanolEntrada(bool Aprobar, string? Nota, int? VigenciaHoras);
public record CierrePanolEntrada(int Usada, int Devuelta, string? Nota);
public record EntregaTurnoEntrada(string? Pendientes, string? Observaciones);

/// <summary>Pañol: disponibilidad real, solicitudes y reservas, entrega y devolución, bitácora por ítem y entrega de turno.</summary>
public static class EndpointsPanol
{
    static bool Gestiona(Sesion s, string tipo) => tipo == "herramienta" ? s.Tiene("herramientas.editar") : s.Tiene("repuestos.editar");
    static bool PuedePedir(Sesion s, string tipo) => tipo == "herramienta" ? s.Tiene("herramientas.ver") : s.Tiene("repuestos.retirar") || s.Tiene("repuestos.editar") || s.Tiene("ordenes.asignar");

    public static void MapPanol(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/panol").RequireAuthorization();

        // ------------------------------------------------------------------------------------ estado del pañol
        g.MapGet("/resumen", async (ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("repuestos.ver") && !s.Tiene("herramientas.ver")) return Ayudas.Sin();
            await Panol.VencerAsync(db);
            var resRep = await Panol.ReservadosAsync(db, "repuesto");
            var resHer = await Panol.ReservadosAsync(db, "herramienta");
            var hoy = Reloj.Hoy();
            var repuestos = !s.Tiene("repuestos.ver") ? null : (await db.Repuestos.AsNoTracking().OrderBy(r => r.Codigo).ToListAsync()).Select(r =>
            {
                var reservado = resRep.GetValueOrDefault(r.Id);
                var disponible = Math.Max(0, r.Stock - reservado);
                var estado = r.Stock == 0 ? "agotado" : disponible == 0 ? "reservado" : r.Stock <= r.StockMinimo ? "bajo_minimo" : "disponible";
                return new { r.Id, r.Codigo, r.Nombre, r.Tipo, r.Bodega, r.Ubicacion, fisico = r.Stock, reservado, disponible, r.StockMinimo, r.Critico, estado };
            });
            var herramientas = !s.Tiene("herramientas.ver") ? null : (await db.Herramientas.AsNoTracking().OrderBy(h => h.Codigo).ToListAsync()).Select(h =>
            {
                var calVencida = h.RequiereCalibracion && h.ProximaCalibracion is { } p && p < hoy;
                var estado = h.Estado == "retirada" ? "en_uso" : calVencida ? "calibracion" : resHer.ContainsKey(h.Id) ? "reservada" : "disponible";
                return new { h.Id, h.Codigo, h.Nombre, estado, retiradaPor = h.RetiradaPorNombre, h.RetiradaPorId, h.RetiradaEn, proximaCalibracion = h.ProximaCalibracion, h.RequiereCalibracion };
            });
            var activas = await db.SolicitudesPanol.AsNoTracking().Where(x => Panol.Activas.Contains(x.Estado)).ToListAsync();
            return Results.Ok(new
            {
                repuestos, herramientas,
                indicadores = new
                {
                    porRevisar = activas.Count(x => x.Estado == "solicitada"), reservadas = activas.Count(x => x.Estado == "reservada"), entregadas = activas.Count(x => x.Estado == "entregada"),
                    herramientasFuera = herramientas?.Count(h => h.estado == "en_uso") ?? 0, criticosBajoMinimo = repuestos?.Count(r => r.Critico && r.fisico <= r.StockMinimo) ?? 0,
                },
            });
        });

        // ------------------------------------------------------------------------------------ solicitudes y reservas
        g.MapGet("/solicitudes", async (string? estado, bool? mias, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("repuestos.ver") && !s.Tiene("herramientas.ver")) return Ayudas.Sin();
            await Panol.VencerAsync(db);
            var q = db.SolicitudesPanol.AsNoTracking().AsQueryable();
            var gestor = s.Tiene("repuestos.editar") || s.Tiene("herramientas.editar") || s.Tiene("ordenes.asignar");
            if (mias == true || !gestor) q = q.Where(x => x.SolicitanteId == s.Id);
            q = estado switch { null or "" or "activas" => q.Where(x => Panol.Activas.Contains(x.Estado)), "historial" => q.Where(x => !Panol.Activas.Contains(x.Estado)), _ => q.Where(x => x.Estado == estado) };
            var lista = await q.OrderByDescending(x => x.Id).Take(150).ToListAsync();
            var rep = await db.Repuestos.AsNoTracking().ToDictionaryAsync(r => r.Id, r => new { r.Codigo, r.Nombre, r.Stock });
            var her = await db.Herramientas.AsNoTracking().ToDictionaryAsync(h => h.Id, h => new { h.Codigo, h.Nombre, Stock = h.Estado == "retirada" ? 0 : 1 });
            var ids = lista.Where(x => x.OrdenId != null).Select(x => x.OrdenId!.Value).Distinct().ToList();
            var ots = await db.Ordenes.AsNoTracking().Where(o => ids.Contains(o.Id)).Join(db.Equipos, o => o.EquipoId, e => e.Id, (o, e) => new { o.Id, o.Codigo, equipo = e.Codigo, o.Estado }).ToDictionaryAsync(x => x.Id);
            return Results.Ok(lista.Select(x =>
            {
                var it = x.Tipo == "herramienta" ? her.GetValueOrDefault(x.ItemId) : rep.GetValueOrDefault(x.ItemId);
                var ot = x.OrdenId is { } oid ? ots.GetValueOrDefault(oid) : null;
                return new { x.Id, codigo = $"SP-{x.Id:0000}", x.Tipo, x.ItemId, item = it?.Codigo, itemNombre = it?.Nombre, x.Cantidad, x.OrdenId, orden = ot?.Codigo, equipo = ot?.equipo, x.Motivo, x.SolicitanteId, x.SolicitanteNombre, x.Estado, x.Creada, x.Vigencia,
                    x.RevisadaPor, x.RevisadaEn, x.NotaRevision, x.EntregadaEn, x.EntregadaPor, x.CerradaEn, x.Usada, x.Devuelta, x.Incompatible, x.Version };
            }));
        });

        g.MapPost("/solicitudes", async (SolicitudPanolEntrada e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (e.Tipo is not ("repuesto" or "herramienta")) return Ayudas.Error("Tipo de ítem no válido.");
            if (!PuedePedir(s, e.Tipo)) return Ayudas.Sin();
            if (e.Cantidad <= 0 || (e.Tipo == "herramienta" && e.Cantidad != 1)) return Ayudas.Error("Cantidad no válida.");
            if (string.IsNullOrWhiteSpace(e.Motivo) && e.OrdenId is null) return Ayudas.Error("Indique la orden de trabajo o el motivo de la solicitud.");
            OrdenTrabajo? o = null;
            if (e.OrdenId is { } oid)
            {
                o = await db.Ordenes.FindAsync(oid);
                if (o is null) return Ayudas.Error("La orden de trabajo no existe.", 404);
                if (o.Estado == "cerrada") return Ayudas.Error("La orden ya está cerrada.", 409);
            }
            string nombre; int fisico;
            if (e.Tipo == "repuesto")
            {
                var r = await db.Repuestos.AsNoTracking().FirstOrDefaultAsync(x => x.Id == e.ItemId);
                if (r is null) return Ayudas.Error("No existe ese repuesto.", 404);
                nombre = $"{r.Codigo} {r.Nombre}"; fisico = r.Stock;
            }
            else
            {
                var h = await db.Herramientas.AsNoTracking().FirstOrDefaultAsync(x => x.Id == e.ItemId);
                if (h is null) return Ayudas.Error("No existe esa herramienta.", 404);
                nombre = $"{h.Codigo} {h.Nombre}"; fisico = 1;
            }
            // compatibilidad: un repuesto que no figura para el equipo de la orden exige confirmación consciente
            var incompatible = false;
            if (e.Tipo == "repuesto" && o is not null)
            {
                var compatibles = await db.EquipoRepuestos.Where(x => x.EquipoId == o.EquipoId).Select(x => x.RepuestoId).ToListAsync();
                incompatible = compatibles.Count > 0 && !compatibles.Contains(e.ItemId);
                if (incompatible && !e.Confirmar)
                    return Results.Json(new { error = $"{nombre} no figura como compatible con el equipo de la orden. Confirme solo si lo verificó en el manual o con la jefatura.", requiereConfirmacion = true, motivo = "compatibilidad" }, statusCode: 409);
            }
            var reservado = await Panol.ReservadoAsync(db, e.Tipo, e.ItemId);
            var disponible = fisico - reservado;
            var x = new SolicitudPanol { Tipo = e.Tipo, ItemId = e.ItemId, Cantidad = e.Cantidad, OrdenId = e.OrdenId, Motivo = (e.Motivo ?? "").Trim(), SolicitanteId = s.Id, SolicitanteNombre = s.Nombre, Incompatible = incompatible,
                Vigencia = DateTime.UtcNow.AddHours(Math.Clamp(e.VigenciaHoras ?? 24, 1, 168)) };
            db.SolicitudesPanol.Add(x);
            await db.SaveChangesAsync();
            Panol.Anotar(db, e.Tipo, e.ItemId, "solicitud", $"{s.Nombre} pide {e.Cantidad}{(o is not null ? $" para {o.Codigo}" : "")}{(x.Motivo.Length > 0 ? $": {x.Motivo}" : "")}{(incompatible ? " (confirmó compatibilidad)" : "")}. Disponible al pedir: {disponible}.", s, e.Cantidad, orden: e.OrdenId, solicitud: x.Id);
            db.Auditar(s, "pidió al pañol", e.Tipo, nombre, $"{e.Cantidad} · {(o?.Codigo ?? x.Motivo)}");
            await db.SaveChangesAsync();
            await Avisos.ACargosAsync(db, hub, Avisos.Panol.Concat(new[] { 23 }), $"Solicitud SP-{x.Id:0000}: {s.Nombre} pide {e.Cantidad} × {nombre}{(o is not null ? $" para {o.Codigo}" : "")}{(disponible < e.Cantidad ? " — sin disponibilidad suficiente" : "")}", disponible < e.Cantidad ? "advertencia" : "solicitud", "/panol", "panol", $"SP-{x.Id:0000}", excepto: s.Id);
            await hub.Clients.Group("planta").SendAsync("panol", new { id = x.Id });
            return Results.Created($"/api/panol/solicitudes/{x.Id}", new { x.Id, codigo = $"SP-{x.Id:0000}", disponible, alcanza = disponible >= e.Cantidad });
        });

        g.MapPost("/solicitudes/{id:int}/revisar", async (int id, RevisionPanolEntrada e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            var x = await db.SolicitudesPanol.FindAsync(id);
            if (x is null) return Ayudas.Error("No existe esa solicitud.", 404);
            if (!Gestiona(s, x.Tipo)) return Ayudas.Error("Aprobar y reservar es del pañol o la jefatura de mantenimiento.", 403);
            if (x.Estado != "solicitada") return Ayudas.Error($"La solicitud ya está {x.Estado}.", 409);
            if (x.SolicitanteId == s.Id && !s.Tiene("ordenes.aprobar")) return Ayudas.Error("No puede aprobar su propia solicitud.", 403);
            x.RevisadaPorId = s.Id; x.RevisadaPor = s.Nombre; x.RevisadaEn = DateTime.UtcNow; x.NotaRevision = (e.Nota ?? "").Trim();
            if (!e.Aprobar)
            {
                if (x.NotaRevision.Length < 3) return Ayudas.Error("Explique por qué se rechaza.");
                x.Estado = "rechazada";
                Panol.Anotar(db, x.Tipo, x.ItemId, "rechazo", $"{s.Nombre} rechazó SP-{x.Id:0000}: {x.NotaRevision}", s, x.Cantidad, orden: x.OrdenId, solicitud: x.Id);
            }
            else
            {
                var fisico = x.Tipo == "repuesto" ? (await db.Repuestos.AsNoTracking().FirstAsync(r => r.Id == x.ItemId)).Stock : (await db.Herramientas.AsNoTracking().FirstAsync(h => h.Id == x.ItemId)).Estado == "retirada" ? 0 : 1;
                var reservado = await Panol.ReservadoAsync(db, x.Tipo, x.ItemId, excluirSolicitud: x.Id);
                if (fisico - reservado < x.Cantidad && x.Tipo == "repuesto")
                    return Ayudas.Error($"No alcanza: {fisico} en estante y {reservado} ya reservado(s). Rechace o espere el ingreso.", 409);
                if (x.Tipo == "herramienta" && reservado > 0) return Ayudas.Error("La herramienta ya está reservada para otro trabajo.", 409);
                x.Estado = "reservada";
                if (e.VigenciaHoras is { } vh) x.Vigencia = DateTime.UtcNow.AddHours(Math.Clamp(vh, 1, 168));
                Panol.Anotar(db, x.Tipo, x.ItemId, "reserva", $"{s.Nombre} reservó {x.Cantidad} para {x.SolicitanteNombre} hasta {Calendario.Texto(x.Vigencia!.Value)}.", s, x.Cantidad, orden: x.OrdenId, solicitud: x.Id);
            }
            db.Auditar(s, e.Aprobar ? "reservó en el pañol" : "rechazó una solicitud del pañol", "solicitud", $"SP-{x.Id:0000}", x.NotaRevision);
            await db.SaveChangesAsync();
            await Avisos.AUsuarioAsync(db, hub, x.SolicitanteId, e.Aprobar ? $"SP-{x.Id:0000} reservada: retírela en el pañol antes de {Calendario.Texto(x.Vigencia!.Value)}." : $"SP-{x.Id:0000} rechazada: {x.NotaRevision}", e.Aprobar ? "info" : "advertencia", "/panol", "panol", $"SP-{x.Id:0000}");
            await hub.Clients.Group("planta").SendAsync("panol", new { id = x.Id });
            return Results.Ok(new { x.Estado, x.Vigencia });
        });

        g.MapPost("/solicitudes/{id:int}/entregar", async (int id, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            var x = await db.SolicitudesPanol.FindAsync(id);
            if (x is null) return Ayudas.Error("No existe esa solicitud.", 404);
            if (!Gestiona(s, x.Tipo)) return Ayudas.Error("La entrega la registra el pañol.", 403);
            if (x.Estado == "entregada" || x.Estado == "cerrada") return Ayudas.Error("Esta solicitud ya fue entregada: no se puede retirar dos veces.", 409);
            if (x.Estado != "reservada") return Ayudas.Error($"Solo se entrega lo reservado (la solicitud está {x.Estado}).", 409);
            if (x.Vigencia is { } v && v <= DateTime.UtcNow) return Ayudas.Error("La reserva venció. Pida una nueva.", 409);
            if (x.Tipo == "repuesto")
            {
                var r = await db.Repuestos.FirstAsync(r => r.Id == x.ItemId);
                if (r.Stock < x.Cantidad) return Ayudas.Error($"En estante quedan {r.Stock}: revise el conteo físico.", 409);
                var antes = r.Stock; r.Stock -= x.Cantidad;
                db.MovimientosRepuesto.Add(new MovimientoRepuesto { RepuestoId = r.Id, Cantidad = -x.Cantidad, OrdenId = x.OrdenId, PorId = s.Id, PorNombre = s.Nombre, Nota = $"Entrega SP-{x.Id:0000} a {x.SolicitanteNombre}" });
                Panol.Anotar(db, "repuesto", r.Id, "entrega", $"Entregado a {x.SolicitanteNombre}.", s, -x.Cantidad, antes, r.Stock, x.OrdenId, x.Id);
            }
            else
            {
                var h = await db.Herramientas.FirstAsync(h => h.Id == x.ItemId);
                if (h.Estado == "retirada") return Ayudas.Error($"La tiene {h.RetiradaPorNombre}: no está en el pañol.", 409);
                h.Estado = "retirada"; h.RetiradaPorId = x.SolicitanteId; h.RetiradaPorNombre = x.SolicitanteNombre; h.RetiradaEn = DateTime.UtcNow;
                Panol.Anotar(db, "herramienta", h.Id, "entrega", $"Entregada a {x.SolicitanteNombre}.", s, 1, orden: x.OrdenId, solicitud: x.Id);
            }
            x.Estado = "entregada"; x.EntregadaEn = DateTime.UtcNow; x.EntregadaPor = s.Nombre;
            db.Auditar(s, "entregó desde el pañol", x.Tipo, $"SP-{x.Id:0000}", $"{x.Cantidad} a {x.SolicitanteNombre}");
            try { await db.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException) { return Ayudas.Error("Otra persona registró un movimiento al mismo tiempo. Actualice y vuelva a intentar.", 409); }
            await hub.Clients.Group("planta").SendAsync("panol", new { id = x.Id });
            return Results.Ok(new { x.Estado });
        });

        g.MapPost("/solicitudes/{id:int}/cerrar", async (int id, CierrePanolEntrada e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            var x = await db.SolicitudesPanol.FindAsync(id);
            if (x is null) return Ayudas.Error("No existe esa solicitud.", 404);
            if (x.SolicitanteId != s.Id && !Gestiona(s, x.Tipo)) return Ayudas.Sin();
            if (x.Estado != "entregada") return Ayudas.Error("Solo se cierra lo entregado.", 409);
            var libre = x.Cantidad - x.Usada - x.Devuelta;
            if (e.Usada < 0 || e.Devuelta < 0 || e.Usada + e.Devuelta != libre) return Ayudas.Error($"Usado más devuelto debe sumar {libre}.");
            if (x.Tipo == "repuesto" && e.Devuelta > 0)
            {
                var r = await db.Repuestos.FirstAsync(r => r.Id == x.ItemId);
                var antes = r.Stock; r.Stock += e.Devuelta;
                db.MovimientosRepuesto.Add(new MovimientoRepuesto { RepuestoId = r.Id, Cantidad = e.Devuelta, OrdenId = x.OrdenId, PorId = s.Id, PorNombre = s.Nombre, Nota = $"Devolución SP-{x.Id:0000}" });
                Panol.Anotar(db, "repuesto", r.Id, "devolucion", $"{x.SolicitanteNombre} devolvió {e.Devuelta} sin usar{(string.IsNullOrWhiteSpace(e.Nota) ? "" : $": {e.Nota}")}.", s, e.Devuelta, antes, r.Stock, x.OrdenId, x.Id);
            }
            if (x.Tipo == "herramienta")
            {
                var h = await db.Herramientas.FirstAsync(h => h.Id == x.ItemId);
                h.Estado = "disponible"; h.RetiradaPorId = null; h.RetiradaPorNombre = null; h.RetiradaEn = null;
                Panol.Anotar(db, "herramienta", h.Id, "devolucion", $"Devuelta por {x.SolicitanteNombre}{(string.IsNullOrWhiteSpace(e.Nota) ? "" : $": {e.Nota}")}.", s, 1, orden: x.OrdenId, solicitud: x.Id);
            }
            if (x.Tipo == "repuesto" && e.Usada > 0) Panol.Anotar(db, "repuesto", x.ItemId, "uso", $"{e.Usada} usado(s){(x.OrdenId is null ? "" : " en la orden")}.", s, e.Usada, orden: x.OrdenId, solicitud: x.Id);
            x.Usada += e.Usada; x.Devuelta += e.Devuelta; x.Estado = "cerrada"; x.CerradaEn = DateTime.UtcNow;
            await db.SaveChangesAsync();
            await hub.Clients.Group("planta").SendAsync("panol", new { id = x.Id });
            return Results.Ok(new { x.Estado });
        });

        g.MapPost("/solicitudes/{id:int}/cancelar", async (int id, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            var x = await db.SolicitudesPanol.FindAsync(id);
            if (x is null) return Ayudas.Error("No existe esa solicitud.", 404);
            if (x.SolicitanteId != s.Id && !Gestiona(s, x.Tipo)) return Ayudas.Sin();
            if (x.Estado is not ("solicitada" or "reservada")) return Ayudas.Error("Solo se cancela lo que aún no se retira.", 409);
            x.Estado = "cancelada";
            Panol.Anotar(db, x.Tipo, x.ItemId, "cancelacion", $"{s.Nombre} canceló SP-{x.Id:0000}.", s, x.Cantidad, orden: x.OrdenId, solicitud: x.Id);
            await db.SaveChangesAsync();
            return Results.Ok(new { x.Estado });
        });

        // ------------------------------------------------------------------------------------ bitácora inmutable
        g.MapGet("/bitacora", async (string tipo, int itemId, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!(tipo == "herramienta" ? s.Tiene("herramientas.ver") : s.Tiene("repuestos.ver"))) return Ayudas.Sin();
            var lista = await db.BitacoraPanol.AsNoTracking().Where(b => b.Tipo == tipo && b.ItemId == itemId).OrderByDescending(b => b.Id).Take(200).ToListAsync();
            var ids = lista.Where(b => b.OrdenId != null).Select(b => b.OrdenId!.Value).Distinct().ToList();
            var ots = await db.Ordenes.AsNoTracking().Where(o => ids.Contains(o.Id)).ToDictionaryAsync(o => o.Id, o => o.Codigo);
            return Results.Ok(lista.Select(b => new { b.Id, b.Evento, b.Detalle, b.Cantidad, b.StockAntes, b.StockDespues, orden = b.OrdenId is { } o ? ots.GetValueOrDefault(o) : null, solicitud = b.SolicitudId is { } x ? $"SP-{x:0000}" : null, b.PorNombre, b.Fecha }));
        });

        // ------------------------------------------------------------------------------------ entrega de turno
        g.MapGet("/turnos", async (ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("repuestos.editar") && !s.Tiene("herramientas.editar")) return Ayudas.Sin();
            return Results.Ok(await db.EntregasTurnoPanol.AsNoTracking().OrderByDescending(t => t.Id).Take(20).ToListAsync());
        });

        g.MapPost("/turnos", async (EntregaTurnoEntrada e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (!s.Tiene("repuestos.editar") && !s.Tiene("herramientas.editar")) return Ayudas.Sin();
            await Panol.VencerAsync(db);
            var fuera = await db.Herramientas.AsNoTracking().Where(h => h.Estado == "retirada").Select(h => new { h.Codigo, h.Nombre, por = h.RetiradaPorNombre, h.RetiradaEn }).ToListAsync();
            var activas = await db.SolicitudesPanol.AsNoTracking().Where(x => Panol.Activas.Contains(x.Estado)).GroupBy(x => x.Estado).Select(g => new { g.Key, n = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.n);
            var criticos = await db.Repuestos.AsNoTracking().Where(r => r.Critico && r.Stock <= r.StockMinimo).Select(r => new { r.Codigo, r.Nombre, r.Stock, r.StockMinimo }).ToListAsync();
            var t = new EntregaTurnoPanol { Turno = Calendario.Texto(DateTime.UtcNow, "dd-MM HH:mm") + $" · turno {s.Turno}", EntregaId = s.Id, EntregaNombre = s.Nombre, Pendientes = (e.Pendientes ?? "").Trim(), Observaciones = (e.Observaciones ?? "").Trim(),
                Estado = JsonSerializer.Serialize(new { herramientasFuera = fuera, porRevisar = activas.GetValueOrDefault("solicitada"), reservadas = activas.GetValueOrDefault("reservada"), entregadas = activas.GetValueOrDefault("entregada"), criticos }, new JsonSerializerOptions(JsonSerializerDefaults.Web)) };
            db.EntregasTurnoPanol.Add(t);
            db.Auditar(s, "entregó el turno del pañol", "panol", t.Turno, t.Pendientes);
            await db.SaveChangesAsync();
            await Avisos.ACargosAsync(db, hub, Avisos.Panol, $"Entrega de turno del pañol de {s.Nombre}: {fuera.Count} herramientas fuera, {activas.GetValueOrDefault("solicitada")} solicitudes por revisar.", "info", "/panol", "panol", null, excepto: s.Id);
            return Results.Created($"/api/panol/turnos/{t.Id}", t);
        });

        g.MapPost("/turnos/{id:int}/recibir", async (int id, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("repuestos.editar") && !s.Tiene("herramientas.editar")) return Ayudas.Sin();
            var t = await db.EntregasTurnoPanol.FindAsync(id);
            if (t is null) return Ayudas.Error("No existe esa entrega.", 404);
            if (t.EntregaId == s.Id) return Ayudas.Error("La recibe la persona del turno siguiente.", 409);
            if (t.RecibidaEn is not null) return Ayudas.Error($"Ya la recibió {t.RecibeNombre}.", 409);
            t.RecibeId = s.Id; t.RecibeNombre = s.Nombre; t.RecibidaEn = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(t);
        });
    }
}
