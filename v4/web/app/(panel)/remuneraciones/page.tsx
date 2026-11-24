"use client";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Download, Plus, Trash2 } from "lucide-react";
import { clp, num, periodoLegible, type Liquidacion } from "@sima/cliente";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { descargarCsv } from "@/lib/csv";
import { DetalleLiquidacion } from "@/components/DetalleLiquidacion";
import { Boton, Cajon, Campo, Chip, Cuenta, Dialogo, Encabezado, Entrada, ErrorCarga, Esqueleto, Pestanas, Seccion, Seleccion, Tabla, mensajeDe, useAviso, type Columna } from "@/components/ui";

interface Resp { resumen: { periodo: string; trabajadores: number; totalHaberes: number; totalImponible: number; totalDescuentos: number; totalLiquido: number; totalAfp: number; totalSalud: number; totalImpuesto: number; promedioLiquido: number; porFamilia: { familia: string; haberes: number; personas: number }[]; porTipo: { tipo: string; haberes: number; personas: number }[] }; liquidaciones: Liquidacion[] }
interface Concepto { id: number; periodo: string; trabajadorId: string; trabajador: string; concepto: string; tipo: string; monto: number; observacion: string }
interface Asist { id: number; trabajadorId: string; trabajador: string; cargo: string; diasProgramados: number; diasLicencia: number; diasPermisoSinGoce: number; horasExtra: number; diasTrabajados: number; ausentismo: number }

export default function Remuneraciones() {
  const { puede } = useAuth();
  const qc = useQueryClient();
  const aviso = useAviso();
  const [periodo, setPeriodo] = useState<string | null>(null);
  const [tab, setTab] = useState<"liquidaciones" | "conceptos" | "asistencia">("liquidaciones");
  const [detalle, setDetalle] = useState<Liquidacion | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [f, setF] = useState({ trabajadorId: "", concepto: "", monto: "", obs: "" });

  const periodos = useQuery({ queryKey: ["periodos"], queryFn: () => api.get<string[]>("/api/remuneraciones/periodos") });
  useEffect(() => { if (!periodo && periodos.data?.length) setPeriodo(periodos.data[0]); }, [periodos.data, periodo]);
  const rem = useQuery({ queryKey: ["remuneraciones", periodo], enabled: !!periodo, queryFn: () => api.get<Resp>(`/api/remuneraciones?periodo=${periodo}`) });
  const conceptos = useQuery({ queryKey: ["conceptos", periodo], enabled: !!periodo && tab === "conceptos" && puede("conceptos"), queryFn: () => api.get<{ catalogo: { concepto: string; tipo: string }[]; items: Concepto[] }>(`/api/conceptos?periodo=${periodo}`) });
  const asistencia = useQuery({ queryKey: ["asistencia", periodo], enabled: !!periodo && tab === "asistencia" && puede("asistencia"), queryFn: () => api.get<Asist[]>(`/api/asistencia?periodo=${periodo}`) });
  const detalleQ = useQuery({ queryKey: ["liq", periodo, detalle?.idTrabajador], enabled: !!detalle, queryFn: () => api.get<{ conceptos: { concepto: string; tipo?: string; monto: number }[] }>(`/api/remuneraciones/${periodo}/${detalle!.idTrabajador}`) });

  const agregar = useMutation({
    mutationFn: () => api.post("/api/conceptos", { periodo, trabajadorId: f.trabajadorId, concepto: f.concepto, monto: Number(f.monto), observacion: f.obs }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["conceptos"] }); void qc.invalidateQueries({ queryKey: ["remuneraciones"] }); void qc.invalidateQueries({ queryKey: ["auditoria"] }); setNuevo(false); setF({ trabajadorId: "", concepto: "", monto: "", obs: "" }); aviso("Concepto agregado. La liquidación se recalculó."); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  const quitar = useMutation({
    mutationFn: (id: number) => api.del(`/api/conceptos/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["conceptos"] }); void qc.invalidateQueries({ queryKey: ["remuneraciones"] }); aviso("Concepto eliminado."); }, onError: (e) => aviso(mensajeDe(e), "error"),
  });

  const columnas: Columna<Liquidacion>[] = useMemo(() => [
    { clave: "t", titulo: "Persona", valor: (l) => l.trabajador, render: (l) => <div><p className="font-medium">{l.trabajador}</p><p className="max-w-[250px] truncate text-[13px] text-gris">{l.cargo}</p></div> },
    { clave: "c", titulo: "Contrato", valor: (l) => l.tipoContrato, render: (l) => l.tipoContrato },
    { clave: "d", titulo: "Días", alinear: "derecha", valor: (l) => l.diasTrabajados, render: (l) => l.diasTrabajados },
    { clave: "h", titulo: "Haberes", alinear: "derecha", valor: (l) => l.totalHaberes, render: (l) => clp(l.totalHaberes) },
    { clave: "x", titulo: "Descuentos", alinear: "derecha", valor: (l) => l.totalDescuentos, render: (l) => <span className="text-rojo-hondo">{clp(l.totalDescuentos)}</span> },
    { clave: "l", titulo: "Líquido", alinear: "derecha", valor: (l) => l.liquidoAPagar, render: (l) => <span className="font-semibold">{clp(l.liquidoAPagar)}</span> },
    { clave: "e", titulo: "Pago", valor: (l) => l.estadoPago, render: (l) => <Chip tono={l.estadoPago === "Pagada" ? "ok" : "aviso"}>{l.estadoPago}</Chip> },
  ], []);

  const r = rem.data?.resumen;
  const tipoSel = conceptos.data?.catalogo.find((c) => c.concepto === f.concepto)?.tipo;
  return (
    <>
      <Encabezado titulo="Remuneraciones" descripcion="Liquidaciones calculadas en el servidor con los contratos, la asistencia y los conceptos del mes. Al cambiar cualquiera, se recalculan."
        acciones={rem.data && <Boton variante="contorno" onClick={() => descargarCsv(`remuneraciones-${periodo}.csv`, ["ID", "Persona", "Cargo", "Contrato", "Días", "Haberes", "Descuentos", "Líquido", "Pago"], rem.data!.liquidaciones.map((l) => [l.idTrabajador, l.trabajador, l.cargo, l.tipoContrato, l.diasTrabajados, l.totalHaberes, l.totalDescuentos, l.liquidoAPagar, l.estadoPago]))}><Download className="size-4" />Exportar</Boton>} />
      <div className="mb-5 flex flex-wrap gap-2">
        {periodos.data?.map((p) => (
          <button key={p} onClick={() => setPeriodo(p)} className={`relative h-10 cursor-pointer px-4 font-medium transition-colors ${periodo === p ? "text-white" : "bg-papel hover:bg-chapa"}`}>
            {periodo === p && <motion.span layoutId="periodo" className="absolute inset-0 bg-negro" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
            <span className="relative capitalize">{periodoLegible(p)}</span>
          </button>
        ))}
      </div>
      {rem.error ? <ErrorCarga error={rem.error} reintentar={() => void rem.refetch()} /> : !r ? <Esqueleto className="h-48" /> : (
        <>
          <div className="mb-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <Seccion titulo={`Costo de ${periodoLegible(r.periodo)}`}>
              <div className="grid gap-5 p-5 sm:grid-cols-3">
                <div className="sm:col-span-2"><p className="text-[13px] text-gris">Total haberes de {r.trabajadores} personas</p><p className="display text-[56px] font-bold leading-none"><Cuenta valor={r.totalHaberes} formato={clp} duracion={1} /></p></div>
                <div><p className="text-[13px] text-gris">Líquido a pagar</p><p className="display text-[32px] font-semibold leading-none"><Cuenta valor={r.totalLiquido} formato={clp} duracion={1} /></p><p className="mt-1 text-[13px] text-gris">promedio {clp(r.promedioLiquido)}</p></div>
                <div><p className="text-[13px] text-gris">AFP</p><p className="num font-semibold">{clp(r.totalAfp)}</p></div>
                <div><p className="text-[13px] text-gris">Salud</p><p className="num font-semibold">{clp(r.totalSalud)}</p></div>
                <div><p className="text-[13px] text-gris">Impuesto único</p><p className="num font-semibold">{clp(r.totalImpuesto)}</p></div>
              </div>
            </Seccion>
            <Seccion titulo="Haberes por área"><ul className="space-y-2 p-5">
              {r.porFamilia.slice(0, 7).map((x) => (
                <li key={x.familia} className="text-[14px]"><div className="flex justify-between gap-3"><span className="truncate">{x.familia}</span><span className="num font-medium">{clp(x.haberes)}</span></div>
                  <span className="mt-1 block h-1.5 bg-chapa"><motion.span className="block h-full bg-rojo" initial={{ width: 0 }} animate={{ width: `${(x.haberes / r.porFamilia[0].haberes) * 100}%` }} transition={{ duration: 0.7 }} /></span></li>
              ))}
            </ul></Seccion>
          </div>
          <Pestanas id="rem" activa={tab} onCambio={setTab} items={[{ clave: "liquidaciones", titulo: "Liquidaciones", n: rem.data!.liquidaciones.length }, ...(puede("conceptos") ? [{ clave: "conceptos" as const, titulo: "Bonos y descuentos" }] : []), ...(puede("asistencia") ? [{ clave: "asistencia" as const, titulo: "Asistencia" }] : [])]} />
          <div className="mt-4">
            {tab === "liquidaciones" && <Seccion><Tabla columnas={columnas} filas={rem.data!.liquidaciones} clave={(l) => l.idTrabajador} alHacerClic={setDetalle} maxAlto="calc(100dvh - 260px)" /></Seccion>}
            {tab === "conceptos" && (
              <Seccion titulo="Conceptos variables del mes" derecha={puede("conceptos", "editar") && <Boton tam="s" variante="rojo" onClick={() => setNuevo(true)}><Plus className="size-4" />Agregar</Boton>}>
                <Tabla filas={conceptos.data?.items ?? []} clave={(c) => c.id} cargando={conceptos.isLoading} columnas={[
                  { clave: "t", titulo: "Persona", valor: (c) => c.trabajador, render: (c) => <span className="font-medium">{c.trabajador}</span> },
                  { clave: "c", titulo: "Concepto", valor: (c) => c.concepto, render: (c) => c.concepto },
                  { clave: "tp", titulo: "Tipo", render: (c) => <Chip tono={c.tipo === "Descuento" ? "peligro" : "ok"} punto={false}>{c.tipo === "Descuento" ? "Descuento" : "Haber imponible"}</Chip> },
                  { clave: "m", titulo: "Monto", alinear: "derecha", valor: (c) => c.monto, render: (c) => clp(c.monto) },
                  { clave: "o", titulo: "Observación", render: (c) => <span className="text-gris">{c.observacion}</span> },
                  { clave: "a", titulo: "", render: (c) => puede("conceptos", "editar") ? <button aria-label="Eliminar concepto" onClick={() => quitar.mutate(c.id)} className="grid size-8 cursor-pointer place-items-center text-gris hover:text-rojo"><Trash2 className="size-4" /></button> : null },
                ] satisfies Columna<Concepto>[]} />
              </Seccion>
            )}
            {tab === "asistencia" && (
              <Seccion><Tabla filas={asistencia.data ?? []} clave={(a) => a.id} cargando={asistencia.isLoading} maxAlto="calc(100dvh - 260px)" columnas={[
                { clave: "t", titulo: "Persona", valor: (a) => a.trabajador, render: (a) => <div><p className="font-medium">{a.trabajador}</p><p className="max-w-[260px] truncate text-[13px] text-gris">{a.cargo}</p></div> },
                { clave: "p", titulo: "Programados", alinear: "derecha", valor: (a) => a.diasProgramados, render: (a) => a.diasProgramados },
                { clave: "w", titulo: "Trabajados", alinear: "derecha", valor: (a) => a.diasTrabajados, render: (a) => a.diasTrabajados },
                { clave: "l", titulo: "Licencia", alinear: "derecha", valor: (a) => a.diasLicencia, render: (a) => a.diasLicencia || "—" },
                { clave: "s", titulo: "Permiso sin goce", alinear: "derecha", valor: (a) => a.diasPermisoSinGoce, render: (a) => a.diasPermisoSinGoce || "—" },
                { clave: "h", titulo: "Horas extra", alinear: "derecha", valor: (a) => a.horasExtra, render: (a) => a.horasExtra || "—" },
                { clave: "au", titulo: "Ausentismo", alinear: "derecha", valor: (a) => a.ausentismo, render: (a) => num(a.ausentismo * 100, 1) + " %" },
              ] satisfies Columna<Asist>[]} /></Seccion>
            )}
          </div>
        </>
      )}
      <Cajon abierto={detalle != null} onCerrar={() => setDetalle(null)} titulo={detalle?.trabajador ?? ""} ancho={480}>{detalle && <DetalleLiquidacion l={detalle} conceptos={detalleQ.data?.conceptos} />}</Cajon>
      <Dialogo abierto={nuevo} onCerrar={() => setNuevo(false)} titulo="Agregar bono o descuento" ancho={520}
        pie={<><Boton variante="contorno" onClick={() => setNuevo(false)}>Cancelar</Boton><Boton variante="rojo" cargando={agregar.isPending} disabled={!f.trabajadorId || !f.concepto || !f.monto} onClick={() => agregar.mutate()}>Agregar</Boton></>}>
        <div className="grid gap-4">
          <Campo etiqueta="Persona"><Seleccion value={f.trabajadorId} onChange={(e) => setF({ ...f, trabajadorId: e.target.value })}><option value="">Elegir…</option>{rem.data?.liquidaciones.map((l) => <option key={l.idTrabajador} value={l.idTrabajador}>{l.trabajador}</option>)}</Seleccion></Campo>
          <Campo etiqueta="Concepto" ayuda={tipoSel ? (tipoSel === "Descuento" ? "Se descuenta del líquido." : "Suma a los haberes imponibles.") : undefined}><Seleccion value={f.concepto} onChange={(e) => setF({ ...f, concepto: e.target.value })}><option value="">Elegir…</option>{conceptos.data?.catalogo.map((c) => <option key={c.concepto}>{c.concepto}</option>)}</Seleccion></Campo>
          <Campo etiqueta="Monto (CLP)"><Entrada type="number" min={1} value={f.monto} onChange={(e) => setF({ ...f, monto: e.target.value })} /></Campo>
          <Campo etiqueta="Observación"><Entrada value={f.obs} onChange={(e) => setF({ ...f, obs: e.target.value })} /></Campo>
        </div>
      </Dialogo>
    </>
  );
}
