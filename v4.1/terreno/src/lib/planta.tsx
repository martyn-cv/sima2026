import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { conectarTiempoReal, type Equipo, type EventoPlanta } from "@sima/cliente";
import { api, baseUrl, leerToken } from "./api";
import { useAuth } from "./auth";
import { tiene } from "../roles";

/** Alerta de planta en vivo (alarmas, fallas de PLC): se muestra en el centro de notificaciones, sección «Planta». */
export interface AlertaPlanta { id: number; texto: string; nivel: "alarma" | "aviso" | "info" | "ok"; ts: number; destino?: string; simulado?: boolean }
interface Ctx {
  conexion: "conectado" | "reconectando" | "desconectado";
  equipos: Equipo[];
  io: Record<string, Record<string, number>>;
  plcEstado: Record<string, string>;
  alertas: AlertaPlanta[];
  /** Última alerta crítica, para mostrarla de inmediato (sin depender de una animación). */
  critica: AlertaPlanta | null;
  descartarCritica: () => void;
  /** Momento del último dato recibido en vivo (barra de estado). */
  ultimoDato: number | null;
}
const PlantaCtx = createContext<Ctx>({ conexion: "desconectado", equipos: [], io: {}, plcEstado: {}, alertas: [], critica: null, descartarCritica: () => {}, ultimoDato: null });

/**
 * La planta en vivo para SIMA Desktop: carga inicial por HTTP y cambios por SignalR (mismo hub que la web). Solo los cargos
 * que pueden ver la planta reciben su estado (el servidor también lo exige). Las notificaciones dirigidas a la persona se
 * guardan en el servidor (centro de notificaciones); si Personas revoca el acceso o cierra la cuenta, la sesión termina aquí.
 */
export function PlantaProvider({ children }: { children: ReactNode }) {
  const { usuario, salir } = useAuth();
  const qc = useQueryClient();
  const [conexion, setConexion] = useState<Ctx["conexion"]>("desconectado");
  const [io, setIo] = useState<Ctx["io"]>({});
  const [plcEstado, setPlcEstado] = useState<Record<string, string>>({});
  const [alertas, setAlertas] = useState<AlertaPlanta[]>([]);
  const [critica, setCritica] = useState<AlertaPlanta | null>(null);
  const [ultimoDato, setUltimoDato] = useState<number | null>(null);
  const tic = useRef(0);
  const vePlanta = tiene(usuario, "planta.ver");
  const { data: equipos = [] } = useQuery({ queryKey: ["equipos"], queryFn: () => api.get<Equipo[]>("/api/equipos"), enabled: !!usuario && vePlanta });
  const alertar = (a: Omit<AlertaPlanta, "id" | "ts">, esCritica = false) => {
    const x = { ...a, id: Date.now() + Math.random(), ts: Date.now() };
    setAlertas((l) => [x, ...l].slice(0, 80));
    if (esCritica) setCritica(x);
  };
  const refrescar = (...claves: string[]) => claves.forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
  const vivo = () => { const t = Date.now(); if (t - tic.current > 1000) { tic.current = t; setUltimoDato(t); } };

  useEffect(() => {
    if (!usuario) return;
    const h = conectarTiempoReal(baseUrl(), leerToken, {
      conexion: (e) => { setConexion(e); if (e === "conectado") { refrescar("equipos", "resumen", "notificaciones"); setUltimoDato(Date.now()); } },
      lecturas: (ls) => { vivo(); qc.setQueryData<Equipo[]>(["equipos"], (prev) => prev?.map((e) => {
        const mias = ls.filter((l) => l.equipo === e.codigo);
        return !mias.length ? e : { ...e, sensores: e.sensores.map((s) => { const l = mias.find((x) => x.variable === s.variable); return l ? { ...s, ultimo: l.valor, nivel: l.valor >= s.alarma ? "alarma" : l.valor >= s.aviso ? "aviso" : "ok" } : s; }) };
      })); },
      equipo: (x) => { vivo(); qc.setQueryData<Equipo[]>(["equipos"], (prev) => prev?.map((e) => (e.codigo === x.codigo ? { ...e, estado: x.estado } : e))); refrescar("resumen", "equipo", "estructura"); },
      alarma: (a) => { vivo(); refrescar("alarmas", "resumen"); if (a.abierta) alertar({ texto: `${a.equipo}: ${a.mensaje}`, nivel: a.nivel === "alarma" ? "alarma" : "aviso", destino: `/explorador?equipo=${a.equipo}` }, a.nivel === "alarma"); },
      orden: () => refrescar("ordenes", "resumen", "orden", "aprobaciones"),
      plc: (p) => { setPlcEstado((s) => ({ ...s, [p.codigo]: p.estado })); refrescar("resumen"); if (p.estado === "error") alertar({ texto: `${p.codigo} informa una falla de CPU`, nivel: "alarma", destino: "/automatizacion" }, true); },
      plcIO: (p) => { vivo(); setIo((s) => ({ ...s, [p.codigo]: p.io })); setPlcEstado((s) => ({ ...s, [p.codigo]: p.estado })); },
      evento: (e: EventoPlanta) => { qc.setQueryData<EventoPlanta[]>(["eventos", "vivo"], (prev) => [e, ...(prev ?? [])].slice(0, 200)); },
      intervencion: () => refrescar("ordenes", "resumen", "equipo", "orden"),
      estructura: () => refrescar("equipos", "estructura"),
      // notificación dirigida: ya está guardada en el servidor; se refresca el centro y las listas relacionadas
      notificacion: (n) => { refrescar("notificaciones", "ordenes", "orden", "aprobaciones", "equipos"); if (n.categoria === "critica" || n.nivel === "critica") alertar({ texto: n.texto, nivel: "alarma", destino: n.destino ?? undefined }, true); },
      sesionRevocada: (s) => { if (s.plataforma === "app") salir(s.motivo); },
      cuentaCerrada: (m) => salir(m.motivo),
    });
    return () => { void h.detener(); };
  }, [usuario?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <PlantaCtx.Provider value={{ conexion, equipos, io, plcEstado, alertas, critica, descartarCritica: () => setCritica(null), ultimoDato }}>{children}</PlantaCtx.Provider>;
}
export const usePlanta = () => useContext(PlantaCtx);
