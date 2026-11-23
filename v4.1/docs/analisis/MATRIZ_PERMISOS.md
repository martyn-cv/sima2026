# Matriz de permisos por cargo

> Generado por `docs/analisis/generar.py`. Es la matriz del entregable 3 y, compilada a capacidades del servidor, la matriz de fábrica v7 (`api/Sima.Api/Servicios/PermisosCatalogo.g.cs`). La matriz vigente vive en la tabla `rol_permisos` y se puede ajustar por cargo en la web (Permisos por cargo).

**Acciones:** **C** consultar · **Cr** crear · **R** registrar · **E** editar · **As** asignar · **Ap** aprobar o rechazar · **Ci** cerrar · **X** exportar · **S** solicitar

**Alcance** (subíndice; sin subíndice = empresa): **pr** propio · **eq** su equipo · **ln** su línea · **ar** su área · **pl** planta · **ag** solo totales

Reglas que aplican a todos los cargos y no se repiten en la tabla: cada persona consulta su propia ficha, sus habilitaciones y su cuenta; cualquier cuenta activa puede **reportar** una condición insegura (los avisos de falla los crean quienes trabajan en planta); el directorio muestra solo nombre, cargo, turno y correo corporativo (en SIMA Desktop, solo nombre y cargo, como fija la hoja Permisos).

## Personas

| Cargo | Fichas de personal | Contratos | Desvinculaciones | Cuentas de acceso SIMA | Asistencia y ausentismo | Habilitaciones y competencias | Vacantes y selección ᴾ | Cursos y matriz de formación ᴾ | Casos laborales y bienestar (confidencial) ᴾ |
|---|---|---|---|---|---|---|---|---|---|
| 01 Director/a general o gerente general | C | C | · | C | C | C | · | · | · |
| 02 Gerente/a de operaciones | C | C | · | · | C | C | · | · | · |
| 03 Gerente/a o jefe/a de planta | C<sub>pl</sub> | C<sub>pl</sub> | C<sub>pl</sub> | · | C<sub>pl</sub> | C<sub>pl</sub> | · | · | · |
| 04 Jefe/a de administración de planta | C | C | C | · | C | · | · | · | · |
| 06 Jefe/a de producción | · | · | · | · | C<sub>eq</sub> | C<sub>eq</sub> | · | · | · |
| 07 Supervisor/a de turno | · | · | · | · | CR<sub>eq</sub> | C<sub>eq</sub> | · | · | · |
| 08 Líder o encargado/a de línea | · | · | · | · | · | C<sub>ln</sub> | · | · | · |
| 09 Operador/a de máquina o proceso | · | · | · | · | · | C<sub>pr</sub> | · | · | · |
| 10 Operador/a de CNC | · | · | · | · | · | C<sub>pr</sub> | · | · | · |
| 11 Armador/a o ensamblador/a | · | · | · | · | · | C<sub>pr</sub> | · | · | · |
| 12 Operador/a de envasado, etiquetado y embalaje | · | · | · | · | · | C<sub>pr</sub> | · | · | · |
| 13 Operador/a de sala de control | · | · | · | · | · | C<sub>pr</sub> | · | · | · |
| 14 Operador/a de montacargas o grúa horquilla | · | · | · | · | · | C<sub>pr</sub> | · | · | · |
| 15 Auxiliar de producción / apoyo de línea | · | · | · | · | · | C<sub>pr</sub> | · | · | · |
| 18 Ingeniero/a de automatización y control | · | · | · | · | · | C<sub>pr</sub> | · | · | · |
| 19 Programador/a de PLC/HMI | · | · | · | · | · | C<sub>pr</sub> | · | · | · |
| 20 Técnico/a de instrumentación y calibración | · | · | · | · | · | C<sub>pr</sub> | · | · | · |
| 22 Especialista de sistemas industriales (OT/MES) | · | · | · | · | · | C<sub>pr</sub> | · | · | · |
| 23 Jefe/a de mantenimiento | · | · | · | · | C<sub>eq</sub> | CE<sub>eq</sub> | · | · | · |
| 24 Planificador/a o programador/a de mantenimiento | · | · | · | · | C<sub>eq</sub> | C<sub>eq</sub> | · | · | · |
| 25 Supervisor/a de mantenimiento | · | · | · | · | C<sub>eq</sub> | CE<sub>eq</sub> | · | · | · |
| 26 Técnico/a mecánico/a industrial | · | · | · | · | · | C<sub>pr</sub> | · | · | · |
| 27 Técnico/a eléctrico/a industrial | · | · | · | · | · | C<sub>pr</sub> | · | · | · |
| 28 Técnico/a electromecánico/a | · | · | · | · | · | C<sub>pr</sub> | · | · | · |
| 29 Técnico/a de lubricación o confiabilidad | · | · | · | · | · | C<sub>pr</sub> | · | · | · |
| 30 Encargado/a de repuestos y pañol | · | · | · | · | · | C<sub>pr</sub> | · | · | · |
| 33 Inspector/a o técnico/a de control de calidad | · | · | · | · | · | C<sub>pr</sub> | · | · | · |
| 34 Laboratorista / analista de ensayos | · | · | · | · | · | C<sub>pr</sub> | · | · | · |
| 35 Especialista en metrología | · | · | · | · | · | C<sub>pr</sub> | · | · | · |
| 39 Encargado/a de recepción de materiales | · | · | · | · | · | C<sub>pr</sub> | · | · | · |
| 40 Jefe/a de bodega o almacén | · | · | · | · | C<sub>eq</sub> | C<sub>eq</sub> | · | · | · |
| 41 Bodeguero/a o preparador/a de pedidos | · | · | · | · | · | C<sub>pr</sub> | · | · | · |
| 44 Jefe/a de recursos humanos / personas | CCrEX | CCrE | CCrE | CE | C | CE | CAp | C | C |
| 45 Reclutador/a y analista de selección | CCr | C | · | · | · | C | CCrE | · | · |
| 46 Analista de remuneraciones y asistencia | C | C | C | · | CRE | · | · | · | · |
| 47 Encargado/a de capacitación y desarrollo | C | · | · | · | · | CCrE | · | CCrE | · |
| 48 Especialista en relaciones laborales y bienestar | C | · | · | · | · | · | · | · | CCrECi |
| 49 Asistente administrativo/a de personal | CCrE | CCrE | C | C | CR | C | · | · | · |
| 50 Profesional o encargado/a de prevención de riesgos | · | · | · | · | · | CE<sub>pl</sub> | · | · | · |
| 53 Encargado/a de salud ocupacional y ergonomía | · | · | · | · | C<sub>ag</sub> | · | · | · | · |
| 54 Equipo de respuesta a emergencias / brigada | · | · | · | · | · | C<sub>pr</sub> | · | · | · |
| 55 Gerente/a financiero/a o jefe/a de finanzas | C | C | C | · | C | · | · | · | · |
| 58 Tesorería / cuentas por pagar y cobrar | C | · | · | · | · | · | · | · | · |
| 59 Soporte TI / ERP | · | · | · | CE | · | · | · | · | · |

## Pagos

| Cargo | Remuneraciones | Descuentos y conceptos variables | Parámetros de remuneraciones |
|---|---|---|---|
| 01 Director/a general o gerente general | C<sub>ag</sub> | · | · |
| 02 Gerente/a de operaciones | C<sub>ag</sub> | · | · |
| 03 Gerente/a o jefe/a de planta | C<sub>ag</sub> | · | · |
| 04 Jefe/a de administración de planta | CAp | C | CEAp |
| 05 Analista de control de gestión industrial | C<sub>ag</sub> | · | · |
| 44 Jefe/a de recursos humanos / personas | C | C | C |
| 46 Analista de remuneraciones y asistencia | CCrX | CCrE | C |
| 55 Gerente/a financiero/a o jefe/a de finanzas | CApX | C | CEAp |
| 56 Contador/a y analista contable | CX | · | C |
| 57 Analista de costos industriales | C<sub>ag</sub> | · | · |
| 58 Tesorería / cuentas por pagar y cobrar | CX | · | · |

## Comercial

| Cargo | Pedidos y clientes ᴾ | Especificaciones, BOM y cambios de ingeniería ᴾ |
|---|---|---|
| 01 Director/a general o gerente general | C | · |
| 02 Gerente/a de operaciones | C | · |
| 16 Ingeniero/a de procesos | · | C |
| 31 Jefe/a o gerente de calidad | C | · |
| 32 Ingeniero/a de calidad | · | C |
| 36 Planificador/a de producción (PPC) | C | · |
| 37 Planificador/a de materiales (MRP) | · | C |
| 42 Coordinador/a de despacho y transporte | C | · |
| 61 Gerente/a comercial o ejecutivo/a de cuentas | CCrEX | · |
| 62 Servicio al cliente / gestión de pedidos | CRE | · |
| 63 Diseñador/a de producto o ingeniería de producto | · | CCrEAp |

## Producción

| Cargo | Programa de producción y capacidad ᵖᵃʳ | Órdenes y registros de producción | Traspaso y bitácora de turno | Rutinas y checklist |
|---|---|---|---|---|
| 01 Director/a general o gerente general | · | C | · | · |
| 02 Gerente/a de operaciones | CAp | C | · | · |
| 03 Gerente/a o jefe/a de planta | · | C<sub>pl</sub> | C<sub>pl</sub> | · |
| 04 Jefe/a de administración de planta | · | C<sub>ag</sub> | · | · |
| 05 Analista de control de gestión industrial | · | CX<sub>ag</sub> | · | · |
| 06 Jefe/a de producción | CE<sub>pl</sub> | CCrEX<sub>pl</sub> | C<sub>pl</sub> | · |
| 07 Supervisor/a de turno | · | CRE<sub>eq</sub> | CCrCi<sub>eq</sub> | CR<sub>ln</sub> |
| 08 Líder o encargado/a de línea | · | CRE<sub>ln</sub> | C<sub>ln</sub> | CR<sub>ln</sub> |
| 09 Operador/a de máquina o proceso | · | CR<sub>pr</sub> | · | CR<sub>pr</sub> |
| 10 Operador/a de CNC | · | CR<sub>pr</sub> | · | CR<sub>pr</sub> |
| 11 Armador/a o ensamblador/a | · | CR<sub>pr</sub> | · | CR<sub>pr</sub> |
| 12 Operador/a de envasado, etiquetado y embalaje | · | CR<sub>pr</sub> | · | CR<sub>pr</sub> |
| 13 Operador/a de sala de control | · | · | CCr<sub>ar</sub> | CR<sub>pr</sub> |
| 14 Operador/a de montacargas o grúa horquilla | · | · | · | CR<sub>pr</sub> |
| 15 Auxiliar de producción / apoyo de línea | · | C<sub>ln</sub> | · | CR<sub>ln</sub> |
| 16 Ingeniero/a de procesos | · | C<sub>pl</sub> | C<sub>pl</sub> | · |
| 17 Ingeniero/a industrial o de mejora continua | · | C<sub>pl</sub> | · | · |
| 23 Jefe/a de mantenimiento | · | C<sub>pl</sub> | CCr<sub>ar</sub> | · |
| 24 Planificador/a o programador/a de mantenimiento | C<sub>pl</sub> | · | C<sub>ar</sub> | · |
| 25 Supervisor/a de mantenimiento | · | · | CCr<sub>eq</sub> | · |
| 29 Técnico/a de lubricación o confiabilidad | · | · | · | CR<sub>pl</sub> |
| 31 Jefe/a o gerente de calidad | · | C<sub>pl</sub> | · | · |
| 32 Ingeniero/a de calidad | · | C<sub>pl</sub> | · | · |
| 33 Inspector/a o técnico/a de control de calidad | · | C<sub>pl</sub> | · | · |
| 34 Laboratorista / analista de ensayos | · | C<sub>pl</sub> | · | · |
| 36 Planificador/a de producción (PPC) | CCrEX<sub>pl</sub> | CCrE<sub>pl</sub> | · | · |
| 37 Planificador/a de materiales (MRP) | C<sub>pl</sub> | C<sub>pl</sub> | · | · |
| 50 Profesional o encargado/a de prevención de riesgos | · | · | · | C<sub>pl</sub> |
| 55 Gerente/a financiero/a o jefe/a de finanzas | · | C<sub>ag</sub> | · | · |
| 57 Analista de costos industriales | · | C<sub>ag</sub> | · | · |
| 61 Gerente/a comercial o ejecutivo/a de cuentas | · | C<sub>ag</sub> | · | · |

## Abastecimiento

| Cargo | Materiales y requerimientos (MRP) ᴾ | Bodega: ubicaciones, recepciones y conteos ᴾ | Solicitudes y órdenes de compra ᴾ | Proveedores y evaluaciones ᴾ | Despachos y transporte |
|---|---|---|---|---|---|
| 01 Director/a general o gerente general | · | · | · | · | C |
| 02 Gerente/a de operaciones | · | · | · | · | C |
| 03 Gerente/a o jefe/a de planta | · | · | · | · | C<sub>pl</sub> |
| 05 Analista de control de gestión industrial | · | · | · | · | C |
| 11 Armador/a o ensamblador/a | S<sub>pr</sub> | · | · | · | · |
| 12 Operador/a de envasado, etiquetado y embalaje | · | · | · | · | C<sub>pr</sub> |
| 14 Operador/a de montacargas o grúa horquilla | · | CR<sub>pr</sub> | · | · | · |
| 15 Auxiliar de producción / apoyo de línea | CR<sub>ln</sub> | · | · | · | · |
| 21 Ingeniero/a de proyectos industriales | · | · | CS<sub>pl</sub> | C | · |
| 23 Jefe/a de mantenimiento | · | · | CS<sub>pl</sub> | · | · |
| 30 Encargado/a de repuestos y pañol | · | · | CS<sub>pl</sub> | · | · |
| 31 Jefe/a o gerente de calidad | · | · | · | C | C<sub>pl</sub> |
| 32 Ingeniero/a de calidad | · | · | · | C | · |
| 36 Planificador/a de producción (PPC) | C<sub>pl</sub> | C<sub>pl</sub> | · | · | · |
| 37 Planificador/a de materiales (MRP) | CCrEX<sub>pl</sub> | C<sub>pl</sub> | CS<sub>pl</sub> | · | · |
| 38 Comprador/a de materias primas y suministros | C<sub>pl</sub> | C<sub>pl</sub> | CCrEAp | CE | C |
| 39 Encargado/a de recepción de materiales | · | CR<sub>pl</sub> | C<sub>pl</sub> | · | · |
| 40 Jefe/a de bodega o almacén | C<sub>pl</sub> | CREAs<sub>pl</sub> | · | · | C<sub>pl</sub> |
| 41 Bodeguero/a o preparador/a de pedidos | · | CR<sub>pr</sub> | · | · | C<sub>pr</sub> |
| 42 Coordinador/a de despacho y transporte | · | C<sub>pl</sub> | · | · | CCrEX |
| 43 Analista de inventarios / logística | C<sub>pl</sub> | CCrX<sub>pl</sub> | · | · | C<sub>pl</sub> |
| 55 Gerente/a financiero/a o jefe/a de finanzas | · | · | CAp | · | · |
| 56 Contador/a y analista contable | · | · | C | · | · |
| 57 Analista de costos industriales | C<sub>pl</sub> | · | · | · | · |
| 61 Gerente/a comercial o ejecutivo/a de cuentas | · | · | · | · | C |
| 62 Servicio al cliente / gestión de pedidos | · | · | · | · | C |
| 63 Diseñador/a de producto o ingeniería de producto | C<sub>pl</sub> | · | · | · | · |
| 64 Responsable de desarrollo de proveedores | · | C<sub>pl</sub> | C | CCrEAp | · |

## Planta

| Cargo | Planta, áreas, líneas y equipos | Alarmas y eventos de planta |
|---|---|---|
| 01 Director/a general o gerente general | C | · |
| 02 Gerente/a de operaciones | C | · |
| 03 Gerente/a o jefe/a de planta | CCrE<sub>pl</sub> | · |
| 06 Jefe/a de producción | C<sub>pl</sub> | C<sub>pl</sub> |
| 07 Supervisor/a de turno | C<sub>ln</sub> | CR<sub>ln</sub> |
| 08 Líder o encargado/a de línea | C<sub>ln</sub> | CR<sub>ln</sub> |
| 09 Operador/a de máquina o proceso | C<sub>pr</sub> | C<sub>pr</sub> |
| 10 Operador/a de CNC | C<sub>pr</sub> | · |
| 11 Armador/a o ensamblador/a | C<sub>pr</sub> | · |
| 12 Operador/a de envasado, etiquetado y embalaje | C<sub>pr</sub> | · |
| 13 Operador/a de sala de control | C<sub>pl</sub> | CR<sub>pl</sub> |
| 14 Operador/a de montacargas o grúa horquilla | C<sub>pr</sub> | · |
| 15 Auxiliar de producción / apoyo de línea | C<sub>pr</sub> | · |
| 16 Ingeniero/a de procesos | C<sub>pl</sub> | C<sub>pl</sub> |
| 18 Ingeniero/a de automatización y control | CCrE<sub>pl</sub> | CR<sub>pl</sub> |
| 19 Programador/a de PLC/HMI | C<sub>pl</sub> | C<sub>pl</sub> |
| 20 Técnico/a de instrumentación y calibración | C<sub>pl</sub> | C<sub>pl</sub> |
| 21 Ingeniero/a de proyectos industriales | CCr<sub>pl</sub> | · |
| 22 Especialista de sistemas industriales (OT/MES) | CCrE<sub>pl</sub> | C<sub>pl</sub> |
| 23 Jefe/a de mantenimiento | CCrE<sub>pl</sub> | CR<sub>pl</sub> |
| 24 Planificador/a o programador/a de mantenimiento | CCrE<sub>pl</sub> | C<sub>pl</sub> |
| 25 Supervisor/a de mantenimiento | C<sub>pl</sub> | CR<sub>pl</sub> |
| 26 Técnico/a mecánico/a industrial | C<sub>pl</sub> | C<sub>pl</sub> |
| 27 Técnico/a eléctrico/a industrial | C<sub>pl</sub> | C<sub>pl</sub> |
| 28 Técnico/a electromecánico/a | C<sub>pl</sub> | C<sub>pl</sub> |
| 29 Técnico/a de lubricación o confiabilidad | C<sub>pl</sub> | C<sub>pl</sub> |
| 30 Encargado/a de repuestos y pañol | C<sub>pl</sub> | · |
| 35 Especialista en metrología | C<sub>pl</sub> | · |
| 36 Planificador/a de producción (PPC) | C<sub>pl</sub> | · |
| 50 Profesional o encargado/a de prevención de riesgos | C<sub>pl</sub> | C<sub>pl</sub> |

## Mantenimiento

| Cargo | Órdenes de trabajo de mantenimiento | Repuestos y pañol | Herramientas | Instrumentos y calibraciones ᵖᵃʳ | Monitoreo de condición y rutas ᵖᵃʳ |
|---|---|---|---|---|---|
| 02 Gerente/a de operaciones | C | · | · | · | · |
| 03 Gerente/a o jefe/a de planta | CAs<sub>pl</sub> | · | · | · | · |
| 05 Analista de control de gestión industrial | C | · | · | · | · |
| 06 Jefe/a de producción | CCr<sub>pl</sub> | · | · | · | · |
| 07 Supervisor/a de turno | CCr<sub>ln</sub> | · | · | · | · |
| 08 Líder o encargado/a de línea | CCr<sub>ln</sub> | · | · | · | · |
| 09 Operador/a de máquina o proceso | CCr<sub>pr</sub> | · | · | · | · |
| 10 Operador/a de CNC | CCr<sub>pr</sub> | · | CR<sub>pl</sub> | · | · |
| 11 Armador/a o ensamblador/a | CCr<sub>pr</sub> | · | · | · | · |
| 12 Operador/a de envasado, etiquetado y embalaje | CCr<sub>pr</sub> | · | · | · | · |
| 13 Operador/a de sala de control | CCr<sub>pl</sub> | · | · | · | · |
| 14 Operador/a de montacargas o grúa horquilla | CCr<sub>pr</sub> | · | · | · | · |
| 15 Auxiliar de producción / apoyo de línea | CCr<sub>pr</sub> | · | · | · | · |
| 18 Ingeniero/a de automatización y control | CR<sub>pl</sub> | CS<sub>pl</sub> | C<sub>pl</sub> | · | · |
| 19 Programador/a de PLC/HMI | CR<sub>pl</sub> | · | · | · | · |
| 20 Técnico/a de instrumentación y calibración | C<sub>pl</sub> RCi<sub>pr</sub> | CS<sub>pl</sub> | CE<sub>pl</sub> | CRE<sub>pl</sub> | · |
| 23 Jefe/a de mantenimiento | CCrAsApCiX<sub>pl</sub> | CEAp<sub>pl</sub> | CE<sub>pl</sub> | C<sub>pl</sub> | C<sub>pl</sub> |
| 24 Planificador/a o programador/a de mantenimiento | CCrAsE<sub>pl</sub> | CS<sub>pl</sub> | C<sub>pl</sub> | · | · |
| 25 Supervisor/a de mantenimiento | CCrAsApCi<sub>eq</sub> | CE<sub>pl</sub> | CE<sub>pl</sub> | · | · |
| 26 Técnico/a mecánico/a industrial | CCr<sub>pl</sub> RCi<sub>pr</sub> | CS<sub>pl</sub> | CR<sub>pl</sub> | · | · |
| 27 Técnico/a eléctrico/a industrial | CCr<sub>pl</sub> RCi<sub>pr</sub> | CS<sub>pl</sub> | CR<sub>pl</sub> | · | · |
| 28 Técnico/a electromecánico/a | CCr<sub>pl</sub> RCi<sub>pr</sub> | CS<sub>pl</sub> | CR<sub>pl</sub> | · | · |
| 29 Técnico/a de lubricación o confiabilidad | CCr<sub>pl</sub> RCi<sub>pr</sub> | CS<sub>pl</sub> | · | · | CR<sub>pl</sub> |
| 30 Encargado/a de repuestos y pañol | C<sub>pl</sub> | CREAp<sub>pl</sub> | CRE<sub>pl</sub> | · | · |
| 31 Jefe/a o gerente de calidad | · | · | · | C<sub>pl</sub> | · |
| 33 Inspector/a o técnico/a de control de calidad | · | · | C<sub>pl</sub> | C<sub>pl</sub> | · |
| 34 Laboratorista / analista de ensayos | · | · | · | C<sub>pl</sub> | · |
| 35 Especialista en metrología | C<sub>pl</sub> RCi<sub>pr</sub> | · | CE<sub>pl</sub> | CRE<sub>pl</sub> | · |
| 36 Planificador/a de producción (PPC) | C<sub>pl</sub> | · | · | · | · |
| 38 Comprador/a de materias primas y suministros | · | C<sub>pl</sub> | · | · | · |
| 43 Analista de inventarios / logística | · | CX<sub>pl</sub> | · | · | · |
| 50 Profesional o encargado/a de prevención de riesgos | C<sub>pl</sub> | · | · | · | · |
| 57 Analista de costos industriales | · | C<sub>pl</sub> | · | · | · |

## Automatización

| Cargo | Controladores PLC y cambios de programa | Mandos a distancia a PLC | SIMA PLC Simulator |
|---|---|---|---|
| 03 Gerente/a o jefe/a de planta | CAp<sub>pl</sub> | C<sub>pl</sub> | · |
| 06 Jefe/a de producción | · | C<sub>pl</sub> | · |
| 07 Supervisor/a de turno | · | C<sub>ln</sub> | · |
| 08 Líder o encargado/a de línea | · | C<sub>ln</sub> | · |
| 13 Operador/a de sala de control | C<sub>pl</sub> | · | · |
| 16 Ingeniero/a de procesos | C<sub>pl</sub> | · | · |
| 18 Ingeniero/a de automatización y control | CSE<sub>pl</sub> | CR<sub>pl</sub> | CR<sub>pl</sub> |
| 19 Programador/a de PLC/HMI | CS<sub>pl</sub> | CR<sub>pl</sub> | CR<sub>pl</sub> |
| 20 Técnico/a de instrumentación y calibración | C<sub>pl</sub> | · | · |
| 22 Especialista de sistemas industriales (OT/MES) | CE<sub>pl</sub> | CR<sub>pl</sub> | C<sub>pl</sub> |
| 23 Jefe/a de mantenimiento | CAp<sub>pl</sub> | CR<sub>pl</sub> | · |
| 25 Supervisor/a de mantenimiento | C<sub>pl</sub> | CR<sub>pl</sub> | · |
| 26 Técnico/a mecánico/a industrial | C<sub>pl</sub> | · | · |
| 27 Técnico/a eléctrico/a industrial | C<sub>pl</sub> | · | · |
| 28 Técnico/a electromecánico/a | C<sub>pl</sub> | · | · |

## Calidad

| Cargo | No conformidades y lotes | Inspecciones, ensayos y planes de control ᴾ |
|---|---|---|
| 01 Director/a general o gerente general | C | · |
| 02 Gerente/a de operaciones | C | · |
| 03 Gerente/a o jefe/a de planta | C<sub>pl</sub> | · |
| 05 Analista de control de gestión industrial | C | · |
| 06 Jefe/a de producción | C<sub>pl</sub> | · |
| 07 Supervisor/a de turno | CR<sub>ln</sub> | · |
| 08 Líder o encargado/a de línea | CR<sub>ln</sub> | · |
| 10 Operador/a de CNC | · | R<sub>pr</sub> |
| 12 Operador/a de envasado, etiquetado y embalaje | C<sub>pr</sub> | · |
| 16 Ingeniero/a de procesos | C<sub>pl</sub> | · |
| 17 Ingeniero/a industrial o de mejora continua | C<sub>pl</sub> | · |
| 31 Jefe/a o gerente de calidad | CCrApCiX<sub>pl</sub> | C<sub>pl</sub> |
| 32 Ingeniero/a de calidad | CRE<sub>pl</sub> | CCrE<sub>pl</sub> |
| 33 Inspector/a o técnico/a de control de calidad | CCrR<sub>pl</sub> | CR<sub>pl</sub> |
| 34 Laboratorista / analista de ensayos | CR<sub>pl</sub> | CR<sub>pl</sub> |
| 35 Especialista en metrología | C<sub>pl</sub> | · |
| 39 Encargado/a de recepción de materiales | C<sub>pl</sub> | · |
| 42 Coordinador/a de despacho y transporte | C<sub>pl</sub> | · |
| 61 Gerente/a comercial o ejecutivo/a de cuentas | C | · |
| 62 Servicio al cliente / gestión de pedidos | C | · |
| 63 Diseñador/a de producto o ingeniería de producto | C | · |
| 64 Responsable de desarrollo de proveedores | C | · |

## SST y ambiente

| Cargo | Incidentes y acciones de seguridad | Matriz de riesgos e inspecciones de seguridad ᴾ | Residuos, consumos y permisos ambientales ᴾ | Plan de emergencia, brigada y simulacros ᴾ |
|---|---|---|---|---|
| 01 Director/a general o gerente general | C | · | · | · |
| 02 Gerente/a de operaciones | C | · | · | · |
| 03 Gerente/a o jefe/a de planta | CApCi<sub>pl</sub> | · | · | · |
| 06 Jefe/a de producción | C<sub>pl</sub> | · | · | · |
| 07 Supervisor/a de turno | CR<sub>eq</sub> | · | · | · |
| 08 Líder o encargado/a de línea | R<sub>pr</sub> | · | · | · |
| 09 Operador/a de máquina o proceso | R<sub>pr</sub> | · | · | · |
| 10 Operador/a de CNC | R<sub>pr</sub> | · | · | · |
| 11 Armador/a o ensamblador/a | R<sub>pr</sub> | · | · | · |
| 12 Operador/a de envasado, etiquetado y embalaje | R<sub>pr</sub> | · | · | · |
| 13 Operador/a de sala de control | R<sub>pr</sub> | · | · | · |
| 14 Operador/a de montacargas o grúa horquilla | R<sub>pr</sub> | · | · | · |
| 15 Auxiliar de producción / apoyo de línea | R<sub>pr</sub> | · | · | · |
| 23 Jefe/a de mantenimiento | C<sub>ar</sub> | · | · | · |
| 25 Supervisor/a de mantenimiento | CR<sub>ar</sub> | · | · | · |
| 26 Técnico/a mecánico/a industrial | R<sub>pr</sub> | · | · | · |
| 27 Técnico/a eléctrico/a industrial | R<sub>pr</sub> | · | · | · |
| 28 Técnico/a electromecánico/a | R<sub>pr</sub> | · | · | · |
| 29 Técnico/a de lubricación o confiabilidad | R<sub>pr</sub> | · | · | · |
| 30 Encargado/a de repuestos y pañol | R<sub>pr</sub> | · | · | · |
| 33 Inspector/a o técnico/a de control de calidad | R<sub>pr</sub> | · | · | · |
| 34 Laboratorista / analista de ensayos | R<sub>pr</sub> | · | · | · |
| 39 Encargado/a de recepción de materiales | R<sub>pr</sub> | · | · | · |
| 40 Jefe/a de bodega o almacén | R<sub>pr</sub> | · | · | · |
| 41 Bodeguero/a o preparador/a de pedidos | R<sub>pr</sub> | · | · | · |
| 44 Jefe/a de recursos humanos / personas | C<sub>ag</sub> | · | · | · |
| 48 Especialista en relaciones laborales y bienestar | C<sub>ag</sub> | · | · | · |
| 50 Profesional o encargado/a de prevención de riesgos | CRApCiX<sub>pl</sub> | CCrE<sub>pl</sub> | · | CE<sub>pl</sub> |
| 51 Integrantes del comité paritario / delegado SST | CR<sub>pl</sub> | CR<sub>pl</sub> | · | · |
| 52 Responsable de medioambiente | CR<sub>pl</sub> | · | CCrRE<sub>pl</sub> | · |
| 53 Encargado/a de salud ocupacional y ergonomía | C<sub>pl</sub> | CR<sub>pl</sub> | · | · |
| 54 Equipo de respuesta a emergencias / brigada | CR<sub>pl</sub> | · | · | CR<sub>pl</sub> |
| 60 Encargado/a de servicios generales y contratistas | R<sub>pr</sub> | · | · | · |

## Gestión

| Cargo | Indicadores | Presupuesto y flujo de caja ᴾ | Costos industriales ᴾ | Proyectos industriales y de mejora ᴾ | Gestión documental ᵖᵃʳ | Servicios generales y contratistas ᴾ |
|---|---|---|---|---|---|---|
| 01 Director/a general o gerente general | CX | CAp | C | CAp | · | · |
| 02 Gerente/a de operaciones | CX | · | C | CAp | · | · |
| 03 Gerente/a o jefe/a de planta | CX<sub>pl</sub> | C<sub>pl</sub> | C<sub>pl</sub> | · | · | · |
| 04 Jefe/a de administración de planta | C<sub>pl</sub> | C<sub>pl</sub> | · | · | CCrE<sub>pl</sub> | CCrEAp<sub>pl</sub> |
| 05 Analista de control de gestión industrial | CCrX | C | C | · | · | · |
| 06 Jefe/a de producción | C<sub>pl</sub> | · | · | · | · | · |
| 07 Supervisor/a de turno | C<sub>eq</sub> | · | · | · | · | · |
| 10 Operador/a de CNC | · | · | · | · | C<sub>pr</sub> | · |
| 11 Armador/a o ensamblador/a | · | · | · | · | C<sub>pr</sub> | · |
| 16 Ingeniero/a de procesos | C<sub>pl</sub> | · | · | CCrE<sub>pl</sub> | CCrE<sub>pl</sub> | · |
| 17 Ingeniero/a industrial o de mejora continua | CX<sub>pl</sub> | · | C<sub>ag</sub> | CCrECi<sub>pl</sub> | C<sub>pl</sub> | · |
| 18 Ingeniero/a de automatización y control | C<sub>pl</sub> | · | · | · | CCrE<sub>pl</sub> | · |
| 19 Programador/a de PLC/HMI | · | · | · | · | CCr<sub>pl</sub> | · |
| 21 Ingeniero/a de proyectos industriales | C<sub>pl</sub> | C<sub>pl</sub> | · | CCrECi<sub>pl</sub> | CCrE<sub>pl</sub> | · |
| 23 Jefe/a de mantenimiento | CX<sub>pl</sub> | · | C<sub>ar</sub> | · | · | · |
| 24 Planificador/a o programador/a de mantenimiento | C<sub>ar</sub> | · | · | · | · | · |
| 25 Supervisor/a de mantenimiento | C<sub>ar</sub> | · | · | · | · | · |
| 26 Técnico/a mecánico/a industrial | · | · | · | · | C<sub>pl</sub> | · |
| 27 Técnico/a eléctrico/a industrial | · | · | · | · | C<sub>pl</sub> | · |
| 28 Técnico/a electromecánico/a | · | · | · | · | C<sub>pl</sub> | · |
| 31 Jefe/a o gerente de calidad | C<sub>pl</sub> | · | · | · | CAp<sub>pl</sub> | · |
| 32 Ingeniero/a de calidad | C<sub>pl</sub> | · | · | · | CCr<sub>pl</sub> | · |
| 36 Planificador/a de producción (PPC) | C<sub>pl</sub> | · | · | · | · | · |
| 38 Comprador/a de materias primas y suministros | · | C<sub>ar</sub> | · | · | · | · |
| 42 Coordinador/a de despacho y transporte | C<sub>ar</sub> | · | · | · | · | · |
| 43 Analista de inventarios / logística | · | · | C<sub>ag</sub> | · | · | · |
| 44 Jefe/a de recursos humanos / personas | C<sub>ag</sub> | · | · | · | · | · |
| 49 Asistente administrativo/a de personal | · | · | · | · | CCr | · |
| 52 Responsable de medioambiente | · | · | · | · | · | C<sub>pl</sub> |
| 55 Gerente/a financiero/a o jefe/a de finanzas | C | CCrEAp | C | · | · | · |
| 56 Contador/a y analista contable | · | C | C | · | · | · |
| 57 Analista de costos industriales | C | · | CCrEX | · | · | · |
| 60 Encargado/a de servicios generales y contratistas | · | · | · | · | · | CCrRE<sub>pl</sub> |
| 61 Gerente/a comercial o ejecutivo/a de cuentas | C<sub>ag</sub> | · | · | · | · | · |
| 63 Diseñador/a de producto o ingeniería de producto | · | · | · | · | CCrE | · |

## Sistemas

| Cargo | Mesa de ayuda TI ᴾ | Auditoría | Permisos por cargo |
|---|---|---|---|
| 01 Director/a general o gerente general | · | C | CE |
| 02 Gerente/a de operaciones | · | · | C |
| 03 Gerente/a o jefe/a de planta | · | · | C |
| 22 Especialista de sistemas industriales (OT/MES) | CCr<sub>pl</sub> | C<sub>pl</sub> | · |
| 44 Jefe/a de recursos humanos / personas | · | C | C |
| 55 Gerente/a financiero/a o jefe/a de finanzas | · | C | C |
| 59 Soporte TI / ERP | CCrECi | C | CE |

ᴾ módulo propuesto (no existe todavía) · ᵖᵃʳ módulo parcial

## Aplicaciones por cargo

| Cargo | Canal (Excel) | Web | Desktop | Simulador |
|---|---|---|---|---|
| 01 Director/a general o gerente general | web | ✔ | — | — |
| 02 Gerente/a de operaciones | web | ✔ | — | — |
| 03 Gerente/a o jefe/a de planta | web | ✔ | ✔ | — |
| 04 Jefe/a de administración de planta | web | ✔ | — | — |
| 05 Analista de control de gestión industrial | web | ✔ | — | — |
| 06 Jefe/a de producción | web | ✔ | ✔ | — |
| 07 Supervisor/a de turno | app | — | ✔ | — |
| 08 Líder o encargado/a de línea | app | — | ✔ | — |
| 09 Operador/a de máquina o proceso | app | — | ✔ | — |
| 10 Operador/a de CNC | app | — | ✔ | — |
| 11 Armador/a o ensamblador/a | app | — | ✔ | — |
| 12 Operador/a de envasado, etiquetado y embalaje | app | — | ✔ | — |
| 13 Operador/a de sala de control | app | — | ✔ | — |
| 14 Operador/a de montacargas o grúa horquilla | app | — | ✔ | — |
| 15 Auxiliar de producción / apoyo de línea | app | — | ✔ | — |
| 16 Ingeniero/a de procesos | web | ✔ | — | — |
| 17 Ingeniero/a industrial o de mejora continua | web | ✔ | — | — |
| 18 Ingeniero/a de automatización y control | app | ✔ | ✔ | CR<sub>pl</sub> |
| 19 Programador/a de PLC/HMI | app | — | ✔ | CR<sub>pl</sub> |
| 20 Técnico/a de instrumentación y calibración | app | — | ✔ | — |
| 21 Ingeniero/a de proyectos industriales | web | ✔ | — | — |
| 22 Especialista de sistemas industriales (OT/MES) | app | ✔ | ✔ | C<sub>pl</sub> |
| 23 Jefe/a de mantenimiento | app | ✔ | ✔ | — |
| 24 Planificador/a o programador/a de mantenimiento | app | — | ✔ | — |
| 25 Supervisor/a de mantenimiento | app | — | ✔ | — |
| 26 Técnico/a mecánico/a industrial | app | — | ✔ | — |
| 27 Técnico/a eléctrico/a industrial | app | — | ✔ | — |
| 28 Técnico/a electromecánico/a | app | — | ✔ | — |
| 29 Técnico/a de lubricación o confiabilidad | app | — | ✔ | — |
| 30 Encargado/a de repuestos y pañol | app | — | ✔ | — |
| 31 Jefe/a o gerente de calidad | web | ✔ | — | — |
| 32 Ingeniero/a de calidad | web | ✔ | — | — |
| 33 Inspector/a o técnico/a de control de calidad | app | — | ✔ | — |
| 34 Laboratorista / analista de ensayos | app | — | ✔ | — |
| 35 Especialista en metrología | app | — | ✔ | — |
| 36 Planificador/a de producción (PPC) | web | ✔ | — | — |
| 37 Planificador/a de materiales (MRP) | web | ✔ | — | — |
| 38 Comprador/a de materias primas y suministros | web | ✔ | — | — |
| 39 Encargado/a de recepción de materiales | app | — | ✔ | — |
| 40 Jefe/a de bodega o almacén | app | — | ✔ | — |
| 41 Bodeguero/a o preparador/a de pedidos | app | — | ✔ | — |
| 42 Coordinador/a de despacho y transporte | web | ✔ | — | — |
| 43 Analista de inventarios / logística | web | ✔ | — | — |
| 44 Jefe/a de recursos humanos / personas | web | ✔ | — | — |
| 45 Reclutador/a y analista de selección | web | ✔ | — | — |
| 46 Analista de remuneraciones y asistencia | web | ✔ | — | — |
| 47 Encargado/a de capacitación y desarrollo | web | ✔ | — | — |
| 48 Especialista en relaciones laborales y bienestar | web | ✔ | — | — |
| 49 Asistente administrativo/a de personal | web | ✔ | — | — |
| 50 Profesional o encargado/a de prevención de riesgos | app | ✔ | ✔ | — |
| 51 Integrantes del comité paritario / delegado SST | app | — | ✔ | — |
| 52 Responsable de medioambiente | app | — | ✔ | — |
| 53 Encargado/a de salud ocupacional y ergonomía | app | — | ✔ | — |
| 54 Equipo de respuesta a emergencias / brigada | app | — | ✔ | — |
| 55 Gerente/a financiero/a o jefe/a de finanzas | web | ✔ | — | — |
| 56 Contador/a y analista contable | web | ✔ | — | — |
| 57 Analista de costos industriales | web | ✔ | — | — |
| 58 Tesorería / cuentas por pagar y cobrar | web | ✔ | — | — |
| 59 Soporte TI / ERP | web | ✔ | — | — |
| 60 Encargado/a de servicios generales y contratistas | web | ✔ | — | — |
| 61 Gerente/a comercial o ejecutivo/a de cuentas | web | ✔ | — | — |
| 62 Servicio al cliente / gestión de pedidos | web | ✔ | — | — |
| 63 Diseñador/a de producto o ingeniería de producto | web | ✔ | — | — |
| 64 Responsable de desarrollo de proveedores | web | ✔ | — | — |

## Lo que cada cargo no debe ver

- **01 Director/a general o gerente general:** Liquidaciones individuales, datos bancarios, domicilio o salud de trabajadores, ni formularios operativos de terreno. No necesita editar fichas, OT ni parámetros de máquina.
- **02 Gerente/a de operaciones:** Datos personales, contratos individuales y liquidaciones. No ejecuta OT ni registra producción.
- **03 Gerente/a o jefe/a de planta:** Liquidaciones individuales y datos bancarios. Ve dotación y contratos solo para gestionar la planta.
- **04 Jefe/a de administración de planta:** Parámetros técnicos de máquinas, programas PLC y OT técnicas. No edita fichas personales.
- **05 Analista de control de gestión industrial:** Liquidaciones individuales, datos personales y contratos. No modifica registros operativos de las áreas.
- **06 Jefe/a de producción:** Remuneraciones, contratos y datos personales del personal. No ejecuta ni cierra OT técnicas.
- **07 Supervisor/a de turno:** Sueldos, contratos y datos personales de su equipo. Ve solo a las personas de su turno.
- **08 Líder o encargado/a de línea:** Datos personales, contratos y sueldos. Ve solo su línea.
- **09 Operador/a de máquina o proceso:** Información de otras personas (salvo nombre y cargo), sueldos, contratos, programas PLC y parámetros críticos. No modifica parámetros de máquina.
- **10 Operador/a de CNC:** Datos de otras personas, sueldos, programas en edición. No edita el programa CNC.
- **11 Armador/a o ensamblador/a:** Información de otras personas, sueldos y contratos.
- **12 Operador/a de envasado, etiquetado y embalaje:** Información de otras personas, sueldos y contratos; datos comerciales del pedido más allá de la especificación.
- **13 Operador/a de sala de control:** Programas PLC en edición, datos de personas, sueldos. No cambia parámetros de proceso fuera de lo autorizado.
- **14 Operador/a de montacargas o grúa horquilla:** Información de otras personas, sueldos, contratos.
- **15 Auxiliar de producción / apoyo de línea:** Información de otras personas, producción detallada de otras líneas, sueldos.
- **16 Ingeniero/a de procesos:** Datos personales, contratos y sueldos. No cambia parámetros de PLC directamente.
- **17 Ingeniero/a industrial o de mejora continua:** Datos personales y sueldos individuales.
- **18 Ingeniero/a de automatización y control:** Datos personales, contratos, sueldos. No aprueba sus propios cambios.
- **19 Programador/a de PLC/HMI:** Datos personales, contratos, sueldos. No aprueba ni publica sus cambios.
- **20 Técnico/a de instrumentación y calibración:** Datos personales, contratos y sueldos; programas de PLC en edición.
- **21 Ingeniero/a de proyectos industriales:** Datos personales, contratos y sueldos.
- **22 Especialista de sistemas industriales (OT/MES):** Datos personales, contratos y sueldos.
- **23 Jefe/a de mantenimiento:** Sueldos y contratos del personal. Ve asistencia y habilitaciones solo de su equipo.
- **24 Planificador/a o programador/a de mantenimiento:** Sueldos y contratos. No firma la ejecución técnica de las OT.
- **25 Supervisor/a de mantenimiento:** Sueldos, contratos y datos personales de los técnicos más allá de lo operativo.
- **26 Técnico/a mecánico/a industrial:** Contratos, sueldos y datos personales de otros. No ve OT eléctricas que no le correspondan salvo para consultar.
- **27 Técnico/a eléctrico/a industrial:** Contratos, sueldos y datos personales de otros.
- **28 Técnico/a electromecánico/a:** Contratos, sueldos y datos personales de otros.
- **29 Técnico/a de lubricación o confiabilidad:** Datos personales, sueldos. No cambia parámetros de máquina.
- **30 Encargado/a de repuestos y pañol:** Nóminas, datos bancarios, contratos.
- **31 Jefe/a o gerente de calidad:** Sueldos, contratos y datos personales.
- **32 Ingeniero/a de calidad:** Sueldos, contratos y datos personales.
- **33 Inspector/a o técnico/a de control de calidad:** Sueldos, contratos y datos personales.
- **34 Laboratorista / analista de ensayos:** Sueldos, contratos y datos personales.
- **35 Especialista en metrología:** Sueldos, contratos y datos personales.
- **36 Planificador/a de producción (PPC):** Datos personales, sueldos y contratos.
- **37 Planificador/a de materiales (MRP):** Datos personales, sueldos y contratos.
- **38 Comprador/a de materias primas y suministros:** Datos personales, sueldos y contratos laborales.
- **39 Encargado/a de recepción de materiales:** Precios de compra, datos personales, sueldos.
- **40 Jefe/a de bodega o almacén:** Sueldos, contratos y datos personales del equipo más allá de lo operativo.
- **41 Bodeguero/a o preparador/a de pedidos:** Precios, datos personales, sueldos.
- **42 Coordinador/a de despacho y transporte:** Datos personales, sueldos, costos de producción.
- **43 Analista de inventarios / logística:** Datos personales, sueldos.
- **44 Jefe/a de recursos humanos / personas:** Parámetros de PLC, OT técnicas, programas de máquina. Ve remuneraciones pero no las edita (las prepara el analista de remuneraciones).
- **45 Reclutador/a y analista de selección:** Remuneraciones de los trabajadores actuales, datos bancarios.
- **46 Analista de remuneraciones y asistencia:** Información técnica de planta. No aprueba su propio cierre.
- **47 Encargado/a de capacitación y desarrollo:** Sueldos, contratos y datos bancarios.
- **48 Especialista en relaciones laborales y bienestar:** Sueldos individuales, datos bancarios, información técnica.
- **49 Asistente administrativo/a de personal:** Remuneraciones individuales (salvo que lo autorice RR. HH.), información técnica.
- **50 Profesional o encargado/a de prevención de riesgos:** Datos médicos individuales, sueldos, contratos.
- **51 Integrantes del comité paritario / delegado SST:** Datos personales y médicos, sueldos.
- **52 Responsable de medioambiente:** Datos personales, sueldos.
- **53 Encargado/a de salud ocupacional y ergonomía:** Diagnósticos médicos individuales en SIMA; sueldos.
- **54 Equipo de respuesta a emergencias / brigada:** Datos personales, sueldos.
- **55 Gerente/a financiero/a o jefe/a de finanzas:** Información técnica de planta, OT, PLC.
- **56 Contador/a y analista contable:** Datos personales más allá de lo necesario, información técnica.
- **57 Analista de costos industriales:** Remuneraciones individuales, datos personales.
- **58 Tesorería / cuentas por pagar y cobrar:** Información técnica, contratos (salvo lo necesario para pagar).
- **59 Soporte TI / ERP:** Remuneraciones, contratos, datos personales sensibles, información financiera. No debe recibirlos por compartir perfil con finanzas.
- **60 Encargado/a de servicios generales y contratistas:** Información financiera, remuneraciones, datos personales.
- **61 Gerente/a comercial o ejecutivo/a de cuentas:** Costos detallados, remuneraciones, datos personales, información técnica de planta.
- **62 Servicio al cliente / gestión de pedidos:** Costos, remuneraciones, datos personales.
- **63 Diseñador/a de producto o ingeniería de producto:** Costos detallados, remuneraciones, datos personales.
- **64 Responsable de desarrollo de proveedores:** Datos personales, remuneraciones.

## Diferencias con la matriz anterior del servidor (v6)

La matriz de fábrica v7 se genera de este catálogo (`PermisosCatalogo.g.cs`), así que coincide con la propuesta. Esta sección conserva, como registro, lo que cambió respecto de la v6 (reglas por perfil de `Permisos.cs`, foto en `datos/matriz_v6.json`). Se comparan recursos (no alcances). «Falta»: la propuesta lo da y el servidor no. «Sobra»: el servidor lo da y la ficha del cargo no lo justifica.

- **01 Director/a general o gerente general:** sobra herramientas, OT, plc, repuestos, terminos, traspaso
- **02 Gerente/a de operaciones:** sobra herramientas, plc, repuestos, terminos, traspaso
- **03 Gerente/a o jefe/a de planta:** falta plc_comandos; sobra herramientas, repuestos
- **04 Jefe/a de administración de planta:** sobra despachos, herramientas, OT, repuestos
- **05 Analista de control de gestión industrial:** falta calidad; sobra herramientas, repuestos
- **06 Jefe/a de producción:** falta asistencia, habilitaciones, sst; sobra despachos, herramientas, plc, repuestos
- **07 Supervisor/a de turno:** sobra herramientas, plc, repuestos
- **08 Líder o encargado/a de línea:** sobra asistencia, herramientas, kpis, plc, repuestos, sst
- **09 Operador/a de máquina o proceso:** sobra herramientas, OT, plc, repuestos
- **10 Operador/a de CNC:** sobra OT, plc, repuestos
- **11 Armador/a o ensamblador/a:** sobra herramientas, OT, plc, repuestos
- **12 Operador/a de envasado, etiquetado y embalaje:** falta calidad, despachos; sobra herramientas, OT, plc, repuestos
- **13 Operador/a de sala de control:** falta traspaso; sobra herramientas, produccion, repuestos
- **14 Operador/a de montacargas o grúa horquilla:** sobra herramientas, OT, plc, produccion, repuestos
- **15 Auxiliar de producción / apoyo de línea:** sobra herramientas, OT, plc, repuestos
- **16 Ingeniero/a de procesos:** sobra despachos, herramientas, OT, repuestos
- **17 Ingeniero/a industrial o de mejora continua:** sobra despachos, herramientas, OT, plc, repuestos, traspaso
- **19 Programador/a de PLC/HMI:** sobra herramientas, kpis, repuestos
- **21 Ingeniero/a de proyectos industriales:** falta edición de equipos; sobra calidad, despachos, herramientas, OT, plc, produccion, repuestos, traspaso
- **22 Especialista de sistemas industriales (OT/MES):** falta auditoria; sobra herramientas, kpis, OT, repuestos
- **23 Jefe/a de mantenimiento:** falta produccion
- **24 Planificador/a o programador/a de mantenimiento:** sobra plc, sst
- **29 Técnico/a de lubricación o confiabilidad:** sobra herramientas, kpis, plc
- **31 Jefe/a o gerente de calidad:** sobra herramientas, OT, repuestos
- **32 Ingeniero/a de calidad:** sobra despachos, herramientas, OT, repuestos
- **33 Inspector/a o técnico/a de control de calidad:** sobra OT, repuestos
- **34 Laboratorista / analista de ensayos:** sobra herramientas, OT, repuestos
- **35 Especialista en metrología:** falta calidad; sobra plc, repuestos
- **36 Planificador/a de producción (PPC):** sobra calidad, despachos, herramientas, plc, repuestos, traspaso
- **37 Planificador/a de materiales (MRP):** sobra calidad, despachos, herramientas, kpis, OT, plc, repuestos, traspaso
- **38 Comprador/a de materias primas y suministros:** sobra calidad, herramientas, OT, produccion
- **39 Encargado/a de recepción de materiales:** falta calidad; sobra herramientas, OT, repuestos
- **40 Jefe/a de bodega o almacén:** falta asistencia, despachos, habilitaciones; sobra herramientas, OT, repuestos
- **41 Bodeguero/a o preparador/a de pedidos:** falta despachos; sobra herramientas, OT, repuestos
- **42 Coordinador/a de despacho y transporte:** falta kpis; sobra herramientas, OT, produccion, repuestos
- **43 Analista de inventarios / logística:** sobra calidad, herramientas, OT, produccion
- **44 Jefe/a de recursos humanos / personas:** falta kpis; sobra herramientas, OT, repuestos
- **45 Reclutador/a y analista de selección:** falta habilitaciones; sobra herramientas, OT, repuestos
- **46 Analista de remuneraciones y asistencia:** sobra herramientas, OT, repuestos
- **47 Encargado/a de capacitación y desarrollo:** sobra herramientas, OT, repuestos
- **48 Especialista en relaciones laborales y bienestar:** sobra herramientas, OT, repuestos
- **49 Asistente administrativo/a de personal:** sobra herramientas, OT, repuestos
- **50 Profesional o encargado/a de prevención de riesgos:** sobra herramientas, repuestos
- **51 Integrantes del comité paritario / delegado SST:** sobra herramientas, OT, repuestos
- **52 Responsable de medioambiente:** sobra herramientas, OT, repuestos
- **53 Encargado/a de salud ocupacional y ergonomía:** falta asistencia; sobra herramientas, OT, repuestos
- **54 Equipo de respuesta a emergencias / brigada:** sobra herramientas, OT, repuestos
- **55 Gerente/a financiero/a o jefe/a de finanzas:** sobra despachos, herramientas, OT, repuestos
- **56 Contador/a y analista contable:** sobra despachos, herramientas, kpis, OT, personal, repuestos
- **57 Analista de costos industriales:** sobra despachos, herramientas, OT
- **58 Tesorería / cuentas por pagar y cobrar:** sobra despachos, herramientas, kpis, OT, repuestos
- **59 Soporte TI / ERP:** sobra herramientas, OT, repuestos
- **60 Encargado/a de servicios generales y contratistas:** sobra herramientas, OT, repuestos
- **61 Gerente/a comercial o ejecutivo/a de cuentas:** falta kpis; sobra herramientas, OT, repuestos
- **62 Servicio al cliente / gestión de pedidos:** sobra herramientas, OT, produccion, repuestos
- **63 Diseñador/a de producto o ingeniería de producto:** sobra despachos, herramientas, OT, produccion, repuestos
- **64 Responsable de desarrollo de proveedores:** sobra despachos, herramientas, OT, produccion, repuestos

Total: 22 accesos que faltan y 211 que sobran. La mayoría de los «sobra» vienen de reglas por perfil (por ejemplo, `repuestos.ver`, `herramientas.ver` y `ordenes.ver` se dan a los 18 perfiles, incluidos RR. HH., finanzas y comercial).
