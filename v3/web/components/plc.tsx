"use client";
import { pasa, serie, type Condicion, type Peldano, type PlcModulo, type PlcPunto, type Salida, type Sensor } from "@sima/cliente";
import { cx } from "./ui";

export const ESTADO_PLC: Record<string, { texto: string; tono: "ok" | "aviso" | "peligro" | "neutro"; led: string }> = {
  run: { texto: "En marcha", tono: "ok", led: "bg-[#2fc77a] animate-latido" }, stop: { texto: "Detenido", tono: "aviso", led: "bg-ambar" },
  error: { texto: "Con error", tono: "peligro", led: "bg-rojo animate-parpadeo" }, sin_conexion: { texto: "Sin conexión", tono: "neutro", led: "bg-[#8a8f99]" },
};

// ------------------------------------------------------------------------------------------ medidor de un sensor
export function Medidor({ s }: { s: Sensor }) {
  const rango = s.max - s.min || 1;
  const pos = (x: number) => `${Math.min(100, Math.max(0, ((x - s.min) / rango) * 100))}%`;
  const color = s.nivel === "alarma" ? "bg-rojo" : s.nivel === "aviso" ? "bg-ambar" : "bg-negro";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[14px]">
        <span className="truncate text-gris" title={s.nombre}>{s.nombre}</span>
        <span className={cx("num shrink-0 font-semibold", s.nivel === "alarma" && "text-rojo", s.nivel === "aviso" && "text-ambar")}>{s.ultimo == null ? "—" : s.ultimo.toFixed(s.max > 50 ? 0 : 1)} <span className="font-normal text-gris">{s.unidad}</span></span>
      </div>
      <div className="relative mt-1 h-1.5 bg-chapa" role="meter" aria-valuemin={s.min} aria-valuemax={s.max} aria-valuenow={s.ultimo ?? undefined} aria-label={s.nombre}>
        <div className={cx("absolute inset-y-0 left-0 transition-[width] duration-700 ease-out", color)} style={{ width: s.ultimo == null ? 0 : pos(s.ultimo) }} />
        <i className="absolute -inset-y-0.5 w-px bg-ambar" style={{ left: pos(s.aviso) }} title={`Aviso: ${s.aviso}`} />
        <i className="absolute -inset-y-0.5 w-px bg-rojo" style={{ left: pos(s.alarma) }} title={`Alarma: ${s.alarma}`} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------ rack de módulos con LED
function Led({ on, color, titulo, parpadea }: { on: boolean; color: string; titulo?: string; parpadea?: boolean }) {
  return <span title={titulo} className={cx("block size-3 rounded-[2px] border border-black/25 transition-colors duration-150", on ? color : "bg-[#3a3c42]", on && parpadea && "animate-parpadeo")} style={on ? { boxShadow: "0 0 8px 1px currentColor" } : undefined} />;
}

export function Rack({ modulos, puntos, io, estado }: { modulos: PlcModulo[]; puntos: PlcPunto[]; io: Record<string, number>; estado: string }) {
  const porModulo = (id: number) => puntos.filter((p) => p.moduloId === id);
  return (
    <div className="flex gap-1 overflow-x-auto bg-[#17181b] p-4" role="group" aria-label="Rack del PLC">
      {modulos.map((m) => {
        const pts = porModulo(m.id);
        return (
          <div key={m.id} className="flex w-[148px] shrink-0 flex-col border border-[#2c2e33] bg-[#222428] text-white">
            <div className="flex items-center justify-between border-b border-[#2c2e33] bg-[#2a2c31] px-2.5 py-1.5">
              <span className="num text-[12px] text-[#9aa0a9]">Ranura {m.slot}</span>
              <span className={cx("display text-[15px] font-bold", m.tipo === "CPU" ? "text-rojo" : "text-white")}>{m.tipo}</span>
            </div>
            <p className="min-h-[34px] px-2.5 py-1.5 text-[12px] leading-tight text-[#b4b8c0]">{m.modelo}</p>
            <div className="flex-1 px-2.5 pb-3">
              {m.tipo === "CPU" && (
                <ul className="space-y-2 pt-1 text-[12px]">
                  <li className="flex items-center gap-2 text-[#2fc77a]"><Led on={estado === "run"} color="bg-[#2fc77a]" /><span className="text-white">RUN</span></li>
                  <li className="flex items-center gap-2 text-[#ffb000]"><Led on={estado === "stop"} color="bg-[#ffb000]" /><span className="text-white">STOP</span></li>
                  <li className="flex items-center gap-2 text-[#ff4b52]"><Led on={estado === "error"} color="bg-[#ff4b52]" parpadea /><span className="text-white">ERROR</span></li>
                  <li className="flex items-center gap-2 text-[#4aa3ff]"><Led on={estado === "run"} color="bg-[#4aa3ff]" parpadea /><span className="text-white">LINK</span></li>
                </ul>
              )}
              {m.tipo === "PS" && <ul className="pt-1 text-[12px]"><li className="flex items-center gap-2 text-[#2fc77a]"><Led on={estado !== "sin_conexion"} color="bg-[#2fc77a]" /><span className="text-white">24 V</span></li></ul>}
              {(m.tipo === "DI" || m.tipo === "DO") && (
                <ul className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-1">
                  {Array.from({ length: m.canales }).map((_, ch) => {
                    const p = pts.find((x) => x.canal === ch);
                    const on = p ? (io[p.tag] ?? 0) > 0 : false;
                    return (
                      <li key={ch} className="flex items-center gap-1.5" title={p ? `${p.direccion} · ${p.tag}\n${p.descripcion}` : `Canal ${ch} sin usar`}>
                        <span className={m.tipo === "DI" ? "text-[#2fc77a]" : "text-[#ffb000]"}><Led on={on} color={m.tipo === "DI" ? "bg-[#2fc77a]" : "bg-[#ffb000]"} /></span>
                        <span className={cx("num text-[11px]", p ? "text-[#b4b8c0]" : "text-[#555a63]")}>{ch}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {m.tipo === "AI" && (
                <ul className="space-y-1.5 pt-1">
                  {Array.from({ length: m.canales }).map((_, ch) => {
                    const p = pts.find((x) => x.canal === ch);
                    const v = p ? io[p.tag] : undefined;
                    const frac = p && v != null ? (v - p.minimo) / ((p.maximo - p.minimo) || 1) : 0;
                    return (
                      <li key={ch} title={p ? `${p.direccion} · ${p.tag}\n${p.descripcion}` : `Canal ${ch} sin usar`}>
                        <div className="flex justify-between text-[11px]"><span className="num text-[#9aa0a9]">{ch}</span><span className="num text-[#e6e8ec]">{p && v != null ? `${v.toFixed(1)} ${p.unidad}` : "—"}</span></div>
                        <div className="h-1 bg-[#3a3c42]"><div className="h-full bg-[#4aa3ff] transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(1, frac)) * 100}%` }} /></div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------------------------------ escalera (solo lectura, con corriente en vivo)
const VERDE = "#108046", GRIS = "#aeb2ba";

function Elemento({ c, v, entra }: { c: Condicion; v: Record<string, number>; entra: boolean }) {
  if (c.tipo === "OR") {
    return (
      <div className="relative flex flex-col justify-center py-1">
        {c.ramas.map((r, i) => (
          <div key={i} className="flex items-center"><Serie cs={r} v={v} entra={entra} /></div>
        ))}
      </div>
    );
  }
  const ok = pasa(c, v);
  const linea = entra && ok ? VERDE : GRIS;
  return (
    <div className="flex flex-col items-center px-0.5" title={c.tipo === "CMP" ? `${c.tag} ${c.op} ${c.valor}` : c.tag}>
      <span className="max-w-[112px] truncate text-[11px] leading-none text-gris">{c.tag}</span>
      <svg width="76" height="26" viewBox="0 0 76 26" className="mt-1" aria-hidden>
        <line x1="0" y1="13" x2="26" y2="13" stroke={linea} strokeWidth="2" /><line x1="50" y1="13" x2="76" y2="13" stroke={linea} strokeWidth="2" />
        {c.tipo === "CMP" ? (
          <><rect x="26" y="3" width="24" height="20" fill={ok ? "#dff3e7" : "#fff"} stroke={linea} strokeWidth="2" /><text x="38" y="17" textAnchor="middle" fontSize="11" fontWeight="600" fill="#000">{c.op}</text></>
        ) : (
          <>
            <line x1="26" y1="3" x2="26" y2="23" stroke={ok ? VERDE : GRIS} strokeWidth="3" /><line x1="50" y1="3" x2="50" y2="23" stroke={ok ? VERDE : GRIS} strokeWidth="3" />
            {c.tipo === "NC" && <line x1="23" y1="21" x2="53" y2="5" stroke={ok ? VERDE : GRIS} strokeWidth="2" />}
          </>
        )}
      </svg>
      {c.tipo === "CMP" && <span className="num text-[11px] leading-none text-gris">{c.valor}</span>}
    </div>
  );
}

function Serie({ cs, v, entra }: { cs: Condicion[]; v: Record<string, number>; entra: boolean }) {
  let pasando = entra;
  return <>{cs.map((c, i) => { const e = pasando; pasando = pasando && pasa(c, v); return <Elemento key={i} c={c} v={v} entra={e} />; })}</>;
}

function Bobina({ s, energia, v }: { s: Salida; energia: boolean; v: Record<string, number> }) {
  const color = energia ? VERDE : GRIS;
  const texto = s.tipo === "BOBINA" ? "" : s.tipo === "SET" ? "S" : s.tipo === "RESET" ? "R" : s.tipo;
  return (
    <div className="flex flex-col items-center pl-0.5" title={s.tag}>
      <span className="max-w-[128px] truncate text-[11px] leading-none text-gris">{s.tag}</span>
      <svg width="84" height="26" viewBox="0 0 84 26" className="mt-1" aria-hidden>
        <line x1="0" y1="13" x2="22" y2="13" stroke={color} strokeWidth="2" />
        {s.tipo === "TON" || s.tipo === "CTU" ? <rect x="22" y="2" width="60" height="22" fill={energia ? "#dff3e7" : "#fff"} stroke={color} strokeWidth="2" />
          : <><path d="M30 3 Q22 13 30 23" fill="none" stroke={color} strokeWidth="2.5" /><path d="M52 3 Q60 13 52 23" fill="none" stroke={color} strokeWidth="2.5" /></>}
        <text x={s.tipo === "TON" || s.tipo === "CTU" ? 52 : 41} y="17" textAnchor="middle" fontSize="11" fontWeight="700" fill="#000">{texto}</text>
      </svg>
      {(s.tipo === "TON") && <span className="num text-[11px] leading-none text-gris">{Math.round(v[`${s.tag}.ACC`] ?? 0)}/{s.preset} ms</span>}
    </div>
  );
}

export function Escalera({ peldanos, io }: { peldanos: Peldano[]; io: Record<string, number> }) {
  return (
    <ol className="divide-y divide-linea-suave">
      {peldanos.map((p) => {
        const energia = serie(p.condiciones, io);
        return (
          <li key={p.id} className="px-4 py-3">
            <p className="mb-1.5 text-[13px] text-gris"><span className="num font-semibold text-negro">{p.id}</span> {p.comentario}</p>
            <div className="flex items-stretch overflow-x-auto pb-1">
              <span className="mr-1 w-[3px] shrink-0 self-stretch" style={{ background: energia ? VERDE : GRIS }} />
              <div className="flex items-center"><Serie cs={p.condiciones} v={io} entra={true} /></div>
              <span className="mt-[18px] h-[2px] min-w-6 flex-1 self-start" style={{ background: energia ? VERDE : GRIS }} />
              <Bobina s={p.salida} energia={energia} v={io} />
              <span className="ml-1 w-[3px] shrink-0 self-stretch" style={{ background: energia ? VERDE : GRIS }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
