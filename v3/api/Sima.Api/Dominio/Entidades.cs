namespace Sima.Api.Dominio;

// ----------------------------------------------------------------------------- personas (viene del Excel)

public class Cargo
{
    public int Id { get; set; }
    public int FamiliaN { get; set; }
    public string Familia { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string TipoCargo { get; set; } = "";          // Administrativo | Terreno
    public string PerfilSima { get; set; } = "";
    public string Canal { get; set; } = "app";           // app | web
    public int SueldoMin { get; set; }
    public int SueldoMax { get; set; }
    public int DotacionObjetivo { get; set; }
    public string ParaQueExiste { get; set; } = "";
    public string QueHace { get; set; } = "";
    public string QueEntrega { get; set; } = "";
    public string SeCoordinaCon { get; set; } = "";
    public string ComoMedir { get; set; } = "";
    public string Conocimientos { get; set; } = "";
}

public class Trabajador
{
    public string Id { get; set; } = "";                 // T001…
    public string Rut { get; set; } = "";
    public string Nombres { get; set; } = "";
    public string ApellidoPaterno { get; set; } = "";
    public string ApellidoMaterno { get; set; } = "";
    public string Sexo { get; set; } = "";
    public DateOnly FechaNacimiento { get; set; }
    public string EstadoCivil { get; set; } = "";
    public string Nacionalidad { get; set; } = "";
    public string Telefono { get; set; } = "";
    public string CorreoCorporativo { get; set; } = "";
    public string CorreoPersonal { get; set; } = "";
    public string Domicilio { get; set; } = "";
    public string Comuna { get; set; } = "";
    public string Region { get; set; } = "";
    public string ContactoEmergencia { get; set; } = "";
    public string TelefonoEmergencia { get; set; } = "";
    public string Afp { get; set; } = "";
    public string SistemaSalud { get; set; } = "";
    public string Banco { get; set; } = "";
    public string TipoCuenta { get; set; } = "";
    public string NumeroCuenta { get; set; } = "";
    public DateOnly FechaIngreso { get; set; }
    public int CargoId { get; set; }
    public Cargo? Cargo { get; set; }
    public string Turno { get; set; } = "D";
    public string? JefeDirectoId { get; set; }

    // cuenta de SIMA (una por trabajador)
    public string PasswordHash { get; set; } = "";
    public string? LoginAlias { get; set; }              // usuario de demostración de la versión 2
    public int VersionSesion { get; set; } = 1;          // al subirla, todas las sesiones abiertas dejan de valer
    public int IntentosFallidos { get; set; }
    public DateTime? BloqueadoHasta { get; set; }
    public DateTime? UltimoAcceso { get; set; }
    public bool DebeCambiarClave { get; set; }           // tras un restablecimiento o una clave inicial: debe elegir una propia
    public bool TotpActivo { get; set; }                 // segundo factor (aplicación de autenticación)
    public string? TotpSecreto { get; set; }             // cifrado con AES-GCM; nunca sale de la API
    public long TotpUltimoPaso { get; set; }             // evita reutilizar un código ya usado

    public string NombreCompleto => $"{Nombres} {ApellidoPaterno} {ApellidoMaterno}".Trim();
}

public class Contrato
{
    public int Id { get; set; }
    public string TrabajadorId { get; set; } = "";
    public string Tipo { get; set; } = "Indefinido";     // Indefinido | Plazo fijo | Honorarios
    public bool EsActual { get; set; }
    public DateOnly FechaInicio { get; set; }
    public DateOnly? FechaTermino { get; set; }
    public int? JornadaHoras { get; set; }
    public int SueldoBase { get; set; }
    public int Colacion { get; set; }
    public int Movilizacion { get; set; }
    public string Observaciones { get; set; } = "";
    public string Codigo => $"K{Id:0000}";
}

public class TerminoContrato
{
    public int Id { get; set; }
    public string TrabajadorId { get; set; } = "";
    public DateOnly FechaTermino { get; set; }
    public string Causal { get; set; } = "";
    public bool AvisoPrevio { get; set; }
    public int FiniquitoMonto { get; set; }
    public string? ResponsableId { get; set; }
    public string Observaciones { get; set; } = "";
}

public class Asistencia
{
    public int Id { get; set; }
    public string Periodo { get; set; } = "";            // AAAA-MM
    public string TrabajadorId { get; set; } = "";
    public int DiasProgramados { get; set; }
    public int DiasLicencia { get; set; }
    public int DiasPermisoSinGoce { get; set; }
    public int DiasVacaciones { get; set; }
    public int HorasExtra { get; set; }
    public int DiasTrabajados => DiasProgramados - DiasLicencia - DiasPermisoSinGoce;
}

public class CatalogoConcepto
{
    public string Concepto { get; set; } = "";
    public string Tipo { get; set; } = "";               // Haber imponible | Descuento
    public string Descripcion { get; set; } = "";
}

public class ConceptoVariable
{
    public int Id { get; set; }
    public string Periodo { get; set; } = "";
    public string TrabajadorId { get; set; } = "";
    public string Concepto { get; set; } = "";
    public int Monto { get; set; }
    public string Observacion { get; set; } = "";
}

public class Habilitacion
{
    public int Id { get; set; }
    public string TrabajadorId { get; set; } = "";
    public string Nombre { get; set; } = "";
    public DateOnly FechaObtencion { get; set; }
    public int VigenciaMeses { get; set; }
    public DateOnly Vencimiento => FechaObtencion.AddMonths(VigenciaMeses);
}

public class Parametro
{
    public string Clave { get; set; } = "";
    public decimal Valor { get; set; }
    public string Descripcion { get; set; } = "";
}

public class AfpComision
{
    public string Afp { get; set; } = "";
    public decimal Comision { get; set; }
}

public class TramoImpuesto
{
    public int Id { get; set; }
    public decimal DesdeUtm { get; set; }
    public decimal Factor { get; set; }
    public decimal RebajaUtm { get; set; }
}

public class Auditoria
{
    public long Id { get; set; }
    public DateTime Fecha { get; set; } = DateTime.UtcNow;
    public string UsuarioId { get; set; } = "";
    public string UsuarioNombre { get; set; } = "";
    public string Accion { get; set; } = "";
    public string Entidad { get; set; } = "";
    public string EntidadId { get; set; } = "";
    public string Detalle { get; set; } = "";
}

// ----------------------------------------------------------------------------- planta y PLC

public class Plc
{
    public int Id { get; set; }
    public string Codigo { get; set; } = "";             // PLC-01
    public string Nombre { get; set; } = "";
    public string Fabricante { get; set; } = "";
    public string Modelo { get; set; } = "";
    public string Direccion { get; set; } = "";          // IP simulada
    public string Zona { get; set; } = "";
    public string Estado { get; set; } = "stop";         // run | stop | error | sin_conexion
    public int CicloMs { get; set; } = 100;
    public string Programa { get; set; } = "{}";         // JSON: variables y peldaños de escalera
    public DateTime? UltimoContacto { get; set; }
    public List<PlcModulo> Modulos { get; set; } = new();
    public List<PlcPunto> Puntos { get; set; } = new();
    public List<Equipo> Equipos { get; set; } = new();
}

public class PlcModulo
{
    public int Id { get; set; }
    public int PlcId { get; set; }
    public int Slot { get; set; }
    public string Tipo { get; set; } = "DI";             // CPU | PS | DI | DO | AI | AO | COM
    public string Modelo { get; set; } = "";
    public int Canales { get; set; }
}

public class PlcPunto
{
    public int Id { get; set; }
    public int PlcId { get; set; }
    public int ModuloId { get; set; }
    public int Canal { get; set; }
    public string Direccion { get; set; } = "";         // I0.0, Q0.1, IW64
    public string Tag { get; set; } = "";               // CP01_MARCHA
    public string Tipo { get; set; } = "DI";            // DI | DO | AI | AO
    public string Descripcion { get; set; } = "";
    public int? EquipoId { get; set; }
    public int? SensorId { get; set; }                  // un punto analógico alimenta a un sensor del equipo
    public string Unidad { get; set; } = "";
    public double Minimo { get; set; }
    public double Maximo { get; set; } = 1;
}

public class PlcComando
{
    public int Id { get; set; }
    public int PlcId { get; set; }
    public string Tag { get; set; } = "";
    public double Valor { get; set; }
    public string SolicitadoPor { get; set; } = "";
    public DateTime Creado { get; set; } = DateTime.UtcNow;
    public DateTime? Aplicado { get; set; }
}

public class Equipo
{
    public int Id { get; set; }
    public string Codigo { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string Tipo { get; set; } = "";
    public string Zona { get; set; } = "";
    public string Linea { get; set; } = "";
    public string Ubicacion { get; set; } = "";
    public string Marca { get; set; } = "";
    public string Modelo { get; set; } = "";
    public string Criticidad { get; set; } = "media";
    public string Estado { get; set; } = "operando";     // operando | alarma | detenido | en_mantencion
    public int? PlcId { get; set; }
    public Plc? Plc { get; set; }
    public List<Sensor> Sensores { get; set; } = new();
}

public class Sensor
{
    public int Id { get; set; }
    public int EquipoId { get; set; }
    public Equipo? Equipo { get; set; }
    public string Variable { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string Unidad { get; set; } = "";
    public double EscalaMin { get; set; }
    public double EscalaMax { get; set; }
    public double Nominal { get; set; }
    public double Aviso { get; set; }
    public double Alarma { get; set; }
    public double? Ultimo { get; set; }
    public DateTime? UltimoEn { get; set; }
    public double Deriva { get; set; }                  // solo para el simulador interno
}

public class Lectura
{
    public long Id { get; set; }
    public int SensorId { get; set; }
    public double Valor { get; set; }
    public DateTime Ts { get; set; } = DateTime.UtcNow;
}

public class Alarma
{
    public int Id { get; set; }
    public int EquipoId { get; set; }
    public int SensorId { get; set; }
    public string Nivel { get; set; } = "aviso";         // aviso | alarma
    public string Mensaje { get; set; } = "";
    public DateTime Inicio { get; set; } = DateTime.UtcNow;
    public DateTime? Fin { get; set; }
    public string? ReconocidaPor { get; set; }
    public DateTime? ReconocidaEn { get; set; }
}

public class OrdenTrabajo
{
    public int Id { get; set; }
    public int EquipoId { get; set; }
    public string Titulo { get; set; } = "";
    public string Descripcion { get; set; } = "";
    public string Prioridad { get; set; } = "media";     // baja | media | alta | critica
    public string Estado { get; set; } = "abierta";      // abierta | en_curso | cerrada
    public string? AsignadoAId { get; set; }
    public string? CreadaPorId { get; set; }
    public bool Automatica { get; set; }
    public bool LotoConfirmado { get; set; }
    public DateTime Creada { get; set; } = DateTime.UtcNow;
    public DateTime? Cerrada { get; set; }
    public string Codigo => $"OT-{Id:0000}";
}
