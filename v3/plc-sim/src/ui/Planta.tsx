import { Fan, Siren, Wrench, Zap } from "lucide-react";
import { useSim, type CfgEquipo } from "../simulador";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const pre = (cod: string) => cod.replace("-", "");

function Lampara({ on, color }: { on: boolean; color: "verde" | "rojo" }) {
  const base = color === "verde" ? "#2fc77a" : "#ff4b52";
  return <span className={cx("block size-5 rounded-full border border-black/60 transition-all duration-150", on && color === "rojo" && "animate-parpadeo")} style={{ background: on ? base : "#2b2e35", boxShadow: on ? `0 0 14px 2px ${base}` : "inset 0 1px 3px #0008" }} />;
}

function Tarjeta({ e }: { e: CfgEquipo }) {
  const s = useSim();
  const p = pre(e.codigo);
  const img = s.imagen;
  const marcha = (img[`${p}_CONTACTOR`] ?? 0) > 0 && s.estado === "run";
  const falla = (img[`${p}_FALLA`] ?? 0) > 0;
  const emerg = (s.entradas[`${p}_EMERG`] ?? 0) > 0;
  return (
    <li className={cx("flex flex-col border bg-panel", falla ? "border-rojo" : "border-borde")}>
      <div className="flex items-center gap-3 border-b border-borde px-3 py-2.5">
        <span className={cx("grid size-10 shrink-0 place-items-center border border-borde bg-panel2", marcha ? "text-led-verde" : "text-tenue")}>
          <Fan className={cx("size-6", marcha && "animate-giro")} style={marcha ? { animationDuration: `${Math.max(0.35, 1.2 / s.ajustes.velocidad)}s` } : undefined} />
        </span>
        <div className="min-w-0 flex-1"><p className="display text-[22px] font-bold leading-none">{e.codigo}</p><p className="truncate text-[12px] text-tenue">{e.nombre}</p></div>
        <div className="flex items-center gap-2"><Lampara on={(img[`${p}_LUZ_VERDE`] ?? 0) > 0} color="verde" /><Lampara on={(img[`${p}_LUZ_ROJA`] ?? 0) > 0} color="rojo" /></div>
      </div>
      <ul className="space-y-2 px-3 py-2.5">
        {e.sensores.map((sn) => {
          const pt = s.config!.puntos.find((x) => x.equipo === e.codigo && x.variable === sn.variable);
          const v = pt ? img[pt.tag] ?? 0 : 0;
          const f = (x: number) => `${Math.max(0, Math.min(100, ((x - sn.min) / (sn.max - sn.min)) * 100))}%`;
          const nivel = v >= sn.alarma ? "alarma" : v >= sn.aviso ? "aviso" : "ok";
          return (
            <li key={sn.variable}>
              <div className="flex items-baseline justify-between gap-2 text-[12px]"><span className="truncate text-tenue">{sn.nombre}</span><span className={cx("mono font-semibold", nivel === "alarma" && "text-rojo-vivo", nivel === "aviso" && "text-led-ambar")}>{v.toFixed(sn.max > 50 ? 0 : 1)} {sn.unidad}</span></div>
              <div className="relative mt-1 h-1.5 bg-[#2b2e35]">
                <div className={cx("absolute inset-y-0 left-0 transition-[width] duration-150", nivel === "alarma" ? "bg-rojo-vivo" : nivel === "aviso" ? "bg-led-ambar" : "bg-led-verde")} style={{ width: f(v) }} />
                <i className="absolute -inset-y-0.5 w-px bg-led-ambar" style={{ left: f(sn.aviso) }} /><i className="absolute -inset-y-0.5 w-px bg-rojo-vivo" style={{ left: f(sn.alarma) }} />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto grid grid-cols-4 gap-1.5 border-t border-borde p-2">
        <button onClick={() => s.pulso(`${p}_MARCHA`)} title="Pulsador de marcha" className="flex cursor-pointer flex-col items-center gap-0.5 bg-[#12331f] py-1.5 text-[11px] font-semibold text-led-verde transition-colors hover:bg-[#194a2d]"><Zap className="size-4" />Marcha</button>
        <button onClick={() => s.pulso(`${p}_PARO`)} title="Pulsador de paro (también rearma la falla)" className="flex cursor-pointer flex-col items-center gap-0.5 bg-[#3a1416] py-1.5 text-[11px] font-semibold text-rojo-vivo transition-colors hover:bg-[#511b1e]"><span className="size-4 rounded-full border-2 border-current" />Paro</button>
        <button onClick={() => s.alternar(`${p}_EMERG`)} aria-pressed={emerg} title="Parada de emergencia (con retención)" className={cx("flex cursor-pointer flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold transition-colors", emerg ? "bg-rojo text-white" : "bg-panel2 text-tenue hover:text-texto")}><Siren className="size-4" />Emerg.</button>
        <button onClick={() => (falla || e.sensores.some((sn) => (s.valores_deriva(e.codigo, sn.variable) ?? 0) > 0) ? s.reparar(e.codigo) : s.inyectarFalla(e.codigo))} title="Inyectar una falla en una variable del equipo, o repararlo" className="flex cursor-pointer flex-col items-center gap-0.5 bg-[#3b2c0a] py-1.5 text-[11px] font-semibold text-led-ambar transition-colors hover:bg-[#52400f]"><Wrench className="size-4" />{falla ? "Reparar" : "Falla"}</button>
      </div>
    </li>
  );
}

export function Planta() {
  const s = useSim();
  if (!s.config) return null;
  return <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">{s.config.equipos.map((e) => <Tarjeta key={e.codigo} e={e} />)}</ul>;
}
