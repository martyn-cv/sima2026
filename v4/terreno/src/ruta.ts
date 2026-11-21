import { useEffect, useState } from "react";

/** Enrutador mínimo por «#»: sirve igual en el navegador, la PWA y la ventana de Tauri. */
export const ruta = () => (window.location.hash.replace(/^#/, "") || "/");
export const ir = (r: string) => { window.location.hash = r; };
export function useRuta() {
  const [r, setR] = useState(ruta());
  useEffect(() => { const f = () => setR(ruta()); window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f); }, []);
  return r;
}
