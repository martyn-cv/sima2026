"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { hace, type PlcResumen } from "@sima/cliente";
import { api } from "@/lib/api";
import { usePlanta } from "@/lib/planta";
import { Chip, Encabezado, ErrorCarga, Esqueleto, cx } from "@/components/ui";
import { ESTADO_PLC } from "@/components/plc";

export default function ListaPlc() {
  const { plcEstado } = usePlanta();
  const { data, error, refetch } = useQuery({ queryKey: ["plc"], queryFn: () => api.get<PlcResumen[]>("/api/plc"), refetchInterval: 5000 });
  if (error) return <ErrorCarga error={error} reintentar={() => void refetch()} />;
  return (
    <>
      <Encabezado titulo="Controladores PLC" descripcion="Los PLC de la planta, con sus módulos y puntos de entrada y salida guardados en la misma base de datos. Se conectan al simulador de PLC o, más adelante, a controladores reales." />
      {!data ? <div className="grid gap-4 sm:grid-cols-2"><Esqueleto className="h-48" /><Esqueleto className="h-48" /></div> : (
        <ul className="grid gap-4 md:grid-cols-2">
          {data.map((p, i) => {
            const est = ESTADO_PLC[plcEstado[p.codigo] && p.estado !== "sin_conexion" ? plcEstado[p.codigo] : p.estado] ?? ESTADO_PLC.sin_conexion;
            return (
              <motion.li key={p.codigo} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Link href={`/plc/${p.codigo}`} className="group block tarjeta p-5 transition-colors hover:bg-chapa/40">
                  <div className="flex items-start justify-between gap-3">
                    <div><div className="flex items-center gap-2.5"><span className={cx("size-3 rounded-full", est.led)} /><p className="display text-[34px] font-bold leading-none">{p.codigo}</p></div><p className="mt-1 font-medium">{p.nombre}</p><p className="text-[14px] text-gris">{p.fabricante} {p.modelo}</p></div>
                    <Chip tono={est.tono}>{est.texto}</Chip>
                  </div>
                  <dl className="mt-4 grid grid-cols-4 gap-3 border-t border-linea-suave pt-3 text-center">
                    {[["Módulos", p.modulos], ["Entradas", p.entradas], ["Salidas", p.salidas], ["Equipos", p.equipos.length]].map(([t, n]) => <div key={t as string}><dd className="display text-[28px] font-bold leading-none">{n}</dd><dt className="text-[13px] text-gris">{t}</dt></div>)}
                  </dl>
                  <p className="mt-3 truncate text-[13px] text-gris">{p.equipos.join(", ")}</p>
                  <p className="mt-1 text-[13px] text-gris">{p.direccion} · último dato {hace(p.ultimoContacto)}</p>
                </Link>
              </motion.li>
            );
          })}
        </ul>
      )}
    </>
  );
}
