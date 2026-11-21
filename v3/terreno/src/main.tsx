import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./styles.css";
import { App } from "./App";
import { AuthProvider } from "./lib/auth";
import { PlantaProvider } from "./lib/planta";

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, retry: 1, refetchOnWindowFocus: false } } });
createRoot(document.getElementById("raiz")!).render(
  <StrictMode>
    <QueryClientProvider client={qc}><MotionConfig reducedMotion="user"><AuthProvider><PlantaProvider><App /></PlantaProvider></AuthProvider></MotionConfig></QueryClientProvider>
  </StrictMode>,
);
