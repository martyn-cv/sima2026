import { useSyncExternalStore } from "react";
import { MotorPlc, crearCliente, type ProgramaPlc, type Valores } from "@sima/cliente";

// ------------------------------------------------------------------------------------------ tipos de la configuración (vienen de la base de datos)
export interface CfgModulo { id: number; slot: number; tipo: string; modelo: string; canales: number }
export interface CfgPunto { direccion: string; tag: string; tipo: "DI" | "DO" | "AI" | "AO"; descripcion: string; canal: number; moduloId: number; equipo?: string | null; variable?: string | null; unidad: string; minimo: number; maximo: number }
export interface CfgSensor { variable: string; nombre: string; unidad: string; min: number; max: number; nominal: number; aviso: number; alarma: number }
export interface CfgEquipo { codigo: string; nombre: string; tipo: string; criticidad: string; sensores: CfgSensor[] }
export interface Config {
  plc: { codigo: string; nombre: string; fabricante: string; modelo: string; direccion: string; zona: string; cicloMs: number };
  modulos: CfgModulo[]; puntos: CfgPunto[]; equipos: CfgEquipo[]; programa: ProgramaPlc;
}
export interface PlcLista { codigo: string; nombre: string; fabricante: string; modelo: string; zona: string }
export type EstadoCpu = "run" | "stop";
export type Enlace = "sin_conectar" | "conectando" | "conectado" | "error";
export interface Evento { t: number; texto: string; nivel: "info" | "aviso" | "alarma" }
export interface Ajustes { url: string; clave: string; plc: string; autoArranque: boolean; velocidad: number }

const AJ = "sima.plcsim.ajustes";
export const ajustesIniciales = (): Ajustes => {
  const base: Ajustes = { url: "http://localhost:5080", clave: "dev-ingesta-key", plc: "PLC-04", autoArranque: true, velocidad: 1 };
  try { return { ...base, ...JSON.parse(localStorage.getItem(AJ) ?? "{}") }; } catch { return base; }
};

const gauss = (sigma: number) => { const u = 1 - Math.random(), v = Math.random(); return sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const prefijo = (cod: string) => cod.replace("-", "");

/**
 * El simulador: ejecuta el programa en escalera como un PLC (ciclo de scan), mueve el proceso físico de cada equipo
 * (temperaturas, presiones, vibración) según lo que el PLC enciende, y envía todo a la API de SIMA.
 */
export class Simulador {
  ajustes = ajustesIniciales();
  enlace: Enlace = "sin_conectar";
  mensajeEnlace = "";
  lista: PlcLista[] = [];
  config: Config | null = null;
  estado: EstadoCpu = "stop";
  motor: MotorPlc | null = null;
  imagen: Valores = {};
  entradas: Valores = {};
  forzados: Record<string, number> = {};
  programaSucio = false;
  eventos: Evento[] = [];
  historial: Record<string, number[]> = {};
  tiempoCicloMs = 0;
  version = 0;

  private api = crearCliente({ baseUrl: () => this.ajustes.url.replace(/\/+$/, ""), token: () => null, apiKey: () => this.ajustes.clave });
  private deriva: Record<string, number> = {};
  private valores: Record<string, number> = {};
  private pulsos = new Map<string, number>();
  private oyentes = new Set<() => void>();
  private reloj?: ReturnType<typeof setInterval>;
  private ultimoCiclo = performance.now();
  private ultimoEnvio = 0;
  private ultimoHistorial = 0;
  private previos: Valores = {};
  private enviando = false;
  private fallosEnvio = 0;

  // ---------------------------------------------------------------------------------------- suscripción para React
  suscribir = (f: () => void) => { this.oyentes.add(f); return () => { this.oyentes.delete(f); }; };
  instantanea = () => this.version;
  private avisar() { this.version++; this.oyentes.forEach((f) => f()); }
  guardarAjustes(a: Partial<Ajustes>) { this.ajustes = { ...this.ajustes, ...a }; try { localStorage.setItem(AJ, JSON.stringify(this.ajustes)); } catch { /* sin almacenamiento */ } this.avisar(); }

  log(texto: string, nivel: Evento["nivel"] = "info") {
    this.eventos = [{ t: Date.now(), texto, nivel }, ...this.eventos].slice(0, 200);
  }

  // ---------------------------------------------------------------------------------------- conexión con la base de datos
  async conectar() {
    this.enlace = "conectando"; this.mensajeEnlace = ""; this.avisar();
    try {
      this.lista = await this.api.get<PlcLista[]>("/api/ingesta/plc");
      this.enlace = "conectado";
      const elegido = this.lista.find((p) => p.codigo === this.ajustes.plc) ?? this.lista[0];
      if (elegido) await this.cargarPlc(elegido.codigo);
    } catch (e) {
      this.enlace = "error"; this.mensajeEnlace = e instanceof Error ? e.message : "No se pudo conectar.";
      this.log(`Sin conexión con SIMA: ${this.mensajeEnlace}`, "aviso");
    }
    this.avisar();
  }

  async cargarPlc(codigo: string) {
    this.detenerReloj();
    const c = await this.api.get<Config>(`/api/ingesta/plc/${codigo}/config`);
    this.config = c;
    this.guardarAjustes({ plc: codigo });
    this.motor = new MotorPlc(c.programa);
    this.imagen = {}; this.entradas = {}; this.forzados = {}; this.deriva = {}; this.valores = {}; this.historial = {}; this.previos = {};
    this.programaSucio = false;
    for (const p of c.puntos) if (p.tipo === "DI") this.entradas[p.tag] = 0;
    for (const e of c.equipos) for (const s of e.sensores) this.valores[`${e.codigo}.${s.variable}`] = s.min + 0.08 * (s.max - s.min);
    this.eventos = [];
    this.log(`${c.plc.codigo} cargado desde la base de datos: ${c.modulos.length} módulos, ${c.puntos.length} puntos, ${c.programa.peldanos.length} peldaños.`);
    this.estado = "run";
    this.iniciarReloj();
    if (this.ajustes.autoArranque) c.equipos.forEach((e, i) => setTimeout(() => this.pulso(`${prefijo(e.codigo)}_MARCHA`), 600 + i * 350));
    this.avisar();
  }

  // ---------------------------------------------------------------------------------------- mandos del tablero
  cpu(e: EstadoCpu) {
    if (this.estado === e || !this.config) return;
    this.estado = e;
    this.log(e === "run" ? "CPU en RUN" : "CPU en STOP: las salidas se apagan", e === "run" ? "info" : "aviso");
    if (e === "stop") for (const p of this.config.puntos) if (p.tipo === "DO") this.imagen[p.tag] = 0;
    this.enviar(true);
    this.avisar();
  }

  /** Pulsador momentáneo (marcha, paro): la entrada queda activa un instante. */
  pulso(tag: string, valor = 1, ms = 700) {
    if (!(tag in this.entradas)) return;
    this.entradas[tag] = valor;
    this.pulsos.set(tag, performance.now() + ms);
    this.avisar();
  }
  /** Interruptor con retención (parada de emergencia). */
  alternar(tag: string) {
    if (!(tag in this.entradas)) return;
    this.entradas[tag] = this.entradas[tag] > 0 ? 0 : 1;
    this.log(`${tag} ${this.entradas[tag] ? "activada" : "liberada"}`, this.entradas[tag] ? "aviso" : "info");
    this.avisar();
  }

  valores_deriva(codigo: string, variable: string) { return this.deriva[`${codigo}.${variable}`]; }
  equipoDe(prefix: string) { return this.config?.equipos.find((e) => prefijo(e.codigo) === prefix); }

  inyectarFalla(codigo: string, variable?: string) {
    const e = this.config?.equipos.find((x) => x.codigo === codigo);
    if (!e) return;
    const s = variable ? e.sensores.find((x) => x.variable === variable) : e.sensores[Math.floor(Math.random() * e.sensores.length)];
    if (!s) return;
    this.deriva[`${codigo}.${s.variable}`] = Math.max(this.deriva[`${codigo}.${s.variable}`] ?? 0, 0.03);
    this.log(`Falla inyectada en ${codigo}: ${s.nombre} empieza a subir`, "aviso");
    this.avisar();
  }

  /** Mantenimiento terminó (la orden se cerró en SIMA): la causa desaparece y la falla enclavada se rearma. */
  reparar(codigo: string) {
    for (const k of Object.keys(this.deriva)) if (k.startsWith(codigo + ".")) this.deriva[k] = 0;
    if (this.motor) { this.motor.memoria[`${prefijo(codigo)}_FALLA`] = 0; this.motor.memoria[`${prefijo(codigo)}_T_DISPARO`] = 0; }
    this.log(`${codigo} reparado: se cerró la orden de trabajo en SIMA`, "info");
    this.avisar();
  }

  forzar(tag: string, valor: number | null) {
    if (valor == null) delete this.forzados[tag]; else this.forzados[tag] = valor;
    this.avisar();
  }

  // ---------------------------------------------------------------------------------------- programa en escalera
  setPrograma(p: ProgramaPlc) {
    if (!this.config || !this.motor) return;
    this.config = { ...this.config, programa: p };
    this.motor.cargar(p);
    this.programaSucio = true;
    this.avisar();
  }
  async guardarPrograma() {
    if (!this.config) return;
    await this.api.put(`/api/ingesta/plc/${this.config.plc.codigo}/programa`, this.config.programa);
    this.programaSucio = false;
    this.log("Programa guardado en la base de datos de SIMA", "info");
    this.avisar();
  }
  async descartarPrograma() { if (this.config) await this.cargarPlc(this.config.plc.codigo); }

  // ---------------------------------------------------------------------------------------- bucle de ejecución
  private iniciarReloj() {
    this.detenerReloj();
    this.ultimoCiclo = performance.now();
    const ms = Math.max(20, this.config?.plc.cicloMs ?? 100);
    this.reloj = setInterval(() => this.ciclo(), ms);
  }
  private detenerReloj() { if (this.reloj) clearInterval(this.reloj); this.reloj = undefined; }
  destruir() { this.detenerReloj(); this.oyentes.clear(); }

  private ciclo() {
    if (!this.config || !this.motor) return;
    const t0 = performance.now();
    const real = (t0 - this.ultimoCiclo) / 1000;
    this.ultimoCiclo = t0;
    const dt = Math.min(real, 1) * this.ajustes.velocidad;

    for (const [tag, hasta] of this.pulsos) if (t0 >= hasta) { this.entradas[tag] = 0; this.pulsos.delete(tag); }
    this.procesoFisico(dt);

    const entradas: Valores = { ...this.entradas, ...this.analogicas() };
    for (const [k, v] of Object.entries(this.forzados)) entradas[k] = v;
    if (this.estado === "run") {
      this.imagen = this.motor.ciclo(entradas, dt * 1000);
      for (const [k, v] of Object.entries(this.forzados)) this.imagen[k] = v;
    } else {
      this.imagen = { ...this.imagen, ...entradas };
    }
    this.detectarEventos();
    this.tiempoCicloMs = performance.now() - t0;

    if (t0 - this.ultimoHistorial > 1000) {
      this.ultimoHistorial = t0;
      for (const p of this.config.puntos) if (p.tipo === "AI") this.historial[p.tag] = [...(this.historial[p.tag] ?? []), this.imagen[p.tag] ?? 0].slice(-120);
    }
    if (t0 - this.ultimoEnvio > 1000) { this.ultimoEnvio = t0; void this.enviar(false); }
    this.avisar();
  }

  private analogicas(): Valores {
    const r: Valores = {};
    for (const p of this.config!.puntos) if (p.tipo === "AI" && p.equipo && p.variable) r[p.tag] = this.valores[`${p.equipo}.${p.variable}`] ?? 0;
    return r;
  }

  /** El proceso responde a lo que el PLC enciende: con el contactor cerrado las variables suben a su valor de trabajo. */
  private procesoFisico(dt: number) {
    for (const e of this.config!.equipos) {
      const corriendo = (this.imagen[`${prefijo(e.codigo)}_CONTACTOR`] ?? 0) > 0 && this.estado === "run";
      for (const s of e.sensores) {
        const k = `${e.codigo}.${s.variable}`;
        const rango = s.max - s.min;
        let d = this.deriva[k] ?? 0;
        if (corriendo) { if (d > 0) d = Math.min(1, d + 0.035 * dt); } else d = Math.max(0, d - 0.06 * dt);
        this.deriva[k] = d;
        const objetivo = corriendo ? s.nominal + d * (s.alarma * 1.06 - s.nominal) : s.min + 0.08 * rango;
        const tau = corriendo ? 1.8 : 6;
        const v = this.valores[k] ?? s.nominal;
        this.valores[k] = Math.min(s.max, Math.max(s.min, v + (objetivo - v) * (1 - Math.exp(-dt / tau)) + gauss(rango * 0.0035) * Math.min(1, dt * 4)));
      }
    }
  }

  private detectarEventos() {
    for (const e of this.config!.equipos) {
      const p = prefijo(e.codigo);
      const ahora = { run: this.imagen[`${p}_RUN`] ?? 0, falla: this.imagen[`${p}_FALLA`] ?? 0, emerg: this.entradas[`${p}_EMERG`] ?? 0 };
      const antes = { run: this.previos[`${p}_RUN`] ?? 0, falla: this.previos[`${p}_FALLA`] ?? 0 };
      if (ahora.run > 0 && !(antes.run > 0)) this.log(`${e.codigo} en marcha`);
      if (!(ahora.run > 0) && antes.run > 0) this.log(`${e.codigo} detenido`);
      if (ahora.falla > 0 && !(antes.falla > 0)) this.log(`${e.codigo}: FALLA enclavada por límite de alarma, el PLC detuvo el motor`, "alarma");
      if (!(ahora.falla > 0) && antes.falla > 0) this.log(`${e.codigo}: falla rearmada`);
      this.previos[`${p}_RUN`] = ahora.run; this.previos[`${p}_FALLA`] = ahora.falla;
    }
  }

  // ---------------------------------------------------------------------------------------- envío a SIMA
  private async enviar(inmediato: boolean) {
    if (!this.config || this.enviando && !inmediato) return;
    this.enviando = true;
    try {
      const cfg = this.config;
      const io: Record<string, number> = {};
      for (const p of cfg.puntos) io[p.tag] = Math.round((this.imagen[p.tag] ?? this.entradas[p.tag] ?? 0) * 100) / 100;
      for (const v of cfg.programa.variables) { io[v.nombre] = this.imagen[v.nombre] ?? 0; if (v.tipo === "timer") io[`${v.nombre}.ACC`] = this.imagen[`${v.nombre}.ACC`] ?? 0; }
      const lecturas = cfg.puntos.filter((p) => p.tipo === "AI" && p.equipo && p.variable).map((p) => ({ equipo: p.equipo!, variable: p.variable!, valor: Math.round((this.imagen[p.tag] ?? 0) * 100) / 100 }));
      const equipos = cfg.equipos.map((e) => ({ equipo: e.codigo, estado: (this.imagen[`${prefijo(e.codigo)}_CONTACTOR`] ?? 0) > 0 ? "operando" : "detenido" }));
      const r = await this.api.post<{ comandos: { id: number; tag: string; valor: number }[] }>(`/api/ingesta/plc/${cfg.plc.codigo}/telemetria`, { estado: this.estado, ciclos: this.motor?.ciclos ?? 0, lecturas, equipos, io });
      this.fallosEnvio = 0;
      if (this.enlace !== "conectado") { this.enlace = "conectado"; this.log("Conexión con SIMA recuperada"); }
      for (const c of r.comandos) {
        this.log(`Orden desde SIMA: ${c.tag}`, "info");
        if (c.tag.endsWith("_REPARAR")) { const eq = this.equipoDe(c.tag.replace("_REPARAR", "")); if (eq) this.reparar(eq.codigo); }
        else this.pulso(c.tag, c.valor);
      }
    } catch (e) {
      if (++this.fallosEnvio === 3) { this.enlace = "error"; this.mensajeEnlace = e instanceof Error ? e.message : ""; this.log("Se perdió la conexión con SIMA; el PLC sigue funcionando solo", "aviso"); }
    } finally { this.enviando = false; }
  }
}

export const sim = new Simulador();
export const useSim = () => { useSyncExternalStore(sim.suscribir, sim.instantanea); return sim; };
