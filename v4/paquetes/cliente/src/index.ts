import { HubConnectionBuilder, HubConnectionState, LogLevel, type HubConnection } from "@microsoft/signalr";

// ------------------------------------------------------------------------------------------------ tipos
export type Canal = "web" | "app";
export type Permiso = "ver" | "editar" | "no";

export interface Usuario {
  id: string; nombre: string; correo: string; cargoId: number; cargo: string; familia: string; perfil: string; canal: Canal;
  turno: string; jefe?: string | null; estadoCuenta: string; permisos: Record<string, Permiso>; capacidades?: Record<string, string>;
  totpActivo?: boolean; restringido?: "clave" | "2fa" | null;
}
export interface RespuestaLogin { token: string; vence: string; usuario: Usuario }
export interface CuentaDemo { correo: string; clave: string; nombre: string; cargo: string; perfil: string; canal: Canal }

export interface TrabajadorResumen {
  id: string; rut: string; nombre: string; cargoId: number; cargo: string; familia: string; tipoCargo: string; perfil: string; canal: Canal; turno: string;
  correoCorporativo: string; jefeDirectoId?: string | null; fechaIngreso: string; edad: number; estadoLaboral: "Activo" | "Desvinculado"; fechaTermino?: string | null;
  estadoCuenta: "ACTIVA" | "CERRADA" | "SUSPENDIDA"; estadoContrato: string; tipoContrato?: string | null; sueldoBase?: number | null; venceContrato?: string | null; diasParaVencer?: number | null;
}
export interface ContratoFila {
  id: number; codigo: string; trabajadorId: string; trabajador: string; cargo: string; tipo: string; esActual: boolean; fechaInicio: string; fechaTermino?: string | null;
  jornadaHoras?: number | null; sueldoBase: number; colacion: number; movilizacion: number; estado: string; diasParaVencer?: number | null; observaciones?: string;
}
export interface Liquidacion {
  periodo: string; idTrabajador: string; trabajador: string; cargo: string; tipoContrato: string; diasTrabajados: number; sueldoBase: number; sueldoProporcional: number; gratificacion: number;
  horasExtraN: number; horasExtraMonto: number; bonosImponibles: number; totalImponible: number; noImponibles: number; totalHaberes: number; basePrevisional: number; descuentoAfp: number;
  descuentoSalud: number; seguroCesantia: number; baseTributable: number; impuestoUnico: number; retencionHonorarios: number; otrosDescuentos: number; totalDescuentos: number; liquidoAPagar: number; estadoPago: string;
}
export interface Sensor { variable: string; nombre: string; unidad: string; ultimo: number | null; min: number; max: number; nominal: number; aviso: number; alarma: number; nivel: "ok" | "aviso" | "alarma" }
export interface Equipo { id: number; codigo: string; nombre: string; tipo: string; zona: string; linea: string; ubicacion: string; marca: string; modelo: string; criticidad: string; estado: string; plc?: string | null; alarmasAbiertas: number; sensores: Sensor[] }
export interface PlcResumen { id: number; codigo: string; nombre: string; fabricante: string; modelo: string; direccion: string; zona: string; estado: string; ultimoContacto?: string | null; cicloMs: number; modulos: number; puntos: number; entradas: number; salidas: number; equipos: string[] }
export interface PlcModulo { id: number; slot: number; tipo: string; modelo: string; canales: number }
export interface PlcPunto { id: number; moduloId: number; canal: number; direccion: string; tag: string; tipo: "DI" | "DO" | "AI" | "AO"; descripcion: string; equipo?: string | null; unidad: string; minimo: number; maximo: number }
export type Condicion =
  | { tipo: "NA" | "NC"; tag: string }
  | { tipo: "CMP"; tag: string; op: ">=" | "<=" | ">" | "<" | "=="; valor: number }
  | { tipo: "OR"; ramas: Condicion[][] };
export type Salida = { tipo: "BOBINA" | "SET" | "RESET"; tag: string } | { tipo: "TON"; tag: string; preset: number } | { tipo: "CTU"; tag: string; preset: number; reset?: string };
export interface Peldano { id: number; comentario: string; condiciones: Condicion[]; salida: Salida }
export interface Variable { nombre: string; tipo: "bool" | "timer" | "counter"; preset?: number; descripcion?: string }
export interface ProgramaPlc { version: number; variables: Variable[]; peldanos: Peldano[] }

export interface PlcDetalle extends Omit<PlcResumen, "modulos" | "puntos" | "entradas" | "salidas" | "equipos"> {
  modulos: PlcModulo[]; puntos: PlcPunto[]; equipos: { codigo: string; nombre: string; tipo: string; estado: string }[]; programa: ProgramaPlc; io: Record<string, number>; version?: number;
}

export class ApiError extends Error {
  constructor(public status: number, mensaje: string, public datos?: Record<string, unknown> | null) { super(mensaje); }
}

// ------------------------------------------------------------------------------------------------ cliente HTTP
export interface OpcionesCliente {
  baseUrl: () => string;
  token: () => string | null;
  apiKey?: () => string | null;
  /** Se llama si el servidor responde 401 con una sesión abierta (cuenta cerrada, token vencido o revocado). */
  alExpirar?: () => void;
}

export function crearCliente(o: OpcionesCliente) {
  async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
    const cab: Record<string, string> = {};
    if (cuerpo !== undefined) cab["Content-Type"] = "application/json";
    const t = o.token();
    if (t) cab["Authorization"] = `Bearer ${t}`;
    const k = o.apiKey?.();
    if (k) cab["X-API-Key"] = k;
    let r: Response;
    try {
      r = await fetch(o.baseUrl() + ruta, { method: metodo, headers: cab, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
    } catch {
      throw new ApiError(0, "No hay conexión con el servidor de SIMA.");
    }
    const texto = await r.text();
    const datos = texto ? JSON.parse(texto) : null;
    if (r.status === 401 && t) o.alExpirar?.();
    if (!r.ok) throw new ApiError(r.status, (datos && datos.error) || (r.status === 401 ? "La sesión terminó. Ingrese de nuevo." : `Error ${r.status}`), datos);
    return datos as T;
  }
  return {
    get: <T>(ruta: string) => pedir<T>("GET", ruta),
    post: <T>(ruta: string, cuerpo?: unknown) => pedir<T>("POST", ruta, cuerpo ?? {}),
    put: <T>(ruta: string, cuerpo: unknown) => pedir<T>("PUT", ruta, cuerpo),
    del: <T>(ruta: string) => pedir<T>("DELETE", ruta),
    login: (correo: string, clave: string, canal: Canal, codigo?: string) => pedir<RespuestaLogin>("POST", "/api/auth/login", { correo, clave, canal, codigo: codigo || null }),
    demo: () => pedir<CuentaDemo[]>("GET", "/api/auth/demo"),
  };
}
export type Cliente = ReturnType<typeof crearCliente>;

// ------------------------------------------------------------------------------------------------ tiempo real (SignalR)
export interface EventosPlanta {
  lecturas?: (l: { equipo: string; variable: string; valor: number; ts: string }[]) => void;
  equipo?: (e: { codigo: string; estado: string }) => void;
  alarma?: (a: { equipo: string; nivel: string; mensaje: string; abierta: boolean }) => void;
  orden?: (o: { id: number; codigo: string; equipo: string; titulo: string; prioridad: string }) => void;
  plc?: (p: { codigo: string; estado: string }) => void;
  plcIO?: (p: { codigo: string; estado: string; io: Record<string, number>; ciclos?: number }) => void;
  cuentaCerrada?: (m: { motivo: string }) => void;
  produccion?: (p: { id: number; codigo: string; estado: string; producidas?: number; buenas?: number }) => void;
  calidad?: (c: { id: number; codigo: string; estado: string; severidad: string; texto: string }) => void;
  sst?: (s: { id: number; codigo: string; tipo: string; severidad: string; texto: string }) => void;
  cambioPlc?: (c: { id: number; plc: string; estado: string; por: string; resumen: string; version?: number }) => void;
  conexion?: (estado: "conectado" | "reconectando" | "desconectado") => void;
}

export function conectarTiempoReal(baseUrl: string, token: () => string | null, ev: EventosPlanta): { detener: () => Promise<void>; conexion: HubConnection } {
  const c = new HubConnectionBuilder()
    .withUrl(`${baseUrl}/hubs/planta`, { accessTokenFactory: () => token() ?? "" })
    .withAutomaticReconnect([0, 1000, 3000, 5000, 10000])
    .configureLogging(LogLevel.Error)
    .build();
  (["lecturas", "equipo", "alarma", "orden", "plc", "plcIO", "cuentaCerrada", "produccion", "calidad", "sst", "cambioPlc"] as const).forEach((n) => {
    const f = ev[n] as ((x: never) => unknown) | undefined;
    // el manejador no debe devolver nada: SignalR toma un valor devuelto como respuesta al servidor
    if (f) c.on(n, (...a: unknown[]) => { (f as (...x: unknown[]) => unknown)(...a); });
  });
  c.onreconnecting(() => ev.conexion?.("reconectando"));
  c.onreconnected(() => ev.conexion?.("conectado"));
  c.onclose(() => ev.conexion?.("desconectado"));
  let detenido = false;
  const arrancar = async () => {
    try { await c.start(); ev.conexion?.("conectado"); }
    catch { if (!detenido) setTimeout(arrancar, 3000); }
  };
  void arrancar();
  return { conexion: c, detener: async () => { detenido = true; if (c.state !== HubConnectionState.Disconnected) await c.stop(); } };
}

// ------------------------------------------------------------------------------------------------ formato
const clpFmt = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
export const clp = (n?: number | null) => (n == null ? "—" : clpFmt.format(n));
export const num = (n?: number | null, d = 0) => (n == null ? "—" : new Intl.NumberFormat("es-CL", { maximumFractionDigits: d, minimumFractionDigits: d }).format(n));
export function fecha(f?: string | null) {
  if (!f) return "—";
  const [y, m, d] = f.slice(0, 10).split("-");
  return `${d}-${m}-${y}`;
}
export function hace(iso?: string | null) {
  if (!iso) return "nunca";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "hace un momento";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
}
export const periodoLegible = (p: string) => {
  const [y, m] = p.split("-");
  return `${["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"][+m]} ${y}`;
};

export * from "./plc";
