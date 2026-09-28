import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Configuración de Vite: activa el soporte de React (JSX, recarga en caliente).
// El "proxy" hace que, en desarrollo, las llamadas a /api y a las imágenes
// /uploads se reenvíen al servidor backend (puerto 3001) sin problemas de CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
      "/uploads": "http://localhost:3001",
    },
  },
});
