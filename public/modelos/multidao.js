/* Girabola Craque — adeptos (multidao.js + equipasGirabola.js) adaptados ao Three.js r128 como script clássico */
(function(){
'use strict';
const THREE = window.THREE;
const EQUIPAS = [
 {
  "id": "sao_salvador",
  "nome": "São Salvador",
  "corPrimaria": "#d81e22",
  "corSecundaria": "#f2f2f2",
  "padrao": "liso"
 },
 {
  "id": "desportivo_huila",
  "nome": "Desportivo da Huíla",
  "corPrimaria": "#d81e22",
  "corSecundaria": "#161616",
  "padrao": "faixa_vertical"
 },
 {
  "id": "interclube",
  "nome": "Interclube",
  "corPrimaria": "#1d4ed8",
  "corSecundaria": "#161616",
  "padrao": "riscas"
 },
 {
  "id": "kabuscorp",
  "nome": "Kabuscorp",
  "corPrimaria": "#f2f2f2",
  "corSecundaria": "#d81e22",
  "padrao": "faixa_vertical"
 },
 {
  "id": "sagrada_esperanca",
  "nome": "Sagrada Esperança",
  "corPrimaria": "#1f8a3c",
  "corSecundaria": "#f2f2f2",
  "padrao": "faixa_horizontal"
 },
 {
  "id": "primeiro_agosto",
  "nome": "1.º de Agosto",
  "corPrimaria": "#d81e22",
  "corSecundaria": "#161616",
  "padrao": "riscas"
 },
 {
  "id": "wiliete",
  "nome": "Wiliete de Benguela",
  "corPrimaria": "#1d8a3a",
  "corSecundaria": "#f5d000",
  "padrao": "liso"
 },
 {
  "id": "petro_luanda",
  "nome": "Petro de Luanda",
  "corPrimaria": "#f8c70d",
  "corSecundaria": "#1239b8",
  "padrao": "liso"
 },
 {
  "id": "lunda_sul",
  "nome": "Desportivo da Lunda Sul",
  "corPrimaria": "#5cb3ef",
  "corSecundaria": "#f2f2f2",
  "padrao": "riscas"
 },
 {
  "id": "fc_luanda",
  "nome": "FC Luanda",
  "corPrimaria": "#1f55c9",
  "corSecundaria": "#f2f2f2",
  "padrao": "riscas"
 },
 {
  "id": "fc_cabinda",
  "nome": "FC Cabinda",
  "corPrimaria": "#2257c8",
  "corSecundaria": "#f2f2f2",
  "padrao": "riscas"
 },
 {
  "id": "estrela_1_maio",
  "nome": "Estrela 1.º de Maio",
  "corPrimaria": "#d42326",
  "corSecundaria": "#f2f2f2",
  "padrao": "liso"
 },
 {
  "id": "recreativo_caala",
  "nome": "Recreativo da Caála",
  "corPrimaria": "#f2f2f2",
  "corSecundaria": "#1f55c9",
  "padrao": "faixa_diagonal"
 },
 {
  "id": "academica_lobito",
  "nome": "Académica do Lobito",
  "corPrimaria": "#1b1b1b",
  "corSecundaria": "#d6a84a",
  "padrao": "liso"
 },
 {
  "id": "recreativo_libolo",
  "nome": "Recreativo do Libolo",
  "corPrimaria": "#f57a22",
  "corSecundaria": "#1d3fc4",
  "padrao": "liso"
 },
 {
  "id": "bravos_maquis",
  "nome": "Bravos do Maquis",
  "corPrimaria": "#1f55c9",
  "corSecundaria": "#f2f2f2",
  "padrao": "riscas"
 }
];

function coresDoJogo(casaId, visitanteId) {
  const c = EQUIPAS.find((e) => e.id === casaId), v = EQUIPAS.find((e) => e.id === visitanteId);
  return { homeTeamPrimaryColor: c.corPrimaria, homeTeamSecondaryColor: c.corSecundaria, homeTeamPattern: c.padrao,
           awayTeamPrimaryColor: v.corPrimaria, awayTeamSecondaryColor: v.corSecundaria, awayTeamPattern: v.padrao };
}

//
// • adeptos.glb tem um esqueleto com TODAS as variantes como partes separadas (corpo M/F, 7 cabelos, 4 chapéus,
//   cachecol, bandeira, bandeirinha, cachecol nas mãos, vuvuzela, tambor, capa) e 18 animações.
// • As animações são "cozidas" em texturas (VAT) ao carregar; cada variante é um InstancedMesh com só os adeptos
//   que a usam → o GPU só processa o que se vê. 2 níveis de detalhe (perto/longe).
// • Cores e padrões das equipas (riscas, xadrez, metades…) são uniforms: mudar de jogo não reconstrói nada.
//
//   import { criarMultidao, criarAdepto, PADROES } from './multidao.js';
//   const multidao = await criarMultidao(scene, 'adeptos.glb', campo.lugaresAdeptos, { qualidade: 'alta' });
//   multidao.definirEquipas({ homeTeamPrimaryColor: '#d81e22', homeTeamSecondaryColor: '#111111', homeTeamPattern: 'riscas',
//                             awayTeamPrimaryColor: '#f8c70d', awayTeamSecondaryColor: '#111111', awayTeamPattern: 'riscas' });
//   multidao.update(dt, camera);          // no ciclo do jogo
//   multidao.evento('golo_casa');         // golo_casa|golo_visitante|ataque_casa|ataque_visitante|falhanco_casa|falhanco_visitante|calma|intervalo

const SkeletonUtils = THREE.SkeletonUtils;

const PADROES = { liso: 0, riscas: 1, riscas_horizontais: 2, xadrez: 3, metades: 4, faixa_diagonal: 5, faixa_vertical: 6, faixa_horizontal: 7 };
const R = { PELE: 0, CABELO_CURTO: 1, CABELO_AFRO: 2, CABELO_TRANCAS: 3, CABELO_CARRAPITO: 4, LENCO: 5, PERUCA: 6, BONE: 7, BONE_PALA: 8,
  CHAPEU: 9, FITA: 10, CAMISOLA_M: 11, CAMISOLA_F: 12, MANGAS: 13, BACIA_M: 14, BACIA_F: 15, PERNAS: 16, SAPATOS: 17, CACHECOL_PESCOCO: 18,
  BANDEIRA_MASTRO: 19, BANDEIRA_PANO: 20, BANDEIRINHA: 21, CACHECOL_MAOS: 22, VUVUZELA: 23, TAMBOR_CORPO: 24, TAMBOR_PELE: 25, BAQUETAS: 26,
  CAPA: 27, BRACOS: 28, TAMBOR_ARO: 29 };
// grupos desenhados (cada um é um InstancedMesh por LOD)
const GRUPOS = {
  corpo_m: [R.PELE, R.BRACOS, R.CAMISOLA_M, R.MANGAS, R.BACIA_M, R.PERNAS, R.SAPATOS],
  corpo_f: [R.PELE, R.BRACOS, R.CAMISOLA_F, R.MANGAS, R.BACIA_F, R.PERNAS, R.SAPATOS],
  cabelo_curto: [R.CABELO_CURTO], afro: [R.CABELO_AFRO], trancas: [R.CABELO_TRANCAS], carrapito: [R.CABELO_CARRAPITO], lenco: [R.LENCO], peruca: [R.PERUCA],
  bone: [R.BONE, R.BONE_PALA], chapeu: [R.CHAPEU], fita: [R.FITA], cachecol: [R.CACHECOL_PESCOCO],
  bandeira: [R.BANDEIRA_MASTRO, R.BANDEIRA_PANO], bandeirinha: [R.BANDEIRINHA], cachecol_maos: [R.CACHECOL_MAOS], vuvuzela: [R.VUVUZELA],
  tambor: [R.TAMBOR_CORPO, R.TAMBOR_PELE, R.BAQUETAS, R.TAMBOR_ARO], capa: [R.CAPA],
};
const CABELOS = ['', 'cabelo_curto', 'afro', 'trancas', 'carrapito', 'lenco', 'peruca'];
const CHAPEUS = ['', 'bone', 'chapeu', 'fita'];
const ADERECOS = ['', 'bandeira', 'cachecol_maos', 'vuvuzela', 'tambor', 'capa', 'bandeirinha'];

// ------------------------------------------------------------------ máscara de aparência (bits) — partilhada com o shader
//  0-2 cabelo · 3-4 chapéu · 5 cachecol ao pescoço · 6-8 adereço · 9 mulher · 10-11 calças (0 ganga, 1 preta, 2 calções, 3 rasgada)
//  12-13 parte de cima (0 camisola equipa, 1 camisola invertida, 2 t-shirt branca, 3 casaco escuro) · 14 cara pintada
const bits = (v, s, n) => (v >> s) & ((1 << n) - 1);
function gruposDe(m) {
  const g = [bits(m, 9, 1) ? 'corpo_f' : 'corpo_m'];
  const c = CABELOS[bits(m, 0, 3)]; if (c) g.push(c);
  const h = CHAPEUS[bits(m, 3, 2)]; if (h) g.push(h);
  if (bits(m, 5, 1)) g.push('cachecol');
  const a = ADERECOS[bits(m, 6, 3)]; if (a) g.push(a);
  return g;
}

// ------------------------------------------------------------------ cozer as animações (VAT, 2D com quebra de linha)
const VAT_LARGURA = 4096;
function cozerLOD(gltf, lod, fps) {
  const grupo = gltf.scene.getObjectByName('Adepto_LOD' + lod);
  const malhas = []; grupo.traverse((o) => { if (o.isSkinnedMesh) malhas.push(o); });
  let V = 0; for (const m of malhas) V += m.geometry.attributes.position.count;
  const pos0 = new Float32Array(V * 3), nor0 = new Float32Array(V * 3), uv = new Float32Array(V * 2), pat = new Float32Array(V * 2);
  const si = new Uint16Array(V * 4), sw = new Float32Array(V * 4), reg = new Float32Array(V), vid = new Float32Array(V);
  const indicesPorRegiao = {}; let base = 0;
  for (const m of malhas) {
    const g = m.geometry, n = g.attributes.position.count;
    const r = (m.userData && m.userData.regiao !== undefined) ? m.userData.regiao : (m.parent && m.parent.userData ? m.parent.userData.regiao : 0);
    for (let i = 0; i < n; i++) {
      const k = base + i;
      pos0[k * 3] = g.attributes.position.getX(i); pos0[k * 3 + 1] = g.attributes.position.getY(i); pos0[k * 3 + 2] = g.attributes.position.getZ(i);
      nor0[k * 3] = g.attributes.normal.getX(i); nor0[k * 3 + 1] = g.attributes.normal.getY(i); nor0[k * 3 + 2] = g.attributes.normal.getZ(i);
      const u = g.attributes.uv.getX(i), v = g.attributes.uv.getY(i);
      if (r === R.PELE) { uv[k * 2] = u; uv[k * 2 + 1] = v; pat[k * 2] = 0; pat[k * 2 + 1] = 0; }
      else { uv[k * 2] = 0.5; uv[k * 2 + 1] = 0.85; pat[k * 2] = u; pat[k * 2 + 1] = v; }
      for (let j = 0; j < 4; j++) { si[k * 4 + j] = g.attributes.skinIndex.array[i * 4 + j]; sw[k * 4 + j] = g.attributes.skinWeight.array[i * 4 + j] / (g.attributes.skinWeight.normalized ? (g.attributes.skinWeight.array instanceof Uint8Array ? 255 : (g.attributes.skinWeight.array instanceof Uint16Array ? 65535 : 1)) : 1); }
      reg[k] = r; vid[k] = k;
    }
    const idx = g.index.array; (indicesPorRegiao[r] ||= []);
    for (let i = 0; i < idx.length; i++) indicesPorRegiao[r].push(idx[i] + base);
    base += n;
  }
  const ossos = malhas[0].skeleton.bones, inv = malhas[0].skeleton.boneInverses;
  const mixer = new THREE.AnimationMixer(gltf.scene); const clips = []; const frames = [];
  for (const clip of gltf.animations) {
    const ciclo = !(clip.userData && clip.userData.ciclo === false);
    const n = ciclo ? Math.max(1, Math.round(clip.duration * fps)) : Math.round(clip.duration * fps) + 1;
    clips.push({ nome: clip.name, inicio: frames.length, n, fps, ciclo, boca: !!(clip.userData && clip.userData.boca_aberta) });
    mixer.stopAllAction(); const ac = mixer.clipAction(clip); ac.reset().play();
    for (let f = 0; f < n; f++) {
      mixer.setTime(Math.min(f / fps, clip.duration - 1e-4)); gltf.scene.updateMatrixWorld(true);
      frames.push(ossos.map((b, i) => new THREE.Matrix4().multiplyMatrices(b.matrixWorld, inv[i]).elements.slice()));
    }
    ac.stop();
  }
  const F = frames.length, total = F * V, altura = Math.ceil(total / VAT_LARGURA);
  const P = new Uint16Array(VAT_LARGURA * altura * 4), N = new Uint16Array(VAT_LARGURA * altura * 4); const toH = THREE.DataUtils.toHalfFloat;
  for (let f = 0; f < F; f++) {
    const mats = frames[f];
    for (let v = 0; v < V; v++) {
      let px = 0, py = 0, pz = 0, nx = 0, ny = 0, nz = 0;
      const x = pos0[v * 3], y = pos0[v * 3 + 1], z = pos0[v * 3 + 2], a = nor0[v * 3], b = nor0[v * 3 + 1], c = nor0[v * 3 + 2];
      for (let j = 0; j < 4; j++) {
        const w = sw[v * 4 + j]; if (w === 0) continue; const m = mats[si[v * 4 + j]];
        px += w * (m[0] * x + m[4] * y + m[8] * z + m[12]); py += w * (m[1] * x + m[5] * y + m[9] * z + m[13]); pz += w * (m[2] * x + m[6] * y + m[10] * z + m[14]);
        nx += w * (m[0] * a + m[4] * b + m[8] * c); ny += w * (m[1] * a + m[5] * b + m[9] * c); nz += w * (m[2] * a + m[6] * b + m[10] * c);
      }
      const l = Math.hypot(nx, ny, nz) || 1, o = (f * V + v) * 4;
      P[o] = toH(px); P[o + 1] = toH(py); P[o + 2] = toH(pz); P[o + 3] = toH(1);
      N[o] = toH(nx / l); N[o + 1] = toH(ny / l); N[o + 2] = toH(nz / l); N[o + 3] = toH(0);
    }
  }
  const tex = (arr) => { const t = new THREE.DataTexture(arr, VAT_LARGURA, altura, THREE.RGBAFormat, THREE.HalfFloatType);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; };
  // geometrias por grupo (partilham os atributos de vértice; só o índice muda)
  const attrs = { position: new THREE.BufferAttribute(pos0, 3), normal: new THREE.BufferAttribute(nor0, 3), uv: new THREE.BufferAttribute(uv, 2),
                  aPat: new THREE.BufferAttribute(pat, 2), aRegion: new THREE.BufferAttribute(reg, 1), aVid: new THREE.BufferAttribute(vid, 1) };
  const geos = {}; let tris = {};
  for (const [nome, regs] of Object.entries(GRUPOS)) {
    const ind = []; for (const r of regs) if (indicesPorRegiao[r]) ind.push(...indicesPorRegiao[r]);
    if (!ind.length) continue;
    const g = new THREE.BufferGeometry(); for (const [k, a] of Object.entries(attrs)) g.setAttribute(k, a); g.setIndex(ind);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 3);
    geos[nome] = g; tris[nome] = ind.length / 3;
  }
  return { geos, tris, vatP: tex(P), vatN: tex(N), clips, V, F };
}

// ------------------------------------------------------------------ shader
const MAX_CLIPS = 24;
const GLSL_PADRAO = `
  float padraoEquipa(float tipo, vec2 uv, vec3 p) {
    if (tipo < 0.5) return 0.0;
    if (tipo < 1.5) return step(0.5, fract(uv.x * 14.0));
    if (tipo < 2.5) return step(0.5, fract(uv.y * 5.0));
    if (tipo < 3.5) return mod(floor(uv.x * 12.0) + floor(uv.y * 6.0), 2.0);
    if (tipo < 4.5) return step(0.5, uv.x);
    if (tipo < 5.5) return step(abs(p.x * 0.9 + (p.y - 1.2)), 0.075);
    if (tipo < 6.5) return step(abs(p.x), 0.05);
    return step(abs(p.y - 1.27), 0.05);
  }
  // selector: <0 liso | 0..7 padrão da equipa | 10 riscas em v | 11 cachecol | 12 tambor | 13 capa | 14..16 bandeira | 18 peruca | 19 pintura | 20 rasgões
  float seletor(float s, vec2 uv, vec3 p, vec2 fuv) {
    if (s < -0.5) return 0.0;
    if (s < 7.5) return padraoEquipa(s, uv, p);
    if (s < 10.5) return step(0.5, fract(uv.y * 5.0));
    if (s < 11.5) return uv.y < -0.1 ? 1.0 : step(0.5, fract(uv.x * 7.0));
    if (s < 12.5) return step(abs(uv.y - 0.5), 0.18);
    if (s < 13.5) return step(0.5, fract(uv.y * 1.5));
    if (s < 14.5) return step(0.5, fract(uv.y * 2.0));
    if (s < 15.5) return step(0.5, fract((uv.x + uv.y) * 1.5));
    if (s < 16.5) return mod(floor(uv.x * 6.0) + floor(uv.y * 4.0), 2.0);
    if (s < 18.5) return step(0.0, sin(p.x * 60.0) * sin(p.y * 55.0) * sin(p.z * 60.0));
    if (s < 19.5) return (fuv.y > 0.25 && fuv.y < 0.33 && abs(fuv.x - 0.25) > 0.06 && fuv.y < 0.5) ? 1.0 : 0.0;
    return (p.y > 0.44 && p.y < 0.57 && fract(uv.x + 0.08) < 0.22) ? 1.0 : 0.0;
  }`;
const GLSL_COMUM = `
  uniform highp sampler2D uVatP; uniform highp sampler2D uVatN; uniform float uTime; uniform int uV;
  uniform vec4 uClips[${MAX_CLIPS}]; uniform float uBoca[${MAX_CLIPS}];
  uniform vec3 uEquipa[6]; uniform float uPadrao[3];
  uniform vec3 uPele[5]; uniform vec3 uVivas[8];
  attribute float aVid; attribute float aRegion; attribute vec2 aPat;
  attribute vec4 iAnim; attribute vec4 iMix; attribute vec4 iLook;
  varying vec3 vColA; varying vec3 vColB; varying float vSel; varying vec2 vPatUv; varying vec3 vPatPos; varying vec2 vFaceUv; varying float vPele;
  vec3 crowdP; vec3 crowdN;
  ivec2 vatXY(int idx) { return ivec2(idx % ${VAT_LARGURA}, idx / ${VAT_LARGURA}); }
  void vatAmostra(float clip, float t, out vec3 p, out vec3 n) {
    vec4 c = uClips[int(clip)];
    float f = t * c.z; f = c.w > 0.5 ? mod(f, c.y) : clamp(f, 0.0, c.y - 1.0);
    float f0 = floor(f); float f1 = f0 + 1.0; f1 = c.w > 0.5 ? (f1 >= c.y ? 0.0 : f1) : min(f1, c.y - 1.0);
    int a = (int(c.x + f0)) * uV + int(aVid), b = (int(c.x + f1)) * uV + int(aVid); float k = fract(f);
    p = mix(texelFetch(uVatP, vatXY(a), 0).xyz, texelFetch(uVatP, vatXY(b), 0).xyz, k);
    n = normalize(mix(texelFetch(uVatN, vatXY(a), 0).xyz, texelFetch(uVatN, vatXY(b), 0).xyz, k));
  }
  float bitsDe(float m, float s, float n) { return mod(floor(m / exp2(s)), exp2(n)); }
  float hash(float s) { return fract(sin(s * 91.345) * 47453.5453); }`;
const GLSL_VERTICE = `
  {
    float tA = max(uTime - iAnim.y, 0.0) * iMix.z + iMix.w;
    float tB = max(uTime - iAnim.w, 0.0) * iMix.z + iMix.w;
    vec3 pA, nA, pB, nB; vatAmostra(iAnim.x, tA, pA, nA);
    float w = iMix.y > 0.0 ? smoothstep(0.0, 1.0, clamp((uTime - iMix.x) / iMix.y, 0.0, 1.0)) : 1.0;
    if (w < 1.0) { vatAmostra(iAnim.z, tB, pB, nB); pA = mix(pB, pA, w); nA = normalize(mix(nB, nA, w)); }
    crowdP = pA; crowdN = nA;
    float m = iLook.w, seed = iLook.z; int e = int(iLook.y + 0.5);
    vec3 cP = uEquipa[e * 2], cS = uEquipa[e * 2 + 1]; float tipo = uPadrao[e];
    float topo = bitsDe(m, 12.0, 2.0), baixo = bitsDe(m, 10.0, 2.0), pintura = bitsDe(m, 14.0, 1.0);
    float pk = clamp(iLook.x, 0.0, 0.999) * 4.0; int pi0 = int(pk);
    vec3 pele = mix(uPele[pi0], uPele[pi0 + 1], fract(pk));
    vec3 cabelo = mix(vec3(0.012, 0.009, 0.008), vec3(0.045, 0.028, 0.018), hash(seed + 1.7));
    vec3 viva = uVivas[int(hash(seed + 5.3) * 7.99)];
    vec3 escuro = mix(vec3(0.03), vec3(0.09), hash(seed + 4.0));
    vec3 ganga = baixo < 0.5 ? vec3(0.07, 0.12, 0.26) : (baixo < 1.5 ? vec3(0.018) : (baixo < 2.5 ? (hash(seed + 7.7) < 0.5 ? vec3(0.02) : (hash(seed + 7.7) < 0.8 ? vec3(0.3, 0.25, 0.16) : vec3(0.12, 0.2, 0.38))) : vec3(0.23, 0.34, 0.55)));
    ganga *= 0.9 + 0.2 * hash(seed + 3.3);
    float r = aRegion; vec3 a = pele, b = pele; float sel = -1.0; vec3 p0 = position;
    if (r < 0.5) { a = pele; b = mix(cP, cS, 0.0); sel = pintura > 0.5 ? 19.0 : -1.0; }
    else if (r < 4.5) a = cabelo;
    else if (r < 5.5) a = viva;
    else if (r < 6.5) { a = cP; b = cS; sel = 18.0; }
    else if (r < 7.5) a = cP; else if (r < 8.5) a = cS; else if (r < 9.5) a = cP; else if (r < 10.5) a = hash(seed + 2.2) > 0.5 ? cP : cS;
    else if (r < 13.5) {
      if (topo < 0.5) { a = cP; b = cS; sel = tipo; } else if (topo < 1.5) { a = cS; b = cP; sel = tipo; }
      else if (topo < 2.5) a = vec3(0.85); else a = escuro;
    }
    else if (r < 16.5) {
      a = ganga;
      if (baixo > 1.5 && baixo < 2.5 && r > 15.5 && p0.y < 0.53) a = pele;
      if (baixo > 2.5 && r > 15.5) { b = pele * 1.05; sel = 20.0; }
    }
    else if (r < 17.5) a = hash(seed + 9.1) < 0.7 ? vec3(0.9) : vec3(0.025);
    else if (r < 18.5) { a = cP; b = cS; sel = 10.0; }
    else if (r < 19.5) a = vec3(0.3, 0.2, 0.11);
    else if (r < 21.5) {
      a = cP; b = cS; float t = floor(hash(seed + 6.6) * 4.0); sel = t < 2.5 ? 14.0 + t : max(tipo, 1.0);
      if (abs(aPat.x - 0.5) < 0.0001 && abs(aPat.y - 0.85) < 0.0001) { a = vec3(0.3, 0.2, 0.11); sel = -1.0; }
    }
    else if (r < 22.5) { a = cP; b = cS; sel = 11.0; }
    else if (r < 23.5) a = hash(seed + 8.8) < 0.6 ? cP : cS;
    else if (r < 24.5) { a = cP; b = cS; sel = 12.0; }
    else if (r < 25.5) a = vec3(0.92, 0.9, 0.85);
    else if (r < 26.5) a = vec3(0.72, 0.56, 0.36);
    else if (r < 27.5) { a = cP; b = cS; sel = 13.0; }
    else if (r < 28.5) a = topo > 2.5 ? escuro : pele;
    else a = cS;
    float v = 0.93 + 0.14 * hash(seed + 11.0);
    vColA = a * v; vColB = b * v; vSel = sel; vPatUv = aPat; vPatPos = p0;
    vPele = (r < 0.5) ? 1.0 : 0.0;
    float boca = mix(uBoca[int(iAnim.z)], uBoca[int(iAnim.x)], w);
    vFaceUv = (uv.y < 0.5 && boca > 0.5) ? vec2(uv.x + 0.5, uv.y) : uv;
  }`;
function materialMultidao(lod, mapa, U) {
  const mat = new THREE.MeshStandardMaterial({ map: mapa, roughness: 0.82, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U, { uVatP: { value: lod.vatP }, uVatN: { value: lod.vatN }, uV: { value: lod.V },
      uClips: { value: Array.from({ length: MAX_CLIPS }, (_, i) => lod.clips[i] ? new THREE.Vector4(lod.clips[i].inicio, lod.clips[i].n, lod.clips[i].fps, lod.clips[i].ciclo ? 1 : 0) : new THREE.Vector4()) },
      uBoca: { value: Array.from({ length: MAX_CLIPS }, (_, i) => (lod.clips[i] && lod.clips[i].boca) ? 1 : 0) } });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + GLSL_COMUM)
      .replace('#include <beginnormal_vertex>', GLSL_VERTICE + '\nvec3 objectNormal = crowdN;\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3(tangent.xyz);\n#endif')
      .replace('#include <begin_vertex>', 'vec3 transformed = crowdP;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vColA; varying vec3 vColB; varying float vSel; varying vec2 vPatUv; varying vec3 vPatPos; varying vec2 vFaceUv; varying float vPele;\n' + GLSL_PADRAO)
      .replace('#include <map_fragment>', 'vec4 sampledDiffuseColor = vPele > 0.5 ? texture2D(map, vFaceUv) : vec4(1.0); sampledDiffuseColor.rgb = pow(sampledDiffuseColor.rgb, vec3(2.2)); diffuseColor *= sampledDiffuseColor;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= mix(vColA, vColB, seletor(vSel, vPatUv, vPatPos, vFaceUv)); diffuseColor.rgb = pow(diffuseColor.rgb, vec3(1.0 / 2.2));');
  };
  mat.customProgramCacheKey = () => 'multidao3-' + lod.V;
  return mat;
}

// ------------------------------------------------------------------ lugares
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function normalizarLugares(lugares, o, rnd) {
  const L = []; const casaNeutros = o.proporcaoCasaNosNeutros ?? 0.7;
  const push = (x, y, z, yaw, equipa, sentado) => { if (rnd() <= (o.lotacao ?? 0.85)) L.push({ x, y, z, yaw, equipa, sentado }); };
  if (lugares && lugares.tipo === 'pontos') {
    const p = lugares.posicoes, d = lugares.direccoes, s = lugares.sectores;
    for (let i = 0; i < lugares.total; i++) {
      const yaw = d ? Math.atan2(d[i * 3], d[i * 3 + 2]) : 0; let eq = 2;
      if (s) { if (s[i * 3] > 0.5) eq = 0; else if (s[i * 3 + 2] > 0.5) eq = 1; }
      if (eq === 2) eq = rnd() < casaNeutros ? 0 : (rnd() < 0.7 ? 1 : 2);
      push(p[i * 3], p[i * 3 + 1], p[i * 3 + 2], yaw, eq, true);
    }
  } else if (lugares) {
    for (const [x, y, z, rot] of (lugares.bancada_e_cobertura || [])) {
      const banco = y < 0.6;
      push(x + Math.sin(rot) * (banco ? 0 : 0.3), y + (banco ? -0.42 : -0.45), z + Math.cos(rot) * (banco ? 0 : 0.3), rot, rnd() < casaNeutros ? 0 : 1, true);
    }
    for (const [x, y, z, rot] of (lugares.vedacao_sul_exterior || [])) push(x - Math.sin(rot) * 0.25, y, z - Math.cos(rot) * 0.25, rot, rnd() < 0.5 ? 0 : 1, false);
  }
  return L;
}
function aparencia(rnd, o, crianca) {
  const mulher = rnd() < (o.proporcaoMulheres ?? 0.38);
  let cabelo = mulher ? [2, 3, 3, 4, 5, 2, 6][Math.floor(rnd() * 7)] : [1, 1, 1, 0, 2, 1, 6, 3][Math.floor(rnd() * 8)];
  if (rnd() < 0.03) cabelo = 6;
  let chapeu = 0; const rc = rnd();
  if (cabelo !== 2 && cabelo !== 6 && cabelo !== 5) chapeu = rc < 0.2 ? 1 : (rc < 0.3 ? 2 : (rc < 0.36 ? 3 : 0));
  else if (cabelo === 2 && rc < 0.15) chapeu = 3;
  const cachecol = rnd() < 0.18 ? 1 : 0;
  let ad = 0; const ra = rnd();
  if (crianca) ad = ra < 0.5 ? 6 : 0;
  else { const p = o.proporcaoAderecos || { bandeira: 0.05, cachecol_maos: 0.08, vuvuzela: 0.04, tambor: 0.015, capa: 0.025 };
    let acc = 0; for (const [nome, prob] of Object.entries(p)) { acc += prob; if (ra < acc) { ad = ADERECOS.indexOf(nome); break; } } }
  const baixo = mulher ? [0, 0, 3, 3, 1][Math.floor(rnd() * 5)] : [0, 1, 1, 2, 2, 0][Math.floor(rnd() * 6)];
  const topo = [0, 0, 0, 0, 0, 0, 1, 2, 3][Math.floor(rnd() * 9)];
  const pintura = rnd() < 0.06 ? 1 : 0;
  return { m: cabelo + chapeu * 8 + cachecol * 32 + ad * 64 + (mulher ? 512 : 0) + baixo * 1024 + topo * 4096 + pintura * 16384, ad };
}

// ------------------------------------------------------------------ API: multidão
const QUALIDADE = { alta: { lotacao: 0.85, maxDetalhados: 2500, distanciaDetalhe: 32 }, media: { lotacao: 0.6, maxDetalhados: 1200, distanciaDetalhe: 24 },
                    baixa: { lotacao: 0.35, maxDetalhados: 400, distanciaDetalhe: 16 } };
async function criarMultidao(scene, urlAdeptos, lugares, opcoesUtilizador = {}) {
  const o = { ...QUALIDADE[opcoesUtilizador.qualidade || 'alta'], ...opcoesUtilizador };
  const gltf = await new Promise((res, rej) => new THREE.GLTFLoader().load(urlAdeptos, res, undefined, rej));
  const defsAnim = (gltf.parser.json.animations || []); gltf.animations.forEach((a, i) => { a.userData = Object.assign({}, a.userData, (defsAnim[i] && defsAnim[i].extras) || {}); });
  const fps = o.fpsAnimacao || 15;
  const L0 = cozerLOD(gltf, 0, fps), L1 = cozerLOD(gltf, 1, fps);
  const clip = Object.fromEntries(L0.clips.map((c, i) => [c.nome, i]));
  let mapa = null; gltf.scene.traverse((x) => { if (x.isMesh && x.material && x.material.name === 'Adepto_Pele') mapa = x.material.map; });
  if (mapa) { mapa.colorSpace = THREE.NoColorSpace; mapa.needsUpdate = true; }
  const C = (h) => new THREE.Color(h).convertSRGBToLinear();
  const U = { uTime: { value: 0 }, uEquipa: { value: [C('#cfcfcf'), C('#505055'), C('#cfcfcf'), C('#505055'), C('#cc092f'), C('#111111')] },
              uPadrao: { value: [1, 1, 0] }, uPele: { value: ['#1c100b', '#2e1a11', '#45281a', '#5e3a26', '#83563b'].map(C) },
              uVivas: { value: ['#ffcb00', '#cc092f', '#1a1a1a', '#f2f2f2', '#2f7d3a', '#1f55c9', '#f57a22', '#7b2d8b'].map(C) } };
  const rnd = mulberry32(o.semente ?? 1234);
  const slots = normalizarLugares(lugares, o, rnd); const n = slots.length;
  const M = new Float32Array(n * 16), A = new Float32Array(n * 4), X = new Float32Array(n * 4), K = new Float32Array(n * 4);
  const papel = new Uint8Array(n), sentado = new Uint8Array(n), membros = Array.from({ length: n });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const recuo = o.recuoSentado ?? 0.16;
  for (let i = 0; i < n; i++) {
    const S = slots[i]; const crianca = rnd() < (o.proporcaoCriancas ?? 0.05);
    const ap = (o.mascaras && o.mascaras[i] !== undefined) ? { m: o.mascaras[i], ad: bits(o.mascaras[i], 6, 3) } : aparencia(rnd, o, crianca); papel[i] = ap.ad;
    const fica = S.sentado && !(ap.ad >= 1 && ap.ad <= 5 && ap.ad !== 2 && rnd() < 0.85);           // quem traz bandeira/tambor/vuvuzela/capa fica de pé
    sentado[i] = fica ? 1 : 0;
    const alt = crianca ? 0.62 + rnd() * 0.1 : (bits(ap.m, 9, 1) ? 0.92 : 0.96) + rnd() * 0.1, larg = 0.92 + rnd() * 0.2;
    const yaw = S.yaw + (rnd() - 0.5) * 0.3, back = fica ? recuo : 0;
    q.setFromAxisAngle(up, yaw); p.set(S.x - Math.sin(S.yaw) * back, S.y, S.z - Math.cos(S.yaw) * back); s.set(larg * alt, alt, larg * alt);
    m4.compose(p, q, s); m4.toArray(M, i * 16);
    K[i * 4] = Math.pow(rnd(), 1.4); K[i * 4 + 1] = S.equipa; K[i * 4 + 2] = rnd() * 100; K[i * 4 + 3] = ap.m;
    membros[i] = gruposDe(ap.m);
    const a0 = calmaAnim(i); A[i * 4] = clip[a0]; A[i * 4 + 1] = -rnd() * 10; A[i * 4 + 2] = A[i * 4]; A[i * 4 + 3] = A[i * 4 + 1];
    X[i * 4] = 0; X[i * 4 + 1] = 0; X[i * 4 + 2] = (a0 === 'drum' ? 0.65 : 0.9 + rnd() * 0.25); X[i * 4 + 3] = rnd() * 4;
  }
  function calmaAnim(i) {
    const r = rnd(), ad = ADERECOS[papel[i]];
    if (ad === 'tambor') return 'drum';
    if (sentado[i]) return r < 0.8 ? 'sit' : (r < 0.88 ? 'sit_clap' : (r < 0.95 ? 'sit_tense' : 'sit_cheer'));
    if (ad === 'bandeira' || ad === 'bandeirinha') return r < 0.35 ? 'wave_flag' : 'idle';
    if (ad === 'vuvuzela') return r < 0.25 ? 'vuvuzela' : 'idle';
    return r < 0.85 ? 'idle' : 'clap';
  }
  // InstancedMeshes por grupo e LOD
  const contagem = {}; for (const g of membros) for (const k of g) contagem[k] = (contagem[k] || 0) + 1;
  const mats = [materialMultidao(L0, mapa, U), materialMultidao(L1, mapa, U)];
  const meshes = { 0: {}, 1: {} };
  for (const lod of [0, 1]) {
    const LL = lod ? L1 : L0;
    for (const [nome, geo] of Object.entries(LL.geos)) {
      const cap = Math.max(1, lod ? (contagem[nome] || 0) : Math.min(contagem[nome] || 0, o.maxDetalhados));
      if (!contagem[nome]) continue;
      const g = geo.clone();
      for (const nm of ['iAnim', 'iMix', 'iLook']) g.setAttribute(nm, new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage));
      const im = new THREE.InstancedMesh(g, mats[lod], cap); im.name = `Multidao_LOD${lod}_${nome}`;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; im.receiveShadow = true; im.count = 0;
      (o.grupo || scene).add(im); meshes[lod][nome] = im;
    }
  }
  const dist = new Float32Array(n); let sujo = true, tLOD = 0, relogio = 0; const ultima = new THREE.Vector3(1e9, 0, 0);
  const perto = new Uint8Array(n);
  function preencher() {
    const cont = { 0: {}, 1: {} };
    for (const lod of [0, 1]) for (const k in meshes[lod]) cont[lod][k] = 0;
    for (let i = 0; i < n; i++) {
      if (perto[i] === 2) continue;
      const lod = perto[i] ? 0 : 1;
      for (const g of membros[i]) {
        const im = meshes[lod][g]; if (!im) continue; const j = cont[lod][g]++;
        if (j >= im.instanceMatrix.count) continue;
        im.instanceMatrix.array.set(M.subarray(i * 16, i * 16 + 16), j * 16);
        im.geometry.attributes.iAnim.array.set(A.subarray(i * 4, i * 4 + 4), j * 4);
        im.geometry.attributes.iMix.array.set(X.subarray(i * 4, i * 4 + 4), j * 4);
        im.geometry.attributes.iLook.array.set(K.subarray(i * 4, i * 4 + 4), j * 4);
      }
    }
    for (const lod of [0, 1]) for (const [k, im] of Object.entries(meshes[lod])) {
      im.count = Math.min(cont[lod][k], im.instanceMatrix.count); im.instanceMatrix.needsUpdate = true;
      for (const nm of ['iAnim', 'iMix', 'iLook']) im.geometry.attributes[nm].needsUpdate = true;
    }
  }
  // perto[i]: 0 = longe (LOD1), 1 = perto (LOD0), 2 = fora do campo de visão (não desenhado)
  const frustum = new THREE.Frustum(), pvm = new THREE.Matrix4(), esfera = new THREE.Sphere(new THREE.Vector3(), 2.5), ultimaDir = new THREE.Vector3();
  const gInv = new THREE.Matrix4(), viewL = new THREE.Matrix4(), projW = new THREE.Matrix4(), cLoc = new THREE.Vector3(), dirLoc = new THREE.Vector3(), tmpV = new THREE.Vector3(), ID = new THREE.Matrix4();
  function camaraLocal(camera) {                      // câmara no espaço do grupo (metros)
    const gm = o.grupo ? o.grupo.matrixWorld : ID; gInv.copy(gm).invert();
    camera.updateMatrixWorld();
    cLoc.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(gInv);
    camera.getWorldDirection(tmpV); dirLoc.copy(tmpV).transformDirection(gInv);
    viewL.multiplyMatrices(camera.matrixWorldInverse, gm);
  }
  function actualizarLOD(camera) {
    camaraLocal(camera);
    const c = cLoc, r2 = o.distanciaDetalhe * o.distanciaDetalhe, cand = [];
    projW.copy(camera.projectionMatrix); const e = projW.elements; e[0] /= 1.3; e[5] /= 1.3; e[8] /= 1.3; e[9] /= 1.3;   // frustum alargado (~30%)
    pvm.multiplyMatrices(projW, viewL); frustum.setFromProjectionMatrix(pvm);
    for (let i = 0; i < n; i++) {
      const x = M[i * 16 + 12], y = M[i * 16 + 13], z = M[i * 16 + 14];
      esfera.center.set(x, y + 1, z);
      if (o.recortarFrustum !== false && !frustum.intersectsSphere(esfera)) { perto[i] = 2; continue; }
      const dx = x - c.x, dy = y - c.y, dz = z - c.z; dist[i] = dx * dx + dy * dy + dz * dz; perto[i] = 0;
      if (dist[i] < r2) cand.push(i);
    }
    cand.sort((a, b) => dist[a] - dist[b]); for (let k = 0; k < Math.min(cand.length, o.maxDetalhados); k++) perto[cand[k]] = 1;
    ultima.copy(c); ultimaDir.copy(dirLoc); sujo = false; preencher();
  }
  // ---------------------------------------------------------------- reacções
  function mudar(i, anim, atraso = 0, mistura = 0.45, vel = null) {
    const novo = clip[anim]; if (novo === undefined || A[i * 4] === novo) return;
    const t0 = relogio + atraso;
    A[i * 4 + 2] = A[i * 4]; A[i * 4 + 3] = A[i * 4 + 1]; A[i * 4] = novo; A[i * 4 + 1] = t0; X[i * 4] = t0; X[i * 4 + 1] = mistura;
    X[i * 4 + 2] = vel ?? (anim === 'drum' ? 1.0 : 0.9 + rnd() * 0.25); X[i * 4 + 3] = anim === 'stand' ? 0 : rnd() * 3; sujo = true;
  }
  const esc = (t) => { let r = rnd(), a = 0; for (const [k, p] of t) { a += p; if (r <= a) return k; } return t[t.length - 1][0]; };
  function animPapel(i, intensa) {
    switch (ADERECOS[papel[i]]) {
      case 'bandeira': case 'bandeirinha': return 'wave_flag';
      case 'cachecol_maos': return 'scarf_overhead';
      case 'vuvuzela': return 'vuvuzela';
      case 'tambor': return 'drum';
      case 'capa': return 'cape_cheer';
      default: return intensa ? esc([['goal_celebration', 0.35], ['jump', 0.25], ['cheer', 0.25], ['fist_pump', 0.15]]) : esc([['cheer', 0.35], ['clap', 0.35], ['fist_pump', 0.3]]);
    }
  }
  const tambor = (i) => ADERECOS[papel[i]] === 'tambor';
  const REAC = {
    calma: (i) => mudar(i, calmaAnim(i), rnd() * 2.5, 0.8, tambor(i) ? 0.65 : null),
    golo: (i, minha) => minha ? mudar(i, animPapel(i, true), rnd() * 0.6, 0.35, tambor(i) ? 1.5 : 1.0 + rnd() * 0.25)
      : (tambor(i) ? mudar(i, 'idle', rnd() * 0.5) : mudar(i, sentado[i] ? esc([['sit_disappointed', 0.6], ['sit', 0.4]]) : esc([['disappointed', 0.6], ['idle', 0.4]]), 0.3 + rnd() * 1.0, 0.6)),
    ataque: (i, minha) => {
      if (minha) { if (sentado[i] && rnd() < 0.45) mudar(i, esc([['sit_tense', 0.5], ['sit_cheer', 0.5]]), rnd() * 0.4, 0.3);
                   else mudar(i, animPapel(i, false), rnd() * 0.5, 0.35, tambor(i) ? 1.3 : null); }
      else if (sentado[i] && rnd() < 0.4) mudar(i, 'sit_tense', rnd() * 0.6, 0.4);
    },
    falhanco: (i, minha) => minha ? mudar(i, sentado[i] ? 'sit_disappointed' : 'disappointed', rnd() * 0.4, 0.3)
      : (rnd() < 0.3 ? mudar(i, sentado[i] ? 'sit_clap' : 'clap', rnd() * 0.5) : null),
  };
  const agenda = [];
  function evento(nome, opc = {}) {
    const [tipo, lado] = nome.split('_');
    if (tipo === 'calma' || tipo === 'intervalo') { for (let i = 0; i < n; i++) REAC.calma(i); return; }
    const eqE = lado === 'casa' ? 0 : 1;
    for (let i = 0; i < n; i++) { const eq = K[i * 4 + 1]; if (eq === 2) { if (rnd() < 0.5) REAC.calma(i); continue; } REAC[tipo] && REAC[tipo](i, eq === eqE); }
    const dur = opc.duracao ?? ({ golo: 9, ataque: 5, falhanco: 4 }[tipo] || 5);
    if (opc.voltarACalma !== false) agenda.push({ t: relogio + dur, fn: () => { for (let i = 0; i < n; i++) REAC.calma(i); } });
  }
  return {
    total: n, animacoes: L0.clips.map((c) => c.nome), meshes,
    estatisticas: { adeptos: n, verticesLOD0: L0.V, verticesLOD1: L1.V, triangulosCorpoLOD0: L0.tris.corpo_m, triangulosCorpoLOD1: L1.tris.corpo_m, framesVAT: L0.F },
    definirEquipas(c) {
      const set = (k, h) => { if (h) U.uEquipa.value[k] = new THREE.Color(h).convertSRGBToLinear(); };
      set(0, c.homeTeamPrimaryColor); set(1, c.homeTeamSecondaryColor); set(2, c.awayTeamPrimaryColor); set(3, c.awayTeamSecondaryColor);
      if (c.homeTeamPattern !== undefined) U.uPadrao.value[0] = PADROES[c.homeTeamPattern] ?? c.homeTeamPattern;
      if (c.awayTeamPattern !== undefined) U.uPadrao.value[1] = PADROES[c.awayTeamPattern] ?? c.awayTeamPattern;
    },
    evento,
    animarTodos(anim, atrasoMax = 0.5) { for (let i = 0; i < n; i++) mudar(i, anim, rnd() * atrasoMax); },
    definirAnimacao(i, anim, atraso = 0) { mudar(i, anim, atraso); },
    definirVisivel(v) { for (const lod of [0, 1]) for (const im of Object.values(meshes[lod])) im.visible = v; },
    update(dt, camera) {
      relogio += dt; U.uTime.value = relogio;
      for (let k = agenda.length - 1; k >= 0; k--) if (agenda[k].t <= relogio) agenda.splice(k, 1)[0].fn();
      tLOD += dt;
      if (camera) {
        camaraLocal(camera); const d2 = cLoc.distanceToSquared(ultima);
        const rot = 1 - dirLoc.dot(ultimaDir);
        if (d2 > 100 || rot > 0.03 || (tLOD > 0.5 && (d2 > 4 || rot > 0.002))) { tLOD = 0; actualizarLOD(camera); }   // corte/rotação de câmara: actualiza logo
        else if (sujo) preencher();
      } else if (sujo) preencher();
      sujo = false;
    },
    get tempo() { return relogio; },
  };
}

// ------------------------------------------------------------------ API: um adepto individual (malha esqueletizada normal + AnimationMixer)
// Útil para cenas de perto (túnel, celebrações, menus). As partes com padrão usam TEXCOORD_0 (u à volta, v para cima).
function texturaPadrao(cP, cS, padrao = 'riscas', tamanho = 256) {
  const cv = document.createElement('canvas'); cv.width = cv.height = tamanho; const g = cv.getContext('2d');
  const t = PADROES[padrao] ?? padrao; g.fillStyle = cP; g.fillRect(0, 0, tamanho, tamanho); g.fillStyle = cS;
  const T = tamanho;
  if (t === 1) for (let k = 0; k < 16; k++) g.fillRect((k + 0.5) * T / 16, 0, T / 32, T);
  else if (t === 2) for (let k = 0; k < 5; k++) g.fillRect(0, (k + 0.5) * T / 5, T, T / 10);
  else if (t === 3) for (let a = 0; a < 12; a++) for (let b = 0; b < 6; b++) if ((a + b) % 2) g.fillRect(a * T / 12, b * T / 6, T / 12, T / 6);
  else if (t === 4) g.fillRect(T / 2, 0, T / 2, T);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.flipY = false; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; return tx;
}
function criarAdepto(gltf, op = {}) {
  const raiz = SkeletonUtils.clone(gltf.scene);
  const lod = op.lod ?? 0; const outro = raiz.getObjectByName('Adepto_LOD' + (1 - lod)); if (outro) outro.visible = false;
  const quer = new Set(gruposDe(op.mascara ?? 0).flatMap((g) => GRUPOS[g]));
  const pat = texturaPadrao(op.corPrimaria || '#d81e22', op.corSecundaria || '#111111', op.padrao || 'riscas');
  const lisaP = new THREE.Color(op.corPrimaria || '#d81e22'), lisaS = new THREE.Color(op.corSecundaria || '#111111');
  raiz.traverse((x) => {
    if (!x.isSkinnedMesh) return; const r = x.userData.regiao; x.visible = quer.has(r); x.frustumCulled = false; x.castShadow = true;
    x.material = x.material.clone();
    if ([R.CAMISOLA_M, R.CAMISOLA_F, R.MANGAS, R.BANDEIRA_PANO, R.BANDEIRINHA, R.CAPA, R.CACHECOL_MAOS, R.CACHECOL_PESCOCO].includes(r)) { x.material.map = pat; x.material.color.set('#ffffff'); }
    if ([R.BONE, R.CHAPEU, R.FITA, R.VUVUZELA, R.TAMBOR_CORPO, R.PERUCA].includes(r)) x.material.color.copy(lisaP);
    if ([R.BONE_PALA, R.TAMBOR_ARO].includes(r)) x.material.color.copy(lisaS);
    if (op.corPele && (r === R.PELE || r === R.BRACOS)) x.material.color.set(op.corPele);
  });
  const mixer = new THREE.AnimationMixer(raiz);
  const tocar = (nome, fade = 0.3) => { const c = gltf.animations.find((a) => a.name === nome); if (!c) return; const a = mixer.clipAction(c); mixer.stopAllAction(); a.reset().fadeIn(fade).play(); return a; };
  if (op.animacao) tocar(op.animacao);
  return { objeto: raiz, mixer, tocar };
}

window.GirabolaMultidao = { criarMultidao, criarAdepto, texturaPadrao, PADROES, EQUIPAS, coresDoJogo };
})();
