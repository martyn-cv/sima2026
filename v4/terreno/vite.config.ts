import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwind()],
  clearScreen: false,
  server: { port: 1421, strictPort: true, host: true },
  build: { target: "es2022", sourcemap: false },
});
