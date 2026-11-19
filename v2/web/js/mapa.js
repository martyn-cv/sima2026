// Mapa de planta en vivo: cada máquina es una ilustración animada con su estado y su lectura más cercana a alarma.
import { svgMaquina } from './maquinas.js';
import { mover, spark } from './kit.js';
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ESTADOS = { operando: 'Operando', alarma: 'Con alarma', detenido: 'Detenido', en_mantencion: 'En mantención' };

/** El sensor más cerca de su umbral de alarma es el que se muestra en la tarjeta. */
export function sensorClave(e) {
  let mejor = null, r = -1;
  for (const s of e.sensores) {
    if (s.valor == null) continue;
    const q = (s.valor - s.nominal) / ((s.alarma - s.nominal) || 1);
    if (q > r) { r = q; mejor = s; }
  }
  return mejor || e.sensores[0];
}
const colorSpark = (n) => (n === 'alarma' ? '#d91f26' : n === 'aviso' ? '#c98100' : '#16171a');

function tile(e) {
  const s = sensorClave(e);
  return `<button class="tile e-${e.estado}" data-id="${e.id}" aria-label="${esc(e.nombre)}, ${ESTADOS[e.estado]}">
    <span class="led" title="${ESTADOS[e.estado]}"></span><div class="arte">${svgMaquina(e.icono)}</div><b class="nom">${esc(e.nombre)}</b><span class="cod">${esc(e.codigo)} · ${esc(e.categoria)}</span>
    <span class="estado-txt">${ESTADOS[e.estado]}${e.alarmas ? ` · ${e.alarmas} alarma${e.alarmas > 1 ? 's' : ''}` : ''}</span>
    ${s ? `<span class="medida n-${s.nivel}"><i>${esc(s.nombre)}</i><span><em data-v="${s.valor ?? 0}">${(s.valor ?? 0).toLocaleString('es-CL', { maximumFractionDigits: 1 })}</em><u>${esc(s.unidad)}</u></span></span>
    <span class="mini">${spark(s.reciente, { w: 110, h: 26, color: colorSpark(s.nivel), umbral: s.alarma })}</span>` : ''}</button>`;
}

function cabecera(d) {
  const r = d.resumen || {};
  const chip = (k, n) => `<span class="cuenta c-${k}"><b data-n="${k}">${n || 0}</b>${ESTADOS[k]}</span>`;
  return `<div class="resumen-planta" role="status"><span class="vivo"><i></i>En vivo<small data-hora></small></span>${['operando', 'alarma', 'detenido', 'en_mantencion'].map((k) => chip(k, r[k])).join('')}</div>`;
}

function lineas(d) {
  const grupos = new Map();
  d.equipos.forEach((e) => { if (!grupos.has(e.linea)) grupos.set(e.linea, []); grupos.get(e.linea).push(e); });
  return [...grupos.entries()].map(([linea, es]) => {
    const flujo = linea !== 'Servicios';
    return `<section class="linea-planta ${flujo ? 'con-flujo' : ''}" data-linea="${esc(linea)}"><h3>${esc(linea)}<small>${esc(es[0].zona)}</small></h3><div class="fila-tiles">${es.map(tile).join('')}</div></section>`;
  }).join('');
}

/** El flujo solo se dibuja entre maquinas contiguas, en la misma fila visual y operando. */
function conexiones(el) {
  el.querySelectorAll('.con-flujo .fila-tiles').forEach((fila) => {
    const ts = [...fila.children];
    ts.forEach((t, i) => t.classList.toggle('conecta', i > 0 && t.classList.contains('e-operando') && ts[i - 1].classList.contains('e-operando') && Math.abs(t.offsetTop - ts[i - 1].offsetTop) < 4));
  });
}

export function pintarMapa(el, d, alAbrir) {
  el.innerHTML = cabecera(d) + `<div class="planta-suelo">${lineas(d)}</div>`;
  el.dataset.listo = '1';
  conexiones(el);
  el.onclick = (ev) => { const t = ev.target.closest('.tile'); if (t) alAbrir?.(+t.dataset.id); };
  if (!el._ro) { el._ro = new ResizeObserver(() => conexiones(el)); el._ro.observe(el); }
  hora(el, d);
}
function hora(el, d) { const h = el.querySelector('[data-hora]'); if (h) h.textContent = new Date(d.ts).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }

/** Actualiza en sitio (sin repintar) para no cortar las animaciones. */
export function actualizarMapa(el, d) {
  if (!el.dataset.listo || el.querySelectorAll('.tile').length !== d.equipos.length) return false;
  const r = d.resumen || {};
  el.querySelectorAll('[data-n]').forEach((b) => { if (+b.textContent !== (r[b.dataset.n] || 0)) { b.textContent = r[b.dataset.n] || 0; b.parentNode.classList.remove('pulso'); void b.parentNode.offsetWidth; b.parentNode.classList.add('pulso'); } });
  hora(el, d);
  d.equipos.forEach((e) => {
    const t = el.querySelector(`.tile[data-id="${e.id}"]`);
    if (!t) return;
    const antes = [...t.classList].find((c) => c.startsWith('e-'));
    if (antes !== `e-${e.estado}`) { t.classList.remove(antes); t.classList.add(`e-${e.estado}`); t.querySelector('.estado-txt').textContent = ESTADOS[e.estado]; }
    t.querySelector('.estado-txt').textContent = ESTADOS[e.estado] + (e.alarmas ? ` · ${e.alarmas} alarma${e.alarmas > 1 ? 's' : ''}` : '');
    const s = sensorClave(e), med = t.querySelector('.medida');
    if (s && med) {
      med.className = `medida n-${s.nivel}`;
      med.querySelector('i').textContent = s.nombre; med.querySelector('u').textContent = s.unidad;
      mover(med.querySelector('em'), s.valor ?? 0, 1);
      t.querySelector('.mini').innerHTML = spark(s.reciente, { w: 110, h: 26, color: colorSpark(s.nivel), umbral: s.alarma }).replace('class="linea"', 'class="linea fija"');
    }
  });
  conexiones(el);
  return true;
}
