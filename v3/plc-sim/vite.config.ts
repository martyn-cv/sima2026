import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";

// Vite sirve la interfaz tanto en el navegador (pruebas) como dentro de la ventana de Tauri.
export default defineConfig({
  plugins: [react(), tailwind()],
  clearScreen: false,
  server: { port: 1420, strictPort: true, host: true },
  build: { target: "es2022", sourcemap: false },
});
