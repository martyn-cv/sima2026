import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Bell, BookUser, Briefcase, ClipboardList, Cog, Home, LogOut, Siren } from "lucide-react";
import { Boton, Campo, Entrada, AvisosProvider, cx, mensajeDe, useAviso } from "@sima/ui";
import { api, baseUrl, guardarUrl } from "./lib/api";
import { useAuth } from "./lib/auth";
import { usePlanta } from "./lib/planta";
import { useRuta, ir } from "./ruta";
import { EquipoDetalle, Equipos } from "./pantallas/Equipos";
import { Ordenes } from "./pantallas/Ordenes";
import { Reportar } from "./pantallas/Reportar";
import { Alarmas, Directorio, Inicio, MiCargo } from "./pantallas/Resto";

function Login() {
  const { entrar, aviso } = useAuth();
  const [correo, setCorreo] = useState(""); const [clave, setClave] = useState(""); const [url, setUrl] = useState(baseUrl());
  const [error, setError] = useState<string | null>(null); const [cargando, setCargando] = useState(false); const [ajustes, setAjustes] = useState(false);
  const demo = useQuery({ queryKey: ["demo", url], queryFn: api.demo, retry: 0 });
  async function enviar(e?: FormEvent, c = correo, k = clave) {
    e?.preventDefault(); guardarUrl(url); setError(null); setCargando(true);
    try { await entrar(c, k); } catch (x) { setError(mensajeDe(x)); } finally { setCargando(false); }
  }
  const app = (demo.data ?? []).filter((d) => d.canal === "app");
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1fr]">
      <section className="relative hidden flex-col justify-between bg-negro p-12 text-white lg:flex">
        <div className="flex items-center gap-3"><span className="grid size-11 place-items-center bg-rojo display text-3xl font-bold leading-none">S</span><span className="text-[15px] text-[#b4b8c0]">SIMA · Terreno</span></div>
        <h1 className="display text-[clamp(64px,8vw,130px)] font-bold leading-[0.88] tracking-tight">Lo que pasa<br />en la planta,<br />en su mano.</h1>
        <p className="max-w-[40ch] text-[18px] text-[#b4b8c0]">Equipos, alarmas y órdenes de trabajo al segundo. Si su cuenta se cierra, la sesión termina aquí mismo.</p>
      </section>
      <section className="flex flex-col justify-center bg-papel px-6 py-10 sm:px-14">
        <form onSubmit={enviar} className="mx-auto w-full max-w-[400px]">
          <h2 className="display text-[44px] font-bold leading-none">Ingresar</h2>
          <p className="mb-6 mt-2 text-gris">Con su correo de trabajo y su clave.</p>
          {aviso && <p role="status" className="mb-4 border-l-[3px] border-ambar bg-ambar-claro px-3 py-2 text-[14px]">{aviso}</p>}
          <div className="grid gap-4">
            <Campo etiqueta="Correo corporativo"><Entrada type="email" autoComplete="username" required value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="nombre@manuandina.cl" /></Campo>
            <Campo etiqueta="Clave"><Entrada type="password" autoComplete="current-password" required value={clave} onChange={(e) => setClave(e.target.value)} /></Campo>
            {error && <p role="alert" className="border-l-[3px] border-rojo bg-rojo-claro px-3 py-2 text-[14px] text-rojo-hondo">{error}</p>}
            <Boton type="submit" variante="rojo" cargando={cargando} className="h-12">Ingresar</Boton>
            <button type="button" onClick={() => setAjustes(!ajustes)} className="cursor-pointer text-left text-[14px] text-gris underline decoration-linea underline-offset-2">Dirección del servidor</button>
            {ajustes && <Campo etiqueta="API de SIMA"><Entrada value={url} onChange={(e) => setUrl(e.target.value)} onBlur={() => guardarUrl(url)} /></Campo>}
          </div>
        </form>
        {app.length > 0 && (
          <div className="mx-auto mt-8 w-full max-w-[400px]"><p className="text-[13px] font-medium text-gris">Cuentas de demostración de terreno</p>
            <ul className="mt-2 max-h-[300px] divide-y divide-linea-suave overflow-auto border-y border-linea-suave">{app.map((d) => <li key={d.correo}><button disabled={cargando} onClick={() => void enviar(undefined, d.correo, d.clave)} className="flex w-full cursor-pointer items-center justify-between gap-3 px-1 py-2 text-left hover:bg-chapa/70"><span className="min-w-0"><span className="block truncate font-medium">{d.nombre}</span><span className="block truncate text-[13px] text-gris">{d.cargo}</span></span><span className="shrink-0 text-[13px] font-medium text-rojo">Entrar</span></button></li>)}</ul>
          </div>
        )}
      </section>
    </div>
  );
}

const NAV = [{ r: "/", t: "Inicio", i: Home }, { r: "/equipos", t: "Equipos", i: Cog }, { r: "/alarmas", t: "Alarmas", i: Bell }, { r: "/ordenes", t: "Órdenes", i: ClipboardList }, { r: "/cargo", t: "Mi cargo", i: Briefcase }, { r: "/directorio", t: "Directorio", i: BookUser }];

function Avisos() {
  const { aviso } = usePlanta();
  const poner = useAviso();
  useEffect(() => { if (aviso) poner(aviso.texto, aviso.nivel === "alarma" ? "error" : "ok"); }, [aviso?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function Marco() {
  const { usuario, salir } = useAuth();
  const { conexion, equipos } = usePlanta();
  const r = useRuta();
  const activa = (x: string) => (x === "/" ? r === "/" : r.startsWith(x));
  const alarmas = equipos.filter((e) => e.estado === "alarma").length;
  const [, p1, p2] = r.split("/");
  const pantalla = p1 === "equipos" && p2 ? <EquipoDetalle codigo={decodeURIComponent(p2)} /> : p1 === "equipos" ? <Equipos /> : p1 === "alarmas" ? <Alarmas /> : p1 === "ordenes" ? <Ordenes /> : p1 === "reportar" ? <Reportar equipo={p2} /> : p1 === "cargo" ? <MiCargo /> : p1 === "directorio" ? <Directorio /> : <Inicio />;
  return (
    <AvisosProvider>
      <Avisos />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] flex-col bg-negro lg:flex">
        <div className="flex items-center gap-2.5 px-5 pb-5 pt-6"><span className="grid size-9 place-items-center bg-rojo display text-[26px] font-bold leading-none text-white">S</span><div><p className="display text-[28px] font-bold leading-[0.9] text-white">SIMA</p><p className="text-[12px] text-[#9aa0a9]">Terreno</p></div></div>
        <nav className="flex-1 px-3" aria-label="Secciones">{NAV.map((n) => (
          <a key={n.r} href={`#${n.r}`} aria-current={activa(n.r) ? "page" : undefined} className={cx("relative flex h-11 items-center gap-3 px-3 text-[16px] transition-colors", activa(n.r) ? "text-white" : "text-[#b4b8c0] hover:text-white")}>
            {activa(n.r) && <motion.span layoutId="rail" className="absolute inset-0 bg-[#1d1e22]" transition={{ type: "spring", stiffness: 520, damping: 42 }} />}
            {activa(n.r) && <motion.span layoutId="rail-barra" className="absolute inset-y-0 left-0 w-[3px] bg-rojo" transition={{ type: "spring", stiffness: 520, damping: 42 }} />}
            <n.i className="relative size-5" strokeWidth={1.75} /><span className="relative">{n.t}</span>
            {n.r === "/alarmas" && alarmas > 0 && <span className="num relative ml-auto grid h-5 min-w-5 place-items-center bg-rojo px-1 text-[12px] font-semibold text-white">{alarmas}</span>}
          </a>))}
        </nav>
        <div className="border-t border-[#26272b] p-4"><div className="flex items-center gap-3"><div className="min-w-0 flex-1"><p className="truncate font-medium text-white">{usuario?.nombre}</p><p className="truncate text-[13px] text-[#9aa0a9]">{usuario?.cargo}</p></div><button onClick={() => salir()} aria-label="Cerrar sesión" className="grid size-9 cursor-pointer place-items-center text-[#9aa0a9] hover:text-white"><LogOut className="size-[18px]" /></button></div></div>
      </aside>
      <div className="min-h-dvh pb-20 lg:pb-0 lg:pl-[220px]">
        <div className="sticky top-0 z-20 flex h-11 items-center gap-3 border-b border-linea bg-papel px-4 lg:px-9">
          <span className="flex items-center gap-2 text-[14px] font-medium"><span className={cx("size-2 rounded-full", conexion === "conectado" ? "animate-latido bg-verde" : conexion === "reconectando" ? "animate-parpadeo bg-ambar" : "bg-gris")} />{conexion === "conectado" ? "En vivo" : conexion === "reconectando" ? "Reconectando…" : "Sin conexión en vivo"}</span>
          {alarmas > 0 && <button onClick={() => ir("/alarmas")} className="flex cursor-pointer items-center gap-1.5 text-[14px] font-semibold text-rojo"><Siren className="size-4" />{alarmas} {alarmas === 1 ? "equipo con alarma" : "equipos con alarma"}</button>}
          <button onClick={() => salir()} className="ml-auto text-[14px] text-gris underline decoration-linea underline-offset-2 hover:text-negro lg:hidden">Salir</button>
        </div>
        <main className="mx-auto w-full max-w-[1200px] px-4 py-6 lg:px-9"><AnimatePresence mode="wait"><motion.div key={r} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>{pantalla}</motion.div></AnimatePresence></main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-linea bg-papel lg:hidden" aria-label="Secciones">{NAV.map((n) => (
        <a key={n.r} href={`#${n.r}`} aria-current={activa(n.r) ? "page" : undefined} className={cx("flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium", activa(n.r) ? "text-rojo" : "text-gris")}><n.i className="size-5" strokeWidth={1.75} />{n.t}</a>))}
      </nav>
    </AvisosProvider>
  );
}

export function App() {
  const { usuario, cargando } = useAuth();
  if (cargando) return <div className="grid min-h-dvh place-items-center"><span className="display text-3xl font-bold text-linea">SIMA</span></div>;
  return usuario ? <Marco /> : <Login />;
}
