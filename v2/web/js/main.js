import { api, listar, sesion, guardarSesion, cerrarSesion, onCerrar } from './api.js';
import { $, $$, esc, clp, fecha, ICONOS, TITULOS, TONO_ESTADO, chip, hero, kpi, listaItems, tabla, activarTabla, filtrarFilas, exportarCSV, formularioModal, toast, esqueleto } from './ui.js';
import { activar, anillo, barrasMensual, medidor, actualizarMedidor, spark } from './kit.js';
import { svgMaquina } from './maquinas.js';
import { pintarMapa, actualizarMapa } from './mapa.js';

let U = null;
const raiz = $('#raiz');
const hoyIso = () => new Date().toISOString().slice(0, 10);
const permiso = (r, a) => U.permisos[r]?.[a];
const corto = (n) => (n || '').split('·')[0].trim();
const iniciales = (n) => corto(n).split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
const btnCSV = '<button class="btn blanco" data-csv>Exportar CSV</button>';
const acc = (...b) => b.filter(Boolean).join('');
let sondeo = null;
const detener = () => { clearInterval(sondeo); sondeo = null; };
function sondear(fn, ms) { detener(); fn().catch(() => {}); sondeo = setInterval(() => { if (!document.hidden) fn().catch(() => {}); }, ms); }
const cifra = (valor, etiqueta, fmt = 'int') => `<div class="cifra"><b data-contar="${valor}" data-fmt="${fmt}">${valor}</b><span>${esc(etiqueta)}</span></div>`;

// ------------------------------------------------------------------ acceso
const DEMO = [['gerencia', 'Gerencia', 'Gerencia2026'], ['finanzas', 'Administración y finanzas', 'Finanzas2026'], ['produccion', 'Producción y procesos', 'Produccion2026'], ['jefe.calidad', 'Calidad', 'Jefecalidad2026'],
  ['logistica', 'Logística', 'Logistica2026'], ['rrhh', 'Personas', 'Rrhh2026'], ['comercial', 'Comercial', 'Comercial2026']];
function pantallaAcceso(mensaje = '') {
  raiz.innerHTML = `<div class="acceso"><section class="acceso-hero"><div class="marca"><i></i>SIMA</div><h1 class="display">Toda la planta, en un solo lugar</h1>
    <p>Finanzas, contratos, procesos, calidad y transporte de Manufacturas Andina S.A. Los equipos de terreno trabajan en la aplicación móvil y de escritorio.</p></section>
    <section class="acceso-form"><form id="f-acceso" novalidate><h2 class="display">Ingresar</h2><p class="nota">Use su correo @manuandina.cl</p><div class="aviso-error" id="err" ${mensaje ? '' : 'hidden'}>${esc(mensaje)}</div>
    <label class="campo"><span>Correo corporativo</span><input name="email" type="email" autocomplete="username" required autofocus placeholder="usuario@manuandina.cl"></label>
    <label class="campo"><span>Contraseña</span><input name="password" type="password" autocomplete="current-password" required></label><button class="btn" style="width:100%">Ingresar</button>
    <div class="demo">Cuentas de demostración:<br>${DEMO.map(([e, n]) => `<button type="button" data-e="${e}">${n}</button>`).join(' · ')}</div></form></section></div>`;
  const f = $('#f-acceso');
  $$('.demo button').forEach((b) => (b.onclick = () => { const d = DEMO.find((x) => x[0] === b.dataset.e); f.email.value = d[0] + '@manuandina.cl'; f.password.value = d[2]; }));
  f.onsubmit = async (e) => {
    e.preventDefault(); const err = $('#err'); err.hidden = true;
    try { const r = await api('/login/', { metodo: 'POST', publico: true, cuerpo: { email: f.email.value, password: f.password.value, canal: 'web' } }); guardarSesion(r.token, r.usuario); U = r.usuario; arrancar(); }
    catch (x) { err.textContent = x.message; err.hidden = false; }
  };
}

// ------------------------------------------------------------------ estructura y buscador
function estructura() {
  const plegado = localStorage.getItem('sima_plegado') === '1';
  raiz.innerHTML = `<div class="app ${plegado ? 'plegado' : ''}" id="app"><aside class="lateral" aria-label="Menú principal"><div class="logo"><i></i><span>SIMA</span></div>
    <nav><span class="ind" id="ind"></span>${U.menu.map((m) => `<a href="#/${m}" data-r="${m}" title="${TITULOS[m]}">${ICONOS[m] || ICONOS.mas}<span class="txt">${TITULOS[m]}</span></a>`).join('')}</nav>
    <div class="pie"><button class="plegar" id="plegar" aria-label="Contraer menú">${ICONOS.plegar}<span class="txt">Contraer menú</span></button></div></aside>
  <header class="top"><button class="menu-movil" id="menu-movil" aria-label="Abrir menú">${ICONOS.menu}</button><span class="rol">${esc(U.cargo?.nombre || U.rol_nombre)}</span>
    <div class="buscador" role="search"><label for="q">${ICONOS.buscar}</label><input id="q" type="search" autocomplete="off" placeholder="Buscar cargos, contratos, procesos, equipos, fichas…" aria-controls="res"><kbd>/</kbd><div class="resultados" id="res" role="listbox"></div></div>
    <div class="perfil-menu"><button id="perfil" aria-haspopup="true"><span class="avatar">${esc(iniciales(U.nombre))}</span></button>
      <div class="caja" id="caja"><div><b>${esc(corto(U.nombre))}</b><small>${esc(U.cargo?.nombre || '')}</small><small>${esc(U.rol_nombre)}</small><small>${esc(U.email)}</small></div><button id="salir">Cerrar sesión</button></div></div></header>
  <main id="vista" tabindex="-1"></main></div>`;
  $('#plegar').onclick = () => { const a = $('#app'); a.classList.toggle('plegado'); localStorage.setItem('sima_plegado', a.classList.contains('plegado') ? '1' : '0'); setTimeout(moverIndicador, 260); };
  $('#menu-movil').onclick = () => $('#app').classList.toggle('abierto');
  $('#perfil').onclick = () => $('#caja').classList.toggle('abierto');
  $('#salir').onclick = () => { detener(); cerrarSesion(false); };
  document.addEventListener('click', (e) => { if (!e.target.closest('.perfil-menu')) $('#caja')?.classList.remove('abierto'); if (!e.target.closest('.buscador')) $('#res')?.classList.remove('abierto'); });
  window.addEventListener('resize', moverIndicador); buscador();
}
function moverIndicador() {
  const ind = $('#ind'), a = $('.lateral nav a.activo');
  if (!ind || !a) return;
  const n = $('.lateral nav').getBoundingClientRect(), r = a.getBoundingClientRect();
  ind.style.setProperty('--iy', `${r.top - n.top}px`); ind.style.setProperty('--ih', `${r.height}px`); ind.style.setProperty('--iw', `${r.width}px`);
}
function webRuta(ruta) {
  const base = ruta.split('/')[0];
  if (U.menu.includes(base)) return base;
  if (['equipos', 'plcs', 'ordenes', 'reportes', 'paradas', 'alarmas', 'monitor'].includes(base)) return U.menu.includes('mantencion') ? 'mantencion' : U.menu[0];
  if (base === 'repuestos') return U.menu.includes('inventario') ? 'inventario' : U.menu[0];
  return U.menu[0];
}
function buscador() {
  const q = $('#q'), res = $('#res'); let t, sel = -1;
  const pintar = (items, texto) => {
    sel = -1;
    if (!items.length) res.innerHTML = `<p class="vacio" style="padding:22px 16px">No hay resultados para “${esc(texto)}”. Pruebe con otra palabra.</p>`;
    else { let g = ''; res.innerHTML = items.map((x) => { const cab = g !== x.tipo ? `<div class="grupo">${esc(x.tipo)}</div>` : ''; g = x.tipo; return `${cab}<a href="#/${webRuta(x.ruta)}" role="option"><b>${esc(x.titulo)}</b><small>${esc(x.detalle)}</small></a>`; }).join(''); }
    res.classList.add('abierto');
  };
  q.addEventListener('input', () => { clearTimeout(t); const v = q.value.trim(); if (v.length < 2) { res.classList.remove('abierto'); return; }
    t = setTimeout(async () => { try { pintar((await api('/buscar/', { params: { q: v } })).resultados, v); } catch (e) { toast(e.message, true); } }, 220); });
  q.addEventListener('keydown', (e) => {
    const as = $$('a', res);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!as.length) return; sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + as.length) % as.length; as.forEach((a, i) => a.classList.toggle('sel', i === sel)); as[sel].scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter' && as[Math.max(sel, 0)]) as[Math.max(sel, 0)].click();
    else if (e.key === 'Escape') { res.classList.remove('abierto'); q.blur(); }
  });
  res.addEventListener('click', () => { res.classList.remove('abierto'); q.value = ''; });
  document.addEventListener('keydown', (e) => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); q.focus(); } });
}

// ------------------------------------------------------------------ ficha de equipo en un panel lateral
async function abrirEquipo(id) {
  const d = await api(`/equipos/${id}/`), f = d.ficha;
  const dlg = document.createElement('dialog'); dlg.className = 'ficha';
  dlg.innerHTML = `<div class="cuerpo"><div class="ficha-cab e-${d.estado}"><div>${svgMaquina(f.icono)}</div><div><h2 class="display" style="margin:0;font-size:40px">${esc(d.nombre_habitual)}</h2><div class="sub" style="color:var(--suave)">${esc(d.zona)} · ${esc(d.codigo)} · ${esc(f.nombre)}</div><div style="margin-top:8px">${chip(d.estado_display, TONO_ESTADO[d.estado])} ${chip('Criticidad ' + d.criticidad_display.toLowerCase(), d.criticidad === 'alta' ? 'rojo' : '')}</div></div></div>
    ${d.alarmas_activas.map((a) => `<div class="aviso-error">${esc(a.mensaje)}</div>`).join('')}
    ${d.sensores.length ? `<div><h3 class="display" style="margin:0 0 10px">Lecturas en vivo</h3><div class="medidores">${d.sensores.map(medidor).join('')}</div></div>` : ''}
    ${d.oee ? `<div><h3 class="display" style="margin:0 0 10px">Últimos 14 días</h3><div class="anillos">${[['OEE', d.oee.oee, 'preliminar'], ['Disponibilidad', d.oee.disponibilidad, 'tiempo operando'], ['Rendimiento', d.oee.rendimiento, 'vs. ritmo ideal'], ['Calidad', d.oee.calidad, 'piezas buenas']].map(([a, v, s]) => anillo(v, a, s, v >= 75 ? 'verde' : v >= 60 ? 'ambar' : 'rojo')).join('')}</div></div>` : ''}
    <div><h3 class="display" style="margin:0 0 10px">Ficha técnica</h3><p><b>Función:</b> ${esc(f.funcion)}<br><b>Especificaciones:</b> ${esc(f.especificaciones)}</p><p><b>Fallas frecuentes</b></p><div class="chips-f">${f.fallas.map((x) => `<span class="chip rojo">${esc(x)}</span>`).join('')}</div>
      <p><b>Piezas</b></p><div class="chips-f">${f.piezas.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div><p><b>Herramientas de mantenimiento</b></p><div class="chips-f">${f.herramientas.map((x) => `<span class="chip negro">${esc(x)}</span>`).join('')}</div></div>
    <div style="text-align:right"><button class="btn" data-x>Cerrar</button></div></div>`;
  document.body.append(dlg); dlg.showModal(); activar(dlg);
  const cerrar = () => { clearInterval(t); dlg.close(); dlg.remove(); };
  dlg.querySelector('[data-x]').onclick = cerrar; dlg.addEventListener('cancel', cerrar);
  const t = setInterval(async () => { try { const r = await api('/telemetria/resumen/'); const e = r.equipos.find((x) => x.id === +id); e?.sensores.forEach((s) => { const m = dlg.querySelector(`.medidor[data-sensor="${s.id}"]`); if (m) actualizarMedidor(m, s); }); } catch { /* sin datos */ } }, 3000);
}

// ------------------------------------------------------------------ panel y planta
async function vPanel(el) {
  const d = await api('/dashboard/');
  const h = new Date().getHours(), P = d.planta, tot = P.operando + P.alarma + P.detenido + P.en_mantencion, pct = tot ? Math.round((100 * P.operando) / tot) : 0;
  el.innerHTML = hero({ titulo: `${h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'}, ${corto(U.nombre).split(' ')[0]}`, texto: `${U.cargo?.nombre || U.rol_nombre} · ${new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}`,
    cifra: cifra(pct, 'de los equipos operando', 'pct') }) +
    `<div class="contenido"><a class="tarjeta" ${U.menu.includes('mapa') ? 'href="#/mapa"' : ''} style="text-decoration:none;color:inherit"><div class="cab"><h3>Planta ahora</h3><div class="resumen-planta" style="margin:0">${[['operando', P.operando, 'Operando'], ['alarma', P.alarma, 'Con alarma'], ['detenido', P.detenido, 'Detenidos'], ['en_mantencion', P.en_mantencion, 'En mantención']].map(([k, n, t]) => `<span class="cuenta c-${k}"><b>${n}</b>${t}</span>`).join('')}</div></div></a>
    <div class="rejilla r4">${d.kpis.map(kpi).join('')}</div>
    ${d.mensual ? `<div class="tarjeta"><h3>Ingresos y gastos · últimos 6 meses</h3>${barrasMensual(d.mensual, clp)}</div>` : ''}
    <div class="rejilla r2">${d.listas.map(listaItems).join('')}</div></div>`;
  activar(el);
}
async function vMapa(el) {
  const sup = U.menu.includes('mapa');
  el.innerHTML = hero({ titulo: 'Planta en vivo', texto: 'Cada máquina muestra su estado y la lectura más cercana a su umbral de alarma. Haga clic en una para ver su ficha.' }) + '<div class="contenido"><div id="planta"><div class="esq alto"></div></div></div>';
  const cont = $('#planta', el);
  if (sup) sondear(async () => { const d = await api('/telemetria/resumen/'); if (!actualizarMapa(cont, d)) pintarMapa(cont, d, abrirEquipo); }, 3000);
}

// ------------------------------------------------------------------ finanzas, contratos, procesos, transporte, planificación (de la v1, ahora con gráficos animados)
const MOV = [{ n: 'fecha', l: 'Fecha', t: 'date', req: 1 }, { n: 'tipo', l: 'Tipo', t: 'select', op: [['gasto', 'Gasto'], ['ingreso', 'Ingreso']] }, { n: 'categoria', l: 'Categoría', req: 1 }, { n: 'centro_costo', l: 'Centro de costo' }, { n: 'monto', l: 'Monto (CLP)', t: 'number', req: 1 }, { n: 'descripcion', l: 'Descripción', req: 1 }];
const MOV_EDIT = ['categoria', 'centro_costo', 'monto', 'descripcion'];
async function vFinanzas(el) {
  const datos = await listar('movimientos', { limite: 1000 }), mes0 = hoyIso().slice(0, 7), delMes = datos.filter((x) => x.fecha.startsWith(mes0));
  const suma = (a, t) => a.filter((x) => x.tipo === t).reduce((s, x) => s + x.monto, 0), res = suma(delMes, 'ingreso') - suma(delMes, 'gasto');
  const meses = [...new Set(datos.map((x) => x.fecha.slice(0, 7)))].sort().reverse();
  const cols = [{ t: 'Fecha', v: (f) => f.fecha, h: (f) => fecha(f.fecha) }, { t: 'Tipo', v: (f) => f.tipo_display, h: (f) => chip(f.tipo_display, TONO_ESTADO[f.tipo]) }, { t: 'Categoría', v: (f) => f.categoria }, { t: 'Centro de costo', v: (f) => f.centro_costo }, { t: 'Descripción', v: (f) => f.descripcion }, { t: 'Monto', num: 1, v: (f) => f.monto, h: (f) => clp(f.monto) }];
  const st = { tipo: '', mes: '', q: '' };
  const pintar = () => {
    const fil = datos.filter((x) => (!st.tipo || x.tipo === st.tipo) && (!st.mes || x.fecha.startsWith(st.mes)));
    $('#tabla', el).innerHTML = tabla({ id: 'mov', columnas: cols, filas: fil, vacio: 'No hay movimientos con esos filtros.', acciones: permiso('movimientos', 'editar') ? (f) => `<button class="btn chico sec" data-ed="${f.id}">Editar</button>` : null });
    activarTabla(el); filtrarFilas($('tbody', el), st.q); el._fil = fil;
    const g = {}; fil.filter((x) => x.tipo === 'gasto').forEach((x) => (g[x.categoria] = (g[x.categoria] || 0) + x.monto));
    const mx = Math.max(1, ...Object.values(g));
    $('#cat', el).innerHTML = `<div class="tarjeta"><h3>Gasto por categoría</h3>${Object.entries(g).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="barra-h"><span>${esc(k)}</span><div class="pista"><div class="rell" style="width:${(100 * v) / mx}%"></div></div><span class="v">${clp(v)}</span></div>`).join('') || '<p class="vacio">Sin gastos.</p>'}</div>`;
  };
  const m6 = meses.slice(0, 6).reverse(), N = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const serie = { meses: m6.map((m) => N[+m.slice(5) - 1]), ingresos: m6.map((m) => suma(datos.filter((x) => x.fecha.startsWith(m)), 'ingreso')), gastos: m6.map((m) => suma(datos.filter((x) => x.fecha.startsWith(m)), 'gasto')) };
  el.innerHTML = hero({ titulo: 'Finanzas', texto: 'Ingresos y gastos por categoría y centro de costo.', acciones: acc(permiso('movimientos', 'crear') && '<button class="btn blanco" data-nuevo>Nuevo movimiento</button>', btnCSV, '<button class="btn blanco" onclick="print()">Imprimir / PDF</button>'), cifra: cifra(res, 'resultado del mes en curso', 'clp') }) +
    `<div class="contenido"><div class="rejilla r2"><div class="tarjeta"><h3>Ingresos y gastos</h3>${barrasMensual(serie, clp)}</div><div id="cat"></div></div><div><div class="herramientas"><input id="b" type="search" placeholder="Buscar en la tabla"><select id="ft"><option value="">Ingresos y gastos</option><option value="ingreso">Solo ingresos</option><option value="gasto">Solo gastos</option></select><select id="fm"><option value="">Todos los meses</option>${meses.map((m) => `<option>${m}</option>`).join('')}</select></div><div id="tabla"></div></div></div>`;
  pintar(); activar(el);
  $('#b', el).oninput = (e) => { st.q = e.target.value; filtrarFilas($('tbody', el), st.q); }; $('#ft', el).onchange = (e) => { st.tipo = e.target.value; pintar(); }; $('#fm', el).onchange = (e) => { st.mes = e.target.value; pintar(); };
  $('[data-csv]', el).onclick = () => exportarCSV('movimientos', cols, el._fil);
  const guardar = async (nuevo, f) => { const r = await formularioModal({ titulo: nuevo ? 'Nuevo movimiento' : 'Editar movimiento', campos: nuevo ? MOV : MOV.filter((c) => MOV_EDIT.includes(c.n)), valores: nuevo ? { fecha: hoyIso() } : f, enviar: (d) => api(nuevo ? '/movimientos/' : `/movimientos/${f.id}/`, { metodo: nuevo ? 'POST' : 'PATCH', cuerpo: d }) }); if (r) { toast('Movimiento guardado.'); ruta(); } };
  $('[data-nuevo]', el)?.addEventListener('click', () => guardar(true));
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-ed]'); if (b) guardar(false, datos.find((x) => x.id == b.dataset.ed)); });
}
const CTO = [{ n: 'trabajador', l: 'Trabajador', req: 1 }, { n: 'rut', l: 'RUT', req: 1 }, { n: 'cargo', l: 'Cargo', req: 1 }, { n: 'area', l: 'Área', req: 1 }, { n: 'tipo', l: 'Tipo de contrato', t: 'select', op: [['indefinido', 'Indefinido'], ['plazo_fijo', 'Plazo fijo'], ['honorarios', 'Honorarios']] }, { n: 'sueldo_bruto', l: 'Sueldo bruto (CLP)', t: 'number', req: 1 }, { n: 'fecha_inicio', l: 'Inicio', t: 'date', req: 1 }, { n: 'fecha_fin', l: 'Término', t: 'date' }];
const CTO_EDIT = [...CTO.filter((c) => ['cargo', 'area', 'tipo', 'sueldo_bruto', 'fecha_fin'].includes(c.n)), { n: 'estado', l: 'Estado', t: 'select', op: [['vigente', 'Vigente'], ['terminado', 'Terminado']] }];
async function vContratos(el) {
  const datos = await listar('contratos', { limite: 500 }), vig = datos.filter((c) => c.estado === 'vigente'), porVencer = vig.filter((c) => c.dias_para_vencer != null && c.dias_para_vencer <= 30);
  const est = (c) => c.estado !== 'vigente' ? chip('Terminado') : c.dias_para_vencer == null ? chip('Vigente', 'verde') : c.dias_para_vencer < 0 ? chip('Vencido', 'rojo') : c.dias_para_vencer <= 30 ? chip(`Vence en ${c.dias_para_vencer} d`, 'ambar') : chip('Vigente', 'verde');
  const cols = [{ t: 'Trabajador', v: (c) => c.trabajador, h: (c) => `<b>${esc(c.trabajador)}</b><br><small>${esc(c.rut)}</small>` }, { t: 'Cargo', v: (c) => c.cargo }, { t: 'Área', v: (c) => c.area }, { t: 'Tipo', v: (c) => c.tipo_display }, { t: 'Inicio', v: (c) => c.fecha_inicio, h: (c) => fecha(c.fecha_inicio) }, { t: 'Término', v: (c) => c.fecha_fin || '', h: (c) => fecha(c.fecha_fin) }, { t: 'Sueldo bruto', num: 1, v: (c) => c.sueldo_bruto, h: (c) => clp(c.sueldo_bruto) }, { t: 'Estado', v: (c) => c.dias_para_vencer ?? 9999, h: est }];
  const pintar = (f) => { $('#tabla', el).innerHTML = tabla({ id: 'cto', columnas: cols, filas: f, vacio: 'No hay contratos con esos filtros.', acciones: permiso('contratos', 'editar') ? (c) => `<button class="btn chico sec" data-ed="${c.id}">Editar</button>` : null }); activarTabla(el); el._fil = f; };
  el.innerHTML = hero({ titulo: 'Contratos', texto: 'Contratos de trabajadores, vencimientos y masa salarial.', acciones: acc(permiso('contratos', 'crear') && '<button class="btn blanco" data-nuevo>Nuevo contrato</button>', btnCSV), cifra: cifra(vig.length, 'contratos vigentes') }) +
    `<div class="contenido"><div class="rejilla r4">${[{ etiqueta: 'Por vencer (30 días)', valor: porVencer.length, tono: porVencer.length ? 'ambar' : 'verde', detalle: 'Renovar o cerrar' }, { etiqueta: 'Masa salarial bruta', valor: clp(vig.reduce((s, c) => s + c.sueldo_bruto, 0)), tono: 'neutro', detalle: 'Contratos vigentes' }, { etiqueta: 'Plazo fijo', valor: vig.filter((c) => c.tipo === 'plazo_fijo').length, tono: 'neutro', detalle: 'Vigentes' }, { etiqueta: 'Honorarios', valor: vig.filter((c) => c.tipo === 'honorarios').length, tono: 'neutro', detalle: 'Vigentes' }].map(kpi).join('')}</div>
    <div><div class="herramientas"><input id="b" type="search" placeholder="Buscar trabajador, RUT, cargo o área"><select id="fe"><option value="">Todos los estados</option><option value="vigente">Vigentes</option><option value="vence">Por vencer</option><option value="terminado">Terminados</option></select><select id="ft"><option value="">Todos los tipos</option><option value="indefinido">Indefinido</option><option value="plazo_fijo">Plazo fijo</option><option value="honorarios">Honorarios</option></select></div><div id="tabla"></div></div></div>`;
  const filtrar = () => { const q = $('#b', el).value.toLowerCase(), e = $('#fe', el).value, t = $('#ft', el).value; pintar(datos.filter((c) => (!q || `${c.trabajador} ${c.rut} ${c.cargo} ${c.area}`.toLowerCase().includes(q)) && (!t || c.tipo === t) && (!e || (e === 'vence' ? porVencer.includes(c) : c.estado === e)))); };
  ['#b', '#fe', '#ft'].forEach((s) => $(s, el).addEventListener('input', filtrar)); pintar(datos); activar(el);
  $('[data-csv]', el).onclick = () => exportarCSV('contratos', cols, el._fil);
  const guardar = async (nuevo, c) => { const r = await formularioModal({ titulo: nuevo ? 'Nuevo contrato' : `Contrato de ${c.trabajador}`, campos: nuevo ? CTO : CTO_EDIT, valores: nuevo ? { tipo: 'indefinido' } : c, enviar: (d) => api(nuevo ? '/contratos/' : `/contratos/${c.id}/`, { metodo: nuevo ? 'POST' : 'PATCH', cuerpo: d }) }); if (r) { toast('Contrato guardado.'); ruta(); } };
  $('[data-nuevo]', el)?.addEventListener('click', () => guardar(true));
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-ed]'); if (b) guardar(false, datos.find((x) => x.id == b.dataset.ed)); });
}
const PRO = [{ n: 'nombre', l: 'Nombre del proceso', req: 1, ancho: 2 }, { n: 'area', l: 'Área', req: 1 }, { n: 'responsable', l: 'Responsable' }, { n: 'estado', l: 'Estado', t: 'select', op: [['planificado', 'Planificado'], ['en_curso', 'En curso'], ['bloqueado', 'Bloqueado'], ['completado', 'Completado']] }, { n: 'avance', l: 'Avance (%)', t: 'number', req: 1 }, { n: 'fecha_inicio', l: 'Inicio', t: 'date', req: 1 }, { n: 'fecha_fin', l: 'Término', t: 'date', req: 1 }, { n: 'descripcion', l: 'Detalle', t: 'textarea' }];
async function vProcesos(el) {
  const datos = await listar('procesos'), col = [['planificado', 'Planificado'], ['en_curso', 'En curso'], ['bloqueado', 'Bloqueado'], ['completado', 'Completado']], prom = datos.length ? Math.round(datos.reduce((s, p) => s + p.avance, 0) / datos.length) : 0;
  el.innerHTML = hero({ titulo: 'Procesos', texto: 'Estructura, responsables y avance de los procesos de la manufacturera.', acciones: permiso('procesos', 'crear') ? '<button class="btn blanco" data-nuevo>Nuevo proceso</button>' : '', cifra: cifra(prom, 'avance medio', 'pct') }) +
    `<div class="contenido"><div class="columnas">${col.map(([k, t]) => { const l = datos.filter((p) => p.estado === k); return `<section class="columna c-${k}"><h4>${t}<span>${l.length}</span></h4>${l.map((p) => `<article class="proceso" tabindex="0" data-id="${p.id}"><b>${esc(p.nombre)}</b><small>${esc(p.area)} · ${esc(p.responsable || 'Sin responsable')} · hasta ${fecha(p.fecha_fin)}</small><div class="progreso" role="progressbar" aria-valuenow="${p.avance}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p.avance}%"></i></div><small style="margin:6px 0 0">${p.avance}%</small></article>`).join('') || '<p class="vacio">Sin procesos.</p>'}</section>`; }).join('')}</div></div>`;
  activar(el);
  const abrir = async (p) => { if (!p || !permiso('procesos', 'editar')) { if (p) toast(`${p.nombre}: ${p.descripcion || 'Sin detalle.'}`); return; } const r = await formularioModal({ titulo: p ? 'Editar proceso' : 'Nuevo proceso', campos: PRO, valores: p || { estado: 'planificado', avance: 0, fecha_inicio: hoyIso() }, enviar: (d) => api(p ? `/procesos/${p.id}/` : '/procesos/', { metodo: p ? 'PATCH' : 'POST', cuerpo: d }) }); if (r) { toast('Proceso guardado.'); ruta(); } };
  $('[data-nuevo]', el)?.addEventListener('click', () => abrir(null));
  $$('.proceso', el).forEach((c) => { const f = () => abrir(datos.find((x) => x.id == c.dataset.id)); c.onclick = f; c.onkeydown = (e) => e.key === 'Enter' && f(); });
}
const DES = [{ n: 'codigo', l: 'Código', req: 1 }, { n: 'estado', l: 'Estado', t: 'select', op: [['programado', 'Programado'], ['en_ruta', 'En ruta'], ['entregado', 'Entregado'], ['retrasado', 'Retrasado']] }, { n: 'origen', l: 'Origen', req: 1 }, { n: 'destino', l: 'Destino', req: 1 }, { n: 'carga', l: 'Carga', req: 1, ancho: 2 }, { n: 'vehiculo', l: 'Vehículo' }, { n: 'conductor', l: 'Conductor' }, { n: 'fecha_salida', l: 'Salida', t: 'date', req: 1 }, { n: 'fecha_llegada', l: 'Llegada', t: 'date' }, { n: 'fecha_compromiso', l: 'Comprometida con el cliente', t: 'date' }, { n: 'completo', l: 'Entrega completa', t: 'checkbox' }, { n: 'costo', l: 'Costo (CLP)', t: 'number', req: 1 }];
async function vTransporte(el) {
  const datos = await listar('despachos', { limite: 500 }), n = (e) => datos.filter((d) => d.estado === e).length;
  const cols = [{ t: 'Código', v: (d) => d.codigo }, { t: 'Ruta', v: (d) => `${d.origen} → ${d.destino}`, h: (d) => `<b>${esc(d.origen)}</b> → ${esc(d.destino)}` }, { t: 'Carga', v: (d) => d.carga }, { t: 'Vehículo', v: (d) => `${d.vehiculo} · ${d.conductor}` }, { t: 'Salida', v: (d) => d.fecha_salida, h: (d) => fecha(d.fecha_salida) }, { t: 'Compromiso', v: (d) => d.fecha_compromiso || '', h: (d) => fecha(d.fecha_compromiso) }, { t: 'Costo', num: 1, v: (d) => d.costo, h: (d) => clp(d.costo) }, { t: 'Estado', v: (d) => d.estado_display, h: (d) => chip(d.estado_display, TONO_ESTADO[d.estado]) }];
  const pintar = (f) => { $('#tabla', el).innerHTML = tabla({ id: 'des', columnas: cols, filas: f, vacio: 'No hay despachos con esos filtros.', acciones: permiso('despachos', 'editar') ? (d) => `${d.estado !== 'entregado' ? `<button class="btn chico" data-ok="${d.id}">Marcar entregado</button>` : ''}<button class="btn chico sec" data-ed="${d.id}">Editar</button>` : null }); activarTabla(el); el._fil = f; };
  el.innerHTML = hero({ titulo: 'Transporte', texto: 'Despachos, rutas, costos y cumplimiento de entrega (OTIF).', acciones: acc(permiso('despachos', 'crear') && '<button class="btn blanco" data-nuevo>Nuevo despacho</button>', btnCSV), cifra: cifra(n('en_ruta'), 'en ruta ahora') }) +
    `<div class="contenido"><div class="rejilla r4">${[{ etiqueta: 'En ruta', valor: n('en_ruta'), tono: 'neutro', detalle: '' }, { etiqueta: 'Retrasados', valor: n('retrasado'), tono: n('retrasado') ? 'rojo' : 'verde', detalle: 'Requieren contacto' }, { etiqueta: 'Programados', valor: n('programado'), tono: 'neutro', detalle: '' }, { etiqueta: 'Costo total', valor: clp(datos.reduce((s, d) => s + d.costo, 0)), tono: 'neutro', detalle: 'Todos los despachos' }].map(kpi).join('')}</div>
    <div><div class="herramientas"><input id="b" type="search" placeholder="Buscar código, destino, carga o conductor"><select id="fe"><option value="">Todos los estados</option>${DES[1].op.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div><div id="tabla"></div></div></div>`;
  const filtrar = () => { const q = $('#b', el).value.toLowerCase(), e = $('#fe', el).value; pintar(datos.filter((d) => (!q || Object.values(d).join(' ').toLowerCase().includes(q)) && (!e || d.estado === e))); };
  $('#b', el).oninput = filtrar; $('#fe', el).onchange = filtrar; pintar(datos); activar(el);
  $('[data-csv]', el).onclick = () => exportarCSV('despachos', cols, el._fil);
  const guardar = async (d) => { const r = await formularioModal({ titulo: d ? `Despacho ${d.codigo}` : 'Nuevo despacho', campos: d ? DES.filter((c) => c.n !== 'codigo') : DES, valores: d || { estado: 'programado', fecha_salida: hoyIso(), costo: 0, completo: true }, enviar: (x) => api(d ? `/despachos/${d.id}/` : '/despachos/', { metodo: d ? 'PATCH' : 'POST', cuerpo: x }) }); if (r) { toast('Despacho guardado.'); ruta(); } };
  $('[data-nuevo]', el)?.addEventListener('click', () => guardar(null));
  el.addEventListener('click', async (e) => { const ed = e.target.closest('[data-ed]'), ok = e.target.closest('[data-ok]'); if (ed) guardar(datos.find((x) => x.id == ed.dataset.ed)); if (ok) { try { await api(`/despachos/${ok.dataset.ok}/`, { metodo: 'PATCH', cuerpo: { estado: 'entregado', fecha_llegada: hoyIso() } }); toast('Despacho marcado como entregado.'); ruta(); } catch (x) { toast(x.message, true); } } });
}
let mesCal = hoyIso().slice(0, 7);
async function vPlanificacion(el) {
  const d = await api('/calendario/', { params: { mes: mesCal } }), [y, m] = mesCal.split('-').map(Number), primero = new Date(y, m - 1, 1), diasMes = new Date(y, m, 0).getDate(), off = (primero.getDay() + 6) % 7, celdas = [];
  for (let i = 0; i < off; i++) celdas.push(null);
  for (let dia = 1; dia <= diasMes; dia++) celdas.push(dia);
  while (celdas.length % 7) celdas.push(null);
  const iso = (dia) => `${mesCal}-${String(dia).padStart(2, '0')}`, mover = (n) => { const f = new Date(y, m - 1 + n, 1); mesCal = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`; ruta(); };
  el.innerHTML = hero({ titulo: primero.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }), texto: 'Planes de mantención, procesos y despachos del mes.', acciones: '<button class="btn blanco" data-mv="-1">‹ Mes anterior</button><button class="btn blanco" data-mv="0">Hoy</button><button class="btn blanco" data-mv="1">Mes siguiente ›</button>' }) +
    `<div class="contenido"><div class="leyenda"><span><i style="background:#0b0b0c"></i>Plan de mantención</span><span><i style="background:#d91f26"></i>Proceso</span><span><i style="background:#6b6f78"></i>Despacho</span></div>
    <div class="cal"><div class="sem">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((x) => `<div>${x}</div>`).join('')}</div><div class="dias">${celdas.map((dia) => {
      if (!dia) return '<div class="dia otro"></div>';
      const dur = (e) => (new Date(e.fin) - new Date(e.inicio)) / 864e5, ev = d.eventos.filter((e) => (dur(e) <= 7 ? e.inicio <= iso(dia) && e.fin >= iso(dia) : e.inicio === iso(dia) || e.fin === iso(dia))), rot = (e) => (dur(e) <= 7 ? '' : e.inicio === iso(dia) ? '▶ ' : '■ ');
      return `<div class="dia ${iso(dia) === hoyIso() ? 'hoy' : ''}"><span class="n">${dia}</span>${ev.slice(0, 3).map((e) => `<span class="ev ${e.tipo} ${dur(e) > 7 ? 'largo' : ''}" title="${esc(e.titulo)} · ${esc(e.estado)} (${fecha(e.inicio)} – ${fecha(e.fin)})">${rot(e)}${esc(e.titulo)}</span>`).join('')}${ev.length > 3 ? `<div class="mas">+${ev.length - 3} más</div>` : ''}</div>`; }).join('')}</div></div></div>`;
  $$('[data-mv]', el).forEach((b) => (b.onclick = () => (b.dataset.mv === '0' ? ((mesCal = hoyIso().slice(0, 7)), ruta()) : mover(+b.dataset.mv))));
}

// ------------------------------------------------------------------ módulos nuevos: indicadores, organización, catálogo, inventario, calidad, seguridad, mantención, informes
const FMT = { '%': 'pct1', h: 'h', $: 'clp' };
const kpiTarjeta = (k) => `<div class="kpi-tarjeta ${k.estado}"><div class="e">${esc(k.nombre)}</div><div class="a">${esc(k.area)}${k.vivo ? ' · con datos de la planta' : ''}</div><div class="n">${k.valor == null ? '—' : `<span data-contar="${k.valor}" data-fmt="${FMT[k.unidad] || 'dec1'}">${k.valor}</span>`}</div>${spark(k.serie.map((s) => s.valor), { w: 200, h: 44 })}<small>Meta ${k.mejor === 'alto' ? '≥' : '≤'} ${k.unidad === '$' ? clp(k.meta) : k.meta + (k.unidad === '%' ? '%' : ' ' + k.unidad)} · últimos 6 meses</small><small>${esc(k.formula)}</small></div>`;
async function vIndicadores(el) {
  const d = await api('/kpis/'), verde = d.kpis.filter((k) => k.estado === 'ok').length;
  el.innerHTML = hero({ titulo: 'Indicadores', texto: 'Los 10 indicadores del informe de roles, con su meta y evolución. Los marcados con datos de la planta se calculan en vivo.', acciones: '<button class="btn blanco" data-csv>Exportar CSV</button><button class="btn blanco" onclick="print()">Imprimir / PDF</button>', cifra: cifra(verde, 'de 10 indicadores en meta') }) +
    `<div class="contenido"><div class="rejilla r3">${d.kpis.map(kpiTarjeta).join('')}</div><p class="nota-pie">${esc(d.nota)} Las metas son valores de demostración: defínalas con la gerencia.</p></div>`;
  activar(el);
  $('[data-csv]', el).onclick = () => exportarCSV('indicadores', [{ t: 'Indicador', v: (k) => k.nombre }, { t: 'Área', v: (k) => k.area }, { t: 'Valor', v: (k) => k.valor }, { t: 'Unidad', v: (k) => k.unidad }, { t: 'Meta', v: (k) => k.meta }, { t: 'Estado', v: (k) => k.estado }, { t: 'Fórmula', v: (k) => k.formula }], d.kpis);
}
const NIVELES = [['Dirección corporativa', 'Estrategia, inversión, cartera de clientes, riesgos mayores', 'Gerencia general, operaciones, finanzas'], ['Dirección del sitio', 'Metas, presupuesto de planta, prioridades entre áreas', 'Gerencia o jefatura de planta'], ['Responsables funcionales', 'Métodos, personal, recursos y cumplimiento por departamento', 'Jefe de producción, calidad, mantenimiento, logística, RR. HH.'], ['Supervisión y especialistas', 'Planes de turno, diagnósticos, revisiones y autorizaciones técnicas', 'Supervisor de turno, ingeniería, planificación, prevención'], ['Ejecución y soporte', 'Operación, inspección, mantenimiento, movimientos y registros', 'Operarios, técnicos, bodegueros, inspectores']];
async function vOrganizacion(el) {
  const tab = el._tab || 'cargos', tabs = [['cargos', 'Cargos (64)'], ['estructura', 'Estructura'], ['raci', 'Responsabilidades'], ['turnos', 'Rutina y turnos'], ['flujos', 'Flujos de trabajo']];
  let cuerpo = '';
  if (tab === 'cargos') {
    const cs = await listar('cargos', { limite: 100 }), fams = [...new Set(cs.map((c) => c.familia_nombre))];
    cuerpo = `<div class="herramientas"><input id="b" type="search" placeholder="Buscar cargo, función o conocimiento"><select id="fam"><option value="">Las 10 familias</option>${fams.map((f) => `<option>${esc(f)}</option>`).join('')}</select></div><div class="rejilla r2c" id="lista">${cs.map((c) => `<article class="cargo" data-fam="${esc(c.familia_nombre)}"><small>${esc(c.familia_nombre)} · cargo ${c.numero}</small><h4>${esc(c.nombre)}</h4><dl><dt>Para qué existe</dt><dd>${esc(c.existe)}</dd><dt>Qué hace</dt><dd>${esc(c.hace)}</dd><dt>Qué entrega</dt><dd>${esc(c.entrega)}</dd><dt>Se coordina con</dt><dd>${esc(c.coordina)}</dd><dt>Cómo se mide</dt><dd>${esc(c.medir)}</dd><dt>Conocimientos</dt><dd>${esc(c.conocimientos)}</dd></dl></article>`).join('')}</div>`;
  } else if (tab === 'estructura') {
    cuerpo = `<div class="tarjeta"><h3>Cómo se organiza la fábrica</h3>${tabla({ id: 'niv', columnas: [{ t: 'Nivel', v: (f) => f[0] }, { t: 'Qué decide', v: (f) => f[1] }, { t: 'Ejemplos de rol', v: (f) => f[2] }], filas: NIVELES })}</div><div class="tarjeta" style="margin-top:16px"><h3>Mapa de coordinación</h3><p>Pedido del cliente → Comercial y servicio al cliente → Planificación → Compras y bodega → Producción y operadores → Calidad y liberación → Bodega y despacho → Cliente. En paralelo, mantenimiento, ingeniería, TI/OT, prevención de riesgos, recursos humanos y finanzas habilitan el funcionamiento de toda la cadena.</p></div>`;
  } else if (tab === 'raci') {
    const r = (await api('/referencia/raci/')).raci;
    cuerpo = `<div class="tabla-wrap"><table class="raci"><thead><tr><th>Actividad</th>${r.areas.map((a) => `<th>${esc(a)}</th>`).join('')}</tr></thead><tbody>${r.filas.map((f) => `<tr><td><b>${esc(f[0])}</b></td>${f.slice(1).map((c) => `<td class="${c.replace('/', '')}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="nota-pie">${esc(r.leyenda)} Es un ejemplo para discusión interna: el manual real debe definir autorizaciones según riesgos, contrato y normativa.</p>`;
  } else if (tab === 'turnos') {
    const [rd, dt] = await Promise.all([api('/referencia/rutina_dia/'), api('/referencia/dotacion/')]);
    cuerpo = `<div class="rejilla r2"><div class="tarjeta"><h3>Rutina operacional</h3>${rd.rutina_dia.map((m) => `<div class="momento"><b>${esc(m.momento)}</b><span>${esc(m.acciones)}</span><small>${esc(m.quienes)}</small></div>`).join('')}</div><div class="tarjeta"><h3>Dotación por turnos (ejercicio ilustrativo)</h3>${tabla({ id: 'dot', columnas: [{ t: 'Función', v: (f) => f[0] }, { t: 'Modelo ilustrativo', v: (f) => f[1] }, { t: 'Observación', v: (f) => f[2] }], filas: dt.dotacion })}<p class="nota-pie">Cifras hipotéticas: no representan mínimos legales ni una recomendación de dotación.</p></div></div>`;
  } else {
    const fl = (await api('/referencia/flujos/')).flujos;
    cuerpo = `<div class="rejilla r2">${fl.map((f) => `<div class="tarjeta"><h3>${esc(f.titulo)}</h3><ol class="pasos">${f.pasos.map((p) => `<li>${esc(p)}</li>`).join('')}</ol></div>`).join('')}</div>`;
  }
  el.innerHTML = hero({ titulo: 'Organización', texto: 'Los 64 cargos de una planta manufacturera, cómo se coordinan y quién responde por qué.', cifra: cifra(64, 'cargos en 10 familias') }) + `<div class="contenido"><div class="pestanas">${tabs.map(([k, l]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('')}</div>${cuerpo}</div>`;
  activar(el); activarTabla(el);
  $$('[data-t]', el).forEach((b) => (b.onclick = () => { el._tab = b.dataset.t; vOrganizacion(el); }));
  const b = $('#b', el), fam = $('#fam', el);
  if (b) { const f = () => { const q = b.value.toLowerCase(), fm = fam.value; $$('.cargo', el).forEach((c) => (c.hidden = (q && !c.textContent.toLowerCase().includes(q)) || (fm && c.dataset.fam !== fm))); }; b.oninput = f; fam.onchange = f; }
}
async function vCatalogo(el) {
  const fs = await listar('fichas', { limite: 100 }), tab = el._tab || 'maquinaria', CATS = [['maquinaria', 'Maquinaria'], ['automatizacion', 'Automatización'], ['pieza', 'Piezas'], ['herramienta', 'Herramientas']];
  const ver = fs.filter((f) => f.categoria === tab);
  el.innerHTML = hero({ titulo: 'Catálogo técnico', texto: 'Máquinas, automatización, piezas y herramientas con su función, especificaciones orientativas y fallas frecuentes.', cifra: cifra(fs.length, 'fichas técnicas') }) +
    `<div class="contenido"><div class="pestanas">${CATS.map(([k, l]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${l} (${fs.filter((f) => f.categoria === k).length})</button>`).join('')}</div><div class="herramientas"><input id="b" type="search" placeholder="Buscar en esta categoría"></div>
    ${tabla({ id: 'cat', columnas: [{ t: 'Nombre', v: (f) => f.nombre, h: (f) => `<b>${esc(f.nombre)}</b>` }, { t: 'Función', v: (f) => f.funcion }, { t: 'Especificaciones orientativas', v: (f) => f.especificaciones }, { t: 'Fallas frecuentes', v: (f) => f.fallas.join(', ') }], filas: ver, acciones: (f) => `<button class="btn chico sec" data-v="${f.id}">Ver ficha</button>` })}
    <p class="nota-pie">Rangos orientativos: verifique siempre la ficha del fabricante y los procedimientos de seguridad.</p></div>`;
  activarTabla(el); $$('[data-t]', el).forEach((b) => (b.onclick = () => { el._tab = b.dataset.t; vCatalogo(el); })); $('#b', el).oninput = (e) => filtrarFilas($('tbody', el), e.target.value);
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (!b) return; const f = fs.find((x) => x.id == b.dataset.v);
    const dlg = document.createElement('dialog'); dlg.className = 'ficha'; dlg.innerHTML = `<div class="cuerpo"><div class="ficha-cab e-operando"><div>${f.categoria === 'maquinaria' ? svgMaquina(f.icono) : ''}</div><div><h2 class="display" style="margin:0;font-size:40px">${esc(f.nombre)}</h2><div class="sub">${esc(f.categoria_display)}</div></div></div><p><b>Función:</b> ${esc(f.funcion)}<br><b>Especificaciones:</b> ${esc(f.especificaciones)}</p><p><b>Piezas</b></p><div class="chips-f">${f.piezas.map((x) => `<span class="chip">${esc(x)}</span>`).join('')}</div><p><b>Herramientas de mantenimiento</b></p><div class="chips-f">${f.herramientas.map((x) => `<span class="chip negro">${esc(x)}</span>`).join('')}</div><p><b>Fallas frecuentes</b></p><div class="chips-f">${f.fallas.map((x) => `<span class="chip rojo">${esc(x)}</span>`).join('')}</div><div style="text-align:right"><button class="btn" data-x>Cerrar</button></div></div>`;
    document.body.append(dlg); dlg.showModal(); const c = () => { dlg.close(); dlg.remove(); }; dlg.querySelector('[data-x]').onclick = c; dlg.addEventListener('cancel', c); });
}
async function vInventario(el) {
  const rs = await listar('repuestos', { limite: 500 }), bajo = rs.filter((r) => r.bajo_minimo), valor = rs.reduce((s, r) => s + r.stock * r.costo_unitario, 0);
  const cols = [{ t: 'Código', v: (r) => r.codigo }, { t: 'Repuesto', v: (r) => r.nombre, h: (r) => `<b>${esc(r.nombre)}</b><br><small>${esc(r.fabricante)} ${esc(r.numero_parte)}</small>` }, { t: 'Tipo', v: (r) => r.tipo }, { t: 'Bodega', v: (r) => `${r.bodega} ${r.ubicacion}` }, { t: 'Stock', num: 1, v: (r) => r.stock, h: (r) => `${r.stock} ${r.bajo_minimo ? chip('bajo mínimo', 'rojo') : ''}` }, { t: 'Mínimo', num: 1, v: (r) => r.stock_minimo }, { t: 'Crítico', v: (r) => (r.critico ? 'Sí' : 'No'), h: (r) => (r.critico ? chip('Crítico', 'negro') : '') }, { t: 'Costo unit.', num: 1, v: (r) => r.costo_unitario, h: (r) => clp(r.costo_unitario) }];
  el.innerHTML = hero({ titulo: 'Inventario', texto: 'Repuestos por bodega, nivel mínimo y criticidad. El consumo por equipo se mide con lo entregado a cada orden de trabajo.', acciones: btnCSV, cifra: cifra(bajo.length, 'repuestos bajo el mínimo') }) +
    `<div class="contenido"><div class="rejilla r4">${[{ etiqueta: 'Repuestos', valor: rs.length, tono: 'neutro', detalle: 'En catálogo' }, { etiqueta: 'Bajo el mínimo', valor: bajo.length, tono: bajo.length ? 'rojo' : 'verde', detalle: `${bajo.filter((r) => r.critico).length} son críticos` }, { etiqueta: 'Valor en bodega', valor: clp(valor), tono: 'neutro', detalle: 'Stock × costo' }, { etiqueta: 'Críticos', valor: rs.filter((r) => r.critico).length, tono: 'neutro', detalle: 'Con cobertura a verificar' }].map(kpi).join('')}</div>
    <div><div class="herramientas"><input id="b" type="search" placeholder="Buscar repuesto, bodega o número de parte"></div>${tabla({ id: 'inv', columnas: cols, filas: rs })}</div>
    <div class="tarjeta"><div class="cab"><h3>Consumo de repuestos por equipo</h3><div class="herramientas" style="margin:0"><input type="date" id="cd" value="${new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)}"><input type="date" id="ch" value="${hoyIso()}"><button class="btn chico" id="cc">Ver consumo</button></div></div><div id="cons"></div></div></div>`;
  activar(el); activarTabla(el); $('#b', el).oninput = (e) => filtrarFilas($('tbody', el), e.target.value); $('[data-csv]', el).onclick = () => exportarCSV('inventario', cols, rs);
  const cons = async () => { try { const c = await api('/consumo/', { params: { desde: $('#cd', el).value, hasta: $('#ch', el).value } }); $('#cons', el).innerHTML = c.equipos.length ? `${tabla({ id: 'cons', columnas: [{ t: 'Equipo', v: (e) => e.equipo }, { t: 'Repuestos', v: (e) => e.filas.map((f) => `${f.repuesto} × ${f.cantidad}`).join(', ') }, { t: 'Costo', num: 1, v: (e) => e.total, h: (e) => clp(e.total) }], filas: c.equipos })}<p class="nota-pie">Total del período: <b>${clp(c.total)}</b></p>` : '<p class="vacio">Sin consumo en ese período.</p>'; activarTabla(el); } catch (e) { toast(e.message, true); } };
  $('#cc', el).onclick = cons; cons();
}
async function vCalidad(el) {
  const [ncs, kp] = await Promise.all([listar('noconformidades', { limite: 200 }), api('/kpis/')]);
  const k = (c) => kp.kpis.find((x) => x.clave === c), abiertas = ncs.filter((n) => ['contenido', 'en_analisis'].includes(n.estado));
  const cols = [{ t: 'Lote', v: (n) => n.lote }, { t: 'Producto', v: (n) => n.producto }, { t: 'Defecto', v: (n) => n.defecto }, { t: 'Cantidad', num: 1, v: (n) => n.cantidad }, { t: 'Equipo', v: (n) => n.equipo_nombre }, { t: 'Estado', v: (n) => n.estado_display, h: (n) => chip(n.estado_display, TONO_ESTADO[n.estado]) }, { t: 'Disposición', v: (n) => n.disposicion }, { t: 'Fecha', v: (n) => n.creado, h: (n) => fecha(n.creado) }];
  el.innerHTML = hero({ titulo: 'Calidad', texto: 'No conformidades: producto contenido, en análisis, liberado o rechazado. No se libera sin autorización de calidad.', acciones: btnCSV, cifra: cifra(abiertas.length, 'abiertas ahora') }) +
    `<div class="contenido"><div class="rejilla r3">${kpiTarjeta(k('tasa_defectos'))}${kpiTarjeta(k('oee'))}${kpiTarjeta(k('cumplimiento_plan'))}</div>${tabla({ id: 'nc', columnas: cols, filas: ncs, acciones: permiso('noconformidades', 'editar') ? (n) => `<button class="btn chico sec" data-ed="${n.id}">Resolver</button>` : null })}</div>`;
  activar(el); activarTabla(el); $('[data-csv]', el).onclick = () => exportarCSV('no-conformidades', cols, ncs);
  el.addEventListener('click', async (e) => { const b = e.target.closest('[data-ed]'); if (!b) return; const r = await formularioModal({ titulo: 'Resolver no conformidad', campos: [{ n: 'estado', l: 'Resultado', t: 'select', op: [['contenido', 'Contenido'], ['en_analisis', 'En análisis'], ['liberado', 'Liberado'], ['rechazado', 'Rechazado']] }, { n: 'disposicion', l: 'Disposición', t: 'textarea' }], valores: ncs.find((n) => n.id == b.dataset.ed), enviar: (d) => api(`/noconformidades/${b.dataset.ed}/`, { metodo: 'PATCH', cuerpo: d }) }); if (r) { toast('Actualizada.'); ruta(); } });
}
async function vSeguridad(el) {
  const [inc, acs, kp, S] = await Promise.all([listar('incidentes', { limite: 200 }), listar('acciones_hse', { limite: 200 }).catch(() => []), api('/kpis/'), api('/referencia/seguridad/')]);
  const abiertos = inc.filter((i) => i.estado !== 'cerrado'), venc = acs.filter((a) => a.vencida);
  el.innerHTML = hero({ titulo: 'Seguridad', texto: 'Incidentes, condiciones inseguras y acciones preventivas. La producción no prevalece sobre la seguridad.', cifra: cifra(abiertos.length, 'incidentes abiertos') }) +
    `<div class="contenido"><div class="rejilla r3">${kpiTarjeta(kp.kpis.find((x) => x.clave === 'cierre_acciones'))}<div class="kpi rojo"><span class="e">Acciones vencidas</span><b>${venc.length}</b><small>Prevención</small></div><div class="kpi"><span class="e">Incidentes registrados</span><b>${inc.length}</b><small>${abiertos.length} abiertos</small></div></div>
    <div class="rejilla r2"><div><h3 class="display" style="margin:0 0 10px">Incidentes</h3>${tabla({ id: 'inc', columnas: [{ t: 'Qué pasó', v: (i) => i.descripcion }, { t: 'Tipo', v: (i) => i.tipo_display }, { t: 'Lugar', v: (i) => i.ubicacion }, { t: 'Estado', v: (i) => i.estado_display, h: (i) => chip(i.estado_display, TONO_ESTADO[i.estado]) }, { t: 'Fecha', v: (i) => i.creado, h: (i) => fecha(i.creado) }], filas: inc })}</div>
    <div><h3 class="display" style="margin:0 0 10px">Acciones preventivas</h3>${tabla({ id: 'acc', columnas: [{ t: 'Acción', v: (a) => a.descripcion }, { t: 'Responsable', v: (a) => a.responsable }, { t: 'Vence', v: (a) => a.vence, h: (a) => fecha(a.vence) }, { t: 'Estado', v: (a) => (a.cerrada_en ? 'Cerrada' : a.vencida ? 'Vencida' : 'En plazo'), h: (a) => (a.cerrada_en ? chip('Cerrada', 'verde') : chip(a.vencida ? 'Vencida' : 'En plazo', a.vencida ? 'rojo' : '')) }], filas: acs })}</div></div>
    <div class="tarjeta"><h3>Marco en Chile (referencia)</h3><ul>${S.seguridad.chile.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><p class="nota-pie">Verifique el texto normativo vigente y el asesoramiento del organismo administrador o de especialistas.</p></div></div>`;
  activar(el); activarTabla(el);
}
async function vMantencion(el) {
  const [kp, ots, eqs, par] = await Promise.all([api('/kpis/'), listar('ordenes', { excluir_estado: 'cerrada', limite: 60 }), listar('equipos'), listar('paradas', { limite: 12 }).catch(() => [])]);
  const k = (c) => kp.kpis.find((x) => x.clave === c);
  el.innerHTML = hero({ titulo: 'Mantención', texto: 'Estado de equipos, órdenes y paradas. Solo lectura: la gestión se hace en la aplicación de terreno.', cifra: cifra(ots.length, 'órdenes abiertas') }) +
    `<div class="contenido"><div class="rejilla r3">${kpiTarjeta(k('mttr'))}${kpiTarjeta(k('mtbf'))}${kpiTarjeta(k('oee'))}</div>
    <div class="rejilla r2"><div><h3 class="display" style="margin:0 0 10px">Órdenes abiertas</h3>${tabla({ id: 'ot', columnas: [{ t: 'N°', v: (o) => o.numero }, { t: 'Equipo', v: (o) => o.equipo_nombre }, { t: 'Orden', v: (o) => o.titulo }, { t: 'Prioridad', v: (o) => o.prioridad_display, h: (o) => chip(o.prioridad_display, o.prioridad === 'alta' ? 'rojo' : '') }, { t: 'Estado', v: (o) => o.estado_display, h: (o) => chip(o.estado_display + (o.sin_avance ? ` · ${o.horas_sin_avance} h sin avance` : ''), o.sin_avance ? 'rojo' : 'ambar') }], filas: ots, vacio: 'No hay órdenes abiertas.' })}</div>
    <div><h3 class="display" style="margin:0 0 10px">Equipos</h3>${tabla({ id: 'eq', columnas: [{ t: 'Equipo', v: (e) => e.nombre_habitual, h: (e) => `<b>${esc(e.nombre_habitual)}</b><br><small>${esc(e.zona)}</small>` }, { t: 'Criticidad', v: (e) => e.criticidad_display }, { t: 'Estado', v: (e) => e.estado_display, h: (e) => chip(e.estado_display, TONO_ESTADO[e.estado]) }], filas: eqs, acciones: (e) => `<button class="btn chico sec" data-eq="${e.id}">Ficha</button>` })}</div></div>
    ${par.length ? `<div><h3 class="display" style="margin:0 0 10px">Paradas recientes</h3>${tabla({ id: 'par', columnas: [{ t: 'Equipo', v: (p) => p.equipo_nombre }, { t: 'Motivo', v: (p) => p.motivo_display }, { t: 'Inicio', v: (p) => p.inicio, h: (p) => new Date(p.inicio).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }, { t: 'Duración', num: 1, v: (p) => p.minutos, h: (p) => `${p.minutos} min` }, { t: 'Estado', v: (p) => (p.activa ? 'Activa' : 'Cerrada'), h: (p) => chip(p.activa ? 'Activa' : 'Cerrada', p.activa ? 'rojo' : '') }], filas: par })}</div>` : ''}</div>`;
  activar(el); activarTabla(el); el.addEventListener('click', (e) => { const b = e.target.closest('[data-eq]'); if (b) abrirEquipo(+b.dataset.eq); });
}
async function vInformes(el) {
  const [kp, inf, gl] = await Promise.all([api('/kpis/'), listar('informes'), api('/referencia/glosario/')]);
  const cols = [{ t: 'Indicador', v: (k) => k.nombre }, { t: 'Área', v: (k) => k.area }, { t: 'Valor', v: (k) => k.valor }, { t: 'Meta', v: (k) => k.meta }, { t: 'Estado', v: (k) => k.estado }];
  el.innerHTML = hero({ titulo: 'Informes', texto: 'Resumen de indicadores, informes técnicos y glosario. Se pueden imprimir o guardar como PDF.', acciones: '<button class="btn blanco" onclick="print()">Imprimir / PDF</button><button class="btn blanco" data-csv>Exportar CSV</button>' }) +
    `<div class="contenido"><div class="tarjeta"><h3>Indicadores del período</h3>${tabla({ id: 'k', columnas: [{ t: 'Indicador', v: (k) => k.nombre }, { t: 'Área', v: (k) => k.area }, { t: 'Valor', num: 1, v: (k) => k.valor, h: (k) => (k.valor == null ? '—' : k.unidad === '$' ? clp(k.valor) : k.valor + (k.unidad === '%' ? '%' : ' ' + k.unidad)) }, { t: 'Meta', num: 1, v: (k) => k.meta }, { t: 'Estado', v: (k) => k.estado, h: (k) => chip({ ok: 'En meta', aviso: 'Cerca', critico: 'Fuera de meta', sin_dato: 'Sin dato' }[k.estado], { ok: 'verde', aviso: 'ambar', critico: 'rojo' }[k.estado] || '') }], filas: kp.kpis })}</div>
    <div class="tarjeta"><h3>Informes técnicos</h3>${inf.length ? inf.map((i) => `<details class="lista-it" style="display:block"><summary><b style="display:inline">${esc(i.titulo)}</b> <small>· ${esc(corto(i.autor_nombre))} · ${fecha(i.creado)}</small></summary><p class="informe">${esc(i.contenido)}</p></details>`).join('') : '<p class="vacio">Aún no hay informes.</p>'}</div>
    <div class="tarjeta"><h3>Glosario</h3>${tabla({ id: 'gl', columnas: [{ t: 'Sigla', v: (g) => g[0], h: (g) => `<b>${esc(g[0])}</b>` }, { t: 'Significado', v: (g) => g[1] }], filas: gl.glosario })}</div></div>`;
  activarTabla(el); $('[data-csv]', el).onclick = () => exportarCSV('indicadores', cols, kp.kpis);
}

// ------------------------------------------------------------------ enrutador
const VISTAS = { panel: vPanel, mapa: vMapa, finanzas: vFinanzas, contratos: vContratos, organizacion: vOrganizacion, procesos: vProcesos, transporte: vTransporte, planificacion: vPlanificacion, mantencion: vMantencion, calidad: vCalidad, seguridad: vSeguridad, indicadores: vIndicadores, catalogo: vCatalogo, inventario: vInventario, informes: vInformes };
let anterior = -1;
async function ruta() {
  detener();
  const nombre = location.hash.replace(/^#\//, '').split('/')[0] || U.menu[0], r = U.menu.includes(nombre) ? nombre : U.menu[0], idx = U.menu.indexOf(r), atras = idx < anterior; anterior = idx;
  $$('.lateral nav a').forEach((a) => a.classList.toggle('activo', a.dataset.r === r)); moverIndicador(); $('#app').classList.remove('abierto');
  const viejo = $('#vista'), el = viejo.cloneNode(false); viejo.replaceWith(el);
  document.title = `${TITULOS[r]} · SIMA`; el.innerHTML = esqueleto();
  try { await VISTAS[r](el); el.classList.add(atras ? 'entra-atras' : 'entra'); }
  catch (e) { if (e.estado !== 401) el.innerHTML = `<div class="contenido"><div class="aviso-error">${esc(e.message)}</div></div>`; }
}
function arrancar() { estructura(); if (!location.hash) location.hash = '#/' + U.menu[0]; ruta(); }
window.addEventListener('hashchange', () => U && ruta());
onCerrar((porInactividad) => { detener(); U = null; pantallaAcceso(porInactividad ? 'Su sesión terminó por inactividad. Ingrese de nuevo.' : ''); });
const s = sesion();
if (s) { U = s.usuario; arrancar(); } else pantallaAcceso();
