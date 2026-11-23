import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Cpu, FlaskConical } from "lucide-react";
import { Laboratorio } from "./lab/Laboratorio";
import { Estacion } from "./Estacion";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/**
 * SIMA PLC Simulator. Dos espacios: el laboratorio de automatización (escenarios animados con su motor de simulación)
 * y la estación de ingeniería (rack, E/S y programa en escalera de los PLC de SIMA). Funciona sin red; conectarse a SIMA es opcional.
 */
export function App() {
  const [vista, setVista] = useState<"lab" | "estacion">(() => { try { return (localStorage.getItem("sima.sim.vista") as "lab" | "estacion") || "lab"; } catch { return "lab"; } });
  const cambiar = (v: "lab" | "estacion") => { setVista(v); try { localStorage.setItem("sima.sim.vista", v); } catch { /* */ } };
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-borde bg-[#070b16] px-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-[#22d3ee] to-[#8b5cf6] font-display text-[18px] font-extrabold text-[#031018] shadow-[0_6px_20px_-6px_#22d3ee]">S</span>
          <div className="leading-tight"><p className="font-display text-[15px] font-bold">SIMA PLC Simulator</p><p className="text-[10.5px] text-tenue">Laboratorio virtual de automatización</p></div>
        </div>
        <nav className="ml-4 flex gap-1 rounded-xl bg-panel p-1" aria-label="Espacios de trabajo">
          {([["lab", "Laboratorio", FlaskConical], ["estacion", "Estación de ingeniería", Cpu]] as const).map(([k, t, I]) => (
            <button key={k} onClick={() => cambiar(k)} className={cx("relative flex h-8 cursor-pointer items-center gap-2 rounded-lg px-3 text-[12.5px] font-medium", vista === k ? "text-texto" : "text-tenue hover:text-texto")}>
              {vista === k && <motion.span layoutId="vista" className="absolute inset-0 rounded-lg bg-panel2 shadow" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <I className={cx("relative size-4", vista === k && "text-[#22d3ee]")} /><span className="relative">{t}</span>
            </button>
          ))}
        </nav>
        <p className="ml-auto hidden text-[11px] text-tenue lg:block">v4.1.1 · no controla maquinaria real</p>
      </header>
      <div className="min-h-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div key={vista} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="h-full">
            {vista === "lab" ? <Laboratorio /> : <Estacion />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
