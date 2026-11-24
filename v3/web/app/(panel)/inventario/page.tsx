"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { clp, fecha, hace } from "@sima/cliente";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Boton, Campo, Chip, Dialogo, Encabezado, Entrada, ErrorCarga, Pestanas, Seccion, Tabla, mensajeDe, useAviso, cx, type Columna } from "@/components/ui";

interface Repuesto { id: number; codigo: string; nombre: string; tipo: string; ubicacion: string; stock: number; stockMinimo: number; costoUnitario: number; critico: boolean; bajoMinimo: boolean; valor: number }
interface Herramienta { id: number; codigo: string; nombre: string; estado: string; requiereCalibracion: boolean; proxima?: string | null; dias?: number | null; calibracion: string; retiradaPor?: string | null; retiradaEn?: string | null }
const TONO_CAL: Record<string, "ok" | "aviso" | "peligro" | "neutro"> = { VIGENTE: "ok", "POR VENCER": "aviso", VENCIDA: "peligro", "SIN CALIBRACIÓN": "neutro" };

export default function Inventario() {
  const { puede } = useAuth();
  const qc = useQueryClient(); const aviso = useAviso();
  const [tab, setTab] = useState<"repuestos" | "herramientas">("repuestos");
  const [soloBajos, setSoloBajos] = useState(false);
  const [ingreso, setIngreso] = useState<Repuesto | null>(null); const [cantidad, setCantidad] = useState("1");
  const rep = useQuery({ queryKey: ["repuestos"], queryFn: () => api.get<Repuesto[]>("/api/repuestos") });
  const her = useQuery({ queryKey: ["herramientas"], queryFn: () => api.get<Herramienta[]>("/api/herramientas") });
  const mover = useMutation({
    mutationFn: () => api.post(`/api/repuestos/${ingreso!.id}/movimiento`, { cantidad: Number(cantidad), nota: "Ingreso desde la web" }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["repuestos"] }); aviso("Ingreso registrado."); setIngreso(null); }, onError: (e) => aviso(mensajeDe(e), "error"),
  });
  const calibrar = useMutation({
    mutationFn: (id: number) => api.post(`/api/herramientas/${id}/calibrar`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["herramientas"] }); aviso("Calibración registrada."); }, onError: (e) => aviso(mensajeDe(e), "error"),
  });

  const colR: Columna<Repuesto>[] = [
    { clave: "c", titulo: "Repuesto", valor: (r) => r.nombre, render: (r) => <div><p className="font-medium">{r.nombre}</p><p className="num text-[13px] text-gris">{r.codigo} · {r.tipo} · {r.ubicacion}</p></div> },
    { clave: "s", titulo: "Stock", valor: (r) => r.stock / (r.stockMinimo || 1), render: (r) => (
      <div className="flex items-center gap-2.5"><span className="relative h-2.5 w-24 bg-chapa"><motion.span className={cx("block h-full", r.bajoMinimo ? "bg-rojo" : "bg-negro")} initial={{ width: 0 }} animate={{ width: `${Math.min(100, (r.stock / (r.stockMinimo * 2 || 1)) * 100)}%` }} transition={{ duration: 0.6 }} /><i className="absolute -inset-y-0.5 w-0.5 bg-ambar" style={{ left: "50%" }} title="Stock mínimo" /></span><span className="num text-[14px]"><b>{r.stock}</b> de mín. {r.stockMinimo}</span></div>) },
    { clave: "k", titulo: "Estado", render: (r) => <div className="flex gap-1.5">{r.bajoMinimo && <Chip tono="peligro">Bajo el mínimo</Chip>}{r.critico && <Chip tono="aviso" punto={false}>Crítico</Chip>}</div> },
    { clave: "u", titulo: "Costo", alinear: "derecha", valor: (r) => r.costoUnitario, render: (r) => clp(r.costoUnitario) },
    { clave: "v", titulo: "Valor en bodega", alinear: "derecha", valor: (r) => r.valor, render: (r) => clp(r.valor) },
    { clave: "a", titulo: "", render: (r) => puede("repuestos", "editar") ? <Boton tam="s" variante="contorno" onClick={() => { setCantidad("1"); setIngreso(r); }}>Ingresar</Boton> : null },
  ];
  const colH: Columna<Herramienta>[] = [
    { clave: "c", titulo: "Herramienta", valor: (h) => h.nombre, render: (h) => <div><p className="font-medium">{h.nombre}</p><p className="num text-[13px] text-gris">{h.codigo}</p></div> },
    { clave: "e", titulo: "Está", valor: (h) => h.estado, render: (h) => h.estado === "disponible" ? <Chip tono="ok">En el pañol</Chip> : <div><Chip tono="aviso">Retirada</Chip><p className="mt-0.5 text-[13px] text-gris">{h.retiradaPor}, {hace(h.retiradaEn)}</p></div> },
    { clave: "k", titulo: "Calibración", valor: (h) => h.dias ?? 99999, render: (h) => <div><Chip tono={TONO_CAL[h.calibracion]}>{h.calibracion === "SIN CALIBRACIÓN" ? "No requiere" : h.calibracion === "VIGENTE" ? "Vigente" : h.calibracion === "POR VENCER" ? "Por vencer" : "Vencida"}</Chip>{h.proxima && <p className="mt-0.5 text-[13px] text-gris">vence {fecha(h.proxima)}</p>}</div> },
    { clave: "a", titulo: "", render: (h) => puede("herramientas", "editar") && h.requiereCalibracion ? <Boton tam="s" variante="contorno" cargando={calibrar.isPending && calibrar.variables === h.id} onClick={() => calibrar.mutate(h.id)}>Registrar calibración</Boton> : null },
  ];
  const bajos = (rep.data ?? []).filter((r) => r.bajoMinimo).length;
  const vencidas = (her.data ?? []).filter((h) => h.calibracion === "VENCIDA").length;
  return (
    <>
      <Encabezado titulo="Inventario" descripcion="Repuestos del pañol y herramientas con su calibración. Una herramienta con la calibración vencida no se puede retirar." />
      <div className="mb-5 grid gap-4 sm:grid-cols-4">
        {[["Repuestos bajo el mínimo", bajos, bajos ? "text-rojo" : ""], ["Valor en bodega", clp((rep.data ?? []).reduce((a, r) => a + r.valor, 0)), ""], ["Herramientas retiradas", (her.data ?? []).filter((h) => h.estado === "retirada").length, ""], ["Calibraciones vencidas", vencidas, vencidas ? "text-rojo" : ""]].map(([t, n, c]) => (
          <div key={t as string} className="border-t-[3px] border-negro bg-papel p-4"><p className={cx("display text-[40px] font-bold leading-none", c as string)}>{n as string | number}</p><p className="text-[14px] text-gris">{t as string}</p></div>
        ))}
      </div>
      <Pestanas id="inv" activa={tab} onCambio={setTab} items={[{ clave: "repuestos", titulo: "Repuestos", n: rep.data?.length }, { clave: "herramientas", titulo: "Herramientas", n: her.data?.length }]} />
      <div className="mt-4">
        {tab === "repuestos" && (rep.error ? <ErrorCarga error={rep.error} /> : (
          <Seccion>
            <div className="border-b border-linea-suave p-4"><label className="flex items-center gap-2 text-[14px]"><input type="checkbox" className="size-4 accent-[#d91f26]" checked={soloBajos} onChange={(e) => setSoloBajos(e.target.checked)} />Mostrar solo los que están bajo el mínimo</label></div>
            <Tabla columnas={colR} filas={(rep.data ?? []).filter((r) => !soloBajos || r.bajoMinimo)} clave={(r) => r.id} cargando={rep.isLoading} maxAlto="calc(100dvh - 430px)" />
          </Seccion>))}
        {tab === "herramientas" && (her.error ? <ErrorCarga error={her.error} /> : <Seccion><Tabla columnas={colH} filas={her.data ?? []} clave={(h) => h.id} cargando={her.isLoading} maxAlto="calc(100dvh - 380px)" /></Seccion>)}
      </div>
      <Dialogo abierto={ingreso != null} onCerrar={() => setIngreso(null)} titulo="Ingresar al pañol" ancho={440} pie={<><Boton variante="contorno" onClick={() => setIngreso(null)}>Cancelar</Boton><Boton variante="rojo" cargando={mover.isPending} disabled={Number(cantidad) < 1} onClick={() => mover.mutate()}>Ingresar</Boton></>}>
        <p className="mb-3 text-gris">{ingreso?.nombre}</p>
        <Campo etiqueta="Cantidad"><Entrada type="number" min={1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} /></Campo>
      </Dialogo>
    </>
  );
}
