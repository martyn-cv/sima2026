from datetime import timedelta

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

HORAS_SIN_AVANCE = 4  # alerta de OT de equipo critico sin avance


class Usuario(AbstractUser):
    ROLES = [("tecnico", "Técnico de mantenimiento"), ("ingeniero", "Ingeniero de mantenimiento"),
             ("operador", "Operador de producción")]
    rol = models.CharField(max_length=10, choices=ROLES, default="operador")

    @property
    def nombre(self):
        return self.get_rol_display()


class Equipo(models.Model):
    CATEGORIAS = [(c, c) for c in ["Extrusora", "Inyectora", "Caldera", "Otro"]]
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
    ESTADOS = [("enviado", "Enviado"), ("tomado", "Tomado por un técnico"), ("resuelto", "Resuelto")]
    equipo = models.ForeignKey(Equipo, on_delete=models.PROTECT, related_name="reportes")
    operador = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name="reportes")
    descripcion = models.TextField("¿Qué le pasa a la máquina?")
    foto = models.FileField("Foto de la placa o la falla", upload_to="reportes/", blank=True)
    detiene_linea = models.BooleanField("Detiene la línea", default=False)
    estado = models.CharField(max_length=10, choices=ESTADOS, default="enviado")
    tecnico = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    creado = models.DateTimeField(auto_now_add=True)

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
        return self.bitacora.aggregate(t=models.Sum("horas"))["t"] or 0


class Bitacora(models.Model):
    """Registro cronológico. No se edita ni se borra."""
    ot = models.ForeignKey(OrdenTrabajo, on_delete=models.CASCADE, related_name="bitacora")
    autor = models.ForeignKey(Usuario, on_delete=models.PROTECT)
    texto = models.TextField()
    horas = models.DecimalField("Horas trabajadas", max_digits=5, decimal_places=2, default=0)
    es_traspaso = models.BooleanField("Nota de traspaso", default=False)
    creado = models.DateTimeField(default=timezone.now)
    # identificador generado en el celular: evita duplicados al sincronizar registros hechos sin conexión
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


class Nota(models.Model):
    TIPOS = [("recomendacion", "Recomendación"), ("nota", "Nota")]
    titulo = models.CharField(max_length=140)
    texto = models.TextField("Detalle")
    tipo = models.CharField(max_length=15, choices=TIPOS, default="recomendacion")
    equipo = models.ForeignKey(Equipo, on_delete=models.SET_NULL, null=True, blank=True, related_name="notas")
    autor = models.ForeignKey(Usuario, on_delete=models.PROTECT)
    creada = models.DateTimeField(auto_now_add=True)

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
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado"]
