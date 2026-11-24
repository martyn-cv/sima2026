using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Sima.Api.Datos.Migraciones
{
    /// <inheritdoc />
    public partial class V4Operacion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "VersionPrograma",
                table: "plc",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "cambios_plc",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PlcId = table.Column<int>(type: "integer", nullable: false),
                    VersionBase = table.Column<int>(type: "integer", nullable: false),
                    Programa = table.Column<string>(type: "text", nullable: false),
                    Resumen = table.Column<string>(type: "text", nullable: false),
                    Justificacion = table.Column<string>(type: "text", nullable: false),
                    Origen = table.Column<string>(type: "text", nullable: false),
                    Estado = table.Column<string>(type: "text", nullable: false),
                    SolicitadoPorId = table.Column<string>(type: "text", nullable: false),
                    SolicitadoPor = table.Column<string>(type: "text", nullable: false),
                    Fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RevisadoPorId = table.Column<string>(type: "text", nullable: true),
                    RevisadoPor = table.Column<string>(type: "text", nullable: true),
                    FechaRevision = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Comentario = table.Column<string>(type: "text", nullable: false),
                    VersionPublicada = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cambios_plc", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cambios_plc_plc_PlcId",
                        column: x => x.PlcId,
                        principalTable: "plc",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "cierres_remuneraciones",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Periodo = table.Column<string>(type: "text", nullable: false),
                    Estado = table.Column<string>(type: "text", nullable: false),
                    Personas = table.Column<int>(type: "integer", nullable: false),
                    TotalHaberes = table.Column<long>(type: "bigint", nullable: false),
                    TotalLiquido = table.Column<long>(type: "bigint", nullable: false),
                    PreparadoPorId = table.Column<string>(type: "text", nullable: false),
                    PreparadoPor = table.Column<string>(type: "text", nullable: false),
                    FechaPreparacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AprobadoPorId = table.Column<string>(type: "text", nullable: true),
                    AprobadoPor = table.Column<string>(type: "text", nullable: true),
                    FechaAprobacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Comentario = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cierres_remuneraciones", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "incidentes_sst",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Codigo = table.Column<string>(type: "text", nullable: false),
                    Fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Zona = table.Column<string>(type: "text", nullable: false),
                    EquipoId = table.Column<int>(type: "integer", nullable: true),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Severidad = table.Column<string>(type: "text", nullable: false),
                    Descripcion = table.Column<string>(type: "text", nullable: false),
                    ControlInmediato = table.Column<string>(type: "text", nullable: false),
                    Estado = table.Column<string>(type: "text", nullable: false),
                    ReportadoPorId = table.Column<string>(type: "text", nullable: false),
                    ReportadoPor = table.Column<string>(type: "text", nullable: false),
                    Responsable = table.Column<string>(type: "text", nullable: true),
                    Cierre = table.Column<string>(type: "text", nullable: false),
                    FechaCierre = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_incidentes_sst", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "no_conformidades",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Codigo = table.Column<string>(type: "text", nullable: false),
                    Fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    OrdenId = table.Column<int>(type: "integer", nullable: true),
                    EquipoId = table.Column<int>(type: "integer", nullable: true),
                    Lote = table.Column<string>(type: "text", nullable: false),
                    Producto = table.Column<string>(type: "text", nullable: false),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Severidad = table.Column<string>(type: "text", nullable: false),
                    Descripcion = table.Column<string>(type: "text", nullable: false),
                    Cantidad = table.Column<int>(type: "integer", nullable: false),
                    Estado = table.Column<string>(type: "text", nullable: false),
                    RegistradaPorId = table.Column<string>(type: "text", nullable: false),
                    RegistradaPor = table.Column<string>(type: "text", nullable: false),
                    Analisis = table.Column<string>(type: "text", nullable: false),
                    Disposicion = table.Column<string>(type: "text", nullable: false),
                    ResueltaPor = table.Column<string>(type: "text", nullable: true),
                    FechaResolucion = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_no_conformidades", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ordenes_produccion",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Codigo = table.Column<string>(type: "text", nullable: false),
                    Producto = table.Column<string>(type: "text", nullable: false),
                    Lote = table.Column<string>(type: "text", nullable: false),
                    EquipoId = table.Column<int>(type: "integer", nullable: false),
                    Linea = table.Column<string>(type: "text", nullable: false),
                    Turno = table.Column<string>(type: "text", nullable: false),
                    Cantidad = table.Column<int>(type: "integer", nullable: false),
                    Producidas = table.Column<int>(type: "integer", nullable: false),
                    Buenas = table.Column<int>(type: "integer", nullable: false),
                    Estado = table.Column<string>(type: "text", nullable: false),
                    Creada = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Inicio = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Fin = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreadaPor = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ordenes_produccion", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ordenes_produccion_equipos_EquipoId",
                        column: x => x.EquipoId,
                        principalTable: "equipos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "rol_permisos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CargoId = table.Column<int>(type: "integer", nullable: false),
                    Capacidad = table.Column<string>(type: "text", nullable: false),
                    Alcance = table.Column<string>(type: "text", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rol_permisos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_rol_permisos_cargos_CargoId",
                        column: x => x.CargoId,
                        principalTable: "cargos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "validaciones_parametros",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Periodo = table.Column<string>(type: "text", nullable: false),
                    ValidadoPorId = table.Column<string>(type: "text", nullable: false),
                    ValidadoPor = table.Column<string>(type: "text", nullable: false),
                    Fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Nota = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_validaciones_parametros", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "registros_produccion",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OrdenId = table.Column<int>(type: "integer", nullable: false),
                    OperadorId = table.Column<string>(type: "text", nullable: false),
                    OperadorNombre = table.Column<string>(type: "text", nullable: false),
                    Fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Conformes = table.Column<int>(type: "integer", nullable: false),
                    Rechazo = table.Column<int>(type: "integer", nullable: false),
                    Motivo = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_registros_produccion", x => x.Id);
                    table.ForeignKey(
                        name: "FK_registros_produccion_ordenes_produccion_OrdenId",
                        column: x => x.OrdenId,
                        principalTable: "ordenes_produccion",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_cambios_plc_PlcId_Estado",
                table: "cambios_plc",
                columns: new[] { "PlcId", "Estado" });

            migrationBuilder.CreateIndex(
                name: "IX_cierres_remuneraciones_Periodo",
                table: "cierres_remuneraciones",
                column: "Periodo");

            migrationBuilder.CreateIndex(
                name: "IX_incidentes_sst_Codigo",
                table: "incidentes_sst",
                column: "Codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_incidentes_sst_Fecha",
                table: "incidentes_sst",
                column: "Fecha");

            migrationBuilder.CreateIndex(
                name: "IX_no_conformidades_Codigo",
                table: "no_conformidades",
                column: "Codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_no_conformidades_Estado",
                table: "no_conformidades",
                column: "Estado");

            migrationBuilder.CreateIndex(
                name: "IX_ordenes_produccion_Codigo",
                table: "ordenes_produccion",
                column: "Codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ordenes_produccion_EquipoId",
                table: "ordenes_produccion",
                column: "EquipoId");

            migrationBuilder.CreateIndex(
                name: "IX_ordenes_produccion_Estado",
                table: "ordenes_produccion",
                column: "Estado");

            migrationBuilder.CreateIndex(
                name: "IX_registros_produccion_Fecha",
                table: "registros_produccion",
                column: "Fecha");

            migrationBuilder.CreateIndex(
                name: "IX_registros_produccion_OrdenId",
                table: "registros_produccion",
                column: "OrdenId");

            migrationBuilder.CreateIndex(
                name: "IX_rol_permisos_CargoId_Capacidad",
                table: "rol_permisos",
                columns: new[] { "CargoId", "Capacidad" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_validaciones_parametros_Periodo",
                table: "validaciones_parametros",
                column: "Periodo");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "cambios_plc");

            migrationBuilder.DropTable(
                name: "cierres_remuneraciones");

            migrationBuilder.DropTable(
                name: "incidentes_sst");

            migrationBuilder.DropTable(
                name: "no_conformidades");

            migrationBuilder.DropTable(
                name: "registros_produccion");

            migrationBuilder.DropTable(
                name: "rol_permisos");

            migrationBuilder.DropTable(
                name: "validaciones_parametros");

            migrationBuilder.DropTable(
                name: "ordenes_produccion");

            migrationBuilder.DropColumn(
                name: "VersionPrograma",
                table: "plc");
        }
    }
}
