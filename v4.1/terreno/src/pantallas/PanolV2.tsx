import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, BadgeCheck, Boxes, ClipboardCheck, History, Inbox, PackageCheck, Repeat, Search, ShieldAlert, Undo2, Wrench, X } from "lucide-react";
import { AreaTexto, Boton, Cajon, Campo, Chip, Dialogo, Entrada, Esqueleto, EstadoVista, Seleccion, cx, mensajeDe, useAviso } from "@sima/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { tiene } from "../roles";
import type { Ot } from "./bloques";

interface ItemRep { id: number; codigo: string; nombre: string; tipo: string; bodega: string; ubicacion: string; fisico: number; reservado: number; disponible: number; stockMinimo: number; critico: boolean; estado: string }
interface ItemHer { id: number; codigo: string; nombre: string; estado: string; retiradaPor?: string | null; retiradaPorId?: string | null; retiradaEn?: string | null; proximaCalibracion?: string | null; requiereCalibracion: boolean }
interface Resumen { repuestos: ItemRep[] | null; herramientas: ItemHer[] | null; indicadores: { porRevisar: number; reservadas: number; entregadas: number; herramientasFuera: number; criticosBajoMinimo: number } }
interface Solicitud { id: number; codigo: string; tipo: string; itemId: number; item?: string; itemNombre?: string; cantidad: number; ordenId?: number | null; orden?: string | null; equipo?: string | null; motivo: string; solicitanteId: string; solicitanteNombre: string; estado: string; creada: string; vigencia?: string | null; revisadaPor?: string | null; notaRevision: string; entregadaEn?: string | null; usada: number; devuelta: number; incompatible: boolean }
interface Entrada { id: number; evento: string; detalle: string; cantidad?: number | null; stockAntes?: number | null; stockDespues?: number | null; orden?: string | null; solicitud?: string | null; porNombre: string; fecha: string }
interface Turno { id: number; turno: string; fecha: string; entregaNombre: string; recibeNombre?: string | null; recibidaEn?: string | null; pendientes: string; observaciones: string; estado: string }
type Pestana = "solicitudes" | "repuestos" | "herramientas" | "turno";

const ESTADO_ITEM: Record<string, { t: string; tono: "ok" | "aviso" | "peligro" | "info" | "neutro" | "mant" }> = {
  disponible: { t: "Disponible", tono: "ok" }, bajo_minimo: { t: "Bajo mínimo", tono: "aviso" }, reservado: { t: "Todo reservado", tono: "info" }, agotado: { t: "Agotado", tono: "peligro" },
  reservada: { t: "Reservada", tono: "info" }, en_uso: { t: "En uso", tono: "mant" }, calibracion: { t: "Calibración vencida", tono: "peligro" },
};
const ESTADO_SOL: Record<string, { t: string; tono: "ok" | "aviso" | "peligro" | "info" | "neutro" | "mant" }> = {
  solicitada: { t: "Por revisar", tono: "aviso" }, reservada: { t: "Reservada", tono: "info" }, entregada: { t: "Entregada", tono: "mant" }, cerrada: { t: "Cerrada", tono: "ok" },
  rechazada: { t: "Rechazada", tono: "peligro" }, cancelada: { t: "Cancelada", tono: "neutro" }, vencida: { t: "Vencida", tono: "neutro" },
};
const EVENTO: Record<string, string> = { solicitud: "Solicitud", reserva: "Reserva", rechazo: "Rechazo", entrega: "Entrega", uso: "Uso", devolucion: "Devolución", ingreso: "Ingreso", ajuste: "Ajuste", retiro: "Retiro", vencimiento: "Vencimiento", cancelacion: "Cancelación", calibracion: "Calibración" };
const fh = (iso: string) => new Date(iso).toLocaleString("es-CL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });

export function Panol() {
  const { usuario } = useAuth(); const aviso = useAviso(); const qc = useQueryClient();
  const gestorRep = tiene(usuario, "repuestos.editar"), gestorHer = tiene(usuario, "herramientas.editar");
  const gestor = gestorRep || gestorHer;
  const [tab, setTab] = useState<Pestana>("solicitudes");
  const [q, setQ] = useState("");
  const [pedir, setPedir] = useState<{ tipo: "repuesto" | "herramienta"; id: number; nombre: string; disponible: number } | null>(null);
  const [historial, setHistorial] = useState<{ tipo: string; id: number; nombre: string } | null>(null);
  const [revisar, setRevisar] = useState<{ s: Solicitud; aprobar: boolean } | null>(null);
  const [cerrar, setCerrar] = useState<Solicitud | null>(null);
  const [mov, setMov] = useState<ItemRep | null>(null);
  const res = useQuery({ queryKey: ["panol", "resumen"], queryFn: () => api.get<Resumen>("/api/panol/resumen"), refetchInterval: 15_000 });
  const sols = useQuery({ queryKey: ["panol", "solicitudes"], queryFn: () => api.get<Solicitud[]>("/api/panol/solicitudes?estado=activas"), refetchInterval: 15_000 });
  const refrescar = () => { for (const k of ["panol", "repuestos", "herramientas"]) void qc.invalidateQueries({ queryKey: [k] }); };
  const accion = useMutation({
    mutationFn: ({ id, que }: { id: number; que: "entregar" | "cancelar" }) => api.post(`/api/panol/solicitudes/${id}/${que}`),
    onSuccess: (_r, v) => { refrescar(); aviso(v.que === "entregar" ? "Entrega registrada: el stock físico se descontó." : "Solicitud cancelada.", "ok"); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  const herr = useMutation({
    mutationFn: ({ id, que }: { id: number; que: "retirar" | "devolver" | "calibrar" }) => api.post(`/api/herramientas/${id}/${que}`),
    onSuccess: (_r, v) => { refrescar(); aviso(v.que === "retirar" ? "Herramienta retirada a su nombre." : v.que === "devolver" ? "Herramienta devuelta al pañol." : "Calibración registrada.", "ok"); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  const ind = res.data?.indicadores;
  const filtro = (t: string) => !q || t.toLowerCase().includes(q.toLowerCase());
  const reps = useMemo(() => (res.data?.repuestos ?? []).filter((r) => filtro(`${r.codigo} ${r.nombre} ${r.tipo} ${r.ubicacion}`)), [res.data, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const hers = useMemo(() => (res.data?.herramientas ?? []).filter((h) => filtro(`${h.codigo} ${h.nombre}`)), [res.data, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const lista = sols.data ?? [];
  const PESTANAS: [Pestana, string, number | undefined, boolean][] = [
    ["solicitudes", gestor ? "Solicitudes y reservas" : "Mis solicitudes", lista.length || undefined, true], ["repuestos", "Repuestos", ind?.criticosBajoMinimo || undefined, !!res.data?.repuestos],
    ["herramientas", "Herramientas", ind?.herramientasFuera || undefined, !!res.data?.herramientas], ["turno", "Entrega de turno", undefined, gestor],
  ];
  return (
    <div className="grid gap-4">
      <header><h1 className="t-pantalla">Pañol y repuestos</h1><p className="text-[12.5px] text-gris">Lo físico es lo que está en el estante; lo disponible descuenta lo reservado para otros trabajos. Cada movimiento queda en la bitácora del ítem y no se puede editar.</p></header>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Kpi icono={<Inbox className="size-3.5" />} t="Por revisar" v={ind?.porRevisar} c="var(--s-ambar)" />
        <Kpi icono={<ClipboardCheck className="size-3.5" />} t="Reservadas" v={ind?.reservadas} c="var(--s-azul)" />
        <Kpi icono={<PackageCheck className="size-3.5" />} t="Entregadas sin cerrar" v={ind?.entregadas} c="var(--s-diagnostico)" />
        <Kpi icono={<Wrench className="size-3.5" />} t="Herramientas fuera" v={ind?.herramientasFuera} c="var(--s-acento)" />
        <Kpi icono={<ShieldAlert className="size-3.5" />} t="Críticos bajo mínimo" v={ind?.criticosBajoMinimo} c="var(--s-rojo)" />
      </div>
      <section className="tarjeta min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-linea-suave px-3 py-2">
          <div role="tablist" className="flex flex-wrap gap-1">
            {PESTANAS.filter((p) => p[3]).map(([k, t, n]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx("inline-flex h-8 cursor-pointer items-center gap-1.5 rounded px-3 text-[12.5px] font-medium", tab === k ? "bg-papel-2 text-negro" : "text-gris hover:text-negro")}>{t}{n !== undefined && <span className="num rounded bg-acento-claro px-1.5 text-[11px] text-acento">{n}</span>}</button>)}
          </div>
          {(tab === "repuestos" || tab === "herramientas") && <label className="relative ml-auto"><Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gris" /><Entrada value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar código, nombre o ubicación" className="h-8 w-[280px] pl-8 text-[12.5px]" aria-label="Buscar en el pañol" /></label>}
        </div>
        {res.isError ? <EstadoVista tipo="error" texto="No se pudo cargar el pañol." /> : res.isLoading ? <div className="p-4"><Esqueleto className="h-60" /></div> : (
          <div className="overflow-x-auto">
            {tab === "solicitudes" && (lista.length === 0 ? <p className="px-4 py-10 text-center text-[12.5px] text-gris">Sin solicitudes activas. Para pedir algo, búsquelo en Repuestos o Herramientas y use «Solicitar».</p> : (
              <table className="w-full min-w-[900px] text-[12.5px]">
                <thead className="sticky top-0 bg-papel"><tr className="border-b border-linea-suave text-left">{["Solicitud", "Ítem", "Cant.", "Para", "Solicitante", "Estado", ""].map((h) => <th key={h} className="t-etiqueta px-3 py-2 font-medium">{h}</th>)}</tr></thead>
                <tbody>{lista.map((s) => {
                  const mia = s.solicitanteId === usuario?.id; const gestiona = s.tipo === "herramienta" ? gestorHer : gestorRep;
                  return (
                    <tr key={s.id} className="border-b border-linea-suave/70 last:border-0 hover:bg-papel-2/60">
                      <td className="whitespace-nowrap px-3 py-2"><span className="t-dato">{s.codigo}</span><span className="block text-[11px] text-gris">{fh(s.creada)}</span></td>
                      <td className="max-w-[260px] px-3 py-2"><p className="truncate" title={s.itemNombre}><span className="t-dato text-gris">{s.item}</span> {s.itemNombre}</p><p className="text-[11px] text-gris">{s.tipo}{s.incompatible && <span className="ml-1 text-ambar-hondo">· compatibilidad confirmada a mano</span>}</p></td>
                      <td className="num px-3 py-2">{s.cantidad}</td>
                      <td className="max-w-[200px] px-3 py-2">{s.orden ? <span className="t-dato">{s.orden} · {s.equipo}</span> : <span className="text-gris">sin orden</span>}{s.motivo && <p className="truncate text-[11px] text-gris" title={s.motivo}>{s.motivo}</p>}</td>
                      <td className="px-3 py-2">{mia ? "Usted" : s.solicitanteNombre}</td>
                      <td className="whitespace-nowrap px-3 py-2"><Chip tono={ESTADO_SOL[s.estado]?.tono}>{ESTADO_SOL[s.estado]?.t ?? s.estado}</Chip>{s.estado === "reservada" && s.vigencia && <span className="block text-[11px] text-gris">hasta {fh(s.vigencia)}</span>}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right"><div className="inline-flex gap-1.5">
                        {gestiona && s.estado === "solicitada" && !mia && <><Boton tam="s" variante="acento" onClick={() => setRevisar({ s, aprobar: true })}>Reservar</Boton><Boton tam="s" variante="contorno" onClick={() => setRevisar({ s, aprobar: false })}>Rechazar</Boton></>}
                        {gestiona && s.estado === "reservada" && <Boton tam="s" variante="acento" cargando={accion.isPending && accion.variables?.id === s.id} onClick={() => accion.mutate({ id: s.id, que: "entregar" })}><ArrowDownToLine className="size-3.5" />Entregar</Boton>}
                        {s.estado === "entregada" && (mia || gestiona) && <Boton tam="s" variante="secundario" onClick={() => setCerrar(s)}><Undo2 className="size-3.5" />{s.tipo === "herramienta" ? "Devolver" : "Usado / devuelto"}</Boton>}
                        {(s.estado === "solicitada" || s.estado === "reservada") && (mia || gestiona) && <Boton tam="s" variante="texto" aria-label={`Cancelar ${s.codigo}`} onClick={() => accion.mutate({ id: s.id, que: "cancelar" })}><X className="size-3.5" /></Boton>}
                        <Boton tam="s" variante="texto" aria-label="Bitácora del ítem" onClick={() => setHistorial({ tipo: s.tipo, id: s.itemId, nombre: `${s.item} ${s.itemNombre}` })}><History className="size-3.5" /></Boton>
                      </div></td>
                    </tr>
                  );
                })}</tbody>
              </table>
            ))}
            {tab === "repuestos" && (
              <table className="w-full min-w-[880px] text-[12.5px]">
                <thead className="sticky top-0 bg-papel"><tr className="border-b border-linea-suave text-left">{["Código", "Repuesto", "Ubicación", "Físico", "Reservado", "Disponible", "Estado", ""].map((h) => <th key={h} className={cx("t-etiqueta px-3 py-2 font-medium", ["Físico", "Reservado", "Disponible"].includes(h) && "text-right")}>{h}</th>)}</tr></thead>
                <tbody>{reps.map((r) => (
                  <tr key={r.id} className="border-b border-linea-suave/70 last:border-0 hover:bg-papel-2/60">
                    <td className="t-dato whitespace-nowrap px-3 py-2">{r.codigo}</td>
                    <td className="max-w-[280px] px-3 py-2"><p className="truncate" title={r.nombre}>{r.nombre}</p><p className="text-[11px] text-gris">{r.tipo}{r.critico && <span className="ml-1 text-ambar-hondo">· crítico</span>}</p></td>
                    <td className="whitespace-nowrap px-3 py-2 text-gris">{r.ubicacion}</td>
                    <td className="num px-3 py-2 text-right">{r.fisico}<span className="block text-[10.5px] text-gris">mín. {r.stockMinimo}</span></td>
                    <td className="num px-3 py-2 text-right">{r.reservado || <span className="text-apagado">—</span>}</td>
                    <td className="num px-3 py-2 text-right text-[14px] font-semibold">{r.disponible}</td>
                    <td className="px-3 py-2"><Chip tono={ESTADO_ITEM[r.estado]?.tono}>{ESTADO_ITEM[r.estado]?.t ?? r.estado}</Chip></td>
                    <td className="whitespace-nowrap px-3 py-2 text-right"><div className="inline-flex gap-1.5">
                      <Boton tam="s" variante="secundario" disabled={r.fisico === 0} onClick={() => setPedir({ tipo: "repuesto", id: r.id, nombre: `${r.codigo} ${r.nombre}`, disponible: r.disponible })}>Solicitar</Boton>
                      {gestorRep && <Boton tam="s" variante="contorno" onClick={() => setMov(r)}>Ingreso / ajuste</Boton>}
                      <Boton tam="s" variante="texto" aria-label={`Bitácora de ${r.codigo}`} onClick={() => setHistorial({ tipo: "repuesto", id: r.id, nombre: `${r.codigo} ${r.nombre}` })}><History className="size-3.5" /></Boton>
                    </div></td>
                  </tr>
                ))}</tbody>
              </table>
            )}
            {tab === "herramientas" && (
              <table className="w-full min-w-[820px] text-[12.5px]">
                <thead className="sticky top-0 bg-papel"><tr className="border-b border-linea-suave text-left">{["Código", "Herramienta", "Estado", "Calibración", ""].map((h) => <th key={h} className="t-etiqueta px-3 py-2 font-medium">{h}</th>)}</tr></thead>
                <tbody>{hers.map((h) => {
                  const mia = h.retiradaPorId === usuario?.id;
                  return (
                    <tr key={h.id} className="border-b border-linea-suave/70 last:border-0 hover:bg-papel-2/60">
                      <td className="t-dato whitespace-nowrap px-3 py-2">{h.codigo}</td>
                      <td className="px-3 py-2">{h.nombre}</td>
                      <td className="px-3 py-2"><Chip tono={ESTADO_ITEM[h.estado]?.tono}>{ESTADO_ITEM[h.estado]?.t ?? h.estado}</Chip>{h.estado === "en_uso" && <span className="ml-2 text-[11.5px] text-gris">{mia ? "la tiene usted" : `la tiene ${h.retiradaPor}`}{h.retiradaEn ? ` desde ${fh(h.retiradaEn)}` : ""}</span>}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-gris">{h.requiereCalibracion ? (h.proximaCalibracion ? `vence ${new Date(h.proximaCalibracion + "T12:00").toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}` : "sin fecha") : "no requiere"}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right"><div className="inline-flex gap-1.5">
                        {h.estado === "disponible" && <><Boton tam="s" variante="secundario" onClick={() => herr.mutate({ id: h.id, que: "retirar" })}>Retirar ahora</Boton><Boton tam="s" variante="contorno" onClick={() => setPedir({ tipo: "herramienta", id: h.id, nombre: `${h.codigo} ${h.nombre}`, disponible: 1 })}>Reservar</Boton></>}
                        {h.estado === "reservada" && <Boton tam="s" variante="secundario" onClick={() => herr.mutate({ id: h.id, que: "retirar" })}>Retirar mi reserva</Boton>}
                        {h.estado === "en_uso" && (mia || gestorHer) && <Boton tam="s" variante="secundario" onClick={() => herr.mutate({ id: h.id, que: "devolver" })}><Undo2 className="size-3.5" />Devolver</Boton>}
                        {h.requiereCalibracion && gestorHer && <Boton tam="s" variante="contorno" onClick={() => herr.mutate({ id: h.id, que: "calibrar" })}><BadgeCheck className="size-3.5" />Calibrada</Boton>}
                        <Boton tam="s" variante="texto" aria-label={`Bitácora de ${h.codigo}`} onClick={() => setHistorial({ tipo: "herramienta", id: h.id, nombre: `${h.codigo} ${h.nombre}` })}><History className="size-3.5" /></Boton>
                      </div></td>
                    </tr>
                  );
                })}</tbody>
              </table>
            )}
            {tab === "turno" && <EntregaTurno />}
          </div>
        )}
      </section>
      {pedir && <DialogoSolicitud item={pedir} onCerrar={() => setPedir(null)} alListo={refrescar} />}
      {revisar && <DialogoRevision r={revisar} onCerrar={() => setRevisar(null)} alListo={refrescar} />}
      {cerrar && <DialogoCierre s={cerrar} onCerrar={() => setCerrar(null)} alListo={refrescar} />}
      {mov && <DialogoMovimiento r={mov} onCerrar={() => setMov(null)} alListo={refrescar} />}
      <BitacoraItem item={historial} onCerrar={() => setHistorial(null)} />
    </div>
  );
}

function Kpi({ icono, t, v, c }: { icono: ReactNode; t: string; v?: number; c: string }) {
  return <div className="tarjeta relative overflow-hidden px-3 py-2.5"><span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: c }} /><p className="flex items-center gap-1.5 text-[11.5px] text-gris">{icono}{t}</p><p className="t-kpi mt-0.5 text-[22px]">{v ?? "—"}</p></div>;
}

function DialogoSolicitud({ item, onCerrar, alListo }: { item: { tipo: "repuesto" | "herramienta"; id: number; nombre: string; disponible: number }; onCerrar: () => void; alListo: () => void }) {
  const { usuario } = useAuth(); const aviso = useAviso();
  const ots = useQuery({ queryKey: ["ordenes"], queryFn: () => api.get<Ot[]>("/api/ordenes") });
  const propias = (ots.data ?? []).filter((o) => o.estado !== "cerrada" && (o.asignadoAId === usuario?.id || tiene(usuario, "ordenes.asignar") || tiene(usuario, "repuestos.editar")));
  const [f, setF] = useState({ cantidad: 1, ordenId: "", motivo: "", vigencia: 24 });
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: (conf: boolean) => api.post<{ codigo: string; alcanza: boolean; disponible: number }>("/api/panol/solicitudes", { tipo: item.tipo, itemId: item.id, cantidad: f.cantidad, ordenId: f.ordenId ? Number(f.ordenId) : null, motivo: f.motivo, vigenciaHoras: f.vigencia, confirmar: conf }),
    onSuccess: (r) => { aviso(`${r.codigo} enviada al pañol.${r.alcanza ? "" : ` Hoy hay ${r.disponible} disponible(s): quedará pendiente hasta que alcance.`}`, r.alcanza ? "ok" : "aviso"); alListo(); onCerrar(); },
    onError: (e) => { const d = (e as { datos?: { requiereConfirmacion?: boolean; error?: string } }).datos; if (d?.requiereConfirmacion) setConfirmar(d.error ?? mensajeDe(e)); else aviso(mensajeDe(e), "error"); },
  });
  return (
    <Dialogo abierto onCerrar={onCerrar} titulo={item.tipo === "herramienta" ? "Reservar herramienta" : "Solicitar repuesto"} ancho={520}
      pie={<><Boton variante="contorno" onClick={onCerrar}>Cancelar</Boton>{confirmar ? <Boton variante="acento" cargando={m.isPending} onClick={() => m.mutate(true)}>Lo verifiqué: enviar</Boton> : <Boton variante="acento" cargando={m.isPending} disabled={!f.ordenId && f.motivo.trim().length < 3} onClick={() => m.mutate(false)}>Enviar solicitud</Boton>}</>}>
      <div className="grid gap-3 text-[13px]">
        <p><b className="font-medium">{item.nombre}</b> <span className="text-gris">· disponible {item.disponible}</span></p>
        <div className="grid gap-3 sm:grid-cols-[110px_1fr]">
          {item.tipo === "repuesto" && <Campo etiqueta="Cantidad" obligatorio><Entrada type="number" min={1} value={f.cantidad} onChange={(e) => setF({ ...f, cantidad: Math.max(1, Number(e.target.value)) })} /></Campo>}
          <Campo etiqueta="Orden de trabajo" className={item.tipo === "herramienta" ? "sm:col-span-2" : ""}><Seleccion value={f.ordenId} onChange={(e) => { setF({ ...f, ordenId: e.target.value }); setConfirmar(null); }}><option value="">Sin orden (indique el motivo)</option>{propias.map((o) => <option key={o.id} value={o.id}>{o.codigo} · {o.equipo} · {o.titulo}</option>)}</Seleccion></Campo>
        </div>
        <Campo etiqueta="Motivo"><AreaTexto value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} placeholder="Para qué se necesita" className="min-h-14" /></Campo>
        <Campo etiqueta="Mantener la reserva por"><Seleccion value={f.vigencia} onChange={(e) => setF({ ...f, vigencia: Number(e.target.value) })}>{[[4, "4 horas"], [8, "8 horas (un turno)"], [24, "24 horas"], [72, "3 días"]].map(([v, t]) => <option key={v} value={v}>{t}</option>)}</Seleccion></Campo>
        {item.tipo === "repuesto" && f.cantidad > item.disponible && <p className="rounded-md border border-ambar/40 bg-ambar-claro px-3 py-2 text-[12.5px]">Pide más de lo disponible: el pañol no podrá reservarlo hasta que ingrese stock.</p>}
        {confirmar && <p className="rounded-md border border-ambar/40 bg-ambar-claro px-3 py-2 text-[12.5px]"><ShieldAlert className="mr-1 inline size-3.5" />{confirmar}</p>}
      </div>
    </Dialogo>
  );
}

function DialogoRevision({ r, onCerrar, alListo }: { r: { s: Solicitud; aprobar: boolean }; onCerrar: () => void; alListo: () => void }) {
  const aviso = useAviso(); const [nota, setNota] = useState(""); const [vig, setVig] = useState(8);
  const m = useMutation({
    mutationFn: () => api.post(`/api/panol/solicitudes/${r.s.id}/revisar`, { aprobar: r.aprobar, nota, vigenciaHoras: vig }),
    onSuccess: () => { aviso(r.aprobar ? `${r.s.codigo} reservada; se avisó a ${r.s.solicitanteNombre}.` : `${r.s.codigo} rechazada.`, "ok"); alListo(); onCerrar(); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  return (
    <Dialogo abierto onCerrar={onCerrar} titulo={r.aprobar ? `Reservar ${r.s.codigo}` : `Rechazar ${r.s.codigo}`} ancho={480}
      pie={<><Boton variante="contorno" onClick={onCerrar}>Volver</Boton><Boton variante={r.aprobar ? "acento" : "peligro"} disabled={!r.aprobar && nota.trim().length < 3} cargando={m.isPending} onClick={() => m.mutate()}>{r.aprobar ? "Reservar" : "Rechazar"}</Boton></>}>
      <div className="grid gap-3 text-[13px]">
        <p>{r.s.cantidad} × <b className="font-medium">{r.s.item} {r.s.itemNombre}</b> para {r.s.solicitanteNombre}{r.s.orden ? ` (${r.s.orden})` : ""}.</p>
        {r.s.incompatible && <p className="rounded-md border border-ambar/40 bg-ambar-claro px-3 py-2 text-[12.5px]">El repuesto no figura como compatible con el equipo; el solicitante confirmó que lo verificó.</p>}
        {r.aprobar && <Campo etiqueta="Vigencia de la reserva"><Seleccion value={vig} onChange={(e) => setVig(Number(e.target.value))}>{[[4, "4 horas"], [8, "8 horas"], [24, "24 horas"], [72, "3 días"]].map(([v, t]) => <option key={v} value={v}>{t}</option>)}</Seleccion></Campo>}
        <Campo etiqueta={r.aprobar ? "Nota (opcional)" : "Motivo del rechazo"} obligatorio={!r.aprobar}><AreaTexto value={nota} onChange={(e) => setNota(e.target.value)} className="min-h-14" /></Campo>
      </div>
    </Dialogo>
  );
}

function DialogoCierre({ s, onCerrar, alListo }: { s: Solicitud; onCerrar: () => void; alListo: () => void }) {
  const aviso = useAviso(); const libre = s.cantidad - s.usada - s.devuelta;
  const [usada, setUsada] = useState(s.tipo === "herramienta" ? 0 : libre); const [nota, setNota] = useState("");
  const devuelta = s.tipo === "herramienta" ? 1 : libre - usada;
  const m = useMutation({
    mutationFn: () => api.post(`/api/panol/solicitudes/${s.id}/cerrar`, { usada: s.tipo === "herramienta" ? 0 : usada, devuelta, nota }),
    onSuccess: () => { aviso(devuelta > 0 ? `Devolución registrada: ${devuelta} vuelve(n) al estante.` : "Uso registrado.", "ok"); alListo(); onCerrar(); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  return (
    <Dialogo abierto onCerrar={onCerrar} titulo={`Cerrar ${s.codigo}`} ancho={460}
      pie={<><Boton variante="contorno" onClick={onCerrar}>Volver</Boton><Boton variante="acento" cargando={m.isPending} onClick={() => m.mutate()}>Registrar</Boton></>}>
      <div className="grid gap-3 text-[13px]">
        <p>{s.item} {s.itemNombre} · entregado {libre}</p>
        {s.tipo === "repuesto" && <div className="grid grid-cols-2 gap-3"><Campo etiqueta="Usado"><Entrada type="number" min={0} max={libre} value={usada} onChange={(e) => setUsada(Math.min(libre, Math.max(0, Number(e.target.value))))} /></Campo><Campo etiqueta="Devuelto al pañol"><Entrada value={devuelta} readOnly /></Campo></div>}
        <Campo etiqueta="Nota (opcional)"><Entrada value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Estado en que se devuelve" /></Campo>
      </div>
    </Dialogo>
  );
}

function DialogoMovimiento({ r, onCerrar, alListo }: { r: ItemRep; onCerrar: () => void; alListo: () => void }) {
  const aviso = useAviso(); const [cant, setCant] = useState(1); const [tipo, setTipo] = useState<"ingreso" | "ajuste">("ingreso"); const [nota, setNota] = useState("");
  const m = useMutation({
    mutationFn: () => api.post<{ stock: number }>(`/api/repuestos/${r.id}/movimiento`, { cantidad: cant, nota: tipo === "ajuste" ? `Ajuste de inventario: ${nota}` : nota || "Ingreso a bodega" }),
    onSuccess: (x) => { aviso(`Registrado. En estante: ${x.stock}.`, "ok"); alListo(); onCerrar(); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  return (
    <Dialogo abierto onCerrar={onCerrar} titulo={`${r.codigo} · ${r.nombre}`} ancho={460}
      pie={<><Boton variante="contorno" onClick={onCerrar}>Cancelar</Boton><Boton variante="acento" disabled={cant === 0 || (tipo === "ajuste" && nota.trim().length < 3)} cargando={m.isPending} onClick={() => m.mutate()}>Registrar</Boton></>}>
      <div className="grid gap-3 text-[13px]">
        <div className="flex rounded-md border border-linea-suave p-0.5" role="radiogroup">{([["ingreso", "Ingreso"], ["ajuste", "Ajuste de inventario"]] as const).map(([k, t]) => <button key={k} role="radio" aria-checked={tipo === k} onClick={() => setTipo(k)} className={cx("h-7 flex-1 cursor-pointer rounded text-[12px] font-medium", tipo === k ? "bg-papel-2 text-negro" : "text-gris")}>{t}</button>)}</div>
        <Campo etiqueta={tipo === "ajuste" ? "Diferencia (negativa si falta)" : "Cantidad que ingresa"}><Entrada type="number" min={tipo === "ingreso" ? 1 : undefined} value={cant} onChange={(e) => setCant(Number(e.target.value))} /></Campo>
        <Campo etiqueta={tipo === "ajuste" ? "Motivo del ajuste" : "Documento o proveedor (opcional)"} obligatorio={tipo === "ajuste"}><Entrada value={nota} onChange={(e) => setNota(e.target.value)} /></Campo>
        <p className="text-[12px] text-gris">Queda en la bitácora del repuesto con el stock antes y después. No se puede editar después.</p>
      </div>
    </Dialogo>
  );
}

function BitacoraItem({ item, onCerrar }: { item: { tipo: string; id: number; nombre: string } | null; onCerrar: () => void }) {
  const b = useQuery({ queryKey: ["panol", "bitacora", item?.tipo, item?.id], queryFn: () => api.get<Entrada[]>(`/api/panol/bitacora?tipo=${item!.tipo}&itemId=${item!.id}`), enabled: !!item });
  return (
    <Cajon abierto={!!item} onCerrar={onCerrar} titulo={`Bitácora · ${item?.nombre ?? ""}`} ancho={520}>
      <p className="mb-3 text-[12px] text-gris">Registro de solo agregar: las entradas no se editan ni se borran.</p>
      {b.isLoading ? <Esqueleto className="h-40" /> : b.data?.length === 0 ? <p className="text-[12.5px] text-gris">Sin movimientos registrados.</p> : (
        <ol className="relative grid gap-3 border-l border-linea-suave pl-4">
          {b.data?.map((e) => (
            <li key={e.id} className="relative text-[12.5px]">
              <span className="absolute -left-[21px] top-1 size-2.5 rounded-full border-2 border-papel bg-acento" />
              <p className="flex flex-wrap items-baseline gap-x-2"><b className="font-semibold">{EVENTO[e.evento] ?? e.evento}</b>{e.cantidad != null && <span className="num text-gris">{e.stockAntes == null ? `×${Math.abs(e.cantidad)}` : e.cantidad > 0 ? `+${e.cantidad}` : e.cantidad}</span>}{e.stockAntes != null && <span className="num text-[11px] text-gris">estante {e.stockAntes} → {e.stockDespues}</span>}<span className="ml-auto text-[11px] text-gris">{fh(e.fecha)}</span></p>
              <p className="text-carbon">{e.detalle}</p>
              <p className="text-[11px] text-gris">{e.porNombre}{e.orden ? ` · ${e.orden}` : ""}{e.solicitud ? ` · ${e.solicitud}` : ""}</p>
            </li>
          ))}
        </ol>
      )}
    </Cajon>
  );
}

function EntregaTurno() {
  const { usuario } = useAuth(); const aviso = useAviso(); const qc = useQueryClient();
  const t = useQuery({ queryKey: ["panol", "turnos"], queryFn: () => api.get<Turno[]>("/api/panol/turnos") });
  const [f, setF] = useState({ pendientes: "", observaciones: "" });
  const entregar = useMutation({ mutationFn: () => api.post("/api/panol/turnos", f), onSuccess: () => { aviso("Entrega de turno registrada con el estado actual del pañol.", "ok"); setF({ pendientes: "", observaciones: "" }); void qc.invalidateQueries({ queryKey: ["panol", "turnos"] }); }, onError: (e) => aviso(mensajeDe(e), "error") });
  const recibir = useMutation({ mutationFn: (id: number) => api.post(`/api/panol/turnos/${id}/recibir`), onSuccess: () => { aviso("Turno recibido.", "ok"); void qc.invalidateQueries({ queryKey: ["panol", "turnos"] }); }, onError: (e) => aviso(mensajeDe(e), "error") });
  return (
    <div className="grid gap-4 p-4 xl:grid-cols-[380px_minmax(0,1fr)]">
      <div className="grid content-start gap-3">
        <p className="t-seccion flex items-center gap-2"><Repeat className="size-4 text-gris" />Entregar mi turno</p>
        <p className="text-[12px] text-gris">SIMA adjunta solo las herramientas fuera, las reservas y las solicitudes por revisar al momento de entregar.</p>
        <Campo etiqueta="Pendientes para el turno siguiente"><AreaTexto value={f.pendientes} onChange={(e) => setF({ ...f, pendientes: e.target.value })} className="min-h-20" /></Campo>
        <Campo etiqueta="Observaciones"><AreaTexto value={f.observaciones} onChange={(e) => setF({ ...f, observaciones: e.target.value })} className="min-h-14" /></Campo>
        <Boton variante="acento" cargando={entregar.isPending} onClick={() => entregar.mutate()}>Registrar entrega</Boton>
      </div>
      <ol className="grid content-start gap-2">
        {t.data?.length === 0 && <p className="text-[12.5px] text-gris">Aún no hay entregas de turno.</p>}
        {t.data?.map((x) => { const e = JSON.parse(x.estado || "{}") as { herramientasFuera?: { codigo: string; nombre: string; por?: string }[]; porRevisar?: number; reservadas?: number; entregadas?: number; criticos?: { codigo: string }[] }; return (
          <li key={x.id} className="rounded-md border border-linea-suave bg-papel px-3.5 py-2.5 text-[12.5px]">
            <p className="flex flex-wrap items-center gap-2"><Boxes className="size-4 text-gris" /><b className="font-semibold">{x.turno}</b><span className="text-gris">entregó {x.entregaNombre}</span>
              <span className="ml-auto">{x.recibidaEn ? <Chip tono="ok">recibió {x.recibeNombre}</Chip> : x.entregaNombre !== usuario?.nombre ? <Boton tam="s" variante="secundario" cargando={recibir.isPending} onClick={() => recibir.mutate(x.id)}>Recibir turno</Boton> : <Chip tono="aviso">sin recibir</Chip>}</span></p>
            <p className="mt-1 text-gris">{e.herramientasFuera?.length ?? 0} herramientas fuera{e.herramientasFuera?.length ? ` (${e.herramientasFuera.map((h) => `${h.codigo} · ${h.por}`).join(", ")})` : ""} · {e.porRevisar ?? 0} por revisar · {e.reservadas ?? 0} reservadas · {e.entregadas ?? 0} entregadas sin cerrar · {e.criticos?.length ?? 0} críticos bajo mínimo</p>
            {x.pendientes && <p className="mt-1"><span className="text-gris">Pendientes: </span>{x.pendientes}</p>}
            {x.observaciones && <p><span className="text-gris">Observaciones: </span>{x.observaciones}</p>}
          </li>
        ); })}
      </ol>
    </div>
  );
}
