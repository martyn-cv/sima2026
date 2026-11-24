using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Sima.Api.Datos.Migraciones
{
    /// <inheritdoc />
    public partial class CalendarioYBitacora : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AsignadaPorId",
                table: "ordenes_trabajo",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "FechaLimite",
                table: "ordenes_trabajo",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HerramientasSugeridas",
                table: "ordenes_trabajo",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Instrucciones",
                table: "ordenes_trabajo",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Procedimientos",
                table: "ordenes_trabajo",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PruebasRequeridas",
                table: "ordenes_trabajo",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "RecibidaEn",
                table: "ordenes_trabajo",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RepuestosSugeridos",
                table: "ordenes_trabajo",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ResultadosEsperados",
                table: "ordenes_trabajo",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "actividades",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Area = table.Column<string>(type: "text", nullable: false),
                    Titulo = table.Column<string>(type: "text", nullable: false),
                    Descripcion = table.Column<string>(type: "text", nullable: false),
                    Inicio = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Fin = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Ubicacion = table.Column<string>(type: "text", nullable: false),
                    Prioridad = table.Column<string>(type: "text", nullable: false),
                    Estado = table.Column<string>(type: "text", nullable: false),
                    Visibilidad = table.Column<string>(type: "text", nullable: false),
                    Restricciones = table.Column<string>(type: "text", nullable: false),
                    Recursos = table.Column<string>(type: "text", nullable: false),
                    OrdenId = table.Column<int>(type: "integer", nullable: true),
                    EquipoId = table.Column<int>(type: "integer", nullable: true),
                    ResponsableId = table.Column<string>(type: "text", nullable: true),
                    CreadaPorId = table.Column<string>(type: "text", nullable: false),
                    CreadaPor = table.Column<string>(type: "text", nullable: false),
                    Creada = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Datos = table.Column<string>(type: "text", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_actividades", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "comentarios_orden",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OrdenId = table.Column<int>(type: "integer", nullable: false),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Texto = table.Column<string>(type: "text", nullable: false),
                    AutorId = table.Column<string>(type: "text", nullable: false),
                    AutorNombre = table.Column<string>(type: "text", nullable: false),
                    AutorCargo = table.Column<string>(type: "text", nullable: false),
                    Fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_comentarios_orden", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "participantes_actividad",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ActividadId = table.Column<int>(type: "integer", nullable: false),
                    TrabajadorId = table.Column<string>(type: "text", nullable: false),
                    Rol = table.Column<string>(type: "text", nullable: false),
                    Estado = table.Column<string>(type: "text", nullable: false),
                    RespondioEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Nota = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_participantes_actividad", x => x.Id);
                    table.ForeignKey(
                        name: "FK_participantes_actividad_actividades_ActividadId",
                        column: x => x.ActividadId,
                        principalTable: "actividades",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_actividades_Inicio_Fin",
                table: "actividades",
                columns: new[] { "Inicio", "Fin" });

            migrationBuilder.CreateIndex(
                name: "IX_actividades_OrdenId",
                table: "actividades",
                column: "OrdenId");

            migrationBuilder.CreateIndex(
                name: "IX_comentarios_orden_OrdenId",
                table: "comentarios_orden",
                column: "OrdenId");

            migrationBuilder.CreateIndex(
                name: "IX_participantes_actividad_ActividadId",
                table: "participantes_actividad",
                column: "ActividadId");

            migrationBuilder.CreateIndex(
                name: "IX_participantes_actividad_TrabajadorId_ActividadId",
                table: "participantes_actividad",
                columns: new[] { "TrabajadorId", "ActividadId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "comentarios_orden");

            migrationBuilder.DropTable(
                name: "participantes_actividad");

            migrationBuilder.DropTable(
                name: "actividades");

            migrationBuilder.DropColumn(
                name: "AsignadaPorId",
                table: "ordenes_trabajo");

            migrationBuilder.DropColumn(
                name: "FechaLimite",
                table: "ordenes_trabajo");

            migrationBuilder.DropColumn(
                name: "HerramientasSugeridas",
                table: "ordenes_trabajo");

            migrationBuilder.DropColumn(
                name: "Instrucciones",
                table: "ordenes_trabajo");

            migrationBuilder.DropColumn(
                name: "Procedimientos",
                table: "ordenes_trabajo");

            migrationBuilder.DropColumn(
                name: "PruebasRequeridas",
                table: "ordenes_trabajo");

            migrationBuilder.DropColumn(
                name: "RecibidaEn",
                table: "ordenes_trabajo");

            migrationBuilder.DropColumn(
                name: "RepuestosSugeridos",
                table: "ordenes_trabajo");

            migrationBuilder.DropColumn(
                name: "ResultadosEsperados",
                table: "ordenes_trabajo");
        }
    }
}
