import { useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent as PE } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BadgeCheck, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Clock, GripVertical, Lock, Search, ShieldAlert, UserRound, Users } from "lucide-react";
import type { FichaEquipo } from "@sima/cliente";
import { AreaTexto, Boton, Cajon, Campo, Dialogo, Entrada, Esqueleto, EstadoVista, Seleccion, cx, mensajeDe, useAviso } from "@sima/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { ir } from "../ruta";
import { ESPECIALIDAD_CARGO, tiene } from "../roles";
import { ESP, PRIO, useHerramientas, type Ot } from "./bloques";

// ------------------------------------------------------------------------------------------------ tipos
export interface ItemCal { id: number; tipo: string; area: string; titulo: string; descripcion: string; inicio: string; fin: string; ubicacion: string; prioridad: string; estado: string; ordenId?: number | null; equipoId?: number | null; responsableId?: string | null; detalle: boolean; personas: { id: string; nombre?: string | null; rol?: string | null; estado?: string | null }[]; version: number }
export interface Tecnico { id: string; nombre: string; cargo: string; cargoId: number; turno: string; turnoTexto: string; enTurno: boolean; otEnCurso?: string | null; horasSemana: number; habilitaciones: { nombre: string; vence: string; vigente: boolean }[] }
interface Conflicto { trabajadorId: string; persona: string; tipo: string; detalle: string; bloquea: boolean }
interface RespuestaConflicto { error: string; requiereConfirmacion: boolean; conflictos: Conflicto[]; sugerencias: string[] }
type Vista = "dia" | "semana" | "mes" | "tecnicos";

// ------------------------------------------------------------------------------------------------ utilidades de fecha (hora local del equipo)
const H_INI = 6, H_FIN = 23, ALTO_H = 44;                    // horas visibles y alto de una hora en píxeles
const lunes = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const sumarDias = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const mismoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const hm = (d: Date) => d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });
const iso = (d: Date) => d.toISOString();
const fechaInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const horaInput = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const COLOR: Record<string, { fondo: string; borde: string; texto: string }> = {
  correctiva: { fondo: "color-mix(in srgb, var(--s-rojo) 22%, var(--s-superficie))", borde: "var(--s-rojo)", texto: "Correctivo" },
  preventiva: { fondo: "color-mix(in srgb, var(--s-ambar) 20%, var(--s-superficie))", borde: "var(--s-ambar)", texto: "Preventivo" },
  en_curso: { fondo: "color-mix(in srgb, var(--s-azul) 26%, var(--s-superficie))", borde: "var(--s-azul)", texto: "En ejecución" },
  completada: { fondo: "color-mix(in srgb, var(--s-verde) 16%, var(--s-superficie))", borde: "var(--s-verde)", texto: "Completado" },
  prevencion: { fondo: "color-mix(in srgb, var(--s-diagnostico) 22%, var(--s-superficie))", borde: "var(--s-diagnostico)", texto: "Capacitación" },
  ocupado: { fondo: "repeating-linear-gradient(135deg, var(--s-superficie-2) 0 6px, var(--s-superficie) 6px 12px)", borde: "var(--s-borde)", texto: "Ocupado" },
};
const colorDe = (a: ItemCal, ots: Map<number, Ot>) => !a.detalle ? COLOR.ocupado : a.area === "prevencion" ? COLOR.prevencion : a.estado === "completada" ? COLOR.completada : a.estado === "en_curso" ? COLOR.en_curso
  : (a.ordenId && ots.get(a.ordenId)?.tipo === "preventiva") || a.tipo === "preventiva" ? COLOR.preventiva : COLOR.correctiva;

export function useCalendario(desde: Date, hasta: Date, area?: string) {
  return useQuery({ queryKey: ["calendario", iso(desde), iso(hasta), area ?? ""], queryFn: () => api.get<ItemCal[]>(`/api/calendario?desde=${encodeURIComponent(iso(desde))}&hasta=${encodeURIComponent(iso(hasta))}${area ? `&area=${area}` : ""}`), refetchInterval: 20_000 });
}
export const useTecnicos = () => useQuery({ queryKey: ["calendario", "tecnicos"], queryFn: () => api.get<Tecnico[]>("/api/calendario/tecnicos"), refetchInterval: 60_000 });

// ================================================================================================ planificación de mantenimiento
export function PlanificacionMantenimiento() {
  const { usuario } = useAuth();
  const aviso = useAviso();
  const qc = useQueryClient();
  const puedeAsignar = tiene(usuario, "ordenes.asignar");
  const [vista, setVista] = useState<Vista>(() => { try { return (localStorage.getItem("sima.cal.vista") as Vista) || "semana"; } catch { return "semana"; } });
  const [ancla, setAncla] = useState(() => new Date());
  const [filtroEsp, setFiltroEsp] = useState("");
  const [filtroPrio, setFiltroPrio] = useState("");
  const [filtroTec, setFiltroTec] = useState("");
  const [buscar, setBuscar] = useState("");
  const [asignar, setAsignar] = useState<{ ot: Ot; inicio?: Date; responsable?: string } | null>(null);
  const [detalle, setDetalle] = useState<ItemCal | null>(null);
  const [mover, setMover] = useState<{ item: ItemCal; inicio: Date; fin: Date; respuesta?: RespuestaConflicto } | null>(null);
  useEffect(() => { try { localStorage.setItem("sima.cal.vista", vista); } catch { /* */ } }, [vista]);

  const rango = useMemo(() => {
    if (vista === "dia") { const d = new Date(ancla); d.setHours(0, 0, 0, 0); return { desde: d, hasta: sumarDias(d, 1), dias: [d] }; }
    if (vista === "mes") { const p = new Date(ancla.getFullYear(), ancla.getMonth(), 1); const ini = lunes(p); return { desde: ini, hasta: sumarDias(ini, 42), dias: Array.from({ length: 42 }, (_, i) => sumarDias(ini, i)) }; }
    const ini = lunes(ancla); return { desde: ini, hasta: sumarDias(ini, 7), dias: Array.from({ length: 7 }, (_, i) => sumarDias(ini, i)) };
  }, [vista, ancla]);
  const cal = useCalendario(rango.desde, rango.hasta);
  const ots = useQuery({ queryKey: ["ordenes"], queryFn: () => api.get<Ot[]>("/api/ordenes"), refetchInterval: 20_000 });
  const tecnicos = useTecnicos();
  const mapaOts = useMemo(() => new Map((ots.data ?? []).map((o) => [o.id, o])), [ots.data]);
  const backlog = (ots.data ?? []).filter((o) => o.estado === "abierta" && !o.agendada && !(cal.data ?? []).some((a) => a.ordenId === o.id))
    .filter((o) => (!filtroEsp || o.especialidad === filtroEsp) && (!filtroPrio || o.prioridad === filtroPrio) && (!buscar || `${o.codigo} ${o.titulo} ${o.equipo}`.toLowerCase().includes(buscar.toLowerCase())))
    .sort((a, b) => ["critica", "alta", "media", "baja"].indexOf(a.prioridad) - ["critica", "alta", "media", "baja"].indexOf(b.prioridad));
  const items = (cal.data ?? []).filter((a) => (!filtroTec || a.personas.some((p) => p.id === filtroTec)) && (!filtroEsp || !a.ordenId || mapaOts.get(a.ordenId)?.especialidad === filtroEsp) && (!filtroPrio || a.prioridad === filtroPrio || !a.detalle));

  const reprogramar = useMutation({
    mutationFn: (v: { item: ItemCal; inicio: Date; fin: Date; confirmar?: boolean }) => api.put(`/api/calendario/actividades/${v.item.id}`, { inicio: iso(v.inicio), fin: iso(v.fin), confirmar: !!v.confirmar }),
    onSuccess: (_, v) => { aviso(`Reprogramada para ${v.inicio.toLocaleDateString("es-CL", { weekday: "short", day: "numeric" })} ${hm(v.inicio)}–${hm(v.fin)}. Se avisó a los participantes.`, "ok"); setMover(null); void qc.invalidateQueries({ queryKey: ["calendario"] }); void qc.invalidateQueries({ queryKey: ["ordenes"] }); },
    onError: (e, v) => { const d = (e as { datos?: RespuestaConflicto }).datos; if (d?.conflictos) setMover({ ...v, respuesta: d }); else aviso(mensajeDe(e), "error"); void qc.invalidateQueries({ queryKey: ["calendario"] }); },
  });
  const solicitarMover = (item: ItemCal, inicio: Date, fin: Date) => { if (!puedeAsignar || !item.detalle) return; reprogramar.mutate({ item, inicio, fin }); };
  const soltarOt = (otId: number, inicio: Date, responsable?: string) => { const ot = mapaOts.get(otId); if (ot && puedeAsignar) setAsignar({ ot, inicio, responsable }); };
  const navegar = (n: number) => setAncla((a) => vista === "mes" ? new Date(a.getFullYear(), a.getMonth() + n, 1) : sumarDias(a, vista === "dia" ? n : 7 * n));
  const tituloRango = vista === "mes" ? ancla.toLocaleDateString("es-CL", { month: "long", year: "numeric" }) : vista === "dia" ? ancla.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })
    : `${rango.dias[0].toLocaleDateString("es-CL", { day: "numeric", month: "short" })} – ${rango.dias[6].toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}`;
  const tecsFiltrados = (tecnicos.data ?? []).filter((t) => (!filtroTec || t.id === filtroTec) && (!filtroEsp || !ESPECIALIDAD_CARGO[t.cargoId] || ESPECIALIDAD_CARGO[t.cargoId].includes(filtroEsp)));

  return (
    <div className="grid h-[calc(100dvh-112px)] min-h-[560px] grid-rows-[auto_minmax(0,1fr)] gap-3">
      <header className="flex flex-wrap items-end gap-3">
        <div className="mr-auto min-w-0"><h1 className="t-pantalla">Planificación de mantenimiento</h1><p className="text-[12.5px] text-gris">Arrastre una orden al calendario para asignarla; arrastre un bloque para reprogramarlo o estire su borde para cambiar la duración. La disponibilidad se revisa en el servidor.</p></div>
      </header>
      <div className="grid min-h-0 gap-3 lg:grid-cols-[272px_minmax(0,1fr)]">
        {/* pendientes de programación */}
        <aside className="tarjeta flex min-h-0 flex-col" aria-label="Órdenes por programar">
          <div className="border-b border-linea-suave p-3">
            <p className="t-seccion">Por programar <span className="num text-gris">{backlog.length}</span></p>
            <label className="relative mt-2 block"><Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gris" /><Entrada value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar orden o equipo" className="h-8 pl-8 text-[12.5px]" aria-label="Buscar orden" /></label>
          </div>
          <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
            {ots.isLoading && [0, 1, 2].map((i) => <Esqueleto key={i} className="h-16" />)}
            {!ots.isLoading && backlog.length === 0 && <li className="px-2 py-8 text-center text-[12.5px] text-gris">Todo programado con estos filtros.</li>}
            {backlog.map((o) => (
              <li key={o.id} draggable={puedeAsignar} onDragStart={(e: DragEvent) => { e.dataTransfer.setData("text/sima-ot", String(o.id)); e.dataTransfer.effectAllowed = "move"; }}
                className={cx("group relative rounded-md border border-linea-suave bg-papel px-2.5 py-2 transition-colors duration-150 hover:border-linea", puedeAsignar && "cursor-grab active:cursor-grabbing")}>
                <span className="absolute inset-y-0 left-0 w-[3px] rounded-l-md" style={{ background: PRIO[o.prioridad]?.c }} />
                <div className="flex items-center gap-1.5"><GripVertical className="size-3.5 shrink-0 text-apagado" /><span className="t-dato text-[11.5px] text-gris">{o.codigo} · {o.equipo}</span><span className="ml-auto text-[10.5px] font-semibold uppercase" style={{ color: PRIO[o.prioridad]?.c }}>{o.prioridad}</span></div>
                <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug">{o.titulo}</p>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-gris"><span>{ESP[o.especialidad] ?? o.especialidad}</span>{o.tipo === "preventiva" && <span>· preventiva</span>}{o.asignado && <span className="truncate">· {o.asignado.split(" ")[0]}</span>}
                  {puedeAsignar && <button onClick={() => setAsignar({ ot: o })} className="ml-auto cursor-pointer font-semibold text-acento opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus:opacity-100">Asignar</button>}</div>
              </li>
            ))}
          </ul>
        </aside>

        {/* calendario */}
        <section className="tarjeta flex min-h-0 min-w-0 flex-col" aria-label="Calendario">
          <div className="flex flex-wrap items-center gap-2 border-b border-linea-suave px-3 py-2">
            <div className="flex items-center gap-1">
              <Boton tam="s" icono variante="texto" aria-label="Anterior" onClick={() => navegar(-1)}><ChevronLeft className="size-4" /></Boton>
              <Boton tam="s" variante="secundario" onClick={() => setAncla(new Date())}>Hoy</Boton>
              <Boton tam="s" icono variante="texto" aria-label="Siguiente" onClick={() => navegar(1)}><ChevronRight className="size-4" /></Boton>
            </div>
            <p className="min-w-0 truncate text-[13.5px] font-semibold first-letter:uppercase">{tituloRango}</p>
            <div role="radiogroup" aria-label="Vista" className="ml-auto flex rounded-md border border-linea-suave p-0.5">
              {([["dia", "Día por técnico", UserRound], ["semana", "Semana", CalendarRange], ["mes", "Mes", CalendarDays], ["tecnicos", "Carga", Users]] as const).map(([k, t, I]) => (
                <button key={k} role="radio" aria-checked={vista === k} onClick={() => setVista(k)} className={cx("inline-flex h-7 cursor-pointer items-center gap-1.5 rounded px-2.5 text-[12px] font-medium", vista === k ? "bg-papel-2 text-negro" : "text-gris hover:text-negro")}><I className="size-3.5" />{t}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b border-linea-suave px-3 py-1.5 text-[12px]">
            <Seleccion value={filtroTec} onChange={(e) => setFiltroTec(e.target.value)} className="h-7 w-auto min-w-[170px] text-[12px]" aria-label="Filtrar por técnico"><option value="">Todos los técnicos</option>{(tecnicos.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}</Seleccion>
            <Seleccion value={filtroEsp} onChange={(e) => setFiltroEsp(e.target.value)} className="h-7 w-auto min-w-[170px] text-[12px]" aria-label="Filtrar por especialidad"><option value="">Toda especialidad</option>{Object.entries(ESP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Seleccion>
            <Seleccion value={filtroPrio} onChange={(e) => setFiltroPrio(e.target.value)} className="h-7 w-auto min-w-[150px] text-[12px]" aria-label="Filtrar por prioridad"><option value="">Toda prioridad</option>{["critica", "alta", "media", "baja"].map((p) => <option key={p} value={p}>{p}</option>)}</Seleccion>
            <span className="ml-auto flex flex-wrap items-center gap-3 text-[11px] text-gris">{(["correctiva", "preventiva", "en_curso", "completada", "prevencion", "ocupado"] as const).map((k) => <span key={k} className="inline-flex items-center gap-1"><i className="size-2.5 rounded-sm border" style={{ background: COLOR[k].fondo, borderColor: COLOR[k].borde }} />{COLOR[k].texto}</span>)}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {cal.isError ? <EstadoVista tipo="error" texto="No se pudo cargar el calendario." /> : cal.isLoading ? <div className="p-4"><Esqueleto className="h-80" /></div>
              : vista === "semana" ? <Rejilla columnas={rango.dias.map((d) => ({ clave: d.toISOString(), titulo: d.toLocaleDateString("es-CL", { weekday: "short", day: "numeric" }), hoy: mismoDia(d, new Date()), dia: d }))} items={items} ots={mapaOts} alSoltarOt={soltarOt} alMover={solicitarMover} alAbrir={setDetalle} editable={puedeAsignar} />
              : vista === "dia" ? <Rejilla columnas={tecsFiltrados.map((t) => ({ clave: t.id, titulo: t.nombre, sub: `${t.turno} · ${t.horasSemana} h sem.`, alerta: !t.habilitaciones.some((h) => h.nombre.includes("LOTO") && h.vigente), dia: rango.dias[0], persona: t.id }))} items={items} ots={mapaOts} alSoltarOt={soltarOt} alMover={solicitarMover} alAbrir={setDetalle} editable={puedeAsignar} porPersona />
              : vista === "mes" ? <Mes dias={rango.dias} mes={ancla.getMonth()} items={items} ots={mapaOts} alAbrir={setDetalle} alDia={(d) => { setAncla(d); setVista("semana"); }} />
              : <Carga tecnicos={tecsFiltrados} dias={rango.dias} items={items} ots={mapaOts} alAbrir={setDetalle} alSoltarOt={soltarOt} editable={puedeAsignar} />}
          </div>
        </section>
      </div>

      {asignar && <DialogoAsignar ot={asignar.ot} inicio={asignar.inicio} responsable={asignar.responsable} tecnicos={tecnicos.data ?? []} onCerrar={() => setAsignar(null)} />}
      <DetalleActividad item={detalle} ots={mapaOts} onCerrar={() => setDetalle(null)} alEditar={(ot) => { setDetalle(null); setAsignar({ ot }); }} puedeAsignar={puedeAsignar} />
      <Dialogo abierto={!!mover?.respuesta} onCerrar={() => setMover(null)} titulo="Conflictos al reprogramar" ancho={520}
        pie={<><Boton variante="contorno" onClick={() => setMover(null)}>Cancelar</Boton>{mover?.respuesta?.requiereConfirmacion && <Boton variante="acento" cargando={reprogramar.isPending} onClick={() => mover && reprogramar.mutate({ item: mover.item, inicio: mover.inicio, fin: mover.fin, confirmar: true })}>Confirmar de todos modos</Boton>}</>}>
        {mover?.respuesta && <ListaConflictos r={mover.respuesta} alElegir={(s) => { const ini = new Date(s); const dur = mover.fin.getTime() - mover.inicio.getTime(); reprogramar.mutate({ item: mover.item, inicio: ini, fin: new Date(ini.getTime() + dur) }); }} />}
      </Dialogo>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ rejilla horaria (semana o día por técnico)
interface ColumnaRejilla { clave: string; titulo: string; sub?: string; hoy?: boolean; alerta?: boolean; dia: Date; persona?: string }
function Rejilla({ columnas, items, ots, alSoltarOt, alMover, alAbrir, editable, porPersona }: { columnas: ColumnaRejilla[]; items: ItemCal[]; ots: Map<number, Ot>; alSoltarOt: (ot: number, inicio: Date, responsable?: string) => void; alMover: (i: ItemCal, ini: Date, fin: Date) => void; alAbrir: (i: ItemCal) => void; editable: boolean; porPersona?: boolean }) {
  const horas = Array.from({ length: H_FIN - H_INI }, (_, i) => H_INI + i);
  const cuerpo = useRef<HTMLDivElement>(null);
  const [arrastre, setArrastre] = useState<{ id: number; dx: number; dy: number; modo: "mover" | "estirar"; col: number; dyFin: number } | null>(null);
  const [hover, setHover] = useState<{ col: number; min: number } | null>(null);
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setAhora(new Date()), 60_000); return () => clearInterval(t); }, []);
  useEffect(() => { if (cuerpo.current) cuerpo.current.parentElement!.scrollTop = Math.max(0, (Math.min(new Date().getHours(), 20) - H_INI - 1) * ALTO_H); }, []);
  const minDe = (y: number) => Math.max(0, Math.min((H_FIN - H_INI) * 60 - 30, Math.round(((y / ALTO_H) * 60) / 30) * 30));
  const fechaDe = (col: number, min: number) => { const d = new Date(columnas[col].dia); d.setHours(H_INI, 0, 0, 0); return new Date(d.getTime() + min * 60_000); };
  const posicion = (a: ItemCal, dia: Date) => {
    const ini = new Date(a.inicio), fin = new Date(a.fin);
    const d0 = new Date(dia); d0.setHours(H_INI, 0, 0, 0); const d1 = new Date(dia); d1.setHours(H_FIN, 0, 0, 0);
    const i = Math.max(ini.getTime(), d0.getTime()), f = Math.min(fin.getTime(), d1.getTime());
    if (f <= i) return null;
    return { top: ((i - d0.getTime()) / 3_600_000) * ALTO_H, alto: Math.max(18, ((f - i) / 3_600_000) * ALTO_H) };
  };
  const enColumna = (a: ItemCal, c: ColumnaRejilla) => porPersona ? a.personas.some((p) => p.id === c.persona) : true;
  const fin = (e: PE) => {
    if (!arrastre) return;
    const a = items.find((x) => x.id === arrastre.id); setArrastre(null);
    if (!a || (Math.abs(arrastre.dy) < 4 && Math.abs(arrastre.dx) < 4 && arrastre.modo === "mover")) { if (a) alAbrir(a); return; }
    const ini = new Date(a.inicio), f = new Date(a.fin);
    const pasos = Math.round(((arrastre.dy / ALTO_H) * 60) / 30) * 30;
    if (arrastre.modo === "estirar") { const nf = new Date(f.getTime() + pasos * 60_000); if (nf.getTime() - ini.getTime() >= 15 * 60_000) alMover(a, ini, nf); return; }
    const colW = (cuerpo.current?.getBoundingClientRect().width ?? 1) / columnas.length;
    const salto = porPersona ? 0 : Math.round(arrastre.dx / colW);
    const ni = new Date(ini.getTime() + pasos * 60_000 + salto * 86_400_000);
    alMover(a, ni, new Date(ni.getTime() + (f.getTime() - ini.getTime())));
    void e;
  };
  return (
    <div className="min-w-[640px]" onPointerMove={(e) => arrastre && setArrastre({ ...arrastre, dx: arrastre.dx + e.movementX, dy: arrastre.dy + e.movementY })} onPointerUp={fin} onPointerLeave={() => setArrastre(null)}>
      <div className="sticky top-0 z-20 grid border-b border-linea-suave bg-papel" style={{ gridTemplateColumns: `52px repeat(${columnas.length}, minmax(${porPersona ? 120 : 96}px, 1fr))` }}>
        <div />
        {columnas.map((c) => (
          <div key={c.clave} className={cx("min-w-0 border-l border-linea-suave px-2 py-1.5", c.hoy && "bg-acento-claro")} title={c.titulo}>
            <p className={cx("truncate text-[12px] font-semibold first-letter:uppercase", c.hoy && "text-acento")}>{c.titulo}</p>
            {c.sub && <p className="flex items-center gap-1 truncate text-[10.5px] text-gris">{c.alerta && <ShieldAlert className="size-3 text-rojo" aria-label="Sin LOTO vigente" />}{c.sub}</p>}
          </div>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: `52px repeat(${columnas.length}, minmax(${porPersona ? 120 : 96}px, 1fr))` }}>
        <div>{horas.map((h) => <div key={h} className="relative border-b border-linea-suave/60 pr-1.5 text-right text-[10.5px] text-gris" style={{ height: ALTO_H }}><span className={cx("relative", h > H_INI && "-top-1.5")}>{String(h).padStart(2, "0")}:00</span></div>)}</div>
        <div ref={cuerpo} className="relative grid" style={{ gridColumn: `span ${columnas.length}`, gridTemplateColumns: `repeat(${columnas.length}, minmax(0, 1fr))` }}>
          {columnas.map((c, ci) => (
            <div key={c.clave} className={cx("relative border-l border-linea-suave", c.hoy && "bg-acento-claro/30")}
              onDragOver={(e) => { if (!editable) return; e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); setHover({ col: ci, min: minDe(e.clientY - r.top) }); }}
              onDragLeave={() => setHover(null)}
              onDrop={(e) => { e.preventDefault(); const id = Number(e.dataTransfer.getData("text/sima-ot")); const r = e.currentTarget.getBoundingClientRect(); setHover(null); if (id) alSoltarOt(id, fechaDe(ci, minDe(e.clientY - r.top)), c.persona); }}>
              {horas.map((h) => <div key={h} className="border-b border-linea-suave/60" style={{ height: ALTO_H }}><div className="h-1/2 border-b border-dashed border-linea-suave/40" /></div>)}
              {hover?.col === ci && <div className="pointer-events-none absolute inset-x-1 rounded border-2 border-dashed border-acento bg-acento-claro" style={{ top: (hover.min / 60) * ALTO_H, height: ALTO_H * 1.5 }}><span className="ml-1 text-[10.5px] font-semibold text-acento">{hm(fechaDe(ci, hover.min))}</span></div>}
              {mismoDia(c.dia, ahora) && ahora.getHours() >= H_INI && ahora.getHours() < H_FIN && <div className="pointer-events-none absolute inset-x-0 z-10 h-px bg-rojo" style={{ top: ((ahora.getHours() - H_INI) + ahora.getMinutes() / 60) * ALTO_H }}><span className="absolute -left-1 -top-1 size-2 rounded-full bg-rojo" /></div>}
              {items.filter((a) => enColumna(a, c)).map((a) => {
                const p = posicion(a, c.dia); if (!p) return null;
                const col = colorDe(a, ots); const ot = a.ordenId ? ots.get(a.ordenId) : undefined;
                const activo = arrastre?.id === a.id;
                const resp = a.personas.find((x) => x.rol === "responsable")?.nombre ?? a.personas[0]?.nombre;
                return (
                  <div key={`${a.id}-${c.clave}`} role="button" tabIndex={0} aria-label={`${a.titulo}, ${hm(new Date(a.inicio))} a ${hm(new Date(a.fin))}`} onKeyDown={(e) => e.key === "Enter" && alAbrir(a)}
                    onPointerDown={(e) => { if (!editable || !a.detalle || a.estado === "completada") { return; } e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); setArrastre({ id: a.id, dx: 0, dy: 0, modo: "mover", col: ci, dyFin: 0 }); }}
                    onClick={() => (!editable || !a.detalle || a.estado === "completada") && alAbrir(a)}
                    className={cx("absolute left-1 right-1 z-[5] overflow-hidden rounded border-l-[3px] px-1.5 py-1 text-left shadow-sm transition-shadow duration-150 hover:shadow-md", editable && a.detalle && a.estado !== "completada" ? "cursor-grab" : "cursor-pointer", activo && "z-30 opacity-90 ring-2 ring-acento")}
                    style={{ top: p.top + (activo && arrastre.modo === "mover" ? arrastre.dy : 0), height: p.alto + (activo && arrastre.modo === "estirar" ? arrastre.dy : 0), transform: activo && arrastre.modo === "mover" && !porPersona ? `translateX(${arrastre.dx}px)` : undefined, background: col.fondo, borderLeftColor: col.borde }}>
                    <p className="truncate text-[11px] font-semibold leading-tight">{a.detalle ? (ot ? `${ot.codigo} · ${ot.equipo}` : a.titulo) : "Ocupado"}</p>
                    {p.alto > 30 && <p className="truncate text-[10.5px] leading-tight text-carbon">{a.detalle ? (porPersona ? ot?.titulo ?? a.titulo : resp ?? "") : ""}</p>}
                    {p.alto > 44 && <p className="truncate text-[10px] text-gris">{hm(new Date(a.inicio))}–{hm(new Date(a.fin))}{a.personas.length > 1 && a.detalle ? ` · +${a.personas.length - 1}` : ""}</p>}
                    {editable && a.detalle && a.estado !== "completada" && <span onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); setArrastre({ id: a.id, dx: 0, dy: 0, modo: "estirar", col: ci, dyFin: 0 }); }} className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize" aria-hidden />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ mes
function Mes({ dias, mes, items, ots, alAbrir, alDia }: { dias: Date[]; mes: number; items: ItemCal[]; ots: Map<number, Ot>; alAbrir: (i: ItemCal) => void; alDia: (d: Date) => void }) {
  return (
    <div className="grid min-w-[640px] grid-cols-7">
      {["lun", "mar", "mié", "jue", "vie", "sáb", "dom"].map((d) => <p key={d} className="t-etiqueta border-b border-linea-suave px-2 py-1.5">{d}</p>)}
      {dias.map((d) => {
        const del = items.filter((a) => mismoDia(new Date(a.inicio), d));
        return (
          <div key={d.toISOString()} className={cx("min-h-[96px] border-b border-l border-linea-suave p-1", d.getMonth() !== mes && "bg-chapa/40", mismoDia(d, new Date()) && "bg-acento-claro")}>
            <button onClick={() => alDia(d)} className={cx("mb-0.5 cursor-pointer rounded px-1 text-[11.5px] font-semibold hover:bg-papel-2", d.getMonth() !== mes && "text-apagado")}>{d.getDate()}</button>
            {del.slice(0, 3).map((a) => { const c = colorDe(a, ots); const ot = a.ordenId ? ots.get(a.ordenId) : undefined; return (
              <button key={a.id} onClick={() => alAbrir(a)} className="mb-0.5 block w-full cursor-pointer truncate rounded-sm border-l-2 px-1 text-left text-[10.5px]" style={{ background: c.fondo, borderLeftColor: c.borde }}>{hm(new Date(a.inicio))} {a.detalle ? (ot?.codigo ?? a.titulo) : "Ocupado"}</button>
            ); })}
            {del.length > 3 && <button onClick={() => alDia(d)} className="cursor-pointer px-1 text-[10.5px] text-gris hover:text-negro">+{del.length - 3} más</button>}
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ carga por técnico
function Carga({ tecnicos, dias, items, ots, alAbrir, alSoltarOt, editable }: { tecnicos: Tecnico[]; dias: Date[]; items: ItemCal[]; ots: Map<number, Ot>; alAbrir: (i: ItemCal) => void; alSoltarOt: (ot: number, inicio: Date, responsable?: string) => void; editable: boolean }) {
  return (
    <table className="w-full min-w-[760px] border-collapse text-[12px]">
      <thead className="sticky top-0 z-10 bg-papel"><tr><th className="t-etiqueta w-[200px] border-b border-linea-suave px-3 py-2 text-left">Técnico</th>{dias.map((d) => <th key={d.toISOString()} className={cx("t-etiqueta border-b border-l border-linea-suave px-2 py-2 text-left", mismoDia(d, new Date()) && "text-acento")}>{d.toLocaleDateString("es-CL", { weekday: "short", day: "numeric" })}</th>)}</tr></thead>
      <tbody>
        {tecnicos.map((t) => {
          const carga = Math.min(1, t.horasSemana / 40);
          return (
            <tr key={t.id} className="align-top">
              <td className="border-b border-linea-suave px-3 py-2">
                <p className="truncate font-medium" title={t.nombre}>{t.nombre}</p>
                <p className="truncate text-[11px] text-gris" title={t.cargo}>{t.turnoTexto.split(" (")[0]} · {t.otEnCurso ? `en ${t.otEnCurso}` : t.enTurno ? "en turno" : "fuera de turno"}</p>
                <div className="mt-1 h-1 rounded bg-papel-2"><div className="h-full rounded" style={{ width: `${carga * 100}%`, background: carga > 0.9 ? "var(--s-rojo)" : carga > 0.7 ? "var(--s-ambar)" : "var(--s-verde)" }} /></div>
                <p className="mt-0.5 text-[10.5px] text-gris">{t.horasSemana} h programadas en 7 días{!t.habilitaciones.some((h) => h.nombre.includes("LOTO") && h.vigente) && <span className="ml-1 text-rojo">· sin LOTO vigente</span>}</p>
              </td>
              {dias.map((d) => {
                const del = items.filter((a) => mismoDia(new Date(a.inicio), d) && a.personas.some((p) => p.id === t.id));
                return (
                  <td key={d.toISOString()} className="border-b border-l border-linea-suave p-1"
                    onDragOver={(e) => editable && e.preventDefault()} onDrop={(e) => { e.preventDefault(); const id = Number(e.dataTransfer.getData("text/sima-ot")); if (id) { const ini = new Date(d); ini.setHours(t.turno === "B" ? 15 : t.turno === "N" ? 23 : 9, 0, 0, 0); alSoltarOt(id, ini, t.id); } }}>
                    {del.map((a) => { const c = colorDe(a, ots); const ot = a.ordenId ? ots.get(a.ordenId) : undefined; return (
                      <button key={a.id} onClick={() => alAbrir(a)} className="mb-0.5 block w-full cursor-pointer truncate rounded-sm border-l-2 px-1 py-0.5 text-left text-[10.5px]" style={{ background: c.fondo, borderLeftColor: c.borde }} title={a.titulo}>{hm(new Date(a.inicio))} {a.detalle ? (ot?.codigo ?? a.titulo) : "Ocupado"}</button>
                    ); })}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ------------------------------------------------------------------------------------------------ detalle de una actividad
function DetalleActividad({ item, ots, onCerrar, alEditar, puedeAsignar }: { item: ItemCal | null; ots: Map<number, Ot>; onCerrar: () => void; alEditar: (ot: Ot) => void; puedeAsignar: boolean }) {
  const ot = item?.ordenId ? ots.get(item.ordenId) : undefined;
  return (
    <Cajon abierto={!!item} onCerrar={onCerrar} titulo={item?.detalle ? item.titulo : "Ocupado"} ancho={460}>
      {item && (
        <div className="grid gap-3 text-[13px]">
          <p className="flex items-center gap-2 text-gris"><Clock className="size-4" />{new Date(item.inicio).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })} · {hm(new Date(item.inicio))}–{hm(new Date(item.fin))}</p>
          {!item.detalle ? <p className="rounded-md border border-linea-suave bg-papel-2 p-3 text-carbon"><Lock className="mr-1.5 inline size-3.5" />La persona tiene una actividad de otra área en este horario. El detalle no se muestra porque no corresponde a su cargo.</p> : (
            <>
              {item.descripcion && <div><p className="t-etiqueta mb-1">Instrucciones</p><p className="whitespace-pre-wrap rounded-md bg-papel-2 p-3">{item.descripcion}</p></div>}
              <div><p className="t-etiqueta mb-1">Participantes</p><ul className="grid gap-1">{item.personas.map((p) => <li key={p.id} className="flex items-center gap-2"><UserRound className="size-3.5 text-gris" />{p.nombre}<span className="text-[11.5px] text-gris">{p.rol}</span></li>)}</ul></div>
              <p className="text-gris">Estado: <span className="text-negro">{item.estado === "en_curso" ? "en ejecución" : item.estado}</span>{item.ubicacion ? ` · ${item.ubicacion}` : ""}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {item.ordenId && <Boton variante="secundario" onClick={() => { onCerrar(); ir(`/mantenimiento?orden=${item.ordenId}`); }}>Abrir la orden</Boton>}
                {puedeAsignar && ot && ot.estado !== "cerrada" && ot.estado !== "por_verificar" && <Boton variante="acento" onClick={() => alEditar(ot)}>Editar asignación</Boton>}
              </div>
            </>
          )}
        </div>
      )}
    </Cajon>
  );
}

function ListaConflictos({ r, alElegir }: { r: RespuestaConflicto; alElegir?: (s: string) => void }) {
  return (
    <div className="grid gap-3 text-[13px]">
      <p className={r.requiereConfirmacion ? "text-ambar-hondo" : "text-rojo"}>{r.error}</p>
      <ul className="grid gap-1.5">
        {r.conflictos.map((c, i) => <li key={i} className={cx("flex gap-2 rounded-md border px-3 py-2", c.bloquea ? "border-rojo/40 bg-rojo-claro" : "border-ambar/40 bg-ambar-claro")}>{c.bloquea ? <ShieldAlert className="mt-0.5 size-4 shrink-0 text-rojo" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-ambar" />}<span><b className="font-medium">{c.persona || "Horario"}</b>: {c.detalle}</span></li>)}
      </ul>
      {r.sugerencias.length > 0 && alElegir && (
        <div><p className="t-etiqueta mb-1.5">Horarios disponibles sugeridos</p><div className="flex flex-wrap gap-1.5">{r.sugerencias.map((s) => <Boton key={s} tam="s" variante="secundario" onClick={() => alElegir(s)}>{new Date(s).toLocaleDateString("es-CL", { weekday: "short", day: "numeric" })} {hm(new Date(s))}</Boton>)}</div></div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ asignación
const DURACIONES = [30, 60, 90, 120, 180, 240, 360, 480];
export function DialogoAsignar({ ot, inicio, responsable, tecnicos, onCerrar }: { ot: Ot; inicio?: Date; responsable?: string; tecnicos: Tecnico[]; onCerrar: () => void }) {
  const aviso = useAviso(); const qc = useQueryClient();
  const det = useQuery({ queryKey: ["orden", ot.id], queryFn: () => api.get<{ version: number; especialidad: string; prioridad: string; planificacion?: { inicio?: string | null; fin?: string | null; instrucciones: string; fechaLimite?: string | null; resultadosEsperados: string; pruebasRequeridas: string; colaboradores?: { id: string }[]; herramientas: { id: number }[]; repuestos: { id: number }[]; procedimientos: { id: number }[] } }>(`/api/ordenes/${ot.id}`) });
  const ficha = useQuery({ queryKey: ["equipo", ot.equipo], queryFn: () => api.get<FichaEquipo>(`/api/equipos/${ot.equipo}`) });
  const herr = useHerramientas();
  const base = inicio ?? (() => { const d = new Date(); d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0); return d; })();
  const [f, setF] = useState({ responsable: responsable ?? ot.asignadoAId ?? "", colaboradores: [] as string[], fecha: fechaInput(base), hora: horaInput(base), duracion: 90, limite: "", prioridad: ot.prioridad, especialidad: ot.especialidad, instrucciones: "", resultados: "", pruebas: "", herramientas: [] as number[], repuestos: [] as number[], procedimientos: [] as number[] });
  const [cargado, setCargado] = useState(false);
  const [conf, setConf] = useState<RespuestaConflicto | null>(null);
  useEffect(() => {
    const p = det.data?.planificacion; if (!det.data || cargado) return; setCargado(true);
    if (!p) return;
    const ini = p.inicio && !inicio ? new Date(p.inicio) : base;
    setF((x) => ({ ...x, fecha: fechaInput(ini), hora: horaInput(ini), duracion: p.inicio && p.fin ? Math.round((new Date(p.fin).getTime() - new Date(p.inicio).getTime()) / 60000) : x.duracion,
      instrucciones: p.instrucciones, resultados: p.resultadosEsperados, pruebas: p.pruebasRequeridas, limite: p.fechaLimite ?? "", colaboradores: p.colaboradores?.map((c) => c.id) ?? [],
      herramientas: p.herramientas.map((h) => h.id), repuestos: p.repuestos.map((r) => r.id), procedimientos: p.procedimientos.map((d) => d.id) }));
  }, [det.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const inicioSel = new Date(`${f.fecha}T${f.hora}`);
  const personas = [f.responsable, ...f.colaboradores].filter(Boolean);
  const verificar = useQuery({
    queryKey: ["verificar", personas.join(","), inicioSel.toISOString(), f.duracion, f.especialidad, ot.id],
    queryFn: () => api.post<{ conflictos: Conflicto[]; sugerencias: string[]; disponible: boolean }>("/api/calendario/verificar", { personas, inicio: inicioSel.toISOString(), fin: new Date(inicioSel.getTime() + f.duracion * 60_000).toISOString(), habilitaciones: ["Bloqueo y etiquetado (LOTO)", ...(f.especialidad === "electrica" ? ["Trabajo eléctrico autorizado"] : [])] }),
    enabled: personas.length > 0 && !Number.isNaN(inicioSel.getTime()),
  });
  const guardar = useMutation({
    mutationFn: (confirmar: boolean) => api.post(`/api/ordenes/${ot.id}/asignar`, {
      version: det.data!.version, responsableId: f.responsable, colaboradores: f.colaboradores, inicio: inicioSel.toISOString(), duracionMin: f.duracion, fechaLimite: f.limite || null, prioridad: f.prioridad, especialidad: f.especialidad,
      instrucciones: f.instrucciones, herramientas: f.herramientas, repuestos: f.repuestos, procedimientos: f.procedimientos, resultados: f.resultados, pruebas: f.pruebas, confirmar,
    }),
    onSuccess: () => { aviso(`${ot.codigo} asignada: el técnico la recibe ahora con sus instrucciones.`, "ok"); for (const k of ["calendario", "ordenes", "orden"]) void qc.invalidateQueries({ queryKey: [k] }); onCerrar(); },
    onError: (e) => { const d = (e as { datos?: RespuestaConflicto }).datos; if (d?.conflictos) setConf(d); else aviso(mensajeDe(e), "error"); },
  });
  const orden = [...tecnicos].sort((a, b) => Number(!(ESPECIALIDAD_CARGO[b.cargoId]?.includes(f.especialidad) ?? true)) - Number(!(ESPECIALIDAD_CARGO[a.cargoId]?.includes(f.especialidad) ?? true)));
  const tec = tecnicos.find((t) => t.id === f.responsable);
  const alternar = <K extends "colaboradores" | "herramientas" | "repuestos" | "procedimientos">(k: K, v: (typeof f)[K][number]) => setF((x) => ({ ...x, [k]: (x[k] as unknown[]).includes(v) ? (x[k] as unknown[]).filter((y) => y !== v) : [...(x[k] as unknown[]), v] }));
  return (
    <Cajon abierto onCerrar={onCerrar} titulo={`Asignar ${ot.codigo} · ${ot.equipo}`} ancho={620}>
      {det.isError ? <EstadoVista tipo="error" texto={`No se pudo cargar la orden: ${mensajeDe(det.error)}`} /> : !det.data ? <Esqueleto className="h-80" /> : (
        <div className="grid gap-4">
          <p className="text-[13px] text-carbon">{ot.titulo}</p>
          <section className="grid gap-3">
            <Campo etiqueta="Técnico responsable" obligatorio>
              <Seleccion value={f.responsable} onChange={(e) => setF({ ...f, responsable: e.target.value, colaboradores: f.colaboradores.filter((c) => c !== e.target.value) })}>
                <option value="">Elija al técnico…</option>
                {orden.map((t) => { const loto = t.habilitaciones.some((h) => h.nombre.includes("LOTO") && h.vigente); return <option key={t.id} value={t.id}>{t.nombre} · {t.cargo.split(" ")[0]} · {t.turno}{t.otEnCurso ? ` · en ${t.otEnCurso}` : ""}{loto ? "" : " · SIN LOTO"} · {t.horasSemana} h</option>; })}
              </Seleccion>
            </Campo>
            {tec && <p className="-mt-1.5 flex flex-wrap gap-x-3 text-[11.5px] text-gris"><span>{tec.turnoTexto}</span>{tec.habilitaciones.map((h) => <span key={h.nombre} className={h.vigente ? "" : "text-rojo"}>{h.vigente ? <BadgeCheck className="mr-0.5 inline size-3 text-verde" /> : <ShieldAlert className="mr-0.5 inline size-3" />}{h.nombre}</span>)}</p>}
            <div className="grid gap-3 sm:grid-cols-4">
              <Campo etiqueta="Fecha" obligatorio><Entrada type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></Campo>
              <Campo etiqueta="Hora de inicio" obligatorio><Entrada type="time" step={900} value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} /></Campo>
              <Campo etiqueta="Duración"><Seleccion value={f.duracion} onChange={(e) => setF({ ...f, duracion: Number(e.target.value) })}>{[...new Set([...DURACIONES, f.duracion])].sort((a, b) => a - b).map((d) => <option key={d} value={d}>{d < 60 ? `${d} min` : `${d / 60} h`}</option>)}</Seleccion></Campo>
              <Campo etiqueta="Fecha límite"><Entrada type="date" value={f.limite} onChange={(e) => setF({ ...f, limite: e.target.value })} /></Campo>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Prioridad"><Seleccion value={f.prioridad} onChange={(e) => setF({ ...f, prioridad: e.target.value })}>{["critica", "alta", "media", "baja"].map((p) => <option key={p} value={p}>{p}</option>)}</Seleccion></Campo>
              <Campo etiqueta="Especialidad requerida"><Seleccion value={f.especialidad} onChange={(e) => setF({ ...f, especialidad: e.target.value })}>{Object.entries(ESP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Seleccion></Campo>
            </div>
            <div>
              <p className="mb-1.5 text-[12.5px] font-medium text-carbon">Técnicos colaboradores</p>
              <div className="flex flex-wrap gap-1.5">{orden.filter((t) => t.id !== f.responsable).slice(0, 14).map((t) => <button key={t.id} aria-pressed={f.colaboradores.includes(t.id)} onClick={() => alternar("colaboradores", t.id)} className={cx("cursor-pointer rounded border px-2 py-1 text-[12px] transition-colors duration-150", f.colaboradores.includes(t.id) ? "border-acento/60 bg-acento-claro text-negro" : "border-linea-suave text-gris hover:border-linea")}>{t.nombre}</button>)}</div>
            </div>
          </section>
          {/* disponibilidad en vivo */}
          <section aria-live="polite" className={cx("rounded-md border px-3 py-2.5 text-[12.5px]", !personas.length ? "border-linea-suave text-gris" : verificar.data?.disponible ? "border-verde/40 bg-verde-claro text-verde" : verificar.data ? "border-ambar/40 bg-ambar-claro" : "border-linea-suave text-gris")}>
            {!personas.length ? "Elija al técnico para revisar su disponibilidad." : verificar.isFetching && !verificar.data ? "Revisando disponibilidad…" : verificar.data?.disponible ? <span className="flex items-center gap-1.5"><BadgeCheck className="size-4" />Disponible: sin solapes, dentro del turno y con las habilitaciones vigentes.</span>
              : verificar.data ? <ListaConflictos r={{ error: "Revise antes de confirmar:", requiereConfirmacion: !verificar.data.conflictos.some((c) => c.bloquea), conflictos: verificar.data.conflictos, sugerencias: verificar.data.sugerencias }} alElegir={(s) => { const d = new Date(s); setF({ ...f, fecha: fechaInput(d), hora: horaInput(d) }); }} /> : null}
          </section>
          <section className="grid gap-3">
            <Campo etiqueta="Instrucciones para el técnico"><AreaTexto value={f.instrucciones} onChange={(e) => setF({ ...f, instrucciones: e.target.value })} placeholder="Qué hacer, precauciones, a quién avisar al terminar…" className="min-h-20" /></Campo>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Resultados esperados"><AreaTexto value={f.resultados} onChange={(e) => setF({ ...f, resultados: e.target.value })} className="min-h-14" /></Campo>
              <Campo etiqueta="Pruebas requeridas"><AreaTexto value={f.pruebas} onChange={(e) => setF({ ...f, pruebas: e.target.value })} className="min-h-14" /></Campo>
            </div>
            <Chips titulo="Herramientas necesarias" items={(herr.data ?? []).filter((h) => h.estado === "disponible" || f.herramientas.includes(h.id)).slice(0, 24).map((h) => ({ id: h.id, texto: h.nombre }))} sel={f.herramientas} alternar={(id) => alternar("herramientas", id)} />
            <Chips titulo="Repuestos sugeridos (compatibles con el equipo)" items={(ficha.data?.repuestos ?? []).map((r) => ({ id: r.id, texto: `${r.nombre} (${r.stock})` }))} sel={f.repuestos} alternar={(id) => alternar("repuestos", id)} vacio="El equipo no tiene repuestos compatibles registrados." />
            <Chips titulo="Procedimientos y documentos" items={(ficha.data?.documentos ?? []).map((d) => ({ id: d.id, texto: d.titulo }))} sel={f.procedimientos} alternar={(id) => alternar("procedimientos", id)} vacio="El equipo no tiene documentos cargados." />
          </section>
          <div className="sticky bottom-0 -mx-5 flex justify-end gap-2 border-t border-linea-suave bg-papel px-5 py-3">
            <Boton variante="contorno" onClick={onCerrar}>Cancelar</Boton>
            <Boton variante="acento" disabled={!f.responsable} cargando={guardar.isPending} onClick={() => guardar.mutate(false)}>Asignar y notificar</Boton>
          </div>
        </div>
      )}
      <Dialogo abierto={!!conf} onCerrar={() => setConf(null)} titulo="Revise la disponibilidad" ancho={520}
        pie={<><Boton variante="contorno" onClick={() => setConf(null)}>Volver</Boton>{conf?.requiereConfirmacion && <Boton variante="acento" cargando={guardar.isPending} onClick={() => { setConf(null); guardar.mutate(true); }}>Confirmar con conflictos</Boton>}</>}>
        {conf && <ListaConflictos r={conf} alElegir={(s) => { const d = new Date(s); setF({ ...f, fecha: fechaInput(d), hora: horaInput(d) }); setConf(null); }} />}
      </Dialogo>
    </Cajon>
  );
}

function Chips({ titulo, items, sel, alternar, vacio }: { titulo: string; items: { id: number; texto: string }[]; sel: number[]; alternar: (id: number) => void; vacio?: string }) {
  return (
    <div>
      <p className="mb-1.5 text-[12.5px] font-medium text-carbon">{titulo}</p>
      {items.length === 0 ? <p className="text-[12px] text-gris">{vacio}</p> : <div className="flex flex-wrap gap-1.5">{items.map((i) => <button key={i.id} aria-pressed={sel.includes(i.id)} onClick={() => alternar(i.id)} className={cx("cursor-pointer rounded border px-2 py-1 text-[12px] transition-colors duration-150", sel.includes(i.id) ? "border-acento/60 bg-acento-claro text-negro" : "border-linea-suave text-gris hover:border-linea")}>{i.texto}</button>)}</div>}
    </div>
  );
}

