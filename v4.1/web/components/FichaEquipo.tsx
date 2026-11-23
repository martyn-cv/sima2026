"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronRight, Cpu, FileText, History, Package, ShieldAlert, Wrench } from "lucide-react";
import { fecha, hace, num, type FichaEquipo } from "@sima/cliente";
import { api } from "@/lib/api";
import { usePlanta } from "@/lib/planta";
import { Chip, CURVA, Esqueleto, ErrorCarga, Maquina, Medidor, cx } from "@/components/ui";

export const ESTADO_EQ: Record<string, { texto: string; tono: "ok" | "peligro" | "aviso" | "neutro"; color: string }> = {
  operando: { texto: "Operando", tono: "ok", color: "var(--s-verde)" },
  alarma: { texto: "Con alarma", tono: "peligro", color: "var(--s-rojo)" },
  en_mantencion: { texto: "En mantención", tono: "aviso", color: "var(--s-ambar)" },
  detenido: { texto: "Detenido", tono: "neutro", color: "var(--s-tenue)" },
};
const CAUSA: Record<string, string> = { mecanica: "Mecánica", electrica: "Eléctrica", hidraulica: "Hidráulica", neumatica: "Neumática", electronica: "Electrónica", operacional: "Operacional", desgaste: "Desgaste" };
const ORIGEN: Record<string, string> = { simulador: "simulador", gateway: "PLC real", web: "web", desktop: "SIMA Desktop", sistema: "sistema", interno: "simulación interna" };

export function MarcaSim({ className }: { className?: string }) {
  return <span title="Dato de un PLC simulado: no corresponde a maquinaria real" className={cx("inline-flex h-5 items-center rounded-md border border-cian/40 bg-cian/10 px-1.5 font-mono text-[10.5px] font-bold tracking-wider text-cian", className)}>SIM</span>;
}

type Pestana = "historial" | "mantenimiento" | "documentos" | "repuestos" | "plc";

export function FichaEquipoVista({ codigo }: { codigo: string }) {
  const { equipos } = usePlanta();
  const [tab, setTab] = useState<Pestana>("historial");
  const [doc, setDoc] = useState<number | null>(null);
  const { data, error, refetch } = useQuery({ queryKey: ["equipo", codigo], queryFn: () => api.get<FichaEquipo>(`/api/equipos/${codigo}`), refetchInterval: 15_000, enabled: !!codigo });
  if (error) return <ErrorCarga error={error} reintentar={() => void refetch()} />;
  if (!data) return <div className="grid gap-3"><Esqueleto className="h-40" /><Esqueleto className="h-28" /><Esqueleto className="h-60" /></div>;
  const vivo = equipos.find((e) => e.codigo === codigo);
  const estado = vivo?.estado ?? data.equipo.estado;
  const est = ESTADO_EQ[estado] ?? ESTADO_EQ.detenido;
  const sensores = vivo?.sensores ?? data.sensores;
  const ind = data.indicadores;
  const pestanas: { k: Pestana; t: string; i: typeof History; n?: number }[] = [
    { k: "historial", t: "Historial", i: History, n: data.historial.length },
    { k: "mantenimiento", t: "Mantenimiento", i: Wrench, n: data.intervenciones.length },
    { k: "documentos", t: "Documentos", i: FileText, n: data.documentos.length },
    { k: "repuestos", t: "Repuestos", i: Package, n: data.repuestos.length },
    { k: "plc", t: "PLC", i: Cpu },
  ];

  return (
    <div className="grid min-w-0 gap-5">
      {/* cabecera */}
      <div className="relative overflow-hidden rounded-2xl border border-linea-suave p-5" style={{ background: `radial-gradient(90% 120% at 100% 0%, color-mix(in srgb, ${est.color} 16%, transparent), transparent 60%), var(--s-superficie-2)` }}>
        <p className="mb-3 flex flex-wrap items-center gap-1 text-[12.5px] text-gris">{data.jerarquia.planta}<ChevronRight className="size-3" />{data.jerarquia.area.nombre}<ChevronRight className="size-3" />{data.jerarquia.linea.nombre}</p>
        <div className="flex items-center gap-5">
          <Maquina tipo={data.equipo.tipo} estado={estado} className="h-24 w-36 shrink-0" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h2 className="display text-[30px] font-bold leading-none">{data.equipo.codigo}</h2><Chip tono={est.tono}>{est.texto}</Chip>{data.equipo.simulado && <MarcaSim />}</div>
            <p className="mt-1 text-[15px] font-medium">{data.equipo.nombre}</p>
            <p className="text-[13px] text-gris">{data.equipo.tipo} · {data.equipo.marca} {data.equipo.modelo} · criticidad {data.equipo.criticidad}</p>
          </div>
        </div>
      </div>

      {/* indicadores de 30 días */}
      {ind && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Disponibilidad", `${num(ind.disponibilidad * 100, 1)} %`, "var(--s-verde)"], ["OEE", `${num(ind.oee * 100, 1)} %`, "var(--s-acento)"], ["MTTR", `${num(ind.mttrHoras, 1)} h`, "var(--s-cobre)"], ["Fallas (30 d)", String(ind.fallas), ind.fallas > 2 ? "var(--s-rojo)" : "var(--s-ambar)"]].map(([t, v, c], i) => (
            <motion.div key={t} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl border border-linea-suave bg-papel-2/60 p-3.5">
              <p className="text-[12px] text-gris">{t}</p><p className="display text-[24px] font-bold leading-tight" style={{ color: c }}>{v}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* sensores en vivo */}
      <div>
        <p className="mb-2 text-[13px] font-semibold text-gris">Variables en vivo</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {sensores.map((s) => (
            <div key={s.variable} className="flex flex-col items-center rounded-2xl border border-linea-suave bg-papel-2/50 px-2 pb-2 pt-3">
              <Medidor valor={s.ultimo} min={s.min} max={s.max} aviso={s.aviso} alarma={s.alarma} unidad={s.unidad} etiqueta={s.nombre} tam={140} />
              <p className="-mt-1 text-center text-[12px] leading-tight text-gris">{s.nombre}</p>
            </div>
          ))}
        </div>
      </div>

      {/* pestañas */}
      <div className="min-w-0">
        <div className="flex gap-1 overflow-x-auto rounded-2xl bg-papel-2 p-1">
          {pestanas.map((p) => (
            <button key={p.k} onClick={() => setTab(p.k)} className={cx("relative inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium", tab === p.k ? "text-negro" : "text-gris hover:text-negro")}>
              {tab === p.k && <motion.span layoutId={`ficha-${codigo}`} className="absolute inset-0 rounded-xl bg-papel shadow-sm" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <p.i className="relative size-4" /><span className="relative">{p.t}</span>{p.n != null && <span className="relative num text-[11px] text-gris">{p.n}</span>}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18, ease: CURVA }} className="mt-3">
            {tab === "historial" && (
              <ol className="relative ml-2 border-l border-linea pl-5">
                {data.historial.length === 0 && <li className="py-6 text-[14px] text-gris">Sin cambios de estado registrados.</li>}
                {data.historial.map((h, i) => (
                  <li key={i} className="relative pb-4">
                    <span className="absolute -left-[27px] top-1 size-3 rounded-full ring-4 ring-papel" style={{ background: ESTADO_EQ[h.hasta]?.color ?? "var(--s-tenue)" }} />
                    <p className="text-[14px]"><b>{ESTADO_EQ[h.desde]?.texto ?? h.desde}</b> → <b>{ESTADO_EQ[h.hasta]?.texto ?? h.hasta}</b> {h.simulado && <MarcaSim className="ml-1 align-middle" />}</p>
                    <p className="text-[12.5px] text-gris">{h.causa} · {ORIGEN[h.origen] ?? h.origen} · {hace(h.ts)}</p>
                  </li>
                ))}
              </ol>
            )}
            {tab === "mantenimiento" && (
              <div className="grid gap-3">
                {data.intervenciones.length === 0 && <p className="py-6 text-center text-[14px] text-gris">Todavía no hay intervenciones registradas.</p>}
                {data.intervenciones.map((i) => (
                  <div key={i.id} className="rounded-2xl border border-linea-suave p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{i.accion}</p><Chip tono={i.resultado === "resuelto" ? "ok" : "aviso"} punto={false}>{i.resultado.replace("_", " ")}</Chip></div>
                    <p className="mt-1 text-[13px] text-gris">{i.orden} · {CAUSA[i.causa] ?? i.causa} · {i.tecnicoNombre} · {num(i.horas, 1)} h · {fecha(i.fin)}</p>
                    <p className="mt-2 text-[13.5px] text-carbon">Diagnóstico: {i.diagnostico}</p>
                    {(i.repuestos.length > 0 || i.herramientas.length > 0) && <div className="mt-2 flex flex-wrap gap-1.5">{i.repuestos.map((r) => <Chip key={r.codigo} punto={false} tono="info">{r.cantidad} × {r.nombre}</Chip>)}{i.herramientas.map((h) => <Chip key={h} punto={false}>{h}</Chip>)}</div>}
                  </div>
                ))}
                {data.ordenes.filter((o) => o.estado !== "cerrada").map((o) => (
                  <Link key={o.id} href={`/mantenimiento?orden=${o.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-ambar/30 bg-ambar-claro px-4 py-3 text-[14px]"><span><b className="num">{o.codigo}</b> {o.titulo}</span><Chip tono="aviso">{o.estado === "en_curso" ? "en curso" : "abierta"}</Chip></Link>
                ))}
              </div>
            )}
            {tab === "documentos" && (
              <ul className="grid gap-2">
                {data.documentos.map((d) => (
                  <li key={d.id} className="overflow-hidden rounded-2xl border border-linea-suave">
                    <button onClick={() => setDoc(doc === d.id ? null : d.id)} className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-papel-2">
                      <span className={cx("grid size-8 place-items-center rounded-lg", d.clase === "seguridad" ? "bg-rojo-claro text-rojo" : d.clase === "ficha" ? "bg-azul-claro text-azul" : "bg-acento-claro text-acento")}>{d.clase === "seguridad" ? <ShieldAlert className="size-4" /> : <FileText className="size-4" />}</span>
                      <span className="flex-1"><span className="block font-medium">{d.titulo}</span><span className="text-[12px] text-gris">{d.clase} · versión {d.version}</span></span>
                      <ChevronDown className={cx("size-4 text-gris transition-transform", doc === d.id && "rotate-180")} />
                    </button>
                    <AnimatePresence>{doc === d.id && <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden"><pre className="whitespace-pre-wrap border-t border-linea-suave bg-papel-2/50 px-4 py-3 font-sans text-[13.5px] leading-relaxed">{d.contenido}</pre></motion.div>}</AnimatePresence>
                  </li>
                ))}
              </ul>
            )}
            {tab === "repuestos" && (
              <ul className="grid gap-2.5">
                {data.repuestos.map((r) => (
                  <li key={r.id} className="rounded-2xl border border-linea-suave px-4 py-3">
                    <div className="flex items-center justify-between gap-3"><span><b className="num text-[13px]">{r.codigo}</b> <span className="text-[14px]">{r.nombre}</span>{r.critico && <Chip className="ml-2" tono="peligro" punto={false}>crítico</Chip>}</span><span className={cx("num font-semibold", r.stock <= r.stockMinimo && "text-rojo")}>{r.stock}</span></div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-linea-suave"><motion.div className="h-full rounded-full" style={{ background: r.stock <= r.stockMinimo ? "var(--s-rojo)" : "linear-gradient(90deg, var(--s-acento), var(--s-cobre))" }} initial={{ width: 0 }} animate={{ width: `${Math.min(100, (r.stock / Math.max(1, r.stockMinimo * 3)) * 100)}%` }} /></div>
                    <p className="mt-1 text-[12px] text-gris">{r.ubicacion} · mínimo {r.stockMinimo} · se usa {r.sugerida} por intervención</p>
                  </li>
                ))}
              </ul>
            )}
            {tab === "plc" && (data.plc ? (
              <div className="rounded-2xl border border-linea-suave">
                <div className="flex items-center justify-between gap-3 border-b border-linea-suave px-4 py-3"><div><p className="font-semibold">{data.plc.codigo} · {data.plc.nombre}</p><p className="text-[12.5px] text-gris">{data.plc.fabricante} {data.plc.modelo} · {data.plc.direccion} {data.plc.origen !== "real" && "· simulado"}</p></div><Link href={`/plc/equipo?codigo=${data.plc.codigo}`} className="text-[13px] font-medium text-acento">Abrir PLC</Link></div>
                <ul className="divide-y divide-linea-suave">{data.plc.puntos.map((p) => <li key={p.tag} className="flex items-center gap-3 px-4 py-2 text-[13px]"><span className="w-9 rounded bg-papel-2 text-center text-[11px] font-bold">{p.tipo}</span><span className="num w-20 text-gris">{p.direccion}</span><span className="font-mono">{p.tag}</span><span className="ml-auto truncate text-gris">{p.descripcion}</span></li>)}</ul>
              </div>
            ) : <p className="py-6 text-center text-[14px] text-gris">Este equipo no está conectado a un PLC.</p>)}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
