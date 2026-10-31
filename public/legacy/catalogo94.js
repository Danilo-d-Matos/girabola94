/* Catálogo do servidor (gerido na área de administração): clubes editados e novos, músicas (ligações do YouTube e do Spotify) e aviso.
   - Lê GET /catalogo ao arrancar (com cópia local para funcionar sem rede) e aplica-o sem tocar nos dados de origem do jogo.
   - Clubes: os 16 de origem podem mudar de nome, força, cores, estilo, emblema, equipamento alternativo, plantel e informação (cidade, estádio...);
     os clubes novos entram no jogo rápido (a época e a taça continuam com os 16 de origem).
   - Música: leitor oficial incorporado do YouTube / Spotify num cartão visível (as plataformas exigem o leitor à vista). Não passa pelo motor
     de áudio do jogo: o volume segue o controlo «Música» no YouTube; no Spotify ajusta-se no próprio leitor. */
(function () {
"use strict";
var KEY = "g94.catalogo", ORIG = {}, CAT = null, API = "";
var BASE = typeof BASE_N !== "undefined" ? BASE_N : 16;

function httpBase() {
  var u = window.GIRABOLA_SERVIDOR || (typeof URL_SERVIDOR !== "undefined" && URL_SERVIDOR) || "";
  if (!u && location.protocol !== "file:") u = "ws://" + (location.hostname || "localhost") + ":2567";
  return String(u).replace(/^wss:/, "https:").replace(/^ws:/, "http:").replace(/\/+$/, "");
}
function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/* ---------- plantéis ---------- */
var NOMES = ["Mingas", "Zeca", "Nito", "Dino", "Beto", "Jaime", "Tony", "Edgar", "Mário", "Lito", "Fredy", "Gelson", "Manuel", "Pedro", "Kady", "Nelson", "Flávio", "Mateus", "Délcio", "Paulo", "Ito", "Zito", "Bonga", "Show", "Tchutchu", "Njé", "Rui", "Kiala", "Dany", "Joel", "Eduardo", "Hélder"];
function plantelParaJogo(p, sigla) {
  var lista = (p || []).map(function (j, i) { return { id: i, fullName: j.nomeCompleto || j.nome, name: j.nome, num: j.num, role: j.pos, positionSource: "Administração", numberFictional: false }; });
  var tem = function (r) { return lista.filter(function (x) { return x.role === r; }).length; };
  var usados = {}; lista.forEach(function (x) { usados[x.num] = 1; });
  var h = hash(sigla), n = 0;
  function acrescenta(r, ate) {
    while (tem(r) < ate) {
      var num = 1; while (usados[num]) num++; usados[num] = 1;
      var nome = NOMES[(h + n * 7) % NOMES.length]; n++;
      lista.push({ id: lista.length, fullName: nome + " (reserva)", name: nome, num: num, role: r, positionSource: "Gerado", numberFictional: true });
    }
  }
  acrescenta("GK", 2); acrescenta("D", 6); acrescenta("M", 6); acrescenta("F", 4);
  lista.forEach(function (x, i) { x.id = i; });
  return lista;
}
function emblemaSvg(c1, c2, sigla) {
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 4 92 18v32c0 24-18 40-42 46C26 90 8 74 8 50V18z" fill="' + c1 + '" stroke="' + c2 + '" stroke-width="6"/><text x="50" y="62" font-family="Arial Narrow,Arial,sans-serif" font-weight="700" font-size="30" text-anchor="middle" fill="' + c2 + '">' + sigla.replace(/[<>&"]/g, "") + '</text></svg>';
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/* ---------- clubes ---------- */
var EXTRAS = ["cidade", "provincia", "apelido", "estadio", "fundacao", "treinador", "descricao", "site"];
function guardaOriginal(t) {
  if (ORIG[t.s]) return;
  var o = { n: t.n, r: t.r, c1: t.c1, c2: t.c2, st: t.st, crest: TEAM_CRESTS[t.s], squad: SQUADS[t.n] }; EXTRAS.forEach(function (k) { o[k] = t[k]; }); ORIG[t.s] = o;
}
function aplicaExtra(t, e) { EXTRAS.forEach(function (k) { t[k] = (e && e[k]) || undefined; }); }
function aplicarClubes(c) {
  if (typeof TEAMS === "undefined" || !c || !c.clubes) return;
  window.G94ALT = {};
  for (var i = 0; i < BASE; i++) { var t = TEAMS[i], o = ORIG[t.s]; if (!o) continue; if (t.n !== o.n) delete SQUADS[t.n]; t.n = o.n; t.r = o.r; t.c1 = o.c1; t.c2 = o.c2; t.st = o.st; TEAM_CRESTS[t.s] = o.crest; SQUADS[o.n] = o.squad; EXTRAS.forEach(function (k) { t[k] = o[k]; }); }
  TEAMS.slice(BASE).forEach(function (t) { delete SQUADS[t.n]; delete TEAM_CRESTS[t.s]; });
  TEAMS.length = BASE;
  for (var k = 0; k < BASE; k++) guardaOriginal(TEAMS[k]);
  var alt = function (s, a) { if (a) window.G94ALT[s] = [a.camisola, a.detalhes, a.calcoes, a.meias, a.padrao | 0]; };
  (c.clubes.editados || []).forEach(function (e) {
    var t = TEAMS.slice(0, BASE).filter(function (x) { return x.s === e.base; })[0]; if (!t) return;
    var o = ORIG[t.s];
    if (e.nome) t.n = e.nome; if (e.forca != null) t.r = e.forca; if (e.c1) t.c1 = e.c1; if (e.c2) t.c2 = e.c2; if (e.estilo) t.st = e.estilo;
    if (e.emblema) TEAM_CRESTS[t.s] = API + e.emblema;
    if (e.extra) aplicaExtra(t, e.extra);
    SQUADS[t.n] = e.plantel && e.plantel.length ? plantelParaJogo(e.plantel, t.s) : o.squad;
    alt(t.s, e.alt);
  });
  (c.clubes.novos || []).forEach(function (n) {
    var s = String(n.sigla || "").toUpperCase(); if (!s || TEAMS.some(function (x) { return x.s === s; })) return;
    var t = { n: n.nome, s: s, r: n.forca, c1: n.c1, c2: n.c2, st: n.estilo, extra: true, cat: n.id };
    aplicaExtra(t, n.extra);
    TEAMS.push(t); TEAM_CRESTS[s] = n.emblema ? API + n.emblema : emblemaSvg(n.c1, n.c2, s);
    SQUADS[t.n] = plantelParaJogo(n.plantel, s); alt(s, n.alt);
  });
  window.G94CAT_APLICADO = (window.G94CAT_APLICADO || 0) + 1;
}

/* ---------- aviso ---------- */
function mostraAviso(c) {
  var el = document.getElementById("g94Aviso"), txt = c && c.aviso ? String(c.aviso) : "";
  if (!txt) { if (el) el.remove(); return; }
  var chave = "g94.aviso." + hash(txt + (c.manutencao ? "m" : ""));
  try { if (sessionStorage.getItem(chave)) { if (el) el.remove(); return; } } catch (e) { /* sem armazenamento */ }
  if (!el) {
    el = document.createElement("div"); el.id = "g94Aviso"; el.setAttribute("role", "status");
    el.style.cssText = "position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:9000;max-width:min(680px,calc(100vw - 20px));padding:10px 42px 10px 16px;border-radius:12px;font:600 14px/1.35 Inter,system-ui,sans-serif;box-shadow:0 10px 30px #0009;border:1px solid";
    var x = document.createElement("button"); x.type = "button"; x.setAttribute("aria-label", "Fechar aviso"); x.textContent = "×";
    x.style.cssText = "position:absolute;right:8px;top:4px;background:transparent;border:0;color:inherit;font-size:22px;cursor:pointer";
    x.onclick = function () { try { sessionStorage.setItem(chave, "1"); } catch (e) { /* */ } el.remove(); };
    el.append(document.createElement("span"), x); document.body.appendChild(el);
  }
  el.firstChild.textContent = txt;
  el.style.background = c.manutencao ? "#4a1218" : "#0d2a44"; el.style.color = "#fff"; el.style.borderColor = c.manutencao ? "#ff6b78" : "#f6c744";
}

/* ---------- música: leitores incorporados do YouTube e do Spotify ---------- */
var oculto = null, spCtl = null, spApi = null, spCarregando = false, gesto = false, parado = false, idx = 0, ctxAtual = "", card = null, yt = null, ytPronto = false, ytCarregando = false, atualId = "";
try { parado = sessionStorage.getItem("g94.musica.parada") === "1"; } catch (e) { /* */ }
function contexto() { return typeof G !== "undefined" && G ? "jogo" : "menu"; }
/* músicas de fundo por omissão: valem enquanto o servidor não definir outras (ou se não houver servidor) */
var PADRAO = [
  { id: "padrao1", titulo: "Dança Dos Combas", artista: "Bruno M", uso: "ambos", plataforma: "youtube", tipo: "video", ref: "6mhF9shs4bk" },
  { id: "padrao2", titulo: "Comboio II", artista: "Os Lambas", uso: "ambos", plataforma: "youtube", tipo: "video", ref: "9NL9c98f8J4" }
];
function todas() { return CAT ? (CAT.musicas || []) : PADRAO; }
function faixasDoContexto(ct) { return todas().filter(function (m) { return m.uso === "ambos" || m.uso === ct; }); }
/** o motor de áudio consulta isto: com música do servidor ativa, não gera música sintética */
function ativo() {
  if (parado || !todas().length) return false;
  var s = (typeof PREF !== "undefined" && PREF.musicStyle) || "auto";
  return s === "faixas" || (s === "auto" && !(CAT && CAT.usarFaixas === false));
}
function volumeAlvo() {
  var mv = typeof PREF.musicVol === "number" ? PREF.musicVol : .3, mult = 1;
  if (contexto() === "jogo") { var gm = PREF.gameMusic || "low"; mult = gm === "off" ? 0 : gm === "normal" ? .5 : .2; }
  return Math.round(Math.max(0, Math.min(1, mv * mult)) * 100);
}
var TEMPO = 8000, tAviso = null; /* o título da música aparece este tempo (ms) e desaparece */
function anuncia(txt) {
  if (!card) return; card.querySelector("#g94MusicaTit").textContent = "♪ " + txt + (gesto ? "" : "  ·  toca no ecrã para ouvir");
  var br = card.querySelector("#g94MusicaBarra"); br.style.transition = "none"; br.style.transform = "scaleX(1)"; void br.offsetWidth;
  card.style.opacity = "1"; card.style.transform = "none"; br.style.transition = "transform " + TEMPO + "ms linear"; br.style.transform = "scaleX(0)";
  clearTimeout(tAviso); tAviso = setTimeout(function () { if (card) { card.style.opacity = "0"; card.style.transform = "translateX(-24px) scale(.96)"; } }, TEMPO);
}
function el(tag, css, txt) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (txt != null) e.textContent = txt; return e; }
function criaCartao() {
  if (card) return card;
  card = el("div", "position:fixed;left:14px;bottom:14px;z-index:8000;max-width:min(300px,calc(100vw - 28px));padding:9px 14px 11px;background:#08182af2;border:1px solid #27506f;border-left:4px solid #f6c744;border-radius:10px;box-shadow:0 12px 30px #0009;overflow:hidden;font:600 13px/1.3 Inter,system-ui,sans-serif;color:#eef4fa;pointer-events:none;opacity:0;transform:translateX(-24px) scale(.96);transition:opacity .45s ease,transform .45s cubic-bezier(.2,.9,.3,1.2)");
  card.id = "g94Musica"; card.setAttribute("role", "status"); card.setAttribute("aria-live", "polite");
  var tit = el("div", "overflow:hidden;text-overflow:ellipsis;white-space:nowrap", "♪"); tit.id = "g94MusicaTit";
  var barra = el("div", "position:absolute;left:0;bottom:0;height:3px;width:100%;background:#f6c744;transform-origin:left"); barra.id = "g94MusicaBarra";
  card.append(tit, barra); document.body.appendChild(card);
  /* os leitores ficam fora do ecrã: só se ouve o áudio */
  oculto = el("div", "position:fixed;left:0;bottom:0;width:220px;height:220px;overflow:hidden;opacity:.01;pointer-events:none;z-index:-1"); oculto.setAttribute("aria-hidden", "true"); oculto.id = "g94MusicaCorpo"; document.body.appendChild(oculto);
  return card;
}
function parar(sim) {
  parado = !!sim; try { sessionStorage.setItem("g94.musica.parada", sim ? "1" : "0"); } catch (e) { /* */ }
  if (sim) { try { if (yt && yt.pauseVideo) yt.pauseVideo(); if (spCtl) spCtl.pause(); } catch (e) { /* */ } if (card) { card.remove(); card = null; if (oculto) oculto.remove(); oculto = null; yt = null; ytPronto = false; spCtl = null; atualId = ""; } }
}
function muda(d) { var l = faixasDoContexto(contexto()); if (!l.length) return; idx = (idx + d + l.length * 100) % l.length; atualId = ""; mostra(); }
function carregaYT(cb) {
  if (window.YT && YT.Player) { cb(); return; }
  var antes = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = function () { try { if (antes) antes(); } catch (e) { /* */ } cb(); };
  if (ytCarregando) return; ytCarregando = true;
  var s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; s.async = true; s.onerror = function () { ytCarregando = false; }; document.head.appendChild(s);
}
var spTocou = false, spPausado = true, spUlt = 0;
function carregaSP(cb) {
  if (spApi) { cb(spApi); return; }
  var antes = window.onSpotifyIframeApiReady; window.onSpotifyIframeApiReady = function (a) { spApi = a; try { if (antes) antes(a); } catch (e) { /* */ } cb(a); };
  if (spCarregando) return; spCarregando = true;
  var s = document.createElement("script"); s.src = "https://open.spotify.com/embed/iframe-api/v1"; s.async = true; s.onerror = function () { spCarregando = false; }; document.head.appendChild(s);
}
/* os navegadores só deixam tocar áudio depois de um toque/clique do jogador */
function aoGesto() { gesto = true; try { if (spCtl) spCtl.play(); } catch (e) { /* */ } try { if (yt && ytPronto) yt.playVideo(); } catch (e) { /* */ } }
document.addEventListener("pointerdown", aoGesto, true); document.addEventListener("keydown", aoGesto, true);
function mostra() {
  var l = faixasDoContexto(contexto()); if (!l.length) return;
  var f = l[idx % l.length]; if (atualId === f.id && card) return; atualId = f.id;
  criaCartao();
  var corpo = oculto, nota = {}; anuncia(f.titulo);
  corpo.textContent = ""; yt = null; ytPronto = false; spCtl = null;
  if (f.plataforma === "youtube") {
    nota.textContent = "YouTube · só áudio";
    var alvo = el("div"); alvo.id = "g94YT"; corpo.appendChild(alvo);
    carregaYT(function () {
      if (atualId !== f.id || !document.getElementById("g94YT")) return;
      var pv = { autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1 }; if (f.tipo === "playlist") { pv.listType = "playlist"; pv.list = f.ref; }
      yt = new YT.Player("g94YT", { width: 220, height: 220, videoId: f.tipo === "playlist" ? undefined : f.ref, playerVars: pv, events: {
        onReady: function (e) { ytPronto = true; try { e.target.setVolume(volumeAlvo()); e.target.playVideo(); } catch (x) { /* */ } },
        onStateChange: function (e) { if (e.data === 0 && f.tipo !== "playlist") muda(1); },
        onError: function () { setTimeout(function () { muda(1); }, 1500); }
      } });
    });
  } else {
    nota.textContent = "Spotify · só áudio (toca após o primeiro toque/clique)";
    var alvoS = el("div"); corpo.appendChild(alvoS);
    carregaSP(function (api) {
      if (atualId !== f.id) return;
      api.createController(alvoS, { uri: "spotify:" + f.tipo + ":" + f.ref, width: 220, height: 220 }, function (c) {
        spCtl = c;
        c.addListener("ready", function () { if (gesto) try { c.play(); } catch (e) { /* */ } });
        spPausado = true; c.addListener("playback_update", function (e) { var d = e && e.data; if (d) spPausado = !!d.isPaused; if (d && !d.isPaused) spTocou = true; if (d && d.duration && d.position >= d.duration - 400 && f.tipo === "track") muda(1); });
      });
    });
  }
}
function ciclo() {
  if (!ativo() || !(typeof PREF !== "undefined" && PREF.sound)) { if (card) { try { if (yt && yt.pauseVideo) yt.pauseVideo(); } catch (e) { /* */ } } return; }
  var ct = contexto(), l = faixasDoContexto(ct);
  if (!l.length) { if (card) card.style.display = "none"; return; }
  if (ct !== ctxAtual) { ctxAtual = ct; idx = 0; atualId = ""; }
  if (!card || atualId === "") mostra();
  /* o Spotify só começa depois de um toque/clique do jogador: tenta de novo até estar a tocar */
  if (spCtl && gesto && spPausado && Date.now() - spUlt > 2500) { spUlt = Date.now(); try { spCtl.play(); } catch (e) { /* */ } }
  try { if (yt && ytPronto && yt.setVolume) yt.setVolume(volumeAlvo()); } catch (e) { /* */ }
}
window.G94Faixas = { ativo: ativo, lista: function () { return todas(); }, parar: function () { parar(true); }, retomar: function () { parar(false); atualId = ""; }, estado: function () { return { parado: parado, ctx: ctxAtual, faixa: atualId, cartao: !!card, yt: ytPronto, sp: !spPausado }; } };
setInterval(ciclo, 1000);

/* opção «Música do servidor» nas definições, só quando o servidor tem faixas */
function opcao() {
  var o = document.querySelector(".options-screen"); if (!o || o.querySelector(".g94-faixas") || !todas().length) return;
  var p = document.createElement("div"); p.className = "panel g94-faixas";
  p.innerHTML = '<p class="panel-title">Música do servidor</p><p class="note">Há ' + todas().length + ' faixa(s) do YouTube/Spotify, que tocam num leitor no canto do ecrã. Podes ouvi-las ou manter a música gerada pelo jogo.</p><div class="seg" role="group"></div>';
  var g = p.querySelector(".seg");
  [["faixas", "Faixas do servidor"], ["gerada", "Música gerada pelo jogo"]].forEach(function (it) {
    var b = document.createElement("button"); b.type = "button"; b.textContent = it[1]; b.setAttribute("aria-pressed", String(ativo() === (it[0] === "faixas")));
    b.onclick = function () { PREF.musicStyle = it[0]; savePrefs(); if (it[0] === "faixas") window.G94Faixas.retomar(); g.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); };
    g.appendChild(b);
  });
  o.appendChild(p);
}
if (window.MutationObserver) { var q = false; new MutationObserver(function () { if (!q) { q = true; setTimeout(function () { q = false; try { opcao(); } catch (e) { /* */ } }, 100); } }).observe(document.getElementById("app") || document.body, { childList: true, subtree: false }); }

/* ---------- arranque ---------- */
function usa(c) {
  CAT = c; try { aplicarClubes(c); } catch (e) { console.warn("Catálogo (clubes):", e && e.message); }
  try { mostraAviso(c); } catch (e) { /* */ }
}
function init() {
  API = httpBase();
  var cache = null; try { cache = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { /* */ }
  if (cache && cache.c && cache.v === 2) { API = cache.api || API; usa(cache.c); }
  if (!API || location.protocol === "file:") return;
  var ctl = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 4000);
  fetch(API + "/catalogo", { cache: "no-store", signal: ctl ? ctl.signal : undefined }).then(function (r) { if (!r.ok) throw new Error("catálogo " + r.status); return r.json(); })
    .then(function (c) { clearTimeout(t); try { localStorage.setItem(KEY, JSON.stringify({ v: 2, api: API, c: c })); } catch (e) { /* */ } usa(c); })
    .catch(function () { clearTimeout(t); /* sem servidor: fica o que já havia */ });
}
init();
})();
