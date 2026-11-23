import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AreaTexto, Boton, Campo, Encabezado, Entrada, Seccion, Seleccion, mensajeDe, useAviso } from "@sima/ui";
import { enviar } from "../lib/offline";
import { usePlanta } from "../lib/planta";
import { ir, useParametro } from "../ruta";

export function Reportar({ equipo }: { equipo?: string }) {
  const { equipos } = usePlanta();
  const desdeRuta = useParametro("equipo");
  const qc = useQueryClient(); const aviso = useAviso();
  const [f, setF] = useState({ equipo: equipo ?? desdeRuta ?? "", titulo: "", descripcion: "", prioridad: "media" });
  const m = useMutation({
    mutationFn: () => enviar<{ codigo: string }>("POST", "/api/ordenes", f),
    onSuccess: (r) => { void qc.invalidateQueries({ queryKey: ["ordenes"] }); aviso(r.queued ? "Sin señal: la falla se enviará sola cuando vuelva la conexión." : `Falla reportada. Se creó la orden ${r.data?.codigo}.`); ir("/ordenes"); },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  const alEnviar = (e: FormEvent) => { e.preventDefault(); m.mutate(); };
  return (
    <>
      <Encabezado titulo="Reportar una falla" descripcion="Cuente qué pasa y en qué máquina. Mantenimiento recibe la orden de inmediato." />
      <Seccion className="max-w-[720px]">
        <form onSubmit={alEnviar} className="grid gap-4 p-5">
          <Campo etiqueta="Equipo"><Seleccion required value={f.equipo} onChange={(e) => setF({ ...f, equipo: e.target.value })}><option value="">Elegir equipo…</option>{equipos.map((e) => <option key={e.codigo} value={e.codigo}>{e.codigo} · {e.nombre}</option>)}</Seleccion></Campo>
          <Campo etiqueta="Qué pasa"><Entrada required maxLength={120} value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} placeholder="Por ejemplo: ruido fuerte en el reductor" /></Campo>
          <Campo etiqueta="Detalle (opcional)"><AreaTexto value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></Campo>
          <Campo etiqueta="Qué tan urgente es"><Seleccion value={f.prioridad} onChange={(e) => setF({ ...f, prioridad: e.target.value })}><option value="baja">Baja: puede esperar</option><option value="media">Media: dentro del turno</option><option value="alta">Alta: la máquina rinde mal</option><option value="critica">Crítica: máquina detenida o riesgo</option></Seleccion></Campo>
          <div className="flex justify-end gap-2"><Boton type="button" variante="contorno" onClick={() => ir("/equipos")}>Cancelar</Boton><Boton type="submit" variante="rojo" cargando={m.isPending}>Enviar reporte</Boton></div>
        </form>
      </Seccion>
    </>
  );
}
