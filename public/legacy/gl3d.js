/* ===== Renderizador WebGL (Three.js) com o aspeto 2D do v4 =====
   O Three.js desenha o que pesa (relvado, bancadas, placas, balizas, jogadores e bola) na GPU.
   Um canvas 2D transparente por cima desenha o HUD, partículas, marcadores e radar.
   A câmara reproduz exatamente a projeção proj() da câmara de transmissão. */
(function(){
"use strict";
if(typeof THREE==="undefined"){console.warn("Three.js indisponível: a usar o desenho em canvas 2D");return}
const T=THREE;
/* escala real: o jogador mede 27 unidades para 1,80 m (15 u/m), por isso uma bola de 22 cm de diâmetro (raio 0,11 m) tem raio 1,65 */
const BALL_R=2.4;   // a bola real teria 1,65; aumentada de propósito para se ver bem na câmara de TV
let R=null;

/* ---------- utilitários ---------- */
function mkCanvas(w,h){const c=document.createElement("canvas");c.width=w;c.height=h;return c}
function tex(c,opts={}){const t=new T.CanvasTexture(c);t.minFilter=opts.mip?T.LinearMipmapLinearFilter:T.LinearFilter;t.magFilter=T.LinearFilter;t.generateMipmaps=!!opts.mip;if(opts.aniso)t.anisotropy=opts.aniso;if(opts.repeat){t.wrapS=T.RepeatWrapping}return t}
function basic(map,extra){return new T.MeshBasicMaterial(Object.assign({map,transparent:false},extra||{}))}

/* ---------- tipos de estádio ---------- */
const STADIA={
  classic:{tint:0xffffff,mx:105,my:40,depth:150,h:90,endDepth:110,endH:60,ad:15,roof:true,roofH:140,roofDay:0x9aa7a2,roofNight:0x07100c,wallDay:"#aaa397",wallNight:"#1b2228",groundDay:0x3c8a2c,groundNight:0x143012,sky:"city",towers:false,lights:[[X0-60,Y0-170,140,210],[W/2,Y0-170,140,210],[X1+60,Y0-170,140,210]]},
  modern:{tint:0xeaf2ff,mx:105,my:40,depth:190,h:125,endDepth:150,endH:85,ad:20,roof:true,roofH:180,roofDay:0xdfe6ea,roofNight:0x14232e,wallDay:"#d4dce0",wallNight:"#16242e",groundDay:0x4a9a3a,groundNight:0x15321a,sky:null,towers:true,lights:[[X0-330,Y0-230,300,300],[X1+330,Y0-230,300,300],[X0-330,Y1+330,300,260],[X1+330,Y1+330,300,260]]},
  bairro:{tint:0xfff3e0,mx:95,my:40,depth:110,h:55,endDepth:80,endH:35,ad:12,roof:false,roofH:0,roofDay:0,roofNight:0,wallDay:"#d9b48a",wallNight:"#2a2018",groundDay:0x86904c,groundNight:0x232814,sky:"bairro",towers:false,lights:[[X0-200,Y0-120,170,170],[X1+200,Y0-120,170,170]]},
  aberto:{tint:0xffffff,mx:150,my:100,depth:190,h:100,endDepth:120,endH:70,ad:15,roof:false,roofH:0,roofDay:0,roofNight:0,wallDay:"#b8b0a0",wallNight:"#1e252a",groundDay:0x4f9a3b,groundNight:0x12301a,sky:"hills",towers:true,lights:[[X0-340,Y0-300,300,260],[X1+340,Y0-300,300,260],[X0-340,Y1+300,300,240],[X1+340,Y1+300,300,240]]}
};
const STADIUM_INFO={imbondeiro:["Estádio Nacional do Imbondeiro","Arena de dois pisos com cobertura, pista de atletismo, 4 torres de luz e ecrã gigante."],classico:["Estádio Clássico do Rangel","Bancadas cheias em anel à volta da pista, bancada principal coberta e a cidade à volta."],azul:["Estádio Azul da Maianga","Relvado sem pista, bancadas azuis junto ao campo, duas cobertas."],marcal:["Pelado do Marçal","Terra batida com bancada coberta, degraus de betão e casas à volta."],bairro:["Campo do Bairro","Pelado de terra batida entre muros e casas, com bancada baixa e holofotes nos postes."]};
window.STADIUM_INFO=STADIUM_INFO;
/* ---------- textura do relvado (plano, com listas e marcações) ---------- */
const SMX=()=>(STADIA[PREF.stadium]||STADIA.classic).mx,SMY=()=>(STADIA[PREF.stadium]||STADIA.classic).my;
const PX0=()=>X0-SMX()-6,PY0=()=>Y0-SMY(),PW=()=>(X1-X0)+2*SMX()+12,PH_=()=>(Y1+260)-(Y0-SMY());
function pitchTexture(aniso){
  const DIRT=PREF.stadium==="bairro",S=2,w=PW(),h=PH_(),cv=mkCanvas(Math.round(w*S),Math.round(h*S)),c=cv.getContext("2d");
  c.scale(S,S);c.translate(-PX0(),-PY0());
  c.fillStyle=DIRT?"#ad804d":"#3f8f2c";c.fillRect(PX0(),PY0(),w,h);
  const sw=(X1-X0)/14;
  for(let i=-6;i<20;i++){c.fillStyle=(i+20)%2?(DIRT?"#b78a56":"#57a63a"):(DIRT?"#a87b49":"#4c9a31");c.fillRect(X0+i*sw,PY0(),sw,h)}
  if(PREF.stadium==="modern"){const bh=(Y1-Y0)/10;for(let j=-2;j<16;j++){c.fillStyle=j%2?"rgba(255,255,255,.05)":"rgba(0,0,0,.04)";c.fillRect(PX0(),Y0+j*bh,w,bh)}}
  const nz=mkCanvas(128,128),n=nz.getContext("2d"),id=n.createImageData(128,128);
  for(let i=0;i<id.data.length;i+=4){const v=Math.random()*255|0;id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=255}
  n.putImageData(id,0,0);c.save();c.globalAlpha=.07;c.fillStyle=c.createPattern(nz,"repeat");c.fillRect(PX0(),PY0(),w,h);c.restore();
  // brilho de corte por faixa, folhas de relva, zonas gastas e sombreado nas bordas
  for(let i=-6;i<20;i++){const xa=X0+i*sw,gr=c.createLinearGradient(xa,0,xa+sw,0);gr.addColorStop(0,"rgba(255,255,255,.05)");gr.addColorStop(.5,"rgba(255,255,255,0)");gr.addColorStop(1,"rgba(0,0,0,.07)");c.fillStyle=gr;c.fillRect(xa,PY0(),sw,h)}
  if(!DIRT){const bl=mkCanvas(96,192),bq=bl.getContext("2d");for(let i=0;i<420;i++){const x=Math.random()*96,y=Math.random()*192,l=4+Math.random()*10;bq.strokeStyle=Math.random()<.5?"rgba(255,255,255,.5)":"rgba(0,40,0,.55)";bq.lineWidth=.7;bq.beginPath();bq.moveTo(x,y);bq.lineTo(x+(Math.random()-.5)*2,y-l);bq.stroke()}
   c.save();c.globalAlpha=.09;c.fillStyle=c.createPattern(bl,"repeat");c.fillRect(PX0(),PY0(),w,h);c.restore()}
  if(!DIRT)for(const [wx,wy,wr] of [[X0+16,H/2,70],[X1-16,H/2,70],[X0+100,H/2,22],[X1-100,H/2,22],[W/2,H/2,26],[X0+240,H/2,60],[X1-240,H/2,60]]){const wg=c.createRadialGradient(wx,wy,0,wx,wy,wr);wg.addColorStop(0,"rgba(120,90,40,.22)");wg.addColorStop(1,"rgba(120,90,40,0)");c.fillStyle=wg;c.fillRect(wx-wr,wy-wr,wr*2,wr*2)}
  if(DIRT){
    const rnd=Math.random;
    for(let i=0;i<90;i++){const wx=PX0()+rnd()*w,wy=PY0()+rnd()*h,wr=10+rnd()*40,wg=c.createRadialGradient(wx,wy,0,wx,wy,wr),dk=rnd()<.5;wg.addColorStop(0,dk?"rgba(90,58,28,.3)":"rgba(226,188,132,.28)");wg.addColorStop(1,"rgba(0,0,0,0)");c.fillStyle=wg;c.fillRect(wx-wr,wy-wr,wr*2,wr*2)}
    for(const gp of [[X0+28,H/2,95],[X1-28,H/2,95],[W/2,H/2,60],[X0+100,H/2,40],[X1-100,H/2,40]]){const wg=c.createRadialGradient(gp[0],gp[1],0,gp[0],gp[1],gp[2]);wg.addColorStop(0,"rgba(120,82,44,.5)");wg.addColorStop(1,"rgba(120,82,44,0)");c.fillStyle=wg;c.fillRect(gp[0]-gp[2],gp[1]-gp[2],gp[2]*2,gp[2]*2)}
    for(let i=0;i<1100;i++){c.fillStyle=rnd()<.5?"rgba(255,235,200,.38)":"rgba(70,45,22,.42)";c.fillRect(PX0()+rnd()*w,PY0()+rnd()*h,1+rnd()*2,1+rnd()*1.5)}
    c.strokeStyle="rgba(80,52,26,.35)";c.lineWidth=.8;for(let i=0;i<26;i++){let px=X0+rnd()*(X1-X0),py=Y0+rnd()*(Y1-Y0);c.beginPath();c.moveTo(px,py);for(let k=0;k<5;k++){px+=(rnd()-.5)*18;py+=(rnd()-.5)*18;c.lineTo(px,py)}c.stroke()}
    const tuft=(tx,ty)=>{for(let k=0;k<7;k++){c.strokeStyle=rnd()<.5?"#4f8a2e":"#3b6e22";c.lineWidth=1.1;c.beginPath();c.moveTo(tx+(rnd()-.5)*6,ty);c.lineTo(tx+(rnd()-.5)*9,ty-3-rnd()*5);c.stroke()}};
    for(let i=0;i<280;i++){const tx=PX0()+rnd()*w,ty=PY0()+rnd()*h,inside=tx>X0&&tx<X1&&ty>Y0&&ty<Y1;if(inside&&rnd()<.85)continue;tuft(tx,ty)}
  }
  if(PREF.stadium==="aberto"){
    const mx=SMX(),my=SMY(),ox0=X0-mx+8,ox1=X1+mx-8,oy0=Y0-my+8,oy1=Y1+96,ix0=X0-48,ix1=X1+48,iy0=Y0-48,iy1=Y1+48;
    const rrect=(x0,y0,x1,y1,r)=>{c.beginPath();c.moveTo(x0+r,y0);c.lineTo(x1-r,y0);c.quadraticCurveTo(x1,y0,x1,y0+r);c.lineTo(x1,y1-r);c.quadraticCurveTo(x1,y1,x1-r,y1);c.lineTo(x0+r,y1);c.quadraticCurveTo(x0,y1,x0,y1-r);c.lineTo(x0,y0+r);c.quadraticCurveTo(x0,y0,x0+r,y0);c.closePath()};
    rrect(ox0,oy0,ox1,oy1,60);c.fillStyle="#b4503a";c.fill();
    for(let i=0;i<900;i++){c.fillStyle="rgba("+(Math.random()<.5?"120,40,25":"210,110,80")+",.18)";c.fillRect(ox0+Math.random()*(ox1-ox0),oy0+Math.random()*(oy1-oy0),2,2)}
    c.strokeStyle="rgba(255,255,255,.75)";c.lineWidth=1.3;
    for(let k=0;k<=4;k++){const t=k/4;rrect(ix0+(ox0-ix0)*t,iy0+(oy0-iy0)*t,ix1+(ox1-ix1)*t,iy1+(oy1-iy1)*t,28+32*t);c.stroke()}
    rrect(ix0,iy0,ix1,iy1,28);c.fillStyle="#4c9a31";c.fill();c.strokeStyle="rgba(255,255,255,.9)";c.lineWidth=2;c.stroke()
    ;for(let i=-6;i<20;i++){c.fillStyle=(i+20)%2?"rgba(255,255,255,.06)":"rgba(0,0,0,.05)";c.save();rrect(ix0,iy0,ix1,iy1,28);c.clip();c.fillRect(X0+i*((X1-X0)/14),iy0,(X1-X0)/14,iy1-iy0);c.restore()}
  }
  {const vg=c.createRadialGradient(W/2,H/2,330,W/2,H/2,780);vg.addColorStop(0,"rgba(0,0,0,0)");vg.addColorStop(1,DIRT?"rgba(45,25,6,.32)":"rgba(0,10,0,.38)");c.fillStyle=vg;c.fillRect(PX0(),PY0(),w,h)}
  {const dayS=PREF.daytime==="day",a0=dayS?.5:.34,dd=dayS?90:64,gx=PX0(),gy=PY0();
   let g1=c.createLinearGradient(0,gy,0,gy+dd);g1.addColorStop(0,"rgba(0,10,0,"+a0+")");g1.addColorStop(1,"rgba(0,10,0,0)");c.fillStyle=g1;c.fillRect(gx,gy,w,dd);
   let g2=c.createLinearGradient(gx,0,gx+dd*.8,0);g2.addColorStop(0,"rgba(0,10,0,"+a0+")");g2.addColorStop(1,"rgba(0,10,0,0)");c.fillStyle=g2;c.fillRect(gx,gy,dd*.8,h);
   let g3=c.createLinearGradient(gx+w,0,gx+w-dd*.8,0);g3.addColorStop(0,"rgba(0,10,0,"+a0+")");g3.addColorStop(1,"rgba(0,10,0,0)");c.fillStyle=g3;c.fillRect(gx+w-dd*.8,gy,dd*.8,h)}
  c.strokeStyle="rgba(255,255,255,.9)";c.fillStyle="rgba(255,255,255,.92)";c.lineWidth=2.6;c.lineJoin="round";
  c.strokeRect(X0,Y0,X1-X0,Y1-Y0);
  c.beginPath();c.moveTo(W/2,Y0);c.lineTo(W/2,Y1);c.stroke();
  c.beginPath();c.arc(W/2,H/2,62,0,Math.PI*2);c.stroke();
  c.beginPath();c.arc(W/2,H/2,3,0,Math.PI*2);c.fill();
  for(const s of [0,1]){
    const gx=s?X1:X0,d=s?-1:1;
    c.strokeRect(s?X1-140:X0,H/2-160,140,320);c.strokeRect(s?X1-48:X0,H/2-90,48,180);
    c.beginPath();c.arc(gx+d*100,H/2,3,0,Math.PI*2);c.fill();
    const a=Math.acos(40/62);c.beginPath();if(s)c.arc(X1-100,H/2,62,Math.PI-a,Math.PI+a);else c.arc(X0+100,H/2,62,-a,a);c.stroke();
  }
  for(const [x,y,a0] of [[X0,Y0,0],[X1,Y0,Math.PI/2],[X1,Y1,Math.PI],[X0,Y1,-Math.PI/2]]){c.beginPath();c.arc(x,y,10,a0,a0+Math.PI/2);c.stroke()}
  return tex(cv,{mip:true,aniso});
}

/* ---------- rede das balizas ---------- */
function netTexture(){const c=mkCanvas(128,128),q=c.getContext("2d");q.clearRect(0,0,128,128);q.strokeStyle="rgba(255,255,255,.85)";q.lineWidth=5;q.strokeRect(0,0,128,128);const t=tex(c);t.wrapS=t.wrapT=T.RepeatWrapping;return t}
function makeGoal(s,netMap){
  const gx=s?X1:X0,d=s?1:-1,GZ=36.6,BZ=30,DP=26,root=new T.Group();root.position.set(gx,0,0);
  const net=new T.Group();root.add(net);
  const mat=new T.MeshBasicMaterial({map:netMap.clone(),transparent:true,opacity:.34,side:T.DoubleSide,depthWrite:false});
  mat.map.needsUpdate=true;
  const gh=GY1-GY0,cy=(GY0+GY1)/2;
  // fundo
  const back=new T.Mesh(new T.PlaneGeometry(gh,BZ),mat.clone());back.material.map=netMap.clone();back.material.map.repeat.set(gh/12.5,BZ/5);back.material.map.needsUpdate=true;
  back.rotation.y=Math.PI/2;back.position.set(d*DP,BZ/2,cy);net.add(back);
  // topo (da barra ao fundo)
  {const geo=new T.BufferGeometry(),rx=gh/12.5,ry=Math.hypot(DP,GZ-BZ)/6;
   geo.setAttribute("position",new T.BufferAttribute(new Float32Array([0,GZ,GY0, d*DP,BZ,GY0, d*DP,BZ,GY1, 0,GZ,GY1]),3));
   geo.setAttribute("uv",new T.BufferAttribute(new Float32Array([0,0, 0,ry, rx,ry, rx,0]),2));geo.setIndex([0,1,2, 0,2,3]);
   const m=new T.Mesh(geo,mat.clone());m.material.map=netMap.clone();m.material.map.needsUpdate=true;net.add(m)}
  // laterais
  for(const sy of [GY0,GY1]){
    const side=new T.Mesh(new T.PlaneGeometry(DP,GZ),mat.clone());side.material.map=netMap.clone();side.material.map.repeat.set(DP/6,GZ/6);side.material.map.needsUpdate=true;
    side.position.set(d*DP/2,GZ/2,sy);net.add(side);
  }
  // postes e barra
  const frame=new T.MeshBasicMaterial({color:0xffffff});
  const post=(y)=>{const m=new T.Mesh(new T.CylinderGeometry(1.1,1.1,GZ,8),frame);m.position.set(0,GZ/2,y);root.add(m)};
  post(GY0);post(GY1);
  const bar=new T.Mesh(new T.CylinderGeometry(1.1,1.1,gh,8),frame);bar.rotation.x=Math.PI/2;bar.position.set(0,GZ,cy);root.add(bar);
  root.userData.net=net;root.userData.d=d;
  net.traverse(o=>{if(o.isMesh)o.renderOrder=1});
  return root;
}

/* ---------- jogadores 3D articulados (corpo com proporções reais, camisola com textura, sombras) ---------- */
const GEOS={};
function G3(name,make){return GEOS[name]||(GEOS[name]=make())}
const cyl=(a,b,h,s)=>new T.CylinderGeometry(a,b,h,s||12,1);
function lam(color,extra){return new T.MeshLambertMaterial(Object.assign({color},extra||{}))}
function m3(geo,mat,x,y,z){const m=new T.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);m.castShadow=true;return m}
function shirtCanvas(look){
  const cv=mkCanvas(512,128),c=cv.getContext("2d"),k=look.kit;
  c.fillStyle=k.shirt;c.fillRect(0,0,512,128);
  c.fillStyle=k.accent;
  const poly=(pts,dx)=>{c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0]+dx,p[1]):c.moveTo(p[0]+dx,p[1]));c.closePath();c.fill()};
  if(!look.gk&&!look.ref)switch(k.pattern){
    case 1:for(let i=0;i<16;i+=2)c.fillRect(i*32+16,0,32,128);break;
    case 2:c.fillRect(0,0,38,128);c.fillRect(474,0,38,128);c.fillRect(218,0,76,128);break;
    case 3:c.fillRect(0,52,512,24);break;
    case 4:for(const dx of [0,512])poly([[-70,0],[-14,0],[72,128],[16,128]],dx);break;
    case 5:for(const dx of [0,512])poly([[-80,8],[-14,0],[82,120],[14,128]],dx);break;
    case 6:for(const x of [-16,10,240,266,496])c.fillRect(x+256*0,0,6,128);break;
    case 7:c.save();c.globalAlpha=.5;for(let i=-128;i<640;i+=14){c.fillRect(i,0,5,128)}c.restore();break;
  }
  // gola, bainha e sombreado de pregas
  c.fillStyle=look.ref?"#e8c61b":k.trim;c.fillRect(0,0,512,9);
  for(const dx of [0,512]){c.beginPath();c.moveTo(-20+dx,0);c.lineTo(20+dx,0);c.lineTo(dx,30);c.closePath();c.fill()}
  c.fillStyle="rgba(0,0,0,.18)";c.fillRect(0,118,512,10);
  const fg=c.createLinearGradient(0,0,0,128);fg.addColorStop(0,"rgba(255,255,255,.07)");fg.addColorStop(1,"rgba(0,0,0,.08)");c.fillStyle=fg;c.fillRect(0,0,512,128);
  for(let i=0;i<24;i++){c.fillStyle="rgba(0,0,0,.035)";c.fillRect(Math.random()*512,10,1.5+Math.random()*3,108)}
  // costas: nome e número
  const lum=(h)=>parseInt(h.slice(1,3),16)*.3+parseInt(h.slice(3,5),16)*.59+parseInt(h.slice(5,7),16)*.11;
  const baseCol=(k.pattern===2||k.pattern===1||look.ref)?(look.ref?"#16181b":k.shirt):k.shirt;
  c.fillStyle=lum(baseCol)>150?"#111":"#fff";if(k.pattern===2||k.pattern===1){c.fillStyle=lum(k.accent)>150&&k.pattern===2?"#111":(lum(k.shirt)>150?"#111":"#fff")}
  c.textAlign="center";c.textBaseline="middle";
  if(look.name){c.font="700 15px 'Barlow Condensed','Arial Narrow',sans-serif";c.fillText(String(look.name).toUpperCase().slice(0,12),256,30)}
  if(look.num!==""&&look.num!=null){c.font="800 62px 'Barlow Condensed','Arial Narrow',sans-serif";c.fillText(String(look.num),256,76)}
  return cv;
}
function crestCanvas(look){
  const cv=mkCanvas(64,64),c=cv.getContext("2d"),img=(typeof kitCrests!=="undefined")&&kitCrests[look.code];
  if(img&&img.complete&&img.naturalWidth){c.drawImage(img,2,2,60,60);look.crestOK=true}else{c.fillStyle=look.kit.accent;c.beginPath();c.arc(32,32,28,0,Math.PI*2);c.fill();c.strokeStyle=look.kit.trim;c.lineWidth=5;c.stroke();look.crestOK=false}
  return cv;
}
function makeHuman(){
  const h={yaw:null,key:"",bornAt:Math.random()*6};
  const mats=h.mats={shirt:new T.MeshLambertMaterial({color:0xffffff}),sleeve:lam(0xffffff),shorts:lam(0xffffff),sock:lam(0xffffff),trim:lam(0xffffff),skin:lam(0xb87a52),hair:lam(0x111111),glove:lam(0xf2f2f2),boot:lam(0x0b0b0e),sole:lam(0xf0f0f0),eye:lam(0x120c08)};
  const root=h.root=new T.Group(),body=h.body=new T.Group();root.add(body);
  const hips=h.hips=new T.Group();hips.position.y=13.8;body.add(hips);
  const pelvis=m3(G3("pelvis",()=>cyl(2.95,3.25,3.5,16)),mats.shorts,0,-.9,0);pelvis.scale.z=.64;hips.add(pelvis);
  const spine=h.spine=new T.Group();hips.add(spine);
  const torso=h.torso=m3(G3("torso",()=>cyl(3.75,2.95,9.2,20)),mats.shirt,0,4.9,0);torso.scale.z=.6;spine.add(torso);
  // emblema no peito (só visível de frente)
  const crest=h.crest=new T.Mesh(new T.CircleGeometry(.95,16),new T.MeshBasicMaterial({transparent:true,side:T.FrontSide,depthWrite:false}));crest.position.set(-1.85,7.1,2.06);crest.renderOrder=2;spine.add(crest);
  const neck=m3(G3("neck",()=>cyl(.95,1.05,1.5,10)),mats.skin,0,9.9,0);spine.add(neck);
  const head=h.head=new T.Group();head.position.y=12.1;spine.add(head);
  const skull=m3(G3("head",()=>new T.SphereGeometry(2.2,20,16)),mats.skin);skull.scale.set(1,1.1,1.02);head.add(skull);
  for(const sd of [-1,1]){const ear=m3(G3("ear",()=>new T.SphereGeometry(.5,8,6)),mats.skin,sd*2.18,-.1,-.1);ear.scale.z=.6;head.add(ear);
    const eye=m3(G3("eye",()=>new T.SphereGeometry(.27,8,6)),mats.eye,sd*.85,.35,1.98);eye.castShadow=false;head.add(eye)}
  const nose=m3(G3("nose",()=>new T.SphereGeometry(.38,8,6)),mats.skin,0,-.25,2.18);nose.castShadow=false;head.add(nose);
  h.hairGroup=new T.Group();head.add(h.hairGroup);h.beard=m3(G3("beard",()=>new T.SphereGeometry(1.7,14,10)),mats.hair,0,-1.15,.5);h.beard.scale.set(1.05,.62,.95);h.beard.castShadow=false;head.add(h.beard);
  // braços
  h.arm=[];
  for(const sd of [-1,1]){
    const sh=new T.Group();sh.position.set(sd*4.2,8.7,0);spine.add(sh);
    sh.add(m3(G3("shoulder",()=>new T.SphereGeometry(1.5,12,10)),mats.sleeve));
    sh.add(m3(G3("upperArm",()=>cyl(1.28,1.12,4.4,10)),mats.sleeve,0,-2.2,0));
    const el=new T.Group();el.position.y=-4.4;sh.add(el);
    el.add(m3(G3("forearm",()=>cyl(1.0,.85,4.2,10)),mats.skin,0,-2.1,0));
    const hand=m3(G3("hand",()=>new T.SphereGeometry(.98,10,8)),mats.skin,0,-4.35,0);el.add(hand);h.arm.push({sh,el,hand,sd});
  }
  // pernas
  h.leg=[];
  for(const sd of [-1,1]){
    const hp=new T.Group();hp.position.set(sd*1.75,-1.2,0);hips.add(hp);
    hp.add(m3(G3("thigh",()=>cyl(2.05,1.75,4.6,12)),mats.shorts,0,-2.3,0));
    hp.add(m3(G3("thighSkin",()=>cyl(1.55,1.45,2.4,10)),mats.skin,0,-5.4,0));
    const kn=new T.Group();kn.position.y=-6.4;hp.add(kn);
    kn.add(m3(G3("shin",()=>cyl(1.32,1.08,5.5,10)),mats.sock,0,-2.75,0));
    const band=m3(G3("band",()=>cyl(1.36,1.36,.9,10)),mats.trim,0,-1.15,0);kn.add(band);
    const an=new T.Group();an.position.y=-5.6;kn.add(an);
    an.add(m3(G3("boot",()=>new T.BoxGeometry(2.1,1.35,4.4)),mats.boot,0,-.55,1.05));
    an.add(m3(G3("toe",()=>new T.SphereGeometry(1.06,10,8)),mats.boot,0,-.5,3.0));
    const sole=m3(G3("sole",()=>new T.BoxGeometry(2.15,.28,4.7)),mats.sole,0,-1.18,1.2);sole.castShadow=false;an.add(sole);
    h.leg.push({hp,kn,an,sd,band});
  }
  return h;
}
function lookHair(h,style,hairCol,trim){
  const g=h.hairGroup;while(g.children.length)g.remove(g.children[0]);
  h.mats.hair.color.set(hairCol);
  const add=(geo,x,y,z,sx,sy,sz)=>{const m=m3(geo,h.mats.hair,x,y,z);if(sx)m.scale.set(sx,sy,sz);m.castShadow=false;g.add(m);return m};
  switch(style){
    case 1:add(G3("afro",()=>new T.SphereGeometry(3.15,16,12)),0,1.0,-.55);break;
    case 2:add(G3("buzz",()=>new T.SphereGeometry(2.27,16,12)),0,.18,-.2,1,1.08,1);break;
    case 3:add(G3("hair0",()=>new T.SphereGeometry(2.36,16,12)),0,.4,-.4,1,1.08,1);for(const x of [-1.6,-.55,.55,1.6]){const b=add(G3("braid",()=>cyl(.36,.3,3.4,6)),x,-1.2,-2.0);b.rotation.x=.2}break;
    case 4:add(G3("buzz",()=>new T.SphereGeometry(2.27,16,12)),0,.18,-.2,1,1.08,1);break;
    case 5:add(G3("hair0",()=>new T.SphereGeometry(2.36,16,12)),0,.4,-.4,1,1.08,1);{const band=new T.Mesh(G3("hband",()=>new T.TorusGeometry(2.27,.36,6,20)),lam(trim));band.rotation.x=Math.PI/2;band.position.y=.7;g.add(band)}break;
    default:add(G3("hair0",()=>new T.SphereGeometry(2.36,16,12)),0,.4,-.4,1,1.08,1);
  }
}
function setLook(h,look){
  h.lastLook=look;if(h.gl){glbLook(h,look);return}
  const k=look.kit,M=h.mats,gk=look.gk,ref=look.ref;
  M.sleeve.color.set(gk?look.gkShirt:ref?"#16181b":k.sleeve);M.shorts.color.set(gk?"#1d1d1d":ref?"#16181b":k.shorts);
  M.sock.color.set(gk?"#1d1d1d":ref?"#16181b":k.socks);M.trim.color.set(gk?"#ffffff":ref?"#e8c61b":k.trim);
  M.skin.color.set(look.skin);M.glove.color.set("#f4f4f4");
  const hands=gk?M.glove:M.skin;for(const a of h.arm)a.hand.material=hands;
  for(const l of h.leg)l.band.visible=!gk;
  const lk={kit:gk?{shirt:look.gkShirt,accent:look.gkShirt,shorts:"#1d1d1d",socks:"#1d1d1d",sleeve:look.gkShirt,trim:"#ffffff",pattern:0}:k,gk,ref,name:look.name,num:look.num};
  if(h.shirtTex)h.shirtTex.dispose();
  h.shirtTex=new T.CanvasTexture(shirtCanvas(lk));h.shirtTex.anisotropy=4;h.shirtTex.minFilter=T.LinearMipmapLinearFilter;
  h.shirtTex.offset.x=0;M.shirt.map=h.shirtTex;M.shirt.color.set(0xffffff);M.shirt.needsUpdate=true;
  if(h.crestTex)h.crestTex.dispose();
  h.crestTex=new T.CanvasTexture(crestCanvas(look));h.crest.material.map=h.crestTex;h.crest.material.needsUpdate=true;h.crest.visible=!ref&&!gk;h.crestWait=!look.crestOK;h.crestLook=look;
  lookHair(h,ref?2:look.hairStyle,look.hairCol,look.kit.trim);
  h.beard.visible=!!look.beard&&!ref;
}
const lerpAng=(a,b,t)=>{let d=Math.atan2(Math.sin(b-a),Math.cos(b-a));return a+d*t};
const sstep=x=>x<=0?0:x>=1?1:x*x*(3-2*x);
/* ---------- cenários 3D (.glb): Estádio Nacional do Imbondeiro e Campo do Bairro ---------- */
const GST={
  imbondeiro:{file:"modelos/cenarios/estadio.glb",L:[105,68],state:"idle",cbs:[]},
  bairro:{file:"modelos/cenarios/campo_bairro.glb",L:[60,38],state:"idle",cbs:[],dirt:true},
  classico:{file:"modelos/cenarios/estadio_classico.glb",L:[105,68],state:"idle",cbs:[]},
  azul:{file:"modelos/cenarios/estadio_azul.glb",L:[105,68],state:"idle",cbs:[]},
  marcal:{file:"modelos/cenarios/pelado_marcal.glb",L:[90,56],state:"idle",cbs:[],dirt:true}
};
const gstS=v=>v<=.0031308?v*12.92:1.055*Math.pow(v,1/2.4)-.055;
function gstLoad(id,cb){
  const g=GST[id];if(!g||!T.GLTFLoader){return}
  if(g.state==="ready"){cb&&cb();return}
  if(g.state==="off")return;
  if(cb)g.cbs.push(cb);
  if(g.state==="loading")return;
  g.state="loading";
  new T.GLTFLoader().load(g.file,function(gltf){
    try{gstPrep(g,gltf);g.gltf=gltf;g.state="ready"}catch(e){g.state="off";console.warn("Cenário 3D indisponível:",e&&e.message);return}
    const l=g.cbs.splice(0);l.forEach(f=>{try{f()}catch(e){console.warn(e)}});
  },undefined,function(e){g.state="off";console.warn("Cenário 3D indisponível, a usar o desenhado por código:",e&&e.message);g.cbs.splice(0).forEach(f=>{try{f()}catch(x){}})});
}
/* o r128 trabalha em espaço "gama": cores e vertex colors convertidas de linear para sRGB, texturas sem decodificar */
function gstPrep(g,gltf){
  const json=gltf.parser.json,assoc=gltf.parser.associations,mats=new Set(),geos=new Set();
  g.emis=[];g.papeis={};g.spots=[];g.teamMats={casa:{},visitante:{}};g.fixed=[];
  gltf.scene.traverse(function(o){
    if(o.isSpotLight){o.castShadow=false;g.spots.push(o)}
    if(!(o.isMesh||o.isPoints))return;
    o.castShadow=false;o.receiveShadow=false;
    if(o.isPoints){o.visible=false;if(o.name==='Adeptos_Lugares'||(o.parent&&o.parent.name==='Adeptos_Lugares')){const ge=o.geometry;g.lugares={tipo:'pontos',total:ge.attributes.position.count,posicoes:ge.attributes.position.array,direccoes:ge.attributes.normal?ge.attributes.normal.array:null,sectores:ge.attributes.color?ge.attributes.color.array:null}}return}
    if(!/Bandeira|Bandeirola|Lona|Faixa/.test(o.name)){o.updateMatrix();o.matrixAutoUpdate=false}
    const ms=Array.isArray(o.material)?o.material:[o.material];
    for(const m of ms){
      if(mats.has(m))continue;mats.add(m);
      if(m.color)m.color.convertLinearToSRGB();
      if(m.emissive)m.emissive.convertLinearToSRGB();
      for(const k of ["map","emissiveMap"])if(m[k])m[k].colorSpace=T.NoColorSpace;
      m.userData.emBase=m.emissiveIntensity!==undefined?m.emissiveIntensity:1;
      if(m.emissiveIntensity!==undefined){
        if(m.userData.noite==="emissiva"){g.emis.push(m);m.emissiveIntensity=0}else m.emissiveIntensity=m.userData.emBase;
      }
      if(m.metalness!==undefined){m.metalness=Math.min(m.metalness,.2);m.roughness=Math.max(m.roughness,.55)}
      const u=m.userData;if(u&&u.equipa&&u.papel&&g.teamMats[u.equipa])g.teamMats[u.equipa][u.papel]=m;
      else if(u&&(u.papel==="ecra"||u.papel==="publicidade"))(g.papeis[u.papel]=g.papeis[u.papel]||[]).push(m);
    }
    const geo=o.geometry,col=geo&&geo.attributes.color;
    if(col&&!geos.has(geo)){
      geos.add(geo);
      if(col.array instanceof Float32Array){const ar=col.array,n=col.itemSize;for(let i=0;i<ar.length;i+=n){ar[i]=gstS(ar[i]);ar[i+1]=gstS(ar[i+1]);ar[i+2]=gstS(ar[i+2])}col.needsUpdate=true}
    }
  });
  if(!g.lugares){const nl=gltf.scene.getObjectByName('Adeptos_Lugares');if(nl&&nl.userData)g.lugares=Object.assign({tipo:'listas'},nl.userData)}
  g.night=gltf.scene.getObjectByName("Iluminacao_Noite");
  g.moon=new T.HemisphereLight(0x8fa4d6,0x3a2a1c,id0(g)==="imbondeiro"?.22:.3);g.moon.visible=false;gltf.scene.add(g.moon);
  for(const n of ["Balizas","Linhas_Campo","Linhas_Cal","Colisoes","Marcadores","FX"]){const o=gltf.scene.getObjectByName(n);if(o)o.visible=false}
  g.mixer=new T.AnimationMixer(gltf.scene);
  gltf.animations.forEach(c=>{const a=g.mixer.clipAction(c);a.setLoop(T.LoopRepeat,Infinity);a.play()});
  g.emblems={};
}
const id0=g=>g.dirt?"bairro":"imbondeiro";
function gstEmblem(g,role,code){
  const m=g.teamMats[role==="casa"?"casa":"visitante"].emblema,id=GLBM.TEAM[code];if(!m||!id)return;
  const t=g.emblems[id]||(g.emblems[id]=(function(){const x=new T.TextureLoader().load("modelos/emblemas/"+id+".png");x.flipY=false;x.colorSpace=T.NoColorSpace;x.wrapS=x.wrapT=T.ClampToEdgeWrapping;x.anisotropy=4;return x})());
  m.map=t;m.needsUpdate=true;
}
function gstTeams(g){
  const col=gstColors();
  const set=(role,team,c1,c2)=>{const k=kitOf(team),m=g.teamMats[role].cor_primaria,m2=g.teamMats[role].cor_secundaria;
    if(m){m.color.set(c1||k.shirt);m.needsUpdate=true}if(m2){m2.color.set(c2||k.accent||k.shorts||"#ffffff");m2.needsUpdate=true}
    gstEmblem(g,role,G.teams[team].s)};
  set("casa",0,col&&col.homeTeamPrimaryColor,col&&col.homeTeamSecondaryColor);set("visitante",1,col&&col.awayTeamPrimaryColor,col&&col.awayTeamSecondaryColor);
}
function gstNight(g,on){
  if(g.night)g.night.visible=on;g.moon.visible=on;
  for(const m of g.emis){m.emissiveIntensity=on?m.userData.emBase:0;m.needsUpdate=true}
  const isB=!!g.dirt;
  for(const l of g.spots){l.intensity=on?(isB?.2:.15):0;l.distance=0;l.decay=0}
}
function gstTex(g,papel,tex){tex.colorSpace=T.NoColorSpace;tex.flipY=false;tex.anisotropy=4;tex.wrapS=tex.wrapT=T.RepeatWrapping;for(const m of g.papeis[papel]||[]){m.map=tex;m.emissiveMap=tex;m.needsUpdate=true}}
function gstScreens(S,g){
  S.ecra=null;
  if(g.papeis.publicidade){
    const cv=mkCanvas(2048,128),c=cv.getContext("2d"),ads=[["GIRABOLA 94","#151515","#f2b705"],[G.stadium.toUpperCase(),"#0f2c5c","#ffffff"],["BOLA NO PÉ","#c8102e","#ffffff"],["FUTEBOL ANGOLANO","#1f8a4c","#ffffff"],["JOGO LIMPO","#f2b705","#151515"]],w=2048/ads.length;
    c.textAlign="center";c.textBaseline="middle";c.font="700 64px 'Barlow Condensed',Arial Narrow,sans-serif";
    ads.forEach((a,i)=>{c.fillStyle=a[1];c.fillRect(i*w,0,w,128);c.fillStyle=a[2];c.fillText(a[0],i*w+w/2,68)});
    gstTex(g,"publicidade",new T.CanvasTexture(cv));
  }
  if(g.papeis.ecra){const cv=mkCanvas(1024,448);S.ecra={cv:cv,tex:new T.CanvasTexture(cv),sig:"",t:0};gstTex(g,"ecra",S.ecra.tex);gstDrawScreen(S)}
}
function gstDrawScreen(S){
  const e=S.ecra;if(!e||!G)return;
  const sig=G.score[0]+"-"+G.score[1]+"|"+minute()+"|"+G.state;if(sig===e.sig)return;e.sig=sig;
  const c=e.cv.getContext("2d"),W2=1024,H2=448,gr=c.createLinearGradient(0,0,0,H2);gr.addColorStop(0,"#0b1f3d");gr.addColorStop(1,"#050d1c");
  c.fillStyle=gr;c.fillRect(0,0,W2,H2);c.fillStyle="#f2b705";c.fillRect(0,0,W2,14);c.fillRect(0,H2-14,W2,14);
  c.textAlign="center";c.textBaseline="middle";c.fillStyle="#ffffff";
  c.font="700 54px 'Barlow Condensed',Arial Narrow,sans-serif";c.fillText("GIRABOLA 94",W2/2,62);
  c.font="800 150px 'Barlow Condensed',Arial Narrow,sans-serif";c.fillText(G.score[0]+" - "+G.score[1],W2/2,215);
  c.font="700 72px 'Barlow Condensed',Arial Narrow,sans-serif";c.fillStyle="#f2b705";c.fillText(G.teams[0].s,W2*.2,215);c.fillText(G.teams[1].s,W2*.8,215);
  c.fillStyle="#ffffff";c.font="700 64px 'Barlow Condensed',Arial Narrow,sans-serif";c.fillText(minute()+"'",W2/2,335);
  c.font="600 34px 'Barlow Condensed',Arial Narrow,sans-serif";c.fillStyle="#9fb6d4";c.fillText(G.stadium,W2/2,396);
  e.tex.needsUpdate=true;
}
/* linhas do jogo por cima do relvado do cenário (as marcações seguem as regras do jogo) */
function gstLines(S,bairro){
  const M=24,x0=X0-M,y0=Y0-M,w=X1-X0+2*M,h=Y1-Y0+2*M,sc=2,cv=mkCanvas(Math.round(w*sc),Math.round(h*sc)),c=cv.getContext("2d");
  c.scale(sc,sc);c.translate(-x0,-y0);
  c.strokeStyle=bairro?"rgba(250,243,226,.78)":"rgba(255,255,255,.92)";c.fillStyle=c.strokeStyle;c.lineWidth=bairro?3.2:2.6;c.lineJoin="round";
  c.strokeRect(X0,Y0,X1-X0,Y1-Y0);
  c.beginPath();c.moveTo(W/2,Y0);c.lineTo(W/2,Y1);c.stroke();
  c.beginPath();c.arc(W/2,H/2,62,0,Math.PI*2);c.stroke();
  c.beginPath();c.arc(W/2,H/2,3,0,Math.PI*2);c.fill();
  for(const s of [0,1]){
    const gx=s?X1:X0,d=s?-1:1;
    c.strokeRect(s?X1-140:X0,H/2-160,140,320);c.strokeRect(s?X1-48:X0,H/2-90,48,180);
    c.beginPath();c.arc(gx+d*100,H/2,3,0,Math.PI*2);c.fill();
    const a=Math.acos(40/62);c.beginPath();if(s)c.arc(X1-100,H/2,62,Math.PI-a,Math.PI+a);else c.arc(X0+100,H/2,62,-a,a);c.stroke();
  }
  for(const [x,y,a0] of [[X0,Y0,0],[X1,Y0,Math.PI/2],[X1,Y1,Math.PI],[X0,Y1,-Math.PI/2]]){c.beginPath();c.arc(x,y,10,a0,a0+Math.PI/2);c.stroke()}
  const t=new T.CanvasTexture(cv);t.anisotropy=Math.min(8,R.gl.capabilities.getMaxAnisotropy());t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;
  const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  m.rotation.x=-Math.PI/2;m.position.set(x0+w/2,.35,y0+h/2);m.renderOrder=.2;
  return m;
}
/* troca o cenário desenhado por código pelo .glb escolhido (se estiver carregado) */
function gstApply(S){
  const id=PREF.stadium,g=GST[id];if(!g||!S||S.gst===id)return;
  if(g.state==="idle"||g.state==="loading"){gstLoad(id,function(){if(R.S===S)gstApply(S)});return}
  if(g.state!=="ready")return;
  const DAY=PREF.daytime==="day",sc=S.scene,root=g.gltf.scene;
  (S.proc||[]).forEach(o=>sc.remove(o));S.proc=[];
  S.pitch.visible=false;
  const sx=(X1-X0)/g.L[0],sz=(Y1-Y0)/g.L[1],sy=Math.sqrt(sx*sz);
  root.scale.set(sx,sy,sz);root.position.set(W/2,0,H/2);root.visible=true;
  sc.add(root);
  S.gstLines=gstLines(S,!!g.dirt);sc.add(S.gstLines);
  sc.background=new T.Color(DAY?0xbfe0f7:0x05080e);sc.fog=null;S.cam.far=14000;
  if(S.sun){S.sun.intensity=DAY?.8:.15}
  sc.children.forEach(o=>{if(o.isHemisphereLight&&o!==g.moon)o.intensity=DAY?.95:.2});
  gstTeams(g);gstNight(g,!DAY);
  S.gst=id;S.gstG=g;gstCrowdInit(S,g);gstScreens(S,g);
  try{if(window.gstAfter)window.gstAfter(S,g)}catch(e){console.warn(e)}
}

/* ---------- adeptos nas bancadas (multidao.js adaptado ao r128) ---------- */
function crowdQuality(){
  const c=PREF.crowd||"auto";
  if(c==="off")return null;if(c==="low")return"baixa";if(c==="med")return"media";if(c==="high")return"alta";
  return({high:"media",medium:"baixa",low:null})[PREF.quality||"high"];
}
function gstColors(){
  const M=window.GirabolaMultidao;if(!M)return null;
  const a=GLBM.TEAM[G.teams[0].s]||"petro_luanda",b=GLBM.TEAM[G.teams[1].s]||"kabuscorp";
  return M.coresDoJogo(a,b);
}
const CROWDC={};
function gstCrowdGet(g,cb){
  const q=crowdQuality();if(!q||!window.GirabolaMultidao||!g.lugares){cb(null);return}
  const key=PREF.stadium+"|"+q;
  let c=CROWDC[key];
  if(c&&c.m){cb(c);return}
  if(c&&c.failed){cb(null);return}
  if(c&&c.loading){c.cbs.push(cb);return}
  c=CROWDC[key]={loading:true,cbs:[cb]};
  const grp=new T.Group();grp.name="Adeptos";
  window.GirabolaMultidao.criarMultidao(null,"modelos/cenarios/adeptos.glb",g.lugares,{qualidade:q,grupo:grp}).then(function(m){
    c.m=m;c.grp=grp;c.loading=false;c.cbs.splice(0).forEach(f=>f(c));
  }).catch(function(e){console.warn("Adeptos indisponíveis:",e&&e.message);c.loading=false;c.failed=true;c.cbs.splice(0).forEach(f=>f(null))});
}
function gstCrowdInit(S,g){
  S.crowd=null;const root=g.gltf.scene;
  gstCrowdGet(g,function(c){
    if(!c||R.S!==S)return;
    c.grp.scale.copy(root.scale);c.grp.position.copy(root.position);S.scene.add(c.grp);c.grp.updateMatrixWorld(true);
    const col=gstColors();if(col)c.m.definirEquipas(col);
    c.m.evento("calma");S.crowd=c.m;S.crowdT=0;
  });
}
/* tudo o que o jogo vai mostrar é carregado antes de entrar em campo (nada de gráficos "antigos" no arranque) */
window.gstPreload=function(o,done){
  let fin=false;const finish=function(){if(!fin){fin=true;done()}};
  setTimeout(finish,25000);
  const P=[];
  P.push(new Promise(function(res){glbLoad();const w=function(){GLBM.state==="ready"||GLBM.state==="off"?res():setTimeout(w,80)};w()}));
  const id=PREF.stadium,g=GST[id];
  if(g)P.push(new Promise(function(res){gstLoad(id,function(){res()});const w=function(){g.state==="off"?res():(g.state==="ready"?0:setTimeout(w,100))};w()}).then(function(){return g.state==="ready"?new Promise(function(res){gstCrowdGet(g,function(){res()})}):0}));
  const bd=gballDesign();if(bd)P.push(new Promise(function(res){gballLoad(bd,function(){res()});const e=BALLG.cache[bd];const w=function(){e&&e.state==="off"?res():(e&&e.state==="ready"?0:setTimeout(w,100))};w()}));
  if(o&&o.L!=null&&o.R!=null)for(const t of [o.L,o.R]){const tid=GLBM.TEAM[TEAMS[t].s];if(!tid)continue;for(const u of ["modelos/equipas/"+tid+".jpg","modelos/equipas/num_"+tid+".png"])P.push(new Promise(function(res){const im=new Image();im.onload=im.onerror=function(){res()};im.src=u}))}
  Promise.all(P).then(finish,finish);
};
function gstCrowdTick(S,dt){
  const m=S.crowd;if(!m)return;
  m.update(Math.min(dt||.016,.1),S.cam);
  S.crowdT=(S.crowdT||0)+dt;
  const b=G&&G.ball;
  if(S.crowdT>6&&G.state==="play"&&b&&b.owner){
    const t=b.owner.team,att=sd(t)===0?b.x>X1-230:b.x<X0+230;
    if(att){S.crowdT=0;m.evento(t===0?"ataque_casa":"ataque_visitante")}
  }
}
window.gstCrowdEvent=function(kind,team){
  const S=R&&R.S,m=S&&S.crowd;if(!m||!G)return;
  const b=G.ball||{},tm=team!=null?team:(b.owner?b.owner.team:(b.lastTeam!=null?b.lastTeam:0)),side=t=>t===0?"casa":"visitante";
  switch(kind){
    case"goal":m.evento("golo_"+side(tm));break;
    case"shot":m.evento("ataque_"+side(tm));S.crowdT=0;break;
    case"save":case"miss":m.evento("falhanco_"+side(b.lastTeam!=null?b.lastTeam:tm));break;
    case"half":case"end":m.evento("intervalo");break;
    case"kickoff":m.evento("calma");break;
  }
};

/* ---------- bola 3D (bolas_girabola): 5 desenhos, malha com texturas PBR ---------- */
const BALLG={cache:{}};
function gballDesign(){
  const id=cosm("ball").id;
  if(id==="girassol"||id==="diamante")return null;            // bolas desbloqueadas da carreira: mantêm o desenho por código
  if(id==="rubro")return"rubro_negra";
  const p=PREF.ballDesign||"auto";
  return p==="auto"?((PREF.stadium==="bairro"||PREF.stadium==="marcal")?"classica":"rubro_negra"):p;
}
function gballLoad(d,cb){
  const c=BALLG.cache[d];
  if(c){if(c.state==="ready")cb(c);else if(c.state==="loading")c.cbs.push(cb);return}
  const e=BALLG.cache[d]={state:"loading",cbs:[cb]};
  if(!T.GLTFLoader){e.state="off";return}
  new T.GLTFLoader().load("modelos/bolas/bola_"+d+".glb",function(gltf){
    let me=null;gltf.scene.traverse(o=>{if(o.isMesh&&!me)me=o});
    if(!me){e.state="off";return}
    const k=BALL_R/0.11,geo=me.geometry.clone();geo.scale(k,k,k);
    const sm=me.material,nm=sm.normalMap,ro=sm.roughnessMap;
    for(const t of [sm.map,nm,ro])if(t){t.colorSpace=T.NoColorSpace;t.anisotropy=4}
    const mat=new T.MeshStandardMaterial({map:sm.map,normalMap:nm,roughness:.62,metalness:0,emissive:0x2a2a2a});
    e.geo=geo;e.mat=mat;e.state="ready";e.cbs.splice(0).forEach(f=>f(e));
  },undefined,function(){e.state="off";e.cbs.splice(0).forEach(f=>f(e))});
}
function gballApply(S){
  const d=gballDesign();if(S.ballDes===d)return;S.ballDes=d;
  if(!S.ballSp.userData.geo0){S.ballSp.userData.geo0=S.ballSp.geometry;S.ballSp.userData.mat0=S.ballSp.material}
  if(!d){S.ballSp.geometry=S.ballSp.userData.geo0;S.ballSp.material=S.ballSp.userData.mat0;return}
  gballLoad(d,function(e){if(e.state==='ready'&&S.ballDes===d&&R.S===S){S.ballSp.geometry=e.geo;S.ballSp.material=e.mat}});
}
/* ---------- jogadores a partir de modelos .glb (esqueleto + animações), com camisola por equipa ---------- */
const GLBM={state:"idle",proto:null,clips:{},mats:{},tex:{},H:27,
  TEAM:{PET:"petro_luanda","1AG":"primeiro_agosto",SAG:"sagrada_esperanca",WIL:"wiliete",KAB:"kabuscorp",INT:"interclube",HUI:"desportivo_huila",SSA:"sao_salvador",BRA:"bravos_maquis",LIB:"recreativo_libolo",ACA:"academica_lobito",CAA:"recreativo_caala","1MA":"estrela_1_maio",LSU:"lunda_sul",CAB:"fc_cabinda",FCL:"fc_luanda"}};
window.__GLBM=GLBM;window.__R3=()=>R;function glbLoad(){
  if(GLBM.state!=="idle")return;
  if(!T.GLTFLoader||!T.SkeletonUtils){GLBM.state="off";return}
  GLBM.state="loading";
  new T.GLTFLoader().load("modelos/jogador.glb",function(g){
    GLBM.proto=g.scene;g.animations.forEach(function(a){GLBM.clips[a.name]=a});
    const bb=new T.Box3().setFromObject(g.scene),hgt=Math.max(.5,bb.max.y-bb.min.y);
    GLBM.scale=GLBM.H/hgt;GLBM.yoff=-bb.min.y*GLBM.scale;
    GLBM.state="ready";
  },undefined,function(e){GLBM.state="off";console.warn("Modelo 3D indisponível, a usar jogadores simples:",e&&e.message)});
}
const glbReady=()=>GLBM.state==="ready";
function glbTeamTex(id){
  if(GLBM.tex[id])return GLBM.tex[id];
  const t=new T.TextureLoader().load("modelos/equipas/"+id+".jpg",function(){t.userData.ready=true;(t.userData.mats||[]).forEach(m=>{m.visible=true})});
  t.flipY=false;t.colorSpace=T.NoColorSpace;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.generateMipmaps=true;
  try{t.anisotropy=Math.min(8,R.gl.capabilities.getMaxAnisotropy())}catch(e){}
  return GLBM.tex[id]=t;
}
function glbMatSet(look){
  const code=look.code||"",id=GLBM.TEAM[code]||"petro_luanda",cu=look.kit&&look.kit.custom&&!look.ref&&!look.gk,key=look.ref?"ref":look.gk?"gk|"+code+"|"+look.gkShirt:cu?"cus|"+id+"|"+look.kit.shirt+look.kit.shorts+look.kit.socks:id;
  if(GLBM.mats[key])return GLBM.mats[key];
  const tex=glbTeamTex(id),mk=(o)=>new T.MeshLambertMaterial(Object.assign({emissive:0x1a1a1a},o)),set={};
  for(const part of ["Cabeca","Bracos","Camisola","Calcoes","Pernas","Meias","Chuteiras"])set[part]=mk({map:tex});
  if(look.kit&&look.kit.custom&&!look.ref&&!look.gk){const kk=look.kit;set.Camisola=mk({color:new T.Color(kk.shirt)});set.Calcoes=mk({color:new T.Color(kk.shorts)});set.Meias=mk({color:new T.Color(kk.socks)})}
  if(look.ref){for(const p of ["Camisola","Calcoes","Meias"])set[p]=mk({color:0x16181b});set.Meias.color.set(0x111111)}
  else if(look.gk){set.Camisola=mk({color:new T.Color(look.gkShirt||"#22c3b5")});set.Calcoes=mk({color:0x1d1d1d});set.Meias=mk({color:0x1d1d1d})}
  if(!tex.userData.ready){tex.userData.mats=tex.userData.mats||[];for(const k in set){set[k].visible=false;tex.userData.mats.push(set[k])}}
  return GLBM.mats[key]=set;
}
function attachGlb(h){
  if(h.gl||!glbReady())return;
  const root=T.SkeletonUtils.clone(GLBM.proto),grp=new T.Group();
  root.scale.setScalar(GLBM.scale);root.position.y=GLBM.yoff;grp.add(root);
  const meshes={},bones={};
  root.traverse(function(o){
    if(o.isSkinnedMesh||o.isMesh){o.frustumCulled=false;o.castShadow=true;o.receiveShadow=false;meshes[o.name]=o}
    if(o.isBone)bones[o.name]=o;
  });
  h.gl={root:grp,model:root,meshes:meshes,bones:bones,mixer:new T.AnimationMixer(root),act:{},cur:null,idle:Math.random()<.5?"Idle_Respirar":"Idle_Atento",bornAt:Math.random()*6};
  h.root.add(grp);h.body.visible=false;
  if(h.lastLook)glbLook(h,h.lastLook);
}
function glbNumTex(id){
  const k="num_"+id;if(GLBM.tex[k])return GLBM.tex[k];
  const t=new T.TextureLoader().load("modelos/equipas/num_"+id+".png");
  t.flipY=false;t.colorSpace=T.NoColorSpace;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.generateMipmaps=true;
  try{t.anisotropy=Math.min(8,R.gl.capabilities.getMaxAnisotropy())}catch(e){}
  return GLBM.tex[k]=t;
}
/* número das costas: placa "Numero" com um atlas 10x10; o deslocamento de UV escolhe o número (n%10, n/10) */
function glbNumber(h,look){
  const g=h.gl,nm=g.meshes.Numero;if(!nm)return;
  const n=Math.floor(+look.num);
  if(look.ref||!(n>=1&&n<=99)){nm.visible=false;return}
  nm.visible=true;
  const id=GLBM.TEAM[look.code||""]||"petro_luanda";
  if(!g.numMat){
    const off=new T.Vector2(),mat=new T.MeshLambertMaterial({map:glbNumTex(id),alphaTest:.5,transparent:false,side:T.DoubleSide,emissive:0x1a1a1a});
    mat.onBeforeCompile=function(sh){sh.uniforms.numOff={value:off};sh.vertexShader="uniform vec2 numOff;\n"+sh.vertexShader.replace("#include <uv_vertex>","#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv+=numOff;\n#endif")};
    mat.userData.off=off;g.numMat=mat;nm.material=mat;nm.castShadow=false;
  }
  g.numMat.map=glbNumTex(id);g.numMat.needsUpdate=true;
  g.numMat.userData.off.set((n%10)*.1,Math.floor(n/10)*.1);
}
function glbLook(h,look){
  const set=glbMatSet(look),m=h.gl.meshes;
  for(const k in m){if(set[k])m[k].material=set[k]}
  glbNumber(h,look);
}
const GL_LOOP=new Set(["Idle_Respirar","Idle_Atento","Andar","Correr","Sprint","Correr_Tras","Passo_Lateral","Conducao_Bola"]);
function glAct(h,name){
  const g=h.gl;if(g.act[name])return g.act[name];
  const clip=GLBM.clips[name];if(!clip)return null;
  const a=g.mixer.clipAction(clip);a.setLoop(GL_LOOP.has(name)?T.LoopRepeat:T.LoopOnce,Infinity);a.clampWhenFinished=true;
  return g.act[name]=a;
}
function glPlay(h,name,opt){
  const g=h.gl,a=glAct(h,name);if(!a)return null;
  if(g.cur!==name){
    const prev=g.cur?g.act[g.cur]:null;
    a.enabled=true;a.reset();a.setEffectiveWeight(1);a.play();
    if(prev)prev.crossFadeTo(a,opt&&opt.fade!=null?opt.fade:.16,false);
    g.cur=name;
  }
  return a;
}
function poseGlb(h,o,dt,time){
  const g=h.gl,tgt=Math.atan2(o.fx,o.fy);
  h.yaw=h.yaw==null?tgt:lerpAng(h.yaw,tgt,1-Math.exp(-dt*(o.slide?4:o.spd>1.4?9:12)));
  h.root.position.set(o.x,0,o.y);h.root.rotation.y=h.yaw;
  g.root.rotation.set(0,0,0);g.root.position.set(0,0,0);g.root.scale.set(1,1,1);
  const spd=o.spd,fx=o.fx,fy=o.fy,lat=(o.vx||0)*fy-(o.vy||0)*fx,fw=(o.vx||0)*fx+(o.vy||0)*fy;
  let a=null,sync=null;
  if(o.dive){a=glPlay(h,"GR_Mergulho",{fade:.08});const d=GLBM.clips.GR_Mergulho.duration;sync=Math.min(d-.02,o.dive.t/1.3*d*.85);g.root.scale.x=o.dive.side>0?-1:1}
  else if(o.jump>0){a=glPlay(h,"Salto");const d=GLBM.clips.Salto.duration;sync=Math.min(d-.02,(1-o.jump/.6)*d)}
  else if(o.down){a=glPlay(h,"Idle_Atento");g.root.rotation.x=-1.45;g.root.position.y=2.2}
  else if(o.celebrate){a=glPlay(h,"Celebracao",{fade:.12})}
  else if(o.throwIn){const nm="Lancamento_Lateral",d=GLBM.clips[nm].duration;a=glPlay(h,nm,{fade:.1});sync=o.kick>0?d*(.4+.55*(1-Math.min(1,o.kick/.65))):d*.4}
  else if(o.slide){a=glPlay(h,"Carrinho",{fade:.06});if(!g.slideT)g.slideT=0;g.slideT+=dt;sync=Math.min(GLBM.clips.Carrinho.duration-.02,g.slideT*2.4)}
  else if(o.kick>0){const nm=o.kickType==="shot"?"Remate":"Passe";a=glPlay(h,nm,{fade:.06});const d=GLBM.clips[nm].duration,p=1-Math.min(1,o.kick/.65);sync=Math.min(d-.02,p*d*.8)}
  else if(spd<.12){a=glPlay(h,o.gk&&Math.abs(lat)>.05?"Passo_Lateral":g.idle);if(a)a.timeScale=1}
  else if(o.gk&&Math.abs(lat)>Math.abs(fw)){a=glPlay(h,"Passo_Lateral");if(a)a.timeScale=Math.max(.5,Math.min(1.6,spd/1.2))}
  else if(o.sprint&&spd>1.6){a=glPlay(h,"Sprint");if(a)a.timeScale=Math.max(.7,Math.min(1.5,spd/2.7))}
  else if(spd<.9){a=glPlay(h,"Andar");if(a)a.timeScale=Math.max(.5,Math.min(1.5,spd/.55))}
  else{a=glPlay(h,o.hasBall?"Conducao_Bola":"Correr");if(a)a.timeScale=Math.max(.6,Math.min(1.6,spd/1.5))}
  if(!o.slide)g.slideT=0;
  if(a&&sync!=null){a.paused=true;a.time=Math.max(0,sync)}else if(a)a.paused=false;
  g.mixer.update(dt);
  // cabeça acompanha a bola
  const head=g.bones.Head;
  if(head&&o.lookX!=null&&spd<2.2&&!o.dive&&!o.down){
    const la=Math.atan2(o.lookX-o.x,o.lookY-o.y),rel=Math.atan2(Math.sin(la-h.yaw),Math.cos(la-h.yaw));
    h.hy=(h.hy||0)+(Math.max(-.9,Math.min(.9,rel))*.6-(h.hy||0))*Math.min(1,dt*6);head.rotateY(h.hy);
  }else h.hy=(h.hy||0)*.9;
}
function poseHuman(h,o,dt,time){
  if(h.gl)return poseGlb(h,o,dt,time);
  const R_=h.root,tgt=Math.atan2(o.fx,o.fy),sdt=Math.max(dt,.001);
  const prevYaw=h.yaw;
  h.yaw=h.yaw==null?tgt:lerpAng(h.yaw,tgt,1-Math.exp(-dt*(o.slide?4:o.spd>1.4?8:11)));
  const turn=prevYaw==null?0:Math.atan2(Math.sin(h.yaw-prevYaw),Math.cos(h.yaw-prevYaw))/sdt;
  h.turn=(h.turn||0)+(turn-(h.turn||0))*Math.min(1,dt*9);
  R_.position.set(o.x,0,o.y);R_.rotation.y=h.yaw;
  const speed=o.spd,amp=Math.min(1,speed/2.2),ph=o.run*.55,sp=o.sprint?1:0,sw=.82*amp*(1+.2*sp),s=Math.sin(ph),c=Math.cos(ph);
  // aceleração longitudinal (inclina o tronco ao arrancar e ao travar)
  const accel=h.ps==null?0:(speed-h.ps)/sdt;h.ps=speed;h.acc=(h.acc||0)+(accel-(h.acc||0))*Math.min(1,dt*6);
  const body=h.body,hips=h.hips,spine=h.spine,L=h.leg[0],Rg=h.leg[1],aL=h.arm[0],aR=h.arm[1],head=h.head;
  body.rotation.set(0,0,0);body.position.set(0,0,0);hips.rotation.set(0,0,0);hips.position.set(0,13.8,0);spine.rotation.set(0,0,0);spine.scale.y=1;
  L.hp.rotation.set(0,0,0);Rg.hp.rotation.set(0,0,0);
  // pernas: passada mais longa à frente do que atrás, pé em contacto com o calcanhar e saída em ponta
  const fwd=v=>v<0?v*1.12:v*.78;
  L.hp.rotation.x=fwd(s*sw)-.05*amp;Rg.hp.rotation.x=fwd(-s*sw)-.05*amp;
  L.kn.rotation.x=amp*(.28+1.0*Math.max(0,-c))*(1+.25*sp);Rg.kn.rotation.x=amp*(.28+1.0*Math.max(0,c))*(1+.25*sp);
  L.an.rotation.x=L.hp.rotation.x*.42-L.kn.rotation.x*.2;Rg.an.rotation.x=Rg.hp.rotation.x*.42-Rg.kn.rotation.x*.2;
  // braços em contra-balanço com cotovelo dinâmico
  aL.sh.rotation.set(-s*sw*.9,0,.1);aR.sh.rotation.set(s*sw*.9,0,-.1);
  const el=-(.4+.85*amp+.4*sp);aL.el.rotation.x=el-.28*amp*Math.max(0,s);aR.el.rotation.x=el-.28*amp*Math.max(0,-s);
  // tronco: inclinação por aceleração, torção da bacia e balanço lateral do peso
  const lean=Math.max(-.12,Math.min(.2,h.acc*.011));
  spine.rotation.x=.04+.1*amp+.07*sp+lean;
  hips.position.y=13.8-.35*amp+Math.abs(c)*.55*amp;
  hips.position.x=Math.sin(ph)*.24*amp;
  hips.rotation.y=s*.14*amp;hips.rotation.z=c*.035*amp;spine.rotation.y=-s*.18*amp;
  spine.rotation.z=-Math.max(-.3,Math.min(.3,h.turn*.04*amp));
  // cabeça acompanha a bola, com limite de pescoço
  let hyT=0;
  if(o.lookX!=null){const la=Math.atan2(o.lookX-o.x,o.lookY-o.y),rel=Math.atan2(Math.sin(la-h.yaw),Math.cos(la-h.yaw));hyT=Math.max(-1,Math.min(1,rel))*(amp>.6?.45:.9)}
  h.hy=(h.hy||0)+(hyT-(h.hy||0))*Math.min(1,dt*7);
  head.rotation.set(.1*amp,h.hy,0);
  if(amp<.06){const br=Math.sin(time*2.2+h.bornAt);spine.scale.y=1+br*.01;aL.sh.rotation.z=.16;aR.sh.rotation.z=-.16;hips.position.x=Math.sin(time*.6+h.bornAt)*.35;hips.rotation.z=Math.sin(time*.6+h.bornAt)*.03;head.rotation.y=h.hy+Math.sin(time*.7+h.bornAt)*.12}
  // guarda-redes: postura de prontidão, deslocação lateral e braços abertos
  if(o.gk){
    const fx=o.fx,fy=o.fy,lat=(o.vx||0)*fy-(o.vy||0)*fx,fw=(o.vx||0)*fx+(o.vy||0)*fy;
    const ready=amp<.35||Math.abs(lat)>Math.abs(fw);
    if(ready){aL.sh.rotation.set(-.45,0,.55);aR.sh.rotation.set(-.45,0,-.55);aL.el.rotation.x=-.7;aR.el.rotation.x=-.7;spine.rotation.x=.2;hips.position.y=12.8;
      if(Math.abs(lat)>.25){const k=Math.min(1,Math.abs(lat)/1.6),sg=Math.sin(ph*1.4);L.hp.rotation.set(.1*k,0,.2+.2*Math.max(0,sg)*k);Rg.hp.rotation.set(.1*k,0,-.2-.2*Math.max(0,-sg)*k);L.kn.rotation.x=.4;Rg.kn.rotation.x=.4;L.an.rotation.x=Rg.an.rotation.x=0}
      else{L.hp.rotation.set(.12,0,.1);Rg.hp.rotation.set(-.12,0,-.1);L.kn.rotation.x=.3;Rg.kn.rotation.x=.3;L.an.rotation.x=Rg.an.rotation.x=0}}
  }
  // remate: recuo, passada com perna de apoio fletida e braços em equilíbrio
  if(o.kick>0){const tk=1-Math.min(1,o.kick/.65),a=tk<.32?.9+(-1.75-.9)*sstep(tk/.32):-1.75+(-.25+1.75)*sstep((tk-.32)/.68),sn=Math.sin(tk*Math.PI);
    Rg.hp.rotation.x=a;Rg.kn.rotation.x=tk<.18?1.25:.25;L.hp.rotation.x=-.18*sn;L.kn.rotation.x=.35*sn;L.an.rotation.x=0;
    spine.rotation.x=-.14*sn+.03;hips.rotation.y=.3*sn;aL.sh.rotation.set(-.8*sn,0,.35*sn);aR.sh.rotation.set(.6*sn,0,-.35*sn);hips.position.y=13.8-.7*sn;head.rotation.x=.18*sn}
  // carrinho
  if(o.slide){body.rotation.x=-1.12;body.position.y=1.4;spine.rotation.x=.2;Rg.hp.rotation.x=-.75;L.hp.rotation.x=-.2;Rg.kn.rotation.x=.1;L.kn.rotation.x=1.0;aL.sh.rotation.set(-.2,0,.9);aR.sh.rotation.set(-.2,0,-.9);aL.el.rotation.x=-.3;aR.el.rotation.x=-.3}
  // caído
  if(o.down){body.rotation.x=-1.5;body.position.y=1.3;spine.rotation.x=.05;L.hp.rotation.x=-.1;Rg.hp.rotation.x=-.35;L.kn.rotation.x=.5;Rg.kn.rotation.x=.9;aL.sh.rotation.set(-.2,0,.8);aR.sh.rotation.set(-.4,0,-.7);aL.el.rotation.x=-.2;aR.el.rotation.x=-.4}
  // salto do guarda-redes (bolas altas e defesas no lugar)
  if(o.jump>0&&!o.dive){const u=1-o.jump/.6,arc=Math.sin(Math.PI*Math.min(1,u)),up=Math.sin(Math.PI*Math.min(1,u*1.15));
    hips.position.y=13.8+7.5*arc;aL.sh.rotation.set(-2.75*up,0,.18);aR.sh.rotation.set(-2.75*up,0,-.18);aL.el.rotation.x=aR.el.rotation.x=-.15*up;
    L.hp.rotation.set(-.35*arc,0,.12);Rg.hp.rotation.set(.25*arc,0,-.12);L.kn.rotation.x=.9*arc;Rg.kn.rotation.x=.5*arc;L.an.rotation.x=Rg.an.rotation.x=.5*arc;spine.rotation.x=-.08*arc;head.rotation.x=-.2*arc}
  // mergulho do guarda-redes: lança-se de lado, cai, fica no chão e levanta-se
  if(o.dive){const t=o.dive.t,sd=o.dive.side,air=sstep(t/.3),back=1-sstep((t-1.0)/.3),r=Math.min(air,back);
    hips.rotation.z=-sd*1.38*r;
    hips.position.y=13.8-(13.8-3.1)*r+(t<.34?5.5*Math.sin(Math.PI*t/.34):0)*(1-.5*r);
    spine.rotation.x=-.1*r;spine.rotation.z=0;hips.position.x=0;hips.rotation.y=0;
    aL.sh.rotation.set(-2.9*r,0,.12);aR.sh.rotation.set(-2.9*r,0,-.12);aL.el.rotation.x=aR.el.rotation.x=-.15*r;
    L.hp.rotation.set(.28*r,0,.1*r);Rg.hp.rotation.set(.1*r,0,-.1*r);L.kn.rotation.x=.25*r;Rg.kn.rotation.x=.95*r;L.an.rotation.x=Rg.an.rotation.x=.5*r;
    head.rotation.set(-.2*r,h.hy*(1-r),sd*.1*r)}
}

/* ---------- cena ---------- */
function buildScene(){
  const scene=new T.Scene();scene.background=new T.Color(0x09130e);
  const cam=new T.PerspectiveCamera(40,1,10,6000);
  const aniso=Math.min(8,R.gl.capabilities.getMaxAnisotropy());
  if(!G.tv)buildTV();
  // relvado
  const pt=pitchTexture(aniso),pitch=new T.Mesh(new T.PlaneGeometry(PW(),PH_()),new T.MeshBasicMaterial({map:pt}));
  pitch.rotation.x=-Math.PI/2;pitch.position.set(PX0()+PW()/2,0,PY0()+PH_()/2);scene.add(pitch);
  if(PREF.quality!=="low"&&PREF.stadium!=="bairro"&&PREF.stadium!=="aberto"){
    const bc=mkCanvas(256,256),bq=bc.getContext("2d");
    for(let i=0;i<900;i++){const x=Math.random()*256,y=Math.random()*256,l=3+Math.random()*7,a=(Math.random()-.5)*.7;bq.strokeStyle=Math.random()<.55?"rgba(10,48,10,.5)":"rgba(190,235,120,.32)";bq.lineWidth=.9;bq.beginPath();bq.moveTo(x,y);bq.lineTo(x+Math.sin(a)*l,y-Math.cos(a)*l);bq.stroke()}
    for(let i=0;i<40;i++){const x=Math.random()*256,y=Math.random()*256,r=6+Math.random()*16,g=bq.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,Math.random()<.5?"rgba(0,30,0,.10)":"rgba(200,255,120,.08)");g.addColorStop(1,"rgba(0,0,0,0)");bq.fillStyle=g;bq.fillRect(x-r,y-r,r*2,r*2)}
    const bt=new T.CanvasTexture(bc);bt.wrapS=bt.wrapT=T.RepeatWrapping;bt.repeat.set(PW()/48,PH_()/48);bt.anisotropy=Math.min(8,R.gl.capabilities.getMaxAnisotropy());bt.minFilter=T.LinearMipmapLinearFilter;bt.generateMipmaps=true;
    const gm=new T.Mesh(new T.PlaneGeometry(PW(),PH_()),new T.MeshBasicMaterial({map:bt,transparent:true,depthWrite:false,opacity:PREF.quality==="high"?1:.7}));
    gm.rotation.x=-Math.PI/2;gm.position.set(PX0()+PW()/2,.08,PY0()+PH_()/2);gm.renderOrder=.1;scene.add(gm)
  }
  const _st0=scene.children.length;
  // ===== estádio: bacia fechada e finita, tipo + dia/noite, pormenores em pixel art =====
  const DAY=PREF.daytime==="day",STY=STADIA[PREF.stadium]||STADIA.classic,MX=STY.mx,MY=STY.my;
  scene.background=new T.Color(DAY?0xbfe0f7:0x09130e);scene.fog=new T.Fog(DAY?0xcfe6f7:0x0a141c,1300,4300);
  const crowdTex=(G.tv.crowdFrames||[G.tv.crowd]).map(cv=>tex(cv,{mip:false})),crowd=crowdTex[0];
  const standMat=new T.MeshBasicMaterial({map:crowd,side:T.DoubleSide,color:STY.tint});
  const quadMesh=(pts,uv,mat,order)=>{const g=new T.BufferGeometry();g.setAttribute("position",new T.BufferAttribute(new Float32Array(pts),3));g.setAttribute("uv",new T.BufferAttribute(new Float32Array(uv),2));g.setIndex([0,1,2,0,2,3]);const m=new T.Mesh(g,mat);if(order!=null)m.renderOrder=order;scene.add(m);return m};
  const TILE=W+840,UV1=[0,0,1,0,1,1,0,1];
  const yN=Y0-MY,yF=yN-(STY.depth-40),zF=STY.h,yB=Y1+260,xL=X0-MX-STY.endDepth,xR=X1+MX+STY.endDepth,LEN=xR-xL;
  const topF=zF+(STY.roof?STY.roofH:0),topE=STY.endH+(STY.roof?STY.roofH*.8:0);
  const rr=(a,b)=>a+Math.random()*(b-a),pick=a=>a[(Math.random()*a.length)|0];
  /* --- kit de pixel art: telas pequenas, ampliadas sem suavização, com contorno e sombra no chão --- */
  const PXT=cv=>{const t=new T.CanvasTexture(cv);t.magFilter=t.minFilter=T.NearestFilter;t.generateMipmaps=false;return t};
  const outl=(cv,col)=>{const w=cv.width+2,h=cv.height+2,o=mkCanvas(w,h),q=o.getContext("2d"),t=mkCanvas(w,h),tq=t.getContext("2d");tq.drawImage(cv,1,1);tq.globalCompositeOperation="source-in";tq.fillStyle=col;tq.fillRect(0,0,w,h);for(const d of [[-1,0],[1,0],[0,-1],[0,1]])q.drawImage(t,d[0],d[1]);q.drawImage(cv,1,1);return o};
  const disc=(q,cx,cy,r,col)=>{q.fillStyle=col;for(let y=-r;y<=r;y++){const hw=Math.round(Math.sqrt(r*r-y*y));q.fillRect(cx-hw,cy+y,hw*2+1,1)}};
  const pmat=cv=>new T.MeshBasicMaterial({map:PXT(cv),transparent:true,alphaTest:.4,side:T.DoubleSide});
  const INK=DAY?"#1b1511":"#02060a";
  const shC=mkCanvas(64,64),shQ=shC.getContext("2d"),shG=shQ.createRadialGradient(32,32,2,32,32,32);shG.addColorStop(0,"rgba(0,0,0,.55)");shG.addColorStop(1,"rgba(0,0,0,0)");shQ.fillStyle=shG;shQ.fillRect(0,0,64,64);
  const shadowMat=new T.MeshBasicMaterial({map:tex(shC),transparent:true,depthWrite:false,opacity:DAY?.9:.5});
  const shadowGeo=new T.PlaneGeometry(1,1);
  const geoCache={};
  // coloca um sprite vertical (pixel art) com base em (x,y) e sombra elíptica no chão
  const put=(mat,cw,ch,x,y,scale,ppu,noShadow)=>{const k=cw+"x"+ch+"x"+ppu,w=cw*ppu,h=ch*ppu;const g=geoCache[k]||(geoCache[k]=new T.PlaneGeometry(w,h).translate(0,h/2,0));
    const m=new T.Mesh(g,mat);m.position.set(x,0,y);m.scale.set(scale,scale,1);scene.add(m);
    if(!noShadow){const s=new T.Mesh(shadowGeo,shadowMat);s.rotation.x=-Math.PI/2;s.scale.set(w*scale*.9,Math.max(10,h*scale*.2),1);s.position.set(x+w*scale*.14,.25,y+Math.max(5,h*scale*.08));s.renderOrder=.3;scene.add(s)}return m};
  /* --- céu e chão exterior --- */
  {const sk=mkCanvas(1024,512),q=sk.getContext("2d"),gr=q.createLinearGradient(0,512,0,0);
   if(DAY){gr.addColorStop(0,"#d8efff");gr.addColorStop(.45,"#8cc6f0");gr.addColorStop(1,"#3f88d4")}else{gr.addColorStop(0,"#16303a");gr.addColorStop(.35,"#0a1a26");gr.addColorStop(1,"#02060c")}
   q.fillStyle=gr;q.fillRect(0,0,1024,512);
   if(DAY){for(let i=0;i<7;i++){const cx=Math.random()*1024,cy=200+Math.random()*180;for(let k=0;k<7;k++){const rg=q.createRadialGradient(cx+k*26-80,cy+Math.random()*10,2,cx+k*26-80,cy,40+Math.random()*26);rg.addColorStop(0,"rgba(255,255,255,.75)");rg.addColorStop(1,"rgba(255,255,255,0)");q.fillStyle=rg;q.fillRect(cx-160,cy-90,420,180)}}}
   else{for(let i=0;i<150;i++){q.fillStyle="rgba(255,255,255,"+(.25+Math.random()*.6)+")";q.fillRect(Math.random()*1024,Math.random()*300,1+Math.random(),1)}}
   const st=tex(sk);st.wrapS=T.RepeatWrapping;st.repeat.set(16,1);
   const sm=new T.MeshBasicMaterial({map:st,depthWrite:false,depthTest:false,fog:false});
   quadMesh([-12000,-200,Y0-1300,14000,-200,Y0-1300,14000,1400,Y0-1300,-12000,1400,Y0-1300],UV1,sm,-3);
   const gm=new T.MeshBasicMaterial({color:DAY?STY.groundDay:STY.groundNight,depthWrite:false,side:T.DoubleSide});
   const ground=new T.Mesh(new T.PlaneGeometry(26000,5000),gm);ground.rotation.x=-Math.PI/2;ground.position.set(1000,-.6,Y0-1300+2500);ground.renderOrder=-2;scene.add(ground)}
  /* --- silhueta distante em pixel art --- */
  if(STY.sky){const W2=2048,sk=mkCanvas(512,64),q=sk.getContext("2d");q.scale(.25,.25);
   const ink=DAY?["#c9a77c","#e3cfa8","#b5b8a0","#d9b38c","#a9c0c9"]:["#0a141b","#0c1820","#08121a"];
   if(STY.sky==="bairro"){let x=0;while(x<W2){const w=rr(60,130),h=rr(40,120);q.fillStyle=pick(ink);q.fillRect(x,256-h,w,h);q.fillStyle=DAY?"#8a4a33":"#05090d";q.beginPath();q.moveTo(x-4,256-h);q.lineTo(x+w/2,256-h-22);q.lineTo(x+w+4,256-h);q.fill();
      if(!DAY)for(let i=0;i<5;i++){q.fillStyle="rgba(255,214,120,"+rr(.4,.9)+")";q.fillRect(x+8+(i%3)*(w/3.4),256-h+14+((i/3)|0)*22,9,11)}x+=w+rr(6,40)}}
   else if(STY.sky==="hills"){for(let l=0;l<3;l++){q.fillStyle=DAY?["#8fb7a3","#6ea089","#4f8a6c"][l]:["#0e2230","#0a1a26","#071219"][l];q.beginPath();q.moveTo(0,256);for(let x=0;x<=W2;x+=16)q.lineTo(x,150+l*34-Math.sin(x/W2*Math.PI*2*(2+l)+l*2)*(42-l*8)-Math.sin(x/90+l)*6);q.lineTo(W2,256);q.fill()}}
   else{let x=0;while(x<W2){const w=rr(40,110),h=rr(70,220);q.fillStyle=DAY?"#9aa9b4":"#0a141b";q.fillRect(x,256-h,w,h);
      if(!DAY)for(let yy=256-h+10;yy<250;yy+=14)for(let xx=x+6;xx<x+w-8;xx+=13)if(Math.random()<.45){q.fillStyle="rgba(255,226,150,"+rr(.3,.8)+")";q.fillRect(xx,yy,5,7)}
      x+=w+rr(0,12)}}
   const sm=new T.MeshBasicMaterial({map:PXT(sk),transparent:true,depthWrite:false});
   for(let i=-9;i<=9;i++){const k=STY.sky==="bairro"?.4:.6,a=i*W2*k,b=a+W2*k;quadMesh([a,20,yF-200,b,20,yF-200,b,20+256*k,yF-200,a,20+256*k,yF-200],UV1,sm,-1)}}
  /* --- tijolo / parede em pixel art (fecha os lados da bacia) --- */
  const brickCv=()=>{const c=mkCanvas(16,16),q=c.getContext("2d"),b=DAY?STY.wallDay:STY.wallNight;q.fillStyle=b;q.fillRect(0,0,16,16);q.fillStyle=DAY?"rgba(0,0,0,.2)":"rgba(255,255,255,.07)";for(let r=0;r<4;r++){q.fillRect(0,r*4+3,16,1);const o=r%2?0:8;q.fillRect(o,r*4,1,3);q.fillRect((o+8)%16,r*4,1,3)}q.fillStyle="rgba(255,255,255,.08)";for(let r=0;r<4;r++)q.fillRect(1,r*4,6,1);return c};
  const wallT=PXT(brickCv());wallT.wrapS=wallT.wrapT=T.RepeatWrapping;const wallMat=new T.MeshBasicMaterial({map:wallT,side:T.DoubleSide});
  const wallQ=(pts,wu,hv)=>quadMesh(pts,[0,0,wu,0,wu,hv,0,hv],wallMat);
  /* --- bancadas: lado oposto e dois topos, com cantos fechados --- */
  const waveMat=(()=>{const wc=mkCanvas(1024,8),wq=wc.getContext("2d"),wg=wq.createLinearGradient(0,0,1024,0);
    wg.addColorStop(0,"rgba(255,240,180,0)");wg.addColorStop(.12,"rgba(255,240,180,.0)");wg.addColorStop(.18,"rgba(255,240,180,.28)");wg.addColorStop(.24,"rgba(255,240,180,0)");wg.addColorStop(1,"rgba(255,240,180,0)");
    wq.fillStyle=wg;wq.fillRect(0,0,1024,8);const t=tex(wc);t.wrapS=T.RepeatWrapping;return new T.MeshBasicMaterial({map:t,transparent:true,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide})})();
  const wt=waveMat.map,wave=new T.Group();scene.add(wave);
  const adMat=new T.MeshBasicMaterial({map:tex(G.tv.ads,{mip:false}),side:T.DoubleSide});
  const uF=LEN/TILE,bY=yN+14;
  quadMesh([xL,0,yN,xR,0,yN,xR,zF,yF,xL,zF,yF],[0,0,uF,0,uF,1,0,1],standMat);
  {const w=quadMesh([xL,.3,yN,xR,.3,yN,xR,zF+.3,yF,xL,zF+.3,yF],[0,0,uF,0,uF,1,0,1],waveMat,.2);scene.remove(w);wave.add(w)}
  quadMesh([xL,0,bY,xR,0,bY,xR,STY.ad,bY,xL,STY.ad,bY],[0,0,uF,0,uF,1,0,1],adMat);
  if(PREF.stadium==="modern")quadMesh([xL,STY.ad,bY,xR,STY.ad,bY,xR,STY.ad+2,bY,xL,STY.ad+2,bY],UV1,new T.MeshBasicMaterial({color:DAY?0xffffff:0x7fe9ff}));
  const uE=(yB-yN)/TILE;
  for(const s of [0,1]){const xn=s?X1+MX:X0-MX,xf=s?xn+STY.endDepth:xn-STY.endDepth;
    quadMesh([xn,0,yN,xn,0,yB,xf,STY.endH,yB,xf,STY.endH,yN],[0,0,uE,0,uE,1,0,1],standMat);
    const xb=s?xn-2:xn+2,ub=(yB-bY)/TILE;quadMesh([xb,0,bY,xb,0,yB,xb,STY.ad,yB,xb,STY.ad,bY],[0,0,ub,0,ub,1,0,1],adMat);
    // laterais fechadas: cantos junto à bancada do fundo e fecho junto à câmara
    quadMesh([xf,0,yN,xf,0,yF-1,xf,topF,yF-1,xf,topE,yN],[0,0,1,0,1,1,0,1].map((v,i)=>i%2?v*3:v*((yN-yF)/24)),wallMat);
    quadMesh([xn,0,yB,xf,0,yB,xf,topE,yB,xn,0,yB],[0,0,STY.endDepth/24,0,STY.endDepth/24,topE/24,0,0],wallMat)}
  // cobertura / muro por cima da bancada
  if(STY.roof){const rm=new T.MeshBasicMaterial({color:DAY?STY.roofDay:STY.roofNight,side:T.DoubleSide});
    quadMesh([xL,zF,yF-1,xR,zF,yF-1,xR,zF+STY.roofH,yF-1,xL,zF+STY.roofH,yF-1],UV1,rm);
    for(const s of [0,1]){const xf=(s?X1+MX+STY.endDepth:X0-MX-STY.endDepth)+(s?1:-1);quadMesh([xf,STY.endH,yN,xf,STY.endH,yB,xf,STY.endH+STY.roofH*.8,yB,xf,STY.endH+STY.roofH*.8,yN],UV1,rm)}}
  /* --- pormenores por tipo (pixel art) --- */
  const houseCv=()=>{const w=40,h=32,c=mkCanvas(w,h),q=c.getContext("2d");
    const wall=pick(DAY?[["#f0d9a8","#d9bb82"],["#e89a78","#c77a5a"],["#8fc4d8","#6aa3ba"],["#f2e27a","#d4c25a"],["#b9d98a","#98ba6a"],["#f7f1e3","#d9d1bd"]]:[["#2a3a48","#202d39"],["#33414d","#26323d"],["#2c3640","#222b34"]]);
    const bh=pick([14,17,21]),y0=h-bh;
    q.fillStyle=wall[0];q.fillRect(3,y0,34,bh);q.fillStyle=wall[1];q.fillRect(31,y0,6,bh);q.fillRect(3,h-3,34,3);
    for(let r=0;r<6;r++){q.fillStyle=r%2?(DAY?"#8d979c":"#161f26"):(DAY?"#a9b3b8":"#1b262e");q.fillRect(6-r,y0-6+r,28+2*r,1)}
    q.fillStyle=DAY?"#c8d2d6":"#26333c";q.fillRect(7,y0-6,26,1);
    q.fillStyle=DAY?"#6b4326":"#10171c";q.fillRect(8,h-9,6,9);q.fillStyle=DAY?"#e8c76a":"#2a3a48";q.fillRect(12,h-5,1,1);
    for(const wx of [19,27]){for(let fl=0;fl<(bh>19?2:1);fl++){const wy=y0+3+fl*8;q.fillStyle=DAY?"#4a6f84":(Math.random()<.65?"#ffd479":"#33434f");q.fillRect(wx,wy,5,5);q.fillStyle=DAY?"#9fd0e8":"rgba(255,240,190,.8)";if(DAY)q.fillRect(wx+1,wy+1,3,3);q.fillStyle=DAY?"#eee":"#05090d";q.fillRect(wx+2,wy,1,5);q.fillRect(wx,wy+2,5,1)}}
    if(Math.random()<.5){q.fillStyle="#ddd";q.fillRect(32,y0-9,4,3);q.fillStyle="#999";q.fillRect(33,y0-6,1,2)}
    if(Math.random()<.35){q.fillStyle=pick(["#d7263d","#f2b705","#2fa84a"]);q.fillRect(15,y0+bh-6,4,2);q.fillRect(20,y0+bh-6,3,2)}
    return outl(c,INK)};
  const palmCv=()=>{const c=mkCanvas(36,52),q=c.getContext("2d");
    for(let y=51;y>=16;y--){const x=18+Math.round(Math.sin((51-y)/9)*1.6);q.fillStyle=((51-y)%4<1)?(DAY?"#5a3d22":"#0c0f0b"):(DAY?"#8a6238":"#12170f");q.fillRect(x-1,y,3,1)}
    const g1=DAY?"#2f9a45":"#0b2412",g2=DAY?"#58c25f":"#12351c",g3=DAY?"#1f6f33":"#071a0d";
    for(let k=0;k<8;k++){const a=Math.PI*(1.04+k*.13);for(let t=1;t<=15;t++){const x=Math.round(18+Math.cos(a)*t*1.15),y=Math.round(15+Math.sin(a)*t*.5+t*t*.035);q.fillStyle=(t%3===0)?g2:(k%2?g1:g3);q.fillRect(x,y,2,2)}}
    q.fillStyle=DAY?"#6b4a2d":"#0c0f0b";q.fillRect(16,17,2,2);q.fillRect(19,18,2,2);return outl(c,DAY?"#12301a":"#02070a")};
  const mangoCv=()=>{const c=mkCanvas(44,48),q=c.getContext("2d");
    q.fillStyle=DAY?"#6b4a2d":"#0b0f0c";q.fillRect(20,28,5,20);q.fillRect(17,44,11,4);
    const dk=DAY?"#1f6a30":"#06140a",md=DAY?"#2f8f3e":"#0b2412",lt=DAY?"#58b857":"#123419",bl=[[22,16,13],[12,22,9],[32,22,9],[22,26,10],[14,14,7],[30,13,7]];
    for(const b of bl)disc(q,b[0],b[1]+3,b[2],dk);for(const b of bl)disc(q,b[0]-1,b[1]+1,b[2]-1,md);for(const b of bl)disc(q,b[0]-3,b[1]-2,Math.max(2,b[2]-5),lt);
    for(let i=0;i<30;i++){q.fillStyle=Math.random()<.5?lt:dk;q.fillRect(6+(Math.random()*32|0),6+(Math.random()*26|0),1,1)}
    if(DAY){q.fillStyle="#f2b705";for(let i=0;i<5;i++)q.fillRect(10+(Math.random()*24|0),10+(Math.random()*20|0),2,2)}
    return outl(c,DAY?"#12301a":"#02070a")};
  const cypCv=()=>{const c=mkCanvas(20,52),q=c.getContext("2d");
    for(let y=0;y<50;y++){const t=y/50,half=Math.round(Math.sin(Math.min(1,t*1.15)*Math.PI*.5)*8*(1-.15*t));q.fillStyle=DAY?"#2c6e3a":"#07120a";q.fillRect(10-half,2+y,half*2+1,1);q.fillStyle=DAY?"#4a9a54":"#0e2a16";q.fillRect(10-half,2+y,Math.max(1,half>>1),1)}
    q.fillStyle=DAY?"#5a3d22":"#0b0f0c";q.fillRect(9,50,3,2);return outl(c,DAY?"#12301a":"#02070a")};
  const stallCv=()=>{const c=mkCanvas(40,30),q=c.getContext("2d"),a=pick([["#d7263d","#ffffff"],["#f2b705","#1f8a4c"],["#1f6fd1","#ffffff"]]);
    q.fillStyle="#5a3d22";q.fillRect(3,10,2,20);q.fillRect(35,10,2,20);
    for(let x=0;x<40;x+=4){q.fillStyle=(x/4)%2?a[1]:a[0];q.fillRect(x,4,4,6);q.fillRect(x+1,10,2,2)}
    q.fillStyle="#7a5a3a";q.fillRect(5,20,30,10);q.fillStyle="#9a7448";q.fillRect(5,20,30,2);
    const goods=["#f2b705","#d7263d","#2fa84a","#ff8a3d"];for(let i=0;i<6;i++){q.fillStyle=goods[i%4];q.fillRect(7+i*5,17,3,3)}
    return outl(c,INK)};
  const mats3=(fn,n)=>Array.from({length:n},()=>pmat(fn()));
  const scatter=(mats,cw,ch,ppu,xa,xb,ya,yb,gap,sc0,sc1)=>{for(let x=xa;x<xb;x+=rr(gap[0],gap[1])){put(pick(mats),cw,ch,x,rr(ya,yb),rr(sc0,sc1),ppu)}};
  if(PREF.stadium==="bairro"){
    const hm=mats3(houseCv,6),pm=mats3(palmCv,2),mm=mats3(mangoCv,2),sm2=mats3(stallCv,3);
    // casas e árvores por trás e dos lados do campo
    scatter(hm,42,32,1.5,xL-700,xR+700,yF-110,yF-40,[52,84],.8,1.2);
    scatter(pm.concat(mm),38,52,1.4,xL-700,xR+700,yF-130,yF-30,[80,140],.8,1.25);
    for(const s of [0,1]){const xs=s?xR:xL,dir=s?1:-1;
      for(let y=yF-60;y<yB+120;y+=rr(60,100)){put(pick(hm),42,32,xs+dir*rr(50,300),y,rr(.8,1.2),1.5)}
      for(let y=yF-30;y<yB+120;y+=rr(90,150)){put(pick(pm.concat(mm)),38,52,xs+dir*rr(40,360),y,rr(.8,1.25),1.4)}
      for(let i=0;i<3;i++)put(pick(sm2),42,32,xs+dir*rr(30,80),yN+60+i*rr(180,260),1,1.2)}
    // mural pintado na parede atrás da bancada
    {const W3=380,H3=20,mc=mkCanvas(W3,H3),q=mc.getContext("2d");
     const bc=brickCv();for(let x=0;x<W3;x+=16)for(let y=0;y<H3;y+=16)q.drawImage(bc,x,y);
     const panel=(x0,kind)=>{const pw=52;q.fillStyle="#12100d";q.fillRect(x0-1,0,pw+2,H3);
       if(kind===0){q.fillStyle="#c8102e";q.fillRect(x0,1,pw,9);q.fillStyle="#151515";q.fillRect(x0,10,pw,9);disc(q,x0+26,10,4,"#f2b705");q.fillStyle="#151515";q.fillRect(x0+25,8,2,5);q.fillRect(x0+23,10,6,1)}
       else if(kind===1){q.fillStyle="#1f8a4c";q.fillRect(x0,1,pw,18);q.fillStyle="#f2b705";for(let i=0;i<8;i++)q.fillRect(x0+i*8-2+((i%2)*2),1+i*2,6,3);disc(q,x0+26,10,5,"#fff");q.fillStyle="#111";q.fillRect(x0+24,8,4,4);q.fillRect(x0+21,10,2,2);q.fillRect(x0+29,10,2,2)}
       else if(kind===2){q.fillStyle="#1f6fd1";q.fillRect(x0,1,pw,18);q.fillStyle="#f2b705";q.font="bold 8px Arial";q.textAlign="center";q.textBaseline="middle";q.fillText("BOLA",x0+26,6);q.fillStyle="#fff";q.fillText("NO PÉ",x0+26,14)}
       else{q.fillStyle="#f2b705";q.fillRect(x0,1,pw,18);q.fillStyle="#c8102e";for(let i=0;i<5;i++)q.fillRect(x0,1+i*4,pw,2);q.fillStyle="#151515";q.font="bold 8px Arial";q.textAlign="center";q.textBaseline="middle";q.fillText("GIRABOLA",x0+26,10)}};
     for(let i=0;i<6;i++)panel(10+i*61,i%4);
     const mt=PXT(mc);quadMesh([xL,0,yF-3,xR,0,yF-3,xR,zF+18,yF-3,xL,zF+18,yF-3],UV1,new T.MeshBasicMaterial({map:mt,side:T.DoubleSide}))}
    // bandeirolas por cima da bancada
    {const bc=mkCanvas(64,8),bq=bc.getContext("2d");bq.fillStyle=DAY?"#444":"#111";for(let x=0;x<64;x++)bq.fillRect(x,1+Math.round(Math.sin(x/64*Math.PI)*1.4),1,1);
     ["#c8102e","#151515","#f2b705","#1f8a4c","#1f6fd1","#ffffff"].forEach((col,i)=>{const x=3+i*10;bq.fillStyle=col;bq.fillRect(x,3,5,1);bq.fillRect(x+1,4,3,1);bq.fillRect(x+2,5,1,1)});
     const bt=PXT(bc);bt.wrapS=T.RepeatWrapping;const bmat=new T.MeshBasicMaterial({map:bt,transparent:true,alphaTest:.3,side:T.DoubleSide});
     const bz=STY.h,by=yN-(yN-yF)*.3,u=LEN/60;quadMesh([xL,bz-4,by,xR,bz-4,by,xR,bz+28,by,xL,bz+28,by],[0,0,u,0,u,1,0,1],bmat)}
    // rede de arame
    {const fc=mkCanvas(16,16),fq=fc.getContext("2d");fq.fillStyle=DAY?"rgba(40,50,55,.85)":"rgba(170,180,190,.55)";for(let i=0;i<16;i++){fq.fillRect(i,i,1,1);fq.fillRect(15-i,i,1,1)}
     const ft=PXT(fc);ft.wrapS=ft.wrapT=T.RepeatWrapping;const fm=new T.MeshBasicMaterial({map:ft,transparent:true,alphaTest:.2,depthWrite:false,side:T.DoubleSide});
     const fx0=X0-MX,fx1=X1+MX,fy=yN+22;quadMesh([fx0,0,fy,fx1,0,fy,fx1,26,fy,fx0,26,fy],[0,0,(fx1-fx0)/12,0,(fx1-fx0)/12,26/12,0,26/12],fm,.6);
     for(const s of [0,1]){const xe=s?X1+MX-8:X0-MX+8,len=yB-fy;quadMesh([xe,0,fy,xe,0,yB,xe,26,yB,xe,26,fy],[0,0,len/12,0,len/12,26/12,0,26/12],fm,.6)}}
    // postes de iluminação baixos (pixel)
    {const pc=mkCanvas(8,26),q=pc.getContext("2d");q.fillStyle=DAY?"#6f6a60":"#2a3238";q.fillRect(3,6,2,20);q.fillStyle=DAY?"#e9e4d4":"#ffe9a8";q.fillRect(1,3,6,3);q.fillStyle=DAY?"#8c867a":"#10181d";q.fillRect(0,2,8,1);const pmM=pmat(outl(pc,INK));
     for(const lx of [X0+120,X1-120,W/2])put(pmM,10,28,lx,yN+10,1,1.3,true)}
  }
  if(PREF.stadium==="aberto"){
    const cm=mats3(cypCv,3),mm=mats3(mangoCv,2),pm=mats3(palmCv,1);
    scatter(cm.concat(mm,pm),38,52,1.5,xL-900,xR+900,yF-150,yF-40,[50,100],.7,1.3);
    for(const s of [0,1]){const xs=s?xR:xL,dir=s?1:-1;for(let y=yF-40;y<yB+140;y+=rr(70,130))put(pick(cm.concat(mm)),38,52,xs+dir*rr(50,420),y,rr(.7,1.3),1.5)}
    // degraus e corredores em pixel
    {const sc=mkCanvas(16,16),sq=sc.getContext("2d");sq.fillStyle="rgba(0,0,0,.34)";sq.fillRect(0,0,16,2);sq.fillStyle="rgba(255,255,255,.14)";sq.fillRect(0,2,16,1);sq.fillStyle="rgba(0,0,0,.22)";sq.fillRect(7,0,2,16);
     const stt=PXT(sc);stt.wrapS=stt.wrapT=T.RepeatWrapping;const stepM=new T.MeshBasicMaterial({map:stt,transparent:true,depthWrite:false,side:T.DoubleSide});
     quadMesh([xL,.4,yN,xR,.4,yN,xR,zF+.4,yF,xL,zF+.4,yF],[0,0,LEN/40,0,LEN/40,9,0,9],stepM,.15);
     for(const s of [0,1]){const xn=s?X1+MX:X0-MX,xf=s?xn+STY.endDepth:xn-STY.endDepth;quadMesh([xn,.4,yN,xn,.4,yB,xf,STY.endH+.4,yB,xf,STY.endH+.4,yN],[0,0,(yB-yN)/40,0,(yB-yN)/40,6,0,6],stepM,.15)}}
    // painel de LED (matriz de pontos)
    {const sm=mkCanvas(64,16),sq=sm.getContext("2d");sq.fillStyle="#000";sq.fillRect(0,0,64,16);sq.fillStyle="#fff";sq.font="bold 8px Arial";sq.textAlign="center";sq.textBaseline="top";sq.fillText("GIRABOLA",32,0);sq.fillText(String(G.stadium||"").toUpperCase().slice(0,12),32,8);
     const d=sq.getImageData(0,0,64,16).data,oc=mkCanvas(512,160),q=oc.getContext("2d");q.fillStyle="#06090c";q.fillRect(0,0,512,160);q.strokeStyle="#47677a";q.lineWidth=6;q.strokeRect(3,3,506,154);
     for(let y=0;y<16;y++)for(let x=0;x<64;x++){const v=d[(y*64+x)*4];q.fillStyle=v>110?"#ffcf4a":"#231c0b";q.fillRect(x*8+1,16+y*8+1,6,6)}
     const px=W/2;quadMesh([px-150,zF+14,yF-6,px+150,zF+14,yF-6,px+150,zF+108,yF-6,px-150,zF+108,yF-6],UV1,new T.MeshBasicMaterial({map:tex(oc)}));
     for(const dx of [-120,120]){const leg=new T.Mesh(new T.BoxGeometry(6,zF+20,6),new T.MeshBasicMaterial({color:0x2a343a}));leg.position.set(px+dx,(zF+14)/2,yF-8);scene.add(leg)}}
    // bandeiras no cimo da bancada
    {const fc=mkCanvas(16,12),q=fc.getContext("2d");q.fillStyle="#c8102e";q.fillRect(0,0,16,6);q.fillStyle="#151515";q.fillRect(0,6,16,6);disc(q,8,6,2,"#f2b705");const fm=pmat(outl(fc,INK));
     for(let x=xL+60;x<xR-40;x+=140){const pole=new T.Mesh(new T.CylinderGeometry(.8,.8,34,5),new T.MeshBasicMaterial({color:DAY?0xdddddd:0x6b7a82}));pole.position.set(x,zF+17,yF+6);scene.add(pole);put(fm,18,14,x+8,yF+6,1,1.2,true).position.y=zF+16}}
    // lua (noite) ou sol (dia)
    {const lc=mkCanvas(256,256),lq=lc.getContext("2d"),lg=lq.createRadialGradient(128,128,10,128,128,128);
     if(DAY){lg.addColorStop(0,"rgba(255,252,220,1)");lg.addColorStop(.18,"rgba(255,245,190,.9)");lg.addColorStop(1,"rgba(255,240,170,0)")}else{lg.addColorStop(0,"rgba(235,242,255,1)");lg.addColorStop(.22,"rgba(220,232,255,.9)");lg.addColorStop(.3,"rgba(180,200,240,.25)");lg.addColorStop(1,"rgba(160,180,230,0)")}
     lq.fillStyle=lg;lq.fillRect(0,0,256,256);const lsp=new T.Sprite(new T.SpriteMaterial({map:tex(lc),transparent:true,depthWrite:false,depthTest:false}));lsp.position.set(900,700,Y0-1250);lsp.scale.set(DAY?380:260,DAY?380:260,1);lsp.renderOrder=-2.5;scene.add(lsp)}
  }
  if(STY.roof){
    const MOD=PREF.stadium==="modern",slopeAt=(x,v)=>[x,zF*v,yN+(yF-yN)*v];
    // matriz de LED: escreve texto numa tela pequena e desenha cada ponto aceso
    const ledAt=(q,x0,y0,l1,l2,col,cols,rows)=>{const sm=mkCanvas(cols,rows),sq=sm.getContext("2d");sq.fillStyle="#000";sq.fillRect(0,0,cols,rows);sq.fillStyle="#fff";sq.font="bold 8px Arial";sq.textAlign="center";sq.textBaseline="top";sq.fillText(l1,cols/2,0);sq.fillText(l2,cols/2,8);
      const d=sq.getImageData(0,0,cols,rows).data;q.fillStyle="#05080b";q.fillRect(x0-2,y0-2,cols+4,rows+4);q.fillStyle=DAY?"#47677a":"#2d4a5c";q.fillRect(x0-2,y0-2,cols+4,1);q.fillRect(x0-2,y0+rows+1,cols+4,1);
      for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){q.fillStyle=d[(j*cols+i)*4]>110?col:(DAY?"#14181c":"#0c1013");q.fillRect(x0+i,y0+j,1,1)}};
    // ---- cobertura: painéis, vigas, beira e ecrã de LED ----
    {const cw=Math.round(LEN/3),ch=Math.round(STY.roofH/3),c=mkCanvas(cw,ch),q=c.getContext("2d");
     if(MOD){q.fillStyle=DAY?"rgba(140,196,230,.42)":"rgba(40,86,128,.35)";q.fillRect(0,3,cw,ch-13);
       q.strokeStyle=DAY?"rgba(70,82,90,.85)":"rgba(6,12,18,.9)";q.lineWidth=1;for(let x=0;x<cw;x+=24){q.beginPath();q.moveTo(x,3);q.lineTo(x+12,ch-10);q.lineTo(x+24,3);q.stroke()}
       q.fillStyle=DAY?"#5b6770":"#05090d";q.fillRect(0,0,cw,3);q.fillRect(0,ch-10,cw,3);
       for(let x=0;x<cw;x++){q.fillStyle="hsl("+((x*2.6)%360)+",85%,"+(DAY?52:58)+"%)";q.fillRect(x,ch-6,1,3)}
       q.fillStyle=DAY?"#8a949b":"#0b141b";q.fillRect(0,ch-3,cw,3);
       ledAt(q,Math.round(cw/2-40),Math.round(ch*.28),"GIRABOLA",String(G.stadium||"").toUpperCase().slice(0,12),"#7fe9ff",80,16)}
     else{q.fillStyle=DAY?"rgba(0,0,0,.16)":"rgba(255,255,255,.05)";for(let x=0;x<cw;x+=20)q.fillRect(x,0,1,ch);for(let y=9;y<ch-6;y+=9)q.fillRect(0,y,cw,1);
       for(let x=6;x<cw;x+=12){q.fillStyle=DAY?"#cfd6d8":"#fff3c4";q.fillRect(x,2,3,2);if(!DAY){q.fillStyle="rgba(255,243,196,.22)";q.fillRect(x-1,4,5,2)}}
       q.fillStyle="#f2b705";q.fillRect(0,ch-6,cw,2);q.fillStyle="#c8102e";q.fillRect(0,ch-4,cw,2);q.fillStyle=DAY?"#444c50":"#05090d";q.fillRect(0,ch-2,cw,2);
       ledAt(q,Math.round(cw/2-32),Math.round(ch*.3),"GIRABOLA","CRAQUE","#ffcf4a",64,16)}
     quadMesh([xL,zF,yF-.6,xR,zF,yF-.6,xR,zF+STY.roofH,yF-.6,xL,zF+STY.roofH,yF-.6],UV1,new T.MeshBasicMaterial({map:PXT(c),transparent:true,depthWrite:false,side:T.DoubleSide}),.5);
     // beiras das coberturas laterais
     const ec=mkCanvas(Math.round((yB-yN)/3),Math.round(STY.roofH*.8/3)),eq=ec.getContext("2d"),ew=ec.width,eh=ec.height;
     eq.fillStyle=DAY?"rgba(0,0,0,.16)":"rgba(255,255,255,.05)";for(let x=0;x<ew;x+=20)eq.fillRect(x,0,1,eh);
     if(MOD){for(let x=0;x<ew;x++){eq.fillStyle="hsl("+((x*3)%360)+",85%,"+(DAY?52:58)+"%)";eq.fillRect(x,eh-6,1,3)}eq.fillStyle=DAY?"#5b6770":"#05090d";eq.fillRect(0,0,ew,3);eq.fillRect(0,eh-3,ew,3)}
     else{eq.fillStyle="#f2b705";eq.fillRect(0,eh-6,ew,2);eq.fillStyle="#c8102e";eq.fillRect(0,eh-4,ew,2);eq.fillStyle=DAY?"#444c50":"#05090d";eq.fillRect(0,eh-2,ew,2)}
     const em=new T.MeshBasicMaterial({map:PXT(ec),transparent:true,depthWrite:false,side:T.DoubleSide});
     for(const s of [0,1]){const xf=(s?X1+MX+STY.endDepth:X0-MX-STY.endDepth)+(s?-1.6:1.6);quadMesh([xf,STY.endH,yN,xf,STY.endH,yB,xf,STY.endH+STY.roofH*.8,yB,xf,STY.endH+STY.roofH*.8,yN],UV1,em,.5)}}
    // ---- degraus, corredores, patamar e entradas nas bancadas ----
    {const sc=mkCanvas(48,64),q=sc.getContext("2d");
     for(let y=0;y<64;y+=4){q.fillStyle="rgba(0,0,0,.26)";q.fillRect(0,y,48,1);q.fillStyle="rgba(255,255,255,.09)";q.fillRect(0,y+1,48,1)}
     q.fillStyle="rgba(0,0,0,.3)";q.fillRect(0,0,2,64);q.fillRect(46,0,2,64);
     if(MOD){q.fillStyle="rgba(8,12,16,.88)";q.fillRect(0,29,48,6);q.fillStyle=DAY?"#9aa6ad":"#5ad6ee";q.fillRect(0,29,48,1);q.fillStyle=DAY?"rgba(255,255,255,.5)":"rgba(122,233,255,.55)";q.fillRect(0,35,48,1)}
     const stt=PXT(sc);stt.wrapS=stt.wrapT=T.RepeatWrapping;const stepM=new T.MeshBasicMaterial({map:stt,transparent:true,depthWrite:false,side:T.DoubleSide});
     quadMesh([xL,.4,yN,xR,.4,yN,xR,zF+.4,yF,xL,zF+.4,yF],[0,0,LEN/72,0,LEN/72,1,0,1],stepM,.15);
     for(const s of [0,1]){const xn=s?X1+MX:X0-MX,xf=s?xn+STY.endDepth:xn-STY.endDepth;quadMesh([xn,.4,yN,xn,.4,yB,xf,STY.endH+.4,yB,xf,STY.endH+.4,yN],[0,0,(yB-yN)/72,0,(yB-yN)/72,1,0,1],stepM,.15)}
     // entradas (vomitórios) com escadas e luz
     const dc=mkCanvas(14,18),dq=dc.getContext("2d");dq.fillStyle=DAY?"#1a1d20":"#05080a";dq.fillRect(0,4,14,14);dq.fillRect(1,2,12,2);dq.fillRect(3,0,8,2);
     dq.fillStyle=DAY?"#4a3d2a":"#ffd479";dq.fillRect(3,6,8,12);dq.fillStyle=DAY?"#2a2218":"#a86a1c";dq.fillRect(3,6,8,2);for(let y=9;y<18;y+=2){dq.fillStyle=DAY?"#3a3022":"#c98a2c";dq.fillRect(3,y,8,1)}
     dq.fillStyle=DAY?"#c8cdd0":"#2a343a";dq.fillRect(0,4,1,14);dq.fillRect(13,4,1,14);
     const dm=new T.MeshBasicMaterial({map:PXT(dc),transparent:true,alphaTest:.3,side:T.DoubleSide});
     for(let i=0;i<6;i++){const x=xL+(i+.5)*LEN/6,v0=.12,v1=.3,a=slopeAt(x-12,v0),b=slopeAt(x+12,v0),c2=slopeAt(x+12,v1),d2=slopeAt(x-12,v1);
       quadMesh([a[0],a[1]+.6,a[2],b[0],b[1]+.6,b[2],c2[0],c2[1]+.6,c2[2],d2[0],d2[1]+.6,d2[2]],UV1,dm,.2)}}
  }
  // bandeirins de canto (todos os estádios)
  for(const cc of [[X0,Y0],[X1,Y0],[X0,Y1],[X1,Y1]]){
    const cx=cc[0],cy=cc[1],pole=new T.Mesh(new T.CylinderGeometry(.7,.7,14,6),new T.MeshBasicMaterial({color:0xffffff}));pole.position.set(cx,7,cy);scene.add(pole);
    const fg=new T.BufferGeometry();fg.setAttribute("position",new T.BufferAttribute(new Float32Array([0,14,0,(cx<W/2?1:-1)*9,11.5,0,0,9,0]),3));fg.setIndex([0,1,2]);
    const fl=new T.Mesh(fg,new T.MeshBasicMaterial({color:0xf2b705,side:T.DoubleSide}));fl.position.set(cx,0,cy);scene.add(fl)}
  // torres de luz e focos (de noite)
  const gc2=mkCanvas(128,128),gq2=gc2.getContext("2d"),gg2=gq2.createRadialGradient(64,64,0,64,64,64);gg2.addColorStop(0,"rgba(255,250,225,.55)");gg2.addColorStop(1,"rgba(255,250,225,0)");gq2.fillStyle=gg2;gq2.fillRect(0,0,128,128);
  const glowTex=tex(gc2);
  for(const L of STY.lights){const lx=L[0],ly=L[1],lz=L[2],ls=L[3];
    if(STY.towers){const pole=new T.Mesh(new T.CylinderGeometry(3,5,lz,8),new T.MeshBasicMaterial({color:DAY?0x9aa3a6:0x1a262c}));pole.position.set(lx,lz/2,ly);scene.add(pole);
      const gcv=mkCanvas(14,8),gq=gcv.getContext("2d");gq.fillStyle=DAY?"#59636a":"#10181d";gq.fillRect(0,0,14,8);for(let j=0;j<4;j++)for(let i=0;i<7;i++){gq.fillStyle=DAY?"#eef2f4":"#fff6d8";gq.fillRect(i*2,j*2,1,1)}const pan=new T.Mesh(new T.PlaneGeometry(70,40),new T.MeshBasicMaterial({map:PXT(gcv),side:T.DoubleSide}));pan.position.set(lx,lz+10,ly);scene.add(pan)}
    if(!DAY){const g=new T.Sprite(new T.SpriteMaterial({map:glowTex,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));g.position.set(lx,lz,ly);g.scale.set(ls,ls,1);scene.add(g)}}
  const stand={material:standMat};
  const _st1=scene.children.length;
  // balizas
  const nm=netTexture(),goals=[makeGoal(0,nm),makeGoal(1,nm)];goals.forEach(g=>scene.add(g));
  // sombras e marcadores no chão
  const flat=(geo,mat)=>{const m=new T.Mesh(geo,mat);m.rotation.x=-Math.PI/2;m.renderOrder=.5;m.visible=false;scene.add(m);return m};
  const ringMat=col=>new T.MeshBasicMaterial({color:col,transparent:true,depthWrite:false,side:T.DoubleSide});
  const ctrlRing=flat(new T.RingGeometry(10.8,13.2,48),ringMat(0xf2b705));
  const tutRing=flat(new T.RingGeometry(20.8,23.4,48),ringMat(0xf2b705));
  const tutFill=flat(new T.CircleGeometry(21,40),new T.MeshBasicMaterial({color:0xf2b705,transparent:true,opacity:.18,depthWrite:false}));
  const passRing=new T.Group(),passSpin=new T.Group();passRing.add(passSpin);passRing.visible=false;scene.add(passRing);
  const dashGeo=new T.RingGeometry(14,16,6,1,0,Math.PI/9),dashMat=ringMat(0xffffff);dashMat.opacity=.85;
  for(let i=0;i<10;i++){const m=new T.Mesh(dashGeo,dashMat);m.rotation.z=i*Math.PI/5;m.renderOrder=.5;passSpin.add(m)}
  passRing.rotation.x=-Math.PI/2;
  // bola
  const bc=mkCanvas(256,128),bt=tex(bc),ballSp=new T.Mesh(new T.SphereGeometry(BALL_R,28,18),new T.MeshLambertMaterial({map:bt,emissive:0x2a2a2a}));
  ballSp.castShadow=true;ballSp.renderOrder=1.1;scene.add(ballSp);
  const hotc=mkCanvas(64,64),hq=hotc.getContext("2d"),hg=hq.createRadialGradient(32,32,2,32,32,32);hg.addColorStop(0,"rgba(255,170,40,.9)");hg.addColorStop(1,"rgba(255,80,20,0)");hq.fillStyle=hg;hq.fillRect(0,0,64,64);
  const hot=new T.Sprite(new T.SpriteMaterial({map:tex(hotc),transparent:true,blending:T.AdditiveBlending,depthWrite:false}));hot.scale.set(18,18,1);hot.visible=false;hot.renderOrder=1.05;scene.add(hot);
  const ballShadow=flat(new T.CircleGeometry(1,24),new T.MeshBasicMaterial({color:0,transparent:true,opacity:.32,depthWrite:false}));
  const trail=[];const dotc=mkCanvas(32,32),dq=dotc.getContext("2d");dq.fillStyle="#fff";dq.beginPath();dq.arc(16,16,15,0,Math.PI*2);dq.fill();const dotTex=tex(dotc);
  for(let i=0;i<14;i++){const s=new T.Sprite(new T.SpriteMaterial({map:dotTex,transparent:true,depthWrite:false}));s.visible=false;s.renderOrder=1.05;scene.add(s);trail.push(s)}

  // luz e sombras reais
  const Q=PREF.quality||"high";R.gl.shadowMap.enabled=Q!=="low";R.gl.shadowMap.type=Q==="high"?T.PCFSoftShadowMap:T.PCFShadowMap;
  const hemi=DAY?new T.HemisphereLight(0xeaf5ff,0x9cc47c,.82):new T.HemisphereLight(0xdfe8ff,0x6f8f66,.6);scene.add(hemi);
  const sun=DAY?new T.DirectionalLight(0xfff4dc,.8):new T.DirectionalLight(0xeaf0ff,.6);sun.castShadow=Q!=="low";sun.shadow.mapSize.set(Q==="high"?3072:1536,Q==="high"?3072:1536);sun.shadow.radius=Q==="high"?3:1.5;
  const sc=sun.shadow.camera;sc.left=-640;sc.right=640;sc.top=520;sc.bottom=-520;sc.near=50;sc.far=1500;sun.shadow.bias=-.0006;
  scene.add(sun);scene.add(sun.target);
  const shadowPlane=new T.Mesh(new T.PlaneGeometry(PW(),PH_()),new T.ShadowMaterial({opacity:.34}));shadowPlane.rotation.x=-Math.PI/2;shadowPlane.position.set(PX0()+PW()/2,.5,PY0()+PH_()/2);shadowPlane.receiveShadow=true;shadowPlane.renderOrder=.45;scene.add(shadowPlane);
  // jogadores 3D: 12 + árbitro
  const humans=[];for(let i=0;i<13;i++){const hm=makeHuman();hm.root.visible=false;scene.add(hm.root);humans.push(hm)}
  R.S={scene,cam,pitch,stand,crowdTex,wave,wt,goals,ctrlRing,tutRing,tutFill,passRing,passSpin,ballSp,ballTex:bt,ballCv:bc,ballSkin:"",hot,ballShadow,trail,humans,sun,glowTex,proc:scene.children.slice(_st0,_st1)};
  R.matchG=G;
  gstApply(R.S);
}

/* ---------- ciclo de desenho ---------- */
const PCAM=()=>{const p=window.__penCam;return !!(p&&p.on)};
function setCamera(sx,sy){
  const S=R.S,cam=S.cam,L=Math.hypot(TV.back,TV.h);
  if(PCAM()){
    const pc=window.__penCam,asp=R.cw/Math.max(1,R.ch),hf=62*Math.PI/180;
    cam.fov=Math.max(36,Math.min(96,2*Math.atan(Math.tan(hf/2)/asp)*180/Math.PI));cam.aspect=asp;cam.near=4;
    cam.up.set(0,1,0);if(pc.bx!=null){const ex=(pc.tx!=null?pc.tx:pc.gx)-pc.bx,ey=(pc.ty!=null?pc.ty:H/2)-pc.by,ed=Math.hypot(ex,ey)||1,ux=ex/ed,uy=ey/ed,la=Math.min(ed*.72,250);cam.fov=Math.max(36,Math.min(80,2*Math.atan(Math.tan(54*Math.PI/360)/asp)*180/Math.PI));const bk=(pc.back||92)*(PREF.stadium==="bairro"||PREF.stadium==="marcal"?.7:1);cam.position.set(pc.bx-ux*bk-uy*14,pc.hh||42,pc.by-uy*bk+ux*14);cam.lookAt(new T.Vector3(pc.bx+ux*la,14,pc.by+uy*la))}
    else{cam.position.set(pc.gx-pc.dir*214,62,H/2);cam.lookAt(new T.Vector3(pc.gx,9,H/2))}
    cam.updateProjectionMatrix();cam.updateMatrixWorld(true);
    return;
  }
  cam.near=10;
  cam.position.set(camX,TV.h,camY+TV.back);
  cam.up.set(0,TV.back/L,-TV.h/L);
  cam.lookAt(new T.Vector3(camX,TV.h-TV.h/L,camY+TV.back-TV.back/L));
  const cw=R.cw,ch=R.ch,f=TV.F*SC,px=(TV.cx+OX+sx)*SC,py=(TV.cy+OY+sy)*SC,n=cam.near;
  cam.projectionMatrix.makePerspective(-n*px/f,n*(cw-px)/f,n*py/f,-n*(ch-py)/f,n,cam.far);
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  cam.updateMatrixWorld(true);
}
window.__penProject=function(x,y,z){
  if(!R||!R.S)return null;const cam=R.S.cam,v=new T.Vector3(x,z||0,y);const d=cam.position.distanceTo(v);v.project(cam);
  const per=(R.ch/(2*Math.tan(cam.fov*Math.PI/360)*Math.max(1,d)))/SC;
  return {x:(v.x*.5+.5)*VW,y:(-v.y*.5+.5)*VH,s:per};
};
function ballCanvas(){
  const id=cosm("ball").id;if(R.S.ballSkin===id)return;R.S.ballSkin=id;
  const base=id==="girassol"?"#ffd23f":id==="diamante"?"#d9f3ff":"#ffffff",patch=id==="girassol"?"#1d4e9e":id==="diamante"?"#3ec1ff":id==="rubro"?"#c8102e":"#1b1b1f";
  const c=R.S.ballCv.getContext("2d"),W2=256,H2=128;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,W2,H2);
  c.fillStyle=base;c.fillRect(0,0,W2,H2);
  const sh=c.createLinearGradient(0,0,0,H2);sh.addColorStop(0,"rgba(0,0,0,.10)");sh.addColorStop(.5,"rgba(0,0,0,0)");sh.addColorStop(1,"rgba(0,0,0,.14)");c.fillStyle=sh;c.fillRect(0,0,W2,H2);
  const verts=[[0,90],[0,-90]];for(let i=0;i<5;i++){verts.push([i*72,26.57]);verts.push([i*72+36,-26.57])}
  const seam=id==="diamante"?"rgba(60,150,200,.7)":"rgba(0,0,0,.35)";
  c.fillStyle=patch;c.strokeStyle=seam;c.lineWidth=1.2;
  for(const [lon,lat] of verts){
    const u=((lon%360)+360)%360/360*W2,v=(90-lat)/180*H2,k=1/Math.max(.28,Math.cos(lat*Math.PI/180));
    if(Math.abs(lat)>80){c.fillRect(0,lat>0?0:H2-17,W2,17);continue}
    for(const du of [-W2,0,W2]){c.beginPath();for(let i=0;i<5;i++){const a=-Math.PI/2+i*Math.PI*2/5;const px=u+du+Math.cos(a)*13*k,py=v+Math.sin(a)*13;i?c.lineTo(px,py):c.moveTo(px,py)}c.closePath();c.fill()}
  }
  // costuras entre pentágonos vizinhos
  c.strokeStyle=seam;c.lineWidth=1;
  for(let i=0;i<5;i++){const u1=i*72/360*W2,u2=(i*72+36)/360*W2,u3=((i+1)*72)/360*W2,vU=(90-26.57)/180*H2,vL=(90+26.57)/180*H2;
    c.beginPath();c.moveTo(u1,vU+10);c.lineTo(u2,vL-10);c.lineTo(u3,vU+10);c.stroke();c.beginPath();c.moveTo(u1,vU-12);c.lineTo(u1,20);c.stroke();c.beginPath();c.moveTo(u2,vL+12);c.lineTo(u2,H2-20);c.stroke()}
  R.S.ballTex.needsUpdate=true;
}
function colorOf(hex){return new T.Color(hex)}

function drawGL(c,V){
  if(!R.S||R.matchG!==G)buildScene();
  const S=R.S;
  updateCam(V.ball);
  const shake=G.shake>0&&!PREF.reduceFx,sx=shake?rnd(-1,1)*G.shake*9:0,sy=shake?rnd(-1,1)*G.shake*9:0;
  setCamera(sx,sy);
  ballCanvas();gballApply(S);
  { const ex=G.state==="goal"||(G.crowdPulse||0)>.2,fi=PREF.reduceFx?0:Math.floor(performance.now()/1000*(ex?8:3))%2;S.stand.material.map=S.crowdTex[Math.min(fi,S.crowdTex.length-1)] }
  // onda do público
  if(!PREF.reduceFx){S.wave.visible=true;S.wt.offset.x=-(performance.now()/1000*160/(W+400))%1}else S.wave.visible=false;
  // balizas: rede a abanar
  for(const g of S.goals){const gx=g.position.x;let k=1;if(G.net&&G.net.x===gx){const bul=G.net.amp*12*(.75+.25*Math.sin(performance.now()/90));k=1+bul/26*1.4}g.userData.net.scale.x=k}
  // jogadores 3D
  const mk=cosm("marker").c;S.ctrlRing.material.color.set(mk);
  let scorer=null;if(G.state==="goal"&&!V.replay){if(G._scr===undefined){const ev=G.events[G.events.length-1],t=ev?ev.team:null;let c=G.ball.last&&G.ball.last.team===t?G.ball.last:null;if(!c){let bd=1e9;for(const q of G.players){if(q.off||q.team!==t||q.role==="GK")continue;const d=Math.hypot(q.x-G.ball.x,q.y-G.ball.y);if(d<bd){bd=d;c=q}}}G._scr=c}scorer=G._scr}else G._scr=undefined;
  const list=V.players,now=performance.now(),dtp=Math.min(.1,(now-(R.lastT||now))/1000),tsec=now/1000;R.lastT=now;
  for(let i=0;i<list.length;i++){
    const p=list[i],h=S.humans[i],gp=G.players[i];if(glbReady()&&!h.gl)attachGlb(h);
    if(p.off){h.root.visible=false;continue}
    if(G.setp&&G.setp.kind==="throw"&&G.setp.taker===gp)gp._thr=now+900;
    h.root.visible=true;
    const lk=[gp.team,gp.num,gp.name,gp.role].join("|");
    if(h.key!==lk){h.key=lk;setLook(h,{kit:kitOf(gp.team),code:G.teams[gp.team].s,gk:gp.role==="GK",gkShirt:gp.team===0?"#22c3b5":"#ff8a3d",ref:false,skin:SKIN[i%SKIN.length],hairStyle:(i*7+gp.team*3+gp.num)%6,hairCol:HAIR[(i+gp.num)%HAIR.length],beard:(i+gp.num)%5===1,name:gp.name,num:gp.num})}
    if(h.crestWait&&((R.fr=(R.fr||0)+1)%45===0)){const l=h.crestLook;h.crestTex.image=crestCanvas(l);h.crestTex.needsUpdate=true;h.crestWait=!l.crestOK}
    const spd=V.replay?(p.vx?1.6:0):Math.hypot(p.vx||0,p.vy||0);
    poseHuman(h,{x:p.x,y:p.y,fx:p.fx,fy:p.fy,spd,sprint:!!p.sprinting,run:p.run||0,kick:V.replay?0:(p.kickAnim||0),slide:!V.replay&&p.dash>0&&p.tackling,down:p.stun>0,gk:gp.role==="GK",vx:V.replay?0:p.vx,vy:V.replay?0:p.vy,lookX:V.ball.x,lookY:V.ball.y,celebrate:scorer===gp,throwIn:now<(gp._thr||0),hasBall:G.ball.owner===gp,kickType:(G.ball.pend&&G.ball.pend.type==="shot")?"shot":"pass",jump:p.gkJump>0?p.gkJump:0,dive:p.dive?{t:p.dive.t,side:-p.dive.side*(p.fx<0?-1:1)}:null},dtp,tsec);
  }
  // sombra do chão por jogador e bola
  // (a sombra elíptica já é desenhada no sprite)
  // bola
  const b=V.ball;
  S.ballSp.position.set(b.x,BALL_R,b.y);
  {const pb=S.bprev,dx=pb?b.x-pb.x:0,dy=pb?b.y-pb.y:0,dd=Math.hypot(dx,dy);
   if(pb&&dd>.001&&dd<70){S.bq=S.bq||new T.Quaternion();S.bax=S.bax||new T.Vector3();S.bax.set(dy,0,-dx).normalize();S.bq.setFromAxisAngle(S.bax,dd/BALL_R);S.ballSp.quaternion.premultiply(S.bq)}
   S.bprev={x:b.x,y:b.y}}
  S.ballShadow.visible=true;S.ballShadow.position.set(b.x+.7,.2,b.y);S.ballShadow.scale.set(1.15,.55,1);
  S.hot.visible=!!V.hot;if(V.hot)S.hot.position.set(b.x,4,b.y);
  const tr=V.trail||[];
  for(let i=0;i<S.trail.length;i++){const s=S.trail[i];if(i<tr.length){const a=(i+1)/tr.length;s.visible=true;s.position.set(tr[i].x,3,tr[i].y);s.material.opacity=a*.5;s.material.color.set(V.hot?(i%2?0xff5a1f:0xffb020):0xffffff);const sz=(2.5*a+.5)*.9*2;s.scale.set(sz,sz,1)}else s.visible=false}
  // marcadores no chão
  const cc=V.ctrl;
  if(cc&&!cc.off){S.ctrlRing.visible=true;S.ctrlRing.position.set(cc.x,.15,cc.y);S.ctrlRing.material.opacity=.75}else S.ctrlRing.visible=false;
  const pt=!V.replay&&G.passTarget&&!G.passTarget.off?G.passTarget:null;
  if(pt){S.passRing.visible=true;S.passRing.position.set(pt.x,.2,pt.y);S.passSpin.rotation.z=performance.now()/1500}else S.passRing.visible=false;
  if(G.tut&&G.tut.marker){const m=G.tut.marker,pl=1+Math.sin(performance.now()/180)*.12;S.tutRing.visible=S.tutFill.visible=true;S.tutRing.position.set(m.x,.15,m.y);S.tutFill.position.set(m.x,.1,m.y);S.tutRing.scale.set(pl,pl,1);S.tutFill.scale.set(pl,pl,1)}else S.tutRing.visible=S.tutFill.visible=false;
  // árbitro 3D
  const rh=S.humans[12];if(glbReady()&&!rh.gl)attachGlb(rh);
  if(R.refActive&&!V.replay&&!G.tut&&G.ref){const r=G.ref;if(r.vx==null){r.vx=r.vy=0;r.run=0;r.fx=1;r.fy=0}
    if(rh.key!=="ref"){rh.key="ref";setLook(rh,{kit:{shirt:"#16181b",accent:"#16181b",shorts:"#16181b",socks:"#16181b",sleeve:"#16181b",trim:"#e8c61b",pattern:0},code:"",gk:false,ref:true,skin:SKIN[2],hairStyle:2,hairCol:HAIR[0],beard:false,name:"",num:""})}
    rh.root.visible=true;poseHuman(rh,{x:r.x,y:r.y,fx:r.fx||1,fy:r.fy||0,spd:Math.hypot(r.vx||0,r.vy||0),sprint:false,run:r.run||0,kick:0,slide:false,down:false,gk:false},dtp,tsec)}else rh.root.visible=false;
  // luz que acompanha a câmara
  S.sun.target.position.set(camX,0,camY);S.sun.position.set(camX-280,560,camY+320);
  if(S.crowd)gstCrowdTick(S,dtp);
  if(S.ecra&&((S.ecra.t+=dtp)>.5)){S.ecra.t=0;gstDrawScreen(S)}
  R.gl.render(S.scene,S.cam);
  return {sx,sy};
}

/* ---------- camada 2D transparente por cima ---------- */
function overlay(c,V,sh){
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,canvas.width,canvas.height);
  TU(c);{const dayV=PREF.daytime==="day",vg=c.createRadialGradient(VW/2,VH*.52,VH*.34,VW/2,VH*.52,Math.max(VW,VH)*.78);vg.addColorStop(0,"rgba(0,0,0,0)");vg.addColorStop(1,dayV?"rgba(0,20,40,.16)":"rgba(0,0,0,.36)");c.fillStyle=vg;c.fillRect(0,0,VW,VH);
   if(!PREF.reduceFx&&!dayV){c.save();c.globalCompositeOperation="lighter";const lg=c.createLinearGradient(0,0,0,VH*.5);lg.addColorStop(0,"rgba(255,244,214,.07)");lg.addColorStop(1,"rgba(255,244,214,0)");c.fillStyle=lg;c.fillRect(0,0,VW,VH*.5);c.restore()}}
  TF(c);c.translate(sh.sx,sh.sy);
  const mk=cosm("marker").c;
  if(!PCAM()){
  // seta, energia e carga do jogador controlado
  if(V.ctrl&&!V.ctrl.off){
    const p=V.ctrl,P=proj(p.x,p.y,0),s=P.s*.95,ty=P.y-33*s;
    c.fillStyle=mk;c.beginPath();c.moveTo(P.x-6,ty-7);c.lineTo(P.x+6,ty-7);c.lineTo(P.x,ty+2);c.closePath();c.fill();
    if(!V.replay){const w=36,e=p.energy,by=P.y+5;c.fillStyle="rgba(0,0,0,.55)";c.beginPath();c.roundRect?c.roundRect(P.x-w/2,by,w,5,2.5):c.rect(P.x-w/2,by,w,5);c.fill();
      c.fillStyle=p.tired?"#d7263d":e<.3?"#f2b705":"#2fe0c4";c.beginPath();c.roundRect?c.roundRect(P.x-w/2,by,w*e,5,2.5):c.rect(P.x-w/2,by,w*e,5);c.fill();
      if(V.charging){c.fillStyle="rgba(0,0,0,.55)";c.fillRect(P.x-w/2,ty-16,w,5);c.fillStyle=G.charge>.85?"#d7263d":"#f2b705";c.fillRect(P.x-w/2,ty-16,w*G.charge,5)}}
  }
  // nomes (jogador controlado e quem tem a bola) e cartão do árbitro
  if(!V.replay){
    const named=[];if(V.ctrl&&!V.ctrl.off)named.push([V.ctrl,24]);const ow=G.ball.owner;if(ow&&ow!==V.ctrl&&!ow.off)named.push([ow,14]);
    for(const [p,dy] of named){const gp=G.players.find(q=>q.i===p.i&&q.team===p.team)||p,P=proj(p.x,p.y,0),fs=Math.max(11,Math.min(18,P.s*7.4)),txt=String(gp.name||"");
      c.font="700 "+fs+"px 'Barlow Condensed','Arial Narrow',sans-serif";c.textAlign="center";c.textBaseline="middle";c.lineWidth=3.2;c.lineJoin="round";c.strokeStyle="rgba(0,0,0,.78)";
      const y=P.y+dy;c.strokeText(txt,P.x,y);c.fillStyle=p===V.ctrl?"#ffffff":(gp.team===0?"#ffe08a":"#ff9aa6");c.fillText(txt,P.x,y)}
    if(G.refCard&&G.ref&&G.t<G.refCard.until){const P=proj(G.ref.x,G.ref.y,0),k=P.s*.95;c.fillStyle=G.refCard.color;c.fillRect(P.x+8*k,P.y-40*k,6*k,9*k)}
  }
  // partículas projetadas
  for(const q of G.parts){const a=Math.max(0,q.life/q.max),z=q.k==="conf"?a*70:q.k==="cam"?40:2,pp=proj(q.x,q.k==="cam"?Y0-90:q.y,z),k=pp.s*.6;
    if(q.k==="conf"){c.save();c.translate(pp.x,pp.y);c.rotate(q.rot);c.globalAlpha=Math.min(1,a*2);c.fillStyle=q.col;c.fillRect(-q.size*k/2,-q.size*k/4,q.size*k,q.size*k/2*(.35+Math.abs(Math.sin(q.rot*2))));c.restore()}
    else if(q.k==="ring"){c.globalAlpha=a;c.strokeStyle=q.col;c.lineWidth=2.5;c.beginPath();c.ellipse(pp.x,pp.y,(q.size+(1-a)*22)*k,(q.size+(1-a)*22)*k*.45,0,0,Math.PI*2);c.stroke()}
    else if(q.k==="dust"){c.globalAlpha=a*.5;c.fillStyle=q.col;c.beginPath();c.arc(pp.x,pp.y-2*k,q.size*k,0,Math.PI*2);c.fill()}
    else if(q.k==="spark"){c.globalAlpha=a;c.fillStyle=q.col;c.beginPath();c.arc(pp.x,pp.y-3*k,(q.size*a+.5)*k,0,Math.PI*2);c.fill()}
    else if(q.k==="cam"){c.globalAlpha=a;c.fillStyle="#fff";c.beginPath();c.arc(pp.x,pp.y,q.size*.7,0,Math.PI*2);c.fill()}}
  }
  c.globalAlpha=1;
  TU(c);
  if(!PCAM())drawRadar(c,V);
  if(G.flash>0&&!PREF.reduceFx){c.fillStyle=`rgba(255,255,255,${G.flash*.5})`;c.fillRect(0,0,VW,VH)}
  if(V.replay){c.fillStyle="rgba(0,0,0,.55)";c.fillRect(0,0,VW,26);c.fillRect(0,VH-26,VW,26);c.font='22px Bungee,"Arial Black",sans-serif';c.textAlign="left";c.textBaseline="middle";c.fillStyle=FRAME%60<40?"#d7263d":"#7a1220";c.beginPath();c.arc(30,13,6,0,Math.PI*2);c.fill();c.fillStyle="#fff";c.fillText("REPLAY",44,14)}
  drawMsg(c);
}

/* ---------- ligação ao jogo ---------- */
const _renderTV=renderTV;
renderTV=function(c,V){
  if(!R||!R.ok)return _renderTV(c,V);
  R.glCanvas.style.visibility="visible";
  const sh=drawGL(c,V);overlay(c,V,sh);
};
const _render=render;
render=function(){
  if(!G||!canvas)return;
  const top=PREF.camera==="top";
  if(R&&R.glCanvas)R.glCanvas.style.visibility=(top||!R.ok)?"hidden":"visible";
  if(G.tv&&G.tv.crowdFrames&&!(R&&R.ok&&!top)){const ex=G.state==="goal"||(G.crowdPulse||0)>.2;G.tv.crowd=G.tv.crowdFrames[PREF.reduceFx?0:Math.floor(performance.now()/1000*(ex?8:3))%2]}
  // interpolação entre passos fixos de 60 Hz (movimento fluido em qualquer taxa de atualização)
  const a=(G.paused||G.state==="replay"||G.state==="half"||G.state==="end")?1:Math.max(0,Math.min(1,acc/DT)),saved=[];
  const lerp=(o)=>{if(o.ox==null)return;const dx=o.x-o.ox,dy=o.y-o.oy;if(dx*dx+dy*dy>3600)return;saved.push(o,o.x,o.y);o.x=o.ox+dx*a;o.y=o.oy+dy*a};
  if(a<1){for(const p of G.players)lerp(p);lerp(G.ball)}
  R&&(R.refActive=!top&&R.ok);
  try{_render()}finally{for(let i=0;i<saved.length;i+=3){saved[i].x=saved[i+1];saved[i].y=saved[i+2]}}
};
const _step=step;
step=function(){if(G){for(const p of G.players){p.ox=p.x;p.oy=p.y}G.ball.ox=G.ball.x;G.ball.oy=G.ball.y}_step()};
const _resize=resize;
resize=function(){_resize();if(R&&R.glCanvas&&canvas){
  const cw=parseFloat(canvas.style.width)||canvas.clientWidth,ch=parseFloat(canvas.style.height)||canvas.clientHeight;R.cw=cw;R.ch=ch;
  R.gl.setPixelRatio(DPR);R.gl.setSize(cw,ch,false);R.glCanvas.style.width=cw+"px";R.glCanvas.style.height=ch+"px"}};
window.__refSkip=()=>!!(R&&R.ok&&R.refActive&&PREF.camera!=="top");

start3D=function(){
  stop3D();
  try{
    const gc=document.createElement("canvas");gc.id="glc";gc.style.cssText="position:absolute;left:0;top:0;pointer-events:none;z-index:0";
    const gl=new T.WebGLRenderer({canvas:gc,antialias:true,alpha:false,powerPreference:"high-performance"});
    gl.setClearColor(0x09130e,1);
    R={gl,glCanvas:gc,ok:true,S:null,matchG:null,cw:1,ch:1,refActive:false};
    document.getElementById("stage").prepend(gc);
    canvas.style.cssText+=";position:relative;z-index:1;background:transparent";
    glbLoad();
    gc.addEventListener("webglcontextlost",e=>{e.preventDefault();if(R)R.ok=false;gc.style.visibility="hidden"});
  }catch(err){console.warn("WebGL indisponível:",err);R=null}
};
stop3D=function(){
  if(!R)return;
  try{if(R.S){R.S.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m.map)m.map.dispose();m.dispose()})}});R.S.humans.forEach(h=>{if(h.shirtTex)h.shirtTex.dispose();if(h.crestTex)h.crestTex.dispose()})}
    R.gl.dispose();const e=R.gl.getExtension("WEBGL_lose_context");if(e)e.loseContext()}catch(err){}
  GLBM.mats={};GLBM.tex={};
  if(R.glCanvas)R.glCanvas.remove();R=null;
};
})();

