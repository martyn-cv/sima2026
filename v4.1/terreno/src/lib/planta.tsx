import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { conectarTiempoReal, type Equipo } from "@sima/cliente";
import { api, baseUrl, leerToken } from "./api";
import { useAuth } from "./auth";

interface Ctx { conexion: "conectado" | "reconectando" | "desconectado"; equipos: Equipo[]; aviso: { id: number; texto: string; nivel: "alarma" | "info" } | null }
const PlantaCtx = createContext<Ctx>({ conexion: "desconectado", equipos: [], aviso: null });

/** Planta en vivo: carga inicial por HTTP y cambios por SignalR. Si RR. HH. desvincula a la persona, el servidor cierra la sesión aquí mismo. */
export function PlantaProvider({ children }: { children: ReactNode }) {
  const { usuario, salir } = useAuth();
  const qc = useQueryClient();
  const [conexion, setConexion] = useState<Ctx["conexion"]>("desconectado");
  const [aviso, setAviso] = useState<Ctx["aviso"]>(null);
  const { data: equipos = [] } = useQuery({ queryKey: ["equipos"], queryFn: () => api.get<Equipo[]>("/api/equipos"), enabled: !!usuario });

  useEffect(() => {
    if (!usuario) return;
    const h = conectarTiempoReal(baseUrl(), leerToken, {
      conexion: (e) => { setConexion(e); if (e === "conectado") void qc.invalidateQueries({ queryKey: ["equipos"] }); },
      lecturas: (ls) => qc.setQueryData<Equipo[]>(["equipos"], (prev) => prev?.map((e) => {
        const mias = ls.filter((l) => l.equipo === e.codigo);
        return !mias.length ? e : { ...e, sensores: e.sensores.map((s) => { const l = mias.find((x) => x.variable === s.variable); return l ? { ...s, ultimo: l.valor, nivel: l.valor >= s.alarma ? "alarma" : l.valor >= s.aviso ? "aviso" : "ok" } : s; }) };
      })),
      equipo: (x) => qc.setQueryData<Equipo[]>(["equipos"], (prev) => prev?.map((e) => (e.codigo === x.codigo ? { ...e, estado: x.estado } : e))),
      alarma: (a) => { void qc.invalidateQueries({ queryKey: ["alarmas"] }); if (a.abierta && a.nivel === "alarma") setAviso({ id: Date.now(), texto: a.mensaje, nivel: "alarma" }); },
      orden: (o) => { void qc.invalidateQueries({ queryKey: ["ordenes"] }); setAviso({ id: Date.now(), texto: `Nueva orden ${o.codigo}: ${o.titulo} (${o.equipo})`, nivel: "info" }); },
      cuentaCerrada: (m) => salir(m.motivo),
    });
    return () => { void h.detener(); };
  }, [usuario?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <PlantaCtx.Provider value={{ conexion, equipos, aviso }}>{children}</PlantaCtx.Provider>;
}
export const usePlanta = () => useContext(PlantaCtx);
