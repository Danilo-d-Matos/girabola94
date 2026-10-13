/* ===== Girabola 94: gestão do clube (Equipa e formação · Plantel e nomes · Equipamentos · Tática) =====
   Trabalha sobre uma cópia (rascunho) e só grava ao carregar em "Guardar alterações".
   Aplica-se só quando o jogador joga com o seu clube; o resto do jogo não muda. */
(function () {
"use strict";
var KC = "girabola94.clube";
var _css = document.createElement("link"); _css.rel = "stylesheet"; _css.href = "ui/clube94.css"; document.head.appendChild(_css);
var PADROES = [[0, "Liso"], [1, "Riscas verticais"], [2, "Laterais e centro"], [3, "Faixa horizontal"], [4, "Faixas diagonais"], [5, "Faixas diagonais largas"], [6, "Riscas finas"], [7, "Riscas suaves"]];
var POS = { GK: "GR", D: "DEF", M: "MÉD", F: "AVA" }, POSN = { GK: "Guarda-redes", D: "Defesas", M: "Médios", F: "Avançados" };
var TAB = "equipa", SEL = 0, FIL = "all", BUSCA = "", KITSEL = "home", PREVNUM = null, D = null, BASE = "", MSG = "", PV = null;

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

/* rascunho */
function abrirRascunho() {
  D = clone(CL); D.names = D.names || {}; D.nums = D.nums || {}; D.lineup = D.lineup || {}; D.kits = D.kits || {};
  D.form = FORMS[PREF.form] ? PREF.form : "221"; D.tactic = TACTICS[PREF.tactic] ? PREF.tactic : "bal"; D.diff = PREF.diff;
  D.kitUse = D.kitUse || "home"; D.tac = D.tac || null;
  BASE = JSON.stringify(D); MSG = "";
}
function sujo() { return JSON.stringify(D) !== BASE; }
function numerosRepetidos() {
  var vistos = {}, rep = {};
  plantel().forEach(function (a) { var n = numD(a); if (vistos[n]) { rep[n] = 1; } vistos[n] = 1; });
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
function alternativo(t) { return { shirt: t.c2 === "#151515" || t.c2 === "#1c1c1c" ? "#f2f2f2" : t.c2, accent: t.c1, shorts: t.c1, socks: t.c2, pattern: 0, custom: true }; }
function kitDe(fonte, qual) { var t = equipa(), k = fonte.kits && fonte.kits[qual]; return k || (qual === "home" ? oficial(t) : alternativo(t)); }
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
    '<path d="' + body + '" fill="' + k.shirt + '"/><g clip-path="url(#' + id + ')">' + p + '</g><path d="M38,12 Q50,22 62,12" fill="none" stroke="' + k.accent + '" stroke-width="3"/>' +
    '<rect x="24" y="68" width="52" height="24" rx="3" fill="' + k.shorts + '"/><rect x="28" y="94" width="16" height="30" rx="3" fill="' + k.socks + '"/><rect x="56" y="94" width="16" height="30" rx="3" fill="' + k.socks + '"/></svg>';
}

/* ---------- peças de interface ---------- */
var LINHAS = '<g fill="none" stroke="rgba(255,255,255,.75)" stroke-width=".35"><rect x=".5" y=".5" width="104" height="67"/><line x1="52.5" y1=".5" x2="52.5" y2="67.5"/><circle cx="52.5" cy="34" r="9.15"/><rect x=".5" y="13.85" width="16.5" height="40.3"/><rect x=".5" y="24.85" width="5.5" height="18.3"/><rect x="88" y="13.85" width="16.5" height="40.3"/><rect x="99" y="24.85" width="5.5" height="18.3"/></g>';
function campoHTML(form, fonte, opc) {
  var ids = escalacao(form, fonte), roster = plantel(), por = {};
  roster.forEach(function (a) { por[a.id] = a; });
  var slots = FORMS[form].p.map(function (s, i) {
    var a = por[ids[i]];
    return '<button type="button" class="c94-slot' + (opc.sel && i === SEL ? ' sel' : '') + '" ' + (opc.ro ? 'tabindex="-1" disabled ' : 'data-slot="' + i + '" ') + 'style="left:' + (s[1] * 100) + '%;top:' + (s[2] * 100) + '%"><i>' + numD(a) + '</i><span>' + esc(nomeD(a)) + '</span><small>' + POS[s[0]] + '</small></button>';
  }).join("");
  return '<div class="c94-campo"><svg viewBox="0 0 105 68" preserveAspectRatio="none" aria-hidden="true"><rect width="105" height="68" fill="#2a7a37"/>' +
    [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) { return '<rect x="' + (i * 13.125) + '" width="13.125" height="68" fill="' + (i % 2 ? '#2d8139' : '#27753a') + '"/>'; }).join("") + LINHAS + '</svg>' + slots + '</div>';
}
function miniFormacao(k) {
  return '<svg viewBox="0 0 100 60" width="70" aria-hidden="true"><rect width="100" height="60" rx="4" fill="#1b5e2c"/>' + FORMS[k].p.map(function (s) { return '<circle cx="' + Math.min(94, 6 + s[1] * 130) + '" cy="' + (6 + s[2] * 48) + '" r="4" fill="#fff"/>'; }).join("") + '</svg>';
}

/* ---------- ecrãs ---------- */
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
  return '<footer class="c94-barra"><div class="c94-esq">' + esq + '</div><div class="c94-dir"><span class="c94-msg' + (er.length ? ' erro' : '') + '" role="status">' + esc(er[0] || (s ? "Alterações por guardar." : MSG)) + '</span>' +
    '<button class="c94-btn sec" id="clRepor">Repor predefinições</button><button class="c94-btn pri" id="clGuardar"' + (!s || er.length ? ' disabled' : '') + '>Guardar alterações</button></div></footer>';
}
function filtros() {
  return '<div class="c94-chips">' + [["all", "Todos"], ["GK", "GR"], ["D", "DEF"], ["M", "MÉD"], ["F", "AVA"]].map(function (f) {
    return '<button type="button" data-fil="' + f[0] + '" aria-pressed="' + (FIL === f[0]) + '">' + f[1] + '</button>'; }).join("") + '</div>';
}

function vistaEquipa() {
  var f = D.form, ids = escalacao(f, D), roster = plantel(), slotRole = FORMS[f].p[SEL][0];
  var lista = roster.filter(function (a) { return FIL === "all" || a.role === FIL; })
    .sort(function (a, b) { return ["GK", "D", "M", "F"].indexOf(a.role) - ["GK", "D", "M", "F"].indexOf(b.role) || numD(a) - numD(b); })
    .map(function (a) {
      var elegivel = SEL === 0 ? a.role === "GK" : a.role !== "GK", i = ids.indexOf(a.id);
      return '<button type="button" class="c94-pl r' + a.role + (i === SEL ? ' sel' : '') + '" data-pl="' + a.id + '"' + (elegivel ? '' : ' disabled') + '><b>' + numD(a) + '</b><span>' + esc(nomeD(a)) + '</span><em>' + POS[a.role] + '</em><small>' + (!elegivel ? 'Indisponível nesta posição' : i >= 0 ? 'Titular' : 'Suplente') + '</small></button>';
    }).join("");
  var corpo = '<div class="c94-duas"><section class="c94-painel"><div class="c94-ph"><h3>Formação</h3><span>' + FORMS[f].n + ' · toca numa posição para escolher o jogador</span></div>' +
    '<div class="c94-formas">' + Object.keys(FORMS).map(function (k) { return '<button type="button" data-form="' + k + '" aria-pressed="' + (f === k) + '">' + miniFormacao(k) + '<div><b>' + FORMS[k].n + '</b><small>' + FORMS[k].d + '</small></div></button>'; }).join("") + '</div>' +
    '<div class="c94-campoWrap" id="campoWrap">' + campoHTML(f, D, { sel: true }) + '</div></section>' +
    '<section class="c94-painel"><div class="c94-ph"><h3>Plantel disponível</h3><span>Posição seleccionada: ' + POS[slotRole] + '</span></div>' + filtros() + '<div class="c94-scroll"><div class="c94-grid2">' + lista + '</div></div></section></div>';
  var esq = '<label class="c94-sel">Formação<select id="clFormaSel">' + Object.keys(FORMS).map(function (k) { return '<option value="' + k + '"' + (k === f ? ' selected' : '') + '>' + FORMS[k].n + '</option>'; }).join("") + '</select></label>' +
    '<span class="c94-rot">Táticas rápidas</span>' + Object.keys(TACTICS).map(function (k) { return '<button type="button" class="c94-btn sec peq" data-tac="' + k + '" aria-pressed="' + (D.tactic === k) + '">' + TACTICS[k].n + '</button>'; }).join("");
  return [corpo, esq];
}
function vistaPlantel() {
  var ids = escalacao(D.form, D), roster = plantel(), rep = numerosRepetidos(), q = BUSCA.trim().toLowerCase();
  var cont = { GK: 0, D: 0, M: 0, F: 0 }; roster.forEach(function (a) { cont[a.role]++; });
  var grupos = ["GK", "D", "M", "F"].map(function (r) {
    var l = roster.filter(function (a) { return a.role === r && (FIL === "all" || FIL === r) && (!q || nomeD(a).toLowerCase().indexOf(q) >= 0 || String(numD(a)) === q); });
    if (!l.length) return "";
    return '<h4 class="c94-gr r' + r + '">' + POSN[r] + ' <small>' + l.length + '</small></h4><div class="c94-grid4">' + l.map(function (a) {
      var mau = rep[numD(a)] || numeroInvalido(a);
      return '<div class="c94-cartao r' + r + (ids.indexOf(a.id) >= 0 ? ' tit' : '') + '"><div class="c94-cn"><input class="c94-num' + (mau ? ' mau' : '') + '" type="number" min="1" max="99" data-num="' + a.id + '" value="' + numD(a) + '" aria-label="Número de ' + esc(a.name) + '"><em>' + POS[r] + '</em></div>' +
        '<input class="c94-nome" type="text" maxlength="18" data-nome="' + a.id + '" value="' + esc(nomeD(a)) + '" aria-label="Nome do jogador ' + numD(a) + '"><small>' + (ids.indexOf(a.id) >= 0 ? 'Titular' : 'Suplente') + (D.names[a.id] || D.nums[a.id] ? ' · alterado' : '') + '</small></div>';
    }).join("") + '</div>';
  }).join("");
  var corpo = '<section class="c94-painel full"><div class="c94-resumo"><div class="c94-total"><b>' + roster.length + '</b><span>Jogadores inscritos</span></div>' +
    '<div class="c94-conts">' + ["GK", "D", "M", "F"].map(function (r) { return '<span class="r' + r + '"><b>' + cont[r] + '</b>' + POS[r] + '</span>'; }).join("") + '</div>' +
    '<input type="search" id="clBusca" class="c94-busca" placeholder="Pesquisar por nome ou número" value="' + esc(BUSCA) + '" aria-label="Pesquisar jogadores">' + filtros() + '</div>' +
    '<div class="c94-scroll">' + (grupos || '<p class="c94-vazio">Nenhum jogador corresponde à pesquisa.</p>') + '</div></section>';
  return [corpo, '<span class="c94-rot">Nomes e números alterados aparecem no jogo. Não há fotografias nem classificações nos dados do plantel.</span>'];
}

function swatches(id, atual, extra) {
  var t = equipa(), base = ["#ffffff", "#151515", t.c1, t.c2, "#d7263d", "#1d4e9e", "#f4c20d", "#1f8a4c"].concat(extra || []);
  var uniq = base.filter(function (c, i) { return base.indexOf(c) === i; });
  return '<div class="c94-sw" data-for="' + id + '">' + uniq.map(function (c) { return '<button type="button" class="c94-cor' + (c.toLowerCase() === String(atual).toLowerCase() ? ' sel' : '') + '" style="background:' + c + '" data-c="' + c + '" aria-label="Cor ' + c + '"></button>'; }).join("") +
    '<input type="color" id="' + id + '" value="' + atual + '" aria-label="Escolher outra cor"></div>';
}
function vistaKit() {
  var k = kitDe(D, KITSEL), roster = plantel();
  if (PREVNUM == null || !roster.some(function (a) { return a.id === PREVNUM; })) PREVNUM = (roster.filter(function (a) { return a.num === 10; })[0] || roster[0]).id;
  var corpo = '<div class="c94-duas kit"><section class="c94-painel"><div class="c94-ph"><h3>Pré-visualização</h3><span id="pvEstado">' + (k.custom ? 'Equipamento personalizado' : 'Equipamento oficial') + '</span></div>' +
    '<div class="c94-pv" id="pvBox"><canvas id="pvCanvas" aria-label="Pré-visualização 3D do jogador"></canvas><div class="c94-pvmsg" id="pvMsg"></div></div>' +
    '<div class="c94-pvctl"><button type="button" class="c94-btn sec peq" id="pvF">Frente</button><button type="button" class="c94-btn sec peq" id="pvC">Costas</button><button type="button" class="c94-btn sec peq" id="pvR">Rodar</button>' +
    '<label class="c94-sel">Número<select id="pvNum">' + roster.map(function (a) { return '<option value="' + a.id + '"' + (a.id === PREVNUM ? ' selected' : '') + '>' + numD(a) + ' · ' + esc(nomeD(a)) + '</option>'; }).join("") + '</select></label></div></section>' +
    '<section class="c94-painel"><div class="c94-ph"><h3>Personalização</h3><div class="c94-seg" role="group"><button type="button" data-kq="home" aria-pressed="' + (KITSEL === "home") + '">Principal</button><button type="button" data-kq="away" aria-pressed="' + (KITSEL === "away") + '">Alternativo</button></div></div>' +
    '<div class="c94-scroll"><h4 class="c94-gr">Camisola</h4>' + swatches("kShirt", k.shirt) + '<h4 class="c94-gr">Calções</h4>' + swatches("kShorts", k.shorts) + '<h4 class="c94-gr">Meias</h4>' + swatches("kSocks", k.socks) +
    '<h4 class="c94-gr">Detalhes</h4>' + swatches("kAcc", k.accent) + '<label class="c94-sel bloco">Padrão da camisola<select id="kPat">' + PADROES.map(function (p) { return '<option value="' + p[0] + '"' + (p[0] === (k.pattern | 0) ? ' selected' : '') + '>' + p[1] + '</option>'; }).join("") + '</select></label>' +
    '<p class="c94-nota">Nos jogadores 3D (pré-visualização e jogo) a camisola, os calções e as meias levam as cores escolhidas, em tecido liso. O padrão e os detalhes aparecem nas miniaturas e nos modelos simples, não na textura 3D.</p></div></section></div>';
  var esq = '<span class="c94-rot">Usar nos jogos</span><div class="c94-seg" role="group"><button type="button" data-ku="home" aria-pressed="' + (D.kitUse === "home") + '">' + kitSvg(kitDe(D, "home"), 22) + 'Principal</button><button type="button" data-ku="away" aria-pressed="' + (D.kitUse === "away") + '">' + kitSvg(kitDe(D, "away"), 22) + 'Alternativo</button></div>';
  return [corpo, esq];
}

var AT = { att: { line: .1, support: .07, press: 1, pdist: 80 }, bal: { line: 0, support: 0, press: 0, pdist: 0 }, def: { line: -.11, support: -.06, press: -1, pdist: -60 } };
function valoresTac() {
  var b = TACTICS[D.tactic] || TACTICS.bal, c = D.tac;
  return { line: c ? c.line : b.line, support: c ? c.support : b.support, pressao: c ? c.pressao : Math.max(0, Math.min(1, (b.pdist + 60) / 140)) };
}
function vistaTatica() {
  var v = valoresTac(), f = D.form;
  var estilos = Object.keys(TACTICS).map(function (k) { return '<button type="button" class="c94-estilo" data-tac="' + k + '" aria-pressed="' + (D.tactic === k) + '"><b>' + TACTICS[k].n + '</b><span>' + TACTICS[k].d + '</span></button>'; }).join("");
  function sl(id, rot, min, max, step, val, txt) { return '<label class="c94-sl"><span>' + rot + '</span><input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '"><em>' + txt + '</em></label>'; }
  var corpo = '<div class="c94-tres"><section class="c94-painel"><div class="c94-ph"><h3>Sistema tático</h3><span>Escolhe a formação base</span></div><div class="c94-formas col">' + Object.keys(FORMS).map(function (k) {
      return '<button type="button" data-form="' + k + '" aria-pressed="' + (f === k) + '">' + miniFormacao(k) + '<div><b>' + FORMS[k].n + '</b><small>' + FORMS[k].d + '</small></div></button>'; }).join("") + '</div></section>' +
    '<section class="c94-painel"><div class="c94-ph"><h3>Formação atual <b class="ouro">' + FORMS[f].n + '</b></h3></div><div class="c94-campoWrap" id="campoWrap">' + campoHTML(f, D, { ro: true }) + '</div></section>' +
    '<section class="c94-painel"><div class="c94-ph"><h3>Estilo de jogo</h3></div><div class="c94-estilos">' + estilos + '</div>' +
    '<h4 class="c94-gr">Ajustes (têm efeito real no jogo)</h4>' +
    sl("tLinha", "Altura da linha", -12, 12, 1, Math.round(v.line * 100), (v.line >= 0 ? "+" : "") + Math.round(v.line * 100)) +
    sl("tApoio", "Apoio ao portador", -8, 10, 1, Math.round(v.support * 100), (v.support >= 0 ? "+" : "") + Math.round(v.support * 100)) +
    sl("tPress", "Pressão", 0, 100, 1, Math.round(v.pressao * 100), Math.round(v.pressao * 100) + "%") +
    '<p class="c94-nota">Estes três ajustes alteram a equipa que controlas durante o jogo. Ritmo, largura e posse não existem no motor para a tua equipa, por isso não aparecem.</p></section></div>';
  var esq = '<span class="c94-rot">Dificuldade do adversário</span>' + Object.keys(DIFF).map(function (k) { return '<button type="button" class="c94-btn sec peq" data-dif="' + k + '" aria-pressed="' + (D.diff === k) + '">' + DIFF[k].n + '</button>'; }).join("");
  return [corpo, esq];
}

function escolherClube() {
  pvParar(); leaveMatch();
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
  pvParar(); leaveMatch();
  if (!D) abrirRascunho();
  var v = { equipa: vistaEquipa, plantel: vistaPlantel, kit: vistaKit, tatica: vistaTatica }[TAB]();
  app.innerHTML = '<section class="screen g94-screen c94-root">' + cabecalho() + '<main class="c94-main">' + v[0] + '</main>' + barra(v[1]) + '</section>';
  ligar();
  ajustarCampo();
  if (TAB === "kit") pvIniciar();
}
function ajustarCampo() {
  var w = document.getElementById("campoWrap"); if (!w) return;
  var f = function () {
    var c = w.querySelector(".c94-campo"); if (!c) return;
    var W = w.clientWidth, H = w.clientHeight, r = 105 / 68, cw = Math.min(W, H * r);
    c.style.width = Math.max(100, cw) + "px"; c.style.height = Math.max(64, cw / r) + "px";
  };
  f(); if (window.ResizeObserver) { if (window.__c94RO) window.__c94RO.disconnect(); window.__c94RO = new ResizeObserver(f); window.__c94RO.observe(w); }
}
function sair() {
  if (sujo() && !confirm("Tens alterações por guardar. Sair e descartar?")) return;
  pvParar(); D = null; showMenu();
}
function ligar() {
  var $ = function (s) { return app.querySelectorAll(s); }, el = function (i) { return document.getElementById(i); };
  el("clBack").onclick = sair;
  el("clMudar").onclick = function () { if (sujo() && !confirm("Tens alterações por guardar. Continuar e descartar?")) return; D = null; escolherClube(); };
  $("[data-aba]").forEach(function (b) { b.onclick = function () { TAB = b.dataset.aba; FIL = "all"; MSG = ""; mostrar(); }; });
  $("[data-fil]").forEach(function (b) { b.onclick = function () { FIL = b.dataset.fil; mostrar(); }; });
  $("[data-form]").forEach(function (b) { b.onclick = function () { D.form = b.dataset.form; SEL = 0; mostrar(); }; });
  var fs = el("clFormaSel"); if (fs) fs.onchange = function () { D.form = fs.value; SEL = 0; mostrar(); };
  $("[data-tac]").forEach(function (b) { b.onclick = function () { D.tactic = b.dataset.tac; D.tac = null; mostrar(); }; });
  $("[data-dif]").forEach(function (b) { b.onclick = function () { D.diff = b.dataset.dif; mostrar(); }; });
  $("[data-slot]").forEach(function (b) { b.onclick = function () { SEL = +b.dataset.slot; mostrar(); }; });
  $("[data-pl]").forEach(function (b) {
    b.onclick = function () {
      var f = D.form, ids = escalacao(f, D).slice(), id = +b.dataset.pl, j = ids.indexOf(id), antigo = ids[SEL];
      if (j >= 0 && j !== SEL) ids[j] = antigo;
      ids[SEL] = id; D.lineup[f] = ids; mostrar();
    };
  });
  /* plantel */
  var bu = el("clBusca"); if (bu) bu.oninput = function () { BUSCA = bu.value; var p = bu.selectionStart; mostrar(); var n = el("clBusca"); n.focus(); n.setSelectionRange(p, p); };
  $("[data-nome]").forEach(function (i) {
    i.onchange = function () {
      var v = i.value.replace(/\s+/g, " ").trim().slice(0, 18);
      if (v) D.names[i.dataset.nome] = v; else delete D.names[i.dataset.nome];
      var a = plantel().filter(function (x) { return x.id === +i.dataset.nome; })[0]; if (a && D.names[a.id] === a.name) delete D.names[a.id]; mostrar();
    };
  });
  $("[data-num]").forEach(function (i) {
    i.onchange = function () {
      var v = Math.floor(+i.value), a = plantel().filter(function (x) { return x.id === +i.dataset.num; })[0];
      if (v === a.num) delete D.nums[a.id]; else D.nums[a.id] = v; mostrar();
    };
  });
  /* equipamentos */
  $("[data-kq]").forEach(function (b) { b.onclick = function () { KITSEL = b.dataset.kq; mostrar(); }; });
  $("[data-ku]").forEach(function (b) { b.onclick = function () { D.kitUse = b.dataset.ku; mostrar(); }; });
  var edita = function (campo, valor) {
    var k = clone(kitDe(D, KITSEL)); k[campo] = valor; k.custom = true; D.kits[KITSEL] = k; pvAplicar(); atualizarKitUI();
  };
  [["kShirt", "shirt"], ["kShorts", "shorts"], ["kSocks", "socks"], ["kAcc", "accent"]].forEach(function (p) {
    var inp = el(p[0]); if (!inp) return;
    inp.oninput = function () { edita(p[1], inp.value); };
    var sw = inp.parentNode; sw.querySelectorAll(".c94-cor").forEach(function (b) { b.onclick = function () { inp.value = b.dataset.c; edita(p[1], b.dataset.c); }; });
  });
  var kp = el("kPat"); if (kp) kp.onchange = function () { edita("pattern", +kp.value); };
  var pn = el("pvNum"); if (pn) pn.onchange = function () { PREVNUM = +pn.value; pvAplicar(); };
  /* táticas */
  var tl = el("tLinha"); if (tl) {
    var mudou = function () { D.tac = { line: +el("tLinha").value / 100, support: +el("tApoio").value / 100, pressao: +el("tPress").value / 100 }; atualizarTac(); };
    ["tLinha", "tApoio", "tPress"].forEach(function (i) { el(i).oninput = mudou; });
  }
  /* barra */
  el("clGuardar").onclick = function () { if (guardar()) mostrar(); };
  el("clRepor").onclick = function () { repor(); mostrar(); };
}
function atualizarTac() {
  var v = valoresTac(), e = function (i, t) { var n = document.getElementById(i); if (n && n.nextElementSibling) n.nextElementSibling.textContent = t; };
  e("tLinha", (v.line >= 0 ? "+" : "") + Math.round(v.line * 100)); e("tApoio", (v.support >= 0 ? "+" : "") + Math.round(v.support * 100)); e("tPress", Math.round(v.pressao * 100) + "%");
  barraEstado();
}
function atualizarKitUI() {
  var st = document.getElementById("pvEstado"); if (st) st.textContent = "Equipamento personalizado";
  document.querySelectorAll(".c94-sw").forEach(function (sw) {
    var inp = sw.querySelector("input"); sw.querySelectorAll(".c94-cor").forEach(function (b) { b.classList.toggle("sel", b.dataset.c.toLowerCase() === inp.value.toLowerCase()); });
  });
  barraEstado();
}
function barraEstado() {
  var g = document.getElementById("clGuardar"), m = document.querySelector(".c94-msg"), er = erros(), s = sujo();
  if (g) g.disabled = !s || er.length > 0;
  if (m) { m.textContent = er[0] || (s ? "Alterações por guardar." : MSG); m.classList.toggle("erro", er.length > 0); }
}
function repor() {
  if (TAB === "equipa") { D.form = "221"; D.lineup = {}; D.tactic = "bal"; D.tac = null; SEL = 0; }
  else if (TAB === "plantel") { D.names = {}; D.nums = {}; BUSCA = ""; }
  else if (TAB === "kit") { delete D.kits[KITSEL]; if (KITSEL === "home") D.kitUse = D.kitUse; }
  else { D.tactic = "bal"; D.tac = null; D.diff = "normal"; }
}

/* ---------- pré-visualização 3D (um só renderizador, libertado ao sair do separador) ---------- */
function pvParar() {
  if (!PV) return;
  PV.parado = true; cancelAnimationFrame(PV.raf); clearInterval(PV.espera);
  try { if (PV.ro) PV.ro.disconnect(); PV.solid.forEach(function (m) { m.dispose(); }); PV.renderer.dispose(); PV.renderer.forceContextLoss(); } catch (e) {}
  PV = null;
}
function pvMsg(t) { var m = document.getElementById("pvMsg"); if (m) { m.textContent = t || ""; m.style.display = t ? "grid" : "none"; } }
function pvIniciar() {
  var cv = document.getElementById("pvCanvas"), box = document.getElementById("pvBox"); if (!cv) return;
  var fim = function (t) { pvMsg(t); var k = kitDe(D, KITSEL); box.insertAdjacentHTML("beforeend", '<div class="c94-pvfb">' + kitSvg(k, 150) + '</div>'); };
  var GLBM = window.__GLBM, GL = window.__glb;
  if (!GL || !GLBM || !window.THREE || !THREE.SkeletonUtils) { fim("Pré-visualização 3D indisponível. A mostrar a miniatura."); return; }
  if (GLBM.state === "idle") GL.load();
  if (GLBM.state === "off") { fim("O modelo 3D não carregou. A mostrar a miniatura."); return; }
  pvMsg("A carregar o modelo 3D…");
  var tent = 0, tick = function () {
    if (GLBM.state === "ready") { clearInterval(esp); try { pvCriar(cv, box); } catch (e) { console.warn("pré-visualização:", e); pvParar(); fim("Não foi possível criar a vista 3D."); } }
    else if (GLBM.state === "off" || ++tent > 100) { clearInterval(esp); fim("O modelo 3D não carregou. A mostrar a miniatura."); }
  };
  var esp = setInterval(tick, 150); PV = { espera: esp, solid: [], parado: false }; tick();
}
function pvCriar(cv, box) {
  var GLBM = window.__GLBM, T3 = THREE, antigo = PV; PV = null;
  var renderer = new T3.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  var scene = new T3.Scene(), cam = new T3.PerspectiveCamera(28, 1, 1, 400);
  scene.add(new T3.HemisphereLight(0xeaf5ff, 0x6f8f66, .85)); var sun = new T3.DirectionalLight(0xfff4dc, .75); sun.position.set(30, 60, 50); scene.add(sun);
  var base = new T3.Mesh(new T3.CylinderGeometry(11, 11, .6, 40), new T3.MeshLambertMaterial({ color: 0x0b1c2c })); base.position.y = -.3; scene.add(base);
  var pivot = new T3.Group(), root = T3.SkeletonUtils.clone(GLBM.proto), grp = new T3.Group();
  root.scale.setScalar(GLBM.scale); root.position.y = GLBM.yoff; grp.add(root); pivot.add(grp); scene.add(pivot);
  var meshes = {}; root.traverse(function (o) { if (o.isMesh || o.isSkinnedMesh) { o.frustumCulled = false; meshes[o.name] = o; } });
  var mixer = new T3.AnimationMixer(root), clip = GLBM.clips.Idle_Atento || GLBM.clips.Idle_Respirar;
  if (clip) mixer.clipAction(clip).play();
  var mk = function (c) { return new T3.MeshLambertMaterial({ color: new T3.Color(c), emissive: 0x1a1a1a }); };
  PV = { renderer: renderer, scene: scene, cam: cam, pivot: pivot, h: { gl: { meshes: meshes, bones: {}, mixer: mixer, act: {}, cur: null, root: grp } }, mixer: mixer, solid: [mk("#fff"), mk("#fff"), mk("#fff")], rot: 0, alvo: 0, auto: false, parado: false, relogio: new T3.Clock() };
  var tam = function () {
    var w = box.clientWidth, h = box.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h; var dist = (GLBM.H * 1.25) / (2 * Math.tan(cam.fov * Math.PI / 360)) / Math.min(1, cam.aspect * 1.4);
    cam.position.set(0, GLBM.H * .52, dist); cam.lookAt(0, GLBM.H * .5, 0); cam.updateProjectionMatrix();
  };
  tam(); if (window.ResizeObserver) { PV.ro = new ResizeObserver(tam); PV.ro.observe(box); }
  /* rodar a arrastar */
  var down = false, lx = 0;
  cv.onpointerdown = function (e) { down = true; lx = e.clientX; PV.auto = false; try { cv.setPointerCapture(e.pointerId); } catch (x) {} };
  cv.onpointermove = function (e) { if (down) { PV.alvo += (e.clientX - lx) * .012; lx = e.clientX; } };
  cv.onpointerup = cv.onpointercancel = function () { down = false; };
  document.getElementById("pvF").onclick = function () { PV.auto = false; PV.alvo = 0; };
  document.getElementById("pvC").onclick = function () { PV.auto = false; PV.alvo = Math.PI; };
  document.getElementById("pvR").onclick = function () { PV.auto = !PV.auto; };
  pvMsg(""); pvAplicar();
  var laco = function () {
    if (!PV || PV.parado) return;
    var dt = Math.min(.05, PV.relogio.getDelta()); if (PV.auto) PV.alvo += dt * .9;
    PV.rot += (PV.alvo - PV.rot) * Math.min(1, dt * 10); PV.pivot.rotation.y = PV.rot; PV.mixer.update(dt);
    PV.renderer.render(PV.scene, PV.cam); PV.raf = requestAnimationFrame(laco);
  };
  laco();
}
function pvAplicar() {
  if (!PV || !PV.h) return;
  var glbLook = window.__glb.look;
  var t = equipa(), k = kitDe(D, KITSEL), a = plantel().filter(function (x) { return x.id === PREVNUM; })[0], meshes = PV.h.gl.meshes;
  glbLook(PV.h, { code: t.s, kit: { custom: false }, num: a ? numD(a) : 10 });                 // base oficial (textura da equipa) e número
  if (k.custom) {
    var cores = { Camisola: k.shirt, Calcoes: k.shorts, Meias: k.socks }, i = 0;
    for (var n in cores) { PV.solid[i].color.set(cores[n]); if (meshes[n]) meshes[n].material = PV.solid[i]; i++; }
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
  var k = kitDe(CL, CL.kitUse === "away" ? "away" : "home");
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

window.G94 = Object.assign(window.G94 || {}, { showClube: function () { if (CL.team != null) abrirRascunho(); mostrar(); }, clubeRecarregar: recarregar, clube: function () { return CL; }, _draft: function () { return D; } });
})();
