"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { CheckCircle2, Plus, Search } from "lucide-react";
import { hace, type PlantaNodo } from "@sima/cliente";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { COLOR_SEVERIDAD, ModSst, TIPO_SST } from "@/components/inicio";
import { AreaTexto, Boton, Cajon, Campo, Chip, Dialogo, Encabezado, Esqueleto, Seleccion, Tarjeta, mensajeDe, useAviso } from "@/components/ui";

interface Incidente { id: number; codigo: string; fecha: string; zona: string; areaId: number; equipo?: string | null; tipo: string; severidad: string; descripcion: string; controlInmediato: string; estado: string; reportadoPor: string; responsable?: string | null; cierre: string; fechaCierre?: string | null }
const ESTADO: Record<string, { t: string; tono: "peligro" | "aviso" | "ok" }> = { reportado: { t: "Reportado", tono: "peligro" }, investigacion: { t: "En investigación", tono: "aviso" }, cerrado: { t: "Cerrado", tono: "ok" } };

export default function Seguridad() {
  const { tiene } = useAuth();
  const qc = useQueryClient();
  const aviso = useAviso();
  const [sel, setSel] = useState<Incidente | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [cierre, setCierre] = useState("");
  const [f, setF] = useState({ areaId: 0, tipo: "condicion_insegura", severidad: "leve", descripcion: "", controlInmediato: "" });
  const { data } = useQuery({ queryKey: ["sst", "incidentes"], queryFn: () => api.get<Incidente[]>("/api/sst/incidentes"), refetchInterval: 30_000 });
  const estructura = useQuery({ queryKey: ["estructura"], queryFn: () => api.get<PlantaNodo[]>("/api/estructura"), enabled: nuevo });
  const listo = (m: string) => { aviso(m); setSel(null); setNuevo(false); setCierre(""); void qc.invalidateQueries({ queryKey: ["sst"] }); void qc.invalidateQueries({ queryKey: ["aprobaciones"] }); };
  const reportar = useMutation({ mutationFn: () => api.post("/api/sst/incidentes", f), onSuccess: () => listo("Evento reportado. Prevención de riesgos ya lo ve."), onError: (e) => aviso(mensajeDe(e), "error") });
  const avanzar = useMutation({ mutationFn: (v: { id: number; estado: string }) => api.post(`/api/sst/incidentes/${v.id}/avanzar`, { estado: v.estado, cierre }), onSuccess: () => listo("Registro actualizado."), onError: (e) => aviso(mensajeDe(e), "error") });

  return (
    <>
      <Encabezado titulo="Seguridad y salud en el trabajo" descripcion="Cualquier persona reporta condiciones inseguras y casi accidentes. Prevención investiga y cierra con medidas de control. No se guarda información clínica."
        acciones={tiene("sst.reportar") && <Boton variante="acento" onClick={() => { setF((x) => ({ ...x, areaId: 0 })); setNuevo(true); }}><Plus className="size-4" />Reportar evento</Boton>} />
      {tiene("sst.ver") && <ModSst />}
      <div className="mt-6 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {!data ? <Esqueleto className="h-64 md:col-span-2" /> : data.length === 0 ? <Tarjeta className="p-10 text-center text-gris md:col-span-2">No hay eventos registrados.</Tarjeta> : data.map((i, k) => (
          <motion.button key={i.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(k * 0.03, 0.3) }} whileHover={{ y: -2 }} onClick={() => { setSel(i); setCierre(""); }} className="tarjeta relative cursor-pointer overflow-hidden p-4 text-left">
            <span className="absolute inset-y-0 left-0 w-1" style={{ background: i.tipo === "accidente" ? "var(--s-rojo)" : COLOR_SEVERIDAD[i.severidad] }} />
            <div className="flex items-center justify-between gap-2"><span className="num text-[12.5px] text-gris">{i.codigo} · {hace(i.fecha)}</span><Chip tono={ESTADO[i.estado]?.tono}>{ESTADO[i.estado]?.t}</Chip></div>
            <p className="mt-1 font-semibold">{TIPO_SST[i.tipo] ?? i.tipo} · {i.zona}</p><p className="line-clamp-2 text-[13.5px] text-carbon">{i.descripcion}</p>
            <p className="mt-2 text-[12.5px] text-gris">Reportó {i.reportadoPor}{i.equipo && ` · ${i.equipo}`}</p>
          </motion.button>
        ))}
      </div>
      <Cajon abierto={!!sel} onCerrar={() => setSel(null)} titulo={sel?.codigo ?? ""} ancho={540}>
        {sel && (
          <div className="grid gap-4">
            <div><p className="display text-[22px] font-bold">{TIPO_SST[sel.tipo]}</p><p className="text-[13px] text-gris">{sel.zona} · severidad {sel.severidad} · {new Date(sel.fecha).toLocaleString("es-CL")}</p></div>
            <p className="rounded-2xl bg-papel-2 p-4 text-[14px]">{sel.descripcion}</p>
            {sel.controlInmediato && <p className="text-[14px]"><b>Control inmediato:</b> {sel.controlInmediato}</p>}
            {sel.cierre && <p className="text-[14px]"><b>Cierre:</b> {sel.cierre}</p>}
            {sel.estado !== "cerrado" && tiene("sst.gestionar") && (
              <div className="grid gap-3 rounded-2xl border border-linea-suave p-4">
                {sel.estado === "reportado" && <Boton variante="contorno" onClick={() => avanzar.mutate({ id: sel.id, estado: "investigacion" })}><Search className="size-4" />Iniciar investigación</Boton>}
                <AreaTexto value={cierre} onChange={(e) => setCierre(e.target.value)} placeholder="Medidas de control implementadas y verificadas" />
                <Boton variante="acento" disabled={!cierre} onClick={() => avanzar.mutate({ id: sel.id, estado: "cerrado" })}><CheckCircle2 className="size-4" />Cerrar con medidas</Boton>
              </div>
            )}
          </div>
        )}
      </Cajon>
      <Dialogo abierto={nuevo} onCerrar={() => setNuevo(false)} titulo="Reportar evento de seguridad" pie={<><Boton variante="texto" onClick={() => setNuevo(false)}>Cancelar</Boton><Boton variante="acento" cargando={reportar.isPending} onClick={() => reportar.mutate()}>Reportar</Boton></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Área"><Seleccion value={f.areaId} onChange={(e) => setF({ ...f, areaId: Number(e.target.value) })}><option value={0}>Elija…</option>{estructura.data?.[0]?.areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}</Seleccion></Campo>
          <Campo etiqueta="Tipo"><Seleccion value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>{Object.entries(TIPO_SST).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</Seleccion></Campo>
          <Campo etiqueta="Severidad"><Seleccion value={f.severidad} onChange={(e) => setF({ ...f, severidad: e.target.value })}><option value="leve">Leve</option><option value="grave">Grave</option><option value="critica">Crítica</option></Seleccion></Campo>
          <Campo etiqueta="Qué pasó" className="sm:col-span-2"><AreaTexto value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></Campo>
          <Campo etiqueta="Qué se hizo en el momento" className="sm:col-span-2"><AreaTexto value={f.controlInmediato} onChange={(e) => setF({ ...f, controlInmediato: e.target.value })} /></Campo>
        </div>
      </Dialogo>
    </>
  );
}
