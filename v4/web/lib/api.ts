import { crearCliente } from "@sima/cliente";

const CLAVE = "sima.sesion";

/**
 * Dónde está la API: la variable NEXT_PUBLIC_API_URL si existe; si la web se abre directo en el puerto 3000, la API está en el 5080 del mismo equipo;
 * y detrás de un proxy con HTTPS (Caddy) la API cuelga del mismo origen que la web.
 */
export const baseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window === "undefined") return "http://localhost:5080";
  return window.location.port === "3000" ? `${window.location.protocol}//${window.location.hostname}:5080` : window.location.origin;
};

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
