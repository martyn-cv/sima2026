"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { conectarTiempoReal, type Equipo, type EventoPlanta } from "@sima/cliente";
import { api, baseUrl, leerToken } from "./api";
import { useAuth } from "./auth";

export interface EventoVivo { id: number; tipo: "alarma" | "orden" | "plc" | "equipo" | "produccion" | "calidad" | "sst"; texto: string; nivel: "alarma" | "aviso" | "info" | "ok"; ts: number; enlace?: string }
interface Ctx {
  conexion: "conectado" | "reconectando" | "desconectado";
  eventos: EventoVivo[];
  equipos: Equipo[];
  io: Record<string, Record<string, number>>;       // por PLC: etiqueta → valor
  plcEstado: Record<string, string>;
  ciclos: Record<string, number>;
}
const PlantaCtx = createContext<Ctx>({ conexion: "desconectado", eventos: [], equipos: [], io: {}, plcEstado: {}, ciclos: {} });

/** Mantiene la planta al día: carga inicial por HTTP y cambios por SignalR (lecturas, estados, alarmas, órdenes, PLC). */
export function PlantaProvider({ children }: { children: ReactNode }) {
  const { usuario, salir } = useAuth();
  const qc = useQueryClient();
  const [conexion, setConexion] = useState<Ctx["conexion"]>("desconectado");
  const [io, setIo] = useState<Ctx["io"]>({});
  const [plcEstado, setPlcEstado] = useState<Record<string, string>>({});
  const [ciclos, setCiclos] = useState<Record<string, number>>({});
  const [eventos, setEventos] = useState<EventoVivo[]>([]);
  const evento = (e: Omit<EventoVivo, "id" | "ts">) => setEventos((l) => [{ ...e, id: Date.now() + Math.random(), ts: Date.now() }, ...l].slice(0, 40));
  const { data: equipos = [] } = useQuery({ queryKey: ["equipos"], queryFn: () => api.get<Equipo[]>("/api/equipos"), enabled: !!usuario && !!usuario.capacidades && "planta.ver" in usuario.capacidades });

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
      equipo: (x) => { qc.setQueryData<Equipo[]>(["equipos"], (prev) => prev?.map((e) => (e.codigo === x.codigo ? { ...e, estado: x.estado } : e))); if (x.estado === "operando") evento({ tipo: "equipo", texto: `${x.codigo} volvió a operar`, nivel: "ok", enlace: "/planta" }); },
      alarma: (a) => { void qc.invalidateQueries({ queryKey: ["alarmas"] }); void qc.invalidateQueries({ queryKey: ["panel"] }); if (a.abierta) evento({ tipo: "alarma", texto: a.mensaje, nivel: a.nivel === "alarma" ? "alarma" : "aviso", enlace: "/planta" }); },
      orden: (o) => { void qc.invalidateQueries({ queryKey: ["ordenes"] }); void qc.invalidateQueries({ queryKey: ["panel"] }); evento({ tipo: "orden", texto: `Orden ${o.codigo}: ${o.titulo} (${o.equipo})`, nivel: o.prioridad === "critica" ? "alarma" : "info", enlace: "/planta" }); },
      plc: (p) => { setPlcEstado((s) => ({ ...s, [p.codigo]: p.estado })); void qc.invalidateQueries({ queryKey: ["plc"] }); evento({ tipo: "plc", texto: `${p.codigo} pasó a ${p.estado === "run" ? "marcha" : p.estado}`, nivel: p.estado === "run" ? "ok" : "aviso", enlace: `/plc/equipo?codigo=${p.codigo}` }); },
      plcIO: (p) => { setIo((s) => ({ ...s, [p.codigo]: p.io })); setPlcEstado((s) => ({ ...s, [p.codigo]: p.estado })); if (p.ciclos != null) setCiclos((s) => ({ ...s, [p.codigo]: p.ciclos! })); },
      produccion: () => { void qc.invalidateQueries({ queryKey: ["produccion"] }); },
      calidad: (c) => { void qc.invalidateQueries({ queryKey: ["calidad"] }); void qc.invalidateQueries({ queryKey: ["aprobaciones"] }); evento({ tipo: "calidad", texto: c.texto, nivel: c.estado === "abierta" ? (c.severidad === "critica" ? "alarma" : "aviso") : "ok", enlace: "/calidad" }); },
      sst: (x) => { void qc.invalidateQueries({ queryKey: ["sst"] }); void qc.invalidateQueries({ queryKey: ["aprobaciones"] }); evento({ tipo: "sst", texto: x.texto, nivel: x.severidad === "leve" ? "aviso" : "alarma", enlace: "/seguridad" }); },
      cambioPlc: (c) => { void qc.invalidateQueries({ queryKey: ["cambios"] }); void qc.invalidateQueries({ queryKey: ["aprobaciones"] }); void qc.invalidateQueries({ queryKey: ["plc"] }); evento({ tipo: "plc", texto: c.estado === "pendiente" ? `${c.plc}: cambio de programa por aprobar (${c.resumen})` : `${c.plc}: cambio ${c.estado} por ${c.por}`, nivel: c.estado === "aprobado" ? "ok" : c.estado === "rechazado" ? "aviso" : "info", enlace: "/mantenimiento" }); },
      evento: (e) => { qc.setQueryData<EventoPlanta[]>(["eventos", "vivo"], (prev) => [e, ...(prev ?? [])].slice(0, 300)); },
      intervencion: (i) => { void qc.invalidateQueries({ queryKey: ["ordenes"] }); void qc.invalidateQueries({ queryKey: ["equipo"] }); evento({ tipo: "orden", texto: `${i.orden}: intervención de ${i.tecnico} en ${i.equipo}${i.cerrada ? " (cerrada)" : ""}`, nivel: i.cerrada ? "ok" : "info", enlace: "/mantenimiento" }); },
      estructura: () => { void qc.invalidateQueries({ queryKey: ["estructura"] }); void qc.invalidateQueries({ queryKey: ["equipos"] }); },
      cuentaCerrada: (m) => salir(m.motivo),
    });
    return () => { void h.detener(); };
  }, [usuario?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <PlantaCtx.Provider value={{ conexion, eventos, equipos, io, plcEstado, ciclos }}>{children}</PlantaCtx.Provider>;
}

export const usePlanta = () => useContext(PlantaCtx);
