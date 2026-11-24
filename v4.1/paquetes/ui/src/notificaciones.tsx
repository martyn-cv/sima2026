import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, CheckCheck, ClipboardList, Inbox, Info, UserCheck, X, XOctagon, type LucideIcon } from "lucide-react";
import type { NotificacionSima } from "@sima/cliente";
import { Boton, CURVA, TIEMPO, cx } from "./ui";

/** Categorías del centro de notificaciones (las mismas que guarda el servidor). */
export const CATEGORIAS_NOTIFICACION: Record<string, { t: string; i: LucideIcon; c: string }> = {
  critica: { t: "Críticas", i: XOctagon, c: "var(--s-rojo)" }, advertencia: { t: "Advertencias", i: AlertTriangle, c: "var(--s-ambar)" },
  tarea: { t: "Tareas", i: ClipboardList, c: "var(--s-acento)" }, solicitud: { t: "Solicitudes", i: Inbox, c: "var(--s-info)" },
  aprobacion: { t: "Aprobaciones", i: UserCheck, c: "var(--s-diagnostico)" }, info: { t: "Información", i: Info, c: "var(--s-tenue)" },
};
export const ORIGENES_NOTIFICACION: Record<string, string> = { mantenimiento: "Mantenimiento", produccion: "Producción", calidad: "Calidad", seguridad: "Seguridad", automatizacion: "Automatización", personas: "Personas", sistema: "SIMA" };
const haceRel = (iso: string | number) => { const m = Math.round((Date.now() - +new Date(iso)) / 60000); return m < 1 ? "recién" : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`; };

/** Evento en vivo de la planta (no se guarda: se muestra mientras dure la sesión). */
export interface EventoEnVivo { id: number | string; texto: string; nivel: "alarma" | "aviso" | "info" | "ok"; ts: number; destino?: string | null }

/**
 * Centro de notificaciones: lo dirigido a la persona (guardado en el servidor, con categoría, origen, fecha y estado de
 * lectura) y la actividad en vivo de la planta. Es solo presentación: cada aplicación entrega los datos y las acciones.
 */
export function PanelNotificaciones({ abierto, onCerrar, items, noLeidas, vivo = [], tituloVivo = "Planta en vivo", alLeer, alLeerTodas, alIr, arriba = 48, abajo = 24 }: {
  abierto: boolean; onCerrar: () => void; items: NotificacionSima[]; noLeidas: number; vivo?: EventoEnVivo[]; tituloVivo?: string;
  alLeer: (id: number) => void; alLeerTodas: () => void; alIr: (destino: string) => void; arriba?: number; abajo?: number;
}) {
  const [vista, setVista] = useState<"mias" | "vivo">("mias");
  const [cat, setCat] = useState<string>("todas");
  const lista = items.filter((n) => cat === "todas" || n.categoria === cat);
  useEffect(() => { if (!abierto) return; const f = (e: KeyboardEvent) => e.key === "Escape" && onCerrar(); window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, [abierto, onCerrar]);
  const ir = (d?: string | null) => { if (d) { alIr(d); onCerrar(); } };
  return (
    <AnimatePresence>
      {abierto && (
        <div className="fixed inset-0 z-40">
          <motion.div className="absolute inset-0 bg-[#05080c]/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: TIEMPO.componente }} onClick={onCerrar} />
          <motion.aside role="dialog" aria-label="Centro de notificaciones" initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 24, opacity: 0 }} transition={{ duration: TIEMPO.componente, ease: CURVA }}
            className="absolute right-0 flex w-[420px] max-w-full flex-col border-l border-linea bg-fondo-2 shadow-[var(--s-sombra-flotante)]" style={{ top: arriba, bottom: abajo }}>
            <div className="flex items-center gap-2 border-b border-linea-suave px-4 py-2.5">
              <p className="t-seccion flex-1">Notificaciones</p>
              {vista === "mias" && noLeidas > 0 && <Boton tam="s" variante="texto" onClick={alLeerTodas}><CheckCheck className="size-3.5" />Marcar todo como leído</Boton>}
              <Boton tam="s" variante="texto" icono aria-label="Cerrar" onClick={onCerrar}><X className="size-4" /></Boton>
            </div>
            <div role="tablist" className="flex gap-1 border-b border-linea-suave px-3 pt-1.5">
              {([["mias", "Para mí", noLeidas], ["vivo", tituloVivo, vivo.length]] as const).map(([k, t, n]) => (
                <button key={k} role="tab" aria-selected={vista === k} onClick={() => setVista(k)} className={cx("relative cursor-pointer px-2.5 pb-2 pt-1 text-[12.5px] font-semibold", vista === k ? "text-negro" : "text-gris hover:text-negro")}>
                  {t} <span className="num text-gris">{n}</span>
                  {vista === k && <motion.span layoutId="notif-tab" className="absolute inset-x-1 -bottom-px h-0.5 bg-acento" />}
                </button>
              ))}
            </div>
            {vista === "mias" && (
              <div className="flex flex-wrap gap-1 border-b border-linea-suave px-3 py-2">
                {["todas", ...Object.keys(CATEGORIAS_NOTIFICACION)].map((k) => (
                  <button key={k} onClick={() => setCat(k)} aria-pressed={cat === k} className={cx("h-6 cursor-pointer rounded px-2 text-[11.5px] font-semibold", cat === k ? "bg-acento-claro text-acento" : "text-gris hover:bg-papel-2 hover:text-negro")}>
                    {k === "todas" ? "Todas" : CATEGORIAS_NOTIFICACION[k].t}
                  </button>
                ))}
              </div>
            )}
            <ul className="min-h-0 flex-1 overflow-y-auto">
              {vista === "mias" && lista.length === 0 && <li className="px-6 py-12 text-center text-[13px] text-gris">No hay notificaciones {cat !== "todas" ? "de esta categoría" : "para usted"}.</li>}
              {vista === "mias" && lista.map((n) => {
                const d = CATEGORIAS_NOTIFICACION[n.categoria] ?? CATEGORIAS_NOTIFICACION.info;
                return (
                  <li key={n.id}>
                    <button onClick={() => { if (!n.leida) alLeer(n.id); ir(n.destino); }}
                      className={cx("flex w-full cursor-pointer gap-3 border-b border-linea-suave px-4 py-3 text-left transition-colors duration-[140ms] hover:bg-papel", !n.leida && "bg-papel/60")}>
                      <d.i className="mt-0.5 size-4 shrink-0" style={{ color: d.c }} aria-label={d.t} />
                      <span className="min-w-0 flex-1">
                        <span className={cx("block text-[13px] leading-snug", !n.leida ? "font-medium text-negro" : "text-carbon")}>{n.texto}</span>
                        <span className="mt-1 block text-[11.5px] text-gris">{ORIGENES_NOTIFICACION[n.origen] ?? n.origen}{n.referencia && <> · <span className="t-dato">{n.referencia}</span></>} · <time dateTime={n.fecha} title={new Date(n.fecha).toLocaleString("es-CL")}>{haceRel(n.fecha)}</time></span>
                      </span>
                      {!n.leida && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-acento" aria-label="No leída" />}
                    </button>
                  </li>
                );
              })}
              {vista === "vivo" && vivo.length === 0 && <li className="px-6 py-12 text-center text-[13px] text-gris">Sin actividad de planta en esta sesión.</li>}
              {vista === "vivo" && vivo.map((a) => (
                <li key={a.id}>
                  <button onClick={() => ir(a.destino)} className="flex w-full cursor-pointer gap-3 border-b border-linea-suave px-4 py-3 text-left hover:bg-papel">
                    {a.nivel === "alarma" ? <XOctagon className="mt-0.5 size-4 shrink-0 text-rojo" /> : a.nivel === "aviso" ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-ambar" /> : <Info className="mt-0.5 size-4 shrink-0 text-gris" />}
                    <span className="min-w-0 flex-1"><span className="block text-[13px]">{a.texto}</span><span className="text-[11.5px] text-gris">{new Date(a.ts).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</span></span>
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
