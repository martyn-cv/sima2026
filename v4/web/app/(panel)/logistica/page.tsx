"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { fecha } from "@sima/cliente";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Boton, Campo, Chip, Dialogo, Encabezado, Entrada, ErrorCarga, Seccion, Tabla, mensajeDe, useAviso, type Columna } from "@/components/ui";

interface Despacho { id: number; codigo: string; destino: string; carga: string; vehiculo: string; conductor: string; estado: "pendiente" | "en_ruta" | "entregado"; compromiso: string; salida?: string | null; entrega?: string | null; atrasado: boolean }
const ESTADO = { pendiente: ["Pendiente", "neutro"], en_ruta: ["En ruta", "aviso"], entregado: ["Entregado", "ok"] } as const;
const hora = (iso?: string | null) => iso ? new Date(iso).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" }) : "—";

export default function Logistica() {
  const { puede } = useAuth();
  const qc = useQueryClient(); const aviso = useAviso();
  const [nuevo, setNuevo] = useState(false);
  const [f, setF] = useState({ destino: "", carga: "", vehiculo: "Camión 10 t", conductor: "", compromiso: "" });
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ["despachos"], queryFn: () => api.get<Despacho[]>("/api/despachos"), refetchInterval: 30_000 });
  const crear = useMutation({
    mutationFn: () => api.post("/api/despachos", { ...f, compromiso: new Date(f.compromiso).toISOString() }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["despachos"] }); aviso("Despacho creado."); setNuevo(false); setF({ destino: "", carga: "", vehiculo: "Camión 10 t", conductor: "", compromiso: "" }); }, onError: (e) => aviso(mensajeDe(e), "error"),
  });
  const avanzar = useMutation({ mutationFn: (id: number) => api.post(`/api/despachos/${id}/avanzar`), onSuccess: () => { void qc.invalidateQueries({ queryKey: ["despachos"] }); void qc.invalidateQueries({ queryKey: ["kpis"] }); }, onError: (e) => aviso(mensajeDe(e), "error") });
  const entregados = data.filter((d) => d.estado === "entregado");
  const cols: Columna<Despacho>[] = [
    { clave: "c", titulo: "Despacho", valor: (d) => d.id, render: (d) => <div><p className="num font-semibold">{d.codigo}</p><p className="text-[13px] text-gris">{d.vehiculo} · {d.conductor}</p></div> },
    { clave: "d", titulo: "Destino y carga", valor: (d) => d.destino, render: (d) => <div><p className="font-medium">{d.destino}</p><p className="text-[13px] text-gris">{d.carga}</p></div> },
    { clave: "p", titulo: "Compromiso", valor: (d) => d.compromiso, render: (d) => <span className="num text-[14px]">{hora(d.compromiso)}</span> },
    { clave: "e", titulo: "Entrega", valor: (d) => d.entrega ?? "", render: (d) => <span className="num text-[14px]">{hora(d.entrega)}</span> },
    { clave: "s", titulo: "Estado", valor: (d) => d.estado, render: (d) => <div className="flex flex-wrap gap-1.5"><Chip tono={ESTADO[d.estado][1]}>{ESTADO[d.estado][0]}</Chip>{d.atrasado && <Chip tono="peligro" punto={false}>{d.estado === "entregado" ? "Llegó tarde" : "Atrasado"}</Chip>}</div> },
    { clave: "a", titulo: "", render: (d) => puede("despachos", "editar") && d.estado !== "entregado" ? <Boton tam="s" variante="contorno" cargando={avanzar.isPending && avanzar.variables === d.id} onClick={() => avanzar.mutate(d.id)}>{d.estado === "pendiente" ? "Despachar" : "Registrar entrega"}</Boton> : null },
  ];
  return (
    <>
      <Encabezado titulo="Logística" descripcion="Despachos a clientes. El indicador OTIF cuenta los entregados dentro del plazo comprometido."
        acciones={puede("despachos", "editar") && <Boton variante="rojo" onClick={() => setNuevo(true)}><Plus className="size-4" />Nuevo despacho</Boton>} />
      <div className="mb-5 grid gap-4 sm:grid-cols-4">
        {[["Pendientes", data.filter((d) => d.estado === "pendiente").length], ["En ruta", data.filter((d) => d.estado === "en_ruta").length], ["Atrasados", data.filter((d) => d.atrasado && d.estado !== "entregado").length], ["Entregados a tiempo", entregados.length ? `${Math.round((entregados.filter((d) => !d.atrasado).length / entregados.length) * 100)} %` : "—"]].map(([t, n]) => (
          <div key={t as string} className="tarjeta p-4"><p className="display text-[40px] font-bold leading-none">{n}</p><p className="text-[14px] text-gris">{t}</p></div>
        ))}
      </div>
      {error ? <ErrorCarga error={error} reintentar={() => void refetch()} /> : <Seccion><Tabla columnas={cols} filas={data} clave={(d) => d.id} cargando={isLoading} maxAlto="calc(100dvh - 380px)" /></Seccion>}
      <Dialogo abierto={nuevo} onCerrar={() => setNuevo(false)} titulo="Nuevo despacho" ancho={560} pie={<><Boton variante="contorno" onClick={() => setNuevo(false)}>Cancelar</Boton><Boton variante="rojo" cargando={crear.isPending} disabled={!f.destino || !f.carga || !f.compromiso} onClick={() => crear.mutate()}>Crear despacho</Boton></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Destino"><Entrada value={f.destino} onChange={(e) => setF({ ...f, destino: e.target.value })} placeholder="Cliente Arica" /></Campo>
          <Campo etiqueta="Compromiso de entrega"><Entrada type="datetime-local" value={f.compromiso} onChange={(e) => setF({ ...f, compromiso: e.target.value })} /></Campo>
          <Campo etiqueta="Carga" className="sm:col-span-2"><Entrada value={f.carga} onChange={(e) => setF({ ...f, carga: e.target.value })} placeholder="Piezas mecanizadas, 3 pallets" /></Campo>
          <Campo etiqueta="Vehículo"><Entrada value={f.vehiculo} onChange={(e) => setF({ ...f, vehiculo: e.target.value })} /></Campo>
          <Campo etiqueta="Conductor"><Entrada value={f.conductor} onChange={(e) => setF({ ...f, conductor: e.target.value })} /></Campo>
        </div>
      </Dialogo>
    </>
  );
}
