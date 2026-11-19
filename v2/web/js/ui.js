// Componentes de interfaz reutilizables.
import { spark, num } from './kit.js';
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const clp = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CL');
export const fecha = (iso) => (iso ? new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

const I = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const ICONOS = {
  panel: I('<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>'),
  finanzas: I('<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>'),
  contratos: I('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'),
  procesos: I('<circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M9 6h4a4 4 0 0 1 4 4v5M6 9v3a4 4 0 0 0 4 4h5"/>'),
  transporte: I('<path d="M1 6h13v10H1zM14 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>'),
  planificacion: I('<rect x="3" y="4" width="18" height="17" rx="1"/><path d="M3 9h18M8 2v4M16 2v4"/>'),
  mantencion: I('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>'),
  informes: I('<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>'),
  mapa: I('<path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3z"/><path d="M9 4v13M15 7v13"/>'),
  organizacion: I('<circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><path d="M12 8v4M5 16v-2a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"/>'),
  calidad: I('<path d="M20 6L9 17l-5-5"/><circle cx="12" cy="12" r="10"/>'),
  seguridad: I('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4M12 16h.01"/>'),
  indicadores: I('<path d="M4 15a8 8 0 0 1 16 0"/><path d="M12 15l4-5"/><path d="M4 15h2M18 15h2M12 7v2"/>'),
  catalogo: I('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'),
  inventario: I('<path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>'),
  buscar: I('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
  campana: I('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>'),
  plegar: I('<path d="M15 18l-6-6 6-6"/>'), menu: I('<path d="M3 6h18M3 12h18M3 18h18"/>'),
  mas: I('<path d="M12 5v14M5 12h14"/>'), descargar: I('<path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/>'), imprimir: I('<path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M7 14h10v7H7z"/>'),
};
export const TITULOS = { mapa: 'Planta en vivo', organizacion: 'Organización', calidad: 'Calidad', seguridad: 'Seguridad', indicadores: 'Indicadores', catalogo: 'Catálogo técnico', inventario: 'Inventario', panel: 'Panel', finanzas: 'Finanzas', contratos: 'Contratos', procesos: 'Procesos', transporte: 'Transporte', planificacion: 'Planificación', mantencion: 'Mantención', informes: 'Informes' };

export function toast(msg, error = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (error ? ' error' : ''); t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.append(t); setTimeout(() => t.remove(), 4200);
}

export const chip = (txt, tono = '') => `<span class="chip ${tono}">${esc(txt)}</span>`;
export const TONO_ESTADO = { operando: 'verde', alarma: 'rojo', contenido: 'ambar', en_analisis: 'ambar', liberado: 'verde', rechazado: 'rojo', abierto: 'ambar', en_investigacion: 'ambar', cerrado: 'verde', vigente: 'verde', terminado: '', entregado: 'verde', en_ruta: 'negro', retrasado: 'rojo', programado: '', en_curso: 'negro', bloqueado: 'rojo', completado: 'verde', planificado: '', ingreso: 'verde', gasto: 'rojo',
  operativo: 'verde', en_mantencion: 'ambar', detenido: 'rojo', abierta: 'ambar', cerrada: 'verde', en_linea: 'verde', alarma: 'rojo', fuera_de_linea: 'ambar' };

export function hero({ titulo, texto, acciones = '', cifra = '' }) {
  return `<section class="hero"><div class="fila"><div><h1 class="display">${esc(titulo)}</h1><p>${esc(texto)}</p></div>
    <div class="acciones">${acciones}</div>${cifra}</div></section>`;
}
export const kpi = (k) => `<${k.ruta ? 'a href="#/' + esc(k.ruta) + '"' : 'div'} class="kpi ${k.tono === 'neutro' ? '' : k.tono}"><span class="e">${esc(k.etiqueta)}</span><b>${esc(k.valor)}</b><small>${esc(k.detalle)}</small>${k.spark && k.spark.length > 1 ? spark(k.spark, { w: 74, h: 26 }) : ''}</${k.ruta ? 'a' : 'div'}>`;
export const esqueleto = () => '<div class="contenido"><div class="esq alto"></div><div class="rejilla r4"><div class="esq medio"></div><div class="esq medio"></div><div class="esq medio"></div><div class="esq medio"></div></div><div class="esq fila"></div><div class="esq fila"></div></div>';
export const listaItems = (l) => `<div class="tarjeta"><h3>${esc(l.titulo)}</h3>${l.items.length ? l.items.map((i) => `<${i.ruta ? 'a href="#/' + esc(i.ruta) + '"' : 'div'} class="lista-it"><div class="t"><b>${esc(i.titulo)}</b><small>${esc(i.detalle)}</small></div>${i.etiqueta ? chip(i.etiqueta, i.tono === 'neutro' ? '' : i.tono) : ''}</${i.ruta ? 'a' : 'div'}>`).join('') : `<p class="vacio">${esc(l.vacio)}</p>`}</div>`;

export function donut(valor, etiqueta, detalle = '') {
  const r = 46, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, valor));
  return `<div class="donut"><svg viewBox="0 0 120 120" role="img" aria-label="${esc(etiqueta)} ${p}%"><circle cx="60" cy="60" r="${r}" fill="none" stroke="#ebecf0" stroke-width="14"/>
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="#d91f26" stroke-width="14" stroke-dasharray="${(c * p) / 100} ${c}" transform="rotate(-90 60 60)"/>
    <text x="60" y="68" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="800" font-size="28">${p}%</text></svg><div class="n">${esc(etiqueta)}</div><small>${esc(detalle)}</small></div>`;
}
export function barrasH(titulo, items, fmt = (v) => v) {
  const max = Math.max(1, ...items.map((i) => i.valor));
  return `<div class="tarjeta"><h3>${esc(titulo)}</h3>${items.length ? items.map((i) => `<div class="barra-h"><span>${esc(i.etiqueta)}</span><div class="pista"><div class="rell" style="width:${(100 * i.valor) / max}%"></div></div><span class="v">${esc(fmt(i.valor))}</span></div>`).join('') : '<p class="vacio">Sin datos.</p>'}</div>`;
}
export function graficoMensual(d) {
  const W = 900, H = 250, pad = 40, max = Math.max(1, ...d.ingresos, ...d.gastos), n = d.meses.length, ancho = (W - pad * 2) / n;
  const barra = (v, i, off, color) => { const h = ((H - pad * 2) * v) / max; return `<rect x="${pad + i * ancho + ancho * 0.12 + off}" y="${H - pad - h}" width="${ancho * 0.34}" height="${h}" fill="${color}"><title>${clp(v)}</title></rect>`; };
  const fmt = (v) => (v >= 1e6 ? (v / 1e6).toFixed(0) + ' M' : Math.round(v / 1e3) + ' mil');
  return `<div class="grafico"><div class="leyenda"><span><i style="background:#0b0b0c"></i>Ingresos</span><span><i style="background:#d91f26"></i>Gastos</span></div>
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ingresos y gastos de los últimos meses">
  ${[0, 0.5, 1].map((f) => `<line x1="${pad}" x2="${W - pad}" y1="${H - pad - (H - pad * 2) * f}" y2="${H - pad - (H - pad * 2) * f}" stroke="#e1e3e8"/><text x="${pad - 6}" y="${H - pad - (H - pad * 2) * f + 4}" text-anchor="end" font-size="11" fill="#6b6f78">${fmt(max * f)}</text>`).join('')}
  ${d.meses.map((m, i) => barra(d.ingresos[i], i, 0, '#0b0b0c') + barra(d.gastos[i], i, ancho * 0.36, '#d91f26') + `<text x="${pad + i * ancho + ancho / 2}" y="${H - 12}" text-anchor="middle" font-size="13" fill="#16171a">${m}</text>`).join('')}</svg></div>`;
}

// ---- tabla con orden, búsqueda y exportación CSV ----
export function tabla({ id, columnas, filas, vacio = 'No hay registros.', acciones }) {
  return `<div class="tabla-wrap"><table data-t="${id}"><thead><tr>${columnas.map((c, i) => `<th data-i="${i}" class="${c.num ? 'num' : ''}">${esc(c.t)}</th>`).join('')}${acciones ? '<th></th>' : ''}</tr></thead>
  <tbody>${filas.length ? filas.map((f) => `<tr data-id="${f.id ?? ''}">${columnas.map((c) => `<td class="${c.num ? 'num' : ''}" data-v="${esc(c.v ? c.v(f) : '')}">${c.h ? c.h(f) : esc(c.v(f))}</td>`).join('')}${acciones ? `<td><div class="acc">${acciones(f)}</div></td>` : ''}</tr>`).join('') : `<tr><td colspan="${columnas.length + 1}" class="vacio">${esc(vacio)}</td></tr>`}</tbody></table>
  <div class="pie-tabla"><span>${filas.length} registro${filas.length === 1 ? '' : 's'}</span></div></div>`;
}
export function activarTabla(raiz) {
  $$('th[data-i]', raiz).forEach((th) => th.addEventListener('click', () => {
    const tb = th.closest('table').tBodies[0], i = +th.dataset.i, desc = th.classList.contains('ord') && !th.classList.contains('desc');
    $$('th', th.parentNode).forEach((x) => x.classList.remove('ord', 'desc')); th.classList.add('ord'); if (desc) th.classList.add('desc');
    const val = (tr) => { const v = tr.cells[i].dataset.v, n = Number(v); return v !== '' && !isNaN(n) ? n : v.toLowerCase(); };
    [...tb.rows].sort((a, b) => (val(a) > val(b) ? 1 : -1) * (desc ? -1 : 1)).forEach((r) => tb.append(r));
  }));
}
export function filtrarFilas(tbody, q) { const t = q.toLowerCase(); $$('tr[data-id]', tbody).forEach((tr) => { tr.hidden = t && !tr.textContent.toLowerCase().includes(t); }); }
export function exportarCSV(nombre, columnas, filas) {
  const celda = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + [columnas.map((c) => celda(c.t)).join(';'), ...filas.map((f) => columnas.map((c) => celda(c.v(f))).join(';'))].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `${nombre}-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
}

// ---- formulario modal a partir de una definición de campos ----
export function campoHtml(c, v = '') {
  const base = `name="${c.n}" ${c.req ? 'required' : ''}`;
  let el;
  if (c.t === 'select') el = `<select ${base}>${c.op.map(([k, l]) => `<option value="${esc(k)}" ${String(k) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  else if (c.t === 'textarea') el = `<textarea ${base} rows="3">${esc(v)}</textarea>`;
  else if (c.t === 'checkbox') return `<label class="campo chk"><input type="checkbox" name="${c.n}" ${v ? 'checked' : ''}><span>${esc(c.l)}</span></label>`;
  else el = `<input ${base} type="${c.t || 'text'}" value="${esc(v)}" ${c.t === 'number' ? 'min="0"' : ''}>`;
  return `<label class="campo ${c.ancho === 2 ? 'ancho' : ''}"><span>${esc(c.l)}${c.req ? ' *' : ''}</span>${el}<div class="err" data-err="${c.n}"></div></label>`;
}
export function formularioModal({ titulo, campos, valores = {}, boton = 'Guardar', enviar }) {
  return new Promise((resolver) => {
    const d = document.createElement('dialog');
    d.innerHTML = `<form method="dialog"><h2 class="display">${esc(titulo)}</h2><div class="aviso-error" hidden></div><div class="dos">${campos.map((c) => campoHtml(c, valores[c.n] ?? '')).join('')}</div>
      <div class="pie-d"><button type="button" class="btn sec" data-x>Cancelar</button><button class="btn">${esc(boton)}</button></div></form>`;
    document.body.append(d); d.showModal();
    const cerrar = (v) => { d.close(); d.remove(); resolver(v); };
    $('[data-x]', d).onclick = () => cerrar(null); d.addEventListener('cancel', () => cerrar(null));
    $('form', d).onsubmit = async (e) => {
      e.preventDefault();
      const datos = {};
      campos.forEach((c) => { const el = d.querySelector(`[name="${c.n}"]`); datos[c.n] = c.t === 'checkbox' ? el.checked : el.value === '' && c.t !== 'textarea' ? (c.req ? '' : null) : el.value; });
      const btn = $('button.btn:not(.sec)', d); btn.disabled = true;
      $$('.err', d).forEach((x) => (x.textContent = '')); $('.aviso-error', d).hidden = true;
      try { const r = await enviar(datos); cerrar(r ?? true); }
      catch (err) { btn.disabled = false; const a = $('.aviso-error', d); a.textContent = err.message; a.hidden = false; Object.entries(err.campos || {}).forEach(([k, m]) => { const e = d.querySelector(`[data-err="${k}"]`); if (e) e.textContent = m; }); }
    };
  });
}
