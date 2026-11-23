import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/sora";
import "@fontsource-variable/jetbrains-mono";
import "./styles.css";
import { App } from "./App";

createRoot(document.getElementById("raiz")!).render(
  <StrictMode><MotionConfig reducedMotion="user"><App /></MotionConfig></StrictMode>,
);
