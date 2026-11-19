import { api, listar, sesion, guardarSesion, cerrarSesion, onCerrar } from './api.js';
import { $, $$, esc, clp, fecha, ICONOS, TITULOS, TONO_ESTADO, chip, hero, kpi, listaItems, donut, barrasH, graficoMensual,
  tabla, activarTabla, filtrarFilas, exportarCSV, formularioModal, toast } from './ui.js';

let U = null;                                  // usuario con sesión
const raiz = $('#raiz');
const hoyIso = () => new Date().toISOString().slice(0, 10);
const opciones = (o) => Object.entries(o);

// ------------------------------------------------------------------ acceso
const DEMO = [['administrativo', 'Administrativo', 'Administrativo2026'], ['ejecutivo', 'Ejecutivo', 'Ejecutivo2026'], ['civil.industrial', 'Ing. civil industrial', 'Industrial2026'],
  ['encargado.procesos', 'Encargado de procesos', 'Procesos2026'], ['ing.transporte', 'Ing. de transporte', 'Transporte2026']];

function pantallaAcceso(mensaje = '') {
  raiz.innerHTML = `<div class="acceso"><section class="acceso-hero"><div class="marca"><i></i>SIMA</div>
    <h1 class="display">Toda la planta, en un solo lugar</h1>
    <p>Finanzas, contratos, procesos y transporte de Manufacturas Andina S.A. Los equipos de terreno trabajan en la aplicación móvil y de escritorio.</p></section>
    <section class="acceso-form"><form id="f-acceso" novalidate><h2 class="display">Ingresar</h2><p class="nota">Use su correo @manuandina.cl</p>
    <div class="aviso-error" id="err" ${mensaje ? '' : 'hidden'}>${esc(mensaje)}</div>
    <label class="campo"><span>Correo corporativo</span><input name="email" type="email" autocomplete="username" required autofocus placeholder="usuario@manuandina.cl"></label>
    <label class="campo"><span>Contraseña</span><input name="password" type="password" autocomplete="current-password" required></label>
    <button class="btn" style="width:100%">Ingresar</button>
    <div class="demo">Cuentas de demostración:<br>${DEMO.map(([e, n]) => `<button type="button" data-e="${e}">${n}</button>`).join(' · ')}</div></form></section></div>`;
  const f = $('#f-acceso');
  $$('.demo button').forEach((b) => b.onclick = () => { const d = DEMO.find((x) => x[0] === b.dataset.e); f.email.value = d[0] + '@manuandina.cl'; f.password.value = d[2]; });
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = $('#err'); err.hidden = true;
    try {
      const r = await api('/login/', { metodo: 'POST', publico: true, cuerpo: { email: f.email.value, password: f.password.value, canal: 'web' } });
      guardarSesion(r.token, r.usuario); U = r.usuario; arrancar();
    } catch (x) { err.textContent = x.message; err.hidden = false; }
  };
}

// ------------------------------------------------------------------ estructura
const iniciales = (n) => n.split('·')[0].trim().split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

function estructura() {
  const plegado = localStorage.getItem('sima_plegado') === '1';
  raiz.innerHTML = `<div class="app ${plegado ? 'plegado' : ''}" id="app">
  <aside class="lateral" aria-label="Menú principal"><div class="logo"><i></i><span>SIMA</span></div>
    <nav>${U.menu.map((m) => `<a href="#/${m}" data-r="${m}" title="${TITULOS[m]}">${ICONOS[m]}<span class="txt">${TITULOS[m]}</span></a>`).join('')}</nav>
    <div class="pie"><button class="plegar" id="plegar" aria-label="Contraer menú">${ICONOS.plegar}<span class="txt">Contraer menú</span></button></div></aside>
  <header class="top"><button class="menu-movil" id="menu-movil" aria-label="Abrir menú">${ICONOS.menu}</button>
    <span class="rol">${esc(U.rol_nombre)}</span>
    <div class="buscador" role="search"><label for="q">${ICONOS.buscar}</label><input id="q" type="search" autocomplete="off" placeholder="Buscar contratos, procesos, equipos, despachos…" aria-controls="res"><kbd>/</kbd><div class="resultados" id="res" role="listbox"></div></div>
    <div class="perfil-menu"><button id="perfil" aria-haspopup="true"><span class="avatar">${esc(iniciales(U.nombre))}</span></button>
      <div class="caja" id="caja"><div><b>${esc(U.nombre.split('·')[0])}</b><small>${esc(U.rol_nombre)}</small><small>${esc(U.email)}</small></div><button id="salir">Cerrar sesión</button></div></div></header>
  <main id="vista" tabindex="-1"></main></div>`;
  $('#plegar').onclick = () => { const a = $('#app'); a.classList.toggle('plegado'); localStorage.setItem('sima_plegado', a.classList.contains('plegado') ? '1' : '0'); };
  $('#menu-movil').onclick = () => $('#app').classList.toggle('abierto');
  $('#perfil').onclick = () => $('#caja').classList.toggle('abierto');
  $('#salir').onclick = () => cerrarSesion(false);
  document.addEventListener('click', (e) => { if (!e.target.closest('.perfil-menu')) $('#caja')?.classList.remove('abierto'); if (!e.target.closest('.buscador')) $('#res')?.classList.remove('abierto'); });
  buscador();
}

// ------------------------------------------------------------------ buscador global
function webRuta(ruta) {
  const base = ruta.split('/')[0];
  if (U.menu.includes(base)) return base;
  return U.menu.includes('mantencion') ? 'mantencion' : U.menu[0];
}
function buscador() {
  const q = $('#q'), res = $('#res'); let t, sel = -1, lista = [];
  const pintar = (items, texto) => {
    lista = items; sel = -1;
    if (!items.length) res.innerHTML = `<p class="vacio" style="padding:22px 16px">No hay resultados para “${esc(texto)}”. Pruebe con otra palabra.</p>`;
    else { let g = ''; res.innerHTML = items.map((x) => { const cab = g !== x.tipo ? `<div class="grupo">${esc(x.tipo)}</div>` : ''; g = x.tipo; return `${cab}<a href="#/${webRuta(x.ruta)}" role="option"><b>${esc(x.titulo)}</b><small>${esc(x.detalle)}</small></a>`; }).join(''); }
    res.classList.add('abierto');
  };
  q.addEventListener('input', () => { clearTimeout(t); const v = q.value.trim(); if (v.length < 2) { res.classList.remove('abierto'); return; }
    t = setTimeout(async () => { try { pintar((await api('/buscar/', { params: { q: v } })).resultados, v); } catch (e) { toast(e.message, true); } }, 220); });
  q.addEventListener('keydown', (e) => {
    const as = $$('a', res);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!as.length) return; sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + as.length) % as.length; as.forEach((a, i) => a.classList.toggle('sel', i === sel)); as[sel].scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter' && as[Math.max(sel, 0)]) { as[Math.max(sel, 0)].click(); }
    else if (e.key === 'Escape') { res.classList.remove('abierto'); q.blur(); }
  });
  res.addEventListener('click', () => { res.classList.remove('abierto'); q.value = ''; });
  document.addEventListener('keydown', (e) => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); q.focus(); } });
}

// ------------------------------------------------------------------ vistas
const permiso = (r, a) => U.permisos[r]?.[a];
const cargando = (el) => (el.innerHTML = '<p class="cargando">Cargando…</p>');
const accionesHero = (...b) => b.filter(Boolean).join('');
const btnCSV = '<button class="btn blanco" data-csv>Exportar CSV</button>';

async function vPanel(el) {
  const d = await api('/dashboard/');
  const nombre = U.nombre.split('·')[0].trim().split(' ')[0];
  const h = new Date().getHours();
  el.innerHTML = hero({ titulo: `${h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'}, ${nombre}`,
    texto: `${U.rol_nombre} · ${new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}` }) +
    `<div class="contenido"><div class="rejilla r4">${d.kpis.map(kpi).join('')}</div>
    ${d.mensual ? `<div class="tarjeta"><h3>Ingresos y gastos · últimos 6 meses</h3>${graficoMensual(d.mensual)}</div>` : ''}
    ${d.donuts.length ? `<div class="tarjeta"><h3>Indicadores</h3><div class="donuts">${d.donuts.map((x) => donut(x.valor, x.etiqueta, x.detalle)).join('')}</div></div>` : ''}
    ${d.barras.length ? `<div class="rejilla r2">${d.barras.map((b) => barrasH(b.titulo, b.items.map((i) => ({ etiqueta: i.etiqueta, valor: i.valor })), (v) => (v > 9999 ? clp(v) : v + (b.titulo.includes('%') ? '%' : '')))).join('')}</div>` : ''}
    <div class="rejilla r2">${d.listas.map(listaItems).join('')}</div></div>`;
}

const MOV = [{ n: 'fecha', l: 'Fecha', t: 'date', req: 1 }, { n: 'tipo', l: 'Tipo', t: 'select', op: [['gasto', 'Gasto'], ['ingreso', 'Ingreso']] },
  { n: 'categoria', l: 'Categoría', req: 1 }, { n: 'centro_costo', l: 'Centro de costo' }, { n: 'monto', l: 'Monto (CLP)', t: 'number', req: 1 },
  { n: 'descripcion', l: 'Descripción', req: 1 }];
const MOV_EDIT = ['categoria', 'centro_costo', 'monto', 'descripcion'];

async function vFinanzas(el) {
  const datos = await listar('movimientos', { limite: 1000 });
  const mes0 = hoyIso().slice(0, 7);
  const delMes = datos.filter((x) => x.fecha.startsWith(mes0));
  const suma = (a, t) => a.filter((x) => x.tipo === t).reduce((s, x) => s + x.monto, 0);
  const res = suma(delMes, 'ingreso') - suma(delMes, 'gasto');
  const meses = [...new Set(datos.map((x) => x.fecha.slice(0, 7)))].sort().reverse();
  const cols = [{ t: 'Fecha', v: (f) => f.fecha, h: (f) => fecha(f.fecha) }, { t: 'Tipo', v: (f) => f.tipo_display, h: (f) => chip(f.tipo_display, TONO_ESTADO[f.tipo]) },
    { t: 'Categoría', v: (f) => f.categoria }, { t: 'Centro de costo', v: (f) => f.centro_costo }, { t: 'Descripción', v: (f) => f.descripcion },
    { t: 'Monto', num: 1, v: (f) => f.monto, h: (f) => clp(f.monto) }];
  const st = { tipo: '', mes: '', q: '' };
  const pintar = () => {
    const fil = datos.filter((x) => (!st.tipo || x.tipo === st.tipo) && (!st.mes || x.fecha.startsWith(st.mes)));
    el.querySelector('#tabla').innerHTML = tabla({ id: 'mov', columnas: cols, filas: fil, vacio: 'No hay movimientos con esos filtros.', acciones: permiso('movimientos', 'editar') ? (f) => `<button class="btn chico sec" data-ed="${f.id}">Editar</button>` : null });
    activarTabla(el); filtrarFilas(el.querySelector('tbody'), st.q); el._fil = fil;
    const g = {}; fil.filter((x) => x.tipo === 'gasto').forEach((x) => (g[x.categoria] = (g[x.categoria] || 0) + x.monto));
    el.querySelector('#cat').innerHTML = barrasH('Gasto por categoría', Object.entries(g).map(([etiqueta, valor]) => ({ etiqueta, valor })).sort((a, b) => b.valor - a.valor), clp);
  };
  const m6 = meses.slice(0, 6).reverse();
  const serie = { meses: m6.map((m) => ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][+m.slice(5) - 1]), ingresos: m6.map((m) => suma(datos.filter((x) => x.fecha.startsWith(m)), 'ingreso')), gastos: m6.map((m) => suma(datos.filter((x) => x.fecha.startsWith(m)), 'gasto')) };
  el.innerHTML = hero({ titulo: 'Finanzas', texto: 'Ingresos y gastos por categoría y centro de costo.',
    acciones: accionesHero(permiso('movimientos', 'crear') && '<button class="btn blanco" data-nuevo>Nuevo movimiento</button>', btnCSV, '<button class="btn blanco" onclick="print()">Imprimir / PDF</button>'),
    cifra: `<div class="cifra"><b>${clp(res)}</b><span>Resultado del mes en curso</span></div>` }) +
    `<div class="contenido"><div class="rejilla r2"><div class="tarjeta"><h3>Ingresos y gastos</h3>${graficoMensual(serie)}</div><div id="cat"></div></div>
    <div><div class="herramientas"><input id="b" type="search" placeholder="Buscar en la tabla"><select id="ft"><option value="">Ingresos y gastos</option><option value="ingreso">Solo ingresos</option><option value="gasto">Solo gastos</option></select>
    <select id="fm"><option value="">Todos los meses</option>${meses.map((m) => `<option>${m}</option>`).join('')}</select></div><div id="tabla"></div></div></div>`;
  pintar();
  $('#b', el).oninput = (e) => { st.q = e.target.value; filtrarFilas(el.querySelector('tbody'), st.q); };
  $('#ft', el).onchange = (e) => { st.tipo = e.target.value; pintar(); }; $('#fm', el).onchange = (e) => { st.mes = e.target.value; pintar(); };
  $('[data-csv]', el).onclick = () => exportarCSV('movimientos', cols, el._fil);
  const guardar = async (nuevo, f) => {
    const campos = nuevo ? MOV : MOV.filter((c) => MOV_EDIT.includes(c.n));
    const r = await formularioModal({ titulo: nuevo ? 'Nuevo movimiento' : 'Editar movimiento', campos, valores: nuevo ? { fecha: hoyIso() } : f,
      enviar: (d) => api(nuevo ? '/movimientos/' : `/movimientos/${f.id}/`, { metodo: nuevo ? 'POST' : 'PATCH', cuerpo: d }) });
    if (r) { toast('Movimiento guardado.'); ruta(); }
  };
  $('[data-nuevo]', el)?.addEventListener('click', () => guardar(true));
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-ed]'); if (b) guardar(false, datos.find((x) => x.id == b.dataset.ed)); });
}

const CTO = [{ n: 'trabajador', l: 'Trabajador', req: 1 }, { n: 'rut', l: 'RUT', req: 1 }, { n: 'cargo', l: 'Cargo', req: 1 }, { n: 'area', l: 'Área', req: 1 },
  { n: 'tipo', l: 'Tipo de contrato', t: 'select', op: [['indefinido', 'Indefinido'], ['plazo_fijo', 'Plazo fijo'], ['honorarios', 'Honorarios']] },
  { n: 'sueldo_bruto', l: 'Sueldo bruto (CLP)', t: 'number', req: 1 }, { n: 'fecha_inicio', l: 'Inicio', t: 'date', req: 1 }, { n: 'fecha_fin', l: 'Término', t: 'date' }];
const CTO_EDIT = [...CTO.filter((c) => ['cargo', 'area', 'tipo', 'sueldo_bruto', 'fecha_fin'].includes(c.n)), { n: 'estado', l: 'Estado', t: 'select', op: [['vigente', 'Vigente'], ['terminado', 'Terminado']] }];

async function vContratos(el) {
  const datos = await listar('contratos', { limite: 500 });
  const vig = datos.filter((c) => c.estado === 'vigente');
  const porVencer = vig.filter((c) => c.dias_para_vencer != null && c.dias_para_vencer <= 30);
  const estadoCto = (c) => c.estado !== 'vigente' ? chip('Terminado') : c.dias_para_vencer == null ? chip('Vigente', 'verde') : c.dias_para_vencer < 0 ? chip('Vencido', 'rojo') : c.dias_para_vencer <= 30 ? chip(`Vence en ${c.dias_para_vencer} d`, 'ambar') : chip('Vigente', 'verde');
  const cols = [{ t: 'Trabajador', v: (c) => c.trabajador, h: (c) => `<b>${esc(c.trabajador)}</b><br><small>${esc(c.rut)}</small>` }, { t: 'Cargo', v: (c) => c.cargo }, { t: 'Área', v: (c) => c.area },
    { t: 'Tipo', v: (c) => c.tipo_display }, { t: 'Inicio', v: (c) => c.fecha_inicio, h: (c) => fecha(c.fecha_inicio) }, { t: 'Término', v: (c) => c.fecha_fin || '', h: (c) => fecha(c.fecha_fin) },
    { t: 'Sueldo bruto', num: 1, v: (c) => c.sueldo_bruto, h: (c) => clp(c.sueldo_bruto) }, { t: 'Estado', v: (c) => c.dias_para_vencer ?? 9999, h: estadoCto }];
  const pintar = (f) => { $('#tabla', el).innerHTML = tabla({ id: 'cto', columnas: cols, filas: f, vacio: 'No hay contratos con esos filtros.', acciones: permiso('contratos', 'editar') ? (c) => `<button class="btn chico sec" data-ed="${c.id}">Editar</button>` : null }); activarTabla(el); el._fil = f; };
  el.innerHTML = hero({ titulo: 'Contratos', texto: 'Contratos de trabajadores, vencimientos y masa salarial.',
    acciones: accionesHero(permiso('contratos', 'crear') && '<button class="btn blanco" data-nuevo>Nuevo contrato</button>', btnCSV),
    cifra: `<div class="cifra"><b>${vig.length}</b><span>contratos vigentes</span></div>` }) +
    `<div class="contenido"><div class="rejilla r4">${[{ etiqueta: 'Por vencer (30 días)', valor: porVencer.length, tono: porVencer.length ? 'ambar' : 'verde', detalle: 'Renovar o cerrar' },
      { etiqueta: 'Masa salarial bruta', valor: clp(vig.reduce((s, c) => s + c.sueldo_bruto, 0)), tono: 'neutro', detalle: 'Contratos vigentes' },
      { etiqueta: 'Plazo fijo', valor: vig.filter((c) => c.tipo === 'plazo_fijo').length, tono: 'neutro', detalle: 'Vigentes' }, { etiqueta: 'Honorarios', valor: vig.filter((c) => c.tipo === 'honorarios').length, tono: 'neutro', detalle: 'Vigentes' }].map(kpi).join('')}</div>
    <div><div class="herramientas"><input id="b" type="search" placeholder="Buscar trabajador, RUT, cargo o área"><select id="fe"><option value="">Todos los estados</option><option value="vigente">Vigentes</option><option value="vence">Por vencer</option><option value="terminado">Terminados</option></select>
    <select id="ft"><option value="">Todos los tipos</option><option value="indefinido">Indefinido</option><option value="plazo_fijo">Plazo fijo</option><option value="honorarios">Honorarios</option></select></div><div id="tabla"></div></div></div>`;
  const filtrar = () => { const q = $('#b', el).value.toLowerCase(), e = $('#fe', el).value, t = $('#ft', el).value;
    pintar(datos.filter((c) => (!q || `${c.trabajador} ${c.rut} ${c.cargo} ${c.area}`.toLowerCase().includes(q)) && (!t || c.tipo === t) && (!e || (e === 'vence' ? porVencer.includes(c) : c.estado === e)))); };
  ['#b', '#fe', '#ft'].forEach((s) => $(s, el).addEventListener('input', filtrar)); pintar(datos);
  $('[data-csv]', el).onclick = () => exportarCSV('contratos', cols, el._fil);
  const guardar = async (nuevo, c) => { const r = await formularioModal({ titulo: nuevo ? 'Nuevo contrato' : `Contrato de ${c.trabajador}`, campos: nuevo ? CTO : CTO_EDIT, valores: nuevo ? { tipo: 'indefinido' } : c,
    enviar: (d) => api(nuevo ? '/contratos/' : `/contratos/${c.id}/`, { metodo: nuevo ? 'POST' : 'PATCH', cuerpo: d }) }); if (r) { toast('Contrato guardado.'); ruta(); } };
  $('[data-nuevo]', el)?.addEventListener('click', () => guardar(true));
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-ed]'); if (b) guardar(false, datos.find((x) => x.id == b.dataset.ed)); });
}

const PRO = [{ n: 'nombre', l: 'Nombre del proceso', req: 1, ancho: 2 }, { n: 'area', l: 'Área', req: 1 }, { n: 'responsable', l: 'Responsable' },
  { n: 'estado', l: 'Estado', t: 'select', op: [['planificado', 'Planificado'], ['en_curso', 'En curso'], ['bloqueado', 'Bloqueado'], ['completado', 'Completado']] },
  { n: 'avance', l: 'Avance (%)', t: 'number', req: 1 }, { n: 'fecha_inicio', l: 'Inicio', t: 'date', req: 1 }, { n: 'fecha_fin', l: 'Término', t: 'date', req: 1 }, { n: 'descripcion', l: 'Detalle', t: 'textarea' }];

async function vProcesos(el) {
  const datos = await listar('procesos');
  const col = [['planificado', 'Planificado'], ['en_curso', 'En curso'], ['bloqueado', 'Bloqueado'], ['completado', 'Completado']];
  const prom = datos.length ? Math.round(datos.reduce((s, p) => s + p.avance, 0) / datos.length) : 0;
  el.innerHTML = hero({ titulo: 'Procesos', texto: 'Estructura, responsables y avance de los procesos de la manufacturera.',
    acciones: permiso('procesos', 'crear') ? '<button class="btn blanco" data-nuevo>Nuevo proceso</button>' : '', cifra: `<div class="cifra"><b>${prom}%</b><span>avance medio</span></div>` }) +
    `<div class="contenido"><div class="columnas">${col.map(([k, t]) => { const l = datos.filter((p) => p.estado === k);
      return `<section class="columna c-${k}"><h4>${t}<span>${l.length}</span></h4>${l.map((p) => `<article class="proceso" tabindex="0" data-id="${p.id}"><b>${esc(p.nombre)}</b><small>${esc(p.area)} · ${esc(p.responsable || 'Sin responsable')} · hasta ${fecha(p.fecha_fin)}</small>
      <div class="progreso" role="progressbar" aria-valuenow="${p.avance}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p.avance}%"></i></div><small style="margin:6px 0 0">${p.avance}%</small></article>`).join('') || '<p class="vacio">Sin procesos.</p>'}</section>`; }).join('')}</div></div>`;
  const abrir = async (p) => {
    if (!p || !permiso('procesos', 'editar')) { if (p) toast(`${p.nombre}: ${p.descripcion || 'Sin detalle.'}`); return; }
    const r = await formularioModal({ titulo: p ? 'Editar proceso' : 'Nuevo proceso', campos: PRO, valores: p || { estado: 'planificado', avance: 0, fecha_inicio: hoyIso() },
      enviar: (d) => api(p ? `/procesos/${p.id}/` : '/procesos/', { metodo: p ? 'PATCH' : 'POST', cuerpo: d }) });
    if (r) { toast('Proceso guardado.'); ruta(); }
  };
  $('[data-nuevo]', el)?.addEventListener('click', () => abrir(null));
  $$('.proceso', el).forEach((c) => { const f = () => abrir(datos.find((x) => x.id == c.dataset.id)); c.onclick = f; c.onkeydown = (e) => e.key === 'Enter' && f(); });
}

const DES = [{ n: 'codigo', l: 'Código', req: 1 }, { n: 'estado', l: 'Estado', t: 'select', op: [['programado', 'Programado'], ['en_ruta', 'En ruta'], ['entregado', 'Entregado'], ['retrasado', 'Retrasado']] },
  { n: 'origen', l: 'Origen', req: 1 }, { n: 'destino', l: 'Destino', req: 1 }, { n: 'carga', l: 'Carga', req: 1, ancho: 2 }, { n: 'vehiculo', l: 'Vehículo' }, { n: 'conductor', l: 'Conductor' },
  { n: 'fecha_salida', l: 'Salida', t: 'date', req: 1 }, { n: 'fecha_llegada', l: 'Llegada estimada', t: 'date' }, { n: 'costo', l: 'Costo (CLP)', t: 'number', req: 1 }];

async function vTransporte(el) {
  const datos = await listar('despachos', { limite: 500 });
  const n = (e) => datos.filter((d) => d.estado === e).length;
  const cols = [{ t: 'Código', v: (d) => d.codigo }, { t: 'Ruta', v: (d) => `${d.origen} → ${d.destino}`, h: (d) => `<b>${esc(d.origen)}</b> → ${esc(d.destino)}` }, { t: 'Carga', v: (d) => d.carga },
    { t: 'Vehículo', v: (d) => `${d.vehiculo} · ${d.conductor}` }, { t: 'Salida', v: (d) => d.fecha_salida, h: (d) => fecha(d.fecha_salida) }, { t: 'Llegada', v: (d) => d.fecha_llegada || '', h: (d) => fecha(d.fecha_llegada) },
    { t: 'Costo', num: 1, v: (d) => d.costo, h: (d) => clp(d.costo) }, { t: 'Estado', v: (d) => d.estado_display, h: (d) => chip(d.estado_display, TONO_ESTADO[d.estado]) }];
  const pintar = (f) => { $('#tabla', el).innerHTML = tabla({ id: 'des', columnas: cols, filas: f, vacio: 'No hay despachos con esos filtros.', acciones: permiso('despachos', 'editar') ? (d) => `${d.estado !== 'entregado' ? `<button class="btn chico" data-ok="${d.id}">Marcar entregado</button>` : ''}<button class="btn chico sec" data-ed="${d.id}">Editar</button>` : null }); activarTabla(el); el._fil = f; };
  el.innerHTML = hero({ titulo: 'Transporte', texto: 'Despachos, rutas y costos de distribución.',
    acciones: accionesHero(permiso('despachos', 'crear') && '<button class="btn blanco" data-nuevo>Nuevo despacho</button>', btnCSV), cifra: `<div class="cifra"><b>${n('en_ruta')}</b><span>en ruta ahora</span></div>` }) +
    `<div class="contenido"><div class="rejilla r4">${[{ etiqueta: 'En ruta', valor: n('en_ruta'), tono: 'neutro', detalle: '' }, { etiqueta: 'Retrasados', valor: n('retrasado'), tono: n('retrasado') ? 'rojo' : 'verde', detalle: 'Requieren contacto' },
      { etiqueta: 'Programados', valor: n('programado'), tono: 'neutro', detalle: '' }, { etiqueta: 'Costo total', valor: clp(datos.reduce((s, d) => s + d.costo, 0)), tono: 'neutro', detalle: 'Todos los despachos' }].map(kpi).join('')}</div>
    <div><div class="herramientas"><input id="b" type="search" placeholder="Buscar código, destino, carga o conductor"><select id="fe"><option value="">Todos los estados</option>${DES[1].op.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div><div id="tabla"></div></div></div>`;
  const filtrar = () => { const q = $('#b', el).value.toLowerCase(), e = $('#fe', el).value; pintar(datos.filter((d) => (!q || Object.values(d).join(' ').toLowerCase().includes(q)) && (!e || d.estado === e))); };
  $('#b', el).oninput = filtrar; $('#fe', el).onchange = filtrar; pintar(datos);
  $('[data-csv]', el).onclick = () => exportarCSV('despachos', cols, el._fil);
  const guardar = async (d) => { const r = await formularioModal({ titulo: d ? `Despacho ${d.codigo}` : 'Nuevo despacho', campos: d ? DES.filter((c) => c.n !== 'codigo') : DES, valores: d || { estado: 'programado', fecha_salida: hoyIso(), costo: 0 },
    enviar: (x) => api(d ? `/despachos/${d.id}/` : '/despachos/', { metodo: d ? 'PATCH' : 'POST', cuerpo: x }) }); if (r) { toast('Despacho guardado.'); ruta(); } };
  $('[data-nuevo]', el)?.addEventListener('click', () => guardar(null));
  el.addEventListener('click', async (e) => {
    const ed = e.target.closest('[data-ed]'), ok = e.target.closest('[data-ok]');
    if (ed) guardar(datos.find((x) => x.id == ed.dataset.ed));
    if (ok) { try { await api(`/despachos/${ok.dataset.ok}/`, { metodo: 'PATCH', cuerpo: { estado: 'entregado', fecha_llegada: hoyIso() } }); toast('Despacho marcado como entregado.'); ruta(); } catch (x) { toast(x.message, true); } }
  });
}

let mesCal = hoyIso().slice(0, 7);
async function vPlanificacion(el) {
  const d = await api('/calendario/', { params: { mes: mesCal } });
  const [y, m] = mesCal.split('-').map(Number), primero = new Date(y, m - 1, 1), diasMes = new Date(y, m, 0).getDate(), off = (primero.getDay() + 6) % 7;
  const celdas = [];
  for (let i = 0; i < off; i++) celdas.push(null);
  for (let dia = 1; dia <= diasMes; dia++) celdas.push(dia);
  while (celdas.length % 7) celdas.push(null);
  const iso = (dia) => `${mesCal}-${String(dia).padStart(2, '0')}`;
  const mover = (n) => { const f = new Date(y, m - 1 + n, 1); mesCal = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`; ruta(); };
  el.innerHTML = hero({ titulo: primero.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }), texto: 'Planes de mantención, procesos y despachos del mes.',
    acciones: '<button class="btn blanco" data-mv="-1">‹ Mes anterior</button><button class="btn blanco" data-mv="0">Hoy</button><button class="btn blanco" data-mv="1">Mes siguiente ›</button>' }) +
    `<div class="contenido"><div class="leyenda"><span><i style="background:#0b0b0c"></i>Plan de mantención</span><span><i style="background:#d91f26"></i>Proceso</span><span><i style="background:#6b6f78"></i>Despacho</span></div>
    <div class="cal"><div class="sem">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((x) => `<div>${x}</div>`).join('')}</div><div class="dias">${celdas.map((dia) => {
      if (!dia) return '<div class="dia otro"></div>';
      // los eventos de más de una semana se marcan solo el día de inicio (▶) y el de término (■) para no saturar el mes
      const dur = (e) => (new Date(e.fin) - new Date(e.inicio)) / 864e5;
      const ev = d.eventos.filter((e) => (dur(e) <= 7 ? e.inicio <= iso(dia) && e.fin >= iso(dia) : e.inicio === iso(dia) || e.fin === iso(dia)));
      const rot = (e) => (dur(e) <= 7 ? '' : e.inicio === iso(dia) ? '▶ ' : '■ ');
      return `<div class="dia ${iso(dia) === hoyIso() ? 'hoy' : ''}"><span class="n">${dia}</span>${ev.slice(0, 3).map((e) => `<span class="ev ${e.tipo} ${dur(e) > 7 ? 'largo' : ''}" title="${esc(e.titulo)} · ${esc(e.estado)} (${fecha(e.inicio)} – ${fecha(e.fin)})">${rot(e)}${esc(e.titulo)}</span>`).join('')}${ev.length > 3 ? `<div class="mas">+${ev.length - 3} más</div>` : ''}</div>`; }).join('')}</div></div></div>`;
  $$('[data-mv]', el).forEach((b) => (b.onclick = () => (b.dataset.mv === '0' ? ((mesCal = hoyIso().slice(0, 7)), ruta()) : mover(+b.dataset.mv))));
}

async function vMantencion(el) {
  const [ind, ots, eqs] = await Promise.all([api('/indicadores/'), listar('ordenes', { excluir_estado: 'cerrada', limite: 60 }), listar('equipos')]);
  const puedeConsumo = true;
  el.innerHTML = hero({ titulo: 'Mantención', texto: 'Estado de equipos y órdenes de trabajo. Solo lectura: la gestión se hace en la aplicación de terreno.', cifra: `<div class="cifra"><b>${ind.disponibilidad}%</b><span>disponibilidad (preliminar)</span></div>` }) +
    `<div class="contenido"><div class="rejilla r4">${[{ etiqueta: 'Órdenes abiertas', valor: ots.length, tono: 'neutro', detalle: '' }, { etiqueta: 'MTTR', valor: ind.mttr_horas == null ? '—' : ind.mttr_horas + ' h', tono: 'neutro', detalle: 'Tiempo medio de reparación' },
      { etiqueta: 'MTBF', valor: ind.mtbf_horas == null ? '—' : ind.mtbf_horas + ' h', tono: 'neutro', detalle: 'Entre fallas (aprox.)' }, { etiqueta: 'Costo repuestos (30 d)', valor: clp(ind.costo_mantencion_30d), tono: 'neutro', detalle: '' }].map(kpi).join('')}</div>
    <div class="rejilla r2"><div><h3 class="display" style="margin:0 0 10px">Órdenes abiertas</h3>${tabla({ id: 'ot', columnas: [{ t: 'N°', v: (o) => o.numero }, { t: 'Equipo', v: (o) => o.equipo_nombre }, { t: 'Orden', v: (o) => o.titulo }, { t: 'Prioridad', v: (o) => o.prioridad_display, h: (o) => chip(o.prioridad_display, o.prioridad === 'alta' ? 'rojo' : '') }, { t: 'Estado', v: (o) => o.estado_display, h: (o) => chip(o.estado_display + (o.sin_avance ? ` · ${o.horas_sin_avance} h sin avance` : ''), o.sin_avance ? 'rojo' : 'ambar') }], filas: ots, vacio: 'No hay órdenes abiertas.' })}</div>
    <div><h3 class="display" style="margin:0 0 10px">Equipos</h3>${tabla({ id: 'eq', columnas: [{ t: 'Equipo', v: (e) => e.nombre_habitual, h: (e) => `<b>${esc(e.nombre_habitual)}</b><br><small>${esc(e.ubicacion)}</small>` }, { t: 'Criticidad', v: (e) => e.criticidad_display }, { t: 'Estado', v: (e) => e.estado_display, h: (e) => chip(e.estado_display, TONO_ESTADO[e.estado]) }], filas: eqs })}</div></div>
    ${puedeConsumo ? `<div class="tarjeta"><div class="cab"><h3>Consumo de repuestos por equipo</h3><div class="herramientas" style="margin:0"><input type="date" id="cd" value="${new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)}"><input type="date" id="ch" value="${hoyIso()}"><button class="btn chico" id="cc">Ver consumo</button></div></div><div id="cons"></div></div>` : ''}</div>`;
  activarTabla(el);
  const cons = async () => { try { const c = await api('/consumo/', { params: { desde: $('#cd', el).value, hasta: $('#ch', el).value } });
    $('#cons', el).innerHTML = c.equipos.length ? `${tabla({ id: 'cons', columnas: [{ t: 'Equipo', v: (e) => e.equipo }, { t: 'Repuestos', v: (e) => e.filas.map((f) => `${f.repuesto} × ${f.cantidad}`).join(', ') }, { t: 'Costo', num: 1, v: (e) => e.total, h: (e) => clp(e.total) }], filas: c.equipos })}<p class="nota-pie">Total del período: <b>${clp(c.total)}</b></p>` : '<p class="vacio">Sin consumo en ese período.</p>'; activarTabla(el); } catch (e) { toast(e.message, true); } };
  $('#cc', el).onclick = cons; cons();
}

async function vInformes(el) {
  const [ind, inf] = await Promise.all([api('/indicadores/'), listar('informes')]);
  const maxF = Math.max(1, ...ind.fallas_por_equipo.map((f) => f.fallas));
  el.innerHTML = hero({ titulo: 'Informes', texto: 'Indicadores de gestión de los últimos meses. Se pueden imprimir o guardar como PDF.', acciones: '<button class="btn blanco" onclick="print()">Imprimir / PDF</button><button class="btn blanco" data-csv>Exportar CSV</button>' }) +
    `<div class="contenido"><div class="tarjeta"><h3>Indicadores clave</h3><div class="donuts">${donut(ind.disponibilidad, 'Disponibilidad', 'equipos operativos')}
      ${donut(ind.ot_por_estado.cerrada + ind.ot_por_estado.abierta + ind.ot_por_estado.en_curso ? Math.round((100 * ind.ot_por_estado.cerrada) / (ind.ot_por_estado.cerrada + ind.ot_por_estado.abierta + ind.ot_por_estado.en_curso)) : 0, 'Órdenes cerradas', 'del total')}</div>
      <p class="nota-pie">${esc(ind.nota)}</p></div>
    <div class="rejilla r2">${barrasH('Equipos con más fallas (90 días)', ind.fallas_por_equipo.map((f) => ({ etiqueta: f.equipo, valor: f.fallas })))}${barrasH('Costo de repuestos por equipo', ind.costo_por_equipo.map((f) => ({ etiqueta: f.equipo, valor: f.costo })), clp)}</div>
    <div class="tarjeta"><h3>Informes técnicos</h3>${inf.length ? inf.map((i) => `<details class="lista-it" style="display:block"><summary><b style="display:inline">${esc(i.titulo)}</b> <small>· ${esc(i.autor_nombre.split('·')[0])} · ${fecha(i.creado)}</small></summary><p class="informe">${esc(i.contenido)}</p></details>`).join('') : '<p class="vacio">Aún no hay informes.</p>'}</div></div>`;
  $('[data-csv]', el).onclick = () => exportarCSV('indicadores', [{ t: 'Equipo', v: (f) => f.equipo }, { t: 'Fallas (90 d)', v: (f) => f.fallas }], ind.fallas_por_equipo);
}

// ------------------------------------------------------------------ router
const VISTAS = { panel: vPanel, finanzas: vFinanzas, contratos: vContratos, procesos: vProcesos, transporte: vTransporte, planificacion: vPlanificacion, mantencion: vMantencion, informes: vInformes };
async function ruta() {
  const nombre = (location.hash.replace(/^#\//, '').split('/')[0]) || U.menu[0];
  const r = U.menu.includes(nombre) ? nombre : U.menu[0];
  $$('.lateral nav a').forEach((a) => a.classList.toggle('activo', a.dataset.r === r));
  $('#app').classList.remove('abierto');
  const viejo = $('#vista'), el = viejo.cloneNode(false);   // contenedor nuevo: así no se acumulan eventos de vistas anteriores
  viejo.replaceWith(el); document.title = `${TITULOS[r]} · SIMA`; cargando(el);
  try { await VISTAS[r](el); } catch (e) { if (e.estado !== 401) el.innerHTML = `<div class="contenido"><div class="aviso-error">${esc(e.message)}</div></div>`; }
}
function arrancar() { estructura(); if (!location.hash) location.hash = '#/' + U.menu[0]; ruta(); }
window.addEventListener('hashchange', () => U && ruta());
onCerrar((porInactividad) => { U = null; pantallaAcceso(porInactividad ? 'Su sesión terminó por inactividad. Ingrese de nuevo.' : ''); });

const s = sesion();
if (s) { U = s.usuario; arrancar(); } else pantallaAcceso();
