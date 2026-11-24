/**
 * Escenarios del laboratorio. Cada uno tiene su física y su lógica de PLC; el dibujo solo muestra este estado.
 * Las etiquetas de E/S coinciden con las del PLC en la base de SIMA para el equipo asociado.
 */
export type Nivel = "info" | "aviso" | "alarma" | "ok";
export type TipoComp = "plc" | "maquina" | "sensor" | "motor" | "cinta" | "valvula" | "bomba" | "actuador" | "deposito" | "contador" | "baliza";
export interface Componente { id: string; nombre: string; tipo: TipoComp; descripcion: string; senales: string[] }
export interface Senal { tag: string; tipo: "DI" | "DO" | "AI"; descripcion: string; unidad?: string; componente: string }
export interface DefFalla { id: string; nombre: string; descripcion: string; componente: string }
export interface Emisor { (tipo: string, nivel: Nivel, mensaje: string, datos?: Record<string, unknown>): void }
export type EstadoMaquina = "detenida" | "inicializando" | "funcionando" | "espera" | "mantencion" | "falla";

interface Base {
  run: boolean;                 // enclavamiento de marcha en el PLC
  falla: string | null;          // falla de proceso activa (texto)
  cpuFalla: boolean;             // falla de CPU del PLC
  contador: number;              // piezas buenas
  rechazo: number;
  produccionInformada: number;
  t: number;                     // segundos simulados
  pulsos: Record<string, number>;// entradas pulsadas (tiempo restante)
  ajustes: Record<string, number>;
  analog: Record<string, number>;
}

// ------------------------------------------------------------------------------------------------ utilidades
const lerp = (a: number, b: number, k: number) => a + (b - a) * Math.min(1, k);
const ruido = (s: number) => (Math.random() - 0.5) * 2 * s;
const pulsado = (b: Base, tag: string) => (b.pulsos[tag] ?? 0) > 0;
function pasoPulsos(b: Base, dt: number) { for (const k of Object.keys(b.pulsos)) { b.pulsos[k] -= dt; if (b.pulsos[k] <= 0) delete b.pulsos[k]; } }

export interface Escenario<E extends Base = Base> {
  id: "cinta" | "llenado" | "maquina";
  nombre: string;
  resumen: string;
  plc: string;
  equipo: string;
  equipoNombre: string;
  componentes: Componente[];
  senales: Senal[];
  fallas: DefFalla[];
  parametros: { id: string; nombre: string; min: number; max: number; paso: number; unidad: string }[];
  crear(): E;
  paso(e: E, dt: number, fallas: Set<string>, emitir: Emisor): void;
  io(e: E): Record<string, number>;
  lecturas(e: E): { variable: string; valor: number }[];
  estadoEquipo(e: E): "operando" | "detenido" | "alarma";
  marcha(e: E): void;
  paro(e: E): void;
  emergencia(e: E): void;
  reparar(e: E): void;
}

/** Lógica común de marcha/paro/emergencia con enclavamiento (como el peldaño 1 de los programas de SIMA). */
function enclavamiento(b: Base, p: string, emitir: Emisor, equipo: string) {
  const antes = b.run;
  if (pulsado(b, `${p}_MARCHA`) && !b.falla && !b.cpuFalla) b.run = true;
  if (pulsado(b, `${p}_PARO`) || pulsado(b, `${p}_EMERG`) || b.falla || b.cpuFalla) b.run = false;
  if (b.run && !antes) emitir("arranque", "ok", `${equipo}: arranque (marcha desde el PLC)`);
  if (!b.run && antes) emitir("parada", b.falla ? "alarma" : "aviso", `${equipo}: parada${b.falla ? ` por falla: ${b.falla}` : pulsado(b, `${p}_EMERG`) ? " de emergencia" : ""}`, { motivo: b.falla ?? (pulsado(b, `${p}_EMERG`) ? "emergencia" : "paro") });
}
function base(ajustes: Record<string, number>): Base { return { run: false, falla: null, cpuFalla: false, contador: 0, rechazo: 0, produccionInformada: 0, t: 0, pulsos: {}, ajustes, analog: {} }; }
function informarProduccion(b: Base, emitir: Emisor, equipo: string) {
  const nuevas = b.contador + b.rechazo - b.produccionInformada;
  if (nuevas >= 5) { emitir("produccion", "info", `${equipo}: +${nuevas} piezas (total ${b.contador})`, { piezas: nuevas, rechazo: 0 }); b.produccionInformada = b.contador + b.rechazo; }
}
function falla(b: Base, texto: string, emitir: Emisor, equipo: string) {
  if (b.falla) return;
  b.falla = texto;
  emitir("falla", "alarma", `${equipo}: ${texto}`, { falla: texto });
}

// ================================================================================================ A · cinta transportadora
export interface Pieza { id: number; x: number; atascada?: boolean }
export interface EstadoCinta extends Base { motor: number; pos: number; piezas: Pieza[]; gen: number; s1: boolean; s2: boolean; transito: number[]; sigId: number; temp: number; vib: number; corriente: number }
const LARGO = 6;            // metros de cinta
const POS_S1 = 0.7, POS_S2 = 5.3, POS_ATASCO = 3.1;

export const cinta: Escenario<EstadoCinta> = {
  id: "cinta", nombre: "Cinta transportadora", resumen: "Transporte de piezas con detección, conteo y protección por atasco", plc: "PLC-02", equipo: "CT-01", equipoNombre: "Cinta de salida L3",
  componentes: [
    { id: "plc", nombre: "PLC-02 · CompactLogix 5380", tipo: "plc", descripcion: "Ejecuta la lógica de marcha, conteo y protección.", senales: ["CT01_MARCHA", "CT01_PARO", "CT01_EMERG", "CT01_S1", "CT01_S2", "CT01_CONTACTOR", "CT01_LUZ_VERDE", "CT01_LUZ_ROJA"] },
    { id: "cinta", nombre: "Banda transportadora 6 m", tipo: "cinta", descripcion: "Banda de PVC sobre rodillos.", senales: [] },
    { id: "motor", nombre: "Motorreductor M1", tipo: "motor", descripcion: "Motor 2,2 kW con reductor; arranque por contactor.", senales: ["CT01_CONTACTOR", "corriente", "temp_motor", "vibracion"] },
    { id: "s1", nombre: "Sensor de entrada S1", tipo: "sensor", descripcion: "Fotoeléctrico de barrera al inicio de la cinta.", senales: ["CT01_S1"] },
    { id: "s2", nombre: "Sensor de salida S2", tipo: "sensor", descripcion: "Fotoeléctrico al final: cuenta las piezas.", senales: ["CT01_S2"] },
    { id: "contador", nombre: "Contador de piezas", tipo: "contador", descripcion: "Contador CTU del PLC (flanco de S2).", senales: [] },
    { id: "baliza", nombre: "Baliza de estado", tipo: "baliza", descripcion: "Verde en marcha, roja con falla.", senales: ["CT01_LUZ_VERDE", "CT01_LUZ_ROJA"] },
  ],
  senales: [
    { tag: "CT01_MARCHA", tipo: "DI", descripcion: "Pulsador de marcha", componente: "plc" }, { tag: "CT01_PARO", tipo: "DI", descripcion: "Pulsador de paro", componente: "plc" },
    { tag: "CT01_EMERG", tipo: "DI", descripcion: "Parada de emergencia", componente: "plc" }, { tag: "CT01_S1", tipo: "DI", descripcion: "Presencia en la entrada", componente: "s1" },
    { tag: "CT01_S2", tipo: "DI", descripcion: "Presencia en la salida", componente: "s2" }, { tag: "CT01_CONTACTOR", tipo: "DO", descripcion: "Contactor del motor", componente: "motor" },
    { tag: "CT01_LUZ_VERDE", tipo: "DO", descripcion: "Baliza verde", componente: "baliza" }, { tag: "CT01_LUZ_ROJA", tipo: "DO", descripcion: "Baliza roja", componente: "baliza" },
    { tag: "corriente", tipo: "AI", descripcion: "Corriente del motor", unidad: "A", componente: "motor" }, { tag: "temp_motor", tipo: "AI", descripcion: "Temperatura del motor", unidad: "°C", componente: "motor" },
    { tag: "vibracion", tipo: "AI", descripcion: "Vibración del reductor", unidad: "mm/s", componente: "motor" },
  ],
  fallas: [
    { id: "atasco", nombre: "Atasco de pieza", descripcion: "Una pieza queda trabada a mitad de la cinta: S2 deja de verla y el PLC detiene por tiempo de tránsito.", componente: "cinta" },
    { id: "sobrecarga", nombre: "Sobrecarga del motor", descripcion: "La corriente sube hasta disparar la protección térmica.", componente: "motor" },
    { id: "sensor_s2", nombre: "Sensor S2 averiado", descripcion: "S2 no detecta: el contador se detiene y salta la protección por tránsito.", componente: "s2" },
    { id: "rodamiento", nombre: "Rodamiento desgastado", descripcion: "La vibración del reductor aumenta progresivamente.", componente: "motor" },
    { id: "cpu", nombre: "Falla de CPU del PLC", descripcion: "El controlador pasa a error y detiene todo.", componente: "plc" },
  ],
  parametros: [{ id: "velocidad", nombre: "Velocidad de la banda", min: 0.2, max: 1, paso: 0.05, unidad: "m/s" }, { id: "cadencia", nombre: "Piezas por minuto", min: 6, max: 40, paso: 1, unidad: "pzs/min" }],
  crear: () => ({ ...base({ velocidad: 0.55, cadencia: 18 }), motor: 0, pos: 0, piezas: [], gen: 0, s1: false, s2: false, transito: [], sigId: 1, temp: 38, vib: 0.6, corriente: 0 }),
  paso(e, dt, fallas, emitir) {
    e.t += dt; pasoPulsos(e, dt);
    e.cpuFalla = fallas.has("cpu");
    enclavamiento(e, "CT01", emitir, "CT-01");
    const contactor = e.run && !e.falla && !e.cpuFalla;
    e.motor = lerp(e.motor, contactor ? 1 : 0, dt * (contactor ? 1.6 : 2.4));            // rampa de arranque y frenado
    const v = e.motor * e.ajustes.velocidad;
    e.pos = (e.pos + v * dt) % 1000;
    // alimentación de piezas
    if (contactor) { e.gen += dt; if (e.gen >= 60 / e.ajustes.cadencia) { e.gen = 0; if (!e.piezas.some((p) => p.x < 0.5)) e.piezas.push({ id: e.sigId++, x: 0 }); } }
    const atascar = fallas.has("atasco");
    for (const p of e.piezas) {
      if (atascar && !p.atascada && p.x > POS_ATASCO - 0.15 && p.x < POS_ATASCO + 0.15) p.atascada = true;
      if (!atascar) p.atascada = false;
      if (!p.atascada) p.x += v * dt;
    }
    // las piezas que vienen detrás de una atascada se detienen detrás de ella
    const orden = [...e.piezas].sort((a, b) => b.x - a.x);
    for (let i = 1; i < orden.length; i++) if (orden[i].x > orden[i - 1].x - 0.42) orden[i].x = orden[i - 1].x - 0.42;
    const s1 = e.piezas.some((p) => Math.abs(p.x - POS_S1) < 0.18);
    const s2 = !fallas.has("sensor_s2") && e.piezas.some((p) => Math.abs(p.x - POS_S2) < 0.18);
    // cola de tránsito: cada pieza que entra por S1 debe salir por S2; se vigila la más antigua
    if (s1 && !e.s1) e.transito.push(e.t);
    if (s2 && !e.s2) { e.contador++; e.transito.shift(); informarProduccion(e, emitir, "CT-01"); }
    e.s1 = s1; e.s2 = s2;
    e.piezas = e.piezas.filter((p) => p.x < LARGO + 0.3);
    // protección por tiempo de tránsito (el PLC sabe cuánto debería tardar una pieza de S1 a S2)
    const transito = (POS_S2 - POS_S1) / Math.max(0.05, e.ajustes.velocidad);
    if (!contactor && e.transito.length) e.transito = e.transito.map((t) => t + dt);     // detenida: no corre el tiempo de tránsito
    if (contactor && e.transito.length > 0 && e.t - e.transito[0] > transito * 1.9 + 1.5) falla(e, fallas.has("sensor_s2") ? "S2 no detecta piezas (tránsito excedido)" : "Atasco en la cinta (tránsito excedido)", emitir, "CT-01");
    // motor: corriente, temperatura y vibración
    const carga = 0.35 + e.piezas.length * 0.05 + (e.piezas.some((p) => p.atascada) ? 0.35 : 0) + (fallas.has("sobrecarga") ? Math.min(1.2, (e.analog.sobre ?? 0)) : 0);
    if (fallas.has("sobrecarga")) e.analog.sobre = (e.analog.sobre ?? 0) + dt * 0.08; else e.analog.sobre = 0;
    e.corriente = Math.max(0, lerp(e.corriente, e.motor * (3.2 + 6.2 * carga) + ruido(0.15), dt * 3));
    if (e.corriente > 14 && contactor) falla(e, "Disparo térmico por sobrecorriente", emitir, "CT-01");
    e.temp = lerp(e.temp, 30 + e.corriente * 3.6, dt * 0.05);
    if (fallas.has("rodamiento")) e.analog.desgaste = Math.min(1, (e.analog.desgaste ?? 0) + dt * 0.01); else e.analog.desgaste = Math.max(0, (e.analog.desgaste ?? 0) - dt * 0.05);
    e.vib = Math.max(0, lerp(e.vib, e.motor * (1.6 + (e.analog.desgaste ?? 0) * 6.5) + 0.2 + ruido(0.08), dt * 2));
    if ((e.analog.desgaste ?? 0) > 0.85 && contactor) falla(e, "Vibración excesiva en el reductor", emitir, "CT-01");
  },
  io: (e) => ({ CT01_MARCHA: pulsado(e, "CT01_MARCHA") ? 1 : 0, CT01_PARO: pulsado(e, "CT01_PARO") ? 1 : 0, CT01_EMERG: pulsado(e, "CT01_EMERG") ? 1 : 0, CT01_S1: e.s1 ? 1 : 0, CT01_S2: e.s2 ? 1 : 0,
    CT01_CONTACTOR: e.run && !e.falla ? 1 : 0, CT01_LUZ_VERDE: e.run ? 1 : 0, CT01_LUZ_ROJA: e.falla || e.cpuFalla ? 1 : 0, CT01_RUN: e.run ? 1 : 0, corriente: e.corriente, temp_motor: e.temp, vibracion: e.vib }),
  lecturas: (e) => [{ variable: "corriente", valor: e.corriente }, { variable: "temp_motor", valor: e.temp }, { variable: "vibracion", valor: e.vib }],
  estadoEquipo: (e) => (e.falla || e.cpuFalla ? "alarma" : e.motor > 0.2 ? "operando" : "detenido"),
  marcha: (e) => { e.pulsos.CT01_MARCHA = 0.4; },
  paro: (e) => { e.pulsos.CT01_PARO = 0.4; },
  emergencia: (e) => { e.pulsos.CT01_EMERG = 0.8; },
  reparar: (e) => { e.falla = null; e.piezas = e.piezas.filter((p) => !p.atascada); e.transito = []; e.analog = {}; },
};

// ================================================================================================ B · llenado industrial
export interface Envase { id: number; x: number; nivel: number; lleno: boolean; sobrellenado?: boolean }
export interface EstadoLlenado extends Base { motor: number; pos: number; envases: Envase[]; gen: number; deposito: number; valvula: number; bomba: boolean; presencia: boolean; llenando: boolean; sigId: number; tempSellado: number; presionAire: number }
const POS_LLENADO = 3.0, LARGO_B = 6;

export const llenado: Escenario<EstadoLlenado> = {
  id: "llenado", nombre: "Llenado industrial", resumen: "Envases que se detienen bajo la válvula, se llenan al nivel y siguen", plc: "PLC-03", equipo: "EV-01", equipoNombre: "Envasadora 1",
  componentes: [
    { id: "plc", nombre: "PLC-03 · S7-1200", tipo: "plc", descripcion: "Secuencia: avanzar, detectar, llenar, liberar.", senales: ["EV01_MARCHA", "EV01_PARO", "EV01_EMERG", "EV01_PRESENCIA", "EV01_NIVEL_OK", "EV01_CONTACTOR", "EV01_VALVULA", "EV01_BOMBA"] },
    { id: "deposito", nombre: "Depósito de producto", tipo: "deposito", descripcion: "Tanque de 500 L con sensor de nivel.", senales: ["nivel_deposito"] },
    { id: "bomba", nombre: "Bomba de reposición", tipo: "bomba", descripcion: "Rellena el depósito bajo el 20 %.", senales: ["EV01_BOMBA"] },
    { id: "valvula", nombre: "Válvula de llenado V1", tipo: "valvula", descripcion: "Electroválvula de dosificación.", senales: ["EV01_VALVULA"] },
    { id: "presencia", nombre: "Sensor de presencia", tipo: "sensor", descripcion: "Detecta el envase bajo la válvula.", senales: ["EV01_PRESENCIA"] },
    { id: "nivel", nombre: "Sensor de nivel del envase", tipo: "sensor", descripcion: "Capacitivo: indica cuando el envase llegó al nivel.", senales: ["EV01_NIVEL_OK"] },
    { id: "cinta", nombre: "Cinta de envases", tipo: "cinta", descripcion: "Mueve los envases hacia la válvula.", senales: ["EV01_CONTACTOR"] },
    { id: "contador", nombre: "Contador de envases", tipo: "contador", descripcion: "Envases llenados correctamente.", senales: [] },
  ],
  senales: [
    { tag: "EV01_MARCHA", tipo: "DI", descripcion: "Pulsador de marcha", componente: "plc" }, { tag: "EV01_PARO", tipo: "DI", descripcion: "Pulsador de paro", componente: "plc" },
    { tag: "EV01_EMERG", tipo: "DI", descripcion: "Parada de emergencia", componente: "plc" }, { tag: "EV01_PRESENCIA", tipo: "DI", descripcion: "Envase bajo la válvula", componente: "presencia" },
    { tag: "EV01_NIVEL_OK", tipo: "DI", descripcion: "Nivel alcanzado", componente: "nivel" }, { tag: "EV01_CONTACTOR", tipo: "DO", descripcion: "Motor de la cinta", componente: "cinta" },
    { tag: "EV01_VALVULA", tipo: "DO", descripcion: "Válvula de llenado", componente: "valvula" }, { tag: "EV01_BOMBA", tipo: "DO", descripcion: "Bomba de reposición", componente: "bomba" },
    { tag: "nivel_deposito", tipo: "AI", descripcion: "Nivel del depósito", unidad: "%", componente: "deposito" }, { tag: "temp_sellado", tipo: "AI", descripcion: "Temperatura de sellado", unidad: "°C", componente: "plc" },
    { tag: "presion", tipo: "AI", descripcion: "Presión de aire", unidad: "bar", componente: "valvula" },
  ],
  fallas: [
    { id: "valvula_trabada", nombre: "Válvula trabada abierta", descripcion: "La válvula no cierra: el envase se sobrellena y salta la alarma.", componente: "valvula" },
    { id: "sensor_nivel", nombre: "Sensor de nivel averiado", descripcion: "No avisa el nivel: el PLC corta por tiempo máximo de llenado.", componente: "nivel" },
    { id: "bomba", nombre: "Bomba de reposición sin caudal", descripcion: "El depósito se vacía y la línea queda esperando producto.", componente: "bomba" },
    { id: "aire", nombre: "Baja presión de aire", descripcion: "La válvula neumática actúa lenta: los llenados tardan más.", componente: "valvula" },
    { id: "cpu", nombre: "Falla de CPU del PLC", descripcion: "El controlador pasa a error y detiene todo.", componente: "plc" },
  ],
  parametros: [{ id: "consigna", nombre: "Nivel de llenado", min: 70, max: 98, paso: 1, unidad: "%" }, { id: "caudal", nombre: "Caudal de la válvula", min: 10, max: 60, paso: 1, unidad: "%/s" }],
  crear: () => ({ ...base({ consigna: 92, caudal: 32 }), motor: 0, pos: 0, envases: [], gen: 0, deposito: 76, valvula: 0, bomba: false, presencia: false, llenando: false, sigId: 1, tempSellado: 158, presionAire: 6.1 }),
  paso(e, dt, fallas, emitir) {
    e.t += dt; pasoPulsos(e, dt);
    e.cpuFalla = fallas.has("cpu");
    enclavamiento(e, "EV01", emitir, "EV-01");
    const activo = e.run && !e.falla && !e.cpuFalla;
    const bajo = e.envases.find((x) => Math.abs(x.x - POS_LLENADO) < 0.12 && !x.lleno);
    e.presencia = !!bajo || e.envases.some((x) => Math.abs(x.x - POS_LLENADO) < 0.12);
    const nivelOk = !!bajo && !fallas.has("sensor_nivel") && bajo.nivel >= e.ajustes.consigna;
    // secuencia del PLC
    const quiereLlenar = activo && !!bajo && !nivelOk && e.deposito > 3;
    e.llenando = quiereLlenar;
    const trabada = fallas.has("valvula_trabada") && (e.valvula > 0.5 || quiereLlenar);
    const objetivoValvula = quiereLlenar || trabada ? 1 : 0;
    e.valvula = lerp(e.valvula, objetivoValvula, dt * (fallas.has("aire") ? 1.5 : 7));
    if (bajo && e.valvula > 0.05) {
      const flujo = e.ajustes.caudal * e.valvula * dt;
      bajo.nivel += flujo; e.deposito = Math.max(0, e.deposito - flujo * 0.045);
      if (bajo.nivel > 103 && !bajo.sobrellenado) { bajo.sobrellenado = true; e.rechazo++; falla(e, "Sobrellenado: la válvula no cerró", emitir, "EV-01"); }
      if (fallas.has("sensor_nivel") && bajo.nivel > 100 && !bajo.sobrellenado) { bajo.sobrellenado = true; e.rechazo++; falla(e, "Tiempo máximo de llenado: sensor de nivel sin señal", emitir, "EV-01"); }
    }
    if (bajo && nivelOk && !trabada) { bajo.lleno = true; e.contador++; informarProduccion(e, emitir, "EV-01"); }
    const avanzar = activo && !(bajo && !bajo.lleno);
    e.motor = lerp(e.motor, avanzar ? 1 : 0, dt * 5);
    const v = e.motor * 0.6;
    e.pos = (e.pos + v * dt) % 1000;
    if (activo) { e.gen += dt * e.motor; if (e.gen > 2.2 && !e.envases.some((x) => x.x < 0.5)) { e.gen = 0; e.envases.push({ id: e.sigId++, x: 0, nivel: 0, lleno: false }); } }
    for (const x of e.envases) x.x += v * dt;
    e.envases = e.envases.filter((x) => x.x < LARGO_B + 0.3);
    // depósito y bomba (histéresis 20 % / 90 %)
    if (e.deposito < 20) e.bomba = true;
    if (e.deposito > 90) e.bomba = false;
    if (e.bomba && !fallas.has("bomba") && !e.cpuFalla) e.deposito = Math.min(100, e.deposito + dt * 4.5);
    if (e.deposito <= 3 && activo && e.t % 6 < dt) emitir("parada", "aviso", "EV-01: línea en espera de producto (depósito vacío)", { motivo: "deposito vacio" });
    e.tempSellado = lerp(e.tempSellado, activo ? 162 : 120, dt * 0.06) + ruido(0.3);
    e.presionAire = lerp(e.presionAire, (fallas.has("aire") ? 4.1 : 6.2) - e.valvula * 0.4, dt * 2) + ruido(0.03);
  },
  io: (e) => ({ EV01_MARCHA: pulsado(e, "EV01_MARCHA") ? 1 : 0, EV01_PARO: pulsado(e, "EV01_PARO") ? 1 : 0, EV01_EMERG: pulsado(e, "EV01_EMERG") ? 1 : 0, EV01_PRESENCIA: e.presencia ? 1 : 0,
    EV01_NIVEL_OK: e.envases.some((x) => Math.abs(x.x - POS_LLENADO) < 0.12 && x.lleno) ? 1 : 0, EV01_CONTACTOR: e.motor > 0.5 ? 1 : 0, EV01_VALVULA: e.valvula > 0.5 ? 1 : 0, EV01_BOMBA: e.bomba ? 1 : 0,
    EV01_LUZ_VERDE: e.run ? 1 : 0, EV01_LUZ_ROJA: e.falla || e.cpuFalla ? 1 : 0, EV01_RUN: e.run ? 1 : 0, nivel_deposito: e.deposito, temp_sellado: e.tempSellado, presion: e.presionAire }),
  lecturas: (e) => [{ variable: "temp_sellado", valor: e.tempSellado }, { variable: "presion", valor: e.presionAire }],
  estadoEquipo: (e) => (e.falla || e.cpuFalla ? "alarma" : e.run ? "operando" : "detenido"),
  marcha: (e) => { e.pulsos.EV01_MARCHA = 0.4; },
  paro: (e) => { e.pulsos.EV01_PARO = 0.4; },
  emergencia: (e) => { e.pulsos.EV01_EMERG = 0.8; },
  reparar: (e) => { e.falla = null; e.envases = e.envases.filter((x) => !x.sobrellenado); e.valvula = 0; },
};

// ================================================================================================ C · máquina de producción
export interface EstadoMaquinaProd extends Base { estado: EstadoMaquina; fase: number; ciclo: number; husillo: number; angulo: number; herramienta: number; puerta: number; material: number; temp: number; vib: number; corriente: number; mantencion: boolean; historial: { t: number; estado: EstadoMaquina }[] }

export const maquina: Escenario<EstadoMaquinaProd> = {
  id: "maquina", nombre: "Máquina de producción", resumen: "Torno CNC con sus estados: inicializando, funcionando, espera, mantención y falla", plc: "PLC-01", equipo: "TC-01", equipoNombre: "Torno 1",
  componentes: [
    { id: "plc", nombre: "PLC-01 · S7-1500", tipo: "plc", descripcion: "Gestiona estados, ciclo y protecciones.", senales: ["TC01_MARCHA", "TC01_PARO", "TC01_EMERG", "TC01_PUERTA", "TC01_MATERIAL", "TC01_CONTACTOR", "TC01_LUZ_VERDE", "TC01_LUZ_ROJA"] },
    { id: "maquina", nombre: "Torno CNC TC-01", tipo: "maquina", descripcion: "Haas ST-20, ciclo de mecanizado de 8 s.", senales: [] },
    { id: "husillo", nombre: "Husillo principal", tipo: "motor", descripcion: "Motor de 15 kW, hasta 4.000 rpm.", senales: ["TC01_CONTACTOR", "corriente", "temp_husillo", "vibracion"] },
    { id: "herramienta", nombre: "Torreta de herramientas", tipo: "actuador", descripcion: "Avance de la herramienta en X/Z.", senales: [] },
    { id: "puerta", nombre: "Puerta de seguridad", tipo: "sensor", descripcion: "Interruptor de puerta cerrada.", senales: ["TC01_PUERTA"] },
    { id: "alimentador", nombre: "Alimentador de barras", tipo: "actuador", descripcion: "Material en bruto para el ciclo.", senales: ["TC01_MATERIAL"] },
    { id: "baliza", nombre: "Torre de señalización", tipo: "baliza", descripcion: "Verde funcionando, ámbar en espera, roja en falla.", senales: ["TC01_LUZ_VERDE", "TC01_LUZ_ROJA"] },
  ],
  senales: [
    { tag: "TC01_MARCHA", tipo: "DI", descripcion: "Pulsador de marcha", componente: "plc" }, { tag: "TC01_PARO", tipo: "DI", descripcion: "Pulsador de paro", componente: "plc" },
    { tag: "TC01_EMERG", tipo: "DI", descripcion: "Parada de emergencia", componente: "plc" }, { tag: "TC01_PUERTA", tipo: "DI", descripcion: "Puerta cerrada", componente: "puerta" },
    { tag: "TC01_MATERIAL", tipo: "DI", descripcion: "Hay material", componente: "alimentador" }, { tag: "TC01_CONTACTOR", tipo: "DO", descripcion: "Husillo", componente: "husillo" },
    { tag: "TC01_LUZ_VERDE", tipo: "DO", descripcion: "Luz verde", componente: "baliza" }, { tag: "TC01_LUZ_ROJA", tipo: "DO", descripcion: "Luz roja", componente: "baliza" },
    { tag: "corriente", tipo: "AI", descripcion: "Corriente del husillo", unidad: "A", componente: "husillo" }, { tag: "temp_husillo", tipo: "AI", descripcion: "Temperatura del husillo", unidad: "°C", componente: "husillo" },
    { tag: "vibracion", tipo: "AI", descripcion: "Vibración del husillo", unidad: "mm/s", componente: "husillo" },
  ],
  fallas: [
    { id: "sobretemperatura", nombre: "Sobretemperatura del husillo", descripcion: "El husillo se calienta por falta de refrigerante hasta el límite.", componente: "husillo" },
    { id: "herramienta_rota", nombre: "Herramienta rota", descripcion: "Pico de vibración y parada inmediata del ciclo.", componente: "herramienta" },
    { id: "puerta", nombre: "Puerta abierta en ciclo", descripcion: "Se abre la puerta de seguridad: parada por seguridad.", componente: "puerta" },
    { id: "cpu", nombre: "Falla de CPU del PLC", descripcion: "El controlador pasa a error y detiene todo.", componente: "plc" },
  ],
  parametros: [{ id: "rpm", nombre: "Velocidad del husillo", min: 800, max: 4000, paso: 100, unidad: "rpm" }, { id: "material", nombre: "Barras en el alimentador", min: 0, max: 40, paso: 1, unidad: "u" }],
  crear: () => ({ ...base({ rpm: 2400, material: 24 }), estado: "detenida", fase: 0, ciclo: 0, husillo: 0, angulo: 0, herramienta: 0, puerta: 0, material: 24, temp: 34, vib: 0.3, corriente: 0, mantencion: false, historial: [{ t: 0, estado: "detenida" }] }),
  paso(e, dt, fallas, emitir) {
    e.t += dt; pasoPulsos(e, dt);
    e.cpuFalla = fallas.has("cpu");
    const prev = e.estado;
    if (e.ajustes.material !== e.material && e.estado !== "funcionando") e.material = e.ajustes.material;     // reposición desde el panel
    enclavamiento(e, "TC01", emitir, "TC-01");
    if (fallas.has("puerta") && e.run) falla(e, "Puerta de seguridad abierta durante el ciclo", emitir, "TC-01");
    // máquina de estados
    if (e.mantencion) e.estado = "mantencion";
    else if (e.falla || e.cpuFalla) e.estado = "falla";
    else if (!e.run) e.estado = "detenida";
    else if (e.estado === "detenida" || e.estado === "falla" || e.estado === "mantencion") { e.estado = "inicializando"; e.fase = 0; }
    else if (e.estado === "inicializando") { e.fase += dt; if (e.fase > 3) { e.estado = e.material > 0 ? "funcionando" : "espera"; e.ciclo = 0; } }
    else if (e.estado === "funcionando") {
      e.ciclo += dt * (e.ajustes.rpm / 2400);
      if (e.ciclo >= 8) { e.ciclo = 0; e.material = Math.max(0, e.material - 1); e.ajustes.material = e.material; e.contador++; informarProduccion(e, emitir, "TC-01"); if (e.material === 0) e.estado = "espera"; }
    } else if (e.estado === "espera" && e.material > 0) { e.estado = "funcionando"; e.ciclo = 0; }
    if (e.estado !== prev) {
      e.historial = [...e.historial, { t: e.t, estado: e.estado }].slice(-40);
      if (e.estado === "espera") emitir("parada", "aviso", "TC-01: en espera, sin material en el alimentador", { motivo: "sin material" });
      if (prev === "espera" && e.estado === "funcionando") emitir("arranque", "ok", "TC-01: material repuesto, retoma el ciclo");
    }
    // física
    const girando = e.estado === "funcionando" && e.ciclo > 1 && e.ciclo < 7;
    e.husillo = lerp(e.husillo, girando ? e.ajustes.rpm : e.estado === "inicializando" ? 300 : 0, dt * 2.5);
    e.angulo = (e.angulo + e.husillo * 6 * dt) % 360;
    e.herramienta = lerp(e.herramienta, girando ? Math.min(1, (e.ciclo - 1) / 5) : 0, dt * 4);
    e.puerta = lerp(e.puerta, fallas.has("puerta") || e.estado === "mantencion" || (e.estado === "funcionando" && (e.ciclo < 0.8 || e.ciclo > 7.2)) ? 1 : 0, dt * 5);
    const calor = fallas.has("sobretemperatura") ? 1 : 0;
    e.temp = lerp(e.temp, 30 + (e.husillo / 4000) * 30 + calor * 70, dt * (calor ? 0.06 : 0.04));
    if (e.temp > 85 && !e.falla) falla(e, "Sobretemperatura del husillo (> 85 °C)", emitir, "TC-01");
    e.vib = Math.max(0, lerp(e.vib, (e.husillo / 4000) * 3 + 0.3 + (fallas.has("herramienta_rota") && girando ? 8 : 0) + ruido(0.05), dt * 4));
    if (e.vib > 7 && !e.falla) falla(e, "Herramienta rota (vibración > 7 mm/s)", emitir, "TC-01");
    e.corriente = lerp(e.corriente, (e.husillo / 4000) * 48 + (girando ? 8 * e.herramienta : 0) + (e.husillo > 50 ? 4 : 0), dt * 3);
  },
  io: (e) => ({ TC01_MARCHA: pulsado(e, "TC01_MARCHA") ? 1 : 0, TC01_PARO: pulsado(e, "TC01_PARO") ? 1 : 0, TC01_EMERG: pulsado(e, "TC01_EMERG") ? 1 : 0, TC01_PUERTA: e.puerta < 0.5 ? 1 : 0, TC01_MATERIAL: e.material > 0 ? 1 : 0,
    TC01_CONTACTOR: e.husillo > 100 ? 1 : 0, TC01_LUZ_VERDE: e.estado === "funcionando" ? 1 : 0, TC01_LUZ_ROJA: e.estado === "falla" ? 1 : 0, TC01_RUN: e.run ? 1 : 0, corriente: e.corriente, temp_husillo: e.temp, vibracion: e.vib }),
  lecturas: (e) => [{ variable: "corriente", valor: e.corriente }, { variable: "temp_husillo", valor: e.temp }, { variable: "vibracion", valor: e.vib }],
  estadoEquipo: (e) => (e.estado === "falla" ? "alarma" : e.estado === "funcionando" || e.estado === "inicializando" ? "operando" : "detenido"),
  marcha: (e) => { e.pulsos.TC01_MARCHA = 0.4; },
  paro: (e) => { e.pulsos.TC01_PARO = 0.4; },
  emergencia: (e) => { e.pulsos.TC01_EMERG = 0.8; },
  reparar: (e) => { e.falla = null; e.temp = Math.min(e.temp, 60); e.vib = 0.5; },
};

export const ESCENARIOS = { cinta, llenado, maquina } as unknown as Record<"cinta" | "llenado" | "maquina", Escenario>;
export const LISTA_ESCENARIOS = [cinta, llenado, maquina] as unknown as Escenario[];
