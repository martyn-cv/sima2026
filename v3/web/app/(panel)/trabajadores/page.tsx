"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Download, Plus, Search } from "lucide-react";
import { clp, fecha, type TrabajadorResumen } from "@sima/cliente";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { descargarCsv } from "@/lib/csv";
import { TURNO_NOMBRE } from "@/lib/listas";
import { Boton, Chip, Encabezado, Entrada, Estado, ErrorCarga, Seccion, Seleccion, Tabla, type Columna } from "@/components/ui";

export default function Trabajadores() {
  const router = useRouter();
  const { puede } = useAuth();
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("Activo");
  const [tipo, setTipo] = useState("");
  const [cuenta, setCuenta] = useState("");
  const [familia, setFamilia] = useState("");
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ["trabajadores"], queryFn: () => api.get<TrabajadorResumen[]>("/api/trabajadores") });

  const familias = useMemo(() => [...new Set(data.map((t) => t.familia))], [data]);
  const filtradas = useMemo(() => {
    const b = q.trim().toLowerCase();
    return data.filter((t) => (!estado || t.estadoLaboral === estado) && (!tipo || t.tipoContrato === tipo) && (!cuenta || t.estadoCuenta === cuenta) && (!familia || t.familia === familia)
      && (!b || `${t.nombre} ${t.rut} ${t.cargo} ${t.correoCorporativo} ${t.id}`.toLowerCase().includes(b)));
  }, [data, q, estado, tipo, cuenta, familia]);

  const columnas: Columna<TrabajadorResumen>[] = [
    { clave: "nombre", titulo: "Persona", valor: (t) => t.nombre, render: (t) => <div><p className="font-medium">{t.nombre}</p><p className="num text-[13px] text-gris">{t.rut} · {t.id}</p></div> },
    { clave: "cargo", titulo: "Cargo", valor: (t) => t.cargo, render: (t) => <div className="max-w-[300px]"><p className="truncate" title={t.cargo}>{t.cargo}</p><p className="truncate text-[13px] text-gris">{t.familia}</p></div> },
    { clave: "turno", titulo: "Turno", valor: (t) => t.turno, render: (t) => <span className="text-gris">{TURNO_NOMBRE[t.turno] ?? t.turno}</span> },
    { clave: "contrato", titulo: "Contrato", valor: (t) => t.tipoContrato, render: (t) => t.tipoContrato ? <div><p>{t.tipoContrato}</p>{t.venceContrato && t.estadoLaboral === "Activo" && <p className={`text-[13px] ${(t.diasParaVencer ?? 99) <= 30 ? "text-rojo" : "text-gris"}`}>vence {fecha(t.venceContrato)}</p>}</div> : <span className="text-gris">—</span> },
    { clave: "sueldo", titulo: "Sueldo base", alinear: "derecha", valor: (t) => t.sueldoBase, render: (t) => clp(t.sueldoBase) },
    { clave: "cuenta", titulo: "Cuenta", valor: (t) => t.estadoCuenta, render: (t) => <Estado v={t.estadoCuenta} /> },
  ];

  return (
    <>
      <Encabezado titulo="Trabajadores" descripcion="Ficha completa de cada persona: datos, contrato, cuenta de acceso y habilitaciones."
        acciones={<>
          <Boton variante="contorno" onClick={() => descargarCsv("trabajadores.csv", ["ID", "RUT", "Nombre", "Cargo", "Área", "Turno", "Contrato", "Sueldo base", "Estado", "Cuenta"], filtradas.map((t) => [t.id, t.rut, t.nombre, t.cargo, t.familia, TURNO_NOMBRE[t.turno], t.tipoContrato, t.sueldoBase, t.estadoLaboral, t.estadoCuenta]))}><Download className="size-4" />Exportar</Boton>
          {puede("personal", "editar") && <Link href="/trabajadores/nuevo"><Boton variante="rojo"><Plus className="size-4" />Nuevo trabajador</Boton></Link>}
        </>} />
      {error ? <ErrorCarga error={error} reintentar={() => void refetch()} /> : (
        <Seccion>
          <div className="flex flex-wrap items-center gap-3 border-b border-linea-suave p-4">
            <div className="relative min-w-[240px] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gris" /><Entrada className="pl-9" placeholder="Buscar por nombre, RUT, cargo o correo" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar trabajadores" /></div>
            <Seleccion className="w-[150px]" value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado laboral"><option value="">Todos</option><option>Activo</option><option>Desvinculado</option></Seleccion>
            <Seleccion className="w-[160px]" value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo de contrato"><option value="">Todo contrato</option><option>Indefinido</option><option>Plazo fijo</option><option>Honorarios</option></Seleccion>
            <Seleccion className="w-[160px]" value={cuenta} onChange={(e) => setCuenta(e.target.value)} aria-label="Estado de la cuenta"><option value="">Toda cuenta</option><option value="ACTIVA">Activa</option><option value="SUSPENDIDA">Suspendida</option><option value="CERRADA">Cerrada</option></Seleccion>
            <Seleccion className="w-[210px]" value={familia} onChange={(e) => setFamilia(e.target.value)} aria-label="Área"><option value="">Todas las áreas</option>{familias.map((f) => <option key={f}>{f}</option>)}</Seleccion>
            <Chip tono="neutro" punto={false} className="ml-auto">{filtradas.length} de {data.length}</Chip>
          </div>
          <Tabla columnas={columnas} filas={filtradas} clave={(t) => t.id} cargando={isLoading} alHacerClic={(t) => router.push(`/trabajadores/${t.id}`)} maxAlto="calc(100dvh - 330px)" />
        </Seccion>
      )}
    </>
  );
}
