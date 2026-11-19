# Hoja de ruta hacia SIMA 2.1 (escala profesional)

La versión 2 es un prototipo funcional: sirve para mostrar, probar con usuarios y validar el diseño. Este documento lista, con honestidad, lo que falta para operar una planta real a escala profesional. Está ordenado por prioridad y parte de lo que hay hoy en el código.

## Qué significa "escala profesional completa"

Hay que fijar números antes de diseñar. Estos son los valores que el prototipo asume y los que hay que reemplazar:

| Dimensión | Hoy (prototipo) | A definir para la 2.1 |
|---|---|---|
| Plantas | Una, fija | ¿Una o varias? ¿Con datos separados por planta? |
| Usuarios simultáneos | Pruebas con pocos | El informe original pide 30 o más; ¿cuántos reales? |
| Equipos | 15 | El informe pide al menos 500 activos |
| Sensores | ~40, simulados | ¿Cuántas variables reales y con qué frecuencia? |
| Disponibilidad | Sin compromiso | ¿99,5 %? ¿24/7? |
| Hospedaje | Local o Docker | ¿Nube, servidor propio o mixto? |

## P0 · Imprescindible antes de usar con datos reales

1. **Registro de auditoría.** El informe original exige un log de toda acción relevante (quién, qué, cuándo). Hoy solo la bitácora de órdenes es inalterable; no hay auditoría general. Crear un modelo de auditoría de solo-agregar, alimentado desde la API, y una pantalla de consulta para jefaturas.
2. **Autenticación robusta.** Hoy: token firmado de 12 horas, sin revocación, sin renovación, sin bloqueo por intentos fallidos y sin segundo factor. Hacer: bloqueo y límite de intentos, revocación de sesiones, renovación de token, cierre por inactividad también en el servidor, segundo factor para perfiles de gestión y recuperación de clave.
3. **Quitar todo lo de demostración.** Las cuentas y claves de ejemplo que se muestran en las pantallas de acceso, los datos de ejemplo y las claves por defecto (`SIMA_INGESTA_KEY`, `DJANGO_SECRET_KEY`). Que el primer arranque cree un administrador y no usuarios de prueba.
4. **HTTPS y entorno de producción.** Servidor de aplicaciones (hoy `runserver` en los scripts de inicio), proxy inverso con TLS, CORS con la lista cerrada de dominios, cabeceras de seguridad y secretos fuera del código.
5. **Respaldos y recuperación.** El informe lo pide. Respaldo diario de PostgreSQL y de las fotos y manuales, con restauración probada y plazos definidos (cuánta pérdida y cuánto tiempo se tolera).
6. **Protección de datos personales.** La web maneja RUT, sueldos y contratos. Revisar con asesoría legal la ley chilena de datos personales: permisos por campo, registro de accesos y retención.
7. **Telemetría a escala.** Hoy cada lectura es una fila en una tabla común y el simulador purga a las 3 horas; con 40 sensores cada 3 s son más de 1 millón de filas por día. Pasar a una base de series de tiempo (por ejemplo TimescaleDB sobre PostgreSQL), con escritura en lotes, agregados por minuto y hora, y retención definida.

## P1 · Necesario para operar bien

8. **Puente a los equipos reales.** Hoy existe el punto de ingesta HTTP, pero no el puente. Construir un servicio que hable OPC UA y MQTT con el PLC o el gateway, con reconexión, mapeo de variables por equipo y pruebas contra un simulador de PLC. Las APIs de fabricantes (Siemens, Rockwell y otros) dependen de licencias y credenciales de la empresa.
9. **Tiempo real sin sondeo.** Hoy cada pantalla consulta cada 3 segundos. Con muchos usuarios conviene WebSockets o eventos del servidor, con un bus (Redis) para repartir lecturas y alarmas.
10. **Tareas en segundo plano.** Cálculo de indicadores, alarmas, correos, exportaciones y respaldos fuera de la petición web (cola de tareas con Celery o similar). Hoy los indicadores se calculan al abrir cada pantalla, sin caché.
11. **Observabilidad.** Registros estructurados, métricas, trazas y alertas de la propia plataforma (caídas, lentitud, colas atascadas). Hoy no hay nada de esto.
12. **Integración continua.** Ejecutar las 39 pruebas del backend y las pruebas de navegador en cada cambio, con análisis de seguridad de dependencias. Hoy se ejecutan a mano.
13. **Pruebas de carga.** Verificar con datos los objetivos del informe: 30 usuarios simultáneos, registrar una falla en menos de 3 s, historial en menos de 5 s e indicadores en menos de 10 s con 12 meses y 500 activos.
14. **Exportación de informes.** PDF y Excel generados en el servidor (hoy: CSV e imprimir desde el navegador), con plantillas de la empresa.
15. **Integración con el ERP** (compras, inventario, remuneraciones) cuando la empresa defina las interfaces y los responsables. La arquitectura ya está separada para permitirlo.

## P2 · Mejoras de producto

16. **Aplicaciones nativas** en Kotlin o Swift (o empaquetado con Capacitor) si hace falta cámara avanzada, lector de códigos QR o alertas push aunque la app esté cerrada.
17. **Sin conexión más completa.** Hoy cambiar el estado de una orden, tomar reportes y manejar repuestos requieren señal, y las fotos en cola se guardan en el almacenamiento del navegador (límite de unos 5 MB). Pasar a una base local (IndexedDB), con resolución de conflictos para cambios simultáneos.
18. **Varias plantas y roles personalizables.** Separar datos por planta y permitir que la empresa ajuste perfiles y permisos sin tocar código.
19. **Administración de usuarios desde la web** (hoy es por `/admin/`), con alta y baja ligadas a RR. HH.
20. **Accesibilidad y capacitación.** Revisión de accesibilidad, manuales de usuario y administrador, y sesiones de capacitación por perfil (el informe original las incluye en el presupuesto).
21. **Datos maestros reales.** Carga masiva y depuración del catálogo de equipos, repuestos y cargos de la empresa, con validación de duplicados.

## Deuda técnica conocida

- El frontend es JavaScript sin proceso de empaquetado ni pruebas unitarias; funciona, pero para un equipo grande conviene modularizar y tipar.
- Los umbrales de alarma, las metas de los indicadores y la periodicidad de calibración son supuestos de demostración y deben fijarse con la empresa.
- MTBF y OEE se calculan con registros diarios de producción y paradas; para cifras de gestión hace falta el registro de paradas con motivos desde el piso.

## Decisiones que se necesitan para empezar

1. ¿Cuántas plantas, usuarios y equipos reales, y con qué crecimiento previsto?
2. ¿Dónde se hospeda (nube, servidor propio) y qué disponibilidad se exige?
3. ¿Qué equipos reales y qué protocolos hay (marcas de PLC, OPC UA, MQTT, Modbus)? ¿Hay un entorno de pruebas?
4. ¿Qué sistemas de la empresa hay que integrar (ERP, nómina, correo) y quién los administra?
5. ¿Quién valida umbrales, metas y cargos, y quién aprueba la política de datos personales?
