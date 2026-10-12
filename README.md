# Girabola Craque (Vite + Three.js)

```bash
cd html
npm install
npm run dev      # http://localhost:5173
npm run build    # gera html/dist (servir com `npm run preview`)
```

- **Three.js 0.160.1** vem do npm (fixada: é a última com `useLegacyLights`, de que o aspeto do jogo depende). `src/main.js` importa o Three.js e os addons (`GLTFLoader`, `SkeletonUtils`), expõe-nos em `window.THREE` e carrega por ordem os scripts do jogo.
- `public/legacy/*.js`: código do jogo (scripts clássicos que partilham o âmbito global).
- `public/modelos/`: jogador, cenários, adeptos, bolas, emblemas e texturas das equipas.
- `serve.js` já não é preciso (era o servidor da versão de ficheiro único).
