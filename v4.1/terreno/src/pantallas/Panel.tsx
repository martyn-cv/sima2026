import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Activity, AlertTriangle, ArrowRight, Cpu, Factory, Wrench } from "lucide-react";
import type { EventoPlanta } from "@sima/cliente";
import { BarrasH, Chip, Chispa, CURVA, Cuenta, Dona, Esqueleto, GraficoArea, Kpi, Tarjeta, cx } from "@sima/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { usePlanta } from "../lib/planta";
import { ir } from "../ruta";

export interface Resumen {
  equipos: { total: number; operando: number; alarma: number; detenido: number; mantencion: number };
  plcs: { total: number; conectados: number; falla: number; desconectados: number; lista: { codigo: string; nombre: string; estado: string; origen: string }[] };
  alarmas: { abiertas: number; criticas: number; recientes: { id: number; nivel: string; mensaje: string; inicio: string; equipo: string; simulado: boolean }[] };
  ordenes: { abiertas: number; enCurso: number; mias: { id: number; codigo: string; titulo: string; prioridad: string; estado: string; equipo: string }[]; pendientes: { id: number; codigo: string; titulo: string; prioridad: string; estado: string; equipo: string; creada: string }[] };
  disponibilidad: { codigo: string; nombre: string; disponibilidad: number; oee: number; fallas: number }[];
  kpis: { clave: string; nombre: string; valor: number | null; meta: number; unidad: string; estado: string }[];
  alarmasPorHora: { hora: string; alarmas: number; avisos: number }[];
  intervenciones: { id: number; orden: string; equipo?: string | null; tecnicoNombre: string; fin: string; causa: string; accion: string; resultado: string }[];
  eventos: EventoPlanta[];
}

const PRIO: Record<string, string> = { critica: "var(--s-rojo)", alta: "var(--s-ambar)", media: "var(--s-azul)", baja: "var(--s-tenue)" };
const NIVEL: Record<string, string> = { alarma: "var(--s-rojo)", aviso: "var(--s-ambar)", info: "var(--s-azul)", ok: "var(--s-verde)" };
const hace = (iso: string) => { const m = Math.round((Date.now() - +new Date(iso)) / 60000); return m < 1 ? "recién" : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`; };

export function Panel() {
  const { usuario } = useAuth();
  const { equipos, plcEstado } = usePlanta();
  const [orden, setOrden] = useState<"disp" | "oee">("disp");
  const { data } = useQuery({ queryKey: ["resumen"], queryFn: () => api.get<Resumen>("/api/operacion/resumen"), refetchInterval: 15_000 });
  const vivos = useQuery<EventoPlanta[]>({ queryKey: ["eventos", "vivo"], queryFn: () => Promise.resolve([]), staleTime: Infinity });
  const eventos = useMemo(() => { const m = new Map<string, EventoPlanta>(); for (const e of [...(vivos.data ?? []), ...(data?.eventos ?? [])]) if (!m.has(e.uid)) m.set(e.uid, e); return [...m.values()].slice(0, 12); }, [vivos.data, data?.eventos]);

  if (!data) return <div className="grid gap-4"><Esqueleto className="h-24" /><div className="grid grid-cols-4 gap-4"><Esqueleto className="h-36" /><Esqueleto className="h-36" /><Esqueleto className="h-36" /><Esqueleto className="h-36" /></div><Esqueleto className="h-80" /></div>;
  const eq = { ...data.equipos, operando: equipos.length ? equipos.filter((e) => e.estado === "operando").length : data.equipos.operando, alarma: equipos.length ? equipos.filter((e) => e.estado === "alarma").length : data.equipos.alarma };
  const plcs = data.plcs.lista.map((p) => ({ ...p, estado: p.estado === "sin_conexion" ? "sin_conexion" : plcEstado[p.codigo] ?? p.estado }));
  const disp = [...data.disponibilidad].sort((a, b) => (orden === "disp" ? a.disponibilidad - b.disponibilidad : a.oee - b.oee)).slice(0, 8);
  const promedio = data.disponibilidad.length ? data.disponibilidad.reduce((s, x) => s + x.disponibilidad, 0) / data.disponibilidad.length : 0;
  const hora = new Date().getHours();

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-[13px] text-gris">{hora < 13 ? "Buenos días" : hora < 20 ? "Buenas tardes" : "Buenas noches"} · turno {usuario?.turno}</p><h1 className="display text-[34px] font-bold leading-tight">Panel operativo</h1></div>
        <div className="flex gap-2"><button onClick={() => ir("/reportar")} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-linea px-4 text-[14px] font-medium hover:border-rojo/50 hover:text-rojo"><AlertTriangle className="size-4" />Reportar falla</button><button onClick={() => ir("/mantenimiento")} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-acento to-cobre px-4 text-[14px] font-semibold text-sobre-negro shadow-[var(--s-brillo-violeta)]"><Wrench className="size-4" />Mis órdenes</button></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi titulo="Equipos operando" valor={eq.operando} sufijo={`/ ${eq.total}`} icono={<Factory className="size-4.5" />} tono="verde" detalle={<>{eq.detenido} detenidos · {eq.mantencion} en mantención</>} delay={0} />
        <Kpi titulo="PLC conectados" valor={plcs.filter((p) => p.estado === "run").length} sufijo={`/ ${data.plcs.total}`} icono={<Cpu className="size-4.5" />} tono="acento" detalle={<>{plcs.filter((p) => p.estado === "error").length} en falla · {plcs.filter((p) => p.estado === "sin_conexion").length} sin conexión</>} delay={0.05} />
        <Kpi titulo="Alarmas abiertas" valor={data.alarmas.abiertas} icono={<AlertTriangle className="size-4.5" />} tono={data.alarmas.criticas ? "rojo" : "ambar"} detalle={<>{data.alarmas.criticas} críticas</>} grafico={<Chispa valores={data.alarmasPorHora.map((h) => h.alarmas + h.avisos)} color="var(--s-rojo)" alto={30} />} delay={0.1} />
        <Kpi titulo="Órdenes pendientes" valor={data.ordenes.abiertas} icono={<Wrench className="size-4.5" />} tono="cobre" detalle={<>{data.ordenes.enCurso} en curso · {data.ordenes.mias.length} asignadas a usted</>} delay={0.15} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <Tarjeta className="p-5">
          <div className="mb-3 flex items-center justify-between"><div><p className="font-semibold">Alarmas y avisos · últimas 24 horas</p><p className="text-[12.5px] text-gris">Se actualiza solo con cada alarma nueva</p></div><div className="flex gap-3 text-[12px] text-gris"><span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-rojo" />alarmas</span><span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-ambar" />avisos</span></div></div>
          <GraficoArea alto={220} etiquetas={data.alarmasPorHora.map((h) => h.hora)} series={[{ nombre: "Alarmas", color: "var(--s-rojo)", valores: data.alarmasPorHora.map((h) => h.alarmas) }, { nombre: "Avisos", color: "var(--s-ambar)", valores: data.alarmasPorHora.map((h) => h.avisos) }]} />
        </Tarjeta>
        <Tarjeta className="flex flex-col p-5">
          <p className="mb-1 font-semibold">Estado de la planta</p>
          <div className="flex flex-1 items-center gap-5">
            <Dona tam={160} grosor={18} partes={[{ etiqueta: "Operando", valor: eq.operando, color: "var(--s-verde)" }, { etiqueta: "Alarma", valor: eq.alarma, color: "var(--s-rojo)" }, { etiqueta: "Mantención", valor: eq.mantencion, color: "var(--s-ambar)" }, { etiqueta: "Detenido", valor: Math.max(0, eq.total - eq.operando - eq.alarma - eq.mantencion), color: "var(--s-tenue)" }]}
              centro={<div><p className="display text-[30px] font-bold leading-none"><Cuenta valor={Math.round(promedio * 100)} />%</p><p className="text-[11px] text-gris">disponibilidad 7 d</p></div>} />
            <ul className="grid flex-1 gap-2">
              {plcs.map((p) => (
                <li key={p.codigo} className="flex items-center gap-2.5 rounded-xl border border-linea-suave px-3 py-2">
                  <span className={cx("size-2.5 rounded-full", p.estado === "run" ? "bg-verde animate-latido" : p.estado === "error" ? "bg-rojo animate-parpadeo" : p.estado === "stop" ? "bg-ambar" : "bg-gris")} />
                  <span className="num whitespace-nowrap text-[13px] font-semibold">{p.codigo}</span><span className="min-w-0 truncate text-[12px] text-gris">{p.nombre.replace(/^PLC /, "")}</span>
                  {p.origen !== "real" && <span className="ml-auto rounded border border-cobre/40 px-1 font-mono text-[10px] font-bold text-cobre">SIM</span>}
                </li>
              ))}
            </ul>
          </div>
        </Tarjeta>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Tarjeta className="p-5">
          <div className="mb-3 flex items-center justify-between"><p className="font-semibold">Mis actividades</p><button onClick={() => ir("/mantenimiento")} className="inline-flex cursor-pointer items-center gap-1 text-[13px] font-medium text-acento">Ver todas<ArrowRight className="size-3.5" /></button></div>
          {data.ordenes.mias.length === 0 && data.ordenes.pendientes.length === 0 ? <p className="py-8 text-center text-[13.5px] text-gris">No tiene órdenes asignadas.</p> : (
            <ul className="grid gap-2">
              {[...data.ordenes.mias, ...data.ordenes.pendientes.filter((p) => !data.ordenes.mias.some((m) => m.id === p.id))].slice(0, 6).map((o, i) => (
                <motion.li key={o.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <button onClick={() => ir(`/mantenimiento?orden=${o.id}`)} className="group relative flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-xl border border-linea-suave bg-papel-2/50 px-3.5 py-2.5 text-left hover:border-acento/40">
                    <span className="absolute inset-y-0 left-0 w-1" style={{ background: PRIO[o.prioridad] }} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium">{o.titulo}</span><span className="text-[12px] text-gris">{o.codigo} · {o.equipo} · {o.estado === "en_curso" ? "en curso" : "por tomar"}</span></span>
                    <ArrowRight className="size-4 text-gris transition-transform group-hover:translate-x-0.5" />
                  </button>
                </motion.li>
              ))}
            </ul>
          )}
        </Tarjeta>
        <Tarjeta className="p-5">
          <div className="mb-4 flex items-center justify-between"><p className="font-semibold">Disponibilidad por equipo · 7 días</p>
            <div className="flex rounded-lg bg-papel-2 p-0.5 text-[12px]">{([["disp", "Disp."], ["oee", "OEE"]] as const).map(([k, t]) => <button key={k} onClick={() => setOrden(k)} className={cx("cursor-pointer rounded-md px-2 py-0.5", orden === k ? "bg-papel font-semibold" : "text-gris")}>{t}</button>)}</div></div>
          <AnimatePresence mode="wait"><motion.div key={orden} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <BarrasH max={100} formato={(n) => `${n.toFixed(1)} %`} datos={disp.map((d) => { const v = (orden === "disp" ? d.disponibilidad : d.oee) * 100; return { etiqueta: `${d.codigo} · ${d.nombre}`, valor: v, color: v < 85 ? "var(--s-rojo)" : v < 92 ? "var(--s-ambar)" : "var(--s-acento)" }; })} />
          </motion.div></AnimatePresence>
        </Tarjeta>
        <Tarjeta className="flex flex-col p-5">
          <p className="mb-3 flex items-center gap-2 font-semibold"><Activity className="size-4 text-acento" />Lo último en planta</p>
          <ul className="-mx-1 min-h-0 flex-1 space-y-1 overflow-y-auto px-1" style={{ maxHeight: 300 }}>
            <AnimatePresence initial={false}>
              {eventos.map((e) => (
                <motion.li key={e.uid} layout initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, ease: CURVA }} className="flex gap-2.5 rounded-lg px-2 py-1.5 hover:bg-papel-2">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: NIVEL[e.nivel], boxShadow: `0 0 8px ${NIVEL[e.nivel]}` }} />
                  <span className="text-[12.5px] leading-snug">{e.simulado && <span className="mr-1 rounded border border-cobre/40 px-1 font-mono text-[9.5px] font-bold text-cobre">SIM</span>}{e.mensaje}<span className="block text-[11px] text-gris">{hace(e.ts)}</span></span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </Tarjeta>
      </div>

      <Tarjeta className="p-5">
        <p className="mb-3 font-semibold">Intervenciones recientes</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data.intervenciones.slice(0, 8).map((i, k) => (
            <motion.div key={i.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.04 }} className="rounded-2xl border border-linea-suave bg-papel-2/50 p-3.5">
              <div className="flex items-center justify-between gap-2"><span className="num text-[12px] text-gris">{i.orden} · {i.equipo}</span><Chip tono={i.resultado === "resuelto" ? "ok" : "aviso"} punto={false}>{i.resultado.replace("_", " ")}</Chip></div>
              <p className="mt-1 line-clamp-2 text-[13.5px] font-medium">{i.accion}</p><p className="mt-1 text-[12px] text-gris">{i.tecnicoNombre} · {hace(i.fin)}</p>
            </motion.div>
          ))}
        </div>
      </Tarjeta>
    </div>
  );
}
