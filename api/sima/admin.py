from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from . import models

admin.site.register(models.Usuario, UserAdmin)
for nombre in ("Equipo", "PLC", "Repuesto", "Reporte", "OrdenTrabajo", "RepuestoOT", "Aviso", "Notificacion", "Nota",
               "Plan", "Informe", "Contrato", "Movimiento", "Proceso", "Despacho"):
    admin.site.register(getattr(models, nombre))
