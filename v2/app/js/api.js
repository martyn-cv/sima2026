// Cliente de la API con modo sin conexión: cola de envíos pendientes y caché de consultas.
const API = window.SIMA_API;
export const ORIGEN_API = new URL(API).origin;
const INACTIVIDAD_MS = 60 * 60 * 1000;      // la sesión se cierra tras 60 min sin actividad
const K = { ses: 'sima_app', cola: 'sima_cola', rech: 'sima_rechazados', cache: 'sima_cache' };
const jl = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const gj = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

let alCerrar = () => {};
export const onCerrar = (fn) => { alCerrar = fn; };
export const sesion = () => { const s = jl(K.ses, null); if (s && Date.now() - s.ultimo > INACTIVIDAD_MS) { localStorage.removeItem(K.ses); return null; } return s; };
export const guardarSesion = (token, usuario) => gj(K.ses, { token, usuario, ultimo: Date.now() });
export function actualizarUsuario(u) { const s = jl(K.ses, null); if (s) { s.usuario = u; gj(K.ses, s); } }
export function cerrarSesion(porInactividad = false) { localStorage.removeItem(K.ses); localStorage.removeItem(K.cache); alCerrar(porInactividad); }   // la caché no sobrevive al cierre de sesión (equipos compartidos)
const tocar = () => { const s = jl(K.ses, null); if (s) { s.ultimo = Date.now(); gj(K.ses, s); } };

export class ErrorApi extends Error { constructor(msg, estado, campos) { super(msg); this.estado = estado; this.campos = campos || {}; } }
export const sinRed = (e) => e instanceof ErrorApi && e.estado === 0;

export async function api(ruta, { metodo = 'GET', cuerpo, params, publico } = {}) {
  const s = sesion();
  const url = new URL(API + ruta);
  Object.entries(params || {}).forEach(([k, v]) => v !== '' && v != null && url.searchParams.set(k, v));
  let r;
  try {
    r = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json', ...(s && !publico ? { Authorization: 'Bearer ' + s.token } : {}) }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  } catch { throw new ErrorApi('Sin conexión con el servidor.', 0); }
  const datos = await r.json().catch(() => ({}));
  if (r.status === 401 && !publico) { cerrarSesion(true); throw new ErrorApi('Su sesión terminó. Ingrese de nuevo.', 401); }
  if (!r.ok) throw new ErrorApi(datos.error || 'No se pudo completar la acción.', r.status, datos.campos);
  tocar();
  return datos;
}

// ---- consultas con caché: sin señal se muestran los últimos datos guardados ----
export async function obtener(ruta, params) {
  const clave = ruta + '?' + new URLSearchParams(params || {});
  try {
    const d = await api(ruta, { params });
    const c = jl(K.cache, {}); c[clave] = { ts: Date.now(), d };
    const ks = Object.keys(c); if (ks.length > 60) ks.sort((a, b) => c[a].ts - c[b].ts).slice(0, ks.length - 60).forEach((k) => delete c[k]);
    if (!gj(K.cache, c)) { Object.keys(c).sort((a, b) => c[a].ts - c[b].ts).slice(0, 20).forEach((k) => delete c[k]); gj(K.cache, c); }
    return { datos: d, viejo: false };
  } catch (e) {
    const c = jl(K.cache, {})[clave];
    if (sinRed(e) && c) return { datos: c.d, viejo: true, ts: c.ts };
    throw e;
  }
}
export const lista = async (recurso, params) => { const r = await obtener(`/${recurso}/`, params); return { filas: r.datos.resultados, viejo: r.viejo }; };

// ---- cola de envíos sin conexión ----
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
export const cola = () => jl(K.cola, []);
export const rechazados = () => jl(K.rech, []);
export const descartarRechazados = () => { gj(K.rech, []); avisar(); };
export const pendientesDe = (prefijo) => cola().filter((x) => x.ruta.startsWith(prefijo));
const avisar = () => window.dispatchEvent(new CustomEvent('sima-cola'));

/** Envía un registro. Sin conexión lo guarda en el equipo y lo manda solo al volver la señal (con uid: no se duplica). */
export async function enviarConCola(ruta, cuerpo, etiqueta) {
  const dato = { ...cuerpo, uid: cuerpo.uid || uid(), hecho_en: cuerpo.hecho_en || new Date().toISOString() };
  const encolar = () => { const c = cola(); c.push({ ruta, cuerpo: dato, etiqueta, ts: Date.now() }); if (!gj(K.cola, c)) throw new ErrorApi('No hay espacio para guardar el registro en este equipo. Libere espacio o envíelo con señal.', 0); avisar(); return { encolado: true }; };
  if (!navigator.onLine) return encolar();
  try { return { encolado: false, respuesta: await api(ruta, { metodo: 'POST', cuerpo: dato }) }; }
  catch (e) { if (sinRed(e)) return encolar(); throw e; }
}
let sincronizando = false;
export async function sincronizar() {
  if (sincronizando || !navigator.onLine || !sesion()) return 0;
  sincronizando = true; let enviados = 0;
  try {
    while (cola().length) {
      const item = cola()[0];
      try { await api(item.ruta, { metodo: 'POST', cuerpo: item.cuerpo }); enviados++; }
      catch (e) {
        if (sinRed(e) || e.estado === 401) break;                       // se reintenta más tarde; no se pierde nada
        const r = rechazados(); r.push({ etiqueta: item.etiqueta, error: e.message, ts: Date.now() }); gj(K.rech, r);   // el servidor lo rechazó: se avisa, no bloquea la cola
      }
      const c = cola(); c.shift(); gj(K.cola, c); avisar();
    }
  } finally { sincronizando = false; }
  if (enviados) window.dispatchEvent(new CustomEvent('sima-sincronizado', { detail: enviados }));
  return enviados;
}
window.addEventListener('online', () => sincronizar());
setInterval(sincronizar, 20000);
setInterval(() => { if (jl(K.ses, null) && !sesion()) alCerrar(true); }, 30000);
