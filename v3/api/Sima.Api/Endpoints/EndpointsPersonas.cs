using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Sima.Api.Datos;
using Sima.Api.Dominio;
using Sima.Api.Servicios;

namespace Sima.Api.Endpoints;

public record ContratoEntrada(string Tipo, DateOnly FechaInicio, DateOnly? FechaTermino, int SueldoBase, int Colacion = 0, int Movilizacion = 0, int? JornadaHoras = 42, string? Observaciones = null);
public record TrabajadorEntrada(string Rut, string Nombres, string ApellidoPaterno, string ApellidoMaterno, string Sexo, DateOnly FechaNacimiento, string? EstadoCivil, string? Nacionalidad, string? Telefono,
    string? CorreoCorporativo, string? CorreoPersonal, string? Domicilio, string? Comuna, string? Region, string? ContactoEmergencia, string? TelefonoEmergencia, string? Afp, string? SistemaSalud,
    string? Banco, string? TipoCuenta, string? NumeroCuenta, DateOnly? FechaIngreso, int CargoId, string? Turno, string? JefeDirectoId, ContratoEntrada? Contrato, string? ClaveInicial);
public record ContratoNuevoEntrada(string TrabajadorId, string Tipo, DateOnly FechaInicio, DateOnly? FechaTermino, int SueldoBase, int Colacion = 0, int Movilizacion = 0, int? JornadaHoras = 42, string? Observaciones = null);
public record TerminoEntrada(string TrabajadorId, DateOnly FechaTermino, string Causal, bool AvisoPrevio, int FiniquitoMonto, string? Observaciones);

public static class EndpointsPersonas
{
    static readonly string[] Tipos = { "Indefinido", "Plazo fijo", "Honorarios" };

    static string? Valida(Contrato c) =>
        !Tipos.Contains(c.Tipo) ? "El tipo de contrato debe ser Indefinido, Plazo fijo u Honorarios."
        : c.SueldoBase <= 0 ? "El sueldo base debe ser mayor que cero."
        : c.FechaTermino is { } f && f < c.FechaInicio ? "La fecha de término no puede ser anterior al inicio."
        : c.Tipo == "Plazo fijo" && c.FechaTermino is null ? "Un contrato a plazo fijo necesita fecha de término." : null;

    public static void MapPersonas(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api").RequireAuthorization();

        // directorio: lo ve cualquier perfil (sin datos personales, contratos ni sueldos)
        g.MapGet("/directorio", async (string? buscar, string? turno, int? cargoId, SimaDb db) =>
        {
            var est = await Reglas.CalcularTodosAsync(db);
            var q = db.Trabajadores.AsNoTracking().Include(t => t.Cargo).AsQueryable();
            if (!string.IsNullOrWhiteSpace(buscar)) { var b = buscar.ToLower(); q = q.Where(t => (t.Nombres + " " + t.ApellidoPaterno + " " + t.ApellidoMaterno).ToLower().Contains(b) || t.Cargo!.Nombre.ToLower().Contains(b)); }
            if (!string.IsNullOrEmpty(turno)) q = q.Where(t => t.Turno == turno);
            if (cargoId is not null) q = q.Where(t => t.CargoId == cargoId);
            var nombres = await db.Trabajadores.AsNoTracking().ToDictionaryAsync(t => t.Id, t => t.Nombres + " " + t.ApellidoPaterno);
            var lista = (await q.OrderBy(t => t.CargoId).ThenBy(t => t.ApellidoPaterno).ToListAsync()).Where(t => est[t.Id].EstadoLaboral == "Activo")
                .Select(t => new { t.Id, nombre = t.NombreCompleto, cargoId = t.CargoId, cargo = t.Cargo!.Nombre, familia = t.Cargo.Familia, perfil = t.Cargo.PerfilSima, t.Turno, correo = t.CorreoCorporativo, jefe = t.JefeDirectoId is null ? null : nombres.GetValueOrDefault(t.JefeDirectoId) });
            return Results.Ok(lista);
        });

        // ------------------------------------------------------------------------------------ trabajadores
        g.MapGet("/trabajadores", async (string? buscar, string? estado, int? cargoId, string? tipo, string? turno, string? familia, string? cuenta, ClaimsPrincipal u, SimaDb db) =>
        {
            if (!u.S().Puede("personal", "ver")) return Ayudas.Sin();
            var hoy = Reloj.Hoy();
            var est = await Reglas.CalcularTodosAsync(db);
            var q = db.Trabajadores.AsNoTracking().Include(t => t.Cargo).AsQueryable();
            if (!string.IsNullOrWhiteSpace(buscar))
            {
                var b = buscar.ToLower();
                q = q.Where(t => (t.Nombres + " " + t.ApellidoPaterno + " " + t.ApellidoMaterno).ToLower().Contains(b) || t.Rut.Contains(b) || t.CorreoCorporativo.ToLower().Contains(b) || t.Cargo!.Nombre.ToLower().Contains(b) || t.Id.ToLower() == b);
            }
            if (cargoId is not null) q = q.Where(t => t.CargoId == cargoId);
            if (!string.IsNullOrEmpty(turno)) q = q.Where(t => t.Turno == turno);
            if (!string.IsNullOrEmpty(familia)) q = q.Where(t => t.Cargo!.Familia == familia);
            var lista = (await q.OrderBy(t => t.Id).ToListAsync()).Select(t => (t, e: est[t.Id])).AsEnumerable();
            if (!string.IsNullOrEmpty(estado)) lista = lista.Where(x => x.e.EstadoLaboral == estado);
            if (!string.IsNullOrEmpty(cuenta)) lista = lista.Where(x => x.e.EstadoCuenta.StartsWith(cuenta.ToUpper()));
            if (!string.IsNullOrEmpty(tipo)) lista = lista.Where(x => x.e.Actual?.Tipo == tipo);
            return Results.Ok(lista.Select(x => Ayudas.Resumen(x.t, x.e, hoy)).ToList());
        });

        g.MapGet("/trabajadores/{id}", async (string id, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Puede("personal", "ver")) return Ayudas.Sin();
            var t = await db.Trabajadores.AsNoTracking().Include(x => x.Cargo).FirstOrDefaultAsync(x => x.Id == id);
            if (t is null) return Ayudas.Error("No existe ese trabajador.", 404);
            var hoy = Reloj.Hoy();
            var e = await Reglas.CalcularUnoAsync(db, id);
            var contratos = await db.Contratos.AsNoTracking().Where(c => c.TrabajadorId == id).OrderByDescending(c => c.FechaInicio).ToListAsync();
            var terminos = await db.Terminos.AsNoTracking().Where(x => x.TrabajadorId == id).ToListAsync();
            var jefe = t.JefeDirectoId is null ? null : await db.Trabajadores.AsNoTracking().Where(x => x.Id == t.JefeDirectoId).Select(x => new { x.Id, nombre = x.Nombres + " " + x.ApellidoPaterno + " " + x.ApellidoMaterno }).FirstOrDefaultAsync();
            var equipo = await db.Trabajadores.AsNoTracking().Where(x => x.JefeDirectoId == id).Select(x => new { x.Id, nombre = x.Nombres + " " + x.ApellidoPaterno + " " + x.ApellidoMaterno, cargo = x.Cargo!.Nombre }).ToListAsync();
            var habil = (await db.Habilitaciones.AsNoTracking().Where(x => x.TrabajadorId == id).ToListAsync()).Select(h => new { h.Id, h.Nombre, h.FechaObtencion, h.VigenciaMeses, vence = h.Vencimiento, estado = h.Vencimiento < hoy ? "VENCIDA" : "VIGENTE" });
            return Results.Ok(new
            {
                resumen = Ayudas.Resumen(t, e, hoy),
                personal = new { t.Rut, t.Nombres, t.ApellidoPaterno, t.ApellidoMaterno, t.Sexo, t.FechaNacimiento, t.EstadoCivil, t.Nacionalidad, t.Telefono, t.CorreoCorporativo, t.CorreoPersonal, t.Domicilio, t.Comuna, t.Region, t.ContactoEmergencia, t.TelefonoEmergencia, t.Afp, t.SistemaSalud, t.Banco, t.TipoCuenta, t.NumeroCuenta, t.FechaIngreso, t.Turno },
                cargo = t.Cargo, jefe, equipo,
                contratos = contratos.Select(c => new { c.Id, c.Codigo, c.Tipo, c.EsActual, c.FechaInicio, c.FechaTermino, c.JornadaHoras, c.SueldoBase, c.Colacion, c.Movilizacion, c.Observaciones, estado = Reglas.EstadoContrato(e.EstadoLaboral == "Desvinculado", c, hoy) }),
                terminos, habilitaciones = habil,
                cuenta = new { login = t.CorreoCorporativo, alias = t.LoginAlias, t.UltimoAcceso, estado = e.EstadoCuenta, accesoWeb = e.Activa && t.Cargo!.Canal == "web", accesoApp = e.Activa && t.Cargo!.Canal == "app", bloqueada = t.BloqueadoHasta > DateTime.UtcNow },
            });
        });

        g.MapPost("/trabajadores", async (TrabajadorEntrada e, ClaimsPrincipal u, SimaDb db, IConfiguration cfg) =>
        {
            var s = u.S();
            if (!s.Puede("personal", "editar")) return Ayudas.Sin();
            if (!Ayudas.RutValido(e.Rut)) return Ayudas.Error("El RUT no es válido.");
            var rut = e.Rut.Replace(".", "").ToUpperInvariant();
            rut = rut.Contains('-') ? rut : rut[..^1] + "-" + rut[^1];
            var n = int.Parse(rut.Split('-')[0]);
            rut = $"{n:N0}".Replace(",", ".") + "-" + rut.Split('-')[1];
            if (await db.Trabajadores.AnyAsync(t => t.Rut == rut)) return Ayudas.Error("Ya existe un trabajador con ese RUT.", 409);
            if (await db.Cargos.FindAsync(e.CargoId) is null) return Ayudas.Error("El cargo no existe.");
            if (e.Contrato is null) return Ayudas.Error("Debe indicar el contrato inicial.");
            var correo = (e.CorreoCorporativo ?? $"{Normaliza(e.Nombres.Split(' ')[0])}.{Normaliza(e.ApellidoPaterno)}@manuandina.cl").ToLowerInvariant();
            if (await db.Trabajadores.AnyAsync(t => t.CorreoCorporativo == correo || t.LoginAlias == correo)) return Ayudas.Error("Ya existe una cuenta con ese correo corporativo.", 409);
            var sig = (await db.Trabajadores.Select(t => t.Id).ToListAsync()).Select(i => int.TryParse(i[1..], out var k) ? k : 0).DefaultIfEmpty(0).Max() + 1;
            var clave = string.IsNullOrWhiteSpace(e.ClaveInicial) ? cfg["Seed:ClaveInicial"] ?? "Sima2026!" : e.ClaveInicial;
            var t = new Trabajador
            {
                Id = $"T{sig:000}", Rut = rut, Nombres = e.Nombres.Trim(), ApellidoPaterno = e.ApellidoPaterno.Trim(), ApellidoMaterno = e.ApellidoMaterno.Trim(), Sexo = e.Sexo, FechaNacimiento = e.FechaNacimiento,
                EstadoCivil = e.EstadoCivil ?? "", Nacionalidad = e.Nacionalidad ?? "Chilena", Telefono = e.Telefono ?? "", CorreoCorporativo = correo, CorreoPersonal = e.CorreoPersonal ?? "", Domicilio = e.Domicilio ?? "",
                Comuna = e.Comuna ?? "", Region = e.Region ?? "Metropolitana de Santiago", ContactoEmergencia = e.ContactoEmergencia ?? "", TelefonoEmergencia = e.TelefonoEmergencia ?? "", Afp = e.Afp ?? "", SistemaSalud = e.SistemaSalud ?? "Fonasa",
                Banco = e.Banco ?? "", TipoCuenta = e.TipoCuenta ?? "", NumeroCuenta = e.NumeroCuenta ?? "", FechaIngreso = e.FechaIngreso ?? e.Contrato.FechaInicio, CargoId = e.CargoId, Turno = e.Turno ?? "D",
                JefeDirectoId = string.IsNullOrEmpty(e.JefeDirectoId) ? null : e.JefeDirectoId, PasswordHash = Claves.Hash(clave),
            };
            var c = new Contrato { TrabajadorId = t.Id, Tipo = e.Contrato.Tipo, EsActual = true, FechaInicio = e.Contrato.FechaInicio, FechaTermino = e.Contrato.FechaTermino, SueldoBase = e.Contrato.SueldoBase, Colacion = e.Contrato.Colacion, Movilizacion = e.Contrato.Movilizacion, JornadaHoras = e.Contrato.Tipo == "Honorarios" ? null : e.Contrato.JornadaHoras, Observaciones = e.Contrato.Observaciones ?? "" };
            if (Valida(c) is { } err) return Ayudas.Error(err);
            db.Trabajadores.Add(t); db.Contratos.Add(c);
            db.Auditar(s, "creó al trabajador y su cuenta", "trabajador", t.Id, $"{t.NombreCompleto} · cargo {e.CargoId} · {c.Tipo}");
            await db.SaveChangesAsync();
            return Results.Created($"/api/trabajadores/{t.Id}", new { t.Id, login = correo });
        });

        g.MapPut("/trabajadores/{id}", async (string id, TrabajadorEntrada e, ClaimsPrincipal u, SimaDb db, GuardiaDeCuenta guardia) =>
        {
            var s = u.S();
            if (!s.Puede("personal", "editar")) return Ayudas.Sin();
            var t = await db.Trabajadores.FirstOrDefaultAsync(x => x.Id == id);
            if (t is null) return Ayudas.Error("No existe ese trabajador.", 404);
            if (e.JefeDirectoId == id) return Ayudas.Error("Una persona no puede ser su propio jefe.");
            if (!string.IsNullOrEmpty(e.JefeDirectoId) && (await Ayudas.EquipoDeAsync(db, id)).Contains(e.JefeDirectoId)) return Ayudas.Error("El jefe elegido depende de esta persona.");
            if (await db.Cargos.FindAsync(e.CargoId) is null) return Ayudas.Error("El cargo no existe.");
            var cambioCargo = t.CargoId != e.CargoId;
            t.Nombres = e.Nombres.Trim(); t.ApellidoPaterno = e.ApellidoPaterno.Trim(); t.ApellidoMaterno = e.ApellidoMaterno.Trim(); t.Sexo = e.Sexo; t.FechaNacimiento = e.FechaNacimiento;
            t.EstadoCivil = e.EstadoCivil ?? t.EstadoCivil; t.Nacionalidad = e.Nacionalidad ?? t.Nacionalidad; t.Telefono = e.Telefono ?? t.Telefono; t.CorreoPersonal = e.CorreoPersonal ?? t.CorreoPersonal;
            t.Domicilio = e.Domicilio ?? t.Domicilio; t.Comuna = e.Comuna ?? t.Comuna; t.Region = e.Region ?? t.Region; t.ContactoEmergencia = e.ContactoEmergencia ?? t.ContactoEmergencia;
            t.TelefonoEmergencia = e.TelefonoEmergencia ?? t.TelefonoEmergencia; t.Afp = e.Afp ?? t.Afp; t.SistemaSalud = e.SistemaSalud ?? t.SistemaSalud; t.Banco = e.Banco ?? t.Banco;
            t.TipoCuenta = e.TipoCuenta ?? t.TipoCuenta; t.NumeroCuenta = e.NumeroCuenta ?? t.NumeroCuenta; t.CargoId = e.CargoId; t.Turno = e.Turno ?? t.Turno;
            t.JefeDirectoId = string.IsNullOrEmpty(e.JefeDirectoId) ? null : e.JefeDirectoId;
            if (cambioCargo) t.VersionSesion++;     // el perfil cambió: las sesiones abiertas deben volver a iniciar
            db.Auditar(s, cambioCargo ? "actualizó datos y cambió el cargo" : "actualizó datos", "trabajador", id, t.NombreCompleto);
            await db.SaveChangesAsync();
            guardia.Olvidar(id);
            return Results.Ok(new { ok = true });
        });

        // ------------------------------------------------------------------------------------ contratos
        g.MapGet("/contratos", async (string? estado, string? tipo, bool? soloActuales, ClaimsPrincipal u, SimaDb db) =>
        {
            if (!u.S().Puede("contratos", "ver")) return Ayudas.Sin();
            var hoy = Reloj.Hoy();
            var est = await Reglas.CalcularTodosAsync(db);
            var nombres = await db.Trabajadores.AsNoTracking().Include(t => t.Cargo).ToDictionaryAsync(t => t.Id);
            var q = db.Contratos.AsNoTracking().AsQueryable();
            if (soloActuales == true) q = q.Where(c => c.EsActual);
            if (!string.IsNullOrEmpty(tipo)) q = q.Where(c => c.Tipo == tipo);
            var lista = (await q.OrderBy(c => c.FechaTermino == null).ThenBy(c => c.FechaTermino).ToListAsync())
                .Select(c => new { c.Id, c.Codigo, c.TrabajadorId, trabajador = nombres[c.TrabajadorId].NombreCompleto, cargo = nombres[c.TrabajadorId].Cargo!.Nombre, c.Tipo, c.EsActual, c.FechaInicio, c.FechaTermino, c.JornadaHoras, c.SueldoBase, c.Colacion, c.Movilizacion,
                    estado = Reglas.EstadoContrato(est[c.TrabajadorId].EstadoLaboral == "Desvinculado", c, hoy), diasParaVencer = c.EsActual && c.FechaTermino is { } f && est[c.TrabajadorId].EstadoLaboral == "Activo" ? f.DayNumber - hoy.DayNumber : (int?)null });
            return Results.Ok(string.IsNullOrEmpty(estado) ? lista : lista.Where(x => x.estado == estado));
        });

        g.MapPost("/contratos", async (ContratoNuevoEntrada e, ClaimsPrincipal u, SimaDb db, GuardiaDeCuenta guardia) =>
        {
            var s = u.S();
            if (!s.Puede("contratos", "editar")) return Ayudas.Sin();
            if (!await db.Trabajadores.AnyAsync(t => t.Id == e.TrabajadorId)) return Ayudas.Error("No existe ese trabajador.", 404);
            if ((await Reglas.CalcularUnoAsync(db, e.TrabajadorId)).EstadoLaboral == "Desvinculado") return Ayudas.Error("El trabajador está desvinculado: no se puede crear un contrato nuevo. Si vuelve a la empresa, revierta primero la desvinculación.", 409);
            var c = new Contrato { TrabajadorId = e.TrabajadorId, Tipo = e.Tipo, EsActual = true, FechaInicio = e.FechaInicio, FechaTermino = e.FechaTermino, SueldoBase = e.SueldoBase, Colacion = e.Colacion, Movilizacion = e.Movilizacion, JornadaHoras = e.Tipo == "Honorarios" ? null : e.JornadaHoras, Observaciones = e.Observaciones ?? "" };
            if (Valida(c) is { } err) return Ayudas.Error(err);
            foreach (var anterior in await db.Contratos.Where(x => x.TrabajadorId == e.TrabajadorId && x.EsActual).ToListAsync()) { anterior.EsActual = false; anterior.Observaciones = string.IsNullOrEmpty(anterior.Observaciones) ? "Reemplazado por un contrato nuevo" : anterior.Observaciones; }
            db.Contratos.Add(c);
            db.Auditar(s, "registró un contrato nuevo (renovación o cambio)", "contrato", e.TrabajadorId, $"{c.Tipo} desde {c.FechaInicio} hasta {c.FechaTermino?.ToString() ?? "indefinido"} · sueldo {c.SueldoBase:N0}");
            await db.SaveChangesAsync();
            guardia.Olvidar(e.TrabajadorId);
            return Results.Created($"/api/contratos/{c.Id}", new { c.Id, c.Codigo });
        });

        g.MapPut("/contratos/{id:int}", async (int id, ContratoEntrada e, ClaimsPrincipal u, SimaDb db, GuardiaDeCuenta guardia) =>
        {
            var s = u.S();
            if (!s.Puede("contratos", "editar")) return Ayudas.Sin();
            var c = await db.Contratos.FindAsync(id);
            if (c is null) return Ayudas.Error("No existe ese contrato.", 404);
            c.Tipo = e.Tipo; c.FechaInicio = e.FechaInicio; c.FechaTermino = e.FechaTermino; c.SueldoBase = e.SueldoBase; c.Colacion = e.Colacion; c.Movilizacion = e.Movilizacion; c.JornadaHoras = e.Tipo == "Honorarios" ? null : e.JornadaHoras; c.Observaciones = e.Observaciones ?? c.Observaciones;
            if (Valida(c) is { } err) return Ayudas.Error(err);
            db.Auditar(s, "modificó un contrato", "contrato", c.TrabajadorId, $"{c.Codigo}: {c.Tipo}, sueldo {c.SueldoBase:N0}, término {c.FechaTermino?.ToString() ?? "indefinido"}");
            await db.SaveChangesAsync();
            guardia.Olvidar(c.TrabajadorId);
            return Results.Ok(new { ok = true });
        });

        // ------------------------------------------------------------------------------------ desvinculaciones
        g.MapGet("/terminos", async (ClaimsPrincipal u, SimaDb db) =>
        {
            if (!u.S().Puede("terminos", "ver")) return Ayudas.Sin();
            var nombres = await db.Trabajadores.AsNoTracking().Include(t => t.Cargo).ToDictionaryAsync(t => t.Id);
            return Results.Ok((await db.Terminos.AsNoTracking().OrderByDescending(x => x.FechaTermino).ToListAsync())
                .Select(x => new { x.Id, x.TrabajadorId, trabajador = nombres[x.TrabajadorId].NombreCompleto, cargo = nombres[x.TrabajadorId].Cargo!.Nombre, x.FechaTermino, x.Causal, x.AvisoPrevio, x.FiniquitoMonto, x.Observaciones,
                    responsable = x.ResponsableId is null ? null : nombres.GetValueOrDefault(x.ResponsableId)?.NombreCompleto }));
        });

        g.MapPost("/terminos", async (TerminoEntrada e, ClaimsPrincipal u, SimaDb db, GuardiaDeCuenta guardia, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (!s.Puede("terminos", "editar")) return Ayudas.Sin();
            var t = await db.Trabajadores.FirstOrDefaultAsync(x => x.Id == e.TrabajadorId);
            if (t is null) return Ayudas.Error("No existe ese trabajador.", 404);
            if (t.Id == s.Id) return Ayudas.Error("No puede desvincularse a sí mismo.", 409);
            if (await db.Terminos.AnyAsync(x => x.TrabajadorId == t.Id)) return Ayudas.Error("Este trabajador ya tiene una desvinculación registrada.", 409);
            if (string.IsNullOrWhiteSpace(e.Causal)) return Ayudas.Error("Indique la causal de término.");
            db.Terminos.Add(new TerminoContrato { TrabajadorId = t.Id, FechaTermino = e.FechaTermino, Causal = e.Causal, AvisoPrevio = e.AvisoPrevio, FiniquitoMonto = e.FiniquitoMonto, ResponsableId = s.Id, Observaciones = e.Observaciones ?? "" });
            t.VersionSesion++;                       // revoca las sesiones abiertas (web y app)
            db.Auditar(s, "registró una desvinculación", "trabajador", t.Id, $"{t.NombreCompleto} · {e.Causal} · término {e.FechaTermino}");
            await db.SaveChangesAsync();
            guardia.Olvidar(t.Id);
            var est = await Reglas.CalcularUnoAsync(db, t.Id);
            if (est.EstadoCuenta == "CERRADA") await hub.Clients.Group($"u:{t.Id}").SendAsync("cuentaCerrada", new { motivo = "Su cuenta fue cerrada por término de contrato." });
            return Results.Ok(new { estadoLaboral = est.EstadoLaboral, estadoCuenta = est.EstadoCuenta });
        });

        g.MapDelete("/terminos/{id:int}", async (int id, ClaimsPrincipal u, SimaDb db, GuardiaDeCuenta guardia) =>
        {
            var s = u.S();
            if (!s.Puede("terminos", "editar")) return Ayudas.Sin();
            var x = await db.Terminos.FindAsync(id);
            if (x is null) return Ayudas.Error("No existe ese registro.", 404);
            db.Terminos.Remove(x);
            db.Auditar(s, "revirtió una desvinculación (corrección o reincorporación)", "trabajador", x.TrabajadorId);
            await db.SaveChangesAsync();
            guardia.Olvidar(x.TrabajadorId);
            return Results.Ok(new { ok = true });
        });

        // ------------------------------------------------------------------------------------ cuentas
        g.MapGet("/cuentas", async (string? estado, ClaimsPrincipal u, SimaDb db) =>
        {
            if (!u.S().Puede("cuentas", "ver")) return Ayudas.Sin();
            var est = await Reglas.CalcularTodosAsync(db);
            var lista = (await db.Trabajadores.AsNoTracking().Include(t => t.Cargo).OrderBy(t => t.Id).ToListAsync()).Select(t => new
            {
                t.Id, nombre = t.NombreCompleto, login = t.CorreoCorporativo, alias = t.LoginAlias, cargo = t.Cargo!.Nombre, perfil = t.Cargo.PerfilSima, canal = t.Cargo.Canal, t.Turno,
                estadoLaboral = est[t.Id].EstadoLaboral, estadoContrato = est[t.Id].EstadoContrato, estadoCuenta = est[t.Id].EstadoCuenta, accesoWeb = est[t.Id].Activa && t.Cargo.Canal == "web", accesoApp = est[t.Id].Activa && t.Cargo.Canal == "app",
                t.UltimoAcceso, bloqueada = t.BloqueadoHasta > DateTime.UtcNow,
            });
            return Results.Ok(string.IsNullOrEmpty(estado) ? lista : lista.Where(x => x.estadoCuenta.StartsWith(estado.ToUpper())));
        });

        g.MapPost("/cuentas/{id}/restablecer-clave", async (string id, ClaimsPrincipal u, SimaDb db, GuardiaDeCuenta guardia) =>
        {
            var s = u.S();
            if (!s.Puede("cuentas", "editar")) return Ayudas.Sin();
            var t = await db.Trabajadores.FirstOrDefaultAsync(x => x.Id == id);
            if (t is null) return Ayudas.Error("No existe ese trabajador.", 404);
            const string alfabeto = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            var temporal = new string(Enumerable.Range(0, 10).Select(_ => alfabeto[System.Security.Cryptography.RandomNumberGenerator.GetInt32(alfabeto.Length)]).ToArray());
            t.PasswordHash = Claves.Hash(temporal); t.VersionSesion++; t.IntentosFallidos = 0; t.BloqueadoHasta = null;
            db.Auditar(s, "restableció la clave", "cuenta", id, t.NombreCompleto);
            await db.SaveChangesAsync();
            guardia.Olvidar(id);
            return Results.Ok(new { claveTemporal = temporal });
        });

        g.MapPost("/cuentas/{id}/cerrar-sesiones", async (string id, ClaimsPrincipal u, SimaDb db, GuardiaDeCuenta guardia, IHubContext<PlantaHub> hub) =>
        {
            var s = u.S();
            if (!s.Puede("cuentas", "editar")) return Ayudas.Sin();
            var t = await db.Trabajadores.FirstOrDefaultAsync(x => x.Id == id);
            if (t is null) return Ayudas.Error("No existe ese trabajador.", 404);
            t.VersionSesion++;
            db.Auditar(s, "cerró las sesiones abiertas", "cuenta", id, t.NombreCompleto);
            await db.SaveChangesAsync();
            guardia.Olvidar(id);
            await hub.Clients.Group($"u:{id}").SendAsync("cuentaCerrada", new { motivo = "Sus sesiones fueron cerradas por un administrador." });
            return Results.Ok(new { ok = true });
        });

        g.MapPost("/cuentas/{id}/desbloquear", async (string id, ClaimsPrincipal u, SimaDb db) =>
        {
            var s = u.S();
            if (!s.Puede("cuentas", "editar")) return Ayudas.Sin();
            var t = await db.Trabajadores.FirstOrDefaultAsync(x => x.Id == id);
            if (t is null) return Ayudas.Error("No existe ese trabajador.", 404);
            t.IntentosFallidos = 0; t.BloqueadoHasta = null;
            db.Auditar(s, "desbloqueó la cuenta", "cuenta", id, t.NombreCompleto);
            await db.SaveChangesAsync();
            return Results.Ok(new { ok = true });
        });
    }

    static string Normaliza(string s) => new string(s.Normalize(System.Text.NormalizationForm.FormD).Where(c => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.NonSpacingMark && char.IsLetter(c)).ToArray()).ToLowerInvariant();
}
