"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { num } from "@sima/cliente";
import { api } from "@/lib/api";
import { Chip, Cuenta, Encabezado, ErrorCarga, Esqueleto, Seccion, Seleccion, Tabla, cx, type Columna } from "@/components/ui";

interface Kpi { clave: string; nombre: string; area: string; valor: number | null; meta: number; mejor: "alto" | "bajo"; unidad: string; estado: "cumple" | "no cumple" | "sin datos"; nota: string }
interface Fila { codigo: string; nombre: string; disponibilidad: number; rendimiento: number; calidad: number; oee: number; mttrHoras: number; mtbfHoras: number; fallas: number; horasParada: number }

function Tira({ v, meta }: { v: number; meta?: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative h-2 w-24 bg-chapa"><motion.span className={cx("block h-full", meta != null && v * 100 < meta ? "bg-ambar" : "bg-negro")} initial={{ width: 0 }} animate={{ width: `${Math.min(100, v * 100)}%` }} transition={{ duration: 0.7 }} />
        {meta != null && <i className="absolute -inset-y-0.5 w-0.5 bg-rojo" style={{ left: `${meta}%` }} title={`Meta ${meta} %`} />}</span>
      <span className="num w-12 text-right text-[14px]">{num(v * 100, 1)} %</span>
    </div>
  );
}

export default function Indicadores() {
  const [dias, setDias] = useState(30);
  const { data, error, refetch } = useQuery({ queryKey: ["kpis", dias], queryFn: () => api.get<{ kpis: Kpi[]; equipos: Fila[] }>(`/api/kpis?dias=${dias}`) });
  if (error) return <ErrorCarga error={error} reintentar={() => void refetch()} />;
  const cols: Columna<Fila>[] = [
    { clave: "e", titulo: "Equipo", valor: (f) => f.codigo, render: (f) => <div><p className="num font-semibold">{f.codigo}</p><p className="text-[13px] text-gris">{f.nombre}</p></div> },
    { clave: "o", titulo: "OEE", valor: (f) => f.oee, render: (f) => <Tira v={f.oee} meta={75} /> },
    { clave: "d", titulo: "Disponibilidad", valor: (f) => f.disponibilidad, render: (f) => <Tira v={f.disponibilidad} /> },
    { clave: "r", titulo: "Rendimiento", valor: (f) => f.rendimiento, render: (f) => <Tira v={f.rendimiento} /> },
    { clave: "c", titulo: "Calidad", valor: (f) => f.calidad, render: (f) => <Tira v={f.calidad} /> },
    { clave: "f", titulo: "Fallas", alinear: "derecha", valor: (f) => f.fallas, render: (f) => f.fallas },
    { clave: "m", titulo: "MTTR", alinear: "derecha", valor: (f) => f.mttrHoras, render: (f) => f.fallas ? `${num(f.mttrHoras, 1)} h` : "—" },
    { clave: "b", titulo: "MTBF", alinear: "derecha", valor: (f) => f.mtbfHoras, render: (f) => `${num(f.mtbfHoras, 0)} h` },
  ];
  return (
    <>
      <Encabezado titulo="Indicadores" descripcion="Los diez indicadores del informe. Los que esta base no puede calcular dicen «sin datos» en vez de inventarse."
        acciones={<Seleccion className="w-[170px]" value={dias} onChange={(e) => setDias(Number(e.target.value))} aria-label="Período"><option value={7}>Últimos 7 días</option><option value={30}>Últimos 30 días</option><option value={90}>Últimos 90 días</option></Seleccion>} />
      {!data ? <Esqueleto className="h-72" /> : (
        <>
          <ul className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {data.kpis.map((k, i) => (
              <motion.li key={k.clave} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className={cx("border-t-[3px] bg-papel p-4", k.estado === "cumple" ? "border-verde" : k.estado === "no cumple" ? "border-rojo" : "border-linea")}>
                <p className="text-[14px] text-gris">{k.nombre}</p>
                <p className="display text-[44px] font-bold leading-none">{k.valor == null ? <span className="text-linea">—</span> : <><Cuenta valor={k.valor} formato={(n) => num(n, k.unidad === "$" ? 0 : 1)} /><span className="ml-1 text-[22px] text-gris">{k.unidad}</span></>}</p>
                <p className="mt-1 text-[13px] text-gris">Meta: {k.mejor === "alto" ? "al menos" : "hasta"} {num(k.meta)} {k.unidad}</p>
                <div className="mt-2"><Chip tono={k.estado === "cumple" ? "ok" : k.estado === "no cumple" ? "peligro" : "neutro"}>{k.estado === "cumple" ? "Cumple" : k.estado === "no cumple" ? "No cumple" : "Sin datos"}</Chip></div>
                {k.nota && <p className="mt-2 text-[12px] leading-snug text-gris">{k.nota}</p>}
              </motion.li>
            ))}
          </ul>
          <Seccion titulo="OEE por equipo"><Tabla columnas={cols} filas={data.equipos} clave={(f) => f.codigo} maxAlto="calc(100dvh - 200px)" /></Seccion>
        </>
      )}
    </>
  );
}
