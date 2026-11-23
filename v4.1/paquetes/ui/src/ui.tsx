"use client";
import { AnimatePresence, animate, motion, useInView, useReducedMotion } from "motion/react";
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ButtonHTMLAttributes, type CSSProperties, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from "react";
import {
  AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Ban, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleSlash, Clock, CloudOff, Columns3,
  FlaskConical, Inbox, Info, Loader2, Lock, LockKeyhole, Minus, Search, SearchX, ServerCrash, ShieldAlert, Stethoscope, TimerReset, Wrench, X, XOctagon, type LucideIcon,
} from "lucide-react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
/** Curva y tiempos del sistema (ms): micro 140 · componente 200 · pantalla 280 · panel 340. Sin rebotes. */
export const CURVA = [0.2, 0.7, 0.2, 1] as const;
export const TIEMPO = { micro: 0.14, componente: 0.2, pantalla: 0.28, panel: 0.34 } as const;

// ========================================================================================== etiquetas de estado
type Tono = "ok" | "peligro" | "aviso" | "info" | "neutro" | "negro" | "acento" | "mant" | "diag";
const TONOS: Record<Tono, string> = {
  ok: "bg-verde-claro text-verde", peligro: "bg-rojo-claro text-rojo", aviso: "bg-ambar-claro text-ambar",
  info: "bg-info-claro text-info", neutro: "bg-papel-2 text-gris", negro: "bg-negro text-sobre-negro", acento: "bg-acento-claro text-acento",
  mant: "bg-azul-claro text-azul", diag: "bg-diagnostico-claro text-diagnostico",
};
const PUNTOS: Record<Tono, string> = { ok: "bg-verde", peligro: "bg-rojo", aviso: "bg-ambar", info: "bg-info", neutro: "bg-detenido", negro: "bg-sobre-negro", acento: "bg-acento", mant: "bg-azul", diag: "bg-diagnostico" };

export function Chip({ tono = "neutro", children, punto = true, className, title }: { tono?: Tono; children: ReactNode; punto?: boolean; className?: string; title?: string }) {
  return (
    <span title={title} className={cx("inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded px-1.5 text-[11.5px] font-semibold leading-none", TONOS[tono], className)}>
      {punto && <span className={cx("size-1.5 rounded-full", PUNTOS[tono])} />}
      {children}
    </span>
  );
}

const TONO_ESTADO: Record<string, Tono> = { ACTIVA: "ok", CERRADA: "peligro", SUSPENDIDA: "aviso", Activo: "ok", Desvinculado: "peligro", VIGENTE: "ok", VENCIDO: "peligro", VENCIDA: "peligro", TERMINADO: "peligro", "HISTÓRICO": "neutro", "POR VENCER": "aviso", "SIN CONTRATO": "aviso" };
const ETIQUETA: Record<string, string> = { ACTIVA: "Activa", CERRADA: "Cerrada", SUSPENDIDA: "Suspendida", VIGENTE: "Vigente", VENCIDO: "Vencido", VENCIDA: "Vencida", TERMINADO: "Terminado", "HISTÓRICO": "Histórico", "POR VENCER": "Por vencer", "SIN CONTRATO": "Sin contrato" };

/** Estado administrativo (cuenta, contrato, habilitación) con transición suave al cambiar. */
export function Estado({ v }: { v: string }) {
  const reducir = useReducedMotion();
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span key={v} initial={reducir ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: TIEMPO.componente }} className="inline-flex">
        <Chip tono={TONO_ESTADO[v] ?? "neutro"}>{ETIQUETA[v] ?? v}</Chip>
      </motion.span>
    </AnimatePresence>
  );
}

// ========================================================================================== estados de equipo
/**
 * Los 10 estados de un equipo (definición funcional de SIMA). Cada uno tiene color, icono y etiqueta: nunca se comunica un
 * estado solo con color. Familias: en marcha (verde), atención (amarillo), detenido por falla o seguridad (rojo),
 * mantenimiento (azul), diagnóstico (violeta), sin operar (gris).
 */
export interface DefEstado { etiqueta: string; corta: string; color: string; tono: Tono; icono: LucideIcon; marcha: boolean; critico: boolean }
export const ESTADOS_EQUIPO: Record<string, DefEstado> = {
  operativo: { etiqueta: "Operativo", corta: "Operativo", color: "var(--s-verde)", tono: "ok", icono: CheckCircle2, marcha: true, critico: false },
  operativo_obs: { etiqueta: "Operativo con observaciones", corta: "Con observaciones", color: "var(--s-ambar)", tono: "aviso", icono: AlertTriangle, marcha: true, critico: false },
  falla: { etiqueta: "Falla detectada", corta: "Falla", color: "var(--s-rojo)", tono: "peligro", icono: XOctagon, marcha: false, critico: true },
  fuera_servicio: { etiqueta: "Fuera de servicio", corta: "Fuera de servicio", color: "var(--s-detenido)", tono: "neutro", icono: CircleSlash, marcha: false, critico: false },
  bloqueado_seguridad: { etiqueta: "Bloqueado por seguridad", corta: "Bloqueado", color: "var(--s-rojo)", tono: "peligro", icono: LockKeyhole, marcha: false, critico: true },
  en_diagnostico: { etiqueta: "En diagnóstico", corta: "Diagnóstico", color: "var(--s-diagnostico)", tono: "diag", icono: Stethoscope, marcha: false, critico: false },
  en_mantenimiento: { etiqueta: "En mantenimiento", corta: "Mantenimiento", color: "var(--s-azul)", tono: "mant", icono: Wrench, marcha: false, critico: false },
  en_pruebas: { etiqueta: "En pruebas", corta: "Pruebas", color: "var(--s-azul)", tono: "mant", icono: FlaskConical, marcha: false, critico: false },
  pendiente_liberacion: { etiqueta: "Pendiente de liberación", corta: "Por liberar", color: "var(--s-ambar)", tono: "aviso", icono: TimerReset, marcha: false, critico: false },
  liberado: { etiqueta: "Liberado para producción", corta: "Liberado", color: "var(--s-detenido)", tono: "neutro", icono: Check, marcha: false, critico: false },
};
// estados antiguos (servidores o caché anteriores) → equivalente nuevo
const ESTADO_ANTIGUO: Record<string, string> = { operando: "operativo", alarma: "falla", detenido: "liberado", en_mantencion: "en_mantenimiento" };
export const defEstado = (e?: string | null): DefEstado => ESTADOS_EQUIPO[ESTADO_ANTIGUO[e ?? ""] ?? e ?? ""] ?? { etiqueta: e ?? "Sin dato", corta: e ?? "—", color: "var(--s-detenido)", tono: "neutro", icono: Minus, marcha: false, critico: false };
export const estadoNormal = (e?: string | null) => ESTADO_ANTIGUO[e ?? ""] ?? e ?? "";

export function EstadoEquipo({ estado, corto, className, tam = "m" }: { estado?: string | null; corto?: boolean; className?: string; tam?: "s" | "m" }) {
  const d = defEstado(estado);
  const I = d.icono;
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded font-semibold leading-none", tam === "s" ? "h-5 px-1.5 text-[11px]" : "h-6 px-2 text-[12px]", TONOS[d.tono], className)} title={d.etiqueta}>
      <I className={tam === "s" ? "size-3" : "size-3.5"} strokeWidth={2.2} aria-hidden />
      {corto ? d.corta : d.etiqueta}
    </span>
  );
}

/** Distintivo de dato simulado: nunca se confunde con telemetría de una máquina física. */
export function MarcaSimulado({ className, texto = "Simulado" }: { className?: string; texto?: string }) {
  return <span className={cx("trama-sim inline-flex h-5 items-center gap-1 rounded border border-info/40 px-1.5 text-[11px] font-semibold text-info", className)} title="Dato simulado: no proviene de una máquina física"><FlaskConical className="size-3" />{texto}</span>;
}

// ========================================================================================== botones y campos
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "negro" | "rojo" | "contorno" | "texto" | "peligro" | "acento" | "secundario"; cargando?: boolean; tam?: "m" | "s" | "l"; icono?: boolean };
export function Boton({ variante = "secundario", cargando, tam = "m", icono, className, children, disabled, ...r }: BtnProps) {
  const base = "relative inline-flex shrink-0 items-center justify-center gap-1.5 font-semibold transition-[background-color,color,border-color,transform] duration-[140ms] active:translate-y-px disabled:opacity-45 disabled:pointer-events-none cursor-pointer select-none rounded-md whitespace-nowrap";
  const v = {
    acento: "bg-acento text-sobre-negro hover:bg-acento-hover",
    rojo: "bg-acento text-sobre-negro hover:bg-acento-hover",
    negro: "border border-linea bg-papel-2 text-negro hover:border-gris/60",
    secundario: "border border-linea bg-papel-2 text-negro hover:border-gris/60",
    peligro: "bg-rojo text-white hover:brightness-110",
    contorno: "border border-linea bg-transparent text-negro hover:bg-papel-2",
    texto: "text-carbon hover:bg-papel-2 hover:text-negro",
  }[variante];
  const t = icono ? { s: "size-7", m: "size-[var(--alto-control)]", l: "size-10" }[tam] : { s: "h-7 px-2.5 text-[12.5px]", m: "h-[var(--alto-control)] px-3.5 text-[13.5px]", l: "h-10 px-5 text-[14px]" }[tam];
  return (
    <button {...r} disabled={disabled || cargando} aria-busy={cargando || undefined} className={cx(base, v, t, className)}>
      {cargando && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Campo({ etiqueta, ayuda, error, obligatorio, children, className }: { etiqueta: string; ayuda?: string; error?: string | null; obligatorio?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={cx("flex flex-col gap-1.5", className)}>
      <span className="text-[12.5px] font-medium text-carbon">{etiqueta}{obligatorio && <span className="ml-0.5 text-acento" aria-label="obligatorio">*</span>}</span>
      {children}
      {error ? <span role="alert" className="flex items-center gap-1 text-[12px] text-rojo"><AlertTriangle className="size-3.5" />{error}</span> : ayuda ? <span className="text-[12px] text-gris">{ayuda}</span> : null}
    </label>
  );
}
const CONTROL = "h-[var(--alto-control)] w-full rounded-md border border-linea bg-chapa px-3 text-[13.5px] text-negro outline-none transition-[border-color,box-shadow] duration-[140ms] placeholder:text-apagado hover:border-gris/50 focus:border-acento focus:shadow-[0_0_0_3px_var(--s-acento-claro)] disabled:opacity-60 aria-[invalid=true]:border-rojo";
export const Entrada = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(CONTROL, className)} />;
export const Seleccion = ({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(CONTROL, "pr-8", className)}>{children}</select>;
export const AreaTexto = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cx(CONTROL, "h-auto min-h-20 py-2", className)} />;

/** Interruptor accesible (por ejemplo, acceso a una plataforma). */
export function Interruptor({ activo, onCambio, etiqueta, deshabilitado }: { activo: boolean; onCambio: (v: boolean) => void; etiqueta: string; deshabilitado?: boolean }) {
  return (
    <button role="switch" aria-checked={activo} aria-label={etiqueta} disabled={deshabilitado} onClick={() => onCambio(!activo)}
      className={cx("relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-[140ms] disabled:cursor-not-allowed disabled:opacity-50", activo ? "border-acento bg-acento" : "border-linea bg-papel-2")}>
      <motion.span layout transition={{ duration: TIEMPO.micro }} className={cx("size-3.5 rounded-full", activo ? "ml-[18px] bg-sobre-negro" : "ml-[2px] bg-gris")} />
    </button>
  );
}

// ========================================================================================== estructura
export function Encabezado({ titulo, descripcion, acciones, atras, migas }: { titulo: ReactNode; descripcion?: ReactNode; acciones?: ReactNode; atras?: ReactNode; migas?: ReactNode }) {
  return (
    <motion.header initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: TIEMPO.pantalla, ease: CURVA }} className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {atras}{migas}
        <h1 className="t-pantalla">{titulo}</h1>
        {descripcion && <div className="mt-1 max-w-[80ch] text-[13.5px] text-gris">{descripcion}</div>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </motion.header>
  );
}

export function Tarjeta({ children, className, style, onClick }: { children: ReactNode; className?: string; brillo?: boolean; style?: CSSProperties; onClick?: () => void }) {
  return <div onClick={onClick} style={style} className={cx("tarjeta", className)}>{children}</div>;
}

export function Seccion({ titulo, derecha, children, className, icono }: { titulo?: ReactNode; derecha?: ReactNode; children: ReactNode; className?: string; sinBorde?: boolean; icono?: ReactNode }) {
  return (
    <Tarjeta className={cx("overflow-hidden", className)}>
      {(titulo || derecha) && (
        <div className="flex min-h-11 items-center justify-between gap-3 border-b border-linea-suave px-4">
          <h2 className="t-seccion flex items-center gap-2">{icono && <span className="text-gris">{icono}</span>}{titulo}</h2>
          {derecha}
        </div>
      )}
      <div>{children}</div>
    </Tarjeta>
  );
}

// ========================================================================================== estados del sistema
type TipoEstado = "vacio" | "sin_resultados" | "error" | "sin_permiso" | "sin_conexion" | "sesion_expirada" | "desactualizado" | "mantenimiento" | "exito" | "pendiente" | "cargando";
const VISTA: Record<TipoEstado, { icono: LucideIcon; color: string; titulo: string; texto: string }> = {
  vacio: { icono: Inbox, color: "var(--s-tenue)", titulo: "Sin registros", texto: "Todavía no hay información aquí." },
  sin_resultados: { icono: SearchX, color: "var(--s-tenue)", titulo: "Sin resultados", texto: "Ningún registro coincide con la búsqueda o los filtros." },
  error: { icono: ServerCrash, color: "var(--s-rojo)", titulo: "No se pudo cargar", texto: "El servidor respondió con un error. Puede reintentar." },
  sin_permiso: { icono: Lock, color: "var(--s-tenue)", titulo: "Sin permiso", texto: "Esta información no es parte de las funciones de su cargo." },
  sin_conexion: { icono: CloudOff, color: "var(--s-ambar)", titulo: "Sin conexión con el servidor", texto: "Se muestran los últimos datos guardados. Los cambios se enviarán al reconectar." },
  sesion_expirada: { icono: Clock, color: "var(--s-ambar)", titulo: "Su sesión terminó", texto: "Vuelva a ingresar para continuar." },
  desactualizado: { icono: Clock, color: "var(--s-ambar)", titulo: "Datos desactualizados", texto: "La información no se ha actualizado recientemente." },
  mantenimiento: { icono: Wrench, color: "var(--s-azul)", titulo: "Mantenimiento programado", texto: "El servicio no está disponible por mantenimiento." },
  exito: { icono: CheckCircle2, color: "var(--s-verde)", titulo: "Listo", texto: "La operación se completó." },
  pendiente: { icono: TimerReset, color: "var(--s-ambar)", titulo: "Sincronización pendiente", texto: "Hay cambios guardados en este equipo que se enviarán al reconectar." },
  cargando: { icono: Loader2, color: "var(--s-tenue)", titulo: "Cargando", texto: "" },
};
export function EstadoVista({ tipo, titulo, texto, accion, compacto, className }: { tipo: TipoEstado; titulo?: string; texto?: string; accion?: ReactNode; compacto?: boolean; className?: string }) {
  const v = VISTA[tipo];
  const I = v.icono;
  return (
    <div role={tipo === "error" ? "alert" : "status"} className={cx("flex flex-col items-center text-center", compacto ? "gap-1.5 px-4 py-6" : "gap-2 px-6 py-12", className)}>
      <span className={cx("grid place-items-center rounded-lg border border-linea-suave bg-papel-2", compacto ? "size-9" : "size-11")} style={{ color: v.color }}>
        <I className={cx(compacto ? "size-4.5" : "size-5", tipo === "cargando" && "animate-spin")} strokeWidth={1.8} />
      </span>
      <p className={cx("font-semibold", compacto ? "text-[13px]" : "text-[14.5px]")}>{titulo ?? v.titulo}</p>
      {(texto ?? v.texto) && <p className={cx("max-w-[52ch] text-gris", compacto ? "text-[12px]" : "text-[13px]")}>{texto ?? v.texto}</p>}
      {accion && <div className="mt-1">{accion}</div>}
    </div>
  );
}
export function Vacio({ titulo, texto, accion }: { titulo: string; texto?: string; accion?: ReactNode }) {
  return <EstadoVista tipo="vacio" titulo={titulo} texto={texto} accion={accion} />;
}

export const Esqueleto = ({ className }: { className?: string }) => <div aria-hidden className={cx("destello rounded-md", className)} />;

export function ErrorCarga({ error, reintentar }: { error: unknown; reintentar?: () => void }) {
  const msg = error instanceof Error ? error.message : "No se pudo cargar la información.";
  const sinPermiso = /permiso|403|no es parte/i.test(msg);
  return <Tarjeta><EstadoVista tipo={sinPermiso ? "sin_permiso" : "error"} texto={sinPermiso ? undefined : msg} accion={reintentar && !sinPermiso ? <Boton tam="s" variante="contorno" onClick={reintentar}>Reintentar</Boton> : undefined} /></Tarjeta>;
}

export function Avatar({ nombre, tam = 32, className }: { nombre: string; tam?: number; className?: string }) {
  const ini = nombre.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  let h = 0; for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) % 360;
  return (
    <span className={cx("grid shrink-0 place-items-center rounded-md font-semibold text-white", className)}
      style={{ width: tam, height: tam, fontSize: tam * 0.38, background: `hsl(${h} 28% 34%)` }} aria-hidden>{ini}</span>
  );
}

export function Insignia({ n, tono = "acento", className }: { n: number; tono?: "acento" | "rojo" | "neutro"; className?: string }) {
  if (n <= 0) return null;
  return <span className={cx("num inline-grid h-[18px] min-w-[18px] place-items-center rounded px-1 text-[10.5px] font-bold leading-none", tono === "rojo" ? "bg-rojo text-white" : tono === "neutro" ? "bg-papel-2 text-gris" : "bg-acento text-sobre-negro", className)}>{n > 99 ? "99+" : n}</span>;
}

export function BarraProgreso({ valor, max = 1, color = "var(--s-acento)", alto = 6, etiqueta }: { valor: number; max?: number; color?: string; alto?: number; etiqueta?: string }) {
  const p = Math.max(0, Math.min(1, max ? valor / max : 0));
  return (
    <div role="progressbar" aria-valuenow={Math.round(p * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={etiqueta} className="w-full overflow-hidden rounded-full bg-papel-2" style={{ height: alto }}>
      <motion.div className="h-full rounded-full" style={{ background: color }} initial={false} animate={{ width: `${p * 100}%` }} transition={{ duration: TIEMPO.panel, ease: CURVA }} />
    </div>
  );
}

// ========================================================================================== números con movimiento
export function Cuenta({ valor, formato = (n: number) => Math.round(n).toLocaleString("es-CL"), duracion = 0.6, className }: { valor: number; formato?: (n: number) => string; duracion?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const visible = useInView(ref, { once: true });
  const reducir = useReducedMotion();
  const [v, setV] = useState(valor);
  const previo = useRef(valor);
  useEffect(() => {
    if (!visible || reducir) { setV(valor); previo.current = valor; return; }
    const c = animate(previo.current, valor, { duration: duracion, ease: CURVA, onUpdate: setV });
    previo.current = valor;
    return () => c.stop();
  }, [valor, visible, duracion, reducir]);
  return <span ref={ref} className={cx("num", className)}>{formato(v)}</span>;
}

export interface Parte { valor: number; color: string; etiqueta: string }
export function BarraSegmentada({ partes, alto = 8 }: { partes: Parte[]; alto?: number }) {
  const total = partes.reduce((a, p) => a + p.valor, 0) || 1;
  return (
    <div className="flex w-full gap-[2px] overflow-hidden rounded-sm bg-papel-2" style={{ height: alto }} role="img" aria-label={partes.map((p) => `${p.etiqueta}: ${p.valor}`).join(", ")}>
      {partes.filter((p) => p.valor > 0).map((p) => (
        <motion.div key={p.etiqueta} initial={{ width: 0 }} animate={{ width: `${(p.valor / total) * 100}%` }} transition={{ duration: TIEMPO.panel, ease: CURVA }} style={{ background: p.color }} title={`${p.etiqueta}: ${p.valor}`} />
      ))}
    </div>
  );
}

// ========================================================================================== pestañas
export function Pestanas<T extends string>({ items, activa, onCambio, id }: { items: { clave: T; titulo: string; n?: number }[]; activa: T; onCambio: (c: T) => void; id: string }) {
  return (
    <div role="tablist" className="flex max-w-full gap-1 overflow-x-auto border-b border-linea-suave">
      {items.map((it) => (
        <button key={it.clave} role="tab" aria-selected={activa === it.clave} onClick={() => onCambio(it.clave)}
          className={cx("relative cursor-pointer whitespace-nowrap px-3 pb-2 pt-1.5 text-[13px] font-semibold transition-colors duration-[140ms]", activa === it.clave ? "text-negro" : "text-gris hover:text-negro")}>
          {it.titulo}{it.n != null && <span className="num ml-1.5 text-[11.5px] text-gris">{it.n}</span>}
          {activa === it.clave && <motion.span layoutId={`pestana-${id}`} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-acento" transition={{ duration: TIEMPO.componente, ease: CURVA }} />}
        </button>
      ))}
    </div>
  );
}

// ========================================================================================== tabla profesional
export interface Columna<T> {
  clave: string; titulo: string; render: (f: T) => ReactNode; valor?: (f: T) => string | number | null | undefined;
  alinear?: "derecha"; ancho?: string; oculta?: boolean; fija?: boolean;
}
/**
 * Encabezado fijo, orden por columna, búsqueda, paginación, columnas configurables y selección múltiple. Las columnas
 * visibles y las acciones las decide cada pantalla según el cargo; la tabla solo presenta.
 */
export function Tabla<T>({ columnas, filas, clave, alHacerClic, cargando, vacio, maxAlto, buscar, porPagina, seleccion, accionesSeleccion, barra, densa }: {
  columnas: Columna<T>[]; filas: T[]; clave: (f: T) => string | number; alHacerClic?: (f: T) => void; cargando?: boolean; vacio?: ReactNode; maxAlto?: string;
  buscar?: (f: T) => string; porPagina?: number; seleccion?: { valor: Set<string | number>; cambiar: (s: Set<string | number>) => void }; accionesSeleccion?: ReactNode; barra?: ReactNode; densa?: boolean;
}) {
  const [orden, setOrden] = useState<{ clave: string; asc: boolean } | null>(null);
  const [texto, setTexto] = useState("");
  const [pagina, setPagina] = useState(0);
  const [ocultas, setOcultas] = useState<Set<string>>(() => new Set(columnas.filter((c) => c.oculta).map((c) => c.clave)));
  const [menuCols, setMenuCols] = useState(false);
  const filtradas = useMemo(() => (!buscar || !texto ? filas : filas.filter((f) => buscar(f).toLowerCase().includes(texto.toLowerCase()))), [filas, buscar, texto]);
  const ordenadas = useMemo(() => {
    const col = columnas.find((c) => c.clave === orden?.clave);
    if (!orden || !col?.valor) return filtradas;
    const v = col.valor;
    return [...filtradas].sort((a, b) => {
      const x = v(a), y = v(b);
      if (x == null) return 1;
      if (y == null) return -1;
      const r = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "es");
      return orden.asc ? r : -r;
    });
  }, [filtradas, orden, columnas]);
  useEffect(() => setPagina(0), [texto, filas.length]);
  const paginas = porPagina ? Math.max(1, Math.ceil(ordenadas.length / porPagina)) : 1;
  const visibles = porPagina ? ordenadas.slice(pagina * porPagina, (pagina + 1) * porPagina) : ordenadas;
  const cols = columnas.filter((c) => !ocultas.has(c.clave));
  const todosSel = !!seleccion && visibles.length > 0 && visibles.every((f) => seleccion.valor.has(clave(f)));
  const celda = densa ? "px-3 py-1.5" : "px-3 py-2.5";
  const conBarra = buscar || barra || columnas.length > 4 || (seleccion && seleccion.valor.size > 0);
  return (
    <div className="flex min-h-0 flex-col">
      {conBarra && (
        <div className="flex flex-wrap items-center gap-2 border-b border-linea-suave px-3 py-2">
          {buscar && (
            <label className="relative w-full max-w-[280px]">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gris" aria-hidden />
              <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar en la tabla" aria-label="Buscar en la tabla"
                className="h-8 w-full rounded-md border border-linea bg-chapa pl-8 pr-2 text-[13px] outline-none placeholder:text-apagado focus:border-acento" />
            </label>
          )}
          {barra}
          {seleccion && seleccion.valor.size > 0 && <span className="flex items-center gap-2 text-[12.5px] text-gris"><b className="num text-negro">{seleccion.valor.size}</b> seleccionados {accionesSeleccion}</span>}
          <span className="num ml-auto text-[12px] text-gris">{ordenadas.length} {ordenadas.length === 1 ? "registro" : "registros"}</span>
          {columnas.length > 4 && (
            <div className="relative">
              <Boton tam="s" variante="texto" onClick={() => setMenuCols(!menuCols)} aria-expanded={menuCols} title="Columnas"><Columns3 className="size-3.5" />Columnas</Boton>
              <AnimatePresence>
                {menuCols && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: TIEMPO.micro }}
                    className="absolute right-0 top-9 z-30 w-56 rounded-md border border-linea bg-papel p-1.5 shadow-[var(--s-sombra-flotante)]" onMouseLeave={() => setMenuCols(false)}>
                    {columnas.map((c) => (
                      <label key={c.clave} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[12.5px] hover:bg-papel-2">
                        <input type="checkbox" className="accent-[var(--s-acento)]" disabled={c.fija} checked={!ocultas.has(c.clave)} onChange={() => setOcultas((s) => { const n = new Set(s); if (n.has(c.clave)) n.delete(c.clave); else n.add(c.clave); return n; })} />
                        {c.titulo || c.clave}
                      </label>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
      <div className="min-h-0 overflow-auto" style={{ maxHeight: maxAlto }}>
        <table className="w-full border-separate border-spacing-0 text-left text-[13px]">
          <thead className="sticky top-0 z-10">
            <tr>
              {seleccion && (
                <th className="w-9 border-b border-linea bg-fondo-2 px-3">
                  <input type="checkbox" aria-label="Seleccionar todo" className="accent-[var(--s-acento)]" checked={todosSel}
                    onChange={() => { const n = new Set(seleccion.valor); visibles.forEach((f) => (todosSel ? n.delete(clave(f)) : n.add(clave(f)))); seleccion.cambiar(n); }} />
                </th>
              )}
              {cols.map((c) => (
                <th key={c.clave} style={{ width: c.ancho }} aria-sort={orden?.clave === c.clave ? (orden.asc ? "ascending" : "descending") : undefined}
                  className={cx("whitespace-nowrap border-b border-linea bg-fondo-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-[.05em] text-gris", c.alinear === "derecha" && "text-right")}>
                  {c.valor ? (
                    <button className="inline-flex cursor-pointer items-center gap-1 uppercase hover:text-negro" onClick={() => setOrden((o) => (o?.clave === c.clave ? { clave: c.clave, asc: !o.asc } : { clave: c.clave, asc: true }))}>
                      {c.titulo}{orden?.clave === c.clave && (orden.asc ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
                    </button>
                  ) : c.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cargando && Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>{seleccion && <td className="border-b border-linea-suave" />}{cols.map((c) => <td key={c.clave} className={cx("border-b border-linea-suave", celda)}><Esqueleto className="h-3.5 w-3/4" /></td>)}</tr>
            ))}
            {!cargando && visibles.map((f) => {
              const k = clave(f); const sel = seleccion?.valor.has(k);
              return (
                <tr key={k} onClick={alHacerClic ? () => alHacerClic(f) : undefined} tabIndex={alHacerClic ? 0 : undefined}
                  onKeyDown={alHacerClic ? (e) => e.key === "Enter" && alHacerClic(f) : undefined}
                  className={cx("transition-colors duration-[140ms]", sel && "bg-acento-claro", alHacerClic && "cursor-pointer hover:bg-papel-2 focus-visible:bg-papel-2")}>
                  {seleccion && (
                    <td className="border-b border-linea-suave px-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label="Seleccionar fila" className="accent-[var(--s-acento)]" checked={!!sel} onChange={() => { const n = new Set(seleccion.valor); if (sel) n.delete(k); else n.add(k); seleccion.cambiar(n); }} />
                    </td>
                  )}
                  {cols.map((c) => <td key={c.clave} className={cx("border-b border-linea-suave align-middle", celda, c.alinear === "derecha" && "num text-right")}>{c.render(f)}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!cargando && filas.length === 0 && (vacio ?? <EstadoVista tipo="vacio" />)}
        {!cargando && filas.length > 0 && ordenadas.length === 0 && <EstadoVista tipo="sin_resultados" compacto />}
      </div>
      {porPagina && paginas > 1 && (
        <div className="flex items-center justify-end gap-2 border-t border-linea-suave px-3 py-2 text-[12.5px] text-gris">
          <span className="num">Página {pagina + 1} de {paginas}</span>
          <Boton tam="s" variante="contorno" icono disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)} aria-label="Página anterior"><ChevronLeft className="size-4" /></Boton>
          <Boton tam="s" variante="contorno" icono disabled={pagina >= paginas - 1} onClick={() => setPagina((p) => p + 1)} aria-label="Página siguiente"><ChevronRight className="size-4" /></Boton>
        </div>
      )}
    </div>
  );
}

// ========================================================================================== ventanas
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
          <motion.div className="absolute inset-0 bg-[#05080c]/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: TIEMPO.componente }} onClick={onCerrar} />
          <motion.div role="dialog" aria-modal="true" className="relative flex max-h-[90vh] w-full flex-col rounded-lg border border-linea bg-papel shadow-[var(--s-sombra-flotante)]" style={{ maxWidth: ancho }}
            initial={{ opacity: 0, y: 8, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.99 }} transition={{ duration: TIEMPO.componente, ease: CURVA }}>
            <div className="flex items-center justify-between gap-4 border-b border-linea-suave px-5 py-3.5">
              <h2 className="text-[15px] font-semibold">{titulo}</h2>
              <Boton variante="texto" tam="s" icono aria-label="Cerrar" onClick={onCerrar}><X className="size-4" /></Boton>
            </div>
            <div className="overflow-auto px-5 py-4">{children}</div>
            {pie && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-linea-suave px-5 py-3">{pie}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Confirmación de una acción crítica (liberar un equipo, revocar un acceso, bloquear por seguridad). Puede exigir un
 * motivo, que queda en la auditoría.
 */
export function Confirmar({ abierto, titulo, texto, confirmar = "Confirmar", tono = "acento", motivo, cargando, onConfirmar, onCerrar }: {
  abierto: boolean; titulo: string; texto: ReactNode; confirmar?: string; tono?: "acento" | "peligro"; motivo?: { etiqueta: string; obligatorio?: boolean };
  cargando?: boolean; onConfirmar: (motivo: string) => void; onCerrar: () => void;
}) {
  const [m, setM] = useState("");
  useEffect(() => { if (abierto) setM(""); }, [abierto]);
  const falta = !!motivo?.obligatorio && m.trim().length < 4;
  return (
    <Dialogo abierto={abierto} onCerrar={onCerrar} titulo={titulo} ancho={480}
      pie={<><Boton variante="contorno" onClick={onCerrar}>Cancelar</Boton><Boton variante={tono} cargando={cargando} disabled={falta} onClick={() => onConfirmar(m.trim())}>{confirmar}</Boton></>}>
      <div className="flex gap-3">
        <span className={cx("mt-0.5 grid size-8 shrink-0 place-items-center rounded-md", tono === "peligro" ? "bg-rojo-claro text-rojo" : "bg-acento-claro text-acento")}>{tono === "peligro" ? <ShieldAlert className="size-4" /> : <Info className="size-4" />}</span>
        <div className="grid min-w-0 flex-1 gap-3 text-[13.5px] text-carbon">
          <div>{texto}</div>
          {motivo && <Campo etiqueta={motivo.etiqueta} obligatorio={motivo.obligatorio}><AreaTexto value={m} onChange={(e) => setM(e.target.value)} autoFocus /></Campo>}
        </div>
      </div>
    </Dialogo>
  );
}

export function Cajon({ abierto, onCerrar, titulo, children, ancho = 560 }: { abierto: boolean; onCerrar: () => void; titulo: ReactNode; children: ReactNode; ancho?: number }) {
  useEscape(abierto, onCerrar);
  return (
    <AnimatePresence>
      {abierto && (
        <div className="fixed inset-0 z-50">
          <motion.div className="absolute inset-0 bg-[#05080c]/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: TIEMPO.componente }} onClick={onCerrar} />
          <motion.aside role="dialog" aria-modal="true" className="absolute inset-y-0 right-0 flex w-full flex-col overflow-hidden border-l border-linea bg-papel shadow-[var(--s-sombra-flotante)]" style={{ maxWidth: ancho }}
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: TIEMPO.panel, ease: CURVA }}>
            <div className="flex items-center justify-between gap-4 border-b border-linea-suave px-5 py-3.5">
              <h2 className="text-[15px] font-semibold">{titulo}</h2>
              <Boton variante="texto" tam="s" icono aria-label="Cerrar" onClick={onCerrar}><X className="size-4" /></Boton>
            </div>
            <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-4">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

// ========================================================================================== avisos emergentes
type TonoAviso = "ok" | "error" | "aviso" | "info";
interface Aviso { id: number; texto: string; tono: TonoAviso }
const AvisosCtx = createContext<(texto: string, tono?: TonoAviso) => void>(() => {});
export const useAviso = () => useContext(AvisosCtx);
const ICONO_AVISO: Record<TonoAviso, LucideIcon> = { ok: CheckCircle2, error: XOctagon, aviso: AlertTriangle, info: Info };
const COLOR_AVISO: Record<TonoAviso, string> = { ok: "var(--s-verde)", error: "var(--s-rojo)", aviso: "var(--s-ambar)", info: "var(--s-info)" };

/** Confirmaciones breves. Lo importante (alarmas, aprobaciones) no depende de esto: queda en el centro de notificaciones. */
export function AvisosProvider({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Aviso[]>([]);
  const poner = useCallback((texto: string, tono: TonoAviso = "ok") => {
    const id = Date.now() + Math.random();
    setLista((l) => [...l.slice(-3), { id, texto, tono }]);
    setTimeout(() => setLista((l) => l.filter((x) => x.id !== id)), tono === "error" ? 7000 : 4200);
  }, []);
  return (
    <AvisosCtx.Provider value={poner}>
      {children}
      <div className="pointer-events-none fixed bottom-10 right-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        <AnimatePresence>
          {lista.map((a) => {
            const I = ICONO_AVISO[a.tono];
            return (
              <motion.div key={a.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: TIEMPO.componente, ease: CURVA }}
                className="pointer-events-auto flex items-start gap-2.5 overflow-hidden rounded-md border border-linea bg-papel px-3 py-2.5 shadow-[var(--s-sombra-flotante)]" style={{ borderLeft: `3px solid ${COLOR_AVISO[a.tono]}` }}>
                <I className="mt-0.5 size-4 shrink-0" style={{ color: COLOR_AVISO[a.tono] }} />
                <p className="flex-1 text-[13px]">{a.texto}</p>
                <button aria-label="Cerrar aviso" onClick={() => setLista((l) => l.filter((x) => x.id !== a.id))} className="cursor-pointer text-gris hover:text-negro"><X className="size-3.5" /></button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </AvisosCtx.Provider>
  );
}

export function mensajeDe(e: unknown) { return e instanceof Error ? e.message : "Ocurrió un error inesperado."; }

export function Dato({ etiqueta, children, className, mono }: { etiqueta: string; children: ReactNode; className?: string; mono?: boolean }) {
  return (
    <div className={className}>
      <dt className="t-etiqueta">{etiqueta}</dt>
      <dd className={cx("mt-0.5 break-words text-[13.5px] font-medium", mono && "t-dato")}>{children || <span className="text-apagado">—</span>}</dd>
    </div>
  );
}

// ========================================================================================== indicador (KPI)
/**
 * KPI con nombre, valor, unidad, meta, tendencia frente al período anterior, estado y hora de actualización. Si no hay
 * fuente de datos, dice «sin datos» en vez de mostrar un número de relleno. Los datos simulados llevan su distintivo.
 */
export function Kpi({ titulo, valor, formato, sufijo, unidad, detalle, tono = "acento", icono, grafico, meta, tendencia, mejor = "alto", actualizado, simulado, alHacerClic }: {
  titulo: string; valor: number | null; formato?: (n: number) => string; sufijo?: string; unidad?: string; detalle?: ReactNode; tono?: "acento" | "verde" | "ambar" | "rojo" | "azul" | "cobre" | "neutro";
  icono?: ReactNode; grafico?: ReactNode; delay?: number; meta?: string; tendencia?: number | null; mejor?: "alto" | "bajo"; actualizado?: string | Date | null; simulado?: boolean; alHacerClic?: () => void;
}) {
  const color = { acento: "var(--s-acento)", verde: "var(--s-verde)", ambar: "var(--s-ambar)", rojo: "var(--s-rojo)", azul: "var(--s-azul)", cobre: "var(--s-info)", neutro: "var(--s-tenue)" }[tono];
  const u = unidad ?? sufijo;
  const bueno = tendencia == null ? null : (tendencia >= 0) === (mejor === "alto");
  const Flecha = tendencia == null || Math.abs(tendencia) < 0.05 ? Minus : tendencia > 0 ? ArrowUpRight : ArrowDownRight;
  const hace = actualizado ? Math.max(0, Math.round((Date.now() - +new Date(actualizado)) / 60000)) : null;
  const Comp = alHacerClic ? "button" : "div";
  return (
    <Comp onClick={alHacerClic} className={cx("tarjeta group flex h-full w-full flex-col p-4 text-left", alHacerClic && "cursor-pointer transition-colors duration-[140ms] hover:border-linea")}>
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-sm" style={{ background: color }} aria-hidden />
        <p className="t-etiqueta flex-1 truncate">{titulo}</p>
        {simulado && <MarcaSimulado />}
        {icono && <span className="text-gris">{icono}</span>}
      </div>
      <p className="t-kpi mt-2">
        {valor == null ? <span className="text-[15px] font-medium text-apagado">Sin datos</span> : <Cuenta valor={valor} formato={formato} />}
        {u && valor != null && <span className="ml-1 text-[13px] font-medium text-gris">{u}</span>}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-gris">
        {tendencia != null && valor != null && <span className={cx("inline-flex items-center gap-0.5 font-semibold", bueno ? "text-verde" : bueno === false ? "text-rojo" : "")}><Flecha className="size-3.5" />{Math.abs(tendencia).toFixed(1)} %</span>}
        {meta && <span>Meta {meta}</span>}
        {detalle && <span className="min-w-0">{detalle}</span>}
      </div>
      {grafico && <div className="mt-3">{grafico}</div>}
      {(hace != null || alHacerClic) && (
        <div className="mt-auto flex items-center justify-between pt-3 text-[11px] text-apagado">
          {hace != null && <span>Actualizado {hace < 1 ? "recién" : `hace ${hace} min`}</span>}
          {alHacerClic && <ArrowRight className="size-3.5 text-gris transition-transform duration-[140ms] group-hover:translate-x-0.5" />}
        </div>
      )}
    </Comp>
  );
}

/** Fondo de pantallas de ingreso: rejilla técnica sutil, sin auroras. */
export function FondoAurora({ className }: { className?: string }) {
  return <div aria-hidden className={cx("rejilla pointer-events-none fixed inset-0 -z-10", className)} />;
}

