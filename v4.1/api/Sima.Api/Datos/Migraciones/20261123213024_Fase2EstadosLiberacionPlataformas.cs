using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Sima.Api.Datos.Migraciones
{
    /// <inheritdoc />
    public partial class Fase2EstadosLiberacionPlataformas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // estados de equipo: del modelo de 4 estados al de 10 (operando → operativo, alarma → falla, detenido → liberado,
            // en_mantencion → en_mantenimiento), también en el historial de cambios para que los informes sean coherentes
            foreach (var (tabla, col) in new[] { ("equipos", "Estado"), ("cambios_estado_equipo", "Desde"), ("cambios_estado_equipo", "Hasta") })
                migrationBuilder.Sql($@"UPDATE {tabla} SET ""{col}"" = CASE ""{col}"" WHEN 'operando' THEN 'operativo' WHEN 'alarma' THEN 'falla' WHEN 'detenido' THEN 'liberado' WHEN 'en_mantencion' THEN 'en_mantenimiento' ELSE ""{col}"" END;");
            migrationBuilder.AddColumn<bool>(
                name: "AfectaCalidad",
                table: "ordenes_trabajo",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "AfectaSeguridad",
                table: "ordenes_trabajo",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "RondaLiberacion",
                table: "ordenes_trabajo",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "EspecElectrica",
                table: "equipos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "EspecMecanica",
                table: "equipos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Fabricante",
                table: "equipos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateOnly>(
                name: "FechaInstalacion",
                table: "equipos",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "FichaDemo",
                table: "equipos",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<double>(
                name: "HorasFuncionamiento",
                table: "equipos",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<string>(
                name: "NumeroSerie",
                table: "equipos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ResponsableMantId",
                table: "equipos",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResponsableProdId",
                table: "equipos",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cargo",
                table: "auditoria",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Motivo",
                table: "auditoria",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Plataforma",
                table: "auditoria",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ValorAnterior",
                table: "auditoria",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ValorNuevo",
                table: "auditoria",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "accesos_plataforma",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TrabajadorId = table.Column<string>(type: "text", nullable: false),
                    Plataforma = table.Column<string>(type: "text", nullable: false),
                    Habilitado = table.Column<bool>(type: "boolean", nullable: false),
                    Motivo = table.Column<string>(type: "text", nullable: false),
                    PorId = table.Column<string>(type: "text", nullable: false),
                    PorNombre = table.Column<string>(type: "text", nullable: false),
                    Fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    VersionSesion = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_accesos_plataforma", x => x.Id);
                    table.ForeignKey(
                        name: "FK_accesos_plataforma_trabajadores_TrabajadorId",
                        column: x => x.TrabajadorId,
                        principalTable: "trabajadores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "componentes_equipo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EquipoId = table.Column<int>(type: "integer", nullable: false),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Codigo = table.Column<string>(type: "text", nullable: false),
                    Nombre = table.Column<string>(type: "text", nullable: false),
                    Marca = table.Column<string>(type: "text", nullable: false),
                    Modelo = table.Column<string>(type: "text", nullable: false),
                    Especificacion = table.Column<string>(type: "text", nullable: false),
                    Demo = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_componentes_equipo", x => x.Id);
                    table.ForeignKey(
                        name: "FK_componentes_equipo_equipos_EquipoId",
                        column: x => x.EquipoId,
                        principalTable: "equipos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "notificaciones",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UsuarioId = table.Column<string>(type: "text", nullable: false),
                    Categoria = table.Column<string>(type: "text", nullable: false),
                    Origen = table.Column<string>(type: "text", nullable: false),
                    Texto = table.Column<string>(type: "text", nullable: false),
                    Destino = table.Column<string>(type: "text", nullable: true),
                    Referencia = table.Column<string>(type: "text", nullable: true),
                    Fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LeidaEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notificaciones", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "pruebas_orden",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OrdenId = table.Column<int>(type: "integer", nullable: false),
                    Uid = table.Column<string>(type: "text", nullable: true),
                    Descripcion = table.Column<string>(type: "text", nullable: false),
                    Resultado = table.Column<string>(type: "text", nullable: false),
                    Valores = table.Column<string>(type: "text", nullable: false),
                    RegistradaPorId = table.Column<string>(type: "text", nullable: false),
                    RegistradaPor = table.Column<string>(type: "text", nullable: false),
                    Fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pruebas_orden", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pruebas_orden_ordenes_trabajo_OrdenId",
                        column: x => x.OrdenId,
                        principalTable: "ordenes_trabajo",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "registros_acceso",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TrabajadorId = table.Column<string>(type: "text", nullable: true),
                    Login = table.Column<string>(type: "text", nullable: false),
                    Plataforma = table.Column<string>(type: "text", nullable: false),
                    Resultado = table.Column<string>(type: "text", nullable: false),
                    Ip = table.Column<string>(type: "text", nullable: false),
                    Agente = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_registros_acceso", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "validaciones_liberacion",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OrdenId = table.Column<int>(type: "integer", nullable: false),
                    EquipoId = table.Column<int>(type: "integer", nullable: false),
                    Ronda = table.Column<int>(type: "integer", nullable: false),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Aprobada = table.Column<bool>(type: "boolean", nullable: false),
                    Nota = table.Column<string>(type: "text", nullable: false),
                    PorId = table.Column<string>(type: "text", nullable: false),
                    PorNombre = table.Column<string>(type: "text", nullable: false),
                    PorCargo = table.Column<string>(type: "text", nullable: false),
                    Plataforma = table.Column<string>(type: "text", nullable: false),
                    Fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_validaciones_liberacion", x => x.Id);
                    table.ForeignKey(
                        name: "FK_validaciones_liberacion_equipos_EquipoId",
                        column: x => x.EquipoId,
                        principalTable: "equipos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_validaciones_liberacion_ordenes_trabajo_OrdenId",
                        column: x => x.OrdenId,
                        principalTable: "ordenes_trabajo",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_accesos_plataforma_TrabajadorId_Plataforma",
                table: "accesos_plataforma",
                columns: new[] { "TrabajadorId", "Plataforma" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_componentes_equipo_EquipoId",
                table: "componentes_equipo",
                column: "EquipoId");

            migrationBuilder.CreateIndex(
                name: "IX_notificaciones_Fecha",
                table: "notificaciones",
                column: "Fecha");

            migrationBuilder.CreateIndex(
                name: "IX_notificaciones_UsuarioId_LeidaEn",
                table: "notificaciones",
                columns: new[] { "UsuarioId", "LeidaEn" });

            migrationBuilder.CreateIndex(
                name: "IX_pruebas_orden_OrdenId",
                table: "pruebas_orden",
                column: "OrdenId");

            migrationBuilder.CreateIndex(
                name: "IX_pruebas_orden_Uid",
                table: "pruebas_orden",
                column: "Uid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_registros_acceso_Fecha",
                table: "registros_acceso",
                column: "Fecha");

            migrationBuilder.CreateIndex(
                name: "IX_registros_acceso_TrabajadorId",
                table: "registros_acceso",
                column: "TrabajadorId");

            migrationBuilder.CreateIndex(
                name: "IX_validaciones_liberacion_EquipoId",
                table: "validaciones_liberacion",
                column: "EquipoId");

            migrationBuilder.CreateIndex(
                name: "IX_validaciones_liberacion_OrdenId_Ronda_Tipo",
                table: "validaciones_liberacion",
                columns: new[] { "OrdenId", "Ronda", "Tipo" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var (tabla, col) in new[] { ("equipos", "Estado"), ("cambios_estado_equipo", "Desde"), ("cambios_estado_equipo", "Hasta") })
                migrationBuilder.Sql($@"UPDATE {tabla} SET ""{col}"" = CASE WHEN ""{col}"" IN ('operativo','operativo_obs') THEN 'operando' WHEN ""{col}"" = 'falla' THEN 'alarma' WHEN ""{col}"" IN ('liberado','fuera_servicio') THEN 'detenido' WHEN ""{col}"" IN ('en_diagnostico','en_mantenimiento','en_pruebas','pendiente_liberacion','bloqueado_seguridad') THEN 'en_mantencion' ELSE ""{col}"" END;");
            migrationBuilder.DropTable(
                name: "accesos_plataforma");

            migrationBuilder.DropTable(
                name: "componentes_equipo");

            migrationBuilder.DropTable(
                name: "notificaciones");

            migrationBuilder.DropTable(
                name: "pruebas_orden");

            migrationBuilder.DropTable(
                name: "registros_acceso");

            migrationBuilder.DropTable(
                name: "validaciones_liberacion");

            migrationBuilder.DropColumn(
                name: "AfectaCalidad",
                table: "ordenes_trabajo");

            migrationBuilder.DropColumn(
                name: "AfectaSeguridad",
                table: "ordenes_trabajo");

            migrationBuilder.DropColumn(
                name: "RondaLiberacion",
                table: "ordenes_trabajo");

            migrationBuilder.DropColumn(
                name: "EspecElectrica",
                table: "equipos");

            migrationBuilder.DropColumn(
                name: "EspecMecanica",
                table: "equipos");

            migrationBuilder.DropColumn(
                name: "Fabricante",
                table: "equipos");

            migrationBuilder.DropColumn(
                name: "FechaInstalacion",
                table: "equipos");

            migrationBuilder.DropColumn(
                name: "FichaDemo",
                table: "equipos");

            migrationBuilder.DropColumn(
                name: "HorasFuncionamiento",
                table: "equipos");

            migrationBuilder.DropColumn(
                name: "NumeroSerie",
                table: "equipos");

            migrationBuilder.DropColumn(
                name: "ResponsableMantId",
                table: "equipos");

            migrationBuilder.DropColumn(
                name: "ResponsableProdId",
                table: "equipos");

            migrationBuilder.DropColumn(
                name: "Cargo",
                table: "auditoria");

            migrationBuilder.DropColumn(
                name: "Motivo",
                table: "auditoria");

            migrationBuilder.DropColumn(
                name: "Plataforma",
                table: "auditoria");

            migrationBuilder.DropColumn(
                name: "ValorAnterior",
                table: "auditoria");

            migrationBuilder.DropColumn(
                name: "ValorNuevo",
                table: "auditoria");
        }
    }
}
