using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sima.Api.Datos.Migraciones
{
    /// <inheritdoc />
    public partial class Seguridad : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "DebeCambiarClave",
                table: "trabajadores",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "TotpActivo",
                table: "trabajadores",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "TotpSecreto",
                table: "trabajadores",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "TotpUltimoPaso",
                table: "trabajadores",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DebeCambiarClave",
                table: "trabajadores");

            migrationBuilder.DropColumn(
                name: "TotpActivo",
                table: "trabajadores");

            migrationBuilder.DropColumn(
                name: "TotpSecreto",
                table: "trabajadores");

            migrationBuilder.DropColumn(
                name: "TotpUltimoPaso",
                table: "trabajadores");
        }
    }
}
