/* ===== Girabola 94: pequenos efeitos tipográficos que o CSS sozinho não faz =====
   - realça o marcador quando o resultado muda (classe g94-bump, 0,5 s);
   - liga a opção "reduzir efeitos" do jogo à classe html.reduce-fx (que desliga as animações de texto). */
(function () {
"use strict";
var root = document.documentElement, app = document.getElementById("app"), obs = null, ultimo = "";
function reduzir() { try { root.classList.toggle("reduce-fx", !!(typeof PREF !== "undefined" && PREF.reduceFx)); } catch (e) {} }
function bump(el) { el.classList.remove("g94-bump"); void el.offsetWidth; el.classList.add("g94-bump"); setTimeout(function () { el.classList.remove("g94-bump"); }, 600); }
function ligarMarcador() {
  var sc = document.getElementById("sbScore");
  if (!sc || sc.__g94) return; sc.__g94 = true; ultimo = sc.textContent;
  if (obs) obs.disconnect();
  obs = new MutationObserver(function () { var t = sc.textContent; if (t !== ultimo && ultimo !== "") bump(sc); ultimo = t; });
  obs.observe(sc, { childList: true, characterData: true, subtree: true });
}
if (window.MutationObserver && app) new MutationObserver(function () { reduzir(); ligarMarcador(); }).observe(app, { childList: true, subtree: true });
reduzir(); ligarMarcador();
})();
