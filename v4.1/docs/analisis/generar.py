"""
Genera los documentos del análisis funcional de SIMA a partir de dos fuentes:

  1. La hoja «Cargos» de datos/SIMA_base_de_datos.xlsx  → lo que DEFINE el Excel (se copia tal cual, sin reescribir).
  2. Las fichas de docs/analisis/cargos/*.yaml            → lo que se DEDUCE y lo que se PROPONE para cada cargo.

Salidas (en docs/analisis/):
  CATALOGO_CARGOS.md   entregables 2, 4 y 10: ficha funcional, jornada, interfaz y flujo de información de los 64 cargos
  MATRIZ_PERMISOS.md   entregable 3: matriz cargo × módulo, aplicaciones y diferencias con la matriz vigente del servidor
  catalogo.json        las mismas fichas en formato de datos, para que las aplicaciones muestren «Mi jornada»

Uso:  python3 docs/analisis/generar.py         (desde v4.1/)
Valida que estén los 64 cargos, que cada ficha tenga todos los campos y que los módulos citados existan en el catálogo.
"""
from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

import openpyxl
import yaml

RAIZ = Path(__file__).resolve().parent
EXCEL = RAIZ.parent.parent / "datos" / "SIMA_base_de_datos.xlsx"

# --------------------------------------------------------------------------------------------- catálogo de módulos
# estado: existe (implementado en SIMA 4.1) · parcial (existe una parte) · propuesto (no existe todavía)
MODULOS: dict[str, tuple[str, str, str]] = {
    "personal": ("Fichas de personal", "Personas", "existe"),
    "contratos": ("Contratos", "Personas", "existe"),
    "terminos": ("Desvinculaciones", "Personas", "existe"),
    "cuentas": ("Cuentas de acceso SIMA", "Personas", "existe"),
    "asistencia": ("Asistencia y ausentismo", "Personas", "existe"),
    "habilitaciones": ("Habilitaciones y competencias", "Personas", "existe"),
    "seleccion": ("Vacantes y selección", "Personas", "propuesto"),
    "capacitacion": ("Cursos y matriz de formación", "Personas", "propuesto"),
    "casos": ("Casos laborales y bienestar (confidencial)", "Personas", "propuesto"),
    "remuneraciones": ("Remuneraciones", "Pagos", "existe"),
    "conceptos": ("Descuentos y conceptos variables", "Pagos", "existe"),
    "parametros": ("Parámetros de remuneraciones", "Pagos", "existe"),
    "pedidos": ("Pedidos y clientes", "Comercial", "propuesto"),
    "producto": ("Especificaciones, BOM y cambios de ingeniería", "Comercial", "propuesto"),
    "plan_prod": ("Programa de producción y capacidad", "Producción", "parcial"),
    "produccion": ("Órdenes y registros de producción", "Producción", "existe"),
    "traspaso": ("Traspaso y bitácora de turno", "Producción", "existe"),
    "rutinas": ("Rutinas y checklist", "Producción", "existe"),
    "materiales": ("Materiales y requerimientos (MRP)", "Abastecimiento", "propuesto"),
    "inventario": ("Bodega: ubicaciones, recepciones y conteos", "Abastecimiento", "propuesto"),
    "compras": ("Solicitudes y órdenes de compra", "Abastecimiento", "propuesto"),
    "proveedores": ("Proveedores y evaluaciones", "Abastecimiento", "propuesto"),
    "despachos": ("Despachos y transporte", "Abastecimiento", "existe"),
    "equipos": ("Planta, áreas, líneas y equipos", "Planta", "existe"),
    "eventos": ("Alarmas y eventos de planta", "Planta", "existe"),
    "ot": ("Órdenes de trabajo de mantenimiento", "Mantenimiento", "existe"),
    "repuestos": ("Repuestos y pañol", "Mantenimiento", "existe"),
    "herramientas": ("Herramientas", "Mantenimiento", "existe"),
    "calibraciones": ("Instrumentos y calibraciones", "Mantenimiento", "parcial"),
    "condicion": ("Monitoreo de condición y rutas", "Mantenimiento", "parcial"),
    "plc": ("Controladores PLC y cambios de programa", "Automatización", "existe"),
    "plc_comandos": ("Mandos a distancia a PLC", "Automatización", "existe"),
    "simulador": ("SIMA PLC Simulator", "Automatización", "existe"),
    "calidad": ("No conformidades y lotes", "Calidad", "existe"),
    "inspecciones": ("Inspecciones, ensayos y planes de control", "Calidad", "propuesto"),
    "sst": ("Incidentes y acciones de seguridad", "SST y ambiente", "existe"),
    "riesgos": ("Matriz de riesgos e inspecciones de seguridad", "SST y ambiente", "propuesto"),
    "ambiente": ("Residuos, consumos y permisos ambientales", "SST y ambiente", "propuesto"),
    "emergencias": ("Plan de emergencia, brigada y simulacros", "SST y ambiente", "propuesto"),
    "kpis": ("Indicadores", "Gestión", "existe"),
    "presupuesto": ("Presupuesto y flujo de caja", "Gestión", "propuesto"),
    "costos": ("Costos industriales", "Gestión", "propuesto"),
    "proyectos": ("Proyectos industriales y de mejora", "Gestión", "propuesto"),
    "documentos": ("Gestión documental", "Gestión", "parcial"),
    "servicios": ("Servicios generales y contratistas", "Gestión", "propuesto"),
    "tickets": ("Mesa de ayuda TI", "Sistemas", "propuesto"),
    "auditoria": ("Auditoría", "Sistemas", "existe"),
    "permisos": ("Permisos por cargo", "Sistemas", "existe"),
}
ACCIONES = {"c": "consultar", "cr": "crear", "r": "registrar", "e": "editar", "as": "asignar", "ap": "aprobar o rechazar", "ci": "cerrar", "x": "exportar", "s": "solicitar"}
ALCANCES = {"pr": "propio", "eq": "su equipo", "ln": "su línea", "ar": "su área", "pl": "planta", "em": "empresa", "ag": "solo totales"}
ESTADO_IND = {"hoy": "✅ hay datos en SIMA", "parcial": "🟡 datos parciales", "falta": "⛔ sin fuente en SIMA"}
CAMPOS = ["id", "dashboard", "proposito", "jornada", "decide", "escala", "consulta", "genera", "no_ve", "impacto", "ui", "medir", "flujo", "permisos", "apps", "validar", "hoy"]
CAMPOS_UI = ["prioridad", "disposicion", "menu", "datos", "acciones", "alertas", "notificaciones", "vacio", "componentes"]


def leer_excel() -> list[dict]:
    wb = openpyxl.load_workbook(EXCEL, read_only=True, data_only=True)
    filas = list(wb["Cargos"].iter_rows(values_only=True))
    cab = filas[0]
    return [dict(zip(cab, f)) for f in filas[1:] if f[0] is not None]


def leer_fichas() -> dict[int, dict]:
    fichas: dict[int, dict] = {}
    for archivo in sorted((RAIZ / "cargos").glob("*.yaml")):
        for f in yaml.safe_load(archivo.read_text(encoding="utf-8")) or []:
            if f["id"] in fichas:
                sys.exit(f"Cargo {f['id']} repetido en {archivo.name}")
            f["_archivo"] = archivo.name
            fichas[f["id"]] = f
    return fichas


def parsear_permiso(v: str) -> tuple[list[str], str]:
    acc, _, alc = v.partition("@")
    return [a.strip() for a in acc.split(",") if a.strip()], alc.strip() or "em"


def validar(cargos: list[dict], fichas: dict[int, dict]) -> list[str]:
    errores = []
    ids = {int(c["id_cargo"]) for c in cargos}
    for i in sorted(ids - fichas.keys()):
        errores.append(f"falta la ficha del cargo {i}")
    for i, f in fichas.items():
        for c in CAMPOS:
            if c not in f:
                errores.append(f"cargo {i}: falta el campo «{c}»")
        for c in CAMPOS_UI:
            if c not in f.get("ui", {}):
                errores.append(f"cargo {i}: falta ui.{c}")
        for m, v in (f.get("permisos") or {}).items():
            if m not in MODULOS:
                errores.append(f"cargo {i}: módulo desconocido «{m}»")
            acc, alc = parsear_permiso(v)
            for a in acc:
                if a not in ACCIONES:
                    errores.append(f"cargo {i}: acción desconocida «{a}» en {m}")
            if alc not in ALCANCES:
                errores.append(f"cargo {i}: alcance desconocido «{alc}» en {m}")
        for ind in f.get("medir", []):
            if len(ind) != 3 or ind[2] not in ESTADO_IND:
                errores.append(f"cargo {i}: indicador mal formado {ind}")
    return errores


def lista(xs) -> str:
    return "; ".join(xs) if isinstance(xs, list) else str(xs)


def texto_permisos(p: dict) -> list[str]:
    filas = []
    for m, v in p.items():
        acc, alc = parsear_permiso(v)
        nombre, _, estado = MODULOS[m]
        marca = "" if estado == "existe" else " *(módulo propuesto)*" if estado == "propuesto" else " *(módulo parcial)*"
        filas.append(f"{nombre}{marca}: {', '.join(ACCIONES[a] for a in acc)} — {ALCANCES[alc]}")
    return filas


def ficha_md(c: dict, f: dict) -> str:
    j, ui, fl = f["jornada"], f["ui"], f["flujo"]
    g = f["genera"]
    out = [
        f"### {int(c['id_cargo']):02d} · {c['nombre_cargo']}",
        "",
        f"**Dashboard propuesto:** «{f['dashboard']}» · **Canal según el Excel:** {c['canal']} · **Perfil SIMA:** `{c['perfil_sima']}` · **Tipo:** {c['tipo_cargo']} · **Dotación:** {c['dotacion_actual']}/{c['dotacion_objetivo']}",
        "",
        "<details open><summary><b>[E] Lo que define el Excel</b></summary>",
        "",
        f"- **Para qué existe:** {c['para_que_existe']}",
        f"- **Qué hace:** {c['que_hace']}",
        f"- **Qué entrega:** {c['que_entrega']}",
        f"- **Se coordina con:** {c['se_coordina_con']}",
        f"- **Cómo medir:** {c['como_medir']}",
        f"- **Conocimientos:** {c['conocimientos']}",
        "</details>",
        "",
        f"**A. Para qué existe [D].** {f['proposito']}",
        "",
        "**B. Jornada [D]**",
        "",
        f"1. *Al comenzar:* {j['inicio']}",
        f"2. *Durante:* {j['durante']}",
        f"3. *Al coordinarse:* {j['coordina']}",
        f"4. *Ante una anomalía:* {j['anomalia']}",
        f"5. *Al cerrar:* {j['cierre']}",
        "",
        f"**C. Responsabilidades [D].** Ejecuta lo descrito en «qué hace» del Excel. *Decide:* {f['decide']} *Escala a:* {f['escala']}",
        "",
        f"**D. Información que consulta [D].** {lista(f['consulta'])}.",
        "",
        "**E. Información que genera o modifica [D]**",
        "",
    ]
    out += [f"- *{k.capitalize()}:* {v}" for k, v in g.items()]
    out += [
        "",
        f"**F. Lo que NO debe ver (mínimo privilegio) [D].** {f['no_ve']}",
        "",
        f"**G. Impacto en la empresa [D].** {f['impacto']}",
        "",
        "**H. Interfaz SIMA [P]**",
        "",
        f"- *Información prioritaria:* {ui['prioridad']}",
        f"- *Distribución:* {ui['disposicion']}",
        f"- *Menú:* {' · '.join(ui['menu'])}",
        f"- *Tablas y formularios:* {ui['datos']}",
        f"- *Acciones rápidas:* {lista(ui['acciones'])}",
        f"- *Alertas:* {lista(ui['alertas'])}",
        f"- *Notificaciones:* {ui['notificaciones']}",
        f"- *Estado vacío:* {ui['vacio']}",
        f"- *Componentes especializados:* {ui['componentes']}",
        "",
        "**I. Cómo se mide (indicadores del Excel y su fuente)**",
        "",
        "| Indicador | Fuente de datos necesaria | ¿Existe hoy en SIMA? |",
        "|---|---|---|",
    ]
    out += [f"| {k} | {fu} | {ESTADO_IND[e]} |" for k, fu, e in f["medir"]]
    out += [
        "",
        "**Flujo de información [D]**",
        "",
        f"- *Recibe:* {fl['entrada']}",
        f"- *Procesa:* {fl['procesa']}",
        f"- *Produce:* {fl['salida']}",
        f"- *Destinatarios:* {fl['destinatarios']}",
        f"- *Consecuencia:* {fl['consecuencia']}",
        "",
        f"**Permisos propuestos [P]** · aplicaciones: {', '.join(a.capitalize() for a in f['apps'])}",
        "",
    ]
    out += [f"- {t}" for t in texto_permisos(f["permisos"])]
    out += ["", f"**Por validar con la empresa [V].** {lista(f['validar'])}.", "", f"**Hoy en SIMA 4.1.** {f['hoy']}", "", "---", ""]
    return "\n".join(out)


def catalogo_md(cargos: list[dict], fichas: dict[int, dict]) -> str:
    out = [
        "# Catálogo funcional de los 64 cargos",
        "",
        "> Generado por `docs/analisis/generar.py` a partir de la hoja **Cargos** del Excel y de las fichas en `docs/analisis/cargos/`. No edite este archivo a mano.",
        "",
        "**Cómo leer cada ficha.** **[E]** es texto literal del Excel. **[D]** es lo que se deduce razonablemente de las funciones del cargo. **[P]** es una propuesta de funcionalidad o diseño. **[V]** son decisiones que debe validar la empresa. «Hoy en SIMA 4.1» describe lo que el código realmente tiene, no lo que debería tener.",
        "",
        "**Datos ficticios.** El Excel y la base de demostración son ficticios. Los indicadores marcados ⛔ no tienen fuente en SIMA: la interfaz debe mostrarlos como «sin datos», nunca con un valor inventado.",
        "",
        "## Índice",
        "",
    ]
    por_familia = defaultdict(list)
    for c in cargos:
        por_familia[(int(c["familia_n"]), c["familia"])].append(c)
    for (n, fam), cs in sorted(por_familia.items()):
        out.append(f"- **{n}. {fam}:** " + ", ".join(f"[{int(c['id_cargo']):02d} {c['nombre_cargo']}](#{ancla(c)})" for c in cs))
    out.append("")
    for (n, fam), cs in sorted(por_familia.items()):
        out += [f"## Familia {n} · {fam}", ""]
        for c in cs:
            out.append(ficha_md(c, fichas[int(c["id_cargo"])]))
    return "\n".join(out)


def ancla(c: dict) -> str:
    import re
    import unicodedata
    t = f"{int(c['id_cargo']):02d} · {c['nombre_cargo']}".lower()
    t = re.sub(r"[^\w\s-]", "", t, flags=re.UNICODE)
    return re.sub(r"\s", "-", t.strip())


CORTO = {"c": "C", "cr": "Cr", "r": "R", "e": "E", "as": "As", "ap": "Ap", "ci": "Ci", "x": "X", "s": "S"}


def celda(v: str | None) -> str:
    if not v:
        return "·"
    acc, alc = parsear_permiso(v)
    return "".join(CORTO[a] for a in acc) + ("" if alc == "em" else f"<sub>{alc}</sub>")


def matriz_md(cargos: list[dict], fichas: dict[int, dict], actual: dict[int, set[str]] | None) -> str:
    out = [
        "# Matriz de permisos por cargo",
        "",
        "> Generado por `docs/analisis/generar.py`. Es la matriz **propuesta** (entregable 3). La matriz vigente del servidor está en `api/Sima.Api/Servicios/Permisos.cs` y se puede editar por cargo en la web (Permisos por cargo).",
        "",
        "**Acciones:** " + " · ".join(f"**{CORTO[k]}** {v}" for k, v in ACCIONES.items()),
        "",
        "**Alcance** (subíndice; sin subíndice = empresa): " + " · ".join(f"**{k}** {v}" for k, v in ALCANCES.items() if k != "em"),
        "",
        "Reglas que aplican a todos los cargos y no se repiten en la tabla: cada persona consulta su propia ficha, sus habilitaciones y su cuenta; cualquier cuenta activa puede **reportar** una condición insegura o una falla; el directorio muestra solo nombre, cargo, turno y correo corporativo (en SIMA Desktop, solo nombre y cargo, como fija la hoja Permisos).",
        "",
    ]
    grupos = defaultdict(list)
    for k, (_, gr, _) in MODULOS.items():
        grupos[gr].append(k)
    por_familia = defaultdict(list)
    for c in cargos:
        por_familia[(int(c["familia_n"]), c["familia"])].append(c)
    for gr, mods in grupos.items():
        usados = [m for m in mods if any(m in fichas[int(c["id_cargo"])]["permisos"] for c in cargos)]
        if not usados:
            continue
        out += [f"## {gr}", "", "| Cargo | " + " | ".join(f"{MODULOS[m][0]}{'' if MODULOS[m][2] == 'existe' else ' ᴾ' if MODULOS[m][2] == 'propuesto' else ' ᵖᵃʳ'}" for m in usados) + " |", "|---|" + "---|" * len(usados)]
        for c in cargos:
            p = fichas[int(c["id_cargo"])]["permisos"]
            if not any(m in p for m in usados):
                continue
            out.append(f"| {int(c['id_cargo']):02d} {c['nombre_cargo']} | " + " | ".join(celda(p.get(m)) for m in usados) + " |")
        out.append("")
    out += ["ᴾ módulo propuesto (no existe todavía) · ᵖᵃʳ módulo parcial", "", "## Aplicaciones por cargo", "", "| Cargo | Canal (Excel) | Web | Desktop | Simulador |", "|---|---|---|---|---|"]
    for c in cargos:
        f = fichas[int(c["id_cargo"])]
        a = f["apps"]
        sim = f["permisos"].get("simulador")
        out.append(f"| {int(c['id_cargo']):02d} {c['nombre_cargo']} | {c['canal']} | {'✔' if 'web' in a else '—'} | {'✔' if 'desktop' in a else '—'} | {celda(sim) if sim else '—'} |")
    out += ["", "## Lo que cada cargo no debe ver", ""]
    for c in cargos:
        out.append(f"- **{int(c['id_cargo']):02d} {c['nombre_cargo']}:** {fichas[int(c['id_cargo'])]['no_ve']}")
    if actual is not None:
        out += diferencias_md(cargos, fichas, actual)
    return "\n".join(out) + "\n"


# Permisos que la propuesta da a todos y que el servidor resuelve con reglas generales (no se comparan cargo a cargo).
UNIVERSALES = {("habilitaciones", "c@pr"), ("sst", "r@pr"), ("ot", "cr@pr")}
NO_CONTROLADOS = {"eventos", "rutinas", "simulador"}      # el servidor no los controla por cargo (ver hallazgo H1)


def diferencias_md(cargos: list[dict], fichas: dict[int, dict], actual: dict[int, set[str]]) -> list[str]:
    """Compara por recurso existente: «falta» = la propuesta lo da y el servidor no; «sobra» = el servidor lo da sin que el
    trabajo del cargo lo justifique. «Equipos» solo se compara en edición, porque el servidor no controla su consulta."""
    out = ["", "## Diferencias con la matriz vigente del servidor", "",
           "Calculadas por `matriz_vigente.py` leyendo las reglas de `Permisos.cs`. Se comparan recursos (no alcances). «Falta»: la propuesta lo da y el servidor no. «Sobra»: el servidor lo da y la ficha del cargo no lo justifica.", ""]
    nombres = {"ordenes": "OT", "equipos": "edición de equipos"}
    total_f = total_s = 0
    for c in cargos:
        i = int(c["id_cargo"])
        prop = set()
        for m, v in fichas[i]["permisos"].items():
            if MODULOS[m][2] != "existe" or m in NO_CONTROLADOS or (m, v) in UNIVERSALES:
                continue
            acc, _ = parsear_permiso(v)
            if m == "equipos":
                if {"cr", "e"} & set(acc):
                    prop.add("equipos")
                continue
            prop.add("ordenes" if m == "ot" else m)
        vig = {k.split(".")[0] for k in actual.get(i, set()) if k not in ("sst.reportar", "ordenes.crear")}
        falta, sobra = sorted(prop - vig), sorted(vig - prop)
        total_f += len(falta); total_s += len(sobra)
        if falta or sobra:
            partes = [f"falta {', '.join(nombres.get(x, x) for x in falta)}" if falta else "", f"sobra {', '.join(nombres.get(x, x) for x in sobra)}" if sobra else ""]
            out.append(f"- **{i:02d} {c['nombre_cargo']}:** " + "; ".join(p for p in partes if p))
    out += ["", f"Total: {total_f} accesos que faltan y {total_s} que sobran. La mayoría de los «sobra» vienen de reglas por perfil (por ejemplo, `repuestos.ver`, `herramientas.ver` y `ordenes.ver` se dan a los 18 perfiles, incluidos RR. HH., finanzas y comercial)."]
    return out


def main() -> None:
    cargos = leer_excel()
    fichas = leer_fichas()
    errores = validar(cargos, fichas)
    if errores:
        print("\n".join(errores))
        if "--parcial" not in sys.argv:
            sys.exit(1)
        cargos = [c for c in cargos if int(c["id_cargo"]) in fichas]
    actual = None
    ruta_actual = RAIZ / "datos" / "matriz_vigente.json"
    if ruta_actual.exists():
        actual = {int(k): set(v) for k, v in json.loads(ruta_actual.read_text(encoding="utf-8")).items()}
    (RAIZ / "CATALOGO_CARGOS.md").write_text(catalogo_md(cargos, fichas), encoding="utf-8")
    (RAIZ / "MATRIZ_PERMISOS.md").write_text(matriz_md(cargos, fichas, actual), encoding="utf-8")
    datos = {
        int(c["id_cargo"]): {
            "cargo": c["nombre_cargo"], "familia": c["familia"], "dashboard": fichas[int(c["id_cargo"])]["dashboard"],
            "proposito": fichas[int(c["id_cargo"])]["proposito"], "jornada": fichas[int(c["id_cargo"])]["jornada"],
            "acciones": fichas[int(c["id_cargo"])]["ui"]["acciones"], "alertas": fichas[int(c["id_cargo"])]["ui"]["alertas"],
            "noVe": fichas[int(c["id_cargo"])]["no_ve"], "medir": [{"indicador": k, "fuente": fu, "estado": e} for k, fu, e in fichas[int(c["id_cargo"])]["medir"]],
        }
        for c in cargos
    }
    (RAIZ / "catalogo.json").write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(fichas)} fichas · CATALOGO_CARGOS.md, MATRIZ_PERMISOS.md y catalogo.json generados")


if __name__ == "__main__":
    main()
