"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Pause, Play, Plus, Square } from "lucide-react";
import { hace, type Equipo } from "@sima/cliente";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usePlanta } from "@/lib/planta";
import { ModProduccion } from "@/components/inicio";
import { Boton, Campo, Chip, Dialogo, Encabezado, Entrada, Esqueleto, Seleccion, Tarjeta, cx, mensajeDe, useAviso } from "@/components/ui";

interface Op { id: number; codigo: string; producto: string; lote: string; equipo: string; equipoNombre: string; linea: string; turno: string; cantidad: number; producidas: number; buenas: number; rechazo: number; avance: number; estado: string; creada: string; inicio?: string | null }
const ESTADO: Record<string, { t: string; tono: "ok" | "aviso" | "info" | "neutro" }> = { en_curso: { t: "En curso", tono: "ok" }, planificada: { t: "Planificada", tono: "info" }, pausada: { t: "Pausada", tono: "aviso" }, terminada: { t: "Terminada", tono: "neutro" } };

export default function Produccion() {
  const { tiene } = useAuth();
  const { equipos } = usePlanta();
  const qc = useQueryClient();
  const aviso = useAviso();
  const [filtro, setFiltro] = useState("activas");
  const [nueva, setNueva] = useState(false);
  const [f, setF] = useState({ equipo: "", producto: "", cantidad: 500, turno: "D" });
  const { data } = useQuery({ queryKey: ["produccion", "ordenes", filtro], queryFn: () => api.get<Op[]>(`/api/produccion/ordenes?estado=${filtro}`), refetchInterval: 10_000 });
  const estado = useMutation({ mutationFn: (v: { id: number; estado: string }) => api.post(`/api/produccion/ordenes/${v.id}/estado`, { estado: v.estado }), onSuccess: () => void qc.invalidateQueries({ queryKey: ["produccion"] }), onError: (e) => aviso(mensajeDe(e), "error") });
  const crear = useMutation({ mutationFn: () => api.post("/api/produccion/ordenes", f), onSuccess: () => { aviso("Orden de producción planificada."); setNueva(false); void qc.invalidateQueries({ queryKey: ["produccion"] }); }, onError: (e) => aviso(mensajeDe(e), "error") });
  const editar = tiene("produccion.editar");
  const productivos = equipos.filter((e: Equipo) => !/Compresor|Bomba/.test(e.tipo));

  return (
    <>
      <Encabezado titulo="Producción" descripcion="Órdenes por línea con lo que cuentan los PLC y lo que informan los operadores. Alimenta el OEE." acciones={editar && <Boton variante="acento" onClick={() => { setF((x) => ({ ...x, equipo: productivos[0]?.codigo ?? "" })); setNueva(true); }}><Plus className="size-4" />Planificar orden</Boton>} />
      <ModProduccion compacto />
      <div className="mt-6 mb-3 flex flex-wrap gap-2">
        {[["activas", "Activas"], ["en_curso", "En curso"], ["planificada", "Planificadas"], ["terminada", "Terminadas"]].map(([k, t]) => <button key={k} onClick={() => setFiltro(k)} className={cx("h-9 cursor-pointer rounded-full px-4 text-[13.5px] font-medium", filtro === k ? "degradado-marca text-white" : "bg-papel hover:bg-papel-2")}>{t}</button>)}
      </div>
      {!data ? <Esqueleto className="h-80" /> : (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {data.length === 0 && <Tarjeta className="p-10 text-center text-gris md:col-span-2">No hay órdenes en este estado.</Tarjeta>}
          {data.map((o, i) => (
            <motion.div key={o.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
              <Tarjeta className={cx("p-5", o.estado === "en_curso" && "tinte-cian")}>
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="num text-[12.5px] text-gris">{o.codigo} · lote {o.lote}</p><p className="truncate text-[16px] font-semibold">{o.producto}</p><p className="text-[12.5px] text-gris">{o.equipo} {o.equipoNombre} · {o.linea} · turno {o.turno}</p></div><Chip tono={ESTADO[o.estado]?.tono}>{ESTADO[o.estado]?.t}</Chip></div>
                <div className="mt-4 flex items-end justify-between"><p className="display text-[30px] font-bold leading-none">{o.producidas.toLocaleString("es-CL")}<span className="text-[15px] text-gris"> / {o.cantidad.toLocaleString("es-CL")}</span></p><p className="text-right text-[12.5px] text-gris">{o.rechazo} rechazadas<br />{o.inicio ? `desde ${hace(o.inicio)}` : "sin iniciar"}</p></div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-linea-suave"><motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, var(--s-acento), var(--s-cobre))", boxShadow: "var(--s-brillo-cian)" }} initial={{ width: 0 }} animate={{ width: `${Math.min(100, o.avance * 100)}%` }} transition={{ duration: 0.8 }} /></div>
                {editar && o.estado !== "terminada" && (
                  <div className="mt-4 flex gap-2">
                    {o.estado !== "en_curso" && <Boton tam="s" variante="acento" onClick={() => estado.mutate({ id: o.id, estado: "en_curso" })}><Play className="size-3.5" />{o.estado === "pausada" ? "Reanudar" : "Iniciar"}</Boton>}
                    {o.estado === "en_curso" && <Boton tam="s" variante="contorno" onClick={() => estado.mutate({ id: o.id, estado: "pausada" })}><Pause className="size-3.5" />Pausar</Boton>}
                    {o.estado !== "planificada" && <Boton tam="s" variante="contorno" onClick={() => estado.mutate({ id: o.id, estado: "terminada" })}><Square className="size-3.5" />Terminar</Boton>}
                  </div>
                )}
              </Tarjeta>
            </motion.div>
          ))}
        </div>
      )}
      <Dialogo abierto={nueva} onCerrar={() => setNueva(false)} titulo="Planificar orden de producción" pie={<><Boton variante="texto" onClick={() => setNueva(false)}>Cancelar</Boton><Boton variante="acento" cargando={crear.isPending} onClick={() => crear.mutate()}>Planificar</Boton></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Equipo"><Seleccion value={f.equipo} onChange={(e) => setF({ ...f, equipo: e.target.value })}>{productivos.map((e) => <option key={e.codigo} value={e.codigo}>{e.codigo} · {e.nombre}</option>)}</Seleccion></Campo>
          <Campo etiqueta="Turno"><Seleccion value={f.turno} onChange={(e) => setF({ ...f, turno: e.target.value })}>{["D", "A", "B", "N"].map((t) => <option key={t}>{t}</option>)}</Seleccion></Campo>
          <Campo etiqueta="Producto" className="sm:col-span-2"><Entrada value={f.producto} onChange={(e) => setF({ ...f, producto: e.target.value })} placeholder="Tapa PP 38 mm" /></Campo>
          <Campo etiqueta="Cantidad"><Entrada type="number" min={1} value={f.cantidad} onChange={(e) => setF({ ...f, cantidad: Number(e.target.value) })} /></Campo>
        </div>
      </Dialogo>
    </>
  );
}
