/* ===== Girabola 94: computador, telemóvel e TV =====
   - teclado/comando ligado: esconde os controlos táteis;
   - navegação por setas/comando nos menus (para comandos de TV e consolas), com foco bem visível;
   - comando (Gamepad API) para jogar: stick/cruzeta mexe, A passe, B remate, X passe em profundidade, Y trocar, gatilhos sprint, Start pausa. */
(function () {
"use strict";
var root = document.documentElement;
var _l = document.createElement("link"); _l.rel = "stylesheet"; _l.href = "ui/telas94.css"; document.head.appendChild(_l);
/* ---------- foco visível e esconder o toque quando há teclado ---------- */
var st = document.createElement("style");
st.textContent = "html.has-kbd .touch{display:none!important}" +
  ":focus-visible{outline:3px solid #FFC629!important;outline-offset:2px}" +
  "html.tv-nav button:focus,html.tv-nav .team:focus,html.tv-nav [tabindex]:focus{outline:3px solid #FFC629;outline-offset:2px}" +
  /* ecrãs enormes sem escala de pixéis (4K a 1x): os menus ampliam-se; o campo de jogo já ocupa o ecrã todo */
  "@media (min-width:2400px){#app>.screen{zoom:1.4}}@media (min-width:3200px){#app>.screen{zoom:1.9}}@media (min-width:3800px){#app>.screen{zoom:2.2}}";
document.head.appendChild(st);
addEventListener("keydown", function (e) { if (/^(Arrow|Key|Space|Enter)/.test(e.code)) root.classList.add("has-kbd"); }, true);
addEventListener("pointerdown", function (e) { if (e.pointerType === "touch") root.classList.remove("has-kbd"); }, true);

/* ---------- navegação espacial (setas + Enter) fora do jogo ---------- */
function visivel(el) {
  if (!el || el.disabled || el.hidden || el.getAttribute("aria-disabled") === "true") return false;
  var r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return false;
  var cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none") return false;
  return r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
}
function focaveis() {
  var raiz = document.querySelector(".overlay:not([hidden])") || document.querySelector(".pop-overlay,.pop,[role=dialog]") || document.getElementById("app");
  return Array.prototype.slice.call(raiz.querySelectorAll("button,a[href],input:not([type=hidden]),select,textarea,[tabindex]:not([tabindex='-1'])")).filter(visivel);
}
function mover(dir) {
  var lista = focaveis(); if (!lista.length) return false;
  var at = document.activeElement, ref = at && lista.indexOf(at) >= 0 ? at : null;
  if (!ref) { lista[0].focus(); return true; }
  var a = ref.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2, melhor = null, pior = 1e12;
  lista.forEach(function (el) {
    if (el === ref) return;
    var r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, dx = x - ax, dy = y - ay, ok, prim, sec;
    if (dir === "right") { ok = dx > 4; prim = dx; sec = Math.abs(dy); } else if (dir === "left") { ok = dx < -4; prim = -dx; sec = Math.abs(dy); }
    else if (dir === "down") { ok = dy > 4; prim = dy; sec = Math.abs(dx); } else { ok = dy < -4; prim = -dy; sec = Math.abs(dx); }
    if (!ok) return;
    var custo = prim + sec * 2.2; if (custo < pior) { pior = custo; melhor = el; }
  });
  if (melhor) { window.__navInput = performance.now(); melhor.focus(); try { melhor.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch (e) {} return true; }
  return false;
}
function voltar() {
  var b = document.querySelector(".overlay:not([hidden]) .btn.ghost, .back, .c94-voltar, #oBack, #pBack");
  var op = document.querySelector(".pop .pop-close, .pop-overlay [data-close], [role=dialog] [data-close]");
  (op || b) && (op || b).click();
}
addEventListener("keydown", function (e) {
  if (e.defaultPrevented) return;
  if (typeof G !== "undefined" && G && !G.paused && document.getElementById("match") && !document.querySelector(".overlay:not([hidden])")) return;   // em jogo as setas são do jogo
  var tag = (e.target && e.target.tagName) || ""; if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) && /^(Arrow(Left|Right)|Home|End)$/.test(e.code)) return;
  if (e.target && e.target.type === "range" && /^Arrow(Left|Right)$/.test(e.code)) return;
  var d = { ArrowRight: "right", ArrowLeft: "left", ArrowDown: "down", ArrowUp: "up" }[e.code];
  if (d) { if (mover(d)) { e.preventDefault(); root.classList.add("tv-nav"); } }
  else if (e.code === "Escape" || e.code === "Backspace" || e.code === "BrowserBack") { if (!/^(INPUT|TEXTAREA)$/.test(tag) && !(typeof G !== "undefined" && G)) { voltar(); } }
}, false);

/* ---------- comando ---------- */
var antes = {}, ultimoNav = 0;
function botao(gp, i) { var b = gp.buttons[i]; return !!(b && (b.pressed || b.value > .5)); }
function sondar() {
  requestAnimationFrame(sondar);
  var gps = navigator.getGamepads ? navigator.getGamepads() : null; if (!gps) return;
  var gp = null; for (var i = 0; i < gps.length; i++) if (gps[i] && gps[i].connected) { gp = gps[i]; break; }
  if (!gp) { if (antes.ativo) { antes.ativo = false; if (typeof input !== "undefined") { input.jx = input.jy = 0; input.tShoot = false; input.tSprint = false; } } return; }
  if (!antes.ativo) { antes.ativo = true; root.classList.add("has-kbd"); }
  var emJogo = typeof G !== "undefined" && G && document.getElementById("match") && !document.querySelector(".overlay:not([hidden])") && !G.paused;
  var ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
  if (botao(gp, 14)) ax = -1; if (botao(gp, 15)) ax = 1; if (botao(gp, 12)) ay = -1; if (botao(gp, 13)) ay = 1;
  var m = Math.hypot(ax, ay), zona = .22;
  var edge = function (i) { var p = botao(gp, i), e = p && !antes["b" + i]; antes["b" + i] = p; return e; };
  if (emJogo && typeof input !== "undefined") {
    if (m > zona) { var k = Math.min(1, (m - zona) / (1 - zona)) / m; input.jx = ax * k; input.jy = ay * k; } else input.jx = input.jy = 0;
    if (edge(0)) { input.through = false; input.passPressed = true; }
    if (edge(2)) { input.through = true; input.passPressed = true; }
    var b1 = botao(gp, 1); if (b1 && !antes.shoot) input.shootPressed = true; antes.shoot = b1; input.tShoot = b1;
    if (edge(3)) input.switchPressed = true;
    input.tSprint = botao(gp, 5) || botao(gp, 7) || botao(gp, 4) || botao(gp, 6);
    if (edge(9) && typeof canPause === "function" && canPause()) setPause(true);
  } else {
    if (typeof input !== "undefined") { input.jx = input.jy = 0; }
    var now = performance.now();
    if (m > .6 && now - ultimoNav > 220) { ultimoNav = now; mover(Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? "right" : "left") : (ay > 0 ? "down" : "up")); root.classList.add("tv-nav"); }
    if (edge(0)) { var f = document.activeElement; if (f && f !== document.body) f.click(); }
    if (edge(1)) voltar();
    if (edge(9) && typeof G !== "undefined" && G && G.paused && typeof setPause === "function") setPause(false);
  }
}
if (navigator.getGamepads) requestAnimationFrame(sondar);
})();
