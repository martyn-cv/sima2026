"""Carga el catálogo de los informes, un usuario por perfil y una planta de demostración. Se puede ejecutar varias veces."""
import json
import os
import random
from datetime import timedelta
from pathlib import Path

from django.core.management.base import BaseCommand
from django.utils import timezone

from sima import kpis, planta
from sima import models as m
from sima.perfiles import CARGO_PERFIL

DATA = Path(__file__).resolve().parents[2] / "data"

# (correo, perfil, n.º de cargo del informe, nombre, turno, clave por defecto)
USUARIOS = [
    ("operador@manuandina.cl", "operador", 10, "Luis Pardo · Operador de CNC", "A", "Operador2026"),
    ("supervisor.turno@manuandina.cl", "supervisor_turno", 7, "Marcela Tapia · Supervisora de turno", "A", "Supervisor2026"),
    ("tecnico@manuandina.cl", "tecnico", 28, "Camila Rojas · Técnica electromecánica", "A", "Tecnico2026"),
    ("supervisor.mantenimiento@manuandina.cl", "supervisor_mant", 25, "Felipe Soto · Supervisor de mantenimiento", "D", "Supervmant2026"),
    ("jefe.mantenimiento@manuandina.cl", "jefe_mant", 23, "Andrea Vidal · Jefa de mantenimiento", "D", "Jefemant2026"),
    ("confiabilidad@manuandina.cl", "confiabilidad", 29, "Diego Fuentes · Técnico de lubricación y confiabilidad", "A", "Confiabilidad2026"),
    ("automatizacion@manuandina.cl", "ing_automatizacion", 18, "Valentina Ríos · Ingeniera de automatización", "D", "Automatizacion2026"),
    ("instrumentacion@manuandina.cl", "instrumentacion", 20, "Tomás Becerra · Técnico de instrumentación", "D", "Instrumentacion2026"),
    ("panol@manuandina.cl", "panol", 30, "Rosa Campos · Encargada de repuestos y pañol", "A", "Panol2026"),
    ("calidad@manuandina.cl", "calidad_terreno", 33, "Nicolás Araya · Inspector de calidad", "A", "Calidad2026"),
    ("prevencion@manuandina.cl", "prevencion", 50, "Patricia Lagos · Prevencionista de riesgos", "D", "Prevencion2026"),
    ("gerencia@manuandina.cl", "gerencia", 3, "Ignacio Larraín · Gerente de planta", "D", "Gerencia2026"),
    ("finanzas@manuandina.cl", "finanzas_adm", 4, "Mariana Pizarro · Administración de planta", "D", "Finanzas2026"),
    ("produccion@manuandina.cl", "produccion_ing", 6, "Rodrigo Mena · Jefe de producción", "D", "Produccion2026"),
    ("jefe.calidad@manuandina.cl", "calidad_gestion", 31, "Paula Araya · Jefa de calidad", "D", "Jefecalidad2026"),
    ("logistica@manuandina.cl", "logistica", 42, "Sofía Cárdenas · Coordinadora de despacho", "D", "Logistica2026"),
    ("rrhh@manuandina.cl", "rrhh", 44, "Carolina Núñez · Jefa de personas", "D", "Rrhh2026"),
    ("comercial@manuandina.cl", "comercial", 61, "Héctor Ibáñez · Ejecutivo de cuentas", "D", "Comercial2026"),
]


def cargar_catalogo():
    fichas = json.loads((DATA / "fichas.json").read_text(encoding="utf-8"))
    for f in fichas:
        m.Ficha.objects.update_or_create(nombre=f["n"], defaults=dict(categoria=f["c"], icono=f.get("i", ""), funcion=f["f"], especificaciones=f["e"], piezas=f["p"],
                                                                     herramientas=f["h"], fallas=f["x"], cal_dias=f.get("cal", 0)))
    d = json.loads((DATA / "cargos.json").read_text(encoding="utf-8"))
    for n, nombre, existe, hace, entrega, coordina, medir, conoc in d["cargos"]:
        fam = next(i for i, (a, b) in enumerate(d["rangos"]) if a <= n <= b)
        m.Cargo.objects.update_or_create(numero=n, defaults=dict(familia=fam + 1, familia_nombre=d["familias"][fam], nombre=nombre, existe=existe, hace=hace, entrega=entrega,
                                                                coordina=coordina, medir=medir, conocimientos=conoc, perfil=CARGO_PERFIL[n]))


class Command(BaseCommand):
    help = "Carga el catálogo de los informes, usuarios por perfil y datos de demostración."

    def handle(self, *args, **opts):
        cargar_catalogo()
        u = {}
        for email, perfil, ncargo, nombre, turno, clave in USUARIOS:
            user, creado = m.Usuario.objects.get_or_create(username=email, defaults=dict(email=email, rol=perfil, nombre_completo=nombre, turno=turno, cargo=m.Cargo.objects.get(numero=ncargo)))
            if creado:
                user.set_password(os.environ.get(f"SIMA_PASSWORD_{perfil.upper()}", clave))
                user.save()
            u[perfil] = user
        if m.Equipo.objects.exists():
            self.stdout.write("Datos de demostración ya cargados; solo se verificaron el catálogo y los usuarios.")
            return
        self.planta(u)
        self.stdout.write(self.style.SUCCESS("Catálogo, usuarios y planta de demostración cargados."))

    # ------------------------------------------------------------------
    def planta(self, u):
        rnd = random.Random(11)
        ahora, hoy = timezone.now(), timezone.localdate()
        F = {f.nombre: f for f in m.Ficha.objects.all()}
        ope, sup, tec, smant, jmant, conf, aut, ins, pan, cal, prev = (u[k] for k in ("operador", "supervisor_turno", "tecnico", "supervisor_mant", "jefe_mant", "confiabilidad", "ing_automatizacion", "instrumentacion", "panol", "calidad_terreno", "prevencion"))
        fin = u["finanzas_adm"]

        def eq(cod, nombre, ficha, zona, linea, ubic, marca, modelo, crit):
            e = m.Equipo.objects.create(codigo=cod, nombre_habitual=nombre, ficha=F[ficha], zona=zona, linea=linea, ubicacion=ubic, marca=marca, modelo=modelo, criticidad=crit)
            planta.crear_sensores(e)
            return e
        N1, N2, N3, SM = "Nave 1 · Mecanizado", "Nave 2 · Plásticos", "Nave 3 · Envasado", "Sala de máquinas"
        L1, L2, L3, L4, LS = "Línea 1 · Mecanizado", "Línea 2 · Conformado", "Línea 3 · Inyección", "Línea 4 · Envasado", "Servicios"
        tc1 = eq("TC-01", "Torno 1", "Torno CNC", N1, L1, "Nave 1, bahía A", "Haas", "ST-20", "alta")
        tc2 = eq("TC-02", "El torno grande", "Torno CNC", N1, L1, "Nave 1, bahía A", "Mazak", "QT-200", "media")
        cm1 = eq("CM-01", "Centro de 5 ejes", "Centro de mecanizado CNC", N1, L1, "Nave 1, bahía B", "DMG Mori", "DMU 50", "alta")
        ph1 = eq("PH-01", "Prensa de 200 t", "Prensa hidráulica", N1, L2, "Nave 1, bahía C", "Schuler", "PH-200", "media")
        sd1 = eq("SD-01", "Soldadora MIG 1", "Máquina de soldadura MIG/MAG", N1, L2, "Nave 1, bahía C", "Lincoln", "Power MIG 360", "baja")
        rb1 = eq("RB-01", "Robot de paletizado", "Robot industrial articulado", N1, L2, "Nave 1, salida", "FANUC", "M-410iC", "media")
        in1 = eq("IN-01", "Inyectora 1", "Inyectora de plástico", N2, L3, "Nave 2, pasillo norte", "Haitian", "MA1600", "media")
        in2 = eq("IN-02", "La Vieja", "Inyectora de plástico", N2, L3, "Nave 2, fondo", "Engel", "ES-200", "media")
        in3 = eq("IN-03", "Inyectora 3 (pasillo norte)", "Inyectora de plástico", N2, L3, "Nave 2, pasillo norte", "Haitian", "MA2800", "alta")
        ct1 = eq("CT-01", "Cinta de salida L3", "Cinta transportadora", N2, L3, "Nave 2, salida", "Interroll", "RollerDrive", "media")
        ev1 = eq("EV-01", "Envasadora 1", "Envasadora automática", N3, L4, "Nave 3, línea 1", "Krones", "Modulfill", "media")
        ev2 = eq("EV-02", "Envasadora 2", "Envasadora automática", N3, L4, "Nave 3, línea 2", "Krones", "Modulfill", "alta")
        ct2 = eq("CT-02", "Cinta de envasado", "Cinta transportadora", N3, L4, "Nave 3, salida", "Interroll", "RollerDrive", "media")
        cp1 = eq("CP-01", "Compresor de tornillo", "Compresor de aire industrial", SM, LS, "Sala de máquinas", "Atlas Copco", "GA 75", "alta")
        bc1 = eq("BC-01", "Bomba de enfriamiento", "Bomba centrífuga", SM, LS, "Sala de máquinas", "Grundfos", "NK 65", "media")
        todos = [tc1, tc2, cm1, ph1, sd1, rb1, in1, in2, in3, ct1, ev1, ev2, ct2, cp1, bc1]

        for e, nom, marca, mod, ip, ver, est, dias in [(tc1, "PLC Torno 1", "Siemens", "S7-1200", "10.10.1.11", "v4.2.1", "en_linea", 40), (cm1, "PLC Centro 5 ejes", "Siemens", "S7-1500", "10.10.1.12", "v4.2.1", "en_linea", 25),
                                                       (rb1, "Controlador FANUC", "FANUC", "R-30iB", "10.10.1.21", "v9.40", "en_linea", 60), (in3, "PLC Inyectora 3", "Siemens", "S7-1200", "10.10.2.13", "v2.8.0", "alarma", 15),
                                                       (ev2, "PLC Envasadora 2", "Omron", "NX1P2", "10.10.3.32", "v3.0.2", "fuera_de_linea", 200), (cp1, "PLC Compresor", "Mitsubishi", "FX5U", "10.10.4.41", "v1.2.0", "en_linea", 120)]:
            m.PLC.objects.create(equipo=e, nombre=nom, marca=marca, modelo=mod, ip=ip, programa_version=ver, estado=est, ultima_revision=hoy - timedelta(days=dias),
                                 observaciones="Alarma de presión del molde." if est == "alarma" else "Sin comunicación desde el turno B." if est == "fuera_de_linea" else "")

        def rep(cod, nom, tipo, bodega, ubic, stock, minimo, costo, crit=False, fab="", parte=""):
            return m.Repuesto.objects.create(codigo=cod, nombre=nom, tipo=tipo, bodega=bodega, ubicacion=ubic, stock=stock, stock_minimo=minimo, costo_unitario=costo, critico=crit, fabricante=fab, numero_parte=parte)
        r_rod = rep("RP-0101", "Rodamiento rígido 6208 2RS", "Rodamientos", "Bodega Central", "A-03", 14, 4, 8500, True, "SKF", "6208-2RS1")
        rep("RP-0102", "Rodamiento rígido 6305", "Rodamientos", "Bodega Central", "A-04", 3, 4, 9800, True, "SKF", "6305-2Z")
        r_sello = rep("RP-0201", "Sello mecánico para bomba", "Sellos", "Bodega Central", "B-01", 5, 2, 38000, True, "John Crane", "Tipo 21")
        r_kit = rep("RP-0202", "Kit de sellos cilindro hidráulico", "Sellos", "Bodega Central", "B-02", 4, 2, 41000, False, "Parker", "KS-90")
        r_res = rep("RP-0301", "Resistencia de banda 220 V 1200 W", "Resistencias", "Bodega Eléctrica", "E-05", 2, 6, 24000, True)
        rep("RP-0302", "Termopar tipo J", "Eléctrico", "Bodega Eléctrica", "E-02", 12, 5, 9800)
        rep("RP-0303", "Contactor 3P 25 A", "Eléctrico", "Bodega Eléctrica", "E-01", 9, 3, 21500, False, "Schneider Electric", "LC1D25")
        rep("RP-0401", "Correa trapezoidal SPZ 1250", "Transmisión", "Bodega Central", "C-02", 8, 3, 7600)
        rep("RP-0402", "Cadena y piñón de transportador", "Transmisión", "Bodega Central", "C-03", 3, 2, 54000)
        rep("RP-0501", "Elemento filtrante neumático 5 µm", "Filtros", "Bodega Central", "F-01", 10, 4, 14500, False, "Festo", "LFR-5")
        rep("RP-0502", "Insertos para torno (caja de 10)", "Herramientas de corte", "Bodega Central", "G-01", 20, 8, 48000, True, "Sandvik", "CNMG 120408")
        rep("RP-0601", "Módulo de entradas digitales 16 DI", "Automatización", "Bodega Eléctrica", "E-08", 4, 2, 96000, True, "Siemens", "6ES7521")
        rep("RP-0602", "Fuente industrial 24 V CC 10 A", "Automatización", "Bodega Eléctrica", "E-09", 3, 2, 78000, False, "Siemens", "SITOP PSU")
        rep("RP-0603", "Sensor inductivo M12", "Automatización", "Bodega Eléctrica", "E-10", 15, 6, 14500)
        rep("RP-0604", "Electroválvula 5/2 24 V CC", "Neumática", "Bodega Central", "F-04", 1, 3, 32000, False, "Festo", "VUVG")
        r_man = rep("RP-0701", "Manguera hidráulica 3/8 in (1 m)", "Hidráulico", "Bodega Central", "D-02", 7, 3, 15200)
        rep("RP-0702", "Válvula direccional 4/3", "Hidráulico", "Bodega Central", "D-04", 1, 2, 189000, True)

        # herramientas e instrumentos del catálogo, con calibración
        k = 0
        for f in F.values():
            if f.categoria != "herramienta":
                continue
            for i in range(1 if not f.cal_dias else 2):
                k += 1
                prox = (hoy + timedelta(days=rnd.choice([-20, 12, 60, 140, 260]))) if f.cal_dias else None
                m.Herramienta.objects.create(ficha=f, codigo=f"HT-{k:03d}", proxima_calibracion=prox, estado="disponible")
        for h, usr in zip(m.Herramienta.objects.filter(ficha__nombre__in=["Torquímetro", "Multímetro digital", "Pistola de engrase"])[:3], (tec, tec, conf)):
            h.estado, h.asignada_a, h.retirada_en = "prestada", usr, ahora - timedelta(hours=3)
            if h.calibracion_vencida:
                h.proxima_calibracion = hoy + timedelta(days=90)
            h.save()

        # rutinas (tomadas del informe)
        d = json.loads((DATA / "referencia.json").read_text(encoding="utf-8"))
        prev_ = d["preventivo"]
        for nombre, frec, aplica, items, perfiles in [
            ("Checklist de inicio de turno", "turno", "turno", d["checklists"]["supervisor_turno"]["items"], ["supervisor_turno"]),
            ("Inspección del equipo por turno", "turno", "equipo", prev_["turno"], ["operador", "tecnico", "confiabilidad"]),
            ("Limpieza y revisión semanal", "semanal", "equipo", prev_["semanal"], ["tecnico", "confiabilidad"]),
            ("Inspección mensual", "mensual", "equipo", prev_["mensual"], ["tecnico", "confiabilidad", "ing_automatizacion"]),
            ("Calibraciones y tableros (trimestral)", "trimestral", "equipo", prev_["trimestral"], ["instrumentacion", "ing_automatizacion"]),
            ("Controles de seguridad del turno", "turno", "turno", ["Estándares de trabajo comprensibles y vigentes", "Inducción y autorizaciones para equipos, energía eléctrica e izaje", "Procedimientos de bloqueo/aislamiento de energía",
                                                                   "Contratistas, permisos, rutas peatonales y equipos móviles controlados", "Inspecciones, incidentes y acciones registrados", "Riesgos comunicados con respuesta"], ["prevencion"])]:
            m.PlantillaRutina.objects.create(nombre=nombre, frecuencia=frec, aplica_a=aplica, items=items, perfiles=perfiles)
        pl = {p.nombre: p for p in m.PlantillaRutina.objects.all()}
        m.EjecucionRutina.objects.create(plantilla=pl["Inspección del equipo por turno"], equipo=tc1, usuario=tec, items_ok=[True] * 5, observacion="Todo normal.", creado=ahora - timedelta(hours=1))

        # histórico de paradas y producción (últimos 180 días)
        tasa = {"Torno CNC": 0.55, "Centro de mecanizado CNC": 0.4, "Prensa hidráulica": 0.9, "Inyectora de plástico": 1.6, "Cinta transportadora": 3.0, "Robot industrial articulado": 1.2,
                "Máquina de soldadura MIG/MAG": 0.5, "Envasadora automática": 70, "Compresor de aire industrial": 0, "Bomba centrífuga": 0}
        motivos = ["falla"] * 5 + ["cambio_formato", "falta_material", "calidad", "sin_operador", "planificada"]
        lote_p, lote_r = [], []
        for e in todos:
            dias_par = {}
            for dia in range(180, 0, -1):
                f = hoy - timedelta(days=dia)
                if f.weekday() >= 6 or rnd.random() > 0.13:
                    continue
                mot = rnd.choice(motivos)
                dur = rnd.randint(25, 220) if mot == "falla" else rnd.randint(15, 80)
                ini = timezone.make_aware(timezone.datetime(f.year, f.month, f.day, rnd.randint(7, 20), rnd.randint(0, 59)))
                lote_p.append(m.Parada(equipo=e, inicio=ini, fin=ini + timedelta(minutes=dur), motivo=mot, automatica=False))
                dias_par[f] = dias_par.get(f, 0) + dur
            for dia in range(180, 0, -1):
                f = hoy - timedelta(days=dia)
                if f.weekday() >= 6 or tasa[e.ficha.nombre] == 0:
                    continue
                par = min(dias_par.get(f, 0), 500)
                oper = 960 - par
                ideal = int(tasa[e.ficha.nombre] * oper)
                prod = int(ideal * rnd.uniform(0.74, 0.90))
                buenas = int(prod * rnd.uniform(0.968, 0.994))
                lote_r.append(m.RegistroProduccion(equipo=e, fecha=f, minutos_parada=par, plan=int(tasa[e.ficha.nombre] * 960 * 0.80), ideal=ideal, producidas=prod, buenas=buenas))
        m.Parada.objects.bulk_create(lote_p)
        m.RegistroProduccion.objects.bulk_create(lote_r)

        # escenario del día
        rf = m.Reporte.objects.create(equipo=in3, operador=ope, detiene_linea=True, estado="tomado", tecnico=tec, descripcion="Hace ruido al cerrar el molde y pierde presión.", creado=ahora - timedelta(hours=7))
        ot1 = m.OrdenTrabajo.objects.create(equipo=in3, titulo="Pérdida de presión y ruido al cerrar molde", prioridad="alta", estado="en_curso", asignado_a=tec, creado_por=smant, reporte=rf,
                                            descripcion="Revisar cilindro de cierre y mangueras.", creada=ahora - timedelta(hours=7), loto_por=tec, loto_en=ahora - timedelta(hours=6, minutes=40))
        m.Bitacora.objects.create(ot=ot1, autor=tec, texto="Bloqueo y etiquetado (LOTO) aplicado y energía cero verificada por Camila Rojas.", creado=ahora - timedelta(hours=6, minutes=40))
        m.Bitacora.objects.create(ot=ot1, autor=tec, texto="Nivel de aceite normal. Se descartó la bomba.", horas=1.5, creado=ahora - timedelta(hours=6))
        m.Bitacora.objects.create(ot=ot1, autor=tec, es_traspaso=True, creado=ahora - timedelta(hours=6), texto="Traspaso: manguera lateral con goteo, falta cambiar el sello del cilindro. Pendiente: probar presión en vacío.")
        m.RepuestoOT.objects.create(ot=ot1, repuesto=r_kit, cantidad=1, registrado_por=tec)
        m.RepuestoOT.objects.create(ot=ot1, repuesto=r_man, cantidad=1, estado="usado", registrado_por=tec, entregado_en=ahora - timedelta(hours=6))
        in3.estado = "en_mantencion"
        in3.save()
        m.Parada.objects.create(equipo=in3, inicio=ahora - timedelta(hours=7), motivo="falla", nota="Pérdida de presión", registrada_por=sup)
        ot2 = m.OrdenTrabajo.objects.create(equipo=ph1, titulo="Cambio de sellos del cilindro principal", tipo="preventiva", asignado_a=tec, creado_por=jmant)
        m.RepuestoOT.objects.create(ot=ot2, repuesto=r_sello, cantidad=1, registrado_por=jmant)
        ot3 = m.OrdenTrabajo.objects.create(equipo=cp1, titulo="Cambio de elemento filtrante", tipo="preventiva", prioridad="baja", estado="cerrada", asignado_a=tec, creado_por=jmant, creada=ahora - timedelta(days=4), cerrada_en=ahora - timedelta(days=3))
        m.Bitacora.objects.create(ot=ot3, autor=tec, texto="Elemento cambiado y drenaje revisado.", horas=2, creado=ahora - timedelta(days=3))
        m.RepuestoOT.objects.create(ot=ot3, repuesto=r_rod, cantidad=2, estado="usado", registrado_por=tec, entregado_en=ahora - timedelta(days=3))
        m.OrdenTrabajo.objects.create(equipo=ev2, titulo="Línea detenida: sin comunicación con el PLC", prioridad="alta", asignado_a=tec, creado_por=smant, creada=ahora - timedelta(hours=2))
        ev2.estado = "detenido"
        ev2.save()
        m.Parada.objects.create(equipo=ev2, inicio=ahora - timedelta(hours=2), motivo="falla", nota="Sin comunicación con el PLC", registrada_por=sup)
        m.Reporte.objects.create(equipo=in2, operador=ope, descripcion="Vibración fuerte en el husillo de la unidad de inyección.", creado=ahora - timedelta(minutes=50))
        m.Aviso.objects.create(tipo="arreglo_menor", equipo=cp1, autor=tec, texto="Cambié la correa del ventilador del compresor. Quedó funcionando.", creado=ahora - timedelta(hours=3))
        m.Aviso.objects.create(tipo="pendiente", equipo=in3, autor=tec, texto="Falta cambiar el sello lateral; el repuesto está en pedido.", creado=ahora - timedelta(hours=1))
        m.Nota.objects.create(titulo="Revisar siempre el sello lateral", equipo=in3, autor=tec, texto="El goteo del sello lateral se repite cada ~3 meses. Cambiar el sello completo y no solo apretar.")
        m.Plan.objects.create(titulo="Preventivo de tornos y centro de mecanizado", tipo="equipo", equipo=tc1, responsable=tec, fecha_inicio=hoy + timedelta(days=2), fecha_fin=hoy + timedelta(days=4), descripcion="Lubricación, guías y husillo.", creado_por=jmant)
        m.Plan.objects.create(titulo="Optimizar ciclo de inyección IN-02", tipo="optimizacion", equipo=in2, fecha_inicio=hoy + timedelta(days=7), fecha_fin=hoy + timedelta(days=9), descripcion="Medir tiempos de ciclo.", creado_por=jmant)
        m.Plan.objects.create(titulo="Revisión de PLC y redes de la nave 3", tipo="preventivo", equipo=ev2, responsable=aut, fecha_inicio=hoy - timedelta(days=1), fecha_fin=hoy + timedelta(days=1), estado="en_curso", creado_por=jmant)
        m.Informe.objects.create(titulo="Fallas de la semana en inyectoras", compartido=True, autor=jmant, contenido="La IN-03 concentra las detenciones. Causa principal: sellos del cilindro de cierre.")
        m.TraspasoTurno.objects.create(autor=sup, turno="B", notas="Línea 4 con una envasadora detenida; mantenimiento ya tiene la orden. Producto retenido: lote L-2611-04.", responsables="Camila Rojas (mantenimiento), Nicolás Araya (calidad)",
                                       resumen={}, creado=ahora - timedelta(hours=9))
        m.NoConformidad.objects.create(lote="L-2611-04", equipo=ev1, producto="Envase 500 ml", defecto="Sellado deficiente en 120 unidades", cantidad=120, estado="contenido", reportado_por=cal, creado=ahora - timedelta(hours=9))
        m.NoConformidad.objects.create(lote="L-2611-02", equipo=in1, producto="Tapa rosca 38 mm", defecto="Rebabas en el borde", cantidad=60, estado="en_analisis", disposicion="Revisar boquilla y molde", reportado_por=cal, creado=ahora - timedelta(days=1))
        m.NoConformidad.objects.create(lote="L-2610-19", equipo=tc2, producto="Eje de 25 mm", defecto="Diámetro fuera de tolerancia", cantidad=8, estado="liberado", disposicion="Reproceso aprobado por calidad", reportado_por=cal, creado=ahora - timedelta(days=6))
        i1 = m.Incidente.objects.create(tipo="condicion_insegura", descripcion="Resguardo suelto en la zona de la prensa de 200 t.", ubicacion="Nave 1, bahía C", equipo=ph1, reportado_por=ope, estado="en_investigacion", creado=ahora - timedelta(days=1))
        m.Incidente.objects.create(tipo="casi_accidente", descripcion="Derrame de aceite cerca del pasillo peatonal de la nave 2.", ubicacion="Nave 2", reportado_por=tec, creado=ahora - timedelta(hours=5))
        m.AccionHSE.objects.create(descripcion="Reinstalar y verificar el resguardo de la prensa", incidente=i1, responsable="Felipe Soto", vence=hoy + timedelta(days=2))
        m.AccionHSE.objects.create(descripcion="Señalizar y despejar rutas peatonales de la nave 2", responsable="Patricia Lagos", vence=hoy - timedelta(days=3))
        m.AccionHSE.objects.create(descripcion="Simulacro de evacuación del turno B", responsable="Patricia Lagos", vence=hoy - timedelta(days=20), cerrada_en=ahora - timedelta(days=22))
        m.Notificacion.objects.create(usuario=smant, texto="Camila Rojas · Falta cambiar el sello lateral en IN-03", destino="avisos", nivel="aviso")
        m.Notificacion.objects.create(usuario=smant, texto="DETIENE LA LÍNEA · Falla en Inyectora 3", destino="reportes", nivel="alarma")

        # indicadores de otras áreas (cargados desde ERP/MES; aquí, valores de demostración)
        series = {"exactitud_inventario": (97.6, 0.4), "ausentismo": (3.4, 0.5), "costo_unitario": (1480, 35)}
        for ini, _ in kpis.ventanas(6):
            for clave, (base, var) in series.items():
                m.MedicionKPI.objects.create(clave=clave, periodo=ini, valor=round(base + rnd.uniform(-var, var), 2))

        # oficina
        adm = fin
        nombres = ["Jorge Alarcón", "María Bravo", "Pedro Cáceres", "Daniela Espinoza", "Cristián Fernández", "Natalia Gómez", "Héctor Ibáñez", "Carolina Lagos", "Matías Núñez", "Francisca Olivares"]
        cargos = [("Operador de CNC", "Producción"), ("Técnico mecánico industrial", "Mantenimiento"), ("Analista de costos industriales", "Finanzas"), ("Operador de envasado", "Producción"), ("Bodeguero", "Abastecimiento"),
                  ("Operador de montacargas", "Logística"), ("Técnico eléctrico industrial", "Mantenimiento"), ("Asistente administrativa de personal", "Personas"), ("Supervisor de turno", "Producción"), ("Ingeniero de procesos", "Ingeniería")]
        for i, (n, (cargo, area)) in enumerate(zip(nombres, cargos)):
            tipo = ["indefinido", "plazo_fijo", "indefinido", "plazo_fijo", "honorarios"][i % 5]
            fin_c = hoy + timedelta(days=[12, 25, 70, 150, 9, 200][i % 6]) if tipo != "indefinido" else None
            m.Contrato.objects.create(trabajador=n, rut=f"{rnd.randint(11, 24)}.{rnd.randint(100, 999)}.{rnd.randint(100, 999)}-{rnd.randint(0, 9)}", cargo=cargo, area=area, tipo=tipo,
                                      fecha_inicio=hoy - timedelta(days=rnd.randint(100, 900)), fecha_fin=fin_c, sueldo_bruto=rnd.randrange(650000, 2100000, 10000))
        gastos = [("Materia prima", "Producción", 4_200_000, 9_500_000), ("Remuneraciones", "Administración", 18_000_000, 21_000_000), ("Mantención", "Mantenimiento", 900_000, 3_400_000),
                  ("Transporte", "Logística", 1_100_000, 2_800_000), ("Energía", "Planta", 2_200_000, 3_600_000)]
        for k_ in range(6):
            base = hoy.replace(day=1) - timedelta(days=30 * (5 - k_))
            for cat, cc, lo, hi in gastos:
                m.Movimiento.objects.create(fecha=base.replace(day=rnd.randint(2, 27)), tipo="gasto", categoria=cat, centro_costo=cc, descripcion=f"{cat} · {base:%m/%Y}", monto=rnd.randrange(lo, hi, 50_000), creado_por=adm)
            m.Movimiento.objects.create(fecha=base.replace(day=rnd.randint(5, 25)), tipo="ingreso", categoria="Ventas", centro_costo="Comercial", descripcion=f"Ventas del mes {base:%m/%Y}", monto=rnd.randrange(38_000_000, 52_000_000, 100_000), creado_por=adm)
        for nom, area, resp, est, av, i0, f0 in [("Estandarizar el cambio de formato en inyección", "Producción", "Rodrigo Mena", "en_curso", 60, -20, 15), ("Rediseño de la bodega de repuestos", "Abastecimiento", "Rosa Campos", "en_curso", 35, -10, 40),
                                                 ("Certificación ISO 9001", "Calidad", "Paula Araya", "bloqueado", 45, -60, 30), ("Plan anual de mantención preventiva", "Mantenimiento", "Andrea Vidal", "planificado", 10, 5, 60),
                                                 ("Migración de planillas de bodega a SIMA", "Abastecimiento", "Mariana Pizarro", "completado", 100, -70, -10)]:
            m.Proceso.objects.create(nombre=nom, area=area, responsable=resp, estado=est, avance=av, fecha_inicio=hoy + timedelta(days=i0), fecha_fin=hoy + timedelta(days=f0))
        for i, (o, de, c, est, off, ok, tarde) in enumerate([("Planta Quilicura", "Cliente Rancagua", "Pallets de envases 500 ml", "en_ruta", 0, True, 0), ("Planta Quilicura", "Cliente Valparaíso", "Piezas mecanizadas", "retrasado", -3, True, -1),
                                                             ("Bodega Central", "Cliente Temuco", "Tapas y cierres, 40 cajas", "programado", 2, True, 0), ("Planta Quilicura", "Cliente Santiago Centro", "Contenedores 20 L", "entregado", -6, True, 0),
                                                             ("Planta Quilicura", "Cliente La Serena", "Piezas inyectadas", "entregado", -9, False, 0), ("Bodega Central", "Puerto San Antonio", "Exportación: piezas de acero", "programado", 5, True, 0),
                                                             ("Planta Quilicura", "Cliente Concepción", "Envases 1 L", "entregado", -14, True, 0), ("Planta Quilicura", "Cliente Antofagasta", "Piezas mecanizadas", "entregado", -20, True, 1)]):
            sal = hoy + timedelta(days=off)
            m.Despacho.objects.create(codigo=f"DSP-{101 + i}", origen=o, destino=de, carga=c, vehiculo=["Camión 3/4", "Camión 10 t", "Camioneta", "Camión 10 t"][i % 4], conductor=["Juan Pérez", "Raúl Soto", "Mario Díaz"][i % 3],
                                      estado=est, fecha_salida=sal, fecha_llegada=sal + timedelta(days=1 + max(tarde, 0)), fecha_compromiso=sal + timedelta(days=2), completo=ok, costo=rnd.randrange(150_000, 650_000, 10_000))

        for k_ in range(1, 6):          # despachos de los meses anteriores (para el OTIF)
            for j in range(4):
                sal = hoy - timedelta(days=30 * k_ + j * 7 + 3)
                tarde = 1 if rnd.random() < 0.12 else 0
                m.Despacho.objects.create(codigo=f"DSP-{200 + k_ * 10 + j}", origen="Planta Quilicura", destino=rnd.choice(["Cliente Rancagua", "Cliente Temuco", "Cliente Valparaíso", "Cliente Concepción"]),
                                          carga="Pedido regular", vehiculo="Camión 10 t", conductor="Raúl Soto", estado="entregado", fecha_salida=sal, fecha_llegada=sal + timedelta(days=1 + tarde),
                                          fecha_compromiso=sal + timedelta(days=2 if not tarde else 1), completo=rnd.random() > 0.05, costo=rnd.randrange(150_000, 650_000, 10_000))
            for j in range(3):
                v = hoy - timedelta(days=30 * k_ + 4 + j * 8)
                ok = rnd.random() < 0.88
                m.AccionHSE.objects.create(descripcion=f"Acción preventiva {k_}-{j + 1}", responsable="Patricia Lagos", vence=v, cerrada_en=(timezone.now() - timedelta(days=30 * k_ + 6 + j * 8)) if ok else None)

        # telemetría: historial reciente para que los gráficos nazcan con datos
        for i in range(24, 0, -1):
            planta.tick(random.Random(i), ahora - timedelta(seconds=3 * i), prob_falla=0)
        s = m.Sensor.objects.filter(equipo=cp1, variable="temp_descarga").first()
        if s:
            s.deriva = 0.45          # esta falla se desarrolla sola cuando corre el simulador
            s.save(update_fields=["deriva"])
