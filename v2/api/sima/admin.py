from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from . import models

admin.site.register(models.Usuario, UserAdmin)
for nombre in ("Cargo", "Ficha", "Equipo", "PLC", "Herramienta", "Repuesto", "Reporte", "OrdenTrabajo", "RepuestoOT", "Aviso", "Notificacion", "Nota", "Plan", "Informe",
               "Sensor", "Alarma", "Parada", "RegistroProduccion", "PlantillaRutina", "EjecucionRutina", "TraspasoTurno", "NoConformidad", "Incidente", "AccionHSE",
               "MedicionKPI", "Contrato", "Movimiento", "Proceso", "Despacho"):
    admin.site.register(getattr(models, nombre))
