from django.urls import path

from . import api, paneles

urlpatterns = [
    path("login/", api.login),
    path("me/", api.me),
    path("dashboard/", paneles.dashboard),
    path("mi-cargo/", paneles.mi_cargo),
    path("buscar/", paneles.buscar),
    path("kpis/", paneles.kpis_lista),
    path("kpis/ingesta/", paneles.kpis_ingesta),
    path("referencia/<str:nombre>/", paneles.referencia),
    path("consumo/", api.consumo),
    path("calendario/", paneles.calendario),
    path("traspaso/borrador/", paneles.traspaso_borrador),
    path("telemetria/resumen/", paneles.telemetria_resumen),
    path("telemetria/ingesta/", paneles.telemetria_ingesta),
    path("telemetria/<int:pk>/serie/", paneles.telemetria_serie),
    path("notificaciones/leer/", api.notificaciones_leer),
    path("media/<path:ruta>", api.media),
    path("reportes/<int:pk>/tomar/", api.reporte_tomar),
    path("ordenes/<int:pk>/bitacora/", api.ot_bitacora),
    path("ordenes/<int:pk>/estado/", api.ot_estado),
    path("ordenes/<int:pk>/repuestos/", api.ot_repuestos),
    path("repuestos-ot/<int:pk>/<str:accion>/", api.repuesto_accion),
    path("herramientas/<int:pk>/<str:accion>/", api.herramienta_accion),
    path("alarmas/<int:pk>/reconocer/", api.alarma_reconocer),
    path("equipos/<int:pk>/manual/", api.equipo_manual),
    path("<str:recurso>/", api.lista),
    path("<str:recurso>/<int:pk>/", api.detalle),
]
