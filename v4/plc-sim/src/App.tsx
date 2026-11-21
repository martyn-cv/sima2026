import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Cable, Cpu, Gauge, ListTree, ScrollText, Settings, TrendingUp } from "lucide-react";
import { sim, useSim } from "./simulador";
import { Rack } from "./ui/Rack";
import { Planta } from "./ui/Planta";
import { Escalera } from "./ui/Escalera";
import { Registro, Tendencia, Variables } from "./ui/Paneles";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
type Pestana = "escalera" | "variables" | "tendencia" | "registro";
const PESTANAS: { k: Pestana; t: string; i: typeof Cpu }[] = [{ k: "escalera", t: "Escalera", i: ListTree }, { k: "variables", t: "Variables", i: Gauge }, { k: "tendencia", t: "Tendencia", i: TrendingUp }, { k: "registro", t: "Registro", i: ScrollText }];

function Conexion({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const s = useSim();
  const [url, setUrl] = useState(s.ajustes.url);
  const [clave, setClave] = useState(s.ajustes.clave);
  const [auto, setAuto] = useState(s.ajustes.autoArranque);
  const enviar = (e: FormEvent) => { e.preventDefault(); s.guardarAjustes({ url, clave, autoArranque: auto }); void s.conectar(); onCerrar(); };
  return (
    <AnimatePresence>
      {abierto && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <motion.div className="absolute inset-0 bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCerrar} />
          <motion.form onSubmit={enviar} role="dialog" aria-label="Conectar con SIMA" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="relative w-full max-w-[480px] border-t-[3px] border-rojo bg-panel p-6">
            <h2 className="display text-[28px] font-bold leading-none">Conectar con SIMA</h2>
            <p className="mb-4 mt-1 text-tenue">Opcional. El simulador funciona solo, con la planta incluida. Si se conecta, usa los PLC y programas de la base de datos de SIMA y le envía las lecturas para verlas en la web y en la app de terreno.</p>
            <label className="mb-3 block text-[12px] text-tenue">Dirección de la API<input value={url} onChange={(e) => setUrl(e.target.value)} className="mono mt-1 h-10 w-full border border-borde bg-panel2 px-3 text-[14px] text-texto outline-none focus:border-rojo-vivo" /></label>
            <label className="mb-3 block text-[12px] text-tenue">Clave de ingesta<input value={clave} onChange={(e) => setClave(e.target.value)} type="password" className="mono mt-1 h-10 w-full border border-borde bg-panel2 px-3 text-[14px] text-texto outline-none focus:border-rojo-vivo" /></label>
            <label className="mb-5 flex items-center gap-2 text-[13px]"><input type="checkbox" className="size-4 accent-[#d91f26]" checked={auto} onChange={(e) => setAuto(e.target.checked)} />Arrancar los equipos al cargar el PLC</label>
            {s.enlace === "error" && <p role="alert" className="mb-4 border-l-[3px] border-rojo bg-[#3a1416] px-3 py-2 text-[13px] text-rojo-vivo">{s.mensajeEnlace}</p>}
            <div className="flex flex-wrap justify-end gap-2">{s.conSima && <button type="button" onClick={() => { void s.desconectar(); onCerrar(); }} className="mr-auto h-10 cursor-pointer border border-borde px-4 hover:border-tenue">Volver al modo autónomo</button>}<button type="button" onClick={onCerrar} className="h-10 cursor-pointer border border-borde px-4 hover:border-tenue">Cancelar</button><button type="submit" className="h-10 cursor-pointer bg-rojo px-5 font-semibold text-white hover:bg-[#b8181e]">Conectar</button></div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
}

export function App() {
  const s = useSim();
  const [tab, setTab] = useState<Pestana>("escalera");
  const [dialogo, setDialogo] = useState(false);
  useEffect(() => { void sim.iniciar(); return () => sim.destruir(); }, []);
  const enlace = s.conSima ? { sin_conectar: ["Sin conectar", "bg-tenue"], conectando: ["Conectando con SIMA…", "bg-led-ambar animate-parpadeo"], conectado: ["Conectado a SIMA", "bg-led-verde animate-latido"], error: ["SIMA no responde", "bg-rojo-vivo"] }[s.enlace] : s.enlace === "conectando" ? ["Conectando con SIMA…", "bg-led-ambar animate-parpadeo"] : ["Modo autónomo", "bg-led-azul"];

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-borde bg-panel px-4 py-2.5">
        <div className="flex items-center gap-2.5"><span className="grid size-8 place-items-center bg-rojo display text-[22px] font-bold leading-none">S</span><div><p className="display text-[20px] font-bold leading-none">Simulador de PLC</p><p className="text-[11px] text-tenue">SIMA · Manufacturas Andina</p></div></div>
        {s.lista.length > 0 && (
          <label className="flex items-center gap-2 text-[12px] text-tenue">Controlador
            <select value={s.config?.plc.codigo ?? ""} onChange={(e) => void s.cargarPlc(e.target.value)} className="h-8 border border-borde bg-panel2 px-2 text-[13px] text-texto outline-none focus:border-rojo-vivo">
              {s.lista.map((p) => <option key={p.codigo} value={p.codigo}>{p.codigo} · {p.nombre}</option>)}
            </select>
          </label>
        )}
        {s.config && <p className="hidden text-[12px] text-tenue lg:block">{s.config.plc.fabricante} {s.config.plc.modelo}</p>}
        <div className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2">
          {s.config && <>
            <span className="text-[12px] text-tenue">Ciclo <b className="mono text-texto">{s.motor?.ciclos.toLocaleString("es-CL")}</b></span>
            <span className="text-[12px] text-tenue">Scan <b className="mono text-texto">{s.tiempoCicloMs.toFixed(1)} ms</b></span>
            <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-tenue" title="Cada tanto una máquina empieza a fallar, para practicar el diagnóstico"><input type="checkbox" className="size-3.5 accent-[#d91f26]" checked={s.ajustes.aleatorias} onChange={(e) => s.guardarAjustes({ aleatorias: e.target.checked })} />Fallas aleatorias</label>
            <label className="flex items-center gap-1.5 text-[12px] text-tenue">Velocidad
              <select value={s.ajustes.velocidad} onChange={(e) => s.guardarAjustes({ velocidad: Number(e.target.value) })} className="h-7 border border-borde bg-panel2 px-1.5 text-[12px] text-texto outline-none">{[1, 2, 5, 10].map((v) => <option key={v} value={v}>{v}×</option>)}</select>
            </label>
          </>}
          <span className="flex items-center gap-2 text-[12px]"><span className={cx("size-2.5 rounded-full", enlace[1])} />{enlace[0]}</span>
          <button onClick={() => setDialogo(true)} className="flex h-8 cursor-pointer items-center gap-1.5 border border-borde px-3 text-[12px] hover:border-tenue"><Settings className="size-3.5" />{s.conSima ? "Conexión" : "Conectar con SIMA"}</button>
        </div>
      </header>

      {!s.config ? (
        <main className="grid flex-1 place-items-center p-8 text-center">
          <div className="max-w-[460px]">
            <Cable className="mx-auto size-10 text-tenue" strokeWidth={1.5} />
            <h1 className="display mt-3 text-[34px] font-bold leading-none">Preparando la planta…</h1>
            <p className="mt-2 text-tenue">Cargando los controladores, sus módulos y sus programas.</p>
            {s.enlace === "error" && <p role="alert" className="mt-4 border-l-[3px] border-rojo bg-[#3a1416] px-3 py-2 text-left text-[13px] text-rojo-vivo">{s.mensajeEnlace}</p>}
            <button onClick={() => setDialogo(true)} className="mt-5 h-10 cursor-pointer bg-rojo px-5 font-semibold text-white hover:bg-[#b8181e]">Conectar con SIMA</button>
          </div>
        </main>
      ) : (
        <main className="grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-3 p-3">
          <Rack />
          <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <section className="min-h-0 overflow-auto" aria-label="Planta simulada"><Planta /></section>
            <section className="flex min-h-0 flex-col border border-borde bg-panel" aria-label="Herramientas del PLC">
              <div role="tablist" className="flex border-b border-borde">
                {PESTANAS.map(({ k, t, i: Icono }) => (
                  <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx("relative flex h-10 cursor-pointer items-center gap-2 px-4 text-[13px] font-medium transition-colors", tab === k ? "text-texto" : "text-tenue hover:text-texto")}>
                    <Icono className="size-4" />{t}
                    {tab === k && <motion.span layoutId="pestana" className="absolute inset-x-0 -bottom-px h-[3px] bg-rojo" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                  </button>
                ))}
              </div>
              <div className="min-h-0 flex-1">{tab === "escalera" ? <Escalera /> : tab === "variables" ? <Variables /> : tab === "tendencia" ? <Tendencia /> : <Registro />}</div>
            </section>
          </div>
        </main>
      )}
      <Conexion abierto={dialogo} onCerrar={() => setDialogo(false)} />
    </div>
  );
}
