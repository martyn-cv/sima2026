from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("sima.urls")),
    path("", lambda r: JsonResponse({"sistema": "SIMA API", "estado": "ok"})),
]
