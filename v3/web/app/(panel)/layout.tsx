"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { useAuth } from "@/lib/auth";

export default function PanelLayout({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!cargando && !usuario) router.replace("/login"); }, [cargando, usuario, router]);
  if (!usuario) return <div className="grid min-h-dvh place-items-center"><span className="display text-3xl font-bold text-linea">SIMA</span></div>;
  return <Shell>{children}</Shell>;
}
