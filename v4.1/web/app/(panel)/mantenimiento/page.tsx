"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { BadgeCheck, GitPullRequest, Wrench, XCircle } from "lucide-react";
import { fecha, hace, type LiberacionOt, type Peldano } from "@sima/cliente";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Escalera } from "@/components/plc";
import { Boton, Cajon, Chip, Encabezado, Esqueleto, EstadoEquipo, ETAPAS_LIBERACION, LiberacionOrden, MarcaSimulado, Pestanas, Tarjeta, AreaTexto, cx, mensajeDe, useAviso } from "@/components/ui";

interface Orden { id: number; codigo: string; equipo: string; equipoNombre: string; titulo: string; prioridad: string; estado: string; automatica: boolean; creada: string; cerrada?: string | null; asignado?: string | null }
interface DetalleOrden {
  id: number; codigo: string; titulo: string; descripcion: string; tipo: string; prioridad: string; estado: string; automatica: boolean; loto: boolean; creada: string; cerrada?: string | null; asignado?: string | null;
  simulada?: boolean; cierreSolicitado?: string | null; verificadaPor?: string | null; verificadaEn?: string | null; asignadoAId?: string | null; liberacion?: LiberacionOt;
  equipo: { codigo: string; nombre: string; tipo: string; estado: string; area: string; linea: string };
  intervenciones: { id: number; tecnicoNombre: string; inicio: string; fin: string; causa: string; diagnostico: string; accion: string; resultado: string; observaciones: string; herramientas: string[] }[];
  repuestos: { codigo: string; nombre: string; cantidad: number; fecha: string; porNombre: string }[];
}
interface Cambio { id: number; plc: string; plcNombre: string; resumen: string; justificacion: string; origen: string; estado: string; solicitadoPor: string; fecha: string; revisadoPor?: string | null; fechaRevision?: string | null; comentario: string; versionPublicada?: number | null; puedeAprobar: boolean }
interface DetalleCambio { id: number; plc: string; estado: string; resumen: string; justificacion: string; solicitadoPor: string; fecha: string; propuesto: { peldanos: Peldano[] }; actual: { peldanos: Peldano[] }; puedeAprobar: boolean }

const PRIORIDAD: Record<string, { tono: "peligro" | "aviso" | "info" | "neutro"; color: string }> = { critica: { tono: "peligro", color: "var(--s-rojo)" }, alta: { tono: "aviso", color: "var(--s-ambar)" }, media: { tono: "info", color: "var(--s-azul)" }, baja: { tono: "neutro", color: "var(--s-tenue)" } };

export default function Pagina() { return <Suspense fallback={<Esqueleto className="h-[60vh]" />}><Mantenimiento /></Suspense>; }

function Mantenimiento() {
  const sp = useSearchParams();
  const router = useRouter();
  const ordenSel = sp.get("orden"); const cambioSel = sp.get("cambio");
  const [tab, setTab] = useState<"ordenes" | "cambios">(cambioSel ? "cambios" : "ordenes");
  const ordenes = useQuery({ queryKey: ["ordenes"], queryFn: () => api.get<Orden[]>("/api/ordenes"), refetchInterval: 15_000 });
  const { tiene } = useAuth();
  const cambios = useQuery({ queryKey: ["cambios"], queryFn: () => api.get<Cambio[]>("/api/plc/cambios"), refetchInterval: 20_000, enabled: tiene("plc.ver") || tiene("plc.aprobar") });
  const ir = (q: string) => router.replace(`/mantenimiento${q}`, { scroll: false });
  const columnas = [
    { k: "abierta", t: "Por tomar", color: "var(--s-info)" },
    { k: "en_curso", t: "En ejecución (con LOTO)", color: "var(--s-azul)" },
    { k: "por_verificar", t: "Por liberar", color: "var(--s-ambar)" },
    { k: "cerrada", t: "Cerradas", color: "var(--s-verde)" },
  ];
  const pendientes = cambios.data?.filter((c) => c.estado === "pendiente").length ?? 0;

  return (
    <>
      <Encabezado titulo="Mantenimiento" descripcion="Las órdenes las ejecutan los técnicos desde SIMA Desktop; aquí se supervisan con todo su detalle y se firman las liberaciones que corresponden a su cargo. Los cambios de programa de PLC se aprueban aquí." />
      <Pestanas id="mant" activa={tab} onCambio={setTab} items={[{ clave: "ordenes", titulo: "Órdenes de trabajo", n: ordenes.data?.filter((o) => o.estado !== "cerrada").length }, { clave: "cambios", titulo: "Cambios de PLC", n: pendientes }]} />
      <div className="mt-5">
        {tab === "ordenes" && (!ordenes.data ? <Esqueleto className="h-[50vh]" /> : (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
            {columnas.map((c) => {
              const lista = ordenes.data.filter((o) => o.estado === c.k).slice(0, c.k === "cerrada" ? 12 : 50);
              return (
                <div key={c.k} className="flex min-h-[300px] flex-col rounded-md border border-linea-suave bg-papel-2/50 p-3">
                  <p className="mb-3 flex items-center gap-2 px-1 font-semibold"><span className="size-2.5 rounded-full" style={{ background: c.color }} />{c.t}<span className="num ml-auto text-[13px] text-gris">{ordenes.data.filter((o) => o.estado === c.k).length}</span></p>
                  <div className="grid gap-2">
                    {lista.map((o, i) => (
                      <motion.button key={o.id} layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18, delay: Math.min(i * 0.015, 0.2) }} onClick={() => ir(`?orden=${o.id}`)}
                        className="relative cursor-pointer overflow-hidden rounded-md border border-linea-suave bg-papel p-3.5 text-left transition-colors duration-150 hover:border-linea">
                        <span className="absolute inset-y-0 left-0 w-1" style={{ background: PRIORIDAD[o.prioridad]?.color }} />
                        <div className="flex items-center justify-between gap-2"><span className="num text-[12.5px] font-semibold text-gris">{o.codigo}</span><Chip tono={PRIORIDAD[o.prioridad]?.tono} punto={false}>{o.prioridad}</Chip></div>
                        <p className="mt-1 font-medium leading-snug">{o.titulo}</p>
                        <p className="mt-1 text-[12.5px] text-gris">{o.equipo} · {o.asignado ?? "sin asignar"} · {hace(o.creada)}{o.automatica && " · automática"}</p>
                      </motion.button>
                    ))}
                    {lista.length === 0 && <p className="py-8 text-center text-[13px] text-gris">Nada por aquí.</p>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {tab === "cambios" && (!cambios.data ? <Esqueleto className="h-[40vh]" /> : (
          <div className="grid gap-3">
            {cambios.data.length === 0 && <Tarjeta className="p-10 text-center text-gris">No hay cambios de programa solicitados.</Tarjeta>}
            {cambios.data.map((c, i) => (
              <motion.button key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} onClick={() => ir(`?cambio=${c.id}`)}
                className={cx("tarjeta flex cursor-pointer flex-wrap items-center gap-4 p-4 text-left", c.estado === "pendiente" && "border-acento/40")}>
                <span className={cx("grid size-11 place-items-center rounded-md", c.estado === "pendiente" ? "bg-acento-claro text-acento" : c.estado === "aprobado" ? "bg-verde-claro text-verde" : "bg-rojo-claro text-rojo")}><GitPullRequest className="size-5" /></span>
                <div className="min-w-0 flex-1"><p className="font-semibold">{c.plc} · {c.resumen}</p><p className="truncate text-[13px] text-gris">{c.justificacion || "Sin justificación"}</p><p className="text-[12.5px] text-gris">{c.solicitadoPor} · {c.origen} · {hace(c.fecha)}{c.revisadoPor && ` · revisó ${c.revisadoPor}`}</p></div>
                <Chip tono={c.estado === "aprobado" ? "ok" : c.estado === "rechazado" ? "peligro" : "aviso"}>{c.estado === "pendiente" ? (c.puedeAprobar ? "espera su aprobación" : "pendiente") : c.estado}</Chip>
              </motion.button>
            ))}
          </div>
        ))}
      </div>
      <Cajon abierto={!!ordenSel} onCerrar={() => ir("")} titulo={`Orden de trabajo`} ancho={600}>{ordenSel && <DetalleOt id={Number(ordenSel)} />}</Cajon>
      <Cajon abierto={!!cambioSel} onCerrar={() => ir("")} titulo="Cambio de programa" ancho={980}>{cambioSel && <DetalleCambioVista id={Number(cambioSel)} alTerminar={() => ir("")} />}</Cajon>
    </>
  );
}

function DetalleOt({ id }: { id: number }) {
  const { data } = useQuery({ queryKey: ["ordenes", id], queryFn: () => api.get<DetalleOrden>(`/api/ordenes/${id}`) });
  const { usuario, tiene } = useAuth();
  const qc = useQueryClient(); const aviso = useAviso();
  const firmar = useMutation({
    mutationFn: (v: { tipo: string; aprobar: boolean; nota: string }) => api.post(`/api/ordenes/${id}/validar`, v),
    onSuccess: (_, v) => { aviso(v.aprobar ? `${ETAPAS_LIBERACION[v.tipo].t} registrada.` : `${ETAPAS_LIBERACION[v.tipo].t} rechazada: la orden vuelve al técnico.`); for (const k of ["ordenes", "aprobaciones", "equipos", "notificaciones"]) void qc.invalidateQueries({ queryKey: [k] }); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  if (!data) return <Esqueleto className="h-80" />;
  const pasos = [{ t: "Creada", ok: true, d: fecha(data.creada) }, { t: "Tomada con LOTO", ok: data.estado !== "abierta", d: data.asignado ?? "—" }, { t: "Intervención", ok: data.intervenciones.length > 0, d: `${data.intervenciones.length} registrada(s)` }, { t: "Terminada por el técnico", ok: data.estado === "por_verificar" || data.estado === "cerrada", d: data.cierreSolicitado ? fecha(data.cierreSolicitado) : "—" }, { t: "Liberada para producción", ok: data.estado === "cerrada", d: data.cerrada ? fecha(data.cerrada) : data.liberacion?.pendientes.length ? `faltan ${data.liberacion.pendientes.length} firmas` : "—" }];
  return (
    <div className="grid gap-5">
      <div><p className="num text-[13px] text-gris">{data.codigo} · {data.tipo}</p><h3 className="text-[19px] font-semibold leading-tight">{data.titulo}</h3><p className="mt-1 text-[13.5px] text-gris">{data.equipo.codigo} {data.equipo.nombre} · {data.equipo.area} · {data.equipo.linea}</p><div className="mt-2 flex gap-2"><EstadoEquipo estado={data.equipo.estado} tam="s" />{data.simulada && <MarcaSimulado texto="Nació de un PLC simulado" />}</div></div>
      <ol className="grid grid-cols-5 gap-2">
        {pasos.map((p, i) => (
          <motion.li key={p.t} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="relative">
            <div className={cx("h-1 rounded-full", p.ok ? "bg-acento" : "bg-linea-suave")} />
            <p className={cx("mt-2 text-[12.5px] font-semibold", !p.ok && "text-gris")}>{p.t}</p><p className="truncate text-[11.5px] text-gris">{p.d}</p>
          </motion.li>
        ))}
      </ol>
      {(data.estado === "por_verificar" || data.estado === "cerrada") && (
        <LiberacionOrden estado={data.estado} equipo={data.equipo.codigo} asignado={data.asignado} cierreSolicitado={data.cierreSolicitado} verificadaEn={data.verificadaEn} lib={data.liberacion}
          participo={data.asignadoAId === usuario?.id} puedeFirmar={(t) => tiene(ETAPAS_LIBERACION[t].capacidad)} nombreUsuario={usuario?.nombre} firmando={firmar.isPending} onFirmar={(tipo, aprobar, nota) => firmar.mutate({ tipo, aprobar, nota })} />
      )}
      {data.descripcion && <p className="whitespace-pre-wrap rounded-md bg-papel-2 p-4 text-[14px]">{data.descripcion}</p>}
      <div>
        <p className="mb-2 flex items-center gap-2 font-semibold"><Wrench className="size-4 text-acento" />Intervenciones</p>
        {data.intervenciones.length === 0 ? <p className="text-[13.5px] text-gris">Aún no hay intervenciones. El técnico las registra desde SIMA Desktop.</p> : data.intervenciones.map((i) => (
          <div key={i.id} className="mb-2 rounded-md border border-linea-suave p-4"><p className="font-medium">{i.accion}</p><p className="text-[12.5px] text-gris">{i.tecnicoNombre} · {i.causa} · {i.resultado.replace("_", " ")} · {fecha(i.fin)}</p><p className="mt-1.5 text-[13.5px]">Diagnóstico: {i.diagnostico}</p>{i.herramientas.length > 0 && <p className="mt-1 text-[12.5px] text-gris">Herramientas: {i.herramientas.join(", ")}</p>}</div>
        ))}
      </div>
      {data.repuestos.length > 0 && <div><p className="mb-2 font-semibold">Repuestos consumidos</p><ul className="divide-y divide-linea-suave rounded-md border border-linea-suave">{data.repuestos.map((r, i) => <li key={i} className="flex justify-between px-4 py-2 text-[13.5px]"><span><b className="num">{r.codigo}</b> {r.nombre}</span><span className="num">{r.cantidad}</span></li>)}</ul></div>}
    </div>
  );
}

function DetalleCambioVista({ id, alTerminar }: { id: number; alTerminar: () => void }) {
  const qc = useQueryClient();
  const aviso = useAviso();
  const [comentario, setComentario] = useState("");
  const { data } = useQuery({ queryKey: ["cambios", id], queryFn: () => api.get<DetalleCambio>(`/api/plc/cambios/${id}`) });
  const decidir = useMutation({
    mutationFn: (d: "aprobar" | "rechazar") => api.post(`/api/plc/cambios/${id}/${d}`, { comentario }),
    onSuccess: (_, d) => { aviso(d === "aprobar" ? "Cambio aprobado y publicado en el PLC." : "Cambio rechazado."); void qc.invalidateQueries({ queryKey: ["cambios"] }); void qc.invalidateQueries({ queryKey: ["aprobaciones"] }); alTerminar(); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  if (!data) return <Esqueleto className="h-96" />;
  const antes = new Map(data.actual.peldanos.map((p) => [p.id, JSON.stringify(p)]));
  const cambiados = data.propuesto.peldanos.filter((p) => antes.get(p.id) !== JSON.stringify(p));
  const quitados = data.actual.peldanos.filter((p) => !data.propuesto.peldanos.some((x) => x.id === p.id));
  return (
    <div className="grid gap-5">
      <div className="rounded-md bg-papel-2 p-4"><p className="font-semibold">{data.plc} · {data.resumen}</p><p className="mt-1 text-[14px]">{data.justificacion || "Sin justificación."}</p><p className="mt-1 text-[12.5px] text-gris">Solicitado por {data.solicitadoPor} · {hace(data.fecha)}</p></div>
      {cambiados.map((p) => {
        const previo = data.actual.peldanos.find((x) => x.id === p.id);
        return (
          <div key={p.id} className="grid gap-3 lg:grid-cols-2">
            <div><p className="mb-1.5 text-[12.5px] font-semibold text-rojo">Publicado {previo ? `· peldaño ${p.id}` : "· (no existe)"}</p>{previo ? <Escalera peldanos={[previo]} io={{}} /> : <p className="rounded-md border border-dashed border-linea p-6 text-center text-[13px] text-gris">Peldaño nuevo</p>}</div>
            <div><p className="mb-1.5 text-[12.5px] font-semibold text-verde">Propuesto · peldaño {p.id}</p><Escalera peldanos={[p]} io={{}} /></div>
          </div>
        );
      })}
      {quitados.length > 0 && <div><p className="mb-1.5 text-[12.5px] font-semibold text-rojo">Se quitan</p><Escalera peldanos={quitados} io={{}} /></div>}
      {data.estado === "pendiente" && (data.puedeAprobar ? (
        <div className="grid gap-3 rounded-md border border-acento/30 p-4">
          <AreaTexto placeholder="Comentario (opcional)" value={comentario} onChange={(e) => setComentario(e.target.value)} />
          <div className="flex justify-end gap-2"><Boton variante="peligro" onClick={() => decidir.mutate("rechazar")}><XCircle className="size-4" />Rechazar</Boton><Boton variante="acento" cargando={decidir.isPending} onClick={() => decidir.mutate("aprobar")}><BadgeCheck className="size-4" />Aprobar y publicar</Boton></div>
        </div>
      ) : <p className="rounded-md bg-ambar-claro p-4 text-[14px] text-ambar-hondo">Pendiente de aprobación por la jefatura de mantenimiento o la gerencia de planta. Quien lo solicitó no puede aprobarlo.</p>)}
    </div>
  );
}
