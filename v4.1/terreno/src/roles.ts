import type { Usuario } from "@sima/cliente";

/**
 * Experiencia de SIMA Desktop por cargo. Cada trabajador ve su propio inicio, su menú y sus acciones, según el
 * informe «Accesos y necesidades por trabajador». El menú se filtra además por las capacidades que el servidor
 * entrega para el cargo (usuario.capacidades): nunca aparece algo que el servidor vaya a negar.
 */
export type Seccion =
  | "inicio" | "produccion" | "turno" | "plan" | "seguimiento" | "mantenimiento" | "explorador" | "alertas" | "reportar" | "seguridad"
  | "calidad" | "calibraciones" | "condicion" | "automatizacion" | "rutinas" | "panol" | "traspaso" | "cargo" | "directorio";

export interface DefSeccion { titulo: string; grupo: "Mi trabajo" | "Planta" | "Turno" | "Personal"; requiere?: string[]; perfiles?: string[] }

/** Catálogo de secciones. `requiere`: basta una de esas capacidades del servidor. */
export const SECCIONES: Record<Seccion, DefSeccion> = {
  inicio: { titulo: "Inicio", grupo: "Mi trabajo" },
  produccion: { titulo: "Producción", grupo: "Mi trabajo", requiere: ["produccion.registrar", "produccion.editar"] },
  turno: { titulo: "Mi equipo de turno", grupo: "Mi trabajo", requiere: ["asistencia.ver"] },
  plan: { titulo: "Planificación de mantenimiento", grupo: "Mi trabajo", requiere: ["ordenes.asignar"] },
  seguimiento: { titulo: "Seguimiento del departamento", grupo: "Mi trabajo", requiere: ["ordenes.asignar", "ordenes.aprobar"] },
  mantenimiento: { titulo: "Órdenes de trabajo", grupo: "Mi trabajo", requiere: ["ordenes.ejecutar", "ordenes.aprobar", "equipos.liberar_tecnica", "equipos.liberar_seguridad", "equipos.liberar_calidad", "equipos.confirmar_produccion"] },
  calidad: { titulo: "Inspección de calidad", grupo: "Mi trabajo", requiere: ["calidad.registrar"] },
  calibraciones: { titulo: "Instrumentos y calibración", grupo: "Mi trabajo", requiere: ["herramientas.ver"], perfiles: ["instrumentacion", "calidad_terreno"] },
  condicion: { titulo: "Condición de activos", grupo: "Mi trabajo", requiere: ["planta.ver"], perfiles: ["confiabilidad", "jefe_mant"] },
  automatizacion: { titulo: "PLC y automatización", grupo: "Mi trabajo", requiere: ["plc.editar", "plc.aprobar"] },
  seguridad: { titulo: "Seguridad y salud", grupo: "Mi trabajo", requiere: ["sst.reportar"] },
  explorador: { titulo: "Explorador de planta", grupo: "Planta", requiere: ["planta.ver"] },
  alertas: { titulo: "Alertas", grupo: "Planta", requiere: ["planta.ver"] },
  reportar: { titulo: "Reportar falla", grupo: "Planta", requiere: ["ordenes.crear"] },
  rutinas: { titulo: "Rutinas y checklist", grupo: "Turno" },
  panol: { titulo: "Pañol y repuestos", grupo: "Turno", requiere: ["repuestos.ver"] },
  traspaso: { titulo: "Traspaso de turno", grupo: "Turno", requiere: ["traspaso.ver", "traspaso.editar"] },
  cargo: { titulo: "Mi cargo", grupo: "Personal" },
  directorio: { titulo: "Directorio", grupo: "Personal" },
};

export interface Experiencia {
  inicio: string;            // nombre de la pantalla de inicio («Mi operación», «Plan semanal de OT»…)
  enfoque: string;           // una línea: para qué está esta pantalla
  menu: Seccion[];           // orden del menú (se filtra por capacidades)
  acciones: Seccion[];       // accesos rápidos del inicio
  alertas: string[];         // qué vigila (aparece en el inicio)
  alcance: string;           // lo que el cargo ve y no ve
}

const MANT_TEC: Seccion[] = ["inicio", "mantenimiento", "explorador", "alertas", "panol", "reportar", "seguridad", "cargo"];

/** Por perfil (todos los cargos del perfil); luego se ajusta por cargo. */
const PERFIL: Record<string, Experiencia> = {
  operador: {
    inicio: "Mi operación", enfoque: "Su orden de producción, su equipo autorizado y lo que debe registrar en el turno.",
    menu: ["inicio", "produccion", "rutinas", "reportar", "seguridad", "alertas", "cargo"], acciones: ["produccion", "reportar", "seguridad"],
    alertas: ["Operación sin habilitación vigente", "Parámetros fuera de rango", "Condición insegura"], alcance: "Solo su estación y su turno. No ve sueldos ni datos de otras personas, ni modifica parámetros críticos.",
  },
  supervisor_turno: {
    inicio: "Mi turno", enfoque: "Personas, órdenes de fabricación, equipos e incidentes de su turno.",
    menu: ["inicio", "turno", "produccion", "mantenimiento", "explorador", "alertas", "traspaso", "seguridad", "reportar", "directorio"], acciones: ["produccion", "turno", "traspaso", "reportar"],
    alertas: ["Ausencias del equipo", "Equipos detenidos", "Habilitaciones vencidas", "Incidentes del turno"], alcance: "Solo su turno y el personal asignado a usted.",
  },
  tecnico: {
    inicio: "Mis órdenes de trabajo", enfoque: "Las OT de su especialidad, con manuales, repuestos y bloqueo LOTO.",
    menu: MANT_TEC, acciones: ["mantenimiento", "explorador", "panol", "reportar"],
    alertas: ["Trabajo sin aislamiento", "Repuesto no disponible", "Nueva falla en equipos de su especialidad"], alcance: "Solo OT autorizadas para usted; sin aprobación de compras ni datos personales de terceros.",
  },
  supervisor_mant: {
    inicio: "Cuadrilla de mantenimiento", enfoque: "Carga de trabajo de la cuadrilla, bloqueos activos y cierres técnicos.",
    menu: ["inicio", "plan", "seguimiento", "mantenimiento", "explorador", "alertas", "panol", "traspaso", "seguridad", "reportar"], acciones: ["plan", "mantenimiento", "traspaso"],
    alertas: ["Intervención sin LOTO", "Retraso crítico", "Equipo no liberado"], alcance: "Solo sus equipos y su cuadrilla; detalle personal mínimo.",
  },
  jefe_mant: {
    inicio: "Gestión de mantenimiento", enfoque: "Activos críticos, disponibilidad, backlog, fallas repetitivas y aprobaciones.",
    menu: ["inicio", "plan", "seguimiento", "mantenimiento", "condicion", "automatizacion", "explorador", "alertas", "panol", "traspaso", "reportar"], acciones: ["plan", "automatizacion", "condicion"],
    alertas: ["Fallas repetitivas", "Equipos críticos fuera de servicio", "Repuestos críticos bajo mínimo", "Cambios de PLC por aprobar"], alcance: "Todo mantenimiento; sin acceso a sueldos.",
  },
  confiabilidad: {
    inicio: "Condición de activos", enfoque: "Tendencias de vibración y temperatura, rutas de lubricación y alertas predictivas.",
    menu: ["inicio", "condicion", "rutinas", "mantenimiento", "explorador", "alertas", "reportar"], acciones: ["condicion", "rutinas", "reportar"],
    alertas: ["Vibración o temperatura anormal", "Ruta atrasada"], alcance: "Equipos de sus rutas; sin cambios a parámetros de máquina.",
  },
  ing_automatizacion: {
    inicio: "Automatización OT", enfoque: "Estado de los PLC, versiones de programa, cambios solicitados y fallas de comunicación.",
    menu: ["inicio", "automatizacion", "explorador", "alertas", "mantenimiento", "reportar"], acciones: ["automatizacion", "explorador", "alertas"],
    alertas: ["Controlador sin conexión", "Cambio sin revisión", "Falla crítica de CPU"], alcance: "Equipos bajo autorización OT. Los cambios de programa se publican solo con la aprobación de otra persona.",
  },
  instrumentacion: {
    inicio: "Calibraciones", enfoque: "Instrumentos, tolerancias y vencimientos de calibración.",
    menu: ["inicio", "calibraciones", "mantenimiento", "explorador", "alertas", "reportar"], acciones: ["calibraciones", "mantenimiento"],
    alertas: ["Calibración vencida", "Calibración por vencer en 30 días"], alcance: "Instrumentos y patrones asignados.",
  },
  panol: {
    inicio: "Pañol de repuestos", enfoque: "Stock, mínimos, repuestos críticos y lo que piden las órdenes del programa.",
    menu: ["inicio", "panol", "explorador", "alertas", "seguridad", "cargo"], acciones: ["panol"],
    alertas: ["Stock bajo mínimo", "Repuestos críticos agotados", "OT programadas sin stock"], alcance: "Pañol y bodega asignados; sin nóminas ni datos bancarios.",
  },
  calidad_terreno: {
    inicio: "Inspección de calidad", enfoque: "Lotes en producción, no conformidades abiertas e instrumentos de medición.",
    menu: ["inicio", "calidad", "mantenimiento", "calibraciones", "explorador", "seguridad", "cargo"], acciones: ["calidad", "calibraciones"],
    alertas: ["Muestra fuera de tolerancia", "Lote sin liberar", "Instrumento vencido"], alcance: "Lotes y estaciones asignados. La liberación final la hace la jefatura de calidad.",
  },
  prevencion: {
    inicio: "Prevención SST", enfoque: "Eventos por investigar, condiciones inseguras, habilitaciones y riesgos por zona.",
    menu: ["inicio", "seguridad", "mantenimiento", "explorador", "alertas", "rutinas", "cargo"], acciones: ["seguridad", "explorador"],
    alertas: ["Accidente o casi accidente", "Habilitación de seguridad vencida", "Evento sin investigar"], alcance: "Información preventiva. No se guardan datos médicos individuales.",
  },
};

/** Ajustes por cargo (id del cargo en la base) sobre la experiencia del perfil. */
const CARGO: Record<number, Partial<Experiencia>> = {
  8: { inicio: "Mi línea", enfoque: "Secuencia de la línea, lotes, metas y defectos.", alcance: "Solo su línea y el equipo asignado." },
  10: { inicio: "Mi máquina CNC", enfoque: "Su orden, el programa autorizado, primera pieza y controles dimensionales." },
  11: { inicio: "Mi ensamble", enfoque: "Orden de ensamble, autocontrol de calidad y faltantes." },
  12: { inicio: "Mi embalaje", enfoque: "Órdenes de embalaje, lotes, etiquetas y unidades embaladas." },
  13: { inicio: "Sala de control", enfoque: "Estados, tendencias y alarmas de proceso: reconocer y escalar.", menu: ["inicio", "alertas", "explorador", "rutinas", "reportar", "seguridad", "cargo"], acciones: ["alertas", "explorador", "reportar"], alertas: ["Alarmas críticas", "Desviaciones de proceso", "Fallas de comunicación"] },
  14: { inicio: "Mis movimientos", enfoque: "Inspección preuso de la grúa, rutas y reporte de daños.", menu: ["inicio", "rutinas", "seguridad", "reportar", "alertas", "cargo"], acciones: ["rutinas", "seguridad"], alertas: ["Grúa sin habilitación vigente", "Ruta bloqueada", "Daño"] },
  15: { inicio: "Apoyo de línea", enfoque: "Abastecimiento de línea, limpieza y checklist 5S.", menu: ["inicio", "produccion", "rutinas", "reportar", "seguridad", "cargo"], acciones: ["rutinas", "reportar"] },
  24: { inicio: "Plan semanal de OT", enfoque: "Backlog, programa de la semana, asignación de técnicos y repuestos.", menu: ["inicio", "plan", "seguimiento", "explorador", "panol", "alertas", "reportar"], acciones: ["plan", "panol"], alertas: ["OT sin fecha", "OT sin técnico", "OT programadas sin repuestos"], alcance: "Prepara y programa órdenes; la ejecución la firma el técnico asignado." },
  19: { inicio: "Cambios PLC/HMI", enfoque: "Solicitudes de cambio, versiones y pruebas de los controladores asignados." },
  22: { inicio: "Sistemas industriales", enfoque: "Comunicación de los PLC con SIMA, eventos y calidad de datos." },
  26: { inicio: "Mis OT mecánicas" }, 27: { inicio: "Mis OT eléctricas" }, 28: { inicio: "Mis OT electromecánicas" },
  35: { inicio: "Metrología", enfoque: "Instrumentos de medición, patrones y vencimientos." },
  39: { inicio: "Recepción de materiales", enfoque: "Lo que llega de los proveedores: documentos, cantidades, lotes y ubicación.", alcance: "Recepciones de su bodega; sin precios de compra ni datos personales." },
  40: { inicio: "Bodega y almacén", enfoque: "Existencias por ubicación, conteos cíclicos y tareas de su equipo de bodega.", alcance: "Bodega asignada y su equipo; sin sueldos ni contratos." },
  41: { inicio: "Preparación de pedidos", enfoque: "Sus tareas de picking y reposición, sin diferencias.", alcance: "Solo sus tareas; sin precios ni datos personales." },
  34: { inicio: "Mis ensayos", enfoque: "Muestras, resultados de ensayo y no conformidades." },
  51: { inicio: "Comité paritario", enfoque: "Observaciones, riesgos no resueltos y seguimiento de medidas." },
  52: { inicio: "Gestión ambiental", enfoque: "Incidentes ambientales, inspecciones y evidencias." },
  53: { inicio: "Salud y ergonomía", enfoque: "Condiciones de puesto y medidas preventivas (sin datos clínicos)." },
  54: { inicio: "Brigada de emergencia", enfoque: "Hallazgos, zonas bloqueadas e inspecciones de equipamiento." },
};

/** Especialidad de las OT que ve primero cada técnico. */
export const ESPECIALIDAD_CARGO: Record<number, string[]> = { 26: ["mecanica", "general"], 27: ["electrica", "general"], 28: ["electromecanica", "mecanica", "electrica", "general"], 20: ["instrumentacion"], 35: ["instrumentacion"], 18: ["automatizacion"], 19: ["automatizacion"], 22: ["automatizacion"], 29: ["mecanica", "general"] };

export function experienciaDe(u: Usuario | null): Experiencia {
  const base = PERFIL[u?.perfil ?? ""] ?? PERFIL.operador;
  return { ...base, ...(u ? CARGO[u.cargoId] ?? {} : {}) };
}

export function tiene(u: Usuario | null | undefined, cap: string) {
  const c = u?.capacidades ?? {};
  return cap in c || (cap.endsWith(".ver") && `${cap.slice(0, -4)}.editar` in c);
}

/** Secciones visibles para la persona: las de su experiencia que el servidor le permite. */
/** Todos pueden reportar una condición insegura y ver la descripción de su cargo (reglas generales de la matriz). */
const SIEMPRE: Seccion[] = ["seguridad", "cargo"];

export function seccionesDe(u: Usuario | null): Seccion[] {
  const menu = experienciaDe(u).menu;
  return [...menu, ...SIEMPRE.filter((s) => !menu.includes(s))].filter((s) => {
    const d = SECCIONES[s];
    if (d.perfiles && !d.perfiles.includes(u?.perfil ?? "")) return false;
    return !d.requiere || d.requiere.some((c) => tiene(u, c));
  });
}
