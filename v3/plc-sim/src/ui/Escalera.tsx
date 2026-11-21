import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Save, Trash2, Undo2, X } from "lucide-react";
import { pasa, serie, type Condicion, type Peldano, type ProgramaPlc, type Salida } from "@sima/cliente";
import { useSim } from "../simulador";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const VERDE = "#2fc77a", APAGADO = "#4b505a";

// ------------------------------------------------------------------------------------------ dibujo
function Elemento({ c, v, entra }: { c: Condicion; v: Record<string, number>; entra: boolean }) {
  if (c.tipo === "OR") return <div className="flex flex-col justify-center py-1">{c.ramas.map((r, i) => <div key={i} className="flex items-center"><Serie cs={r} v={v} entra={entra} /></div>)}</div>;
  const ok = pasa(c, v);
  const linea = entra && ok ? VERDE : APAGADO, trazo = ok ? VERDE : APAGADO;
  return (
    <div className="flex flex-col items-center px-0.5" title={c.tipo === "CMP" ? `${c.tag} ${c.op} ${c.valor}` : c.tag}>
      <span className="mono max-w-[116px] truncate text-[10px] leading-none text-tenue">{c.tag}</span>
      <svg width="74" height="26" viewBox="0 0 74 26" className="mt-1" aria-hidden>
        <line x1="0" y1="13" x2="25" y2="13" stroke={linea} strokeWidth="2" /><line x1="49" y1="13" x2="74" y2="13" stroke={linea} strokeWidth="2" />
        {c.tipo === "CMP" ? <><rect x="25" y="3" width="24" height="20" fill={ok ? "#143524" : "#17191d"} stroke={linea} strokeWidth="2" /><text x="37" y="17" textAnchor="middle" fontSize="11" fontWeight="700" fill="#e8eaee">{c.op}</text></>
          : <><line x1="25" y1="3" x2="25" y2="23" stroke={trazo} strokeWidth="3" /><line x1="49" y1="3" x2="49" y2="23" stroke={trazo} strokeWidth="3" />{c.tipo === "NC" && <line x1="22" y1="21" x2="52" y2="5" stroke={trazo} strokeWidth="2" />}</>}
      </svg>
      {c.tipo === "CMP" && <span className="mono text-[10px] leading-none text-tenue">{c.valor}</span>}
    </div>
  );
}
function Serie({ cs, v, entra }: { cs: Condicion[]; v: Record<string, number>; entra: boolean }) {
  let pasando = entra;
  return <>{cs.map((c, i) => { const e = pasando; pasando = pasando && pasa(c, v); return <Elemento key={i} c={c} v={v} entra={e} />; })}</>;
}
function Bobina({ s, energia, v }: { s: Salida; energia: boolean; v: Record<string, number> }) {
  const color = energia ? VERDE : APAGADO;
  const caja = s.tipo === "TON" || s.tipo === "CTU";
  return (
    <div className="flex flex-col items-center pl-0.5" title={s.tag}>
      <span className="mono max-w-[130px] truncate text-[10px] leading-none text-tenue">{s.tag}</span>
      <svg width="82" height="26" viewBox="0 0 82 26" className="mt-1" aria-hidden>
        <line x1="0" y1="13" x2="21" y2="13" stroke={color} strokeWidth="2" />
        {caja ? <rect x="21" y="2" width="58" height="22" fill={energia ? "#143524" : "#17191d"} stroke={color} strokeWidth="2" />
          : <><path d="M29 3 Q21 13 29 23" fill="none" stroke={color} strokeWidth="2.5" /><path d="M51 3 Q59 13 51 23" fill="none" stroke={color} strokeWidth="2.5" /></>}
        <text x={caja ? 50 : 40} y="17" textAnchor="middle" fontSize="11" fontWeight="700" fill="#e8eaee">{s.tipo === "BOBINA" ? "" : s.tipo === "SET" ? "S" : s.tipo === "RESET" ? "R" : s.tipo}</text>
      </svg>
      {s.tipo === "TON" && <span className="mono text-[10px] leading-none text-tenue">{Math.round(v[`${s.tag}.ACC`] ?? 0)}/{s.preset} ms</span>}
    </div>
  );
}

// ------------------------------------------------------------------------------------------ editor
const CAMPO = "h-7 border border-borde bg-panel px-1.5 text-[12px] outline-none focus:border-rojo-vivo";
function EditorElemento({ c, cambiar, quitar }: { c: Condicion; cambiar: (c: Condicion) => void; quitar: () => void }) {
  if (c.tipo === "OR") {
    return (
      <div className="border border-borde bg-panel2 p-1.5">
        <p className="mb-1 flex items-center justify-between text-[11px] text-tenue">Ramas en paralelo (o)<button onClick={quitar} aria-label="Quitar ramas" className="cursor-pointer hover:text-rojo-vivo"><X className="size-3.5" /></button></p>
        {c.ramas.map((r, i) => (
          <div key={i} className="mb-1 border-l-2 border-borde pl-2">
            <EditorSerie cs={r} cambiar={(n) => cambiar({ ...c, ramas: c.ramas.map((x, j) => (j === i ? n : x)).filter((x) => x.length > 0) })} />
          </div>
        ))}
        <button onClick={() => cambiar({ ...c, ramas: [...c.ramas, [{ tipo: "NA", tag: "" }]] })} className="cursor-pointer text-[11px] text-led-azul hover:underline">+ rama</button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <select className={CAMPO} value={c.tipo} aria-label="Tipo de elemento" onChange={(e) => cambiar(e.target.value === "CMP" ? { tipo: "CMP", tag: c.tag, op: ">=", valor: 0 } : { tipo: e.target.value as "NA" | "NC", tag: c.tag })}>
        <option value="NA">Contacto abierto</option><option value="NC">Contacto cerrado</option><option value="CMP">Comparar</option>
      </select>
      <input className={cx(CAMPO, "mono w-[170px]")} list="etiquetas" value={c.tag} placeholder="etiqueta" aria-label="Etiqueta" onChange={(e) => cambiar({ ...c, tag: e.target.value })} />
      {c.tipo === "CMP" && <>
        <select className={CAMPO} value={c.op} aria-label="Operador" onChange={(e) => cambiar({ ...c, op: e.target.value as typeof c.op })}>{[">=", "<=", ">", "<", "=="].map((o) => <option key={o}>{o}</option>)}</select>
        <input className={cx(CAMPO, "mono w-[70px]")} type="number" step="any" value={c.valor} aria-label="Valor" onChange={(e) => cambiar({ ...c, valor: Number(e.target.value) })} />
      </>}
      <button onClick={quitar} aria-label="Quitar elemento" className="grid size-7 cursor-pointer place-items-center text-tenue hover:text-rojo-vivo"><X className="size-3.5" /></button>
    </div>
  );
}
function EditorSerie({ cs, cambiar }: { cs: Condicion[]; cambiar: (c: Condicion[]) => void }) {
  return (
    <div className="space-y-1">
      {cs.map((c, i) => <EditorElemento key={i} c={c} cambiar={(n) => cambiar(cs.map((x, j) => (j === i ? n : x)))} quitar={() => cambiar(cs.filter((_, j) => j !== i))} />)}
      <div className="flex gap-3 text-[11px] text-led-azul"><button className="cursor-pointer hover:underline" onClick={() => cambiar([...cs, { tipo: "NA", tag: "" }])}>+ contacto</button><button className="cursor-pointer hover:underline" onClick={() => cambiar([...cs, { tipo: "OR", ramas: [[{ tipo: "NA", tag: "" }], [{ tipo: "NA", tag: "" }]] }])}>+ ramas en paralelo</button></div>
    </div>
  );
}
function EditorSalida({ s, cambiar }: { s: Salida; cambiar: (s: Salida) => void }) {
  return (
    <div className="flex items-center gap-1">
      <select className={CAMPO} value={s.tipo} aria-label="Tipo de salida" onChange={(e) => { const t = e.target.value; cambiar(t === "TON" ? { tipo: "TON", tag: s.tag, preset: 2000 } : { tipo: t as "BOBINA" | "SET" | "RESET", tag: s.tag }); }}>
        <option value="BOBINA">Bobina</option><option value="SET">Enclavar (S)</option><option value="RESET">Desenclavar (R)</option><option value="TON">Temporizador (TON)</option>
      </select>
      <input className={cx(CAMPO, "mono w-[170px]")} list="etiquetas" value={s.tag} placeholder="etiqueta" aria-label="Etiqueta de salida" onChange={(e) => cambiar({ ...s, tag: e.target.value })} />
      {s.tipo === "TON" && <label className="flex items-center gap-1 text-[11px] text-tenue">retardo<input className={cx(CAMPO, "mono w-[74px]")} type="number" min={0} value={s.preset} onChange={(e) => cambiar({ ...s, preset: Number(e.target.value) })} />ms</label>}
    </div>
  );
}

// ------------------------------------------------------------------------------------------ panel completo
export function Escalera() {
  const s = useSim();
  const [editar, setEditar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cfg = s.config;
  if (!cfg) return null;
  const prog = cfg.programa;
  const etiquetas = [...cfg.puntos.map((p) => p.tag), ...prog.variables.map((v) => v.nombre)];

  const cambiar = (f: (p: ProgramaPlc) => void) => {
    const n = structuredClone(prog);
    f(n);
    // las etiquetas nuevas de salida pasan a ser variables del programa
    const conocidas = new Set([...cfg.puntos.map((p) => p.tag), ...n.variables.map((v) => v.nombre)]);
    for (const pe of n.peldanos) if (pe.salida.tag && !conocidas.has(pe.salida.tag)) { n.variables.push({ nombre: pe.salida.tag, tipo: pe.salida.tipo === "TON" ? "timer" : "bool", preset: pe.salida.tipo === "TON" ? pe.salida.preset : undefined }); conocidas.add(pe.salida.tag); }
    s.setPrograma(n);
  };
  const mover = (i: number, d: number) => cambiar((p) => { const j = i + d; if (j < 0 || j >= p.peldanos.length) return; [p.peldanos[i], p.peldanos[j]] = [p.peldanos[j], p.peldanos[i]]; });
  const nuevo = () => cambiar((p) => { p.peldanos.push({ id: Math.max(0, ...p.peldanos.map((x) => x.id)) + 1, comentario: "Peldaño nuevo", condiciones: [{ tipo: "NA", tag: "" }], salida: { tipo: "BOBINA", tag: "" } }); });
  const guardar = async () => { setGuardando(true); setError(null); try { await s.guardarPrograma(); } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar."); } finally { setGuardando(false); } };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-borde px-3 py-2">
        <button onClick={() => setEditar(!editar)} aria-pressed={editar} className={cx("flex h-8 cursor-pointer items-center gap-1.5 border px-3 text-[13px] font-medium transition-colors", editar ? "border-rojo bg-rojo text-white" : "border-borde hover:border-tenue")}><Pencil className="size-3.5" />{editar ? "Editando" : "Editar programa"}</button>
        {editar && <button onClick={nuevo} className="flex h-8 cursor-pointer items-center gap-1.5 border border-borde px-3 text-[13px] hover:border-tenue"><Plus className="size-3.5" />Peldaño</button>}
        <span className="ml-auto flex items-center gap-2">
          {s.programaPropio && !s.programaSucio && <button onClick={() => void s.restablecerPrograma()} className="flex h-8 cursor-pointer items-center gap-1.5 border border-borde px-3 text-[13px] text-tenue hover:border-tenue hover:text-texto">Volver al programa original</button>}
          {s.programaSucio && <span className="text-[12px] text-led-ambar">Cambios sin guardar</span>}
          <button disabled={!s.programaSucio} onClick={() => void s.descartarPrograma()} className="flex h-8 cursor-pointer items-center gap-1.5 border border-borde px-3 text-[13px] hover:border-tenue disabled:pointer-events-none disabled:opacity-40"><Undo2 className="size-3.5" />Descartar</button>
          <button disabled={!s.programaSucio || guardando} onClick={() => void guardar()} className="flex h-8 cursor-pointer items-center gap-1.5 bg-led-verde px-3 text-[13px] font-semibold text-black disabled:pointer-events-none disabled:opacity-40"><Save className="size-3.5" />{s.conSima ? "Guardar en SIMA" : "Guardar"}</button>
        </span>
      </div>
      {error && <p role="alert" className="border-b border-rojo bg-[#3a1416] px-3 py-1.5 text-[12px] text-rojo-vivo">{error}</p>}
      <datalist id="etiquetas">{etiquetas.map((t) => <option key={t} value={t} />)}</datalist>
      <ol className="flex-1 divide-y divide-borde overflow-auto">
        {prog.peldanos.map((p: Peldano, i) => {
          const energia = serie(p.condiciones, s.imagen);
          return (
            <li key={p.id} className="px-3 py-2.5">
              {editar ? (
                <div className="mb-2 flex items-center gap-2">
                  <span className="mono w-6 text-[12px] text-tenue">{i + 1}</span>
                  <input className={cx(CAMPO, "flex-1")} value={p.comentario} aria-label="Comentario del peldaño" onChange={(e) => cambiar((n) => { n.peldanos[i].comentario = e.target.value; })} />
                  <button onClick={() => mover(i, -1)} aria-label="Subir" className="grid size-7 cursor-pointer place-items-center text-tenue hover:text-texto"><ArrowUp className="size-4" /></button>
                  <button onClick={() => mover(i, 1)} aria-label="Bajar" className="grid size-7 cursor-pointer place-items-center text-tenue hover:text-texto"><ArrowDown className="size-4" /></button>
                  <button onClick={() => cambiar((n) => { n.peldanos.splice(i, 1); })} aria-label="Eliminar peldaño" className="grid size-7 cursor-pointer place-items-center text-tenue hover:text-rojo-vivo"><Trash2 className="size-4" /></button>
                </div>
              ) : <p className="mb-1 text-[12px] text-tenue"><span className="mono font-semibold text-texto">{i + 1}</span> {p.comentario}</p>}
              <div className="flex items-stretch overflow-x-auto pb-1">
                <span className="mr-1 w-[3px] shrink-0 self-stretch" style={{ background: energia ? VERDE : APAGADO }} />
                <div className="flex items-center"><Serie cs={p.condiciones} v={s.imagen} entra /></div>
                <span className="mt-[19px] h-[2px] min-w-6 flex-1 self-start" style={{ background: energia ? VERDE : APAGADO }} />
                <Bobina s={p.salida} energia={energia} v={s.imagen} />
                <span className="ml-1 w-[3px] shrink-0 self-stretch" style={{ background: energia ? VERDE : APAGADO }} />
              </div>
              {editar && (
                <div className="mt-2 grid gap-2 border-t border-borde pt-2 xl:grid-cols-[1fr_auto]">
                  <div><p className="mb-1 text-[11px] text-tenue">Condiciones en serie</p><EditorSerie cs={p.condiciones} cambiar={(c) => cambiar((n) => { n.peldanos[i].condiciones = c; })} /></div>
                  <div><p className="mb-1 text-[11px] text-tenue">Salida</p><EditorSalida s={p.salida} cambiar={(o) => cambiar((n) => { n.peldanos[i].salida = o; })} /></div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
