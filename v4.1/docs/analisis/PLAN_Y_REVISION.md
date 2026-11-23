# Entregables 8, 9 y 10 · Revisión del código, plan de implementación y resultado

## 9 · Revisión del código existente (SIMA 4.1, antes de esta iteración)

### Hallazgos verificados en el código

| # | Hallazgo | Dónde | Riesgo | Fase |
|---|---|---|---|---|
| H1 | Las consultas de planta y OT no exigen permiso: cualquier cuenta activa (RR. HH., finanzas, comercial) lee equipos, estructura, eventos, alarmas y órdenes de trabajo, y puede **reconocer alarmas**. | `EndpointsPlanta.cs` (`GET /equipos`, `/alarmas`, `/ordenes`, `POST /alarmas/{id}/reconocer`), `EndpointsV41.cs` (`/estructura`, `/eventos`, `/equipos/{codigo}`, `/ordenes/{id}`) | Acceso indiscriminado; una alarma reconocida por quien no la atiende | 1 |
| H2 | Cerrar una OT deja el equipo en `operando` automáticamente: el cierre administrativo cambia el estado del equipo sin verificación. | `EndpointsPlanta.cs`, `POST /ordenes/{id}/cerrar` | Equipo devuelto a producción sin verificación ni liberación | 1 |
| H3 | Tomar una OT ignora la asignación: cualquier técnico toma una OT asignada a otro y la reasigna a sí mismo. | `EndpointsPlanta.cs`, `POST /ordenes/{id}/tomar` | El programa del planificador no se respeta | 1 |
| H4 | Reglas por perfil demasiado amplias: `repuestos.ver`, `herramientas.ver` y `ordenes.ver` se dan a los 18 perfiles (incluidos RR. HH., finanzas, TI y comercial). La comparación cargo a cargo da 212 accesos que el trabajo del cargo no justifica. | `Permisos.cs` (reglas `Perfiles: Todos`) y [MATRIZ_PERMISOS.md](MATRIZ_PERMISOS.md) | Mínimo privilegio no se cumple | 1 |
| H5 | Las habilitaciones no se exigen: iniciar una OT con bloqueo no verifica que el técnico tenga la habilitación LOTO vigente. | `POST /ordenes/{id}/tomar` | Trabajo con energía peligrosa sin competencia vigente | 1 (LOTO) · 2 (resto) |
| H6 | La web muestra Planta en vivo, Estructura, Mantenimiento, Eventos, Inventario, Cargos y Organigrama a todos los perfiles web, incluso a RR. HH. y finanzas. | `web/components/Shell.tsx` (ítems sin `recurso`), inicio con `planta: true` | Interfaz con herramientas que no corresponden | 1 |
| H7 | El técnico retira repuestos directamente; no hay solicitud ni entrega por el pañol. | `POST /repuestos/{id}/movimiento` | El pañol no controla la entrega | 2 |
| H8 | Las OT automáticas y los indicadores no dicen si nacieron de datos simulados. | `Sincronizacion.cs` (`OrdenAutomaticaAsync`), `Operacion.cs` (indicadores) | Confundir simulación con planta física | 1 (OT) · 2 (indicadores) |
| H9 | SIMA Desktop muestra el mismo menú y el mismo inicio a todos los cargos. | `terreno/src/App.tsx` (lista `NAV` fija) | Lo que motivó el pedido | 1 |
| H10 | Cargos que comparten perfil heredan lo mismo: el líder de línea (8) recibe asistencia, habilitaciones e indicadores del equipo como un supervisor de turno. | `Permisos.cs` (reglas por perfil `supervisor_turno`) | Mínimo privilegio | 1 |
| H11 | La asistencia solo existe como resumen mensual: el supervisor no puede registrar quién está en el turno ni asignar puestos. | `asistencias` | Habilitación no verificable al asignar | 2 |
| H12 | En la app de terreno, el directorio entregaba turno, correo y jefatura de cualquier persona; la hoja Permisos permite solo nombre y cargo. | `EndpointsPersonas.cs`, `GET /directorio` | Datos de contacto de terceros | 1 |

### Cobertura por módulo

| Módulo | Estado | Qué hay | Qué falta |
|---|---|---|---|
| Personas, contratos, desvinculaciones, cuentas | ✅ | Ficha completa, reglas de cuenta del Excel, cierre de sesión en vivo, 2FA | Vacantes, expedientes, solicitudes |
| Remuneraciones y parámetros | ✅ | Cálculo, cierre con cuatro ojos, validación de parámetros | — |
| Asistencia y habilitaciones | 🟡 | Mensual; habilitaciones con vencimiento | Diaria por turno, exigencias por cargo |
| Planta, PLC, eventos | ✅ | Jerarquía planta→área→línea→equipo, PLC, E/S, eventos idempotentes, simulado/real | Permisos de lectura (H1) |
| Mantenimiento (OT) | 🟡 | Flujo guiado con LOTO, intervenciones, planificación (fecha, técnico, especialidad) | Verificación y liberación (H2), asignación respetada (H3), solicitudes de repuesto (H7) |
| Repuestos y herramientas | 🟡 | Stock, mínimos, egreso con OT, calibración por fecha | Solicitudes, reservas, resultado de calibración |
| Producción | 🟡 | Órdenes y registros por turno | Programa por línea, pedidos, materiales, detenciones por el operador |
| Calidad | 🟡 | NC, análisis, liberación por la jefatura | Lotes como entidad, inspecciones, acciones correctivas, reclamos |
| SST | 🟡 | Incidentes con investigación y cierre | Riesgos, inspecciones, emergencias, ambiente |
| Despachos | 🟡 | Estados y OTIF | Vínculo a pedido y lote |
| Pedidos, compras, inventario de materiales, proveedores, costos, presupuesto, proyectos, tickets, servicios | ⛔ | — | Todo (fases 3 a 5) |

## 8 · Plan de implementación

El orden sigue dependencias (no se puede asignar un puesto sin asistencia diaria; no se puede despachar un lote que no
existe como entidad), criticidad (seguridad y control primero) y valor operativo (lo que usan más personas).

| Fase | Contenido | Por qué en este orden | Cargos beneficiados |
|---|---|---|---|
| **1 · Control y experiencia por cargo** (esta iteración) | Matriz v7 por id_cargo y permisos de lectura en planta y OT (H1, H4, H10) · verificación y liberación de OT separadas del estado del equipo (H2) · asignación respetada (H3) · LOTO vigente para iniciar (H5) · OT automática marcada como simulada (H8) · notificaciones dirigidas · web por capacidades (H6) · SIMA Desktop con inicio, menú y pantallas por cargo y «Mi jornada» (H9) | Corrige riesgos de seguridad y acceso; sin esto, cualquier módulo nuevo hereda los mismos problemas | Los 64 (permisos); los 32 cargos de canal app (Desktop) |
| **2 · Piso de planta completo** | Solicitudes de repuesto y reservas (H7) · asistencia diaria y asignación de puestos con habilitación (H11) · exigencias de habilitación por cargo · checklist preuso por equipo · detenciones registradas por el operador · calibraciones con resultado · indicadores con origen (H8) | Completa el Flujo A y la jornada de los cargos de terreno | 7–15, 20, 23–30, 35, 47 |
| **3 · Flujo de la demanda** | Clientes y pedidos · productos y BOM · materiales, existencias y ubicaciones · compras, recepciones y proveedores · programa de producción por línea | Depende de la fase 1 (permisos) y alimenta la fase 4 | 36–43, 61–64, 6 |
| **4 · Calidad y SST ampliadas** | Lotes como entidad · inspecciones y ensayos · acciones correctivas · reclamos · matriz de riesgos · inspecciones SST · emergencias y simulacros · registros ambientales | Necesita lotes y pedidos (fase 3) | 31–35, 50–54 |
| **5 · Gestión y apoyo** | Presupuesto y costos · proyectos y mejora continua · selección, capacitación y casos laborales (cifrados) · mesa de ayuda TI · servicios y contratistas | Usa datos de todas las fases anteriores | 1–5, 16–17, 21, 44–49, 55–60 |

## 10 · Implementación y pruebas de la fase 1

| Hallazgo | Qué se hizo | Cómo se verificó |
|---|---|---|
| H4, H10 | La matriz de fábrica **v7** se compila del catálogo (`generar.py` → `PermisosCatalogo.g.cs`). Cada capacidad sale de la ficha del cargo; el perfil ya no reparte permisos. Nueva capacidad `ordenes.asignar` y recurso `planta` (`planta.ver`, `planta.registrar`). | Prueba `LaMatrizDeFabricaSeDefinePorCargoYNoPorPerfil` (líder de línea ≠ supervisor de turno; soporte TI sin pagos; RR. HH. sin planta) |
| H1 | `planta.ver` en equipos, estructura, eventos, alarmas, resumen y ficha; `ordenes.ver` en OT (con alcance *propio* para quien opera); `repuestos.ver` y `herramientas.ver`; reconocer alarmas exige `planta.registrar`; el hub solo envía la planta en vivo a quien puede verla. Datos de personas filtrados por alcance (propio, equipo). | `LasConsultasDePlantaYOtExigenSuPermiso`, `ReconocerAlarmasEsDeQuienLasAtiende`, `ElOperadorVeSoloSusAvisosDeFalla` |
| H2 | El técnico **termina** (OT `por_verificar`, equipo sigue en mantención). Otra persona con `ordenes.aprobar` **verifica** o **devuelve** con motivo; al aprobar, el equipo queda `detenido` (liberado) y se envía el reinicio al PLC. La **marcha** la da operación (`POST /api/equipos/{codigo}/reanudar`): por el PLC si está conectado; un PLC físico desconectado no se marca como operando. Si hay otra OT abierta en el mismo equipo, verificar no lo libera. | `ElCierreTecnicoNoPoneLaMaquinaEnMarchaYLaVerificaOtraPersona`, `VerificarUnaOtNoLiberaElEquipoSiOtraIntervencionSigueAbierta`; recorrido en el navegador con 5 personas (ver abajo) |
| H3 | Una OT asignada solo la toma su técnico (o quien puede reasignar). | `UnaOtAsignadaLaTomaSuTecnicoYConLotoVigente` |
| H5 | Iniciar una OT exige la habilitación LOTO vigente (la cuenta de confiabilidad, con LOTO vencida en el Excel, queda bloqueada). | misma prueba |
| H6 | La web oculta Planta, Estructura, Eventos, Mantenimiento e Inventario a quien no tiene esos permisos, y no los consulta. | Navegador: RR. HH., gerencia de planta y soporte TI sin respuestas 403 |
| H8 (OT) | Las OT automáticas que nacen de un PLC simulado quedan marcadas `simulada` y se muestran con su distintivo. | `UnaOtAutomaticaNacidaDeUnPlcSimuladoQuedaMarcadaComoSimulada` |
| H9 | SIMA Desktop arma el menú y el inicio desde el cargo (`roles.ts` + capacidades del servidor): 11 inicios por perfil, ajustes por cargo, pantallas nuevas (Producción, Mi equipo de turno, Plan de mantenimiento, Seguridad, Inspección de calidad, Instrumentos, Condición, PLC y automatización), «Mi jornada» y «Cómo se mide mi trabajo» desde el catálogo; los cargos cuyo módulo aún no existe ven qué viene, sin cifras inventadas. | Navegador: 16 cargos distintos, cada uno con su menú e inicio, sin errores de consola |
| H12 (nuevo) | En la app de terreno el directorio entrega solo nombre y cargo de los demás; turno, correo y jefatura solo de uno mismo y de su equipo (hoja Permisos). | `EnLaAppElDirectorioMuestraSoloNombreYCargoDeLosDemas` |
| — | Notificaciones dirigidas por persona y cargo: OT asignada → técnico; cierre por verificar → supervisión; equipo liberado → producción. | Recorrido en el navegador (avisos recibidos) |

**Pruebas automáticas:** 48 de 48 pasan (39 anteriores, ajustadas al flujo nuevo donde correspondía, y 9 nuevas).

**Recorrido del flujo A en el navegador** (SIMA Desktop, cinco cuentas): el operador reporta una vibración en TC-02 → el
planificador la asigna y programa en *Plan de mantenimiento* → el técnico la ve en *Asignadas a usted*, bloquea con LOTO,
diagnostica, registra y pide verificación (OT `por_verificar`, equipo `en_mantencion`) → la supervisión de mantenimiento
la ve en *Cierres por verificar* y la aprueba (OT `cerrada`, equipo `detenido`) → el supervisor de turno pulsa *Poner en
marcha* en el explorador (equipo `operando`).

**Pendiente para la fase 2** (no se implementó en esta iteración): solicitudes de repuesto (H7), asistencia diaria y
asignación de puestos (H11), alcance *propio* del operador sobre equipos (requiere la asignación operador-equipo),
indicadores con origen simulado o real (H8).
