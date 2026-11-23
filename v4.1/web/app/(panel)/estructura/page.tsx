"use client";
import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Building2, ChevronRight, Cpu, Factory, Layers, Plus, Rows3 } from "lucide-react";
import type { PlantaNodo, PlcResumen } from "@sima/cliente";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usePlanta } from "@/lib/planta";
import { ESTADO_EQ, FichaEquipoVista, MarcaSim } from "@/components/FichaEquipo";
import { Boton, Cajon, Campo, Chip, Dialogo, Encabezado, Entrada, ErrorCarga, Esqueleto, Maquina, Seleccion, Tarjeta, cx, mensajeDe, useAviso } from "@/components/ui";

const TIPOS = ["Torno CNC", "Centro de mecanizado CNC", "Prensa hidráulica", "Inyectora de plástico", "Cinta transportadora", "Robot industrial articulado", "Máquina de soldadura MIG/MAG", "Envasadora automática", "Compresor de aire industrial", "Bomba centrífuga"];
const MODELO_DE: Record<string, string> = { "Cinta transportadora": "cinta", "Envasadora automática": "llenado" };

export default function Pagina() { return <Suspense fallback={<Esqueleto className="h-[60vh]" />}><Estructura /></Suspense>; }

function Estructura() {
  const { tiene } = useAuth();
  const { equipos } = usePlanta();
  const router = useRouter();
  const sel = useSearchParams().get("equipo");
  const qc = useQueryClient();
  const aviso = useAviso();
  const puede = tiene("equipos.editar");
  const { data, error, refetch } = useQuery({ queryKey: ["estructura"], queryFn: () => api.get<PlantaNodo[]>("/api/estructura") });
  const plcs = useQuery({ queryKey: ["plc"], queryFn: () => api.get<PlcResumen[]>("/api/plc"), enabled: puede });
  const [dialogo, setDialogo] = useState<null | "equipo" | "area" | "linea">(null);
  const [form, setForm] = useState({ codigo: "", nombre: "", tipo: TIPOS[0], lineaId: 0, plc: "", criticidad: "media", marca: "", modelo: "", areaId: 0, tipoArea: "produccion", simular: true });
  const [abiertas, setAbiertas] = useState<Record<number, boolean>>({});
  const planta = data?.[0];

  const crear = useMutation({
    mutationFn: async () => {
      if (dialogo === "equipo") return api.post("/api/equipos", { codigo: form.codigo, nombre: form.nombre, tipo: form.tipo, lineaId: form.lineaId, plc: form.plc || null, criticidad: form.criticidad, marca: form.marca, modelo: form.modelo, modeloSimulacion: form.simular ? (MODELO_DE[form.tipo] ?? "maquina") : null });
      if (dialogo === "area") return api.post("/api/estructura/areas", { codigo: form.codigo, nombre: form.nombre, tipo: form.tipoArea });
      return api.post("/api/estructura/lineas", { areaId: form.areaId, codigo: form.codigo, nombre: form.nombre });
    },
    onSuccess: () => { aviso(dialogo === "equipo" ? `Equipo ${form.codigo.toUpperCase()} registrado. Ya lo ven SIMA Desktop y el simulador.` : "Estructura actualizada."); setDialogo(null); void qc.invalidateQueries({ queryKey: ["estructura"] }); void qc.invalidateQueries({ queryKey: ["equipos"] }); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  const abrir = (d: "equipo" | "area" | "linea") => {
    const l = planta?.areas.flatMap((a) => a.lineas)[0];
    setForm((f) => ({ ...f, codigo: "", nombre: "", lineaId: l?.id ?? 0, areaId: planta?.areas[0]?.id ?? 0 }));
    setDialogo(d);
  };
  const enviar = (e: FormEvent) => { e.preventDefault(); crear.mutate(); };

  if (error) return <ErrorCarga error={error} reintentar={() => void refetch()} />;
  const total = planta?.areas.reduce((n, a) => n + a.lineas.reduce((m, l) => m + l.equipos.length, 0), 0) ?? 0;

  return (
    <>
      <Encabezado titulo="Estructura y equipos" descripcion="Planta → área → línea → máquina → PLC. Cada equipo tiene un único código que comparten la web, SIMA Desktop y el simulador."
        acciones={puede && <div className="flex flex-wrap gap-2"><Boton variante="contorno" onClick={() => abrir("area")}><Building2 className="size-4" />Área</Boton><Boton variante="contorno" onClick={() => abrir("linea")}><Rows3 className="size-4" />Línea</Boton><Boton variante="acento" onClick={() => abrir("equipo")}><Plus className="size-4" />Registrar máquina</Boton></div>} />
      {!planta ? <Esqueleto className="h-[50vh]" /> : (
        <>
          <Tarjeta className="tinte-violeta mb-5 flex flex-wrap items-center gap-6 p-5">
            <span className="degradado-marca grid size-14 place-items-center rounded-2xl text-white shadow-[var(--s-brillo-violeta)]"><Factory className="size-7" /></span>
            <div className="mr-auto"><p className="display text-[24px] font-bold">{planta.nombre}</p><p className="text-[13px] text-gris">{planta.ciudad} · código {planta.codigo}</p></div>
            {[["Áreas", planta.areas.length], ["Líneas", planta.areas.reduce((n, a) => n + a.lineas.length, 0)], ["Equipos", total], ["PLC", planta.areas.reduce((n, a) => n + a.plcs.length, 0)]].map(([t, n]) => (
              <div key={t as string} className="text-center"><p className="display text-[28px] font-bold leading-none">{n}</p><p className="text-[12px] text-gris">{t}</p></div>
            ))}
          </Tarjeta>
          <div className="grid gap-3">
            {planta.areas.map((a, ai) => {
              const abierta = abiertas[a.id] ?? true;
              const n = a.lineas.reduce((m, l) => m + l.equipos.length, 0);
              return (
                <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ai * 0.05 }}>
                  <Tarjeta className="overflow-hidden">
                    <button onClick={() => setAbiertas((s) => ({ ...s, [a.id]: !abierta }))} className="flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left hover:bg-papel-2/50">
                      <ChevronRight className={cx("size-4 text-gris transition-transform", abierta && "rotate-90")} />
                      <span className="grid size-9 place-items-center rounded-xl bg-acento-claro text-acento"><Layers className="size-4.5" /></span>
                      <span className="flex-1"><span className="block font-semibold">{a.nombre}</span><span className="text-[12.5px] text-gris">{a.codigo} · {a.tipo} · {a.lineas.length} líneas · {n} equipos</span></span>
                      <span className="hidden gap-1.5 sm:flex">{a.plcs.map((p) => <Chip key={p.codigo} punto={false} tono={p.estado === "run" ? "ok" : p.estado === "error" ? "peligro" : "neutro"}><Cpu className="mr-1 inline size-3" />{p.codigo}</Chip>)}</span>
                    </button>
                    <AnimatePresence initial={false}>
                      {abierta && (
                        <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                          <div className="space-y-4 border-t border-linea-suave px-5 py-4">
                            {a.lineas.length === 0 && <p className="text-[13.5px] text-gris">Esta área todavía no tiene líneas.</p>}
                            {a.lineas.map((l) => (
                              <div key={l.id}>
                                <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold"><span className="h-px w-5 bg-cian" />{l.nombre}<span className="font-normal text-gris">· {l.codigo}</span></p>
                                {l.equipos.length === 0 ? <p className="pl-7 text-[13px] text-gris">Sin equipos.</p> : (
                                  <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                                    {l.equipos.map((e) => {
                                      const estado = equipos.find((x) => x.codigo === e.codigo)?.estado ?? e.estado;
                                      return (
                                        <li key={e.codigo}>
                                          <button onClick={() => router.replace(`/estructura?equipo=${e.codigo}`, { scroll: false })} className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-linea-suave bg-papel-2/40 p-2.5 text-left transition-colors hover:border-acento/40">
                                            <Maquina tipo={e.tipo} estado={estado} className="h-12 w-16 shrink-0" />
                                            <span className="min-w-0 flex-1"><span className="flex items-center gap-1.5"><b className="num text-[14px]">{e.codigo}</b>{e.simulado && <MarcaSim />}</span><span className="block truncate text-[12.5px] text-gris">{e.nombre}</span></span>
                                            <span className="size-2.5 shrink-0 rounded-full" style={{ background: ESTADO_EQ[estado]?.color }} />
                                          </button>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Tarjeta>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      <Cajon abierto={!!sel} onCerrar={() => router.replace("/estructura", { scroll: false })} titulo={sel ? `Equipo ${sel}` : ""} ancho={640}>{sel && <FichaEquipoVista codigo={sel} />}</Cajon>

      <Dialogo abierto={!!dialogo} onCerrar={() => setDialogo(null)} titulo={dialogo === "equipo" ? "Registrar máquina" : dialogo === "area" ? "Nueva área" : "Nueva línea"} ancho={560}
        pie={<><Boton variante="texto" onClick={() => setDialogo(null)}>Cancelar</Boton><Boton variante="acento" cargando={crear.isPending} type="submit" form="form-estructura">Guardar</Boton></>}>
        <form id="form-estructura" onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Código" ayuda={dialogo === "equipo" ? "Formato XX-00, por ejemplo TC-03" : undefined}><Entrada required value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></Campo>
          <Campo etiqueta="Nombre"><Entrada required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Campo>
          {dialogo === "area" && <Campo etiqueta="Tipo de área"><Seleccion value={form.tipoArea} onChange={(e) => setForm({ ...form, tipoArea: e.target.value })}><option value="produccion">Producción</option><option value="servicios">Servicios</option><option value="bodega">Bodega</option><option value="patio">Patio</option></Seleccion></Campo>}
          {dialogo === "linea" && <Campo etiqueta="Área"><Seleccion value={form.areaId} onChange={(e) => setForm({ ...form, areaId: Number(e.target.value) })}>{planta?.areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}</Seleccion></Campo>}
          {dialogo === "equipo" && <>
            <Campo etiqueta="Tipo"><Seleccion value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</Seleccion></Campo>
            <Campo etiqueta="Línea"><Seleccion value={form.lineaId} onChange={(e) => setForm({ ...form, lineaId: Number(e.target.value) })}>{planta?.areas.map((a) => <optgroup key={a.id} label={a.nombre}>{a.lineas.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}</optgroup>)}</Seleccion></Campo>
            <Campo etiqueta="PLC"><Seleccion value={form.plc} onChange={(e) => setForm({ ...form, plc: e.target.value })}><option value="">Sin PLC</option>{plcs.data?.map((p) => <option key={p.codigo} value={p.codigo}>{p.codigo} · {p.nombre}</option>)}</Seleccion></Campo>
            <Campo etiqueta="Criticidad"><Seleccion value={form.criticidad} onChange={(e) => setForm({ ...form, criticidad: e.target.value })}><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option></Seleccion></Campo>
            <Campo etiqueta="Marca"><Entrada value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} /></Campo>
            <Campo etiqueta="Modelo"><Entrada value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></Campo>
            <label className="flex items-center gap-2.5 rounded-xl border border-linea-suave bg-papel-2 p-3 text-[13.5px] sm:col-span-2"><input type="checkbox" checked={form.simular} onChange={(e) => setForm({ ...form, simular: e.target.checked })} className="accent-[var(--s-acento)]" />Incorporar al simulador de PLC (modelo «{MODELO_DE[form.tipo] ?? "máquina"}»)</label>
            <div className="flex items-center gap-4 rounded-xl bg-papel-2 p-3 sm:col-span-2"><Maquina tipo={form.tipo} estado="operando" className="h-14 w-20" /><p className="text-[13px] text-gris">Se crearán sus sensores típicos. Quedará «detenido» hasta que el PLC informe que arrancó.</p></div>
          </>}
        </form>
      </Dialogo>
    </>
  );
}
