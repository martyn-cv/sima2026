"use client";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { pasa, serie, type Condicion, type Peldano, type PlcModulo, type PlcPunto, type Salida, type Sensor } from "@sima/cliente";
import { cx } from "./ui";

export const ESTADO_PLC: Record<string, { texto: string; tono: "ok" | "aviso" | "peligro" | "neutro"; led: string; color: string }> = {
  run: { texto: "En marcha", tono: "ok", led: "bg-[#2fe39a] animate-latido shadow-[0_0_10px_#2fe39a]", color: "#2fe39a" },
  stop: { texto: "Detenido", tono: "aviso", led: "bg-ambar", color: "#fbbf24" },
  error: { texto: "Con error", tono: "peligro", led: "bg-rojo animate-parpadeo shadow-[0_0_10px_#ff5470]", color: "#ff5470" },
  sin_conexion: { texto: "Sin conexión", tono: "neutro", led: "bg-[#5b6577]", color: "#5b6577" },
};

// ------------------------------------------------------------------------------------------ barra de un sensor
export function Medidor({ s }: { s: Sensor }) {
  const rango = s.max - s.min || 1;
  const pos = (x: number) => `${Math.min(100, Math.max(0, ((x - s.min) / rango) * 100))}%`;
  const color = s.nivel === "alarma" ? "var(--s-rojo)" : s.nivel === "aviso" ? "var(--s-ambar)" : "var(--s-acento)";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[13.5px]">
        <span className="truncate text-gris" title={s.nombre}>{s.nombre}</span>
        <span className={cx("num shrink-0 font-semibold", s.nivel === "alarma" && "text-rojo", s.nivel === "aviso" && "text-ambar")}>{s.ultimo == null ? "—" : s.ultimo.toFixed(s.max > 50 ? 0 : 1)} <span className="font-normal text-gris">{s.unidad}</span></span>
      </div>
      <div className="relative mt-1.5 h-2 rounded-full bg-linea-suave" role="meter" aria-valuemin={s.min} aria-valuemax={s.max} aria-valuenow={s.ultimo ?? undefined} aria-label={s.nombre}>
        <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out" style={{ width: s.ultimo == null ? 0 : pos(s.ultimo), background: `linear-gradient(90deg, color-mix(in srgb, ${color} 45%, transparent), ${color})`, boxShadow: `0 0 12px -2px ${color}` }} />
        <i className="absolute -inset-y-1 w-0.5 rounded bg-ambar" style={{ left: pos(s.aviso) }} title={`Aviso: ${s.aviso}`} />
        <i className="absolute -inset-y-1 w-0.5 rounded bg-rojo" style={{ left: pos(s.alarma) }} title={`Alarma: ${s.alarma}`} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------ rack (hardware: siempre oscuro)
const COL_DI = "#2fe39a", COL_DO = "#ffb020", COL_AI = "#4aa3ff";

function Led({ on, color, parpadea, tam = 12 }: { on: boolean; color: string; parpadea?: boolean; tam?: number }) {
  return <span className={cx("block shrink-0 rounded-full border border-black/40 transition-[background,box-shadow] duration-150", on && parpadea && "animate-parpadeo")}
    style={{ width: tam, height: tam, background: on ? color : "#262a33", boxShadow: on ? `0 0 ${tam}px ${tam / 3}px ${color}88, inset 0 -2px 3px #0005` : "inset 0 1px 2px #0008" }} />;
}

function Tornillo() { return <span className="block size-2.5 rounded-full bg-gradient-to-br from-[#9aa3b2] to-[#3b414d] shadow-[inset_0_0_0_1px_#0006]" />; }

export function Rack({ modulos, puntos, io, estado, escala = 1, seleccionado, alElegir }: {
  modulos: PlcModulo[]; puntos: PlcPunto[]; io: Record<string, number>; estado: string; escala?: number; seleccionado?: string | null; alElegir?: (tag: string) => void;
}) {
  const porModulo = (id: number) => puntos.filter((p) => p.moduloId === id);
  const ancho = 168 * escala;
  return (
    <div className="relative rounded-2xl border border-[#2a303b] bg-[linear-gradient(180deg,#151922,#0d1016)] p-4 shadow-[inset_0_1px_0_#ffffff0d,0_30px_60px_-30px_#000]" role="group" aria-label="Rack del PLC">
      {/* riel DIN */}
      <div aria-hidden className="absolute inset-x-4 top-1/2 h-7 -translate-y-1/2 rounded bg-[repeating-linear-gradient(90deg,#3a404c_0_10px,#2c313b_10px_14px)] opacity-70" />
      <div className="relative flex gap-1.5 overflow-x-auto pb-1">
        {modulos.map((m, mi) => {
          const pts = porModulo(m.id);
          const esCpu = m.tipo === "CPU";
          return (
            <motion.div key={m.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: mi * 0.05 }}
              className="relative flex shrink-0 flex-col rounded-lg border border-[#353b47] bg-[linear-gradient(180deg,#2b303a,#1e222a)] text-white shadow-[inset_0_1px_0_#ffffff14]" style={{ width: ancho }}>
              <div className="flex items-center justify-between px-2.5 pt-2"><Tornillo /><span className="num text-[11px] text-[#8b93a3]">R{m.slot}</span><Tornillo /></div>
              <div className={cx("mx-2.5 mt-2 rounded-md px-2 py-1.5", esCpu ? "bg-[linear-gradient(90deg,#7c3aed,#22d3ee)] text-white" : m.tipo === "PS" ? "bg-[#3a404c]" : "bg-[#151922]")}>
                <p className="display text-[17px] font-extrabold leading-none tracking-wide">{m.tipo}</p>
                <p className={cx("mt-0.5 truncate text-[10.5px] leading-tight", esCpu ? "text-white/80" : "text-[#9aa3b2]")} title={m.modelo}>{m.modelo}</p>
              </div>
              <div className="flex-1 px-2.5 py-3">
                {esCpu && (
                  <ul className="space-y-2.5 text-[12px] font-semibold">
                    {[["RUN", estado === "run", COL_DI, false], ["STOP", estado === "stop", COL_DO, false], ["ERROR", estado === "error", "#ff5470", true], ["LINK", estado === "run", COL_AI, true]].map(([t, on, c, p]) => (
                      <li key={t as string} className="flex items-center gap-2.5"><Led on={on as boolean} color={c as string} parpadea={p as boolean} /><span className="tracking-wider">{t as string}</span></li>
                    ))}
                    <li className="mt-3 rounded bg-[#0b0d12] px-2 py-1.5 font-mono text-[10.5px] font-normal text-[#2fe39a]">{estado === "run" ? "> RUN · OK" : estado === "error" ? "> FALLA E07" : estado === "stop" ? "> STOP" : "> SIN ENLACE"}</li>
                  </ul>
                )}
                {m.tipo === "PS" && <ul className="space-y-2.5 text-[12px] font-semibold"><li className="flex items-center gap-2.5"><Led on={estado !== "sin_conexion"} color={COL_DI} /><span>24 V DC</span></li><li className="flex items-center gap-2.5"><Led on={estado !== "sin_conexion"} color={COL_DI} /><span>OK</span></li></ul>}
                {(m.tipo === "DI" || m.tipo === "DO") && (
                  <ul className="grid grid-cols-2 gap-x-2 gap-y-2">
                    {Array.from({ length: m.canales }).map((_, ch) => {
                      const p = pts.find((x) => x.canal === ch);
                      const on = p ? (io[p.tag] ?? 0) > 0 : false;
                      return (
                        <li key={ch}>
                          <button type="button" disabled={!p} onClick={() => p && alElegir?.(p.tag)} title={p ? `${p.direccion} · ${p.tag}\n${p.descripcion}` : `Canal ${ch} sin usar`}
                            className={cx("flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left", p && "cursor-pointer hover:bg-white/5", seleccionado && p?.tag === seleccionado && "bg-white/10 ring-1 ring-[#22d3ee]")}>
                            <Led on={on} color={m.tipo === "DI" ? COL_DI : COL_DO} tam={11} />
                            <span className={cx("num text-[11px]", p ? "text-[#c9cfd9]" : "text-[#4a505c]")}>{ch}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {(m.tipo === "AI" || m.tipo === "AO") && (
                  <ul className="space-y-2">
                    {Array.from({ length: m.canales }).map((_, ch) => {
                      const p = pts.find((x) => x.canal === ch);
                      const v = p ? io[p.tag] : undefined;
                      const frac = p && v != null ? (v - p.minimo) / ((p.maximo - p.minimo) || 1) : 0;
                      return (
                        <li key={ch}>
                          <button type="button" disabled={!p} onClick={() => p && alElegir?.(p.tag)} title={p ? `${p.direccion} · ${p.tag}\n${p.descripcion}` : `Canal ${ch} sin usar`}
                            className={cx("w-full rounded px-1 py-0.5 text-left", p && "cursor-pointer hover:bg-white/5", seleccionado && p?.tag === seleccionado && "bg-white/10 ring-1 ring-[#22d3ee]")}>
                            <div className="flex justify-between text-[11px]"><span className="num text-[#8b93a3]">{ch}</span><span className="num font-semibold text-[#e6e9ef]">{p && v != null ? `${v.toFixed(1)}` : "—"}<span className="ml-0.5 font-normal text-[#8b93a3]">{p?.unidad}</span></span></div>
                            <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-[#0b0d12]"><div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(1, frac)) * 100}%`, background: `linear-gradient(90deg,#1d4f8a,${COL_AI})`, boxShadow: `0 0 8px ${COL_AI}` }} /></div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="flex items-center justify-between px-2.5 pb-2"><Tornillo /><span className="h-1 w-10 rounded bg-[#141821]" /><Tornillo /></div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------ escalera en vivo, con zoom
const ON = "var(--s-verde)", OFF = "var(--s-borde)";

function Elemento({ c, v, entra, resaltar }: { c: Condicion; v: Record<string, number>; entra: boolean; resaltar?: string | null }) {
  if (c.tipo === "OR") {
    return (
      <div className="relative flex flex-col justify-center rounded-lg border border-dashed border-linea px-1 py-1">
        {c.ramas.map((r, i) => <div key={i} className="flex items-center"><Serie cs={r} v={v} entra={entra} resaltar={resaltar} /></div>)}
      </div>
    );
  }
  const ok = pasa(c, v);
  const linea = entra && ok ? ON : OFF;
  const marcado = resaltar && c.tag === resaltar;
  return (
    <div className={cx("flex flex-col items-center rounded-lg px-0.5 py-0.5", marcado && "bg-acento-claro ring-1 ring-acento")} title={c.tipo === "CMP" ? `${c.tag} ${c.op} ${c.valor}` : c.tag}>
      <span className={cx("max-w-[120px] truncate font-mono text-[11px] leading-none", ok ? "text-negro" : "text-gris")}>{c.tag}</span>
      <svg width="84" height="30" viewBox="0 0 84 30" className="mt-1 overflow-visible" aria-hidden>
        <line x1="0" y1="15" x2="30" y2="15" stroke={linea} strokeWidth="2.5" /><line x1="54" y1="15" x2="84" y2="15" stroke={linea} strokeWidth="2.5" />
        {entra && ok && <line x1="0" y1="15" x2="84" y2="15" stroke="var(--s-verde)" strokeWidth="2.5" strokeDasharray="4 8" className="animate-flujo" opacity=".9" />}
        {c.tipo === "CMP" ? (
          <><rect x="30" y="4" width="24" height="22" rx="4" fill={ok ? "var(--s-verde-claro)" : "var(--s-superficie)"} stroke={ok ? ON : OFF} strokeWidth="2" /><text x="42" y="19" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--s-texto)">{c.op}</text></>
        ) : (
          <>
            <line x1="30" y1="4" x2="30" y2="26" stroke={ok ? ON : "var(--s-tenue)"} strokeWidth="3.5" strokeLinecap="round" /><line x1="54" y1="4" x2="54" y2="26" stroke={ok ? ON : "var(--s-tenue)"} strokeWidth="3.5" strokeLinecap="round" />
            {c.tipo === "NC" && <line x1="27" y1="24" x2="57" y2="6" stroke={ok ? ON : "var(--s-tenue)"} strokeWidth="2.5" strokeLinecap="round" />}
            {ok && <rect x="30" y="4" width="24" height="22" fill="var(--s-verde)" opacity=".14" rx="3" />}
          </>
        )}
      </svg>
      <span className="num text-[10.5px] leading-none text-gris">{c.tipo === "CMP" ? c.valor : c.tipo === "NC" ? "NC" : "NA"}</span>
    </div>
  );
}

function Serie({ cs, v, entra, resaltar }: { cs: Condicion[]; v: Record<string, number>; entra: boolean; resaltar?: string | null }) {
  let pasando = entra;
  return <>{cs.map((c, i) => { const e = pasando; pasando = pasando && pasa(c, v); return <Elemento key={i} c={c} v={v} entra={e} resaltar={resaltar} />; })}</>;
}

function Bobina({ s, energia, v, resaltar }: { s: Salida; energia: boolean; v: Record<string, number>; resaltar?: string | null }) {
  const color = energia ? ON : OFF;
  const caja = s.tipo === "TON" || s.tipo === "CTU";
  const texto = s.tipo === "BOBINA" ? "" : s.tipo === "SET" ? "S" : s.tipo === "RESET" ? "R" : s.tipo;
  const acc = s.tipo === "TON" ? v[`${s.tag}.ACC`] ?? 0 : s.tipo === "CTU" ? v[`${s.tag}.ACC`] ?? 0 : 0;
  return (
    <div className={cx("flex flex-col items-center rounded-lg px-1 py-0.5", resaltar === s.tag && "bg-acento-claro ring-1 ring-acento")} title={s.tag}>
      <span className={cx("max-w-[140px] truncate font-mono text-[11px] font-semibold leading-none", energia ? "text-verde" : "text-gris")}>{s.tag}</span>
      <svg width="96" height="30" viewBox="0 0 96 30" className="mt-1 overflow-visible" aria-hidden>
        <line x1="0" y1="15" x2="24" y2="15" stroke={color} strokeWidth="2.5" />
        {caja ? <rect x="24" y="2" width="70" height="26" rx="6" fill={energia ? "var(--s-verde-claro)" : "var(--s-superficie)"} stroke={color} strokeWidth="2" />
          : <><path d="M34 3 Q24 15 34 27" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" /><path d="M58 3 Q68 15 58 27" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />{energia && <circle cx="46" cy="15" r="9" fill="var(--s-verde)" opacity=".25" />}</>}
        <text x={caja ? 59 : 46} y="19.5" textAnchor="middle" fontSize="11.5" fontWeight="800" fill="var(--s-texto)">{texto}</text>
      </svg>
      {s.tipo === "TON" && <span className="num text-[10.5px] leading-none text-gris">{Math.round(acc)}/{s.preset} ms</span>}
      {s.tipo === "CTU" && <span className="num text-[10.5px] leading-none text-gris">{Math.round(acc)}/{s.preset}</span>}
    </div>
  );
}

export function Escalera({ peldanos, io, zoom = 1, resaltar, compacta }: { peldanos: Peldano[]; io: Record<string, number>; zoom?: number; resaltar?: string | null; compacta?: boolean }) {
  return (
    <ol className="space-y-2" style={{ zoom }}>
      {peldanos.map((p, i) => {
        const energia = serie(p.condiciones, io);
        return (
          <motion.li key={p.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.03, 0.4) }}
            className={cx("rounded-2xl border px-4 py-3 transition-colors", energia ? "border-verde/30 bg-verde-claro/40" : "border-linea-suave bg-papel")}>
            {!compacta && <p className="mb-2 flex items-center gap-2 text-[13px]"><span className={cx("num grid h-6 min-w-6 place-items-center rounded-md px-1.5 text-[12px] font-bold", energia ? "bg-verde text-sobre-negro" : "bg-linea-suave text-gris")}>{p.id}</span><span className="text-carbon">{p.comentario}</span></p>}
            <div className="flex items-stretch overflow-x-auto pb-1">
              <span className="mr-1 w-1 shrink-0 self-stretch rounded" style={{ background: "var(--s-verde)" }} />
              <div className="flex items-center"><Serie cs={p.condiciones} v={io} entra={true} resaltar={resaltar} /></div>
              <span className="mt-[20px] h-[2.5px] min-w-6 flex-1 self-start" style={{ background: energia ? ON : OFF }} />
              <Bobina s={p.salida} energia={energia} v={io} resaltar={resaltar} />
              <span className="ml-1 w-1 shrink-0 self-stretch rounded" style={{ background: "var(--s-borde)" }} />
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}

// ------------------------------------------------------------------------------------------ divisor arrastrable
/** Panel con un divisor que el usuario arrastra; el tamaño se recuerda por pantalla. */
export function useTamanoArrastrable(clave: string, inicial: number, min: number, max: number, eje: "x" | "y" = "x", invertido = false) {
  const [tam, setTam] = useState(inicial);
  useEffect(() => { try { const g = Number(localStorage.getItem(clave)); if (g >= min && g <= max) setTam(g); } catch { /* sin almacenamiento */ } }, [clave, min, max]);
  const inicio = useRef<{ p: number; t: number } | null>(null);
  const alPresionar = useCallback((e: React.PointerEvent) => {
    inicio.current = { p: eje === "x" ? e.clientX : e.clientY, t: tam };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [tam, eje]);
  const alMover = useCallback((e: React.PointerEvent) => {
    if (!inicio.current) return;
    const d = (eje === "x" ? e.clientX : e.clientY) - inicio.current.p;
    setTam(Math.max(min, Math.min(max, inicio.current.t + (invertido ? -d : d))));
  }, [eje, min, max, invertido]);
  const alSoltar = useCallback(() => { inicio.current = null; try { localStorage.setItem(clave, String(tam)); } catch { /* */ } }, [clave, tam]);
  return { tam, divisor: { onPointerDown: alPresionar, onPointerMove: alMover, onPointerUp: alSoltar } };
}

export function Divisor({ eje = "x", ...p }: { eje?: "x" | "y" } & React.HTMLAttributes<HTMLDivElement>): ReactNode {
  return (
    <div role="separator" aria-orientation={eje === "x" ? "vertical" : "horizontal"} {...p}
      className={cx("group relative z-10 flex shrink-0 touch-none select-none items-center justify-center", eje === "x" ? "w-3 cursor-col-resize" : "h-3 cursor-row-resize")}>
      <span className={cx("rounded-full bg-linea transition-colors group-hover:bg-acento", eje === "x" ? "h-12 w-1" : "h-1 w-12")} />
    </div>
  );
}
