"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Boton, Campo, Entrada, mensajeDe } from "@/components/ui";

export default function Login() {
  const { entrar, usuario, aviso } = useAuth();
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [sacudir, setSacudir] = useState(0);
  const { data: demo = [] } = useQuery({ queryKey: ["demo"], queryFn: api.demo, retry: 0 });

  useEffect(() => { if (usuario) router.replace("/"); }, [usuario, router]);

  async function enviar(e?: FormEvent, c = correo, k = clave) {
    e?.preventDefault();
    setError(null); setCargando(true);
    try { await entrar(c, k); }
    catch (x) { setError(mensajeDe(x)); setSacudir((n) => n + 1); }
    finally { setCargando(false); }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.15fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-negro p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center bg-rojo display text-3xl font-bold leading-none">S</span>
          <span className="text-[15px] text-[#b4b8c0]">Manufacturas Andina S.A.</span>
        </div>
        <div>
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
            className="display text-[clamp(72px,9vw,148px)] font-bold leading-[0.88] tracking-tight">
            Personas,<br />contratos<br />y planta.
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.6 }} className="mt-8 max-w-[44ch] text-[18px] text-[#b4b8c0]">
            Una sola base de datos para la administración y el personal de terreno. Si alguien deja la empresa, su cuenta se cierra en todas partes.
          </motion.p>
        </div>
        <div className="flex items-end gap-[5px]" aria-hidden>
          {Array.from({ length: 15 }).map((_, i) => (
            <motion.span key={i} initial={{ scaleY: 0.2, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }} transition={{ delay: 0.6 + i * 0.05, duration: 0.5 }}
              style={{ originY: 1, height: 18 + ((i * 7) % 5) * 7 }} className={i === 9 ? "w-[9px] bg-rojo" : "w-[9px] bg-[#2a2b30]"} />
          ))}
        </div>
      </section>

      <section className="flex flex-col justify-center bg-papel px-6 py-10 sm:px-14">
        <motion.form key={sacudir} onSubmit={enviar} animate={sacudir ? { x: [0, -10, 9, -6, 4, 0] } : {}} transition={{ duration: 0.4 }} className="mx-auto w-full max-w-[400px]">
          <h2 className="display text-[44px] font-bold leading-none">Ingresar</h2>
          <p className="mb-6 mt-2 text-gris">Administración de personas, contratos, remuneraciones y planta.</p>
          {aviso && <p role="status" className="mb-4 border-l-[3px] border-ambar bg-ambar-claro px-3 py-2 text-[14px]">{aviso}</p>}
          <div className="flex flex-col gap-4">
            <Campo etiqueta="Correo corporativo"><Entrada type="email" autoComplete="username" required value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="nombre@manuandina.cl" /></Campo>
            <Campo etiqueta="Clave"><Entrada type="password" autoComplete="current-password" required value={clave} onChange={(e) => setClave(e.target.value)} /></Campo>
            {error && <p role="alert" className="border-l-[3px] border-rojo bg-rojo-claro px-3 py-2 text-[14px] text-rojo-hondo">{error}</p>}
            <Boton type="submit" variante="rojo" cargando={cargando} className="mt-1 h-11">Ingresar</Boton>
          </div>
        </motion.form>

        {demo.filter((d) => d.canal === "web").length > 0 && (
          <div className="mx-auto mt-10 w-full max-w-[400px]">
            <p className="text-[13px] font-medium text-gris">Cuentas de demostración de la web</p>
            <ul className="mt-2 divide-y divide-linea-suave border-y border-linea-suave">
              {demo.filter((d) => d.canal === "web").map((d) => (
                <li key={d.correo}>
                  <button type="button" disabled={cargando} onClick={() => { setCorreo(d.correo); setClave(d.clave); void enviar(undefined, d.correo, d.clave); }}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 px-1 py-2 text-left transition-colors hover:bg-chapa/70">
                    <span className="min-w-0"><span className="block truncate font-medium">{d.nombre}</span><span className="block truncate text-[13px] text-gris">{d.cargo}</span></span>
                    <span className="shrink-0 text-[13px] font-medium text-rojo">Entrar</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
