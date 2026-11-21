using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Sima.Api.Datos.Migraciones
{
    /// <inheritdoc />
    public partial class Inicial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "afp_comisiones",
                columns: table => new
                {
                    Afp = table.Column<string>(type: "text", nullable: false),
                    Comision = table.Column<decimal>(type: "numeric(8,5)", precision: 8, scale: 5, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_afp_comisiones", x => x.Afp);
                });

            migrationBuilder.CreateTable(
                name: "alarmas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EquipoId = table.Column<int>(type: "integer", nullable: false),
                    SensorId = table.Column<int>(type: "integer", nullable: false),
                    Nivel = table.Column<string>(type: "text", nullable: false),
                    Mensaje = table.Column<string>(type: "text", nullable: false),
                    Inicio = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Fin = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReconocidaPor = table.Column<string>(type: "text", nullable: true),
                    ReconocidaEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_alarmas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "auditoria",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UsuarioId = table.Column<string>(type: "text", nullable: false),
                    UsuarioNombre = table.Column<string>(type: "text", nullable: false),
                    Accion = table.Column<string>(type: "text", nullable: false),
                    Entidad = table.Column<string>(type: "text", nullable: false),
                    EntidadId = table.Column<string>(type: "text", nullable: false),
                    Detalle = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_auditoria", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "cargos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false),
                    FamiliaN = table.Column<int>(type: "integer", nullable: false),
                    Familia = table.Column<string>(type: "text", nullable: false),
                    Nombre = table.Column<string>(type: "text", nullable: false),
                    TipoCargo = table.Column<string>(type: "text", nullable: false),
                    PerfilSima = table.Column<string>(type: "text", nullable: false),
                    Canal = table.Column<string>(type: "text", nullable: false),
                    SueldoMin = table.Column<int>(type: "integer", nullable: false),
                    SueldoMax = table.Column<int>(type: "integer", nullable: false),
                    DotacionObjetivo = table.Column<int>(type: "integer", nullable: false),
                    ParaQueExiste = table.Column<string>(type: "text", nullable: false),
                    QueHace = table.Column<string>(type: "text", nullable: false),
                    QueEntrega = table.Column<string>(type: "text", nullable: false),
                    SeCoordinaCon = table.Column<string>(type: "text", nullable: false),
                    ComoMedir = table.Column<string>(type: "text", nullable: false),
                    Conocimientos = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cargos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "catalogo_conceptos",
                columns: table => new
                {
                    Concepto = table.Column<string>(type: "text", nullable: false),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Descripcion = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_catalogo_conceptos", x => x.Concepto);
                });

            migrationBuilder.CreateTable(
                name: "lecturas",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SensorId = table.Column<int>(type: "integer", nullable: false),
                    Valor = table.Column<double>(type: "double precision", nullable: false),
                    Ts = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lecturas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ordenes_trabajo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EquipoId = table.Column<int>(type: "integer", nullable: false),
                    Titulo = table.Column<string>(type: "text", nullable: false),
                    Descripcion = table.Column<string>(type: "text", nullable: false),
                    Prioridad = table.Column<string>(type: "text", nullable: false),
                    Estado = table.Column<string>(type: "text", nullable: false),
                    AsignadoAId = table.Column<string>(type: "text", nullable: true),
                    CreadaPorId = table.Column<string>(type: "text", nullable: true),
                    Automatica = table.Column<bool>(type: "boolean", nullable: false),
                    LotoConfirmado = table.Column<bool>(type: "boolean", nullable: false),
                    Creada = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Cerrada = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ordenes_trabajo", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "parametros",
                columns: table => new
                {
                    Clave = table.Column<string>(type: "text", nullable: false),
                    Valor = table.Column<decimal>(type: "numeric(18,6)", precision: 18, scale: 6, nullable: false),
                    Descripcion = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_parametros", x => x.Clave);
                });

            migrationBuilder.CreateTable(
                name: "plc",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Codigo = table.Column<string>(type: "text", nullable: false),
                    Nombre = table.Column<string>(type: "text", nullable: false),
                    Fabricante = table.Column<string>(type: "text", nullable: false),
                    Modelo = table.Column<string>(type: "text", nullable: false),
                    Direccion = table.Column<string>(type: "text", nullable: false),
                    Zona = table.Column<string>(type: "text", nullable: false),
                    Estado = table.Column<string>(type: "text", nullable: false),
                    CicloMs = table.Column<int>(type: "integer", nullable: false),
                    Programa = table.Column<string>(type: "text", nullable: false),
                    UltimoContacto = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_plc", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "plc_comandos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PlcId = table.Column<int>(type: "integer", nullable: false),
                    Tag = table.Column<string>(type: "text", nullable: false),
                    Valor = table.Column<double>(type: "double precision", nullable: false),
                    SolicitadoPor = table.Column<string>(type: "text", nullable: false),
                    Creado = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Aplicado = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_plc_comandos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tramos_impuesto",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DesdeUtm = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    Factor = table.Column<decimal>(type: "numeric(8,4)", precision: 8, scale: 4, nullable: false),
                    RebajaUtm = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tramos_impuesto", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "trabajadores",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    Rut = table.Column<string>(type: "text", nullable: false),
                    Nombres = table.Column<string>(type: "text", nullable: false),
                    ApellidoPaterno = table.Column<string>(type: "text", nullable: false),
                    ApellidoMaterno = table.Column<string>(type: "text", nullable: false),
                    Sexo = table.Column<string>(type: "text", nullable: false),
                    FechaNacimiento = table.Column<DateOnly>(type: "date", nullable: false),
                    EstadoCivil = table.Column<string>(type: "text", nullable: false),
                    Nacionalidad = table.Column<string>(type: "text", nullable: false),
                    Telefono = table.Column<string>(type: "text", nullable: false),
                    CorreoCorporativo = table.Column<string>(type: "text", nullable: false),
                    CorreoPersonal = table.Column<string>(type: "text", nullable: false),
                    Domicilio = table.Column<string>(type: "text", nullable: false),
                    Comuna = table.Column<string>(type: "text", nullable: false),
                    Region = table.Column<string>(type: "text", nullable: false),
                    ContactoEmergencia = table.Column<string>(type: "text", nullable: false),
                    TelefonoEmergencia = table.Column<string>(type: "text", nullable: false),
                    Afp = table.Column<string>(type: "text", nullable: false),
                    SistemaSalud = table.Column<string>(type: "text", nullable: false),
                    Banco = table.Column<string>(type: "text", nullable: false),
                    TipoCuenta = table.Column<string>(type: "text", nullable: false),
                    NumeroCuenta = table.Column<string>(type: "text", nullable: false),
                    FechaIngreso = table.Column<DateOnly>(type: "date", nullable: false),
                    CargoId = table.Column<int>(type: "integer", nullable: false),
                    Turno = table.Column<string>(type: "text", nullable: false),
                    JefeDirectoId = table.Column<string>(type: "text", nullable: true),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    LoginAlias = table.Column<string>(type: "text", nullable: true),
                    VersionSesion = table.Column<int>(type: "integer", nullable: false),
                    IntentosFallidos = table.Column<int>(type: "integer", nullable: false),
                    BloqueadoHasta = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UltimoAcceso = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trabajadores", x => x.Id);
                    table.ForeignKey(
                        name: "FK_trabajadores_cargos_CargoId",
                        column: x => x.CargoId,
                        principalTable: "cargos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_trabajadores_trabajadores_JefeDirectoId",
                        column: x => x.JefeDirectoId,
                        principalTable: "trabajadores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "equipos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Codigo = table.Column<string>(type: "text", nullable: false),
                    Nombre = table.Column<string>(type: "text", nullable: false),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Zona = table.Column<string>(type: "text", nullable: false),
                    Linea = table.Column<string>(type: "text", nullable: false),
                    Ubicacion = table.Column<string>(type: "text", nullable: false),
                    Marca = table.Column<string>(type: "text", nullable: false),
                    Modelo = table.Column<string>(type: "text", nullable: false),
                    Criticidad = table.Column<string>(type: "text", nullable: false),
                    Estado = table.Column<string>(type: "text", nullable: false),
                    PlcId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_equipos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_equipos_plc_PlcId",
                        column: x => x.PlcId,
                        principalTable: "plc",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "plc_modulos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PlcId = table.Column<int>(type: "integer", nullable: false),
                    Slot = table.Column<int>(type: "integer", nullable: false),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Modelo = table.Column<string>(type: "text", nullable: false),
                    Canales = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_plc_modulos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_plc_modulos_plc_PlcId",
                        column: x => x.PlcId,
                        principalTable: "plc",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "plc_puntos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PlcId = table.Column<int>(type: "integer", nullable: false),
                    ModuloId = table.Column<int>(type: "integer", nullable: false),
                    Canal = table.Column<int>(type: "integer", nullable: false),
                    Direccion = table.Column<string>(type: "text", nullable: false),
                    Tag = table.Column<string>(type: "text", nullable: false),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Descripcion = table.Column<string>(type: "text", nullable: false),
                    EquipoId = table.Column<int>(type: "integer", nullable: true),
                    SensorId = table.Column<int>(type: "integer", nullable: true),
                    Unidad = table.Column<string>(type: "text", nullable: false),
                    Minimo = table.Column<double>(type: "double precision", nullable: false),
                    Maximo = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_plc_puntos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_plc_puntos_plc_PlcId",
                        column: x => x.PlcId,
                        principalTable: "plc",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "asistencia",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Periodo = table.Column<string>(type: "text", nullable: false),
                    TrabajadorId = table.Column<string>(type: "text", nullable: false),
                    DiasProgramados = table.Column<int>(type: "integer", nullable: false),
                    DiasLicencia = table.Column<int>(type: "integer", nullable: false),
                    DiasPermisoSinGoce = table.Column<int>(type: "integer", nullable: false),
                    DiasVacaciones = table.Column<int>(type: "integer", nullable: false),
                    HorasExtra = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_asistencia", x => x.Id);
                    table.ForeignKey(
                        name: "FK_asistencia_trabajadores_TrabajadorId",
                        column: x => x.TrabajadorId,
                        principalTable: "trabajadores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "conceptos_variables",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Periodo = table.Column<string>(type: "text", nullable: false),
                    TrabajadorId = table.Column<string>(type: "text", nullable: false),
                    Concepto = table.Column<string>(type: "text", nullable: false),
                    Monto = table.Column<int>(type: "integer", nullable: false),
                    Observacion = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_conceptos_variables", x => x.Id);
                    table.ForeignKey(
                        name: "FK_conceptos_variables_trabajadores_TrabajadorId",
                        column: x => x.TrabajadorId,
                        principalTable: "trabajadores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "contratos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TrabajadorId = table.Column<string>(type: "text", nullable: false),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    EsActual = table.Column<bool>(type: "boolean", nullable: false),
                    FechaInicio = table.Column<DateOnly>(type: "date", nullable: false),
                    FechaTermino = table.Column<DateOnly>(type: "date", nullable: true),
                    JornadaHoras = table.Column<int>(type: "integer", nullable: true),
                    SueldoBase = table.Column<int>(type: "integer", nullable: false),
                    Colacion = table.Column<int>(type: "integer", nullable: false),
                    Movilizacion = table.Column<int>(type: "integer", nullable: false),
                    Observaciones = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_contratos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_contratos_trabajadores_TrabajadorId",
                        column: x => x.TrabajadorId,
                        principalTable: "trabajadores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "habilitaciones",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TrabajadorId = table.Column<string>(type: "text", nullable: false),
                    Nombre = table.Column<string>(type: "text", nullable: false),
                    FechaObtencion = table.Column<DateOnly>(type: "date", nullable: false),
                    VigenciaMeses = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_habilitaciones", x => x.Id);
                    table.ForeignKey(
                        name: "FK_habilitaciones_trabajadores_TrabajadorId",
                        column: x => x.TrabajadorId,
                        principalTable: "trabajadores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "terminos_contrato",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TrabajadorId = table.Column<string>(type: "text", nullable: false),
                    FechaTermino = table.Column<DateOnly>(type: "date", nullable: false),
                    Causal = table.Column<string>(type: "text", nullable: false),
                    AvisoPrevio = table.Column<bool>(type: "boolean", nullable: false),
                    FiniquitoMonto = table.Column<int>(type: "integer", nullable: false),
                    ResponsableId = table.Column<string>(type: "text", nullable: true),
                    Observaciones = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_terminos_contrato", x => x.Id);
                    table.ForeignKey(
                        name: "FK_terminos_contrato_trabajadores_TrabajadorId",
                        column: x => x.TrabajadorId,
                        principalTable: "trabajadores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "sensores",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EquipoId = table.Column<int>(type: "integer", nullable: false),
                    Variable = table.Column<string>(type: "text", nullable: false),
                    Nombre = table.Column<string>(type: "text", nullable: false),
                    Unidad = table.Column<string>(type: "text", nullable: false),
                    EscalaMin = table.Column<double>(type: "double precision", nullable: false),
                    EscalaMax = table.Column<double>(type: "double precision", nullable: false),
                    Nominal = table.Column<double>(type: "double precision", nullable: false),
                    Aviso = table.Column<double>(type: "double precision", nullable: false),
                    Alarma = table.Column<double>(type: "double precision", nullable: false),
                    Ultimo = table.Column<double>(type: "double precision", nullable: true),
                    UltimoEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Deriva = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sensores", x => x.Id);
                    table.ForeignKey(
                        name: "FK_sensores_equipos_EquipoId",
                        column: x => x.EquipoId,
                        principalTable: "equipos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_alarmas_SensorId_Fin",
                table: "alarmas",
                columns: new[] { "SensorId", "Fin" });

            migrationBuilder.CreateIndex(
                name: "IX_asistencia_Periodo_TrabajadorId",
                table: "asistencia",
                columns: new[] { "Periodo", "TrabajadorId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_asistencia_TrabajadorId",
                table: "asistencia",
                column: "TrabajadorId");

            migrationBuilder.CreateIndex(
                name: "IX_auditoria_Fecha",
                table: "auditoria",
                column: "Fecha");

            migrationBuilder.CreateIndex(
                name: "IX_conceptos_variables_Periodo_TrabajadorId",
                table: "conceptos_variables",
                columns: new[] { "Periodo", "TrabajadorId" });

            migrationBuilder.CreateIndex(
                name: "IX_conceptos_variables_TrabajadorId",
                table: "conceptos_variables",
                column: "TrabajadorId");

            migrationBuilder.CreateIndex(
                name: "IX_contratos_TrabajadorId_EsActual",
                table: "contratos",
                columns: new[] { "TrabajadorId", "EsActual" });

            migrationBuilder.CreateIndex(
                name: "IX_equipos_Codigo",
                table: "equipos",
                column: "Codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_equipos_PlcId",
                table: "equipos",
                column: "PlcId");

            migrationBuilder.CreateIndex(
                name: "IX_habilitaciones_TrabajadorId",
                table: "habilitaciones",
                column: "TrabajadorId");

            migrationBuilder.CreateIndex(
                name: "IX_lecturas_SensorId_Ts",
                table: "lecturas",
                columns: new[] { "SensorId", "Ts" });

            migrationBuilder.CreateIndex(
                name: "IX_lecturas_Ts",
                table: "lecturas",
                column: "Ts");

            migrationBuilder.CreateIndex(
                name: "IX_plc_Codigo",
                table: "plc",
                column: "Codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_plc_comandos_PlcId_Aplicado",
                table: "plc_comandos",
                columns: new[] { "PlcId", "Aplicado" });

            migrationBuilder.CreateIndex(
                name: "IX_plc_modulos_PlcId",
                table: "plc_modulos",
                column: "PlcId");

            migrationBuilder.CreateIndex(
                name: "IX_plc_puntos_PlcId_Tag",
                table: "plc_puntos",
                columns: new[] { "PlcId", "Tag" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sensores_EquipoId_Variable",
                table: "sensores",
                columns: new[] { "EquipoId", "Variable" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_terminos_contrato_TrabajadorId",
                table: "terminos_contrato",
                column: "TrabajadorId");

            migrationBuilder.CreateIndex(
                name: "IX_trabajadores_CargoId",
                table: "trabajadores",
                column: "CargoId");

            migrationBuilder.CreateIndex(
                name: "IX_trabajadores_CorreoCorporativo",
                table: "trabajadores",
                column: "CorreoCorporativo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trabajadores_JefeDirectoId",
                table: "trabajadores",
                column: "JefeDirectoId");

            migrationBuilder.CreateIndex(
                name: "IX_trabajadores_Rut",
                table: "trabajadores",
                column: "Rut",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "afp_comisiones");

            migrationBuilder.DropTable(
                name: "alarmas");

            migrationBuilder.DropTable(
                name: "asistencia");

            migrationBuilder.DropTable(
                name: "auditoria");

            migrationBuilder.DropTable(
                name: "catalogo_conceptos");

            migrationBuilder.DropTable(
                name: "conceptos_variables");

            migrationBuilder.DropTable(
                name: "contratos");

            migrationBuilder.DropTable(
                name: "habilitaciones");

            migrationBuilder.DropTable(
                name: "lecturas");

            migrationBuilder.DropTable(
                name: "ordenes_trabajo");

            migrationBuilder.DropTable(
                name: "parametros");

            migrationBuilder.DropTable(
                name: "plc_comandos");

            migrationBuilder.DropTable(
                name: "plc_modulos");

            migrationBuilder.DropTable(
                name: "plc_puntos");

            migrationBuilder.DropTable(
                name: "sensores");

            migrationBuilder.DropTable(
                name: "terminos_contrato");

            migrationBuilder.DropTable(
                name: "tramos_impuesto");

            migrationBuilder.DropTable(
                name: "equipos");

            migrationBuilder.DropTable(
                name: "trabajadores");

            migrationBuilder.DropTable(
                name: "plc");

            migrationBuilder.DropTable(
                name: "cargos");
        }
    }
}
