import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fecha, hace } from "@sima/cliente";
import { AreaTexto, Boton, Campo, Chip, Dialogo, Encabezado, ErrorCarga, Esqueleto, Pestanas, Seccion, Vacio, mensajeDe, useAviso } from "@sima/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { ir } from "../ruta";

interface Orden { id: number; codigo: string; equipo: string; equipoNombre: string; titulo: string; descripcion: string; prioridad: string; estado: string; automatica: boolean; creada: string; asignado?: string | null; asignadoAId?: string | null }
const PRIORIDAD: Record<string, "peligro" | "aviso" | "info" | "neutro"> = { critica: "peligro", alta: "aviso", media: "info", baja: "neutro" };
const ESTADO: Record<string, { t: string; tono: "peligro" | "aviso" | "ok" }> = { abierta: { t: "Abierta", tono: "peligro" }, en_curso: { t: "En curso", tono: "aviso" }, cerrada: { t: "Cerrada", tono: "ok" } };
const PERFILES_MANTENCION = ["tecnico", "supervisor_mant", "jefe_mant", "confiabilidad", "ing_automatizacion", "instrumentacion"];

// los cinco pasos de bloqueo y etiquetado (LOTO) del informe de roles
const PASOS_LOTO = ["Identifiqué las fuentes de energía del equipo (eléctrica, neumática, hidráulica, térmica).", "Avisé al personal afectado.", "Apagué y aislé el equipo de todas sus fuentes de energía.", "Puse mi candado y mi etiqueta en cada punto de aislación.", "Comprobé que no queda energía: intenté arrancar y no respondió."];

function DialogoLoto({ orden, onCerrar }: { orden: Orden | null; onCerrar: () => void }) {
  const [marcas, setMarcas] = useState<boolean[]>(PASOS_LOTO.map(() => false));
  const qc = useQueryClient(); const aviso = useAviso();
  const m = useMutation({
    mutationFn: () => api.post(`/api/ordenes/${orden!.id}/tomar`, { lotoConfirmado: true }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["ordenes"] }); void qc.invalidateQueries({ queryKey: ["equipos"] }); aviso(`Orden ${orden!.codigo} en curso. El equipo quedó en mantención.`); setMarcas(PASOS_LOTO.map(() => false)); onCerrar(); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  return (
    <Dialogo abierto={orden != null} onCerrar={onCerrar} titulo="Bloqueo y etiquetado (LOTO)" ancho={580}
      pie={<><Boton variante="contorno" onClick={onCerrar}>Cancelar</Boton><Boton variante="rojo" disabled={!marcas.every(Boolean)} cargando={m.isPending} onClick={() => m.mutate()}>Iniciar la orden</Boton></>}>
      <p className="mb-4 text-gris">Antes de intervenir {orden?.equipo}, confirme cada paso. No se puede iniciar la orden sin los cinco.</p>
      <ul className="space-y-2">{PASOS_LOTO.map((p, i) => (
        <li key={p}><label className="flex cursor-pointer items-start gap-3 border border-linea p-3 transition-colors hover:border-negro has-[:checked]:border-negro has-[:checked]:bg-chapa/60"><input type="checkbox" className="mt-1 size-5 accent-[#d91f26]" checked={marcas[i]} onChange={(e) => setMarcas(marcas.map((x, j) => (j === i ? e.target.checked : x)))} /><span>{p}</span></label></li>
      ))}</ul>
    </Dialogo>
  );
}

function DialogoCierre({ orden, onCerrar }: { orden: Orden | null; onCerrar: () => void }) {
  const [nota, setNota] = useState(""); const [retirado, setRetirado] = useState(false);
  const qc = useQueryClient(); const aviso = useAviso();
  const m = useMutation({
    mutationFn: () => api.post(`/api/ordenes/${orden!.id}/cerrar`, { nota, lotoRetirado: retirado }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["ordenes"] }); void qc.invalidateQueries({ queryKey: ["equipos"] }); aviso(`Orden ${orden!.codigo} cerrada. El equipo vuelve a operar.`); setNota(""); setRetirado(false); onCerrar(); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  return (
    <Dialogo abierto={orden != null} onCerrar={onCerrar} titulo="Cerrar la orden" ancho={560}
      pie={<><Boton variante="contorno" onClick={onCerrar}>Cancelar</Boton><Boton variante="rojo" disabled={!retirado} cargando={m.isPending} onClick={() => m.mutate()}>Cerrar orden</Boton></>}>
      <div className="space-y-4">
        <Campo etiqueta="Qué se hizo"><AreaTexto value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Por ejemplo: se limpió el intercambiador y se verificó la temperatura." /></Campo>
        <label className="flex cursor-pointer items-start gap-3 border border-linea p-3 has-[:checked]:border-negro"><input type="checkbox" className="mt-1 size-5 accent-[#d91f26]" checked={retirado} onChange={(e) => setRetirado(e.target.checked)} /><span>Retiré mi candado y mi etiqueta, y el equipo está listo para volver a operar.</span></label>
      </div>
    </Dialogo>
  );
}

export function Ordenes() {
  const { usuario } = useAuth();
  const [tab, setTab] = useState<"abierta" | "en_curso" | "cerrada" | "mias">("abierta");
  const [loto, setLoto] = useState<Orden | null>(null);
  const [cierre, setCierre] = useState<Orden | null>(null);
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ["ordenes"], queryFn: () => api.get<Orden[]>("/api/ordenes"), refetchInterval: 15_000 });
  const mantencion = PERFILES_MANTENCION.includes(usuario?.perfil ?? "");
  const lista = data.filter((o) => (tab === "mias" ? o.asignadoAId === usuario?.id && o.estado !== "cerrada" : o.estado === tab));
  const n = (e: string) => data.filter((o) => o.estado === e).length;
  return (
    <>
      <Encabezado titulo="Órdenes de trabajo" descripcion={mantencion ? "Tome una orden con el bloqueo y etiquetado confirmado, y ciérrela al terminar." : "Aquí ve el avance de las órdenes. Si una máquina falla, reporte la falla para crear una."}
        acciones={<Boton variante="rojo" onClick={() => ir("/reportar")}>Reportar una falla</Boton>} />
      <Pestanas id="ot" activa={tab} onCambio={setTab} items={[{ clave: "abierta", titulo: "Abiertas", n: n("abierta") }, { clave: "en_curso", titulo: "En curso", n: n("en_curso") }, { clave: "mias", titulo: "Mías" }, { clave: "cerrada", titulo: "Cerradas", n: n("cerrada") }]} />
      <div className="mt-5">
        {error ? <ErrorCarga error={error} reintentar={() => void refetch()} /> : isLoading ? <Esqueleto className="h-40" /> : lista.length === 0 ? <Seccion><Vacio titulo="No hay órdenes aquí" texto="Cuando una máquina pase su límite se crea una orden automática." /></Seccion> : (
          <ul className="grid gap-3">
            {lista.map((o) => (
              <li key={o.id}><Seccion sinBorde className={`border-l-[4px] ${o.prioridad === "critica" ? "border-rojo" : o.prioridad === "alta" ? "border-ambar" : "border-linea"}`}>
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="num font-semibold">{o.codigo}</span><Chip tono={ESTADO[o.estado].tono}>{ESTADO[o.estado].t}</Chip><Chip tono={PRIORIDAD[o.prioridad]} punto={false}>{o.prioridad}</Chip>{o.automatica && <Chip punto={false}>automática</Chip>}</div>
                    <p className="mt-1 text-[18px] font-medium">{o.titulo}</p>
                    <p className="text-[14px] text-gris">{o.equipo} · {o.equipoNombre} · {hace(o.creada)} ({fecha(o.creada)}){o.asignado ? ` · a cargo de ${o.asignado}` : ""}</p>
                    {o.descripcion && <p className="mt-1 whitespace-pre-line text-[14px]">{o.descripcion}</p>}
                  </div>
                  {mantencion && o.estado === "abierta" && <Boton variante="negro" onClick={() => setLoto(o)}>Tomar con LOTO</Boton>}
                  {mantencion && o.estado === "en_curso" && <Boton variante="rojo" onClick={() => setCierre(o)}>Cerrar orden</Boton>}
                </div>
              </Seccion></li>
            ))}
          </ul>
        )}
      </div>
      <DialogoLoto orden={loto} onCerrar={() => setLoto(null)} />
      <DialogoCierre orden={cierre} onCerrar={() => setCierre(null)} />
    </>
  );
}
