# SIMA v2 · planta viva (prototipo)

Segunda versión del Sistema de Información Manufacturero Andino. Parte de lo que ya funcionaba en la versión 1 y suma el contenido de los dos informes (catálogo técnico de manufactura y roles de una planta), telemetría en vivo, más funciones de seguridad y una interfaz con movimiento.

| Sistema | Quién lo usa | Dónde |
|---|---|---|
| **Web** (`web/`) | Gerencia, finanzas y administración, producción y procesos, calidad, logística, personas, comercial | http://localhost:3000 |
| **App de terreno** (`app/`) | Operadores, supervisores, técnicos, mantenimiento, automatización, instrumentación, pañol, calidad en planta, prevención | http://localhost:3001 (teléfono, PC y escritorio) |
| **App de escritorio** (`desktop/`) | Lo mismo que la app de terreno, en ventana propia | `cd desktop && npm install && npm start` |
| API (`api/`) | Django + PostgreSQL | http://localhost:8000 |
| Simulador (`manage.py simular_planta`) | Genera lecturas de sensores, alarmas y paradas | Se inicia con los scripts |

## Cómo arrancarlo

- **Windows:** instale Python (marcando *Add python.exe to PATH*) y haga doble clic en `iniciar.bat`. Abre tres ventanas negras (API, simulador, web y app).
- **Linux o macOS:** `./iniciar.sh`
- **Docker con PostgreSQL:** `cp .env.example .env && docker compose up --build`
- **Manual:** ver `api/` (`migrate`, `seed_demo`, `runserver`, `simular_planta`) y `python tools/serve.py` para la web y la app.

Sin variables `POSTGRES_*` usa SQLite (solo para pruebas rápidas). Para el teléfono, abra `http://IP-DEL-COMPUTADOR:3001` y elija *Instalar aplicación*.

## Qué hay de nuevo

**Contenido de los informes**
- **Catálogo técnico:** las 45 fichas (10 máquinas, 12 equipos de automatización, 9 piezas mecánicas, 14 herramientas e instrumentos) con función, especificaciones, piezas, herramientas de mantenimiento y fallas frecuentes. Cada equipo de la planta se enlaza con su ficha: al avisar una falla se sugieren las fallas frecuentes de esa máquina.
- **64 cargos en 10 familias**, con para qué existe, qué hace, qué entrega, con quién se coordina, cómo se mide y qué debe saber. El cargo decide el perfil de acceso de la persona. Cada usuario ve su cargo en **Mi cargo**, con sus indicadores y su rutina del día; la web trae el directorio completo, la estructura, la matriz de responsabilidades (RACI), la rutina y dotación por turnos y los flujos de trabajo.
- **Los 10 indicadores del informe** (cumplimiento del plan, OEE, defectos, MTTR, MTBF, OTIF, exactitud de inventario, ausentismo, costo unitario, cierre de acciones). Siete se calculan con datos de la base; tres se leen de mediciones que un ERP o MES puede cargar.
- **Seguridad:** iniciar una orden exige confirmar el **bloqueo y etiquetado (LOTO)** en los 5 pasos del informe y cerrarla exige retirarlo. Cualquier persona puede reportar una condición insegura o un incidente; prevención gestiona incidentes y acciones.
- **Rutinas preventivas** por turno, semana, mes y trimestre, tomadas del informe, con lista de verificación (funcionan sin conexión).
- **Herramientas:** retirar, devolver y controlar calibraciones; una herramienta con calibración vencida no se puede retirar.
- **Traspaso de turno** armado con el estado real de la planta (órdenes, equipos fuera de servicio, alarmas, stock crítico, producto contenido, incidentes) y las 6 revisiones del informe.
- **Diagnóstico guiado** con los 5 pasos del informe, la causa probable (fallas frecuentes de la ficha), piezas y herramientas; queda en la bitácora.

**Planta en vivo**
- **Mapa de planta:** cada máquina es una ilustración animada que solo se mueve si el equipo opera, con su estado y la lectura más cercana a alarma, actualizada cada 3 segundos.
- **Monitor:** medidores con zonas de aviso y alarma, tendencia de los últimos minutos y alarmas que se reconocen.
- **Alarmas automáticas:** al superar el umbral se abre una alarma, el equipo pasa a "con alarma", se registra una parada y se notifica al supervisor, a los técnicos y a automatización. Al cerrar la orden, el equipo vuelve a operar.
- **OEE y disponibilidad** calculados con producción y paradas reales de la base.

**Interfaz:** transiciones entre pantallas, indicador deslizante del menú, números que cuentan, gráficos que se dibujan, esqueletos de carga, medidores con aguja y animaciones de máquinas. Respeta `prefers-reduced-motion`.

## Usuarios de demostración

Solo entran correos `@manuandina.cl`; cada perfil ingresa **solo por su canal**.

| Correo (`@manuandina.cl`) | Clave | Cargo del informe | Canal |
|---|---|---|---|
| operador | Operador2026 | 10 · Operador de CNC | App |
| supervisor.turno | Supervisor2026 | 7 · Supervisor de turno | App |
| tecnico | Tecnico2026 | 28 · Técnico electromecánico | App |
| supervisor.mantenimiento | Supervmant2026 | 25 · Supervisor de mantenimiento | App |
| jefe.mantenimiento | Jefemant2026 | 23 · Jefe de mantenimiento | App |
| confiabilidad | Confiabilidad2026 | 29 · Lubricación y confiabilidad | App |
| automatizacion | Automatizacion2026 | 18 · Ingeniero de automatización | App |
| instrumentacion | Instrumentacion2026 | 20 · Instrumentación y calibración | App |
| panol | Panol2026 | 30 · Repuestos y pañol | App |
| calidad | Calidad2026 | 33 · Inspector de calidad | App |
| prevencion | Prevencion2026 | 50 · Prevención de riesgos | App |
| gerencia | Gerencia2026 | 3 · Gerente de planta | Web |
| finanzas | Finanzas2026 | 4 · Administración de planta | Web |
| produccion | Produccion2026 | 6 · Jefe de producción | Web |
| jefe.calidad | Jefecalidad2026 | 31 · Jefe de calidad | Web |
| logistica | Logistica2026 | 42 · Coordinación de despacho | Web |
| rrhh | Rrhh2026 | 44 · Jefe de personas | Web |
| comercial | Comercial2026 | 61 · Ejecutivo de cuentas | Web |

Los 64 cargos están asignados a uno de estos 18 perfiles. Para crear otro usuario, elija su cargo en `/admin/`: el perfil se asigna solo. Las interfaces se componen con módulos y paneles distintos por perfil; no hay 64 pantallas distintas.

## Conectar equipos reales

El simulador usa el mismo camino que los datos reales. Un gateway (OPC UA, MQTT, Modbus, Node-RED, Ignition…) publica lecturas en la API:

```bash
curl -X POST http://localhost:8000/api/telemetria/ingesta/ \
  -H "X-API-Key: $SIMA_INGESTA_KEY" -H "Content-Type: application/json" \
  -d '{"lecturas":[{"equipo":"CP-01","variable":"temp_descarga","valor":96.4}]}'
```

Los indicadores de otras áreas (inventario, ausentismo, costo) se cargan con `POST /api/kpis/ingesta/` desde un ERP o MES. Para usar equipos reales, apague el simulador y cargue los sensores de cada equipo en `/admin/`.

Las **APIs de fabricantes** (Siemens, Rockwell y otros) requieren licencias y credenciales de la empresa, y no se pudieron integrar ni probar aquí. Lo realista es conectar por estándares abiertos (OPC UA y MQTT) hacia este punto de ingesta. **No se incluye un puente OPC UA ni MQTT**: está pendiente.

## Qué es real y qué es de demostración

- **Del informe, tal cual:** las 45 fichas, los 64 cargos, la matriz RACI, la rutina diaria, los flujos, las rutinas preventivas, los pasos de bloqueo y el marco legal chileno.
- **Supuestos míos:** los umbrales de aviso y alarma de cada sensor (se derivaron de los rangos orientativos del informe), la periodicidad de calibración de cada instrumento, las metas de los indicadores y la planta ficticia con sus datos de producción, paradas, contratos y finanzas. Hay que ajustarlos con la empresa.
- **Simulado:** las lecturas de sensores y las fallas que se desarrollan. Si nadie atiende una falla, la planta se recupera sola a los 6 minutos para que la demostración siga viva (`SIMA_AUTORECUPERA_MIN`).
- **Aproximaciones:** MTBF y OEE se calculan con los registros diarios de producción y paradas; son preliminares.

## Sin conexión (app de terreno)

Reportes con foto, avisos, bitácora, rutinas, traspasos y reportes de seguridad se guardan en el equipo y se envían solos al volver la señal, sin duplicarse y con su hora real. La app abre sin señal y las pantallas ya vistas se consultan desde la caché. Necesitan señal: cambiar el estado de una orden (bloqueo y cierre), tomar un reporte, manejar repuestos y herramientas, reconocer alarmas y la búsqueda.

## Pruebas

```bash
cd api && python manage.py test      # 39 pruebas; con PostgreSQL definiendo POSTGRES_*
```

Cubren el catálogo completo, el acceso por canal, permisos por perfil, las historias del informe, el bloqueo y etiquetado, herramientas, rutinas sin duplicados, alarmas y paradas automáticas, la ingesta externa, los 10 indicadores y el buscador.

## Pendiente

Puente OPC UA/MQTT, aplicaciones nativas (Kotlin/Swift), auditoría general de cambios, exportación a PDF/Excel desde el servidor, instaladores de la app de escritorio (`npm run empaquetar`, sin probar), roles de bodega y compras con su propia interfaz, y administración de usuarios desde la web.
