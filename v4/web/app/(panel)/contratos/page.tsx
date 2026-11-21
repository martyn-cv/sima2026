"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { clp, fecha, type ContratoFila } from "@sima/cliente";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { DialogoContrato, type ContratoBase } from "@/components/DialogoContrato";
import { Boton, Chip, Encabezado, ErrorCarga, Estado, Seccion, Seleccion, Tabla, cx, type Columna } from "@/components/ui";

export default function Contratos() {
  const router = useRouter();
  const { puede } = useAuth();
  const [estado, setEstado] = useState("");
  const [tipo, setTipo] = useState("");
  const [soloActuales, setSoloActuales] = useState(true);
  const [renovar, setRenovar] = useState<ContratoFila | null>(null);
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ["contratos"], queryFn: () => api.get<ContratoFila[]>("/api/contratos") });

  const lista = useMemo(() => data.filter((c) => (!soloActuales || c.esActual) && (!tipo || c.tipo === tipo)
    && (!estado || (estado === "POR VENCER" ? c.diasParaVencer != null && c.diasParaVencer >= 0 && c.diasParaVencer <= 60 : c.estado === estado))), [data, estado, tipo, soloActuales]);
  const porVencer = data.filter((c) => c.diasParaVencer != null && c.diasParaVencer >= 0 && c.diasParaVencer <= 60).length;
  const vencidos = data.filter((c) => c.estado === "VENCIDO").length;

  const columnas: Columna<ContratoFila>[] = [
    { clave: "trabajador", titulo: "Persona", valor: (c) => c.trabajador, render: (c) => <div><p className="font-medium">{c.trabajador}</p><p className="max-w-[280px] truncate text-[13px] text-gris">{c.cargo}</p></div> },
    { clave: "tipo", titulo: "Tipo", valor: (c) => c.tipo, render: (c) => <div><p>{c.tipo}</p><p className="text-[13px] text-gris">{c.codigo}</p></div> },
    { clave: "inicio", titulo: "Inicio", valor: (c) => c.fechaInicio, render: (c) => <span className="num">{fecha(c.fechaInicio)}</span> },
    { clave: "termino", titulo: "Término", valor: (c) => c.fechaTermino ?? "9999", render: (c) => c.fechaTermino ? <div><span className="num">{fecha(c.fechaTermino)}</span>{c.diasParaVencer != null && <p className={cx("text-[13px]", c.diasParaVencer <= 30 ? "font-medium text-rojo" : "text-gris")}>{c.diasParaVencer === 0 ? "vence hoy" : `en ${c.diasParaVencer} días`}</p>}</div> : <span className="text-gris">Sin término</span> },
    { clave: "sueldo", titulo: "Sueldo base", alinear: "derecha", valor: (c) => c.sueldoBase, render: (c) => clp(c.sueldoBase) },
    { clave: "estado", titulo: "Estado", valor: (c) => c.estado, render: (c) => <Estado v={c.estado} /> },
    { clave: "acc", titulo: "", render: (c) => puede("contratos", "editar") && c.esActual && c.estado !== "TERMINADO" ? <Boton tam="s" variante="contorno" onClick={(e) => { e.stopPropagation(); setRenovar(c); }}>Renovar</Boton> : null },
  ];

  return (
    <>
      <Encabezado titulo="Contratos" descripcion="Un contrato vencido sin renovar suspende la cuenta de la persona en la web y en la app." />
      <div className="mb-5 grid gap-5 sm:grid-cols-3">
        {[["Vencen en 60 días", porVencer, "text-ambar", "POR VENCER"], ["Vencidos sin renovar", vencidos, "text-rojo", "VENCIDO"], ["Contratos actuales", data.filter((c) => c.esActual && c.estado === "VIGENTE").length, "", "VIGENTE"]].map(([t, n, c, e]) => (
          <button key={t as string} onClick={() => setEstado(estado === e ? "" : (e as string))} className={cx("cursor-pointer border-t-[3px] bg-papel p-5 text-left transition-colors", estado === e ? "border-rojo" : "border-negro hover:bg-chapa/50")}>
            <p className={cx("display text-[52px] font-bold leading-none", c as string)}>{n as number}</p><p className="text-[14px] text-gris">{t as string}</p>
          </button>
        ))}
      </div>
      {error ? <ErrorCarga error={error} reintentar={() => void refetch()} /> : (
        <Seccion>
          <div className="flex flex-wrap items-center gap-3 border-b border-linea-suave p-4">
            <Seleccion className="w-[170px]" value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado"><option value="">Todo estado</option><option value="VIGENTE">Vigente</option><option value="POR VENCER">Por vencer</option><option value="VENCIDO">Vencido</option><option value="TERMINADO">Terminado</option><option value="HISTÓRICO">Histórico</option></Seleccion>
            <Seleccion className="w-[160px]" value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo"><option value="">Todo tipo</option><option>Indefinido</option><option>Plazo fijo</option><option>Honorarios</option></Seleccion>
            <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" className="size-4 accent-[var(--s-acento)]" checked={soloActuales} onChange={(e) => setSoloActuales(e.target.checked)} />Solo el contrato actual de cada persona</label>
            <Chip punto={false} className="ml-auto">{lista.length} contratos</Chip>
          </div>
          <Tabla columnas={columnas} filas={lista} clave={(c) => c.id} cargando={isLoading} alHacerClic={(c) => router.push(`/trabajadores/${c.trabajadorId}`)} maxAlto="calc(100dvh - 440px)" />
        </Seccion>
      )}
      {renovar && <DialogoContrato abierto onCerrar={() => setRenovar(null)} trabajadorId={renovar.trabajadorId} nombre={renovar.trabajador} base={{ tipo: renovar.tipo, fechaInicio: renovar.fechaInicio, sueldoBase: renovar.sueldoBase, colacion: renovar.colacion, movilizacion: renovar.movilizacion } satisfies ContratoBase} />}
    </>
  );
}
