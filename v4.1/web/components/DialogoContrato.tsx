"use client";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { TIPOS_CONTRATO } from "@/lib/listas";
import { AreaTexto, Boton, Campo, Dialogo, Entrada, Seleccion, mensajeDe, useAviso } from "./ui";

export interface ContratoBase { id?: number; tipo: string; fechaInicio: string; fechaTermino?: string | null; sueldoBase: number; colacion: number; movilizacion: number; observaciones?: string }

/** Contrato nuevo (renovación o cambio de condiciones) o corrección de uno existente. */
export function DialogoContrato({ abierto, onCerrar, trabajadorId, nombre, base }: { abierto: boolean; onCerrar: () => void; trabajadorId: string; nombre: string; base?: ContratoBase | null }) {
  const editar = base?.id != null;
  const hoy = new Date().toISOString().slice(0, 10);
  const inicial = () => ({ tipo: base?.tipo ?? "Indefinido", inicio: editar ? base!.fechaInicio : hoy, termino: base?.fechaTermino && editar ? base.fechaTermino : "", sueldo: String(base?.sueldoBase ?? ""), colacion: String(base?.colacion ?? 0), movil: String(base?.movilizacion ?? 0), obs: editar ? base?.observaciones ?? "" : "" });
  const [f, setF] = useState(inicial);
  const qc = useQueryClient();
  const aviso = useAviso();
  useEffect(() => { if (abierto) setF(inicial()); }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps
  const cuerpo = { tipo: f.tipo, fechaInicio: f.inicio, fechaTermino: f.termino || null, sueldoBase: Number(f.sueldo), colacion: Number(f.colacion || 0), movilizacion: Number(f.movil || 0), jornadaHoras: f.tipo === "Honorarios" ? null : 42, observaciones: f.obs || null };
  const m = useMutation({
    mutationFn: () => editar ? api.put(`/api/contratos/${base!.id}`, cuerpo) : api.post("/api/contratos", { ...cuerpo, trabajadorId }),
    onSuccess: () => {
      for (const k of ["trabajador", "trabajadores", "contratos", "cuentas", "panel", "auditoria"]) void qc.invalidateQueries({ queryKey: [k] });
      aviso(editar ? "Contrato actualizado." : "Contrato registrado. El anterior queda en el historial.");
      onCerrar();
    },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  return (
    <Dialogo abierto={abierto} onCerrar={onCerrar} titulo={editar ? "Corregir contrato" : "Nuevo contrato"} ancho={600}
      pie={<><Boton variante="contorno" onClick={onCerrar}>Cancelar</Boton><Boton variante="rojo" cargando={m.isPending} disabled={!f.sueldo || !f.inicio} onClick={() => m.mutate()}>{editar ? "Guardar cambios" : "Registrar contrato"}</Boton></>}>
      <p className="mb-4 text-gris">{nombre}{!editar && " · el contrato actual pasa al historial y este queda como el vigente."}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Tipo de contrato"><Seleccion value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>{TIPOS_CONTRATO.map((t) => <option key={t}>{t}</option>)}</Seleccion></Campo>
        <Campo etiqueta="Sueldo base (CLP)"><Entrada type="number" min={1} value={f.sueldo} onChange={(e) => setF({ ...f, sueldo: e.target.value })} /></Campo>
        <Campo etiqueta="Inicio"><Entrada type="date" value={f.inicio} onChange={(e) => setF({ ...f, inicio: e.target.value })} /></Campo>
        <Campo etiqueta="Término" ayuda={f.tipo === "Indefinido" ? "Vacío en un contrato indefinido." : undefined}><Entrada type="date" value={f.termino} onChange={(e) => setF({ ...f, termino: e.target.value })} /></Campo>
        <Campo etiqueta="Colación (CLP)"><Entrada type="number" min={0} value={f.colacion} disabled={f.tipo === "Honorarios"} onChange={(e) => setF({ ...f, colacion: e.target.value })} /></Campo>
        <Campo etiqueta="Movilización (CLP)"><Entrada type="number" min={0} value={f.movil} disabled={f.tipo === "Honorarios"} onChange={(e) => setF({ ...f, movil: e.target.value })} /></Campo>
        <Campo etiqueta="Observaciones" className="sm:col-span-2"><AreaTexto value={f.obs} onChange={(e) => setF({ ...f, obs: e.target.value })} /></Campo>
      </div>
    </Dialogo>
  );
}
