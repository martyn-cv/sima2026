import type { Condicion, Peldano, ProgramaPlc, Variable } from "@sima/cliente";
import type { Config, CfgEquipo, CfgModulo, CfgPunto, PlcLista } from "./simulador";

/**
 * Planta incluida en el simulador: 4 PLC y 15 equipos con sus sensores, módulos, puntos de E/S y programas en escalera.
 * Es la misma planta que SIMA guarda en su base de datos, pero aquí viaja dentro de la aplicación para que el simulador funcione solo.
 */
const N1 = "Nave 1 · Mecanizado", N2 = "Nave 2 · Plásticos", N3 = "Nave 3 · Envasado", SM = "Sala de máquinas";

type S = [variable: string, nombre: string, unidad: string, min: number, max: number, nominal: number, aviso: number, alarma: number];
const SENSORES: Record<string, S[]> = {
  "Torno CNC": [["vibracion", "Vibración del husillo", "mm/s", 0, 10, 2.0, 4.5, 7.0], ["temp_husillo", "Temperatura del husillo", "°C", 20, 100, 45, 70, 85], ["corriente", "Corriente del motor", "A", 0, 80, 32, 55, 68]],
  "Centro de mecanizado CNC": [["vibracion", "Vibración del husillo", "mm/s", 0, 10, 1.8, 4.5, 7.0], ["temp_husillo", "Temperatura del husillo", "°C", 20, 100, 48, 72, 88], ["corriente", "Corriente del motor", "A", 0, 80, 36, 58, 70]],
  "Prensa hidráulica": [["presion", "Presión del circuito", "bar", 0, 300, 180, 240, 270], ["temp_aceite", "Temperatura del aceite", "°C", 20, 90, 45, 60, 72]],
  "Inyectora de plástico": [["temp_cilindro", "Temperatura del cilindro", "°C", 100, 350, 230, 280, 310], ["presion", "Presión de inyección", "bar", 0, 250, 140, 200, 230]],
  "Cinta transportadora": [["vibracion", "Vibración del reductor", "mm/s", 0, 10, 1.8, 4.5, 7.0], ["corriente", "Corriente del motor", "A", 0, 20, 6.5, 11, 14], ["temp_motor", "Temperatura del motor", "°C", 20, 120, 55, 85, 100]],
  "Robot industrial articulado": [["temp_servo", "Temperatura de servomotor", "°C", 20, 100, 50, 70, 85], ["corriente", "Corriente de ejes", "A", 0, 40, 14, 28, 35]],
  "Máquina de soldadura MIG/MAG": [["corriente", "Corriente de soldadura", "A", 0, 500, 220, 400, 450], ["temp_antorcha", "Temperatura de la antorcha", "°C", 20, 200, 80, 140, 170]],
  "Envasadora automática": [["temp_sellado", "Temperatura de sellado", "°C", 80, 220, 160, 190, 205], ["presion", "Presión de aire", "bar", 0, 10, 6, 8.5, 9.5]],
  "Compresor de aire industrial": [["presion", "Presión de descarga", "bar", 0, 12, 8, 10, 11], ["temp_descarga", "Temperatura de descarga", "°C", 40, 130, 85, 100, 110], ["vibracion", "Vibración", "mm/s", 0, 10, 2.2, 4.5, 7.0]],
  "Bomba centrífuga": [["vibracion", "Vibración", "mm/s", 0, 12, 2.5, 4.5, 7.1], ["temp_rodamiento", "Temperatura del rodamiento", "°C", 20, 110, 55, 80, 95]],
};

const PLCS: (PlcLista & { ip: string; ciclo: number })[] = [
  { codigo: "PLC-01", nombre: "PLC Nave 1 · Mecanizado", fabricante: "Siemens", modelo: "S7-1500 · CPU 1511-1 PN (simulado)", zona: N1, ip: "10.10.1.11", ciclo: 100 },
  { codigo: "PLC-02", nombre: "PLC Nave 2 · Inyección", fabricante: "Rockwell", modelo: "CompactLogix 5380 (simulado)", zona: N2, ip: "10.10.2.11", ciclo: 100 },
  { codigo: "PLC-03", nombre: "PLC Nave 3 · Envasado", fabricante: "Siemens", modelo: "S7-1200 · CPU 1215C (simulado)", zona: N3, ip: "10.10.3.11", ciclo: 100 },
  { codigo: "PLC-04", nombre: "PLC Sala de máquinas", fabricante: "Schneider", modelo: "Modicon M580 (simulado)", zona: SM, ip: "10.10.4.11", ciclo: 100 },
];

const EQUIPOS: [codigo: string, nombre: string, tipo: string, criticidad: string, plc: string][] = [
  ["TC-01", "Torno 1", "Torno CNC", "alta", "PLC-01"], ["TC-02", "El torno grande", "Torno CNC", "media", "PLC-01"], ["CM-01", "Centro de 5 ejes", "Centro de mecanizado CNC", "alta", "PLC-01"],
  ["PH-01", "Prensa de 200 t", "Prensa hidráulica", "media", "PLC-01"], ["SD-01", "Soldadora MIG 1", "Máquina de soldadura MIG/MAG", "baja", "PLC-01"], ["RB-01", "Robot de paletizado", "Robot industrial articulado", "media", "PLC-01"],
  ["IN-01", "Inyectora 1", "Inyectora de plástico", "media", "PLC-02"], ["IN-02", "La Vieja", "Inyectora de plástico", "media", "PLC-02"], ["IN-03", "Inyectora 3 (pasillo norte)", "Inyectora de plástico", "alta", "PLC-02"], ["CT-01", "Cinta de salida L3", "Cinta transportadora", "media", "PLC-02"],
  ["EV-01", "Envasadora 1", "Envasadora automática", "media", "PLC-03"], ["EV-02", "Envasadora 2", "Envasadora automática", "alta", "PLC-03"], ["CT-02", "Cinta de envasado", "Cinta transportadora", "media", "PLC-03"],
  ["CP-01", "Compresor de tornillo", "Compresor de aire industrial", "alta", "PLC-04"], ["BC-01", "Bomba de enfriamiento", "Bomba centrífuga", "media", "PLC-04"],
];

const pre = (cod: string) => cod.replace("-", "");
const na = (tag: string): Condicion => ({ tipo: "NA", tag });
const nc = (tag: string): Condicion => ({ tipo: "NC", tag });

/** Programa en escalera de un grupo de equipos: marcha con enclavamiento, contactor, luces, disparo por límite de alarma y rearme. */
function programa(equipos: CfgEquipo[]): ProgramaPlc {
  const variables: Variable[] = [];
  const peldanos: Peldano[] = [];
  let n = 1;
  const peldano = (comentario: string, condiciones: Condicion[], salida: Peldano["salida"]) => peldanos.push({ id: n++, comentario, condiciones, salida });
  for (const e of equipos) {
    const p = (s: string) => `${pre(e.codigo)}_${s}`;
    variables.push({ nombre: p("RUN"), tipo: "bool", descripcion: `${e.codigo} en marcha (enclavado)` }, { nombre: p("FALLA"), tipo: "bool", descripcion: `${e.codigo} con falla (enclavada)` },
      { nombre: p("T_DISPARO"), tipo: "timer", preset: 2000, descripcion: `${e.codigo} retardo de disparo por límite analógico` });
    peldano(`${e.codigo} · marcha con enclavamiento (paro, emergencia y falla la cortan)`, [{ tipo: "OR", ramas: [[na(p("MARCHA"))], [na(p("RUN"))]] }, nc(p("PARO")), nc(p("EMERG")), nc(p("FALLA"))], { tipo: "BOBINA", tag: p("RUN") });
    peldano(`${e.codigo} · contactor del motor`, [na(p("RUN"))], { tipo: "BOBINA", tag: p("CONTACTOR") });
    peldano(`${e.codigo} · luz verde`, [na(p("RUN"))], { tipo: "BOBINA", tag: p("LUZ_VERDE") });
    peldano(`${e.codigo} · límite de alarma de cualquier variable (retardo 2 s)`,
      [na(p("RUN")), { tipo: "OR", ramas: e.sensores.map((s) => [{ tipo: "CMP", tag: p(s.variable.toUpperCase()), op: ">=", valor: s.alarma } as Condicion]) }], { tipo: "TON", tag: p("T_DISPARO"), preset: 2000 });
    peldano(`${e.codigo} · la falla se enclava al cumplirse el retardo`, [na(p("T_DISPARO"))], { tipo: "SET", tag: p("FALLA") });
    peldano(`${e.codigo} · luz roja`, [na(p("FALLA"))], { tipo: "BOBINA", tag: p("LUZ_ROJA") });
    peldano(`${e.codigo} · rearme de la falla con el paro, si las variables volvieron a rango`, [na(p("PARO")), nc(p("T_DISPARO"))], { tipo: "RESET", tag: p("FALLA") });
  }
  return { version: 1, variables, peldanos };
}

export const LISTA_LOCAL: PlcLista[] = PLCS.map(({ codigo, nombre, fabricante, modelo, zona }) => ({ codigo, nombre, fabricante, modelo, zona }));

/** Configuración completa de un PLC de la planta incluida: módulos, puntos de entrada y salida, equipos y programa. */
export function configLocal(codigo: string): Config {
  const def = PLCS.find((x) => x.codigo === codigo) ?? PLCS[3];
  const equipos: CfgEquipo[] = EQUIPOS.filter((e) => e[4] === def.codigo).map(([cod, nombre, tipo, crit]) => ({
    codigo: cod, nombre, tipo, criticidad: crit,
    sensores: SENSORES[tipo].map(([variable, nom, unidad, min, max, nominal, aviso, alarma]) => ({ variable, nombre: nom, unidad, min, max, nominal, aviso, alarma })),
  }));

  type P = Omit<CfgPunto, "direccion" | "canal" | "moduloId">;
  const puntos: P[] = [];
  for (const e of equipos) {
    const p = pre(e.codigo);
    puntos.push({ tag: `${p}_MARCHA`, tipo: "DI", descripcion: `${e.codigo} · pulsador de marcha`, equipo: e.codigo, unidad: "", minimo: 0, maximo: 1 },
      { tag: `${p}_PARO`, tipo: "DI", descripcion: `${e.codigo} · pulsador de paro`, equipo: e.codigo, unidad: "", minimo: 0, maximo: 1 },
      { tag: `${p}_EMERG`, tipo: "DI", descripcion: `${e.codigo} · parada de emergencia`, equipo: e.codigo, unidad: "", minimo: 0, maximo: 1 },
      { tag: `${p}_CONTACTOR`, tipo: "DO", descripcion: `${e.codigo} · contactor del motor`, equipo: e.codigo, unidad: "", minimo: 0, maximo: 1 },
      { tag: `${p}_LUZ_VERDE`, tipo: "DO", descripcion: `${e.codigo} · luz verde (en marcha)`, equipo: e.codigo, unidad: "", minimo: 0, maximo: 1 },
      { tag: `${p}_LUZ_ROJA`, tipo: "DO", descripcion: `${e.codigo} · luz roja (falla)`, equipo: e.codigo, unidad: "", minimo: 0, maximo: 1 });
    for (const s of e.sensores) puntos.push({ tag: `${p}_${s.variable.toUpperCase()}`, tipo: "AI", descripcion: `${e.codigo} · ${s.nombre}`, equipo: e.codigo, variable: s.variable, unidad: s.unidad, minimo: s.min, maximo: s.max });
  }

  const modulos: CfgModulo[] = [{ id: 1, slot: 1, tipo: "PS", modelo: "Fuente 24 V / 10 A", canales: 0 }, { id: 2, slot: 2, tipo: "CPU", modelo: def.modelo.replace(" (simulado)", ""), canales: 0 }];
  const finales: CfgPunto[] = [];
  let slot = 3, id = 3;
  for (const [tipo, canales, nombre] of [["DI", 16, "DI 16×24 VDC"], ["DO", 16, "DO 16×24 VDC / 0,5 A"], ["AI", 8, "AI 8×U/I/RTD"]] as const) {
    const lista = puntos.filter((x) => x.tipo === tipo);
    for (let k = 0; k * canales < lista.length; k++) {
      const m: CfgModulo = { id: id++, slot: slot++, tipo, modelo: nombre, canales };
      modulos.push(m);
      lista.slice(k * canales, (k + 1) * canales).forEach((pt, ch) => finales.push({
        ...pt, canal: ch, moduloId: m.id,
        direccion: tipo === "AI" ? `IW${64 + 2 * (k * 8 + ch)}` : `${tipo === "DI" ? "I" : "Q"}${k * 2 + Math.floor(ch / 8)}.${ch % 8}`,
      }));
    }
  }
  return { plc: { codigo: def.codigo, nombre: def.nombre, fabricante: def.fabricante, modelo: def.modelo, direccion: def.ip, zona: def.zona, cicloMs: def.ciclo }, modulos, puntos: finales, equipos, programa: programa(equipos) };
}
