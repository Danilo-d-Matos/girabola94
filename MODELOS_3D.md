# Modelos 3D externos para o Girabola Craque

Requisitos para trocar os jogadores atuais (feitos por código) por um jogador realista como o das imagens.

## 1. Entrega

- Formato: **glTF binário (`.glb`)**, glTF 2.0. É o único formato que o Three.js abre bem sem conversões.
- Um ficheiro por tipo: `jogador.glb` (jogador de campo), `guarda-redes.glb`, `arbitro.glb`. As animações podem vir dentro de cada um ou num `animacoes.glb` só com o esqueleto.
- Texturas embutidas no `.glb` ou em `.jpg`/`.png`/`.webp` ao lado, até 2048 px (1024 px chega para o jogo).
- Licença que permita uso comercial/distribuição (CC0, CC-BY com atribuição, ou modelo próprio). Se o modelo vier de uma IA (como as imagens), confirma os termos da ferramenta.
- As imagens que enviaste (T-pose, esqueleto, peças separadas, malha) são renders. **O que faz falta é o ficheiro 3D** (`.blend`, `.fbx` ou `.glb`), não as imagens.

## 2. Malha e peças

- Corpo humano com proporções reais (8 cabeças de altura), em **T-pose** ou A-pose, a olhar para +Z, pés no plano Y=0, escala em metros (≈1,80 m).
- **Peças separadas**, como na imagem das peças:
  - `Corpo` (cabeça, pescoço, braços, mãos, pernas), sem camisola/calções/meias/botas, para trocar pele e cabelo.
  - `Camisola`, `Calcoes`, `Meias`, `Botas`, mais `Cabelo`. Cada peça com material próprio.
- Orçamento de triângulos (há 13 jogadores no campo):
  - LOD0 (perto): 8 000 a 15 000 triângulos por jogador.
  - LOD1 (médio): 3 000 a 5 000.
  - LOD2 (longe): 800 a 1 500.
- Quads, loops limpos nas articulações (ombro, cotovelo, anca, joelho) e UVs sem sobreposição (ver a imagem da malha).

## 3. Camisolas trocáveis (16 equipas, cores diferentes)

- Os desenhos geométricos da camisola (branco/vermelho) não podem estar "pintados" na pele nem cozidos no corpo.
- Camisola, calções e meias com UVs próprias, **numa textura que o jogo possa substituir** por equipa (`camisola_<CLUBE>.png`, 1024×1024).
- Em alternativa, um material base em escala de cinzentos com máscaras (R = cor principal, G = cor secundária, B = detalhes) para tingir por código. Dá menos ficheiros.
- Reservar na UV da camisola: **emblema** (peito), **número e nome** (costas), em áreas retangulares fáceis de desenhar por código.
- Guarda-redes: variante de camisola própria.

## 4. Esqueleto (rig)

- Esqueleto humanoide, ≈ 25 a 60 ossos, com nomes padrão (Mixamo ou Rigify/Unreal Mannequin). Hierarquia: `Hips > Spine > Chest > Neck > Head`, braços e pernas a partir daí.
- Pesos de pele (skinning) já aplicados. Sem constraints ou controladores de Blender (círculos, setas da imagem) no ficheiro final: **só os ossos de deformação**.
- Mãos com dedos são opcionais. Para o jogo, mãos simples ou punho semi-aberto bastam.
- Osso `Head` bem identificado (o jogo roda-o para seguir a bola).

## 5. Animações (clips do `.glb`, 30 fps, em loop quando indicado)

| Clip | Loop | Notas |
|---|---|---|
| `Idle` | sim | Respiração, mudar o peso do corpo |
| `Walk` / `Jog` / `Run` / `Sprint` | sim | Duração do ciclo = um passo duplo, mesma velocidade de pés |
| `Dribble` | sim | Corrida com bola |
| `Turn_L` / `Turn_R` | não | Mudança de direção em corrida |
| `Pass` | não | Passe rasteiro, pé direito |
| `Shot` | não | Remate com recuo, contacto e finalização |
| `Tackle_Slide` | não | Carrinho |
| `Fall` / `GetUp` | não | Queda e levantar |
| `Celebrate_1..3` | não | Festejo de golo |
| `Throw_In` | não | Lançamento lateral |
| `GK_Ready` | sim | Posição de guarda-redes |
| `GK_Dive_L` / `GK_Dive_R` | não | Voo, aterragem e levantar (o jogo já usa 1,3 s) |
| `GK_Jump` | não | Salto para bola alta |
| `GK_Catch` / `GK_Punch` | não | Segurar e socar |
| `GK_Throw` / `GK_Kick` | não | Distribuição |
| `Ref_Card_Yellow` / `Ref_Card_Red` / `Ref_Whistle` | não | Árbitro |

- Animações **in place** (sem deslocar a raiz), para o jogo controlar a posição.
- Marcar com um evento/frame o instante do contacto com a bola em `Pass` e `Shot`.

## 6. Bola (opcional)

- Esfera de ≈ 22 cm, 1 000 a 2 000 triângulos, material PBR simples. O jogo já tem uma bola 3D que roda.

## 7. Integração no jogo (o que eu faço do lado do código)

- O jogo usa **Three.js r128** embutido no `index.html`. É preciso acrescentar `GLTFLoader` e `SkeletonUtils` (versões r128, licença MIT), também embutidos ou como ficheiros ao lado.
- O `index.html` tem 42 MB, por isso os modelos ficam **ao lado**, numa pasta `html/modelos/` servida pelo `serve.js`, e não embutidos em base64.
- Cada jogador é um clone do modelo com o seu próprio `AnimationMixer`. A lógica do jogo (velocidade, remate, mergulho, queda) escolhe e mistura os clips.
- A troca de camisola é feita por equipa, com textura ou cor. O número e o nome nas costas são desenhados em canvas.
- Níveis de detalhe: LOD0/1/2 por distância à câmara. Qualidade baixa usa só o LOD1.
- O modelo atual, feito por código, fica como alternativa, se o ficheiro não carregar.

## 8. Lista de verificação antes de enviares

- [ ] Ficheiro `.glb` abre no [gltf-viewer](https://gltf-viewer.donmccurdy.com/) sem erros e com as animações a tocar.
- [ ] Escala correta (≈ 1,80 m), a olhar para +Z, pés em Y=0.
- [ ] Peças separadas com materiais com nome (`Camisola`, `Calcoes`, `Meias`, `Botas`, `Corpo`, `Cabelo`).
- [ ] Sem controladores de rig, luzes ou câmaras no ficheiro.
- [ ] Peso total ≤ 15 MB por jogador (com texturas).
- [ ] Licença confirmada.
