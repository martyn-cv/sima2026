import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowRight, BadgeCheck, CalendarDays, CheckCircle2, Cpu, Gauge, HardHat, Minus, Package, Plus, ShieldAlert, Users, Wrench } from "lucide-react";
import type { Equipo, PlcResumen } from "@sima/cliente";
import { BarrasH, Chip, Dona, Esqueleto, Maquina, Medidor, cx, mensajeDe, useAviso } from "@sima/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { enviar } from "../lib/offline";
import { usePlanta } from "../lib/planta";
import { ir } from "../ruta";
import { ESPECIALIDAD_CARGO, tiene } from "../roles";

// ------------------------------------------------------------------------------------------------ tipos y utilidades
export interface Op { id: number; codigo: string; producto: string; lote: string; equipo: string; equipoNombre: string; linea: string; turno: string; cantidad: number; producidas: number; buenas: number; rechazo: number; avance: number; estado: string; inicio?: string | null }
export interface Ot { id: number; codigo: string; equipo: string; equipoNombre: string; equipoTipo: string; criticidad: string; titulo: string; prioridad: string; estado: string; automatica: boolean; simulada?: boolean; creada: string; asignado?: string | null; asignadoAId?: string | null; creadaPorId?: string | null; tipo: string; especialidad: string; programada?: string | null; version: number }
export interface Habilitacion { id: number; nombre: string; vence: string; dias: number; estado: string; trabajador?: string; trabajadorId?: string; cargo?: string }
export interface Herramienta { id: number; codigo: string; nombre: string; estado: string; requiereCalibracion: boolean; proxima?: string | null; dias?: number | null; calibracion: string }
export interface Repuesto { id: number; codigo: string; nombre: string; tipo: string; ubicacion: string; stock: number; stockMinimo: number; critico: boolean; bajoMinimo: boolean }
export interface Incidente { id: number; codigo: string; fecha: string; zona: string; equipo?: string | null; tipo: string; severidad: string; descripcion: string; estado: string; reportadoPor: string }

export const PRIO: Record<string, { c: string; tono: "peligro" | "aviso" | "info" | "neutro" }> = { critica: { c: "var(--s-rojo)", tono: "peligro" }, alta: { c: "var(--s-ambar)", tono: "aviso" }, media: { c: "var(--s-azul)", tono: "info" }, baja: { c: "var(--s-tenue)", tono: "neutro" } };
export const ESP: Record<string, string> = { mecanica: "Mecánica", electrica: "Eléctrica", electromecanica: "Electromecánica", instrumentacion: "Instrumentación", automatizacion: "Automatización", general: "General" };
export const TIPO_SST: Record<string, string> = { condicion_insegura: "Condición insegura", casi_accidente: "Casi accidente", incidente: "Incidente", accidente: "Accidente" };
export const hace = (iso: string) => { const m = Math.round((Date.now() - +new Date(iso)) / 60000); return m < 1 ? "recién" : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`; };
const ESTADO_EQ: Record<string, { t: string; c: string }> = { operando: { t: "Operando", c: "var(--s-verde)" }, alarma: { t: "Con alarma", c: "var(--s-rojo)" }, en_mantencion: { t: "En mantención", c: "var(--s-ambar)" }, detenido: { t: "Detenido", c: "var(--s-tenue)" } };

/** Contenedor de bloque con título, icono y enlace. */
export function Bloque({ titulo, icono, enlace, children, className, accion }: { titulo: string; icono?: ReactNode; enlace?: { t: string; r: string }; children: ReactNode; className?: string; accion?: ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className={cx("tarjeta flex min-w-0 flex-col p-5", className)}>
      <header className="mb-3 flex items-center gap-2">
        {icono && <span className="grid size-8 place-items-center rounded-lg bg-acento-claro text-acento">{icono}</span>}
        <p className="font-semibold">{titulo}</p>
        <span className="ml-auto flex items-center gap-2">{accion}{enlace && <button onClick={() => ir(enlace.r)} className="inline-flex cursor-pointer items-center gap-1 text-[12.5px] font-medium text-acento">{enlace.t}<ArrowRight className="size-3.5" /></button>}</span>
      </header>
      {children}
    </motion.section>
  );
}
function Vacio({ texto }: { texto: string }) { return <p className="my-auto rounded-xl border border-dashed border-linea p-6 text-center text-[13px] text-gris">{texto}</p>; }
export function Cifra({ valor, texto, tono, icono }: { valor: ReactNode; texto: string; tono?: "rojo" | "ambar" | "verde" | "acento"; icono?: ReactNode }) {
  const c = tono ? `var(--s-${tono === "acento" ? "acento" : tono})` : "var(--s-texto)";
  return (
    <div className="tarjeta flex items-center gap-3 p-4" style={tono ? { background: `radial-gradient(120% 120% at 0% 0%, color-mix(in srgb, ${c} 14%, transparent), transparent 60%), var(--s-superficie)` } : undefined}>
      {icono && <span className="grid size-10 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${c} 16%, transparent)`, color: c }}>{icono}</span>}
      <div><p className="display text-[26px] font-bold leading-none" style={{ color: tono ? c : undefined }}>{valor}</p><p className="mt-0.5 text-[12.5px] text-gris">{texto}</p></div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ consultas compartidas
export const useOts = () => useQuery({ queryKey: ["ordenes"], queryFn: () => api.get<Ot[]>("/api/ordenes"), refetchInterval: 20_000 });
export const useOps = (estado = "activas") => useQuery({ queryKey: ["produccion", "ordenes", estado], queryFn: () => api.get<Op[]>(`/api/produccion/ordenes?estado=${estado}`), refetchInterval: 10_000 });
export const useMisHabilitaciones = () => useQuery({ queryKey: ["yo", "habilitaciones"], queryFn: () => api.get<Habilitacion[]>("/api/yo/habilitaciones") });
export const useHerramientas = () => useQuery({ queryKey: ["herramientas"], queryFn: () => api.get<Herramienta[]>("/api/herramientas") });
export const useRepuestos = () => useQuery({ queryKey: ["repuestos"], queryFn: () => api.get<Repuesto[]>("/api/repuestos") });

// ------------------------------------------------------------------------------------------------ producción: mi orden y registro
export function RegistroProduccion({ op, compacto }: { op: Op; compacto?: boolean }) {
  const qc = useQueryClient(); const aviso = useAviso();
  const [buenas, setBuenas] = useState(10); const [malas, setMalas] = useState(0); const [motivo, setMotivo] = useState("");
  const m = useMutation({
    mutationFn: () => enviar("POST", `/api/produccion/ordenes/${op.id}/registro`, { conformes: buenas, rechazo: malas, motivo }),
    onSuccess: (r) => { aviso(r.queued ? "Sin conexión: el registro se enviará al volver la red." : `Registradas ${buenas} conformes${malas ? ` y ${malas} rechazadas` : ""}.`); setMalas(0); setMotivo(""); void qc.invalidateQueries({ queryKey: ["produccion"] }); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  const Paso = ({ v, set, color }: { v: number; set: (n: number) => void; color: string }) => (
    <div className="flex items-center gap-1.5">
      <button onClick={() => set(Math.max(0, v - 1))} className="grid size-9 cursor-pointer place-items-center rounded-xl bg-papel-2 hover:bg-linea-suave"><Minus className="size-4" /></button>
      <input value={v} onChange={(e) => set(Math.max(0, Number(e.target.value) || 0))} className="num h-9 w-16 rounded-xl border border-linea bg-papel text-center text-[16px] font-bold outline-none focus:border-acento" style={{ color }} />
      <button onClick={() => set(v + 1)} className="grid size-9 cursor-pointer place-items-center rounded-xl bg-papel-2 hover:bg-linea-suave"><Plus className="size-4" /></button>
      {[5, 10].map((n) => <button key={n} onClick={() => set(v + n)} className="h-9 cursor-pointer rounded-xl bg-papel-2 px-2.5 text-[12.5px] font-semibold hover:bg-linea-suave">+{n}</button>)}
    </div>
  );
  return (
    <div className={cx("grid gap-3", !compacto && "rounded-2xl border border-linea-suave bg-papel-2/40 p-4")}>
      <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-[13px] text-gris">Piezas conformes</span><Paso v={buenas} set={setBuenas} color="var(--s-verde)" /></div>
      <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-[13px] text-gris">Rechazadas</span><Paso v={malas} set={setMalas} color="var(--s-rojo)" /></div>
      <AnimatePresence>{malas > 0 && <motion.select initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 36 }} exit={{ opacity: 0, height: 0 }} value={motivo} onChange={(e) => setMotivo(e.target.value)} className="h-9 rounded-xl border border-linea bg-papel px-3 text-[13.5px] outline-none">
        <option value="">Motivo del rechazo…</option>{["Rebaba", "Medida fuera de tolerancia", "Rechupe", "Mancha o color", "Golpe en manipulación", "Etiqueta incorrecta", "Componente incorrecto"].map((x) => <option key={x}>{x}</option>)}</motion.select>}</AnimatePresence>
      <button disabled={m.isPending || (malas > 0 && !motivo) || buenas + malas === 0 || op.estado !== "en_curso"} onClick={() => m.mutate()} className="h-11 cursor-pointer rounded-xl bg-gradient-to-r from-acento to-cobre font-semibold text-sobre-negro disabled:cursor-not-allowed disabled:opacity-40">
        {op.estado !== "en_curso" ? "La orden no está en curso" : m.isPending ? "Registrando…" : "Registrar producción"}
      </button>
    </div>
  );
}

/** Tipo de máquina que opera cada cargo de piso (deducido del catálogo de cargos; no es una restricción de seguridad). */
const MAQUINA_CARGO: Record<number, RegExp> = { 10: /torno|cnc|mecaniz/i, 12: /envas|etiquet|embal/i, 11: /robot|ensambl/i, 9: /inyect|prensa|compres|bomba|cinta/i };
/** La orden en curso del operador: primero la de su tipo de máquina. */
export function useMiOrden() {
  const { usuario } = useAuth();
  const { equipos } = usePlanta();
  const { data } = useOps("activas");
  const tipo = MAQUINA_CARGO[usuario?.cargoId ?? 0];
  const mias = tipo ? (data ?? []).filter((o) => tipo.test(equipos.find((e) => e.codigo === o.equipo)?.tipo ?? "")) : data ?? [];
  const lista = mias.length ? mias : data ?? [];
  return { data, op: lista.find((o) => o.estado === "en_curso") ?? lista[0] };
}

export function MiOrden() {
  const { data, op } = useMiOrden();
  if (!data) return <Bloque titulo="Mi orden de producción" icono={<Gauge className="size-4" />}><Esqueleto className="h-40" /></Bloque>;
  if (!op) return <Bloque titulo="Mi orden de producción" icono={<Gauge className="size-4" />}><Vacio texto="No hay órdenes de producción para su turno en este momento." /></Bloque>;
  const r = 52, C = 2 * Math.PI * r;
  return (
    <Bloque titulo="Mi orden de producción" icono={<Gauge className="size-4" />} enlace={{ t: "Todas las órdenes", r: "/produccion" }} className="xl:col-span-2">
      <div className="grid gap-5 md:grid-cols-[auto_1fr_minmax(260px,1fr)]">
        <div className="relative grid size-32 place-items-center">
          <svg viewBox="0 0 128 128" className="absolute inset-0 -rotate-90"><circle cx="64" cy="64" r={r} fill="none" stroke="var(--s-borde-suave)" strokeWidth="11" />
            <motion.circle cx="64" cy="64" r={r} fill="none" stroke="var(--s-acento)" strokeWidth="11" strokeLinecap="round" strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - Math.min(1, op.avance)) }} transition={{ duration: 0.9 }} style={{ filter: "drop-shadow(0 0 6px var(--s-acento))" }} /></svg>
          <div className="text-center"><p className="display text-[26px] font-bold leading-none">{Math.round(op.avance * 100)}%</p><p className="text-[11px] text-gris">avance</p></div>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><p className="num text-[12.5px] text-gris">{op.codigo} · lote {op.lote}</p><Chip tono={op.estado === "en_curso" ? "ok" : "info"}>{op.estado === "en_curso" ? "En curso" : op.estado}</Chip></div>
          <p className="display mt-1 text-[22px] font-bold leading-tight">{op.producto}</p>
          <p className="text-[13px] text-gris">{op.equipo} {op.equipoNombre} · {op.linea} · turno {op.turno}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[["Meta", op.cantidad], ["Hechas", op.producidas], ["Rechazo", op.rechazo]].map(([t, v]) => <div key={t as string} className="rounded-xl bg-papel-2 py-2"><p className="num text-[18px] font-bold">{(v as number).toLocaleString("es-CL")}</p><p className="text-[11px] text-gris">{t}</p></div>)}
          </div>
        </div>
        <RegistroProduccion op={op} compacto />
      </div>
    </Bloque>
  );
}

/** Equipo de la orden en curso con sus parámetros en vivo y los límites permitidos. */
export function MiEquipo() {
  const { op } = useMiOrden();
  const { equipos } = usePlanta();
  const codigo = op?.equipo;
  const e = equipos.find((x) => x.codigo === codigo);
  return (
    <Bloque titulo="Mi equipo autorizado" icono={<Wrench className="size-4" />} enlace={e ? { t: "Ficha", r: `/explorador?equipo=${e.codigo}` } : undefined}>
      {!e ? <Vacio texto="Sin equipo asignado por una orden en curso." /> : (
        <>
          <div className="flex items-center gap-3"><Maquina tipo={e.tipo} estado={e.estado} className="h-16 w-24" /><div><p className="num font-bold">{e.codigo}</p><p className="text-[13px] text-gris">{e.nombre}</p><Chip tono={e.estado === "operando" ? "ok" : e.estado === "alarma" ? "peligro" : "aviso"}>{ESTADO_EQ[e.estado]?.t}</Chip></div></div>
          <div className="mt-3 grid grid-cols-2 gap-2">{e.sensores.map((s) => <div key={s.variable} className="flex flex-col items-center rounded-xl border border-linea-suave p-2"><Medidor valor={s.ultimo} min={s.min} max={s.max} aviso={s.aviso} alarma={s.alarma} unidad={s.unidad} tam={118} /><p className="text-center text-[11.5px] text-gris">{s.nombre}</p></div>)}</div>
        </>
      )}
    </Bloque>
  );
}

// ------------------------------------------------------------------------------------------------ habilitaciones
export function MisHabilitaciones() {
  const { data } = useMisHabilitaciones();
  return (
    <Bloque titulo="Mis habilitaciones" icono={<BadgeCheck className="size-4" />}>
      {!data ? <Esqueleto className="h-24" /> : data.length === 0 ? <Vacio texto="No tiene habilitaciones registradas." /> : (
        <ul className="grid gap-1.5">{data.map((h) => <li key={h.id} className={cx("flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[13px]", h.estado === "VENCIDA" ? "border-rojo/40 bg-rojo-claro" : h.estado === "POR VENCER" ? "border-ambar/40 bg-ambar-claro" : "border-linea-suave")}>
          <span>{h.nombre}</span><span className={cx("num shrink-0 text-[12px] font-semibold", h.estado === "VENCIDA" ? "text-rojo" : h.estado === "POR VENCER" ? "text-ambar" : "text-verde")}>{h.estado === "VENCIDA" ? "vencida" : `${h.dias} d`}</span></li>)}</ul>
      )}
      {data?.some((h) => h.estado === "VENCIDA") && <p className="mt-3 flex gap-2 text-[12.5px] text-rojo"><AlertTriangle className="size-4 shrink-0" />Con una habilitación vencida no debe operar ese equipo o tarea. Avise a su jefatura.</p>}
    </Bloque>
  );
}

// ------------------------------------------------------------------------------------------------ checklist (rutinas) del equipo o de todos
interface Rutinas { plantillas: { id: number; nombre: string; frecuencia: string }[]; filas: { rutinaId: number; rutina: string; frecuencia: string; equipo: string; equipoNombre: string; ultima?: { fecha: string; por: string } | null; vencida: boolean }[] }
export function ChecklistPendiente({ equipos: filtro, titulo = "Checklist pendientes" }: { equipos?: string[]; titulo?: string }) {
  const { data } = useQuery({ queryKey: ["rutinas"], queryFn: () => api.get<Rutinas>("/api/rutinas") });
  const pend = (data?.filas ?? []).filter((f) => f.vencida && (!filtro || filtro.includes(f.equipo))).slice(0, 6);
  return (
    <Bloque titulo={titulo} icono={<CheckCircle2 className="size-4" />} enlace={{ t: "Rutinas", r: "/rutinas" }}>
      {!data ? <Esqueleto className="h-24" /> : pend.length === 0 ? <Vacio texto="Todo al día." /> : (
        <ul className="grid gap-1.5">{pend.map((f) => <li key={`${f.rutinaId}${f.equipo}`} className="flex items-center gap-2 rounded-xl border border-linea-suave px-3 py-2 text-[13px]"><span className="size-2 rounded-full bg-ambar" /><span className="min-w-0 flex-1 truncate">{f.rutina} · <b className="num">{f.equipo}</b></span><span className="text-[11.5px] text-gris">{f.ultima ? hace(f.ultima.fecha) : "nunca"}</span></li>)}</ul>
      )}
    </Bloque>
  );
}

// ------------------------------------------------------------------------------------------------ órdenes de trabajo: mías y disponibles de mi especialidad
export function MisOt() {
  const { usuario } = useAuth();
  const { data } = useOts();
  const esp = ESPECIALIDAD_CARGO[usuario?.cargoId ?? 0];
  const mias = (data ?? []).filter((o) => o.asignadoAId === usuario?.id && o.estado !== "cerrada");
  const disponibles = (data ?? []).filter((o) => o.estado === "abierta" && !o.asignadoAId && (!esp || esp.includes(o.especialidad))).sort((a, b) => ["critica", "alta", "media", "baja"].indexOf(a.prioridad) - ["critica", "alta", "media", "baja"].indexOf(b.prioridad));
  const Fila = ({ o }: { o: Ot }) => (
    <li><button onClick={() => ir(`/mantenimiento?orden=${o.id}`)} className="relative flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-xl border border-linea-suave bg-papel-2/40 px-3.5 py-2.5 text-left hover:border-acento/40">
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: PRIO[o.prioridad]?.c }} />
      <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium">{o.titulo}</span><span className="text-[12px] text-gris">{o.codigo} · {o.equipo} · {ESP[o.especialidad]}{o.programada ? ` · ${new Date(o.programada + "T12:00").toLocaleDateString("es-CL", { weekday: "short", day: "numeric" })}` : ""}</span></span>
      <Chip tono={o.estado === "en_curso" ? "aviso" : PRIO[o.prioridad]?.tono} punto={false}>{o.estado === "en_curso" ? "con LOTO" : o.prioridad}</Chip>
    </button></li>
  );
  return (
    <>
      <Bloque titulo={`Asignadas a usted · ${mias.length}`} icono={<Wrench className="size-4" />} enlace={{ t: "Centro de OT", r: "/mantenimiento" }}>
        {!data ? <Esqueleto className="h-32" /> : mias.length === 0 ? <Vacio texto="No tiene órdenes asignadas. Puede tomar una disponible de su especialidad." /> : <ul className="grid gap-2">{mias.map((o) => <Fila key={o.id} o={o} />)}</ul>}
      </Bloque>
      <Bloque titulo={`Disponibles de su especialidad · ${disponibles.length}`} icono={<Wrench className="size-4" />}>
        {!data ? <Esqueleto className="h-32" /> : disponibles.length === 0 ? <Vacio texto="No hay órdenes disponibles de su especialidad." /> : <ul className="grid gap-2">{disponibles.slice(0, 6).map((o) => <Fila key={o.id} o={o} />)}</ul>}
      </Bloque>
    </>
  );
}

/** Carga de trabajo por técnico y bloqueos activos (supervisión y jefatura). */
export function CargaCuadrilla() {
  const { data } = useOts();
  const abiertas = (data ?? []).filter((o) => o.estado !== "cerrada");
  const porTec = new Map<string, Ot[]>();
  for (const o of abiertas) { const k = o.asignado ?? "Sin asignar"; porTec.set(k, [...(porTec.get(k) ?? []), o]); }
  const filas = [...porTec.entries()].sort((a, b) => (a[0] === "Sin asignar" ? -1 : b[0] === "Sin asignar" ? 1 : b[1].length - a[1].length));
  return (
    <Bloque titulo="Carga de la cuadrilla" icono={<Users className="size-4" />} enlace={{ t: "Asignar en el plan", r: "/plan" }} className="xl:col-span-2">
      {!data ? <Esqueleto className="h-32" /> : (
        <ul className="grid gap-2">{filas.map(([tec, ots]) => (
          <li key={tec} className="flex items-center gap-3 rounded-xl border border-linea-suave px-3 py-2">
            <span className={cx("w-44 shrink-0 truncate text-[13.5px] font-medium", tec === "Sin asignar" && "text-ambar")}>{tec}</span>
            <span className="flex flex-1 flex-wrap gap-1">{ots.map((o) => <button key={o.id} onClick={() => ir(`/mantenimiento?orden=${o.id}`)} title={o.titulo} className="cursor-pointer rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold text-sobre-negro" style={{ background: o.estado === "en_curso" ? "var(--s-cobre)" : o.estado === "por_verificar" ? "var(--s-acento)" : PRIO[o.prioridad]?.c }}>{o.codigo}</button>)}</span>
            <span className="num text-[12px] text-gris">{ots.filter((o) => o.estado === "en_curso").length} en curso{ots.some((o) => o.estado === "por_verificar") ? ` · ${ots.filter((o) => o.estado === "por_verificar").length} por verificar` : ""}</span>
          </li>))}</ul>
      )}
      <p className="mt-3 flex flex-wrap gap-4 text-[11.5px] text-gris"><span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-cobre" />en curso con LOTO</span><span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-acento" />por verificar</span><span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-rojo" />crítica</span><span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-ambar" />alta</span><span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-azul" />media</span></p>
    </Bloque>
  );
}

/** Programa de la semana (OT por día) para planificación. */
export function SemanaOt() {
  const { data } = useOts();
  const hoy = new Date(); const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
  const dias = Array.from({ length: 5 }, (_, i) => { const d = new Date(lunes); d.setDate(lunes.getDate() + i); return d; });
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const sinFecha = (data ?? []).filter((o) => o.estado === "abierta" && !o.programada).length;
  return (
    <Bloque titulo="Programa de la semana" icono={<CalendarDays className="size-4" />} enlace={{ t: "Abrir el plan", r: "/plan" }} className="xl:col-span-2">
      <div className="grid grid-cols-5 gap-2">
        {dias.map((d) => { const del = (data ?? []).filter((o) => o.programada === iso(d) && o.estado !== "cerrada"); const esHoy = iso(d) === iso(hoy); return (
          <div key={iso(d)} className={cx("min-h-[120px] rounded-xl border p-2", esHoy ? "border-acento/50 bg-acento-claro" : "border-linea-suave")}>
            <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-gris">{d.toLocaleDateString("es-CL", { weekday: "short", day: "numeric" })}</p>
            {del.map((o) => <button key={o.id} onClick={() => ir("/plan")} title={o.titulo} className="mb-1 block w-full cursor-pointer truncate rounded-md px-1.5 py-1 text-left text-[11px] font-medium" style={{ background: `color-mix(in srgb, ${PRIO[o.prioridad]?.c} 22%, transparent)` }}>{o.equipo} · {o.asignado?.split(" ")[0] ?? "—"}</button>)}
          </div>); })}
      </div>
      {sinFecha > 0 && <p className="mt-3 text-[12.5px] text-ambar">{sinFecha} órdenes abiertas sin fecha en el programa.</p>}
    </Bloque>
  );
}

// ------------------------------------------------------------------------------------------------ gestión de mantenimiento (jefatura)
interface Resumen { disponibilidad: { codigo: string; nombre: string; disponibilidad: number; oee: number; fallas: number }[]; kpis: { clave: string; nombre: string; valor: number | null; meta: number; unidad: string; estado: string }[]; equipos: { total: number; operando: number; alarma: number; detenido: number; mantencion: number } }
export function GestionMantenimiento() {
  const { data } = useQuery({ queryKey: ["resumen"], queryFn: () => api.get<Resumen>("/api/operacion/resumen"), refetchInterval: 20_000 });
  const ots = useOts();
  const rep = useRepuestos();
  if (!data) return <Esqueleto className="h-48 xl:col-span-3" />;
  const backlog = (ots.data ?? []).filter((o) => o.estado !== "cerrada");
  const repetitivas = data.disponibilidad.filter((d) => d.fallas >= 2).sort((a, b) => b.fallas - a.fallas);
  const criticos = (rep.data ?? []).filter((r) => r.critico && r.bajoMinimo);
  const mttr = data.kpis.find((k) => k.clave === "mttr");
  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:col-span-3 xl:grid-cols-4">
        <Cifra valor={`${Math.round((data.disponibilidad.reduce((s, d) => s + d.disponibilidad, 0) / Math.max(1, data.disponibilidad.length)) * 100)}%`} texto="disponibilidad promedio (7 días)" tono="verde" icono={<Gauge className="size-5" />} />
        <Cifra valor={backlog.length} texto={`backlog · ${backlog.filter((o) => o.prioridad === "critica").length} críticas`} tono="ambar" icono={<Wrench className="size-5" />} />
        <Cifra valor={data.equipos.alarma + data.equipos.mantencion} texto="equipos fuera de servicio" tono="rojo" icono={<AlertTriangle className="size-5" />} />
        <Cifra valor={mttr?.valor != null ? `${mttr.valor} h` : "—"} texto={`MTTR · meta ${mttr?.meta ?? "—"} h`} tono="acento" icono={<Gauge className="size-5" />} />
      </div>
      <Bloque titulo="Disponibilidad más baja" icono={<Gauge className="size-4" />}>
        <BarrasH max={100} formato={(n) => `${n.toFixed(1)} %`} datos={[...data.disponibilidad].sort((a, b) => a.disponibilidad - b.disponibilidad).slice(0, 6).map((d) => ({ etiqueta: `${d.codigo} · ${d.nombre}`, valor: d.disponibilidad * 100, color: d.disponibilidad < 0.9 ? "var(--s-rojo)" : "var(--s-acento)" }))} />
      </Bloque>
      <Bloque titulo="Backlog por prioridad" icono={<Wrench className="size-4" />}>
        <div className="flex items-center gap-4"><Dona tam={140} grosor={16} partes={["critica", "alta", "media", "baja"].map((p) => ({ etiqueta: p, valor: backlog.filter((o) => o.prioridad === p).length, color: PRIO[p].c }))} centro={<div><p className="display text-[24px] font-bold leading-none">{backlog.length}</p><p className="text-[10.5px] text-gris">abiertas</p></div>} />
          <ul className="grid gap-1 text-[13px]">{["critica", "alta", "media", "baja"].map((p) => <li key={p} className="flex items-center gap-2"><i className="size-2.5 rounded-full" style={{ background: PRIO[p].c }} />{p}<b className="num ml-auto">{backlog.filter((o) => o.prioridad === p).length}</b></li>)}</ul></div>
      </Bloque>
      <Bloque titulo="Fallas repetitivas y repuestos críticos" icono={<Package className="size-4" />}>
        <ul className="grid gap-1.5 text-[13px]">
          {repetitivas.slice(0, 4).map((d) => <li key={d.codigo} className="flex justify-between rounded-lg bg-rojo-claro px-3 py-1.5 text-rojo-hondo"><span>{d.codigo} · {d.nombre}</span><b>{d.fallas} fallas</b></li>)}
          {criticos.slice(0, 4).map((r) => <li key={r.id} className="flex justify-between rounded-lg bg-ambar-claro px-3 py-1.5 text-ambar-hondo"><span>{r.codigo} · {r.nombre}</span><b>{r.stock} en stock</b></li>)}
          {repetitivas.length + criticos.length === 0 && <li className="text-gris">Sin fallas repetitivas ni repuestos críticos bajo mínimo.</li>}
        </ul>
      </Bloque>
    </>
  );
}

/** Bandeja de aprobaciones (cambios de PLC, eventos de seguridad, lotes) para quien tiene esa facultad. */
interface Aprobacion { tipo: string; id: number; titulo: string; detalle: string; fecha: string }
export function Aprobaciones() {
  const { data = [] } = useQuery({ queryKey: ["aprobaciones"], queryFn: () => api.get<Aprobacion[]>("/api/aprobaciones"), refetchInterval: 30_000 });
  if (data.length === 0) return null;
  return (
    <Bloque titulo={`Esperan su aprobación · ${data.length}`} icono={<ShieldAlert className="size-4" />} className="xl:col-span-3">
      <ul className="grid gap-2 md:grid-cols-2">{data.slice(0, 6).map((a) => <li key={`${a.tipo}${a.id}`}><button onClick={() => ir(a.tipo === "plc" ? "/automatizacion" : a.tipo === "sst" ? "/seguridad" : "/")} className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-cobre/30 bg-cobre/10 px-3.5 py-2.5 text-left"><span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium">{a.titulo}</span><span className="block truncate text-[12px] text-gris">{a.detalle} · {hace(a.fecha)}</span></span><ArrowRight className="size-4 text-gris" /></button></li>)}</ul>
    </Bloque>
  );
}

// ------------------------------------------------------------------------------------------------ condición de activos (confiabilidad)
export function RankingCondicion({ limite = 8 }: { limite?: number }) {
  const { equipos } = usePlanta();
  const filas = useMemo(() => equipos.flatMap((e: Equipo) => e.sensores.filter((s) => /vibracion|temp/.test(s.variable) && s.ultimo != null).map((s) => ({ e, s, r: (s.ultimo! - s.min) / Math.max(1e-6, s.alarma - s.min) }))).sort((a, b) => b.r - a.r).slice(0, limite), [equipos]);
  return (
    <Bloque titulo="Equipos más cerca del límite" icono={<Gauge className="size-4" />} enlace={{ t: "Condición", r: "/condicion" }}>
      {filas.length === 0 ? <Vacio texto="Esperando lecturas de la planta…" /> : (
        <ul className="grid gap-2">{filas.map(({ e, s, r }) => (
          <li key={e.codigo + s.variable} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-[13px]">
            <span className="truncate"><b className="num">{e.codigo}</b> <span className="text-gris">{s.variable.startsWith("temp") ? "temp." : "vibr."}</span></span>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-linea-suave"><motion.div className="absolute inset-y-0 left-0 rounded-full" initial={false} animate={{ width: `${Math.min(100, r * 100)}%` }} style={{ background: r > 1 ? "var(--s-rojo)" : r > 0.75 ? "var(--s-ambar)" : "var(--s-acento)" }} /></div>
            <span className={cx("num w-24 text-right font-semibold", r > 1 && "text-rojo", r > 0.75 && r <= 1 && "text-ambar")}>{s.ultimo!.toFixed(1)} {s.unidad}</span>
          </li>))}</ul>
      )}
      <p className="mt-3 text-[11.5px] text-gris">Barra llena = límite de alarma. Sobre el 75 % conviene planificar una intervención.</p>
    </Bloque>
  );
}

// ------------------------------------------------------------------------------------------------ PLC (automatización)
interface Cambio { id: number; plc: string; resumen: string; estado: string; solicitadoPor: string; solicitadoPorId: string; fecha: string; revisadoPor?: string | null; puedeAprobar: boolean }
export function EstadoPlcs() {
  const { plcEstado } = usePlanta();
  const { data } = useQuery({ queryKey: ["plc"], queryFn: () => api.get<PlcResumen[]>("/api/plc"), refetchInterval: 8000 });
  return (
    <Bloque titulo="Controladores" icono={<Cpu className="size-4" />} enlace={{ t: "Automatización", r: "/automatizacion" }}>
      <ul className="grid gap-2">{(data ?? []).map((p) => { const e = p.estado === "sin_conexion" ? "sin_conexion" : plcEstado[p.codigo] ?? p.estado; return (
        <li key={p.codigo} className="flex items-center gap-3 rounded-xl border border-linea-suave px-3 py-2">
          <span className={cx("size-2.5 rounded-full", e === "run" ? "bg-verde animate-latido" : e === "error" ? "bg-rojo animate-parpadeo" : e === "stop" ? "bg-ambar" : "bg-gris")} />
          <span className="min-w-0 flex-1"><span className="num block text-[13.5px] font-semibold">{p.codigo}</span><span className="block truncate text-[11.5px] text-gris">{p.fabricante} {p.modelo}</span></span>
          <span className="text-[12px] text-gris">{e === "run" ? "en marcha" : e === "error" ? "falla" : e === "stop" ? "detenido" : "sin conexión"}</span>
        </li>); })}</ul>
    </Bloque>
  );
}
export function CambiosPlc({ titulo = "Cambios de programa" }: { titulo?: string }) {
  const { usuario } = useAuth();
  const qc = useQueryClient(); const aviso = useAviso();
  const { data } = useQuery({ queryKey: ["cambios"], queryFn: () => api.get<Cambio[]>("/api/plc/cambios"), refetchInterval: 20_000 });
  const decidir = useMutation({ mutationFn: (v: { id: number; d: string }) => api.post(`/api/plc/cambios/${v.id}/${v.d}`, { comentario: "" }), onSuccess: (_, v) => { aviso(v.d === "aprobar" ? "Cambio aprobado y publicado." : "Cambio rechazado."); void qc.invalidateQueries({ queryKey: ["cambios"] }); void qc.invalidateQueries({ queryKey: ["aprobaciones"] }); }, onError: (e) => aviso(mensajeDe(e), "error") });
  return (
    <Bloque titulo={titulo} icono={<Cpu className="size-4" />}>
      {!data ? <Esqueleto className="h-24" /> : data.length === 0 ? <Vacio texto="No hay cambios solicitados." /> : (
        <ul className="grid gap-2">{data.slice(0, 8).map((c) => (
          <li key={c.id} className={cx("rounded-xl border px-3 py-2.5", c.estado === "pendiente" ? "border-cobre/30 bg-cobre/10" : "border-linea-suave")}>
            <div className="flex items-center justify-between gap-2"><p className="text-[13.5px] font-medium">{c.plc} · {c.resumen}</p><Chip tono={c.estado === "aprobado" ? "ok" : c.estado === "rechazado" ? "peligro" : "aviso"} punto={false}>{c.estado}</Chip></div>
            <p className="text-[12px] text-gris">{c.solicitadoPorId === usuario?.id ? "solicitado por usted" : c.solicitadoPor} · {hace(c.fecha)}{c.revisadoPor ? ` · revisó ${c.revisadoPor}` : ""}</p>
            {c.puedeAprobar && <div className="mt-2 flex gap-2"><button onClick={() => decidir.mutate({ id: c.id, d: "rechazar" })} className="h-8 cursor-pointer rounded-lg border border-rojo/40 px-3 text-[12.5px] text-rojo">Rechazar</button><button onClick={() => decidir.mutate({ id: c.id, d: "aprobar" })} className="h-8 cursor-pointer rounded-lg bg-acento px-3 text-[12.5px] font-semibold text-sobre-negro">Aprobar y publicar</button></div>}
            {c.estado === "pendiente" && c.solicitadoPorId === usuario?.id && <p className="mt-1 text-[11.5px] text-ambar">Lo aprueba otra persona con esa facultad (jefatura de mantenimiento o gerencia de planta).</p>}
          </li>))}</ul>
      )}
    </Bloque>
  );
}

// ------------------------------------------------------------------------------------------------ calibraciones
export function Instrumentos({ completo }: { completo?: boolean }) {
  const { usuario } = useAuth();
  const qc = useQueryClient(); const aviso = useAviso();
  const { data } = useHerramientas();
  const lista = (data ?? []).filter((h) => h.requiereCalibracion).sort((a, b) => (a.dias ?? 9999) - (b.dias ?? 9999));
  const cal = useMutation({ mutationFn: (id: number) => api.post(`/api/herramientas/${id}/calibrar`, {}), onSuccess: () => { aviso("Calibración registrada."); void qc.invalidateQueries({ queryKey: ["herramientas"] }); }, onError: (e) => aviso(mensajeDe(e), "error") });
  const puede = tiene(usuario, "herramientas.editar");
  return (
    <Bloque titulo="Instrumentos que requieren calibración" icono={<Gauge className="size-4" />} enlace={completo ? undefined : { t: "Todos", r: "/calibraciones" }} className={completo ? "xl:col-span-3" : undefined}>
      {!data ? <Esqueleto className="h-32" /> : (
        <ul className="grid gap-2 md:grid-cols-2">{lista.slice(0, completo ? 100 : 6).map((h) => { const venc = (h.dias ?? 0) < 0, pronto = !venc && (h.dias ?? 99) <= 30; return (
          <li key={h.id} className={cx("flex items-center gap-3 rounded-xl border px-3 py-2.5", venc ? "border-rojo/40 bg-rojo-claro" : pronto ? "border-ambar/40 bg-ambar-claro" : "border-linea-suave")}>
            <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium">{h.nombre}</span><span className="text-[12px] text-gris">{h.codigo} · {h.proxima ? `vence ${new Date(h.proxima + "T12:00").toLocaleDateString("es-CL")}` : "sin fecha"}</span></span>
            <span className={cx("num text-[12.5px] font-semibold", venc ? "text-rojo" : pronto ? "text-ambar" : "text-verde")}>{h.dias == null ? "—" : venc ? `vencida ${-h.dias} d` : `${h.dias} d`}</span>
            {puede && (venc || pronto || completo) && <button disabled={cal.isPending} onClick={() => cal.mutate(h.id)} className="h-8 cursor-pointer rounded-lg bg-acento px-3 text-[12px] font-semibold text-sobre-negro">Calibrar</button>}
          </li>); })}</ul>
      )}
    </Bloque>
  );
}

// ------------------------------------------------------------------------------------------------ pañol
export function StockCritico({ completo }: { completo?: boolean }) {
  const { data } = useRepuestos();
  const bajos = (data ?? []).filter((r) => r.bajoMinimo).sort((a, b) => Number(b.critico) - Number(a.critico) || a.stock - b.stock);
  return (
    <Bloque titulo={`Bajo el mínimo · ${bajos.length}`} icono={<Package className="size-4" />} enlace={completo ? undefined : { t: "Pañol", r: "/panol" }} className={completo ? "xl:col-span-2" : undefined}>
      {!data ? <Esqueleto className="h-32" /> : bajos.length === 0 ? <Vacio texto="Todo el stock sobre el mínimo." /> : (
        <ul className="grid gap-1.5">{bajos.slice(0, completo ? 50 : 7).map((r) => (
          <li key={r.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-linea-suave px-3 py-2">
            <span className="min-w-0"><span className="block truncate text-[13.5px]"><b className="num text-[12px]">{r.codigo}</b> {r.nombre}{r.critico && <span className="ml-1.5 rounded bg-rojo-claro px-1.5 text-[10.5px] font-bold text-rojo">CRÍTICO</span>}</span><span className="text-[11.5px] text-gris">{r.ubicacion} · mínimo {r.stockMinimo}</span></span>
            <span className={cx("num text-[16px] font-bold", r.stock === 0 ? "text-rojo" : "text-ambar")}>{r.stock}</span>
          </li>))}</ul>
      )}
    </Bloque>
  );
}

// ------------------------------------------------------------------------------------------------ seguridad
export function EventosSst({ titulo = "Eventos de seguridad" }: { titulo?: string }) {
  const { data } = useQuery({ queryKey: ["sst", "incidentes"], queryFn: () => api.get<Incidente[]>("/api/sst/incidentes"), refetchInterval: 30_000 });
  return (
    <Bloque titulo={titulo} icono={<HardHat className="size-4" />} enlace={{ t: "Seguridad", r: "/seguridad" }}>
      {!data ? <Esqueleto className="h-24" /> : data.length === 0 ? <Vacio texto="Sin eventos registrados." /> : (
        <ul className="grid gap-1.5">{data.slice(0, 6).map((i) => <li key={i.id} className="flex items-center gap-3 rounded-xl border border-linea-suave px-3 py-2 text-[13px]"><span className="size-2 rounded-full" style={{ background: i.tipo === "accidente" ? "var(--s-rojo)" : i.estado === "cerrado" ? "var(--s-verde)" : "var(--s-ambar)" }} /><span className="min-w-0 flex-1 truncate">{TIPO_SST[i.tipo]} · {i.zona}</span><span className="text-[11.5px] text-gris">{i.estado} · {hace(i.fecha)}</span></li>)}</ul>
      )}
    </Bloque>
  );
}

// ------------------------------------------------------------------------------------------------ estado de equipos (supervisión y sala de control)
export function EstadoEquipos({ titulo = "Equipos" }: { titulo?: string }) {
  const { equipos } = usePlanta();
  const orden = [...equipos].sort((a, b) => ["alarma", "en_mantencion", "detenido", "operando"].indexOf(a.estado) - ["alarma", "en_mantencion", "detenido", "operando"].indexOf(b.estado));
  return (
    <Bloque titulo={titulo} icono={<Gauge className="size-4" />} enlace={{ t: "Explorador", r: "/explorador" }}>
      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">{orden.map((e) => <li key={e.codigo}><button onClick={() => ir(`/explorador?equipo=${e.codigo}`)} className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-linea-suave px-2.5 py-2 text-left hover:border-acento/40" style={e.estado === "alarma" ? { borderColor: "var(--s-rojo)", boxShadow: "0 0 14px -6px var(--s-rojo)" } : undefined}>
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: ESTADO_EQ[e.estado]?.c }} /><span className="min-w-0"><span className="num block text-[12.5px] font-bold">{e.codigo}</span><span className="block truncate text-[11px] text-gris">{ESTADO_EQ[e.estado]?.t}</span></span></button></li>)}</ul>
    </Bloque>
  );
}
