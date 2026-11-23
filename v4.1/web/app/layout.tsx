import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/sora";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { Providers } from "./providers";
import { SCRIPT_TEMA } from "@/lib/tema";

export const metadata: Metadata = {
  title: "SIMA · Administración",
  description: "Sistema de Información Manufacturero Andino: personas, contratos, remuneraciones, planta y PLC en una sola base de datos.",
};
export const viewport: Viewport = { themeColor: "#080a17", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-CL" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} /></head>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
