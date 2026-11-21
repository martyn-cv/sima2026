"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Boton, Chip, Encabezado, ErrorCarga, Seccion, Seleccion, Tabla, type Columna } from "@/components/ui";

interface Reg { id: number; fecha: string; usuarioNombre: string; accion: string; entidad: string; entidadId: string; detalle: string }
const ENTIDADES = ["trabajador", "contrato", "cuenta", "concepto", "asistencia", "habilitación", "parámetro", "cargo", "orden", "plc"];

export default function Auditoria() {
  const [entidad, setEntidad] = useState("");
  const [pagina, setPagina] = useState(1);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["auditoria", entidad, pagina], queryFn: () => api.get<{ total: number; items: Reg[] }>(`/api/auditoria?pagina=${pagina}${entidad ? `&entidad=${encodeURIComponent(entidad)}` : ""}`) });
  const columnas: Columna<Reg>[] = [
    { clave: "f", titulo: "Fecha y hora", render: (r) => <span className="num whitespace-nowrap">{new Date(r.fecha).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "medium" })}</span> },
    { clave: "u", titulo: "Quién", render: (r) => <span className="font-medium">{r.usuarioNombre}</span> },
    { clave: "a", titulo: "Qué hizo", render: (r) => r.accion },
    { clave: "e", titulo: "Sobre", render: (r) => <div className="flex items-center gap-2"><Chip punto={false}>{r.entidad}</Chip><span className="num text-[13px] text-gris">{r.entidadId}</span></div> },
    { clave: "d", titulo: "Detalle", render: (r) => <span className="text-[14px] text-gris">{r.detalle}</span> },
  ];
  const paginas = Math.max(1, Math.ceil((data?.total ?? 0) / 50));
  return (
    <>
      <Encabezado titulo="Auditoría" descripcion="Registro de quién cambió qué. Solo se agrega: nadie puede editarlo ni borrarlo desde la aplicación." />
      {error ? <ErrorCarga error={error} reintentar={() => void refetch()} /> : (
        <Seccion>
          <div className="flex flex-wrap items-center gap-3 border-b border-linea-suave p-4">
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
