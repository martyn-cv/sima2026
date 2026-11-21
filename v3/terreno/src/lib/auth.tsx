import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Usuario } from "@sima/cliente";
import { api, guardarToken, leerToken } from "./api";

interface Ctx { usuario: Usuario | null; cargando: boolean; aviso: string | null; entrar: (correo: string, clave: string) => Promise<void>; salir: (motivo?: string) => void; puede: (r: string, a?: "ver" | "editar") => boolean }
const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  const qc = useQueryClient();

  const salir = useCallback((motivo?: string) => { guardarToken(null); setUsuario(null); qc.clear(); if (motivo) setAviso(motivo); }, [qc]);
  useEffect(() => {
    if (!leerToken()) { setCargando(false); return; }
    api.get<Usuario>("/api/auth/yo").then(setUsuario).catch(() => guardarToken(null)).finally(() => setCargando(false));
  }, []);
  useEffect(() => {
    const f = () => salir("Su sesión terminó: la cuenta se cerró o venció. Ingrese de nuevo.");
    window.addEventListener("sima:sesion-expirada", f);
    return () => window.removeEventListener("sima:sesion-expirada", f);
  }, [salir]);

  const entrar = useCallback(async (correo: string, clave: string) => {
    const r = await api.login(correo, clave, "app");
    guardarToken(r.token); setAviso(null); setUsuario(r.usuario);
  }, []);

  const valor = useMemo<Ctx>(() => ({ usuario, cargando, aviso, entrar, salir, puede: (r, a = "ver") => { const p = usuario?.permisos?.[r]; return a === "editar" ? p === "editar" : p === "ver" || p === "editar"; } }), [usuario, cargando, aviso, entrar, salir]);
  return <AuthCtx.Provider value={valor}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => { const c = useContext(AuthCtx); if (!c) throw new Error("useAuth fuera de AuthProvider"); return c; };
