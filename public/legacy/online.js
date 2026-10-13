/* ===== Modo online 1x1 (cliente) =====
   O servidor tem a autoridade: este código só envia inputs e desenha o estado recebido.
   Depende de window.Colyseus (src/main.js) e das funções do jogo (game.js, gl3d.js). */
(function () {
"use strict";
var VERSAO = 1, DT_MS = 1000 / 60, ATRASO = 100;               // versão do protocolo; atraso de interpolação (ms)
var URL_SERVIDOR = window.GIRABOLA_SERVIDOR || ("ws://" + (location.hostname || "localhost") + ":2567");
var ST = null;                                                  // estado da sessão online
var ESTADOS = ["play", "kickoff", "setpiece", "goal", "replay", "half", "end", "pen", "var", "shootwait"];

var CHAVE = "girabola.online" + (new URLSearchParams(location.search).get("perfil") ? "." + new URLSearchParams(location.search).get("perfil") : "");   // ?perfil=x permite dois jogadores no mesmo navegador (testes)
function perfil() {
  var p = null;
  try { p = JSON.parse(localStorage.getItem(CHAVE) || "null"); } catch (e) {}
  if (!p || !p.id) p = { id: "g" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36), nome: "", club: 0 };
  return p;
}
function guardar(p) { try { localStorage.setItem(CHAVE, JSON.stringify(p)); } catch (e) {} }
var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

/* ---------------- ecrãs ---------------- */
function ecraPerfil() {
  limpar(true);
  leaveMatch();
  var p = perfil(), escolhido = p.club;
  app.innerHTML = '<section class="screen online-screen"><div class="ol-top"><button class="back" id="oBack">' + BACK + 'Voltar</button>' +
    '<div><p class="eyebrow">Jogar online</p><h2>Escolhe o teu clube</h2></div></div><div class="ol-cols"><div class="ol-left">' +
    '<div class="opt"><span class="panel-title">O teu nome</span><input id="oNome" maxlength="16" autocomplete="off" placeholder="Nome de jogador" value="' + esc(p.nome) + '" style="width:100%;padding:12px 14px;border-radius:10px;border:1px solid #4d7088;background:#0c1a2a;color:#eef4fa;font:600 18px system-ui"><p class="note" id="oErro" style="color:#ff8a8a"></p></div>' +
    '<div class="row"><button class="btn" id="oProcurar">Procurar adversário</button></div>' +
    '<div class="opt"><span class="panel-title">Jogar com um amigo</span><div class="row"><button class="btn ghost" id="oCriar">Criar sala privada</button><input id="oCodigo" maxlength="5" placeholder="CÓDIGO" style="width:120px;padding:10px;border-radius:10px;border:1px solid #4d7088;background:#0c1a2a;color:#eef4fa;font:700 18px system-ui;text-transform:uppercase;text-align:center"><button class="btn ghost" id="oEntrar">Entrar</button></div></div>' +
    '<p class="note">Sem conta: o teu perfil de convidado fica guardado neste dispositivo.</p></div>' +
    '<div class="ol-teams"><div class="grid" id="oGrid">' + TEAMS.map(function (t, i) { return '<button class="team" data-i="' + i + '" aria-pressed="' + (i === escolhido) + '">' + crest(i, 64) + '<div style="min-width:0"><b>' + t.n + '</b><span>Força ' + t.r + '</span></div></button>'; }).join("") + '</div></div></div></section>';
  var marcar = function () { app.querySelectorAll("#oGrid .team").forEach(function (b) { b.setAttribute("aria-pressed", +b.dataset.i === escolhido); b.style.outline = +b.dataset.i === escolhido ? "3px solid #f6c744" : ""; }); };
  marcar();
  app.querySelectorAll("#oGrid .team").forEach(function (b) { b.onclick = function () { escolhido = +b.dataset.i; marcar(); try { sfx("ui"); } catch (e) {} }; });
  document.getElementById("oBack").onclick = showMenu;
  var iniciar = function (modo) {
    var nome = document.getElementById("oNome").value.trim();
    if (nome.length < 2) { document.getElementById("oErro").textContent = "Escolhe um nome com pelo menos 2 letras."; return; }
    var cod = (document.getElementById("oCodigo").value || "").trim().toUpperCase();
    if (modo === "entrar" && cod.length < 5) { document.getElementById("oErro").textContent = "Escreve o código de 5 letras."; return; }
    p.nome = nome; p.club = escolhido; guardar(p);
    procurar(p, modo, cod);
  };
  document.getElementById("oProcurar").onclick = function () { iniciar(); };
  document.getElementById("oCriar").onclick = function () { iniciar("criar"); };
  document.getElementById("oEntrar").onclick = function () { iniciar("entrar"); };
  window.scrollTo(0, 0);
}

function ecraProcura() {
  app.innerHTML = '<section class="screen" style="text-align:center"><div><p class="eyebrow">Jogar online</p><h2>A procurar adversário…</h2></div>' +
    '<div style="margin:26px auto;width:64px;height:64px;border:6px solid #26425b;border-top-color:#f6c744;border-radius:50%;animation:olspin 1s linear infinite"></div><style>@keyframes olspin{to{transform:rotate(360deg)}}</style>' +
    '<p class="lede" id="oTempo">0 s</p><p class="note" id="oInfo">A ligar ao servidor…</p><div class="row" id="oBtns"><button class="btn ghost" id="oCancelar">Cancelar</button></div></section>';
  document.getElementById("oCancelar").onclick = function () { cancelar(); ecraPerfil(); };
  var t0 = Date.now();
  ST.tmr = setInterval(function () { var e = document.getElementById("oTempo"); if (e) e.textContent = Math.floor((Date.now() - t0) / 1000) + " s"; }, 500);
}

function ecraProposta(m) {
  clearInterval(ST.tmr);
  var lin = function (x, rotulo) { return '<div class="pw-side">' + crest(x.club, 56) + '<b>' + esc(x.nome) + '</b><small>' + TEAMS[x.club].n + ' · ELO ' + x.elo + '</small></div>'; };
  app.innerHTML = '<section class="screen" style="text-align:center"><div><p class="eyebrow">Adversário encontrado</p><h2>Aceitas o jogo?</h2></div>' +
    '<div class="pw-versus" style="margin:14px 0">' + lin(m.eu) + '<div class="pw-mid"><span class="vs">VS</span><p class="muted" id="oConta">10 s</p><p class="note" id="oPing">ping: …</p></div>' + lin(m.adv) + '</div>' +
    '<div class="row"><button class="btn" id="oAceitar">Aceitar</button><button class="btn ghost" id="oRecusar">Recusar</button></div></section>';
  var fim = Date.now() + 10000;
  ST.tmr = setInterval(function () { var e = document.getElementById("oConta"); if (e) e.textContent = Math.max(0, Math.ceil((fim - Date.now()) / 1000)) + " s"; }, 250);
  document.getElementById("oAceitar").onclick = function () { ST.fila.send("aceitar", { id: m.id }); document.getElementById("oAceitar").disabled = true; document.getElementById("oAceitar").textContent = "À espera do adversário…"; };
  document.getElementById("oRecusar").onclick = function () { ST.fila.send("recusar", { id: m.id }); cancelar(); ecraPerfil(); };
}

function aviso(txt) { var d = document.getElementById("oInfo"); if (d) d.textContent = txt; }

/* ---------------- ligação e matchmaking ---------------- */
function limpar(fecharTudo) {
  if (!ST) return;
  clearInterval(ST.tmr); clearInterval(ST.pingTmr);
  if (fecharTudo) {
    try { if (ST.fila) ST.fila.leave(); } catch (e) {}
    try { if (ST.sala) ST.sala.leave(); } catch (e) {}
    var hp = document.getElementById("olPing"); if (hp && hp.parentNode) hp.parentNode.removeChild(hp);
    ST = null; window.__olPending = null;
  }
}
function cancelar() { try { if (ST && ST.fila) ST.fila.send("cancelar"); } catch (e) {} limpar(true); }

function procurar(p, modo, codigo) {
  limpar(true);
  ST = { perfil: p, tmr: 0, snaps: [], hist: [], off: null, ack: 0, seq: 0, ping: 0 };
  ecraProcura();
  var cli = new window.Colyseus.Client(URL_SERVIDOR);
  ST.cli = cli;
  cli.joinOrCreate("fila", { ver: VERSAO }).then(function (fila) {
    if (!ST) { fila.leave(); return; }
    ST.fila = fila;
    fila.onMessage("na_fila", function (m) { aviso("Na fila · ELO " + m.elo + " · " + m.vitorias + "V " + m.empates + "E " + m.derrotas + "D · " + m.online + " à procura"); });
    fila.onMessage("proposta", ecraProposta);
    fila.onMessage("recusou", function () { alert("O adversário não aceitou. Volta a procurar."); ecraPerfil(); });
    fila.onMessage("adversario_saiu", function () { ecraProcura(); aviso("O adversário saiu. A procurar outro…"); fila.send("procurar", { nome: p.nome, club: p.club, id: p.id }); });
    fila.onMessage("sem_adversario", function () {
      var b = document.getElementById("oBtns"); if (!b) return;
      aviso("Ninguém disponível por agora.");
      b.innerHTML = '<button class="btn" id="oIA">Jogar contra o computador</button><button class="btn ghost" id="oCont">Continuar à procura</button><button class="btn ghost" id="oCancelar">Cancelar</button>';
      document.getElementById("oIA").onclick = function () { cancelar(); showPick("quick1"); };
      document.getElementById("oCont").onclick = function () { aviso("A continuar a procurar…"); b.innerHTML = '<button class="btn ghost" id="oCancelar">Cancelar</button>'; document.getElementById("oCancelar").onclick = function () { cancelar(); ecraPerfil(); }; };
      document.getElementById("oCancelar").onclick = function () { cancelar(); ecraPerfil(); };
    });
    fila.onMessage("erro", function (m) { alert(m); limpar(true); ecraPerfil(); });
    fila.onMessage("reserva", function (r) { entrarNaPartida(r); });
    fila.onMessage("p", function () {});
    fila.onError(function () { aviso("Erro de ligação ao servidor."); });
    fila.onMessage("privada_codigo", function (m) {
      document.getElementById("oTempo").textContent = m.codigo;
      aviso("Diz este código ao teu amigo. A aguardar que ele entre…");
    });
    if (modo === "criar") fila.send("privada_criar", { nome: p.nome, club: p.club, id: p.id });
    else if (modo === "entrar") fila.send("privada_entrar", { nome: p.nome, club: p.club, id: p.id, codigo: codigo });
    else fila.send("procurar", { nome: p.nome, club: p.club, id: p.id });
  }).catch(function (e) {
    var msg = (e && e.message) || "";
    alert(/Actualiza/.test(msg) ? "Actualiza o jogo." : "Não foi possível ligar ao servidor online.\n(" + URL_SERVIDOR + ")");
    limpar(true); ecraPerfil();
  });
}

function entrarNaPartida(reserva) {
  clearInterval(ST.tmr);
  app.innerHTML = '<section class="screen" style="text-align:center"><div><p class="eyebrow">Jogar online</p><h2>A ligar à partida…</h2></div><p class="lede">Os dois jogadores estão a carregar o estádio.</p></section>';
  ST.cli.consumeSeatReservation(reserva).then(function (sala) {
    ST.sala = sala;
    try { ST.fila.leave(); } catch (e) {}
    ST.fila = null;
    ligarSala(sala);
  }).catch(function () { alert("Não foi possível entrar na partida."); limpar(true); ecraPerfil(); });
}

function ligarSala(sala) {
  sala.onMessage("iniciar", function (m) { ST.info = m; preparar(m); });
  sala.onMessage("comecar", function () { ST.comecou = true; });
  sala.onMessage("s", receberSnap);
  sala.onMessage("fim", function (m) { ST.fim = m; mostrarFim(m); });
  sala.onMessage("adv_desligado", function () { aviso2("O adversário perdeu a ligação. A aguardar até 30 s…"); });
  sala.onMessage("adv_voltou", function () { aviso2("O adversário voltou."); setTimeout(function () { aviso2(""); }, 1500); });
  sala.onMessage("p", function (t) { ST.ping = Math.round(performance.now() - t); atualizarPing(); });
  sala.onMessage("revanche_pedida", function () { var b = document.getElementById("oOutra"); if (b) b.textContent = "Jogar outra vez (o adversário já quer)"; });
  sala.onMessage("reserva", function (r) {
    var antigaPref = ST.guardaPref;
    try { ST.sala.leave(); } catch (e) {}
    clearInterval(ST.pingTmr); ST.fim = null; ST.snaps = []; ST.hist = []; ST.off = null; ST.ultimo = null; ST.comecou = false; ST.guardaPref = antigaPref;
    entrarNaPartida(r);
  });
  sala.onLeave(function (code) { if (ST && !ST.fim && code !== 1000) reconectar(); });
  ST.pingTmr = setInterval(function () { try { sala.send("p", performance.now()); if (ST.ping) sala.send("rtt", ST.ping); } catch (e) {} }, 2000);
}

function reconectar() {
  if (!ST || ST.reconectando) return;
  ST.reconectando = true; aviso2("Ligação perdida. A tentar voltar…");
  var tok = ST.sala && ST.sala.reconnectionToken, t0 = Date.now();
  var tenta = function () {
    if (!ST || ST.fim) return;
    if (Date.now() - t0 > 30000) { aviso2("Não foi possível voltar à partida."); return; }
    ST.cli.reconnect(tok).then(function (s) { ST.sala = s; ST.reconectando = false; aviso2(""); ligarSala(s); }).catch(function () { setTimeout(tenta, 2000); });
  };
  tenta();
}

function aviso2(txt) {
  var d = document.getElementById("olAviso");
  if (!txt) { if (d && d.parentNode) d.parentNode.removeChild(d); return; }
  if (!d) { d = document.createElement("div"); d.id = "olAviso"; d.style.cssText = "position:fixed;left:50%;top:70px;transform:translateX(-50%);z-index:9000;background:#12263aee;border:1px solid #f6c744;color:#fff;padding:10px 18px;border-radius:12px;font:600 16px system-ui"; document.body.appendChild(d); }
  d.textContent = txt;
}
function atualizarPing() {
  var d = document.getElementById("olPing");
  if (!d) { d = document.createElement("div"); d.id = "olPing"; d.style.cssText = "position:fixed;right:10px;top:8px;z-index:9000;background:#081421cc;color:#cfe3f2;padding:4px 10px;border-radius:8px;font:600 13px system-ui"; document.body.appendChild(d); }
  var ms = ST ? ST.ping : 0;
  d.textContent = "ping " + ms + " ms" + (ms > 200 ? " · ligação fraca" : "");
  d.style.color = ms > 200 ? "#ff8a8a" : "#cfe3f2";
}

/* ---------------- entrada em campo ---------------- */
function preparar(m) {
  var guest = m.lado === 1;
  ST.guest = guest;
  var o = { L: guest ? m.R : m.L, R: guest ? m.L : m.R, homeLeft: true, mode: "quick", diff: "normal", rules: "classic", tac: "bal", form: "221" };
  ST.guardaPref = { stadium: PREF.stadium, daytime: PREF.daytime };
  PREF.stadium = m.estadio; PREF.daytime = m.dia;
  ST.escala = MATCH_LEN / (m.matchLen || MATCH_LEN);
  window.__olPending = { guest: guest, lado: m.lado, cols: m.cols };
  (window.launchPre || launch)(o);                                                  // o launch() espera pelo carregamento do estádio
  var esperar = function () {
    if (!ST || !G || !G.online) { setTimeout(esperar, 100); return; }
    if (guest) G.cols = [m.cols[1], m.cols[0]]; else G.cols = [m.cols[0], m.cols[1]];
    try { ST.sala.send("pronto"); } catch (e) {}
  };
  esperar();
}

/* ---------------- instantâneos ---------------- */
function lerSnap(buf) {
  var u = buf instanceof Uint8Array ? buf : new Uint8Array(buf), dv = new DataView(u.buffer, u.byteOffset, u.byteLength), o = 0, s = {};
  o++; var n = dv.getUint8(o++); s.n = n;
  s.tick = dv.getUint32(o); o += 4;
  s.state = ESTADOS[dv.getUint8(o++)] || "play";
  var fl = dv.getUint8(o++); s.half = fl & 1 ? 2 : 1; s.swap = !!(fl & 2); var temMsg = !!(fl & 4);
  s.t = dv.getUint16(o) / 10; o += 2;
  s.score = [dv.getUint8(o++), dv.getUint8(o++)];
  s.bx = dv.getUint16(o) / 60; o += 2; s.by = dv.getUint16(o) / 60; o += 2; s.bz = dv.getUint8(o++) / 3;
  s.owner = dv.getInt8(o++); s.hot = dv.getUint8(o++);
  s.c0 = dv.getInt8(o++); s.c2 = dv.getInt8(o++);
  s.ch = [dv.getUint8(o++) / 255, dv.getUint8(o++) / 255];
  s.st = dv.getUint16(o) / 100; o += 2;
  s.p = [];
  for (var i = 0; i < n; i++) {
    var p = {};
    p.x = dv.getUint16(o) / 60; o += 2; p.y = dv.getUint16(o) / 60; o += 2;
    p.fx = dv.getInt8(o++) / 100; p.fy = dv.getInt8(o++) / 100;
    p.run = dv.getUint16(o) / 10; o += 2;
    p.vx = dv.getInt8(o++) / 25; p.vy = dv.getInt8(o++) / 25;
    var f = dv.getUint8(o++); p.stun = f & 1; p.off = !!(f & 2); p.slide = !!(f & 4); p.spr = !!(f & 8); p.dive = f & 16 ? ((f & 32) ? 1 : -1) : 0; p.jump = !!(f & 64); p.down = !!(f & 128);
    p.kick = dv.getUint8(o++) / 100; p.dt = dv.getUint8(o++) / 100;
    s.p.push(p);
  }
  var ne = dv.getUint8(o++); s.ev = [];
  for (var k = 0; k < ne; k++) { s.ev.push([dv.getUint8(o++), dv.getUint8(o++)]); }
  if (temMsg) {
    var ml = dv.getUint8(o++), sl = dv.getUint8(o++), dec = new TextDecoder();
    s.msg = dec.decode(u.subarray(o, o + ml)); o += ml;
    s.sub = dec.decode(u.subarray(o, o + sl)); o += sl;
  }
  return s;
}
function receberSnap(m) {
  if (!ST) return;
  var s; try { s = lerSnap(m.d); } catch (e) { return; }
  var agora = performance.now(), st = s.tick * DT_MS;
  s.ta = agora; s.ts = st;
  var d = agora - st;
  ST.off = ST.off == null || d < ST.off ? d : ST.off * 0.98 + d * 0.02;
  ST.snaps.push(s); if (ST.snaps.length > 40) ST.snaps.shift();
  ST.ack = m.a | 0;
  while (ST.hist.length && ST.hist[0].seq <= ST.ack) ST.hist.shift();
  if (s.msg !== undefined) { ST.msg = s.msg; ST.sub = s.sub; }
  if (s.ev.length) ST.evs = (ST.evs || []).concat([s.ev]);
  ST.ultimo = s;
}

/* mapa índice do servidor -> jogador do cliente (o convidado vê o campo rodado 180º e com as equipas trocadas) */
function idx(i, n) { return ST.guest ? (i + n / 2) % n : i; }
function mxy(x, y) { return ST.guest ? [W - x, H - y] : [x, y]; }

function aplicar(s, rt) {
  var n = s.n, a = null, b = null, snaps = ST.snaps;
  for (var i = snaps.length - 1; i >= 0; i--) { if (snaps[i].ts <= rt) { a = snaps[i]; b = snaps[i + 1] || null; break; } }
  if (!a) a = snaps[0];
  var al = b && b.ts > a.ts ? Math.max(0, Math.min(1, (rt - a.ts) / (b.ts - a.ts))) : 0, c = b || a;
  var mi = ST.info.lado === 1 ? s.c2 : s.c0;                          // o meu jogador controlado (índice no servidor)
  for (var j = 0; j < n; j++) {
    var pa = a.p[j], pb = c.p[j], g = G.players[idx(j, n)];
    var x = pa.x + (pb.x - pa.x) * al, y = pa.y + (pb.y - pa.y) * al, fx = pa.fx + (pb.fx - pa.fx) * al, fy = pa.fy + (pb.fy - pa.fy) * al;
    if (j === mi && !ST.semPrev) {
      var q = prever(s.p[j], s), d = ST.disp && ST.dispIdx === j ? ST.disp : null;
      if (!d || Math.hypot(q.x - d.x, q.y - d.y) > 70) d = { x: q.x, y: q.y }; else { d.x += (q.x - d.x) * .35; d.y += (q.y - d.y) * .35; }
      ST.disp = d; ST.dispIdx = j; x = d.x; y = d.y;
    }
    var P = mxy(x, y); g.x = P[0]; g.y = P[1];
    var m = Math.hypot(fx, fy) || 1; fx /= m; fy /= m; g.fx = ST.guest ? -fx : fx; g.fy = ST.guest ? -fy : fy;
    g.vx = ST.guest ? -pb.vx : pb.vx; g.vy = ST.guest ? -pb.vy : pb.vy;
    g.run = pb.run; g.stun = pb.stun ? 1 : 0; g.off = pb.off; g.tackling = pb.slide; g.dash = pb.slide ? .2 : 0; g.sprinting = pb.spr;
    g.kickAnim = pb.kick; g.gkJump = pb.jump ? .5 : 0; g.gkDown = pb.down ? .5 : 0;
    g.dive = pb.dive ? { side: ST.guest ? -pb.dive : pb.dive, t: pb.dt, dur: .5, ty: g.y, v: 0 } : null;
  }
  // bola
  var bx = a.bx + (c.bx - a.bx) * al, by = a.by + (c.by - a.by) * al, B = G.ball;
  var P2 = mxy(bx, by); B.x = P2[0]; B.y = P2[1];
  B.z = (a.bz || 0) + ((c.bz || 0) - (a.bz || 0)) * al; B.vz = 0; B.sp = 0;
  var ow = c.owner >= 0 ? G.players[idx(c.owner, n)] : null; B.owner = ow;
  if (ow && c.owner === mi && !ST.semPrev) { B.x = ow.x + ow.fx * 11; B.y = ow.y + ow.fy * 11; }
  B.vx = 0; B.vy = 0;
  G.hot = s.hot ? 1.2 : 0;
  var cj = G.players[idx(mi, n)]; if (cj) G.ctrl = cj;
}

/* previsão do meu jogador: posição do último estado do servidor + os inputs que ainda não foram confirmados */
function prever(pl, s) {
  var x = pl.x, y = pl.y, sp = (G.ctrl && G.ctrl.sp) || 2.4;
  var dono = s.owner >= 0 && (s.owner === (ST.info.lado === 1 ? s.c2 : s.c0));
  for (var i = 0; i < ST.hist.length; i++) {
    var h = ST.hist[i], k = 2 * sp * (h.sprint ? 1.38 : 1) * (dono ? .92 : 1) * .93;
    x += h.sx * k; y += h.sy * k;
  }
  return { x: Math.max(X0 + 6, Math.min(X1 - 6, x)), y: Math.max(Y0 + 6, Math.min(Y1 - 6, y)) };
}

/* ---------------- passo do cliente (substitui a simulação local) ---------------- */
var _step = step;
step = function () {
  if (!G || !G.online) return _step.apply(this, arguments);
  if (!ST || !ST.ultimo) { input.shootPressed = input.passPressed = input.switchPressed = false; return; }
  enviarInput();
  var s = ST.ultimo, agora = performance.now();
  var rt = agora - ST.off - ATRASO;
  aplicar(s, rt);
  // estado, resultado, relógio e mensagens
  var e = s.state, vis = (e === "setpiece" || e === "pen" || e === "var" || e === "shootwait" || e === "replay") ? "play" : e;
  G.state = vis; G.half = s.half; G.t = s.t * ST.escala; G.st = s.st;
  G.score = ST.guest ? [s.score[1], s.score[0]] : [s.score[0], s.score[1]];
  var ch = ST.info.lado === 1 ? s.ch[1] : s.ch[0]; G.charge = ch; G.charging = ch > 0;
  if (ST.msg !== undefined) { G.msg = ST.msg; G.msgSub = ST.sub; }
  G.setp = null; G.pen = null; G.passTarget = null; G.aim = null;
  // eventos
  if (ST.evs) { var L = ST.evs; ST.evs = null; for (var i = 0; i < L.length; i++) for (var k = 0; k < L[i].length; k++) evento(L[i][k][0], L[i][k][1]); }
  input.shootPressed = input.passPressed = input.switchPressed = false;
  G.paused = false;
};

function evento(c, a) {
  try {
    if (c === 1) sfx("whistle", 1);
    else if (c === 2) sfx("kick", a / 10);
    else if (c === 3) { sfx("tackle"); }
    else if (c === 5) sfx("save");
    else if (c === 7) sfx("card");
    else if (c === 8) sfx("switch");
    else if (c === 4) { /* o golo vem em 200 */ }
    else if (c === 200) {
      var t = ST.guest ? 1 - a : a;
      sfx("goal"); goalFx(t); confetti(t, PREF.reduceFx ? 30 : 90);
      if (!PREF.reduceFx) { G.flash = .45; G.shake = .4; G.slow = .9; G.flashT = 2.4; }
      G.net = { x: G.ball.x > W / 2 ? X1 : X0, dir: G.ball.x > W / 2 ? 1 : -1, y: Math.max(GY0 + 12, Math.min(GY1 - 12, G.ball.y)), amp: 1 };
      if (window.gstCrowdEvent) window.gstCrowdEvent("goal", t);
    } else if (c >= 101 && c <= 108) {
      var nome = ["", "goal", "shot", "save", "miss", "half", "end", "kickoff", "foul"][c - 100];
      if (nome && nome !== "goal") crowdEvent(nome);
    }
  } catch (e) {}
}

var tickIn = 0;
function enviarInput() {
  tickIn++;
  var guest = ST.guest;
  ST.pend = ST.pend || { sh: 0, pa: 0, sw: 0 };
  if (input.shootPressed) ST.pend.sh = 1; if (input.passPressed) ST.pend.pa = 1; if (input.switchPressed) ST.pend.sw = 1;
  if (tickIn % 2) return;                                          // 30 Hz
  var x = guest ? -input.x : input.x, y = guest ? -input.y : input.y;
  var f = (input.sprint ? 1 : 0) | (input.shootHeld ? 2 : 0) | (ST.pend.sh ? 4 : 0) | (ST.pend.pa ? 8 : 0) | (ST.pend.sw ? 16 : 0) | (input.through ? 32 : 0) | (input.passHeld ? 64 : 0) | (input.dribble ? 128 : 0) | (input.cancelPressed ? 256 : 0);
  var seq = ++ST.seq;
  ST.hist.push({ seq: seq, sx: x, sy: y, sprint: !!input.sprint });
  if (ST.hist.length > 60) ST.hist.shift();
  ST.pend = { sh: 0, pa: 0, sw: 0 };
  try { ST.sala.send("i", [seq, Math.round(x * 100), Math.round(y * 100), f]); } catch (e) {}
}

/* a pausa não existe online */
var _canPause = canPause;
canPause = function () { return G && G.online ? false : _canPause(); };
var _cm = createMatch;
createMatch = function (o) { var g = _cm(o); if (window.__olPending) { g.online = window.__olPending; window.__olPending = null; } return g; };

/* ---------------- fim ---------------- */
function mostrarFim(m) {
  var meu = ST.info.lado, eu = m.placar[meu], el = m.placar[1 - meu];
  var res = m.motivo === "abandono" ? (m.vencedor === meu ? "Vitória por abandono" : "Derrota por abandono") : (eu > el ? "Vitória!" : eu < el ? "Derrota" : "Empate");
  var h = '<div class="card"><p class="eyebrow">Fim do jogo</p><h2>' + res + '</h2><div class="bigscore">' + eu + ' – ' + el + '</div>' +
    '<p class="muted">Remates ' + m.remates[meu] + ' – ' + m.remates[1 - meu] + '</p>' +
    (m.elo ? '<p class="muted">ELO ' + m.elo.antes + ' → <b>' + m.elo.depois + '</b> (' + (m.elo.depois >= m.elo.antes ? "+" : "") + (m.elo.depois - m.elo.antes) + ')</p>' : '') +
    '<div class="row"><button class="btn" id="oOutra">Jogar outra vez</button><button class="btn ghost" id="oMenu">Menu</button></div></div>';
  try { showOverlay(h); } catch (e) {}
  var b = document.getElementById("oMenu");
  if (b) b.onclick = function () { sair(); };
  var o2 = document.getElementById("oOutra");
  if (o2) o2.onclick = function () { try { ST.sala.send("revanche"); } catch (e) {} o2.disabled = true; o2.textContent = "À espera do adversário…"; };
}
function sair() {
  if (ST && ST.guardaPref) { PREF.stadium = ST.guardaPref.stadium; PREF.daytime = ST.guardaPref.daytime; }
  var a = document.getElementById("olAviso"); if (a && a.parentNode) a.parentNode.removeChild(a);
  limpar(true); showMenu();
}

/* ---------------- botão no menu ---------------- */
function injetar() {
  var q = document.getElementById("mQuick");
  if (q && !document.getElementById("mOnline")) {
    var b = document.createElement("button"); b.className = "btn"; b.id = "mOnline"; b.innerHTML = 'Jogar online <small>1 contra 1</small>';
    b.onclick = function () { try { ac(); } catch (e) {} ecraPerfil(); };
    q.parentNode.insertBefore(b, q);
  }
}
var _showMenu = showMenu;
showMenu = function () { _showMenu.apply(this, arguments); injetar(); };
injetar();
window.__girabolaOnline = { ecraPerfil: ecraPerfil, estado: function () { return ST; } };
})();
