import { useSyncExternalStore } from "react";
import { ApiError } from "@sima/cliente";
import { api } from "./api";

/**
 * Trabajo sin señal: lo que se envía queda en una cola en el equipo y se reintenta solo, sin duplicarse
 * (cada envío lleva un identificador único que el servidor reconoce). Las consultas se guardan para verlas sin conexión.
 */
interface Pendiente { uid: string; metodo: "POST" | "PUT"; ruta: string; cuerpo: Record<string, unknown>; creado: number }
const COLA = "sima.terreno.cola";
const oyentes = new Set<() => void>();
let version = 0;

const leerCola = (): Pendiente[] => { try { return JSON.parse(localStorage.getItem(COLA) ?? "[]"); } catch { return []; } };
const guardarCola = (c: Pendiente[]) => { try { localStorage.setItem(COLA, JSON.stringify(c)); } catch { /* sin almacenamiento */ } version++; oyentes.forEach((f) => f()); };
export const cantidadPendientes = () => leerCola().length;
export const usePendientes = () => { useSyncExternalStore((f) => { oyentes.add(f); return () => { oyentes.delete(f); }; }, () => version); return cantidadPendientes(); };

const esRed = (e: unknown) => e instanceof ApiError && e.status === 0;
export const uidNuevo = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);

/** Envía ahora; si no hay señal, lo deja en la cola y avisa con `queued: true`. Los errores del servidor (permisos, datos mal puestos) se muestran al instante. */
export async function enviar<T = unknown>(metodo: "POST" | "PUT", ruta: string, cuerpo: Record<string, unknown>): Promise<{ queued: boolean; data?: T }> {
  const uid = uidNuevo();
  const conUid = { ...cuerpo, uid };
  try {
    return { queued: false, data: metodo === "POST" ? await api.post<T>(ruta, conUid) : await api.put<T>(ruta, conUid) };
  } catch (e) {
    if (!esRed(e)) throw e;
    guardarCola([...leerCola(), { uid, metodo, ruta, cuerpo: conUid, creado: Date.now() }]);
    return { queued: true };
  }
}

let vaciando = false;
/** Reenvía la cola en orden. Se detiene si todavía no hay señal; descarta lo que el servidor rechaza por una razón definitiva. */
export async function vaciar() {
  if (vaciando) return;
  vaciando = true;
  try {
    for (const p of leerCola()) {
      try { if (p.metodo === "POST") await api.post(p.ruta, p.cuerpo); else await api.put(p.ruta, p.cuerpo); }
      catch (e) { if (esRed(e)) break; /* rechazo definitivo: se descarta para no bloquear la cola */ }
      guardarCola(leerCola().filter((x) => x.uid !== p.uid));
    }
  } finally { vaciando = false; }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => void vaciar());
  setInterval(() => { if (cantidadPendientes() > 0) void vaciar(); }, 15_000);
}
