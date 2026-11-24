"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowLeft, Cpu, GitPullRequest, Maximize2, Minus, Play, Plus, Search, Square, Zap } from "lucide-react";
import { hace, num, serie, type PlcDetalle, type PlcResumen } from "@sima/cliente";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usePlanta } from "@/lib/planta";
import { Divisor, ESTADO_PLC, Escalera, Medidor, Rack, useTamanoArrastrable } from "@/components/plc";
import { Boton, Chip, ErrorCarga, Esqueleto, Tarjeta, cx, mensajeDe, useAviso } from "@/components/ui";

interface Cambio { id: number; plc: string; resumen: string; justificacion: string; estado: string; solicitadoPor: string; fecha: string; revisadoPor?: string | null; versionPublicada?: number | null; origen: string }
type Panel = "puntos" | "equipos" | "mandos" | "cambios";

export default function Pagina() {
  return <Suspense fallback={<Esqueleto className="h-[70vh]" />}><EspacioPlc /></Suspense>;
}

function EspacioPlc() {
  const codigo = useSearchParams().get("codigo") ?? "";
  const { tiene } = useAuth();
  const { io: ioVivo, plcEstado, ciclos, equipos: eqVivos } = usePlanta();
  const aviso = useAviso();
  const [panel, setPanel] = useState<Panel>("puntos");
  const [tipo, setTipo] = useState<"" | "DI" | "DO" | "AI" | "AO">("");
  const [buscar, setBuscar] = useState("");
  const [zoom, setZoom] = useState(1);
  const [escalaRack, setEscalaRack] = useState(1);
  const [sel, setSel] = useState<string | null>(null);
  const [soloActivos, setSoloActivos] = useState(false);
  const lateral = useTamanoArrastrable("sima.plc.lateral", 440, 320, 720, "x", true);
  const alto = useTamanoArrastrable("sima.plc.rack", 330, 200, 620, "y");

  const lista = useQuery({ queryKey: ["plc"], queryFn: () => api.get<PlcResumen[]>("/api/plc"), refetchInterval: 8000 });
  const { data, error, refetch } = useQuery({ queryKey: ["plc", codigo], queryFn: () => api.get<PlcDetalle>(`/api/plc/${codigo}`), refetchInterval: 8000, enabled: !!codigo });
  const cambios = useQuery({ queryKey: ["cambios"], queryFn: () => api.get<Cambio[]>("/api/plc/cambios"), enabled: panel === "cambios" });
  const orden = useMutation({
    mutationFn: (v: { tag: string }) => api.post(`/api/plc/${codigo}/comandos`, { tag: v.tag, valor: 1 }),
    onSuccess: (_, v) => aviso(`Pulso enviado a ${v.tag}.`), onError: (e) => aviso(mensajeDe(e), "error"),
  });
  useEffect(() => { setSel(null); }, [codigo]);

  const io = useMemo(() => ({ ...(data?.io ?? {}), ...(ioVivo[codigo] ?? {}) }), [data?.io, ioVivo, codigo]);
  if (error) return <ErrorCarga error={error} reintentar={() => void refetch()} />;
  if (!data) return <div className="grid gap-4"><Esqueleto className="h-14" /><div className="grid gap-4 lg:grid-cols-[1fr_420px]"><Esqueleto className="h-[65vh]" /><Esqueleto className="h-[65vh]" /></div></div>;

  const estadoKey = data.estado === "sin_conexion" ? "sin_conexion" : plcEstado[codigo] ?? data.estado;
  const est = ESTADO_PLC[estadoKey] ?? ESTADO_PLC.sin_conexion;
  const puntos = data.puntos.filter((p) => (!tipo || p.tipo === tipo) && (!buscar || `${p.tag} ${p.descripcion} ${p.direccion} ${p.equipo ?? ""}`.toLowerCase().includes(buscar.toLowerCase())));
  const activos = data.puntos.filter((p) => (p.tipo === "DI" || p.tipo === "DO") && (io[p.tag] ?? 0) > 0).length;
  const peldanos = soloActivos ? data.programa.peldanos.filter((p) => serie(p.condiciones, io)) : data.programa.peldanos;
  const misEquipos = eqVivos.filter((e) => data.equipos.some((x) => x.codigo === e.codigo));

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100dvh-64px-56px)]">
      {/* barra superior del espacio de trabajo */}
      <Tarjeta className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
        <Link href="/plc" className="inline-flex items-center gap-1.5 text-[13.5px] text-gris hover:text-negro"><ArrowLeft className="size-4" />PLC</Link>
        <div className="flex items-center gap-3">
          <span className={cx("size-3.5 rounded-full", est.led)} />
          <div><p className="display text-[26px] font-extrabold leading-none">{data.codigo}</p><p className="text-[13px] text-gris">{data.nombre} · {data.fabricante} {data.modelo}</p></div>
        </div>
        <nav aria-label="Cambiar de PLC" className="flex flex-wrap gap-1.5">
          {(lista.data ?? []).map((p) => {
            const e = ESTADO_PLC[p.estado !== "sin_conexion" ? plcEstado[p.codigo] ?? p.estado : p.estado] ?? ESTADO_PLC.sin_conexion;
            return (
              <Link key={p.codigo} href={`/plc/equipo?codigo=${p.codigo}`} className={cx("relative inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors", p.codigo === codigo ? "text-sobre-negro" : "bg-papel-2 hover:bg-linea-suave")}>
                {p.codigo === codigo && <motion.span layoutId="plc-activo" className="absolute inset-0 rounded-full bg-acento" transition={{ duration: 0.2 }} />}
                <span className="relative size-2 rounded-full" style={{ background: e.color }} /><span className="relative">{p.codigo}</span>
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Chip tono={est.tono}>{est.texto}</Chip>
          {ciclos[codigo] != null && <Chip punto={false}>ciclo {ciclos[codigo].toLocaleString("es-CL")}</Chip>}
          <Chip punto={false}>programa v{data.version ?? 1}</Chip>
          <Chip punto={false} tono="info">{activos} señales activas</Chip>
          <span className="text-[12.5px] text-gris">dato {hace(data.ultimoContacto)}</span>
        </div>
      </Tarjeta>

      {estadoKey === "sin_conexion" && (
        <p className="rounded-2xl border border-ambar/30 bg-ambar-claro px-4 py-2.5 text-[14px] text-ambar-hondo">
          {data.codigo} no está conectado. Abra el simulador de PLC, elija {data.codigo} y pulse «Conectar con SIMA»: el rack, las entradas y la escalera se mueven aquí en vivo.
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:gap-0">
        {/* izquierda: rack + escalera */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 shrink-0 overflow-auto rounded-2xl lg:h-[var(--alto-rack)]" style={{ ["--alto-rack" as string]: `${alto.tam}px` }}>
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <p className="flex items-center gap-2 text-[13.5px] font-semibold"><Cpu className="size-4 text-acento" />Rack en vivo <span className="font-normal text-gris">· toque un canal para seguirlo en la escalera</span></p>
              <div className="flex items-center gap-1">
                <button className="grid size-7 cursor-pointer place-items-center rounded-lg bg-papel-2 hover:bg-linea-suave" onClick={() => setEscalaRack((z) => Math.max(0.7, +(z - 0.1).toFixed(1)))} aria-label="Achicar rack"><Minus className="size-3.5" /></button>
                <span className="num w-10 text-center text-[12px] text-gris">{Math.round(escalaRack * 100)}%</span>
                <button className="grid size-7 cursor-pointer place-items-center rounded-lg bg-papel-2 hover:bg-linea-suave" onClick={() => setEscalaRack((z) => Math.min(1.6, +(z + 0.1).toFixed(1)))} aria-label="Agrandar rack"><Plus className="size-3.5" /></button>
              </div>
            </div>
            <Rack modulos={data.modulos} puntos={data.puntos} io={io} estado={estadoKey} escala={escalaRack} seleccionado={sel} alElegir={(t) => { setSel((s) => (s === t ? null : t)); setPanel("puntos"); }} />
          </div>
          <Divisor eje="y" className="hidden lg:flex" {...alto.divisor} />
          <Tarjeta brillo={false} className="flex min-h-[420px] flex-1 flex-col overflow-hidden lg:min-h-0">
            <div className="flex flex-wrap items-center gap-3 border-b border-linea-suave px-4 py-2.5">
              <p className="flex items-center gap-2 font-semibold"><Zap className="size-4 text-verde" />Programa en escalera</p>
              <span className="text-[12.5px] text-gris">{data.programa.peldanos.length} peldaños · verde = pasa corriente</span>
              {sel && <Chip tono="acento" punto={false}>siguiendo {sel}</Chip>}
              <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-[13px]"><input type="checkbox" checked={soloActivos} onChange={(e) => setSoloActivos(e.target.checked)} className="accent-[var(--s-acento)]" />Solo peldaños con corriente</label>
              <div className="flex items-center gap-1">
                <button className="grid size-7 cursor-pointer place-items-center rounded-lg bg-papel-2 hover:bg-linea-suave" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(1)))} aria-label="Alejar"><Minus className="size-3.5" /></button>
                <span className="num w-10 text-center text-[12px] text-gris">{Math.round(zoom * 100)}%</span>
                <button className="grid size-7 cursor-pointer place-items-center rounded-lg bg-papel-2 hover:bg-linea-suave" onClick={() => setZoom((z) => Math.min(1.8, +(z + 0.1).toFixed(1)))} aria-label="Acercar"><Plus className="size-3.5" /></button>
                <button className="grid size-7 cursor-pointer place-items-center rounded-lg bg-papel-2 hover:bg-linea-suave" onClick={() => setZoom(1)} aria-label="Tamaño normal"><Maximize2 className="size-3.5" /></button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4"><Escalera peldanos={peldanos} io={io} zoom={zoom} resaltar={sel} /></div>
          </Tarjeta>
        </div>

        <Divisor eje="x" className="hidden lg:flex" {...lateral.divisor} />

        {/* derecha: paneles */}
        <Tarjeta brillo={false} className="flex min-h-[480px] w-full flex-col overflow-hidden lg:min-h-0 lg:w-[var(--ancho-panel)] lg:shrink-0" style={{ ["--ancho-panel" as string]: `${lateral.tam}px` }}>
          <div className="flex gap-1 border-b border-linea-suave p-2">
            {([["puntos", `Entradas y salidas · ${data.puntos.length}`], ["equipos", "Equipos"], ...(tiene("plc_comandos.editar") ? [["mandos", "Mandos"]] : []), ["cambios", "Cambios"]] as [Panel, string][]).map(([k, t]) => (
              <button key={k} onClick={() => setPanel(k)} className={cx("relative h-9 flex-1 cursor-pointer whitespace-nowrap rounded-xl px-2.5 text-[13px] font-medium transition-colors", panel === k ? "text-sobre-negro" : "text-gris hover:text-negro")}>
                {panel === k && <motion.span layoutId="plc-panel" className="absolute inset-0 rounded-xl bg-negro" transition={{ duration: 0.2 }} />}<span className="relative">{t}</span>
              </button>
            ))}
          </div>

          {panel === "puntos" && <>
            <div className="space-y-2 border-b border-linea-suave p-3">
              <label className="relative block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gris" /><input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar etiqueta, dirección o equipo" className="h-9 w-full rounded-xl border border-linea bg-papel-2 pl-9 pr-3 text-[13.5px] outline-none focus:border-acento" /></label>
              <div className="flex gap-1.5">{(["", "DI", "DO", "AI", "AO"] as const).map((t) => <button key={t || "todos"} onClick={() => setTipo(t)} className={cx("h-7 cursor-pointer rounded-full px-3 text-[12.5px] font-medium", tipo === t ? "bg-acento text-sobre-negro" : "bg-papel-2 hover:bg-linea-suave")}>{t || "Todos"}</button>)}</div>
            </div>
            <ul className="min-h-0 flex-1 divide-y divide-linea-suave overflow-y-auto">
              {puntos.map((p) => {
                const v = io[p.tag];
                const dig = p.tipo === "DI" || p.tipo === "DO";
                const on = dig && (v ?? 0) > 0;
                return (
                  <li key={p.id}>
                    <button onClick={() => setSel((s) => (s === p.tag ? null : p.tag))} className={cx("flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-papel-2", sel === p.tag && "bg-acento-claro")}>
                      <span className={cx("grid h-6 w-9 shrink-0 place-items-center rounded-md text-[10.5px] font-bold", p.tipo === "DI" ? "bg-verde-claro text-verde" : p.tipo === "DO" ? "bg-ambar-claro text-ambar" : "bg-azul-claro text-azul")}>{p.tipo}</span>
                      <span className="min-w-0 flex-1"><span className="flex items-baseline gap-2"><span className="truncate font-mono text-[12.5px] font-semibold">{p.tag}</span><span className="num shrink-0 text-[11.5px] text-gris">{p.direccion}</span></span><span className="block truncate text-[12.5px] text-gris">{p.descripcion}{p.equipo ? ` · ${p.equipo}` : ""}</span></span>
                      {dig ? <span className={cx("size-3 shrink-0 rounded-full", on ? (p.tipo === "DI" ? "bg-verde" : "bg-ambar") : "bg-linea")} />
                        : <span className="num shrink-0 text-[13px] font-semibold">{v == null ? "—" : num(v, 1)} <span className="font-normal text-gris">{p.unidad}</span></span>}
                    </button>
                  </li>
                );
              })}
              {puntos.length === 0 && <li className="p-8 text-center text-[14px] text-gris">Ningún punto coincide.</li>}
            </ul>
          </>}

          {panel === "equipos" && (
            <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
              {misEquipos.map((e) => (
                <li key={e.codigo} className="rounded-2xl border border-linea-suave bg-papel-2/50 p-4">
                  <div className="mb-3 flex items-start justify-between gap-2"><div><p className="num font-bold">{e.codigo}</p><p className="text-[13px] text-gris">{e.nombre} · {e.tipo}</p></div><Chip tono={e.estado === "operando" ? "ok" : e.estado === "alarma" ? "peligro" : e.estado === "en_mantencion" ? "aviso" : "neutro"}>{e.estado.replace("_", " ")}</Chip></div>
                  <div className="space-y-3">{e.sensores.map((s) => <Medidor key={s.variable} s={s} />)}</div>
                </li>
              ))}
            </ul>
          )}

          {panel === "mandos" && (
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <p className="mb-3 text-[13px] text-gris">Cada botón envía un pulso a la entrada digital del PLC, como un pulsador en el tablero. Queda registrado en la auditoría.</p>
              <ul className="space-y-2.5">
                {data.equipos.map((e) => { const base = e.codigo.replace("-", ""); return (
                  <li key={e.codigo} className="flex items-center justify-between gap-3 rounded-2xl border border-linea-suave p-3"><div><p className="num font-semibold">{e.codigo}</p><p className="text-[12.5px] text-gris">{e.nombre}</p></div>
                    <div className="flex gap-2"><Boton tam="s" variante="acento" cargando={orden.isPending && orden.variables?.tag === `${base}_MARCHA`} onClick={() => orden.mutate({ tag: `${base}_MARCHA` })}><Play className="size-3.5" />Marcha</Boton><Boton tam="s" variante="peligro" onClick={() => orden.mutate({ tag: `${base}_PARO` })}><Square className="size-3.5" />Paro</Boton></div></li>); })}
              </ul>
            </div>
          )}

          {panel === "cambios" && (
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <p className="mb-3 rounded-xl bg-papel-2 p-3 text-[13px] text-carbon"><GitPullRequest className="mr-1 inline size-4 text-acento" />El programa se edita en el simulador de PLC. Al guardarlo se crea una solicitud de cambio, y solo se publica cuando la aprueba otra persona con esa facultad.</p>
              <ul className="space-y-2.5">
                {(cambios.data ?? []).filter((c) => c.plc === codigo).map((c) => (
                  <li key={c.id}><Link href={`/mantenimiento?cambio=${c.id}`} className="block rounded-2xl border border-linea-suave p-3 transition-colors hover:border-acento/40">
                    <div className="flex items-center justify-between gap-2"><p className="font-semibold">{c.resumen}</p><Chip tono={c.estado === "aprobado" ? "ok" : c.estado === "rechazado" ? "peligro" : "aviso"}>{c.estado}</Chip></div>
                    <p className="mt-1 text-[12.5px] text-gris">{c.solicitadoPor} · {hace(c.fecha)}{c.revisadoPor ? ` · revisó ${c.revisadoPor}` : ""}{c.versionPublicada ? ` · v${c.versionPublicada}` : ""}</p>
                  </Link></li>
                ))}
                {cambios.data && cambios.data.filter((c) => c.plc === codigo).length === 0 && <li className="p-6 text-center text-[14px] text-gris">Este PLC no tiene cambios solicitados.</li>}
              </ul>
            </div>
          )}
        </Tarjeta>
      </div>
    </div>
  );
}
