"use client";
import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Play, Square } from "lucide-react";
import { hace, num, type PlcDetalle } from "@sima/cliente";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usePlanta } from "@/lib/planta";
import { ESTADO_PLC, Escalera, Rack } from "@/components/plc";
import { Boton, Chip, Encabezado, ErrorCarga, Esqueleto, Pestanas, Seccion, Tabla, mensajeDe, useAviso, cx, type Columna } from "@/components/ui";

export default function DetallePlc({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = use(params);
  const { puede } = useAuth();
  const { io: ioVivo, plcEstado, ciclos } = usePlanta();
  const aviso = useAviso();
  const [tab, setTab] = useState<"rack" | "puntos" | "programa" | "mandos">("rack");
  const { data, error, refetch } = useQuery({ queryKey: ["plc", codigo], queryFn: () => api.get<PlcDetalle>(`/api/plc/${codigo}`), refetchInterval: 8000 });
  const orden = useMutation({
    mutationFn: (v: { tag: string }) => api.post(`/api/plc/${codigo}/comandos`, { tag: v.tag, valor: 1 }),
    onSuccess: () => aviso("Orden enviada al PLC."), onError: (e) => aviso(mensajeDe(e), "error"),
  });
  if (error) return <ErrorCarga error={error} reintentar={() => void refetch()} />;
  if (!data) return <div className="grid gap-4"><Esqueleto className="h-16 w-1/2" /><Esqueleto className="h-72" /></div>;

  const io = { ...data.io, ...(ioVivo[codigo] ?? {}) };
  const estadoKey = data.estado === "sin_conexion" ? "sin_conexion" : plcEstado[codigo] ?? data.estado;
  const est = ESTADO_PLC[estadoKey] ?? ESTADO_PLC.sin_conexion;
  const colPuntos: Columna<PlcDetalle["puntos"][number]>[] = [
    { clave: "d", titulo: "Dirección", valor: (p) => p.direccion, render: (p) => <span className="num font-medium">{p.direccion}</span> },
    { clave: "t", titulo: "Etiqueta", valor: (p) => p.tag, render: (p) => <span className="num text-[14px]">{p.tag}</span> },
    { clave: "tp", titulo: "Tipo", valor: (p) => p.tipo, render: (p) => <Chip punto={false} tono={p.tipo === "DI" || p.tipo === "AI" ? "info" : "aviso"}>{p.tipo}</Chip> },
    { clave: "e", titulo: "Equipo", valor: (p) => p.equipo, render: (p) => p.equipo ?? "—" },
    { clave: "x", titulo: "Descripción", render: (p) => <span className="text-gris">{p.descripcion}</span> },
    { clave: "v", titulo: "Valor", alinear: "derecha", render: (p) => { const v = io[p.tag]; return v == null ? <span className="text-gris">—</span> : p.tipo === "AI" || p.tipo === "AO" ? <span className="font-semibold">{num(v, 1)} {p.unidad}</span> : <Chip tono={v > 0 ? "ok" : "neutro"} punto={false}>{v > 0 ? "Activa" : "Inactiva"}</Chip>; } },
  ];

  return (
    <>
      <Encabezado atras={<Link href="/plc" className="mb-2 inline-flex items-center gap-1 text-[14px] text-gris hover:text-negro"><ArrowLeft className="size-4" />Controladores PLC</Link>}
        titulo={<span className="flex items-center gap-3"><span className={cx("size-3.5 rounded-full", est.led)} />{data.codigo}</span>}
        descripcion={<span>{data.nombre} · {data.fabricante} {data.modelo} · {data.direccion}</span>}
        acciones={<><Chip tono={est.tono}>{est.texto}</Chip>{ciclos[codigo] != null && <Chip punto={false}>ciclo {ciclos[codigo].toLocaleString("es-CL")}</Chip>}<Chip punto={false}>último dato {hace(data.ultimoContacto)}</Chip></>} />
      <Pestanas id="plc" activa={tab} onCambio={setTab} items={[{ clave: "rack", titulo: "Rack en vivo" }, { clave: "puntos", titulo: "Entradas y salidas", n: data.puntos.length }, { clave: "programa", titulo: "Programa", n: data.programa.peldanos?.length }, ...(puede("plc_comandos", "editar") ? [{ clave: "mandos" as const, titulo: "Mandos" }] : [])]} />
      <div className="mt-5">
        {tab === "rack" && (
          <div className="grid gap-5">
            <Rack modulos={data.modulos} puntos={data.puntos} io={io} estado={estadoKey} />
            {estadoKey === "sin_conexion" && <p className="border-l-[3px] border-ambar bg-ambar-claro px-4 py-3">Este PLC no está conectado. Abra el simulador de PLC y elija {data.codigo} para verlo funcionar aquí.</p>}
            <Seccion titulo="Equipos que controla"><ul className="grid gap-x-8 p-5 pt-3 sm:grid-cols-2">{data.equipos.map((e) => <li key={e.codigo} className="flex items-center justify-between border-b border-linea-suave py-2"><span><b className="num">{e.codigo}</b> <span className="text-gris">{e.nombre}</span></span><Chip punto={false} tono={e.estado === "operando" ? "ok" : e.estado === "alarma" ? "peligro" : "neutro"}>{e.estado.replace("_", " ")}</Chip></li>)}</ul></Seccion>
          </div>
        )}
        {tab === "puntos" && <Seccion><Tabla columnas={colPuntos} filas={data.puntos} clave={(p) => p.id} maxAlto="calc(100dvh - 330px)" /></Seccion>}
        {tab === "programa" && <Seccion titulo="Programa en escalera" derecha={<span className="text-[13px] text-gris">Solo lectura aquí; se edita en el simulador de PLC. Verde: pasa corriente.</span>}><div className="mt-2 max-h-[calc(100dvh-300px)] overflow-auto"><Escalera peldanos={data.programa.peldanos} io={io} /></div></Seccion>}
        {tab === "mandos" && (
          <Seccion titulo="Mandos a distancia" derecha={<span className="text-[13px] text-gris">Envían un pulso a la entrada digital del PLC, como un pulsador.</span>}>
            <ul className="grid gap-3 p-5 sm:grid-cols-2">
              {data.equipos.map((e) => { const base = e.codigo.replace("-", ""); return (
                <li key={e.codigo} className="flex items-center justify-between gap-3 border border-linea p-3"><div><p className="num font-semibold">{e.codigo}</p><p className="text-[13px] text-gris">{e.nombre}</p></div>
                  <div className="flex gap-2"><Boton tam="s" variante="contorno" cargando={orden.isPending && orden.variables?.tag === `${base}_MARCHA`} onClick={() => orden.mutate({ tag: `${base}_MARCHA` })}><Play className="size-3.5" />Marcha</Boton><Boton tam="s" variante="contorno" onClick={() => orden.mutate({ tag: `${base}_PARO` })}><Square className="size-3.5" />Paro</Boton></div></li>); })}
            </ul>
          </Seccion>
        )}
      </div>
    </>
  );
}
