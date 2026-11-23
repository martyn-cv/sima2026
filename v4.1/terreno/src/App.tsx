import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight, BadgeCheck, Bell, BookUser, Briefcase, CalendarDays, CircleAlert, ClipboardCheck, Cpu, Gauge, HardHat, Home, Lock, LogOut, Network, PlugZap, RefreshCw, Repeat, Route, Server, ShieldCheck, Siren, TriangleAlert, Users, Wrench, WifiOff, Hammer, type LucideIcon,
} from "lucide-react";
import { ApiError } from "@sima/cliente";
import { Avatar, AvisosProvider, Boton, Campo, CURVA, Entrada, Maquina, PantallaSeguridad, cx, mensajeDe, useAviso } from "@sima/ui";
import { api, baseUrl, guardarUrl } from "./lib/api";
import { useAuth } from "./lib/auth";
import { usePlanta } from "./lib/planta";
import { usePendientes, vaciar } from "./lib/offline";
import { ir, useRuta } from "./ruta";
import { Explorador } from "./pantallas/Explorador";
import { Mantenimiento } from "./pantallas/Mantenimiento";
import { Reportar } from "./pantallas/Reportar";
import { Alarmas, Directorio, MiCargo } from "./pantallas/Resto";
import { Panol, Rutinas, Traspaso } from "./pantallas/Operacion";
import { Automatizacion, Calibraciones, Calidad, Condicion, InicioRol, Plan, Produccion, RUTA, Seguridad, Turno } from "./pantallas/Rol";
import { SECCIONES, experienciaDe, seccionesDe, type Seccion } from "./roles";

// ------------------------------------------------------------------------------------------------ marca
function Logo({ tam = 40 }: { tam?: number }) {
  return (
    <span className="relative grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-acento to-cobre font-display font-extrabold text-sobre-negro shadow-[0_8px_24px_-8px_var(--s-acento)]" style={{ width: tam, height: tam, fontSize: tam * 0.55 }}>S</span>
  );
}

// ------------------------------------------------------------------------------------------------ pantalla de arranque
type Salud = { estado: string; trabajadores: number; equipos: number };
function Arranque({ alListo }: { alListo: (sinConexion: boolean) => void }) {
  const [url, setUrl] = useState(baseUrl());
  const [editar, setEditar] = useState(false);
  const [intento, setIntento] = useState(0);
  const [minimo, setMinimo] = useState(false);
  const salud = useQuery({
    queryKey: ["salud", url, intento], retry: 0,
    queryFn: async () => { const c = new AbortController(); const t = setTimeout(() => c.abort(), 4000); try { const r = await fetch(`${url}/salud`, { signal: c.signal }); if (!r.ok) throw new Error(); return (await r.json()) as Salud; } finally { clearTimeout(t); } },
  });
  useEffect(() => { const t = setTimeout(() => setMinimo(true), 1400); return () => clearTimeout(t); }, []);
  useEffect(() => { if (salud.data && minimo) { const t = setTimeout(() => alListo(false), 500); return () => clearTimeout(t); } }, [salud.data, minimo]); // eslint-disable-line react-hooks/exhaustive-deps
  const pasos = [
    { t: "Cargando interfaz", ok: true },
    { t: `Buscando el servidor de SIMA`, ok: !!salud.data, error: salud.isError },
    { t: salud.data ? `Base central en línea · ${salud.data.trabajadores} personas, ${salud.data.equipos} equipos` : "Base de datos central", ok: !!salud.data },
  ];
  return (
    <div className="rejilla relative grid h-dvh place-items-center overflow-hidden">
      <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(60% 50% at 50% 40%, transparent, var(--s-fondo) 75%)" }} />
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: CURVA }} className="relative w-[min(460px,92vw)] text-center">
        <motion.div initial={{ scale: 0.6, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 160, damping: 14 }} className="mx-auto mb-5 w-fit"><Logo tam={76} /></motion.div>
        <h1 className="display text-[40px] font-extrabold leading-none">SIMA <span className="texto-degradado">Desktop</span></h1>
        <p className="mt-2 text-[14px] text-gris">Centro de operaciones y mantenimiento · Manufacturas Andina</p>
        <ul className="tarjeta mt-8 grid gap-3 p-5 text-left">
          {pasos.map((p, i) => (
            <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.25 }} className="flex items-center gap-3 text-[14px]">
              <span className={cx("grid size-6 shrink-0 place-items-center rounded-full", p.ok ? "bg-verde-claro text-verde" : p.error ? "bg-rojo-claro text-rojo" : "bg-acento-claro text-acento")}>
                {p.ok ? "✓" : p.error ? "!" : <span className="size-3 animate-spin rounded-full border-2 border-acento border-t-transparent" />}
              </span>
              <span className={cx(!p.ok && !p.error && "text-gris")}>{p.t}</span>
            </motion.li>
          ))}
          <li className="mt-1 flex items-center gap-2 border-t border-linea-suave pt-3 font-mono text-[12px] text-gris"><Server className="size-3.5" />{url}</li>
        </ul>
        <AnimatePresence>
          {salud.isError && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 overflow-hidden">
              <p className="mb-3 rounded-xl border border-ambar/30 bg-ambar-claro px-4 py-3 text-left text-[13.5px] text-ambar-hondo">No responde el servidor de SIMA en esa dirección. Verifique que esté encendido (Iniciar SIMA en el equipo servidor) o cambie la dirección.</p>
              {editar && <form onSubmit={(e) => { e.preventDefault(); guardarUrl(url); setIntento((n) => n + 1); }} className="mb-3 flex gap-2"><Entrada value={url} onChange={(e) => setUrl(e.target.value)} className="font-mono text-[13px]" /><Boton type="submit" variante="acento">Probar</Boton></form>}
              <div className="flex flex-wrap justify-center gap-2">
                <Boton variante="acento" onClick={() => setIntento((n) => n + 1)}><RefreshCw className="size-4" />Reintentar</Boton>
                <Boton variante="contorno" onClick={() => setEditar(!editar)}><Server className="size-4" />Cambiar dirección</Boton>
                <Boton variante="texto" onClick={() => alListo(true)}><WifiOff className="size-4" />Continuar sin conexión</Boton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <p className="absolute bottom-4 text-[12px] text-gris">v4.1 · los datos viven en la base central de SIMA; este equipo solo guarda lo último consultado</p>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ ingreso
function Ingreso({ sinConexion }: { sinConexion: boolean }) {
  const { entrar, aviso } = useAuth();
  const [correo, setCorreo] = useState(""); const [clave, setClave] = useState(""); const [codigo, setCodigo] = useState(""); const [pideCodigo, setPideCodigo] = useState(false);
  const [error, setError] = useState<string | null>(null); const [cargando, setCargando] = useState<string | null>(null);
  const demo = useQuery({ queryKey: ["demo"], queryFn: api.demo, retry: 0, enabled: !sinConexion });
  async function enviar(e?: FormEvent, c = correo, k = clave, cod = codigo) {
    e?.preventDefault(); setError(null); setCargando(c || "x");
    try { await entrar(c, k, cod); } catch (x) { if (x instanceof ApiError && x.datos?.requiere2fa) setPideCodigo(true); setError(mensajeDe(x)); } finally { setCargando(null); }
  }
  const cuentas = (demo.data ?? []).filter((d) => d.canal === "app");
  const maquinas = ["Torno CNC", "Inyectora de plástico", "Cinta transportadora", "Envasadora automática", "Robot industrial articulado", "Prensa hidráulica"];
  return (
    <div className="grid h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="rejilla relative hidden flex-col justify-between overflow-hidden border-r border-linea-suave p-10 lg:flex">
        <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(80% 60% at 20% 10%, var(--s-aurora-a), transparent 60%), radial-gradient(60% 50% at 90% 90%, var(--s-aurora-b), transparent 60%)" }} />
        <div className="relative flex items-center gap-3"><Logo /><div><p className="display text-[22px] font-bold leading-none">SIMA Desktop</p><p className="text-[12.5px] text-gris">Operación y mantenimiento</p></div></div>
        <div className="relative">
          <h1 className="display text-[clamp(44px,4.6vw,72px)] font-extrabold leading-[0.95] tracking-tight">La planta,<br /><span className="texto-degradado">máquina por máquina.</span></h1>
          <p className="mt-4 max-w-[46ch] text-[16px] text-carbon">Estado de cada equipo y PLC, alarmas al segundo y órdenes de trabajo con un flujo guiado: bloqueo, diagnóstico, intervención y cierre.</p>
          <div className="mt-8 grid max-w-[560px] grid-cols-3 gap-3">
            {maquinas.map((m, i) => (
              <motion.div key={m} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08 }} className="tarjeta p-2">
                <Maquina tipo={m} estado={i === 4 ? "alarma" : "operando"} className="h-16 w-full" />
              </motion.div>
            ))}
          </div>
        </div>
        <p className="relative text-[12.5px] text-gris">Si su cuenta se cierra en Personas, la sesión termina aquí mismo.</p>
      </section>
      <section className="flex flex-col justify-center overflow-y-auto px-6 py-10 sm:px-14">
        <motion.form initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} onSubmit={enviar} className="mx-auto w-full max-w-[420px]">
          <h2 className="display text-[36px] font-bold leading-none">Ingresar</h2>
          <p className="mb-6 mt-2 text-gris">Con su correo de trabajo y su clave de SIMA.</p>
          {sinConexion && <p className="mb-4 flex gap-2 rounded-xl border border-ambar/30 bg-ambar-claro px-3 py-2 text-[13.5px] text-ambar-hondo"><WifiOff className="mt-0.5 size-4 shrink-0" />Sin conexión con el servidor: para ingresar se necesita la red de la planta.</p>}
          {aviso && <p role="status" className="mb-4 rounded-xl border border-ambar/30 bg-ambar-claro px-3 py-2 text-[14px] text-ambar-hondo">{aviso}</p>}
          <div className="grid gap-4">
            <Campo etiqueta="Correo corporativo"><Entrada type="email" autoComplete="username" required value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="nombre@manuandina.cl" /></Campo>
            <Campo etiqueta="Clave"><Entrada type="password" autoComplete="current-password" required value={clave} onChange={(e) => setClave(e.target.value)} /></Campo>
            {pideCodigo && <Campo etiqueta="Código de autenticación" ayuda="Los 6 dígitos de la aplicación en su teléfono."><Entrada inputMode="numeric" maxLength={7} autoFocus required value={codigo} onChange={(e) => setCodigo(e.target.value)} /></Campo>}
            {error && <p role="alert" className="rounded-xl border border-rojo/30 bg-rojo-claro px-3 py-2 text-[14px] text-rojo-hondo">{error}</p>}
            <Boton type="submit" variante="acento" tam="l" cargando={cargando === correo && !!correo}>Ingresar<ArrowRight className="size-4" /></Boton>
          </div>
        </motion.form>
        {cuentas.length > 0 && (
          <div className="mx-auto mt-8 w-full max-w-[420px]">
            <p className="mb-2 text-[13px] font-medium text-gris">Cuentas de demostración · un clic para entrar</p>
            <ul className="grid max-h-[290px] gap-1.5 overflow-y-auto pr-1">
              {cuentas.map((d, i) => (
                <motion.li key={d.correo} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.03 }}>
                  <button disabled={!!cargando} onClick={() => void enviar(undefined, d.correo, d.clave)} className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-linea-suave bg-papel px-3 py-2 text-left transition-colors hover:border-acento/50">
                    <Avatar nombre={d.nombre} tam={32} /><span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-semibold">{d.nombre}</span><span className="block truncate text-[12px] text-gris">{d.cargo}</span></span>
                    {cargando === d.correo ? <span className="size-4 animate-spin rounded-full border-2 border-acento border-t-transparent" /> : <ArrowRight className="size-4 text-gris transition-transform group-hover:translate-x-0.5 group-hover:text-acento" />}
                  </button>
                </motion.li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ marco
/** Icono de cada sección del menú. Qué secciones ve cada persona lo decide roles.ts según su cargo y sus capacidades. */
const ICONOS: Record<Seccion, LucideIcon> = {
  inicio: Home, produccion: ClipboardCheck, turno: Users, plan: CalendarDays, mantenimiento: Wrench, explorador: Network, alertas: Siren, reportar: TriangleAlert, seguridad: HardHat,
  calidad: ShieldCheck, calibraciones: BadgeCheck, condicion: Route, automatizacion: Cpu, rutinas: ClipboardCheck, panol: Hammer, traspaso: Repeat, cargo: Briefcase, directorio: BookUser,
};
const PANTALLAS: Record<Seccion, () => ReactNode> = {
  inicio: InicioRol, produccion: Produccion, turno: Turno, plan: Plan, mantenimiento: Mantenimiento, explorador: Explorador, alertas: Alarmas, reportar: () => <Reportar />, seguridad: Seguridad,
  calidad: Calidad, calibraciones: Calibraciones, condicion: Condicion, automatizacion: Automatizacion, rutinas: Rutinas, panol: Panol, traspaso: Traspaso, cargo: MiCargo, directorio: Directorio,
};
const POR_RUTA = Object.fromEntries(Object.entries(RUTA).map(([s, r]) => [r, s as Seccion])) as Record<string, Seccion>;
POR_RUTA["/alarmas"] = "alertas";                                   // enlaces antiguos de notificaciones

function SinAcceso({ seccion }: { seccion: Seccion }) {
  return (
    <div className="grid min-h-[50vh] place-items-center text-center">
      <div><span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-papel-2 text-gris"><Lock className="size-7" /></span>
        <p className="display text-[22px] font-bold">{SECCIONES[seccion].titulo} no es parte de su cargo</p>
        <p className="mx-auto mt-1 max-w-[52ch] text-[14px] text-gris">SIMA muestra a cada persona lo que su trabajo necesita. Si cree que debería tener acceso, pídalo a su jefatura: los permisos se ajustan por cargo.</p>
        <Boton className="mt-5" variante="acento" onClick={() => ir("/")}>Volver a mi inicio</Boton></div>
    </div>
  );
}

function Avisos() {
  const { aviso } = usePlanta();
  const poner = useAviso();
  useEffect(() => { if (aviso) poner(aviso.texto, aviso.nivel === "alarma" ? "error" : "ok"); }, [aviso?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

const COLOR_NIVEL = { alarma: "var(--s-rojo)", aviso: "var(--s-ambar)", info: "var(--s-azul)", ok: "var(--s-verde)" };

function Campana() {
  const { notificaciones, noLeidas, marcarLeidas } = usePlanta();
  const [abierta, setAbierta] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const f = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAbierta(false); }; document.addEventListener("mousedown", f); return () => document.removeEventListener("mousedown", f); }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => { setAbierta(!abierta); marcarLeidas(); }} aria-label="Notificaciones" className="relative grid size-9 cursor-pointer place-items-center rounded-xl border border-linea-suave text-gris transition-colors hover:text-negro">
        <Bell className="size-[18px]" />
        <AnimatePresence>{noLeidas > 0 && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="num absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rojo px-1 text-[10px] font-bold text-white">{noLeidas > 9 ? "9+" : noLeidas}</motion.span>}</AnimatePresence>
      </button>
      <AnimatePresence>
        {abierta && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }} className="tarjeta vidrio absolute right-0 top-11 z-40 w-[380px] overflow-hidden">
            <p className="border-b border-linea-suave px-4 py-3 font-semibold">Notificaciones</p>
            <ul className="max-h-[420px] overflow-y-auto p-1.5">
              {notificaciones.length === 0 && <li className="px-3 py-8 text-center text-[13.5px] text-gris">Sin novedades por ahora.</li>}
              {notificaciones.map((n) => (
                <li key={n.id}><button onClick={() => { if (n.destino) ir(n.destino); setAbierta(false); }} className="flex w-full cursor-pointer gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-papel-2">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: COLOR_NIVEL[n.nivel], boxShadow: `0 0 8px ${COLOR_NIVEL[n.nivel]}` }} />
                  <span className="text-[13px] leading-snug">{n.texto}<span className="block text-[11.5px] text-gris">{new Date(n.ts).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</span></span>
                </button></li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Marco() {
  const { usuario, salir } = useAuth();
  const { conexion, equipos, plcEstado } = usePlanta();
  const pendientes = usePendientes();
  const r = useRuta();
  const base = "/" + (r.split("?")[0].split("/")[1] ?? "");
  // el menú es el de su cargo (roles.ts), filtrado por las capacidades que el servidor le entrega
  const secciones = seccionesDe(usuario);
  const exp = experienciaDe(usuario);
  // si el inicio se llama igual que una sección (p. ej. «Condición de activos»), el inicio se rotula «Inicio»
  const rotuloInicio = secciones.some((s) => s !== "inicio" && SECCIONES[s].titulo === exp.inicio) ? "Inicio" : exp.inicio;
  const nav = secciones.map((s) => ({ s, r: RUTA[s], t: s === "inicio" ? rotuloInicio : SECCIONES[s].titulo, i: ICONOS[s], g: SECCIONES[s].grupo }));
  const activa = (x: string) => (x === "/" ? base === "/" : base === x);
  const alarmas = equipos.filter((e) => e.estado === "alarma").length;
  const plcFalla = Object.values(plcEstado).filter((e) => e === "error").length;
  const grupos = [...new Set(nav.map((n) => n.g))];
  const actual = POR_RUTA[base] ?? "inicio";
  const Pantalla = PANTALLAS[actual];
  const pantalla = secciones.includes(actual) ? <Pantalla /> : <SinAcceso seccion={actual} />;
  return (
    <AvisosProvider>
      <Avisos />
      <div className="flex h-dvh">
        <aside className="flex w-[244px] shrink-0 flex-col border-r border-linea-suave bg-[color-mix(in_srgb,var(--s-superficie)_70%,var(--s-fondo))]">
          <div className="flex items-center gap-3 px-5 pb-4 pt-5"><Logo tam={36} /><div><p className="display text-[19px] font-bold leading-none">SIMA</p><p className="text-[11.5px] text-gris">Desktop · centro de operaciones</p></div></div>
          <nav className="flex-1 overflow-y-auto px-3" aria-label="Secciones">
            {grupos.map((g) => (
              <div key={g} className="mb-3">
                <p className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[.1em] text-gris/80">{g}</p>
                {nav.filter((n) => n.g === g).map((n) => (
                  <a key={n.r} href={`#${n.r}`} aria-current={activa(n.r) ? "page" : undefined} className={cx("relative flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-colors", activa(n.r) ? "text-negro" : "text-gris hover:bg-papel-2 hover:text-negro")}>
                    {activa(n.r) && <motion.span layoutId="rail" className="absolute inset-0 rounded-xl border border-acento/25 bg-acento-claro" transition={{ type: "spring", stiffness: 480, damping: 40 }} />}
                    {activa(n.r) && <motion.span layoutId="rail-barra" className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-acento shadow-[0_0_12px_var(--s-acento)]" transition={{ type: "spring", stiffness: 480, damping: 40 }} />}
                    <n.i className={cx("relative size-[18px]", activa(n.r) && "text-acento")} strokeWidth={1.8} /><span className="relative truncate">{n.t}</span>
                    {n.s === "alertas" && alarmas > 0 && <span className="num relative ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-rojo px-1.5 text-[11px] font-bold text-white">{alarmas}</span>}
                  </a>
                ))}
              </div>
            ))}
          </nav>
          <div className="m-3 rounded-2xl border border-linea-suave bg-papel-2/60 p-3">
            <div className="flex items-center gap-2.5"><Avatar nombre={usuario?.nombre ?? "?"} tam={34} /><div className="min-w-0 flex-1"><p className="truncate text-[13.5px] font-semibold">{usuario?.nombre}</p><p className="truncate text-[11.5px] text-gris">{usuario?.cargo}</p></div>
              <button onClick={() => salir()} aria-label="Cerrar sesión" title="Cerrar sesión" className="grid size-8 cursor-pointer place-items-center rounded-lg text-gris hover:bg-linea-suave hover:text-negro"><LogOut className="size-4" /></button></div>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b border-linea-suave px-6">
            <span className={cx("inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12.5px] font-medium", conexion === "conectado" ? "bg-verde-claro text-verde" : conexion === "reconectando" ? "bg-ambar-claro text-ambar" : "bg-rojo-claro text-rojo")}>
              {conexion === "conectado" ? <PlugZap className="size-3.5" /> : <WifiOff className="size-3.5" />}{conexion === "conectado" ? "En vivo con SIMA" : conexion === "reconectando" ? "Reconectando…" : "Sin conexión · datos guardados"}
            </span>
            <AnimatePresence>{pendientes > 0 && <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} onClick={() => void vaciar()} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-ambar-claro px-3 py-1 text-[12.5px] font-medium text-ambar-hondo" title="Se envían solos al volver la conexión. Toque para reintentar ahora."><RefreshCw className="size-3.5" />{pendientes} por enviar</motion.button>}</AnimatePresence>
            {alarmas > 0 && secciones.includes("alertas") && <button onClick={() => ir("/alertas")} className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-rojo"><CircleAlert className="size-4 animate-parpadeo" />{alarmas} {alarmas === 1 ? "equipo con alarma" : "equipos con alarma"}</button>}
            {plcFalla > 0 && <span className="text-[13px] font-semibold text-rojo">· {plcFalla} PLC en falla</span>}
            <div className="ml-auto flex items-center gap-2"><Campana /></div>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto">
            <AnimatePresence mode="wait"><motion.div key={base} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: CURVA }} className="mx-auto w-full max-w-[1500px] px-6 py-6">{pantalla}</motion.div></AnimatePresence>
          </main>
        </div>
      </div>
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
