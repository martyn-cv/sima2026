from datetime import timedelta

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

HORAS_SIN_AVANCE = 4  # alerta de OT de equipo crítico sin avance

# Roles que usan la aplicación (terreno) y roles que usan la web (oficina)
ROLES_APP = ("operador", "tecnico", "ing_terreno", "ing_mantenimiento", "ing_mecanico", "ing_automatizacion")
ROLES_WEB = ("administrativo", "civil_industrial", "encargado_procesos", "ejecutivo", "ing_transporte")


class Usuario(AbstractUser):
    ROLES = [
        ("operador", "Operador de producción"),
        ("tecnico", "Técnico de terreno"),
        ("ing_terreno", "Ingeniero de terreno"),
        ("ing_mantenimiento", "Ingeniero de mantenimiento"),
        ("ing_mecanico", "Ingeniero mecánico"),
        ("ing_automatizacion", "Ingeniero de automatización"),
        ("administrativo", "Administrativo"),
        ("civil_industrial", "Ingeniero civil industrial"),
        ("encargado_procesos", "Encargado de procesos"),
        ("ejecutivo", "Ejecutivo"),
        ("ing_transporte", "Ingeniero de transporte"),
    ]
    rol = models.CharField(max_length=20, choices=ROLES, default="operador")
    nombre_completo = models.CharField(max_length=120, blank=True)

    @property
    def canal(self):
        return "app" if self.rol in ROLES_APP else "web"

    @property
    def nombre(self):
        return self.nombre_completo or self.get_rol_display()

    def __str__(self):
        return self.nombre


class Equipo(models.Model):
    CATEGORIAS = [(c, c) for c in ["Extrusora", "Inyectora", "Caldera", "Compresor", "Línea de envasado", "Otro"]]
    CRITICIDAD = [("alta", "Alta"), ("media", "Media"), ("baja", "Baja")]
    ESTADOS = [("operativo", "Operativo"), ("en_mantencion", "En mantención"), ("detenido", "Detenido")]

    codigo = models.CharField("Código interno", max_length=20, unique=True)
    nombre_habitual = models.CharField("Nombre habitual", max_length=80)
    categoria = models.CharField(max_length=20, choices=CATEGORIAS, default="Otro")
    ubicacion = models.CharField("Ubicación", max_length=120)
    marca = models.CharField(max_length=60, blank=True)
    modelo = models.CharField(max_length=60, blank=True)
    criticidad = models.CharField(max_length=10, choices=CRITICIDAD, default="media")
    estado = models.CharField(max_length=20, choices=ESTADOS, default="operativo")
    manual = models.FileField(upload_to="manuales/", blank=True)

    class Meta:
        ordering = ["nombre_habitual"]

    def __str__(self):
        return f"{self.nombre_habitual} ({self.codigo})"


class PLC(models.Model):
    ESTADOS = [("en_linea", "En línea"), ("alarma", "Con alarma"), ("fuera_de_linea", "Fuera de línea")]
    equipo = models.ForeignKey(Equipo, on_delete=models.PROTECT, related_name="plcs")
    nombre = models.CharField(max_length=80)
    marca = models.CharField(max_length=60)
    modelo = models.CharField(max_length=60)
    ip = models.GenericIPAddressField("Dirección IP", null=True, blank=True)
    programa_version = models.CharField("Versión del programa", max_length=30, blank=True)
    estado = models.CharField(max_length=15, choices=ESTADOS, default="en_linea")
    ultima_revision = models.DateField(null=True, blank=True)
    observaciones = models.TextField(blank=True)

    class Meta:
        ordering = ["nombre"]
        verbose_name = "PLC"

    def __str__(self):
        return self.nombre


class Repuesto(models.Model):
    codigo = models.CharField(max_length=20, unique=True)
    nombre = models.CharField(max_length=120)
    tipo = models.CharField(max_length=60)
    bodega = models.CharField(max_length=60)
    stock = models.PositiveIntegerField(default=0)
    stock_minimo = models.PositiveIntegerField(default=0)
    costo_unitario = models.PositiveIntegerField("Costo unitario (CLP)", default=0)

    class Meta:
        ordering = ["nombre"]

    def __str__(self):
        return f"{self.codigo} {self.nombre}"

    @property
    def bajo_minimo(self):
        return self.stock <= self.stock_minimo


class Reporte(models.Model):
    """Falla avisada por un operador (o técnico) sobre una máquina."""
    ESTADOS = [("enviado", "Enviado"), ("tomado", "Tomado por un técnico"), ("resuelto", "Resuelto")]
    equipo = models.ForeignKey(Equipo, on_delete=models.PROTECT, related_name="reportes")
    operador = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name="reportes")
    descripcion = models.TextField("¿Qué le pasa a la máquina?")
    foto = models.FileField("Foto de la placa o la falla", upload_to="reportes/", blank=True)
    detiene_linea = models.BooleanField("Detiene la línea", default=False)
    estado = models.CharField(max_length=10, choices=ESTADOS, default="enviado")
    tecnico = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    creado = models.DateTimeField(default=timezone.now)
    uid = models.CharField(max_length=40, unique=True, null=True, blank=True)  # evita duplicados al sincronizar

    class Meta:
        ordering = ["-creado"]


class OrdenTrabajo(models.Model):
    TIPOS = [("correctiva", "Correctiva"), ("preventiva", "Preventiva")]
    PRIORIDADES = [("alta", "Alta"), ("media", "Media"), ("baja", "Baja")]
    ESTADOS = [("abierta", "Abierta"), ("en_curso", "En curso"), ("cerrada", "Cerrada")]

    equipo = models.ForeignKey(Equipo, on_delete=models.PROTECT, related_name="ordenes")
    titulo = models.CharField(max_length=140)
    descripcion = models.TextField(blank=True)
    tipo = models.CharField(max_length=12, choices=TIPOS, default="correctiva")
    prioridad = models.CharField(max_length=10, choices=PRIORIDADES, default="media")
    estado = models.CharField(max_length=10, choices=ESTADOS, default="abierta")
    asignado_a = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name="ordenes")
    creado_por = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name="+")
    reporte = models.OneToOneField(Reporte, on_delete=models.SET_NULL, null=True, blank=True, related_name="orden")
    creada = models.DateTimeField(default=timezone.now)
    cerrada_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-creada"]

    @property
    def numero(self):
        return f"OT-{self.pk:04d}"

    @property
    def abierta(self):
        return self.estado != "cerrada"

    @property
    def ultimo_avance(self):
        ultima = self.bitacora.order_by("-creado").first()
        return ultima.creado if ultima else self.creada

    @property
    def sin_avance(self):
        return (self.abierta and self.equipo.criticidad == "alta"
                and timezone.now() - self.ultimo_avance > timedelta(hours=HORAS_SIN_AVANCE))

    @property
    def horas_sin_avance(self):
        return int((timezone.now() - self.ultimo_avance).total_seconds() // 3600)

    @property
    def horas_trabajadas(self):
        return float(self.bitacora.aggregate(t=models.Sum("horas"))["t"] or 0)


class Bitacora(models.Model):
    """Registro cronológico. No se edita ni se borra."""
    ot = models.ForeignKey(OrdenTrabajo, on_delete=models.CASCADE, related_name="bitacora")
    autor = models.ForeignKey(Usuario, on_delete=models.PROTECT)
    texto = models.TextField()
    horas = models.DecimalField("Horas trabajadas", max_digits=5, decimal_places=2, default=0)
    es_traspaso = models.BooleanField("Nota de traspaso", default=False)
    creado = models.DateTimeField(default=timezone.now)
    uid = models.CharField(max_length=40, unique=True, null=True, blank=True)

    class Meta:
        ordering = ["creado", "id"]

    def save(self, *args, **kwargs):
        if self.pk:
            raise PermissionError("La bitácora no se puede editar.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionError("La bitácora no se puede borrar.")


class RepuestoOT(models.Model):
    ESTADOS = [("requerido", "Requerido"), ("solicitado", "Solicitado a compras"),
               ("reservado", "Reservado"), ("usado", "Entregado / usado")]
    ot = models.ForeignKey(OrdenTrabajo, on_delete=models.CASCADE, related_name="repuestos")
    repuesto = models.ForeignKey(Repuesto, on_delete=models.PROTECT, related_name="usos")
    cantidad = models.PositiveIntegerField()
    estado = models.CharField(max_length=10, choices=ESTADOS, default="requerido")
    registrado_por = models.ForeignKey(Usuario, on_delete=models.PROTECT)
    creado = models.DateTimeField(auto_now_add=True)
    entregado_en = models.DateTimeField(null=True, blank=True)

    @property
    def suficiente(self):
        return self.repuesto.stock >= self.cantidad

    @property
    def costo_total(self):
        return self.cantidad * self.repuesto.costo_unitario


class Aviso(models.Model):
    """Aviso de un técnico a los ingenieros: algo pequeño arreglado, algo pendiente o algo que falta."""
    TIPOS = [("arreglo_menor", "Arreglé algo pequeño"), ("pendiente", "Falta algo por arreglar"),
             ("repuesto", "Falta un repuesto"), ("informativo", "Informativo")]
    tipo = models.CharField(max_length=15, choices=TIPOS, default="arreglo_menor")
    equipo = models.ForeignKey(Equipo, on_delete=models.PROTECT, related_name="avisos")
    texto = models.TextField("Detalle")
    autor = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name="avisos")
    atendido = models.BooleanField(default=False)
    atendido_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    creado = models.DateTimeField(default=timezone.now)
    uid = models.CharField(max_length=40, unique=True, null=True, blank=True)

    class Meta:
        ordering = ["atendido", "-creado"]


class Notificacion(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name="notificaciones")
    texto = models.CharField(max_length=200)
    destino = models.CharField(max_length=60, blank=True)   # ej. "avisos", "ordenes/3"
    leida = models.BooleanField(default=False)
    creada = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["leida", "-creada"]


class Nota(models.Model):
    TIPOS = [("recomendacion", "Recomendación"), ("nota", "Nota")]
    titulo = models.CharField(max_length=140)
    texto = models.TextField("Detalle")
    tipo = models.CharField(max_length=15, choices=TIPOS, default="recomendacion")
    equipo = models.ForeignKey(Equipo, on_delete=models.SET_NULL, null=True, blank=True, related_name="notas")
    autor = models.ForeignKey(Usuario, on_delete=models.PROTECT)
    creada = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-creada"]


class Plan(models.Model):
    TIPOS = [("equipo", "Equipo de mantenimiento"), ("optimizacion", "Optimización de máquinas"),
             ("preventivo", "Mantención preventiva")]
    ESTADOS = [("planificado", "Planificado"), ("en_curso", "En curso"), ("completado", "Completado")]
    titulo = models.CharField(max_length=140)
    tipo = models.CharField(max_length=15, choices=TIPOS, default="preventivo")
    equipo = models.ForeignKey(Equipo, on_delete=models.SET_NULL, null=True, blank=True)
    responsable = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name="planes")
    fecha_inicio = models.DateField("Desde")
    fecha_fin = models.DateField("Hasta")
    descripcion = models.TextField("Detalle", blank=True)
    estado = models.CharField(max_length=12, choices=ESTADOS, default="planificado")
    creado_por = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name="+")

    class Meta:
        ordering = ["fecha_inicio"]


class Informe(models.Model):
    titulo = models.CharField(max_length=140)
    contenido = models.TextField()
    compartido = models.BooleanField("Compartir con los técnicos", default=False)
    autor = models.ForeignKey(Usuario, on_delete=models.PROTECT)
    creado = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-creado"]


# ---------------- Módulos de oficina (web) ----------------
class Contrato(models.Model):
    TIPOS = [("indefinido", "Indefinido"), ("plazo_fijo", "Plazo fijo"), ("honorarios", "Honorarios")]
    ESTADOS = [("vigente", "Vigente"), ("terminado", "Terminado")]
    trabajador = models.CharField(max_length=120)
    rut = models.CharField(max_length=14)
    cargo = models.CharField(max_length=80)
    area = models.CharField(max_length=60)
    tipo = models.CharField(max_length=12, choices=TIPOS, default="indefinido")
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField(null=True, blank=True)
    sueldo_bruto = models.PositiveIntegerField("Sueldo bruto (CLP)", default=0)
    estado = models.CharField(max_length=10, choices=ESTADOS, default="vigente")

    class Meta:
        ordering = ["trabajador"]

    @property
    def dias_para_vencer(self):
        if self.estado != "vigente" or not self.fecha_fin:
            return None
        return (self.fecha_fin - timezone.localdate()).days


class Movimiento(models.Model):
    TIPOS = [("ingreso", "Ingreso"), ("gasto", "Gasto")]
    fecha = models.DateField(default=timezone.localdate)
    tipo = models.CharField(max_length=8, choices=TIPOS, default="gasto")
    categoria = models.CharField(max_length=60)
    centro_costo = models.CharField(max_length=60, blank=True)
    descripcion = models.CharField(max_length=200)
    monto = models.PositiveBigIntegerField("Monto (CLP)")
    creado_por = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name="+")

    class Meta:
        ordering = ["-fecha", "-id"]


class Proceso(models.Model):
    ESTADOS = [("planificado", "Planificado"), ("en_curso", "En curso"), ("bloqueado", "Bloqueado"),
               ("completado", "Completado")]
    nombre = models.CharField(max_length=140)
    area = models.CharField(max_length=60)
    responsable = models.CharField(max_length=80, blank=True)
    estado = models.CharField(max_length=12, choices=ESTADOS, default="planificado")
    avance = models.PositiveSmallIntegerField(default=0)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    descripcion = models.TextField(blank=True)

    class Meta:
        ordering = ["fecha_fin"]


class Despacho(models.Model):
    ESTADOS = [("programado", "Programado"), ("en_ruta", "En ruta"), ("entregado", "Entregado"),
               ("retrasado", "Retrasado")]
    codigo = models.CharField(max_length=20, unique=True)
    origen = models.CharField(max_length=80)
    destino = models.CharField(max_length=80)
    carga = models.CharField(max_length=120)
    vehiculo = models.CharField(max_length=60, blank=True)
    conductor = models.CharField(max_length=80, blank=True)
    estado = models.CharField(max_length=12, choices=ESTADOS, default="programado")
    fecha_salida = models.DateField()
    fecha_llegada = models.DateField(null=True, blank=True)
    costo = models.PositiveIntegerField("Costo (CLP)", default=0)

    class Meta:
        ordering = ["-fecha_salida"]
