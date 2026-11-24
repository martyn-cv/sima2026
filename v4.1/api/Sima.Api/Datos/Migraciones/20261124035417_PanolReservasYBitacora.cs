using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Sima.Api.Datos.Migraciones
{
    /// <inheritdoc />
    public partial class PanolReservasYBitacora : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "bitacora_panol",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    ItemId = table.Column<int>(type: "integer", nullable: false),
                    Evento = table.Column<string>(type: "text", nullable: false),
                    Detalle = table.Column<string>(type: "text", nullable: false),
                    Cantidad = table.Column<int>(type: "integer", nullable: true),
                    StockAntes = table.Column<int>(type: "integer", nullable: true),
                    StockDespues = table.Column<int>(type: "integer", nullable: true),
                    OrdenId = table.Column<int>(type: "integer", nullable: true),
                    SolicitudId = table.Column<int>(type: "integer", nullable: true),
                    PorId = table.Column<string>(type: "text", nullable: false),
                    PorNombre = table.Column<string>(type: "text", nullable: false),
                    Fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bitacora_panol", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "entregas_turno_panol",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Turno = table.Column<string>(type: "text", nullable: false),
                    Fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EntregaId = table.Column<string>(type: "text", nullable: false),
                    EntregaNombre = table.Column<string>(type: "text", nullable: false),
                    RecibeId = table.Column<string>(type: "text", nullable: true),
                    RecibeNombre = table.Column<string>(type: "text", nullable: true),
                    RecibidaEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Pendientes = table.Column<string>(type: "text", nullable: false),
                    Observaciones = table.Column<string>(type: "text", nullable: false),
                    Estado = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_entregas_turno_panol", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "solicitudes_panol",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    ItemId = table.Column<int>(type: "integer", nullable: false),
                    Cantidad = table.Column<int>(type: "integer", nullable: false),
                    OrdenId = table.Column<int>(type: "integer", nullable: true),
                    Motivo = table.Column<string>(type: "text", nullable: false),
                    SolicitanteId = table.Column<string>(type: "text", nullable: false),
                    SolicitanteNombre = table.Column<string>(type: "text", nullable: false),
                    Estado = table.Column<string>(type: "text", nullable: false),
                    Creada = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Vigencia = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RevisadaPorId = table.Column<string>(type: "text", nullable: true),
                    RevisadaPor = table.Column<string>(type: "text", nullable: true),
                    RevisadaEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    NotaRevision = table.Column<string>(type: "text", nullable: false),
                    EntregadaEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EntregadaPor = table.Column<string>(type: "text", nullable: true),
                    CerradaEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Usada = table.Column<int>(type: "integer", nullable: false),
                    Devuelta = table.Column<int>(type: "integer", nullable: false),
                    Incompatible = table.Column<bool>(type: "boolean", nullable: false),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_solicitudes_panol", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_bitacora_panol_Tipo_ItemId",
                table: "bitacora_panol",
                columns: new[] { "Tipo", "ItemId" });

            migrationBuilder.CreateIndex(
                name: "IX_solicitudes_panol_OrdenId",
                table: "solicitudes_panol",
                column: "OrdenId");

            migrationBuilder.CreateIndex(
                name: "IX_solicitudes_panol_Tipo_ItemId_Estado",
                table: "solicitudes_panol",
                columns: new[] { "Tipo", "ItemId", "Estado" });

            // la bitácora del pañol es de solo agregar: ni la aplicación ni una consulta directa pueden editarla o borrarla
            migrationBuilder.Sql(@"
CREATE OR REPLACE FUNCTION bitacora_panol_inmutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'La bitácora del pañol no se modifica ni se borra; registre una corrección.';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_bitacora_panol_inmutable BEFORE UPDATE OR DELETE ON bitacora_panol FOR EACH ROW EXECUTE FUNCTION bitacora_panol_inmutable();");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TRIGGER IF EXISTS trg_bitacora_panol_inmutable ON bitacora_panol; DROP FUNCTION IF EXISTS bitacora_panol_inmutable();");
            migrationBuilder.DropTable(
                name: "bitacora_panol");

            migrationBuilder.DropTable(
                name: "entregas_turno_panol");

            migrationBuilder.DropTable(
                name: "solicitudes_panol");
        }
    }
}
