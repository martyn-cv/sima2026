using Microsoft.EntityFrameworkCore;
using Sima.Api.Dominio;

namespace Sima.Api.Datos;

public class SimaDb(DbContextOptions<SimaDb> opciones) : DbContext(opciones)
{
    public DbSet<Cargo> Cargos => Set<Cargo>();
    public DbSet<Trabajador> Trabajadores => Set<Trabajador>();
    public DbSet<Contrato> Contratos => Set<Contrato>();
    public DbSet<TerminoContrato> Terminos => Set<TerminoContrato>();
    public DbSet<Asistencia> Asistencias => Set<Asistencia>();
    public DbSet<CatalogoConcepto> CatalogoConceptos => Set<CatalogoConcepto>();
    public DbSet<ConceptoVariable> Conceptos => Set<ConceptoVariable>();
    public DbSet<Habilitacion> Habilitaciones => Set<Habilitacion>();
    public DbSet<Parametro> Parametros => Set<Parametro>();
    public DbSet<AfpComision> Afps => Set<AfpComision>();
    public DbSet<TramoImpuesto> TramosImpuesto => Set<TramoImpuesto>();
    public DbSet<Auditoria> Auditorias => Set<Auditoria>();
    public DbSet<Plc> Plcs => Set<Plc>();
    public DbSet<PlcModulo> PlcModulos => Set<PlcModulo>();
    public DbSet<PlcPunto> PlcPuntos => Set<PlcPunto>();
    public DbSet<PlcComando> PlcComandos => Set<PlcComando>();
    public DbSet<Equipo> Equipos => Set<Equipo>();
    public DbSet<Sensor> Sensores => Set<Sensor>();
    public DbSet<Lectura> Lecturas => Set<Lectura>();
    public DbSet<Alarma> Alarmas => Set<Alarma>();
    public DbSet<OrdenTrabajo> Ordenes => Set<OrdenTrabajo>();
    public DbSet<Herramienta> Herramientas => Set<Herramienta>();
    public DbSet<Repuesto> Repuestos => Set<Repuesto>();
    public DbSet<MovimientoRepuesto> MovimientosRepuesto => Set<MovimientoRepuesto>();
    public DbSet<Despacho> Despachos => Set<Despacho>();
    public DbSet<RutinaPlantilla> Rutinas => Set<RutinaPlantilla>();
    public DbSet<EjecucionRutina> EjecucionesRutina => Set<EjecucionRutina>();
    public DbSet<Traspaso> Traspasos => Set<Traspaso>();
    public DbSet<ProduccionDia> Produccion => Set<ProduccionDia>();
    public DbSet<Parada> Paradas => Set<Parada>();
    public DbSet<RolPermiso> RolPermisos => Set<RolPermiso>();
    public DbSet<OrdenProduccion> OrdenesProduccion => Set<OrdenProduccion>();
    public DbSet<RegistroProduccion> RegistrosProduccion => Set<RegistroProduccion>();
    public DbSet<NoConformidad> NoConformidades => Set<NoConformidad>();
    public DbSet<IncidenteSst> IncidentesSst => Set<IncidenteSst>();
    public DbSet<CambioPlc> CambiosPlc => Set<CambioPlc>();
    public DbSet<CierreRemuneraciones> CierresRemuneraciones => Set<CierreRemuneraciones>();
    public DbSet<ValidacionParametros> ValidacionesParametros => Set<ValidacionParametros>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<Cargo>(e => { e.ToTable("cargos"); e.Property(x => x.Id).ValueGeneratedNever(); });
        mb.Entity<Trabajador>(e =>
        {
            e.ToTable("trabajadores");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Rut).IsUnique();
            e.HasIndex(x => x.CorreoCorporativo).IsUnique();
            e.HasOne(x => x.Cargo).WithMany().HasForeignKey(x => x.CargoId);
            e.HasOne<Trabajador>().WithMany().HasForeignKey(x => x.JefeDirectoId).OnDelete(DeleteBehavior.SetNull);
            e.Ignore(x => x.NombreCompleto);
        });
        mb.Entity<Contrato>(e =>
        {
            e.ToTable("contratos");
            e.HasOne<Trabajador>().WithMany().HasForeignKey(x => x.TrabajadorId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.TrabajadorId, x.EsActual });
            e.Ignore(x => x.Codigo);
        });
        mb.Entity<TerminoContrato>(e =>
        {
            e.ToTable("terminos_contrato");
            e.HasOne<Trabajador>().WithMany().HasForeignKey(x => x.TrabajadorId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.TrabajadorId);
        });
        mb.Entity<Asistencia>(e =>
        {
            e.ToTable("asistencia");
            e.HasOne<Trabajador>().WithMany().HasForeignKey(x => x.TrabajadorId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.Periodo, x.TrabajadorId }).IsUnique();
            e.Ignore(x => x.DiasTrabajados);
        });
        mb.Entity<CatalogoConcepto>(e => { e.ToTable("catalogo_conceptos"); e.HasKey(x => x.Concepto); });
        mb.Entity<ConceptoVariable>(e =>
        {
            e.ToTable("conceptos_variables");
            e.HasOne<Trabajador>().WithMany().HasForeignKey(x => x.TrabajadorId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.Periodo, x.TrabajadorId });
        });
        mb.Entity<Habilitacion>(e =>
        {
            e.ToTable("habilitaciones");
            e.HasOne<Trabajador>().WithMany().HasForeignKey(x => x.TrabajadorId).OnDelete(DeleteBehavior.Cascade);
            e.Ignore(x => x.Vencimiento);
        });
        mb.Entity<Parametro>(e => { e.ToTable("parametros"); e.HasKey(x => x.Clave); e.Property(x => x.Valor).HasPrecision(18, 6); });
        mb.Entity<AfpComision>(e => { e.ToTable("afp_comisiones"); e.HasKey(x => x.Afp); e.Property(x => x.Comision).HasPrecision(8, 5); });
        mb.Entity<TramoImpuesto>(e => { e.ToTable("tramos_impuesto"); e.Property(x => x.DesdeUtm).HasPrecision(10, 2); e.Property(x => x.Factor).HasPrecision(8, 4); e.Property(x => x.RebajaUtm).HasPrecision(10, 2); });
        mb.Entity<Auditoria>(e => { e.ToTable("auditoria"); e.HasIndex(x => x.Fecha); });

        mb.Entity<Plc>(e =>
        {
            e.ToTable("plc");
            e.HasIndex(x => x.Codigo).IsUnique();
            e.HasMany(x => x.Modulos).WithOne().HasForeignKey(x => x.PlcId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Puntos).WithOne().HasForeignKey(x => x.PlcId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Equipos).WithOne(x => x.Plc).HasForeignKey(x => x.PlcId).OnDelete(DeleteBehavior.SetNull);
        });
        mb.Entity<PlcModulo>(e => e.ToTable("plc_modulos"));
        mb.Entity<PlcPunto>(e => { e.ToTable("plc_puntos"); e.HasIndex(x => new { x.PlcId, x.Tag }).IsUnique(); });
        mb.Entity<PlcComando>(e => { e.ToTable("plc_comandos"); e.HasIndex(x => new { x.PlcId, x.Aplicado }); });
        mb.Entity<Equipo>(e => { e.ToTable("equipos"); e.HasIndex(x => x.Codigo).IsUnique(); e.HasMany(x => x.Sensores).WithOne(x => x.Equipo).HasForeignKey(x => x.EquipoId).OnDelete(DeleteBehavior.Cascade); });
        mb.Entity<Sensor>(e => { e.ToTable("sensores"); e.HasIndex(x => new { x.EquipoId, x.Variable }).IsUnique(); });
        mb.Entity<Lectura>(e => { e.ToTable("lecturas"); e.HasIndex(x => new { x.SensorId, x.Ts }); e.HasIndex(x => x.Ts); });
        mb.Entity<Alarma>(e => { e.ToTable("alarmas"); e.HasIndex(x => new { x.SensorId, x.Fin }); });
        mb.Entity<OrdenTrabajo>(e => { e.ToTable("ordenes_trabajo"); e.Ignore(x => x.Codigo); e.HasIndex(x => x.Uid).IsUnique(); });
        mb.Entity<Herramienta>(e => { e.ToTable("herramientas"); e.HasIndex(x => x.Codigo).IsUnique(); });
        mb.Entity<Repuesto>(e => { e.ToTable("repuestos"); e.HasIndex(x => x.Codigo).IsUnique(); });
        mb.Entity<MovimientoRepuesto>(e => { e.ToTable("movimientos_repuesto"); e.HasIndex(x => x.RepuestoId); });
        mb.Entity<Despacho>(e => { e.ToTable("despachos"); e.Ignore(x => x.Codigo); });
        mb.Entity<RutinaPlantilla>(e => e.ToTable("rutinas"));
        mb.Entity<EjecucionRutina>(e => { e.ToTable("ejecuciones_rutina"); e.HasIndex(x => x.Uid).IsUnique(); e.HasIndex(x => new { x.RutinaId, x.EquipoId, x.Fecha }); });
        mb.Entity<Traspaso>(e => e.ToTable("traspasos"));
        mb.Entity<ProduccionDia>(e => { e.ToTable("produccion_dia"); e.HasIndex(x => new { x.EquipoId, x.Fecha }).IsUnique(); });
        mb.Entity<Parada>(e => { e.ToTable("paradas"); e.HasIndex(x => new { x.EquipoId, x.Inicio }); });
        mb.Entity<RolPermiso>(e => { e.ToTable("rol_permisos"); e.HasIndex(x => new { x.CargoId, x.Capacidad }).IsUnique(); e.HasOne<Cargo>().WithMany().HasForeignKey(x => x.CargoId).OnDelete(DeleteBehavior.Cascade); });
        mb.Entity<OrdenProduccion>(e => { e.ToTable("ordenes_produccion"); e.HasIndex(x => x.Codigo).IsUnique(); e.HasIndex(x => x.Estado); e.HasOne<Equipo>().WithMany().HasForeignKey(x => x.EquipoId); });
        mb.Entity<RegistroProduccion>(e => { e.ToTable("registros_produccion"); e.HasIndex(x => x.Fecha); e.HasOne<OrdenProduccion>().WithMany().HasForeignKey(x => x.OrdenId).OnDelete(DeleteBehavior.Cascade); });
        mb.Entity<NoConformidad>(e => { e.ToTable("no_conformidades"); e.HasIndex(x => x.Codigo).IsUnique(); e.HasIndex(x => x.Estado); });
        mb.Entity<IncidenteSst>(e => { e.ToTable("incidentes_sst"); e.HasIndex(x => x.Codigo).IsUnique(); e.HasIndex(x => x.Fecha); });
        mb.Entity<CambioPlc>(e => { e.ToTable("cambios_plc"); e.HasIndex(x => new { x.PlcId, x.Estado }); e.HasOne<Plc>().WithMany().HasForeignKey(x => x.PlcId).OnDelete(DeleteBehavior.Cascade); });
        mb.Entity<CierreRemuneraciones>(e => { e.ToTable("cierres_remuneraciones"); e.HasIndex(x => x.Periodo); });
        mb.Entity<ValidacionParametros>(e => { e.ToTable("validaciones_parametros"); e.HasIndex(x => x.Periodo); });
    }
}
