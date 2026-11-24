using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Sima.Api.Datos.Migraciones
{
    /// <inheritdoc />
    public partial class SimulacionFallas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ComponenteId",
                table: "intervenciones",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ComponenteTipo",
                table: "intervenciones",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TipoAccion",
                table: "intervenciones",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "escenarios_simulacion",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nombre = table.Column<string>(type: "text", nullable: false),
                    Descripcion = table.Column<string>(type: "text", nullable: false),
                    Definicion = table.Column<string>(type: "text", nullable: false),
                    Creado = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Ejecuciones = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_escenarios_simulacion", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "evaluaciones_falla",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FallaId = table.Column<int>(type: "integer", nullable: false),
                    OrdenId = table.Column<int>(type: "integer", nullable: false),
                    IntervencionId = table.Column<int>(type: "integer", nullable: true),
                    TecnicoId = table.Column<string>(type: "text", nullable: false),
                    TecnicoNombre = table.Column<string>(type: "text", nullable: false),
                    ComponenteId = table.Column<int>(type: "integer", nullable: true),
                    Componente = table.Column<string>(type: "text", nullable: false),
                    Accion = table.Column<string>(type: "text", nullable: false),
                    Repuestos = table.Column<string>(type: "text", nullable: false),
                    Diagnostico = table.Column<string>(type: "text", nullable: false),
                    ComponenteCorrecto = table.Column<bool>(type: "boolean", nullable: false),
                    AccionCorrecta = table.Column<bool>(type: "boolean", nullable: false),
                    RepuestoCorrecto = table.Column<bool>(type: "boolean", nullable: false),
                    Resuelve = table.Column<bool>(type: "boolean", nullable: false),
                    Motivo = table.Column<string>(type: "text", nullable: false),
                    Fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_evaluaciones_falla", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "fallas_simuladas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EquipoId = table.Column<int>(type: "integer", nullable: false),
                    ComponenteId = table.Column<int>(type: "integer", nullable: true),
                    ComponenteTipo = table.Column<string>(type: "text", nullable: false),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Causa = table.Column<string>(type: "text", nullable: false),
                    CausaClave = table.Column<string>(type: "text", nullable: false),
                    Sintomas = table.Column<string>(type: "text", nullable: false),
                    Criticidad = table.Column<string>(type: "text", nullable: false),
                    Modo = table.Column<string>(type: "text", nullable: false),
                    Creada = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    InicioProgramado = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Inicio = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Fin = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PeriodoSeg = table.Column<int>(type: "integer", nullable: false),
                    DuracionSeg = table.Column<int>(type: "integer", nullable: false),
                    Severidad = table.Column<double>(type: "double precision", nullable: false),
                    EstadoFisico = table.Column<string>(type: "text", nullable: false),
                    Variables = table.Column<string>(type: "text", nullable: false),
                    Impacto = table.Column<string>(type: "text", nullable: false),
                    FactorRendimiento = table.Column<double>(type: "double precision", nullable: false),
                    Especialidad = table.Column<string>(type: "text", nullable: false),
                    Acciones = table.Column<string>(type: "text", nullable: false),
                    RepuestoId = table.Column<int>(type: "integer", nullable: true),
                    RepuestoClave = table.Column<string>(type: "text", nullable: false),
                    EstadoEquipo = table.Column<string>(type: "text", nullable: false),
                    OrdenId = table.Column<int>(type: "integer", nullable: true),
                    AlarmaId = table.Column<int>(type: "integer", nullable: true),
                    Escenario = table.Column<string>(type: "text", nullable: true),
                    Datos = table.Column<string>(type: "text", nullable: false),
                    IntentosFallidos = table.Column<int>(type: "integer", nullable: false),
                    CreadaPor = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fallas_simuladas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_fallas_simuladas_equipos_EquipoId",
                        column: x => x.EquipoId,
                        principalTable: "equipos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "inspecciones_componente",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OrdenId = table.Column<int>(type: "integer", nullable: false),
                    ComponenteId = table.Column<int>(type: "integer", nullable: true),
                    ComponenteTipo = table.Column<string>(type: "text", nullable: false),
                    Componente = table.Column<string>(type: "text", nullable: false),
                    Hallazgo = table.Column<string>(type: "text", nullable: false),
                    TecnicoId = table.Column<string>(type: "text", nullable: false),
                    TecnicoNombre = table.Column<string>(type: "text", nullable: false),
                    Fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inspecciones_componente", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_evaluaciones_falla_FallaId",
                table: "evaluaciones_falla",
                column: "FallaId");

            migrationBuilder.CreateIndex(
                name: "IX_fallas_simuladas_EquipoId_EstadoFisico",
                table: "fallas_simuladas",
                columns: new[] { "EquipoId", "EstadoFisico" });

            migrationBuilder.CreateIndex(
                name: "IX_inspecciones_componente_OrdenId",
                table: "inspecciones_componente",
                column: "OrdenId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "escenarios_simulacion");

            migrationBuilder.DropTable(
                name: "evaluaciones_falla");

            migrationBuilder.DropTable(
                name: "fallas_simuladas");

            migrationBuilder.DropTable(
                name: "inspecciones_componente");

            migrationBuilder.DropColumn(
                name: "ComponenteId",
                table: "intervenciones");

            migrationBuilder.DropColumn(
                name: "ComponenteTipo",
                table: "intervenciones");

            migrationBuilder.DropColumn(
                name: "TipoAccion",
                table: "intervenciones");
        }
    }
}
