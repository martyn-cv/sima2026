"""API JSON de SIMA. Una sola API para la web, la app móvil y la app de escritorio."""
import base64
import json
import uuid
from collections import defaultdict
from datetime import date, timedelta
from functools import wraps

from django.conf import settings
from django.contrib.auth import authenticate
from django.core.exceptions import FieldDoesNotExist, PermissionDenied
from django.core.files.base import ContentFile
from django.core.signing import BadSignature, TimestampSigner
from django.db import IntegrityError, transaction
from django.db.models import Count, F, Q, Sum
from django.forms import modelform_factory
from django.forms.models import model_to_dict
from django.http import Http404, JsonResponse
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from django.views.decorators.csrf import csrf_exempt
from django.views.static import serve as servir_archivo

from . import models as m
from .models import ROLES_APP, ROLES_WEB

INGS = ("ing_terreno", "ing_mantenimiento", "ing_mecanico", "ing_automatizacion")
TERRENO = ("tecnico",) + INGS            # personal de mantenimiento en terreno
ALL = ROLES_APP + ROLES_WEB
OFICINA_LECTURA = ("administrativo", "ejecutivo", "civil_industrial")
TOKEN_HORAS = 12
signer = TimestampSigner(salt="sima-token")


# ------------------------------------------------------------------ infraestructura
class Error(Exception):
    def __init__(self, estado, mensaje, campos=None):
        self.estado, self.mensaje, self.campos = estado, mensaje, campos


def usuario_de(request):
    h = request.headers.get("Authorization", "")
    token = h[7:] if h.startswith("Bearer ") else request.GET.get("t", "")
    try:
        uid = signer.unsign(token, max_age=TOKEN_HORAS * 3600)
    except BadSignature:
        return None
    return m.Usuario.objects.filter(pk=uid, is_active=True).first()


def vista(*roles, publica=False):
    """Decorador: JSON de entrada/salida, token y control de rol. Sin roles = cualquier usuario con sesión."""
    def deco(fn):
        @csrf_exempt
        @wraps(fn)
        def w(request, *a, **kw):
            try:
                if not publica:
                    request.user = usuario_de(request)
                    if request.user is None:
                        raise Error(401, "Inicie sesión para continuar.")
                    if roles and request.user.rol not in roles:
                        raise Error(403, "Su perfil no tiene acceso a esta función.")
                resp = fn(request, *a, **kw)
                return resp if hasattr(resp, "status_code") else JsonResponse(resp, safe=False)
            except Error as e:
                return JsonResponse({"error": e.mensaje, "campos": e.campos or {}}, status=e.estado)
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


def etiqueta(v):
    if v is None:
        return ""
    return getattr(v, "nombre_habitual", None) or getattr(v, "nombre", None) or str(v)


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


def notificar(roles, texto, destino="", excluir=None):
    qs = m.Usuario.objects.filter(rol__in=roles, is_active=True)
    if excluir:
        qs = qs.exclude(pk=excluir.pk)
    m.Notificacion.objects.bulk_create([m.Notificacion(usuario=u, texto=texto[:200], destino=destino) for u in qs])


# ------------------------------------------------------------------ recursos genéricos
RECURSOS = {}


def recurso(nombre, modelo, campos, leer, crear=(), editar=(), campos_crear=(), campos_editar=(), buscar=(),
            extras=None, alcance=None, ficha=None, ruta=None, tipo=None, filtros=()):
    RECURSOS[nombre] = dict(nombre=nombre, modelo=modelo, campos=campos, leer=leer, crear=crear, editar=editar,
                            campos_crear=campos_crear, campos_editar=campos_editar, buscar=buscar,
                            extras=extras or {}, alcance=alcance, ficha=ficha, ruta=ruta, tipo=tipo,
                            filtros=filtros or campos)


def _solo(campo):
    return lambda u, qs: qs.filter(**{campo: u})


recurso("equipos", m.Equipo,
        ["id", "codigo", "nombre_habitual", "categoria", "ubicacion", "marca", "modelo", "criticidad", "estado", "manual"],
        ALL, crear=("ing_mantenimiento", "ing_mecanico", "administrativo"),
        editar=("ing_mantenimiento", "ing_mecanico", "administrativo"),
        campos_crear=["codigo", "nombre_habitual", "categoria", "ubicacion", "marca", "modelo", "criticidad", "estado"],
        campos_editar=["nombre_habitual", "categoria", "ubicacion", "marca", "modelo", "criticidad", "estado"],
        buscar=("nombre_habitual", "codigo", "ubicacion", "marca"), tipo="Equipo",
        ficha=(lambda o: o.nombre_habitual, lambda o: f"{o.ubicacion} · {o.codigo}"), ruta=lambda o: f"equipos/{o.pk}")

recurso("plcs", m.PLC,
        ["id", "equipo", "nombre", "marca", "modelo", "ip", "programa_version", "estado", "ultima_revision", "observaciones"],
        ("ing_automatizacion", "ing_mantenimiento", "ing_terreno", "ing_mecanico", "ejecutivo", "encargado_procesos"),
        crear=("ing_automatizacion",), editar=("ing_automatizacion",),
        campos_crear=["equipo", "nombre", "marca", "modelo", "ip", "programa_version", "estado", "ultima_revision", "observaciones"],
        campos_editar=["nombre", "ip", "programa_version", "estado", "ultima_revision", "observaciones"],
        buscar=("nombre", "marca", "modelo", "ip", "equipo__nombre_habitual"), tipo="PLC",
        ficha=(lambda o: o.nombre, lambda o: f"{o.marca} {o.modelo} · {o.get_estado_display()}"),
        ruta=lambda o: f"plcs/{o.pk}")

recurso("repuestos", m.Repuesto,
        ["id", "codigo", "nombre", "tipo", "bodega", "stock", "stock_minimo", "costo_unitario"],
        TERRENO + ("administrativo", "encargado_procesos", "civil_industrial"),
        crear=("ing_mantenimiento", "administrativo"), editar=("ing_mantenimiento", "administrativo"),
        campos_crear=["codigo", "nombre", "tipo", "bodega", "stock", "stock_minimo", "costo_unitario"],
        campos_editar=["nombre", "tipo", "bodega", "stock", "stock_minimo", "costo_unitario"],
        buscar=("nombre", "codigo", "tipo", "bodega"), tipo="Repuesto",
        ficha=(lambda o: o.nombre, lambda o: f"{o.bodega} · stock {o.stock}"), ruta=lambda o: "repuestos",
        extras={"bajo_minimo": lambda o: o.bajo_minimo})

recurso("reportes", m.Reporte,
        ["id", "equipo", "operador", "descripcion", "foto", "detiene_linea", "estado", "tecnico", "creado"],
        ALL, crear=("operador", "tecnico", "ing_terreno"), campos_crear=["equipo", "descripcion", "detiene_linea"],
        buscar=("descripcion", "equipo__nombre_habitual"), tipo="Reporte de falla",
        alcance=lambda u, qs: qs.filter(operador=u) if u.rol == "operador" else qs,
        ficha=(lambda o: f"{o.equipo.nombre_habitual}: {o.descripcion[:60]}", lambda o: o.get_estado_display()),
        ruta=lambda o: "reportes",
        extras={"orden_id": lambda o: getattr(getattr(o, "orden", None), "id", None)})

recurso("ordenes", m.OrdenTrabajo,
        ["id", "equipo", "titulo", "descripcion", "tipo", "prioridad", "estado", "asignado_a", "creada", "cerrada_en"],
        TERRENO + ROLES_WEB, crear=TERRENO, editar=("ing_terreno", "ing_mantenimiento", "ing_mecanico"),
        campos_crear=["equipo", "titulo", "descripcion", "tipo", "prioridad", "asignado_a"],
        campos_editar=["titulo", "descripcion", "prioridad", "asignado_a"],
        buscar=("titulo", "descripcion", "equipo__nombre_habitual"), tipo="Orden de trabajo",
        ficha=(lambda o: f"{o.numero} · {o.titulo}", lambda o: f"{o.equipo.nombre_habitual} · {o.get_estado_display()}"),
        ruta=lambda o: f"ordenes/{o.pk}",
        extras={"numero": lambda o: o.numero, "sin_avance": lambda o: o.sin_avance,
                "horas_sin_avance": lambda o: o.horas_sin_avance, "horas_trabajadas": lambda o: o.horas_trabajadas,
                "equipo_criticidad": lambda o: o.equipo.criticidad, "reporte_id": lambda o: o.reporte_id})

recurso("avisos", m.Aviso, ["id", "tipo", "equipo", "texto", "autor", "atendido", "atendido_por", "creado"],
        TERRENO, crear=("tecnico", "ing_terreno"), editar=("ing_terreno", "ing_mantenimiento"),
        campos_crear=["tipo", "equipo", "texto"], campos_editar=["atendido"],
        buscar=("texto", "equipo__nombre_habitual"), tipo="Aviso de técnico",
        alcance=lambda u, qs: qs.filter(autor=u) if u.rol == "tecnico" else qs,
        ficha=(lambda o: f"{o.equipo.nombre_habitual}: {o.texto[:60]}", lambda o: o.get_tipo_display()),
        ruta=lambda o: "avisos")

recurso("notas", m.Nota, ["id", "titulo", "texto", "tipo", "equipo", "autor", "creada"],
        TERRENO, crear=TERRENO, campos_crear=["titulo", "texto", "tipo", "equipo"],
        buscar=("titulo", "texto", "equipo__nombre_habitual"), tipo="Nota",
        ficha=(lambda o: o.titulo, lambda o: o.texto[:80]), ruta=lambda o: "notas")

recurso("planes", m.Plan,
        ["id", "titulo", "tipo", "equipo", "responsable", "fecha_inicio", "fecha_fin", "descripcion", "estado"],
        TERRENO + ROLES_WEB, crear=("ing_mantenimiento", "ing_terreno"), editar=("ing_mantenimiento", "ing_terreno"),
        campos_crear=["titulo", "tipo", "equipo", "responsable", "fecha_inicio", "fecha_fin", "descripcion"],
        campos_editar=["titulo", "estado", "responsable", "fecha_inicio", "fecha_fin", "descripcion"],
        buscar=("titulo", "descripcion", "equipo__nombre_habitual"), tipo="Plan de mantención",
        ficha=(lambda o: o.titulo, lambda o: f"{o.fecha_inicio:%d/%m} – {o.fecha_fin:%d/%m} · {o.get_estado_display()}"),
        ruta=lambda o: "planificacion")

recurso("informes", m.Informe, ["id", "titulo", "contenido", "compartido", "autor", "creado"],
        TERRENO + ROLES_WEB, crear=INGS, editar=INGS, campos_crear=["titulo", "contenido", "compartido"],
        campos_editar=["compartido"], buscar=("titulo", "contenido"), tipo="Informe",
        alcance=lambda u, qs: qs.filter(compartido=True) if u.rol == "tecnico" else qs,
        ficha=(lambda o: o.titulo, lambda o: "Compartido" if o.compartido else "Privado"), ruta=lambda o: "informes")

recurso("notificaciones", m.Notificacion, ["id", "texto", "destino", "leida", "creada"], ALL,
        alcance=_solo("usuario"))

recurso("contratos", m.Contrato,
        ["id", "trabajador", "rut", "cargo", "area", "tipo", "fecha_inicio", "fecha_fin", "sueldo_bruto", "estado"],
        OFICINA_LECTURA, crear=("administrativo",), editar=("administrativo",),
        campos_crear=["trabajador", "rut", "cargo", "area", "tipo", "fecha_inicio", "fecha_fin", "sueldo_bruto"],
        campos_editar=["cargo", "area", "tipo", "fecha_fin", "sueldo_bruto", "estado"],
        buscar=("trabajador", "rut", "cargo", "area"), tipo="Contrato",
        ficha=(lambda o: o.trabajador, lambda o: f"{o.cargo} · {o.get_tipo_display()}"), ruta=lambda o: "contratos",
        extras={"dias_para_vencer": lambda o: o.dias_para_vencer})

recurso("movimientos", m.Movimiento,
        ["id", "fecha", "tipo", "categoria", "centro_costo", "descripcion", "monto"],
        OFICINA_LECTURA, crear=("administrativo",), editar=("administrativo",),
        campos_crear=["fecha", "tipo", "categoria", "centro_costo", "descripcion", "monto"],
        campos_editar=["categoria", "centro_costo", "descripcion", "monto"],
        buscar=("descripcion", "categoria", "centro_costo"), tipo="Movimiento",
        ficha=(lambda o: o.descripcion, lambda o: f"{o.get_tipo_display()} · ${o.monto:,}".replace(",", ".")),
        ruta=lambda o: "finanzas")

recurso("procesos", m.Proceso,
        ["id", "nombre", "area", "responsable", "estado", "avance", "fecha_inicio", "fecha_fin", "descripcion"],
        ROLES_WEB + ("ing_mantenimiento",), crear=("administrativo", "civil_industrial", "encargado_procesos"),
        editar=("administrativo", "civil_industrial", "encargado_procesos"),
        campos_crear=["nombre", "area", "responsable", "estado", "avance", "fecha_inicio", "fecha_fin", "descripcion"],
        campos_editar=["nombre", "area", "responsable", "estado", "avance", "fecha_inicio", "fecha_fin", "descripcion"],
        buscar=("nombre", "area", "responsable", "descripcion"), tipo="Proceso",
        ficha=(lambda o: o.nombre, lambda o: f"{o.area} · {o.get_estado_display()} · {o.avance}%"),
        ruta=lambda o: "procesos")

recurso("despachos", m.Despacho,
        ["id", "codigo", "origen", "destino", "carga", "vehiculo", "conductor", "estado", "fecha_salida",
         "fecha_llegada", "costo"],
        ROLES_WEB, crear=("ing_transporte", "administrativo"), editar=("ing_transporte", "administrativo"),
        campos_crear=["codigo", "origen", "destino", "carga", "vehiculo", "conductor", "estado", "fecha_salida",
                      "fecha_llegada", "costo"],
        campos_editar=["origen", "destino", "carga", "vehiculo", "conductor", "estado", "fecha_salida",
                       "fecha_llegada", "costo"],
        buscar=("codigo", "origen", "destino", "carga", "conductor"), tipo="Despacho",
        ficha=(lambda o: f"{o.codigo} · {o.origen} → {o.destino}", lambda o: o.get_estado_display()),
        ruta=lambda o: "transporte")

recurso("usuarios", m.Usuario, ["id", "nombre_completo", "rol"], ALL, buscar=("nombre_completo",))
RECURSOS["usuarios"]["extras"] = {"nombre": lambda o: o.nombre, "rol_nombre": lambda o: o.get_rol_display()}


def permisos_de(user):
    return {n: {"leer": user.rol in r["leer"], "crear": user.rol in r["crear"], "editar": user.rol in r["editar"]}
            for n, r in RECURSOS.items()}


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
    if params.get("mias") == "1":
        for c in ("asignado_a", "responsable", "autor"):
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
    if request.method != "GET":
        raise Error(405, "Método no permitido.")
    qs = _filtrar(request.GET, request.user, cfg, queryset(cfg, request.user))
    try:
        limite = min(int(request.GET.get("limite", 300)), 1000)
    except ValueError:
        limite = 300
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
    hecho = parse_datetime(str(d.get("hecho_en") or ""))
    hecho = min(hecho, timezone.now()) if hecho and timezone.is_aware(hecho) else None
    if nombre == "reportes":
        obj.operador, obj.uid = user, uid
        if hecho:
            obj.creado = hecho
        guardar_b64(obj, "foto", d.get("foto_b64"), d.get("foto_nombre"))
    elif nombre == "avisos":
        obj.autor, obj.uid = user, uid
        if hecho:
            obj.creado = hecho
    elif nombre in ("notas", "informes"):
        obj.autor = user
    elif nombre in ("ordenes", "planes", "movimientos"):
        obj.creado_por = user


def _despues_de_crear(user, nombre, obj):
    if nombre == "reportes":
        marca = "DETIENE LA LÍNEA · " if obj.detiene_linea else ""
        notificar(("tecnico", "ing_terreno"), f"{marca}Falla en {obj.equipo.nombre_habitual}: {obj.descripcion[:80]}",
                  "reportes", excluir=user)
    elif nombre == "avisos":
        notificar(("ing_terreno", "ing_mantenimiento"),
                  f"{user.nombre} · {obj.get_tipo_display()} en {obj.equipo.nombre_habitual}", "avisos", excluir=user)


@vista()
def detalle(request, recurso, pk):
    cfg = cfg_o_404(recurso, request.user)
    obj = get_object_or_404_q(queryset(cfg, request.user), pk)
    if request.method == "PATCH" or request.method == "POST":
        return editar(request, cfg, obj)
    if request.method != "GET":
        raise Error(405, "Método no permitido.")
    data = serializar(obj, cfg["campos"], cfg["extras"])
    if recurso == "ordenes":
        data["bitacora"] = [serializar(b, ["id", "autor", "texto", "horas", "es_traspaso", "creado"]) for b in obj.bitacora.select_related("autor")]
        data["repuestos"] = [serializar_repuesto_ot(r) for r in obj.repuestos.select_related("repuesto")]
        t = obj.bitacora.filter(es_traspaso=True).select_related("autor").last()
        data["traspaso"] = serializar(t, ["id", "autor", "texto", "creado"]) if t else None
    elif recurso == "equipos":
        data.update(ficha_equipo(obj, request.user))
    return data


def get_object_or_404_q(qs, pk):
    obj = qs.filter(pk=pk).first()
    if obj is None:
        raise Http404
    return obj


def serializar_repuesto_ot(r):
    return {"id": r.id, "ot": r.ot_id, "repuesto": r.repuesto_id, "repuesto_nombre": r.repuesto.nombre,
            "cantidad": r.cantidad, "estado": r.estado, "estado_display": r.get_estado_display(),
            "suficiente": r.suficiente, "stock": r.repuesto.stock, "costo_total": r.costo_total}


def ficha_equipo(eq, user):
    if user.rol not in TERRENO + ("ejecutivo", "civil_industrial", "encargado_procesos"):
        return {}
    historial = []
    for ot in eq.ordenes.all()[:5]:       # las 5 últimas intervenciones, de la más reciente
        ult = ot.bitacora.order_by("-creado").first()
        historial.append({
            "id": ot.id, "numero": ot.numero, "fecha": ot.creada.date().isoformat(), "falla": ot.titulo,
            "estado_display": ot.get_estado_display(), "accion": ult.texto if ult else "",
            "repuestos": [f"{r.repuesto.nombre} × {r.cantidad}" for r in ot.repuestos.filter(estado="usado").select_related("repuesto")]})
    return {"historial": historial,
            "notas": [serializar(n, ["id", "titulo", "texto", "autor", "creada"]) for n in eq.notas.all()[:3]],
            "plcs": [serializar(p, ["id", "nombre", "marca", "modelo", "estado"]) for p in eq.plcs.all()]}


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
    if cfg["nombre"] == "avisos" and obj.atendido and not anterior.get("atendido"):
        obj.atendido_por = request.user
        m.Notificacion.objects.create(
            usuario=obj.autor, destino="avisos",
            texto=f"Su aviso sobre {obj.equipo.nombre_habitual} fue atendido por {request.user.nombre}.")
    if cfg["nombre"] == "plcs" and obj.estado == "alarma" and anterior.get("estado") != "alarma":
        notificar(("ing_automatizacion",), f"PLC {obj.nombre} quedó con alarma.", f"plcs/{obj.pk}", excluir=request.user)
    obj.save()
    return {"ok": True, **serializar(obj, cfg["campos"], cfg["extras"])}


# ------------------------------------------------------------------ acciones de negocio
@vista("tecnico")
def reporte_tomar(request, pk):
    if request.method != "POST":
        raise Error(405, "Método no permitido.")
    with transaction.atomic():
        aviso = m.Reporte.objects.select_for_update().filter(pk=pk).first()
        if aviso is None:
            raise Http404
        if aviso.estado != "enviado":
            raise Error(409, "Este reporte ya fue tomado por otro técnico.")
        ot = m.OrdenTrabajo.objects.create(
            equipo=aviso.equipo, titulo=aviso.descripcion[:120], descripcion=aviso.descripcion,
            prioridad="alta" if aviso.detiene_linea else "media", estado="en_curso",
            asignado_a=request.user, creado_por=request.user, reporte=aviso)
        aviso.estado, aviso.tecnico = "tomado", request.user
        aviso.save()
        m.Bitacora.objects.create(ot=ot, autor=request.user, texto="Reporte tomado. Se inicia la intervención.")
    m.Notificacion.objects.create(usuario=aviso.operador, destino="mis_reportes",
                                  texto=f"Su reporte sobre {aviso.equipo.nombre_habitual} fue tomado por un técnico.")
    return {"ok": True, "orden_id": ot.pk, "numero": ot.numero}


def _ot_abierta(pk):
    ot = m.OrdenTrabajo.objects.filter(pk=pk).select_related("equipo").first()
    if ot is None:
        raise Http404
    if not ot.abierta:
        raise Error(409, "La orden está cerrada; ya no admite cambios.")
    return ot


@vista(*TERRENO)
def ot_bitacora(request, pk):
    if request.method != "POST":
        raise Error(405, "Método no permitido.")
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
    hecho = parse_datetime(str(d.get("hecho_en") or ""))
    hecho = min(hecho, timezone.now()) if hecho and timezone.is_aware(hecho) else timezone.now()
    uid = str(d.get("uid") or "")[:40] or None
    traspaso = str(d.get("es_traspaso")).lower() in ("1", "true", "on")
    try:
        with transaction.atomic():
            m.Bitacora.objects.create(ot=ot, autor=request.user, texto=texto, horas=round(horas, 2),
                                      es_traspaso=traspaso, creado=hecho, uid=uid)
    except IntegrityError:   # mismo uid: ya estaba sincronizado, no se duplica
        return {"ok": True, "ya_existia": True}
    if ot.estado == "abierta":
        ot.estado = "en_curso"
        ot.save()
    return JsonResponse({"ok": True}, status=201)


@vista(*TERRENO)
def ot_estado(request, pk):
    if request.method != "POST":
        raise Error(405, "Método no permitido.")
    ot = m.OrdenTrabajo.objects.filter(pk=pk).first()
    if ot is None:
        raise Http404
    nuevo = cuerpo(request).get("estado")
    if nuevo == "en_curso" and ot.estado == "abierta":
        ot.estado = "en_curso"
        m.Bitacora.objects.create(ot=ot, autor=request.user, texto="Se inicia la intervención.")
    elif nuevo == "cerrada" and ot.abierta:
        ot.estado, ot.cerrada_en = "cerrada", timezone.now()
        m.Bitacora.objects.create(ot=ot, autor=request.user, texto="Orden cerrada.")
        if ot.reporte_id:
            rep = m.Reporte.objects.get(pk=ot.reporte_id)
            rep.estado = "resuelto"
            rep.save()
            m.Notificacion.objects.create(usuario=rep.operador, destino="mis_reportes",
                                          texto=f"Su reporte sobre {ot.equipo.nombre_habitual} fue resuelto.")
    else:
        raise Error(400, "Ese cambio de estado no es válido.")
    ot.save()
    return {"ok": True, "estado": ot.estado}


@vista(*TERRENO)
def ot_repuestos(request, pk):
    if request.method != "POST":
        raise Error(405, "Método no permitido.")
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


@vista(*TERRENO)
def repuesto_accion(request, pk, accion):
    """Reservar (descuenta stock), solicitar (si falta) o entregar (queda ligado a la OT y a la máquina)."""
    if request.method != "POST":
        raise Error(405, "Método no permitido.")
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
            if uso.estado != "reservado":     # si ya estaba reservado, el stock ya se descontó
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


@vista(*TERRENO)
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
MENUS_APP = {
    "operador": (["inicio", "equipos", "reportar", "mis_reportes"], ["perfil"]),
    "tecnico": (["inicio", "ordenes", "equipos", "avisar"], ["reportes", "repuestos", "notas", "informes", "perfil"]),
    "ing_terreno": (["inicio", "avisos", "ordenes", "equipos"], ["reportes", "planificacion", "repuestos", "notas", "informes", "perfil"]),
    "ing_mantenimiento": (["inicio", "ordenes", "planificacion", "indicadores"], ["equipos", "repuestos", "avisos", "notas", "informes", "perfil"]),
    "ing_mecanico": (["inicio", "equipos", "ordenes", "repuestos"], ["planificacion", "notas", "informes", "indicadores", "perfil"]),
    "ing_automatizacion": (["inicio", "plcs", "equipos", "avisos"], ["ordenes", "notas", "informes", "perfil"]),
}
MENUS_WEB = {
    "administrativo": ["panel", "finanzas", "contratos", "procesos", "transporte", "planificacion", "mantencion", "informes"],
    "ejecutivo": ["panel", "finanzas", "contratos", "procesos", "transporte", "mantencion", "informes"],
    "civil_industrial": ["panel", "procesos", "planificacion", "finanzas", "mantencion", "informes"],
    "encargado_procesos": ["panel", "procesos", "planificacion", "mantencion", "informes"],
    "ing_transporte": ["panel", "transporte", "planificacion", "informes"],
}


def info_usuario(u):
    d = {"id": u.pk, "email": u.username, "nombre": u.nombre, "rol": u.rol, "rol_nombre": u.get_rol_display(),
         "canal": u.canal, "permisos": permisos_de(u),
         "no_leidas": u.notificaciones.filter(leida=False).count()}
    if u.canal == "app":
        principal, extras = MENUS_APP[u.rol]
        d["menu"], d["extras"] = principal, extras
    else:
        d["menu"], d["extras"] = MENUS_WEB[u.rol], []
    return d


@vista(publica=True)
def login(request):
    if request.method != "POST":
        raise Error(405, "Método no permitido.")
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


# ------------------------------------------------------------------ panel por rol
def _k(etiqueta, valor, detalle="", tono="neutro", ruta=""):
    return {"etiqueta": etiqueta, "valor": valor, "detalle": detalle, "tono": tono, "ruta": ruta}


def _lista(titulo, items, vacio="Sin pendientes."):
    return {"titulo": titulo, "items": items, "vacio": vacio}


def _it(titulo, detalle="", etiqueta="", tono="neutro", ruta="", id=None):
    return {"titulo": titulo, "detalle": detalle, "etiqueta": etiqueta, "tono": tono, "ruta": ruta, "id": id}


def pct(parte, total):
    return round(100 * parte / total) if total else 0


def mensual(n=6):
    hoy = timezone.localdate().replace(day=1)
    meses = []
    for i in range(n - 1, -1, -1):
        y, mth = hoy.year, hoy.month - i
        while mth <= 0:
            mth += 12
            y -= 1
        meses.append(date(y, mth, 1))
    ing, gas = [], []
    for ini in meses:
        fin = date(ini.year + (ini.month == 12), ini.month % 12 + 1, 1)
        qs = m.Movimiento.objects.filter(fecha__gte=ini, fecha__lt=fin)
        ing.append(qs.filter(tipo="ingreso").aggregate(t=Sum("monto"))["t"] or 0)
        gas.append(qs.filter(tipo="gasto").aggregate(t=Sum("monto"))["t"] or 0)
    nombres = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
    return {"meses": [nombres[d.month - 1] for d in meses], "ingresos": ing, "gastos": gas}


def disponibilidad():
    total = m.Equipo.objects.count()
    return pct(m.Equipo.objects.filter(estado="operativo").count(), total)


def costo_mantencion(dias=30):
    desde = timezone.now() - timedelta(days=dias)
    return sum(u.costo_total for u in m.RepuestoOT.objects.filter(estado="usado", entregado_en__gte=desde).select_related("repuesto"))


def clp(n):
    return "$" + f"{int(n):,}".replace(",", ".")


def _ot_item(ot):
    return _it(f"{ot.numero} · {ot.titulo[:60]}", f"{ot.equipo.nombre_habitual} · {ot.get_estado_display()}",
               f"{ot.horas_sin_avance} h sin avance" if ot.sin_avance else ot.get_prioridad_display(),
               "rojo" if ot.sin_avance else ("ambar" if ot.prioridad == "alta" else "neutro"), f"ordenes/{ot.pk}", ot.pk)


@vista()
def dashboard(request):
    u, rol = request.user, request.user.rol
    hoy = timezone.localdate()
    abiertas = m.OrdenTrabajo.objects.exclude(estado="cerrada").select_related("equipo", "asignado_a")
    sin_tomar = m.Reporte.objects.filter(estado="enviado").select_related("equipo")
    bajo = [r for r in m.Repuesto.objects.all() if r.bajo_minimo]
    out = {"rol": rol, "kpis": [], "listas": [], "donuts": [], "barras": [], "mensual": None}

    def reporte_item(r):
        return _it(f"{r.equipo.nombre_habitual}", r.descripcion[:70], "Detiene la línea" if r.detiene_linea else "Nuevo",
                   "rojo" if r.detiene_linea else "ambar", "reportes", r.id)

    if rol == "operador":
        mis = m.Reporte.objects.filter(operador=u)
        out["kpis"] = [_k("Enviados sin tomar", mis.filter(estado="enviado").count(), "Esperando a un técnico", "ambar", "mis_reportes"),
                       _k("En atención", mis.filter(estado="tomado").count(), "Un técnico ya lo tomó", "neutro", "mis_reportes"),
                       _k("Resueltos (30 días)", mis.filter(estado="resuelto", creado__gte=timezone.now() - timedelta(days=30)).count(), "", "verde", "mis_reportes")]
        out["listas"] = [_lista("Mis últimos reportes", [
            _it(r.equipo.nombre_habitual, r.descripcion[:70], r.get_estado_display(),
                {"enviado": "ambar", "tomado": "neutro", "resuelto": "verde"}[r.estado], "mis_reportes", r.id) for r in mis.select_related("equipo")[:5]],
            "Aún no ha enviado reportes.")]
    elif rol == "tecnico":
        mis = abiertas.filter(asignado_a=u)
        out["kpis"] = [_k("Mis órdenes abiertas", mis.count(), "Asignadas a usted", "neutro", "ordenes"),
                       _k("Reportes sin tomar", sin_tomar.count(), "De operadores", "rojo" if sin_tomar.exists() else "verde", "reportes"),
                       _k("Repuestos bajo mínimo", len(bajo), "Revise bodega", "ambar" if bajo else "verde", "repuestos")]
        out["listas"] = [
            _lista("Mis órdenes", [_ot_item(o) for o in mis[:5]], "No tiene órdenes asignadas."),
            _lista("Reportes de falla sin tomar", [reporte_item(r) for r in sin_tomar[:5]], "No hay reportes pendientes."),
            _lista("Notas de traspaso", [_it(b.ot.numero, b.texto[:90], b.creado.strftime("%d/%m %H:%M"), "ambar", f"ordenes/{b.ot_id}", b.ot_id)
                                         for b in m.Bitacora.objects.filter(es_traspaso=True, ot__in=abiertas).select_related("ot")[:3]], "Sin traspasos pendientes.")]
    elif rol == "ing_terreno":
        alertas = [o for o in abiertas if o.sin_avance]
        avisos = m.Aviso.objects.filter(atendido=False).select_related("equipo", "autor")
        out["kpis"] = [_k("Avisos de técnicos", avisos.count(), "Pendientes de revisar", "ambar" if avisos else "verde", "avisos"),
                       _k("Órdenes sin avance", len(alertas), "Equipos críticos, +4 h", "rojo" if alertas else "verde", "ordenes"),
                       _k("Reportes sin tomar", sin_tomar.count(), "De operadores", "ambar" if sin_tomar else "verde", "reportes"),
                       _k("Órdenes abiertas", abiertas.count(), "", "neutro", "ordenes")]
        out["listas"] = [
            _lista("Alertas: órdenes sin avance", [_ot_item(o) for o in alertas], "Ninguna orden crítica detenida."),
            _lista("Avisos de técnicos", [_it(f"{a.equipo.nombre_habitual}", a.texto[:80], a.get_tipo_display(),
                                               "ambar" if a.tipo in ("pendiente", "repuesto") else "verde", "avisos", a.id) for a in avisos[:5]], "Sin avisos pendientes."),
            _lista("Reportes sin tomar", [reporte_item(r) for r in sin_tomar[:4]], "No hay reportes pendientes.")]
        out["donuts"] = [{"etiqueta": "Abiertas", "valor": pct(abiertas.filter(estado="abierta").count(), abiertas.count()), "detalle": "sin iniciar"},
                         {"etiqueta": "En curso", "valor": pct(abiertas.filter(estado="en_curso").count(), abiertas.count()), "detalle": "de las abiertas"}]
    elif rol == "ing_mantenimiento":
        total_ot = m.OrdenTrabajo.objects.count()
        prev = m.OrdenTrabajo.objects.filter(tipo="preventiva").count()
        planes = m.Plan.objects.all()
        out["kpis"] = [_k("Disponibilidad", f"{disponibilidad()}%", "Equipos operativos (preliminar)", "verde", "indicadores"),
                       _k("Órdenes abiertas", abiertas.count(), "", "neutro", "ordenes"),
                       _k("Costo de repuestos (30 d)", clp(costo_mantencion()), "Entregados a órdenes", "neutro", "indicadores"),
                       _k("Repuestos bajo mínimo", len(bajo), "", "ambar" if bajo else "verde", "repuestos")]
        out["donuts"] = [{"etiqueta": "Disponibilidad", "valor": disponibilidad(), "detalle": "equipos operativos"},
                         {"etiqueta": "Preventivo", "valor": pct(prev, total_ot), "detalle": "del total de OT"},
                         {"etiqueta": "Planes cumplidos", "valor": pct(planes.filter(estado="completado").count(), planes.count()), "detalle": "completados"}]
        fallas = m.Reporte.objects.values("equipo__nombre_habitual").annotate(n=Count("id")).order_by("-n")[:5]
        out["barras"] = [{"titulo": "Equipos con más fallas", "items": [{"etiqueta": f["equipo__nombre_habitual"], "valor": f["n"]} for f in fallas]}]
        out["listas"] = [_lista("Próximos planes", [_it(p.titulo, f"{p.fecha_inicio:%d/%m} – {p.fecha_fin:%d/%m}", p.get_estado_display(), "neutro", "planificacion", p.id)
                                                    for p in planes.exclude(estado="completado")[:4]], "Sin planes pendientes.")]
    elif rol == "ing_mecanico":
        mec = ("Extrusora", "Inyectora", "Compresor", "Caldera")
        eqs = m.Equipo.objects.filter(categoria__in=mec)
        mec_bajo = [r for r in bajo if r.tipo in ("Rodamientos", "Sellos", "Hidráulico")]
        out["kpis"] = [_k("Máquinas en mantención", eqs.exclude(estado="operativo").count(), f"de {eqs.count()} máquinas", "ambar", "equipos"),
                       _k("Correctivas abiertas", abiertas.filter(tipo="correctiva").count(), "", "rojo" if abiertas.filter(tipo="correctiva").exists() else "verde", "ordenes"),
                       _k("Repuestos mecánicos bajo mínimo", len(mec_bajo), "Rodamientos, sellos, hidráulica", "ambar" if mec_bajo else "verde", "repuestos")]
        out["listas"] = [_lista("Máquinas críticas", [_it(e.nombre_habitual, f"{e.ubicacion}", e.get_estado_display(),
                                                          "verde" if e.estado == "operativo" else "ambar", f"equipos/{e.pk}", e.pk)
                                                      for e in eqs.filter(criticidad="alta")], "Sin máquinas críticas."),
                         _lista("Órdenes en máquinas", [_ot_item(o) for o in abiertas.filter(equipo__in=eqs)[:5]], "Sin órdenes abiertas.")]
        cons = defaultdict(int)
        for r in m.RepuestoOT.objects.filter(estado="usado").select_related("repuesto", "ot__equipo"):
            cons[r.ot.equipo.nombre_habitual] += r.costo_total
        out["barras"] = [{"titulo": "Costo de repuestos por máquina (CLP)", "items": [{"etiqueta": k, "valor": v} for k, v in sorted(cons.items(), key=lambda x: -x[1])[:5]]}]
    elif rol == "ing_automatizacion":
        plcs = m.PLC.objects.select_related("equipo")
        n = plcs.count()
        viejas = plcs.filter(Q(ultima_revision__lt=hoy - timedelta(days=90)) | Q(ultima_revision__isnull=True))
        out["kpis"] = [_k("PLC en línea", f"{pct(plcs.filter(estado='en_linea').count(), n)}%", f"{plcs.filter(estado='en_linea').count()} de {n}", "verde", "plcs"),
                       _k("Con alarma", plcs.filter(estado="alarma").count(), "", "rojo" if plcs.filter(estado="alarma").exists() else "verde", "plcs"),
                       _k("Fuera de línea", plcs.filter(estado="fuera_de_linea").count(), "", "ambar" if plcs.filter(estado="fuera_de_linea").exists() else "verde", "plcs"),
                       _k("Sin revisión (90 d)", viejas.count(), "Programar revisión", "ambar" if viejas.exists() else "verde", "plcs")]
        out["listas"] = [_lista("PLC que requieren atención", [_it(p.nombre, f"{p.equipo.nombre_habitual} · {p.marca} {p.modelo}", p.get_estado_display(),
                                                                    "rojo" if p.estado == "alarma" else "ambar", f"plcs/{p.pk}", p.pk)
                                                                for p in plcs.exclude(estado="en_linea")], "Todos los PLC están en línea."),
                         _lista("Avisos de técnicos", [_it(a.equipo.nombre_habitual, a.texto[:80], a.get_tipo_display(), "ambar", "avisos", a.id)
                                                       for a in m.Aviso.objects.filter(atendido=False).select_related("equipo")[:4]], "Sin avisos pendientes.")]
        out["donuts"] = [{"etiqueta": "En línea", "valor": pct(plcs.filter(estado="en_linea").count(), n), "detalle": "de los PLC"}]
    else:
        procesos = m.Proceso.objects.all()
        desp = m.Despacho.objects.all()
        mes_ini = hoy.replace(day=1)
        mov = m.Movimiento.objects.filter(fecha__gte=mes_ini)
        ing = mov.filter(tipo="ingreso").aggregate(t=Sum("monto"))["t"] or 0
        gas = mov.filter(tipo="gasto").aggregate(t=Sum("monto"))["t"] or 0
        por_vencer = [c for c in m.Contrato.objects.filter(estado="vigente", fecha_fin__isnull=False)
                      if c.dias_para_vencer is not None and c.dias_para_vencer <= 30]
        en_curso = procesos.filter(estado="en_curso").count()
        bloqueados = procesos.filter(estado="bloqueado")
        if rol == "administrativo":
            out["kpis"] = [_k("Gastos del mes", clp(gas), "", "rojo", "finanzas"), _k("Ingresos del mes", clp(ing), "", "verde", "finanzas"),
                           _k("Contratos vigentes", m.Contrato.objects.filter(estado="vigente").count(), "", "neutro", "contratos"),
                           _k("Contratos por vencer", len(por_vencer), "En los próximos 30 días", "ambar" if por_vencer else "verde", "contratos")]
            out["mensual"] = mensual()
            out["listas"] = [_lista("Contratos por vencer", [_it(c.trabajador, f"{c.cargo} · vence {c.fecha_fin:%d/%m/%Y}", f"{c.dias_para_vencer} días", "ambar", "contratos", c.id) for c in por_vencer], "Ningún contrato vence pronto."),
                             _lista("Últimos movimientos", [_it(x.descripcion, f"{x.categoria} · {x.fecha:%d/%m}", clp(x.monto), "verde" if x.tipo == "ingreso" else "rojo", "finanzas", x.id) for x in m.Movimiento.objects.all()[:5]])]
        elif rol == "ejecutivo":
            out["kpis"] = [_k("Resultado del mes", clp(ing - gas), f"Ingresos {clp(ing)} · Gastos {clp(gas)}", "verde" if ing >= gas else "rojo", "finanzas"),
                           _k("Disponibilidad de planta", f"{disponibilidad()}%", "Preliminar", "verde", "mantencion"),
                           _k("Procesos en curso", en_curso, f"{bloqueados.count()} bloqueados", "ambar" if bloqueados else "neutro", "procesos"),
                           _k("Despachos en ruta", desp.filter(estado="en_ruta").count(), f"{desp.filter(estado='retrasado').count()} retrasados", "neutro", "transporte")]
            out["mensual"] = mensual()
            out["listas"] = [_lista("Procesos bloqueados", [_it(p.nombre, f"{p.area} · {p.responsable}", f"{p.avance}%", "rojo", "procesos", p.id) for p in bloqueados], "Ningún proceso bloqueado."),
                             _lista("Despachos retrasados", [_it(d.codigo, f"{d.origen} → {d.destino}", "Retrasado", "rojo", "transporte", d.id) for d in desp.filter(estado="retrasado")], "Sin retrasos.")]
        elif rol == "civil_industrial":
            prom = procesos.aggregate(a=Sum("avance"))["a"] or 0
            out["kpis"] = [_k("Avance medio de procesos", f"{round(prom / procesos.count()) if procesos.count() else 0}%", "", "neutro", "procesos"),
                           _k("Procesos bloqueados", bloqueados.count(), "", "rojo" if bloqueados else "verde", "procesos"),
                           _k("Costo de mantención (30 d)", clp(costo_mantencion()), "Repuestos entregados", "neutro", "mantencion"),
                           _k("Disponibilidad", f"{disponibilidad()}%", "Preliminar", "verde", "mantencion")]
            por_area = defaultdict(list)
            for p in procesos:
                por_area[p.area].append(p.avance)
            out["barras"] = [{"titulo": "Avance medio por área (%)", "items": [{"etiqueta": a, "valor": round(sum(v) / len(v))} for a, v in por_area.items()]}]
            out["mensual"] = mensual()
            out["listas"] = [_lista("Procesos que requieren decisión", [_it(p.nombre, f"{p.area} · {p.get_estado_display()}", f"{p.avance}%", "rojo" if p.estado == "bloqueado" else "ambar", "procesos", p.id)
                                                                     for p in procesos.filter(estado__in=["bloqueado", "planificado"])[:5]])]
        elif rol == "encargado_procesos":
            out["kpis"] = [_k("En curso", en_curso, "", "neutro", "procesos"), _k("Bloqueados", bloqueados.count(), "", "rojo" if bloqueados else "verde", "procesos"),
                           _k("Completados", procesos.filter(estado="completado").count(), "", "verde", "procesos"),
                           _k("Órdenes de mantención abiertas", abiertas.count(), "Pueden afectar la producción", "ambar", "mantencion")]
            out["listas"] = [_lista("Procesos activos", [_it(p.nombre, f"{p.area} · {p.responsable}", f"{p.avance}%", "neutro", "procesos", p.id) for p in procesos.exclude(estado="completado")[:6]])]
        else:  # ing_transporte
            mes_d = desp.filter(fecha_salida__gte=mes_ini)
            out["kpis"] = [_k("En ruta", desp.filter(estado="en_ruta").count(), "", "neutro", "transporte"),
                           _k("Retrasados", desp.filter(estado="retrasado").count(), "", "rojo" if desp.filter(estado="retrasado").exists() else "verde", "transporte"),
                           _k("Entregados este mes", mes_d.filter(estado="entregado").count(), "", "verde", "transporte"),
                           _k("Costo de transporte (mes)", clp(mes_d.aggregate(t=Sum("costo"))["t"] or 0), "", "neutro", "transporte")]
            out["listas"] = [_lista("Despachos activos", [_it(d.codigo, f"{d.origen} → {d.destino} · {d.carga[:40]}", d.get_estado_display(), "rojo" if d.estado == "retrasado" else "neutro", "transporte", d.id)
                                                          for d in desp.exclude(estado="entregado")[:6]])]
    return out


@vista()
def indicadores(request):
    """Indicadores de gestión (preliminares): disponibilidad, MTTR, MTBF, fallas y costos."""
    if request.user.rol not in TERRENO + ROLES_WEB:
        raise Error(403, "Su perfil no tiene acceso a esta función.")
    cerradas = m.OrdenTrabajo.objects.filter(estado="cerrada", tipo="correctiva", cerrada_en__isnull=False)
    horas = [(o.cerrada_en - o.creada).total_seconds() / 3600 for o in cerradas]
    fallas90 = m.Reporte.objects.filter(creado__gte=timezone.now() - timedelta(days=90)).count()
    n_eq = m.Equipo.objects.count()
    top = m.Reporte.objects.values("equipo__nombre_habitual").annotate(n=Count("id")).order_by("-n")[:5]
    cons = defaultdict(int)
    for r in m.RepuestoOT.objects.filter(estado="usado").select_related("repuesto", "ot__equipo"):
        cons[r.ot.equipo.nombre_habitual] += r.costo_total
    return {"disponibilidad": disponibilidad(),
            "mttr_horas": round(sum(horas) / len(horas), 1) if horas else None,
            "mtbf_horas": round(90 * 24 * n_eq / fallas90) if fallas90 else None,
            "fallas_90d": fallas90, "costo_mantencion_30d": costo_mantencion(),
            "ot_por_estado": {e: m.OrdenTrabajo.objects.filter(estado=e).count() for e, _ in m.OrdenTrabajo.ESTADOS},
            "fallas_por_equipo": [{"equipo": f["equipo__nombre_habitual"], "fallas": f["n"]} for f in top],
            "costo_por_equipo": [{"equipo": k, "costo": v} for k, v in sorted(cons.items(), key=lambda x: -x[1])[:8]],
            "nota": "MTBF y disponibilidad son aproximaciones preliminares hasta contar con el registro de paradas."}


@vista()
def consumo(request):
    """Consumo de repuestos por equipo en un rango de fechas (cierre de mes)."""
    if request.user.rol not in TERRENO + OFICINA_LECTURA + ("encargado_procesos",):
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


@vista()
def calendario(request):
    """Eventos del mes que el usuario puede ver: planes, procesos y despachos."""
    r = request.user.rol
    d = parse_date((request.GET.get("mes") or "") + "-01") or timezone.localdate().replace(day=1)
    ini = d.replace(day=1)
    fin = date(ini.year + (ini.month == 12), ini.month % 12 + 1, 1) - timedelta(days=1)
    ev = []
    if r in RECURSOS["planes"]["leer"]:
        for p in m.Plan.objects.filter(fecha_inicio__lte=fin, fecha_fin__gte=ini):
            ev.append({"id": p.id, "tipo": "plan", "titulo": p.titulo, "inicio": p.fecha_inicio.isoformat(), "fin": p.fecha_fin.isoformat(), "estado": p.get_estado_display()})
    if r in RECURSOS["procesos"]["leer"]:
        for p in m.Proceso.objects.filter(fecha_inicio__lte=fin, fecha_fin__gte=ini):
            ev.append({"id": p.id, "tipo": "proceso", "titulo": p.nombre, "inicio": p.fecha_inicio.isoformat(), "fin": p.fecha_fin.isoformat(), "estado": p.get_estado_display()})
    if r in RECURSOS["despachos"]["leer"]:
        for x in m.Despacho.objects.filter(fecha_salida__lte=fin, fecha_salida__gte=ini):
            ev.append({"id": x.id, "tipo": "despacho", "titulo": f"{x.codigo} → {x.destino}", "inicio": x.fecha_salida.isoformat(), "fin": (x.fecha_llegada or x.fecha_salida).isoformat(), "estado": x.get_estado_display()})
    return {"mes": ini.strftime("%Y-%m"), "eventos": ev}


@vista()
def buscar(request):
    """Buscador global de la barra superior: busca solo en lo que el perfil puede ver."""
    q = request.GET.get("q", "").strip()
    if len(q) < 2:
        return {"resultados": []}
    out = []
    for cfg in RECURSOS.values():
        if not cfg["ficha"] or request.user.rol not in cfg["leer"]:
            continue
        qs = _filtrar({"q": q}, request.user, cfg, queryset(cfg, request.user))
        for o in qs[:4]:
            titulo, detalle = cfg["ficha"][0](o), cfg["ficha"][1](o)
            out.append({"tipo": cfg["tipo"], "id": o.pk, "titulo": titulo, "detalle": detalle, "ruta": cfg["ruta"](o)})
    return {"resultados": out[:25]}
