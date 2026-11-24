# SIMA · Perfeccionamiento funcional, técnico y visual (iteración 4.1.2)

Manufacturas Andina es una empresa ficticia. Los trabajadores, contratos, máquinas, fallas y planta de este repositorio
son datos de demostración; la planta virtual nunca se conecta a PLC reales (el servidor rechaza cualquier acción de
simulación sobre un PLC con origen «real»).

## 1. Qué se hizo, por etapa

### Etapa 1 · Planta virtual con fallas persistentes (`api/Sima.Api/Servicios/Simulacion.cs`, `plc-sim/src/control`)
- 16 tipos de falla con causa oculta, síntomas, criticidad, especialidad, variables afectadas, impacto y modo
  (inmediata, programada, intermitente, progresiva). La falla vive en el servidor: sobrevive reinicios del simulador,
  de Desktop y de la API.
- La falla altera las lecturas de los sensores y fuerza el estado del equipo; crea alarma y orden correctiva (o agrega
  síntomas a la abierta) y avisa a mantenimiento y producción. El técnico ve síntomas, no la causa.
- Diagnóstico con inspección de componentes (cada inspección queda en la orden). La reparación se evalúa contra la causa
  real: componente, tipo de acción y repuesto. Si no corresponde, la falla sigue, las pruebas «conforme» se registran
  como no conformes y la liberación queda bloqueada. Cerrar la orden administrativamente no repara la máquina.
- Error de lógica Ladder: altera un contacto del programa del PLC simulado; se corrige solo con una versión aprobada.
- Panel «Control de simulación» (clave del simulador, nunca con sesión de trabajador): provocar, programar, modificar
  variables, ver tiempos de respuesta y evaluaciones, guardar y ejecutar escenarios, cancelar y reiniciar la planta.

### Etapa 2 · Planificación, asignación y comunicación (`Endpoints/EndpointsCalendario.cs`, `terreno/src/pantallas`)
- Calendario común de actividades con revisión de cruces, turno, habilitaciones y estado de la cuenta; sugerencias de
  horario; quien no corresponde ve «ocupado».
- Calendario de mantenimiento (semana, día por técnico, mes, carga), arrastrar para asignar, mover y estirar para
  reprogramar, filtros y leyenda.
- Asignación completa con disponibilidad en vivo y confirmación consciente de los cruces.
- Panel «Tarea asignada» con confirmación de recepción y bitácora jefe–técnico persistente con avisos.
- Seguimiento del departamento con acciones en la fila.

### Etapa 3 · Pañol y prevención (`Endpoints/EndpointsPanol.cs`, `Endpoints/EndpointsPrevencion.cs`)
- Pañol: físico vs disponible, estados de herramienta, solicitud → revisión → reserva con vigencia → entrega →
  uso/devolución, compatibilidad con el equipo, sin doble retiro, retiros e intervenciones que respetan lo reservado,
  bitácora por ítem de solo agregar (un disparador de PostgreSQL impide editarla o borrarla) y entrega de turno.
- Prevención: charlas, capacitaciones, inducciones y simulacros sobre el calendario común; los cruces no se agendan en
  silencio (se confirma y se avisa a la persona y a quien programó lo que se cruza); agenda personal y respuesta del
  convocado; la asistencia se registra aparte y **no certifica**; certificar exige asistencia (y resultado si hay
  evaluación) y recién ahí otorga o renueva la habilitación.

### Etapa 4 · Contratos, correcciones visuales y revisión
- Web · Contratos rediseñado (indicadores que filtran, tabla completa, ficha lateral, exportación, sueldos solo a
  quien corresponde).
- Regla revisada: un contrato vencido **suspende** la cuenta, no la cierra, y no se trata como desvinculación; se agregó
  un período de gracia opcional (`contratos.dias_gracia`, por defecto 0, sin cambiar el comportamiento actual).
- Desktop: barra lateral de ancho ajustable con nombres completos como ayuda emergente; correcciones de desborde.
- Revisión automática de 160 pantallas (11 cargos a 1366×768 y 4 a 1920×1080): sin errores de consola, sin llamadas
  fallidas a la API, sin botones sin nombre y sin desplazamiento horizontal de página; los dos desbordes detectados se
  corrigieron.

## 2. Escenarios de aceptación

Solo se marca «aprobado» lo que se ejecutó y pasó. Las pruebas automáticas están en `api/Sima.Api.Tests`; los
recorridos de navegador se hicieron con Playwright contra la API, SIMA Desktop, el simulador y la Web en ejecución.

| Escenario | Cómo se verificó | Resultado |
|---|---|---|
| A · Falla mecánica | Prueba `EscenarioA_…` y recorrido de navegador simulador → Desktop (CT-02 y EV-01) | Aprobado |
| B · Automatización / Ladder | Prueba `EscenarioB_…` (alteración del programa, versión aprobada, falla resuelta) | Aprobado en API; el editor Ladder no se recorrió en el navegador |
| C · Planificación | Prueba `EscenarioC_…` y recorrido: arrastrar a calendario, cruce con sugerencia, asignar, reprogramar arrastrando, recepción, bitácora, seguimiento | Aprobado |
| D · Charla preventiva | Prueba `EscenarioD_…` y recorrido: convocar con cruce, confirmar, avisos, respuestas en Mi agenda | Aprobado |
| E · Repuestos | Pruebas `EscenarioE_…` (2) y recorrido: solicitud, reserva, entrega, segunda entrega rechazada, devolución, bitácora, entrega de turno | Aprobado |
| F · Contratos | Prueba `EscenarioF_…` y recorrido Web: vencido → regularizar → renovar; gerencia sin columna de sueldos; exportación | Aprobado |
| G · Persistencia | Falla FS-0005 en SD-01 provocada, API reiniciada: falla activa, equipo en falla, OT abierta y solicitudes del pañol intactas | Aprobado (manual) |
| H · Restricciones de acceso | Prueba `EscenarioH_…` + pruebas previas (TI no libera máquinas; control de simulación sin clave → 401) | Aprobado |
| I · Revisión visual | Revisión automática de 160 pantallas y capturas a 1366×768 y 1920×1080 | Aprobado con observaciones (ver §3) |

Totales: 62 de 62 pruebas de la API; `terreno`, `plc-sim` y `web` compilan sin errores de tipos.

## 3. Limitaciones conocidas

- El escalado de Windows (125 %, 150 %) no se probó en un equipo Windows real; se revisaron 1366×768 y 1920×1080 en
  Chromium. Los campos de fecha y hora siguen el idioma del sistema operativo.
- El editor Ladder y la estación de automatización existentes se mantuvieron; no se agregaron maquetas a escala nuevas.
- Las interfaces por cargo se ajustaron en los cargos de mantenimiento, pañol y prevención; el resto mantiene su inicio
  por cargo de la iteración anterior (sección 7 del pedido: pendiente de profundizar cargo por cargo).
- La revisión de elementos interactivos fue automática (nombre accesible, errores, llamadas fallidas, desbordes); no
  reemplaza una prueba de uso con personas.
- La reprogramación arrastrando en la vista «día por técnico» mueve en el tiempo, no cambia de técnico (eso se hace en
  el cajón de asignación).

## 4. Decisiones que quedan para la empresa

- **Período de gracia de contratos vencidos:** hoy está en 0 días (la cuenta se suspende al día siguiente del
  vencimiento). Si se quiere evitar bloquear a quien sigue trabajando mientras RRHH regulariza, se define el número de
  días en el parámetro `contratos.dias_gracia`. Es una decisión de seguridad y de personas, por eso no se cambió.
- **Turnos de planta** (A, B, N y diurno) siguen siendo un supuesto documentado en `docs/DISENO.md`.

## 5. Pendiente

- Profundizar las estaciones de trabajo de cada uno de los 64 cargos (sección 7 y 13 del pedido).
- Maquetas a escala animadas para la estación de automatización y prueba aislada de lógica con historial de versiones
  comparado lado a lado.
- Vista de calendario para producción y para RRHH (hoy usan Mi agenda).
- Columnas redimensionables y virtualización en tablas muy largas.
