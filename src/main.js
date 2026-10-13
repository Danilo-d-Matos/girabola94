// Ponto de entrada: o Three.js vem do npm (empacotado pelo Vite) e é exposto em window.THREE
// para o código do jogo (public/legacy/*.js). Só depois se carregam os scripts do jogo, por ordem.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import * as Colyseus from "colyseus.js";
// Tipografia: Rajdhani (títulos e números) e Inter (texto), servidas localmente pelo Vite
import "@fontsource/rajdhani/latin-500.css";
import "@fontsource/rajdhani/latin-600.css";
import "@fontsource/rajdhani/latin-700.css";
import "@fontsource/rajdhani/latin-ext-600.css";
import "@fontsource/rajdhani/latin-ext-700.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/inter/latin-ext-400.css";
import "@fontsource/inter/latin-ext-600.css";

// O jogo foi afinado com o fluxo de cor e as luzes "clássicos" (sem conversão sRGB, intensidades não físicas).
// O Three.js r160 é a última versão que ainda tem `useLegacyLights`, por isso fica fixada em 0.160.1.
THREE.ColorManagement.enabled = false;

class JogoRenderer extends THREE.WebGLRenderer {
  constructor(opcoes) {
    super(opcoes);
    this.useLegacyLights = true;
    this.outputColorSpace = THREE.LinearSRGBColorSpace;
  }
}

window.THREE = Object.assign({}, THREE, { WebGLRenderer: JogoRenderer, GLTFLoader, SkeletonUtils });

window.Colyseus = Colyseus;
// Endereço do servidor online: VITE_SERVIDOR_ONLINE (ex.: wss://girabola.exemplo.com); por omissão, a mesma máquina, porta 2567
if (import.meta.env.VITE_SERVIDOR_ONLINE) window.GIRABOLA_SERVIDOR = import.meta.env.VITE_SERVIDOR_ONLINE;

const base = import.meta.env.BASE_URL;
const scripts = [
  "legacy/game.js",
  "legacy/gl3d.js",
  "legacy/scroll-arrows.js",
  "legacy/popups.js",
  "legacy/cam-zoom.js",
  "legacy/audio-engine.js",
  "legacy/audio-samples.js",
  "legacy/audio-menu.js",
  "legacy/var-system.js",
  "legacy/fit-engine.js",
  "modelos/multidao.js",
  "legacy/crowd-hooks.js",
  "legacy/tutorial-ui.js",
  "legacy/online.js",
  "legacy/setpieces94.js",
  "legacy/responsive94.js",
  "legacy/progress94.js",
  "legacy/clube94.js",
  "legacy/menu94.js",
  "legacy/tipografia94.js"
];
// O ecrã só aparece quando o último script (o menu novo) acabou de carregar: assim não se vê o menu antigo por um instante.
const fontes = Promise.race([Promise.all(["500 20px Rajdhani", "600 20px Rajdhani", "700 20px Rajdhani", "400 15px Inter", "600 15px Inter"].map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 2500))]).catch(() => {});
const revelar = () => fontes.then(() => document.documentElement.classList.remove("booting"));
setTimeout(revelar, 12000);
addEventListener("error", () => setTimeout(revelar, 1500));
scripts.forEach((src, i) => {
  const s = document.createElement("script");
  s.src = base + src;
  s.async = false; // mantém a ordem de execução
  if (i === scripts.length - 1) { s.onload = () => requestAnimationFrame(revelar); s.onerror = revelar; }
  document.body.appendChild(s);
});
