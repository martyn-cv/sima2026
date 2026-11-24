"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { PantallaSeguridad } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function PanelLayout({ children }: { children: ReactNode }) {
  const { usuario, cargando, refrescar, salir } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!cargando && !usuario) router.replace("/login"); }, [cargando, usuario, router]);
  if (!usuario) return <div className="grid min-h-dvh place-items-center"><span className="display text-3xl font-bold text-linea">SIMA</span></div>;
  if (usuario.restringido) return <PantallaSeguridad cliente={api} usuario={usuario} alNuevoToken={(t) => void refrescar(t)} alSalir={() => salir()} />;
  return <Shell>{children}</Shell>;
}
