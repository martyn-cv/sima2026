"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Download, FileClock, FileWarning, History, Lock, ShieldCheck, UserRound, Users } from "lucide-react";
import { clp, fecha, type ContratoFila } from "@sima/cliente";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { DialogoContrato, type ContratoBase } from "@/components/DialogoContrato";
import { DialogoDesvincular } from "@/components/DialogoDesvincular";
import { Boton, Cajon, Chip, Encabezado, ErrorCarga, Estado, Seccion, Seleccion, Tabla, cx, type Columna } from "@/components/ui";

type Filtro = "" | "VIGENTE" | "VENCE30" | "VENCE60" | "VENCIDO" | "TERMINADO";
const TONO_CUENTA: Record<string, "ok" | "aviso" | "peligro" | "neutro"> = { ACTIVA: "ok", SUSPENDIDA: "aviso", CERRADA: "peligro" };

/** Contratos: lo que vence, lo vencido por regularizar y el historial de cada persona, sin mostrar sueldos a quien no corresponde. */
export default function Contratos() {
  const router = useRouter();
  const { puede } = useAuth();
  const edita = puede("contratos", "editar");
  const [filtro, setFiltro] = useState<Filtro>("");
  const [tipo, setTipo] = useState("");
  const [familia, setFamilia] = useState("");
  const [historial, setHistorial] = useState(false);
  const [ficha, setFicha] = useState<ContratoFila | null>(null);
  const [nuevo, setNuevo] = useState<{ c: ContratoFila; tipo?: string } | null>(null);
  const [desvincular, setDesvincular] = useState<ContratoFila | null>(null);
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ["contratos"], queryFn: () => api.get<ContratoFila[]>("/api/contratos") });

  const actuales = useMemo(() => data.filter((c) => c.esActual), [data]);
  const veSueldos = data.some((c) => c.sueldoBase != null);
  const familias = useMemo(() => [...new Set(data.map((c) => c.familia).filter(Boolean) as string[])].sort(), [data]);
  const cumple = (c: ContratoFila, f: Filtro) => {
    const d = c.diasParaVencer;
    switch (f) {
      case "VIGENTE": return c.estado === "VIGENTE";
      case "VENCE30": return c.estado === "VIGENTE" && d != null && d >= 0 && d <= 30;
      case "VENCE60": return c.estado === "VIGENTE" && d != null && d > 30 && d <= 60;
      case "VENCIDO": return c.estado === "VENCIDO";
      case "TERMINADO": return c.estado === "TERMINADO";
      default: return true;
    }
  };
  const n = (f: Filtro) => actuales.filter((c) => cumple(c, f)).length;
  const lista = useMemo(() => (historial ? data : actuales).filter((c) => cumple(c, filtro) && (!tipo || c.tipo === tipo) && (!familia || c.familia === familia)), [data, actuales, historial, filtro, tipo, familia]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportar = () => {
    const cab = ["Código", "Persona", "Cargo", "Tipo", "Inicio", "Término", "Días para vencer", "Estado", "Cuenta", ...(veSueldos ? ["Sueldo base"] : [])];
    const filas = lista.map((c) => [c.codigo, c.trabajador, c.cargo, c.tipo, c.fechaInicio, c.fechaTermino ?? "", c.diasParaVencer ?? "", c.estado, c.cuenta ?? "", ...(veSueldos ? [c.sueldoBase ?? ""] : [])]);
    const csv = [cab, ...filas].map((f) => f.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })); a.download = `contratos-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  const columnas: Columna<ContratoFila>[] = [
    { clave: "trabajador", titulo: "Persona", fija: true, valor: (c) => c.trabajador, render: (c) => <div className="min-w-0"><p className="truncate font-medium" title={c.trabajador}>{c.trabajador}</p><p className="max-w-[260px] truncate text-[12.5px] text-gris" title={c.cargo}>{c.cargo}</p></div> },
    { clave: "tipo", titulo: "Contrato", valor: (c) => c.tipo, render: (c) => <div><p>{c.tipo}</p><p className="num text-[12px] text-gris">{c.codigo}</p></div> },
    { clave: "familia", titulo: "Área", oculta: true, valor: (c) => c.familia ?? "", render: (c) => <span className="text-[13px]">{c.familia}</span> },
    { clave: "inicio", titulo: "Inicio", valor: (c) => c.fechaInicio, render: (c) => <span className="num">{fecha(c.fechaInicio)}</span> },
    { clave: "termino", titulo: "Término", valor: (c) => c.fechaTermino ?? "9999", render: (c) => c.fechaTermino ? <div><span className="num">{fecha(c.fechaTermino)}</span>{c.diasParaVencer != null && <p className={cx("text-[12px]", c.diasParaVencer < 0 ? "font-medium text-rojo" : c.diasParaVencer <= 30 ? "font-medium text-ambar-hondo" : "text-gris")}>{c.diasParaVencer < 0 ? `venció hace ${-c.diasParaVencer} d` : c.diasParaVencer === 0 ? "vence hoy" : `en ${c.diasParaVencer} días`}</p>}</div> : <span className="text-gris">Indefinido</span> },
    ...(veSueldos ? [{ clave: "sueldo", titulo: "Sueldo base", alinear: "derecha" as const, valor: (c: ContratoFila) => c.sueldoBase ?? 0, render: (c: ContratoFila) => c.sueldoBase != null ? <span className="num">{clp(c.sueldoBase)}</span> : <Lock className="inline size-3.5 text-gris" aria-label="Reservado" /> }] : []),
    { clave: "estado", titulo: "Estado", valor: (c) => c.estado, render: (c) => <div className="flex flex-col items-start gap-1"><Estado v={c.estado} />{c.enGracia && <span className="text-[11.5px] text-ambar-hondo">en período de gracia</span>}</div> },
    { clave: "cuenta", titulo: "Cuenta SIMA", valor: (c) => c.cuenta ?? "", render: (c) => c.cuenta ? <Chip tono={TONO_CUENTA[c.cuenta] ?? "neutro"}>{c.cuenta.toLowerCase()}</Chip> : <span className="text-[12px] text-gris">histórico</span> },
    { clave: "acc", titulo: "", render: (c) => edita && c.esActual && c.estado !== "TERMINADO" ? (
      <Boton tam="s" variante={c.estado === "VENCIDO" ? "rojo" : "contorno"} onClick={(e) => { e.stopPropagation(); setFicha(c); }}>{c.estado === "VENCIDO" ? "Regularizar" : "Gestionar"}</Boton>
    ) : null },
  ];

  const KPIS: [Filtro, string, number, string, typeof Users][] = [
    ["VIGENTE", "Vigentes", n("VIGENTE"), "var(--s-verde)", ShieldCheck], ["VENCE30", "Vencen en 30 días", n("VENCE30"), "var(--s-ambar)", CalendarClock], ["VENCE60", "Vencen en 31 a 60 días", n("VENCE60"), "var(--s-azul)", FileClock],
    ["VENCIDO", "Vencidos por regularizar", n("VENCIDO"), "var(--s-rojo)", FileWarning], ["TERMINADO", "Terminados", n("TERMINADO"), "var(--s-tenue)", Users],
  ];

  return (
    <>
      <Encabezado titulo="Contratos" descripcion={<>Un contrato vencido <b>suspende</b> la cuenta de SIMA, pero no la cierra: no equivale a una desvinculación. RRHH lo regulariza renovando, pasando a indefinido o registrando el término.</>} />
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5" role="group" aria-label="Filtrar por situación">
        {KPIS.map(([k, t, v, c, I]) => (
          <button key={k} onClick={() => setFiltro(filtro === k ? "" : k)} aria-pressed={filtro === k}
            className={cx("relative cursor-pointer overflow-hidden rounded-md border bg-papel px-3.5 py-2.5 text-left transition-colors duration-150", filtro === k ? "border-acento bg-acento-claro/40" : "border-linea-suave hover:border-linea")}>
            <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: c }} />
            <p className="flex items-center gap-1.5 text-[12px] text-gris"><I className="size-3.5" />{t}</p>
            <p className="num mt-0.5 text-[24px] font-semibold leading-tight">{isLoading ? "—" : v}</p>
          </button>
        ))}
      </div>
      <p className="mb-2 text-[12.5px] text-gris">{actuales.length} personas con contrato actual · los contadores consideran solo el contrato actual de cada persona{filtro ? " · haga clic de nuevo en el indicador para quitar el filtro" : ""}.</p>
      {error ? <ErrorCarga error={error} reintentar={() => void refetch()} /> : (
        <Seccion>
          <Tabla columnas={columnas} filas={lista} clave={(c) => c.id} cargando={isLoading} alHacerClic={setFicha} porPagina={25} densa maxAlto="calc(100dvh - 360px)"
            buscar={(c) => `${c.trabajador} ${c.cargo} ${c.codigo} ${c.tipo}`}
            barra={<>
              <Seleccion className="h-8 w-auto min-w-[140px] text-[13px]" value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo de contrato"><option value="">Todo tipo</option><option>Indefinido</option><option>Plazo fijo</option><option>Honorarios</option></Seleccion>
              <Seleccion className="h-8 w-auto min-w-[160px] max-w-[240px] text-[13px]" value={familia} onChange={(e) => setFamilia(e.target.value)} aria-label="Área"><option value="">Todas las áreas</option>{familias.map((f) => <option key={f}>{f}</option>)}</Seleccion>
              <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" className="size-4 accent-[var(--s-acento)]" checked={historial} onChange={(e) => setHistorial(e.target.checked)} />Incluir contratos anteriores</label>
              <Boton tam="s" variante="contorno" className="ml-auto" onClick={exportar} disabled={lista.length === 0}><Download className="size-3.5" />Exportar CSV</Boton>
            </>} />
        </Seccion>
      )}
      <FichaContrato c={ficha} todos={data} edita={edita} onCerrar={() => setFicha(null)}
        alRenovar={(c, t) => { setFicha(null); setNuevo({ c, tipo: t }); }} alDesvincular={(c) => { setFicha(null); setDesvincular(c); }} alAbrirPersona={(id) => router.push(`/trabajadores/ficha?id=${id}`)} />
      {nuevo && <DialogoContrato abierto onCerrar={() => setNuevo(null)} trabajadorId={nuevo.c.trabajadorId} nombre={nuevo.c.trabajador}
        base={{ tipo: nuevo.tipo ?? nuevo.c.tipo, fechaInicio: nuevo.c.fechaInicio, sueldoBase: nuevo.c.sueldoBase ?? 0, colacion: nuevo.c.colacion ?? 0, movilizacion: nuevo.c.movilizacion ?? 0 } satisfies ContratoBase} />}
      {desvincular && <DialogoDesvincular abierto onCerrar={() => setDesvincular(null)} persona={{ id: desvincular.trabajadorId, nombre: desvincular.trabajador, cargo: desvincular.cargo, estadoCuenta: desvincular.cuenta ?? "" }} />}
    </>
  );
}

function FichaContrato({ c, todos, edita, onCerrar, alRenovar, alDesvincular, alAbrirPersona }: {
  c: ContratoFila | null; todos: ContratoFila[]; edita: boolean; onCerrar: () => void; alRenovar: (c: ContratoFila, tipo?: string) => void; alDesvincular: (c: ContratoFila) => void; alAbrirPersona: (id: string) => void;
}) {
  const hist = c ? todos.filter((x) => x.trabajadorId === c.trabajadorId).sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio)) : [];
  const actual = hist.find((x) => x.esActual) ?? c;
  return (
    <Cajon abierto={!!c} onCerrar={onCerrar} titulo={c?.trabajador ?? ""} ancho={520}>
      {c && actual && (
        <div className="grid gap-4 text-[13.5px]">
          <div className="flex flex-wrap items-center gap-2"><UserRound className="size-4 text-gris" /><span className="text-gris">{c.cargo}</span>{actual.cuenta && <Chip tono={TONO_CUENTA[actual.cuenta] ?? "neutro"}>cuenta {actual.cuenta.toLowerCase()}</Chip>}</div>
          {actual.estado === "VENCIDO" && (
            <div className="rounded-md border border-ambar/50 bg-ambar-claro p-3 text-[13px]">
              <p className="font-semibold">Contrato vencido el {actual.fechaTermino ? fecha(actual.fechaTermino) : ""}: por regularizar</p>
              <p className="mt-1 text-carbon">La cuenta quedó {actual.enGracia ? "activa por el período de gracia" : "suspendida"}, no cerrada. Si la persona siguió trabajando después del vencimiento, corresponde evaluar el paso a contrato indefinido. Si no continúa, registre el término.</p>
              {edita && <div className="mt-2.5 flex flex-wrap gap-2"><Boton tam="s" variante="rojo" onClick={() => alRenovar(actual, "Plazo fijo")}>Renovar a plazo fijo</Boton><Boton tam="s" variante="contorno" onClick={() => alRenovar(actual, "Indefinido")}>Pasar a indefinido</Boton><Boton tam="s" variante="contorno" onClick={() => alDesvincular(actual)}>Registrar término</Boton></div>}
            </div>
          )}
          <section className="rounded-md border border-linea-suave">
            <p className="border-b border-linea-suave px-3 py-2 text-[12px] font-semibold uppercase tracking-wide text-gris">Contrato actual</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 text-[13px]">
              <Dato t="Código" v={<span className="num">{actual.codigo}</span>} /><Dato t="Tipo" v={actual.tipo} />
              <Dato t="Inicio" v={fecha(actual.fechaInicio)} /><Dato t="Término" v={actual.fechaTermino ? fecha(actual.fechaTermino) : "Indefinido"} />
              <Dato t="Jornada" v={actual.jornadaHoras ? `${actual.jornadaHoras} h semanales` : "—"} /><Dato t="Estado" v={<Estado v={actual.estado} />} />
              {actual.sueldoBase != null ? <><Dato t="Sueldo base" v={<span className="num">{clp(actual.sueldoBase)}</span>} /><Dato t="Colación + movilización" v={<span className="num">{clp((actual.colacion ?? 0) + (actual.movilizacion ?? 0))}</span>} /></>
                : <p className="col-span-2 flex items-center gap-1.5 text-[12.5px] text-gris"><Lock className="size-3.5" />Las remuneraciones solo las ven los cargos autorizados.</p>}
              {actual.observaciones && <p className="col-span-2 text-[12.5px] text-gris">{actual.observaciones}</p>}
            </dl>
          </section>
          {edita && actual.estado === "VIGENTE" && <div className="flex flex-wrap gap-2"><Boton variante="contorno" onClick={() => alRenovar(actual)}>Registrar contrato nuevo (renovación o cambio)</Boton></div>}
          <section>
            <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-gris"><History className="size-3.5" />Historial ({hist.length})</p>
            <ol className="relative grid gap-2 border-l border-linea-suave pl-4">
              {hist.map((h) => (
                <li key={h.id} className="relative text-[13px]">
                  <span className={cx("absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-papel", h.esActual ? "bg-acento" : "bg-linea")} />
                  <p className="flex flex-wrap items-center gap-2"><span className="num font-medium">{h.codigo}</span><span>{h.tipo}</span><Estado v={h.estado} /></p>
                  <p className="text-[12.5px] text-gris">{fecha(h.fechaInicio)} – {h.fechaTermino ? fecha(h.fechaTermino) : "indefinido"}{h.sueldoBase != null ? ` · ${clp(h.sueldoBase)}` : ""}</p>
                </li>
              ))}
            </ol>
          </section>
          <Boton variante="texto" onClick={() => alAbrirPersona(c.trabajadorId)}>Abrir la ficha completa de la persona</Boton>
        </div>
      )}
    </Cajon>
  );
}

function Dato({ t, v }: { t: string; v: React.ReactNode }) {
  return <div><dt className="text-[11.5px] text-gris">{t}</dt><dd>{v}</dd></div>;
}
