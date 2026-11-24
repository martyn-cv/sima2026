using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Sima.Api.Datos.Migraciones
{
    /// <inheritdoc />
    public partial class Operacion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Uid",
                table: "ordenes_trabajo",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "despachos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Origen = table.Column<string>(type: "text", nullable: false),
                    Destino = table.Column<string>(type: "text", nullable: false),
                    Carga = table.Column<string>(type: "text", nullable: false),
                    Vehiculo = table.Column<string>(type: "text", nullable: false),
                    Conductor = table.Column<string>(type: "text", nullable: false),
                    Estado = table.Column<string>(type: "text", nullable: false),
                    Compromiso = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Creado = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Salida = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Entrega = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_despachos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ejecuciones_rutina",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Uid = table.Column<string>(type: "text", nullable: true),
                    RutinaId = table.Column<int>(type: "integer", nullable: false),
                    EquipoId = table.Column<int>(type: "integer", nullable: false),
                    PorId = table.Column<string>(type: "text", nullable: false),
                    PorNombre = table.Column<string>(type: "text", nullable: false),
                    Fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Resultados = table.Column<string>(type: "text", nullable: false),
                    Observaciones = table.Column<string>(type: "text", nullable: false),
                    ConHallazgos = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ejecuciones_rutina", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "herramientas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Codigo = table.Column<string>(type: "text", nullable: false),
                    Nombre = table.Column<string>(type: "text", nullable: false),
                    RequiereCalibracion = table.Column<bool>(type: "boolean", nullable: false),
                    CalibracionDias = table.Column<int>(type: "integer", nullable: false),
                    ProximaCalibracion = table.Column<DateOnly>(type: "date", nullable: true),
                    Estado = table.Column<string>(type: "text", nullable: false),
                    RetiradaPorId = table.Column<string>(type: "text", nullable: true),
                    RetiradaPorNombre = table.Column<string>(type: "text", nullable: true),
                    RetiradaEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_herramientas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "movimientos_repuesto",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RepuestoId = table.Column<int>(type: "integer", nullable: false),
                    Cantidad = table.Column<int>(type: "integer", nullable: false),
                    OrdenId = table.Column<int>(type: "integer", nullable: true),
                    PorId = table.Column<string>(type: "text", nullable: false),
                    PorNombre = table.Column<string>(type: "text", nullable: false),
                    Fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Nota = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_movimientos_repuesto", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "paradas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EquipoId = table.Column<int>(type: "integer", nullable: false),
                    Inicio = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Fin = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Motivo = table.Column<string>(type: "text", nullable: false),
                    Automatica = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_paradas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "produccion_dia",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EquipoId = table.Column<int>(type: "integer", nullable: false),
                    Fecha = table.Column<DateOnly>(type: "date", nullable: false),
                    UnidadesPlan = table.Column<int>(type: "integer", nullable: false),
                    UnidadesProducidas = table.Column<int>(type: "integer", nullable: false),
                    UnidadesBuenas = table.Column<int>(type: "integer", nullable: false),
                    HorasPlan = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_produccion_dia", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "repuestos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Codigo = table.Column<string>(type: "text", nullable: false),
                    Nombre = table.Column<string>(type: "text", nullable: false),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Bodega = table.Column<string>(type: "text", nullable: false),
                    Ubicacion = table.Column<string>(type: "text", nullable: false),
                    Stock = table.Column<int>(type: "integer", nullable: false),
                    StockMinimo = table.Column<int>(type: "integer", nullable: false),
                    CostoUnitario = table.Column<int>(type: "integer", nullable: false),
                    Critico = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_repuestos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "rutinas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nombre = table.Column<string>(type: "text", nullable: false),
                    Frecuencia = table.Column<string>(type: "text", nullable: false),
                    Items = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rutinas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "traspasos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Turno = table.Column<string>(type: "text", nullable: false),
                    PorId = table.Column<string>(type: "text", nullable: false),
                    PorNombre = table.Column<string>(type: "text", nullable: false),
                    Resumen = table.Column<string>(type: "text", nullable: false),
                    Revisiones = table.Column<string>(type: "text", nullable: false),
                    Notas = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_traspasos", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ordenes_trabajo_Uid",
                table: "ordenes_trabajo",
                column: "Uid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ejecuciones_rutina_RutinaId_EquipoId_Fecha",
                table: "ejecuciones_rutina",
                columns: new[] { "RutinaId", "EquipoId", "Fecha" });

            migrationBuilder.CreateIndex(
                name: "IX_ejecuciones_rutina_Uid",
                table: "ejecuciones_rutina",
                column: "Uid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_herramientas_Codigo",
                table: "herramientas",
                column: "Codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_movimientos_repuesto_RepuestoId",
                table: "movimientos_repuesto",
                column: "RepuestoId");

            migrationBuilder.CreateIndex(
                name: "IX_paradas_EquipoId_Inicio",
                table: "paradas",
                columns: new[] { "EquipoId", "Inicio" });

            migrationBuilder.CreateIndex(
                name: "IX_produccion_dia_EquipoId_Fecha",
                table: "produccion_dia",
                columns: new[] { "EquipoId", "Fecha" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_repuestos_Codigo",
                table: "repuestos",
                column: "Codigo",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "despachos");

            migrationBuilder.DropTable(
                name: "ejecuciones_rutina");

            migrationBuilder.DropTable(
                name: "herramientas");

            migrationBuilder.DropTable(
                name: "movimientos_repuesto");

            migrationBuilder.DropTable(
                name: "paradas");

            migrationBuilder.DropTable(
                name: "produccion_dia");

            migrationBuilder.DropTable(
                name: "repuestos");

            migrationBuilder.DropTable(
                name: "rutinas");

            migrationBuilder.DropTable(
                name: "traspasos");

            migrationBuilder.DropIndex(
                name: "IX_ordenes_trabajo_Uid",
                table: "ordenes_trabajo");

            migrationBuilder.DropColumn(
                name: "Uid",
                table: "ordenes_trabajo");
        }
    }
}
