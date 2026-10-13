/* ===== Girabola 94: novo menu principal =====
   O menu antigo continua a ser construído (e a ligar todas as ações: época, taça, desafio, tutorial, carreira…),
   mas fica escondido; os cartões e separadores novos acionam esses mesmos botões. Nada da lógica do jogo muda. */
(function () {
"use strict";
var NOME = "Girabola 94";

var css = document.createElement("link");
css.rel = "stylesheet"; css.href = "ui/girabola94.css"; css.id = "girabola94-css";
document.head.appendChild(css);

/* ícones (mesma família: traço de 2 px, 24x24) */
function ico(p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
var I = {
  inicio: ico('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>'),
  jogador: ico('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>'),
  clube: ico('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>'),
  temporada: ico('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5v2a3 3 0 0 0 3 3M16 6h3v2a3 3 0 0 1-3 3"/><path d="M12 13v4M8 21h8M9 17h6"/>'),
  online: ico('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'),
  config: ico('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'),
  sino: ico('<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>'),
  calendario: ico('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M12 13v5M9.5 15.5h5"/>'),
  taca: ico('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5v2a3 3 0 0 0 3 3M16 6h3v2a3 3 0 0 1-3 3"/><path d="M12 13v4M8 21h8M9 17h6"/>'),
  play: ico('<circle cx="12" cy="12" r="9"/><path d="M10 8.5l6 3.5-6 3.5z"/>'),
  camisola: ico('<path d="M8 3l-5 3 2 5 3-1v11h8V10l3 1 2-5-5-3c-1 2-2 3-4 3S9 5 8 3z"/>'),
  tatica: ico('<path d="M5 5l5 5M10 5l-5 5M14 14l5 5M19 14l-5 5"/><circle cx="6" cy="18" r="2.5"/><path d="M9 18h4a4 4 0 0 0 4-4V8"/>'),
  tutorial: ico('<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/>'),
  opcoes: ico('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
  dados: ico('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>')
};

function perfilNome() {
  try { var k = "girabola.online", p = JSON.parse(localStorage.getItem(k) || "null"); if (p && p.nome) return p.nome; } catch (e) {}
  return "Jogador";
}
function nivelInfo() {
  try { if (typeof level === "function") { var l = level(), xp = (typeof C !== "undefined" && C && C.xp) || 0; return { l: l, f: Math.max(0, Math.min(1, (xp % 150) / 150)) }; } } catch (e) {}
  return { l: 1, f: 0 };
}

/* os botões do menu antigo que cada cartão aciona */
function acionar(id) { var b = document.getElementById(id); if (b) b.click(); }

function montar() {
  var sec = document.querySelector("#app > section.screen");
  if (!sec || sec.querySelector(".g94")) return;
  var temCont = !!document.getElementById("mCont"), temOnline = !!document.getElementById("mOnline");
  var contTxt = ""; var mc = document.getElementById("mCont"); if (mc) contTxt = (mc.textContent || "").replace(/\s+/g, " ").trim();
  var nv = nivelInfo(), conta = !!(window.G94 && window.G94.sessao && window.G94.sessao());
  var carTxt = "Nível " + nv.l;

  var tabs = [
    ["inicio", "Início", null, true],
    ["jogador", "Meu Jogador", "mCar"],
    ["clube", "Clube", "@clube"],
    ["temporada", "Temporada", temCont ? "mCont" : "mNew"],
    ["online", "Jogo Online", "mOnline"],
    ["config", "Configurações", "mOpt"]
  ];
  var cards = [
    { cls: "principal", id: "mNew", ic: "calendario", k: "Modo principal", t: "Nova época", s: "15 ou 30 jornadas", d: "Comece uma nova jornada no Girabola 94. Escreva o seu legado.", art: "nova-epoca" },
    { cls: "l2", id: "mCup", ic: "taca", k: "Competição", t: "Taça Girabola", s: "Eliminatórias e penáltis", d: "Lute pela glória no mata-mata.", art: "taca" },
    { cls: "l3", id: "mQuick", ic: "play", k: "Jogo local", t: "Jogo rápido", s: "Amigável", d: "Entre em campo sem compromisso.", art: "rapido" },
    { cls: "i1", id: "mCar", ic: "camisola", k: "Gestão", t: "Carreira", s: carTxt, d: "Construa a sua lenda do zero.", art: "carreira" },
    { cls: "i2", id: "mChallenge", ic: "tatica", k: "Desafios", t: "Desafio", s: "Recuperar de 0–1", d: "Vire o jogo e prove o seu valor.", art: "desafio" },
    { cls: "i3", id: "mTut", ic: "tutorial", k: "Aprender", t: "Tutorial", s: "Controlos", d: "Domine o jogo, passo a passo.", art: "tutorial" },
    { cls: "b1", id: "mOnline", ic: "online", k: "Online", t: "Jogo online", s: "1 contra 1", d: "Enfrente jogadores de todo o país.", art: "online", off: !temOnline },
    { cls: "b2", id: "mOpt", ic: "opcoes", k: "Personalização", t: "Opções e controlos", s: "", d: "Personalize a sua experiência.", art: "opcoes" },
    { cls: "b3", id: "mData", ic: "dados", k: "Dados", t: "Exportar ou importar época", s: "", d: "Guarda ou carrega a tua carreira.", art: "dados" }
  ];
  var h = '<div class="g94"><header class="g94-top"><div class="g94-marca"><img class="g94-logo" src="ui/logo-girabola94.png" alt="' + NOME + '"><p class="g94-slogan">Futebol angolano · Mais que um jogo</p></div>' +
    '<nav class="g94-nav" role="tablist" aria-label="Navegação principal">' + tabs.map(function (t) {
      var dis = !t[3] && !t[2];
      return '<button type="button" role="tab" class="g94-tab" data-go="' + (t[2] || "") + '" aria-selected="' + (!!t[3]) + '"' + (dis ? ' aria-disabled="true" title="Disponível quando tiveres uma época em curso"' : '') + '>' + I[t[0]] + '<span>' + t[1] + '</span></button>';
    }).join("") + '</nav>' +
    '<div class="g94-prof"><div class="g94-avatar" data-go="@conta" role="button" tabindex="0" title="Conta e progresso">' + perfilNome().charAt(0).toUpperCase() + '</div><div class="g94-nome" data-go="@conta" role="button" tabindex="0" title="Conta e progresso"><b>' + perfilNome().replace(/[<>&]/g, "") + '</b><small>Nível ' + nv.l + ' · ' + (conta ? "Conta ligada" : "Convidado · entrar") + '</small><div class="g94-xp"><i style="width:' + Math.round(nv.f * 100) + '%"></i></div></div>' +
    '<button type="button" class="g94-ic" id="g94Sino" aria-label="Notificações">' + I.sino + '</button><button type="button" class="g94-ic" data-go="mOpt" aria-label="Configurações">' + I.config + '</button></div></header>' +
    (temCont ? '<button type="button" class="g94-cont" data-go="mCont"><b>Continuar época</b>' + contTxt.replace(/^Continuar época\s*/i, "").replace(/[<>&]/g, "") + '<span>›</span></button>' : '') +
    '<main class="g94-grid" role="menu">' + cards.map(function (c) {
      return '<button type="button" role="menuitem" class="g94-card ' + c.cls + '" data-go="' + (c.off ? "" : c.id) + '" style="--art:url(card-' + c.art + '.jpg)"' + (c.off ? ' aria-disabled="true" title="Indisponível neste momento"' : '') + '>' +
        '<span class="ico">' + I[c.ic] + '</span><span class="tx"><span class="k">' + c.k + '</span><h3>' + c.t + '</h3>' + (c.s ? '<span class="s">' + c.s + '</span>' : '') + '<span class="d">' + c.d + '</span></span></button>';
    }).join("") + '</main>' +
    '<footer class="g94-rodape"><img src="ui/icone-app.png" alt=""><span>' + NOME + '<small>Futebol angolano · Mais que um jogo</small></span></footer></div>';

  sec.classList.add("g94-screen");
  Array.prototype.forEach.call(sec.children, function (c) { if (!c.classList.contains("notice")) c.classList.add("g94-off"); });
  var cont = document.createElement("div"); cont.innerHTML = h; sec.insertBefore(cont.firstChild, sec.firstChild);

  var g = sec.querySelector(".g94"), cartoes = Array.prototype.slice.call(g.querySelectorAll(".g94-card"));
  function sel(el) { cartoes.forEach(function (c) { c.classList.toggle("sel", c === el); }); }
  sel(cartoes[0]);
  g.addEventListener("click", function (e) {
    var b = e.target.closest("[data-go]"); if (!b || b.getAttribute("aria-disabled") === "true") return;
    var id = b.getAttribute("data-go"); if (!id) return;
    try { sfx("ui"); } catch (x) {}
    if (id === "@clube") { if (window.G94 && window.G94.showClube) window.G94.showClube(); return; }
    if (id === "@conta") { if (window.G94 && window.G94.showConta) window.G94.showConta(); return; }
    acionar(id);
  });
  var sino = g.querySelector("#g94Sino");
  if (sino) sino.onclick = function () { try { Pop.info({ icon: "info", eyebrow: NOME, title: "Notificações", html: "<p>Sem notificações novas.</p>", ok: "Fechar" }); } catch (x) {} };
  cartoes.forEach(function (c) { c.addEventListener("mouseenter", function () { sel(c); }); c.addEventListener("focus", function () { sel(c); }); });
  // navegação por teclado entre cartões (setas)
  g.addEventListener("keydown", function (e) {
    var i = cartoes.indexOf(document.activeElement); if (i < 0) return;
    var d = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 }[e.key]; if (!d) return;
    e.preventDefault(); var n = cartoes[Math.max(0, Math.min(cartoes.length - 1, i + d))]; if (n) n.focus();
  });
}

var _showMenu = showMenu;
showMenu = function () { _showMenu.apply(this, arguments); try { montar(); } catch (e) { console.warn("menu novo indisponível:", e); } };
if (document.querySelector("#mQuick")) montar();
document.title = NOME;
})();
