(function(){
"use strict";
var app=document.getElementById("app");
function el(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}
function wrapCols(nodes){var d=el("div","fx-cols");nodes.forEach(function(n){if(n)d.appendChild(n)});return d}
function col(nodes){var d=el("div","fx-col");nodes.forEach(function(n){if(n)d.appendChild(n)});return d}
/* Constrói separadores com botões Anterior/Seguinte; mantém os nós originais (e os seus eventos). */
function build(screen,pages,opt){
  opt=opt||{};
  pages=pages.filter(function(p){return p.nodes.some(Boolean)});
  if(!pages.length)return;
  if(opt.card)screen.classList.add("fx-card");else{screen.classList.add("fx");screen.dataset.fx="1"}
  var tabs=el("div","fx-tabs"),body=el("div","fx-body"),nav=null,prev=null,next=null;
  if(!opt.card){nav=el("div","fx-nav");prev=el("button","btn ghost","Anterior");next=el("button","btn","Seguinte");prev.type=next.type="button";nav.appendChild(prev);nav.appendChild(next)}
  var list=pages.map(function(p){var pg=el("div","fx-page"+(p.cls?" "+p.cls:""));p.nodes.forEach(function(n){if(n)pg.appendChild(n)});body.appendChild(pg);return {label:p.label,pg:pg,cont:false,cls:p.cls||""}});
  screen.appendChild(tabs);screen.appendChild(body);
  (opt.footer||[]).forEach(function(f){screen.appendChild(f)});
  if(nav)screen.appendChild(nav);
  if(opt.card){
    // altura definida para o cartão: só ocupa o que precisa, no máximo a janela
    var host=screen.parentElement,avail=Math.max(160,((host&&host.clientHeight)||innerHeight)-16);screen.style.height="";screen.style.maxHeight="none";
    var nat=screen.scrollHeight;if(nat>avail)screen.style.height=avail+"px";
    screen.style.maxHeight=avail+"px";
  }
  tabs.appendChild(el("button","fx-tab","<i>1</i><span>x</span>"));
  function over(pg){return pg.scrollHeight>pg.clientHeight+2}
  function showOnly(k){list.forEach(function(x,j){x.pg.hidden=j!==k})}
  for(var i=0;i<list.length;i++){
    showOnly(i);var g=0,cur=list[i];
    while(over(cur.pg)&&cur.pg.children.length>1&&g++<30){
      var n=cur.pg.lastElementChild,nx=list[i+1];
      if(!nx||!nx.cont){var pg2=el("div","fx-page"+(cur.cls?" "+cur.cls:""));body.appendChild(pg2);nx={label:cur.label,pg:pg2,cont:true,cls:cur.cls};list.splice(i+1,0,nx)}
      nx.pg.insertBefore(n,nx.pg.firstChild);showOnly(i);
    }
    if(over(cur.pg)){var z=Math.max(.45,cur.pg.clientHeight/cur.pg.scrollHeight*.93),t=0;cur.pg.style.zoom=z;while(over(cur.pg)&&t++<8&&z>.42){z=Math.max(.4,z*.92);cur.pg.style.zoom=z}}
  }
  tabs.innerHTML="";
  var idx=0,els=[],labelCount={};
  list.forEach(function(x,i){
    var lab=x.label;if(opt.card){if(x.pg.querySelector(".roster"))lab="Plantel";else if(x.pg.querySelector(".mstats")&&!x.pg.querySelector(".bigscore,h2"))lab="Estatísticas"}x.label=lab;labelCount[x.label]=(labelCount[x.label]||0)+1;
    var b=el("button","fx-tab","<i>"+(i+1)+"</i><span>"+x.label+(labelCount[x.label]>1?" "+labelCount[x.label]:"")+"</span>");b.type="button";b.setAttribute("role","tab");b.onclick=function(){go(i)};tabs.appendChild(b);els.push({pg:x.pg,b:b});
  });
  function go(i){
    idx=i;screen.__fxIdx=i;els.forEach(function(x,k){var show=k===i;if(show&&x.pg.hidden){x.pg.hidden=false;x.pg.style.animation="none";void x.pg.offsetWidth;x.pg.style.animation=""}else if(!show)x.pg.hidden=true;
      x.b.classList.toggle("on",show);x.b.classList.toggle("done",k<i);x.b.setAttribute("aria-selected",show)});
    if(prev){prev.style.visibility=i?"visible":"hidden";next.style.visibility=i<els.length-1?"visible":"hidden"}
  }
  if(prev){prev.onclick=function(){if(idx){go(idx-1);try{sfx("ui")}catch(e){}}};next.onclick=function(){if(idx<els.length-1){go(idx+1);try{sfx("ui")}catch(e){}}}}
  if(els.length<2){tabs.style.display="none";if(nav)nav.style.display="none"}
  screen.__fxGo=go;screen.__fxPages=els;go(window.__fxKeep!=null&&window.__fxKeep<els.length?window.__fxKeep:0);window.__fxKeep=null;
}
/* cartões de sobreposição (intervalo, pausa, fim de jogo) */
function fitCard(){
  var ov=document.getElementById("ov"),card=ov&&ov.querySelector(".card");
  if(!card||card.dataset.fx||ov.hidden)return;
  card.dataset.fx="1";
  var kids=Array.prototype.slice.call(card.children);
  var fixed=kids.filter(function(k){return k.classList.contains("row")&&k.querySelector("button")&&!k.closest(".pause-layout")});
  var rest=kids.filter(function(k){return fixed.indexOf(k)<0});
  var pl=card.querySelector(".pause-layout"),pages;
  if(pl){
    var left=pl.querySelector(".pause-left"),ro=pl.querySelector(".roster");
    var tbl=left&&left.querySelector("table.mstats"),opts=left?Array.prototype.slice.call(left.children).filter(function(c){return c!==tbl}):[];
    pages=[{label:"Resumo",nodes:rest.filter(function(k){return k!==pl}).concat([tbl])},{label:"Opções",nodes:opts},{label:"Plantel",nodes:[ro]}];
    rest=rest.filter(function(k){return k!==pl});
    if(pl.parentNode)pl.parentNode.removeChild(pl);
  }else pages=[{label:"Resumo",nodes:rest}];
  build(card,pages,{card:true,footer:fixed});
}
function panelByTitle(screen,re){var ps=screen.querySelectorAll(".panel");for(var i=0;i<ps.length;i++){var t=ps[i].querySelector(".panel-title");if(t&&re.test(t.textContent))return ps[i]}return null}
function fitHub(sc){
  var head=sc.querySelector(".hub-head"),next=sc.querySelector(".hub-next"),obj=sc.querySelector(".hub-objective"),cols=sc.querySelector(".cols");
  var stack=cols&&cols.querySelector(".stack"),last=cols&&cols.querySelector(".hub-last"),hb=sc.querySelector(".hub-body");
  var hData=sc.querySelector("#hData"),row=hData&&hData.closest(".row"),notes=sc.querySelectorAll(":scope>p.note");
  var champ=sc.querySelector(".champ");
  build(sc,[
    {label:"Jornada",nodes:[head,champ,next]},
    {label:"Classificação",nodes:[stack]},
    {label:"Resultados",cls:"cols2",nodes:[last,obj,row].concat(Array.prototype.slice.call(notes))}
  ]);
  if(hb)hb.style.display="none";if(cols)cols.style.display="none";
}
function fitCareer(sc){
  var ps=sc.querySelectorAll(":scope>.panel"),title=sc.querySelector(":scope>div:not([class])");
  build(sc,[
    {label:"Nível",nodes:[title,ps[0]]},
    {label:"Recompensas",nodes:[panelByTitle(sc,/Recompensas/i)]},
    {label:"Títulos e épocas",cls:"cols2",nodes:[panelByTitle(sc,/Campe/i),panelByTitle(sc,/Hist/i)]}
  ]);
}
function fitOptions(sc){
  var dt=sc.querySelector(".design-tabs");if(dt)dt.remove();
  var title=sc.querySelector(":scope>div:not([class])");
  sc.querySelectorAll(":scope>.panel").forEach(function(p){p.hidden=false;p.style.display=""});
  var P=function(re){return panelByTitle(sc,re)};
  build(sc,[
    {label:"Jogo",cls:"cols2",nodes:[title,P(/Troca/i),P(/^Jogo$/i)]},
    {label:"Precisão",nodes:[P(/Precis/i)]},
    {label:"Câmara",nodes:[P(/C[âa]mara/i)]},
    {label:"Som",cls:"cols2",nodes:[P(/Som do/i),P(/Som e m/i)]},
    {label:"Controlos",nodes:[P(/Teclado/i)]}
  ]);
  var pr=sc.querySelectorAll(".fx-page")[1];if(pr)pr.classList.add("cols2");
}
function fitData(sc){
  var title=sc.querySelector(":scope>div:not([class])"),ex=panelByTitle(sc,/Exportar/i),im=panelByTitle(sc,/Importar/i);
  var bk=Array.prototype.filter.call(sc.querySelectorAll(":scope>button.btn"),function(b){return /backup/i.test(b.textContent)})[0];
  build(sc,[
    {label:"Exportar",nodes:[title,ex]},
    {label:"Importar",nodes:[im]},
    {label:"Backup",cls:"center",nodes:[bk]}
  ]);
}
function fitGrid(sc){
  sc.classList.add("fx-grid");sc.dataset.fx="1";
  var g=sc.querySelector(".pick-layout>.grid")||sc.querySelector(":scope>.grid");
  function layout(){
    if(!g||!g.isConnected)return;var r=g.getBoundingClientRect(),n=g.children.length||16,best=4,bs=1e9;
    for(var c=2;c<=8;c++){var rows=Math.ceil(n/c),cw=r.width/c,chh=r.height/rows,s=Math.abs(Math.log((cw/Math.max(1,chh))/1.0));if(rows*c>=n&&s<bs){bs=s;best=c}}
    g.style.setProperty("--c",best);
  }
  sc.__fxLayout=layout;layout();requestAnimationFrame(layout);setTimeout(layout,250);
}
var _so=showOverlay;showOverlay=function(){var r=_so.apply(this,arguments);setTimeout(fitCard,90);return r};
var _sp=setPause;setPause=function(v){var r=_sp.apply(this,arguments);if(v)setTimeout(fitCard,120);return r};
var timer=null;
function run(){
  var sc=app&&app.querySelector(".screen:not([data-fx])");if(!sc)return;
  var cl=sc.classList;
  if(cl.contains("hub-screen")){fitHub(sc)}
  else if(cl.contains("career-screen")){fitCareer(sc)}
  else if(cl.contains("options-screen")){if(!sc.querySelector(".aud-panel")&&!sc.__wait){sc.__wait=1;setTimeout(run,260);return}fitOptions(sc)}
  else if(cl.contains("data-screen")){fitData(sc)}
  else if(cl.contains("cup-screen")||cl.contains("pick-screen")){fitGrid(sc)}
}
function schedule(){clearTimeout(timer);timer=setTimeout(run,140)}
if(window.MutationObserver&&app)new MutationObserver(schedule).observe(app,{childList:true});
var rz=null,lw=innerWidth,lh=innerHeight;addEventListener("resize",function(){var g=app&&app.querySelector(".screen.fx-grid");if(g&&g.__fxLayout)g.__fxLayout();clearTimeout(rz);rz=setTimeout(function(){if(Math.abs(innerWidth-lw)<40&&Math.abs(innerHeight-lh)<40)return;lw=innerWidth;lh=innerHeight;var sc=app&&app.querySelector(".screen.fx:not(.fx-grid)");if(!sc)return;var m={"hub-screen":showHub,"career-screen":showCareer,"options-screen":showOptions,"data-screen":showData};for(var k in m)if(sc.classList.contains(k)){window.__fxKeep=sc.__fxIdx||0;m[k]();return}},350)});
window.__fxCheck=function(){var sc=app.querySelector(".screen");if(!sc||!sc.__fxPages)return null;var out=[];sc.__fxPages.forEach(function(x,k){var was=x.pg.hidden;x.pg.hidden=false;var b=x.pg.parentElement;out.push([k,x.pg.scrollHeight-x.pg.clientHeight,x.pg.scrollWidth-x.pg.clientWidth]);x.pg.hidden=was});return out};
})();
