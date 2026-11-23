"use client";
import { AnimatePresence, animate, motion, useInView } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type InputHTMLAttributes, type MouseEvent, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Check, ChevronDown, ChevronUp, Inbox, Loader2, X } from "lucide-react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export const CURVA = [0.2, 0.7, 0.2, 1] as const;

// ------------------------------------------------------------------------------------------ estados
type Tono = "ok" | "peligro" | "aviso" | "info" | "neutro" | "negro" | "acento";
const TONOS: Record<Tono, string> = {
  ok: "bg-verde-claro text-verde ring-verde/25", peligro: "bg-rojo-claro text-rojo-hondo ring-rojo/25", aviso: "bg-ambar-claro text-ambar-hondo ring-ambar/25",
  info: "bg-azul-claro text-azul ring-azul/25", neutro: "bg-linea-suave text-gris ring-linea", negro: "bg-negro text-sobre-negro ring-negro", acento: "bg-acento-claro text-acento ring-acento/25",
};
const PUNTOS: Record<Tono, string> = { ok: "bg-verde shadow-[0_0_8px_var(--s-verde)]", peligro: "bg-rojo shadow-[0_0_8px_var(--s-rojo)]", aviso: "bg-ambar shadow-[0_0_8px_var(--s-ambar)]", info: "bg-azul", neutro: "bg-gris", negro: "bg-sobre-negro", acento: "bg-acento shadow-[0_0_8px_var(--s-acento)]" };

export function Chip({ tono = "neutro", children, punto = true, className }: { tono?: Tono; children: ReactNode; punto?: boolean; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold leading-5 ring-1 ring-inset", TONOS[tono], className)}>
      {punto && <span className={cx("size-1.5 rounded-full", PUNTOS[tono])} />}
      {children}
    </span>
  );
}

const TONO_ESTADO: Record<string, Tono> = { ACTIVA: "ok", CERRADA: "peligro", SUSPENDIDA: "aviso", Activo: "ok", Desvinculado: "peligro", VIGENTE: "ok", VENCIDO: "peligro", VENCIDA: "peligro", TERMINADO: "peligro", "HISTÓRICO": "neutro", "POR VENCER": "aviso", "SIN CONTRATO": "aviso" };
const ETIQUETA: Record<string, string> = { ACTIVA: "Activa", CERRADA: "Cerrada", SUSPENDIDA: "Suspendida", VIGENTE: "Vigente", VENCIDO: "Vencido", VENCIDA: "Vencida", TERMINADO: "Terminado", "HISTÓRICO": "Histórico", "POR VENCER": "Por vencer", "SIN CONTRATO": "Sin contrato" };

/** Estado con transición: cuando cambia (por ejemplo una cuenta que se cierra), la etiqueta gira. */
export function Estado({ v }: { v: string }) {
  return (
    <span className="relative inline-flex">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={v} initial={{ opacity: 0, rotateX: -80 }} animate={{ opacity: 1, rotateX: 0 }} exit={{ opacity: 0, rotateX: 80 }} transition={{ duration: 0.3 }} style={{ transformPerspective: 400 }}>
          <Chip tono={TONO_ESTADO[v] ?? "neutro"}>{ETIQUETA[v] ?? v}</Chip>
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

// ------------------------------------------------------------------------------------------ botones y campos
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "negro" | "rojo" | "contorno" | "texto" | "peligro" | "acento"; cargando?: boolean; tam?: "m" | "s" | "l" };
export function Boton({ variante = "negro", cargando, tam = "m", className, children, disabled, ...r }: BtnProps) {
  const base = "relative inline-flex items-center justify-center gap-2 overflow-hidden font-semibold transition-[background-color,color,box-shadow,transform,border-color] duration-200 active:scale-[.97] disabled:opacity-45 disabled:pointer-events-none cursor-pointer select-none rounded-xl";
  const v = {
    negro: "bg-negro text-sobre-negro hover:bg-carbon",
    rojo: "bg-gradient-to-br from-acento to-[color-mix(in_srgb,var(--s-acento)_70%,var(--s-azul))] text-sobre-negro shadow-[0_8px_24px_-10px_var(--s-acento)] hover:shadow-[0_10px_30px_-8px_var(--s-acento)]",
    acento: "bg-gradient-to-br from-acento to-[color-mix(in_srgb,var(--s-acento)_70%,var(--s-azul))] text-sobre-negro shadow-[0_8px_24px_-10px_var(--s-acento)] hover:shadow-[0_10px_30px_-8px_var(--s-acento)]",
    peligro: "bg-rojo text-white shadow-[0_8px_24px_-12px_var(--s-rojo)] hover:brightness-110",
    contorno: "border border-linea bg-papel/60 text-negro hover:border-acento/60 hover:bg-papel-2",
    texto: "text-negro hover:bg-linea-suave",
  }[variante];
  const t = { s: "h-8 px-3 text-[13.5px]", m: "h-10 px-4 text-[14.5px]", l: "h-12 px-6 text-[16px]" }[tam];
  return (
    <button {...r} disabled={disabled || cargando} className={cx(base, v, t, className)}>
      {cargando && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Campo({ etiqueta, ayuda, error, children, className }: { etiqueta: string; ayuda?: string; error?: string | null; children: ReactNode; className?: string }) {
  return (
    <label className={cx("flex flex-col gap-1.5", className)}>
      <span className="text-[13px] font-medium text-gris">{etiqueta}</span>
      {children}
      {error ? <span className="text-[13px] text-rojo-hondo">{error}</span> : ayuda ? <span className="text-[12.5px] text-gris">{ayuda}</span> : null}
    </label>
  );
}
const CONTROL = "h-11 w-full rounded-xl border border-linea bg-chapa/60 px-3.5 text-[15px] text-negro outline-none transition-[border-color,box-shadow] placeholder:text-gris/70 focus:border-acento focus:shadow-[0_0_0_4px_var(--s-acento-claro)] disabled:opacity-60";
export const Entrada = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(CONTROL, className)} />;
export const Seleccion = ({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(CONTROL, "pr-8", className)}>{children}</select>;
export const AreaTexto = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cx(CONTROL, "h-auto min-h-24 py-2.5", className)} />;

// ------------------------------------------------------------------------------------------ estructura
export function Encabezado({ titulo, descripcion, acciones, atras }: { titulo: ReactNode; descripcion?: ReactNode; acciones?: ReactNode; atras?: ReactNode }) {
  return (
    <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: CURVA }} className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {atras}
        <h1 className="display text-[clamp(30px,3.2vw,46px)] font-bold leading-[1.02]">{titulo}</h1>
        {descripcion && <div className="mt-2 max-w-[72ch] text-[15px] text-gris">{descripcion}</div>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </motion.header>
  );
}

/** Tarjeta de vidrio con un brillo que sigue al cursor. */
export function Tarjeta({ children, className, brillo = true, style, onClick }: { children: ReactNode; className?: string; brillo?: boolean; style?: CSSProperties; onClick?: () => void }) {
  const mover = (e: MouseEvent<HTMLDivElement>) => {
    if (!brillo) return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return <div onMouseMove={mover} onClick={onClick} style={style} className={cx("tarjeta", brillo && "tarjeta-brillo", className)}>{children}</div>;
}

export function Seccion({ titulo, derecha, children, className, sinBorde, icono }: { titulo?: ReactNode; derecha?: ReactNode; children: ReactNode; className?: string; sinBorde?: boolean; icono?: ReactNode }) {
  return (
    <Tarjeta brillo={!sinBorde} className={cx("overflow-hidden", className)}>
      {(titulo || derecha) && (
        <div className="relative flex items-center justify-between gap-3 px-5 pt-4">
          <h2 className="display flex items-center gap-2 text-[19px] font-semibold leading-tight">{icono}{titulo}</h2>
          {derecha}
        </div>
      )}
      <div className="relative">{children}</div>
    </Tarjeta>
  );
}

export function Vacio({ titulo, texto, accion }: { titulo: string; texto?: string; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-linea-suave text-gris"><Inbox className="size-7" strokeWidth={1.5} /></span>
      <p className="display text-[19px] font-semibold">{titulo}</p>
      {texto && <p className="max-w-[46ch] text-gris">{texto}</p>}
      {accion}
    </div>
  );
}

export const Esqueleto = ({ className }: { className?: string }) => <div className={cx("destello rounded-xl", className)} />;

export function ErrorCarga({ error, reintentar }: { error: unknown; reintentar?: () => void }) {
  const msg = error instanceof Error ? error.message : "No se pudo cargar la información.";
  return (
    <Tarjeta className="flex flex-col items-start gap-3 border-rojo/30 p-5">
      <p className="font-semibold text-rojo-hondo">No se pudo cargar</p>
      <p className="text-gris">{msg}</p>
      {reintentar && <Boton variante="contorno" tam="s" onClick={reintentar}>Reintentar</Boton>}
    </Tarjeta>
  );
}

export function Avatar({ nombre, tam = 40, className }: { nombre: string; tam?: number; className?: string }) {
  const ini = nombre.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  let h = 0; for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) % 360;
  return (
    <span className={cx("grid shrink-0 place-items-center rounded-xl font-display font-bold text-white", className)}
      style={{ width: tam, height: tam, fontSize: tam * 0.38, background: `linear-gradient(135deg, hsl(${h} 62% 46%), hsl(${(h + 40) % 360} 70% 36%))` }}>{ini}</span>
  );
}

// ------------------------------------------------------------------------------------------ números con movimiento
export function Cuenta({ valor, formato = (n: number) => Math.round(n).toLocaleString("es-CL"), duracion = 1, className }: { valor: number; formato?: (n: number) => string; duracion?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const visible = useInView(ref, { once: true });
  const [v, setV] = useState(0);
  const previo = useRef(0);
  useEffect(() => {
    if (!visible) return;
    const c = animate(previo.current, valor, { duration: duracion, ease: CURVA, onUpdate: setV });
    previo.current = valor;
    return () => c.stop();
  }, [valor, visible, duracion]);
  return <span ref={ref} className={cx("num", className)}>{formato(v)}</span>;
}

export interface Parte { valor: number; color: string; etiqueta: string }
export function BarraSegmentada({ partes, alto = 10 }: { partes: Parte[]; alto?: number }) {
  const total = partes.reduce((a, p) => a + p.valor, 0) || 1;
  return (
    <div className="flex w-full gap-[3px] overflow-hidden rounded-full bg-linea-suave" style={{ height: alto }} role="img" aria-label={partes.map((p) => `${p.etiqueta}: ${p.valor}`).join(", ")}>
      {partes.filter((p) => p.valor > 0).map((p, i) => (
        <motion.div key={p.etiqueta} className="rounded-full" initial={{ width: 0 }} animate={{ width: `${(p.valor / total) * 100}%` }} transition={{ duration: 0.9, delay: 0.15 + i * 0.08, ease: CURVA }} style={{ background: p.color }} title={`${p.etiqueta}: ${p.valor}`} />
      ))}
    </div>
  );
}

// ------------------------------------------------------------------------------------------ pestañas
export function Pestanas<T extends string>({ items, activa, onCambio, id }: { items: { clave: T; titulo: string; n?: number }[]; activa: T; onCambio: (c: T) => void; id: string }) {
  return (
    <div role="tablist" className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-linea-suave bg-papel/70 p-1">
      {items.map((it) => (
        <button key={it.clave} role="tab" aria-selected={activa === it.clave} onClick={() => onCambio(it.clave)}
          className={cx("relative cursor-pointer whitespace-nowrap rounded-xl px-4 py-2 text-[14px] font-semibold transition-colors", activa === it.clave ? "text-sobre-negro" : "text-gris hover:text-negro")}>
          {activa === it.clave && <motion.span layoutId={`pestana-${id}`} className="absolute inset-0 rounded-xl bg-negro" transition={{ type: "spring", stiffness: 480, damping: 38 }} />}
          <span className="relative">{it.titulo}{it.n != null && <span className={cx("num ml-1.5 text-[12px]", activa === it.clave ? "opacity-70" : "text-gris")}>{it.n}</span>}</span>
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
  const cols = columnas.filter((c) => !c.oculta);
  return (
    <div className="overflow-auto" style={{ maxHeight: maxAlto }}>
      <table className="w-full border-separate border-spacing-0 text-left">
        <thead className="sticky top-0 z-10">
          <tr>
            {cols.map((c) => (
              <th key={c.clave} style={{ width: c.ancho }} className={cx("vidrio whitespace-nowrap border-b border-linea px-4 py-3 text-[12.5px] font-semibold uppercase tracking-[.04em] text-gris", c.alinear === "derecha" && "text-right")}>
                {c.valor ? (
                  <button className="inline-flex cursor-pointer items-center gap-1 uppercase hover:text-negro" onClick={() => setOrden((o) => (o?.clave === c.clave ? { clave: c.clave, asc: !o.asc } : { clave: c.clave, asc: true }))}>
                    {c.titulo}{orden?.clave === c.clave && (orden.asc ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />)}
                  </button>
                ) : c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cargando && Array.from({ length: 7 }).map((_, i) => (
            <tr key={i}>{cols.map((c) => <td key={c.clave} className="border-b border-linea-suave px-4 py-3.5"><Esqueleto className="h-4 w-3/4" /></td>)}</tr>
          ))}
          {!cargando && ordenadas.map((f, i) => (
            <motion.tr key={clave(f)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: Math.min(i * 0.015, 0.3) }}
              onClick={alHacerClic ? () => alHacerClic(f) : undefined} tabIndex={alHacerClic ? 0 : undefined}
              onKeyDown={alHacerClic ? (e) => e.key === "Enter" && alHacerClic(f) : undefined}
              className={cx("group transition-colors", alHacerClic && "cursor-pointer hover:bg-acento-claro/60 focus-visible:bg-acento-claro/60")}>
              {cols.map((c) => <td key={c.clave} className={cx("border-b border-linea-suave px-4 py-3 align-middle", c.alinear === "derecha" && "num text-right")}>{c.render(f)}</td>)}
            </motion.tr>
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

export function Dialogo({ abierto, onCerrar, titulo, children, ancho = 600, pie }: { abierto: boolean; onCerrar: () => void; titulo: ReactNode; children: ReactNode; ancho?: number; pie?: ReactNode }) {
  useEscape(abierto, onCerrar);
  return (
    <AnimatePresence>
      {abierto && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <motion.div className="absolute inset-0 bg-[#02050c]/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCerrar} />
          <motion.div role="dialog" aria-modal="true" className="tarjeta relative flex max-h-[92vh] w-full flex-col bg-papel" style={{ maxWidth: ancho }}
            initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: 0.97 }} transition={{ type: "spring", stiffness: 380, damping: 32 }}>
            <div className="flex items-start justify-between gap-4 px-6 pb-3 pt-5">
              <h2 className="display text-[24px] font-bold leading-tight">{titulo}</h2>
              <button aria-label="Cerrar" onClick={onCerrar} className="-mr-2 grid size-9 cursor-pointer place-items-center rounded-xl text-gris hover:bg-linea-suave hover:text-negro"><X className="size-5" /></button>
            </div>
            <div className="overflow-auto px-6 pb-5">{children}</div>
            {pie && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-linea-suave px-6 py-4">{pie}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Cajon({ abierto, onCerrar, titulo, children, ancho = 560 }: { abierto: boolean; onCerrar: () => void; titulo: ReactNode; children: ReactNode; ancho?: number }) {
  useEscape(abierto, onCerrar);
  return (
    <AnimatePresence>
      {abierto && (
        <div className="fixed inset-0 z-50">
          <motion.div className="absolute inset-0 bg-[#02050c]/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCerrar} />
          <motion.aside role="dialog" aria-modal="true" className="absolute inset-y-2 right-2 flex w-[calc(100%-1rem)] flex-col overflow-hidden rounded-2xl border border-linea bg-papel shadow-2xl" style={{ maxWidth: ancho }}
            initial={{ x: "105%" }} animate={{ x: 0 }} exit={{ x: "105%" }} transition={{ type: "spring", stiffness: 360, damping: 36 }}>
            <div className="flex items-start justify-between gap-4 border-b border-linea-suave px-6 py-4">
              <h2 className="display text-[24px] font-bold leading-tight">{titulo}</h2>
              <button aria-label="Cerrar" onClick={onCerrar} className="-mr-2 grid size-9 cursor-pointer place-items-center rounded-xl text-gris hover:bg-linea-suave hover:text-negro"><X className="size-5" /></button>
            </div>
            <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-5">{children}</div>
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
    setTimeout(() => setLista((l) => l.filter((x) => x.id !== id)), tono === "error" ? 6000 : 3800);
  }, []);
  return (
    <AvisosCtx.Provider value={poner}>
      {children}
      <div className="pointer-events-none fixed right-4 top-20 z-[60] flex w-[min(400px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        <AnimatePresence>
          {lista.map((a) => (
            <motion.div key={a.id} layout initial={{ opacity: 0, x: 40, scale: 0.96 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }}
              className="tarjeta vidrio pointer-events-auto flex items-start gap-3 overflow-hidden px-4 py-3">
              <span className={cx("mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg", a.tono === "ok" ? "bg-verde-claro text-verde" : "bg-rojo-claro text-rojo")}>{a.tono === "ok" ? <Check className="size-4" /> : <X className="size-4" />}</span>
              <p className="text-[14.5px]">{a.texto}</p>
              <motion.span className={cx("absolute bottom-0 left-0 h-0.5", a.tono === "ok" ? "bg-verde" : "bg-rojo")} initial={{ width: "100%" }} animate={{ width: 0 }} transition={{ duration: a.tono === "error" ? 6 : 3.8, ease: "linear" }} />
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
      <dt className="text-[12.5px] font-medium text-gris">{etiqueta}</dt>
      <dd className="mt-0.5 break-words font-semibold">{children || "—"}</dd>
    </div>
  );
}

// ------------------------------------------------------------------------------------------ indicador grande
export function Kpi({ titulo, valor, formato, sufijo, detalle, tono = "acento", icono, grafico, delay = 0 }: {
  titulo: string; valor: number | null; formato?: (n: number) => string; sufijo?: string; detalle?: ReactNode; tono?: "acento" | "verde" | "ambar" | "rojo" | "azul" | "cobre"; icono?: ReactNode; grafico?: ReactNode; delay?: number;
}) {
  const color = { acento: "var(--s-acento)", verde: "var(--s-verde)", ambar: "var(--s-ambar)", rojo: "var(--s-rojo)", azul: "var(--s-azul)", cobre: "var(--s-cobre)" }[tono];
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay, ease: CURVA }} whileHover={{ y: -3 }}>
      <Tarjeta className="h-full overflow-hidden p-5" style={{ background: `radial-gradient(130% 100% at 0% 0%, color-mix(in srgb, ${color} 17%, transparent), transparent 58%), linear-gradient(160deg, var(--s-superficie-2), var(--s-superficie) 65%)`, borderColor: `color-mix(in srgb, ${color} 24%, var(--s-borde-suave))` }}>
        <div className="relative flex items-start justify-between gap-3">
          <p className="text-[13.5px] font-medium text-gris">{titulo}</p>
          {icono && <span className="grid size-9 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>{icono}</span>}
        </div>
        <p className="display relative mt-2 text-[clamp(32px,2.6vw,44px)] font-bold leading-none">
          {valor == null ? <span className="text-gris/50">—</span> : <Cuenta valor={valor} formato={formato} />}
          {sufijo && valor != null && <span className="ml-1 text-[0.5em] font-semibold text-gris">{sufijo}</span>}
        </p>
        {detalle && <div className="relative mt-2 text-[13px] text-gris">{detalle}</div>}
        {grafico && <div className="relative mt-3">{grafico}</div>}
      </Tarjeta>
    </motion.div>
  );
}

/** Fondo vivo: dos auroras que derivan lentamente y un relieve de curvas de nivel. */
export function FondoAurora({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cx("pointer-events-none fixed inset-0 -z-10 overflow-hidden", className)}>
      <div className="absolute -left-[10%] -top-[20%] size-[60vmax] rounded-full blur-[110px]" style={{ background: "var(--s-aurora-a)", animation: "deriva-a 26s ease-in-out infinite" }} />
      <div className="absolute -bottom-[25%] -right-[10%] size-[55vmax] rounded-full blur-[120px]" style={{ background: "var(--s-aurora-b)", animation: "deriva-b 32s ease-in-out infinite" }} />
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1200 800">
        {Array.from({ length: 14 }).map((_, i) => (
          <path key={i} fill="none" stroke="var(--s-curvas)" strokeWidth="1.2"
            d={`M -50 ${120 + i * 48} C 200 ${60 + i * 46}, 380 ${200 + i * 44}, 600 ${130 + i * 47} S 980 ${40 + i * 50}, 1260 ${150 + i * 45}`} />
        ))}
      </svg>
    </div>
  );
}
