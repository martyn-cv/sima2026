# SIMA · Sistema de diseño e interfaz (4.1.1)

Este documento explica cómo está construida la interfaz de SIMA Desktop, SIMA Web y SIMA PLC Simulator después del
rediseño: los tokens, los componentes comunes, cómo se diferencian las plataformas, cómo se muestran los estados de los
equipos y los datos simulados, y qué queda pendiente. Todo lo descrito está en el código; las rutas se indican en cada
sección.

## 1. Principios

- **Responder tres preguntas en cada inicio:** qué requiere mi atención, qué tengo que hacer y qué está pasando. Nada de
  tableros genéricos: cada bloque viene de un dato real de la persona o de la planta.
- **Un dato simulado nunca se confunde con uno real.** Todo lo que viene de la planta simulada lleva la trama diagonal
  (`.trama-sim`) y el distintivo `MarcaSimulado`. Lo que no tiene fuente dice «Sin datos» en vez de un número de relleno.
- **El color nunca va solo.** Cada estado se muestra con icono y texto además del color (daltonismo y pantallas de planta).
- **Ocultar un botón no es seguridad.** La interfaz ofrece lo que corresponde al cargo, pero cada acción la valida el
  servidor (capacidad, separación de funciones, plataforma) y queda en la auditoría.
- **Movimiento funcional, sin adornos.** Sin rebotes, sin brillos de neón, sin gradientes decorativos ni animaciones
  infinitas que no comuniquen algo. Las alertas críticas aparecen sin animación de entrada.

## 2. Tokens (`paquetes/ui/src/tema.css`)

Un solo archivo define colores, tipografías, radios, sombras y tiempos para las tres aplicaciones. Los nombres heredados
(`papel`, `chapa`, `negro`…) se conservaron como alias de los tokens nuevos para no romper componentes.

| Rol | Oscuro (Desktop, por defecto) | Claro (Web, por defecto) |
|---|---|---|
| Fondo principal | `#0D1117` | `#F3F5F8` |
| Barras de navegación | `#151B23` | `#FFFFFF` |
| Paneles | `#1C2632` | `#FFFFFF` |
| Superficies elevadas | `#253342` | `#F6F8FA` |
| Bordes | `#303D4B` | `#D5DCE4` |
| Marca y acción principal | `#F59E0B` (hover `#FBBF24`) | `#B45309` (ámbar oscuro, contraste AA sobre blanco) |
| Texto principal / secundario / deshabilitado | `#F1F5F9` / `#94A3B8` / `#64748B` | `#0F172A` / `#526075` / `#94A3B8` |

Colores semánticos (mismos significados en ambas variantes): operativo `#22C55E`, falla `#EF4444`, advertencia `#EAB308`,
mantenimiento `#3B82F6`, detenido `#64748B`, diagnóstico `#A78BFA`, información `#38BDF8`. En el tema claro se usan
tonos más oscuros de la misma familia para mantener el contraste.

- **Tipografías:** Inter (interfaz), IBM Plex Sans (cifras y KPI, clase `t-kpi`), JetBrains Mono (códigos, tags y valores
  técnicos, clase `t-dato`). Se empaquetan con `@fontsource`, así funcionan sin internet (planta y `.exe`).
- **Jerarquía:** `t-pantalla` (20/28, título de pantalla), `t-seccion` (14/20), `t-etiqueta` (11, mayúsculas espaciadas),
  `t-kpi`, `t-dato`.
- **Radios contenidos:** la escala de Tailwind se redefinió (`rounded-md` 4 px, `rounded-lg`/`xl` 6 px, `2xl` 8 px).
- **Espaciado:** múltiplos de 4 y 8. Alto de control 36 px en la web y 32 px en Desktop (más denso).
- **Movimiento:** micro 140 ms, componentes 200 ms, pantallas 280 ms, paneles 340 ms, curva `cubic-bezier(.2,.7,.2,1)`.
  Con «reducir movimiento» del sistema operativo, las animaciones se desactivan (`prefers-reduced-motion` y
  `MotionConfig reducedMotion="user"`).

## 3. Componentes comunes (`paquetes/ui/src`)

`ui.tsx`: `Boton` (acento, secundario, contorno, texto, peligro; tamaños s/m/l; modo icono; estado cargando), `Campo`,
`Entrada`, `Seleccion`, `AreaTexto`, `Interruptor`, `Encabezado`, `Tarjeta`, `Seccion`, `Pestanas`, `Tabla` (encabezado
fijo, orden, búsqueda, paginación, selección múltiple, columnas configurables), `Dialogo`, `Confirmar` (con motivo
obligatorio cuando la acción lo exige), `Cajon`, avisos (`useAviso`), `Kpi` (nombre, valor, unidad, meta, tendencia,
actualizado, simulado, enlace al detalle), `EstadoVista` (cargando, vacío, sin resultados, error, sin permiso, sesión
expirada, sin conexión, datos desactualizados, mantenimiento, éxito, sincronización pendiente), `Esqueleto`,
`EstadoEquipo`, `defEstado`, `MarcaSimulado`.

Componentes nuevos de esta iteración:

- `notificaciones.tsx` · `PanelNotificaciones`: centro de notificaciones con dos vistas (para mí, guardadas en el
  servidor; y actividad en vivo de la planta), filtro por categoría (críticas, advertencias, tareas, solicitudes,
  aprobaciones, información), origen, referencia, fecha y estado de lectura. Lo usan Desktop y Web.
- `liberacion.tsx` · `LiberacionOrden`: la liberación por etapas de una OT (técnica, seguridad, calidad, producción) con
  quién firmó, cargo, plataforma y fecha, la firma que le toca a la persona, pruebas y rechazos. Lo usan Desktop y Web.

### Estados de equipo

`defEstado(estado)` devuelve etiqueta, etiqueta corta, color, tono, icono y si el equipo produce (`marcha`) o requiere
atención inmediata (`critico`). Acepta también el vocabulario anterior de los dispositivos (`operando`, `alarma`,
`detenido`, `en_mantencion`) para que el simulador y los `.exe` antiguos sigan funcionando.

| Estado | Icono | Color | ¿Produce? | ¿Crítico? |
|---|---|---|---|---|
| Operativo | círculo con check | verde | sí | no |
| Operativo con observaciones | triángulo | ámbar | sí | no |
| Falla detectada | octógono | rojo | no | sí |
| Fuera de servicio | círculo tachado | gris | no | no |
| Bloqueado por seguridad | candado | rojo | no | sí |
| En diagnóstico | estetoscopio | violeta | no | no |
| En mantenimiento | llave | azul | no | no |
| En pruebas | matraz | azul | no | no |
| Pendiente de liberación | reloj | ámbar | no | no |
| Liberado para producción | check | gris | no | no |

## 4. SIMA Desktop: estación de trabajo de planta (`terreno/src`)

Tema oscuro por defecto (se puede cambiar a claro desde el perfil), mayor densidad, pensado para 1366×768 o más.

- **Barra lateral** (`shell.tsx`): logo, identificación del espacio (familia del cargo), buscador, módulos del cargo
  agrupados (Mi trabajo, Planta, Turno, Personal) con grupos plegables, indicador de pantalla activa, contadores de
  pendientes (órdenes asignadas o por firmar, órdenes sin asignar para planificación, equipos en falla), accesos rápidos
  (reportar falla, condición insegura) y botón para contraer o expandir (se recuerda en el equipo).
- **Barra superior:** ruta (miga de pan), buscador global `Ctrl K` (pantallas, equipos y órdenes), aviso de equipos en
  falla, conexión con el servidor, turno, fecha y hora, centro de notificaciones y menú de perfil (tema, mi cargo,
  cerrar sesión).
- **Franja de alerta crítica:** las alarmas críticas y los avisos críticos dirigidos a la persona aparecen de inmediato
  bajo la barra superior, con enlace al equipo.
- **Barra de estado:** servidor, sincronización de la cola sin conexión, antigüedad del último dato, PLC en marcha y
  marca de planta simulada, versión.
- **Inicio por cargo** (`pantallas/Rol.tsx`): «Requiere su atención» (equipos críticos, firmas de liberación,
  aprobaciones, OT asignadas, habilitaciones vencidas o por vencer, notificaciones importantes, envíos sin sincronizar),
  «Qué hacer» (acciones del cargo) y «Qué está pasando» (bloques del cargo).
- **Explorador de planta** (`pantallas/Explorador.tsx`): árbol de áreas y líneas, y un **mapa SVG** de cada línea con los
  controladores, la red, las máquinas (pictograma por tipo), sus sensores (puntos de color con su valor al pasar el
  ratón) y la cinta que las une (se anima solo si el equipo de origen produce). Distingue dato en vivo de PLC físico,
  planta simulada (trama) y sin conexión (borde discontinuo, «sin datos»). Es una vista de consulta: no envía órdenes.
- **Ficha de máquina:** vistas según el perfil (operador: ficha, variables, manuales, historial; automatización empieza
  por el PLC; pañol por repuestos; mantenimiento ve todo), ficha técnica y componentes (marcadas como de demostración),
  historial de estados con quién, cargo, plataforma y fecha, y acciones con confirmación y motivo obligatorio: bloquear
  por seguridad, levantar bloqueo, sacar de servicio, devolver al servicio y poner en marcha.
- **Órdenes de trabajo** (`pantallas/Mantenimiento.tsx`): revisar → bloqueo LOTO → diagnóstico → intervención → pruebas y
  liberación. El paso de pruebas registra cada prueba (conforme o no) y exige que la última sea conforme para pedir la
  liberación; se marca si la intervención afecta la seguridad o la calidad (agrega esas firmas). Lo escrito se guarda
  como borrador en el equipo y se avisa antes de cerrar la ventana con trabajo sin registrar.
- **Ingreso** (`App.tsx`): identidad de la estación de planta, estado del servidor, mostrar clave, aviso de Bloq Mayús,
  recuperación por Soporte TI, cuentas de demostración marcadas como datos simulados y filtrables, versión.

## 5. SIMA Web: gestión (`web/`)

Tema claro por defecto (se puede cambiar a oscuro), identidad de gestión, distinta de la estación de planta.

- Marco sobrio (`components/Shell.tsx`): menú por capacidades sin rebotes ni brillos, resumen de planta en la barra
  superior (en vivo, equipos produciendo, equipos en falla), centro de notificaciones compartido.
- Ingreso propio (`app/login/page.tsx`) con las mismas garantías que Desktop y la indicación de que la operación en
  terreno se hace en SIMA Desktop.
- **Cuentas de acceso:** autorización y revocación por plataforma, con motivo obligatorio; muestra quién autorizó, cuándo
  y por qué, y el último ingreso por plataforma.
- **Registro de accesos** (nuevo): ingresos correctos, claves incorrectas, bloqueos, cuentas cerradas o suspendidas e
  intentos sin autorización de plataforma.
- **Auditoría:** cargo, plataforma, valor anterior y nuevo, motivo y búsqueda.
- **Mantenimiento e inicio:** bandeja «Requieren su firma o aprobación» con las liberaciones; la jefatura de calidad
  firma desde la web aunque su cargo no vea órdenes de trabajo (el servidor le muestra solo la orden que espera su firma).

## 6. Supuestos de diseño

- **Turnos:** A 06:00–14:00, B 14:00–22:00, N 22:00–06:00 y D diurno 08:00–17:30 (`TURNOS` en `terreno/src/shell.tsx`).
  Si la planta usa otros horarios, se cambian ahí.
- **Firmante técnico:** además de supervisión y jefatura de mantenimiento, un técnico con la habilitación «Responsable de
  mantenimiento de turno» vigente puede firmar la liberación técnica (lo verifica el servidor).
- Las fichas técnicas y los componentes de las 15 máquinas son **de demostración** y se muestran así.

## 7. Verificación

- Pruebas de la API: 53 de 53 (incluye que calidad lea solo la orden que espera su firma).
- Tipos: `terreno`, `web` y `plc-sim` sin errores.
- Navegador (Playwright, 1366×768 en Desktop y 1440×900 en Web): ocho cargos de Desktop sin errores de consola; flujo
  completo técnico → firma técnica → seguridad → producción → puesta en marcha; jefatura de calidad firmando desde la web;
  técnico rechazado en la web por falta de autorización de plataforma; Personas en cuentas, plataformas, accesos y
  auditoría.
- Ejecutables de Windows: GitHub Actions (`.github/workflows/v41-ejecutables.yml`) compila `SIMA-Desktop.exe` y
  `SIMA-PLC-Simulator.exe` en cada cambio de las aplicaciones.

## 8. Pendiente

- Tablas: columnas redimensionables y virtualización para listas muy largas (hoy hay paginación y columnas configurables).
- Formularios por pasos con autocompletado en la web (altas de trabajadores y contratos ya validan en el servidor).
- Módulo de habilitaciones completo (catálogo por cargo, máquina, instalación y área; documentos; validación técnica;
  renovaciones) y bloqueo de tareas por habilitación más allá de LOTO y responsable de turno.
- Pedidos comerciales, órdenes de producción vinculadas, solicitudes de compra y de repuestos, órdenes de compra y de
  despacho como entidades separadas, preparadas para un ERP.
- Mapa de planta completo (todas las áreas en un plano) y conectores OPC UA, MQTT y Modbus reales (hoy la arquitectura
  está preparada y se usa la planta simulada).
