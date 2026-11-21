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
builder.Services.AddDbContext<SimaDb>((sp, o) => o.UseNpgsql(sp.GetRequiredService<IConfiguration>().GetConnectionString("Sima") ?? "Host=localhost;Port=5432;Database=sima_v3;Username=sima;Password=sima"));

// ---- autenticación (token firmado + comprobación de la cuenta en cada petición)
var jwt = new OpcionesJwt { Clave = cfg["Jwt:Clave"] ?? new OpcionesJwt().Clave, HorasValidez = cfg.GetValue("Jwt:HorasValidez", 12) };
if (jwt.Clave.Length < 32) throw new InvalidOperationException("Jwt:Clave debe tener al menos 32 caracteres.");
builder.Services.AddSingleton(jwt);
builder.Services.AddSingleton<ServicioToken>();
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<GuardiaDeCuenta>();
builder.Services.AddScoped<ProcesadorTelemetria>();
builder.Services.AddHostedService<SimuladorInterno>();
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
            var ok = s is not null && int.TryParse(u.FindFirst("ver")?.Value, out var ver)
                     && await ctx.HttpContext.RequestServices.GetRequiredService<GuardiaDeCuenta>().EsValidaAsync(ctx.HttpContext.RequestServices.GetRequiredService<SimaDb>(), s.Id, ver, s.Canal);
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
app.UseForwardedHeaders(new ForwardedHeadersOptions { ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto });
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/salud", async (SimaDb db) => Results.Ok(new { estado = "ok", trabajadores = await db.Trabajadores.CountAsync(), equipos = await db.Equipos.CountAsync(), hora = DateTime.UtcNow }));
app.MapAuth(cfg);
app.MapPersonas();
app.MapPagos();
app.MapOrganizacion();
app.MapPlanta(cfg);
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
        else log.LogInformation("Excel importado ({Ruta}): {Resumen}", excel, await ImportadorExcel.ImportarAsync(db, excel, claveInicial, reemplazar: true));
    }
    if (cfg.GetValue("Seed:Planta", true)) await SemillaPlanta.CargarAsync(db);
    if (cli is not null) return;   // «dotnet run -- importar ruta.xlsx» importa y termina
}

app.Run();

public partial class Program;
