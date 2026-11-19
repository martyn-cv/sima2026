"""Perfiles de acceso. Cada uno de los 64 cargos del informe de roles se asigna a uno de estos perfiles;
el perfil decide canal (app o web), menú, panel y permisos."""

# --- perfil -> (nombre, canal, menú principal, menú extra, bloques del panel) ---
# Bloques "k:" son indicadores (tarjetas) y "l:" son listas; se arman en paneles.py
PERFILES = {
    # ---------------- terreno (app móvil, PC y escritorio) ----------------
    "operador": dict(nombre="Operador de máquina o proceso", canal="app",
        menu=["inicio", "mapa", "reportar", "mis_reportes"], extras=["equipos", "rutinas", "seguridad", "catalogo", "mi_cargo", "perfil"],
        panel=["k:mis_reportes_abiertos", "k:cumplimiento_plan", "k:tasa_defectos", "l:mis_reportes", "l:rutinas_pendientes"], acciones=[["reportar", "Avisar una falla"], ["rutinas", "Checklist del turno"], ["seguridad", "Reportar condición insegura"]]),
    "supervisor_turno": dict(nombre="Supervisor o líder de línea", canal="app",
        menu=["inicio", "mapa", "traspaso", "reportes"], extras=["rutinas", "equipos", "ordenes", "paradas", "calidad", "seguridad", "indicadores", "catalogo", "mi_cargo", "perfil"],
        panel=["k:equipos_parados", "k:alarmas", "k:reportes_sin_tomar", "k:oee", "l:alarmas_activas", "l:reportes_sin_tomar", "l:ultimo_traspaso", "l:rutinas_pendientes"], acciones=[["traspaso", "Entregar turno"], ["rutinas", "Checklist de inicio"], ["paradas", "Registrar una parada"]]),
    "tecnico": dict(nombre="Técnico de mantenimiento", canal="app",
        menu=["inicio", "ordenes", "equipos", "rutinas"], extras=["mapa", "avisar", "herramientas", "repuestos", "reportes", "monitor", "notas", "catalogo", "mi_cargo", "perfil"],
        panel=["k:mis_ot", "k:reportes_sin_tomar", "k:alarmas", "k:stock_critico", "l:mis_ot", "l:reportes_sin_tomar", "l:alarmas_activas", "l:rutinas_pendientes"], acciones=[["avisar", "Avisar a ingenieros"], ["reportes", "Fallas por tomar"], ["herramientas", "Mis herramientas"]]),
    "supervisor_mant": dict(nombre="Supervisor de mantenimiento", canal="app",
        menu=["inicio", "avisos", "ordenes", "mapa"], extras=["reportes", "equipos", "planificacion", "herramientas", "repuestos", "rutinas", "monitor", "notas", "indicadores", "catalogo", "mi_cargo", "perfil"],
        panel=["k:avisos", "k:ot_sin_avance", "k:alarmas", "k:mttr", "l:ot_sin_avance", "l:avisos_pendientes", "l:alarmas_activas", "l:reportes_sin_tomar"], acciones=[["avisos", "Avisos de técnicos"], ["ordenes", "Órdenes"], ["reportes", "Fallas por atender"]]),
    "jefe_mant": dict(nombre="Jefe y planificador de mantenimiento", canal="app",
        menu=["inicio", "ordenes", "planificacion", "indicadores"], extras=["mapa", "equipos", "avisos", "repuestos", "herramientas", "rutinas", "informes", "monitor", "catalogo", "mi_cargo", "perfil"],
        panel=["k:disponibilidad", "k:mttr", "k:mtbf", "k:stock_critico", "l:planes_proximos", "l:ot_sin_avance", "l:stock_critico", "l:herramientas_calibracion"], acciones=[["planificacion", "Planificación"], ["indicadores", "Indicadores"], ["ordenes", "Órdenes"]]),
    "confiabilidad": dict(nombre="Confiabilidad y lubricación", canal="app",
        menu=["inicio", "monitor", "rutinas", "equipos"], extras=["ordenes", "herramientas", "notas", "indicadores", "catalogo", "mi_cargo", "perfil"],
        panel=["k:alarmas", "k:rutinas_hoy", "k:mtbf", "k:equipos_parados", "l:alarmas_activas", "l:rutinas_pendientes"], acciones=[["monitor", "Monitor en vivo"], ["rutinas", "Rutas de lubricación"], ["equipos", "Equipos"]]),
    "ing_automatizacion": dict(nombre="Automatización, control y OT", canal="app",
        menu=["inicio", "plcs", "monitor", "avisos"], extras=["mapa", "equipos", "ordenes", "notas", "informes", "catalogo", "mi_cargo", "perfil"],
        panel=["k:plc_linea", "k:plc_alarma", "k:alarmas", "k:plc_revision", "l:plc_atencion", "l:alarmas_activas", "l:avisos_pendientes"], acciones=[["plcs", "PLC"], ["monitor", "Monitor en vivo"], ["avisos", "Avisos"]]),
    "instrumentacion": dict(nombre="Instrumentación, calibración y metrología", canal="app",
        menu=["inicio", "herramientas", "equipos", "rutinas"], extras=["monitor", "ordenes", "notas", "catalogo", "mi_cargo", "perfil"],
        panel=["k:calibraciones_vencidas", "k:calibraciones_proximas", "k:herramientas_prestadas", "k:rutinas_hoy", "l:herramientas_calibracion", "l:rutinas_pendientes"], acciones=[["herramientas", "Instrumentos y calibración"], ["rutinas", "Rutinas"], ["equipos", "Equipos"]]),
    "panol": dict(nombre="Repuestos, pañol y bodega", canal="app",
        menu=["inicio", "repuestos", "herramientas", "ordenes"], extras=["equipos", "indicadores", "catalogo", "mi_cargo", "perfil"],
        panel=["k:stock_critico", "k:herramientas_prestadas", "k:repuestos_por_entregar", "k:exactitud_inventario", "l:stock_critico", "l:repuestos_por_entregar", "l:herramientas_prestadas"], acciones=[["repuestos", "Repuestos"], ["herramientas", "Herramientas"], ["ordenes", "Órdenes con repuestos"]]),
    "calidad_terreno": dict(nombre="Inspección y laboratorio de calidad", canal="app",
        menu=["inicio", "calidad", "equipos", "mapa"], extras=["rutinas", "indicadores", "catalogo", "mi_cargo", "perfil"],
        panel=["k:no_conformes", "k:tasa_defectos", "k:calibraciones_vencidas", "l:no_conformes", "l:rutinas_pendientes"], acciones=[["calidad", "No conformidades"], ["equipos", "Equipos"]]),
    "prevencion": dict(nombre="Prevención de riesgos y HSE", canal="app",
        menu=["inicio", "seguridad", "rutinas", "mapa"], extras=["equipos", "indicadores", "catalogo", "mi_cargo", "perfil"],
        panel=["k:incidentes_abiertos", "k:acciones_vencidas", "k:cierre_acciones", "l:incidentes_abiertos", "l:acciones_hse", "l:rutinas_pendientes"], acciones=[["seguridad", "Incidentes y acciones"], ["rutinas", "Inspecciones"]]),
    # ---------------- oficina (web) ----------------
    "gerencia": dict(nombre="Gerencia y dirección de planta", canal="web",
        menu=["panel", "mapa", "indicadores", "finanzas", "mantencion", "procesos", "transporte", "organizacion", "seguridad", "catalogo", "informes"], extras=[],
        panel=["k:oee", "k:cumplimiento_plan", "k:otif", "k:resultado_mes", "l:procesos_bloqueados", "l:despachos_retrasados", "l:incidentes_abiertos", "l:alarmas_activas"], acciones=[]),
    "finanzas_adm": dict(nombre="Administración, finanzas y TI", canal="web",
        menu=["panel", "finanzas", "contratos", "organizacion", "indicadores", "inventario", "catalogo", "informes"], extras=[],
        panel=["k:gasto_mes", "k:ingresos_mes", "k:contratos_vigentes", "k:contratos_vencer", "l:contratos_por_vencer", "l:ultimos_movimientos"], acciones=[]),
    "produccion_ing": dict(nombre="Producción, procesos y planificación", canal="web",
        menu=["panel", "mapa", "procesos", "planificacion", "mantencion", "calidad", "indicadores", "inventario", "catalogo", "informes"], extras=[],
        panel=["k:oee", "k:cumplimiento_plan", "k:tasa_defectos", "k:procesos_curso", "l:procesos_bloqueados", "l:planes_proximos", "l:no_conformes"], acciones=[]),
    "calidad_gestion": dict(nombre="Gestión de calidad", canal="web",
        menu=["panel", "calidad", "procesos", "indicadores", "catalogo", "informes"], extras=[],
        panel=["k:tasa_defectos", "k:no_conformes", "k:calibraciones_vencidas", "k:oee", "l:no_conformes", "l:procesos_bloqueados"], acciones=[]),
    "logistica": dict(nombre="Planificación, compras y logística", canal="web",
        menu=["panel", "transporte", "inventario", "planificacion", "indicadores", "catalogo", "informes"], extras=[],
        panel=["k:otif", "k:despachos_ruta", "k:despachos_retrasados_n", "k:exactitud_inventario", "l:despachos_retrasados", "l:stock_critico"], acciones=[]),
    "rrhh": dict(nombre="Personas y relaciones laborales", canal="web",
        menu=["panel", "contratos", "organizacion", "seguridad", "indicadores", "informes"], extras=[],
        panel=["k:contratos_vigentes", "k:contratos_vencer", "k:ausentismo", "k:cierre_acciones", "l:contratos_por_vencer", "l:acciones_hse"], acciones=[]),
    "comercial": dict(nombre="Comercial y servicio al cliente", canal="web",
        menu=["panel", "transporte", "procesos", "indicadores", "informes"], extras=[],
        panel=["k:otif", "k:despachos_ruta", "k:despachos_retrasados_n", "k:tasa_defectos", "l:despachos_retrasados", "l:despachos_activos"], acciones=[]),
}

# --- cargo del informe (n.º) -> perfil ---
CARGO_PERFIL = {}
for perfil, cargos in {
    "gerencia": [1, 2, 3], "finanzas_adm": [4, 5, 55, 56, 57, 58, 59, 60], "produccion_ing": [6, 16, 17, 21, 36, 37],
    "supervisor_turno": [7, 8], "operador": [9, 10, 11, 12, 13, 14, 15], "ing_automatizacion": [18, 19, 22],
    "instrumentacion": [20, 35], "jefe_mant": [23, 24], "supervisor_mant": [25], "tecnico": [26, 27, 28],
    "confiabilidad": [29], "panol": [30, 39, 40, 41], "calidad_gestion": [31, 32], "calidad_terreno": [33, 34],
    "logistica": [38, 42, 43, 64], "rrhh": [44, 45, 46, 47, 48, 49], "prevencion": [50, 51, 52, 53, 54],
    "comercial": [61, 62, 63],
}.items():
    for n in cargos:
        CARGO_PERFIL[n] = perfil
assert sorted(CARGO_PERFIL) == list(range(1, 65)), "faltan cargos"

ROLES_APP = tuple(p for p, d in PERFILES.items() if d["canal"] == "app")
ROLES_WEB = tuple(p for p, d in PERFILES.items() if d["canal"] == "web")
ALL = ROLES_APP + ROLES_WEB

# --- grupos para permisos ---
MANT = ("tecnico", "supervisor_mant", "jefe_mant", "confiabilidad", "ing_automatizacion", "instrumentacion")
MANT_GEST = ("supervisor_mant", "jefe_mant")
PRODUCCION = ("operador", "supervisor_turno")
GERENCIAL = ("gerencia", "produccion_ing")
