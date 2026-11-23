# Entregable 4 · Dashboards: estructura común y componentes compartidos

El diseño de cada uno de los 64 dashboards está en la sección **H** de su ficha en
[CATALOGO_CARGOS.md](CATALOGO_CARGOS.md): nombre, información prioritaria, distribución, menú, tablas y formularios,
acciones rápidas, alertas, notificaciones, estado vacío y componentes. Este documento fija lo que comparten, para que
cargos distintos reutilicen un componente con otros datos, filtros y acciones, en lugar de recibir la misma pantalla.

## Estructura de todo inicio

1. **Encabezado del cargo**: nombre del dashboard («Mis OT mecánicas», «Sala de control»), su propósito en una línea y el
   alcance de lo que ve (su turno, su línea, la planta).
2. **Franja de 3 o 4 cifras** que el cargo usa para decidir. Solo indicadores con fuente: si no hay datos, la tarjeta
   dice «sin datos» y por qué.
3. **Bloque principal de trabajo** (la tarea del día): la orden en curso del operador, la carga de la cuadrilla del
   supervisor, el calendario del planificador, la bandeja de liberación de calidad.
4. **Alertas del cargo**: solo las que la persona puede resolver o debe escalar.
5. **Acciones rápidas**: dos a cuatro, las de la sección H.
6. **Mi jornada**: los cinco momentos del día del cargo (catálogo, sección B), como guía para quien recién empieza.

## Componentes compartidos (paquete `@sima/ui` y bloques de cada app)

| Componente | Lo usan | Qué cambia por cargo |
|---|---|---|
| Orden en curso con registro rápido | 9, 10, 11, 12, 15 | Campos (unidades, mediciones, etiqueta), motivos de rechazo |
| Equipo con medidores y límites | 9, 10, 13, técnicos | Solo los equipos del alcance; límites visibles, sin edición |
| Carga por técnico | 23, 24, 25 | 24 asigna en el calendario; 25 reasigna dentro de su cuadrilla; 23 solo consulta |
| Calendario semanal de OT | 23, 24 | 24 programa; 23 aprueba ventanas |
| Lista de OT (asignadas / disponibles) | 18–20, 26–29 | Filtro por especialidad del cargo (`ESPECIALIDAD_CARGO`) |
| Bandeja de aprobaciones | 1, 3, 4, 23, 31, 55 | Tipo de aprobación según capacidad (`plc.aprobar`, `calidad.liberar`, `remuneraciones.aprobar`) |
| Ranking de condición | 29, 23 | Variables (vibración, temperatura) y umbral |
| Estado de controladores | 18, 19, 22 | 22 ve origen e ingesta; 19 ve sus cambios |
| Vencimientos (instrumentos, habilitaciones, contratos) | 20, 35, 47, 44, 50 | Qué vence: instrumento, habilitación o contrato |
| Stock bajo mínimo | 30, 23, 24 | 30 entrega y repone; 24 reserva; 23 solo consulta críticos |
| Eventos SST | 50–54, 3, 7 | 50 investiga y cierra; los demás reportan o consultan |

## Identidad visual

SIMA Desktop usa grafito (`#0a0c10`) con cian industrial como color de acción; SIMA Web, índigo con violeta y cian. Los
estados tienen siempre el mismo color en las tres apps (operando verde, alarma rojo, mantención ámbar, detenido gris) y
cada dato simulado lleva su distintivo. Las animaciones (aparición de bloques, anillos de avance, barras) duran menos de
400 ms y respetan `prefers-reduced-motion`.
