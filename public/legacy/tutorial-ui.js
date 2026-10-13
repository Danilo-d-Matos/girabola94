/* ===== Tutoriais: menu por categorias, painel do exercício, progresso e resumo =====
   Só muda a apresentação e a navegação. As lições (LESSONS), os exercícios (TUT) e as condições de sucesso
   continuam a ser os de game.js; os controlos mostrados vêm de tk() (as teclas reais, incluindo as que o jogador alterou). */
(function () {
"use strict";
var KEY = "girabola.tut.v1";
function prog() { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
function gravar(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} }
function marcar(i) { var p = prog(); p[i] = 1; gravar(p); }
function feitos(les) { var p = prog(); return les.steps.filter(function (i) { return p[i]; }).length; }
var $ = function (id) { return document.getElementById(id); };

/* controlos relevantes de cada exercício (nomes das teclas vêm de tk()) */
var CHIPS = {
  "Mover": ["move"], "Sprint": ["move", "sprint"], "Passe": ["move", "pass"], "Passe em profundidade": ["sprint+pass"],
  "Trocar de jogador": ["switch"], "Desarme": ["move", "tackle"], "Remate carregado": ["shoot"], "Remate colocado": ["move", "shoot"],
  "Canto": ["shoot", "pass"], "Lançamento lateral": ["move", "pass"], "Livre direto": ["move", "shoot"], "Penálti": ["move", "shoot"], "Fora de jogo": ["move", "pass"]
};
var ROT = { move: "Mover", sprint: "Sprint", pass: "Passe", shoot: "Remate", tackle: "Desarme", "switch": "Trocar" };
function chip(c, k) {
  if (c.indexOf("+") > 0) { var p = c.split("+"); return '<span class="tu-chip"><kbd>' + k[p[0]] + '</kbd>+<kbd>' + k[p[1]] + '</kbd><em>Profundidade</em></span>'; }
  return '<span class="tu-chip"><kbd>' + k[c] + '</kbd><em>' + ROT[c] + '</em></span>';
}
function chipsDe(les) {
  var k = tk(), vistos = {}, out = [];
  les.steps.forEach(function (i) { (CHIPS[TUT[i].t] || []).forEach(function (c) { if (!vistos[c]) { vistos[c] = 1; out.push(chip(c, k)); } }); });
  return out.join("");
}

/* ---------------- CSS ---------------- */
var css = document.createElement("style");
css.id = "tutorial-ui-css";
css.textContent = [
".tu-screen{--tu-azul:#1077AD;--tu-fundo:#071C32;--tu-ouro:#D4AF37;gap:8px;padding-top:10px;padding-bottom:10px}",
".tu-screen .tu{flex:1}.tu-in{padding:14px 16px;gap:8px}.tu-in h2{font-size:clamp(26px,5vh,44px)}.tu-in .tu-grid{gap:6px}.tu-card{padding:8px 10px}",
".tu{display:grid;grid-template-columns:230px minmax(0,1fr);gap:14px;min-height:0}",
".tu-side{display:flex;flex-direction:column;gap:4px;background:#071C32ee;border:1px solid #1d4a6a;border-radius:12px;padding:10px}",
".tu-n{display:flex;align-items:center;gap:10px;text-align:left;background:transparent;border:0;border-radius:8px;color:#c9d7e4;padding:10px 12px;font:600 16px 'Rajdhani',system-ui,sans-serif;cursor:pointer;letter-spacing:.02em}",
".tu-n:hover{background:#1077AD33;color:#fff}.tu-n.on{background:#D4AF37;color:#071C32}",
".tu-n small{margin-left:auto;font:600 12px system-ui;opacity:.85}",
".tu-n .ok{color:#7df2a6}.tu-n.on .ok{color:#071C32}",
".tu-main{position:relative;border:1px solid #1d4a6a;border-radius:12px;overflow:hidden;background:#071C32;min-height:300px;display:flex;flex-direction:column}",
".tu-bg{position:absolute;inset:0;background:linear-gradient(90deg,#071C32 0,#071C32dd 38%,#071C3255 100%),var(--bg) center/cover;opacity:1}",
".tu-in{position:relative;padding:22px;display:flex;flex-direction:column;gap:12px;flex:1}",
".tu-in h2{font:800 clamp(30px,5vw,48px)/1 'Rajdhani',system-ui,sans-serif;text-transform:uppercase;margin:0;color:#fff;letter-spacing:.01em}",
".tu-in .ouro{color:#D4AF37;font:700 15px 'Rajdhani',system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase}",
".tu-in p{margin:0;max-width:520px;color:#c9d7e4}",
".tu-stats{display:flex;gap:18px;background:#071C32cc;border:1px solid #1d4a6a;border-radius:10px;padding:10px 14px;width:max-content}",
".tu-stats b{font:800 26px 'Rajdhani',system-ui;color:#D4AF37;margin-right:6px}",
".tu-obj{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:5px;max-width:700px;background:#071C32d0;border:1px solid #1d4a6a;border-radius:10px;padding:10px}",
".tu-obj h4{grid-column:1/-1;margin:0;font:700 13px system-ui;letter-spacing:.14em;color:#D4AF37;text-transform:uppercase}",
".tu-obj button{display:flex;align-items:center;gap:10px;background:#1077AD22;border:1px solid transparent;border-radius:8px;color:#fff;padding:5px 8px;text-align:left;font:600 14px system-ui;cursor:pointer}",
".tu-obj button:hover{border-color:#1077AD;background:#1077AD44}.tu-obj button i{font-style:normal;color:#7df2a6;width:16px}",
".tu-chips{display:flex;flex-wrap:wrap;gap:8px}",
".tu-chip{display:inline-flex;align-items:center;gap:8px;background:#071C32cc;border:1px solid #1d4a6a;border-radius:8px;padding:6px 10px;color:#fff}",
".tu-chip kbd{background:#e8eef4;color:#071C32;border-radius:5px;padding:2px 8px;font:800 14px system-ui;min-width:26px;text-align:center}",
".tu-chip em{font-style:normal;color:#c9d7e4;font-size:14px}",
".tu-go{align-self:flex-start;background:#D4AF37;color:#071C32;border:0;border-radius:8px;padding:12px 24px;font:800 18px 'Rajdhani',system-ui;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}",
".tu-go:hover{filter:brightness(1.08)}",
".tu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}",
".tu-card{text-align:left;background:#071C32dd;border:1px solid #1d4a6a;border-radius:10px;padding:12px;color:#fff;cursor:pointer;display:flex;flex-direction:column;gap:4px}",
".tu-card:hover,.tu-card.feat{border-color:#D4AF37}.tu-card b{font:800 20px 'Rajdhani',system-ui;text-transform:uppercase}",
".tu-card span{font-size:13px;color:#c9d7e4}.tu-card .k{color:#D4AF37;font:700 12px system-ui;letter-spacing:.1em;text-transform:uppercase}",
"@media(max-width:760px){.tu{grid-template-columns:1fr}.tu-side{flex-direction:row;overflow-x:auto}.tu-n{white-space:nowrap}.tu-n small{display:none}}",
/* painel do exercício, por cima do campo */
".tutbox.tu2{left:12px;top:10px;transform:none;width:min(380px,calc(100% - 24px));background:#071C32f0;border:1px solid #1d4a6a;border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:8px;max-height:calc(100% - 20px);overflow:auto}",
".tu2 .tb-h{display:flex;align-items:center;gap:10px;font:700 12px system-ui;letter-spacing:.12em;text-transform:uppercase;color:#9fb4c4}",
".tu2 .tb-h b{color:#D4AF37}.tu2 .tb-cnt{margin-left:auto;color:#fff;font-size:13px}",
".tu2 .tb-t{margin:0;font:800 28px/1 'Rajdhani',system-ui;text-transform:uppercase;color:#fff}",
".tu2 .tb-d{margin:0;font-size:14px;color:#dbe6ef;line-height:1.35}",
".tu2 .tb-l{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:3px}",
".tu2 .tb-l li{display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:6px;color:#9fb4c4;font-size:13px;cursor:pointer}",
".tu2 .tb-l li:hover{background:#1077AD33}.tu2 .tb-l li.cur{background:#D4AF37;color:#071C32;font-weight:700}",
".tu2 .tb-l li i{font-style:normal;width:14px;color:#7df2a6}.tu2 .tb-l li.cur i{color:#071C32}",
".tu2 .tb-st{font:700 13px system-ui;color:#9fb4c4}.tu2 .tb-st.ok{color:#7df2a6}",
".tu2 .tb-b{display:flex;flex-wrap:wrap;gap:6px}.tu2 .tb-b button{background:#1077AD33;border:1px solid #1d4a6a;color:#fff;border-radius:7px;padding:6px 10px;font:600 13px system-ui;cursor:pointer}",
".tu2 .tb-b button:hover{background:#1077AD66}.tu2 .tb-b button:disabled{opacity:.4;cursor:default}",
".tu2 .tu-chip{padding:4px 8px}.tu2 .tu-chip kbd{font-size:12px;padding:1px 6px}.tu2 .tu-chip em{font-size:12px}",
"@media(max-height:560px){.tu2 .tb-l,.tu2 .tb-d{display:none}}"
].join("\n");
document.head.appendChild(css);

/* ---------------- menu ---------------- */
var iconeOk = '<span class="ok">✔</span>';
function showTutMenuNovo(sel) {
  leaveMatch();
  sel = sel || "all";
  var p = prog(), total = LESSONS.filter(function (l) { return l.id !== "all"; }).length;
  var lista = LESSONS.map(function (l) {
    var f = feitos(l), ok = f === l.steps.length;
    return '<button type="button" class="tu-n' + (l.id === sel ? " on" : "") + '" data-les="' + l.id + '">' + (ok ? iconeOk : "") + l.n + '<small>' + f + '/' + l.steps.length + '</small></button>';
  }).join("");
  var les = LESSONS.find(function (l) { return l.id === sel; }) || LESSONS[0];
  var todos = TUT.length;
  var det;
  if (sel === "home") {
    det = '<span class="ouro">Tutorial</span><h2>Escolhe o que<br>queres treinar</h2><p>Cada lição é independente. Podes repetir qualquer uma e mudar de lição a meio.</p>' +
      '<div class="tu-stats"><span><b>' + todos + '</b>exercícios</span><span><b>' + total + '</b>categorias</span></div>' +
      '<div class="tu-grid">' + LESSONS.map(function (l) { var f = feitos(l); return '<button type="button" class="tu-card' + (l.id === "all" ? " feat" : "") + '" data-les="' + l.id + '"><span class="k">' + l.steps.length + ' ' + (l.steps.length > 1 ? "exercícios" : "exercício") + (f ? ' · ' + f + ' feitos' : '') + '</span><b>' + l.n + '</b><span>' + l.d + '</span></button>'; }).join("") + '</div>';
  } else {
    det = '<span class="ouro">Tutorial › ' + les.n + '</span><h2>' + les.n + '</h2><p>' + les.d + '</p><button class="tu-go" id="tuGo" type="button">Iniciar treino</button>' +
      '<div class="tu-obj"><h4>Objetivos</h4>' + les.steps.map(function (i, j) { return '<button type="button" data-ex="' + j + '"><i>' + (p[i] ? "✔" : "○") + '</i>' + TUT[i].t + '</button>'; }).join("") + '</div>' +
      '<div class="tu-chips">' + chipsDe(les) + '</div>';
  }
  app.innerHTML = '<section class="screen tu-screen"><button class="back" id="tmBack">' + BACK + 'Menu</button><div class="tu">' +
    '<nav class="tu-side"><button type="button" class="tu-n' + (sel === "home" ? " on" : "") + '" data-les="home">Início</button>' + lista + '</nav>' +
    '<div class="tu-main"><div class="tu-bg" style="--bg:url(modelos/miniaturas/imbondeiro_night.jpg)"></div><div class="tu-in">' + det + '</div></div></div></section>';
  on("tmBack", showMenu);
  app.querySelectorAll("[data-les]").forEach(function (b) { b.onclick = function () { try { sfx("ui"); } catch (e) {} showTutMenuNovo(b.dataset.les); }; });
  var go = $("tuGo");
  if (go) go.onclick = function () { ac(); beginTutorial(les); };
  app.querySelectorAll("[data-ex]").forEach(function (b) { b.onclick = function () { ac(); beginTutorial(les); if (+b.dataset.ex) tutGo(+b.dataset.ex); }; });
  window.scrollTo(0, 0);
}
showTutMenu = function () { showTutMenuNovo("all"); };
startTutorial = function () { showTutMenu(); };

/* ---------------- painel do exercício ---------------- */
renderTutBox = function () {
  var box = $("tutBox"); if (!box) return;
  var T = G.tut, i = T.step, s = tutStepDef(i), p = prog(), k = tk(), n = T.list.length;
  box.className = "tutbox tu2";
  box.innerHTML = '<div class="tb-h"><span>Tutorial › <b>' + T.lesson.n + '</b></span><span class="tb-cnt">' + (i + 1) + '/' + n + '</span></div>' +
    '<h3 class="tb-t">' + s.t + '</h3><p class="tb-d">' + s.d(k) + '</p>' +
    (n > 1 ? '<ul class="tb-l">' + T.list.map(function (si, j) { return '<li data-j="' + j + '" class="' + (j === i ? "cur" : "") + '"><i>' + (p[si] ? "✔" : (j === i ? "▶" : "○")) + '</i>' + TUT[si].t + '</li>'; }).join("") + '</ul>' : '') +
    '<div class="tu-chips">' + (CHIPS[s.t] || []).map(function (c) { return chip(c, k); }).join("") + '</div>' +
    '<div class="tb-st" id="tbSt">A aguardar a tua ação…</div>' +
    '<div class="tb-b"><button id="tPrev"' + (i === 0 ? " disabled" : "") + '>‹ Anterior</button><button id="tRe">Repetir</button><button id="tNext"' + (i >= n - 1 ? " disabled" : "") + '>Próximo ›</button><button id="tPause">Pausa</button><button id="tLes">Lições</button><button id="tSkip">Sair</button></div>';
  box.querySelectorAll("button").forEach(function (b) { b.tabIndex = -1; b.onmousedown = function (e) { e.preventDefault(); }; });   // o teclado do jogo (Espaço, X…) não aciona botões
  $("tPrev").onclick = function () { if (T.step > 0) tutGo(T.step - 1); };
  $("tRe").onclick = function () { tutGo(T.step); };
  $("tNext").onclick = function () { if (T.step < n - 1) tutGo(T.step + 1); };
  $("tPause").onclick = function () { if (canPause()) setPause(true); };
  $("tLes").onclick = function () { leaveMatch(); showTutMenuNovo(T.lesson.id); };
  $("tSkip").onclick = function () { PREF.tutorialSeen = true; savePrefs(); quitMatch(); };
  box.querySelectorAll("[data-j]").forEach(function (li) { li.onclick = function () { tutGo(+li.dataset.j); }; });
};
var _tutStep = tutStep;
tutStep = function () {
  var T = G.tut, antes = T.done;
  _tutStep.apply(this, arguments);
  if (T.done && !antes) {
    marcar(T.list[T.step]);
    var st = $("tbSt"); if (st) { st.textContent = "✔ Conseguido!"; st.className = "tb-st ok"; }
    var li = document.querySelector('#tutBox [data-j="' + T.step + '"] i'); if (li) li.textContent = "✔";
  } else if (!T.done && T.retry > .3) {
    var st2 = $("tbSt"); if (st2 && st2.className.indexOf("ok") < 0) st2.textContent = "Não resultou. A repetir o exercício…";
  }
};

/* ---------------- fim da lição ---------------- */
tutFinish = function () {
  PREF.tutorialSeen = true; savePrefs(); G.ended = true; G.paused = true;
  var les = G.tut.lesson, p = prog();
  var idx = LESSONS.findIndex(function (l) { return l.id === les.id; }), prox = LESSONS[idx + 1] && les.id !== "all" ? LESSONS[idx + 1] : null;
  showOverlay('<div class="card"><p class="eyebrow">Lição concluída</p><h2>' + les.n + '</h2>' +
    '<ul style="list-style:none;padding:0;margin:8px 0;display:grid;gap:4px;text-align:left">' + les.steps.map(function (i) { return '<li><span style="color:#7df2a6">' + (p[i] ? "✔" : "○") + '</span> ' + TUT[i].t + '</li>'; }).join("") + '</ul>' +
    '<div class="row">' + (prox ? '<button class="btn" id="tNext2">Próxima: ' + prox.n + '</button>' : '') + '<button class="btn ' + (prox ? "ghost" : "") + '" id="tMore">Outras lições</button><button class="btn ghost" id="tAgain">Repetir esta lição</button><button class="btn ghost" id="tQuick">Jogo rápido</button><button class="btn ghost" id="tMenu">Menu</button></div></div>');
  var sair = function () { cancelAnimationFrame(raf); ambientStop(); stop3D(); G = null; canvas = null; };
  if (prox) $("tNext2").onclick = function () { sair(); beginTutorial(prox); };
  $("tMore").onclick = function () { sair(); showTutMenuNovo(les.id); };
  $("tAgain").onclick = function () { sair(); beginTutorial(les); };
  $("tQuick").onclick = function () { sair(); showPick("quick1"); };
  $("tMenu").onclick = function () { sair(); showMenu(); };
};
})();
