"use client";
import { motion } from "motion/react";
import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { CURVA, cx } from "./ui";

/** Gráficos SVG propios, livianos y animados: se dibujan al aparecer y siguen el tema. */

export interface Serie { nombre: string; color: string; valores: number[] }

function escala(dom: [number, number], rango: [number, number]) {
  const [d0, d1] = dom; const [r0, r1] = rango;
  return (v: number) => (d1 === d0 ? (r0 + r1) / 2 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0));
}

function suave(pts: [number, number][]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i]; const cx1 = x0 + (x1 - x0) / 2;
    d += ` C${cx1},${y0} ${cx1},${y1} ${x1},${y1}`;
  }
  return d;
}

/** Área con varias series, eje Y discreto y lectura al pasar el cursor. */
export function GraficoArea({ series, etiquetas, alto = 240, formato = (n: number) => n.toLocaleString("es-CL") }: { series: Serie[]; etiquetas: string[]; alto?: number; formato?: (n: number) => string }) {
  const id = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const W = 800, H = alto, P = { l: 44, r: 12, t: 12, b: 26 };
  const todos = series.flatMap((s) => s.valores);
  const max = Math.max(1, ...todos) * 1.08, min = 0;
  const n = Math.max(...series.map((s) => s.valores.length), 1);
  const x = escala([0, n - 1], [P.l, W - P.r]);
  const y = escala([min, max], [H - P.b, P.t]);
  const marcas = [0, 0.25, 0.5, 0.75, 1].map((f) => min + f * (max - min));
  const mover = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.round(((px - P.l) / (W - P.l - P.r)) * (n - 1)))));
  };
  return (
    <div className="relative">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" onMouseMove={mover} onMouseLeave={() => setHover(null)} role="img" aria-label={series.map((s) => s.nombre).join(", ")}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={i} id={`g${id}${i}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.38" /><stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
          <filter id={`b${id}`} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="5" /></filter>
          <linearGradient id={`f${id}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--s-cobre)" stopOpacity=".28" /><stop offset="100%" stopColor="var(--s-cobre)" stopOpacity="0" /></linearGradient>
        </defs>
        {hover != null && <rect x={x(hover) - Math.max(10, (W - P.l - P.r) / Math.max(1, n - 1) / 2.2)} width={Math.max(20, (W - P.l - P.r) / Math.max(1, n - 1) / 1.1)} y={P.t} height={H - P.t - P.b} fill={`url(#f${id})`} rx="6" />}
        {marcas.map((m) => (
          <g key={m}><line x1={P.l} x2={W - P.r} y1={y(m)} y2={y(m)} stroke="var(--s-borde-suave)" strokeDasharray="3 5" />
            <text x={P.l - 8} y={y(m) + 4} textAnchor="end" fontSize="11" fill="var(--s-tenue)">{formato(Math.round(m))}</text></g>
        ))}
        {etiquetas.map((e, i) => (i % Math.ceil(n / 8) === 0 || i === n - 1) && <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--s-tenue)">{e}</text>)}
        {series.map((s, i) => {
          const pts = s.valores.map((v, k) => [x(k), y(v)] as [number, number]);
          const linea = suave(pts);
          return (
            <g key={s.nombre}>
              <motion.path d={`${linea} L${pts[pts.length - 1]?.[0] ?? 0},${H - P.b} L${pts[0]?.[0] ?? 0},${H - P.b} Z`} fill={`url(#g${id}${i})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.4 + i * 0.15 }} />
              <motion.path d={linea} fill="none" stroke={s.color} strokeWidth="6" strokeLinecap="round" opacity=".45" filter={`url(#b${id})`} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, delay: i * 0.15, ease: CURVA }} />
              <motion.path d={linea} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, delay: i * 0.15, ease: CURVA }} />
            </g>
          );
        })}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="var(--s-cobre)" strokeOpacity=".5" strokeDasharray="3 4" />
            {series.map((s) => s.valores[hover] != null && <g key={s.nombre}><circle cx={x(hover)} cy={y(s.valores[hover])} r="10" fill={s.color} opacity=".25" /><circle cx={x(hover)} cy={y(s.valores[hover])} r="5" fill="var(--s-superficie)" stroke={s.color} strokeWidth="2.5" /></g>)}
          </g>
        )}
      </svg>
      {hover != null && (
        <div className="tarjeta vidrio pointer-events-none absolute top-2 z-10 min-w-[150px] px-3 py-2 text-[13px]" style={{ left: `min(calc(${(x(hover) / W) * 100}% + 12px), calc(100% - 170px))` }}>
          <p className="mb-1 font-semibold">{etiquetas[hover]}</p>
          {series.map((s) => <p key={s.nombre} className="flex items-center justify-between gap-4"><span className="flex items-center gap-1.5 text-gris"><i className="size-2 rounded-full" style={{ background: s.color }} />{s.nombre}</span><b className="num">{formato(s.valores[hover] ?? 0)}</b></p>)}
        </div>
      )}
    </div>
  );
}

/** Dona animada con el total al centro. */
export function Dona({ partes, tam = 180, grosor = 22, centro }: { partes: { etiqueta: string; valor: number; color: string }[]; tam?: number; grosor?: number; centro?: ReactNode }) {
  const id = useId().replace(/:/g, "");
  const total = partes.reduce((a, p) => a + p.valor, 0) || 1;
  const r = (tam - grosor) / 2, C = 2 * Math.PI * r;
  let acumulado = 0;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: tam, height: tam }}>
      <svg width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} className="-rotate-90" role="img" aria-label={partes.map((p) => `${p.etiqueta} ${p.valor}`).join(", ")}>
        <defs>{partes.map((p, i) => <linearGradient key={i} id={`d${id}${i}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={p.color} /><stop offset="100%" stopColor={p.color} stopOpacity=".7" /></linearGradient>)}</defs>
        <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke="var(--s-borde-suave)" strokeWidth={grosor} />
        {partes.filter((p) => p.valor > 0).map((p, i) => {
          const frac = p.valor / total; const ini = acumulado; acumulado += frac;
          return <motion.circle key={p.etiqueta} cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke={`url(#d${id}${partes.indexOf(p)})`} strokeWidth={grosor} strokeLinecap="butt" style={{ filter: `drop-shadow(0 0 6px color-mix(in srgb, ${p.color} 50%, transparent))` }}
            strokeDasharray={`${C * frac - 2} ${C}`} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: -C * ini }} transition={{ duration: 1.1, delay: 0.1 + i * 0.1, ease: CURVA }} />;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{centro}</div>
    </div>
  );
}

/** Medidor semicircular con zonas de aviso y alarma. */
export function Medidor({ valor, min = 0, max = 100, aviso, alarma, unidad = "", etiqueta, tam = 170 }: { valor: number | null; min?: number; max?: number; aviso?: number; alarma?: number; unidad?: string; etiqueta?: string; tam?: number }) {
  const r = tam / 2 - 14, cx0 = tam / 2, cy0 = tam / 2 + 6;
  const ang = (v: number) => Math.PI + ((Math.min(max, Math.max(min, v)) - min) / (max - min || 1)) * Math.PI;
  const pt = (a: number, rr = r) => [cx0 + rr * Math.cos(a), cy0 + rr * Math.sin(a)];
  const arco = (v0: number, v1: number) => { const [x0, y0] = pt(ang(v0)); const [x1, y1] = pt(ang(v1)); return `M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1}`; };
  const v = valor ?? min;
  const color = alarma != null && v >= alarma ? "var(--s-rojo)" : aviso != null && v >= aviso ? "var(--s-ambar)" : "var(--s-acento)";
  const [ax, ay] = pt(ang(v), r - 6);
  return (
    <svg width={tam} height={tam * 0.68} viewBox={`0 0 ${tam} ${tam * 0.68}`} role="meter" aria-valuenow={valor ?? undefined} aria-valuemin={min} aria-valuemax={max} aria-label={etiqueta}>
      <path d={arco(min, max)} fill="none" stroke="var(--s-borde-suave)" strokeWidth="12" strokeLinecap="round" />
      {aviso != null && <path d={arco(aviso, alarma ?? max)} fill="none" stroke="var(--s-ambar)" strokeOpacity=".35" strokeWidth="12" />}
      {alarma != null && <path d={arco(alarma, max)} fill="none" stroke="var(--s-rojo)" strokeOpacity=".4" strokeWidth="12" strokeLinecap="round" />}
      <motion.path d={arco(min, v)} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" initial={false} animate={{ d: arco(min, v) }} transition={{ type: "spring", stiffness: 90, damping: 18 }} />
      <motion.circle r="5" fill={color} initial={false} animate={{ cx: ax, cy: ay }} transition={{ type: "spring", stiffness: 90, damping: 18 }} />
      <text x={cx0} y={cy0 - 8} textAnchor="middle" fontSize={tam * 0.17} fontWeight="700" fill="var(--s-texto)" fontFamily="var(--font-display)">{valor == null ? "—" : valor.toFixed(max > 50 ? 0 : 1)}</text>
      <text x={cx0} y={cy0 + 10} textAnchor="middle" fontSize="11" fill="var(--s-tenue)">{unidad}</text>
    </svg>
  );
}

/** Línea mínima para acompañar un número. */
export function Chispa({ valores, color = "var(--s-acento)", alto = 40, relleno = true }: { valores: number[]; color?: string; alto?: number; relleno?: boolean }) {
  const id = useId().replace(/:/g, "");
  const W = 200;
  const d = useMemo(() => {
    if (valores.length < 2) return { l: "", a: "" };
    const max = Math.max(...valores), min = Math.min(...valores);
    const x = escala([0, valores.length - 1], [2, W - 2]); const y = escala([min, max === min ? min + 1 : max], [alto - 3, 3]);
    const pts = valores.map((v, i) => [x(i), y(v)] as [number, number]);
    const l = suave(pts);
    return { l, a: `${l} L${W - 2},${alto} L2,${alto} Z` };
  }, [valores, alto]);
  return (
    <svg viewBox={`0 0 ${W} ${alto}`} className="h-auto w-full" preserveAspectRatio="none" aria-hidden>
      <defs><linearGradient id={`c${id}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".3" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {relleno && <motion.path d={d.a} fill={`url(#c${id})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }} />}
      <motion.path d={d.l} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: CURVA }} />
    </svg>
  );
}

/** Barras horizontales con etiqueta y valor. */
export function BarrasH({ datos, formato = (n: number) => n.toLocaleString("es-CL"), color = "var(--s-acento)", max }: { datos: { etiqueta: string; valor: number; color?: string; detalle?: string }[]; formato?: (n: number) => string; color?: string; max?: number }) {
  const tope = max ?? Math.max(1, ...datos.map((d) => d.valor));
  return (
    <ul className="space-y-3">
      {datos.map((d, i) => (
        <li key={d.etiqueta}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13.5px]"><span className="truncate" title={d.etiqueta}>{d.etiqueta}</span><span className="num shrink-0 font-semibold">{formato(d.valor)}{d.detalle && <span className="ml-1.5 font-normal text-gris">{d.detalle}</span>}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-linea-suave">
            <motion.div className={cx("h-full rounded-full")} style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${d.color ?? color} 55%, transparent), ${d.color ?? color})` }}
              initial={{ width: 0 }} animate={{ width: `${(d.valor / tope) * 100}%` }} transition={{ duration: 0.9, delay: 0.1 + i * 0.05, ease: CURVA }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
