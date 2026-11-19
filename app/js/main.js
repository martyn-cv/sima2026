import { api, obtener, lista, sesion, guardarSesion, actualizarUsuario, cerrarSesion, onCerrar, enviarConCola, sincronizar, cola, rechazados,
  descartarRechazados, pendientesDe, sinRed, ORIGEN_API } from './api.js';
import { $, $$, esc, clp, fecha, fechaHora, hoyIso, ICONOS, TITULOS, TONO, chip, kpi, fila, tarjetaLista, donut, barras, campoHtml, activarFotos,
  leerForm, errores, validarObligatorios, hoja, toast } from './ui.js';

let U = null;
const raiz = $('#raiz');
const permiso = (r, a) => U.permisos[r]?.[a];
const accesibles = () => [...U.menu, ...U.extras, 'inicio'];
const mediaUrl = (p) => (p ? `${ORIGEN_API}${p}?t=${encodeURIComponent(sesion()?.token || '')}` : '');
const nombreCorto = (n) => n.split('·')[0].trim();
const iniciales = (n) => nombreCorto(n).split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
const aviso = (viejo, ts) => (viejo ? `<p class="dato-viejo">Sin conexión · datos guardados el ${fechaHora(new Date(ts || Date.now()).toISOString())}</p>` : '');

// ------------------------------------------------------------------ acceso
const DEMO = [['operador', 'Operador', 'Operador2026'], ['tecnico', 'Técnico', 'Tecnico2026'], ['ing.terreno', 'Ing. de terreno', 'Terreno2026'], ['ing.mantenimiento', 'Ing. de mantenimiento', 'Mantenimiento2026'],
  ['ing.mecanico', 'Ing. mecánico', 'Mecanico2026'], ['ing.automatizacion', 'Ing. de automatización', 'Automatizacion2026']];
function pantallaAcceso(mensaje = '') {
  raiz.innerHTML = `<div class="acceso"><div class="cab"><div class="marca"><i></i>SIMA</div><h1 class="display">Mantención en terreno</h1><p>Reporte de fallas, órdenes de trabajo y repuestos, aun sin señal. Para finanzas, contratos y procesos use la web.</p></div>
  <form id="f" novalidate><h2 class="display">Ingresar</h2><div class="aviso-error" id="err" ${mensaje ? '' : 'hidden'}>${esc(mensaje)}</div>
    <label class="campo"><span>Correo corporativo</span><input name="email" type="email" autocomplete="username" required placeholder="usuario@manuandina.cl"></label>
    <label class="campo"><span>Contraseña</span><input name="password" type="password" autocomplete="current-password" required></label>
    <button class="btn bloque">Ingresar</button><div class="demo">Cuentas de demostración:<br>${DEMO.map(([e, n]) => `<button type="button" data-e="${e}">${n}</button>`).join(' · ')}</div></form></div>`;
  const f = $('#f');
  $$('.demo button').forEach((b) => (b.onclick = () => { const d = DEMO.find((x) => x[0] === b.dataset.e); f.email.value = d[0] + '@manuandina.cl'; f.password.value = d[2]; }));
  f.onsubmit = async (e) => {
    e.preventDefault(); const err = $('#err'); err.hidden = true;
    try { const r = await api('/login/', { metodo: 'POST', publico: true, cuerpo: { email: f.email.value, password: f.password.value, canal: 'app' } }); guardarSesion(r.token, r.usuario); U = r.usuario; arrancar(); }
    catch (x) { err.textContent = x.message; err.hidden = false; }
  };
}

// ------------------------------------------------------------------ estructura
function estructura() {
  const link = (m, extra = '') => `<a href="#/${m}" data-r="${m}" class="${extra}">${ICONOS[m]}<span>${TITULOS[m]}</span></a>`;
  raiz.innerHTML = `<div class="app"><header class="cab-app"><div class="fila"><button class="avatar" id="av" aria-label="Mi perfil">${esc(iniciales(U.nombre))}</button>
    <div class="quien"><b>${esc(nombreCorto(U.nombre))}</b><small>${esc(U.rol_nombre)}</small></div>
    <button class="campana" id="campana" aria-label="Notificaciones">${ICONOS.campana}<span class="n" id="nn" ${U.no_leidas ? '' : 'hidden'}>${U.no_leidas}</span></button></div>
    <div class="busca" role="search">${ICONOS.buscar}<input id="q" type="search" autocomplete="off" placeholder="Buscar equipos, órdenes, repuestos…" aria-label="Buscar"><div class="res-busca" id="res"></div></div></header>
    <div class="estado-red" id="red" role="status"></div><main id="vista" tabindex="-1"></main>
    <nav class="nav-inf" aria-label="Menú principal">${U.menu.map((m) => link(m)).join('')}${U.extras.length ? `<a href="#/mas" data-r="mas" class="solo-movil">${ICONOS.mas}<span>Más</span></a><span class="nav-lat-extra">Más</span>${U.extras.map((m) => link(m, 'solo-desk')).join('')}` : ''}</nav></div>`;
  $('#av').onclick = () => (location.hash = '#/perfil'); $('#campana').onclick = notificaciones;
  buscador(); estadoRed();
}
function estadoRed() {
  const r = $('#red'); if (!r) return;
  const n = cola().length;
  if (!navigator.onLine) { r.className = 'estado-red visible'; r.textContent = `Sin conexión${n ? ` · ${n} registro(s) esperando para enviarse` : ''}. Puede seguir registrando.`; }
  else if (n) { r.className = 'estado-red visible'; r.textContent = `Enviando ${n} registro(s) pendiente(s)…`; }
  else r.className = 'estado-red';
}
window.addEventListener('online', estadoRed); window.addEventListener('offline', estadoRed); window.addEventListener('sima-cola', estadoRed);
window.addEventListener('sima-sincronizado', (e) => { toast(`${e.detail} registro(s) enviado(s) al servidor.`); const h = location.hash; if (/ordenes|reportes|avisos|mis_reportes/.test(h)) ruta(); });

function appRuta(r) {   // ruta de un resultado de búsqueda → ruta que este perfil sí tiene
  const base = r.split('/')[0];
  if (accesibles().includes(base)) return r;
  if (base === 'reportes' && U.menu.includes('mis_reportes')) return 'mis_reportes';
  return accesibles().includes('equipos') ? 'equipos' : 'inicio';
}
function buscador() {
  const q = $('#q'), res = $('#res'); let t;
  q.addEventListener('input', () => { clearTimeout(t); const v = q.value.trim(); if (v.length < 2) { res.classList.remove('abierto'); return; }
    t = setTimeout(async () => { try { const items = (await api('/buscar/', { params: { q: v } })).resultados; let g = '';
      res.innerHTML = items.length ? items.map((x) => { const c = g !== x.tipo ? `<div class="grupo">${esc(x.tipo)}</div>` : ''; g = x.tipo; return `${c}<a href="#/${esc(appRuta(x.ruta))}"><b>${esc(x.titulo)}</b><small>${esc(x.detalle)}</small></a>`; }).join('') : `<p class="vacio">No hay resultados para “${esc(v)}”.</p>`;
      res.classList.add('abierto'); } catch (e) { toast(sinRed(e) ? 'Sin conexión: la búsqueda necesita señal.' : e.message, true); } }, 250); });
  res.addEventListener('click', () => { res.classList.remove('abierto'); q.value = ''; });
  document.addEventListener('click', (e) => { if (!e.target.closest('.busca')) res.classList.remove('abierto'); });
  q.addEventListener('keydown', (e) => { if (e.key === 'Escape') { res.classList.remove('abierto'); q.blur(); } if (e.key === 'Enter') res.querySelector('a')?.click(); });
}
async function notificaciones() {
  const fondo = document.createElement('div'); fondo.className = 'hoja-fondo'; document.body.append(fondo);
  fondo.innerHTML = '<div class="hoja"><h2 class="display">Notificaciones</h2><p class="cargando">Cargando…</p></div>';
  fondo.onclick = (e) => e.target === fondo && fondo.remove();
  try {
    const ns = (await api('/notificaciones/')).resultados;
    fondo.firstChild.innerHTML = `<h2 class="display">Notificaciones</h2><div class="tarjeta">${ns.length ? ns.slice(0, 30).map((n) => `<a class="fila-it" href="#/${esc(appRuta(n.destino || 'inicio'))}" style="${n.leida ? 'opacity:.6' : ''}"><div class="t"><b>${esc(n.texto)}</b><small>${fechaHora(n.creada)}</small></div>${n.leida ? '' : chip('Nueva', 'rojo')}</a>`).join('') : '<p class="vacio">No tiene notificaciones.</p>'}</div><div class="pie"><button class="btn" id="cer">Cerrar</button></div>`;
    $('#cer', fondo).onclick = () => fondo.remove(); fondo.addEventListener('click', (e) => e.target.closest('a') && fondo.remove());
    if (ns.some((n) => !n.leida)) { await api('/notificaciones/leer/', { metodo: 'POST' }); $('#nn').hidden = true; }
  } catch (e) { fondo.firstChild.innerHTML = `<h2 class="display">Notificaciones</h2><div class="aviso-error">${esc(sinRed(e) ? 'Sin conexión: no se pueden ver las notificaciones.' : e.message)}</div>`; }
}

// ------------------------------------------------------------------ pantallas
const cargando = (el) => (el.innerHTML = '<p class="cargando">Cargando…</p>');
const titulo = (t, sub = '') => `<div><h1 class="display titulo-pagina">${esc(t)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div>`;
const pestanas = (opts, activa) => `<div class="pestanas" role="tablist">${opts.map(([k, l]) => `<button role="tab" data-p="${k}" class="${k === activa ? 'on' : ''}" aria-selected="${k === activa}">${esc(l)}</button>`).join('')}</div>`;
const EST_VACIO = (t, a = '') => `<div class="tarjeta"><p class="vacio">${esc(t)}</p>${a}</div>`;

const ACCIONES = {
  operador: [['reportar', 'Avisar una falla', ''], ['mis_reportes', 'Mis reportes', 'sec'], ['equipos', 'Información de equipos', 'sec']],
  tecnico: [['avisar', 'Avisar a ingenieros', ''], ['reportar', 'Reportar una falla', 'sec'], ['ordenes', 'Mis órdenes', 'sec']],
  ing_terreno: [['avisos', 'Avisos de técnicos', ''], ['ordenes', 'Órdenes', 'sec'], ['reportes', 'Fallas por atender', 'sec']],
  ing_mantenimiento: [['planificacion', 'Planificación', ''], ['indicadores', 'Indicadores', 'sec'], ['ordenes', 'Órdenes', 'sec']],
  ing_mecanico: [['equipos', 'Máquinas', ''], ['ordenes', 'Órdenes', 'sec'], ['repuestos', 'Repuestos', 'sec']],
  ing_automatizacion: [['plcs', 'PLC', ''], ['avisos', 'Avisos', 'sec'], ['equipos', 'Equipos', 'sec']],
};

async function sInicio(el) {
  const { datos: d } = await obtener('/dashboard/');
  const [k1, ...resto] = d.kpis;
  const h = new Date().getHours();
  el.innerHTML = `<section class="tarjeta-roja"><div class="sup"><span>${esc(U.rol_nombre)}</span><span>${new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
    <h1 class="display">${h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'}, ${esc(nombreCorto(U.nombre).split(' ')[0])}</h1>
    <div class="cifra">${esc(k1.valor)}</div><div class="lab">${esc(k1.etiqueta)}${k1.detalle ? ' · ' + esc(k1.detalle) : ''}</div></section>
    <div class="acciones-rapidas">${(ACCIONES[U.rol] || []).filter(([r]) => accesibles().includes(r)).map(([r, t, c]) => `<a class="btn ${c}" href="#/${r}">${esc(t)}</a>`).join('')}</div>
    <div class="mini-kpis">${resto.map(kpi).join('')}</div>
    ${d.donuts.length ? `<section class="tarjeta"><h2>Indicadores</h2><div class="donuts">${d.donuts.map((x) => donut(x.valor, x.etiqueta, x.detalle)).join('')}</div></section>` : ''}
    ${d.barras.map((b) => barras(b.titulo, b.items, (v) => (v > 9999 ? clp(v) : v))).join('')}
    <div class="dos-col">${d.listas.map((l) => tarjetaLista(l.titulo, l.items.map((i) => ({ ruta: i.ruta, titulo: i.titulo, detalle: i.detalle, etiqueta: i.etiqueta, tono: i.tono })), l.vacio)).join('')}</div>`;
}

function filtroLocal(el, selector) {
  const inp = $('#filtro', el); if (!inp) return;
  inp.oninput = () => { const t = inp.value.toLowerCase(); $$(selector, el).forEach((r) => (r.hidden = t && !r.textContent.toLowerCase().includes(t))); };
}
const entradaFiltro = (ph) => `<div class="busca"><input id="filtro" type="search" placeholder="${esc(ph)}" aria-label="${esc(ph)}">${ICONOS.buscar}</div>`;

async function sEquipos(el) {
  const { filas, viejo } = await lista('equipos');
  el.innerHTML = titulo('Equipos', 'Toque una máquina para ver su historial y manual.') + entradaFiltro('Filtrar por nombre o lugar') + aviso(viejo) +
    `<section class="tarjeta" id="lista">${filas.map((e) => fila({ ruta: `equipos/${e.id}`, titulo: e.nombre_habitual, detalle: `${e.ubicacion} · ${e.codigo}`, etiqueta: e.estado_display, tono: TONO[e.estado] })).join('')}</section>`;
  filtroLocal(el, '.fila-it');
}
async function sEquipo(el, id) {
  const { datos: e, viejo, ts } = await obtener(`/equipos/${id}/`);
  const hist = e.historial;
  el.innerHTML = `<a href="#/equipos" class="btn sec chico" style="align-self:flex-start">← Equipos</a>${titulo(e.nombre_habitual, `${e.ubicacion} · ${e.codigo}`)}${aviso(viejo, ts)}
    <section class="tarjeta"><div class="dato"><span>Equipo</span><b>${esc(e.marca)} ${esc(e.modelo)}</b></div><div class="dato"><span>Estado</span>${chip(e.estado_display, TONO[e.estado])}</div><div class="dato"><span>Criticidad</span>${chip(e.criticidad_display, TONO[e.criticidad])}</div></section>
    <div class="acciones-rapidas">${e.manual ? `<a class="btn negro" href="${esc(mediaUrl(e.manual))}" target="_blank" rel="noopener">Manual</a>` : '<span class="chip" style="align-self:center;padding:14px">Sin manual disponible</span>'}
      ${permiso('reportes', 'crear') ? `<a class="btn" href="#/reportar?equipo=${e.id}">Avisar falla</a>` : ''}${accesibles().includes('avisar') ? `<a class="btn sec" href="#/avisar?equipo=${e.id}">Avisar a ingenieros</a>` : ''}
      ${e.manual || !permiso('notas', 'crear') ? '' : '<button class="btn sec" id="man">Cargar manual</button>'}</div>
    ${hist ? `<section class="tarjeta"><h2>Últimas 5 intervenciones</h2>${hist.length ? hist.map((o) => `<a class="fila-it" href="#/ordenes/${o.id}" style="align-items:flex-start"><div class="t"><b>${fecha(o.fecha)} · ${esc(o.falla)}</b><small>Acción: ${esc(o.accion || 'sin registros')}</small><small>Repuestos: ${esc(o.repuestos.join(', ') || 'ninguno')}</small></div>${chip(o.estado_display, TONO[o.estado_display === 'Cerrada' ? 'cerrada' : 'abierta'])}</a>`).join('') : '<p class="vacio">Sin historial registrado</p>'}</section>` : ''}
    ${e.notas?.length ? tarjetaLista('Notas del equipo', e.notas.map((n) => ({ titulo: n.titulo, detalle: n.texto.slice(0, 120), etiqueta: '' }))) : ''}
    ${e.plcs?.length ? tarjetaLista('PLC de este equipo', e.plcs.map((p) => ({ ruta: accesibles().includes('plcs') ? `plcs/${p.id}` : '', titulo: p.nombre, detalle: `${p.marca} ${p.modelo}`, etiqueta: p.estado_display, tono: TONO[p.estado] }))) : ''}`;
  $('#man', el)?.addEventListener('click', () => {
    const inp = Object.assign(document.createElement('input'), { type: 'file', accept: '.pdf,.doc,.docx' });
    inp.onchange = () => { const f = inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = async () => { try { await api(`/equipos/${id}/manual/`, { metodo: 'POST', cuerpo: { archivo_b64: r.result, archivo_nombre: f.name } }); toast('Manual cargado.'); ruta(); } catch (x) { toast(x.message, true); } }; r.readAsDataURL(f); };
    inp.click();
  });
}

const selectEquipo = (filas, id) => ({ n: 'equipo', l: 'Máquina', t: 'select', req: 1, op: [['', 'Elija la máquina'], ...filas.map((e) => [e.id, `${e.nombre_habitual} · ${e.ubicacion}`])] });
async function sReportar(el, _, q) {
  const { filas } = await lista('equipos');
  const campos = [selectEquipo(filas), { n: 'descripcion', l: '¿Qué le pasa a la máquina?', t: 'textarea', req: 1, ph: 'Cuente brevemente qué está pasando' }, { n: 'foto', l: 'Foto de la placa o de la falla', t: 'foto' }, { n: 'detiene_linea', l: 'Detiene la línea de producción', t: 'checkbox' }];
  el.innerHTML = titulo('Avisar una falla', 'Elija la máquina por su nombre habitual. La foto es opcional.') + `<form class="tarjeta" id="f" novalidate>${campos.map((c) => campoHtml(c, c.n === 'equipo' ? q.get('equipo') || '' : '')).join('')}<div class="aviso-error" hidden></div><button class="btn bloque">Enviar aviso</button></form>`;
  const f = $('#f', el); activarFotos(f);
  f.onsubmit = async (e) => {
    e.preventDefault(); if (!validarObligatorios(f, campos)) return;
    const b = $('.btn', f); b.disabled = true;
    try {
      const r = await enviarConCola('/reportes/', leerForm(f, campos), 'Reporte de falla');
      toast(r.encolado ? 'Sin señal: el reporte quedó guardado y se enviará solo.' : 'Aviso enviado. Mantención ya puede verlo.');
      location.hash = U.menu.includes('mis_reportes') ? '#/mis_reportes' : '#/reportes';
    } catch (x) { b.disabled = false; const a = $('.aviso-error', f); a.textContent = x.message; a.hidden = false; errores(f, campos, x); }
  };
}
async function sMisReportes(el) {
  const { filas, viejo } = await lista('reportes');
  const pend = pendientesDe('/reportes/');
  el.innerHTML = titulo('Mis reportes', 'Vea si un técnico ya tomó su aviso.') + `<a class="btn" href="#/reportar">Avisar una falla</a>` + aviso(viejo) +
    (pend.length ? `<section class="tarjeta"><h2>Pendientes de envío</h2>${pend.map((p) => fila({ titulo: 'Reporte guardado en este equipo', detalle: p.cuerpo.descripcion.slice(0, 80), etiqueta: 'Sin enviar', tono: 'ambar' })).join('')}</section>` : '') +
    `<section class="tarjeta">${filas.length ? filas.map((r) => fila({ titulo: r.equipo_nombre, detalle: `${r.descripcion.slice(0, 80)} · ${fechaHora(r.creado)}${r.tecnico_nombre ? ' · ' + nombreCorto(r.tecnico_nombre) : ''}`, etiqueta: r.estado_display, tono: TONO[r.estado] })).join('') : '<p class="vacio">Aún no ha enviado reportes.</p>'}</section>`;
}
async function sReportes(el) {
  const { filas, viejo } = await lista('reportes');
  const modo = el._modo || 'pend';
  const ver = filas.filter((r) => modo === 'todos' || r.estado === 'enviado');
  el.innerHTML = titulo('Reportes de falla', 'Avisos de operadores.') + pestanas([['pend', 'Sin tomar'], ['todos', 'Todos']], modo) + aviso(viejo) +
    `<section class="tarjeta">${ver.length ? ver.map((r) => `<div class="fila-it" style="align-items:flex-start"><div class="t"><b>${esc(r.equipo_nombre)}</b><small>${esc(r.descripcion)}</small><small>${esc(nombreCorto(r.operador_nombre))} · ${fechaHora(r.creado)}</small>${r.foto ? `<a href="${esc(mediaUrl(r.foto))}" target="_blank" rel="noopener">Ver foto</a>` : ''}</div>
      <div style="display:grid;gap:6px;justify-items:end">${chip(r.estado_display, TONO[r.estado])}${r.detiene_linea ? chip('Detiene la línea', 'rojo') : ''}${r.estado === 'enviado' && U.rol === 'tecnico' ? `<button class="btn chico ok" data-tomar="${r.id}">Tomar</button>` : ''}${r.orden_id && accesibles().includes('ordenes') ? `<a class="btn chico sec" href="#/ordenes/${r.orden_id}">Ver orden</a>` : ''}</div></div>`).join('') : '<p class="vacio">No hay reportes pendientes.</p>'}</section>`;
  $$('[data-p]', el).forEach((b) => (b.onclick = () => { el._modo = b.dataset.p; sReportes(el); }));
  $$('[data-tomar]', el).forEach((b) => (b.onclick = async () => { b.disabled = true; try { const r = await api(`/reportes/${b.dataset.tomar}/tomar/`, { metodo: 'POST' }); toast(`Tomó el reporte. Se creó la ${r.numero}.`); location.hash = `#/ordenes/${r.orden_id}`; } catch (x) { b.disabled = false; toast(x.message, true); if (x.estado === 409) ruta(); } }));
}

const sinAvance = (o) => (o.sin_avance ? chip(`${o.horas_sin_avance} h sin avance`, 'rojo') : '');
async function sOrdenes(el) {
  const modo = el._modo || (U.rol === 'tecnico' ? 'mias' : 'abiertas');
  const params = modo === 'mias' ? { mias: 1, excluir_estado: 'cerrada' } : modo === 'cerradas' ? { estado: 'cerrada', limite: 40 } : { excluir_estado: 'cerrada' };
  const { filas, viejo } = await lista('ordenes', params);
  el.innerHTML = titulo('Órdenes de trabajo') + pestanas([['mias', 'Mías'], ['abiertas', 'Abiertas'], ['cerradas', 'Cerradas']], modo) + entradaFiltro('Filtrar órdenes') + aviso(viejo) +
    `<section class="tarjeta">${filas.length ? filas.map((o) => fila({ ruta: `ordenes/${o.id}`, titulo: `${o.numero} · ${o.titulo.slice(0, 70)}`, detalle: `${o.equipo_nombre} · ${o.estado_display}${o.sin_avance ? '' : ' · ' + o.prioridad_display}`, etiqueta: o.sin_avance ? `${o.horas_sin_avance} h sin avance` : o.prioridad_display, tono: o.sin_avance ? 'rojo' : TONO[o.prioridad] })).join('') : '<p class="vacio">No hay órdenes en esta lista.</p>'}</section>`;
  $$('[data-p]', el).forEach((b) => (b.onclick = () => { el._modo = b.dataset.p; sOrdenes(el); })); filtroLocal(el, '.fila-it');
}
async function sOrden(el, id) {
  const { datos: o, viejo } = await obtener(`/ordenes/${id}/`);
  const pend = pendientesDe(`/ordenes/${id}/bitacora/`);
  const abierta = o.estado !== 'cerrada';
  const accionesRep = (u) => abierta && u.estado !== 'usado' ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">${u.estado !== 'reservado' && u.suficiente ? `<button class="btn chico sec" data-ra="reservar" data-id="${u.id}">Reservar</button>` : ''}${u.estado === 'requerido' && !u.suficiente ? `<button class="btn chico sec" data-ra="solicitar" data-id="${u.id}">Marcar solicitado</button>` : ''}${u.estado === 'reservado' || u.suficiente ? `<button class="btn chico ok" data-ra="entregar" data-id="${u.id}">Registrar entrega</button>` : ''}</div>` : '';
  el.innerHTML = `<a href="#/ordenes" class="btn sec chico" style="align-self:flex-start">← Órdenes</a>${titulo(`${o.numero} · ${o.titulo}`)}${aviso(viejo)}
    <section class="tarjeta"><div class="dato"><span>Equipo</span><a href="#/equipos/${o.equipo}"><b>${esc(o.equipo_nombre)}</b></a></div><div class="dato"><span>Estado</span>${chip(o.estado_display, TONO[o.estado])}</div><div class="dato"><span>Prioridad</span>${chip(o.prioridad_display, TONO[o.prioridad])}</div><div class="dato"><span>Asignada a</span><b>${esc(nombreCorto(o.asignado_a_nombre) || 'Sin asignar')}</b></div><div class="dato"><span>Horas registradas</span><b>${o.horas_trabajadas}</b></div>${o.descripcion ? `<p>${esc(o.descripcion)}</p>` : ''}</section>
    ${o.sin_avance ? `<div class="alerta">${o.horas_sin_avance} horas sin avance en un equipo crítico.</div>` : ''}
    ${o.traspaso ? `<div class="destacado"><b>Nota de traspaso · ${esc(nombreCorto(o.traspaso.autor_nombre))} · ${fechaHora(o.traspaso.creado)}</b>${esc(o.traspaso.texto)}</div>` : ''}
    ${abierta ? `<div class="acciones-rapidas">${o.estado === 'abierta' ? '<button class="btn" data-est="en_curso">Iniciar</button>' : ''}<button class="btn negro" data-est="cerrada">Cerrar orden</button></div>` : ''}
    <section class="tarjeta"><h2>Repuestos</h2>${o.repuestos.length ? o.repuestos.map((u) => `<div class="fila-it" style="display:block"><div style="display:flex;gap:10px;justify-content:space-between"><b>${esc(u.repuesto_nombre)} × ${u.cantidad}</b>${chip(u.estado_display, u.estado === 'usado' ? 'verde' : '')}</div>${u.estado !== 'usado' && u.estado !== 'reservado' ? `<small>${u.suficiente ? `Suficiente (stock ${u.stock})` : `Insuficiente (stock ${u.stock})`}</small>` : ''}${accionesRep(u)}</div>`).join('') : '<p class="vacio">Sin repuestos.</p>'}
      ${abierta ? '<button class="btn sec bloque" id="add-rep" style="margin-top:12px">Agregar repuesto requerido</button>' : ''}</section>
    <section class="tarjeta"><h2>Bitácora</h2>${abierta ? `<form id="fb" novalidate>${campoHtml({ n: 'texto', l: 'Diagnóstico o acción realizada', t: 'textarea', req: 1 })}${campoHtml({ n: 'horas', l: 'Horas trabajadas', t: 'number', ph: '0' })}${campoHtml({ n: 'es_traspaso', l: 'Es nota de traspaso para el siguiente turno', t: 'checkbox' })}<div class="aviso-error" hidden></div><button class="btn bloque">Guardar registro</button><p class="sub" style="font-size:14px">Sin señal: se guarda en este equipo y se envía solo.</p></form>` : ''}
      <div class="cronologia" style="margin-top:16px">${pend.map((p) => `<div class="it"><small>Pendiente de envío</small><i>${esc(p.cuerpo.texto)}</i></div>`).join('')}${[...o.bitacora].reverse().map((b) => `<div class="it ${b.es_traspaso ? 'traspaso' : ''}"><small>${fechaHora(b.creado)} · ${esc(nombreCorto(b.autor_nombre))}${b.horas ? ` · ${b.horas} h` : ''}${b.es_traspaso ? ' · TRASPASO' : ''}</small>${esc(b.texto)}</div>`).join('') || '<p class="vacio">Sin registros.</p>'}</div></section>`;
  $$('[data-est]', el).forEach((b) => (b.onclick = async () => { if (b.dataset.est === 'cerrada' && !confirm('¿Cerrar la orden?')) return; try { await api(`/ordenes/${id}/estado/`, { metodo: 'POST', cuerpo: { estado: b.dataset.est } }); toast('Estado actualizado.'); ruta(); } catch (x) { toast(x.message, true); } }));
  $$('[data-ra]', el).forEach((b) => (b.onclick = async () => { b.disabled = true; try { await api(`/repuestos-ot/${b.dataset.id}/${b.dataset.ra}/`, { metodo: 'POST' }); toast('Listo.'); ruta(); } catch (x) { b.disabled = false; toast(x.message, true); } }));
  $('#add-rep', el)?.addEventListener('click', async () => {
    const { filas } = await lista('repuestos');
    const r = await hoja({ titulo: 'Agregar repuesto', boton: 'Agregar', campos: [{ n: 'repuesto', l: 'Repuesto', t: 'select', req: 1, op: [['', 'Elija el repuesto'], ...filas.map((x) => [x.id, `${x.nombre} · ${x.bodega} · stock ${x.stock}`])] }, { n: 'cantidad', l: 'Cantidad', t: 'number', req: 1 }], valores: { cantidad: 1 },
      enviar: (d) => api(`/ordenes/${id}/repuestos/`, { metodo: 'POST', cuerpo: d }) });
    if (r) { toast('Repuesto agregado como requerido.'); ruta(); }
  });
  const fb = $('#fb', el);
  if (fb) fb.onsubmit = async (e) => {
    e.preventDefault(); const campos = [{ n: 'texto', req: 1 }, { n: 'horas' }, { n: 'es_traspaso', t: 'checkbox' }]; if (!validarObligatorios(fb, campos)) return;
    const b = $('.btn', fb); b.disabled = true;
    try { const d = leerForm(fb, campos); d.horas = Number(d.horas) || 0; const r = await enviarConCola(`/ordenes/${id}/bitacora/`, d, `Bitácora ${o.numero}`);
      toast(r.encolado ? 'Sin señal: registro guardado en este equipo. Se enviará solo.' : 'Registro guardado en la bitácora.'); ruta(); }
    catch (x) { b.disabled = false; const a = $('.aviso-error', fb); a.textContent = x.message; a.hidden = false; errores(fb, campos, x); }
  };
}

const TIPOS_AVISO = [['arreglo_menor', 'Arreglé algo pequeño'], ['pendiente', 'Falta algo por arreglar'], ['repuesto', 'Falta un repuesto'], ['informativo', 'Solo informo']];
async function sAvisar(el, _, q) {
  const { filas } = await lista('equipos');
  const campos = [{ n: 'tipo', l: '¿Qué quiere avisar?', t: 'tipos', op: TIPOS_AVISO }, selectEquipo(filas), { n: 'texto', l: 'Detalle', t: 'textarea', req: 1, ph: 'Qué hizo o qué falta' }];
  el.innerHTML = titulo('Avisar a los ingenieros', 'Los ingenieros de terreno reciben una notificación.') + `<form class="tarjeta" id="f" novalidate>${campos.map((c) => campoHtml(c, c.n === 'equipo' ? q.get('equipo') || '' : '')).join('')}<div class="aviso-error" hidden></div><button class="btn bloque">Enviar aviso</button></form>`;
  const f = $('#f', el);
  f.onsubmit = async (e) => {
    e.preventDefault(); if (!validarObligatorios(f, campos)) return; const b = $('.btn', f); b.disabled = true;
    try { const r = await enviarConCola('/avisos/', leerForm(f, campos), 'Aviso a ingenieros'); toast(r.encolado ? 'Sin señal: el aviso se enviará solo.' : 'Aviso enviado a los ingenieros.'); location.hash = '#/avisos'; }
    catch (x) { b.disabled = false; const a = $('.aviso-error', f); a.textContent = x.message; a.hidden = false; errores(f, campos, x); }
  };
}
async function sAvisos(el) {
  const gestiona = permiso('avisos', 'editar');
  const modo = el._modo || 'pend';
  const { filas, viejo } = await lista('avisos');
  const ver = filas.filter((a) => modo === 'todos' || !a.atendido);
  el.innerHTML = titulo(gestiona ? 'Avisos de técnicos' : 'Mis avisos', gestiona ? 'Trabajos pequeños hechos y pendientes que informan los técnicos.' : 'Lo que avisó a los ingenieros.') + pestanas([['pend', 'Pendientes'], ['todos', 'Todos']], modo) + aviso(viejo) +
    `<section class="tarjeta">${ver.length ? ver.map((a) => `<div class="fila-it" style="align-items:flex-start"><div class="t"><b>${esc(a.equipo_nombre)}</b><small>${esc(a.texto)}</small><small>${esc(nombreCorto(a.autor_nombre))} · ${fechaHora(a.creado)}</small></div><div style="display:grid;gap:6px;justify-items:end">${chip(a.tipo_display, a.tipo === 'pendiente' || a.tipo === 'repuesto' ? 'ambar' : 'verde')}${a.atendido ? chip('Atendido', 'verde') : gestiona ? `<button class="btn chico ok" data-at="${a.id}">Marcar atendido</button>` : ''}</div></div>`).join('') : '<p class="vacio">No hay avisos.</p>'}</section>
    ${accesibles().includes('avisar') ? '<a class="btn" href="#/avisar">Nuevo aviso</a>' : ''}`;
  $$('[data-p]', el).forEach((b) => (b.onclick = () => { el._modo = b.dataset.p; sAvisos(el); }));
  $$('[data-at]', el).forEach((b) => (b.onclick = async () => { b.disabled = true; try { await api(`/avisos/${b.dataset.at}/`, { metodo: 'PATCH', cuerpo: { atendido: true } }); toast('Aviso marcado como atendido.'); ruta(); } catch (x) { b.disabled = false; toast(x.message, true); } }));
}
async function sRepuestos(el) {
  const { filas, viejo } = await lista('repuestos');
  const bajo = el._bajo;
  const ver = filas.filter((r) => !bajo || r.bajo_minimo);
  el.innerHTML = titulo('Repuestos', 'Stock por bodega y tipo.') + entradaFiltro('Buscar repuesto, bodega o tipo') + pestanas([['todos', 'Todos'], ['bajo', 'Bajo el mínimo']], bajo ? 'bajo' : 'todos') + aviso(viejo) +
    `<section class="tarjeta">${ver.map((r) => fila({ titulo: r.nombre, detalle: `${r.codigo} · ${r.tipo} · ${r.bodega}`, etiqueta: `Stock ${r.stock}`, tono: r.bajo_minimo ? 'rojo' : 'verde' })).join('') || '<p class="vacio">Sin resultados.</p>'}</section>`;
  $$('[data-p]', el).forEach((b) => (b.onclick = () => { el._bajo = b.dataset.p === 'bajo'; sRepuestos(el); })); filtroLocal(el, '.fila-it');
}

let mesCal = hoyIso().slice(0, 7);
async function sPlanificacion(el) {
  const { datos: d, viejo } = await obtener('/calendario/', { mes: mesCal });
  const [y, m] = mesCal.split('-').map(Number), primero = new Date(y, m - 1, 1), dias = new Date(y, m, 0).getDate(), off = (primero.getDay() + 6) % 7;
  const iso = (n) => `${mesCal}-${String(n).padStart(2, '0')}`;
  const celdas = [...Array(off).fill(null), ...Array.from({ length: dias }, (_, i) => i + 1)];
  const mover = (n) => { const f = new Date(y, m - 1 + n, 1); mesCal = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`; sPlanificacion(el); };
  el.innerHTML = titulo('Planificación') + aviso(viejo) + `<section class="tarjeta"><div class="cal-nav"><button data-m="-1" aria-label="Mes anterior">‹</button><h2 class="display">${primero.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</h2><button data-m="1" aria-label="Mes siguiente">›</button></div>
    <div class="cal-mes">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x) => `<div class="c cab">${x}</div>`).join('')}${celdas.map((n) => n ? `<div class="c ${iso(n) === hoyIso() ? 'hoy' : ''} ${d.eventos.some((e) => e.inicio <= iso(n) && e.fin >= iso(n)) ? 'ev' : ''}">${n}</div>` : '<div class="c otro"></div>').join('')}</div></section>
    ${permiso('planes', 'crear') ? '<button class="btn" id="nuevo">Nuevo plan</button>' : ''}
    <section class="tarjeta"><h2>Este mes</h2>${d.eventos.length ? d.eventos.map((e) => fila({ titulo: e.titulo, detalle: `${fecha(e.inicio)} – ${fecha(e.fin)}`, etiqueta: e.estado })).join('') : '<p class="vacio">No hay actividades planificadas este mes.</p>'}</section>`;
  $$('[data-m]', el).forEach((b) => (b.onclick = () => mover(+b.dataset.m)));
  $('#nuevo', el)?.addEventListener('click', async () => {
    const { filas } = await lista('equipos');
    const r = await hoja({ titulo: 'Nuevo plan', campos: [{ n: 'titulo', l: 'Título', req: 1 }, { n: 'tipo', l: 'Tipo', t: 'select', op: [['preventivo', 'Mantención preventiva'], ['equipo', 'Equipo de mantenimiento'], ['optimizacion', 'Optimización de máquinas']] },
      { n: 'equipo', l: 'Equipo', t: 'select', op: [['', 'Sin equipo específico'], ...filas.map((e) => [e.id, e.nombre_habitual])] }, { n: 'fecha_inicio', l: 'Desde', t: 'date', req: 1 }, { n: 'fecha_fin', l: 'Hasta', t: 'date', req: 1 }, { n: 'descripcion', l: 'Detalle', t: 'textarea' }],
      valores: { fecha_inicio: hoyIso(), fecha_fin: hoyIso() }, enviar: (d) => api('/planes/', { metodo: 'POST', cuerpo: d }) });
    if (r) { toast('Plan guardado.'); ruta(); }
  });
}
async function sNotas(el) {
  const { filas, viejo } = await lista('notas');
  el.innerHTML = titulo('Notas y recomendaciones', 'Conocimiento de los técnicos para los demás turnos.') + `<button class="btn" id="nueva">Nueva nota</button>` + aviso(viejo) +
    `<section class="tarjeta">${filas.length ? filas.map((n) => `<div class="fila-it" style="display:block"><b>${esc(n.titulo)}</b> ${chip(n.tipo_display)}<small>${esc(n.equipo_nombre || 'General')} · ${esc(nombreCorto(n.autor_nombre))} · ${fecha(n.creada)}</small><p style="margin:6px 0 0">${esc(n.texto)}</p></div>`).join('') : '<p class="vacio">Aún no hay notas.</p>'}</section>`;
  $('#nueva', el).onclick = async () => {
    const { filas: eq } = await lista('equipos');
    const r = await hoja({ titulo: 'Nueva nota', campos: [{ n: 'tipo', l: 'Tipo', t: 'select', op: [['recomendacion', 'Recomendación'], ['nota', 'Nota']] }, { n: 'titulo', l: 'Título', req: 1 }, { n: 'equipo', l: 'Equipo', t: 'select', op: [['', 'General (sin equipo)'], ...eq.map((e) => [e.id, e.nombre_habitual])] }, { n: 'texto', l: 'Detalle', t: 'textarea', req: 1 }], boton: 'Publicar', enviar: (d) => api('/notas/', { metodo: 'POST', cuerpo: d }) });
    if (r) { toast('Nota publicada.'); ruta(); }
  };
}
async function sInformes(el) {
  const { filas, viejo } = await lista('informes');
  el.innerHTML = titulo('Informes', U.rol === 'tecnico' ? 'Informes compartidos con los técnicos.' : '') + (permiso('informes', 'crear') ? '<button class="btn" id="nuevo">Nuevo informe</button>' : '') + aviso(viejo) +
    `<section class="tarjeta">${filas.length ? filas.map((i) => `<details class="fila-it" style="display:block"><summary><b>${esc(i.titulo)}</b> ${i.compartido ? chip('Compartido', 'verde') : chip('Privado')}<small>${esc(nombreCorto(i.autor_nombre))} · ${fecha(i.creado)}</small></summary><p style="white-space:pre-wrap">${esc(i.contenido)}</p>${permiso('informes', 'editar') ? `<button class="btn chico sec" data-cp="${i.id}" data-v="${i.compartido ? 0 : 1}">${i.compartido ? 'Dejar privado' : 'Compartir con los técnicos'}</button>` : ''}</details>`).join('') : '<p class="vacio">Aún no hay informes.</p>'}</section>`;
  $$('[data-cp]', el).forEach((b) => (b.onclick = async () => { try { await api(`/informes/${b.dataset.cp}/`, { metodo: 'PATCH', cuerpo: { compartido: b.dataset.v === '1' } }); ruta(); } catch (x) { toast(x.message, true); } }));
  $('#nuevo', el)?.addEventListener('click', async () => { const r = await hoja({ titulo: 'Nuevo informe', campos: [{ n: 'titulo', l: 'Título', req: 1 }, { n: 'contenido', l: 'Contenido', t: 'textarea', req: 1 }, { n: 'compartido', l: 'Compartir con los técnicos', t: 'checkbox' }], enviar: (d) => api('/informes/', { metodo: 'POST', cuerpo: d }) }); if (r) { toast('Informe guardado.'); ruta(); } });
}
async function sIndicadores(el) {
  const { datos: i, viejo } = await obtener('/indicadores/');
  const tot = Object.values(i.ot_por_estado).reduce((a, b) => a + b, 0);
  el.innerHTML = titulo('Indicadores', 'Valores preliminares de gestión.') + aviso(viejo) +
    `<div class="mini-kpis">${kpi({ etiqueta: 'MTTR', valor: i.mttr_horas == null ? '—' : i.mttr_horas + ' h', detalle: 'Tiempo medio de reparación', tono: 'neutro' })}${kpi({ etiqueta: 'MTBF (aprox.)', valor: i.mtbf_horas == null ? '—' : i.mtbf_horas + ' h', detalle: 'Entre fallas', tono: 'neutro' })}${kpi({ etiqueta: 'Fallas (90 días)', valor: i.fallas_90d, detalle: '', tono: 'neutro' })}${kpi({ etiqueta: 'Costo de repuestos (30 d)', valor: clp(i.costo_mantencion_30d), detalle: '', tono: 'neutro' })}</div>
    <section class="tarjeta"><h2>Resumen</h2><div class="donuts">${donut(i.disponibilidad, 'Disponibilidad', 'equipos operativos')}${donut(tot ? Math.round((100 * i.ot_por_estado.cerrada) / tot) : 0, 'Órdenes cerradas', 'del total')}</div></section>
    <div class="dos-col">${barras('Equipos con más fallas', i.fallas_por_equipo.map((f) => ({ etiqueta: f.equipo, valor: f.fallas })))}${barras('Costo de repuestos por equipo', i.costo_por_equipo.map((f) => ({ etiqueta: f.equipo, valor: f.costo })), clp)}</div><p class="sub">${esc(i.nota)}</p>`;
}
async function sPlcs(el) {
  const { filas, viejo } = await lista('plcs');
  el.innerHTML = titulo('PLC', 'Controladores de las líneas y máquinas.') + entradaFiltro('Filtrar por nombre, marca o IP') + aviso(viejo) +
    `<section class="tarjeta">${filas.map((p) => fila({ ruta: `plcs/${p.id}`, titulo: p.nombre, detalle: `${p.equipo_nombre} · ${p.marca} ${p.modelo}${p.ip ? ' · ' + p.ip : ''}`, etiqueta: p.estado_display, tono: TONO[p.estado] })).join('')}</section>`; filtroLocal(el, '.fila-it');
}
async function sPlc(el, id) {
  const { datos: p, viejo } = await obtener(`/plcs/${id}/`);
  el.innerHTML = `<a href="#/plcs" class="btn sec chico" style="align-self:flex-start">← PLC</a>${titulo(p.nombre, p.equipo_nombre)}${aviso(viejo)}
    <section class="tarjeta">${[['Estado', chip(p.estado_display, TONO[p.estado])], ['Marca y modelo', `<b>${esc(p.marca)} ${esc(p.modelo)}</b>`], ['Dirección IP', `<b>${esc(p.ip || '—')}</b>`], ['Versión del programa', `<b>${esc(p.programa_version || '—')}</b>`], ['Última revisión', `<b>${fecha(p.ultima_revision)}</b>`]].map(([a, b]) => `<div class="dato"><span>${a}</span>${b}</div>`).join('')}${p.observaciones ? `<p>${esc(p.observaciones)}</p>` : ''}</section>
    ${permiso('plcs', 'editar') ? '<button class="btn" id="ed">Actualizar estado y programa</button>' : ''}`;
  $('#ed', el)?.addEventListener('click', async () => {
    const r = await hoja({ titulo: 'Actualizar PLC', campos: [{ n: 'estado', l: 'Estado', t: 'select', op: [['en_linea', 'En línea'], ['alarma', 'Con alarma'], ['fuera_de_linea', 'Fuera de línea']] }, { n: 'programa_version', l: 'Versión del programa' }, { n: 'ip', l: 'Dirección IP' }, { n: 'ultima_revision', l: 'Última revisión', t: 'date' }, { n: 'observaciones', l: 'Observaciones', t: 'textarea' }], valores: p, enviar: (d) => api(`/plcs/${id}/`, { metodo: 'PATCH', cuerpo: d }) });
    if (r) { toast('PLC actualizado.'); ruta(); }
  });
}
let instalar = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); instalar = e; });
async function sPerfil(el) {
  const c = cola(), rc = rechazados();
  el.innerHTML = titulo('Mi perfil') + `<section class="tarjeta"><div class="dato"><span>Nombre</span><b>${esc(nombreCorto(U.nombre))}</b></div><div class="dato"><span>Cargo</span><b>${esc(U.rol_nombre)}</b></div><div class="dato"><span>Correo</span><b>${esc(U.email)}</b></div><div class="dato"><span>Servidor</span><b>${esc(ORIGEN_API)}</b></div></section>
    <section class="tarjeta"><h2>Registros sin conexión</h2><div class="dato"><span>Esperando para enviarse</span><b>${c.length}</b></div>${c.map((x) => `<small class="sub" style="display:block">${esc(x.etiqueta)} · ${fechaHora(new Date(x.ts).toISOString())}</small>`).join('')}
      ${rc.length ? `<div class="aviso-error" style="margin-top:10px"><b>El servidor rechazó ${rc.length} registro(s):</b>${rc.map((x) => `<br>${esc(x.etiqueta)}: ${esc(x.error)}`).join('')}</div><button class="btn sec" id="desc">Entendido, quitar este aviso</button>` : ''}
      <button class="btn sec bloque" id="sync" style="margin-top:10px">Enviar ahora</button></section>
    ${instalar ? '<button class="btn sec bloque" id="inst">Instalar la aplicación en este equipo</button>' : ''}<button class="btn negro bloque" id="out">Cerrar sesión</button>`;
  $('#sync', el).onclick = async () => { const n = await sincronizar(); toast(n ? `${n} registro(s) enviado(s).` : navigator.onLine ? 'No hay nada pendiente.' : 'Sin conexión: se enviará cuando vuelva la señal.'); sPerfil(el); };
  $('#desc', el)?.addEventListener('click', () => { descartarRechazados(); sPerfil(el); }); $('#inst', el)?.addEventListener('click', () => instalar.prompt());
  $('#out', el).onclick = () => { if (cola().length && !confirm(`Hay ${cola().length} registro(s) sin enviar en este equipo. Si cierra sesión podrían perderse. ¿Cerrar sesión igual?`)) return; cerrarSesion(false); };
}
async function sMas(el) {
  el.innerHTML = titulo('Más') + `<div class="grupo-mas">${U.extras.map((m) => `<a href="#/${m}">${ICONOS[m]}${TITULOS[m]}</a>`).join('')}</div>`;
}

// ------------------------------------------------------------------ router
const PANTALLAS = { inicio: sInicio, equipos: sEquipos, equipo: sEquipo, reportar: sReportar, mis_reportes: sMisReportes, reportes: sReportes, ordenes: sOrdenes, orden: sOrden, avisar: sAvisar, avisos: sAvisos,
  repuestos: sRepuestos, planificacion: sPlanificacion, notas: sNotas, informes: sInformes, indicadores: sIndicadores, plcs: sPlcs, plc: sPlc, perfil: sPerfil, mas: sMas };
const DETALLE = { equipos: 'equipo', ordenes: 'orden', plcs: 'plc' };
async function ruta() {
  const [camino, query = ''] = location.hash.replace(/^#\//, '').split('?');
  const [base0, arg] = camino.split('/');
  let base = base0 || 'inicio';
  if (!accesibles().includes(base) && !['perfil', 'mas'].includes(base)) base = 'inicio';
  const nombre = arg && DETALLE[base] ? DETALLE[base] : base;
  $$('.nav-inf [data-r]').forEach((a) => { const on = a.dataset.r === base || (a.dataset.r === 'mas' && U.extras.includes(base)); a.classList.toggle('activo', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
  const viejo = $('#vista'), el = viejo.cloneNode(false); viejo.replaceWith(el);    // contenedor nuevo: sin eventos de pantallas anteriores
  document.title = `${TITULOS[base] || 'SIMA'} · SIMA`; cargando(el);
  try { await PANTALLAS[nombre](el, arg, new URLSearchParams(query)); window.scrollTo(0, 0); }
  catch (e) { if (e.estado !== 401) el.innerHTML = `<div class="aviso-error">${esc(sinRed(e) ? 'Sin conexión y sin datos guardados de esta pantalla. Ábrala una vez con señal para poder verla después sin conexión.' : e.message)}</div>`; }
}
function arrancar() { estructura(); if (!location.hash) location.hash = '#/inicio'; ruta(); sincronizar(); }
window.addEventListener('hashchange', () => U && ruta());
onCerrar((porInactividad) => { U = null; pantallaAcceso(porInactividad ? 'Su sesión terminó por inactividad. Ingrese de nuevo.' : ''); });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
const s = sesion();
if (s) { U = s.usuario; arrancar(); api('/me/').then((u) => { U = u; actualizarUsuario(u); }).catch(() => {}); } else pantallaAcceso();
