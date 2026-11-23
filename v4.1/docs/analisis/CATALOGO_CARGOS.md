# Catálogo funcional de los 64 cargos

> Generado por `docs/analisis/generar.py` a partir de la hoja **Cargos** del Excel y de las fichas en `docs/analisis/cargos/`. No edite este archivo a mano.

**Cómo leer cada ficha.** **[E]** es texto literal del Excel. **[D]** es lo que se deduce razonablemente de las funciones del cargo. **[P]** es una propuesta de funcionalidad o diseño. **[V]** son decisiones que debe validar la empresa. «Hoy en SIMA 4.1» describe lo que el código realmente tiene, no lo que debería tener.

**Datos ficticios.** El Excel y la base de demostración son ficticios. Los indicadores marcados ⛔ no tienen fuente en SIMA: la interfaz debe mostrarlos como «sin datos», nunca con un valor inventado.

## Índice

- **1. Dirección y gobierno de la empresa:** [01 Director/a general o gerente general](#01--directora-general-o-gerente-general), [02 Gerente/a de operaciones](#02--gerentea-de-operaciones), [03 Gerente/a o jefe/a de planta](#03--gerentea-o-jefea-de-planta), [04 Jefe/a de administración de planta](#04--jefea-de-administración-de-planta), [05 Analista de control de gestión industrial](#05--analista-de-control-de-gestión-industrial)
- **2. Producción y operación en piso:** [06 Jefe/a de producción](#06--jefea-de-producción), [07 Supervisor/a de turno](#07--supervisora-de-turno), [08 Líder o encargado/a de línea](#08--líder-o-encargadoa-de-línea), [09 Operador/a de máquina o proceso](#09--operadora-de-máquina-o-proceso), [10 Operador/a de CNC](#10--operadora-de-cnc), [11 Armador/a o ensamblador/a](#11--armadora-o-ensambladora), [12 Operador/a de envasado, etiquetado y embalaje](#12--operadora-de-envasado-etiquetado-y-embalaje), [13 Operador/a de sala de control](#13--operadora-de-sala-de-control), [14 Operador/a de montacargas o grúa horquilla](#14--operadora-de-montacargas-o-grúa-horquilla), [15 Auxiliar de producción / apoyo de línea](#15--auxiliar-de-producción--apoyo-de-línea)
- **3. Ingeniería, procesos y automatización:** [16 Ingeniero/a de procesos](#16--ingenieroa-de-procesos), [17 Ingeniero/a industrial o de mejora continua](#17--ingenieroa-industrial-o-de-mejora-continua), [18 Ingeniero/a de automatización y control](#18--ingenieroa-de-automatización-y-control), [19 Programador/a de PLC/HMI](#19--programadora-de-plchmi), [20 Técnico/a de instrumentación y calibración](#20--técnicoa-de-instrumentación-y-calibración), [21 Ingeniero/a de proyectos industriales](#21--ingenieroa-de-proyectos-industriales), [22 Especialista de sistemas industriales (OT/MES)](#22--especialista-de-sistemas-industriales-otmes)
- **4. Mantenimiento y confiabilidad:** [23 Jefe/a de mantenimiento](#23--jefea-de-mantenimiento), [24 Planificador/a o programador/a de mantenimiento](#24--planificadora-o-programadora-de-mantenimiento), [25 Supervisor/a de mantenimiento](#25--supervisora-de-mantenimiento), [26 Técnico/a mecánico/a industrial](#26--técnicoa-mecánicoa-industrial), [27 Técnico/a eléctrico/a industrial](#27--técnicoa-eléctricoa-industrial), [28 Técnico/a electromecánico/a](#28--técnicoa-electromecánicoa), [29 Técnico/a de lubricación o confiabilidad](#29--técnicoa-de-lubricación-o-confiabilidad), [30 Encargado/a de repuestos y pañol](#30--encargadoa-de-repuestos-y-pañol)
- **5. Calidad, laboratorio y metrología:** [31 Jefe/a o gerente de calidad](#31--jefea-o-gerente-de-calidad), [32 Ingeniero/a de calidad](#32--ingenieroa-de-calidad), [33 Inspector/a o técnico/a de control de calidad](#33--inspectora-o-técnicoa-de-control-de-calidad), [34 Laboratorista / analista de ensayos](#34--laboratorista--analista-de-ensayos), [35 Especialista en metrología](#35--especialista-en-metrología)
- **6. Planificación, abastecimiento y logística:** [36 Planificador/a de producción (PPC)](#36--planificadora-de-producción-ppc), [37 Planificador/a de materiales (MRP)](#37--planificadora-de-materiales-mrp), [38 Comprador/a de materias primas y suministros](#38--compradora-de-materias-primas-y-suministros), [39 Encargado/a de recepción de materiales](#39--encargadoa-de-recepción-de-materiales), [40 Jefe/a de bodega o almacén](#40--jefea-de-bodega-o-almacén), [41 Bodeguero/a o preparador/a de pedidos](#41--bodegueroa-o-preparadora-de-pedidos), [42 Coordinador/a de despacho y transporte](#42--coordinadora-de-despacho-y-transporte), [43 Analista de inventarios / logística](#43--analista-de-inventarios--logística)
- **7. Personas, relaciones laborales y servicios:** [44 Jefe/a de recursos humanos / personas](#44--jefea-de-recursos-humanos--personas), [45 Reclutador/a y analista de selección](#45--reclutadora-y-analista-de-selección), [46 Analista de remuneraciones y asistencia](#46--analista-de-remuneraciones-y-asistencia), [47 Encargado/a de capacitación y desarrollo](#47--encargadoa-de-capacitación-y-desarrollo), [48 Especialista en relaciones laborales y bienestar](#48--especialista-en-relaciones-laborales-y-bienestar), [49 Asistente administrativo/a de personal](#49--asistente-administrativoa-de-personal)
- **8. Seguridad, salud y medioambiente:** [50 Profesional o encargado/a de prevención de riesgos](#50--profesional-o-encargadoa-de-prevención-de-riesgos), [51 Integrantes del comité paritario / delegado SST](#51--integrantes-del-comité-paritario--delegado-sst), [52 Responsable de medioambiente](#52--responsable-de-medioambiente), [53 Encargado/a de salud ocupacional y ergonomía](#53--encargadoa-de-salud-ocupacional-y-ergonomía), [54 Equipo de respuesta a emergencias / brigada](#54--equipo-de-respuesta-a-emergencias--brigada)
- **9. Finanzas, sistemas y apoyo administrativo:** [55 Gerente/a financiero/a o jefe/a de finanzas](#55--gerentea-financieroa-o-jefea-de-finanzas), [56 Contador/a y analista contable](#56--contadora-y-analista-contable), [57 Analista de costos industriales](#57--analista-de-costos-industriales), [58 Tesorería / cuentas por pagar y cobrar](#58--tesorería--cuentas-por-pagar-y-cobrar), [59 Soporte TI / ERP](#59--soporte-ti--erp), [60 Encargado/a de servicios generales y contratistas](#60--encargadoa-de-servicios-generales-y-contratistas)
- **10. Comercial, cliente y diseño de producto:** [61 Gerente/a comercial o ejecutivo/a de cuentas](#61--gerentea-comercial-o-ejecutivoa-de-cuentas), [62 Servicio al cliente / gestión de pedidos](#62--servicio-al-cliente--gestión-de-pedidos), [63 Diseñador/a de producto o ingeniería de producto](#63--diseñadora-de-producto-o-ingeniería-de-producto), [64 Responsable de desarrollo de proveedores](#64--responsable-de-desarrollo-de-proveedores)

## Familia 1 · Dirección y gobierno de la empresa

### 01 · Director/a general o gerente general

**Dashboard propuesto:** «Dirección general» · **Canal según el Excel:** web · **Perfil SIMA:** `gerencia` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Decide la estrategia, la inversión, las prioridades del negocio y los riesgos aceptables.
- **Qué hace:** Aprueba presupuestos y proyectos; revisa rentabilidad, clientes, seguridad y continuidad; resuelve conflictos de recursos entre áreas.
- **Qué entrega:** Plan estratégico, presupuesto anual y decisiones de inversión.
- **Se coordina con:** Gerencia de planta, finanzas, comercial, RR. HH. y directorio.
- **Cómo medir:** Margen operativo; cumplimiento del plan; incidentes graves.
- **Conocimientos:** Liderazgo, finanzas, gestión de riesgos y ética.
</details>

**A. Para qué existe [D].** Fija hacia dónde va la empresa y qué riesgos acepta. Sin este cargo las áreas compiten por recursos sin un criterio común y las inversiones se deciden por urgencia y no por estrategia.

**B. Jornada [D]**

1. *Al comenzar:* Revisa el tablero consolidado (seguridad, producción contra plan, calidad, caja) y la bandeja de decisiones que esperan su firma.
2. *Durante:* Revisa propuestas de inversión y presupuesto, y se reúne con gerencias de planta, finanzas y comercial.
3. *Al coordinarse:* Resuelve conflictos de prioridad entre áreas (un pedido urgente contra una detención programada, por ejemplo).
4. *Ante una anomalía:* Ante un incidente grave, una pérdida de un cliente clave o una desviación fuerte de caja, recibe el aviso, pide el informe de la gerencia responsable y decide medidas.
5. *Al cerrar:* Deja registradas sus decisiones y los compromisos asignados a cada gerencia.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Aprueba presupuestos, proyectos e inversiones sobre el límite de las gerencias, define qué riesgos se aceptan y resuelve conflictos de recursos entre áreas. *Escala a:* Directorio (inversiones mayores, riesgos legales o reputacionales).

**D. Información que consulta [D].** Indicadores consolidados por planta; Cumplimiento del plan de producción; Incidentes graves de seguridad; Reclamos y costos de no calidad; Presupuesto vs. real; Flujo de caja; Cartera de proyectos; Dotación agregada y ausentismo.

**E. Información que genera o modifica [D]**

- *Consultar:* Tableros consolidados de todas las áreas, solo en totales para remuneraciones.
- *Aprobar:* Presupuesto anual, proyectos de inversión y decisiones estratégicas registradas en la bandeja de aprobaciones.
- *Rechazar:* Propuestas devueltas con comentario a la gerencia que las envió.
- *Exportar:* Informe ejecutivo mensual para el directorio.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Liquidaciones individuales, datos bancarios, domicilio o salud de trabajadores, ni formularios operativos de terreno. No necesita editar fichas, OT ni parámetros de máquina.

**G. Impacto en la empresa [D].** Sus decisiones fijan presupuesto, prioridades y metas de todas las áreas. Una decisión demorada deja proyectos y compras detenidos; una mal priorizada traslada el costo a la operación.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Seguridad (incidentes graves), cumplimiento del plan, margen y caja, y las decisiones pendientes de su firma.
- *Distribución:* Franja de 4 indicadores (seguridad, plan, calidad, caja) · bandeja de decisiones · tendencia mensual por planta · riesgos abiertos · proyectos en curso.
- *Menú:* Inicio · Decisiones pendientes · Indicadores · Proyectos · Riesgos · Organización
- *Tablas y formularios:* Tablas: proyectos (monto, avance, estado), riesgos abiertos. Formularios: decisión con comentario (aprobar o rechazar).
- *Acciones rápidas:* Aprobar o rechazar una propuesta; Abrir el informe de un incidente grave; Exportar informe ejecutivo
- *Alertas:* Accidente con tiempo perdido; Desviación de presupuesto sobre el umbral; Proyecto atrasado; Reclamo de cliente clave
- *Notificaciones:* Nueva propuesta esperando su decisión; incidente grave registrado; cierre mensual disponible.
- *Estado vacío:* “No hay decisiones pendientes. Los indicadores se actualizan con los registros de cada área.”
- *Componentes especializados:* Tarjetas KPI con meta y tendencia, bandeja de aprobaciones, mapa de calor de riesgos.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Margen operativo | Ventas y costos (no existen en SIMA; vendrían del ERP o de los módulos de costos y comercial) | ⛔ sin fuente en SIMA |
| Cumplimiento del plan | Órdenes de producción (meta y unidades buenas) | 🟡 datos parciales |
| Incidentes graves | Incidentes SST por severidad | ✅ hay datos en SIMA |

**Flujo de información [D]**

- *Recibe:* Propuestas de presupuesto, inversión y proyectos de las gerencias; tableros consolidados.
- *Procesa:* Compara alternativas contra estrategia, caja y riesgo.
- *Produce:* Decisiones aprobadas o rechazadas, plan estratégico y presupuesto anual.
- *Destinatarios:* Gerencias de operaciones, planta, finanzas, comercial y RR. HH.; directorio.
- *Consecuencia:* Se liberan presupuestos y proyectos; cambian metas y prioridades de las áreas.

**Permisos propuestos [P]** · aplicaciones: Web

- Indicadores: consultar, exportar — empresa
- Órdenes y registros de producción: consultar — empresa
- No conformidades y lotes: consultar — empresa
- Incidentes y acciones de seguridad: consultar — empresa
- Despachos y transporte: consultar — empresa
- Remuneraciones: consultar — solo totales
- Fichas de personal: consultar — empresa
- Contratos: consultar — empresa
- Asistencia y ausentismo: consultar — empresa
- Habilitaciones y competencias: consultar — empresa
- Presupuesto y flujo de caja *(módulo propuesto)*: consultar, aprobar o rechazar — empresa
- Proyectos industriales y de mejora *(módulo propuesto)*: consultar, aprobar o rechazar — empresa
- Costos industriales *(módulo propuesto)*: consultar — empresa
- Pedidos y clientes *(módulo propuesto)*: consultar — empresa
- Auditoría: consultar — empresa
- Permisos por cargo: consultar, editar — empresa
- Cuentas de acceso SIMA: consultar — empresa
- Planta, áreas, líneas y equipos: consultar — empresa

**Por validar con la empresa [V].** Límite de monto que aprueba la gerencia general frente al directorio; Si debe seguir editando la matriz de permisos (hoy lo hace) o solo verla.

**Hoy en SIMA 4.1.** Inicio web por capacidades, indicadores, aprobaciones y auditoría. No hay presupuesto, proyectos, riesgos ni margen.

---

### 02 · Gerente/a de operaciones

**Dashboard propuesto:** «Operaciones» · **Canal según el Excel:** web · **Perfil SIMA:** `gerencia` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Convierte el plan de negocios en capacidad, productividad y servicio a los clientes para una o varias plantas.
- **Qué hace:** Define metas por planta, balancea capacidad, coordina inversiones operacionales y elimina cuellos de botella.
- **Qué entrega:** Plan operativo y tablero mensual de operaciones.
- **Se coordina con:** Gerentes de planta, supply chain, calidad y mantenimiento.
- **Cómo medir:** Productividad, OEE, OTIF, costo unitario.
- **Conocimientos:** Planificación industrial, mejora continua y liderazgo.
</details>

**A. Para qué existe [D].** Convierte el plan de negocio en capacidad productiva real. Evita que las plantas trabajen con metas desalineadas o con cuellos de botella que nadie atiende.

**B. Jornada [D]**

1. *Al comenzar:* Revisa productividad, OEE, OTIF y costo unitario por planta y detecta la que se aleja de su meta.
2. *Durante:* Balancea capacidad entre líneas o plantas, revisa inversiones operacionales y avance de mejoras.
3. *Al coordinarse:* Reúne a gerentes de planta, supply chain, calidad y mantenimiento en torno a los cuellos de botella.
4. *Ante una anomalía:* Si una planta cae bajo la meta o un pedido grande está en riesgo, pide el plan de recuperación y reasigna capacidad.
5. *Al cerrar:* Actualiza el tablero mensual de operaciones y los compromisos de cada planta.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Metas por planta, balance de capacidad y prioridad de inversiones operacionales dentro de su autoridad. *Escala a:* Gerencia general (inversiones fuera de presupuesto, cambios de compromiso con clientes).

**D. Información que consulta [D].** OEE y productividad por planta y línea; OTIF y pedidos en riesgo; Costo unitario; Backlog de mantenimiento crítico; Cuellos de botella (líneas con más detención); Proyectos de mejora y su beneficio.

**E. Información que genera o modifica [D]**

- *Crear:* Metas operativas por planta y período.
- *Editar:* Plan operativo mensual.
- *Aprobar:* Inversiones operacionales y planes de recuperación dentro de su límite.
- *Exportar:* Tablero mensual de operaciones.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Datos personales, contratos individuales y liquidaciones. No ejecuta OT ni registra producción.

**G. Impacto en la empresa [D].** Define la meta que cada planta persigue. Si el balance de capacidad es malo, hay sobretiempo en una línea y capacidad ociosa en otra, y se pierden entregas.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Plantas o líneas bajo meta, pedidos en riesgo de OTIF y cuellos de botella.
- *Distribución:* Comparativo por planta (OEE, plan, OTIF, costo) · ranking de detenciones por línea · metas del período · inversiones por aprobar.
- *Menú:* Inicio · Metas y plan operativo · Capacidad · Indicadores · Mejora continua · Aprobaciones
- *Tablas y formularios:* Tablas: metas por planta, líneas con más pérdida. Formularios: meta del período, aprobación de inversión.
- *Acciones rápidas:* Fijar meta de planta; Ver detalle de un cuello de botella; Aprobar plan de recuperación
- *Alertas:* OEE bajo meta dos semanas seguidas; Pedido con fecha comprometida en riesgo; Línea crítica detenida
- *Notificaciones:* Nueva propuesta de inversión operacional; planta reporta desviación de meta.
- *Estado vacío:* “Aún no hay metas para este período. Defina la meta de cada planta para comparar el avance.”
- *Componentes especializados:* Comparativo de barras por planta, cascada de pérdidas OEE, semáforos de meta.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Productividad | Unidades buenas por hora-persona (producción + asistencia) | 🟡 datos parciales |
| OEE | Registros de producción y detenciones por equipo | ✅ hay datos en SIMA |
| OTIF | Despachos con fecha comprometida y entrega | ✅ hay datos en SIMA |
| Costo unitario | Costos de producción (no existen en SIMA) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Plan de negocio y resultados de cada planta.
- *Procesa:* Compara capacidad con demanda y detecta cuellos de botella.
- *Produce:* Metas por planta, plan operativo y decisiones de balance.
- *Destinatarios:* Gerencias de planta, jefatura de producción, planificación y mantenimiento.
- *Consecuencia:* Cambian las metas y prioridades que ven los tableros de planta y producción.

**Permisos propuestos [P]** · aplicaciones: Web

- Indicadores: consultar, exportar — empresa
- Órdenes y registros de producción: consultar — empresa
- Programa de producción y capacidad *(módulo parcial)*: consultar, aprobar o rechazar — empresa
- No conformidades y lotes: consultar — empresa
- Órdenes de trabajo de mantenimiento: consultar — empresa
- Despachos y transporte: consultar — empresa
- Pedidos y clientes *(módulo propuesto)*: consultar — empresa
- Proyectos industriales y de mejora *(módulo propuesto)*: consultar, aprobar o rechazar — empresa
- Costos industriales *(módulo propuesto)*: consultar — empresa
- Incidentes y acciones de seguridad: consultar — empresa
- Fichas de personal: consultar — empresa
- Contratos: consultar — empresa
- Asistencia y ausentismo: consultar — empresa
- Habilitaciones y competencias: consultar — empresa
- Remuneraciones: consultar — solo totales
- Planta, áreas, líneas y equipos: consultar — empresa
- Permisos por cargo: consultar — empresa

**Por validar con la empresa [V].** Hay una sola planta en la base; confirmar si el módulo debe ser multiplanta desde el inicio; Límite de aprobación de inversiones operacionales.

**Hoy en SIMA 4.1.** Indicadores generales (OEE, plan, OTIF) y producción. No hay metas por planta, capacidad ni plan operativo.

---

### 03 · Gerente/a o jefe/a de planta

**Dashboard propuesto:** «Gerencia de planta» · **Canal según el Excel:** web · **Perfil SIMA:** `gerencia` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Responsable integral de personas, seguridad, producción, costos, calidad, activos y cumplimiento de una instalación.
- **Qué hace:** Realiza reuniones de desempeño; prioriza incidentes, mantenimiento y pedidos; gestiona dotación y presupuesto; verifica controles críticos.
- **Qué entrega:** Plan maestro de planta, presupuesto, actas de revisión y planes correctivos.
- **Se coordina con:** Todas las áreas internas, proveedores y clientes internos.
- **Cómo medir:** Seguridad, entrega a tiempo, costo por unidad, desperdicio, OEE.
- **Conocimientos:** Gestión de planta, decisiones bajo presión y coordinación.
</details>

**A. Para qué existe [D].** Responde por todo lo que ocurre dentro de la instalación. Es el punto donde seguridad, producción, mantenimiento, calidad y costos se priorizan juntos.

**B. Jornada [D]**

1. *Al comenzar:* Revisa incidentes del turno anterior, producción contra plan, equipos críticos detenidos y lotes retenidos.
2. *Durante:* Dirige la reunión diaria de desempeño, prioriza pedidos, detenciones y mantenimiento, y aprueba cambios de PLC y gastos de su nivel.
3. *Al coordinarse:* Con jefaturas de producción, mantenimiento, calidad, prevención y RR. HH.
4. *Ante una anomalía:* Ante un accidente, una falla de equipo crítico o un lote rechazado, decide prioridad y recursos y verifica que exista plan correctivo.
5. *Al cerrar:* Firma el acta de revisión y los compromisos del día siguiente.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Prioridad entre producción y mantenimiento, publicación de cambios de PLC solicitados por otros, gestión de incidentes SST y uso del presupuesto de la planta. *Escala a:* Gerencia de operaciones o general (dotación, inversiones, compromisos con clientes).

**D. Información que consulta [D].** Producción del día y del turno; Equipos críticos fuera de servicio; Backlog de mantenimiento; Lotes retenidos y no conformidades; Incidentes SST abiertos; Dotación y ausentismo del día; Costos de la planta.

**E. Información que genera o modifica [D]**

- *Aprobar:* Cambios de programa de PLC (control de cuatro ojos), cierre de investigaciones SST, prioridades de mantenimiento.
- *Editar:* Estructura de planta (áreas, líneas, equipos) y plan maestro de planta.
- *Registrar:* Acta de revisión diaria y planes correctivos.
- *Exportar:* Informe de planta.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Liquidaciones individuales y datos bancarios. Ve dotación y contratos solo para gestionar la planta.

**G. Impacto en la empresa [D].** Si no prioriza, producción y mantenimiento compiten por el mismo equipo y la seguridad queda en segundo lugar. Sus aprobaciones habilitan cambios técnicos en las máquinas.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Seguridad, equipos críticos detenidos, cumplimiento del día y aprobaciones pendientes.
- *Distribución:* Franja seguridad-producción-calidad-mantenimiento · mapa de planta en vivo · bandeja de aprobaciones · acta del día.
- *Menú:* Inicio · Planta en vivo · Producción · Mantenimiento · Calidad · Seguridad · Aprobaciones · Personas (agregado) · Estructura
- *Tablas y formularios:* Tablas: equipos críticos, NC abiertas, incidentes, backlog crítico. Formularios: acta de revisión, aprobación con comentario.
- *Acciones rápidas:* Aprobar cambio de PLC; Priorizar una OT; Abrir investigación SST; Registrar acta del día
- *Alertas:* Accidente o casi accidente; Equipo crítico en falla; Lote retenido; Cambio de PLC esperando aprobación
- *Notificaciones:* Nueva solicitud de cambio PLC; incidente SST reportado; lote retenido por calidad.
- *Estado vacío:* “Sin incidentes ni aprobaciones pendientes. La planta opera según el plan.”
- *Componentes especializados:* Mapa de planta animado, bandeja de aprobaciones, semáforos por área.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Seguridad | Incidentes SST (frecuencia y severidad) | ✅ hay datos en SIMA |
| Entrega a tiempo | Despachos (OTIF) | ✅ hay datos en SIMA |
| Costo por unidad | Costos de producción (no existen) | ⛔ sin fuente en SIMA |
| Desperdicio | Unidades rechazadas en registros de producción | ✅ hay datos en SIMA |
| OEE | Producción y detenciones | ✅ hay datos en SIMA |

**Flujo de información [D]**

- *Recibe:* Resultados de cada área, solicitudes de aprobación y reportes de incidentes.
- *Procesa:* Prioriza y decide entre metas en conflicto.
- *Produce:* Prioridades, aprobaciones, actas y planes correctivos.
- *Destinatarios:* Jefaturas de producción, mantenimiento, calidad, prevención, automatización.
- *Consecuencia:* Se publican cambios de PLC, se reordena el backlog y se cierran investigaciones.

**Permisos propuestos [P]** · aplicaciones: Web, Desktop

- Indicadores: consultar, exportar — planta
- Órdenes y registros de producción: consultar — planta
- No conformidades y lotes: consultar — planta
- Incidentes y acciones de seguridad: consultar, aprobar o rechazar, cerrar — planta
- Órdenes de trabajo de mantenimiento: consultar, asignar — planta
- Controladores PLC y cambios de programa: consultar, aprobar o rechazar — planta
- Mandos a distancia a PLC: consultar — planta
- Planta, áreas, líneas y equipos: consultar, crear, editar — planta
- Traspaso y bitácora de turno: consultar — planta
- Despachos y transporte: consultar — planta
- Fichas de personal: consultar — planta
- Contratos: consultar — planta
- Desvinculaciones: consultar — planta
- Asistencia y ausentismo: consultar — planta
- Habilitaciones y competencias: consultar — planta
- Remuneraciones: consultar — solo totales
- Permisos por cargo: consultar — empresa
- Presupuesto y flujo de caja *(módulo propuesto)*: consultar — planta
- Costos industriales *(módulo propuesto)*: consultar — planta

**Por validar con la empresa [V].** Si la gerencia de planta debe aprobar cambios de PLC o solo la jefatura de mantenimiento; Si necesita SIMA Desktop para recorridos en planta.

**Hoy en SIMA 4.1.** Aprueba cambios de PLC, gestiona SST, edita estructura y ve aprobaciones. No hay acta diaria ni costos.

---

### 04 · Jefe/a de administración de planta

**Dashboard propuesto:** «Administración de planta» · **Canal según el Excel:** web · **Perfil SIMA:** `finanzas_adm` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Coordina servicios generales, control documental, contratos, compras administrativas y soporte local.
- **Qué hace:** Administra servicios, proveedores no productivos, infraestructura administrativa y gastos de apoyo.
- **Qué entrega:** Contratos, solicitudes, control de gastos y expedientes.
- **Se coordina con:** Finanzas, RR. HH., seguridad, mantenimiento y contratistas.
- **Cómo medir:** Gasto vs. presupuesto, continuidad de servicios, cumplimiento contractual.
- **Conocimientos:** Administración, contratación y orden documental.
</details>

**A. Para qué existe [D].** Mantiene funcionando lo que no es producción pero sin lo cual la planta se detiene, como servicios, contratos administrativos, documentación y gastos de apoyo.

**B. Jornada [D]**

1. *Al comenzar:* Revisa solicitudes administrativas abiertas, contratos de servicio por vencer y gasto del mes contra presupuesto.
2. *Durante:* Gestiona proveedores no productivos, aprueba gastos de apoyo y revisa expedientes; valida parámetros y aprueba el pago de remuneraciones como segunda firma.
3. *Al coordinarse:* Con finanzas, RR. HH., seguridad, mantenimiento y contratistas.
4. *Ante una anomalía:* Si un servicio crítico (vigilancia, comedor, aseo) falla o un contrato vence sin renovación, activa el reemplazo y registra la incidencia.
5. *Al cerrar:* Actualiza el control de gastos y el estado de contratos.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Gastos administrativos dentro de su límite, renovación de contratos de servicios, segunda firma del cierre de remuneraciones. *Escala a:* Gerencia de planta y finanzas (gastos fuera de presupuesto).

**D. Información que consulta [D].** Contratos de servicios y vencimientos; Solicitudes administrativas; Gasto vs. presupuesto administrativo; Expedientes; Remuneraciones (para aprobar el cierre); Parámetros legales.

**E. Información que genera o modifica [D]**

- *Crear:* Contratos de servicios y solicitudes administrativas.
- *Registrar:* Control de gastos y evaluaciones de servicio.
- *Aprobar:* Cierre de remuneraciones preparado por otra persona; valores de parámetros legales.
- *Exportar:* Informe de gastos administrativos.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Parámetros técnicos de máquinas, programas PLC y OT técnicas. No edita fichas personales.

**G. Impacto en la empresa [D].** Si un contrato de servicio vence sin control, se interrumpen vigilancia, aseo o alimentación. Su segunda firma impide pagos sin revisión.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Contratos por vencer, gasto contra presupuesto y aprobaciones de pago pendientes.
- *Distribución:* Indicadores de gasto · contratos por vencer (30/60/90 días) · solicitudes abiertas · bandeja de aprobaciones.
- *Menú:* Inicio · Servicios y contratos · Solicitudes · Gastos · Remuneraciones (aprobación) · Parámetros · Documentos
- *Tablas y formularios:* Tablas: contratos de servicio, solicitudes, gastos por centro. Formularios: contrato, registro de gasto, evaluación de servicio.
- *Acciones rápidas:* Aprobar cierre de remuneraciones; Registrar gasto; Renovar contrato de servicio
- *Alertas:* Contrato de servicio vence en menos de 30 días; Gasto sobre presupuesto; Cierre de pago esperando aprobación
- *Notificaciones:* Remuneraciones preparadas para aprobar; nueva solicitud administrativa.
- *Estado vacío:* “No hay contratos de servicio registrados. Agregue el primero para controlar vencimientos.”
- *Componentes especializados:* Línea de tiempo de vencimientos, barra presupuesto vs. real.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Gasto vs. presupuesto | Presupuesto administrativo y gastos (no existen) | ⛔ sin fuente en SIMA |
| Continuidad de servicios | Incidencias de servicios contratados (no existen) | ⛔ sin fuente en SIMA |
| Cumplimiento contractual | Evaluaciones de contratistas (no existen) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Solicitudes de áreas, facturas de servicios, cierre de remuneraciones preparado.
- *Procesa:* Verifica presupuesto, contratos y respaldos.
- *Produce:* Gastos aprobados, contratos renovados y segunda firma de pagos.
- *Destinatarios:* Finanzas, tesorería, contratistas, RR. HH.
- *Consecuencia:* Se pagan servicios y remuneraciones con doble control.

**Permisos propuestos [P]** · aplicaciones: Web

- Remuneraciones: consultar, aprobar o rechazar — empresa
- Descuentos y conceptos variables: consultar — empresa
- Parámetros de remuneraciones: consultar, editar, aprobar o rechazar — empresa
- Fichas de personal: consultar — empresa
- Contratos: consultar — empresa
- Desvinculaciones: consultar — empresa
- Asistencia y ausentismo: consultar — empresa
- Servicios generales y contratistas *(módulo propuesto)*: consultar, crear, editar, aprobar o rechazar — planta
- Presupuesto y flujo de caja *(módulo propuesto)*: consultar — planta
- Gestión documental *(módulo parcial)*: consultar, crear, editar — planta
- Órdenes y registros de producción: consultar — solo totales
- Indicadores: consultar — planta

**Por validar con la empresa [V].** Si la segunda firma de remuneraciones debe quedar en Administración de planta o solo en Finanzas; Límite de gasto autorizable.

**Hoy en SIMA 4.1.** Aprueba cierres de remuneraciones y valida parámetros. No existe el módulo de servicios, contratos de proveedores ni gastos.

---

### 05 · Analista de control de gestión industrial

**Dashboard propuesto:** «Control de gestión» · **Canal según el Excel:** web · **Perfil SIMA:** `finanzas_adm` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Explica los resultados de la planta a partir de datos de producción, costos, calidad y tiempo.
- **Qué hace:** Consolida reportes, valida datos maestros, calcula desviaciones y propone alertas de gestión.
- **Qué entrega:** Dashboard, análisis de variaciones y cierre mensual.
- **Se coordina con:** Finanzas, producción, operaciones y sistemas.
- **Cómo medir:** Exactitud de reportes, plazo de cierre, desviación presupuestaria.
- **Conocimientos:** Excel/BI, ERP, indicadores y análisis de datos.
</details>

**A. Para qué existe [D].** Explica con datos por qué la planta obtuvo sus resultados. Sin este cargo las gerencias deciden sobre cifras no conciliadas.

**B. Jornada [D]**

1. *Al comenzar:* Revisa que los datos del día anterior estén completos (producción, detenciones, calidad) y marca los faltantes.
2. *Durante:* Consolida reportes, calcula desviaciones contra plan y presupuesto y prepara análisis de variación.
3. *Al coordinarse:* Con finanzas, producción, operaciones y sistemas para corregir datos maestros.
4. *Ante una anomalía:* Si un indicador cambia bruscamente o hay datos incoherentes, lo marca como dato por validar y pide corrección al área dueña.
5. *Al cerrar:* En el cierre mensual entrega el informe de variaciones.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Qué datos se consideran válidos para el informe y qué alertas de gestión proponer. *Escala a:* Gerencia de operaciones y finanzas (desviaciones significativas).

**D. Información que consulta [D].** Producción; detenciones y OEE; Calidad y rechazos; Mantenimiento (MTTR; MTBF); Costos y presupuesto; Remuneraciones solo en totales; Indicadores históricos.

**E. Información que genera o modifica [D]**

- *Consultar:* Todos los indicadores en totales.
- *Crear:* Alertas de gestión (umbral por indicador) y análisis de variación.
- *Exportar:* Informes y datos en Excel/CSV.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Liquidaciones individuales, datos personales y contratos. No modifica registros operativos de las áreas.

**G. Impacto en la empresa [D].** Sus análisis orientan las decisiones de gerencia y finanzas. Un dato mal consolidado hace que se corrija el problema equivocado.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Calidad del dato (faltantes, incoherencias) y desviaciones del período.
- *Distribución:* Panel de completitud de datos · variaciones contra meta · series históricas · exportaciones.
- *Menú:* Inicio · Indicadores · Variaciones · Calidad de datos · Informes
- *Tablas y formularios:* Tablas: indicadores con meta, real y desviación. Formularios: umbral de alerta, nota de análisis.
- *Acciones rápidas:* Exportar período; Crear alerta de gestión; Marcar dato por validar
- *Alertas:* Registro de producción faltante; Indicador fuera de umbral
- *Notificaciones:* Cierre de período disponible; área corrigió un dato marcado.
- *Estado vacío:* “No hay datos para el período elegido.”
- *Componentes especializados:* Gráficos de series, tabla pivote, indicadores con su fuente visible.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Exactitud de reportes | Correcciones posteriores a datos publicados (no se registran) | ⛔ sin fuente en SIMA |
| Plazo de cierre | Fecha de cierre del período (no se registra) | ⛔ sin fuente en SIMA |
| Desviación presupuestaria | Presupuesto (no existe) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Registros de producción, calidad, mantenimiento, personas (totales) y finanzas.
- *Procesa:* Valida, concilia y calcula desviaciones.
- *Produce:* Informe de variaciones, alertas de gestión y cierre mensual.
- *Destinatarios:* Gerencias, finanzas, operaciones.
- *Consecuencia:* Las gerencias priorizan sobre datos conciliados.

**Permisos propuestos [P]** · aplicaciones: Web

- Indicadores: consultar, crear, exportar — empresa
- Órdenes y registros de producción: consultar, exportar — solo totales
- No conformidades y lotes: consultar — empresa
- Órdenes de trabajo de mantenimiento: consultar — empresa
- Despachos y transporte: consultar — empresa
- Remuneraciones: consultar — solo totales
- Costos industriales *(módulo propuesto)*: consultar — empresa
- Presupuesto y flujo de caja *(módulo propuesto)*: consultar — empresa

**Por validar con la empresa [V].** Qué indicadores deben tener umbral de alerta automático.

**Hoy en SIMA 4.1.** Ve indicadores y producción en totales. No existen alertas de gestión, marca de dato por validar ni exportación del período.

---

## Familia 2 · Producción y operación en piso

### 06 · Jefe/a de producción

**Dashboard propuesto:** «Jefatura de producción» · **Canal según el Excel:** web · **Perfil SIMA:** `produccion_ing` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Asegura que los turnos fabriquen el volumen comprometido con calidad y seguridad.
- **Qué hace:** Asigna recursos por línea; coordina cambios de formato, materiales y mantenimiento; administra prioridades del programa.
- **Qué entrega:** Plan diario/semanal de producción y balance de capacidad.
- **Se coordina con:** Planificación, supervisión, calidad y mantenimiento.
- **Cómo medir:** Plan cumplido, merma, rendimiento, OEE.
- **Conocimientos:** Gestión de procesos, liderazgo y resolución de problemas.
</details>

**A. Para qué existe [D].** Hace que los turnos fabriquen el volumen comprometido. Es quien traduce el programa en recursos por línea y quien negocia con mantenimiento y calidad cuando el programa choca con la realidad.

**B. Jornada [D]**

1. *Al comenzar:* Revisa el cierre de los turnos anteriores (unidades buenas, rechazo, detenciones) y el programa del día por línea.
2. *Durante:* Asigna recursos por línea, coordina cambios de formato, autoriza la apertura y el término de órdenes de producción y sigue el avance contra el plan.
3. *Al coordinarse:* Con planificación (fechas), mantenimiento (ventanas de detención), calidad (lotes retenidos) y supervisores de turno.
4. *Ante una anomalía:* Si una línea se detiene o un lote se retiene, decide si se reprograma, se cambia de línea o se pide intervención urgente, y avisa a planificación.
5. *Al cerrar:* Valida el balance diario de producción y deja las prioridades del día siguiente.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Prioridad entre órdenes del programa, asignación de recursos por línea, inicio y término de órdenes de producción, aceptación de ventanas de mantenimiento. *Escala a:* Gerencia de planta (incumplimiento del plan semanal, conflictos con mantenimiento que no se resuelven).

**D. Información que consulta [D].** Programa del día y la semana por línea; Avance de cada orden de producción; Detenciones y su causa; Lotes retenidos por calidad; OT que afectan líneas productivas; Dotación por turno (solo nombres y puestos).

**E. Información que genera o modifica [D]**

- *Crear:* Órdenes de producción a partir del programa.
- *Editar:* Prioridad, línea y estado de las órdenes (iniciar, pausar, terminar).
- *Asignar:* Recursos y equipos por línea.
- *Aprobar:* Ventanas de detención propuestas por mantenimiento.
- *Exportar:* Balance diario y semanal de producción.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Remuneraciones, contratos y datos personales del personal. No ejecuta ni cierra OT técnicas.

**G. Impacto en la empresa [D].** De su asignación depende que el pedido salga a tiempo. Si acepta una ventana de mantenimiento sin reprogramar, la línea queda sin plan y el atraso llega a despacho.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Avance de cada línea contra el plan, detenciones activas y lotes retenidos.
- *Distribución:* Tablero por línea (avance, ritmo, rechazo) · órdenes del día · detenciones con causa · ventanas de mantenimiento por aprobar.
- *Menú:* Inicio · Programa y órdenes · Líneas en vivo · Detenciones · Calidad de mis lotes · Ventanas de mantenimiento · Indicadores
- *Tablas y formularios:* Tablas: órdenes de producción, detenciones por causa. Formularios: nueva orden, cambio de prioridad o línea, aprobación de ventana.
- *Acciones rápidas:* Crear orden de producción; Iniciar o terminar una orden; Reprogramar orden; Aprobar ventana de mantenimiento
- *Alertas:* Línea bajo ritmo estándar; Equipo de una orden en curso con alarma; Lote retenido; Orden atrasada contra su fecha
- *Notificaciones:* Mantenimiento propone una detención; calidad retiene un lote de una orden; un supervisor reporta una falla.
- *Estado vacío:* “No hay órdenes de producción para hoy. Cree una desde el programa o pídala a planificación.”
- *Componentes especializados:* Barras de avance por línea, línea de tiempo de detenciones, tarjetas de orden con estado.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Plan cumplido | Órdenes de producción (meta y unidades buenas) | ✅ hay datos en SIMA |
| Merma | Unidades rechazadas y motivo | ✅ hay datos en SIMA |
| Rendimiento | Unidades por hora contra estándar (el estándar no existe) | 🟡 datos parciales |
| OEE | Producción y detenciones por equipo | ✅ hay datos en SIMA |

**Flujo de información [D]**

- *Recibe:* Programa de planificación, estado de equipos, liberaciones de calidad.
- *Procesa:* Balancea recursos y decide prioridades.
- *Produce:* Órdenes de producción abiertas y priorizadas, ventanas aceptadas.
- *Destinatarios:* Supervisores y operadores, planificación, mantenimiento, despacho.
- *Consecuencia:* Las órdenes aparecen en SIMA Desktop de los operadores del turno.

**Permisos propuestos [P]** · aplicaciones: Web, Desktop

- Órdenes y registros de producción: consultar, crear, editar, exportar — planta
- Programa de producción y capacidad *(módulo parcial)*: consultar, editar — planta
- No conformidades y lotes: consultar — planta
- Órdenes de trabajo de mantenimiento: consultar, crear — planta
- Planta, áreas, líneas y equipos: consultar — planta
- Alarmas y eventos de planta: consultar — planta
- Traspaso y bitácora de turno: consultar — planta
- Indicadores: consultar — planta
- Mandos a distancia a PLC: consultar — planta
- Asistencia y ausentismo: consultar — su equipo
- Habilitaciones y competencias: consultar — su equipo
- Incidentes y acciones de seguridad: consultar — planta

**Por validar con la empresa [V].** Si la jefatura de producción también usa SIMA Desktop en piso; Si debe poder enviar mandos a distancia a los PLC (hoy puede).

**Hoy en SIMA 4.1.** Crea y cambia el estado de órdenes de producción en la web. No hay programa por línea ni aprobación de ventanas de mantenimiento.

---

### 07 · Supervisor/a de turno

**Dashboard propuesto:** «Mi turno» · **Canal según el Excel:** app · **Perfil SIMA:** `supervisor_turno` · **Tipo:** Terreno · **Dotación:** 2/2

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Lidera personas y resultados durante un turno específico.
- **Qué hace:** Hace charla inicial y traspaso; confirma materiales y condiciones; asigna puestos; escala fallas y valida registros.
- **Qué entrega:** Bitácora de turno, asignaciones, incidentes y cierre de producción.
- **Se coordina con:** Operadores, técnicos, calidad, almacén y jefe de producción.
- **Cómo medir:** Unidades buenas/turno, detenciones, incidentes, ausentismo operativo.
- **Conocimientos:** Supervisión, seguridad, lectura de indicadores.
</details>

**A. Para qué existe [D].** Lidera a las personas y los resultados de un turno. Es el primer responsable de que el turno empiece seguro, con materiales y con cada persona en un puesto para el que está habilitada.

**B. Jornada [D]**

1. *Al comenzar:* Recibe el traspaso del turno anterior, hace la charla inicial, confirma asistencia y asigna puestos verificando habilitaciones vigentes.
2. *Durante:* Sigue la producción por orden, valida registros de los operadores y resuelve faltantes de material.
3. *Al coordinarse:* Con técnicos (fallas), calidad (rechazos), bodega (materiales) y jefatura de producción.
4. *Ante una anomalía:* Si un equipo falla, confirma el reporte del operador, fija la prioridad y avisa a mantenimiento; si hay un incidente, lo registra y asegura el área.
5. *Al cerrar:* Cierra la bitácora del turno (producción, detenciones, incidentes, pendientes) y entrega el traspaso firmado.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Asignación de puestos del turno, prioridad de los avisos de falla de su turno, detención de un equipo por condición insegura. *Escala a:* Jefatura de producción (atrasos), mantenimiento (fallas), prevención (incidentes).

**D. Información que consulta [D].** Asistencia de su turno; Habilitaciones de su equipo; Órdenes de producción del turno; Estado de los equipos de sus líneas; OT abiertas de esos equipos; Incidentes del turno.

**E. Información que genera o modifica [D]**

- *Registrar:* Asistencia operativa del turno, incidentes y la bitácora.
- *Asignar:* Personas a puestos y equipos.
- *Crear:* Avisos de falla y traspaso de turno.
- *Editar:* Estado de órdenes de producción del turno (iniciar, pausar).
- *Cerrar:* El turno (traspaso firmado).

**F. Lo que NO debe ver (mínimo privilegio) [D].** Sueldos, contratos y datos personales de su equipo. Ve solo a las personas de su turno.

**G. Impacto en la empresa [D].** Si asigna a alguien sin habilitación vigente, la empresa opera fuera de norma. Su bitácora es la base del traspaso y de los indicadores del turno.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Quién está, quién falta y dónde trabaja cada uno; equipos detenidos; avance de las órdenes del turno.
- *Distribución:* Indicadores del turno (unidades buenas, detenciones, incidentes, presentes) · tablero de puestos · órdenes del turno · equipos de sus líneas · bitácora.
- *Menú:* Mi turno · Mi equipo · Producción · Equipos · Alertas · Bitácora y traspaso · Seguridad · Reportar falla
- *Tablas y formularios:* Tablas: personas del turno con puesto y habilitaciones, órdenes del turno. Formularios: asignación de puesto, incidente, bitácora de cierre.
- *Acciones rápidas:* Asignar puesto; Registrar ausencia; Reportar falla; Registrar incidente; Cerrar turno
- *Alertas:* Persona asignada con habilitación vencida; Ausencia en un puesto crítico; Equipo detenido; Incidente del turno
- *Notificaciones:* Un operador reporta una anomalía; mantenimiento toma o cierra una OT de sus equipos; calidad rechaza un lote del turno.
- *Estado vacío:* “Su turno todavía no tiene órdenes asignadas.”
- *Componentes especializados:* Tablero de puestos (persona-equipo), semáforo de habilitaciones, bitácora con plantilla.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Unidades buenas por turno | Registros de producción del turno | ✅ hay datos en SIMA |
| Detenciones | Paradas y cambios de estado de equipos | ✅ hay datos en SIMA |
| Incidentes | Incidentes SST del turno | ✅ hay datos en SIMA |
| Ausentismo operativo | Asistencia diaria del turno (hoy solo existe el resumen mensual) | 🟡 datos parciales |

**Flujo de información [D]**

- *Recibe:* Traspaso del turno anterior, órdenes de producción, estado de equipos.
- *Procesa:* Asigna personas y resuelve problemas del turno.
- *Produce:* Asignaciones, incidentes, avisos de falla y bitácora.
- *Destinatarios:* Operadores, mantenimiento, jefatura de producción, turno siguiente.
- *Consecuencia:* Mantenimiento recibe avisos ya priorizados; el turno siguiente parte con los pendientes claros.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Órdenes y registros de producción: consultar, registrar, editar — su equipo
- Traspaso y bitácora de turno: consultar, crear, cerrar — su equipo
- Asistencia y ausentismo: consultar, registrar — su equipo
- Habilitaciones y competencias: consultar — su equipo
- Planta, áreas, líneas y equipos: consultar — su línea
- Alarmas y eventos de planta: consultar — su línea
- Órdenes de trabajo de mantenimiento: consultar, crear — su línea
- No conformidades y lotes: consultar, registrar — su línea
- Incidentes y acciones de seguridad: consultar, registrar — su equipo
- Rutinas y checklist: consultar, registrar — su línea
- Mandos a distancia a PLC: consultar — su línea
- Indicadores: consultar — su equipo

**Por validar con la empresa [V].** Si el supervisor registra la asistencia diaria o solo la confirma (hoy RR. HH. carga el resumen mensual); Qué puestos se consideran críticos para alertar ausencias.

**Hoy en SIMA 4.1.** Desktop con traspaso, producción, alertas y reportes. No hay asignación de puestos ni asistencia diaria; la habilitación no se verifica al asignar.

---

### 08 · Líder o encargado/a de línea

**Dashboard propuesto:** «Mi línea» · **Canal según el Excel:** app · **Perfil SIMA:** `supervisor_turno` · **Tipo:** Terreno · **Dotación:** 4/4

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Coordina una célula o línea y actúa como primer punto de escalamiento.
- **Qué hace:** Verifica arranque, secuencia de trabajo, estándares visuales, piezas y cambios de lote.
- **Qué entrega:** Checklist de arranque y reporte de pérdidas por línea.
- **Se coordina con:** Supervisor, operadores y control de calidad.
- **Cómo medir:** Ritmo real vs. estándar, retrabajos, tiempos de cambio.
- **Conocimientos:** Conocimiento de la línea, comunicación y 5S.
</details>

**A. Para qué existe [D].** Coordina una línea o célula y es el primer punto de escalamiento de los operadores. Vela por que la línea arranque bien y por que los estándares se cumplan en cada cambio de lote.

**B. Jornada [D]**

1. *Al comenzar:* Hace el checklist de arranque de la línea (resguardos, materiales, estándares visuales) y confirma el lote y la orden en curso.
2. *Durante:* Sigue el ritmo real contra el estándar, verifica cambios de lote y piezas, y registra pérdidas.
3. *Al coordinarse:* Con el supervisor, los operadores de su línea y control de calidad.
4. *Ante una anomalía:* Si la línea pierde ritmo o aparece un defecto repetido, detiene la secuencia si corresponde, reporta la falla y avisa al supervisor.
5. *Al cerrar:* Registra las pérdidas del turno por causa y deja el estado de la línea.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Detención de la línea por calidad o seguridad, cambio de secuencia dentro de la orden. *Escala a:* Supervisor de turno.

**D. Información que consulta [D].** Estado de los equipos de su línea; Orden y lote en curso; Estándares e instrucciones de la línea; Rechazos del turno; Operadores asignados a la línea.

**E. Información que genera o modifica [D]**

- *Registrar:* Checklist de arranque, pérdidas por causa y cambios de lote.
- *Crear:* Avisos de falla.
- *Editar:* Estado de la orden de su línea (iniciar, pausar).

**F. Lo que NO debe ver (mínimo privilegio) [D].** Datos personales, contratos y sueldos. Ve solo su línea.

**G. Impacto en la empresa [D].** El checklist de arranque evita que la línea parta con un resguardo abierto o con el material equivocado. Sus pérdidas registradas alimentan el OEE y la mejora continua.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Estado de cada equipo de su línea, ritmo contra estándar y pérdidas del turno.
- *Distribución:* Esquema de la línea con sus equipos en vivo · orden y lote en curso · ritmo · pérdidas por causa · checklist de arranque.
- *Menú:* Mi línea · Producción · Rutinas y arranque · Reportar falla · Seguridad · Alertas · Mi cargo
- *Tablas y formularios:* Tablas: pérdidas por causa, equipos de la línea. Formularios: checklist de arranque, pérdida, cambio de lote.
- *Acciones rápidas:* Completar checklist de arranque; Registrar pérdida; Registrar cambio de lote; Reportar falla
- *Alertas:* Equipo de la línea con alarma; Ritmo bajo el estándar; Checklist de arranque pendiente
- *Notificaciones:* Mantenimiento toma la OT de un equipo de su línea; calidad rechaza un lote de la línea.
- *Estado vacío:* “La línea no tiene una orden en curso.”
- *Componentes especializados:* Diagrama de línea animado por estado, contador de ritmo.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Ritmo real vs. estándar | Producción por hora y estándar por producto (el estándar no existe) | 🟡 datos parciales |
| Retrabajos | Registros de retrabajo (no se distinguen del rechazo) | ⛔ sin fuente en SIMA |
| Tiempos de cambio | Cambios de lote con hora de inicio y fin (no se registran) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Orden de la línea, instrucciones, estado de equipos.
- *Procesa:* Verifica arranque y estándares; detecta pérdidas.
- *Produce:* Checklist de arranque, pérdidas registradas, avisos de falla.
- *Destinatarios:* Supervisor, mantenimiento, calidad, ingeniería de procesos.
- *Consecuencia:* Las pérdidas quedan clasificadas para el OEE y el análisis de mejora.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Órdenes y registros de producción: consultar, registrar, editar — su línea
- Rutinas y checklist: consultar, registrar — su línea
- Planta, áreas, líneas y equipos: consultar — su línea
- Alarmas y eventos de planta: consultar — su línea
- Órdenes de trabajo de mantenimiento: consultar, crear — su línea
- No conformidades y lotes: consultar, registrar — su línea
- Incidentes y acciones de seguridad: registrar — propio
- Traspaso y bitácora de turno: consultar — su línea
- Mandos a distancia a PLC: consultar — su línea
- Habilitaciones y competencias: consultar — su línea

**Por validar con la empresa [V].** Catálogo de causas de pérdida que usa la planta; Si el líder puede detener la línea sin autorización del supervisor.

**Hoy en SIMA 4.1.** Comparte el perfil del supervisor de turno, así que hoy ve lo mismo que él. No hay checklist de arranque por línea ni registro de pérdidas por causa.

---

### 09 · Operador/a de máquina o proceso

**Dashboard propuesto:** «Mi operación» · **Canal según el Excel:** app · **Perfil SIMA:** `operador` · **Tipo:** Terreno · **Dotación:** 8/9

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Opera equipos autorizados siguiendo instrucciones y controles establecidos.
- **Qué hace:** Verifica resguardos, carga material, observa parámetros permitidos, registra producción y detiene/reporta condiciones inseguras.
- **Qué entrega:** Registro de operación, trazabilidad, checklist básico.
- **Se coordina con:** Líder de línea, mantenimiento y calidad.
- **Cómo medir:** Piezas conformes, cumplimiento de estándar, reportes de anomalías.
- **Conocimientos:** Capacitación en máquina, seguridad y lectura de instrucciones.
</details>

**A. Para qué existe [D].** Opera los equipos para los que está autorizado. Es quien primero ve una anomalía, así que su reporte a tiempo evita fallas mayores y accidentes.

**B. Jornada [D]**

1. *Al comenzar:* Ve su orden de producción, su equipo asignado y si su habilitación está vigente; completa el checklist preuso del equipo.
2. *Durante:* Carga material, observa que los parámetros estén dentro de los límites permitidos y registra unidades conformes y rechazadas.
3. *Al coordinarse:* Pide asistencia al líder de línea o al supervisor y avisa a calidad si ve un defecto.
4. *Ante una anomalía:* Detiene el equipo si hay una condición insegura, reporta la anomalía con el equipo preseleccionado y registra la detención.
5. *Al cerrar:* Deja el registro de producción completo y el equipo limpio y en estado conocido.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Detener su equipo ante una condición insegura (no necesita autorización para eso). *Escala a:* Líder de línea o supervisor (cualquier anomalía); mantenimiento a través del reporte.

**D. Información que consulta [D].** Su orden de producción y meta; Su equipo y sus parámetros permitidos; Instrucciones de operación; Sus habilitaciones; Alertas de su equipo.

**E. Información que genera o modifica [D]**

- *Registrar:* Unidades conformes y rechazadas con motivo, checklist preuso y detenciones.
- *Crear:* Reporte de anomalía o condición insegura.
- *Solicitar:* Asistencia al líder o al supervisor.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Información de otras personas (salvo nombre y cargo), sueldos, contratos, programas PLC y parámetros críticos. No modifica parámetros de máquina.

**G. Impacto en la empresa [D].** Su registro es la base de la trazabilidad del lote y del OEE. Un reporte tardío convierte una anomalía en una falla con detención larga.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Su orden (meta, hecho, rechazo), su equipo en vivo con límites y el checklist pendiente.
- *Distribución:* Orden en curso con anillo de avance y registro rápido · equipo con medidores y límites · checklist · mis habilitaciones · botón grande de reportar.
- *Menú:* Mi operación · Mi orden · Checklist · Reportar anomalía · Seguridad · Alertas · Mi cargo
- *Tablas y formularios:* Formularios: registro de unidades (con botones +1/+5/+10), rechazo con motivo, checklist preuso, reporte de anomalía, detención con causa.
- *Acciones rápidas:* Registrar unidades; Completar checklist; Reportar anomalía; Registrar detención; Pedir asistencia
- *Alertas:* Habilitación vencida para su equipo; Parámetro fuera de rango; Equipo con alarma
- *Notificaciones:* Mantenimiento tomó la falla que reportó; su equipo fue liberado para operar.
- *Estado vacío:* “No tiene una orden asignada en este turno. Consulte a su líder de línea.”
- *Componentes especializados:* Anillo de avance, medidores con banda permitida, botón de parada segura.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Piezas conformes | Registros de producción del operador | ✅ hay datos en SIMA |
| Cumplimiento de estándar | Checklist completados a tiempo | 🟡 datos parciales |
| Reportes de anomalías | Avisos de falla creados por la persona | ✅ hay datos en SIMA |

**Flujo de información [D]**

- *Recibe:* Orden de producción asignada, instrucciones, parámetros permitidos.
- *Procesa:* Opera y vigila el equipo.
- *Produce:* Registro de producción, checklist, reportes de anomalía.
- *Destinatarios:* Líder de línea, supervisor, mantenimiento, calidad.
- *Consecuencia:* El avance de la orden y el OEE se actualizan; mantenimiento recibe el aviso.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Órdenes y registros de producción: consultar, registrar — propio
- Rutinas y checklist: consultar, registrar — propio
- Órdenes de trabajo de mantenimiento: crear — propio
- Incidentes y acciones de seguridad: registrar — propio
- Planta, áreas, líneas y equipos: consultar — propio
- Alarmas y eventos de planta: consultar — propio
- Habilitaciones y competencias: consultar — propio

**Por validar con la empresa [V].** Si el operador queda asignado a un equipo fijo o por orden; Si debe bloquearse el registro cuando su habilitación está vencida.

**Hoy en SIMA 4.1.** Ve las órdenes de su turno y registra producción. No hay vínculo operador-equipo autorizado, ni checklist preuso por equipo, ni registro de detención por el operador.

---

### 10 · Operador/a de CNC

**Dashboard propuesto:** «Mi máquina CNC» · **Canal según el Excel:** app · **Perfil SIMA:** `operador` · **Tipo:** Terreno · **Dotación:** 4/5

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Prepara y opera máquinas de control numérico dentro de su ámbito de autorización.
- **Qué hace:** Verifica programa autorizado, herramientas, amarre, primera pieza y medidas; informa desgaste y desviaciones.
- **Qué entrega:** Hoja de preparación, control dimensional y piezas identificadas.
- **Se coordina con:** Programador CNC, calidad, herramientas y mantenimiento.
- **Cómo medir:** Tiempo de ciclo, piezas buenas, scrap, capacidad.
- **Conocimientos:** Planos, metrología y CNC.
</details>

**A. Para qué existe [D].** Prepara y opera máquinas de control numérico. La primera pieza y el control dimensional dependen de su verificación.

**B. Jornada [D]**

1. *Al comenzar:* Verifica que el programa cargado sea el autorizado para la orden, las herramientas, el amarre y su habilitación CNC.
2. *Durante:* Mecaniza la primera pieza, la mide y registra; luego sigue con controles dimensionales por frecuencia.
3. *Al coordinarse:* Con el programador CNC (programa), calidad (medidas), herramientas y mantenimiento.
4. *Ante una anomalía:* Si una medida sale de tolerancia o una herramienta se desgasta, detiene, registra la desviación y avisa.
5. *Al cerrar:* Deja la hoja de preparación y las piezas identificadas.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Liberar la primera pieza para seguir la serie (dentro del procedimiento) o detener por desviación. *Escala a:* Calidad (desviación dimensional), programador CNC (programa), mantenimiento (falla).

**D. Información que consulta [D].** Orden y plano de la pieza; Programa autorizado y su versión; Herramientas asignadas; Tolerancias; Su habilitación CNC.

**E. Información que genera o modifica [D]**

- *Registrar:* Hoja de preparación, primera pieza, controles dimensionales, desgaste de herramienta y producción.
- *Crear:* Reporte de desviación o falla.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Datos de otras personas, sueldos, programas en edición. No edita el programa CNC.

**G. Impacto en la empresa [D].** Si arranca con un programa no autorizado o sin verificar la primera pieza, toda la serie puede salir fuera de tolerancia.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Programa autorizado de la orden, primera pieza y próximas mediciones.
- *Distribución:* Orden y pieza · programa con versión · hoja de preparación · tabla de mediciones · registro de producción.
- *Menú:* Mi máquina CNC · Mi orden · Preparación y mediciones · Reportar anomalía · Seguridad · Mi cargo
- *Tablas y formularios:* Tablas: mediciones (cota, nominal, tolerancia, medido). Formularios: hoja de preparación, medición, desgaste de herramienta.
- *Acciones rápidas:* Registrar primera pieza; Registrar medición; Registrar unidades; Reportar desviación
- *Alertas:* Programa cargado distinto del autorizado; Medición fuera de tolerancia; Habilitación CNC vencida
- *Notificaciones:* Calidad liberó o rechazó la primera pieza.
- *Estado vacío:* “No hay orden CNC asignada.”
- *Componentes especializados:* Tabla de cotas con semáforo de tolerancia.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Tiempo de ciclo | Tiempos por pieza (no se registran) | ⛔ sin fuente en SIMA |
| Piezas buenas | Registros de producción | ✅ hay datos en SIMA |
| Scrap | Rechazos por motivo | ✅ hay datos en SIMA |
| Capacidad | Mediciones dimensionales para Cpk (no se registran) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Orden, plano, programa autorizado.
- *Procesa:* Prepara, mecaniza y mide.
- *Produce:* Piezas identificadas, hoja de preparación y mediciones.
- *Destinatarios:* Calidad, programador CNC, líder de línea.
- *Consecuencia:* La serie avanza con trazabilidad dimensional.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Órdenes y registros de producción: consultar, registrar — propio
- Inspecciones, ensayos y planes de control *(módulo propuesto)*: registrar — propio
- Rutinas y checklist: consultar, registrar — propio
- Órdenes de trabajo de mantenimiento: crear — propio
- Incidentes y acciones de seguridad: registrar — propio
- Planta, áreas, líneas y equipos: consultar — propio
- Gestión documental *(módulo parcial)*: consultar — propio
- Habilitaciones y competencias: consultar — propio

**Por validar con la empresa [V].** Frecuencia de control dimensional por producto; Quién libera la primera pieza (operador o calidad).

**Hoy en SIMA 4.1.** Mismo inicio que el operador genérico. No hay programa autorizado por orden ni registro de mediciones.

---

### 11 · Armador/a o ensamblador/a

**Dashboard propuesto:** «Mi ensamble» · **Canal según el Excel:** app · **Perfil SIMA:** `operador` · **Tipo:** Terreno · **Dotación:** 6/7

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Une componentes manualmente o con asistencia de herramientas y equipos.
- **Qué hace:** Sigue secuencia, torques autorizados, identificación de partes y autocontrol.
- **Qué entrega:** Producto ensamblado y registro de lote.
- **Se coordina con:** Líder de línea, abastecimiento y calidad.
- **Cómo medir:** Unidades por hora, errores de montaje, retrabajo.
- **Conocimientos:** Instrucciones visuales, ergonomía y trazabilidad.
</details>

**A. Para qué existe [D].** Une componentes en la secuencia y con los torques definidos. De su autocontrol depende que no lleguen errores de montaje a calidad o al cliente.

**B. Jornada [D]**

1. *Al comenzar:* Revisa la orden de ensamble, la lista de piezas del producto y que no falten componentes.
2. *Durante:* Sigue la secuencia, aplica torques autorizados, identifica las partes y hace autocontrol por unidad.
3. *Al coordinarse:* Con el líder de línea, el auxiliar de abastecimiento (faltantes) y calidad.
4. *Ante una anomalía:* Si falta un componente o aparece un defecto, lo registra y avisa; segrega la unidad.
5. *Al cerrar:* Deja el registro del lote con unidades ensambladas y defectos.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Segregar una unidad con defecto. *Escala a:* Líder de línea (faltantes y defectos repetidos).

**D. Información que consulta [D].** Orden de ensamble; Instrucción visual y secuencia; Lista de piezas; Torques autorizados; Criterios de calidad.

**E. Información que genera o modifica [D]**

- *Registrar:* Unidades ensambladas, defectos y faltantes por lote.
- *Solicitar:* Reposición de componentes.
- *Crear:* Reporte de defecto.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Información de otras personas, sueldos y contratos.

**G. Impacto en la empresa [D].** Un error de montaje no detectado llega a calidad o al cliente como reclamo.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Orden de ensamble, paso actual de la secuencia y faltantes.
- *Distribución:* Orden y lote · instrucción paso a paso · lista de piezas con disponibilidad · registro de unidades y defectos.
- *Menú:* Mi ensamble · Mi orden · Instrucciones · Reportar defecto · Seguridad · Mi cargo
- *Tablas y formularios:* Formularios: unidades por lote, defecto con tipo, solicitud de reposición.
- *Acciones rápidas:* Registrar unidades; Registrar defecto; Pedir reposición de componente
- *Alertas:* Componente faltante; Defecto repetido en el lote
- *Notificaciones:* Reposición entregada; calidad rechazó un lote.
- *Estado vacío:* “No hay orden de ensamble asignada.”
- *Componentes especializados:* Instrucción visual por pasos con avance.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Unidades por hora | Producción con hora de registro | 🟡 datos parciales |
| Errores de montaje | Defectos por tipo (motivo de rechazo) | 🟡 datos parciales |
| Retrabajo | Unidades retrabajadas (no se registran) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Orden, instrucción y componentes.
- *Procesa:* Ensambla y autocontrola.
- *Produce:* Producto ensamblado y registro de lote.
- *Destinatarios:* Líder de línea, calidad, embalaje.
- *Consecuencia:* El lote avanza a calidad o embalaje con trazabilidad.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Órdenes y registros de producción: consultar, registrar — propio
- Gestión documental *(módulo parcial)*: consultar — propio
- Materiales y requerimientos (MRP) *(módulo propuesto)*: solicitar — propio
- Órdenes de trabajo de mantenimiento: crear — propio
- Incidentes y acciones de seguridad: registrar — propio
- Rutinas y checklist: consultar, registrar — propio
- Habilitaciones y competencias: consultar — propio

**Por validar con la empresa [V].** Si existen instrucciones visuales digitalizadas por producto.

**Hoy en SIMA 4.1.** Inicio de operador genérico. No hay instrucciones por producto ni solicitud de reposición.

---

### 12 · Operador/a de envasado, etiquetado y embalaje

**Dashboard propuesto:** «Mi embalaje» · **Canal según el Excel:** app · **Perfil SIMA:** `operador` · **Tipo:** Terreno · **Dotación:** 4/5

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Entrega producto empacado y rotulado conforme a requisitos del cliente.
- **Qué hace:** Verifica formato, etiqueta, fecha/lote, integridad del envase, conteo y pallets.
- **Qué entrega:** Registro de embalaje y producto liberado para expedición.
- **Se coordina con:** Calidad, producción y bodega.
- **Cómo medir:** Errores de etiquetado, rendimiento, daños de transporte.
- **Conocimientos:** Trazabilidad, estándares de envase y control visual.
</details>

**A. Para qué existe [D].** Entrega el producto empacado y rotulado como lo exige el cliente. Un error de etiqueta o de lote rompe la trazabilidad y genera devoluciones.

**B. Jornada [D]**

1. *Al comenzar:* Revisa la orden de embalaje, la especificación del cliente y las etiquetas del lote.
2. *Durante:* Verifica formato, etiqueta, fecha y lote, integridad del envase y conteo; arma pallets.
3. *Al coordinarse:* Con calidad (liberación), producción y bodega (retiro de pallets).
4. *Ante una anomalía:* Si la etiqueta no coincide o el envase está dañado, detiene el embalaje del lote y avisa a calidad.
5. *Al cerrar:* Registra unidades embaladas y pallets listos para expedición.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* No embalar un lote cuya etiqueta o presentación no coincide. *Escala a:* Calidad y líder de línea.

**D. Información que consulta [D].** Orden de embalaje; Especificación de embalaje del cliente; Lote y fecha; Estado de liberación del lote.

**E. Información que genera o modifica [D]**

- *Registrar:* Unidades embaladas, pallets y verificación de etiqueta.
- *Crear:* Reporte de error de etiqueta o daño.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Información de otras personas, sueldos y contratos; datos comerciales del pedido más allá de la especificación.

**G. Impacto en la empresa [D].** Su registro libera producto para despacho. Un lote mal etiquetado puede salir al cliente equivocado.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Lote en curso, verificación de etiqueta y conteo.
- *Distribución:* Orden y lote · especificación · verificación de etiqueta (lote, fecha, cliente) · conteo y pallets.
- *Menú:* Mi embalaje · Mi orden · Verificación de etiqueta · Reportar anomalía · Seguridad · Mi cargo
- *Tablas y formularios:* Formularios: verificación de etiqueta (lote y fecha), unidades embaladas, pallet.
- *Acciones rápidas:* Verificar etiqueta; Registrar unidades embaladas; Cerrar pallet; Reportar error
- *Alertas:* Lote no liberado por calidad; Etiqueta no coincide con el lote
- *Notificaciones:* Calidad liberó el lote; bodega retiró el pallet.
- *Estado vacío:* “No hay orden de embalaje asignada.”
- *Componentes especializados:* Comparador lote-etiqueta.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Errores de etiquetado | Verificaciones de etiqueta con resultado (no se registran) | ⛔ sin fuente en SIMA |
| Rendimiento | Unidades embaladas por hora | 🟡 datos parciales |
| Daños de transporte | Reclamos de entrega por daño (no existen) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Lote liberado y especificación de embalaje.
- *Procesa:* Verifica, embala y paletiza.
- *Produce:* Producto liberado para expedición con trazabilidad.
- *Destinatarios:* Bodega, despacho, calidad.
- *Consecuencia:* Despacho puede programar el envío del lote.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Órdenes y registros de producción: consultar, registrar — propio
- No conformidades y lotes: consultar — propio
- Despachos y transporte: consultar — propio
- Órdenes de trabajo de mantenimiento: crear — propio
- Incidentes y acciones de seguridad: registrar — propio
- Rutinas y checklist: consultar, registrar — propio
- Habilitaciones y competencias: consultar — propio

**Por validar con la empresa [V].** Si se usará lectura de código de barras para verificar etiquetas.

**Hoy en SIMA 4.1.** Inicio de operador genérico. No hay verificación de etiqueta ni registro de pallets.

---

### 13 · Operador/a de sala de control

**Dashboard propuesto:** «Sala de control» · **Canal según el Excel:** app · **Perfil SIMA:** `operador` · **Tipo:** Terreno · **Dotación:** 2/2

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Monitorea paneles SCADA/HMI y parámetros de procesos continuos.
- **Qué hace:** Sigue tendencias, alarmas y secuencias autorizadas; registra anomalías y coordina respuestas con personal de campo.
- **Qué entrega:** Bitácora de proceso, alarmas y tendencias.
- **Se coordina con:** Operación de campo, automatización y supervisión.
- **Cómo medir:** Estabilidad del proceso, alarmas recurrentes, disponibilidad.
- **Conocimientos:** Variables de proceso, HMI y manejo de alarmas.
</details>

**A. Para qué existe [D].** Vigila los procesos continuos desde los paneles. Reconoce alarmas, sigue tendencias y coordina la respuesta del personal en campo.

**B. Jornada [D]**

1. *Al comenzar:* Recibe el traspaso de la sala (alarmas abiertas, equipos en mantención) y revisa las tendencias de las últimas horas.
2. *Durante:* Sigue tendencias y alarmas, reconoce las que corresponden y registra eventos en la bitácora de proceso.
3. *Al coordinarse:* Con operación de campo, automatización y supervisión.
4. *Ante una anomalía:* Ante una alarma crítica, la reconoce, avisa al operador de campo o a mantenimiento y registra la respuesta.
5. *Al cerrar:* Entrega la bitácora de proceso con alarmas abiertas y pendientes.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Reconocer alarmas y ejecutar secuencias autorizadas. *Escala a:* Supervisor de turno, automatización (falla de control o de comunicación).

**D. Información que consulta [D].** Estados de equipos y PLC; Tendencias de variables; Alarmas abiertas y su historial; Eventos de planta; OT abiertas.

**E. Información que genera o modifica [D]**

- *Registrar:* Reconocimiento de alarmas y bitácora de proceso.
- *Crear:* Avisos de falla.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Programas PLC en edición, datos de personas, sueldos. No cambia parámetros de proceso fuera de lo autorizado.

**G. Impacto en la empresa [D].** Un reconocimiento tardío convierte un aviso en una detención. Su bitácora explica qué pasó cuando automatización o mantenimiento investigan.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Alarmas críticas abiertas y variables fuera de rango.
- *Distribución:* Consola de alarmas en vivo · mapa de planta · tendencias seleccionables · bitácora de proceso.
- *Menú:* Sala de control · Alertas · Explorador de planta · Bitácora · Reportar falla · Seguridad
- *Tablas y formularios:* Tablas: alarmas con nivel, equipo y tiempo abierto. Formularios: reconocimiento con comentario, entrada de bitácora.
- *Acciones rápidas:* Reconocer alarma; Registrar en bitácora; Reportar falla
- *Alertas:* Alarma crítica sin reconocer; PLC sin comunicación; Alarma recurrente
- *Notificaciones:* Mantenimiento tomó una OT de un equipo en alarma.
- *Estado vacío:* “No hay alarmas abiertas.”
- *Componentes especializados:* Consola de eventos con filtro por nivel y marca de datos simulados, gráficos de tendencia.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Estabilidad del proceso | Lecturas de sensores (variabilidad) | ✅ hay datos en SIMA |
| Alarmas recurrentes | Historial de alarmas por equipo | ✅ hay datos en SIMA |
| Disponibilidad | Cambios de estado de equipos | ✅ hay datos en SIMA |

**Flujo de información [D]**

- *Recibe:* Telemetría, alarmas y eventos de PLC.
- *Procesa:* Reconoce, interpreta y coordina.
- *Produce:* Alarmas reconocidas, bitácora de proceso, avisos de falla.
- *Destinatarios:* Operación de campo, mantenimiento, automatización, supervisión.
- *Consecuencia:* Mantenimiento recibe el aviso con el contexto de la alarma.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Alarmas y eventos de planta: consultar, registrar — planta
- Planta, áreas, líneas y equipos: consultar — planta
- Controladores PLC y cambios de programa: consultar — planta
- Órdenes de trabajo de mantenimiento: consultar, crear — planta
- Traspaso y bitácora de turno: consultar, crear — su área
- Rutinas y checklist: consultar, registrar — propio
- Incidentes y acciones de seguridad: registrar — propio
- Habilitaciones y competencias: consultar — propio

**Por validar con la empresa [V].** Si la sala de control puede ejecutar mandos a distancia (hoy no); Qué alarmas puede reconocer y cuáles solo automatización.

**Hoy en SIMA 4.1.** Ajuste por cargo en Desktop (inicio de sala de control). El reconocimiento de alarmas existe. No hay bitácora de proceso propia.

---

### 14 · Operador/a de montacargas o grúa horquilla

**Dashboard propuesto:** «Mis movimientos» · **Canal según el Excel:** app · **Perfil SIMA:** `operador` · **Tipo:** Terreno · **Dotación:** 2/2

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Mueve materias primas, insumos y productos dentro de rutas autorizadas.
- **Qué hace:** Inspecciona el equipo, respeta capacidades, asegura cargas, registra movimientos y reporta daños.
- **Qué entrega:** Checklist del equipo y movimientos de carga.
- **Se coordina con:** Bodega, despacho, recepción y seguridad.
- **Cómo medir:** Incidentes, exactitud de movimientos, daños.
- **Conocimientos:** Competencia y autorizaciones aplicables, maniobras seguras.
</details>

**A. Para qué existe [D].** Mueve materiales por rutas autorizadas con un equipo inspeccionado. Es un cargo de alto riesgo, así que la habilitación y el checklist preuso son obligatorios.

**B. Jornada [D]**

1. *Al comenzar:* Confirma su habilitación de grúa horquilla y completa la inspección preuso del equipo.
2. *Durante:* Recibe tareas de traslado, mueve cargas dentro de la capacidad y registra cada movimiento (origen, destino, carga).
3. *Al coordinarse:* Con bodega, despacho, recepción y seguridad.
4. *Ante una anomalía:* Si detecta un daño en el equipo, una ruta bloqueada o un incidente, detiene, reporta y no opera hasta que se libere.
5. *Al cerrar:* Deja el equipo estacionado y el registro de movimientos completo.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* No operar si el checklist preuso falla o la habilitación está vencida. *Escala a:* Jefe de bodega, prevención (incidentes).

**D. Información que consulta [D].** Su habilitación; Tareas de traslado; Ubicaciones; Capacidad del equipo.

**E. Información que genera o modifica [D]**

- *Registrar:* Checklist preuso, movimientos de carga, daños e incidentes.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Información de otras personas, sueldos, contratos.

**G. Impacto en la empresa [D].** Un movimiento no registrado descuadra el inventario; un equipo sin inspección es un riesgo grave para las personas.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Estado de su habilitación, checklist del día y tareas de traslado pendientes.
- *Distribución:* Habilitación y checklist · lista de tareas de traslado · registro rápido de movimiento.
- *Menú:* Mis movimientos · Checklist preuso · Seguridad · Reportar · Mi cargo
- *Tablas y formularios:* Formularios: checklist preuso, movimiento (origen, destino, carga), daño o incidente.
- *Acciones rápidas:* Completar checklist preuso; Registrar movimiento; Reportar daño
- *Alertas:* Habilitación de grúa vencida; Checklist preuso no realizado; Ruta bloqueada
- *Notificaciones:* Nueva tarea de traslado asignada.
- *Estado vacío:* “No tiene tareas de traslado asignadas.”
- *Componentes especializados:* Tarjeta de habilitación con días restantes.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Incidentes | Incidentes SST del operador | ✅ hay datos en SIMA |
| Exactitud de movimientos | Movimientos registrados contra conteos (no existen) | ⛔ sin fuente en SIMA |
| Daños | Reportes de daño (no se registran) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Tareas de traslado desde bodega o despacho.
- *Procesa:* Inspecciona el equipo y mueve cargas.
- *Produce:* Movimientos registrados y checklist.
- *Destinatarios:* Bodega, despacho, prevención.
- *Consecuencia:* El inventario por ubicación queda actualizado.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Bodega: ubicaciones, recepciones y conteos *(módulo propuesto)*: consultar, registrar — propio
- Rutinas y checklist: consultar, registrar — propio
- Incidentes y acciones de seguridad: registrar — propio
- Órdenes de trabajo de mantenimiento: crear — propio
- Habilitaciones y competencias: consultar — propio

**Por validar con la empresa [V].** Si las tareas de traslado se asignarán en SIMA o seguirán siendo verbales.

**Hoy en SIMA 4.1.** Ajuste por cargo en Desktop (rutinas y seguridad). No hay tareas de traslado ni movimientos por ubicación.

---

### 15 · Auxiliar de producción / apoyo de línea

**Dashboard propuesto:** «Apoyo de línea» · **Canal según el Excel:** app · **Perfil SIMA:** `operador` · **Tipo:** Terreno · **Dotación:** 3/3

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Prepara insumos y mantiene el flujo de tareas auxiliares controladas.
- **Qué hace:** Abastece estaciones, separa material, limpia según procedimiento y ordena áreas.
- **Qué entrega:** Estaciones abastecidas y registros simples.
- **Se coordina con:** Operadores, líder de línea y bodega.
- **Cómo medir:** Tiempo de reposición, orden, faltantes de línea.
- **Conocimientos:** 5S, manipulación segura y disciplina operacional.
</details>

**A. Para qué existe [D].** Mantiene las estaciones abastecidas y ordenadas. Si se retrasa, la línea se detiene por falta de material.

**B. Jornada [D]**

1. *Al comenzar:* Revisa las solicitudes de reposición de las estaciones y la lista de tareas de limpieza y orden.
2. *Durante:* Abastece estaciones, separa material y limpia según procedimiento.
3. *Al coordinarse:* Con operadores, líder de línea y bodega.
4. *Ante una anomalía:* Si falta material en bodega, avisa al líder; si ve una condición insegura, la reporta.
5. *Al cerrar:* Confirma las reposiciones hechas y el checklist 5S.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Prioridad de reposición entre estaciones. *Escala a:* Líder de línea.

**D. Información que consulta [D].** Solicitudes de reposición; Lista de tareas; Procedimientos de limpieza.

**E. Información que genera o modifica [D]**

- *Registrar:* Reposiciones confirmadas y checklist 5S.
- *Crear:* Reporte de condición insegura.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Información de otras personas, producción detallada de otras líneas, sueldos.

**G. Impacto en la empresa [D].** Un faltante de material detiene la línea aunque las máquinas estén bien.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Solicitudes de reposición pendientes.
- *Distribución:* Solicitudes por estación · tareas 5S · reporte rápido.
- *Menú:* Apoyo de línea · Reposiciones · Rutinas 5S · Reportar · Seguridad · Mi cargo
- *Tablas y formularios:* Formularios: confirmación de reposición, checklist 5S.
- *Acciones rápidas:* Confirmar reposición; Completar 5S; Reportar condición insegura
- *Alertas:* Estación sin material; Solicitud de reposición atrasada
- *Notificaciones:* Nueva solicitud de reposición.
- *Estado vacío:* “No hay reposiciones pendientes.”
- *Componentes especializados:* Lista de solicitudes con tiempo de espera.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Tiempo de reposición | Solicitudes de reposición con hora (no existen) | ⛔ sin fuente en SIMA |
| Orden | Checklist 5S completados | 🟡 datos parciales |
| Faltantes de línea | Solicitudes no atendidas (no existen) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Solicitudes de los operadores.
- *Procesa:* Prepara y entrega material.
- *Produce:* Estaciones abastecidas, registros simples.
- *Destinatarios:* Operadores y líder de línea.
- *Consecuencia:* La línea sigue sin detenciones por material.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Materiales y requerimientos (MRP) *(módulo propuesto)*: consultar, registrar — su línea
- Rutinas y checklist: consultar, registrar — su línea
- Órdenes y registros de producción: consultar — su línea
- Incidentes y acciones de seguridad: registrar — propio
- Órdenes de trabajo de mantenimiento: crear — propio
- Habilitaciones y competencias: consultar — propio

**Por validar con la empresa [V].** Si las solicitudes de reposición serán digitales.

**Hoy en SIMA 4.1.** Ajuste por cargo en Desktop (rutinas y reporte). No hay solicitudes de reposición.

---

## Familia 3 · Ingeniería, procesos y automatización

### 16 · Ingeniero/a de procesos

**Dashboard propuesto:** «Ingeniería de procesos» · **Canal según el Excel:** web · **Perfil SIMA:** `produccion_ing` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Diseña y mejora métodos de fabricación, tiempos, parámetros y capacidad.
- **Qué hace:** Documenta procesos; estudia pérdidas, balances, ergonomía y causas; valida cambios técnicos.
- **Qué entrega:** Hojas de proceso, estándares de trabajo y proyectos de mejora.
- **Se coordina con:** Producción, calidad, mantenimiento y planificación.
- **Cómo medir:** Tiempo ciclo, rendimiento, merma, variabilidad.
- **Conocimientos:** Ingeniería industrial, estadística y mejora continua.
</details>

**A. Para qué existe [D].** Diseña cómo se fabrica cada producto (método, tiempos, parámetros) y valida los cambios técnicos. Sin estándares documentados, cada turno trabaja a su manera y la variabilidad sube.

**B. Jornada [D]**

1. *Al comenzar:* Revisa pérdidas y rechazos del día anterior por línea y producto.
2. *Durante:* Documenta hojas de proceso, estudia balances y causas de pérdida, y revisa cambios técnicos propuestos.
3. *Al coordinarse:* Con producción, calidad, mantenimiento y planificación.
4. *Ante una anomalía:* Si un producto muestra variabilidad o rechazo repetido, abre un análisis de causa y propone un cambio de método o parámetro.
5. *Al cerrar:* Publica las versiones aprobadas de las hojas de proceso.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Contenido técnico de las hojas de proceso y estándares de trabajo; validación técnica de cambios. *Escala a:* Jefatura de producción y gerencia de planta (cambios que afectan capacidad o inversión).

**D. Información que consulta [D].** Producción y rechazos por producto y línea; Detenciones y pérdidas por causa; Parámetros de equipos; Tiempos de ciclo; Hojas de proceso vigentes.

**E. Información que genera o modifica [D]**

- *Crear:* Hojas de proceso y estándares de trabajo (documentos versionados).
- *Editar:* Parámetros estándar por producto (con aprobación).
- *Registrar:* Análisis de pérdidas y validaciones de cambio.
- *Exportar:* Estudios de capacidad.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Datos personales, contratos y sueldos. No cambia parámetros de PLC directamente.

**G. Impacto en la empresa [D].** Sus estándares son la referencia del ritmo, del costo estándar y del plan. Un estándar mal definido distorsiona el OEE y la planificación.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Pérdidas y variabilidad por producto, y cambios técnicos por validar.
- *Distribución:* Pareto de pérdidas · variabilidad por producto · documentos de proceso con versión · cambios por validar.
- *Menú:* Inicio · Pérdidas y variabilidad · Documentos de proceso · Cambios técnicos · Producción · Indicadores
- *Tablas y formularios:* Tablas: pérdidas por causa, documentos con versión y estado. Formularios: hoja de proceso, validación de cambio.
- *Acciones rápidas:* Publicar nueva versión de hoja de proceso; Validar cambio técnico; Abrir análisis de causa
- *Alertas:* Rechazo de un producto sobre su umbral; Cambio técnico esperando validación
- *Notificaciones:* Producción reporta pérdida recurrente; calidad abre NC de un producto suyo.
- *Estado vacío:* “No hay pérdidas registradas en el período.”
- *Componentes especializados:* Pareto, gráfico de control, visor de documento con historial de versiones.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Tiempo ciclo | Tiempos por pieza (no se registran) | ⛔ sin fuente en SIMA |
| Rendimiento | Producción contra estándar | 🟡 datos parciales |
| Merma | Rechazos de producción | ✅ hay datos en SIMA |
| Variabilidad | Lecturas de sensores y mediciones | 🟡 datos parciales |

**Flujo de información [D]**

- *Recibe:* Datos de producción, pérdidas, NC de calidad.
- *Procesa:* Analiza causas y define métodos.
- *Produce:* Hojas de proceso y estándares versionados, cambios validados.
- *Destinatarios:* Producción, calidad, planificación, costos.
- *Consecuencia:* Operadores trabajan con la versión vigente; planificación usa tiempos reales.

**Permisos propuestos [P]** · aplicaciones: Web

- Órdenes y registros de producción: consultar — planta
- No conformidades y lotes: consultar — planta
- Gestión documental *(módulo parcial)*: consultar, crear, editar — planta
- Especificaciones, BOM y cambios de ingeniería *(módulo propuesto)*: consultar — empresa
- Planta, áreas, líneas y equipos: consultar — planta
- Alarmas y eventos de planta: consultar — planta
- Indicadores: consultar — planta
- Proyectos industriales y de mejora *(módulo propuesto)*: consultar, crear, editar — planta
- Traspaso y bitácora de turno: consultar — planta
- Controladores PLC y cambios de programa: consultar — planta

**Por validar con la empresa [V].** Quién aprueba una nueva versión de hoja de proceso.

**Hoy en SIMA 4.1.** Ve producción, calidad, planta e indicadores. No hay documentos de proceso versionados ni análisis de pérdidas por causa.

---

### 17 · Ingeniero/a industrial o de mejora continua

**Dashboard propuesto:** «Mejora continua» · **Canal según el Excel:** web · **Perfil SIMA:** `produccion_ing` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Optimiza sistemas de trabajo de extremo a extremo y lidera mejoras verificables.
- **Qué hace:** Mapea valor, facilita 5S/Kaizen, reduce cambios y desperdicios y verifica resultados con datos.
- **Qué entrega:** Mapa de proceso, A3 y seguimiento de beneficios.
- **Se coordina con:** Operaciones, recursos humanos y finanzas.
- **Cómo medir:** Ahorros validados, lead time, productividad y WIP.
- **Conocimientos:** Lean, análisis de procesos y gestión de proyectos.
</details>

**A. Para qué existe [D].** Encuentra y elimina desperdicios de extremo a extremo y demuestra con datos que la mejora ocurrió.

**B. Jornada [D]**

1. *Al comenzar:* Revisa el avance de los proyectos de mejora (A3) y los indicadores que cada uno debe mover.
2. *Durante:* Mapea flujos de valor, facilita 5S y Kaizen, y mide antes y después.
3. *Al coordinarse:* Con operaciones, RR. HH. (formación) y finanzas (validación de ahorros).
4. *Ante una anomalía:* Si un beneficio comprometido no aparece en los datos, reabre el análisis.
5. *Al cerrar:* Actualiza el estado de cada A3 y los beneficios validados.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Qué proyectos de mejora se priorizan dentro de su cartera y cuándo un beneficio está verificado. *Escala a:* Gerencia de operaciones (proyectos que requieren inversión).

**D. Información que consulta [D].** Indicadores históricos (OEE; lead time; WIP); Pérdidas por causa; Resultados de auditorías 5S; Costos cuando estén disponibles.

**E. Información que genera o modifica [D]**

- *Crear:* Proyectos de mejora (A3) con línea base y meta.
- *Registrar:* Avances, mediciones antes/después y beneficios.
- *Cerrar:* Proyectos con beneficio validado.
- *Exportar:* Seguimiento de beneficios.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Datos personales y sueldos individuales.

**G. Impacto en la empresa [D].** Las mejoras validadas cambian estándares, capacidad y costos. Un beneficio mal medido lleva a invertir en lo que no funciona.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Cartera de mejoras y su efecto en los indicadores.
- *Distribución:* Tablero kanban de A3 · indicador antes/después por proyecto · beneficios acumulados.
- *Menú:* Inicio · Proyectos de mejora · Indicadores · Pérdidas · 5S y auditorías
- *Tablas y formularios:* Tablas: proyectos con línea base, meta y real. Formularios: A3, medición, beneficio.
- *Acciones rápidas:* Crear A3; Registrar medición; Validar beneficio
- *Alertas:* Proyecto sin avance en 30 días; Beneficio comprometido no verificado
- *Notificaciones:* Finanzas validó un ahorro.
- *Estado vacío:* “No hay proyectos de mejora. Cree un A3 a partir de una pérdida del Pareto.”
- *Componentes especializados:* Kanban, gráfico antes/después.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Ahorros validados | Proyectos con beneficio validado por finanzas (no existen) | ⛔ sin fuente en SIMA |
| Lead time | Tiempos de orden de inicio a término | 🟡 datos parciales |
| Productividad | Producción y asistencia | 🟡 datos parciales |
| WIP | Inventario en proceso (no existe) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Indicadores y pérdidas.
- *Procesa:* Analiza desperdicios y prueba mejoras.
- *Produce:* A3, estándares mejorados y beneficios.
- *Destinatarios:* Operaciones, ingeniería de procesos, finanzas.
- *Consecuencia:* Cambian estándares y metas.

**Permisos propuestos [P]** · aplicaciones: Web

- Proyectos industriales y de mejora *(módulo propuesto)*: consultar, crear, editar, cerrar — planta
- Indicadores: consultar, exportar — planta
- Órdenes y registros de producción: consultar — planta
- No conformidades y lotes: consultar — planta
- Gestión documental *(módulo parcial)*: consultar — planta
- Costos industriales *(módulo propuesto)*: consultar — solo totales

**Por validar con la empresa [V].** Quién valida los ahorros (finanzas o control de gestión).

**Hoy en SIMA 4.1.** Ve indicadores y producción. No existe el módulo de proyectos de mejora.

---

### 18 · Ingeniero/a de automatización y control

**Dashboard propuesto:** «Automatización y control» · **Canal según el Excel:** app · **Perfil SIMA:** `ing_automatizacion` · **Tipo:** Terreno · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Diseña y mantiene la arquitectura de control de máquinas y líneas.
- **Qué hace:** Gestiona PLC, HMI, redes industriales, alarmas, secuencias y respaldos; controla cambios y pruebas.
- **Qué entrega:** Planos, backups, lista de señales, versiones y pruebas FAT/SAT.
- **Se coordina con:** Mantenimiento, producción, TI/OT e integradores.
- **Cómo medir:** Fallas de control, tiempo de recuperación, cambios exitosos.
- **Conocimientos:** PLC, HMI/SCADA, instrumentación y seguridad de máquinas.
</details>

**A. Para qué existe [D].** Diseña y cuida la arquitectura de control (PLC, HMI, redes, alarmas). Es el dueño técnico de que cada cambio en un controlador esté probado, respaldado y aprobado.

**B. Jornada [D]**

1. *Al comenzar:* Revisa el estado de los PLC (en marcha, en falla, sin conexión), alarmas de control y cambios de programa pendientes.
2. *Durante:* Prepara y prueba cambios en el simulador, documenta señales y versiones, y gestiona respaldos.
3. *Al coordinarse:* Con mantenimiento, producción, TI/OT e integradores.
4. *Ante una anomalía:* Ante una falla de control o de comunicación, diagnostica con eventos y E/S, coordina la intervención y documenta la causa.
5. *Al cerrar:* Deja registrados respaldos, versiones y el estado de los cambios.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Contenido técnico de los cambios de programa que solicita; no publica sus propios cambios (otra persona aprueba). *Escala a:* Jefatura de mantenimiento o gerencia de planta (aprobación de cambios).

**D. Información que consulta [D].** Estado y versión de cada PLC; Racks; módulos y puntos de E/S; Eventos y alarmas de control; Historial de cambios de programa; Resultados del simulador.

**E. Información que genera o modifica [D]**

- *Solicitar:* Cambios de programa (versión propuesta con justificación).
- *Registrar:* Pruebas en simulador, respaldos y lista de señales.
- *Crear:* Equipos y PLC en la estructura de planta.
- *Editar:* Documentación técnica de controladores.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Datos personales, contratos, sueldos. No aprueba sus propios cambios.

**G. Impacto en la empresa [D].** Un cambio sin prueba ni respaldo puede detener una línea completa. Su documentación es la que usa el técnico cuando hay una falla.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Controladores en falla o sin conexión y cambios esperando aprobación.
- *Distribución:* Grilla de PLC con estado · cambios de programa con su estado · eventos de control · acceso al simulador.
- *Menú:* Inicio · Controladores · Cambios de programa · Eventos · Simulador · Estructura de planta · OT de automatización
- *Tablas y formularios:* Tablas: PLC (estado, versión, último contacto), cambios (estado, solicitante, revisor). Formularios: solicitud de cambio con diferencia de versión, registro de prueba.
- *Acciones rápidas:* Solicitar cambio de programa; Registrar prueba en simulador; Ver E/S en vivo; Abrir simulador
- *Alertas:* PLC sin conexión; Falla de CPU; Cambio rechazado
- *Notificaciones:* Su cambio fue aprobado o rechazado; un PLC pasó a falla.
- *Estado vacío:* “Todos los controladores en marcha y sin cambios pendientes.”
- *Componentes especializados:* Diferencia de versiones, vista de E/S en vivo, distintivo de dato simulado.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Fallas de control | Eventos de falla de PLC | ✅ hay datos en SIMA |
| Tiempo de recuperación | Duración entre falla y recuperación del PLC | ✅ hay datos en SIMA |
| Cambios exitosos | Cambios aprobados sin reversión (la reversión no se registra) | 🟡 datos parciales |

**Flujo de información [D]**

- *Recibe:* Fallas, solicitudes de producción o mantenimiento, resultados de simulación.
- *Procesa:* Diseña, prueba y documenta cambios.
- *Produce:* Solicitudes de cambio, respaldos, documentación.
- *Destinatarios:* Aprobador (jefatura de mantenimiento o planta), técnicos, sala de control.
- *Consecuencia:* Al aprobarse, el PLC recibe la nueva versión y queda trazado quién solicitó y quién aprobó.

**Permisos propuestos [P]** · aplicaciones: Desktop, Web

- Controladores PLC y cambios de programa: consultar, solicitar, editar — planta
- Mandos a distancia a PLC: consultar, registrar — planta
- SIMA PLC Simulator: consultar, registrar — planta
- Planta, áreas, líneas y equipos: consultar, crear, editar — planta
- Alarmas y eventos de planta: consultar — planta
- Órdenes de trabajo de mantenimiento: consultar, registrar — planta
- Gestión documental *(módulo parcial)*: consultar, crear, editar — planta
- Indicadores: consultar — planta
- Repuestos y pañol: consultar, solicitar — planta
- Herramientas: consultar — planta
- Habilitaciones y competencias: consultar — propio

**Por validar con la empresa [V].** Si la arquitectura de red y la lista de señales deben quedar en SIMA o en un repositorio de ingeniería.

**Hoy en SIMA 4.1.** Solicita cambios de PLC (control de cuatro ojos), crea equipos, envía mandos y usa el simulador. No hay registro de pruebas ni respaldos vinculados al cambio.

---

### 19 · Programador/a de PLC/HMI

**Dashboard propuesto:** «Cambios PLC/HMI» · **Canal según el Excel:** app · **Perfil SIMA:** `ing_automatizacion` · **Tipo:** Terreno · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Implementa y documenta lógica de control bajo un proceso formal de cambios.
- **Qué hace:** Diagnostica alarmas, documenta versiones, prueba simulaciones y coordina ventanas de intervención.
- **Qué entrega:** Código controlado, respaldos, bitácora de cambios y pruebas.
- **Se coordina con:** Ingeniero de control, técnicos y supervisión.
- **Cómo medir:** Reincidencias, éxito de pruebas, tiempo de diagnóstico.
- **Conocimientos:** IEC 61131-3, redes OT y control de versiones.
</details>

**A. Para qué existe [D].** Escribe y mantiene la lógica de control bajo un proceso formal de cambios, de modo que ninguna modificación llegue a un controlador sin prueba ni respaldo.

**B. Jornada [D]**

1. *Al comenzar:* Revisa alarmas reincidentes y los cambios de programa en curso.
2. *Durante:* Diagnostica alarmas, prepara la nueva versión, la prueba en el simulador y coordina la ventana de intervención.
3. *Al coordinarse:* Con el ingeniero de control, técnicos y supervisión.
4. *Ante una anomalía:* Si una alarma reincide tras un cambio, propone reversión o corrección y lo documenta.
5. *Al cerrar:* Actualiza la bitácora de cambios y el respaldo de la versión publicada.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Contenido de la lógica que propone, dentro del alcance autorizado. *Escala a:* Ingeniero de automatización (diseño), aprobador del cambio.

**D. Información que consulta [D].** Programa y versión de cada PLC; Alarmas y su historial; Eventos de E/S; Documentación de señales; Resultados del simulador.

**E. Información que genera o modifica [D]**

- *Solicitar:* Cambios de programa con justificación.
- *Registrar:* Pruebas en simulador, respaldos y bitácora de cambios.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Datos personales, contratos, sueldos. No aprueba ni publica sus cambios.

**G. Impacto en la empresa [D].** Su lógica gobierna el comportamiento de las máquinas. Un error sin prueba se traduce en detenciones o riesgos.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Cambios propios en curso, alarmas reincidentes y ventanas acordadas.
- *Distribución:* Mis cambios (borrador, enviado, aprobado, rechazado) · alarmas reincidentes · simulador · ventanas.
- *Menú:* Inicio · Mis cambios · Controladores · Alarmas · Simulador
- *Tablas y formularios:* Tablas: cambios propios, alarmas por frecuencia. Formularios: solicitud de cambio, prueba de simulación.
- *Acciones rápidas:* Crear solicitud de cambio; Registrar prueba; Abrir simulador
- *Alertas:* Alarma reincidente; Cambio rechazado; Ventana de intervención próxima
- *Notificaciones:* Cambio aprobado o rechazado.
- *Estado vacío:* “No tiene cambios en curso.”
- *Componentes especializados:* Editor de diferencias, historial de versiones.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Reincidencias | Alarmas repetidas tras un cambio | 🟡 datos parciales |
| Éxito de pruebas | Pruebas registradas con resultado (no existen) | ⛔ sin fuente en SIMA |
| Tiempo de diagnóstico | Tiempo entre alarma y OT o cambio | 🟡 datos parciales |

**Flujo de información [D]**

- *Recibe:* Alarmas, solicitudes técnicas.
- *Procesa:* Diagnostica, programa y prueba.
- *Produce:* Cambio solicitado con prueba y respaldo.
- *Destinatarios:* Aprobador, técnicos, sala de control.
- *Consecuencia:* La versión publicada queda trazada.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Controladores PLC y cambios de programa: consultar, solicitar — planta
- SIMA PLC Simulator: consultar, registrar — planta
- Mandos a distancia a PLC: consultar, registrar — planta
- Alarmas y eventos de planta: consultar — planta
- Planta, áreas, líneas y equipos: consultar — planta
- Órdenes de trabajo de mantenimiento: consultar, registrar — planta
- Gestión documental *(módulo parcial)*: consultar, crear — planta
- Habilitaciones y competencias: consultar — propio

**Por validar con la empresa [V].** Si el programador puede enviar mandos a distancia en producción o solo en el simulador.

**Hoy en SIMA 4.1.** Igual que el ingeniero de automatización (mismo perfil). No hay registro de pruebas ni bitácora propia.

---

### 20 · Técnico/a de instrumentación y calibración

**Dashboard propuesto:** «Instrumentación y calibración» · **Canal según el Excel:** app · **Perfil SIMA:** `instrumentacion` · **Tipo:** Terreno · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Asegura mediciones confiables de presión, temperatura, flujo, nivel y otros parámetros.
- **Qué hace:** Inspecciona sensores y lazos, realiza calibraciones conforme al procedimiento, registra desvíos y gestiona patrones.
- **Qué entrega:** Certificados/registro de calibración y lista de instrumentos.
- **Se coordina con:** Calidad, automatización, mantenimiento y metrología.
- **Cómo medir:** Instrumentos dentro de tolerancia, calibraciones a tiempo.
- **Conocimientos:** Instrumentación, trazabilidad metrológica y electricidad.
</details>

**A. Para qué existe [D].** Asegura que lo que miden los sensores sea verdad. Si un transmisor está descalibrado, las alarmas y los indicadores mienten.

**B. Jornada [D]**

1. *Al comenzar:* Revisa instrumentos con calibración vencida o por vencer y las OT de instrumentación asignadas.
2. *Durante:* Inspecciona sensores y lazos, calibra según procedimiento con patrones trazables y registra desvíos.
3. *Al coordinarse:* Con calidad, automatización, mantenimiento y metrología.
4. *Ante una anomalía:* Si un instrumento está fuera de tolerancia, lo marca, avisa a quien lo usa y abre la acción correspondiente.
5. *Al cerrar:* Registra las calibraciones hechas y actualiza las fechas de vencimiento.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Declarar un instrumento conforme o fuera de tolerancia. *Escala a:* Metrología y calidad (impacto en producto), automatización (lazos de control).

**D. Información que consulta [D].** Inventario de instrumentos y sensores; Fechas y resultados de calibración; Procedimientos; Lecturas de los sensores; OT de instrumentación.

**E. Información que genera o modifica [D]**

- *Registrar:* Calibraciones (antes y después, patrón usado), desvíos.
- *Editar:* Estado y próxima fecha de calibración del instrumento.
- *Cerrar:* OT de instrumentación.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Datos personales, contratos y sueldos; programas de PLC en edición.

**G. Impacto en la empresa [D].** Un instrumento vencido invalida mediciones de calidad y alarmas de proceso.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Instrumentos vencidos y por vencer, y OT asignadas.
- *Distribución:* Indicadores (vigentes, por vencer, vencidos) · lista ordenada por vencimiento · OT de instrumentación.
- *Menú:* Calibraciones · Mis OT · Explorador de planta · Alertas · Reportar
- *Tablas y formularios:* Tablas: instrumentos con vencimiento. Formularios: registro de calibración (lectura patrón, lectura instrumento, error, resultado).
- *Acciones rápidas:* Registrar calibración; Marcar fuera de tolerancia; Tomar OT
- *Alertas:* Calibración vencida; Calibración por vencer en 30 días
- *Notificaciones:* Nueva OT de instrumentación.
- *Estado vacío:* “Todos los instrumentos tienen la calibración vigente.”
- *Componentes especializados:* Línea de vencimientos, semáforo por instrumento.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Instrumentos dentro de tolerancia | Resultados de calibración (hoy solo se registra la fecha) | 🟡 datos parciales |
| Calibraciones a tiempo | Fechas de calibración y vencimiento | ✅ hay datos en SIMA |

**Flujo de información [D]**

- *Recibe:* Inventario y calendario de calibración.
- *Procesa:* Calibra y compara con tolerancia.
- *Produce:* Registro de calibración y estado del instrumento.
- *Destinatarios:* Calidad, metrología, automatización, pañol.
- *Consecuencia:* Un instrumento vencido no se puede retirar del pañol.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Instrumentos y calibraciones *(módulo parcial)*: consultar, registrar, editar — planta
- Herramientas: consultar, editar — planta
- Órdenes de trabajo de mantenimiento: consultar, registrar, cerrar — propio
- Repuestos y pañol: consultar, solicitar — planta
- Planta, áreas, líneas y equipos: consultar — planta
- Alarmas y eventos de planta: consultar — planta
- Controladores PLC y cambios de programa: consultar — planta
- Habilitaciones y competencias: consultar — propio

**Por validar con la empresa [V].** Si los sensores de proceso deben tener calendario de calibración propio además de las herramientas.

**Hoy en SIMA 4.1.** Calibrar herramientas y ver vencimientos. El registro solo guarda la fecha, no la lectura ni el resultado.

---

### 21 · Ingeniero/a de proyectos industriales

**Dashboard propuesto:** «Proyectos industriales» · **Canal según el Excel:** web · **Perfil SIMA:** `produccion_ing` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Transforma necesidades operativas en proyectos de inversión, instalación y puesta en marcha.
- **Qué hace:** Define alcance, presupuesto, cronograma, riesgos, ingeniería, proveedores y aceptación final.
- **Qué entrega:** Especificación técnica, cronograma, acta de puesta en servicio.
- **Se coordina con:** Planta, compras, mantenimiento, HSE y proveedores.
- **Cómo medir:** Costo/plazo/calidad de proyectos y resultados operativos.
- **Conocimientos:** Gestión de proyectos, ingeniería y contratación.
</details>

**A. Para qué existe [D].** Lleva una necesidad operativa hasta una instalación funcionando, con costo, plazo y calidad controlados.

**B. Jornada [D]**

1. *Al comenzar:* Revisa avance, costo y riesgos de cada proyecto.
2. *Durante:* Define alcance, coordina ingeniería y proveedores, y sigue el cronograma.
3. *Al coordinarse:* Con planta, compras, mantenimiento, prevención y proveedores.
4. *Ante una anomalía:* Si un hito se atrasa o el costo se desvía, registra el riesgo y propone medidas.
5. *Al cerrar:* Registra avances y, al terminar, el acta de puesta en servicio.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Alcance técnico y aceptación de entregables de proveedores. *Escala a:* Gerencia de planta o general (desviaciones de costo y plazo).

**D. Información que consulta [D].** Presupuesto y gasto del proyecto; Cronograma y avance; Riesgos; Proveedores y órdenes de compra del proyecto; Equipos afectados.

**E. Información que genera o modifica [D]**

- *Crear:* Proyecto (alcance, presupuesto, cronograma).
- *Registrar:* Avances, riesgos y aceptación de entregables.
- *Cerrar:* Proyecto con acta de puesta en servicio.
- *Solicitar:* Compras del proyecto.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Datos personales, contratos y sueldos.

**G. Impacto en la empresa [D].** Un proyecto mal entregado deja equipos sin documentación ni repuestos y traslada el problema a mantenimiento.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Proyectos con desviación de plazo o costo.
- *Distribución:* Cartera de proyectos con semáforo · Gantt · riesgos · compras del proyecto.
- *Menú:* Inicio · Proyectos · Cronograma · Riesgos · Compras · Documentos
- *Tablas y formularios:* Tablas: proyectos, hitos, riesgos. Formularios: proyecto, avance, riesgo, acta.
- *Acciones rápidas:* Registrar avance; Registrar riesgo; Aceptar entregable
- *Alertas:* Hito atrasado; Gasto sobre presupuesto
- *Notificaciones:* Orden de compra del proyecto recibida.
- *Estado vacío:* “No hay proyectos registrados.”
- *Componentes especializados:* Gantt, curva S.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Costo, plazo y calidad de proyectos | Presupuesto, cronograma y aceptación (no existen) | ⛔ sin fuente en SIMA |
| Resultados operativos | Indicadores del equipo antes y después | 🟡 datos parciales |

**Flujo de información [D]**

- *Recibe:* Necesidades operativas aprobadas.
- *Procesa:* Planifica, contrata y controla.
- *Produce:* Instalación en servicio con documentación.
- *Destinatarios:* Planta, mantenimiento, finanzas.
- *Consecuencia:* Nuevos equipos entran a la estructura de planta con su documentación.

**Permisos propuestos [P]** · aplicaciones: Web

- Proyectos industriales y de mejora *(módulo propuesto)*: consultar, crear, editar, cerrar — planta
- Solicitudes y órdenes de compra *(módulo propuesto)*: consultar, solicitar — planta
- Proveedores y evaluaciones *(módulo propuesto)*: consultar — empresa
- Presupuesto y flujo de caja *(módulo propuesto)*: consultar — planta
- Planta, áreas, líneas y equipos: consultar, crear — planta
- Gestión documental *(módulo parcial)*: consultar, crear, editar — planta
- Indicadores: consultar — planta

**Por validar con la empresa [V].** Si los proyectos tienen presupuesto propio o se cargan a centros de costo.

**Hoy en SIMA 4.1.** Ve producción e indicadores. No existe el módulo de proyectos.

---

### 22 · Especialista de sistemas industriales (OT/MES)

**Dashboard propuesto:** «Sistemas industriales» · **Canal según el Excel:** app · **Perfil SIMA:** `ing_automatizacion` · **Tipo:** Terreno · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Conecta datos de equipos con producción y sistemas empresariales sin comprometer continuidad.
- **Qué hace:** Administra captura de datos, MES, historizadores, accesos y coordinación de ciberseguridad OT.
- **Qué entrega:** Arquitectura de integración, monitoreo y procedimientos de acceso.
- **Se coordina con:** TI, automatización, calidad y operaciones.
- **Cómo medir:** Disponibilidad MES, integridad de datos y ciberincidentes.
- **Conocimientos:** Redes industriales, bases de datos y seguridad OT.
</details>

**A. Para qué existe [D].** Conecta los datos de las máquinas con SIMA sin poner en riesgo la operación. Es quien sabe si un dato llegó, cuándo y desde dónde (físico o simulado).

**B. Jornada [D]**

1. *Al comenzar:* Revisa la conectividad de los PLC y del gateway, la latencia de ingesta y los eventos rechazados.
2. *Durante:* Administra la captura de datos, las claves de dispositivo y los accesos OT.
3. *Al coordinarse:* Con TI, automatización, calidad y operaciones.
4. *Ante una anomalía:* Si se cae la comunicación o llegan datos incoherentes, aísla la fuente, registra el incidente y coordina con automatización.
5. *Al cerrar:* Registra incidencias y cambios de integración.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Qué dispositivos pueden enviar datos y con qué origen (simulado o físico). *Escala a:* Automatización y TI (ciberincidentes).

**D. Información que consulta [D].** Estado de comunicación de cada PLC; Eventos e ingesta (origen y marca de simulado); Duplicados descartados; Claves de dispositivo y accesos.

**E. Información que genera o modifica [D]**

- *Registrar:* Incidencias de integración y cambios de configuración.
- *Editar:* Estructura de planta y configuración de dispositivos.
- *Crear:* Equipos y PLC.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Datos personales, contratos y sueldos.

**G. Impacto en la empresa [D].** Si mezcla datos simulados con físicos o pierde datos, todos los indicadores de planta se vuelven poco confiables.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Comunicación de PLC y calidad del dato.
- *Distribución:* Mapa de conectividad · consola de eventos con origen · métricas de ingesta · incidencias.
- *Menú:* Inicio · Controladores · Eventos e ingesta · Estructura de planta · Incidencias
- *Tablas y formularios:* Tablas: PLC con último contacto y origen, eventos rechazados. Formularios: incidencia, alta de dispositivo.
- *Acciones rápidas:* Ver consola de eventos; Registrar incidencia; Dar de alta un PLC
- *Alertas:* PLC sin conexión; Datos físicos marcados como simulados o al revés; Ingesta con errores
- *Notificaciones:* Nuevo dispositivo conectado.
- *Estado vacío:* “Toda la ingesta funciona normalmente.”
- *Componentes especializados:* Distintivo físico/simulado, gráfico de latencia.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Disponibilidad MES | Último contacto de cada PLC | ✅ hay datos en SIMA |
| Integridad de datos | Eventos duplicados o rechazados (los duplicados se descartan pero no se cuentan) | 🟡 datos parciales |
| Ciberincidentes | Registro de incidentes OT (no existe) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Telemetría y eventos de PLC y simulador.
- *Procesa:* Valida origen, deduplica e integra.
- *Produce:* Datos confiables y trazables por origen.
- *Destinatarios:* Todas las áreas que usan indicadores de planta.
- *Consecuencia:* Los indicadores se calculan con datos de origen conocido.

**Permisos propuestos [P]** · aplicaciones: Desktop, Web

- Controladores PLC y cambios de programa: consultar, editar — planta
- Alarmas y eventos de planta: consultar — planta
- Planta, áreas, líneas y equipos: consultar, crear, editar — planta
- Mandos a distancia a PLC: consultar, registrar — planta
- SIMA PLC Simulator: consultar — planta
- Mesa de ayuda TI *(módulo propuesto)*: consultar, crear — planta
- Auditoría: consultar — planta
- Habilitaciones y competencias: consultar — propio

**Por validar con la empresa [V].** Si la gestión de claves de dispositivo debe hacerse desde SIMA o solo por configuración del servidor.

**Hoy en SIMA 4.1.** Mismo perfil que automatización; puede crear equipos. No hay métricas de ingesta ni registro de incidencias OT.

---

## Familia 4 · Mantenimiento y confiabilidad

### 23 · Jefe/a de mantenimiento

**Dashboard propuesto:** «Gestión de mantenimiento» · **Canal según el Excel:** app · **Perfil SIMA:** `jefe_mant` · **Tipo:** Terreno · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Mantiene los equipos seguros y disponibles dentro de recursos y prioridades.
- **Qué hace:** Define estrategia preventiva/predictiva, presupuesto, dotación, repuestos críticos y gestión de fallas.
- **Qué entrega:** Plan anual, backlog priorizado y presupuesto de mantenimiento.
- **Se coordina con:** Producción, compras, HSE e ingeniería.
- **Cómo medir:** Disponibilidad, mantenimiento planificado, costos y reincidencias.
- **Conocimientos:** Confiabilidad, liderazgo y gestión de activos.
</details>

**A. Para qué existe [D].** Mantiene los equipos seguros y disponibles con los recursos que tiene. Decide la estrategia (cuánto preventivo, qué predictivo, qué repuestos críticos) y responde por los resultados.

**B. Jornada [D]**

1. *Al comenzar:* Revisa equipos críticos fuera de servicio, backlog por prioridad, fallas de las últimas 24 horas y aprobaciones pendientes.
2. *Durante:* Prioriza incidencias, revisa el avance de las OT, aprueba cambios de PLC y verificaciones de cierre, y controla repuestos críticos.
3. *Al coordinarse:* Con producción (ventanas), compras (repuestos), prevención e ingeniería.
4. *Ante una anomalía:* Ante una falla de un equipo crítico, fija prioridad, asigna recursos y decide si se escala a compra urgente o a apoyo externo.
5. *Al cerrar:* Revisa indicadores del día y deja el backlog priorizado.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Prioridad del backlog, estrategia preventiva, publicación de cambios de PLC solicitados por otros, aprobación de cierres técnicos y de compras de repuestos dentro de su límite. *Escala a:* Gerencia de planta (presupuesto, dotación, detenciones largas).

**D. Información que consulta [D].** Disponibilidad por equipo; Backlog por prioridad y antigüedad; Fallas repetitivas; Técnicos y su carga; Repuestos críticos bajo mínimo; Costos de mantenimiento; MTTR y MTBF.

**E. Información que genera o modifica [D]**

- *Asignar:* Prioridades y responsables de OT.
- *Aprobar:* Cierres técnicos, cambios de PLC, solicitudes de repuestos críticos.
- *Crear:* OT preventivas y planes de mantenimiento.
- *Editar:* Estructura de equipos y criticidad.
- *Exportar:* Informe de mantenimiento.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Sueldos y contratos del personal. Ve asistencia y habilitaciones solo de su equipo.

**G. Impacto en la empresa [D].** Su priorización decide qué equipos vuelven primero a producción. Un backlog mal priorizado deja equipos críticos detenidos mientras se atienden trabajos menores.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Equipos críticos fuera de servicio, backlog crítico, fallas repetitivas y aprobaciones.
- *Distribución:* Franja (disponibilidad, backlog, fuera de servicio, MTTR) · disponibilidad más baja · backlog por prioridad · fallas repetitivas y repuestos críticos · bandeja de aprobaciones.
- *Menú:* Gestión de mantenimiento · Plan de mantenimiento · Órdenes de trabajo · Condición de activos · Automatización · Explorador · Pañol · Traspaso · Indicadores
- *Tablas y formularios:* Tablas: backlog, fallas repetitivas, repuestos críticos. Formularios: priorización, asignación, aprobación de cierre.
- *Acciones rápidas:* Planificar trabajos; Priorizar incidencia; Asignar responsable; Aprobar cierre técnico; Aprobar cambio de PLC
- *Alertas:* Equipo crítico fuera de servicio; Falla repetida en 30 días; Repuesto crítico agotado; OT crítica sin asignar
- *Notificaciones:* Cierre técnico esperando verificación; nuevo cambio de PLC; falla en equipo crítico.
- *Estado vacío:* “Sin equipos críticos detenidos ni aprobaciones pendientes.”
- *Componentes especializados:* Barras de disponibilidad, dona de backlog, bandeja de aprobaciones.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Disponibilidad | Cambios de estado de equipos | ✅ hay datos en SIMA |
| Mantenimiento planificado | OT preventivas programadas y cumplidas | 🟡 datos parciales |
| Costos | Costos de repuestos y horas (los repuestos tienen costo; las horas no) | 🟡 datos parciales |
| Reincidencias | Fallas por equipo en un período | ✅ hay datos en SIMA |

**Flujo de información [D]**

- *Recibe:* Avisos de falla, plan preventivo, indicadores, solicitudes de cambio.
- *Procesa:* Prioriza, asigna y aprueba.
- *Produce:* Backlog priorizado, OT asignadas, aprobaciones.
- *Destinatarios:* Planificador, supervisor, técnicos, producción, compras.
- *Consecuencia:* Los técnicos reciben sus OT; producción conoce cuándo vuelve el equipo.

**Permisos propuestos [P]** · aplicaciones: Desktop, Web

- Órdenes de trabajo de mantenimiento: consultar, crear, asignar, aprobar o rechazar, cerrar, exportar — planta
- Planta, áreas, líneas y equipos: consultar, crear, editar — planta
- Repuestos y pañol: consultar, editar, aprobar o rechazar — planta
- Herramientas: consultar, editar — planta
- Controladores PLC y cambios de programa: consultar, aprobar o rechazar — planta
- Mandos a distancia a PLC: consultar, registrar — planta
- Monitoreo de condición y rutas *(módulo parcial)*: consultar — planta
- Instrumentos y calibraciones *(módulo parcial)*: consultar — planta
- Alarmas y eventos de planta: consultar — planta
- Traspaso y bitácora de turno: consultar, crear — su área
- Indicadores: consultar, exportar — planta
- Asistencia y ausentismo: consultar — su equipo
- Habilitaciones y competencias: consultar, editar — su equipo
- Incidentes y acciones de seguridad: consultar — su área
- Solicitudes y órdenes de compra *(módulo propuesto)*: consultar, solicitar — planta
- Costos industriales *(módulo propuesto)*: consultar — su área
- Órdenes y registros de producción: consultar — planta

**Por validar con la empresa [V].** Límite de monto de repuestos que aprueba sin compras; Si la jefatura de mantenimiento o la gerencia de planta tiene la última palabra en cambios de PLC.

**Hoy en SIMA 4.1.** Inicio de gestión en Desktop, aprueba cambios de PLC y cierres, edita equipos. No hay costos de mano de obra ni aprobación de solicitudes de repuesto.

---

### 24 · Planificador/a o programador/a de mantenimiento

**Dashboard propuesto:** «Plan semanal de OT» · **Canal según el Excel:** app · **Perfil SIMA:** `jefe_mant` · **Tipo:** Terreno · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Prepara trabajos antes de intervenir y coordina ventanas con producción.
- **Qué hace:** Define alcance, repuestos, mano de obra, herramientas, permisos y secuencia sin improvisación.
- **Qué entrega:** Órdenes de trabajo preparadas y programa semanal.
- **Se coordina con:** Supervisores, técnicos, almacén y producción.
- **Cómo medir:** Cumplimiento del programa, trabajos listos, backlog.
- **Conocimientos:** CMMS, planificación y lectura de manuales.
</details>

**A. Para qué existe [D].** Prepara los trabajos antes de que se ejecuten (alcance, repuestos, herramientas, permisos, técnico y ventana) para que nadie improvise frente al equipo.

**B. Jornada [D]**

1. *Al comenzar:* Revisa el backlog sin programar, las OT sin técnico y la disponibilidad de técnicos y ventanas de detención.
2. *Durante:* Prepara cada OT (alcance, repuestos, herramientas, permisos), la programa en el calendario semanal y la asigna.
3. *Al coordinarse:* Con supervisores, técnicos, pañol (reserva de repuestos) y producción (ventanas).
4. *Ante una anomalía:* Si un repuesto no está o la ventana se pierde, reprograma y avisa a los afectados.
5. *Al cerrar:* Publica el programa de la semana y revisa el cumplimiento del anterior.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Fecha, técnico y secuencia de las OT dentro de la ventana acordada. *Escala a:* Jefatura de mantenimiento (conflictos de prioridad), producción (ventanas).

**D. Información que consulta [D].** Backlog y OT preparadas; Técnicos por especialidad y su carga; Habilitaciones de los técnicos; Repuestos y herramientas disponibles; Ventanas de detención.

**E. Información que genera o modifica [D]**

- *Crear:* OT preparadas con alcance y repuestos.
- *Asignar:* Técnico y fecha programada.
- *Editar:* Prioridad, especialidad y fecha.
- *Solicitar:* Reserva de repuestos al pañol.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Sueldos y contratos. No firma la ejecución técnica de las OT.

**G. Impacto en la empresa [D].** Un programa bien preparado sube el mantenimiento planificado y baja las urgencias. Si programa a un técnico sin habilitación, la OT no se puede ejecutar.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* OT sin fecha o sin técnico, y el programa de la semana.
- *Distribución:* Calendario semanal (días × técnicos) · backlog por preparar · carga por técnico · repuestos reservados.
- *Menú:* Plan semanal de OT · Backlog · Técnicos · Pañol · Explorador · Alertas
- *Tablas y formularios:* Tablas: backlog, carga por técnico. Formularios: preparación de OT (alcance, especialidad, fecha, técnico, repuestos).
- *Acciones rápidas:* Programar OT; Asignar técnico; Reservar repuestos; Reprogramar
- *Alertas:* OT sin fecha; OT sin técnico; OT programada sin repuestos; Técnico asignado sin habilitación
- *Notificaciones:* Un técnico tomó o cerró una OT programada; pañol confirma reserva.
- *Estado vacío:* “No hay OT por programar esta semana.”
- *Componentes especializados:* Calendario con arrastrar y soltar, barra de carga por técnico.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Cumplimiento del programa | OT programadas cerradas en su fecha | ✅ hay datos en SIMA |
| Trabajos listos | OT con alcance, repuestos y técnico completos | 🟡 datos parciales |
| Backlog | OT abiertas y antigüedad | ✅ hay datos en SIMA |

**Flujo de información [D]**

- *Recibe:* Backlog priorizado, disponibilidad de técnicos y repuestos.
- *Procesa:* Prepara y programa.
- *Produce:* Programa semanal y OT asignadas.
- *Destinatarios:* Técnicos, supervisor, pañol, producción.
- *Consecuencia:* Cada técnico ve sus OT del día en SIMA Desktop.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Órdenes de trabajo de mantenimiento: consultar, crear, asignar, editar — planta
- Repuestos y pañol: consultar, solicitar — planta
- Herramientas: consultar — planta
- Planta, áreas, líneas y equipos: consultar, crear, editar — planta
- Habilitaciones y competencias: consultar — su equipo
- Asistencia y ausentismo: consultar — su equipo
- Alarmas y eventos de planta: consultar — planta
- Indicadores: consultar — su área
- Programa de producción y capacidad *(módulo parcial)*: consultar — planta
- Traspaso y bitácora de turno: consultar — su área

**Por validar con la empresa [V].** Si existen ventanas de detención acordadas con producción y quién las registra.

**Hoy en SIMA 4.1.** Puede planificar (fecha, técnico, prioridad) en el backend recién agregado; no firma la ejecución. No hay reserva de repuestos ni chequeo de habilitación al asignar.

---

### 25 · Supervisor/a de mantenimiento

**Dashboard propuesto:** «Cuadrilla de mantenimiento» · **Canal según el Excel:** app · **Perfil SIMA:** `supervisor_mant` · **Tipo:** Terreno · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Dirige la ejecución segura y la calidad técnica de las intervenciones.
- **Qué hace:** Distribuye órdenes, verifica autorizaciones/aislamientos, coordina pruebas y entrega equipos a operación.
- **Qué entrega:** Cierre de trabajos, verificaciones y causas de desviaciones.
- **Se coordina con:** Técnicos, operaciones, seguridad y almacén.
- **Cómo medir:** OT cerradas correctamente, retrabajo, tiempos de reparación.
- **Conocimientos:** Diagnóstico, liderazgo técnico y control de riesgos.
</details>

**A. Para qué existe [D].** Dirige la ejecución segura y la calidad técnica de las intervenciones, y entrega los equipos a operación solo cuando están verificados.

**B. Jornada [D]**

1. *Al comenzar:* Distribuye las OT del día a su cuadrilla y verifica habilitaciones y aislamientos requeridos.
2. *Durante:* Sigue el avance, verifica bloqueos LOTO activos, coordina pruebas y revisa la documentación de cada intervención.
3. *Al coordinarse:* Con técnicos, operación (entrega del equipo), prevención y pañol.
4. *Ante una anomalía:* Si una intervención se hace sin aislamiento o se atrasa, la detiene o reasigna recursos.
5. *Al cerrar:* Verifica los cierres técnicos, registra causas de desviación y entrega equipos a operación.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Verificación de cierre técnico y liberación del equipo a operación, reasignación de OT en su cuadrilla. *Escala a:* Jefatura de mantenimiento.

**D. Información que consulta [D].** OT de su cuadrilla y su estado; Técnicos y habilitaciones; LOTO activos; Resultados de pruebas e intervenciones; Repuestos usados.

**E. Información que genera o modifica [D]**

- *Asignar:* OT a técnicos de su cuadrilla.
- *Aprobar:* Verificación de cierre técnico.
- *Registrar:* Causa de desviación y entrega del equipo a operación.
- *Editar:* Habilitaciones de su equipo (según la hoja Permisos).

**F. Lo que NO debe ver (mínimo privilegio) [D].** Sueldos, contratos y datos personales de los técnicos más allá de lo operativo.

**G. Impacto en la empresa [D].** Si verifica mal, un equipo vuelve a producción con un problema; si demora la verificación, producción espera un equipo ya reparado.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Intervenciones activas con LOTO, cierres por verificar y retrasos.
- *Distribución:* Carga de la cuadrilla · LOTO activos · cierres por verificar · retrasos.
- *Menú:* Cuadrilla de mantenimiento · Plan · Órdenes de trabajo · Explorador · Alertas · Pañol · Traspaso · Seguridad
- *Tablas y formularios:* Tablas: OT por técnico, cierres pendientes. Formularios: verificación de cierre (checklist), liberación a operación.
- *Acciones rápidas:* Asignar OT; Verificar cierre; Liberar equipo a operación; Registrar desviación
- *Alertas:* Intervención sin LOTO; OT crítica atrasada; Equipo reparado esperando liberación
- *Notificaciones:* Un técnico solicita verificación de cierre.
- *Estado vacío:* “Su cuadrilla no tiene OT activas.”
- *Componentes especializados:* Tarjetas por técnico con OT en curso y tiempo transcurrido.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| OT cerradas correctamente | Cierres verificados sin reapertura | 🟡 datos parciales |
| Retrabajo | OT reabiertas o fallas repetidas tras cierre | 🟡 datos parciales |
| Tiempos de reparación | Duración de intervenciones | ✅ hay datos en SIMA |

**Flujo de información [D]**

- *Recibe:* OT asignadas, intervenciones documentadas.
- *Procesa:* Distribuye, supervisa y verifica.
- *Produce:* Cierres verificados y equipos liberados.
- *Destinatarios:* Operación, jefatura de mantenimiento, producción.
- *Consecuencia:* El equipo vuelve a operando solo con su liberación.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Órdenes de trabajo de mantenimiento: consultar, asignar, aprobar o rechazar, cerrar — su equipo
- Planta, áreas, líneas y equipos: consultar — planta
- Controladores PLC y cambios de programa: consultar — planta
- Repuestos y pañol: consultar, editar — planta
- Herramientas: consultar, editar — planta
- Habilitaciones y competencias: consultar, editar — su equipo
- Asistencia y ausentismo: consultar — su equipo
- Traspaso y bitácora de turno: consultar, crear — su equipo
- Alarmas y eventos de planta: consultar — planta
- Mandos a distancia a PLC: consultar, registrar — planta
- Incidentes y acciones de seguridad: consultar, registrar — su área
- Indicadores: consultar — su área

**Por validar con la empresa [V].** Quién libera el equipo a operación cuando no hay supervisor de mantenimiento en el turno.

**Hoy en SIMA 4.1.** Puede firmar cierres de cualquier OT, pero el cierre deja el equipo operando sin verificación. No hay verificación ni liberación separadas.

---

### 26 · Técnico/a mecánico/a industrial

**Dashboard propuesto:** «Mis OT mecánicas» · **Canal según el Excel:** app · **Perfil SIMA:** `tecnico` · **Tipo:** Terreno · **Dotación:** 2/2

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Inspecciona, ajusta y repara sistemas mecánicos de equipos productivos.
- **Qué hace:** Trabaja con transmisiones, rodamientos, reductores, correas, bombas y sellos según procedimientos.
- **Qué entrega:** OT, mediciones y repuestos cambiados documentados.
- **Se coordina con:** Supervisor, producción y repuestos.
- **Cómo medir:** MTTR, retrabajos, cumplimiento preventivo.
- **Conocimientos:** Mecánica, alineación, lubricación y planos.
</details>

**A. Para qué existe [D].** Inspecciona, ajusta y repara los sistemas mecánicos (transmisiones, rodamientos, reductores, bombas). Su diagnóstico decide si la falla se repite.

**B. Jornada [D]**

1. *Al comenzar:* Ve sus OT asignadas por prioridad, las urgentes y los equipos que debe intervenir; revisa manuales e historial.
2. *Durante:* Confirma LOTO, diagnostica, retira repuestos con la OT, repara y registra mediciones.
3. *Al coordinarse:* Con su supervisor, producción (entrega del equipo) y pañol.
4. *Ante una anomalía:* Si necesita un repuesto que no hay, lo solicita y deja la OT en espera; si excede su autorización, escala.
5. *Al cerrar:* Documenta la intervención, retira el bloqueo y solicita la verificación de cierre.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Diagnóstico técnico y acción correctiva dentro de su especialidad. *Escala a:* Supervisor de mantenimiento (falta de repuesto, riesgo, trabajo eléctrico).

**D. Información que consulta [D].** Sus OT asignadas y las disponibles de su especialidad; Manuales y procedimientos del equipo; Historial de fallas e intervenciones; Repuestos del equipo y su stock; Herramientas disponibles; Sus habilitaciones.

**E. Información que genera o modifica [D]**

- *Registrar:* Inicio con LOTO, diagnóstico, mediciones, repuestos usados e intervención.
- *Solicitar:* Repuestos y verificación de cierre.
- *Crear:* Avisos de falla detectados en inspección.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Contratos, sueldos y datos personales de otros. No ve OT eléctricas que no le correspondan salvo para consultar.

**G. Impacto en la empresa [D].** Su registro alimenta MTTR, historial y costos. Un diagnóstico pobre provoca fallas repetidas.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* OT asignadas, urgentes y diagnósticos pendientes.
- *Distribución:* Asignadas a usted · disponibles de su especialidad · equipo en intervención con manual e historial · repuestos necesarios.
- *Menú:* Mis OT mecánicas · Órdenes de trabajo · Explorador · Alertas · Pañol · Reportar · Seguridad · Mi cargo
- *Tablas y formularios:* Formularios: flujo guiado de OT (LOTO, diagnóstico, intervención, repuestos, cierre), solicitud de repuesto.
- *Acciones rápidas:* Iniciar trabajo con LOTO; Registrar diagnóstico; Solicitar repuesto; Documentar reparación; Solicitar verificación de cierre
- *Alertas:* Trabajo sin aislamiento; Repuesto no disponible; Nueva falla mecánica crítica
- *Notificaciones:* Se le asignó una OT; pañol entregó su repuesto; su cierre fue verificado.
- *Estado vacío:* “No tiene órdenes asignadas. Puede tomar una disponible de su especialidad.”
- *Componentes especializados:* Flujo guiado paso a paso, visor de manual, historial del equipo.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| MTTR | Duración de sus intervenciones por falla | ✅ hay datos en SIMA |
| Retrabajos | Fallas repetidas en equipos que intervino | 🟡 datos parciales |
| Cumplimiento preventivo | OT preventivas asignadas cerradas a tiempo | ✅ hay datos en SIMA |

**Flujo de información [D]**

- *Recibe:* OT asignada, manual, historial, repuestos.
- *Procesa:* Diagnostica y repara.
- *Produce:* Intervención documentada, movimiento de repuestos, solicitud de verificación.
- *Destinatarios:* Supervisor, pañol, jefatura, producción.
- *Consecuencia:* El supervisor verifica y libera el equipo; el stock se descuenta.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Órdenes de trabajo de mantenimiento: consultar, registrar, cerrar — propio
- Repuestos y pañol: consultar, solicitar — planta
- Herramientas: consultar, registrar — propio
- Planta, áreas, líneas y equipos: consultar — planta
- Controladores PLC y cambios de programa: consultar — planta
- Alarmas y eventos de planta: consultar — planta
- Gestión documental *(módulo parcial)*: consultar — planta
- Incidentes y acciones de seguridad: registrar — propio
- Habilitaciones y competencias: consultar — propio

**Por validar con la empresa [V].** Si un técnico puede tomar una OT asignada a otro técnico.

**Hoy en SIMA 4.1.** Flujo guiado de OT con LOTO e intervenciones. Puede tomar cualquier OT abierta aunque esté asignada a otra persona, y el retiro de repuestos es directo, sin solicitud.

---

### 27 · Técnico/a eléctrico/a industrial

**Dashboard propuesto:** «Mis OT eléctricas» · **Canal según el Excel:** app · **Perfil SIMA:** `tecnico` · **Tipo:** Terreno · **Dotación:** 2/2

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Inspecciona y mantiene motores, tableros, circuitos y protecciones autorizadas.
- **Qué hace:** Diagnostica fallas, interpreta diagramas y mide variables con equipos adecuados y procedimientos seguros.
- **Qué entrega:** Pruebas, registros de medición y planos actualizados.
- **Se coordina con:** Supervisor, automatización y producción.
- **Cómo medir:** Fallas eléctricas, restablecimiento y reincidencias.
- **Conocimientos:** Electricidad industrial y competencias exigidas por normativa.
</details>

**A. Para qué existe [D].** Mantiene motores, tableros, circuitos y protecciones. Trabaja con energía peligrosa, así que la habilitación eléctrica y el aislamiento son condición para empezar.

**B. Jornada [D]**

1. *Al comenzar:* Ve sus OT eléctricas, confirma su habilitación de trabajo eléctrico vigente y revisa diagramas del equipo.
2. *Durante:* Aísla y bloquea, diagnostica con instrumentos calibrados, repara y registra las mediciones.
3. *Al coordinarse:* Con su supervisor, automatización (protecciones y señales) y producción.
4. *Ante una anomalía:* Si la medición indica riesgo o la protección no corresponde, detiene y escala.
5. *Al cerrar:* Registra pruebas y mediciones, actualiza planos si cambió algo y solicita verificación.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Diagnóstico eléctrico y acción dentro de su habilitación. *Escala a:* Supervisor y automatización.

**D. Información que consulta [D].** OT eléctricas; Diagramas y planos; Historial eléctrico del equipo; Protecciones; Sus habilitaciones; Instrumentos calibrados disponibles.

**E. Información que genera o modifica [D]**

- *Registrar:* Pruebas, mediciones (aislamiento, corriente, tensión) e intervención.
- *Solicitar:* Repuestos y verificación de cierre.
- *Editar:* Planos eléctricos (propuesta de actualización).

**F. Lo que NO debe ver (mínimo privilegio) [D].** Contratos, sueldos y datos personales de otros.

**G. Impacto en la empresa [D].** Sus mediciones previenen fallas de motores y riesgos eléctricos para las personas.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* OT eléctricas, habilitación vigente e instrumentos calibrados.
- *Distribución:* Asignadas · disponibles eléctricas · habilitación · registro de mediciones.
- *Menú:* Mis OT eléctricas · Órdenes de trabajo · Explorador · Alertas · Pañol · Reportar · Seguridad · Mi cargo
- *Tablas y formularios:* Formularios: flujo guiado de OT con registro de mediciones eléctricas.
- *Acciones rápidas:* Iniciar con LOTO; Registrar medición; Solicitar repuesto; Solicitar verificación
- *Alertas:* Habilitación eléctrica vencida; Instrumento sin calibración; Falla eléctrica crítica
- *Notificaciones:* Se le asignó una OT eléctrica.
- *Estado vacío:* “No tiene órdenes eléctricas asignadas.”
- *Componentes especializados:* Tabla de mediciones con límites.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Fallas eléctricas | OT de especialidad eléctrica por falla | ✅ hay datos en SIMA |
| Restablecimiento | Duración de intervenciones eléctricas | ✅ hay datos en SIMA |
| Reincidencias | Fallas eléctricas repetidas por equipo | 🟡 datos parciales |

**Flujo de información [D]**

- *Recibe:* OT eléctrica, diagramas.
- *Procesa:* Aísla, mide y repara.
- *Produce:* Mediciones e intervención documentadas.
- *Destinatarios:* Supervisor, automatización, jefatura.
- *Consecuencia:* El historial eléctrico del equipo queda completo.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Órdenes de trabajo de mantenimiento: consultar, registrar, cerrar — propio
- Repuestos y pañol: consultar, solicitar — planta
- Herramientas: consultar, registrar — propio
- Planta, áreas, líneas y equipos: consultar — planta
- Controladores PLC y cambios de programa: consultar — planta
- Alarmas y eventos de planta: consultar — planta
- Gestión documental *(módulo parcial)*: consultar — planta
- Incidentes y acciones de seguridad: registrar — propio
- Habilitaciones y competencias: consultar — propio

**Por validar con la empresa [V].** Si iniciar una OT eléctrica debe bloquearse cuando la habilitación eléctrica está vencida.

**Hoy en SIMA 4.1.** Mismo inicio técnico filtrado por especialidad eléctrica. No se verifica la habilitación al iniciar.

---

### 28 · Técnico/a electromecánico/a

**Dashboard propuesto:** «Mis OT electromecánicas» · **Canal según el Excel:** app · **Perfil SIMA:** `tecnico` · **Tipo:** Terreno · **Dotación:** 2/2

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Atiende fallas combinadas de mecanismos, motores, sensores y accionamientos.
- **Qué hace:** Ejecuta mantenimiento multifunción en equipos integrados, escalando tareas que exceden su autorización.
- **Qué entrega:** Órdenes de trabajo y reportes de diagnóstico.
- **Se coordina con:** Mantenimiento, automatización y operación.
- **Cómo medir:** Tiempo de restablecimiento y mantenimiento efectivo.
- **Conocimientos:** Mecánica, electricidad, neumática e interpretación técnica.
</details>

**A. Para qué existe [D].** Atiende fallas que combinan mecanismos, motores, sensores y accionamientos, y sabe cuándo una tarea excede su autorización.

**B. Jornada [D]**

1. *Al comenzar:* Ve sus OT, que pueden ser mecánicas, eléctricas o electromecánicas, y revisa el historial del equipo.
2. *Durante:* Diagnostica el sistema completo, interviene dentro de su autorización y registra.
3. *Al coordinarse:* Con mantenimiento, automatización y operación.
4. *Ante una anomalía:* Si la tarea excede su autorización, la escala sin intervenir.
5. *Al cerrar:* Documenta el diagnóstico y solicita verificación.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Diagnóstico integral y si la tarea está dentro de su autorización. *Escala a:* Supervisor, técnico eléctrico o automatización según la tarea.

**D. Información que consulta [D].** OT de varias especialidades; Manuales e historial; Sensores y señales del equipo; Repuestos.

**E. Información que genera o modifica [D]**

- *Registrar:* Diagnóstico e intervención.
- *Solicitar:* Repuestos, apoyo de otra especialidad y verificación.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Contratos, sueldos y datos personales de otros.

**G. Impacto en la empresa [D].** Reduce el tiempo de restablecimiento en equipos integrados al evitar traspasos entre especialidades.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* OT asignadas de las tres especialidades.
- *Distribución:* Asignadas · disponibles por especialidad · equipo con señales en vivo.
- *Menú:* Mis OT electromecánicas · Órdenes de trabajo · Explorador · Alertas · Pañol · Reportar · Seguridad · Mi cargo
- *Tablas y formularios:* Formularios: flujo guiado de OT, solicitud de apoyo.
- *Acciones rápidas:* Iniciar con LOTO; Registrar diagnóstico; Pedir apoyo de especialidad; Solicitar verificación
- *Alertas:* Tarea fuera de su autorización; Repuesto no disponible
- *Notificaciones:* Se le asignó una OT.
- *Estado vacío:* “No tiene órdenes asignadas.”
- *Componentes especializados:* Vista de señales del equipo durante la intervención.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Tiempo de restablecimiento | Duración de intervenciones | ✅ hay datos en SIMA |
| Mantenimiento efectivo | OT cerradas sin reapertura | 🟡 datos parciales |

**Flujo de información [D]**

- *Recibe:* OT multifunción.
- *Procesa:* Diagnostica y repara o escala.
- *Produce:* Diagnóstico e intervención.
- *Destinatarios:* Supervisor, otras especialidades.
- *Consecuencia:* Menos traspasos entre especialidades.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Órdenes de trabajo de mantenimiento: consultar, registrar, cerrar — propio
- Repuestos y pañol: consultar, solicitar — planta
- Herramientas: consultar, registrar — propio
- Planta, áreas, líneas y equipos: consultar — planta
- Controladores PLC y cambios de programa: consultar — planta
- Alarmas y eventos de planta: consultar — planta
- Gestión documental *(módulo parcial)*: consultar — planta
- Incidentes y acciones de seguridad: registrar — propio
- Habilitaciones y competencias: consultar — propio

**Por validar con la empresa [V].** Qué tareas eléctricas puede hacer sin un técnico eléctrico.

**Hoy en SIMA 4.1.** Inicio técnico con varias especialidades. Sin solicitud de apoyo entre especialidades.

---

### 29 · Técnico/a de lubricación o confiabilidad

**Dashboard propuesto:** «Condición de activos» · **Canal según el Excel:** app · **Perfil SIMA:** `confiabilidad` · **Tipo:** Terreno · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Controla condiciones de lubricación y detecta degradaciones tempranas.
- **Qué hace:** Ejecuta rutas de lubricación, muestreo, inspección y análisis de tendencias según criticidad.
- **Qué entrega:** Rutas completadas, análisis de condición y alertas.
- **Se coordina con:** Mantenimiento, almacén y laboratorio externo.
- **Cómo medir:** Fallas por lubricación, adherencia a rutas, hallazgos resueltos.
- **Conocimientos:** Lubricantes, inspección y análisis de condición.
</details>

**A. Para qué existe [D].** Detecta la degradación antes de que se convierta en falla, mediante rutas de lubricación, muestreo e inspección de tendencias.

**B. Jornada [D]**

1. *Al comenzar:* Revisa su ruta del día y los equipos con tendencias de vibración o temperatura al alza.
2. *Durante:* Ejecuta la ruta, lubrica, toma muestras y registra hallazgos.
3. *Al coordinarse:* Con mantenimiento (hallazgos), almacén (lubricantes) y laboratorio externo.
4. *Ante una anomalía:* Si una tendencia supera el umbral de aviso, crea un aviso con evidencia para planificación.
5. *Al cerrar:* Registra la ruta completada y los hallazgos abiertos.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Si un hallazgo amerita una OT y con qué prioridad sugerida. *Escala a:* Planificador y jefatura de mantenimiento.

**D. Información que consulta [D].** Rutas y puntos de inspección; Tendencias de vibración y temperatura; Historial de lubricación; Lubricantes disponibles.

**E. Información que genera o modifica [D]**

- *Registrar:* Rutas ejecutadas, mediciones y hallazgos.
- *Crear:* Avisos de degradación con evidencia.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Datos personales, sueldos. No cambia parámetros de máquina.

**G. Impacto en la empresa [D].** Un hallazgo a tiempo convierte una falla con detención larga en una intervención programada.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Equipos más cerca del límite y ruta del día.
- *Distribución:* Ranking de equipos por cercanía al límite · ruta del día · tendencias · hallazgos abiertos.
- *Menú:* Condición de activos · Rutas · Órdenes de trabajo · Explorador · Alertas · Reportar
- *Tablas y formularios:* Tablas: puntos de la ruta, hallazgos. Formularios: medición en punto, hallazgo con prioridad sugerida.
- *Acciones rápidas:* Ejecutar ruta; Registrar hallazgo; Crear aviso de degradación
- *Alertas:* Vibración o temperatura sobre aviso; Ruta atrasada
- *Notificaciones:* Planificación programó una OT por su hallazgo.
- *Estado vacío:* “No hay equipos con tendencias anormales.”
- *Componentes especializados:* Barras de cercanía al límite, gráfico de tendencia con umbrales.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Fallas por lubricación | Causa de falla en intervenciones (texto libre, sin catálogo) | 🟡 datos parciales |
| Adherencia a rutas | Rutinas ejecutadas a tiempo | ✅ hay datos en SIMA |
| Hallazgos resueltos | Avisos creados y su OT cerrada | 🟡 datos parciales |

**Flujo de información [D]**

- *Recibe:* Rutas, tendencias de sensores.
- *Procesa:* Inspecciona y analiza tendencias.
- *Produce:* Rutas cumplidas, hallazgos y avisos.
- *Destinatarios:* Planificador, jefatura de mantenimiento.
- *Consecuencia:* Se programan intervenciones antes de la falla.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Monitoreo de condición y rutas *(módulo parcial)*: consultar, registrar — planta
- Rutinas y checklist: consultar, registrar — planta
- Órdenes de trabajo de mantenimiento: consultar, crear — planta
- Planta, áreas, líneas y equipos: consultar — planta
- Alarmas y eventos de planta: consultar — planta
- Repuestos y pañol: consultar, solicitar — planta
- Incidentes y acciones de seguridad: registrar — propio
- Habilitaciones y competencias: consultar — propio

**Por validar con la empresa [V].** Umbral de aviso predictivo por tipo de equipo.

**Hoy en SIMA 4.1.** Inicio de condición en Desktop con ranking por cercanía al límite y rutinas. No hay rutas con puntos ni hallazgos estructurados.

---

### 30 · Encargado/a de repuestos y pañol

**Dashboard propuesto:** «Pañol de repuestos» · **Canal según el Excel:** app · **Perfil SIMA:** `panol` · **Tipo:** Terreno · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Garantiza disponibilidad y trazabilidad de materiales de mantenimiento.
- **Qué hace:** Controla mínimos, equivalencias aprobadas, ubicación, salidas y obsolescencia.
- **Qué entrega:** Inventario de repuestos, kardex y alertas de quiebre.
- **Se coordina con:** Mantenimiento, compras, proveedores y bodega.
- **Cómo medir:** Disponibilidad de críticos, exactitud del stock, rotación.
- **Conocimientos:** Codificación, almacenes técnicos y ERP.
</details>

**A. Para qué existe [D].** Garantiza que el repuesto esté cuando el técnico lo necesita y que cada salida quede trazada a una OT.

**B. Jornada [D]**

1. *Al comenzar:* Revisa repuestos bajo mínimo, críticos agotados y solicitudes de los técnicos.
2. *Durante:* Entrega repuestos contra OT, registra devoluciones y herramientas, y controla ubicaciones.
3. *Al coordinarse:* Con mantenimiento, compras, proveedores y bodega.
4. *Ante una anomalía:* Si un crítico se agota o una OT programada no tiene stock, avisa al planificador y solicita compra.
5. *Al cerrar:* Concilia salidas del día y deja el kardex al día.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Entrega o rechazo de una solicitud (sin OT no hay salida), equivalencias aprobadas. *Escala a:* Jefatura de mantenimiento (críticos), compras (reposición).

**D. Información que consulta [D].** Inventario de repuestos con mínimos; Solicitudes pendientes; OT programadas y sus repuestos; Kardex; Herramientas retiradas.

**E. Información que genera o modifica [D]**

- *Registrar:* Entradas, salidas contra OT, devoluciones y herramientas retiradas.
- *Aprobar:* Solicitudes de repuesto (entregar o rechazar con motivo).
- *Solicitar:* Reposición a compras.
- *Editar:* Mínimos y ubicaciones.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Nóminas, datos bancarios, contratos.

**G. Impacto en la empresa [D].** Un quiebre de un crítico alarga la detención; una salida sin OT descuadra el costo y el stock.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Solicitudes pendientes y críticos bajo mínimo.
- *Distribución:* Solicitudes por atender · bajo mínimo · OT de la semana sin stock · herramientas fuera.
- *Menú:* Pañol de repuestos · Solicitudes · Inventario · Herramientas · Explorador · Alertas · Mi cargo
- *Tablas y formularios:* Tablas: solicitudes, stock bajo mínimo, kardex. Formularios: entrega contra OT, ingreso, devolución.
- *Acciones rápidas:* Entregar repuesto; Registrar ingreso; Solicitar reposición; Ajustar mínimo
- *Alertas:* Crítico agotado; Stock bajo mínimo; OT programada sin stock
- *Notificaciones:* Un técnico solicitó un repuesto; el planificador reservó repuestos.
- *Estado vacío:* “No hay solicitudes pendientes.”
- *Componentes especializados:* Kardex por repuesto, indicador de cobertura.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Disponibilidad de críticos | Repuestos críticos con stock sobre mínimo | ✅ hay datos en SIMA |
| Exactitud del stock | Conteos físicos (no existen) | ⛔ sin fuente en SIMA |
| Rotación | Movimientos de salida por período | ✅ hay datos en SIMA |

**Flujo de información [D]**

- *Recibe:* Solicitudes y reservas con OT.
- *Procesa:* Verifica stock y entrega.
- *Produce:* Movimientos de inventario trazados a la OT.
- *Destinatarios:* Técnicos, planificador, compras, costos.
- *Consecuencia:* El stock baja y la OT acumula su costo de repuestos.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Repuestos y pañol: consultar, registrar, editar, aprobar o rechazar — planta
- Herramientas: consultar, registrar, editar — planta
- Órdenes de trabajo de mantenimiento: consultar — planta
- Solicitudes y órdenes de compra *(módulo propuesto)*: consultar, solicitar — planta
- Planta, áreas, líneas y equipos: consultar — planta
- Incidentes y acciones de seguridad: registrar — propio
- Habilitaciones y competencias: consultar — propio

**Por validar con la empresa [V].** Si las equivalencias de repuestos se registran en SIMA.

**Hoy en SIMA 4.1.** Inventario con mínimos y egreso obligatorio con OT. No hay solicitudes ni reservas; el técnico retira directamente.

---

## Familia 5 · Calidad, laboratorio y metrología

### 31 · Jefe/a o gerente de calidad

**Dashboard propuesto:** «Gestión de calidad» · **Canal según el Excel:** web · **Perfil SIMA:** `calidad_gestion` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Define el sistema de calidad y tiene autoridad para escalar incumplimientos y gestionar liberaciones según procedimiento.
- **Qué hace:** Dirige auditorías, no conformidades, reclamos y estándares; coordina criterios técnicos con clientes.
- **Qué entrega:** Plan de calidad, indicadores, auditorías y acciones correctivas.
- **Se coordina con:** Planta, comercial, producción y proveedores.
- **Cómo medir:** Reclamos, defectos, costos de no calidad y auditorías.
- **Conocimientos:** Sistema de calidad, análisis causal y comunicación.
</details>

**A. Para qué existe [D].** Define el sistema de calidad y tiene la autoridad para retener o liberar producto. Es el contrapeso de producción cuando un lote no cumple.

**B. Jornada [D]**

1. *Al comenzar:* Revisa lotes retenidos, no conformidades abiertas por severidad y reclamos de clientes.
2. *Durante:* Dirige análisis de NC, decide liberaciones o rechazos, prepara auditorías y revisa acciones correctivas.
3. *Al coordinarse:* Con planta, comercial (reclamos), producción y proveedores.
4. *Ante una anomalía:* Ante un reclamo grave o un defecto crítico, retiene los lotes relacionados, convoca el análisis y comunica a comercial.
5. *Al cerrar:* Revisa el avance de acciones correctivas y el costo de no calidad.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Liberar o rechazar lotes retenidos, cerrar no conformidades, aceptar acciones correctivas. *Escala a:* Gerencia de planta y comercial (reclamos de clientes clave).

**D. Información que consulta [D].** Lotes retenidos y NC abiertas; Reclamos de clientes; Defectos por producto y línea; Auditorías y hallazgos; Acciones correctivas y su avance.

**E. Información que genera o modifica [D]**

- *Aprobar:* Liberación o rechazo de lotes.
- *Cerrar:* No conformidades y acciones correctivas.
- *Crear:* Planes de auditoría y planes de calidad.
- *Exportar:* Indicadores de calidad.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Sueldos, contratos y datos personales.

**G. Impacto en la empresa [D].** Su decisión determina si un lote se despacha, se retrabaja o se descarta. Una liberación indebida termina en reclamo.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Lotes retenidos esperando decisión y NC críticas.
- *Distribución:* Franja (lotes retenidos, NC abiertas, reclamos, costo de no calidad) · bandeja de liberación · NC por severidad · acciones correctivas.
- *Menú:* Inicio · Liberación de lotes · No conformidades · Reclamos · Auditorías · Acciones correctivas · Indicadores
- *Tablas y formularios:* Tablas: lotes retenidos, NC, acciones. Formularios: decisión de liberación con fundamento, cierre de NC.
- *Acciones rápidas:* Liberar lote; Rechazar lote; Cerrar NC; Programar auditoría
- *Alertas:* Lote retenido más de 24 horas; NC crítica abierta; Reclamo de cliente
- *Notificaciones:* Inspección registró una NC; acción correctiva vencida.
- *Estado vacío:* “No hay lotes retenidos ni NC abiertas.”
- *Componentes especializados:* Bandeja de liberación, Pareto de defectos.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Reclamos | Reclamos de clientes (no existen) | ⛔ sin fuente en SIMA |
| Defectos | Rechazos en producción y NC | ✅ hay datos en SIMA |
| Costos de no calidad | Costo de rechazos y retrabajos (no existe costo) | ⛔ sin fuente en SIMA |
| Auditorías | Auditorías y hallazgos (no existen) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* NC de inspección, reclamos, resultados de ensayos.
- *Procesa:* Analiza riesgo y decide.
- *Produce:* Lotes liberados o rechazados, NC cerradas, acciones correctivas.
- *Destinatarios:* Producción, despacho, comercial, proveedores.
- *Consecuencia:* Un lote liberado puede despacharse; uno rechazado se segrega.

**Permisos propuestos [P]** · aplicaciones: Web

- No conformidades y lotes: consultar, crear, aprobar o rechazar, cerrar, exportar — planta
- Inspecciones, ensayos y planes de control *(módulo propuesto)*: consultar — planta
- Órdenes y registros de producción: consultar — planta
- Despachos y transporte: consultar — planta
- Pedidos y clientes *(módulo propuesto)*: consultar — empresa
- Proveedores y evaluaciones *(módulo propuesto)*: consultar — empresa
- Gestión documental *(módulo parcial)*: consultar, aprobar o rechazar — planta
- Indicadores: consultar — planta
- Instrumentos y calibraciones *(módulo parcial)*: consultar — planta

**Por validar con la empresa [V].** Si solo la jefatura de calidad libera o también ingeniería de calidad en su ausencia.

**Hoy en SIMA 4.1.** Analiza NC y libera o rechaza lotes en la web. No hay reclamos, auditorías ni acciones correctivas con seguimiento.

---

### 32 · Ingeniero/a de calidad

**Dashboard propuesto:** «Ingeniería de calidad» · **Canal según el Excel:** web · **Perfil SIMA:** `calidad_gestion` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Diseña métodos de aseguramiento y reducción de defectos.
- **Qué hace:** Define planes de control, muestreo, análisis estadístico, causas raíz y validaciones.
- **Qué entrega:** Plan de control, análisis de capacidad y 8D/acciones.
- **Se coordina con:** Procesos, producción, proveedores y clientes.
- **Cómo medir:** PPM, Cpk cuando aplica, repetición de defectos.
- **Conocimientos:** Estadística, metrología y control de procesos.
</details>

**A. Para qué existe [D].** Diseña cómo se asegura la calidad (planes de control, muestreo, estadística) y encuentra la causa raíz de los defectos.

**B. Jornada [D]**

1. *Al comenzar:* Revisa defectos repetidos y NC en análisis asignadas a usted.
2. *Durante:* Define planes de control y muestreo, hace análisis estadístico y lidera 8D.
3. *Al coordinarse:* Con procesos, producción, proveedores y clientes.
4. *Ante una anomalía:* Si un defecto se repite, abre el análisis de causa raíz y propone acciones.
5. *Al cerrar:* Actualiza el estado de los 8D y planes de control.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Contenido de los planes de control y del análisis de causa. *Escala a:* Jefatura de calidad (liberaciones).

**D. Información que consulta [D].** Mediciones e inspecciones; Defectos por producto; NC y su historial; Especificaciones de producto.

**E. Información que genera o modifica [D]**

- *Crear:* Planes de control y muestreo.
- *Registrar:* Análisis de causa (8D) y de capacidad.
- *Editar:* Acciones correctivas propuestas.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Sueldos, contratos y datos personales.

**G. Impacto en la empresa [D].** Un buen plan de control detecta el defecto en línea y no en el cliente.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* NC en análisis y defectos repetidos.
- *Distribución:* NC asignadas · gráficos de control · planes de control vigentes · 8D en curso.
- *Menú:* Inicio · No conformidades · Planes de control · Análisis estadístico · Producción
- *Tablas y formularios:* Tablas: NC, planes de control. Formularios: 8D, plan de control, análisis de capacidad.
- *Acciones rápidas:* Analizar NC; Crear plan de control; Registrar 8D
- *Alertas:* Defecto repetido; Proceso fuera de control
- *Notificaciones:* Nueva NC asignada.
- *Estado vacío:* “No hay NC en análisis.”
- *Componentes especializados:* Gráfico de control, histograma de capacidad.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| PPM | Unidades defectuosas por millón | ✅ hay datos en SIMA |
| Cpk cuando aplica | Mediciones dimensionales (no se registran) | ⛔ sin fuente en SIMA |
| Repetición de defectos | NC por producto y causa | 🟡 datos parciales |

**Flujo de información [D]**

- *Recibe:* Inspecciones, NC, especificaciones.
- *Procesa:* Analiza estadística y causas.
- *Produce:* Planes de control, 8D, acciones.
- *Destinatarios:* Producción, procesos, jefatura de calidad.
- *Consecuencia:* Cambian los controles en línea.

**Permisos propuestos [P]** · aplicaciones: Web

- No conformidades y lotes: consultar, registrar, editar — planta
- Inspecciones, ensayos y planes de control *(módulo propuesto)*: consultar, crear, editar — planta
- Órdenes y registros de producción: consultar — planta
- Especificaciones, BOM y cambios de ingeniería *(módulo propuesto)*: consultar — empresa
- Gestión documental *(módulo parcial)*: consultar, crear — planta
- Indicadores: consultar — planta
- Proveedores y evaluaciones *(módulo propuesto)*: consultar — empresa

**Por validar con la empresa [V].** Qué productos requieren estudio de capacidad.

**Hoy en SIMA 4.1.** Analiza NC en la web. No hay planes de control, mediciones ni 8D.

---

### 33 · Inspector/a o técnico/a de control de calidad

**Dashboard propuesto:** «Inspección de calidad» · **Canal según el Excel:** app · **Perfil SIMA:** `calidad_terreno` · **Tipo:** Terreno · **Dotación:** 3/3

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Mide, inspecciona y registra si materiales y productos cumplen requisitos.
- **Qué hace:** Toma muestras, aplica instrumentos calibrados, identifica y segrega no conformes y registra resultados.
- **Qué entrega:** Registros de inspección, etiquetas de estado y reportes.
- **Se coordina con:** Producción, bodega, calidad e ingeniería.
- **Cómo medir:** Defectos detectados, inspecciones a tiempo, falsos rechazos.
- **Conocimientos:** Planos, criterios de aceptación e instrumentos.
</details>

**A. Para qué existe [D].** Mide e inspecciona materiales y productos con instrumentos calibrados, y separa lo que no cumple.

**B. Jornada [D]**

1. *Al comenzar:* Revisa los lotes por inspeccionar del turno y que sus instrumentos tengan la calibración vigente.
2. *Durante:* Toma muestras, mide, registra resultados y etiqueta el estado (conforme, retenido).
3. *Al coordinarse:* Con producción, bodega (recepción), calidad e ingeniería.
4. *Ante una anomalía:* Si una muestra sale de tolerancia, retiene el lote, registra la NC y avisa a producción y calidad.
5. *Al cerrar:* Deja los registros de inspección completos y los lotes con estado.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Retener un lote por resultado fuera de criterio (la liberación final la decide la jefatura). *Escala a:* Jefatura e ingeniería de calidad.

**D. Información que consulta [D].** Lotes en producción y recepción; Criterios de aceptación; Instrumentos y su vigencia; NC abiertas.

**E. Información que genera o modifica [D]**

- *Registrar:* Inspecciones y mediciones, NC y retención.
- *Crear:* No conformidades.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Sueldos, contratos y datos personales.

**G. Impacto en la empresa [D].** Una NC registrada a tiempo evita que el lote avance a embalaje o despacho.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Lotes por inspeccionar e instrumentos vencidos.
- *Distribución:* Lotes del turno · registro de inspección · NC abiertas · instrumentos.
- *Menú:* Inspección de calidad · Lotes · No conformidades · Instrumentos · Seguridad · Mi cargo
- *Tablas y formularios:* Formularios: inspección con criterio y resultado, NC con evidencia.
- *Acciones rápidas:* Registrar inspección; Retener lote; Registrar NC
- *Alertas:* Muestra fuera de tolerancia; Lote sin inspección; Instrumento vencido
- *Notificaciones:* Jefatura liberó o rechazó un lote que usted retuvo.
- *Estado vacío:* “No hay lotes por inspeccionar en este turno.”
- *Componentes especializados:* Formulario de inspección con criterios del producto.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Defectos detectados | NC registradas por inspección | ✅ hay datos en SIMA |
| Inspecciones a tiempo | Lotes inspeccionados contra plan (no hay plan) | ⛔ sin fuente en SIMA |
| Falsos rechazos | NC liberadas sin defecto real | 🟡 datos parciales |

**Flujo de información [D]**

- *Recibe:* Lotes producidos o recibidos.
- *Procesa:* Inspecciona contra criterios.
- *Produce:* Registros, NC y lotes retenidos.
- *Destinatarios:* Jefatura de calidad, producción, bodega.
- *Consecuencia:* El lote queda retenido hasta la decisión.

**Permisos propuestos [P]** · aplicaciones: Desktop

- No conformidades y lotes: consultar, crear, registrar — planta
- Inspecciones, ensayos y planes de control *(módulo propuesto)*: consultar, registrar — planta
- Órdenes y registros de producción: consultar — planta
- Instrumentos y calibraciones *(módulo parcial)*: consultar — planta
- Herramientas: consultar — planta
- Incidentes y acciones de seguridad: registrar — propio
- Habilitaciones y competencias: consultar — propio

**Por validar con la empresa [V].** Si el inspector puede retener sin aprobación.

**Hoy en SIMA 4.1.** Inicio de calidad en Desktop y registro de NC. No hay registro de inspecciones conformes ni plan de inspección.

---

### 34 · Laboratorista / analista de ensayos

**Dashboard propuesto:** «Mis ensayos» · **Canal según el Excel:** app · **Perfil SIMA:** `calidad_terreno` · **Tipo:** Terreno · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Evalúa propiedades físicas, químicas o funcionales según la industria.
- **Qué hace:** Prepara muestras, opera equipos de ensayo, aplica métodos validados y documenta resultados.
- **Qué entrega:** Informes de ensayo y trazabilidad de muestras.
- **Se coordina con:** Calidad, I+D, operaciones y proveedores.
- **Cómo medir:** Ensayos a tiempo, repetibilidad, cumplimiento del método.
- **Conocimientos:** Técnicas de laboratorio y seguridad de sustancias.
</details>

**A. Para qué existe [D].** Evalúa propiedades del producto o la materia prima en laboratorio con métodos validados, y deja la trazabilidad de cada muestra.

**B. Jornada [D]**

1. *Al comenzar:* Revisa las muestras recibidas y los ensayos pendientes por prioridad.
2. *Durante:* Prepara muestras, opera equipos de ensayo y registra resultados.
3. *Al coordinarse:* Con calidad, I+D, operaciones y proveedores.
4. *Ante una anomalía:* Si un resultado no cumple, lo informa a calidad para la NC y conserva la contramuestra.
5. *Al cerrar:* Emite los informes de ensayo del día.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Validez del ensayo según el método. *Escala a:* Jefatura de calidad.

**D. Información que consulta [D].** Muestras y su origen (lote); Métodos de ensayo; Especificaciones; Equipos de laboratorio y su calibración.

**E. Información que genera o modifica [D]**

- *Registrar:* Muestras, ensayos y resultados.
- *Crear:* Informes de ensayo.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Sueldos, contratos y datos personales.

**G. Impacto en la empresa [D].** Sus resultados permiten liberar o rechazar lotes y evaluar proveedores.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Ensayos pendientes y resultados fuera de especificación.
- *Distribución:* Cola de muestras · registro de ensayo · resultados recientes.
- *Menú:* Mis ensayos · Muestras · Resultados · Instrumentos · Mi cargo
- *Tablas y formularios:* Formularios: recepción de muestra, ensayo con método y resultado.
- *Acciones rápidas:* Registrar muestra; Registrar resultado; Emitir informe
- *Alertas:* Resultado fuera de especificación; Ensayo atrasado
- *Notificaciones:* Nueva muestra recibida.
- *Estado vacío:* “No hay muestras pendientes.”
- *Componentes especializados:* Cola de muestras con prioridad.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Ensayos a tiempo | Muestras con fecha de recepción y resultado (no existen) | ⛔ sin fuente en SIMA |
| Repetibilidad | Resultados repetidos de la misma muestra (no existen) | ⛔ sin fuente en SIMA |
| Cumplimiento del método | Ensayos con método registrado (no existen) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Muestras de producción o recepción.
- *Procesa:* Ensaya.
- *Produce:* Informe de ensayo trazado al lote.
- *Destinatarios:* Calidad, compras, proveedores.
- *Consecuencia:* Calidad decide la liberación con evidencia.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Inspecciones, ensayos y planes de control *(módulo propuesto)*: consultar, registrar — planta
- No conformidades y lotes: consultar, registrar — planta
- Instrumentos y calibraciones *(módulo parcial)*: consultar — planta
- Órdenes y registros de producción: consultar — planta
- Incidentes y acciones de seguridad: registrar — propio
- Habilitaciones y competencias: consultar — propio

**Por validar con la empresa [V].** Qué ensayos se hacen internamente y cuáles en laboratorio externo.

**Hoy en SIMA 4.1.** Inicio de calidad en Desktop. No existe el registro de muestras ni ensayos.

---

### 35 · Especialista en metrología

**Dashboard propuesto:** «Metrología» · **Canal según el Excel:** app · **Perfil SIMA:** `instrumentacion` · **Tipo:** Terreno · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Administra la confiabilidad de los equipos de medición del proceso.
- **Qué hace:** Establece inventario, calibraciones, verificación, identificación y acciones ante equipos fuera de tolerancia.
- **Qué entrega:** Plan maestro de calibración y trazabilidad metrológica.
- **Se coordina con:** Laboratorio, calidad, mantenimiento y compras.
- **Cómo medir:** Calibraciones vigentes, incertidumbre acorde al uso.
- **Conocimientos:** Metrología, instrumentos y registros.
</details>

**A. Para qué existe [D].** Administra la confiabilidad de todos los equipos de medición. Si un instrumento está fuera de tolerancia, sabe qué mediciones quedaron en duda.

**B. Jornada [D]**

1. *Al comenzar:* Revisa el plan maestro de calibración, vencimientos y equipos fuera de tolerancia.
2. *Durante:* Verifica y calibra, identifica los equipos y gestiona certificados externos.
3. *Al coordinarse:* Con laboratorio, calidad, mantenimiento y compras.
4. *Ante una anomalía:* Si un equipo sale de tolerancia, lo bloquea para uso y evalúa el impacto en las mediciones hechas con él.
5. *Al cerrar:* Actualiza el plan y los certificados.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Bloquear o liberar un instrumento para uso. *Escala a:* Jefatura de calidad (impacto en producto).

**D. Información que consulta [D].** Inventario de instrumentos; Plan de calibración; Certificados; Tolerancias e incertidumbre.

**E. Información que genera o modifica [D]**

- *Registrar:* Verificaciones y calibraciones con resultado.
- *Editar:* Plan maestro de calibración e identificación de equipos.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Sueldos, contratos y datos personales.

**G. Impacto en la empresa [D].** Sin trazabilidad metrológica, las mediciones de calidad no son defendibles ante un cliente.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Vencidos, fuera de tolerancia y próximos 30 días.
- *Distribución:* Plan maestro (calendario) · vencidos · fuera de tolerancia · certificados.
- *Menú:* Metrología · Plan de calibración · Instrumentos · Mis OT · Alertas
- *Tablas y formularios:* Tablas: instrumentos con estado e incertidumbre. Formularios: calibración, bloqueo de instrumento.
- *Acciones rápidas:* Registrar calibración; Bloquear instrumento; Adjuntar certificado
- *Alertas:* Instrumento vencido en uso; Fuera de tolerancia
- *Notificaciones:* Instrumento devuelto al pañol con calibración por vencer.
- *Estado vacío:* “Todos los instrumentos están vigentes.”
- *Componentes especializados:* Calendario de calibraciones.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Calibraciones vigentes | Fechas de calibración | ✅ hay datos en SIMA |
| Incertidumbre acorde al uso | Incertidumbre por instrumento (no se registra) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Instrumentos y plan.
- *Procesa:* Calibra y evalúa.
- *Produce:* Plan y trazabilidad metrológica.
- *Destinatarios:* Calidad, laboratorio, mantenimiento, pañol.
- *Consecuencia:* Un instrumento bloqueado no se puede retirar.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Instrumentos y calibraciones *(módulo parcial)*: consultar, registrar, editar — planta
- Herramientas: consultar, editar — planta
- Órdenes de trabajo de mantenimiento: consultar, registrar, cerrar — propio
- No conformidades y lotes: consultar — planta
- Planta, áreas, líneas y equipos: consultar — planta
- Habilitaciones y competencias: consultar — propio

**Por validar con la empresa [V].** Si se gestionarán certificados digitales de calibración externa.

**Hoy en SIMA 4.1.** Calibra herramientas y ve vencimientos. Sin incertidumbre, certificados ni bloqueo por tolerancia.

---

## Familia 6 · Planificación, abastecimiento y logística

### 36 · Planificador/a de producción (PPC)

**Dashboard propuesto:** «Programa de producción» · **Canal según el Excel:** web · **Perfil SIMA:** `produccion_ing` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Traduce pedidos y pronósticos en órdenes factibles según capacidad y materiales.
- **Qué hace:** Secuencia lotes, revisa restricciones, fechas, inventario en proceso y reprogramaciones.
- **Qué entrega:** Plan maestro/semanal, órdenes y control de carga.
- **Se coordina con:** Comercial, operaciones, compras, almacenes.
- **Cómo medir:** Adherencia al plan, atrasos, WIP, utilización.
- **Conocimientos:** MRP, ERP, capacidad y programación.
</details>

**A. Para qué existe [D].** Convierte pedidos y pronósticos en órdenes que la planta puede cumplir con su capacidad y sus materiales.

**B. Jornada [D]**

1. *Al comenzar:* Revisa pedidos nuevos y modificados, la carga por línea y el avance del programa de la semana.
2. *Durante:* Secuencia lotes, revisa restricciones (capacidad, materiales, mantenimiento) y emite órdenes de producción.
3. *Al coordinarse:* Con comercial (fechas), operaciones, compras y bodega.
4. *Ante una anomalía:* Si una línea se detiene o falta material, reprograma y comunica el impacto en fechas.
5. *Al cerrar:* Publica el programa actualizado.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Secuencia y fecha de las órdenes de producción. *Escala a:* Jefatura de producción y comercial (fechas no cumplibles).

**D. Información que consulta [D].** Pedidos con fecha comprometida; Capacidad por línea; Disponibilidad de materiales; Órdenes en curso y su avance; Ventanas de mantenimiento.

**E. Información que genera o modifica [D]**

- *Crear:* Órdenes de producción desde el programa.
- *Editar:* Secuencia y fechas del programa.
- *Exportar:* Plan maestro y semanal.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Datos personales, sueldos y contratos.

**G. Impacto en la empresa [D].** Su programa decide qué se fabrica y cuándo; un programa infactible genera atrasos y sobretiempo.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Pedidos en riesgo y carga por línea.
- *Distribución:* Carga por línea (semana) · pedidos por fecha · órdenes en curso · faltantes de material.
- *Menú:* Inicio · Programa · Pedidos · Capacidad · Órdenes de producción · Materiales
- *Tablas y formularios:* Tablas: pedidos, órdenes, carga. Formularios: orden de producción, reprogramación.
- *Acciones rápidas:* Crear orden desde pedido; Reprogramar; Exportar programa
- *Alertas:* Pedido sin capacidad a tiempo; Material faltante para una orden; Línea detenida con órdenes programadas
- *Notificaciones:* Comercial registró un pedido; mantenimiento programó una detención.
- *Estado vacío:* “No hay pedidos por programar.”
- *Componentes especializados:* Gantt por línea, barras de carga.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Adherencia al plan | Órdenes terminadas en su fecha | 🟡 datos parciales |
| Atrasos | Órdenes vencidas | 🟡 datos parciales |
| WIP | Inventario en proceso (no existe) | ⛔ sin fuente en SIMA |
| Utilización | Horas de producción contra disponibles | 🟡 datos parciales |

**Flujo de información [D]**

- *Recibe:* Pedidos, capacidad, materiales.
- *Procesa:* Secuencia y verifica factibilidad.
- *Produce:* Programa y órdenes de producción.
- *Destinatarios:* Producción, MRP, compras, comercial.
- *Consecuencia:* Las órdenes aparecen para la jefatura y los turnos.

**Permisos propuestos [P]** · aplicaciones: Web

- Programa de producción y capacidad *(módulo parcial)*: consultar, crear, editar, exportar — planta
- Órdenes y registros de producción: consultar, crear, editar — planta
- Pedidos y clientes *(módulo propuesto)*: consultar — empresa
- Materiales y requerimientos (MRP) *(módulo propuesto)*: consultar — planta
- Órdenes de trabajo de mantenimiento: consultar — planta
- Planta, áreas, líneas y equipos: consultar — planta
- Indicadores: consultar — planta
- Bodega: ubicaciones, recepciones y conteos *(módulo propuesto)*: consultar — planta

**Por validar con la empresa [V].** Si los pedidos vendrán de un ERP externo o se registrarán en SIMA.

**Hoy en SIMA 4.1.** Crea órdenes de producción. No hay pedidos, capacidad ni programa por línea.

---

### 37 · Planificador/a de materiales (MRP)

**Dashboard propuesto:** «Planificación de materiales» · **Canal según el Excel:** web · **Perfil SIMA:** `produccion_ing` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Calcula cuándo y cuánto material debe estar disponible para cada orden.
- **Qué hace:** Revisa listas de materiales, consumos, tiempos de aprovisionamiento y faltantes.
- **Qué entrega:** Requerimientos de compra y lista de faltantes.
- **Se coordina con:** Planificación, compras, bodega y producción.
- **Cómo medir:** Quiebres, exactitud MRP, urgencias por faltantes.
- **Conocimientos:** BOM, MRP y control de inventarios.
</details>

**A. Para qué existe [D].** Calcula cuánto material se necesita y cuándo, para que no falte ni sobre.

**B. Jornada [D]**

1. *Al comenzar:* Revisa faltantes para las órdenes de la semana y entregas atrasadas de proveedores.
2. *Durante:* Explota listas de materiales, compara con existencias y consumos, y genera requerimientos de compra.
3. *Al coordinarse:* Con planificación, compras, bodega y producción.
4. *Ante una anomalía:* Si un material crítico no llegará a tiempo, avisa a planificación para reprogramar.
5. *Al cerrar:* Deja los requerimientos emitidos y la lista de faltantes.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Cantidad y fecha de los requerimientos de material. *Escala a:* Compras (urgencias), planificación (reprogramar).

**D. Información que consulta [D].** Listas de materiales; Existencias; Consumos; Plazos de proveedores; Órdenes programadas.

**E. Información que genera o modifica [D]**

- *Crear:* Requerimientos de compra y lista de faltantes.
- *Exportar:* Plan de materiales.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Datos personales, sueldos y contratos.

**G. Impacto en la empresa [D].** Un faltante detiene una orden; un exceso inmoviliza capital.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Faltantes para la semana.
- *Distribución:* Faltantes por orden · requerimientos emitidos · cobertura de existencias.
- *Menú:* Inicio · Faltantes · Requerimientos · Existencias · Listas de materiales
- *Tablas y formularios:* Tablas: necesidades netas por material. Formularios: requerimiento de compra.
- *Acciones rápidas:* Emitir requerimiento; Marcar urgencia
- *Alertas:* Material crítico sin cobertura; Entrega de proveedor atrasada
- *Notificaciones:* Bodega registró una recepción.
- *Estado vacío:* “Sin faltantes para las órdenes programadas.”
- *Componentes especializados:* Tabla de necesidades netas con cobertura en días.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Quiebres | Faltantes de material (no existen) | ⛔ sin fuente en SIMA |
| Exactitud MRP | Requerimientos contra consumo real (no existen) | ⛔ sin fuente en SIMA |
| Urgencias por faltantes | Compras urgentes (no existen) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Programa, BOM y existencias.
- *Procesa:* Calcula necesidades netas.
- *Produce:* Requerimientos y faltantes.
- *Destinatarios:* Compras, planificación, bodega.
- *Consecuencia:* Compras gestiona lo que falta.

**Permisos propuestos [P]** · aplicaciones: Web

- Materiales y requerimientos (MRP) *(módulo propuesto)*: consultar, crear, editar, exportar — planta
- Bodega: ubicaciones, recepciones y conteos *(módulo propuesto)*: consultar — planta
- Solicitudes y órdenes de compra *(módulo propuesto)*: consultar, solicitar — planta
- Programa de producción y capacidad *(módulo parcial)*: consultar — planta
- Especificaciones, BOM y cambios de ingeniería *(módulo propuesto)*: consultar — empresa
- Órdenes y registros de producción: consultar — planta

**Por validar con la empresa [V].** Fuente de las listas de materiales (BOM).

**Hoy en SIMA 4.1.** Comparte el perfil de producción e ingeniería. No existen materiales, BOM ni MRP.

---

### 38 · Comprador/a de materias primas y suministros

**Dashboard propuesto:** «Compras» · **Canal según el Excel:** web · **Perfil SIMA:** `logistica` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Asegura suministro oportuno, conforme y económicamente razonable.
- **Qué hace:** Solicita cotizaciones, compara propuestas, emite órdenes, sigue entregas y comunica riesgos.
- **Qué entrega:** Órdenes de compra, contratos y evaluación de proveedores.
- **Se coordina con:** Planificación, finanzas, almacenes y calidad.
- **Cómo medir:** Entregas a tiempo, ahorro verificable, urgencias y rechazos.
- **Conocimientos:** Negociación, ERP, especificaciones y compras.
</details>

**A. Para qué existe [D].** Asegura que lo que la planta necesita llegue a tiempo, conforme y a un costo razonable.

**B. Jornada [D]**

1. *Al comenzar:* Revisa requerimientos nuevos, órdenes de compra por vencer y entregas atrasadas.
2. *Durante:* Cotiza, compara propuestas, emite órdenes de compra y sigue entregas.
3. *Al coordinarse:* Con planificación, finanzas, almacenes y calidad.
4. *Ante una anomalía:* Si un proveedor se atrasa o entrega no conforme, gestiona alternativa y comunica el riesgo.
5. *Al cerrar:* Actualiza el estado de las órdenes de compra.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Proveedor y condiciones dentro del presupuesto autorizado. *Escala a:* Finanzas (montos sobre límite), desarrollo de proveedores (proveedor crítico).

**D. Información que consulta [D].** Requerimientos y solicitudes; Cotizaciones; Proveedores y su desempeño; Presupuesto autorizado; Recepciones.

**E. Información que genera o modifica [D]**

- *Crear:* Órdenes de compra.
- *Registrar:* Cotizaciones y seguimiento de entregas.
- *Aprobar:* Adjudicación dentro de su límite.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Datos personales, sueldos y contratos laborales.

**G. Impacto en la empresa [D].** Una compra atrasada detiene producción o mantenimiento.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Requerimientos sin orden de compra y entregas atrasadas.
- *Distribución:* Requerimientos pendientes · órdenes de compra abiertas · entregas atrasadas · proveedores.
- *Menú:* Inicio · Requerimientos · Órdenes de compra · Proveedores · Recepciones
- *Tablas y formularios:* Tablas: OC con estado y fecha. Formularios: cotización, orden de compra.
- *Acciones rápidas:* Emitir OC; Registrar cotización; Reclamar atraso
- *Alertas:* Entrega atrasada; Requerimiento urgente sin OC
- *Notificaciones:* Nuevo requerimiento; recepción con diferencias.
- *Estado vacío:* “No hay requerimientos pendientes.”
- *Componentes especializados:* Comparador de cotizaciones.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Entregas a tiempo | OC con fecha comprometida y recepción (no existen) | ⛔ sin fuente en SIMA |
| Ahorro verificable | Precio adjudicado contra referencia (no existe) | ⛔ sin fuente en SIMA |
| Urgencias y rechazos | OC urgentes y recepciones rechazadas (no existen) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Requerimientos de MRP, pañol y proyectos.
- *Procesa:* Cotiza y adjudica.
- *Produce:* Órdenes de compra.
- *Destinatarios:* Proveedores, recepción, finanzas.
- *Consecuencia:* Recepción espera la entrega.

**Permisos propuestos [P]** · aplicaciones: Web

- Solicitudes y órdenes de compra *(módulo propuesto)*: consultar, crear, editar, aprobar o rechazar — empresa
- Proveedores y evaluaciones *(módulo propuesto)*: consultar, editar — empresa
- Materiales y requerimientos (MRP) *(módulo propuesto)*: consultar — planta
- Bodega: ubicaciones, recepciones y conteos *(módulo propuesto)*: consultar — planta
- Repuestos y pañol: consultar — planta
- Presupuesto y flujo de caja *(módulo propuesto)*: consultar — su área
- Despachos y transporte: consultar — empresa

**Por validar con la empresa [V].** Límite de adjudicación del comprador.

**Hoy en SIMA 4.1.** Perfil logística (ve despachos). No existen compras ni proveedores.

---

### 39 · Encargado/a de recepción de materiales

**Dashboard propuesto:** «Recepción de materiales» · **Canal según el Excel:** app · **Perfil SIMA:** `panol` · **Tipo:** Terreno · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Recibe físicamente mercadería y verifica documentación, cantidades y condición.
- **Qué hace:** Registra ingresos, identifica lotes, coordina inspección de recepción y ubicación segura.
- **Qué entrega:** Recepciones, diferencias y trazabilidad de lotes.
- **Se coordina con:** Compras, proveedor, calidad y bodega.
- **Cómo medir:** Exactitud recepción, tiempo de descarga, diferencias.
- **Conocimientos:** Documentos logísticos, control y seguridad.
</details>

**A. Para qué existe [D].** Recibe físicamente lo que compró la empresa y verifica que coincida con la orden de compra en documento, cantidad y condición.

**B. Jornada [D]**

1. *Al comenzar:* Revisa las entregas esperadas del día.
2. *Durante:* Descarga, verifica documentos y cantidades, identifica lotes y registra la recepción.
3. *Al coordinarse:* Con compras, proveedor, calidad (inspección de recepción) y bodega.
4. *Ante una anomalía:* Si hay diferencias o daño, registra la diferencia y deja el material en espera.
5. *Al cerrar:* Confirma recepciones y ubica el material.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Recibir, recibir con diferencia o rechazar una entrega. *Escala a:* Compras (diferencias), calidad (inspección).

**D. Información que consulta [D].** Órdenes de compra por recibir; Proveedores; Ubicaciones disponibles.

**E. Información que genera o modifica [D]**

- *Registrar:* Recepciones, diferencias, lotes y ubicación.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Precios de compra, datos personales, sueldos.

**G. Impacto en la empresa [D].** Una recepción mal registrada descuadra el inventario y el pago al proveedor.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Entregas del día.
- *Distribución:* Entregas esperadas · registro de recepción · diferencias.
- *Menú:* Recepción de materiales · Entregas esperadas · Recepciones · Seguridad · Mi cargo
- *Tablas y formularios:* Formularios: recepción contra OC (cantidad, lote, condición, ubicación).
- *Acciones rápidas:* Registrar recepción; Registrar diferencia
- *Alertas:* Entrega no programada; Diferencia de cantidad
- *Notificaciones:* Compras emitió una OC con entrega hoy.
- *Estado vacío:* “No hay entregas esperadas hoy.”
- *Componentes especializados:* Lista de OC con progreso de recepción.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Exactitud recepción | Recepciones sin diferencia (no existen) | ⛔ sin fuente en SIMA |
| Tiempo de descarga | Hora de llegada y término (no existen) | ⛔ sin fuente en SIMA |
| Diferencias | Diferencias registradas (no existen) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* OC y entrega física.
- *Procesa:* Verifica.
- *Produce:* Recepción registrada con lote.
- *Destinatarios:* Bodega, compras, calidad, contabilidad.
- *Consecuencia:* El inventario aumenta y la factura puede conciliarse.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Bodega: ubicaciones, recepciones y conteos *(módulo propuesto)*: consultar, registrar — planta
- Solicitudes y órdenes de compra *(módulo propuesto)*: consultar — planta
- No conformidades y lotes: consultar — planta
- Incidentes y acciones de seguridad: registrar — propio
- Habilitaciones y competencias: consultar — propio

**Por validar con la empresa [V].** Si la recepción de repuestos también pasa por este cargo o solo por el pañol.

**Hoy en SIMA 4.1.** Comparte el perfil del pañol (repuestos). No existen OC ni recepciones.

---

### 40 · Jefe/a de bodega o almacén

**Dashboard propuesto:** «Bodega y almacén» · **Canal según el Excel:** app · **Perfil SIMA:** `panol` · **Tipo:** Terreno · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Administra ubicación, custodia, inventarios y preparación de materiales.
- **Qué hace:** Organiza personal, conteos cíclicos, FIFO/FEFO cuando corresponda, inventario y orden.
- **Qué entrega:** Inventario confiable, ubicaciones y reportes.
- **Se coordina con:** Recepción, planificación, producción, despacho.
- **Cómo medir:** Exactitud stock, rotación, faltantes y daños.
- **Conocimientos:** WMS/ERP, almacenaje y liderazgo.
</details>

**A. Para qué existe [D].** Custodia los materiales y productos con ubicaciones e inventario confiables.

**B. Jornada [D]**

1. *Al comenzar:* Revisa tareas del día (preparaciones, reposiciones, conteos) y asigna a su equipo.
2. *Durante:* Organiza conteos cíclicos, controla FIFO/FEFO y orden del almacén.
3. *Al coordinarse:* Con recepción, planificación, producción y despacho.
4. *Ante una anomalía:* Si un conteo no cuadra, abre una diferencia para análisis.
5. *Al cerrar:* Revisa tareas cumplidas y diferencias abiertas.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Ubicaciones y asignación de tareas de bodega. *Escala a:* Analista de inventarios (ajustes), jefatura de logística.

**D. Información que consulta [D].** Existencias por ubicación; Movimientos; Tareas de bodega; Conteos.

**E. Información que genera o modifica [D]**

- *Asignar:* Tareas de picking, reposición y conteo.
- *Registrar:* Conteos cíclicos.
- *Editar:* Ubicaciones.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Sueldos, contratos y datos personales del equipo más allá de lo operativo.

**G. Impacto en la empresa [D].** Un inventario poco confiable genera faltantes falsos y compras innecesarias.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Tareas del día y diferencias de conteo.
- *Distribución:* Tareas por persona · conteos programados · diferencias · ocupación.
- *Menú:* Bodega y almacén · Tareas · Existencias · Conteos · Mi equipo · Seguridad
- *Tablas y formularios:* Tablas: existencias por ubicación, tareas. Formularios: conteo, asignación.
- *Acciones rápidas:* Asignar tarea; Registrar conteo; Mover ubicación
- *Alertas:* Diferencia de conteo; Producto próximo a vencer
- *Notificaciones:* Recepción registró material.
- *Estado vacío:* “No hay tareas para hoy.”
- *Componentes especializados:* Mapa de ubicaciones.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Exactitud stock | Conteos físicos (no existen) | ⛔ sin fuente en SIMA |
| Rotación | Movimientos por material (no existen) | ⛔ sin fuente en SIMA |
| Faltantes y daños | Faltantes y daños registrados (no existen) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Recepciones, pedidos de producción y despacho.
- *Procesa:* Custodia y prepara.
- *Produce:* Inventario confiable y tareas cumplidas.
- *Destinatarios:* Planificación, producción, despacho.
- *Consecuencia:* Planificación usa existencias reales.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Bodega: ubicaciones, recepciones y conteos *(módulo propuesto)*: consultar, registrar, editar, asignar — planta
- Despachos y transporte: consultar — planta
- Materiales y requerimientos (MRP) *(módulo propuesto)*: consultar — planta
- Asistencia y ausentismo: consultar — su equipo
- Habilitaciones y competencias: consultar — su equipo
- Incidentes y acciones de seguridad: registrar — propio

**Por validar con la empresa [V].** Si la bodega de materiales es la misma que el pañol de repuestos.

**Hoy en SIMA 4.1.** Perfil pañol (repuestos). No existe inventario de materiales por ubicación.

---

### 41 · Bodeguero/a o preparador/a de pedidos

**Dashboard propuesto:** «Preparación de pedidos» · **Canal según el Excel:** app · **Perfil SIMA:** `panol` · **Tipo:** Terreno · **Dotación:** 3/4

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Ubica, cuenta y entrega materiales o productos de forma trazable.
- **Qué hace:** Ejecuta picking, reposición, confirmación de ubicaciones y packing interno.
- **Qué entrega:** Movimientos y pedidos preparados sin diferencias.
- **Se coordina con:** Bodega, producción y despacho.
- **Cómo medir:** Exactitud picking, productividad, daños.
- **Conocimientos:** Identificación de lotes, lectura de documentos.
</details>

**A. Para qué existe [D].** Ubica, cuenta y entrega materiales o productos sin diferencias.

**B. Jornada [D]**

1. *Al comenzar:* Ve sus tareas de picking y reposición.
2. *Durante:* Prepara pedidos, confirma ubicaciones y registra entregas.
3. *Al coordinarse:* Con bodega, producción y despacho.
4. *Ante una anomalía:* Si no encuentra el material o la cantidad no alcanza, lo registra.
5. *Al cerrar:* Confirma tareas terminadas.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Ninguna fuera de su tarea; registra lo que encuentra. *Escala a:* Jefe de bodega.

**D. Información que consulta [D].** Tareas asignadas; Ubicaciones y existencias.

**E. Información que genera o modifica [D]**

- *Registrar:* Picking, entregas y reposiciones.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Precios, datos personales, sueldos.

**G. Impacto en la empresa [D].** Un picking con error llega a producción o al cliente.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Sus tareas en orden.
- *Distribución:* Lista de tareas · confirmación por línea.
- *Menú:* Preparación de pedidos · Mis tareas · Seguridad · Mi cargo
- *Tablas y formularios:* Formularios: confirmación de picking (ubicación, cantidad).
- *Acciones rápidas:* Confirmar picking; Registrar faltante
- *Alertas:* Ubicación sin stock
- *Notificaciones:* Nueva tarea asignada.
- *Estado vacío:* “No tiene tareas asignadas.”
- *Componentes especializados:* Lista de picking con orden de recorrido.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Exactitud picking | Confirmaciones contra solicitud (no existen) | ⛔ sin fuente en SIMA |
| Productividad | Líneas preparadas por hora (no existen) | ⛔ sin fuente en SIMA |
| Daños | Daños registrados (no existen) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Tareas de picking.
- *Procesa:* Prepara.
- *Produce:* Pedidos preparados.
- *Destinatarios:* Producción y despacho.
- *Consecuencia:* Despacho puede cargar.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Bodega: ubicaciones, recepciones y conteos *(módulo propuesto)*: consultar, registrar — propio
- Despachos y transporte: consultar — propio
- Incidentes y acciones de seguridad: registrar — propio
- Habilitaciones y competencias: consultar — propio

**Por validar con la empresa [V].** Si se usarán lectores de código de barras.

**Hoy en SIMA 4.1.** Perfil pañol. No existen tareas de picking.

---

### 42 · Coordinador/a de despacho y transporte

**Dashboard propuesto:** «Despacho y transporte» · **Canal según el Excel:** web · **Perfil SIMA:** `logistica` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Cumple entregas a clientes con documentos y condiciones adecuadas.
- **Qué hace:** Programa vehículos, ventanas, rutas y cargas; valida guías y evidencia de entrega.
- **Qué entrega:** Plan de despacho, documentos y pruebas de entrega.
- **Se coordina con:** Clientes, transportistas, comercial y bodega.
- **Cómo medir:** OTIF, costo de flete, reclamos de entrega.
- **Conocimientos:** Distribución, trazabilidad, transporte y coordinación.
</details>

**A. Para qué existe [D].** Hace que cada pedido llegue al cliente a tiempo y con la documentación correcta.

**B. Jornada [D]**

1. *Al comenzar:* Revisa despachos del día, ventanas de entrega y vehículos.
2. *Durante:* Programa cargas, valida guías y sigue las entregas.
3. *Al coordinarse:* Con clientes, transportistas, comercial y bodega.
4. *Ante una anomalía:* Si un despacho se atrasa, avisa a servicio al cliente y reprograma.
5. *Al cerrar:* Registra pruebas de entrega.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Programación de vehículos y cargas. *Escala a:* Comercial (atrasos con clientes).

**D. Información que consulta [D].** Pedidos listos para despacho; Producto liberado por calidad; Vehículos y ventanas; Documentos.

**E. Información que genera o modifica [D]**

- *Crear:* Despachos.
- *Editar:* Estado del despacho (preparado, en ruta, entregado).
- *Registrar:* Pruebas de entrega.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Datos personales, sueldos, costos de producción.

**G. Impacto en la empresa [D].** Su registro define el OTIF.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Despachos del día y atrasos.
- *Distribución:* Plan de despacho · en ruta · entregados · atrasados.
- *Menú:* Inicio · Despachos · Pedidos listos · Transportistas
- *Tablas y formularios:* Tablas: despachos con estado y compromiso. Formularios: despacho, prueba de entrega.
- *Acciones rápidas:* Programar despacho; Avanzar estado; Registrar entrega
- *Alertas:* Despacho atrasado; Lote no liberado en despacho
- *Notificaciones:* Calidad liberó un lote.
- *Estado vacío:* “No hay despachos programados.”
- *Componentes especializados:* Línea de tiempo de entregas.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| OTIF | Despachos con compromiso y entrega | ✅ hay datos en SIMA |
| Costo de flete | Costos de transporte (no existen) | ⛔ sin fuente en SIMA |
| Reclamos de entrega | Reclamos (no existen) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Producto liberado y pedidos.
- *Procesa:* Programa y despacha.
- *Produce:* Entregas con evidencia.
- *Destinatarios:* Clientes, comercial, finanzas.
- *Consecuencia:* Se puede facturar y cerrar el pedido.

**Permisos propuestos [P]** · aplicaciones: Web

- Despachos y transporte: consultar, crear, editar, exportar — empresa
- Pedidos y clientes *(módulo propuesto)*: consultar — empresa
- No conformidades y lotes: consultar — planta
- Bodega: ubicaciones, recepciones y conteos *(módulo propuesto)*: consultar — planta
- Indicadores: consultar — su área

**Por validar con la empresa [V].** Si la prueba de entrega incluirá foto o firma.

**Hoy en SIMA 4.1.** Despachos con avance de estado y OTIF. No hay pedidos ni pruebas de entrega.

---

### 43 · Analista de inventarios / logística

**Dashboard propuesto:** «Análisis de inventarios» · **Canal según el Excel:** web · **Perfil SIMA:** `logistica` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Reduce diferencias de stock y optimiza el flujo físico-informático.
- **Qué hace:** Analiza conteos, causas de ajustes, rotación, obsolescencia e indicadores de almacén.
- **Qué entrega:** Análisis de stock, ajustes autorizados y recomendaciones.
- **Se coordina con:** Bodega, finanzas, planificación y compras.
- **Cómo medir:** Exactitud de inventario, días de stock, obsolescencia.
- **Conocimientos:** ERP/WMS, datos y control interno.
</details>

**A. Para qué existe [D].** Reduce diferencias de stock y ordena el flujo físico y del sistema.

**B. Jornada [D]**

1. *Al comenzar:* Revisa diferencias de conteo y ajustes pendientes.
2. *Durante:* Analiza causas, rotación y obsolescencia.
3. *Al coordinarse:* Con bodega, finanzas, planificación y compras.
4. *Ante una anomalía:* Si una diferencia es grande, investiga movimientos antes de proponer el ajuste.
5. *Al cerrar:* Emite análisis y propuestas de ajuste.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Propuestas de ajuste (la aprobación es de finanzas o la jefatura). *Escala a:* Finanzas.

**D. Información que consulta [D].** Movimientos; Conteos; Existencias; Históricos.

**E. Información que genera o modifica [D]**

- *Crear:* Análisis y propuestas de ajuste.
- *Exportar:* Informes de inventario.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Datos personales, sueldos.

**G. Impacto en la empresa [D].** Ajustes sin análisis esconden pérdidas.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Diferencias sin explicar.
- *Distribución:* Diferencias · rotación · obsolescencia · ajustes propuestos.
- *Menú:* Inicio · Diferencias · Rotación · Ajustes · Informes
- *Tablas y formularios:* Tablas: diferencias, rotación. Formularios: propuesta de ajuste.
- *Acciones rápidas:* Proponer ajuste; Exportar análisis
- *Alertas:* Diferencia sobre umbral; Material obsoleto
- *Notificaciones:* Bodega registró un conteo.
- *Estado vacío:* “Sin diferencias abiertas.”
- *Componentes especializados:* Curva ABC.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Exactitud de inventario | Conteos (no existen) | ⛔ sin fuente en SIMA |
| Días de stock | Existencias y consumo (no existen) | ⛔ sin fuente en SIMA |
| Obsolescencia | Materiales sin movimiento (no existen) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Conteos y movimientos.
- *Procesa:* Analiza.
- *Produce:* Ajustes propuestos.
- *Destinatarios:* Finanzas, bodega.
- *Consecuencia:* El inventario contable se ajusta con respaldo.

**Permisos propuestos [P]** · aplicaciones: Web

- Bodega: ubicaciones, recepciones y conteos *(módulo propuesto)*: consultar, crear, exportar — planta
- Repuestos y pañol: consultar, exportar — planta
- Materiales y requerimientos (MRP) *(módulo propuesto)*: consultar — planta
- Despachos y transporte: consultar — planta
- Costos industriales *(módulo propuesto)*: consultar — solo totales

**Por validar con la empresa [V].** Quién aprueba los ajustes de inventario.

**Hoy en SIMA 4.1.** Ve despachos y repuestos. No hay conteos ni ajustes.

---

## Familia 7 · Personas, relaciones laborales y servicios

### 44 · Jefe/a de recursos humanos / personas

**Dashboard propuesto:** «Personas» · **Canal según el Excel:** web · **Perfil SIMA:** `rrhh` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Asegura dotación, desempeño, relaciones laborales, formación y políticas de personas.
- **Qué hace:** Planifica contratación, supervisa cumplimiento laboral, escucha a trabajadores y coordina clima y desarrollo.
- **Qué entrega:** Plan de dotación, políticas, capacitación e indicadores.
- **Se coordina con:** Gerencia, jefaturas, trabajadores y asesoría legal.
- **Cómo medir:** Rotación, cobertura de vacantes, ausentismo y formación.
- **Conocimientos:** Legislación laboral, relaciones humanas y confidencialidad.
</details>

**A. Para qué existe [D].** Asegura que la planta tenga a las personas correctas, contratadas según la ley, formadas y con relaciones laborales sanas.

**B. Jornada [D]**

1. *Al comenzar:* Revisa contratos por vencer, altas y bajas en curso, ausentismo del mes y habilitaciones vencidas.
2. *Durante:* Aprueba contrataciones, firma desvinculaciones, revisa políticas y atiende casos escalados.
3. *Al coordinarse:* Con gerencia, jefaturas, trabajadores y asesoría legal.
4. *Ante una anomalía:* Ante un contrato vencido sin renovar o una cuenta activa de una persona desvinculada, corrige de inmediato.
5. *Al cerrar:* Revisa indicadores de dotación y rotación.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Contrataciones, desvinculaciones, renovaciones y políticas de personas; quién tiene cuenta SIMA y por qué canal. *Escala a:* Gerencia general y asesoría legal.

**D. Información que consulta [D].** Dotación objetivo y actual por cargo; Contratos y vencimientos; Asistencia y ausentismo; Habilitaciones; Remuneraciones (consulta); Desvinculaciones; Cuentas SIMA.

**E. Información que genera o modifica [D]**

- *Crear:* Fichas de trabajador, contratos y desvinculaciones.
- *Editar:* Datos personales, cargos y dotación objetivo, cuentas SIMA.
- *Aprobar:* Ingresos y salidas de personal.
- *Exportar:* Informes de dotación.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Parámetros de PLC, OT técnicas, programas de máquina. Ve remuneraciones pero no las edita (las prepara el analista de remuneraciones).

**G. Impacto en la empresa [D].** Si un contrato vence sin control, la cuenta se suspende y la persona no puede trabajar en SIMA. Una desvinculación mal registrada deja accesos abiertos.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Contratos por vencer, brechas de dotación y documentos pendientes.
- *Distribución:* Franja (dotación, altas y bajas del mes, ausentismo, contratos por vencer) · vencimientos · brechas por cargo · habilitaciones vencidas.
- *Menú:* Inicio · Trabajadores · Contratos · Desvinculaciones · Cuentas de acceso · Asistencia · Habilitaciones · Cargos y dotación · Remuneraciones
- *Tablas y formularios:* Tablas: trabajadores, contratos, desvinculaciones. Formularios: ficha, contrato, término de contrato, cuenta.
- *Acciones rápidas:* Registrar ingreso; Renovar contrato; Registrar desvinculación; Revisar cuenta
- *Alertas:* Contrato vence en 30 días; Cuenta activa de persona desvinculada; Brecha de dotación en cargo crítico
- *Notificaciones:* Reclutamiento cerró una vacante; una habilitación venció.
- *Estado vacío:* “No hay vencimientos en los próximos 90 días.”
- *Componentes especializados:* Línea de vencimientos, organigrama, pirámide de dotación.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Rotación | Desvinculaciones y dotación | ✅ hay datos en SIMA |
| Cobertura de vacantes | Vacantes y fecha de cobertura (no existen) | ⛔ sin fuente en SIMA |
| Ausentismo | Asistencia mensual | ✅ hay datos en SIMA |
| Formación | Cursos y habilitaciones (solo habilitaciones) | 🟡 datos parciales |

**Flujo de información [D]**

- *Recibe:* Solicitudes de jefaturas, procesos de selección, términos de contrato.
- *Procesa:* Verifica normativa y aprueba.
- *Produce:* Contratos, desvinculaciones, cuentas actualizadas.
- *Destinatarios:* Jefaturas, remuneraciones, soporte TI, el trabajador.
- *Consecuencia:* Al desvincular, la cuenta se cierra y la persona deja de aparecer en los equipos de las jefaturas.

**Permisos propuestos [P]** · aplicaciones: Web

- Fichas de personal: consultar, crear, editar, exportar — empresa
- Contratos: consultar, crear, editar — empresa
- Desvinculaciones: consultar, crear, editar — empresa
- Cuentas de acceso SIMA: consultar, editar — empresa
- Asistencia y ausentismo: consultar — empresa
- Habilitaciones y competencias: consultar, editar — empresa
- Remuneraciones: consultar — empresa
- Descuentos y conceptos variables: consultar — empresa
- Parámetros de remuneraciones: consultar — empresa
- Vacantes y selección *(módulo propuesto)*: consultar, aprobar o rechazar — empresa
- Cursos y matriz de formación *(módulo propuesto)*: consultar — empresa
- Casos laborales y bienestar (confidencial) *(módulo propuesto)*: consultar — empresa
- Incidentes y acciones de seguridad: consultar — solo totales
- Auditoría: consultar — empresa
- Permisos por cargo: consultar — empresa
- Indicadores: consultar — solo totales

**Por validar con la empresa [V].** Si la jefatura de RR. HH. debe poder preparar remuneraciones (hoy sí) o solo consultarlas; Plazo de aviso para contratos por vencer.

**Hoy en SIMA 4.1.** Fichas, contratos, desvinculaciones con cierre automático de cuenta, asistencia y habilitaciones. La web muestra además Planta, Mantenimiento y Eventos, que no corresponden a su trabajo.

---

### 45 · Reclutador/a y analista de selección

**Dashboard propuesto:** «Selección» · **Canal según el Excel:** web · **Perfil SIMA:** `rrhh` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Cubre puestos con personas aptas para exigencias técnicas, operacionales y de seguridad.
- **Qué hace:** Publica vacantes, entrevista, valida perfiles, verifica referencias pertinentes y coordina ingreso.
- **Qué entrega:** Terna, registro de selección e incorporación.
- **Se coordina con:** Jefes solicitantes, RR. HH. y candidatos.
- **Cómo medir:** Tiempo de cobertura, permanencia inicial, vacantes críticas.
- **Conocimientos:** Entrevistas estructuradas y perfiles por competencias.
</details>

**A. Para qué existe [D].** Cubre los puestos con personas aptas para las exigencias técnicas y de seguridad del cargo.

**B. Jornada [D]**

1. *Al comenzar:* Revisa vacantes abiertas, su antigüedad y las entrevistas del día.
2. *Durante:* Publica vacantes, entrevista, evalúa contra el perfil del cargo y verifica referencias.
3. *Al coordinarse:* Con jefes solicitantes, RR. HH. y candidatos.
4. *Ante una anomalía:* Si una vacante crítica supera el plazo, propone alternativas (reemplazo temporal, reasignación).
5. *Al cerrar:* Actualiza el estado de cada proceso.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Terna presentada al jefe solicitante. *Escala a:* Jefatura de RR. HH.

**D. Información que consulta [D].** Vacantes y perfil del cargo (Excel); Dotación objetivo y brecha; Postulaciones y evaluaciones.

**E. Información que genera o modifica [D]**

- *Crear:* Vacantes y procesos de selección.
- *Registrar:* Entrevistas, evaluaciones y terna.
- *Editar:* Datos de ingreso del seleccionado (alta inicial).

**F. Lo que NO debe ver (mínimo privilegio) [D].** Remuneraciones de los trabajadores actuales, datos bancarios.

**G. Impacto en la empresa [D].** Una vacante crítica sin cubrir obliga a sobretiempo o deja un equipo sin operador habilitado.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Vacantes críticas y su antigüedad.
- *Distribución:* Vacantes por cargo con brecha · procesos en curso (embudo) · entrevistas del día.
- *Menú:* Inicio · Vacantes · Procesos · Cargos y perfiles · Ingresos
- *Tablas y formularios:* Tablas: vacantes, postulantes. Formularios: vacante, evaluación, alta inicial.
- *Acciones rápidas:* Abrir vacante; Registrar entrevista; Presentar terna
- *Alertas:* Vacante crítica sobre 30 días
- *Notificaciones:* Jefe solicitante eligió candidato.
- *Estado vacío:* “No hay vacantes abiertas. La brecha de dotación de cada cargo está en Cargos.”
- *Componentes especializados:* Embudo de selección.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Tiempo de cobertura | Fecha de apertura y de ingreso (no existen) | ⛔ sin fuente en SIMA |
| Permanencia inicial | Ingresos y desvinculaciones antes de 6 meses | ✅ hay datos en SIMA |
| Vacantes críticas | Brecha de dotación por cargo | ✅ hay datos en SIMA |

**Flujo de información [D]**

- *Recibe:* Solicitud del jefe y perfil del cargo.
- *Procesa:* Recluta y evalúa.
- *Produce:* Terna y alta inicial.
- *Destinatarios:* Jefe solicitante, RR. HH., remuneraciones.
- *Consecuencia:* El nuevo trabajador entra con su cargo y su cuenta.

**Permisos propuestos [P]** · aplicaciones: Web

- Vacantes y selección *(módulo propuesto)*: consultar, crear, editar — empresa
- Fichas de personal: consultar, crear — empresa
- Contratos: consultar — empresa
- Habilitaciones y competencias: consultar — empresa

**Por validar con la empresa [V].** Si los datos de postulantes no contratados se guardan y por cuánto tiempo.

**Hoy en SIMA 4.1.** Puede editar fichas de personal. No existen vacantes ni procesos de selección.

---

### 46 · Analista de remuneraciones y asistencia

**Dashboard propuesto:** «Remuneraciones y asistencia» · **Canal según el Excel:** web · **Perfil SIMA:** `rrhh` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Gestiona liquidaciones, asistencia, turnos y antecedentes de pago.
- **Qué hace:** Concilia horas y ausencias, administra registros, calcula pagos y asegura confidencialidad.
- **Qué entrega:** Nómina, reportes y respaldo de asistencia.
- **Se coordina con:** Trabajadores, jefaturas, finanzas y RR. HH.
- **Cómo medir:** Exactitud y puntualidad de remuneraciones, errores.
- **Conocimientos:** Software de nómina, control horario y normativa.
</details>

**A. Para qué existe [D].** Calcula y prepara los pagos de cada período con asistencia conciliada y total confidencialidad.

**B. Jornada [D]**

1. *Al comenzar:* Revisa la asistencia cargada, horas extra y conceptos del período.
2. *Durante:* Concilia horas y ausencias, registra conceptos variables y prepara el cierre de remuneraciones.
3. *Al coordinarse:* Con jefaturas (asistencia), finanzas (aprobación) y trabajadores.
4. *Ante una anomalía:* Si una liquidación sale con valores anómalos, la corrige antes de enviar a aprobación.
5. *Al cerrar:* Envía el cierre a aprobación (no lo aprueba).

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Contenido del cálculo dentro de los parámetros vigentes. *Escala a:* Finanzas (aprobación), RR. HH.

**D. Información que consulta [D].** Contratos y sueldos base; Asistencia y horas; Conceptos variables; Parámetros legales.

**E. Información que genera o modifica [D]**

- *Registrar:* Asistencia y conceptos variables.
- *Crear:* Cierre preparado del período.
- *Exportar:* Nómina y respaldos.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Información técnica de planta. No aprueba su propio cierre.

**G. Impacto en la empresa [D].** Un error de cálculo afecta el pago de las personas; por eso el cierre requiere una segunda firma.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Estado del período (preparado, aprobado) y diferencias.
- *Distribución:* Avance del período · diferencias de asistencia · conceptos · liquidaciones.
- *Menú:* Inicio · Asistencia · Conceptos · Remuneraciones · Parámetros
- *Tablas y formularios:* Tablas: liquidaciones, asistencia. Formularios: concepto variable, preparar cierre.
- *Acciones rápidas:* Preparar cierre; Registrar concepto; Exportar nómina
- *Alertas:* Asistencia faltante; Cierre rechazado
- *Notificaciones:* Finanzas aprobó o rechazó el cierre.
- *Estado vacío:* “El período no tiene asistencia cargada.”
- *Componentes especializados:* Etapas del cierre.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Exactitud de remuneraciones | Correcciones posteriores al pago (no existen) | ⛔ sin fuente en SIMA |
| Puntualidad | Fecha de aprobación del cierre | ✅ hay datos en SIMA |
| Errores | Cierres rechazados | ✅ hay datos en SIMA |

**Flujo de información [D]**

- *Recibe:* Asistencia, contratos, conceptos.
- *Procesa:* Calcula y concilia.
- *Produce:* Cierre preparado.
- *Destinatarios:* Finanzas y tesorería.
- *Consecuencia:* Finanzas aprueba y tesorería paga.

**Permisos propuestos [P]** · aplicaciones: Web

- Remuneraciones: consultar, crear, exportar — empresa
- Asistencia y ausentismo: consultar, registrar, editar — empresa
- Descuentos y conceptos variables: consultar, crear, editar — empresa
- Parámetros de remuneraciones: consultar — empresa
- Contratos: consultar — empresa
- Fichas de personal: consultar — empresa
- Desvinculaciones: consultar — empresa

**Por validar con la empresa [V].** Si la asistencia diaria la registrará el supervisor o seguirá llegando como resumen mensual.

**Hoy en SIMA 4.1.** Prepara el cierre con control de cuatro ojos y edita conceptos. Funciona.

---

### 47 · Encargado/a de capacitación y desarrollo

**Dashboard propuesto:** «Capacitación y competencias» · **Canal según el Excel:** web · **Perfil SIMA:** `rrhh` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Mantiene competencias y habilitaciones del personal frente a riesgos y cambios técnicos.
- **Qué hace:** Diseña matriz de competencias, inducción, entrenamientos, evaluaciones y recertificaciones internas.
- **Qué entrega:** Matriz de formación, registros y planes de cierre de brechas.
- **Se coordina con:** Supervisores, HSE, calidad y mantenimiento.
- **Cómo medir:** Personal habilitado, formación completada, brechas.
- **Conocimientos:** Diseño de formación, evaluación y gestión del cambio.
</details>

**A. Para qué existe [D].** Mantiene al personal habilitado para los riesgos y cambios técnicos de su trabajo.

**B. Jornada [D]**

1. *Al comenzar:* Revisa habilitaciones vencidas y por vencer, y brechas de la matriz de competencias.
2. *Durante:* Programa cursos, registra resultados y renueva habilitaciones.
3. *Al coordinarse:* Con supervisores, prevención, calidad y mantenimiento.
4. *Ante una anomalía:* Si una persona opera con una habilitación vencida, avisa a su jefatura para reasignarla.
5. *Al cerrar:* Actualiza la matriz de formación.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Programa de formación y registro de habilitaciones. *Escala a:* RR. HH. y jefaturas.

**D. Información que consulta [D].** Habilitaciones por persona y cargo; Matriz de competencias; Cursos y evaluaciones.

**E. Información que genera o modifica [D]**

- *Crear:* Cursos y planes de cierre de brechas.
- *Registrar:* Habilitaciones obtenidas y resultados.
- *Editar:* Vigencias.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Sueldos, contratos y datos bancarios.

**G. Impacto en la empresa [D].** Una habilitación vencida bloquea a la persona para su tarea (LOTO, altura, grúa).

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Vencidas y por vencer por cargo crítico.
- *Distribución:* Matriz cargo × habilitación · vencimientos · cursos programados.
- *Menú:* Inicio · Habilitaciones · Matriz de competencias · Cursos
- *Tablas y formularios:* Tablas: matriz de competencias, vencimientos. Formularios: habilitación, curso.
- *Acciones rápidas:* Registrar habilitación; Programar curso; Exportar brechas
- *Alertas:* Habilitación vencida en cargo de riesgo; Vencimiento en 60 días
- *Notificaciones:* Supervisor solicitó formación.
- *Estado vacío:* “Todas las habilitaciones están vigentes.”
- *Componentes especializados:* Matriz con semáforo.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Personal habilitado | Habilitaciones vigentes por cargo | ✅ hay datos en SIMA |
| Formación completada | Cursos (no existen) | ⛔ sin fuente en SIMA |
| Brechas | Habilitaciones requeridas por cargo (la exigencia por cargo no está definida) | 🟡 datos parciales |

**Flujo de información [D]**

- *Recibe:* Requisitos por cargo y vencimientos.
- *Procesa:* Programa y evalúa.
- *Produce:* Habilitaciones vigentes.
- *Destinatarios:* Supervisores, prevención, el trabajador.
- *Consecuencia:* La persona puede volver a ser asignada a la tarea.

**Permisos propuestos [P]** · aplicaciones: Web

- Habilitaciones y competencias: consultar, crear, editar — empresa
- Cursos y matriz de formación *(módulo propuesto)*: consultar, crear, editar — empresa
- Fichas de personal: consultar — empresa

**Por validar con la empresa [V].** Qué habilitaciones exige cada cargo (no está en el Excel).

**Hoy en SIMA 4.1.** Registra habilitaciones. No hay matriz de exigencia por cargo ni cursos.

---

### 48 · Especialista en relaciones laborales y bienestar

**Dashboard propuesto:** «Relaciones laborales» · **Canal según el Excel:** web · **Perfil SIMA:** `rrhh` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Gestiona comunicación con trabajadores, consultas y prevención de conflictos.
- **Qué hace:** Canaliza inquietudes, apoya negociaciones cuando corresponda, gestiona beneficios y procedimientos de convivencia.
- **Qué entrega:** Actas, registros de casos y medidas de mejora.
- **Se coordina con:** Gerencia, RR. HH., supervisores, representantes.
- **Cómo medir:** Resolución de consultas, clima, cumplimiento de procesos.
- **Conocimientos:** Mediación, privacidad y marco laboral.
</details>

**A. Para qué existe [D].** Canaliza inquietudes de los trabajadores y previene conflictos con confidencialidad.

**B. Jornada [D]**

1. *Al comenzar:* Revisa casos abiertos y su plazo.
2. *Durante:* Atiende consultas, gestiona beneficios y apoya instancias de negociación.
3. *Al coordinarse:* Con gerencia, RR. HH., supervisores y representantes.
4. *Ante una anomalía:* Si un caso escala, lo deriva con registro confidencial.
5. *Al cerrar:* Registra seguimientos.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Tratamiento de cada caso dentro de los procedimientos. *Escala a:* Jefatura de RR. HH. y asesoría legal.

**D. Información que consulta [D].** Casos y consultas; Beneficios; Dotación (sin sueldos).

**E. Información que genera o modifica [D]**

- *Crear:* Casos confidenciales y actas.
- *Registrar:* Seguimientos.
- *Cerrar:* Casos.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Sueldos individuales, datos bancarios, información técnica.

**G. Impacto en la empresa [D].** Un caso sin seguimiento escala a conflicto laboral.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Casos abiertos por plazo.
- *Distribución:* Casos (privados) · beneficios · actas.
- *Menú:* Inicio · Casos · Beneficios · Actas
- *Tablas y formularios:* Formularios: caso confidencial con acceso restringido.
- *Acciones rápidas:* Registrar caso; Registrar seguimiento; Cerrar caso
- *Alertas:* Caso sin respuesta en plazo
- *Notificaciones:* Nueva consulta.
- *Estado vacío:* “No hay casos abiertos.”
- *Componentes especializados:* Casos con indicador de confidencialidad.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Resolución de consultas | Casos cerrados en plazo (no existen) | ⛔ sin fuente en SIMA |
| Clima | Encuestas (no existen) | ⛔ sin fuente en SIMA |
| Cumplimiento de procesos | Casos con etapas (no existen) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Consultas de trabajadores.
- *Procesa:* Gestiona con reserva.
- *Produce:* Casos resueltos y actas.
- *Destinatarios:* El trabajador, RR. HH.
- *Consecuencia:* Medidas de mejora del clima.

**Permisos propuestos [P]** · aplicaciones: Web

- Casos laborales y bienestar (confidencial) *(módulo propuesto)*: consultar, crear, editar, cerrar — empresa
- Fichas de personal: consultar — empresa
- Incidentes y acciones de seguridad: consultar — solo totales

**Por validar con la empresa [V].** Quién más puede ver un caso (solo el especialista y RR. HH.).

**Hoy en SIMA 4.1.** Ve SST. No existe el módulo de casos.

---

### 49 · Asistente administrativo/a de personal

**Dashboard propuesto:** «Administración de personal» · **Canal según el Excel:** web · **Perfil SIMA:** `rrhh` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Apoya el circuito documental de contratación y atención al colaborador.
- **Qué hace:** Mantiene legajos, permisos, altas/bajas, certificados y comunicaciones operativas.
- **Qué entrega:** Expedientes completos y solicitudes resueltas.
- **Se coordina con:** RR. HH., empleados y supervisores.
- **Cómo medir:** Documentos completos, plazo de respuesta.
- **Conocimientos:** Orden, herramientas ofimáticas y confidencialidad.
</details>

**A. Para qué existe [D].** Mantiene completo el expediente de cada persona y resuelve sus solicitudes documentales.

**B. Jornada [D]**

1. *Al comenzar:* Revisa solicitudes (certificados, permisos) y documentos faltantes de expedientes.
2. *Durante:* Registra altas, bajas y permisos, emite certificados y actualiza legajos.
3. *Al coordinarse:* Con RR. HH., trabajadores y supervisores.
4. *Ante una anomalía:* Si falta un documento obligatorio de un ingreso, lo bloquea como pendiente.
5. *Al cerrar:* Deja solicitudes resueltas.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Ninguna de fondo; registra según instrucción de RR. HH. *Escala a:* Jefatura de RR. HH.

**D. Información que consulta [D].** Fichas y expedientes; Contratos; Asistencia; Solicitudes.

**E. Información que genera o modifica [D]**

- *Registrar:* Altas, bajas, permisos y documentos.
- *Editar:* Fichas y contratos (según instrucción).
- *Crear:* Certificados.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Remuneraciones individuales (salvo que lo autorice RR. HH.), información técnica.

**G. Impacto en la empresa [D].** Un expediente incompleto expone a la empresa ante una fiscalización.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Solicitudes pendientes y documentos faltantes.
- *Distribución:* Solicitudes · expedientes incompletos · altas y bajas recientes.
- *Menú:* Inicio · Solicitudes · Trabajadores · Contratos · Asistencia · Documentos
- *Tablas y formularios:* Formularios: alta, permiso, certificado.
- *Acciones rápidas:* Registrar alta; Emitir certificado; Registrar permiso
- *Alertas:* Documento obligatorio faltante
- *Notificaciones:* Nueva solicitud.
- *Estado vacío:* “No hay solicitudes pendientes.”
- *Componentes especializados:* Lista de verificación del expediente.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Documentos completos | Expedientes con documentos obligatorios (no se registran) | ⛔ sin fuente en SIMA |
| Plazo de respuesta | Solicitudes con fecha (no existen) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Solicitudes e ingresos.
- *Procesa:* Registra y archiva.
- *Produce:* Expedientes y certificados.
- *Destinatarios:* Trabajadores, RR. HH.
- *Consecuencia:* El expediente queda completo.

**Permisos propuestos [P]** · aplicaciones: Web

- Fichas de personal: consultar, crear, editar — empresa
- Contratos: consultar, crear, editar — empresa
- Desvinculaciones: consultar — empresa
- Asistencia y ausentismo: consultar, registrar — empresa
- Cuentas de acceso SIMA: consultar — empresa
- Habilitaciones y competencias: consultar — empresa
- Gestión documental *(módulo parcial)*: consultar, crear — empresa

**Por validar con la empresa [V].** Si el asistente debe ver datos sensibles (hoy sí).

**Hoy en SIMA 4.1.** Edita fichas y contratos y ve datos sensibles. No hay solicitudes ni expedientes documentales.

---

## Familia 8 · Seguridad, salud y medioambiente

### 50 · Profesional o encargado/a de prevención de riesgos

**Dashboard propuesto:** «Prevención SST» · **Canal según el Excel:** app · **Perfil SIMA:** `prevencion` · **Tipo:** Terreno · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Asesora sobre peligros, controles, capacitación y mejora de seguridad y salud en el trabajo.
- **Qué hace:** Participa en evaluaciones de riesgos, inspecciones, investigaciones, planes preventivos y verificación de controles.
- **Qué entrega:** Matriz de riesgos, programas, registros y reportes de incidentes.
- **Se coordina con:** Todas las áreas, organismo administrador y comité paritario.
- **Cómo medir:** Controles cerrados, acciones preventivas, exposición a riesgos.
- **Conocimientos:** Prevención de riesgos, normativa y gestión participativa.
</details>

**A. Para qué existe [D].** Asesora y verifica que los peligros estén controlados. Investiga cada evento para que no se repita.

**B. Jornada [D]**

1. *Al comenzar:* Revisa eventos reportados sin investigar, accidentes y casi accidentes recientes, y habilitaciones de seguridad vencidas.
2. *Durante:* Investiga eventos, hace inspecciones, actualiza la matriz de riesgos y verifica controles.
3. *Al coordinarse:* Con todas las áreas, el organismo administrador y el comité paritario.
4. *Ante una anomalía:* Ante un accidente, asegura la atención, registra el evento, activa la investigación y comunica a la gerencia.
5. *Al cerrar:* Actualiza acciones preventivas y su estado.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Investigación y cierre de eventos, controles requeridos, detención de una tarea insegura. *Escala a:* Gerencia de planta.

**D. Información que consulta [D].** Eventos SST por tipo y área; Matriz de riesgos; Inspecciones; Habilitaciones de seguridad; Acciones preventivas.

**E. Información que genera o modifica [D]**

- *Registrar:* Investigaciones, inspecciones y controles.
- *Aprobar:* Cierre de eventos.
- *Editar:* Matriz de riesgos y habilitaciones de seguridad.
- *Cerrar:* Eventos con acciones verificadas.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Datos médicos individuales, sueldos, contratos.

**G. Impacto en la empresa [D].** Un evento sin investigar se repite; un control no verificado expone a las personas.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Eventos por investigar y accidentes.
- *Distribución:* Franja (eventos del mes, por investigar, días sin accidentes, acciones vencidas) · eventos · riesgos por zona · habilitaciones de seguridad.
- *Menú:* Prevención SST · Eventos · Investigaciones · Riesgos · Inspecciones · Habilitaciones · Explorador
- *Tablas y formularios:* Tablas: eventos, acciones. Formularios: investigación, inspección, acción preventiva.
- *Acciones rápidas:* Investigar evento; Registrar inspección; Cerrar evento
- *Alertas:* Accidente; Evento sin investigar 48 horas; Habilitación de seguridad vencida
- *Notificaciones:* Nuevo evento reportado desde planta.
- *Estado vacío:* “No hay eventos por investigar.”
- *Componentes especializados:* Mapa de calor de riesgos por zona, contador de días sin accidentes.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Controles cerrados | Acciones de eventos cerradas | 🟡 datos parciales |
| Acciones preventivas | Acciones con plazo (no se registran por separado) | 🟡 datos parciales |
| Exposición a riesgos | Matriz de riesgos (no existe) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Reportes de todos los trabajadores.
- *Procesa:* Investiga y define controles.
- *Produce:* Eventos cerrados, matriz actualizada.
- *Destinatarios:* Gerencia, jefaturas, comité.
- *Consecuencia:* Cambian procedimientos y habilitaciones exigidas.

**Permisos propuestos [P]** · aplicaciones: Desktop, Web

- Incidentes y acciones de seguridad: consultar, registrar, aprobar o rechazar, cerrar, exportar — planta
- Matriz de riesgos e inspecciones de seguridad *(módulo propuesto)*: consultar, crear, editar — planta
- Habilitaciones y competencias: consultar, editar — planta
- Planta, áreas, líneas y equipos: consultar — planta
- Alarmas y eventos de planta: consultar — planta
- Órdenes de trabajo de mantenimiento: consultar — planta
- Plan de emergencia, brigada y simulacros *(módulo propuesto)*: consultar, editar — planta
- Rutinas y checklist: consultar — planta

**Por validar con la empresa [V].** Si necesita SIMA Web además de Desktop para informes.

**Hoy en SIMA 4.1.** Gestiona y cierra incidentes, edita habilitaciones. No hay matriz de riesgos ni inspecciones.

---

### 51 · Integrantes del comité paritario / delegado SST

**Dashboard propuesto:** «Comité paritario» · **Canal según el Excel:** app · **Perfil SIMA:** `prevencion` · **Tipo:** Terreno · **Dotación:** 2/2

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Representan la participación preventiva de trabajadores y empleador según corresponda.
- **Qué hace:** Revisan condiciones, proponen medidas, participan en instancias y seguimiento conforme a funciones legales.
- **Qué entrega:** Actas, observaciones y seguimiento de medidas.
- **Se coordina con:** Trabajadores, empleador, HSE y organismo administrador.
- **Cómo medir:** Recomendaciones cerradas, participación y cobertura.
- **Conocimientos:** Formación requerida, comunicación y prevención.
</details>

**A. Para qué existe [D].** Representa la participación de trabajadores y empleador en la prevención.

**B. Jornada [D]**

1. *Al comenzar:* Revisa observaciones abiertas y medidas recomendadas.
2. *Durante:* Revisa condiciones, registra observaciones y participa en investigaciones.
3. *Al coordinarse:* Con trabajadores, empleador, prevención y organismo administrador.
4. *Ante una anomalía:* Si detecta un riesgo no resuelto, lo registra y hace seguimiento.
5. *Al cerrar:* Deja actas y seguimientos.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Recomendaciones del comité. *Escala a:* Prevención y gerencia.

**D. Información que consulta [D].** Eventos SST (sin datos médicos); Observaciones; Medidas recomendadas.

**E. Información que genera o modifica [D]**

- *Registrar:* Observaciones y actas.
- *Crear:* Recomendaciones.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Datos personales y médicos, sueldos.

**G. Impacto en la empresa [D].** Sus recomendaciones cierran riesgos que la operación no prioriza.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Riesgos no resueltos.
- *Distribución:* Observaciones · recomendaciones con seguimiento · actas.
- *Menú:* Comité paritario · Observaciones · Recomendaciones · Eventos · Mi cargo
- *Tablas y formularios:* Formularios: observación, acta.
- *Acciones rápidas:* Registrar observación; Registrar acta
- *Alertas:* Recomendación vencida
- *Notificaciones:* Prevención cerró una medida.
- *Estado vacío:* “No hay observaciones abiertas.”
- *Componentes especializados:* Seguimiento de recomendaciones.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Recomendaciones cerradas | Recomendaciones (no existen) | ⛔ sin fuente en SIMA |
| Participación y cobertura | Actas e inspecciones (no existen) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Condiciones y eventos.
- *Procesa:* Revisa y recomienda.
- *Produce:* Actas y recomendaciones.
- *Destinatarios:* Prevención y gerencia.
- *Consecuencia:* Medidas preventivas.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Incidentes y acciones de seguridad: consultar, registrar — planta
- Matriz de riesgos e inspecciones de seguridad *(módulo propuesto)*: consultar, registrar — planta

**Por validar con la empresa [V].** Si los integrantes del comité tienen además su cargo productivo (doble rol).

**Hoy en SIMA 4.1.** Perfil prevención (inicio ajustado). No hay observaciones ni actas.

---

### 52 · Responsable de medioambiente

**Dashboard propuesto:** «Gestión ambiental» · **Canal según el Excel:** app · **Perfil SIMA:** `prevencion` · **Tipo:** Terreno · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Gestiona permisos, residuos, consumos e impactos ambientales de la operación.
- **Qué hace:** Controla segregación de residuos, contratistas, monitoreos, requisitos de permisos y emergencias ambientales.
- **Qué entrega:** Registros de residuos, cumplimiento y planes ambientales.
- **Se coordina con:** Planta, compras, mantenimiento, HSE y externos.
- **Cómo medir:** Cumplimiento ambiental, incidentes, consumos.
- **Conocimientos:** Gestión ambiental y requisitos sectoriales.
</details>

**A. Para qué existe [D].** Controla residuos, consumos e impactos ambientales y el cumplimiento de permisos.

**B. Jornada [D]**

1. *Al comenzar:* Revisa vencimientos de permisos y monitoreos programados.
2. *Durante:* Controla la segregación de residuos, contratistas y consumos.
3. *Al coordinarse:* Con planta, compras, mantenimiento, prevención y externos.
4. *Ante una anomalía:* Ante un derrame o incidente ambiental, registra, contiene y notifica.
5. *Al cerrar:* Registra residuos generados y retirados.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Controles ambientales. *Escala a:* Gerencia de planta.

**D. Información que consulta [D].** Residuos; Consumos de agua y energía; Permisos ambientales; Monitoreos.

**E. Información que genera o modifica [D]**

- *Registrar:* Residuos, monitoreos e incidentes ambientales.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Datos personales, sueldos.

**G. Impacto en la empresa [D].** Un incumplimiento ambiental puede detener la planta.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Permisos por vencer e incidentes.
- *Distribución:* Residuos del mes · consumos · permisos · incidentes.
- *Menú:* Gestión ambiental · Residuos · Consumos · Permisos · Incidentes
- *Tablas y formularios:* Formularios: registro de residuo, monitoreo, incidente ambiental.
- *Acciones rápidas:* Registrar residuo; Registrar incidente
- *Alertas:* Permiso por vencer; Consumo anómalo
- *Notificaciones:* Contratista retiró residuos.
- *Estado vacío:* “No hay registros ambientales.”
- *Componentes especializados:* Series de consumo.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Cumplimiento ambiental | Permisos y monitoreos (no existen) | ⛔ sin fuente en SIMA |
| Incidentes | Incidentes ambientales (no existen; se podría usar SST con un tipo ambiental) | ⛔ sin fuente en SIMA |
| Consumos | Energía y agua (no se miden) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Operación y contratistas.
- *Procesa:* Controla.
- *Produce:* Registros de cumplimiento.
- *Destinatarios:* Gerencia, autoridades.
- *Consecuencia:* Planta opera dentro de sus permisos.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Residuos, consumos y permisos ambientales *(módulo propuesto)*: consultar, crear, registrar, editar — planta
- Incidentes y acciones de seguridad: consultar, registrar — planta
- Servicios generales y contratistas *(módulo propuesto)*: consultar — planta

**Por validar con la empresa [V].** Qué permisos ambientales tiene la planta.

**Hoy en SIMA 4.1.** Perfil prevención. No existe el módulo ambiental.

---

### 53 · Encargado/a de salud ocupacional y ergonomía

**Dashboard propuesto:** «Salud y ergonomía» · **Canal según el Excel:** app · **Perfil SIMA:** `prevencion` · **Tipo:** Terreno · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Coordina vigilancia de exposición y acciones preventivas relacionadas con salud laboral.
- **Qué hace:** Trabaja con organismos pertinentes para controles de higiene, ergonomía, reintegro y condiciones de trabajo.
- **Qué entrega:** Programas y seguimiento protegido de información sensible.
- **Se coordina con:** Prevención, RR. HH., supervisión y prestadores.
- **Cómo medir:** Cobertura preventiva y acciones correctivas.
- **Conocimientos:** Salud ocupacional, privacidad y coordinación.
</details>

**A. Para qué existe [D].** Coordina la vigilancia de exposición y las medidas de salud laboral, protegiendo la información médica.

**B. Jornada [D]**

1. *Al comenzar:* Revisa evaluaciones de puesto pendientes y medidas en curso.
2. *Durante:* Coordina controles de higiene y ergonomía con organismos externos.
3. *Al coordinarse:* Con prevención, RR. HH., supervisión y prestadores.
4. *Ante una anomalía:* Si un puesto presenta riesgo ergonómico, propone medidas.
5. *Al cerrar:* Registra el seguimiento sin datos clínicos.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Medidas preventivas por puesto. *Escala a:* Prevención y RR. HH.

**D. Información que consulta [D].** Evaluaciones de puesto; Medidas preventivas; Eventos SST.

**E. Información que genera o modifica [D]**

- *Registrar:* Evaluaciones de puesto y medidas.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Diagnósticos médicos individuales en SIMA; sueldos.

**G. Impacto en la empresa [D].** Un riesgo ergonómico no atendido aumenta ausentismo y licencias.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Medidas pendientes por puesto.
- *Distribución:* Evaluaciones por puesto · medidas · cobertura.
- *Menú:* Salud y ergonomía · Evaluaciones · Medidas · Eventos
- *Tablas y formularios:* Formularios: evaluación de puesto, medida.
- *Acciones rápidas:* Registrar evaluación; Registrar medida
- *Alertas:* Medida vencida
- *Notificaciones:* Nueva solicitud de evaluación.
- *Estado vacío:* “No hay evaluaciones pendientes.”
- *Componentes especializados:* Mapa de puestos con nivel de riesgo.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Cobertura preventiva | Puestos evaluados (no existen) | ⛔ sin fuente en SIMA |
| Acciones correctivas | Medidas cerradas (no existen) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Solicitudes y evaluaciones.
- *Procesa:* Coordina con prestadores.
- *Produce:* Medidas por puesto.
- *Destinatarios:* Prevención, supervisión.
- *Consecuencia:* Puestos más seguros.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Matriz de riesgos e inspecciones de seguridad *(módulo propuesto)*: consultar, registrar — planta
- Incidentes y acciones de seguridad: consultar — planta
- Asistencia y ausentismo: consultar — solo totales

**Por validar con la empresa [V].** Confirmar que SIMA no debe guardar ningún dato clínico.

**Hoy en SIMA 4.1.** Perfil prevención. No hay evaluaciones de puesto.

---

### 54 · Equipo de respuesta a emergencias / brigada

**Dashboard propuesto:** «Brigada de emergencia» · **Canal según el Excel:** app · **Perfil SIMA:** `prevencion` · **Tipo:** Terreno · **Dotación:** 2/2

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Apoya respuestas previstas ante eventos, según formación y plan de emergencia.
- **Qué hace:** Conoce alarmas, rutas, rol asignado, ejercicios y límites de actuación; activa servicios especializados.
- **Qué entrega:** Registros de simulacro e inspección de equipamiento.
- **Se coordina con:** HSE, jefaturas, personas y organismos externos.
- **Cómo medir:** Simulacros ejecutados, hallazgos cerrados.
- **Conocimientos:** Entrenamiento específico y coordinación.
</details>

**A. Para qué existe [D].** Responde a emergencias según su formación y mantiene el equipamiento de emergencia operativo.

**B. Jornada [D]**

1. *Al comenzar:* Revisa su rol asignado, inspecciones de equipamiento y el próximo simulacro.
2. *Durante:* Inspecciona extintores, rutas y equipos de emergencia.
3. *Al coordinarse:* Con prevención, jefaturas y organismos externos.
4. *Ante una anomalía:* En una emergencia, activa la respuesta según el plan y registra lo actuado.
5. *Al cerrar:* Registra inspecciones y hallazgos.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Activar la respuesta de su rol. *Escala a:* Prevención y servicios externos.

**D. Información que consulta [D].** Plan de emergencia; Rol asignado; Equipamiento y su estado; Simulacros.

**E. Información que genera o modifica [D]**

- *Registrar:* Inspecciones de equipamiento, simulacros y hallazgos.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Datos personales, sueldos.

**G. Impacto en la empresa [D].** Un equipo de emergencia vencido falla cuando más se necesita.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Equipamiento vencido y rol asignado.
- *Distribución:* Mi rol · inspecciones pendientes · simulacros · zonas bloqueadas.
- *Menú:* Brigada de emergencia · Inspecciones · Simulacros · Plan de emergencia · Mi cargo
- *Tablas y formularios:* Formularios: inspección de equipamiento, registro de simulacro.
- *Acciones rápidas:* Registrar inspección; Registrar simulacro; Reportar hallazgo
- *Alertas:* Equipo de emergencia vencido; Simulacro atrasado
- *Notificaciones:* Simulacro programado.
- *Estado vacío:* “No hay inspecciones pendientes.”
- *Componentes especializados:* Plano con ubicación del equipamiento.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Simulacros ejecutados | Simulacros (no existen) | ⛔ sin fuente en SIMA |
| Hallazgos cerrados | Hallazgos de inspección (no existen) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Plan de emergencia.
- *Procesa:* Inspecciona y entrena.
- *Produce:* Registros de simulacro e inspección.
- *Destinatarios:* Prevención.
- *Consecuencia:* Planta preparada ante emergencias.

**Permisos propuestos [P]** · aplicaciones: Desktop

- Plan de emergencia, brigada y simulacros *(módulo propuesto)*: consultar, registrar — planta
- Incidentes y acciones de seguridad: consultar, registrar — planta
- Habilitaciones y competencias: consultar — propio

**Por validar con la empresa [V].** Si los brigadistas tienen además un cargo productivo.

**Hoy en SIMA 4.1.** Perfil prevención. No hay plan de emergencia ni simulacros.

---

## Familia 9 · Finanzas, sistemas y apoyo administrativo

### 55 · Gerente/a financiero/a o jefe/a de finanzas

**Dashboard propuesto:** «Finanzas» · **Canal según el Excel:** web · **Perfil SIMA:** `finanzas_adm` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Asegura liquidez, control financiero y decisiones económicas sostenibles.
- **Qué hace:** Elabora presupuestos, pronósticos, análisis de capital de trabajo y revisiones de rentabilidad.
- **Qué entrega:** Estados de gestión, flujo de caja y presupuesto.
- **Se coordina con:** Gerencia, compras, ventas y operaciones.
- **Cómo medir:** Flujo de caja, margen, desviación presupuestaria.
- **Conocimientos:** Finanzas, control interno y análisis.
</details>

**A. Para qué existe [D].** Asegura liquidez y control financiero; es la segunda firma de los pagos de remuneraciones y la dueña de los parámetros legales.

**B. Jornada [D]**

1. *Al comenzar:* Revisa caja, pagos programados y aprobaciones pendientes (cierre de remuneraciones, parámetros).
2. *Durante:* Elabora presupuestos y pronósticos, revisa rentabilidad y capital de trabajo.
3. *Al coordinarse:* Con gerencia, compras, ventas y operaciones.
4. *Ante una anomalía:* Si la caja proyectada no cubre pagos, prioriza y escala.
5. *Al cerrar:* Aprueba pagos y revisa el flujo.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Aprobación de pagos, parámetros legales de remuneraciones, presupuesto. *Escala a:* Gerencia general.

**D. Información que consulta [D].** Flujo de caja; Presupuesto vs. real; Remuneraciones; Costos; Cuentas por pagar y cobrar.

**E. Información que genera o modifica [D]**

- *Aprobar:* Cierre de remuneraciones y parámetros legales.
- *Editar:* Parámetros de remuneraciones y presupuesto.
- *Exportar:* Estados de gestión.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Información técnica de planta, OT, PLC.

**G. Impacto en la empresa [D].** Sin su aprobación no se paga; con un parámetro mal fijado, todas las liquidaciones salen mal.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Aprobaciones y caja.
- *Distribución:* Caja y proyección · aprobaciones · presupuesto vs. real · remuneraciones del período.
- *Menú:* Inicio · Aprobaciones · Presupuesto · Remuneraciones · Parámetros · Indicadores
- *Tablas y formularios:* Tablas: presupuesto por centro, pagos. Formularios: aprobación con comentario, parámetro.
- *Acciones rápidas:* Aprobar cierre; Validar parámetros; Exportar estado
- *Alertas:* Cierre esperando aprobación; Desviación de presupuesto
- *Notificaciones:* Remuneraciones preparó el cierre.
- *Estado vacío:* “No hay aprobaciones pendientes.”
- *Componentes especializados:* Cascada presupuestaria.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Flujo de caja | Movimientos de caja (no existen) | ⛔ sin fuente en SIMA |
| Margen | Ventas y costos (no existen) | ⛔ sin fuente en SIMA |
| Desviación presupuestaria | Presupuesto (no existe) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Cierres, presupuestos, pagos.
- *Procesa:* Revisa y aprueba.
- *Produce:* Pagos aprobados y presupuesto.
- *Destinatarios:* Tesorería, gerencia.
- *Consecuencia:* Tesorería ejecuta pagos.

**Permisos propuestos [P]** · aplicaciones: Web

- Remuneraciones: consultar, aprobar o rechazar, exportar — empresa
- Descuentos y conceptos variables: consultar — empresa
- Parámetros de remuneraciones: consultar, editar, aprobar o rechazar — empresa
- Fichas de personal: consultar — empresa
- Contratos: consultar — empresa
- Desvinculaciones: consultar — empresa
- Asistencia y ausentismo: consultar — empresa
- Presupuesto y flujo de caja *(módulo propuesto)*: consultar, crear, editar, aprobar o rechazar — empresa
- Costos industriales *(módulo propuesto)*: consultar — empresa
- Indicadores: consultar — empresa
- Auditoría: consultar — empresa
- Permisos por cargo: consultar — empresa
- Solicitudes y órdenes de compra *(módulo propuesto)*: consultar, aprobar o rechazar — empresa
- Órdenes y registros de producción: consultar — solo totales

**Por validar con la empresa [V].** Límite de aprobación de compras por finanzas.

**Hoy en SIMA 4.1.** Aprueba cierres y parámetros. No hay presupuesto ni caja.

---

### 56 · Contador/a y analista contable

**Dashboard propuesto:** «Contabilidad» · **Canal según el Excel:** web · **Perfil SIMA:** `finanzas_adm` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Registra operaciones y apoya reportes tributarios/contables que correspondan.
- **Qué hace:** Concilia facturas, activos, provisiones y cierres; mantiene soportes y controles.
- **Qué entrega:** Conciliaciones, libros y reportes del cierre.
- **Se coordina con:** Finanzas, compras, RR. HH. y auditoría.
- **Cómo medir:** Errores, cierres oportunos, conciliaciones pendientes.
- **Conocimientos:** Contabilidad, ERP y normativa aplicable.
</details>

**A. Para qué existe [D].** Registra las operaciones y concilia lo que dicen los sistemas con lo que respaldan los documentos.

**B. Jornada [D]**

1. *Al comenzar:* Revisa conciliaciones pendientes y documentos por contabilizar.
2. *Durante:* Concilia facturas, activos y provisiones.
3. *Al coordinarse:* Con finanzas, compras, RR. HH. y auditoría.
4. *Ante una anomalía:* Si una conciliación no cuadra, la marca y pide respaldo.
5. *Al cerrar:* Avanza el cierre contable.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Tratamiento contable. *Escala a:* Finanzas.

**D. Información que consulta [D].** Remuneraciones (para provisiones); Parámetros; Recepciones y facturas; Activos.

**E. Información que genera o modifica [D]**

- *Registrar:* Conciliaciones y asientos.
- *Exportar:* Reportes de cierre.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Datos personales más allá de lo necesario, información técnica.

**G. Impacto en la empresa [D].** Un cierre tardío retrasa los informes de gestión.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Conciliaciones pendientes.
- *Distribución:* Conciliaciones · cierre del mes · remuneraciones del período.
- *Menú:* Inicio · Conciliaciones · Remuneraciones · Parámetros · Informes
- *Tablas y formularios:* Tablas: conciliaciones. Formularios: conciliación.
- *Acciones rápidas:* Conciliar; Exportar
- *Alertas:* Conciliación pendiente al cierre
- *Notificaciones:* Cierre de remuneraciones aprobado.
- *Estado vacío:* “No hay conciliaciones pendientes.”
- *Componentes especializados:* Lista de cierre.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Errores | Correcciones contables (no existen) | ⛔ sin fuente en SIMA |
| Cierres oportunos | Fecha de cierre (no existe) | ⛔ sin fuente en SIMA |
| Conciliaciones pendientes | Conciliaciones (no existen) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Documentos y registros.
- *Procesa:* Concilia.
- *Produce:* Libros y reportes.
- *Destinatarios:* Finanzas, auditoría.
- *Consecuencia:* Estados confiables.

**Permisos propuestos [P]** · aplicaciones: Web

- Remuneraciones: consultar, exportar — empresa
- Parámetros de remuneraciones: consultar — empresa
- Costos industriales *(módulo propuesto)*: consultar — empresa
- Solicitudes y órdenes de compra *(módulo propuesto)*: consultar — empresa
- Presupuesto y flujo de caja *(módulo propuesto)*: consultar — empresa

**Por validar con la empresa [V].** Si la contabilidad seguirá en un ERP externo (SIMA solo exporta).

**Hoy en SIMA 4.1.** Ve remuneraciones y parámetros. No hay contabilidad en SIMA.

---

### 57 · Analista de costos industriales

**Dashboard propuesto:** «Costos industriales» · **Canal según el Excel:** web · **Perfil SIMA:** `finanzas_adm` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Determina costos por producto, orden, línea o proceso y explica desviaciones.
- **Qué hace:** Analiza materiales, mano de obra, energía, scrap, estándares y centros de costo.
- **Qué entrega:** Costo estándar/real, análisis de variación y rentabilidad.
- **Se coordina con:** Finanzas, producción, procesos y compras.
- **Cómo medir:** Precisión del costo, desviaciones explicadas.
- **Conocimientos:** Costeo, procesos productivos y datos.
</details>

**A. Para qué existe [D].** Calcula cuánto cuesta producir cada producto y explica por qué el real se aleja del estándar.

**B. Jornada [D]**

1. *Al comenzar:* Revisa producción, consumos y scrap del período.
2. *Durante:* Calcula costo real, lo compara con el estándar y analiza variaciones.
3. *Al coordinarse:* Con finanzas, producción, procesos y compras.
4. *Ante una anomalía:* Si una variación es grande, la investiga con producción.
5. *Al cerrar:* Emite el análisis de variación.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Metodología de costeo. *Escala a:* Finanzas.

**D. Información que consulta [D].** Producción y scrap; Consumos de materiales y repuestos; Horas (en totales); Remuneraciones en totales; Estándares.

**E. Información que genera o modifica [D]**

- *Crear:* Costos estándar y análisis de variación.
- *Exportar:* Rentabilidad por producto.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Remuneraciones individuales, datos personales.

**G. Impacto en la empresa [D].** Precios y decisiones de producto dependen de un costo bien calculado.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Variaciones del período.
- *Distribución:* Costo real vs. estándar · variaciones por causa · scrap valorizado.
- *Menú:* Inicio · Costos · Variaciones · Producción · Indicadores
- *Tablas y formularios:* Tablas: costo por producto. Formularios: estándar.
- *Acciones rápidas:* Actualizar estándar; Exportar análisis
- *Alertas:* Variación sobre umbral
- *Notificaciones:* Cierre de producción del período.
- *Estado vacío:* “No hay costos estándar definidos.”
- *Componentes especializados:* Cascada de variaciones.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Precisión del costo | Costos reales y estándar (no existen) | ⛔ sin fuente en SIMA |
| Desviaciones explicadas | Variaciones con causa (no existen) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Producción, consumos, remuneraciones en totales.
- *Procesa:* Costea.
- *Produce:* Costos y variaciones.
- *Destinatarios:* Finanzas, comercial, gerencia.
- *Consecuencia:* Decisiones de precio y mejora.

**Permisos propuestos [P]** · aplicaciones: Web

- Costos industriales *(módulo propuesto)*: consultar, crear, editar, exportar — empresa
- Órdenes y registros de producción: consultar — solo totales
- Remuneraciones: consultar — solo totales
- Repuestos y pañol: consultar — planta
- Indicadores: consultar — empresa
- Materiales y requerimientos (MRP) *(módulo propuesto)*: consultar — planta

**Por validar con la empresa [V].** Base de asignación de costos indirectos.

**Hoy en SIMA 4.1.** Ve producción y remuneraciones en totales. No hay costos.

---

### 58 · Tesorería / cuentas por pagar y cobrar

**Dashboard propuesto:** «Tesorería» · **Canal según el Excel:** web · **Perfil SIMA:** `finanzas_adm` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Administra calendario de pagos, recaudaciones y posiciones de caja.
- **Qué hace:** Revisa autorizaciones, vencimientos, conciliaciones y gestión de cobro.
- **Qué entrega:** Programación de pagos y cuentas conciliadas.
- **Se coordina con:** Finanzas, ventas, compras y proveedores.
- **Cómo medir:** Pagos a tiempo, cartera vencida, conciliaciones.
- **Conocimientos:** Control financiero, organización y ERP.
</details>

**A. Para qué existe [D].** Administra pagos, cobros y posición de caja con autorizaciones verificadas.

**B. Jornada [D]**

1. *Al comenzar:* Revisa pagos del día, vencimientos y cobros.
2. *Durante:* Ejecuta pagos aprobados, registra cobros y concilia.
3. *Al coordinarse:* Con finanzas, ventas, compras y proveedores.
4. *Ante una anomalía:* Si un pago no tiene aprobación, no lo ejecuta.
5. *Al cerrar:* Concilia cuentas.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Calendario de pagos según aprobaciones. *Escala a:* Finanzas.

**D. Información que consulta [D].** Pagos aprobados (incluye remuneraciones); Vencimientos; Datos bancarios para pagar.

**E. Información que genera o modifica [D]**

- *Registrar:* Pagos y cobros.
- *Exportar:* Archivo de pago.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Información técnica, contratos (salvo lo necesario para pagar).

**G. Impacto en la empresa [D].** Un pago a destiempo genera multas o corta el suministro.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Pagos del día.
- *Distribución:* Calendario de pagos · cobros vencidos · conciliaciones.
- *Menú:* Inicio · Pagos · Cobros · Remuneraciones aprobadas
- *Tablas y formularios:* Tablas: pagos, cobros. Formularios: registro de pago.
- *Acciones rápidas:* Registrar pago; Exportar archivo de pago
- *Alertas:* Pago vencido; Cartera vencida
- *Notificaciones:* Cierre de remuneraciones aprobado para pago.
- *Estado vacío:* “No hay pagos programados hoy.”
- *Componentes especializados:* Calendario.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Pagos a tiempo | Pagos con vencimiento (no existen) | ⛔ sin fuente en SIMA |
| Cartera vencida | Cobros (no existen) | ⛔ sin fuente en SIMA |
| Conciliaciones | Conciliaciones bancarias (no existen) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Pagos aprobados.
- *Procesa:* Ejecuta y concilia.
- *Produce:* Pagos y cuentas conciliadas.
- *Destinatarios:* Proveedores, trabajadores, finanzas.
- *Consecuencia:* Se cumplen las obligaciones.

**Permisos propuestos [P]** · aplicaciones: Web

- Remuneraciones: consultar, exportar — empresa
- Fichas de personal: consultar — empresa

**Por validar con la empresa [V].** Si tesorería necesita ver datos bancarios dentro de SIMA o el archivo se genera sin mostrarlos.

**Hoy en SIMA 4.1.** Ve remuneraciones y datos sensibles. No hay pagos ni cobros.

---

### 59 · Soporte TI / ERP

**Dashboard propuesto:** «Soporte TI» · **Canal según el Excel:** web · **Perfil SIMA:** `finanzas_adm` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Mantiene operativos los sistemas corporativos usados por la planta.
- **Qué hace:** Atiende usuarios, respaldos, dispositivos, permisos y conectividad de negocio; coordina cambios con OT.
- **Qué entrega:** Tickets, inventario TI, respaldos y accesos.
- **Se coordina con:** Todas las áreas, ciberseguridad y OT.
- **Cómo medir:** Disponibilidad ERP, tiempos de solución, accesos correctos.
- **Conocimientos:** Sistemas, redes y seguridad de información.
</details>

**A. Para qué existe [D].** Mantiene operativos los sistemas y cuentas. Administra accesos, pero administrar una cuenta no le da derecho a leer la información de las personas.

**B. Jornada [D]**

1. *Al comenzar:* Revisa tickets abiertos, cuentas bloqueadas y respaldos de la noche.
2. *Durante:* Atiende usuarios, desbloquea cuentas, restablece claves y coordina cambios con OT.
3. *Al coordinarse:* Con todas las áreas, ciberseguridad y OT.
4. *Ante una anomalía:* Si un respaldo falla o hay accesos anómalos, investiga con la auditoría.
5. *Al cerrar:* Cierra tickets.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Acciones técnicas sobre cuentas (bloqueo, clave, segundo factor) según solicitud autorizada. *Escala a:* RR. HH. (quién debe tener cuenta) y ciberseguridad.

**D. Información que consulta [D].** Estado de cuentas (sin datos personales ni sueldos); Auditoría de accesos; Tickets; Respaldos.

**E. Información que genera o modifica [D]**

- *Editar:* Estado técnico de cuentas (desbloquear, restablecer clave, quitar segundo factor) y la matriz de permisos por cargo, bajo instrucción documentada.
- *Crear:* Tickets.
- *Cerrar:* Tickets.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Remuneraciones, contratos, datos personales sensibles, información financiera. No debe recibirlos por compartir perfil con finanzas.

**G. Impacto en la empresa [D].** Una cuenta mal gestionada deja a alguien sin trabajar o con accesos indebidos.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Cuentas bloqueadas y tickets.
- *Distribución:* Tickets · cuentas bloqueadas · auditoría reciente · respaldos.
- *Menú:* Inicio · Cuentas de acceso · Tickets · Auditoría · Permisos por cargo
- *Tablas y formularios:* Tablas: cuentas (correo, estado, último acceso), tickets. Formularios: ticket.
- *Acciones rápidas:* Desbloquear cuenta; Restablecer clave; Cerrar sesiones; Atender ticket
- *Alertas:* Cuenta bloqueada; Respaldo fallido; Intentos fallidos repetidos
- *Notificaciones:* Nuevo ticket.
- *Estado vacío:* “No hay tickets abiertos.”
- *Componentes especializados:* Línea de tiempo de auditoría.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Disponibilidad ERP | Salud del servidor (existe el chequeo pero no el historial) | 🟡 datos parciales |
| Tiempos de solución | Tickets (no existen) | ⛔ sin fuente en SIMA |
| Accesos correctos | Auditoría de cambios de cuenta | ✅ hay datos en SIMA |

**Flujo de información [D]**

- *Recibe:* Solicitudes de usuarios y RR. HH.
- *Procesa:* Resuelve técnicamente.
- *Produce:* Cuentas operativas, tickets cerrados.
- *Destinatarios:* Usuarios, RR. HH.
- *Consecuencia:* Las personas acceden a lo que su cargo permite.

**Permisos propuestos [P]** · aplicaciones: Web

- Cuentas de acceso SIMA: consultar, editar — empresa
- Auditoría: consultar — empresa
- Permisos por cargo: consultar, editar — empresa
- Mesa de ayuda TI *(módulo propuesto)*: consultar, crear, editar, cerrar — empresa

**Por validar con la empresa [V].** Si TI debe editar la matriz de permisos o solo aplicarla.

**Hoy en SIMA 4.1.** Gestiona cuentas, permisos y auditoría. La web le muestra además planta y mantenimiento, que no son su trabajo.

---

### 60 · Encargado/a de servicios generales y contratistas

**Dashboard propuesto:** «Servicios generales» · **Canal según el Excel:** web · **Perfil SIMA:** `finanzas_adm` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Mantiene servicios auxiliares y controla prestaciones contratadas.
- **Qué hace:** Coordina limpieza, vigilancia, comedor, infraestructura y accesos conforme a reglas del sitio.
- **Qué entrega:** Contratos, evaluaciones y planes de servicios.
- **Se coordina con:** Administración, HSE, RR. HH. y proveedores.
- **Cómo medir:** Servicios disponibles, incidentes y cumplimiento.
- **Conocimientos:** Administración de contratos y coordinación.
</details>

**A. Para qué existe [D].** Mantiene los servicios auxiliares (aseo, vigilancia, comedor, infraestructura) y controla a los contratistas.

**B. Jornada [D]**

1. *Al comenzar:* Revisa solicitudes de servicio e incidencias de contratistas.
2. *Durante:* Coordina servicios y accesos de contratistas, evalúa su cumplimiento.
3. *Al coordinarse:* Con administración, prevención, RR. HH. y proveedores.
4. *Ante una anomalía:* Si un servicio falla, activa el reemplazo y registra la incidencia.
5. *Al cerrar:* Registra evaluaciones.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Coordinación diaria de servicios. *Escala a:* Jefatura de administración.

**D. Información que consulta [D].** Contratos de servicio; Solicitudes; Contratistas en planta.

**E. Información que genera o modifica [D]**

- *Registrar:* Trabajos de servicio, incidencias y evaluaciones.
- *Crear:* Solicitudes a contratistas.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Información financiera, remuneraciones, datos personales.

**G. Impacto en la empresa [D].** Un servicio caído afecta a toda la planta.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Incidencias abiertas.
- *Distribución:* Solicitudes · contratistas en planta · evaluaciones.
- *Menú:* Inicio · Servicios · Contratistas · Solicitudes
- *Tablas y formularios:* Formularios: solicitud, incidencia, evaluación.
- *Acciones rápidas:* Registrar incidencia; Evaluar servicio
- *Alertas:* Servicio crítico caído; Contratista sin acreditación
- *Notificaciones:* Nueva solicitud.
- *Estado vacío:* “No hay solicitudes abiertas.”
- *Componentes especializados:* Lista de contratistas con acreditación.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Servicios disponibles | Incidencias de servicio (no existen) | ⛔ sin fuente en SIMA |
| Incidentes | Incidentes de contratistas (no existen) | ⛔ sin fuente en SIMA |
| Cumplimiento | Evaluaciones (no existen) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Solicitudes y contratos.
- *Procesa:* Coordina.
- *Produce:* Servicios prestados y evaluados.
- *Destinatarios:* Administración, planta.
- *Consecuencia:* Planta con servicios operativos.

**Permisos propuestos [P]** · aplicaciones: Web

- Servicios generales y contratistas *(módulo propuesto)*: consultar, crear, registrar, editar — planta
- Incidentes y acciones de seguridad: registrar — propio

**Por validar con la empresa [V].** Si el acceso de contratistas a planta se controlará en SIMA.

**Hoy en SIMA 4.1.** Perfil finanzas sin capacidades financieras (bien). No existe el módulo de servicios.

---

## Familia 10 · Comercial, cliente y diseño de producto

### 61 · Gerente/a comercial o ejecutivo/a de cuentas

**Dashboard propuesto:** «Comercial» · **Canal según el Excel:** web · **Perfil SIMA:** `comercial` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Transforma necesidades de clientes en demanda y acuerdos rentables.
- **Qué hace:** Gestiona cartera, precios, compromisos, previsiones y reclamos con áreas internas.
- **Qué entrega:** Contratos, pedidos confirmados y forecast comercial.
- **Se coordina con:** Clientes, planificación, finanzas y calidad.
- **Cómo medir:** Ventas rentables, satisfacción y exactitud forecast.
- **Conocimientos:** Negociación, mercado y conocimiento del producto.
</details>

**A. Para qué existe [D].** Convierte necesidades de clientes en pedidos rentables y compromisos que la planta pueda cumplir.

**B. Jornada [D]**

1. *Al comenzar:* Revisa pedidos en riesgo, reclamos abiertos y el forecast del mes.
2. *Durante:* Negocia precios y fechas, registra acuerdos y actualiza el forecast.
3. *Al coordinarse:* Con clientes, planificación, finanzas y calidad.
4. *Ante una anomalía:* Si un pedido no podrá cumplirse, negocia con el cliente antes de que venza.
5. *Al cerrar:* Actualiza la cartera.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Precios dentro de su banda autorizada y compromisos de fecha validados con planificación. *Escala a:* Gerencia general (precios fuera de banda).

**D. Información que consulta [D].** Cartera y pedidos; Estado de producción y despacho de sus pedidos; Reclamos; Precios autorizados.

**E. Información que genera o modifica [D]**

- *Crear:* Pedidos y acuerdos.
- *Editar:* Forecast.
- *Registrar:* Compromisos con clientes.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Costos detallados, remuneraciones, datos personales, información técnica de planta.

**G. Impacto en la empresa [D].** Un compromiso no validado con planificación termina en atraso y reclamo.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Pedidos en riesgo y reclamos.
- *Distribución:* Pedidos por estado · en riesgo · forecast vs. real · reclamos.
- *Menú:* Inicio · Pedidos · Clientes · Forecast · Reclamos · Despachos
- *Tablas y formularios:* Tablas: pedidos, clientes. Formularios: pedido, acuerdo, forecast.
- *Acciones rápidas:* Registrar pedido; Actualizar forecast; Ver estado del pedido
- *Alertas:* Pedido en riesgo de atraso; Reclamo de cliente
- *Notificaciones:* Despacho entregó un pedido; calidad retuvo un lote de su pedido.
- *Estado vacío:* “No hay pedidos registrados.”
- *Componentes especializados:* Seguimiento del pedido de punta a punta.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Ventas rentables | Ventas y costos (no existen) | ⛔ sin fuente en SIMA |
| Satisfacción | Encuestas o reclamos (no existen) | ⛔ sin fuente en SIMA |
| Exactitud forecast | Forecast y ventas reales (no existen) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Necesidades de clientes.
- *Procesa:* Negocia.
- *Produce:* Pedidos confirmados y forecast.
- *Destinatarios:* Planificación, finanzas, despacho.
- *Consecuencia:* Planificación programa la fabricación.

**Permisos propuestos [P]** · aplicaciones: Web

- Pedidos y clientes *(módulo propuesto)*: consultar, crear, editar, exportar — empresa
- Despachos y transporte: consultar — empresa
- Órdenes y registros de producción: consultar — solo totales
- No conformidades y lotes: consultar — empresa
- Indicadores: consultar — solo totales

**Por validar con la empresa [V].** Si los pedidos se ingresan en SIMA o se importan del ERP.

**Hoy en SIMA 4.1.** Ve despachos, producción y calidad. No hay pedidos ni clientes.

---

### 62 · Servicio al cliente / gestión de pedidos

**Dashboard propuesto:** «Servicio al cliente» · **Canal según el Excel:** web · **Perfil SIMA:** `comercial` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Confirma estados de pedidos y coordina respuestas frente a cambios o problemas.
- **Qué hace:** Registra pedidos, seguimiento, solicitudes de devolución y comunicaciones con logística.
- **Qué entrega:** Órdenes depuradas y respuestas trazables.
- **Se coordina con:** Comercial, planificación, calidad y despachos.
- **Cómo medir:** Tiempo de respuesta, errores de pedido y reclamos.
- **Conocimientos:** ERP, comunicación y procesos de despacho.
</details>

**A. Para qué existe [D].** Responde al cliente con el estado real de su pedido y coordina cambios y devoluciones.

**B. Jornada [D]**

1. *Al comenzar:* Revisa consultas y solicitudes abiertas.
2. *Durante:* Registra pedidos, sigue su avance y gestiona devoluciones.
3. *Al coordinarse:* Con comercial, planificación, calidad y despacho.
4. *Ante una anomalía:* Si un pedido se atrasa, informa al cliente con la nueva fecha.
5. *Al cerrar:* Cierra solicitudes respondidas.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Respuesta al cliente según el estado registrado. *Escala a:* Comercial.

**D. Información que consulta [D].** Pedidos y su estado; Despachos; Reclamos y devoluciones.

**E. Información que genera o modifica [D]**

- *Registrar:* Pedidos, solicitudes y devoluciones.
- *Editar:* Estado de la solicitud.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Costos, remuneraciones, datos personales.

**G. Impacto en la empresa [D].** Una respuesta errónea al cliente daña la relación comercial.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Solicitudes abiertas y pedidos atrasados.
- *Distribución:* Solicitudes · pedidos con estado · devoluciones.
- *Menú:* Inicio · Solicitudes · Pedidos · Despachos · Devoluciones
- *Tablas y formularios:* Formularios: solicitud, devolución.
- *Acciones rápidas:* Registrar solicitud; Consultar pedido; Registrar devolución
- *Alertas:* Solicitud sin respuesta; Pedido atrasado
- *Notificaciones:* Cambio de estado de un pedido.
- *Estado vacío:* “No hay solicitudes abiertas.”
- *Componentes especializados:* Línea de tiempo del pedido.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Tiempo de respuesta | Solicitudes con fecha (no existen) | ⛔ sin fuente en SIMA |
| Errores de pedido | Pedidos corregidos (no existen) | ⛔ sin fuente en SIMA |
| Reclamos | Reclamos (no existen) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Consultas de clientes.
- *Procesa:* Consulta estados y coordina.
- *Produce:* Respuestas trazables.
- *Destinatarios:* Clientes, comercial.
- *Consecuencia:* El cliente sabe el estado real.

**Permisos propuestos [P]** · aplicaciones: Web

- Pedidos y clientes *(módulo propuesto)*: consultar, registrar, editar — empresa
- Despachos y transporte: consultar — empresa
- No conformidades y lotes: consultar — empresa

**Por validar con la empresa [V].** Canal de contacto del cliente (correo; portal).

**Hoy en SIMA 4.1.** Ve despachos. No hay pedidos ni solicitudes.

---

### 63 · Diseñador/a de producto o ingeniería de producto

**Dashboard propuesto:** «Ingeniería de producto» · **Canal según el Excel:** web · **Perfil SIMA:** `comercial` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Define especificaciones de producto fabricable y su documentación.
- **Qué hace:** Actualiza planos, materiales, versiones, tolerancias, prototipos y cambios controlados.
- **Qué entrega:** Planos/BOM revisados, especificaciones y cambios.
- **Se coordina con:** I+D, procesos, calidad, compras y producción.
- **Cómo medir:** Tiempo de industrialización, cambios correctos, defectos de diseño.
- **Conocimientos:** CAD, materiales y gestión de cambios.
</details>

**A. Para qué existe [D].** Define qué se fabrica (planos, materiales, tolerancias) y controla cada cambio técnico.

**B. Jornada [D]**

1. *Al comenzar:* Revisa cambios de ingeniería en curso y consultas de producción o calidad.
2. *Durante:* Actualiza planos, BOM y especificaciones; gestiona prototipos.
3. *Al coordinarse:* Con I+D, procesos, calidad, compras y producción.
4. *Ante una anomalía:* Si un defecto proviene del diseño, abre un cambio controlado.
5. *Al cerrar:* Publica versiones aprobadas.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Contenido técnico del producto. *Escala a:* Gerencia (cambios mayores).

**D. Información que consulta [D].** Especificaciones y versiones; BOM; Defectos de diseño; Materiales.

**E. Información que genera o modifica [D]**

- *Crear:* Especificaciones, BOM y cambios de ingeniería.
- *Editar:* Versiones.
- *Aprobar:* Cambios técnicos (con calidad).

**F. Lo que NO debe ver (mínimo privilegio) [D].** Costos detallados, remuneraciones, datos personales.

**G. Impacto en la empresa [D].** Una versión equivocada en planta fabrica un producto que no corresponde.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Cambios en curso.
- *Distribución:* Productos · cambios de ingeniería · versiones vigentes.
- *Menú:* Inicio · Productos · Cambios · Documentos
- *Tablas y formularios:* Tablas: productos con versión. Formularios: cambio de ingeniería.
- *Acciones rápidas:* Crear cambio; Publicar versión
- *Alertas:* Cambio sin aprobación; Defecto de diseño reportado
- *Notificaciones:* Calidad aprobó un cambio.
- *Estado vacío:* “No hay productos registrados.”
- *Componentes especializados:* Historial de versiones.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Tiempo de industrialización | Cambios con fecha de inicio y liberación (no existen) | ⛔ sin fuente en SIMA |
| Cambios correctos | Cambios sin reversión (no existen) | ⛔ sin fuente en SIMA |
| Defectos de diseño | NC con causa de diseño (no hay causa estructurada) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Necesidades del cliente, defectos.
- *Procesa:* Diseña y versiona.
- *Produce:* Planos/BOM revisados.
- *Destinatarios:* Procesos, producción, compras, calidad.
- *Consecuencia:* Producción fabrica la versión vigente.

**Permisos propuestos [P]** · aplicaciones: Web

- Especificaciones, BOM y cambios de ingeniería *(módulo propuesto)*: consultar, crear, editar, aprobar o rechazar — empresa
- Gestión documental *(módulo parcial)*: consultar, crear, editar — empresa
- No conformidades y lotes: consultar — empresa
- Materiales y requerimientos (MRP) *(módulo propuesto)*: consultar — planta

**Por validar con la empresa [V].** Si los planos CAD se enlazan desde SIMA o se suben como archivo.

**Hoy en SIMA 4.1.** Perfil comercial (ve despachos). No hay productos ni cambios de ingeniería.

---

### 64 · Responsable de desarrollo de proveedores

**Dashboard propuesto:** «Desarrollo de proveedores» · **Canal según el Excel:** web · **Perfil SIMA:** `logistica` · **Tipo:** Administrativo · **Dotación:** 1/1

<details open><summary><b>[E] Lo que define el Excel</b></summary>

- **Para qué existe:** Evalúa capacidades y riesgos de proveedores estratégicos.
- **Qué hace:** Realiza homologaciones, auditorías y seguimiento de calidad/capacidad en conjunto con compras.
- **Qué entrega:** Evaluación y planes de mejora de proveedores.
- **Se coordina con:** Compras, calidad, ingeniería y proveedores.
- **Cómo medir:** Rechazos de proveedor, cumplimiento de entrega.
- **Conocimientos:** Auditorías, negociación técnica y análisis de riesgos.
</details>

**A. Para qué existe [D].** Evalúa capacidades y riesgos de proveedores estratégicos y los ayuda a mejorar.

**B. Jornada [D]**

1. *Al comenzar:* Revisa rechazos y atrasos de proveedores.
2. *Durante:* Realiza homologaciones y auditorías, y sigue planes de mejora.
3. *Al coordinarse:* Con compras, calidad, ingeniería y proveedores.
4. *Ante una anomalía:* Si un proveedor crítico empeora, propone un plan o una alternativa.
5. *Al cerrar:* Actualiza evaluaciones.

**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* Homologación de proveedores. *Escala a:* Compras y calidad.

**D. Información que consulta [D].** Rechazos en recepción; Entregas; Auditorías; Capacidad del proveedor.

**E. Información que genera o modifica [D]**

- *Registrar:* Evaluaciones y auditorías.
- *Crear:* Planes de mejora.
- *Aprobar:* Homologación.

**F. Lo que NO debe ver (mínimo privilegio) [D].** Datos personales, remuneraciones.

**G. Impacto en la empresa [D].** Un proveedor no homologado entrega fuera de especificación.

**H. Interfaz SIMA [P]**

- *Información prioritaria:* Proveedores en riesgo.
- *Distribución:* Ranking de proveedores · auditorías · planes de mejora.
- *Menú:* Inicio · Proveedores · Evaluaciones · Auditorías · Planes de mejora
- *Tablas y formularios:* Formularios: evaluación, auditoría, plan.
- *Acciones rápidas:* Evaluar proveedor; Registrar auditoría
- *Alertas:* Rechazos sobre umbral; Entregas atrasadas
- *Notificaciones:* Recepción rechazó material de un proveedor.
- *Estado vacío:* “No hay proveedores evaluados.”
- *Componentes especializados:* Tarjeta de desempeño del proveedor.

**I. Cómo se mide (indicadores del Excel y su fuente)**

| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |
|---|---|---|
| Rechazos de proveedor | Recepciones rechazadas (no existen) | ⛔ sin fuente en SIMA |
| Cumplimiento de entrega | OC y recepciones (no existen) | ⛔ sin fuente en SIMA |

**Flujo de información [D]**

- *Recibe:* Datos de recepción y calidad.
- *Procesa:* Evalúa.
- *Produce:* Evaluaciones y planes.
- *Destinatarios:* Compras, calidad.
- *Consecuencia:* Base de proveedores más confiable.

**Permisos propuestos [P]** · aplicaciones: Web

- Proveedores y evaluaciones *(módulo propuesto)*: consultar, crear, editar, aprobar o rechazar — empresa
- Solicitudes y órdenes de compra *(módulo propuesto)*: consultar — empresa
- No conformidades y lotes: consultar — empresa
- Bodega: ubicaciones, recepciones y conteos *(módulo propuesto)*: consultar — planta

**Por validar con la empresa [V].** Criterios de homologación.

**Hoy en SIMA 4.1.** Perfil logística (ve despachos). No hay proveedores.

---
