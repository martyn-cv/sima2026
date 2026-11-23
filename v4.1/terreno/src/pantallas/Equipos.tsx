import { useQuery } from "@tanstack/react-query";
import { hace } from "@sima/cliente";
import { Boton, Chip, Encabezado, Seccion, cx } from "@sima/ui";
import { api } from "../lib/api";
import { usePlanta } from "../lib/planta";
import { ESTADO_EQ, Medidor } from "../Medidor";
import { ir } from "../ruta";

interface Alarma { id: number; equipo: string; nivel: string; mensaje: string; inicio: string; fin?: string | null }
interface Orden { id: number; codigo: string; equipo: string; titulo: string; estado: string; prioridad: string }

export function Equipos() {
  const { equipos } = usePlanta();
  return (
    <>
      <Encabezado titulo="Equipos" descripcion="Estado de cada máquina, al segundo. Toque un equipo para ver sus variables y reportar una falla." />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {equipos.map((e) => {
          const est = ESTADO_EQ[e.estado] ?? ESTADO_EQ.detenido;
          return (
            <li key={e.codigo}>
              <button onClick={() => ir(`/equipos/${e.codigo}`)} className={cx("block w-full cursor-pointer tarjeta border-t-2 p-4 text-left transition-colors hover:bg-chapa/40", e.estado === "alarma" ? "border-rojo" : e.estado === "en_mantencion" ? "border-ambar" : "border-negro")}>
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="display text-[30px] font-bold leading-none">{e.codigo}</p><p className="truncate font-medium">{e.nombre}</p><p className="truncate text-[14px] text-gris">{e.ubicacion}</p></div><Chip tono={est.tono}>{est.texto}</Chip></div>
                <div className="mt-3 space-y-2.5">{e.sensores.slice(0, 3).map((s) => <Medidor key={s.variable} s={s} />)}</div>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function EquipoDetalle({ codigo }: { codigo: string }) {
  const { equipos } = usePlanta();
  const e = equipos.find((x) => x.codigo === codigo);
  const alarmas = useQuery({ queryKey: ["alarmas"], queryFn: () => api.get<Alarma[]>("/api/alarmas"), refetchInterval: 10_000 });
  const ordenes = useQuery({ queryKey: ["ordenes"], queryFn: () => api.get<Orden[]>("/api/ordenes"), refetchInterval: 15_000 });
  if (!e) return <p className="text-gris">Cargando equipo…</p>;
  const est = ESTADO_EQ[e.estado] ?? ESTADO_EQ.detenido;
  const misAlarmas = (alarmas.data ?? []).filter((a) => a.equipo === codigo).slice(0, 8);
  const misOrdenes = (ordenes.data ?? []).filter((o) => o.equipo === codigo && o.estado !== "cerrada");
  return (
    <>
      <Encabezado atras={<button onClick={() => ir("/equipos")} className="mb-2 cursor-pointer text-[15px] text-gris hover:text-negro">← Equipos</button>} titulo={`${e.codigo} · ${e.nombre}`}
        descripcion={<span className="flex flex-wrap items-center gap-3"><Chip tono={est.tono}>{est.texto}</Chip><span>{e.tipo}, {e.marca} {e.modelo}</span><span>{e.ubicacion}</span></span>}
        acciones={<Boton variante="rojo" onClick={() => ir(`/reportar/${e.codigo}`)}>Reportar una falla</Boton>} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Seccion titulo="Variables"><div className="space-y-4 p-5">{e.sensores.map((s) => <Medidor key={s.variable} s={s} />)}{e.plc && <p className="text-[14px] text-gris">Lo controla el {e.plc}.</p>}</div></Seccion>
        <div className="grid content-start gap-5">
          <Seccion titulo="Órdenes abiertas">{misOrdenes.length === 0 ? <p className="p-5 text-gris">No hay órdenes abiertas para este equipo.</p> : <ul className="divide-y divide-linea-suave px-5 pb-2 pt-1">{misOrdenes.map((o) => <li key={o.id}><button onClick={() => ir("/ordenes")} className="flex w-full cursor-pointer items-center justify-between gap-3 py-3 text-left hover:bg-chapa/50"><span><span className="num font-semibold">{o.codigo}</span> {o.titulo}</span><Chip tono={o.estado === "en_curso" ? "aviso" : "peligro"}>{o.estado === "en_curso" ? "En curso" : "Abierta"}</Chip></button></li>)}</ul>}</Seccion>
          <Seccion titulo="Últimas alarmas">{misAlarmas.length === 0 ? <p className="p-5 text-gris">Sin alarmas registradas.</p> : <ul className="divide-y divide-linea-suave px-5 pb-2 pt-1">{misAlarmas.map((a) => <li key={a.id} className="flex items-center justify-between gap-3 py-2.5"><span className="text-[15px]">{a.mensaje}</span><span className="shrink-0 text-right text-[13px] text-gris">{hace(a.inicio)}<br />{a.fin ? "resuelta" : "abierta"}</span></li>)}</ul>}</Seccion>
        </div>
      </div>
    </>
  );
}
