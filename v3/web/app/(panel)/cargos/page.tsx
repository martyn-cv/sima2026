"use client";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { clp } from "@sima/cliente";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Boton, Cajon, Campo, Chip, Encabezado, Entrada, ErrorCarga, Seccion, Tabla, mensajeDe, useAviso, type Columna } from "@/components/ui";

interface CargoFila { id: number; familia: string; familiaN: number; nombre: string; tipoCargo: string; perfilSima: string; canal: string; sueldoMin: number; sueldoMax: number; dotacionObjetivo: number; dotacionActual: number; brecha: number; paraQueExiste: string; queHace: string; queEntrega: string; seCoordinaCon: string; comoMedir: string; conocimientos: string }

export default function Cargos() {
  const { puede } = useAuth();
  const qc = useQueryClient();
  const aviso = useAviso();
  const [sel, setSel] = useState<CargoFila | null>(null);
  const [edit, setEdit] = useState({ obj: "", min: "", max: "" });
  const [q, setQ] = useState("");
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ["cargos"], queryFn: () => api.get<CargoFila[]>("/api/cargos") });
  const guardar = useMutation({
    mutationFn: () => api.put(`/api/cargos/${sel!.id}`, { dotacionObjetivo: Number(edit.obj), sueldoMin: Number(edit.min), sueldoMax: Number(edit.max) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["cargos"] }); void qc.invalidateQueries({ queryKey: ["panel"] }); aviso("Cargo actualizado."); setSel(null); }, onError: (e) => aviso(mensajeDe(e), "error"),
  });
  const lista = useMemo(() => data.filter((c) => !q || `${c.nombre} ${c.familia}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const vacantes = data.reduce((a, c) => a + Math.max(0, c.brecha), 0);

  const columnas: Columna<CargoFila>[] = [
    { clave: "n", titulo: "Cargo", valor: (c) => c.nombre, render: (c) => <div><p className="max-w-[360px] truncate font-medium" title={c.nombre}>{c.nombre}</p><p className="text-[13px] text-gris">{c.familia}</p></div> },
    { clave: "t", titulo: "Tipo", valor: (c) => c.tipoCargo, render: (c) => <Chip punto={false} tono={c.canal === "web" ? "info" : "neutro"}>{c.canal === "web" ? "Administrativo · web" : "Terreno · app"}</Chip> },
    { clave: "d", titulo: "Dotación", valor: (c) => c.dotacionActual / (c.dotacionObjetivo || 1), render: (c) => (
      <div className="flex items-center gap-2.5"><span className="flex h-2.5 w-24 bg-chapa"><motion.span className={c.brecha > 0 ? "bg-ambar" : "bg-negro"} initial={{ width: 0 }} animate={{ width: `${Math.min(100, (c.dotacionActual / (c.dotacionObjetivo || 1)) * 100)}%` }} transition={{ duration: 0.6 }} /></span><span className="num text-[14px]"><b>{c.dotacionActual}</b> de {c.dotacionObjetivo}</span></div>) },
    { clave: "b", titulo: "Vacantes", alinear: "derecha", valor: (c) => c.brecha, render: (c) => c.brecha > 0 ? <span className="font-semibold text-ambar">{c.brecha}</span> : <span className="text-gris">0</span> },
    { clave: "s", titulo: "Banda de sueldo", alinear: "derecha", valor: (c) => c.sueldoMin, render: (c) => <span className="text-[14px]">{clp(c.sueldoMin)} a {clp(c.sueldoMax)}</span> },
  ];

  return (
    <>
      <Encabezado titulo="Cargos y dotación" descripcion={`Los ${data.length || 64} cargos del informe de roles. El cargo decide el perfil de acceso de cada persona en SIMA.`} />
      <div className="mb-5 grid gap-5 sm:grid-cols-3">
        <div className="border-t-[3px] border-negro bg-papel p-5"><p className="display text-[52px] font-bold leading-none">{data.reduce((a, c) => a + c.dotacionActual, 0)}</p><p className="text-[14px] text-gris">personas activas en cargos</p></div>
        <div className="border-t-[3px] border-negro bg-papel p-5"><p className="display text-[52px] font-bold leading-none text-ambar">{vacantes}</p><p className="text-[14px] text-gris">vacantes para completar la dotación</p></div>
        <div className="border-t-[3px] border-negro bg-papel p-5"><p className="display text-[52px] font-bold leading-none">{data.filter((c) => c.canal === "web").length}<span className="text-[28px] text-gris"> / {data.filter((c) => c.canal === "app").length}</span></p><p className="text-[14px] text-gris">cargos de web y de terreno</p></div>
      </div>
      {error ? <ErrorCarga error={error} reintentar={() => void refetch()} /> : (
        <Seccion>
          <div className="border-b border-linea-suave p-4"><Entrada className="max-w-[360px]" placeholder="Buscar cargo o área" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar cargo" /></div>
          <Tabla columnas={columnas} filas={lista} clave={(c) => c.id} cargando={isLoading} maxAlto="calc(100dvh - 400px)" alHacerClic={(c) => { setSel(c); setEdit({ obj: String(c.dotacionObjetivo), min: String(c.sueldoMin), max: String(c.sueldoMax) }); }} />
        </Seccion>
      )}
      <Cajon abierto={sel != null} onCerrar={() => setSel(null)} titulo={sel?.nombre ?? ""} ancho={560}>
        {sel && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2"><Chip punto={false}>{sel.familia}</Chip><Chip punto={false} tono="info">perfil {sel.perfilSima}</Chip></div>
            {([["Para qué existe", sel.paraQueExiste], ["Qué hace", sel.queHace], ["Qué entrega", sel.queEntrega], ["Con quién se coordina", sel.seCoordinaCon], ["Cómo se mide", sel.comoMedir], ["Qué debe saber", sel.conocimientos]] as const).map(([t, v]) => (
              <div key={t}><h3 className="display text-lg font-semibold">{t}</h3><p className="max-w-[60ch] text-gris">{v}</p></div>
            ))}
            {puede("personal", "editar") && (
              <div className="border-t border-linea pt-4"><h3 className="display mb-3 text-lg font-semibold">Dotación y sueldo</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Campo etiqueta="Dotación objetivo"><Entrada type="number" min={0} value={edit.obj} onChange={(e) => setEdit({ ...edit, obj: e.target.value })} /></Campo>
                  <Campo etiqueta="Sueldo mínimo"><Entrada type="number" min={0} value={edit.min} onChange={(e) => setEdit({ ...edit, min: e.target.value })} /></Campo>
                  <Campo etiqueta="Sueldo máximo"><Entrada type="number" min={0} value={edit.max} onChange={(e) => setEdit({ ...edit, max: e.target.value })} /></Campo>
                </div>
                <Boton className="mt-3" variante="rojo" cargando={guardar.isPending} onClick={() => guardar.mutate()}>Guardar</Boton>
              </div>
            )}
          </div>
        )}
      </Cajon>
    </>
  );
}
