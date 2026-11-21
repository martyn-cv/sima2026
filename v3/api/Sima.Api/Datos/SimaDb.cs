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
        mb.Entity<OrdenTrabajo>(e => { e.ToTable("ordenes_trabajo"); e.Ignore(x => x.Codigo); });
    }
}
