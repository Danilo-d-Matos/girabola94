import { defineConfig } from "vite";

// Girabola Craque — Vite + Three.js (npm). Os scripts do jogo ficam em public/legacy
// (scripts clássicos que partilham o âmbito global) e são carregados por src/main.js
// depois de o Three.js estar disponível em window.THREE.
export default defineConfig({
  base: "./",
  server: { port: 5173, strictPort: true, host: true },
  preview: { port: 5173, strictPort: true },
  build: { target: "es2020", chunkSizeWarningLimit: 2000 }
});
