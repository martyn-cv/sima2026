import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle, CheckCircle2, ChevronRight, CircleDot, Clock, Cog, Cpu, Factory, FlaskConical, KeyRound, Layers, ListChecks, Play, RefreshCw, RotateCcw, Rows3, Save, Search, Trash2, Wrench, XCircle, Zap,
} from "lucide-react";
import { AvisosProvider, Boton, Confirmar, EstadoEquipo, EstadoVista, Esqueleto, MarcaSimulado, Pestanas, cx, defEstado, useAviso } from "@sima/ui";
import { lab } from "../lab/motor";

// ------------------------------------------------------------------------------------------------ tipos de la API de control
interface Causa { clave: string; texto: string; componente: string; acciones: string[]; repuesto?: string | null }
interface TipoFalla { clave: string; titulo: string; grupo: string; sintomas: string; especialidad: string; criticidad: string; impacto: string; estadoEquipo: string; variables: { patron: string; efecto: string }[]; causas: Causa[] }
interface Catalogo { tipos: TipoFalla[]; acciones: Record<string, string>; componentes: Record<string, string> }
interface Sensor { variable: string; nombre: string; unidad: string; ultimo: number | null; nominal: number; aviso: number; alarma: number; min: number; max: number }
interface Componente { id: number; tipo: string; codigo: string; nombre: string; especificacion: string }
interface EquipoSim { id: number; codigo: string; nombre: string; tipo: string; estado: string; criticidad: string; marca: string; modelo: string; plc: null | { codigo: string; estado: string; origen: string; versionPrograma: number; fabricante: string; modelo: string; ultimoContacto?: string | null }; sensores: Sensor[]; componentes: Componente[]; fallas: { id: number; codigo: string; tipo: string; estadoFisico: string; severidad: number }[]; ordenes: { codigo: string; estado: string }[] }
interface PlantaSim { planta: string; areas: { id: number; codigo: string; nombre: string; lineas: { id: number; codigo: string; nombre: string; equipos: EquipoSim[] }[] }[] }
interface Evaluacion { fecha: string; tecnicoNombre: string; componente: string; accion: string; repuestos: string; diagnostico: string; componenteCorrecto: boolean; accionCorrecta: boolean; repuestoCorrecto: boolean; resuelve: boolean; motivo: string }
interface FallaSim {
  id: number; codigo: string; equipo: { codigo: string; nombre: string; estado: string }; componente?: string | null; tipo: string; titulo: string; causa: string; sintomas: string; criticidad: string; modo: string; estadoFisico: string; severidad: number;
  creada: string; inicioProgramado?: string | null; inicio?: string | null; fin?: string | null; impacto: string; especialidad: string; acciones: string[]; repuesto?: string | null; intentosFallidos: number; escenario?: string | null;
  orden: null | { id: number; codigo: string; estado: string; asignado?: string | null; creada: string; cierreSolicitado?: string | null; cerrada?: string | null };
  tiempos: { aIncidencia: number | null; aToma: number | null; aReparacion: number | null; aLiberacion: number | null }; evaluaciones: Evaluacion[];
}
interface Escenario { id: number; nombre: string; descripcion: string; ejecuciones: number; fallas: unknown[] }

const ESTADO_FISICO: Record<string, { t: string; c: string }> = {
  programada: { t: "Programada", c: "var(--s-info)" }, activa: { t: "Activa", c: "var(--s-rojo)" }, latente: { t: "Latente (intermitente)", c: "var(--s-ambar)" },
  resuelta: { t: "Resuelta en la máquina", c: "var(--s-verde)" }, cancelada: { t: "Cancelada", c: "var(--s-detenido)" },
};
const ESTADO_OT: Record<string, string> = { abierta: "Incidencia sin tomar", en_curso: "En ejecución", por_verificar: "Pendiente de liberación", cerrada: "Cerrada" };
const ESPECIALIDAD: Record<string, string> = { mecanica: "Mecánica", electrica: "Eléctrica", electromecanica: "Electromecánica", instrumentacion: "Instrumentación", automatizacion: "Automatización", general: "General" };
const min = (m: number | null) => (m == null ? "—" : m < 60 ? `${m.toFixed(m < 10 ? 1 : 0)} min` : `${(m / 60).toFixed(1)} h`);

// ------------------------------------------------------------------------------------------------ acceso a la API de control
async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), 8000);
  try {
    const r = await fetch(`${lab.cfg.url}${ruta}`, { method: metodo, signal: c.signal, headers: { "content-type": "application/json", "X-API-Key": lab.cfg.clave }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
    const j = r.headers.get("content-type")?.includes("json") ? await r.json() : null;
    if (!r.ok) throw Object.assign(new Error(j?.error ?? `El servidor respondió ${r.status}`), { status: r.status });
    return j as T;
  } finally { clearTimeout(t); }
}

/** Sondeo del estado persistente del servidor (planta, fallas y escenarios): lo mismo que ven SIMA Desktop y SIMA Web. */
function useServidor() {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [planta, setPlanta] = useState<PlantaSim | null>(null);
  const [fallas, setFallas] = useState<FallaSim[]>([]);
  const [escenarios, setEscenarios] = useState<Escenario[]>([]);
  const [error, setError] = useState<{ texto: string; status?: number } | null>(null);
  const [vuelta, setVuelta] = useState(0);
  const recargar = () => setVuelta((v) => v + 1);
  useEffect(() => {
    let vivo = true;
    const traer = async () => {
      try {
        const [c, p, f, e] = await Promise.all([catalogo ? Promise.resolve(catalogo) : pedir<Catalogo>("GET", "/api/ingesta/simulacion/catalogo"), pedir<PlantaSim[]>("GET", "/api/ingesta/simulacion/planta"), pedir<FallaSim[]>("GET", "/api/ingesta/simulacion/fallas"), pedir<Escenario[]>("GET", "/api/ingesta/simulacion/escenarios")]);
        if (!vivo) return;
        setCatalogo(c); setPlanta(p[0] ?? null); setFallas(f); setEscenarios(e); setError(null);
      } catch (x) { if (vivo) setError({ texto: (x as Error).message, status: (x as { status?: number }).status }); }
    };
    void traer();
    const t = setInterval(traer, 3000);
    return () => { vivo = false; clearInterval(t); };
  }, [vuelta]); // eslint-disable-line react-hooks/exhaustive-deps
  return { catalogo, planta, fallas, escenarios, error, recargar };
}

// ================================================================================================ espacio de control
export function Control() { return <AvisosProvider><ControlInterno /></AvisosProvider>; }

function ControlInterno() {
  const { catalogo, planta, fallas, escenarios, error, recargar } = useServidor();
  const [sel, setSel] = useState<string | null>(() => { try { return localStorage.getItem("sima.control.equipo"); } catch { return null; } });
  const [componente, setComponente] = useState<number | null>(null);
  const equipos = useMemo(() => planta?.areas.flatMap((a) => a.lineas.flatMap((l) => l.equipos)) ?? [], [planta]);
  const equipo = equipos.find((e) => e.codigo === sel) ?? null;
  useEffect(() => { try { if (sel) localStorage.setItem("sima.control.equipo", sel); } catch { /* */ } }, [sel]);

  if (error && !planta) return <SinConexion error={error} alReintentar={recargar} />;
  if (!planta || !catalogo) return <div className="grid h-full grid-cols-[280px_1fr_420px] gap-3 p-3"><Esqueleto className="h-full" /><Esqueleto className="h-full" /><Esqueleto className="h-full" /></div>;
  return (
    <div className="grid h-full min-h-0 grid-cols-[264px_minmax(0,1fr)_minmax(380px,440px)] gap-px bg-borde">
      <Arbol planta={planta} sel={sel} alElegir={(c) => { setSel(c); setComponente(null); }} fallas={fallas} />
      <section className="flex min-h-0 flex-col bg-fondo">
        {error && <p className="flex items-center gap-2 border-b border-[#eab30844] bg-[#eab30814] px-4 py-1.5 text-[12px] text-[#fde68a]"><AlertTriangle className="size-3.5" />Sin respuesta del servidor: se muestran los últimos datos ({error.texto}).</p>}
        {equipo ? <FichaActivo e={equipo} catalogo={catalogo} componente={componente} alComponente={setComponente} fallas={fallas.filter((f) => f.equipo?.codigo === equipo.codigo)} alCambio={recargar} />
          : <div className="grid h-full place-items-center"><EstadoVista tipo="vacio" titulo="Seleccione un activo" texto="Elija una máquina del árbol de la planta para ver su ficha, sus componentes, sus variables y provocar una falla simulada." /></div>}
      </section>
      <Ejercicio fallas={fallas} escenarios={escenarios} alCambio={recargar} alElegir={(c) => setSel(c)} />
    </div>
  );
}

function SinConexion({ error, alReintentar }: { error: { texto: string; status?: number }; alReintentar: () => void }) {
  const [url, setUrl] = useState(lab.cfg.url); const [clave, setClave] = useState(lab.cfg.clave);
  return (
    <div className="grid h-full place-items-center p-6">
      <div className="w-[min(480px,92vw)] rounded-lg border border-borde bg-panel p-5">
        <p className="display flex items-center gap-2 text-[16px] font-semibold"><KeyRound className="size-4 text-rojo" />Conectar el control de simulación</p>
        <p className="mt-1 text-[12.5px] text-tenue">El control de simulación trabaja sobre el estado guardado en SIMA, así lo que provoque aquí lo ven SIMA Desktop y SIMA Web. Requiere la clave del simulador: los trabajadores no la tienen.</p>
        <p className="mt-3 rounded border border-[#ef444455] bg-[#ef44441a] px-3 py-2 text-[12.5px] text-[#fca5a5]">{error.status === 401 ? "La clave no corresponde al controlador de simulación." : `No se pudo conectar: ${error.texto}`}</p>
        <label className="mt-3 block text-[12px] text-tenue">Dirección del servidor<input value={url} onChange={(e) => setUrl(e.target.value)} className="mono mt-1 h-9 w-full border border-borde bg-panel2 px-3 text-texto outline-none focus:border-rojo" /></label>
        <label className="mt-2 block text-[12px] text-tenue">Clave del simulador<input value={clave} onChange={(e) => setClave(e.target.value)} type="password" className="mono mt-1 h-9 w-full border border-borde bg-panel2 px-3 text-texto outline-none focus:border-rojo" /></label>
        <div className="mt-4 flex justify-end"><Boton variante="acento" onClick={() => { lab.setModo(lab.cfg.modo, url, clave); alReintentar(); }}><RefreshCw className="size-4" />Conectar</Boton></div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ árbol de la planta
function Arbol({ planta, sel, alElegir, fallas }: { planta: PlantaSim; sel: string | null; alElegir: (c: string) => void; fallas: FallaSim[] }) {
  const [q, setQ] = useState("");
  const [cerradas, setCerradas] = useState<Set<number>>(new Set());
  const vivas = new Set(fallas.filter((f) => f.estadoFisico === "activa" || f.estadoFisico === "latente").map((f) => f.equipo?.codigo));
  return (
    <aside className="flex min-h-0 flex-col bg-panel" aria-label="Planta simulada">
      <div className="border-b border-borde p-2.5">
        <p className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[.06em] text-tenue"><Factory className="size-3.5" />{planta.planta}</p>
        <label className="relative block"><Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-tenue" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar activo" aria-label="Buscar activo" className="h-8 w-full rounded border border-borde bg-panel2 pl-7 pr-2 text-[12.5px] outline-none focus:border-rojo" /></label>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {planta.areas.map((a) => {
          const eqs = a.lineas.flatMap((l) => l.equipos).filter((e) => !q || `${e.codigo} ${e.nombre} ${e.tipo}`.toLowerCase().includes(q.toLowerCase()));
          if (eqs.length === 0 && (q || a.lineas.every((l) => l.equipos.length === 0))) return null;
          const abierta = !cerradas.has(a.id) || !!q;
          return (
            <div key={a.id} className="mb-1">
              <button onClick={() => setCerradas((s) => { const n = new Set(s); if (n.has(a.id)) n.delete(a.id); else n.add(a.id); return n; })} aria-expanded={abierta}
                className="flex w-full cursor-pointer items-center gap-1.5 rounded px-1.5 py-1.5 text-left text-[12.5px] font-semibold hover:bg-panel2">
                <ChevronRight className={cx("size-3.5 text-tenue transition-transform duration-150", abierta && "rotate-90")} /><Layers className="size-3.5 text-tenue" /><span className="truncate">{a.nombre}</span>
              </button>
              {abierta && a.lineas.filter((l) => l.equipos.some((e) => eqs.includes(e))).map((l) => (
                <div key={l.id} className="ml-3 border-l border-borde pl-1.5">
                  <p className="flex items-center gap-1.5 px-1.5 pt-1.5 text-[11px] text-tenue"><Rows3 className="size-3" />{l.nombre}</p>
                  {l.equipos.filter((e) => eqs.includes(e)).map((e) => {
                    const d = defEstado(e.estado);
                    return (
                      <button key={e.codigo} onClick={() => alElegir(e.codigo)} aria-current={sel === e.codigo ? "true" : undefined} title={`${e.codigo} · ${e.nombre} · ${d.etiqueta}`}
                        className={cx("relative flex w-full cursor-pointer items-center gap-2 rounded px-1.5 py-1.5 text-left text-[12.5px] transition-colors duration-150", sel === e.codigo ? "bg-panel2 text-texto" : "text-[#cbd5e1] hover:bg-panel2/60")}>
                        {sel === e.codigo && <span className="absolute inset-y-1 left-0 w-[2px] rounded bg-rojo" />}
                        <d.icono className="size-3.5 shrink-0" style={{ color: d.color }} />
                        <span className="mono w-12 shrink-0 font-semibold">{e.codigo}</span><span className="min-w-0 flex-1 truncate text-tenue">{e.nombre}</span>
                        {vivas.has(e.codigo) && <Zap className="size-3.5 shrink-0 text-[#ef4444]" aria-label="Falla simulada activa" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </nav>
      <p className="border-t border-borde px-3 py-2 text-[11px] text-tenue">Datos persistentes en SIMA · se actualizan cada 3 s</p>
    </aside>
  );
}

// ------------------------------------------------------------------------------------------------ ficha del activo
function FichaActivo({ e, catalogo, componente, alComponente, fallas, alCambio }: { e: EquipoSim; catalogo: Catalogo; componente: number | null; alComponente: (c: number | null) => void; fallas: FallaSim[]; alCambio: () => void }) {
  const [tab, setTab] = useState<"inyectar" | "variables" | "componentes" | "historial">("inyectar");
  const real = e.plc?.origen === "real";
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-borde px-5 pb-0 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mono text-[20px] font-bold">{e.codigo}</h2><EstadoEquipo estado={e.estado} />
          {real ? <span className="rounded border border-[#ef444466] px-1.5 text-[11px] font-semibold text-[#fca5a5]">PLC físico · solo lectura</span> : <MarcaSimulado texto="Activo simulado" />}
          {e.ordenes.map((o) => <span key={o.codigo} className="rounded bg-panel2 px-1.5 py-0.5 text-[11px] text-tenue">{o.codigo} · {ESTADO_OT[o.estado] ?? o.estado}</span>)}
        </div>
        <p className="mt-0.5 text-[13.5px]">{e.nombre}</p>
        <p className="text-[12px] text-tenue">{e.tipo} · {e.marca} {e.modelo} · criticidad {e.criticidad}{e.plc ? ` · ${e.plc.codigo} (${e.plc.fabricante} ${e.plc.modelo}, programa v${e.plc.versionPrograma})` : " · sin PLC"}</p>
        <div className="mt-3"><Pestanas id="ficha-sim" activa={tab} onCambio={setTab} items={[{ clave: "inyectar", titulo: "Provocar falla" }, { clave: "variables", titulo: "Variables", n: e.sensores.length }, { clave: "componentes", titulo: "Componentes", n: e.componentes.length }, { clave: "historial", titulo: "Fallas del activo", n: fallas.length }]} /></div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {tab === "inyectar" && (real ? <EstadoVista tipo="sin_permiso" titulo="Equipo conectado a un PLC físico" texto="Las fallas simuladas solo se aplican a la planta simulada. El simulador nunca escribe sobre maquinaria real." />
          : <Inyectar e={e} catalogo={catalogo} componente={componente} alComponente={alComponente} alCambio={alCambio} />)}
        {tab === "variables" && <Variables e={e} real={real} alCambio={alCambio} />}
        {tab === "componentes" && (
          <ul className="grid gap-1.5">
            {e.componentes.length === 0 && <li className="text-[13px] text-tenue">Este equipo no tiene componentes registrados en su ficha técnica.</li>}
            {e.componentes.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded border border-borde bg-panel px-3 py-2">
                {c.tipo === "motor" ? <Cog className="size-4 text-tenue" /> : c.tipo === "sensor" ? <CircleDot className="size-4 text-tenue" /> : c.tipo === "variador" || c.tipo === "tablero" ? <Cpu className="size-4 text-tenue" /> : <Wrench className="size-4 text-tenue" />}
                <span className="min-w-0 flex-1"><span className="block text-[13px]">{c.nombre} <span className="mono text-[11px] text-tenue">{c.codigo}</span></span><span className="text-[11.5px] text-tenue">{catalogo.componentes[c.tipo] ?? c.tipo} · {c.especificacion}</span></span>
                {!real && <Boton tam="s" variante="secundario" onClick={() => { alComponente(c.id); setTab("inyectar"); }}><Zap className="size-3.5" />Provocar falla aquí</Boton>}
              </li>
            ))}
          </ul>
        )}
        {tab === "historial" && (
          <ul className="grid gap-2">
            {fallas.length === 0 && <li className="text-[13px] text-tenue">Sin fallas simuladas en los últimos 7 días.</li>}
            {fallas.map((f) => <TarjetaFalla key={f.id} f={f} alCambio={alCambio} />)}
          </ul>
        )}
      </div>
    </div>
  );
}

function Variables({ e, real, alCambio }: { e: EquipoSim; real: boolean; alCambio: () => void }) {
  const aviso = useAviso();
  const [valores, setValores] = useState<Record<string, string>>({});
  const fijar = async (s: Sensor) => {
    const v = Number((valores[s.variable] ?? "").replace(",", "."));
    if (!Number.isFinite(v)) return aviso("Escriba un número.", "error");
    try { await pedir("POST", "/api/ingesta/simulacion/variables", { equipo: e.codigo, variable: s.variable, valor: v }); aviso(`${s.nombre} = ${v} ${s.unidad} enviado a SIMA.`, "ok"); alCambio(); }
    catch (x) { aviso((x as Error).message, "error"); }
  };
  return (
    <div className="grid gap-2">
      <p className="text-[12px] text-tenue">Valores actuales guardados en SIMA (incluyen el efecto de las fallas activas). Fijar un valor envía una lectura simulada: si cruza el límite, SIMA abre la alarma como con un PLC.</p>
      {e.sensores.map((s) => {
        const p = s.ultimo == null ? 0 : Math.max(0, Math.min(1, (s.ultimo - s.min) / (s.max - s.min)));
        const c = s.ultimo == null ? "var(--s-detenido)" : s.ultimo >= s.alarma ? "var(--s-rojo)" : s.ultimo >= s.aviso ? "var(--s-ambar)" : "var(--s-verde)";
        return (
          <div key={s.variable} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded border border-borde bg-panel px-3 py-2.5">
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2"><span className="truncate text-[13px]">{s.nombre}</span><span className="mono text-[13px] font-semibold" style={{ color: c }}>{s.ultimo == null ? "sin dato" : `${s.ultimo.toFixed(1)} ${s.unidad}`}</span></div>
              <div className="relative mt-1.5 h-1.5 rounded bg-panel2"><div className="h-full rounded" style={{ width: `${p * 100}%`, background: c }} />
                {[s.aviso, s.alarma].map((x, i) => <span key={i} className="absolute top-[-3px] h-3 w-px" style={{ left: `${((x - s.min) / (s.max - s.min)) * 100}%`, background: i ? "var(--s-rojo)" : "var(--s-ambar)" }} />)}
              </div>
              <p className="mt-1 text-[11px] text-tenue">nominal {s.nominal} · aviso {s.aviso} · alarma {s.alarma} {s.unidad}</p>
            </div>
            {!real && <div className="flex items-center gap-1.5"><input value={valores[s.variable] ?? ""} onChange={(ev) => setValores({ ...valores, [s.variable]: ev.target.value })} placeholder={String(s.nominal)} aria-label={`Valor de ${s.nombre}`} className="mono h-8 w-20 rounded border border-borde bg-panel2 px-2 text-[12.5px] outline-none focus:border-rojo" /><Boton tam="s" variante="secundario" onClick={() => void fijar(s)}>Fijar</Boton></div>}
          </div>
        );
      })}
    </div>
  );
}

function Campo({ t, children, ayuda }: { t: string; children: ReactNode; ayuda?: string }) {
  return <label className="grid gap-1 text-[12px] text-tenue"><span>{t}</span>{children}{ayuda && <span className="text-[11px]">{ayuda}</span>}</label>;
}
const SEL = "h-9 w-full rounded border border-borde bg-panel2 px-2.5 text-[13px] text-texto outline-none focus:border-rojo";

function Inyectar({ e, catalogo, componente, alComponente, alCambio }: { e: EquipoSim; catalogo: Catalogo; componente: number | null; alComponente: (c: number | null) => void; alCambio: () => void }) {
  const aviso = useAviso();
  const [tipo, setTipo] = useState(catalogo.tipos[0].clave);
  const [causa, setCausa] = useState<string>("");
  const [criticidad, setCriticidad] = useState("");
  const [modo, setModo] = useState<"inmediata" | "intermitente" | "progresiva">("inmediata");
  const [cuando, setCuando] = useState<"ahora" | "programada">("ahora");
  const [retardo, setRetardo] = useState(5);
  const [periodo, setPeriodo] = useState(120);
  const [duracion, setDuracion] = useState(10);
  const [enviando, setEnviando] = useState(false);
  const t = catalogo.tipos.find((x) => x.clave === tipo)!;
  const c = t.causas.find((x) => x.clave === causa);
  const compSel = e.componentes.find((x) => x.id === componente);
  // si se eligió un componente en la ficha, se sugieren los tipos de falla que lo afectan
  useEffect(() => { if (compSel) { const ok = catalogo.tipos.find((x) => x.causas.some((k) => k.componente === compSel.tipo)); if (ok && !ok.causas.some((k) => k.clave === causa)) { setTipo(ok.clave); setCausa(ok.causas.find((k) => k.componente === compSel.tipo)!.clave); } } }, [componente]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!t.causas.some((k) => k.clave === causa)) setCausa(""); }, [tipo]); // eslint-disable-line react-hooks/exhaustive-deps
  const grupos = [...new Set(catalogo.tipos.map((x) => x.grupo))];
  const compatibles = e.componentes.filter((x) => !c || x.tipo === c.componente);
  const afectadas = e.sensores.filter((s) => t.variables.some((v) => v.efecto !== "sin_efecto" && (v.patron === "*" || v.patron.split("|").some((p) => s.variable.includes(p)))));
  const inyectar = async () => {
    setEnviando(true);
    try {
      const r = await pedir<{ codigo: string; estadoFisico: string }>("POST", "/api/ingesta/simulacion/fallas", {
        equipo: e.codigo, tipo, causa: causa || null, componenteId: componente && compatibles.some((x) => x.id === componente) ? componente : null, criticidad: criticidad || null, modo,
        retardoMin: cuando === "programada" ? retardo : null, periodoSeg: periodo, duracionSeg: duracion * 60,
      });
      aviso(r.estadoFisico === "programada" ? `${r.codigo} programada: se manifestará en ${retardo} min.` : `${r.codigo} activa en ${e.codigo}. SIMA Desktop ya muestra la alarma y la incidencia.`, "ok");
      alCambio();
    } catch (x) { aviso((x as Error).message, "error"); }
    finally { setEnviando(false); }
  };
  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid content-start gap-3">
        <Campo t="Tipo de falla"><select value={tipo} onChange={(x) => setTipo(x.target.value)} className={SEL}>{grupos.map((g) => <optgroup key={g} label={g}>{catalogo.tipos.filter((x) => x.grupo === g).map((x) => <option key={x.clave} value={x.clave}>{x.titulo}</option>)}</optgroup>)}</select></Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo t="Causa simulada" ayuda="Oculta para los trabajadores."><select value={causa} onChange={(x) => setCausa(x.target.value)} className={SEL}><option value="">Al azar entre las posibles</option>{t.causas.map((k) => <option key={k.clave} value={k.clave}>{k.texto}</option>)}</select></Campo>
          <Campo t="Componente afectado" ayuda={c && compatibles.length === 0 ? `El equipo no tiene ${catalogo.componentes[c.componente]?.toLowerCase() ?? c.componente} en su ficha: se usará el sistema completo.` : undefined}>
            <select value={componente ?? ""} onChange={(x) => alComponente(x.target.value ? Number(x.target.value) : null)} className={SEL}><option value="">Según la causa</option>{compatibles.map((k) => <option key={k.id} value={k.id}>{k.nombre}</option>)}</select>
          </Campo>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo t="Criticidad"><select value={criticidad} onChange={(x) => setCriticidad(x.target.value)} className={SEL}><option value="">Del catálogo ({t.criticidad})</option>{["baja", "media", "alta", "critica"].map((k) => <option key={k} value={k}>{k}</option>)}</select></Campo>
          <Campo t="Comportamiento"><select value={modo} onChange={(x) => setModo(x.target.value as typeof modo)} className={SEL}><option value="inmediata">Permanente (inmediata)</option><option value="intermitente">Intermitente</option><option value="progresiva">Progresiva</option></select></Campo>
          <Campo t="Inicio"><select value={cuando} onChange={(x) => setCuando(x.target.value as typeof cuando)} className={SEL}><option value="ahora">Ahora</option><option value="programada">Programada</option></select></Campo>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {cuando === "programada" && <Campo t="Empieza en (min)"><input type="number" min={1} value={retardo} onChange={(x) => setRetardo(Math.max(1, Number(x.target.value) || 1))} className={SEL} /></Campo>}
          {modo === "intermitente" && <Campo t="Ciclo de aparición (s)" ayuda="Se manifiesta un 45 % del ciclo."><input type="number" min={20} value={periodo} onChange={(x) => setPeriodo(Math.max(20, Number(x.target.value) || 20))} className={SEL} /></Campo>}
          {modo === "progresiva" && <Campo t="Llega a falla en (min)"><input type="number" min={1} value={duracion} onChange={(x) => setDuracion(Math.max(1, Number(x.target.value) || 1))} className={SEL} /></Campo>}
        </div>
        <div className="flex items-center gap-3 border-t border-borde pt-3">
          <Boton variante="acento" cargando={enviando} onClick={() => void inyectar()}><Zap className="size-4" />{cuando === "programada" ? "Programar falla" : "Provocar falla"}</Boton>
          <p className="text-[11.5px] text-tenue">Solo afecta a la planta simulada. Los trabajadores ven los síntomas, no la causa.</p>
        </div>
      </div>
      <aside className="grid content-start gap-2 rounded border border-borde bg-panel p-3.5 text-[12.5px]">
        <p className="text-[11px] font-semibold uppercase tracking-[.06em] text-tenue">Lo que verá la planta</p>
        <p>{t.sintomas}</p>
        <p className="text-tenue">Impacto: <span className="text-texto">{t.impacto}</span></p>
        <p className="text-tenue">Estado del equipo: <span className="text-texto">{defEstado(t.estadoEquipo).etiqueta}{modo === "progresiva" ? " (al completarse)" : ""}</span></p>
        <p className="text-tenue">Variables afectadas: <span className="text-texto">{afectadas.length ? afectadas.map((s) => s.nombre).join(", ") : t.clave === "error_logica_ladder" ? "lógica del PLC (peldaño alterado)" : "ninguna medida (señal o comunicación)"}</span></p>
        <p className="text-tenue">Especialidad requerida: <span className="text-texto">{ESPECIALIDAD[t.especialidad] ?? t.especialidad}</span></p>
        {c && <>
          <p className="mt-1 border-t border-borde pt-2 text-[11px] font-semibold uppercase tracking-[.06em] text-tenue">Resolución esperada (solo control)</p>
          <p className="text-tenue">Componente: <span className="text-texto">{compSel?.nombre ?? catalogo.componentes[c.componente] ?? c.componente}</span></p>
          <p className="text-tenue">Acción: <span className="text-texto">{c.acciones.map((a) => catalogo.acciones[a] ?? a).join(" o ")}</span></p>
          <p className="text-tenue">Repuesto: <span className="text-texto">{c.repuesto ? `del tipo «${c.repuesto.split("|")[0]}» (si el pañol lo tiene)` : "no requiere"}</span></p>
          {t.clave === "error_logica_ladder" && <p className="text-[#fde68a]">Se corrige solo con una versión del programa aprobada y publicada.</p>}
        </>}
      </aside>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ ejercicio en curso
function TarjetaFalla({ f, alCambio, alElegir }: { f: FallaSim; alCambio: () => void; alElegir?: (c: string) => void }) {
  const aviso = useAviso();
  const [abierta, setAbierta] = useState(false);
  const [cancelar, setCancelar] = useState(false);
  const ef = ESTADO_FISICO[f.estadoFisico] ?? { t: f.estadoFisico, c: "var(--s-tenue)" };
  const viva = ["activa", "latente", "programada"].includes(f.estadoFisico);
  return (
    <li className="rounded border border-borde bg-panel">
      <button onClick={() => setAbierta(!abierta)} aria-expanded={abierta} className="flex w-full cursor-pointer gap-2.5 px-3 py-2.5 text-left">
        <span className="mt-1 h-8 w-[3px] shrink-0 rounded" style={{ background: ef.c }} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-[12.5px]"><span className="mono font-semibold">{f.codigo}</span><span className="mono text-tenue">{f.equipo?.codigo}</span><span className="truncate">{f.titulo}</span></span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-tenue">
            <span style={{ color: ef.c }}>{ef.t}</span>
            {f.modo !== "inmediata" && <span>· {f.modo}</span>}
            {f.estadoFisico === "activa" && f.modo === "progresiva" && <span>· {Math.round(f.severidad * 100)} %</span>}
            <span>· {f.orden ? `${f.orden.codigo}: ${ESTADO_OT[f.orden.estado] ?? f.orden.estado}${f.orden.asignado ? ` (${f.orden.asignado})` : ""}` : "sin incidencia"}</span>
            {f.intentosFallidos > 0 && <span className="text-[#fbbf24]">· {f.intentosFallidos} intento{f.intentosFallidos > 1 ? "s" : ""} fallido{f.intentosFallidos > 1 ? "s" : ""}</span>}
          </span>
        </span>
        <ChevronRight className={cx("mt-1 size-4 shrink-0 text-tenue transition-transform duration-150", abierta && "rotate-90")} />
      </button>
      <AnimatePresence initial={false}>
        {abierta && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="grid gap-2 border-t border-borde px-3 py-2.5 text-[12px]">
              <p><span className="text-tenue">Causa real:</span> {f.causa} <span className="text-tenue">· componente:</span> {f.componente ?? "sistema"}</p>
              <p><span className="text-tenue">Se resuelve con:</span> {f.acciones.join(" o ")}{f.repuesto ? ` + ${f.repuesto}` : ""} <span className="text-tenue">· especialidad</span> {ESPECIALIDAD[f.especialidad] ?? f.especialidad}</p>
              <p className="text-tenue">Síntomas: <span className="text-texto">{f.sintomas}</span></p>
              <div className="grid grid-cols-4 gap-px overflow-hidden rounded border border-borde bg-borde text-center">
                {([["Incidencia", f.tiempos.aIncidencia], ["Toma", f.tiempos.aToma], ["Reparación", f.tiempos.aReparacion], ["Liberación", f.tiempos.aLiberacion]] as const).map(([n, v]) => (
                  <div key={n} className="bg-panel2 px-1 py-1.5"><p className="text-[10.5px] text-tenue">{n}</p><p className="mono text-[12px]">{min(v)}</p></div>
                ))}
              </div>
              {f.evaluaciones.length > 0 && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[.06em] text-tenue">Intervenciones evaluadas</p>
                  <ul className="grid gap-1">{f.evaluaciones.map((v, i) => (
                    <li key={i} className="rounded bg-panel2 px-2.5 py-1.5">
                      <p className="flex items-center gap-1.5">{v.resuelve ? <CheckCircle2 className="size-3.5 text-[#22c55e]" /> : <XCircle className="size-3.5 text-[#ef4444]" />}<b className="font-medium">{v.tecnicoNombre}</b><span className="text-tenue">· {new Date(v.fecha).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</span></p>
                      <p className="text-tenue">{v.componente} · {v.accion}{v.repuestos ? ` · ${v.repuestos}` : ""}</p>
                      <p className="text-tenue">Diagnóstico: <span className="text-texto">{v.diagnostico}</span></p>
                      <p className={v.resuelve ? "text-[#86efac]" : "text-[#fca5a5]"}>{v.motivo}</p>
                    </li>
                  ))}</ul>
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                {alElegir && f.equipo && <Boton tam="s" variante="texto" onClick={() => alElegir(f.equipo.codigo)}>Ver el activo</Boton>}
                {viva && <Boton tam="s" variante="contorno" onClick={() => setCancelar(true)}><RotateCcw className="size-3.5" />Cancelar falla</Boton>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Confirmar abierto={cancelar} titulo={`Cancelar ${f.codigo}`} texto="La máquina vuelve a su condición normal en la planta simulada. La incidencia administrativa sigue su curso y queda registro del cambio." confirmar="Cancelar falla" tono="peligro" onCerrar={() => setCancelar(false)}
        onConfirmar={async () => { try { await pedir("POST", `/api/ingesta/simulacion/fallas/${f.id}/cancelar`); aviso(`${f.codigo} cancelada.`, "ok"); alCambio(); } catch (x) { aviso((x as Error).message, "error"); } setCancelar(false); }} />
    </li>
  );
}

function Ejercicio({ fallas, escenarios, alCambio, alElegir }: { fallas: FallaSim[]; escenarios: Escenario[]; alCambio: () => void; alElegir: (c: string) => void }) {
  const aviso = useAviso();
  const [vista, setVista] = useState<"curso" | "historial" | "escenarios">("curso");
  const [reiniciar, setReiniciar] = useState(false);
  const [guardar, setGuardar] = useState(false);
  const [nombre, setNombre] = useState("");
  const vivas = fallas.filter((f) => ["activa", "latente", "programada"].includes(f.estadoFisico));
  const terminadas = fallas.filter((f) => !["activa", "latente", "programada"].includes(f.estadoFisico));
  const resueltas = terminadas.filter((f) => f.estadoFisico === "resuelta");
  const intentos = fallas.reduce((n, f) => n + f.evaluaciones.length, 0);
  const aciertos = fallas.reduce((n, f) => n + f.evaluaciones.filter((v) => v.resuelve).length, 0);
  const tReparacion = resueltas.map((f) => f.tiempos.aReparacion).filter((x): x is number => x != null);
  const guardarEscenario = async () => {
    const base = vivas.length ? vivas : fallas.slice(0, 5);
    if (!nombre.trim() || base.length === 0) return;
    try {
      await pedir("POST", "/api/ingesta/simulacion/escenarios", { nombre, descripcion: `${base.length} fallas`, fallas: base.map((f) => ({ equipo: f.equipo.codigo, tipo: f.tipo, criticidad: f.criticidad, modo: f.modo })) });
      aviso(`Escenario «${nombre}» guardado.`, "ok"); setGuardar(false); setNombre(""); alCambio();
    } catch (x) { aviso((x as Error).message, "error"); }
  };
  return (
    <aside className="flex min-h-0 flex-col bg-panel" aria-label="Ejercicio de simulación">
      <header className="border-b border-borde px-3.5 pt-3">
        <div className="flex items-center gap-2"><p className="display flex-1 text-[14px] font-semibold">Ejercicio</p>
          <Boton tam="s" variante="texto" onClick={() => setGuardar(!guardar)} title="Guardar como escenario"><Save className="size-3.5" />Guardar</Boton>
          <Boton tam="s" variante="contorno" onClick={() => setReiniciar(true)}><RotateCcw className="size-3.5" />Reiniciar</Boton>
        </div>
        <div className="mt-2.5 grid grid-cols-4 gap-px overflow-hidden rounded border border-borde bg-borde text-center">
          {([["Activas", String(vivas.length)], ["Resueltas", String(resueltas.length)], ["Aciertos", intentos ? `${aciertos}/${intentos}` : "—"], ["Reparación", tReparacion.length ? min(tReparacion.reduce((a, b) => a + b, 0) / tReparacion.length) : "—"]] as const).map(([n, v]) => (
            <div key={n} className="bg-panel2 px-1 py-1.5"><p className="text-[10.5px] text-tenue">{n}</p><p className="mono text-[13px] font-semibold">{v}</p></div>
          ))}
        </div>
        {guardar && (
          <div className="mt-2 flex gap-2"><input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del escenario" aria-label="Nombre del escenario" className="h-8 min-w-0 flex-1 rounded border border-borde bg-panel2 px-2 text-[12.5px] outline-none focus:border-rojo" /><Boton tam="s" variante="acento" disabled={!nombre.trim()} onClick={() => void guardarEscenario()}>Guardar</Boton></div>
        )}
        <div className="mt-2"><Pestanas id="ejercicio" activa={vista} onCambio={setVista} items={[{ clave: "curso", titulo: "En curso", n: vivas.length }, { clave: "historial", titulo: "Terminadas", n: terminadas.length }, { clave: "escenarios", titulo: "Escenarios", n: escenarios.length }]} /></div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
        {vista === "curso" && (vivas.length === 0 ? <p className="px-2 py-10 text-center text-[12.5px] text-tenue">No hay fallas activas. Elija un activo y provoque una para empezar el ejercicio.</p>
          : <ul className="grid gap-2">{vivas.map((f) => <TarjetaFalla key={f.id} f={f} alCambio={alCambio} alElegir={alElegir} />)}</ul>)}
        {vista === "historial" && (terminadas.length === 0 ? <p className="px-2 py-10 text-center text-[12.5px] text-tenue">Todavía no hay fallas terminadas.</p>
          : <ul className="grid gap-2">{terminadas.map((f) => <TarjetaFalla key={f.id} f={f} alCambio={alCambio} alElegir={alElegir} />)}</ul>)}
        {vista === "escenarios" && (
          <ul className="grid gap-2">
            {escenarios.length === 0 && <li className="px-2 py-10 text-center text-[12.5px] text-tenue">Sin escenarios guardados. Provoque fallas y use «Guardar» para repetir el ejercicio.</li>}
            {escenarios.map((x) => (
              <li key={x.id} className="flex items-center gap-2 rounded border border-borde bg-panel2 px-3 py-2">
                <ListChecks className="size-4 text-tenue" />
                <span className="min-w-0 flex-1"><span className="block truncate text-[13px]">{x.nombre}</span><span className="text-[11px] text-tenue">{x.fallas.length} fallas · ejecutado {x.ejecuciones} {x.ejecuciones === 1 ? "vez" : "veces"}</span></span>
                <Boton tam="s" variante="acento" onClick={async () => { try { const r = await pedir<{ creadas: string[]; errores: string[] }>("POST", `/api/ingesta/simulacion/escenarios/${x.id}/ejecutar`); aviso(`${r.creadas.length} fallas activadas${r.errores.length ? ` · ${r.errores.length} con error` : ""}.`, r.errores.length ? "aviso" : "ok"); alCambio(); setVista("curso"); } catch (e) { aviso((e as Error).message, "error"); } }}><Play className="size-3.5" />Ejecutar</Boton>
                <Boton tam="s" variante="texto" icono aria-label={`Eliminar ${x.nombre}`} onClick={async () => { try { await pedir("DELETE", `/api/ingesta/simulacion/escenarios/${x.id}`); alCambio(); } catch (e) { aviso((e as Error).message, "error"); } }}><Trash2 className="size-3.5" /></Boton>
              </li>
            ))}
          </ul>
        )}
      </div>
      <footer className="flex items-center gap-1.5 border-t border-borde px-3 py-2 text-[11px] text-tenue"><Clock className="size-3" />Tiempos medidos desde que la falla se manifestó. <FlaskConical className="ml-auto size-3 text-[#38bdf8]" />Entorno ficticio</footer>
      <Confirmar abierto={reiniciar} titulo="Reiniciar el escenario" texto="Se cancelan todas las fallas, los equipos simulados vuelven a operar, se cierran las incidencias del ejercicio y se restaura la lógica de los PLC. Queda registro en los eventos de SIMA." confirmar="Reiniciar" tono="peligro" onCerrar={() => setReiniciar(false)}
        onConfirmar={async () => { try { const r = await pedir<{ canceladas: number; ordenesCerradas: number }>("POST", "/api/ingesta/simulacion/reiniciar"); aviso(`Escenario reiniciado: ${r.canceladas} fallas canceladas y ${r.ordenesCerradas} incidencias cerradas.`, "ok"); alCambio(); } catch (x) { aviso((x as Error).message, "error"); } setReiniciar(false); }} />
    </aside>
  );
}
