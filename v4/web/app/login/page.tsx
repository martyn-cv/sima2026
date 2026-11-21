"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Cpu, Factory, ShieldCheck, Users } from "lucide-react";
import { ApiError } from "@sima/cliente";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Avatar, Boton, Campo, CURVA, Entrada, FondoAurora, mensajeDe } from "@/components/ui";

const RASGOS = [
  { icono: Users, t: "104 personas y 64 cargos", d: "Contratos, remuneraciones y cuentas ligadas" },
  { icono: Factory, t: "15 equipos en vivo", d: "Alarmas y órdenes de trabajo automáticas" },
  { icono: Cpu, t: "4 controladores PLC", d: "Rack, entradas, salidas y escalera" },
  { icono: ShieldCheck, t: "Acceso por cargo", d: "Si alguien deja la empresa, su cuenta se cierra" },
];

/** Silueta de la cordillera que se dibuja al cargar. */
function Cordillera() {
  return (
    <svg viewBox="0 0 800 220" className="h-auto w-full" aria-hidden>
      <defs>
        <linearGradient id="cord" x1="0" x2="1"><stop offset="0%" stopColor="var(--s-acento)" /><stop offset="100%" stopColor="var(--s-cobre)" /></linearGradient>
        <linearGradient id="cordf" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--s-acento)" stopOpacity=".22" /><stop offset="100%" stopColor="var(--s-acento)" stopOpacity="0" /></linearGradient>
      </defs>
      <motion.path d="M0 190 L70 150 L120 165 L190 90 L240 120 L300 40 L350 95 L410 70 L470 130 L540 60 L600 110 L660 85 L720 140 L800 120 L800 220 L0 220 Z" fill="url(#cordf)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 1.2 }} />
      <motion.path d="M0 190 L70 150 L120 165 L190 90 L240 120 L300 40 L350 95 L410 70 L470 130 L540 60 L600 110 L660 85 L720 140 L800 120" fill="none" stroke="url(#cord)" strokeWidth="2.5" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.2, ease: CURVA }} />
      {[300, 540, 190].map((x, i) => <motion.circle key={x} cx={x} cy={[40, 60, 90][i]} r="4" fill="var(--s-acento)" initial={{ scale: 0 }} animate={{ scale: [0, 1.4, 1] }} transition={{ delay: 1.6 + i * 0.2 }} />)}
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
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState<string | null>(null);
  const [sacudir, setSacudir] = useState(0);
  const { data: demo = [] } = useQuery({ queryKey: ["demo"], queryFn: api.demo, retry: 0 });
  useEffect(() => { if (usuario) router.replace("/"); }, [usuario, router]);

  async function enviar(e?: FormEvent, c = correo, k = clave, cod = codigo) {
    e?.preventDefault();
    setError(null); setCargando(c);
    try { await entrar(c, k, cod); }
    catch (x) { if (x instanceof ApiError && x.datos?.requiere2fa) setPideCodigo(true); setError(mensajeDe(x)); setSacudir((n) => n + 1); }
    finally { setCargando(null); }
  }
  const web = demo.filter((d) => d.canal === "web");

  return (
    <div className="relative grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <FondoAurora />
      <section className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-acento to-cobre font-display text-[26px] font-extrabold text-sobre-negro shadow-[0_10px_30px_-8px_var(--s-acento)]">S</span>
          <span className="text-[15px] text-gris">Manufacturas Andina S.A.</span>
        </motion.div>
        <div>
          <motion.h1 initial={{ opacity: 0, y: 30, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.9, ease: CURVA }}
            className="display texto-degradado text-[clamp(96px,11vw,176px)] font-extrabold leading-[0.85] tracking-[-0.04em]">SIMA</motion.h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.6 }} className="mt-5 max-w-[46ch] text-[19px] leading-relaxed text-carbon">
            Personas, contratos, planta y controladores en una sola base de datos. Lo que pasa en la planta se ve aquí al segundo.
          </motion.p>
          <ul className="mt-9 grid max-w-[620px] grid-cols-2 gap-3">
            {RASGOS.map((r, i) => (
              <motion.li key={r.t} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 + i * 0.09, ease: CURVA }} className="tarjeta flex gap-3 p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-acento-claro text-acento"><r.icono className="size-5" /></span>
                <span><span className="block font-semibold">{r.t}</span><span className="block text-[13px] text-gris">{r.d}</span></span>
              </motion.li>
            ))}
          </ul>
        </div>
        <Cordillera />
      </section>

      <section className="relative flex flex-col justify-center px-6 py-10 sm:px-14">
        <motion.div key={sacudir} animate={sacudir ? { x: [0, -10, 9, -6, 4, 0] } : { opacity: [0, 1], y: [16, 0] }} transition={{ duration: 0.45 }} className="tarjeta vidrio mx-auto w-full max-w-[460px] p-8">
          <h2 className="display text-[38px] font-bold leading-none">Bienvenido</h2>
          <p className="mb-6 mt-2 text-gris">Ingrese con su correo corporativo.</p>
          {aviso && <p role="status" className="mb-4 rounded-xl border border-ambar/30 bg-ambar-claro px-3 py-2 text-[14px] text-ambar-hondo">{aviso}</p>}
          <form onSubmit={enviar} className="grid gap-4">
            <Campo etiqueta="Correo corporativo"><Entrada type="email" autoComplete="username" required value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="nombre@manuandina.cl" /></Campo>
            <Campo etiqueta="Clave"><Entrada type="password" autoComplete="current-password" required value={clave} onChange={(e) => setClave(e.target.value)} /></Campo>
            <AnimatePresence>{pideCodigo && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}><Campo etiqueta="Código de la aplicación de autenticación" ayuda="Los 6 dígitos que muestra su teléfono."><Entrada inputMode="numeric" autoComplete="one-time-code" maxLength={7} autoFocus required value={codigo} onChange={(e) => setCodigo(e.target.value)} /></Campo></motion.div>}</AnimatePresence>
            {error && <p role="alert" className="rounded-xl border border-rojo/30 bg-rojo-claro px-3 py-2 text-[14px] text-rojo-hondo">{error}</p>}
            <Boton type="submit" variante="acento" tam="l" cargando={cargando === correo && !!correo}>Ingresar<ArrowRight className="size-4" /></Boton>
          </form>
        </motion.div>

        {web.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mx-auto mt-8 w-full max-w-[460px]">
            <p className="mb-2 text-[13px] font-medium text-gris">Cuentas de demostración · un clic para entrar</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {web.map((d, i) => (
                <motion.li key={d.correo} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.05 }}>
                  <button type="button" disabled={!!cargando} onClick={() => { setCorreo(d.correo); setClave(d.clave); void enviar(undefined, d.correo, d.clave); }}
                    className="tarjeta group flex w-full cursor-pointer items-center gap-3 p-2.5 text-left transition-colors hover:border-acento/50">
                    <Avatar nombre={d.nombre} tam={36} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-semibold">{d.nombre}</span><span className="block truncate text-[12px] text-gris">{d.cargo}</span></span>
                    {cargando === d.correo ? <span className="size-4 animate-spin rounded-full border-2 border-acento border-t-transparent" /> : <ArrowRight className="size-4 text-gris transition-transform group-hover:translate-x-0.5 group-hover:text-acento" />}
                  </button>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </section>
    </div>
  );
}
