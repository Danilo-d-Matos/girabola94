/* ===== Girabola 94: menu "Clube" =====
   O jogador escolhe o clube com que joga (jogo rápido, época, taça…), define formação e tática, escolhe os 6 titulares,
   dá nomes aos jogadores e cria equipamentos. Tudo fica guardado neste dispositivo e, com conta, na conta.
   Aplica-se só quando o jogador joga com esse clube; o resto do jogo não muda. */
(function () {
"use strict";
var KC = "girabola94.clube";
var PADROES = [[0, "Liso"], [1, "Riscas verticais"], [2, "Laterais e centro"], [3, "Faixa horizontal"], [4, "Faixas diagonais"], [5, "Faixas diagonais largas"], [6, "Riscas finas"], [7, "Riscas suaves"]];
var TAB = "equipa", SEL = 0, KITSEL = "home";

function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function ler() { try { var c = JSON.parse(localStorage.getItem(KC) || "null"); if (c && typeof c === "object") return c; } catch (e) {} return { team: null, kitUse: "home", names: {}, lineup: {}, kits: {}, u: 0 }; }
var CL = ler();
function guardar() {
  CL.u = Date.now();
  try { localStorage.setItem(KC, JSON.stringify(CL)); } catch (e) {}
  if (window.G94 && window.G94.empurrarLogo) window.G94.empurrarLogo();
}
function recarregar() { CL = ler(); }
function equipa() { return CL.team != null && TEAMS[CL.team] ? TEAMS[CL.team] : null; }
function plantel() { var t = equipa(); return t ? (SQUADS[t.n] || []) : []; }
function nomeDe(a) { return (CL.names && CL.names[a.id]) || a.name; }

/* ---------- escalação ---------- */
function escalacaoPadrao(form) {
  var roster = plantel(), usados = {}, ids = [];
  FORMS[form].p.forEach(function (s) {
    var pool = roster.filter(function (a) { return a.role === s[0] && !usados[a.id]; });
    var a = pool.filter(function (x) { return x.num === s[3]; })[0] || pool[0] || roster.filter(function (x) { return !usados[x.id]; })[0];
    usados[a.id] = 1; ids.push(a.id);
  });
  return ids;
}
function escalacaoValida(ids, form) {
  var roster = plantel(), seen = {};
  if (!ids || ids.length !== FORMS[form].p.length) return false;
  return ids.every(function (id, i) {
    var a = roster.filter(function (x) { return x.id === id; })[0];
    if (!a || seen[id]) return false; seen[id] = 1;
    return i === 0 ? a.role === "GK" : a.role !== "GK";
  });
}
function escalacao(form) { var l = CL.lineup && CL.lineup[form]; return escalacaoValida(l, form) ? l : escalacaoPadrao(form); }

/* ---------- equipamentos ---------- */
function oficial(t) {
  var b = typeof KIT_LOOKS !== "undefined" && KIT_LOOKS[t.s];
  return b ? { shirt: b.shirt, accent: b.accent, shorts: b.shorts, socks: b.socks, pattern: b.pattern | 0, custom: false }
           : { shirt: t.c1, accent: t.c2, shorts: t.c2, socks: t.c1, pattern: 0, custom: false };
}
function alternativo(t) { return { shirt: t.c2 === "#151515" || t.c2 === "#1c1c1c" ? "#f2f2f2" : t.c2, accent: t.c1, shorts: t.c1, socks: t.c2, pattern: 0, custom: true }; }
function kit(qual) {
  var t = equipa(), k = CL.kits && CL.kits[qual];
  if (k) return k;
  return qual === "home" ? oficial(t) : alternativo(t);
}
function kitSvg(k, w) {
  var id = "kp" + Math.random().toString(36).slice(2, 7), c = k.accent, p = "";
  switch (k.pattern | 0) {
    case 1: for (var i = 0; i < 8; i += 2) p += '<rect x="' + (20 + i * 7) + '" y="20" width="7" height="46" fill="' + c + '"/>'; break;
    case 2: p = '<rect x="20" y="20" width="10" height="46" fill="' + c + '"/><rect x="70" y="20" width="10" height="46" fill="' + c + '"/><rect x="43" y="20" width="14" height="46" fill="' + c + '"/>'; break;
    case 3: p = '<rect x="20" y="36" width="60" height="12" fill="' + c + '"/>'; break;
    case 4: p = '<polygon points="20,20 34,20 52,66 38,66" fill="' + c + '"/><polygon points="80,20 66,20 48,66 62,66" fill="' + c + '"/>'; break;
    case 5: p = '<polygon points="20,24 36,20 56,66 38,66" fill="' + c + '"/><polygon points="80,24 64,20 44,66 62,66" fill="' + c + '"/>'; break;
    case 6: [24, 36, 48, 60, 72].forEach(function (x) { p += '<rect x="' + x + '" y="20" width="2.4" height="46" fill="' + c + '"/>'; }); break;
    case 7: p = '<g opacity=".5">' + [22, 32, 42, 52, 62, 72].map(function (x) { return '<rect x="' + x + '" y="20" width="5" height="46" fill="' + c + '"/>'; }).join("") + '</g>'; break;
  }
  var body = "M20,20 L38,12 Q50,22 62,12 L80,20 L94,34 L84,44 L80,40 L80,66 L20,66 L20,40 L16,44 L6,34 Z";
  return '<svg viewBox="0 0 100 130" width="' + w + '" aria-hidden="true"><defs><clipPath id="' + id + '"><path d="' + body + '"/></clipPath></defs>' +
    '<path d="' + body + '" fill="' + k.shirt + '"/><g clip-path="url(#' + id + ')">' + p + '</g>' +
    '<path d="M38,12 Q50,22 62,12" fill="none" stroke="' + k.accent + '" stroke-width="3"/>' +
    '<rect x="24" y="68" width="52" height="24" rx="3" fill="' + k.shorts + '"/>' +
    '<rect x="28" y="94" width="16" height="30" rx="3" fill="' + k.socks + '"/><rect x="56" y="94" width="16" height="30" rx="3" fill="' + k.socks + '"/></svg>';
}

/* ---------- ecrã ---------- */
function cabecalho() {
  var t = equipa(), ix = CL.team;
  return '<button class="back" id="clBack">' + BACK + 'Menu</button>' +
    '<div class="g94-clhead"><div>' + (t ? crest(ix, 64) : '') + '</div><div><p class="eyebrow">O meu clube</p><h2>' + (t ? esc(t.n) : 'Escolhe o teu clube') + '</h2>' +
    (t ? '<p class="note" style="margin:0">Força ' + t.r + ' · ' + STYLES[t.st].n + '. Este clube vem pré-selecionado em jogo rápido, época e taça; podes sempre escolher outro.</p>' : '<p class="note">O clube escolhido fica como predefinição para os teus jogos.</p>') + '</div>' +
    (t ? '<button class="btn ghost" id="clMudar">Mudar de clube</button>' : '') + '</div>';
}
function escolherClube() {
  leaveMatch();
  app.innerHTML = '<section class="screen g94-screen">' + cabecalho() + '<div class="grid">' + TEAMS.map(function (t, i) {
    return '<button class="team" data-i="' + i + '">' + crest(i, 64) + '<div style="min-width:0"><b>' + t.n + '</b><span>Força ' + t.r + ' · ' + STYLES[t.st].n + '</span></div></button>';
  }).join("") + '</div></section>';
  document.getElementById("clBack").onclick = function () { CL.team != null ? mostrar() : showMenu(); };
  app.querySelectorAll(".team").forEach(function (b) {
    b.onclick = function () {
      var i = +b.dataset.i;
      if (CL.team !== i) { CL.team = i; CL.names = {}; CL.lineup = {}; CL.kits = {}; CL.kitUse = "home"; SEL = 0; }
      guardar(); TAB = "equipa"; mostrar();
    };
  });
  window.scrollTo(0, 0);
}
function abas() {
  return '<div class="g94-abas" role="tablist">' + [["equipa", "Equipa e formação"], ["plantel", "Plantel e nomes"], ["kit", "Equipamentos"], ["tatica", "Tática"]].map(function (a) {
    return '<button type="button" role="tab" class="g94-aba" data-aba="' + a[0] + '" aria-selected="' + (TAB === a[0]) + '">' + a[1] + '</button>';
  }).join("") + '</div>';
}

function vistaEquipa() {
  var f = PREF.form, ids = escalacao(f), roster = plantel(), por = {};
  roster.forEach(function (a) { por[a.id] = a; });
  var slots = FORMS[f].p.map(function (s, i) {
    var a = por[ids[i]];
    return '<button type="button" class="g94-slot' + (i === SEL ? ' sel' : '') + '" data-slot="' + i + '" style="left:' + (6 + s[1] * 128) + '%;top:' + (s[2] * 100) + '%"><b>' + a.num + '</b><span>' + esc(nomeDe(a)) + '</span><small>' + s[0] + '</small></button>';
  }).join("");
  var role = FORMS[f].p[SEL][0], cand = roster.filter(function (a) { return SEL === 0 ? a.role === "GK" : a.role !== "GK"; })
    .sort(function (a, b) { return (b.role === role) - (a.role === role) || a.num - b.num; });
  var lista = cand.map(function (a) {
    var titular = ids.indexOf(a.id) >= 0;
    return '<button type="button" class="g94-pl' + (ids[SEL] === a.id ? ' sel' : '') + '" data-pl="' + a.id + '"><b>' + a.num + '</b><span>' + esc(nomeDe(a)) + '</span><small>' + a.role + (titular ? ' · titular' : '') + '</small></button>';
  }).join("");
  return '<div class="g94-eq"><div><p class="panel-title">Formação</p><div class="grid g94-forms">' + Object.keys(FORMS).map(function (k) {
      return '<button type="button" class="team" data-form="' + k + '" aria-pressed="' + (PREF.form === k) + '"><div style="min-width:0"><b>' + FORMS[k].n + '</b><span>' + FORMS[k].d + '</span></div></button>';
    }).join("") + '</div><div class="g94-campo" aria-label="Campo: toca numa posição para escolher o jogador">' + slots + '</div>' +
    '<div class="row"><button class="btn ghost" id="clAuto">Escalação automática</button></div></div>' +
    '<div><p class="panel-title">Posição ' + FORMS[f].p[SEL][0] + ' · escolhe o jogador</p><div class="g94-lista">' + lista + '</div></div></div>' +
    '<p class="note">A escalação vale para a formação escolhida. Os jogadores mantêm a sua posição natural (D, M, F); o guarda-redes tem de ser guarda-redes.</p>';
}
function vistaPlantel() {
  var f = PREF.form, ids = escalacao(f);
  var grupos = [["GK", "Guarda-redes"], ["D", "Defesas"], ["M", "Médios"], ["F", "Avançados"]];
  return grupos.map(function (g) {
    var l = plantel().filter(function (a) { return a.role === g[0]; });
    return l.length ? '<p class="panel-title">' + g[1] + '</p><div class="g94-nomes">' + l.map(function (a) {
      return '<label class="g94-nome-l"><b>' + a.num + '</b><input type="text" maxlength="18" data-nome="' + a.id + '" value="' + esc(nomeDe(a)) + '" aria-label="Nome do jogador ' + a.num + '"><small>' + (ids.indexOf(a.id) >= 0 ? 'titular' : '') + '</small></label>';
    }).join("") + '</div>' : '';
  }).join("") + '<div class="row"><button class="btn ghost" id="clNomesRepor">Repor nomes originais</button></div><p class="note">Os nomes que alteras aparecem no jogo, no plantel e nas substituições. Para escolher quem joga, usa o separador "Equipa e formação".</p>';
}
function vistaKit() {
  var k = kit(KITSEL), t = equipa();
  function cor(id, rot, v) { return '<label class="g94-cor">' + rot + '<input type="color" id="' + id + '" value="' + v + '"></label>'; }
  return '<div class="g94-kits"><div class="g94-prev">' + kitSvg(k, 150) + '<p class="note">' + (k.custom ? 'Equipamento criado por ti' : 'Equipamento oficial') + '</p></div><div>' +
    '<div class="seg" role="group"><button type="button" data-kq="home" aria-pressed="' + (KITSEL === "home") + '">Principal</button><button type="button" data-kq="away" aria-pressed="' + (KITSEL === "away") + '">Alternativo</button></div>' +
    '<div class="g94-cores">' + cor("kShirt", "Camisola", k.shirt) + cor("kAcc", "Detalhes", k.accent) + cor("kShorts", "Calções", k.shorts) + cor("kSocks", "Meias", k.socks) + '</div>' +
    '<label class="g94-cor" style="margin-top:8px">Padrão da camisola<select id="kPat">' + PADROES.map(function (p) { return '<option value="' + p[0] + '"' + (p[0] === (k.pattern | 0) ? ' selected' : '') + '>' + p[1] + '</option>'; }).join("") + '</select></label>' +
    '<p class="panel-title" style="margin-top:12px">Equipamento a usar nos jogos</p><div class="seg" role="group"><button type="button" data-ku="home" aria-pressed="' + ((CL.kitUse || "home") === "home") + '">Principal</button><button type="button" data-ku="away" aria-pressed="' + (CL.kitUse === "away") + '">Alternativo</button></div>' +
    '<div class="row"><button class="btn ghost" id="kRepor">Repor ' + (KITSEL === "home" ? "o oficial" : "o alternativo") + '</button></div>' +
    '<p class="note">No campo 3D a camisola, os calções e as meias levam as cores que escolheres. O padrão aparece na pré-visualização e nos modelos simples; nos jogadores 3D a camisola fica lisa. Se a tua camisola for parecida com a do adversário, ele muda de cores.</p></div></div>';
}
function vistaTatica() {
  return '<p class="panel-title">Tática</p><div class="grid g94-forms">' + Object.keys(TACTICS).map(function (k) {
    return '<button type="button" class="team" data-tac="' + k + '" aria-pressed="' + (PREF.tactic === k) + '"><div style="min-width:0"><b>' + TACTICS[k].n + '</b><span>' + TACTICS[k].d + '</span></div></button>';
  }).join("") + '</div><p class="panel-title" style="margin-top:12px">Dificuldade</p><div class="grid g94-forms">' + Object.keys(DIFF).map(function (k) {
    return '<button type="button" class="team" data-dif="' + k + '" aria-pressed="' + (PREF.diff === k) + '"><div style="min-width:0"><b>' + DIFF[k].n + '</b></div></button>';
  }).join("") + '</div><p class="note">A formação escolhe-se no separador "Equipa e formação". Tática, formação e dificuldade são as mesmas que aparecem antes de cada jogo; aqui ficam como predefinição.</p>';
}

function mostrar() {
  if (!equipa()) { escolherClube(); return; }
  leaveMatch();
  app.innerHTML = '<section class="screen g94-screen">' + cabecalho() + abas() + '<div class="panel g94-corpo" id="clCorpo">' + ({ equipa: vistaEquipa, plantel: vistaPlantel, kit: vistaKit, tatica: vistaTatica }[TAB])() + '</div></section>';
  ligar();
  window.scrollTo(0, 0);
}
function ligar() {
  var $ = function (s) { return app.querySelectorAll(s); };
  document.getElementById("clBack").onclick = function () { showMenu(); };
  var m = document.getElementById("clMudar"); if (m) m.onclick = escolherClube;
  $(".g94-aba").forEach(function (b) { b.onclick = function () { TAB = b.dataset.aba; mostrar(); }; });
  $("[data-form]").forEach(function (b) { b.onclick = function () { PREF.form = b.dataset.form; savePrefs(); SEL = 0; guardar(); mostrar(); }; });
  $("[data-tac]").forEach(function (b) { b.onclick = function () { PREF.tactic = b.dataset.tac; savePrefs(); guardar(); mostrar(); }; });
  $("[data-dif]").forEach(function (b) { b.onclick = function () { PREF.diff = b.dataset.dif; savePrefs(); guardar(); mostrar(); }; });
  $("[data-slot]").forEach(function (b) { b.onclick = function () { SEL = +b.dataset.slot; mostrar(); }; });
  $("[data-pl]").forEach(function (b) {
    b.onclick = function () {
      var f = PREF.form, ids = escalacao(f).slice(), id = +b.dataset.pl, j = ids.indexOf(id), antigo = ids[SEL];
      if (j >= 0 && j !== SEL) ids[j] = antigo;           // já era titular noutra posição: trocam
      ids[SEL] = id; CL.lineup = CL.lineup || {}; CL.lineup[f] = ids; guardar(); mostrar();
    };
  });
  var au = document.getElementById("clAuto"); if (au) au.onclick = function () { if (CL.lineup) delete CL.lineup[PREF.form]; guardar(); mostrar(); };
  $("[data-nome]").forEach(function (i) {
    i.onchange = function () {
      var v = i.value.replace(/\s+/g, " ").trim().slice(0, 18); CL.names = CL.names || {};
      if (v) CL.names[i.dataset.nome] = v; else delete CL.names[i.dataset.nome];
      guardar(); i.value = nomeDe(plantel().filter(function (a) { return a.id === +i.dataset.nome; })[0]);
    };
  });
  var nr = document.getElementById("clNomesRepor"); if (nr) nr.onclick = function () { CL.names = {}; guardar(); mostrar(); };
  $("[data-kq]").forEach(function (b) { b.onclick = function () { KITSEL = b.dataset.kq; mostrar(); }; });
  $("[data-ku]").forEach(function (b) { b.onclick = function () { CL.kitUse = b.dataset.ku; guardar(); mostrar(); }; });
  if (document.getElementById("kShirt")) {
    var edita = function () {
      var k = { shirt: document.getElementById("kShirt").value, accent: document.getElementById("kAcc").value, shorts: document.getElementById("kShorts").value, socks: document.getElementById("kSocks").value, pattern: +document.getElementById("kPat").value, custom: true };
      CL.kits = CL.kits || {}; CL.kits[KITSEL] = k; guardar(); mostrar();
    };
    ["kShirt", "kAcc", "kShorts", "kSocks", "kPat"].forEach(function (id) { document.getElementById(id).onchange = edita; });
    document.getElementById("kRepor").onclick = function () { if (CL.kits) delete CL.kits[KITSEL]; guardar(); mostrar(); };
  }
}

/* ---------- aplicação nos jogos ---------- */
var _cm = createMatch;
createMatch = function (o) {
  var g = _cm.apply(this, arguments);
  try { aplicar(g, o); } catch (e) { console.warn("clube:", e); }
  return g;
};
function aplicar(g, o) {
  if (CL.team == null || o.L !== CL.team || o.mode === "tutorial" || o.online) return;
  var form = FORMS[o.form] ? o.form : "221", ids = escalacao(form), roster = plantel(), t = TEAMS[o.L];
  g.players.forEach(function (p) {
    if (p.team !== 0) return;
    var a = roster.filter(function (x) { return x.id === ids[p.i]; })[0];
    if (a) assignIdentity(p, a);
    if (CL.names && CL.names[p.rosterId]) p.name = CL.names[p.rosterId];
  });
  var k = kit(CL.kitUse === "away" ? "away" : "home");
  if (!k.custom) return;
  var tR = TEAMS[o.R], cR = { c1: tR.c1, c2: tR.c2 };
  if (colorDist(k.shirt, cR.c1) < 120) cR = { c1: tR.c2, c2: tR.c1 };
  if (colorDist(k.shirt, cR.c1) < 120) cR = { c1: "#f2f2f2", c2: tR.c1 };
  g.cols = [{ c1: k.shirt, c2: k.accent }, cR];
  var base = typeof KIT_LOOKS !== "undefined" && KIT_LOOKS[tR.s];
  g.kits = [
    { shirt: k.shirt, accent: k.accent, shorts: k.shorts, socks: k.socks, sleeve: k.shirt, trim: k.accent, pattern: k.pattern | 0, custom: true },
    base && cR.c1 === tR.c1 ? { shirt: base.shirt, accent: base.accent, shorts: base.shorts, socks: base.socks, sleeve: base.sleeve, trim: base.trim, pattern: base.pattern | 0 }
      : { shirt: cR.c1, accent: cR.c2, shorts: cR.c2, socks: cR.c1, sleeve: cR.c1, trim: cR.c2, pattern: 0 }
  ];
}

/* clube predefinido nos ecrãs de escolha de equipa */
function destacar(seletor, atributo, acao, rotulo) {
  var t = equipa(); if (!t) return;
  var b = app.querySelector("[" + atributo + '="' + CL.team + '"]'); if (b) b.classList.add("g94-meu");
  var alvo = document.getElementById("confirm") || app.querySelector(".screen");
  if (!alvo || !b) return;
  var d = document.createElement("div"); d.className = "g94-usar";
  d.innerHTML = crest(CL.team, 40) + '<span>O teu clube: <b>' + esc(t.n) + '</b></span><button class="btn" type="button">' + rotulo + '</button>';
  d.querySelector("button").onclick = function () { b.click(); };
  alvo.insertBefore(d, alvo.firstChild);
}
var _sp = showPick;
showPick = function (mode) { var r = _sp.apply(this, arguments); try { if (mode === "season" || mode === "quick1") destacar(".team", "data-i", null, mode === "season" ? "Começar com este clube" : "Jogar com este clube"); } catch (e) {} return r; };
var _sc = showCup;
showCup = function () { var r = _sc.apply(this, arguments); try { destacar(".team", "data-cup", null, "Começar a taça com este clube"); } catch (e) {} return r; };

window.G94 = Object.assign(window.G94 || {}, { showClube: mostrar, clubeRecarregar: recarregar, clube: function () { return CL; } });
})();
