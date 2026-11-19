import { api, obtener, lista, sesion, guardarSesion, actualizarUsuario, cerrarSesion, onCerrar, enviarConCola, sincronizar, cola, rechazados, descartarRechazados, pendientesDe, sinRed, ORIGEN_API } from './api.js';
import { $, $$, esc, clp, fecha, fechaHora, hoyIso, ICONOS, TITULOS, TONO, chip, kpi, fila, tarjetaLista, barras, esqueleto, campoHtml, activarFotos, leerForm, errores, validarObligatorios, hoja, toast } from './ui.js';
import { activar, anillo, contar, num, medidor, actualizarMedidor, grafico, spark, reducido } from './kit.js';
import { svgMaquina } from './maquinas.js';
import { pintarMapa, actualizarMapa } from './mapa.js';

let U = null;
const raiz = $('#raiz');
const permiso = (r, a) => U.permisos[r]?.[a];
const accesibles = () => [...U.menu, ...U.extras, 'inicio'];
const mediaUrl = (p) => (p ? `${ORIGEN_API}${p}?t=${encodeURIComponent(sesion()?.token || '')}` : '');
const corto = (n) => (n || '').split('·')[0].trim();
const iniciales = (n) => corto(n).split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
const aviso = (viejo, ts) => (viejo ? `<p class="dato-viejo">Sin conexión · datos guardados el ${fechaHora(new Date(ts || Date.now()).toISOString())}</p>` : '');
const titulo = (t, sub = '') => `<div><h1 class="display titulo-pagina">${esc(t)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div>`;
const pestanas = (opts, activa) => `<div class="pestanas" role="tablist">${opts.map(([k, l]) => `<button role="tab" data-p="${k}" class="${k === activa ? 'on' : ''}" aria-selected="${k === activa}">${esc(l)}</button>`).join('')}</div>`;
const volver = (a, t) => `<a href="#/${a}" class="btn sec chico" style="align-self:flex-start">← ${esc(t)}</a>`;
const ahoraIso = () => new Date().toISOString();

// ---- sondeo en vivo (se detiene al cambiar de pantalla) ----
let sondeo = null;
const detener = () => { clearInterval(sondeo); sondeo = null; };
function sondear(fn, ms) { detener(); fn().catch(() => {}); sondeo = setInterval(() => { if (!document.hidden && navigator.onLine) fn().catch(() => {}); }, ms); }
const resumenPlanta = () => api('/telemetria/resumen/');

// ------------------------------------------------------------------ acceso
const DEMO = [['operador', 'Operador', 'Operador2026'], ['supervisor.turno', 'Supervisor de turno', 'Supervisor2026'], ['tecnico', 'Técnico', 'Tecnico2026'], ['supervisor.mantenimiento', 'Supervisor de mantenimiento', 'Supervmant2026'],
  ['jefe.mantenimiento', 'Jefa de mantenimiento', 'Jefemant2026'], ['confiabilidad', 'Confiabilidad', 'Confiabilidad2026'], ['automatizacion', 'Automatización', 'Automatizacion2026'],
  ['instrumentacion', 'Instrumentación', 'Instrumentacion2026'], ['panol', 'Pañol', 'Panol2026'], ['calidad', 'Calidad', 'Calidad2026'], ['prevencion', 'Prevención', 'Prevencion2026']];
function pantallaAcceso(mensaje = '') {
  raiz.innerHTML = `<div class="acceso"><div class="maquinas-fondo e-operando">${svgMaquina('inyectora')}</div><div class="cab"><div class="marca"><i></i>SIMA</div><h1 class="display">Mantención en terreno</h1><p>Fallas, órdenes de trabajo, rutinas y herramientas, aun sin señal. Para finanzas, contratos y procesos use la web.</p></div>
  <form id="f" novalidate><h2 class="display">Ingresar</h2><div class="aviso-error" id="err" ${mensaje ? '' : 'hidden'}>${esc(mensaje)}</div>
    <label class="campo"><span>Correo corporativo</span><input name="email" type="email" autocomplete="username" required placeholder="usuario@manuandina.cl"></label>
    <label class="campo"><span>Contraseña</span><input name="password" type="password" autocomplete="current-password" required></label>
    <button class="btn bloque">Ingresar</button><div class="demo">Cuentas de demostración:<br>${DEMO.map(([e, n]) => `<button type="button" data-e="${e}">${n}</button>`).join(' · ')}</div></form></div>`;
  const f = $('#f');
  $$('.demo button').forEach((b) => (b.onclick = () => { const d = DEMO.find((x) => x[0] === b.dataset.e); f.email.value = d[0] + '@manuandina.cl'; f.password.value = d[2]; }));
  f.onsubmit = async (e) => {
    e.preventDefault(); const err = $('#err'); err.hidden = true;
    try { const r = await api('/login/', { metodo: 'POST', publico: true, cuerpo: { email: f.email.value, password: f.password.value, canal: 'app' } }); guardarSesion(r.token, r.usuario); U = r.usuario; arrancar(); }
    catch (x) { err.textContent = x.message; err.hidden = false; err.style.animation = 'none'; void err.offsetWidth; err.style.animation = ''; }
  };
}

// ------------------------------------------------------------------ estructura
function estructura() {
  const link = (m, extra = '') => `<a href="#/${m}" data-r="${m}" class="${extra}">${ICONOS[m] || ICONOS.mas}<span>${TITULOS[m] || m}</span></a>`;
  raiz.innerHTML = `<div class="app"><header class="cab-app"><div class="fila"><button class="avatar" id="av" aria-label="Mi perfil">${esc(iniciales(U.nombre))}</button>
    <div class="quien"><b>${esc(corto(U.nombre))}</b><small>${esc(U.cargo?.nombre || U.rol_nombre)}</small></div>
    <button class="campana" id="campana" aria-label="Notificaciones">${ICONOS.campana}<span class="n" id="nn" ${U.no_leidas ? '' : 'hidden'}>${U.no_leidas}</span></button></div>
    <div class="busca" role="search">${ICONOS.buscar}<input id="q" type="search" autocomplete="off" placeholder="Buscar equipos, órdenes, repuestos, fichas…" aria-label="Buscar"><div class="res-busca" id="res"></div></div></header>
    <div class="estado-red" id="red" role="status"></div><a class="banner-alarma" id="banner" href="#/mapa" role="alert"><i></i><span></span></a><main id="vista" tabindex="-1"></main>
    <nav class="nav-inf" aria-label="Menú principal"><span class="ind" id="ind"></span>${U.menu.map((m) => link(m)).join('')}${U.extras.length ? `<a href="#/mas" data-r="mas" class="solo-movil">${ICONOS.mas}<span>Más</span></a><span class="nav-lat-extra">Más</span>${U.extras.map((m) => link(m, 'solo-desk')).join('')}` : ''}</nav></div>`;
  $('#av').onclick = () => (location.hash = '#/perfil'); $('#campana').onclick = notificaciones;
  buscador(); estadoRed(); window.addEventListener('resize', moverIndicador);
}
function moverIndicador() {
  const nav = $('.nav-inf'), ind = $('#ind'), a = $$('.nav-inf a.activo').find((x) => x.offsetParent !== null);
  if (!a || !nav || a.offsetParent === null) { ind?.style.setProperty('--iw', '0px'); return; }
  const n = nav.getBoundingClientRect(), r = a.getBoundingClientRect();
  ind.style.setProperty('--ix', `${r.left - n.left + nav.scrollLeft}px`); ind.style.setProperty('--iy', `${r.top - n.top + nav.scrollTop}px`);
  ind.style.setProperty('--iw', `${r.width}px`); ind.style.setProperty('--ih', `${r.height}px`);
}
function estadoRed() {
  const r = $('#red'); if (!r) return;
  const n = cola().length;
  if (!navigator.onLine) { r.className = 'estado-red visible'; r.textContent = `Sin conexión${n ? ` · ${n} registro(s) esperando para enviarse` : ''}. Puede seguir registrando.`; }
  else if (n) { r.className = 'estado-red visible'; r.textContent = `Enviando ${n} registro(s) pendiente(s)…`; }
  else r.className = 'estado-red';
}
window.addEventListener('online', estadoRed); window.addEventListener('offline', estadoRed); window.addEventListener('sima-cola', estadoRed);
window.addEventListener('sima-sincronizado', (e) => { toast(`${e.detail} registro(s) enviado(s) al servidor.`); if (/ordenes|reportes|avisos|mis_reportes|rutinas|traspaso|seguridad/.test(location.hash)) ruta(); });

// sondeo global: campana y banner de alarmas
let noLeidas = 0;
async function sondeoGlobal() {
  if (!U || document.hidden || !navigator.onLine) return;
  try {
    const [me, pl] = await Promise.all([api('/me/'), resumenPlanta()]);
    const nn = $('#nn'); if (!nn) return;
    if (me.no_leidas > noLeidas) { const c = $('#campana'); c.classList.remove('suena'); void c.offsetWidth; c.classList.add('suena'); }
    noLeidas = me.no_leidas; nn.textContent = me.no_leidas; nn.hidden = !me.no_leidas;
    const al = pl.equipos.filter((e) => e.estado === 'alarma'), b = $('#banner');
    b.classList.toggle('visible', al.length > 0);
    if (al.length) b.querySelector('span').textContent = `${al.length === 1 ? 'Alarma en' : al.length + ' equipos con alarma:'} ${al.map((e) => e.nombre).slice(0, 3).join(', ')}`;
  } catch { /* sin señal: se reintenta */ }
}
setInterval(sondeoGlobal, 8000);

function appRuta(r) {
  const base = r.split('/')[0];
  if (accesibles().includes(base)) return r;
  if (base === 'reportes' && U.menu.includes('mis_reportes')) return 'mis_reportes';
  return accesibles().includes('equipos') ? 'equipos' : 'inicio';
}
function buscador() {
  const q = $('#q'), res = $('#res'); let t;
  q.addEventListener('input', () => { clearTimeout(t); const v = q.value.trim(); if (v.length < 2) { res.classList.remove('abierto'); return; }
    t = setTimeout(async () => { try { const items = (await api('/buscar/', { params: { q: v } })).resultados; let g = '';
      res.innerHTML = items.length ? items.map((x) => { const c = g !== x.tipo ? `<div class="grupo">${esc(x.tipo)}</div>` : ''; g = x.tipo; return `${c}<a href="#/${esc(appRuta(x.ruta))}"><b>${esc(x.titulo)}</b><small>${esc(x.detalle)}</small></a>`; }).join('') : `<p class="vacio" style="padding:18px">No hay resultados para “${esc(v)}”. Pruebe con otra palabra.</p>`;
      res.classList.add('abierto'); } catch (e) { toast(sinRed(e) ? 'Sin conexión: la búsqueda necesita señal.' : e.message, true); } }, 250); });
  res.addEventListener('click', () => { res.classList.remove('abierto'); q.value = ''; });
  document.addEventListener('click', (e) => { if (!e.target.closest('.busca')) res.classList.remove('abierto'); });
  q.addEventListener('keydown', (e) => { if (e.key === 'Escape') { res.classList.remove('abierto'); q.blur(); } if (e.key === 'Enter') res.querySelector('a')?.click(); });
}
async function notificaciones() {
  const fondo = document.createElement('div'); fondo.className = 'hoja-fondo'; document.body.append(fondo);
  fondo.innerHTML = `<div class="hoja"><h2 class="display">Notificaciones</h2>${esqueleto()}</div>`;
  fondo.onclick = (e) => e.target === fondo && fondo.remove();
  try {
    const ns = (await api('/notificaciones/')).resultados;
    fondo.firstChild.innerHTML = `<h2 class="display">Notificaciones</h2><div class="tarjeta">${ns.length ? ns.slice(0, 30).map((n) => `<a class="fila-it" href="#/${esc(appRuta(n.destino || 'inicio'))}" style="${n.leida ? 'opacity:.6' : ''}"><div class="t"><b>${esc(n.texto)}</b><small>${fechaHora(n.creada)}</small></div>${n.leida ? '' : chip(n.nivel === 'alarma' ? 'Alarma' : 'Nueva', n.nivel === 'alarma' ? 'rojo' : 'ambar')}</a>`).join('') : '<p class="vacio">No tiene notificaciones.</p>'}</div><div class="pie"><button class="btn" id="cer">Cerrar</button></div>`;
    $('#cer', fondo).onclick = () => fondo.remove(); fondo.addEventListener('click', (e) => e.target.closest('a') && fondo.remove());
    if (ns.some((n) => !n.leida)) { await api('/notificaciones/leer/', { metodo: 'POST' }); $('#nn').hidden = true; noLeidas = 0; }
  } catch (e) { fondo.firstChild.innerHTML = `<h2 class="display">Notificaciones</h2><div class="aviso-error">${esc(sinRed(e) ? 'Sin conexión: no se pueden ver las notificaciones.' : e.message)}</div>`; }
}

// ------------------------------------------------------------------ inicio
async function sInicio(el) {
  const [{ datos: d }, pl] = await Promise.all([obtener('/dashboard/'), resumenPlanta().catch(() => null)]);
  const [k1, ...resto] = d.kpis;
  const h = new Date().getHours(), P = d.planta, tot = P.operando + P.alarma + P.detenido + P.en_mantencion;
  const pct = tot ? Math.round((100 * P.operando) / tot) : 0;
  el.innerHTML = `<section class="tarjeta-roja"><div class="sup"><span>${esc(U.rol_nombre)} · ${esc(U.turno_nombre)}</span><span>${new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
    <h1 class="display">${h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'}, ${esc(corto(U.nombre).split(' ')[0])}</h1>
    <div><div class="cifra">${/^\d+$/.test(String(k1.valor)) ? num(+k1.valor) : esc(k1.valor)}</div><div class="lab">${esc(k1.etiqueta)}${k1.detalle ? ' · ' + esc(k1.detalle) : ''}</div></div>
    <a href="#/mapa" class="anillo-planta" aria-label="Equipos operando ${pct}%">${anillo(pct, 'Planta', 'operando')}</a></section>
    <div class="acciones-rapidas">${(d.acciones || []).filter(([r]) => accesibles().includes(r)).map(([r, t], i) => `<a class="btn ${i ? 'sec' : ''}" href="#/${r}">${esc(t)}</a>`).join('')}</div>
    <div class="mini-kpis">${resto.map(kpi).join('')}</div>
    <a class="tarjeta" href="#/mapa" style="text-decoration:none;color:inherit;display:flex;gap:14px;align-items:center;justify-content:space-between"><div><b>Planta ahora</b><div class="resumen-planta" style="margin:8px 0 0">${[['operando', P.operando, 'Operando'], ['alarma', P.alarma, 'Con alarma'], ['detenido', P.detenido, 'Detenidos'], ['en_mantencion', P.en_mantencion, 'En mantención']].map(([k, n, t]) => `<span class="cuenta c-${k}"><b>${n}</b>${t}</span>`).join('')}</div></div>${ICONOS.flecha.replace('<svg', '<svg class="flecha" width="22" height="22"')}</a>
    <div class="dos-col">${d.listas.map((l) => tarjetaLista(l.titulo, l.items.map((i) => ({ ruta: i.ruta && accesibles().includes(i.ruta.split('/')[0]) ? i.ruta : '', titulo: i.titulo, detalle: i.detalle, etiqueta: i.etiqueta, tono: i.tono })), l.vacio)).join('')}</div>`;
  activar(el);
}

// ------------------------------------------------------------------ planta, equipos y monitor
async function sMapa(el) {
  el.innerHTML = titulo('Planta en vivo', 'Cada máquina muestra su estado y la lectura más cercana a alarma. Toque una para ver el detalle.') + '<div id="planta"><div class="esq alto"></div></div>';
  const cont = $('#planta', el);
  sondear(async () => { const d = await resumenPlanta(); if (!actualizarMapa(cont, d)) pintarMapa(cont, d, (id) => (location.hash = `#/equipos/${id}`)); }, 3000);
}
const selectEquipo = (filas) => ({ n: 'equipo', l: 'Máquina', t: 'select', req: 1, op: [['', 'Elija la máquina'], ...filas.map((e) => [e.id, `${e.nombre_habitual} · ${e.ubicacion}`])] });
function filtroLocal(el, selector) { const inp = $('#filtro', el); if (inp) inp.oninput = () => { const t = inp.value.toLowerCase(); $$(selector, el).forEach((r) => (r.hidden = t && !r.textContent.toLowerCase().includes(t))); }; }
const entradaFiltro = (ph) => `<div class="busca"><input id="filtro" type="search" placeholder="${esc(ph)}" aria-label="${esc(ph)}">${ICONOS.buscar}</div>`;

async function sEquipos(el) {
  const { filas, viejo } = await lista('equipos');
  el.innerHTML = titulo('Equipos', 'Toque una máquina para ver su historial, su ficha técnica y sus lecturas.') + entradaFiltro('Filtrar por nombre, zona o tipo') + aviso(viejo) +
    `<section class="tarjeta" id="lista">${filas.map((e) => `<a class="fila-it" href="#/equipos/${e.id}"><div class="e-${e.estado}" style="width:64px;flex:none">${svgMaquina(e.icono)}</div><div class="t"><b>${esc(e.nombre_habitual)}</b><small>${esc(e.zona)} · ${esc(e.codigo)} · ${esc(e.categoria)}</small></div>${chip(e.estado_display, TONO[e.estado])}</a>`).join('')}</section>`;
  filtroLocal(el, '.fila-it');
}
const tonoAnillo = (v) => (v >= 75 ? 'verde' : v >= 60 ? 'ambar' : 'rojo');
async function sEquipo(el, id) {
  const { datos: e, viejo, ts } = await obtener(`/equipos/${id}/`);
  const f = e.ficha, hist = e.historial;
  el.innerHTML = `${volver('equipos', 'Equipos')}
    <section class="tarjeta ficha-cab e-${e.estado}"><div>${svgMaquina(f.icono)}</div><div><h1 class="display" style="font-size:34px;margin:0">${esc(e.nombre_habitual)}</h1><div class="sub">${esc(e.zona)} · ${esc(e.codigo)}</div><div style="margin-top:8px">${chip(e.estado_display, TONO[e.estado])} ${chip('Criticidad ' + e.criticidad_display.toLowerCase(), TONO[e.criticidad])}</div></div></section>${aviso(viejo, ts)}
    ${e.alarmas_activas.length ? e.alarmas_activas.map((a) => `<div class="alerta">${esc(a.mensaje)}</div>`).join('') : ''}
    ${e.sensores.length ? `<section class="tarjeta"><h2>Lecturas en vivo</h2><div class="medidores" id="medidores">${e.sensores.map(medidor).join('')}</div></section>` : ''}
    <div class="acciones-rapidas">${e.manual ? `<a class="btn negro" href="${esc(mediaUrl(e.manual))}" target="_blank" rel="noopener">Manual</a>` : '<span class="chip" style="align-self:center;padding:14px">Sin manual disponible</span>'}
      ${permiso('reportes', 'crear') ? `<a class="btn" href="#/reportar?equipo=${e.id}">Avisar falla</a>` : ''}${accesibles().includes('avisar') ? `<a class="btn sec" href="#/avisar?equipo=${e.id}">Avisar a ingenieros</a>` : ''}
      ${accesibles().includes('monitor') ? `<a class="btn sec" href="#/monitor/${e.id}">Ver tendencia</a>` : ''}${e.manual || !permiso('notas', 'crear') ? '' : '<button class="btn sec" id="man">Cargar manual</button>'}</div>
    ${e.oee ? `<section class="tarjeta"><h2>Rendimiento de los últimos 14 días</h2><div class="anillos">${anillo(e.oee.oee, 'OEE', 'preliminar', tonoAnillo(e.oee.oee))}${anillo(e.oee.disponibilidad, 'Disponibilidad', 'tiempo operando', tonoAnillo(e.oee.disponibilidad))}${anillo(e.oee.rendimiento, 'Rendimiento', 'vs. ritmo ideal', tonoAnillo(e.oee.rendimiento))}${anillo(e.oee.calidad, 'Calidad', 'piezas buenas', tonoAnillo(e.oee.calidad))}</div></section>` : ''}
    <section class="tarjeta"><h2>Ficha técnica · ${esc(f.nombre)}</h2><div class="dato"><span>Función</span><b>${esc(f.funcion)}</b></div><div class="dato"><span>Especificaciones</span><b>${esc(f.especificaciones)}</b></div>
      <p><b>Fallas frecuentes</b></p><div class="chips-f">${f.fallas.map((x) => `<span class="chip rojo">${esc(x)}</span>`).join('')}</div>
      <p><b>Piezas</b></p><div class="chips-f">${f.piezas.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div>
      <p><b>Herramientas de mantenimiento</b></p><div class="chips-f">${f.herramientas.map((x) => `<span class="chip negro">${esc(x)}</span>`).join('')}</div></section>
    ${hist ? `<section class="tarjeta"><h2>Últimas 5 intervenciones</h2>${hist.length ? hist.map((o) => `<a class="fila-it" href="#/ordenes/${o.id}" style="align-items:flex-start"><div class="t"><b>${fecha(o.fecha)} · ${esc(o.falla)}</b><small>Acción: ${esc(o.accion || 'sin registros')}</small><small>Repuestos: ${esc(o.repuestos.join(', ') || 'ninguno')}</small></div>${chip(o.estado_display, TONO[o.estado])}</a>`).join('') : '<p class="vacio">Sin historial registrado</p>'}</section>` : ''}
    ${e.notas?.length ? tarjetaLista('Notas del equipo', e.notas.map((n) => ({ titulo: n.titulo, detalle: n.texto.slice(0, 120), etiqueta: '' }))) : ''}
    ${e.plcs?.length ? tarjetaLista('PLC de este equipo', e.plcs.map((p) => ({ ruta: accesibles().includes('plcs') ? `plcs/${p.id}` : '', titulo: p.nombre, detalle: `${p.marca} ${p.modelo}`, etiqueta: p.estado_display, tono: TONO[p.estado] }))) : ''}`;
  activar(el);
  if (e.sensores.length) sondear(async () => { const d = await resumenPlanta(); const eq = d.equipos.find((x) => x.id === e.id); if (!eq) return; eq.sensores.forEach((s) => { const m = $(`.medidor[data-sensor="${s.id}"]`, el); if (m) actualizarMedidor(m, s); }); const t = $('.ficha-cab', el); if (t) t.className = t.className.replace(/e-\w+/, `e-${eq.estado}`); }, 3000);
  $('#man', el)?.addEventListener('click', () => {
    const inp = Object.assign(document.createElement('input'), { type: 'file', accept: '.pdf,.doc,.docx' });
    inp.onchange = () => { const fl = inp.files[0]; if (!fl) return; const r = new FileReader(); r.onload = async () => { try { await api(`/equipos/${id}/manual/`, { metodo: 'POST', cuerpo: { archivo_b64: r.result, archivo_nombre: fl.name } }); toast('Manual cargado.'); ruta(); } catch (x) { toast(x.message, true); } }; r.readAsDataURL(fl); };
    inp.click();
  });
}
async function sMonitor(el, id) {
  if (!id) {
    const d = await resumenPlanta();
    el.innerHTML = titulo('Monitor en vivo', 'Elija un equipo para ver sus lecturas y su tendencia.') + `<section class="tarjeta">${d.equipos.map((e) => `<a class="fila-it" href="#/monitor/${e.id}"><div class="e-${e.estado}" style="width:64px;flex:none">${svgMaquina(e.icono)}</div><div class="t"><b>${esc(e.nombre)}</b><small>${esc(e.zona)} · ${e.sensores.length} variables</small></div>${chip(e.estado_display, TONO[e.estado])}</a>`).join('')}</section>`;
    return;
  }
  const pl = await resumenPlanta(), e = pl.equipos.find((x) => x.id === +id);
  if (!e) throw new Error('No se encontró el equipo.');
  el.innerHTML = `${volver('monitor', 'Monitor')}${titulo(e.nombre, `${e.zona} · ${e.codigo}`)}<section class="tarjeta"><div class="medidores" id="medidores">${e.sensores.map(medidor).join('')}</div></section>
    <section class="tarjeta"><h2>Tendencia · últimos 15 minutos</h2><div id="series"><div class="esq alto"></div></div></section><section class="tarjeta"><h2>Alarmas del equipo</h2><div id="alarmas"></div></section>`;
  const series = async () => { const s = await api(`/telemetria/${id}/serie/`, { params: { minutos: 15 } }); $('#series', el).innerHTML = s.series.map((x) => `<p style="margin:12px 0 2px"><b>${esc(x.nombre)}</b> <span class="sub">(${esc(x.unidad)})</span></p>${grafico(x)}`).join(''); };
  const alarmas = async () => { const a = (await api('/alarmas/', { params: { equipo: id, limite: 8 } })).resultados; $('#alarmas', el).innerHTML = a.length ? a.map((x) => `<div class="fila-it"><div class="t"><b>${esc(x.mensaje)}</b><small>${fechaHora(x.inicio)}${x.fin ? ' → ' + fechaHora(x.fin) : ' · activa'}${x.reconocida_por_nombre ? ' · reconocida por ' + esc(corto(x.reconocida_por_nombre)) : ''}</small></div>${chip(x.nivel_display, x.nivel === 'alarma' ? 'rojo' : 'ambar')}${x.activa && !x.reconocida_por ? `<button class="btn chico" data-rec="${x.id}">Reconocer</button>` : ''}</div>`).join('') : '<p class="vacio">Sin alarmas registradas.</p>'; };
  await Promise.all([series(), alarmas()]);
  el.addEventListener('click', async (ev) => { const b = ev.target.closest('[data-rec]'); if (!b) return; try { await api(`/alarmas/${b.dataset.rec}/reconocer/`, { metodo: 'POST' }); toast('Alarma reconocida.'); alarmas(); } catch (x) { toast(x.message, true); } });
  let n = 0;
  sondear(async () => { const d = await resumenPlanta(); const eq = d.equipos.find((x) => x.id === +id); eq?.sensores.forEach((s) => { const m = $(`.medidor[data-sensor="${s.id}"]`, el); if (m) actualizarMedidor(m, s); }); if (++n % 5 === 0) { await series(); await alarmas(); } }, 3000);
}

// ------------------------------------------------------------------ fallas, órdenes y bitácora
async function sReportar(el, _, q) {
  const { filas } = await lista('equipos');
  const campos = [selectEquipo(filas), { n: 'descripcion', l: '¿Qué le pasa a la máquina?', t: 'textarea', req: 1, ph: 'Cuente brevemente qué está pasando' }, { n: 'foto', l: 'Foto de la placa o de la falla', t: 'foto' }, { n: 'detiene_linea', l: 'Detiene la línea de producción', t: 'checkbox' }];
  el.innerHTML = titulo('Avisar una falla', 'Elija la máquina por su nombre habitual. La foto es opcional.') + `<form class="tarjeta" id="f" novalidate>${campos.map((c) => campoHtml(c, c.n === 'equipo' ? q.get('equipo') || '' : '')).join('')}<div id="sugeridas"></div><div class="aviso-error" hidden></div><button class="btn bloque">Enviar aviso</button></form>`;
  const f = $('#f', el); activarFotos(f);
  const sugerir = async () => {
    const v = f.elements.equipo.value, box = $('#sugeridas', el); if (!v) { box.innerHTML = ''; return; }
    try { const { datos } = await obtener(`/equipos/${v}/`); box.innerHTML = `<p class="sub" style="margin:0 0 8px">Fallas frecuentes de ${esc(datos.ficha.nombre)} (toque para agregar):</p><div class="chips-f" style="margin-bottom:14px">${datos.ficha.fallas.map((x) => `<button type="button">${esc(x)}</button>`).join('')}</div>`; } catch { box.innerHTML = ''; }
  };
  f.elements.equipo.addEventListener('change', sugerir); if (q.get('equipo')) sugerir();
  $('#sugeridas', el).addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; b.classList.toggle('on'); const t = f.elements.descripcion; const p = b.textContent; t.value = b.classList.contains('on') ? (t.value ? t.value + '. ' : '') + p : t.value.replace(new RegExp('(\\. )?' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), ''); });
  f.onsubmit = async (e) => {
    e.preventDefault(); if (!validarObligatorios(f, campos)) return; const b = $('.btn.bloque', f); b.disabled = true;
    try { const r = await enviarConCola('/reportes/', leerForm(f, campos), 'Reporte de falla'); toast(r.encolado ? 'Sin señal: el reporte quedó guardado y se enviará solo.' : 'Aviso enviado. Mantención ya puede verlo.'); location.hash = U.menu.includes('mis_reportes') ? '#/mis_reportes' : '#/reportes'; }
    catch (x) { b.disabled = false; const a = $('.aviso-error', f); a.textContent = x.message; a.hidden = false; errores(f, campos, x); }
  };
}
async function sMisReportes(el) {
  const { filas, viejo } = await lista('reportes'); const pend = pendientesDe('/reportes/');
  el.innerHTML = titulo('Mis reportes', 'Vea si un técnico ya tomó su aviso.') + `<a class="btn" href="#/reportar">Avisar una falla</a>` + aviso(viejo) +
    (pend.length ? `<section class="tarjeta"><h2>Pendientes de envío</h2>${pend.map((p) => fila({ titulo: 'Reporte guardado en este equipo', detalle: p.cuerpo.descripcion.slice(0, 80), etiqueta: 'Sin enviar', tono: 'ambar' })).join('')}</section>` : '') +
    `<section class="tarjeta">${filas.length ? filas.map((r) => fila({ titulo: r.equipo_nombre, detalle: `${r.descripcion.slice(0, 80)} · ${fechaHora(r.creado)}${r.tecnico_nombre ? ' · ' + corto(r.tecnico_nombre) : ''}`, etiqueta: r.estado_display, tono: TONO[r.estado] })).join('') : '<p class="vacio">Aún no ha enviado reportes.</p>'}</section>`;
}
async function sReportes(el) {
  const { filas, viejo } = await lista('reportes'); const modo = el._modo || 'pend', ver = filas.filter((r) => modo === 'todos' || r.estado === 'enviado');
  el.innerHTML = titulo('Reportes de falla', 'Avisos de operadores.') + pestanas([['pend', 'Sin tomar'], ['todos', 'Todos']], modo) + aviso(viejo) +
    `<section class="tarjeta">${ver.length ? ver.map((r) => `<div class="fila-it" style="align-items:flex-start"><div class="t"><b>${esc(r.equipo_nombre)}</b><small>${esc(r.descripcion)}</small><small>${esc(corto(r.operador_nombre))} · ${fechaHora(r.creado)}</small>${r.foto ? `<a href="${esc(mediaUrl(r.foto))}" target="_blank" rel="noopener">Ver foto</a>` : ''}</div>
      <div style="display:grid;gap:6px;justify-items:end">${chip(r.estado_display, TONO[r.estado])}${r.detiene_linea ? chip('Detiene la línea', 'rojo') : ''}${r.estado === 'enviado' && U.rol === 'tecnico' ? `<button class="btn chico ok" data-tomar="${r.id}">Tomar</button>` : ''}${r.orden_id && accesibles().includes('ordenes') ? `<a class="btn chico sec" href="#/ordenes/${r.orden_id}">Ver orden</a>` : ''}</div></div>`).join('') : '<p class="vacio">No hay reportes pendientes.</p>'}</section>`;
  $$('[data-p]', el).forEach((b) => (b.onclick = () => { el._modo = b.dataset.p; sReportes(el); }));
  $$('[data-tomar]', el).forEach((b) => (b.onclick = async () => { b.disabled = true; try { const r = await api(`/reportes/${b.dataset.tomar}/tomar/`, { metodo: 'POST' }); toast(`Tomó el reporte. Se creó la ${r.numero}. Falta el bloqueo antes de intervenir.`); location.hash = `#/ordenes/${r.orden_id}`; } catch (x) { b.disabled = false; toast(x.message, true); if (x.estado === 409) ruta(); } }));
}
async function sOrdenes(el) {
  const modo = el._modo || (U.rol === 'tecnico' ? 'mias' : 'abiertas');
  const params = modo === 'mias' ? { mias: 1, excluir_estado: 'cerrada' } : modo === 'cerradas' ? { estado: 'cerrada', limite: 40 } : { excluir_estado: 'cerrada' };
  const { filas, viejo } = await lista('ordenes', params);
  el.innerHTML = titulo('Órdenes de trabajo') + pestanas([['mias', 'Mías'], ['abiertas', 'Abiertas'], ['cerradas', 'Cerradas']], modo) + entradaFiltro('Filtrar órdenes') + aviso(viejo) +
    `<section class="tarjeta">${filas.length ? filas.map((o) => fila({ ruta: `ordenes/${o.id}`, titulo: `${o.numero} · ${o.titulo.slice(0, 70)}`, detalle: `${o.equipo_nombre} · ${o.estado_display}${o.sin_avance ? '' : ' · ' + o.prioridad_display}`, etiqueta: o.sin_avance ? `${o.horas_sin_avance} h sin avance` : o.prioridad_display, tono: o.sin_avance ? 'rojo' : TONO[o.prioridad] })).join('') : '<p class="vacio">No hay órdenes en esta lista.</p>'}</section>`;
  $$('[data-p]', el).forEach((b) => (b.onclick = () => { el._modo = b.dataset.p; sOrdenes(el); })); filtroLocal(el, '.fila-it');
}
let REF_SEG = null;
const refSeguridad = async () => (REF_SEG ||= (await obtener('/referencia/seguridad/')).datos.seguridad);

function hojaChecklist({ titulo: t, intro = '', items, boton, onOk, extra = '' }) {
  return new Promise((resolver) => {
    const fondo = document.createElement('div'); fondo.className = 'hoja-fondo';
    fondo.innerHTML = `<div class="hoja" role="dialog" aria-label="${esc(t)}"><h2 class="display">${esc(t)}</h2>${intro ? `<p class="sub" style="margin:0 0 8px">${intro}</p>` : ''}<div class="avance"><i style="width:0"></i></div>
      <div>${items.map((x, i) => `<label class="check"><input type="checkbox" data-i="${i}"><span>${esc(x)}</span></label>`).join('')}</div>${extra}<div class="aviso-error" hidden></div><div class="pie"><button class="btn sec" data-x>Cancelar</button><button class="btn" data-ok disabled>${esc(boton)}</button></div></div>`;
    document.body.append(fondo);
    const cerrar = (v) => { fondo.remove(); resolver(v); }, ok = $('[data-ok]', fondo), barra = $('.avance i', fondo);
    const cambio = () => { const n = $$('input[type=checkbox]', fondo).filter((c) => c.checked).length; barra.style.width = `${(100 * n) / items.length}%`; ok.disabled = n < items.length; };
    fondo.addEventListener('change', cambio); $('[data-x]', fondo).onclick = () => cerrar(null); fondo.addEventListener('click', (e) => e.target === fondo && cerrar(null));
    ok.onclick = async () => { ok.disabled = true; try { cerrar((await onOk(fondo)) ?? true); } catch (x) { const a = $('.aviso-error', fondo); a.textContent = x.message; a.hidden = false; ok.disabled = false; } };
  });
}
async function sOrden(el, id) {
  const { datos: o, viejo } = await obtener(`/ordenes/${id}/`);
  const pend = pendientesDe(`/ordenes/${id}/bitacora/`), abierta = o.estado !== 'cerrada', puede = U.permisos.ordenes.crear;
  const accionesRep = (u) => abierta && u.estado !== 'usado' ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">${u.estado !== 'reservado' && u.suficiente ? `<button class="btn chico sec" data-ra="reservar" data-id="${u.id}">Reservar</button>` : ''}${u.estado === 'requerido' && !u.suficiente ? `<button class="btn chico sec" data-ra="solicitar" data-id="${u.id}">Marcar solicitado</button>` : ''}${u.estado === 'reservado' || u.suficiente ? `<button class="btn chico ok" data-ra="entregar" data-id="${u.id}">Registrar entrega</button>` : ''}</div>` : '';
  el.innerHTML = `${volver('ordenes', 'Órdenes')}${titulo(`${o.numero} · ${o.titulo}`)}${aviso(viejo)}
    <section class="tarjeta"><div class="dato"><span>Equipo</span><a href="#/equipos/${o.equipo}"><b>${esc(o.equipo_nombre)}</b></a></div><div class="dato"><span>Estado</span>${chip(o.estado_display, TONO[o.estado])}</div><div class="dato"><span>Prioridad</span>${chip(o.prioridad_display, TONO[o.prioridad])}</div>
      <div class="dato"><span>Asignada a</span><b>${esc(corto(o.asignado_a_nombre) || 'Sin asignar')}</b></div><div class="dato"><span>Horas registradas</span><b>${o.horas_trabajadas}</b></div>
      <div class="dato"><span>Bloqueo y etiquetado</span>${o.loto_en ? chip(`Aplicado por ${corto(o.loto_por_nombre)} · ${fechaHora(o.loto_en)}`, 'verde') : chip(abierta ? 'Pendiente' : 'Sin registro', abierta ? 'rojo' : '')}</div>${o.descripcion ? `<p>${esc(o.descripcion)}</p>` : ''}</section>
    ${o.sin_avance ? `<div class="alerta">${o.horas_sin_avance} horas sin avance en un equipo crítico.</div>` : ''}
    ${o.traspaso ? `<div class="destacado"><b>Nota de traspaso · ${esc(corto(o.traspaso.autor_nombre))} · ${fechaHora(o.traspaso.creado)}</b>${esc(o.traspaso.texto)}</div>` : ''}
    ${abierta && puede ? `<div class="acciones-rapidas">${o.estado === 'abierta' ? '<button class="btn" data-est="en_curso">Iniciar intervención</button>' : ''}<button class="btn sec" id="diag">Diagnóstico guiado</button>${o.estado === 'en_curso' ? '<button class="btn negro" data-est="cerrada">Cerrar orden</button>' : ''}</div>` : ''}
    <section class="tarjeta"><h2>Repuestos</h2>${o.repuestos.length ? o.repuestos.map((u) => `<div class="fila-it" style="display:block"><div style="display:flex;gap:10px;justify-content:space-between"><b>${esc(u.repuesto_nombre)} × ${u.cantidad}</b>${chip(u.estado_display, u.estado === 'usado' ? 'verde' : '')}</div>${u.estado !== 'usado' && u.estado !== 'reservado' ? `<small>${u.suficiente ? `Suficiente (stock ${u.stock})` : `Insuficiente (stock ${u.stock})`}</small>` : ''}${accionesRep(u)}</div>`).join('') : '<p class="vacio">Sin repuestos.</p>'}
      ${abierta && puede ? '<button class="btn sec bloque" id="add-rep" style="margin-top:12px">Agregar repuesto requerido</button>' : ''}</section>
    <section class="tarjeta"><h2>Bitácora</h2>${abierta && puede ? `<form id="fb" novalidate>${campoHtml({ n: 'texto', l: 'Diagnóstico o acción realizada', t: 'textarea', req: 1 })}${campoHtml({ n: 'horas', l: 'Horas trabajadas', t: 'number', ph: '0' })}${campoHtml({ n: 'es_traspaso', l: 'Es nota de traspaso para el siguiente turno', t: 'checkbox' })}<div class="aviso-error" hidden></div><button class="btn bloque">Guardar registro</button><p class="sub" style="font-size:14px">Sin señal: se guarda en este equipo y se envía solo.</p></form>` : ''}
      <div class="cronologia" style="margin-top:16px">${pend.map((p) => `<div class="it"><small>Pendiente de envío</small><i>${esc(p.cuerpo.texto)}</i></div>`).join('')}${[...o.bitacora].reverse().map((b) => `<div class="it ${b.es_traspaso ? 'traspaso' : /LOTO|Bloqueo/.test(b.texto) ? 'seg' : ''}"><small>${fechaHora(b.creado)} · ${esc(corto(b.autor_nombre))}${b.horas ? ` · ${b.horas} h` : ''}${b.es_traspaso ? ' · TRASPASO' : ''}</small>${esc(b.texto)}</div>`).join('') || '<p class="vacio">Sin registros.</p>'}</div></section>`;
  $$('[data-est]', el).forEach((b) => (b.onclick = async () => {
    const S = await refSeguridad(), cerrando = b.dataset.est === 'cerrada';
    const r = await hojaChecklist(cerrando
      ? { titulo: 'Entregar el equipo', intro: 'Antes de cerrar la orden, confirme cada punto.', items: ['Retiré mi candado y mi etiqueta de cada punto de aislamiento.', 'Las herramientas y los residuos están retirados del equipo.', 'El equipo quedó probado y seguro para operar.', 'Avisé a operación que el equipo vuelve a producción.'], boton: 'Cerrar la orden', onOk: () => api(`/ordenes/${id}/estado/`, { metodo: 'POST', cuerpo: { estado: 'cerrada', retiro_loto: true } }) }
      : { titulo: 'Bloqueo y etiquetado', intro: 'Nunca intervenga un equipo con energía. Confirme cada paso (LOTO).', items: S.loto, boton: 'Confirmar y empezar', onOk: () => api(`/ordenes/${id}/estado/`, { metodo: 'POST', cuerpo: { estado: 'en_curso', loto: true } }) });
    if (r) { toast(cerrando ? 'Orden cerrada. El equipo vuelve a operar.' : 'Bloqueo registrado. Puede intervenir.'); ruta(); }
  }));
  $('#diag', el)?.addEventListener('click', () => diagnostico(o, id));
  $$('[data-ra]', el).forEach((b) => (b.onclick = async () => { b.disabled = true; try { await api(`/repuestos-ot/${b.dataset.id}/${b.dataset.ra}/`, { metodo: 'POST' }); toast('Listo.'); ruta(); } catch (x) { b.disabled = false; toast(x.message, true); } }));
  $('#add-rep', el)?.addEventListener('click', async () => {
    const { filas } = await lista('repuestos');
    const r = await hoja({ titulo: 'Agregar repuesto', boton: 'Agregar', campos: [{ n: 'repuesto', l: 'Repuesto', t: 'select', req: 1, op: [['', 'Elija el repuesto'], ...filas.map((x) => [x.id, `${x.nombre} · ${x.bodega} · stock ${x.stock}`])] }, { n: 'cantidad', l: 'Cantidad', t: 'number', req: 1 }], valores: { cantidad: 1 }, enviar: (d) => api(`/ordenes/${id}/repuestos/`, { metodo: 'POST', cuerpo: d }) });
    if (r) { toast('Repuesto agregado como requerido.'); ruta(); }
  });
  const fb = $('#fb', el);
  if (fb) fb.onsubmit = async (e) => {
    e.preventDefault(); const campos = [{ n: 'texto', req: 1 }, { n: 'horas' }, { n: 'es_traspaso', t: 'checkbox' }]; if (!validarObligatorios(fb, campos)) return; const b = $('.btn', fb); b.disabled = true;
    try { const d = leerForm(fb, campos); d.horas = Number(d.horas) || 0; const r = await enviarConCola(`/ordenes/${id}/bitacora/`, d, `Bitácora ${o.numero}`); toast(r.encolado ? 'Sin señal: registro guardado en este equipo. Se enviará solo.' : 'Registro guardado en la bitácora.'); ruta(); }
    catch (x) { b.disabled = false; const a = $('.aviso-error', fb); a.textContent = x.message; a.hidden = false; errores(fb, campos, x); }
  };
}
const PASOS_DIAG = ['Confirmar condición segura y revisar las alarmas.', 'Verificar parada de emergencia y resguardos, sin puentear la seguridad.', 'Personal autorizado revisa alimentación, PLC y variador.', 'Inspeccionar componentes con el equipo bloqueado.', 'Corregir, probar y documentar.'];
async function diagnostico(o, id) {
  const f = o.ficha;
  const extra = `<p style="margin:14px 0 6px"><b>Causa probable</b> <span class="sub">(fallas frecuentes de ${esc(f.nombre)})</span></p><div class="chips-f" id="causas">${f.fallas.map((x) => `<button type="button">${esc(x)}</button>`).join('')}</div>
    <p style="margin:14px 0 6px"><b>Piezas a revisar</b></p><div class="chips-f">${f.piezas.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div><p style="margin:14px 0 6px"><b>Herramientas</b></p><div class="chips-f">${f.herramientas.map((x) => `<span class="chip negro">${esc(x)}</span>`).join('')}</div>`;
  const r = await hojaChecklist({ titulo: 'Diagnóstico guiado', intro: `Siga los pasos del informe técnico para ${esc(f.nombre)}.`, items: PASOS_DIAG, boton: 'Guardar en la bitácora', extra, onOk: async (fondo) => {
    const causa = $$('#causas button.on', fondo).map((b) => b.textContent).join(', ') || 'sin causa elegida';
    return enviarConCola(`/ordenes/${id}/bitacora/`, { texto: `Diagnóstico guiado completo (5 de 5 pasos). Causa probable: ${causa}.`, horas: 0 }, `Diagnóstico ${o.numero}`); } });
  if (r) { toast(r.encolado ? 'Sin señal: el diagnóstico se enviará solo.' : 'Diagnóstico guardado en la bitácora.'); ruta(); }
}
document.addEventListener('click', (e) => { const b = e.target.closest('#causas button'); if (b) b.classList.toggle('on'); });

// ------------------------------------------------------------------ avisos, repuestos, planificación, notas, informes
const TIPOS_AVISO = [['arreglo_menor', 'Arreglé algo pequeño'], ['pendiente', 'Falta algo por arreglar'], ['repuesto', 'Falta un repuesto'], ['informativo', 'Solo informo']];
async function sAvisar(el, _, q) {
  const { filas } = await lista('equipos');
  const campos = [{ n: 'tipo', l: '¿Qué quiere avisar?', t: 'tipos', op: TIPOS_AVISO }, selectEquipo(filas), { n: 'texto', l: 'Detalle', t: 'textarea', req: 1, ph: 'Qué hizo o qué falta' }];
  el.innerHTML = titulo('Avisar a los ingenieros', 'Los supervisores y jefes de mantenimiento reciben una notificación.') + `<form class="tarjeta" id="f" novalidate>${campos.map((c) => campoHtml(c, c.n === 'equipo' ? q.get('equipo') || '' : '')).join('')}<div class="aviso-error" hidden></div><button class="btn bloque">Enviar aviso</button></form>`;
  const f = $('#f', el);
  f.onsubmit = async (e) => { e.preventDefault(); if (!validarObligatorios(f, campos)) return; const b = $('.btn', f); b.disabled = true;
    try { const r = await enviarConCola('/avisos/', leerForm(f, campos), 'Aviso a ingenieros'); toast(r.encolado ? 'Sin señal: el aviso se enviará solo.' : 'Aviso enviado.'); location.hash = '#/avisos'; }
    catch (x) { b.disabled = false; const a = $('.aviso-error', f); a.textContent = x.message; a.hidden = false; errores(f, campos, x); } };
}
async function sAvisos(el) {
  const gestiona = permiso('avisos', 'editar'), modo = el._modo || 'pend';
  const { filas, viejo } = await lista('avisos'); const ver = filas.filter((a) => modo === 'todos' || !a.atendido);
  el.innerHTML = titulo(gestiona ? 'Avisos de técnicos' : 'Mis avisos', gestiona ? 'Trabajos pequeños hechos y pendientes que informa el equipo.' : 'Lo que avisó a los ingenieros.') + pestanas([['pend', 'Pendientes'], ['todos', 'Todos']], modo) + aviso(viejo) +
    `<section class="tarjeta">${ver.length ? ver.map((a) => `<div class="fila-it" style="align-items:flex-start"><div class="t"><b>${esc(a.equipo_nombre)}</b><small>${esc(a.texto)}</small><small>${esc(corto(a.autor_nombre))} · ${fechaHora(a.creado)}</small></div><div style="display:grid;gap:6px;justify-items:end">${chip(a.tipo_display, a.tipo === 'pendiente' || a.tipo === 'repuesto' ? 'ambar' : 'verde')}${a.atendido ? chip('Atendido', 'verde') : gestiona ? `<button class="btn chico ok" data-at="${a.id}">Marcar atendido</button>` : ''}</div></div>`).join('') : '<p class="vacio">No hay avisos.</p>'}</section>
    ${accesibles().includes('avisar') ? '<a class="btn" href="#/avisar">Nuevo aviso</a>' : ''}`;
  $$('[data-p]', el).forEach((b) => (b.onclick = () => { el._modo = b.dataset.p; sAvisos(el); }));
  $$('[data-at]', el).forEach((b) => (b.onclick = async () => { b.disabled = true; try { await api(`/avisos/${b.dataset.at}/`, { metodo: 'PATCH', cuerpo: { atendido: true } }); toast('Aviso marcado como atendido.'); ruta(); } catch (x) { b.disabled = false; toast(x.message, true); } }));
}
async function sRepuestos(el) {
  const { filas, viejo } = await lista('repuestos'); const modo = el._modo || 'todos';
  const ver = filas.filter((r) => modo === 'todos' || (modo === 'bajo' ? r.bajo_minimo : r.critico));
  el.innerHTML = titulo('Repuestos', 'Stock por bodega, tipo y criticidad.') + entradaFiltro('Buscar repuesto, bodega o número de parte') + pestanas([['todos', 'Todos'], ['bajo', 'Bajo el mínimo'], ['critico', 'Críticos']], modo) + aviso(viejo) +
    `<section class="tarjeta">${ver.map((r) => fila({ titulo: r.nombre, detalle: `${r.codigo} · ${r.tipo} · ${r.bodega} ${r.ubicacion}${r.fabricante ? ' · ' + r.fabricante + ' ' + r.numero_parte : ''}`, etiqueta: `Stock ${r.stock}`, tono: r.bajo_minimo ? 'rojo' : 'verde' })).join('') || '<p class="vacio">Sin resultados.</p>'}</section>`;
  $$('[data-p]', el).forEach((b) => (b.onclick = () => { el._modo = b.dataset.p; sRepuestos(el); })); filtroLocal(el, '.fila-it');
}
let mesCal = hoyIso().slice(0, 7);
async function sPlanificacion(el) {
  const { datos: d, viejo } = await obtener('/calendario/', { mes: mesCal });
  const [y, m] = mesCal.split('-').map(Number), primero = new Date(y, m - 1, 1), dias = new Date(y, m, 0).getDate(), off = (primero.getDay() + 6) % 7;
  const iso = (n) => `${mesCal}-${String(n).padStart(2, '0')}`, celdas = [...Array(off).fill(null), ...Array.from({ length: dias }, (_, i) => i + 1)];
  const mover = (n) => { const f = new Date(y, m - 1 + n, 1); mesCal = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`; sPlanificacion(el); };
  el.innerHTML = titulo('Planificación') + aviso(viejo) + `<section class="tarjeta"><div class="cal-nav"><button data-m="-1" aria-label="Mes anterior">‹</button><h2 class="display">${primero.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</h2><button data-m="1" aria-label="Mes siguiente">›</button></div>
    <div class="cal-mes">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x) => `<div class="c cab">${x}</div>`).join('')}${celdas.map((n) => n ? `<div class="c ${iso(n) === hoyIso() ? 'hoy' : ''} ${d.eventos.some((e) => e.inicio <= iso(n) && e.fin >= iso(n)) ? 'ev' : ''}">${n}</div>` : '<div class="c otro"></div>').join('')}</div></section>
    ${permiso('planes', 'crear') ? '<button class="btn" id="nuevo">Nuevo plan</button>' : ''}
    <section class="tarjeta"><h2>Este mes</h2>${d.eventos.length ? d.eventos.map((e) => fila({ titulo: e.titulo, detalle: `${fecha(e.inicio)} – ${fecha(e.fin)}`, etiqueta: e.estado })).join('') : '<p class="vacio">No hay actividades planificadas este mes.</p>'}</section>`;
  $$('[data-m]', el).forEach((b) => (b.onclick = () => mover(+b.dataset.m)));
  $('#nuevo', el)?.addEventListener('click', async () => {
    const { filas } = await lista('equipos');
    const r = await hoja({ titulo: 'Nuevo plan', campos: [{ n: 'titulo', l: 'Título', req: 1 }, { n: 'tipo', l: 'Tipo', t: 'select', op: [['preventivo', 'Mantención preventiva'], ['equipo', 'Equipo de mantenimiento'], ['optimizacion', 'Optimización de máquinas']] }, { n: 'equipo', l: 'Equipo', t: 'select', op: [['', 'Sin equipo específico'], ...filas.map((e) => [e.id, e.nombre_habitual])] },
      { n: 'fecha_inicio', l: 'Desde', t: 'date', req: 1 }, { n: 'fecha_fin', l: 'Hasta', t: 'date', req: 1 }, { n: 'descripcion', l: 'Detalle', t: 'textarea' }], valores: { fecha_inicio: hoyIso(), fecha_fin: hoyIso() }, enviar: (d) => api('/planes/', { metodo: 'POST', cuerpo: d }) });
    if (r) { toast('Plan guardado.'); ruta(); }
  });
}
async function sNotas(el) {
  const { filas, viejo } = await lista('notas');
  el.innerHTML = titulo('Notas y recomendaciones', 'Conocimiento de los técnicos para los demás turnos.') + `<button class="btn" id="nueva">Nueva nota</button>` + aviso(viejo) +
    `<section class="tarjeta">${filas.length ? filas.map((n) => `<div class="fila-it" style="display:block"><b>${esc(n.titulo)}</b> ${chip(n.tipo_display)}<small>${esc(n.equipo_nombre || 'General')} · ${esc(corto(n.autor_nombre))} · ${fecha(n.creada)}</small><p style="margin:6px 0 0">${esc(n.texto)}</p></div>`).join('') : '<p class="vacio">Aún no hay notas.</p>'}</section>`;
  $('#nueva', el).onclick = async () => { const { filas: eq } = await lista('equipos');
    const r = await hoja({ titulo: 'Nueva nota', campos: [{ n: 'tipo', l: 'Tipo', t: 'select', op: [['recomendacion', 'Recomendación'], ['nota', 'Nota']] }, { n: 'titulo', l: 'Título', req: 1 }, { n: 'equipo', l: 'Equipo', t: 'select', op: [['', 'General (sin equipo)'], ...eq.map((e) => [e.id, e.nombre_habitual])] }, { n: 'texto', l: 'Detalle', t: 'textarea', req: 1 }], boton: 'Publicar', enviar: (d) => api('/notas/', { metodo: 'POST', cuerpo: d }) });
    if (r) { toast('Nota publicada.'); ruta(); } };
}
async function sInformes(el) {
  const { filas, viejo } = await lista('informes');
  el.innerHTML = titulo('Informes') + (permiso('informes', 'crear') ? '<button class="btn" id="nuevo">Nuevo informe</button>' : '') + aviso(viejo) +
    `<section class="tarjeta">${filas.length ? filas.map((i) => `<details class="fila-it" style="display:block"><summary><b>${esc(i.titulo)}</b> ${i.compartido ? chip('Compartido', 'verde') : chip('Privado')}<small>${esc(corto(i.autor_nombre))} · ${fecha(i.creado)}</small></summary><p style="white-space:pre-wrap">${esc(i.contenido)}</p>${permiso('informes', 'editar') ? `<button class="btn chico sec" data-cp="${i.id}" data-v="${i.compartido ? 0 : 1}">${i.compartido ? 'Dejar privado' : 'Compartir con los técnicos'}</button>` : ''}</details>`).join('') : '<p class="vacio">Aún no hay informes.</p>'}</section>`;
  $$('[data-cp]', el).forEach((b) => (b.onclick = async () => { try { await api(`/informes/${b.dataset.cp}/`, { metodo: 'PATCH', cuerpo: { compartido: b.dataset.v === '1' } }); ruta(); } catch (x) { toast(x.message, true); } }));
  $('#nuevo', el)?.addEventListener('click', async () => { const r = await hoja({ titulo: 'Nuevo informe', campos: [{ n: 'titulo', l: 'Título', req: 1 }, { n: 'contenido', l: 'Contenido', t: 'textarea', req: 1 }, { n: 'compartido', l: 'Compartir con los técnicos', t: 'checkbox' }], enviar: (d) => api('/informes/', { metodo: 'POST', cuerpo: d }) }); if (r) { toast('Informe guardado.'); ruta(); } });
}
const FMT_KPI = { '%': 'pct1', h: 'h', $: 'clp' };
function filaKpi(k) {
  const v = k.valor, fmt = FMT_KPI[k.unidad] || 'dec1';
  return `<div class="kpi-grande ${k.estado}"><div class="tx"><b>${esc(k.nombre)}</b><small>${esc(k.area)} · meta ${k.mejor === 'alto' ? '≥' : '≤'} ${k.unidad === '$' ? clp(k.meta) : k.meta + (k.unidad === '%' ? '%' : ' ' + k.unidad)}${k.vivo ? ' · calculado con datos de la planta' : ''}</small></div>
    <div class="n">${v == null ? '—' : `<span data-contar="${v}" data-fmt="${fmt}">${v}</span>`}</div>${spark(k.serie.map((s) => s.valor), { w: 110, h: 34 })}<small>${esc(k.formula)}</small></div>`;
}
async function sIndicadores(el) {
  const { datos: d, viejo } = await obtener('/kpis/');
  const areas = [...new Set(d.kpis.map((k) => k.area))];
  el.innerHTML = titulo('Indicadores', 'Los 10 indicadores del informe, con meta y evolución de los últimos 6 meses.') + aviso(viejo) +
    areas.map((a) => `<section class="tarjeta"><h2>${esc(a)}</h2>${d.kpis.filter((k) => k.area === a).map(filaKpi).join('')}</section>`).join('') + `<p class="sub">${esc(d.nota)}</p>`;
  activar(el);
}
async function sPlcs(el) {
  const { filas, viejo } = await lista('plcs');
  el.innerHTML = titulo('PLC', 'Controladores de las líneas y máquinas.') + entradaFiltro('Filtrar por nombre, marca o IP') + aviso(viejo) +
    `<section class="tarjeta">${filas.map((p) => fila({ ruta: `plcs/${p.id}`, titulo: p.nombre, detalle: `${p.equipo_nombre} · ${p.marca} ${p.modelo}${p.ip ? ' · ' + p.ip : ''}`, etiqueta: p.estado_display, tono: TONO[p.estado] })).join('')}</section>`; filtroLocal(el, '.fila-it');
}
async function sPlc(el, id) {
  const { datos: p, viejo } = await obtener(`/plcs/${id}/`);
  el.innerHTML = `${volver('plcs', 'PLC')}${titulo(p.nombre, p.equipo_nombre)}${aviso(viejo)}
    <section class="tarjeta">${[['Estado', chip(p.estado_display, TONO[p.estado])], ['Marca y modelo', `<b>${esc(p.marca)} ${esc(p.modelo)}</b>`], ['Dirección IP', `<b>${esc(p.ip || '—')}</b>`], ['Versión del programa', `<b>${esc(p.programa_version || '—')}</b>`], ['Última revisión', `<b>${fecha(p.ultima_revision)}</b>`]].map(([a, b]) => `<div class="dato"><span>${a}</span>${b}</div>`).join('')}${p.observaciones ? `<p>${esc(p.observaciones)}</p>` : ''}</section>
    ${permiso('plcs', 'editar') ? '<button class="btn" id="ed">Actualizar estado y programa</button>' : ''}`;
  $('#ed', el)?.addEventListener('click', async () => {
    const r = await hoja({ titulo: 'Actualizar PLC', campos: [{ n: 'estado', l: 'Estado', t: 'select', op: [['en_linea', 'En línea'], ['alarma', 'Con alarma'], ['fuera_de_linea', 'Fuera de línea']] }, { n: 'programa_version', l: 'Versión del programa' }, { n: 'ip', l: 'Dirección IP' }, { n: 'ultima_revision', l: 'Última revisión', t: 'date' }, { n: 'observaciones', l: 'Observaciones', t: 'textarea' }], valores: p, enviar: (d) => api(`/plcs/${id}/`, { metodo: 'PATCH', cuerpo: d }) });
    if (r) { toast('PLC actualizado.'); ruta(); }
  });
}

// ------------------------------------------------------------------ rutinas, herramientas y traspaso de turno
async function sRutinas(el) {
  const [{ filas, viejo }, mc] = await Promise.all([lista('plantillas'), obtener('/mi-cargo/')]);
  const pend = new Set(mc.datos.pendientes.map((p) => p.id));
  const hechas = (await lista('ejecuciones', { mias: 1, limite: 6 })).filas;
  const mias = filas.filter((p) => p.perfiles.includes(U.rol));
  el.innerHTML = titulo('Rutinas', 'Revisiones por turno, semana, mes y trimestre, tomadas del informe técnico.') + aviso(viejo) +
    `<section class="tarjeta"><h2>Mis rutinas</h2>${mias.length ? mias.map((p) => fila({ ruta: `rutinas/${p.id}`, titulo: p.nombre, detalle: `${p.frecuencia_display} · ${p.items.length} puntos`, etiqueta: pend.has(p.id) ? 'Pendiente' : 'Al día', tono: pend.has(p.id) ? 'ambar' : 'verde' })).join('') : '<p class="vacio">Su perfil no tiene rutinas asignadas.</p>'}</section>
    ${hechas.length ? `<section class="tarjeta"><h2>Hechas recientemente</h2>${hechas.map((h) => fila({ titulo: h.plantilla_nombre, detalle: `${h.equipo_nombre || 'Turno'} · ${fechaHora(h.creado)}${h.observacion ? ' · ' + h.observacion : ''}`, etiqueta: h.completa ? 'Completa' : 'Con observaciones', tono: h.completa ? 'verde' : 'ambar' })).join('')}</section>` : ''}`;
}
async function sRutina(el, id) {
  const [{ datos: p }, eqs] = await Promise.all([obtener(`/plantillas/${id}/`), lista('equipos')]);
  const campoEq = p.aplica_a === 'equipo' ? { n: 'equipo', l: 'Equipo revisado', t: 'select', req: 1, op: [['', 'Elija el equipo'], ...eqs.filas.map((e) => [e.id, `${e.nombre_habitual} · ${e.zona}`])] } : null;
  el.innerHTML = `${volver('rutinas', 'Rutinas')}${titulo(p.nombre, `${p.frecuencia_display} · marque lo que revisó`)}
    <form class="tarjeta" id="f" novalidate>${campoEq ? campoHtml(campoEq) : ''}<div class="avance"><i style="width:0"></i></div>${p.items.map((x, i) => `<label class="check"><input type="checkbox" data-i="${i}"><span>${esc(x)}</span></label>`).join('')}
    <label class="campo" style="margin-top:14px"><span>Observaciones <small class="sub">(obligatorio si algo no se pudo revisar)</small></span><textarea name="observacion" placeholder="Ej.: fuga leve en la manguera lateral"></textarea><div class="err" data-err="observacion"></div></label><div class="aviso-error" hidden></div><button class="btn bloque">Guardar rutina</button><p class="sub" style="font-size:14px">Sin señal: se guarda en este equipo y se envía sola.</p></form>`;
  const f = $('#f', el), barra = $('.avance i', f);
  f.addEventListener('change', () => { const n = $$('.check input', f).filter((c) => c.checked).length; barra.style.width = `${(100 * n) / p.items.length}%`; });
  f.onsubmit = async (e) => {
    e.preventDefault(); const items = $$('.check input', f).map((c) => c.checked), faltan = items.some((x) => !x), obs = f.elements.observacion.value.trim();
    if (campoEq && !validarObligatorios(f, [campoEq])) return;
    if (faltan && !obs) { $('[data-err=observacion]', f).textContent = 'Cuente qué no se pudo revisar.'; f.elements.observacion.focus(); return; }
    const b = $('.btn.bloque', f); b.disabled = true;
    try { const r = await enviarConCola('/ejecuciones/', { plantilla: +id, equipo: campoEq ? +f.elements.equipo.value : null, items_ok: items, observacion: obs }, `Rutina: ${p.nombre}`); toast(r.encolado ? 'Sin señal: la rutina se enviará sola.' : faltan ? 'Rutina guardada con observaciones.' : 'Rutina completa. Buen trabajo.'); location.hash = '#/rutinas'; }
    catch (x) { b.disabled = false; const a = $('.aviso-error', f); a.textContent = x.message; a.hidden = false; }
  };
}
async function sHerramientas(el) {
  const { filas, viejo } = await lista('herramientas'); const modo = el._modo || 'todas'; const hoy = hoyIso();
  const ver = filas.filter((h) => modo === 'todas' || (modo === 'mias' ? h.asignada_a === U.id : h.requiere_calibracion && h.proxima_calibracion && h.proxima_calibracion <= new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)));
  const gestiona = ['instrumentacion', 'panol', 'jefe_mant'].includes(U.rol);
  el.innerHTML = titulo('Herramientas e instrumentos', 'Retire, devuelva y controle las calibraciones.') + entradaFiltro('Buscar herramienta o código') + pestanas([['todas', 'Todas'], ['mias', 'Las que tengo'], ['cal', 'Calibración']], modo) + aviso(viejo) +
    `<section class="tarjeta">${ver.length ? ver.map((h) => { const vence = h.proxima_calibracion; return `<div class="herr"><div class="t"><b>${esc(h.nombre)} · ${esc(h.codigo)}</b><small>${h.estado === 'prestada' ? 'Con ' + esc(corto(h.asignada_a_nombre)) + ' desde ' + fechaHora(h.retirada_en) : h.estado_display}</small>${vence ? `<small>Calibración: ${fecha(vence)}${h.calibracion_vencida ? ' · VENCIDA' : ''}</small>` : '<small>No requiere calibración</small>'}</div>
      <div style="display:grid;gap:6px;justify-items:end">${chip(h.estado_display, h.calibracion_vencida ? 'rojo' : TONO[h.estado])}
      ${h.estado === 'disponible' && !h.calibracion_vencida ? `<button class="btn chico" data-h="retirar" data-id="${h.id}">Retirar</button>` : ''}${h.estado === 'prestada' && (h.asignada_a === U.id || gestiona) ? `<button class="btn chico sec" data-h="devolver" data-id="${h.id}">Devolver</button>` : ''}
      ${gestiona && h.requiere_calibracion && h.estado === 'disponible' ? `<button class="btn chico sec" data-h="enviar_calibracion" data-id="${h.id}">A calibración</button>` : ''}${gestiona && h.estado === 'calibracion' ? `<button class="btn chico ok" data-h="calibrada" data-id="${h.id}">Calibrada</button>` : ''}</div></div>`; }).join('') : '<p class="vacio">No hay herramientas en esta lista.</p>'}</section>`;
  $$('[data-p]', el).forEach((b) => (b.onclick = () => { el._modo = b.dataset.p; sHerramientas(el); })); filtroLocal(el, '.herr');
  $$('[data-h]', el).forEach((b) => (b.onclick = async () => { b.disabled = true; try { await api(`/herramientas/${b.dataset.id}/${b.dataset.h}/`, { metodo: 'POST' }); toast({ retirar: 'Herramienta retirada.', devolver: 'Herramienta devuelta.', enviar_calibracion: 'Enviada a calibración.', calibrada: 'Calibración registrada.' }[b.dataset.h]); ruta(); } catch (x) { b.disabled = false; toast(x.message, true); } }));
}
async function sTraspaso(el) {
  const crea = permiso('traspasos', 'crear');
  const [ult, bor] = await Promise.all([lista('traspasos', { limite: 5 }), crea ? obtener('/traspaso/borrador/') : Promise.resolve(null)]);
  const R = bor?.datos.resumen;
  const sec = (t, items, vacio) => `<div style="margin:12px 0"><b>${esc(t)}</b>${items.length ? `<ul style="margin:6px 0 0;padding-left:20px">${items.map((x) => `<li>${x}</li>`).join('')}</ul>` : `<div class="sub">${esc(vacio)}</div>`}</div>`;
  el.innerHTML = titulo('Traspaso de turno', crea ? 'El resumen se arma solo con el estado de la planta. Revíselo, agregue sus notas y entréguelo.' : 'Entregas de turno recientes.') +
    (crea ? `<form class="tarjeta" id="f" novalidate><h2>Estado de la planta</h2>
      ${sec('Órdenes de trabajo abiertas', R.ordenes.map((o) => `${esc(o.numero)} · ${esc(o.equipo)} (${esc(o.estado)}${o.sin_avance ? ', sin avance' : ''}) — ${esc(o.responsable)}`), 'Ninguna.')}
      ${sec('Equipos fuera de servicio', R.equipos_fuera_servicio.map((e) => `${esc(e.equipo)} · ${esc(e.estado)}`), 'Todos operando.')}
      ${sec('Alarmas activas', R.alarmas.map((a) => esc(a.mensaje)), 'Sin alarmas.')}${sec('Fallas sin tomar', R.fallas_sin_tomar.map((a) => `${esc(a.equipo)}: ${esc(a.descripcion)}`), 'Ninguna.')}
      ${sec('Stock crítico bajo el mínimo', R.stock_critico.map((s) => `${esc(s.repuesto)} (stock ${s.stock}, mínimo ${s.minimo})`), 'Sin faltantes críticos.')}${sec('Producto contenido', R.no_conformidades.map((n) => `Lote ${esc(n.lote)}: ${esc(n.defecto)}`), 'Ninguno.')}${sec('Incidentes abiertos', R.incidentes.map((i) => esc(i.descripcion)), 'Ninguno.')}
      <h2 style="margin-top:20px">Qué se revisa en un traspaso</h2>${bor.datos.items_revision.map((x, i) => `<label class="check"><input type="checkbox" data-i="${i}"><span>${esc(x)}</span></label>`).join('')}
      ${campoHtml({ n: 'notas', l: 'Notas para el turno que entra', t: 'textarea', ph: 'Pruebas hechas, descartes y pendientes' })}${campoHtml({ n: 'responsables', l: 'Responsables y plazo de respuesta', ph: 'Nombres o cargos' })}<div class="aviso-error" hidden></div><button class="btn bloque" disabled>Entregar el turno</button></form>` : '')
    + `<section class="tarjeta"><h2>Entregas recientes</h2>${ult.filas.length ? ult.filas.map((t) => `<div class="fila-it" style="display:block"><b>Turno ${esc(t.turno)} · ${esc(corto(t.autor_nombre))}</b> <small>${fechaHora(t.creado)}</small>${t.notas ? `<p style="margin:6px 0 0">${esc(t.notas)}</p>` : ''}${t.responsables ? `<small>Responsables: ${esc(t.responsables)}</small>` : ''}</div>`).join('') : '<p class="vacio">Aún no hay entregas.</p>'}</section>`;
  const f = $('#f', el); if (!f) return;
  const total = bor.datos.items_revision.length, btn = $('.btn.bloque', f);
  f.addEventListener('change', () => { btn.disabled = $$('.check input', f).filter((c) => c.checked).length < total; });
  f.onsubmit = async (e) => { e.preventDefault(); btn.disabled = true;
    try { const r = await enviarConCola('/traspasos/', { turno: U.turno, resumen: R, notas: f.elements.notas.value, responsables: f.elements.responsables.value }, 'Traspaso de turno'); toast(r.encolado ? 'Sin señal: el traspaso se enviará solo.' : 'Turno entregado. Gracias.'); ruta(); }
    catch (x) { btn.disabled = false; const a = $('.aviso-error', f); a.textContent = x.message; a.hidden = false; } };
}

// ------------------------------------------------------------------ seguridad, calidad y paradas
const TIPOS_INC = [['condicion_insegura', 'Vi una condición insegura'], ['casi_accidente', 'Casi tuve un accidente'], ['incidente', 'Ocurrió un incidente']];
async function sSeguridad(el) {
  const modo = el._modo || 'reportar', S = await refSeguridad(), prev = U.rol === 'prevencion';
  const [{ filas: inc }, { filas: acc }, { filas: eqs }] = await Promise.all([modo === 'incidentes' ? lista('incidentes') : { filas: [] }, modo === 'acciones' && permiso('acciones_hse', 'leer') ? lista('acciones_hse') : { filas: [] }, lista('equipos')]);
  const tabs = [['reportar', 'Reportar'], ['incidentes', 'Incidentes']].concat(permiso('acciones_hse', 'leer') ? [['acciones', 'Acciones']] : []);
  let cuerpo = '';
  if (modo === 'reportar') {
    const campos = [{ n: 'tipo', l: '¿Qué pasó?', t: 'tipos', op: TIPOS_INC }, { n: 'descripcion', l: '¿Qué vio o qué ocurrió?', t: 'textarea', req: 1 }, { n: 'ubicacion', l: 'Lugar' }, { n: 'equipo', l: 'Máquina involucrada', t: 'select', op: [['', 'Ninguna'], ...eqs.map((e) => [e.id, e.nombre_habitual])] }];
    cuerpo = `<form class="tarjeta" id="f" novalidate><p class="sub" style="margin-top:0">Cualquier persona puede reportar. Su aviso llega a prevención y a su supervisor. La producción no prevalece sobre la seguridad.</p>${campos.map((c) => campoHtml(c)).join('')}<div class="aviso-error" hidden></div><button class="btn bloque">Enviar reporte</button></form>
      <details class="tarjeta"><summary><b>Reglas básicas de seguridad</b></summary><p>${esc(S.buenas_practicas)}</p><b>Bloqueo y etiquetado (LOTO)</b><ol class="pasos">${S.loto.map((x) => `<li>${esc(x)}</li>`).join('')}</ol><b>En Chile</b><ul>${S.chile.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>`;
  } else if (modo === 'incidentes') {
    cuerpo = `<section class="tarjeta">${inc.length ? inc.map((i) => `<div class="fila-it" style="align-items:flex-start"><div class="t"><b>${esc(i.descripcion)}</b><small>${esc(i.tipo_display)} · ${esc(i.ubicacion || 'sin lugar')} · ${fechaHora(i.creado)}</small><small>Reportó ${esc(corto(i.reportado_por_nombre))}</small></div><div style="display:grid;gap:6px;justify-items:end">${chip(i.estado_display, TONO[i.estado])}${permiso('incidentes', 'editar') && i.estado !== 'cerrado' ? `<button class="btn chico sec" data-inc="${i.id}" data-e="${i.estado === 'abierto' ? 'en_investigacion' : 'cerrado'}">${i.estado === 'abierto' ? 'Investigar' : 'Cerrar'}</button>` : ''}</div></div>`).join('') : '<p class="vacio">No hay incidentes registrados.</p>'}</section>`;
  } else {
    cuerpo = `${prev ? '<button class="btn" id="nueva-acc">Nueva acción preventiva</button>' : ''}<section class="tarjeta">${acc.length ? acc.map((a) => `<div class="fila-it" style="align-items:flex-start"><div class="t"><b>${esc(a.descripcion)}</b><small>${esc(a.responsable || 'Sin responsable')} · vence ${fecha(a.vence)}</small></div><div style="display:grid;gap:6px;justify-items:end">${a.cerrada_en ? chip('Cerrada', 'verde') : chip(a.vencida ? 'Vencida' : 'En plazo', a.vencida ? 'rojo' : '')}${prev && !a.cerrada_en ? `<button class="btn chico ok" data-acc="${a.id}">Cerrar</button>` : ''}</div></div>`).join('') : '<p class="vacio">Sin acciones.</p>'}</section>`;
  }
  el.innerHTML = titulo('Seguridad', 'Reporte condiciones inseguras, casi accidentes e incidentes.') + pestanas(tabs, modo) + cuerpo;
  $$('[data-p]', el).forEach((b) => (b.onclick = () => { el._modo = b.dataset.p; sSeguridad(el); }));
  $$('[data-inc]', el).forEach((b) => (b.onclick = async () => { try { await api(`/incidentes/${b.dataset.inc}/`, { metodo: 'PATCH', cuerpo: { estado: b.dataset.e } }); toast('Incidente actualizado.'); sSeguridad(el); } catch (x) { toast(x.message, true); } }));
  $$('[data-acc]', el).forEach((b) => (b.onclick = async () => { try { await api(`/acciones_hse/${b.dataset.acc}/`, { metodo: 'PATCH', cuerpo: { cerrada_en: ahoraIso() } }); toast('Acción cerrada.'); sSeguridad(el); } catch (x) { toast(x.message, true); } }));
  $('#nueva-acc', el)?.addEventListener('click', async () => { const r = await hoja({ titulo: 'Nueva acción', campos: [{ n: 'descripcion', l: 'Acción', req: 1 }, { n: 'responsable', l: 'Responsable' }, { n: 'vence', l: 'Vence', t: 'date', req: 1 }], valores: { vence: hoyIso() }, enviar: (d) => api('/acciones_hse/', { metodo: 'POST', cuerpo: d }) }); if (r) { toast('Acción creada.'); sSeguridad(el); } });
  const f = $('#f', el);
  if (f) { const campos = [{ n: 'tipo', t: 'tipos' }, { n: 'descripcion', req: 1 }, { n: 'ubicacion' }, { n: 'equipo' }];
    f.onsubmit = async (e) => { e.preventDefault(); if (!validarObligatorios(f, campos)) return; const b = $('.btn.bloque', f); b.disabled = true;
      try { const d = leerForm(f, campos); const r = await enviarConCola('/incidentes/', d, 'Reporte de seguridad'); toast(r.encolado ? 'Sin señal: el reporte se enviará solo.' : 'Reporte enviado a prevención.'); f.reset(); b.disabled = false; }
      catch (x) { b.disabled = false; const a = $('.aviso-error', f); a.textContent = x.message; a.hidden = false; errores(f, campos, x); } }; }
}
async function sCalidad(el) {
  const { filas, viejo } = await lista('noconformidades'), crea = permiso('noconformidades', 'crear'), edita = permiso('noconformidades', 'editar');
  el.innerHTML = titulo('No conformidades', 'Producto contenido o en análisis: no se libera sin autorización de calidad.') + (crea ? '<button class="btn" id="nueva">Registrar no conformidad</button>' : '') + aviso(viejo) +
    `<section class="tarjeta">${filas.length ? filas.map((n) => `<div class="fila-it" style="align-items:flex-start"><div class="t"><b>Lote ${esc(n.lote)} · ${esc(n.producto)}</b><small>${esc(n.defecto)} · ${n.cantidad} u. · ${esc(n.equipo_nombre || '')}</small>${n.disposicion ? `<small>Disposición: ${esc(n.disposicion)}</small>` : ''}</div><div style="display:grid;gap:6px;justify-items:end">${chip(n.estado_display, TONO[n.estado])}${edita && ['contenido', 'en_analisis'].includes(n.estado) ? `<button class="btn chico sec" data-nc="${n.id}">Resolver</button>` : ''}</div></div>`).join('') : '<p class="vacio">No hay no conformidades registradas.</p>'}</section>`;
  $('#nueva', el)?.addEventListener('click', async () => { const { filas: eq } = await lista('equipos');
    const r = await hoja({ titulo: 'Nueva no conformidad', campos: [{ n: 'lote', l: 'Lote', req: 1 }, { n: 'producto', l: 'Producto', req: 1 }, { n: 'equipo', l: 'Equipo', t: 'select', op: [['', 'Ninguno'], ...eq.map((e) => [e.id, e.nombre_habitual])] }, { n: 'defecto', l: 'Defecto', req: 1 }, { n: 'cantidad', l: 'Cantidad afectada', t: 'number', req: 1 }, { n: 'estado', l: 'Estado', t: 'select', op: [['contenido', 'Contenido'], ['en_analisis', 'En análisis']] }], enviar: (d) => api('/noconformidades/', { metodo: 'POST', cuerpo: d }) });
    if (r) { toast('No conformidad registrada.'); ruta(); } });
  $$('[data-nc]', el).forEach((b) => (b.onclick = async () => { const r = await hoja({ titulo: 'Resolver', boton: 'Guardar', campos: [{ n: 'estado', l: 'Resultado', t: 'select', op: [['en_analisis', 'En análisis'], ['liberado', 'Liberado'], ['rechazado', 'Rechazado']] }, { n: 'disposicion', l: 'Disposición', t: 'textarea' }], enviar: (d) => api(`/noconformidades/${b.dataset.nc}/`, { metodo: 'PATCH', cuerpo: d }) }); if (r) { toast('Actualizada.'); ruta(); } }));
}
async function sParadas(el) {
  const { filas, viejo } = await lista('paradas', { limite: 40 });
  el.innerHTML = titulo('Paradas de máquina', 'Registre cuándo y por qué se detiene un equipo: de aquí salen la disponibilidad y el OEE.') + (permiso('paradas', 'crear') ? '<button class="btn" id="nueva">Registrar una parada</button>' : '') + aviso(viejo) +
    `<section class="tarjeta">${filas.length ? filas.map((p) => `<div class="fila-it" style="align-items:flex-start"><div class="t"><b>${esc(p.equipo_nombre)}</b><small>${esc(p.motivo_display)}${p.nota ? ' · ' + esc(p.nota) : ''}${p.automatica ? ' · automática' : ''}</small><small>${fechaHora(p.inicio)}${p.fin ? ' → ' + fechaHora(p.fin) : ' · en curso'} · ${p.minutos} min</small></div><div style="display:grid;gap:6px;justify-items:end">${chip(p.activa ? 'Activa' : 'Cerrada', p.activa ? 'rojo' : '')}${p.activa && permiso('paradas', 'editar') && !p.automatica ? `<button class="btn chico ok" data-fin="${p.id}">Terminar</button>` : ''}</div></div>`).join('') : '<p class="vacio">Sin paradas registradas.</p>'}</section>`;
  $('#nueva', el)?.addEventListener('click', async () => { const { filas: eq } = await lista('equipos');
    const r = await hoja({ titulo: 'Registrar una parada', campos: [{ n: 'equipo', l: 'Máquina', t: 'select', req: 1, op: [['', 'Elija la máquina'], ...eq.map((e) => [e.id, `${e.nombre_habitual} · ${e.zona}`])] }, { n: 'motivo', l: 'Motivo', t: 'select', op: [['falla', 'Falla del equipo'], ['cambio_formato', 'Cambio de formato'], ['falta_material', 'Falta de material'], ['sin_operador', 'Sin operador'], ['calidad', 'Ajuste por calidad'], ['planificada', 'Mantención planificada'], ['otro', 'Otro']] }, { n: 'nota', l: 'Detalle', t: 'textarea' }], boton: 'Registrar', enviar: (d) => api('/paradas/', { metodo: 'POST', cuerpo: { ...d, inicio: ahoraIso() } }) });
    if (r) { toast('Parada registrada. El equipo queda detenido.'); ruta(); } });
  $$('[data-fin]', el).forEach((b) => (b.onclick = async () => { try { await api(`/paradas/${b.dataset.fin}/`, { metodo: 'PATCH', cuerpo: { fin: ahoraIso() } }); toast('Parada terminada. El equipo vuelve a operar.'); ruta(); } catch (x) { toast(x.message, true); } }));
}

// ------------------------------------------------------------------ catálogo, mi cargo, perfil
const CATS = [['maquinaria', 'Máquinas'], ['automatizacion', 'Automatización'], ['pieza', 'Piezas'], ['herramienta', 'Herramientas']];
async function sCatalogo(el) {
  const { filas, viejo } = await lista('fichas', { limite: 100 }); const modo = el._modo || 'maquinaria';
  el.innerHTML = titulo('Catálogo técnico', '45 fichas del informe de manufactura: función, especificaciones, piezas, herramientas y fallas frecuentes.') + entradaFiltro('Buscar en todo el catálogo') + pestanas(CATS, modo) + aviso(viejo) +
    `<section class="tarjeta" id="lista">${filas.map((f) => `<a class="fila-it" data-cat="${f.categoria}" href="#/catalogo/${f.id}" ${f.categoria !== modo ? 'hidden' : ''}><div style="width:64px;flex:none" class="e-operando">${f.categoria === 'maquinaria' ? svgMaquina(f.icono) : `<div class="chip negro" style="display:block;text-align:center;padding:14px 0">${esc(f.nombre.slice(0, 3))}</div>`}</div><div class="t"><b>${esc(f.nombre)}</b><small>${esc(f.funcion)}</small></div></a>`).join('')}</section>`;
  $$('[data-p]', el).forEach((b) => (b.onclick = () => { el._modo = b.dataset.p; $$('[data-p]', el).forEach((x) => x.classList.toggle('on', x === b)); $$('#lista [data-cat]', el).forEach((a) => (a.hidden = a.dataset.cat !== b.dataset.p)); $('#filtro', el).value = ''; }));
  const inp = $('#filtro', el); inp.oninput = () => { const t = inp.value.toLowerCase(); $$('#lista [data-cat]', el).forEach((a) => (a.hidden = t ? !a.textContent.toLowerCase().includes(t) : a.dataset.cat !== el._modo)); };
}
async function sFicha(el, id) {
  const { datos: f } = await obtener(`/fichas/${id}/`);
  el.innerHTML = `${volver('catalogo', 'Catálogo')}<section class="tarjeta ficha-cab e-operando"><div>${f.categoria === 'maquinaria' ? svgMaquina(f.icono) : ''}</div><div><h1 class="display" style="font-size:34px;margin:0">${esc(f.nombre)}</h1><div class="sub">${esc(f.categoria_display)}</div></div></section>
    <section class="tarjeta"><div class="dato"><span>Función</span><b>${esc(f.funcion)}</b></div><div class="dato"><span>Especificaciones orientativas</span><b>${esc(f.especificaciones)}</b></div>
      <p><b>Piezas</b></p><div class="chips-f">${f.piezas.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div><p><b>Herramientas de mantenimiento</b></p><div class="chips-f">${f.herramientas.map((x) => `<span class="chip negro">${esc(x)}</span>`).join('')}</div>
      <p><b>Fallas frecuentes</b></p><div class="chips-f">${f.fallas.map((x) => `<span class="chip rojo">${esc(x)}</span>`).join('')}</div></section><p class="sub">Rangos orientativos: verifique siempre la ficha del fabricante y los procedimientos de seguridad.</p>`;
}
async function sMiCargo(el) {
  const { datos: d } = await obtener('/mi-cargo/'), c = d.cargo;
  el.innerHTML = titulo('Mi cargo', `${d.perfil} · ${d.turno}`) +
    (c ? `<section class="tarjeta"><h2>${esc(c.nombre)}</h2><p class="sub" style="margin-top:-6px">${esc(c.familia_nombre)} · cargo ${c.numero} de 64</p>${[['Para qué existe', c.existe], ['Qué hago', c.hace], ['Qué entrego o registro', c.entrega], ['Con quién me coordino', c.coordina], ['Cómo se mide mi trabajo', c.medir], ['Conocimientos clave', c.conocimientos]].map(([a, b]) => `<div class="dato" style="display:block"><span>${a}</span><b style="display:block;text-align:left;margin-top:2px">${esc(b)}</b></div>`).join('')}</section>` : '<div class="tarjeta"><p class="vacio">Su usuario no tiene un cargo asignado. Pida a su jefatura que lo asigne en SIMA.</p></div>') +
    (d.kpis.length ? `<section class="tarjeta"><h2>Mis indicadores</h2>${d.kpis.map(filaKpi).join('')}</section>` : '') +
    (d.momento_actual != null ? `<section class="tarjeta"><h2>Mi día</h2>${d.rutina_dia.map((m, i) => `<div class="momento ${i === d.momento_actual ? 'ahora' : ''}"><b>${esc(m.momento)}</b><span>${esc(m.acciones)}</span><small>${esc(m.quienes)}</small></div>`).join('')}</section>` : '') +
    (d.pendientes.length ? tarjetaLista('Rutinas pendientes', d.pendientes.map((p) => ({ ruta: accesibles().includes('rutinas') ? `rutinas/${p.id}` : '', titulo: p.nombre, detalle: p.frecuencia, etiqueta: 'Pendiente', tono: 'ambar' }))) : '');
  activar(el);
}
let instalar = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); instalar = e; });
async function sPerfil(el) {
  const c = cola(), rc = rechazados();
  el.innerHTML = titulo('Mi perfil') + `<section class="tarjeta"><div class="dato"><span>Nombre</span><b>${esc(corto(U.nombre))}</b></div><div class="dato"><span>Cargo</span><b>${esc(U.cargo?.nombre || '—')}</b></div><div class="dato"><span>Perfil</span><b>${esc(U.rol_nombre)}</b></div><div class="dato"><span>Turno</span><b>${esc(U.turno_nombre)}</b></div><div class="dato"><span>Correo</span><b>${esc(U.email)}</b></div><div class="dato"><span>Servidor</span><b>${esc(ORIGEN_API)}</b></div></section>
    <section class="tarjeta"><h2>Registros sin conexión</h2><div class="dato"><span>Esperando para enviarse</span><b>${c.length}</b></div>${c.map((x) => `<small class="sub" style="display:block">${esc(x.etiqueta)} · ${fechaHora(new Date(x.ts).toISOString())}</small>`).join('')}
      ${rc.length ? `<div class="aviso-error" style="margin-top:10px"><b>El servidor rechazó ${rc.length} registro(s):</b>${rc.map((x) => `<br>${esc(x.etiqueta)}: ${esc(x.error)}`).join('')}</div><button class="btn sec" id="desc">Entendido, quitar este aviso</button>` : ''}<button class="btn sec bloque" id="sync" style="margin-top:10px">Enviar ahora</button></section>
    ${instalar ? '<button class="btn sec bloque" id="inst">Instalar la aplicación en este equipo</button>' : ''}<button class="btn negro bloque" id="out">Cerrar sesión</button>`;
  $('#sync', el).onclick = async () => { const n = await sincronizar(); toast(n ? `${n} registro(s) enviado(s).` : navigator.onLine ? 'No hay nada pendiente.' : 'Sin conexión: se enviará cuando vuelva la señal.'); sPerfil(el); };
  $('#desc', el)?.addEventListener('click', () => { descartarRechazados(); sPerfil(el); }); $('#inst', el)?.addEventListener('click', () => instalar.prompt());
  $('#out', el).onclick = () => { if (cola().length && !confirm(`Hay ${cola().length} registro(s) sin enviar en este equipo. Si cierra sesión podrían perderse. ¿Cerrar sesión igual?`)) return; detener(); cerrarSesion(false); };
}
async function sMas(el) { el.innerHTML = titulo('Más') + `<div class="grupo-mas">${U.extras.map((m) => `<a href="#/${m}">${ICONOS[m] || ICONOS.mas}${TITULOS[m] || m}</a>`).join('')}</div>`; }

// ------------------------------------------------------------------ enrutador
const PANTALLAS = { inicio: sInicio, mapa: sMapa, equipos: sEquipos, equipo: sEquipo, monitor: sMonitor, reportar: sReportar, mis_reportes: sMisReportes, reportes: sReportes, ordenes: sOrdenes, orden: sOrden, avisar: sAvisar, avisos: sAvisos, repuestos: sRepuestos,
  planificacion: sPlanificacion, notas: sNotas, informes: sInformes, indicadores: sIndicadores, plcs: sPlcs, plc: sPlc, rutinas: sRutinas, rutina: sRutina, herramientas: sHerramientas, traspaso: sTraspaso, seguridad: sSeguridad, calidad: sCalidad,
  paradas: sParadas, catalogo: sCatalogo, ficha: sFicha, mi_cargo: sMiCargo, perfil: sPerfil, mas: sMas };
const DETALLE = { equipos: 'equipo', ordenes: 'orden', plcs: 'plc', rutinas: 'rutina', catalogo: 'ficha' };
let profundidad = 0;
async function ruta() {
  detener();
  const [camino, query = ''] = location.hash.replace(/^#\//, '').split('?'), [base0, arg] = camino.split('/');
  let base = base0 || 'inicio';
  if (!accesibles().includes(base) && !['perfil', 'mas'].includes(base)) base = 'inicio';
  const nombre = arg && DETALLE[base] ? DETALLE[base] : base, prof = arg ? 2 : 1, atras = prof < profundidad; profundidad = prof;
  $$('.nav-inf [data-r]').forEach((a) => { const on = a.dataset.r === base || (a.dataset.r === 'mas' && U.extras.includes(base)); a.classList.toggle('activo', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
  moverIndicador();
  const viejo = $('#vista'), el = viejo.cloneNode(false); viejo.replaceWith(el);
  document.title = `${TITULOS[base] || 'SIMA'} · SIMA`; el.innerHTML = esqueleto(base === 'inicio' ? 'panel' : 'lista');
  try { await PANTALLAS[nombre](el, arg, new URLSearchParams(query)); el.classList.add(atras ? 'entra-atras' : 'entra'); window.scrollTo(0, 0); moverIndicador(); }
  catch (e) { if (e.estado !== 401) el.innerHTML = `<div class="aviso-error">${esc(sinRed(e) ? 'Sin conexión y sin datos guardados de esta pantalla. Ábrala una vez con señal para poder verla después sin conexión.' : e.message)}</div>`; }
}
function arrancar() { estructura(); if (!location.hash) location.hash = '#/inicio'; ruta(); sincronizar(); sondeoGlobal(); }
window.addEventListener('hashchange', () => U && ruta());
onCerrar((porInactividad) => { detener(); U = null; pantallaAcceso(porInactividad ? 'Su sesión terminó por inactividad. Ingrese de nuevo.' : ''); });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
const s = sesion();
if (s) { U = s.usuario; arrancar(); api('/me/').then((u) => { U = u; actualizarUsuario(u); }).catch(() => {}); } else pantallaAcceso();
