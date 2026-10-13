/* Sistema de pop-ups, avisos e navegação por teclado dos menus. */
(function(){
"use strict";
const ICONS={
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
 warn:'<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18h.01"/>',
 trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
 trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H4v1a3 3 0 0 0 4 3M16 6h4v1a3 3 0 0 1-4 3M12 13v4M8 21h8M10 17h4"/>',
 level:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z"/>',
 key:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.6 2.6 0 1 1 3.6 2.4c-.8.4-1.1.9-1.1 1.6M12 17h.01"/>',
 check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 swap:'<path d="M7 7h12l-3-3M17 17H5l3 3"/>'
};
const svg=n=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+(ICONS[n]||ICONS.info)+'</svg>';
const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let root=null,toastRoot=null,stack=[];
function reduce(){try{return (typeof PREF!=="undefined"&&PREF.reduceFx)||matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}}
function ensureRoot(){if(!root){root=document.createElement("div");root.id="popRoot";document.body.appendChild(root)}return root}
function sfxClick(kind){try{if(typeof sfx==="function"&&typeof AC!=="undefined"&&AC)sfx(kind||"switch")}catch(e){}}

function confetti(card,n){
  const cols=["#f6c744","#d52b47","#58d489","#ffffff","#3ec1ff"];
  for(let i=0;i<n;i++){const s=document.createElement("span");s.className="pop-conf";const a=Math.random()*Math.PI*2,d=130+Math.random()*230;
    s.style.setProperty("--x",Math.cos(a)*d+"px");s.style.setProperty("--y",(Math.sin(a)*d*.8-60+Math.random()*280)+"px");s.style.setProperty("--r",(Math.random()*900-450)+"deg");
    s.style.setProperty("--d",(1.2+Math.random()*1.3)+"s");s.style.setProperty("--l",(Math.random()*.25)+"s");s.style.background=cols[i%cols.length];card.appendChild(s)}
}
function close(id,why){
  const i=id?stack.findIndex(m=>m.id===id):stack.length-1;if(i<0)return;
  const m=stack.splice(i,1)[0];
  const done=()=>{m.el.remove();if(m.back)m.back.remove();if(!stack.length){root.querySelectorAll(".pop-back").forEach(function(b){b.remove()});root.classList.remove("closing");document.documentElement.classList.remove("pop-open")}
    if(m.prevFocus&&document.contains(m.prevFocus)&&!stack.length){try{m.prevFocus.focus({preventScroll:true})}catch(e){}}
    if(m.opts.onClose)m.opts.onClose(why)};
  if(reduce()||stack.length){done();return}
  root.classList.add("closing");setTimeout(done,200);
}
function open(o){
  ensureRoot();root.classList.toggle("pop-reduce",reduce());
  const id=o.id||("p"+Math.random().toString(36).slice(2,7));
  if(stack.some(m=>m.id===id))close(id,"replace");
  const el=document.createElement("div");el.className="pop-wrap";el.dataset.pop=id;
  const back=document.createElement("div");back.className="pop-back";
  const card=document.createElement("div");card.className="pop-card "+(o.kind||"info");card.setAttribute("role","dialog");card.setAttribute("aria-modal","true");
  const tid="pt"+id;card.setAttribute("aria-labelledby",tid);
  card.innerHTML=(o.icon!==false?'<div class="pop-icon">'+svg(o.icon||(o.kind==="danger"?"warn":"info"))+'</div>':"")+
    (o.eyebrow?'<div class="pop-eyebrow">'+esc(o.eyebrow)+'</div>':"")+'<h2 class="pop-title" id="'+tid+'">'+esc(o.title||"")+'</h2>'+
    '<div class="pop-body">'+(o.html||(o.text?'<p>'+o.text+'</p>':""))+'</div>'+
    ((o.actions&&o.actions.length)?'<div class="pop-actions"></div>':"");
  const bar=card.querySelector(".pop-actions");
  (o.actions||[]).forEach(a=>{const b=document.createElement("button");b.type="button";b.className="btn"+(a.kind==="ghost"?" ghost":a.kind==="danger"?" danger":"");b.textContent=a.label;
    b.addEventListener("click",()=>{sfxClick();let keep=false;if(a.onClick)keep=a.onClick()===false;if(!keep&&a.close!==false)close(id,a.label)});bar.appendChild(b);b._a=a});
  const rec={id,el,card,opts:o,prevFocus:stack.length?null:document.activeElement};
  stack.push(rec);
  el.appendChild(card);root.appendChild(back);root.appendChild(el);
  rec.back=back;back.addEventListener("click",()=>{if(o.backdropClose!==false)close(id,"backdrop")});
  document.documentElement.classList.add("pop-open");
  if(o.kind==="celebrate"&&!reduce())confetti(el,o.confetti||46);
  setTimeout(()=>{const f=(bar&&(bar.querySelector(".btn:not(.ghost)")||bar.querySelector(".btn")))||card;try{f.focus({preventScroll:true})}catch(e){}},60);
  if(o.onOpen)o.onOpen(card);
  sfxClick(o.kind==="celebrate"?"goal":"switch");
  return id;
}
/* teclado: Esc fecha, Tab fica preso no pop-up, o resto não passa para o jogo */
addEventListener("keydown",e=>{
  if(!stack.length)return;
  const top=stack[stack.length-1];
  if(top.opts.captureKeys){return}
  if(e.key==="Escape"){e.preventDefault();e.stopImmediatePropagation();if(top.opts.escClose!==false)close(top.id,"esc");return}
  if(e.key==="Tab"){const f=[...top.card.querySelectorAll("button,[href],input,select,textarea,[tabindex]:not([tabindex='-1'])")].filter(x=>!x.disabled&&x.offsetParent!==null);
    if(f.length){const i=f.indexOf(document.activeElement);e.preventDefault();e.stopImmediatePropagation();f[(i+(e.shiftKey?-1:1)+f.length)%f.length].focus()}return}
  if(e.key==="ArrowLeft"||e.key==="ArrowRight"){const b=[...top.card.querySelectorAll(".pop-actions .btn")];if(b.length>1){const i=b.indexOf(document.activeElement);e.preventDefault();e.stopImmediatePropagation();b[(i+(e.key==="ArrowRight"?1:-1)+b.length)%b.length].focus();return}}
  if(e.key==="Enter"||e.key===" "){return}
  e.stopImmediatePropagation();
},true);
addEventListener("keyup",e=>{if(stack.length&&!stack[stack.length-1].opts.captureKeys&&e.key!=="Tab")e.stopImmediatePropagation()},true);

/* ---------- avisos ---------- */
function toast(msg,o){o=o||{};if(!toastRoot){toastRoot=document.createElement("div");toastRoot.id="toastRoot";toastRoot.setAttribute("aria-live","polite");document.body.appendChild(toastRoot)}
  const t=document.createElement("div");t.className="toast"+(o.warn?" warn":"");t.style.setProperty("--t",(o.ms||2600)+"ms");t.innerHTML=svg(o.warn?"warn":"check")+"<span>"+esc(msg)+"</span>";
  toastRoot.appendChild(t);while(toastRoot.children.length>3)toastRoot.firstChild.remove();
  setTimeout(()=>{t.classList.add("out");setTimeout(()=>t.remove(),260)},o.ms||2600);}

/* ---------- pop-ups prontos ---------- */
function confirm(o){return open({id:o.id,kind:o.danger?"danger":"info",icon:o.icon||(o.danger?"warn":"help"),title:o.title,text:o.text,html:o.html,escClose:true,
  actions:[{label:o.yes||"Confirmar",kind:o.danger?"danger":"gold",onClick:()=>{o.onYes&&o.onYes()}},{label:o.no||"Cancelar",kind:"ghost",onClick:()=>{o.onNo&&o.onNo()}}]})}
function info(o){return open({id:o.id,kind:"info",icon:o.icon||"info",eyebrow:o.eyebrow,title:o.title,html:o.html,text:o.text,
  actions:[{label:o.ok||"Continuar",kind:"gold",onClick:()=>{o.onOk&&o.onOk()}},{label:o.cancel||"Voltar",kind:"ghost",onClick:()=>{o.onCancel&&o.onCancel()}}]})}
function levelUp(lv){open({id:"lvl",kind:"celebrate",icon:"level",eyebrow:"Carreira",title:"Nível "+lv+"!",html:"<p>Subiste de nível! Há <b>novas recompensas visuais</b> para desbloqueares na Carreira (bolas, marcadores e festejos).</p>",confetti:54,
  actions:[{label:"Ver recompensas",kind:"gold",onClick:()=>{if(typeof leaveMatch==="function"&&typeof showCareer==="function"){leaveMatch();showCareer()}}},{label:"Continuar",kind:"ghost"}]})}
const seen={};
function seasonEnd(won,myName,pos,pts,champName){if(typeof S==="undefined"||!S||seen[S.id])return;seen[S.id]=1;
  setTimeout(()=>open({id:"season",kind:won?"celebrate":"info",icon:"trophy",eyebrow:"Época terminada",title:won?"Campeões!":"Fim da época",confetti:won?90:0,
   html:won?"<p>O <b>"+esc(myName)+"</b> ganhou a Girabola com <b>"+pts+" pontos</b>. A época ficou registada no histórico.</p>":"<p>O <b>"+esc(myName)+"</b> terminou em <b>"+pos+"º lugar</b> com "+pts+" pontos. O campeão foi o <b>"+esc(champName)+"</b>.</p>",
   actions:[{label:"Nova época",kind:"gold",onClick:()=>{if(typeof showPick==="function")showPick("season")}},{label:"Ver classificação",kind:"ghost"}]}),450)}
function team(i,o){o=o||{};const t=TEAMS[i],st=STYLES[t.st];
  open({id:"team",kind:o.warn?"danger":"info",icon:o.warn?"swap":"level",eyebrow:o.eyebrow||"O teu clube",title:t.n,
   html:'<div class="pop-art">'+(typeof kitPreview==="function"?kitPreview(i,150):"")+(typeof crest==="function"?crest(i,64):"")+'</div>'+
     '<div class="pop-kv"><div><b>'+t.r+'</b><span>Força</span></div><div><b>'+esc(st.n)+'</b><span>Estilo</span></div></div>'+
     '<p style="margin-top:8px">'+esc(st.d)+'</p>'+(o.noGoal?'<p>Vais jogar <b>contra</b> esta equipa.</p>':'<p>Objetivo: <b>'+(t.r>=78?"conquistar o título":t.r>=70?"ficar nos cinco primeiros":"ficar na primeira metade")+'</b>.</p>')+
     (o.warn?'<div class="pop-warn">'+o.warn+'</div>':""),
   actions:[{label:o.yes||"Escolher este clube",kind:o.warn?"danger":"gold",onClick:()=>{o.onYes&&o.onYes()}},{label:"Voltar",kind:"ghost"}]})}
function keyWait(label,slot,onCancel){open({id:"rebind",kind:"info",icon:"key",title:"Nova tecla",captureKeys:true,backdropClose:false,escClose:false,
  html:'<p>Prime a tecla para <b>'+esc(label)+'</b> ('+(slot?"alternativa":"principal")+').</p><div class="pop-key" aria-live="polite">···</div><p style="font-size:13px;color:#9fb4c4">Esc cancela (exceto em «Pausa»).</p>',
  actions:[{label:"Cancelar",kind:"ghost",onClick:()=>{onCancel&&onCancel()}}]})}
function closeKey(){close("rebind","done")}
function help(){const K=(typeof kp==="function")?kp:(a=>"");
  const row=(k,t)=>'<li><span>'+k+'</span><span>'+t+'</span></li>';
  open({id:"help",kind:"info",icon:"help",eyebrow:"Ajuda",title:"Como jogar",
   html:'<ul class="pop-list">'+row('<kbd>'+esc(K("up"))+'</kbd><kbd>'+esc(K("left"))+'</kbd><kbd>'+esc(K("down"))+'</kbd><kbd>'+esc(K("right"))+'</kbd>',"Mover")+row('<kbd>'+esc(K("sprint"))+'</kbd>',"Sprint (gasta energia)")+row('<kbd>'+esc(K("pass"))+'</kbd>',"Passe para o colega apontado")+
     row('<kbd>'+esc(K("shoot"))+'</kbd>',"Remate (segura para carregar) ou desarme")+row('<kbd>'+esc(K("switch"))+'</kbd>',"Trocar de jogador")+row('<kbd>'+esc(K("pause"))+'</kbd>',"Pausa")+'</ul>'+
     '<p style="margin-top:10px"><b>Nos menus:</b> setas para navegar, <kbd>Enter</kbd> para escolher, <kbd>Esc</kbd> para voltar e <kbd>?</kbd> para esta ajuda.</p>',
   actions:[{label:"Percebi",kind:"gold"},{label:"Fazer o tutorial",kind:"ghost",onClick:()=>{if(typeof startTutorial==="function")startTutorial()}}]})}
function controls(){
  var K=(typeof kp==="function")?kp:function(){return ""};
  var row=function(k,t){return '<li><span>'+k+'</span><span>'+t+'</span></li>'};
  var kb=function(a){return '<kbd>'+esc(K(a))+'</kbd>'};
  var rules=(typeof RULES!=="undefined")?Object.keys(RULES).map(function(k){return '<li><span><b>'+esc(RULES[k].n)+'</b></span><span>'+esc(RULES[k].d)+'</span></li>'}).join(""):"";
  open({id:"controls",kind:"info",icon:"key",eyebrow:"Ajuda",title:"Controlos e modos de jogo",
   html:'<h3 class="pop-sub">Controlos</h3><ul class="pop-list">'+
     row(kb("up")+kb("left")+kb("down")+kb("right"),"Mover o jogador")+row(kb("sprint"),"Sprint (gasta energia)")+row(kb("pass"),"Passe para o colega apontado")+
     row(kb("shoot"),"Remate (segura para carregar) · sem bola, desarme")+row(kb("switch"),"Trocar de jogador")+row(kb("pause"),"Pausa")+
     row('<kbd>+</kbd><kbd>−</kbd>',"Aproximar ou afastar a câmara")+'</ul>'+
     '<h3 class="pop-sub">Modos de jogo</h3><ul class="pop-list">'+rules+
     row('<b>Época</b>',"15 ou 30 jornadas; os outros jogos são simulados.")+row('<b>Taça</b>',"Quatro rondas a eliminar, com penáltis.")+row('<b>Desafio</b>',"Recupera de 0–1 em 30 segundos de jogo.")+row('<b>Jogo rápido</b>',"Um amigável contra qualquer equipa.")+'</ul>'+
     '<p style="margin-top:10px;font-size:13px;color:#9fb4c4">Nos menus: setas para navegar, <kbd>Enter</kbd> para escolher e <kbd>Esc</kbd> para voltar. As teclas mudam-se em Opções.</p>',
   actions:[{label:"Percebi",kind:"gold"},{label:"Fazer o tutorial",kind:"ghost",onClick:function(){if(typeof startTutorial==="function"){if(typeof ac==="function")ac();startTutorial()}}}]})}
/* Notas longas dos ecrãs: frase curta + "Saber mais" que abre o texto completo num pop-up */
function titleFor(el){
  var box=el.closest(".panel, .opt, .opts > *, .champ, section.screen");
  var t=box&&box.querySelector(".panel-title");if(t&&t.textContent.trim())return t.textContent.trim();
  var h=document.querySelector("#app h2");return h?h.textContent.trim():"Informação";
}
function enhanceNotes(){
  document.querySelectorAll("#app .screen .note").forEach(function(el){
    if(el.dataset.pop||el.id||el.closest("#ov"))return;
    var txt=el.textContent.replace(/\s+/g," ").trim();if(txt.length<75)return;
    el.dataset.pop="1";var full=el.innerHTML,m=txt.match(/^(.{18,95}?[.!?:])\s/),short=m?m[1]:txt.slice(0,82).replace(/\s+\S*$/,"")+"…",title=titleFor(el);
    el.innerHTML=esc(short)+' <button type="button" class="note-more" aria-haspopup="dialog">Saber mais</button>';
    el.querySelector(".note-more").addEventListener("click",function(){open({id:"note",kind:"info",icon:"info",eyebrow:"Informação",title:title,html:"<p>"+full+"</p>",actions:[{label:"Percebi",kind:"gold"}]})});
  });
}
window.Pop={open,close,confirm,info,toast,levelUp,seasonEnd,team,keyWait,closeKey,help,controls,isOpen:()=>stack.length>0};

document.addEventListener("click",function(e){var sm=e.target.closest&&e.target.closest(".control-help > summary, .control-help summary");if(sm){e.preventDefault();e.stopPropagation();Pop.controls()}},true);
/* ---------- navegação por teclado nos menus ---------- */
const inMenus=()=>typeof G==="undefined"||!G;
function focusables(){return [...document.querySelectorAll("#app button:not([disabled]),#app a[href],#app input:not([disabled]),#app select")].filter(e=>e.offsetParent!==null&&!e.closest("[hidden]"))}
function spatial(dir){
  const list=focusables();if(!list.length)return;
  let cur=document.activeElement;if(!list.includes(cur)){list[0].focus();return}
  const r=cur.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let best=null,bs=1e9;
  for(const e of list){if(e===cur)continue;const q=e.getBoundingClientRect(),x=q.left+q.width/2,y=q.top+q.height/2,dx=x-cx,dy=y-cy;
    const along=dir==="ArrowRight"?dx:dir==="ArrowLeft"?-dx:dir==="ArrowDown"?dy:-dy,across=(dir==="ArrowRight"||dir==="ArrowLeft")?Math.abs(dy):Math.abs(dx);
    if(along<=4)continue;const sc=along+across*2.2;if(sc<bs){bs=sc;best=e}}
  if(best){best.focus();best.scrollIntoView({block:"nearest",behavior:reduce()?"auto":"smooth"})}
}
addEventListener("keydown",e=>{
  if(stack.length||!inMenus())return;
  const t=e.target,tag=t&&t.tagName;if(tag==="TEXTAREA"||tag==="INPUT"&&t.type==="text"||tag==="SELECT"||(typeof REBIND!=="undefined"&&REBIND))return;
  if(e.altKey||e.ctrlKey||e.metaKey)return;
  if(e.key==="?"||e.key==="F1"){e.preventDefault();help();return}
  if(e.key==="Escape"||e.key==="Backspace"){const b=document.querySelector("#app .back");if(b){e.preventDefault();b.click()}return}
  if(e.key.startsWith("Arrow")){e.preventDefault();spatial(e.key)}
});
let welcomed=false;
function welcome(){
  if(welcomed||typeof PREF==="undefined"||PREF.tutorialSeen||stack.length||!document.querySelector("#app .menu-screen"))return;welcomed=true;
  open({id:"welcome",kind:"celebrate",icon:"level",eyebrow:"Bem-vindo",title:"Girabola 94",confetti:36,
   html:"<p>Escolhe um clube da Girabola e leva-o ao título. O <b>tutorial</b> ensina os controlos em cerca de um minuto.</p>",
   actions:[{label:"Fazer o tutorial",kind:"gold",onClick:()=>{if(typeof ac==="function")ac();startTutorial()}},{label:"Agora não",kind:"ghost",onClick:()=>{PREF.tutorialSeen=true;savePrefs()}}]});
}
/* foco inicial em cada ecrã + entrada escalonada dos itens + botão de ajuda */
let fab=null;
function onScreen(){
  enhanceNotes();
  if(!inMenus()){if(fab)fab.hidden=true;return}
  if(!fab){fab=document.createElement("button");fab.type="button";fab.className="help-fab";fab.textContent="?";fab.setAttribute("aria-label","Ajuda: como jogar");fab.title="Como jogar (?)";fab.addEventListener("click",help);document.body.appendChild(fab)}
  fab.hidden=false;welcome();
  document.querySelectorAll("#app .screen .team,#app .screen .menu-actions .btn,#app .screen>.panel").forEach((e,i)=>e.style.setProperty("--i",Math.min(i,14)));
  if(!stack.length&&(!document.activeElement||document.activeElement===document.body)){
    const f=document.querySelector("#app .menu-actions .btn:not(.ghost), #app .btn:not(.ghost):not(.small), #app .team, #app .back");if(f)try{f.focus({preventScroll:true})}catch(e){}}
}
const app0=document.getElementById("app");let qd=false;
if(app0&&window.MutationObserver)new MutationObserver(()=>{if(!qd){qd=true;setTimeout(()=>{qd=false;onScreen()},50)}}).observe(app0,{childList:true});
setInterval(()=>{if(fab)fab.hidden=!inMenus()},500);
setTimeout(onScreen,200);
/* avisos nos ecrãs existentes */
if(typeof showOptions==="function"){const so=showOptions;showOptions=function(msg){so(msg);if(msg&&typeof msg==="string")Pop.toast(msg.replace(/<[^>]+>/g,""))}}
})();
