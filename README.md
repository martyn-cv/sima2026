> **Nueva versión:** en [`v2/`](v2/README.md) está SIMA v2 (planta en vivo, catálogo técnico y 64 cargos de los informes).

# SIMA · Sistema de Información Manufacturero Andino (prototipo)

Prototipo funcional para Manufacturas Andina S.A. con **tres sistemas** que comparten una misma API y una misma base de datos:

| Sistema | Quién lo usa | Dónde |
|---|---|---|
| **Web** (`web/`) | Administrativos, ingenieros civiles industriales, encargados de procesos, ejecutivos, ingenieros de transporte | http://localhost:3000 |
| **App de terreno** (`app/`) | Operadores, técnicos, ingenieros de terreno, de mantenimiento, mecánicos y de automatización | http://localhost:3001 (teléfono, PC y escritorio) |
| **App de escritorio** (`desktop/`) | Lo mismo que la app de terreno, en una ventana propia para Windows, macOS o Linux | `cd desktop && npm install && npm start` |
| API (`api/`) | Respaldo de los tres anteriores (Django + PostgreSQL) | http://localhost:8000 |

Frontend en HTML, CSS y JavaScript. Base de datos PostgreSQL (SQLite solo para pruebas rápidas sin Docker).

## Cómo arrancarlo

**Windows, lo más fácil:** instale Python (python.org, marcando *Add python.exe to PATH*) y haga doble clic en `iniciar.bat`. Abre la web y la app. Usa SQLite.

**Linux o macOS:** `./iniciar.sh`

**Docker con PostgreSQL:**
```bash
cp .env.example .env     # cambie las claves
docker compose up --build
```
Web http://localhost:3000 · App http://localhost:3001 · API http://localhost:8000

**Manual:**
```bash
cd api
python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
export POSTGRES_DB=sima POSTGRES_USER=sima POSTGRES_PASSWORD=sima_pass POSTGRES_HOST=localhost   # sin esto usa SQLite
python manage.py migrate && python manage.py seed_demo && python manage.py runserver 8000
# en otra terminal, desde la raíz del repositorio:
python tools/serve.py
```

**En el teléfono (misma red Wi-Fi):** abra `http://IP-DEL-COMPUTADOR:3001`, y en el navegador elija *Instalar aplicación* o *Agregar a pantalla de inicio*. Con la API en modo desarrollo (`DJANGO_DEBUG=1`) acepta orígenes de la red local; en producción defina `SIMA_CORS_ORIGINS`.

## Usuarios de demostración

Solo entran correos `@manuandina.cl`. Cada perfil ingresa **solo por su canal**: un técnico no puede entrar a la web ni un administrativo a la app.

| Correo | Clave | Canal | Interfaz |
|---|---|---|---|
| operador@ | Operador2026 | App | Informa fallas con foto, ve el estado de sus reportes |
| tecnico@ | Tecnico2026 | App | Toma fallas, órdenes con bitácora y traspaso, repuestos, **avisa a los ingenieros** (arreglé algo pequeño / falta algo) |
| ing.terreno@ | Terreno2026 | App | Recibe los avisos de técnicos, alertas de órdenes sin avance, fallas por atender |
| ing.mantenimiento@ | Mantenimiento2026 | App | Indicadores (disponibilidad, MTTR, MTBF), planificación, órdenes |
| ing.mecanico@ | Mecanico2026 | App | Máquinas, correctivas, repuestos mecánicos |
| ing.automatizacion@ | Automatizacion2026 | App | **PLC**: estado, versión del programa, revisiones, alarmas |
| administrativo@ | Administrativo2026 | Web | Finanzas, contratos, procesos, transporte |
| civil.industrial@ | Industrial2026 | Web | Procesos, planificación, costos de mantención |
| encargado.procesos@ | Procesos2026 | Web | Seguimiento y avance de procesos |
| ejecutivo@ | Ejecutivo2026 | Web | Resultado del mes, disponibilidad, procesos, despachos (solo lectura) |
| ing.transporte@ | Transporte2026 | Web | Despachos, rutas y costos |

Cada perfil ve un menú, un panel y acciones distintas: el panel lo arma la API según el rol (`/api/dashboard/`) y los permisos también se validan en el servidor, no solo en pantalla.

## Qué incluye cada sistema

**Web:** barra lateral plegable, buscador global (atajo `/`), panel con indicadores, finanzas (ingresos y gastos por categoría y centro de costo), contratos (vencimientos, masa salarial), procesos por estado y avance, transporte, calendario de planificación, mantención en solo lectura e informes. Las tablas se ordenan y filtran, se exportan a CSV y se imprimen o guardan como PDF.

**App de terreno:** barra inferior roja en el teléfono que pasa a barra lateral en pantallas anchas; botones de al menos 48 px para usar con guantes; notificaciones; buscador global; modo sin conexión (ver abajo).

**Historias de usuario del informe:**
1. *Identificar la máquina:* lista por nombre habitual y ubicación, foto opcional, confirmación y estado del reporte.
2. *Historial antes de intervenir:* ficha con las últimas 5 intervenciones (fecha, falla, acción, repuestos), manual o "Sin manual disponible", "Sin historial registrado".
3. *Repuestos:* cada repuesto de una orden indica suficiente/insuficiente; se puede reservar (baja el stock), marcar solicitado o registrar la entrega (queda ligada a la orden y al equipo). El consumo por equipo y rango de fechas está en la web (Mantención) y en la API.
4. *Continuidad entre turnos:* bitácora con hora y responsable que no se edita ni se borra, nota de traspaso destacada y alerta al ingeniero de terreno tras 4 h sin avance en equipos críticos.
5. *Registro sin conexión:* ver abajo.

### Modo sin conexión (app de terreno)
- La aplicación se instala y **abre sin señal** (service worker).
- Reportes de falla (con foto comprimida), avisos a ingenieros y registros de bitácora (diagnóstico y horas) se **guardan en el equipo** y se envían solos al volver la señal. Cada registro lleva un identificador único: si la respuesta se pierde, no se duplica, y conserva la hora real en que se hizo.
- Las pantallas que ya se abrieron con señal (fichas de equipos, órdenes, listas) se pueden **consultar sin conexión**, con el aviso de que son datos guardados.
- Si el servidor rechaza un registro (por ejemplo, la orden ya se cerró), la persona lo ve en *Mi perfil*.
- Límites: no hay fusión de cambios simultáneos sobre una misma orden (la bitácora solo agrega registros, así que no se pisan); el cambio de estado de una orden, tomar un reporte y manejar repuestos necesitan señal; al cerrar sesión se borra la caché de datos.

## Pruebas
```bash
cd api && python manage.py test      # 29 pruebas; con PostgreSQL definiendo las variables POSTGRES_*
```
Cubren el acceso por canal y dominio, permisos por rol, las historias del informe, avisos y notificaciones, paneles por rol, buscador y registros sin conexión sin duplicar.

## Estructura
```
api/       Django: modelos, API JSON (sima/api.py), datos de demo (seed_demo), pruebas
web/       Web para oficina (HTML, CSS, JS sin dependencias)
app/       App de terreno instalable (PWA): manifest, service worker, cola sin conexión
desktop/   Electron: abre la app de terreno en una ventana de escritorio
tools/     serve.py: servidor estático de web y app
```

## Pendiente (no incluido en este prototipo)
- Registro de auditoría general de cambios y exportación a PDF/Excel generada en el servidor (hoy: CSV e imprimir desde el navegador).
- Registro y clasificación de paradas para calcular OEE; MTBF y disponibilidad son aproximaciones.
- Rol de bodega aparte (hoy lo hacen técnico e ingeniero) y administración de usuarios desde la web (hoy desde `/admin/`).
- Aplicaciones nativas (Kotlin/Swift): la app de terreno instalable cubre teléfono y PC; una app nativa o un empaquetado con Capacitor pueden usar la misma API.
- Instaladores de la app de escritorio (`npm run empaquetar` usa electron-builder; no se probó en este prototipo).
- En producción: HTTPS, `DJANGO_SECRET_KEY` propio, `SIMA_CORS_ORIGINS` con los dominios reales, respaldos periódicos de PostgreSQL y cambiar las claves de demostración.
