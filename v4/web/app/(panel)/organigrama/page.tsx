"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { TURNO_NOMBRE } from "@/lib/listas";
import { Chip, Encabezado, ErrorCarga, Esqueleto, Seccion, cx } from "@/components/ui";

interface Nodo { id: string; nombre: string; cargo: string; cargoId: number; familia: string; familiaN: number; turno: string; jefeId?: string | null }

function Rama({ n, hijos, nivel }: { n: Nodo; hijos: Map<string, Nodo[]>; nivel: number }) {
  const [abierto, setAbierto] = useState(nivel < 2);
  const lista = hijos.get(n.id) ?? [];
  return (
    <li className="relative">
      <div className="flex items-center gap-2 py-1.5">
        {lista.length > 0 ? (
          <button aria-label={abierto ? "Contraer" : "Expandir"} aria-expanded={abierto} onClick={() => setAbierto(!abierto)} className="grid size-6 shrink-0 cursor-pointer place-items-center text-gris hover:text-negro">
            <ChevronRight className={cx("size-4 transition-transform duration-200", abierto && "rotate-90")} />
          </button>
        ) : <span className="size-6 shrink-0" />}
        <Link href={`/trabajadores/ficha?id=${n.id}`} className="group flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5 hover:bg-chapa/70">
          <span className="font-medium group-hover:underline">{n.nombre}</span>
          <span className="truncate text-[14px] text-gris">{n.cargo}</span>
        </Link>
        <Chip punto={false} className="hidden sm:inline-flex">{TURNO_NOMBRE[n.turno]}</Chip>
        {lista.length > 0 && <span className="num w-8 text-right text-[13px] text-gris" title="Personas a cargo">{lista.length}</span>}
      </div>
      <AnimatePresence initial={false}>
        {abierto && lista.length > 0 && (
          <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="ml-3 overflow-hidden border-l border-linea pl-4">
            {lista.map((h) => <Rama key={h.id} n={h} hijos={hijos} nivel={nivel + 1} />)}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
}

export default function Organigrama() {
  const { data, error, refetch } = useQuery({ queryKey: ["organigrama"], queryFn: () => api.get<Nodo[]>("/api/organigrama") });
  const { raices, hijos } = useMemo(() => {
    const h = new Map<string, Nodo[]>();
    const ids = new Set((data ?? []).map((n) => n.id));
    for (const n of data ?? []) if (n.jefeId && ids.has(n.jefeId)) h.set(n.jefeId, [...(h.get(n.jefeId) ?? []), n]);
    return { raices: (data ?? []).filter((n) => !n.jefeId || !ids.has(n.jefeId)), hijos: h };
  }, [data]);
  return (
    <>
      <Encabezado titulo="Organigrama" descripcion="Quién depende de quién hoy. Se arma con el jefe directo de cada ficha, solo con personas activas." />
      {error ? <ErrorCarga error={error} reintentar={() => void refetch()} /> : !data ? <Esqueleto className="h-96" /> : (
        <Seccion><ul className="p-5">{raices.map((r) => <Rama key={r.id} n={r} hijos={hijos} nivel={0} />)}</ul></Seccion>
      )}
    </>
  );
}
