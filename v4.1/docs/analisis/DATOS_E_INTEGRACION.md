# Entregables 6 y 7 · Base de datos e integración

## 6.1 Tablas que existen hoy (PostgreSQL, una sola base `sima_v41`)

| Origen | Tablas | Relaciones que se aprovechan |
|---|---|---|
| Hojas del Excel | `cargos`, `trabajadores`, `contratos`, `terminos`, `asistencias`, `conceptos`, `catalogo_conceptos`, `habilitaciones`, `parametros`, `afps`, `tramos_impuesto` | trabajador → cargo (perfil y canal); trabajador → jefe directo (organigrama y «mi equipo»); trabajador → contratos, asistencia, habilitaciones, término |
| Cuentas y control | `rol_permisos` (capacidad y alcance por **id_cargo**), `auditorias`, `cierres_remuneraciones`, `validaciones_parametros` | cargo → capacidades; toda acción sensible → auditoría |
| Planta (v4.1) | `plantas` → `areas` → `lineas` → `equipos` → `sensores` → `lecturas`; `plcs` → `plc_modulos`, `plc_puntos`, `plc_comandos`; `eventos`, `cambios_estado`, `alarmas` | equipo ↔ PLC; evento con `uid` único, `origen` y `simulado` |
| Mantenimiento | `ordenes` (OT, con versión, especialidad y fecha programada), `intervenciones`, `intervencion_herramientas`, `repuestos`, `movimientos_repuesto`, `herramientas`, `equipo_repuestos`, `documentos`, `rutinas`, `ejecuciones_rutina`, `traspasos`, `cambios_plc` | OT → equipo, técnico asignado; movimiento de repuesto → OT e intervención |
| Producción, calidad, SST | `ordenes_produccion`, `registros_produccion`, `produccion`, `paradas`, `no_conformidades`, `incidentes_sst`, `despachos` | orden de producción → equipo y turno; NC → lote; incidente → área y equipo |

## 6.2 Entidades nuevas propuestas (por fase del plan)

Cada una referencia lo que ya existe, sin duplicar datos: personas por `trabajador_id`, equipos por `equipo_id`, órdenes
por su id. Todas llevan `version` (xmin) para concurrencia y sus cambios se auditan.

| Fase | Entidad | Campos clave | Se relaciona con | Endpoints |
|---|---|---|---|---|
| 1 | `ordenes` (+ estados `por_verificar`, verificación) | `verificada_por_id`, `verificada_en`, `nota_cierre` | intervenciones, equipo | `POST /api/ordenes/{id}/solicitar-cierre`, `/verificar`, `/rechazar-cierre` |
| 1 | `equipos.estado` (+ `por_liberar`) | estado de mantenimiento separado del físico | cambios_estado | (lo cambian los endpoints de OT) |
| 2 | `solicitudes_repuesto` | ot_id, repuesto_id, cantidad, solicitado_por, estado (pendiente/entregada/rechazada), entregado_por | ordenes, repuestos, movimientos | `GET/POST /api/repuestos/solicitudes`, `/entregar`, `/rechazar` |
| 2 | `asignaciones_turno` | fecha, turno, trabajador_id, equipo_id o puesto, asignado_por | trabajadores, equipos, habilitaciones | `GET/POST /api/turno/asignaciones` |
| 2 | `asistencia_diaria` | fecha, trabajador_id, estado (presente, ausente, permiso), registrado_por | asistencias (el mensual se calcula) | `GET/POST /api/turno/asistencia` |
| 2 | `requisitos_habilitacion` | cargo_id o tipo de equipo, habilitación exigida | cargos, habilitaciones | `GET/PUT /api/habilitaciones/requisitos` |
| 2 | `calibraciones` | herramienta o sensor, fecha, patrón, lectura, error, resultado, por | herramientas, sensores | `POST /api/calibraciones` |
| 3 | `clientes`, `pedidos`, `pedido_lineas` | cliente, producto, cantidad, fecha pedida y comprometida, estado | ordenes_produccion, despachos | `/api/pedidos` |
| 3 | `productos`, `bom`, `versiones_producto` | código, versión, componentes y cantidades | pedidos, materiales, documentos | `/api/productos` |
| 3 | `materiales`, `existencias`, `ubicaciones`, `movimientos_material`, `conteos` | material, lote, ubicación, cantidad | recepciones, ordenes_produccion | `/api/inventario` |
| 3 | `proveedores`, `solicitudes_compra`, `ordenes_compra`, `recepciones` | proveedor, línea, cantidad, fechas, estado | materiales, repuestos, presupuesto | `/api/compras`, `/api/recepciones` |
| 4 | `lotes` | código, orden de producción, estado (en_proceso, retenido, liberado, rechazado) | NC, despachos, registros | `/api/lotes` |
| 4 | `inspecciones`, `ensayos`, `acciones_correctivas`, `reclamos` | criterio, resultado, responsable, plazo | lotes, NC, clientes | `/api/calidad/...` |
| 4 | `riesgos`, `inspecciones_sst`, `emergencias`, `simulacros`, `registros_ambientales` | zona, peligro, control, responsable | áreas, incidentes | `/api/sst/...` |
| 5 | `presupuestos`, `centros_costo`, `costos_estandar`, `proyectos`, `hitos`, `tickets`, `contratistas`, `vacantes`, `cursos`, `casos_laborales` | según el módulo | áreas, trabajadores | `/api/...` |

`casos_laborales` y cualquier dato de salud requieren cifrado de columna y acceso solo por cargo (48, 44, 53), con
auditoría de cada lectura. SIMA no guarda diagnósticos médicos individuales.

## 6.3 Reglas de integridad que se mantienen

- Una persona tiene una sola cuenta; el login es el correo corporativo (Excel, LEEME).
- Cuenta `CERRADA` o `SUSPENDIDA` no inicia sesión ni renueva token; al cerrarse, el servidor corta la sesión en vivo.
- Toda salida de repuesto lleva una OT; el stock no puede quedar negativo (restricción `ck_repuestos_stock`).
- Un evento con el mismo `uid` se acepta una sola vez; un dato de PLC simulado no puede entrar con la clave del gateway real
  y al revés.
- Dos personas editando la misma OT u orden de producción: la segunda recibe 409 y vuelve a cargar (versión xmin).

---

## 7 · Arquitectura de integración

```
                       ┌───────────────────────── API .NET 8 (una sola) ─────────────────────────┐
SIMA Web (Next.js) ──REST──►  autenticación JWT · permisos por id_cargo (rol_permisos) · auditoría  │
SIMA Desktop (Tauri) ─REST──►  endpoints por dominio · transacciones · versión xmin → 409            ├──► PostgreSQL
   (cola sin conexión con uid)  SignalR /hubs/planta: eventos en vivo                               │      (única)
SIMA PLC Simulator ──REST + clave de dispositivo (solo PLC simulados)──► ingesta idempotente        │
Gateway de planta ───REST + clave de gateway (solo PLC reales)──────────►                           │
                       └──────────────────────────────────────────────────────────────────────────┘
```

**Lo que ya existe.** Una API con REST y un hub SignalR (`lecturas`, `equipo`, `alarma`, `orden`, `plc`, `evento`,
`intervencion`, `produccion`, `calidad`, `sst`, `cambioPlc`, `estructura`, `cuentaCerrada`); claves separadas para el
simulador y el gateway; eventos idempotentes por `uid`; cola sin conexión en Desktop que reenvía con el mismo `uid`;
concurrencia optimista; marca `simulado` en lecturas, eventos y alarmas.

**Lo que se agrega en el plan.**

1. **Notificaciones dirigidas.** Además del grupo `planta`, cada conexión entra a los grupos `usuario:{id}`,
   `cargo:{id}` y `area:{id}`. Una OT asignada notifica solo al técnico; una solicitud de repuesto, al pañol; una NC, a
   calidad y a la jefatura de producción. El cliente sigue sin decidir qué puede ver: los datos se vuelven a pedir por
   REST, donde se aplican los permisos.
2. **Un evento de dominio por cambio relevante** (`orden.asignada`, `orden.por_verificar`, `equipo.liberado`,
   `repuesto.solicitado`, `lote.retenido`…) que se guarda en `eventos` (trazabilidad) y se publica en SignalR.
3. **Permisos en cada endpoint de lectura.** Las consultas de planta y OT exigen su capacidad, igual que hoy las de
   personas y pagos (hallazgo H1).
4. **Marca de origen en los indicadores.** Cada indicador informa si se calculó con datos simulados, reales o mixtos.
