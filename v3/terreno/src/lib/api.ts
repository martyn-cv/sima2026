import { crearCliente } from "@sima/cliente";

const CLAVE = "sima.terreno.sesion", URL_CLAVE = "sima.terreno.url";
export const baseUrl = () => { try { return localStorage.getItem(URL_CLAVE) || "http://localhost:5080"; } catch { return "http://localhost:5080"; } };
export const guardarUrl = (u: string) => { try { localStorage.setItem(URL_CLAVE, u.replace(/\/+$/, "")); } catch { /* sin almacenamiento */ } };
export const guardarToken = (t: string | null) => { try { if (t) localStorage.setItem(CLAVE, t); else localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ } };
export const leerToken = () => { try { return localStorage.getItem(CLAVE); } catch { return null; } };

export const api = crearCliente({ baseUrl, token: leerToken, alExpirar: () => window.dispatchEvent(new Event("sima:sesion-expirada")) });
