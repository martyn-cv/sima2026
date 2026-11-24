import { useSyncExternalStore } from "react";
import { ESCENARIOS, type Escenario, type Nivel } from "./escenarios";

export type EstadoSim = "detenida" | "corriendo" | "pausada";
export type Modo = "local" | "sincronizado";
export type Conexion = "local" | "conectando" | "conectado" | "sin_conexion" | "rechazado";
export interface EventoLab { uid: string; t: number; ts: string; tipo: string; nivel: Nivel; mensaje: string; equipo?: string; origen: "simulacion" | "sima" | "usuario"; enviado: boolean }
interface Cfg { url: string; clave: string; modo: Modo; escenario: keyof typeof ESCENARIOS; velocidad: number }
interface Pendiente { uid: string; ts: string; tipo: string; nivel: Nivel; mensaje: string; equipo?: string; datos?: Record<string, unknown>; plc: string }
interface OtroEquipo { codigo: string; sensores: { variable: string; nominal: number; min: number; max: number }[] }

const CLAVE_CFG = "sima.lab.ajustes", CLAVE_COLA = "sima.lab.cola", MAX_COLA = 2000;
const PASO = 0.05;                 // 50 ms simulados por paso
const leer = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? { ...d, ...JSON.parse(v) } : d; } catch { return d; } };
const leerCola = (): Pendiente[] => { try { return JSON.parse(localStorage.getItem(CLAVE_COLA) ?? "[]"); } catch { return []; } };
const sesion = Math.random().toString(36).slice(2, 8);

/**
 * Motor del laboratorio. Avanza la simulación en pasos fijos (la velocidad multiplica el tiempo simulado por paso);
 * pausado, no avanza nada y los dibujos, que leen este estado, quedan quietos. En modo sincronizado envía a SIMA
 * telemetría y eventos con un uid propio: si se corta la conexión, la simulación sigue y los eventos esperan en una cola.
 */
export class Laboratorio {
  cfg: Cfg = leer<Cfg>(CLAVE_CFG, { url: "http://localhost:5080", clave: "dev-ingesta-key", modo: "local", escenario: "cinta", velocidad: 1 });
  escenario: Escenario = ESCENARIOS[this.cfg.escenario] ?? ESCENARIOS.cinta;
  e = this.escenario.crear();
  estado: EstadoSim = "detenida";
  fallas = new Set<string>();
  eventos: EventoLab[] = [];
  historial: Record<string, number[]> = {};
  seleccion = "plc";
  conexion: Conexion = this.cfg.modo === "sincronizado" ? "conectando" : "local";
  mensajeConexion = "";
  mantencionSima: string[] = [];
  pendientes = leerCola().length;
  version = 0;

  private oyentes = new Set<() => void>();
  private reloj?: ReturnType<typeof setInterval>;
  private sync?: ReturnType<typeof setInterval>;
  private contador = 0;
  private otros: OtroEquipo[] = [];
  private enviando = false;
  private ultimoHist = 0;

  suscribir = (f: () => void) => { this.oyentes.add(f); return () => { this.oyentes.delete(f); }; };
  instantanea = () => this.version;
  private avisar() { this.version++; this.oyentes.forEach((f) => f()); }
  private guardarCfg() { try { localStorage.setItem(CLAVE_CFG, JSON.stringify(this.cfg)); } catch { /* sin almacenamiento */ } }

  iniciarMotor() {
    if (this.reloj) return;
    this.reloj = setInterval(() => this.tic(), 50);
    this.sync = setInterval(() => void this.sincronizar(), 1000);
    this.registrar("info", `Laboratorio listo · escenario «${this.escenario.nombre}» · modo ${this.cfg.modo === "local" ? "local (sin red)" : "sincronizado con SIMA"}`, "usuario");
    if (this.cfg.modo === "sincronizado") void this.conectar();
  }
  detenerMotor() { clearInterval(this.reloj); clearInterval(this.sync); this.reloj = undefined; this.sync = undefined; }

  // ---------------------------------------------------------------------------------------- bucle
  private tic() {
    if (this.estado !== "corriendo") return;
    const pasos = Math.max(1, Math.round(this.cfg.velocidad));
    const dt = PASO * (this.cfg.velocidad < 1 ? this.cfg.velocidad : 1);
    for (let i = 0; i < pasos; i++) this.escenario.paso(this.e, dt, this.fallas, (tipo, nivel, mensaje, datos) => this.emitir(tipo, nivel, mensaje, datos));
    if (this.e.t - this.ultimoHist >= 0.5) {
      this.ultimoHist = this.e.t;
      for (const l of this.escenario.lecturas(this.e)) { const h = this.historial[l.variable] ?? []; h.push(l.valor); this.historial[l.variable] = h.slice(-120); }
      const p = this.historial.__produccion ?? []; p.push(this.e.contador); this.historial.__produccion = p.slice(-120);
    }
    this.avisar();
  }

  /** Evento generado por la simulación: va a la consola y, en modo sincronizado, a la cola hacia SIMA. */
  private emitir(tipo: string, nivel: Nivel, mensaje: string, datos?: Record<string, unknown>) {
    const uid = `${sesion}-${Date.now().toString(36)}-${(this.contador++).toString(36)}`;
    const ts = new Date().toISOString();
    this.eventos = [{ uid, t: this.e.t, ts, tipo, nivel, mensaje, equipo: this.escenario.equipo, origen: "simulacion" as const, enviado: false }, ...this.eventos].slice(0, 500);
    if (this.cfg.modo === "sincronizado") {
      const cola = [...leerCola(), { uid, ts, tipo, nivel, mensaje, equipo: tipo === "estado_plc" ? undefined : this.escenario.equipo, datos, plc: this.escenario.plc }].slice(-MAX_COLA);
      try { localStorage.setItem(CLAVE_COLA, JSON.stringify(cola)); } catch { /* sin espacio */ }
      this.pendientes = cola.length;
    }
  }
  registrar(nivel: Nivel, mensaje: string, origen: EventoLab["origen"] = "usuario") {
    this.eventos = [{ uid: `${sesion}-u${this.contador++}`, t: this.e.t, ts: new Date().toISOString(), tipo: "registro", nivel, mensaje, origen, enviado: true }, ...this.eventos].slice(0, 500);
    this.avisar();
  }

  // ---------------------------------------------------------------------------------------- controles de simulación
  iniciar() {
    if (this.estado === "corriendo") return;
    const antes = this.estado;
    this.estado = "corriendo";
    if (antes === "detenida") { this.registrar("ok", "Simulación iniciada"); this.escenario.marcha(this.e); if (this.cfg.modo === "sincronizado") this.emitir("estado_plc", "ok", `${this.escenario.plc} en marcha (RUN)`, { estado: "run" }); }
    else this.registrar("info", "Simulación reanudada");
    this.avisar();
  }
  pausar() { if (this.estado !== "corriendo") return; this.estado = "pausada"; this.registrar("aviso", "Simulación en pausa: el proceso queda congelado"); }
  detener() {
    if (this.estado === "detenida") return;
    this.escenario.paro(this.e);
    for (let i = 0; i < 20; i++) this.escenario.paso(this.e, PASO, this.fallas, (t, n, m, d) => this.emitir(t, n, m, d));
    this.estado = "detenida";
    if (this.cfg.modo === "sincronizado") this.emitir("estado_plc", "aviso", `${this.escenario.plc} en STOP`, { estado: "stop" });
    this.registrar("aviso", "Simulación detenida");
  }
  reiniciar() {
    this.e = this.escenario.crear(); this.fallas.clear(); this.historial = {}; this.ultimoHist = 0;
    this.estado = "detenida";
    this.registrar("info", "Escenario reiniciado a su estado inicial");
  }
  setVelocidad(v: number) { this.cfg.velocidad = v; this.guardarCfg(); this.registrar("info", `Velocidad de simulación ×${v}`); }
  setEscenario(id: keyof typeof ESCENARIOS) {
    if (id === this.escenario.id) return;
    if (this.estado !== "detenida") this.detener();
    this.cfg.escenario = id; this.guardarCfg();
    this.escenario = ESCENARIOS[id]; this.e = this.escenario.crear(); this.fallas.clear(); this.historial = {}; this.seleccion = "plc"; this.otros = [];
    this.registrar("info", `Escenario «${this.escenario.nombre}» · ${this.escenario.plc} / ${this.escenario.equipo}`);
    if (this.cfg.modo === "sincronizado") void this.conectar();
  }
  alternarFalla(id: string) {
    const def = this.escenario.fallas.find((f) => f.id === id);
    if (this.fallas.has(id)) { this.fallas.delete(id); this.registrar("info", `Falla simulada desactivada: ${def?.nombre}`); if (id === "cpu" && this.cfg.modo === "sincronizado") this.emitir("estado_plc", "ok", `${this.escenario.plc} recupera la CPU`, { estado: this.estado === "corriendo" ? "run" : "stop" }); }
    else { this.fallas.add(id); this.registrar("alarma", `Falla simulada activada: ${def?.nombre}`); if (id === "cpu") this.emitir("estado_plc", "alarma", `${this.escenario.plc}: falla de CPU simulada`, { estado: "error" }); }
  }
  reparar(origen: "usuario" | "sima" = "usuario") {
    const habia = !!this.e.falla || this.fallas.size > 0;
    this.fallas.clear(); this.escenario.reparar(this.e);
    if (habia) this.emitir("recuperacion", "ok", `${this.escenario.equipo}: falla despejada${origen === "sima" ? " (orden de trabajo cerrada en SIMA)" : ""}`);
    this.avisar();
  }
  boton(b: "marcha" | "paro" | "emergencia") { this.escenario[b](this.e); this.registrar(b === "marcha" ? "info" : "aviso", `Señal simulada al PLC: ${b === "marcha" ? "MARCHA" : b === "paro" ? "PARO" : "EMERGENCIA"}`); }
  setParametro(id: string, v: number) { this.e.ajustes[id] = v; this.avisar(); }
  seleccionar(id: string) { this.seleccion = id; this.avisar(); }
  alternarMantencion() { const m = this.e as unknown as { mantencion?: boolean }; if (m.mantencion === undefined) return; m.mantencion = !m.mantencion; this.registrar("aviso", m.mantencion ? "Máquina en modo mantención (local)" : "Fin del modo mantención"); }

  // ---------------------------------------------------------------------------------------- sincronización con SIMA
  setModo(modo: Modo, url?: string, clave?: string) {
    this.cfg = { ...this.cfg, modo, url: (url ?? this.cfg.url).replace(/\/+$/, ""), clave: clave ?? this.cfg.clave }; this.guardarCfg();
    if (modo === "local") { this.conexion = "local"; this.mensajeConexion = ""; this.registrar("info", "Modo local: la simulación corre sin red y no envía datos a SIMA"); }
    else { this.registrar("info", `Sincronizando con SIMA en ${this.cfg.url}`); void this.conectar(); }
  }

  private async pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 5000);
    try {
      const r = await fetch(`${this.cfg.url}${ruta}`, { method: metodo, signal: c.signal, headers: { "content-type": "application/json", "X-API-Key": this.cfg.clave }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
      const j = r.headers.get("content-type")?.includes("json") ? await r.json() : null;
      if (!r.ok) throw Object.assign(new Error(j?.error ?? `HTTP ${r.status}`), { status: r.status });
      return j as T;
    } finally { clearTimeout(t); }
  }

  async conectar() {
    this.conexion = "conectando"; this.avisar();
    try {
      const cfg = await this.pedir<{ equipos: { codigo: string; estadoAdministrativo: string; sensores: { variable: string; nominal: number; min: number; max: number }[] }[] }>("GET", `/api/ingesta/plc/${this.escenario.plc}/config`);
      this.otros = cfg.equipos.filter((x) => x.codigo !== this.escenario.equipo).map((x) => ({ codigo: x.codigo, sensores: x.sensores }));
      this.mantencionSima = cfg.equipos.filter((x) => x.estadoAdministrativo === "en_mantencion").map((x) => x.codigo);
      this.conexion = "conectado"; this.mensajeConexion = "";
      this.registrar("ok", `Conectado a SIMA: ${this.escenario.plc} (${cfg.equipos.length} equipos). Los eventos llevan la marca SIM.`, "sima");
    } catch (x) {
      const st = (x as { status?: number }).status;
      this.conexion = st === 401 || st === 403 ? "rechazado" : "sin_conexion";
      this.mensajeConexion = (x as Error).message;
      this.registrar(st ? "alarma" : "aviso", st ? `SIMA rechazó la conexión: ${this.mensajeConexion}` : "SIMA no responde: la simulación sigue en local y los eventos esperan en cola", "sima");
    }
    this.avisar();
  }

  private async sincronizar() {
    if (this.cfg.modo !== "sincronizado" || this.enviando) return;
    if (this.conexion === "rechazado") return;
    if (this.conexion !== "conectado") { if (Math.random() < 0.25) await this.conectar(); return; }
    this.enviando = true;
    try {
      const io = this.escenario.io(this.e);
      const lecturas = [...this.escenario.lecturas(this.e).map((l) => ({ equipo: this.escenario.equipo, variable: l.variable, valor: Math.round(l.valor * 100) / 100 })),
        ...this.otros.flatMap((o) => o.sensores.map((s) => ({ equipo: o.codigo, variable: s.variable, valor: Math.round((s.nominal + (Math.random() - 0.5) * (s.max - s.min) * 0.02) * 100) / 100 })))];
      const estado = this.fallas.has("cpu") ? "error" : this.estado === "corriendo" ? "run" : "stop";
      const r = await this.pedir<{ mantencion?: string[]; comandos?: { tag: string; valor: number }[] }>("POST", `/api/ingesta/plc/${this.escenario.plc}/telemetria`,
        { uid: `${sesion}-tel-${this.contador++}`, estado, lecturas, io,
          equipos: [{ equipo: this.escenario.equipo, estado: this.escenario.estadoEquipo(this.e) }, ...this.otros.map((o) => ({ equipo: o.codigo, estado: estado === "error" ? "alarma" : "operando" }))] });
      this.mantencionSima = r.mantencion ?? [];
      for (const c of r.comandos ?? []) {
        if (c.tag.endsWith("_REPARAR")) this.reparar("sima");
        else if (c.tag.endsWith("_MARCHA")) { this.escenario.marcha(this.e); this.registrar("info", `Orden desde SIMA: ${c.tag}`, "sima"); }
        else if (c.tag.endsWith("_PARO")) { this.escenario.paro(this.e); this.registrar("aviso", `Orden desde SIMA: ${c.tag}`, "sima"); }
      }
      await this.vaciarCola();
    } catch (x) {
      const st = (x as { status?: number }).status;
      this.conexion = st === 401 || st === 403 ? "rechazado" : "sin_conexion";
      this.mensajeConexion = (x as Error).message;
      this.registrar("aviso", st ? `SIMA rechazó el envío: ${this.mensajeConexion}` : "Se perdió la conexión con SIMA: se sigue simulando en local", "sima");
    } finally { this.enviando = false; this.avisar(); }
  }

  /** Envía la cola por lotes; el servidor descarta los uid que ya tiene, así un reintento nunca duplica. */
  private async vaciarCola() {
    for (let vuelta = 0; vuelta < 5; vuelta++) {
      const cola = leerCola();
      if (cola.length === 0) break;
      const plc = cola[0].plc;
      const lote = cola.filter((p) => p.plc === plc).slice(0, 100);
      await this.pedir("POST", `/api/ingesta/plc/${plc}/eventos`, lote.map((p) => ({ uid: p.uid, ts: p.ts, tipo: p.tipo, equipo: p.equipo, nivel: p.nivel, mensaje: p.mensaje, datos: p.datos ?? {} })));
      const enviados = new Set(lote.map((p) => p.uid));
      const resto = leerCola().filter((p) => !enviados.has(p.uid));
      try { localStorage.setItem(CLAVE_COLA, JSON.stringify(resto)); } catch { /* */ }
      this.pendientes = resto.length;
      this.eventos = this.eventos.map((ev) => (enviados.has(ev.uid) ? { ...ev, enviado: true } : ev));
    }
  }
}

export const lab = new Laboratorio();
export const useLab = () => { useSyncExternalStore(lab.suscribir, lab.instantanea); return lab; };
