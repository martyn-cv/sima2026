"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CornerDownLeft, Search } from "lucide-react";
import { cx } from "./ui";

export interface Comando { id: string; titulo: string; grupo: string; detalle?: string; icono?: ReactNode; accion: () => void }
const normal = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Abre la paleta con Ctrl + K (o Cmd + K). */
export function useAtajoComandos(abrir: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); abrir(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [abrir]);
}

/** Buscador de comandos: pantallas, personas, equipos… con teclado. */
export function PaletaComandos({ abierto, onCerrar, comandos, placeholder = "Buscar pantallas, personas, equipos…" }: { abierto: boolean; onCerrar: () => void; comandos: Comando[]; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  const lista = useMemo(() => {
    const t = normal(q.trim());
    const r = !t ? comandos.slice(0, 40) : comandos.filter((c) => normal(`${c.titulo} ${c.detalle ?? ""} ${c.grupo}`).includes(t)).slice(0, 40);
    return r;
  }, [q, comandos]);
  useEffect(() => { if (abierto) { setQ(""); setSel(0); setTimeout(() => ref.current?.focus(), 30); } }, [abierto]);
  useEffect(() => setSel(0), [q]);
  const ejecutar = (c?: Comando) => { if (!c) return; onCerrar(); c.accion(); };
  const grupos = [...new Set(lista.map((c) => c.grupo))];
  return (
    <AnimatePresence>
      {abierto && (
        <div className="fixed inset-0 z-[70] grid place-items-start justify-center p-4 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-[#02050c]/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCerrar} />
          <motion.div role="dialog" aria-label="Buscador" className="tarjeta relative w-[min(680px,calc(100vw-2rem))] overflow-hidden bg-papel"
            initial={{ opacity: 0, y: -16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ type: "spring", stiffness: 420, damping: 34 }}>
            <div className="flex items-center gap-3 border-b border-linea-suave px-4">
              <Search className="size-5 text-gris" />
              <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label="Buscar"
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(lista.length - 1, s + 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
                  if (e.key === "Enter") ejecutar(lista[sel]);
                  if (e.key === "Escape") onCerrar();
                }}
                className="h-14 flex-1 bg-transparent text-[16px] outline-none placeholder:text-gris/70" />
              <kbd className="rounded-md border border-linea px-1.5 py-0.5 text-[11px] text-gris">Esc</kbd>
            </div>
            <div className="max-h-[56vh] overflow-auto p-2">
              {lista.length === 0 && <p className="px-3 py-8 text-center text-gris">Sin resultados para «{q}».</p>}
              {grupos.map((g) => (
                <div key={g} className="mb-1">
                  <p className="px-3 pb-1 pt-2 text-[11.5px] font-semibold uppercase tracking-[.06em] text-gris">{g}</p>
                  {lista.filter((c) => c.grupo === g).map((c) => {
                    const i = lista.indexOf(c);
                    return (
                      <button key={c.id} onMouseEnter={() => setSel(i)} onClick={() => ejecutar(c)}
                        className={cx("relative flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left", sel === i ? "text-negro" : "text-carbon")}>
                        {sel === i && <motion.span layoutId="cmd-sel" className="absolute inset-0 rounded-xl bg-acento-claro" transition={{ type: "spring", stiffness: 600, damping: 40 }} />}
                        <span className="relative grid size-8 shrink-0 place-items-center rounded-lg bg-linea-suave text-gris">{c.icono}</span>
                        <span className="relative min-w-0 flex-1"><span className="block truncate font-medium">{c.titulo}</span>{c.detalle && <span className="block truncate text-[12.5px] text-gris">{c.detalle}</span>}</span>
                        {sel === i && <CornerDownLeft className="relative size-4 text-acento" />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
