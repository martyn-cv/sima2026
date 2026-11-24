"use client";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Check, Lock, TriangleAlert } from "lucide-react";
import { clp, fecha } from "@sima/cliente";
import { api } from "@/lib/api";
import { CAUSALES } from "@/lib/listas";
import { Boton, Campo, Dialogo, Entrada, Estado, Seleccion, AreaTexto, mensajeDe, useAviso } from "./ui";

interface Persona { id: string; nombre: string; cargo: string; estadoCuenta: string }

/**
 * Desvincular a una persona es la acción más delicada del sistema: cierra su cuenta en la web y en la app.
 * El diálogo dice qué va a pasar antes de hacerlo y, al terminar, muestra cada efecto confirmado.
 */
export function DialogoDesvincular({ persona, abierto, onCerrar }: { persona: Persona; abierto: boolean; onCerrar: () => void }) {
  const hoy = new Date().toISOString().slice(0, 10);
  const [paso, setPaso] = useState<"datos" | "confirmar" | "hecho">("datos");
  const [f, setF] = useState({ fecha: hoy, causal: CAUSALES[0], aviso: true, finiquito: "", obs: "" });
  const [cuenta, setCuenta] = useState(persona.estadoCuenta);
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();
  const aviso = useAviso();
  const programada = f.fecha > hoy;

  // solo al abrir: al terminar, los datos de la persona se refrescan y no deben devolver el diálogo al primer paso
  useEffect(() => { if (abierto) { setPaso("datos"); setError(null); setCuenta(persona.estadoCuenta); } }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  const m = useMutation({
    mutationFn: () => api.post<{ estadoCuenta: string }>("/api/terminos", { trabajadorId: persona.id, fechaTermino: f.fecha, causal: f.causal, avisoPrevio: f.aviso, finiquitoMonto: Number(f.finiquito || 0), observaciones: f.obs }),
    onSuccess: (r) => {
      setPaso("hecho");
      setTimeout(() => setCuenta(r.estadoCuenta), 900);                    // la etiqueta gira de Activa a Cerrada después de mostrarse
      for (const k of ["trabajadores", "trabajador", "panel", "cuentas", "terminos", "directorio", "contratos", "organigrama", "cargos", "auditoria"]) void qc.invalidateQueries({ queryKey: [k] });
    },
    onError: (e) => { setError(mensajeDe(e)); setPaso("datos"); aviso(mensajeDe(e), "error"); },
  });

  const efectos = programada
    ? [`La cuenta de ${persona.nombre} se cerrará sola el ${fecha(f.fecha)}.`, "Hasta esa fecha podrá seguir usando la web y la app.", "Su contrato actual terminará en esa fecha.", "Después dejará de aparecer en la dotación activa y en el directorio."]
    : ["Su cuenta de SIMA queda cerrada.", "Las sesiones abiertas en la web y en la app terminan ahora.", "Su contrato actual queda terminado.", "Deja de aparecer en la dotación activa y en el directorio."];

  return (
    <Dialogo abierto={abierto} onCerrar={onCerrar} ancho={620} titulo={paso === "hecho" ? (programada ? "Desvinculación programada" : "Desvinculación registrada") : `Desvincular a ${persona.nombre}`}
      pie={paso === "datos" ? (<><Boton variante="contorno" onClick={onCerrar}>Cancelar</Boton><Boton variante="negro" onClick={() => setPaso("confirmar")} disabled={!f.fecha || !f.causal}>Revisar</Boton></>)
        : paso === "confirmar" ? (<><Boton variante="contorno" onClick={() => setPaso("datos")}>Volver</Boton><Boton variante="peligro" cargando={m.isPending} onClick={() => m.mutate()}>{programada ? "Programar desvinculación" : "Desvincular y cerrar cuenta"}</Boton></>)
        : <Boton onClick={onCerrar}>Listo</Boton>}>
      {error && <p role="alert" className="mb-3 border-l-[3px] border-rojo bg-rojo-claro px-3 py-2 text-[14px] text-rojo-hondo">{error}</p>}

      {paso === "datos" && (
        <div className="grid gap-4 pt-1 sm:grid-cols-2">
          <p className="text-gris sm:col-span-2">{persona.cargo}</p>
          <Campo etiqueta="Fecha de término"><Entrada type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></Campo>
          <Campo etiqueta="Finiquito (CLP)"><Entrada type="number" min={0} value={f.finiquito} onChange={(e) => setF({ ...f, finiquito: e.target.value })} /></Campo>
          <Campo etiqueta="Causal de término" className="sm:col-span-2"><Seleccion value={f.causal} onChange={(e) => setF({ ...f, causal: e.target.value })}>{CAUSALES.map((c) => <option key={c}>{c}</option>)}</Seleccion></Campo>
          <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" className="size-4 accent-[var(--s-acento)]" checked={f.aviso} onChange={(e) => setF({ ...f, aviso: e.target.checked })} />Se entregó aviso previo</label>
          <Campo etiqueta="Observaciones" className="sm:col-span-2"><AreaTexto value={f.obs} onChange={(e) => setF({ ...f, obs: e.target.value })} /></Campo>
        </div>
      )}

      {paso === "confirmar" && (
        <div className="space-y-4 pt-1">
          <div className="flex gap-3 border-l-[3px] border-rojo bg-rojo-claro p-4">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-rojo" />
            <div>
              <p className="font-semibold">{programada ? "Se programará el cierre de la cuenta." : "Esto cierra la cuenta ahora."}</p>
              <p className="text-[14px]">{fecha(f.fecha)} · {f.causal}{f.finiquito ? ` · finiquito ${clp(Number(f.finiquito))}` : ""}</p>
            </div>
          </div>
          <ul className="space-y-2">{efectos.map((t) => <li key={t} className="flex gap-2.5"><span className="mt-2 size-1.5 shrink-0 bg-negro" />{t}</li>)}</ul>
          <p className="text-[14px] text-gris">Si fue un error, Personas puede revertir la desvinculación y la cuenta vuelve a abrirse.</p>
        </div>
      )}

      {paso === "hecho" && (
        <div className="space-y-5 pt-2">
          <div className="flex items-center gap-4 bg-chapa p-4">
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.2 }}
              className="grid size-12 shrink-0 place-items-center bg-negro text-sobre-negro"><Lock className="size-6" /></motion.span>
            <div className="min-w-0 flex-1"><p className="display truncate text-[24px] font-bold leading-tight">{persona.nombre}</p><p className="truncate text-gris">{persona.cargo}</p></div>
            <Estado v={cuenta} />
          </div>
          <ul className="space-y-2.5">
            <AnimatePresence>
              {efectos.map((t, i) => (
                <motion.li key={t} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.28 }} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center bg-verde text-white"><Check className="size-3.5" strokeWidth={3} /></span>{t}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}
    </Dialogo>
  );
}
