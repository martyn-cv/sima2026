"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Banknote, BarChart3, Bell, Boxes, LogIn, Briefcase, ChevronsLeft, ChevronsRight, ClipboardCheck, Cpu, Factory, FileSignature, KeyRound, LayoutDashboard, LogOut, Menu, Moon, Network, ScrollText, Search, ShieldAlert, ShieldCheck, SlidersHorizontal, Sun, Truck, UserMinus, Users, Wrench, X, type LucideIcon, Activity } from "lucide-react";
import type { NotificacionSima } from "@sima/cliente";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usePlanta } from "@/lib/planta";
import { useTema } from "@/lib/tema";
import { AvisosProvider, Avatar, Cajon, Insignia, PaletaComandos, PanelNotificaciones, PanelSeguridad, cx, defEstado, useAtajoComandos, type Comando } from "./ui";

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
    { href: "/inventario", titulo: "Inventario", icono: Boxes, recurso: "repuestos", detalle: "Repuestos y herramientas" },
    { href: "/logistica", titulo: "Logística", icono: Truck, recurso: "despachos", detalle: "Despachos a clientes" },
  ] },
  { titulo: "Planta", items: [
    { href: "/planta", titulo: "Planta en vivo", icono: Factory, recurso: "planta", detalle: "Mapa animado, alarmas y órdenes" },
    { href: "/estructura", titulo: "Estructura y equipos", icono: Network, recurso: "planta", detalle: "Planta, áreas, líneas y máquinas" },
    { href: "/plc", titulo: "Controladores PLC", icono: Cpu, recurso: "plc", detalle: "Racks, E/S y programas" },
    { href: "/mantenimiento", titulo: "Mantenimiento", icono: Wrench, recurso: "ordenes", detalle: "Órdenes, intervenciones y cambios de PLC" },
    { href: "/eventos", titulo: "Eventos", icono: Activity, recurso: "planta", detalle: "Consola de lo que ocurre en planta" },
  ] },
  { titulo: "Organización", items: [
    { href: "/cargos", titulo: "Cargos y dotación", icono: Briefcase, detalle: "64 cargos del informe" },
    { href: "/organigrama", titulo: "Organigrama", icono: Network, detalle: "Jefaturas y equipos" },
    { href: "/permisos", titulo: "Permisos por cargo", icono: KeyRound, recurso: "permisos", detalle: "Capacidades y alcance" },
    { href: "/auditoria", titulo: "Auditoría", icono: ScrollText, recurso: "auditoria", detalle: "Quién hizo qué" },
    { href: "/accesos", titulo: "Registro de accesos", icono: LogIn, recurso: "auditoria", detalle: "Ingresos por plataforma, fallidos y bloqueos" },
  ] },
];


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
            <p className={cx("t-etiqueta px-3 pb-1 pt-2 transition-opacity", plegada && "opacity-0")}>{g.titulo}</p>
            {visibles.map((i) => (
              <Link key={i.href} href={i.href} onClick={alNavegar} title={plegada ? i.titulo : undefined} aria-current={activa(i.href) ? "page" : undefined}
                className={cx("relative flex h-9 items-center gap-3 rounded-md px-3 text-[13.5px] font-medium transition-colors duration-150", activa(i.href) ? "bg-papel-2 text-negro" : "text-gris hover:bg-papel-2/60 hover:text-negro")}>
                {activa(i.href) && <motion.span layoutId="lateral-barra" className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-acento" transition={{ duration: 0.2 }} />}
                <i.icono className={cx("relative size-[17px] shrink-0", activa(i.href) && "text-acento")} strokeWidth={1.8} />
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
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-acento text-sobre-negro" aria-hidden>
        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 7h11a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h11" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
      </span>
      <span className={cx("min-w-0 transition-opacity", plegada && "opacity-0")}>
        <span className="block text-[15px] font-semibold leading-tight">SIMA Web</span>
        <span className="block truncate text-[11.5px] text-gris">Gestión empresarial</span>
      </span>
    </Link>
  );
}

/** Resumen de la planta en la barra superior: conexión en vivo, equipos produciendo y equipos en falla o bloqueados. */
function Pulso() {
  const { conexion, equipos } = usePlanta();
  const produciendo = equipos.filter((e) => defEstado(e.estado).marcha).length;
  const criticos = equipos.filter((e) => defEstado(e.estado).critico).length;
  return (
    <Link href="/planta" className="hidden h-9 items-center gap-2.5 rounded-md border border-linea-suave bg-papel px-3 text-[12.5px] md:flex" title="Estado de los equipos en vivo">
      <span className={cx("size-2 rounded-full", conexion === "conectado" ? "bg-verde" : conexion === "reconectando" ? "bg-ambar" : "bg-gris")} aria-hidden />
      <span className="text-gris">{conexion === "conectado" ? "En vivo" : conexion === "reconectando" ? "Reconectando" : "Sin enlace"}</span>
      <span className="h-4 w-px bg-linea" aria-hidden />
      <span><b className="num">{produciendo}</b><span className="text-gris">/{equipos.length} produciendo</span></span>
      {criticos > 0 && <span className="inline-flex items-center gap-1 font-semibold text-rojo"><AlertTriangle className="size-3.5" />{criticos}</span>}
    </Link>
  );
}

/** Las notificaciones guardan rutas de SIMA Desktop; aquí se llevan a la pantalla equivalente de la web. */
function rutaWeb(destino: string) {
  const [ruta, q = ""] = destino.split("?");
  const p = new URLSearchParams(q);
  if (ruta === "/explorador" || ruta === "/alertas") return p.get("equipo") ? `/planta?equipo=${p.get("equipo")}` : "/planta";
  if (ruta === "/automatizacion") return "/plc";
  if (ruta === "/cargo") return "/";
  return destino;
}

function Notificaciones() {
  const router = useRouter();
  const qc = useQueryClient();
  const { eventos } = usePlanta();
  const [abierto, setAbierto] = useState(false);
  const { data } = useQuery({ queryKey: ["notificaciones"], queryFn: () => api.get<{ noLeidas: number; items: NotificacionSima[] }>("/api/notificaciones"), refetchInterval: 60_000 });
  const leer = useMutation({ mutationFn: (id: number) => api.post(`/api/notificaciones/${id}/leida`), onSuccess: () => qc.invalidateQueries({ queryKey: ["notificaciones"] }) });
  const todas = useMutation({ mutationFn: () => api.post("/api/notificaciones/leidas"), onSuccess: () => qc.invalidateQueries({ queryKey: ["notificaciones"] }) });
  const noLeidas = data?.noLeidas ?? 0;
  return (
    <>
      <button onClick={() => setAbierto(true)} aria-label={`Notificaciones${noLeidas ? `, ${noLeidas} sin leer` : ""}`} className="relative grid size-9 cursor-pointer place-items-center rounded-md border border-linea-suave bg-papel text-gris transition-colors hover:text-negro">
        <Bell className="size-4" />
        {noLeidas > 0 && <Insignia n={noLeidas} className="absolute -right-1.5 -top-1.5" />}
      </button>
      <PanelNotificaciones abierto={abierto} onCerrar={() => setAbierto(false)} items={data?.items ?? []} noLeidas={noLeidas} tituloVivo="Actividad en vivo"
        vivo={eventos.map((e) => ({ id: e.id, texto: e.texto, nivel: e.nivel, ts: e.ts, destino: e.enlace }))} alLeer={(id) => leer.mutate(id)} alLeerTodas={() => todas.mutate()}
        alIr={(d) => router.push(rutaWeb(d))} arriba={56} abajo={0} />
    </>
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
    ...(puede("personal") ? (directorio.data ?? []).map((p) => ({ id: `t-${p.id}`, titulo: p.nombre, detalle: p.cargo, grupo: "Personas", icono: <Users className="size-4" />, accion: () => router.push(`/trabajadores/ficha?id=${p.id}`) })) : []),
    ...equipos.map((e) => ({ id: `e-${e.codigo}`, titulo: `${e.codigo} · ${e.nombre}`, detalle: `${e.tipo} · ${e.estado.replace("_", " ")}`, grupo: "Equipos", icono: <Factory className="size-4" />, accion: () => router.push(`/planta?equipo=${e.codigo}`) })),
    ...(plcs.data ?? []).map((p) => ({ id: `p-${p.codigo}`, titulo: p.codigo, detalle: p.nombre, grupo: "Controladores PLC", icono: <Cpu className="size-4" />, accion: () => router.push(`/plc/equipo?codigo=${p.codigo}`) })),
    { id: "tema", titulo: tema === "claro" ? "Cambiar al tema oscuro" : "Cambiar al tema claro", grupo: "Acciones", icono: tema === "claro" ? <Moon className="size-4" /> : <Sun className="size-4" />, accion: alternar },
    { id: "seg", titulo: "Seguridad de la cuenta", detalle: "Clave y segundo factor", grupo: "Acciones", icono: <ShieldCheck className="size-4" />, accion: () => setSeguridad(true) },
    { id: "salir", titulo: "Cerrar sesión", grupo: "Acciones", icono: <LogOut className="size-4" />, accion: () => salir() },
  ], [puede, directorio.data, equipos, plcs.data, router, tema, alternar, salir]);

  const ancho = plegada ? 72 : 248;
  return (
    <AvisosProvider>
      <motion.aside animate={{ width: ancho }} transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }} className="fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-linea-suave bg-fondo-2 lg:flex">
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
            <motion.aside initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }} className="absolute inset-y-0 left-0 flex w-[280px] flex-col border-r border-linea bg-fondo-2">
              <button aria-label="Cerrar menú" onClick={() => setMovil(false)} className="absolute right-3 top-5 grid size-9 cursor-pointer place-items-center rounded-xl text-gris hover:text-negro"><X className="size-5" /></button>
              <Marca plegada={false} /><Lateral plegada={false} alNavegar={() => setMovil(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="min-h-dvh transition-[padding] duration-300 ease-out lg:pl-[var(--ancho-lateral)]" style={{ ["--ancho-lateral" as string]: `${ancho}px` }}>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-linea-suave bg-fondo-2 px-4 lg:px-8">
          <button aria-label="Abrir menú" onClick={() => setMovil(true)} className="grid size-10 cursor-pointer place-items-center rounded-xl text-gris hover:text-negro lg:hidden"><Menu className="size-5" /></button>
          <button onClick={abrirPaleta} className="flex h-9 min-w-0 max-w-[420px] flex-1 cursor-pointer items-center gap-2.5 rounded-md border border-linea-suave bg-chapa px-3 text-left text-[13px] text-gris transition-colors hover:border-linea">
            <Search className="size-4 shrink-0" /><span className="truncate">Buscar pantallas, personas, equipos o PLC…</span>
            <kbd className="ml-auto hidden rounded-md border border-linea px-1.5 py-0.5 text-[11px] sm:block">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            {puede("planta") && <Pulso />}
            <button onClick={alternar} aria-label="Cambiar tema" title={tema === "claro" ? "Tema oscuro" : "Tema claro"} className="grid size-9 cursor-pointer place-items-center rounded-md border border-linea-suave bg-papel text-gris transition-colors hover:text-negro">
              {tema === "claro" ? <Moon className="size-4" /> : <Sun className="size-4" />}
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
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 top-12 z-40 w-[260px] rounded-md border border-linea bg-papel p-2 shadow-[var(--s-sombra-flotante)]">
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

