import type { Sensor } from "@sima/cliente";
import { cx } from "@sima/ui";

export function Medidor({ s }: { s: Sensor }) {
  const rango = s.max - s.min || 1;
  const pos = (x: number) => `${Math.min(100, Math.max(0, ((x - s.min) / rango) * 100))}%`;
  const color = s.nivel === "alarma" ? "bg-rojo" : s.nivel === "aviso" ? "bg-ambar" : "bg-acento";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-gris" title={s.nombre}>{s.nombre}</span>
        <span className={cx("num shrink-0 text-[18px] font-semibold", s.nivel === "alarma" && "text-rojo", s.nivel === "aviso" && "text-ambar")}>{s.ultimo == null ? "—" : s.ultimo.toFixed(s.max > 50 ? 0 : 1)} <span className="text-[14px] font-normal text-gris">{s.unidad}</span></span>
      </div>
      <div className="relative mt-1 h-2 bg-chapa" role="meter" aria-valuemin={s.min} aria-valuemax={s.max} aria-valuenow={s.ultimo ?? undefined} aria-label={s.nombre}>
        <div className={cx("absolute inset-y-0 left-0 transition-[width] duration-700 ease-out", color)} style={{ width: s.ultimo == null ? 0 : pos(s.ultimo) }} />
        <i className="absolute -inset-y-0.5 w-0.5 bg-ambar" style={{ left: pos(s.aviso) }} title={`Aviso: ${s.aviso}`} />
        <i className="absolute -inset-y-0.5 w-0.5 bg-rojo" style={{ left: pos(s.alarma) }} title={`Alarma: ${s.alarma}`} />
      </div>
    </div>
  );
}

export const ESTADO_EQ: Record<string, { texto: string; tono: "ok" | "peligro" | "neutro" | "aviso" }> = {
  operando: { texto: "Operando", tono: "ok" }, alarma: { texto: "Con alarma", tono: "peligro" }, detenido: { texto: "Detenido", tono: "neutro" }, en_mantencion: { texto: "En mantención", tono: "aviso" },
};
