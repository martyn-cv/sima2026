import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Cpu, FlaskConical, Zap } from "lucide-react";
import { Laboratorio } from "./lab/Laboratorio";
import { Estacion } from "./Estacion";
import { Control } from "./control/Control";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/**
 * SIMA PLC Simulator. Dos espacios: el laboratorio de automatización (escenarios animados con su motor de simulación)
 * y la estación de ingeniería (rack, E/S y programa en escalera de los PLC de SIMA). Funciona sin red; conectarse a SIMA es opcional.
 */
type Vista = "control" | "lab" | "estacion";

export function App() {
  const [vista, setVista] = useState<Vista>(() => { try { return (localStorage.getItem("sima.sim.vista") as Vista) || "control"; } catch { return "control"; } });
  const cambiar = (v: Vista) => { setVista(v); try { localStorage.setItem("sima.sim.vista", v); } catch { /* */ } };
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-borde bg-panel px-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-md bg-rojo text-[#0d1117]" aria-hidden><svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 7h11a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h11" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg></span>
          <div className="leading-tight"><p className="font-display text-[14px] font-semibold">SIMA Simulador</p><p className="text-[10.5px] text-tenue">Planta virtual · fallas y escenarios</p></div>
        </div>
        <nav className="ml-4 flex gap-1 rounded-md bg-panel p-1" aria-label="Espacios de trabajo">
          {([["control", "Control de simulación", Zap], ["lab", "Laboratorio", FlaskConical], ["estacion", "Estación de ingeniería", Cpu]] as const).map(([k, t, I]) => (
            <button key={k} onClick={() => cambiar(k)} className={cx("relative flex h-8 cursor-pointer items-center gap-2 rounded px-3 text-[12.5px] font-medium", vista === k ? "text-texto" : "text-tenue hover:text-texto")}>
              {vista === k && <motion.span layoutId="vista" className="absolute inset-0 rounded bg-panel2" transition={{ duration: 0.2 }} />}
              <I className={cx("relative size-4", vista === k && "text-rojo")} /><span className="relative">{t}</span>
            </button>
          ))}
        </nav>
        <p className="ml-auto hidden text-[11px] text-tenue lg:block">v4.1.1 · no controla maquinaria real</p>
      </header>
      <div className="min-h-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div key={vista} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="h-full">
            {vista === "control" ? <Control /> : vista === "lab" ? <Laboratorio /> : <Estacion />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
