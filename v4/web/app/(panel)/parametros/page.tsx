"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { num } from "@sima/cliente";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Boton, Encabezado, Entrada, ErrorCarga, Esqueleto, Seccion, mensajeDe, useAviso } from "@/components/ui";

interface Datos { parametros: { clave: string; valor: number; descripcion: string }[]; afp: { afp: string; comision: number }[]; tramos: { desdeUtm: number; factor: number; rebajaUtm: number }[] }

function Fila({ p, editable }: { p: Datos["parametros"][number]; editable: boolean }) {
  const qc = useQueryClient();
  const aviso = useAviso();
  const [v, setV] = useState(String(p.valor));
  const m = useMutation({
    mutationFn: () => api.put(`/api/parametros/${p.clave}`, { valor: Number(v) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["parametros"] }); void qc.invalidateQueries({ queryKey: ["remuneraciones"] }); void qc.invalidateQueries({ queryKey: ["panel"] }); aviso("Parámetro guardado. Las liquidaciones se recalcularon."); }, onError: (e) => aviso(mensajeDe(e), "error"),
  });
  return (
    <li className="grid items-center gap-3 border-b border-linea-suave px-5 py-3 sm:grid-cols-[1fr_180px_92px]">
      <div><p className="font-medium">{p.descripcion}</p><p className="num text-[13px] text-gris">{p.clave}</p></div>
      <Entrada type="number" step="any" value={v} disabled={!editable} onChange={(e) => setV(e.target.value)} aria-label={p.descripcion} className="num text-right" />
      {editable ? <Boton tam="s" variante="contorno" disabled={Number(v) === p.valor} cargando={m.isPending} onClick={() => m.mutate()}>Guardar</Boton> : <span />}
    </li>
  );
}

export default function Parametros() {
  const { puede } = useAuth();
  const { data, error, refetch } = useQuery({ queryKey: ["parametros"], queryFn: () => api.get<Datos>("/api/parametros") });
  if (error) return <ErrorCarga error={error} reintentar={() => void refetch()} />;
  if (!data) return <Esqueleto className="h-96" />;
  const editable = puede("parametros", "editar");
  return (
    <>
      <Encabezado titulo="Parámetros de remuneraciones" descripcion="Valores legales con los que se calculan las liquidaciones. Son de referencia: actualícelos con los vigentes y valídelos con un contador." />
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Seccion titulo="Valores generales"><ul className="mt-3 border-t border-linea-suave">{data.parametros.map((p) => <Fila key={p.clave + p.valor} p={p} editable={editable} />)}</ul></Seccion>
        <div className="grid content-start gap-5">
          <Seccion titulo="Comisión de las AFP"><ul className="p-5 pt-3">{data.afp.map((a) => <li key={a.afp} className="flex justify-between border-b border-linea-suave py-1.5"><span>{a.afp}</span><span className="num">{num(a.comision * 100, 2)} %</span></li>)}</ul></Seccion>
          <Seccion titulo="Impuesto único (tramos en UTM)"><table className="w-full text-left"><thead><tr className="border-b border-negro text-[13px] text-gris"><th className="px-5 py-2">Desde</th><th className="px-2 text-right">Tasa</th><th className="px-5 text-right">Rebaja</th></tr></thead>
            <tbody>{data.tramos.map((t) => <tr key={t.desdeUtm} className="border-b border-linea-suave"><td className="num px-5 py-1.5">{num(t.desdeUtm, 1)}</td><td className="num px-2 text-right">{num(t.factor * 100, 1)} %</td><td className="num px-5 text-right">{num(t.rebajaUtm, 2)}</td></tr>)}</tbody></table></Seccion>
        </div>
      </div>
    </>
  );
}
