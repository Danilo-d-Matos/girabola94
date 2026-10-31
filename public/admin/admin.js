/* Girabola 94 — área de administração. Fala com a API /admin do servidor; nunca insere dados como HTML (só textContent). */
(function () {
"use strict";
var $ = function (s, r) { return (r || document).querySelector(s); };
var API = (localStorage.getItem("g94admin.api") || "").replace(/\/+$/, ""), TOKEN = sessionStorage.getItem("g94admin.token") || "", EMAIL = sessionStorage.getItem("g94admin.email") || "";

/* ---------- utilitários ---------- */
function h(tag, attrs) {
  var e = document.createElement(tag);
  if (attrs) for (var k in attrs) { var v = attrs[k]; if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v); else if (k === "value") e.value = v; else e.setAttribute(k, v === true ? "" : v); }
  for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c == null || c === false) continue; if (Array.isArray(c)) c.forEach(function (x) { if (x != null) e.append(x.nodeType ? x : String(x)); }); else e.append(c.nodeType ? c : String(c)); }
  return e;
}
var toastT;
function aviso(t, mau) { var e = $("#toast"); e.textContent = t; e.className = "toast ver" + (mau ? " mau" : ""); clearTimeout(toastT); toastT = setTimeout(function () { e.className = "toast"; }, mau ? 5000 : 2600); }
function data(s) { if (!s) return "–"; var d = new Date(s); return isNaN(d) ? "–" : d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" }); }
function sair(msg) { TOKEN = ""; sessionStorage.removeItem("g94admin.token"); mostrarLogin(msg); }
async function api(metodo, caminho, corpo, cab) {
  var o = { method: metodo, headers: Object.assign({}, TOKEN ? { Authorization: "Bearer " + TOKEN } : {}, cab || {}) };
  if (corpo !== undefined) { if (corpo instanceof Blob || corpo instanceof ArrayBuffer) { o.body = corpo; o.headers["Content-Type"] = "application/octet-stream"; } else { o.body = JSON.stringify(corpo); o.headers["Content-Type"] = "application/json"; } }
  var r; try { r = await fetch(API + caminho, o); } catch (e) { throw new Error("Não foi possível ligar ao servidor (" + API + ")."); }
  var j = null; try { j = await r.json(); } catch (e) { /* sem corpo */ }
  if (r.status === 401 && caminho.indexOf("/conta/") !== 0) { sair("A sessão terminou. Entra de novo."); throw new Error("Sessão terminada."); }
  if (!r.ok) throw new Error((j && j.erro) || "Erro " + r.status);
  return j;
}

/* ---------- popups ----------
   #dlg   = formulários (editar/criar); #dlg2 = avisos e confirmações, por cima de tudo.
   pergunta(): confirmação de segurança (devolve true/false). popup(): aviso de sucesso, erro ou informação. */
var ICONE = { ok: "✔", erro: "✖", aviso: "⚠", info: "ℹ", pergunta: "?" };
function abrirPop(tipo, titulo, corpo, botoes) {
  return new Promise(function (resolve) {
    var d = $("#dlg2"), f = $("#dlg2Form"); f.textContent = "";
    var rod = h("div", { class: "rodape" }), padrao = null;
    botoes.forEach(function (b) {
      var bt = h("button", { class: "btn " + (b.cls || ""), type: "button", onclick: function () { d._res = b.val; d.close(); } }, b.txt);
      if (b.foco) padrao = bt; rod.append(bt);
    });
    f.append(h("div", { class: "pop-ic " + tipo, "aria-hidden": "true" }, ICONE[tipo] || "ℹ"), h("h2", { id: "dlg2T" }, titulo), corpo, rod);
    d.setAttribute("aria-labelledby", "dlg2T"); d._res = null;
    var fim = function () { d.removeEventListener("close", fim); resolve(d._res); };
    d.addEventListener("close", fim); d.showModal(); if (padrao) padrao.focus();
  });
}
function textoPop(t) { return h("div", { class: "pop-txt" }, Array.isArray(t) ? t.map(function (l) { return h("p", null, l); }) : h("p", null, t)); }
/** confirmação: o botão perigoso nunca fica em foco por omissão */
async function pergunta(titulo, texto, o) {
  o = o || {};
  var r = await abrirPop(o.perigo ? "aviso" : "pergunta", titulo, textoPop(texto), [{ txt: o.cancelar || "Cancelar", cls: "ghost", val: false, foco: true }, { txt: o.rotulo || "Confirmar", cls: o.perigo ? "mau" : "", val: true }]);
  return r === true;
}
function popup(tipo, titulo, texto) { return abrirPop(tipo, titulo, textoPop(texto), [{ txt: "Fechar", val: true, foco: true }]); }
/** executa uma ação da API com confirmação prévia e aviso de erro/sucesso. o: {titulo, texto, rotulo, perigo, fazer, sucesso, popupOk} */
async function acao(o) {
  if (o.titulo && !(await pergunta(o.titulo, o.texto, { rotulo: o.rotulo, perigo: o.perigo }))) return undefined;
  try {
    var r = await o.fazer();
    if (o.popupOk) await popup("ok", o.sucesso || "Concluído", typeof o.popupOk === "string" ? o.popupOk : "A operação foi concluída."); else if (o.sucesso) aviso(o.sucesso);
    return r === undefined ? true : r;
  } catch (e) { if (e.message !== "Sessão terminada.") await popup("erro", "Não foi possível concluir", e.message); return undefined; }
}
/** versão sem confirmação (leituras e ações triviais) */
async function tenta(fn, okMsg) { try { var r = await fn(); if (okMsg) aviso(okMsg); return r; } catch (e) { if (e.message !== "Sessão terminada.") await popup("erro", "Erro", e.message); return undefined; } }

/* diálogo de formulário. Botões: {txt, cls, val, cancel, valida, confirma:{titulo,texto,rotulo}, fn}. Fechar com alterações por guardar pede confirmação. */
function dialogo(titulo, corpo, botoes) {
  return new Promise(function (resolve) {
    var f = $("#dlgForm"), d = $("#dlg"), sujo = false, ocupado = false; f.textContent = "";
    f.oninput = f.onchange = function () { sujo = true; };
    var rod = h("div", { class: "rodape" });
    async function cancelar(b) {
      if (ocupado) return; ocupado = true;
      try { if (sujo && !(await pergunta("Descartar alterações?", "Tens alterações por guardar. Se saíres agora, perdem-se.", { rotulo: "Descartar", cancelar: "Continuar a editar", perigo: true }))) return; d.close(); resolve(b ? b.val : false); }
      finally { ocupado = false; }
    }
    async function aceitar(b) {
      if (ocupado) return; ocupado = true;
      try {
        if (b.valida) { var erro = b.valida(); if (erro) { await popup("aviso", "Falta preencher", erro); return; } }
        var cf = b.confirma;
        if (cf && !(await pergunta(cf.titulo, typeof cf.texto === "function" ? cf.texto() : cf.texto, { rotulo: cf.rotulo, perigo: cf.perigo }))) return;
        var r = b.fn ? await b.fn() : true; if (r === false) return; sujo = false; d.close(); resolve(b.val);
      } finally { ocupado = false; }
    }
    var canc = null;
    botoes.forEach(function (b) { if (b.cancel) canc = b; rod.append(h("button", { class: "btn " + (b.cls || ""), type: "button", onclick: function () { if (b.cancel) cancelar(b); else aceitar(b); } }, b.txt)); });
    d.oncancel = function (e) { e.preventDefault(); cancelar(canc); };
    f.append(h("h2", null, titulo), corpo, rod);
    var fim = function () { d.removeEventListener("close", fim); resolve(null); }; d.addEventListener("close", fim);
    d.showModal();
  });
}
function suja() { $("#dlgForm").dispatchEvent(new Event("input", { bubbles: true })); }
var CANCELAR = { txt: "Cancelar", cls: "ghost", val: false, cancel: true };
/** lista de apoio para o diálogo de informação (sem alterações) */
function fecharSo(titulo, corpo) { return dialogo(titulo, corpo, [{ txt: "Fechar", val: true }]); }

/* ---------- entrada ---------- */
/* o endereço do servidor descobre-se sozinho: admin/servidor.json (gerado no build) ou a mesma máquina, porta 2567 */
async function descobrirApi() {
  try { var r = await fetch("servidor.json", { cache: "no-store" }); if (r.ok) { var j = await r.json(); if (j.url) return String(j.url).replace(/^wss:/, "https:").replace(/^ws:/, "http:").replace(/\/+$/, ""); } } catch (e) { /* sem ficheiro */ }
  return location.protocol + "//" + (location.hostname || "localhost") + ":2567";
}
function mostrarLogin(msg) { $("#app").hidden = true; $("#login").hidden = false; $("#lApi").value = API; if (msg && /ligar ao servidor/i.test(msg)) $("#lAv").open = true; $("#lEmail").value = EMAIL; $("#lErro").textContent = msg || ""; }
$("#fLogin").addEventListener("submit", async function (e) {
  e.preventDefault(); var erro = $("#lErro"); erro.textContent = "";
  API = $("#lApi").value.trim().replace(/\/+$/, "") || await descobrirApi(); $("#lApi").value = API; EMAIL = $("#lEmail").value.trim().toLowerCase();
  try {
    var r = await fetch(API + "/conta/entrar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, senha: $("#lSenha").value }) });
    var j = await r.json(); if (!r.ok) throw new Error(j.erro || "Erro " + r.status);
    TOKEN = j.token; await api("GET", "/admin/eu");
    localStorage.setItem("g94admin.api", API); sessionStorage.setItem("g94admin.token", TOKEN); sessionStorage.setItem("g94admin.email", EMAIL);
    $("#lSenha").value = ""; iniciar();
  } catch (x) { TOKEN = ""; erro.textContent = x.message === "Failed to fetch" ? "Não foi possível ligar ao servidor." : x.message; }
});
$("#bSair").addEventListener("click", async function () {
  if (!(await pergunta("Terminar sessão", "Queres sair da área de administração?", { rotulo: "Sair" }))) return;
  try { await api("DELETE", "/conta/sessao"); } catch (e) { /* sessão já inválida */ } sair("");
});
$("#bMenu").addEventListener("click", function () { $("#nav").classList.toggle("aberta"); });
$("#nav").addEventListener("click", function (e) { var b = e.target.closest("button[data-v]"); if (b) { vista(b.dataset.v); $("#nav").classList.remove("aberta"); } });

var VISTAS = {}, atual = "painel", temporizador = null;
function vista(nome) {
  atual = nome; clearInterval(temporizador); temporizador = null;
  document.querySelectorAll("#nav button").forEach(function (b) { b.removeAttribute("aria-current"); if (b.dataset.v === nome) b.setAttribute("aria-current", "page"); });
  var m = $("#main"); m.textContent = ""; m.append(h("p", { class: "vazio" }, "A carregar…"));
  Promise.resolve(VISTAS[nome](m)).catch(function (e) { m.textContent = ""; m.append(h("p", { class: "erro" }, e.message)); });
}
function iniciar() { $("#login").hidden = true; $("#app").hidden = false; $("#tEmail").textContent = EMAIL; vista("painel"); }
function secao(m, titulo) { m.textContent = ""; m.append(h("h2", null, titulo)); }
function tabela(cols, linhas, vazio) {
  if (!linhas.length) return h("p", { class: "vazio" }, vazio || "Sem resultados.");
  return h("div", { class: "scroll" }, h("table", { class: "tabela" }, h("thead", null, h("tr", null, cols.map(function (c) { return h("th", { class: c.num ? "num" : "" }, c.t); }))),
    h("tbody", null, linhas.map(function (l) { return h("tr", null, cols.map(function (c) { var v = c.f(l); return h("td", { class: c.num ? "num" : "" }, v); })); }))));
}
function paginacao(r, ir) {
  var n = Math.max(1, Math.ceil(r.total / r.porPagina));
  return h("div", { class: "pag" }, h("span", null, r.total + " no total · página " + (r.pagina + 1) + " de " + n),
    h("button", { class: "btn ghost peq", type: "button", disabled: r.pagina <= 0, onclick: function () { ir(r.pagina - 1); } }, "Anterior"),
    h("button", { class: "btn ghost peq", type: "button", disabled: r.pagina + 1 >= n, onclick: function () { ir(r.pagina + 1); } }, "Seguinte"));
}
function btn(txt, fn, cls) { return h("button", { class: "btn " + (cls || "ghost peq"), type: "button", onclick: fn }, txt); }

/* ---------- painel ---------- */
VISTAS.painel = async function (m) {
  async function ler() {
    var r = await api("GET", "/admin/resumo"); if (atual !== "painel") return;
    var k = function (v, t) { return h("div", { class: "kpi" }, h("b", null, v == null ? "–" : v), h("span", null, t)); };
    secao(m, "Painel");
    m.append(h("div", { class: "grelha" }, k(r.servidor.online, "jogadores online"), k(r.servidor.partidasAtivas, "partidas a decorrer"), k(r.ultimas24h.partidas, "partidas nas últimas 24 h"), k(r.ultimas24h.contasNovas, "contas novas nas últimas 24 h")));
    m.append(h("div", { class: "grelha" }, k(r.totais.contas, "contas"), k(r.totais.jogadores, "perfis online"), k(r.totais.partidas, "partidas jogadas"), k(r.totais.musicas, "músicas (ligações)"), k(r.totais.clubesNovos + " / " + r.totais.clubesEditados, "clubes novos / editados")));
    m.append(h("h3", null, "Servidor"), h("div", { class: "painel" }, "Região " + r.servidor.regiao + " · versão do cliente " + r.servidor.versao + " · memória " + r.servidor.memoriaMB + " MB · ping médio " + (r.servidor.pingMedio == null ? "–" : r.servidor.pingMedio + " ms") + " · iniciadas " + r.servidor.iniciadas + " / terminadas " + r.servidor.terminadas + " · erros " + r.servidor.erros));
    m.append(h("h3", null, "Top 5 do ranking"), tabela([{ t: "#", f: function (l) { return r.topo.indexOf(l) + 1; } }, { t: "Jogador", f: function (l) { return l.nome; } }, { t: "ELO", num: 1, f: function (l) { return l.elo; } }, { t: "Jogos", num: 1, f: function (l) { return l.jogos; } }], r.topo, "Ainda não há jogos classificados."));
  }
  await ler(); temporizador = setInterval(function () { ler().catch(function () {}); }, 15000);
};

/* ---------- ranking e jogadores ---------- */
VISTAS.ranking = async function (m) {
  var est = { q: "", ordem: "elo", pag: 0 };
  async function carregar() {
    var r = await api("GET", "/admin/jogadores?q=" + encodeURIComponent(est.q) + "&ordem=" + est.ordem + "&pag=" + est.pag); if (atual !== "ranking") return;
    corpo.textContent = "";
    corpo.append(tabela([
      { t: "#", num: 1, f: function (l) { return est.pag * r.porPagina + r.linhas.indexOf(l) + 1; } },
      { t: "Jogador", f: function (l) { return h("span", null, l.nome, l.banido ? h("span", { class: "etq mau" }, " banido") : null); } },
      { t: "Conta", f: function (l) { return l.email || "–"; } },
      { t: "ELO", num: 1, f: function (l) { return l.elo; } }, { t: "J", num: 1, f: function (l) { return l.jogos; } }, { t: "V", num: 1, f: function (l) { return l.vitorias; } }, { t: "E", num: 1, f: function (l) { return l.empates; } }, { t: "D", num: 1, f: function (l) { return l.derrotas; } }, { t: "Aband.", num: 1, f: function (l) { return l.abandonos; } },
      { t: "", f: function (l) { return h("div", { class: "acoes" },
        btn("Editar", function () { editarJogador(l); }),
        btn("Repor", async function () { if (await acao({ titulo: "Repor estatísticas", texto: "Repor o ELO (1000) e os resultados de " + l.nome + "? Não dá para desfazer.", rotulo: "Repor", perigo: true, sucesso: "Estatísticas repostas.", fazer: function () { return api("POST", "/admin/jogadores/" + encodeURIComponent(l.id) + "/repor"); } })) carregar(); }),
        btn(l.banido ? "Readmitir" : "Banir", async function () {
          var ban = !l.banido;
          if (await acao({ titulo: ban ? "Banir do ranking" : "Readmitir no ranking", texto: ban ? l.nome + " deixa de aparecer no ranking e de somar pontos." : l.nome + " volta a aparecer no ranking.", rotulo: ban ? "Banir" : "Readmitir", perigo: ban, sucesso: ban ? "Jogador banido do ranking." : "Jogador readmitido.", fazer: function () { return api("PUT", "/admin/jogadores/" + encodeURIComponent(l.id), { banido: ban }); } })) carregar();
        })); } }
    ], r.linhas, "Nenhum jogador encontrado."), paginacao(r, function (p) { est.pag = p; carregar(); }));
  }
  function editarJogador(l) {
    var nome = h("input", { value: l.nome, maxlength: 16 }), elo = h("input", { type: "number", value: l.elo, min: 100, max: 4000 }), club = h("input", { type: "number", value: l.club, min: 0, max: 99 });
    dialogo("Editar jogador", h("div", { class: "grid" }, h("label", null, "Nome", nome), h("div", { class: "linha2" }, h("label", null, "ELO", elo), h("label", null, "Clube (índice)", club))),
      [CANCELAR, { txt: "Guardar", val: true,
        valida: function () { if (nome.value.trim().length < 2) return "O nome do jogador precisa de pelo menos 2 letras."; if (!(+elo.value >= 100 && +elo.value <= 4000)) return "O ELO tem de estar entre 100 e 4000."; return ""; },
        confirma: { titulo: "Guardar alterações?", texto: "Vais alterar os dados de " + l.nome + " (nome, ELO e clube). A alteração fica registada na auditoria.", rotulo: "Guardar" },
        fn: async function () { var r = await acao({ sucesso: "Jogador guardado.", fazer: function () { return api("PUT", "/admin/jogadores/" + encodeURIComponent(l.id), { nome: nome.value, elo: +elo.value, club: +club.value }); } }); if (r === undefined) return false; carregar(); } }]);
  }
  secao(m, "Ranking e jogadores");
  var q = h("input", { type: "search", placeholder: "Nome do jogador", value: est.q }), ord = h("select", null, h("option", { value: "elo" }, "ELO"), h("option", { value: "jogos" }, "Jogos"), h("option", { value: "nome" }, "Nome"), h("option", { value: "novo" }, "Mais recentes"));
  var corpo = h("div");
  q.addEventListener("input", function () { clearTimeout(q._t); q._t = setTimeout(function () { est.q = q.value; est.pag = 0; carregar(); }, 300); });
  ord.addEventListener("change", function () { est.ordem = ord.value; est.pag = 0; carregar(); });
  m.append(h("div", { class: "barra" }, h("label", null, "Pesquisar", q), h("label", null, "Ordenar por", ord),
    btn("Épocas arquivadas", histRanking, "ghost"), btn("Nova época (repor ranking)", reporRanking, "mau")), corpo);
  async function reporRanking() {
    var ep = h("input", { placeholder: "Ex.: Época 2026/27", maxlength: 40 }), cf = h("input", { placeholder: "Escreve REPOR", autocomplete: "off" });
    dialogo("Nova época", h("div", { class: "grid" }, h("p", null, "O top 100 atual fica arquivado e todos os jogadores voltam a 1000 de ELO, com os resultados a zero. Não dá para desfazer."), h("label", null, "Nome da época", ep), h("label", null, "Confirmação", cf)),
      [CANCELAR, { txt: "Repor ranking", cls: "mau", val: true,
        valida: function () { if (cf.value.trim() !== "REPOR") return "Escreve REPOR no campo de confirmação."; return ""; },
        confirma: { titulo: "Última confirmação", texto: ["Todos os jogadores vão voltar a 1000 de ELO.", "Tens a certeza?"], rotulo: "Sim, repor tudo", perigo: true },
        fn: async function () { var r = await acao({ fazer: function () { return api("POST", "/admin/ranking/repor", { epoca: ep.value, confirmar: cf.value }); } }); if (r === undefined) return false; await popup("ok", "Ranking reposto", "Foram arquivados " + r.arquivados + " jogadores."); carregar(); } }]);
  }
  async function histRanking() {
    var r = await tenta(function () { return api("GET", "/admin/ranking/historico"); }); if (!r) return;
    fecharSo("Épocas arquivadas", h("div", null, r.length ? r.map(function (e) { return h("div", null, h("h3", null, e.epoca + " · " + data(e.criado)), tabela([{ t: "#", f: function (l) { return e.top.indexOf(l) + 1; } }, { t: "Jogador", f: function (l) { return l.nome; } }, { t: "ELO", num: 1, f: function (l) { return l.elo; } }, { t: "J", num: 1, f: function (l) { return l.jogos; } }], e.top)); }) : h("p", { class: "vazio" }, "Ainda não há épocas arquivadas.")));
  }
  await carregar();
};

/* ---------- contas ---------- */
VISTAS.contas = async function (m) {
  var est = { q: "", pag: 0 };
  async function carregar() {
    var r = await api("GET", "/admin/contas?q=" + encodeURIComponent(est.q) + "&pag=" + est.pag); if (atual !== "contas") return;
    corpo.textContent = "";
    corpo.append(tabela([
      { t: "Email", f: function (l) { return l.email; } }, { t: "Jogador", f: function (l) { return l.nome || "–"; } }, { t: "ELO", num: 1, f: function (l) { return l.elo == null ? "–" : l.elo; } }, { t: "Jogos", num: 1, f: function (l) { return l.jogos == null ? "–" : l.jogos; } },
      { t: "Criada", f: function (l) { return data(l.criado); } }, { t: "Progresso", f: function (l) { return l.progresso ? data(l.progresso) : "–"; } },
      { t: "Estado", f: function (l) { return h("span", { class: "etq " + (l.bloqueada ? "mau" : "ok") }, l.bloqueada ? "bloqueada" : "ativa"); } },
      { t: "", f: function (l) { return h("div", { class: "acoes" },
        btn(l.bloqueada ? "Desbloquear" : "Bloquear", async function () {
          var bl = !l.bloqueada;
          if (await acao({ titulo: bl ? "Bloquear conta" : "Desbloquear conta", texto: bl ? "A conta " + l.email + " fica sem acesso e as sessões abertas terminam." : "A conta " + l.email + " volta a poder entrar.", rotulo: bl ? "Bloquear" : "Desbloquear", perigo: bl, sucesso: bl ? "Conta bloqueada." : "Conta desbloqueada.", fazer: function () { return api("PUT", "/admin/contas/" + l.id, { bloqueada: bl }); } })) carregar();
        }),
        btn("Terminar sessões", function () { acao({ titulo: "Terminar sessões", texto: "A conta " + l.email + " vai ter de entrar de novo em todos os dispositivos.", rotulo: "Terminar", perigo: true, fazer: async function () { var r2 = await api("POST", "/admin/contas/" + l.id + "/terminar-sessoes"); aviso("Sessões terminadas: " + r2.terminadas); } }); }),
        btn("Apagar", async function () { if (await acao({ titulo: "Apagar conta", texto: ["Apagar definitivamente a conta " + l.email + " e o seu progresso guardado?", "O perfil de ranking mantém-se. Não dá para desfazer."], rotulo: "Apagar", perigo: true, sucesso: "Conta apagada.", fazer: function () { return api("DELETE", "/admin/contas/" + l.id); } })) carregar(); }, "mau peq")); } }
    ], r.linhas, "Nenhuma conta encontrada."), paginacao(r, function (p) { est.pag = p; carregar(); }));
  }
  secao(m, "Contas");
  var q = h("input", { type: "search", placeholder: "Email" }), corpo = h("div");
  q.addEventListener("input", function () { clearTimeout(q._t); q._t = setTimeout(function () { est.q = q.value; est.pag = 0; carregar(); }, 300); });
  m.append(h("div", { class: "barra" }, h("label", null, "Pesquisar", q)), corpo); await carregar();
};

/* ---------- partidas ---------- */
VISTAS.partidas = async function (m) {
  var pag = 0; secao(m, "Partidas online"); var corpo = h("div"); m.append(corpo);
  async function carregar() {
    var r = await api("GET", "/admin/partidas?pag=" + pag); if (atual !== "partidas") return; corpo.textContent = "";
    corpo.append(tabela([{ t: "Quando", f: function (l) { return data(l.fim); } }, { t: "Casa", f: function (l) { return l.casa || "–"; } }, { t: "Resultado", f: function (l) { return l.gc + " – " + l.gf; } }, { t: "Fora", f: function (l) { return l.fora || "–"; } }, { t: "Estádio", f: function (l) { return l.estadio || "–"; } }, { t: "Motivo", f: function (l) { return l.motivo || "–"; } }, { t: "Duração", num: 1, f: function (l) { return l.duracao + " s"; } }], r.linhas, "Ainda não há partidas registadas."), paginacao(r, function (p) { pag = p; carregar(); }));
  }
  await carregar();
};

/* ---------- músicas (ligações do YouTube e do Spotify) ---------- */
var USO = { ambos: "Menus e jogo", menu: "Só menus", jogo: "Só jogo" }, PLAT = { youtube: "YouTube", spotify: "Spotify" }, TIPO = { video: "vídeo", playlist: "lista", track: "faixa", album: "álbum", episode: "episódio", show: "programa", artist: "artista" };
VISTAS.musicas = async function (m) {
  async function carregar() {
    var r = await api("GET", "/admin/musicas"); if (atual !== "musicas") return; lista.textContent = "";
    lista.append(tabela([
      { t: "Ordem", f: function (l) { return h("div", { class: "acoes" }, h("button", { class: "btn ghost peq", type: "button", "aria-label": "Subir", onclick: function () { mover(r, l, -1); } }, "▲"), h("button", { class: "btn ghost peq", type: "button", "aria-label": "Descer", onclick: function () { mover(r, l, 1); } }, "▼")); } },
      { t: "Título", f: function (l) { return h("span", null, l.titulo, l.artista ? h("div", { class: "nota" }, l.artista) : null); } },
      { t: "Origem", f: function (l) { return h("span", { class: "etq" }, (PLAT[l.plataforma] || l.plataforma) + " · " + (TIPO[l.tipo] || l.tipo)); } },
      { t: "Uso", f: function (l) { return USO[l.uso] || l.uso; } },
      { t: "Estado", f: function (l) { return h("span", { class: "etq " + (l.ativa ? "ok" : "") }, l.ativa ? "ativa" : "desligada"); } },
      { t: "", f: function (l) { return h("div", { class: "acoes" },
        /^https:\/\//.test(l.url) ? h("a", { class: "btn ghost peq", href: l.url, target: "_blank", rel: "noopener noreferrer" }, "Abrir") : null,
        btn("Editar", function () { editar(l); }),
        btn(l.ativa ? "Desligar" : "Ligar", async function () {
          var lig = !l.ativa;
          if (await acao({ titulo: lig ? "Ligar música" : "Desligar música", texto: lig ? "«" + l.titulo + "» passa a tocar no jogo." : "«" + l.titulo + "» deixa de tocar no jogo (fica guardada na lista).", rotulo: lig ? "Ligar" : "Desligar", perigo: !lig, sucesso: lig ? "Música ligada." : "Música desligada.", fazer: function () { return api("PUT", "/admin/musicas/" + l.id, { ativa: lig }); } })) carregar();
        }),
        btn("Apagar", async function () { if (await acao({ titulo: "Apagar música", texto: "Apagar «" + l.titulo + "» da lista? A música original no " + (PLAT[l.plataforma] || "serviço") + " não é afetada.", rotulo: "Apagar", perigo: true, sucesso: "Música apagada.", fazer: function () { return api("DELETE", "/admin/musicas/" + l.id); } })) carregar(); }, "mau peq")); } }
    ], r, "Ainda não há músicas. Cola uma ligação acima."));
  }
  async function mover(r, l, d) {
    var i = r.indexOf(l), j = i + d; if (j < 0 || j >= r.length) return;
    await tenta(async function () { var o1 = l.ordem, o2 = r[j].ordem; if (o1 === o2) o2 = o1 + d; await api("PUT", "/admin/musicas/" + l.id, { ordem: o2 }); await api("PUT", "/admin/musicas/" + r[j].id, { ordem: o1 }); }); carregar();
  }
  function editar(l) {
    var t = h("input", { value: l.titulo, maxlength: 80 }), a = h("input", { value: l.artista, maxlength: 80 }), u = h("select", null, Object.keys(USO).map(function (k) { return h("option", { value: k, selected: k === l.uso }, USO[k]); }));
    dialogo("Editar música", h("div", { class: "grid" }, h("label", null, "Título", t), h("label", null, "Artista", a), h("label", null, "Usar em", u)),
      [CANCELAR, { txt: "Guardar", val: true,
        valida: function () { return t.value.trim().length < 2 ? "O título precisa de pelo menos 2 letras." : ""; },
        confirma: { titulo: "Guardar alterações?", texto: "Atualizar os dados de «" + l.titulo + "».", rotulo: "Guardar" },
        fn: async function () { var r = await acao({ sucesso: "Música guardada.", fazer: function () { return api("PUT", "/admin/musicas/" + l.id, { titulo: t.value, artista: a.value, uso: u.value }); } }); if (r === undefined) return false; carregar(); } }]);
  }
  secao(m, "Músicas");
  var link = h("input", { type: "url", placeholder: "https://www.youtube.com/watch?v=… ou https://open.spotify.com/track/…", maxlength: 300, autocomplete: "off" }),
    t = h("input", { placeholder: "Título", maxlength: 80 }), a = h("input", { placeholder: "Artista (opcional)", maxlength: 80 }), u = h("select", null, Object.keys(USO).map(function (k) { return h("option", { value: k }, USO[k]); })),
    previa = h("div", { class: "previa", hidden: true }), estado = h("p", { class: "nota", role: "status" }), ok = h("button", { class: "btn", type: "submit", disabled: true }, "Adicionar à lista"), verif = h("button", { class: "btn ghost", type: "button" }, "Verificar ligação"), lido = null;
  async function verificar() {
    estado.textContent = ""; lido = null; ok.disabled = true; previa.hidden = true; previa.textContent = "";
    if (!link.value.trim()) { estado.textContent = "Cola primeiro uma ligação."; return; }
    verif.disabled = true; verif.textContent = "A verificar…";
    try {
      var r = await api("POST", "/admin/musicas/previa", { url: link.value.trim() }); lido = r;
      previa.append(r.miniatura ? h("img", { src: r.miniatura, alt: "", referrerpolicy: "no-referrer" }) : null, h("div", null, h("b", null, (PLAT[r.plataforma] || r.plataforma) + " · " + (TIPO[r.tipo] || r.tipo)), h("div", null, r.titulo || "(sem título automático — escreve-o abaixo)"), r.artista ? h("div", { class: "nota" }, r.artista) : null));
      previa.hidden = false; if (!t.value && r.titulo) t.value = r.titulo; if (!a.value && r.artista) a.value = r.artista; ok.disabled = false; estado.textContent = "Ligação reconhecida.";
    } catch (e) { if (e.message !== "Sessão terminada.") await popup("erro", "Ligação inválida", e.message); }
    verif.disabled = false; verif.textContent = "Verificar ligação";
  }
  verif.addEventListener("click", verificar); link.addEventListener("input", function () { ok.disabled = true; lido = null; });
  var form = h("form", { class: "painel" }, h("h3", null, "Adicionar música por ligação"),
    h("p", { class: "nota" }, "Cola uma ligação do YouTube (vídeo ou lista) ou do Spotify (faixa, álbum, lista ou episódio). O jogo mostra o leitor oficial da plataforma num cartão no canto do ecrã: no YouTube o volume segue a opção «Música»; no Spotify o jogador carrega em ▶ e ajusta o volume no leitor. Usa só conteúdo que podes divulgar."),
    h("label", null, "Ligação", link), h("div", { class: "barra" }, verif, estado), previa,
    h("div", { class: "linha3" }, h("label", null, "Título", t), h("label", null, "Artista", a), h("label", null, "Usar em", u)), h("div", { class: "rodape" }, ok));
  form.addEventListener("submit", async function (e) {
    e.preventDefault(); if (!lido) { await verificar(); if (!lido) return; }
    if (t.value.trim().length < 2) { await popup("aviso", "Falta preencher", "Indica o título da música."); return; }
    var r = await acao({ titulo: "Adicionar música", texto: ["Adicionar «" + t.value.trim() + "» (" + (PLAT[lido.plataforma] || lido.plataforma) + ") à lista de músicas do jogo?", "Passa a tocar para todos os jogadores no arranque seguinte."], rotulo: "Adicionar", sucesso: "Música adicionada.", fazer: function () { return api("POST", "/admin/musicas", { url: link.value.trim(), titulo: t.value, artista: a.value, uso: u.value }); } });
    if (r) { form.reset(); previa.hidden = true; previa.textContent = ""; lido = null; ok.disabled = true; estado.textContent = ""; carregar(); }
  });
  var lista = h("div"); m.append(form, lista); await carregar();
};

/* ---------- clubes ---------- */
var ESTILO = { posse: "Posse de bola", pressao: "Pressão alta", contra: "Contra-ataque" }, POS = { GK: "Guarda-redes", D: "Defesa", M: "Médio", F: "Avançado" };
var POS_ALIAS = { GK: "GK", GR: "GK", G: "GK", D: "D", DEF: "D", DF: "D", M: "M", MED: "M", MC: "M", F: "F", AV: "F", A: "F", ATA: "F" };
/** converte qualquer imagem para PNG 256×256 (transparente, sem deformar) para o emblema */
function emblemaPng(file) {
  return new Promise(function (resolve, reject) {
    var url = URL.createObjectURL(file), im = new Image();
    im.onload = function () {
      var c = document.createElement("canvas"); c.width = c.height = 256; var x = c.getContext("2d");
      var w = im.naturalWidth || im.width || 256, hh = im.naturalHeight || im.height || 256, s = Math.min(240 / w, 240 / hh), dw = w * s, dh = hh * s;
      x.drawImage(im, (256 - dw) / 2, (256 - dh) / 2, dw, dh); URL.revokeObjectURL(url);
      c.toBlob(function (b) { b ? resolve(b) : reject(new Error("Não foi possível converter a imagem.")); }, "image/png");
    };
    im.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Não foi possível ler a imagem. Usa PNG, JPG, WEBP ou SVG.")); };
    im.src = url;
  });
}
VISTAS.clubes = async function (m) {
  var cache = 0;
  function miniEmblema(id, tem) { return tem ? h("img", { class: "escudo", alt: "", src: API + "/emblemas/" + id + "?v=" + cache }) : null; }
  async function carregar() {
    var r = await api("GET", "/admin/clubes"); if (atual !== "clubes") return; corpo.textContent = ""; cache = Date.now();
    corpo.append(h("h3", null, "Clubes do jogo (" + r.base.length + ")"), h("p", { class: "nota" }, "Nos clubes de origem podes mudar quase tudo (nome, cores, emblema, plantel, informação…); a sigla fica fixa. A alteração chega ao jogo no arranque seguinte dos jogadores."),
      tabela([
        { t: "Clube", f: function (l) { var e = l.edicao || {}; return h("span", null, miniEmblema(e.id, e.temEmblema), " ", h("span", { class: "cor", style: "background:" + (e.c1 || l.origem.c1) }), " ", h("span", { class: "cor", style: "background:" + (e.c2 || l.origem.c2) }), " ", e.nome || l.origem.n, e.nome && e.nome !== l.origem.n ? h("span", { class: "nota" }, " (era " + l.origem.n + ")") : null); } },
        { t: "Sigla", f: function (l) { return l.origem.s; } }, { t: "Cidade", f: function (l) { return (l.edicao && l.edicao.extra && l.edicao.extra.cidade) || "–"; } },
        { t: "Força", num: 1, f: function (l) { return (l.edicao && l.edicao.forca) || l.origem.r; } },
        { t: "Estilo", f: function (l) { return ESTILO[(l.edicao && l.edicao.estilo) || l.origem.st]; } },
        { t: "Plantel", f: function (l) { return l.edicao && l.edicao.plantel && l.edicao.plantel.length ? l.edicao.plantel.length + " jogadores" : "de origem"; } },
        { t: "Estado", f: function (l) { return h("span", { class: "etq " + (l.edicao ? "ok" : "") }, l.edicao ? "editado" : "original"); } },
        { t: "", f: function (l) { return h("div", { class: "acoes" }, btn("Editar", function () { formClube(l.origem, l.edicao); }),
          l.edicao ? btn("Repor original", async function () { if (await acao({ titulo: "Repor clube", texto: "Voltar aos valores originais de " + l.origem.n + "? Perdes o emblema, o plantel e a informação que editaste.", rotulo: "Repor", perigo: true, sucesso: "Clube reposto.", fazer: function () { return api("DELETE", "/admin/clubes/base/" + l.origem.s); } })) carregar(); }) : null); } }
      ], r.base),
      h("h3", null, "Clubes novos (" + r.novos.length + ")"), h("p", { class: "nota" }, "Os clubes novos aparecem no jogo rápido; ficam fora da época e da taça, que têm 16 clubes fixos."),
      tabela([
        { t: "Clube", f: function (l) { return h("span", null, miniEmblema(l.id, l.temEmblema), " ", h("span", { class: "cor", style: "background:" + l.c1 }), " ", h("span", { class: "cor", style: "background:" + l.c2 }), " ", l.nome); } },
        { t: "Sigla", f: function (l) { return l.sigla; } }, { t: "Cidade", f: function (l) { return (l.extra && l.extra.cidade) || "–"; } }, { t: "Força", num: 1, f: function (l) { return l.forca; } }, { t: "Estilo", f: function (l) { return ESTILO[l.estilo]; } }, { t: "Plantel", f: function (l) { return l.plantel && l.plantel.length ? l.plantel.length + " jogadores" : "gerado pelo jogo"; } },
        { t: "Estado", f: function (l) { return h("span", { class: "etq " + (l.ativo ? "ok" : "") }, l.ativo ? "ativo" : "desligado"); } },
        { t: "", f: function (l) { return h("div", { class: "acoes" }, btn("Editar", function () { formClube(null, l); }),
          btn(l.ativo ? "Desligar" : "Ligar", async function () { var lig = !l.ativo; if (await acao({ titulo: lig ? "Ligar clube" : "Desligar clube", texto: lig ? l.nome + " volta a aparecer no jogo rápido." : l.nome + " deixa de aparecer no jogo (os dados ficam guardados).", rotulo: lig ? "Ligar" : "Desligar", perigo: !lig, sucesso: lig ? "Clube ligado." : "Clube desligado.", fazer: function () { return api("PUT", "/admin/clubes/" + l.id, { ativo: lig }); } })) carregar(); }),
          btn("Apagar", async function () { if (await acao({ titulo: "Apagar clube", texto: ["Apagar o clube " + l.nome + " e o seu emblema?", "Não dá para desfazer."], rotulo: "Apagar", perigo: true, sucesso: "Clube apagado.", fazer: function () { return api("DELETE", "/admin/clubes/" + l.id); } })) carregar(); }, "mau peq")); } }
      ], r.novos, "Ainda não criaste clubes novos."));
  }
  /* origem: clube de origem (edição) ou null; atual: edição/clube novo existente ou null */
  function formClube(origem, atual) {
    var eEdicao = !!origem, ex = (atual && atual.extra) || {}, al = (atual && atual.alt) || null;
    var v = function (k, d) { return atual && atual[k] != null ? atual[k] : (origem ? ({ nome: origem.n, forca: origem.r, c1: origem.c1, c2: origem.c2, estilo: origem.st, sigla: origem.s })[k] : d); };
    var F = {}; // campos
    F.nome = h("input", { value: v("nome", ""), maxlength: 32 }); F.sigla = h("input", { value: v("sigla", ""), maxlength: 4, disabled: !!origem || !!atual, style: "text-transform:uppercase" });
    F.forca = h("input", { type: "number", min: 40, max: 95, value: v("forca", 65) });
    F.estilo = h("select", null, Object.keys(ESTILO).map(function (k) { return h("option", { value: k, selected: k === v("estilo", "posse") }, ESTILO[k]); }));
    F.nomeCurto = h("input", { value: ex.nomeCurto || "", maxlength: 14 }); F.apelido = h("input", { value: ex.apelido || "", maxlength: 40, placeholder: "Ex.: Os Militares" });
    F.cidade = h("input", { value: ex.cidade || "", maxlength: 40 }); F.provincia = h("input", { value: ex.provincia || "", maxlength: 40 });
    F.fundacao = h("input", { type: "number", min: 1850, max: new Date().getFullYear(), value: ex.fundacao || "" }); F.estadio = h("input", { value: ex.estadio || "", maxlength: 60 });
    F.treinador = h("input", { value: ex.treinador || "", maxlength: 50 }); F.presidente = h("input", { value: ex.presidente || "", maxlength: 50 });
    F.site = h("input", { type: "url", value: ex.site || "", maxlength: 120, placeholder: "https://…" }); F.descricao = h("textarea", { rows: 3, maxlength: 400, placeholder: "História, símbolos, curiosidades…" }); F.descricao.value = ex.descricao || "";
    F.c1 = h("input", { type: "color", value: v("c1", "#2b7bd6") }); F.c2 = h("input", { type: "color", value: v("c2", "#ffffff") });
    var temAlt = h("input", { type: "checkbox" }); temAlt.checked = !!al;
    F.a1 = h("input", { type: "color", value: al ? al.camisola : "#ffffff" }); F.a2 = h("input", { type: "color", value: al ? al.detalhes : "#2b7bd6" }); F.a3 = h("input", { type: "color", value: al ? al.calcoes : "#2b7bd6" }); F.a4 = h("input", { type: "color", value: al ? al.meias : "#ffffff" });
    F.padrao = h("select", null, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return h("option", { value: n, selected: al ? al.padrao === n : n === 0 }, n === 0 ? "Liso" : "Padrão " + n); }));
    var altBox = h("div", { class: "linha3" }, h("label", null, "Camisola", F.a1), h("label", null, "Detalhes", F.a2), h("label", null, "Calções", F.a3), h("label", null, "Meias", F.a4), h("label", null, "Padrão", F.padrao)), kit = h("div", { class: "kit" });
    function desenhaKit() {
      altBox.hidden = !temAlt.checked; kit.textContent = "";
      function peca(c1, c2, rot) { return h("div", { class: "peca" }, h("span", { class: "cam", style: "background:" + c1 + ";border-color:" + c2 }), h("span", { class: "nota" }, rot)); }
      kit.append(peca(F.c1.value, F.c2.value, "Principal"));
      if (temAlt.checked) kit.append(peca(F.a1.value, F.a2.value, "Alternativo"));
    }
    [F.c1, F.c2, F.a1, F.a2, F.a3, F.a4, temAlt].forEach(function (e) { e.addEventListener("input", desenhaKit); }); desenhaKit();

    /* emblema */
    var emb = { blob: null, remover: false, url: (atual && atual.temEmblema) ? API + "/emblemas/" + atual.id + "?v=" + cache : "" };
    var embImg = h("img", { class: "emb-prev", alt: "Emblema" }), embInfo = h("p", { class: "nota" }), embFile = h("input", { type: "file", accept: "image/*", hidden: true }), zona = h("div", { class: "zona", tabindex: "0", role: "button", "aria-label": "Escolher ou largar o emblema" }, "Larga aqui a imagem do emblema ou clica para escolher");
    function desenhaEmb() { embImg.hidden = !emb.url; if (emb.url) embImg.src = emb.url; embInfo.textContent = emb.blob ? "Novo emblema pronto (convertido para PNG 256×256)." : emb.remover ? "O emblema vai ser removido ao guardar." : emb.url ? "Emblema atual." : "Sem emblema: o jogo desenha um escudo com as cores e a sigla."; remBtn.hidden = !emb.url; }
    var remBtn = btn("Remover emblema", function () { emb.blob = null; emb.remover = !!(atual && atual.temEmblema); emb.url = ""; desenhaEmb(); suja(); });
    async function receber(fi) {
      if (!fi) return; if (fi.size > 8 * 1024 * 1024) { await popup("aviso", "Imagem demasiado grande", "Escolhe uma imagem até 8 MB."); return; }
      try { var b = await emblemaPng(fi); if (b.size > 400 * 1024) throw new Error("Depois de convertido o emblema ficou com mais de 400 KB. Usa uma imagem mais simples."); emb.blob = b; emb.remover = false; emb.url = URL.createObjectURL(b); desenhaEmb(); suja(); }
      catch (e) { await popup("erro", "Emblema inválido", e.message); }
    }
    zona.addEventListener("click", function () { embFile.click(); }); zona.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); embFile.click(); } });
    zona.addEventListener("dragover", function (e) { e.preventDefault(); zona.classList.add("sobre"); }); zona.addEventListener("dragleave", function () { zona.classList.remove("sobre"); });
    zona.addEventListener("drop", function (e) { e.preventDefault(); zona.classList.remove("sobre"); receber(e.dataTransfer.files[0]); });
    embFile.addEventListener("change", function () { receber(embFile.files[0]); embFile.value = ""; }); desenhaEmb();

    /* plantel */
    var plantel = ((atual && atual.plantel) || []).map(function (p) { return { nome: p.nome, nomeCompleto: p.nomeCompleto && p.nomeCompleto !== p.nome ? p.nomeCompleto : "", num: p.num, pos: p.pos }; }), pl = h("div", { class: "plantel" });
    function desenha() {
      pl.textContent = ""; if (!plantel.length) pl.append(h("p", { class: "nota" }, "Sem jogadores definidos."));
      plantel.forEach(function (p, i) {
        var n = h("input", { value: p.nome, maxlength: 30, placeholder: "Nome", "aria-label": "Nome" }), nc = h("input", { value: p.nomeCompleto, maxlength: 60, placeholder: "Nome completo (opcional)", "aria-label": "Nome completo" }), nu = h("input", { type: "number", value: p.num, min: 1, max: 99, "aria-label": "Número" }), po = h("select", { "aria-label": "Posição" }, Object.keys(POS).map(function (k) { return h("option", { value: k, selected: k === p.pos }, POS[k]); }));
        n.addEventListener("input", function () { p.nome = n.value; }); nc.addEventListener("input", function () { p.nomeCompleto = nc.value; }); nu.addEventListener("input", function () { p.num = +nu.value; }); po.addEventListener("change", function () { p.pos = po.value; });
        pl.append(h("div", { class: "lin" }, nu, n, nc, po, h("button", { class: "btn ghost peq", type: "button", "aria-label": "Remover " + (p.nome || "jogador"), onclick: function () { plantel.splice(i, 1); desenha(); suja(); } }, "✕")));
      });
    }
    desenha();
    var colar = h("textarea", { rows: 5, placeholder: "10; Gelson; F; Gelson Dala\n1; Neblú; GK\n…  (número; nome; posição GK/D/M/F; nome completo opcional)" });
    function importar() {
      var novos = [], erros = [], usados = {}; plantel.forEach(function (p) { usados[p.num] = 1; });
      colar.value.split(/\r?\n/).forEach(function (ln, i) {
        if (!ln.trim()) return; var c = ln.split(/[;\t]|,(?=\s*\S)/).map(function (s) { return s.trim(); });
        var num = Math.round(+c[0]), pos = POS_ALIAS[String(c[2] || "").toUpperCase()];
        if (!(num >= 1 && num <= 99) || !c[1] || !pos) { erros.push("Linha " + (i + 1)); return; }
        if (usados[num]) { erros.push("Linha " + (i + 1) + " (número " + num + " repetido)"); return; }
        usados[num] = 1; novos.push({ nome: c[1].slice(0, 30), nomeCompleto: (c[3] || "").slice(0, 60), num: num, pos: pos });
      });
      if (plantel.length + novos.length > 30) { popup("aviso", "Plantel demasiado grande", "O plantel pode ter no máximo 30 jogadores."); return; }
      plantel = plantel.concat(novos); colar.value = ""; desenha(); suja();
      if (erros.length) popup("aviso", "Algumas linhas foram ignoradas", novos.length + " jogador(es) importado(s). Ignoradas: " + erros.join("; ") + ".");
      else aviso(novos.length + " jogador(es) importado(s).");
    }

    /* separadores */
    var paineis = {
      id: h("div", { class: "grid" },
        h("div", { class: "linha2" }, h("label", null, "Nome do clube *", F.nome), h("label", null, "Sigla * (2 a 4)", F.sigla)),
        h("div", { class: "linha3" }, h("label", null, "Nome curto", F.nomeCurto), h("label", null, "Força (40 a 95)", F.forca), h("label", null, "Estilo de jogo", F.estilo)),
        h("div", { class: "linha2" }, h("label", null, "Apelido", F.apelido), h("label", null, "Ano de fundação", F.fundacao)),
        h("div", { class: "linha2" }, h("label", null, "Cidade", F.cidade), h("label", null, "Província", F.provincia)),
        h("div", { class: "linha2" }, h("label", null, "Estádio", F.estadio), h("label", null, "Treinador", F.treinador)),
        h("div", { class: "linha2" }, h("label", null, "Presidente", F.presidente), h("label", null, "Site oficial", F.site)),
        h("label", null, "Descrição", F.descricao)),
      cores: h("div", { class: "grid" }, h("h3", null, "Equipamento principal"), h("div", { class: "linha2" }, h("label", null, "Cor principal", F.c1), h("label", null, "Cor secundária", F.c2)),
        h("label", { class: "chk" }, temAlt, "Definir equipamento alternativo (visitante)"), h("p", { class: "nota" }, "Sem alternativo, o jogo usa as cores trocadas."), altBox, kit),
      emb: h("div", { class: "grid" }, h("div", { class: "emb" }, embImg, h("div", { class: "grid" }, zona, embInfo, remBtn, embFile)), h("p", { class: "nota" }, "Aceita PNG, JPG, WEBP ou SVG. É convertido no teu navegador para PNG 256×256 com fundo transparente. Usa um emblema teu ou de que tenhas autorização.")),
      pl: h("div", { class: "grid" }, h("p", { class: "nota" }, "Opcional. Sem plantel, o jogo usa os nomes que já tem (clubes de origem) ou gera nomes (clubes novos). Máximo 30 jogadores; números de 1 a 99 sem repetir."),
        pl, btn("Adicionar jogador", function () { var us = plantel.map(function (p) { return p.num; }), n = 1; while (us.indexOf(n) >= 0) n++; plantel.push({ nome: "", nomeCompleto: "", num: n, pos: "M" }); desenha(); suja(); }),
        h("details", null, h("summary", null, "Importar lista colada"), colar, btn("Importar", importar)))
    }, nomes = { id: "Identidade", cores: "Cores e equipamento", emb: "Emblema", pl: "Plantel" }, tabs = h("div", { class: "tabs", role: "tablist" }), blocos = h("div");
    function mostra(k) { Object.keys(paineis).forEach(function (x) { paineis[x].hidden = x !== k; }); tabs.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.k === k)); }); }
    Object.keys(paineis).forEach(function (k) { tabs.append(h("button", { type: "button", role: "tab", "data-k": k, onclick: function () { mostra(k); } }, nomes[k])); blocos.append(paineis[k]); }); mostra("id");

    function valida() {
      if (F.nome.value.trim().length < 3) { mostra("id"); return "O nome do clube precisa de 3 a 32 caracteres."; }
      if (!eEdicao && !atual && !/^[A-Za-z0-9]{2,4}$/.test(F.sigla.value.trim())) { mostra("id"); return "A sigla precisa de 2 a 4 letras ou números."; }
      var f = +F.forca.value; if (!(f >= 40 && f <= 95)) { mostra("id"); return "A força tem de estar entre 40 e 95."; }
      if (F.site.value && !/^https?:\/\/\S+$/i.test(F.site.value.trim())) { mostra("id"); return "O site tem de começar por http:// ou https://."; }
      var y = F.fundacao.value; if (y && !(+y >= 1850 && +y <= new Date().getFullYear())) { mostra("id"); return "Ano de fundação inválido."; }
      var us = {}; for (var i = 0; i < plantel.length; i++) { var p = plantel[i]; if (String(p.nome).trim().length < 2) { mostra("pl"); return "O jogador " + (i + 1) + " precisa de nome."; } if (!(p.num >= 1 && p.num <= 99) || us[p.num]) { mostra("pl"); return "Número inválido ou repetido no plantel: " + p.num + "."; } us[p.num] = 1; }
      return "";
    }
    function dadosForm() {
      var extra = {}; ["nomeCurto", "apelido", "cidade", "provincia", "fundacao", "estadio", "treinador", "presidente", "site", "descricao"].forEach(function (k) { var x = String(F[k].value).trim(); if (x) extra[k] = k === "fundacao" ? +x : x; });
      var d = { nome: F.nome.value.trim(), forca: +F.forca.value, c1: F.c1.value, c2: F.c2.value, estilo: F.estilo.value, extra: Object.keys(extra).length ? extra : null,
        alt: temAlt.checked ? { camisola: F.a1.value, detalhes: F.a2.value, calcoes: F.a3.value, meias: F.a4.value, padrao: +F.padrao.value } : null };
      if (plantel.length || (atual && atual.plantel && atual.plantel.length)) d.plantel = plantel.map(function (p) { return { nome: String(p.nome).trim(), nomeCompleto: String(p.nomeCompleto || "").trim(), num: p.num, pos: p.pos }; });
      return d;
    }
    var titulo = eEdicao ? "Editar " + origem.n : atual ? "Editar " + atual.nome : "Novo clube";
    dialogo(titulo, h("div", null, tabs, blocos), [CANCELAR, { txt: "Guardar", val: true,
      valida: valida,
      confirma: { titulo: atual || eEdicao ? "Guardar alterações?" : "Criar clube?", texto: function () { return [(atual || eEdicao ? "Guardar as alterações a " : "Criar o clube ") + F.nome.value.trim() + (emb.blob ? " (com novo emblema)" : emb.remover ? " (sem emblema)" : "") + "?", "Chega ao jogo no arranque seguinte dos jogadores."]; }, rotulo: atual || eEdicao ? "Guardar" : "Criar clube" },
      fn: async function () {
        var dados = dadosForm(), id = atual ? atual.id : null, r;
        if (eEdicao) r = await acao({ fazer: function () { return api("PUT", "/admin/clubes/base/" + origem.s, dados); } });
        else if (atual) r = await acao({ fazer: function () { return api("PUT", "/admin/clubes/" + atual.id, dados); } });
        else { dados.sigla = F.sigla.value.trim().toUpperCase(); r = await acao({ fazer: async function () { var x = await api("POST", "/admin/clubes", dados); id = x.id; return x; } }); }
        if (r === undefined) return false;
        var cam = eEdicao ? "/admin/clubes/base/" + origem.s : "/admin/clubes/" + id;
        if (emb.blob) { var r2 = await acao({ fazer: function () { return api("POST", cam + "?acao=emblema", emb.blob); } }); if (r2 === undefined) { carregar(); await popup("aviso", "Clube guardado sem emblema", "Os dados foram guardados, mas o emblema não. Abre o clube e tenta de novo."); return true; } }
        else if (emb.remover) { var r3 = await acao({ fazer: function () { return api("DELETE", cam + "?acao=emblema"); } }); if (r3 === undefined) { carregar(); return true; } }
        carregar(); aviso("Clube guardado.");
      } }]);
  }
  secao(m, "Clubes");
  m.append(h("div", { class: "barra" }, btn("Criar clube novo", function () { formClube(null, null); }, "")));
  var corpo = h("div"); m.append(corpo); await carregar();
};

/* ---------- configuração ---------- */
VISTAS.config = async function (m) {
  var c = await api("GET", "/admin/config"); if (atual !== "config") return; secao(m, "Configuração");
  var av = h("textarea", { rows: 3, maxlength: 240, placeholder: "Ex.: Manutenção hoje às 22h." }), man = h("input", { type: "checkbox" }), fx = h("input", { type: "checkbox" }); av.value = c.aviso; man.checked = c.manutencao; fx.checked = c.usarFaixas;
  var inicial = JSON.stringify([av.value, man.checked, fx.checked]);
  m.append(h("div", { class: "painel" }, h("h3", null, "Aviso aos jogadores"), h("p", { class: "nota" }, "Aparece no jogo (até 240 caracteres). Deixa vazio para não mostrar nada."), av,
    h("label", { class: "chk", style: "margin-top:10px" }, man, "Modo de manutenção (o aviso fica a vermelho e o online avisa que está em manutenção)"),
    h("h3", null, "Música"), h("label", { class: "chk" }, fx, "Tocar as músicas do YouTube/Spotify por omissão (cada jogador pode escolher a música gerada pelo jogo nas Opções)"),
    h("div", { class: "rodape" }, btn("Guardar", async function () {
      if (JSON.stringify([av.value, man.checked, fx.checked]) === inicial) { aviso("Não há alterações para guardar."); return; }
      var txt = ["Guardar a configuração do jogo?"]; if (man.checked) txt.push("O modo de manutenção fica ligado: os jogadores vão ver o aviso a vermelho."); if (!man.checked && JSON.parse(inicial)[1]) txt.push("O modo de manutenção fica desligado.");
      if (await acao({ titulo: "Guardar configuração", texto: txt, rotulo: "Guardar", perigo: man.checked, sucesso: "Configuração guardada.", fazer: function () { return api("PUT", "/admin/config", { aviso: av.value, manutencao: man.checked, usarFaixas: fx.checked }); } })) inicial = JSON.stringify([av.value, man.checked, fx.checked]);
    }, ""))));
};

/* ---------- auditoria ---------- */
VISTAS.auditoria = async function (m) {
  var r = await api("GET", "/admin/auditoria"); if (atual !== "auditoria") return; secao(m, "Auditoria");
  m.append(h("p", { class: "nota" }, "Últimas 200 ações dos administradores."), tabela([{ t: "Quando", f: function (l) { return data(l.quando); } }, { t: "Administrador", f: function (l) { return l.admin; } }, { t: "Ação", f: function (l) { return l.acao; } }, { t: "Detalhe", f: function (l) { return l.detalhe; } }], r, "Ainda não há ações registadas."));
};

/* ---------- arranque ---------- */
if (TOKEN && API) api("GET", "/admin/eu").then(function () { iniciar(); }).catch(function () { mostrarLogin(""); }); else mostrarLogin("");
})();
