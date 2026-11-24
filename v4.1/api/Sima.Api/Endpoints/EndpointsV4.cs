using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Sima.Api.Datos;
using Sima.Api.Dominio;
using Sima.Api.Servicios;

namespace Sima.Api.Endpoints;

public record PermisoEntrada(string Capacidad, string? Alcance);
public record OrdenProduccionEntrada(string Equipo, string Producto, int Cantidad, string? Turno, string? Lote);
public record EstadoEntradaOp(string Estado);
public record RegistroProduccionEntrada(int Conformes, int Rechazo, string? Motivo);
public record NoConformidadEntrada(string Producto, string? Lote, int? OrdenId, string? Equipo, string Tipo, string Severidad, string Descripcion, int Cantidad);
public record AnalisisEntrada(string Analisis);
public record ResolucionEntrada(string Decision, string Disposicion);
public record IncidenteEntrada(string? Zona, string? Equipo, string Tipo, string Severidad, string Descripcion, string? ControlInmediato, int? AreaId = null);
public record AvanceIncidenteEntrada(string Estado, string? Responsable, string? Cierre);
public record RevisionCambioEntrada(string? Comentario);
public record ValidacionEntrada(string Periodo, string? Nota);

/// <summary>Cambios de programa de PLC: solicitud y aprobación por personas distintas (segregación del despliegue).</summary>
public static class CambiosPlc
{
    public static async Task<IResult> SolicitarAsync(SimaDb db, IHubContext<PlantaHub> hub, string codigo, JsonElement programa, string porId, string por, string origen, string justificacion)
    {
        var p = await db.Plcs.FirstOrDefaultAsync(x => x.Codigo == codigo);
        if (p is null) return Ayudas.Error("No existe ese PLC.", 404);
        if (!programa.TryGetProperty("peldanos", out var pel) || pel.ValueKind != JsonValueKind.Array) return Ayudas.Error("El programa debe tener una lista de peldaños.");
        var actual = JsonSerializer.Deserialize<JsonElement>(p.Programa);
        // si el cambio no trae variables, se conservan las del programa publicado
        JsonElement? variables = programa.TryGetProperty("variables", out var v) && v.ValueKind == JsonValueKind.Array ? v
            : actual.ValueKind == JsonValueKind.Object && actual.TryGetProperty("variables", out var va) && va.ValueKind == JsonValueKind.Array ? va : null;
        var limpio = JsonSerializer.Serialize(new { version = p.VersionPrograma, variables, peldanos = pel });
        var resumen = Diferencia(actual, pel);
        if (resumen == "sin cambios") return Ayudas.Error("El programa es igual al publicado: no hay nada que aprobar.", 409);
        var previa = await db.CambiosPlc.FirstOrDefaultAsync(c => c.PlcId == p.Id && c.Estado == "pendiente" && c.SolicitadoPorId == porId);
        var c = previa ?? new CambioPlc { PlcId = p.Id };
        c.VersionBase = p.VersionPrograma; c.Programa = limpio; c.Resumen = resumen; c.Origen = origen; c.SolicitadoPorId = porId; c.SolicitadoPor = por; c.Fecha = DateTime.UtcNow;
        c.Justificacion = string.IsNullOrWhiteSpace(justificacion) ? (origen == "simulador" ? "Cambio preparado en la estación de ingeniería." : "") : justificacion.Trim();
        if (previa is null) db.CambiosPlc.Add(c);
        db.Auditorias.Add(new Auditoria { UsuarioId = porId, UsuarioNombre = por, Accion = "solicitó un cambio de programa", Entidad = "plc", EntidadId = codigo, Detalle = resumen });
        await db.SaveChangesAsync();
        await hub.Clients.Group("planta").SendAsync("cambioPlc", new { id = c.Id, plc = codigo, estado = c.Estado, por, resumen });
        return Results.Accepted($"/api/plc/cambios/{c.Id}", new { pendiente = true, id = c.Id, resumen, mensaje = "Cambio enviado a aprobación. Se publicará cuando lo apruebe otra persona autorizada." });
    }

    static string Diferencia(JsonElement actual, JsonElement nuevos)
    {
        var antes = actual.ValueKind == JsonValueKind.Object && actual.TryGetProperty("peldanos", out var a) && a.ValueKind == JsonValueKind.Array
            ? a.EnumerateArray().ToDictionary(x => x.TryGetProperty("id", out var i) ? i.ToString() : Guid.NewGuid().ToString(), x => x.GetRawText()) : new();
        var despues = nuevos.EnumerateArray().ToDictionary(x => x.TryGetProperty("id", out var i) ? i.ToString() : Guid.NewGuid().ToString(), x => x.GetRawText());
        var agregados = despues.Keys.Count(k => !antes.ContainsKey(k));
        var quitados = antes.Keys.Count(k => !despues.ContainsKey(k));
        var modificados = despues.Count(kv => antes.TryGetValue(kv.Key, out var t) && t != kv.Value);
        if (agregados + quitados + modificados == 0) return "sin cambios";
        var partes = new List<string>();
        if (modificados > 0) partes.Add($"{modificados} peldaño{(modificados == 1 ? "" : "s")} modificado{(modificados == 1 ? "" : "s")}");
        if (agregados > 0) partes.Add($"{agregados} agregado{(agregados == 1 ? "" : "s")}");
        if (quitados > 0) partes.Add($"{quitados} quitado{(quitados == 1 ? "" : "s")}");
        return string.Join(", ", partes);
    }
}

public static class EndpointsV4
{
    static string Codigo(string prefijo, int n) => $"{prefijo}-{n:0000}";

    public static void MapV4(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api").RequireAuthorization();

        // ================================================================================== permisos por cargo
        g.MapGet("/permisos", async (ClaimsPrincipal u, SimaDb db) =>
        {
            if (!u.S().Tiene("permisos.ver")) return Ayudas.Sin();
            var cargos = await db.Cargos.AsNoTracking().OrderBy(c => c.FamiliaN).ThenBy(c => c.Id).ToListAsync();
            var dot = await db.Trabajadores.AsNoTracking().GroupBy(t => t.CargoId).Select(x => new { x.Key, n = x.Count() }).ToDictionaryAsync(x => x.Key, x => x.n);
            return Results.Ok(new
            {
                recursos = Permisos.Recursos.Select(r => new { r.clave, r.titulo, r.grupo }),
                acciones = Permisos.Acciones,
                capacidades = Permisos.Recursos.SelectMany(r => Permisos.Acciones.Keys.Select(a => $"{r.clave}.{a}")).Where(c => cargos.Any(k => Permisos.DeFabrica(k.Id, k.PerfilSima).ContainsKey(c)) || c.EndsWith(".ver") || c.EndsWith(".editar")).Distinct(),
                cargos = cargos.Select(c => new { c.Id, c.Nombre, c.Familia, perfil = c.PerfilSima, c.Canal, personas = dot.GetValueOrDefault(c.Id), capacidades = Permisos.Capacidades(c.Id, c.PerfilSima) }),
                puedeEditar = u.S().Tiene("permisos.editar"),
            });
        });

        g.MapPut("/permisos/{cargoId:int}", async (int cargoId, PermisoEntrada e, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("permisos.editar")) return Ayudas.Sin();
            var cargo = await db.Cargos.FindAsync(cargoId);
            if (cargo is null) return Ayudas.Error("No existe ese cargo.", 404);
            var partes = e.Capacidad.Split('.');
            if (partes.Length != 2 || !Permisos.Recursos.Any(r => r.clave == partes[0]) || !Permisos.Acciones.ContainsKey(partes[1])) return Ayudas.Error("Capacidad desconocida.");
            if (cargoId == s.CargoId && partes[0] == "permisos") return Ayudas.Error("No puede cambiar los permisos de administración de su propio cargo.", 409);
            var fila = await db.RolPermisos.FirstOrDefaultAsync(r => r.CargoId == cargoId && r.Capacidad == e.Capacidad);
            if (e.Alcance is null) { if (fila is not null) db.RolPermisos.Remove(fila); }
            else if (fila is null) db.RolPermisos.Add(new RolPermiso { CargoId = cargoId, Capacidad = e.Capacidad, Alcance = e.Alcance, Version = Permisos.VersionMatriz });
            else fila.Alcance = e.Alcance;
            db.Auditar(s, e.Alcance is null ? "quitó una capacidad" : "otorgó una capacidad", "cargo", cargoId.ToString(), $"{cargo.Nombre}: {e.Capacidad}{(e.Alcance is null ? "" : $" ({e.Alcance})")}");
            await db.SaveChangesAsync();
            await Permisos.RecargarAsync(db);
            return Results.Ok(new { capacidades = Permisos.Capacidades(cargoId, cargo.PerfilSima) });
        });

        // ================================================================================== producción
        g.MapGet("/produccion/ordenes", async (string? estado, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("produccion.ver") && !s.Tiene("produccion.registrar")) return Ayudas.Sin();
            var q = db.OrdenesProduccion.AsNoTracking().AsQueryable();
            if (!string.IsNullOrEmpty(estado)) q = estado == "activas" ? q.Where(o => o.Estado != "terminada") : q.Where(o => o.Estado == estado);
            var alcance = s.Alcance("produccion.ver");
            if (alcance is "propio" or null) q = q.Where(o => o.Turno == s.Turno && o.Estado != "terminada");   // el operador ve el trabajo de su turno
            else if (alcance == "equipo") q = q.Where(o => o.Turno == s.Turno);                                  // supervisión y líderes: su turno
            var eq = await db.Equipos.AsNoTracking().Include(e => e.Linea).ToDictionaryAsync(e => e.Id);
            var lista = await q.OrderByDescending(o => o.Estado == "en_curso").ThenByDescending(o => o.Id).Take(120).ToListAsync();
            return Results.Ok(lista.Select(o => new
            {
                o.Id, o.Codigo, o.Producto, o.Lote, equipo = eq[o.EquipoId].Codigo, equipoNombre = eq[o.EquipoId].Nombre, linea = eq[o.EquipoId].Linea!.Nombre, o.Turno, o.Version, o.Cantidad, o.Producidas, o.Buenas,
                rechazo = o.Producidas - o.Buenas, avance = o.Cantidad == 0 ? 0 : Math.Min(1, o.Producidas / (double)o.Cantidad), o.Estado, o.Creada, o.Inicio, o.Fin, o.CreadaPor,
            }));
        });

        g.MapPost("/produccion/ordenes", async (OrdenProduccionEntrada e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (!s.Tiene("produccion.editar")) return Ayudas.Sin();
            var eq = await db.Equipos.FirstOrDefaultAsync(x => x.Codigo == e.Equipo);
            if (eq is null) return Ayudas.Error("No existe ese equipo.", 404);
            if (e.Cantidad <= 0) return Ayudas.Error("La cantidad debe ser mayor que cero.");
            if (string.IsNullOrWhiteSpace(e.Producto)) return Ayudas.Error("Indique el producto.");
            var n = await db.OrdenesProduccion.CountAsync() + 1;
            var o = new OrdenProduccion
            {
                Codigo = $"OP-{DateTime.Now:yyMM}-{n:000}", Producto = e.Producto.Trim(), Lote = string.IsNullOrWhiteSpace(e.Lote) ? $"L{DateTime.Now:yyMMdd}-{n:000}" : e.Lote.Trim(),
                EquipoId = eq.Id, Turno = e.Turno is "D" or "N" or "A" or "B" ? e.Turno : "D", Cantidad = e.Cantidad, CreadaPor = s.Nombre,
            };
            db.OrdenesProduccion.Add(o);
            db.Auditar(s, "planificó una orden de producción", "produccion", o.Codigo, $"{o.Producto} × {o.Cantidad} en {eq.Codigo}");
            await db.SaveChangesAsync();
            await hub.Clients.Group("planta").SendAsync("produccion", new { id = o.Id, codigo = o.Codigo, estado = o.Estado });
            return Results.Created($"/api/produccion/ordenes/{o.Id}", new { o.Id, o.Codigo });
        });

        g.MapPost("/produccion/ordenes/{id:int}/estado", async (int id, EstadoEntradaOp e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (!s.Tiene("produccion.editar")) return Ayudas.Sin();
            var o = await db.OrdenesProduccion.FindAsync(id);
            if (o is null) return Ayudas.Error("No existe esa orden.", 404);
            var validos = new Dictionary<string, string[]> { ["planificada"] = new[] { "en_curso" }, ["en_curso"] = new[] { "pausada", "terminada" }, ["pausada"] = new[] { "en_curso", "terminada" } };
            if (!validos.TryGetValue(o.Estado, out var sig) || !sig.Contains(e.Estado)) return Ayudas.Error($"Una orden {o.Estado.Replace("_", " ")} no puede pasar a {e.Estado.Replace("_", " ")}.", 409);
            o.Estado = e.Estado;
            if (e.Estado == "en_curso") o.Inicio ??= DateTime.UtcNow;
            if (e.Estado == "terminada") o.Fin = DateTime.UtcNow;
            db.Auditar(s, $"cambió una orden de producción a {e.Estado.Replace("_", " ")}", "produccion", o.Codigo);
            await db.SaveChangesAsync();
            await hub.Clients.Group("planta").SendAsync("produccion", new { id = o.Id, codigo = o.Codigo, estado = o.Estado });
            return Results.Ok(new { ok = true });
        });

        g.MapPost("/produccion/ordenes/{id:int}/registro", async (int id, RegistroProduccionEntrada e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (!s.Tiene("produccion.registrar")) return Ayudas.Sin();
            var o = await db.OrdenesProduccion.FindAsync(id);
            if (o is null) return Ayudas.Error("No existe esa orden.", 404);
            if (o.Estado != "en_curso") return Ayudas.Error("Solo se registra producción en órdenes en curso.", 409);
            if (s.Perfil == "operador" && o.Turno != s.Turno) return Ayudas.Error("Esta orden es de otro turno.", 403);
            if (e.Conformes < 0 || e.Rechazo < 0 || e.Conformes + e.Rechazo == 0) return Ayudas.Error("Indique piezas conformes o rechazadas.");
            if (e.Rechazo > 0 && string.IsNullOrWhiteSpace(e.Motivo)) return Ayudas.Error("Indique el motivo del rechazo.");
            db.RegistrosProduccion.Add(new RegistroProduccion { OrdenId = id, OperadorId = s.Id, OperadorNombre = s.Nombre, Conformes = e.Conformes, Rechazo = e.Rechazo, Motivo = e.Motivo?.Trim() ?? "" });
            o.Producidas += e.Conformes + e.Rechazo; o.Buenas += e.Conformes;
            var hoy = Reloj.Hoy();
            var dia = await db.Produccion.FirstOrDefaultAsync(p => p.EquipoId == o.EquipoId && p.Fecha == hoy);
            if (dia is null) db.Produccion.Add(dia = new ProduccionDia { EquipoId = o.EquipoId, Fecha = hoy, UnidadesPlan = o.Cantidad, HorasPlan = 16 });
            dia.UnidadesProducidas += e.Conformes + e.Rechazo; dia.UnidadesBuenas += e.Conformes;      // alimenta el OEE
            await db.SaveChangesAsync();
            await hub.Clients.Group("planta").SendAsync("produccion", new { id = o.Id, codigo = o.Codigo, estado = o.Estado, producidas = o.Producidas, buenas = o.Buenas });
            return Results.Ok(new { o.Producidas, o.Buenas, avance = o.Cantidad == 0 ? 0 : o.Producidas / (double)o.Cantidad });
        });

        g.MapGet("/produccion/resumen", async (ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("produccion.ver") && !s.Tiene("produccion.registrar")) return Ayudas.Sin();
            var desde = DateTime.UtcNow.AddHours(-12);
            var regs = await db.RegistrosProduccion.AsNoTracking().Where(r => r.Fecha >= desde).ToListAsync();
            if (s.Alcance("produccion.ver") is "propio" or null) regs = regs.Where(r => r.OperadorId == s.Id).ToList();
            var horas = Enumerable.Range(0, 12).Select(i => DateTime.UtcNow.AddHours(-11 + i)).ToList();
            var ops = await db.OrdenesProduccion.AsNoTracking().ToListAsync();
            var eq = await db.Equipos.AsNoTracking().Include(e => e.Linea).ToDictionaryAsync(e => e.Id);
            var d14 = Reloj.Hoy().AddDays(-13);
            var dias = await db.Produccion.AsNoTracking().Where(p => p.Fecha >= d14).GroupBy(p => p.Fecha)
                .Select(x => new { fecha = x.Key, plan = x.Sum(p => p.UnidadesPlan), producidas = x.Sum(p => p.UnidadesProducidas), buenas = x.Sum(p => p.UnidadesBuenas) }).OrderBy(x => x.fecha).ToListAsync();
            return Results.Ok(new
            {
                conformes = regs.Sum(r => r.Conformes), rechazo = regs.Sum(r => r.Rechazo),
                porHora = horas.Select(h => new { hora = h.ToLocalTime().ToString("HH:00"), conformes = regs.Where(r => r.Fecha.Hour == h.Hour && r.Fecha.Date == h.Date).Sum(r => r.Conformes), rechazo = regs.Where(r => r.Fecha.Hour == h.Hour && r.Fecha.Date == h.Date).Sum(r => r.Rechazo) }),
                motivos = regs.Where(r => r.Rechazo > 0).GroupBy(r => r.Motivo).Select(x => new { motivo = x.Key, n = x.Sum(r => r.Rechazo) }).OrderByDescending(x => x.n).Take(6),
                ordenes = new { enCurso = ops.Count(o => o.Estado == "en_curso"), planificadas = ops.Count(o => o.Estado == "planificada"), pausadas = ops.Count(o => o.Estado == "pausada"), terminadas = ops.Count(o => o.Estado == "terminada" && o.Fin >= DateTime.UtcNow.AddDays(-7)) },
                porLinea = ops.Where(o => o.Estado is "en_curso" or "pausada").GroupBy(o => eq[o.EquipoId].Linea!.Nombre).Select(x => new { linea = x.Key, cantidad = x.Sum(o => o.Cantidad), producidas = x.Sum(o => o.Producidas), buenas = x.Sum(o => o.Buenas) }),
                dias,
            });
        });

        // ================================================================================== calidad
        g.MapGet("/calidad/nc", async (string? estado, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("calidad.ver")) return Ayudas.Sin();
            var q = db.NoConformidades.AsNoTracking().AsQueryable();
            if (!string.IsNullOrEmpty(estado)) q = estado == "abiertas" ? q.Where(n => n.Estado == "abierta" || n.Estado == "en_analisis") : q.Where(n => n.Estado == estado);
            var eq = await db.Equipos.AsNoTracking().ToDictionaryAsync(e => e.Id, e => e.Codigo);
            return Results.Ok((await q.OrderByDescending(n => n.Id).Take(200).ToListAsync()).Select(n => new
            { n.Id, n.Codigo, n.Fecha, n.Lote, n.Producto, n.OrdenId, equipo = n.EquipoId is { } x ? eq.GetValueOrDefault(x) : null, n.Tipo, n.Severidad, n.Descripcion, n.Cantidad, n.Estado, n.RegistradaPor, n.Analisis, n.Disposicion, n.ResueltaPor, n.FechaResolucion }));
        });

        g.MapPost("/calidad/nc", async (NoConformidadEntrada e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (!s.Tiene("calidad.registrar")) return Ayudas.Sin();
            if (string.IsNullOrWhiteSpace(e.Descripcion) || string.IsNullOrWhiteSpace(e.Producto)) return Ayudas.Error("Describa el producto y la no conformidad.");
            if (e.Severidad is not ("menor" or "mayor" or "critica")) return Ayudas.Error("Severidad no válida.");
            var eq = e.Equipo is null ? null : await db.Equipos.FirstOrDefaultAsync(x => x.Codigo == e.Equipo);
            var n = new NoConformidad
            {
                Codigo = Codigo("NC", await db.NoConformidades.CountAsync() + 1), Producto = e.Producto.Trim(), Lote = e.Lote?.Trim() ?? "", OrdenId = e.OrdenId, EquipoId = eq?.Id,
                Tipo = e.Tipo, Severidad = e.Severidad, Descripcion = e.Descripcion.Trim(), Cantidad = Math.Max(0, e.Cantidad), RegistradaPorId = s.Id, RegistradaPor = s.Nombre,
            };
            db.NoConformidades.Add(n);
            db.Auditar(s, "registró una no conformidad y retuvo el lote", "calidad", n.Codigo, $"{n.Producto} · lote {n.Lote} · {n.Severidad}");
            await db.SaveChangesAsync();
            await hub.Clients.Group("planta").SendAsync("calidad", new { id = n.Id, codigo = n.Codigo, estado = n.Estado, severidad = n.Severidad, texto = $"{n.Codigo}: {n.Producto} retenido ({n.Severidad})" });
            return Results.Created($"/api/calidad/nc/{n.Id}", new { n.Id, n.Codigo });
        });

        g.MapPost("/calidad/nc/{id:int}/analizar", async (int id, AnalisisEntrada e, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("calidad.analizar")) return Ayudas.Sin();
            var n = await db.NoConformidades.FindAsync(id);
            if (n is null) return Ayudas.Error("No existe esa no conformidad.", 404);
            if (n.Estado is "liberada" or "rechazada") return Ayudas.Error("La no conformidad ya fue resuelta.", 409);
            n.Estado = "en_analisis"; n.Analisis = e.Analisis.Trim();
            db.Auditar(s, "analizó una no conformidad", "calidad", n.Codigo);
            await db.SaveChangesAsync();
            return Results.Ok(new { ok = true });
        });

        g.MapPost("/calidad/nc/{id:int}/resolver", async (int id, ResolucionEntrada e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (!s.Tiene("calidad.liberar")) return Ayudas.Error("Liberar o rechazar un lote requiere la facultad explícita de liberación de calidad.", 403);
            var n = await db.NoConformidades.FindAsync(id);
            if (n is null) return Ayudas.Error("No existe esa no conformidad.", 404);
            if (n.Estado is "liberada" or "rechazada") return Ayudas.Error("La no conformidad ya fue resuelta.", 409);
            if (e.Decision is not ("liberar" or "rechazar")) return Ayudas.Error("Decisión no válida.");
            if (string.IsNullOrWhiteSpace(e.Disposicion)) return Ayudas.Error("Explique la disposición del lote.");
            n.Estado = e.Decision == "liberar" ? "liberada" : "rechazada"; n.Disposicion = e.Disposicion.Trim(); n.ResueltaPor = s.Nombre; n.FechaResolucion = DateTime.UtcNow;
            db.Auditar(s, e.Decision == "liberar" ? "liberó un lote retenido" : "rechazó un lote", "calidad", n.Codigo, n.Disposicion);
            await db.SaveChangesAsync();
            await hub.Clients.Group("planta").SendAsync("calidad", new { id = n.Id, codigo = n.Codigo, estado = n.Estado, severidad = n.Severidad, texto = $"{n.Codigo}: lote {(n.Estado == "liberada" ? "liberado" : "rechazado")}" });
            return Results.Ok(new { ok = true });
        });

        g.MapGet("/calidad/resumen", async (ClaimsPrincipal u, SimaDb db) =>
        {
            if (!u.S().Tiene("calidad.ver")) return Ayudas.Sin();
            var ncs = await db.NoConformidades.AsNoTracking().ToListAsync();
            var d30 = Reloj.Hoy().AddDays(-29);
            var prod = await db.Produccion.AsNoTracking().Where(p => p.Fecha >= d30).ToListAsync();
            var producidas = prod.Sum(p => p.UnidadesProducidas); var buenas = prod.Sum(p => p.UnidadesBuenas);
            return Results.Ok(new
            {
                abiertas = ncs.Count(n => n.Estado is "abierta" or "en_analisis"), criticas = ncs.Count(n => n.Estado is "abierta" or "en_analisis" && n.Severidad == "critica"),
                retenidas = ncs.Where(n => n.Estado is "abierta" or "en_analisis").Sum(n => n.Cantidad),
                liberadas30 = ncs.Count(n => n.Estado == "liberada" && n.FechaResolucion >= DateTime.UtcNow.AddDays(-30)), rechazadas30 = ncs.Count(n => n.Estado == "rechazada" && n.FechaResolucion >= DateTime.UtcNow.AddDays(-30)),
                primeraPasada = producidas == 0 ? (double?)null : Math.Round(buenas / (double)producidas, 4),
                porTipo = ncs.GroupBy(n => n.Tipo).Select(x => new { tipo = x.Key, n = x.Count() }).OrderByDescending(x => x.n),
                porSeveridad = ncs.Where(n => n.Estado is "abierta" or "en_analisis").GroupBy(n => n.Severidad).Select(x => new { severidad = x.Key, n = x.Count() }),
                porDia = Enumerable.Range(0, 30).Select(i => d30.AddDays(i)).Select(d => new
                {
                    fecha = d, rechazo = prod.Where(p => p.Fecha == d).Sum(p => p.UnidadesProducidas - p.UnidadesBuenas), producidas = prod.Where(p => p.Fecha == d).Sum(p => p.UnidadesProducidas),
                    nc = ncs.Count(n => DateOnly.FromDateTime(n.Fecha.ToLocalTime()) == d),
                }),
            });
        });

        // ================================================================================== seguridad y salud en el trabajo
        g.MapGet("/sst/incidentes", async (ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            var q = db.IncidentesSst.AsNoTracking().AsQueryable();
            if (!s.Tiene("sst.ver")) { if (!s.Tiene("sst.reportar")) return Ayudas.Sin(); q = q.Where(i => i.ReportadoPorId == s.Id); }   // sin facultad, solo sus propios reportes
            var eq = await db.Equipos.AsNoTracking().ToDictionaryAsync(e => e.Id, e => e.Codigo);
            var areas = await db.Areas.AsNoTracking().ToDictionaryAsync(a => a.Id, a => a.Nombre);
            return Results.Ok((await q.OrderByDescending(i => i.Id).Take(200).ToListAsync()).Select(i => new
            { i.Id, i.Codigo, i.Fecha, zona = areas.GetValueOrDefault(i.AreaId), i.AreaId, equipo = i.EquipoId is { } x ? eq.GetValueOrDefault(x) : null, i.Tipo, i.Severidad, i.Descripcion, i.ControlInmediato, i.Estado, i.ReportadoPor, i.Responsable, i.Cierre, i.FechaCierre }));
        });

        g.MapPost("/sst/incidentes", async (IncidenteEntrada e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (!s.Tiene("sst.reportar")) return Ayudas.Sin();
            if (string.IsNullOrWhiteSpace(e.Descripcion)) return Ayudas.Error("Describa lo que ocurrió.");
            if (e.Tipo is not ("condicion_insegura" or "casi_accidente" or "incidente" or "accidente")) return Ayudas.Error("Tipo no válido.");
            var eq = e.Equipo is null ? null : await db.Equipos.Include(x => x.Linea).FirstOrDefaultAsync(x => x.Codigo == e.Equipo);
            var area = e.AreaId is { } aid ? await db.Areas.FindAsync(aid)
                : eq is not null ? await db.Areas.FindAsync(eq.Linea!.AreaId)
                : await db.Areas.FirstOrDefaultAsync(a => a.Nombre == e.Zona || a.Codigo == e.Zona);
            if (area is null) return Ayudas.Error("Indique el área donde ocurrió.");
            var i = new IncidenteSst
            {
                Codigo = Codigo("SST", await db.IncidentesSst.CountAsync() + 1), AreaId = area.Id, EquipoId = eq?.Id, Tipo = e.Tipo, Severidad = e.Severidad is "grave" or "critica" ? e.Severidad : "leve",
                Descripcion = e.Descripcion.Trim(), ControlInmediato = e.ControlInmediato?.Trim() ?? "", ReportadoPorId = s.Id, ReportadoPor = s.Nombre,
            };
            db.IncidentesSst.Add(i);
            db.Auditar(s, "reportó un evento de seguridad", "sst", i.Codigo, $"{i.Tipo} · {area.Nombre}");
            await db.SaveChangesAsync();
            await hub.Clients.Group("planta").SendAsync("sst", new { id = i.Id, codigo = i.Codigo, tipo = i.Tipo, severidad = i.Severidad, texto = $"{i.Codigo}: {i.Tipo.Replace("_", " ")} en {area.Nombre}" });
            return Results.Created($"/api/sst/incidentes/{i.Id}", new { i.Id, i.Codigo });
        });

        g.MapPost("/sst/incidentes/{id:int}/avanzar", async (int id, AvanceIncidenteEntrada e, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("sst.gestionar")) return Ayudas.Sin();
            var i = await db.IncidentesSst.FindAsync(id);
            if (i is null) return Ayudas.Error("No existe ese registro.", 404);
            if (e.Estado is not ("investigacion" or "cerrado")) return Ayudas.Error("Estado no válido.");
            if (i.Estado == "cerrado") return Ayudas.Error("El registro ya está cerrado.", 409);
            if (e.Estado == "cerrado" && string.IsNullOrWhiteSpace(e.Cierre)) return Ayudas.Error("Indique las medidas de control con que se cierra.");
            i.Estado = e.Estado; i.Responsable = e.Responsable ?? i.Responsable ?? s.Nombre;
            if (e.Estado == "cerrado") { i.Cierre = e.Cierre!.Trim(); i.FechaCierre = DateTime.UtcNow; }
            db.Auditar(s, e.Estado == "cerrado" ? "cerró un evento de seguridad" : "inició la investigación de un evento", "sst", i.Codigo);
            await db.SaveChangesAsync();
            return Results.Ok(new { ok = true });
        });

        g.MapGet("/sst/resumen", async (ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("sst.ver")) return Ayudas.Sin();
            var todos = await db.IncidentesSst.AsNoTracking().ToListAsync();
            var areasN = await db.Areas.AsNoTracking().ToDictionaryAsync(a => a.Id, a => a.Nombre);
            var ultimoAcc = todos.Where(i => i.Tipo == "accidente").Select(i => (DateTime?)i.Fecha).Max();
            var hoy = Reloj.Hoy();
            var habil = await db.Habilitaciones.AsNoTracking().ToListAsync();
            var est = await Reglas.CalcularTodosAsync(db);
            var activas = habil.Where(h => est.TryGetValue(h.TrabajadorId, out var e) && e.EstadoLaboral == "Activo").ToList();
            var meses = Enumerable.Range(0, 6).Select(i => new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1).AddMonths(-5 + i)).ToList();
            return Results.Ok(new
            {
                diasSinAccidentes = ultimoAcc is null ? (int?)null : (int)(DateTime.UtcNow - ultimoAcc.Value).TotalDays,
                abiertos = todos.Count(i => i.Estado != "cerrado"), enInvestigacion = todos.Count(i => i.Estado == "investigacion"),
                habilitacionesVencidas = activas.Count(h => h.Vencimiento < hoy), habilitacionesPorVencer = activas.Count(h => h.Vencimiento >= hoy && h.Vencimiento.DayNumber - hoy.DayNumber <= 30),
                porTipo = todos.GroupBy(i => i.Tipo).Select(x => new { tipo = x.Key, n = x.Count() }),
                porMes = meses.Select(m => new { mes = m.ToString("yyyy-MM"), n = todos.Count(i => i.Fecha.Year == m.Year && i.Fecha.Month == m.Month), accidentes = todos.Count(i => i.Tipo == "accidente" && i.Fecha.Year == m.Year && i.Fecha.Month == m.Month) }),
                porZona = todos.Where(i => i.Fecha >= DateTime.UtcNow.AddDays(-90)).GroupBy(i => areasN.GetValueOrDefault(i.AreaId) ?? "—").Select(x => new { zona = x.Key, n = x.Count() }).OrderByDescending(x => x.n),
            });
        });

        // ================================================================================== cambios de programa de PLC
        g.MapGet("/plc/cambios", async (string? estado, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("plc.ver")) return Ayudas.Sin();
            var plcs = await db.Plcs.AsNoTracking().ToDictionaryAsync(p => p.Id);
            var q = db.CambiosPlc.AsNoTracking().AsQueryable();
            if (!string.IsNullOrEmpty(estado)) q = q.Where(c => c.Estado == estado);
            return Results.Ok((await q.OrderByDescending(c => c.Id).Take(100).ToListAsync()).Select(c => new
            {
                c.Id, plc = plcs[c.PlcId].Codigo, plcNombre = plcs[c.PlcId].Nombre, c.VersionBase, versionActual = plcs[c.PlcId].VersionPrograma, c.Resumen, c.Justificacion, c.Origen, c.Estado,
                c.SolicitadoPor, c.SolicitadoPorId, c.Fecha, c.RevisadoPor, c.FechaRevision, c.Comentario, c.VersionPublicada,
                puedeAprobar = c.Estado == "pendiente" && s.Tiene("plc.aprobar") && c.SolicitadoPorId != s.Id,
            }));
        });

        g.MapGet("/plc/cambios/{id:int}", async (int id, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("plc.ver")) return Ayudas.Sin();
            var c = await db.CambiosPlc.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
            if (c is null) return Ayudas.Error("No existe ese cambio.", 404);
            var p = await db.Plcs.AsNoTracking().FirstAsync(x => x.Id == c.PlcId);
            return Results.Ok(new { c.Id, plc = p.Codigo, c.Estado, c.Resumen, c.Justificacion, c.SolicitadoPor, c.Fecha, propuesto = JsonSerializer.Deserialize<JsonElement>(c.Programa), actual = JsonSerializer.Deserialize<JsonElement>(p.Programa), puedeAprobar = c.Estado == "pendiente" && s.Tiene("plc.aprobar") && c.SolicitadoPorId != s.Id });
        });

        g.MapPost("/plc/cambios/{id:int}/{decision}", async (int id, string decision, RevisionCambioEntrada e, ClaimsPrincipal u, SimaDb db, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (decision is not ("aprobar" or "rechazar")) return Ayudas.Error("Decisión no válida.", 404);
            if (!s.Tiene("plc.aprobar")) return Ayudas.Error("Publicar cambios de PLC requiere la facultad de aprobación.", 403);
            var c = await db.CambiosPlc.FindAsync(id);
            if (c is null) return Ayudas.Error("No existe ese cambio.", 404);
            if (c.Estado != "pendiente") return Ayudas.Error("Ese cambio ya fue revisado.", 409);
            if (c.SolicitadoPorId == s.Id) return Ayudas.Error("Quien solicita un cambio no puede aprobarlo: debe hacerlo otra persona.", 409);
            var p = await db.Plcs.FirstAsync(x => x.Id == c.PlcId);
            if (decision == "aprobar" && c.VersionBase != p.VersionPrograma) return Ayudas.Error("El programa cambió desde que se hizo la solicitud. Pida que la preparen de nuevo.", 409);
            c.Estado = decision == "aprobar" ? "aprobado" : "rechazado"; c.RevisadoPor = s.Nombre; c.RevisadoPorId = s.Id; c.FechaRevision = DateTime.UtcNow; c.Comentario = e.Comentario?.Trim() ?? "";
            if (decision == "aprobar")
            {
                p.VersionPrograma++;
                var nuevo = JsonSerializer.Deserialize<JsonElement>(c.Programa);
                p.Programa = JsonSerializer.Serialize(new { version = p.VersionPrograma, variables = nuevo.TryGetProperty("variables", out var v) && v.ValueKind == JsonValueKind.Array ? v : (JsonElement?)null, peldanos = nuevo.GetProperty("peldanos") });
                c.VersionPublicada = p.VersionPrograma;
            }
            db.Auditar(s, decision == "aprobar" ? "aprobó y publicó un cambio de PLC" : "rechazó un cambio de PLC", "plc", p.Codigo, $"{c.Resumen} · solicitado por {c.SolicitadoPor}");
            await db.SaveChangesAsync();
            // planta simulada: si la versión publicada corrige un error de lógica provocado, la máquina vuelve a comportarse bien
            if (decision == "aprobar") await Simulacion.RevisarLogicaAsync(db, hub, p);
            await hub.Clients.Group("planta").SendAsync("cambioPlc", new { id = c.Id, plc = p.Codigo, estado = c.Estado, por = s.Nombre, resumen = c.Resumen, version = p.VersionPrograma });
            return Results.Ok(new { ok = true, version = p.VersionPrograma });
        });

        // ================================================================================== cierre de remuneraciones (prepara uno, aprueba otro)
        g.MapGet("/remuneraciones/cierres", async (ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("remuneraciones.ver") && !s.Tiene("remuneraciones.agregado")) return Ayudas.Sin();
            var cierres = await db.CierresRemuneraciones.AsNoTracking().OrderByDescending(c => c.Id).Take(24).ToListAsync();
            var val = await db.ValidacionesParametros.AsNoTracking().OrderByDescending(v => v.Id).Take(24).ToListAsync();
            return Results.Ok(new
            {
                cierres = cierres.Select(c => new { c.Id, c.Periodo, c.Estado, c.Personas, c.TotalHaberes, c.TotalLiquido, c.PreparadoPor, c.PreparadoPorId, c.FechaPreparacion, c.AprobadoPor, c.FechaAprobacion, c.Comentario, puedeAprobar = c.Estado == "preparado" && s.Tiene("remuneraciones.aprobar") && c.PreparadoPorId != s.Id }),
                validaciones = val.Select(v => new { v.Periodo, v.ValidadoPor, v.Fecha, v.Nota }),
                puedePreparar = s.Tiene("remuneraciones.preparar"), puedeValidar = s.Tiene("parametros.validar"),
            });
        });

        g.MapPost("/parametros/validar", async (ValidacionEntrada e, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("parametros.validar")) return Ayudas.Sin();
            if (!System.Text.RegularExpressions.Regex.IsMatch(e.Periodo ?? "", @"^\d{4}-\d{2}$")) return Ayudas.Error("Período no válido (AAAA-MM).");
            db.ValidacionesParametros.Add(new ValidacionParametros { Periodo = e.Periodo!, ValidadoPorId = s.Id, ValidadoPor = s.Nombre, Nota = e.Nota?.Trim() ?? "" });
            db.Auditar(s, "validó los parámetros legales del período", "parametros", e.Periodo!, e.Nota ?? "");
            await db.SaveChangesAsync();
            return Results.Ok(new { ok = true });
        });

        g.MapPost("/remuneraciones/{periodo}/preparar", async (string periodo, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Tiene("remuneraciones.preparar")) return Ayudas.Sin();
            if (!await db.ValidacionesParametros.AnyAsync(v => v.Periodo == periodo)) return Ayudas.Error("Los parámetros de este período aún no tienen validación formal de Finanzas: no se puede preparar la nómina.", 409);
            if (await db.CierresRemuneraciones.AnyAsync(c => c.Periodo == periodo && c.Estado != "rechazado")) return Ayudas.Error("Ese período ya tiene un cierre preparado o aprobado.", 409);
            var liqs = await Liquidador.CalcularPeriodoAsync(db, periodo);
            if (liqs.Count == 0) return Ayudas.Error("No hay asistencia cargada para ese período.", 409);
            var c = new CierreRemuneraciones { Periodo = periodo, Personas = liqs.Count, TotalHaberes = liqs.Sum(l => (long)l.TotalHaberes), TotalLiquido = liqs.Sum(l => (long)l.LiquidoAPagar), PreparadoPorId = s.Id, PreparadoPor = s.Nombre };
            db.CierresRemuneraciones.Add(c);
            db.Auditar(s, "preparó el cierre de remuneraciones", "remuneraciones", periodo, $"{c.Personas} personas · líquido {c.TotalLiquido:N0}");
            await db.SaveChangesAsync();
            return Results.Created($"/api/remuneraciones/cierres/{c.Id}", new { c.Id });
        });

        g.MapPost("/remuneraciones/cierres/{id:int}/{decision}", async (int id, string decision, RevisionCambioEntrada e, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (decision is not ("aprobar" or "rechazar")) return Ayudas.Error("Decisión no válida.", 404);
            if (!s.Tiene("remuneraciones.aprobar")) return Ayudas.Error("Aprobar el pago de remuneraciones requiere una segunda autorización de Finanzas.", 403);
            var c = await db.CierresRemuneraciones.FindAsync(id);
            if (c is null) return Ayudas.Error("No existe ese cierre.", 404);
            if (c.Estado != "preparado") return Ayudas.Error("Ese cierre ya fue revisado.", 409);
            if (c.PreparadoPorId == s.Id) return Ayudas.Error("Quien prepara la nómina no puede aprobarla.", 409);
            c.Estado = decision == "aprobar" ? "aprobado" : "rechazado"; c.AprobadoPor = s.Nombre; c.AprobadoPorId = s.Id; c.FechaAprobacion = DateTime.UtcNow; c.Comentario = e.Comentario?.Trim() ?? "";
            db.Auditar(s, decision == "aprobar" ? "aprobó el pago de remuneraciones" : "devolvió el cierre de remuneraciones", "remuneraciones", c.Periodo, c.Comentario);
            await db.SaveChangesAsync();
            return Results.Ok(new { ok = true });
        });

        // ================================================================================== bandeja de aprobaciones de quien entra
        g.MapGet("/aprobaciones", async (ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            var items = new List<object>();
            if (s.Tiene("plc.aprobar"))
            {
                var plcs = await db.Plcs.AsNoTracking().ToDictionaryAsync(p => p.Id, p => p.Codigo);
                items.AddRange((await db.CambiosPlc.AsNoTracking().Where(c => c.Estado == "pendiente" && c.SolicitadoPorId != s.Id).ToListAsync())
                    .Select(c => new { tipo = "plc", id = c.Id, titulo = $"Cambio de programa {plcs[c.PlcId]}", detalle = $"{c.Resumen} · {c.SolicitadoPor}", fecha = c.Fecha, enlace = $"/mantenimiento?cambio={c.Id}" }));
            }
            if (s.Tiene("remuneraciones.aprobar"))
                items.AddRange((await db.CierresRemuneraciones.AsNoTracking().Where(c => c.Estado == "preparado" && c.PreparadoPorId != s.Id).ToListAsync())
                    .Select(c => new { tipo = "remuneraciones", id = c.Id, titulo = $"Pago de remuneraciones {c.Periodo}", detalle = $"{c.Personas} personas · preparado por {c.PreparadoPor}", fecha = c.FechaPreparacion, enlace = "/remuneraciones?vista=cierre" }));
            if (s.Tiene("calidad.liberar"))
                items.AddRange((await db.NoConformidades.AsNoTracking().Where(n => n.Estado == "abierta" || n.Estado == "en_analisis").ToListAsync())
                    .Select(n => new { tipo = "calidad", id = n.Id, titulo = $"Lote retenido {n.Lote}", detalle = $"{n.Codigo} · {n.Producto} · {n.Severidad}", fecha = n.Fecha, enlace = "/calidad" }));
            if (s.Tiene("sst.gestionar"))
            {
                var an = await db.Areas.AsNoTracking().ToDictionaryAsync(a => a.Id, a => a.Nombre);
                items.AddRange((await db.IncidentesSst.AsNoTracking().Where(i => i.Estado == "reportado").ToListAsync())
                    .Select(i => new { tipo = "sst", id = i.Id, titulo = $"Evento por investigar {i.Codigo}", detalle = $"{i.Tipo.Replace("_", " ")} · {an.GetValueOrDefault(i.AreaId)}", fecha = i.Fecha, enlace = "/seguridad" }));
            }
            // liberaciones de equipos que esta persona puede firmar ahora (técnica, seguridad, calidad o producción)
            var porLiberar = await db.Ordenes.Where(o => o.Estado == "por_verificar").ToListAsync();
            if (porLiberar.Count > 0)
            {
                var eqs = await db.Equipos.AsNoTracking().ToDictionaryAsync(e => e.Id, e => e.Codigo);
                foreach (var o in porLiberar)
                {
                    var firmas = await Liberaciones.FirmasAsync(db, o);
                    foreach (var tipo in Liberaciones.Pendientes(o, firmas))
                        if (await Liberaciones.NoPuedeAsync(db, s, o, tipo, firmas) is null)
                            items.Add(new { tipo = "liberacion", id = o.Id, titulo = $"{Liberaciones.Titulo(tipo)} · {eqs.GetValueOrDefault(o.EquipoId)}", detalle = $"{o.Codigo} · {o.Titulo}", fecha = o.CierreSolicitado ?? o.Creada, enlace = $"/mantenimiento?orden={o.Id}", etapa = tipo });
                }
            }
            return Results.Ok(items);
        });
    }
}
