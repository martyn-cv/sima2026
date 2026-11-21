"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { conectarTiempoReal, type Equipo } from "@sima/cliente";
import { api, baseUrl, leerToken } from "./api";
import { useAuth } from "./auth";

interface Ctx {
  conexion: "conectado" | "reconectando" | "desconectado";
  equipos: Equipo[];
  io: Record<string, Record<string, number>>;       // por PLC: etiqueta → valor
  plcEstado: Record<string, string>;
  ciclos: Record<string, number>;
}
const PlantaCtx = createContext<Ctx>({ conexion: "desconectado", equipos: [], io: {}, plcEstado: {}, ciclos: {} });

/** Mantiene la planta al día: carga inicial por HTTP y cambios por SignalR (lecturas, estados, alarmas, órdenes, PLC). */
export function PlantaProvider({ children }: { children: ReactNode }) {
  const { usuario, salir } = useAuth();
  const qc = useQueryClient();
  const [conexion, setConexion] = useState<Ctx["conexion"]>("desconectado");
  const [io, setIo] = useState<Ctx["io"]>({});
  const [plcEstado, setPlcEstado] = useState<Record<string, string>>({});
  const [ciclos, setCiclos] = useState<Record<string, number>>({});
  const { data: equipos = [] } = useQuery({ queryKey: ["equipos"], queryFn: () => api.get<Equipo[]>("/api/equipos"), enabled: !!usuario });

  useEffect(() => {
    if (!usuario) return;
    const h = conectarTiempoReal(baseUrl(), leerToken, {
      conexion: (e) => { setConexion(e); if (e === "conectado") void qc.invalidateQueries({ queryKey: ["equipos"] }); },
      lecturas: (ls) => qc.setQueryData<Equipo[]>(["equipos"], (prev) => prev?.map((e) => {
        const mias = ls.filter((l) => l.equipo === e.codigo);
        if (!mias.length) return e;
        return { ...e, sensores: e.sensores.map((s) => {
          const l = mias.find((x) => x.variable === s.variable);
          return l ? { ...s, ultimo: l.valor, nivel: l.valor >= s.alarma ? "alarma" : l.valor >= s.aviso ? "aviso" : "ok" } : s;
        }) };
      })),
      equipo: (x) => qc.setQueryData<Equipo[]>(["equipos"], (prev) => prev?.map((e) => (e.codigo === x.codigo ? { ...e, estado: x.estado } : e))),
      alarma: () => { void qc.invalidateQueries({ queryKey: ["alarmas"] }); void qc.invalidateQueries({ queryKey: ["panel"] }); },
      orden: () => { void qc.invalidateQueries({ queryKey: ["ordenes"] }); void qc.invalidateQueries({ queryKey: ["panel"] }); },
      plc: (p) => { setPlcEstado((s) => ({ ...s, [p.codigo]: p.estado })); void qc.invalidateQueries({ queryKey: ["plc"] }); },
      plcIO: (p) => { setIo((s) => ({ ...s, [p.codigo]: p.io })); setPlcEstado((s) => ({ ...s, [p.codigo]: p.estado })); if (p.ciclos != null) setCiclos((s) => ({ ...s, [p.codigo]: p.ciclos! })); },
      cuentaCerrada: (m) => salir(m.motivo),
    });
    return () => { void h.detener(); };
  }, [usuario?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <PlantaCtx.Provider value={{ conexion, equipos, io, plcEstado, ciclos }}>{children}</PlantaCtx.Provider>;
}

export const usePlanta = () => useContext(PlantaCtx);
