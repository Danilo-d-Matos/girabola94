/* ===== Girabola 94: sons dos menus (pacote "Girabola94_Efeitos_Menus", em audio/menu/) =====
   Um único sistema para todos os menus: MenuSfx.play(nome). Usa o contexto de áudio do audio-engine.js, um barramento próprio
   (volume "Menus" separado do da partida) e o interruptor geral de som. Não toca nos sons da bola, do árbitro, dos adeptos nem do ambiente.
   Associação:
     01_navegar_menu      → "nav"        mudar a opção seleccionada (rato por cima, setas/Tab, comando)
     02_confirmar_selecao → "select"     escolher uma opção (cartões, botões, separadores de escolha)
     03_abrir_opcao       → "open"       entrar num submenu/painel (cartões do menu, separadores, pop-ups)
     04_voltar_cancelar   → "back"       voltar, fechar, cancelar
     05_confirmar_acao    → "confirm"    acção importante: entrar em campo, guardar, criar conta, começar
     06_transicao_menu    → "transition" mudança de ecrã sem clique (nunca por cima de um som de clique) */
(function () {
"use strict";
var FILES = { nav: "01_navegar_menu.wav", select: "02_confirmar_selecao.wav", open: "03_abrir_opcao.wav", back: "04_voltar_cancelar.wav", confirm: "05_confirmar_acao.wav", transition: "06_transicao_menu.wav" };
var BASE = { nav: .20, select: .30, open: .30, back: .30, confirm: .35, transition: .25 };      // volumes de partida sugeridos no pacote
var BUF = {}, started = false, bus = null, last = 0, lastNav = 0, lastNome = "", navSrc = null, lastHover = null, lastInput = 0, lastSig = "";

function nv(k, d) { var v = PREF[k]; return typeof v === "number" ? v : d; }
function ligado() { return PREF.uiSfx !== false; }
function ctx() { return window.Aud && Aud.ok ? Aud.ctx : null; }

function carregar() {
  var c = ctx(); if (!c || started) return; started = true;
  bus = c.createGain(); bus.connect(Aud.master);
  Object.keys(FILES).forEach(function (k) {
    fetch("audio/menu/" + FILES[k]).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(function (a) { return new Promise(function (ok, no) { c.decodeAudioData(a, ok, no); }); })
      .then(function (b) { BUF[k] = b; Aud.menuOn = Object.keys(BUF).length === 6; })      // só quando os seis carregam o som sintetizado antigo deixa de tocar
      .catch(function (e) { console.warn("som de menu indisponível:", FILES[k], e && e.message); });
  });
}
["pointerdown", "keydown", "touchstart"].forEach(function (ev) { addEventListener(ev, function () { setTimeout(carregar, 60); }, { passive: true, capture: true }); });
setInterval(function () { if (ctx()) carregar(); }, 1000);

/* menus activos? Durante a partida (sem pausa nem painel) não há sons de menu */
function menuActivo() {
  if (document.documentElement.classList.contains("booting")) return false;
  var emJogo = typeof G !== "undefined" && G && document.getElementById("match");
  if (!emJogo) return true;
  if (G.paused) return true;
  var ov = document.getElementById("ov"); if (ov && !ov.hidden) return true;
  return !!document.querySelector(".pop-open");
}

/* um único efeito por acção: tempo mínimo entre sons, e a navegação cede a qualquer outro som */
function play(nome, o) {
  o = o || {};
  if (!ligado() || !BUF[nome]) return false;
  var c = ctx(); if (!c) return false;
  var agora = performance.now();
  if (nome === "nav") { if (agora - last < 120 || agora - lastNav < 85) return false; }
  else if (nome === "transition") { if (agora - last < 450) return false; }
  else if (agora - last < 140 && !o.force && lastNome !== "nav") return false;      // o clique nunca perde para o "nav" do rato a chegar ao botão
  var vol = nv("uiVol", 1) * BASE[nome]; if (vol <= 0) return false;
  var tocar = function () {
    var s = c.createBufferSource(), g = c.createGain(), b = BUF[nome], t = c.currentTime, dur = b.duration;
    s.buffer = b; s.connect(g); g.connect(bus); g.gain.value = vol;
    if (nome === "nav") navSrc = { g: g, t: performance.now() };
    else if (navSrc && performance.now() - navSrc.t < 350) { try { navSrc.g.gain.cancelScheduledValues(t); navSrc.g.gain.setValueAtTime(navSrc.g.gain.value, t); navSrc.g.gain.linearRampToValueAtTime(0, t + .03); } catch (e) {} navSrc = null; }   // um só efeito por acção
    if (nome === "confirm") { g.gain.setValueAtTime(vol, t + 1.3); g.gain.linearRampToValueAtTime(0, t + 1.9); s.start(t, 0, 1.9); }   // a cauda longa do 05 corta-se com fade
    else s.start(t);
    s.onended = function () { try { g.disconnect(); } catch (e) {} };
  };
  last = agora; lastNome = nome; if (nome === "nav") lastNav = agora;
  if (c.state === "running") tocar(); else c.resume().then(tocar).catch(function () {});
  return true;
}

/* ---------- classificação dos elementos ---------- */
var INTERACTIVO = "button,.btn,.team,a[href],[role=button],[role=menuitem],[role=tab],.g94-card,.g94-tab,.pw-card,.pw-step,.chip,.seg button,label.opt,summary";
var SILENCIO = ".match .topbar,.touch,.tbtns,#stage canvas,#cv,.skip,[data-nosfx]";
function alvo(e) {
  var t = e.target && e.target.closest ? e.target.closest(INTERACTIVO) : null;
  if (!t || t.disabled || t.getAttribute("aria-disabled") === "true" || t.closest(SILENCIO)) return null;
  return t;
}
var RE_VOLTAR = /^\s*(voltar|menu|cancelar|fechar|manter|agora não|não|abandonar|sair|deixar)/i;
var RE_CONFIRMAR = /(entrar em campo|jogar já|guardar|começar|aceitar|criar conta|^\s*entrar\s*$|jogar outra vez|continuar época|recomeçar|confirmar|iniciar|procurar adversário|^\s*sim\b|ver classificação)/i;
function classe(t) {
  var txt = (t.textContent || "").replace(/\s+/g, " ").trim(), id = t.id || "";
  if (t.matches(".back,.c94-voltar,.brand-home,[data-close],.pop-close") || /Back$/.test(id) || t.getAttribute("aria-label") === "Fechar" || RE_VOLTAR.test(txt) && !t.matches(".g94-tab,.g94-card,.pw-card,.team")) return "back";
  if (/^(qGo|pwSkip|clGuardar|rAgain|rGo|oProcurar|cEntrar|cCriar|cupNext|cupContinue)$/.test(id) || t.matches(".c94-btn.pri") || (t.matches(".btn:not(.ghost),.pop button,#ov button") && RE_CONFIRMAR.test(txt))) return "confirm";
  if (t.matches("[data-go],[data-aba],.g94-tab,.pw-step,[role=tab],[data-les],[data-tut],.g94-ic")) return "open";
  return "select";
}

/* ---------- rato: clique e passar por cima ---------- */
document.addEventListener("click", function (e) {
  if (!e.isTrusted || !menuActivo()) return;      // só cliques reais (o menu novo também aciona botões escondidos por programa)
  var t = alvo(e); if (!t) return;
  play(classe(t));
}, true);
document.addEventListener("pointerover", function (e) {
  if (e.pointerType !== "mouse" || !menuActivo()) return;
  var t = alvo(e); if (!t || t === lastHover) return;
  lastHover = t; if (t.closest("#ov") === null && document.getElementById("match") && !(typeof G !== "undefined" && G && G.paused)) return;
  play("nav");
}, true);
document.addEventListener("pointerout", function (e) { if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest(INTERACTIVO)) lastHover = null; }, true);

/* ---------- teclado e comando: só quando o foco muda por navegação ---------- */
addEventListener("keydown", function (e) { if (/^(Arrow|Tab)/.test(e.code)) lastInput = performance.now(); }, true);
document.addEventListener("focusin", function (e) {
  if (!menuActivo()) return;
  var viaTeclado = performance.now() - lastInput < 400 || performance.now() - (window.__navInput || 0) < 400;
  if (!viaTeclado) return;
  var t = e.target && e.target.closest ? e.target.closest(INTERACTIVO) : null;
  if (!t || t.closest(SILENCIO)) return;
  play("nav");
}, true);

/* ---------- pop-ups (abrir / fechar) ---------- */
function ligarPop() {
  if (typeof Pop === "undefined" || Pop.__menuSfx) return; Pop.__menuSfx = true;
  var po = Pop.open; Pop.open = function (o) { var r = po.apply(this, arguments); if (!(o && o.kind === "celebrate")) play("open"); return r; };
  /* fechar: Esc, fundo, botão ou programa — todos retiram a classe pop-open do <html> */
  var aberto = document.documentElement.classList.contains("pop-open");
  new MutationObserver(function () { var ag = document.documentElement.classList.contains("pop-open"); if (aberto && !ag && !(["select", "confirm", "back"].indexOf(lastNome) >= 0 && performance.now() - last < 900)) play("back", { force: true }); aberto = ag; }).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
}
ligarPop();

/* ---------- transição entre ecrãs (só se nenhum som de clique acabou de tocar) ---------- */
function assinatura(n) { var h = n.querySelector && n.querySelector("h1,h2"); return (n.className || "") + "|" + (h ? h.textContent.trim().slice(0, 30) : ""); }
if (window.MutationObserver) new MutationObserver(function (ms) {
  if (document.documentElement.classList.contains("booting")) return;
  for (var i = 0; i < ms.length; i++) for (var j = 0; j < ms[i].addedNodes.length; j++) {
    var n = ms[i].addedNodes[j]; if (n.nodeType !== 1 || !/^(SECTION|DIV)$/.test(n.tagName) || !/(screen|match|c94-root)/.test(n.className || "")) continue;
    var sig = assinatura(n); if (sig === lastSig) return; lastSig = sig;
    if (n.classList.contains("match")) return;       // entrar em campo: já tocou a confirmação
    setTimeout(function () { play("transition"); }, 40); return;
  }
}).observe(document.getElementById("app"), { childList: true });

/* ---------- opções: interruptor e volume dos sons dos menus ---------- */
function opcoes(painel) {
  if (!painel || painel.querySelector(".aud-menu")) return;
  var l = document.createElement("label"); l.className = "aud-row aud-menu";
  l.innerHTML = '<span>Sons dos menus</span><input type="checkbox" ' + (ligado() ? "checked" : "") + ' style="width:28px;height:28px;justify-self:start"><b>' + (ligado() ? "Ligado" : "Desligado") + '</b>';
  var ck = l.querySelector("input"), tx = l.querySelector("b");
  ck.addEventListener("change", function () { PREF.uiSfx = ck.checked; tx.textContent = ck.checked ? "Ligado" : "Desligado"; savePrefs(); if (ck.checked) play("select", { force: true }); });
  var v = document.createElement("label"); v.className = "aud-row aud-menu";
  v.innerHTML = '<span>Volume dos menus</span><input type="range" min="0" max="100" step="5" value="' + Math.round(nv("uiVol", 1) * 100) + '"><b>' + Math.round(nv("uiVol", 1) * 100) + '%</b>';
  var r = v.querySelector("input"), out = v.querySelector("b"), tmr = 0;
  r.addEventListener("input", function () { PREF.uiVol = r.value / 100; out.textContent = r.value + "%"; savePrefs(); clearTimeout(tmr); tmr = setTimeout(function () { play("select", { force: true }); }, 150); });
  var ref = painel.querySelector(".note"); if (ref) { painel.insertBefore(l, ref); painel.insertBefore(v, ref); } else { painel.appendChild(l); painel.appendChild(v); }
}
window.MenuSfx = { play: play, options: opcoes, enabled: ligado, activo: menuActivo };
})();
