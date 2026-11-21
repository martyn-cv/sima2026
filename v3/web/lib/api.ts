import { crearCliente } from "@sima/cliente";

const CLAVE = "sima.sesion";

export const baseUrl = () =>
  process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:5080` : "http://localhost:5080");

export const guardarToken = (t: string | null) => {
  try { if (t) localStorage.setItem(CLAVE, t); else localStorage.removeItem(CLAVE); } catch { /* almacenamiento no disponible */ }
};
export const leerToken = () => {
  try { return typeof window === "undefined" ? null : localStorage.getItem(CLAVE); } catch { return null; }
};

export const api = crearCliente({
  baseUrl,
  token: leerToken,
  alExpirar: () => typeof window !== "undefined" && window.dispatchEvent(new Event("sima:sesion-expirada")),
});
