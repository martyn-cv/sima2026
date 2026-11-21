"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { FormularioTrabajador, VACIO, aCuerpo } from "@/components/FormularioTrabajador";
import { Encabezado, Seccion, Vacio, mensajeDe, useAviso } from "@/components/ui";

export default function NuevoTrabajador() {
  const { puede } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const aviso = useAviso();
  const m = useMutation({
    mutationFn: (v: Parameters<typeof aCuerpo>[0]) => api.post<{ id: string; login: string }>("/api/trabajadores", aCuerpo(v, true)),
    onSuccess: (r) => {
      for (const k of ["trabajadores", "panel", "cuentas", "directorio", "contratos", "organigrama", "cargos"]) void qc.invalidateQueries({ queryKey: [k] });
      aviso(`Cuenta creada. Usuario: ${r.login}`);
      router.push(`/trabajadores/${r.id}`);
    },
    onError: (e) => aviso(mensajeDe(e), "error"),
  });
  if (!puede("personal", "editar")) return <Vacio titulo="Sin permiso" texto="Solo Personas puede crear trabajadores." />;
  return (
    <>
      <Encabezado atras={<Link href="/trabajadores" className="mb-2 inline-flex items-center gap-1 text-[14px] text-gris hover:text-negro"><ArrowLeft className="size-4" />Trabajadores</Link>}
        titulo="Nuevo trabajador" descripcion="Al guardar se crean la ficha, el contrato inicial y la cuenta de acceso, según el canal del cargo." />
      <Seccion className="px-6 pb-6 pt-5"><FormularioTrabajador inicial={VACIO} modo="crear" alEnviar={(v) => m.mutate(v)} enviando={m.isPending} alCancelar={() => router.push("/trabajadores")} /></Seccion>
    </>
  );
}
