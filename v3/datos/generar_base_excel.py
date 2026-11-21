"""Genera SIMA_base_de_datos.xlsx: una sola base de datos para la web de administración y la app de terreno.

Todos los datos de personas son FICTICIOS (nombres, RUT, domicilios, cuentas). Las hojas se enlazan por claves
y con fórmulas: si RR. HH. registra una desvinculación, el estado del trabajador, su contrato y su cuenta de SIMA cambian solos.

Uso:  python generar_base_excel.py        (luego se recalcula con LibreOffice para guardar los valores)
"""
import json
import random
import unicodedata
from datetime import date, timedelta
from importlib.machinery import SourceFileLoader
from pathlib import Path

from openpyxl import Workbook
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation

AQUI = Path(__file__).resolve().parent
API = AQUI.parent / "api" / "sima"
perf = SourceFileLoader("perfiles", str(API / "perfiles.py")).load_module()
CARGOS = json.loads((API / "data" / "cargos.json").read_text(encoding="utf-8"))
REF = json.loads((API / "data" / "referencia.json").read_text(encoding="utf-8"))

rnd = random.Random(2026)
HOY = date.today()
SALIDA = AQUI / "SIMA_base_de_datos.xlsx"
ROJO, NEGRO = "D91F26", "000000"


def sin_acentos(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").lower().replace(" ", "").replace("ñ", "n")


def dv_rut(n):
    s, m = 0, 2
    for d in reversed(str(n)):
        s += int(d) * m
        m = m + 1 if m < 7 else 2
    r = 11 - s % 11
    return "0" if r == 11 else "K" if r == 10 else str(r)


def fmt_rut(n):
    t = f"{n:,}".replace(",", ".")
    return f"{t}-{dv_rut(n)}"


def sumar_meses(d, n):
    m = d.month - 1 + n
    y, m = d.year + m // 12, m % 12 + 1
    ult = [31, 29 if y % 4 == 0 and (y % 100 or y % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]
    return date(y, m, min(d.day, ult))


# ----------------------------------------------------------------------------------------------- datos base
HOMBRES = "Luis Carlos Jorge Pedro Cristián Héctor Matías Nicolás Felipe Diego Rodrigo Ignacio Tomás Andrés Sebastián Mauricio Claudio Patricio Rafael Gonzalo Álvaro Fernando Javier Marcelo Hernán Víctor Raúl Mario Óscar Camilo Benjamín Joaquín Cristóbal Ricardo Eduardo Pablo Iván Sergio Daniel Manuel".split()
MUJERES = "María Camila Valentina Daniela Carolina Francisca Natalia Paula Patricia Sofía Andrea Marcela Rosa Mariana Constanza Javiera Fernanda Catalina Macarena Claudia Karen Soledad Pamela Verónica Alejandra Gabriela Paola Lorena Bárbara Ximena Fabiola Teresa Elena Jessica Cecilia Lucía".split()
APELLIDOS = ("González Muñoz Rojas Díaz Pérez Soto Contreras Silva Martínez Sepúlveda Morales Rodríguez López Araya Fuentes Hernández Torres Espinoza Valenzuela Castillo Tapia Reyes Gutiérrez Castro Pizarro Álvarez "
             "Vásquez Sánchez Fernández Ramírez Carrasco Gómez Cortés Herrera Núñez Jara Vergara Rivera Figueroa Riquelme García Miranda Bravo Vera Molina Vega Campos Sandoval Orellana Cárdenas Olivares Alarcón Lagos Cáceres "
             "Ibáñez Mena Becerra Larraín Ríos Pardo Poblete Henríquez Zúñiga Leiva Navarro Salazar Godoy Cabrera Vidal").split()
COMUNAS = ["Quilicura", "Renca", "Pudahuel", "Maipú", "Puente Alto", "La Florida", "Santiago", "Ñuñoa", "San Bernardo", "Cerrillos", "Lampa", "Colina", "Conchalí", "Huechuraba", "Independencia", "Recoleta", "Estación Central", "Lo Prado", "Cerro Navia", "Quinta Normal"]
CALLES = ["Av. Los Álamos", "Calle Los Aromos", "Pasaje Las Lilas", "Av. El Salto", "Calle San Pablo", "Av. Independencia", "Calle Esmeralda", "Pasaje Los Copihues", "Calle Bulnes", "Av. Las Torres", "Calle Los Pinos", "Pasaje El Roble"]
AFPS = {"Capital": 0.0144, "Cuprum": 0.0144, "Habitat": 0.0127, "Modelo": 0.0058, "PlanVital": 0.0116, "ProVida": 0.0145, "Uno": 0.0049}
AFP_PESO = [("Modelo", 25), ("Habitat", 20), ("ProVida", 15), ("Capital", 15), ("Cuprum", 10), ("PlanVital", 10), ("Uno", 5)]
SALUD = ["Fonasa"] * 15 + ["Isapre Banmédica", "Isapre Colmena", "Isapre Consalud", "Isapre Cruz Blanca", "Isapre Vida Tres"]
BANCOS = ["BancoEstado"] * 9 + ["Banco de Chile"] * 3 + ["Santander"] * 3 + ["BCI"] * 3 + ["Scotiabank"] * 2
CAUSALES = ["Renuncia voluntaria (art. 159 N°2)", "Mutuo acuerdo (art. 159 N°1)", "Vencimiento del plazo (art. 159 N°4)", "Conclusión del trabajo o servicio (art. 159 N°5)",
            "Necesidades de la empresa (art. 161)", "Conductas indebidas graves (art. 160)", "Fallecimiento (art. 159 N°3)"]

# cargo: (min, max, dotación de cargos ocupados)
BANDAS = {1: (7500000, 9500000), 2: (6200000, 7800000), 3: (5200000, 6400000), 4: (2600000, 3400000), 5: (1800000, 2400000), 6: (3200000, 4000000), 7: (1700000, 2100000), 8: (1100000, 1400000),
          9: (560000, 760000), 10: (780000, 1050000), 11: (560000, 720000), 12: (560000, 720000), 13: (780000, 980000), 14: (650000, 820000), 15: (540000, 620000), 16: (2000000, 2700000),
          17: (2100000, 2900000), 18: (2300000, 3100000), 19: (1700000, 2300000), 20: (1100000, 1500000), 21: (2400000, 3300000), 22: (2200000, 3000000), 23: (3000000, 3900000), 24: (1900000, 2500000),
          25: (1800000, 2300000), 26: (950000, 1350000), 27: (1000000, 1450000), 28: (1000000, 1450000), 29: (1000000, 1400000), 30: (900000, 1200000), 31: (3000000, 3800000), 32: (2000000, 2700000),
          33: (800000, 1100000), 34: (1100000, 1500000), 35: (1800000, 2400000), 36: (1800000, 2400000), 37: (1600000, 2100000), 38: (1500000, 2000000), 39: (800000, 1050000), 40: (1500000, 1950000),
          41: (560000, 760000), 42: (1500000, 2000000), 43: (1400000, 1900000), 44: (3000000, 3800000), 45: (1500000, 2000000), 46: (1300000, 1700000), 47: (1500000, 2000000), 48: (1500000, 2000000),
          49: (700000, 900000), 50: (2100000, 2800000), 51: (700000, 1000000), 52: (1800000, 2400000), 53: (1500000, 2000000), 54: (600000, 850000), 55: (3600000, 4600000), 56: (1500000, 2000000),
          57: (1700000, 2300000), 58: (1200000, 1600000), 59: (1300000, 1800000), 60: (1200000, 1600000), 61: (3000000, 3800000), 62: (900000, 1300000), 63: (1800000, 2500000), 64: (1800000, 2400000)}
ACTIVOS = {7: 2, 8: 4, 9: 8, 10: 4, 11: 6, 12: 4, 13: 2, 14: 2, 15: 3, 26: 2, 27: 2, 28: 2, 33: 3, 41: 3, 51: 2, 54: 2}      # el resto, 1
OBJETIVO_EXTRA = {9: 1, 10: 1, 11: 1, 12: 1, 41: 1}                                                                         # vacantes dejadas por desvinculaciones
JEFE = {2: 1, 3: 2, 4: 3, 5: 3, 6: 3, 7: 6, 8: 7, 9: 8, 10: 8, 11: 8, 12: 8, 13: 7, 14: 7, 15: 8, 16: 6, 17: 6, 18: 3, 19: 18, 20: 18, 21: 3, 22: 18, 23: 3, 24: 23, 25: 23, 26: 25, 27: 25, 28: 25, 29: 25, 30: 23,
        31: 3, 32: 31, 33: 31, 34: 31, 35: 31, 36: 6, 37: 36, 38: 2, 39: 40, 40: 2, 41: 40, 42: 2, 43: 40, 44: 3, 45: 44, 46: 44, 47: 44, 48: 44, 49: 44, 50: 3, 51: 50, 52: 50, 53: 50, 54: 50, 55: 1, 56: 55,
        57: 55, 58: 55, 59: 4, 60: 4, 61: 1, 62: 61, 63: 61, 64: 61}
TURNOS_ROT = {8, 9, 10, 11, 12, 13, 14, 15, 26, 27, 28, 29, 33, 41}
SOLO_INDEFINIDO = set(range(1, 8)) | set(range(16, 26)) | {30, 31, 32, 35, 36, 37, 38, 40, 42, 44, 45, 46, 47, 50, 52, 53, 55, 57, 58, 59, 60, 61, 64}
HONORARIOS = {56, 63, 48}
FIJOS = {10: ("Luis", "Pardo"), 7: ("Marcela", "Tapia"), 28: ("Camila", "Rojas"), 25: ("Felipe", "Soto"), 23: ("Andrea", "Vidal"), 29: ("Diego", "Fuentes"), 18: ("Valentina", "Ríos"), 20: ("Tomás", "Becerra"),
         30: ("Rosa", "Campos"), 33: ("Nicolás", "Araya"), 50: ("Patricia", "Lagos"), 3: ("Ignacio", "Larraín"), 4: ("Mariana", "Pizarro"), 6: ("Rodrigo", "Mena"), 31: ("Paula", "Araya"), 42: ("Sofía", "Cárdenas"),
         44: ("Carolina", "Núñez"), 61: ("Héctor", "Ibáñez")}
DEMO_LOGIN = {10: "operador", 7: "supervisor.turno", 28: "tecnico", 25: "supervisor.mantenimiento", 23: "jefe.mantenimiento", 29: "confiabilidad", 18: "automatizacion", 20: "instrumentacion", 30: "panol",
              33: "calidad", 50: "prevencion", 3: "gerencia", 4: "finanzas", 6: "produccion", 31: "jefe.calidad", 42: "logistica", 44: "rrhh", 61: "comercial"}
# (cargo, causal, días antes de hoy o fecha, finiquito aprox)
EX = [(9, 0, -270), (11, 2, -200), (41, 4, -150), (10, 0, "fin_p2"), (12, 5, "mitad_p3")]
HABILITACIONES = {"Bloqueo y etiquetado (LOTO)": ({7, 8, 18, 19, 20, 22, 23, 24, 25, 26, 27, 28, 29}, 24), "Trabajo eléctrico autorizado": ({18, 19, 27, 28}, 24), "Operación de grúa horquilla": ({14, 40, 41}, 36),
                  "Trabajo en altura": ({25, 26, 27, 28}, 24), "Primeros auxilios y brigada": ({50, 54}, 24), "Operación de CNC autorizada": ({10}, 36), "Calibración y metrología": ({20, 35}, 24)}

# ----------------------------------------------------------------------------------------------- personas
def periodos():
    out, y, m = [], HOY.year, HOY.month
    for _ in range(3):
        m -= 1
        if m == 0:
            m, y = 12, y - 1
        out.append((y, m))
    return list(reversed(out))
PERIODOS = periodos()
INI_P = date(PERIODOS[0][0], PERIODOS[0][1], 1)
FIN_P2 = date(PERIODOS[1][0], PERIODOS[1][1], 28) + timedelta(days=4)
FIN_P2 = FIN_P2 - timedelta(days=FIN_P2.day)
MITAD_P3 = date(PERIODOS[2][0], PERIODOS[2][1], 12)

cargos = CARGOS["cargos"]
nombres_usados, correos_usados, ruts_usados = set(), set(), set()
trabajadores, contratos, terminos = [], [], []


def nuevo_nombre(n_cargo):
    if n_cargo in FIJOS and not any(t["fijo"] == n_cargo for t in trabajadores):
        nom, pat = FIJOS[n_cargo]
        mat = rnd.choice(APELLIDOS)
        nombres_usados.add((nom, pat, mat))
        return nom, pat, mat, nom in MUJERES, n_cargo
    while True:
        mujer = rnd.random() < 0.38
        nom = rnd.choice(MUJERES if mujer else HOMBRES)
        pat, mat = rnd.sample(APELLIDOS, 2)
        if (nom, pat, mat) not in nombres_usados and not any(nom == a and pat == b for a, b, _ in nombres_usados):
            nombres_usados.add((nom, pat, mat))
            return nom, pat, mat, mujer, None


def rut_unico():
    while True:
        n = rnd.randint(6_000_000, 24_999_999)
        if n not in ruts_usados:
            ruts_usados.add(n)
            return fmt_rut(n)


def correo(nom, pat, mat):
    base = f"{sin_acentos(nom.split()[0])}.{sin_acentos(pat)}"
    for cand in (base, base + sin_acentos(mat)[0], base + sin_acentos(mat)):
        if cand not in correos_usados:
            correos_usados.add(cand)
            return cand + "@manuandina.cl"


def sueldo(n_cargo, anios):
    lo, hi = BANDAS[n_cargo]
    f = min(1.0, 0.15 + anios / 14 * 0.7 + rnd.uniform(-0.12, 0.12))
    return int(round((lo + (hi - lo) * max(0.0, min(1.0, f))) / 10000.0) * 10000)


def crear(n_cargo, ex=None):
    nom, pat, mat, mujer, fijo = nuevo_nombre(n_cargo)
    gerencial = n_cargo in (1, 2, 3, 23, 31, 44, 55)
    edad = rnd.randint(42, 58) if gerencial else rnd.randint(21, 58)
    nac = HOY - timedelta(days=int(edad * 365.25 + rnd.randint(0, 360)))
    ficha = {"fijo": fijo, "cargo": n_cargo, "nom": nom, "pat": pat, "mat": mat, "mujer": mujer, "nac": nac}
    tipo = "Honorarios" if n_cargo in HONORARIOS else ("Plazo fijo" if n_cargo not in SOLO_INDEFINIDO and rnd.random() < 0.30 else "Indefinido")
    if ex and ex[1] == 2:
        tipo = "Plazo fijo"
    cs = []
    if tipo == "Plazo fijo":
        dur = rnd.choice([6, 12])
        tope_dias = min(200, (sumar_meses(HOY, dur) - HOY).days - 12)       # el contrato debe haber empezado antes de hoy
        fin = HOY + timedelta(days=rnd.randint(8, tope_dias)) if not ex else None
        if ex:
            fin = HOY + timedelta(days=ex[2])
        ini = sumar_meses(fin, -dur) + timedelta(days=1)
        ingreso = ini
        if rnd.random() < 0.4 or ex:
            ant_ini = sumar_meses(ini, -6)
            cs.append(("Plazo fijo", "NO", ant_ini, ini - timedelta(days=1)))
            ingreso = ant_ini
        cs.append(("Plazo fijo", "SÍ", ini, fin))
    elif tipo == "Honorarios":
        ingreso = HOY - timedelta(days=rnd.randint(200, 1500))
        fin = ingreso
        while fin < HOY + timedelta(days=60):
            fin = sumar_meses(fin, 12)
        cs.append(("Honorarios", "SÍ", sumar_meses(fin, -12) + timedelta(days=1), fin))
    else:
        tope = HOY - timedelta(days=40)
        minimo = max(sumar_meses(nac, 18 * 12), date(2009, 1, 1) if not gerencial else date(2010, 1, 1))
        ingreso = minimo + timedelta(days=rnd.randint(0, max(1, (tope - minimo).days)))
        if rnd.random() < 0.2 and sumar_meses(ingreso, 6) < HOY - timedelta(days=60):
            cs.append(("Plazo fijo", "NO", ingreso, sumar_meses(ingreso, 6) - timedelta(days=1)))
            cs.append(("Indefinido", "SÍ", sumar_meses(ingreso, 6), None))
        else:
            cs.append(("Indefinido", "SÍ", ingreso, None))
    anios = (HOY - ingreso).days / 365.25
    ficha.update(ingreso=ingreso, tipo=tipo, anios=anios)
    return ficha, cs


for c in cargos:
    n = c[0]
    for _ in range(ACTIVOS.get(n, 1)):
        ficha, cs = crear(n)
        ficha["ex"] = None
        trabajadores.append(ficha)
        ficha["cs"] = cs
for n, causal, cuando in EX:
    fecha_t = HOY + timedelta(days=cuando) if isinstance(cuando, int) else (FIN_P2 if cuando == "fin_p2" else MITAD_P3)
    ficha, cs = crear(n, (None, 2 if causal == 2 else 0, (fecha_t - HOY).days))
    if causal != 2:
        cs = [x for x in cs if x[1] == "SÍ"]
        cs[0] = (cs[0][0] if cs[0][0] != "Honorarios" else "Indefinido", "SÍ", min(cs[0][2], fecha_t - timedelta(days=400)), fecha_t if cs[0][0] == "Plazo fijo" else None)
        ficha["ingreso"] = cs[0][2]
        ficha["tipo"] = cs[0][0]
    else:
        cs[-1] = (cs[-1][0], "SÍ", cs[-1][2], fecha_t)
    ficha["cs"] = cs
    ficha["ex"] = (fecha_t, causal)
    trabajadores.append(ficha)

# jefes directos, turnos y datos personales
por_cargo = {}
for i, t in enumerate(trabajadores):
    t["id"] = f"T{i + 1:03d}"
    por_cargo.setdefault(t["cargo"], []).append(t)
for t in trabajadores:
    n = t["cargo"]
    if n == 7:
        t["turno"] = "A" if t is por_cargo[7][0] else "B"
    elif n in TURNOS_ROT:
        t["turno"] = rnd.choice(["A", "A", "B", "B", "N"])
    else:
        t["turno"] = "D"
for t in trabajadores:
    n = t["cargo"]
    padre = JEFE.get(n)
    cands = [x for x in por_cargo.get(padre, []) if not x["ex"]] if padre else []
    mism = [x for x in cands if x["turno"] == t["turno"]]
    t["jefe"] = (rnd.choice(mism or cands)["id"] if cands else "")
    t["rut"], t["correo"] = rut_unico(), correo(t["nom"], t["pat"], t["mat"])
    t["afp"] = rnd.choices([a for a, _ in AFP_PESO], [w for _, w in AFP_PESO])[0]
    t["salud"] = rnd.choice(SALUD)
    t["banco"] = rnd.choice(BANCOS)
    t["base"] = sueldo(n, t["anios"])
    if n in (1, 2, 3):
        t["col"], t["mov"] = 0, 0
    elif perf.PERFILES[perf.CARGO_PERFIL[n]]["canal"] == "web":
        t["col"], t["mov"] = rnd.choice([70000, 80000, 90000, 100000]), rnd.choice([30000, 40000, 50000])
    else:
        t["col"], t["mov"] = rnd.choice([40000, 50000, 60000]), rnd.choice([30000, 40000, 50000])


# ----------------------------------------------------------------------------------------------- libro
wb = Workbook()
wb.remove(wb.active)
HEAD = {}
FILL_H = PatternFill("solid", fgColor=NEGRO)
FONT_H = Font(bold=True, color="FFFFFF")


def hoja(nombre, cols, color=None, ancho=None):
    ws = wb.create_sheet(nombre)
    HEAD[nombre] = {c: get_column_letter(i + 1) for i, c in enumerate(cols)}
    for i, c in enumerate(cols):
        cel = ws.cell(row=1, column=i + 1, value=c)
        cel.fill, cel.font = FILL_H, FONT_H
        cel.alignment = Alignment(vertical="center", wrap_text=True)
        ws.column_dimensions[get_column_letter(i + 1)].width = (ancho or {}).get(c, max(12, min(34, len(c) + 4)))
    ws.freeze_panes = "A2"
    ws.row_dimensions[1].height = 32
    if color:
        ws.sheet_properties.tabColor = color
    return ws


def L(h, c):
    return HEAD[h][c]


def R(h, c, ult=600):
    x = L(h, c)
    return f"{h}!${x}$2:${x}${ult}"


def nombre_def(n, ref):
    wb.defined_names[n] = DefinedName(n, attr_text=ref)


# ---- Parametros y Listas
P = wb.create_sheet("Parametros")
P.sheet_properties.tabColor = "6B6F78"
P["A1"], P["A1"].font = "Parámetros de remuneraciones (valores de referencia: actualice con los vigentes)", Font(bold=True, size=13)
filas = [("fecha_referencia", "=TODAY()", "p_fecha", "Fecha con la que se calculan edades, antigüedad, vigencias y estados. Puede fijarla a mano."), ("imm", 539000, "p_imm", "Ingreso mínimo mensual (verificar valor vigente)"),
         ("uf", 40000, "p_uf", "Valor aproximado de la UF (actualizar)"), ("utm", 69000, "p_utm", "Valor aproximado de la UTM (actualizar)"), ("tope_imponible_uf", 90, "p_tope_uf", "Tope imponible AFP y salud, en UF (verificar)"),
         ("tope_cesantia_uf", 135, "p_tope_ces_uf", "Tope imponible seguro de cesantía, en UF (verificar)"), ("cotizacion_afp", 0.10, "p_afp", "Cotización obligatoria AFP (sin comisión)"),
         ("cotizacion_salud", 0.07, "p_salud", "Cotización de salud legal mínima"), ("cesantia_trabajador", 0.006, "p_ces", "Seguro de cesantía a cargo del trabajador (contrato indefinido)"),
         ("retencion_honorarios", 0.1525, "p_ret_hon", "Retención de boletas de honorarios (verificar el año)"), ("jornada_semanal_horas", 42, "p_jornada", "Jornada legal semanal (verificar el calendario de reducción)"),
         ("factor_horas_extra", 1.5, "p_fhe", "Recargo de horas extra"), ("tope_gratificacion_imm", 4.75, "p_tope_grat", "Tope de gratificación legal (art. 50), en ingresos mínimos"), ("tasa_gratificacion", 0.25, "p_grat", "Tasa de gratificación legal")]
P["A3"], P["B3"], P["C3"] = "parametro", "valor", "descripcion"
for c in ("A3", "B3", "C3"):
    P[c].fill, P[c].font = FILL_H, FONT_H
for i, (nom, val, nm, desc) in enumerate(filas):
    r = 4 + i
    P.cell(row=r, column=1, value=nom)
    P.cell(row=r, column=2, value=val).fill = PatternFill("solid", fgColor="FFF1D6")
    P.cell(row=r, column=3, value=desc)
    nombre_def(nm, f"Parametros!$B${r}")
P["B4"].number_format = "dd-mm-yyyy"
P["E3"], P["F3"] = "afp", "comision"
for c in ("E3", "F3"):
    P[c].fill, P[c].font = FILL_H, FONT_H
for i, (a, v) in enumerate(AFPS.items()):
    P.cell(row=4 + i, column=5, value=a)
    P.cell(row=4 + i, column=6, value=v).number_format = "0.00%"
nombre_def("afp_nombres", "Parametros!$E$4:$E$10")
nombre_def("afp_comisiones", "Parametros!$F$4:$F$10")
P["H3"], P["I3"], P["J3"] = "desde_UTM", "factor", "rebaja_UTM"
for c in ("H3", "I3", "J3"):
    P[c].fill, P[c].font = FILL_H, FONT_H
for i, (d, f, rb) in enumerate([(0, 0, 0), (13.5, .04, .54), (30, .08, 1.74), (50, .135, 4.49), (70, .23, 11.14), (90, .304, 17.8), (120, .35, 23.32), (310, .40, 38.82)]):
    for j, v in enumerate((d, f, rb)):
        P.cell(row=4 + i, column=8 + j, value=v)
nombre_def("imp_desde", "Parametros!$H$4:$H$11")
nombre_def("imp_factor", "Parametros!$I$4:$I$11")
nombre_def("imp_rebaja", "Parametros!$J$4:$J$11")
P["H13"] = "Impuesto único de segunda categoría: tabla mensual en UTM. Valores de referencia; no sustituyen el cálculo oficial."
for col, w in zip("ABCDEFGHIJ", (24, 14, 70, 3, 14, 12, 3, 12, 10, 12)):
    P.column_dimensions[col].width = w

LI = wb.create_sheet("Listas")
LI.sheet_properties.tabColor = "6B6F78"
LISTAS = {"tipo_contrato": ["Indefinido", "Plazo fijo", "Honorarios"], "sexo": ["F", "M"], "estado_civil": ["Soltero/a", "Casado/a", "Conviviente civil", "Divorciado/a", "Viudo/a"],
          "sistema_salud": sorted(set(SALUD)), "causal_termino": CAUSALES, "turno": ["A", "B", "N", "D"], "perfil_sima": list(perf.PERFILES), "canal": ["app", "web"], "si_no": ["SÍ", "NO"],
          "nacionalidad": ["Chilena", "Venezolana", "Peruana", "Haitiana", "Colombiana"], "banco": sorted(set(BANCOS)), "tipo_cuenta": ["CuentaRUT", "Cuenta vista", "Cuenta corriente"],
          "estado_pago": ["Pagada", "Pendiente"], "afp": list(AFPS), "habilitacion": list(HABILITACIONES)}
LREF = {}
for i, (k, v) in enumerate(LISTAS.items()):
    LI.cell(row=1, column=i + 1, value=k).fill, LI.cell(row=1, column=i + 1).font = FILL_H, FONT_H
    LI.column_dimensions[get_column_letter(i + 1)].width = 24
    for j, x in enumerate(v):
        LI.cell(row=2 + j, column=i + 1, value=x)
    LREF[k] = f"=Listas!${get_column_letter(i + 1)}$2:${get_column_letter(i + 1)}${1 + len(v)}"


def validar(ws, col_letra, formula, hasta=600):
    d = DataValidation(type="list", formula1=formula, allow_blank=True, showErrorMessage=True, errorTitle="Valor no válido", error="Elija un valor de la lista.")
    ws.add_data_validation(d)
    d.add(f"{col_letra}2:{col_letra}{hasta}")


# ---- Cargos
cols_c = ["id_cargo", "familia_n", "familia", "nombre_cargo", "tipo_cargo", "perfil_sima", "canal", "sueldo_min", "sueldo_max", "dotacion_objetivo", "dotacion_actual", "brecha",
          "para_que_existe", "que_hace", "que_entrega", "se_coordina_con", "como_medir", "conocimientos"]
ws_c = hoja("Cargos", cols_c, "6B6F78", {"familia": 34, "nombre_cargo": 42, "perfil_sima": 20, "para_que_existe": 50, "que_hace": 50, "que_entrega": 40, "se_coordina_con": 36, "como_medir": 36, "conocimientos": 36})
# ---- hojas con fórmulas entre sí: se declaran primero las columnas
cols_t = ["id_trabajador", "rut", "nombres", "apellido_paterno", "apellido_materno", "nombre_completo", "sexo", "fecha_nacimiento", "edad", "estado_civil", "nacionalidad", "telefono", "correo_corporativo", "correo_personal",
          "domicilio", "comuna", "region", "contacto_emergencia", "telefono_emergencia", "afp", "sistema_salud", "banco", "tipo_cuenta", "numero_cuenta", "fecha_ingreso", "antiguedad_anios", "id_cargo", "cargo", "familia",
          "tipo_cargo", "perfil_sima", "canal", "turno", "jefe_directo_id", "jefe_directo", "estado_laboral", "fecha_termino", "causal_termino", "cuenta_sima", "tipo_contrato_actual", "sueldo_base_actual", "vence_contrato"]
cols_k = ["id_contrato", "id_trabajador", "trabajador", "tipo_contrato", "es_actual", "clave", "fecha_inicio", "fecha_termino", "dias_para_vencer", "jornada_horas", "sueldo_base", "colacion", "movilizacion", "cargo", "estado_contrato", "observaciones"]
cols_x = ["id_termino", "id_trabajador", "trabajador", "fecha_termino", "causal", "aviso_previo", "finiquito_monto", "responsable_id", "responsable", "observaciones"]
cols_u = ["id_cuenta", "id_trabajador", "login", "nombre", "cargo", "perfil_sima", "canal", "turno", "estado_trabajador", "estado_contrato", "estado_cuenta", "acceso_web", "acceso_app", "fecha_alta", "fecha_baja", "login_demo_anterior"]
cols_a = ["id_asistencia", "periodo", "id_trabajador", "clave", "dias_programados", "dias_trabajados", "dias_licencia", "dias_permiso_sin_goce", "dias_vacaciones", "horas_extra", "ausentismo_pct", "trabajador"]
cols_v = ["id_concepto", "periodo", "id_trabajador", "concepto", "tipo", "monto", "observacion"]
cols_r = ["id_liquidacion", "periodo", "id_trabajador", "trabajador", "cargo", "tipo_contrato", "dias_trabajados", "sueldo_base", "sueldo_proporcional", "gratificacion", "horas_extra_n", "horas_extra_monto", "bonos_imponibles",
          "total_imponible", "no_imponibles", "total_haberes", "base_previsional", "descuento_afp", "descuento_salud", "seguro_cesantia", "base_tributable", "impuesto_unico", "retencion_honorarios", "otros_descuentos",
          "total_descuentos", "liquido_a_pagar", "estado_pago"]
cols_h = ["id_habilitacion", "id_trabajador", "trabajador", "habilitacion", "fecha_obtencion", "vigencia_meses", "fecha_vencimiento", "estado"]
for nombre, cols, color, anc in [("Trabajadores", cols_t, "6B6F78", {"nombre_completo": 32, "correo_corporativo": 34, "correo_personal": 30, "domicilio": 28, "cargo": 40, "familia": 34, "causal_termino": 32, "contacto_emergencia": 26}),
                                 ("Contratos", cols_k, ROJO, {"trabajador": 32, "cargo": 40, "observaciones": 40, "clave": 16}), ("Terminos_Contrato", cols_x, ROJO, {"trabajador": 32, "causal": 42, "observaciones": 44, "responsable": 32}),
                                 ("Cuentas_SIMA", cols_u, "6B6F78", {"login": 34, "nombre": 32, "cargo": 40, "estado_cuenta": 30, "login_demo_anterior": 28}), ("Asistencia", cols_a, ROJO, {"trabajador": 32, "clave": 18}),
                                 ("Conceptos_Variables", cols_v, ROJO, {"concepto": 30, "observacion": 36}), ("Remuneraciones", cols_r, ROJO, {"trabajador": 32, "cargo": 40}),
                                 ("Habilitaciones", cols_h, "6B6F78", {"trabajador": 32, "habilitacion": 32})]:
    hoja(nombre, cols, color, anc)
cat = hoja("Catalogo_Conceptos", ["concepto", "tipo", "descripcion"], ROJO, {"concepto": 30, "tipo": 20, "descripcion": 70})
CAT = [("Bono de producción", "Haber imponible", "Se paga según cumplimiento del plan del turno"), ("Bono de asistencia", "Haber imponible", "Sin ausencias en el mes"),
       ("Asignación de turno de noche", "Haber imponible", "Turno N"), ("Anticipo de sueldo", "Descuento", "Descuento de un anticipo entregado en el mes"), ("Cuota préstamo empresa", "Descuento", "Cuota de un préstamo interno"),
       ("Cuota sindical", "Descuento", "Cuota del sindicato (voluntaria)"), ("Seguro complementario de salud", "Descuento", "Seguro complementario convenido con la empresa")]
for i, x in enumerate(CAT):
    for j, v in enumerate(x):
        cat.cell(row=2 + i, column=1 + j, value=v)
Tt, Kk, Xx, Uu, Aa, Vv, Rr, Hh, Cc = (wb[n] for n in ("Trabajadores", "Contratos", "Terminos_Contrato", "Cuentas_SIMA", "Asistencia", "Conceptos_Variables", "Remuneraciones", "Habilitaciones", "Cargos"))
FMT_F, FMT_M = "dd-mm-yyyy", "#,##0"


def poner(ws, fila, h, **v):
    for k, val in v.items():
        c = ws[f"{L(h, k)}{fila}"]
        c.value = val
        if isinstance(val, date):
            c.number_format = FMT_F


def idx(h, c, ult, clave, claveR):
    return f"INDEX({R(h, c, ult)},MATCH({clave},{R(*claveR, ult)},0))"


# ---- filas: Cargos
for i, c in enumerate(cargos):
    n = c[0]
    perfil = perf.CARGO_PERFIL[n]
    canal = perf.PERFILES[perfil]["canal"]
    fam = next(k for k, (a, b) in enumerate(CARGOS["rangos"]) if a <= n <= b)
    obj = ACTIVOS.get(n, 1) + OBJETIVO_EXTRA.get(n, 0)
    r = i + 2
    poner(Cc, r, "Cargos", id_cargo=n, familia_n=fam + 1, familia=CARGOS["familias"][fam], nombre_cargo=c[1], tipo_cargo="Administrativo" if canal == "web" else "Terreno", perfil_sima=perfil, canal=canal,
          sueldo_min=BANDAS[n][0], sueldo_max=BANDAS[n][1], dotacion_objetivo=obj, que_hace=c[3], para_que_existe=c[2], que_entrega=c[4], se_coordina_con=c[5], como_medir=c[6], conocimientos=c[7],
          dotacion_actual=f'=COUNTIFS({R("Trabajadores", "id_cargo")},A{r},{R("Trabajadores", "estado_laboral")},"Activo")', brecha=f"={L('Cargos', 'dotacion_objetivo')}{r}-{L('Cargos', 'dotacion_actual')}{r}")
    for k in ("sueldo_min", "sueldo_max"):
        Cc[f"{L('Cargos', k)}{r}"].number_format = FMT_M
    for k in ("que_hace", "para_que_existe", "que_entrega", "se_coordina_con", "como_medir", "conocimientos"):
        Cc[f"{L('Cargos', k)}{r}"].alignment = Alignment(wrap_text=True, vertical="top")
cr = lambda c: R("Cargos", c, 65)
n_t = len(trabajadores)
# ---- filas: Trabajadores
for i, t in enumerate(trabajadores):
    r = i + 2
    n = t["cargo"]
    cond = f"{L('Trabajadores', 'id_trabajador')}{r}"
    tel = f"+56 9 {rnd.randint(4000, 9999)} {rnd.randint(1000, 9999)}"
    nac = rnd.choices(["Chilena", "Venezolana", "Peruana", "Haitiana", "Colombiana"], [92, 3, 2, 2, 1])[0]
    contacto = f"{rnd.choice(MUJERES + HOMBRES)} {t['pat']}"
    poner(Tt, r, "Trabajadores", id_trabajador=t["id"], rut=t["rut"], nombres=t["nom"], apellido_paterno=t["pat"], apellido_materno=t["mat"],
          nombre_completo=f'={L("Trabajadores", "nombres")}{r}&" "&{L("Trabajadores", "apellido_paterno")}{r}&" "&{L("Trabajadores", "apellido_materno")}{r}',
          sexo="F" if t["mujer"] else "M", fecha_nacimiento=t["nac"], edad=f'=DATEDIF({L("Trabajadores", "fecha_nacimiento")}{r},p_fecha,"Y")',
          estado_civil=rnd.choice(LISTAS["estado_civil"]), nacionalidad=nac, telefono=tel, correo_corporativo=t["correo"],
          correo_personal=f"{sin_acentos(t['nom'].split()[0])}.{sin_acentos(t['pat'])}{rnd.randint(10, 99)}@{rnd.choice(['gmail.com', 'hotmail.com', 'outlook.com'])}",
          domicilio=f"{rnd.choice(CALLES)} {rnd.randint(100, 9800)}", comuna=rnd.choice(COMUNAS), region="Metropolitana de Santiago", contacto_emergencia=contacto, telefono_emergencia=f"+56 9 {rnd.randint(4000, 9999)} {rnd.randint(1000, 9999)}",
          afp=t["afp"], sistema_salud=t["salud"], banco=t["banco"], tipo_cuenta="CuentaRUT" if t["banco"] == "BancoEstado" and rnd.random() < 0.5 else rnd.choice(["Cuenta vista", "Cuenta corriente"]),
          numero_cuenta=str(rnd.randint(10_000_000, 99_999_999_999)), fecha_ingreso=t["ingreso"], antiguedad_anios=f'=DATEDIF({L("Trabajadores", "fecha_ingreso")}{r},IF({L("Trabajadores", "fecha_termino")}{r}="",p_fecha,MIN(p_fecha,{L("Trabajadores", "fecha_termino")}{r})),"Y")', id_cargo=n,
          cargo=f"=INDEX({cr('nombre_cargo')},MATCH({L('Trabajadores', 'id_cargo')}{r},{cr('id_cargo')},0))", familia=f"=INDEX({cr('familia')},MATCH({L('Trabajadores', 'id_cargo')}{r},{cr('id_cargo')},0))",
          tipo_cargo=f"=INDEX({cr('tipo_cargo')},MATCH({L('Trabajadores', 'id_cargo')}{r},{cr('id_cargo')},0))", perfil_sima=f"=INDEX({cr('perfil_sima')},MATCH({L('Trabajadores', 'id_cargo')}{r},{cr('id_cargo')},0))",
          canal=f"=INDEX({cr('canal')},MATCH({L('Trabajadores', 'id_cargo')}{r},{cr('id_cargo')},0))", turno=t["turno"], jefe_directo_id=t["jefe"] or None,
          jefe_directo=f'=IF({L("Trabajadores", "jefe_directo_id")}{r}="","—",INDEX({R("Trabajadores", "nombre_completo")},MATCH({L("Trabajadores", "jefe_directo_id")}{r},{R("Trabajadores", "id_trabajador")},0)))',
          estado_laboral=f'=IF(COUNTIFS({R("Terminos_Contrato", "id_trabajador")},{cond},{R("Terminos_Contrato", "fecha_termino")},"<="&p_fecha)>0,"Desvinculado","Activo")',
          fecha_termino=f'=IFERROR(INDEX({R("Terminos_Contrato", "fecha_termino")},MATCH({cond},{R("Terminos_Contrato", "id_trabajador")},0)),"")',
          causal_termino=f'=IFERROR(INDEX({R("Terminos_Contrato", "causal")},MATCH({cond},{R("Terminos_Contrato", "id_trabajador")},0)),"")',
          cuenta_sima=f'=IFERROR(INDEX({R("Cuentas_SIMA", "estado_cuenta")},MATCH({cond},{R("Cuentas_SIMA", "id_trabajador")},0)),"SIN CUENTA")',
          tipo_contrato_actual=f'=IFERROR(INDEX({R("Contratos", "tipo_contrato")},MATCH({cond}&"|SÍ",{R("Contratos", "clave")},0)),"")',
          sueldo_base_actual=f'=IFERROR(INDEX({R("Contratos", "sueldo_base")},MATCH({cond}&"|SÍ",{R("Contratos", "clave")},0)),"")',
          vence_contrato=f'=IFERROR(IF(INDEX({R("Contratos", "fecha_termino")},MATCH({cond}&"|SÍ",{R("Contratos", "clave")},0))="","",INDEX({R("Contratos", "fecha_termino")},MATCH({cond}&"|SÍ",{R("Contratos", "clave")},0))),"")')
    for k in ("fecha_termino", "vence_contrato"):
        Tt[f"{L('Trabajadores', k)}{r}"].number_format = FMT_F
    Tt[f"{L('Trabajadores', 'sueldo_base_actual')}{r}"].number_format = FMT_M
    # cuenta SIMA (una por trabajador)
    ru = i + 2
    poner(Uu, ru, "Cuentas_SIMA", id_cuenta=f"U{i + 1:03d}", id_trabajador=t["id"], login=f'=INDEX({R("Trabajadores", "correo_corporativo")},MATCH({L("Cuentas_SIMA", "id_trabajador")}{ru},{R("Trabajadores", "id_trabajador")},0))',
          nombre=f'=INDEX({R("Trabajadores", "nombre_completo")},MATCH({L("Cuentas_SIMA", "id_trabajador")}{ru},{R("Trabajadores", "id_trabajador")},0))',
          cargo=f'=INDEX({R("Trabajadores", "cargo")},MATCH({L("Cuentas_SIMA", "id_trabajador")}{ru},{R("Trabajadores", "id_trabajador")},0))',
          perfil_sima=f'=INDEX({R("Trabajadores", "perfil_sima")},MATCH({L("Cuentas_SIMA", "id_trabajador")}{ru},{R("Trabajadores", "id_trabajador")},0))',
          canal=f'=INDEX({R("Trabajadores", "canal")},MATCH({L("Cuentas_SIMA", "id_trabajador")}{ru},{R("Trabajadores", "id_trabajador")},0))',
          turno=f'=INDEX({R("Trabajadores", "turno")},MATCH({L("Cuentas_SIMA", "id_trabajador")}{ru},{R("Trabajadores", "id_trabajador")},0))',
          estado_trabajador=f'=INDEX({R("Trabajadores", "estado_laboral")},MATCH({L("Cuentas_SIMA", "id_trabajador")}{ru},{R("Trabajadores", "id_trabajador")},0))',
          estado_contrato=f'=IFERROR(INDEX({R("Contratos", "estado_contrato")},MATCH({L("Cuentas_SIMA", "id_trabajador")}{ru}&"|SÍ",{R("Contratos", "clave")},0)),"SIN CONTRATO")',
          estado_cuenta=f'=IF({L("Cuentas_SIMA", "estado_trabajador")}{ru}="Desvinculado","CERRADA",IF({L("Cuentas_SIMA", "estado_contrato")}{ru}="VIGENTE","ACTIVA","SUSPENDIDA: revisar contrato"))',
          acceso_web=f'=IF(AND({L("Cuentas_SIMA", "estado_cuenta")}{ru}="ACTIVA",{L("Cuentas_SIMA", "canal")}{ru}="web"),"SÍ","NO")',
          acceso_app=f'=IF(AND({L("Cuentas_SIMA", "estado_cuenta")}{ru}="ACTIVA",{L("Cuentas_SIMA", "canal")}{ru}="app"),"SÍ","NO")',
          fecha_alta=f'=INDEX({R("Trabajadores", "fecha_ingreso")},MATCH({L("Cuentas_SIMA", "id_trabajador")}{ru},{R("Trabajadores", "id_trabajador")},0))',
          fecha_baja=f'=INDEX({R("Trabajadores", "fecha_termino")},MATCH({L("Cuentas_SIMA", "id_trabajador")}{ru},{R("Trabajadores", "id_trabajador")},0))',
          login_demo_anterior=(DEMO_LOGIN[n] + "@manuandina.cl") if t["fijo"] == n else None)
    for k in ("fecha_alta", "fecha_baja"):
        Uu[f"{L('Cuentas_SIMA', k)}{ru}"].number_format = FMT_F
# ---- contratos y términos
k_i = 0
for t in trabajadores:
    for tipo, actual, ini, fin in t["cs"]:
        k_i += 1
        r = k_i + 1
        idt = f"{L('Contratos', 'id_trabajador')}{r}"
        actual_c = actual == "SÍ"
        base = t["base"] if actual_c else max(BANDAS[t["cargo"]][0], int(t["base"] * 0.9 / 10000) * 10000)
        poner(Kk, r, "Contratos", id_contrato=f"K{k_i:04d}", id_trabajador=t["id"],
              trabajador=f'=INDEX({R("Trabajadores", "nombre_completo")},MATCH({idt},{R("Trabajadores", "id_trabajador")},0))', tipo_contrato=tipo, es_actual=actual,
              clave=f'={idt}&"|"&{L("Contratos", "es_actual")}{r}', fecha_inicio=ini, fecha_termino=fin,
              dias_para_vencer=f'=IF(OR({L("Contratos", "fecha_termino")}{r}="",{L("Contratos", "es_actual")}{r}<>"SÍ"),"",{L("Contratos", "fecha_termino")}{r}-p_fecha)',
              jornada_horas=None if tipo == "Honorarios" else 42, sueldo_base=base, colacion=0 if tipo == "Honorarios" else t["col"], movilizacion=0 if tipo == "Honorarios" else t["mov"],
              cargo=f'=INDEX({R("Trabajadores", "cargo")},MATCH({idt},{R("Trabajadores", "id_trabajador")},0))',
              estado_contrato=f'=IF(INDEX({R("Trabajadores", "estado_laboral")},MATCH({idt},{R("Trabajadores", "id_trabajador")},0))="Desvinculado",IF({L("Contratos", "es_actual")}{r}="SÍ","TERMINADO","HISTÓRICO"),'
                              f'IF({L("Contratos", "es_actual")}{r}<>"SÍ","HISTÓRICO",IF(OR({L("Contratos", "fecha_termino")}{r}="",{L("Contratos", "fecha_termino")}{r}>=p_fecha),"VIGENTE","VENCIDO")))',
              observaciones="Contrato anterior (renovado o convertido)" if not actual_c else ("Honorarios: renovación anual" if tipo == "Honorarios" else ""))
        Kk[f"{L('Contratos', 'sueldo_base')}{r}"].number_format = FMT_M
        for k in ("colacion", "movilizacion"):
            Kk[f"{L('Contratos', k)}{r}"].number_format = FMT_M
for i, t in enumerate([x for x in trabajadores if x["ex"]]):
    r = i + 2
    fecha_t, causal = t["ex"]
    finiq = int(t["base"] * (0.5 + t["anios"] * 0.2 + (1 if causal == 4 else 0)))
    poner(Xx, r, "Terminos_Contrato", id_termino=f"D{i + 1:03d}", id_trabajador=t["id"], trabajador=f'=INDEX({R("Trabajadores", "nombre_completo")},MATCH({L("Terminos_Contrato", "id_trabajador")}{r},{R("Trabajadores", "id_trabajador")},0))',
          fecha_termino=fecha_t, causal=CAUSALES[causal] if causal in (0, 2) else CAUSALES[4 if causal == 4 else 5], aviso_previo="SÍ" if causal in (0, 4) else "NO", finiquito_monto=finiq,
          responsable_id=next(x["id"] for x in por_cargo[44]), responsable=f'=INDEX({R("Trabajadores", "nombre_completo")},MATCH({L("Terminos_Contrato", "responsable_id")}{r},{R("Trabajadores", "id_trabajador")},0))',
          observaciones="Registro de ejemplo: al ingresar una fila aquí, el trabajador queda Desvinculado y su cuenta de SIMA se cierra.")
    Xx[f"{L('Terminos_Contrato', 'finiquito_monto')}{r}"].number_format = FMT_M
# ---- asistencia, conceptos y remuneraciones
a_i = v_i = 0
for (y, m) in PERIODOS:
    pnom = f"{y}-{m:02d}"
    primero = date(y, m, 1)
    ultimo = (date(y + (m == 12), m % 12 + 1, 1) - timedelta(days=1))
    for t in trabajadores:
        ini = t["ingreso"]
        fin_t = t["ex"][0] if t["ex"] else None
        if ini > ultimo or (fin_t and fin_t < primero):
            continue
        prog = 30
        if fin_t and primero <= fin_t <= ultimo:
            prog = fin_t.day
        if ini > primero:
            prog = max(1, prog - (ini.day - 1))
        lic = rnd.randint(1, 6) if rnd.random() < 0.12 else 0
        perm = rnd.randint(1, 2) if rnd.random() < 0.05 else 0
        lic, perm = min(lic, prog - 1), min(perm, max(0, prog - lic - 1))
        he = rnd.choice([0, 0, 2, 4, 6, 8, 10, 12, 14]) if t["cargo"] in {9, 10, 11, 12, 13, 14, 15, 26, 27, 28, 29, 41, 33} and t["tipo"] != "Honorarios" and prog >= 15 else 0
        a_i += 1
        r = a_i + 1
        idt = f"{L('Asistencia', 'id_trabajador')}{r}"
        poner(Aa, r, "Asistencia", id_asistencia=f"A{a_i:04d}", periodo=pnom, id_trabajador=t["id"], clave=f'={L("Asistencia", "periodo")}{r}&"|"&{idt}', dias_programados=prog,
              dias_trabajados=f'={L("Asistencia", "dias_programados")}{r}-{L("Asistencia", "dias_licencia")}{r}-{L("Asistencia", "dias_permiso_sin_goce")}{r}', dias_licencia=lic, dias_permiso_sin_goce=perm,
              dias_vacaciones=0, horas_extra=he, ausentismo_pct=f'=IF({L("Asistencia", "dias_programados")}{r}=0,0,({L("Asistencia", "dias_licencia")}{r}+{L("Asistencia", "dias_permiso_sin_goce")}{r})/{L("Asistencia", "dias_programados")}{r})',
              trabajador=f'=INDEX({R("Trabajadores", "nombre_completo")},MATCH({idt},{R("Trabajadores", "id_trabajador")},0))')
        Aa[f"{L('Asistencia', 'ausentismo_pct')}{r}"].number_format = "0.0%"
        # conceptos variables
        def concepto(nombre_c, monto, obs=""):
            global v_i
            v_i += 1
            rv = v_i + 1
            poner(Vv, rv, "Conceptos_Variables", id_concepto=f"V{v_i:04d}", periodo=pnom, id_trabajador=t["id"], concepto=nombre_c,
                  tipo=f'=INDEX({R("Catalogo_Conceptos", "tipo", 100)},MATCH({L("Conceptos_Variables", "concepto")}{rv},{R("Catalogo_Conceptos", "concepto", 100)},0))', monto=monto, observacion=obs)
            Vv[f"{L('Conceptos_Variables', 'monto')}{rv}"].number_format = FMT_M
        if t["tipo"] != "Honorarios" and prog >= 15:
            if t["cargo"] in {9, 10, 11, 12, 13} and rnd.random() < 0.6:
                concepto("Bono de producción", rnd.choice([40000, 60000, 80000, 100000, 120000]), "Cumplimiento del plan del turno")
            if lic + perm == 0 and t["cargo"] in {9, 10, 11, 12, 13, 14, 15, 26, 27, 28, 33, 41} and rnd.random() < 0.8:
                concepto("Bono de asistencia", 30000)
            if t["turno"] == "N":
                concepto("Asignación de turno de noche", rnd.choice([50000, 60000]))
            if rnd.random() < 0.07:
                concepto("Anticipo de sueldo", rnd.choice([100000, 150000, 200000]))
            if rnd.random() < 0.05:
                concepto("Cuota préstamo empresa", rnd.choice([30000, 45000, 60000]))
            if t["cargo"] in {9, 10, 11, 12, 15, 26, 27, 28, 41} and rnd.random() < 0.3:
                concepto("Cuota sindical", 8000)
            if t["salud"] != "Fonasa" and rnd.random() < 0.25:
                concepto("Seguro complementario de salud", rnd.choice([12000, 18000]))
        # liquidación
        rr = a_i + 1
        c_ = lambda k: f"{L('Remuneraciones', k)}{rr}"
        idc = f"{L('Remuneraciones', 'id_trabajador')}{rr}"
        ctr = lambda col: f'INDEX({R("Contratos", col)},MATCH({idc}&"|SÍ",{R("Contratos", "clave")},0))'
        asi = lambda col: f'INDEX({R("Asistencia", col, 3000)},MATCH({c_("periodo")}&"|"&{idc},{R("Asistencia", "clave", 3000)},0))'
        cvar = lambda tipo_c: f'SUMIFS({R("Conceptos_Variables", "monto", 3000)},{R("Conceptos_Variables", "periodo", 3000)},{c_("periodo")},{R("Conceptos_Variables", "id_trabajador", 3000)},{idc},{R("Conceptos_Variables", "tipo", 3000)},"{tipo_c}")'
        hon = f'{c_("tipo_contrato")}="Honorarios"'
        poner(Rr, rr, "Remuneraciones", id_liquidacion=f"L{a_i:04d}", periodo=pnom, id_trabajador=t["id"],
              trabajador=f'=INDEX({R("Trabajadores", "nombre_completo")},MATCH({idc},{R("Trabajadores", "id_trabajador")},0))', cargo=f'=INDEX({R("Trabajadores", "cargo")},MATCH({idc},{R("Trabajadores", "id_trabajador")},0))',
              tipo_contrato=f'=IFERROR({ctr("tipo_contrato")},"")', dias_trabajados=f"=IFERROR({asi('dias_trabajados')},0)", sueldo_base=f"=IFERROR({ctr('sueldo_base')},0)",
              sueldo_proporcional=f'=ROUND({c_("sueldo_base")}*{c_("dias_trabajados")}/30,0)',
              gratificacion=f'=IF({hon},0,ROUND(MIN(p_grat*{c_("sueldo_proporcional")},p_tope_grat*p_imm/12*{c_("dias_trabajados")}/30),0))', horas_extra_n=f"=IFERROR({asi('horas_extra')},0)",
              horas_extra_monto=f'=IF({hon},0,ROUND({c_("horas_extra_n")}*({c_("sueldo_base")}*7/(30*p_jornada))*p_fhe,0))', bonos_imponibles=f'={cvar("Haber imponible")}',
              total_imponible=f'={c_("sueldo_proporcional")}+{c_("gratificacion")}+{c_("horas_extra_monto")}+{c_("bonos_imponibles")}',
              no_imponibles=f'=IF({hon},0,IFERROR(ROUND(({ctr("colacion")}+{ctr("movilizacion")})*{c_("dias_trabajados")}/30,0),0))', total_haberes=f'={c_("total_imponible")}+{c_("no_imponibles")}',
              base_previsional=f'=IF({hon},0,MIN({c_("total_imponible")},p_tope_uf*p_uf))',
              descuento_afp=f'=IF({hon},0,ROUND({c_("base_previsional")}*(p_afp+INDEX(afp_comisiones,MATCH(INDEX({R("Trabajadores", "afp")},MATCH({idc},{R("Trabajadores", "id_trabajador")},0)),afp_nombres,0))),0))',
              descuento_salud=f'=IF({hon},0,ROUND({c_("base_previsional")}*p_salud,0))',
              seguro_cesantia=f'=IF({c_("tipo_contrato")}="Indefinido",ROUND(MIN({c_("total_imponible")},p_tope_ces_uf*p_uf)*p_ces,0),0)',
              base_tributable=f'=IF({hon},0,{c_("total_imponible")}-{c_("descuento_afp")}-{c_("descuento_salud")}-{c_("seguro_cesantia")})',
              impuesto_unico=f'=IF({hon},0,MAX(0,ROUND({c_("base_tributable")}*INDEX(imp_factor,MATCH({c_("base_tributable")}/p_utm,imp_desde,1))-INDEX(imp_rebaja,MATCH({c_("base_tributable")}/p_utm,imp_desde,1))*p_utm,0)))',
              retencion_honorarios=f'=IF({hon},ROUND({c_("sueldo_proporcional")}*p_ret_hon,0),0)', otros_descuentos=f'={cvar("Descuento")}',
              total_descuentos=f'={c_("descuento_afp")}+{c_("descuento_salud")}+{c_("seguro_cesantia")}+{c_("impuesto_unico")}+{c_("retencion_honorarios")}+{c_("otros_descuentos")}',
              liquido_a_pagar=f'={c_("total_haberes")}-{c_("total_descuentos")}', estado_pago="Pagada" if (y, m) != PERIODOS[-1] else "Pendiente")
        for k in cols_r[7:26]:
            if k not in ("horas_extra_n",):
                Rr[f"{L('Remuneraciones', k)}{rr}"].number_format = FMT_M
# ---- habilitaciones
h_i = 0
for t in trabajadores:
    if t["ex"]:
        continue
    for nombre_h, (cs_, meses) in HABILITACIONES.items():
        if t["cargo"] in cs_:
            h_i += 1
            r = h_i + 1
            obt = HOY - timedelta(days=rnd.randint(30, 900 if rnd.random() < 0.9 else 1100))
            poner(Hh, r, "Habilitaciones", id_habilitacion=f"H{h_i:04d}", id_trabajador=t["id"],
                  trabajador=f'=INDEX({R("Trabajadores", "nombre_completo")},MATCH({L("Habilitaciones", "id_trabajador")}{r},{R("Trabajadores", "id_trabajador")},0))', habilitacion=nombre_h, fecha_obtencion=obt, vigencia_meses=meses,
                  fecha_vencimiento=f'=EDATE({L("Habilitaciones", "fecha_obtencion")}{r},{L("Habilitaciones", "vigencia_meses")}{r})',
                  estado=f'=IF({L("Habilitaciones", "fecha_vencimiento")}{r}<p_fecha,"VENCIDA","VIGENTE")')
            Hh[f"{L('Habilitaciones', 'fecha_vencimiento')}{r}"].number_format = FMT_F

# ---- formatos de fecha, validaciones y formato condicional
for ws, h, cols in [(Tt, "Trabajadores", ("fecha_nacimiento", "fecha_ingreso")), (Kk, "Contratos", ("fecha_inicio", "fecha_termino")), (Hh, "Habilitaciones", ("fecha_obtencion",))]:
    for k in cols:
        for r in range(2, ws.max_row + 1):
            ws[f"{L(h, k)}{r}"].number_format = FMT_F
for ws, h, col, lst, hasta in [(Tt, "Trabajadores", "sexo", "sexo", 600), (Tt, "Trabajadores", "estado_civil", "estado_civil", 600), (Tt, "Trabajadores", "nacionalidad", "nacionalidad", 600), (Tt, "Trabajadores", "afp", "afp", 600),
                               (Tt, "Trabajadores", "sistema_salud", "sistema_salud", 600), (Tt, "Trabajadores", "banco", "banco", 600), (Tt, "Trabajadores", "tipo_cuenta", "tipo_cuenta", 600), (Tt, "Trabajadores", "turno", "turno", 600),
                               (Kk, "Contratos", "tipo_contrato", "tipo_contrato", 600), (Kk, "Contratos", "es_actual", "si_no", 600), (Xx, "Terminos_Contrato", "causal", "causal_termino", 600), (Xx, "Terminos_Contrato", "aviso_previo", "si_no", 600),
                               (Rr, "Remuneraciones", "estado_pago", "estado_pago", 3000), (Hh, "Habilitaciones", "habilitacion", "habilitacion", 3000)]:
    validar(ws, L(h, col), LREF[lst], hasta)
validar(Tt, L("Trabajadores", "id_cargo"), "=Cargos!$A$2:$A$65")
for ws, h, col in [(Tt, "Trabajadores", "jefe_directo_id"), (Kk, "Contratos", "id_trabajador"), (Xx, "Terminos_Contrato", "id_trabajador"), (Uu, "Cuentas_SIMA", "id_trabajador"), (Aa, "Asistencia", "id_trabajador"), (Vv, "Conceptos_Variables", "id_trabajador"),
                   (Rr, "Remuneraciones", "id_trabajador"), (Hh, "Habilitaciones", "id_trabajador")]:
    validar(ws, L(h, col), "=Trabajadores!$A$2:$A$600", 3000)
validar(Vv, L("Conceptos_Variables", "concepto"), "=Catalogo_Conceptos!$A$2:$A$100", 3000)
VERDE, ROJOC, AMB = PatternFill("solid", bgColor="E0F4E8", fgColor="E0F4E8"), PatternFill("solid", bgColor="FDE8E9", fgColor="FDE8E9"), PatternFill("solid", bgColor="FFF1D6", fgColor="FFF1D6")
for ws, h, col, rango in [(Tt, "Trabajadores", "estado_laboral", 600), (Tt, "Trabajadores", "cuenta_sima", 600), (Uu, "Cuentas_SIMA", "estado_cuenta", 600), (Kk, "Contratos", "estado_contrato", 600), (Hh, "Habilitaciones", "estado", 3000)]:
    rng = f"{L(h, col)}2:{L(h, col)}{rango}"
    for texto, fill in (("Activo", VERDE), ("ACTIVA", VERDE), ("VIGENTE", VERDE), ("Desvinculado", ROJOC), ("CERRADA", ROJOC), ("TERMINADO", ROJOC), ("VENCIDO", ROJOC), ("VENCIDA", ROJOC), ("HISTÓRICO", AMB)):
        ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=[f'"{texto}"'], fill=fill))
    ws.conditional_formatting.add(rng, FormulaRule(formula=[f'LEFT({L(h, col)}2,10)="SUSPENDIDA"'], fill=AMB))
for ws in (Tt, Kk, Xx, Uu, Aa, Vv, Rr, Hh, Cc):
    ws.auto_filter.ref = ws.dimensions
Tt.freeze_panes = "C2"

# ---- Permisos, LEEME y Diccionario
PERM = wb.create_sheet("Permisos")
PERM.sheet_properties.tabColor = "6B6F78"
PERM_COLS = ["dato / hoja", "RR. HH. (rrhh)", "Finanzas y administración", "Gerencia", "Jefaturas de terreno (jefe_mant, supervisores)", "Resto de la app (terreno)", "Resto de la web"]
PERM_ROWS = [("Datos personales (RUT, domicilio, fecha de nacimiento, cuenta bancaria)", "Editar", "Ver", "Ver", "—", "—", "—"), ("Nombre, cargo, turno y correo corporativo", "Editar", "Ver", "Ver", "Ver (su equipo)", "Ver (nombre y cargo)", "Ver"),
             ("Contratos (tipo, fechas, jornada)", "Editar", "Ver", "Ver", "—", "—", "—"), ("Sueldos y remuneraciones (liquidaciones)", "Ver", "Editar", "Ver", "—", "—", "—"), ("Descuentos y conceptos variables", "Ver", "Editar", "—", "—", "—", "—"),
             ("Desvinculaciones (Terminos_Contrato)", "Editar", "Ver", "Ver", "—", "—", "—"), ("Cuentas de SIMA (estado y accesos)", "Editar", "Ver", "Ver", "—", "—", "—"), ("Asistencia y ausentismo", "Editar", "Ver", "Ver", "Ver (su equipo)", "—", "—"),
             ("Habilitaciones y competencias", "Editar", "—", "Ver", "Editar (su equipo)", "Ver (las propias)", "—"), ("Cargos y dotación objetivo", "Editar", "Ver", "Ver", "Ver", "Ver", "Ver"), ("Parámetros de remuneraciones", "Ver", "Editar", "—", "—", "—", "—")]
for j, c in enumerate(PERM_COLS):
    cel = PERM.cell(row=1, column=j + 1, value=c)
    cel.fill, cel.font, cel.alignment = FILL_H, FONT_H, Alignment(wrap_text=True, vertical="center")
    PERM.column_dimensions[get_column_letter(j + 1)].width = 58 if j == 0 else 24
PERM.row_dimensions[1].height = 44
for i, fila in enumerate(PERM_ROWS):
    for j, v in enumerate(fila):
        PERM.cell(row=2 + i, column=1 + j, value=v)
PERM["A15"] = "Estos permisos son la propuesta para la app y la web; el servidor debe validarlos (no solo ocultarlos en pantalla)."

LEEME = wb.create_sheet("LEEME", 0)
LEEME.sheet_properties.tabColor = ROJO
LEEME.column_dimensions["A"].width = 150
TEXTO = ["SIMA · Base de datos única (Excel)", "",
         "QUÉ ES: un solo modelo de datos para la web de administración y la app de terreno (móvil y escritorio). Reemplaza las tablas de ejemplo separadas de la versión 2 y se pensó para importarse luego a PostgreSQL.",
         "DATOS FICTICIOS: nombres, RUT, domicilios, correos y cuentas bancarias fueron inventados. Los RUT tienen dígito verificador válido, pero no corresponden a personas reales. No los use para otro fin.", "",
         "CÓMO SE ENLAZA (claves)",
         "  Cargos (id_cargo) → Trabajadores (id_cargo): el cargo decide el perfil de SIMA (perfil_sima) y el canal (app o web).",
         "  Trabajadores (id_trabajador) → Contratos, Cuentas_SIMA, Asistencia, Conceptos_Variables, Remuneraciones, Habilitaciones, Terminos_Contrato.",
         "  Trabajadores (jefe_directo_id) → Trabajadores: organigrama real de la planta.",
         "  Contratos + Asistencia + Conceptos_Variables + Parametros → Remuneraciones: la liquidación se calcula con fórmulas (haberes, AFP, salud, cesantía, impuesto único, descuentos y líquido).", "",
         "QUÉ VE CADA QUIEN",
         "  Web (administrativos): todo lo de contratos, sueldos, descuentos y datos personales, según la hoja Permisos. La edición es solo de RR. HH. y Finanzas.",
         "  App de terreno: solo nombre, cargo, turno, jefe directo, habilitaciones y su propia cuenta. Nunca sueldos ni datos personales de otros.", "",
         "CÓMO SE REFLEJA UN CAMBIO EN LA APP (regla de la base)",
         "  1) Desvinculación: RR. HH. agrega una fila en Terminos_Contrato (trabajador, fecha y causal). Con eso, Trabajadores.estado_laboral pasa a 'Desvinculado', el contrato queda 'TERMINADO' y Cuentas_SIMA.estado_cuenta pasa a 'CERRADA' (acceso_web y acceso_app = NO).",
         "  2) Contrato vencido: si la fecha de término de un contrato a plazo fijo pasa y no se renueva, la cuenta queda 'SUSPENDIDA: revisar contrato'.",
         "  3) Renovación o cambio de contrato: agregue un contrato nuevo en Contratos con es_actual = SÍ y cambie el anterior a NO.",
         "  4) Alta de trabajador: una fila en Trabajadores, una en Contratos y una en Cuentas_SIMA. El login es el correo corporativo.",
         "     Las columnas con fórmula (se marcan 'Calculada' en el Diccionario) se copian desde la fila de arriba; las fórmulas están preparadas para hasta 599 trabajadores y 2.999 filas de remuneraciones y asistencia.",
         "  En la app, al sincronizar, la cuenta 'CERRADA' o 'SUSPENDIDA' no puede iniciar sesión ni usar el modo sin conexión con un token nuevo.", "",
         "HOJAS",
         "  Rojas (solo web): Contratos, Terminos_Contrato, Asistencia, Conceptos_Variables, Catalogo_Conceptos, Remuneraciones. Grises: Cargos, Trabajadores, Cuentas_SIMA, Habilitaciones, Permisos, Parametros, Listas.",
         "  Diccionario: describe cada columna, si es dato ingresado o calculado, y si se muestra en la web, en la app o en ambas.", "",
         "ADVERTENCIAS",
         "  - Los parámetros de remuneraciones (IMM, UF, UTM, topes, tasas, comisiones de AFP, impuesto único, jornada) son valores de referencia: actualícelos en la hoja Parametros con los vigentes.",
         "  - El cálculo de remuneraciones es una aproximación para pruebas. No sustituye la liquidación oficial: debe validarlo un contador o RR. HH. (por ejemplo: planes de Isapre, APV, asignación familiar, licencias y gratificación convenida no están modelados).",
         "  - Las bandas de sueldo por cargo y las dotaciones son supuestos de demostración.",
         "  - Las fórmulas usan TODAY() como fecha de referencia; puede fijar otra fecha en Parametros!B4.", "",
         f"Generado el {HOY.strftime('%d-%m-%Y')} con generar_base_excel.py"]
for i, linea in enumerate(TEXTO):
    c = LEEME.cell(row=1 + i, column=1, value=linea)
    c.alignment = Alignment(wrap_text=True, vertical="top")
    if i == 0:
        c.font = Font(bold=True, size=16, color=ROJO)
    elif linea.isupper() or linea.startswith(("CÓMO", "QUÉ", "HOJAS", "ADVERTENCIAS")):
        c.font = Font(bold=True)

DIC = wb.create_sheet("Diccionario", 1)
DIC.sheet_properties.tabColor = "6B6F78"
for j, c in enumerate(["hoja", "columna", "tipo", "se_muestra_en", "descripcion"]):
    cel = DIC.cell(row=1, column=j + 1, value=c)
    cel.fill, cel.font = FILL_H, FONT_H
    DIC.column_dimensions[get_column_letter(j + 1)].width = (22, 26, 14, 26, 90)[j]
DESC = {"id_trabajador": "Clave del trabajador (T001…). Une todas las hojas.", "rut": "RUT con dígito verificador", "id_cargo": "Clave del cargo (1 a 64, del informe de roles)", "perfil_sima": "Perfil de acceso en SIMA, heredado del cargo",
        "canal": "app (terreno) o web (oficina): por dónde puede ingresar", "estado_laboral": "Activo o Desvinculado; se calcula con Terminos_Contrato", "cuenta_sima": "Estado de la cuenta (ACTIVA, CERRADA o SUSPENDIDA)",
        "es_actual": "SÍ en el contrato vigente de la persona; NO en los históricos", "clave": "id_trabajador y es_actual unidos; sirve para buscar el contrato actual", "estado_contrato": "VIGENTE, VENCIDO, TERMINADO o HISTÓRICO",
        "estado_cuenta": "ACTIVA solo si el trabajador está activo y su contrato vigente", "acceso_web": "SÍ si la cuenta está activa y el perfil es de oficina", "acceso_app": "SÍ si la cuenta está activa y el perfil es de terreno",
        "liquido_a_pagar": "Total de haberes menos total de descuentos", "total_imponible": "Sueldo proporcional + gratificación + horas extra + bonos imponibles", "base_tributable": "Imponible menos AFP, salud y cesantía",
        "impuesto_unico": "Impuesto único de segunda categoría según la tabla de Parametros", "dotacion_actual": "Trabajadores activos en el cargo", "brecha": "Dotación objetivo menos actual (vacantes)",
        "jefe_directo_id": "Clave del jefe directo (otra fila de Trabajadores)", "periodo": "Mes en formato AAAA-MM", "login_demo_anterior": "Usuario de demostración de la versión 2 que corresponde a esta persona"}
SENS = {"rut", "fecha_nacimiento", "edad", "estado_civil", "nacionalidad", "telefono", "correo_personal", "domicilio", "comuna", "region", "contacto_emergencia", "telefono_emergencia", "afp", "sistema_salud", "banco", "tipo_cuenta", "numero_cuenta",
        "fecha_ingreso", "antiguedad_anios", "tipo_contrato_actual", "sueldo_base_actual", "vence_contrato", "fecha_termino", "causal_termino"}
r_d = 2
for ws in wb.worksheets:
    if ws.title in ("LEEME", "Diccionario", "Parametros", "Listas", "Permisos", "Catalogo_Conceptos"):
        continue
    for c in ws[1]:
        nombre_col = c.value
        formula = isinstance(ws.cell(row=2, column=c.column).value, str) and str(ws.cell(row=2, column=c.column).value).startswith("=")
        solo_web = ws.title in ("Contratos", "Terminos_Contrato", "Asistencia", "Conceptos_Variables", "Remuneraciones") or (ws.title == "Trabajadores" and nombre_col in SENS) or (ws.title == "Cargos" and nombre_col.startswith("sueldo"))
        vis = "Solo web (RR. HH. y Finanzas)" if solo_web else ("Servidor (control de acceso)" if ws.title == "Cuentas_SIMA" else "Web y app")
        for j, v in enumerate((ws.title, nombre_col, "Calculada" if formula else "Ingresada", vis, DESC.get(nombre_col, ""))):
            DIC.cell(row=r_d, column=j + 1, value=v)
        r_d += 1
DIC.freeze_panes, DIC.auto_filter.ref = "A2", DIC.dimensions
wb.calculation.fullCalcOnLoad = True
orden = ["LEEME", "Diccionario", "Trabajadores", "Cargos", "Contratos", "Terminos_Contrato", "Cuentas_SIMA", "Remuneraciones", "Asistencia", "Conceptos_Variables", "Catalogo_Conceptos", "Habilitaciones", "Permisos", "Parametros", "Listas"]
wb._sheets = [wb[n] for n in orden]
wb.save(SALIDA)
print("libro generado:", SALIDA.name, "| trabajadores:", len(trabajadores), "| contratos:", k_i, "| liquidaciones:", a_i, "| conceptos:", v_i, "| habilitaciones:", h_i)
