using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Sima.Api.Datos.Migraciones
{
    /// <inheritdoc />
    public partial class V41Integracion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ordenes_produccion_equipos_EquipoId",
                table: "ordenes_produccion");

            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                table: "repuestos",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);

            migrationBuilder.AddColumn<string>(
                name: "Origen",
                table: "plc",
                type: "text",
                nullable: false,
                defaultValue: "simulado");

            migrationBuilder.AddColumn<int>(
                name: "AreaId",
                table: "plc",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Tipo",
                table: "ordenes_trabajo",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                table: "ordenes_trabajo",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);

            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                table: "ordenes_produccion",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);

            migrationBuilder.AddColumn<int>(
                name: "IntervencionId",
                table: "movimientos_repuesto",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AreaId",
                table: "incidentes_sst",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "LineaId",
                table: "equipos",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ModeloSimulacion",
                table: "equipos",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                table: "equipos",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);

            migrationBuilder.AddColumn<bool>(
                name: "Simulado",
                table: "alarmas",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "cambios_estado_equipo",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EquipoId = table.Column<int>(type: "integer", nullable: false),
                    Ts = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Desde = table.Column<string>(type: "text", nullable: false),
                    Hasta = table.Column<string>(type: "text", nullable: false),
                    Origen = table.Column<string>(type: "text", nullable: false),
                    Simulado = table.Column<bool>(type: "boolean", nullable: false),
                    Causa = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cambios_estado_equipo", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cambios_estado_equipo_equipos_EquipoId",
                        column: x => x.EquipoId,
                        principalTable: "equipos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "documentos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EquipoId = table.Column<int>(type: "integer", nullable: true),
                    TipoEquipo = table.Column<string>(type: "text", nullable: false),
                    Titulo = table.Column<string>(type: "text", nullable: false),
                    Clase = table.Column<string>(type: "text", nullable: false),
                    Version = table.Column<string>(type: "text", nullable: false),
                    Contenido = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_documentos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_documentos_equipos_EquipoId",
                        column: x => x.EquipoId,
                        principalTable: "equipos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "equipo_repuestos",
                columns: table => new
                {
                    EquipoId = table.Column<int>(type: "integer", nullable: false),
                    RepuestoId = table.Column<int>(type: "integer", nullable: false),
                    CantidadSugerida = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_equipo_repuestos", x => new { x.EquipoId, x.RepuestoId });
                    table.ForeignKey(
                        name: "FK_equipo_repuestos_equipos_EquipoId",
                        column: x => x.EquipoId,
                        principalTable: "equipos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_equipo_repuestos_repuestos_RepuestoId",
                        column: x => x.RepuestoId,
                        principalTable: "repuestos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "eventos_planta",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Uid = table.Column<string>(type: "text", nullable: false),
                    Ts = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Recibido = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Origen = table.Column<string>(type: "text", nullable: false),
                    Simulado = table.Column<bool>(type: "boolean", nullable: false),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Nivel = table.Column<string>(type: "text", nullable: false),
                    EquipoId = table.Column<int>(type: "integer", nullable: true),
                    PlcId = table.Column<int>(type: "integer", nullable: true),
                    Mensaje = table.Column<string>(type: "text", nullable: false),
                    Datos = table.Column<string>(type: "jsonb", nullable: false),
                    UsuarioId = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_eventos_planta", x => x.Id);
                    table.ForeignKey(
                        name: "FK_eventos_planta_equipos_EquipoId",
                        column: x => x.EquipoId,
                        principalTable: "equipos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_eventos_planta_plc_PlcId",
                        column: x => x.PlcId,
                        principalTable: "plc",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "intervenciones",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Uid = table.Column<string>(type: "text", nullable: true),
                    OrdenId = table.Column<int>(type: "integer", nullable: false),
                    TecnicoId = table.Column<string>(type: "text", nullable: false),
                    TecnicoNombre = table.Column<string>(type: "text", nullable: false),
                    Inicio = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Fin = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Causa = table.Column<string>(type: "text", nullable: false),
                    Diagnostico = table.Column<string>(type: "text", nullable: false),
                    Accion = table.Column<string>(type: "text", nullable: false),
                    Resultado = table.Column<string>(type: "text", nullable: false),
                    Observaciones = table.Column<string>(type: "text", nullable: false),
                    Registrada = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_intervenciones", x => x.Id);
                    table.ForeignKey(
                        name: "FK_intervenciones_ordenes_trabajo_OrdenId",
                        column: x => x.OrdenId,
                        principalTable: "ordenes_trabajo",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_intervenciones_trabajadores_TecnicoId",
                        column: x => x.TecnicoId,
                        principalTable: "trabajadores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "plantas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Codigo = table.Column<string>(type: "text", nullable: false),
                    Nombre = table.Column<string>(type: "text", nullable: false),
                    Ciudad = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_plantas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "intervencion_herramientas",
                columns: table => new
                {
                    IntervencionId = table.Column<int>(type: "integer", nullable: false),
                    HerramientaId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_intervencion_herramientas", x => new { x.IntervencionId, x.HerramientaId });
                    table.ForeignKey(
                        name: "FK_intervencion_herramientas_herramientas_HerramientaId",
                        column: x => x.HerramientaId,
                        principalTable: "herramientas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_intervencion_herramientas_intervenciones_IntervencionId",
                        column: x => x.IntervencionId,
                        principalTable: "intervenciones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "areas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PlantaId = table.Column<int>(type: "integer", nullable: false),
                    Codigo = table.Column<string>(type: "text", nullable: false),
                    Nombre = table.Column<string>(type: "text", nullable: false),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Orden = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_areas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_areas_plantas_PlantaId",
                        column: x => x.PlantaId,
                        principalTable: "plantas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lineas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AreaId = table.Column<int>(type: "integer", nullable: false),
                    Codigo = table.Column<string>(type: "text", nullable: false),
                    Nombre = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lineas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_lineas_areas_AreaId",
                        column: x => x.AreaId,
                        principalTable: "areas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.AddCheckConstraint(
                name: "ck_repuestos_stock",
                table: "repuestos",
                sql: "\"Stock\" >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_plc_AreaId",
                table: "plc",
                column: "AreaId");

            migrationBuilder.CreateIndex(
                name: "IX_ordenes_trabajo_EquipoId_Estado",
                table: "ordenes_trabajo",
                columns: new[] { "EquipoId", "Estado" });

            migrationBuilder.CreateIndex(
                name: "IX_movimientos_repuesto_IntervencionId",
                table: "movimientos_repuesto",
                column: "IntervencionId");

            migrationBuilder.CreateIndex(
                name: "IX_movimientos_repuesto_OrdenId",
                table: "movimientos_repuesto",
                column: "OrdenId");

            migrationBuilder.CreateIndex(
                name: "IX_incidentes_sst_AreaId",
                table: "incidentes_sst",
                column: "AreaId");

            migrationBuilder.CreateIndex(
                name: "IX_incidentes_sst_EquipoId",
                table: "incidentes_sst",
                column: "EquipoId");

            migrationBuilder.CreateIndex(
                name: "IX_equipos_LineaId",
                table: "equipos",
                column: "LineaId");

            migrationBuilder.CreateIndex(
                name: "IX_areas_PlantaId_Codigo",
                table: "areas",
                columns: new[] { "PlantaId", "Codigo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_cambios_estado_equipo_EquipoId_Ts",
                table: "cambios_estado_equipo",
                columns: new[] { "EquipoId", "Ts" });

            migrationBuilder.CreateIndex(
                name: "IX_documentos_EquipoId",
                table: "documentos",
                column: "EquipoId");

            migrationBuilder.CreateIndex(
                name: "IX_documentos_TipoEquipo",
                table: "documentos",
                column: "TipoEquipo");

            migrationBuilder.CreateIndex(
                name: "IX_equipo_repuestos_RepuestoId",
                table: "equipo_repuestos",
                column: "RepuestoId");

            migrationBuilder.CreateIndex(
                name: "IX_eventos_planta_EquipoId_Ts",
                table: "eventos_planta",
                columns: new[] { "EquipoId", "Ts" });

            migrationBuilder.CreateIndex(
                name: "IX_eventos_planta_PlcId",
                table: "eventos_planta",
                column: "PlcId");

            migrationBuilder.CreateIndex(
                name: "IX_eventos_planta_Ts",
                table: "eventos_planta",
                column: "Ts");

            migrationBuilder.CreateIndex(
                name: "IX_eventos_planta_Uid",
                table: "eventos_planta",
                column: "Uid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_intervencion_herramientas_HerramientaId",
                table: "intervencion_herramientas",
                column: "HerramientaId");

            migrationBuilder.CreateIndex(
                name: "IX_intervenciones_OrdenId",
                table: "intervenciones",
                column: "OrdenId");

            migrationBuilder.CreateIndex(
                name: "IX_intervenciones_TecnicoId",
                table: "intervenciones",
                column: "TecnicoId");

            migrationBuilder.CreateIndex(
                name: "IX_intervenciones_Uid",
                table: "intervenciones",
                column: "Uid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lineas_AreaId_Codigo",
                table: "lineas",
                columns: new[] { "AreaId", "Codigo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_plantas_Codigo",
                table: "plantas",
                column: "Codigo",
                unique: true);

            // ---- datos existentes: la zona y la línea pasan de texto repetido a entidades con clave foránea (sin perder nada)
            migrationBuilder.Sql(@"
INSERT INTO plantas (""Codigo"", ""Nombre"", ""Ciudad"")
SELECT 'PQ', 'Planta Quilicura', 'Santiago' WHERE EXISTS (SELECT 1 FROM equipos) AND NOT EXISTS (SELECT 1 FROM plantas);

INSERT INTO areas (""PlantaId"", ""Codigo"", ""Nombre"", ""Tipo"", ""Orden"")
SELECT (SELECT ""Id"" FROM plantas ORDER BY ""Id"" LIMIT 1),
       CASE z WHEN 'Nave 1 · Mecanizado' THEN 'N1' WHEN 'Nave 2 · Plásticos' THEN 'N2' WHEN 'Nave 3 · Envasado' THEN 'N3' WHEN 'Sala de máquinas' THEN 'SM'
              WHEN 'Bodega central' THEN 'BC' WHEN 'Patio de carga' THEN 'PC' ELSE 'A' || n END,
       z,
       CASE WHEN z ILIKE '%máquinas%' THEN 'servicios' WHEN z ILIKE '%bodega%' THEN 'bodega' WHEN z ILIKE '%patio%' THEN 'patio' ELSE 'produccion' END,
       n
FROM (SELECT z, row_number() OVER (ORDER BY z) AS n
      FROM (SELECT ""Zona"" AS z FROM equipos UNION SELECT ""Zona"" FROM plc UNION SELECT ""Zona"" FROM incidentes_sst) u
      WHERE z IS NOT NULL AND z <> '') t
WHERE EXISTS (SELECT 1 FROM plantas);

INSERT INTO lineas (""AreaId"", ""Codigo"", ""Nombre"")
SELECT a.""Id"",
       CASE e.l WHEN 'Línea 1 · Mecanizado' THEN 'L1' WHEN 'Línea 2 · Conformado' THEN 'L2' WHEN 'Línea 3 · Inyección' THEN 'L3' WHEN 'Línea 4 · Envasado' THEN 'L4' WHEN 'Servicios' THEN 'LS'
              ELSE 'L' || row_number() OVER (ORDER BY e.l) END,
       e.l
FROM (SELECT DISTINCT ""Zona"" AS z, ""Linea"" AS l FROM equipos) e JOIN areas a ON a.""Nombre"" = e.z;

UPDATE equipos e SET ""LineaId"" = l.""Id"" FROM lineas l JOIN areas a ON a.""Id"" = l.""AreaId"" WHERE l.""Nombre"" = e.""Linea"" AND a.""Nombre"" = e.""Zona"";
UPDATE plc p SET ""AreaId"" = a.""Id"" FROM areas a WHERE a.""Nombre"" = p.""Zona"";
UPDATE incidentes_sst i SET ""AreaId"" = a.""Id"" FROM areas a WHERE a.""Nombre"" = i.""Zona"";
UPDATE equipos SET ""ModeloSimulacion"" = CASE ""Tipo"" WHEN 'Cinta transportadora' THEN 'cinta' WHEN 'Envasadora automática' THEN 'llenado' ELSE 'maquina' END;
");

            migrationBuilder.DropColumn(name: "Linea", table: "ordenes_produccion");
            migrationBuilder.DropColumn(name: "Zona", table: "incidentes_sst");
            migrationBuilder.DropColumn(name: "Linea", table: "equipos");
            migrationBuilder.DropColumn(name: "Zona", table: "equipos");
            migrationBuilder.DropColumn(name: "Zona", table: "plc");

            migrationBuilder.AddForeignKey(
                name: "FK_equipos_lineas_LineaId",
                table: "equipos",
                column: "LineaId",
                principalTable: "lineas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_incidentes_sst_areas_AreaId",
                table: "incidentes_sst",
                column: "AreaId",
                principalTable: "areas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_incidentes_sst_equipos_EquipoId",
                table: "incidentes_sst",
                column: "EquipoId",
                principalTable: "equipos",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_movimientos_repuesto_intervenciones_IntervencionId",
                table: "movimientos_repuesto",
                column: "IntervencionId",
                principalTable: "intervenciones",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_movimientos_repuesto_ordenes_trabajo_OrdenId",
                table: "movimientos_repuesto",
                column: "OrdenId",
                principalTable: "ordenes_trabajo",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_movimientos_repuesto_repuestos_RepuestoId",
                table: "movimientos_repuesto",
                column: "RepuestoId",
                principalTable: "repuestos",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ordenes_produccion_equipos_EquipoId",
                table: "ordenes_produccion",
                column: "EquipoId",
                principalTable: "equipos",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ordenes_trabajo_equipos_EquipoId",
                table: "ordenes_trabajo",
                column: "EquipoId",
                principalTable: "equipos",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_plc_areas_AreaId",
                table: "plc",
                column: "AreaId",
                principalTable: "areas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_equipos_lineas_LineaId",
                table: "equipos");

            migrationBuilder.DropForeignKey(
                name: "FK_incidentes_sst_areas_AreaId",
                table: "incidentes_sst");

            migrationBuilder.DropForeignKey(
                name: "FK_incidentes_sst_equipos_EquipoId",
                table: "incidentes_sst");

            migrationBuilder.DropForeignKey(
                name: "FK_movimientos_repuesto_intervenciones_IntervencionId",
                table: "movimientos_repuesto");

            migrationBuilder.DropForeignKey(
                name: "FK_movimientos_repuesto_ordenes_trabajo_OrdenId",
                table: "movimientos_repuesto");

            migrationBuilder.DropForeignKey(
                name: "FK_movimientos_repuesto_repuestos_RepuestoId",
                table: "movimientos_repuesto");

            migrationBuilder.DropForeignKey(
                name: "FK_ordenes_produccion_equipos_EquipoId",
                table: "ordenes_produccion");

            migrationBuilder.DropForeignKey(
                name: "FK_ordenes_trabajo_equipos_EquipoId",
                table: "ordenes_trabajo");

            migrationBuilder.DropForeignKey(
                name: "FK_plc_areas_AreaId",
                table: "plc");

            migrationBuilder.DropTable(
                name: "cambios_estado_equipo");

            migrationBuilder.DropTable(
                name: "documentos");

            migrationBuilder.DropTable(
                name: "equipo_repuestos");

            migrationBuilder.DropTable(
                name: "eventos_planta");

            migrationBuilder.DropTable(
                name: "intervencion_herramientas");

            migrationBuilder.DropTable(
                name: "lineas");

            migrationBuilder.DropTable(
                name: "intervenciones");

            migrationBuilder.DropTable(
                name: "areas");

            migrationBuilder.DropTable(
                name: "plantas");

            migrationBuilder.DropCheckConstraint(
                name: "ck_repuestos_stock",
                table: "repuestos");

            migrationBuilder.DropIndex(
                name: "IX_plc_AreaId",
                table: "plc");

            migrationBuilder.DropIndex(
                name: "IX_ordenes_trabajo_EquipoId_Estado",
                table: "ordenes_trabajo");

            migrationBuilder.DropIndex(
                name: "IX_movimientos_repuesto_IntervencionId",
                table: "movimientos_repuesto");

            migrationBuilder.DropIndex(
                name: "IX_movimientos_repuesto_OrdenId",
                table: "movimientos_repuesto");

            migrationBuilder.DropIndex(
                name: "IX_incidentes_sst_AreaId",
                table: "incidentes_sst");

            migrationBuilder.DropIndex(
                name: "IX_incidentes_sst_EquipoId",
                table: "incidentes_sst");

            migrationBuilder.DropIndex(
                name: "IX_equipos_LineaId",
                table: "equipos");

            migrationBuilder.DropColumn(
                name: "xmin",
                table: "repuestos");

            migrationBuilder.DropColumn(
                name: "AreaId",
                table: "plc");

            migrationBuilder.DropColumn(
                name: "Tipo",
                table: "ordenes_trabajo");

            migrationBuilder.DropColumn(
                name: "xmin",
                table: "ordenes_trabajo");

            migrationBuilder.DropColumn(
                name: "xmin",
                table: "ordenes_produccion");

            migrationBuilder.DropColumn(
                name: "IntervencionId",
                table: "movimientos_repuesto");

            migrationBuilder.DropColumn(
                name: "AreaId",
                table: "incidentes_sst");

            migrationBuilder.DropColumn(
                name: "LineaId",
                table: "equipos");

            migrationBuilder.DropColumn(
                name: "ModeloSimulacion",
                table: "equipos");

            migrationBuilder.DropColumn(
                name: "xmin",
                table: "equipos");

            migrationBuilder.DropColumn(
                name: "Simulado",
                table: "alarmas");

            migrationBuilder.RenameColumn(
                name: "Origen",
                table: "plc",
                newName: "Zona");

            migrationBuilder.AddColumn<string>(
                name: "Linea",
                table: "ordenes_produccion",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Zona",
                table: "incidentes_sst",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Linea",
                table: "equipos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Zona",
                table: "equipos",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddForeignKey(
                name: "FK_ordenes_produccion_equipos_EquipoId",
                table: "ordenes_produccion",
                column: "EquipoId",
                principalTable: "equipos",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
