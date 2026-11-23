"""
Lee las reglas de fábrica de api/Sima.Api/Servicios/Permisos.cs y calcula las capacidades vigentes de cada cargo
(con el perfil que fija la hoja Cargos del Excel). Escribe docs/analisis/datos/matriz_vigente.json, que generar.py usa
para listar las diferencias entre la matriz propuesta y la que aplica hoy el servidor.

Uso:  python3 docs/analisis/matriz_vigente.py   (desde v4.1/)
"""
import json
import re
from pathlib import Path

import openpyxl

RAIZ = Path(__file__).resolve().parent
FUENTE = RAIZ.parent.parent / "api" / "Sima.Api" / "Servicios" / "Permisos.cs"
EXCEL = RAIZ.parent.parent / "datos" / "SIMA_base_de_datos.xlsx"

texto = FUENTE.read_text(encoding="utf-8")
grupos = {m.group(1): re.findall(r'"([a-z_]+)"', m.group(2)) for m in re.finditer(r"static readonly string\[\] (\w+) = \{([^}]*)\}", texto)}
enteros = {m.group(1): [int(x) for x in re.findall(r"\d+", m.group(2))] for m in re.finditer(r"static readonly int\[\] (\w+) = \{([^}]*)\}", texto)}


def lista_texto(v: str | None) -> list[str]:
    if not v:
        return []
    v = v.strip()
    return grupos[v] if v in grupos else re.findall(r'"([a-z_]+)"', v)


def lista_int(v: str | None) -> list[int]:
    if not v:
        return []
    v = v.strip()
    return enteros[v] if v in enteros else [int(x) for x in re.findall(r"\d+", v)]


reglas = []
bloque = texto[texto.index("Regla[] Fabrica"):texto.index("public static Dictionary<string, string> DeFabrica")]
for m in re.finditer(r'new\("([a-z_.]+)"((?:[^()]|\([^()]*\))*)\)', bloque):
    cap, resto = m.group(1), m.group(2)
    arg = lambda nombre: (re.search(nombre + r":\s*(new\[\][^}]*\}|\w+)", resto) or [None, None])[1]
    reglas.append((cap, lista_texto(arg("Perfiles")), lista_int(arg("Cargos")), lista_int(arg("Excepto"))))

wb = openpyxl.load_workbook(EXCEL, read_only=True, data_only=True)
filas = list(wb["Cargos"].iter_rows(values_only=True))
cab = filas[0]
salida = {}
for f in filas[1:]:
    if f[0] is None:
        continue
    c = dict(zip(cab, f))
    i, perfil = int(c["id_cargo"]), c["perfil_sima"]
    salida[i] = sorted({cap for cap, perfiles, cargos, excepto in reglas if i not in excepto and (perfil in perfiles or i in cargos)})

(RAIZ / "datos").mkdir(exist_ok=True)
(RAIZ / "datos" / "matriz_vigente.json").write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"{len(reglas)} reglas · {len(salida)} cargos → datos/matriz_vigente.json")
