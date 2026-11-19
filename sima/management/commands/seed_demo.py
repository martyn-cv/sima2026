"""Crea los 3 usuarios autorizados y datos de ejemplo. Se puede ejecutar varias veces."""
import os
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from sima.models import (Bitacora, Equipo, Informe, Nota, OrdenTrabajo, Plan, Repuesto, RepuestoOT, Reporte, Usuario)

USUARIOS = [
    ("tecnico@manuandina.cl", "tecnico", "SIMA_PASSWORD_TECNICO", "Tecnico2026"),
    ("ingeniero@manuandina.cl", "ingeniero", "SIMA_PASSWORD_INGENIERO", "Ingeniero2026"),
    ("operador@manuandina.cl", "operador", "SIMA_PASSWORD_OPERADOR", "Operador2026"),
]


class Command(BaseCommand):
    def handle(self, *args, **opts):
        u = {}
        for email, rol, var, clave in USUARIOS:
            user, creado = Usuario.objects.get_or_create(username=email, defaults={"email": email, "rol": rol})
            if creado:
                user.set_password(os.environ.get(var, clave))
                user.save()
            u[rol] = user
        tec, ing, ope = u["tecnico"], u["ingeniero"], u["operador"]
        if Equipo.objects.exists():
            self.stdout.write("Datos de demo ya cargados; solo se verificaron los usuarios.")
            return

        def rep(cod, nom, tipo, bodega, stock, minimo, costo):
            return Repuesto.objects.create(codigo=cod, nombre=nom, tipo=tipo, bodega=bodega, stock=stock,
                                           stock_minimo=minimo, costo_unitario=costo)
        r_rod = rep("RP-0101", "Rodamiento 6208 2RS", "Rodamientos", "Bodega Central", 12, 4, 8500)
        rep("RP-0102", "Rodamiento 22210 E", "Rodamientos", "Bodega Central", 3, 4, 46000)
        r_sello = rep("RP-0201", "Kit de sellos cilindro hidráulico", "Sellos", "Bodega Central", 5, 2, 38000)
        rep("RP-0202", "Empaquetadura bomba de agua", "Sellos", "Bodega Calderas", 8, 3, 12500)
        r_res = rep("RP-0301", "Resistencia banda 220V 1200W", "Resistencias", "Bodega Eléctrica", 2, 6, 24000)
        rep("RP-0302", "Contactor 3P 25A", "Eléctrico", "Bodega Eléctrica", 9, 3, 21500)
        r_man = rep("RP-0401", "Manguera hidráulica 3/8 in (1 m)", "Hidráulico", "Bodega Central", 7, 3, 15200)
        rep("RP-0402", "Válvula direccional 4/3", "Hidráulico", "Bodega Central", 1, 2, 189000)
        rep("RP-0502", "Filtro de agua caldera", "Filtros", "Bodega Calderas", 4, 2, 27500)

        def eq(cod, nombre, cat, ubic, marca, modelo, crit, estado="operativo"):
            return Equipo.objects.create(codigo=cod, nombre_habitual=nombre, categoria=cat, ubicacion=ubic,
                                         marca=marca, modelo=modelo, criticidad=crit, estado=estado)
        ex1 = eq("EXT-01", "La Grande", "Extrusora", "Línea 1, nave principal", "Davis-Standard", "DS-90", "alta")
        iny3 = eq("INY-03", "Inyectora 3 (pasillo norte)", "Inyectora", "Nave 2, pasillo norte", "Haitian", "MA2800", "alta", "en_mantencion")
        iny5 = eq("INY-05", "La Vieja", "Inyectora", "Nave 2, fondo", "Engel", "ES-200", "media")
        cal1 = eq("CAL-01", "Caldera principal", "Caldera", "Sala de calderas", "Cleaver-Brooks", "CB-200", "alta")
        eq("CHI-01", "Chiller", "Otro", "Patio técnico", "Carrier", "30RB", "media")
        eq("MOL-02", "Molino", "Otro", "Nave 1, bodega de scrap", "Cumberland", "CU-18", "baja")

        ahora = timezone.now()
        rf = Reporte.objects.create(equipo=iny3, operador=ope, detiene_linea=True, estado="tomado", tecnico=tec,
                                    descripcion="Hace ruido al cerrar el molde y pierde presión.")
        ot1 = OrdenTrabajo.objects.create(equipo=iny3, titulo="Pérdida de presión y ruido al cerrar molde", prioridad="alta",
                                          estado="en_curso", asignado_a=tec, creado_por=ing, reporte=rf,
                                          descripcion="Revisar cilindro de cierre y mangueras.", creada=ahora - timedelta(hours=7))
        Bitacora.objects.create(ot=ot1, autor=tec, texto="Nivel de aceite normal. Se descartó la bomba.", horas=1.5, creado=ahora - timedelta(hours=6))
        Bitacora.objects.create(ot=ot1, autor=tec, es_traspaso=True, creado=ahora - timedelta(hours=6),
                                texto="Traspaso: manguera lateral con goteo, falta cambiar sello del cilindro. Pendiente: probar presión en vacío.")
        RepuestoOT.objects.create(ot=ot1, repuesto=r_sello, cantidad=1, estado="requerido", registrado_por=tec)
        RepuestoOT.objects.create(ot=ot1, repuesto=r_man, cantidad=1, estado="usado", registrado_por=tec, entregado_en=ahora - timedelta(hours=6))
        ot2 = OrdenTrabajo.objects.create(equipo=ex1, titulo="Cambio de resistencias zona 3", tipo="preventiva",
                                          asignado_a=tec, creado_por=ing)
        RepuestoOT.objects.create(ot=ot2, repuesto=r_res, cantidad=3, estado="requerido", registrado_por=ing)
        ot3 = OrdenTrabajo.objects.create(equipo=cal1, titulo="Limpieza de filtros de agua", tipo="preventiva", prioridad="baja",
                                          estado="cerrada", asignado_a=tec, creado_por=ing, creada=ahora - timedelta(days=4),
                                          cerrada_en=ahora - timedelta(days=3))
        Bitacora.objects.create(ot=ot3, autor=tec, texto="Filtros cambiados y sistema purgado.", horas=2, creado=ahora - timedelta(days=3))
        RepuestoOT.objects.create(ot=ot3, repuesto=r_rod, cantidad=2, estado="usado", registrado_por=tec, entregado_en=ahora - timedelta(days=3))
        Reporte.objects.create(equipo=iny5, operador=ope, descripcion="Vibración fuerte en el husillo.")

        Nota.objects.create(titulo="Revisar siempre el sello lateral", equipo=iny3, autor=tec,
                            texto="El goteo del sello lateral se repite cada ~3 meses. Cambiar el sello completo.")
        Plan.objects.create(titulo="Preventivo extrusoras turno A", tipo="equipo", equipo=ex1, responsable=tec,
                            fecha_inicio=ahora.date() + timedelta(days=2), fecha_fin=ahora.date() + timedelta(days=4),
                            descripcion="Lubricación y cambio de resistencias.", creado_por=ing)
        Informe.objects.create(titulo="Fallas de la semana en inyectoras", compartido=True, autor=ing,
                               contenido="La INY-03 concentra las detenciones. Causa: sellos del cilindro de cierre.")
        self.stdout.write(self.style.SUCCESS("Usuarios y datos de demo cargados."))
