import { useMemo, useState } from "react";
import { useSim } from "../simulador";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Tabla de observación: todas las etiquetas del PLC con su valor, y la posibilidad de forzarlas. */
export function Variables() {
  const s = useSim();
  const [q, setQ] = useState("");
  const cfg = s.config;
  const filas = useMemo(() => {
    if (!cfg) return [];
    const puntos = cfg.puntos.map((p) => ({ tag: p.tag, dir: p.direccion, tipo: p.tipo as string, desc: p.descripcion, unidad: p.unidad }));
    const vars = cfg.programa.variables.map((v) => ({ tag: v.nombre, dir: "M", tipo: v.tipo === "timer" ? "TON" : "MEM", desc: v.descripcion ?? "", unidad: "" }));
    return [...puntos, ...vars].filter((f) => !q || `${f.tag} ${f.desc} ${f.dir}`.toLowerCase().includes(q.toLowerCase()));
  }, [cfg, q]);
  if (!cfg) return null;
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-borde p-2"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar etiqueta, dirección o descripción" aria-label="Buscar etiqueta" className="h-8 w-full max-w-sm border border-borde bg-panel px-2 text-[13px] outline-none focus:border-rojo-vivo" /></div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-[12px]">
          <thead className="sticky top-0 bg-panel"><tr className="border-b border-borde text-tenue"><th className="px-3 py-1.5">Dirección</th><th>Etiqueta</th><th>Tipo</th><th className="text-right">Valor</th><th className="px-3 text-right">Forzar</th></tr></thead>
          <tbody>
            {filas.map((f) => {
              const v = s.imagen[f.tag] ?? s.entradas[f.tag] ?? 0;
              const forzado = f.tag in s.forzados;
              const analogico = f.tipo === "AI" || f.tipo === "AO";
              return (
                <tr key={f.tag} className="border-b border-borde/60 hover:bg-panel2" title={f.desc}>
                  <td className="mono px-3 py-1 text-tenue">{f.dir}</td><td className="mono">{f.tag}</td><td className="text-tenue">{f.tipo}</td>
                  <td className={cx("mono text-right font-semibold", !analogico && v > 0 && "text-led-verde")}>{analogico ? `${v.toFixed(2)} ${f.unidad}` : v > 0 ? "1" : "0"}</td>
                  <td className="px-3 text-right">
                    {f.tipo === "DI" || f.tipo === "DO" || f.tipo === "MEM" ? (
                      <button onClick={() => s.forzar(f.tag, forzado ? null : v > 0 ? 0 : 1)} className={cx("cursor-pointer px-2 py-0.5 text-[11px] font-semibold", forzado ? "bg-led-ambar text-black" : "border border-borde text-tenue hover:text-texto")}>{forzado ? `Forzada a ${s.forzados[f.tag]} · liberar` : "Forzar"}</button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Tendencia de una variable analógica de los últimos dos minutos, con sus límites de aviso y alarma. */
export function Tendencia() {
  const s = useSim();
  const cfg = s.config;
  const analogicas = cfg?.puntos.filter((p) => p.tipo === "AI") ?? [];
  const [tag, setTag] = useState<string>("");
  if (!cfg || !analogicas.length) return null;
  const sel = analogicas.find((p) => p.tag === tag) ?? analogicas[0];
  const sensor = cfg.equipos.find((e) => e.codigo === sel.equipo)?.sensores.find((x) => x.variable === sel.variable);
  const datos = s.historial[sel.tag] ?? [];
  const W = 760, H = 220, P = 36;
  const y = (v: number) => H - P / 2 - ((v - sel.minimo) / ((sel.maximo - sel.minimo) || 1)) * (H - P);
  const x = (i: number) => P + (i / 119) * (W - P - 10);
  const ruta = datos.map((v, i) => `${i === 0 ? "M" : "L"}${x(i + (120 - datos.length)).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const ultimo = datos[datos.length - 1];
  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <select value={sel.tag} onChange={(e) => setTag(e.target.value)} aria-label="Variable" className="h-8 border border-borde bg-panel px-2 text-[13px] outline-none focus:border-rojo-vivo">
          {analogicas.map((p) => <option key={p.tag} value={p.tag}>{p.equipo} · {p.descripcion.split("·")[1]?.trim() ?? p.tag}</option>)}
        </select>
        <span className="mono text-[22px] font-semibold">{ultimo != null ? ultimo.toFixed(1) : "—"} <span className="text-[14px] text-tenue">{sel.unidad}</span></span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full flex-1 border border-borde bg-panel" role="img" aria-label="Tendencia">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => <g key={f}><line x1={P} x2={W - 10} y1={y(sel.minimo + f * (sel.maximo - sel.minimo))} y2={y(sel.minimo + f * (sel.maximo - sel.minimo))} stroke="#262930" /><text x={P - 6} y={y(sel.minimo + f * (sel.maximo - sel.minimo)) + 4} textAnchor="end" fontSize="10" fill="#8b909a">{(sel.minimo + f * (sel.maximo - sel.minimo)).toFixed(sel.maximo > 50 ? 0 : 1)}</text></g>)}
        {sensor && <><line x1={P} x2={W - 10} y1={y(sensor.aviso)} y2={y(sensor.aviso)} stroke="#ffb000" strokeDasharray="5 4" /><text x={W - 12} y={y(sensor.aviso) - 4} textAnchor="end" fontSize="10" fill="#ffb000">aviso {sensor.aviso}</text>
          <line x1={P} x2={W - 10} y1={y(sensor.alarma)} y2={y(sensor.alarma)} stroke="#ff4b52" strokeDasharray="5 4" /><text x={W - 12} y={y(sensor.alarma) - 4} textAnchor="end" fontSize="10" fill="#ff4b52">alarma {sensor.alarma}</text></>}
        <path d={ruta} fill="none" stroke="#4aa3ff" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <p className="text-[12px] text-tenue">Un punto por segundo, últimos 2 minutos.</p>
    </div>
  );
}

export function Registro() {
  const s = useSim();
  return (
    <ul className="h-full overflow-auto p-2 text-[12px]">
      {s.eventos.length === 0 && <li className="p-3 text-tenue">Todavía no hay eventos.</li>}
      {s.eventos.map((e, i) => (
        <li key={e.t + "-" + i} className="flex gap-3 border-b border-borde/50 px-2 py-1.5">
          <span className="mono shrink-0 text-tenue">{new Date(e.t).toLocaleTimeString("es-CL")}</span>
          <span className={cx(e.nivel === "alarma" && "font-semibold text-rojo-vivo", e.nivel === "aviso" && "text-led-ambar")}>{e.texto}</span>
        </li>
      ))}
    </ul>
  );
}
