"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { UserMinus } from "lucide-react";
import { clp, fecha, type TrabajadorResumen } from "@sima/cliente";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { DialogoDesvincular } from "@/components/DialogoDesvincular";
import { Boton, Campo, Chip, Dialogo, Encabezado, ErrorCarga, Estado, Seccion, Seleccion, Tabla, type Columna } from "@/components/ui";

interface Termino { id: number; trabajadorId: string; trabajador: string; cargo: string; fechaTermino: string; causal: string; avisoPrevio: boolean; finiquitoMonto: number; responsable?: string | null }

export default function Desvinculaciones() {
  const router = useRouter();
  const { puede } = useAuth();
  const [eligiendo, setEligiendo] = useState(false);
  const [elegido, setElegido] = useState("");
  const [persona, setPersona] = useState<TrabajadorResumen | null>(null);
  const { data = [], isLoading, error, refetch } = useQuery({ queryKey: ["terminos"], queryFn: () => api.get<Termino[]>("/api/terminos") });
  const activos = useQuery({ queryKey: ["trabajadores"], queryFn: () => api.get<TrabajadorResumen[]>("/api/trabajadores"), enabled: eligiendo });
  const lista = (activos.data ?? []).filter((t) => t.estadoLaboral === "Activo");

  const columnas: Columna<Termino>[] = [
    { clave: "fecha", titulo: "Fecha", valor: (t) => t.fechaTermino, render: (t) => <span className="num font-medium">{fecha(t.fechaTermino)}</span> },
    { clave: "trabajador", titulo: "Persona", valor: (t) => t.trabajador, render: (t) => <div><p className="font-medium">{t.trabajador}</p><p className="max-w-[280px] truncate text-[13px] text-gris">{t.cargo}</p></div> },
    { clave: "causal", titulo: "Causal", render: (t) => <span className="text-[14px]">{t.causal}</span> },
    { clave: "aviso", titulo: "Aviso previo", render: (t) => <Chip tono={t.avisoPrevio ? "ok" : "neutro"} punto={false}>{t.avisoPrevio ? "Sí" : "No"}</Chip> },
    { clave: "finiquito", titulo: "Finiquito", alinear: "derecha", valor: (t) => t.finiquitoMonto, render: (t) => clp(t.finiquitoMonto) },
    { clave: "resp", titulo: "Registró", render: (t) => <span className="text-gris">{t.responsable ?? "—"}</span> },
    { clave: "cuenta", titulo: "Cuenta", render: (t) => <Estado v={t.fechaTermino <= new Date().toISOString().slice(0, 10) ? "CERRADA" : "ACTIVA"} /> },
  ];

  return (
    <>
      <Encabezado titulo="Desvinculaciones" descripcion="Al registrar una desvinculación la cuenta de la persona se cierra y sus sesiones terminan, en la web y en la app."
        acciones={puede("terminos", "editar") ? <Boton variante="peligro" onClick={() => { setElegido(""); setEligiendo(true); }}><UserMinus className="size-4" />Registrar desvinculación</Boton> : undefined} />
      {error ? <ErrorCarga error={error} reintentar={() => void refetch()} /> : (
        <Seccion><Tabla columnas={columnas} filas={data} clave={(t) => t.id} cargando={isLoading} alHacerClic={(t) => router.push(`/trabajadores/${t.trabajadorId}`)} vacio={<p className="p-10 text-center text-gris">Todavía no hay desvinculaciones registradas.</p>} /></Seccion>
      )}
      <Dialogo abierto={eligiendo} onCerrar={() => setEligiendo(false)} titulo="¿A quién se desvincula?" ancho={520}
        pie={<><Boton variante="contorno" onClick={() => setEligiendo(false)}>Cancelar</Boton><Boton disabled={!elegido} onClick={() => { setPersona(lista.find((t) => t.id === elegido) ?? null); setEligiendo(false); }}>Continuar</Boton></>}>
        <Campo etiqueta="Persona activa"><Seleccion value={elegido} onChange={(e) => setElegido(e.target.value)}><option value="">Elegir…</option>{lista.map((t) => <option key={t.id} value={t.id}>{t.nombre} — {t.cargo}</option>)}</Seleccion></Campo>
      </Dialogo>
      {persona && <DialogoDesvincular persona={persona} abierto onCerrar={() => setPersona(null)} />}
    </>
  );
}
