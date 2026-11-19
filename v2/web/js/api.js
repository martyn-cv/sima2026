// Cliente de la API. La sesión se guarda solo en la pestaña y se cierra tras 30 min sin actividad.
const API = window.SIMA_API;
const INACTIVIDAD_MS = 30 * 60 * 1000;
let alCerrar = () => {};
export const onCerrar = (fn) => { alCerrar = fn; };

const leer = (k) => { try { return JSON.parse(sessionStorage.getItem(k)); } catch { return null; } };
export const sesion = () => {
  const s = leer('sima_web');
  if (s && Date.now() - s.ultimo > INACTIVIDAD_MS) { sessionStorage.removeItem('sima_web'); return null; }
  return s;
};
export function guardarSesion(token, usuario) { sessionStorage.setItem('sima_web', JSON.stringify({ token, usuario, ultimo: Date.now() })); }
export function cerrarSesion(porInactividad = false) { sessionStorage.removeItem('sima_web'); alCerrar(porInactividad); }
const tocar = () => { const s = leer('sima_web'); if (s) { s.ultimo = Date.now(); sessionStorage.setItem('sima_web', JSON.stringify(s)); } };
setInterval(() => { if (leer('sima_web') && !sesion()) alCerrar(true); }, 30000);

export class ErrorApi extends Error { constructor(msg, estado, campos) { super(msg); this.estado = estado; this.campos = campos || {}; } }

export async function api(ruta, { metodo = 'GET', cuerpo, params, publico } = {}) {
  const s = sesion();
  const url = new URL(API + ruta);
  Object.entries(params || {}).forEach(([k, v]) => v !== '' && v != null && url.searchParams.set(k, v));
  let r;
  try {
    r = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json', ...(s && !publico ? { Authorization: 'Bearer ' + s.token } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  } catch { throw new ErrorApi('No hay conexión con el servidor. Revise su red e intente de nuevo.', 0); }
  const datos = await r.json().catch(() => ({}));
  if (r.status === 401 && !publico) { cerrarSesion(true); throw new ErrorApi('Su sesión terminó. Ingrese de nuevo.', 401); }
  if (!r.ok) throw new ErrorApi(datos.error || 'No se pudo completar la acción.', r.status, datos.campos);
  tocar();
  return datos;
}
export const listar = async (recurso, params) => (await api(`/${recurso}/`, { params })).resultados;
