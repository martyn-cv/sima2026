"""API JSON de SIMA v2. Una sola API para la web, la app de terreno y la app de escritorio."""
import base64
import json
import os
import uuid
from collections import defaultdict
from datetime import timedelta
from functools import wraps

from django.conf import settings
from django.contrib.auth import authenticate
from django.core.exceptions import FieldDoesNotExist, PermissionDenied
from django.core.files.base import ContentFile
from django.core.signing import BadSignature, TimestampSigner
from django.db import IntegrityError, transaction
from django.db.models import F, Q
from django.forms import modelform_factory
from django.forms.models import model_to_dict
from django.http import Http404, JsonResponse
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from django.views.decorators.csrf import csrf_exempt
from django.views.static import serve as servir_archivo

from . import models as m
from . import planta
from .perfiles import ALL, GERENCIAL, MANT, MANT_GEST, PERFILES, PRODUCCION, ROLES_APP, ROLES_WEB

TOKEN_HORAS = 12
signer = TimestampSigner(salt="sima-token")
CLAVE_INGESTA = os.environ.get("SIMA_INGESTA_KEY", "dev-ingesta-sima")
SOLO_COMPARTIDOS = tuple(p for p in ALL if p not in ("jefe_mant", "supervisor_mant", "ing_automatizacion", "gerencia", "produccion_ing"))
VE_TODO_EJEC = ("supervisor_turno", "jefe_mant", "supervisor_mant", "gerencia", "produccion_ing", "prevencion")


# ------------------------------------------------------------------ infraestructura
class Error(Exception):
    def __init__(self, estado, mensaje, campos=None):
        self.estado, self.mensaje, self.campos = estado, mensaje, campos or {}


def usuario_de(request):
    h = request.headers.get("Authorization", "")
    token = h[7:] if h.startswith("Bearer ") else request.GET.get("t", "")
    try:
        uid = signer.unsign(token, max_age=TOKEN_HORAS * 3600)
    except BadSignature:
        return None
    return m.Usuario.objects.filter(pk=uid, is_active=True).select_related("cargo").first()


def vista(*roles, publica=False, clave_ingesta=False):
    """Decorador: JSON de entrada/salida, token y control de perfil. Sin perfiles = cualquier usuario con sesión."""
    def deco(fn):
        @csrf_exempt
        @wraps(fn)
        def w(request, *a, **kw):
            try:
                if clave_ingesta:
                    if request.headers.get("X-API-Key") != CLAVE_INGESTA:
                        raise Error(401, "Clave de ingesta incorrecta.")
                elif not publica:
                    request.user = usuario_de(request)
                    if request.user is None:
                        raise Error(401, "Inicie sesión para continuar.")
                    if roles and request.user.rol not in roles:
                        raise Error(403, "Su perfil no tiene acceso a esta función.")
                resp = fn(request, *a, **kw)
                return resp if hasattr(resp, "status_code") else JsonResponse(resp, safe=False)
            except Error as e:
                return JsonResponse({"error": e.mensaje, "campos": e.campos}, status=e.estado)
            except PermissionDenied:
                return JsonResponse({"error": "Su perfil no tiene acceso a esta función."}, status=403)
            except Http404:
                return JsonResponse({"error": "No se encontró lo que busca."}, status=404)
        return w
    return deco


def cuerpo(request):
    if request.body and "json" in request.headers.get("Content-Type", ""):
        try:
            d = json.loads(request.body)
        except ValueError:
            raise Error(400, "El mensaje enviado no es válido.")
        if not isinstance(d, dict):
            raise Error(400, "El mensaje enviado no es válido.")
        return d
    return request.POST.dict()


def solo(request, *metodos):
    if request.method not in metodos:
        raise Error(405, "Método no permitido.")


def etiqueta(v):
    if v is None:
        return ""
    return getattr(v, "nombre_habitual", None) or getattr(v, "nombre", None) or getattr(v, "codigo", None) or str(v)


def serializar(obj, campos, extras=None):
    out = {}
    for c in campos:
        try:
            campo = obj._meta.get_field(c)
        except FieldDoesNotExist:
            campo = None
        v = getattr(obj, c)
        if campo is not None and campo.is_relation:
            out[c] = getattr(obj, c + "_id")
            out[c + "_nombre"] = etiqueta(v)
            continue
        if campo is not None and campo.get_internal_type() == "FileField":
            out[c] = f"/api/media/{v.name}" if v else ""
            continue
        if campo is not None and campo.choices:
            out[c + "_display"] = getattr(obj, f"get_{c}_display")()
        if hasattr(v, "isoformat"):
            v = timezone.localtime(v).isoformat() if hasattr(v, "hour") and timezone.is_aware(v) else v.isoformat()
        elif v.__class__.__name__ == "Decimal":
            v = float(v)
        out[c] = v
    for k, fn in (extras or {}).items():
        out[k] = fn(obj)
    return out


def guardar_b64(obj, campo, b64, nombre):
    """Guarda un archivo enviado como base64 (así también funciona lo registrado sin conexión)."""
    if not b64:
        return
    if "," in b64[:80]:
        b64 = b64.split(",", 1)[1]
    try:
        datos = base64.b64decode(b64, validate=False)
    except ValueError:
        raise Error(400, "El archivo adjunto no es válido.")
    if len(datos) > 8 * 1024 * 1024:
        raise Error(400, "El archivo supera los 8 MB.")
    ext = (nombre or "foto.jpg").rsplit(".", 1)[-1].lower()[:5]
    if ext not in ("jpg", "jpeg", "png", "webp", "pdf", "doc", "docx"):
        raise Error(400, "Tipo de archivo no permitido.")
    getattr(obj, campo).save(f"{uuid.uuid4().hex[:12]}.{ext}", ContentFile(datos), save=False)


def notificar(roles, texto, destino="", excluir=None, nivel="info"):
    qs = m.Usuario.objects.filter(rol__in=roles, is_active=True)
    if excluir:
        qs = qs.exclude(pk=excluir.pk)
    m.Notificacion.objects.bulk_create([m.Notificacion(usuario=u, texto=texto[:200], destino=destino, nivel=nivel) for u in qs])


def hecho_en(d):
    t = parse_datetime(str(d.get("hecho_en") or ""))
    return min(t, timezone.now()) if t and timezone.is_aware(t) else None


# ------------------------------------------------------------------ recursos genéricos
RECURSOS = {}


def recurso(nombre, modelo, campos, leer, crear=(), editar=(), campos_crear=(), campos_editar=(), buscar=(),
            extras=None, alcance=None, ficha=None, ruta=None, tipo=None, filtros=()):
    RECURSOS[nombre] = dict(nombre=nombre, modelo=modelo, campos=campos, leer=leer, crear=crear, editar=editar,
                            campos_crear=list(campos_crear), campos_editar=list(campos_editar), buscar=buscar,
                            extras=extras or {}, alcance=alcance, ficha=ficha, ruta=ruta, tipo=tipo, filtros=filtros or campos)


def _solo(campo):
    return lambda u, qs: qs.filter(**{campo: u})


recurso("fichas", m.Ficha, ["id", "categoria", "icono", "nombre", "funcion", "especificaciones", "piezas", "herramientas", "fallas", "cal_dias"], ALL,
        buscar=("nombre", "funcion", "especificaciones"), tipo="Catálogo técnico",
        ficha=(lambda o: o.nombre, lambda o: f"{o.get_categoria_display()} · {o.funcion[:60]}"), ruta=lambda o: f"catalogo/{o.pk}")

recurso("cargos", m.Cargo, ["id", "numero", "familia", "familia_nombre", "nombre", "existe", "hace", "entrega", "coordina", "medir", "conocimientos", "perfil"], ALL,
        buscar=("nombre", "familia_nombre", "existe", "hace", "conocimientos"), tipo="Cargo",
        ficha=(lambda o: f"{o.numero:02d} · {o.nombre}", lambda o: o.familia_nombre), ruta=lambda o: "organizacion")

recurso("equipos", m.Equipo, ["id", "codigo", "nombre_habitual", "ficha", "zona", "linea", "ubicacion", "marca", "modelo", "criticidad", "estado", "manual"], ALL,
        crear=("jefe_mant", "produccion_ing"), editar=("jefe_mant", "produccion_ing"),
        campos_crear=["codigo", "nombre_habitual", "ficha", "zona", "linea", "ubicacion", "marca", "modelo", "criticidad"],
        campos_editar=["nombre_habitual", "zona", "linea", "ubicacion", "marca", "modelo", "criticidad", "estado"],
        buscar=("nombre_habitual", "codigo", "ubicacion", "marca", "zona", "ficha__nombre"), tipo="Equipo",
        ficha=(lambda o: o.nombre_habitual, lambda o: f"{o.zona} · {o.codigo}"), ruta=lambda o: f"equipos/{o.pk}",
        extras={"icono": lambda o: o.ficha.icono, "categoria": lambda o: o.ficha.nombre})

recurso("plcs", m.PLC, ["id", "equipo", "nombre", "marca", "modelo", "ip", "programa_version", "estado", "ultima_revision", "observaciones"],
        ("ing_automatizacion", "jefe_mant", "supervisor_mant", "confiabilidad", "tecnico") + GERENCIAL,
        crear=("ing_automatizacion",), editar=("ing_automatizacion",),
        campos_crear=["equipo", "nombre", "marca", "modelo", "ip", "programa_version", "estado", "ultima_revision", "observaciones"],
        campos_editar=["nombre", "ip", "programa_version", "estado", "ultima_revision", "observaciones"],
        buscar=("nombre", "marca", "modelo", "ip", "equipo__nombre_habitual"), tipo="PLC",
        ficha=(lambda o: o.nombre, lambda o: f"{o.marca} {o.modelo} · {o.get_estado_display()}"), ruta=lambda o: f"plcs/{o.pk}")

recurso("repuestos", m.Repuesto, ["id", "codigo", "nombre", "tipo", "bodega", "ubicacion", "stock", "stock_minimo", "costo_unitario", "critico", "fabricante", "numero_parte"],
        MANT + ("panol", "logistica", "finanzas_adm", "supervisor_turno", "calidad_terreno") + GERENCIAL,
        crear=("panol", "jefe_mant", "logistica"), editar=("panol", "jefe_mant", "logistica"),
        campos_crear=["codigo", "nombre", "tipo", "bodega", "ubicacion", "stock", "stock_minimo", "costo_unitario", "critico", "fabricante", "numero_parte"],
        campos_editar=["nombre", "tipo", "bodega", "ubicacion", "stock", "stock_minimo", "costo_unitario", "critico", "fabricante", "numero_parte"],
        buscar=("nombre", "codigo", "tipo", "bodega", "fabricante", "numero_parte"), tipo="Repuesto",
        ficha=(lambda o: o.nombre, lambda o: f"{o.bodega} · stock {o.stock}"), ruta=lambda o: "repuestos",
        extras={"bajo_minimo": lambda o: o.bajo_minimo})

recurso("herramientas", m.Herramienta, ["id", "ficha", "codigo", "estado", "asignada_a", "retirada_en", "proxima_calibracion"],
        MANT + ("panol", "calidad_terreno", "supervisor_turno"), crear=("panol", "instrumentacion"), editar=("panol", "instrumentacion"),
        campos_crear=["ficha", "codigo", "proxima_calibracion"], campos_editar=["estado", "proxima_calibracion"],
        buscar=("codigo", "ficha__nombre"), tipo="Herramienta",
        ficha=(lambda o: f"{o.ficha.nombre} {o.codigo}", lambda o: o.get_estado_display()), ruta=lambda o: "herramientas",
        extras={"calibracion_vencida": lambda o: o.calibracion_vencida, "requiere_calibracion": lambda o: o.ficha.cal_dias > 0,
                "icono": lambda o: o.ficha.icono, "nombre": lambda o: o.ficha.nombre})

recurso("reportes", m.Reporte, ["id", "equipo", "operador", "descripcion", "foto", "detiene_linea", "estado", "tecnico", "creado"], ALL,
        crear=ROLES_APP, campos_crear=["equipo", "descripcion", "detiene_linea"],
        buscar=("descripcion", "equipo__nombre_habitual"), tipo="Reporte de falla",
        alcance=lambda u, qs: qs.filter(operador=u) if u.rol == "operador" else qs,
        ficha=(lambda o: f"{o.equipo.nombre_habitual}: {o.descripcion[:60]}", lambda o: o.get_estado_display()), ruta=lambda o: "reportes",
        extras={"orden_id": lambda o: getattr(getattr(o, "orden", None), "id", None)})

recurso("ordenes", m.OrdenTrabajo, ["id", "equipo", "titulo", "descripcion", "tipo", "prioridad", "estado", "asignado_a", "creada", "cerrada_en", "loto_por", "loto_en"],
        MANT + ("supervisor_turno", "panol") + ROLES_WEB, crear=MANT, editar=MANT_GEST,
        campos_crear=["equipo", "titulo", "descripcion", "tipo", "prioridad", "asignado_a"], campos_editar=["titulo", "descripcion", "prioridad", "asignado_a"],
        buscar=("titulo", "descripcion", "equipo__nombre_habitual"), tipo="Orden de trabajo",
        ficha=(lambda o: f"{o.numero} · {o.titulo}", lambda o: f"{o.equipo.nombre_habitual} · {o.get_estado_display()}"), ruta=lambda o: f"ordenes/{o.pk}",
        extras={"numero": lambda o: o.numero, "sin_avance": lambda o: o.sin_avance, "horas_sin_avance": lambda o: o.horas_sin_avance,
                "horas_trabajadas": lambda o: o.horas_trabajadas, "equipo_criticidad": lambda o: o.equipo.criticidad, "reporte_id": lambda o: o.reporte_id,
                "equipo_ficha": lambda o: o.equipo.ficha_id})

recurso("avisos", m.Aviso, ["id", "tipo", "equipo", "texto", "autor", "atendido", "atendido_por", "creado"], MANT,
        crear=("tecnico", "confiabilidad", "ing_automatizacion", "instrumentacion"), editar=MANT_GEST + ("ing_automatizacion",),
        campos_crear=["tipo", "equipo", "texto"], campos_editar=["atendido"], buscar=("texto", "equipo__nombre_habitual"), tipo="Aviso de técnico",
        alcance=lambda u, qs: qs.filter(autor=u) if u.rol in ("tecnico", "confiabilidad", "instrumentacion") else qs,
        ficha=(lambda o: f"{o.equipo.nombre_habitual}: {o.texto[:60]}", lambda o: o.get_tipo_display()), ruta=lambda o: "avisos")

recurso("notas", m.Nota, ["id", "titulo", "texto", "tipo", "equipo", "autor", "creada"], MANT, crear=MANT, campos_crear=["titulo", "texto", "tipo", "equipo"],
        buscar=("titulo", "texto", "equipo__nombre_habitual"), tipo="Nota", ficha=(lambda o: o.titulo, lambda o: o.texto[:80]), ruta=lambda o: "notas")

recurso("planes", m.Plan, ["id", "titulo", "tipo", "equipo", "responsable", "fecha_inicio", "fecha_fin", "descripcion", "estado"],
        MANT + ("supervisor_turno", "logistica") + GERENCIAL, crear=("jefe_mant", "supervisor_mant"), editar=("jefe_mant", "supervisor_mant"),
        campos_crear=["titulo", "tipo", "equipo", "responsable", "fecha_inicio", "fecha_fin", "descripcion"],
        campos_editar=["titulo", "estado", "responsable", "fecha_inicio", "fecha_fin", "descripcion"],
        buscar=("titulo", "descripcion", "equipo__nombre_habitual"), tipo="Plan de mantención",
        ficha=(lambda o: o.titulo, lambda o: f"{o.fecha_inicio:%d/%m} – {o.fecha_fin:%d/%m} · {o.get_estado_display()}"), ruta=lambda o: "planificacion")

recurso("informes", m.Informe, ["id", "titulo", "contenido", "compartido", "autor", "creado"], ALL, crear=MANT_GEST + ("ing_automatizacion",),
        editar=MANT_GEST + ("ing_automatizacion",), campos_crear=["titulo", "contenido", "compartido"], campos_editar=["compartido"],
        buscar=("titulo", "contenido"), tipo="Informe",
        alcance=lambda u, qs: qs.filter(compartido=True) if u.rol in SOLO_COMPARTIDOS else qs,
        ficha=(lambda o: o.titulo, lambda o: "Compartido" if o.compartido else "Privado"), ruta=lambda o: "informes")

recurso("notificaciones", m.Notificacion, ["id", "texto", "destino", "nivel", "leida", "creada"], ALL, alcance=_solo("usuario"))

recurso("alarmas", m.Alarma, ["id", "equipo", "sensor", "nivel", "mensaje", "inicio", "fin", "reconocida_por", "reconocida_en"],
        PRODUCCION + MANT + ("calidad_terreno", "prevencion", "panol") + GERENCIAL, tipo="Alarma",
        buscar=("mensaje", "equipo__nombre_habitual"), ficha=(lambda o: o.mensaje, lambda o: o.get_nivel_display()), ruta=lambda o: "monitor",
        extras={"activa": lambda o: o.fin is None})

recurso("paradas", m.Parada, ["id", "equipo", "inicio", "fin", "motivo", "automatica", "nota", "registrada_por"],
        PRODUCCION + MANT + GERENCIAL + ("logistica",), crear=("supervisor_turno", "tecnico", "supervisor_mant", "jefe_mant"),
        editar=("supervisor_turno", "tecnico", "supervisor_mant", "jefe_mant"), campos_crear=["equipo", "inicio", "motivo", "nota"],
        campos_editar=["fin", "motivo", "nota"], buscar=("nota", "equipo__nombre_habitual"), tipo="Parada",
        ficha=(lambda o: f"Parada de {o.equipo.nombre_habitual}", lambda o: o.get_motivo_display()), ruta=lambda o: "paradas",
        extras={"minutos": lambda o: o.minutos, "activa": lambda o: o.fin is None})

recurso("produccion", m.RegistroProduccion, ["id", "equipo", "fecha", "minutos_planificados", "minutos_parada", "plan", "ideal", "producidas", "buenas"],
        ("supervisor_turno", "calidad_terreno", "calidad_gestion", "jefe_mant") + GERENCIAL + ("logistica",), crear=("supervisor_turno",),
        campos_crear=["equipo", "fecha", "minutos_planificados", "minutos_parada", "plan", "ideal", "producidas", "buenas"])

recurso("plantillas", m.PlantillaRutina, ["id", "nombre", "frecuencia", "aplica_a", "items", "perfiles"], ROLES_APP)
recurso("ejecuciones", m.EjecucionRutina, ["id", "plantilla", "equipo", "usuario", "items_ok", "observacion", "creado"], ROLES_APP,
        crear=ROLES_APP, campos_crear=["plantilla", "equipo", "items_ok", "observacion"],
        alcance=lambda u, qs: qs if u.rol in VE_TODO_EJEC else qs.filter(usuario=u),
        extras={"completa": lambda o: o.completa})
recurso("traspasos", m.TraspasoTurno, ["id", "autor", "turno", "resumen", "notas", "responsables", "creado"], ("supervisor_turno", "jefe_mant", "supervisor_mant") + GERENCIAL,
        crear=("supervisor_turno",), campos_crear=["turno", "resumen", "notas", "responsables"])

recurso("noconformidades", m.NoConformidad, ["id", "lote", "equipo", "producto", "defecto", "cantidad", "estado", "disposicion", "reportado_por", "creado"],
        ("calidad_terreno", "calidad_gestion", "supervisor_turno", "operador", "gerencia", "produccion_ing", "comercial"),
        crear=("calidad_terreno", "supervisor_turno", "operador"), editar=("calidad_terreno", "calidad_gestion"),
        campos_crear=["lote", "equipo", "producto", "defecto", "cantidad", "estado", "disposicion"], campos_editar=["estado", "disposicion"],
        buscar=("lote", "producto", "defecto"), tipo="No conformidad", ficha=(lambda o: f"Lote {o.lote}: {o.defecto[:50]}", lambda o: o.get_estado_display()), ruta=lambda o: "calidad")

recurso("incidentes", m.Incidente, ["id", "tipo", "descripcion", "ubicacion", "equipo", "estado", "reportado_por", "creado"], ALL,
        crear=ROLES_APP, editar=("prevencion", "gerencia"), campos_crear=["tipo", "descripcion", "ubicacion", "equipo"], campos_editar=["estado"],
        buscar=("descripcion", "ubicacion"), tipo="Incidente",
        alcance=lambda u, qs: qs if u.rol in VE_TODO_EJEC + ("rrhh",) else qs.filter(reportado_por=u),
        ficha=(lambda o: o.descripcion[:70], lambda o: f"{o.get_tipo_display()} · {o.get_estado_display()}"), ruta=lambda o: "seguridad")

recurso("acciones_hse", m.AccionHSE, ["id", "descripcion", "incidente", "responsable", "vence", "cerrada_en"],
        ("prevencion", "gerencia", "supervisor_turno", "rrhh", "produccion_ing"), crear=("prevencion",), editar=("prevencion",),
        campos_crear=["descripcion", "incidente", "responsable", "vence"], campos_editar=["responsable", "vence", "cerrada_en"],
        extras={"vencida": lambda o: o.vencida})

recurso("contratos", m.Contrato, ["id", "trabajador", "rut", "cargo", "area", "tipo", "fecha_inicio", "fecha_fin", "sueldo_bruto", "estado"],
        ("finanzas_adm", "gerencia", "rrhh"), crear=("rrhh", "finanzas_adm"), editar=("rrhh", "finanzas_adm"),
        campos_crear=["trabajador", "rut", "cargo", "area", "tipo", "fecha_inicio", "fecha_fin", "sueldo_bruto"],
        campos_editar=["cargo", "area", "tipo", "fecha_fin", "sueldo_bruto", "estado"], buscar=("trabajador", "rut", "cargo", "area"), tipo="Contrato",
        ficha=(lambda o: o.trabajador, lambda o: f"{o.cargo} · {o.get_tipo_display()}"), ruta=lambda o: "contratos",
        extras={"dias_para_vencer": lambda o: o.dias_para_vencer})

recurso("movimientos", m.Movimiento, ["id", "fecha", "tipo", "categoria", "centro_costo", "descripcion", "monto"], ("finanzas_adm", "gerencia", "produccion_ing"),
        crear=("finanzas_adm",), editar=("finanzas_adm",), campos_crear=["fecha", "tipo", "categoria", "centro_costo", "descripcion", "monto"],
        campos_editar=["categoria", "centro_costo", "descripcion", "monto"], buscar=("descripcion", "categoria", "centro_costo"), tipo="Movimiento",
        ficha=(lambda o: o.descripcion, lambda o: f"{o.get_tipo_display()} · ${o.monto:,}".replace(",", ".")), ruta=lambda o: "finanzas")

recurso("procesos", m.Proceso, ["id", "nombre", "area", "responsable", "estado", "avance", "fecha_inicio", "fecha_fin", "descripcion"],
        ROLES_WEB + MANT_GEST + ("supervisor_turno",), crear=("produccion_ing", "calidad_gestion", "gerencia"), editar=("produccion_ing", "calidad_gestion", "gerencia"),
        campos_crear=["nombre", "area", "responsable", "estado", "avance", "fecha_inicio", "fecha_fin", "descripcion"],
        campos_editar=["nombre", "area", "responsable", "estado", "avance", "fecha_inicio", "fecha_fin", "descripcion"],
        buscar=("nombre", "area", "responsable", "descripcion"), tipo="Proceso",
        ficha=(lambda o: o.nombre, lambda o: f"{o.area} · {o.get_estado_display()} · {o.avance}%"), ruta=lambda o: "procesos")

recurso("despachos", m.Despacho, ["id", "codigo", "origen", "destino", "carga", "vehiculo", "conductor", "estado", "fecha_salida", "fecha_llegada", "fecha_compromiso", "completo", "costo"],
        ("logistica", "gerencia", "comercial", "produccion_ing", "finanzas_adm"), crear=("logistica",), editar=("logistica",),
        campos_crear=["codigo", "origen", "destino", "carga", "vehiculo", "conductor", "estado", "fecha_salida", "fecha_llegada", "fecha_compromiso", "completo", "costo"],
        campos_editar=["origen", "destino", "carga", "vehiculo", "conductor", "estado", "fecha_salida", "fecha_llegada", "fecha_compromiso", "completo", "costo"],
        buscar=("codigo", "origen", "destino", "carga", "conductor"), tipo="Despacho",
        ficha=(lambda o: f"{o.codigo} · {o.origen} → {o.destino}", lambda o: o.get_estado_display()), ruta=lambda o: "transporte")

recurso("usuarios", m.Usuario, ["id", "nombre_completo", "rol", "turno"], ALL, buscar=("nombre_completo",))
RECURSOS["usuarios"]["extras"] = {"nombre": lambda o: o.nombre, "rol_nombre": lambda o: o.get_rol_display(),
                                  "cargo_nombre": lambda o: o.cargo.nombre if o.cargo_id else ""}


def permisos_de(user):
    return {n: {"leer": user.rol in r["leer"], "crear": user.rol in r["crear"], "editar": user.rol in r["editar"]} for n, r in RECURSOS.items()}


def cfg_o_404(nombre, user, accion="leer"):
    cfg = RECURSOS.get(nombre)
    if cfg is None:
        raise Http404
    if user.rol not in cfg[accion]:
        raise Error(403, "Su perfil no tiene acceso a esta función.")
    return cfg


def queryset(cfg, user):
    qs = cfg["modelo"].objects.all()
    if cfg["nombre"] == "usuarios":
        qs = qs.filter(is_active=True)
    return cfg["alcance"](user, qs) if cfg["alcance"] else qs


def _filtrar(params, user, cfg, qs):
    q = params.get("q", "").strip()
    if q and cfg["buscar"]:
        cond = Q()
        for f in cfg["buscar"]:
            cond |= Q(**{f + "__icontains": q})
        qs = qs.filter(cond)
    for f in cfg["filtros"]:
        if f in params:
            v = params[f]
            qs = qs.filter(**({f + "__in": v.split(",")} if "," in v else {f: v}))
    if "excluir_estado" in params:
        qs = qs.exclude(estado__in=params["excluir_estado"].split(","))
    if params.get("activas") == "1":
        qs = qs.filter(fin__isnull=True)
    if params.get("mias") == "1":
        for c in ("asignado_a", "responsable", "autor", "usuario", "asignada_a"):
            if c in [f.name for f in qs.model._meta.fields]:
                qs = qs.filter(**{c: user})
                break
    return qs


def _errores_form(form):
    return {k: " ".join(v) for k, v in form.errors.items()}


@vista()
def lista(request, recurso):
    cfg = cfg_o_404(recurso, request.user)
    if request.method == "POST":
        return crear(request, cfg)
    solo(request, "GET")
    qs = _filtrar(request.GET, request.user, cfg, queryset(cfg, request.user))
    try:
        limite = min(int(request.GET.get("limite", 300)), 1500)
    except ValueError:
        limite = 300
    qs = qs.select_related(*[f.name for f in cfg["modelo"]._meta.fields if f.is_relation and f.many_to_one])
    return {"resultados": [serializar(o, cfg["campos"], cfg["extras"]) for o in qs[:limite]]}


def crear(request, cfg):
    if request.user.rol not in cfg["crear"]:
        raise Error(403, "Su perfil no puede crear este registro.")
    d = cuerpo(request)
    uid = str(d.get("uid") or "")[:40] or None
    modelo = cfg["modelo"]
    if uid and hasattr(modelo, "uid") and modelo.objects.filter(uid=uid).exists():   # ya sincronizado antes
        return {"ok": True, "ya_existia": True, **serializar(modelo.objects.get(uid=uid), cfg["campos"], cfg["extras"])}
    form = modelform_factory(modelo, fields=cfg["campos_crear"])(d)
    if not form.is_valid():
        raise Error(400, "Revise los datos ingresados.", _errores_form(form))
    obj = form.save(commit=False)
    _completar_al_crear(request.user, cfg["nombre"], obj, d, uid)
    try:
        with transaction.atomic():
            obj.save()
    except IntegrityError:
        return {"ok": True, "ya_existia": True}
    _despues_de_crear(request.user, cfg["nombre"], obj)
    return JsonResponse({"ok": True, **serializar(obj, cfg["campos"], cfg["extras"])}, status=201)


def _completar_al_crear(user, nombre, obj, d, uid):
    hecho = hecho_en(d)
    if nombre == "reportes":
        obj.operador, obj.uid = user, uid
        if hecho:
            obj.creado = hecho
        guardar_b64(obj, "foto", d.get("foto_b64"), d.get("foto_nombre"))
    elif nombre in ("avisos", "ejecuciones", "traspasos", "incidentes"):
        if nombre == "avisos":
            obj.autor = user
        elif nombre == "ejecuciones":
            obj.usuario = user
        elif nombre == "traspasos":
            obj.autor = user
        else:
            obj.reportado_por = user
        obj.uid = uid
        if hecho:
            obj.creado = hecho
    elif nombre in ("notas", "informes"):
        obj.autor = user
    elif nombre in ("ordenes", "planes", "movimientos"):
        obj.creado_por = user
    elif nombre == "noconformidades":
        obj.reportado_por = user
    elif nombre == "paradas":
        obj.registrada_por = user


def _despues_de_crear(user, nombre, obj):
    if nombre == "reportes":
        marca = "DETIENE LA LÍNEA · " if obj.detiene_linea else ""
        notificar(("tecnico", "supervisor_mant", "supervisor_turno"), f"{marca}Falla en {obj.equipo.nombre_habitual}: {obj.descripcion[:80]}",
                  "reportes", excluir=user, nivel="alarma" if obj.detiene_linea else "aviso")
    elif nombre == "avisos":
        notificar(("supervisor_mant", "jefe_mant"), f"{user.nombre.split('·')[0].strip()} · {obj.get_tipo_display()} en {obj.equipo.nombre_habitual}", "avisos", excluir=user)
    elif nombre == "incidentes":
        notificar(("prevencion", "supervisor_turno"), f"{obj.get_tipo_display()}: {obj.descripcion[:90]}", "seguridad", excluir=user, nivel="aviso")
    elif nombre == "noconformidades":
        notificar(("calidad_terreno", "calidad_gestion"), f"No conformidad en lote {obj.lote}: {obj.defecto[:80]}", "calidad", excluir=user, nivel="aviso")
    elif nombre == "traspasos":
        notificar(("supervisor_turno", "supervisor_mant"), f"Traspaso de turno de {user.nombre.split('·')[0].strip()}", "traspaso", excluir=user)
    elif nombre == "paradas":
        eq = obj.equipo
        if obj.fin is None and eq.estado == "operando":
            eq.estado = "en_mantencion" if obj.motivo == "planificada" else "detenido"
            eq.save(update_fields=["estado"])


@vista()
def detalle(request, recurso, pk):
    cfg = cfg_o_404(recurso, request.user)
    obj = get_object_or_404_q(queryset(cfg, request.user), pk)
    if request.method in ("PATCH", "POST"):
        return editar(request, cfg, obj)
    solo(request, "GET")
    data = serializar(obj, cfg["campos"], cfg["extras"])
    if recurso == "ordenes":
        data["bitacora"] = [serializar(b, ["id", "autor", "texto", "horas", "es_traspaso", "creado"]) for b in obj.bitacora.select_related("autor")]
        data["repuestos"] = [serializar_repuesto_ot(r) for r in obj.repuestos.select_related("repuesto")]
        t = obj.bitacora.filter(es_traspaso=True).select_related("autor").last()
        data["traspaso"] = serializar(t, ["id", "autor", "texto", "creado"]) if t else None
        data["ficha"] = serializar(obj.equipo.ficha, ["id", "nombre", "piezas", "herramientas", "fallas", "especificaciones"])
    elif recurso == "equipos":
        from .paneles import ficha_equipo
        data.update(ficha_equipo(obj, request.user))
    return data


def get_object_or_404_q(qs, pk):
    obj = qs.filter(pk=pk).first()
    if obj is None:
        raise Http404
    return obj


def serializar_repuesto_ot(r):
    return {"id": r.id, "ot": r.ot_id, "repuesto": r.repuesto_id, "repuesto_nombre": r.repuesto.nombre, "cantidad": r.cantidad, "estado": r.estado,
            "estado_display": r.get_estado_display(), "suficiente": r.suficiente, "stock": r.repuesto.stock, "costo_total": r.costo_total}


def editar(request, cfg, obj):
    if request.user.rol not in cfg["editar"]:
        raise Error(403, "Su perfil no puede modificar este registro.")
    d = cuerpo(request)
    campos = [c for c in cfg["campos_editar"] if c in d]
    if not campos:
        raise Error(400, "No hay cambios que guardar.")
    base = model_to_dict(obj, fields=cfg["campos_editar"])
    base.update({c: d[c] for c in campos})
    anterior = {c: getattr(obj, c) for c in campos}
    form = modelform_factory(cfg["modelo"], fields=cfg["campos_editar"])(base, instance=obj)
    if not form.is_valid():
        raise Error(400, "Revise los datos ingresados.", _errores_form(form))
    obj = form.save(commit=False)
    nombre = cfg["nombre"]
    if nombre == "avisos" and obj.atendido and not anterior.get("atendido"):
        obj.atendido_por = request.user
        m.Notificacion.objects.create(usuario=obj.autor, destino="avisos", texto=f"Su aviso sobre {obj.equipo.nombre_habitual} fue atendido por {request.user.nombre.split('·')[0].strip()}.")
    if nombre == "plcs" and obj.estado == "alarma" and anterior.get("estado") != "alarma":
        notificar(("ing_automatizacion",), f"PLC {obj.nombre} quedó con alarma.", f"plcs/{obj.pk}", excluir=request.user, nivel="alarma")
    if nombre == "paradas" and obj.fin and not anterior.get("fin"):
        eq = obj.equipo
        if not eq.paradas.exclude(pk=obj.pk).filter(fin__isnull=True).exists() and eq.estado in ("detenido", "en_mantencion"):
            eq.estado = "operando"
            eq.save(update_fields=["estado"])
    obj.save()
    return {"ok": True, **serializar(obj, cfg["campos"], cfg["extras"])}


# ------------------------------------------------------------------ acciones de negocio
@vista("tecnico")
def reporte_tomar(request, pk):
    solo(request, "POST")
    with transaction.atomic():
        aviso = m.Reporte.objects.select_for_update().filter(pk=pk).first()
        if aviso is None:
            raise Http404
        if aviso.estado != "enviado":
            raise Error(409, "Este reporte ya fue tomado por otro técnico.")
        ot = m.OrdenTrabajo.objects.create(equipo=aviso.equipo, titulo=aviso.descripcion[:120], descripcion=aviso.descripcion,
                                           prioridad="alta" if aviso.detiene_linea else "media", estado="abierta",
                                           asignado_a=request.user, creado_por=request.user, reporte=aviso)
        aviso.estado, aviso.tecnico = "tomado", request.user
        aviso.save()
        m.Bitacora.objects.create(ot=ot, autor=request.user, texto="Reporte tomado. Falta aplicar bloqueo y etiquetado antes de intervenir.")
    m.Notificacion.objects.create(usuario=aviso.operador, destino="mis_reportes", texto=f"Su reporte sobre {aviso.equipo.nombre_habitual} fue tomado por un técnico.")
    return {"ok": True, "orden_id": ot.pk, "numero": ot.numero}


def _ot_abierta(pk):
    ot = m.OrdenTrabajo.objects.filter(pk=pk).select_related("equipo").first()
    if ot is None:
        raise Http404
    if not ot.abierta:
        raise Error(409, "La orden está cerrada; ya no admite cambios.")
    return ot


@vista(*MANT)
def ot_bitacora(request, pk):
    solo(request, "POST")
    ot = _ot_abierta(pk)
    d = cuerpo(request)
    texto = str(d.get("texto") or "").strip()
    if not texto:
        raise Error(400, "Escriba el diagnóstico o la acción realizada.", {"texto": "Este campo es obligatorio."})
    try:
        horas = float(d.get("horas") or 0)
    except ValueError:
        raise Error(400, "Las horas deben ser un número.", {"horas": "Ingrese un número."})
    if not 0 <= horas <= 99:
        raise Error(400, "Las horas deben estar entre 0 y 99.", {"horas": "Valor fuera de rango."})
    hecho = hecho_en(d) or timezone.now()
    uid = str(d.get("uid") or "")[:40] or None
    traspaso = str(d.get("es_traspaso")).lower() in ("1", "true", "on")
    try:
        with transaction.atomic():
            m.Bitacora.objects.create(ot=ot, autor=request.user, texto=texto, horas=round(horas, 2), es_traspaso=traspaso, creado=hecho, uid=uid)
    except IntegrityError:
        return {"ok": True, "ya_existia": True}
    return JsonResponse({"ok": True}, status=201)


LOTO_TEXTO = "Bloqueo y etiquetado (LOTO) aplicado y energía cero verificada por {}."


@vista(*MANT)
def ot_estado(request, pk):
    """Iniciar exige confirmar bloqueo y etiquetado (LOTO); cerrar devuelve el equipo a operación."""
    solo(request, "POST")
    ot = m.OrdenTrabajo.objects.filter(pk=pk).select_related("equipo").first()
    if ot is None:
        raise Http404
    d = cuerpo(request)
    nuevo = d.get("estado")
    nombre = request.user.nombre.split("·")[0].strip()
    if nuevo == "en_curso" and ot.estado == "abierta":
        if str(d.get("loto")).lower() not in ("1", "true"):
            raise Error(400, "Antes de intervenir confirme el bloqueo y etiquetado (LOTO) y la verificación de energía cero.", {"loto": "Confirmación obligatoria."})
        ot.estado, ot.loto_por, ot.loto_en = "en_curso", request.user, timezone.now()
        m.Bitacora.objects.create(ot=ot, autor=request.user, texto=LOTO_TEXTO.format(nombre))
        m.Bitacora.objects.create(ot=ot, autor=request.user, texto="Se inicia la intervención.")
        if ot.equipo.estado in ("operando", "alarma", "detenido"):
            ot.equipo.estado = "en_mantencion"
            ot.equipo.save(update_fields=["estado"])
    elif nuevo == "cerrada" and ot.abierta:
        if ot.estado == "en_curso" and str(d.get("retiro_loto")).lower() not in ("1", "true"):
            raise Error(400, "Antes de cerrar confirme que retiró su bloqueo y que el equipo queda seguro para operar.", {"retiro_loto": "Confirmación obligatoria."})
        ot.estado, ot.cerrada_en = "cerrada", timezone.now()
        m.Bitacora.objects.create(ot=ot, autor=request.user, texto="Bloqueo retirado. Orden cerrada; equipo entregado a operación.")
        planta.normalizar_equipo(ot.equipo, ot)
        if ot.reporte_id:
            rep = m.Reporte.objects.get(pk=ot.reporte_id)
            rep.estado = "resuelto"
            rep.save()
            m.Notificacion.objects.create(usuario=rep.operador, destino="mis_reportes", texto=f"Su reporte sobre {ot.equipo.nombre_habitual} fue resuelto.")
        notificar(("supervisor_turno",), f"{ot.equipo.nombre_habitual} vuelve a operar ({ot.numero} cerrada).", "mapa", excluir=request.user)
    else:
        raise Error(400, "Ese cambio de estado no es válido.")
    ot.save()
    return {"ok": True, "estado": ot.estado}


@vista(*MANT)
def ot_repuestos(request, pk):
    solo(request, "POST")
    ot = _ot_abierta(pk)
    d = cuerpo(request)
    rep = m.Repuesto.objects.filter(pk=d.get("repuesto") or 0).first()
    try:
        cant = int(d.get("cantidad") or 0)
    except ValueError:
        cant = 0
    if rep is None or cant < 1:
        raise Error(400, "Elija un repuesto y una cantidad mayor que cero.")
    uso = m.RepuestoOT.objects.create(ot=ot, repuesto=rep, cantidad=cant, registrado_por=request.user)
    return JsonResponse({"ok": True, **serializar_repuesto_ot(uso)}, status=201)


@vista(*MANT, "panol")
def repuesto_accion(request, pk, accion):
    """Reservar (descuenta stock), solicitar (si falta) o entregar (queda ligado a la OT y a la máquina)."""
    solo(request, "POST")
    with transaction.atomic():
        uso = m.RepuestoOT.objects.select_for_update().select_related("ot").filter(pk=pk).first()
        if uso is None:
            raise Http404
        rep = m.Repuesto.objects.select_for_update().get(pk=uso.repuesto_id)
        ot = uso.ot
        if not ot.abierta or uso.estado == "usado":
            raise Error(409, "Este repuesto ya no admite cambios.")
        if accion == "solicitar":
            if rep.stock >= uso.cantidad:
                raise Error(400, "Hay stock suficiente: puede reservarlo.")
            uso.estado = "solicitado"
            uso.save()
        elif accion in ("reservar", "entregar"):
            if uso.estado != "reservado":
                if rep.stock < uso.cantidad:
                    raise Error(400, f"Stock insuficiente de {rep.nombre} (disponible: {rep.stock}).")
                m.Repuesto.objects.filter(pk=rep.pk).update(stock=F("stock") - uso.cantidad)
            if accion == "reservar":
                uso.estado, texto = "reservado", f"Repuesto reservado: {rep.nombre} × {uso.cantidad}."
            else:
                uso.estado, uso.entregado_en = "usado", timezone.now()
                texto = f"Repuesto entregado: {rep.nombre} × {uso.cantidad}."
            uso.save()
            m.Bitacora.objects.create(ot=ot, autor=request.user, texto=texto)
        else:
            raise Http404
    uso.refresh_from_db()
    return {"ok": True, **serializar_repuesto_ot(uso)}


@vista(*MANT, "panol", "calidad_terreno")
def herramienta_accion(request, pk, accion):
    """Retirar y devolver herramientas; enviar a calibración y registrar la calibración hecha."""
    solo(request, "POST")
    h = m.Herramienta.objects.select_related("ficha").filter(pk=pk).first()
    if h is None:
        raise Http404
    u, ahora = request.user, timezone.now()
    if accion == "retirar":
        if h.estado != "disponible":
            raise Error(409, "Esta herramienta no está disponible.")
        if h.calibracion_vencida:
            raise Error(409, "La calibración está vencida: no se puede retirar hasta calibrarla.")
        h.estado, h.asignada_a, h.retirada_en = "prestada", u, ahora
    elif accion == "devolver":
        if h.estado != "prestada":
            raise Error(409, "Esta herramienta no está prestada.")
        if h.asignada_a_id != u.id and u.rol not in ("panol", "jefe_mant", "supervisor_mant", "instrumentacion"):
            raise Error(403, "Solo quien la retiró o el pañol pueden registrar la devolución.")
        h.estado, h.asignada_a, h.retirada_en = "disponible", None, None
    elif accion in ("enviar_calibracion", "calibrada"):
        if u.rol not in ("instrumentacion", "panol", "jefe_mant"):
            raise Error(403, "Su perfil no puede gestionar calibraciones.")
        if accion == "enviar_calibracion":
            if h.estado == "prestada":
                raise Error(409, "Primero debe devolverse.")
            h.estado = "calibracion"
        else:
            h.estado = "disponible"
            if h.ficha.cal_dias:
                h.proxima_calibracion = timezone.localdate() + timedelta(days=h.ficha.cal_dias)
    else:
        raise Http404
    h.save()
    return {"ok": True, **serializar(h, RECURSOS["herramientas"]["campos"], RECURSOS["herramientas"]["extras"])}


@vista(*(PRODUCCION + MANT))
def alarma_reconocer(request, pk):
    solo(request, "POST")
    a = m.Alarma.objects.filter(pk=pk).first()
    if a is None:
        raise Http404
    if a.reconocida_por_id is None:
        a.reconocida_por, a.reconocida_en = request.user, timezone.now()
        a.save()
    return {"ok": True}


@vista(*MANT)
def equipo_manual(request, pk):
    eq = m.Equipo.objects.filter(pk=pk).first()
    if eq is None:
        raise Http404
    d = cuerpo(request)
    if not d.get("archivo_b64"):
        raise Error(400, "Elija un archivo para cargar el manual.")
    guardar_b64(eq, "manual", d["archivo_b64"], d.get("archivo_nombre") or "manual.pdf")
    eq.save()
    return {"ok": True, "manual": f"/api/media/{eq.manual.name}"}


@vista()
def notificaciones_leer(request):
    m.Notificacion.objects.filter(usuario=request.user, leida=False).update(leida=True)
    return {"ok": True}


@vista()
def media(request, ruta):
    return servir_archivo(request, ruta, document_root=settings.MEDIA_ROOT)


# ------------------------------------------------------------------ sesión
def info_usuario(u):
    p = PERFILES[u.rol]
    d = {"id": u.pk, "email": u.username, "nombre": u.nombre, "rol": u.rol, "rol_nombre": u.get_rol_display(), "canal": u.canal, "turno": u.turno,
         "turno_nombre": u.get_turno_display(), "permisos": permisos_de(u), "no_leidas": u.notificaciones.filter(leida=False).count(),
         "menu": p["menu"], "extras": p["extras"], "acciones": p["acciones"],
         "cargo": {"numero": u.cargo.numero, "nombre": u.cargo.nombre} if u.cargo_id else None}
    return d


@vista(publica=True)
def login(request):
    solo(request, "POST")
    d = cuerpo(request)
    email = str(d.get("email") or "").strip().lower()
    clave = str(d.get("password") or "")
    canal = d.get("canal")
    if email.rsplit("@", 1)[-1] != settings.DOMINIO_PERMITIDO:
        raise Error(400, f"Solo se puede ingresar con un correo @{settings.DOMINIO_PERMITIDO}.", {"email": "Dominio no permitido."})
    user = authenticate(request, username=email, password=clave)
    if user is None or not user.is_active:
        raise Error(401, "Correo o contraseña incorrectos, o el usuario no tiene acceso a SIMA.")
    if canal and canal != user.canal:
        donde = "la aplicación de terreno (móvil o escritorio)" if user.canal == "app" else "la página web"
        raise Error(403, f"Su perfil ({user.get_rol_display()}) ingresa por {donde}.")
    return {"token": signer.sign(str(user.pk)), "usuario": info_usuario(user)}


@vista()
def me(request):
    return info_usuario(request.user)


# ------------------------------------------------------------------ otros reportes
@vista()
def consumo(request):
    """Consumo de repuestos por equipo en un rango de fechas (cierre de mes)."""
    if request.user.rol not in RECURSOS["repuestos"]["leer"]:
        raise Error(403, "Su perfil no tiene acceso a esta función.")
    hasta = parse_date(request.GET.get("hasta", "")) or timezone.localdate()
    desde = parse_date(request.GET.get("desde", "")) or hasta - timedelta(days=30)
    usos = m.RepuestoOT.objects.filter(estado="usado", entregado_en__date__gte=desde, entregado_en__date__lte=hasta).select_related("repuesto", "ot__equipo")
    por = defaultdict(lambda: {"filas": defaultdict(lambda: [0, 0]), "total": 0})
    for r in usos:
        e = por[r.ot.equipo.nombre_habitual]
        e["filas"][r.repuesto.nombre][0] += r.cantidad
        e["filas"][r.repuesto.nombre][1] += r.costo_total
        e["total"] += r.costo_total
    equipos = [{"equipo": k, "total": v["total"], "filas": [{"repuesto": a, "cantidad": c, "costo": t} for a, (c, t) in v["filas"].items()]} for k, v in por.items()]
    equipos.sort(key=lambda x: -x["total"])
    return {"desde": desde.isoformat(), "hasta": hasta.isoformat(), "equipos": equipos, "total": sum(e["total"] for e in equipos)}
