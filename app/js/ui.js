export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const clp = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CL');
export const fecha = (iso) => (iso ? new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
export const fechaHora = (iso) => (iso ? new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const hoyIso = () => new Date().toISOString().slice(0, 10);

const I = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const ICONOS = {
  inicio: I('<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  equipos: I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  reportar: I('<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>'),
  mis_reportes: I('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  reportes: I('<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>'),
  ordenes: I('<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/>'),
  avisar: I('<path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1zM16 8a5 5 0 0 1 0 8"/>'),
  avisos: I('<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z"/>'),
  repuestos: I('<path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>'),
  planificacion: I('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>'),
  notas: I('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'),
  informes: I('<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>'),
  indicadores: I('<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>'),
  plcs: I('<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>'),
  perfil: I('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  mas: I('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
  buscar: I('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'), campana: I('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>'),
  flecha: I('<path d="M9 18l6-6-6-6"/>'), camara: I('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>'),
};
export const TITULOS = { inicio: 'Inicio', equipos: 'Equipos', reportar: 'Avisar falla', mis_reportes: 'Mis reportes', reportes: 'Reportes de falla', ordenes: 'Órdenes', avisar: 'A ingenieros', avisos: 'Avisos',
  repuestos: 'Repuestos', planificacion: 'Planificación', notas: 'Notas', informes: 'Informes', indicadores: 'Indicadores', plcs: 'PLC', perfil: 'Mi perfil', mas: 'Más' };

export function toast(msg, error = false) {
  $('.toast')?.remove();
  const t = document.createElement('div'); t.className = 'toast' + (error ? ' error' : ''); t.setAttribute('role', 'status'); t.textContent = msg; document.body.append(t); setTimeout(() => t.remove(), 4500);
}
export const chip = (t, tono = '') => `<span class="chip ${tono}">${esc(t)}</span>`;
export const TONO = { operativo: 'verde', en_mantencion: 'ambar', detenido: 'rojo', abierta: 'ambar', en_curso: 'negro', cerrada: 'verde', enviado: 'ambar', tomado: 'negro', resuelto: 'verde', en_linea: 'verde', alarma: 'rojo', fuera_de_linea: 'ambar', alta: 'rojo', media: 'ambar', baja: '' };
export const kpi = (k) => `<${k.ruta ? 'a href="#/' + esc(k.ruta) + '"' : 'div'} class="kpi ${k.tono === 'neutro' ? '' : k.tono}"><span class="e">${esc(k.etiqueta)}</span><b>${esc(k.valor)}</b><small>${esc(k.detalle)}</small></${k.ruta ? 'a' : 'div'}>`;
export const fila = ({ ruta, titulo, detalle, etiqueta, tono }) => `<${ruta ? 'a href="#/' + esc(ruta) + '"' : 'div'} class="fila-it"><div class="t"><b>${esc(titulo)}</b><small>${esc(detalle)}</small></div>${etiqueta ? chip(etiqueta, tono === 'neutro' ? '' : tono) : ''}${ruta ? ICONOS.flecha.replace('<svg', '<svg class="flecha"') : ''}</${ruta ? 'a' : 'div'}>`;
export const tarjetaLista = (titulo, items, vacio) => `<section class="tarjeta"><h2>${esc(titulo)}</h2>${items.length ? items.map(fila).join('') : `<p class="vacio">${esc(vacio || 'Sin pendientes.')}</p>`}</section>`;
export function donut(valor, etiqueta, detalle = '') {
  const r = 42, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, valor));
  return `<div class="donut"><svg viewBox="0 0 110 110" role="img" aria-label="${esc(etiqueta)} ${p}%"><circle cx="55" cy="55" r="${r}" fill="none" stroke="#ebecf0" stroke-width="13"/><circle cx="55" cy="55" r="${r}" fill="none" stroke="#d91f26" stroke-width="13" stroke-linecap="round" stroke-dasharray="${(c * p) / 100} ${c}" transform="rotate(-90 55 55)"/><text x="55" y="63" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="800" font-size="26">${p}%</text></svg><b>${esc(etiqueta)}</b><small>${esc(detalle)}</small></div>`;
}
export function barras(titulo, items, fmt = (v) => v) {
  const max = Math.max(1, ...items.map((i) => i.valor));
  return `<section class="tarjeta"><h2>${esc(titulo)}</h2>${items.length ? items.map((i) => `<div class="barra-h"><span>${esc(i.etiqueta)}</span><div class="pista"><div class="rell" style="width:${(100 * i.valor) / max}%"></div></div><span class="v">${esc(fmt(i.valor))}</span></div>`).join('') : '<p class="vacio">Sin datos.</p>'}</section>`;
}

// ---- formularios ----
export function campoHtml(c, v = '') {
  const b = `name="${c.n}" ${c.req ? 'required' : ''}`;
  if (c.t === 'checkbox') return `<label class="campo chk"><input type="checkbox" name="${c.n}" ${v ? 'checked' : ''}><span>${esc(c.l)}</span></label>`;
  if (c.t === 'tipos') return `<div class="campo"><span>${esc(c.l)}</span><div class="tipos">${c.op.map(([k, l], i) => `<label><input type="radio" name="${c.n}" value="${esc(k)}" ${(v || c.op[0][0]) === k ? 'checked' : ''}>${esc(l)}</label>`).join('')}</div></div>`;
  if (c.t === 'foto') return `<div class="campo"><span>${esc(c.l)}</span><label class="foto-zona"><input type="file" name="${c.n}" accept="image/*" capture="environment">${ICONOS.camara.replace('<svg', '<svg width="34" height="34"')}<div>Tomar o elegir una foto</div><img class="foto-prev" alt="" hidden></label></div>`;
  let el;
  if (c.t === 'select') el = `<select ${b}>${c.op.map(([k, l]) => `<option value="${esc(k)}" ${String(k) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  else if (c.t === 'textarea') el = `<textarea ${b} placeholder="${esc(c.ph || '')}">${esc(v)}</textarea>`;
  else el = `<input ${b} type="${c.t || 'text'}" value="${esc(v)}" ${c.t === 'number' ? 'min="0" step="any" inputmode="decimal"' : ''} placeholder="${esc(c.ph || '')}">`;
  return `<label class="campo"><span>${esc(c.l)}${c.req ? ' *' : ''}</span>${el}<div class="err" data-err="${c.n}"></div></label>`;
}
export async function comprimirFoto(archivo, max = 1024) {
  const url = await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(archivo); });
  const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
  const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.72);
}
export function activarFotos(form) {
  $$('input[type=file][accept^="image"]', form).forEach((inp) => inp.addEventListener('change', async () => {
    const f = inp.files[0]; if (!f) return;
    try { form._fotos = form._fotos || {}; form._fotos[inp.name] = await comprimirFoto(f); const p = inp.parentNode.querySelector('.foto-prev'); p.src = form._fotos[inp.name]; p.hidden = false; }
    catch { toast('No se pudo leer la foto. Intente con otra.', true); }
  }));
}
export function leerForm(form, campos) {
  const d = {};
  campos.forEach((c) => {
    const el = form.elements[c.n];
    if (c.t === 'checkbox') d[c.n] = el.checked;
    else if (c.t === 'foto') { if (form._fotos?.[c.n]) { d[c.n + '_b64'] = form._fotos[c.n]; d[c.n + '_nombre'] = 'foto.jpg'; } }
    else if (c.t === 'tipos') d[c.n] = form.querySelector(`[name="${c.n}"]:checked`)?.value;
    else d[c.n] = el.value === '' && !c.req && c.t !== 'textarea' ? null : el.value;
  });
  return d;
}
export function errores(form, campos, err) {
  $$('.err', form).forEach((e) => (e.textContent = ''));
  const falt = {};
  Object.entries(err.campos || {}).forEach(([k, m]) => { const e = form.querySelector(`[data-err="${k}"]`); if (e) e.textContent = m; falt[k] = 1; });
  return falt;
}
export function validarObligatorios(form, campos) {
  let ok = true;
  campos.filter((c) => c.req).forEach((c) => { const e = form.querySelector(`[data-err="${c.n}"]`); const vacio = !String(form.elements[c.n]?.value || '').trim(); if (e) e.textContent = vacio ? 'Complete este campo.' : ''; if (vacio) ok = false; });
  if (!ok) form.querySelector('.err:not(:empty)')?.closest('.campo')?.querySelector('input,select,textarea')?.focus();
  return ok;
}
export function hoja({ titulo, campos, valores = {}, boton = 'Guardar', enviar }) {
  return new Promise((resolver) => {
    const fondo = document.createElement('div'); fondo.className = 'hoja-fondo';
    fondo.innerHTML = `<form class="hoja" novalidate role="dialog" aria-label="${esc(titulo)}"><h2 class="display">${esc(titulo)}</h2><div class="aviso-error" hidden></div>${campos.map((c) => campoHtml(c, valores[c.n] ?? '')).join('')}<div class="pie"><button type="button" class="btn sec" data-x>Cancelar</button><button class="btn">${esc(boton)}</button></div></form>`;
    document.body.append(fondo);
    const f = $('form', fondo); activarFotos(f); const cerrar = (v) => { fondo.remove(); resolver(v); };
    $('[data-x]', fondo).onclick = () => cerrar(null); fondo.addEventListener('click', (e) => e.target === fondo && cerrar(null));
    f.onsubmit = async (e) => {
      e.preventDefault(); if (!validarObligatorios(f, campos)) return;
      const b = $('.btn:not(.sec)', f); b.disabled = true; $('.aviso-error', f).hidden = true;
      try { cerrar((await enviar(leerForm(f, campos))) ?? true); }
      catch (x) { b.disabled = false; const a = $('.aviso-error', f); a.textContent = x.message; a.hidden = false; errores(f, campos, x); }
    };
    f.querySelector('input:not([type=hidden]),select,textarea')?.focus();
  });
}
