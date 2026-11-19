from collections import defaultdict
from datetime import date, timedelta

from django.conf import settings
from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.db import IntegrityError, transaction
from django.db.models import Count, F, Prefetch, Q
from django.http import Http404, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.views.decorators.http import require_POST
from django.views.static import serve as servir_archivo
from functools import wraps

from . import forms as f
from .models import (Bitacora, Equipo, Informe, Nota, OrdenTrabajo, Plan, Repuesto, RepuestoOT, Reporte)

TEC, ING, OPE = "tecnico", "ingeniero", "operador"
PLANTA = (TEC, ING)

MENUS = {
    TEC: [("Inicio", "inicio"), ("Avisos", "aviso_lista"), ("Órdenes", "ot_lista"), ("Equipos", "equipo_lista"),
          ("Repuestos", "repuesto_lista"), ("Notas", "nota_lista"), ("Informes", "informe_lista")],
    ING: [("Inicio", "inicio"), ("Planificador", "plan_lista"), ("Órdenes", "ot_lista"), ("Avisos", "aviso_lista"),
          ("Equipos", "equipo_lista"), ("Repuestos", "repuesto_lista"), ("Notas", "nota_lista"),
          ("Informes", "informe_lista")],
    OPE: [("Inicio", "inicio"), ("Equipos", "equipo_lista"), ("Avisar falla", "aviso_nuevo"),
          ("Mis reportes", "mis_reportes")],
}


def menu(request):
    """Context processor: cada rol ve solo su propio menú."""
    if request.user.is_authenticated:
        return {"menu": MENUS.get(request.user.rol, [])}
    return {}


def roles(*permitidos):
    def deco(vista):
        @wraps(vista)
        @login_required
        def w(request, *a, **kw):
            if request.user.rol not in permitidos:
                raise PermissionDenied
            return vista(request, *a, **kw)
        return w
    return deco


def login_view(request):
    if request.user.is_authenticated:
        return redirect("inicio")
    form = f.LoginForm(request.POST or None, request=request)
    if request.method == "POST" and form.is_valid():
        login(request, form.user)
        return redirect("inicio")
    return render(request, "sima/login.html", {"form": form})


@require_POST
def logout_view(request):
    logout(request)
    return redirect("login")


@login_required
def inicio(request):
    rol = request.user.rol
    if rol == OPE:
        n = Reporte.objects.filter(operador=request.user).exclude(estado="resuelto").count()
        return render(request, "sima/inicio.html", {"pendientes": n})
    abiertas = OrdenTrabajo.objects.exclude(estado="cerrada").select_related("equipo", "asignado_a")
    ctx = {
        "sin_tomar": Reporte.objects.filter(estado="enviado").select_related("equipo"),
        "stock_bajo": [r for r in Repuesto.objects.all() if r.bajo_minimo][:5],
        "traspasos": Bitacora.objects.filter(es_traspaso=True, ot__in=abiertas).select_related("ot", "autor")[:3],
        "mis_ot": abiertas.filter(asignado_a=request.user),
    }
    if rol == ING:
        ctx["alertas"] = [ot for ot in abiertas if ot.sin_avance]
        ctx["n_abiertas"] = abiertas.count()
        ctx["proximos"] = Plan.objects.exclude(estado="completado").select_related("equipo")[:4]
    return render(request, "sima/inicio.html", ctx)


# ---- Equipos ----
@login_required
def equipo_lista(request):
    q = request.GET.get("q", "").strip()
    equipos = Equipo.objects.all()
    if q:
        equipos = equipos.filter(Q(nombre_habitual__icontains=q) | Q(codigo__icontains=q) | Q(ubicacion__icontains=q))
    return render(request, "sima/equipo_lista.html", {"equipos": equipos, "q": q})


@login_required
def equipo_detalle(request, pk):
    equipo = get_object_or_404(Equipo, pk=pk)
    ctx = {"equipo": equipo}
    if request.user.rol in PLANTA:
        usados = Prefetch("repuestos", queryset=RepuestoOT.objects.filter(estado="usado").select_related("repuesto"),
                          to_attr="usados")
        ctx["historial"] = equipo.ordenes.prefetch_related(usados)[:5]  # las 5 últimas, de la más reciente
        ctx["notas"] = equipo.notas.select_related("autor")[:3]
        ctx["manual_form"] = f.ManualForm()
    return render(request, "sima/equipo_detalle.html", ctx)


@require_POST
@roles(*PLANTA)
def equipo_manual(request, pk):
    equipo = get_object_or_404(Equipo, pk=pk)
    form = f.ManualForm(request.POST, request.FILES, instance=equipo)
    if form.is_valid() and request.FILES.get("manual"):
        form.save()
        messages.success(request, "Manual cargado.")
    else:
        messages.error(request, "Elija un archivo para cargar el manual.")
    return redirect("equipo_detalle", pk=pk)


# ---- Repuestos ----
@roles(*PLANTA)
def repuesto_lista(request):
    q = request.GET.get("q", "").strip()
    bodega = request.GET.get("bodega", "")
    tipo = request.GET.get("tipo", "")
    reps = Repuesto.objects.all()
    if q:
        reps = reps.filter(Q(nombre__icontains=q) | Q(codigo__icontains=q))
    if bodega:
        reps = reps.filter(bodega=bodega)
    if tipo:
        reps = reps.filter(tipo=tipo)
    return render(request, "sima/repuesto_lista.html", {
        "repuestos": reps, "q": q, "bodega": bodega, "tipo": tipo,
        "bodegas": Repuesto.objects.order_by().values_list("bodega", flat=True).distinct(),
        "tipos": Repuesto.objects.order_by().values_list("tipo", flat=True).distinct()})


@roles(*PLANTA)
def consumo(request):
    """Consumo de repuestos por equipo en un rango de fechas (cierre de mes)."""
    hasta = parse_date(request.GET.get("hasta", "")) or date.today()
    desde = parse_date(request.GET.get("desde", "")) or hasta - timedelta(days=30)
    usos = (RepuestoOT.objects.filter(estado="usado", entregado_en__date__gte=desde, entregado_en__date__lte=hasta)
            .select_related("repuesto", "ot__equipo"))
    por_equipo = defaultdict(lambda: {"filas": defaultdict(lambda: [0, 0]), "total": 0})
    for u in usos:
        e = por_equipo[u.ot.equipo]
        e["filas"][u.repuesto][0] += u.cantidad
        e["filas"][u.repuesto][1] += u.costo_total
        e["total"] += u.costo_total
    equipos = [{"equipo": eq, "total": d["total"], "filas": [(r, c, t) for r, (c, t) in d["filas"].items()]}
               for eq, d in por_equipo.items()]
    equipos.sort(key=lambda x: -x["total"])
    return render(request, "sima/consumo.html", {"equipos": equipos, "desde": desde, "hasta": hasta,
                                                  "total": sum(e["total"] for e in equipos)})


# ---- Avisos de falla ----
@login_required
def aviso_nuevo(request):
    form = f.ReporteForm(request.POST or None, request.FILES or None)
    if request.method == "POST" and form.is_valid():
        rep = form.save(commit=False)
        rep.operador = request.user
        rep.save()
        messages.success(request, "Aviso enviado. Mantención ya puede verlo.")
        return redirect("mis_reportes" if request.user.rol == OPE else "aviso_lista")
    return render(request, "sima/form.html", {"form": form, "titulo": "Avisar una falla", "boton": "Enviar aviso",
                                              "multipart": True})


@roles(OPE)
def mis_reportes(request):
    return render(request, "sima/mis_reportes.html", {
        "reportes": Reporte.objects.filter(operador=request.user).select_related("equipo", "tecnico")})


@roles(*PLANTA)
def aviso_lista(request):
    avisos = Reporte.objects.select_related("equipo", "operador", "tecnico").order_by("estado", "-creado")
    return render(request, "sima/aviso_lista.html", {"avisos": avisos})


@require_POST
@roles(TEC)
def aviso_tomar(request, pk):
    with transaction.atomic():
        aviso = get_object_or_404(Reporte.objects.select_for_update(), pk=pk)
        if aviso.estado != "enviado":
            messages.error(request, "Este aviso ya fue tomado por otro técnico.")
            return redirect("aviso_lista")
        ot = OrdenTrabajo.objects.create(
            equipo=aviso.equipo, titulo=aviso.descripcion[:120], descripcion=aviso.descripcion,
            prioridad="alta" if aviso.detiene_linea else "media", estado="en_curso",
            asignado_a=request.user, creado_por=request.user, reporte=aviso)
        aviso.estado, aviso.tecnico = "tomado", request.user
        aviso.save()
        Bitacora.objects.create(ot=ot, autor=request.user, texto="Aviso tomado. Se inicia la intervención.")
    messages.success(request, f"Tomó el aviso. Se creó la {ot.numero}.")
    return redirect("ot_detalle", pk=ot.pk)


# ---- Órdenes de trabajo ----
@roles(*PLANTA)
def ot_lista(request):
    filtro = request.GET.get("f", "abiertas")
    ordenes = OrdenTrabajo.objects.select_related("equipo", "asignado_a")
    if filtro == "mias":
        ordenes = ordenes.filter(asignado_a=request.user).exclude(estado="cerrada")
    elif filtro == "cerradas":
        ordenes = ordenes.filter(estado="cerrada")
    else:
        filtro, ordenes = "abiertas", ordenes.exclude(estado="cerrada")
    return render(request, "sima/ot_lista.html", {"ordenes": ordenes, "filtro": filtro})


@roles(*PLANTA)
def ot_nueva(request):
    form = f.OTForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        ot = form.save(commit=False)
        ot.creado_por = request.user
        ot.save()
        messages.success(request, f"Se creó la {ot.numero}.")
        return redirect("ot_detalle", pk=ot.pk)
    return render(request, "sima/form.html", {"form": form, "titulo": "Nueva orden de trabajo", "boton": "Crear orden"})


@roles(*PLANTA)
def ot_detalle(request, pk):
    ot = get_object_or_404(OrdenTrabajo.objects.select_related("equipo", "asignado_a"), pk=pk)
    return render(request, "sima/ot_detalle.html", {
        "ot": ot,
        "bitacora": ot.bitacora.select_related("autor"),
        "traspaso": ot.bitacora.filter(es_traspaso=True).select_related("autor").last(),
        "repuestos": ot.repuestos.select_related("repuesto"),
        "bitacora_form": f.BitacoraForm(),
        "repuesto_form": f.RepuestoOTForm(),
    })


def _responder(request, pk, ok, texto, status=200):
    """Respuesta JSON para el registro sin conexión; redirección para el uso normal."""
    if request.headers.get("x-requested-with") == "fetch":
        return JsonResponse({"ok": ok, "mensaje": texto}, status=status)
    (messages.success if ok else messages.error)(request, texto)
    return redirect("ot_detalle", pk=pk)


@require_POST
@roles(*PLANTA)
def ot_bitacora(request, pk):
    ot = get_object_or_404(OrdenTrabajo, pk=pk)
    if not ot.abierta:
        return _responder(request, pk, False, "La orden está cerrada; ya no admite cambios.", 409)
    form = f.BitacoraForm(request.POST)
    if not form.is_valid():
        return _responder(request, pk, False, "Escriba el diagnóstico o la acción realizada.", 400)
    d = form.cleaned_data
    hecho = d.get("hecho_en") or timezone.now()
    hecho = min(hecho, timezone.now())  # un registro hecho sin conexión no puede quedar en el futuro
    try:
        with transaction.atomic():
            Bitacora.objects.create(ot=ot, autor=request.user, texto=d["texto"], horas=d.get("horas") or 0,
                                    es_traspaso=d["es_traspaso"], creado=hecho, uid=d.get("uid") or None)
    except IntegrityError:  # mismo uid: ya estaba sincronizado, no se duplica
        return _responder(request, pk, True, "Registro ya sincronizado.")
    if ot.estado == "abierta":
        ot.estado = "en_curso"
        ot.save()
    return _responder(request, pk, True, "Registro guardado en la bitácora.")


@require_POST
@roles(*PLANTA)
def ot_repuesto_agregar(request, pk):
    ot = get_object_or_404(OrdenTrabajo, pk=pk)
    form = f.RepuestoOTForm(request.POST)
    if not ot.abierta or not form.is_valid():
        messages.error(request, "No se pudo agregar el repuesto.")
    else:
        RepuestoOT.objects.create(ot=ot, repuesto=form.cleaned_data["repuesto"],
                                  cantidad=form.cleaned_data["cantidad"], registrado_por=request.user)
        messages.success(request, "Repuesto agregado como requerido.")
    return redirect("ot_detalle", pk=pk)


@require_POST
@roles(*PLANTA)
def ot_repuesto_accion(request, pk, accion):
    """Bodega: reservar (descuenta stock), solicitar (si falta stock) o entregar (queda ligado a la OT y la máquina)."""
    with transaction.atomic():
        uso = get_object_or_404(RepuestoOT.objects.select_for_update().select_related("ot"), pk=pk)
        rep = Repuesto.objects.select_for_update().get(pk=uso.repuesto_id)
        ot = uso.ot
        if not ot.abierta or uso.estado == "usado":
            messages.error(request, "Este repuesto ya no admite cambios.")
        elif accion == "solicitar":
            if rep.stock >= uso.cantidad:
                messages.error(request, "Hay stock suficiente: puede reservarlo.")
            else:
                uso.estado = "solicitado"
                uso.save()
                messages.success(request, "Repuesto marcado como solicitado.")
        elif accion in ("reservar", "entregar"):
            if uso.estado != "reservado":  # si ya estaba reservado, el stock ya se descontó
                if rep.stock < uso.cantidad:
                    messages.error(request, f"Stock insuficiente de {rep.nombre} (disponible: {rep.stock}).")
                    return redirect("ot_detalle", pk=ot.pk)
                Repuesto.objects.filter(pk=rep.pk).update(stock=F("stock") - uso.cantidad)
            if accion == "reservar":
                uso.estado = "reservado"
                texto = f"Repuesto reservado: {rep.nombre} × {uso.cantidad}."
            else:
                uso.estado, uso.entregado_en = "usado", timezone.now()
                texto = f"Repuesto entregado: {rep.nombre} × {uso.cantidad}."
            uso.save()
            Bitacora.objects.create(ot=ot, autor=request.user, texto=texto)
            messages.success(request, texto)
        else:
            raise Http404
    return redirect("ot_detalle", pk=ot.pk)


@require_POST
@roles(*PLANTA)
def ot_estado(request, pk):
    ot = get_object_or_404(OrdenTrabajo, pk=pk)
    nuevo = request.POST.get("estado")
    if nuevo == "en_curso" and ot.estado == "abierta":
        ot.estado = "en_curso"
        Bitacora.objects.create(ot=ot, autor=request.user, texto="Se inicia la intervención.")
    elif nuevo == "cerrada" and ot.abierta:
        ot.estado, ot.cerrada_en = "cerrada", timezone.now()
        Bitacora.objects.create(ot=ot, autor=request.user, texto="Orden cerrada.")
        if ot.reporte_id:
            Reporte.objects.filter(pk=ot.reporte_id).update(estado="resuelto")
    else:
        messages.error(request, "Ese cambio de estado no es válido.")
        return redirect("ot_detalle", pk=pk)
    ot.save()
    messages.success(request, "Estado actualizado.")
    return redirect("ot_detalle", pk=pk)


# ---- Notas ----
@roles(*PLANTA)
def nota_lista(request):
    return render(request, "sima/nota_lista.html", {"notas": Nota.objects.select_related("autor", "equipo")})


@roles(*PLANTA)
def nota_nueva(request):
    form = f.NotaForm(request.POST or None, initial={"equipo": request.GET.get("equipo")})
    if request.method == "POST" and form.is_valid():
        n = form.save(commit=False)
        n.autor = request.user
        n.save()
        messages.success(request, "Nota publicada.")
        return redirect("nota_lista")
    return render(request, "sima/form.html", {"form": form, "titulo": "Nueva nota o recomendación", "boton": "Publicar"})


# ---- Planificador (ingeniero) ----
@roles(ING)
def plan_lista(request):
    planes = Plan.objects.select_related("equipo", "responsable")
    orden = [("en_curso", "En curso"), ("planificado", "Planificado"), ("completado", "Completado")]
    return render(request, "sima/plan_lista.html", {
        "grupos": [(t, [p for p in planes if p.estado == k]) for k, t in orden]})


@roles(ING)
def plan_nuevo(request):
    form = f.PlanForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        p = form.save(commit=False)
        p.creado_por = request.user
        p.save()
        messages.success(request, "Plan guardado.")
        return redirect("plan_lista")
    return render(request, "sima/form.html", {"form": form, "titulo": "Nuevo plan", "boton": "Guardar plan"})


@require_POST
@roles(ING)
def plan_estado(request, pk):
    p = get_object_or_404(Plan, pk=pk)
    if request.POST.get("estado") in dict(Plan.ESTADOS):
        p.estado = request.POST["estado"]
        p.save()
    return redirect("plan_lista")


# ---- Informes ----
def _indicadores():
    fallas = Reporte.objects.values("equipo__nombre_habitual").annotate(n=Count("id")).order_by("-n")[:5]
    return {
        "fallas": [(x["equipo__nombre_habitual"], x["n"]) for x in fallas],
        "ot_abiertas": OrdenTrabajo.objects.exclude(estado="cerrada").count(),
        "ot_cerradas": OrdenTrabajo.objects.filter(estado="cerrada").count(),
        "stock_bajo": sum(1 for r in Repuesto.objects.all() if r.bajo_minimo),
    }


@roles(*PLANTA)
def informe_lista(request):
    informes = Informe.objects.select_related("autor")
    if request.user.rol == TEC:
        informes = informes.filter(compartido=True)
    ctx = {"informes": informes}
    if request.user.rol == ING:
        ctx["ind"] = _indicadores()
    return render(request, "sima/informe_lista.html", ctx)


@roles(*PLANTA)
def informe_detalle(request, pk):
    inf = get_object_or_404(Informe, pk=pk)
    if request.user.rol == TEC and not inf.compartido:
        raise Http404
    return render(request, "sima/informe_detalle.html", {"informe": inf})


@roles(ING)
def informe_nuevo(request):
    form = f.InformeForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        inf = form.save(commit=False)
        inf.autor = request.user
        inf.save()
        messages.success(request, "Informe guardado.")
        return redirect("informe_detalle", pk=inf.pk)
    return render(request, "sima/form.html", {"form": form, "titulo": "Nuevo informe", "boton": "Guardar informe"})


@require_POST
@roles(ING)
def informe_compartir(request, pk):
    inf = get_object_or_404(Informe, pk=pk)
    inf.compartido = not inf.compartido
    inf.save()
    messages.success(request, "Informe compartido con los técnicos." if inf.compartido else "Informe dejado privado.")
    return redirect("informe_detalle", pk=pk)


# ---- Archivos subidos: solo con sesión iniciada ----
@login_required
def media(request, path):
    return servir_archivo(request, path, document_root=settings.MEDIA_ROOT)
