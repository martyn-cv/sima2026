import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity, AlertOctagon, Box, CircleDot, Cloud, CloudOff, Cog, Cpu, Database, Droplets, FlaskConical, Gauge, Lightbulb, Pause, Play, RotateCcw, Search, Settings2, Square, Wrench, Zap, Factory, Waves, Hash,
} from "lucide-react";
import { Chispa } from "@sima/ui";
import { LISTA_ESCENARIOS, type TipoComp } from "./escenarios";
import { lab, useLab } from "./motor";
import { Escena } from "./Escenas";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const ICONO: Record<TipoComp, typeof Cpu> = { plc: Cpu, maquina: Factory, sensor: CircleDot, motor: Cog, cinta: Waves, valvula: Droplets, bomba: Gauge, actuador: Wrench, deposito: Database, contador: Hash, baliza: Lightbulb };
const CATEGORIA: Record<TipoComp, string> = { plc: "PLC", maquina: "Máquinas", sensor: "Sensores", motor: "Motores", cinta: "Cintas", valvula: "Válvulas", bomba: "Bombas", actuador: "Actuadores", deposito: "Depósitos", contador: "Contadores", baliza: "Señalización" };
const NIVEL: Record<string, string> = { alarma: "#fb7185", aviso: "#fbbf24", info: "#60a5fa", ok: "#34d399" };
const VELOCIDADES = [0.25, 0.5, 1, 2, 4];
const reloj = (t: number) => { const s = Math.floor(t); return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };

// ------------------------------------------------------------------------------------------------ barra de simulación
function BotonSim({ titulo, icono: I, onClick, activo, deshabilitado, tono = "base" }: { titulo: string; icono: typeof Play; onClick: () => void; activo?: boolean; deshabilitado?: boolean; tono?: "base" | "verde" | "ambar" | "rojo" }) {
  const color = { base: "#7f8bb0", verde: "#34d399", ambar: "#fbbf24", rojo: "#fb7185" }[tono];
  return (
    <motion.button whileTap={{ scale: 0.92 }} disabled={deshabilitado} onClick={onClick} title={titulo} aria-label={titulo}
      className={cx("relative grid h-10 min-w-10 cursor-pointer place-items-center rounded-xl border px-3 transition-colors disabled:cursor-not-allowed disabled:opacity-35", activo ? "border-transparent" : "border-borde hover:border-[#2c3c66]")}
      style={activo ? { background: `${color}22`, boxShadow: `0 0 0 1px ${color}, 0 0 18px -4px ${color}`, color } : { color: deshabilitado ? undefined : "#cdd6f4" }}>
      <I className="size-[18px]" fill={activo && (I === Play || I === Pause) ? "currentColor" : "none"} />
    </motion.button>
  );
}

function Sincronia() {
  const s = useLab();
  const [abierto, setAbierto] = useState(false);
  const [url, setUrl] = useState(s.cfg.url);
  const [clave, setClave] = useState(s.cfg.clave);
  const info = s.cfg.modo === "local" ? { t: "Simulación local", c: "#7f8bb0", i: CloudOff } : { conectando: { t: "Conectando con SIMA…", c: "#fbbf24", i: Cloud }, conectado: { t: "Sincronizado con SIMA", c: "#34d399", i: Cloud }, sin_conexion: { t: "SIMA no responde · local", c: "#fbbf24", i: CloudOff }, rechazado: { t: "SIMA rechazó la clave", c: "#fb7185", i: CloudOff }, local: { t: "Local", c: "#7f8bb0", i: CloudOff } }[s.conexion];
  const enviar = (e: FormEvent) => { e.preventDefault(); s.setModo("sincronizado", url, clave); setAbierto(false); };
  return (
    <div className="relative">
      <button onClick={() => setAbierto(!abierto)} className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-borde px-3 text-[13px] hover:border-[#2c3c66]">
        <info.i className="size-4" style={{ color: info.c }} /><span>{info.t}</span>
        {s.cfg.modo === "sincronizado" && s.pendientes > 0 && <span className="num rounded-full bg-[#fbbf2422] px-2 text-[11.5px] text-[#fbbf24]">{s.pendientes} en cola</span>}
        {s.cfg.modo === "sincronizado" && s.conexion === "conectado" && <span className="size-2 animate-latido rounded-full bg-led-verde" />}
      </button>
      <AnimatePresence>
        {abierto && (
          <motion.form onSubmit={enviar} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 top-12 z-40 w-[380px] rounded-2xl border border-borde bg-panel p-4 shadow-2xl">
            <p className="display text-[17px] font-bold">Modo de simulación</p>
            <p className="mb-3 text-[12.5px] text-tenue">En local, el laboratorio funciona sin red. Sincronizado, envía telemetría y eventos a SIMA (marcados como simulados) y recibe órdenes de la web y de SIMA Desktop. Nunca controla maquinaria real.</p>
            <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-panel2 p-1">
              <button type="button" onClick={() => { s.setModo("local"); setAbierto(false); }} className={cx("h-8 cursor-pointer rounded-lg text-[12.5px] font-medium", s.cfg.modo === "local" ? "bg-[#22d3ee22] text-[#22d3ee]" : "text-tenue")}>Local</button>
              <button type="submit" className={cx("h-8 cursor-pointer rounded-lg text-[12.5px] font-medium", s.cfg.modo === "sincronizado" ? "bg-[#22d3ee22] text-[#22d3ee]" : "text-tenue")}>Sincronizado</button>
            </div>
            <label className="mb-2 block text-[11.5px] text-tenue">Servidor de SIMA<input value={url} onChange={(e) => setUrl(e.target.value)} className="mono mt-1 h-9 w-full rounded-lg border border-borde bg-panel2 px-3 text-[13px] text-texto outline-none focus:border-[#22d3ee]" /></label>
            <label className="mb-3 block text-[11.5px] text-tenue">Clave del simulador (dispositivo)<input type="password" value={clave} onChange={(e) => setClave(e.target.value)} className="mono mt-1 h-9 w-full rounded-lg border border-borde bg-panel2 px-3 text-[13px] text-texto outline-none focus:border-[#22d3ee]" /></label>
            {s.mensajeConexion && <p className="mb-3 rounded-lg bg-[#fb718522] px-3 py-2 text-[12px] text-rojo-vivo">{s.mensajeConexion}</p>}
            <button type="submit" className="h-9 w-full cursor-pointer rounded-lg bg-gradient-to-r from-[#22d3ee] to-[#8b5cf6] text-[13px] font-semibold text-[#031018]">Conectar y sincronizar</button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ panel HMI (señales simuladas al PLC virtual)
function Pulsador({ texto, color, onClick, hongo }: { texto: string; color: string; onClick: () => void; hongo?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <motion.button whileTap={{ scale: 0.88, y: 2 }} onClick={onClick} aria-label={texto} className={cx("grid cursor-pointer place-items-center rounded-full border-[3px] border-[#0b0f1c]", hongo ? "size-14" : "size-11")}
        style={{ background: `radial-gradient(circle at 35% 30%, ${color}, ${color}aa 55%, #000 120%)`, boxShadow: `0 4px 0 #000a, 0 0 18px -4px ${color}` }} />
      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-tenue">{texto}</span>
    </div>
  );
}

function PanelHmi() {
  const s = useLab();
  const m = s.e as unknown as { mantencion?: boolean };
  return (
    <div className="absolute bottom-3 left-3 flex items-end gap-4 rounded-2xl border border-borde bg-[#070b16ee] px-4 py-3 backdrop-blur">
      <div className="mr-1"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#22d3ee]">Panel HMI</p><p className="max-w-[120px] text-[10.5px] leading-tight text-tenue">Señales simuladas al PLC virtual</p></div>
      <Pulsador texto="Marcha" color="#22c55e" onClick={() => s.boton("marcha")} />
      <Pulsador texto="Paro" color="#ef4444" onClick={() => s.boton("paro")} />
      <Pulsador texto="Emergencia" color="#dc2626" hongo onClick={() => s.boton("emergencia")} />
      {m.mantencion !== undefined && <button onClick={() => s.alternarMantencion()} className={cx("h-9 cursor-pointer rounded-lg border px-3 text-[12px] font-medium", m.mantencion ? "border-[#8b5cf6] bg-[#8b5cf622] text-[#c4b5fd]" : "border-borde text-tenue")}>Mantención</button>}
      {(s.e.falla || s.fallas.size > 0) && <button onClick={() => s.reparar()} className="h-9 cursor-pointer rounded-lg border border-[#34d399] bg-[#34d39922] px-3 text-[12px] font-semibold text-[#34d399]">Reparar</button>}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ inspector
function Inspector() {
  const s = useLab();
  const comp = s.escenario.componentes.find((c) => c.id === s.seleccion) ?? s.escenario.componentes[0];
  const io = s.escenario.io(s.e);
  const senales = s.escenario.senales.filter((x) => comp.id === "plc" ? true : x.componente === comp.id);
  const I = ICONO[comp.tipo];
  const fallas = s.escenario.fallas.filter((f) => s.fallas.has(f.id) && (comp.id === "plc" || f.componente === comp.id));
  const estadoEq = s.escenario.estadoEquipo(s.e);
  return (
    <div className="flex min-h-0 flex-col">
      <div className="border-b border-borde p-4">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#22d3ee1a] text-[#22d3ee]"><I className="size-5" /></span>
          <div className="min-w-0"><p className="truncate font-semibold">{comp.nombre}</p><p className="mono text-[11px] text-tenue">id: {s.escenario.plc}.{comp.id}</p></div></div>
        <p className="mt-2 text-[12.5px] text-tenue">{comp.descripcion}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
          <div className="rounded-lg bg-panel2 px-2.5 py-1.5"><p className="text-tenue">Estado</p><p className="font-semibold" style={{ color: estadoEq === "alarma" ? "#fb7185" : estadoEq === "operando" ? "#34d399" : "#7f8bb0" }}>{comp.id === "plc" ? (s.fallas.has("cpu") ? "ERROR" : s.estado === "corriendo" ? "RUN" : "STOP") : estadoEq}</p></div>
          <div className="rounded-lg bg-panel2 px-2.5 py-1.5"><p className="text-tenue">Comunicación</p><p className="font-semibold" style={{ color: s.conexion === "conectado" ? "#34d399" : "#7f8bb0" }}>{s.cfg.modo === "local" ? "local" : s.conexion === "conectado" ? "con SIMA" : "sin enlace"}</p></div>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {senales.some((x) => x.tipo !== "AI") && (
          <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[.1em] text-tenue">Entradas y salidas digitales</p>
            <ul className="grid gap-1">
              {senales.filter((x) => x.tipo !== "AI").map((x) => { const on = (io[x.tag] ?? 0) > 0; return (
                <li key={x.tag} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-panel2">
                  <span className={cx("grid h-5 w-8 place-items-center rounded text-[9.5px] font-bold", x.tipo === "DI" ? "bg-[#34d3991a] text-[#34d399]" : "bg-[#fbbf241a] text-[#fbbf24]")}>{x.tipo}</span>
                  <span className="min-w-0 flex-1"><span className="mono block truncate text-[11.5px]">{x.tag}</span><span className="block truncate text-[11px] text-tenue">{x.descripcion}</span></span>
                  <span className={cx("led", x.tipo === "DI" ? "verde" : x.tag.includes("ROJA") ? "rojo" : "ambar", on && "on")} />
                </li>); })}
            </ul>
          </div>
        )}
        {senales.some((x) => x.tipo === "AI") && (
          <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[.1em] text-tenue">Variables analógicas</p>
            <ul className="grid gap-2.5">
              {senales.filter((x) => x.tipo === "AI").map((x) => (
                <li key={x.tag} className="rounded-xl border border-borde bg-panel2/60 p-2.5">
                  <div className="flex items-baseline justify-between"><span className="text-[12px]">{x.descripcion}</span><span className="mono text-[15px] font-semibold text-[#22d3ee]">{(io[x.tag] ?? 0).toFixed(1)} <span className="text-[11px] text-tenue">{x.unidad}</span></span></div>
                  {(s.historial[x.tag]?.length ?? 0) > 2 && <div className="mt-1.5"><Chispa valores={s.historial[x.tag]} color="#22d3ee" alto={30} /></div>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {(comp.id === "plc" || s.escenario.parametros.length > 0) && (
          <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[.1em] text-tenue">Parámetros de funcionamiento</p>
            {s.escenario.parametros.map((p) => (
              <label key={p.id} className="mb-3 block">
                <span className="flex justify-between text-[12px]"><span>{p.nombre}</span><span className="mono text-[#22d3ee]">{s.e.ajustes[p.id]} {p.unidad}</span></span>
                <input type="range" min={p.min} max={p.max} step={p.paso} value={s.e.ajustes[p.id]} onChange={(e) => s.setParametro(p.id, Number(e.target.value))} className="mt-1 w-full accent-[#22d3ee]" />
              </label>
            ))}
          </div>
        )}
        <div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[.1em] text-tenue">Alarmas activas</p>
          {s.e.falla || fallas.length ? (
            <ul className="grid gap-1.5">{s.e.falla && <li className="rounded-lg border border-[#fb718555] bg-[#fb71851a] px-3 py-2 text-[12.5px] text-[#fda4af]">{s.e.falla}</li>}{fallas.map((f) => <li key={f.id} className="rounded-lg border border-[#fbbf2444] bg-[#fbbf2412] px-3 py-2 text-[12px] text-[#fcd581]">Falla simulada: {f.nombre}</li>)}</ul>
          ) : <p className="text-[12.5px] text-tenue">Sin alarmas.</p>}
        </div>
        {s.mantencionSima.includes(s.escenario.equipo) && <p className="rounded-xl border border-[#8b5cf655] bg-[#8b5cf61a] p-3 text-[12px] text-[#c4b5fd]">En SIMA, {s.escenario.equipo} está en mantención (orden de trabajo con bloqueo). El simulador lo informa, pero no cambia por eso su estado físico.</p>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ consola
function Consola() {
  const s = useLab();
  const [nivel, setNivel] = useState<string>("");
  const [abierta, setAbierta] = useState(true);
  const lista = s.eventos.filter((e) => !nivel || e.nivel === nivel).slice(0, 200);
  return (
    <div className={cx("flex min-h-0 flex-col border-t border-borde bg-[#060a14] transition-[height] duration-300", abierta ? "h-[190px]" : "h-[38px]")}>
      <div className="flex h-[38px] shrink-0 items-center gap-2 px-3">
        <button onClick={() => setAbierta(!abierta)} className="flex cursor-pointer items-center gap-2 text-[12px] font-semibold uppercase tracking-[.1em] text-tenue hover:text-texto"><Activity className="size-3.5 text-[#22d3ee]" />Consola de eventos <span className="num normal-case tracking-normal text-tenue">· {s.eventos.length}</span></button>
        <div className="ml-auto flex gap-1">{["", "alarma", "aviso", "info", "ok"].map((n) => <button key={n} onClick={() => setNivel(n)} className={cx("h-6 cursor-pointer rounded-md px-2 text-[11px]", nivel === n ? "bg-panel2 text-texto" : "text-tenue hover:text-texto")}>{n || "todos"}</button>)}</div>
      </div>
      {abierta && (
        <div className="mono min-h-0 flex-1 overflow-y-auto px-3 pb-2 text-[11.5px]">
          <AnimatePresence initial={false}>
            {lista.map((e) => (
              <motion.div key={e.uid} initial={{ opacity: 0, backgroundColor: "rgba(34,211,238,.18)" }} animate={{ opacity: 1, backgroundColor: "rgba(0,0,0,0)" }} transition={{ duration: 0.7 }} className="grid grid-cols-[74px_70px_56px_1fr_auto] items-baseline gap-3 rounded px-1 py-[2px]">
                <span className="text-tenue">{new Date(e.ts).toLocaleTimeString("es-CL")}</span>
                <span className="text-[#475375]">T+{reloj(e.t)}</span>
                <span className="font-bold" style={{ color: NIVEL[e.nivel] }}>{e.nivel.toUpperCase()}</span>
                <span className="truncate font-sans text-[12px] text-texto">{e.mensaje}</span>
                <span className="text-[10px] text-tenue">{e.origen === "simulacion" ? (s.cfg.modo === "sincronizado" ? (e.enviado ? "✓ SIMA" : "en cola") : "local") : e.origen === "sima" ? "SIMA" : ""}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ explorador de componentes
function Explorador() {
  const s = useLab();
  const [buscar, setBuscar] = useState("");
  const grupos = useMemo(() => {
    const m = new Map<string, typeof s.escenario.componentes>();
    for (const c of s.escenario.componentes.filter((c) => !buscar || c.nombre.toLowerCase().includes(buscar.toLowerCase()))) { const k = CATEGORIA[c.tipo]; m.set(k, [...(m.get(k) ?? []), c]); }
    return [...m.entries()];
  }, [s.escenario, buscar]);
  return (
    <div className="flex min-h-0 flex-col">
      <div className="p-3"><label className="relative block"><Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-tenue" /><input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar componente" className="h-8 w-full rounded-lg border border-borde bg-panel2 pl-8 pr-2 text-[12.5px] outline-none focus:border-[#22d3ee]" /></label></div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {grupos.map(([g, comps]) => (
          <div key={g} className="mb-2">
            <p className="px-2 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[.12em] text-tenue">{g}</p>
            {comps.map((c) => { const I = ICONO[c.tipo]; const sel = s.seleccion === c.id; return (
              <button key={c.id} onClick={() => s.seleccionar(c.id)} className={cx("relative flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[12.5px]", sel ? "text-texto" : "text-tenue hover:bg-panel2 hover:text-texto")}>
                {sel && <motion.span layoutId="comp-sel" className="absolute inset-0 rounded-lg border border-[#22d3ee55] bg-[#22d3ee14]" transition={{ type: "spring", stiffness: 480, damping: 38 }} />}
                <I className={cx("relative size-4 shrink-0", sel && "text-[#22d3ee]")} /><span className="relative truncate">{c.nombre}</span>
              </button>); })}
          </div>
        ))}
        <div className="mt-3 border-t border-borde pt-3">
          <p className="mb-1.5 flex items-center gap-1.5 px-2 text-[10.5px] font-semibold uppercase tracking-[.12em] text-[#fb7185]"><AlertOctagon className="size-3.5" />Fallas simuladas</p>
          {s.escenario.fallas.map((f) => { const on = s.fallas.has(f.id); return (
            <button key={f.id} onClick={() => s.alternarFalla(f.id)} title={f.descripcion} className={cx("mb-1 flex w-full cursor-pointer items-center gap-2.5 rounded-lg border px-2 py-1.5 text-left text-[12px] transition-colors", on ? "border-[#fb718566] bg-[#fb71851a] text-[#fda4af]" : "border-transparent text-tenue hover:bg-panel2 hover:text-texto")}>
              <span className={cx("relative h-4 w-7 shrink-0 rounded-full transition-colors", on ? "bg-[#fb7185]" : "bg-[#24304f]")}><motion.span layout className="absolute top-0.5 size-3 rounded-full bg-white" style={{ left: on ? 14 : 2 }} /></span>
              <span className="truncate">{f.nombre}</span>
            </button>); })}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ pantalla
export function Laboratorio() {
  const s = useLab();
  useEffect(() => { lab.iniciarMotor(); return () => lab.detenerMotor(); }, []);
  const prod = s.historial.__produccion ?? [];
  const contador = useRef(0); contador.current = s.e.contador;
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* barra superior: escenarios y controles de simulación */}
      <div className="flex flex-wrap items-center gap-3 border-b border-borde bg-panel px-4 py-2.5">
        <div className="flex gap-1.5">
          {LISTA_ESCENARIOS.map((esc) => {
            const activo = esc.id === s.escenario.id;
            const I = esc.id === "cinta" ? Waves : esc.id === "llenado" ? Droplets : Factory;
            return (
              <button key={esc.id} onClick={() => s.setEscenario(esc.id)} title={esc.resumen} className={cx("relative flex h-11 cursor-pointer items-center gap-2.5 rounded-xl px-3 text-left", activo ? "text-texto" : "text-tenue hover:text-texto")}>
                {activo && <motion.span layoutId="esc-activo" className="absolute inset-0 rounded-xl border border-[#22d3ee55] bg-gradient-to-r from-[#22d3ee1f] to-[#8b5cf61f]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <I className={cx("relative size-5", activo && "text-[#22d3ee]")} />
                <span className="relative leading-tight"><span className="block text-[13px] font-semibold">{esc.nombre}</span><span className="mono block text-[10.5px] text-tenue">{esc.plc} · {esc.equipo}</span></span>
              </button>
            );
          })}
        </div>
        <div className="mx-1 h-8 w-px bg-borde" />
        <div className="flex items-center gap-1.5" role="toolbar" aria-label="Controles de simulación">
          <span className="mr-1 rounded-md border border-[#8b5cf655] bg-[#8b5cf61a] px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-[#c4b5fd]">SIM</span>
          <BotonSim titulo={s.estado === "pausada" ? "Reanudar" : "Iniciar simulación"} icono={Play} tono="verde" activo={s.estado === "corriendo"} onClick={() => s.iniciar()} />
          <BotonSim titulo="Pausar" icono={Pause} tono="ambar" activo={s.estado === "pausada"} deshabilitado={s.estado !== "corriendo"} onClick={() => s.pausar()} />
          <BotonSim titulo="Detener" icono={Square} tono="rojo" deshabilitado={s.estado === "detenida"} onClick={() => s.detener()} />
          <BotonSim titulo="Reiniciar escenario" icono={RotateCcw} onClick={() => s.reiniciar()} />
          <div className="ml-1 flex h-10 items-center gap-0.5 rounded-xl border border-borde p-1">
            {VELOCIDADES.map((v) => <button key={v} onClick={() => s.setVelocidad(v)} className={cx("h-8 cursor-pointer rounded-lg px-2 font-mono text-[11.5px]", s.cfg.velocidad === v ? "bg-[#22d3ee22] text-[#22d3ee]" : "text-tenue hover:text-texto")}>×{v}</button>)}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right"><p className="mono text-[17px] font-semibold leading-none">T+{reloj(s.e.t)}</p><p className="text-[10.5px] text-tenue">{s.estado === "corriendo" ? "simulando" : s.estado === "pausada" ? "en pausa" : "detenida"} · ×{s.cfg.velocidad}</p></div>
          <Sincronia />
        </div>
      </div>
      <div className="flex items-center gap-2 bg-[repeating-linear-gradient(135deg,#8b5cf614_0_10px,transparent_10px_20px)] px-4 py-1 text-[11px] text-[#c4b5fd]"><FlaskConical className="size-3.5" />Entorno de simulación · los mandos de esta ventana solo actúan sobre PLC virtuales y nunca sobre maquinaria real</div>

      <div className="grid min-h-0 flex-1 grid-cols-[230px_1fr_330px]">
        <aside className="flex min-h-0 flex-col border-r border-borde bg-panel/60"><p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-[.12em] text-tenue">Componentes</p><Explorador /></aside>
        <section className="flex min-h-0 flex-col">
          <div className="relative min-h-0 flex-1">
            <AnimatePresence mode="wait"><motion.div key={s.escenario.id} initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0 p-3"><div className="h-full overflow-hidden rounded-2xl border border-borde"><Escena /></div></motion.div></AnimatePresence>
            <PanelHmi />
            <div className="absolute right-6 top-6 flex gap-2">
              {[{ t: "Producción", v: String(s.e.contador), i: Box }, { t: "Rechazo", v: String(s.e.rechazo), i: Zap }, { t: "Equipo", v: s.escenario.estadoEquipo(s.e), i: Settings2 }].map((k) => (
                <div key={k.t} className="rounded-xl border border-borde bg-[#070b16dd] px-3 py-1.5 backdrop-blur"><p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-tenue"><k.i className="size-3" />{k.t}</p><p className="mono text-[15px] font-semibold">{k.v}</p></div>
              ))}
              {prod.length > 3 && <div className="w-[140px] rounded-xl border border-borde bg-[#070b16dd] px-2 py-1.5"><Chispa valores={prod} color="#8b5cf6" alto={34} /></div>}
            </div>
          </div>
          <Consola />
        </section>
        <aside className="flex min-h-0 flex-col border-l border-borde bg-panel/60"><Inspector /></aside>
      </div>
    </div>
  );
}
