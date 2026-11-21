"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { Banknote, Briefcase, Cpu, Factory, FileSignature, KeyRound, LayoutDashboard, LogOut, Menu, Network, ScrollText, ShieldCheck, SlidersHorizontal, UserMinus, Users, X, type LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usePlanta } from "@/lib/planta";
import { cx, AvisosProvider, Cajon, PanelSeguridad } from "./ui";

interface Item { href: string; titulo: string; icono: LucideIcon; recurso?: string }
const GRUPOS: { titulo: string; items: Item[] }[] = [
  { titulo: "General", items: [{ href: "/", titulo: "Panel", icono: LayoutDashboard }] },
  { titulo: "Personas", items: [
    { href: "/trabajadores", titulo: "Trabajadores", icono: Users, recurso: "personal" },
    { href: "/contratos", titulo: "Contratos", icono: FileSignature, recurso: "contratos" },
    { href: "/desvinculaciones", titulo: "Desvinculaciones", icono: UserMinus, recurso: "terminos" },
    { href: "/cuentas", titulo: "Cuentas de acceso", icono: KeyRound, recurso: "cuentas" },
  ] },
  { titulo: "Pagos", items: [
    { href: "/remuneraciones", titulo: "Remuneraciones", icono: Banknote, recurso: "remuneraciones" },
    { href: "/parametros", titulo: "Parámetros", icono: SlidersHorizontal, recurso: "parametros" },
  ] },
  { titulo: "Organización", items: [
    { href: "/cargos", titulo: "Cargos y dotación", icono: Briefcase },
    { href: "/organigrama", titulo: "Organigrama", icono: Network },
  ] },
  { titulo: "Planta", items: [
    { href: "/planta", titulo: "Equipos y alarmas", icono: Factory },
    { href: "/plc", titulo: "Controladores PLC", icono: Cpu, recurso: "plc" },
  ] },
  { titulo: "Control", items: [{ href: "/auditoria", titulo: "Auditoría", icono: ScrollText, recurso: "auditoria" }] },
];

const COLOR_ESTADO: Record<string, string> = { operando: "bg-[#2fc77a]", alarma: "bg-rojo", detenido: "bg-[#8a8f99]", en_mantencion: "bg-ambar" };

function Navegacion({ alNavegar }: { alNavegar?: () => void }) {
  const ruta = usePathname();
  const { puede, usuario, salir, refrescar } = useAuth();
  const [seguridad, setSeguridad] = useState(false);
  const activa = (h: string) => (h === "/" ? ruta === "/" : ruta.startsWith(h));
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pb-5 pt-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center bg-rojo display text-[26px] font-bold leading-none text-white">S</span>
          <div>
            <p className="display text-[30px] font-bold leading-[0.9] tracking-tight text-white">SIMA</p>
            <p className="text-[12px] leading-tight text-[#9aa0a9]">Manufacturas Andina</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Secciones">
        {GRUPOS.map((g) => {
          const visibles = g.items.filter((i) => !i.recurso || puede(i.recurso));
          if (!visibles.length) return null;
          return (
            <div key={g.titulo} className="mb-4">
              <p className="px-3 pb-1 text-[12px] font-medium text-[#6d727c]">{g.titulo}</p>
              {visibles.map((i) => (
                <Link key={i.href} href={i.href} onClick={alNavegar} aria-current={activa(i.href) ? "page" : undefined}
                  className={cx("relative flex h-10 items-center gap-3 px-3 text-[15px] transition-colors", activa(i.href) ? "text-white" : "text-[#b4b8c0] hover:text-white")}>
                  {activa(i.href) && <motion.span layoutId="rail-activo" className="absolute inset-0 bg-[#1d1e22]" transition={{ type: "spring", stiffness: 520, damping: 42 }} />}
                  {activa(i.href) && <motion.span layoutId="rail-barra" className="absolute inset-y-0 left-0 w-[3px] bg-rojo" transition={{ type: "spring", stiffness: 520, damping: 42 }} />}
                  <i.icono className="relative size-[18px] shrink-0" strokeWidth={1.75} />
                  <span className="relative truncate">{i.titulo}</span>
                </Link>
              ))}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-[#26272b] p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center bg-[#1d1e22] display text-lg font-semibold text-white">{usuario?.nombre.split(" ").slice(0, 2).map((p) => p[0]).join("")}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium text-white">{usuario?.nombre}</p>
            <p className="truncate text-[13px] text-[#9aa0a9]" title={usuario?.cargo}>{usuario?.cargo}</p>
          </div>
          <button onClick={() => setSeguridad(true)} aria-label="Seguridad de la cuenta" title="Seguridad de la cuenta" className="grid size-9 cursor-pointer place-items-center text-[#9aa0a9] transition-colors hover:text-white"><ShieldCheck className="size-[18px]" /></button>
          <button onClick={() => salir()} aria-label="Cerrar sesión" title="Cerrar sesión" className="grid size-9 cursor-pointer place-items-center text-[#9aa0a9] transition-colors hover:text-white"><LogOut className="size-[18px]" /></button>
        </div>
      </div>
      <Cajon abierto={seguridad} onCerrar={() => setSeguridad(false)} titulo="Seguridad de la cuenta" ancho={560}>{usuario && <PanelSeguridad cliente={api} usuario={usuario} alNuevoToken={(t) => void refrescar(t)} alTerminar={() => setSeguridad(false)} />}</Cajon>
    </div>
  );
}

/** Franja fija con el estado de la planta: un bloque por equipo, con el color de su estado. */
function PulsoPlanta() {
  const { conexion, equipos } = usePlanta();
  const { data } = useQuery({ queryKey: ["panel"], queryFn: () => api.get<{ planta: { alarmasCriticas: number; ordenesAbiertas: number; plcConectados: number; plcTotal: number } }>("/api/panel"), refetchInterval: 20_000 });
  const p = data?.planta;
  const texto = conexion === "conectado" ? "En vivo" : conexion === "reconectando" ? "Reconectando…" : "Sin conexión en vivo";
  return (
    <div className="flex h-11 items-center gap-4 border-b border-linea bg-papel px-5 lg:px-9">
      <span className="flex items-center gap-2 text-[14px] font-medium">
        <span className={cx("size-2 rounded-full", conexion === "conectado" ? "animate-latido bg-verde" : conexion === "reconectando" ? "animate-parpadeo bg-ambar" : "bg-gris")} />
        {texto}
      </span>
      <div className="flex items-center gap-[3px]" aria-label="Estado de los equipos">
        {equipos.map((e) => (
          <Link key={e.codigo} href="/planta" title={`${e.codigo} · ${e.nombre}: ${e.estado.replace("_", " ")}`}
            className={cx("h-4 w-[7px] transition-colors duration-500", COLOR_ESTADO[e.estado] ?? "bg-linea", e.estado === "alarma" && "animate-parpadeo")} />
        ))}
        {equipos.length === 0 && <span className="text-[13px] text-gris">Sin equipos</span>}
      </div>
      <div className="ml-auto hidden items-center gap-5 text-[14px] sm:flex">
        {p && (
          <>
            <Link href="/planta" className="hover:underline"><span className={cx("num font-semibold", p.alarmasCriticas > 0 && "text-rojo")}>{p.alarmasCriticas}</span> alarmas críticas</Link>
            <Link href="/planta" className="hover:underline"><span className="num font-semibold">{p.ordenesAbiertas}</span> órdenes abiertas</Link>
            <span><span className="num font-semibold">{p.plcConectados}</span> de {p.plcTotal} PLC conectados</span>
          </>
        )}
      </div>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <AvisosProvider>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] bg-negro lg:block"><Navegacion /></aside>
      {abierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setAbierto(false)} />
          <motion.aside initial={{ x: -260 }} animate={{ x: 0 }} className="absolute inset-y-0 left-0 w-[268px] bg-negro">
            <button aria-label="Cerrar menú" onClick={() => setAbierto(false)} className="absolute right-3 top-4 grid size-9 cursor-pointer place-items-center text-white"><X className="size-5" /></button>
            <Navegacion alNavegar={() => setAbierto(false)} />
          </motion.aside>
        </div>
      )}
      <div className="min-h-dvh lg:pl-[248px]">
        <div className="sticky top-0 z-20">
          <div className="flex h-12 items-center gap-3 bg-negro px-4 lg:hidden">
            <button aria-label="Abrir menú" onClick={() => setAbierto(true)} className="grid size-9 cursor-pointer place-items-center text-white"><Menu className="size-5" /></button>
            <span className="display text-2xl font-bold text-white">SIMA</span>
          </div>
          <PulsoPlanta />
        </div>
        <main className="mx-auto w-full max-w-[1320px] px-5 py-7 lg:px-9">{children}</main>
      </div>
    </AvisosProvider>
  );
}
