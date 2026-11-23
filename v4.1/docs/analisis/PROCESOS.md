# Entregable 5 · Procesos interdepartamentales

Cada flujo indica quién actúa (número de cargo), el estado de los registros, quién aprueba y qué se notifica. La columna
**SIMA 4.1** dice si la etapa existe hoy: ✅ implementada · 🟡 parcial · ⛔ no existe. Las reglas marcadas **[regla]** se
validan en el servidor, no en la pantalla.

## Flujo A · Falla de equipo → equipo de vuelta en operación

Dos estados se manejan por separado y nunca se mezclan:

- **Estado físico del equipo** (`operando`, `detenido`, `alarma`): lo informa el PLC o la telemetría. El cierre de un papel
  no puede cambiarlo.
- **Estado de mantenimiento del equipo** (`en_mantencion`, `por_liberar`): lo fija mantenimiento. Mientras existe, el
  equipo no se puede considerar disponible aunque el PLC diga que está detenido sin falla.

| # | Etapa | Quién | Estado de la OT | Estado del equipo | Aprobación o control | Notifica a | SIMA 4.1 |
|---|---|---|---|---|---|---|---|
| 1 | Detecta la anomalía | Operador 9–15, sala de control 13 o la alarma del PLC | — | físico según PLC | — | — | ✅ |
| 2 | Registra el aviso | El mismo, en SIMA Desktop | `abierta` (aviso) | sin cambio | **[regla]** solo con `ordenes.crear` | Supervisor de turno del área, mantenimiento | ✅ (aviso a todo el canal; falta dirigirlo) |
| 3 | Confirma y prioriza | Supervisor de turno 7 o líder 8 | `abierta`, prioridad confirmada | sin cambio | Puede subir o bajar prioridad | Planificador 24, jefatura 23 | 🟡 la prioridad la fija quien reporta |
| 4 | Planifica | Planificador 24 o jefatura 23 | `abierta` con fecha, especialidad y técnico | sin cambio | **[regla]** solo `ordenes.crear` + perfil de planificación; concurrencia por versión | Técnico asignado | ✅ (nuevo: `POST /api/ordenes/{id}/planificar`) |
| 5 | Recibe la tarea | Técnico 26–28 (o 20, 18) | — | — | **[regla]** si la OT tiene técnico asignado, solo él (o quien tenga `ordenes.aprobar`) la puede tomar | — | ⛔ hoy cualquiera la toma (H3) |
| 6 | Consulta manuales e historial | Técnico | — | — | — | — | ✅ ficha del equipo |
| 7 | Inicia con LOTO | Técnico | `en_curso` | `en_mantencion` | **[regla]** confirmar LOTO y tener habilitación LOTO vigente | Supervisor de mantenimiento 25, producción | 🟡 falta exigir la habilitación (H5) |
| 8 | Solicita repuesto | Técnico | `en_curso` | — | — | Pañol 30 | ⛔ hoy retira directo (H7) |
| 9 | Entrega el repuesto | Pañol 30 | — | — | **[regla]** sin OT no hay salida; descuenta stock | Técnico | 🟡 egreso con OT existe |
| 10 | Documenta la intervención | Técnico | `en_curso` | — | Diagnóstico, causa, acción, resultado (idempotente por uid) | — | ✅ |
| 11 | Solicita verificación de cierre | Técnico | `por_verificar` | `por_liberar` | **[regla]** retirar LOTO; nota de cierre obligatoria | Supervisor 25 | ⛔ hoy cierra y deja el equipo operando (H2) |
| 12 | Verifica y libera | Supervisor 25 o jefatura 23 | `cerrada` | `detenido` (disponible para operar) | **[regla]** `ordenes.aprobar`; no puede verificar su propia intervención | Supervisor de turno 7, jefatura de producción 6 | ⛔ |
| 13 | Producción reanuda | Operador o el PLC | — | `operando` cuando el PLC informa marcha | El estado físico vuelve a mandarlo el PLC | — | ✅ (el PLC informa) |
| 14 | Indicadores | Servidor | — | — | MTTR desde el inicio de la falla hasta la liberación; disponibilidad desde los cambios de estado | Tableros | 🟡 MTTR usa paradas |

**Rechazo de la verificación:** el supervisor devuelve la OT a `en_curso` con un motivo; el técnico vuelve a bloquear
antes de intervenir. **Cierre de emergencia:** la jefatura 23 puede verificar en ausencia del supervisor; queda en la
auditoría.

## Flujo B · Pedido → fabricación → despacho → finanzas

| # | Etapa | Quién | Registro y estado | Control | SIMA 4.1 |
|---|---|---|---|---|---|
| 1 | Registra el pedido | Comercial 61 o servicio al cliente 62 | Pedido `registrado` (cliente, producto, cantidad, fecha pedida) | Precio dentro de la banda autorizada [V] | ⛔ |
| 2 | Valida fecha y capacidad | PPC 36 | Pedido `confirmado` con fecha comprometida | Solo PPC confirma fecha | ⛔ |
| 3 | Calcula materiales | MRP 37 | Requerimientos `pendientes` desde la BOM | — | ⛔ |
| 4 | Compra faltantes | Comprador 38 | Orden de compra `emitida` | Monto sobre límite → finanzas 55 | ⛔ |
| 5 | Recibe | Recepción 39, bodega 40 | Recepción con lote; OC `recibida` o `parcial` | Inspección de recepción por calidad 33 si aplica | ⛔ |
| 6 | Libera órdenes | PPC 36, jefatura de producción 6 | Orden de producción `planificada` → `en_curso` | Material disponible | 🟡 órdenes de producción existen, sin pedido ni material |
| 7 | Distribuye tareas | Supervisor 7, líder 8 | Asignación de puestos | Habilitación vigente | ⛔ |
| 8 | Registra resultados | Operadores 9–12 | Registro de producción (buenas, rechazo, motivo) | Orden en curso; turno propio | ✅ |
| 9 | Verifica calidad | Inspector 33, jefatura 31 | Lote `liberado`, `retenido` o `rechazado` | Solo 31 libera | 🟡 NC y liberación existen; falta estado del lote por orden |
| 10 | Despacha | Despacho 42, bodega 40–41 | Despacho `programado` → `en_ruta` → `entregado` | Lote liberado [regla propuesta] | 🟡 despachos existen sin vínculo a pedido ni lote |
| 11 | Consulta cumplimiento | Comercial 61, 62 | Pedido `entregado`; OTIF | — | 🟡 OTIF por despacho |
| 12 | Usa los datos | Finanzas 55–58, costos 57 | Totales de producción, despachos y costos | Solo totales | 🟡 |

## Flujo C · Persona → cuenta → trabajo autorizado

| # | Etapa | Quién | Efecto en la base | SIMA 4.1 |
|---|---|---|---|---|
| 1 | Registra la incorporación | RR. HH. 44, 45, 49 | Fila en Trabajadores con su cargo | ✅ |
| 2 | Asigna cargo | RR. HH. 44 | El cargo fija perfil y canal (Excel) | ✅ |
| 3 | Crea el contrato | RR. HH. 44, 49 | Contrato `VIGENTE`, `es_actual` | ✅ |
| 4 | Configura la cuenta | Automático; soporte TI 59 para lo técnico | Cuenta `ACTIVA` con acceso web **o** app según el canal | ✅ |
| 5 | Comprueba habilitaciones | Capacitación 47, prevención 50, jefaturas 23 y 25 | Habilitaciones vigentes; las exigidas por cargo son propuesta [V] | 🟡 |
| 6 | El supervisor ve a su equipo | 7, 23, 25 | Solo nombre, cargo, turno, asistencia y habilitaciones (hoja Permisos) | ✅ |
| 7 | El trabajador accede | Trabajador | Ve el inicio de su cargo | 🟡 Desktop por cargo en esta iteración |
| 8 | Desvinculación | RR. HH. 44 | Término → contrato `TERMINADO` → cuenta `CERRADA` → se revocan los tokens y se cierra la sesión en vivo | ✅ |
| 9 | Contrato vencido | Automático | Cuenta `SUSPENDIDA: revisar contrato` | ✅ |

## Flujo D · No conformidad

| # | Etapa | Quién | Estado | SIMA 4.1 |
|---|---|---|---|---|
| 1 | Detecta y registra | Inspector 33, laboratorio 34, supervisor 7 | NC `abierta`, lote retenido | ✅ |
| 2 | Avisa | Servidor | Jefatura de calidad 31, jefatura de producción 6, supervisor del turno | 🟡 aviso general en tiempo real |
| 3 | Investiga | Ingeniería de calidad 32 | NC `en_analisis` con causa | ✅ |
| 4 | Acción correctiva | 32 con el área responsable | Acción con responsable y plazo | ⛔ (propuesta) |
| 5 | Decide sobre el lote | Jefatura de calidad 31 | Lote `liberado` o `rechazado`; NC `cerrada` | ✅ |
| 6 | Seguimiento | 31 | Verificación de eficacia de la acción | ⛔ |

## Flujo E · Alarma de un PLC simulado

| # | Etapa | Qué ocurre | SIMA 4.1 |
|---|---|---|---|
| 1 | El simulador genera la falla | Envía el evento con su clave de dispositivo; el servidor solo acepta esa clave para PLC de origen `simulado` | ✅ |
| 2 | Se registra | Evento y alarma quedan con `simulado = true` y origen; la consola de eventos y las alarmas lo muestran con distintivo | ✅ |
| 3 | Llega a quien corresponde | Automatización 18, 19 y 22; sala de control 13; mantenimiento | 🟡 llega a todos los conectados |
| 4 | OT automática | Si la falla lo amerita, se crea una OT automática | 🟡 la OT no indica que nació de un dato simulado (H8) |
| 5 | Análisis | Automatización revisa eventos y E/S; puede reproducir el caso en el laboratorio del simulador | ✅ |
| 6 | Indicadores | **[regla propuesta]** los indicadores separan o marcan lo calculado con datos simulados | ⛔ (H8) |

Un dato de un PLC físico solo entra con la clave del gateway, y el gateway solo puede hablar por PLC de origen `real`.
Un mismo PLC nunca puede cambiar de origen sin una acción explícita de sistemas OT (22).
