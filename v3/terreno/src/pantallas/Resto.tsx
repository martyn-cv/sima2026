import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fecha, hace, type Usuario } from "@sima/cliente";
import { Boton, Cajon, Chip, Cuenta, Dato, Encabezado, Entrada, ErrorCarga, Esqueleto, Estado, PanelSeguridad, Seccion, Vacio, cx, mensajeDe, useAviso } from "@sima/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { usePlanta } from "../lib/planta";
import { ir } from "../ruta";

interface Alarma { id: number; equipo: string; equipoNombre: string; nivel: string; mensaje: string; inicio: string; fin?: string | null; reconocidaPor?: string | null }
interface Habil { id: number; nombre: string; fechaObtencion: string; vence: string; dias: number; estado: string }
interface Orden { id: number; codigo: string; equipo: string; titulo: string; estado: string; asignadoAId?: string | null; prioridad: string }

export function Inicio() {
  const { usuario } = useAuth();
  const { equipos } = usePlanta();
  const ordenes = useQuery({ queryKey: ["ordenes"], queryFn: () => api.get<Orden[]>("/api/ordenes"), refetchInterval: 15_000 });
  const habil = useQuery({ queryKey: ["habilitaciones"], queryFn: () => api.get<Habil[]>("/api/yo/habilitaciones") });
  const alarmas = useQuery({ queryKey: ["alarmas"], queryFn: () => api.get<Alarma[]>("/api/alarmas?abiertas=true"), refetchInterval: 10_000 });
  const mias = (ordenes.data ?? []).filter((o) => o.asignadoAId === usuario?.id && o.estado === "en_curso");
  const abiertas = (ordenes.data ?? []).filter((o) => o.estado !== "cerrada").length;
  const conAlarma = equipos.filter((e) => e.estado === "alarma").length;
  const porVencer = (habil.data ?? []).filter((h) => h.estado !== "VIGENTE").length;
  return (
    <>
      <Encabezado titulo={`Buen turno, ${usuario?.nombre.split(" ")[0]}`} descripcion={`${usuario?.cargo}. ${usuario?.turno === "D" ? "Turno diurno" : usuario?.turno === "N" ? "Turno de noche" : `Turno ${usuario?.turno}`}.`}
        acciones={<Boton variante="rojo" onClick={() => ir("/reportar")}>Reportar una falla</Boton>} />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {[["Equipos con alarma", conAlarma, conAlarma > 0 ? "text-rojo" : "", "/equipos"], ["Órdenes abiertas", abiertas, "", "/ordenes"], ["Habilitaciones por vencer o vencidas", porVencer, porVencer > 0 ? "text-ambar" : "", "/cargo"]].map(([t, n, c, r]) => (
          <button key={t as string} onClick={() => ir(r as string)} className="cursor-pointer border-t-[3px] border-negro bg-papel p-5 text-left transition-colors hover:bg-chapa/40"><p className={cx("display text-[56px] font-bold leading-none", c as string)}><Cuenta valor={n as number} /></p><p className="text-[15px] text-gris">{t as string}</p></button>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Seccion titulo="Alarmas abiertas">{(alarmas.data ?? []).length === 0 ? <p className="p-5 text-gris">No hay alarmas abiertas. La planta está en rango.</p> : (
          <ul className="divide-y divide-linea-suave px-5 pb-2 pt-1">{alarmas.data!.slice(0, 6).map((a) => <li key={a.id}><button onClick={() => ir(`/equipos/${a.equipo}`)} className="flex w-full cursor-pointer items-center gap-3 py-3 text-left hover:bg-chapa/50"><Chip tono={a.nivel === "alarma" ? "peligro" : "aviso"}>{a.nivel === "alarma" ? "Alarma" : "Aviso"}</Chip><span className="min-w-0 flex-1 truncate">{a.mensaje}</span><span className="shrink-0 text-[13px] text-gris">{hace(a.inicio)}</span></button></li>)}</ul>
        )}</Seccion>
        <Seccion titulo="Mis órdenes en curso">{mias.length === 0 ? <p className="p-5 text-gris">No tiene órdenes en curso.</p> : (
          <ul className="divide-y divide-linea-suave px-5 pb-2 pt-1">{mias.map((o) => <li key={o.id}><button onClick={() => ir("/ordenes")} className="flex w-full cursor-pointer items-center justify-between gap-3 py-3 text-left hover:bg-chapa/50"><span><span className="num font-semibold">{o.codigo}</span> {o.titulo}</span><Chip tono="aviso">En curso</Chip></button></li>)}</ul>
        )}</Seccion>
      </div>
    </>
  );
}

export function Alarmas() {
  const qc = useQueryClient(); const aviso = useAviso();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["alarmas"], queryFn: () => api.get<Alarma[]>("/api/alarmas"), refetchInterval: 10_000 });
  const reconocer = useMutation({ mutationFn: (id: number) => api.post(`/api/alarmas/${id}/reconocer`), onSuccess: () => { void qc.invalidateQueries({ queryKey: ["alarmas"] }); aviso("Alarma reconocida."); }, onError: (e) => aviso(mensajeDe(e), "error") });
  return (
    <>
      <Encabezado titulo="Alarmas" descripcion="Reconocer una alarma avisa a su equipo que ya la vio. La alarma se cierra sola cuando la variable vuelve a rango." />
      {error ? <ErrorCarga error={error} reintentar={() => void refetch()} /> : isLoading ? <Esqueleto className="h-40" /> : (
        <Seccion>{(data ?? []).length === 0 ? <Vacio titulo="Sin alarmas" texto="No hay alarmas registradas todavía." /> : (
          <ul className="divide-y divide-linea-suave">{data!.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <Chip tono={a.fin ? "ok" : a.nivel === "alarma" ? "peligro" : "aviso"}>{a.fin ? "Resuelta" : a.nivel === "alarma" ? "Alarma" : "Aviso"}</Chip>
              <div className="min-w-0 flex-1"><p className="font-medium">{a.equipo} · {a.equipoNombre}</p><p className="text-[14px] text-gris">{a.mensaje} · {hace(a.inicio)}</p></div>
              {!a.fin && (a.reconocidaPor ? <span className="text-[14px] text-gris">Reconocida por {a.reconocidaPor}</span> : <Boton tam="s" variante="contorno" onClick={() => reconocer.mutate(a.id)}>Reconocer</Boton>)}
            </li>))}</ul>
        )}</Seccion>
      )}
    </>
  );
}

export function MiCargo() {
  const { usuario, refrescar } = useAuth();
  const [seguridad, setSeguridad] = useState(false);
  const cargos = useQuery({ queryKey: ["cargos"], queryFn: () => api.get<{ id: number; nombre: string; familia: string; paraQueExiste: string; queHace: string; queEntrega: string; seCoordinaCon: string; comoMedir: string; conocimientos: string }[]>("/api/cargos") });
  const habil = useQuery({ queryKey: ["habilitaciones"], queryFn: () => api.get<Habil[]>("/api/yo/habilitaciones") });
  const c = cargos.data?.find((x) => x.id === (usuario as Usuario).cargoId);
  return (
    <>
      <Encabezado titulo="Mi cargo" descripcion={usuario?.cargo} />
      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Seccion titulo="Qué se espera de este cargo">{!c ? <div className="p-5"><Esqueleto className="h-40" /></div> : (
          <dl className="grid gap-4 p-5">{([["Para qué existe", c.paraQueExiste], ["Qué hace", c.queHace], ["Qué entrega", c.queEntrega], ["Con quién se coordina", c.seCoordinaCon], ["Cómo se mide", c.comoMedir], ["Qué debe saber", c.conocimientos]] as const).map(([t, v]) => <Dato key={t} etiqueta={t}><span className="font-normal">{v}</span></Dato>)}</dl>
        )}</Seccion>
        <div className="grid content-start gap-5">
          <Seccion titulo="Mi ficha"><dl className="grid grid-cols-2 gap-4 p-5"><Dato etiqueta="Área">{usuario?.familia}</Dato><Dato etiqueta="Perfil">{usuario?.perfil}</Dato><Dato etiqueta="Jefe directo">{usuario?.jefe}</Dato><Dato etiqueta="Usuario">{usuario?.correo}</Dato></dl><div className="px-5 pb-5"><Boton variante="contorno" onClick={() => setSeguridad(true)}>Seguridad de la cuenta</Boton></div></Seccion>
          <Seccion titulo="Mis habilitaciones">{(habil.data ?? []).length === 0 ? <p className="p-5 text-gris">Su cargo no exige habilitaciones registradas.</p> : (
            <ul className="divide-y divide-linea-suave px-5 pb-2 pt-1">{habil.data!.map((h) => <li key={h.id} className="flex items-center justify-between gap-3 py-3"><div><p className="font-medium">{h.nombre}</p><p className="text-[14px] text-gris">vence el {fecha(h.vence)}{h.dias >= 0 ? `, en ${h.dias} días` : `, hace ${-h.dias} días`}</p></div><Estado v={h.estado} /></li>)}</ul>
          )}</Seccion>
        </div>
      </div>
      <Cajon abierto={seguridad} onCerrar={() => setSeguridad(false)} titulo="Seguridad de la cuenta" ancho={560}>{usuario && <PanelSeguridad cliente={api} usuario={usuario} alNuevoToken={(t) => void refrescar(t)} alTerminar={() => setSeguridad(false)} />}</Cajon>
    </>
  );
}

export function Directorio() {
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({ queryKey: ["directorio"], queryFn: () => api.get<{ id: string; nombre: string; cargo: string; familia: string; turno: string; correo: string; jefe?: string | null }[]>("/api/directorio") });
  const lista = useMemo(() => data.filter((p) => !q || `${p.nombre} ${p.cargo} ${p.familia}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  return (
    <>
      <Encabezado titulo="Directorio" descripcion="Con quién coordinarse. Solo se muestran nombre, cargo, turno y correo de trabajo." />
      <Seccion>
        <div className="border-b border-linea-suave p-4"><Entrada className="max-w-[420px]" placeholder="Buscar por nombre o cargo" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar en el directorio" /></div>
        {isLoading ? <div className="p-5"><Esqueleto className="h-40" /></div> : <ul className="divide-y divide-linea-suave">{lista.map((p) => <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"><div className="min-w-0"><p className="font-medium">{p.nombre}</p><p className="truncate text-[14px] text-gris">{p.cargo}</p></div><div className="text-right text-[14px] text-gris"><p>{p.turno === "D" ? "Diurno" : p.turno === "N" ? "Noche" : `Turno ${p.turno}`}</p><p>{p.correo}</p></div></li>)}</ul>}
      </Seccion>
    </>
  );
}
