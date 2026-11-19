"""Indicadores por área (tabla 6 del informe de roles). Los operacionales se calculan con datos reales de la base;
el resto se lee de MedicionKPI, que un ERP o MES puede alimentar con POST /api/kpis/ingesta/."""
import json
from datetime import date, timedelta
from pathlib import Path

from django.db.models import Sum
from django.utils import timezone

from . import models as m

REF = json.loads((Path(__file__).parent / "data" / "referencia.json").read_text(encoding="utf-8"))
DEFS = {k["clave"]: k for k in REF["kpis"]}
OPERACIONALES = ("oee", "cumplimiento_plan", "tasa_defectos", "mttr", "mtbf", "cierre_acciones", "otif")
MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]


def _suma(qs, campo):
    return qs.aggregate(t=Sum(campo))["t"] or 0


def calcular(clave, desde, hasta):
    """Valor del indicador entre dos fechas (incluidas) o None si no hay datos."""
    regs = m.RegistroProduccion.objects.filter(fecha__gte=desde, fecha__lte=hasta)
    if clave in ("oee", "cumplimiento_plan", "tasa_defectos", "mtbf"):
        plan, ideal, prod, buenas = (_suma(regs, c) for c in ("plan", "ideal", "producidas", "buenas"))
        planificados, parada = _suma(regs, "minutos_planificados"), _suma(regs, "minutos_parada")
        if not planificados or not prod:
            return None
        if clave == "oee":
            return round(100 * ((planificados - parada) / planificados) * (prod / ideal) * (buenas / prod), 1)
        if clave == "cumplimiento_plan":
            return round(100 * buenas / plan, 1)
        if clave == "tasa_defectos":
            return round(100 * (prod - buenas) / prod, 2)
        fallas = m.Parada.objects.filter(motivo="falla", inicio__date__gte=desde, inicio__date__lte=hasta).count()
        return round((planificados - parada) / 60 / fallas, 1) if fallas else None
    if clave == "mttr":
        ps = list(m.Parada.objects.filter(motivo="falla", fin__isnull=False, inicio__date__gte=desde, inicio__date__lte=hasta))
        return round(sum(p.minutos for p in ps) / 60 / len(ps), 1) if ps else None
    if clave == "cierre_acciones":
        acs = list(m.AccionHSE.objects.filter(vence__gte=desde, vence__lte=hasta))
        if not acs:
            return None
        return round(100 * sum(1 for a in acs if a.cerrada_en and a.cerrada_en.date() <= a.vence) / len(acs), 1)
    if clave == "otif":
        ds = list(m.Despacho.objects.filter(fecha_compromiso__gte=desde, fecha_compromiso__lte=hasta))
        if not ds:
            return None
        return round(100 * sum(1 for d in ds if d.estado == "entregado" and d.completo and d.fecha_llegada and d.fecha_llegada <= d.fecha_compromiso) / len(ds), 1)
    return None


def ventanas(n=6, hoy=None):
    hoy = hoy or timezone.localdate()
    out = []
    for i in range(n - 1, -1, -1):
        y, mes = hoy.year, hoy.month - i
        while mes <= 0:
            mes, y = mes + 12, y - 1
        ini = date(y, mes, 1)
        fin = date(y + (mes == 12), mes % 12 + 1, 1) - timedelta(days=1)
        out.append((ini, min(fin, hoy)))
    return out


def semaforo(d, valor):
    if valor is None:
        return "sin_dato"
    meta = d["meta"]
    if d["mejor"] == "alto":
        return "ok" if valor >= meta else "aviso" if valor >= meta * 0.9 else "critico"
    return "ok" if valor <= meta else "aviso" if valor <= meta * 1.15 else "critico"


def kpi(clave, n=6):
    d = DEFS[clave]
    serie = []
    for ini, fin in ventanas(n):
        if clave in OPERACIONALES:
            v = calcular(clave, ini, fin)
        else:
            med = m.MedicionKPI.objects.filter(clave=clave, periodo=ini).first()
            v = med.valor if med else None
        serie.append({"periodo": ini.isoformat(), "mes": MESES[ini.month - 1], "valor": v})
    valores = [s["valor"] for s in serie if s["valor"] is not None]
    actual = valores[-1] if valores else None
    previo = valores[-2] if len(valores) > 1 else None
    mejora = None
    if actual is not None and previo:
        sube = actual > previo
        mejora = sube if d["mejor"] == "alto" else not sube
    return {**d, "valor": actual, "serie": serie, "estado": semaforo(d, actual), "mejora": mejora,
            "vivo": clave in OPERACIONALES}


def todos():
    return [kpi(k) for k in DEFS]
