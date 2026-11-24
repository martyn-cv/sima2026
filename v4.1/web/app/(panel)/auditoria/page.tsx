"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Boton, Chip, Encabezado, Entrada, ErrorCarga, Seccion, Seleccion, Tabla, defEstado, type Columna } from "@/components/ui";

interface Reg { id: number; fecha: string; usuarioNombre: string; cargo?: string | null; plataforma?: string | null; accion: string; entidad: string; entidadId: string; detalle: string; valorAnterior?: string | null; valorNuevo?: string | null; motivo?: string | null }
const ENTIDADES = ["trabajador", "contrato", "cuenta", "concepto", "asistencia", "habilitación", "parámetro", "cargo", "orden", "equipo", "plc"];
/** Los valores de estado de equipo se muestran con su nombre; el resto, tal como se guardó. */
const valor = (v?: string | null) => (v ? (defEstado(v).etiqueta !== v ? defEstado(v).etiqueta : v) : "—");

export default function Auditoria() {
  const [entidad, setEntidad] = useState("");
  const [pagina, setPagina] = useState(1);
  const [buscar, setBuscar] = useState("");
  const [texto, setTexto] = useState("");
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["auditoria", entidad, buscar, pagina], queryFn: () => api.get<{ total: number; items: Reg[] }>(`/api/auditoria?pagina=${pagina}${entidad ? `&entidad=${encodeURIComponent(entidad)}` : ""}${buscar ? `&buscar=${encodeURIComponent(buscar)}` : ""}`) });
  const columnas: Columna<Reg>[] = [
    { clave: "f", titulo: "Fecha y hora", render: (r) => <span className="num whitespace-nowrap">{new Date(r.fecha).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "medium" })}</span> },
    { clave: "u", titulo: "Quién", render: (r) => <div><p className="font-medium">{r.usuarioNombre}</p>{r.cargo && <p className="max-w-[220px] truncate text-[12px] text-gris">{r.cargo}</p>}</div> },
    { clave: "pl", titulo: "Plataforma", render: (r) => <span className="whitespace-nowrap text-[13px] text-gris">{r.plataforma === "app" ? "SIMA Desktop" : r.plataforma === "web" ? "SIMA Web" : r.plataforma ?? "—"}</span> },
    { clave: "a", titulo: "Qué hizo", render: (r) => r.accion },
    { clave: "e", titulo: "Sobre", render: (r) => <div className="flex items-center gap-2"><Chip punto={false}>{r.entidad}</Chip><span className="t-dato text-gris">{r.entidadId}</span></div> },
    { clave: "c", titulo: "Cambio", render: (r) => r.valorAnterior || r.valorNuevo ? <span className="inline-flex flex-wrap items-center gap-1.5 text-[12.5px]"><span className="text-gris line-through decoration-gris/50">{valor(r.valorAnterior)}</span><ArrowRight className="size-3 text-gris" /><span className="font-medium">{valor(r.valorNuevo)}</span></span> : <span className="text-[13px] text-gris">{r.detalle || "—"}</span> },
    { clave: "m", titulo: "Motivo", render: (r) => <span className="text-[13px] text-carbon">{r.motivo || <span className="text-apagado">—</span>}</span> },
  ];
  const paginas = Math.max(1, Math.ceil((data?.total ?? 0) / 50));
  return (
    <>
      <Encabezado titulo="Auditoría" descripcion="Quién hizo qué, con qué cargo, desde qué plataforma, el valor anterior y el nuevo, y el motivo. Solo se agrega: nadie puede editarlo ni borrarlo desde la aplicación." />
      {error ? <ErrorCarga error={error} reintentar={() => void refetch()} /> : (
        <Seccion>
          <div className="flex flex-wrap items-center gap-3 border-b border-linea-suave p-4">
            <form onSubmit={(e) => { e.preventDefault(); setBuscar(texto.trim()); setPagina(1); }} className="flex gap-2"><Entrada className="w-[260px]" placeholder="Persona, acción o código" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Buscar en la auditoría" /><Boton type="submit" variante="secundario">Buscar</Boton></form>
            <Seleccion className="w-[200px]" value={entidad} onChange={(e) => { setEntidad(e.target.value); setPagina(1); }} aria-label="Entidad"><option value="">Todo</option>{ENTIDADES.map((e) => <option key={e}>{e}</option>)}</Seleccion>
            <Chip punto={false} className="ml-auto">{data?.total ?? 0} registros</Chip>
          </div>
          <Tabla columnas={columnas} filas={data?.items ?? []} clave={(r) => r.id} cargando={isLoading} maxAlto="calc(100dvh - 330px)" vacio={<p className="p-10 text-center text-gris">Todavía no hay cambios registrados.</p>} />
          <div className="flex items-center justify-between border-t border-linea-suave p-3"><Boton tam="s" variante="contorno" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>Anterior</Boton><span className="text-[14px] text-gris">Página {pagina} de {paginas}</span><Boton tam="s" variante="contorno" disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)}>Siguiente</Boton></div>
        </Seccion>
      )}
    </>
  );
}
