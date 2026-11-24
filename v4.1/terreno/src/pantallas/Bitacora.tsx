import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, CheckCheck, Clock, FileText, Hammer, HandHelping, MessageSquare, Package, Send, ShieldCheck, Timer } from "lucide-react";
import { AreaTexto, Boton, Chip, Esqueleto, cx, mensajeDe, useAviso } from "@sima/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { tiene } from "../roles";

export interface Planificacion {
  inicio?: string | null; fin?: string | null; actividad?: number | null; colaboradores?: { id: string; nombre: string }[] | null; instrucciones: string; fechaLimite?: string | null;
  resultadosEsperados: string; pruebasRequeridas: string; recibidaEn?: string | null; asignadaPor?: string | null;
  herramientas: { id: number; codigo: string; nombre: string; estado?: string }[]; repuestos: { id: number; codigo: string; nombre: string; stock?: number }[]; procedimientos: { id: number; titulo: string }[];
}
interface Entrada { id: number; tipo: string; tipoTexto: string; texto: string; autorNombre: string; autorCargo: string; fecha: string }

const ICONO: Record<string, typeof Send> = { instruccion: FileText, recepcion: CheckCheck, inicio: Hammer, avance: Send, problema: AlertTriangle, ayuda: HandHelping, recursos: Package, tiempo: Timer, revision: ShieldCheck, completada: CheckCheck, comentario: MessageSquare };
const TONO: Record<string, string> = { problema: "text-rojo", ayuda: "text-ambar", recursos: "text-ambar", tiempo: "text-ambar", revision: "text-azul", completada: "text-verde", recepcion: "text-verde", instruccion: "text-acento" };
const ACCIONES_TECNICO = [["avance", "Avance"], ["problema", "Problema"], ["ayuda", "Pedir ayuda"], ["recursos", "Pedir repuestos o herramientas"], ["tiempo", "Pedir más tiempo"], ["revision", "Pedir revisión"], ["comentario", "Comentario"]] as const;
const fecha = (iso: string) => new Date(iso).toLocaleString("es-CL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

/** Lo que la jefatura dejó para esta orden: horario, instrucciones, recursos, resultados y pruebas. El técnico confirma la recepción. */
export function TareaAsignada({ id, plan, asignadoAId, estado }: { id: number; plan?: Planificacion | null; asignadoAId?: string | null; estado: string }) {
  const { usuario } = useAuth(); const aviso = useAviso(); const qc = useQueryClient();
  const responsable = asignadoAId === usuario?.id;
  const recibir = useMutation({
    mutationFn: () => api.post(`/api/ordenes/${id}/bitacora`, { tipo: "recepcion", texto: "" }),
    onSuccess: () => { aviso("Recepción confirmada. La jefatura ya sabe que la tiene.", "ok"); void qc.invalidateQueries({ queryKey: ["orden", id] }); void qc.invalidateQueries({ queryKey: ["ordenes"] }); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  if (!plan || (!plan.inicio && !plan.instrucciones && !plan.asignadaPor)) return null;
  const pendiente = responsable && !plan.recibidaEn && estado === "abierta";
  return (
    <section className={cx("mx-5 mt-4 rounded-md border", pendiente ? "border-acento/60 bg-acento-claro" : "border-linea-suave bg-papel")} aria-label="Tarea asignada">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-linea-suave px-3.5 py-2.5">
        <CalendarClock className="size-4 text-acento" />
        <p className="t-seccion">Tarea asignada</p>
        {plan.inicio && <span className="text-[12.5px] text-carbon">{fecha(plan.inicio)}{plan.fin ? ` – ${new Date(plan.fin).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false })}` : ""}</span>}
        {plan.fechaLimite && <Chip tono="aviso" punto={false}>límite {new Date(plan.fechaLimite + "T12:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" })}</Chip>}
        <span className="ml-auto text-[11.5px] text-gris">{plan.asignadaPor ? `asignó ${plan.asignadaPor}` : ""}{plan.recibidaEn ? ` · recibida ${fecha(plan.recibidaEn)}` : ""}</span>
        {pendiente && <Boton tam="s" variante="acento" cargando={recibir.isPending} onClick={() => recibir.mutate()}><CheckCheck className="size-3.5" />Confirmar recepción</Boton>}
      </header>
      <div className="grid gap-3 px-3.5 py-3 text-[12.5px] lg:grid-cols-2">
        <div className="grid content-start gap-2">
          {plan.instrucciones ? <div><p className="t-etiqueta mb-1">Instrucciones de la jefatura</p><p className="seleccionable whitespace-pre-wrap">{plan.instrucciones}</p></div> : <p className="text-gris">Sin instrucciones adicionales.</p>}
          {(plan.colaboradores ?? []).length > 0 && <p><span className="text-gris">Colaboran: </span>{(plan.colaboradores ?? []).map((c) => c.nombre).join(", ")}</p>}
          {plan.resultadosEsperados && <p><span className="text-gris">Resultado esperado: </span>{plan.resultadosEsperados}</p>}
          {plan.pruebasRequeridas && <p><span className="text-gris">Pruebas requeridas: </span>{plan.pruebasRequeridas}</p>}
        </div>
        <div className="grid content-start gap-2">
          {plan.herramientas.length > 0 && <Lista titulo="Herramientas" items={plan.herramientas.map((h) => `${h.codigo} ${h.nombre}${h.estado && h.estado !== "disponible" ? ` (${h.estado})` : ""}`)} />}
          {plan.repuestos.length > 0 && <Lista titulo="Repuestos sugeridos" items={plan.repuestos.map((r) => `${r.codigo} ${r.nombre}${r.stock !== undefined ? ` · stock ${r.stock}` : ""}`)} />}
          {plan.procedimientos.length > 0 && <Lista titulo="Procedimientos" items={plan.procedimientos.map((p) => p.titulo)} />}
        </div>
      </div>
    </section>
  );
}

function Lista({ titulo, items }: { titulo: string; items: string[] }) {
  return <div><p className="t-etiqueta mb-1">{titulo}</p><ul className="grid gap-0.5">{items.map((t) => <li key={t} className="truncate" title={t}>· {t}</li>)}</ul></div>;
}

/** Bitácora persistente de la orden: lo que se dijeron jefatura y técnicos. No es una notificación: queda en la orden. */
export function BitacoraOrden({ id, asignadoAId, colaboradores, estado }: { id: number; asignadoAId?: string | null; colaboradores?: string[]; estado: string }) {
  const { usuario } = useAuth(); const aviso = useAviso(); const qc = useQueryClient();
  const b = useQuery({ queryKey: ["orden", id, "bitacora"], queryFn: () => api.get<Entrada[]>(`/api/ordenes/${id}/bitacora`), refetchInterval: 15_000 });
  const ejecutor = asignadoAId === usuario?.id || (colaboradores ?? []).includes(usuario?.id ?? "");
  const jefatura = tiene(usuario, "ordenes.asignar");
  const opciones = ejecutor ? ACCIONES_TECNICO : jefatura ? ([["instruccion", "Instrucción"], ["comentario", "Comentario"]] as const) : [];
  const [tipo, setTipo] = useState<string>(opciones[0]?.[0] ?? "comentario");
  const [texto, setTexto] = useState("");
  const enviar = useMutation({
    mutationFn: () => api.post(`/api/ordenes/${id}/bitacora`, { tipo, texto }),
    onSuccess: () => { setTexto(""); aviso(ejecutor ? "Registrado en la bitácora. Se avisó a la jefatura." : "Registrado. Se avisó a los técnicos asignados.", "ok"); void qc.invalidateQueries({ queryKey: ["orden", id, "bitacora"] }); void qc.invalidateQueries({ queryKey: ["orden", id] }); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  return (
    <section className="mx-5 mb-5 rounded-md border border-linea-suave bg-papel" aria-label="Bitácora de la orden">
      <header className="flex items-center gap-2 border-b border-linea-suave px-3.5 py-2.5"><MessageSquare className="size-4 text-gris" /><p className="t-seccion flex-1">Bitácora jefe–técnico</p><span className="text-[11.5px] text-gris">{b.data?.length ?? 0} entradas · queda guardada en la orden</span></header>
      <ol className="grid max-h-[280px] gap-0 overflow-y-auto">
        {b.isLoading && <li className="p-3"><Esqueleto className="h-12" /></li>}
        {b.data?.length === 0 && <li className="px-3.5 py-4 text-[12.5px] text-gris">Sin entradas todavía.</li>}
        {b.data?.map((e) => { const I = ICONO[e.tipo] ?? MessageSquare; return (
          <li key={e.id} className="flex gap-2.5 border-b border-linea-suave/60 px-3.5 py-2 last:border-0">
            <I className={cx("mt-0.5 size-4 shrink-0", TONO[e.tipo] ?? "text-gris")} />
            <div className="min-w-0 flex-1 text-[12.5px]">
              <p className="flex flex-wrap items-baseline gap-x-2"><b className="font-semibold">{e.tipoTexto}</b><span className="text-gris">{e.autorNombre} · {e.autorCargo}</span><span className="ml-auto flex items-center gap-1 text-[11px] text-gris"><Clock className="size-3" />{fecha(e.fecha)}</span></p>
              {e.texto && <p className="seleccionable whitespace-pre-wrap text-carbon">{e.texto}</p>}
            </div>
          </li>
        ); })}
      </ol>
      {opciones.length > 0 && estado !== "cerrada" && (
        <div className="grid gap-2 border-t border-linea-suave p-3">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo de entrada">
            {opciones.map(([k, t]) => <button key={k} role="radio" aria-checked={tipo === k} onClick={() => setTipo(k)} className={cx("cursor-pointer rounded border px-2 py-1 text-[12px] transition-colors duration-150", tipo === k ? "border-acento/60 bg-acento-claro text-negro" : "border-linea-suave text-gris hover:border-linea")}>{t}</button>)}
          </div>
          <div className="flex gap-2">
            <AreaTexto value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={tipo === "recursos" ? "Qué necesita y cuánto" : tipo === "tiempo" ? "Cuánto tiempo más y por qué" : tipo === "problema" ? "Qué pasó y qué lo impide" : "Detalle"} className="min-h-14 flex-1" aria-label="Detalle de la entrada" />
            <Boton variante="acento" className="self-end" disabled={texto.trim().length < 2} cargando={enviar.isPending} onClick={() => enviar.mutate()}><Send className="size-3.5" />Enviar</Boton>
          </div>
        </div>
      )}
    </section>
  );
}
