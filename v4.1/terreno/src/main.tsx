import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import "@fontsource-variable/inter";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource-variable/jetbrains-mono";
import "./styles.css";
import { App } from "./App";
import { AuthProvider } from "./lib/auth";
import { PlantaProvider } from "./lib/planta";

// tema elegido en esta estación (oscuro por defecto)
try { if (localStorage.getItem("sima.tema.desktop") === "claro") document.documentElement.dataset.tema = "claro"; } catch { /* sin almacenamiento */ }

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, retry: 1, refetchOnWindowFocus: false, networkMode: "always" }, mutations: { networkMode: "always" } } });
createRoot(document.getElementById("raiz")!).render(
  <StrictMode>
    <QueryClientProvider client={qc}><MotionConfig reducedMotion="user"><AuthProvider><PlantaProvider><App /></PlantaProvider></AuthProvider></MotionConfig></QueryClientProvider>
  </StrictMode>,
);
