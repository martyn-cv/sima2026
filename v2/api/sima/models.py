from datetime import timedelta

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

from .perfiles import PERFILES

HORAS_SIN_AVANCE = 4  # alerta de OT de equipo crítico sin avance


# ------------------------------------------------------------------ personas y cargos
class Cargo(models.Model):
    """Los 64 cargos del informe de roles de una planta manufacturera."""
    numero = models.PositiveSmallIntegerField(unique=True)
    familia = models.PositiveSmallIntegerField()
    familia_nombre = models.CharField(max_length=80)
    nombre = models.CharField(max_length=120)
    existe = models.TextField("Para qué existe")
    hace = models.TextField("Qué hace")
    entrega = models.TextField("Qué entrega o registra")
    coordina = models.TextField("Con quién se coordina")
    medir = models.TextField("Cómo medir su trabajo")
    conocimientos = models.TextField("Conocimientos clave")
    perfil = models.CharField(max_length=20)

    class Meta:
        ordering = ["numero"]

    def __str__(self):
        return f"{self.numero:02d} {self.nombre}"


class Usuario(AbstractUser):
    ROLES = [(k, v["nombre"]) for k, v in PERFILES.items()]
    TURNOS = [("A", "Turno A"), ("B", "Turno B"), ("N", "Turno de noche"), ("D", "Horario de oficina")]
    rol = models.CharField(max_length=20, choices=ROLES, default="operador")
    cargo = models.ForeignKey(Cargo, on_delete=models.SET_NULL, null=True, blank=True, related_name="usuarios")
    turno = models.CharField(max_length=1, choices=TURNOS, default="A")
    nombre_completo = models.CharField(max_length=120, blank=True)

    def save(self, *args, **kw):
        if self.cargo_id and self.cargo.perfil in PERFILES:   # el cargo decide el perfil de acceso
            self.rol = self.cargo.perfil
        super().save(*args, **kw)

    @property
    def canal(self):
        return PERFILES[self.rol]["canal"]

    @property
    def nombre(self):
        return self.nombre_completo or self.get_rol_display()

    def __str__(self):
        return self.nombre


# ------------------------------------------------------------------ catálogo técnico y equipos
class Ficha(models.Model):
    """Ficha del catálogo técnico (informe de manufactura industrial): máquinas, automatización, piezas y herramientas."""
    CATEGORIAS = [("maquinaria", "Maquinaria de producción"), ("automatizacion", "Automatización y control"),
                  ("pieza", "Repuestos y piezas mecánicas"), ("herramienta", "Herramientas e instrumentos")]
    categoria = models.CharField(max_length=15, choices=CATEGORIAS)
    icono = models.CharField(max_length=20, blank=True)
    nombre = models.CharField(max_length=80)
    funcion = models.CharField(max_length=200)
    especificaciones = models.CharField(max_length=300)
    piezas = models.JSONField(default=list)
    herramientas = models.JSONField(default=list)
    fallas = models.JSONField(default=list)
    cal_dias = models.PositiveIntegerField("Días entre calibraciones", default=0)

    class Meta:
        ordering = ["categoria", "id"]

    def __str__(self):
        return self.nombre


class Equipo(models.Model):
    CRITICIDAD = [("alta", "Alta"), ("media", "Media"), ("baja", "Baja")]
    ESTADOS = [("operando", "Operando"), ("detenido", "Detenido"), ("alarma", "Con alarma"), ("en_mantencion", "En mantención")]

    codigo = models.CharField("Código interno", max_length=20, unique=True)
    nombre_habitual = models.CharField("Nombre habitual", max_length=80)
    ficha = models.ForeignKey(Ficha, on_delete=models.PROTECT, related_name="equipos")
    zona = models.CharField(max_length=60)
    linea = models.CharField(max_length=40, blank=True)
    ubicacion = models.CharField("Ubicación", max_length=120)
    marca = models.CharField(max_length=60, blank=True)
    modelo = models.CharField(max_length=60, blank=True)
    criticidad = models.CharField(max_length=10, choices=CRITICIDAD, default="media")
    estado = models.CharField(max_length=15, choices=ESTADOS, default="operando")
    manual = models.FileField(upload_to="manuales/", blank=True)

    class Meta:
        ordering = ["zona", "codigo"]

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


class Herramienta(models.Model):
    ESTADOS = [("disponible", "Disponible"), ("prestada", "Prestada"), ("calibracion", "En calibración"), ("baja", "De baja")]
    ficha = models.ForeignKey(Ficha, on_delete=models.PROTECT, related_name="herramientas_inv")
    codigo = models.CharField(max_length=20, unique=True)
    estado = models.CharField(max_length=12, choices=ESTADOS, default="disponible")
    asignada_a = models.ForeignKey("Usuario", on_delete=models.SET_NULL, null=True, blank=True, related_name="herramientas")
    retirada_en = models.DateTimeField(null=True, blank=True)
    proxima_calibracion = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["ficha__nombre", "codigo"]

    @property
    def calibracion_vencida(self):
        return bool(self.proxima_calibracion and self.proxima_calibracion < timezone.localdate())


class Repuesto(models.Model):
    codigo = models.CharField(max_length=20, unique=True)
    nombre = models.CharField(max_length=120)
    tipo = models.CharField(max_length=60)
    bodega = models.CharField(max_length=60)
    ubicacion = models.CharField(max_length=30, blank=True)
    stock = models.PositiveIntegerField(default=0)
    stock_minimo = models.PositiveIntegerField(default=0)
    costo_unitario = models.PositiveIntegerField("Costo unitario (CLP)", default=0)
    critico = models.BooleanField("Repuesto crítico", default=False)
    fabricante = models.CharField(max_length=60, blank=True)
    numero_parte = models.CharField(max_length=60, blank=True)

    class Meta:
        ordering = ["nombre"]

    @property
    def bajo_minimo(self):
        return self.stock <= self.stock_minimo


# ------------------------------------------------------------------ fallas y órdenes
class Reporte(models.Model):
    ESTADOS = [("enviado", "Enviado"), ("tomado", "Tomado por un técnico"), ("resuelto", "Resuelto")]
    equipo = models.ForeignKey(Equipo, on_delete=models.PROTECT, related_name="reportes")
    operador = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name="reportes")
    descripcion = models.TextField("¿Qué le pasa a la máquina?")
    foto = models.FileField("Foto de la placa o la falla", upload_to="reportes/", blank=True)
    detiene_linea = models.BooleanField("Detiene la línea", default=False)
    estado = models.CharField(max_length=10, choices=ESTADOS, default="enviado")
    tecnico = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    creado = models.DateTimeField(default=timezone.now)
    uid = models.CharField(max_length=40, unique=True, null=True, blank=True)

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
    loto_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    loto_en = models.DateTimeField(null=True, blank=True)

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
    TIPOS = [("arreglo_menor", "Arreglé algo pequeño"), ("pendiente", "Falta algo por arreglar"),
             ("repuesto", "Falta un repuesto"), ("informativo", "Solo informo")]
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
    destino = models.CharField(max_length=60, blank=True)
    nivel = models.CharField(max_length=10, default="info")     # info | aviso | alarma
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
    TIPOS = [("equipo", "Equipo de mantenimiento"), ("optimizacion", "Optimización de máquinas"), ("preventivo", "Mantención preventiva")]
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


# ------------------------------------------------------------------ telemetría, paradas y producción
class Sensor(models.Model):
    equipo = models.ForeignKey(Equipo, on_delete=models.CASCADE, related_name="sensores")
    variable = models.CharField(max_length=30)
    nombre = models.CharField(max_length=60)
    unidad = models.CharField(max_length=10)
    escala_min = models.FloatField(default=0)
    escala_max = models.FloatField()
    nominal = models.FloatField()
    aviso = models.FloatField("Umbral de aviso")
    alarma = models.FloatField("Umbral de alarma")
    ultimo = models.FloatField(null=True, blank=True)
    ultimo_en = models.DateTimeField(null=True, blank=True)
    reciente = models.JSONField(default=list)       # últimos valores, para los gráficos pequeños
    deriva = models.FloatField(default=0)           # 0..1: avance de una falla simulada

    class Meta:
        unique_together = [("equipo", "variable")]
        ordering = ["equipo_id", "id"]

    @property
    def nivel(self):
        if self.ultimo is None:
            return "sin_dato"
        return "alarma" if self.ultimo >= self.alarma else "aviso" if self.ultimo >= self.aviso else "normal"


class Lectura(models.Model):
    sensor = models.ForeignKey(Sensor, on_delete=models.CASCADE, related_name="lecturas")
    valor = models.FloatField()
    ts = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["ts"]


class Alarma(models.Model):
    NIVELES = [("aviso", "Aviso"), ("alarma", "Alarma")]
    equipo = models.ForeignKey(Equipo, on_delete=models.CASCADE, related_name="alarmas")
    sensor = models.ForeignKey(Sensor, on_delete=models.SET_NULL, null=True, blank=True, related_name="eventos")
    nivel = models.CharField(max_length=6, choices=NIVELES)
    mensaje = models.CharField(max_length=200)
    inicio = models.DateTimeField(default=timezone.now)
    fin = models.DateTimeField(null=True, blank=True)
    reconocida_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    reconocida_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-inicio"]


class Parada(models.Model):
    MOTIVOS = [("falla", "Falla del equipo"), ("cambio_formato", "Cambio de formato"), ("falta_material", "Falta de material"),
               ("sin_operador", "Sin operador"), ("calidad", "Ajuste por calidad"), ("planificada", "Mantención planificada"), ("otro", "Otro")]
    equipo = models.ForeignKey(Equipo, on_delete=models.CASCADE, related_name="paradas")
    inicio = models.DateTimeField(default=timezone.now)
    fin = models.DateTimeField(null=True, blank=True)
    motivo = models.CharField(max_length=15, choices=MOTIVOS, default="falla")
    automatica = models.BooleanField(default=False)
    nota = models.CharField(max_length=200, blank=True)
    registrada_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")

    class Meta:
        ordering = ["-inicio"]

    @property
    def minutos(self):
        return round(((self.fin or timezone.now()) - self.inicio).total_seconds() / 60)


class RegistroProduccion(models.Model):
    equipo = models.ForeignKey(Equipo, on_delete=models.CASCADE, related_name="producciones")
    fecha = models.DateField()
    minutos_planificados = models.PositiveIntegerField(default=960)
    minutos_parada = models.PositiveIntegerField(default=0)
    plan = models.PositiveIntegerField("Unidades buenas planificadas")
    ideal = models.PositiveIntegerField("Unidades posibles al ritmo ideal")
    producidas = models.PositiveIntegerField()
    buenas = models.PositiveIntegerField()

    class Meta:
        ordering = ["-fecha"]
        unique_together = [("equipo", "fecha")]


# ------------------------------------------------------------------ rutinas, turnos, calidad y seguridad
class PlantillaRutina(models.Model):
    FRECUENCIAS = [("turno", "Por turno"), ("semanal", "Semanal"), ("mensual", "Mensual"), ("trimestral", "Trimestral")]
    nombre = models.CharField(max_length=120)
    frecuencia = models.CharField(max_length=12, choices=FRECUENCIAS)
    aplica_a = models.CharField(max_length=10, default="equipo")   # equipo | turno
    items = models.JSONField(default=list)
    perfiles = models.JSONField(default=list)                      # perfiles que la ejecutan

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.nombre


class EjecucionRutina(models.Model):
    plantilla = models.ForeignKey(PlantillaRutina, on_delete=models.PROTECT, related_name="ejecuciones")
    equipo = models.ForeignKey(Equipo, on_delete=models.SET_NULL, null=True, blank=True, related_name="ejecuciones")
    usuario = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name="ejecuciones")
    items_ok = models.JSONField(default=list)
    observacion = models.CharField(max_length=300, blank=True)
    creado = models.DateTimeField(default=timezone.now)
    uid = models.CharField(max_length=40, unique=True, null=True, blank=True)

    class Meta:
        ordering = ["-creado"]

    @property
    def completa(self):
        return bool(self.items_ok) and all(self.items_ok)


class TraspasoTurno(models.Model):
    autor = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name="traspasos")
    turno = models.CharField(max_length=1)
    resumen = models.JSONField(default=dict)
    notas = models.TextField(blank=True)
    responsables = models.CharField(max_length=200, blank=True)
    creado = models.DateTimeField(default=timezone.now)
    uid = models.CharField(max_length=40, unique=True, null=True, blank=True)

    class Meta:
        ordering = ["-creado"]


class NoConformidad(models.Model):
    ESTADOS = [("contenido", "Contenido"), ("en_analisis", "En análisis"), ("liberado", "Liberado"), ("rechazado", "Rechazado")]
    lote = models.CharField(max_length=30)
    equipo = models.ForeignKey(Equipo, on_delete=models.SET_NULL, null=True, blank=True)
    producto = models.CharField(max_length=100)
    defecto = models.CharField(max_length=200)
    cantidad = models.PositiveIntegerField()
    estado = models.CharField(max_length=12, choices=ESTADOS, default="contenido")
    disposicion = models.CharField(max_length=200, blank=True)
    reportado_por = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name="+")
    creado = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-creado"]


class Incidente(models.Model):
    TIPOS = [("condicion_insegura", "Condición insegura"), ("casi_accidente", "Casi accidente"), ("incidente", "Incidente")]
    ESTADOS = [("abierto", "Abierto"), ("en_investigacion", "En investigación"), ("cerrado", "Cerrado")]
    tipo = models.CharField(max_length=20, choices=TIPOS, default="condicion_insegura")
    descripcion = models.TextField("¿Qué pasó o qué vio?")
    ubicacion = models.CharField(max_length=120, blank=True)
    equipo = models.ForeignKey(Equipo, on_delete=models.SET_NULL, null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default="abierto")
    reportado_por = models.ForeignKey(Usuario, on_delete=models.PROTECT, related_name="+")
    creado = models.DateTimeField(default=timezone.now)
    uid = models.CharField(max_length=40, unique=True, null=True, blank=True)

    class Meta:
        ordering = ["-creado"]


class AccionHSE(models.Model):
    descripcion = models.CharField(max_length=240)
    incidente = models.ForeignKey(Incidente, on_delete=models.SET_NULL, null=True, blank=True, related_name="acciones")
    responsable = models.CharField(max_length=80, blank=True)
    vence = models.DateField()
    cerrada_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["cerrada_en", "vence"]

    @property
    def vencida(self):
        return self.cerrada_en is None and self.vence < timezone.localdate()


class MedicionKPI(models.Model):
    clave = models.CharField(max_length=30)
    periodo = models.DateField()
    valor = models.FloatField()

    class Meta:
        unique_together = [("clave", "periodo")]
        ordering = ["periodo"]


# ------------------------------------------------------------------ oficina (web)
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
    ESTADOS = [("planificado", "Planificado"), ("en_curso", "En curso"), ("bloqueado", "Bloqueado"), ("completado", "Completado")]
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
    ESTADOS = [("programado", "Programado"), ("en_ruta", "En ruta"), ("entregado", "Entregado"), ("retrasado", "Retrasado")]
    codigo = models.CharField(max_length=20, unique=True)
    origen = models.CharField(max_length=80)
    destino = models.CharField(max_length=80)
    carga = models.CharField(max_length=120)
    vehiculo = models.CharField(max_length=60, blank=True)
    conductor = models.CharField(max_length=80, blank=True)
    estado = models.CharField(max_length=12, choices=ESTADOS, default="programado")
    fecha_salida = models.DateField()
    fecha_llegada = models.DateField("Llegada estimada o real", null=True, blank=True)
    fecha_compromiso = models.DateField("Fecha comprometida con el cliente", null=True, blank=True)
    completo = models.BooleanField("Entrega completa", default=True)
    costo = models.PositiveIntegerField("Costo (CLP)", default=0)

    class Meta:
        ordering = ["-fecha_salida"]
