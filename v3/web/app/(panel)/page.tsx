"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { clp, fecha, num, periodoLegible } from "@sima/cliente";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usePlanta } from "@/lib/planta";
import { BarraSegmentada, Cuenta, Encabezado, ErrorCarga, Esqueleto, Seccion, cx } from "@/components/ui";

interface Panel {
  personas: null | {
    dotacion: number; desvinculados: number; vacantes: number; terreno: number; administrativos: number;
    contratos: { tipo: string; n: number }[]; cuentas: { estado: string; n: number }[];
    porVencer: { id: string; nombre: string; cargo: string; vence: string; dias: number }[];
    habilitacionesVencidas: number; habilitacionesPorVencer: number;
    porFamilia: { familia: string; n: number }[]; porTurno: { turno: string; n: number }[];
    periodo: string | null; costoHaberes: number; liquidoTotal: number; ausentismo: number; horasExtra: number;
  };
  planta: { equipos: { estado: string; n: number }[]; alarmasAbiertas: number; alarmasCriticas: number; ordenesAbiertas: number; plcConectados: number; plcTotal: number };
}

const entrada = { oculto: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.2, 0.7, 0.2, 1] as const } } };
const contenedor = { oculto: {}, visible: { transition: { staggerChildren: 0.08 } } };

const COLOR_CONTRATO: Record<string, string> = { Indefinido: "#000", "Plazo fijo": "#d91f26", Honorarios: "#9aa0a9" };
const ESTADO_EQ: Record<string, { texto: string; color: string }> = {
  operando: { texto: "Operando", color: "#108046" }, alarma: { texto: "Con alarma", color: "#d91f26" }, detenido: { texto: "Detenido", color: "#8a8f99" }, en_mantencion: { texto: "En mantención", color: "#d98e00" },
};

function Planta({ p }: { p: Panel["planta"] }) {
  const { equipos } = usePlanta();
  return (
    <Seccion titulo="Planta ahora" derecha={<Link href="/planta" className="text-[14px] font-medium text-rojo hover:underline">Ver equipos</Link>}>
      <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr]">
        <div className="flex gap-6">
          <div><p className="display text-[56px] font-bold leading-none"><Cuenta valor={p.plcConectados} /><span className="text-[28px] text-gris">/{p.plcTotal}</span></p><p className="text-[13px] text-gris">PLC conectados</p></div>
          <div><p className={cx("display text-[56px] font-bold leading-none", p.alarmasCriticas > 0 && "text-rojo")}><Cuenta valor={p.alarmasCriticas} /></p><p className="text-[13px] text-gris">alarmas críticas</p></div>
          <div><p className="display text-[56px] font-bold leading-none"><Cuenta valor={p.ordenesAbiertas} /></p><p className="text-[13px] text-gris">órdenes abiertas</p></div>
        </div>
        <ul className="grid grid-cols-3 gap-x-4 gap-y-1.5 self-center sm:grid-cols-5">
          {equipos.map((e) => (
            <li key={e.codigo} className="flex items-center gap-1.5 text-[14px]" title={`${e.nombre}: ${ESTADO_EQ[e.estado]?.texto ?? e.estado}`}>
              <span className={cx("size-2.5 shrink-0", e.estado === "alarma" && "animate-parpadeo")} style={{ background: ESTADO_EQ[e.estado]?.color ?? "#ccc" }} />
              <span className="num font-medium">{e.codigo}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-linea-suave px-5 py-3 text-[13px] text-gris">
        {Object.entries(ESTADO_EQ).map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-1.5"><span className="size-2.5" style={{ background: v.color }} />{v.texto} <span className="num font-semibold text-negro">{p.equipos.find((e) => e.estado === k)?.n ?? 0}</span></span>
        ))}
      </div>
    </Seccion>
  );
}

export default function PanelPagina() {
  const { usuario } = useAuth();
  const { data, error, refetch } = useQuery({ queryKey: ["panel"], queryFn: () => api.get<Panel>("/api/panel"), refetchInterval: 20_000 });
  const saludo = usuario?.nombre.split(" ")[0];

  if (error) return <ErrorCarga error={error} reintentar={() => void refetch()} />;
  if (!data) return <div className="grid gap-5"><Esqueleto className="h-24 w-1/2" /><Esqueleto className="h-72" /><Esqueleto className="h-48" /></div>;
  const { personas: pe, planta } = data;

  return (
    <motion.div variants={contenedor} initial="oculto" animate="visible" className="grid gap-5">
      <motion.div variants={entrada}>
        <Encabezado titulo={`Hola, ${saludo}`} descripcion={pe ? `Resumen de personas y planta al ${fecha(new Date().toISOString())}.` : "Estado de la planta en este momento."} />
      </motion.div>

      {pe && (
        <>
          <motion.div variants={entrada} className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
            <Seccion titulo="Dotación activa">
              <div className="px-5 pb-5 pt-2">
                <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
                  <p className="display text-[clamp(88px,12vw,168px)] font-bold leading-[0.85] tracking-tight"><Cuenta valor={pe.dotacion} duracion={1.2} /></p>
                  <p className="max-w-[28ch] pb-2 text-[17px] leading-snug text-gris">
                    <span className="font-semibold text-negro">{pe.terreno} personas</span> trabajan en terreno y <span className="font-semibold text-negro">{pe.administrativos}</span> en administración.
                    {pe.vacantes > 0 && <> Faltan {pe.vacantes} para completar la dotación objetivo.</>}
                  </p>
                </div>
                <div className="mt-6 space-y-5">
                  <div>
                    <BarraSegmentada alto={14} partes={[{ valor: pe.terreno, color: "#000", etiqueta: "Terreno" }, { valor: pe.administrativos, color: "#d91f26", etiqueta: "Administración" }]} />
                    <div className="mt-1.5 flex gap-5 text-[13px] text-gris"><span className="inline-flex items-center gap-1.5"><i className="size-2.5 bg-negro" />Terreno</span><span className="inline-flex items-center gap-1.5"><i className="size-2.5 bg-rojo" />Administración</span></div>
                  </div>
                  <div>
                    <BarraSegmentada alto={14} partes={pe.contratos.map((c) => ({ valor: c.n, color: COLOR_CONTRATO[c.tipo] ?? "#ccc", etiqueta: c.tipo }))} />
                    <div className="mt-1.5 flex flex-wrap gap-x-5 text-[13px] text-gris">{pe.contratos.map((c) => <span key={c.tipo} className="inline-flex items-center gap-1.5"><i className="size-2.5" style={{ background: COLOR_CONTRATO[c.tipo] }} />{c.tipo} <span className="num font-semibold text-negro">{c.n}</span></span>)}</div>
                  </div>
                </div>
              </div>
            </Seccion>

            <Seccion titulo="Contratos por vencer" derecha={<Link href="/contratos" className="text-[14px] font-medium text-rojo hover:underline">Ver contratos</Link>}>
              {pe.porVencer.length === 0 ? <p className="px-5 py-8 text-gris">Ningún contrato vence en los próximos 60 días.</p> : (
                <ul className="mt-2 divide-y divide-linea-suave px-5 pb-3">
                  {pe.porVencer.slice(0, 7).map((v) => (
                    <li key={v.id}>
                      <Link href={`/trabajadores/${v.id}`} className="flex items-center gap-3 py-2.5 transition-colors hover:bg-chapa/60">
                        <div className="min-w-0 flex-1"><p className="truncate font-medium">{v.nombre}</p><p className="truncate text-[13px] text-gris">{v.cargo}</p></div>
                        <div className="text-right"><p className="num font-semibold">{fecha(v.vence)}</p><p className={cx("text-[13px]", v.dias <= 15 ? "text-rojo" : "text-gris")}>{v.dias === 0 ? "vence hoy" : `en ${v.dias} días`}</p></div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Seccion>
          </motion.div>

          <motion.div variants={entrada} className="grid gap-5 lg:grid-cols-3">
            <Seccion titulo={pe.periodo ? `Remuneraciones de ${periodoLegible(pe.periodo)}` : "Remuneraciones"} className="lg:col-span-2">
              <div className="grid gap-6 p-5 sm:grid-cols-[1.4fr_1fr_1fr]">
                <div><p className="text-[13px] text-gris">Costo de haberes</p><p className="display text-[44px] font-bold leading-none"><Cuenta valor={pe.costoHaberes} formato={clp} duracion={1.2} /></p></div>
                <div><p className="text-[13px] text-gris">Líquido a pagar</p><p className="display text-[34px] font-semibold leading-none"><Cuenta valor={pe.liquidoTotal} formato={clp} duracion={1.2} /></p></div>
                <div className="flex gap-6 sm:block sm:space-y-3">
                  <div><p className="text-[13px] text-gris">Ausentismo</p><p className="display text-[28px] font-semibold leading-none"><Cuenta valor={pe.ausentismo * 100} formato={(n) => num(n, 1) + " %"} /></p></div>
                  <div><p className="text-[13px] text-gris">Horas extra</p><p className="display text-[28px] font-semibold leading-none"><Cuenta valor={pe.horasExtra} /></p></div>
                </div>
              </div>
              <div className="border-t border-linea-suave px-5 py-4">
                <p className="mb-2 text-[13px] font-medium text-gris">Personas por área</p>
                <ul className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
                  {pe.porFamilia.map((f) => (
                    <li key={f.familia} className="flex items-center gap-3 text-[14px]">
                      <span className="w-[210px] shrink-0 truncate" title={f.familia}>{f.familia}</span>
                      <span className="h-2 flex-1 bg-chapa"><motion.span className="block h-full bg-negro" initial={{ width: 0 }} animate={{ width: `${(f.n / pe.porFamilia[0].n) * 100}%` }} transition={{ duration: 0.8, delay: 0.3 }} /></span>
                      <span className="num w-6 text-right font-semibold">{f.n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Seccion>

            <div className="grid gap-5">
              <Seccion titulo="Cuentas de acceso" derecha={<Link href="/cuentas" className="text-[14px] font-medium text-rojo hover:underline">Ver cuentas</Link>}>
                <div className="space-y-3 p-5">
                  <BarraSegmentada alto={12} partes={[
                    { valor: pe.cuentas.find((c) => c.estado === "ACTIVA")?.n ?? 0, color: "#108046", etiqueta: "Activas" },
                    { valor: pe.cuentas.find((c) => c.estado === "SUSPENDIDA")?.n ?? 0, color: "#d98e00", etiqueta: "Suspendidas" },
                    { valor: pe.cuentas.find((c) => c.estado === "CERRADA")?.n ?? 0, color: "#d91f26", etiqueta: "Cerradas" },
                  ]} />
                  <div className="grid grid-cols-3 gap-2">
                    {[["ACTIVA", "Activas", "text-verde"], ["SUSPENDIDA", "Suspendidas", "text-ambar"], ["CERRADA", "Cerradas", "text-rojo"]].map(([k, t, c]) => (
                      <div key={k}><p className={cx("display text-[34px] font-bold leading-none", c)}><Cuenta valor={pe.cuentas.find((x) => x.estado === k)?.n ?? 0} /></p><p className="text-[13px] text-gris">{t}</p></div>
                    ))}
                  </div>
                </div>
              </Seccion>
              <Seccion titulo="Habilitaciones de seguridad">
                <div className="grid grid-cols-2 gap-3 p-5">
                  <div><p className={cx("display text-[40px] font-bold leading-none", pe.habilitacionesVencidas > 0 && "text-rojo")}><Cuenta valor={pe.habilitacionesVencidas} /></p><p className="text-[13px] text-gris">vencidas</p></div>
                  <div><p className="display text-[40px] font-bold leading-none"><Cuenta valor={pe.habilitacionesPorVencer} /></p><p className="text-[13px] text-gris">vencen en 60 días</p></div>
                </div>
              </Seccion>
            </div>
          </motion.div>
        </>
      )}

      <motion.div variants={entrada}><Planta p={planta} /></motion.div>
    </motion.div>
  );
}
