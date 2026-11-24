using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Sima.Api.Datos;
using Sima.Api.Endpoints;
using Sima.Api.Servicios;

var builder = WebApplication.CreateBuilder(args);
var cfg = builder.Configuration;

// ---- base de datos única (PostgreSQL)
builder.Services.AddDbContext<SimaDb>((sp, o) => o.UseNpgsql(sp.GetRequiredService<IConfiguration>().GetConnectionString("Sima") ?? "Host=localhost;Port=5432;Database=sima_v41;Username=sima;Password=sima"));

// ---- autenticación (token firmado + comprobación de la cuenta en cada petición)
var jwt = new OpcionesJwt { Clave = cfg["Jwt:Clave"] ?? new OpcionesJwt().Clave, HorasValidez = cfg.GetValue("Jwt:HorasValidez", 12) };
if (jwt.Clave.Length < 32) throw new InvalidOperationException("Jwt:Clave debe tener al menos 32 caracteres.");
builder.Services.AddSingleton(jwt);
builder.Services.AddSingleton<ServicioToken>();
builder.Services.AddSingleton<CifradoSecretos>();
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<GuardiaDeCuenta>();
builder.Services.AddScoped<ProcesadorTelemetria>();
builder.Services.AddScoped<IngestaEventos>();
builder.Services.AddHostedService<SimuladorInterno>();
builder.Services.AddHostedService<MotorSimulacion>();
builder.Services.AddSignalR();
builder.Services.AddAuthorization();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.MapInboundClaims = false;
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidIssuer = "sima", ValidAudience = "sima", IssuerSigningKey = new ServicioToken(jwt).LlaveFirma, ClockSkew = TimeSpan.FromSeconds(5), NameClaimType = "sub",
    };
    o.Events = new JwtBearerEvents
    {
        OnMessageReceived = ctx =>
        {
            var token = ctx.Request.Query["access_token"];
            if (!string.IsNullOrEmpty(token) && ctx.HttpContext.Request.Path.StartsWithSegments("/hubs")) ctx.Token = token;
            return Task.CompletedTask;
        },
        OnTokenValidated = async ctx =>
        {
            var u = ctx.Principal!;
            var s = u.ComoSesion();
            var pver = int.TryParse(u.FindFirst("pver")?.Value, out var pv) ? pv : 1;
            var ok = s is not null && int.TryParse(u.FindFirst("ver")?.Value, out var ver)
                     && await ctx.HttpContext.RequestServices.GetRequiredService<GuardiaDeCuenta>().EsValidaAsync(ctx.HttpContext.RequestServices.GetRequiredService<SimaDb>(), s.Id, ver, s.Canal, pver);
            if (!ok) ctx.Fail("Cuenta cerrada, suspendida o sesión revocada.");
        },
    };
});

builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    o.SerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    o.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
});

var origenes = (cfg["Cors:Origenes"] ?? "*").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
{
    if (origenes.Contains("*")) p.SetIsOriginAllowed(_ => true); else p.WithOrigins(origenes);
    p.AllowAnyHeader().AllowAnyMethod().AllowCredentials();
}));

var app = builder.Build();

// dos personas guardaron el mismo registro: la segunda recibe un 409 y debe recargar (nunca se pisa en silencio)
app.Use(async (ctx, next) =>
{
    try { await next(); }
    catch (DbUpdateConcurrencyException) when (!ctx.Response.HasStarted)
    {
        ctx.Response.StatusCode = 409;
        await ctx.Response.WriteAsJsonAsync(new { error = "Otra persona modificó este registro mientras usted trabajaba. Recargue para ver los datos actuales.", conflicto = true });
    }
});
app.UseForwardedHeaders(new ForwardedHeadersOptions { ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto });
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// cabeceras de seguridad en todas las respuestas
app.Use(async (ctx, next) =>
{
    var h = ctx.Response.Headers;
    h["X-Content-Type-Options"] = "nosniff"; h["X-Frame-Options"] = "DENY"; h["Referrer-Policy"] = "no-referrer"; h["Cross-Origin-Opener-Policy"] = "same-origin";
    if (ctx.Request.IsHttps) h["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
    await next();
});

// quien debe elegir su clave o activar el segundo factor solo puede usar los endpoints de seguridad hasta hacerlo
app.Use(async (ctx, next) =>
{
    var r = ctx.User.FindFirst("restringido")?.Value;
    var ruta = ctx.Request.Path.Value ?? "";
    if (r is not null && !(ruta.StartsWith("/api/auth/") && !ruta.EndsWith("/login")) && !ruta.StartsWith("/hubs"))
    {
        ctx.Response.StatusCode = 403;
        await ctx.Response.WriteAsJsonAsync(new { error = r == "clave" ? "Debe elegir una clave propia antes de continuar." : "Debe activar el segundo factor antes de continuar.", restringido = r });
        return;
    }
    await next();
});

app.MapGet("/salud", async (SimaDb db) => Results.Ok(new { estado = "ok", trabajadores = await db.Trabajadores.CountAsync(), equipos = await db.Equipos.CountAsync(), hora = DateTime.UtcNow }));
app.MapAuth(cfg);
app.MapPersonas();
app.MapPagos();
app.MapOrganizacion();
app.MapPlanta(cfg);
app.MapOperacion();
app.MapV4();
app.MapV41();
app.MapFase2();
app.MapSimulacion(cfg);
app.MapCalendario();
app.MapHub<PlantaHub>("/hubs/planta");

// ---- arranque automático: crea el esquema, importa el Excel y carga la planta con sus PLC
await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SimaDb>();
    var log = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Arranque");
    var espera = TimeSpan.FromSeconds(cfg.GetValue("Db:EsperaSegundos", 60));
    var fin = DateTime.UtcNow + espera;
    while (true)
    {
        try { await db.Database.MigrateAsync(); break; }
        catch (Exception ex) when (DateTime.UtcNow < fin) { log.LogWarning("Esperando a la base de datos… {Mensaje}", ex.Message); await Task.Delay(2000); }
    }
    var claveInicial = cfg["Seed:ClaveInicial"] ?? "Sima2026!";
    var cli = args.SkipWhile(a => a != "importar").Skip(1).FirstOrDefault();
    var excel = cli ?? cfg["Seed:Excel"] ?? new[] { "datos/SIMA_base_de_datos.xlsx", "../datos/SIMA_base_de_datos.xlsx", "../../datos/SIMA_base_de_datos.xlsx", "../../../datos/SIMA_base_de_datos.xlsx", "/datos/SIMA_base_de_datos.xlsx" }
        .Select(r => Path.GetFullPath(r, app.Environment.ContentRootPath)).FirstOrDefault(File.Exists);
    if (cli is not null || (cfg.GetValue("Seed:Importar", true) && !await db.Trabajadores.AnyAsync()))
    {
        if (excel is null || !File.Exists(excel)) log.LogWarning("No se encontró SIMA_base_de_datos.xlsx: la base queda vacía. Defina Seed:Excel.");
        else log.LogInformation("Excel importado ({Ruta}): {Resumen}", excel, await ImportadorExcel.ImportarAsync(db, excel, claveInicial, reemplazar: true, forzarCambioClave: cfg.GetValue("Seed:ForzarCambioClave", false)));
    }
    if (cfg.GetValue("Seed:Planta", true)) { await SemillaPlanta.CargarAsync(db); await SemillaOperacion.CargarAsync(db); await SemillaV4.CargarAsync(db); await SemillaV41.CargarAsync(db); await SemillaV41.PlanificacionAsync(db); await SemillaFase2.CargarAsync(db); }
    await Permisos.PrepararAsync(db);
    if (cli is not null) return;   // «dotnet run -- importar ruta.xlsx» importa y termina
}

app.Run();

public partial class Program;
