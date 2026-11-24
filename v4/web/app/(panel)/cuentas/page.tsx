"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { hace } from "@sima/cliente";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Boton, Chip, Dialogo, Encabezado, Entrada, ErrorCarga, Estado, Seccion, Seleccion, Tabla, mensajeDe, useAviso, type Columna } from "@/components/ui";

interface Cuenta { id: string; nombre: string; login: string; cargo: string; perfil: string; canal: string; estadoLaboral: string; estadoContrato: string; estadoCuenta: string; accesoWeb: boolean; accesoApp: boolean; ultimoAcceso?: string | null; bloqueada: boolean }

export default function Cuentas() {
  const router = useRouter();
  const { puede } = useAuth();
  const qc = useQueryClient();
  const aviso = useAviso();
  const [estado, setEstado] = useState("");
  const [canal, setCanal] = useState("");
  const [q, setQ] = useState("");
  const [clave, setClave] = useState<{ nombre: string; clave: string } | null>(null);
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ["cuentas"], queryFn: () => api.get<Cuenta[]>("/api/cuentas") });
  const lista = useMemo(() => data.filter((c) => (!estado || c.estadoCuenta === estado) && (!canal || c.canal === canal) && (!q || `${c.nombre} ${c.login} ${c.cargo}`.toLowerCase().includes(q.toLowerCase()))), [data, estado, canal, q]);
  const restablecer = useMutation({
    mutationFn: (c: Cuenta) => api.post<{ claveTemporal: string }>(`/api/cuentas/${c.id}/restablecer-clave`).then((r) => ({ nombre: c.nombre, clave: r.claveTemporal })),
    onSuccess: (r) => { setClave(r); void qc.invalidateQueries({ queryKey: ["cuentas"] }); }, onError: (e) => aviso(mensajeDe(e), "error"),
  });

  const columnas: Columna<Cuenta>[] = [
    { clave: "nombre", titulo: "Persona", valor: (c) => c.nombre, render: (c) => <div><p className="font-medium">{c.nombre}</p><p className="max-w-[260px] truncate text-[13px] text-gris">{c.cargo}</p></div> },
    { clave: "login", titulo: "Usuario", valor: (c) => c.login, render: (c) => <span className="text-[14px]">{c.login}</span> },
    { clave: "canal", titulo: "Ingresa por", valor: (c) => c.canal, render: (c) => <div><p>{c.canal === "web" ? "Web" : "App de terreno"}</p><p className="text-[13px] text-gris">{c.perfil}</p></div> },
    { clave: "acc", titulo: "Accesos", render: (c) => <div className="flex gap-1.5"><Chip punto={false} tono={c.accesoWeb ? "ok" : "neutro"}>Web</Chip><Chip punto={false} tono={c.accesoApp ? "ok" : "neutro"}>App</Chip></div> },
    { clave: "ultimo", titulo: "Último ingreso", valor: (c) => c.ultimoAcceso ?? "", render: (c) => <span className="text-gris">{hace(c.ultimoAcceso)}</span> },
    { clave: "cuenta", titulo: "Estado", valor: (c) => c.estadoCuenta, render: (c) => <div className="flex items-center gap-2"><Estado v={c.estadoCuenta} />{c.bloqueada && <Chip tono="aviso" punto={false}>Bloqueada</Chip>}</div> },
    { clave: "acc2", titulo: "", render: (c) => puede("cuentas", "editar") && c.estadoCuenta === "ACTIVA" ? <Boton tam="s" variante="contorno" onClick={(e) => { e.stopPropagation(); restablecer.mutate(c); }}>Nueva clave</Boton> : null },
  ];

  return (
    <>
      <Encabezado titulo="Cuentas de acceso" descripcion="Quién puede entrar hoy y por dónde. El estado sale del contrato de cada persona: nadie abre ni cierra cuentas a mano." />
      {error ? <ErrorCarga error={error} reintentar={() => void refetch()} /> : (
        <Seccion>
          <div className="flex flex-wrap items-center gap-3 border-b border-linea-suave p-4">
            <Entrada className="max-w-[320px]" placeholder="Buscar persona, usuario o cargo" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
            <Seleccion className="w-[160px]" value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado"><option value="">Todo estado</option><option value="ACTIVA">Activa</option><option value="SUSPENDIDA">Suspendida</option><option value="CERRADA">Cerrada</option></Seleccion>
            <Seleccion className="w-[160px]" value={canal} onChange={(e) => setCanal(e.target.value)} aria-label="Canal"><option value="">Web y app</option><option value="web">Solo web</option><option value="app">Solo app</option></Seleccion>
            <Chip punto={false} className="ml-auto">{lista.length} cuentas</Chip>
          </div>
          <Tabla columnas={columnas} filas={lista} clave={(c) => c.id} cargando={isLoading} alHacerClic={(c) => router.push(`/trabajadores/ficha?id=${c.id}`)} maxAlto="calc(100dvh - 330px)" />
        </Seccion>
      )}
      <Dialogo abierto={clave != null} onCerrar={() => setClave(null)} titulo="Clave temporal" ancho={460} pie={<Boton onClick={() => setClave(null)}>Listo</Boton>}>
        <p className="text-gris">Entregue esta clave a {clave?.nombre}. Se muestra una sola vez y sus sesiones abiertas se cerraron.</p>
        <p className="num mt-3 select-all bg-chapa px-4 py-3 text-center font-display text-[32px] font-bold tracking-wider">{clave?.clave}</p>
      </Dialogo>
    </>
  );
}
