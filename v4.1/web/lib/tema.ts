"use client";
import { useCallback, useEffect, useState } from "react";

/** Tema noche (oscuro, por defecto) o día (claro). Se guarda en el navegador. */
export function useTema() {
  const [tema, setTema] = useState<"noche" | "claro">("noche");
  useEffect(() => { setTema(document.documentElement.dataset.tema === "claro" ? "claro" : "noche"); }, []);
  const alternar = useCallback(() => {
    setTema((t) => {
      const n = t === "claro" ? "noche" : "claro";
      if (n === "claro") document.documentElement.dataset.tema = "claro"; else delete document.documentElement.dataset.tema;
      try { localStorage.setItem("sima.tema", n); } catch { /* sin almacenamiento */ }
      return n;
    });
  }, []);
  return { tema, alternar };
}

export const SCRIPT_TEMA = "try{if(localStorage.getItem('sima.tema')==='claro')document.documentElement.dataset.tema='claro'}catch(e){}";
