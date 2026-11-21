"use client";
import { AnimatePresence, animate, motion, useInView } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Check, ChevronDown, ChevronUp, Inbox, Loader2, X } from "lucide-react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// ------------------------------------------------------------------------------------------ etiquetas de estado
type Tono = "ok" | "peligro" | "aviso" | "info" | "neutro" | "negro";
const TONOS: Record<Tono, string> = {
  ok: "bg-verde-claro text-verde", peligro: "bg-rojo-claro text-rojo-hondo", aviso: "bg-ambar-claro text-[#8a5a00]",
  info: "bg-azul-claro text-azul", neutro: "bg-chapa text-gris", negro: "bg-negro text-white",
};
const PUNTOS: Record<Tono, string> = { ok: "bg-verde", peligro: "bg-rojo", aviso: "bg-ambar", info: "bg-azul", neutro: "bg-gris", negro: "bg-white" };

export function Chip({ tono = "neutro", children, punto = true, className }: { tono?: Tono; children: ReactNode; punto?: boolean; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-[3px] px-2 py-0.5 text-[13px] font-medium leading-5", TONOS[tono], className)}>
      {punto && <span className={cx("size-1.5 rounded-full", PUNTOS[tono])} />}
      {children}
    </span>
  );
}

const TONO_CUENTA: Record<string, Tono> = { ACTIVA: "ok", CERRADA: "peligro", SUSPENDIDA: "aviso", Activo: "ok", Desvinculado: "peligro", VIGENTE: "ok", VENCIDO: "peligro", VENCIDA: "peligro", TERMINADO: "peligro", "HISTÓRICO": "neutro", "POR VENCER": "aviso", "SIN CONTRATO": "aviso" };
const ETIQUETA: Record<string, string> = { ACTIVA: "Activa", CERRADA: "Cerrada", SUSPENDIDA: "Suspendida", VIGENTE: "Vigente", VENCIDO: "Vencido", VENCIDA: "Vencida", TERMINADO: "Terminado", "HISTÓRICO": "Histórico", "POR VENCER": "Por vencer", "SIN CONTRATO": "Sin contrato" };

/** Estado con transición: cuando cambia (por ejemplo una cuenta que se cierra), la etiqueta se reemplaza con un giro. */
export function Estado({ v }: { v: string }) {
  return (
    <span className="relative inline-flex">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={v} initial={{ opacity: 0, rotateX: -80 }} animate={{ opacity: 1, rotateX: 0 }} exit={{ opacity: 0, rotateX: 80 }} transition={{ duration: 0.28 }} style={{ transformPerspective: 400 }}>
          <Chip tono={TONO_CUENTA[v] ?? "neutro"}>{ETIQUETA[v] ?? v}</Chip>
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

// ------------------------------------------------------------------------------------------ botones y campos
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "negro" | "rojo" | "contorno" | "texto" | "peligro"; cargando?: boolean; tam?: "m" | "s" };
export function Boton({ variante = "negro", cargando, tam = "m", className, children, disabled, ...r }: BtnProps) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold transition-[background-color,color,box-shadow] duration-150 disabled:opacity-45 disabled:pointer-events-none cursor-pointer select-none";
  const v = {
    negro: "bg-negro text-white hover:bg-carbon", rojo: "bg-rojo text-white hover:bg-rojo-hondo", peligro: "bg-rojo text-white hover:bg-rojo-hondo",
    contorno: "border border-linea bg-papel text-negro hover:border-negro", texto: "text-negro hover:bg-chapa",
  }[variante];
  return (
    <button {...r} disabled={disabled || cargando} className={cx(base, v, tam === "m" ? "h-10 px-4 text-[15px]" : "h-8 px-3 text-[14px]", "rounded-[3px]", className)}>
      {cargando && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Campo({ etiqueta, ayuda, error, children, className }: { etiqueta: string; ayuda?: string; error?: string | null; children: ReactNode; className?: string }) {
  return (
    <label className={cx("flex flex-col gap-1", className)}>
      <span className="text-[13px] font-medium text-gris">{etiqueta}</span>
      {children}
      {error ? <span className="text-[13px] text-rojo-hondo">{error}</span> : ayuda ? <span className="text-[13px] text-gris">{ayuda}</span> : null}
    </label>
  );
}
const CONTROL = "h-10 w-full rounded-[3px] border border-linea bg-papel px-3 text-[15px] outline-none transition-colors placeholder:text-[#9a9ea6] focus:border-negro disabled:bg-chapa";
export const Entrada = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(CONTROL, className)} />;
export const Seleccion = ({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(CONTROL, "pr-8", className)}>{children}</select>;
export const AreaTexto = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cx(CONTROL, "h-auto min-h-20 py-2", className)} />;

// ------------------------------------------------------------------------------------------ estructura de página
export function Encabezado({ titulo, descripcion, acciones, atras }: { titulo: ReactNode; descripcion?: ReactNode; acciones?: ReactNode; atras?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {atras}
        <h1 className="display text-[40px] font-bold leading-[1.05] tracking-tight">{titulo}</h1>
        {descripcion && <p className="mt-1 max-w-[62ch] text-gris">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </header>
  );
}

export function Seccion({ titulo, derecha, children, className, sinBorde }: { titulo?: ReactNode; derecha?: ReactNode; children: ReactNode; className?: string; sinBorde?: boolean }) {
  return (
    <section className={cx("bg-papel", !sinBorde && "border-t-[3px] border-negro", className)}>
      {(titulo || derecha) && (
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <h2 className="display text-[22px] font-semibold leading-none">{titulo}</h2>
          {derecha}
        </div>
      )}
      {children}
    </section>
  );
}

export function Vacio({ titulo, texto, accion }: { titulo: string; texto?: string; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <Inbox className="size-8 text-linea" strokeWidth={1.5} />
      <p className="display text-xl font-semibold">{titulo}</p>
      {texto && <p className="max-w-[46ch] text-gris">{texto}</p>}
      {accion}
    </div>
  );
}

export const Esqueleto = ({ className }: { className?: string }) => <div className={cx("animate-pulse rounded-[3px] bg-chapa", className)} />;

export function ErrorCarga({ error, reintentar }: { error: unknown; reintentar?: () => void }) {
  const msg = error instanceof Error ? error.message : "No se pudo cargar la información.";
  return (
    <div className="flex flex-col items-start gap-3 border-l-[3px] border-rojo bg-papel p-5">
      <p className="font-semibold">No se pudo cargar</p>
      <p className="text-gris">{msg}</p>
      {reintentar && <Boton variante="contorno" tam="s" onClick={reintentar}>Reintentar</Boton>}
    </div>
  );
}

// ------------------------------------------------------------------------------------------ números con movimiento
export function Cuenta({ valor, formato = (n: number) => Math.round(n).toLocaleString("es-CL"), duracion = 0.9, className }: { valor: number; formato?: (n: number) => string; duracion?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const visible = useInView(ref, { once: true });
  const [v, setV] = useState(0);
  const previo = useRef(0);
  useEffect(() => {
    if (!visible) return;
    const c = animate(previo.current, valor, { duration: duracion, ease: [0.2, 0.7, 0.2, 1], onUpdate: setV });
    previo.current = valor;
    return () => c.stop();
  }, [valor, visible, duracion]);
  return <span ref={ref} className={cx("num", className)}>{formato(v)}</span>;
}

export interface Parte { valor: number; color: string; etiqueta: string }
export function BarraSegmentada({ partes, alto = 10 }: { partes: Parte[]; alto?: number }) {
  const total = partes.reduce((a, p) => a + p.valor, 0) || 1;
  return (
    <div className="flex w-full gap-[2px] overflow-hidden" style={{ height: alto }} role="img" aria-label={partes.map((p) => `${p.etiqueta}: ${p.valor}`).join(", ")}>
      {partes.filter((p) => p.valor > 0).map((p, i) => (
        <motion.div key={p.etiqueta} initial={{ width: 0 }} animate={{ width: `${(p.valor / total) * 100}%` }} transition={{ duration: 0.8, delay: 0.1 + i * 0.08, ease: [0.2, 0.7, 0.2, 1] }} style={{ background: p.color }} title={`${p.etiqueta}: ${p.valor}`} />
      ))}
    </div>
  );
}

// ------------------------------------------------------------------------------------------ pestañas
export function Pestanas<T extends string>({ items, activa, onCambio, id }: { items: { clave: T; titulo: string; n?: number }[]; activa: T; onCambio: (c: T) => void; id: string }) {
  return (
    <div role="tablist" className="flex gap-6 border-b border-linea">
      {items.map((it) => (
        <button key={it.clave} role="tab" aria-selected={activa === it.clave} onClick={() => onCambio(it.clave)}
          className={cx("relative cursor-pointer pb-2.5 pt-1 text-[15px] font-medium transition-colors", activa === it.clave ? "text-negro" : "text-gris hover:text-negro")}>
          {it.titulo}
          {it.n != null && <span className="num ml-1.5 text-[13px] text-gris">{it.n}</span>}
          {activa === it.clave && <motion.span layoutId={`pestana-${id}`} className="absolute inset-x-0 -bottom-px h-[3px] bg-rojo" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------------------------------ tabla
export interface Columna<T> {
  clave: string; titulo: string; render: (f: T) => ReactNode; valor?: (f: T) => string | number | null | undefined;
  alinear?: "derecha"; ancho?: string; oculta?: boolean;
}
export function Tabla<T>({ columnas, filas, clave, alHacerClic, cargando, vacio, maxAlto }: { columnas: Columna<T>[]; filas: T[]; clave: (f: T) => string | number; alHacerClic?: (f: T) => void; cargando?: boolean; vacio?: ReactNode; maxAlto?: string }) {
  const [orden, setOrden] = useState<{ clave: string; asc: boolean } | null>(null);
  const ordenadas = useMemo(() => {
    const col = columnas.find((c) => c.clave === orden?.clave);
    if (!orden || !col?.valor) return filas;
    const v = col.valor;
    return [...filas].sort((a, b) => {
      const x = v(a), y = v(b);
      if (x == null) return 1;
      if (y == null) return -1;
      const r = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "es");
      return orden.asc ? r : -r;
    });
  }, [filas, orden, columnas]);
  return (
    <div className="overflow-auto" style={{ maxHeight: maxAlto }}>
      <table className="w-full border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-papel">
          <tr className="border-b border-negro">
            {columnas.filter((c) => !c.oculta).map((c) => (
              <th key={c.clave} style={{ width: c.ancho }} className={cx("whitespace-nowrap px-4 py-2.5 text-[13px] font-semibold text-gris", c.alinear === "derecha" && "text-right")}>
                {c.valor ? (
                  <button className="inline-flex cursor-pointer items-center gap-1 hover:text-negro" onClick={() => setOrden((o) => (o?.clave === c.clave ? { clave: c.clave, asc: !o.asc } : { clave: c.clave, asc: true }))}>
                    {c.titulo}
                    {orden?.clave === c.clave && (orden.asc ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />)}
                  </button>
                ) : c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cargando && Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className="border-b border-linea-suave">{columnas.filter((c) => !c.oculta).map((c) => <td key={c.clave} className="px-4 py-3"><Esqueleto className="h-4 w-3/4" /></td>)}</tr>
          ))}
          {!cargando && ordenadas.map((f) => (
            <tr key={clave(f)} onClick={alHacerClic ? () => alHacerClic(f) : undefined} tabIndex={alHacerClic ? 0 : undefined}
              onKeyDown={alHacerClic ? (e) => e.key === "Enter" && alHacerClic(f) : undefined}
              className={cx("border-b border-linea-suave transition-colors", alHacerClic && "cursor-pointer hover:bg-chapa/70 focus-visible:bg-chapa/70")}>
              {columnas.filter((c) => !c.oculta).map((c) => <td key={c.clave} className={cx("px-4 py-2.5 align-middle", c.alinear === "derecha" && "num text-right")}>{c.render(f)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {!cargando && filas.length === 0 && (vacio ?? <Vacio titulo="Sin resultados" texto="Cambie los filtros para ver más registros." />)}
    </div>
  );
}

// ------------------------------------------------------------------------------------------ ventanas
function useEscape(activo: boolean, f: () => void) {
  useEffect(() => {
    if (!activo) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && f();
    window.addEventListener("keydown", h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = prev; };
  }, [activo, f]);
}

export function Dialogo({ abierto, onCerrar, titulo, children, ancho = 560, pie }: { abierto: boolean; onCerrar: () => void; titulo: ReactNode; children: ReactNode; ancho?: number; pie?: ReactNode }) {
  useEscape(abierto, onCerrar);
  return (
    <AnimatePresence>
      {abierto && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <motion.div className="absolute inset-0 bg-black/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCerrar} />
          <motion.div role="dialog" aria-modal="true" className="relative flex max-h-[92vh] w-full flex-col bg-papel shadow-[0_24px_60px_-12px_rgba(0,0,0,.45)]" style={{ maxWidth: ancho }}
            initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}>
            <div className="flex items-start justify-between gap-4 border-t-[3px] border-negro px-6 pb-3 pt-4">
              <h2 className="display text-[26px] font-bold leading-tight">{titulo}</h2>
              <button aria-label="Cerrar" onClick={onCerrar} className="-mr-2 grid size-8 cursor-pointer place-items-center rounded-[3px] hover:bg-chapa"><X className="size-5" /></button>
            </div>
            <div className="overflow-auto px-6 pb-5">{children}</div>
            {pie && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-linea-suave px-6 py-3">{pie}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Cajon({ abierto, onCerrar, titulo, children, ancho = 520 }: { abierto: boolean; onCerrar: () => void; titulo: ReactNode; children: ReactNode; ancho?: number }) {
  useEscape(abierto, onCerrar);
  return (
    <AnimatePresence>
      {abierto && (
        <div className="fixed inset-0 z-50">
          <motion.div className="absolute inset-0 bg-black/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCerrar} />
          <motion.aside role="dialog" aria-modal="true" className="absolute inset-y-0 right-0 flex w-full flex-col bg-papel shadow-2xl" style={{ maxWidth: ancho }}
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 380, damping: 38 }}>
            <div className="flex items-start justify-between gap-4 border-b border-linea px-6 py-4">
              <h2 className="display text-[26px] font-bold leading-tight">{titulo}</h2>
              <button aria-label="Cerrar" onClick={onCerrar} className="-mr-2 grid size-8 cursor-pointer place-items-center rounded-[3px] hover:bg-chapa"><X className="size-5" /></button>
            </div>
            <div className="flex-1 overflow-auto px-6 py-5">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

// ------------------------------------------------------------------------------------------ avisos
interface Aviso { id: number; texto: string; tono: "ok" | "error" }
const AvisosCtx = createContext<(texto: string, tono?: "ok" | "error") => void>(() => {});
export const useAviso = () => useContext(AvisosCtx);

export function AvisosProvider({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Aviso[]>([]);
  const poner = useCallback((texto: string, tono: "ok" | "error" = "ok") => {
    const id = Date.now() + Math.random();
    setLista((l) => [...l, { id, texto, tono }]);
    setTimeout(() => setLista((l) => l.filter((x) => x.id !== id)), tono === "error" ? 6000 : 3500);
  }, []);
  return (
    <AvisosCtx.Provider value={poner}>
      {children}
      <div className="pointer-events-none fixed right-4 top-16 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        <AnimatePresence>
          {lista.map((a) => (
            <motion.div key={a.id} layout initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
              className={cx("pointer-events-auto flex items-start gap-3 border-l-[3px] bg-negro px-4 py-3 text-white shadow-xl", a.tono === "ok" ? "border-verde" : "border-rojo")}>
              {a.tono === "ok" ? <Check className="mt-0.5 size-4 shrink-0 text-[#4ad08a]" /> : <X className="mt-0.5 size-4 shrink-0 text-[#ff6a70]" />}
              <p className="text-[15px]">{a.texto}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </AvisosCtx.Provider>
  );
}

export function mensajeDe(e: unknown) { return e instanceof Error ? e.message : "Ocurrió un error inesperado."; }

export function Dato({ etiqueta, children, className }: { etiqueta: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[13px] text-gris">{etiqueta}</dt>
      <dd className="mt-0.5 break-words font-medium">{children || "—"}</dd>
    </div>
  );
}
