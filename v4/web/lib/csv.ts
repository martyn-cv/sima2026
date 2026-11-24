/** Descarga una tabla como CSV con separador «;» y BOM, para que Excel en español la abra bien. */
export function descargarCsv(nombre: string, columnas: string[], filas: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const texto = "﻿" + [columnas, ...filas].map((f) => f.map(esc).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = nombre;
  document.body.append(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
