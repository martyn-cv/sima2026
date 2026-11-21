import type { Condicion, Peldano, ProgramaPlc } from "./index";

export type Valores = Record<string, number>;

const COMPARAR: Record<string, (a: number, b: number) => boolean> = {
  ">=": (a, b) => a >= b, "<=": (a, b) => a <= b, ">": (a, b) => a > b, "<": (a, b) => a < b, "==": (a, b) => a === b,
};

/** ¿Pasa corriente por este elemento? (contacto normalmente abierto o cerrado, comparación o ramas en paralelo). */
export function pasa(c: Condicion, v: Valores): boolean {
  switch (c.tipo) {
    case "NA": return (v[c.tag] ?? 0) > 0;
    case "NC": return !((v[c.tag] ?? 0) > 0);
    case "CMP": return (COMPARAR[c.op] ?? COMPARAR[">="])(v[c.tag] ?? 0, c.valor);
    case "OR": return c.ramas.some((r) => serie(r, v));
  }
}
export const serie = (cs: Condicion[], v: Valores) => cs.every((c) => pasa(c, v));

interface Temporizador { acc: number }
interface Contador { cv: number; previo: boolean }

/**
 * Motor de ciclo de scan: lee las entradas, resuelve los peldaños de arriba hacia abajo y escribe las salidas.
 * Igual que un PLC real, un contacto ve el valor del ciclo anterior hasta que el peldaño que lo escribe se resuelve.
 */
export class MotorPlc {
  memoria: Valores = {};
  energizados: Record<number, boolean> = {};
  private temporizadores: Record<string, Temporizador> = {};
  private contadores: Record<string, Contador> = {};
  ciclos = 0;

  constructor(public programa: ProgramaPlc) {
    for (const v of programa.variables) this.memoria[v.nombre] = 0;
  }

  cargar(programa: ProgramaPlc) {
    this.programa = programa;
    for (const v of programa.variables) if (!(v.nombre in this.memoria)) this.memoria[v.nombre] = 0;
  }

  reiniciar() {
    this.memoria = {};
    this.temporizadores = {}; this.contadores = {}; this.energizados = {}; this.ciclos = 0;
    for (const v of this.programa.variables) this.memoria[v.nombre] = 0;
  }

  /** Ejecuta un ciclo. `entradas` trae las entradas digitales y analógicas; devuelve la imagen completa de E/S y memoria. */
  ciclo(entradas: Valores, dtMs: number): Valores {
    const imagen: Valores = { ...this.memoria, ...entradas };
    for (const p of this.programa.peldanos) this.resolver(p, imagen, dtMs);
    this.memoria = { ...imagen };
    for (const k of Object.keys(entradas)) delete this.memoria[k];     // las entradas no se guardan: se leen en cada ciclo
    this.ciclos++;
    return imagen;
  }

  private resolver(p: Peldano, img: Valores, dt: number) {
    const energia = serie(p.condiciones, img);
    this.energizados[p.id] = energia;
    const s = p.salida;
    switch (s.tipo) {
      case "BOBINA": img[s.tag] = energia ? 1 : 0; break;
      case "SET": if (energia) img[s.tag] = 1; break;
      case "RESET": if (energia) img[s.tag] = 0; break;
      case "TON": {
        const t = (this.temporizadores[s.tag] ??= { acc: 0 });
        t.acc = energia ? Math.min(s.preset, t.acc + dt) : 0;
        img[s.tag] = t.acc >= s.preset ? 1 : 0;
        img[`${s.tag}.ACC`] = t.acc;
        break;
      }
      case "CTU": {
        const c = (this.contadores[s.tag] ??= { cv: 0, previo: false });
        if (s.reset && (img[s.reset] ?? 0) > 0) c.cv = 0;
        else if (energia && !c.previo) c.cv++;
        c.previo = energia;
        img[s.tag] = c.cv >= s.preset ? 1 : 0;
        img[`${s.tag}.CV`] = c.cv;
        break;
      }
    }
  }
}

/** Describe un elemento en lenguaje corriente, para el editor y los avisos. */
export function describir(c: Condicion): string {
  switch (c.tipo) {
    case "NA": return `${c.tag} activo`;
    case "NC": return `${c.tag} inactivo`;
    case "CMP": return `${c.tag} ${c.op} ${c.valor}`;
    case "OR": return c.ramas.map((r) => r.map(describir).join(" y ")).join(" o ");
  }
}
