// Ilustraciones de las 10 máquinas del catálogo técnico. Cada una es un SVG en línea con partes móviles
// (clases rot, belt, ram…) que solo se animan cuando el equipo está operando; ver css/animaciones.
const P = (cuerpo) => `<svg class="maq" viewBox="0 0 120 84" fill="none" stroke="#0b0b0c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${cuerpo}</svg>`;
const C = 'fill="var(--maq-cuerpo)"', A = 'fill="var(--maq-acero)"', R = 'fill="var(--maq-acento)"';

const DIBUJOS = {
  torno: `<rect x="6" y="58" width="108" height="8" rx="2" ${A}/><rect x="8" y="30" width="30" height="28" rx="3" ${C}/><circle cx="46" cy="44" r="10" ${A}/>
    <g class="rot"><path d="M46 36v16M38 44h16"/></g><rect x="92" y="40" width="20" height="18" rx="3" ${C}/><g class="desliza"><rect x="62" y="48" width="14" height="10" ${R}/><path d="M62 52h-8"/></g><path d="M12 66v10M108 66v10"/>`,
  centro: `<rect x="10" y="12" width="76" height="56" rx="4" ${C}/><rect x="18" y="20" width="60" height="30" rx="2" ${A} opacity=".55"/><g class="vertical"><rect x="42" y="22" width="12" height="14" ${R}/><path d="M48 36v8"/></g>
    <rect x="30" y="50" width="36" height="5" ${C}/><rect x="92" y="22" width="18" height="46" rx="3" ${C}/><rect x="96" y="28" width="10" height="8" ${A}/><circle cx="101" cy="47" r="2.6" ${R}/><path d="M14 68v8M82 68v8"/>`,
  prensa: `<rect x="18" y="8" width="84" height="12" rx="2" ${C}/><rect x="22" y="20" width="8" height="48" ${A}/><rect x="90" y="20" width="8" height="48" ${A}/><rect x="44" y="4" width="32" height="14" ${R}/>
    <g class="ram"><rect x="53" y="20" width="14" height="20" ${A}/><rect x="40" y="38" width="40" height="8" ${C}/></g><rect x="30" y="58" width="60" height="10" rx="2" ${C}/><rect x="14" y="68" width="92" height="6" rx="1" ${C}/>`,
  inyectora: `<rect x="6" y="40" width="46" height="18" rx="3" ${A}/><path d="M18 40V26h16v14" ${C}/><path class="flujo" d="M10 49h38" stroke-dasharray="4 4"/><rect x="58" y="30" width="6" height="36" ${A}/>
    <g class="clamp"><rect x="84" y="30" width="6" height="36" ${A}/><rect x="64" y="44" width="20" height="8" ${R}/></g><rect x="96" y="34" width="16" height="28" rx="3" ${C}/><rect x="4" y="62" width="108" height="8" rx="2" ${C}/>`,
  cinta: `<rect x="8" y="46" width="104" height="14" rx="7" ${A}/><clipPath id="cc"><rect x="14" y="20" width="92" height="28"/></clipPath><g clip-path="url(#cc)"><g class="belt"><rect x="-22" y="32" width="14" height="14" ${C}/>
    <rect x="14" y="30" width="16" height="16" ${R}/><rect x="50" y="34" width="12" height="12" ${C}/><rect x="86" y="30" width="16" height="16" ${R}/></g></g><g class="rot"><circle cx="15" cy="53" r="6" ${C}/><path d="M15 49v8"/></g>
    <g class="rot"><circle cx="105" cy="53" r="6" ${C}/><path d="M105 49v8"/></g><path d="M26 60v14M60 60v14M94 60v14"/>`,
  robot: `<rect x="14" y="62" width="40" height="10" rx="2" ${C}/><rect x="28" y="50" width="14" height="12" ${A}/><g class="brazo1"><rect x="31" y="22" width="8" height="30" rx="3" ${R}/><circle cx="35" cy="22" r="5" ${C}/>
    <g class="brazo2"><rect x="35" y="18" width="36" height="8" rx="3" ${C}/><circle cx="71" cy="22" r="4" ${A}/><path d="M71 26v14M65 40h12"/></g></g><rect x="82" y="58" width="30" height="14" ${A}/><rect x="88" y="48" width="14" height="10" ${C}/>`,
  soldadora: `<rect x="8" y="26" width="46" height="40" rx="4" ${C}/><circle cx="23" cy="43" r="8" ${A}/><g class="aguja"><path d="M23 43l5-5"/></g><rect x="34" y="34" width="14" height="6" ${R}/><path d="M14 66v8M48 66v8"/>
    <path d="M54 44c14-8 20 8 32 0"/><path d="M90 22l12 16" stroke-width="4"/><g class="chispa"><path d="M104 40l6 6M110 36l4 2M102 46l4 8" stroke="var(--maq-acento)"/></g><rect x="82" y="64" width="34" height="6" ${A}/>`,
  envasadora: `<rect x="18" y="6" width="52" height="36" rx="4" ${C}/><rect x="26" y="12" width="36" height="10" ${A}/><g class="gota"><path d="M34 44v7M48 44v7M62 44v7" stroke-dasharray="3 3"/></g><rect x="6" y="60" width="108" height="10" rx="3" ${A}/>
    <clipPath id="ce"><rect x="6" y="40" width="108" height="20"/></clipPath><g clip-path="url(#ce)"><g class="belt"><rect x="-6" y="46" width="8" height="14" rx="2" ${R}/><rect x="30" y="46" width="8" height="14" rx="2" ${R}/><rect x="66" y="46" width="8" height="14" rx="2" ${R}/><rect x="102" y="46" width="8" height="14" rx="2" ${R}/></g></g>
    <rect x="78" y="12" width="30" height="30" rx="3" ${C}/><rect x="84" y="18" width="18" height="10" ${A}/><circle cx="93" cy="35" r="2.6" ${R}/><path d="M12 70v6M108 70v6"/>`,
  compresor: `<rect x="8" y="30" width="64" height="22" rx="11" ${C}/><path d="M22 34v14M58 34v14"/><rect x="76" y="32" width="32" height="30" rx="4" ${A}/><g class="rot"><circle cx="92" cy="47" r="9" ${C}/><path d="M92 38v18M83 47h18"/></g>
    <circle cx="40" cy="16" r="9" ${C}/><g class="aguja2"><path d="M40 16l6-5" stroke="var(--maq-acento)"/></g><path d="M40 25v5M24 52v12M56 52v12M8 64h104"/>`,
  bomba: `<circle cx="44" cy="48" r="21" ${C}/><g class="rot"><circle cx="44" cy="48" r="12" ${A}/><path d="M44 36c7 6 7 18 0 24M44 36c-7 6-7 18 0 24"/></g><rect x="66" y="40" width="40" height="18" rx="3" ${A}/><path d="M72 44v10M78 44v10M84 44v10"/>
    <path d="M44 27V14H12"/><path class="flujo" d="M40 14H16" stroke="var(--maq-acento)" stroke-dasharray="4 4"/><path d="M20 72h86"/>`,
  generico: `<rect x="14" y="20" width="92" height="46" rx="6" ${C}/><g class="rot"><circle cx="60" cy="43" r="13" ${A}/><path d="M60 30v26M47 43h26"/></g>`,
};

export function svgMaquina(icono) {
  return P(DIBUJOS[icono] || DIBUJOS.generico);
}
export const ICONOS_MAQUINA = Object.keys(DIBUJOS);
