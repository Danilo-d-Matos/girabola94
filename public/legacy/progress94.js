/* ===== Girabola 94: progresso do jogador (vitórias, derrotas, taças…) e conta com email + senha =====
   O progresso é sempre guardado neste dispositivo. Com conta, é também enviado ao servidor e segue o jogador entre dispositivos.
   Os jogos online contam no servidor (ELO, vitórias, derrotas) e aparecem aqui quando há conta. */
(function () {
"use strict";
var KP = "girabola94.progress", KS = "girabola94.sessao", KC = "girabola94.clube", KO = "girabola.online";
var MODOS = { quick: "Jogo rápido", season: "Época", cup: "Taça", challenge: "Desafio" };

function lerJ(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
function gravarJ(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

/* ---------- estatísticas ---------- */
function vazio() { return { tot: { j: 0, v: 0, e: 0, d: 0, gf: 0, gs: 0 }, modos: {}, tacas: 0, titulos: 0, u: 0 }; }
function stats() {
  var s = lerJ(KP); if (!s || !s.tot) s = vazio();
  return s;
}
function guardarStats(s) { s.u = Date.now(); gravarJ(KP, s); empurrarLogo(); }
function registar(modo, gf, gs) {
  var s = stats(), m = s.modos[modo] || (s.modos[modo] = { j: 0, v: 0, e: 0, d: 0 });
  [s.tot, m].forEach(function (o) { o.j++; if (gf > gs) o.v++; else if (gf < gs) o.d++; else o.e++; });
  s.tot.gf += gf; s.tot.gs += gs; guardarStats(s);
}
function somar(campo) { var s = stats(); s[campo] = (s[campo] || 0) + 1; guardarStats(s); }

/* ligações ao jogo (só observam; a lógica do jogo não muda) */
var _fm = finishMatch;
finishMatch = function () {
  try {
    if (G && !G.__contado && G.o && MODOS[G.o.mode] && !G.tut) { G.__contado = true; registar(G.o.mode, G.score[0], G.score[1]); }
  } catch (e) { console.warn("progresso:", e); }
  return _fm.apply(this, arguments);
};
var _ac = advanceCup;
advanceCup = function (won) {
  try { if (CUP && won && CUP.round === 3) somar("tacas"); } catch (e) {}
  return _ac.apply(this, arguments);
};
var _fs = finalizeSeason;
finalizeSeason = function () {
  var antes = !!(S && S.recorded);
  var r = _fs.apply(this, arguments);
  try {
    if (S && !antes && S.recorded) { var tab = sortedTable(); if (tab[0] && tab[0].id === S.my) somar("titulos"); }
  } catch (e) {}
  return r;
};

/* ---------- conta ---------- */
function api() {
  var u = (typeof URL_SERVIDOR !== "undefined" && URL_SERVIDOR) || window.GIRABOLA_SERVIDOR || ("ws://" + (location.hostname || "localhost") + ":2567");
  return u.replace(/^ws/, "http").replace(/\/$/, "");
}
function sessao() { var s = lerJ(KS); return s && s.token ? s : null; }
function chamar(metodo, caminho, corpo, token) {
  var ctl = typeof AbortController !== "undefined" ? new AbortController() : null, t = ctl && setTimeout(function () { ctl.abort(); }, 10000);
  return fetch(api() + caminho, {
    method: metodo, signal: ctl && ctl.signal,
    headers: Object.assign({ "Content-Type": "application/json" }, token ? { Authorization: "Bearer " + token } : {}),
    body: corpo ? JSON.stringify(corpo) : undefined
  }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
    .catch(function () { return { ok: false, status: 0, j: { erro: "Não foi possível ligar ao servidor. O progresso continua guardado neste dispositivo." } }; })
    .then(function (x) { if (t) clearTimeout(t); return x; });
}
function perfilOnline() { var p = lerJ(KO); if (!p || !p.id) { p = { id: "g" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36), nome: "", club: 0 }; gravarJ(KO, p); } return p; }

function juntar(a, b) {                       // contadores: o maior de cada lado (não somamos para não duplicar ao sincronizar)
  if (typeof a === "number" && typeof b === "number") return Math.max(a, b);
  if (a && b && typeof a === "object" && typeof b === "object") { var o = {}; Object.keys(a).concat(Object.keys(b)).forEach(function (k) { o[k] = k in a ? (k in b ? juntar(a[k], b[k]) : a[k]) : b[k]; }); return o; }
  return a == null ? b : a;
}
function dadosLocais() { return { stats: stats(), clube: lerJ(KC), u: Date.now() }; }
function aplicarRemotos(d) {
  if (!d || typeof d !== "object") return;
  if (d.stats) { var m = juntar(stats(), d.stats); m.u = Date.now(); gravarJ(KP, m); }
  var cl = lerJ(KC);
  if (d.clube && (!cl || (d.clube.u || 0) > (cl.u || 0))) { gravarJ(KC, d.clube); if (window.G94 && window.G94.clubeRecarregar) window.G94.clubeRecarregar(); }
}
var tmr = 0, ultimoErro = "";
function empurrarLogo() { if (!sessao()) return; clearTimeout(tmr); tmr = setTimeout(empurrar, 2500); }
function empurrar() {
  var s = sessao(); if (!s) return Promise.resolve(false);
  return chamar("PUT", "/conta/progresso", { dados: dadosLocais() }, s.token).then(function (r) {
    if (r.status === 401) { localStorage.removeItem(KS); ultimoErro = "A sessão expirou. Entra de novo para continuar a sincronizar."; return false; }
    ultimoErro = r.ok ? "" : (r.j.erro || ""); return r.ok;
  });
}
function iniciarSessao(r, email) {
  gravarJ(KS, { token: r.j.token, email: r.j.email || email, perfilId: r.j.perfilId });
  var p = perfilOnline(); p.id = r.j.perfilId; gravarJ(KO, p);         // o perfil online passa a ser o da conta: ELO e vitórias online ficam ligados a ela
  if (r.j.progresso) aplicarRemotos(r.j.progresso.dados);
  return empurrar();
}
function terminar() {
  var s = sessao(); if (s) chamar("DELETE", "/conta/sessao", null, s.token);
  localStorage.removeItem(KS);
  var p = lerJ(KO) || {}; p.id = "g" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); gravarJ(KO, p);   // volta a convidado: não se joga online com o perfil da conta sem entrar
}

/* ---------- ecrã ---------- */
var campo = "width:100%;padding:12px 14px;border-radius:8px;border:1px solid #496d83;background:#071521;color:#fff;font-size:16px;box-sizing:border-box";
function linhaStat(rot, v) { return '<div class="g94-st"><b>' + esc(v) + '</b><span>' + esc(rot) + '</span></div>'; }
function blocoStats(o) {
  var s = stats(), t = s.tot, h = '<div class="g94-stats">' + linhaStat("Jogos", t.j) + linhaStat("Vitórias", t.v) + linhaStat("Empates", t.e) + linhaStat("Derrotas", t.d) + linhaStat("Golos marcados", t.gf) + linhaStat("Golos sofridos", t.gs) + linhaStat("Taças ganhas", s.tacas || 0) + linhaStat("Títulos de época", s.titulos || 0) + '</div>';
  var ms = Object.keys(s.modos).filter(function (k) { return MODOS[k]; });
  if (ms.length) h += '<div class="tablewrap"><table><thead><tr><th style="text-align:left">Modo</th><th>J</th><th>V</th><th>E</th><th>D</th></tr></thead><tbody>' + ms.map(function (k) { var m = s.modos[k]; return '<tr><td style="text-align:left">' + MODOS[k] + '</td><td>' + m.j + '</td><td>' + m.v + '</td><td>' + m.e + '</td><td>' + m.d + '</td></tr>'; }).join("") + '</tbody></table></div>';
  h += '<p class="panel-title" style="margin-top:14px">Online (1 contra 1)</p>';
  if (o) h += '<div class="g94-stats">' + linhaStat("ELO", o.elo) + linhaStat("Jogos", o.jogos) + linhaStat("Vitórias", o.vitorias) + linhaStat("Empates", o.empates) + linhaStat("Derrotas", o.derrotas) + '</div>';
  else h += '<p class="note">' + (sessao() ? "Ainda não jogaste online com esta conta." : "Entra com a tua conta para ver aqui as vitórias e derrotas online.") + '</p>';
  return h;
}
function ecra(msg, tipo) {
  leaveMatch();
  var s = sessao();
  app.innerHTML = '<section class="screen g94-screen"><button class="back" id="cBack">' + BACK + 'Menu</button>' +
    '<div><p class="eyebrow">Girabola 94</p><h2>' + (s ? "A tua conta" : "Guardar o teu progresso") + '</h2></div>' +
    (msg ? '<p class="note" role="status" style="color:' + (tipo === "ok" ? "#7be08f" : "#ffb4a8") + '">' + esc(msg) + '</p>' : '') +
    '<div class="panel" id="cCorpo"></div></section>';
  document.getElementById("cBack").onclick = function () { showMenu(); };
  var corpo = document.getElementById("cCorpo");
  if (s) {
    corpo.innerHTML = '<p>Ligado como <b>' + esc(s.email) + '</b></p><div id="cStats"><p class="note">A carregar…</p></div>' +
      '<div class="row"><button class="btn" id="cSync">Sincronizar agora</button><button class="btn ghost" id="cSair">Sair</button></div>';
    document.getElementById("cSync").onclick = function () { empurrar().then(function () { ecra(ultimoErro || "Progresso guardado na conta.", ultimoErro ? "erro" : "ok"); }); };
    document.getElementById("cSair").onclick = function () { terminar(); ecra("Saíste da conta. O progresso continua neste dispositivo.", "ok"); };
    document.getElementById("cStats").innerHTML = blocoStats(null);
    chamar("GET", "/conta/eu", null, s.token).then(function (r) {
      var el = document.getElementById("cStats"); if (!el) return;
      if (r.status === 401) { localStorage.removeItem(KS); ecra("A sessão expirou. Entra de novo.", "erro"); return; }
      el.innerHTML = blocoStats(r.ok ? r.j.online : null);
    });
  } else {
    corpo.innerHTML = '<p class="note">Sem conta, o teu progresso (vitórias, derrotas, taças e a configuração do clube) fica só neste dispositivo. Com conta, fica guardado e acompanha-te noutros dispositivos, incluindo as vitórias e derrotas online.</p>' +
      '<div class="g94-form"><label>Email<input id="cEmail" type="email" autocomplete="email" maxlength="120" style="' + campo + '"></label>' +
      '<label>Senha (mínimo 8 caracteres)<input id="cSenha" type="password" autocomplete="current-password" maxlength="128" style="' + campo + '"></label>' +
      '<div class="row"><button class="btn" id="cEntrar">Entrar</button><button class="btn ghost" id="cCriar">Criar conta</button></div>' +
      '<p class="note">Não há recuperação de senha por email nesta versão: guarda-a num sítio seguro.</p></div>' +
      '<p class="panel-title" style="margin-top:14px">Progresso neste dispositivo</p>' + blocoStats(null);
    var go = function (novo) {
      var em = document.getElementById("cEmail").value.trim(), se = document.getElementById("cSenha").value;
      if (!em || !se) { ecra("Preenche o email e a senha.", "erro"); return; }
      var b1 = document.getElementById("cEntrar"), b2 = document.getElementById("cCriar"); b1.disabled = b2.disabled = true;
      chamar("POST", novo ? "/conta/registar" : "/conta/entrar", { email: em, senha: se, perfilId: perfilOnline().id }).then(function (r) {
        if (!r.ok) { ecra(r.j.erro || "Não foi possível concluir.", "erro"); return; }
        iniciarSessao(r, em).then(function () { ecra(novo ? "Conta criada. O teu progresso fica guardado." : "Bem-vindo de volta.", "ok"); });
      });
    };
    document.getElementById("cEntrar").onclick = function () { go(false); };
    document.getElementById("cCriar").onclick = function () { go(true); };
    document.getElementById("cSenha").onkeydown = function (e) { if (e.key === "Enter") go(false); };
  }
  window.scrollTo(0, 0);
}

window.G94 = Object.assign(window.G94 || {}, { stats: stats, sessao: sessao, showConta: ecra, empurrarLogo: empurrarLogo, registarJogo: registar });
if (sessao()) setTimeout(function () { chamar("GET", "/conta/eu", null, sessao().token).then(function (r) { if (r.status === 401) localStorage.removeItem(KS); else if (r.ok && r.j.progresso) aplicarRemotos(r.j.progresso.dados); }); }, 1500);
})();
