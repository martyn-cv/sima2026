import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle, ArrowRight, BadgeCheck, BookUser, Briefcase, CalendarDays, Check, ClipboardCheck, Cpu, Eye, EyeOff, HardHat, Home, KeyRound, Loader2, Lock, Network, RefreshCw, Repeat,
  Route, Search, Server, ShieldCheck, Siren, TriangleAlert, Users, Wrench, WifiOff, Hammer, ListChecks, type LucideIcon,
} from "lucide-react";
import { ApiError } from "@sima/cliente";
import { Avatar, AvisosProvider, Boton, Campo, CURVA, Entrada, EstadoVista, MarcaSimulado, PantallaSeguridad, TIEMPO, cx, defEstado, mensajeDe, useAviso } from "@sima/ui";
import { api, baseUrl, guardarUrl } from "./lib/api";
import { useAuth } from "./lib/auth";
import { usePlanta } from "./lib/planta";
import { ir, useRuta } from "./ruta";
import { Explorador } from "./pantallas/Explorador";
import { Mantenimiento } from "./pantallas/Mantenimiento";
import { Reportar } from "./pantallas/Reportar";
import { Alarmas, Directorio, MiCargo } from "./pantallas/Resto";
import { Rutinas, Traspaso } from "./pantallas/Operacion";
import { Panol } from "./pantallas/PanolV2";
import { Automatizacion, Calibraciones, Calidad, Condicion, InicioRol, Produccion, RUTA, Seguridad, Turno } from "./pantallas/Rol";
import { PlanificacionMantenimiento } from "./pantallas/Calendario";
import { Seguimiento } from "./pantallas/Seguimiento";
import { SECCIONES, experienciaDe, seccionesDe, tiene, type Seccion } from "./roles";
import { Estacion, Logo, VERSION, type ItemNav } from "./shell";

type Salud = { estado: string; trabajadores: number; equipos: number };
const pedirSalud = async (url: string) => {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), 4000);
  try { const r = await fetch(`${url}/salud`, { signal: c.signal }); if (!r.ok) throw new Error(); return (await r.json()) as Salud; } finally { clearTimeout(t); }
};

/** Esquema de una línea de producción, en trazo fino: fondo industrial sutil del arranque y del ingreso (ilustrativo). */
function EsquemaLinea({ className }: { className?: string }) {
  const maquinas = [60, 200, 340, 480];
  return (
    <svg viewBox="0 0 600 180" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M20 120 H580" strokeDasharray="6 6" className="animate-flujo" style={{ animationDuration: "2.4s" }} />
      <path d="M20 132 H580" opacity=".5" />
      {maquinas.map((x, i) => (
        <g key={x}>
          <rect x={x} y={56} width={84} height={56} rx={3} />
          <rect x={x + 10} y={66} width={28} height={18} rx={2} opacity=".6" />
          <circle cx={x + 62} cy={75} r={7} opacity=".6" />
          <path d={`M${x + 42} 56 V36 H${x + 70}`} opacity=".45" />
          <circle cx={x + 74} cy={36} r={3} className={i === 2 ? "text-acento" : undefined} stroke={i === 2 ? "var(--s-acento)" : undefined} />
          {[0, 1, 2].map((k) => <circle key={k} cx={x + 12 + k * 30} cy={142} r={5} opacity=".5" />)}
        </g>
      ))}
      <path d="M20 26 H580" opacity=".25" />
      <rect x={530} y={8} width={44} height={28} rx={2} opacity=".5" />
      <path d="M552 36 V56" opacity=".35" />
    </svg>
  );
}

// ------------------------------------------------------------------------------------------------ arranque
function Arranque({ alListo }: { alListo: (sinConexion: boolean) => void }) {
  const [url, setUrl] = useState(baseUrl());
  const [editar, setEditar] = useState(false);
  const [intento, setIntento] = useState(0);
  const salud = useQuery({ queryKey: ["salud", url, intento], retry: 0, queryFn: () => pedirSalud(url) });
  useEffect(() => { if (salud.data) { const t = setTimeout(() => alListo(false), 350); return () => clearTimeout(t); } }, [salud.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const pasos = [
    { t: "Interfaz cargada", ok: true },
    { t: "Conexión con el servidor SIMA", ok: !!salud.data, error: salud.isError },
    { t: salud.data ? `Base central en línea · ${salud.data.equipos} equipos registrados` : "Base de datos central", ok: !!salud.data, error: salud.isError },
  ];
  return (
    <div className="rejilla relative grid h-dvh place-items-center overflow-hidden">
      <EsquemaLinea className="pointer-events-none absolute bottom-10 left-1/2 w-[900px] max-w-none -translate-x-1/2 text-linea" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: TIEMPO.pantalla, ease: CURVA }} className="relative w-[min(440px,92vw)]">
        <div className="mb-6 flex items-center gap-3"><Logo tam={36} /><div><p className="text-[18px] font-semibold leading-tight">SIMA Desktop</p><p className="text-[12.5px] text-gris">Estación de operación y mantenimiento de planta</p></div></div>
        <ul className="panel grid gap-2.5 p-4" aria-live="polite">
          {pasos.map((p, i) => (
            <li key={i} className="flex items-center gap-2.5 text-[13px]">
              <span className={cx("grid size-5 shrink-0 place-items-center rounded", p.ok ? "bg-verde-claro text-verde" : p.error ? "bg-rojo-claro text-rojo" : "bg-papel-2 text-gris")}>
                {p.ok ? <Check className="size-3.5" /> : p.error ? <AlertTriangle className="size-3" /> : <Loader2 className="size-3.5 animate-spin" />}
              </span>
              <span className={cx(!p.ok && !p.error && "text-gris")}>{p.t}</span>
            </li>
          ))}
          <li className="mt-1 flex items-center gap-2 border-t border-linea-suave pt-2.5 text-gris"><Server className="size-3.5" /><span className="t-dato">{url}</span></li>
        </ul>
        <AnimatePresence>
          {salud.isError && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: TIEMPO.componente }} className="overflow-hidden">
              <p className="mt-3 rounded-md border border-ambar/30 bg-ambar-claro px-3 py-2.5 text-[13px] text-ambar-hondo">No responde el servidor de SIMA en esa dirección. Verifique que esté encendido en el equipo servidor o cambie la dirección.</p>
              {editar && <form onSubmit={(e) => { e.preventDefault(); guardarUrl(url); setIntento((n) => n + 1); }} className="mt-3 flex gap-2"><Entrada aria-label="Dirección del servidor" value={url} onChange={(e) => setUrl(e.target.value)} className="font-mono" /><Boton type="submit" variante="acento">Probar</Boton></form>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Boton variante="acento" onClick={() => setIntento((n) => n + 1)}><RefreshCw className="size-4" />Reintentar</Boton>
                <Boton variante="contorno" onClick={() => setEditar(!editar)}><Server className="size-4" />Cambiar dirección</Boton>
                <Boton variante="texto" onClick={() => alListo(true)}><WifiOff className="size-4" />Continuar sin conexión</Boton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <p className="absolute bottom-3 text-[11.5px] text-apagado">SIMA Desktop {VERSION} · los datos viven en la base central; este equipo guarda solo lo último consultado</p>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ ingreso
function Ingreso({ sinConexion }: { sinConexion: boolean }) {
  const { entrar, aviso } = useAuth();
  const [correo, setCorreo] = useState(""); const [clave, setClave] = useState(""); const [codigo, setCodigo] = useState(""); const [pideCodigo, setPideCodigo] = useState(false);
  const [ver, setVer] = useState(false); const [mayus, setMayus] = useState(false); const [recuperar, setRecuperar] = useState(false);
  const [error, setError] = useState<string | null>(null); const [cargando, setCargando] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const salud = useQuery({ queryKey: ["salud-ingreso"], queryFn: () => pedirSalud(baseUrl()), retry: 0, refetchInterval: 20_000 });
  const demo = useQuery({ queryKey: ["demo"], queryFn: api.demo, retry: 0, enabled: !sinConexion });
  async function enviar(e?: FormEvent, c = correo, k = clave, cod = codigo) {
    e?.preventDefault(); setError(null); setCargando(c || "x");
    try { await entrar(c, k, cod); } catch (x) { if (x instanceof ApiError && x.datos?.requiere2fa) setPideCodigo(true); setError(mensajeDe(x)); } finally { setCargando(null); }
  }
  const enLinea = !!salud.data && !salud.isError;
  const cuentas = (demo.data ?? []).filter((d) => d.canal === "app" && `${d.nombre} ${d.cargo}`.toLowerCase().includes(filtro.toLowerCase()));
  return (
    <div className="grid h-dvh lg:grid-cols-[minmax(0,1fr)_480px]">
      <section className="rejilla relative hidden flex-col justify-between overflow-hidden border-r border-linea-suave bg-chapa p-10 lg:flex">
        <div className="flex items-center gap-3"><Logo tam={32} /><div><p className="text-[15px] font-semibold leading-tight">SIMA Desktop</p><p className="text-[12px] text-gris">Estación de planta · Manufacturas Andina</p></div></div>
        <div className="max-w-[560px]">
          <p className="t-etiqueta text-acento">Operación y mantenimiento</p>
          <h1 className="mt-3 text-[34px] font-semibold leading-[1.15] tracking-tight">El estado de cada equipo, cada orden de trabajo y cada liberación, en el turno.</h1>
          <ul className="mt-6 grid gap-2.5 text-[13.5px] text-carbon">
            {["Alarmas y fallas al instante, con el equipo y la línea afectados", "Órdenes de trabajo guiadas: bloqueo, diagnóstico, intervención, pruebas y liberación por etapas", "Funciona sin red: los registros se guardan y se envían al reconectar"].map((t) => (
              <li key={t} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-acento" />{t}</li>
            ))}
          </ul>
        </div>
        <div>
          <EsquemaLinea className="w-full max-w-[640px] text-linea" />
          <p className="mt-4 text-[12px] text-apagado">Para trabajo administrativo (personal, contratos, remuneraciones) use SIMA Web. Cada plataforma tiene su propia autorización y sesión.</p>
        </div>
      </section>
      <section className="flex flex-col overflow-y-auto bg-fondo-2 px-6 py-8 sm:px-10">
        <div className="mb-8 flex items-center justify-between lg:justify-end">
          <span className="flex items-center gap-2 lg:hidden"><Logo tam={26} /><span className="font-semibold">SIMA Desktop</span></span>
          <span className={cx("inline-flex h-6 items-center gap-1.5 rounded px-2 text-[11.5px] font-medium", salud.isLoading ? "text-gris" : enLinea ? "text-verde" : "bg-rojo-claro text-rojo")} role="status">
            {salud.isLoading ? <Loader2 className="size-3 animate-spin" /> : enLinea ? <span className="size-1.5 rounded-full bg-verde" /> : <WifiOff className="size-3" />}
            {salud.isLoading ? "Comprobando servidor" : enLinea ? "Servidor en línea" : "Servidor sin respuesta"}
          </span>
        </div>
        <motion.form initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: TIEMPO.pantalla, ease: CURVA }} onSubmit={enviar} className="w-full">
          <h2 className="t-pantalla">Ingresar a SIMA Desktop</h2>
          <p className="mb-6 mt-1 text-[13px] text-gris">Con su correo corporativo y su clave de SIMA. Su cuenta debe estar autorizada para la estación de planta.</p>
          {(sinConexion || (!salud.isLoading && !enLinea)) && <p className="mb-4 flex gap-2 rounded-md border border-ambar/30 bg-ambar-claro px-3 py-2 text-[13px] text-ambar-hondo"><WifiOff className="mt-0.5 size-4 shrink-0" />Sin conexión con el servidor: para ingresar se necesita la red de la planta.</p>}
          {aviso && <p role="status" className="mb-4 flex gap-2 rounded-md border border-ambar/30 bg-ambar-claro px-3 py-2 text-[13px] text-ambar-hondo"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{aviso}</p>}
          <div className="grid gap-4">
            <Campo etiqueta="Correo corporativo"><Entrada type="email" autoComplete="username" required autoFocus value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="nombre@manuandina.cl" /></Campo>
            <Campo etiqueta="Clave" error={mayus ? "Bloq Mayús está activado" : null}>
              <div className="relative">
                <Entrada type={ver ? "text" : "password"} autoComplete="current-password" required value={clave} onChange={(e) => setClave(e.target.value)} className="pr-10"
                  onKeyUp={(e) => setMayus(e.getModifierState?.("CapsLock") ?? false)} aria-invalid={!!error || undefined} />
                <button type="button" onClick={() => setVer(!ver)} aria-label={ver ? "Ocultar clave" : "Mostrar clave"} aria-pressed={ver} className="absolute inset-y-0 right-0 grid w-9 cursor-pointer place-items-center text-gris hover:text-negro">
                  {ver ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Campo>
            {pideCodigo && <Campo etiqueta="Código de autenticación" ayuda="Los 6 dígitos de la aplicación de su teléfono."><Entrada inputMode="numeric" maxLength={7} autoFocus required value={codigo} onChange={(e) => setCodigo(e.target.value)} className="font-mono tracking-[.3em]" /></Campo>}
            {error && <p role="alert" className="flex gap-2 rounded-md border border-rojo/30 bg-rojo-claro px-3 py-2 text-[13px] text-rojo-hondo"><Lock className="mt-0.5 size-4 shrink-0" />{error}</p>}
            <Boton type="submit" variante="acento" tam="l" cargando={cargando === correo && !!correo} disabled={!enLinea && !salud.isLoading}>Ingresar<ArrowRight className="size-4" /></Boton>
            <button type="button" onClick={() => setRecuperar(!recuperar)} aria-expanded={recuperar} className="flex cursor-pointer items-center gap-1.5 text-[12.5px] text-gris hover:text-negro"><KeyRound className="size-3.5" />¿Olvidó su clave?</button>
            <AnimatePresence>
              {recuperar && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: TIEMPO.componente }} className="overflow-hidden rounded-md border border-linea-suave bg-papel px-3 py-2.5 text-[12.5px] text-carbon">
                  Pida a Soporte TI que restablezca su clave: le entregará una clave temporal y SIMA le pedirá cambiarla al ingresar. Por seguridad, la clave nunca se envía por correo.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.form>
        {(demo.data?.length ?? 0) > 0 && (
          <div className="mt-8 border-t border-linea-suave pt-5">
            <div className="mb-2 flex items-center gap-2"><p className="t-etiqueta flex-1">Cuentas de demostración</p><MarcaSimulado texto="Datos simulados" /></div>
            <div className="relative mb-2"><Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gris" /><Entrada value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Filtrar por nombre o cargo" className="h-8 pl-8 text-[12.5px]" aria-label="Filtrar cuentas de demostración" /></div>
            <ul className="grid max-h-[260px] gap-px overflow-y-auto rounded-md border border-linea-suave bg-linea-suave">
              {cuentas.map((d) => (
                <li key={d.correo}>
                  <button disabled={!!cargando || !enLinea} onClick={() => void enviar(undefined, d.correo, d.clave)} className="group flex w-full cursor-pointer items-center gap-2.5 bg-papel px-3 py-2 text-left transition-colors duration-[140ms] hover:bg-papel-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <Avatar nombre={d.nombre} tam={26} /><span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-medium">{d.nombre}</span><span className="block truncate text-[11.5px] text-gris">{d.cargo}</span></span>
                    {cargando === d.correo ? <Loader2 className="size-3.5 animate-spin text-acento" /> : <ArrowRight className="size-3.5 text-apagado transition-transform duration-[140ms] group-hover:translate-x-0.5 group-hover:text-acento" />}
                  </button>
                </li>
              ))}
              {cuentas.length === 0 && <li className="bg-papel px-3 py-4 text-center text-[12.5px] text-gris">Sin cuentas que coincidan.</li>}
            </ul>
            <p className="mt-2 text-[11.5px] text-apagado">Personas y cargos ficticios de la empresa de demostración. Solo se listan cuentas autorizadas para SIMA Desktop.</p>
          </div>
        )}
        <p className="mt-auto pt-8 text-[11.5px] text-apagado">SIMA Desktop {VERSION} · si Personas revoca su acceso o cierra su cuenta, la sesión termina en este equipo.</p>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ marco
/** Icono de cada sección del menú. Qué secciones ve cada persona lo decide roles.ts según su cargo y sus capacidades. */
const ICONOS: Record<Seccion, LucideIcon> = {
  inicio: Home, produccion: ClipboardCheck, turno: Users, plan: CalendarDays, seguimiento: ListChecks, mantenimiento: Wrench, explorador: Network, alertas: Siren, reportar: TriangleAlert, seguridad: HardHat,
  calidad: ShieldCheck, calibraciones: BadgeCheck, condicion: Route, automatizacion: Cpu, rutinas: ClipboardCheck, panol: Hammer, traspaso: Repeat, cargo: Briefcase, directorio: BookUser,
};
const PANTALLAS: Record<Seccion, () => ReactNode> = {
  inicio: InicioRol, produccion: Produccion, turno: Turno, plan: PlanificacionMantenimiento, seguimiento: Seguimiento, mantenimiento: Mantenimiento, explorador: Explorador, alertas: Alarmas, reportar: () => <Reportar />, seguridad: Seguridad,
  calidad: Calidad, calibraciones: Calibraciones, condicion: Condicion, automatizacion: Automatizacion, rutinas: Rutinas, panol: Panol, traspaso: Traspaso, cargo: MiCargo, directorio: Directorio,
};
const POR_RUTA = Object.fromEntries(Object.entries(RUTA).map(([s, r]) => [r, s as Seccion])) as Record<string, Seccion>;
POR_RUTA["/alarmas"] = "alertas";                                   // enlaces antiguos de notificaciones
POR_RUTA["/ordenes"] = "mantenimiento";

function SinAcceso({ seccion }: { seccion: Seccion }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <EstadoVista tipo="sin_permiso" titulo={`${SECCIONES[seccion].titulo} no es parte de su cargo`}
        texto="SIMA muestra a cada persona lo que su trabajo necesita, y el servidor rechaza lo demás. Si cree que debería tener acceso, pídalo a su jefatura: los permisos se ajustan por cargo."
        accion={<Boton variante="acento" onClick={() => ir("/")}>Volver a mi inicio</Boton>} />
    </div>
  );
}

/** Las alertas de planta no críticas se avisan también como mensaje breve (las críticas se muestran en la franja fija). */
function AvisosPlanta() {
  const { alertas } = usePlanta();
  const poner = useAviso();
  const ultima = alertas[0];
  useEffect(() => { if (ultima && ultima.nivel !== "alarma") poner(ultima.texto, "aviso"); }, [ultima?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

type OtResumen = { id: number; estado: string; asignadoAId?: string | null; prioridad: string };

function Marco() {
  const { usuario } = useAuth();
  const { equipos } = usePlanta();
  const r = useRuta();
  const base = "/" + (r.split("?")[0].split("/")[1] ?? "");
  const parametro = new URLSearchParams(r.split("?")[1] ?? "");
  const secciones = seccionesDe(usuario);
  const exp = experienciaDe(usuario);
  const ots = useQuery({ queryKey: ["ordenes"], queryFn: () => api.get<OtResumen[]>("/api/ordenes"), enabled: tiene(usuario, "ordenes.ver"), refetchInterval: 30_000 });
  // contadores de pendientes en la barra lateral (lo que requiere atención de esta persona)
  const contadores = useMemo(() => {
    const l = ots.data ?? [];
    const mias = l.filter((o) => o.asignadoAId === usuario?.id && o.estado !== "cerrada" && o.estado !== "por_verificar").length;
    const porVerificar = tiene(usuario, "ordenes.aprobar") || tiene(usuario, "equipos.liberar_tecnica") ? l.filter((o) => o.estado === "por_verificar").length : 0;
    const sinAsignar = l.filter((o) => o.estado === "abierta" && !o.asignadoAId).length;
    const criticos = equipos.filter((e) => defEstado(e.estado).critico).length;
    return { mantenimiento: mias + porVerificar, plan: sinAsignar, alertas: criticos } as Partial<Record<Seccion, number>>;
  }, [ots.data, equipos, usuario]);
  // si el inicio se llama igual que una sección (p. ej. «Condición de activos»), el inicio se rotula «Inicio»
  const rotuloInicio = secciones.some((s) => s !== "inicio" && SECCIONES[s].titulo === exp.inicio) ? "Inicio" : exp.inicio;
  const nav: ItemNav[] = secciones.map((s) => ({ s, r: RUTA[s], t: s === "inicio" ? rotuloInicio : SECCIONES[s].titulo, i: ICONOS[s], g: SECCIONES[s].grupo, n: contadores[s], critico: s === "alertas" }));
  const activa = (x: string) => (x === "/" ? base === "/" : base === x);
  const actual = POR_RUTA[base] ?? "inicio";
  const Pantalla = PANTALLAS[actual];
  const titulo = actual === "inicio" ? rotuloInicio : SECCIONES[actual].titulo;
  const migas = [SECCIONES[actual].grupo, titulo, ...(parametro.get("equipo") ? [parametro.get("equipo")!] : [])];
  const pantalla = secciones.includes(actual) ? <Pantalla /> : <SinAcceso seccion={actual} />;
  return (
    <AvisosProvider>
      <AvisosPlanta />
      <Estacion nav={nav} activa={activa} migas={migas} rutas={RUTA}>
        <AnimatePresence mode="wait">
          <motion.div key={base} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: TIEMPO.componente, ease: CURVA }} className="mx-auto w-full max-w-[1600px] px-5 py-5">
            {pantalla}
          </motion.div>
        </AnimatePresence>
      </Estacion>
    </AvisosProvider>
  );
}

export function App() {
  const { usuario, cargando, refrescar, salir } = useAuth();
  const [listo, setListo] = useState<null | { sinConexion: boolean }>(null);
  if (!listo || cargando) return <Arranque alListo={(sinConexion) => setListo({ sinConexion })} />;
  if (usuario?.restringido) return <PantallaSeguridad cliente={api} usuario={usuario} alNuevoToken={(t) => void refrescar(t)} alSalir={() => salir()} />;
  return usuario ? <Marco /> : <Ingreso sinConexion={listo.sinConexion} />;
}
