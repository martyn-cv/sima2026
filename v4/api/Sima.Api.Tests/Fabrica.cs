using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Sima.Api.Datos;
using Sima.Api.Servicios;

namespace Sima.Api.Tests;

/// <summary>Levanta la API real contra una base PostgreSQL desechable, con el Excel importado.</summary>
public class Fabrica : WebApplicationFactory<Program>, IAsyncLifetime
{
    public static readonly string Excel = Buscar();
    readonly string _bd = "sima_test_" + Guid.NewGuid().ToString("N")[..8];
    static readonly string Servidor = Environment.GetEnvironmentVariable("SIMA_TEST_SERVIDOR") ?? "Host=localhost;Username=sima;Password=sima";
    public JsonSerializerOptions Json { get; } = new(JsonSerializerDefaults.Web);

    static string Buscar()
    {
        var d = new DirectoryInfo(AppContext.BaseDirectory);
        while (d is not null && !File.Exists(Path.Combine(d.FullName, "datos", "SIMA_base_de_datos.xlsx"))) d = d.Parent;
        return d is null ? throw new FileNotFoundException("No se encontró datos/SIMA_base_de_datos.xlsx") : Path.Combine(d.FullName, "datos", "SIMA_base_de_datos.xlsx");
    }

    protected override void ConfigureWebHost(IWebHostBuilder b)
    {
        b.UseEnvironment("Development");
        b.ConfigureAppConfiguration((_, c) => c.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ConnectionStrings:Sima"] = $"{Servidor};Database={_bd}", ["Seed:Excel"] = Excel, ["Simulador:Habilitado"] = "false", ["Ingesta:ApiKey"] = "clave-de-prueba", ["Logging:LogLevel:Default"] = "Warning",
        }));
    }

    public Task InitializeAsync()
    {
        Reloj.Hoy = () => new DateOnly(2026, 11, 21);        // la fecha con la que se generó el Excel
        _ = CreateClient();                                  // arranca la API: migra, importa el Excel y carga la planta
        return Task.CompletedTask;
    }

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        await using var cx = new Npgsql.NpgsqlConnection($"{Servidor};Database=postgres");
        await cx.OpenAsync();
        Npgsql.NpgsqlConnection.ClearAllPools();
        await using var cmd = new Npgsql.NpgsqlCommand($"DROP DATABASE IF EXISTS {_bd} WITH (FORCE)", cx);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<HttpClient> Entrar(string usuario, string clave, string canal)
    {
        var c = CreateClient();
        var r = await c.PostAsJsonAsync("/api/auth/login", new { correo = usuario + "@manuandina.cl", clave, canal });
        r.EnsureSuccessStatusCode();
        var j = await r.Content.ReadFromJsonAsync<JsonElement>();
        c.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", j.GetProperty("token").GetString());
        return c;
    }

    public async Task<JsonElement> Leer(HttpClient c, string url)
    {
        var r = await c.GetAsync(url);
        r.EnsureSuccessStatusCode();
        return await r.Content.ReadFromJsonAsync<JsonElement>();
    }

    public SimaDb NuevaBd() => Services.CreateScope().ServiceProvider.GetRequiredService<SimaDb>();
}

[CollectionDefinition("api")]
public class ColeccionApi : ICollectionFixture<Fabrica> { }
