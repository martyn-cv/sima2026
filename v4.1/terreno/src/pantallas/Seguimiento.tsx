import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Hourglass, Inbox, MessageSquare, PauseCircle, Repeat, ShieldCheck, Wrench } from "lucide-react";
import { Boton, Chip, Esqueleto, EstadoEquipo, EstadoVista, MarcaSimulado, cx } from "@sima/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { ir } from "../ruta";
import { tiene } from "../roles";
import { ESP, PRIO, type Ot } from "./bloques";
import { DialogoAsignar, useTecnicos } from "./Calendario";

interface Fila { id: number; codigo: string; titulo: string; prioridad: string; estado: string; especialidad: string; tipo: string; simulada: boolean; equipo: string; equipoNombre: string; asignado?: string | null; asignadoAId?: string | null; recibidaEn?: string | null; fechaLimite?: string | null; version: number; inicio?: string | null; fin?: string | null }
interface Datos {
  sinAsignar: Fila[]; enEjecucion: Fila[]; atrasadas: Fila[]; sinConfirmar: Fila[]; pendientesLiberacion: Fila[]; preventivas: Fila[]; completadas: Fila[];
  equiposDetenidos: { codigo: string; nombre: string; estado: string; criticidad: string; orden?: string | null }[]; recurrentes: { equipo: string; nombre: string; fallas: number }[];
  avisos: { id: number; ordenId: number; orden?: string | null; tipo: string; tipoTexto: string; texto: string; autorNombre: string; fecha: string }[];
}
type Clave = "sinAsignar" | "sinConfirmar" | "atrasadas" | "enEjecucion" | "pendientesLiberacion" | "preventivas" | "completadas";
const GRUPOS: [Clave, string, typeof Inbox, string][] = [
  ["sinAsignar", "Sin asignar", Inbox, "var(--s-rojo)"], ["sinConfirmar", "Sin confirmar recepción", Hourglass, "var(--s-ambar)"], ["atrasadas", "Atrasadas", AlertTriangle, "var(--s-rojo)"],
  ["enEjecucion", "En ejecución", Wrench, "var(--s-azul)"], ["pendientesLiberacion", "Pendientes de liberación", ShieldCheck, "var(--s-ambar)"], ["preventivas", "Preventivas abiertas", CalendarClock, "var(--s-diagnostico)"], ["completadas", "Cerradas (7 días)", CheckCircle2, "var(--s-verde)"],
];
const hm = (iso: string) => new Date(iso).toLocaleString("es-CL", { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

/** Vista de la jefatura: todo lo que el departamento tiene entre manos y qué necesita una decisión, con acciones en la misma fila. */
export function Seguimiento() {
  const { usuario } = useAuth();
  const puedeAsignar = tiene(usuario, "ordenes.asignar");
  const d = useQuery({ queryKey: ["seguimiento"], queryFn: () => api.get<Datos>("/api/mantenimiento/seguimiento"), refetchInterval: 15_000 });
  const tecnicos = useTecnicos();
  const [grupo, setGrupo] = useState<Clave>("sinAsignar");
  const [asignar, setAsignar] = useState<Fila | null>(null);
  if (d.isError) return <EstadoVista tipo="error" texto="No se pudo cargar el seguimiento." accion={<Boton tam="s" variante="contorno" onClick={() => void d.refetch()}>Reintentar</Boton>} />;
  const datos = d.data;
  const filas = datos?.[grupo] ?? [];
  return (
    <div className="grid gap-4">
      <header><h1 className="t-pantalla">Seguimiento del departamento</h1><p className="text-[12.5px] text-gris">Órdenes por estado, lo que los técnicos informaron y los equipos detenidos. Se actualiza solo.</p></header>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7" role="tablist" aria-label="Grupos de órdenes">
        {GRUPOS.map(([k, t, I, c]) => (
          <button key={k} role="tab" aria-selected={grupo === k} onClick={() => setGrupo(k)} className={cx("tarjeta relative cursor-pointer overflow-hidden px-3 py-2.5 text-left transition-colors duration-150", grupo === k ? "border-acento/60 bg-papel-2" : "hover:border-linea")}>
            <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: c }} />
            <p className="flex min-h-[30px] items-start gap-1.5 text-[11.5px] leading-tight text-gris"><I className="mt-px size-3.5 shrink-0" />{t}</p>
            <p className="t-kpi mt-0.5 text-[22px]">{datos ? datos[k].length : "—"}</p>
          </button>
        ))}
      </div>
      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="tarjeta min-w-0 overflow-hidden" aria-label="Órdenes del grupo">
          {!datos ? <div className="p-4"><Esqueleto className="h-60" /></div> : filas.length === 0 ? <p className="px-4 py-10 text-center text-[12.5px] text-gris">Nada en este grupo.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-[12.5px]">
                <thead className="sticky top-0 bg-papel"><tr className="border-b border-linea-suave text-left">{["Orden", "Equipo", "Trabajo", "Técnico", "Horario", ""].map((h) => <th key={h} className="t-etiqueta px-3 py-2 font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {filas.map((o) => (
                    <tr key={o.id} className="border-b border-linea-suave/70 last:border-0 hover:bg-papel-2/60">
                      <td className="whitespace-nowrap px-3 py-2"><span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: PRIO[o.prioridad]?.c }} title={`prioridad ${o.prioridad}`} /><span className="t-dato">{o.codigo}</span>{o.simulada && <MarcaSimulado className="ml-1.5" />}</td>
                      <td className="px-3 py-2"><span className="t-dato">{o.equipo}</span><span className="block max-w-[160px] truncate text-[11px] text-gris" title={o.equipoNombre}>{o.equipoNombre}</span></td>
                      <td className="max-w-[260px] px-3 py-2"><p className="truncate" title={o.titulo}>{o.titulo}</p><p className="text-[11px] text-gris">{ESP[o.especialidad] ?? o.especialidad} · {o.tipo}</p></td>
                      <td className="px-3 py-2">{o.asignado ?? <span className="whitespace-nowrap text-rojo">sin técnico</span>}{o.asignadoAId && o.estado === "abierta" && <span className={cx("block text-[11px]", o.recibidaEn ? "text-verde" : "text-ambar")}>{o.recibidaEn ? "recepción confirmada" : "no ha confirmado"}</span>}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-[11.5px] text-gris">{o.inicio ? hm(o.inicio) : "sin programar"}{o.fechaLimite && <span className="block text-ambar-hondo">límite {new Date(o.fechaLimite + "T12:00").toLocaleDateString("es-CL", { day: "numeric", month: "short" })}</span>}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <div className="inline-flex gap-1.5">
                          {puedeAsignar && o.estado === "abierta" && <Boton tam="s" variante={o.asignadoAId ? "contorno" : "acento"} onClick={() => setAsignar(o)}>{o.asignadoAId ? "Reprogramar" : "Asignar"}</Boton>}
                          <Boton tam="s" variante="secundario" onClick={() => ir(`/mantenimiento?orden=${o.id}`)}>{o.estado === "por_verificar" ? "Revisar y firmar" : "Abrir"}</Boton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <aside className="grid content-start gap-4 md:grid-cols-3 2xl:grid-cols-1">
          <Panel titulo="Lo que informaron los técnicos" icono={<MessageSquare className="size-4 text-gris" />} n={datos?.avisos.length}>
            {datos?.avisos.length === 0 && <p className="px-3.5 py-4 text-[12.5px] text-gris">Sin problemas ni solicitudes en las últimas 48 horas.</p>}
            {datos?.avisos.map((a) => (
              <button key={a.id} onClick={() => ir(`/mantenimiento?orden=${a.ordenId}`)} className="block w-full cursor-pointer border-b border-linea-suave/60 px-3.5 py-2 text-left last:border-0 hover:bg-papel-2/60">
                <p className="flex items-baseline gap-2 text-[12px]"><b className={cx("font-semibold", a.tipo === "problema" ? "text-rojo" : "text-ambar-hondo")}>{a.tipoTexto}</b><span className="t-dato text-gris">{a.orden}</span><span className="ml-auto flex items-center gap-1 text-[11px] text-gris"><Clock className="size-3" />{hm(a.fecha)}</span></p>
                <p className="line-clamp-2 text-[12.5px]">{a.texto}</p><p className="text-[11px] text-gris">{a.autorNombre}</p>
              </button>
            ))}
          </Panel>
          <Panel titulo="Equipos detenidos" icono={<PauseCircle className="size-4 text-rojo" />} n={datos?.equiposDetenidos.length}>
            {datos?.equiposDetenidos.length === 0 && <p className="px-3.5 py-4 text-[12.5px] text-gris">Todos los equipos en marcha.</p>}
            {datos?.equiposDetenidos.map((e) => (
              <button key={e.codigo} onClick={() => ir(`/explorador?equipo=${e.codigo}`)} className="flex w-full cursor-pointer items-center gap-2 border-b border-linea-suave/60 px-3.5 py-2 text-left last:border-0 hover:bg-papel-2/60">
                <span className="min-w-0 flex-1"><span className="t-dato text-[12px]">{e.codigo}</span> <span className="text-[12px] text-gris">{e.nombre}</span>{e.orden && <span className="block text-[11px] text-gris">{e.orden}</span>}</span><EstadoEquipo estado={e.estado} corto tam="s" />
              </button>
            ))}
          </Panel>
          <Panel titulo="Fallas recurrentes (30 días)" icono={<Repeat className="size-4 text-ambar" />} n={datos?.recurrentes.length}>
            {datos?.recurrentes.length === 0 && <p className="px-3.5 py-4 text-[12.5px] text-gris">Sin equipos con fallas repetidas.</p>}
            {datos?.recurrentes.map((r) => <p key={r.equipo} className="flex items-center gap-2 border-b border-linea-suave/60 px-3.5 py-2 text-[12.5px] last:border-0"><span className="t-dato">{r.equipo}</span><span className="min-w-0 flex-1 truncate text-gris">{r.nombre}</span><Chip tono="aviso" punto={false}>{r.fallas} correctivas</Chip></p>)}
          </Panel>
        </aside>
      </div>
      {asignar && <DialogoAsignar ot={{ ...asignar, equipoTipo: "", criticidad: "", automatica: false, creada: "" } as Ot} tecnicos={tecnicos.data ?? []} onCerrar={() => { setAsignar(null); void d.refetch(); }} />}
    </div>
  );
}

function Panel({ titulo, icono, n, children }: { titulo: string; icono: ReactNode; n?: number; children: ReactNode }) {
  return (
    <section className="tarjeta overflow-hidden">
      <header className="flex items-center gap-2 border-b border-linea-suave px-3.5 py-2.5">{icono}<p className="t-seccion flex-1">{titulo}</p>{n !== undefined && <span className="num text-[12px] text-gris">{n}</span>}</header>
      <div className="max-h-[300px] overflow-y-auto">{children}</div>
    </section>
  );
}
