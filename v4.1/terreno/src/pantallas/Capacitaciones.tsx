import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BadgeCheck, CalendarClock, CalendarPlus, Check, Clock, GraduationCap, MapPin, Search, ShieldAlert, Users, X } from "lucide-react";
import { AreaTexto, Boton, Cajon, Campo, Chip, Dialogo, Entrada, Esqueleto, EstadoVista, Seleccion, cx, mensajeDe, useAviso } from "@sima/ui";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { ir } from "../ruta";

interface Persona { id: string; nombre: string; cargo: string; cargoId: number; turno: string }
interface Participante { id: string; nombre?: string | null; cargo?: string | null; rol: string; estado: string; nota: string; respondioEn?: string | null }
interface DatosCap { objetivo?: string; modalidad?: string; material?: string; evaluacion?: boolean; habilitacion?: string; vigenciaMeses?: number; certificados?: { trabajadorId: string; aprobado: boolean; nota: string; por: string }[] }
interface ActCap { id: number; tipo: string; titulo: string; descripcion: string; inicio: string; fin: string; ubicacion: string; estado: string; restricciones: string; creadaPor: string; datos: DatosCap; participantes: Participante[] }
interface Conflicto { trabajadorId: string; persona: string; tipo: string; detalle: string; bloquea: boolean }
const TIPO: Record<string, string> = { charla: "Charla", capacitacion: "Capacitación", induccion: "Inducción", simulacro: "Simulacro" };
const RESP: Record<string, { t: string; tono: "ok" | "aviso" | "peligro" | "info" | "neutro" }> = { convocado: { t: "Sin responder", tono: "neutro" }, confirmado: { t: "Confirmó", tono: "info" }, asistio: { t: "Asistió", tono: "ok" }, ausente: { t: "Ausente", tono: "peligro" }, justificado: { t: "Justificó", tono: "aviso" } };
const dia = (iso: string) => new Date(iso).toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" });
const hm = (iso: string) => new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });
const fechaInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const horaInput = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

// ================================================================================================ prevención
export function Capacitaciones() {
  const [programar, setProgramar] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const [ver, setVer] = useState<"proximas" | "pasadas">("proximas");
  const acts = useQuery({ queryKey: ["prevencion", "actividades"], queryFn: () => api.get<ActCap[]>("/api/prevencion/actividades"), refetchInterval: 20_000 });
  const ahora = Date.now();
  const lista = (acts.data ?? []).filter((a) => (ver === "proximas" ? +new Date(a.fin) >= ahora && a.estado !== "cancelada" : +new Date(a.fin) < ahora || a.estado === "cancelada"));
  if (ver === "pasadas") lista.reverse();
  const actual = (acts.data ?? []).find((a) => a.id === sel) ?? null;
  return (
    <div className="grid gap-4">
      <header className="flex flex-wrap items-end gap-3">
        <div className="mr-auto"><h1 className="t-pantalla">Charlas y capacitaciones</h1><p className="text-[12.5px] text-gris">Al convocar, SIMA revisa la agenda de cada persona en el calendario común. Asistir no certifica: la certificación se registra aparte.</p></div>
        <Boton variante="acento" onClick={() => setProgramar(true)}><CalendarPlus className="size-4" />Programar actividad</Boton>
      </header>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="tarjeta min-w-0 overflow-hidden">
          <div className="flex items-center gap-1 border-b border-linea-suave px-3 py-2" role="tablist">
            {([["proximas", "Próximas"], ["pasadas", "Realizadas y canceladas"]] as const).map(([k, t]) => <button key={k} role="tab" aria-selected={ver === k} onClick={() => setVer(k)} className={cx("h-8 cursor-pointer rounded px-3 text-[12.5px] font-medium", ver === k ? "bg-papel-2 text-negro" : "text-gris hover:text-negro")}>{t}</button>)}
          </div>
          {acts.isError ? <EstadoVista tipo="error" texto="No se pudieron cargar las actividades." /> : acts.isLoading ? <div className="p-4"><Esqueleto className="h-40" /></div> : lista.length === 0 ? <p className="px-4 py-10 text-center text-[12.5px] text-gris">{ver === "proximas" ? "No hay actividades programadas." : "Aún no hay actividades realizadas."}</p> : (
            <ul className="divide-y divide-linea-suave">
              {lista.map((a) => {
                const n = (e: string) => a.participantes.filter((p) => p.rol !== "responsable" && p.estado === e).length;
                const total = a.participantes.filter((p) => p.rol !== "responsable").length;
                return (
                  <li key={a.id}>
                    <button onClick={() => setSel(a.id)} aria-current={sel === a.id ? "true" : undefined} className={cx("flex w-full cursor-pointer gap-3 px-4 py-3 text-left transition-colors duration-150", sel === a.id ? "bg-papel-2" : "hover:bg-papel-2/60")}>
                      <span className="grid w-14 shrink-0 place-items-center rounded-md border border-linea-suave bg-chapa py-1.5 text-center"><span className="text-[10.5px] uppercase text-gris">{new Date(a.inicio).toLocaleDateString("es-CL", { month: "short" })}</span><span className="t-kpi text-[20px] leading-none">{new Date(a.inicio).getDate()}</span><span className="text-[10.5px] text-gris">{hm(a.inicio)}</span></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5"><Chip tono="diag" punto={false}>{TIPO[a.tipo] ?? a.tipo}</Chip>{a.estado === "cancelada" && <Chip tono="neutro">cancelada</Chip>}{a.restricciones && <Chip tono="aviso"><AlertTriangle className="size-3" />con cruces confirmados</Chip>}</span>
                        <span className="mt-1 block truncate text-[13.5px] font-medium">{a.titulo}</span>
                        <span className="mt-0.5 flex flex-wrap gap-x-3 text-[11.5px] text-gris"><span className="inline-flex items-center gap-1"><MapPin className="size-3" />{a.ubicacion || "sin lugar"}</span><span className="inline-flex items-center gap-1"><Users className="size-3" />{total} convocados · {n("confirmado")} confirmaron · {n("justificado")} justificaron{n("asistio") ? ` · ${n("asistio")} asistieron` : ""}</span></span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="tarjeta min-w-0 overflow-hidden">{actual ? <Detalle a={actual} /> : <div className="grid h-full min-h-[300px] place-items-center p-8"><EstadoVista tipo="vacio" titulo="Elija una actividad" texto="Verá a quiénes convocó, quién confirmó o justificó, podrá registrar la asistencia y luego certificar a quienes aprobaron." /></div>}</section>
      </div>
      {programar && <Programar onCerrar={() => setProgramar(false)} alCrear={(id) => { setProgramar(false); setSel(id); }} />}
    </div>
  );
}

function Detalle({ a }: { a: ActCap }) {
  const aviso = useAviso(); const qc = useQueryClient();
  const empezo = +new Date(a.inicio) <= Date.now();
  const [asis, setAsis] = useState<Record<string, string>>({});
  const [cert, setCert] = useState<{ p: Participante; aprobado: boolean } | null>(null);
  const [nota, setNota] = useState("");
  const conv = a.participantes.filter((p) => p.rol !== "responsable");
  const certs = new Map((a.datos.certificados ?? []).map((c) => [c.trabajadorId, c]));
  const refrescar = () => void qc.invalidateQueries({ queryKey: ["prevencion"] });
  const guardarAsis = useMutation({
    mutationFn: () => api.post<{ asistieron: number; nota: string }>(`/api/prevencion/actividades/${a.id}/asistencia`, { registros: Object.entries(asis).map(([trabajadorId, estado]) => ({ trabajadorId, estado, nota: estado === "justificado" ? conv.find((p) => p.id === trabajadorId)?.nota || "Justificada en la sesión" : null })) }),
    onSuccess: (r) => { aviso(`Asistencia guardada: ${r.asistieron} asistieron. ${r.nota}`, "ok"); setAsis({}); refrescar(); }, onError: (e) => aviso(mensajeDe(e), "error"),
  });
  const certificar = useMutation({
    mutationFn: () => api.post<{ habilitacion?: string | null }>(`/api/prevencion/actividades/${a.id}/certificar`, { trabajadorId: cert!.p.id, aprobado: cert!.aprobado, nota }),
    onSuccess: (r) => { aviso(cert!.aprobado ? `Certificado${r.habilitacion ? `: ${r.habilitacion}` : ""}.` : "Registrado como no aprobado.", "ok"); setCert(null); setNota(""); refrescar(); }, onError: (e) => aviso(mensajeDe(e), "error"),
  });
  const cancelar = useMutation({ mutationFn: () => api.post(`/api/prevencion/actividades/${a.id}/cancelar`), onSuccess: () => { aviso("Actividad cancelada; se avisó a los convocados.", "ok"); refrescar(); }, onError: (e) => aviso(mensajeDe(e), "error") });
  return (
    <div className="grid gap-4 p-4">
      <div>
        <p className="flex flex-wrap items-center gap-2 text-[12px] text-gris"><Chip tono="diag" punto={false}>{TIPO[a.tipo]}</Chip><Clock className="size-3.5" />{dia(a.inicio)} · {hm(a.inicio)}–{hm(a.fin)}<MapPin className="ml-1 size-3.5" />{a.ubicacion || "sin lugar"} · {a.datos.modalidad}</p>
        <h2 className="mt-1 text-[17px] font-semibold">{a.titulo}</h2>
        {a.descripcion && <p className="mt-1 text-[13px] text-carbon">{a.descripcion}</p>}
        <p className="mt-1 text-[12px] text-gris">{a.datos.material ? `Material: ${a.datos.material} · ` : ""}{a.datos.evaluacion ? "Con evaluación" : "Sin evaluación"}{a.datos.habilitacion ? ` · Otorga: ${a.datos.habilitacion} (${a.datos.vigenciaMeses} meses)` : ""} · programó {a.creadaPor}</p>
        {a.restricciones && <p className="mt-2 rounded-md border border-ambar/40 bg-ambar-claro px-3 py-2 text-[12px]"><AlertTriangle className="mr-1 inline size-3.5" />{a.restricciones}</p>}
      </div>
      <div className="rounded-md border border-linea-suave">
        <div className="flex items-center gap-2 border-b border-linea-suave px-3 py-2"><p className="t-seccion flex-1">Convocados ({conv.length})</p>{empezo && a.estado !== "cancelada" && <span className="text-[11.5px] text-gris">marque la asistencia y guarde</span>}</div>
        <div className="max-h-[360px] overflow-y-auto">
          <table className="w-full text-[12.5px]">
            <tbody>{conv.map((p) => {
              const c = certs.get(p.id); const marcado = asis[p.id] ?? (["asistio", "ausente", "justificado"].includes(p.estado) ? p.estado : "");
              return (
                <tr key={p.id} className="border-b border-linea-suave/60 last:border-0">
                  <td className="px-3 py-2"><p className="font-medium">{p.nombre}</p><p className="text-[11px] text-gris">{p.cargo}</p>{p.nota && <p className="text-[11px] text-ambar-hondo">«{p.nota}»</p>}</td>
                  <td className="px-3 py-2"><Chip tono={RESP[p.estado]?.tono}>{RESP[p.estado]?.t ?? p.estado}</Chip></td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    {empezo && a.estado !== "cancelada" && !c && (
                      <div className="inline-flex rounded-md border border-linea-suave p-0.5" role="radiogroup" aria-label={`Asistencia de ${p.nombre}`}>
                        {([["asistio", "Asistió"], ["ausente", "Ausente"], ["justificado", "Justificado"]] as const).map(([k, t]) => <button key={k} role="radio" aria-checked={marcado === k} onClick={() => setAsis({ ...asis, [p.id]: k })} className={cx("h-6 cursor-pointer rounded px-2 text-[11.5px]", marcado === k ? (k === "asistio" ? "bg-verde-claro text-verde" : k === "ausente" ? "bg-rojo-claro text-rojo" : "bg-ambar-claro text-ambar-hondo") : "text-gris")}>{t}</button>)}
                      </div>
                    )}
                    {c ? <Chip tono={c.aprobado ? "ok" : "peligro"}>{c.aprobado ? <><BadgeCheck className="size-3" />Certificado</> : "No aprobado"}</Chip>
                      : p.estado === "asistio" && !asis[p.id] && <span className="ml-2 inline-flex gap-1"><Boton tam="s" variante="secundario" onClick={() => setCert({ p, aprobado: true })}>Certificar</Boton><Boton tam="s" variante="texto" onClick={() => setCert({ p, aprobado: false })}>No aprobó</Boton></span>}
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        {Object.keys(asis).length > 0 && <div className="flex items-center justify-end gap-2 border-t border-linea-suave px-3 py-2"><span className="mr-auto text-[11.5px] text-gris">La asistencia queda registrada; no otorga habilitaciones.</span><Boton tam="s" variante="contorno" onClick={() => setAsis({})}>Descartar</Boton><Boton tam="s" variante="acento" cargando={guardarAsis.isPending} onClick={() => guardarAsis.mutate()}>Guardar asistencia</Boton></div>}
      </div>
      {!empezo && a.estado !== "cancelada" && <div className="flex justify-end"><Boton variante="contorno" cargando={cancelar.isPending} onClick={() => cancelar.mutate()}><X className="size-4" />Cancelar actividad</Boton></div>}
      <Dialogo abierto={!!cert} onCerrar={() => setCert(null)} titulo={cert?.aprobado ? `Certificar a ${cert?.p.nombre}` : `No aprobado: ${cert?.p.nombre}`} ancho={460}
        pie={<><Boton variante="contorno" onClick={() => setCert(null)}>Volver</Boton><Boton variante={cert?.aprobado ? "acento" : "peligro"} disabled={!!a.datos.evaluacion && nota.trim().length < 2} cargando={certificar.isPending} onClick={() => certificar.mutate()}>Registrar</Boton></>}>
        <div className="grid gap-3 text-[13px]">
          {cert?.aprobado && a.datos.habilitacion && <p className="rounded-md border border-verde/40 bg-verde-claro px-3 py-2 text-[12.5px]">Se otorgará «{a.datos.habilitacion}» por {a.datos.vigenciaMeses} meses.</p>}
          <Campo etiqueta={a.datos.evaluacion ? "Resultado de la evaluación" : "Nota (opcional)"} obligatorio={!!a.datos.evaluacion}><Entrada value={nota} onChange={(e) => setNota(e.target.value)} placeholder={a.datos.evaluacion ? "Por ejemplo: 6/7 respuestas correctas" : ""} /></Campo>
        </div>
      </Dialogo>
    </div>
  );
}

function Programar({ onCerrar, alCrear }: { onCerrar: () => void; alCrear: (id: number) => void }) {
  const aviso = useAviso(); const qc = useQueryClient();
  const personas = useQuery({ queryKey: ["prevencion", "personas"], queryFn: () => api.get<Persona[]>("/api/prevencion/personas") });
  const base = (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d; })();
  const [f, setF] = useState({ tipo: "charla", titulo: "", objetivo: "", fecha: fechaInput(base), hora: horaInput(base), duracion: 45, ubicacion: "Sala de capacitación", modalidad: "presencial", material: "", evaluacion: false, habilitacion: "", vigenciaMeses: 12 });
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [buscar, setBuscar] = useState(""); const [cargo, setCargo] = useState("");
  const [conf, setConf] = useState<{ error: string; conflictos: Conflicto[]; sugerencias: string[]; requiereConfirmacion: boolean } | null>(null);
  const inicio = new Date(`${f.fecha}T${f.hora}`);
  const cargos = useMemo(() => [...new Set((personas.data ?? []).map((p) => p.cargo))].sort(), [personas.data]);
  const visibles = (personas.data ?? []).filter((p) => (!cargo || p.cargo === cargo) && (!buscar || `${p.nombre} ${p.cargo}`.toLowerCase().includes(buscar.toLowerCase())));
  const verif = useQuery({
    queryKey: ["verificar-cap", elegidos.join(","), inicio.toISOString(), f.duracion],
    queryFn: () => api.post<{ conflictos: Conflicto[]; sugerencias: string[]; disponible: boolean }>("/api/calendario/verificar", { personas: elegidos, inicio: inicio.toISOString(), fin: new Date(inicio.getTime() + f.duracion * 60000).toISOString() }),
    enabled: elegidos.length > 0 && !Number.isNaN(inicio.getTime()),
  });
  const conflictoDe = new Map<string, Conflicto[]>(); for (const c of verif.data?.conflictos ?? []) conflictoDe.set(c.trabajadorId, [...(conflictoDe.get(c.trabajadorId) ?? []), c]);
  const crear = useMutation({
    mutationFn: (confirmar: boolean) => api.post<{ id: number; convocados: number; conflictosConfirmados: number }>("/api/prevencion/actividades", { ...f, inicio: inicio.toISOString(), duracionMin: f.duracion, relator: null, participantes: elegidos, confirmar }),
    onSuccess: (r) => { aviso(`Programada: ${r.convocados} convocados reciben la invitación${r.conflictosConfirmados ? `; ${r.conflictosConfirmados} con cruce (se avisó a su jefatura)` : ""}.`, "ok"); void qc.invalidateQueries({ queryKey: ["prevencion"] }); void qc.invalidateQueries({ queryKey: ["calendario"] }); alCrear(r.id); },
    onError: (e) => { const d = (e as { datos?: typeof conf }).datos; if (d?.conflictos) setConf(d); else aviso(mensajeDe(e), "error"); },
  });
  const usarSugerencia = (s: string) => { const d = new Date(s); setF({ ...f, fecha: fechaInput(d), hora: horaInput(d) }); setConf(null); };
  return (
    <Cajon abierto onCerrar={onCerrar} titulo="Programar actividad de prevención" ancho={680}>
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <Campo etiqueta="Tipo"><Seleccion value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>{Object.entries(TIPO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Seleccion></Campo>
          <Campo etiqueta="Tema" obligatorio><Entrada value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} placeholder="Por ejemplo: Bloqueo y etiquetado en prensas" /></Campo>
        </div>
        <Campo etiqueta="Objetivo"><AreaTexto value={f.objetivo} onChange={(e) => setF({ ...f, objetivo: e.target.value })} className="min-h-14" /></Campo>
        <div className="grid gap-3 sm:grid-cols-4">
          <Campo etiqueta="Fecha" obligatorio><Entrada type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} /></Campo>
          <Campo etiqueta="Hora" obligatorio><Entrada type="time" step={900} value={f.hora} onChange={(e) => setF({ ...f, hora: e.target.value })} /></Campo>
          <Campo etiqueta="Duración"><Seleccion value={f.duracion} onChange={(e) => setF({ ...f, duracion: Number(e.target.value) })}>{[15, 30, 45, 60, 90, 120, 180, 240, 480].map((d) => <option key={d} value={d}>{d < 60 ? `${d} min` : `${d / 60} h`}</option>)}</Seleccion></Campo>
          <Campo etiqueta="Modalidad"><Seleccion value={f.modalidad} onChange={(e) => setF({ ...f, modalidad: e.target.value })}><option value="presencial">Presencial</option><option value="en terreno">En terreno</option><option value="remota">Remota</option></Seleccion></Campo>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Lugar"><Entrada value={f.ubicacion} onChange={(e) => setF({ ...f, ubicacion: e.target.value })} /></Campo>
          <Campo etiqueta="Material"><Entrada value={f.material} onChange={(e) => setF({ ...f, material: e.target.value })} placeholder="Procedimiento, presentación, video…" /></Campo>
        </div>
        <div className="grid gap-3 rounded-md border border-linea-suave p-3 sm:grid-cols-[auto_1fr_120px] sm:items-end">
          <label className="flex cursor-pointer items-center gap-2 text-[13px]"><input type="checkbox" checked={f.evaluacion} onChange={(e) => setF({ ...f, evaluacion: e.target.checked })} className="size-4 accent-[var(--s-acento)]" />Tiene evaluación</label>
          <Campo etiqueta="Habilitación que otorga al aprobar (opcional)"><Entrada value={f.habilitacion} onChange={(e) => setF({ ...f, habilitacion: e.target.value })} placeholder="Por ejemplo: Bloqueo y etiquetado (LOTO)" /></Campo>
          <Campo etiqueta="Vigencia (meses)"><Entrada type="number" min={1} max={60} value={f.vigenciaMeses} onChange={(e) => setF({ ...f, vigenciaMeses: Number(e.target.value) })} /></Campo>
        </div>
        <section className="rounded-md border border-linea-suave">
          <div className="flex flex-wrap items-center gap-2 border-b border-linea-suave px-3 py-2">
            <p className="t-seccion mr-auto">Convocados <span className="num text-gris">{elegidos.length}</span></p>
            <label className="relative"><Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-gris" /><Entrada value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar persona" className="h-7 w-[170px] pl-7 text-[12px]" aria-label="Buscar persona" /></label>
            <Seleccion value={cargo} onChange={(e) => setCargo(e.target.value)} className="h-7 w-auto min-w-[160px] max-w-[220px] text-[12px]" aria-label="Filtrar por cargo"><option value="">Todos los cargos</option>{cargos.map((c) => <option key={c} value={c}>{c}</option>)}</Seleccion>
            <Boton tam="s" variante="texto" onClick={() => setElegidos([...new Set([...elegidos, ...visibles.map((p) => p.id)])])}>Agregar visibles</Boton>
            {elegidos.length > 0 && <Boton tam="s" variante="texto" onClick={() => setElegidos([])}>Quitar todos</Boton>}
          </div>
          <ul className="grid max-h-[220px] overflow-y-auto sm:grid-cols-2">
            {personas.isLoading && <li className="p-3"><Esqueleto className="h-20" /></li>}
            {visibles.map((p) => { const on = elegidos.includes(p.id); const c = conflictoDe.get(p.id); return (
              <li key={p.id}><label className={cx("flex cursor-pointer items-start gap-2 border-b border-linea-suave/50 px-3 py-1.5 text-[12.5px]", on && "bg-acento-claro/50")}>
                <input type="checkbox" checked={on} onChange={() => setElegidos(on ? elegidos.filter((x) => x !== p.id) : [...elegidos, p.id])} className="mt-0.5 size-4 accent-[var(--s-acento)]" />
                <span className="min-w-0 flex-1"><span className="block truncate">{p.nombre}</span><span className="block truncate text-[11px] text-gris" title={p.cargo}>{p.cargo} · turno {p.turno}</span>{on && c && <span className="block text-[11px] text-ambar-hondo" title={c.map((x) => x.detalle).join("; ")}>{c[0].detalle}{c.length > 1 ? ` (+${c.length - 1})` : ""}</span>}</span>
              </label></li>
            ); })}
          </ul>
        </section>
        <section aria-live="polite" className={cx("rounded-md border px-3 py-2.5 text-[12.5px]", !elegidos.length ? "border-linea-suave text-gris" : verif.data?.disponible ? "border-verde/40 bg-verde-claro text-verde" : verif.data ? "border-ambar/40 bg-ambar-claro" : "border-linea-suave text-gris")}>
          {!elegidos.length ? "Elija a quiénes convoca para revisar su disponibilidad." : verif.isFetching && !verif.data ? "Revisando agendas…" : verif.data?.disponible ? <span className="flex items-center gap-1.5"><Check className="size-4" />Todos libres y en turno en ese horario.</span> : verif.data ? (
            <div className="grid gap-2"><p><b className="font-medium">{conflictoDe.size} de {elegidos.length}</b> tienen otra actividad o están fuera de turno. Nada se agenda encima sin su confirmación.</p>
              {verif.data.sugerencias.length > 0 ? <div className="flex flex-wrap items-center gap-1.5"><span className="t-etiqueta">Todos libres:</span>{verif.data.sugerencias.map((s) => <Boton key={s} tam="s" variante="secundario" onClick={() => usarSugerencia(s)}>{dia(s)} {hm(s)}</Boton>)}</div> : <p className="text-gris">No hay un horario común en los próximos 7 días: considere dividir en grupos por turno.</p>}
            </div>
          ) : null}
        </section>
        <div className="sticky bottom-0 -mx-5 flex justify-end gap-2 border-t border-linea-suave bg-papel px-5 py-3">
          <Boton variante="contorno" onClick={onCerrar}>Cancelar</Boton>
          <Boton variante="acento" disabled={!f.titulo.trim() || elegidos.length === 0} cargando={crear.isPending} onClick={() => crear.mutate(false)}><CalendarClock className="size-4" />Programar y convocar</Boton>
        </div>
      </div>
      <Dialogo abierto={!!conf} onCerrar={() => setConf(null)} titulo="Cruces en la agenda" ancho={540}
        pie={<><Boton variante="contorno" onClick={() => setConf(null)}>Volver</Boton>{conf?.requiereConfirmacion && <Boton variante="acento" cargando={crear.isPending} onClick={() => { setConf(null); crear.mutate(true); }}>Convocar igual y avisar</Boton>}</>}>
        {conf && <div className="grid gap-3 text-[13px]">
          <p>{conf.error}</p>
          <ul className="grid max-h-[240px] gap-1.5 overflow-y-auto">{conf.conflictos.map((c, i) => <li key={i} className={cx("flex gap-2 rounded-md border px-3 py-1.5 text-[12.5px]", c.bloquea ? "border-rojo/40 bg-rojo-claro" : "border-ambar/40 bg-ambar-claro")}>{c.bloquea ? <ShieldAlert className="mt-0.5 size-4 shrink-0 text-rojo" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-ambar" />}<span><b className="font-medium">{c.persona}</b>: {c.detalle}</span></li>)}</ul>
          {conf.requiereConfirmacion && <p className="text-[12px] text-gris">Si convoca igual, cada persona con cruce y quien programó la otra actividad reciben un aviso.</p>}
          {conf.sugerencias.length > 0 && <div className="flex flex-wrap gap-1.5">{conf.sugerencias.map((s) => <Boton key={s} tam="s" variante="secundario" onClick={() => usarSugerencia(s)}>{dia(s)} {hm(s)}</Boton>)}</div>}
        </div>}
      </Dialogo>
    </Cajon>
  );
}

// ================================================================================================ agenda personal
interface ItemAgenda { id: number; tipo: string; area: string; titulo: string; descripcion: string; inicio: string; fin: string; ubicacion: string; estado: string; ordenId?: number | null; orden?: string | null; creadaPor: string; rol: string; miEstado: string; miNota: string; convocados: number; datos?: DatosCap | null }
const AREA: Record<string, string> = { mantenimiento: "Mantenimiento", prevencion: "Prevención", produccion: "Producción", personas: "Personas" };

export function MiAgenda() {
  const aviso = useAviso(); const qc = useQueryClient();
  const ag = useQuery({ queryKey: ["yo", "agenda"], queryFn: () => api.get<ItemAgenda[]>("/api/yo/agenda"), refetchInterval: 30_000 });
  const [rechazo, setRechazo] = useState<ItemAgenda | null>(null); const [motivo, setMotivo] = useState("");
  const responder = useMutation({
    mutationFn: (v: { id: number; asistire: boolean; nota?: string }) => api.post(`/api/actividades/${v.id}/responder`, v),
    onSuccess: (_r, v) => { aviso(v.asistire ? "Asistencia confirmada." : "Se avisó a quien la programó.", "ok"); setRechazo(null); setMotivo(""); void qc.invalidateQueries({ queryKey: ["yo", "agenda"] }); }, onError: (e) => aviso(mensajeDe(e), "error"),
  });
  const dias = useMemo(() => { const m = new Map<string, ItemAgenda[]>(); for (const a of ag.data ?? []) { const k = new Date(a.inicio).toDateString(); m.set(k, [...(m.get(k) ?? []), a]); } return [...m.entries()]; }, [ag.data]);
  const hoy = new Date().toDateString();
  return (
    <div className="grid max-w-[920px] gap-4">
      <header><h1 className="t-pantalla">Mi agenda</h1><p className="text-[12.5px] text-gris">Todo lo que tiene programado, venga de mantenimiento, prevención o producción. Confirme o justifique las convocatorias.</p></header>
      {ag.isError ? <EstadoVista tipo="error" texto="No se pudo cargar su agenda." /> : ag.isLoading ? <Esqueleto className="h-48" /> : dias.length === 0 ? <div className="tarjeta p-8"><EstadoVista tipo="vacio" titulo="Sin actividades" texto="No tiene trabajos ni capacitaciones programados en los próximos 30 días." /></div> : dias.map(([k, items]) => (
        <section key={k} className="grid gap-2">
          <p className={cx("t-etiqueta", k === hoy && "text-acento")}>{k === hoy ? "Hoy · " : ""}{new Date(items[0].inicio).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}</p>
          {items.map((a) => (
            <article key={a.id} className={cx("tarjeta flex flex-wrap items-center gap-3 border-l-[3px] px-4 py-3", a.area === "prevencion" ? "border-l-[var(--s-diagnostico)]" : a.area === "mantenimiento" ? "border-l-[var(--s-ambar)]" : "border-l-[var(--s-azul)]")}>
              <span className="w-[92px] shrink-0 text-[13px]"><b className="num font-semibold">{hm(a.inicio)}</b><span className="text-gris">–{hm(a.fin)}</span></span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-gris">{a.area === "prevencion" ? <GraduationCap className="size-3.5" /> : <CalendarClock className="size-3.5" />}{AREA[a.area] ?? a.area} · {a.area === "prevencion" ? TIPO[a.tipo] : a.orden ?? a.tipo}{a.ubicacion && ` · ${a.ubicacion}`}</span>
                <span className="block truncate text-[13.5px] font-medium">{a.titulo}</span>
                {a.datos?.objetivo && <span className="block truncate text-[12px] text-gris">{a.datos.objetivo}</span>}
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {a.area === "prevencion" && a.rol !== "responsable" ? (
                  a.miEstado === "convocado" ? <><Boton tam="s" variante="acento" cargando={responder.isPending && responder.variables?.id === a.id} onClick={() => responder.mutate({ id: a.id, asistire: true })}><Check className="size-3.5" />Asistiré</Boton><Boton tam="s" variante="contorno" onClick={() => setRechazo(a)}>No puedo</Boton></>
                    : <Chip tono={RESP[a.miEstado]?.tono}>{RESP[a.miEstado]?.t ?? a.miEstado}</Chip>
                ) : a.ordenId ? <Boton tam="s" variante="secundario" onClick={() => ir(`/mantenimiento?orden=${a.ordenId}`)}>Abrir orden</Boton> : <Chip tono="neutro">{a.rol}</Chip>}
              </span>
            </article>
          ))}
        </section>
      ))}
      <Dialogo abierto={!!rechazo} onCerrar={() => setRechazo(null)} titulo="No podré asistir" ancho={460}
        pie={<><Boton variante="contorno" onClick={() => setRechazo(null)}>Volver</Boton><Boton variante="acento" disabled={motivo.trim().length < 3} cargando={responder.isPending} onClick={() => rechazo && responder.mutate({ id: rechazo.id, asistire: false, nota: motivo })}>Enviar</Boton></>}>
        <Campo etiqueta="Motivo" obligatorio><AreaTexto value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Por ejemplo: estoy asignado a una OT en ese horario" className="min-h-16" /></Campo>
      </Dialogo>
    </div>
  );
}
