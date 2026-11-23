import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft, ArrowRight, BadgeCheck, Check, CheckCircle2, ClipboardList, Clock, FlaskConical, HardHat, Lock, Minus, Plus, Search, ShieldCheck, Stethoscope, Trash2, Undo2, Unlock, UserCheck, Wrench, XCircle,
} from "lucide-react";
import type { FichaEquipo, LiberacionOt } from "@sima/cliente";
import { AreaTexto, Boton, Chip, CURVA, Entrada, Esqueleto, EstadoEquipo, EstadoVista, MarcaSimulado, Maquina, TIEMPO, cx, mensajeDe, useAviso } from "@sima/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { enviar, uidNuevo } from "../lib/offline";
import { usePlanta } from "../lib/planta";
import { ir, useParametro } from "../ruta";
import { ESPECIALIDAD_CARGO, tiene } from "../roles";
import { ESP, ESTADO_OT } from "./bloques";

interface Orden { id: number; codigo: string; equipo: string; equipoNombre: string; titulo: string; descripcion: string; prioridad: string; estado: string; automatica: boolean; simulada?: boolean; especialidad: string; programada?: string | null; creada: string; cerrada?: string | null; asignado?: string | null; asignadoAId?: string | null }
interface DetalleOrden {
  id: number; codigo: string; titulo: string; descripcion: string; tipo: string; prioridad: string; estado: string; asignadoAId?: string | null; asignado?: string | null; creada: string; version: number;
  especialidad: string; programada?: string | null; automatica: boolean; simulada: boolean; cierreSolicitado?: string | null; verificadaPor?: string | null; verificadaEn?: string | null; liberacion?: LiberacionOt;
  equipo: { codigo: string; nombre: string; tipo: string; estado: string; area: string; linea: string }; intervenciones: { id: number; tecnicoNombre: string; accion: string; resultado: string; fin: string; diagnostico?: string }[]
}
type Filtro = "mias" | "abierta" | "en_curso" | "por_verificar" | "cerrada";
const FILTROS: [Filtro, string][] = [["mias", "Mías"], ["abierta", "Por tomar"], ["en_curso", "En curso"], ["por_verificar", "Por liberar"], ["cerrada", "Cerradas"]];
interface Herramienta { id: number; codigo: string; nombre: string; estado: string }
interface Repuesto { id: number; codigo: string; nombre: string; stock: number; stockMinimo: number; ubicacion: string }
interface Prueba { uid: string; descripcion: string; resultado: "conforme" | "no_conforme"; valores: string }

const PRIO: Record<string, { c: string; tono: "peligro" | "aviso" | "info" | "neutro" }> = { critica: { c: "var(--s-rojo)", tono: "peligro" }, alta: { c: "var(--s-ambar)", tono: "aviso" }, media: { c: "var(--s-azul)", tono: "info" }, baja: { c: "var(--s-tenue)", tono: "neutro" } };
const CAUSAS = [["mecanica", "Mecánica"], ["electrica", "Eléctrica"], ["hidraulica", "Hidráulica"], ["neumatica", "Neumática"], ["electronica", "Electrónica"], ["operacional", "Operacional"], ["desgaste", "Desgaste"]] as const;
const LOTO = ["Avisé al operador y al supervisor del equipo", "Detuve el equipo con el procedimiento normal", "Abrí el seccionador y puse mi candado y tarjeta", "Liberé energías residuales y verifiqué que no arranca"];
const PASOS = [{ t: "Revisar", i: ClipboardList }, { t: "Bloqueo LOTO", i: Lock }, { t: "Diagnóstico", i: Stethoscope }, { t: "Intervención", i: Wrench }, { t: "Pruebas y liberación", i: FlaskConical }];
const PRUEBAS_SUGERIDAS = ["Prueba en vacío sin carga", "Prueba con carga nominal", "Verificación de protecciones y paradas de emergencia", "Medición de vibración y temperatura", "Primera pieza conforme"];
const ETAPAS: Record<string, { t: string; quien: string; i: typeof Wrench }> = {
  tecnica: { t: "Liberación técnica", quien: "Supervisión o jefatura de mantenimiento (o responsable de turno habilitado)", i: Wrench },
  seguridad: { t: "Validación de seguridad", quien: "Prevención de riesgos", i: HardHat },
  calidad: { t: "Validación de calidad", quien: "Jefatura o ingeniería de calidad", i: ShieldCheck },
  produccion: { t: "Confirmación de producción", quien: "Supervisión de turno o jefatura de producción", i: UserCheck },
};
const CAP_ETAPA: Record<string, string> = { tecnica: "equipos.liberar_tecnica", seguridad: "equipos.liberar_seguridad", calidad: "equipos.liberar_calidad", produccion: "equipos.confirmar_produccion" };
const hace = (iso: string) => { const m = Math.round((Date.now() - +new Date(iso)) / 60000); return m < 60 ? `hace ${Math.max(1, m)} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`; };
const fechaHora = (iso: string) => new Date(iso).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function Mantenimiento() {
  const { usuario } = useAuth();
  const sel = useParametro("orden");
  const firma = Object.values(CAP_ETAPA).some((c) => tiene(usuario, c)) || tiene(usuario, "ordenes.aprobar");
  const esp = ESPECIALIDAD_CARGO[usuario?.cargoId ?? 0];
  const [filtro, setFiltro] = useState<Filtro>(firma ? "por_verificar" : "mias");
  const [buscar, setBuscar] = useState("");
  const { data: ordenes, isError, refetch } = useQuery({ queryKey: ["ordenes"], queryFn: () => api.get<Orden[]>("/api/ordenes"), refetchInterval: 20_000 });
  const cumple = (o: Orden, f: Filtro) => (f === "mias" ? o.asignadoAId === usuario?.id && o.estado !== "cerrada" : o.estado === f);
  // a cada técnico le aparecen primero las órdenes de su especialidad
  const peso = (o: Orden) => (esp && !esp.includes(o.especialidad) ? 10 : 0) + ["critica", "alta", "media", "baja"].indexOf(o.prioridad);
  const lista = (ordenes ?? []).filter((o) => cumple(o, filtro) && (!buscar || `${o.codigo} ${o.titulo} ${o.equipo}`.toLowerCase().includes(buscar.toLowerCase()))).sort((a, b) => (filtro === "abierta" ? peso(a) - peso(b) : 0));
  const n = (f: Filtro) => (ordenes ?? []).filter((o) => cumple(o, f)).length;
  useEffect(() => { if (ordenes && filtro === "mias" && n("mias") === 0) setFiltro("abierta"); if (ordenes && filtro === "por_verificar" && n("por_verificar") === 0) setFiltro(n("mias") ? "mias" : "abierta"); }, [ordenes]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="grid h-[calc(100dvh-112px)] min-h-[560px] gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col">
        <h1 className="t-pantalla">Órdenes de trabajo</h1>
        <p className="mb-3 mt-0.5 text-[12.5px] text-gris">{firma ? "Firme las liberaciones que le corresponden. También puede ejecutar las órdenes asignadas a usted." : "Tome una orden, bloquee el equipo, diagnostique, intervenga, pruebe y pida la liberación."}</p>
        <div role="tablist" className="mb-2.5 flex gap-px overflow-hidden rounded-md border border-linea-suave bg-linea-suave">
          {FILTROS.map(([k, t]) => (
            <button key={k} role="tab" aria-selected={filtro === k} onClick={() => setFiltro(k)} className={cx("relative flex flex-1 cursor-pointer flex-col items-center py-1.5 text-[11.5px] font-medium leading-tight transition-colors duration-[140ms]", filtro === k ? "bg-papel-2 text-negro" : "bg-papel text-gris hover:text-negro")}>
              <span className="whitespace-nowrap">{t}</span><span className={cx("num text-[12px]", k === "por_verificar" && firma && n(k) > 0 ? "font-bold text-acento" : "text-gris")}>{n(k)}</span>
              {filtro === k && <motion.span layoutId="filtro-ot" className="absolute inset-x-0 bottom-0 h-0.5 bg-acento" transition={{ duration: TIEMPO.componente, ease: CURVA }} />}
            </button>
          ))}
        </div>
        <label className="relative mb-2.5 block"><Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gris" /><Entrada value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar orden o equipo" className="pl-8" aria-label="Buscar orden o equipo" /></label>
        <ul className="-mx-1 min-h-0 flex-1 space-y-1.5 overflow-y-auto px-1 pb-2">
          {isError && <li><EstadoVista tipo="error" compacto texto="No se pudieron cargar las órdenes." accion={<Boton tam="s" variante="contorno" onClick={() => void refetch()}>Reintentar</Boton>} /></li>}
          {!ordenes && !isError && [0, 1, 2, 3].map((i) => <Esqueleto key={i} className="h-[74px]" />)}
          {ordenes && lista.length === 0 && <li className="rounded-md border border-dashed border-linea p-6 text-center text-[12.5px] text-gris">{buscar ? `Sin órdenes que coincidan con «${buscar}».` : "No hay órdenes en esta bandeja."}</li>}
          <AnimatePresence initial={false}>
            {lista.map((o) => (
              <motion.li key={o.id} layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: TIEMPO.micro }}>
                <button onClick={() => ir(`/mantenimiento?orden=${o.id}`)} aria-current={String(o.id) === sel ? "true" : undefined}
                  className={cx("relative w-full cursor-pointer overflow-hidden rounded-md border px-3 py-2.5 text-left transition-colors duration-[140ms]", String(o.id) === sel ? "border-acento/60 bg-papel-2" : "border-linea-suave bg-papel hover:border-linea")}>
                  <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: PRIO[o.prioridad]?.c }} />
                  <div className="flex items-center justify-between gap-2"><span className="t-dato truncate text-[11.5px] text-gris">{o.codigo} · {o.equipo} · {ESP[o.especialidad] ?? o.especialidad}</span><span className="flex shrink-0 gap-1">{o.simulada && <MarcaSimulado />}<Chip tono={PRIO[o.prioridad]?.tono} punto={false}>{o.prioridad}</Chip></span></div>
                  <p className="mt-1 text-[13px] font-medium leading-snug">{o.titulo}</p>
                  <p className="mt-0.5 text-[11.5px] text-gris">{o.estado === "en_curso" ? `en ejecución · ${o.asignado}` : o.estado === "por_verificar" ? `por liberar · ejecutó ${o.asignado}` : o.estado === "cerrada" ? `cerrada ${hace(o.cerrada ?? o.creada)}` : o.asignado ? `asignada a ${o.asignado}${o.programada ? ` · ${new Date(o.programada + "T12:00").toLocaleDateString("es-CL", { weekday: "short", day: "numeric" })}` : ""}` : `creada ${hace(o.creada)}`}{o.automatica && " · automática"}</p>
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
      <div className="tarjeta min-h-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          {sel ? <Flujo key={sel} id={Number(sel)} /> : (
            <motion.div key="vacio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid h-full place-items-center p-10">
              <EstadoVista tipo="vacio" titulo="Elija una orden" texto="El flujo lo guía: revisar, bloquear con LOTO, diagnosticar, intervenir con repuestos y herramientas, probar y pedir la liberación por etapas." />
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
  const { data: ot, isError } = useQuery({ queryKey: ["orden", id], queryFn: () => api.get<DetalleOrden>(`/api/ordenes/${id}`) });
  const ficha = useQuery({ queryKey: ["equipo", ot?.equipo.codigo], queryFn: () => api.get<FichaEquipo>(`/api/equipos/${ot!.equipo.codigo}`), enabled: !!ot });
  // herramientas y repuestos solo los consulta quien ejecuta (quien firma una liberación no los necesita ni siempre puede verlos)
  const herramientas = useQuery({ queryKey: ["herramientas"], queryFn: () => api.get<Herramienta[]>("/api/herramientas"), enabled: tiene(usuario, "herramientas.ver") && tiene(usuario, "ordenes.ejecutar") });
  const catalogo = useQuery({ queryKey: ["repuestos"], queryFn: () => api.get<Repuesto[]>("/api/repuestos"), enabled: tiene(usuario, "repuestos.ver") && tiene(usuario, "ordenes.ejecutar") });
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
  const [pruebas, setPruebas] = useState<Prueba[]>([]);
  const [nueva, setNueva] = useState<Omit<Prueba, "uid">>({ descripcion: "", resultado: "conforme", valores: "" });
  const [afecta, setAfecta] = useState({ seguridad: false, calidad: false });
  const [listo, setListo] = useState<null | { encolado: boolean; cerrada: boolean; etapas: string[] }>(null);
  const [inicio] = useState(() => new Date().toISOString());
  const ejecuta = tiene(usuario, "ordenes.ejecutar");
  const mia = ot?.asignadoAId === usuario?.id;
  // una OT asignada la toma su técnico; la supervisión puede reasignarla en el plan
  const deOtro = !!ot?.asignadoAId && !mia && !tiene(usuario, "ordenes.asignar");
  // borrador local: si se cierra la ventana a mitad del trabajo, lo escrito no se pierde
  const claveBorrador = `sima.borrador.ot.${id}`;
  useEffect(() => { try { const b = JSON.parse(localStorage.getItem(claveBorrador) ?? "null"); if (b) { setCausa(b.causa ?? ""); setDiagnostico(b.diagnostico ?? ""); setAccion(b.accion ?? ""); setPruebas(b.pruebas ?? []); setObservaciones(b.observaciones ?? ""); } } catch { /* sin borrador */ } }, [claveBorrador]);
  useEffect(() => { try { if (causa || diagnostico || accion || pruebas.length) localStorage.setItem(claveBorrador, JSON.stringify({ causa, diagnostico, accion, pruebas, observaciones })); } catch { /* sin almacenamiento */ } }, [claveBorrador, causa, diagnostico, accion, pruebas, observaciones]);
  const sinGuardar = !!(diagnostico || accion || pruebas.length) && !listo;
  useEffect(() => { if (!sinGuardar) return; const f = (e: BeforeUnloadEvent) => { e.preventDefault(); }; window.addEventListener("beforeunload", f); return () => window.removeEventListener("beforeunload", f); }, [sinGuardar]);

  useEffect(() => { if (ot) setPaso(ot.estado === "en_curso" && mia ? 2 : 0); }, [ot?.id, ot?.estado]); // eslint-disable-line react-hooks/exhaustive-deps
  const refrescar = () => { for (const k of ["ordenes", "orden", "equipos", "equipo", "resumen", "repuestos", "aprobaciones"]) void qc.invalidateQueries({ queryKey: [k] }); };
  const tomar = useMutation({
    mutationFn: () => api.post(`/api/ordenes/${id}/tomar`, { lotoConfirmado: true }),
    onSuccess: () => { aviso(`Orden tomada. ${ot?.equipo.codigo} queda en diagnóstico con su bloqueo.`, "ok"); refrescar(); setPaso(2); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  // informa la etapa al servidor para que toda la planta vea el estado real del equipo (si no hay red, lo hará la intervención)
  const etapa = (e: "mantenimiento" | "pruebas") => { if (conexion === "conectado" && mia) void api.post(`/api/ordenes/${id}/etapa`, { etapa: e }).then(refrescar).catch(() => undefined); };
  const ultimaConforme = pruebas.length > 0 && pruebas[pruebas.length - 1].resultado === "conforme";
  const registrar = useMutation({
    mutationFn: () => enviar("POST", `/api/ordenes/${id}/intervenciones`, {
      inicio, fin: new Date().toISOString(), causa, diagnostico, accion, resultado, observaciones,
      repuestos: Object.entries(rep).filter(([, c]) => c > 0).map(([r, c]) => ({ repuestoId: Number(r), cantidad: c })), herramientas: herrSel, cerrar, lotoRetirado: lotoFuera,
      pruebas: pruebas.map((p) => ({ descripcion: p.descripcion, resultado: p.resultado, valores: p.valores, uid: p.uid })), afectaSeguridad: afecta.seguridad, afectaCalidad: afecta.calidad,
    }),
    onSuccess: (r) => {
      try { localStorage.removeItem(claveBorrador); } catch { /* sin almacenamiento */ }
      setListo({ encolado: r.queued, cerrada: cerrar, etapas: ["tecnica", ...(afecta.seguridad ? ["seguridad"] : []), ...(afecta.calidad ? ["calidad"] : []), "produccion"] }); refrescar();
    },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  const todosRep = useMemo(() => {
    const sugeridos = new Set(ficha.data?.repuestos.map((r) => r.id));
    return [...(ficha.data?.repuestos ?? []), ...(catalogo.data ?? []).filter((r) => !sugeridos.has(r.id) && buscarRep && `${r.codigo} ${r.nombre}`.toLowerCase().includes(buscarRep.toLowerCase())).slice(0, 6)];
  }, [ficha.data, catalogo.data, buscarRep]);

  if (isError) return <EstadoVista tipo="error" texto="No se pudo cargar la orden." />;
  if (!ot) return <div className="p-5"><Esqueleto className="h-24" /><Esqueleto className="mt-4 h-72" /></div>;
  if (listo) return <Confirmacion listo={listo} ot={ot.codigo} equipo={ot.equipo.codigo} />;
  const vivo = equipos.find((e) => e.codigo === ot.equipo.codigo);
  const terminada = ot.estado === "cerrada" || ot.estado === "por_verificar";
  const puedeAvanzar = [true, loto.every(Boolean), !!causa && diagnostico.trim().length > 4, accion.trim().length > 4, !cerrar || (lotoFuera && ultimaConforme)][paso];
  const agregarPrueba = () => { if (nueva.descripcion.trim().length < 4) return; setPruebas((l) => [...l, { ...nueva, descripcion: nueva.descripcion.trim(), uid: uidNuevo() }]); setNueva({ descripcion: "", resultado: "conforme", valores: "" }); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: TIEMPO.componente }} className="flex min-h-full flex-col">
      <div className="flex items-center gap-4 border-b border-linea-suave px-5 py-4">
        <div className="grid h-16 w-24 shrink-0 place-items-center rounded-md border border-linea-suave bg-chapa"><Maquina tipo={ot.equipo.tipo} estado={vivo?.estado ?? ot.equipo.estado} className="h-14 w-20" /></div>
        <div className="min-w-0 flex-1">
          <p className="t-dato text-[11.5px] text-gris">{ot.codigo} · {ot.tipo} · {ot.equipo.area} · {ot.equipo.linea}</p>
          <h2 className="truncate text-[17px] font-semibold leading-tight">{ot.titulo}</h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12.5px] text-gris"><button className="cursor-pointer font-medium text-carbon hover:text-acento" onClick={() => ir(`/explorador?equipo=${ot.equipo.codigo}`)}>{ot.equipo.codigo} {ot.equipo.nombre}</button><EstadoEquipo estado={vivo?.estado ?? ot.equipo.estado} corto tam="s" />· {ot.asignado ? `asignada a ${ot.asignado}` : "sin asignar"}</p>
        </div>
        <span className="flex flex-col items-end gap-1"><Chip tono={ESTADO_OT[ot.estado]?.tono ?? "neutro"}>{ESTADO_OT[ot.estado]?.t ?? ot.estado}</Chip><Chip tono={PRIO[ot.prioridad]?.tono} punto={false}>prioridad {ot.prioridad}</Chip>{ot.simulada && <MarcaSimulado texto="Nació de un PLC simulado" />}</span>
      </div>

      {!terminada && (
        <ol className="flex items-center gap-2 px-5 pt-4" aria-label="Pasos de la orden">
          {PASOS.map((p, i) => (
            <li key={p.t} className="flex flex-1 items-center gap-2" aria-current={i === paso ? "step" : undefined}>
              <span className={cx("grid size-7 shrink-0 place-items-center rounded-full border transition-colors duration-[180ms]", i < paso ? "border-acento bg-acento text-sobre-negro" : i === paso ? "border-acento text-acento" : "border-linea text-gris")}>{i < paso ? <Check className="size-3.5" /> : <p.i className="size-3.5" />}</span>
              <span className={cx("hidden text-[12px] font-medium xl:inline", i === paso ? "text-negro" : "text-gris")}>{p.t}</span>
              {i < PASOS.length - 1 && <span className="relative h-px flex-1 bg-linea"><motion.span className="absolute inset-y-0 left-0 bg-acento" initial={false} animate={{ width: i < paso ? "100%" : "0%" }} transition={{ duration: TIEMPO.pantalla }} /></span>}
            </li>
          ))}
        </ol>
      )}

      <div className="flex-1 p-5">
        <AnimatePresence mode="wait">
          <motion.div key={terminada ? "c" : paso} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: TIEMPO.componente, ease: CURVA }}>
            {terminada && <Liberacion ot={ot} />}
            {!terminada && paso === 0 && (
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="grid content-start gap-3">
                  <p className="t-etiqueta">Qué se informó</p>
                  <p className="whitespace-pre-wrap rounded-md border border-linea-suave bg-chapa p-3.5 text-[13px]">{ot.descripcion || "Sin descripción."}</p>
                  {vivo && <div className="grid grid-cols-2 gap-2">{vivo.sensores.map((s) => <div key={s.variable} className={cx("rounded-md border px-3 py-2", s.nivel === "alarma" ? "border-rojo/50 bg-rojo-claro" : s.nivel === "aviso" ? "border-ambar/40 bg-ambar-claro" : "border-linea-suave")}><p className="truncate text-[11.5px] text-gris">{s.nombre}</p><p className="t-kpi text-[18px]">{s.ultimo?.toFixed(s.max > 50 ? 0 : 1) ?? "—"} <span className="text-[12px] font-normal text-gris">{s.unidad}</span></p></div>)}</div>}
                </div>
                <div className="grid content-start gap-2">
                  <p className="t-etiqueta">Procedimientos del equipo</p>
                  {ficha.data?.documentos.filter((d) => d.clase !== "ficha").map((d) => (
                    <details key={d.id} className="group rounded-md border border-linea-suave bg-papel"><summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-2.5 text-[13px] font-medium">{d.titulo}<ArrowRight className="size-4 text-gris transition-transform duration-[140ms] group-open:rotate-90" /></summary><ol className="seleccionable grid gap-1 border-t border-linea-suave px-3.5 py-3 text-[12.5px]">{d.contenido.split("\n").map((l, k) => <li key={k}>{l}</li>)}</ol></details>
                  ))}
                  {ficha.data && ficha.data.documentos.length === 0 && <p className="text-[12.5px] text-gris">Este equipo no tiene procedimientos cargados.</p>}
                </div>
              </div>
            )}
            {!terminada && paso === 1 && (
              <div className="mx-auto max-w-[620px]">
                <p className="t-seccion text-[16px]">Bloqueo y etiquetado</p>
                <p className="mb-4 text-[13px] text-gris">Confirme cada punto antes de intervenir. Al tomar la orden, el equipo queda «en diagnóstico» para toda la planta y el PLC no puede cambiar su estado.</p>
                <ul className="grid gap-2">
                  {LOTO.map((t, i) => (
                    <li key={t}>
                      <button role="checkbox" aria-checked={loto[i]} onClick={() => setLoto((l) => l.map((x, k) => (k === i ? !x : x)))} className={cx("flex w-full cursor-pointer items-center gap-3 rounded-md border p-3.5 text-left transition-colors duration-[140ms]", loto[i] ? "border-acento/50 bg-acento-claro" : "border-linea-suave bg-papel hover:border-linea")}>
                        <span className={cx("grid size-5 shrink-0 place-items-center rounded border transition-colors duration-[140ms]", loto[i] ? "border-acento bg-acento text-sobre-negro" : "border-linea")}>{loto[i] && <Check className="size-3.5" />}</span>
                        <span className="text-[13.5px]">{t}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {!ejecuta && <p className="mt-4 rounded-md bg-ambar-claro p-3 text-[13px] text-ambar-hondo">Su cargo puede preparar órdenes, pero la ejecución la firma el técnico asignado.</p>}
                {ejecuta && deOtro && <p className="mt-4 rounded-md bg-ambar-claro p-3 text-[13px] text-ambar-hondo">Esta orden está asignada a {ot.asignado}. Si debe tomarla usted, pida a su supervisor o a planificación que se la reasigne.</p>}
                <p className="mt-4 text-[12px] text-gris">Para iniciar necesita su habilitación de bloqueo y etiquetado (LOTO) vigente. El servidor la verifica.</p>
                {conexion !== "conectado" && <p className="mt-3 rounded-md bg-ambar-claro p-3 text-[13px] text-ambar-hondo">Tomar una orden necesita conexión con el servidor (dos técnicos no pueden tomar la misma). Reintente al recuperar la red.</p>}
              </div>
            )}
            {!terminada && paso === 2 && (
              <div className="grid gap-4">
                <div><p className="t-etiqueta mb-2">Tipo de causa</p><div className="flex flex-wrap gap-1.5" role="radiogroup">{CAUSAS.map(([k, t]) => <button key={k} role="radio" aria-checked={causa === k} onClick={() => setCausa(k)} className={cx("h-8 cursor-pointer rounded-md border px-3 text-[13px] font-medium transition-colors duration-[140ms]", causa === k ? "border-acento bg-acento text-sobre-negro" : "border-linea-suave bg-papel hover:border-linea")}>{t}</button>)}</div></div>
                <div><p className="t-etiqueta mb-2">Diagnóstico</p><AreaTexto value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} placeholder="Qué encontró: síntoma, medición y causa probable" className="min-h-28" /></div>
                {ficha.data && ficha.data.alarmas.length > 0 && <div><p className="t-etiqueta mb-2">Fallas recientes del equipo</p><ul className="grid gap-1.5">{ficha.data.alarmas.slice(0, 4).map((a) => <li key={a.id} className="rounded-md border border-linea-suave bg-papel px-3 py-2 text-[12.5px]">{a.mensaje} <span className="text-gris">· {hace(a.inicio)}</span></li>)}</ul></div>}
              </div>
            )}
            {!terminada && paso === 3 && (
              <div className="grid gap-5 xl:grid-cols-2">
                <div className="grid content-start gap-4">
                  <div><p className="t-etiqueta mb-2">Acción realizada</p><AreaTexto value={accion} onChange={(e) => setAccion(e.target.value)} placeholder="Qué hizo: cambio, ajuste, limpieza, calibración…" className="min-h-28" /></div>
                  <div><p className="t-etiqueta mb-2">Herramientas usadas</p>
                    <div className="flex flex-wrap gap-1.5">{(herramientas.data ?? []).slice(0, 18).map((h) => { const s = herrSel.includes(h.id); return <button key={h.id} aria-pressed={s} onClick={() => setHerrSel((l) => (s ? l.filter((x) => x !== h.id) : [...l, h.id]))} className={cx("cursor-pointer rounded border px-2 py-1 text-[12px] transition-colors duration-[140ms]", s ? "border-acento/60 bg-acento-claro text-negro" : "border-linea-suave text-gris hover:border-linea")}>{h.nombre}</button>; })}</div></div>
                </div>
                <div>
                  <p className="t-etiqueta mb-2">Repuestos consumidos</p>
                  <label className="relative mb-2 block"><Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gris" /><Entrada value={buscarRep} onChange={(e) => setBuscarRep(e.target.value)} placeholder="Buscar otro repuesto del pañol" className="pl-8" /></label>
                  <ul className="grid gap-1.5">
                    {todosRep.map((r) => {
                      const c = rep[r.id] ?? 0;
                      return (
                        <li key={r.id} className={cx("flex items-center gap-3 rounded-md border px-3 py-2", c > 0 ? "border-acento/50 bg-acento-claro" : "border-linea-suave bg-papel")}>
                          <span className="min-w-0 flex-1"><span className="block truncate text-[13px]"><b className="t-dato">{r.codigo}</b> {r.nombre}</span><span className={cx("text-[11.5px]", r.stock <= r.stockMinimo ? "text-rojo" : "text-gris")}>{r.stock} en stock · {r.ubicacion}</span></span>
                          <span className="flex items-center gap-1"><Boton tam="s" icono variante="secundario" aria-label="Quitar uno" onClick={() => setRep((m) => ({ ...m, [r.id]: Math.max(0, c - 1) }))}><Minus className="size-3.5" /></Boton><span className="num w-6 text-center font-semibold">{c}</span><Boton tam="s" icono variante="secundario" aria-label="Agregar uno" disabled={c >= r.stock} onClick={() => setRep((m) => ({ ...m, [r.id]: c + 1 }))}><Plus className="size-3.5" /></Boton></span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
            {!terminada && paso === 4 && (
              <div className="mx-auto grid max-w-[720px] gap-4">
                <div><p className="t-etiqueta mb-2">Resultado de la intervención</p><div className="grid grid-cols-3 gap-2" role="radiogroup">{[["resuelto", "Resuelto"], ["parcial", "Parcial"], ["requiere_repuesto", "Falta repuesto"]].map(([k, t]) => <button key={k} role="radio" aria-checked={resultado === k} onClick={() => { setResultado(k); setCerrar(k === "resuelto"); }} className={cx("h-10 cursor-pointer rounded-md border text-[13px] font-medium transition-colors duration-[140ms]", resultado === k ? "border-acento bg-acento-claro" : "border-linea-suave bg-papel hover:border-linea")}>{t}</button>)}</div></div>

                <section className="rounded-md border border-linea-suave bg-papel">
                  <header className="flex items-center gap-2 border-b border-linea-suave px-3.5 py-2.5"><FlaskConical className="size-4 text-azul" /><p className="t-seccion flex-1">Pruebas después de intervenir</p><span className="text-[11.5px] text-gris">{cerrar ? "obligatorias para pedir la liberación" : "opcionales"}</span></header>
                  {pruebas.length > 0 && (
                    <ul className="divide-y divide-linea-suave">
                      {pruebas.map((p, i) => (
                        <li key={p.uid} className="flex items-center gap-3 px-3.5 py-2 text-[13px]">
                          {p.resultado === "conforme" ? <CheckCircle2 className="size-4 shrink-0 text-verde" /> : <XCircle className="size-4 shrink-0 text-rojo" />}
                          <span className="min-w-0 flex-1"><span className="block">{p.descripcion}</span>{p.valores && <span className="t-dato text-gris">{p.valores}</span>}</span>
                          <span className={cx("text-[11.5px] font-semibold", p.resultado === "conforme" ? "text-verde" : "text-rojo")}>{p.resultado === "conforme" ? "Conforme" : "No conforme"}</span>
                          <Boton tam="s" icono variante="texto" aria-label={`Quitar prueba ${i + 1}`} onClick={() => setPruebas((l) => l.filter((x) => x.uid !== p.uid))}><Trash2 className="size-3.5" /></Boton>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="grid gap-2 border-t border-linea-suave p-3.5 first:border-t-0">
                    <div className="flex flex-wrap gap-1">{PRUEBAS_SUGERIDAS.map((x) => <button key={x} onClick={() => setNueva({ ...nueva, descripcion: x })} className="cursor-pointer rounded border border-linea-suave px-2 py-0.5 text-[11.5px] text-gris hover:border-linea hover:text-negro">{x}</button>)}</div>
                    <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
                      <Entrada value={nueva.descripcion} onChange={(e) => setNueva({ ...nueva, descripcion: e.target.value })} placeholder="Qué se probó" aria-label="Descripción de la prueba" onKeyDown={(e) => e.key === "Enter" && agregarPrueba()} />
                      <Entrada value={nueva.valores} onChange={(e) => setNueva({ ...nueva, valores: e.target.value })} placeholder="Valores medidos" className="font-mono" aria-label="Valores medidos" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex rounded-md border border-linea-suave p-0.5" role="radiogroup" aria-label="Resultado de la prueba">
                        {([["conforme", "Conforme"], ["no_conforme", "No conforme"]] as const).map(([k, t]) => <button key={k} role="radio" aria-checked={nueva.resultado === k} onClick={() => setNueva({ ...nueva, resultado: k })} className={cx("h-7 cursor-pointer rounded px-2.5 text-[12px] font-medium", nueva.resultado === k ? (k === "conforme" ? "bg-verde-claro text-verde" : "bg-rojo-claro text-rojo") : "text-gris")}>{t}</button>)}
                      </div>
                      <Boton tam="s" variante="secundario" disabled={nueva.descripcion.trim().length < 4} onClick={agregarPrueba}><Plus className="size-3.5" />Agregar prueba</Boton>
                    </div>
                    {cerrar && pruebas.length > 0 && !ultimaConforme && <p className="text-[12px] text-rojo">La última prueba no fue conforme: corrija y vuelva a probar antes de pedir la liberación.</p>}
                  </div>
                </section>

                <AreaTexto value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Observaciones para el próximo turno (opcional)" />
                <div className="rounded-md border border-linea-suave bg-papel p-3.5">
                  <label className="flex cursor-pointer items-center gap-3 text-[13.5px]"><input type="checkbox" checked={cerrar} onChange={(e) => setCerrar(e.target.checked)} className="size-4 accent-[var(--s-acento)]" />Terminé: pedir la liberación del equipo</label>
                  <p className="ml-7 mt-1 text-[12px] text-gris">El equipo queda «pendiente de liberación» hasta que firmen otras personas. Usted no firma su propia intervención.</p>
                  <AnimatePresence>
                    {cerrar && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: TIEMPO.componente }} className="overflow-hidden">
                        <div className="ml-7 mt-3 grid gap-2">
                          <label className="flex cursor-pointer items-start gap-3 text-[13px]"><input type="checkbox" checked={afecta.seguridad} onChange={(e) => setAfecta({ ...afecta, seguridad: e.target.checked })} className="mt-0.5 size-4 accent-[var(--s-acento)]" /><span>La intervención afecta la seguridad <span className="block text-[11.5px] text-gris">Protecciones, resguardos, paradas de emergencia o energías peligrosas: firma también prevención de riesgos.</span></span></label>
                          <label className="flex cursor-pointer items-start gap-3 text-[13px]"><input type="checkbox" checked={afecta.calidad} onChange={(e) => setAfecta({ ...afecta, calidad: e.target.checked })} className="mt-0.5 size-4 accent-[var(--s-acento)]" /><span>La intervención afecta la calidad del producto <span className="block text-[11.5px] text-gris">Ajustes de proceso, herramentales o medición: firma también calidad.</span></span></label>
                          <label className="mt-1 flex cursor-pointer items-center gap-3 rounded-md bg-ambar-claro p-2.5 text-[13px] text-ambar-hondo"><input type="checkbox" checked={lotoFuera} onChange={(e) => setLotoFuera(e.target.checked)} className="size-4 accent-[var(--s-acento)]" /><Unlock className="size-4" />Retiré mi candado y tarjeta, y el área quedó despejada</label>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="rounded-md bg-papel-2 p-3.5 text-[12.5px]"><p className="t-etiqueta mb-1">Resumen</p><p>Causa {CAUSAS.find((c) => c[0] === causa)?.[1].toLowerCase() ?? "sin indicar"} · {herrSel.length} herramientas · {Object.values(rep).reduce((a, b) => a + b, 0)} repuestos · {pruebas.length} pruebas · {cerrar ? `firmas: ${["técnica", ...(afecta.seguridad ? ["seguridad"] : []), ...(afecta.calidad ? ["calidad"] : []), "producción"].join(", ")}` : "la orden sigue en ejecución"}</p></div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {!terminada && (
        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-linea-suave bg-papel px-5 py-3">
          <Boton variante="texto" disabled={paso === 0 || (paso === 2 && ot.estado === "en_curso")} onClick={() => setPaso((p) => p - 1)}><ArrowLeft className="size-4" />Atrás</Boton>
          {sinGuardar && <span className="flex items-center gap-1.5 text-[11.5px] text-gris"><Clock className="size-3.5" />Borrador guardado en este equipo</span>}
          {paso === 1 ? <Boton variante="acento" disabled={!puedeAvanzar || !ejecuta || deOtro || conexion !== "conectado"} cargando={tomar.isPending} onClick={() => tomar.mutate()}><Lock className="size-4" />Confirmar bloqueo y tomar la orden</Boton>
            : paso === 4 ? <Boton variante="acento" disabled={!puedeAvanzar || !mia} cargando={registrar.isPending} onClick={() => registrar.mutate()}><CheckCircle2 className="size-4" />{cerrar ? "Registrar y pedir la liberación" : "Registrar intervención"}</Boton>
              : <Boton variante="acento" disabled={!puedeAvanzar || (paso >= 2 && !mia) || (paso === 0 && ot.estado === "en_curso" && !mia)} onClick={() => { if (paso === 2) etapa("mantenimiento"); if (paso === 3) etapa("pruebas"); setPaso((p) => (p === 0 && ot.estado === "en_curso" ? 2 : p + 1)); }}>Continuar<ArrowRight className="size-4" /></Boton>}
        </div>
      )}
    </motion.div>
  );
}

function Confirmacion({ listo, ot, equipo }: { listo: { encolado: boolean; cerrada: boolean; etapas: string[] }; ot: string; equipo: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: TIEMPO.pantalla }} className="grid h-full min-h-[460px] place-items-center p-10 text-center">
      <div>
        <span className={cx("mx-auto mb-5 grid size-14 place-items-center rounded-full", listo.encolado ? "bg-ambar-claro text-ambar" : "bg-verde-claro text-verde")}>
          <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.1, duration: 0.3 }} /></svg>
        </span>
        <p className="text-[18px] font-semibold">{listo.encolado ? "Guardada en este equipo" : listo.cerrada ? "Intervención registrada · liberación pedida" : "Intervención registrada"}</p>
        <p className="mx-auto mt-2 max-w-[52ch] text-[13px] text-gris">{listo.encolado ? `No hay conexión: se enviará sola cuando vuelva la red, sin duplicarse. ${ot} queda pendiente de sincronizar.` : listo.cerrada ? `${equipo} queda pendiente de liberación. Deben firmar, en orden: ${listo.etapas.map((e) => ETAPAS[e].t.toLowerCase()).join(", ")}. Cada persona recibe el aviso cuando le toca.` : `${ot} sigue en ejecución con su bloqueo.`}</p>
        <div className="mt-6 flex justify-center gap-2"><Boton variante="contorno" onClick={() => ir(`/explorador?equipo=${equipo}`)}>Ver el equipo</Boton><Boton variante="acento" onClick={() => ir("/mantenimiento")}>Volver a las órdenes</Boton></div>
      </div>
    </motion.div>
  );
}

/**
 * Orden terminada: lo hecho, las pruebas y la liberación por etapas. Cada etapa la firma una persona distinta que no
 * participó en la intervención; el servidor lo exige (separación de funciones) y deja registro de quién, cuándo y desde dónde.
 */
function Liberacion({ ot }: { ot: DetalleOrden }) {
  const { usuario } = useAuth();
  const qc = useQueryClient(); const aviso = useAviso();
  const [nota, setNota] = useState("");
  const lib = ot.liberacion;
  const requeridas = lib?.requeridas ?? ["tecnica", "produccion"];
  const pendientes = lib?.pendientes ?? [];
  const participo = ot.asignadoAId === usuario?.id;
  // la etapa que esta persona podría firmar ahora (la producción va al final; las demás pueden firmarse en cualquier orden)
  const mia = ot.estado === "por_verificar" && !participo ? pendientes.find((p) => (tiene(usuario, CAP_ETAPA[p]) || (p === "tecnica" && (tiene(usuario, "ordenes.aprobar") || tiene(usuario, "ordenes.ejecutar")))) && (p !== "produccion" || pendientes.length === 1)) : undefined;
  const yaFirmo = lib?.firmas.some((f) => f.porNombre === usuario?.nombre);
  const decidir = useMutation({
    mutationFn: (aprobar: boolean) => api.post(`/api/ordenes/${ot.id}/validar`, { tipo: mia, aprobar, nota }),
    onSuccess: (_, aprobar) => {
      aviso(aprobar ? (mia === "produccion" ? `${ot.equipo.codigo} liberado para producción.` : `${ETAPAS[mia!].t} registrada.`) : `${ETAPAS[mia!].t} rechazada: la orden vuelve al técnico.`, "ok");
      setNota(""); for (const k of ["ordenes", "orden", "equipos", "equipo", "resumen", "aprobaciones", "notificaciones"]) void qc.invalidateQueries({ queryKey: [k] });
    },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  return (
    <div className="grid gap-4">
      {ot.estado === "cerrada"
        ? <p className="flex items-center gap-2 rounded-md border border-verde/30 bg-verde-claro px-3.5 py-3 text-[13px] text-verde"><BadgeCheck className="size-4" />Orden cerrada: {ot.equipo.codigo} quedó liberado para producción{ot.verificadaEn ? ` ${hace(ot.verificadaEn)}` : ""}.</p>
        : <p className="rounded-md border border-ambar/30 bg-ambar-claro px-3.5 py-3 text-[13px] text-ambar-hondo"><b>Pendiente de liberación.</b> {ot.asignado} terminó{ot.cierreSolicitado ? ` ${hace(ot.cierreSolicitado)}` : ""} y retiró su bloqueo. {ot.equipo.codigo} no se pone en marcha hasta completar las firmas.</p>}

      <section aria-label="Etapas de la liberación" className="rounded-md border border-linea-suave bg-papel">
        <header className="flex items-center gap-2 border-b border-linea-suave px-3.5 py-2.5"><p className="t-seccion flex-1">Liberación del equipo</p>{lib && lib.ronda > 1 && <span className="text-[11.5px] text-gris">ronda {lib.ronda}</span>}</header>
        <ol className="divide-y divide-linea-suave">
          {requeridas.map((r) => {
            const f = lib?.firmas.find((x) => x.tipo === r);
            const E = ETAPAS[r];
            const esMia = mia === r;
            return (
              <li key={r} className={cx("flex gap-3 px-3.5 py-3", esMia && "bg-acento-claro")}>
                <span className={cx("mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border", f ? "border-verde bg-verde-claro text-verde" : esMia ? "border-acento text-acento" : "border-linea text-gris")}>{f ? <Check className="size-3.5" /> : <E.i className="size-3.5" />}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold">{E.t}</p>
                  {f ? <p className="text-[12px] text-gris"><b className="font-medium text-carbon">{f.porNombre}</b> · {f.porCargo} · {f.plataforma === "app" ? "SIMA Desktop" : "SIMA Web"} · {fechaHora(f.fecha)}{f.nota && <span className="block text-carbon">«{f.nota}»</span>}</p>
                    : <p className="text-[12px] text-gris">{esMia ? "Le corresponde firmar a usted." : `Pendiente · ${E.quien}`}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {mia && (
        <section className="rounded-md border border-acento/40 bg-papel p-4">
          <p className="t-seccion">{ETAPAS[mia].t}</p>
          <p className="mb-3 mt-1 text-[12.5px] text-gris">{mia === "produccion" ? `Confirme que ${ot.equipo.codigo} puede volver a producir. Al aprobar queda «liberado para producción»; la marcha la da operación o el PLC, no este botón.` : mia === "seguridad" ? "Verifique protecciones, resguardos y paradas de emergencia, y que no queden energías peligrosas." : mia === "calidad" ? "Verifique que el proceso queda dentro de especificación (primera pieza o control de calidad)." : "Revise que el trabajo quedó bien, que las pruebas son conformes, que se retiraron los bloqueos y que el área está despejada."}</p>
          <AreaTexto value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Observación (obligatoria si rechaza: qué falta)" className="min-h-20" />
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Boton variante="contorno" disabled={decidir.isPending || nota.trim().length < 4} onClick={() => decidir.mutate(false)}><Undo2 className="size-4" />Rechazar y devolver al técnico</Boton>
            <Boton variante="acento" cargando={decidir.isPending} onClick={() => decidir.mutate(true)}><BadgeCheck className="size-4" />{mia === "produccion" ? "Confirmar y liberar para producción" : `Firmar ${ETAPAS[mia].t.toLowerCase()}`}</Boton>
          </div>
        </section>
      )}
      {ot.estado === "por_verificar" && participo && <p className="text-[12.5px] text-gris">Usted ejecutó esta orden: la liberan otras personas. Recibirá un aviso con cada firma o rechazo.</p>}
      {ot.estado === "por_verificar" && !participo && !mia && pendientes.length > 0 && <p className="text-[12.5px] text-gris">{yaFirmo ? "Usted ya firmó una etapa: cada etapa la firma una persona distinta." : "Su cargo no firma la etapa pendiente."} Falta: {pendientes.map((p) => ETAPAS[p].t.toLowerCase()).join(", ")}.</p>}

      {(lib?.pruebas.length ?? 0) > 0 && (
        <section className="rounded-md border border-linea-suave bg-papel">
          <p className="t-etiqueta px-3.5 pb-1 pt-3">Pruebas registradas</p>
          <ul className="divide-y divide-linea-suave">{lib!.pruebas.map((p) => <li key={p.id} className="flex items-center gap-3 px-3.5 py-2 text-[12.5px]">{p.resultado === "conforme" ? <CheckCircle2 className="size-4 shrink-0 text-verde" /> : <XCircle className="size-4 shrink-0 text-rojo" />}<span className="min-w-0 flex-1">{p.descripcion}{p.valores && <span className="t-dato ml-2 text-gris">{p.valores}</span>}</span><span className="text-gris">{p.registradaPor} · {fechaHora(p.fecha)}</span></li>)}</ul>
        </section>
      )}
      {(lib?.rechazos.length ?? 0) > 0 && (
        <section className="rounded-md border border-rojo/30 bg-papel">
          <p className="t-etiqueta px-3.5 pb-1 pt-3">Rechazos anteriores</p>
          <ul className="divide-y divide-linea-suave">{lib!.rechazos.map((r, i) => <li key={i} className="px-3.5 py-2 text-[12.5px]"><b>{r.titulo}</b> · {r.porNombre} ({r.porCargo}) · ronda {r.ronda} · {fechaHora(r.fecha)}<span className="block text-carbon">«{r.nota}»</span></li>)}</ul>
        </section>
      )}
      {ot.intervenciones.map((i) => <div key={i.id} className="rounded-md border border-linea-suave bg-papel p-3.5"><p className="text-[13px] font-medium">{i.accion}</p>{i.diagnostico && <p className="text-[12.5px] text-gris">{i.diagnostico}</p>}<p className="text-[11.5px] text-gris">{i.tecnicoNombre} · {i.resultado.replace("_", " ")} · {hace(i.fin)}</p></div>)}
      {ot.descripcion && <p className="whitespace-pre-wrap rounded-md bg-papel-2 p-3.5 text-[12.5px] text-gris">{ot.descripcion}</p>}
    </div>
  );
}
