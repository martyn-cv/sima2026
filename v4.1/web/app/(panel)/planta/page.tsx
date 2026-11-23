"use client";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Cpu, Factory, Radio } from "lucide-react";
import { fecha, hace, type Equipo, type PlantaNodo } from "@sima/cliente";
import { api } from "@/lib/api";
import { usePlanta } from "@/lib/planta";
import { useAuth } from "@/lib/auth";
import { ESTADO_EQ, FichaEquipoVista, MarcaSim } from "@/components/FichaEquipo";
import { Cajon, Chip, Encabezado, ErrorCarga, Esqueleto, Maquina, Pestanas, Tabla, Tarjeta, cx, type Columna } from "@/components/ui";

interface Alarma { id: number; equipo: string; equipoNombre: string; variable: string; nivel: string; mensaje: string; inicio: string; fin?: string | null; reconocidaPor?: string | null }
interface Orden { id: number; codigo: string; equipo: string; equipoNombre: string; titulo: string; prioridad: string; estado: string; automatica: boolean; creada: string; asignado?: string | null }
const PRIORIDAD: Record<string, "peligro" | "aviso" | "neutro" | "info"> = { critica: "peligro", alta: "aviso", media: "info", baja: "neutro" };
const NIVEL = { alarma: "var(--s-rojo)", aviso: "var(--s-ambar)", info: "var(--s-azul)", ok: "var(--s-verde)" };

export default function Pagina() { return <Suspense fallback={<Esqueleto className="h-[70vh]" />}><Planta /></Suspense>; }

function TarjetaEquipo({ e, vivo, alElegir, i }: { e: PlantaNodo["areas"][number]["lineas"][number]["equipos"][number]; vivo?: Equipo; alElegir: () => void; i: number }) {
  const estado = vivo?.estado ?? e.estado;
  const est = ESTADO_EQ[estado] ?? ESTADO_EQ.detenido;
  const peor = vivo?.sensores.find((s) => s.nivel === "alarma") ?? vivo?.sensores.find((s) => s.nivel === "aviso") ?? vivo?.sensores[0];
  return (
    <motion.button layout onClick={alElegir} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.4) }} whileHover={{ y: -3 }}
      className={cx("group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl border bg-papel/80 p-3 text-left transition-colors", estado === "alarma" ? "border-rojo/50" : "border-linea-suave hover:border-acento/40")}
      style={estado === "alarma" ? { boxShadow: "0 0 0 1px var(--s-rojo), 0 0 28px -6px var(--s-rojo)" } : undefined}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0"><p className="num text-[15px] font-bold leading-none">{e.codigo}</p><p className="mt-0.5 truncate text-[12px] text-gris">{e.nombre}</p></div>
        <span className="relative mt-0.5 grid size-3 shrink-0 place-items-center">{estado === "alarma" && <span className="absolute inset-0 animate-ping rounded-full" style={{ background: est.color }} />}<span className="relative size-2.5 rounded-full" style={{ background: est.color, boxShadow: `0 0 10px ${est.color}` }} /></span>
      </div>
      <Maquina tipo={e.tipo} estado={estado} className="mx-auto my-1 h-[78px] w-full max-w-[150px]" />
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className="truncate text-gris">{peor ? peor.nombre : est.texto}</span>
        {peor && <span className={cx("num shrink-0 font-semibold", peor.nivel === "alarma" && "text-rojo", peor.nivel === "aviso" && "text-ambar")}>{peor.ultimo == null ? "—" : peor.ultimo.toFixed(peor.max > 50 ? 0 : 1)} {peor.unidad}</span>}
      </div>
      <div className="mt-2 flex items-center gap-1.5">{e.plc && <span className="rounded-md bg-papel-2 px-1.5 py-0.5 font-mono text-[10.5px] text-gris">{e.plc}</span>}{e.simulado && <MarcaSim />}{e.alarmas > 0 && <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-semibold text-rojo"><AlertTriangle className="size-3.5" />{e.alarmas}</span>}</div>
    </motion.button>
  );
}

function Planta() {
  const router = useRouter();
  const sel = useSearchParams().get("equipo");
  const { equipos, eventos, conexion } = usePlanta();
  const [tab, setTab] = useState<"mapa" | "alarmas" | "ordenes">("mapa");
  const [area, setArea] = useState<number | null>(null);
  const estructura = useQuery({ queryKey: ["estructura"], queryFn: () => api.get<PlantaNodo[]>("/api/estructura"), refetchInterval: 20_000 });
  const alarmas = useQuery({ queryKey: ["alarmas"], queryFn: () => api.get<Alarma[]>("/api/alarmas"), refetchInterval: 10_000, enabled: tab === "alarmas" });
  const { tiene } = useAuth();
  const ordenes = useQuery({ queryKey: ["ordenes"], queryFn: () => api.get<Orden[]>("/api/ordenes"), refetchInterval: 15_000, enabled: tiene("ordenes.ver") });
  const vivos = useMemo(() => new Map(equipos.map((e) => [e.codigo, e])), [equipos]);
  const planta = estructura.data?.[0];
  const elegir = (codigo: string | null) => router.replace(codigo ? `/planta?equipo=${codigo}` : "/planta", { scroll: false });

  const cuenta = (k: string) => equipos.filter((e) => e.estado === k).length;
  const colAl: Columna<Alarma>[] = [
    { clave: "n", titulo: "Nivel", render: (a) => <Chip tono={a.nivel === "alarma" ? "peligro" : "aviso"}>{a.nivel === "alarma" ? "Alarma" : "Aviso"}</Chip> },
    { clave: "e", titulo: "Equipo", render: (a) => <div><p className="num font-medium">{a.equipo}</p><p className="text-[12.5px] text-gris">{a.equipoNombre}</p></div> },
    { clave: "m", titulo: "Qué pasó", render: (a) => a.mensaje },
    { clave: "i", titulo: "Desde", render: (a) => <span className="num text-gris">{hace(a.inicio)}</span> },
    { clave: "s", titulo: "Estado", render: (a) => a.fin ? <Chip tono="ok">Resuelta</Chip> : a.reconocidaPor ? <Chip tono="info">Reconocida</Chip> : <Chip tono="peligro">Abierta</Chip> },
  ];
  const colOt: Columna<Orden>[] = [
    { clave: "c", titulo: "Orden", render: (o) => <div><p className="num font-medium">{o.codigo}</p>{o.automatica && <p className="text-[12.5px] text-gris">automática</p>}</div> },
    { clave: "t", titulo: "Trabajo", render: (o) => <div><p className="font-medium">{o.titulo}</p><p className="text-[12.5px] text-gris">{o.equipo} · {o.equipoNombre}</p></div> },
    { clave: "p", titulo: "Prioridad", render: (o) => <Chip tono={PRIORIDAD[o.prioridad]}>{o.prioridad}</Chip> },
    { clave: "a", titulo: "Asignada a", render: (o) => <span className="text-gris">{o.asignado ?? "Sin asignar"}</span> },
    { clave: "f", titulo: "Creada", render: (o) => <span className="num text-gris">{fecha(o.creada)}</span> },
    { clave: "s", titulo: "Estado", render: (o) => <Chip tono={o.estado === "cerrada" ? "ok" : o.estado === "en_curso" ? "aviso" : "peligro"}>{o.estado === "en_curso" ? "En curso" : o.estado === "cerrada" ? "Cerrada" : "Abierta"}</Chip> },
  ];

  return (
    <>
      <Encabezado titulo="Planta en vivo" descripcion="Cada máquina se mueve cuando opera y se detiene cuando para. Los datos llegan de los PLC al segundo."
        acciones={<span className={cx("inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium", conexion === "conectado" ? "bg-verde-claro text-verde" : "bg-ambar-claro text-ambar")}><Radio className={cx("size-4", conexion === "conectado" && "animate-latido")} />{conexion === "conectado" ? "En vivo" : "Reconectando…"}</span>} />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {(["operando", "alarma", "en_mantencion", "detenido"] as const).map((k, i) => (
          <motion.div key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Tarjeta className="flex items-center gap-3 p-4" style={{ background: `radial-gradient(110% 120% at 0% 0%, color-mix(in srgb, ${ESTADO_EQ[k].color} 16%, transparent), transparent 60%), var(--s-superficie)` }}>
              <span className="grid size-10 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${ESTADO_EQ[k].color} 18%, transparent)`, color: ESTADO_EQ[k].color }}>{k === "alarma" ? <AlertTriangle className="size-5" /> : <Factory className="size-5" />}</span>
              <div><p className="display text-[28px] font-bold leading-none">{cuenta(k)}</p><p className="text-[12.5px] text-gris">{ESTADO_EQ[k].texto.toLowerCase()}</p></div>
            </Tarjeta>
          </motion.div>
        ))}
      </div>

      <Pestanas id="planta" activa={tab} onCambio={setTab} items={[{ clave: "mapa", titulo: "Mapa de planta" }, { clave: "alarmas", titulo: "Alarmas" }, ...(tiene("ordenes.ver") ? [{ clave: "ordenes" as const, titulo: "Órdenes de trabajo", n: ordenes.data?.filter((o) => o.estado !== "cerrada").length }] : [])]} />

      <div className="mt-5">
        {tab === "mapa" && (estructura.error ? <ErrorCarga error={estructura.error} /> : !planta ? <Esqueleto className="h-[60vh]" /> : (
          <div className="grid gap-5 2xl:grid-cols-[1fr_340px]">
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                {[{ id: null as number | null, nombre: `Toda ${planta.nombre}` }, ...planta.areas.filter((a) => a.lineas.some((l) => l.equipos.length)).map((a) => ({ id: a.id as number | null, nombre: a.nombre }))].map((a) => (
                  <button key={a.id ?? "todas"} onClick={() => setArea(a.id)} className={cx("relative h-9 cursor-pointer rounded-full px-4 text-[13.5px] font-medium transition-colors", area === a.id ? "text-sobre-negro" : "bg-papel hover:bg-papel-2")}>
                    {area === a.id && <motion.span layoutId="zona-activa" className="degradado-marca absolute inset-0 rounded-full" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}<span className="relative">{a.nombre}</span>
                  </button>
                ))}
              </div>
              <div className="grid gap-5 xl:grid-cols-2">
                {planta.areas.filter((a) => a.lineas.some((l) => l.equipos.length) && (area == null || a.id === area)).map((a, ai) => (
                  <motion.section key={a.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ai * 0.08 }}
                    className={cx("relative overflow-hidden rounded-3xl border border-linea-suave p-4", a.lineas.reduce((n, l) => n + l.equipos.length, 0) > 4 && "xl:col-span-2")}
                    style={{ background: "linear-gradient(var(--s-superficie), var(--s-superficie)) padding-box, radial-gradient(120% 120% at 0% 0%, rgb(139 92 246 / .35), transparent 50%) border-box" }}>
                    <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(var(--s-borde-suave) 1px, transparent 1px), linear-gradient(90deg, var(--s-borde-suave) 1px, transparent 1px)", backgroundSize: "28px 28px", maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)" }} />
                    <header className="relative mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div><p className="display text-[19px] font-bold">{a.nombre}</p><p className="text-[12.5px] text-gris">{a.lineas.length} {a.lineas.length === 1 ? "línea" : "líneas"} · {a.lineas.reduce((n, l) => n + l.equipos.length, 0)} equipos</p></div>
                      <div className="flex gap-1.5">{a.plcs.map((p) => <span key={p.codigo} className="inline-flex items-center gap-1.5 rounded-full border border-linea-suave bg-papel-2 px-2.5 py-1 text-[12px]"><Cpu className="size-3.5 text-acento" />{p.codigo}<span className={cx("size-1.5 rounded-full", p.estado === "run" ? "bg-verde animate-latido" : p.estado === "error" ? "bg-rojo animate-parpadeo" : "bg-gris")} /></span>)}</div>
                    </header>
                    <div className="relative grid gap-4">
                      {a.lineas.filter((l) => l.equipos.length).map((l) => (
                        <div key={l.id}>
                          <p className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-gris"><span className="h-px w-4 bg-acento" />{l.nombre}</p>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                            {l.equipos.map((e, i) => <TarjetaEquipo key={e.codigo} e={e} vivo={vivos.get(e.codigo)} i={i} alElegir={() => elegir(e.codigo)} />)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.section>
                ))}
              </div>
            </div>
            <Tarjeta className="flex max-h-[calc(100dvh-140px)] flex-col p-4 2xl:sticky 2xl:top-20">
              <p className="mb-3 flex items-center gap-2 font-semibold"><span className="size-2 animate-latido rounded-full bg-cian" />Lo que está pasando</p>
              {eventos.length === 0 ? <p className="py-10 text-center text-[13.5px] text-gris">Las alarmas, órdenes y cambios aparecerán aquí en cuanto ocurran.</p> : (
                <ul className="-mx-1 min-h-0 flex-1 space-y-1 overflow-y-auto px-1">
                  <AnimatePresence initial={false}>
                    {eventos.map((ev) => (
                      <motion.li key={ev.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2.5 rounded-xl px-2 py-1.5 hover:bg-papel-2">
                        <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: NIVEL[ev.nivel], boxShadow: `0 0 8px ${NIVEL[ev.nivel]}` }} />
                        <span className="text-[13px] leading-snug">{ev.texto}<span className="ml-1.5 text-[11.5px] text-gris" suppressHydrationWarning>{hace(new Date(ev.ts).toISOString())}</span></span>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </Tarjeta>
          </div>
        ))}
        {tab === "alarmas" && (alarmas.error ? <ErrorCarga error={alarmas.error} /> : <Tarjeta className="overflow-hidden"><Tabla columnas={colAl} filas={alarmas.data ?? []} clave={(a) => a.id} cargando={alarmas.isLoading} alHacerClic={(a) => elegir(a.equipo)} maxAlto="calc(100dvh - 330px)" vacio={<p className="p-10 text-center text-gris">No hay alarmas registradas.</p>} /></Tarjeta>)}
        {tab === "ordenes" && (ordenes.error ? <ErrorCarga error={ordenes.error} /> : <Tarjeta className="overflow-hidden"><Tabla columnas={colOt} filas={ordenes.data ?? []} clave={(o) => o.id} cargando={ordenes.isLoading} alHacerClic={(o) => router.push(`/mantenimiento?orden=${o.id}`)} maxAlto="calc(100dvh - 330px)" vacio={<p className="p-10 text-center text-gris">No hay órdenes de trabajo.</p>} /></Tarjeta>)}
      </div>

      <Cajon abierto={!!sel} onCerrar={() => elegir(null)} titulo={sel ? `Equipo ${sel}` : ""} ancho={640}>{sel && <FichaEquipoVista codigo={sel} />}</Cajon>
    </>
  );
}
