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
function mb(n) { return (n / 1e6).toFixed(1) + " MB"; }
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
async function tenta(fn, okMsg) { try { var r = await fn(); if (okMsg) aviso(okMsg); return r; } catch (e) { aviso(e.message, true); return undefined; } }

/* diálogo genérico */
function dialogo(titulo, corpo, botoes) {
  return new Promise(function (resolve) {
    var f = $("#dlgForm"), d = $("#dlg"); f.textContent = "";
    var rod = h("div", { class: "rodape" });
    botoes.forEach(function (b) { rod.append(h("button", { class: "btn " + (b.cls || ""), type: "button", onclick: async function () { var r = b.fn ? await b.fn() : true; if (r !== false) { d.close(); resolve(b.val); } } }, b.txt)); });
    f.append(h("h2", null, titulo), corpo, rod);
    d.addEventListener("close", function t() { d.removeEventListener("close", t); resolve(null); });
    d.showModal();
  });
}
function confirmar(titulo, texto, rotulo) { return dialogo(titulo, h("p", null, texto), [{ txt: "Cancelar", cls: "ghost", val: false }, { txt: rotulo || "Confirmar", cls: "mau", val: true }]); }

/* ---------- entrada ---------- */
function mostrarLogin(msg) { $("#app").hidden = true; $("#login").hidden = false; $("#lApi").value = API; $("#lEmail").value = EMAIL; $("#lErro").textContent = msg || ""; }
$("#fLogin").addEventListener("submit", async function (e) {
  e.preventDefault(); var erro = $("#lErro"); erro.textContent = "";
  API = $("#lApi").value.trim().replace(/\/+$/, ""); EMAIL = $("#lEmail").value.trim().toLowerCase();
  try {
    var r = await fetch(API + "/conta/entrar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, senha: $("#lSenha").value }) });
    var j = await r.json(); if (!r.ok) throw new Error(j.erro || "Erro " + r.status);
    TOKEN = j.token; var eu = await api("GET", "/admin/eu");
    localStorage.setItem("g94admin.api", API); sessionStorage.setItem("g94admin.token", TOKEN); sessionStorage.setItem("g94admin.email", EMAIL);
    $("#lSenha").value = ""; iniciar();
  } catch (x) { TOKEN = ""; erro.textContent = x.message === "Failed to fetch" ? "Não foi possível ligar ao servidor." : x.message; }
});
$("#bSair").addEventListener("click", async function () { try { await api("DELETE", "/conta/sessao"); } catch (e) { /* sessão já inválida */ } sair(""); });
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

/* ---------- painel ---------- */
VISTAS.painel = async function (m) {
  async function ler() {
    var r = await api("GET", "/admin/resumo"); if (atual !== "painel") return;
    var k = function (v, t) { return h("div", { class: "kpi" }, h("b", null, v == null ? "–" : v), h("span", null, t)); };
    secao(m, "Painel");
    m.append(h("div", { class: "grelha" }, k(r.servidor.online, "jogadores online"), k(r.servidor.partidasAtivas, "partidas a decorrer"), k(r.ultimas24h.partidas, "partidas nas últimas 24 h"), k(r.ultimas24h.contasNovas, "contas novas nas últimas 24 h")));
    m.append(h("div", { class: "grelha" }, k(r.totais.contas, "contas"), k(r.totais.jogadores, "perfis online"), k(r.totais.partidas, "partidas jogadas"), k(r.totais.musicas, "músicas carregadas"), k(r.totais.clubesNovos + " / " + r.totais.clubesEditados, "clubes novos / editados")));
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
        h("button", { class: "btn ghost peq", type: "button", onclick: function () { editarJogador(l); } }, "Editar"),
        h("button", { class: "btn ghost peq", type: "button", onclick: async function () { if (await confirmar("Repor estatísticas", "Repor ELO (1000) e resultados de " + l.nome + "?", "Repor")) { await tenta(function () { return api("POST", "/admin/jogadores/" + encodeURIComponent(l.id) + "/repor"); }, "Estatísticas repostas."); carregar(); } } }, "Repor"),
        h("button", { class: "btn ghost peq", type: "button", onclick: async function () { await tenta(function () { return api("PUT", "/admin/jogadores/" + encodeURIComponent(l.id), { banido: !l.banido }); }, l.banido ? "Jogador readmitido." : "Jogador banido do ranking."); carregar(); } }, l.banido ? "Readmitir" : "Banir")); } }
    ], r.linhas, "Nenhum jogador encontrado."), paginacao(r, function (p) { est.pag = p; carregar(); }));
  }
  function editarJogador(l) {
    var nome = h("input", { value: l.nome, maxlength: 16 }), elo = h("input", { type: "number", value: l.elo, min: 100, max: 4000 }), club = h("input", { type: "number", value: l.club, min: 0, max: 99 });
    dialogo("Editar jogador", h("div", null, h("label", null, "Nome", nome), h("div", { class: "linha2" }, h("label", null, "ELO", elo), h("label", null, "Clube (índice)", club))),
      [{ txt: "Cancelar", cls: "ghost", val: false }, { txt: "Guardar", val: true, fn: async function () { var r = await tenta(function () { return api("PUT", "/admin/jogadores/" + encodeURIComponent(l.id), { nome: nome.value, elo: +elo.value, club: +club.value }); }, "Guardado."); if (r === undefined) return false; carregar(); } }]);
  }
  secao(m, "Ranking e jogadores");
  var q = h("input", { type: "search", placeholder: "Nome do jogador", value: est.q }), ord = h("select", null, h("option", { value: "elo" }, "ELO"), h("option", { value: "jogos" }, "Jogos"), h("option", { value: "nome" }, "Nome"), h("option", { value: "novo" }, "Mais recentes"));
  var corpo = h("div");
  q.addEventListener("input", function () { clearTimeout(q._t); q._t = setTimeout(function () { est.q = q.value; est.pag = 0; carregar(); }, 300); });
  ord.addEventListener("change", function () { est.ordem = ord.value; est.pag = 0; carregar(); });
  m.append(h("div", { class: "barra" }, h("label", null, "Pesquisar", q), h("label", null, "Ordenar por", ord),
    h("button", { class: "btn ghost", type: "button", onclick: histRanking }, "Épocas arquivadas"),
    h("button", { class: "btn mau", type: "button", onclick: reporRanking }, "Nova época (repor ranking)")), corpo);
  async function reporRanking() {
    var ep = h("input", { placeholder: "Ex.: Época 2026/27", maxlength: 40 }), cf = h("input", { placeholder: "Escreve REPOR" });
    dialogo("Nova época", h("div", null, h("p", null, "O top 100 atual fica arquivado e todos os jogadores voltam a 1000 de ELO, com os resultados a zero. Não dá para desfazer."), h("label", null, "Nome da época", ep), h("label", null, "Confirmação", cf)),
      [{ txt: "Cancelar", cls: "ghost", val: false }, { txt: "Repor ranking", cls: "mau", val: true, fn: async function () { var r = await tenta(function () { return api("POST", "/admin/ranking/repor", { epoca: ep.value, confirmar: cf.value }); }); if (r === undefined) return false; aviso("Ranking reposto (" + r.arquivados + " arquivados)."); carregar(); } }]);
  }
  async function histRanking() {
    var r = await tenta(function () { return api("GET", "/admin/ranking/historico"); }); if (!r) return;
    var c = h("div", null, r.length ? r.map(function (e) { return h("div", null, h("h3", null, e.epoca + " · " + data(e.criado)), tabela([{ t: "#", f: function (l) { return e.top.indexOf(l) + 1; } }, { t: "Jogador", f: function (l) { return l.nome; } }, { t: "ELO", num: 1, f: function (l) { return l.elo; } }, { t: "J", num: 1, f: function (l) { return l.jogos; } }], e.top)); }) : h("p", { class: "vazio" }, "Ainda não há épocas arquivadas."));
    dialogo("Épocas arquivadas", c, [{ txt: "Fechar", val: true }]);
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
        h("button", { class: "btn ghost peq", type: "button", onclick: async function () { await tenta(function () { return api("PUT", "/admin/contas/" + l.id, { bloqueada: !l.bloqueada }); }, l.bloqueada ? "Conta desbloqueada." : "Conta bloqueada."); carregar(); } }, l.bloqueada ? "Desbloquear" : "Bloquear"),
        h("button", { class: "btn ghost peq", type: "button", onclick: async function () { var r2 = await tenta(function () { return api("POST", "/admin/contas/" + l.id + "/terminar-sessoes"); }); if (r2) aviso("Sessões terminadas: " + r2.terminadas); } }, "Terminar sessões"),
        h("button", { class: "btn mau peq", type: "button", onclick: async function () { if (await confirmar("Apagar conta", "Apagar definitivamente a conta " + l.email + " e o seu progresso guardado? O perfil de ranking mantém-se.", "Apagar")) { await tenta(function () { return api("DELETE", "/admin/contas/" + l.id); }, "Conta apagada."); carregar(); } } }, "Apagar")); } }
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

/* ---------- músicas ---------- */
var USO = { ambos: "Menus e jogo", menu: "Só menus", jogo: "Só jogo" };
VISTAS.musicas = async function (m) {
  async function carregar() {
    var r = await api("GET", "/admin/musicas"); if (atual !== "musicas") return; lista.textContent = "";
    lista.append(tabela([
      { t: "Ordem", f: function (l) { return h("div", { class: "acoes" }, h("button", { class: "btn ghost peq", type: "button", "aria-label": "Subir", onclick: function () { mover(r, l, -1); } }, "▲"), h("button", { class: "btn ghost peq", type: "button", "aria-label": "Descer", onclick: function () { mover(r, l, 1); } }, "▼")); } },
      { t: "Título", f: function (l) { return h("span", null, l.titulo, l.artista ? h("div", { class: "nota" }, l.artista) : null); } },
      { t: "Uso", f: function (l) { return USO[l.uso] || l.uso; } }, { t: "Tamanho", num: 1, f: function (l) { return mb(l.tamanho); } },
      { t: "Estado", f: function (l) { return h("span", { class: "etq " + (l.ativa ? "ok" : "") }, l.ativa ? "ativa" : "desligada"); } },
      { t: "Ouvir", f: function (l) { return h("audio", { controls: true, preload: "none", src: API + "/musicas/" + l.id }); } },
      { t: "", f: function (l) { return h("div", { class: "acoes" },
        h("button", { class: "btn ghost peq", type: "button", onclick: function () { editar(l); } }, "Editar"),
        h("button", { class: "btn ghost peq", type: "button", onclick: async function () { await tenta(function () { return api("PUT", "/admin/musicas/" + l.id, { ativa: !l.ativa }); }); carregar(); } }, l.ativa ? "Desligar" : "Ligar"),
        h("button", { class: "btn mau peq", type: "button", onclick: async function () { if (await confirmar("Apagar música", "Apagar «" + l.titulo + "» do servidor?", "Apagar")) { await tenta(function () { return api("DELETE", "/admin/musicas/" + l.id); }, "Música apagada."); carregar(); } } }, "Apagar")); } }
    ], r, "Ainda não há músicas. Carrega a primeira acima."));
  }
  async function mover(r, l, d) {
    var i = r.indexOf(l), j = i + d; if (j < 0 || j >= r.length) return;
    await tenta(async function () { await api("PUT", "/admin/musicas/" + l.id, { ordem: r[j].ordem }); await api("PUT", "/admin/musicas/" + r[j].id, { ordem: l.ordem === r[j].ordem ? l.ordem + d * -1 : l.ordem }); }); carregar();
  }
  function editar(l) {
    var t = h("input", { value: l.titulo, maxlength: 80 }), a = h("input", { value: l.artista, maxlength: 80 }), u = h("select", null, Object.keys(USO).map(function (k) { return h("option", { value: k, selected: k === l.uso }, USO[k]); }));
    dialogo("Editar música", h("div", null, h("label", null, "Título", t), h("label", null, "Artista", a), h("label", null, "Usar em", u)),
      [{ txt: "Cancelar", cls: "ghost", val: false }, { txt: "Guardar", val: true, fn: async function () { var r = await tenta(function () { return api("PUT", "/admin/musicas/" + l.id, { titulo: t.value, artista: a.value, uso: u.value }); }, "Guardado."); if (r === undefined) return false; carregar(); } }]);
  }
  secao(m, "Músicas");
  var f = h("input", { type: "file", accept: ".mp3,.ogg,.wav,.m4a,audio/*", required: true }), t = h("input", { placeholder: "Título", required: true, maxlength: 80 }), a = h("input", { placeholder: "Artista (opcional)", maxlength: 80 }), u = h("select", null, Object.keys(USO).map(function (k) { return h("option", { value: k }, USO[k]); })), btn = h("button", { class: "btn", type: "submit" }, "Carregar");
  var form = h("form", { class: "painel" }, h("h3", null, "Carregar música"), h("p", { class: "nota" }, "MP3, OGG, WAV ou M4A, até 25 MB. Usa só música da qual tens os direitos."), h("div", { class: "linha2" }, h("label", null, "Ficheiro", f), h("label", null, "Título", t)), h("div", { class: "linha2" }, h("label", null, "Artista", a), h("label", null, "Usar em", u)), h("div", { class: "rodape" }, btn));
  f.addEventListener("change", function () { if (f.files[0] && !t.value) t.value = f.files[0].name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "); });
  form.addEventListener("submit", async function (e) {
    e.preventDefault(); var fi = f.files[0]; if (!fi) return;
    if (fi.size > 25 * 1024 * 1024) { aviso("Ficheiro demasiado grande (máximo 25 MB).", true); return; }
    btn.disabled = true; btn.textContent = "A carregar…";
    var r = await tenta(function () { return api("POST", "/admin/musicas", fi, { "X-Titulo": encodeURIComponent(t.value), "X-Artista": encodeURIComponent(a.value), "X-Uso": u.value }); }, "Música carregada.");
    btn.disabled = false; btn.textContent = "Carregar"; if (r) { form.reset(); carregar(); }
  });
  var lista = h("div"); m.append(form, lista); await carregar();
};

/* ---------- clubes ---------- */
var ESTILO = { posse: "Posse de bola", pressao: "Pressão alta", contra: "Contra-ataque" }, POS = { GK: "Guarda-redes", D: "Defesa", M: "Médio", F: "Avançado" };
VISTAS.clubes = async function (m) {
  async function carregar() {
    var r = await api("GET", "/admin/clubes"); if (atual !== "clubes") return; corpo.textContent = "";
    corpo.append(h("h3", null, "Clubes do jogo (" + r.base.length + ")"), h("p", { class: "nota" }, "Aqui só se alteram valores dos clubes que já existem; a alteração chega ao jogo no arranque seguinte dos jogadores."),
      tabela([
        { t: "Clube", f: function (l) { var e = l.edicao || {}; return h("span", null, h("span", { class: "cor", style: "background:" + (e.c1 || l.origem.c1) }), " ", h("span", { class: "cor", style: "background:" + (e.c2 || l.origem.c2) }), " ", e.nome || l.origem.n, e.nome ? h("span", { class: "nota" }, " (era " + l.origem.n + ")") : null); } },
        { t: "Sigla", f: function (l) { return l.origem.s; } }, { t: "Força", num: 1, f: function (l) { return (l.edicao && l.edicao.forca) || l.origem.r; } },
        { t: "Estilo", f: function (l) { return ESTILO[(l.edicao && l.edicao.estilo) || l.origem.st]; } },
        { t: "Plantel", f: function (l) { return l.edicao && l.edicao.plantel ? l.edicao.plantel.length + " jogadores (personalizado)" : "de origem"; } },
        { t: "Estado", f: function (l) { return h("span", { class: "etq " + (l.edicao ? "ok" : "") }, l.edicao ? "editado" : "original"); } },
        { t: "", f: function (l) { return h("div", { class: "acoes" }, h("button", { class: "btn ghost peq", type: "button", onclick: function () { formClube(l.origem, l.edicao, true); } }, "Editar"),
          l.edicao ? h("button", { class: "btn ghost peq", type: "button", onclick: async function () { if (await confirmar("Repor clube", "Voltar aos valores originais de " + l.origem.n + "?", "Repor")) { await tenta(function () { return api("DELETE", "/admin/clubes/base/" + l.origem.s); }, "Clube reposto."); carregar(); } } }, "Repor original") : null); } }
      ], r.base),
      h("h3", null, "Clubes novos (" + r.novos.length + ")"), h("p", { class: "nota" }, "Os clubes novos aparecem no jogo rápido; ficam fora da época e da taça, que têm 16 clubes fixos."),
      tabela([
        { t: "Clube", f: function (l) { return h("span", null, l.temEmblema ? h("img", { class: "escudo", alt: "", src: API + "/emblemas/" + l.id + "?v=" + Date.now() }) : null, " ", h("span", { class: "cor", style: "background:" + l.c1 }), " ", h("span", { class: "cor", style: "background:" + l.c2 }), " ", l.nome); } },
        { t: "Sigla", f: function (l) { return l.sigla; } }, { t: "Força", num: 1, f: function (l) { return l.forca; } }, { t: "Estilo", f: function (l) { return ESTILO[l.estilo]; } }, { t: "Plantel", f: function (l) { return l.plantel ? l.plantel.length + " jogadores" : "gerado pelo jogo"; } },
        { t: "Estado", f: function (l) { return h("span", { class: "etq " + (l.ativo ? "ok" : "") }, l.ativo ? "ativo" : "desligado"); } },
        { t: "", f: function (l) { return h("div", { class: "acoes" }, h("button", { class: "btn ghost peq", type: "button", onclick: function () { formClube(null, l, false); } }, "Editar"),
          h("button", { class: "btn ghost peq", type: "button", onclick: async function () { await tenta(function () { return api("PUT", "/admin/clubes/" + l.id, { ativo: !l.ativo }); }); carregar(); } }, l.ativo ? "Desligar" : "Ligar"),
          h("button", { class: "btn mau peq", type: "button", onclick: async function () { if (await confirmar("Apagar clube", "Apagar o clube " + l.nome + "?", "Apagar")) { await tenta(function () { return api("DELETE", "/admin/clubes/" + l.id); }, "Clube apagado."); carregar(); } } }, "Apagar")); } }
      ], r.novos, "Ainda não criaste clubes novos."));
  }
  /* origem: clube de origem (edição) ou null; atual: edição/clube novo existente ou null */
  function formClube(origem, atual, eEdicao) {
    var v = function (k, d) { return atual && atual[k] != null ? atual[k] : (origem ? ({ nome: origem.n, forca: origem.r, c1: origem.c1, c2: origem.c2, estilo: origem.st, sigla: origem.s })[k] : d); };
    var nome = h("input", { value: v("nome", ""), maxlength: 32, required: true }), sigla = h("input", { value: v("sigla", ""), maxlength: 4, disabled: !!origem || !!atual, style: "text-transform:uppercase" }),
      forca = h("input", { type: "number", min: 40, max: 95, value: v("forca", 65) }), c1 = h("input", { type: "color", value: v("c1", "#2b7bd6") }), c2 = h("input", { type: "color", value: v("c2", "#ffffff") }),
      estilo = h("select", null, Object.keys(ESTILO).map(function (k) { return h("option", { value: k, selected: k === v("estilo", "posse") }, ESTILO[k]); })), emb = h("input", { type: "file", accept: "image/png" });
    var plantel = ((atual && atual.plantel) || []).map(function (p) { return { nome: p.nome, num: p.num, pos: p.pos }; }), pl = h("div", { class: "plantel" });
    function desenha() {
      pl.textContent = "";
      plantel.forEach(function (p, i) {
        var n = h("input", { value: p.nome, maxlength: 30, placeholder: "Nome", "aria-label": "Nome" }), nu = h("input", { type: "number", value: p.num, min: 1, max: 99, "aria-label": "Número" }), po = h("select", { "aria-label": "Posição" }, Object.keys(POS).map(function (k) { return h("option", { value: k, selected: k === p.pos }, POS[k]); }));
        n.addEventListener("input", function () { p.nome = n.value; }); nu.addEventListener("input", function () { p.num = +nu.value; }); po.addEventListener("change", function () { p.pos = po.value; });
        pl.append(h("div", { class: "lin" }, n, nu, po, h("button", { class: "btn ghost peq", type: "button", "aria-label": "Remover", onclick: function () { plantel.splice(i, 1); desenha(); } }, "✕")));
      });
    }
    desenha();
    var corpoF = h("div", { style: "display:grid;gap:10px" },
      h("div", { class: "linha2" }, h("label", null, "Nome do clube", nome), h("label", null, "Sigla (2 a 4)", sigla)),
      h("div", { class: "linha3" }, h("label", null, "Força (40 a 95)", forca), h("label", null, "Cor principal", c1), h("label", null, "Cor secundária", c2)),
      h("label", null, "Estilo de jogo", estilo),
      h("label", null, "Emblema (PNG, até 400 KB)", emb),
      h("h3", null, "Plantel"), h("p", { class: "nota" }, "Opcional. Sem plantel, o jogo usa os nomes que já tem (clubes de origem) ou gera nomes (clubes novos). Máximo 30 jogadores; números de 1 a 99 sem repetir."),
      pl, h("button", { class: "btn ghost peq", type: "button", onclick: function () { var usados = plantel.map(function (p) { return p.num; }), n = 1; while (usados.indexOf(n) >= 0) n++; plantel.push({ nome: "", num: n, pos: "M" }); desenha(); } }, "Adicionar jogador"));
    dialogo(eEdicao ? "Editar " + origem.n : atual ? "Editar " + atual.nome : "Novo clube", corpoF, [{ txt: "Cancelar", cls: "ghost", val: false }, { txt: "Guardar", val: true, fn: async function () {
      var dados = { nome: nome.value, forca: +forca.value, c1: c1.value, c2: c2.value, estilo: estilo.value };
      if (plantel.length || (atual && atual.plantel)) dados.plantel = plantel;
      var id = atual ? atual.id : null, r;
      if (eEdicao) r = await tenta(function () { return api("PUT", "/admin/clubes/base/" + origem.s, dados); });
      else if (atual) r = await tenta(function () { return api("PUT", "/admin/clubes/" + atual.id, dados); });
      else { dados.sigla = sigla.value.toUpperCase(); r = await tenta(function () { return api("POST", "/admin/clubes", dados); }); if (r) id = r.id; }
      if (r === undefined) return false;
      if (emb.files[0]) { var fi = emb.files[0]; if (fi.size > 400 * 1024) { aviso("Emblema demasiado grande (máximo 400 KB).", true); return false; }
        var cam = eEdicao ? "/admin/clubes/base/" + origem.s + "?acao=emblema" : "/admin/clubes/" + id + "?acao=emblema"; var r2 = await tenta(function () { return api("POST", cam, fi); }); if (r2 === undefined) return false; }
      aviso("Clube guardado."); carregar();
    } }]);
  }
  secao(m, "Clubes");
  m.append(h("div", { class: "barra" }, h("button", { class: "btn", type: "button", onclick: function () { formClube(null, null, false); } }, "Criar clube novo")));
  var corpo = h("div"); m.append(corpo); await carregar();
};

/* ---------- configuração ---------- */
VISTAS.config = async function (m) {
  var c = await api("GET", "/admin/config"); if (atual !== "config") return; secao(m, "Configuração");
  var av = h("textarea", { rows: 3, maxlength: 240, placeholder: "Ex.: Manutenção hoje às 22h." }), man = h("input", { type: "checkbox" }), fx = h("input", { type: "checkbox" }); av.value = c.aviso; man.checked = c.manutencao; fx.checked = c.usarFaixas;
  m.append(h("div", { class: "painel" }, h("h3", null, "Aviso aos jogadores"), h("p", { class: "nota" }, "Aparece no menu do jogo (até 240 caracteres). Deixa vazio para não mostrar nada."), av,
    h("label", { style: "display:flex;gap:10px;align-items:center;margin-top:10px" }, man, "Modo de manutenção (o aviso fica a vermelho e o online avisa que está em manutenção)"),
    h("h3", null, "Música"), h("label", { style: "display:flex;gap:10px;align-items:center" }, fx, "Usar as faixas carregadas como música por omissão (cada jogador pode escolher a música gerada pelo jogo nas Opções)"),
    h("div", { class: "rodape" }, h("button", { class: "btn", type: "button", onclick: function () { tenta(function () { return api("PUT", "/admin/config", { aviso: av.value, manutencao: man.checked, usarFaixas: fx.checked }); }, "Guardado."); } }, "Guardar"))));
};

/* ---------- auditoria ---------- */
VISTAS.auditoria = async function (m) {
  var r = await api("GET", "/admin/auditoria"); if (atual !== "auditoria") return; secao(m, "Auditoria");
  m.append(h("p", { class: "nota" }, "Últimas 200 ações dos administradores."), tabela([{ t: "Quando", f: function (l) { return data(l.quando); } }, { t: "Administrador", f: function (l) { return l.admin; } }, { t: "Ação", f: function (l) { return l.acao; } }, { t: "Detalhe", f: function (l) { return l.detalhe; } }], r, "Ainda não há ações registadas."));
};

/* ---------- arranque ---------- */
if (TOKEN && API) api("GET", "/admin/eu").then(function () { iniciar(); }).catch(function () { mostrarLogin(""); }); else mostrarLogin("");
})();
