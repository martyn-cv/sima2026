using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sima.Api.Datos.Migraciones
{
    /// <inheritdoc />
    public partial class V41PlanificacionYVerificacion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CierreSolicitado",
                table: "ordenes_trabajo",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Especialidad",
                table: "ordenes_trabajo",
                type: "text",
                nullable: false,
                defaultValue: "general");

            migrationBuilder.AddColumn<DateOnly>(
                name: "Programada",
                table: "ordenes_trabajo",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Simulada",
                table: "ordenes_trabajo",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "VerificadaEn",
                table: "ordenes_trabajo",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerificadaPorId",
                table: "ordenes_trabajo",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CierreSolicitado",
                table: "ordenes_trabajo");

            migrationBuilder.DropColumn(
                name: "Especialidad",
                table: "ordenes_trabajo");

            migrationBuilder.DropColumn(
                name: "Programada",
                table: "ordenes_trabajo");

            migrationBuilder.DropColumn(
                name: "Simulada",
                table: "ordenes_trabajo");

            migrationBuilder.DropColumn(
                name: "VerificadaEn",
                table: "ordenes_trabajo");

            migrationBuilder.DropColumn(
                name: "VerificadaPorId",
                table: "ordenes_trabajo");
        }
    }
}
