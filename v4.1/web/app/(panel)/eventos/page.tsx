"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Pause, Play, Search } from "lucide-react";
import type { EventoPlanta } from "@sima/cliente";
import { api } from "@/lib/api";
import { MarcaSim } from "@/components/FichaEquipo";
import { Encabezado, Esqueleto, Tarjeta, cx } from "@/components/ui";

const NIVEL: Record<string, { color: string; texto: string }> = { alarma: { color: "var(--s-rojo)", texto: "ALARMA" }, aviso: { color: "var(--s-ambar)", texto: "AVISO" }, ok: { color: "var(--s-verde)", texto: "OK" }, info: { color: "var(--s-azul)", texto: "INFO" } };
const ORIGEN: Record<string, string> = { simulador: "Simulador", gateway: "PLC real", web: "Web", desktop: "Desktop", sistema: "Sistema", interno: "Sim. interna" };

export default function Eventos() {
  const [pausa, setPausa] = useState(false);
  const [nivel, setNivel] = useState("");
  const [origen, setOrigen] = useState("");
  const [buscar, setBuscar] = useState("");
  const historico = useQuery({ queryKey: ["eventos", "historico"], queryFn: () => api.get<EventoPlanta[]>("/api/eventos?limite=300"), refetchInterval: pausa ? false : 20_000 });
  const vivos = useQuery<EventoPlanta[]>({ queryKey: ["eventos", "vivo"], queryFn: () => Promise.resolve([]), staleTime: Infinity });
  const [congelado, setCongelado] = useState<EventoPlanta[] | null>(null);

  const todos = useMemo(() => {
    const m = new Map<string, EventoPlanta>();
    for (const e of [...(vivos.data ?? []), ...(historico.data ?? [])]) if (!m.has(e.uid)) m.set(e.uid, e);
    return [...m.values()].sort((a, b) => +new Date(b.ts) - +new Date(a.ts));
  }, [vivos.data, historico.data]);
  const lista = (pausa ? congelado ?? todos : todos).filter((e) => (!nivel || e.nivel === nivel) && (!origen || (origen === "sim" ? e.simulado : !e.simulado)) && (!buscar || `${e.mensaje} ${e.equipo ?? ""} ${e.plc ?? ""} ${e.tipo}`.toLowerCase().includes(buscar.toLowerCase())));
  const cuenta = (n: string) => todos.filter((e) => e.nivel === n).length;

  return (
    <>
      <Encabezado titulo="Eventos de planta" descripcion="Todo lo que ocurre en la planta, del simulador, de SIMA Desktop o de la web, en orden y con su origen. Los eventos simulados llevan la marca SIM." />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Object.entries(NIVEL).map(([k, v]) => (
          <button key={k} onClick={() => setNivel(nivel === k ? "" : k)} className={cx("tarjeta flex cursor-pointer items-center gap-3 p-4 text-left transition-colors", nivel === k && "ring-1")} style={nivel === k ? { borderColor: v.color, boxShadow: `0 0 20px -6px ${v.color}` } : undefined}>
            <span className="size-3 rounded-full" style={{ background: v.color, boxShadow: `0 0 10px ${v.color}` }} /><span><span className="display block text-[24px] font-bold leading-none">{cuenta(k)}</span><span className="text-[12px] text-gris">{v.texto.toLowerCase()}</span></span>
          </button>
        ))}
      </div>
      <Tarjeta brillo={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-linea-suave p-3">
          <label className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gris" /><input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Filtrar por equipo, PLC o mensaje" className="h-9 w-full rounded-xl border border-linea bg-papel-2 pl-9 pr-3 text-[13.5px] outline-none focus:border-acento" /></label>
          {[["", "Todos"], ["sim", "Simulados"], ["real", "Reales y de usuarios"]].map(([k, t]) => <button key={k} onClick={() => setOrigen(k)} className={cx("h-9 cursor-pointer rounded-xl px-3 text-[13px] font-medium", origen === k ? "bg-acento text-white" : "bg-papel-2 hover:bg-linea-suave")}>{t}</button>)}
          <button onClick={() => { setPausa(!pausa); setCongelado(pausa ? null : todos); }} className={cx("inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium", pausa ? "bg-ambar-claro text-ambar" : "bg-papel-2 hover:bg-linea-suave")}>{pausa ? <Play className="size-4" /> : <Pause className="size-4" />}{pausa ? "Reanudar" : "Pausar"}</button>
        </div>
        {historico.isLoading ? <div className="p-4"><Esqueleto className="h-72" /></div> : (
          <div className="max-h-[calc(100dvh-330px)] overflow-y-auto bg-[color-mix(in_srgb,var(--s-fondo)_60%,transparent)] font-mono text-[12.5px]">
            {lista.length === 0 && <p className="p-10 text-center font-sans text-[14px] text-gris">No hay eventos con esos filtros.</p>}
            <AnimatePresence initial={false}>
              {lista.map((e) => (
                <motion.div key={e.uid} layout="position" initial={{ opacity: 0, backgroundColor: "rgba(34,211,238,.15)" }} animate={{ opacity: 1, backgroundColor: "rgba(0,0,0,0)" }} transition={{ duration: 0.8 }}
                  className="grid grid-cols-[86px_64px_92px_1fr] items-baseline gap-3 border-b border-linea-suave/60 px-4 py-1.5 hover:bg-papel-2/60 md:grid-cols-[150px_70px_100px_110px_1fr]">
                  <span className="text-gris" suppressHydrationWarning>{new Date(e.ts).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                  <span className="font-bold" style={{ color: NIVEL[e.nivel]?.color }}>{NIVEL[e.nivel]?.texto ?? e.nivel}</span>
                  <span className="text-cian">{e.equipo ?? e.plc ?? "—"}</span>
                  <span className="hidden text-gris md:inline">{ORIGEN[e.origen] ?? e.origen}</span>
                  <span className="font-sans text-[13px]">{e.simulado && <MarcaSim className="mr-1.5 align-middle" />}{e.mensaje}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </Tarjeta>
    </>
  );
}
