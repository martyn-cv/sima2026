"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { BadgeCheck, Microscope, Plus, XCircle } from "lucide-react";
import { hace } from "@sima/cliente";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usePlanta } from "@/lib/planta";
import { COLOR_SEVERIDAD, ModCalidad } from "@/components/inicio";
import { AreaTexto, Boton, Cajon, Campo, Chip, Dialogo, Encabezado, Entrada, Esqueleto, Seleccion, Tarjeta, cx, mensajeDe, useAviso } from "@/components/ui";

interface Nc { id: number; codigo: string; fecha: string; lote: string; producto: string; equipo?: string | null; tipo: string; severidad: string; descripcion: string; cantidad: number; estado: string; registradaPor: string; analisis: string; disposicion: string; resueltaPor?: string | null; fechaResolucion?: string | null }
const ESTADO: Record<string, { t: string; tono: "peligro" | "aviso" | "ok" | "neutro" }> = { abierta: { t: "Lote retenido", tono: "peligro" }, en_analisis: { t: "En análisis", tono: "aviso" }, liberada: { t: "Liberado", tono: "ok" }, rechazada: { t: "Rechazado", tono: "neutro" } };

export default function Calidad() {
  const { tiene } = useAuth();
  const { equipos } = usePlanta();
  const qc = useQueryClient();
  const aviso = useAviso();
  const [filtro, setFiltro] = useState("abiertas");
  const [sel, setSel] = useState<Nc | null>(null);
  const [nueva, setNueva] = useState(false);
  const [f, setF] = useState({ producto: "", lote: "", equipo: "", tipo: "dimensional", severidad: "menor", descripcion: "", cantidad: 0 });
  const [texto, setTexto] = useState("");
  const { data } = useQuery({ queryKey: ["calidad", "nc", filtro], queryFn: () => api.get<Nc[]>(`/api/calidad/nc${filtro ? `?estado=${filtro}` : ""}`), refetchInterval: 20_000 });
  const listo = (m: string) => { aviso(m); setSel(null); setNueva(false); setTexto(""); void qc.invalidateQueries({ queryKey: ["calidad"] }); void qc.invalidateQueries({ queryKey: ["aprobaciones"] }); };
  const crear = useMutation({ mutationFn: () => api.post("/api/calidad/nc", { ...f, equipo: f.equipo || null }), onSuccess: () => listo("No conformidad registrada: el lote queda retenido."), onError: (e) => aviso(mensajeDe(e), "error") });
  const analizar = useMutation({ mutationFn: (id: number) => api.post(`/api/calidad/nc/${id}/analizar`, { analisis: texto }), onSuccess: () => listo("Análisis guardado."), onError: (e) => aviso(mensajeDe(e), "error") });
  const resolver = useMutation({ mutationFn: (v: { id: number; decision: string }) => api.post(`/api/calidad/nc/${v.id}/resolver`, { decision: v.decision, disposicion: texto }), onSuccess: (_, v) => listo(v.decision === "liberar" ? "Lote liberado." : "Lote rechazado."), onError: (e) => aviso(mensajeDe(e), "error") });

  return (
    <>
      <Encabezado titulo="Calidad" descripcion="Una no conformidad retiene el lote. Analizarla es del equipo de calidad; liberarlo o rechazarlo exige la facultad explícita de liberación." acciones={tiene("calidad.registrar") && <Boton variante="acento" onClick={() => setNueva(true)}><Plus className="size-4" />Registrar no conformidad</Boton>} />
      <ModCalidad />
      <div className="mt-6 mb-3 flex flex-wrap gap-2">{[["abiertas", "Abiertas"], ["liberada", "Liberadas"], ["rechazada", "Rechazadas"], ["", "Todas"]].map(([k, t]) => <button key={k} onClick={() => setFiltro(k)} className={cx("h-9 cursor-pointer rounded-full px-4 text-[13.5px] font-medium", filtro === k ? "degradado-marca text-white" : "bg-papel hover:bg-papel-2")}>{t}</button>)}</div>
      {!data ? <Esqueleto className="h-72" /> : (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {data.length === 0 && <Tarjeta className="p-10 text-center text-gris md:col-span-2">No hay no conformidades en este estado.</Tarjeta>}
          {data.map((n, i) => (
            <motion.button key={n.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }} whileHover={{ y: -2 }} onClick={() => { setSel(n); setTexto(""); }} className="tarjeta relative cursor-pointer overflow-hidden p-4 text-left">
              <span className="absolute inset-y-0 left-0 w-1" style={{ background: COLOR_SEVERIDAD[n.severidad] }} />
              <div className="flex items-center justify-between gap-2"><span className="num text-[12.5px] text-gris">{n.codigo} · lote {n.lote}</span><Chip tono={ESTADO[n.estado]?.tono}>{ESTADO[n.estado]?.t}</Chip></div>
              <p className="mt-1 font-semibold">{n.producto}</p><p className="line-clamp-2 text-[13.5px] text-carbon">{n.descripcion}</p>
              <p className="mt-2 text-[12.5px] text-gris">{n.tipo} · severidad {n.severidad} · {n.cantidad} piezas · {n.registradaPor} · {hace(n.fecha)}</p>
            </motion.button>
          ))}
        </div>
      )}
      <Cajon abierto={!!sel} onCerrar={() => setSel(null)} titulo={sel?.codigo ?? ""} ancho={560}>
        {sel && (
          <div className="grid gap-4">
            <div><p className="display text-[22px] font-bold">{sel.producto}</p><p className="text-[13px] text-gris">Lote {sel.lote} · {sel.equipo ?? "sin equipo"} · {sel.cantidad} piezas</p></div>
            <p className="rounded-2xl bg-papel-2 p-4 text-[14px]">{sel.descripcion}</p>
            {sel.analisis && <p className="text-[14px]"><b>Análisis:</b> {sel.analisis}</p>}
            {sel.disposicion && <p className="text-[14px]"><b>Disposición:</b> {sel.disposicion} <span className="text-gris">({sel.resueltaPor})</span></p>}
            {(sel.estado === "abierta" || sel.estado === "en_analisis") && (tiene("calidad.analizar") || tiene("calidad.liberar")) && (
              <div className="grid gap-3 rounded-2xl border border-linea-suave p-4">
                <AreaTexto value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={tiene("calidad.liberar") ? "Análisis o disposición del lote" : "Causa probable y acciones"} />
                <div className="flex flex-wrap justify-end gap-2">
                  {tiene("calidad.analizar") && <Boton variante="contorno" disabled={!texto} onClick={() => analizar.mutate(sel.id)}><Microscope className="size-4" />Guardar análisis</Boton>}
                  {tiene("calidad.liberar") && <><Boton variante="peligro" disabled={!texto} onClick={() => resolver.mutate({ id: sel.id, decision: "rechazar" })}><XCircle className="size-4" />Rechazar lote</Boton><Boton variante="acento" disabled={!texto} onClick={() => resolver.mutate({ id: sel.id, decision: "liberar" })}><BadgeCheck className="size-4" />Liberar lote</Boton></>}
                </div>
              </div>
            )}
          </div>
        )}
      </Cajon>
      <Dialogo abierto={nueva} onCerrar={() => setNueva(false)} titulo="Registrar no conformidad" pie={<><Boton variante="texto" onClick={() => setNueva(false)}>Cancelar</Boton><Boton variante="acento" cargando={crear.isPending} onClick={() => crear.mutate()}>Registrar y retener lote</Boton></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Producto"><Entrada value={f.producto} onChange={(e) => setF({ ...f, producto: e.target.value })} /></Campo>
          <Campo etiqueta="Lote"><Entrada value={f.lote} onChange={(e) => setF({ ...f, lote: e.target.value })} /></Campo>
          <Campo etiqueta="Equipo"><Seleccion value={f.equipo} onChange={(e) => setF({ ...f, equipo: e.target.value })}><option value="">—</option>{equipos.map((e) => <option key={e.codigo} value={e.codigo}>{e.codigo} · {e.nombre}</option>)}</Seleccion></Campo>
          <Campo etiqueta="Piezas afectadas"><Entrada type="number" min={0} value={f.cantidad} onChange={(e) => setF({ ...f, cantidad: Number(e.target.value) })} /></Campo>
          <Campo etiqueta="Tipo"><Seleccion value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>{["dimensional", "visual", "funcional", "material", "documental"].map((t) => <option key={t}>{t}</option>)}</Seleccion></Campo>
          <Campo etiqueta="Severidad"><Seleccion value={f.severidad} onChange={(e) => setF({ ...f, severidad: e.target.value })}><option value="menor">Menor</option><option value="mayor">Mayor</option><option value="critica">Crítica</option></Seleccion></Campo>
          <Campo etiqueta="Descripción" className="sm:col-span-2"><AreaTexto value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></Campo>
        </div>
      </Dialogo>
    </>
  );
}
