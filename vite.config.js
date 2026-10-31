import { defineConfig, loadEnv } from "vite";

// Girabola Craque — Vite + Three.js (npm). Os scripts do jogo ficam em public/legacy
// (scripts clássicos que partilham o âmbito global) e são carregados por src/main.js
// depois de o Three.js estar disponível em window.THREE.
// A área de administração (public/admin) descobre o servidor sozinha: no build é gerado admin/servidor.json
// com o endereço de VITE_SERVIDOR_ONLINE (o mesmo do jogo), para o administrador não ter de o escrever.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    base: "./",
    server: { port: 5173, strictPort: true, host: true },
    preview: { port: 5173, strictPort: true },
    build: { target: "es2020", chunkSizeWarningLimit: 2000 },
    plugins: [{
      name: "admin-servidor",
      generateBundle() {
        const u = env.VITE_SERVIDOR_ONLINE || "";
        if (u) this.emitFile({ type: "asset", fileName: "admin/servidor.json", source: JSON.stringify({ url: u }) });
      }
    }]
  };
});
