import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fecha, hace, clp } from "@sima/cliente";
import { AreaTexto, Boton, Campo, Chip, Dialogo, Encabezado, Entrada, ErrorCarga, Esqueleto, EstadoEquipo, Pestanas, Seccion, Vacio, cx, mensajeDe, useAviso } from "@sima/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { enviar } from "../lib/offline";

// ------------------------------------------------------------------------------------------ rutinas preventivas
interface Plantilla { id: number; nombre: string; frecuencia: string; items: string[]; horas: number }
interface FilaRutina { rutinaId: number; rutina: string; frecuencia: string; equipo: string; equipoNombre: string; ultima?: { fecha: string; por: string; conHallazgos: boolean } | null; vencida: boolean }
const FREC: Record<string, string> = { turno: "Del turno", semanal: "Semanales", mensual: "Mensuales", trimestral: "Trimestrales" };

function DialogoRutina({ plantilla, equipo, nombre, onCerrar }: { plantilla: Plantilla | null; equipo: string; nombre: string; onCerrar: () => void }) {
  const [res, setRes] = useState<{ ok: boolean; nota: string }[]>([]);
  const [obs, setObs] = useState("");
  const qc = useQueryClient(); const aviso = useAviso();
  const items = plantilla?.items ?? [];
  const lista = items.map((_, i) => res[i] ?? { ok: true, nota: "" });
  const m = useMutation({
    mutationFn: () => enviar<{ hallazgos?: number; orden?: string | null }>("POST", `/api/rutinas/${plantilla!.id}/ejecutar`, { equipo, observaciones: obs, resultados: items.map((item, i) => ({ item, ok: lista[i].ok, nota: lista[i].nota || null })) }),
    onSuccess: (r) => { void qc.invalidateQueries({ queryKey: ["rutinas"] }); void qc.invalidateQueries({ queryKey: ["ordenes"] }); aviso(r.queued ? "Sin señal: la rutina se enviará sola cuando vuelva la conexión." : r.data?.orden ? `Rutina registrada. Se creó la orden ${r.data.orden} por los hallazgos.` : "Rutina registrada sin hallazgos."); setRes([]); setObs(""); onCerrar(); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  return (
    <Dialogo abierto={plantilla != null} onCerrar={onCerrar} titulo={`${plantilla?.nombre ?? ""}: ${equipo}`} ancho={620}
      pie={<><Boton variante="contorno" onClick={onCerrar}>Cancelar</Boton><Boton variante="rojo" cargando={m.isPending} onClick={() => m.mutate()}>Registrar rutina</Boton></>}>
      <p className="mb-3 text-gris">{nombre}. Marque cada punto; si algo no está bien, anótelo y se crea una orden de trabajo.</p>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={it} className={cx("border p-3", lista[i].ok ? "border-linea" : "border-rojo bg-rojo-claro/40")}>
            <div className="flex items-center justify-between gap-3"><span className="font-medium">{it}</span>
              <span className="flex overflow-hidden border border-linea text-[14px] font-semibold">
                <button type="button" onClick={() => setRes(items.map((_, j) => (j === i ? { ...lista[j], ok: true } : lista[j])))} aria-pressed={lista[i].ok} className={cx("cursor-pointer px-3 py-1.5", lista[i].ok ? "bg-verde text-white" : "bg-papel text-gris")}>Bien</button>
                <button type="button" onClick={() => setRes(items.map((_, j) => (j === i ? { ...lista[j], ok: false } : lista[j])))} aria-pressed={!lista[i].ok} className={cx("cursor-pointer px-3 py-1.5", !lista[i].ok ? "bg-rojo text-white" : "bg-papel text-gris")}>Con problema</button></span></div>
            {!lista[i].ok && <Entrada className="mt-2" placeholder="Qué encontró" value={lista[i].nota} onChange={(e) => setRes(items.map((_, j) => (j === i ? { ...lista[j], nota: e.target.value } : lista[j])))} aria-label={`Qué encontró en ${it}`} />}
          </li>
        ))}
      </ul>
      <Campo etiqueta="Observaciones (opcional)" className="mt-4"><AreaTexto value={obs} onChange={(e) => setObs(e.target.value)} /></Campo>
    </Dialogo>
  );
}

export function Rutinas() {
  const [frec, setFrec] = useState("turno");
  const [hacer, setHacer] = useState<{ p: Plantilla; equipo: string; nombre: string } | null>(null);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["rutinas"], queryFn: () => api.get<{ plantillas: Plantilla[]; filas: FilaRutina[] }>("/api/rutinas"), refetchInterval: 30_000 });
  const filas = (data?.filas ?? []).filter((f) => f.frecuencia === frec);
  const vencidas = (f: string) => (data?.filas ?? []).filter((x) => x.frecuencia === f && x.vencida).length;
  return (
    <>
      <Encabezado titulo="Rutinas preventivas" descripcion="Las listas de verificación por equipo. Una rutina vencida es la que no se ha hecho dentro de su período." />
      <Pestanas id="rut" activa={frec} onCambio={setFrec} items={Object.keys(FREC).map((k) => ({ clave: k, titulo: FREC[k], n: vencidas(k) || undefined }))} />
      <div className="mt-5">
        {error ? <ErrorCarga error={error} reintentar={() => void refetch()} /> : isLoading ? <Esqueleto className="h-60" /> : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filas.map((f) => (
              <li key={f.equipo}><Seccion sinBorde className={cx("border-l-[4px]", f.vencida ? "border-ambar" : "border-verde")}><div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0"><p className="font-mono text-[20px] font-bold leading-none">{f.equipo}</p><p className="truncate text-[14px] text-gris">{f.equipoNombre}</p>
                  <p className="mt-1 text-[13px]">{f.ultima ? <>Última: {hace(f.ultima.fecha)}, {f.ultima.por}{f.ultima.conHallazgos && <span className="text-rojo"> · con hallazgos</span>}</> : <span className="text-gris">Nunca registrada</span>}</p></div>
                <div className="flex shrink-0 flex-col items-end gap-1.5"><Chip tono={f.vencida ? "aviso" : "ok"}>{f.vencida ? "Vencida" : "Al día"}</Chip>
                  <Boton tam="s" variante={f.vencida ? "negro" : "contorno"} onClick={() => setHacer({ p: data!.plantillas.find((x) => x.id === f.rutinaId)!, equipo: f.equipo, nombre: f.equipoNombre })}>Hacer rutina</Boton></div>
              </div></Seccion></li>
            ))}
          </ul>
        )}
      </div>
      {hacer && <DialogoRutina plantilla={hacer.p} equipo={hacer.equipo} nombre={hacer.nombre} onCerrar={() => setHacer(null)} />}
    </>
  );
}


// ------------------------------------------------------------------------------------------ traspaso de turno
interface Borrador { turno: string; items: string[]; rutinasVencidas: number; ordenesAbiertas: { codigo: string; equipo: string; titulo: string; prioridad: string }[]; ordenesEnCurso: { codigo: string; equipo: string; titulo: string; asignado?: string | null }[]; equiposFuera: { codigo: string; nombre: string; estado: string }[]; alarmasAbiertas: { equipo: string; nivel: string; mensaje: string }[]; repuestosCriticos: { codigo: string; nombre: string; stock: number; minimo: number }[] }

export function Traspaso() {
  const { puede } = useAuth();
  const qc = useQueryClient(); const aviso = useAviso();
  const [marcas, setMarcas] = useState<boolean[]>([]); const [notas, setNotas] = useState("");
  const b = useQuery({ queryKey: ["traspaso-borrador"], queryFn: () => api.get<Borrador>("/api/traspaso/borrador"), refetchInterval: 30_000 });
  const hist = useQuery({ queryKey: ["traspasos"], queryFn: () => api.get<{ id: number; fecha: string; turno: string; por: string; notas: string; revisiones: { ok: boolean }[] }[]>("/api/traspaso") });
  const m = useMutation({
    mutationFn: () => enviar("POST", "/api/traspaso", { revisiones: b.data!.items.map((_, i) => !!marcas[i]), notas }),
    onSuccess: (r) => { void qc.invalidateQueries({ queryKey: ["traspasos"] }); aviso(r.queued ? "Sin señal: el traspaso se enviará solo." : "Turno entregado."); setMarcas([]); setNotas(""); }, onError: (e) => aviso(mensajeDe(e), "error"),
  });
  if (b.error) return <ErrorCarga error={b.error} reintentar={() => void b.refetch()} />;
  if (!b.data) return <Esqueleto className="h-80" />;
  const d = b.data;
  const Bloque = ({ titulo, n, children }: { titulo: string; n: number; children: React.ReactNode }) => <Seccion titulo={`${titulo} (${n})`}>{n === 0 ? <p className="p-5 pt-2 text-gris">Nada que informar.</p> : <ul className="divide-y divide-linea-suave px-5 pb-2 pt-1 text-[15px]">{children}</ul>}</Seccion>;
  return (
    <>
      <Encabezado titulo="Traspaso de turno" descripcion="El estado de la planta ya viene armado. Revise las seis cosas y entregue el turno." />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="grid content-start gap-5">
          <Bloque titulo="Equipos fuera de servicio" n={d.equiposFuera.length}>{d.equiposFuera.map((e) => <li key={e.codigo} className="flex justify-between py-2"><span><b className="num">{e.codigo}</b> {e.nombre}</span><EstadoEquipo estado={e.estado} corto tam="s" /></li>)}</Bloque>
          <Bloque titulo="Alarmas abiertas" n={d.alarmasAbiertas.length}>{d.alarmasAbiertas.map((a, i) => <li key={i} className="py-2"><b className="num">{a.equipo}</b> {a.mensaje}</li>)}</Bloque>
          <Bloque titulo="Órdenes abiertas" n={d.ordenesAbiertas.length}>{d.ordenesAbiertas.map((o) => <li key={o.codigo} className="py-2"><b className="num">{o.codigo}</b> {o.equipo}: {o.titulo}</li>)}</Bloque>
          <Bloque titulo="Órdenes en curso" n={d.ordenesEnCurso.length}>{d.ordenesEnCurso.map((o) => <li key={o.codigo} className="py-2"><b className="num">{o.codigo}</b> {o.equipo}: {o.titulo}{o.asignado ? ` · ${o.asignado}` : ""}</li>)}</Bloque>
          <Bloque titulo="Repuestos críticos bajo el mínimo" n={d.repuestosCriticos.length}>{d.repuestosCriticos.map((r) => <li key={r.codigo} className="flex justify-between py-2"><span>{r.nombre}</span><span className="num text-rojo">{r.stock} de {r.minimo}</span></li>)}</Bloque>
          <p className="text-[14px] text-gris">Rutinas del turno vencidas: <b className="text-negro">{d.rutinasVencidas}</b></p>
        </div>
        <div className="grid content-start gap-5">
          {puede("traspaso", "editar") ? (
            <Seccion titulo="Entregar el turno"><div className="grid gap-3 p-5 pt-3">
              {d.items.map((t, i) => <label key={t} className="flex cursor-pointer items-start gap-3 rounded-xl border border-linea p-3 has-[:checked]:border-acento has-[:checked]:bg-acento-claro has-[:checked]:bg-chapa/60"><input type="checkbox" className="mt-1 size-5 accent-[#d91f26]" checked={!!marcas[i]} onChange={(e) => setMarcas(d.items.map((_, j) => (j === i ? e.target.checked : !!marcas[j])))} /><span>{t}</span></label>)}
              <Campo etiqueta="Notas para el turno que entra"><AreaTexto value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Por ejemplo: vigilar la temperatura del compresor" /></Campo>
              <div><Boton variante="rojo" cargando={m.isPending} onClick={() => m.mutate()}>Entregar turno</Boton></div>
            </div></Seccion>
          ) : <Seccion><p className="p-5 text-gris">Solo supervisores y jefaturas entregan el turno. Usted puede ver el estado.</p></Seccion>}
          <Seccion titulo="Últimos traspasos">{(hist.data ?? []).length === 0 ? <p className="p-5 pt-2 text-gris">Todavía no hay traspasos.</p> : <ul className="divide-y divide-linea-suave px-5 pb-2 pt-1">{hist.data!.slice(0, 6).map((t) => <li key={t.id} className="py-2.5 text-[15px]"><b>Turno {t.turno}</b> · {t.por}<span className="block text-[13px] text-gris">{new Date(t.fecha).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })} · {t.revisiones.filter((r) => r.ok).length} de {t.revisiones.length} revisiones{t.notas ? ` · ${t.notas}` : ""}</span></li>)}</ul>}</Seccion>
        </div>
      </div>
    </>
  );
}
