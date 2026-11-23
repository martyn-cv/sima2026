"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowRight, BarChart3, Check, Eye, EyeOff, FileSignature, KeyRound, Loader2, Lock, Search, ShieldCheck, Users, WifiOff } from "lucide-react";
import { ApiError } from "@sima/cliente";
import { api, baseUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Avatar, Boton, Campo, CURVA, Entrada, MarcaSimulado, cx, mensajeDe } from "@/components/ui";

const VERSION = "4.2.0";

const AREAS = [
  { icono: Users, t: "Personas y contratos", d: "Fichas, contratos, desvinculaciones y cuentas de acceso" },
  { icono: FileSignature, t: "Remuneraciones", d: "Liquidaciones, cierre del período y aprobación" },
  { icono: BarChart3, t: "Indicadores y gestión", d: "Producción, calidad, seguridad, mantenimiento y logística" },
  { icono: ShieldCheck, t: "Control y auditoría", d: "Permisos por cargo, registro de accesos y de cambios" },
];

/** Gráfico de barras en trazo fino: fondo sutil de gestión para la pantalla de ingreso (ilustrativo). */
function Esquema() {
  const barras = [38, 52, 46, 64, 58, 72, 66, 80, 74, 88];
  return (
    <svg viewBox="0 0 400 120" className="h-auto w-full max-w-[520px]" aria-hidden fill="none">
      {[20, 50, 80, 110].map((y) => <path key={y} d={`M0 ${y} H400`} stroke="var(--s-borde-suave)" />)}
      {barras.map((h, i) => <rect key={i} x={12 + i * 38} y={110 - h} width="20" height={h} rx="2" fill="var(--s-borde)" opacity={i === barras.length - 1 ? 1 : 0.7} />)}
      <path d={`M22 ${110 - barras[0] - 8} ${barras.map((h, i) => `L${22 + i * 38} ${110 - h - 8}`).join(" ")}`} stroke="var(--s-acento)" strokeWidth="1.6" />
    </svg>
  );
}

export default function Login() {
  const { entrar, usuario, aviso } = useAuth();
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [codigo, setCodigo] = useState("");
  const [pideCodigo, setPideCodigo] = useState(false);
  const [ver, setVer] = useState(false);
  const [mayus, setMayus] = useState(false);
  const [recuperar, setRecuperar] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState<string | null>(null);
  const salud = useQuery({ queryKey: ["salud"], queryFn: async () => { const r = await fetch(`${baseUrl()}/salud`); if (!r.ok) throw new Error(); return r.json(); }, retry: 0, refetchInterval: 20_000 });
  const { data: demo = [] } = useQuery({ queryKey: ["demo"], queryFn: api.demo, retry: 0 });
  useEffect(() => { if (usuario) router.replace("/"); }, [usuario, router]);

  async function enviar(e?: FormEvent, c = correo, k = clave, cod = codigo) {
    e?.preventDefault();
    setError(null); setCargando(c);
    try { await entrar(c, k, cod); }
    catch (x) { if (x instanceof ApiError && x.datos?.requiere2fa) setPideCodigo(true); setError(mensajeDe(x)); }
    finally { setCargando(null); }
  }
  const enLinea = salud.isSuccess;
  const web = demo.filter((d) => d.canal === "web" && `${d.nombre} ${d.cargo}`.toLowerCase().includes(filtro.toLowerCase()));

  return (
    <div className="grid min-h-dvh bg-chapa lg:grid-cols-[minmax(0,1fr)_520px]">
      <section className="relative hidden flex-col justify-between border-r border-linea-suave p-12 lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-md bg-acento text-sobre-negro" aria-hidden><svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 7h11a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h11" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg></span>
          <div><p className="text-[15px] font-semibold leading-tight">SIMA Web</p><p className="text-[12px] text-gris">Gestión · Manufacturas Andina</p></div>
        </div>
        <div className="max-w-[600px]">
          <p className="t-etiqueta text-acento">Gestión administrativa y de planta</p>
          <h1 className="mt-3 text-[34px] font-semibold leading-[1.15] tracking-tight">Personas, contratos, indicadores y control en una sola base de datos.</h1>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {AREAS.map((r) => (
              <li key={r.t} className="flex gap-3 rounded-md border border-linea-suave bg-papel p-3.5">
                <r.icono className="mt-0.5 size-4 shrink-0 text-acento" />
                <span><span className="block text-[13.5px] font-semibold">{r.t}</span><span className="block text-[12.5px] text-gris">{r.d}</span></span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <Esquema />
          <p className="mt-4 text-[12px] text-apagado">La operación en planta (órdenes de trabajo, bloqueos y liberaciones en terreno) se hace en SIMA Desktop. Cada plataforma tiene su propia autorización y sesión.</p>
        </div>
      </section>

      <section className="flex flex-col bg-fondo-2 px-6 py-8 sm:px-12">
        <div className="mb-10 flex items-center justify-between lg:justify-end">
          <span className="flex items-center gap-2 font-semibold lg:hidden">SIMA Web</span>
          <span role="status" className={cx("inline-flex h-6 items-center gap-1.5 rounded px-2 text-[11.5px] font-medium", salud.isLoading ? "text-gris" : enLinea ? "text-verde" : "bg-rojo-claro text-rojo")}>
            {salud.isLoading ? <Loader2 className="size-3 animate-spin" /> : enLinea ? <span className="size-1.5 rounded-full bg-verde" /> : <WifiOff className="size-3" />}
            {salud.isLoading ? "Comprobando servidor" : enLinea ? "Servidor en línea" : "Servidor sin respuesta"}
          </span>
        </div>
        <motion.form initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: CURVA }} onSubmit={enviar} className="w-full">
          <h2 className="t-pantalla">Ingresar a SIMA Web</h2>
          <p className="mb-6 mt-1 text-[13px] text-gris">Con su correo corporativo y su clave. Su cuenta debe estar autorizada para SIMA Web.</p>
          {!salud.isLoading && !enLinea && <p className="mb-4 flex gap-2 rounded-md border border-ambar/30 bg-ambar-claro px-3 py-2 text-[13px] text-ambar-hondo"><WifiOff className="mt-0.5 size-4 shrink-0" />No responde el servidor de SIMA. Intente de nuevo en unos minutos o avise a Soporte TI.</p>}
          {aviso && <p role="status" className="mb-4 flex gap-2 rounded-md border border-ambar/30 bg-ambar-claro px-3 py-2 text-[13px] text-ambar-hondo"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{aviso}</p>}
          <div className="grid gap-4">
            <Campo etiqueta="Correo corporativo"><Entrada type="email" autoComplete="username" required autoFocus value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="nombre@manuandina.cl" /></Campo>
            <Campo etiqueta="Clave" error={mayus ? "Bloq Mayús está activado" : null}>
              <div className="relative">
                <Entrada type={ver ? "text" : "password"} autoComplete="current-password" required value={clave} onChange={(e) => setClave(e.target.value)} className="pr-10" aria-invalid={!!error || undefined}
                  onKeyUp={(e) => setMayus(e.getModifierState?.("CapsLock") ?? false)} />
                <button type="button" onClick={() => setVer(!ver)} aria-label={ver ? "Ocultar clave" : "Mostrar clave"} aria-pressed={ver} className="absolute inset-y-0 right-0 grid w-9 cursor-pointer place-items-center text-gris hover:text-negro">{ver ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
              </div>
            </Campo>
            <AnimatePresence>{pideCodigo && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: 0.2 }}><Campo etiqueta="Código de la aplicación de autenticación" ayuda="Los 6 dígitos que muestra su teléfono."><Entrada inputMode="numeric" autoComplete="one-time-code" maxLength={7} autoFocus required value={codigo} onChange={(e) => setCodigo(e.target.value)} className="font-mono tracking-[.3em]" /></Campo></motion.div>}</AnimatePresence>
            {error && <p role="alert" className="flex gap-2 rounded-md border border-rojo/30 bg-rojo-claro px-3 py-2 text-[13px] text-rojo-hondo"><Lock className="mt-0.5 size-4 shrink-0" />{error}</p>}
            <Boton type="submit" variante="acento" tam="l" cargando={cargando === correo && !!correo} disabled={!enLinea && !salud.isLoading}>Ingresar<ArrowRight className="size-4" /></Boton>
            <button type="button" onClick={() => setRecuperar(!recuperar)} aria-expanded={recuperar} className="flex w-fit cursor-pointer items-center gap-1.5 text-[12.5px] text-gris hover:text-negro"><KeyRound className="size-3.5" />¿Olvidó su clave?</button>
            <AnimatePresence>
              {recuperar && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden rounded-md border border-linea-suave bg-papel-2 px-3 py-2.5 text-[12.5px] text-carbon">
                  Pida a Soporte TI que restablezca su clave: le entregará una clave temporal y SIMA le pedirá cambiarla al ingresar. Por seguridad, la clave nunca se envía por correo.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.form>

        {demo.some((d) => d.canal === "web") && (
          <div className="mt-8 border-t border-linea-suave pt-5">
            <div className="mb-2 flex items-center gap-2"><p className="t-etiqueta flex-1">Cuentas de demostración</p><MarcaSimulado texto="Datos simulados" /></div>
            <div className="relative mb-2"><Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gris" /><Entrada value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Filtrar por nombre o cargo" className="h-8 pl-8 text-[12.5px]" aria-label="Filtrar cuentas de demostración" /></div>
            <ul className="grid max-h-[260px] gap-px overflow-y-auto rounded-md border border-linea-suave bg-linea-suave">
              {web.map((d) => (
                <li key={d.correo}>
                  <button type="button" disabled={!!cargando || !enLinea} onClick={() => { setCorreo(d.correo); setClave(d.clave); void enviar(undefined, d.correo, d.clave); }}
                    className="group flex w-full cursor-pointer items-center gap-2.5 bg-papel px-3 py-2 text-left transition-colors duration-150 hover:bg-papel-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <Avatar nombre={d.nombre} tam={26} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-[12.5px] font-medium">{d.nombre}</span><span className="block truncate text-[11.5px] text-gris">{d.cargo}</span></span>
                    {cargando === d.correo ? <Loader2 className="size-3.5 animate-spin text-acento" /> : <ArrowRight className="size-3.5 text-apagado transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-acento" />}
                  </button>
                </li>
              ))}
              {web.length === 0 && <li className="bg-papel px-3 py-4 text-center text-[12.5px] text-gris">Sin cuentas que coincidan.</li>}
            </ul>
            <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-apagado"><Check className="size-3" />Personas y cargos ficticios de la empresa de demostración. Solo se listan cuentas autorizadas para SIMA Web.</p>
          </div>
        )}
        <p className="mt-auto pt-8 text-[11.5px] text-apagado">SIMA Web {VERSION} · si Personas revoca su acceso o cierra su cuenta, la sesión termina de inmediato.</p>
      </section>
    </div>
  );
}
