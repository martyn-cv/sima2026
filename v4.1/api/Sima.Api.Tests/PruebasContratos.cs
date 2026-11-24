using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Sima.Api.Datos;
using Sima.Api.Dominio;

namespace Sima.Api.Tests;

/// <summary>Escenario F: un contrato vencido suspende la cuenta pero no la cierra; período de gracia opcional; sueldos solo a quien corresponde.</summary>
[Collection("api")]
public class PruebasContratos(Fabrica f)
{
    [Fact]
    public async Task EscenarioF_VencidoSuspendeSinCerrarYSePuedeRegularizar()
    {
        var rrhh = await f.Entrar("rrhh", "Rrhh2026", "web");
        var ger = await f.Entrar("gerencia", "Gerencia2026", "web");
        var lista = await f.Leer(rrhh, "/api/contratos");
        // un contrato vigente a plazo fijo de una persona que no usan las demás pruebas
        var usados = new HashSet<string>();
        foreach (var (u, c) in new[] { ("tecnico", "Tecnico2026"), ("operador", "Operador2026"), ("jefe.mantenimiento", "Jefemant2026"), ("panol", "Panol2026"), ("prevencion", "Prevencion2026") })
            usados.Add((await f.Leer(await f.Entrar(u, c, "app"), "/api/auth/yo")).GetProperty("id").GetString()!);
        usados.Add((await f.Leer(rrhh, "/api/auth/yo")).GetProperty("id").GetString()!);
        var c0 = lista.EnumerateArray().First(c => c.GetProperty("esActual").GetBoolean() && c.GetProperty("estado").GetString() == "VIGENTE" && c.GetProperty("tipo").GetString() == "Plazo fijo" && !usados.Contains(c.GetProperty("trabajadorId").GetString()!));
        var id = c0.GetProperty("id").GetInt32(); var tid = c0.GetProperty("trabajadorId").GetString()!;
        var original = c0.GetProperty("fechaTermino").GetString()!;
        object Cuerpo(string termino) => new { tipo = "Plazo fijo", fechaInicio = c0.GetProperty("fechaInicio").GetString(), fechaTermino = termino, sueldoBase = c0.GetProperty("sueldoBase").GetInt32(), colacion = c0.GetProperty("colacion").GetInt32(), movilizacion = c0.GetProperty("movilizacion").GetInt32(), jornadaHoras = 42 };
        var ayer = new DateOnly(2026, 11, 20).ToString("yyyy-MM-dd");      // el reloj de las pruebas está fijo en 21-11-2026
        try
        {
            Assert.True((await rrhh.PutAsJsonAsync($"/api/contratos/{id}", Cuerpo(ayer))).IsSuccessStatusCode);
            var tras = (await f.Leer(rrhh, "/api/contratos")).EnumerateArray().First(c => c.GetProperty("id").GetInt32() == id);
            Assert.Equal("VENCIDO", tras.GetProperty("estado").GetString());
            Assert.Equal("SUSPENDIDA", tras.GetProperty("cuenta").GetString());          // suspendida, no cerrada
            Assert.False(tras.GetProperty("enGracia").GetBoolean());

            // con período de gracia configurado, la cuenta sigue activa y marcada para regularizar
            using (var scope = f.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<SimaDb>();
                db.Parametros.Add(new Parametro { Clave = "contratos.dias_gracia", Valor = 3, Descripcion = "Días en que un contrato vencido mantiene la cuenta activa mientras RRHH lo regulariza" });
                await db.SaveChangesAsync();
            }
            var gracia = (await f.Leer(rrhh, "/api/contratos")).EnumerateArray().First(c => c.GetProperty("id").GetInt32() == id);
            Assert.Equal("ACTIVA", gracia.GetProperty("cuenta").GetString());
            Assert.True(gracia.GetProperty("enGracia").GetBoolean());

            // quien ve contratos sin permiso de remuneraciones no recibe sueldos
            Assert.All((await f.Leer(ger, "/api/contratos")).EnumerateArray(), c => Assert.Equal(JsonValueKind.Null, c.GetProperty("sueldoBase").ValueKind));

            // regularizar: contrato nuevo indefinido; el vencido pasa al historial y la cuenta vuelve a activa
            var nuevo = await rrhh.PostAsJsonAsync("/api/contratos", new { trabajadorId = tid, tipo = "Indefinido", fechaInicio = "2026-11-21", fechaTermino = (string?)null, sueldoBase = c0.GetProperty("sueldoBase").GetInt32(), colacion = 0, movilizacion = 0, jornadaHoras = 42 });
            Assert.Equal(HttpStatusCode.Created, nuevo.StatusCode);
            var ahora = (await f.Leer(rrhh, "/api/contratos")).EnumerateArray().Where(c => c.GetProperty("trabajadorId").GetString() == tid).ToList();
            Assert.Contains(ahora, c => c.GetProperty("esActual").GetBoolean() && c.GetProperty("estado").GetString() == "VIGENTE" && c.GetProperty("cuenta").GetString() == "ACTIVA");
            Assert.Contains(ahora, c => c.GetProperty("id").GetInt32() == id && !c.GetProperty("esActual").GetBoolean());
        }
        finally
        {
            using var scope = f.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<SimaDb>();
            await db.Parametros.Where(p => p.Clave == "contratos.dias_gracia").ExecuteDeleteAsync();
            // deja a la persona como estaba: su contrato original vuelve a ser el actual
            await db.Contratos.Where(c => c.TrabajadorId == tid && c.Id != id).ExecuteDeleteAsync();
            await db.Contratos.Where(c => c.Id == id).ExecuteUpdateAsync(x => x.SetProperty(c => c.EsActual, true).SetProperty(c => c.FechaTermino, DateOnly.Parse(original)));
        }
    }
}
