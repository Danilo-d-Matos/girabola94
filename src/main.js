// Ponto de entrada: o Three.js vem do npm (empacotado pelo Vite) e é exposto em window.THREE
// para o código do jogo (public/legacy/*.js). Só depois se carregam os scripts do jogo, por ordem.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

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

const base = import.meta.env.BASE_URL;
const scripts = [
  "legacy/game.js",
  "legacy/gl3d.js",
  "legacy/scroll-arrows.js",
  "legacy/popups.js",
  "legacy/cam-zoom.js",
  "legacy/audio-engine.js",
  "legacy/var-system.js",
  "legacy/fit-engine.js",
  "modelos/multidao.js",
  "legacy/crowd-hooks.js"
];
for (const src of scripts) {
  const s = document.createElement("script");
  s.src = base + src;
  s.async = false; // mantém a ordem de execução
  document.body.appendChild(s);
}
