import { useEffect, useState } from "react";

/** Enrutador mínimo por «#»: sirve igual en el navegador, la PWA y la ventana de Tauri. */
export const ruta = () => (window.location.hash.replace(/^#/, "") || "/");
export const ir = (r: string) => { window.location.hash = r; };
export function useRuta() {
  const [r, setR] = useState(ruta());
  useEffect(() => { const f = () => setR(ruta()); window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f); }, []);
  return r;
}

/** Parámetro de la ruta actual (#/explorador?equipo=TC-01 → useParametro("equipo") = "TC-01"). */
export function useParametro(nombre: string) {
  const r = useRuta();
  const q = r.split("?")[1] ?? "";
  return new URLSearchParams(q).get(nombre);
}
