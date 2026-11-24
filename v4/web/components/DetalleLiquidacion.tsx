"use client";
import { clp, periodoLegible, type Liquidacion } from "@sima/cliente";
import { cx } from "./ui";

function Fila({ t, v, fuerte, negativo }: { t: string; v: number; fuerte?: boolean; negativo?: boolean }) {
  if (!fuerte && v === 0) return null;
  return (
    <div className={cx("flex items-baseline justify-between gap-4 py-1.5", fuerte && "border-t border-negro pt-2.5 font-semibold")}>
      <span className={cx(!fuerte && "text-gris")}>{t}</span>
      <span className={cx("num", negativo && "text-rojo-hondo")}>{negativo && v > 0 ? "−" : ""}{clp(v)}</span>
    </div>
  );
}

/** Liquidación de sueldo desglosada: haberes imponibles, no imponibles y descuentos legales. */
export function DetalleLiquidacion({ l, conceptos }: { l: Liquidacion; conceptos?: { concepto: string; tipo?: string; monto: number }[] }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-gris">{periodoLegible(l.periodo)} · {l.tipoContrato || "sin contrato"} · {l.diasTrabajados} días trabajados</p>
        <p className="mt-1 text-[13px] text-gris">{l.cargo}</p>
        <p className="num display mt-3 text-[52px] font-bold leading-none">{clp(l.liquidoAPagar)}</p>
        <p className="text-[13px] text-gris">líquido a pagar ({l.estadoPago.toLowerCase()})</p>
      </div>
      <div>
        <h3 className="display text-xl font-semibold">Haberes</h3>
        <Fila t="Sueldo base proporcional" v={l.sueldoProporcional} />
        <Fila t="Gratificación legal" v={l.gratificacion} />
        <Fila t={`Horas extra (${l.horasExtraN} h)`} v={l.horasExtraMonto} />
        <Fila t="Bonos imponibles" v={l.bonosImponibles} />
        <Fila t="Total imponible" v={l.totalImponible} fuerte />
        <Fila t="Colación y movilización" v={l.noImponibles} />
        <Fila t="Total haberes" v={l.totalHaberes} fuerte />
      </div>
      <div>
        <h3 className="display text-xl font-semibold">Descuentos</h3>
        <Fila t="AFP (10 % más comisión)" v={l.descuentoAfp} negativo />
        <Fila t="Salud (7 %)" v={l.descuentoSalud} negativo />
        <Fila t="Seguro de cesantía" v={l.seguroCesantia} negativo />
        <Fila t="Impuesto único" v={l.impuestoUnico} negativo />
        <Fila t="Retención de honorarios" v={l.retencionHonorarios} negativo />
        <Fila t="Otros descuentos" v={l.otrosDescuentos} negativo />
        <Fila t="Total descuentos" v={l.totalDescuentos} fuerte negativo />
      </div>
      {conceptos && conceptos.length > 0 && (
        <div>
          <h3 className="display text-xl font-semibold">Conceptos del mes</h3>
          <ul className="divide-y divide-linea-suave">
            {conceptos.map((c, i) => <li key={i} className="flex justify-between gap-4 py-1.5"><span>{c.concepto}</span><span className="num text-gris">{c.tipo === "Descuento" ? "−" : "+"}{clp(c.monto)}</span></li>)}
          </ul>
        </div>
      )}
      <p className="border-l-[3px] border-ambar bg-ambar-claro px-3 py-2 text-[13px]">Cálculo de referencia para pruebas. Un contador debe validar los parámetros legales antes de pagar.</p>
    </div>
  );
}
