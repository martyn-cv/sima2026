"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { Usuario } from "@sima/cliente";
import { api, guardarToken, leerToken } from "./api";

interface Ctx {
  usuario: Usuario | null;
  cargando: boolean;
  aviso: string | null;
  entrar: (correo: string, clave: string, codigo?: string) => Promise<void>;
  refrescar: (token?: string) => Promise<void>;
  salir: (motivo?: string) => void;
  puede: (recurso: string, accion?: "ver" | "editar") => boolean;
}
const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  const router = useRouter();
  const qc = useQueryClient();

  const salir = useCallback((motivo?: string) => {
    guardarToken(null);
    setUsuario(null);
    qc.clear();
    if (motivo) setAviso(motivo);
    router.replace("/login");
  }, [qc, router]);

  useEffect(() => {
    const t = leerToken();
    if (!t) { setCargando(false); return; }
    api.get<Usuario>("/api/auth/yo").then(setUsuario).catch(() => guardarToken(null)).finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    const f = () => salir("Su sesión terminó porque la cuenta se cerró o venció. Ingrese de nuevo.");
    window.addEventListener("sima:sesion-expirada", f);
    return () => window.removeEventListener("sima:sesion-expirada", f);
  }, [salir]);

  const entrar = useCallback(async (correo: string, clave: string, codigo?: string) => {
    const r = await api.login(correo, clave, "web", codigo);
    guardarToken(r.token);
    setAviso(null);
    setUsuario(r.usuario);
    router.replace("/");
  }, [router]);

  /** Después de cambiar la clave o activar el segundo factor el servidor entrega un token nuevo: se guarda y se relee el perfil. */
  const refrescar = useCallback(async (token?: string) => {
    if (token) guardarToken(token);
    setUsuario(await api.get<Usuario>("/api/auth/yo"));
  }, []);

  const valor = useMemo<Ctx>(() => ({
    usuario, cargando, aviso, entrar, refrescar, salir,
    puede: (recurso, accion = "ver") => {
      const p = usuario?.permisos?.[recurso];
      return accion === "editar" ? p === "editar" : p === "ver" || p === "editar";
    },
  }), [usuario, cargando, aviso, entrar, refrescar, salir]);

  return <AuthCtx.Provider value={valor}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth fuera de AuthProvider");
  return c;
};
