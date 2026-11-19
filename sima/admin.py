from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from . import models

admin.site.register(models.Usuario, UserAdmin)
for m in (models.Equipo, models.Repuesto, models.Reporte, models.OrdenTrabajo, models.RepuestoOT,
          models.Nota, models.Plan, models.Informe):
    admin.site.register(m)
