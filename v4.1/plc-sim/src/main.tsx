import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import "@fontsource-variable/inter";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource-variable/jetbrains-mono";
import "./styles.css";
import { App } from "./App";

createRoot(document.getElementById("raiz")!).render(
  <StrictMode><MotionConfig reducedMotion="user"><App /></MotionConfig></StrictMode>,
);
