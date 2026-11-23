"use client";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Lock, Search, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { Chip, Encabezado, Esqueleto, Tarjeta, cx, mensajeDe, useAviso } from "@/components/ui";

interface Matriz {
  recursos: { clave: string; titulo: string; grupo: string }[];
  acciones: Record<string, string>;
  capacidades: string[];
  cargos: { id: number; nombre: string; familia: string; perfil: string; canal: string; personas: number; capacidades: Record<string, string> }[];
  puedeEditar: boolean;
}
const ALCANCES = ["propio", "equipo", "area", "agregado", "planta", "empresa"];

export default function Permisos() {
  const qc = useQueryClient();
  const aviso = useAviso();
  const [buscar, setBuscar] = useState("");
  const [sel, setSel] = useState<number | null>(null);
  const { data } = useQuery({ queryKey: ["permisos"], queryFn: () => api.get<Matriz>("/api/permisos") });
  const cambiar = useMutation({
    mutationFn: (v: { cargo: number; capacidad: string; alcance: string | null }) => api.put(`/api/permisos/${v.cargo}`, { capacidad: v.capacidad, alcance: v.alcance }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["permisos"] }); aviso("Permiso actualizado. Rige desde la siguiente petición de esas personas."); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  const cargos = useMemo(() => (data?.cargos ?? []).filter((c) => !buscar || `${c.nombre} ${c.familia} ${c.perfil}`.toLowerCase().includes(buscar.toLowerCase())), [data, buscar]);
  const cargo = data?.cargos.find((c) => c.id === (sel ?? data?.cargos[0]?.id));
  const grupos = useMemo(() => [...new Set((data?.recursos ?? []).map((r) => r.grupo))], [data]);

  if (!data) return <><Encabezado titulo="Permisos por cargo" /><Esqueleto className="h-[60vh]" /></>;
  return (
    <>
      <Encabezado titulo="Permisos por cargo" descripcion="Qué puede hacer cada cargo y con qué alcance (propio, su equipo, el área, totales o toda la empresa). Lo que no está marcado, el servidor lo niega." acciones={!data.puedeEditar && <Chip punto={false}><Lock className="mr-1 inline size-3.5" />solo lectura</Chip>} />
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Tarjeta className="flex max-h-[calc(100dvh-200px)] flex-col overflow-hidden">
          <div className="border-b border-linea-suave p-3"><label className="relative block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gris" /><input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar cargo" className="h-9 w-full rounded-xl border border-linea bg-papel-2 pl-9 pr-3 text-[13.5px] outline-none focus:border-acento" /></label></div>
          <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {cargos.map((c) => (
              <li key={c.id}>
                <button onClick={() => setSel(c.id)} className={cx("relative w-full cursor-pointer rounded-xl px-3 py-2 text-left", cargo?.id === c.id ? "text-negro" : "text-carbon hover:bg-papel-2")}>
                  {cargo?.id === c.id && <motion.span layoutId="cargo-sel" className="absolute inset-0 rounded-xl border border-acento/30 bg-acento-claro" transition={{ duration: 0.2 }} />}
                  <span className="relative block truncate text-[13.5px] font-medium">{c.nombre}</span>
                  <span className="relative block truncate text-[12px] text-gris">{c.familia} · {c.canal === "web" ? "web" : "Desktop"} · {c.personas} personas · {Object.keys(c.capacidades).length} capacidades</span>
                </button>
              </li>
            ))}
          </ul>
        </Tarjeta>
        <AnimatePresence mode="wait">
          {cargo && (
            <motion.div key={cargo.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Tarjeta className="mb-4 flex flex-wrap items-center gap-4 p-5">
                <span className="grid size-10 place-items-center rounded-md bg-acento-claro text-acento"><ShieldCheck className="size-6" /></span>
                <div className="mr-auto"><p className="display text-[22px] font-bold leading-tight">{cargo.nombre}</p><p className="text-[13px] text-gris">perfil {cargo.perfil} · ingresa por {cargo.canal === "web" ? "la web" : "SIMA Desktop"} · {cargo.personas} personas</p></div>
              </Tarjeta>
              <div className="grid gap-4 xl:grid-cols-2">
                {grupos.map((g) => (
                  <Tarjeta key={g} className="p-4">
                    <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-gris">{g}</p>
                    <ul className="grid gap-3">
                      {data.recursos.filter((r) => r.grupo === g).map((r) => {
                        const caps = data.capacidades.filter((c) => c.startsWith(r.clave + "."));
                        return (
                          <li key={r.clave}>
                            <p className="mb-1.5 text-[13.5px] font-medium">{r.titulo}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {caps.map((c) => {
                                const accion = c.split(".")[1];
                                const alcance = cargo.capacidades[c];
                                const activa = alcance != null;
                                return (
                                  <span key={c} className={cx("inline-flex items-center overflow-hidden rounded-lg border text-[12.5px] transition-colors", activa ? "border-acento/40 bg-acento-claro" : "border-linea-suave text-gris")}>
                                    <button disabled={!data.puedeEditar || cambiar.isPending} onClick={() => cambiar.mutate({ cargo: cargo.id, capacidad: c, alcance: activa ? null : "empresa" })} className={cx("px-2 py-1", data.puedeEditar && "cursor-pointer hover:bg-papel-2")}>{data.acciones[accion] ?? accion}</button>
                                    {activa && (data.puedeEditar
                                      ? <select value={alcance} onChange={(e) => cambiar.mutate({ cargo: cargo.id, capacidad: c, alcance: e.target.value })} className="h-full border-l border-acento/30 bg-transparent px-1 py-1 text-[11.5px] text-acento outline-none">{ALCANCES.map((a) => <option key={a} value={a}>{a}</option>)}</select>
                                      : <span className="border-l border-acento/30 px-1.5 py-1 text-[11.5px] text-acento">{alcance}</span>)}
                                  </span>
                                );
                              })}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </Tarjeta>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
