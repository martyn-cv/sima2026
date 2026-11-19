"""Crea un usuario por rol y datos de ejemplo de una manufacturera. Se puede ejecutar varias veces."""
import os
import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from sima import models as m

# (correo, rol, nombre, clave por defecto)
USUARIOS = [
    ("operador@manuandina.cl", "operador", "Luis Pardo · Operador", "Operador2026"),
    ("tecnico@manuandina.cl", "tecnico", "Camila Rojas · Técnica", "Tecnico2026"),
    ("ing.terreno@manuandina.cl", "ing_terreno", "Felipe Soto · Ing. de terreno", "Terreno2026"),
    ("ing.mantenimiento@manuandina.cl", "ing_mantenimiento", "Andrea Vidal · Ing. de mantenimiento", "Mantenimiento2026"),
    ("ing.mecanico@manuandina.cl", "ing_mecanico", "Diego Fuentes · Ing. mecánico", "Mecanico2026"),
    ("ing.automatizacion@manuandina.cl", "ing_automatizacion", "Valentina Ríos · Ing. de automatización", "Automatizacion2026"),
    ("administrativo@manuandina.cl", "administrativo", "Marcela Tapia · Administrativa", "Administrativo2026"),
    ("civil.industrial@manuandina.cl", "civil_industrial", "Rodrigo Mena · Ing. civil industrial", "Industrial2026"),
    ("encargado.procesos@manuandina.cl", "encargado_procesos", "Paula Araya · Encargada de procesos", "Procesos2026"),
    ("ejecutivo@manuandina.cl", "ejecutivo", "Ignacio Larraín · Gerente de operaciones", "Ejecutivo2026"),
    ("ing.transporte@manuandina.cl", "ing_transporte", "Sofía Cárdenas · Ing. de transporte", "Transporte2026"),
]


class Command(BaseCommand):
    help = "Crea los usuarios por rol y datos de demostración."

    def handle(self, *args, **opts):
        u = {}
        for email, rol, nombre, clave in USUARIOS:
            user, creado = m.Usuario.objects.get_or_create(username=email, defaults={"email": email, "rol": rol, "nombre_completo": nombre})
            if creado:
                user.set_password(os.environ.get(f"SIMA_PASSWORD_{rol.upper()}", clave))
                user.save()
            u[rol] = user
        if m.Equipo.objects.exists():
            self.stdout.write("Datos de demo ya cargados; solo se verificaron los usuarios.")
            return
        rnd = random.Random(7)
        ahora, hoy = timezone.now(), timezone.localdate()
        tec, ing_t, ing_m, ing_a, adm, ope = u["tecnico"], u["ing_terreno"], u["ing_mantenimiento"], u["ing_automatizacion"], u["administrativo"], u["operador"]

        def rep(cod, nom, tipo, bodega, stock, minimo, costo):
            return m.Repuesto.objects.create(codigo=cod, nombre=nom, tipo=tipo, bodega=bodega, stock=stock, stock_minimo=minimo, costo_unitario=costo)
        r_rod = rep("RP-0101", "Rodamiento 6208 2RS", "Rodamientos", "Bodega Central", 12, 4, 8500)
        rep("RP-0102", "Rodamiento 22210 E", "Rodamientos", "Bodega Central", 3, 4, 46000)
        r_sello = rep("RP-0201", "Kit de sellos cilindro hidráulico", "Sellos", "Bodega Central", 5, 2, 38000)
        rep("RP-0202", "Empaquetadura bomba de agua", "Sellos", "Bodega Calderas", 8, 3, 12500)
        r_res = rep("RP-0301", "Resistencia banda 220V 1200W", "Resistencias", "Bodega Eléctrica", 2, 6, 24000)
        rep("RP-0302", "Contactor 3P 25A", "Eléctrico", "Bodega Eléctrica", 9, 3, 21500)
        rep("RP-0303", "Módulo de entradas digitales 16 DI", "Automatización", "Bodega Eléctrica", 4, 2, 96000)
        r_man = rep("RP-0401", "Manguera hidráulica 3/8 in (1 m)", "Hidráulico", "Bodega Central", 7, 3, 15200)
        rep("RP-0402", "Válvula direccional 4/3", "Hidráulico", "Bodega Central", 1, 2, 189000)
        rep("RP-0502", "Filtro de agua caldera", "Filtros", "Bodega Calderas", 4, 2, 27500)

        def eq(cod, nombre, cat, ubic, marca, modelo, crit, estado="operativo"):
            return m.Equipo.objects.create(codigo=cod, nombre_habitual=nombre, categoria=cat, ubicacion=ubic, marca=marca, modelo=modelo, criticidad=crit, estado=estado)
        ex1 = eq("EXT-01", "La Grande", "Extrusora", "Línea 1, nave principal", "Davis-Standard", "DS-90", "alta")
        iny3 = eq("INY-03", "Inyectora 3 (pasillo norte)", "Inyectora", "Nave 2, pasillo norte", "Haitian", "MA2800", "alta", "en_mantencion")
        iny5 = eq("INY-05", "La Vieja", "Inyectora", "Nave 2, fondo", "Engel", "ES-200", "media")
        cal1 = eq("CAL-01", "Caldera principal", "Caldera", "Sala de calderas", "Cleaver-Brooks", "CB-200", "alta")
        com1 = eq("COM-01", "Compresor de tornillo", "Compresor", "Sala de máquinas", "Atlas Copco", "GA-75", "media")
        env1 = eq("ENV-02", "Línea de envasado 2", "Línea de envasado", "Nave 3", "Krones", "Modulfill", "media", "detenido")
        eq("CHI-01", "Chiller", "Otro", "Patio técnico", "Carrier", "30RB", "media")
        eq("MOL-02", "Molino", "Otro", "Nave 1, bodega de scrap", "Cumberland", "CU-18", "baja")

        m.PLC.objects.create(equipo=ex1, nombre="PLC Extrusora 1", marca="Siemens", modelo="S7-1500", ip="10.10.1.11", programa_version="v4.2.1", estado="en_linea", ultima_revision=hoy - timedelta(days=40))
        m.PLC.objects.create(equipo=iny3, nombre="PLC Inyectora 3", marca="Siemens", modelo="S7-1200", ip="10.10.1.13", programa_version="v2.8.0", estado="alarma", ultima_revision=hoy - timedelta(days=15), observaciones="Alarma de presión del molde.")
        m.PLC.objects.create(equipo=cal1, nombre="PLC Caldera", marca="Allen-Bradley", modelo="CompactLogix 5380", ip="10.10.2.21", programa_version="v1.9.4", estado="en_linea", ultima_revision=hoy - timedelta(days=120))
        m.PLC.objects.create(equipo=env1, nombre="PLC Envasado 2", marca="Omron", modelo="NX1P2", ip="10.10.3.31", programa_version="v3.0.2", estado="fuera_de_linea", ultima_revision=hoy - timedelta(days=200), observaciones="Sin comunicación desde el turno B.")
        m.PLC.objects.create(equipo=com1, nombre="PLC Compresor", marca="Mitsubishi", modelo="FX5U", ip="10.10.4.41", programa_version="v1.2.0", estado="en_linea", ultima_revision=hoy - timedelta(days=60))

        rf = m.Reporte.objects.create(equipo=iny3, operador=ope, detiene_linea=True, estado="tomado", tecnico=tec, descripcion="Hace ruido al cerrar el molde y pierde presión.", creado=ahora - timedelta(hours=7))
        ot1 = m.OrdenTrabajo.objects.create(equipo=iny3, titulo="Pérdida de presión y ruido al cerrar molde", prioridad="alta", estado="en_curso", asignado_a=tec, creado_por=ing_t, reporte=rf, descripcion="Revisar cilindro de cierre y mangueras.", creada=ahora - timedelta(hours=7))
        m.Bitacora.objects.create(ot=ot1, autor=tec, texto="Nivel de aceite normal. Se descartó la bomba.", horas=1.5, creado=ahora - timedelta(hours=6))
        m.Bitacora.objects.create(ot=ot1, autor=tec, es_traspaso=True, creado=ahora - timedelta(hours=6), texto="Traspaso: manguera lateral con goteo, falta cambiar sello del cilindro. Pendiente: probar presión en vacío.")
        m.RepuestoOT.objects.create(ot=ot1, repuesto=r_sello, cantidad=1, registrado_por=tec)
        m.RepuestoOT.objects.create(ot=ot1, repuesto=r_man, cantidad=1, estado="usado", registrado_por=tec, entregado_en=ahora - timedelta(hours=6))
        ot2 = m.OrdenTrabajo.objects.create(equipo=ex1, titulo="Cambio de resistencias zona 3", tipo="preventiva", asignado_a=tec, creado_por=ing_m)
        m.RepuestoOT.objects.create(ot=ot2, repuesto=r_res, cantidad=3, registrado_por=ing_m)
        ot3 = m.OrdenTrabajo.objects.create(equipo=cal1, titulo="Limpieza de filtros de agua", tipo="preventiva", prioridad="baja", estado="cerrada", asignado_a=tec, creado_por=ing_m, creada=ahora - timedelta(days=4), cerrada_en=ahora - timedelta(days=3))
        m.Bitacora.objects.create(ot=ot3, autor=tec, texto="Filtros cambiados y sistema purgado.", horas=2, creado=ahora - timedelta(days=3))
        m.RepuestoOT.objects.create(ot=ot3, repuesto=r_rod, cantidad=2, estado="usado", registrado_por=tec, entregado_en=ahora - timedelta(days=3))
        ot4 = m.OrdenTrabajo.objects.create(equipo=env1, titulo="Línea detenida: sin comunicación con PLC", prioridad="alta", estado="abierta", asignado_a=tec, creado_por=ing_t, creada=ahora - timedelta(hours=2))
        m.Reporte.objects.create(equipo=iny5, operador=ope, descripcion="Vibración fuerte en el husillo.", creado=ahora - timedelta(minutes=50))
        m.Aviso.objects.create(tipo="arreglo_menor", equipo=com1, autor=tec, texto="Cambié la correa del ventilador del compresor. Quedó funcionando.", creado=ahora - timedelta(hours=3))
        m.Aviso.objects.create(tipo="pendiente", equipo=iny3, autor=tec, texto="Falta cambiar el sello lateral; el repuesto está en pedido.", creado=ahora - timedelta(hours=1))
        m.Nota.objects.create(titulo="Revisar siempre el sello lateral", equipo=iny3, autor=tec, texto="El goteo del sello lateral se repite cada ~3 meses. Cambiar el sello completo.")
        m.Plan.objects.create(titulo="Preventivo extrusoras turno A", tipo="equipo", equipo=ex1, responsable=tec, fecha_inicio=hoy + timedelta(days=2), fecha_fin=hoy + timedelta(days=4), descripcion="Lubricación y cambio de resistencias.", creado_por=ing_m)
        m.Plan.objects.create(titulo="Optimizar ciclo de inyección INY-05", tipo="optimizacion", equipo=iny5, fecha_inicio=hoy + timedelta(days=7), fecha_fin=hoy + timedelta(days=9), descripcion="Medir tiempos de ciclo.", creado_por=ing_m)
        m.Plan.objects.create(titulo="Revisión de PLC de calderas", tipo="preventivo", equipo=cal1, responsable=ing_a, fecha_inicio=hoy - timedelta(days=1), fecha_fin=hoy + timedelta(days=1), estado="en_curso", creado_por=ing_m)
        m.Informe.objects.create(titulo="Fallas de la semana en inyectoras", compartido=True, autor=ing_m, contenido="La INY-03 concentra las detenciones. Causa: sellos del cilindro de cierre.")
        m.Notificacion.objects.create(usuario=ing_t, texto="Camila Rojas · Falta cambiar el sello lateral en INY-03", destino="avisos")
        m.Notificacion.objects.create(usuario=ing_t, texto="DETIENE LA LÍNEA · Falla en Línea de envasado 2", destino="reportes")

        # --- oficina ---
        nombres = ["Jorge Alarcón", "María Bravo", "Pedro Cáceres", "Daniela Espinoza", "Cristián Fernández", "Natalia Gómez", "Héctor Ibáñez", "Carolina Lagos", "Matías Núñez", "Francisca Olivares"]
        cargos = [("Operador de extrusión", "Producción"), ("Técnico mecánico", "Mantenimiento"), ("Analista de finanzas", "Administración"), ("Operador de inyección", "Producción"), ("Bodeguero", "Abastecimiento"), ("Conductor", "Transporte"), ("Técnico eléctrico", "Mantenimiento"), ("Asistente administrativa", "Administración"), ("Supervisor de turno", "Producción"), ("Ingeniero de procesos", "Procesos")]
        for i, (n, (cargo, area)) in enumerate(zip(nombres, cargos)):
            tipo = ["indefinido", "plazo_fijo", "indefinido", "plazo_fijo", "honorarios"][i % 5]
            fin = hoy + timedelta(days=[12, 25, 70, 150, 9, 200][i % 6]) if tipo != "indefinido" else None
            m.Contrato.objects.create(trabajador=n, rut=f"{rnd.randint(11, 24)}.{rnd.randint(100, 999)}.{rnd.randint(100, 999)}-{rnd.randint(0, 9)}", cargo=cargo, area=area, tipo=tipo, fecha_inicio=hoy - timedelta(days=rnd.randint(100, 900)), fecha_fin=fin, sueldo_bruto=rnd.randrange(650000, 2100000, 10000))
        cats_g = [("Materia prima", "Producción", 4_200_000, 9_500_000), ("Remuneraciones", "Administración", 18_000_000, 21_000_000), ("Mantención", "Mantenimiento", 900_000, 3_400_000), ("Transporte", "Logística", 1_100_000, 2_800_000), ("Energía", "Planta", 2_200_000, 3_600_000)]
        for k in range(6):
            base = hoy.replace(day=1) - timedelta(days=30 * (5 - k))
            for cat, cc, lo, hi in cats_g:
                m.Movimiento.objects.create(fecha=base.replace(day=rnd.randint(2, 27)), tipo="gasto", categoria=cat, centro_costo=cc, descripcion=f"{cat} · {base:%m/%Y}", monto=rnd.randrange(lo, hi, 50_000), creado_por=adm)
            m.Movimiento.objects.create(fecha=base.replace(day=rnd.randint(5, 25)), tipo="ingreso", categoria="Ventas", centro_costo="Comercial", descripcion=f"Ventas del mes {base:%m/%Y}", monto=rnd.randrange(38_000_000, 52_000_000, 100_000), creado_por=adm)
        m.Proceso.objects.create(nombre="Estandarizar cambio de formato en inyección", area="Producción", responsable="Paula Araya", estado="en_curso", avance=60, fecha_inicio=hoy - timedelta(days=20), fecha_fin=hoy + timedelta(days=15), descripcion="Reducir el tiempo de cambio de molde.")
        m.Proceso.objects.create(nombre="Rediseño de bodega de repuestos", area="Abastecimiento", responsable="Rodrigo Mena", estado="en_curso", avance=35, fecha_inicio=hoy - timedelta(days=10), fecha_fin=hoy + timedelta(days=40))
        m.Proceso.objects.create(nombre="Certificación ISO 9001", area="Calidad", responsable="Paula Araya", estado="bloqueado", avance=45, fecha_inicio=hoy - timedelta(days=60), fecha_fin=hoy + timedelta(days=30), descripcion="Falta cerrar la auditoría interna.")
        m.Proceso.objects.create(nombre="Plan anual de mantención preventiva", area="Mantenimiento", responsable="Andrea Vidal", estado="planificado", avance=10, fecha_inicio=hoy + timedelta(days=5), fecha_fin=hoy + timedelta(days=60))
        m.Proceso.objects.create(nombre="Migración de planillas de bodega a SIMA", area="Abastecimiento", responsable="Marcela Tapia", estado="completado", avance=100, fecha_inicio=hoy - timedelta(days=70), fecha_fin=hoy - timedelta(days=10))
        for i, (o, d, c, est, off) in enumerate([("Planta Quilicura", "Cliente Rancagua", "Pallets de envases 500 ml", "en_ruta", 0), ("Planta Quilicura", "Cliente Valparaíso", "Tuberías PVC 110 mm", "retrasado", -3), ("Bodega Central", "Cliente Temuco", "Film extruido 40 rollos", "programado", 2), ("Planta Quilicura", "Cliente Santiago Centro", "Contenedores 20 L", "entregado", -6), ("Planta Quilicura", "Cliente La Serena", "Piezas inyectadas", "en_ruta", -1), ("Bodega Central", "Puerto San Antonio", "Exportación: film", "programado", 5)]):
            m.Despacho.objects.create(codigo=f"DSP-{101 + i}", origen=o, destino=d, carga=c, vehiculo=["Camión 3/4", "Camión 10 t", "Camioneta", "Camión 10 t"][i % 4], conductor=["Juan Pérez", "Raúl Soto", "Mario Díaz"][i % 3], estado=est, fecha_salida=hoy + timedelta(days=off), fecha_llegada=hoy + timedelta(days=off + 1), costo=rnd.randrange(150_000, 650_000, 10_000))
        self.stdout.write(self.style.SUCCESS("Usuarios y datos de demo cargados."))
