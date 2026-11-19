# SIMA (prototipo) · Manufacturas Andina S.A.

Prototipo funcional de mantenimiento para **técnicos, ingenieros y operadores** (Django 5 + PostgreSQL).
Misma base tecnológica que la versión anterior, pero más simple: una sola app, sin dependencias extra.

## Usuarios

Solo entran correos **@manuandina.cl** y existen únicamente estos 3:

| Correo | Clave inicial | Qué ve |
|---|---|---|
| tecnico@manuandina.cl | Tecnico2026 | Avisos, órdenes con bitácora y traspaso, equipos con historial y manual, repuestos, notas, informes compartidos |
| ingeniero@manuandina.cl | Ingeniero2026 | Lo anterior + planificador, alertas de OT sin avance, indicadores e informes que comparte con técnicos |
| operador@manuandina.cl | Operador2026 | Info de equipos, avisar una falla (con foto) y estado de sus reportes |

Cambie las claves con las variables `SIMA_PASSWORD_*` (`.env`) o desde `/admin/`.

## Cómo arrancarlo

**Windows (lo más fácil):** instale Python (marcando "Add python.exe to PATH") y haga doble clic en `iniciar.bat`. Usa SQLite.

**Docker + PostgreSQL:**
```bash
cp .env.example .env
docker compose up --build
```
Abra http://localhost:8000.

**Sin Docker:**
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```
Sin variables `POSTGRES_*` ni `DATABASE_URL` usa SQLite. Para PostgreSQL defina `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`.

**Render:** *New > Blueprint* sobre este repositorio (`render.yaml`).

## Pruebas
```bash
python manage.py test
```

## Historias de usuario del informe

1. **Identificar la máquina:** lista con nombre habitual + ubicación, foto opcional, confirmación y *Mis reportes* con el estado.
2. **Historial antes de intervenir:** ficha con las últimas 5 intervenciones (fecha, falla, acción, repuestos), botón *Manual* o "Sin manual disponible", "Sin historial registrado"; botones de ≥48 px.
3. **Repuestos:** cada repuesto de una OT muestra *suficiente/insuficiente*; se puede **reservar** (baja el stock), marcar **solicitado** o **registrar entrega** (queda ligada a la OT y al equipo). *Repuestos > Consumo por equipo* entrega repuestos, cantidades y costo en un rango de fechas.
4. **Continuidad entre turnos:** bitácora con hora y responsable que no se edita ni se borra, nota de traspaso destacada, alerta al ingeniero tras 4 h sin avance en equipos críticos.
5. **Registro sin conexión (versión simple):** al guardar un registro de bitácora (diagnóstico y horas) sin señal, queda en el navegador y se envía solo al volver la conexión. Cada registro lleva un identificador único, así que no se duplica, y conserva la hora real. Límites: la pantalla de la OT debe haberse abierto antes de perder la señal, no hay fotos sin conexión y no hay resolución de conflictos más allá de que la bitácora solo agrega registros.

## Notas
- La sesión se cierra a los 30 min sin actividad (`SESSION_TIMEOUT_MIN`). Fotos y manuales solo se descargan con sesión iniciada.
- En producción: `DJANGO_SECRET_KEY` propio, `DJANGO_HTTPS=1`, `DJANGO_ALLOWED_HOSTS` y `DJANGO_CSRF_TRUSTED_ORIGINS`.
- Es un prototipo: sin registro de auditoría general, sin exportación PDF/Excel y sin rol de bodega aparte (lo hacen técnico e ingeniero).
