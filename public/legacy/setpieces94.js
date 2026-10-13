/* ===== Girabola 94: HUD das bolas paradas (livre direto, penálti, canto, pontapé de baliza, lançamento) =====
   Só desenha: painel de controlos, faixa "BOLA PARADA", barra de potência e mira. A jogabilidade é a do jogo. */
(function () {
"use strict";
window.__sp94 = true;                                   // o HUD antigo do penálti (texto e barra) fica desligado
var AZUL = "#0066CC", ELET = "#00A8FF", OURO = "#FFC629", MARINHO = "#061626";

function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
function painel(c, x, y, w, h) {
  c.save(); c.fillStyle = "rgba(6,22,38,.74)"; c.strokeStyle = "rgba(0,102,204,.55)"; c.lineWidth = 1.5;
  rr(c, x, y, w, h, 10); c.fill(); c.stroke(); c.restore();
}
var FONT_T = "700 17px 'Barlow Condensed','Arial Narrow',sans-serif", FONT_S = "600 15px system-ui,sans-serif";

/* o que mostrar para a bola parada em curso (só para quem a vai marcar: equipa 0 com controlo humano) */
function contexto() {
  if (!G || G.online || G.auto || G.paused) return null;
  var k = tk(), m = k.move, out = null, pen = G.state === "pen" && G.pen, sp = G.state === "setpiece" && G.setp;
  if (pen) {
    var meu = pen.team === 0 && pen.taker === G.ctrl, nome = pen.fk ? "Livre direto" : "Penálti";
    if (!meu) return { banner: nome };
    return pen.fk
      ? { banner: nome, titulo: "LIVRE DIRETO", linhas: [["Aponta (" + m + ")"], ["Segura " + k.shoot + " e larga para chutar"]], potencia: true }
      : { banner: nome, titulo: "PENÁLTI", linhas: [["Mover a mira (" + m + ")"], ["Segura " + k.shoot + " e larga para rematar"]], potencia: true };
  }
  if (sp) {
    var meu2 = sp.team === 0 && sp.taker === G.ctrl, B = { corner: "Pontapé de canto", goalkick: "Pontapé de baliza", throw: "Lançamento lateral", freekick: "Livre" }[sp.kind] || "Bola parada";
    if (!meu2) return { banner: B };
    if (sp.kind === "corner") return { banner: B, titulo: "PONTAPÉ DE CANTO", linhas: [["Apontar (" + m + ")"], ["Cruzar (" + k.shoot + ")"], ["Passe curto (" + k.pass + ")"]] };
    if (sp.kind === "goalkick") return { banner: B, titulo: "PONTAPÉ DE BALIZA", linhas: [["Apontar a direção (" + m + ")"], ["Pontapé longo (" + k.shoot + ")"], ["Passe curto (" + k.pass + ")"]] };
    if (sp.kind === "throw") return { banner: B, titulo: "LANÇAMENTO LATERAL", linhas: [["Apontar para um colega (" + m + ")"], ["Lançar (" + k.pass + ")"]] };
    return { banner: B, titulo: "LIVRE", linhas: [["Apontar (" + m + ")"], ["Rematar (" + k.shoot + ")"], ["Passe (" + k.pass + ")"]] };
  }
  return null;
}

function desenhar(c) {
  var x = contexto(); if (!x) return;
  TU(c); c.save();
  // faixa de contexto, topo direito
  c.font = FONT_T; var t1 = "BOLA PARADA", w1 = Math.max(150, c.measureText(x.banner).width + 40);
  var tb = document.querySelector(".topbar"), y0 = ((tb ? tb.offsetHeight : 44) + 8) / SC;
  painel(c, 16, y0, w1, 46);
  c.textBaseline = "alphabetic"; c.textAlign = "left"; c.fillStyle = "#AFC2D4"; c.font = "600 11px system-ui"; c.fillText(t1, 30, y0 + 17);
  c.fillStyle = "#F5F7FA"; c.font = "700 19px 'Barlow Condensed','Arial Narrow',sans-serif"; c.fillText(x.banner, 30, y0 + 37);
  if (x.titulo) {
    var n = x.linhas.length, h = 40 + n * 26, py = VH - h - 16;
    painel(c, 16, py, 270, h);
    c.fillStyle = OURO; c.font = FONT_T; c.textAlign = "left"; c.fillText(x.titulo, 30, py + 26);
    c.fillStyle = "#F5F7FA"; c.font = FONT_S;
    x.linhas.forEach(function (l, i) { c.fillText(l[0], 30, py + 54 + i * 26); });
  }
  if (x.potencia && G.state === "pen") {
    var ch = Math.max(0, Math.min(1, G.charge || 0)), bw = Math.min(420, VW * .42, VW - 16 - 270 - 36 - 40), bx = Math.max(VW / 2 - bw / 2, 16 + 270 + 36), by = VH - 78;
    painel(c, bx - 14, by - 30, bw + 28, 62);
    c.fillStyle = "#F5F7FA"; c.font = "600 12px system-ui"; c.textAlign = "left"; c.fillText("POTÊNCIA DO REMATE", bx, by - 10);
    c.textAlign = "right"; c.fillStyle = OURO; c.font = "700 20px 'Barlow Condensed','Arial Narrow',sans-serif"; c.fillText(Math.round(ch * 100) + "%", bx + bw, by - 8);
    c.fillStyle = "rgba(255,255,255,.14)"; rr(c, bx, by, bw, 14, 7); c.fill();
    if (ch > 0) { var gr = c.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, AZUL); gr.addColorStop(.6, ELET); gr.addColorStop(1, OURO); c.fillStyle = gr; rr(c, bx, by, Math.max(10, bw * ch), 14, 7); c.fill(); }
  }
  c.restore();
}
var _dm = drawMsg;
drawMsg = function (c) { try { desenhar(c); } catch (e) {} return _dm.apply(this, arguments); };
})();
