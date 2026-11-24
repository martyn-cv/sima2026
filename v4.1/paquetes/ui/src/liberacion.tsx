import { useEffect, useState } from "react";
import { BadgeCheck, Check, CheckCircle2, HardHat, ShieldCheck, Undo2, UserCheck, Wrench, XCircle, type LucideIcon } from "lucide-react";
import type { LiberacionOt } from "@sima/cliente";
import { AreaTexto, Boton, cx } from "./ui";

/** Etapas de la liberación de un equipo después de una intervención, con quién la firma. */
export const ETAPAS_LIBERACION: Record<string, { t: string; quien: string; i: LucideIcon; capacidad: string }> = {
  tecnica: { t: "Liberación técnica", quien: "Supervisión o jefatura de mantenimiento (o responsable de turno habilitado)", i: Wrench, capacidad: "equipos.liberar_tecnica" },
  seguridad: { t: "Validación de seguridad", quien: "Prevención de riesgos", i: HardHat, capacidad: "equipos.liberar_seguridad" },
  calidad: { t: "Validación de calidad", quien: "Jefatura o ingeniería de calidad", i: ShieldCheck, capacidad: "equipos.liberar_calidad" },
  produccion: { t: "Confirmación de producción", quien: "Supervisión de turno o jefatura de producción", i: UserCheck, capacidad: "equipos.confirmar_produccion" },
};
const fechaHora = (iso: string) => new Date(iso).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const hace = (iso: string) => { const m = Math.round((Date.now() - +new Date(iso)) / 60000); return m < 60 ? `hace ${Math.max(1, m)} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`; };
const TEXTO_FIRMA: Record<string, (equipo: string) => string> = {
  tecnica: () => "Revise que el trabajo quedó bien, que las pruebas son conformes, que se retiraron los bloqueos y que el área está despejada.",
  seguridad: () => "Verifique protecciones, resguardos y paradas de emergencia, y que no queden energías peligrosas.",
  calidad: () => "Verifique que el proceso queda dentro de especificación (primera pieza o control de calidad).",
  produccion: (eq) => `Confirme que ${eq} puede volver a producir. Al aprobar queda «liberado para producción»; la marcha la da operación o el PLC, no este botón.`,
};

/**
 * Liberación por etapas de una orden de trabajo: estado de cada firma (quién, cargo, plataforma y fecha), la firma que le
 * toca a la persona (si le toca), las pruebas y los rechazos anteriores. El servidor valida cada firma: separación de
 * funciones (quien ejecutó o probó no firma), una persona por etapa y producción al final.
 */
export function LiberacionOrden({ estado, equipo, asignado, cierreSolicitado, verificadaEn, lib, participo, puedeFirmar, nombreUsuario, firmando, onFirmar }: {
  estado: string; equipo: string; asignado?: string | null; cierreSolicitado?: string | null; verificadaEn?: string | null; lib?: LiberacionOt;
  participo: boolean; puedeFirmar: (tipo: string) => boolean; nombreUsuario?: string; firmando?: boolean; onFirmar: (tipo: string, aprobar: boolean, nota: string) => void;
}) {
  const [nota, setNota] = useState("");
  const requeridas = lib?.requeridas ?? ["tecnica", "produccion"];
  const pendientes = lib?.pendientes ?? [];
  const firmadas = lib?.firmas.length ?? 0;
  useEffect(() => setNota(""), [firmadas, lib?.ronda]);
  // la etapa que esta persona podría firmar ahora (producción va al final; las demás, en cualquier orden)
  const mia = estado === "por_verificar" && !participo ? pendientes.find((p) => puedeFirmar(p) && (p !== "produccion" || pendientes.length === 1)) : undefined;
  const yaFirmo = !!nombreUsuario && !!lib?.firmas.some((f) => f.porNombre === nombreUsuario);
  return (
    <div className="grid gap-4">
      {estado === "cerrada"
        ? <p className="flex items-center gap-2 rounded-md border border-verde/30 bg-verde-claro px-3.5 py-3 text-[13px] text-verde"><BadgeCheck className="size-4" />Orden cerrada: {equipo} quedó liberado para producción{verificadaEn ? ` ${hace(verificadaEn)}` : ""}.</p>
        : estado === "por_verificar" ? <p className="rounded-md border border-ambar/30 bg-ambar-claro px-3.5 py-3 text-[13px] text-ambar-hondo"><b>Pendiente de liberación.</b> {asignado ?? "El técnico"} terminó{cierreSolicitado ? ` ${hace(cierreSolicitado)}` : ""} y retiró su bloqueo. {equipo} no se pone en marcha hasta completar las firmas.</p> : null}

      <section aria-label="Etapas de la liberación" className="rounded-md border border-linea-suave bg-papel">
        <header className="flex items-center gap-2 border-b border-linea-suave px-3.5 py-2.5"><p className="t-seccion flex-1">Liberación del equipo</p>{lib && lib.ronda > 1 && <span className="text-[11.5px] text-gris">ronda {lib.ronda}</span>}</header>
        <ol className="divide-y divide-linea-suave">
          {requeridas.map((r) => {
            const f = lib?.firmas.find((x) => x.tipo === r);
            const E = ETAPAS_LIBERACION[r];
            const esMia = mia === r;
            return (
              <li key={r} className={cx("flex gap-3 px-3.5 py-3", esMia && "bg-acento-claro")}>
                <span className={cx("mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border", f ? "border-verde bg-verde-claro text-verde" : esMia ? "border-acento text-acento" : "border-linea text-gris")}>{f ? <Check className="size-3.5" /> : <E.i className="size-3.5" />}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold">{E.t}</p>
                  {f ? <p className="text-[12px] text-gris"><b className="font-medium text-carbon">{f.porNombre}</b> · {f.porCargo} · {f.plataforma === "app" ? "SIMA Desktop" : "SIMA Web"} · {fechaHora(f.fecha)}{f.nota && <span className="block text-carbon">«{f.nota}»</span>}</p>
                    : <p className="text-[12px] text-gris">{esMia ? "Le corresponde firmar a usted." : `Pendiente · ${E.quien}`}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {mia && (
        <section className="rounded-md border border-acento/40 bg-papel p-4">
          <p className="t-seccion">{ETAPAS_LIBERACION[mia].t}</p>
          <p className="mb-3 mt-1 text-[12.5px] text-gris">{TEXTO_FIRMA[mia](equipo)}</p>
          <AreaTexto value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Observación (obligatoria si rechaza: qué falta)" className="min-h-20" aria-label="Observación" />
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Boton variante="contorno" disabled={firmando || nota.trim().length < 4} onClick={() => onFirmar(mia, false, nota.trim())}><Undo2 className="size-4" />Rechazar y devolver al técnico</Boton>
            <Boton variante="acento" cargando={firmando} onClick={() => onFirmar(mia, true, nota.trim())}><BadgeCheck className="size-4" />{mia === "produccion" ? "Confirmar y liberar para producción" : `Firmar ${ETAPAS_LIBERACION[mia].t.toLowerCase()}`}</Boton>
          </div>
        </section>
      )}
      {estado === "por_verificar" && participo && <p className="text-[12.5px] text-gris">Usted ejecutó esta orden: la liberan otras personas. Recibirá un aviso con cada firma o rechazo.</p>}
      {estado === "por_verificar" && !participo && !mia && pendientes.length > 0 && <p className="text-[12.5px] text-gris">{yaFirmo ? "Usted ya firmó una etapa: cada etapa la firma una persona distinta." : "Su cargo no firma la etapa pendiente."} Falta: {pendientes.map((p) => ETAPAS_LIBERACION[p].t.toLowerCase()).join(", ")}.</p>}

      {(lib?.pruebas.length ?? 0) > 0 && (
        <section className="rounded-md border border-linea-suave bg-papel">
          <p className="t-etiqueta px-3.5 pb-1 pt-3">Pruebas registradas</p>
          <ul className="divide-y divide-linea-suave">{lib!.pruebas.map((p) => <li key={p.id} className="flex items-center gap-3 px-3.5 py-2 text-[12.5px]">{p.resultado === "conforme" ? <CheckCircle2 className="size-4 shrink-0 text-verde" aria-label="Conforme" /> : <XCircle className="size-4 shrink-0 text-rojo" aria-label="No conforme" />}<span className="min-w-0 flex-1">{p.descripcion}{p.valores && <span className="t-dato ml-2 text-gris">{p.valores}</span>}</span><span className="text-gris">{p.registradaPor} · {fechaHora(p.fecha)}</span></li>)}</ul>
        </section>
      )}
      {(lib?.rechazos.length ?? 0) > 0 && (
        <section className="rounded-md border border-rojo/30 bg-papel">
          <p className="t-etiqueta px-3.5 pb-1 pt-3">Rechazos anteriores</p>
          <ul className="divide-y divide-linea-suave">{lib!.rechazos.map((r, i) => <li key={i} className="px-3.5 py-2 text-[12.5px]"><b>{r.titulo}</b> · {r.porNombre} ({r.porCargo}) · ronda {r.ronda} · {fechaHora(r.fecha)}<span className="block text-carbon">«{r.nota}»</span></li>)}</ul>
        </section>
      )}
    </div>
  );
}
