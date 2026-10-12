/* Setas de scroll no lugar das barras: aparecem só quando há conteúdo escondido. */
(function(){
const SEL=".overlay,.card,.pause-layout,.tutbox,.tablewrap,.keys-table,textarea,.pop-card";
const ICON={up:'<path d="M5 15l7-7 7 7"/>',down:'<path d="M5 9l7 7 7-7"/>',left:'<path d="M15 5l-7 7 7 7"/>',right:'<path d="M9 5l7 7-7 7"/>'};
const items=new Map();let queued=false;
function mk(dir,el){const b=document.createElement("button");b.type="button";b.className="sa";b.hidden=true;b.tabIndex=-1;b.setAttribute("aria-label",{up:"Subir",down:"Descer",left:"Para a esquerda",right:"Para a direita"}[dir]);
  b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+ICON[dir]+'</svg>';
  let timer=null;const go=()=>{const t=(el===document.scrollingElement)?window:el;const dy=dir==="up"?-1:dir==="down"?1:0,dx=dir==="left"?-1:dir==="right"?1:0;
    const h=(el===document.scrollingElement?innerHeight:el.clientHeight),w=(el===document.scrollingElement?innerWidth:el.clientWidth);t.scrollBy({top:dy*h*.7,left:dx*w*.7,behavior:"smooth"})};
  b.addEventListener("click",e=>{e.preventDefault();go()});
  b.addEventListener("pointerdown",e=>{timer=setInterval(go,320);});for(const ev of ["pointerup","pointerleave","pointercancel"])b.addEventListener(ev,()=>{clearInterval(timer)});
  document.body.appendChild(b);return b}
function scrollInfo(el){
  if(el===document.scrollingElement)return{sh:el.scrollHeight,ch:innerHeight,st:el.scrollTop,sw:el.scrollWidth,cw:innerWidth,sl:el.scrollLeft,r:{left:0,top:0,right:innerWidth,bottom:innerHeight}};
  const r=el.getBoundingClientRect();return{sh:el.scrollHeight,ch:el.clientHeight,st:el.scrollTop,sw:el.scrollWidth,cw:el.clientWidth,sl:el.scrollLeft,r}}
function canScroll(el,axis){const cs=getComputedStyle(el);if(el===document.scrollingElement)return true;if(el.tagName==="TEXTAREA")return true;const o=axis==="y"?cs.overflowY:cs.overflowX;return /(auto|scroll)/.test(o)}
function visible(el){if(el===document.scrollingElement)return true;const r=el.getBoundingClientRect();return r.width>40&&r.height>20&&el.offsetParent!==null&&getComputedStyle(el).visibility!=="hidden"}
function update(){
  queued=false;
  const els=[document.scrollingElement,...document.querySelectorAll(SEL)].filter(el=>el&&visible(el));
  const active=[];
  for(const el of els){const i=scrollInfo(el),v=i.sh>i.ch+4&&canScroll(el,"y"),h=i.sw>i.cw+4&&canScroll(el,"x");if(v||h)active.push({el,i,v,h})}
  for(const [el,o] of items)if(!active.some(a=>a.el===el)){for(const b of Object.values(o.b))b.remove();items.delete(el)}
  for(const a of active){
    let o=items.get(a.el);if(!o){o={b:{}};items.set(a.el,o)}
    const depth=active.filter(x=>x.el!==a.el&&x.el!==document.scrollingElement&&x.el.contains(a.el)).length;
    const r=a.i.r,L=Math.max(r.left,0),Rr=Math.min(r.right,innerWidth),T=Math.max(r.top,0),B=Math.min(r.bottom,innerHeight),off=10+depth*44;
    const put=(dir,show,x,y)=>{if(!o.b[dir])o.b[dir]=mk(dir,a.el);const b=o.b[dir];b.hidden=!show;if(show){b.style.left=Math.round(x)+"px";b.style.top=Math.round(y)+"px"}};
    put("up",a.v&&a.i.st>3,Rr-38-off,T+10);
    const sk=[...a.el.querySelectorAll(":scope > .row, :scope > .pop-actions")].find(x=>getComputedStyle(x).position==="sticky"),extra=sk?sk.getBoundingClientRect().height:0;
    put("down",a.v&&a.i.st+a.i.ch<a.i.sh-3,Rr-38-off,B-48-extra);
    put("left",a.h&&a.i.sl>3,L+10,(T+B)/2-19);
    put("right",a.h&&a.i.sl+a.i.cw<a.i.sw-3,Rr-38-off,(T+B)/2-19);
  }
}
const q=()=>{if(!queued){queued=true;setTimeout(update,30)}};
document.addEventListener("scroll",q,true);addEventListener("resize",q);
if(window.MutationObserver)new MutationObserver(q).observe(document.body,{childList:true,subtree:true});
setInterval(q,400);q();
})();
