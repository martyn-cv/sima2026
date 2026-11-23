import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, BookOpen, ChevronRight, Cpu, FileText, History, Layers, Package, Rows3, ShieldAlert, TriangleAlert, Wrench, X } from "lucide-react";
import type { FichaEquipo, PlantaNodo } from "@sima/cliente";
import { Chip, CURVA, Esqueleto, Maquina, Medidor, cx } from "@sima/ui";
import { api } from "../lib/api";
import { usePlanta } from "../lib/planta";
import { ir, useParametro } from "../ruta";

const ESTADO: Record<string, { t: string; c: string; tono: "ok" | "peligro" | "aviso" | "neutro" }> = {
  operando: { t: "Operando", c: "var(--s-verde)", tono: "ok" }, alarma: { t: "Con alarma", c: "var(--s-rojo)", tono: "peligro" }, en_mantencion: { t: "En mantención", c: "var(--s-ambar)", tono: "aviso" }, detenido: { t: "Detenido", c: "var(--s-tenue)", tono: "neutro" },
};
const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
const hace = (iso: string) => { const m = Math.round((Date.now() - +new Date(iso)) / 60000); return m < 60 ? `hace ${Math.max(1, m)} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`; };
function Sim() { return <span className="rounded border border-cobre/40 bg-cobre/10 px-1 font-mono text-[10px] font-bold text-cobre" title="PLC simulado">SIM</span>; }

function Columna({ titulo, icono, children, i }: { titulo: string; icono: React.ReactNode; children: React.ReactNode; i: number }) {
  return (
    <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.28, delay: i * 0.03, ease: CURVA }} className="flex min-h-0 flex-col">
      <p className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[.1em] text-gris">{icono}{titulo}</p>
      <div className="grid content-start gap-2">{children}</div>
    </motion.div>
  );
}

export function Explorador() {
  const { equipos } = usePlanta();
  const codigoParam = useParametro("equipo");
  const { data } = useQuery({ queryKey: ["estructura"], queryFn: () => api.get<PlantaNodo[]>("/api/estructura"), refetchInterval: 30_000 });
  const planta = data?.[0];
  const [areaId, setAreaId] = useState<number | null>(null);
  const [lineaId, setLineaId] = useState<number | null>(null);
  const estadoDe = (c: string, base: string) => equipos.find((e) => e.codigo === c)?.estado ?? base;

  // si se llega con ?equipo=XX, se abre su área y su línea
  useEffect(() => {
    if (!planta || !codigoParam) return;
    for (const a of planta.areas) for (const l of a.lineas) if (l.equipos.some((e) => e.codigo === codigoParam)) { setAreaId(a.id); setLineaId(l.id); }
  }, [planta, codigoParam]);
  useEffect(() => { if (planta && areaId == null) { const a = planta.areas.find((x) => x.lineas.some((l) => l.equipos.length)); if (a) setAreaId(a.id); } }, [planta, areaId]);

  if (!planta) return <div className="grid grid-cols-3 gap-4"><Esqueleto className="h-[60vh]" /><Esqueleto className="h-[60vh]" /><Esqueleto className="h-[60vh]" /></div>;
  const area = planta.areas.find((a) => a.id === areaId);
  const linea = area?.lineas.find((l) => l.id === lineaId) ?? area?.lineas.find((l) => l.equipos.length);

  return (
    <div className="relative">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><p className="flex items-center gap-1 text-[13px] text-gris">{planta.nombre}{area && <><ChevronRight className="size-3.5" />{area.nombre}</>}{linea && <><ChevronRight className="size-3.5" />{linea.nombre}</>}{codigoParam && <><ChevronRight className="size-3.5" /><b className="text-negro">{codigoParam}</b></>}</p>
          <h1 className="display text-[34px] font-bold leading-tight">Explorador de planta</h1></div>
        <p className="text-[13px] text-gris">{planta.areas.length} áreas · {planta.areas.reduce((n, a) => n + a.lineas.length, 0)} líneas · {equipos.length} equipos</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[260px_240px_1fr]">
        <Columna titulo="Áreas" icono={<Layers className="size-3.5" />} i={0}>
          {planta.areas.map((a) => {
            const eqs = a.lineas.flatMap((l) => l.equipos);
            const activa = a.id === area?.id;
            return (
              <button key={a.id} onClick={() => { setAreaId(a.id); setLineaId(null); }} className={cx("relative cursor-pointer overflow-hidden rounded-2xl border p-3.5 text-left transition-colors", activa ? "border-acento/50" : "border-linea-suave bg-papel hover:border-linea")}>
                {activa && <motion.span layoutId="area-sel" className="absolute inset-0 bg-acento-claro" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
                <span className="relative block font-semibold">{a.nombre}</span>
                <span className="relative block text-[12px] text-gris">{a.codigo} · {a.lineas.length} líneas · {eqs.length} equipos</span>
                <span className="relative mt-2 flex flex-wrap gap-1">{eqs.map((e) => <i key={e.codigo} className="size-2 rounded-full" style={{ background: ESTADO[estadoDe(e.codigo, e.estado)]?.c }} title={e.codigo} />)}{a.plcs.map((p) => <span key={p.codigo} className="ml-auto inline-flex items-center gap-1 text-[11px] text-gris"><Cpu className="size-3" />{p.codigo}</span>)}</span>
              </button>
            );
          })}
        </Columna>

        <AnimatePresence mode="popLayout">
          {area && (
            <Columna key={area.id} titulo="Líneas" icono={<Rows3 className="size-3.5" />} i={1}>
              {area.lineas.length === 0 && <p className="rounded-2xl border border-dashed border-linea p-4 text-[13px] text-gris">Esta área no tiene líneas de producción.</p>}
              {area.lineas.map((l) => {
                const activa = l.id === linea?.id;
                const alarmas = l.equipos.filter((e) => estadoDe(e.codigo, e.estado) === "alarma").length;
                return (
                  <button key={l.id} onClick={() => setLineaId(l.id)} className={cx("relative cursor-pointer overflow-hidden rounded-2xl border p-3.5 text-left transition-colors", activa ? "border-acento/50" : "border-linea-suave bg-papel hover:border-linea")}>
                    {activa && <motion.span layoutId="linea-sel" className="absolute inset-0 bg-acento-claro" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
                    <span className="relative block font-semibold">{l.nombre}</span>
                    <span className="relative flex items-center gap-2 text-[12px] text-gris">{l.codigo} · {l.equipos.length} equipos{alarmas > 0 && <span className="inline-flex items-center gap-1 font-semibold text-rojo"><AlertTriangle className="size-3" />{alarmas}</span>}</span>
                  </button>
                );
              })}
            </Columna>
          )}
        </AnimatePresence>

        <AnimatePresence mode="popLayout">
          {linea && (
            <Columna key={linea.id} titulo={`Máquinas · ${linea.nombre}`} icono={<Wrench className="size-3.5" />} i={2}>
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {linea.equipos.map((e, i) => {
                  const est = estadoDe(e.codigo, e.estado);
                  const vivo = equipos.find((x) => x.codigo === e.codigo);
                  const s = vivo?.sensores.find((x) => x.nivel !== "ok") ?? vivo?.sensores[0];
                  return (
                    <motion.button key={e.codigo} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} whileHover={{ y: -3 }} onClick={() => ir(`/explorador?equipo=${e.codigo}`)}
                      className={cx("group relative cursor-pointer overflow-hidden rounded-2xl border bg-papel p-4 text-left", codigoParam === e.codigo ? "border-acento" : est === "alarma" ? "border-rojo/60" : "border-linea-suave hover:border-acento/40")}
                      style={est === "alarma" ? { boxShadow: "0 0 26px -8px var(--s-rojo)" } : codigoParam === e.codigo ? { boxShadow: "var(--s-brillo-violeta)" } : undefined}>
                      <div className="flex items-start justify-between"><div><p className="num text-[16px] font-bold">{e.codigo}</p><p className="text-[12.5px] text-gris">{e.nombre}</p></div><Chip tono={ESTADO[est]?.tono}>{ESTADO[est]?.t}</Chip></div>
                      <Maquina tipo={e.tipo} estado={est} className="my-2 h-24 w-full" />
                      <div className="flex items-center justify-between text-[12px]"><span className="truncate text-gris">{s?.nombre ?? e.tipo}</span>{s && <span className={cx("num font-semibold", s.nivel === "alarma" && "text-rojo", s.nivel === "aviso" && "text-ambar")}>{s.ultimo?.toFixed(s.max > 50 ? 0 : 1) ?? "—"} {s.unidad}</span>}</div>
                      <div className="mt-2 flex items-center gap-1.5">{e.plc && <span className="inline-flex items-center gap-1 rounded-md bg-papel-2 px-1.5 py-0.5 font-mono text-[10.5px] text-gris"><Cpu className="size-3" />{e.plc}</span>}{e.simulado && <Sim />}</div>
                    </motion.button>
                  );
                })}
              </div>
            </Columna>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>{codigoParam && <DetalleMaquina key={codigoParam} codigo={codigoParam} />}</AnimatePresence>
    </div>
  );
}

type Tab = "variables" | "plc" | "historial" | "fallas" | "mantenimiento" | "manuales" | "repuestos";

function DetalleMaquina({ codigo }: { codigo: string }) {
  const { equipos, io } = usePlanta();
  const [tab, setTab] = useState<Tab>("variables");
  const [doc, setDoc] = useState<number | null>(null);
  const { data } = useQuery({ queryKey: ["equipo", codigo], queryFn: () => api.get<FichaEquipo>(`/api/equipos/${codigo}`), refetchInterval: 15_000 });
  const cerrar = () => ir("/explorador");
  useEffect(() => { const f = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(); }; window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, []);
  const vivo = equipos.find((e) => e.codigo === codigo);
  const estado = vivo?.estado ?? data?.equipo.estado ?? "detenido";
  const tabs: { k: Tab; t: string; i: typeof History }[] = [{ k: "variables", t: "Variables", i: Rows3 }, { k: "plc", t: "PLC", i: Cpu }, { k: "historial", t: "Historial", i: History }, { k: "fallas", t: "Fallas", i: AlertTriangle }, { k: "mantenimiento", t: "Mantenimiento", i: Wrench }, { k: "manuales", t: "Manuales", i: BookOpen }, { k: "repuestos", t: "Repuestos", i: Package }];
  const ioPlc = data?.plc ? io[data.plc.codigo] ?? {} : {};

  return (
    <>
      <motion.div className="fixed inset-0 z-30 bg-[#020408]/55 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={cerrar} />
      <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 34 }} className="fixed inset-y-0 right-0 z-40 flex w-[min(760px,92vw)] flex-col border-l border-linea bg-papel shadow-2xl" role="dialog" aria-label={`Equipo ${codigo}`}>
        {!data ? <div className="p-6"><Esqueleto className="h-40" /><Esqueleto className="mt-4 h-72" /></div> : (
          <>
            <div className="relative overflow-hidden border-b border-linea-suave p-6" style={{ background: `radial-gradient(80% 120% at 100% 0%, color-mix(in srgb, ${ESTADO[estado]?.c} 16%, transparent), transparent 60%)` }}>
              <button onClick={cerrar} aria-label="Cerrar" className="absolute right-4 top-4 grid size-9 cursor-pointer place-items-center rounded-xl text-gris hover:bg-papel-2 hover:text-negro"><X className="size-5" /></button>
              <p className="mb-3 flex flex-wrap items-center gap-1 text-[12.5px] text-gris">{data.jerarquia.planta}<ChevronRight className="size-3" />{data.jerarquia.area.nombre}<ChevronRight className="size-3" />{data.jerarquia.linea.nombre}</p>
              <div className="flex items-center gap-5">
                <Maquina tipo={data.equipo.tipo} estado={estado} className="h-28 w-40 shrink-0" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="display text-[32px] font-bold leading-none">{data.equipo.codigo}</h2><Chip tono={ESTADO[estado]?.tono}>{ESTADO[estado]?.t}</Chip>{data.equipo.simulado && <Sim />}</div>
                  <p className="mt-1 text-[15px] font-medium">{data.equipo.nombre}</p>
                  <p className="text-[13px] text-gris">{data.equipo.tipo} · {data.equipo.marca} {data.equipo.modelo} · {data.equipo.ubicacion}</p>
                  <div className="mt-3 flex gap-2"><button onClick={() => ir(`/reportar?equipo=${codigo}`)} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-rojo/40 px-3 text-[12.5px] font-medium text-rojo hover:bg-rojo-claro"><TriangleAlert className="size-3.5" />Reportar falla</button>
                    {data.ordenes.some((o) => o.estado !== "cerrada") && <button onClick={() => ir(`/mantenimiento?orden=${data.ordenes.find((o) => o.estado !== "cerrada")!.id}`)} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-ambar-claro px-3 text-[12.5px] font-medium text-ambar-hondo"><Wrench className="size-3.5" />Orden abierta</button>}</div>
                </div>
              </div>
              {data.indicadores && <div className="mt-5 grid grid-cols-4 gap-2">{[["Disponibilidad", `${(data.indicadores.disponibilidad * 100).toFixed(1)} %`], ["OEE", `${(data.indicadores.oee * 100).toFixed(1)} %`], ["MTTR", `${data.indicadores.mttrHoras.toFixed(1)} h`], ["Fallas 30 d", String(data.indicadores.fallas)]].map(([t, v]) => <div key={t} className="rounded-xl border border-linea-suave bg-papel/60 px-3 py-2"><p className="text-[11px] text-gris">{t}</p><p className="display text-[19px] font-bold">{v}</p></div>)}</div>}
            </div>
            <div className="flex gap-1 overflow-x-auto border-b border-linea-suave px-4 py-2">
              {tabs.map((t) => (
                <button key={t.k} onClick={() => setTab(t.k)} className={cx("relative inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium", tab === t.k ? "text-negro" : "text-gris hover:text-negro")}>
                  {tab === t.k && <motion.span layoutId="tab-maquina" className="absolute inset-0 rounded-lg bg-acento-claro" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}<t.i className="relative size-4" /><span className="relative">{t.t}</span>
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
                  {tab === "variables" && (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {(vivo?.sensores ?? data.sensores).map((s) => (
                        <div key={s.variable} className="flex flex-col items-center rounded-2xl border border-linea-suave bg-papel-2/50 p-3">
                          <Medidor valor={s.ultimo} min={s.min} max={s.max} aviso={s.aviso} alarma={s.alarma} unidad={s.unidad} etiqueta={s.nombre} tam={150} />
                          <p className="text-center text-[12.5px] font-medium">{s.nombre}</p><p className="text-[11px] text-gris">aviso {s.aviso} · alarma {s.alarma} {s.unidad}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {tab === "plc" && (data.plc ? (
                    <div>
                      <div className="mb-3 flex items-center justify-between"><div><p className="font-semibold">{data.plc.codigo} · {data.plc.nombre}</p><p className="text-[12.5px] text-gris">{data.plc.fabricante} {data.plc.modelo} · {data.plc.direccion}</p></div><Chip tono={data.plc.estado === "run" ? "ok" : data.plc.estado === "error" ? "peligro" : "neutro"}>{data.plc.estado === "run" ? "En marcha" : data.plc.estado === "error" ? "Falla" : data.plc.estado === "stop" ? "Detenido" : "Sin conexión"}</Chip></div>
                      <ul className="grid gap-1.5">
                        {data.plc.puntos.map((p) => {
                          const v = ioPlc[p.tag]; const dig = p.tipo === "DI" || p.tipo === "DO"; const on = dig && (v ?? 0) > 0;
                          return (
                            <li key={p.tag} className="flex items-center gap-3 rounded-xl border border-linea-suave px-3 py-2 text-[13px]">
                              <span className={cx("grid h-6 w-9 place-items-center rounded-md text-[10.5px] font-bold", p.tipo === "DI" ? "bg-verde-claro text-verde" : p.tipo === "DO" ? "bg-ambar-claro text-ambar" : "bg-azul-claro text-azul")}>{p.tipo}</span>
                              <span className="num w-14 text-gris">{p.direccion}</span><span className="font-mono text-[12.5px]">{p.tag}</span><span className="truncate text-gris">{p.descripcion}</span>
                              <span className="ml-auto">{dig ? <span className={cx("block size-3 rounded-full", on ? (p.tipo === "DI" ? "bg-verde shadow-[0_0_10px_var(--s-verde)]" : "bg-ambar shadow-[0_0_10px_var(--s-ambar)]") : "bg-linea")} /> : <span className="num font-semibold">{v == null ? "—" : v.toFixed(1)} {p.unidad}</span>}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : <p className="py-10 text-center text-gris">Este equipo no está conectado a un PLC.</p>)}
                  {tab === "historial" && (
                    <ol className="relative ml-2 border-l border-linea pl-5">
                      {data.historial.length === 0 && <li className="py-6 text-[14px] text-gris">Sin cambios de estado registrados todavía.</li>}
                      {data.historial.map((h, i) => (
                        <li key={i} className="relative pb-4"><span className="absolute -left-[27px] top-1 size-3 rounded-full ring-4 ring-papel" style={{ background: ESTADO[h.hasta]?.c }} />
                          <p className="text-[14px]"><b>{ESTADO[h.desde]?.t ?? h.desde}</b> → <b>{ESTADO[h.hasta]?.t ?? h.hasta}</b> {h.simulado && <Sim />}</p><p className="text-[12.5px] text-gris">{h.causa} · {h.origen} · {hace(h.ts)}</p></li>
                      ))}
                    </ol>
                  )}
                  {tab === "fallas" && (
                    <ul className="grid gap-2">
                      {data.alarmas.length === 0 && <li className="py-6 text-center text-gris">Sin fallas registradas.</li>}
                      {data.alarmas.map((a) => <li key={a.id} className="flex items-center gap-3 rounded-xl border border-linea-suave px-3.5 py-2.5"><span className="size-2.5 rounded-full" style={{ background: a.nivel === "alarma" ? "var(--s-rojo)" : "var(--s-ambar)" }} /><span className="flex-1 text-[13.5px]">{a.mensaje}<span className="block text-[12px] text-gris">{hace(a.inicio)}{a.fin ? " · resuelta" : " · abierta"}{a.reconocidaPor ? ` · reconoció ${a.reconocidaPor}` : ""}</span></span>{a.simulado && <Sim />}</li>)}
                    </ul>
                  )}
                  {tab === "mantenimiento" && (
                    <div className="grid gap-3">
                      {data.intervenciones.length === 0 && <p className="py-6 text-center text-gris">Sin intervenciones registradas.</p>}
                      {data.intervenciones.map((i) => (
                        <div key={i.id} className="rounded-2xl border border-linea-suave p-4"><div className="flex items-center justify-between gap-2"><p className="font-semibold">{i.accion}</p><Chip tono={i.resultado === "resuelto" ? "ok" : "aviso"} punto={false}>{i.resultado.replace("_", " ")}</Chip></div>
                          <p className="mt-1 text-[12.5px] text-gris">{i.orden} · {i.causa} · {i.tecnicoNombre} · {i.horas.toFixed(1)} h · {fecha(i.fin)}</p><p className="mt-1.5 text-[13.5px]">{i.diagnostico}</p>
                          {i.repuestos.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{i.repuestos.map((r) => <Chip key={r.codigo} punto={false} tono="info">{r.cantidad} × {r.nombre}</Chip>)}</div>}</div>
                      ))}
                    </div>
                  )}
                  {tab === "manuales" && (
                    <ul className="grid gap-2">
                      {data.documentos.map((d) => (
                        <li key={d.id} className="overflow-hidden rounded-2xl border border-linea-suave">
                          <button onClick={() => setDoc(doc === d.id ? null : d.id)} className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-papel-2">
                            <span className={cx("grid size-9 place-items-center rounded-xl", d.clase === "seguridad" ? "bg-rojo-claro text-rojo" : "bg-acento-claro text-acento")}>{d.clase === "seguridad" ? <ShieldAlert className="size-4.5" /> : <FileText className="size-4.5" />}</span>
                            <span className="flex-1"><span className="block font-medium">{d.titulo}</span><span className="text-[12px] text-gris">{d.clase} · v{d.version}</span></span><ChevronRight className={cx("size-4 text-gris transition-transform", doc === d.id && "rotate-90")} />
                          </button>
                          <AnimatePresence>{doc === d.id && <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden"><ol className="seleccionable grid gap-1.5 border-t border-linea-suave bg-papel-2/40 px-4 py-3 text-[13.5px]">{d.contenido.split("\n").map((l, k) => <li key={k} className="leading-relaxed">{l}</li>)}</ol></motion.div>}</AnimatePresence>
                        </li>
                      ))}
                    </ul>
                  )}
                  {tab === "repuestos" && (
                    <ul className="grid gap-2">
                      {data.repuestos.map((r) => (
                        <li key={r.id} className="rounded-xl border border-linea-suave px-4 py-3"><div className="flex items-center justify-between"><span><b className="num text-[13px]">{r.codigo}</b> <span className="text-[14px]">{r.nombre}</span></span><span className={cx("num font-bold", r.stock <= r.stockMinimo && "text-rojo")}>{r.stock} en stock</span></div>
                          <p className="text-[12px] text-gris">{r.ubicacion} · mínimo {r.stockMinimo} · se usa {r.sugerida} por intervención{r.critico ? " · crítico" : ""}</p></li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
      </motion.aside>
    </>
  );
}
