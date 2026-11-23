import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle, Bell, CheckCheck, ChevronDown, ChevronRight, CircleAlert, ClipboardList, Cpu, CornerDownLeft, Factory, HardHat, Inbox, Info, LogOut, Moon, PanelLeftClose, PanelLeftOpen,
  PlugZap, RefreshCw, Search, Server, ShieldCheck, Sun, TriangleAlert, UserCheck, WifiOff, Wrench, X, XOctagon, type LucideIcon,
} from "lucide-react";
import type { NotificacionSima } from "@sima/cliente";
import { Avatar, Boton, Insignia, TIEMPO, CURVA, cx, defEstado } from "@sima/ui";
import { api, baseUrl } from "./lib/api";
import { useAuth } from "./lib/auth";
import { usePlanta } from "./lib/planta";
import { usePendientes, vaciar } from "./lib/offline";
import { ir } from "./ruta";
import { SECCIONES, experienciaDe, seccionesDe, tiene, type Seccion } from "./roles";

export const VERSION = "4.2.0";

// ------------------------------------------------------------------------------------------------ marca
export function Logo({ tam = 28 }: { tam?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-md bg-acento font-display font-semibold text-sobre-negro" style={{ width: tam, height: tam, fontSize: tam * 0.56 }} aria-hidden>
      <svg viewBox="0 0 24 24" width={tam * 0.62} height={tam * 0.62}><path d="M4 7h11a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h11" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
    </span>
  );
}

// ------------------------------------------------------------------------------------------------ turnos
/** Horario de cada turno (supuesto documentado en docs/DISENO.md: la planta trabaja A, B y N rotativos, y D diurno). */
export const TURNOS: Record<string, string> = { A: "Turno A · 06:00–14:00", B: "Turno B · 14:00–22:00", N: "Turno N · 22:00–06:00", D: "Diurno · 08:00–17:30" };

// ------------------------------------------------------------------------------------------------ notificaciones
export const CATEGORIAS: Record<string, { t: string; i: LucideIcon; c: string }> = {
  critica: { t: "Críticas", i: XOctagon, c: "var(--s-rojo)" }, advertencia: { t: "Advertencias", i: AlertTriangle, c: "var(--s-ambar)" },
  tarea: { t: "Tareas", i: ClipboardList, c: "var(--s-acento)" }, solicitud: { t: "Solicitudes", i: Inbox, c: "var(--s-info)" },
  aprobacion: { t: "Aprobaciones", i: UserCheck, c: "var(--s-diagnostico)" }, info: { t: "Información", i: Info, c: "var(--s-tenue)" },
};
export const ORIGENES: Record<string, string> = { mantenimiento: "Mantenimiento", produccion: "Producción", calidad: "Calidad", seguridad: "Seguridad", automatizacion: "Automatización", personas: "Personas", sistema: "SIMA" };
export const hace = (iso: string | number) => { const m = Math.round((Date.now() - +new Date(iso)) / 60000); return m < 1 ? "recién" : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`; };

export function useNotificaciones() {
  return useQuery({ queryKey: ["notificaciones"], queryFn: () => api.get<{ noLeidas: number; items: NotificacionSima[] }>("/api/notificaciones"), refetchInterval: 60_000 });
}

function CentroNotificaciones({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const qc = useQueryClient();
  const { data } = useNotificaciones();
  const { alertas } = usePlanta();
  const [vista, setVista] = useState<"mias" | "planta">("mias");
  const [cat, setCat] = useState<string>("todas");
  const leer = useMutation({ mutationFn: (id: number) => api.post(`/api/notificaciones/${id}/leida`), onSuccess: () => qc.invalidateQueries({ queryKey: ["notificaciones"] }) });
  const todas = useMutation({ mutationFn: () => api.post("/api/notificaciones/leidas"), onSuccess: () => qc.invalidateQueries({ queryKey: ["notificaciones"] }) });
  const items = (data?.items ?? []).filter((n) => cat === "todas" || n.categoria === cat);
  useEffect(() => { if (!abierto) return; const f = (e: KeyboardEvent) => e.key === "Escape" && onCerrar(); window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, [abierto, onCerrar]);
  return (
    <AnimatePresence>
      {abierto && (
        <div className="fixed inset-0 z-40">
          <motion.div className="absolute inset-0 bg-[#05080c]/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: TIEMPO.componente }} onClick={onCerrar} />
          <motion.aside role="dialog" aria-label="Centro de notificaciones" initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 24, opacity: 0 }} transition={{ duration: TIEMPO.componente, ease: CURVA }}
            className="absolute bottom-6 right-0 top-12 flex w-[420px] max-w-full flex-col border-l border-linea bg-fondo-2 shadow-[var(--s-sombra-flotante)]">
            <div className="flex items-center gap-2 border-b border-linea-suave px-4 py-2.5">
              <p className="t-seccion flex-1">Notificaciones</p>
              {vista === "mias" && (data?.noLeidas ?? 0) > 0 && <Boton tam="s" variante="texto" onClick={() => todas.mutate()}><CheckCheck className="size-3.5" />Marcar todo como leído</Boton>}
              <Boton tam="s" variante="texto" icono aria-label="Cerrar" onClick={onCerrar}><X className="size-4" /></Boton>
            </div>
            <div className="flex gap-1 border-b border-linea-suave px-3 pt-1.5">
              {([["mias", "Para mí", data?.noLeidas ?? 0], ["planta", "Planta en vivo", alertas.length]] as const).map(([k, t, n]) => (
                <button key={k} onClick={() => setVista(k)} className={cx("relative cursor-pointer px-2.5 pb-2 pt-1 text-[12.5px] font-semibold", vista === k ? "text-negro" : "text-gris hover:text-negro")}>
                  {t} <span className="num text-gris">{n}</span>
                  {vista === k && <motion.span layoutId="notif-tab" className="absolute inset-x-1 -bottom-px h-0.5 bg-acento" />}
                </button>
              ))}
            </div>
            {vista === "mias" && (
              <div className="flex flex-wrap gap-1 border-b border-linea-suave px-3 py-2">
                {["todas", ...Object.keys(CATEGORIAS)].map((k) => (
                  <button key={k} onClick={() => setCat(k)} className={cx("h-6 cursor-pointer rounded px-2 text-[11.5px] font-semibold", cat === k ? "bg-acento-claro text-acento" : "text-gris hover:bg-papel-2 hover:text-negro")}>
                    {k === "todas" ? "Todas" : CATEGORIAS[k].t}
                  </button>
                ))}
              </div>
            )}
            <ul className="min-h-0 flex-1 overflow-y-auto">
              {vista === "mias" && items.length === 0 && <li className="px-6 py-12 text-center text-[13px] text-gris">No hay notificaciones {cat !== "todas" ? "de esta categoría" : "para usted"}.</li>}
              {vista === "mias" && items.map((n) => {
                const d = CATEGORIAS[n.categoria] ?? CATEGORIAS.info;
                return (
                  <li key={n.id}>
                    <button onClick={() => { if (!n.leida) leer.mutate(n.id); if (n.destino) { ir(n.destino); onCerrar(); } }}
                      className={cx("flex w-full cursor-pointer gap-3 border-b border-linea-suave px-4 py-3 text-left transition-colors duration-[140ms] hover:bg-papel", !n.leida && "bg-papel/60")}>
                      <d.i className="mt-0.5 size-4 shrink-0" style={{ color: d.c }} />
                      <span className="min-w-0 flex-1">
                        <span className={cx("block text-[13px] leading-snug", !n.leida ? "font-medium text-negro" : "text-carbon")}>{n.texto}</span>
                        <span className="mt-1 block text-[11.5px] text-gris">{ORIGENES[n.origen] ?? n.origen}{n.referencia && <> · <span className="t-dato">{n.referencia}</span></>} · {hace(n.fecha)}</span>
                      </span>
                      {!n.leida && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-acento" aria-label="No leída" />}
                    </button>
                  </li>
                );
              })}
              {vista === "planta" && alertas.length === 0 && <li className="px-6 py-12 text-center text-[13px] text-gris">Sin alertas de planta en esta sesión.</li>}
              {vista === "planta" && alertas.map((a) => (
                <li key={a.id}>
                  <button onClick={() => { if (a.destino) { ir(a.destino); onCerrar(); } }} className="flex w-full cursor-pointer gap-3 border-b border-linea-suave px-4 py-3 text-left hover:bg-papel">
                    {a.nivel === "alarma" ? <XOctagon className="mt-0.5 size-4 shrink-0 text-rojo" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-ambar" />}
                    <span className="min-w-0 flex-1"><span className="block text-[13px]">{a.texto}</span><span className="text-[11.5px] text-gris">Planta · {new Date(a.ts).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

// ------------------------------------------------------------------------------------------------ buscador global (Ctrl K)
interface Resultado { id: string; grupo: string; titulo: string; detalle?: string; icono: LucideIcon; ir: () => void }
function Buscador({ abierto, onCerrar, rutas }: { abierto: boolean; onCerrar: () => void; rutas: Record<Seccion, string> }) {
  const { usuario } = useAuth();
  const { equipos } = usePlanta();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const ordenes = useQuery({ queryKey: ["ordenes"], queryFn: () => api.get<{ id: number; codigo: string; titulo: string; equipo: string; estado: string }[]>("/api/ordenes"), enabled: abierto && tiene(usuario, "ordenes.ver") });
  useEffect(() => { if (abierto) { setQ(""); setSel(0); } }, [abierto]);
  const resultados = useMemo<Resultado[]>(() => {
    const t = q.trim().toLowerCase();
    const r: Resultado[] = [];
    const exp = experienciaDe(usuario);
    for (const s of seccionesDe(usuario)) {
      const titulo = s === "inicio" ? exp.inicio : SECCIONES[s].titulo;
      if (!t || titulo.toLowerCase().includes(t)) r.push({ id: `s${s}`, grupo: "Pantallas", titulo, icono: ChevronRight, ir: () => ir(rutas[s]) });
    }
    if (t) {
      for (const e of equipos.filter((e) => `${e.codigo} ${e.nombre} ${e.tipo}`.toLowerCase().includes(t)).slice(0, 6))
        r.push({ id: `e${e.codigo}`, grupo: "Equipos", titulo: `${e.codigo} · ${e.nombre}`, detalle: defEstado(e.estado).etiqueta, icono: Factory, ir: () => ir(`/explorador?equipo=${e.codigo}`) });
      for (const o of (ordenes.data ?? []).filter((o) => `${o.codigo} ${o.titulo} ${o.equipo}`.toLowerCase().includes(t)).slice(0, 6))
        r.push({ id: `o${o.id}`, grupo: "Órdenes de trabajo", titulo: `${o.codigo} · ${o.titulo}`, detalle: o.equipo, icono: Wrench, ir: () => ir(`/mantenimiento?orden=${o.id}`) });
    }
    return r.slice(0, 14);
  }, [q, usuario, equipos, ordenes.data, rutas]);
  useEffect(() => setSel(0), [q]);
  if (!abierto) return null;
  const elegir = (x?: Resultado) => { if (x) { x.ir(); onCerrar(); } };
  return (
    <div className="fixed inset-0 z-50 grid place-items-start justify-center pt-[12vh]">
      <motion.div className="absolute inset-0 bg-[#05080c]/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onCerrar} />
      <motion.div role="dialog" aria-label="Buscar" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: TIEMPO.componente, ease: CURVA }}
        className="relative w-[min(620px,92vw)] overflow-hidden rounded-lg border border-linea bg-papel shadow-[var(--s-sombra-flotante)]">
        <div className="flex items-center gap-2 border-b border-linea-suave px-3">
          <Search className="size-4 text-gris" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pantallas, equipos u órdenes de trabajo"
            onKeyDown={(e) => { if (e.key === "Escape") onCerrar(); if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, resultados.length - 1)); } if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); } if (e.key === "Enter") elegir(resultados[sel]); }}
            className="h-11 flex-1 bg-transparent text-[14px] outline-none placeholder:text-apagado" aria-label="Buscar" />
          <kbd className="rounded border border-linea px-1.5 py-0.5 text-[10.5px] text-gris">Esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-1.5">
          {resultados.length === 0 && <li className="px-3 py-8 text-center text-[13px] text-gris">Sin resultados para «{q}».</li>}
          {resultados.map((x, i) => (
            <li key={x.id}>
              {(i === 0 || resultados[i - 1].grupo !== x.grupo) && <p className="t-etiqueta px-2.5 pb-1 pt-2">{x.grupo}</p>}
              <button onMouseEnter={() => setSel(i)} onClick={() => elegir(x)} className={cx("flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px]", i === sel ? "bg-papel-2 text-negro" : "text-carbon")}>
                <x.icono className="size-4 text-gris" />
                <span className="min-w-0 flex-1 truncate">{x.titulo}</span>
                {x.detalle && <span className="text-[11.5px] text-gris">{x.detalle}</span>}
                {i === sel && <CornerDownLeft className="size-3.5 text-gris" />}
              </button>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ barra lateral
export interface ItemNav { s: Seccion; r: string; t: string; i: LucideIcon; g: string; n?: number; critico?: boolean }
function BarraLateral({ nav, activa, plegada, alPlegar, abrirBuscador }: { nav: ItemNav[]; activa: (r: string) => boolean; plegada: boolean; alPlegar: () => void; abrirBuscador: () => void }) {
  const { usuario } = useAuth();
  const [cerrados, setCerrados] = useState<Set<string>>(new Set());
  const grupos = [...new Set(nav.map((n) => n.g))];
  return (
    <motion.aside animate={{ width: plegada ? 56 : 236 }} transition={{ duration: TIEMPO.componente, ease: CURVA }} className="flex shrink-0 flex-col overflow-hidden border-r border-linea-suave bg-fondo-2" aria-label="Navegación">
      <div className={cx("flex h-12 shrink-0 items-center gap-2.5 border-b border-linea-suave", plegada ? "justify-center px-0" : "px-3.5")}>
        <Logo />
        {!plegada && <div className="min-w-0"><p className="text-[13.5px] font-semibold leading-tight">SIMA Desktop</p><p className="truncate text-[11px] text-gris" title={usuario?.familia}>{usuario?.familia ?? "Manufacturas Andina"}</p></div>}
      </div>
      {!plegada && (
        <button onClick={abrirBuscador} className="mx-3 mt-3 flex h-8 cursor-pointer items-center gap-2 rounded-md border border-linea-suave bg-chapa px-2.5 text-[12.5px] text-gris hover:border-linea">
          <Search className="size-3.5" /><span className="flex-1 text-left">Buscar…</span><kbd className="rounded border border-linea px-1 text-[10px]">Ctrl K</kbd>
        </button>
      )}
      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-2" aria-label="Secciones">
        {grupos.map((g) => (
          <div key={g} className="mb-1">
            {!plegada ? (
              <button onClick={() => setCerrados((s) => { const n = new Set(s); if (n.has(g)) n.delete(g); else n.add(g); return n; })} aria-expanded={!cerrados.has(g)}
                className="flex w-full cursor-pointer items-center gap-1 px-2 pb-1 pt-2.5 text-left">
                <span className="t-etiqueta flex-1">{g}</span><ChevronDown className={cx("size-3 text-gris transition-transform duration-[140ms]", cerrados.has(g) && "-rotate-90")} />
              </button>
            ) : <div className="mx-2 my-2 h-px bg-linea-suave" />}
            <AnimatePresence initial={false}>
              {(!cerrados.has(g) || plegada) && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: TIEMPO.componente, ease: CURVA }} className="overflow-hidden">
                  {nav.filter((n) => n.g === g).map((n) => (
                    <a key={n.r} href={`#${n.r}`} aria-current={activa(n.r) ? "page" : undefined} title={plegada ? n.t : undefined}
                      className={cx("relative flex h-8 items-center gap-2.5 rounded-md text-[13px] font-medium transition-colors duration-[140ms]", plegada ? "justify-center px-0" : "px-2.5", activa(n.r) ? "bg-papel text-negro" : "text-gris hover:bg-papel/60 hover:text-negro")}>
                      {activa(n.r) && <motion.span layoutId="barra-activa" className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-acento" transition={{ duration: TIEMPO.componente, ease: CURVA }} />}
                      <n.i className={cx("size-4 shrink-0", activa(n.r) && "text-acento")} strokeWidth={1.9} />
                      {!plegada && <span className="min-w-0 flex-1 truncate">{n.t}</span>}
                      {!plegada && n.n != null && n.n > 0 && <Insignia n={n.n} tono={n.critico ? "rojo" : "neutro"} />}
                      {plegada && n.n != null && n.n > 0 && <span className={cx("absolute right-2 top-1.5 size-1.5 rounded-full", n.critico ? "bg-rojo" : "bg-acento")} />}
                    </a>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
        {!plegada && (
          <div className="mt-3 border-t border-linea-suave px-1 pt-3">
            <p className="t-etiqueta px-1.5 pb-1.5">Accesos rápidos</p>
            {tiene(usuario, "ordenes.crear") && !nav.some((n) => n.s === "reportar") && <a href="#/reportar" className="flex h-8 items-center gap-2 rounded-md px-2 text-[12.5px] font-medium text-carbon hover:bg-papel/60"><TriangleAlert className="size-3.5 text-ambar" />Reportar falla</a>}
            <a href="#/seguridad" className="flex h-8 items-center gap-2 rounded-md px-2 text-[12.5px] font-medium text-carbon hover:bg-papel/60"><HardHat className="size-3.5 text-ambar" />Condición insegura</a>
          </div>
        )}
      </nav>
      <button onClick={alPlegar} aria-label={plegada ? "Expandir navegación" : "Contraer navegación"} title={plegada ? "Expandir" : "Contraer"}
        className={cx("flex h-9 shrink-0 cursor-pointer items-center gap-2 border-t border-linea-suave text-[12px] text-gris hover:text-negro", plegada ? "justify-center" : "px-4")}>
        {plegada ? <PanelLeftOpen className="size-4" /> : <><PanelLeftClose className="size-4" />Contraer</>}
      </button>
    </motion.aside>
  );
}

// ------------------------------------------------------------------------------------------------ barra superior
function Reloj() {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setAhora(new Date()), 15_000); return () => clearInterval(t); }, []);
  return <time dateTime={ahora.toISOString()} className="num hidden text-[12px] text-gris lg:inline" title={ahora.toLocaleString("es-CL")}>{ahora.toLocaleDateString("es-CL", { day: "numeric", month: "short" })} · {ahora.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false })}</time>;
}

function MenuPerfil() {
  const { usuario, salir } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [claro, setClaro] = useState(() => document.documentElement.dataset.tema === "claro");
  useEffect(() => { const f = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false); }; document.addEventListener("mousedown", f); return () => document.removeEventListener("mousedown", f); }, []);
  const alternarTema = () => { const n = !claro; setClaro(n); if (n) document.documentElement.dataset.tema = "claro"; else delete document.documentElement.dataset.tema; try { localStorage.setItem("sima.tema.desktop", n ? "claro" : "noche"); } catch { /* sin almacenamiento */ } };
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setAbierto(!abierto)} aria-expanded={abierto} aria-label="Perfil" className="flex h-8 cursor-pointer items-center gap-2 rounded-md px-1.5 hover:bg-papel">
        <Avatar nombre={usuario?.nombre ?? "?"} tam={24} />
        <span className="hidden max-w-[140px] truncate text-[12.5px] font-medium 2xl:block">{usuario?.nombre.split(" ").slice(0, 2).join(" ")}</span>
        <ChevronDown className="size-3.5 text-gris" />
      </button>
      <AnimatePresence>
        {abierto && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: TIEMPO.micro }}
            className="absolute right-0 top-10 z-40 w-72 rounded-md border border-linea bg-papel p-1.5 shadow-[var(--s-sombra-flotante)]">
            <div className="flex items-center gap-2.5 border-b border-linea-suave px-2.5 pb-2.5 pt-1.5">
              <Avatar nombre={usuario?.nombre ?? "?"} tam={34} />
              <div className="min-w-0"><p className="truncate text-[13px] font-semibold">{usuario?.nombre}</p><p className="truncate text-[11.5px] text-gris">{usuario?.cargo}</p></div>
            </div>
            <div className="grid gap-1 px-2.5 py-2 text-[12px] text-gris">
              <span>{TURNOS[usuario?.turno ?? ""] ?? `Turno ${usuario?.turno}`}</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5" />Acceso: SIMA Desktop{usuario?.plataformas?.web ? " y SIMA Web" : ""}</span>
            </div>
            <button onClick={alternarTema} className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-2 text-[12.5px] hover:bg-papel-2">{claro ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}{claro ? "Tema oscuro" : "Tema claro"}</button>
            <button onClick={() => { ir("/cargo"); setAbierto(false); }} className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-2 text-[12.5px] hover:bg-papel-2"><UserCheck className="size-3.5" />Mi cargo y habilitaciones</button>
            <button onClick={() => salir()} className="flex w-full cursor-pointer items-center gap-2 rounded px-2.5 py-2 text-[12.5px] text-rojo hover:bg-rojo-claro"><LogOut className="size-3.5" />Cerrar sesión</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BarraSuperior({ migas, abrirBuscador, abrirNotificaciones }: { migas: string[]; abrirBuscador: () => void; abrirNotificaciones: () => void }) {
  const { usuario } = useAuth();
  const { conexion, equipos } = usePlanta();
  const { data } = useNotificaciones();
  const fallas = equipos.filter((e) => defEstado(e.estado).critico).length;
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-linea-suave bg-fondo-2 px-4">
      <nav aria-label="Ruta" className="flex min-w-0 shrink items-center gap-1.5 whitespace-nowrap text-[12.5px]">
        {migas.map((m, i) => (
          <span key={i} className={cx("flex items-center gap-1.5", i === migas.length - 1 ? "min-w-0" : "shrink-0", i === 0 && migas.length > 2 && "hidden 2xl:flex")}>
            {i > 0 && <ChevronRight className={cx("size-3 shrink-0 text-apagado", i === 1 && migas.length > 2 && "hidden 2xl:block")} />}
            <span className={cx(i === migas.length - 1 ? "truncate font-semibold text-negro" : "text-gris")}>{m}</span>
          </span>
        ))}
      </nav>
      <button onClick={abrirBuscador} className="ml-2 hidden h-8 min-w-[160px] max-w-[300px] flex-1 cursor-pointer items-center gap-2 rounded-md border border-linea-suave bg-chapa px-2.5 text-[12.5px] text-gris hover:border-linea md:flex" aria-label="Buscar (Ctrl K)">
        <Search className="size-3.5 shrink-0" /><span className="flex-1 truncate text-left">Buscar pantallas, equipos u órdenes</span><kbd className="rounded border border-linea px-1 text-[10px]">Ctrl K</kbd>
      </button>
      <div className="ml-auto flex shrink-0 items-center gap-2 whitespace-nowrap">
        {fallas > 0 && (
          <button onClick={() => ir("/alertas")} className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md bg-rojo-claro px-2 text-[12px] font-semibold text-rojo" title="Equipos en falla o bloqueados por seguridad">
            <CircleAlert className="size-3.5" />{fallas} {fallas === 1 ? "equipo en falla" : "equipos en falla"}
          </button>
        )}
        <span className={cx("flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium", conexion === "conectado" ? "text-verde" : conexion === "reconectando" ? "bg-ambar-claro text-ambar" : "bg-rojo-claro text-rojo")} title={conexion === "conectado" ? "En línea con el servidor SIMA" : "Conexión en vivo con el servidor SIMA"}>
          {conexion === "conectado" ? <PlugZap className="size-3.5" /> : <WifiOff className="size-3.5" />}<span className={cx(conexion === "conectado" && "hidden 2xl:inline")}>{conexion === "conectado" ? "En línea" : conexion === "reconectando" ? "Reconectando" : "Sin conexión"}</span>
        </span>
        <span className="hidden rounded-md border border-linea-suave px-2 py-1 text-[12px] font-medium text-carbon lg:inline" title={TURNOS[usuario?.turno ?? ""]}>{(TURNOS[usuario?.turno ?? ""] ?? `Turno ${usuario?.turno}`).split(" · ")[0]}</span>
        <Reloj />
        <button onClick={abrirNotificaciones} aria-label={`Notificaciones${data?.noLeidas ? `, ${data.noLeidas} sin leer` : ""}`} className="relative grid size-8 cursor-pointer place-items-center rounded-md text-gris hover:bg-papel hover:text-negro">
          <Bell className="size-4" />
          {(data?.noLeidas ?? 0) > 0 && <Insignia n={data!.noLeidas} className="absolute -right-1 -top-1" />}
        </button>
        <MenuPerfil />
      </div>
    </header>
  );
}

// ------------------------------------------------------------------------------------------------ barra de estado
function BarraEstado() {
  const { conexion, ultimoDato, plcEstado, equipos } = usePlanta();
  const pendientes = usePendientes();
  const salud = useQuery({ queryKey: ["salud-barra"], queryFn: async () => { const r = await fetch(`${baseUrl()}/salud`); if (!r.ok) throw new Error(); return r.json(); }, refetchInterval: 30_000, retry: 0 });
  const [, forzar] = useState(0);
  useEffect(() => { const t = setInterval(() => forzar((n) => n + 1), 10_000); return () => clearInterval(t); }, []);
  const plcs = Object.values(plcEstado);
  const enMarcha = plcs.filter((e) => e === "run").length;
  const simulada = equipos.length > 0 && equipos.every((e) => (e as { simulado?: boolean }).simulado !== false);
  const seg = ultimoDato ? Math.round((Date.now() - ultimoDato) / 1000) : null;
  return (
    <footer className="flex h-6 shrink-0 items-center gap-4 border-t border-linea-suave bg-fondo-2 px-3 text-[11px] text-gris" aria-label="Estado del sistema">
      <span className="flex items-center gap-1.5"><Server className={cx("size-3", salud.isError ? "text-rojo" : "text-verde")} />Servidor {salud.isError ? "sin respuesta" : "en línea"}</span>
      <button onClick={() => void vaciar()} className={cx("flex cursor-pointer items-center gap-1.5", pendientes > 0 && "text-ambar")} title="Envíos guardados en este equipo">
        <RefreshCw className="size-3" />{pendientes > 0 ? `${pendientes} por sincronizar` : "Sincronizado"}
      </button>
      {seg != null && <span className={cx(seg > 60 && conexion === "conectado" && "text-ambar")}>Último dato {seg < 5 ? "recién" : `hace ${seg < 60 ? `${seg} s` : `${Math.round(seg / 60)} min`}`}</span>}
      {plcs.length > 0 && <span className="flex items-center gap-1.5"><Cpu className="size-3" />{enMarcha}/{plcs.length} PLC en marcha{simulada && <span className="trama-sim rounded px-1 text-info">planta simulada</span>}</span>}
      <span className="ml-auto">SIMA Desktop {VERSION}</span>
    </footer>
  );
}

// ------------------------------------------------------------------------------------------------ estación (marco completo)
export function Estacion({ nav, activa, migas, rutas, children }: { nav: ItemNav[]; activa: (r: string) => boolean; migas: string[]; rutas: Record<Seccion, string>; children: ReactNode }) {
  const { critica, descartarCritica } = usePlanta();
  const [plegada, setPlegada] = useState(() => { try { return localStorage.getItem("sima.lateral") === "plegada"; } catch { return false; } });
  const [buscar, setBuscar] = useState(false);
  const [notif, setNotif] = useState(false);
  useEffect(() => { try { localStorage.setItem("sima.lateral", plegada ? "plegada" : "abierta"); } catch { /* sin almacenamiento */ } }, [plegada]);
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setBuscar((b) => !b); } };
    window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f);
  }, []);
  return (
    <div className="flex h-dvh flex-col">
      <div className="flex min-h-0 flex-1">
        <BarraLateral nav={nav} activa={activa} plegada={plegada} alPlegar={() => setPlegada(!plegada)} abrirBuscador={() => setBuscar(true)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <BarraSuperior migas={migas} abrirBuscador={() => setBuscar(true)} abrirNotificaciones={() => setNotif(true)} />
          {critica && (
            // las alertas críticas se muestran de inmediato, sin animación de entrada
            <div role="alert" className="flex shrink-0 items-center gap-3 border-b border-rojo/40 bg-rojo-claro px-4 py-2 text-[13px] text-rojo">
              <XOctagon className="size-4 shrink-0" /><span className="min-w-0 flex-1 truncate font-semibold">{critica.texto}</span>
              {critica.destino && <Boton tam="s" variante="contorno" onClick={() => { ir(critica.destino!); descartarCritica(); }}>Ver</Boton>}
              <button aria-label="Descartar alerta" onClick={descartarCritica} className="cursor-pointer"><X className="size-4" /></button>
            </div>
          )}
          <main className="min-h-0 flex-1 overflow-y-auto bg-chapa">{children}</main>
        </div>
      </div>
      <BarraEstado />
      <Buscador abierto={buscar} onCerrar={() => setBuscar(false)} rutas={rutas} />
      <CentroNotificaciones abierto={notif} onCerrar={() => setNotif(false)} />
    </div>
  );
}
