// Service worker de SIMA Terreno: la aplicación abre sin conexión (los datos los maneja js/api.js).
const VERSION = 'sima-app-v2';
const BASE = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'css/app.css', 'js/main.js', 'js/api.js', 'js/ui.js', 'js/kit.js', 'js/mapa.js', 'js/maquinas.js', 'icons/icon.svg', 'icons/icon-192.png',
  'fonts/barlow-condensed-latin-700-normal.woff2', 'fonts/barlow-condensed-latin-800-normal.woff2', 'fonts/barlow-latin-400-normal.woff2', 'fonts/barlow-latin-500-normal.woff2',
  'fonts/barlow-latin-600-normal.woff2', 'fonts/barlow-latin-700-normal.woff2'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;       // la API (otro origen) no pasa por aquí
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const copia = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copia)); } return r; })
    .catch(() => caches.match(e.request).then((r) => r || (e.request.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
