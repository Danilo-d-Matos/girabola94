/* Girabola 94 — apresentação cinematográfica: entrada das equipas no estádio (tempo real, sem vídeo).
   - Usa os jogadores, o árbitro e os assistentes reais do jogo (as mesmas instâncias 3D e as animações de caminhada existentes).
   - Estado próprio do jogo ("intro") que o ciclo principal ignora; no fim, setupKickoff() repõe tudo e o jogo segue para o pontapé de saída.
   - Câmara cinematográfica: pedido ao gl3d.js através de window.__cineCam (a câmara normal não é tocada).
   - Os estádios (.glb) não têm túnel: a entrada faz-se pela pista junto à linha lateral sul, pelo centro, entre os bancos. A geometria
     (profundidade livre, bancos, obstáculos) é medida com raios sobre o modelo do estádio, por isso adapta-se a cada cenário.
   - Saltar: Esc ou botão "Saltar"; a pausa do jogo congela a sequência. */
(function(){
"use strict";
var CFG={
  order:"num",          // ordem da fila: "num" (por número de camisola, neutra) ou "index" (ordem do plantel)
  walk:.78,             // velocidade de caminhada (unidades por passo fixo de 1/60 s; 15 unidades = 1 m)
  accel:.011,           // aceleração (unidades por passo²)
  spacing:30,           // distância entre jogadores da fila (percurso)
  laneRun:210,          // comprimento da pista percorrido antes de virar para o relvado
  rowDepth:92,          // linha de apresentação: distância ao centro do campo, para o lado da câmara
  fillet:30,            // raio das curvas
  prepMin:.9, placeT:.8, holdT:1.0, fadeT:.45, readyTimeout:5
};
window.INTRO_CFG=CFG;
var T=function(){return window.THREE};
function R3(){try{return window.__R3&&window.__R3()}catch(e){return null}}
function clamp(v,a,b){return v<a?a:v>b?b:v}
function sstep(x){x=clamp(x,0,1);return x*x*(3-2*x)}
function lerp(a,b,t){return a+(b-a)*t}

/* ---------- caminhos: poligonal com curvas suaves e prolongamento para trás (cauda da fila) ---------- */
function buildPath(pts,r){
  var out=[pts[0].slice()],i,k;
  for(i=1;i<pts.length-1;i++){
    var a=pts[i-1],b=pts[i],c=pts[i+1],d1=Math.hypot(b[0]-a[0],b[1]-a[1])||1,d2=Math.hypot(c[0]-b[0],c[1]-b[1])||1,rr=Math.min(r,d1/2,d2/2);
    var p0=[b[0]-(b[0]-a[0])/d1*rr,b[1]-(b[1]-a[1])/d1*rr],p2=[b[0]+(c[0]-b[0])/d2*rr,b[1]+(c[1]-b[1])/d2*rr];
    out.push(p0);
    for(k=1;k<=8;k++){var u=k/9,v=1-u;out.push([v*v*p0[0]+2*u*v*b[0]+u*u*p2[0],v*v*p0[1]+2*u*v*b[1]+u*u*p2[1]])}
    out.push(p2);
  }
  out.push(pts[pts.length-1].slice());
  var cum=[0];for(i=1;i<out.length;i++)cum.push(cum[i-1]+Math.hypot(out[i][0]-out[i-1][0],out[i][1]-out[i-1][1]));
  var L=cum[cum.length-1];
  function at(s){
    if(s<=0){var dx=out[1][0]-out[0][0],dy=out[1][1]-out[0][1],dd=Math.hypot(dx,dy)||1;return{x:out[0][0]+dx/dd*s,y:out[0][1]+dy/dd*s,tx:dx/dd,ty:dy/dd}}
    if(s>=L){var n=out.length,ex=out[n-1][0]-out[n-2][0],ey=out[n-1][1]-out[n-2][1],ed=Math.hypot(ex,ey)||1;return{x:out[n-1][0],y:out[n-1][1],tx:ex/ed,ty:ey/ed}}
    var lo=0,hi=out.length-1;while(hi-lo>1){var m=(lo+hi)>>1;if(cum[m]<=s)lo=m;else hi=m}
    var seg=cum[hi]-cum[lo]||1,t=(s-cum[lo])/seg,sx=out[hi][0]-out[lo][0],sy=out[hi][1]-out[lo][1],sd=Math.hypot(sx,sy)||1;
    return{x:out[lo][0]+sx*t,y:out[lo][1]+sy*t,tx:sx/sd,ty:sy/sd}
  }
  return{len:L,at:at,pts:out};
}

/* ---------- geometria do estádio (raios sobre o modelo) ---------- */
var GEOM_CACHE={};
function probe(){
  var S=R3()&&R3().S,cx=W/2,def={depth:110,laneB:Y1+46,laneA:Y1+78,cx:cx,ray:null,measured:false};
  if(!S||!S.gst||!S.gstG||!S.gstG.gltf||!T().Raycaster)return def;
  var key=S.gst;if(GEOM_CACHE[key])return GEOM_CACHE[key];
  var root=S.gstG.gltf.scene,rc=new (T().Raycaster)(),V3=T().Vector3,SKIP=/erva|capim|relva|grass/i;
  root.updateMatrixWorld(true);
  function ray(o,d,far){
    rc.set(new V3(o[0],o[1],o[2]),new V3(d[0],d[1],d[2]).normalize());rc.far=far||4000;
    var h=rc.intersectObject(root,true);
    for(var i=0;i<h.length;i++){var n=(h[i].object.name||"")+"|"+(h[i].object.parent&&h[i].object.parent.name||"");if(!SKIP.test(n))return h[i].distance}
    return Infinity;
  }
  var g={ray:ray,cx:cx,measured:true};
  // profundidade livre para sul (muro/bancada) à altura do corpo
  var depth=Math.min(ray([cx-60,9,Y1+2],[0,0,1],400),ray([cx,9,Y1+2],[0,0,1],400),ray([cx+60,9,Y1+2],[0,0,1],400));
  if(!isFinite(depth))depth=160;
  g.depth=clamp(depth,50,200);
  var d3=ray([cx,3,Y1+2],[0,0,1],400);g.boardEnd=(isFinite(d3)&&d3<g.depth-15)?d3+9:12;      // painéis LED baixos junto à linha
  var zs=g.boardEnd+16,ze=g.depth-14;                                                            // zona útil (distâncias à linha lateral)
  function free(x,y,dx,len){return ray([x,9,Y1+y],[dx,0,0],len)>len}
  function colFree(x,y0){return ray([x,9,Y1+y0],[0,0,-1],y0+6)>y0+6}
  var found=false,off=[0,10,-10,20,-20,30,-30,40,-40,50,-50,60,-60,80,-80,100,-100,130,-130,160,-160,200,-200,250,-250,300,-300],i,j,d,sp=28;
  var span=CFG.laneRun+5*CFG.spacing+30;
  for(i=0;i<off.length&&!found;i++){
    var x=cx+off[i];
    for(d=zs;d+sp<=ze&&!found;d+=3){
      if(!(free(x-22-span,d,1,span)&&free(x-22-span,d+sp,1,span+44)))continue;                  // as duas pistas livres até ao ponto de viragem
      if(!(colFree(x-22,d)&&colFree(x+22,d+sp)))continue;                                       // e a passagem para o relvado também
      g.cx=x;g.laneB=Y1+d;g.laneA=Y1+d+sp;found=true;
    }
  }
  if(!found){g.cx=cx;g.laneB=Y1-52;g.laneA=Y1-24;g.fallback=true;g.inside=true}      // sem espaço livre fora do campo: as filas aguardam e caminham dentro da faixa junto à linha lateral
  GEOM_CACHE[key]=g;return g;
}

/* ---------- construção da sequência ---------- */
function ordered(team){
  var l=G.players.filter(function(p){return p.team===team&&!p.off});
  if(CFG.order==="num")l.sort(function(a,b){return (+a.num||0)-(+b.num||0)||a.i-b.i});
  return l;
}
function build(geo){
  var cx=geo.cx,sp=CFG.spacing,Lw=CFG.laneRun,ySlot=H/2+CFG.rowDepth,n,r=CFG.fillet;
  var t0=ordered(0),t1=ordered(1);
  // equipa 0 (defende a baliza esquerda): pista interior, vira em cx-22 e segue para oeste; equipa 1: pista exterior, vira em cx+22 e segue para este
  var p0=buildPath([[cx-22-Lw,geo.laneB],[cx-22,geo.laneB],[cx-22,ySlot],[cx-22-5*sp,ySlot]],r);
  var p1=buildPath([[cx+22-Lw,geo.laneA],[cx+22,geo.laneA],[cx+22,ySlot],[cx+22+5*sp,ySlot]],r);
  var pr=buildPath([[cx,(geo.laneB+geo.laneA)/2],[cx,H/2+34]],r);
  return{
    cx:cx,ySlot:ySlot,geo:geo,
    trains:[{path:p0,list:t0,dir:-1},{path:p1,list:t1,dir:1}],
    ref:{path:pr,s:0,v:0},
    S:0,v:0,
    Sturn:Lw-r*.5,                            // início da curva para o relvado (percurso do líder)
    Scross:null
  };
}
function crossS(path,yLine){var s;for(s=0;s<path.len;s+=2){if(path.at(s).y<=yLine)return s}return path.len}

/* ---------- jogadores (as mesmas instâncias do jogo) ---------- */
function stepActor(p,pos,tx,ty,turnMax){
  var ox=p.x,oy=p.y;
  p.ox=ox;p.oy=oy;
  p.x=pos.x;p.y=pos.y;
  p.vx=p.x-ox;p.vy=p.y-oy;
  var sp=Math.hypot(p.vx,p.vy);
  p.run=(p.run||0)+sp*.28;                       // a mesma relação passada/deslocamento do jogo
  var a=Math.atan2(p.fy,p.fx),tg=Math.atan2(ty,tx),d=Math.atan2(Math.sin(tg-a),Math.cos(tg-a));
  a+=clamp(d,-turnMax,turnMax);p.fx=Math.cos(a);p.fy=Math.sin(a);
  p.sprinting=false;p.stun=0;p.dash=0;p.tackling=false;p.kickAnim=0;p.dx=p.dy=0;
}

/* ---------- interface (barras, botão saltar, legendas) ---------- */
var CSS="#introUI{position:absolute;inset:0;pointer-events:none;z-index:6;font-family:Rajdhani,'Arial Narrow',sans-serif}"+
 "#introUI .bar{position:absolute;left:0;right:0;height:0;background:#000;transition:height .8s ease}#introUI .bt{top:0}#introUI .bb{bottom:0}#introUI.on .bar{height:9%}"+
 "#introUI .fade{position:absolute;inset:0;background:#000;opacity:1;transition:opacity .5s ease}"+
 "#introUI .cap{position:absolute;left:0;right:0;bottom:11%;display:flex;justify-content:center;align-items:center;gap:22px;color:#fff;opacity:0;transform:translateY(8px);transition:opacity .6s ease,transform .6s ease;text-shadow:0 2px 12px rgba(0,0,0,.8)}"+
 "#introUI .cap.on{opacity:1;transform:none}#introUI .cap b{font-size:clamp(20px,3.2vw,38px);letter-spacing:.04em;text-transform:uppercase;font-weight:700}#introUI .cap i{font-style:normal;color:#f2b705;font-weight:700;font-size:clamp(14px,2vw,22px)}"+
 "#introUI .cap small{position:absolute;top:100%;margin-top:6px;font-size:clamp(11px,1.4vw,15px);letter-spacing:.14em;color:#d8e2ee;text-transform:uppercase}"+
 "#introUI .cap img{height:clamp(28px,4vw,48px);width:auto;vertical-align:middle;margin:0 8px}"+
 "#introUI button{pointer-events:auto;position:absolute;right:16px;bottom:calc(9% + 12px);background:rgba(8,16,26,.72);color:#fff;border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:8px 16px;font:600 15px Rajdhani,'Arial Narrow',sans-serif;letter-spacing:.06em;cursor:pointer}"+
 "#introUI button:hover,#introUI button:focus-visible{background:rgba(242,183,5,.95);color:#111;outline:none}"+
 ".intro-on .board,.intro-on .ball-player,.intro-on .rightbar,.intro-on .keys{visibility:hidden}"+
 "@media (prefers-reduced-motion:reduce){#introUI .bar,#introUI .fade,#introUI .cap{transition:none}}";
function ensureCSS(){if(document.getElementById("introCSS"))return;var s=document.createElement("style");s.id="introCSS";s.textContent=CSS;document.head.appendChild(s)}
function buildUI(){
  var st=document.getElementById("stage"),m=document.getElementById("match");if(!st)return null;
  ensureCSS();
  var ui=document.createElement("div");ui.id="introUI";
  ui.innerHTML='<div class="bar bt"></div><div class="bar bb"></div><div class="cap" id="introCap"></div><button type="button" id="introSkip" aria-label="Saltar a apresentação (Esc)">Saltar ▸ Esc</button><div class="fade" id="introFade"></div>';
  st.appendChild(ui);if(m)m.classList.add("intro-on");
  var sk=ui.querySelector("#introSkip");sk.onclick=function(){introFinish("skip")};
  return ui;
}
function showCaption(){
  var c=document.getElementById("introCap");if(!c||c.dataset.set)return;c.dataset.set="1";
  var o=G.o,t0=G.teams[0],t1=G.teams[1],names=[o.homeLeft?t0:t1,o.homeLeft?t1:t0];
  var ids=[o.homeLeft?o.L:o.R,o.homeLeft?o.R:o.L];
  function img(i){try{return crest(i,40)}catch(e){return""}}
  c.innerHTML=img(ids[0])+"<b>"+names[0].n+"</b><i>VS</i><b>"+names[1].n+"</b>"+img(ids[1])+"<small>"+(G.stadium||"")+"</small>";
  requestAnimationFrame(function(){c.classList.add("on")});
}

/* ---------- câmaras ---------- */
var CAM={pos:null,tgt:null,hf:64,from:null,shot:"",blend:1,t:0,lastT:0};
function players(){return G.players.filter(function(p){return !p.off})}
function centroid(){
  var l=players(),x=0,y=0,n=0,vx=0,vy=0;for(var i=0;i<l.length;i++){x+=l[i].x;y+=l[i].y;vx+=l[i].vx||0;vy+=l[i].vy||0;n++}
  n=n||1;return{x:x/n,y:y/n,vx:vx/n,vy:vy/n};
}
function leaders(){var I=G.intro,a=I.trains[0].list[0],b=I.trains[1].list[0];return[a,b]}
/* escolhe, com histerese, o primeiro candidato com linha de vista livre até ao alvo (evita bancos, paredes e bancadas) */
function viewFree(geo,Tg,P){
  if(!geo||!geo.ray)return true;
  var dx=P.x-Tg.x,dy=P.y-Tg.y,dz=P.z-Tg.z,d=Math.hypot(dx,dy,dz)||1;
  return geo.ray([Tg.x,Tg.y,Tg.z],[dx,dy,dz],d)>=d-1;
}
function pick(I,name,Tg,cands){
  var st=I.pick[name]||(I.pick[name]={i:0,f:0}),i;
  if((st.f++)%24===0){st.i=cands.length-1;for(i=0;i<cands.length;i++){if(viewFree(I.geo,Tg,cands[i])){st.i=i;break}}}
  return cands[Math.min(st.i,cands.length-1)];
}
function shot(name,I){
  var cx=I.cx,Y=Y1,geo=I.geo,lc=leadC(I),c=centroid(),d=Math.hypot(c.vx,c.vy),dx=d>.05?c.vx/d:1,dy=d>.05?c.vy/d:0,Tg,P,list=[],i;
  switch(name){
    case"A":{  // preparação: plano baixo à frente das filas, do lado do relvado, com ligeira aproximação
      var ax=cx-22-CFG.laneRun*.55,k=sstep(I.t/6)*26;
      Tg={x:ax-26,y:11,z:(geo.laneA+geo.laneB)/2};
      [185,150,110,70,30,-20].forEach(function(e){list.push({x:ax+e-k,y:31,z:Math.min(Y-8,geo.laneB-52)})});
      list.push({x:ax+260,y:24,z:Math.min(Y-10,geo.laneB-52)});
      P=pick(I,"A",Tg,list);return{px:P.x,py:P.y,pz:P.z,tx:Tg.x,ty:Tg.y,tz:Tg.z,hf:66};
    }
    case"B":{  // seguimento: por trás e em diagonal (do lado do relvado), com as duas filas no enquadramento
      var nx=-dy,nz=dx;if(nz>0||(Math.abs(nz)<.3&&nx>0)){nx=-nx;nz=-nz}      // normal virada para o relvado
      Tg={x:c.x+dx*25,y:12,z:c.y+dy*25};
      // por trás e acima da cauda da fila (ligeiramente do lado do relvado); alternativas laterais
      [[150,26,40],[150,0,44],[120,-28,38],[85,95,34],[85,-95,34]].forEach(function(o){list.push({x:c.x-dx*o[0]+nx*o[1],y:o[2],z:c.y-dy*o[0]+nz*o[1]})});
      P=pick(I,"B",Tg,list);return{px:P.x,py:P.y,pz:P.z,tx:Tg.x,ty:Tg.y,tz:Tg.z,hf:64};
    }
    case"C":{  // revelação: plano lateral baixo sobre o relvado, com a bancada em fundo
      Tg={x:lc.x+12,y:19,z:lc.y-8};
      [[-250,Y-45],[-300,Y-72],[-210,Y-30],[-340,Y-40],[-170,Y-62]].forEach(function(o){list.push({x:cx+o[0],y:15,z:o[1]})});
      P=pick(I,"C",Tg,list);return{px:P.x,py:P.y,pz:P.z,tx:Tg.x,ty:Tg.y,tz:Tg.z,hf:58};
    }
    case"D":{  // plano geral final, em frente à linha de apresentação (sobe devagar)
      var up=sstep(I.pt/5)*8;Tg={x:cx,y:9,z:I.ySlot-26};
      [[Math.min(geo.depth-18,125),Math.min(88,geo.depth*.62)],[95,70],[65,52],[38,38]].forEach(function(o){list.push({x:cx+10,y:o[1]+up,z:Y+o[0]})});
      P=pick(I,"D",Tg,list);return{px:P.x,py:P.y,pz:P.z,tx:Tg.x,ty:Tg.y,tz:Tg.z,hf:56};
    }
  }
  return null;
}
function leadC(I){var a=I.trains[0].list[0],b=I.trains[1].list[0];return{x:(a.x+b.x)/2,y:(a.y+b.y)/2}}
function camClamp(target,pos,geo){
  // última rede: se ainda houver obstáculo no caminho, aproxima-se do alvo
  if(!geo||!geo.ray)return pos;
  var dx=pos.x-target.x,dy=pos.y-target.y,dz=pos.z-target.z,d=Math.hypot(dx,dy,dz)||1;
  var h=geo.ray([target.x,target.y,target.z],[dx,dy,dz],d+10);
  if(isFinite(h)&&h<d+8){var k=Math.max(.25,(h-10)/d);return{x:target.x+dx*k,y:Math.max(3,target.y+dy*k),z:target.z+dz*k}}
  return pos;
}
function camUpdate(dt){
  var I=G.intro;if(!I)return;
  var want=I.shot,s=shot(want,I);if(!s)return;
  if(CAM.shot!==want){CAM.from=CAM.pos?{p:{x:CAM.pos.x,y:CAM.pos.y,z:CAM.pos.z},t:{x:CAM.tgt.x,y:CAM.tgt.y,z:CAM.tgt.z},hf:CAM.hf}:null;CAM.shot=want;CAM.blend=CAM.from?0:1;CAM.camT=0}
  CAM.blend=Math.min(1,CAM.blend+dt/1.5);var b=sstep(CAM.blend);
  var P={x:s.px,y:s.py,z:s.pz},Tg={x:s.tx,y:s.ty,z:s.tz};
  // afastar a câmara de jogadores muito próximos
  var l=players();for(var i=0;i<l.length;i++){var q=l[i],ddx=P.x-q.x,ddz=P.z-q.y,dd=Math.hypot(ddx,ddz);if(dd<26&&P.y<34){var k=(26-dd)/(dd||1);P.x+=ddx*k;P.z+=ddz*k}}
  P=camClamp(Tg,P,I.geo);
  var hf=s.hf;
  if(CAM.from){P={x:lerp(CAM.from.p.x,P.x,b),y:lerp(CAM.from.p.y,P.y,b),z:lerp(CAM.from.p.z,P.z,b)};Tg={x:lerp(CAM.from.t.x,Tg.x,b),y:lerp(CAM.from.t.y,Tg.y,b),z:lerp(CAM.from.t.z,Tg.z,b)};hf=lerp(CAM.from.hf,hf,b)}
  // suavização temporal (seguimento sem solavancos)
  var a=1-Math.exp(-dt*(CAM.pos?3.4:100));
  if(!CAM.pos){CAM.pos=P;CAM.tgt=Tg;CAM.hf=hf}
  else{CAM.pos={x:lerp(CAM.pos.x,P.x,a),y:lerp(CAM.pos.y,P.y,a),z:lerp(CAM.pos.z,P.z,a)};CAM.tgt={x:lerp(CAM.tgt.x,Tg.x,a),y:lerp(CAM.tgt.y,Tg.y,a),z:lerp(CAM.tgt.z,Tg.z,a)};CAM.hf=lerp(CAM.hf,hf,a)}
  var cc=window.__cineCam||(window.__cineCam={});
  cc.on=true;cc.hfov=CAM.hf;cc.px=CAM.pos.x;cc.py=CAM.pos.y;cc.pz=CAM.pos.z;cc.tx=CAM.tgt.x;cc.ty=CAM.tgt.y;cc.tz=CAM.tgt.z;
}

/* ---------- máquina de estados ---------- */
var PHASES=["prep","place","enter","walk","reveal","approach","finish"];
var SHOT={prep:"A",place:"A",enter:"A",walk:"B",reveal:"C",approach:"D",finish:"D"};
function setPhase(I,ph){I.phase=ph;I.pt=0;I.shot=SHOT[ph]}
function ready(){
  var r=R3();if(!r||!r.S)return false;
  var gl=window.__GLBM;if(gl&&gl.state==="loading")return false;       // modelos dos jogadores ainda a carregar
  return r.S.gst===PREF.stadium;                                         // cenário .glb aplicado
}
function placeAll(I){
  // posições iniciais: filas paradas à entrada (cauda para trás da pista); bola no centro; árbitro à espera
  var t,i;
  for(t=0;t<2;t++){var tr=I.trains[t];for(i=0;i<tr.list.length;i++){var p=tr.list[i],pos=tr.path.at(-i*CFG.spacing);p.x=p.ox=pos.x;p.y=p.oy=pos.y;p.vx=p.vy=0;p.fx=pos.tx;p.fy=pos.ty;p.run=0;p.dx=p.dy=0;p.sprinting=false;p.stun=0;p.dash=0;p.tackling=false;p.kickAnim=0}}
  var b=G.ball;b.owner=null;b.pend=null;b.x=W/2;b.y=H/2;b.vx=b.vy=0;b.z=0;b.vz=0;b.sp=0;b.ox=b.x;b.oy=b.y;
  var r=G.ref||(G.ref={x:W/2,y:H/2-90}),rp=I.ref.path.at(0);r.x=rp.x;r.y=rp.y;r.px=r.x;r.py=r.y;r.fx=0;r.fy=-1;r.vx=r.vy=0;
  if(!G.asst)G.asst=[{x:X0+120,y:Y0-13,flag:false,vx:0},{x:X1-120,y:Y1+13,flag:false,vx:0}];
  G.asst[0].vx=G.asst[1].vx=0;
}
function introTick(){
  var I=G.intro;if(!I||I.done)return;
  var dt=DT;I.t+=dt;I.pt+=dt;
  var phase=I.phase,sp=CFG.spacing,tr,i,t;
  // movimento (a partir da fase "enter")
  var moving=(phase==="enter"||phase==="walk"||phase==="reveal"||phase==="approach");
  if(moving){
    var L=I.trains[0].path.len,rem=L-I.S,vt=Math.min(CFG.walk,rem*.045+.015);
    I.v=Math.min(vt,I.v+CFG.accel);if(vt<I.v)I.v=vt;I.S=Math.min(L,I.S+I.v);
    // árbitro à frente, com atraso
    var R=I.ref;if(I.t-I.tEnter>1.2){var rl=R.path.len,rr=rl-R.s,rv=Math.min(CFG.walk,rr*.05+.015);R.v=Math.min(rv,R.v+CFG.accel);R.s=Math.min(rl,R.s+R.v)}
  }
  var done=I.S>=I.trains[0].path.len-.5;
  for(t=0;t<2;t++){
    tr=I.trains[t];
    for(i=0;i<tr.list.length;i++){
      var p=tr.list[i],s=I.S-i*sp,pos=tr.path.at(s);
      if(!moving&&phase!=="finish"){continue}
      var fx=pos.tx,fy=pos.ty;
      if(done){fx=0;fy=1}                                         // chegados: viram-se para a câmara (sul)
      stepActor(p,pos,fx,fy,done?.07:.14);
    }
  }
  // árbitro
  var rf=G.ref,rpos=I.ref.path.at(I.ref.s),rox=rf.x,roy=rf.y;
  if(moving||phase==="finish"){rf.x=rpos.x;rf.y=rpos.y;var rdx=rf.x-rox,rdy=rf.y-roy;if(Math.hypot(rdx,rdy)>.05){rf.fx=lerp(rf.fx||0,rpos.tx,.15);rf.fy=lerp(rf.fy||1,rpos.ty,.15)}if(I.ref.s>=I.ref.path.len-.5){rf.fx=lerp(rf.fx,0,.08);rf.fy=lerp(rf.fy,1,.08)}}
  // áudio: o ambiente do estádio sobe de forma moderada à saída para o relvado
  if(phase==="reveal"||phase==="approach")G.crowdPulse=Math.max(G.crowdPulse||0,Math.min(.5,(G.crowdPulse||0)+.003));
  // transições (condições explícitas)
  var Ld=I.trains[0].path.at(I.S);
  switch(phase){
    case"prep":
      if(I.pt>=CFG.prepMin&&(ready()||I.pt>=CFG.readyTimeout)){
        var geo=probe();Object.assign(I,build(geo));I.Scross=Math.max(crossS(I.trains[0].path,Y1),I.Sturn+30);placeAll(I);
        var f=document.getElementById("introFade");if(f)f.style.opacity="0";if(I.ui)I.ui.classList.add("on");
        setPhase(I,"place")}
      break;
    case"place":
      if(I.pt>=CFG.placeT){I.tEnter=I.t;setPhase(I,"enter")}
      break;
    case"enter":
      if(I.S>=70)setPhase(I,"walk");
      break;
    case"walk":
      if(I.S>=I.Sturn+10)setPhase(I,"reveal");
      break;
    case"reveal":
      if(I.S>=I.Scross+60)setPhase(I,"approach");
      break;
    case"approach":
      if(done){setPhase(I,"finish");showCaption()}
      break;
    case"finish":
      if(I.pt>=CFG.holdT&&!I.fading){I.fading=true;var f=document.getElementById("introFade");if(f){f.style.transition="opacity "+CFG.fadeT+"s ease";f.style.opacity="1"}I.tFade=I.t}
      if(I.fading&&I.t-I.tFade>=CFG.fadeT)introFinish("end");
      break;
  }
  if(phase==="approach"&&I.S>I.trains[0].path.len-90)showCaption();
  input.shootPressed=input.passPressed=input.switchPressed=input.cancelPressed=false;
}

/* ---------- arranque e fim ---------- */
function enabled(o){
  if(!o||o.mode==="tutorial")return false;
  if(PREF.intro===false||/[?&]intro=0/.test(location.search))return false;
  if(window.__olPending)return false;                               // jogo online: o servidor comanda o arranque
  if(PREF.camera==="top")return false;                              // a apresentação é em 3D
  var r=R3();if(!r||!r.ok)return false;
  return true;
}
function introStart(o){
  if(!G||G.intro||!enabled(o))return;
  var ui=buildUI();if(!ui)return;
  var I={pick:{},phase:"prep",pt:0,t:0,done:false,shot:"A",S:0,v:0,ui:ui,timers:[],fading:false};
  var geo=probe();
  Object.assign(I,build(geo));
  I.Scross=Math.max(crossS(I.trains[0].path,Y1),I.Sturn+30);
  G.intro=I;G.prevState=G.state;G.state="intro";G.msg="";G.msgSub="";
  CAM.pos=null;CAM.shot="";window.__cineCam={on:true,hfov:64,px:W/2,py:20,pz:Y1-6,tx:W/2,ty:12,tz:Y1+60};
  // o ecrã fica preto até o estádio e os modelos estarem prontos (fase "prep"); depois desvanece para o primeiro plano
  document.addEventListener("keydown",onKey,true);window.addEventListener("blur",noop);
  G.crowdPulse=Math.max(G.crowdPulse||0,.22);
  // posiciona já (o primeiro fotograma nunca mostra o plantel em posição de jogo)
  placeAll(I);
}
function noop(){}
function onKey(e){
  if(!G||!G.intro)return;
  if(e.code==="Escape"&&!G.paused){e.preventDefault();e.stopImmediatePropagation();introFinish("skip")}
}
function introFinish(reason){
  var I=G&&G.intro;if(!I||I.done)return;                           // idempotente
  I.done=true;
  I.timers.forEach(clearTimeout);I.timers.length=0;
  document.removeEventListener("keydown",onKey,true);window.removeEventListener("blur",noop);
  if(window.__cineCam)window.__cineCam.on=false;
  CAM.pos=CAM.tgt=null;CAM.shot="";
  var ui=I.ui;
  G.intro=null;
  // estado inicial correto do jogo: o mesmo que o launch() prepara (formação, bola, posse e controlo)
  var wasPaused=G.paused;
  setupKickoff(G.firstKick);
  G.state="kickoff";G.msg="Pontapé de saída";G.msgSub=G.stadium+" · recinto fictício";G.st=2.0;
  G.t=0;for(var i=0;i<G.players.length;i++){var p=G.players[i];p.ox=p.x;p.oy=p.y;p.run=0}
  G.ball.ox=G.ball.x;G.ball.oy=G.ball.y;
  if(typeof camInit!=="undefined")camInit=false;
  input.shootPressed=input.passPressed=input.switchPressed=input.cancelPressed=false;
  var m=document.getElementById("match");if(m)m.classList.remove("intro-on");
  if(ui){
    var f=ui.querySelector("#introFade");
    if(f){f.style.transition="none";f.style.opacity="1";void f.offsetWidth;f.style.transition="opacity .5s ease";f.style.opacity="0"}
    var bars=ui.querySelectorAll(".bar,.cap,button");bars.forEach(function(b){b.style.display="none"});
    var tm=setTimeout(function(){if(ui.parentNode)ui.parentNode.removeChild(ui)},650);
    I.timers.push(tm);                                                 // (limpo no remove; não há mais referências)
  }
  if(typeof hudCache!=="undefined")hudCache="";
}
window.introSkip=function(){introFinish("skip")};
window.introActive=function(){return !!(G&&G.intro)};

/* ---------- ligação ao jogo ---------- */
var hooked=false,_launch=launch;
launch=function(o){
  var r=_launch.apply(this,arguments);
  try{installHooks();introStart(o)}catch(e){console.warn("Apresentação indisponível:",e);try{if(G&&G.intro)introFinish("erro")}catch(e2){}}
  return r;
};
/* os ganchos do ciclo, do desenho e da pausa instalam-se em tempo de execução (ficam por fora de qualquer outro wrapper) */
function installHooks(){
  if(hooked)return;hooked=true;
  var _step=step;
  step=function(){
    if(G&&G.state==="intro"&&G.intro){
      if(G.paused)return;
      try{introTick()}catch(e){console.warn("Apresentação interrompida:",e);introFinish("erro")}
      return;
    }
    _step();
  };
  var _render=render;
  render=function(){
    if(G&&G.state==="intro"&&G.intro&&!G.paused){var now=performance.now(),dt=Math.min(.1,(now-(CAM.lastT||now))/1000);CAM.lastT=now;try{camUpdate(dt)}catch(e){console.warn(e)}}
    else CAM.lastT=0;
    return _render.apply(this,arguments);
  };
  var _canPause=canPause;
  canPause=function(){return (G&&G.state==="intro"&&G.intro&&!G.ended)?true:_canPause.apply(this,arguments)};
  var _setPause=setPause;
  setPause=function(v){
    var r=_setPause.apply(this,arguments);
    if(v&&G&&G.intro){
      var row=document.querySelector("#ov .row");
      if(row&&!document.getElementById("pSkipIntro")){
        var b=document.createElement("button");b.className="btn ghost";b.id="pSkipIntro";b.textContent="Saltar apresentação";
        b.onclick=function(){setPause(false);introFinish("skip")};
        row.insertBefore(b,row.children[1]||null);
      }
    }
    return r;
  };
}
})();
