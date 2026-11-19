// Piezas de interfaz con movimiento. Todo respeta prefers-reduced-motion.
export const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FORMATOS = {
  int: (v) => Math.round(v).toLocaleString('es-CL'),
  dec1: (v) => v.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  dec2: (v) => v.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  pct: (v) => Math.round(v).toLocaleString('es-CL') + '%',
  pct1: (v) => v.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%',
  clp: (v) => '$' + Math.round(v).toLocaleString('es-CL'),
  h: (v) => v.toLocaleString('es-CL', { maximumFractionDigits: 1 }) + ' h',
};
const suave = (t) => 1 - Math.pow(1 - t, 3);

/** Anima un número hasta su valor final. */
export function contar(el, final, fmt = 'int', dur = 900) {
  const f = FORMATOS[fmt] || FORMATOS.int;
  if (reducido() || !isFinite(final)) { el.textContent = f(final); return; }
  const t0 = performance.now();
  const paso = (t) => { const p = Math.min(1, (t - t0) / dur); el.textContent = f(final * suave(p)); if (p < 1) requestAnimationFrame(paso); };
  requestAnimationFrame(paso);
}
/** Cambia un número en vivo suavemente desde su valor actual. */
export function mover(el, hasta, dec = 1, dur = 700) {
  const desde = parseFloat(el.dataset.v ?? hasta); el.dataset.v = hasta;
  const fmt = (v) => v.toLocaleString('es-CL', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  if (reducido() || desde === hasta) { el.textContent = fmt(hasta); return; }
  const t0 = performance.now();
  const paso = (t) => { const p = Math.min(1, (t - t0) / dur); el.textContent = fmt(desde + (hasta - desde) * suave(p)); if (p < 1) requestAnimationFrame(paso); };
  requestAnimationFrame(paso);
}
/** Activa en una vista recién pintada: números que cuentan y anillos que se llenan. */
export function activar(raiz) {
  raiz.querySelectorAll('[data-contar]').forEach((el) => contar(el, parseFloat(el.dataset.contar), el.dataset.fmt || 'int'));
  requestAnimationFrame(() => requestAnimationFrame(() => raiz.querySelectorAll('.anillo .arco[data-p]').forEach((c) => { c.style.strokeDasharray = c.dataset.p; })));
}
/** Número que luego cuenta: pinta el valor final (accesible, sin JS) y data-contar lo anima. */
export const num = (valor, fmt = 'int') => `<span data-contar="${valor}" data-fmt="${fmt}">${(FORMATOS[fmt] || FORMATOS.int)(valor)}</span>`;

/** Gráfico pequeño de línea que se dibuja. */
export function spark(valores, { w = 120, h = 34, color = 'currentColor', umbral = null, min = null, max = null } = {}) {
  const v = (valores || []).filter((x) => x != null);
  if (v.length < 2) return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"></svg>`;
  const lo = min ?? Math.min(...v), hi = max ?? Math.max(...v), rg = hi - lo || 1, pad = 3;
  const pt = (x, i) => [pad + (i * (w - pad * 2)) / (v.length - 1), h - pad - ((x - lo) / rg) * (h - pad * 2)];
  const ps = v.map(pt), d = ps.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  const area = `${d}L${ps[ps.length - 1][0].toFixed(1)} ${h}L${ps[0][0].toFixed(1)} ${h}Z`;
  const ult = ps[ps.length - 1];
  let u = '';
  if (umbral != null && umbral >= lo && umbral <= hi) { const y = h - pad - ((umbral - lo) / rg) * (h - pad * 2); u = `<line class="u" x1="0" x2="${w}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" style="color:${color}" aria-hidden="true">${u}<path class="area" d="${area}"/><path class="linea" pathLength="1" d="${d}"/><circle class="pto" cx="${ult[0].toFixed(1)}" cy="${ult[1].toFixed(1)}" r="2.6"/></svg>`;
}

/** Anillo (donut) que se llena al aparecer. */
export function anillo(valor, etiqueta, detalle = '', tono = '') {
  const r = 42, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, valor));
  return `<div class="anillo ${tono}"><svg viewBox="0 0 110 110" role="img" aria-label="${esc(etiqueta)} ${Math.round(p)}%"><circle class="pista" cx="55" cy="55" r="${r}"/>
    <circle class="arco" cx="55" cy="55" r="${r}" data-p="${(c * p) / 100} ${c}" style="stroke-dasharray:0 ${c}" transform="rotate(-90 55 55)"/><text x="55" y="64" text-anchor="middle">${Math.round(p)}%</text></svg><b>${esc(etiqueta)}</b><small>${esc(detalle)}</small></div>`;
}

/** Medidor semicircular con zonas de aviso y alarma y una aguja que se mueve. */
export function medidor(s) {
  const R = 46, cx = 60, cy = 58, rango = (s.escala_max - s.escala_min) || 1;
  const ang = (v) => -90 + 180 * Math.max(0, Math.min(1, (v - s.escala_min) / rango));      // -90°..90°
  const pt = (a, r) => [cx + r * Math.sin((a * Math.PI) / 180), cy - r * Math.cos((a * Math.PI) / 180)];
  const arco = (v0, v1, cls) => { const [x0, y0] = pt(ang(v0), R), [x1, y1] = pt(ang(v1), R); return `<path class="z ${cls}" d="M${x0.toFixed(1)} ${y0.toFixed(1)}A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}"/>`; };
  const v = s.valor ?? s.escala_min;
  return `<div class="medidor n-${s.nivel}" data-sensor="${s.id}"><svg viewBox="0 0 120 72" role="img" aria-label="${esc(s.nombre)}: ${v} ${esc(s.unidad)}">
    ${arco(s.escala_min, s.aviso, 'ok')}${arco(s.aviso, s.alarma, 'av')}${arco(s.alarma, s.escala_max, 'al')}
    <g class="aguja" style="transform:rotate(${ang(v).toFixed(1)}deg)"><path d="M${cx} ${cy}L${cx} ${cy - R + 6}"/><circle cx="${cx}" cy="${cy}" r="4"/></g></svg>
    <div class="lect"><em data-v="${v}">${v.toLocaleString('es-CL', { maximumFractionDigits: 1 })}</em> <u>${esc(s.unidad)}</u></div><small>${esc(s.nombre)}</small></div>`;
}
export function actualizarMedidor(el, s) {
  const rango = (s.escala_max - s.escala_min) || 1, v = s.valor ?? s.escala_min;
  const a = -90 + 180 * Math.max(0, Math.min(1, (v - s.escala_min) / rango));
  el.className = `medidor n-${s.nivel}`;
  el.querySelector('.aguja').style.transform = `rotate(${a.toFixed(1)}deg)`;
  mover(el.querySelector('em'), v, 1);
}

/** Gráfico de líneas con umbrales (serie del monitor). */
export function grafico(serie, { w = 640, h = 190 } = {}) {
  const pts = serie.puntos;
  if (pts.length < 2) return '<p class="vacio">Aún no hay lecturas.</p>';
  const vs = pts.map((p) => p.v), lo = Math.min(serie.escala_min, ...vs), hi = Math.max(serie.alarma * 1.04, ...vs), rg = hi - lo || 1, ml = 38, mb = 22, mt = 8;
  const X = (i) => ml + (i * (w - ml - 8)) / (pts.length - 1), Y = (v) => mt + (1 - (v - lo) / rg) * (h - mt - mb);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join('');
  const lin = (v, cls, t) => `<line class="u ${cls}" x1="${ml}" x2="${w - 8}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="et ${cls}" x="${w - 10}" y="${(Y(v) - 4).toFixed(1)}" text-anchor="end">${t}</text>`;
  const hora = (p) => new Date(p.t).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  return `<svg class="grafico" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(serie.nombre)}"><rect class="zona-al" x="${ml}" y="${mt}" width="${w - ml - 8}" height="${Math.max(0, Y(serie.alarma) - mt).toFixed(1)}"/>
    ${lin(serie.aviso, 'av', 'aviso')}${lin(serie.alarma, 'al', 'alarma')}<path class="area" d="${d}L${X(pts.length - 1)} ${h - mb}L${ml} ${h - mb}Z"/><path class="linea" pathLength="1" d="${d}"/>
    <text class="eje" x="${ml - 6}" y="${(Y(hi) + 12).toFixed(1)}" text-anchor="end">${hi.toFixed(0)}</text><text class="eje" x="${ml - 6}" y="${h - mb}" text-anchor="end">${lo.toFixed(0)}</text>
    <text class="eje" x="${ml}" y="${h - 4}">${hora(pts[0])}</text><text class="eje" x="${w - 8}" y="${h - 4}" text-anchor="end">${hora(pts[pts.length - 1])}</text></svg>`;
}

/** Barras de ingresos/gastos que crecen. */
export function barrasMensual(d, fmt) {
  const W = 900, H = 250, pad = 40, max = Math.max(1, ...d.ingresos, ...d.gastos), n = d.meses.length, an = (W - pad * 2) / n;
  const bar = (v, i, off, cls, k) => { const h = ((H - pad * 2) * v) / max; return `<rect class="bar ${cls}" style="--d:${k * 60}ms" x="${pad + i * an + an * 0.12 + off}" y="${H - pad - h}" width="${an * 0.34}" height="${h}"><title>${fmt(v)}</title></rect>`; };
  const corto = (v) => (v >= 1e6 ? (v / 1e6).toFixed(0) + ' M' : Math.round(v / 1e3) + ' mil');
  return `<div class="leyenda"><span><i class="ing"></i>Ingresos</span><span><i class="gas"></i>Gastos</span></div><svg class="barras" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ingresos y gastos">
  ${[0, 0.5, 1].map((f) => `<line class="u" x1="${pad}" x2="${W - pad}" y1="${H - pad - (H - pad * 2) * f}" y2="${H - pad - (H - pad * 2) * f}"/><text class="eje" x="${pad - 6}" y="${H - pad - (H - pad * 2) * f + 4}" text-anchor="end">${corto(max * f)}</text>`).join('')}
  ${d.meses.map((m, i) => bar(d.ingresos[i], i, 0, 'ing', i) + bar(d.gastos[i], i, an * 0.36, 'gas', i) + `<text class="mes" x="${pad + i * an + an / 2}" y="${H - 12}" text-anchor="middle">${m}</text>`).join('')}</svg>`;
}
