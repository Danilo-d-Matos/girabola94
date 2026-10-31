/* Catálogo do servidor (gerido na área de administração): clubes editados e novos, músicas e aviso.
   - Lê GET /catalogo ao arrancar (com cópia local para funcionar sem rede) e aplica-o sem tocar nos dados de origem do jogo.
   - Clubes: os 16 de origem podem mudar de nome, força, cores, estilo, emblema e plantel; os clubes novos entram no jogo rápido
     (a época e a taça continuam com os 16 de origem). Sem servidor, o jogo funciona com os dados que já tem.
   - Música: faixas carregadas pelo administrador, reproduzidas através do barramento de música do motor de áudio. */
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
  var lista = (p || []).map(function (j, i) { return { id: i, fullName: j.nome, name: j.nome, num: j.num, role: j.pos, positionSource: "Administração", numberFictional: false }; });
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

/* ---------- aplicar clubes ---------- */
function guardaOriginal(t) {
  if (ORIG[t.s]) return;
  ORIG[t.s] = { n: t.n, r: t.r, c1: t.c1, c2: t.c2, st: t.st, crest: TEAM_CRESTS[t.s], squad: SQUADS[t.n] };
}
function aplicarClubes(c) {
  if (typeof TEAMS === "undefined" || !c || !c.clubes) return;
  /* repõe a origem */
  for (var i = 0; i < BASE; i++) { var t = TEAMS[i], o = ORIG[t.s]; if (!o) continue; if (t.n !== o.n) delete SQUADS[t.n]; t.n = o.n; t.r = o.r; t.c1 = o.c1; t.c2 = o.c2; t.st = o.st; TEAM_CRESTS[t.s] = o.crest; SQUADS[o.n] = o.squad; }
  TEAMS.slice(BASE).forEach(function (t) { delete SQUADS[t.n]; delete TEAM_CRESTS[t.s]; });
  TEAMS.length = BASE;
  for (var k = 0; k < BASE; k++) guardaOriginal(TEAMS[k]);
  /* edições dos clubes de origem */
  (c.clubes.editados || []).forEach(function (e) {
    var t = TEAMS.slice(0, BASE).filter(function (x) { return x.s === e.base; })[0]; if (!t) return;
    var o = ORIG[t.s];
    if (e.nome) t.n = e.nome; if (e.forca != null) t.r = e.forca; if (e.c1) t.c1 = e.c1; if (e.c2) t.c2 = e.c2; if (e.estilo) t.st = e.estilo;
    if (e.emblema) TEAM_CRESTS[t.s] = API + e.emblema;
    if (e.plantel && e.plantel.length) SQUADS[t.n] = plantelParaJogo(e.plantel, t.s); else SQUADS[t.n] = o.squad;
  });
  /* clubes novos (só jogo rápido) */
  (c.clubes.novos || []).forEach(function (n) {
    var s = String(n.sigla || "").toUpperCase(); if (!s || TEAMS.some(function (x) { return x.s === s; })) return;
    var t = { n: n.nome, s: s, r: n.forca, c1: n.c1, c2: n.c2, st: n.estilo, extra: true, cat: n.id };
    TEAMS.push(t); TEAM_CRESTS[s] = n.emblema ? API + n.emblema : emblemaSvg(n.c1, n.c2, s);
    SQUADS[t.n] = plantelParaJogo(n.plantel, s);
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

/* ---------- música (faixas carregadas) ---------- */
var el = null, ligado = false, ordem = [], pos = 0, ctxAtual = "";
function contexto() { return typeof G !== "undefined" && G ? "jogo" : "menu"; }
function faixasDoContexto(ct) { return ((CAT && CAT.musicas) || []).filter(function (m) { return m.uso === "ambos" || m.uso === ct; }); }
/** o motor de áudio consulta isto: se devolver true, não gera música sintética */
function ativo() {
  if (!CAT || !CAT.musicas || !CAT.musicas.length) return false;
  var s = (typeof PREF !== "undefined" && PREF.musicStyle) || "auto";
  if (s === "faixas") return true;
  return s === "auto" && CAT.usarFaixas !== false;
}
function ligaAudio() {
  if (ligado || !window.Aud || !Aud.ok || !Aud.ctx || !Aud.music) return !!ligado;
  try {
    el = new Audio(); el.crossOrigin = "anonymous"; el.preload = "auto";
    var src = Aud.ctx.createMediaElementSource(el); src.connect(Aud.music);
    el.addEventListener("ended", function () { pos++; tocar(true); });
    el.addEventListener("error", function () { setTimeout(function () { pos++; tocar(true); }, 1500); });
    ligado = true;
  } catch (e) { return false; }
  return true;
}
function tocar(troca) {
  var ct = contexto(), l = faixasDoContexto(ct); if (!l.length || !el) return;
  var f = l[pos % l.length];
  if (!troca && el.src && el.src.indexOf(f.url) >= 0 && !el.ended) { if (el.paused) el.play().catch(function () {}); return; }
  el.src = API + f.url; el.play().catch(function () {});
}
function ciclo() {
  var ct = contexto();
  if (!ativo() || !(typeof PREF !== "undefined" && PREF.sound)) { if (el && !el.paused) el.pause(); return; }
  if (!window.Aud || !Aud.ok || Aud.ctx.state !== "running") return;     // só depois de o jogador interagir com a página
  if (!ligaAudio()) return;
  if (ct !== ctxAtual) { ctxAtual = ct; pos = 0; tocar(true); return; }
  if (el.paused || el.ended) tocar(false);
}
window.G94Faixas = { ativo: ativo, lista: function () { return (CAT && CAT.musicas) || []; }, estado: function () { return el ? { src: el.src, pausado: el.paused, t: +el.currentTime.toFixed(2), erro: el.error ? el.error.code : 0, ctx: ctxAtual } : null; } };
setInterval(ciclo, 700);

/* opção «Música» nas definições, só quando o servidor tem faixas */
function opcao() {
  var o = document.querySelector(".options-screen"); if (!o || o.querySelector(".g94-faixas") || !CAT || !CAT.musicas || !CAT.musicas.length) return;
  var p = document.createElement("div"); p.className = "panel g94-faixas";
  var atual = ativo() ? "faixas" : "gerada";
  p.innerHTML = '<p class="panel-title">Música do servidor</p><p class="note">O servidor tem ' + CAT.musicas.length + ' faixa(s) de música. Podes ouvi-las ou manter a música gerada pelo jogo.</p><div class="seg" role="group"></div>';
  var g = p.querySelector(".seg");
  [["faixas", "Faixas do servidor"], ["gerada", "Música gerada pelo jogo"]].forEach(function (it) {
    var b = document.createElement("button"); b.type = "button"; b.textContent = it[1]; b.setAttribute("aria-pressed", String(atual === it[0]));
    b.onclick = function () { PREF.musicStyle = it[0]; savePrefs(); g.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); };
    g.appendChild(b);
  });
  o.appendChild(p);
}
if (window.MutationObserver) { var q = false; new MutationObserver(function () { if (!q) { q = true; setTimeout(function () { q = false; try { opcao(); } catch (e) { /* */ } }, 100); } }).observe(document.getElementById("app") || document.body, { childList: true, subtree: false }); }

/* ---------- arranque ---------- */
function usa(c, rede) {
  CAT = c; try { aplicarClubes(c); } catch (e) { console.warn("Catálogo (clubes):", e && e.message); }
  try { mostraAviso(c); } catch (e) { /* */ }
}
function init() {
  API = httpBase();
  var cache = null; try { cache = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { /* */ }
  if (cache && cache.c) { API = cache.api || API; usa(cache.c, false); }
  if (!API || location.protocol === "file:") return;
  var ctl = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 4000);
  fetch(API + "/catalogo", { cache: "no-store", signal: ctl ? ctl.signal : undefined }).then(function (r) { if (!r.ok) throw new Error("catálogo " + r.status); return r.json(); })
    .then(function (c) { clearTimeout(t); try { localStorage.setItem(KEY, JSON.stringify({ api: API, c: c })); } catch (e) { /* */ } usa(c, true); })
    .catch(function () { clearTimeout(t); /* sem servidor: fica o que já havia */ });
}
init();
})();
