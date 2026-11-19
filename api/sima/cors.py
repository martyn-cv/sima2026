"""CORS mínimo: la web (:3000) y la app (:3001) llaman a la API (:8000) desde otro origen."""
import os

from django.conf import settings
from django.http import HttpResponse

DEFAULT = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"
PERMITIDOS = {o.strip() for o in os.environ.get("SIMA_CORS_ORIGINS", DEFAULT).split(",") if o.strip()}


class CorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        origen = request.headers.get("Origin", "")
        # En desarrollo se aceptan también las IP de la red local (probar desde el teléfono)
        permitido = origen in PERMITIDOS or (settings.DEBUG and origen.endswith((":3000", ":3001")))
        resp = HttpResponse(status=204) if request.method == "OPTIONS" and origen else self.get_response(request)
        if permitido:
            resp["Access-Control-Allow-Origin"] = origen
            resp["Access-Control-Allow-Headers"] = "Authorization, Content-Type, X-Requested-With"
            resp["Access-Control-Allow-Methods"] = "GET, POST, PATCH, OPTIONS"
            resp["Vary"] = "Origin"
        return resp
