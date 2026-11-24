import { ApiError, crearCliente } from "@sima/cliente";

const CLAVE = "sima.terreno.sesion", URL_CLAVE = "sima.terreno.url";
export const baseUrl = () => { try { return localStorage.getItem(URL_CLAVE) || "http://localhost:5080"; } catch { return "http://localhost:5080"; } };
export const guardarUrl = (u: string) => { try { localStorage.setItem(URL_CLAVE, u.replace(/\/+$/, "")); } catch { /* sin almacenamiento */ } };
export const guardarToken = (t: string | null) => { try { if (t) localStorage.setItem(CLAVE, t); else localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ } };
export const leerToken = () => { try { return localStorage.getItem(CLAVE); } catch { return null; } };

const cliente = crearCliente({ baseUrl, token: leerToken, alExpirar: () => window.dispatchEvent(new Event("sima:sesion-expirada")) });

/** Las consultas se guardan en el equipo: sin señal se muestra lo último que se vio, en vez de una pantalla vacía. */
const CACHE = "sima.terreno.cache.";
export const api = {
  ...cliente,
  async get<T>(ruta: string): Promise<T> {
    try {
      const datos = await cliente.get<T>(ruta);
      try { localStorage.setItem(CACHE + ruta, JSON.stringify(datos)); } catch { /* sin espacio */ }
      return datos;
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) { try { const c = localStorage.getItem(CACHE + ruta); if (c) return JSON.parse(c) as T; } catch { /* caché dañada */ } }
      throw e;
    }
  },
};
