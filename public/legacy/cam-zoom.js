/* Zoom da câmara: roda do rato, teclas + e -, botões no jogo, menu de pausa e Opções. */
(function(){
"use strict";
var MIN=.55,MAX=2.3,PRESETS=[["Longe",.7],["Normal",1],["Perto",1.4],["Muito perto",1.9]];
window.CZ=(typeof PREF!=="undefined"&&PREF.camZoom)||1;
TV.F0=TV.F;
function cur(){return (typeof PREF!=="undefined"&&PREF.camZoom)||1}
function setZoom(z){z=Math.max(MIN,Math.min(MAX,z));PREF.camZoom=Math.round(z*1000)/1000;savePrefs();sync()}
function nearest(z){var best=null,d=9;PRESETS.forEach(function(p){var k=Math.abs(p[1]-z);if(k<d){d=k;best=p}});return d<.08?best:null}
function label(z){return Math.round(z*100)+"%"}
function refresh(box){
  var z=cur(),np=nearest(z);
  box.querySelectorAll("[data-z]").forEach(function(b){b.setAttribute("aria-pressed",String(np&&+b.dataset.z===np[1]))});
  var r=box.querySelector("input[type=range]");if(r&&document.activeElement!==r)r.value=Math.round(z*100);
  var o=box.querySelector(".zoom-val");if(o)o.textContent=label(z);
}
function build(){
  var d=document.createElement("div");d.className="zoom-ctl";
  d.innerHTML='<p class="panel-title" style="margin:6px 0 2px">Zoom da câmara <span class="zoom-val" style="color:var(--gold)"></span></p>'+
    '<div class="seg" role="group" aria-label="Zoom da câmara">'+PRESETS.map(function(p){return '<button type="button" data-z="'+p[1]+'" aria-pressed="false">'+p[0]+'</button>'}).join("")+'</div>'+
    '<div class="zoom-row"><button type="button" class="btn ghost small zm-minus" aria-label="Afastar a câmara">−</button><input type="range" min="'+Math.round(MIN*100)+'" max="'+Math.round(MAX*100)+'" step="5" aria-label="Zoom"><button type="button" class="btn ghost small zm-plus" aria-label="Aproximar a câmara">+</button></div>'+
    '<p class="note">Roda do rato ou teclas <kbd>+</kbd> / <kbd>−</kbd> durante o jogo. <kbd>0</kbd> repõe o normal.</p>';
  d.querySelectorAll("[data-z]").forEach(function(b){b.addEventListener("click",function(){setZoom(+b.dataset.z)})});
  d.querySelector(".zm-minus").addEventListener("click",function(){setZoom(cur()/1.15)});
  d.querySelector(".zm-plus").addEventListener("click",function(){setZoom(cur()*1.15)});
  d.querySelector("input").addEventListener("input",function(e){setZoom(+e.target.value/100)});
  refresh(d);return d;
}
function ensureHud(){
  var st=document.getElementById("stage"),hud=document.querySelector(".zoom-hud");
  if(typeof G==="undefined"||!G||!st){if(hud)hud.remove();return}
  if(!hud){hud=document.createElement("div");hud.className="zoom-hud";
    hud.innerHTML='<button type="button" class="zh-minus" aria-label="Afastar a câmara" title="Afastar (−)">−</button><button type="button" class="zh-val" title="Repor zoom (0)">100%</button><button type="button" class="zh-plus" aria-label="Aproximar a câmara" title="Aproximar (+)">+</button>';
    hud.querySelector(".zh-minus").onclick=function(){setZoom(cur()/1.15)};hud.querySelector(".zh-plus").onclick=function(){setZoom(cur()*1.15)};hud.querySelector(".zh-val").onclick=function(){setZoom(1)};
    st.appendChild(hud)}
  hud.hidden=PREF.camera==="top";hud.querySelector(".zh-val").textContent=label(cur());
}
function inject(){
  var seg=document.querySelector('[data-seg="pcam"]');
  if(seg){var opt=seg.closest(".opt")||seg.parentElement;if(opt&&!opt.parentElement.querySelector(".zoom-ctl")){var z=build();z.classList.add("in-pause");opt.after(z)}}
  var zo=document.getElementById("zoomOpt");if(zo&&!zo.firstChild)zo.appendChild(build());
}
function sync(){document.querySelectorAll(".zoom-ctl").forEach(refresh);ensureHud()}
addEventListener("wheel",function(e){
  if(typeof G==="undefined"||!G||PREF.camera==="top"||G.paused)return;
  if(!e.target.closest||!e.target.closest("#stage"))return;
  e.preventDefault();setZoom(cur()*Math.exp(-e.deltaY*.0011));
},{passive:false});
addEventListener("keydown",function(e){
  if(typeof G==="undefined"||!G||PREF.camera==="top")return;
  if(window.Pop&&Pop.isOpen&&Pop.isOpen())return;
  var t=e.target&&e.target.tagName;if(t==="INPUT"||t==="TEXTAREA"||t==="SELECT")return;
  var k=e.key;
  if(k==="+"||k==="="||e.code==="NumpadAdd"){e.preventDefault();setZoom(cur()*1.12)}
  else if(k==="-"||k==="_"||e.code==="NumpadSubtract"){e.preventDefault();setZoom(cur()/1.12)}
  else if(e.code==="Digit0"||e.code==="Numpad0"){e.preventDefault();setZoom(1)}
});
var _render=render;
render=function(){
  var n=performance.now(),dt=Math.min(.1,(n-(window.__zt||n))/1000);window.__zt=n;
  var t=cur();CZ+=(t-CZ)*(1-Math.pow(.002,dt));if(Math.abs(t-CZ)<.001)CZ=t;TV.F=TV.F0*CZ;
  _render();
};
if(window.MutationObserver){var q=false;new MutationObserver(function(){if(!q){q=true;setTimeout(function(){q=false;inject();ensureHud()},60)}}).observe(document.body,{childList:true,subtree:true})}
setInterval(function(){ensureHud()},700);
var st=document.createElement("style");st.textContent=
".zoom-hud{position:absolute;right:12px;bottom:12px;z-index:3;display:flex;align-items:center;gap:4px;padding:4px;border-radius:999px;background:#0a1b2dd9;border:1px solid #47677a;box-shadow:0 6px 18px #0007;backdrop-filter:blur(4px)}"+
".zoom-hud[hidden]{display:none}.zoom-hud button{border:0;background:transparent;color:#eef4fa;cursor:pointer;min-width:34px;height:34px;border-radius:999px;font:700 20px var(--f-num),sans-serif;display:grid;place-items:center;padding:0 6px}"+
".zoom-hud button:hover{background:#f6c744;color:#121c27}.zoom-hud .zh-val{font-size:13px;min-width:52px;letter-spacing:.04em}"+
".zoom-ctl{display:grid;gap:8px;margin-top:6px}.zoom-ctl .seg{justify-self:start;max-width:100%;flex-wrap:wrap}.zoom-row{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center}"+
".zoom-row input[type=range]{width:100%;accent-color:#f6c744;height:28px}.zoom-ctl .btn.small{min-width:40px;padding:6px 10px}.zoom-ctl.in-pause{padding:0 0 4px}";
document.head.appendChild(st);
setTimeout(function(){inject();ensureHud()},300);
})();
