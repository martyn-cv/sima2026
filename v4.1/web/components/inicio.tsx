"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity, AlertTriangle, ArrowRight, BadgeCheck, Boxes, CalendarClock, CheckCircle2, ClipboardCheck, Cpu, Factory, Gauge, HardHat, Inbox,
  PackageCheck, ShieldAlert, Truck, Users, Wallet, Wrench,
} from "lucide-react";
import { clp, fecha, hace, num, periodoLegible } from "@sima/cliente";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usePlanta } from "@/lib/planta";
import { Avatar, BarrasH, Boton, Chip, Chispa, CURVA, Cuenta, Dona, Esqueleto, GraficoArea, Kpi, Tarjeta, cx, defEstado, mensajeDe, useAviso } from "@/components/ui";

// ------------------------------------------------------------------------------------------------ tipos de las respuestas
export interface Panel {
  personas: null | {
    dotacion: number; desvinculados: number; vacantes: number; terreno: number; administrativos: number;
    contratos: { tipo: string; n: number }[]; cuentas: { estado: string; n: number }[];
    porVencer: { id: string; nombre: string; cargo: string; vence: string; dias: number }[];
    habilitacionesVencidas: number; habilitacionesPorVencer: number;
    porFamilia: { familia: string; n: number }[]; porTurno: { turno: string; n: number }[];
    periodo: string | null; verPagos: boolean; costoHaberes: number; liquidoTotal: number; ausentismo: number; horasExtra: number;
  };
  planta: { equipos: { estado: string; n: number }[]; alarmasAbiertas: number; alarmasCriticas: number; ordenesAbiertas: number; plcConectados: number; plcTotal: number };
}
export interface ResumenProduccion {
  conformes: number; rechazo: number; porHora: { hora: string; conformes: number; rechazo: number }[]; motivos: { motivo: string; n: number }[];
  ordenes: { enCurso: number; planificadas: number; pausadas: number; terminadas: number };
  porLinea: { linea: string; cantidad: number; producidas: number; buenas: number }[]; dias: { fecha: string; plan: number; producidas: number; buenas: number }[];
}
export interface ResumenCalidad {
  abiertas: number; criticas: number; retenidas: number; liberadas30: number; rechazadas30: number; primeraPasada: number | null;
  porTipo: { tipo: string; n: number }[]; porSeveridad: { severidad: string; n: number }[]; porDia: { fecha: string; rechazo: number; producidas: number; nc: number }[];
}
export interface ResumenSst {
  diasSinAccidentes: number | null; abiertos: number; enInvestigacion: number; habilitacionesVencidas: number; habilitacionesPorVencer: number;
  porTipo: { tipo: string; n: number }[]; porMes: { mes: string; n: number; accidentes: number }[]; porZona: { zona: string; n: number }[];
}
export interface Kpis { dias: number; kpis: { clave: string; nombre: string; area: string; valor: number | null; meta: number; mejor: string; unidad: string; estado: string; nota: string }[] }
export interface Aprobacion { tipo: "plc" | "remuneraciones" | "calidad" | "sst" | "liberacion"; id: number; titulo: string; detalle: string; fecha: string; enlace: string; etapa?: string }
interface Cierres {
  cierres: { id: number; periodo: string; estado: string; personas: number; totalHaberes: number; totalLiquido: number; preparadoPor: string; fechaPreparacion: string; aprobadoPor?: string | null; fechaAprobacion?: string | null; puedeAprobar: boolean }[];
  validaciones: { periodo: string; validadoPor: string; fecha: string; nota: string }[]; puedePreparar: boolean; puedeValidar: boolean;
}
interface Despacho { id: number; codigo: string; destino: string; carga: string; vehiculo: string; conductor: string; estado: string; compromiso: string; atrasado: boolean }

export const TIPO_SST: Record<string, string> = { condicion_insegura: "Condición insegura", casi_accidente: "Casi accidente", incidente: "Incidente", accidente: "Accidente" };
export const COLOR_SEVERIDAD: Record<string, string> = { critica: "var(--s-rojo)", mayor: "var(--s-ambar)", menor: "var(--s-azul)", grave: "var(--s-ambar)", leve: "var(--s-azul)" };
const pct = (n: number, d = 1) => `${num(n * 100, d)} %`;

// ------------------------------------------------------------------------------------------------ piezas comunes
/** Encabezado de un módulo del inicio: icono, título, subtítulo y enlace. */
export function Bloque({ icono, titulo, sub, enlace, children, className, delay = 0 }: { icono: ReactNode; titulo: string; sub?: string; enlace?: { href: string; texto: string }; children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.3, delay, ease: CURVA }} className={cx("min-w-0", className)}>
      <header className="mb-3 flex items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-acento [&>svg]:size-5">{icono}</span>
          <div><h2 className="text-[17px] font-semibold leading-tight">{titulo}</h2>{sub && <p className="mt-1 text-[13px] text-gris">{sub}</p>}</div>
        </div>
        {enlace && <Link href={enlace.href} className="group inline-flex shrink-0 items-center gap-1 text-[13.5px] font-medium text-acento">{enlace.texto}<ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></Link>}
      </header>
      {children}
    </motion.section>
  );
}

function Leyenda({ items }: { items: { texto: string; color: string; valor?: ReactNode }[] }) {
  return <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-gris">{items.map((i) => <li key={i.texto} className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-full" style={{ background: i.color }} />{i.texto}{i.valor != null && <b className="num font-semibold text-negro">{i.valor}</b>}</li>)}</ul>;
}

const cargaBloque = <div className="grid gap-4 md:grid-cols-4"><Esqueleto className="h-36" /><Esqueleto className="h-36" /><Esqueleto className="h-36" /><Esqueleto className="h-36" /><Esqueleto className="h-72 md:col-span-3" /><Esqueleto className="h-72" /></div>;

// ------------------------------------------------------------------------------------------------ cabecera viva
function saludo(h: number) { return h < 6 ? "Buenas noches" : h < 13 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches"; }

export function Cabecera({ panel }: { panel?: Panel }) {
  const { usuario, tiene } = useAuth();
  const { equipos, conexion } = usePlanta();
  const [ahora, setAhora] = useState<Date | null>(null);
  useEffect(() => { setAhora(new Date()); const t = setInterval(() => setAhora(new Date()), 30_000); return () => clearInterval(t); }, []);
  const produciendo = equipos.filter((e) => defEstado(e.estado).marcha).length;
  const criticos = equipos.filter((e) => defEstado(e.estado).critico).length;
  const nombre = usuario?.nombre.split(" ")[0] ?? "";
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[12.5px] text-gris" suppressHydrationWarning>{ahora ? `${saludo(ahora.getHours())} · ${ahora.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}` : " "}</p>
        <h1 className="t-pantalla mt-0.5">Hola, {nombre}</h1>
        <p className="text-[13px] text-gris">{usuario?.cargo}</p>
      </div>
      {tiene("planta.ver") && (
        <div className="flex flex-wrap items-center gap-2">
          <span className={cx("inline-flex h-8 items-center gap-2 rounded-md border px-3 text-[12.5px] font-medium", conexion === "conectado" ? "border-linea-suave bg-papel text-verde" : "border-ambar/40 bg-ambar-claro text-ambar")}>
            <span className={cx("size-2 rounded-full", conexion === "conectado" ? "bg-verde" : conexion === "reconectando" ? "bg-ambar" : "bg-rojo")} />{conexion === "conectado" ? "Datos en vivo" : conexion === "reconectando" ? "Reconectando" : "Sin conexión en vivo"}
          </span>
          <Link href="/planta" className="inline-flex h-8 items-center gap-2 rounded-md border border-linea-suave bg-papel px-3 text-[12.5px] hover:border-linea"><Activity className="size-3.5 text-gris" /><b className="num">{produciendo}</b> de {equipos.length} equipos produciendo</Link>
          {criticos > 0 && <Link href="/planta" className="inline-flex h-8 items-center gap-2 rounded-md border border-rojo/40 bg-rojo-claro px-3 text-[12.5px] font-semibold text-rojo"><AlertTriangle className="size-3.5" />{criticos} en falla o bloqueados</Link>}
          {panel?.planta && panel.planta.alarmasCriticas > 0 && <Link href="/planta" className="inline-flex h-8 items-center gap-2 rounded-md border border-rojo/40 bg-rojo-claro px-3 text-[12.5px] font-semibold text-rojo"><AlertTriangle className="size-3.5" />{panel.planta.alarmasCriticas} alarmas críticas</Link>}
        </div>
      )}
    </header>
  );
}

// ------------------------------------------------------------------------------------------------ aprobaciones pendientes
const ICONO_APROB = { plc: Cpu, remuneraciones: Wallet, calidad: PackageCheck, sst: HardHat, liberacion: BadgeCheck };
export function BandejaAprobaciones() {
  const { data = [] } = useQuery({ queryKey: ["aprobaciones"], queryFn: () => api.get<Aprobacion[]>("/api/aprobaciones"), refetchInterval: 30_000 });
  if (data.length === 0) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="mb-7">
      <Tarjeta className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-linea-suave px-5 py-3">
          <Inbox className="size-4 text-acento" />
          <div className="flex-1"><p className="t-seccion">Requieren su firma o aprobación <span className="num ml-1 text-gris">{data.length}</span></p><p className="text-[12.5px] text-gris">Lo que otra persona preparó o ejecutó y su cargo debe autorizar. Nadie aprueba ni libera su propio trabajo.</p></div>
        </div>
        <ul className="grid divide-y divide-linea-suave md:grid-cols-2 md:divide-x md:divide-y-0">
          {data.slice(0, 6).map((a, i) => {
            const I = ICONO_APROB[a.tipo];
            return (
              <motion.li key={`${a.tipo}${a.id}${a.etapa ?? ""}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18, delay: i * 0.03 }}>
                <Link href={a.enlace} className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-papel-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md border border-linea-suave bg-papel-2 text-acento"><I className="size-4" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{a.titulo}</span><span className="block truncate text-[13px] text-gris">{a.detalle} · {hace(a.fecha)}</span></span>
                  <ArrowRight className="size-4 shrink-0 text-gris transition-transform group-hover:translate-x-0.5 group-hover:text-acento" />
                </Link>
              </motion.li>
            );
          })}
        </ul>
      </Tarjeta>
    </motion.div>
  );
}

// ------------------------------------------------------------------------------------------------ módulo: planta
const NIVEL_COLOR = { alarma: "var(--s-rojo)", aviso: "var(--s-ambar)", info: "var(--s-azul)", ok: "var(--s-verde)" };

export function ModPlanta({ panel, delay }: { panel: Panel; delay?: number }) {
  const { equipos, eventos } = usePlanta();
  const p = panel.planta;
  const zonas = [...new Set(equipos.map((e) => e.zona))];
  return (
    <Bloque icono={<Factory className="size-5" />} titulo="Planta en vivo" sub="Estado de cada equipo, alarmas y órdenes, al segundo" enlace={{ href: "/planta", texto: "Abrir planta" }} delay={delay}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi titulo="PLC conectados" valor={p.plcConectados} sufijo={`/ ${p.plcTotal}`} icono={<Cpu className="size-4.5" />} tono="azul" delay={0.05} />
        <Kpi titulo="Alarmas abiertas" valor={p.alarmasAbiertas} detalle={<>{p.alarmasCriticas} críticas</>} icono={<AlertTriangle className="size-4.5" />} tono={p.alarmasCriticas > 0 ? "rojo" : "verde"} delay={0.1} />
        <Kpi titulo="Órdenes de trabajo abiertas" valor={p.ordenesAbiertas} icono={<Wrench className="size-4.5" />} tono="ambar" delay={0.15} />
        <Kpi titulo="Equipos produciendo" valor={equipos.filter((e) => defEstado(e.estado).marcha).length} sufijo={`/ ${equipos.length}`} icono={<Activity className="size-4.5" />} tono="verde" detalle={<>{equipos.filter((e) => defEstado(e.estado).critico).length} en falla o bloqueados</>} delay={0.2} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Tarjeta className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><p className="t-seccion">Mapa de equipos</p><Leyenda items={[...new Set(equipos.map((e) => defEstado(e.estado)))].map((d) => ({ texto: d.corta, color: d.color }))} /></div>
          <div className="grid gap-4 md:grid-cols-2">
            {zonas.map((z) => (
              <div key={z} className="rounded-md border border-linea-suave bg-papel-2/60 p-3">
                <p className="mb-2 text-[12.5px] font-medium text-gris">{z}</p>
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {equipos.filter((e) => e.zona === z).map((e) => (
                    <li key={e.codigo}>
                      <Link href={`/planta?equipo=${e.codigo}`} title={e.nombre} className={cx("group relative flex items-center gap-2 overflow-hidden rounded-md border px-2.5 py-2 transition-colors duration-150 hover:border-linea", defEstado(e.estado).critico ? "border-rojo/50 bg-rojo-claro" : "border-linea-suave bg-papel", e.simulado && "trama-sim")}>
                        <IconoEstado estado={e.estado} />
                        <span className="min-w-0"><span className="num block text-[13px] font-semibold leading-tight">{e.codigo}</span><span className="block truncate text-[11.5px] text-gris">{e.nombre}</span></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Tarjeta>
        <Tarjeta className="flex flex-col p-5">
          <p className="mb-3 font-semibold">Lo último que pasó</p>
          {eventos.length === 0 ? <p className="my-auto py-8 text-center text-[14px] text-gris">Aquí aparecen alarmas, órdenes y cambios de PLC en cuanto ocurren.</p> : (
            <ul className="-mx-1 max-h-[300px] space-y-1 overflow-y-auto px-1">
              <AnimatePresence initial={false}>
                {eventos.slice(0, 12).map((ev) => (
                  <motion.li key={ev.id} layout initial={{ opacity: 0, x: 16, height: 0 }} animate={{ opacity: 1, x: 0, height: "auto" }} exit={{ opacity: 0 }} className="flex gap-2.5 rounded-xl px-2 py-1.5 hover:bg-papel-2">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: NIVEL_COLOR[ev.nivel] }} />
                    <span className="min-w-0 flex-1 text-[13.5px] leading-snug">{ev.texto}<span className="ml-1.5 text-[12px] text-gris" suppressHydrationWarning>{hace(new Date(ev.ts).toISOString())}</span></span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </Tarjeta>
      </div>
    </Bloque>
  );
}

// ------------------------------------------------------------------------------------------------ módulo: producción
export function ModProduccion({ delay, compacto }: { delay?: number; compacto?: boolean }) {
  const { tiene } = useAuth();
  const { data } = useQuery({ queryKey: ["produccion", "resumen"], queryFn: () => api.get<ResumenProduccion>("/api/produccion/resumen"), refetchInterval: 15_000 });
  const kpis = useQuery({ queryKey: ["kpis", 30], queryFn: () => api.get<Kpis>("/api/kpis?dias=30"), enabled: tiene("kpis.ver") });
  const oee = kpis.data?.kpis.find((k) => k.clave === "oee");
  if (!data) return <Bloque icono={<Gauge className="size-5" />} titulo="Producción" delay={delay}>{cargaBloque}</Bloque>;
  const total = data.conformes + data.rechazo;
  const tasa = total ? data.rechazo / total : 0;
  return (
    <Bloque icono={<Gauge className="size-5" />} titulo="Producción" sub="Lo que informan los PLC y los operadores en las últimas 12 horas" enlace={{ href: "/produccion", texto: "Órdenes de producción" }} delay={delay}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi titulo="Piezas conformes (12 h)" valor={data.conformes} icono={<CheckCircle2 className="size-4.5" />} tono="verde" grafico={<Chispa valores={data.porHora.map((h) => h.conformes)} color="var(--s-verde)" />} delay={0.05} />
        <Kpi titulo="Tasa de rechazo" valor={tasa * 100} formato={(n) => num(n, 2)} sufijo="%" icono={<AlertTriangle className="size-4.5" />} tono={tasa > 0.03 ? "rojo" : "ambar"} detalle={<>{data.rechazo.toLocaleString("es-CL")} piezas rechazadas</>} delay={0.1} />
        <Kpi titulo="Órdenes en curso" valor={data.ordenes.enCurso} icono={<Factory className="size-4.5" />} detalle={<>{data.ordenes.planificadas} planificadas · {data.ordenes.terminadas} terminadas en 7 días</>} delay={0.15} />
        <Kpi titulo="OEE (30 días)" valor={oee?.valor ?? null} formato={(n) => num(n, 1)} sufijo="%" icono={<Gauge className="size-4.5" />} tono="azul" detalle={oee ? <>meta {oee.meta} % · {oee.estado}</> : "sin permiso de indicadores"} delay={0.2} />
      </div>
      {!compacto && (
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <Tarjeta className="p-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">Piezas por hora</p><Leyenda items={[{ texto: "Conformes", color: "var(--s-acento)" }, { texto: "Rechazo", color: "var(--s-rojo)" }]} /></div>
            <GraficoArea alto={250} etiquetas={data.porHora.map((h) => h.hora)} series={[{ nombre: "Conformes", color: "var(--s-acento)", valores: data.porHora.map((h) => h.conformes) }, { nombre: "Rechazo", color: "var(--s-rojo)", valores: data.porHora.map((h) => h.rechazo) }]} />
          </Tarjeta>
          <Tarjeta className="p-5">
            <p className="mb-4 font-semibold">Avance por línea</p>
            {data.porLinea.length === 0 ? <p className="py-6 text-center text-[14px] text-gris">No hay órdenes en curso en este momento.</p>
              : <BarrasH datos={data.porLinea.map((l) => ({ etiqueta: l.linea, valor: Math.round((l.producidas / Math.max(1, l.cantidad)) * 100), detalle: `${l.producidas.toLocaleString("es-CL")}/${l.cantidad.toLocaleString("es-CL")}` }))} formato={(n) => `${n} %`} max={100} />}
            {data.motivos.length > 0 && <>
              <p className="mb-3 mt-6 font-semibold">Motivos de rechazo</p>
              <BarrasH datos={data.motivos.map((m) => ({ etiqueta: m.motivo, valor: m.n, color: "var(--s-rojo)" }))} />
            </>}
          </Tarjeta>
          <Tarjeta className="p-5 xl:col-span-2">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">Plan contra piezas buenas · 14 días</p><Leyenda items={[{ texto: "Planificado", color: "var(--s-tenue)" }, { texto: "Buenas", color: "var(--s-verde)" }]} /></div>
            <GraficoArea alto={220} etiquetas={data.dias.map((d) => fecha(d.fecha).slice(0, 5))} series={[{ nombre: "Planificado", color: "var(--s-tenue)", valores: data.dias.map((d) => d.plan) }, { nombre: "Buenas", color: "var(--s-verde)", valores: data.dias.map((d) => d.buenas) }]} />
          </Tarjeta>
        </div>
      )}
    </Bloque>
  );
}

// ------------------------------------------------------------------------------------------------ módulo: personas
const COLOR_CONTRATO: Record<string, string> = { Indefinido: "var(--s-acento)", "Plazo fijo": "var(--s-cobre)", Honorarios: "var(--s-azul)" };
export function ModPersonas({ panel, delay }: { panel: Panel; delay?: number }) {
  const pe = panel.personas!;
  const cuenta = (k: string) => pe.cuentas.find((c) => c.estado === k)?.n ?? 0;
  return (
    <Bloque icono={<Users className="size-5" />} titulo="Personas" sub="Dotación, contratos, cuentas y habilitaciones" enlace={{ href: "/trabajadores", texto: "Ver trabajadores" }} delay={delay}>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr_1fr]">
        <Tarjeta className="relative overflow-hidden p-6">
          <p className="text-[13.5px] font-medium text-gris">Dotación activa</p>
          <p className="display text-[clamp(72px,8vw,120px)] font-extrabold leading-[0.9] tracking-tight"><Cuenta valor={pe.dotacion} duracion={1.3} /></p>
          <p className="mt-2 max-w-[34ch] text-[14.5px] text-carbon"><b>{pe.terreno}</b> en terreno y <b>{pe.administrativos}</b> en administración.{pe.vacantes > 0 && <> Faltan <b>{pe.vacantes}</b> para la dotación objetivo.</>}</p>
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-linea-suave pt-4">
            {[["Activas", cuenta("ACTIVA"), "text-verde"], ["Suspendidas", pe.cuentas.filter((c) => c.estado.startsWith("SUSP")).reduce((a, c) => a + c.n, 0), "text-ambar"], ["Cerradas", cuenta("CERRADA"), "text-rojo"]].map(([t, n, c]) => (
              <div key={t as string}><p className={cx("display text-[28px] font-bold leading-none", c as string)}><Cuenta valor={n as number} /></p><p className="text-[12.5px] text-gris">cuentas {String(t).toLowerCase()}</p></div>
            ))}
          </div>
        </Tarjeta>
        <Tarjeta className="flex flex-col items-center justify-center gap-4 p-6">
          <p className="self-start font-semibold">Tipos de contrato</p>
          <Dona tam={190} grosor={24} partes={pe.contratos.map((c) => ({ etiqueta: c.tipo, valor: c.n, color: COLOR_CONTRATO[c.tipo] ?? "var(--s-tenue)" }))} centro={<div><p className="display text-[34px] font-bold leading-none">{pe.contratos.reduce((a, c) => a + c.n, 0)}</p><p className="text-[12px] text-gris">vigentes</p></div>} />
          <Leyenda items={pe.contratos.map((c) => ({ texto: c.tipo, color: COLOR_CONTRATO[c.tipo] ?? "var(--s-tenue)", valor: c.n }))} />
        </Tarjeta>
        <Tarjeta className="flex flex-col p-6">
          <div className="mb-3 flex items-center justify-between"><p className="font-semibold">Contratos por vencer</p><Link href="/contratos" className="text-[13px] text-acento">Ver todos</Link></div>
          {pe.porVencer.length === 0 ? <p className="my-auto text-center text-[14px] text-gris">Ningún contrato vence en 60 días.</p> : (
            <ul className="-mx-2 space-y-0.5">
              {pe.porVencer.slice(0, 6).map((v) => (
                <li key={v.id}><Link href={`/trabajadores/ficha?id=${v.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-papel-2">
                  <Avatar nombre={v.nombre} tam={32} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-medium">{v.nombre}</span><span className="block truncate text-[12px] text-gris">{v.cargo}</span></span>
                  <Chip tono={v.dias <= 15 ? "peligro" : "aviso"} punto={false}>{v.dias === 0 ? "hoy" : `${v.dias} d`}</Chip>
                </Link></li>
              ))}
            </ul>
          )}
          <div className="mt-auto grid grid-cols-2 gap-3 border-t border-linea-suave pt-4">
            <div><p className={cx("display text-[26px] font-bold leading-none", pe.habilitacionesVencidas > 0 && "text-rojo")}>{pe.habilitacionesVencidas}</p><p className="text-[12.5px] text-gris">habilitaciones vencidas</p></div>
            <div><p className="display text-[26px] font-bold leading-none">{pe.habilitacionesPorVencer}</p><p className="text-[12.5px] text-gris">vencen en 60 días</p></div>
          </div>
        </Tarjeta>
        <Tarjeta className="p-6 xl:col-span-3">
          <p className="mb-4 font-semibold">Personas por área</p>
          <div className="grid gap-x-10 md:grid-cols-2"><BarrasH datos={pe.porFamilia.slice(0, Math.ceil(pe.porFamilia.length / 2)).map((f) => ({ etiqueta: f.familia, valor: f.n }))} max={pe.porFamilia[0]?.n} /><BarrasH datos={pe.porFamilia.slice(Math.ceil(pe.porFamilia.length / 2)).map((f) => ({ etiqueta: f.familia, valor: f.n }))} max={pe.porFamilia[0]?.n} /></div>
        </Tarjeta>
      </div>
    </Bloque>
  );
}

// ------------------------------------------------------------------------------------------------ módulo: pagos (con cierre en dos firmas)
export function ModPagos({ panel, delay }: { panel: Panel; delay?: number }) {
  const pe = panel.personas;
  const qc = useQueryClient();
  const aviso = useAviso();
  const { data } = useQuery({ queryKey: ["cierres"], queryFn: () => api.get<Cierres>("/api/remuneraciones/cierres") });
  const decidir = useMutation({
    mutationFn: (v: { id: number; decision: "aprobar" | "rechazar" }) => api.post(`/api/remuneraciones/cierres/${v.id}/${v.decision}`, { comentario: "" }),
    onSuccess: (_, v) => { aviso(v.decision === "aprobar" ? "Pago de remuneraciones aprobado." : "Cierre devuelto a Remuneraciones."); void qc.invalidateQueries({ queryKey: ["cierres"] }); void qc.invalidateQueries({ queryKey: ["aprobaciones"] }); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  if (!pe?.verPagos) return null;
  const ultimo = data?.cierres[0];
  const pasos = [
    { t: "Parámetros validados", ok: !!data?.validaciones.find((v) => v.periodo === ultimo?.periodo), quien: data?.validaciones.find((v) => v.periodo === ultimo?.periodo)?.validadoPor },
    { t: "Nómina preparada", ok: !!ultimo, quien: ultimo?.preparadoPor },
    { t: "Pago aprobado", ok: ultimo?.estado === "aprobado", quien: ultimo?.aprobadoPor },
  ];
  return (
    <Bloque icono={<Wallet className="size-5" />} titulo={pe.periodo ? `Remuneraciones · ${periodoLegible(pe.periodo)}` : "Remuneraciones"} sub="Totales del período. El detalle por persona solo lo ven Remuneraciones y Finanzas." enlace={{ href: "/remuneraciones", texto: "Ver liquidaciones" }} delay={delay}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi titulo="Costo de haberes" valor={pe.costoHaberes} formato={clp} icono={<Wallet className="size-4.5" />} tono="cobre" delay={0.05} />
        <Kpi titulo="Líquido a pagar" valor={pe.liquidoTotal} formato={clp} icono={<BadgeCheck className="size-4.5" />} delay={0.1} />
        <Kpi titulo="Ausentismo" valor={pe.ausentismo * 100} formato={(n) => num(n, 1)} sufijo="%" icono={<CalendarClock className="size-4.5" />} tono="ambar" delay={0.15} />
        <Kpi titulo="Horas extra" valor={pe.horasExtra} icono={<Activity className="size-4.5" />} tono="azul" delay={0.2} />
      </div>
      {ultimo && (
        <Tarjeta className="mt-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><p className="font-semibold">Cierre de {periodoLegible(ultimo.periodo)}</p><p className="text-[13px] text-gris">{ultimo.personas} personas · líquido {clp(ultimo.totalLiquido)} · preparado {hace(ultimo.fechaPreparacion)}</p></div>
            {ultimo.puedeAprobar && <div className="flex gap-2"><Boton variante="contorno" onClick={() => decidir.mutate({ id: ultimo.id, decision: "rechazar" })}>Devolver</Boton><Boton variante="acento" cargando={decidir.isPending} onClick={() => decidir.mutate({ id: ultimo.id, decision: "aprobar" })}><BadgeCheck className="size-4" />Aprobar pago</Boton></div>}
          </div>
          <ol className="mt-5 grid gap-3 sm:grid-cols-3">
            {pasos.map((p, i) => (
              <motion.li key={p.t} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.12 }} className={cx("relative rounded-2xl border p-4", p.ok ? "border-verde/30 bg-verde-claro" : "border-linea-suave bg-papel-2")}>
                <span className={cx("mb-2 grid size-8 place-items-center rounded-full text-[13px] font-bold", p.ok ? "bg-verde text-sobre-negro" : "bg-linea text-gris")}>{p.ok ? <CheckCircle2 className="size-4.5" /> : i + 1}</span>
                <p className="font-semibold">{p.t}</p><p className="text-[13px] text-gris">{p.ok ? p.quien : "pendiente"}</p>
              </motion.li>
            ))}
          </ol>
        </Tarjeta>
      )}
    </Bloque>
  );
}

// ------------------------------------------------------------------------------------------------ módulo: calidad
export function ModCalidad({ delay }: { delay?: number }) {
  const { data } = useQuery({ queryKey: ["calidad", "resumen"], queryFn: () => api.get<ResumenCalidad>("/api/calidad/resumen"), refetchInterval: 30_000 });
  if (!data) return <Bloque icono={<ClipboardCheck className="size-5" />} titulo="Calidad" delay={delay}>{cargaBloque}</Bloque>;
  return (
    <Bloque icono={<ClipboardCheck className="size-5" />} titulo="Calidad" sub="No conformidades, lotes retenidos y rendimiento de primera pasada" enlace={{ href: "/calidad", texto: "Ver no conformidades" }} delay={delay}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi titulo="No conformidades abiertas" valor={data.abiertas} detalle={<>{data.criticas} críticas</>} icono={<ShieldAlert className="size-4.5" />} tono={data.criticas > 0 ? "rojo" : "ambar"} delay={0.05} />
        <Kpi titulo="Piezas retenidas" valor={data.retenidas} icono={<Boxes className="size-4.5" />} tono="cobre" delay={0.1} />
        <Kpi titulo="Primera pasada (30 días)" valor={data.primeraPasada == null ? null : data.primeraPasada * 100} formato={(n) => num(n, 1)} sufijo="%" icono={<BadgeCheck className="size-4.5" />} tono="verde" delay={0.15} />
        <Kpi titulo="Resueltas en 30 días" valor={data.liberadas30 + data.rechazadas30} detalle={<>{data.liberadas30} liberadas · {data.rechazadas30} rechazadas</>} icono={<PackageCheck className="size-4.5" />} tono="azul" delay={0.2} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Tarjeta className="p-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">Tasa de rechazo diaria · 30 días</p><Leyenda items={[{ texto: "Rechazo %", color: "var(--s-cobre)" }]} /></div>
          <GraficoArea alto={230} formato={(n) => `${num(n, 2)} %`} etiquetas={data.porDia.map((d) => fecha(d.fecha).slice(0, 5))} series={[{ nombre: "Rechazo", color: "var(--s-cobre)", valores: data.porDia.map((d) => (d.producidas ? (d.rechazo / d.producidas) * 100 : 0)) }]} />
        </Tarjeta>
        <Tarjeta className="flex flex-col items-center gap-4 p-5">
          <p className="self-start font-semibold">Abiertas por severidad</p>
          <Dona tam={170} partes={data.porSeveridad.map((s) => ({ etiqueta: s.severidad, valor: s.n, color: COLOR_SEVERIDAD[s.severidad] }))} centro={<div><p className="display text-[32px] font-bold leading-none">{data.abiertas}</p><p className="text-[12px] text-gris">abiertas</p></div>} />
          <Leyenda items={data.porSeveridad.map((s) => ({ texto: s.severidad[0].toUpperCase() + s.severidad.slice(1), color: COLOR_SEVERIDAD[s.severidad], valor: s.n }))} />
        </Tarjeta>
      </div>
    </Bloque>
  );
}

// ------------------------------------------------------------------------------------------------ módulo: seguridad y salud
export function ModSst({ delay }: { delay?: number }) {
  const { data } = useQuery({ queryKey: ["sst", "resumen"], queryFn: () => api.get<ResumenSst>("/api/sst/resumen"), refetchInterval: 60_000 });
  if (!data) return <Bloque icono={<HardHat className="size-5" />} titulo="Seguridad y salud" delay={delay}>{cargaBloque}</Bloque>;
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return (
    <Bloque icono={<HardHat className="size-5" />} titulo="Seguridad y salud" sub="Eventos reportados en terreno e investigación de Prevención" enlace={{ href: "/seguridad", texto: "Ver eventos" }} delay={delay}>
      <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr_1fr]">
        <Tarjeta className="relative overflow-hidden p-6 text-center">
          <span aria-hidden className="pointer-events-none absolute inset-x-0 -top-16 mx-auto size-56 rounded-full bg-verde/20 blur-3xl" />
          <p className="relative text-[13.5px] font-medium text-gris">Días sin accidentes</p>
          <p className="display relative text-[clamp(72px,7vw,112px)] font-extrabold leading-none text-verde"><Cuenta valor={data.diasSinAccidentes ?? 0} duracion={1.5} /></p>
          <p className="relative mt-2 text-[13.5px] text-gris">{data.abiertos} eventos abiertos · {data.enInvestigacion} en investigación</p>
        </Tarjeta>
        <Tarjeta className="p-5">
          <p className="mb-4 font-semibold">Eventos por mes</p>
          <div className="flex h-[170px] items-end gap-3">
            {data.porMes.map((m, i) => {
              const max = Math.max(1, ...data.porMes.map((x) => x.n));
              return (
                <div key={m.mes} className="flex flex-1 flex-col items-center gap-2">
                  <span className="num text-[12px] font-semibold">{m.n}</span>
                  <motion.div className="w-full rounded-t-lg" style={{ background: m.accidentes ? "linear-gradient(180deg, var(--s-rojo), color-mix(in srgb, var(--s-rojo) 40%, transparent))" : "linear-gradient(180deg, var(--s-acento), color-mix(in srgb, var(--s-acento) 35%, transparent))" }}
                    initial={{ height: 0 }} animate={{ height: `${(m.n / max) * 120 + 4}px` }} transition={{ duration: 0.8, delay: 0.1 + i * 0.06, ease: CURVA }} />
                  <span className="text-[12px] text-gris">{meses[Number(m.mes.slice(5)) - 1]}</span>
                </div>
              );
            })}
          </div>
        </Tarjeta>
        <Tarjeta className="p-5">
          <p className="mb-4 font-semibold">Por tipo</p>
          <BarrasH datos={data.porTipo.map((t) => ({ etiqueta: TIPO_SST[t.tipo] ?? t.tipo, valor: t.n, color: t.tipo === "accidente" ? "var(--s-rojo)" : t.tipo === "incidente" ? "var(--s-ambar)" : "var(--s-acento)" }))} />
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-linea-suave pt-4">
            <div><p className={cx("display text-[26px] font-bold leading-none", data.habilitacionesVencidas > 0 && "text-rojo")}>{data.habilitacionesVencidas}</p><p className="text-[12.5px] text-gris">habilitaciones vencidas</p></div>
            <div><p className="display text-[26px] font-bold leading-none">{data.habilitacionesPorVencer}</p><p className="text-[12.5px] text-gris">vencen en 30 días</p></div>
          </div>
        </Tarjeta>
      </div>
    </Bloque>
  );
}

// ------------------------------------------------------------------------------------------------ módulo: despachos
export function ModDespachos({ delay }: { delay?: number }) {
  const { data = [] } = useQuery({ queryKey: ["despachos"], queryFn: () => api.get<Despacho[]>("/api/despachos"), refetchInterval: 30_000 });
  const activos = data.filter((d) => d.estado !== "entregado");
  const etapa = { pendiente: 0, en_ruta: 1, entregado: 2 } as Record<string, number>;
  return (
    <Bloque icono={<Truck className="size-5" />} titulo="Despachos" sub="Camiones por salir y en ruta" enlace={{ href: "/logistica", texto: "Ver logística" }} delay={delay}>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {activos.length === 0 && <Tarjeta className="p-8 text-center text-gris md:col-span-2">No hay despachos pendientes.</Tarjeta>}
        {activos.slice(0, 6).map((d, i) => (
          <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
            <Tarjeta className="p-5">
              <div className="flex items-start justify-between gap-3"><div><p className="num font-semibold">{d.codigo}</p><p className="display text-[19px] font-bold leading-tight">{d.destino}</p><p className="text-[13px] text-gris">{d.carga}</p></div>
                <Chip tono={d.atrasado ? "peligro" : d.estado === "en_ruta" ? "info" : "aviso"}>{d.atrasado ? "Atrasado" : d.estado === "en_ruta" ? "En ruta" : "Por salir"}</Chip></div>
              <div className="relative mt-4 h-2 rounded-full bg-linea-suave">
                <motion.div className="absolute inset-y-0 left-0 rounded-full bg-acento" initial={{ width: 0 }} animate={{ width: `${(etapa[d.estado] / 2) * 100 + 6}%` }} transition={{ duration: 1, ease: CURVA }} />
                <motion.span className="absolute -top-2.5" initial={{ left: 0 }} animate={{ left: `calc(${(etapa[d.estado] / 2) * 100}% - 10px)` }} transition={{ duration: 1, ease: CURVA }}><Truck className="size-5 text-acento" /></motion.span>
              </div>
              <p className="mt-3 text-[13px] text-gris">{d.vehiculo} · {d.conductor} · compromiso {new Date(d.compromiso).toLocaleString("es-CL", { weekday: "short", hour: "2-digit", minute: "2-digit" })}</p>
            </Tarjeta>
          </motion.div>
        ))}
      </div>
    </Bloque>
  );
}

/** Icono del estado del equipo con su color (el estado nunca se comunica solo con color). */
function IconoEstado({ estado }: { estado: string }) {
  const d = defEstado(estado);
  return <d.icono className="size-3.5 shrink-0" style={{ color: d.color }} aria-label={d.etiqueta} />;
}
