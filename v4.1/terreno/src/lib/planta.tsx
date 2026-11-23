import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { conectarTiempoReal, type Equipo, type EventoPlanta } from "@sima/cliente";
import { api, baseUrl, leerToken } from "./api";
import { useAuth } from "./auth";
import { tiene } from "../roles";

export interface Notificacion { id: number; texto: string; nivel: "alarma" | "aviso" | "info" | "ok"; ts: number; destino?: string; simulado?: boolean }
interface Ctx {
  conexion: "conectado" | "reconectando" | "desconectado";
  equipos: Equipo[];
  io: Record<string, Record<string, number>>;
  plcEstado: Record<string, string>;
  notificaciones: Notificacion[];
  aviso: Notificacion | null;
  noLeidas: number;
  marcarLeidas: () => void;
}
const PlantaCtx = createContext<Ctx>({ conexion: "desconectado", equipos: [], io: {}, plcEstado: {}, notificaciones: [], aviso: null, noLeidas: 0, marcarLeidas: () => {} });

/**
 * La planta en vivo para SIMA Desktop: carga inicial por HTTP y cambios por SignalR (mismo hub que la web).
 * Si Personas desvincula a quien está conectado, el servidor cierra la sesión aquí mismo.
 */
export function PlantaProvider({ children }: { children: ReactNode }) {
  const { usuario, salir } = useAuth();
  const qc = useQueryClient();
  const [conexion, setConexion] = useState<Ctx["conexion"]>("desconectado");
  const [io, setIo] = useState<Ctx["io"]>({});
  const [plcEstado, setPlcEstado] = useState<Record<string, string>>({});
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [aviso, setAviso] = useState<Notificacion | null>(null);
  const [noLeidas, setNoLeidas] = useState(0);
  // solo los cargos que trabajan con la planta reciben su estado (el servidor también lo exige)
  const vePlanta = tiene(usuario, "planta.ver");
  const { data: equipos = [] } = useQuery({ queryKey: ["equipos"], queryFn: () => api.get<Equipo[]>("/api/equipos"), enabled: !!usuario && vePlanta });
  const notificar = (n: Omit<Notificacion, "id" | "ts">, emergente = false) => {
    const x = { ...n, id: Date.now() + Math.random(), ts: Date.now() };
    setNotificaciones((l) => [x, ...l].slice(0, 60));
    setNoLeidas((k) => k + 1);
    if (emergente) setAviso(x);
  };
  const refrescar = (...claves: string[]) => claves.forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));

  useEffect(() => {
    if (!usuario) return;
    const h = conectarTiempoReal(baseUrl(), leerToken, {
      conexion: (e) => { setConexion(e); if (e === "conectado") refrescar("equipos", "resumen"); },
      lecturas: (ls) => qc.setQueryData<Equipo[]>(["equipos"], (prev) => prev?.map((e) => {
        const mias = ls.filter((l) => l.equipo === e.codigo);
        return !mias.length ? e : { ...e, sensores: e.sensores.map((s) => { const l = mias.find((x) => x.variable === s.variable); return l ? { ...s, ultimo: l.valor, nivel: l.valor >= s.alarma ? "alarma" : l.valor >= s.aviso ? "aviso" : "ok" } : s; }) };
      })),
      equipo: (x) => { qc.setQueryData<Equipo[]>(["equipos"], (prev) => prev?.map((e) => (e.codigo === x.codigo ? { ...e, estado: x.estado } : e))); refrescar("resumen", "equipo", "estructura"); },
      alarma: (a) => { refrescar("alarmas", "resumen"); if (a.abierta) notificar({ texto: a.mensaje, nivel: a.nivel === "alarma" ? "alarma" : "aviso", destino: `/explorador?equipo=${a.equipo}` }, a.nivel === "alarma"); },
      // los cambios de OT refrescan las listas; el aviso a la persona correcta llega como «notificacion»
      orden: (o) => { refrescar("ordenes", "resumen", "orden"); if (!o.estado && o.prioridad === "critica") notificar({ texto: `Orden ${o.codigo}: ${o.titulo} (${o.equipo})${o.simulada ? " · simulada" : ""}`, nivel: "alarma", destino: `/mantenimiento?orden=${o.id}`, simulado: o.simulada }, true); },
      notificacion: (n) => { refrescar("ordenes", "orden", "equipos"); notificar({ texto: n.texto, nivel: n.nivel, destino: n.destino ?? undefined }, n.nivel !== "info"); },
      plc: (p) => { setPlcEstado((s) => ({ ...s, [p.codigo]: p.estado })); refrescar("resumen"); if (p.estado === "error") notificar({ texto: `${p.codigo} informa una falla`, nivel: "alarma" }, true); },
      plcIO: (p) => { setIo((s) => ({ ...s, [p.codigo]: p.io })); setPlcEstado((s) => ({ ...s, [p.codigo]: p.estado })); },
      evento: (e: EventoPlanta) => { qc.setQueryData<EventoPlanta[]>(["eventos", "vivo"], (prev) => [e, ...(prev ?? [])].slice(0, 200)); },
      intervencion: (i) => { refrescar("ordenes", "resumen", "equipo", "orden"); notificar({ texto: `${i.tecnico} registró una intervención en ${i.equipo} (${i.orden})`, nivel: i.cerrada ? "ok" : "info" }); },
      estructura: (e) => { refrescar("equipos", "estructura"); notificar({ texto: e.tipo === "equipo" ? `Nuevo equipo registrado en la web: ${e.codigo}` : `Estructura de planta actualizada (${e.codigo})`, nivel: "info", destino: e.tipo === "equipo" ? `/explorador?equipo=${e.codigo}` : "/explorador" }); },
      cuentaCerrada: (m) => salir(m.motivo),
    });
    return () => { void h.detener(); };
  }, [usuario?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <PlantaCtx.Provider value={{ conexion, equipos, io, plcEstado, notificaciones, aviso, noLeidas, marcarLeidas: () => setNoLeidas(0) }}>{children}</PlantaCtx.Provider>;
}
export const usePlanta = () => useContext(PlantaCtx);
