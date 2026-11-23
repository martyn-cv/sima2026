"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Globe, Monitor } from "lucide-react";
import { api } from "@/lib/api";
import { Chip, Encabezado, Entrada, ErrorCarga, Seccion, Seleccion, Tabla, type Columna } from "@/components/ui";

interface Acceso { id: number; fecha: string; trabajadorId?: string | null; persona?: string | null; login: string; plataforma: "web" | "app"; resultado: string; ip?: string | null; agente?: string | null }

const RESULTADO: Record<string, { t: string; tono: "ok" | "peligro" | "aviso" | "neutro" }> = {
  ok: { t: "Ingreso", tono: "ok" }, clave_incorrecta: { t: "Clave incorrecta", tono: "aviso" }, bloqueada: { t: "Bloqueada por intentos", tono: "peligro" },
  sin_acceso: { t: "Sin acceso a la plataforma", tono: "peligro" }, cerrada: { t: "Cuenta cerrada", tono: "neutro" }, suspendida: { t: "Cuenta suspendida", tono: "aviso" }, desconocido: { t: "Usuario desconocido", tono: "neutro" },
};

/** Registro de ingresos a SIMA Web y SIMA Desktop: correctos, fallidos, bloqueos e intentos sin autorización de plataforma. */
export default function Accesos() {
  const [resultado, setResultado] = useState("");
  const [plataforma, setPlataforma] = useState("");
  const [q, setQ] = useState("");
  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: ["accesos", resultado, plataforma],
    queryFn: () => api.get<Acceso[]>(`/api/accesos?${new URLSearchParams({ ...(resultado ? { resultado } : {}), ...(plataforma ? { plataforma } : {}) })}`),
    refetchInterval: 30_000,
  });
  const filas = useMemo(() => data.filter((a) => !q || `${a.persona ?? ""} ${a.login} ${a.ip ?? ""}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const fallidos = data.filter((a) => a.resultado !== "ok").length;
  const columnas: Columna<Acceso>[] = [
    { clave: "f", titulo: "Fecha y hora", valor: (a) => a.fecha, render: (a) => <span className="num whitespace-nowrap">{new Date(a.fecha).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "medium" })}</span> },
    { clave: "p", titulo: "Persona", valor: (a) => a.persona ?? a.login, render: (a) => <div><p className="font-medium">{a.persona ?? <span className="text-gris">Sin identificar</span>}</p><p className="text-[12px] text-gris">{a.login}</p></div> },
    { clave: "pl", titulo: "Plataforma", valor: (a) => a.plataforma, render: (a) => <span className="inline-flex items-center gap-1.5">{a.plataforma === "web" ? <Globe className="size-3.5 text-gris" /> : <Monitor className="size-3.5 text-gris" />}{a.plataforma === "web" ? "SIMA Web" : "SIMA Desktop"}</span> },
    { clave: "r", titulo: "Resultado", valor: (a) => a.resultado, render: (a) => <Chip tono={RESULTADO[a.resultado]?.tono ?? "neutro"}>{RESULTADO[a.resultado]?.t ?? a.resultado}</Chip> },
    { clave: "ip", titulo: "Origen", valor: (a) => a.ip ?? "", render: (a) => <div className="max-w-[260px]"><p className="t-dato">{a.ip ?? "—"}</p>{a.agente && <p className="truncate text-[11.5px] text-gris" title={a.agente}>{a.agente}</p>}</div> },
  ];
  return (
    <>
      <Encabezado titulo="Registro de accesos" descripcion="Cada intento de ingreso a SIMA Web y SIMA Desktop, correcto o fallido. Sirve para detectar intentos sin autorización de plataforma, claves incorrectas repetidas y bloqueos." />
      {error ? <ErrorCarga error={error} reintentar={() => void refetch()} /> : (
        <Seccion>
          <div className="flex flex-wrap items-center gap-3 border-b border-linea-suave p-4">
            <Entrada className="max-w-[300px]" placeholder="Buscar persona, usuario u origen" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
            <Seleccion className="w-[200px]" value={resultado} onChange={(e) => setResultado(e.target.value)} aria-label="Resultado">
              <option value="">Todos los resultados</option><option value="fallidos">Solo fallidos</option>{Object.entries(RESULTADO).map(([k, v]) => <option key={k} value={k}>{v.t}</option>)}
            </Seleccion>
            <Seleccion className="w-[170px]" value={plataforma} onChange={(e) => setPlataforma(e.target.value)} aria-label="Plataforma"><option value="">Ambas plataformas</option><option value="web">SIMA Web</option><option value="app">SIMA Desktop</option></Seleccion>
            <span className="ml-auto flex gap-2"><Chip punto={false}>{data.length} registros</Chip>{fallidos > 0 && <Chip tono="aviso" punto={false}>{fallidos} fallidos</Chip>}</span>
          </div>
          <Tabla columnas={columnas} filas={filas} clave={(a) => a.id} cargando={isLoading} porPagina={50} maxAlto="calc(100dvh - 330px)" vacio={<p className="p-10 text-center text-gris">Sin ingresos registrados con estos filtros.</p>} />
        </Seccion>
      )}
    </>
  );
}
