"use client";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ErrorCarga, Esqueleto } from "@/components/ui";
import { BandejaAprobaciones, Cabecera, ModCalidad, ModDespachos, ModPagos, ModPersonas, ModPlanta, ModProduccion, ModSst, type Panel } from "@/components/inicio";

type Modulo = "planta" | "produccion" | "personas" | "pagos" | "calidad" | "sst" | "despachos";

/** Qué ve primero cada perfil al entrar (informe de accesos, sección «pantalla de inicio»). */
const ORDEN: Record<string, Modulo[]> = {
  gerencia: ["planta", "produccion", "calidad", "personas", "pagos", "sst", "despachos"],
  finanzas_adm: ["pagos", "personas", "produccion", "despachos"],
  produccion_ing: ["produccion", "planta", "calidad", "sst"],
  calidad_gestion: ["calidad", "produccion", "planta"],
  rrhh: ["personas", "pagos", "sst"],
  logistica: ["despachos", "produccion", "calidad"],
  comercial: ["despachos", "produccion", "calidad"],
};

export default function Inicio() {
  const { usuario, tiene, puede } = useAuth();
  const { data: panel, error, refetch } = useQuery({ queryKey: ["panel"], queryFn: () => api.get<Panel>("/api/panel"), refetchInterval: 20_000 });
  if (error) return <ErrorCarga error={error} reintentar={() => void refetch()} />;

  const disponible: Record<Modulo, boolean> = {
    planta: true, produccion: tiene("produccion.ver"), personas: !!panel?.personas, pagos: !!panel?.personas?.verPagos,
    calidad: tiene("calidad.ver"), sst: tiene("sst.ver"), despachos: puede("despachos"),
  };
  const orden = (ORDEN[usuario?.perfil ?? ""] ?? ["planta", "produccion", "personas"]).filter((m) => disponible[m]);
  const vista = (m: Modulo, i: number): ReactNode => {
    if (!panel) return null;
    const d = Math.min(i * 0.05, 0.2);
    switch (m) {
      case "planta": return <ModPlanta key={m} panel={panel} delay={d} />;
      case "produccion": return <ModProduccion key={m} delay={d} />;
      case "personas": return <ModPersonas key={m} panel={panel} delay={d} />;
      case "pagos": return <ModPagos key={m} panel={panel} delay={d} />;
      case "calidad": return <ModCalidad key={m} delay={d} />;
      case "sst": return <ModSst key={m} delay={d} />;
      case "despachos": return <ModDespachos key={m} delay={d} />;
    }
  };

  return (
    <>
      <Cabecera panel={panel} />
      <BandejaAprobaciones />
      {!panel ? <div className="grid gap-4 md:grid-cols-4"><Esqueleto className="h-36" /><Esqueleto className="h-36" /><Esqueleto className="h-36" /><Esqueleto className="h-36" /><Esqueleto className="h-80 md:col-span-4" /></div>
        : <div className="grid gap-10">{orden.map(vista)}</div>}
    </>
  );
}
