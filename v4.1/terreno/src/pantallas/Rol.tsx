import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowRight, BadgeCheck, CalendarDays, CheckCircle2, ChevronDown, ClipboardCheck, Compass, Cpu, Hammer, HardHat, Play, RefreshCw, Route, ShieldCheck, Siren, Sparkles, UserCheck, Users, Wrench, XOctagon, type LucideIcon } from "lucide-react";
import { CATALOGO_CARGOS } from "@sima/cliente";
import { AreaTexto, Boton, Chip, Entrada, Esqueleto, Seleccion, TIEMPO, CURVA, cx, defEstado, mensajeDe, useAviso } from "@sima/ui";
import { usePendientes } from "../lib/offline";
import { useNotificaciones } from "../shell";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { usePlanta } from "../lib/planta";
import { ir } from "../ruta";
import { ESPECIALIDAD_CARGO, SECCIONES, experienciaDe, seccionesDe, tiene, type Seccion } from "../roles";
import {
  Bloque, CambiosPlc, useMiOrden, CargaCuadrilla, ChecklistPendiente, Cifra, ESP, EstadoEquipos, EstadoPlcs, EventosSst, GestionMantenimiento, Instrumentos, MiEquipo, MiOrden, MisHabilitaciones,
  MisOt, PRIO, RankingCondicion, RegistroProduccion, SemanaOt, StockCritico, TIPO_SST, hace, useMisHabilitaciones, useOps, useOts, type Habilitacion, type Ot,
} from "./bloques";

// ------------------------------------------------------------------------------------------------ piezas comunes
function Encabezado({ titulo, texto, derecha }: { titulo: string; texto?: string; derecha?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="t-pantalla">{titulo}</h1>{texto && <p className="mt-1 max-w-[80ch] text-[13px] text-gris">{texto}</p>}</div>
      {derecha}
    </div>
  );
}

/** Los cinco momentos de la jornada del cargo, tal como los describe el catálogo funcional (docs/analisis). */
export function MiJornada({ cargoId, abierta = false }: { cargoId: number; abierta?: boolean }) {
  const f = CATALOGO_CARGOS[cargoId];
  const [ver, setVer] = useState(abierta);
  if (!f) return null;
  const pasos: [string, string][] = [["Al comenzar", f.jornada.inicio], ["Durante la jornada", f.jornada.durante], ["Al coordinarse", f.jornada.coordina], ["Ante una anomalía", f.jornada.anomalia], ["Al cerrar", f.jornada.cierre]];
  return (
    <Bloque titulo="Mi jornada" icono={<Route className="size-4" />} className="xl:col-span-3" accion={<button onClick={() => setVer(!ver)} className="inline-flex cursor-pointer items-center gap-1 text-[12.5px] font-medium text-acento">{ver ? "Ocultar" : "Ver"}<ChevronDown className={cx("size-3.5 transition-transform", ver && "rotate-180")} /></button>}>
      <p className="text-[13.5px] text-gris">{f.proposito}</p>
      <AnimatePresence initial={false}>
        {ver && (
          <motion.ol initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 grid gap-2 overflow-hidden md:grid-cols-5">
            {pasos.map(([t, d], i) => (
              <li key={t} className="relative rounded-md border border-linea-suave bg-papel-2/40 p-3">
                <p className="t-etiqueta"><span className="num mr-1.5 text-acento">{i + 1}</span>{t}</p>
                <p className="mt-1 text-[13px] leading-snug">{d}</p>
              </li>
            ))}
          </motion.ol>
        )}
      </AnimatePresence>
    </Bloque>
  );
}

/** Lo que el cargo necesita y SIMA todavía no tiene: se dice con claridad en vez de mostrar datos de relleno. */
function EnPlan({ modulos }: { modulos: string[] }) {
  return (
    <Bloque titulo="Lo que viene para su cargo" icono={<Sparkles className="size-4" />}>
      <p className="mb-2 text-[13px] text-gris">Estas herramientas forman parte del plan de SIMA y todavía no están disponibles. Mientras tanto, nada aquí muestra cifras inventadas.</p>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-1.5">{modulos.map((m) => <li key={m} className="flex items-center gap-2 rounded-md border border-dashed border-linea px-3 py-2 text-[13px]"><span className="size-1.5 rounded-full bg-info" />{m}</li>)}</ul>
    </Bloque>
  );
}

/** Indicadores del cargo según el Excel, con la fuente que los alimenta y si SIMA ya la tiene. */
function MisIndicadores({ cargoId }: { cargoId: number }) {
  const f = CATALOGO_CARGOS[cargoId];
  if (!f) return null;
  const t = { hoy: ["Con datos en SIMA", "var(--s-verde)"], parcial: ["Datos parciales", "var(--s-ambar)"], falta: ["Sin fuente todavía", "var(--s-tenue)"] } as const;
  return (
    <Bloque titulo="Cómo se mide mi trabajo" icono={<BadgeCheck className="size-4" />}>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-1.5">{f.medir.map((m) => <li key={m.indicador} className="rounded-md border border-linea-suave px-3 py-2"><div className="flex items-center justify-between gap-2"><span className="text-[13.5px] font-medium">{m.indicador}</span><span className="inline-flex items-center gap-1.5 text-[11.5px]" style={{ color: t[m.estado][1] }}><i className="size-2 rounded-full" style={{ background: t[m.estado][1] }} />{t[m.estado][0]}</span></div><p className="text-[12px] text-gris">{m.fuente}</p></li>)}</ul>
    </Bloque>
  );
}

function AlarmasAbiertas() {
  const { usuario } = useAuth();
  const qc = useQueryClient(); const aviso = useAviso();
  const { data } = useQuery({ queryKey: ["alarmas", "abiertas"], queryFn: () => api.get<{ id: number; equipo: string; equipoNombre: string; nivel: string; mensaje: string; inicio: string; reconocidaPor?: string | null; simulado?: boolean }[]>("/api/alarmas?abiertas=true"), refetchInterval: 8000 });
  const rec = useMutation({ mutationFn: (id: number) => api.post(`/api/alarmas/${id}/reconocer`), onSuccess: () => { aviso("Alarma reconocida."); void qc.invalidateQueries({ queryKey: ["alarmas"] }); }, onError: (e) => aviso(mensajeDe(e), "error") });
  const puede = tiene(usuario, "planta.registrar");
  return (
    <Bloque titulo={`Alarmas abiertas · ${data?.length ?? 0}`} icono={<Siren className="size-4" />} enlace={{ t: "Consola", r: "/alertas" }} className="xl:col-span-2">
      {!data ? <Esqueleto className="h-32" /> : data.length === 0 ? <p className="my-auto rounded-md border border-dashed border-linea p-6 text-center text-[13px] text-gris">No hay alarmas abiertas.</p> : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">{data.slice(0, 8).map((a) => (
          <li key={a.id} className={cx("flex items-center gap-3 rounded-md border px-3 py-2.5", a.nivel === "alarma" && !a.reconocidaPor ? "border-rojo/50 bg-rojo-claro" : "border-linea-suave")}>
            {a.nivel === "alarma" ? <XOctagon className="size-4 shrink-0 text-rojo" /> : <AlertTriangle className="size-4 shrink-0 text-ambar" />}
            <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium">{a.mensaje}</span><span className="text-[12px] text-gris">{a.equipo} {a.equipoNombre} · {hace(a.inicio)}{a.simulado && <span className="trama-sim ml-1.5 rounded px-1 text-info">simulada</span>}</span></span>
            {a.reconocidaPor ? <span className="text-[12px] text-gris">reconoció {a.reconocidaPor}</span> : puede && <Boton tam="s" variante="contorno" onClick={() => rec.mutate(a.id)}>Reconocer</Boton>}
          </li>))}</ul>
      )}
    </Bloque>
  );
}

/** OT terminadas por el técnico que esperan la verificación de cierre (supervisión y jefatura). */
function PorVerificar() {
  const { usuario } = useAuth();
  const { data } = useOts();
  const lista = (data ?? []).filter((o) => o.estado === "por_verificar");
  return (
    <Bloque titulo={`Equipos por liberar · ${lista.length}`} icono={<ShieldCheck className="size-4" />} enlace={{ t: "Órdenes de trabajo", r: "/mantenimiento" }}>
      {!data ? <Esqueleto className="h-24" /> : lista.length === 0 ? <p className="rounded-md border border-dashed border-linea p-5 text-center text-[12.5px] text-gris">Ninguna liberación pendiente. Cuando un técnico termine y registre sus pruebas, aparecerá aquí.</p> : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">{lista.map((o) => <li key={o.id}><button onClick={() => ir(`/mantenimiento?orden=${o.id}`)} className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-ambar/30 bg-ambar-claro px-3 py-2.5 text-left">
          <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{o.titulo}</span><span className="text-[12px] text-gris">{o.codigo} · {o.equipo} · {o.asignado}{o.asignadoAId === usuario?.id ? " (usted la ejecutó: la firma otra persona)" : ""}</span></span><Chip tono="aviso" punto={false}>por liberar</Chip></button></li>)}</ul>
      )}
    </Bloque>
  );
}

/** Avisos de falla que la persona reportó, con su estado (el operador no ve las OT ajenas). */
function MisAvisos() {
  const { usuario } = useAuth();
  const { data } = useOts();
  const mias = (data ?? []).filter((o) => o.creadaPorId === usuario?.id).slice(0, 6);
  const estado: Record<string, string> = { abierta: "recibido por mantenimiento", en_curso: "en reparación", por_verificar: "reparado, en liberación", cerrada: "resuelto" };
  return (
    <Bloque titulo="Mis avisos de falla" icono={<AlertTriangle className="size-4" />} enlace={{ t: "Reportar", r: "/reportar" }}>
      {!data ? <Esqueleto className="h-20" /> : mias.length === 0 ? <p className="rounded-md border border-dashed border-linea p-5 text-center text-[13px] text-gris">No ha reportado fallas. Si ve algo anormal en su equipo, repórtelo: mantenimiento recibe el aviso al instante.</p> : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-1.5">{mias.map((o) => <li key={o.id} className="flex items-center justify-between gap-2 rounded-md border border-linea-suave px-3 py-2 text-[13px]"><span className="min-w-0 truncate">{o.codigo} · {o.equipo} · {o.titulo}</span><span className={cx("shrink-0 text-[12px]", o.estado === "cerrada" ? "text-verde" : "text-ambar")}>{estado[o.estado] ?? o.estado}</span></li>)}</ul>
      )}
    </Bloque>
  );
}

function HabilitacionesEquipo() {
  const { data } = useQuery({ queryKey: ["habilitaciones", "equipo"], queryFn: () => api.get<Habilitacion[]>("/api/habilitaciones") });
  const alerta = (data ?? []).filter((h) => h.estado !== "VIGENTE");
  return (
    <Bloque titulo="Habilitaciones de mi equipo" icono={<BadgeCheck className="size-4" />}>
      {!data ? <Esqueleto className="h-24" /> : alerta.length === 0 ? <p className="rounded-md border border-dashed border-linea p-5 text-center text-[13px] text-gris">Todas las habilitaciones de su equipo están vigentes.</p> : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-1.5">{alerta.slice(0, 8).map((h) => <li key={h.id} className={cx("flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-[13px]", h.estado === "VENCIDA" ? "border-rojo/40 bg-rojo-claro" : "border-ambar/40 bg-ambar-claro")}><span className="min-w-0"><b>{h.trabajador}</b> · {h.nombre}</span><span className={cx("num shrink-0 text-[12px] font-semibold", h.estado === "VENCIDA" ? "text-rojo" : "text-ambar")}>{h.estado === "VENCIDA" ? "vencida" : `${h.dias} d`}</span></li>)}</ul>
      )}
      <p className="mt-3 text-[11.5px] text-gris">No asigne a nadie a una tarea cuya habilitación esté vencida.</p>
    </Bloque>
  );
}

function OrdenesProduccion({ registrar }: { registrar: boolean }) {
  const { data } = useOps("activas");
  const [abierta, setAbierta] = useState<number | null>(null);
  return (
    <Bloque titulo="Órdenes de producción del turno" icono={<ClipboardCheck className="size-4" />} className="xl:col-span-2">
      {!data ? <Esqueleto className="h-32" /> : data.length === 0 ? <p className="rounded-md border border-dashed border-linea p-6 text-center text-[13px] text-gris">No hay órdenes de producción activas.</p> : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">{data.map((o) => (
          <li key={o.id} className="rounded-md border border-linea-suave">
            <button onClick={() => setAbierta(abierta === o.id ? null : o.id)} className="grid w-full cursor-pointer grid-cols-[1fr_160px_auto] items-center gap-3 px-3.5 py-2.5 text-left">
              <span className="min-w-0"><span className="block truncate text-[13.5px] font-medium">{o.producto}</span><span className="text-[12px] text-gris">{o.codigo} · lote {o.lote} · {o.equipo} · turno {o.turno}</span></span>
              <span><span className="block h-2 overflow-hidden rounded-full bg-linea-suave"><motion.span className="block h-full rounded-full bg-acento" initial={false} animate={{ width: `${Math.round(o.avance * 100)}%` }} /></span><span className="num text-[11.5px] text-gris">{o.producidas}/{o.cantidad} · rechazo {o.rechazo}</span></span>
              <Chip tono={o.estado === "en_curso" ? "ok" : "info"} punto={false}>{o.estado === "en_curso" ? "en curso" : o.estado}</Chip>
            </button>
            <AnimatePresence>{registrar && abierta === o.id && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-t border-linea-suave p-3"><RegistroProduccion op={o} /></motion.div>}</AnimatePresence>
          </li>))}</ul>
      )}
    </Bloque>
  );
}

/** Cifras del turno a partir de registros reales (órdenes del turno, estados en vivo y eventos SST). */
function CifrasTurno() {
  const { data: ops } = useOps("activas");
  const { equipos } = usePlanta();
  const sst = useQuery({ queryKey: ["sst", "incidentes"], queryFn: () => api.get<{ id: number; estado: string; fecha: string }[]>("/api/sst/incidentes") });
  const hoy = new Date().toDateString();
  return (
    <div className="grid grid-cols-2 gap-3 xl:col-span-3 xl:grid-cols-4">
      <Cifra valor={(ops ?? []).reduce((s, o) => s + o.buenas, 0).toLocaleString("es-CL")} texto="unidades buenas en órdenes activas" tono="verde" icono={<ClipboardCheck className="size-5" />} />
      <Cifra valor={(ops ?? []).reduce((s, o) => s + o.rechazo, 0)} texto="unidades rechazadas" tono="ambar" icono={<AlertTriangle className="size-5" />} />
      <Cifra valor={equipos.filter((e) => !defEstado(e.estado).marcha).length} texto="equipos sin producir (falla, mantenimiento, bloqueo o por liberar)" tono="rojo" icono={<Wrench className="size-5" />} />
      <Cifra valor={(sst.data ?? []).filter((i) => new Date(i.fecha).toDateString() === hoy).length} texto="eventos de seguridad hoy" tono="acento" icono={<HardHat className="size-5" />} />
    </div>
  );
}

function ChecklistMiEquipo() {
  const { op } = useMiOrden();
  return <ChecklistPendiente equipos={op ? [op.equipo] : []} titulo={op ? `Checklist de ${op.equipo}` : "Mis checklist pendientes"} />;
}

// ------------------------------------------------------------------------------------------------ qué requiere atención
interface ItemAtencion { clave: string; texto: string; detalle?: string; nivel: "critico" | "aviso" | "tarea"; icono: LucideIcon; destino: string }
interface AprobacionItem { tipo: string; id: number; titulo: string; detalle: string; fecha: string; enlace?: string; etapa?: string }
/**
 * Responde «qué requiere mi atención ahora»: se arma con datos reales de la persona (equipos críticos, firmas de
 * liberación pendientes, OT asignadas, habilitaciones vencidas, notificaciones sin leer y envíos sin sincronizar).
 */
function AtencionAhora() {
  const { usuario } = useAuth();
  const { equipos } = usePlanta();
  const t = (c: string) => tiene(usuario, c);
  const ots = useQuery({ queryKey: ["ordenes"], queryFn: () => api.get<Ot[]>("/api/ordenes"), enabled: t("ordenes.ver"), refetchInterval: 20_000 });
  const hab = useMisHabilitaciones();
  const notif = useNotificaciones();
  const pendientes = usePendientes();
  const firma = t("ordenes.aprobar") || t("plc.aprobar") || t("sst.gestionar") || t("calidad.aprobar") || ["equipos.liberar_tecnica", "equipos.liberar_seguridad", "equipos.liberar_calidad", "equipos.confirmar_produccion"].some(t);
  const apr = useQuery({ queryKey: ["aprobaciones"], queryFn: () => api.get<AprobacionItem[]>("/api/aprobaciones"), enabled: firma, refetchInterval: 30_000 });
  const items: ItemAtencion[] = [];
  const criticos = t("planta.ver") ? equipos.filter((e) => defEstado(e.estado).critico) : [];
  if (criticos.length) items.push({ clave: "eq", nivel: "critico", icono: XOctagon, destino: criticos.length === 1 ? `/explorador?equipo=${criticos[0].codigo}` : "/alertas", texto: criticos.length === 1 ? `${criticos[0].codigo} ${criticos[0].nombre}: ${defEstado(criticos[0].estado).etiqueta.toLowerCase()}` : `${criticos.length} equipos en falla o bloqueados por seguridad`, detalle: criticos.length > 1 ? criticos.slice(0, 4).map((e) => e.codigo).join(", ") : undefined });
  const lib = (apr.data ?? []).filter((a) => a.tipo === "liberacion");
  if (lib.length) items.push({ clave: "lib", nivel: "tarea", icono: UserCheck, destino: lib[0].enlace ?? "/mantenimiento", texto: lib.length === 1 ? `Espera su firma: ${lib[0].titulo}` : `${lib.length} liberaciones de equipo esperan su firma`, detalle: lib.length === 1 ? lib[0].detalle : undefined });
  const otras = (apr.data ?? []).filter((a) => a.tipo !== "liberacion");
  if (otras.length) items.push({ clave: "apr", nivel: "tarea", icono: ShieldCheck, destino: otras[0].enlace ?? (otras[0].tipo === "plc" ? "/automatizacion" : otras[0].tipo === "sst" ? "/seguridad" : "/"), texto: otras.length === 1 ? `Por aprobar: ${otras[0].titulo}` : `${otras.length} solicitudes esperan su aprobación`, detalle: otras.length === 1 ? otras[0].detalle : undefined });
  const mias = (ots.data ?? []).filter((o) => o.asignadoAId === usuario?.id && (o.estado === "abierta" || o.estado === "en_curso"));
  if (mias.length) { const urg = mias.filter((o) => o.prioridad === "critica" || o.prioridad === "alta").length; items.push({ clave: "ot", nivel: urg ? "aviso" : "tarea", icono: Wrench, destino: mias.length === 1 ? `/mantenimiento?orden=${mias[0].id}` : "/mantenimiento", texto: mias.length === 1 ? `Su orden ${mias[0].codigo}: ${mias[0].titulo}` : `${mias.length} órdenes de trabajo asignadas a usted`, detalle: urg ? `${urg} de prioridad alta o crítica` : undefined }); }
  const vencidas = (hab.data ?? []).filter((h) => h.estado === "VENCIDA");
  if (vencidas.length) items.push({ clave: "hab", nivel: "critico", icono: BadgeCheck, destino: "/cargo", texto: `Habilitación vencida: ${vencidas.map((h) => h.nombre).join(", ")}`, detalle: "No puede ejecutar las tareas que la requieren hasta renovarla." });
  const porVencer = (hab.data ?? []).filter((h) => h.estado === "POR VENCER");
  if (porVencer.length) items.push({ clave: "habv", nivel: "aviso", icono: BadgeCheck, destino: "/cargo", texto: `Por vencer: ${porVencer.map((h) => `${h.nombre} (${h.dias} d)`).join(", ")}` });
  const sinLeer = (notif.data?.items ?? []).filter((n) => !n.leida && (n.categoria === "critica" || n.categoria === "tarea" || n.categoria === "aprobacion"));
  if (sinLeer.length) items.push({ clave: "not", nivel: sinLeer.some((n) => n.categoria === "critica") ? "critico" : "tarea", icono: AlertTriangle, destino: sinLeer[0].destino ?? "/", texto: sinLeer.length === 1 ? sinLeer[0].texto : `${sinLeer.length} notificaciones importantes sin leer`, detalle: sinLeer.length > 1 ? sinLeer[0].texto : undefined });
  if (pendientes > 0) items.push({ clave: "sync", nivel: "aviso", icono: RefreshCw, destino: "/", texto: `${pendientes} registros guardados en este equipo esperan conexión para enviarse` });
  const orden = { critico: 0, aviso: 1, tarea: 2 };
  items.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
  const color = { critico: "var(--s-rojo)", aviso: "var(--s-ambar)", tarea: "var(--s-acento)" };
  const cargandoDatos = (t("ordenes.ver") && ots.isLoading) || hab.isLoading;
  return (
    <section aria-label="Requiere su atención" className="tarjeta overflow-hidden">
      <header className="flex items-center gap-2 border-b border-linea-suave px-4 py-2.5"><p className="t-etiqueta flex-1">Requiere su atención</p>{items.length > 0 && <span className="num text-[12px] text-gris">{items.length}</span>}</header>
      {cargandoDatos && items.length === 0 ? <div className="p-4"><Esqueleto className="h-9" /></div> : items.length === 0 ? (
        <p className="flex items-center gap-2 px-4 py-3 text-[13px] text-carbon"><CheckCircle2 className="size-4 text-verde" />Nada requiere su atención ahora. Los avisos nuevos aparecerán aquí y en el centro de notificaciones.</p>
      ) : (
        <ul className="divide-y divide-linea-suave">
          {items.map((x) => (
            <li key={x.clave}>
              <button onClick={() => ir(x.destino)} className={cx("group flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors duration-[140ms] hover:bg-papel-2", x.nivel === "critico" && "bg-rojo-claro")}>
                <span className="h-7 w-[3px] shrink-0 rounded-full" style={{ background: color[x.nivel] }} aria-hidden />
                <x.icono className="size-4 shrink-0" style={{ color: color[x.nivel] }} />
                <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{x.texto}</span>{x.detalle && <span className="block truncate text-[12px] text-gris">{x.detalle}</span>}</span>
                <ArrowRight className="size-4 shrink-0 text-apagado transition-transform duration-[140ms] group-hover:translate-x-0.5 group-hover:text-acento" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ------------------------------------------------------------------------------------------------ inicio por cargo
const ICONO: Partial<Record<Seccion, typeof Wrench>> = { produccion: ClipboardCheck, turno: Users, plan: CalendarDays, mantenimiento: Wrench, explorador: Compass, alertas: Siren, reportar: AlertTriangle, seguridad: HardHat, calidad: ShieldCheck, calibraciones: BadgeCheck, condicion: Route, automatizacion: Cpu, rutinas: ClipboardCheck, panol: Hammer, traspaso: Route };
export const RUTA: Record<Seccion, string> = { inicio: "/", produccion: "/produccion", turno: "/turno", plan: "/plan", mantenimiento: "/mantenimiento", explorador: "/explorador", alertas: "/alertas", reportar: "/reportar", seguridad: "/seguridad", calidad: "/calidad", calibraciones: "/calibraciones", condicion: "/condicion", automatizacion: "/automatizacion", rutinas: "/rutinas", panol: "/panol", traspaso: "/traspaso", cargo: "/cargo", directorio: "/directorio" };

export function InicioRol() {
  const { usuario } = useAuth();
  const exp = experienciaDe(usuario);
  const visibles = new Set(seccionesDe(usuario));
  const acciones = exp.acciones.filter((a) => visibles.has(a));
  const cargo = usuario?.cargoId ?? 0;
  const t = (c: string) => tiene(usuario, c);
  const p = usuario?.perfil ?? "";
  const hora = new Date().getHours();
  const vigila = CATALOGO_CARGOS[cargo]?.alertas ?? exp.alertas;     // las alertas del cargo según el catálogo funcional

  const bloques: ReactNode[] = [];
  const poner = (si: boolean, n: ReactNode) => { if (si) bloques.push(n); };
  if (cargo === 13) {                                           // sala de control
    poner(t("planta.ver"), <AlarmasAbiertas key="al" />); poner(t("planta.ver"), <EstadoEquipos key="eq" titulo="Estado de la planta" />); poner(true, <MisAvisos key="av" />);
  } else if (p === "operador") {
    poner(t("produccion.ver"), <MiOrden key="mo" />); poner(t("planta.ver") && t("produccion.ver"), <MiEquipo key="me" />); poner(true, <MisHabilitaciones key="mh" />);
    poner(true, <ChecklistMiEquipo key="ck" />); poner(t("ordenes.ver"), <MisAvisos key="av" />);
    poner(cargo === 14, <EnPlan key="pl" modulos={["Tareas de traslado asignadas en SIMA", "Registro de movimientos por ubicación"]} />);
    poner(cargo === 15, <EnPlan key="pl" modulos={["Solicitudes de reposición de las estaciones"]} />);
  } else if (p === "supervisor_turno") {
    poner(true, <CifrasTurno key="ct" />); poner(t("produccion.ver"), <OrdenesProduccion key="op" registrar={t("produccion.registrar")} />);
    poner(t("planta.ver"), <EstadoEquipos key="eq" titulo={cargo === 8 ? "Equipos de la línea" : "Equipos"} />);
    poner(t("habilitaciones.ver") && cargo === 7, <HabilitacionesEquipo key="hb" />); poner(t("sst.ver"), <EventosSst key="sst" titulo="Seguridad del turno" />);
    poner(cargo === 8, <ChecklistPendiente key="ck" titulo="Checklist de arranque y rutinas" />);
  } else if (p === "tecnico") {
    poner(true, <MisOt key="mo" />); poner(true, <MisHabilitaciones key="mh" />); poner(t("repuestos.ver"), <StockCritico key="sk" />);
  } else if (p === "supervisor_mant") {
    poner(true, <PorVerificar key="pv" />); poner(true, <CargaCuadrilla key="cc" />); poner(t("habilitaciones.ver"), <HabilitacionesEquipo key="hb" />); poner(t("planta.ver"), <EstadoEquipos key="eq" />);
  } else if (p === "jefe_mant" && cargo === 24) {                // planificación
    poner(true, <SemanaOt key="sm" />); poner(true, <CargaCuadrilla key="cc" />); poner(t("repuestos.ver"), <StockCritico key="sk" />);
  } else if (p === "jefe_mant") {
    poner(true, <GestionMantenimiento key="gm" />); poner(t("ordenes.aprobar"), <PorVerificar key="pv" />); poner(true, <CargaCuadrilla key="cc" />);
  } else if (p === "confiabilidad") {
    poner(t("planta.ver"), <RankingCondicion key="rc" />); poner(true, <ChecklistPendiente key="ck" titulo="Rutas e inspecciones pendientes" />); poner(t("ordenes.ver"), <MisOt key="mo" />); poner(true, <MisHabilitaciones key="mh" />);
  } else if (p === "ing_automatizacion") {
    poner(t("plc.ver"), <EstadoPlcs key="pl" />); poner(t("plc.ver"), <CambiosPlc key="cp" titulo={cargo === 19 ? "Mis cambios de programa" : "Cambios de programa"} />); poner(t("planta.ver"), <AlarmasAbiertas key="al" />);
  } else if (p === "instrumentacion") {
    poner(t("herramientas.ver"), <Instrumentos key="in" />); poner(t("ordenes.ver"), <MisOt key="mo" />); poner(true, <MisHabilitaciones key="mh" />);
  } else if (p === "panol" && cargo === 30) {
    poner(t("repuestos.ver"), <StockCritico key="sk" />); poner(t("ordenes.ver"), <SemanaOt key="sm" />); poner(t("herramientas.ver"), <Instrumentos key="in" />);
  } else if (p === "panol") {                                     // recepción, bodega y preparación (39–41)
    poner(true, <MisHabilitaciones key="mh" />);
    poner(true, <EnPlan key="pl" modulos={cargo === 39 ? ["Órdenes de compra por recibir", "Registro de recepciones con lote y ubicación", "Diferencias de cantidad"] : cargo === 40 ? ["Existencias por ubicación", "Conteos cíclicos y diferencias", "Tareas de la bodega por persona"] : ["Mis tareas de picking y reposición", "Confirmación por ubicación"]} />);
  } else if (p === "calidad_terreno") {
    poner(t("calidad.ver"), <NcAbiertas key="nc" />); poner(t("herramientas.ver"), <Instrumentos key="in" />);
    poner(cargo === 34, <EnPlan key="pl" modulos={["Registro de muestras y ensayos", "Informes de ensayo trazados al lote"]} />);
  } else if (p === "prevencion") {
    poner(t("sst.ver"), <EventosSst key="sst" titulo={cargo === 50 ? "Eventos por investigar" : "Eventos de seguridad"} />); poner(cargo === 50 && t("habilitaciones.ver"), <HabilitacionesEquipo key="hb" />);
    poner(cargo !== 50, <EnPlan key="pl" modulos={cargo === 51 ? ["Observaciones y recomendaciones del comité", "Actas con seguimiento"] : cargo === 52 ? ["Registro de residuos y consumos", "Permisos ambientales y monitoreos"] : cargo === 53 ? ["Evaluaciones de puesto (sin datos clínicos)", "Medidas preventivas por puesto"] : ["Plan de emergencia y rol asignado", "Inspección de equipamiento y simulacros"]} />);
  }
  bloques.push(<MisIndicadores key="ind" cargoId={cargo} />);

  return (
    <div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: TIEMPO.pantalla, ease: CURVA }} className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12.5px] text-gris">{hora < 12 ? "Buenos días" : hora < 20 ? "Buenas tardes" : "Buenas noches"}, {usuario?.nombre.split(" ")[0]} · {usuario?.cargo}</p>
          <h1 className="t-pantalla mt-0.5">{exp.inicio}</h1>
          <p className="mt-1 max-w-[80ch] text-[13px] text-gris">{exp.enfoque}</p>
        </div>
        {acciones.length > 0 && (
          <div>
            <p className="t-etiqueta mb-1.5 text-right">Qué hacer</p>
            <div className="flex flex-wrap justify-end gap-2">{acciones.map((a) => { const I = ICONO[a] ?? Play; return <Boton key={a} variante={a === acciones[0] ? "acento" : "secundario"} onClick={() => ir(RUTA[a])}><I className="size-4" />{SECCIONES[a].titulo}</Boton>; })}</div>
          </div>
        )}
      </motion.div>
      <AtencionAhora />
      <p className="t-etiqueta mb-2 mt-5">Qué está pasando</p>
      <div className="grid gap-4 xl:grid-cols-3">
        {bloques}
        <MiJornada cargoId={cargo} abierta={bloques.length <= 3} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-[12px] text-gris">
        <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-acento" />{exp.alcance}</span>
        {vigila.length > 0 && <span>Este inicio vigila: {vigila.join(" · ")}.</span>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ pantallas
export function Produccion() {
  const { usuario } = useAuth();
  const operador = usuario?.perfil === "operador";
  return (
    <div>
      <Encabezado titulo="Producción" texto={operador ? "Su orden en curso y el registro de unidades conformes y rechazadas." : "Las órdenes del turno, su avance y el registro de producción."} />
      <div className="grid gap-4 xl:grid-cols-3">{operador ? <><MiOrden /><MiEquipo /></> : <OrdenesProduccion registrar={tiene(usuario, "produccion.registrar")} />}</div>
    </div>
  );
}

interface Asistencia { id: number; trabajadorId: string; trabajador: string; cargo: string; diasProgramados: number; diasTrabajados: number; diasLicencia: number; diasVacaciones: number; ausentismo: number; periodo: string }
export function Turno() {
  const { data } = useQuery({ queryKey: ["asistencia"], queryFn: () => api.get<Asistencia[]>("/api/asistencia") });
  return (
    <div>
      <Encabezado titulo="Mi equipo de turno" texto="Su equipo, su asistencia del último período y sus habilitaciones. Solo ve a las personas a su cargo; sin sueldos ni datos personales." />
      <div className="grid gap-4 xl:grid-cols-3">
        <CifrasTurno />
        <Bloque titulo={`Asistencia · período ${data?.[0]?.periodo ?? "—"}`} icono={<Users className="size-4" />} className="xl:col-span-2">
          {!data ? <Esqueleto className="h-40" /> : data.length === 0 ? <p className="rounded-md border border-dashed border-linea p-6 text-center text-[13px] text-gris">No tiene personas a su cargo en el organigrama.</p> : (
            <table className="w-full text-[13px]"><thead><tr className="text-left text-[11.5px] uppercase tracking-wider text-gris"><th className="py-1.5">Persona</th><th>Cargo</th><th className="text-right">Trabajados</th><th className="text-right">Licencia</th><th className="text-right">Vacaciones</th><th className="text-right">Ausentismo</th></tr></thead>
              <tbody>{data.map((a) => <tr key={a.id} className="border-t border-linea-suave"><td className="py-2 font-medium">{a.trabajador}</td><td className="text-gris">{a.cargo}</td><td className="num text-right">{a.diasTrabajados}/{a.diasProgramados}</td><td className="num text-right">{a.diasLicencia}</td><td className="num text-right">{a.diasVacaciones}</td><td className={cx("num text-right font-semibold", a.ausentismo > 0.05 ? "text-ambar" : "")}>{(a.ausentismo * 100).toFixed(1)} %</td></tr>)}</tbody></table>
          )}
          <p className="mt-3 text-[11.5px] text-gris">La asistencia diaria y la asignación de puestos están en la fase 2 del plan; hoy SIMA tiene el resumen mensual que carga RR. HH.</p>
        </Bloque>
        <HabilitacionesEquipo />
      </div>
    </div>
  );
}

interface Persona { id: string; nombre: string; cargoId: number; cargo: string; perfil: string }
const CARGOS_TECNICOS = [18, 19, 20, 22, 25, 26, 27, 28, 29, 35];
export function Plan() {
  const qc = useQueryClient(); const aviso = useAviso();
  const { data } = useOts();
  const tecnicos = useQuery({ queryKey: ["directorio", "tecnicos"], queryFn: () => api.get<Persona[]>("/api/directorio"), select: (l) => l.filter((p) => CARGOS_TECNICOS.includes(p.cargoId)) });
  const [sel, setSel] = useState<Ot | null>(null);
  const [form, setForm] = useState({ asignadoAId: "", programada: "", prioridad: "", especialidad: "" });
  const backlog = (data ?? []).filter((o) => o.estado === "abierta").sort((a, b) => Number(!!a.programada) - Number(!!b.programada) || ["critica", "alta", "media", "baja"].indexOf(a.prioridad) - ["critica", "alta", "media", "baja"].indexOf(b.prioridad));
  const abrir = (o: Ot) => { setSel(o); setForm({ asignadoAId: o.asignadoAId ?? "", programada: o.programada ?? "", prioridad: o.prioridad, especialidad: o.especialidad }); };
  const sugeridos = (o: Ot) => (tecnicos.data ?? []).filter((p) => !ESPECIALIDAD_CARGO[p.cargoId] || ESPECIALIDAD_CARGO[p.cargoId].includes(o.especialidad) || o.especialidad === "general");
  const guardar = useMutation({
    mutationFn: () => api.post<{ version: number; cambios?: string[] }>(`/api/ordenes/${sel!.id}/planificar`, { version: sel!.version, asignadoAId: form.asignadoAId || null, programada: form.programada || null, prioridad: form.prioridad, especialidad: form.especialidad, quitarAsignacion: !form.asignadoAId && !!sel!.asignadoAId, quitarFecha: !form.programada && !!sel!.programada }),
    onSuccess: (r) => { aviso(r.cambios?.length ? `${sel!.codigo}: ${r.cambios.join(", ")}. El técnico recibió el aviso.` : "Sin cambios."); setSel(null); void qc.invalidateQueries({ queryKey: ["ordenes"] }); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  return (
    <div>
      <Encabezado titulo="Plan de mantenimiento" texto="Prepare y programe: fecha, técnico de la especialidad y prioridad. La ejecución la firma el técnico asignado y el cierre lo verifica la supervisión." />
      <div className="grid gap-4 xl:grid-cols-3">
        <SemanaOt />
        <Bloque titulo={`Backlog por programar · ${backlog.length}`} icono={<CalendarDays className="size-4" />}>
          {!data ? <Esqueleto className="h-40" /> : (
            <ul className="grid max-h-[520px] gap-2 overflow-y-auto pr-1">{backlog.map((o) => (
              <li key={o.id}><button onClick={() => abrir(o)} className={cx("relative flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-md border px-3.5 py-2.5 text-left", sel?.id === o.id ? "border-acento bg-acento-claro" : "border-linea-suave hover:border-linea")}>
                <span className="absolute inset-y-0 left-0 w-1" style={{ background: PRIO[o.prioridad]?.c }} />
                <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium">{o.titulo}</span><span className="text-[12px] text-gris">{o.codigo} · {o.equipo} · {ESP[o.especialidad]}</span></span>
                <span className="text-right text-[11.5px]">{o.programada ? <span className="text-verde">{new Date(o.programada + "T12:00").toLocaleDateString("es-CL", { weekday: "short", day: "numeric" })}</span> : <span className="text-ambar">sin fecha</span>}<br />{o.asignado ? <span className="text-gris">{o.asignado.split(" ")[0]}</span> : <span className="text-ambar">sin técnico</span>}</span>
              </button></li>))}</ul>
          )}
        </Bloque>
        <CargaCuadrilla />
      </div>
      <AnimatePresence>
        {sel && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: TIEMPO.panel, ease: CURVA }} className="fixed bottom-10 right-6 z-30 w-[420px] rounded-lg border border-linea bg-papel p-5 shadow-[var(--s-sombra-flotante)]">
            <p className="num text-[12px] text-gris">{sel.codigo} · {sel.equipo}</p>
            <p className="mb-3 font-semibold">{sel.titulo}</p>
            <div className="grid gap-3">
              <label className="grid gap-1 text-[12.5px] text-gris">Técnico
                <Seleccion value={form.asignadoAId} onChange={(e) => setForm({ ...form, asignadoAId: e.target.value })}><option value="">Sin asignar</option>{sugeridos(sel).map((p) => <option key={p.id} value={p.id}>{p.nombre} · {p.cargo}</option>)}</Seleccion></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-[12.5px] text-gris">Fecha<Entrada type="date" value={form.programada} onChange={(e) => setForm({ ...form, programada: e.target.value })} /></label>
                <label className="grid gap-1 text-[12.5px] text-gris">Prioridad<Seleccion value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })}>{["critica", "alta", "media", "baja"].map((x) => <option key={x}>{x}</option>)}</Seleccion></label>
              </div>
              <label className="grid gap-1 text-[12.5px] text-gris">Especialidad<Seleccion value={form.especialidad} onChange={(e) => setForm({ ...form, especialidad: e.target.value })}>{Object.entries(ESP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Seleccion></label>
              <p className="text-[11.5px] text-gris">Solo se muestran técnicos de esa especialidad. El servidor rechaza a quien no tenga la cuenta activa y avisa si otra persona cambió la orden mientras tanto.</p>
              <div className="flex justify-end gap-2"><Boton variante="texto" onClick={() => setSel(null)}>Cancelar</Boton><Boton variante="acento" cargando={guardar.isPending} onClick={() => guardar.mutate()}>Guardar en el plan</Boton></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface Incidente { id: number; codigo: string; fecha: string; zona: string; equipo?: string | null; tipo: string; severidad: string; descripcion: string; estado: string; reportadoPor: string; controlInmediato?: string }
export function Seguridad() {
  const { usuario } = useAuth();
  const qc = useQueryClient(); const aviso = useAviso();
  const areas = useQuery({ queryKey: ["areas"], queryFn: () => api.get<{ id: number; nombre: string }[]>("/api/estructura/areas") });
  const lista = useQuery({ queryKey: ["sst", "incidentes"], queryFn: () => api.get<Incidente[]>("/api/sst/incidentes") });
  const [f, setF] = useState({ tipo: "condicion_insegura", severidad: "leve", areaId: "", descripcion: "", controlInmediato: "" });
  const [cierre, setCierre] = useState<Record<number, string>>({});
  const gestiona = tiene(usuario, "sst.gestionar");
  const reportar = useMutation({
    mutationFn: () => api.post("/api/sst/incidentes", { ...f, areaId: Number(f.areaId) || null }),
    onSuccess: () => { aviso("Reporte enviado a prevención de riesgos. Gracias por avisar."); setF({ ...f, descripcion: "", controlInmediato: "" }); void qc.invalidateQueries({ queryKey: ["sst"] }); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  const avanzar = useMutation({
    mutationFn: (v: { id: number; estado: string }) => api.post(`/api/sst/incidentes/${v.id}/avanzar`, { estado: v.estado, cierre: cierre[v.id] }),
    onSuccess: () => { aviso("Evento actualizado."); void qc.invalidateQueries({ queryKey: ["sst"] }); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  return (
    <div>
      <Encabezado titulo="Seguridad y salud" texto={gestiona ? "Investigue y cierre los eventos con sus medidas de control." : "Reporte una condición insegura, un casi accidente o un incidente. Llega de inmediato a prevención de riesgos."} />
      <div className="grid gap-4 xl:grid-cols-[minmax(340px,1fr)_2fr]">
        <Bloque titulo="Reportar" icono={<HardHat className="size-4" />}>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-1.5">{Object.entries(TIPO_SST).map(([k, v]) => <button key={k} onClick={() => setF({ ...f, tipo: k })} className={cx("h-10 cursor-pointer rounded-md border text-[12.5px] font-medium", f.tipo === k ? "border-acento bg-acento-claro" : "border-linea-suave")}>{v}</button>)}</div>
            <Seleccion value={f.areaId} onChange={(e) => setF({ ...f, areaId: e.target.value })}><option value="">¿Dónde ocurrió?</option>{(areas.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}</Seleccion>
            <Seleccion value={f.severidad} onChange={(e) => setF({ ...f, severidad: e.target.value })}><option value="leve">Leve</option><option value="grave">Grave</option><option value="critica">Crítica</option></Seleccion>
            <AreaTexto value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} placeholder="Qué vio u ocurrió" className="min-h-24" />
            <Entrada value={f.controlInmediato} onChange={(e) => setF({ ...f, controlInmediato: e.target.value })} placeholder="Qué hizo para controlarlo (opcional)" />
            <Boton variante="acento" disabled={!f.areaId || f.descripcion.trim().length < 5} cargando={reportar.isPending} onClick={() => reportar.mutate()}>Enviar reporte</Boton>
          </div>
        </Bloque>
        <Bloque titulo={gestiona ? "Eventos de la planta" : "Mis reportes"} icono={<ShieldCheck className="size-4" />}>
          {!lista.data ? <Esqueleto className="h-40" /> : lista.data.length === 0 ? <p className="rounded-md border border-dashed border-linea p-6 text-center text-[13px] text-gris">Sin eventos registrados.</p> : (
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">{lista.data.slice(0, 30).map((i) => (
              <li key={i.id} className="rounded-md border border-linea-suave p-3">
                <div className="flex items-center justify-between gap-2"><p className="text-[13.5px] font-medium">{i.codigo} · {TIPO_SST[i.tipo]} · {i.zona}</p><Chip tono={i.estado === "cerrado" ? "ok" : i.tipo === "accidente" ? "peligro" : "aviso"} punto={false}>{i.estado}</Chip></div>
                <p className="text-[13px] text-gris">{i.descripcion}</p>
                <p className="text-[11.5px] text-gris">{i.reportadoPor} · {hace(i.fecha)} · {i.severidad}</p>
                {gestiona && i.estado !== "cerrado" && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {i.estado === "reportado" && <Boton tam="s" variante="contorno" onClick={() => avanzar.mutate({ id: i.id, estado: "investigacion" })}>Iniciar investigación</Boton>}
                    <Entrada value={cierre[i.id] ?? ""} onChange={(e) => setCierre({ ...cierre, [i.id]: e.target.value })} placeholder="Medidas de control con que se cierra" className="h-8 min-w-[240px] flex-1 text-[12.5px]" />
                    <Boton tam="s" variante="acento" disabled={!(cierre[i.id] ?? "").trim()} onClick={() => avanzar.mutate({ id: i.id, estado: "cerrado" })}>Cerrar</Boton>
                  </div>
                )}
              </li>))}</ul>
          )}
        </Bloque>
      </div>
    </div>
  );
}

interface Nc { id: number; codigo: string; fecha: string; lote: string; producto: string; equipo?: string | null; tipo: string; severidad: string; descripcion: string; cantidad: number; estado: string; registradaPor: string }
function NcAbiertas() {
  const { data } = useQuery({ queryKey: ["calidad", "nc"], queryFn: () => api.get<Nc[]>("/api/calidad/nc") });
  const abiertas = (data ?? []).filter((n) => n.estado !== "cerrada" && n.estado !== "resuelta");
  return (
    <Bloque titulo={`No conformidades abiertas · ${abiertas.length}`} icono={<ShieldCheck className="size-4" />} enlace={{ t: "Inspección", r: "/calidad" }} className="xl:col-span-2">
      {!data ? <Esqueleto className="h-32" /> : abiertas.length === 0 ? <p className="rounded-md border border-dashed border-linea p-6 text-center text-[13px] text-gris">No hay no conformidades abiertas.</p> : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">{abiertas.slice(0, 8).map((n) => <li key={n.id} className="flex items-center gap-3 rounded-md border border-linea-suave px-3 py-2.5"><span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium">{n.producto} · lote {n.lote}</span><span className="text-[12px] text-gris">{n.codigo} · {n.tipo} · {n.cantidad} unidades · {hace(n.fecha)}</span></span><Chip tono={n.severidad === "critica" ? "peligro" : n.severidad === "mayor" ? "aviso" : "info"} punto={false}>{n.estado.replace("_", " ")}</Chip></li>)}</ul>
      )}
    </Bloque>
  );
}
export function Calidad() {
  const qc = useQueryClient(); const aviso = useAviso();
  const { equipos } = usePlanta();
  const { data: ops } = useOps("activas");
  const [f, setF] = useState({ ordenId: "", tipo: "dimensional", severidad: "menor", descripcion: "", cantidad: 1 });
  const op = (ops ?? []).find((o) => String(o.id) === f.ordenId);
  const registrar = useMutation({
    mutationFn: () => api.post("/api/calidad/nc", { producto: op!.producto, lote: op!.lote, ordenId: op!.id, equipo: op!.equipo, tipo: f.tipo, severidad: f.severidad, descripcion: f.descripcion, cantidad: f.cantidad }),
    onSuccess: () => { aviso("No conformidad registrada: el lote queda retenido y calidad y producción reciben el aviso."); setF({ ...f, descripcion: "", cantidad: 1 }); void qc.invalidateQueries({ queryKey: ["calidad"] }); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  return (
    <div>
      <Encabezado titulo="Inspección de calidad" texto="Registre lo que no cumple: el lote queda retenido hasta que la jefatura de calidad decida liberarlo o rechazarlo." />
      <div className="grid gap-4 xl:grid-cols-3">
        <Bloque titulo="Registrar no conformidad" icono={<AlertTriangle className="size-4" />}>
          <div className="grid gap-3">
            <Seleccion value={f.ordenId} onChange={(e) => setF({ ...f, ordenId: e.target.value })}><option value="">Orden y lote inspeccionado…</option>{(ops ?? []).map((o) => <option key={o.id} value={o.id}>{o.codigo} · {o.producto} · lote {o.lote}</option>)}</Seleccion>
            <div className="grid grid-cols-2 gap-2">
              <Seleccion value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>{["dimensional", "visual", "funcional", "material", "etiquetado"].map((x) => <option key={x}>{x}</option>)}</Seleccion>
              <Seleccion value={f.severidad} onChange={(e) => setF({ ...f, severidad: e.target.value })}><option value="menor">Menor</option><option value="mayor">Mayor</option><option value="critica">Crítica</option></Seleccion>
            </div>
            <AreaTexto value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} placeholder="Qué no cumple: criterio, medición y muestra" className="min-h-24" />
            <label className="flex items-center justify-between gap-2 text-[13px] text-gris">Unidades afectadas<Entrada type="number" min={1} value={f.cantidad} onChange={(e) => setF({ ...f, cantidad: Math.max(1, Number(e.target.value) || 1) })} className="w-28" /></label>
            {op && !equipos.length && <p className="text-[11.5px] text-gris">Equipo de la orden: {op.equipo}.</p>}
            <Boton variante="acento" disabled={!op || f.descripcion.trim().length < 5} cargando={registrar.isPending} onClick={() => registrar.mutate()}>Registrar y retener el lote</Boton>
          </div>
        </Bloque>
        <NcAbiertas />
      </div>
    </div>
  );
}

export function Calibraciones() {
  return <div><Encabezado titulo="Instrumentos y calibración" texto="Vencimientos de calibración. Un instrumento vencido no se puede retirar del pañol." /><div className="grid gap-4 xl:grid-cols-3"><Instrumentos completo /></div></div>;
}
export function Condicion() {
  return <div><Encabezado titulo="Condición de activos" texto="Equipos más cerca de su límite de vibración y temperatura, y las rutas pendientes." /><div className="grid gap-4 xl:grid-cols-3"><RankingCondicion limite={14} /><ChecklistPendiente titulo="Rutas e inspecciones pendientes" /></div></div>;
}
export function Automatizacion() {
  return (
    <div>
      <Encabezado titulo="PLC y automatización" texto="Estado de los controladores y cambios de programa. Un cambio lo publica otra persona con la facultad de aprobación (control de cuatro ojos)." />
      <div className="grid gap-4 xl:grid-cols-3"><EstadoPlcs /><CambiosPlc /><AlarmasAbiertas /></div>
      <p className="mt-4 text-[12.5px] text-gris">Las pruebas de lógica se hacen en SIMA PLC Simulator. Todo lo que envía el simulador queda marcado como simulado y nunca se mezcla con un PLC físico.</p>
    </div>
  );
}
