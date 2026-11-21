"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Banknote, BarChart3, Bell, Boxes, Briefcase, ChevronsLeft, ChevronsRight, ClipboardCheck, Cpu, Factory, FileSignature, KeyRound, LayoutDashboard, LogOut, Menu, Moon, Network, ScrollText,
  Search, ShieldAlert, ShieldCheck, SlidersHorizontal, Sun, Truck, UserMinus, Users, Wrench, X, type LucideIcon,
} from "lucide-react";
import { hace } from "@sima/cliente";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usePlanta } from "@/lib/planta";
import { useTema } from "@/lib/tema";
import { AvisosProvider, Avatar, Cajon, FondoAurora, PaletaComandos, PanelSeguridad, cx, useAtajoComandos, type Comando } from "./ui";

interface Item { href: string; titulo: string; icono: LucideIcon; recurso?: string; detalle?: string }
export const GRUPOS: { titulo: string; items: Item[] }[] = [
  { titulo: "General", items: [{ href: "/", titulo: "Inicio", icono: LayoutDashboard, detalle: "Resumen según su cargo" }] },
  { titulo: "Personas", items: [
    { href: "/trabajadores", titulo: "Trabajadores", icono: Users, recurso: "personal", detalle: "Fichas, contratos y cuentas" },
    { href: "/contratos", titulo: "Contratos", icono: FileSignature, recurso: "contratos", detalle: "Vigencias y renovaciones" },
    { href: "/desvinculaciones", titulo: "Desvinculaciones", icono: UserMinus, recurso: "terminos", detalle: "Términos de contrato" },
    { href: "/cuentas", titulo: "Cuentas de acceso", icono: KeyRound, recurso: "cuentas", detalle: "Quién entra y por dónde" },
  ] },
  { titulo: "Pagos", items: [
    { href: "/remuneraciones", titulo: "Remuneraciones", icono: Banknote, recurso: "remuneraciones", detalle: "Liquidaciones y cierre del período" },
    { href: "/parametros", titulo: "Parámetros", icono: SlidersHorizontal, recurso: "parametros", detalle: "Valores de cálculo" },
  ] },
  { titulo: "Operación", items: [
    { href: "/indicadores", titulo: "Indicadores", icono: BarChart3, recurso: "kpis", detalle: "Los 10 indicadores del informe" },
    { href: "/produccion", titulo: "Producción", icono: ClipboardCheck, recurso: "produccion", detalle: "Órdenes y registros" },
    { href: "/calidad", titulo: "Calidad", icono: ShieldCheck, recurso: "calidad", detalle: "No conformidades y lotes" },
    { href: "/seguridad", titulo: "Seguridad y salud", icono: ShieldAlert, recurso: "sst", detalle: "Incidentes y acciones" },
    { href: "/inventario", titulo: "Inventario", icono: Boxes, detalle: "Repuestos y herramientas" },
    { href: "/logistica", titulo: "Logística", icono: Truck, recurso: "despachos", detalle: "Despachos a clientes" },
  ] },
  { titulo: "Planta", items: [
    { href: "/planta", titulo: "Planta en vivo", icono: Factory, detalle: "Equipos, alarmas y órdenes" },
    { href: "/plc", titulo: "Controladores PLC", icono: Cpu, recurso: "plc", detalle: "Racks, E/S y programas" },
    { href: "/mantenimiento", titulo: "Cambios de PLC", icono: Wrench, recurso: "plc_cambios", detalle: "Solicitudes y aprobaciones" },
  ] },
  { titulo: "Organización", items: [
    { href: "/cargos", titulo: "Cargos y dotación", icono: Briefcase, detalle: "64 cargos del informe" },
    { href: "/organigrama", titulo: "Organigrama", icono: Network, detalle: "Jefaturas y equipos" },
    { href: "/auditoria", titulo: "Auditoría", icono: ScrollText, recurso: "auditoria", detalle: "Quién hizo qué" },
  ] },
];

const COLOR_ESTADO: Record<string, string> = { operando: "var(--s-verde)", alarma: "var(--s-rojo)", detenido: "var(--s-tenue)", en_mantencion: "var(--s-ambar)" };

function Lateral({ plegada, alNavegar }: { plegada: boolean; alNavegar?: () => void }) {
  const ruta = usePathname();
  const { puede } = useAuth();
  const activa = (h: string) => (h === "/" ? ruta === "/" : ruta.startsWith(h));
  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4" aria-label="Secciones">
      {GRUPOS.map((g) => {
        const visibles = g.items.filter((i) => !i.recurso || puede(i.recurso));
        if (!visibles.length) return null;
        return (
          <div key={g.titulo} className="mb-3">
            <p className={cx("px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[.08em] text-gris/80 transition-opacity", plegada && "opacity-0")}>{g.titulo}</p>
            {visibles.map((i) => (
              <Link key={i.href} href={i.href} onClick={alNavegar} title={plegada ? i.titulo : undefined} aria-current={activa(i.href) ? "page" : undefined}
                className={cx("relative flex h-10 items-center gap-3 rounded-xl px-3 text-[14.5px] font-medium transition-colors", activa(i.href) ? "text-negro" : "text-gris hover:bg-linea-suave/60 hover:text-negro")}>
                {activa(i.href) && <motion.span layoutId="lateral-activo" className="absolute inset-0 rounded-xl border border-acento/30 bg-acento-claro" transition={{ type: "spring", stiffness: 480, damping: 40 }} />}
                {activa(i.href) && <motion.span layoutId="lateral-barra" className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-acento shadow-[0_0_12px_var(--s-acento)]" transition={{ type: "spring", stiffness: 480, damping: 40 }} />}
                <i.icono className={cx("relative size-[19px] shrink-0", activa(i.href) && "text-acento")} strokeWidth={1.8} />
                <span className={cx("relative truncate transition-opacity", plegada && "opacity-0")}>{i.titulo}</span>
              </Link>
            ))}
          </div>
        );
      })}
    </nav>
  );
}

function Marca({ plegada }: { plegada: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3 px-5 pb-4 pt-5">
      <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-acento to-cobre font-display text-[22px] font-extrabold text-sobre-negro shadow-[0_8px_24px_-8px_var(--s-acento)]">S</span>
      <span className={cx("transition-opacity", plegada && "opacity-0")}>
        <span className="display block text-[24px] font-extrabold leading-none tracking-tight">SIMA</span>
        <span className="block text-[11.5px] text-gris">Manufacturas Andina</span>
      </span>
    </Link>
  );
}

/** Pulso de la planta: una barra por equipo que sube y baja según su estado. */
function Pulso() {
  const { conexion, equipos } = usePlanta();
  return (
    <Link href="/planta" className="hidden items-center gap-3 rounded-xl border border-linea-suave bg-papel/60 px-3 py-1.5 md:flex" title="Estado de los equipos en vivo">
      <span className={cx("size-2 rounded-full", conexion === "conectado" ? "animate-latido bg-verde shadow-[0_0_10px_var(--s-verde)]" : conexion === "reconectando" ? "animate-parpadeo bg-ambar" : "bg-gris")} />
      <span className="flex h-5 items-end gap-[3px]" aria-label="Pulso de la planta">
        {equipos.map((e, i) => (
          <motion.span key={e.codigo} className="w-[4px] rounded-full" style={{ background: COLOR_ESTADO[e.estado] ?? "var(--s-borde)" }}
            animate={{ height: e.estado === "operando" ? [8, 18, 11, 20, 8] : e.estado === "alarma" ? [20, 6, 20] : 6 }}
            transition={{ duration: e.estado === "alarma" ? 0.7 : 1.6 + (i % 4) * 0.25, repeat: Infinity, ease: "easeInOut" }} />
        ))}
      </span>
      <span className="text-[12.5px] font-semibold text-gris">{conexion === "conectado" ? "En vivo" : conexion === "reconectando" ? "Reconectando" : "Sin enlace"}</span>
    </Link>
  );
}

function Notificaciones() {
  const { eventos } = usePlanta();
  const [abierto, setAbierto] = useState(false);
  const [vistos, setVistos] = useState(0);
  const nuevos = Math.max(0, eventos.length - vistos);
  const color = { alarma: "bg-rojo", aviso: "bg-ambar", info: "bg-azul", ok: "bg-verde" };
  return (
    <div className="relative">
      <button onClick={() => { setAbierto(!abierto); setVistos(eventos.length); }} aria-label="Notificaciones" className="relative grid size-10 cursor-pointer place-items-center rounded-xl border border-linea-suave bg-papel/60 text-gris transition-colors hover:text-negro">
        <Bell className="size-[18px]" />
        {nuevos > 0 && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="num absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rojo px-1 text-[11px] font-bold text-white">{nuevos > 9 ? "9+" : nuevos}</motion.span>}
      </button>
      <AnimatePresence>
        {abierto && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setAbierto(false)} />
            <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} className="tarjeta vidrio absolute right-0 top-12 z-40 w-[380px] overflow-hidden">
              <p className="border-b border-linea-suave px-4 py-3 font-semibold">Actividad en vivo</p>
              <ul className="max-h-[420px] overflow-auto p-2">
                {eventos.length === 0 && <li className="px-3 py-8 text-center text-[14px] text-gris">Aquí aparecen las alarmas, órdenes y cambios de los PLC apenas ocurren.</li>}
                {eventos.map((e) => (
                  <li key={e.id}><Link href={e.enlace ?? "/"} onClick={() => setAbierto(false)} className="flex gap-3 rounded-xl px-3 py-2.5 hover:bg-linea-suave/60">
                    <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", color[e.nivel])} />
                    <span className="min-w-0"><span className="block text-[14px] leading-snug">{e.texto}</span><span className="text-[12px] text-gris">{hace(new Date(e.ts).toISOString())}</span></span>
                  </Link></li>
                ))}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [plegada, setPlegada] = useState(false);
  const [movil, setMovil] = useState(false);
  const [paleta, setPaleta] = useState(false);
  const [seguridad, setSeguridad] = useState(false);
  const [menu, setMenu] = useState(false);
  const { usuario, salir, refrescar, puede } = useAuth();
  const { equipos } = usePlanta();
  const { tema, alternar } = useTema();
  const router = useRouter();
  useEffect(() => { try { setPlegada(localStorage.getItem("sima.lateral") === "plegada"); } catch { /* */ } }, []);
  const plegar = () => setPlegada((p) => { try { localStorage.setItem("sima.lateral", p ? "abierta" : "plegada"); } catch { /* */ } return !p; });
  const abrirPaleta = useCallback(() => setPaleta(true), []);
  useAtajoComandos(abrirPaleta);

  const directorio = useQuery({ queryKey: ["directorio"], queryFn: () => api.get<{ id: string; nombre: string; cargo: string }[]>("/api/directorio"), enabled: paleta });
  const plcs = useQuery({ queryKey: ["plc"], queryFn: () => api.get<{ codigo: string; nombre: string }[]>("/api/plc"), enabled: paleta && puede("plc") });
  const comandos = useMemo<Comando[]>(() => [
    ...GRUPOS.flatMap((g) => g.items.filter((i) => !i.recurso || puede(i.recurso)).map((i) => ({ id: i.href, titulo: i.titulo, detalle: i.detalle, grupo: "Pantallas", icono: <i.icono className="size-4" />, accion: () => router.push(i.href) }))),
    ...(puede("personal") ? (directorio.data ?? []).map((p) => ({ id: `t-${p.id}`, titulo: p.nombre, detalle: p.cargo, grupo: "Personas", icono: <Users className="size-4" />, accion: () => router.push(`/trabajadores/${p.id}`) })) : []),
    ...equipos.map((e) => ({ id: `e-${e.codigo}`, titulo: `${e.codigo} · ${e.nombre}`, detalle: `${e.tipo} · ${e.estado.replace("_", " ")}`, grupo: "Equipos", icono: <Factory className="size-4" />, accion: () => router.push(`/planta?equipo=${e.codigo}`) })),
    ...(plcs.data ?? []).map((p) => ({ id: `p-${p.codigo}`, titulo: p.codigo, detalle: p.nombre, grupo: "Controladores PLC", icono: <Cpu className="size-4" />, accion: () => router.push(`/plc/${p.codigo}`) })),
    { id: "tema", titulo: tema === "claro" ? "Cambiar al tema noche" : "Cambiar al tema día", grupo: "Acciones", icono: tema === "claro" ? <Moon className="size-4" /> : <Sun className="size-4" />, accion: alternar },
    { id: "seg", titulo: "Seguridad de la cuenta", detalle: "Clave y segundo factor", grupo: "Acciones", icono: <ShieldCheck className="size-4" />, accion: () => setSeguridad(true) },
    { id: "salir", titulo: "Cerrar sesión", grupo: "Acciones", icono: <LogOut className="size-4" />, accion: () => salir() },
  ], [puede, directorio.data, equipos, plcs.data, router, tema, alternar, salir]);

  const ancho = plegada ? 84 : 268;
  return (
    <AvisosProvider>
      <FondoAurora />
      <motion.aside animate={{ width: ancho }} transition={{ type: "spring", stiffness: 300, damping: 34 }} className="vidrio fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-linea-suave lg:flex">
        <Marca plegada={plegada} />
        <Lateral plegada={plegada} />
        <button onClick={plegar} className="mx-3 mb-3 flex h-9 cursor-pointer items-center gap-2 rounded-xl px-3 text-[13px] text-gris hover:bg-linea-suave/60 hover:text-negro" aria-label={plegada ? "Expandir menú" : "Plegar menú"}>
          {plegada ? <ChevronsRight className="size-4" /> : <><ChevronsLeft className="size-4" />Plegar menú</>}
        </button>
      </motion.aside>

      <AnimatePresence>
        {movil && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMovil(false)} />
            <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: "spring", stiffness: 340, damping: 34 }} className="absolute inset-y-0 left-0 flex w-[280px] flex-col border-r border-linea bg-papel">
              <button aria-label="Cerrar menú" onClick={() => setMovil(false)} className="absolute right-3 top-5 grid size-9 cursor-pointer place-items-center rounded-xl text-gris hover:text-negro"><X className="size-5" /></button>
              <Marca plegada={false} /><Lateral plegada={false} alNavegar={() => setMovil(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="min-h-dvh transition-[padding] duration-300 ease-out lg:pl-[var(--ancho-lateral)]" style={{ ["--ancho-lateral" as string]: `${ancho}px` }}>
        <header className="vidrio sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-linea-suave px-4 lg:px-8">
          <button aria-label="Abrir menú" onClick={() => setMovil(true)} className="grid size-10 cursor-pointer place-items-center rounded-xl text-gris hover:text-negro lg:hidden"><Menu className="size-5" /></button>
          <button onClick={abrirPaleta} className="flex h-10 min-w-0 max-w-[460px] flex-1 cursor-pointer items-center gap-3 rounded-xl border border-linea-suave bg-papel/60 px-3 text-left text-[14px] text-gris transition-colors hover:border-acento/50">
            <Search className="size-4 shrink-0" /><span className="truncate">Buscar pantallas, personas, equipos o PLC…</span>
            <kbd className="ml-auto hidden rounded-md border border-linea px-1.5 py-0.5 text-[11px] sm:block">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <Pulso />
            <button onClick={alternar} aria-label="Cambiar tema" title={tema === "claro" ? "Tema noche" : "Tema día"} className="grid size-10 cursor-pointer place-items-center rounded-xl border border-linea-suave bg-papel/60 text-gris transition-colors hover:text-negro">
              <AnimatePresence mode="wait" initial={false}><motion.span key={tema} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>{tema === "claro" ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}</motion.span></AnimatePresence>
            </button>
            <Notificaciones />
            <div className="relative">
              <button onClick={() => setMenu(!menu)} className="flex cursor-pointer items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 hover:bg-linea-suave/60" aria-label="Menú de la cuenta">
                <Avatar nombre={usuario?.nombre ?? "?"} tam={36} />
                <span className="hidden text-left xl:block"><span className="block max-w-[180px] truncate text-[13.5px] font-semibold leading-tight">{usuario?.nombre}</span><span className="block max-w-[180px] truncate text-[12px] text-gris">{usuario?.cargo}</span></span>
              </button>
              <AnimatePresence>
                {menu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="tarjeta vidrio absolute right-0 top-12 z-40 w-[260px] p-2">
                      <div className="px-3 py-2"><p className="font-semibold">{usuario?.nombre}</p><p className="text-[12.5px] text-gris">{usuario?.correo}</p><p className="mt-1 text-[12px] text-gris">Perfil {usuario?.perfil}</p></div>
                      <button onClick={() => { setMenu(false); setSeguridad(true); }} className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-linea-suave/60"><ShieldCheck className="size-4 text-acento" />Seguridad de la cuenta</button>
                      <button onClick={() => salir()} className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-rojo-hondo hover:bg-rojo-claro"><LogOut className="size-4" />Cerrar sesión</button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>
        <main className="w-full px-4 py-6 lg:px-8 lg:py-7">{children}</main>
      </div>

      <PaletaComandos abierto={paleta} onCerrar={() => setPaleta(false)} comandos={comandos} />
      <Cajon abierto={seguridad} onCerrar={() => setSeguridad(false)} titulo="Seguridad de la cuenta" ancho={580}>{usuario && <PanelSeguridad cliente={api} usuario={usuario} alNuevoToken={(t) => void refrescar(t)} alTerminar={() => setSeguridad(false)} />}</Cajon>
    </AvisosProvider>
  );
}

