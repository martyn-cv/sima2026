"""Servidor estático para la web (:3000) y la app de terreno (:3001). Solo requiere Python.

Uso:  python tools/serve.py              levanta los dos
      python tools/serve.py web 3000     levanta uno
"""
import functools
import http.server
import sys
import threading
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
MIME = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json",
        ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".ico": "image/x-icon"}


class Manejador(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, **MIME}

    def end_headers(self):
        ruta = self.path.split("?")[0]
        self.send_header("Cache-Control", "no-cache" if ruta.endswith(("/", ".html", "sw.js", ".js", ".css")) else "public, max-age=300")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def log_message(self, *a):
        pass


def servir(carpeta, puerto, nombre):
    h = functools.partial(Manejador, directory=str(RAIZ / carpeta))
    srv = http.server.ThreadingHTTPServer(("0.0.0.0", puerto), h)
    print(f"SIMA {nombre}: http://localhost:{puerto}", flush=True)
    return srv


if __name__ == "__main__":
    if len(sys.argv) >= 3:
        servir(sys.argv[1], int(sys.argv[2]), sys.argv[1]).serve_forever()
    else:
        web, app = servir("web", 3000, "web (administrativos)"), servir("app", 3001, "app (terreno)")
        threading.Thread(target=web.serve_forever, daemon=True).start()
        app.serve_forever()
