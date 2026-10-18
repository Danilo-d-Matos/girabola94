/* ===== Girabola 94: gestão do clube (Equipa e formação · Plantel e nomes · Equipamentos · Tática) =====
   Trabalha sobre uma cópia (rascunho) e só grava ao carregar em "Guardar alterações".
   Aplica-se só quando o jogador joga com o seu clube; o resto do jogo não muda. */
(function () {
"use strict";
var KC = "girabola94.clube";
var _css = document.createElement("link"); _css.rel = "stylesheet"; _css.href = "ui/clube94.css"; document.head.appendChild(_css);
var PADROES = [[0, "Liso"], [1, "Riscas verticais"], [8, "Riscas largas"], [6, "Riscas finas"], [9, "Listras horizontais"], [3, "Faixa horizontal"], [10, "Banda diagonal"], [11, "Meio a meio"], [2, "Laterais e centro"], [4, "Diagonais"], [5, "Diagonais largas"], [7, "Riscas suaves"], [12, "Xadrez"]];
var POS = { GK: "GR", D: "DEF", M: "MÉD", F: "AVA" }, POSN = { GK: "Guarda-redes", D: "Defesas", M: "Médios", F: "Avançados" }, ORDEM = ["GK", "D", "M", "F"];
var TAB = "equipa", SEL = 0, FIL = "all", BUSCA = "", KITSEL = "home", PREVNUM = null, D = null, BASE = "", MSG = "", CENA = null;

function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function ler() { try { var c = JSON.parse(localStorage.getItem(KC) || "null"); if (c && typeof c === "object") return c; } catch (e) {} return { team: null, kitUse: "home", names: {}, nums: {}, lineup: {}, kits: {}, u: 0 }; }
var CL = ler();
function gravar() {
  CL.u = Date.now();
  try { localStorage.setItem(KC, JSON.stringify(CL)); } catch (e) {}
  if (window.G94 && window.G94.empurrarLogo) window.G94.empurrarLogo();
}
function recarregar() {
  CL = ler();
  if (CL.form && FORMS[CL.form]) PREF.form = CL.form;
  if (CL.tactic && TACTICS[CL.tactic]) PREF.tactic = CL.tactic;
  try { savePrefs(); } catch (e) {}
}
function equipa() { return CL.team != null && TEAMS[CL.team] ? TEAMS[CL.team] : null; }
function plantel() { var t = equipa(); return t ? (SQUADS[t.n] || []) : []; }
function nomeD(a) { return (D.names && D.names[a.id]) || a.name; }
function numD(a) { return (D.nums && D.nums[a.id]) || a.num; }
function porId(id) { return plantel().filter(function (a) { return a.id === id; })[0]; }

/* ---------- rascunho ---------- */
function abrirRascunho() {
  D = clone(CL); D.names = D.names || {}; D.nums = D.nums || {}; D.lineup = D.lineup || {}; D.kits = D.kits || {};
  D.form = FORMS[PREF.form] ? PREF.form : "221"; D.tactic = TACTICS[PREF.tactic] ? PREF.tactic : "bal"; D.diff = PREF.diff;
  D.kitUse = D.kitUse || "home"; D.tac = D.tac || null;
  BASE = JSON.stringify(D); MSG = "";
}
function sujo() { return JSON.stringify(D) !== BASE; }
function numerosRepetidos() {
  var vistos = {}, rep = {};
  plantel().forEach(function (a) { var n = numD(a); if (vistos[n]) rep[n] = 1; vistos[n] = 1; });
  return rep;
}
function numeroInvalido(a) { var n = numD(a); return !(n >= 1 && n <= 99 && Math.floor(n) === n); }
function erros() {
  var e = [], rep = numerosRepetidos();
  if (Object.keys(rep).length) e.push("Há números de camisola repetidos: " + Object.keys(rep).join(", ") + ".");
  if (plantel().some(numeroInvalido)) e.push("Os números têm de estar entre 1 e 99.");
  return e;
}
function guardar() {
  if (erros().length) return false;
  CL.names = D.names; CL.nums = D.nums; CL.lineup = D.lineup; CL.kits = D.kits; CL.kitUse = D.kitUse; CL.tac = D.tac;
  CL.form = D.form; CL.tactic = D.tactic; PREF.form = D.form; PREF.tactic = D.tactic; PREF.diff = D.diff;
  try { savePrefs(); } catch (e) {}
  gravar(); BASE = JSON.stringify(D); MSG = "Alterações guardadas."; return true;
}

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
function escalacao(form, fonte) { var l = fonte.lineup && fonte.lineup[form]; return escalacaoValida(l, form) ? l : escalacaoPadrao(form); }

/* ---------- equipamentos ---------- */
function oficial(t) {
  var b = typeof KIT_LOOKS !== "undefined" && KIT_LOOKS[t.s];
  return b ? { shirt: b.shirt, accent: b.accent, shorts: b.shorts, socks: b.socks, pattern: b.pattern | 0, custom: false }
           : { shirt: t.c1, accent: t.c2, shorts: t.c2, socks: t.c1, pattern: 0, custom: false };
}
/* equipamentos alternativos de todos os clubes (criados para o jogo; não são equipamentos reais): camisola, detalhes, calções, meias, padrão */
var ALT = {
  PET: ["#1643b9", "#ffd51e", "#1643b9", "#1643b9", 3], "1AG": ["#f5f5f0", "#cf1f27", "#151515", "#f5f5f0", 3], SAG: ["#f5f5f0", "#168347", "#168347", "#168347", 8],
  WIL: ["#ffdc15", "#16833e", "#16833e", "#ffdc15", 10], KAB: ["#de2428", "#f5f5f0", "#f5f5f0", "#de2428", 3], INT: ["#245cc4", "#151515", "#151515", "#245cc4", 1],
  HUI: ["#f5f5f0", "#df2528", "#df2528", "#f5f5f0", 4], SSA: ["#f5f5f0", "#df2428", "#df2428", "#f5f5f0", 10], BRA: ["#2359bc", "#f5f5f1", "#f5f5f1", "#2359bc", 9],
  LIB: ["#2455bb", "#f5781c", "#2455bb", "#f5781c", 3], ACA: ["#b29450", "#181818", "#181818", "#b29450", 6], CAA: ["#255ec5", "#f5f5f2", "#255ec5", "#f5f5f2", 5],
  "1MA": ["#f5f5f2", "#d82227", "#d82227", "#f5f5f2", 2], LSU: ["#65bde5", "#f5f5f2", "#f5f5f2", "#65bde5", 8], CAB: ["#245bbb", "#f5f5f2", "#245bbb", "#f5f5f2", 7],
  FCL: ["#2357b9", "#f5f5f2", "#2357b9", "#2357b9", 3]
};
function alternativo(t) {
  var a = ALT[t.s];
  return a ? { shirt: a[0], accent: a[1], shorts: a[2], socks: a[3], pattern: a[4], custom: true }
           : { shirt: t.c2, accent: t.c1, shorts: t.c1, socks: t.c2, pattern: 0, custom: true };
}
/* equipamento de qualquer clube: o do utilizador usa o que ele configurou; os outros usam o oficial e o alternativo de origem */
function kitPara(idx, qual) {
  if (CL.team === idx) return kitDe(CL, qual === "away" ? "away" : "home");
  var t = TEAMS[idx]; return qual === "away" ? alternativo(t) : oficial(t);
}
function kitPadrao(idx) { return CL.team === idx && CL.kitUse === "away" ? "away" : "home"; }
function kitInfo(idx, qual) {
  var k = kitPara(idx, qual);
  return CL.team === idx && k.custom && qual === "home" ? "Equipamento criado por ti" : qual === "home" ? "Equipamento oficial" : (CL.team === idx && CL.kits && CL.kits.away ? "Alternativo criado por ti" : "Alternativo do clube");
}
function paraJogo(k, t) {
  if (!k.custom) { var b = typeof KIT_LOOKS !== "undefined" && KIT_LOOKS[t.s]; if (b) return { shirt: b.shirt, accent: b.accent, shorts: b.shorts, socks: b.socks, sleeve: b.sleeve, trim: b.trim, pattern: b.pattern | 0 }; }
  return { shirt: k.shirt, accent: k.accent, shorts: k.shorts, socks: k.socks, sleeve: k.shirt, trim: k.accent, pattern: k.pattern | 0, custom: !!k.custom };
}
function kitDe(fonte, qual) { var t = equipa(), k = fonte.kits && fonte.kits[qual]; return k || (qual === "home" ? oficial(t) : alternativo(t)); }
function kitEmUso(fonte) { return kitDe(fonte, fonte.kitUse === "away" ? "away" : "home"); }
function kitSvg(k, w) {
  var id = "kp" + Math.random().toString(36).slice(2, 7), c = k.accent, p = "", X0 = 20, Y0 = 20, W = 60, H = 46;
  var poly = function (pts) { return '<polygon fill="' + c + '" points="' + pts.map(function (q) { return (X0 + q[0] * W) + "," + (Y0 + q[1] * H); }).join(" ") + '"/>'; };
  var rc = function (x, y, w2, h2, o) { return '<rect x="' + (X0 + x * W) + '" y="' + (Y0 + y * H) + '" width="' + (w2 * W) + '" height="' + (h2 * H) + '" fill="' + c + '"' + (o ? ' opacity="' + o + '"' : '') + '/>'; };
  switch (k.pattern | 0) {
    case 1: for (var i = 0; i < 8; i += 2) p += rc(i / 8, 0, 1 / 8, 1); break;
    case 2: p = rc(0, 0, .16, 1) + rc(.84, 0, .16, 1) + rc(.42, 0, .16, 1); break;
    case 3: p = rc(0, .4, 1, .2); break;
    case 4: p = poly([[0, 0], [.24, 0], [.72, 1], [.48, 1]]) + poly([[1, 0], [.76, 0], [.28, 1], [.52, 1]]); break;
    case 5: p = poly([[0, 0], [.42, 0], [.92, 1], [.5, 1]]) + poly([[1, 0], [.58, 0], [.08, 1], [.5, 1]]); break;
    case 6: for (i = 0; i < 9; i++) p += rc(.08 + i * .105, 0, .022, 1); break;
    case 7: for (i = 0; i < 9; i++) p += rc(.02 + i * .115, 0, .055, 1, .5); break;
    case 8: for (i = 0; i < 4; i += 2) p += rc(i / 4, 0, 1 / 4, 1); break;
    case 9: for (i = 0; i < 8; i += 2) p += rc(0, i / 8, 1, 1 / 8); break;
    case 10: p = poly([[0, 0], [.34, 0], [1, 1], [.66, 1]]); break;
    case 11: p = rc(.5, 0, .5, 1); break;
    case 12: for (i = 0; i < 6; i++) for (var j = 0; j < 6; j++) if ((i + j) % 2) p += rc(i / 6, j / 6, 1 / 6, 1 / 6); break;
  }
  var body = "M20,20 L38,12 Q50,22 62,12 L80,20 L94,34 L84,44 L80,40 L80,66 L20,66 L20,40 L16,44 L6,34 Z";
  return '<svg viewBox="0 0 100 130" width="' + w + '" aria-hidden="true"><defs><clipPath id="' + id + '"><path d="' + body + '"/></clipPath></defs>' +
    '<path d="' + body + '" fill="' + k.shirt + '"/><g clip-path="url(#' + id + ')">' + p + '</g><path d="M38,12 Q50,22 62,12" fill="none" stroke="' + k.accent + '" stroke-width="3"/>' +
    '<rect x="24" y="68" width="52" height="24" rx="3" fill="' + k.shorts + '"/><rect x="28" y="94" width="16" height="30" rx="3" fill="' + k.socks + '"/><rect x="56" y="94" width="16" height="30" rx="3" fill="' + k.socks + '"/></svg>';
}

/* ---------- peças de interface ---------- */
var LINHAS = '<g fill="none" stroke="rgba(255,255,255,.75)" stroke-width=".35"><rect x=".5" y=".5" width="104" height="67"/><line x1="52.5" y1=".5" x2="52.5" y2="67.5"/><circle cx="52.5" cy="34" r="9.15"/><rect x=".5" y="13.85" width="16.5" height="40.3"/><rect x=".5" y="24.85" width="5.5" height="18.3"/><rect x="88" y="13.85" width="16.5" height="40.3"/><rect x="99" y="24.85" width="5.5" height="18.3"/></g>';
function slotsHTML(form, fonte, opc) {
  var ids = escalacao(form, fonte);
  return FORMS[form].p.map(function (s, i) {
    var a = porId(ids[i]);
    return '<button type="button" class="c94-slot' + (opc.sel && i === SEL ? ' sel' : '') + '" ' + (opc.ro ? 'tabindex="-1" disabled ' : 'data-slot="' + i + '" ') + 'data-i="' + i + '" style="left:' + (s[1] * 100) + '%;top:' + (s[2] * 100) + '%"><i>' + numD(a) + '</i><span>' + esc(nomeD(a)) + '</span><small>' + POS[s[0]] + '</small></button>';
  }).join("");
}
function campo2D(form, fonte, opc) {      // alternativa quando o modelo 3D não está disponível
  return '<div class="c94-campo"><svg viewBox="0 0 105 68" preserveAspectRatio="none" aria-hidden="true"><rect width="105" height="68" fill="#2a7a37"/>' +
    [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) { return '<rect x="' + (i * 13.125) + '" width="13.125" height="68" fill="' + (i % 2 ? '#2d8139' : '#27753a') + '"/>'; }).join("") + LINHAS + '</svg>' + slotsHTML(form, fonte, opc) + '</div>';
}
function miniFormacao(k) {
  return '<svg viewBox="0 0 100 60" width="70" aria-hidden="true"><rect width="100" height="60" rx="4" fill="#1b5e2c"/>' + FORMS[k].p.map(function (s) { return '<circle cx="' + Math.min(94, 6 + s[1] * 130) + '" cy="' + (6 + s[2] * 48) + '" r="4" fill="#fff"/>'; }).join("") + '</svg>';
}
function cabecalho() {
  var t = equipa(), ix = CL.team;
  return '<header class="c94-head"><button class="c94-voltar" id="clBack" aria-label="Voltar ao menu">' + BACK + '<span>Menu</span></button>' +
    '<div class="c94-id">' + crest(ix, 52) + '<div><p>O meu clube</p><h2>' + esc(t.n) + '</h2><small>Força ' + t.r + ' · ' + STYLES[t.st].n + '</small></div></div>' +
    '<nav class="c94-abas" role="tablist">' + [["equipa", "Equipa e formação"], ["plantel", "Plantel e nomes"], ["kit", "Equipamentos"], ["tatica", "Tática"]].map(function (a) {
      return '<button type="button" role="tab" data-aba="' + a[0] + '" aria-selected="' + (TAB === a[0]) + '">' + a[1] + '</button>'; }).join("") + '</nav>' +
    '<button class="c94-btn sec" id="clMudar">Mudar de clube</button></header>';
}
function barra(esq) {
  var er = erros(), s = sujo();
  return '<footer class="c94-barra"><div class="c94-esq" id="barEsq">' + esq + '</div><div class="c94-dir"><span class="c94-msg' + (er.length ? ' erro' : '') + '" role="status">' + esc(er[0] || (s ? "Alterações por guardar." : MSG)) + '</span>' +
    '<button class="c94-btn sec" id="clRepor">Repor predefinições</button><button class="c94-btn pri" id="clGuardar"' + (!s || er.length ? ' disabled' : '') + '>Guardar alterações</button></div></footer>';
}
function chips() {
  return '<div class="c94-chips" id="chips">' + [["all", "Todos"], ["GK", "GR"], ["D", "DEF"], ["M", "MÉD"], ["F", "AVA"]].map(function (f) {
    return '<button type="button" data-fil="' + f[0] + '" aria-pressed="' + (FIL === f[0]) + '">' + f[1] + '</button>'; }).join("") + '</div>';
}

/* ---------- 1. equipa e formação ---------- */
function listaEquipaHTML() {
  var f = D.form, ids = escalacao(f, D);
  return plantel().filter(function (a) { return FIL === "all" || a.role === FIL; })
    .sort(function (a, b) { return ORDEM.indexOf(a.role) - ORDEM.indexOf(b.role) || numD(a) - numD(b); })
    .map(function (a) {
      var elegivel = SEL === 0 ? a.role === "GK" : a.role !== "GK", i = ids.indexOf(a.id);
      return '<button type="button" class="c94-pl r' + a.role + (i === SEL ? ' sel' : '') + '" data-pl="' + a.id + '"' + (elegivel ? '' : ' disabled') + '><b>' + numD(a) + '</b><span>' + esc(nomeD(a)) + '</span><em>' + POS[a.role] + '</em><small>' + (!elegivel ? 'Indisponível nesta posição' : i >= 0 ? 'Titular' : 'Suplente') + '</small></button>';
    }).join("");
}
function barraEsqEquipa() {
  var f = D.form;
  return '<label class="c94-sel">Formação<select id="clFormaSel">' + Object.keys(FORMS).map(function (k) { return '<option value="' + k + '"' + (k === f ? ' selected' : '') + '>' + FORMS[k].n + '</option>'; }).join("") + '</select></label>' +
    '<span class="c94-rot">Táticas rápidas</span>' + Object.keys(TACTICS).map(function (k) { return '<button type="button" class="c94-btn sec peq" data-tac="' + k + '" aria-pressed="' + (D.tactic === k) + '">' + TACTICS[k].n + '</button>'; }).join("");
}
function vistaEquipa() {
  var f = D.form;
  var corpo = '<div class="c94-duas"><section class="c94-painel"><div class="c94-ph"><h3>Formação</h3><span id="eqDica">' + FORMS[f].n + ' · toca numa posição para escolher o jogador</span></div>' +
    '<div class="c94-formas" id="formas">' + Object.keys(FORMS).map(function (k) { return '<button type="button" data-form="' + k + '" aria-pressed="' + (f === k) + '">' + miniFormacao(k) + '<div><b>' + FORMS[k].n + '</b><small>' + FORMS[k].d + '</small></div></button>'; }).join("") + '</div>' +
    '<div class="c94-campoWrap" id="campoWrap"><div class="c94-3d" id="cenaBox"><canvas id="cenaCanvas" aria-label="Relvado 3D com a formação"></canvas><div class="c94-labels" id="cenaLabels"></div><div class="c94-pvmsg" id="cenaMsg"></div></div></div></section>' +
    '<section class="c94-painel"><div class="c94-ph"><h3>Plantel disponível</h3><span id="eqPos">Posição seleccionada: ' + POS[FORMS[f].p[SEL][0]] + '</span></div>' + chips() + '<div class="c94-scroll"><div class="c94-grid2" id="eqLista">' + listaEquipaHTML() + '</div></div></section></div>';
  return [corpo, barraEsqEquipa()];
}
function refrescarEquipa() {
  var f = D.form, $ = function (i) { return document.getElementById(i); };
  if ($("eqLista")) $("eqLista").innerHTML = listaEquipaHTML();
  if ($("eqPos")) $("eqPos").textContent = "Posição seleccionada: " + POS[FORMS[f].p[SEL][0]];
  if ($("eqDica")) $("eqDica").textContent = FORMS[f].n + " · toca numa posição para escolher o jogador";
  document.querySelectorAll("#formas [data-form]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.form === f)); });
  document.querySelectorAll("#chips [data-fil]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.fil === FIL)); });
  var e = $("barEsq"); if (e) e.innerHTML = barraEsqEquipa();
  ligarBarraEsq();
  if (CENA) CENA.atualizar();
  barraEstado();
}

/* ---------- 2. plantel e nomes ---------- */
function cartoesHTML() {
  var ids = escalacao(D.form, D), rep = numerosRepetidos(), q = BUSCA.trim().toLowerCase();
  var l = plantel().filter(function (a) { return (FIL === "all" || a.role === FIL) && (!q || nomeD(a).toLowerCase().indexOf(q) >= 0 || String(numD(a)) === q); })
    .sort(function (a, b) { return ORDEM.indexOf(a.role) - ORDEM.indexOf(b.role) || numD(a) - numD(b); });
  if (!l.length) return '<p class="c94-vazio">Nenhum jogador corresponde à pesquisa.</p>';
  return l.map(function (a) {
    var mau = rep[numD(a)] || numeroInvalido(a), tit = ids.indexOf(a.id) >= 0, alt = D.names[a.id] || D.nums[a.id];
    return '<div class="c94-cartao r' + a.role + (tit ? ' tit' : '') + '"><div class="c94-c1"><input class="c94-nome" type="text" maxlength="18" data-nome="' + a.id + '" value="' + esc(nomeD(a)) + '" aria-label="Nome do jogador ' + numD(a) + '"><em class="c94-pos r' + a.role + '">' + POS[a.role] + '</em></div>' +
      '<div class="c94-c2"><label class="c94-numl">Nº<input class="c94-num' + (mau ? ' mau' : '') + '" type="number" min="1" max="99" data-num="' + a.id + '" value="' + numD(a) + '" aria-label="Número de ' + esc(nomeD(a)) + '"></label><span class="c94-est' + (tit ? ' tit' : '') + '">' + (tit ? 'Titular' : 'Suplente') + '</span>' + (alt ? '<small>alterado</small>' : '') + '</div></div>';
  }).join("");
}
function ladoPlantel() {
  var c = { all: plantel().length, GK: 0, D: 0, M: 0, F: 0 }; plantel().forEach(function (a) { c[a.role]++; });
  return [["all", "Todos"], ["GK", "Guarda-redes"], ["D", "Defesas"], ["M", "Médios"], ["F", "Avançados"]].map(function (f) {
    return '<button type="button" data-fil="' + f[0] + '" aria-pressed="' + (FIL === f[0]) + '">' + f[1] + ' <b>' + c[f[0]] + '</b></button>';
  }).join("");
}
function vistaPlantel() {
  var roster = plantel(), cont = { GK: 0, D: 0, M: 0, F: 0 }; roster.forEach(function (a) { cont[a.role]++; });
  var corpo = '<section class="c94-painel full"><div class="c94-resumo"><div class="c94-total"><b>' + roster.length + '</b><span>Jogadores inscritos</span></div>' +
    '<div class="c94-conts">' + ORDEM.map(function (r) { return '<span class="r' + r + '"><b>' + cont[r] + '</b>' + POS[r] + '</span>'; }).join("") + '</div>' +
    '<input type="search" id="clBusca" class="c94-busca" placeholder="Pesquisar por nome ou número" value="' + esc(BUSCA) + '" aria-label="Pesquisar jogadores">' +
    '<button class="c94-btn sec peq" id="plExp">Exportar plantel</button><button class="c94-btn sec peq" id="plImp">Importar plantel</button><input type="file" id="plFile" accept="application/json,.json" hidden></div>' +
    '<div class="c94-plcorpo"><aside class="c94-lado" id="plLado">' + ladoPlantel() + '</aside><div class="c94-grelha" id="plGrelha">' + cartoesHTML() + '</div></div></section>';
  return [corpo, '<span class="c94-rot">Edita o nome e o número directamente no cartão. Não há fotografias nem classificações nos dados do plantel.</span>'];
}
function refrescarPlantel() {
  var g = document.getElementById("plGrelha"); if (g) g.innerHTML = cartoesHTML();
  var l = document.getElementById("plLado"); if (l) l.innerHTML = ladoPlantel();
  barraEstado();
}

/* ---------- 3. equipamentos ---------- */
function swatches(id, atual) {
  var t = equipa(), base = ["#ffffff", "#151515", t.c1, t.c2, "#d7263d", "#1d4e9e", "#f4c20d", "#1f8a4c"];
  var uniq = base.filter(function (c, i) { return base.indexOf(c) === i; });
  return '<div class="c94-sw" data-for="' + id + '">' + uniq.map(function (c) { return '<button type="button" class="c94-cor' + (c.toLowerCase() === String(atual).toLowerCase() ? ' sel' : '') + '" style="background:' + c + '" data-c="' + c + '" aria-label="Cor ' + c + '"></button>'; }).join("") +
    '<input type="color" id="' + id + '" value="' + atual + '" aria-label="Escolher outra cor"></div>';
}
function padroesHTML(k) {
  return '<div class="c94-pats" id="kPats">' + PADROES.map(function (p) {
    var kk = { shirt: k.shirt, accent: k.accent, shorts: k.shorts, socks: k.socks, pattern: p[0] };
    return '<button type="button" data-pat="' + p[0] + '" aria-pressed="' + (p[0] === (k.pattern | 0)) + '" title="' + p[1] + '">' + kitSvg(kk, 44) + '<span>' + p[1] + '</span></button>';
  }).join("") + '</div>';
}
function vistaKit() {
  var k = kitDe(D, KITSEL), roster = plantel();
  if (PREVNUM == null || !porId(PREVNUM)) PREVNUM = (roster.filter(function (a) { return a.num === 10; })[0] || roster[0]).id;
  var corpo = '<div class="c94-duas kitv"><section class="c94-painel"><div class="c94-ph"><h3>Pré-visualização</h3><span id="pvEstado">' + (k.custom ? 'Equipamento personalizado' : 'Equipamento oficial') + '</span></div>' +
    '<div class="c94-pv c94-3d" id="pvBox"><canvas id="pvCanvas" aria-label="Pré-visualização 3D do jogador"></canvas><div class="c94-pvmsg" id="pvMsg"></div></div>' +
    '<div class="c94-pvctl"><button type="button" class="c94-btn sec peq" id="pvF">Frente</button><button type="button" class="c94-btn sec peq" id="pvC">Costas</button><button type="button" class="c94-btn sec peq" id="pvR">Rodar</button>' +
    '<label class="c94-sel">Número<select id="pvNum">' + roster.map(function (a) { return '<option value="' + a.id + '"' + (a.id === PREVNUM ? ' selected' : '') + '>' + numD(a) + ' · ' + esc(nomeD(a)) + '</option>'; }).join("") + '</select></label></div></section>' +
    '<section class="c94-painel"><div class="c94-ph"><h3>Personalização</h3><div class="c94-seg" role="group"><button type="button" data-kq="home" aria-pressed="' + (KITSEL === "home") + '">Principal</button><button type="button" data-kq="away" aria-pressed="' + (KITSEL === "away") + '">Alternativo</button></div></div>' +
    '<div class="c94-kitacoes"><button type="button" class="c94-btn sec peq" id="kOrig">' + (KITSEL === "home" ? "Voltar ao equipamento oficial" : "Voltar ao alternativo original") + '</button><span>' + (D.kits[KITSEL] ? "Alteraste este equipamento." : (KITSEL === "home" ? "Estás a usar o oficial." : "Estás a usar o alternativo original do clube.")) + '</span></div>' +
    '<div class="c94-scroll c94-kitcor"><div class="c94-cores4"><div><h4 class="c94-gr">Camisola</h4>' + swatches("kShirt", k.shirt) + '</div><div><h4 class="c94-gr">Detalhes / padrão</h4>' + swatches("kAcc", k.accent) + '</div><div><h4 class="c94-gr">Calções</h4>' + swatches("kShorts", k.shorts) + '</div><div><h4 class="c94-gr">Meias</h4>' + swatches("kSocks", k.socks) + '</div></div>' +
    '<h4 class="c94-gr">Padrão da camisola</h4>' + padroesHTML(k) +
    '<p class="c94-nota">As cores e o padrão aplicam-se à camisola 3D e aos modelos simples. A cor de "Detalhes / padrão" é a das riscas e faixas.</p></div></section></div>';
  var esq = '<span class="c94-rot">Usar nos jogos</span><div class="c94-seg" role="group"><button type="button" data-ku="home" aria-pressed="' + (D.kitUse === "home") + '">' + kitSvg(kitDe(D, "home"), 22) + 'Principal</button><button type="button" data-ku="away" aria-pressed="' + (D.kitUse === "away") + '">' + kitSvg(kitDe(D, "away"), 22) + 'Alternativo</button></div>';
  return [corpo, esq];
}

/* ---------- 4. tática ---------- */
function valoresTac() {
  var b = TACTICS[D.tactic] || TACTICS.bal, c = D.tac;
  return { line: c ? c.line : b.line, support: c ? c.support : b.support, pressao: c ? c.pressao : Math.max(0, Math.min(1, (b.pdist + 60) / 140)) };
}
function vistaTatica() {
  var v = valoresTac(), f = D.form;
  var estilos = Object.keys(TACTICS).map(function (k) { return '<button type="button" class="c94-estilo" data-tac="' + k + '" aria-pressed="' + (D.tactic === k) + '"><b>' + TACTICS[k].n + '</b><span>' + TACTICS[k].d + '</span></button>'; }).join("");
  function sl(id, rot, min, max, step, val, txt) { return '<label class="c94-sl"><span>' + rot + '</span><input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '"><em>' + txt + '</em></label>'; }
  var corpo = '<div class="c94-tres"><section class="c94-painel"><div class="c94-ph"><h3>Sistema tático</h3><span>Formação base</span></div><div class="c94-formas col">' + Object.keys(FORMS).map(function (k) {
      return '<button type="button" data-form="' + k + '" aria-pressed="' + (f === k) + '">' + miniFormacao(k) + '<div><b>' + FORMS[k].n + '</b><small>' + FORMS[k].d + '</small></div></button>'; }).join("") + '</div></section>' +
    '<section class="c94-painel"><div class="c94-ph"><h3>Formação atual <b class="ouro">' + FORMS[f].n + '</b></h3></div><div class="c94-campoWrap" id="campoWrap"><div class="c94-3d" id="cenaBox"><canvas id="cenaCanvas" aria-label="Relvado 3D com a formação"></canvas><div class="c94-labels" id="cenaLabels"></div><div class="c94-pvmsg" id="cenaMsg"></div></div></div></section>' +
    '<section class="c94-painel"><div class="c94-ph"><h3>Estilo de jogo</h3></div><div class="c94-estilos">' + estilos + '</div>' +
    '<h4 class="c94-gr">Ajustes (têm efeito real no jogo)</h4>' +
    sl("tLinha", "Altura da linha", -12, 12, 1, Math.round(v.line * 100), (v.line >= 0 ? "+" : "") + Math.round(v.line * 100)) +
    sl("tApoio", "Apoio ao portador", -8, 10, 1, Math.round(v.support * 100), (v.support >= 0 ? "+" : "") + Math.round(v.support * 100)) +
    sl("tPress", "Pressão", 0, 100, 1, Math.round(v.pressao * 100), Math.round(v.pressao * 100) + "%") +
    '<p class="c94-nota">Estes três ajustes alteram a equipa que controlas durante o jogo. Ritmo, largura e posse não existem no motor para a tua equipa, por isso não aparecem.</p></section></div>';
  var esq = '<span class="c94-rot">Dificuldade do adversário</span>' + Object.keys(DIFF).map(function (k) { return '<button type="button" class="c94-btn sec peq" data-dif="' + k + '" aria-pressed="' + (D.diff === k) + '">' + DIFF[k].n + '</button>'; }).join("");
  return [corpo, esq];
}

/* ---------- escolha do clube ---------- */
function escolherClube() {
  cenaParar(); leaveMatch();
  app.innerHTML = '<section class="screen g94-screen c94-root"><div class="c94-escolha"><button class="c94-voltar" id="clBack">' + BACK + '<span>' + (CL.team != null ? "Voltar" : "Menu") + '</span></button><h2>Escolhe o teu clube</h2>' +
    '<div class="c94-gridclubes">' + TEAMS.map(function (t, i) { return '<button class="team" data-i="' + i + '">' + crest(i, 56) + '<div style="min-width:0"><b>' + t.n + '</b><span>Força ' + t.r + ' · ' + STYLES[t.st].n + '</span></div></button>'; }).join("") + '</div></div></section>';
  document.getElementById("clBack").onclick = function () { CL.team != null ? mostrar() : showMenu(); };
  app.querySelectorAll(".team").forEach(function (b) {
    b.onclick = function () {
      var i = +b.dataset.i;
      if (CL.team !== i) { CL.team = i; CL.names = {}; CL.nums = {}; CL.lineup = {}; CL.kits = {}; CL.kitUse = "home"; CL.tac = null; SEL = 0; PREVNUM = null; }
      gravar(); abrirRascunho(); TAB = "equipa"; mostrar();
    };
  });
}
function mostrar() {
  if (!equipa()) { escolherClube(); return; }
  cenaParar(); leaveMatch();
  if (!D) abrirRascunho();
  var v = { equipa: vistaEquipa, plantel: vistaPlantel, kit: vistaKit, tatica: vistaTatica }[TAB]();
  app.innerHTML = '<section class="screen g94-screen c94-root">' + cabecalho() + '<main class="c94-main">' + v[0] + '</main>' + barra(v[1]) + '</section>';
  ligar();
  if (TAB === "kit") cenaJogador(); else if (TAB === "equipa" || TAB === "tatica") cenaCampo(TAB === "equipa");
}
function sair() {
  if (sujo() && !confirm("Tens alterações por guardar. Sair e descartar?")) return;
  cenaParar(); D = null; showMenu();
}
function ligarBarraEsq() {
  var $ = function (s) { return document.querySelectorAll(s); }, bar = document.getElementById("barEsq"); if (!bar) return;
  var fs = document.getElementById("clFormaSel"); if (fs) fs.onchange = function () { D.form = fs.value; SEL = 0; refrescarEquipa(); };
  bar.querySelectorAll("[data-tac]").forEach(function (b) { b.onclick = function () { D.tactic = b.dataset.tac; D.tac = null; refrescarEquipa(); }; });
  bar.querySelectorAll("[data-dif]").forEach(function (b) { b.onclick = function () { D.diff = b.dataset.dif; mostrar(); }; });
}
function ligar() {
  var $ = function (s) { return app.querySelectorAll(s); }, el = function (i) { return document.getElementById(i); };
  el("clBack").onclick = sair;
  el("clMudar").onclick = function () { if (sujo() && !confirm("Tens alterações por guardar. Continuar e descartar?")) return; D = null; escolherClube(); };
  $("[data-aba]").forEach(function (b) { b.onclick = function () { TAB = b.dataset.aba; FIL = "all"; MSG = ""; mostrar(); }; });
  ligarBarraEsq();
  if (TAB === "equipa") {
    /* tudo por delegação: o relvado 3D e a lista mudam sem reconstruir o ecrã */
    el("formas").onclick = function (e) { var b = e.target.closest("[data-form]"); if (b) { D.form = b.dataset.form; SEL = 0; refrescarEquipa(); } };
    el("chips").onclick = function (e) { var b = e.target.closest("[data-fil]"); if (b) { FIL = b.dataset.fil; refrescarEquipa(); } };
    el("campoWrap").onclick = function (e) { var b = e.target.closest("[data-slot]"); if (b) { SEL = +b.dataset.slot; refrescarEquipa(); } };
    el("eqLista").onclick = function (e) {
      var b = e.target.closest("[data-pl]"); if (!b || b.disabled) return;
      var f = D.form, ids = escalacao(f, D).slice(), id = +b.dataset.pl, j = ids.indexOf(id), antigo = ids[SEL];
      if (j >= 0 && j !== SEL) ids[j] = antigo;
      ids[SEL] = id; D.lineup[f] = ids; refrescarEquipa();
    };
  }
  if (TAB === "tatica") {
    $("[data-form]").forEach(function (b) { b.onclick = function () { D.form = b.dataset.form; mostrar(); }; });
    $("[data-tac]").forEach(function (b) { b.onclick = function () { D.tactic = b.dataset.tac; D.tac = null; mostrar(); }; });
    var tl = el("tLinha");
    if (tl) {
      var mudou = function () { D.tac = { line: +el("tLinha").value / 100, support: +el("tApoio").value / 100, pressao: +el("tPress").value / 100 }; atualizarTac(); };
      ["tLinha", "tApoio", "tPress"].forEach(function (i) { el(i).oninput = mudou; });
    }
  }
  if (TAB === "plantel") {
    var bu = el("clBusca"); bu.oninput = function () { BUSCA = bu.value; refrescarPlantel(); };
    el("plLado").onclick = function (e) { var b = e.target.closest("[data-fil]"); if (b) { FIL = b.dataset.fil; refrescarPlantel(); } };
    var g = el("plGrelha");
    g.onchange = function (e) {
      var t = e.target;
      if (t.dataset.nome != null) {
        var v = t.value.replace(/\s+/g, " ").trim().slice(0, 18), a = porId(+t.dataset.nome);
        if (v && v !== a.name) D.names[a.id] = v; else delete D.names[a.id];
        t.value = nomeD(a); atualizarCartaoEstado(t); barraEstado();
      } else if (t.dataset.num != null) {
        var n = Math.floor(+t.value), b = porId(+t.dataset.num);
        if (n === b.num) delete D.nums[b.id]; else D.nums[b.id] = n;
        refrescarPlantel();
      }
    };
    el("plExp").onclick = exportarPlantel;
    el("plImp").onclick = function () { el("plFile").click(); };
    el("plFile").onchange = function () { importarPlantel(el("plFile").files[0]); };
  }
  if (TAB === "kit") {
    $("[data-kq]").forEach(function (b) { b.onclick = function () { KITSEL = b.dataset.kq; mostrar(); }; });
    $("[data-ku]").forEach(function (b) { b.onclick = function () { D.kitUse = b.dataset.ku; mostrar(); }; });
    var edita = function (campo, valor) { var k = clone(kitDe(D, KITSEL)); k[campo] = valor; k.custom = true; D.kits[KITSEL] = k; kitMudou(); };
    [["kShirt", "shirt"], ["kShorts", "shorts"], ["kSocks", "socks"], ["kAcc", "accent"]].forEach(function (p) {
      var inp = el(p[0]);
      inp.oninput = function () { edita(p[1], inp.value); };
      inp.parentNode.querySelectorAll(".c94-cor").forEach(function (b) { b.onclick = function () { inp.value = b.dataset.c; edita(p[1], b.dataset.c); }; });
    });
    el("kPats").onclick = function (e) { var b = e.target.closest("[data-pat]"); if (b) edita("pattern", +b.dataset.pat); };
    el("kOrig").onclick = function () { delete D.kits[KITSEL]; mostrar(); };
    el("pvNum").onchange = function () { PREVNUM = +el("pvNum").value; if (CENA) CENA.atualizar(); };
  }
  el("clGuardar").onclick = function () { if (guardar()) mostrar(); };
  el("clRepor").onclick = function () { repor(); mostrar(); };
}
function atualizarCartaoEstado(inp) { var c = inp.closest(".c94-cartao"); if (c && !c.querySelector("small")) c.querySelector(".c94-c2").insertAdjacentHTML("beforeend", "<small>alterado</small>"); }
function kitMudou() {
  var k = kitDe(D, KITSEL), st = document.getElementById("pvEstado"); if (st) st.textContent = "Equipamento personalizado";
  document.querySelectorAll(".c94-sw").forEach(function (sw) {
    var inp = sw.querySelector("input"); sw.querySelectorAll(".c94-cor").forEach(function (b) { b.classList.toggle("sel", b.dataset.c.toLowerCase() === inp.value.toLowerCase()); });
  });
  var pats = document.getElementById("kPats"); if (pats) pats.outerHTML = padroesHTML(k), document.getElementById("kPats").onclick = function (e) { var b = e.target.closest("[data-pat]"); if (b) { var kk = clone(kitDe(D, KITSEL)); kk.pattern = +b.dataset.pat; kk.custom = true; D.kits[KITSEL] = kk; kitMudou(); } };
  var u = document.querySelectorAll("[data-ku] svg"); if (u.length === 2) { u[0].outerHTML = kitSvg(kitDe(D, "home"), 22); u[1].outerHTML = kitSvg(kitDe(D, "away"), 22); }
  if (CENA) CENA.atualizar();
  barraEstado();
}
function atualizarTac() {
  var v = valoresTac(), e = function (i, t) { var n = document.getElementById(i); if (n && n.nextElementSibling) n.nextElementSibling.textContent = t; };
  e("tLinha", (v.line >= 0 ? "+" : "") + Math.round(v.line * 100)); e("tApoio", (v.support >= 0 ? "+" : "") + Math.round(v.support * 100)); e("tPress", Math.round(v.pressao * 100) + "%");
  barraEstado();
}
function barraEstado() {
  var g = document.getElementById("clGuardar"), m = document.querySelector(".c94-msg"), er = erros(), s = sujo();
  if (g) g.disabled = !s || er.length > 0;
  if (m) { m.textContent = er[0] || (s ? "Alterações por guardar." : MSG); m.classList.toggle("erro", er.length > 0); }
}
function repor() {
  if (TAB === "equipa") { D.form = "221"; D.lineup = {}; D.tactic = "bal"; D.tac = null; SEL = 0; }
  else if (TAB === "plantel") { D.names = {}; D.nums = {}; BUSCA = ""; FIL = "all"; }
  else if (TAB === "kit") { D.kits = {}; D.kitUse = "home"; }
  else { D.tactic = "bal"; D.tac = null; D.diff = "normal"; }
}
function exportarPlantel() {
  var t = equipa(), blob = new Blob([JSON.stringify({ clube: t.s, nomes: D.names, numeros: D.nums }, null, 1)], { type: "application/json" });
  var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "plantel-" + t.s + ".json"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
}
function importarPlantel(f) {
  if (!f) return;
  var r = new FileReader();
  r.onload = function () {
    try {
      var j = JSON.parse(String(r.result)), ids = {}; plantel().forEach(function (a) { ids[a.id] = a; });
      if (!j || typeof j !== "object" || (j.clube && j.clube !== equipa().s)) throw new Error("clube");
      var nomes = {}, nums = {};
      Object.keys(j.nomes || {}).forEach(function (k) { if (ids[k] && typeof j.nomes[k] === "string") { var v = j.nomes[k].replace(/\s+/g, " ").trim().slice(0, 18); if (v && v !== ids[k].name) nomes[k] = v; } });
      Object.keys(j.numeros || {}).forEach(function (k) { var n = Math.floor(+j.numeros[k]); if (ids[k] && n >= 1 && n <= 99 && n !== ids[k].num) nums[k] = n; });
      D.names = nomes; D.nums = nums; MSG = "Plantel importado: revê e guarda."; refrescarPlantel();
    } catch (e) { MSG = "Ficheiro inválido ou de outro clube."; var m = document.querySelector(".c94-msg"); if (m) { m.textContent = MSG; m.classList.add("erro"); } }
  };
  r.readAsText(f);
}

/* ---------- cenas 3D (um só renderizador de cada vez, libertado ao mudar de separador) ---------- */
function cenaParar() {
  if (!CENA) return;
  var c = CENA; CENA = null; c.parado = true; cancelAnimationFrame(c.raf); clearInterval(c.espera);
  try { if (c.ro) c.ro.disconnect(); if (c.dispor) c.dispor(); c.renderer && c.renderer.dispose(); c.renderer && c.renderer.forceContextLoss(); } catch (e) {}
}
function msg(id, t) { var m = document.getElementById(id); if (m) { m.textContent = t || ""; m.style.display = t ? "grid" : "none"; } }
function esperarModelo(criar, falhar, idMsg) {
  var GLBM = window.__GLBM, GL = window.__glb;
  if (!GL || !GLBM || !window.THREE || !THREE.SkeletonUtils) { falhar("Pré-visualização 3D indisponível."); return; }
  if (GLBM.state === "idle") GL.load();
  if (GLBM.state === "off") { falhar("O modelo 3D não carregou."); return; }
  msg(idMsg, "A carregar o modelo 3D…");
  var tent = 0, tick = function () {
    if (GLBM.state === "ready") { clearInterval(CENA && CENA.espera); try { criar(); msg(idMsg, ""); } catch (e) { console.warn("3D:", e); cenaParar(); falhar("Não foi possível criar a vista 3D."); } }
    else if (GLBM.state === "off" || ++tent > 100) { clearInterval(CENA && CENA.espera); falhar("O modelo 3D não carregou."); }
  };
  CENA = { espera: setInterval(tick, 150), atualizar: function () {}, parado: false }; tick();
}
function baseCena(canvas, box) {
  var T3 = THREE, renderer = new T3.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  var scene = new T3.Scene(), cam = new T3.PerspectiveCamera(30, 1, .5, 600);
  scene.add(new T3.HemisphereLight(0xeaf5ff, 0x6f8f66, .9)); var sun = new T3.DirectionalLight(0xfff4dc, .7); sun.position.set(30, 60, 40); scene.add(sun);
  var antigo = CENA; if (antigo) clearInterval(antigo.espera);
  var c = { renderer: renderer, scene: scene, cam: cam, parado: false, mixers: [], relogio: new T3.Clock(), extra: [], atualizar: function () {}, ajustar: function () {} };
  CENA = c;
  var tam = function () { var w = box.clientWidth, h = box.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; c.ajustar(w, h); cam.updateProjectionMatrix(); };
  c.tam = tam; if (window.ResizeObserver) { c.ro = new ResizeObserver(tam); c.ro.observe(box); }
  c.laco = function () {
    if (c.parado) return;
    var dt = Math.min(.05, c.relogio.getDelta()); c.mixers.forEach(function (m) { m.update(dt); }); if (c.frame) c.frame(dt);
    renderer.render(scene, cam); c.raf = requestAnimationFrame(c.laco);
  };
  return c;
}
function novoJogadorGLB(T3, GLBM) {
  var root = T3.SkeletonUtils.clone(GLBM.proto), grp = new T3.Group(), meshes = {};
  root.scale.setScalar(GLBM.scale); root.position.y = GLBM.yoff; grp.add(root);
  root.traverse(function (o) { if (o.isMesh || o.isSkinnedMesh) { o.frustumCulled = false; meshes[o.name] = o; } });
  var mixer = new T3.AnimationMixer(root), clip = GLBM.clips.Idle_Atento || GLBM.clips.Idle_Respirar;
  if (clip) { var a = mixer.clipAction(clip); a.time = Math.random() * 3; a.play(); }
  return { grp: grp, root: root, mixer: mixer, h: { gl: { meshes: meshes, bones: {}, mixer: mixer, act: {}, cur: null, root: grp } } };
}

/* 3a. jogador de corpo inteiro (equipamentos) */
function cenaJogador() {
  var cv = document.getElementById("pvCanvas"), box = document.getElementById("pvBox"); if (!cv) return;
  var falhar = function (t) { msg("pvMsg", t + " A mostrar a miniatura."); box.insertAdjacentHTML("beforeend", '<div class="c94-pvfb">' + kitSvg(kitDe(D, KITSEL), 150) + '</div>'); };
  esperarModelo(function () {
    var T3 = THREE, GLBM = window.__GLBM, GL = window.__glb, t = equipa(), id = GL.team[t.s] || "petro_luanda";
    var c = baseCena(cv, box), pivot = new T3.Group(), p = novoJogadorGLB(T3, GLBM);
    var base = new T3.Mesh(new T3.CylinderGeometry(11, 11, .6, 40), new T3.MeshLambertMaterial({ color: 0x0b1c2c })); base.position.y = -.3; c.scene.add(base);
    pivot.add(p.grp); c.scene.add(pivot); c.mixers.push(p.mixer);
    var at = GL.atlas(id), mk = function () { return new T3.MeshLambertMaterial({ map: at.tex, emissive: 0x1a1a1a }); }, mats = {};
    ["Cabeca", "Bracos", "Camisola", "Calcoes", "Pernas", "Meias", "Chuteiras"].forEach(function (n) { mats[n] = mk(); });
    var rot = 0, alvo = 0, auto = false, pend = false;
    c.ajustar = function () { var d = (GLBM.H * 1.3) / (2 * Math.tan(c.cam.fov * Math.PI / 360)) / Math.min(1, c.cam.aspect * 1.5); c.cam.position.set(0, GLBM.H * .52, d); c.cam.lookAt(0, GLBM.H * .5, 0); };
    c.atualizar = function () {
      var k = kitDe(D, KITSEL), a = porId(PREVNUM);
      GL.look(p.h, { code: t.s, kit: { custom: false }, num: a ? numD(a) : 10 });       // base oficial + número
      if (k.custom) {
        for (var n in mats) if (p.h.gl.meshes[n]) p.h.gl.meshes[n].material = mats[n];
        if (!pend) { pend = true; requestAnimationFrame(function () { pend = false; at.paint(k); }); }
      }
    };
    c.dispor = function () { Object.keys(mats).forEach(function (n) { mats[n].dispose(); }); at.tex.dispose(); base.geometry.dispose(); base.material.dispose(); };
    c.frame = function (dt) { if (auto) alvo += dt * .9; rot += (alvo - rot) * Math.min(1, dt * 10); pivot.rotation.y = rot; };
    var down = false, lx = 0;
    cv.onpointerdown = function (e) { down = true; lx = e.clientX; auto = false; try { cv.setPointerCapture(e.pointerId); } catch (x) {} };
    cv.onpointermove = function (e) { if (down) { alvo += (e.clientX - lx) * .012; lx = e.clientX; } };
    cv.onpointerup = cv.onpointercancel = function () { down = false; };
    document.getElementById("pvF").onclick = function () { auto = false; alvo = 0; };
    document.getElementById("pvC").onclick = function () { auto = false; alvo = Math.PI; };
    document.getElementById("pvR").onclick = function () { auto = !auto; };
    c.tam(); c.atualizar(); c.laco();
  }, falhar, "pvMsg");
}

/* 3b. relvado marcado com os jogadores em 3D (equipa e tática) */
var CL_LARG = 105, CL_ALT = 68;
function texturaRelvado(T3) {
  var S = 20, w = CL_LARG * S, h = CL_ALT * S, cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  var c = cv.getContext("2d"), n = 14;
  for (var i = 0; i < n; i++) { c.fillStyle = i % 2 ? "#2f8a3d" : "#297d37"; c.fillRect(i * w / n, 0, w / n + 1, h); }
  c.strokeStyle = "rgba(255,255,255,.9)"; c.lineWidth = 11; c.fillStyle = "#fff";
  var m = function (x) { return x * S; };
  c.strokeRect(m(.3), m(.3), w - m(.6), h - m(.6));
  c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.stroke();
  c.beginPath(); c.arc(w / 2, h / 2, m(9.15), 0, 7); c.stroke(); c.beginPath(); c.arc(w / 2, h / 2, m(.5), 0, 7); c.fill();
  [[0, 1], [w, -1]].forEach(function (L) {
    var x0 = L[0], d = L[1];
    c.strokeRect(d > 0 ? x0 : x0 - m(16.5), h / 2 - m(20.15), m(16.5), m(40.3));
    c.strokeRect(d > 0 ? x0 : x0 - m(5.5), h / 2 - m(9.15), m(5.5), m(18.3));
    c.beginPath(); c.arc(x0 + d * m(11), h / 2, m(.5), 0, 7); c.fill();
    c.beginPath(); c.arc(x0 + d * m(11), h / 2, m(9.15), d > 0 ? -.93 : Math.PI - .93, d > 0 ? .93 : Math.PI + .93); c.stroke();
  });
  var tx = new T3.CanvasTexture(cv); tx.flipY = true; tx.anisotropy = 8; tx.minFilter = T3.LinearMipmapLinearFilter; tx.generateMipmaps = true; return tx;
}
function cenaCampo(interativo) {
  var cv = document.getElementById("cenaCanvas"), box = document.getElementById("cenaBox"); if (!cv) return;
  var falhar = function (t) {
    msg("cenaMsg", t + " A mostrar o campo simples.");
    box.insertAdjacentHTML("beforeend", '<div class="c94-fb2d" id="cenaFb">' + campo2D(D.form, D, { sel: interativo, ro: !interativo }) + '</div>');
    CENA = { atualizar: function () { var f = document.getElementById("cenaFb"); if (f) f.innerHTML = campo2D(D.form, D, { sel: interativo, ro: !interativo }); }, parado: false };
    var fb = function () { var w = document.getElementById("cenaFb"); if (!w) return; var c2 = w.querySelector(".c94-campo"), r = 105 / 68, cw = Math.min(w.clientWidth, w.clientHeight * r); c2.style.width = cw + "px"; c2.style.height = cw / r + "px"; };
    fb(); if (window.ResizeObserver) { var ro = new ResizeObserver(fb); ro.observe(box); CENA.dispor = function () { ro.disconnect(); }; }
  };
  esperarModelo(function () {
    var T3 = THREE, GLBM = window.__GLBM, GL = window.__glb, t = equipa(), c = baseCena(cv, box);
    var chao = new T3.Mesh(new T3.PlaneGeometry(CL_LARG, CL_ALT), new T3.MeshLambertMaterial({ map: texturaRelvado(T3) }));
    chao.rotation.x = -Math.PI / 2; chao.position.set(CL_LARG / 2, 0, CL_ALT / 2); c.scene.add(chao);
    var fora = new T3.Mesh(new T3.PlaneGeometry(500, 400), new T3.MeshLambertMaterial({ color: 0x174a26 })); fora.rotation.x = -Math.PI / 2; fora.position.set(CL_LARG / 2, -.08, CL_ALT / 2); c.scene.add(fora);
    var anel = new T3.Mesh(new T3.RingGeometry(1.7, 2.3, 40), new T3.MeshBasicMaterial({ color: 0xffc629, side: T3.DoubleSide })); anel.rotation.x = -Math.PI / 2; anel.position.y = .06; c.scene.add(anel);
    var altura = 6, esc = altura / GLBM.H, jog = [], rotulos = document.getElementById("cenaLabels"), V = new T3.Vector3();
    for (var i = 0; i < 6; i++) { var p = novoJogadorGLB(T3, GLBM); p.grp.scale.setScalar(esc); p.grp.rotation.y = Math.PI / 2; c.scene.add(p.grp); c.mixers.push(p.mixer); jog.push(p); }
    c.ajustar = function (w, h) {
      var asp = w / h; c.cam.fov = 2 * Math.atan(Math.tan(38 * Math.PI / 180) / asp) * 180 / Math.PI;
      c.cam.position.set(-20, 36, CL_ALT / 2); c.cam.lookAt(CL_LARG * .3, 0, CL_ALT / 2); c.cam.updateMatrixWorld(true); posicionar();
    };
    function posicionar() {
      var box2 = box.getBoundingClientRect();
      jog.forEach(function (p, i) {
        var b = rotulos.children[i]; if (!b) return;
        V.set(p.grp.position.x, 0, p.grp.position.z).project(c.cam);
        b.style.left = ((V.x + 1) / 2 * box2.width) + "px"; b.style.top = ((1 - V.y) / 2 * box2.height) + "px";
      });
    }
    c.atualizar = function () {
      var f = D.form, ids = escalacao(f, D), k = kitEmUso(D), kit = k.custom ? { shirt: k.shirt, accent: k.accent, shorts: k.shorts, socks: k.socks, pattern: k.pattern | 0, custom: true } : { custom: false };
      FORMS[f].p.forEach(function (s, i) {
        var a = porId(ids[i]), p = jog[i];
        p.grp.position.set(s[1] * CL_LARG, 0, s[2] * CL_ALT);
        GL.look(p.h, { code: t.s, kit: kit, num: numD(a), gk: s[0] === "GK", gkShirt: "#22c3b5" });
      });
      rotulos.innerHTML = slotsHTML(f, D, { sel: interativo, ro: !interativo });
      var s2 = FORMS[f].p[SEL]; anel.visible = !!interativo; anel.position.x = s2[1] * CL_LARG; anel.position.z = s2[2] * CL_ALT;
      posicionar();
    };
    c.tam(); c.atualizar(); c.laco();
  }, falhar, "cenaMsg");
}

/* ---------- aplicação nos jogos ---------- */
var _cm = createMatch;
createMatch = function (o) {
  var g = _cm.apply(this, arguments);
  try { aplicar(g, o); } catch (e) { console.warn("clube:", e); }
  return g;
};
/* equipamentos que o jogo vai usar: o teu (principal/alternativo) e o do adversário (automático evita cores parecidas) */
function kitsDoJogo(o) {
  var tR = TEAMS[o.R], kJ = kitPara(o.L, o.kit || kitPadrao(o.L)), qR = o.kitR || "auto", kR;
  var perto = function (a, b) { return colorDist(a, b) < 120; };
  if (qR === "home" || qR === "away") kR = kitPara(o.R, qR);
  else {
    kR = kitPara(o.R, "home");
    if (perto(kJ.shirt, kR.shirt)) {
      var alt = kitPara(o.R, "away");
      kR = !perto(kJ.shirt, alt.shirt) ? alt : { shirt: "#f2f2f2", accent: tR.c1, shorts: tR.c1, socks: "#f2f2f2", pattern: 0, custom: true };
    }
  }
  return [kJ, kR];
}
function aplicar(g, o) {
  if (o.online || o.mode === "tutorial") return;
  if (CL.team != null && o.L === CL.team) {
    var form = FORMS[o.form] ? o.form : "221", ids = escalacao(form, CL), roster = plantel();
    g.players.forEach(function (p) {
      if (p.team !== 0) return;
      var a = roster.filter(function (x) { return x.id === ids[p.i]; })[0];
      if (a) assignIdentity(p, a);
      if (CL.names && CL.names[p.rosterId]) p.name = CL.names[p.rosterId];
      if (CL.nums && CL.nums[p.rosterId]) p.num = CL.nums[p.rosterId];
    });
    if (CL.tac && o.tac === CL.tactic) {
      var c = CL.tac, v = { n: "Personalizada", d: "Ajustes do teu clube.", line: c.line, support: c.support, press: Math.round(-1 + 2 * c.pressao), pdist: Math.round(-60 + 140 * c.pressao) };
      Object.defineProperty(TACTICS, "club94", { value: v, enumerable: false, configurable: true, writable: true });   // não aparece nas listas de escolha
      g.o.tac = "club94";
    }
  }
  /* equipamentos: o teu (principal ou alternativo) e o do adversário (automático, principal ou alternativo) */
  var tJ = TEAMS[o.L], tR = TEAMS[o.R], kk = kitsDoJogo(o), kJ = kk[0], kR = kk[1];
  g.cols = [kJ.custom ? { c1: kJ.shirt, c2: kJ.accent } : { c1: tJ.c1, c2: tJ.c2 }, kR.custom ? { c1: kR.shirt, c2: kR.accent } : { c1: tR.c1, c2: tR.c2 }];
  g.kits = [paraJogo(kJ, tJ), paraJogo(kR, tR)];
}

/* clube predefinido nos ecrãs de escolha de equipa */
function destacar(atributo, rotulo) {
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
showPick = function (mode) { var r = _sp.apply(this, arguments); try { if (mode === "season" || mode === "quick1") destacar("data-i", mode === "season" ? "Começar com este clube" : "Jogar com este clube"); } catch (e) {} return r; };
var _sc = showCup;
showCup = function () { var r = _sc.apply(this, arguments); try { destacar("data-cup", "Começar a taça com este clube"); } catch (e) {} return r; };

/* ---------- pré-visualização 3D dos dois equipamentos no ecrã de pré-jogo ---------- */
function pararVersus() { var c = CENA; if (c && c.versus) cenaParar(); }
function versus3D(banner, o) {
  pararVersus();
  var imgs = [].slice.call(banner.querySelectorAll(".pw-side img:not(.crest)")); if (imgs.length !== 2) return null;
  var box = document.createElement("div"); box.className = "pw-vs3d";
  box.style.cssText = "position:absolute;pointer-events:none;z-index:0;opacity:0;transition:opacity .45s ease";
  var cv = document.createElement("canvas"); cv.style.cssText = "width:100%;height:100%;display:block"; box.appendChild(cv);
  banner.style.position = "relative"; banner.insertBefore(box, banner.firstChild);
  [].slice.call(banner.children).forEach(function (e) { if (e !== box) { e.style.position = "relative"; e.style.zIndex = "1"; } });
  var ctl = { o: o, atualizar: function (oo) { if (oo) ctl.o = oo; if (ctl.vestir) ctl.vestir(); } };
  esperarModelo(function () {
    var T3 = THREE, GLBM = window.__GLBM, GL = window.__glb, c = baseCena(cv, box); c.versus = true;
    var D = 300, slot = [0, 0], alt = 100, jog = [];
    for (var i = 0; i < 2; i++) { var p = novoJogadorGLB(T3, GLBM); p.atlas = null; p.mats = null; p.id = null; c.scene.add(p.grp); c.mixers.push(p.mixer); jog.push(p); }
    function colocar() {
      var br = banner.getBoundingClientRect(), r0 = imgs[0].getBoundingClientRect(), r1 = imgs[1].getBoundingClientRect();
      if (!r0.height || !br.width) return false;
      var l = Math.min(r0.left, r1.left) - 30, r = Math.max(r0.right, r1.right) + 30, t = r0.top - 6, b = r0.bottom + 6;
      box.style.left = (l - br.left) + "px"; box.style.top = (t - br.top) + "px"; box.style.width = (r - l) + "px"; box.style.height = (b - t) + "px";
      alt = r0.height; slot = [(r0.left + r0.right) / 2 - l, (r1.left + r1.right) / 2 - l];
      jog.forEach(function (p, k) { var e = alt / GLBM.H; p.grp.scale.setScalar(e); p.grp.position.set(slot[k], 6, 0); p.grp.rotation.y = k ? -.38 : .38; });
      return true;
    }
    c.ajustar = function (w, h) { c.cam.fov = 2 * Math.atan(h / 2 / D) * 180 / Math.PI; c.cam.near = 20; c.cam.far = 900; c.cam.position.set(w / 2, h / 2, D); c.cam.lookAt(w / 2, h / 2, 0); };
    function vestir(p, idx, k) {
      var t = TEAMS[idx], id = GL.team[t.s] || "petro_luanda";
      GL.look(p.h, { code: t.s, kit: { custom: false }, num: 10 });
      if (k.custom) {
        if (!p.atlas || p.id !== id) { p.id = id; p.atlas = GL.atlas(id); p.mats = {}; ["Cabeca", "Bracos", "Camisola", "Calcoes", "Pernas", "Meias", "Chuteiras"].forEach(function (n) { p.mats[n] = new T3.MeshLambertMaterial({ map: p.atlas.tex, emissive: 0x1a1a1a }); }); GL.cloth(p.mats.Camisola, 1.1); GL.cloth(p.mats.Calcoes, .8); GL.cloth(p.mats.Meias, .6); }
        for (var n in p.mats) if (p.h.gl.meshes[n]) p.h.gl.meshes[n].material = p.mats[n];
        p.atlas.paint({ shirt: k.shirt, accent: k.accent, shorts: k.shorts, socks: k.socks, pattern: k.pattern | 0, custom: true });
      }
    }
    ctl.vestir = function () {
      var oo = ctl.o, kk = kitsDoJogo(oo), H = oo.homeLeft ? oo.L : oo.R, hk = oo.homeLeft ? kk[0] : kk[1], ak = oo.homeLeft ? kk[1] : kk[0], A = oo.homeLeft ? oo.R : oo.L;
      vestir(jog[0], H, hk); vestir(jog[1], A, ak);
    };
    c.dispor = function () { jog.forEach(function (p) { if (p.mats) Object.keys(p.mats).forEach(function (n) { p.mats[n].dispose(); }); if (p.atlas) p.atlas.tex.dispose(); }); if (box.parentNode) box.parentNode.removeChild(box); if (ro2) ro2.disconnect(); banner.classList.remove("has3d"); };
    var t0 = performance.now();
    c.frame = function () {
      if (!document.body.contains(cv)) { cenaParar(); return; }
      var t = (performance.now() - t0) / 1000; jog.forEach(function (p, k) { p.grp.rotation.y = (k ? -.38 : .38) + Math.sin(t * .8 + k * 1.7) * .09; });
    };
    var ro2 = null; if (window.ResizeObserver) { ro2 = new ResizeObserver(function () { if (colocar()) c.tam(); }); ro2.observe(banner); imgs.forEach(function (im) { ro2.observe(im); }); }
    var tries = 0, go = function () {
      if (!document.body.contains(cv)) { cenaParar(); return; }
      if (colocar()) { c.tam(); ctl.vestir(); c.laco(); box.style.opacity = "1"; banner.classList.add("has3d"); }
      else if (++tries < 40) setTimeout(go, 100);
    };
    go();
  }, function () { box.parentNode && box.parentNode.removeChild(box); }, "pwVsMsg");
  return ctl;
}
window.G94 = Object.assign(window.G94 || {}, { kitsDoJogo: kitsDoJogo, versus3D: versus3D, kitPara: kitPara, kitPadrao: kitPadrao, kitInfo: kitInfo, kitSvg: kitSvg, showClube: function () { if (CL.team != null) abrirRascunho(); mostrar(); }, clubeRecarregar: recarregar, clube: function () { return CL; }, _draft: function () { return D; }, _cena: function () { return CENA; } });
})();
