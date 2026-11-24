import { useSim } from "../simulador";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const esPulsador = (tag: string) => /_(MARCHA|PARO)$/.test(tag);

function Led({ on, color, parpadea }: { on: boolean; color: "verde" | "ambar" | "rojo" | "azul"; parpadea?: boolean }) {
  return <span className={cx("led", color, on && "on", on && parpadea && "animate-parpadeo")} />;
}

/** El rack del PLC: fuente, CPU con llave RUN/STOP y los módulos de entradas y salidas con sus LED. */
export function Rack() {
  const s = useSim();
  const cfg = s.config;
  if (!cfg) return null;
  const correr = s.estado === "run";
  return (
    <div className="overflow-x-auto border border-borde bg-panel p-3" role="group" aria-label="Rack del PLC">
      <div className="flex gap-1.5">
        {cfg.modulos.map((m) => {
          const pts = cfg.puntos.filter((p) => p.moduloId === m.id);
          return (
            <div key={m.id} className="flex w-[160px] shrink-0 flex-col border border-borde bg-panel2">
              <div className="flex items-center justify-between border-b border-borde bg-[#262930] px-2.5 py-1.5">
                <span className="mono text-[11px] text-tenue">SLOT {m.slot}</span>
                <span className={cx("display text-[17px] font-bold leading-none", m.tipo === "CPU" ? "text-rojo-vivo" : "text-texto")}>{m.tipo}</span>
              </div>
              <p className="min-h-[34px] px-2.5 py-1.5 text-[12px] leading-tight text-tenue">{m.modelo}</p>
              <div className="flex-1 px-2.5 pb-3">
                {m.tipo === "CPU" && (
                  <div className="space-y-2.5 pt-1">
                    <ul className="space-y-2 text-[12px]">
                      <li className="flex items-center gap-2"><Led on={correr} color="verde" /><span>RUN</span></li>
                      <li className="flex items-center gap-2"><Led on={!correr} color="ambar" /><span>STOP</span></li>
                      <li className="flex items-center gap-2"><Led on={false} color="rojo" /><span>ERROR</span></li>
                      <li className="flex items-center gap-2"><Led on={correr && s.enlace === "conectado"} color="azul" parpadea /><span>LINK</span></li>
                    </ul>
                    <div className="flex overflow-hidden border border-borde text-[12px] font-semibold" role="group" aria-label="Llave de la CPU">
                      <button onClick={() => s.cpu("run")} aria-pressed={correr} className={cx("flex-1 cursor-pointer py-1.5 transition-colors", correr ? "bg-led-verde text-black" : "bg-panel text-tenue hover:text-texto")}>RUN</button>
                      <button onClick={() => s.cpu("stop")} aria-pressed={!correr} className={cx("flex-1 cursor-pointer py-1.5 transition-colors", !correr ? "bg-led-ambar text-black" : "bg-panel text-tenue hover:text-texto")}>STOP</button>
                    </div>
                  </div>
                )}
                {m.tipo === "PS" && <ul className="pt-1 text-[12px]"><li className="flex items-center gap-2"><Led on color="verde" /><span>24 V</span></li></ul>}
                {(m.tipo === "DI" || m.tipo === "DO") && (
                  <ul className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-1">
                    {Array.from({ length: m.canales }).map((_, ch) => {
                      const p = pts.find((x) => x.canal === ch);
                      const on = p ? (s.imagen[p.tag] ?? s.entradas[p.tag] ?? 0) > 0 : false;
                      const clic = m.tipo === "DI" && p ? () => (esPulsador(p.tag) ? s.pulso(p.tag) : s.alternar(p.tag)) : undefined;
                      return (
                        <li key={ch}>
                          <button type="button" disabled={!clic} onClick={clic} title={p ? `${p.direccion} · ${p.tag}\n${p.descripcion}${clic ? "\nClic para accionar" : ""}` : `Canal ${ch} sin usar`}
                            className={cx("flex w-full items-center gap-1.5 text-left", clic ? "cursor-pointer hover:text-white" : "cursor-default")}>
                            <Led on={on} color={m.tipo === "DI" ? "verde" : "ambar"} />
                            <span className={cx("mono text-[11px]", p ? "text-tenue" : "text-[#4a4e57]")}>{p ? p.direccion.replace(/^[IQ]/, "") : ch}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {m.tipo === "AI" && (
                  <ul className="space-y-1.5 pt-1">
                    {Array.from({ length: m.canales }).map((_, ch) => {
                      const p = pts.find((x) => x.canal === ch);
                      const v = p ? s.imagen[p.tag] : undefined;
                      const f = p && v != null ? (v - p.minimo) / ((p.maximo - p.minimo) || 1) : 0;
                      return (
                        <li key={ch} title={p ? `${p.direccion} · ${p.tag}\n${p.descripcion}` : `Canal ${ch} sin usar`}>
                          <div className="flex justify-between text-[11px]"><span className="mono text-tenue">{p ? p.direccion : ch}</span><span className="mono">{p && v != null ? `${v.toFixed(1)} ${p.unidad}` : "—"}</span></div>
                          <div className="h-1 bg-[#34373e]"><div className="h-full bg-led-azul transition-[width] duration-150" style={{ width: `${Math.max(0, Math.min(1, f)) * 100}%` }} /></div>
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
    </div>
  );
}
