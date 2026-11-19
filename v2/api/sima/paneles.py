"""Paneles por perfil, 'Mi cargo', telemetría, indicadores, buscador, calendario y traspaso de turno."""
from collections import defaultdict
from datetime import date, datetime, timedelta

from django.db.models import Count, Sum
from django.http import Http404
from django.utils import timezone
from django.utils.dateparse import parse_date

from . import kpis as kp
from . import models as m
from . import planta
from .api import (Error, RECURSOS, _filtrar, cuerpo, queryset, serializar, solo, vista)
from .perfiles import GERENCIAL, PERFILES

REF = kp.REF
ESTADOS_PARADO = ("detenido", "alarma", "en_mantencion")


def clp(n):
    return "$" + f"{int(n):,}".replace(",", ".")


# ------------------------------------------------------------------ ficha de equipo
def oee_equipo(eq, dias=14):
    desde = timezone.localdate() - timedelta(days=dias)
    regs = list(m.RegistroProduccion.objects.filter(equipo=eq, fecha__gte=desde))
    plan, ideal, prod, buenas = (sum(getattr(r, c) for r in regs) for c in ("plan", "ideal", "producidas", "buenas"))
    pl, pa = sum(r.minutos_planificados for r in regs), sum(r.minutos_parada for r in regs)
    if not regs or not prod or not pl:
        return None
    return {"oee": round(100 * ((pl - pa) / pl) * (prod / ideal) * (buenas / prod), 1), "disponibilidad": round(100 * (pl - pa) / pl, 1),
            "rendimiento": round(100 * prod / ideal, 1), "calidad": round(100 * buenas / prod, 1)}


def sensores_de(eq):
    return [{"id": s.id, "variable": s.variable, "nombre": s.nombre, "unidad": s.unidad, "valor": s.ultimo, "nivel": s.nivel, "aviso": s.aviso, "alarma": s.alarma,
             "escala_min": s.escala_min, "escala_max": s.escala_max, "nominal": s.nominal, "reciente": s.reciente} for s in eq.sensores.all()]


def ficha_equipo(eq, user):
    f = eq.ficha
    d = {"ficha": serializar(f, ["id", "categoria", "icono", "nombre", "funcion", "especificaciones", "piezas", "herramientas", "fallas"]),
         "sensores": sensores_de(eq), "oee": oee_equipo(eq),
         "alarmas_activas": [serializar(a, ["id", "nivel", "mensaje", "inicio"]) for a in eq.alarmas.filter(fin__isnull=True)]}
    if user.rol in RECURSOS["ordenes"]["leer"] and user.canal == "app":
        hist = []
        for ot in eq.ordenes.all()[:5]:        # las 5 últimas intervenciones, de la más reciente
            ult = ot.bitacora.order_by("-creado").first()
            hist.append({"id": ot.id, "numero": ot.numero, "fecha": ot.creada.date().isoformat(), "falla": ot.titulo, "estado_display": ot.get_estado_display(), "estado": ot.estado,
                         "accion": ult.texto if ult else "", "repuestos": [f"{r.repuesto.nombre} × {r.cantidad}" for r in ot.repuestos.filter(estado="usado").select_related("repuesto")]})
        d["historial"] = hist
        d["notas"] = [serializar(n, ["id", "titulo", "texto", "autor", "creada"]) for n in eq.notas.all()[:3]]
        d["plcs"] = [serializar(p, ["id", "nombre", "marca", "modelo", "estado"]) for p in eq.plcs.all()]
        d["paradas"] = [serializar(p, ["id", "inicio", "fin", "motivo"], {"minutos": lambda o: o.minutos}) for p in eq.paradas.all()[:5]]
    return d


# ------------------------------------------------------------------ telemetría
@vista()
def telemetria_resumen(request):
    equipos = list(m.Equipo.objects.select_related("ficha").prefetch_related("sensores"))
    activas = defaultdict(int)
    for a in m.Alarma.objects.filter(fin__isnull=True, nivel="alarma"):
        activas[a.equipo_id] += 1
    out, cuenta = [], defaultdict(int)
    for e in equipos:
        cuenta[e.estado] += 1
        out.append({"id": e.id, "codigo": e.codigo, "nombre": e.nombre_habitual, "icono": e.ficha.icono, "categoria": e.ficha.nombre, "zona": e.zona, "linea": e.linea, "estado": e.estado,
                    "estado_display": e.get_estado_display(), "criticidad": e.criticidad, "alarmas": activas[e.id], "sensores": sensores_de(e)})
    return {"ts": timezone.now().isoformat(), "equipos": out, "resumen": dict(cuenta), "total": len(out)}


@vista()
def telemetria_serie(request, pk):
    eq = m.Equipo.objects.filter(pk=pk).first()
    if eq is None:
        raise Http404
    try:
        minutos = max(1, min(int(request.GET.get("minutos", 30)), 180))
    except ValueError:
        minutos = 30
    desde = timezone.now() - timedelta(minutes=minutos)
    out = []
    for s in eq.sensores.all():
        pts = list(s.lecturas.filter(ts__gte=desde).values_list("ts", "valor"))
        paso = max(1, len(pts) // 120)
        out.append({"id": s.id, "variable": s.variable, "nombre": s.nombre, "unidad": s.unidad, "aviso": s.aviso, "alarma": s.alarma, "escala_min": s.escala_min, "escala_max": s.escala_max,
                    "puntos": [{"t": t.isoformat(), "v": round(v, 2)} for t, v in pts[::paso]]})
    return {"equipo": eq.id, "nombre": eq.nombre_habitual, "series": out}


@vista(clave_ingesta=True)
def telemetria_ingesta(request):
    """Punto de entrada para gateways industriales (OPC UA, MQTT, Modbus, Node-RED…). Requiere cabecera X-API-Key."""
    solo(request, "POST")
    d = cuerpo(request)
    items = d.get("lecturas")
    if not isinstance(items, list) or not items:
        raise Error(400, "Envíe una lista 'lecturas' con equipo, variable y valor.")
    ok, rechazadas = planta.ingestar(items[:500])
    return {"ok": True, "aceptadas": ok, "rechazadas": rechazadas}


# ------------------------------------------------------------------ indicadores
@vista()
def kpis_lista(request):
    return {"kpis": kp.todos(), "nota": "OEE, cumplimiento del plan, defectos, MTTR, MTBF, OTIF y cierre de acciones se calculan con los datos de la base; "
                                        "los demás indicadores vienen de mediciones cargadas (ERP/MES)."}


@vista(clave_ingesta=True)
def kpis_ingesta(request):
    solo(request, "POST")
    items = cuerpo(request).get("mediciones")
    if not isinstance(items, list):
        raise Error(400, "Envíe una lista 'mediciones' con clave, periodo y valor.")
    n = 0
    for it in items:
        per = parse_date(str(it.get("periodo") or ""))
        if it.get("clave") in kp.DEFS and per:
            m.MedicionKPI.objects.update_or_create(clave=it["clave"], periodo=per.replace(day=1), defaults={"valor": float(it.get("valor"))})
            n += 1
    return {"ok": True, "guardadas": n}


@vista()
def referencia(request, nombre):
    if nombre not in REF:
        raise Http404
    return {nombre: REF[nombre]}


# ------------------------------------------------------------------ rutinas
def _inicio_periodo(frec, hoy=None):
    hoy = hoy or timezone.localdate()
    if frec == "turno":
        ini = hoy
    elif frec == "semanal":
        ini = hoy - timedelta(days=hoy.weekday())
    elif frec == "mensual":
        ini = hoy.replace(day=1)
    else:
        ini = date(hoy.year, 3 * ((hoy.month - 1) // 3) + 1, 1)
    return timezone.make_aware(datetime(ini.year, ini.month, ini.day))


def rutinas_pendientes(user):
    out = []
    for p in m.PlantillaRutina.objects.all():
        if user.rol not in p.perfiles:
            continue
        hecha = m.EjecucionRutina.objects.filter(plantilla=p, usuario=user, creado__gte=_inicio_periodo(p.frecuencia)).exists()
        if not hecha:
            out.append(p)
    return out


# ------------------------------------------------------------------ panel por perfil
def _k(etiqueta, valor, detalle="", tono="neutro", ruta="", spark=None):
    return {"etiqueta": etiqueta, "valor": valor, "detalle": detalle, "tono": tono, "ruta": ruta, "spark": spark}


def _it(titulo, detalle="", etiqueta="", tono="neutro", ruta="", id=None):
    return {"titulo": titulo, "detalle": detalle, "etiqueta": etiqueta, "tono": tono, "ruta": ruta, "id": id}


def _fmt(v, unidad):
    if v is None:
        return "—"
    return clp(v) if unidad == "$" else f"{v:g}{'' if unidad == '' else (' ' + unidad if unidad == 'h' else unidad)}"


TONO_KPI = {"ok": "verde", "aviso": "ambar", "critico": "rojo", "sin_dato": "neutro"}


class Panel:
    def __init__(self, user):
        self.u = user
        self.ruta_ind = "indicadores"
        self.abiertas = m.OrdenTrabajo.objects.exclude(estado="cerrada").select_related("equipo", "asignado_a")
        self.sin_tomar = m.Reporte.objects.filter(estado="enviado").select_related("equipo")
        self.hoy = timezone.localdate()

    # ---- tarjetas
    def kpi(self, clave):
        d = kp.kpi(clave)
        meta = f"meta {_fmt(d['meta'], d['unidad'])}"
        return _k(d["nombre"], _fmt(d["valor"], d["unidad"]), meta, TONO_KPI[d["estado"]], self.ruta_ind, [s["valor"] for s in d["serie"] if s["valor"] is not None])

    def tarjeta(self, clave):
        u, hoy = self.u, self.hoy
        if clave in kp.DEFS:
            return self.kpi(clave)
        eq = m.Equipo.objects
        if clave == "mis_reportes_abiertos":
            n = m.Reporte.objects.filter(operador=u).exclude(estado="resuelto").count()
            return _k("Mis reportes abiertos", n, "Esperando atención o en reparación", "ambar" if n else "verde", "mis_reportes")
        if clave == "disponibilidad":
            tot = eq.count()
            op = eq.filter(estado="operando").count()
            return _k("Equipos operando", f"{kp_pct(op, tot)}%", f"{op} de {tot}", "verde" if op == tot else "ambar", "mapa")
        if clave == "equipos_parados":
            n = eq.filter(estado__in=ESTADOS_PARADO).count()
            return _k("Equipos detenidos", n, "Con alarma, parada o en mantención", "rojo" if n else "verde", "mapa")
        if clave == "alarmas":
            n = m.Alarma.objects.filter(fin__isnull=True).count()
            g = m.Alarma.objects.filter(fin__isnull=True, nivel="alarma").count()
            return _k("Alarmas activas", n, f"{g} crítica" + ("s" if g != 1 else ""), "rojo" if g else ("ambar" if n else "verde"), "monitor")
        if clave == "reportes_sin_tomar":
            return _k("Fallas sin tomar", self.sin_tomar.count(), "Avisos de operadores", "rojo" if self.sin_tomar.exists() else "verde", "reportes")
        if clave == "mis_ot":
            n = self.abiertas.filter(asignado_a=u).count()
            return _k("Mis órdenes", n, "Asignadas a usted", "neutro", "ordenes")
        if clave == "ot_sin_avance":
            n = sum(1 for o in self.abiertas if o.sin_avance)
            return _k("Órdenes sin avance", n, "Equipos críticos, más de 4 h", "rojo" if n else "verde", "ordenes")
        if clave == "avisos":
            n = m.Aviso.objects.filter(atendido=False).count()
            return _k("Avisos de técnicos", n, "Por revisar", "ambar" if n else "verde", "avisos")
        if clave == "stock_critico":
            n = sum(1 for r in m.Repuesto.objects.all() if r.bajo_minimo)
            return _k("Repuestos bajo mínimo", n, "Revise bodega", "ambar" if n else "verde", "repuestos" if u.canal == "app" else "inventario")
        if clave == "plc_linea":
            n, t = m.PLC.objects.filter(estado="en_linea").count(), m.PLC.objects.count()
            return _k("PLC en línea", f"{kp_pct(n, t)}%", f"{n} de {t}", "verde", "plcs")
        if clave == "plc_alarma":
            n = m.PLC.objects.filter(estado="alarma").count()
            return _k("PLC con alarma", n, "", "rojo" if n else "verde", "plcs")
        if clave == "plc_revision":
            n = m.PLC.objects.filter(ultima_revision__lt=hoy - timedelta(days=90)).count()
            return _k("Sin revisión (90 días)", n, "Programar revisión", "ambar" if n else "verde", "plcs")
        if clave == "rutinas_hoy":
            n = len(rutinas_pendientes(u))
            return _k("Rutinas pendientes", n, "De su perfil en este período", "ambar" if n else "verde", "rutinas")
        if clave == "calibraciones_vencidas":
            n = sum(1 for h in m.Herramienta.objects.select_related("ficha") if h.calibracion_vencida)
            return _k("Calibraciones vencidas", n, "No se pueden retirar", "rojo" if n else "verde", "herramientas")
        if clave == "calibraciones_proximas":
            n = m.Herramienta.objects.filter(proxima_calibracion__gte=hoy, proxima_calibracion__lte=hoy + timedelta(days=30)).count()
            return _k("Calibraciones en 30 días", n, "", "ambar" if n else "verde", "herramientas")
        if clave == "herramientas_prestadas":
            return _k("Herramientas prestadas", m.Herramienta.objects.filter(estado="prestada").count(), "", "neutro", "herramientas")
        if clave == "repuestos_por_entregar":
            n = m.RepuestoOT.objects.filter(ot__estado__in=["abierta", "en_curso"], estado__in=["requerido", "reservado", "solicitado"]).count()
            return _k("Repuestos por entregar", n, "En órdenes abiertas", "ambar" if n else "verde", "ordenes")
        if clave == "no_conformes":
            n = m.NoConformidad.objects.filter(estado__in=["contenido", "en_analisis"]).count()
            return _k("No conformidades abiertas", n, "Producto contenido o en análisis", "ambar" if n else "verde", "calidad")
        if clave == "incidentes_abiertos":
            n = m.Incidente.objects.exclude(estado="cerrado").count()
            return _k("Incidentes abiertos", n, "", "rojo" if n else "verde", "seguridad")
        if clave == "acciones_vencidas":
            n = sum(1 for a in m.AccionHSE.objects.filter(cerrada_en__isnull=True) if a.vencida)
            return _k("Acciones vencidas", n, "Prevención", "rojo" if n else "verde", "seguridad")
        if clave in ("gasto_mes", "ingresos_mes", "resultado_mes"):
            mov = m.Movimiento.objects.filter(fecha__gte=hoy.replace(day=1))
            ing = mov.filter(tipo="ingreso").aggregate(t=Sum("monto"))["t"] or 0
            gas = mov.filter(tipo="gasto").aggregate(t=Sum("monto"))["t"] or 0
            if clave == "gasto_mes":
                return _k("Gastos del mes", clp(gas), "", "rojo", "finanzas")
            if clave == "ingresos_mes":
                return _k("Ingresos del mes", clp(ing), "", "verde", "finanzas")
            return _k("Resultado del mes", clp(ing - gas), f"Ingresos {clp(ing)}", "verde" if ing >= gas else "rojo", "finanzas")
        if clave == "contratos_vigentes":
            return _k("Contratos vigentes", m.Contrato.objects.filter(estado="vigente").count(), "", "neutro", "contratos")
        if clave == "contratos_vencer":
            n = len(self._por_vencer())
            return _k("Contratos por vencer", n, "En los próximos 30 días", "ambar" if n else "verde", "contratos")
        if clave == "procesos_curso":
            b = m.Proceso.objects.filter(estado="bloqueado").count()
            return _k("Procesos en curso", m.Proceso.objects.filter(estado="en_curso").count(), f"{b} bloqueados", "ambar" if b else "neutro", "procesos")
        if clave == "despachos_ruta":
            return _k("Despachos en ruta", m.Despacho.objects.filter(estado="en_ruta").count(), "", "neutro", "transporte")
        if clave == "despachos_retrasados_n":
            n = m.Despacho.objects.filter(estado="retrasado").count()
            return _k("Despachos retrasados", n, "Requieren contacto", "rojo" if n else "verde", "transporte")
        return None

    def _por_vencer(self):
        return [c for c in m.Contrato.objects.filter(estado="vigente", fecha_fin__isnull=False) if c.dias_para_vencer is not None and c.dias_para_vencer <= 30]

    # ---- listas
    def lista(self, clave):
        u, hoy = self.u, self.hoy
        rt = "ordenes"

        def ot(o):
            return _it(f"{o.numero} · {o.titulo[:60]}", f"{o.equipo.nombre_habitual} · {o.get_estado_display()}",
                       f"{o.horas_sin_avance} h sin avance" if o.sin_avance else o.get_prioridad_display(), "rojo" if o.sin_avance else ("ambar" if o.prioridad == "alta" else "neutro"), f"{rt}/{o.pk}", o.pk)
        if clave == "mis_ot":
            return ("Mis órdenes", [ot(o) for o in self.abiertas.filter(asignado_a=u)[:5]], "No tiene órdenes asignadas.")
        if clave == "ot_sin_avance":
            return ("Órdenes sin avance", [ot(o) for o in self.abiertas if o.sin_avance], "Ninguna orden crítica detenida.")
        if clave == "reportes_sin_tomar":
            return ("Fallas sin tomar", [_it(r.equipo.nombre_habitual, r.descripcion[:70], "Detiene la línea" if r.detiene_linea else "Nuevo", "rojo" if r.detiene_linea else "ambar", "reportes", r.id) for r in self.sin_tomar[:5]], "No hay fallas pendientes.")
        if clave == "mis_reportes":
            return ("Mis últimos reportes", [_it(r.equipo.nombre_habitual, r.descripcion[:70], r.get_estado_display(), {"enviado": "ambar", "tomado": "neutro", "resuelto": "verde"}[r.estado], "mis_reportes", r.id)
                                              for r in m.Reporte.objects.filter(operador=u).select_related("equipo")[:5]], "Aún no ha enviado reportes.")
        if clave == "alarmas_activas":
            return ("Alarmas activas", [_it(a.equipo.nombre_habitual, a.mensaje, a.get_nivel_display(), "rojo" if a.nivel == "alarma" else "ambar", "monitor", a.id) for a in m.Alarma.objects.filter(fin__isnull=True).select_related("equipo")[:6]], "Sin alarmas activas.")
        if clave == "avisos_pendientes":
            return ("Avisos de técnicos", [_it(a.equipo.nombre_habitual, a.texto[:80], a.get_tipo_display(), "ambar" if a.tipo in ("pendiente", "repuesto") else "verde", "avisos", a.id) for a in m.Aviso.objects.filter(atendido=False).select_related("equipo")[:5]], "Sin avisos pendientes.")
        if clave == "rutinas_pendientes":
            return ("Rutinas pendientes", [_it(p.nombre, p.get_frecuencia_display(), "Pendiente", "ambar", "rutinas", p.id) for p in rutinas_pendientes(u)[:5]], "Está al día con sus rutinas.")
        if clave == "ultimo_traspaso":
            t = m.TraspasoTurno.objects.select_related("autor").first()
            return ("Último traspaso de turno", [_it(f"Turno {t.turno} · {t.autor.nombre.split('·')[0].strip()}", (t.notas or "Sin notas")[:90], t.creado.strftime("%d/%m %H:%M"), "neutro", "traspaso", t.id)] if t else [], "Aún no hay traspasos.")
        if clave == "planes_proximos":
            return ("Próximos planes", [_it(p.titulo, f"{p.fecha_inicio:%d/%m} – {p.fecha_fin:%d/%m}", p.get_estado_display(), "neutro", "planificacion", p.id) for p in m.Plan.objects.exclude(estado="completado")[:5]], "Sin planes pendientes.")
        if clave == "stock_critico":
            rr = "repuestos" if u.canal == "app" else "inventario"
            return ("Repuestos bajo el mínimo", [_it(r.nombre, f"{r.bodega} · mínimo {r.stock_minimo}", f"Stock {r.stock}", "rojo", rr, r.id) for r in m.Repuesto.objects.all() if r.bajo_minimo][:6], "Todo sobre el mínimo.")
        if clave == "herramientas_calibracion":
            hs = [h for h in m.Herramienta.objects.select_related("ficha") if h.ficha.cal_dias and h.proxima_calibracion and h.proxima_calibracion <= hoy + timedelta(days=30)]
            return ("Calibraciones por vencer", [_it(f"{h.ficha.nombre} {h.codigo}", f"Vence {h.proxima_calibracion:%d/%m/%Y}", "Vencida" if h.calibracion_vencida else "Próxima", "rojo" if h.calibracion_vencida else "ambar", "herramientas", h.id) for h in hs[:6]], "Todas las calibraciones al día.")
        if clave == "herramientas_prestadas":
            return ("Herramientas prestadas", [_it(f"{h.ficha.nombre} {h.codigo}", f"{(h.asignada_a.nombre.split('·')[0].strip() if h.asignada_a else '')}", "Prestada", "neutro", "herramientas", h.id) for h in m.Herramienta.objects.filter(estado="prestada").select_related("ficha", "asignada_a")[:6]], "Todo en el pañol.")
        if clave == "repuestos_por_entregar":
            return ("Repuestos por entregar", [_it(f"{r.repuesto.nombre} × {r.cantidad}", f"{r.ot.numero} · {r.ot.equipo.nombre_habitual}", r.get_estado_display(), "ambar" if r.suficiente else "rojo", f"ordenes/{r.ot_id}", r.id)
                                               for r in m.RepuestoOT.objects.filter(ot__estado__in=["abierta", "en_curso"], estado__in=["requerido", "reservado", "solicitado"]).select_related("repuesto", "ot__equipo")[:6]], "Nada por entregar.")
        if clave == "plc_atencion":
            return ("PLC que requieren atención", [_it(p.nombre, f"{p.equipo.nombre_habitual} · {p.marca} {p.modelo}", p.get_estado_display(), "rojo" if p.estado == "alarma" else "ambar", f"plcs/{p.pk}", p.pk) for p in m.PLC.objects.exclude(estado="en_linea").select_related("equipo")], "Todos los PLC están en línea.")
        if clave == "no_conformes":
            return ("No conformidades", [_it(f"Lote {n.lote} · {n.producto}", n.defecto[:70], n.get_estado_display(), "ambar", "calidad", n.id) for n in m.NoConformidad.objects.filter(estado__in=["contenido", "en_analisis"])[:5]], "Sin producto contenido.")
        if clave == "incidentes_abiertos":
            return ("Incidentes abiertos", [_it(i.descripcion[:70], i.ubicacion or i.get_tipo_display(), i.get_tipo_display(), "rojo" if i.tipo == "incidente" else "ambar", "seguridad", i.id) for i in m.Incidente.objects.exclude(estado="cerrado")[:5]], "Sin incidentes abiertos.")
        if clave == "acciones_hse":
            return ("Acciones preventivas", [_it(a.descripcion[:70], f"{a.responsable} · vence {a.vence:%d/%m}", "Vencida" if a.vencida else "En plazo", "rojo" if a.vencida else "neutro", "seguridad", a.id) for a in m.AccionHSE.objects.filter(cerrada_en__isnull=True)[:5]], "Sin acciones pendientes.")
        if clave == "procesos_bloqueados":
            return ("Procesos bloqueados", [_it(p.nombre, f"{p.area} · {p.responsable}", f"{p.avance}%", "rojo", "procesos", p.id) for p in m.Proceso.objects.filter(estado="bloqueado")], "Ningún proceso bloqueado.")
        if clave == "despachos_retrasados":
            return ("Despachos retrasados", [_it(d.codigo, f"{d.origen} → {d.destino}", "Retrasado", "rojo", "transporte", d.id) for d in m.Despacho.objects.filter(estado="retrasado")], "Sin retrasos.")
        if clave == "despachos_activos":
            return ("Despachos activos", [_it(d.codigo, f"{d.origen} → {d.destino} · {d.carga[:40]}", d.get_estado_display(), "rojo" if d.estado == "retrasado" else "neutro", "transporte", d.id) for d in m.Despacho.objects.exclude(estado="entregado")[:6]], "Sin despachos activos.")
        if clave == "contratos_por_vencer":
            return ("Contratos por vencer", [_it(c.trabajador, f"{c.cargo} · vence {c.fecha_fin:%d/%m/%Y}", f"{c.dias_para_vencer} días", "ambar", "contratos", c.id) for c in self._por_vencer()], "Ningún contrato vence pronto.")
        if clave == "ultimos_movimientos":
            return ("Últimos movimientos", [_it(x.descripcion, f"{x.categoria} · {x.fecha:%d/%m}", clp(x.monto), "verde" if x.tipo == "ingreso" else "rojo", "finanzas", x.id) for x in m.Movimiento.objects.all()[:5]], "Sin movimientos.")
        return None


def kp_pct(a, b):
    return round(100 * a / b) if b else 0


def mensual(n=6):
    hoy = timezone.localdate().replace(day=1)
    meses = []
    for i in range(n - 1, -1, -1):
        y, mth = hoy.year, hoy.month - i
        while mth <= 0:
            mth, y = mth + 12, y - 1
        meses.append(date(y, mth, 1))
    ing, gas = [], []
    for ini in meses:
        fin = date(ini.year + (ini.month == 12), ini.month % 12 + 1, 1)
        qs = m.Movimiento.objects.filter(fecha__gte=ini, fecha__lt=fin)
        ing.append(qs.filter(tipo="ingreso").aggregate(t=Sum("monto"))["t"] or 0)
        gas.append(qs.filter(tipo="gasto").aggregate(t=Sum("monto"))["t"] or 0)
    return {"meses": [kp.MESES[d.month - 1] for d in meses], "ingresos": ing, "gastos": gas}


@vista()
def dashboard(request):
    u = request.user
    p = PERFILES[u.rol]
    panel = Panel(u)
    kpis_out, listas = [], []
    for b in p["panel"]:
        tipo, clave = b.split(":", 1)
        if tipo == "k":
            t = panel.tarjeta(clave)
            if t:
                kpis_out.append(t)
        else:
            r = panel.lista(clave)
            if r:
                listas.append({"titulo": r[0], "items": r[1], "vacio": r[2]})
    cuenta = {e["estado"]: e["n"] for e in m.Equipo.objects.values("estado").annotate(n=Count("id"))}
    return {"rol": u.rol, "perfil": p["nombre"], "kpis": kpis_out, "listas": listas, "acciones": p["acciones"],
            "planta": {"operando": cuenta.get("operando", 0), "alarma": cuenta.get("alarma", 0), "detenido": cuenta.get("detenido", 0), "en_mantencion": cuenta.get("en_mantencion", 0)},
            "mensual": mensual() if u.rol in ("gerencia", "finanzas_adm") else None}


@vista()
def mi_cargo(request):
    u = request.user
    p = PERFILES[u.rol]
    c = u.cargo
    claves = [b.split(":", 1)[1] for b in p["panel"] if b.startswith("k:") and b.split(":", 1)[1] in kp.DEFS]
    mom = REF["rutina_dia"]
    h = timezone.localtime().hour
    actual = 0 if h < 6 else 2 if h < 14 else 3 if h < 18 else 2
    return {"perfil": p["nombre"], "canal": p["canal"], "turno": u.get_turno_display(),
            "cargo": serializar(c, ["numero", "familia_nombre", "nombre", "existe", "hace", "entrega", "coordina", "medir", "conocimientos"]) if c else None,
            "kpis": [kp.kpi(k) for k in claves], "rutina_dia": mom, "momento_actual": actual if u.canal == "app" else None,
            "checklist": REF["checklists"].get(u.rol), "pendientes": [{"id": x.id, "nombre": x.nombre, "frecuencia": x.get_frecuencia_display()} for x in rutinas_pendientes(u)]}


@vista(*(("supervisor_turno", "jefe_mant", "supervisor_mant") + GERENCIAL))
def traspaso_borrador(request):
    """Resumen automático del estado de la planta para entregar el turno (informe de roles, §3)."""
    ots = m.OrdenTrabajo.objects.exclude(estado="cerrada").select_related("equipo", "asignado_a")
    return {"items_revision": REF["traspaso_items"], "resumen": {
        "ordenes": [{"numero": o.numero, "equipo": o.equipo.nombre_habitual, "titulo": o.titulo[:70], "estado": o.get_estado_display(), "sin_avance": o.sin_avance,
                     "responsable": o.asignado_a.nombre.split("·")[0].strip() if o.asignado_a else "Sin asignar"} for o in ots],
        "equipos_fuera_servicio": [{"equipo": e.nombre_habitual, "estado": e.get_estado_display()} for e in m.Equipo.objects.filter(estado__in=ESTADOS_PARADO)],
        "alarmas": [{"equipo": a.equipo.nombre_habitual, "mensaje": a.mensaje, "nivel": a.nivel} for a in m.Alarma.objects.filter(fin__isnull=True).select_related("equipo")],
        "stock_critico": [{"repuesto": r.nombre, "stock": r.stock, "minimo": r.stock_minimo} for r in m.Repuesto.objects.filter(critico=True) if r.bajo_minimo],
        "fallas_sin_tomar": [{"equipo": r.equipo.nombre_habitual, "descripcion": r.descripcion[:70]} for r in m.Reporte.objects.filter(estado="enviado").select_related("equipo")],
        "no_conformidades": [{"lote": n.lote, "defecto": n.defecto[:60], "estado": n.get_estado_display()} for n in m.NoConformidad.objects.filter(estado__in=["contenido", "en_analisis"])],
        "incidentes": [{"tipo": i.get_tipo_display(), "descripcion": i.descripcion[:70]} for i in m.Incidente.objects.exclude(estado="cerrado")],
        "paradas_hoy": [{"equipo": p.equipo.nombre_habitual, "motivo": p.get_motivo_display(), "minutos": p.minutos} for p in m.Parada.objects.filter(inicio__date=timezone.localdate()).select_related("equipo")]}}


# ------------------------------------------------------------------ calendario y buscador
@vista()
def calendario(request):
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
    """Buscador global: busca solo en lo que el perfil puede ver."""
    q = request.GET.get("q", "").strip()
    if len(q) < 2:
        return {"resultados": []}
    out = []
    for cfg in RECURSOS.values():
        if not cfg["ficha"] or request.user.rol not in cfg["leer"]:
            continue
        for o in _filtrar({"q": q}, request.user, cfg, queryset(cfg, request.user))[:4]:
            out.append({"tipo": cfg["tipo"], "id": o.pk, "titulo": cfg["ficha"][0](o), "detalle": cfg["ficha"][1](o), "ruta": cfg["ruta"](o)})
    return {"resultados": out[:30]}
