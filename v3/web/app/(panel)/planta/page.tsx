"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { fecha, hace, type Equipo } from "@sima/cliente";
import { api } from "@/lib/api";
import { usePlanta } from "@/lib/planta";
import { useAuth } from "@/lib/auth";
import { Medidor } from "@/components/plc";
import { Chip, Encabezado, ErrorCarga, Pestanas, Seccion, Tabla, cx, type Columna } from "@/components/ui";

interface Alarma { id: number; equipo: string; equipoNombre: string; variable: string; nivel: string; mensaje: string; inicio: string; fin?: string | null; reconocidaPor?: string | null }
interface Traspaso { id: number; fecha: string; turno: string; por: string; notas: string; revisiones: { texto: string; ok: boolean }[]; resumen: { ordenesAbiertas: number; ordenesEnCurso: number; alarmasAbiertas: number; repuestosCriticosBajos: number; equiposFuera: string[] } }
interface Orden { id: number; codigo: string; equipo: string; equipoNombre: string; titulo: string; prioridad: string; estado: string; automatica: boolean; creada: string; asignado?: string | null }

const ESTADO: Record<string, { texto: string; tono: "ok" | "peligro" | "neutro" | "aviso" }> = {
  operando: { texto: "Operando", tono: "ok" }, alarma: { texto: "Con alarma", tono: "peligro" }, detenido: { texto: "Detenido", tono: "neutro" }, en_mantencion: { texto: "En mantención", tono: "aviso" },
};
const PRIORIDAD: Record<string, "peligro" | "aviso" | "neutro" | "info"> = { critica: "peligro", alta: "aviso", media: "info", baja: "neutro" };

function Tarjeta({ e, i }: { e: Equipo; i: number }) {
  const est = ESTADO[e.estado] ?? ESTADO.detenido;
  return (
    <motion.li layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.025, 0.3) }}
      className={cx("flex flex-col border-t-[3px] bg-papel", e.estado === "alarma" ? "border-rojo" : e.estado === "en_mantencion" ? "border-ambar" : "border-negro")}>
      <div className="flex items-start justify-between gap-3 p-4 pb-2">
        <div className="min-w-0"><p className="display text-[26px] font-bold leading-none">{e.codigo}</p><p className="truncate font-medium">{e.nombre}</p><p className="truncate text-[13px] text-gris">{e.tipo}</p></div>
        <Chip tono={est.tono}>{est.texto}</Chip>
      </div>
      <div className="space-y-3 px-4 py-3">{e.sensores.map((s) => <Medidor key={s.variable} s={s} />)}</div>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-linea-suave px-4 py-2 text-[13px] text-gris">
        <span className="truncate">{e.ubicacion}</span>
        {e.plc && <Link href={`/plc/${e.plc}`} className="shrink-0 font-medium text-negro underline decoration-linea underline-offset-2 hover:decoration-negro">{e.plc}</Link>}
      </div>
    </motion.li>
  );
}

export default function Planta() {
  const { equipos } = usePlanta();
  const { puede } = useAuth();
  const [tab, setTab] = useState<"equipos" | "alarmas" | "ordenes" | "traspasos">("equipos");
  const traspasos = useQuery({ queryKey: ["traspasos"], queryFn: () => api.get<Traspaso[]>("/api/traspaso"), enabled: puede("traspaso") && tab === "traspasos" });
  const [zona, setZona] = useState("");
  const alarmas = useQuery({ queryKey: ["alarmas"], queryFn: () => api.get<Alarma[]>("/api/alarmas"), refetchInterval: 10_000 });
  const ordenes = useQuery({ queryKey: ["ordenes"], queryFn: () => api.get<Orden[]>("/api/ordenes"), refetchInterval: 15_000 });
  const zonas = useMemo(() => [...new Set(equipos.map((e) => e.zona))], [equipos]);
  const visibles = equipos.filter((e) => !zona || e.zona === zona);
  const abiertas = alarmas.data?.filter((a) => !a.fin).length ?? 0;
  const ordAbiertas = ordenes.data?.filter((o) => o.estado !== "cerrada").length ?? 0;

  const colAl: Columna<Alarma>[] = [
    { clave: "n", titulo: "Nivel", render: (a) => <Chip tono={a.nivel === "alarma" ? "peligro" : "aviso"}>{a.nivel === "alarma" ? "Alarma" : "Aviso"}</Chip> },
    { clave: "e", titulo: "Equipo", render: (a) => <div><p className="font-medium">{a.equipo}</p><p className="text-[13px] text-gris">{a.equipoNombre}</p></div> },
    { clave: "m", titulo: "Qué pasó", render: (a) => a.mensaje },
    { clave: "i", titulo: "Desde", render: (a) => <span className="num text-gris">{hace(a.inicio)}</span> },
    { clave: "s", titulo: "Estado", render: (a) => a.fin ? <Chip tono="ok">Resuelta</Chip> : a.reconocidaPor ? <Chip tono="info">Reconocida</Chip> : <Chip tono="peligro">Abierta</Chip> },
  ];
  const colOt: Columna<Orden>[] = [
    { clave: "c", titulo: "Orden", render: (o) => <div><p className="num font-medium">{o.codigo}</p>{o.automatica && <p className="text-[13px] text-gris">automática</p>}</div> },
    { clave: "t", titulo: "Trabajo", render: (o) => <div><p className="font-medium">{o.titulo}</p><p className="text-[13px] text-gris">{o.equipo} · {o.equipoNombre}</p></div> },
    { clave: "p", titulo: "Prioridad", render: (o) => <Chip tono={PRIORIDAD[o.prioridad]}>{o.prioridad[0].toUpperCase() + o.prioridad.slice(1)}</Chip> },
    { clave: "a", titulo: "Asignada a", render: (o) => <span className="text-gris">{o.asignado ?? "Sin asignar"}</span> },
    { clave: "f", titulo: "Creada", render: (o) => <span className="num text-gris">{fecha(o.creada)}</span> },
    { clave: "s", titulo: "Estado", render: (o) => <Chip tono={o.estado === "cerrada" ? "ok" : o.estado === "en_curso" ? "aviso" : "peligro"}>{o.estado === "en_curso" ? "En curso" : o.estado === "cerrada" ? "Cerrada" : "Abierta"}</Chip> },
  ];

  return (
    <>
      <Encabezado titulo="Equipos y alarmas" descripcion="Lo que informan los PLC, al segundo. Cuando una variable pasa su límite, se abre una alarma y se crea una orden de trabajo." />
      <Pestanas id="planta" activa={tab} onCambio={setTab} items={[{ clave: "equipos", titulo: "Equipos", n: equipos.length }, { clave: "alarmas", titulo: "Alarmas abiertas", n: abiertas }, { clave: "ordenes", titulo: "Órdenes de trabajo", n: ordAbiertas }, ...(puede("traspaso") ? [{ clave: "traspasos" as const, titulo: "Traspasos de turno" }] : [])]} />
      <div className="mt-5">
        {tab === "equipos" && (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              {["", ...zonas].map((z) => <button key={z || "todas"} onClick={() => setZona(z)} className={cx("h-9 cursor-pointer px-3.5 text-[14px] font-medium transition-colors", zona === z ? "bg-negro text-white" : "bg-papel hover:bg-chapa")}>{z || "Toda la planta"}</button>)}
            </div>
            {equipos.length === 0 ? <Seccion><p className="p-10 text-center text-gris">Esperando los datos de la planta…</p></Seccion> : <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibles.map((e, i) => <Tarjeta key={e.codigo} e={e} i={i} />)}</ul>}
          </>
        )}
        {tab === "alarmas" && (alarmas.error ? <ErrorCarga error={alarmas.error} /> : <Seccion><Tabla columnas={colAl} filas={alarmas.data ?? []} clave={(a) => a.id} cargando={alarmas.isLoading} vacio={<p className="p-10 text-center text-gris">No hay alarmas registradas.</p>} maxAlto="calc(100dvh - 300px)" /></Seccion>)}
        {tab === "traspasos" && (
          <ul className="grid gap-3">
            {(traspasos.data ?? []).length === 0 && <Seccion><p className="p-8 text-center text-gris">Todavía no hay traspasos de turno.</p></Seccion>}
            {(traspasos.data ?? []).map((t) => (
              <li key={t.id}><Seccion sinBorde className="border-l-[4px] border-negro"><div className="grid gap-3 p-4 md:grid-cols-[1fr_1.4fr]">
                <div><p className="display text-[24px] font-semibold leading-none">Turno {t.turno === "D" ? "diurno" : t.turno === "N" ? "de noche" : t.turno}</p><p className="num text-[14px] text-gris">{new Date(t.fecha).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" })} · {t.por}</p>
                  <p className="mt-2 text-[14px]">{t.resumen.ordenesAbiertas} órdenes abiertas, {t.resumen.ordenesEnCurso} en curso, {t.resumen.alarmasAbiertas} alarmas, {t.resumen.repuestosCriticosBajos} repuestos críticos bajo el mínimo{t.resumen.equiposFuera.length ? `. Fuera de servicio: ${t.resumen.equiposFuera.join(", ")}` : ""}.</p>{t.notas && <p className="mt-2 border-l-2 border-linea pl-3 text-[14px]">{t.notas}</p>}</div>
                <ul className="space-y-1 text-[14px]">{t.revisiones.map((r) => <li key={r.texto} className="flex gap-2"><Chip tono={r.ok ? "ok" : "aviso"} punto={false}>{r.ok ? "Revisado" : "Pendiente"}</Chip><span className="text-gris">{r.texto}</span></li>)}</ul>
              </div></Seccion></li>
            ))}
          </ul>
        )}
        {tab === "ordenes" && (ordenes.error ? <ErrorCarga error={ordenes.error} /> : <Seccion><Tabla columnas={colOt} filas={ordenes.data ?? []} clave={(o) => o.id} cargando={ordenes.isLoading} vacio={<p className="p-10 text-center text-gris">No hay órdenes de trabajo.</p>} maxAlto="calc(100dvh - 300px)" /></Seccion>)}
      </div>
    </>
  );
}
