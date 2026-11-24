"use client";
import { motion } from "motion/react";
import type { CSSProperties } from "react";

/**
 * Ilustraciones animadas de los equipos de la planta. Se mueven cuando el equipo opera, se quedan quietas cuando está
 * detenido o en mantención, y tiemblan en rojo cuando tiene una alarma. Siguen los colores del tema.
 */
export type EstadoMaquina = "operando" | "alarma" | "detenido" | "en_mantencion" | string;

const giro = (dur: number, on: boolean) => (on ? { animate: { rotate: 360 }, transition: { repeat: Infinity, ease: "linear" as const, duration: dur } } : { animate: { rotate: 0 } });
const vaiven = (prop: "x" | "y" | "rotate", a: number, b: number, dur: number, on: boolean) =>
  on ? { animate: { [prop]: [a, b, a] }, transition: { repeat: Infinity, ease: "easeInOut" as const, duration: dur } } : { animate: { [prop]: a } };
const caja: CSSProperties = { transformBox: "fill-box", transformOrigin: "center" };

function colores(estado: EstadoMaquina) {
  const acento = estado === "alarma" ? "var(--s-rojo)" : estado === "en_mantencion" ? "var(--s-ambar)" : estado === "operando" ? "var(--s-acento)" : "var(--s-tenue)";
  return { acento, cuerpo: "var(--s-superficie-2)", borde: "var(--s-borde)", oscuro: "var(--s-borde-suave)" };
}

function Mecanizado({ on, c }: { on: boolean; c: ReturnType<typeof colores> }) {
  return (
    <>
      <rect x="14" y="14" width="92" height="52" rx="8" fill={c.cuerpo} stroke={c.borde} strokeWidth="2" />
      <rect x="22" y="22" width="52" height="34" rx="4" fill="var(--s-fondo)" stroke={c.borde} />
      <motion.g style={caja} {...vaiven("x", -10, 12, 2.4, on)}>
        <rect x="42" y="22" width="10" height="16" rx="2" fill={c.acento} opacity=".85" />
        <motion.g style={caja} {...giro(0.5, on)}><circle cx="47" cy="44" r="5" fill="none" stroke={c.acento} strokeWidth="2" strokeDasharray="3 2" /></motion.g>
      </motion.g>
      <rect x="28" y="50" width="40" height="4" rx="2" fill={c.borde} />
      <rect x="82" y="22" width="16" height="22" rx="3" fill="var(--s-fondo)" stroke={c.borde} />
      <motion.rect x="85" y="26" width="10" height="4" rx="1" fill={c.acento} animate={on ? { opacity: [0.3, 1, 0.3] } : { opacity: 0.3 }} transition={{ repeat: Infinity, duration: 1.4 }} />
      <rect x="85" y="33" width="10" height="2" rx="1" fill={c.borde} /><rect x="85" y="37" width="7" height="2" rx="1" fill={c.borde} />
    </>
  );
}

function Torno({ on, c }: { on: boolean; c: ReturnType<typeof colores> }) {
  return (
    <>
      <rect x="10" y="44" width="100" height="18" rx="4" fill={c.cuerpo} stroke={c.borde} strokeWidth="2" />
      <rect x="14" y="20" width="24" height="26" rx="4" fill={c.cuerpo} stroke={c.borde} strokeWidth="2" />
      <motion.g style={caja} {...giro(0.4, on)}><circle cx="44" cy="33" r="9" fill="var(--s-fondo)" stroke={c.acento} strokeWidth="2.5" /><line x1="44" y1="24" x2="44" y2="42" stroke={c.acento} strokeWidth="2" /><line x1="35" y1="33" x2="53" y2="33" stroke={c.acento} strokeWidth="2" /></motion.g>
      <rect x="53" y="30" width="34" height="6" rx="3" fill={c.borde} />
      <motion.g {...vaiven("x", 0, -14, 2.2, on)}><path d="M78 40 l6 -6 l8 0 l0 10 l-14 0 z" fill={c.acento} opacity=".9" /></motion.g>
      <rect x="90" y="24" width="14" height="20" rx="3" fill={c.cuerpo} stroke={c.borde} strokeWidth="2" />
    </>
  );
}

function Inyectora({ on, c }: { on: boolean; c: ReturnType<typeof colores> }) {
  return (
    <>
      <rect x="8" y="46" width="104" height="16" rx="4" fill={c.cuerpo} stroke={c.borde} strokeWidth="2" />
      <path d="M18 16 h14 l-3 12 h-8 z" fill={c.cuerpo} stroke={c.borde} strokeWidth="2" />
      <rect x="16" y="28" width="52" height="12" rx="6" fill={c.cuerpo} stroke={c.borde} strokeWidth="2" />
      <motion.rect x="22" y="31" width="30" height="6" rx="3" fill={c.acento} opacity=".8" {...vaiven("x", 0, 10, 1.8, on)} />
      <rect x="68" y="20" width="10" height="28" rx="2" fill={c.borde} />
      <motion.rect x="80" y="20" width="10" height="28" rx="2" fill={c.cuerpo} stroke={c.borde} strokeWidth="2" {...vaiven("x", 0, 8, 1.8, on)} />
      <rect x="94" y="20" width="10" height="28" rx="2" fill={c.borde} />
      <motion.circle cx="60" cy="34" r="2.5" fill="var(--s-cobre)" animate={on ? { opacity: [0, 1, 0] } : { opacity: 0 }} transition={{ repeat: Infinity, duration: 1.8 }} />
    </>
  );
}

function Prensa({ on, c }: { on: boolean; c: ReturnType<typeof colores> }) {
  return (
    <>
      <rect x="22" y="8" width="76" height="14" rx="4" fill={c.cuerpo} stroke={c.borde} strokeWidth="2" />
      <rect x="26" y="22" width="8" height="40" fill={c.borde} /><rect x="86" y="22" width="8" height="40" fill={c.borde} />
      <motion.g {...vaiven("y", 0, 16, 1.6, on)}><rect x="54" y="22" width="12" height="12" fill={c.borde} /><rect x="40" y="32" width="40" height="8" rx="2" fill={c.acento} opacity=".9" /></motion.g>
      <rect x="40" y="54" width="40" height="6" rx="2" fill={c.cuerpo} stroke={c.borde} strokeWidth="1.5" />
      <rect x="16" y="62" width="88" height="8" rx="3" fill={c.cuerpo} stroke={c.borde} strokeWidth="2" />
    </>
  );
}

function Robot({ on, c }: { on: boolean; c: ReturnType<typeof colores> }) {
  return (
    <>
      <rect x="40" y="58" width="40" height="10" rx="3" fill={c.cuerpo} stroke={c.borde} strokeWidth="2" />
      <motion.g style={{ transformOrigin: "60px 56px" }} {...vaiven("rotate", -28, 28, 2.6, on)}>
        <rect x="55" y="30" width="10" height="28" rx="5" fill={c.cuerpo} stroke={c.borde} strokeWidth="2" />
        <motion.g style={{ transformOrigin: "60px 32px" }} {...vaiven("rotate", 40, -10, 2.6, on)}>
          <rect x="58" y="14" width="34" height="9" rx="4.5" transform="rotate(20 60 18)" fill={c.cuerpo} stroke={c.borde} strokeWidth="2" />
          <circle cx="90" cy="30" r="5" fill={c.acento} />
        </motion.g>
        <circle cx="60" cy="32" r="5" fill={c.acento} opacity=".8" />
      </motion.g>
      <rect x="12" y="50" width="20" height="18" rx="2" fill="none" stroke={c.borde} strokeDasharray="3 2" />
      <rect x="88" y="50" width="20" height="18" rx="2" fill="none" stroke={c.borde} strokeDasharray="3 2" />
    </>
  );
}

function Soldadora({ on, c }: { on: boolean; c: ReturnType<typeof colores> }) {
  return (
    <>
      <rect x="10" y="30" width="34" height="34" rx="5" fill={c.cuerpo} stroke={c.borde} strokeWidth="2" />
      <circle cx="27" cy="44" r="6" fill="var(--s-fondo)" stroke={c.borde} /><rect x="18" y="54" width="18" height="4" rx="2" fill={c.borde} />
      <path d="M44 40 C 62 30, 70 58, 86 44" fill="none" stroke={c.borde} strokeWidth="3" />
      <rect x="84" y="36" width="8" height="16" rx="2" transform="rotate(25 88 44)" fill={c.acento} />
      <rect x="62" y="60" width="50" height="6" rx="2" fill={c.cuerpo} stroke={c.borde} strokeWidth="1.5" />
      {[0, 1, 2, 3].map((i) => (
        <motion.circle key={i} cx={96} cy={57} r={1.6} fill="var(--s-ambar)" animate={on ? { x: [0, (i - 1.5) * 8], y: [0, -8 - i * 2], opacity: [1, 0] } : { opacity: 0 }} transition={{ repeat: Infinity, duration: 0.5 + i * 0.12, delay: i * 0.08 }} />
      ))}
      <motion.circle cx="96" cy="57" r="4" fill="var(--s-ambar)" animate={on ? { opacity: [0.2, 1, 0.4, 1, 0.2] } : { opacity: 0 }} transition={{ repeat: Infinity, duration: 0.35 }} />
    </>
  );
}

function Cinta({ on, c }: { on: boolean; c: ReturnType<typeof colores> }) {
  return (
    <>
      <rect x="6" y="40" width="108" height="14" rx="7" fill={c.cuerpo} stroke={c.borde} strokeWidth="2" />
      <motion.line x1="12" y1="47" x2="108" y2="47" stroke={c.acento} strokeWidth="2" strokeDasharray="6 6" animate={on ? { strokeDashoffset: [0, -24] } : {}} transition={{ repeat: Infinity, ease: "linear", duration: 0.8 }} />
      {[0, 1, 2].map((i) => (
        <motion.rect key={i} y="28" width="16" height="12" rx="2" fill="var(--s-cobre)" opacity=".85" initial={{ x: 8 + i * 36 }} animate={on ? { x: [8 + i * 36, 44 + i * 36] } : {}} transition={{ repeat: Infinity, ease: "linear", duration: 2.4 }} />
      ))}
      <rect x="14" y="54" width="4" height="12" fill={c.borde} /><rect x="102" y="54" width="4" height="12" fill={c.borde} />
    </>
  );
}

function Envasadora({ on, c }: { on: boolean; c: ReturnType<typeof colores> }) {
  return (
    <>
      <rect x="34" y="8" width="52" height="16" rx="4" fill={c.cuerpo} stroke={c.borde} strokeWidth="2" />
      <motion.rect x="56" y="24" width="8" height="10" rx="2" fill={c.acento} {...vaiven("y", 0, 8, 1.2, on)} />
      <rect x="6" y="54" width="108" height="8" rx="4" fill={c.cuerpo} stroke={c.borde} strokeWidth="2" />
      {[0, 1, 2, 3].map((i) => (
        <motion.g key={i} initial={{ x: i * 28 }} animate={on ? { x: [i * 28, i * 28 + 28] } : {}} transition={{ repeat: Infinity, ease: "linear", duration: 1.2 }}>
          <path d="M10 54 v-14 q0 -4 4 -6 v-4 h6 v4 q4 2 4 6 v14 z" fill="var(--s-azul)" opacity=".55" stroke={c.borde} />
        </motion.g>
      ))}
    </>
  );
}

function Bomba({ on, c }: { on: boolean; c: ReturnType<typeof colores> }) {
  return (
    <>
      <rect x="8" y="34" width="28" height="10" fill={c.borde} /><rect x="84" y="34" width="28" height="10" fill={c.borde} />
      <circle cx="60" cy="39" r="24" fill={c.cuerpo} stroke={c.borde} strokeWidth="2" />
      <motion.g style={caja} {...giro(0.7, on)}>
        {[0, 60, 120, 180, 240, 300].map((a) => <path key={a} d="M60 39 q8 -6 4 -16" fill="none" stroke={c.acento} strokeWidth="3" strokeLinecap="round" transform={`rotate(${a} 60 39)`} />)}
        <circle cx="60" cy="39" r="4" fill={c.acento} />
      </motion.g>
      <rect x="44" y="64" width="32" height="6" rx="2" fill={c.borde} />
      <motion.line x1="10" y1="39" x2="36" y2="39" stroke="var(--s-azul)" strokeWidth="2" strokeDasharray="4 4" animate={on ? { strokeDashoffset: [0, -16] } : {}} transition={{ repeat: Infinity, ease: "linear", duration: 0.6 }} />
      <motion.line x1="84" y1="39" x2="110" y2="39" stroke="var(--s-azul)" strokeWidth="2" strokeDasharray="4 4" animate={on ? { strokeDashoffset: [0, -16] } : {}} transition={{ repeat: Infinity, ease: "linear", duration: 0.6 }} />
    </>
  );
}

function Compresor({ on, c }: { on: boolean; c: ReturnType<typeof colores> }) {
  return (
    <>
      <rect x="10" y="38" width="64" height="26" rx="13" fill={c.cuerpo} stroke={c.borde} strokeWidth="2" />
      <rect x="22" y="14" width="30" height="24" rx="4" fill={c.cuerpo} stroke={c.borde} strokeWidth="2" />
      <motion.rect x="28" y="18" width="18" height="8" rx="2" fill={c.acento} opacity=".85" {...vaiven("y", 0, 8, 0.5, on)} />
      <circle cx="94" cy="40" r="16" fill="var(--s-fondo)" stroke={c.borde} strokeWidth="2" />
      <motion.line x1="94" y1="40" x2="94" y2="28" stroke={c.acento} strokeWidth="2.5" strokeLinecap="round" style={{ transformOrigin: "94px 40px" }} {...vaiven("rotate", -40, 50, 3, on)} />
      <circle cx="94" cy="40" r="2.5" fill={c.acento} />
      <rect x="16" y="64" width="8" height="6" fill={c.borde} /><rect x="60" y="64" width="8" height="6" fill={c.borde} />
    </>
  );
}

const DIBUJO: [RegExp, typeof Mecanizado][] = [
  [/mecanizado/i, Mecanizado], [/torno/i, Torno], [/inyectora/i, Inyectora], [/prensa/i, Prensa], [/robot/i, Robot],
  [/soldadura|soldadora/i, Soldadora], [/cinta/i, Cinta], [/envasad/i, Envasadora], [/bomba/i, Bomba], [/compresor/i, Compresor],
];

export function Maquina({ tipo, estado, className }: { tipo: string; estado: EstadoMaquina; className?: string }) {
  const D = DIBUJO.find(([r]) => r.test(tipo))?.[1] ?? Mecanizado;
  const c = colores(estado);
  const on = estado === "operando" || estado === "alarma";
  return (
    <motion.svg viewBox="0 0 120 76" className={className} role="img" aria-label={`${tipo}: ${estado}`}
      animate={estado === "alarma" ? { x: [0, -1.5, 1.5, -1, 0] } : { x: 0 }} transition={estado === "alarma" ? { repeat: Infinity, duration: 0.5, repeatDelay: 0.6 } : {}}>
      <ellipse cx="60" cy="71" rx="50" ry="4" fill="var(--s-fondo)" opacity=".6" />
      <D on={on} c={c} />
      {estado === "en_mantencion" && <g><rect x="92" y="2" width="24" height="16" rx="4" fill="var(--s-ambar)" /><path d="M98 14 l5 -8 l5 8 z" fill="var(--s-sobre-texto)" /></g>}
    </motion.svg>
  );
}
