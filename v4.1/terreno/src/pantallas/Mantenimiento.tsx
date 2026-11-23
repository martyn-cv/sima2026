import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, CheckCircle2, ClipboardList, FlaskConical, Lock, Minus, Plus, Search, ShieldCheck, Stethoscope, Undo2, Unlock, Wrench } from "lucide-react";
import type { FichaEquipo } from "@sima/cliente";
import { AreaTexto, Boton, Chip, CURVA, Esqueleto, Maquina, cx, mensajeDe, useAviso } from "@sima/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { enviar } from "../lib/offline";
import { usePlanta } from "../lib/planta";
import { ir, useParametro } from "../ruta";
import { ESPECIALIDAD_CARGO, tiene } from "../roles";
import { ESP } from "./bloques";

interface Orden { id: number; codigo: string; equipo: string; equipoNombre: string; titulo: string; descripcion: string; prioridad: string; estado: string; automatica: boolean; simulada?: boolean; especialidad: string; programada?: string | null; creada: string; cerrada?: string | null; asignado?: string | null; asignadoAId?: string | null }
interface DetalleOrden {
  id: number; codigo: string; titulo: string; descripcion: string; tipo: string; prioridad: string; estado: string; asignadoAId?: string | null; asignado?: string | null; creada: string; version: number;
  especialidad: string; programada?: string | null; automatica: boolean; simulada: boolean; cierreSolicitado?: string | null; verificadaPor?: string | null; verificadaEn?: string | null;
  equipo: { codigo: string; nombre: string; tipo: string; estado: string; area: string; linea: string }; intervenciones: { id: number; tecnicoNombre: string; accion: string; resultado: string; fin: string; diagnostico?: string }[]
}
type Filtro = "mias" | "abierta" | "en_curso" | "por_verificar" | "cerrada";
const FILTROS: [Filtro, string][] = [["mias", "Mías"], ["abierta", "Por tomar"], ["en_curso", "En curso"], ["por_verificar", "Por verificar"], ["cerrada", "Cerradas"]];
interface Herramienta { id: number; codigo: string; nombre: string; estado: string }
interface Repuesto { id: number; codigo: string; nombre: string; stock: number; stockMinimo: number; ubicacion: string }

const PRIO: Record<string, { c: string; tono: "peligro" | "aviso" | "info" | "neutro" }> = { critica: { c: "var(--s-rojo)", tono: "peligro" }, alta: { c: "var(--s-ambar)", tono: "aviso" }, media: { c: "var(--s-azul)", tono: "info" }, baja: { c: "var(--s-tenue)", tono: "neutro" } };
const CAUSAS = [["mecanica", "Mecánica"], ["electrica", "Eléctrica"], ["hidraulica", "Hidráulica"], ["neumatica", "Neumática"], ["electronica", "Electrónica"], ["operacional", "Operacional"], ["desgaste", "Desgaste"]] as const;
const LOTO = ["Avisé al operador y al supervisor del equipo", "Detuve el equipo con el procedimiento normal", "Abrí el seccionador y puse mi candado y tarjeta", "Liberé energías residuales y verifiqué que no arranca"];
const PASOS = [{ t: "Revisar", i: ClipboardList }, { t: "Bloqueo LOTO", i: Lock }, { t: "Diagnóstico", i: Stethoscope }, { t: "Intervención", i: Wrench }, { t: "Cierre", i: ShieldCheck }];
const hace = (iso: string) => { const m = Math.round((Date.now() - +new Date(iso)) / 60000); return m < 60 ? `hace ${Math.max(1, m)} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`; };

export function Mantenimiento() {
  const { usuario } = useAuth();
  const sel = useParametro("orden");
  const verifica = tiene(usuario, "ordenes.aprobar");
  const esp = ESPECIALIDAD_CARGO[usuario?.cargoId ?? 0];
  const [filtro, setFiltro] = useState<Filtro>(verifica ? "por_verificar" : "mias");
  const [buscar, setBuscar] = useState("");
  const { data: ordenes } = useQuery({ queryKey: ["ordenes"], queryFn: () => api.get<Orden[]>("/api/ordenes"), refetchInterval: 20_000 });
  const cumple = (o: Orden, f: Filtro) => (f === "mias" ? o.asignadoAId === usuario?.id && o.estado !== "cerrada" : o.estado === f);
  // a cada técnico le aparecen primero las órdenes de su especialidad
  const peso = (o: Orden) => (esp && !esp.includes(o.especialidad) ? 10 : 0) + ["critica", "alta", "media", "baja"].indexOf(o.prioridad);
  const lista = (ordenes ?? []).filter((o) => cumple(o, filtro) && (!buscar || `${o.codigo} ${o.titulo} ${o.equipo}`.toLowerCase().includes(buscar.toLowerCase()))).sort((a, b) => (filtro === "abierta" ? peso(a) - peso(b) : 0));
  const n = (f: Filtro) => (ordenes ?? []).filter((o) => cumple(o, f)).length;
  useEffect(() => { if (ordenes && filtro === "mias" && n("mias") === 0) setFiltro("abierta"); if (ordenes && filtro === "por_verificar" && n("por_verificar") === 0) setFiltro("abierta"); }, [ordenes]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="grid h-[calc(100dvh-56px-48px)] min-h-[560px] gap-5 lg:grid-cols-[360px_1fr]">
      <div className="flex min-h-0 flex-col">
        <h1 className="display mb-1 text-[30px] font-bold leading-tight">Centro de mantenimiento</h1>
        <p className="mb-4 text-[13px] text-gris">{verifica ? "Verifique los cierres técnicos y libere los equipos. También puede ejecutar órdenes asignadas a usted." : "Tome una orden, bloquee el equipo, diagnostique, intervenga y pida la verificación."}</p>
        <div className="mb-3 grid grid-cols-5 gap-1 rounded-xl bg-papel-2 p-1">
          {FILTROS.map(([k, t]) => (
            <button key={k} onClick={() => setFiltro(k)} className={cx("relative h-9 cursor-pointer rounded-lg text-[11.5px] font-medium leading-tight", filtro === k ? "text-negro" : "text-gris")}>
              {filtro === k && <motion.span layoutId="filtro-ot" className="absolute inset-0 rounded-lg bg-papel shadow" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}<span className="relative">{t} <span className={cx("num text-[11px]", k === "por_verificar" && verifica && n(k) > 0 ? "font-bold text-cobre" : "text-gris")}>{n(k)}</span></span>
            </button>
          ))}
        </div>
        <label className="relative mb-3 block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gris" /><input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar orden o equipo" className="h-9 w-full rounded-xl border border-linea bg-papel pl-9 pr-3 text-[13.5px] outline-none focus:border-acento" /></label>
        <ul className="-mx-1 min-h-0 flex-1 space-y-2 overflow-y-auto px-1 pb-2">
          {!ordenes && <Esqueleto className="h-64" />}
          {ordenes && lista.length === 0 && <li className="rounded-2xl border border-dashed border-linea p-8 text-center text-[13.5px] text-gris">No hay órdenes aquí.</li>}
          <AnimatePresence initial={false}>
            {lista.map((o) => (
              <motion.li key={o.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }}>
                <button onClick={() => ir(`/mantenimiento?orden=${o.id}`)} className={cx("relative w-full cursor-pointer overflow-hidden rounded-2xl border p-3.5 text-left transition-colors", String(o.id) === sel ? "border-acento bg-acento-claro" : "border-linea-suave bg-papel hover:border-linea")}>
                  <span className="absolute inset-y-0 left-0 w-1" style={{ background: PRIO[o.prioridad]?.c }} />
                  <div className="flex items-center justify-between gap-2"><span className="num text-[12px] text-gris">{o.codigo} · {o.equipo} · {ESP[o.especialidad] ?? o.especialidad}</span><span className="flex gap-1">{o.simulada && <Chip tono="info" punto={false}>simulada</Chip>}<Chip tono={PRIO[o.prioridad]?.tono} punto={false}>{o.prioridad}</Chip></span></div>
                  <p className="mt-1 text-[14px] font-medium leading-snug">{o.titulo}</p>
                  <p className="mt-1 text-[12px] text-gris">{o.estado === "en_curso" ? `en curso · ${o.asignado}` : o.estado === "por_verificar" ? `espera verificación · ${o.asignado}` : o.estado === "cerrada" ? `cerrada ${hace(o.cerrada ?? o.creada)}` : o.asignado ? `asignada a ${o.asignado}${o.programada ? ` · ${new Date(o.programada + "T12:00").toLocaleDateString("es-CL", { weekday: "short", day: "numeric" })}` : ""}` : `creada ${hace(o.creada)}`}{o.automatica && " · automática"}</p>
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
      <div className="min-h-0 overflow-y-auto rounded-3xl border border-linea-suave bg-papel/60">
        <AnimatePresence mode="wait">
          {sel ? <Flujo key={sel} id={Number(sel)} /> : (
            <motion.div key="vacio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid h-full place-items-center p-10 text-center">
              <div><span className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-acento-claro text-acento"><Wrench className="size-8" /></span><p className="display text-[22px] font-bold">Elija una orden</p><p className="mt-1 max-w-[42ch] text-[14px] text-gris">El flujo lo guía: revisar, bloquear con LOTO, diagnosticar, registrar la intervención con repuestos y herramientas, y cerrar.</p></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Flujo({ id }: { id: number }) {
  const { usuario } = useAuth();
  const { equipos, conexion } = usePlanta();
  const qc = useQueryClient();
  const aviso = useAviso();
  const { data: ot } = useQuery({ queryKey: ["orden", id], queryFn: () => api.get<DetalleOrden>(`/api/ordenes/${id}`) });
  const ficha = useQuery({ queryKey: ["equipo", ot?.equipo.codigo], queryFn: () => api.get<FichaEquipo>(`/api/equipos/${ot!.equipo.codigo}`), enabled: !!ot });
  const herramientas = useQuery({ queryKey: ["herramientas"], queryFn: () => api.get<Herramienta[]>("/api/herramientas") });
  const catalogo = useQuery({ queryKey: ["repuestos"], queryFn: () => api.get<Repuesto[]>("/api/repuestos") });
  const [paso, setPaso] = useState(0);
  const [loto, setLoto] = useState<boolean[]>(LOTO.map(() => false));
  const [causa, setCausa] = useState<string>("");
  const [diagnostico, setDiagnostico] = useState("");
  const [accion, setAccion] = useState("");
  const [herrSel, setHerrSel] = useState<number[]>([]);
  const [rep, setRep] = useState<Record<number, number>>({});
  const [buscarRep, setBuscarRep] = useState("");
  const [resultado, setResultado] = useState("resuelto");
  const [observaciones, setObservaciones] = useState("");
  const [cerrar, setCerrar] = useState(true);
  const [lotoFuera, setLotoFuera] = useState(false);
  const [listo, setListo] = useState<null | { encolado: boolean; cerrada: boolean }>(null);
  const [inicio] = useState(() => new Date().toISOString());
  const ejecuta = tiene(usuario, "ordenes.ejecutar");
  const mia = ot?.asignadoAId === usuario?.id;
  // una OT asignada la toma su técnico; la supervisión puede reasignarla en el plan
  const deOtro = !!ot?.asignadoAId && !mia && !tiene(usuario, "ordenes.asignar");

  useEffect(() => { if (ot) setPaso(ot.estado === "en_curso" && mia ? 2 : 0); }, [ot?.id, ot?.estado]); // eslint-disable-line react-hooks/exhaustive-deps
  const tomar = useMutation({
    mutationFn: () => api.post(`/api/ordenes/${id}/tomar`, { lotoConfirmado: true }),
    onSuccess: () => { aviso("Orden tomada. El equipo queda en mantención con su bloqueo."); void qc.invalidateQueries({ queryKey: ["orden", id] }); void qc.invalidateQueries({ queryKey: ["ordenes"] }); setPaso(2); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  const registrar = useMutation({
    mutationFn: () => enviar("POST", `/api/ordenes/${id}/intervenciones`, {
      inicio, fin: new Date().toISOString(), causa, diagnostico, accion, resultado, observaciones,
      repuestos: Object.entries(rep).filter(([, c]) => c > 0).map(([r, c]) => ({ repuestoId: Number(r), cantidad: c })), herramientas: herrSel, cerrar, lotoRetirado: lotoFuera,
    }),
    onSuccess: (r) => { setListo({ encolado: r.queued, cerrada: cerrar }); void qc.invalidateQueries({ queryKey: ["ordenes"] }); void qc.invalidateQueries({ queryKey: ["orden", id] }); void qc.invalidateQueries({ queryKey: ["resumen"] }); void qc.invalidateQueries({ queryKey: ["repuestos"] }); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  const todosRep = useMemo(() => {
    const sugeridos = new Set(ficha.data?.repuestos.map((r) => r.id));
    return [...(ficha.data?.repuestos ?? []), ...(catalogo.data ?? []).filter((r) => !sugeridos.has(r.id) && buscarRep && `${r.codigo} ${r.nombre}`.toLowerCase().includes(buscarRep.toLowerCase())).slice(0, 6)];
  }, [ficha.data, catalogo.data, buscarRep]);

  if (!ot) return <div className="p-6"><Esqueleto className="h-80" /></div>;
  if (listo) return <Confirmacion listo={listo} ot={ot.codigo} equipo={ot.equipo.codigo} />;
  const vivo = equipos.find((e) => e.codigo === ot.equipo.codigo);
  const cerrada = ot.estado === "cerrada" || ot.estado === "por_verificar";
  const puedeAvanzar = [true, loto.every(Boolean), !!causa && diagnostico.trim().length > 4, accion.trim().length > 4, !cerrar || lotoFuera][paso];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex min-h-full flex-col">
      <div className="flex items-center gap-4 border-b border-linea-suave p-5">
        <Maquina tipo={ot.equipo.tipo} estado={vivo?.estado ?? ot.equipo.estado} className="h-16 w-24 shrink-0" />
        <div className="min-w-0 flex-1"><p className="num text-[12.5px] text-gris">{ot.codigo} · {ot.tipo} · {ot.equipo.area} · {ot.equipo.linea}</p><h2 className="display truncate text-[22px] font-bold leading-tight">{ot.titulo}</h2><p className="text-[13px] text-gris">{ot.equipo.codigo} {ot.equipo.nombre} · {ot.asignado ? `asignada a ${ot.asignado}` : "sin asignar"}</p></div>
        <span className="flex flex-col items-end gap-1"><Chip tono={PRIO[ot.prioridad]?.tono}>{ot.prioridad}</Chip>{ot.simulada && <Chip tono="info" punto={false}><FlaskConical className="size-3" />nació de un PLC simulado</Chip>}</span>
      </div>

      {!cerrada && (
        <ol className="flex items-center gap-2 px-5 pt-5">
          {PASOS.map((p, i) => (
            <li key={p.t} className="flex flex-1 items-center gap-2">
              <motion.span animate={{ scale: i === paso ? 1.08 : 1 }} className={cx("grid size-9 shrink-0 place-items-center rounded-full border-2 transition-colors", i < paso ? "border-acento bg-acento text-sobre-negro" : i === paso ? "border-acento text-acento shadow-[var(--s-brillo-violeta)]" : "border-linea text-gris")}>{i < paso ? <Check className="size-4" /> : <p.i className="size-4" />}</motion.span>
              <span className={cx("hidden text-[12.5px] font-medium xl:inline", i === paso ? "text-negro" : "text-gris")}>{p.t}</span>
              {i < PASOS.length - 1 && <span className="relative h-0.5 flex-1 overflow-hidden rounded bg-linea"><motion.span className="absolute inset-y-0 left-0 bg-acento" initial={false} animate={{ width: i < paso ? "100%" : "0%" }} transition={{ duration: 0.35 }} /></span>}
            </li>
          ))}
        </ol>
      )}

      <div className="flex-1 p-5">
        <AnimatePresence mode="wait">
          <motion.div key={cerrada ? "c" : paso} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22, ease: CURVA }}>
            {cerrada && <Verificacion ot={ot} />}
            {!cerrada && paso === 0 && (
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="grid content-start gap-3">
                  <p className="text-[13px] font-semibold text-gris">Qué se informó</p>
                  <p className="whitespace-pre-wrap rounded-2xl bg-papel-2 p-4 text-[14px]">{ot.descripcion || "Sin descripción."}</p>
                  {vivo && <div className="grid grid-cols-2 gap-2">{vivo.sensores.map((s) => <div key={s.variable} className={cx("rounded-xl border px-3 py-2", s.nivel === "alarma" ? "border-rojo/50 bg-rojo-claro" : s.nivel === "aviso" ? "border-ambar/40 bg-ambar-claro" : "border-linea-suave")}><p className="truncate text-[11.5px] text-gris">{s.nombre}</p><p className="num text-[18px] font-bold">{s.ultimo?.toFixed(s.max > 50 ? 0 : 1) ?? "—"} <span className="text-[12px] font-normal text-gris">{s.unidad}</span></p></div>)}</div>}
                </div>
                <div className="grid content-start gap-2">
                  <p className="text-[13px] font-semibold text-gris">Procedimientos del equipo</p>
                  {ficha.data?.documentos.filter((d) => d.clase !== "ficha").map((d) => (
                    <details key={d.id} className="group rounded-2xl border border-linea-suave"><summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[14px] font-medium">{d.titulo}<ArrowRight className="size-4 text-gris transition-transform group-open:rotate-90" /></summary><ol className="seleccionable grid gap-1 border-t border-linea-suave px-4 py-3 text-[13px]">{d.contenido.split("\n").map((l, k) => <li key={k}>{l}</li>)}</ol></details>
                  ))}
                </div>
              </div>
            )}
            {!cerrada && paso === 1 && (
              <div className="mx-auto max-w-[620px]">
                <p className="display text-[20px] font-bold">Bloqueo y etiquetado</p>
                <p className="mb-4 text-[13.5px] text-gris">Confirme cada punto antes de intervenir. Al tomar la orden, el equipo queda «en mantención» para toda la planta y el simulador no puede cambiar su estado.</p>
                <ul className="grid gap-2">
                  {LOTO.map((t, i) => (
                    <motion.li key={t} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                      <button onClick={() => setLoto((l) => l.map((x, k) => (k === i ? !x : x)))} className={cx("flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-4 text-left transition-colors", loto[i] ? "border-acento/50 bg-acento-claro" : "border-linea-suave hover:border-linea")}>
                        <span className={cx("grid size-6 shrink-0 place-items-center rounded-lg border-2 transition-colors", loto[i] ? "border-acento bg-acento text-sobre-negro" : "border-linea")}><AnimatePresence>{loto[i] && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check className="size-4" /></motion.span>}</AnimatePresence></span>
                        <span className="text-[14px]">{t}</span>
                      </button>
                    </motion.li>
                  ))}
                </ul>
                {!ejecuta && <p className="mt-4 rounded-xl bg-ambar-claro p-3 text-[13.5px] text-ambar-hondo">Su cargo puede preparar órdenes, pero la ejecución la firma el técnico asignado.</p>}
                {ejecuta && deOtro && <p className="mt-4 rounded-xl bg-ambar-claro p-3 text-[13.5px] text-ambar-hondo">Esta orden está asignada a {ot.asignado}. Si debe tomarla usted, pida a su supervisor o a planificación que se la reasigne.</p>}
                <p className="mt-4 text-[12.5px] text-gris">Para iniciar necesita su habilitación de bloqueo y etiquetado (LOTO) vigente. El servidor la verifica.</p>
                {conexion !== "conectado" && <p className="mt-4 rounded-xl bg-ambar-claro p-3 text-[13.5px] text-ambar-hondo">Tomar una orden necesita conexión con el servidor (dos técnicos no pueden tomar la misma). Reintente al recuperar la red.</p>}
              </div>
            )}
            {!cerrada && paso === 2 && (
              <div className="grid gap-4">
                <div><p className="mb-2 text-[13px] font-semibold text-gris">Tipo de causa</p><div className="flex flex-wrap gap-2">{CAUSAS.map(([k, t]) => <button key={k} onClick={() => setCausa(k)} className={cx("h-9 cursor-pointer rounded-xl border px-3.5 text-[13.5px] font-medium transition-colors", causa === k ? "border-acento bg-acento text-sobre-negro" : "border-linea-suave hover:border-linea")}>{t}</button>)}</div></div>
                <div><p className="mb-2 text-[13px] font-semibold text-gris">Diagnóstico</p><AreaTexto value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} placeholder="Qué encontró: síntoma, medición y causa probable" className="min-h-28" /></div>
                {ficha.data && ficha.data.alarmas.length > 0 && <div><p className="mb-2 text-[13px] font-semibold text-gris">Fallas recientes del equipo</p><ul className="grid gap-1.5">{ficha.data.alarmas.slice(0, 4).map((a) => <li key={a.id} className="rounded-xl border border-linea-suave px-3 py-2 text-[13px]">{a.mensaje} <span className="text-gris">· {hace(a.inicio)}</span></li>)}</ul></div>}
              </div>
            )}
            {!cerrada && paso === 3 && (
              <div className="grid gap-5 xl:grid-cols-2">
                <div className="grid content-start gap-4">
                  <div><p className="mb-2 text-[13px] font-semibold text-gris">Acción realizada</p><AreaTexto value={accion} onChange={(e) => setAccion(e.target.value)} placeholder="Qué hizo: cambio, ajuste, limpieza, calibración…" className="min-h-28" /></div>
                  <div><p className="mb-2 text-[13px] font-semibold text-gris">Herramientas usadas</p>
                    <div className="flex flex-wrap gap-1.5">{(herramientas.data ?? []).slice(0, 18).map((h) => { const s = herrSel.includes(h.id); return <button key={h.id} onClick={() => setHerrSel((l) => (s ? l.filter((x) => x !== h.id) : [...l, h.id]))} className={cx("cursor-pointer rounded-lg border px-2.5 py-1 text-[12.5px] transition-colors", s ? "border-cobre bg-cobre/15 text-negro" : "border-linea-suave text-gris hover:border-linea")}>{h.nombre}</button>; })}</div></div>
                </div>
                <div>
                  <p className="mb-2 text-[13px] font-semibold text-gris">Repuestos consumidos</p>
                  <label className="relative mb-2 block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gris" /><input value={buscarRep} onChange={(e) => setBuscarRep(e.target.value)} placeholder="Buscar otro repuesto del pañol" className="h-9 w-full rounded-xl border border-linea bg-papel pl-9 pr-3 text-[13px] outline-none focus:border-acento" /></label>
                  <ul className="grid gap-1.5">
                    {todosRep.map((r) => {
                      const c = rep[r.id] ?? 0;
                      return (
                        <li key={r.id} className={cx("flex items-center gap-3 rounded-xl border px-3 py-2", c > 0 ? "border-acento/50 bg-acento-claro" : "border-linea-suave")}>
                          <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px]"><b className="num text-[12px]">{r.codigo}</b> {r.nombre}</span><span className={cx("text-[11.5px]", r.stock <= r.stockMinimo ? "text-rojo" : "text-gris")}>{r.stock} en stock · {r.ubicacion}</span></span>
                          <span className="flex items-center gap-1"><button onClick={() => setRep((m) => ({ ...m, [r.id]: Math.max(0, c - 1) }))} className="grid size-7 cursor-pointer place-items-center rounded-lg bg-papel-2 hover:bg-linea-suave"><Minus className="size-3.5" /></button><span className="num w-6 text-center font-semibold">{c}</span><button disabled={c >= r.stock} onClick={() => setRep((m) => ({ ...m, [r.id]: c + 1 }))} className="grid size-7 cursor-pointer place-items-center rounded-lg bg-papel-2 hover:bg-linea-suave disabled:opacity-40"><Plus className="size-3.5" /></button></span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
            {!cerrada && paso === 4 && (
              <div className="mx-auto grid max-w-[640px] gap-4">
                <div><p className="mb-2 text-[13px] font-semibold text-gris">Resultado</p><div className="grid grid-cols-3 gap-2">{[["resuelto", "Resuelto"], ["parcial", "Parcial"], ["requiere_repuesto", "Falta repuesto"]].map(([k, t]) => <button key={k} onClick={() => { setResultado(k); setCerrar(k === "resuelto"); }} className={cx("h-11 cursor-pointer rounded-xl border text-[13.5px] font-medium", resultado === k ? "border-acento bg-acento-claro" : "border-linea-suave hover:border-linea")}>{t}</button>)}</div></div>
                <AreaTexto value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Observaciones para el próximo turno (opcional)" />
                <div className="rounded-2xl border border-linea-suave p-4">
                  <label className="flex cursor-pointer items-center gap-3 text-[14px]"><input type="checkbox" checked={cerrar} onChange={(e) => setCerrar(e.target.checked)} className="size-4 accent-[var(--s-acento)]" />Terminé: pedir la verificación de cierre</label>
                  <p className="ml-7 mt-1 text-[12.5px] text-gris">El equipo sigue en mantención hasta que la supervisión verifique el trabajo y lo libere. Usted no se verifica a sí mismo.</p>
                  <AnimatePresence>{cerrar && <motion.label initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 flex cursor-pointer items-center gap-3 overflow-hidden rounded-xl bg-ambar-claro p-3 text-[14px] text-ambar-hondo"><input type="checkbox" checked={lotoFuera} onChange={(e) => setLotoFuera(e.target.checked)} className="size-4 accent-[var(--s-acento)]" /><Unlock className="size-4" />Retiré mi candado y tarjeta, y el área quedó despejada</motion.label>}</AnimatePresence>
                </div>
                <div className="rounded-2xl bg-papel-2 p-4 text-[13.5px]"><p className="mb-1 font-semibold">Resumen</p><p>Causa {CAUSAS.find((c) => c[0] === causa)?.[1].toLowerCase()} · {herrSel.length} herramientas · {Object.values(rep).reduce((a, b) => a + b, 0)} repuestos · {cerrar ? "se pide la verificación" : "la orden sigue en curso"}</p></div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {!cerrada && (
        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-linea-suave bg-papel/90 px-5 py-4 backdrop-blur">
          <Boton variante="texto" disabled={paso === 0 || (paso === 2 && ot.estado === "en_curso")} onClick={() => setPaso((p) => p - 1)}><ArrowLeft className="size-4" />Atrás</Boton>
          {paso === 1 ? <Boton variante="acento" disabled={!puedeAvanzar || !ejecuta || deOtro || conexion !== "conectado"} cargando={tomar.isPending} onClick={() => tomar.mutate()}><Lock className="size-4" />Confirmar bloqueo y tomar la orden</Boton>
            : paso === 4 ? <Boton variante="acento" disabled={!puedeAvanzar || !mia} cargando={registrar.isPending} onClick={() => registrar.mutate()}><CheckCircle2 className="size-4" />Registrar intervención</Boton>
              : <Boton variante="acento" disabled={!puedeAvanzar || (paso >= 2 && !mia) || (paso === 0 && ot.estado === "en_curso" && !mia)} onClick={() => setPaso((p) => (p === 0 && ot.estado === "en_curso" ? 2 : p + 1))}>Continuar<ArrowRight className="size-4" /></Boton>}
        </div>
      )}
    </motion.div>
  );
}

function Confirmacion({ listo, ot, equipo }: { listo: { encolado: boolean; cerrada: boolean }; ot: string; equipo: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid h-full min-h-[460px] place-items-center p-10 text-center">
      <div>
        <div className="relative mx-auto mb-6 grid size-28 place-items-center">
          {[0, 1, 2].map((i) => <motion.span key={i} className="absolute inset-0 rounded-full border-2 border-verde" initial={{ scale: 0.6, opacity: 0.8 }} animate={{ scale: 1.8, opacity: 0 }} transition={{ duration: 1.4, delay: i * 0.35, repeat: 1 }} />)}
          <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 220, damping: 14 }} className="grid size-24 place-items-center rounded-full bg-verde text-sobre-negro shadow-[0_0_40px_-6px_var(--s-verde)]">
            <svg viewBox="0 0 24 24" className="size-12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.25, duration: 0.45 }} /></svg>
          </motion.span>
        </div>
        <p className="display text-[26px] font-bold">{listo.encolado ? "Guardada en este equipo" : listo.cerrada ? "Intervención registrada · verificación pedida" : "Intervención registrada"}</p>
        <p className="mx-auto mt-2 max-w-[46ch] text-[14px] text-gris">{listo.encolado ? `No hay conexión: se enviará sola cuando vuelva la red, sin duplicarse. ${ot} queda pendiente de sincronizar.` : listo.cerrada ? `${equipo} sigue en mantención. La supervisión recibió el aviso: cuando verifique el trabajo, el equipo queda liberado y producción puede ponerlo en marcha.` : `${ot} sigue en curso con su bloqueo.`}</p>
        <div className="mt-6 flex justify-center gap-2"><Boton variante="contorno" onClick={() => ir(`/explorador?equipo=${equipo}`)}>Ver el equipo</Boton><Boton variante="acento" onClick={() => ir("/mantenimiento")}>Volver a las órdenes</Boton></div>
      </div>
    </motion.div>
  );
}

/** Orden terminada o cerrada: muestra lo hecho y, a quien corresponde, la verificación (aprobar y liberar, o rechazar). */
function Verificacion({ ot }: { ot: DetalleOrden }) {
  const { usuario } = useAuth();
  const qc = useQueryClient(); const aviso = useAviso();
  const [nota, setNota] = useState("");
  const puede = ot.estado === "por_verificar" && tiene(usuario, "ordenes.aprobar") && ot.asignadoAId !== usuario?.id;
  const decidir = useMutation({
    mutationFn: (aprobar: boolean) => api.post(`/api/ordenes/${ot.id}/verificar`, { aprobar, nota }),
    onSuccess: (_, aprobar) => { aviso(aprobar ? `${ot.codigo} verificada: ${ot.equipo.codigo} queda liberado para operación.` : `${ot.codigo} devuelta al técnico.`); setNota(""); for (const k of ["ordenes", "orden", "equipos", "resumen"]) void qc.invalidateQueries({ queryKey: [k] }); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  return (
    <div className="grid gap-4">
      {ot.estado === "cerrada"
        ? <p className="flex items-center gap-2 rounded-2xl bg-verde-claro p-4 text-[14px] text-verde"><BadgeCheck className="size-5" />Orden cerrada{ot.verificadaPor ? ` · verificada por ${ot.verificadaPor}${ot.verificadaEn ? ` ${hace(ot.verificadaEn)}` : ""}` : ""}.</p>
        : <p className="rounded-2xl border border-cobre/30 bg-cobre/10 p-4 text-[14px]"><b>Espera verificación de cierre.</b> {ot.asignado} terminó{ot.cierreSolicitado ? ` ${hace(ot.cierreSolicitado)}` : ""} y retiró su bloqueo. {ot.equipo.codigo} sigue en mantención hasta que alguien con esa facultad verifique el trabajo y lo libere.</p>}
      {ot.intervenciones.map((i) => <div key={i.id} className="rounded-2xl border border-linea-suave p-4"><p className="font-medium">{i.accion}</p>{i.diagnostico && <p className="text-[13px] text-gris">{i.diagnostico}</p>}<p className="text-[12.5px] text-gris">{i.tecnicoNombre} · {i.resultado.replace("_", " ")} · {hace(i.fin)}</p></div>)}
      {ot.descripcion && <p className="whitespace-pre-wrap rounded-2xl bg-papel-2 p-4 text-[13px] text-gris">{ot.descripcion}</p>}
      {puede && (
        <div className="rounded-2xl border border-acento/40 bg-acento-claro p-4">
          <p className="mb-2 font-semibold">Verificación de cierre</p>
          <p className="mb-3 text-[13px] text-gris">Revise que el trabajo quedó bien, que se retiraron los bloqueos y que el área está despejada. Al aprobar, {ot.equipo.codigo} queda <b>detenido y disponible</b>: la marcha la da operación o el PLC, no este botón.</p>
          <AreaTexto value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Observación (obligatoria si rechaza: qué falta)" className="min-h-20" />
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Boton variante="contorno" disabled={decidir.isPending || nota.trim().length < 4} onClick={() => decidir.mutate(false)}><Undo2 className="size-4" />Devolver al técnico</Boton>
            <Boton variante="acento" cargando={decidir.isPending} onClick={() => decidir.mutate(true)}><BadgeCheck className="size-4" />Aprobar y liberar el equipo</Boton>
          </div>
        </div>
      )}
      {ot.estado === "por_verificar" && !puede && ot.asignadoAId === usuario?.id && <p className="text-[13px] text-gris">La verificará la supervisión o la jefatura de mantenimiento. Recibirá un aviso con el resultado.</p>}
    </div>
  );
}
