using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sima.Api.Datos.Migraciones
{
    /// <inheritdoc />
    public partial class EstadoEquipoQuien : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PorCargo",
                table: "cambios_estado_equipo",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PorId",
                table: "cambios_estado_equipo",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PorNombre",
                table: "cambios_estado_equipo",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PorCargo",
                table: "cambios_estado_equipo");

            migrationBuilder.DropColumn(
                name: "PorId",
                table: "cambios_estado_equipo");

            migrationBuilder.DropColumn(
                name: "PorNombre",
                table: "cambios_estado_equipo");
        }
    }
}
