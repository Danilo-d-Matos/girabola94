/* ===== Girabola 94: gravações de som (bola, árbitro e adeptos) =====
   Substituem os sons sintetizados correspondentes. Os ficheiros estão em audio/ (pacote "Girabola94_Efeitos_Sonoros").
   Enquanto não carregam, o motor sintetizado de audio-engine.js continua a servir de reserva. */
(function () {
"use strict";
var FILES = {
  amb: "01_estadio_ambiente_loop.wav", med: "02_adeptos_reacao_media.wav", goal: "03_adeptos_golo.wav", intense: "04_adeptos_reacao_intensa.wav",
  expect: "05_adeptos_expectativa.wav", pass: "06_toque_bola_passe.wav", shot: "07_toque_bola_remate.wav", touch: "08_toque_bola_curto.wav",
  wShort: "09_apito_arbitro_curto.wav", wLong: "10_apito_arbitro_longo.wav", wAlt: "11_apito_alternativo.wav", goalAmb: "12_golo_reacao_estadio.wav", final: "13_apito_final_com_adeptos.wav"
};
/* pontos úteis de cada ficheiro (segundos), medidos na onda: toques e apitos vêm com silêncio à volta */
var HITS = { pass: [.95, 2.65], shot: [{ t: 1.25, v: .55 }, { t: 2.95, v: 1 }], touch: [.05] };
var WHISTLE = { wShort: [1.03, .42], wAlt: [0, .42], wLong: [.27, 1.15] };       // início e duração
var BUF = {}, started = false, amb = null, exp = null, lastKind = {}, lastBall = 0, ambLevel = 0;

function ctx() { return window.Aud && Aud.ok ? Aud.ctx : null; }
function nv(k, d) { var v = PREF[k]; return typeof v === "number" ? v : d; }
function carregar() {
  var c = ctx(); if (!c || started) return; started = true;
  var feitos = 0, total = Object.keys(FILES).length;
  Object.keys(FILES).forEach(function (k) {
    fetch("audio/" + FILES[k]).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(function (a) { return new Promise(function (ok, no) { c.decodeAudioData(a, ok, no); }); })
      .then(function (b) { BUF[k] = b; if (BUF.amb && BUF.goal && BUF.pass && BUF.shot && BUF.touch && BUF.wShort && BUF.wLong) Aud.sampleOn = true; })
      .catch(function (e) { console.warn("som indisponível:", FILES[k], e && e.message); });
  });
}
/* só começa depois do primeiro gesto do utilizador (o motor cria o contexto aí) */
["pointerdown", "keydown", "touchstart"].forEach(function (ev) { addEventListener(ev, function () { setTimeout(carregar, 60); }, { passive: true }); });
setInterval(function () { if (ctx()) carregar(); }, 1000);

/* tocar um excerto: bus de destino, volume, início, duração, velocidade, entrada/saída em segundos */
function tocar(k, o) {
  var c = ctx(), b = BUF[k]; if (!c || !b || c.state !== "running") return null;
  var s = c.createBufferSource(), g = c.createGain(), t = c.currentTime, off = o.off || 0, dur = Math.min(o.dur || b.duration - off, b.duration - off), vol = o.vol == null ? 1 : o.vol, fin = o.in == null ? .004 : o.in, fout = Math.min(o.out == null ? .06 : o.out, dur / 2);
  s.buffer = b; s.playbackRate.value = o.rate || 1; s.loop = !!o.loop; s.connect(g); g.connect(o.bus);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + fin);
  if (!o.loop) { g.gain.setValueAtTime(vol, t + dur - fout); g.gain.linearRampToValueAtTime(0, t + dur); s.start(t, off, dur); } else s.start(t, off);
  s.onended = function () { try { g.disconnect(); } catch (e) {} };
  return { s: s, g: g };
}
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function pronto() { return !!Aud.sampleOn; }

/* ---- bola e apitos (barramento de efeitos) ---- */
Aud.sample = function (k, v) {
  if (!pronto()) return false;
  var bus = Aud.sfxBus, now = performance.now();
  if (k === "kick") {
    if (now - lastBall < 45) return true; lastBall = now;
    var sp = v || 6, bv = nv("ballVol", 1), rate = .96 + Math.random() * .08;
    if (sp > 10) { var h = sp > 12.2 ? HITS.shot[1] : pick(HITS.shot); tocar("shot", { bus: bus, off: h.t - .03, dur: .5, vol: (.75 + .25 * h.v) * bv, rate: rate, out: .12 }); }
    else if (sp < 4) tocar("touch", { bus: bus, off: HITS.touch[0] - .03, dur: .4, vol: .9 * bv, rate: rate, out: .1 });
    else tocar("pass", { bus: bus, off: pick(HITS.pass) - .03, dur: .45, vol: (.55 + Math.min(.45, sp / 22)) * bv, rate: rate, out: .1 });
    return true;
  }
  if (k === "save") { tocar("touch", { bus: bus, off: .03, dur: .4, vol: .9 * nv("ballVol", 1), rate: .85, out: .1 }); return true; }
  if (k === "whistle") {
    var n = Math.max(1, Math.min(3, Math.round(v || 1))), rv = nv("refVol", 1);
    if (n >= 3) return true;                                       // apito final: vem dentro da gravação "apito final com adeptos"
    var apito = function (nome, atraso) { var w = WHISTLE[nome]; setTimeout(function () { tocar(nome, { bus: bus, off: Math.max(0, w[0] - .03), dur: w[1] + .08, vol: .95 * rv, out: .08 }); }, atraso); };
    if (n === 2) apito("wLong", 0); else apito(pick(["wShort", "wAlt"]), 0);
    return true;
  }
  return false;
};

/* ---- adeptos (barramento de adeptos) ---- */
function repetido(kind, ms) { var n = performance.now(); if (lastKind[kind] && n - lastKind[kind] < ms) return true; lastKind[kind] = n; return false; }
Aud.crowdSample = function (kind) {
  if (!pronto()) return false;
  var bus = Aud.crowd, cv = nv("crowdVol", .8);
  switch (kind) {
    case "goal":
      if (repetido("goal", 2500)) return true;
      if (Math.random() < .5) tocar("goal", { bus: bus, vol: 1, dur: 6.5, in: .05, out: 1.2 });
      else tocar("goalAmb", { bus: bus, vol: 1, off: 2.7, dur: 6.8, in: .05, out: 1.2 });
      return true;
    case "save": if (!repetido("save", 1500)) tocar("med", { bus: bus, vol: .8, off: .7, dur: 4.2, in: .3, out: 1.2 }); return true;
    case "miss": if (!repetido("miss", 1500)) tocar("intense", { bus: bus, vol: .75, off: 4.3, dur: 3.4, in: .5, out: 1.2 }); return true;
    case "foul": if (!repetido("foul", 2000)) tocar("med", { bus: bus, vol: .45, off: 1.3, dur: 3, in: .3, out: 1 }); return true;
    case "half": if (!repetido("half", 3000)) tocar("med", { bus: bus, vol: .7, off: 1, dur: 5, in: .3, out: 1.5 }); return true;
    case "end":
      if (repetido("end", 4000)) return true;
      tocar("final", { bus: bus, vol: 1, dur: BUF.final ? BUF.final.duration : 5.7, in: .01, out: 1 }); return true;
    case "kickoff": if (!repetido("kickoff", 3000)) tocar("med", { bus: bus, vol: .25, off: .8, dur: 2.6, in: .4, out: 1 }); return true;
    case "shot": return true;       // a tensão é a do ambiente (sobe com a excitação)
  }
  return false;
};

/* ---- ambiente contínuo e expectativa (a cada actualização do jogo) ---- */
Aud.crowdTick = function (dt, CR, G) {
  var c = ctx(); if (!c || !pronto() || !G) return;
  var now = c.currentTime;
  if (!amb || !amb.alive) {
    amb = tocar("amb", { bus: Aud.crowd, vol: 0, loop: true, in: .01 }); if (amb) { amb.alive = true; amb.s.onended = function () { amb.alive = false; }; }
  }
  if (amb) {
    var alvo = (.2 + .5 * (CR.exc || 0) + .12 * (CR.tension || 0)) * (G.paused ? .3 : 1);
    amb.g.gain.setTargetAtTime(alvo, now, .4);
  }
  /* penálti e livres directos: gravação de expectativa enquanto se prepara o remate */
  var espera = G.state === "pen" && !(G.pen && G.pen.fired);
  if (espera && (!exp || !exp.alive) && BUF.expect) {
    exp = tocar("expect", { bus: Aud.crowd, vol: 0, loop: true, in: .01 }); if (exp) { exp.alive = true; exp.g.gain.setTargetAtTime(.7, now, .5); exp.s.onended = function () { exp.alive = false; }; }
  } else if (!espera && exp && exp.alive) { exp.g.gain.setTargetAtTime(0, now, .25); var e0 = exp; exp = null; setTimeout(function () { try { e0.s.stop(); } catch (x) {} e0.alive = false; }, 900); }
};
})();
