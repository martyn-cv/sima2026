"use client";
import { useCallback, useEffect, useState } from "react";

/** Tema claro (por defecto en SIMA Web) u oscuro. Se guarda en el navegador de cada persona. */
export function useTema() {
  const [tema, setTema] = useState<"noche" | "claro">("claro");
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

// SIMA Web arranca en el tema claro profesional; el oscuro queda como preferencia de cada persona
export const SCRIPT_TEMA = "try{if(localStorage.getItem('sima.tema')==='noche')delete document.documentElement.dataset.tema;else document.documentElement.dataset.tema='claro'}catch(e){}";
