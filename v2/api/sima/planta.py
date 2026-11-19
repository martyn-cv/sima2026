"""Telemetría de planta: sensores, alarmas, paradas automáticas, simulador y punto de ingesta.

El simulador y los datos reales usan el mismo camino (`registrar_lectura`). Para conectar equipos reales,
un gateway (OPC UA, MQTT, Modbus, Node-RED, Ignition…) envía lecturas a POST /api/telemetria/ingesta/.
"""
import os
import random
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from . import models as m

AUTORECUPERA_MIN = float(os.environ.get("SIMA_AUTORECUPERA_MIN", "6"))
MAX_RECIENTE = 24

# variable, nombre, unidad, escala_min, escala_max, nominal, umbral de aviso, umbral de alarma
# (rangos tomados de las especificaciones orientativas del informe técnico de manufactura)
SENSORES = {
    "Torno CNC": [("vibracion", "Vibración del husillo", "mm/s", 0, 10, 2.0, 4.5, 7.0), ("temp_husillo", "Temperatura del husillo", "°C", 20, 100, 45, 70, 85), ("corriente", "Corriente del motor", "A", 0, 80, 32, 55, 68)],
    "Centro de mecanizado CNC": [("vibracion", "Vibración del husillo", "mm/s", 0, 10, 1.8, 4.5, 7.0), ("temp_husillo", "Temperatura del husillo", "°C", 20, 100, 48, 72, 88), ("corriente", "Corriente del motor", "A", 0, 80, 36, 58, 70)],
    "Prensa hidráulica": [("presion", "Presión del circuito", "bar", 0, 300, 180, 240, 270), ("temp_aceite", "Temperatura del aceite", "°C", 20, 90, 45, 60, 72)],
    "Inyectora de plástico": [("temp_cilindro", "Temperatura del cilindro", "°C", 100, 350, 230, 280, 310), ("presion", "Presión de inyección", "bar", 0, 250, 140, 200, 230)],
    "Cinta transportadora": [("vibracion", "Vibración del reductor", "mm/s", 0, 10, 1.8, 4.5, 7.0), ("corriente", "Corriente del motor", "A", 0, 20, 6.5, 11, 14), ("temp_motor", "Temperatura del motor", "°C", 20, 120, 55, 85, 100)],
    "Robot industrial articulado": [("temp_servo", "Temperatura de servomotor", "°C", 20, 100, 50, 70, 85), ("corriente", "Corriente de ejes", "A", 0, 40, 14, 28, 35)],
    "Máquina de soldadura MIG/MAG": [("corriente", "Corriente de soldadura", "A", 0, 500, 220, 400, 450), ("temp_antorcha", "Temperatura de la antorcha", "°C", 20, 200, 80, 140, 170)],
    "Envasadora automática": [("temp_sellado", "Temperatura de sellado", "°C", 80, 220, 160, 190, 205), ("presion", "Presión de aire", "bar", 0, 10, 6, 8.5, 9.5)],
    "Compresor de aire industrial": [("presion", "Presión de descarga", "bar", 0, 12, 8, 10, 11), ("temp_descarga", "Temperatura de descarga", "°C", 40, 130, 85, 100, 110), ("vibracion", "Vibración", "mm/s", 0, 10, 2.2, 4.5, 7.0)],
    "Bomba centrífuga": [("vibracion", "Vibración", "mm/s", 0, 12, 2.5, 4.5, 7.1), ("temp_rodamiento", "Temperatura del rodamiento", "°C", 20, 110, 55, 80, 95)],
}


def crear_sensores(equipo):
    for v, nombre, unidad, emin, emax, nominal, aviso, alarma in SENSORES.get(equipo.ficha.nombre, []):
        m.Sensor.objects.get_or_create(equipo=equipo, variable=v, defaults=dict(
            nombre=nombre, unidad=unidad, escala_min=emin, escala_max=emax, nominal=nominal, aviso=aviso, alarma=alarma))


def notificar(perfiles, texto, destino="", nivel="info"):
    m.Notificacion.objects.bulk_create([m.Notificacion(usuario=u, texto=texto[:200], destino=destino, nivel=nivel)
                                        for u in m.Usuario.objects.filter(rol__in=perfiles, is_active=True)])


def _evaluar(sensor, ahora):
    """Abre, sube o cierra la alarma del sensor y refleja el estado en el equipo."""
    eq, nivel = sensor.equipo, sensor.nivel
    abierta = m.Alarma.objects.filter(sensor=sensor, fin__isnull=True).first()
    if nivel in ("aviso", "alarma"):
        txt = f"{sensor.nombre}: {sensor.ultimo:.1f} {sensor.unidad} en {eq.nombre_habitual}"
        if abierta is None:
            m.Alarma.objects.create(equipo=eq, sensor=sensor, nivel=nivel, mensaje=txt, inicio=ahora)
            if nivel == "alarma":
                notificar(("supervisor_turno", "tecnico", "supervisor_mant", "ing_automatizacion"), f"ALARMA · {txt}", "monitor", "alarma")
        elif abierta.nivel == "aviso" and nivel == "alarma":
            abierta.nivel, abierta.mensaje = "alarma", txt
            abierta.save()
            notificar(("supervisor_turno", "tecnico", "supervisor_mant", "ing_automatizacion"), f"ALARMA · {txt}", "monitor", "alarma")
        if nivel == "alarma" and eq.estado == "operando":
            eq.estado = "alarma"
            eq.save(update_fields=["estado"])
            if not eq.paradas.filter(fin__isnull=True).exists():
                m.Parada.objects.create(equipo=eq, inicio=ahora, motivo="falla", automatica=True, nota=f"Alarma: {sensor.nombre}")
    elif abierta is not None:
        abierta.fin = ahora
        abierta.save()


def registrar_lectura(sensor, valor, ts=None, guardar=True):
    ts = ts or timezone.now()
    sensor.ultimo, sensor.ultimo_en = float(valor), ts
    sensor.reciente = (sensor.reciente + [round(float(valor), 2)])[-MAX_RECIENTE:]
    sensor.save(update_fields=["ultimo", "ultimo_en", "reciente", "deriva"])
    if guardar:
        m.Lectura.objects.create(sensor=sensor, valor=float(valor), ts=ts)
    _evaluar(sensor, ts)


@transaction.atomic
def normalizar_equipo(equipo, ot=None, ahora=None):
    """El equipo vuelve a operar: cierra alarmas y paradas abiertas y detiene la falla simulada."""
    ahora = ahora or timezone.now()
    m.Sensor.objects.filter(equipo=equipo).update(deriva=0)
    m.Alarma.objects.filter(equipo=equipo, fin__isnull=True).update(fin=ahora)
    for p in equipo.paradas.filter(fin__isnull=True, motivo="falla"):
        p.fin = ahora
        p.save()
    if equipo.estado in ("alarma", "detenido", "en_mantencion"):
        equipo.estado = "operando"
        equipo.save(update_fields=["estado"])


def tick(rng=random, ahora=None, prob_falla=0.01, guardar=True):
    """Avanza la simulación un paso: lecturas con ruido, fallas que se desarrollan y recuperación automática."""
    ahora = ahora or timezone.now()
    sensores = list(m.Sensor.objects.select_related("equipo", "equipo__ficha"))
    operando = [s for s in sensores if s.equipo.estado == "operando" and s.deriva == 0]
    if operando and rng.random() < prob_falla:
        s = rng.choice(operando)
        s.deriva = 0.02
        s.save(update_fields=["deriva"])
    for s in sensores:
        eq, rango = s.equipo, s.escala_max - s.escala_min
        if eq.estado in ("en_mantencion", "detenido"):
            objetivo = s.escala_min + 0.08 * rango            # equipo detenido: valores de reposo
        else:
            objetivo = s.nominal + s.deriva * (s.alarma * 1.06 - s.nominal)
            if s.deriva > 0 and eq.estado != "alarma":
                s.deriva = min(1.0, s.deriva + 0.06)
        base = s.ultimo if s.ultimo is not None else s.nominal
        valor = base + (objetivo - base) * 0.4 + rng.gauss(0, rango * 0.01)
        registrar_lectura(s, max(s.escala_min, min(s.escala_max, valor)), ahora, guardar)
    # si nadie atiende la falla, la planta se recupera sola (para que la demostración siga viva)
    limite = ahora - timedelta(minutes=AUTORECUPERA_MIN)
    for eq in m.Equipo.objects.filter(estado="alarma"):
        if not m.Alarma.objects.filter(equipo=eq, nivel="alarma", inicio__gt=limite).exists():
            normalizar_equipo(eq, ahora=ahora)


def purgar(horas=3):
    m.Lectura.objects.filter(ts__lt=timezone.now() - timedelta(hours=horas)).delete()


def ingestar(items):
    """Recibe lecturas externas: [{equipo: 'TC-01', variable: 'vibracion', valor: 3.2, ts: ISO opcional}]."""
    from django.utils.dateparse import parse_datetime
    ok, desconocidos = 0, []
    for it in items:
        s = m.Sensor.objects.select_related("equipo").filter(equipo__codigo=it.get("equipo"), variable=it.get("variable")).first()
        try:
            valor = float(it.get("valor"))
        except (TypeError, ValueError):
            desconocidos.append(it)
            continue
        if s is None:
            desconocidos.append(it)
            continue
        ts = parse_datetime(str(it.get("ts") or ""))
        ts = min(ts, timezone.now()) if ts and timezone.is_aware(ts) else timezone.now()
        registrar_lectura(s, valor, ts)
        ok += 1
    return ok, desconocidos
