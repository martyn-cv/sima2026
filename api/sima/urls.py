from django.urls import path

from . import api

urlpatterns = [
    path("login/", api.login),
    path("me/", api.me),
    path("dashboard/", api.dashboard),
    path("buscar/", api.buscar),
    path("indicadores/", api.indicadores),
    path("consumo/", api.consumo),
    path("calendario/", api.calendario),
    path("notificaciones/leer/", api.notificaciones_leer),
    path("media/<path:ruta>", api.media),
    path("reportes/<int:pk>/tomar/", api.reporte_tomar),
    path("ordenes/<int:pk>/bitacora/", api.ot_bitacora),
    path("ordenes/<int:pk>/estado/", api.ot_estado),
    path("ordenes/<int:pk>/repuestos/", api.ot_repuestos),
    path("repuestos-ot/<int:pk>/<str:accion>/", api.repuesto_accion),
    path("equipos/<int:pk>/manual/", api.equipo_manual),
    path("<str:recurso>/", api.lista),
    path("<str:recurso>/<int:pk>/", api.detalle),
]
