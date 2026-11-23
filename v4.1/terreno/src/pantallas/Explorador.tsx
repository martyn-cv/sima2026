import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle, ChevronRight, CircleSlash, Cpu, FileText, LayoutGrid, LockKeyhole, LockKeyholeOpen, Map as MapaIcono, Play, Rows3, ShieldAlert, Undo2, TriangleAlert, Wrench, X,
} from "lucide-react";
import type { Equipo, EquipoNodo, FichaEquipo, PlantaNodo } from "@sima/cliente";
import { Boton, Chip, Confirmar, CURVA, Esqueleto, EstadoEquipo, EstadoVista, MarcaSimulado, Maquina, Medidor, Pestanas, TIEMPO, cx, defEstado, mensajeDe, useAviso, type EstadoMaquina } from "@sima/ui";
import { api } from "../lib/api";
import { usePlanta } from "../lib/planta";
import { ir, useParametro } from "../ruta";
import { useAuth } from "../lib/auth";
import { tiene } from "../roles";
import { ORDEN_ESTADOS, rangoEstado } from "./bloques";

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
const hace = (iso: string) => { const m = Math.round((Date.now() - +new Date(iso)) / 60000); return m < 60 ? `hace ${Math.max(1, m)} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`; };
const ESTADO_PLC: Record<string, { t: string; c: string }> = { run: { t: "En marcha", c: "var(--s-verde)" }, stop: { t: "Detenido", c: "var(--s-ambar)" }, error: { t: "Falla de CPU", c: "var(--s-rojo)" }, sin_conexion: { t: "Sin conexión", c: "var(--s-detenido)" } };

// ================================================================================================ explorador
export function Explorador() {
  const { equipos, plcEstado } = usePlanta();
  const codigoParam = useParametro("equipo");
  const { data, isError, refetch } = useQuery({ queryKey: ["estructura"], queryFn: () => api.get<PlantaNodo[]>("/api/estructura"), refetchInterval: 30_000 });
  const planta = data?.[0];
  const [areaId, setAreaId] = useState<number | null>(null);
  const [lineaId, setLineaId] = useState<number | null>(null);
  const [vista, setVista] = useState<"mapa" | "tarjetas">(() => { try { return localStorage.getItem("sima.explorador.vista") === "tarjetas" ? "tarjetas" : "mapa"; } catch { return "mapa"; } });
  useEffect(() => { try { localStorage.setItem("sima.explorador.vista", vista); } catch { /* sin almacenamiento */ } }, [vista]);
  const vivo = useMemo(() => new Map(equipos.map((e) => [e.codigo, e])), [equipos]);
  const estadoDe = (c: string, base: string) => vivo.get(c)?.estado ?? base;

  // si se llega con ?equipo=XX, se abre su área y su línea
  useEffect(() => {
    if (!planta || !codigoParam) return;
    for (const a of planta.areas) for (const l of a.lineas) if (l.equipos.some((e) => e.codigo === codigoParam)) { setAreaId(a.id); setLineaId(l.id); }
  }, [planta, codigoParam]);
  useEffect(() => { if (planta && areaId == null) { const a = planta.areas.find((x) => x.lineas.some((l) => l.equipos.length)); if (a) setAreaId(a.id); } }, [planta, areaId]);

  if (isError) return <EstadoVista tipo="error" texto="No se pudo cargar la estructura de la planta." accion={<Boton variante="contorno" onClick={() => void refetch()}>Reintentar</Boton>} />;
  if (!planta) return <div className="grid grid-cols-[240px_1fr] gap-4"><Esqueleto className="h-[60vh]" /><Esqueleto className="h-[60vh]" /></div>;
  const area = planta.areas.find((a) => a.id === areaId);
  const linea = area?.lineas.find((l) => l.id === lineaId) ?? area?.lineas.find((l) => l.equipos.length);
  const todos = planta.areas.flatMap((a) => a.lineas.flatMap((l) => l.equipos));
  const conteo = ORDEN_ESTADOS.map((k) => [k, todos.filter((e) => defEstado(estadoDe(e.codigo, e.estado)) === defEstado(k)).length] as const).filter(([, n]) => n > 0);

  return (
    <div className="relative">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="t-pantalla">Explorador de planta</h1>
          <p className="mt-1 text-[13px] text-gris">{planta.nombre} · {planta.areas.length} áreas · {planta.areas.reduce((n, a) => n + a.lineas.length, 0)} líneas · {todos.length} equipos</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {conteo.map(([k, n]) => <span key={k} className="inline-flex items-center gap-1.5 rounded border border-linea-suave bg-papel px-2 py-1 text-[11.5px]"><EstadoEquipo estado={k} corto tam="s" /><b className="num">{n}</b></span>)}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[232px_minmax(0,1fr)]">
        {/* árbol de áreas y líneas */}
        <nav aria-label="Áreas y líneas" className="tarjeta h-fit p-2">
          {planta.areas.map((a) => {
            const eqs = a.lineas.flatMap((l) => l.equipos);
            const activa = a.id === area?.id;
            const criticos = eqs.filter((e) => defEstado(estadoDe(e.codigo, e.estado)).critico).length;
            return (
              <div key={a.id}>
                <button onClick={() => { setAreaId(a.id); setLineaId(null); }} aria-expanded={activa}
                  className={cx("flex w-full cursor-pointer items-center gap-2 rounded px-2 py-2 text-left transition-colors duration-[140ms]", activa ? "bg-papel-2" : "hover:bg-papel-2/60")}>
                  <ChevronRight className={cx("size-3.5 shrink-0 text-gris transition-transform duration-[140ms]", activa && "rotate-90")} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold">{a.nombre}</span><span className="block text-[11px] text-gris">{a.codigo} · {eqs.length} equipos</span></span>
                  {criticos > 0 && <span className="num rounded bg-rojo px-1.5 text-[10.5px] font-bold text-white" title="Equipos en falla o bloqueados">{criticos}</span>}
                </button>
                <AnimatePresence initial={false}>
                  {activa && (
                    <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: TIEMPO.componente, ease: CURVA }} className="ml-4 overflow-hidden border-l border-linea-suave pl-1.5">
                      {a.lineas.length === 0 && <li className="px-2 py-1.5 text-[12px] text-gris">Sin líneas de producción</li>}
                      {a.lineas.map((l) => {
                        const sel = l.id === linea?.id;
                        return (
                          <li key={l.id}>
                            <button onClick={() => setLineaId(l.id)} aria-current={sel ? "true" : undefined} className={cx("relative flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-[12.5px]", sel ? "font-semibold text-negro" : "text-gris hover:text-negro")}>
                              {sel && <motion.span layoutId="linea-activa" className="absolute inset-y-1 -left-[7px] w-[2px] rounded-full bg-acento" transition={{ duration: TIEMPO.componente, ease: CURVA }} />}
                              <Rows3 className="size-3.5 shrink-0" /><span className="min-w-0 flex-1 truncate">{l.nombre}</span>
                              <span className="flex gap-0.5">{l.equipos.map((e) => <i key={e.codigo} className="size-1.5 rounded-full" style={{ background: defEstado(estadoDe(e.codigo, e.estado)).color }} />)}</span>
                            </button>
                          </li>
                        );
                      })}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        <section className="min-w-0">
          {linea ? (
            <div className="tarjeta overflow-hidden">
              <header className="flex flex-wrap items-center gap-3 border-b border-linea-suave px-4 py-2.5">
                <div className="min-w-0 flex-1"><p className="t-seccion truncate">{linea.nombre}</p><p className="text-[11.5px] text-gris">{area?.nombre} · {linea.codigo} · {linea.equipos.length} equipos</p></div>
                <div role="radiogroup" aria-label="Vista" className="flex rounded-md border border-linea-suave p-0.5">
                  {([["mapa", "Mapa", MapaIcono], ["tarjetas", "Tarjetas", LayoutGrid]] as const).map(([k, t, I]) => (
                    <button key={k} role="radio" aria-checked={vista === k} onClick={() => setVista(k)} className={cx("inline-flex h-7 cursor-pointer items-center gap-1.5 rounded px-2.5 text-[12px] font-medium", vista === k ? "bg-papel-2 text-negro" : "text-gris hover:text-negro")}><I className="size-3.5" />{t}</button>
                  ))}
                </div>
              </header>
              {vista === "mapa"
                ? <MapaLinea equipos={linea.equipos} plcs={area?.plcs ?? []} vivo={vivo} plcEstado={plcEstado} seleccion={codigoParam} />
                : <TarjetasLinea equipos={linea.equipos} vivo={vivo} seleccion={codigoParam} />}
            </div>
          ) : <EstadoVista tipo="vacio" titulo="Elija una línea" texto="Seleccione un área y una línea para ver sus equipos." />}
        </section>
      </div>

      <AnimatePresence>{codigoParam && <DetalleMaquina key={codigoParam} codigo={codigoParam} />}</AnimatePresence>
    </div>
  );
}

// ================================================================================================ mapa SVG de la línea
/**
 * Vista técnica de la línea: controladores, red, máquinas con sus sensores y la cinta que las une. Distingue el origen de
 * cada dato (PLC físico en vivo, planta simulada o sin conexión). Es una vista de consulta: ningún elemento envía órdenes
 * a una máquina; las acciones se toman desde la ficha del equipo y las valida el servidor.
 */
function MapaLinea({ equipos, plcs, vivo, plcEstado, seleccion }: { equipos: EquipoNodo[]; plcs: { codigo: string; nombre: string; estado: string; origen: string }[]; vivo: Map<string, Equipo>; plcEstado: Record<string, string>; seleccion: string | null }) {
  const W = 196, H = 156, X0 = 32, Y0 = 118, CINTA = Y0 + H + 42;
  const ancho = Math.max(4, equipos.length) * W + X0 * 2;
  const alto = CINTA + 46;
  const plcsLinea = [...new Set(equipos.map((e) => e.plc).filter(Boolean))] as string[];
  const posPlc = (codigo: string) => { const idx = equipos.map((e, i) => (e.plc === codigo ? i : -1)).filter((i) => i >= 0); return X0 + ((idx[0] + idx[idx.length - 1]) / 2) * W + (W - 24) / 2; };
  const abrir = (c: string) => ir(`/explorador?equipo=${c}`);
  const tecla = (c: string) => (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(c); } };
  return (
    <div>
      <div className="rejilla overflow-x-auto bg-chapa">
        <svg viewBox={`0 0 ${ancho} ${alto}`} width={ancho} height={alto} className="block min-w-full" role="group" aria-label="Mapa de la línea">
          <defs>
            <pattern id="trama-sim" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="9" fill="var(--s-info)" opacity=".1" /></pattern>
            <marker id="flecha" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="var(--s-borde)" /></marker>
          </defs>

          {/* controladores y red */}
          {plcsLinea.map((codigo) => {
            const p = plcs.find((x) => x.codigo === codigo);
            const est = p?.estado === "sin_conexion" ? "sin_conexion" : plcEstado[codigo] ?? p?.estado ?? "sin_conexion";
            const cx0 = posPlc(codigo);
            const d = ESTADO_PLC[est] ?? ESTADO_PLC.sin_conexion;
            return (
              <g key={codigo}>
                {equipos.map((e, i) => e.plc === codigo && <path key={e.codigo} d={`M${cx0} 70 V92 H${X0 + i * W + (W - 24) / 2} V${Y0}`} fill="none" stroke={est === "sin_conexion" ? "var(--s-borde)" : "var(--s-tenue)"} strokeDasharray="3 4" strokeWidth="1.2" />)}
                <g transform={`translate(${cx0 - 70} 22)`}>
                  <rect width="140" height="48" rx="4" fill="var(--s-superficie)" stroke={est === "error" ? "var(--s-rojo)" : "var(--s-borde)"} />
                  {p?.origen !== "real" && <rect width="140" height="48" rx="4" fill="url(#trama-sim)" />}
                  <Cpu x={10} y={10} width={14} height={14} color="var(--s-tenue)" />
                  <text x="30" y="21" fontSize="12" fontWeight="600" fill="var(--s-texto)" fontFamily="var(--font-mono)">{codigo}</text>
                  <circle cx="16" cy="36" r="3.5" fill={d.c}><title>{d.t}</title></circle>
                  <text x="26" y="39.5" fontSize="10.5" fill="var(--s-tenue)">{d.t} · {p?.origen === "real" ? "PLC físico" : "simulado"}</text>
                </g>
              </g>
            );
          })}

          {/* cinta transportadora */}
          <path d={`M${X0 - 8} ${CINTA} H${X0 + equipos.length * W - 16}`} stroke="var(--s-borde)" strokeWidth="10" strokeLinecap="round" />
          {equipos.map((e, i) => {
            const marcha = defEstado(vivo.get(e.codigo)?.estado ?? e.estado).marcha;
            const x = X0 + i * W;
            return (
              <g key={`c${e.codigo}`}>
                <path d={`M${x + (W - 24) / 2} ${Y0 + H} V${CINTA - 8}`} stroke="var(--s-borde)" strokeWidth="1.5" />
                {i < equipos.length - 1 && <path d={`M${x + 4} ${CINTA} H${x + W - 4}`} stroke={marcha ? "var(--s-tenue)" : "var(--s-fondo-2)"} strokeWidth="2" strokeDasharray="6 6" className={marcha ? "animate-flujo" : undefined} markerEnd="url(#flecha)" />}
                {[0, 1, 2, 3].map((k) => <circle key={k} cx={x + 18 + k * 44} cy={CINTA} r="3" fill="var(--s-fondo)" stroke="var(--s-borde)" />)}
              </g>
            );
          })}

          {/* máquinas */}
          {equipos.map((e, i) => {
            const v = vivo.get(e.codigo);
            const estado = v?.estado ?? e.estado;
            const d = defEstado(estado);
            const x = X0 + i * W, w = W - 24;
            const sel = seleccion === e.codigo;
            const sensores = v?.sensores ?? [];
            const principal = sensores.find((s) => s.nivel !== "ok") ?? sensores[0];
            const plc = plcs.find((p) => p.codigo === e.plc);
            const sinDatos = !e.plc || plc?.estado === "sin_conexion" || (e.plc && plcEstado[e.plc] === "sin_conexion");
            return (
              <g key={e.codigo} role="button" tabIndex={0} aria-label={`${e.codigo} ${e.nombre}: ${d.etiqueta}${e.simulado ? ", simulado" : ""}`} onClick={() => abrir(e.codigo)} onKeyDown={tecla(e.codigo)} className="cursor-pointer outline-none [&:focus-visible>rect:first-child]:stroke-[var(--s-acento)] [&:hover>rect:first-child]:stroke-[var(--s-tenue)]">
                <rect x={x} y={Y0} width={w} height={H} rx="6" fill="var(--s-superficie)" stroke={sel ? "var(--s-acento)" : d.critico ? "var(--s-rojo)" : "var(--s-borde)"} strokeWidth={sel || d.critico ? 2 : 1} strokeDasharray={sinDatos ? "5 4" : undefined} />
                {e.simulado && <rect x={x} y={Y0} width={w} height={H} rx="6" fill="url(#trama-sim)" pointerEvents="none" />}
                <rect x={x} y={Y0} width="3" height={H} rx="1.5" fill={d.color} />
                <text x={x + 12} y={Y0 + 20} fontSize="12.5" fontWeight="700" fill="var(--s-texto)" fontFamily="var(--font-mono)">{e.codigo}</text>
                <text x={x + 12} y={Y0 + 35} fontSize="10.5" fill="var(--s-tenue)">{e.nombre.length > 24 ? e.nombre.slice(0, 23) + "…" : e.nombre}</text>
                {sensores.slice(0, 4).map((s, k) => (
                  <circle key={s.variable} cx={x + w - 12 - k * 11} cy={Y0 + 15} r="3.6" fill={s.ultimo == null ? "var(--s-borde)" : s.nivel === "alarma" ? "var(--s-rojo)" : s.nivel === "aviso" ? "var(--s-ambar)" : "var(--s-verde)"}>
                    <title>{`${s.nombre}: ${s.ultimo == null ? "sin dato" : `${s.ultimo.toFixed(1)} ${s.unidad}`}`}</title>
                  </circle>
                ))}
                <svg x={x + 22} y={Y0 + 42} width={w - 44} height="66" viewBox="0 0 120 76" overflow="visible"><Maquina tipo={e.tipo} estado={estado as EstadoMaquina} /></svg>
                <d.icono x={x + 12} y={Y0 + H - 25} width={14} height={14} color={d.color} />
                <text x={x + 31} y={Y0 + H - 14} fontSize="11" fontWeight="600" fill={d.color}>{d.corta}</text>
                <text x={x + w - 10} y={Y0 + H - 14} fontSize="11" textAnchor="end" fill={principal?.nivel === "alarma" ? "var(--s-rojo)" : principal?.nivel === "aviso" ? "var(--s-ambar)" : "var(--s-texto-2)"} fontFamily="var(--font-mono)">
                  {sinDatos ? "sin datos" : principal?.ultimo != null ? `${principal.ultimo.toFixed(principal.max > 50 ? 0 : 1)} ${principal.unidad}` : "—"}
                </text>
                {e.simulado && <g transform={`translate(${x + w - 34} ${Y0 + 28})`}><rect width="26" height="13" rx="2" fill="var(--s-info-claro)" stroke="var(--s-info)" strokeOpacity=".5" /><text x="13" y="9.5" fontSize="8.5" fontWeight="700" textAnchor="middle" fill="var(--s-info)">SIM</text></g>}
              </g>
            );
          })}
        </svg>
      </div>
      <footer className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-linea-suave px-4 py-2 text-[11.5px] text-gris">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm border border-linea bg-papel" />Dato en vivo de PLC físico</span>
        <span className="inline-flex items-center gap-1.5"><span className="trama-sim h-3 w-5 rounded-sm border border-info/40" />Planta simulada</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm border border-dashed border-gris" />Sin conexión: último dato conocido</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-verde" /><span className="size-2 rounded-full bg-ambar" /><span className="size-2 rounded-full bg-rojo" />Sensores: normal, aviso, alarma</span>
        <span className="ml-auto">Vista de consulta: no envía órdenes a las máquinas.</span>
      </footer>
    </div>
  );
}

function TarjetasLinea({ equipos, vivo, seleccion }: { equipos: EquipoNodo[]; vivo: Map<string, Equipo>; seleccion: string | null }) {
  const orden = [...equipos].sort((a, b) => rangoEstado(vivo.get(a.codigo)?.estado ?? a.estado) - rangoEstado(vivo.get(b.codigo)?.estado ?? b.estado));
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2 2xl:grid-cols-3">
      {orden.map((e) => {
        const v = vivo.get(e.codigo); const est = v?.estado ?? e.estado; const d = defEstado(est);
        const s = v?.sensores.find((x) => x.nivel !== "ok") ?? v?.sensores[0];
        return (
          <button key={e.codigo} onClick={() => ir(`/explorador?equipo=${e.codigo}`)}
            className={cx("relative cursor-pointer overflow-hidden rounded-md border bg-papel p-3.5 text-left transition-colors duration-[140ms]", seleccion === e.codigo ? "border-acento" : d.critico ? "border-rojo/60" : "border-linea-suave hover:border-linea", e.simulado && "trama-sim")}>
            <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: d.color }} />
            <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="t-dato font-bold">{e.codigo}</p><p className="truncate text-[12px] text-gris">{e.nombre}</p></div>{e.simulado && <MarcaSimulado />}</div>
            <Maquina tipo={e.tipo} estado={est as EstadoMaquina} className="my-2 h-20 w-full" />
            <div className="flex items-center justify-between gap-2 text-[12px]"><EstadoEquipo estado={est} corto tam="s" />{s && <span className={cx("t-dato", s.nivel === "alarma" && "text-rojo", s.nivel === "aviso" && "text-ambar")}>{s.ultimo?.toFixed(s.max > 50 ? 0 : 1) ?? "—"} {s.unidad}</span>}</div>
          </button>
        );
      })}
    </div>
  );
}

// ================================================================================================ ficha de la máquina
type Tab = "resumen" | "variables" | "plc" | "historial" | "fallas" | "mantenimiento" | "manuales" | "repuestos";
const TITULO_TAB: Record<Tab, string> = { resumen: "Ficha técnica", variables: "Variables", plc: "PLC", historial: "Historial", fallas: "Fallas", mantenimiento: "Mantenimiento", manuales: "Manuales", repuestos: "Repuestos" };
/**
 * Vista de la ficha según el trabajo de cada perfil: quien opera ve lo que necesita para operar con seguridad; mantenimiento
 * y automatización ven el detalle técnico. Es orden y foco de la información, no una medida de seguridad: lo que cada
 * persona puede consultar o hacer lo decide el servidor por su cargo.
 */
const VISTA_PERFIL: Record<string, Tab[]> = {
  operador: ["resumen", "variables", "manuales", "historial"],
  supervisor_turno: ["resumen", "variables", "historial", "fallas", "mantenimiento", "manuales"],
  ing_automatizacion: ["plc", "variables", "resumen", "historial", "fallas", "mantenimiento", "manuales"],
  instrumentacion: ["variables", "resumen", "plc", "mantenimiento", "manuales"],
  panol: ["repuestos", "resumen", "mantenimiento"],
  calidad_terreno: ["resumen", "variables", "historial", "fallas"],
  prevencion: ["resumen", "historial", "fallas", "manuales"],
};
const TODAS: Tab[] = ["resumen", "variables", "plc", "historial", "fallas", "mantenimiento", "manuales", "repuestos"];
const TECNICOS = new Set(["tecnico", "supervisor_mant", "jefe_mant", "confiabilidad", "ing_automatizacion", "instrumentacion", "panol"]);

type Accion = "bloquear" | "desbloquear" | "sacar" | "devolver" | "marcha";

function DetalleMaquina({ codigo }: { codigo: string }) {
  const { equipos, io } = usePlanta();
  const { usuario } = useAuth();
  const perfil = usuario?.perfil ?? "";
  const tabs = VISTA_PERFIL[perfil] ?? TODAS;
  const [tab, setTab] = useState<Tab>(tabs[0]);
  const [doc, setDoc] = useState<number | null>(null);
  const [accion, setAccion] = useState<Accion | null>(null);
  const { data, isError } = useQuery({ queryKey: ["equipo", codigo], queryFn: () => api.get<FichaEquipo>(`/api/equipos/${codigo}`), refetchInterval: 15_000 });
  const cerrar = () => ir("/explorador");
  useEffect(() => { const f = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape" && !accion) cerrar(); }; window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, [accion]);
  const vivo = equipos.find((e) => e.codigo === codigo);
  const estado = vivo?.estado ?? data?.equipo.estado ?? "liberado";
  const d = defEstado(estado);
  const ioPlc = data?.plc ? io[data.plc.codigo] ?? {} : {};
  const qc = useQueryClient(); const aviso = useAviso();
  const t = (c: string) => tiene(usuario, c);
  const otAbierta = data?.ordenes.find((o) => o.estado !== "cerrada");
  const sinLiberar = data?.ordenes.some((o) => o.estado === "en_curso" || o.estado === "por_verificar");
  // las acciones se ofrecen según el estado y el cargo; el servidor las vuelve a validar y deja auditoría con el motivo
  const puede: Record<Accion, boolean> = {
    marcha: ["produccion.registrar", "produccion.editar", "plc_comandos.editar", "equipos.confirmar_produccion"].some(t) && defEstado(estado) === defEstado("liberado") && !sinLiberar,
    bloquear: t("equipos.bloquear") && estado !== "bloqueado_seguridad",
    desbloquear: t("equipos.desbloquear") && estado === "bloqueado_seguridad",
    sacar: t("equipos.servicio") && !["fuera_servicio", "bloqueado_seguridad", "en_diagnostico", "en_mantenimiento", "en_pruebas", "pendiente_liberacion"].includes(estado),
    devolver: t("equipos.servicio") && estado === "fuera_servicio",
  };
  const ejecutar = useMutation({
    mutationFn: ({ a, motivo }: { a: Accion; motivo: string }) => a === "marcha" ? api.post<{ via: string }>(`/api/equipos/${codigo}/reanudar`)
      : api.post<{ via?: string }>(a === "sacar" || a === "devolver" ? `/api/equipos/${codigo}/servicio/${a}` : `/api/equipos/${codigo}/${a}`, { motivo }),
    onSuccess: (r, { a }) => {
      aviso(a === "marcha" ? (r.via === "plc" ? `Orden de marcha enviada al PLC de ${codigo}. El estado lo confirmará el propio PLC.` : `${codigo} en marcha (planta simulada).`)
        : a === "bloquear" ? `${codigo} quedó bloqueado por seguridad. Se avisó a prevención, producción y mantenimiento.` : a === "desbloquear" ? `Bloqueo de ${codigo} levantado.` : a === "sacar" ? `${codigo} quedó fuera de servicio.` : `${codigo} volvió al servicio: queda liberado para producción.`, "ok");
      setAccion(null);
      for (const k of ["equipos", "equipo", "estructura", "resumen"]) void qc.invalidateQueries({ queryKey: [k] });
    },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  const CONFIRMAR: Record<Accion, { titulo: string; texto: ReactNode; boton: string; tono: "acento" | "peligro"; motivo?: string }> = {
    marcha: { titulo: `Poner en marcha ${codigo}`, texto: data?.plc?.origen === "real" ? "Se enviará la orden de marcha al PLC. El estado cambiará cuando el PLC lo confirme." : "El equipo es de la planta simulada: el cambio queda marcado como simulado.", boton: "Poner en marcha", tono: "acento" },
    bloquear: { titulo: `Bloquear ${codigo} por seguridad`, texto: "El equipo no podrá ponerse en marcha hasta que prevención de riesgos levante el bloqueo. Se avisa de inmediato a prevención, producción y mantenimiento.", boton: "Bloquear equipo", tono: "peligro", motivo: "Condición insegura observada" },
    desbloquear: { titulo: `Levantar el bloqueo de ${codigo}`, texto: "Si el equipo tiene una orden de trabajo sin liberar, vuelve a mantenimiento; si no, queda liberado para producción.", boton: "Levantar bloqueo", tono: "acento", motivo: "Cómo se controló la condición" },
    sacar: { titulo: `Sacar ${codigo} de servicio`, texto: "El equipo deja de estar disponible para producción hasta que se devuelva al servicio.", boton: "Sacar de servicio", tono: "peligro", motivo: "Motivo" },
    devolver: { titulo: `Devolver ${codigo} al servicio`, texto: "El equipo queda liberado para producción; producción decide cuándo ponerlo en marcha.", boton: "Devolver al servicio", tono: "acento", motivo: "Motivo" },
  };
  const c = accion ? CONFIRMAR[accion] : null;

  return (
    <>
      <motion.div className="fixed inset-0 z-30 bg-[#05080c]/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: TIEMPO.componente }} onClick={cerrar} />
      <motion.aside initial={{ x: 32, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 32, opacity: 0 }} transition={{ duration: TIEMPO.panel, ease: CURVA }}
        className="fixed bottom-6 right-0 top-12 z-40 flex w-[min(780px,94vw)] flex-col border-l border-linea bg-fondo-2 shadow-[var(--s-sombra-flotante)]" role="dialog" aria-modal="true" aria-label={`Equipo ${codigo}`}>
        {isError ? <EstadoVista tipo="error" texto={`No se pudo cargar la ficha de ${codigo}.`} accion={<Boton variante="contorno" onClick={cerrar}>Cerrar</Boton>} /> : !data ? <div className="p-6"><Esqueleto className="h-40" /><Esqueleto className="mt-4 h-72" /></div> : (
          <>
            <div className="relative border-b border-linea-suave px-5 pb-4 pt-4">
              <span className="absolute inset-x-0 top-0 h-[2px]" style={{ background: d.color }} aria-hidden />
              <button onClick={cerrar} aria-label="Cerrar ficha" className="absolute right-3 top-3 grid size-8 cursor-pointer place-items-center rounded-md text-gris hover:bg-papel hover:text-negro"><X className="size-4" /></button>
              <p className="mb-2.5 flex flex-wrap items-center gap-1 text-[11.5px] text-gris">{data.jerarquia.planta}<ChevronRight className="size-3" />{data.jerarquia.area.nombre}<ChevronRight className="size-3" />{data.jerarquia.linea.nombre}</p>
              <div className="flex items-center gap-4">
                <div className={cx("grid h-24 w-36 shrink-0 place-items-center rounded-md border border-linea-suave bg-chapa", data.equipo.simulado && "trama-sim")}><Maquina tipo={data.equipo.tipo} estado={estado as EstadoMaquina} className="h-20 w-32" /></div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="font-mono text-[22px] font-bold leading-none">{data.equipo.codigo}</h2><EstadoEquipo estado={estado} />{data.equipo.simulado && <MarcaSimulado texto="Equipo simulado" />}</div>
                  <p className="mt-1 text-[14px] font-medium">{data.equipo.nombre}</p>
                  <p className="text-[12.5px] text-gris">{data.equipo.tipo} · {data.equipo.marca} {data.equipo.modelo} · {data.equipo.ubicacion} · criticidad {data.equipo.criticidad}</p>
                </div>
              </div>
              <div className="mt-3.5 flex flex-wrap gap-2">
                {t("ordenes.crear") && <Boton tam="s" variante="contorno" onClick={() => ir(`/reportar?equipo=${codigo}`)}><TriangleAlert className="size-3.5 text-ambar" />Reportar falla</Boton>}
                {otAbierta && <Boton tam="s" variante="secundario" onClick={() => ir(`/mantenimiento?orden=${otAbierta.id}`)}><Wrench className="size-3.5" />{otAbierta.codigo} · {otAbierta.estado === "por_verificar" ? "por liberar" : "abierta"}</Boton>}
                {puede.marcha && <Boton tam="s" variante="acento" onClick={() => setAccion("marcha")}><Play className="size-3.5" />Poner en marcha</Boton>}
                {puede.bloquear && <Boton tam="s" variante="contorno" className="text-rojo" onClick={() => setAccion("bloquear")}><LockKeyhole className="size-3.5" />Bloquear por seguridad</Boton>}
                {puede.desbloquear && <Boton tam="s" variante="contorno" onClick={() => setAccion("desbloquear")}><LockKeyholeOpen className="size-3.5" />Levantar bloqueo</Boton>}
                {puede.sacar && <Boton tam="s" variante="texto" onClick={() => setAccion("sacar")}><CircleSlash className="size-3.5" />Sacar de servicio</Boton>}
                {puede.devolver && <Boton tam="s" variante="contorno" onClick={() => setAccion("devolver")}><Undo2 className="size-3.5" />Devolver al servicio</Boton>}
              </div>
              {estado === "liberado" && sinLiberar && <p className="mt-2 text-[12px] text-ambar">Hay una orden de trabajo sin liberar: la marcha se habilita cuando terminen las firmas de liberación.</p>}
              {data.indicadores && (
                <div className="mt-4 grid grid-cols-4 gap-px overflow-hidden rounded-md border border-linea-suave bg-linea-suave">
                  {[["Disponibilidad", `${(data.indicadores.disponibilidad * 100).toFixed(1)}`, "%"], ["OEE", `${(data.indicadores.oee * 100).toFixed(1)}`, "%"], ["MTTR", data.indicadores.mttrHoras.toFixed(1), "h"], ["Fallas 30 d", String(data.indicadores.fallas), ""]].map(([n, v, u]) => (
                    <div key={n} className="bg-papel px-3 py-2"><p className="t-etiqueta">{n}</p><p className="font-display text-[18px] font-semibold num">{v}<span className="ml-0.5 text-[11.5px] text-gris">{u}</span></p></div>
                  ))}
                </div>
              )}
              {data.indicadores && data.equipo.simulado && <p className="mt-1.5 text-[11px] text-info">Indicadores calculados con datos de la planta simulada.</p>}
            </div>
            <div className="px-5 pt-2"><Pestanas id="maquina" items={tabs.map((k) => ({ clave: k, titulo: TITULO_TAB[k], n: k === "fallas" ? data.alarmas.filter((a) => !a.fin).length || undefined : undefined }))} activa={tab} onCambio={setTab} /></div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <AnimatePresence mode="wait">
                <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: TIEMPO.micro }}>
                  {tab === "resumen" && <FichaTecnica data={data} tecnico={TECNICOS.has(perfil)} />}
                  {tab === "variables" && (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {(vivo?.sensores ?? data.sensores).map((s) => (
                        <div key={s.variable} className="flex flex-col items-center rounded-md border border-linea-suave bg-papel p-3">
                          <Medidor valor={s.ultimo} min={s.min} max={s.max} aviso={s.aviso} alarma={s.alarma} unidad={s.unidad} etiqueta={s.nombre} tam={140} />
                          <p className="text-center text-[12.5px] font-medium">{s.nombre}</p><p className="text-[11px] text-gris">aviso {s.aviso} · alarma {s.alarma} {s.unidad}</p>
                        </div>
                      ))}
                      {(vivo?.sensores ?? data.sensores).length === 0 && <p className="col-span-full py-8 text-center text-[13px] text-gris">Este equipo no tiene variables medidas.</p>}
                    </div>
                  )}
                  {tab === "plc" && (data.plc ? (
                    <div>
                      <div className="mb-3 flex items-center justify-between gap-3"><div><p className="font-semibold">{data.plc.codigo} · {data.plc.nombre}</p><p className="text-[12px] text-gris">{data.plc.fabricante} {data.plc.modelo} · <span className="t-dato">{data.plc.direccion}</span> · {data.plc.origen === "real" ? "PLC físico" : "PLC simulado"}</p></div>
                        <Chip tono={data.plc.estado === "run" ? "ok" : data.plc.estado === "error" ? "peligro" : "neutro"}>{ESTADO_PLC[data.plc.estado]?.t ?? data.plc.estado}</Chip></div>
                      <table className="w-full text-[12.5px]">
                        <thead><tr className="t-etiqueta text-left"><th className="py-1.5 pr-2 font-semibold">Tipo</th><th className="pr-2 font-semibold">Dirección</th><th className="pr-2 font-semibold">Tag</th><th className="font-semibold">Descripción</th><th className="text-right font-semibold">Valor</th></tr></thead>
                        <tbody>
                          {data.plc.puntos.map((p) => {
                            const v = ioPlc[p.tag]; const dig = p.tipo === "DI" || p.tipo === "DO"; const on = dig && (v ?? 0) > 0;
                            return (
                              <tr key={p.tag} className="border-t border-linea-suave">
                                <td className="py-1.5 pr-2"><span className={cx("inline-grid h-5 w-8 place-items-center rounded text-[10px] font-bold", p.tipo === "DI" ? "bg-verde-claro text-verde" : p.tipo === "DO" ? "bg-ambar-claro text-ambar" : "bg-azul-claro text-azul")}>{p.tipo}</span></td>
                                <td className="t-dato pr-2 text-gris">{p.direccion}</td><td className="t-dato pr-2">{p.tag}</td><td className="text-gris">{p.descripcion}</td>
                                <td className="text-right">{dig ? <span className="inline-flex items-center gap-1.5 text-[11.5px]"><i className={cx("size-2.5 rounded-full", on ? (p.tipo === "DI" ? "bg-verde" : "bg-ambar") : "bg-linea")} />{on ? "1" : "0"}</span> : <span className="t-dato font-semibold">{v == null ? "—" : v.toFixed(1)} {p.unidad}</span>}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : <EstadoVista tipo="vacio" compacto titulo="Sin PLC" texto="Este equipo no está conectado a un controlador." />)}
                  {tab === "historial" && (
                    <ol className="relative ml-2 border-l border-linea pl-5">
                      {data.historial.length === 0 && <li className="py-6 text-[13px] text-gris">Sin cambios de estado registrados todavía.</li>}
                      {data.historial.map((h, i) => { const dh = defEstado(h.hasta); return (
                        <li key={i} className="relative pb-4"><span className="absolute -left-[27px] top-1 grid size-3.5 place-items-center rounded-full bg-fondo-2 ring-2" style={{ ["--tw-ring-color" as string]: dh.color }} />
                          <p className="text-[13px]"><span className="text-gris">{defEstado(h.desde).etiqueta}</span> → <b style={{ color: dh.color }}>{dh.etiqueta}</b> {h.simulado && <MarcaSimulado className="ml-1" />}</p>
                          <p className="text-[12px] text-gris">{h.por ? <><b className="font-medium text-carbon">{h.por}</b>{h.cargo ? ` · ${h.cargo}` : ""} · </> : <>{h.origen === "plc" || h.origen === "simulador" ? "Informado por el PLC" : "Sistema"} · </>}{h.origen === "desktop" ? "SIMA Desktop" : h.origen === "web" ? "SIMA Web" : h.origen} · {new Date(h.ts).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                          {h.causa && <p className="text-[12px] text-carbon">{h.causa}</p>}</li>
                      ); })}
                    </ol>
                  )}
                  {tab === "fallas" && (
                    <ul className="grid gap-2">
                      {data.alarmas.length === 0 && <li className="py-6 text-center text-[13px] text-gris">Sin fallas registradas.</li>}
                      {data.alarmas.map((a) => <li key={a.id} className="flex items-center gap-3 rounded-md border border-linea-suave bg-papel px-3.5 py-2.5">{a.nivel === "alarma" ? <ShieldAlert className="size-4 shrink-0 text-rojo" /> : <AlertTriangle className="size-4 shrink-0 text-ambar" />}<span className="flex-1 text-[13px]">{a.mensaje}<span className="block text-[11.5px] text-gris">{hace(a.inicio)}{a.fin ? " · resuelta" : " · abierta"}{a.reconocidaPor ? ` · reconoció ${a.reconocidaPor}` : ""}</span></span>{a.simulado && <MarcaSimulado />}</li>)}
                    </ul>
                  )}
                  {tab === "mantenimiento" && (
                    <div className="grid gap-3">
                      {data.intervenciones.length === 0 && <p className="py-6 text-center text-[13px] text-gris">Sin intervenciones registradas.</p>}
                      {data.intervenciones.map((i) => (
                        <div key={i.id} className="rounded-md border border-linea-suave bg-papel p-3.5"><div className="flex items-center justify-between gap-2"><p className="text-[13.5px] font-semibold">{i.accion}</p><Chip tono={i.resultado === "resuelto" ? "ok" : "aviso"} punto={false}>{i.resultado.replace("_", " ")}</Chip></div>
                          <p className="mt-1 text-[12px] text-gris">{i.orden} · {i.causa} · {i.tecnicoNombre} · {i.horas.toFixed(1)} h · {fecha(i.fin)}</p><p className="mt-1.5 text-[13px]">{i.diagnostico}</p>
                          {i.repuestos.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{i.repuestos.map((r) => <Chip key={r.codigo} punto={false} tono="info">{r.cantidad} × {r.nombre}</Chip>)}</div>}</div>
                      ))}
                    </div>
                  )}
                  {tab === "manuales" && (
                    <ul className="grid gap-2">
                      {data.documentos.length === 0 && <li className="py-6 text-center text-[13px] text-gris">Sin documentos para este equipo.</li>}
                      {data.documentos.map((dd) => (
                        <li key={dd.id} className="overflow-hidden rounded-md border border-linea-suave bg-papel">
                          <button onClick={() => setDoc(doc === dd.id ? null : dd.id)} aria-expanded={doc === dd.id} className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left hover:bg-papel-2">
                            {dd.clase === "seguridad" ? <ShieldAlert className="size-4 text-rojo" /> : <FileText className="size-4 text-gris" />}
                            <span className="flex-1"><span className="block text-[13px] font-medium">{dd.titulo}</span><span className="text-[11.5px] text-gris">{dd.clase} · versión {dd.version}</span></span><ChevronRight className={cx("size-4 text-gris transition-transform duration-[140ms]", doc === dd.id && "rotate-90")} />
                          </button>
                          <AnimatePresence>{doc === dd.id && <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: TIEMPO.componente }} className="overflow-hidden"><ol className="seleccionable grid gap-1.5 border-t border-linea-suave bg-chapa px-4 py-3 text-[13px]">{dd.contenido.split("\n").map((l, k) => <li key={k} className="leading-relaxed">{l}</li>)}</ol></motion.div>}</AnimatePresence>
                        </li>
                      ))}
                    </ul>
                  )}
                  {tab === "repuestos" && (
                    <ul className="grid gap-2">
                      {data.repuestos.length === 0 && <li className="py-6 text-center text-[13px] text-gris">Sin repuestos asociados.</li>}
                      {data.repuestos.map((r) => (
                        <li key={r.id} className="rounded-md border border-linea-suave bg-papel px-3.5 py-2.5"><div className="flex items-center justify-between gap-2"><span className="min-w-0"><b className="t-dato">{r.codigo}</b> <span className="text-[13px]">{r.nombre}</span>{r.critico && <span className="ml-1.5 rounded bg-rojo-claro px-1.5 text-[10.5px] font-bold text-rojo">CRÍTICO</span>}</span><span className={cx("num shrink-0 font-semibold", r.stock <= r.stockMinimo && "text-rojo")}>{r.stock} en stock</span></div>
                          <p className="text-[11.5px] text-gris">{r.ubicacion} · mínimo {r.stockMinimo} · se usa {r.sugerida} por intervención</p></li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
      </motion.aside>
      {c && accion && (
        <Confirmar abierto titulo={c.titulo} texto={c.texto} confirmar={c.boton} tono={c.tono} cargando={ejecutar.isPending}
          motivo={c.motivo ? { etiqueta: c.motivo, obligatorio: true } : undefined} onCerrar={() => setAccion(null)} onConfirmar={(motivo) => ejecutar.mutate({ a: accion, motivo })} />
      )}
    </>
  );
}

function Fila({ t, v, mono }: { t: string; v: ReactNode; mono?: boolean }) {
  return <div className="grid grid-cols-[150px_1fr] gap-3 border-t border-linea-suave py-1.5 text-[12.5px] first:border-t-0"><dt className="text-gris">{t}</dt><dd className={cx("min-w-0", mono && "t-dato")}>{v || <span className="text-apagado">Sin dato</span>}</dd></div>;
}

/** Ficha técnica: lo operativo para todos; especificaciones y componentes para los perfiles técnicos. */
function FichaTecnica({ data, tecnico }: { data: FichaEquipo; tecnico: boolean }) {
  const f = data.ficha;
  if (!f) return <EstadoVista tipo="vacio" compacto titulo="Sin ficha técnica" texto="Este equipo aún no tiene ficha técnica registrada." />;
  return (
    <div className="grid gap-4">
      {f.demo && <p className="flex items-center gap-2 rounded-md border border-info/30 bg-info-claro px-3 py-2 text-[12px] text-info"><MarcaSimulado texto="Ficha de demostración" />Datos técnicos de ejemplo para la planta de demostración; no corresponden a un equipo real.</p>}
      <section className="rounded-md border border-linea-suave bg-papel p-3.5">
        <p className="t-etiqueta mb-1.5">Operación</p>
        <dl>
          <Fila t="Responsable de mantenimiento" v={f.responsableMant} />
          <Fila t="Responsable de producción" v={f.responsableProd} />
          <Fila t="Horas de funcionamiento" v={f.horasFuncionamiento ? `${f.horasFuncionamiento.toLocaleString("es-CL")} h` : null} mono />
          <Fila t="Próxima preventiva" v={f.proximaPreventiva ? <button className="cursor-pointer text-acento hover:underline" onClick={() => ir(`/mantenimiento?orden=${f.proximaPreventiva!.id}`)}>{f.proximaPreventiva.codigo} · {new Date(f.proximaPreventiva.programada + "T12:00").toLocaleDateString("es-CL")}</button> : "Sin preventiva programada"} />
        </dl>
      </section>
      {tecnico && (
        <>
          <section className="rounded-md border border-linea-suave bg-papel p-3.5">
            <p className="t-etiqueta mb-1.5">Identificación y especificaciones</p>
            <dl>
              <Fila t="Fabricante" v={f.fabricante} />
              <Fila t="Número de serie" v={f.numeroSerie} mono />
              <Fila t="Instalación" v={f.fechaInstalacion ? new Date(f.fechaInstalacion + (f.fechaInstalacion.length === 10 ? "T12:00" : "")).toLocaleDateString("es-CL") : null} />
              <Fila t="Especificación eléctrica" v={f.especElectrica} />
              <Fila t="Especificación mecánica" v={f.especMecanica} />
            </dl>
          </section>
          <section className="rounded-md border border-linea-suave bg-papel">
            <p className="t-etiqueta px-3.5 pb-1.5 pt-3">Componentes · {data.componentes?.length ?? 0}</p>
            {(data.componentes ?? []).length === 0 ? <p className="px-3.5 pb-3 text-[12.5px] text-gris">Sin componentes registrados.</p> : (
              <table className="w-full text-[12.5px]">
                <thead><tr className="t-etiqueta text-left"><th className="px-3.5 py-1.5 font-semibold">Tipo</th><th className="font-semibold">Código</th><th className="font-semibold">Componente</th><th className="pr-3.5 font-semibold">Especificación</th></tr></thead>
                <tbody>{data.componentes!.map((k) => <tr key={k.id} className="border-t border-linea-suave align-top"><td className="px-3.5 py-1.5 text-gris">{k.tipo}</td><td className="t-dato pr-2">{k.codigo}</td><td className="pr-2">{k.nombre}<span className="block text-[11px] text-gris">{k.marca} {k.modelo}</span></td><td className="pr-3.5 text-gris">{k.especificacion}</td></tr>)}</tbody>
              </table>
            )}
          </section>
        </>
      )}
      {!tecnico && <p className="text-[12px] text-gris">Las especificaciones técnicas y los componentes los consulta mantenimiento. Ante cualquier anomalía, use «Reportar falla».</p>}
    </div>
  );
}

