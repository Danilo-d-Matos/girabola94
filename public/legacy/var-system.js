/* Fora de jogo e VAR.
   - Ao ser feito um passe, guarda-se quem estava em posição irregular. Se um deles receber a bola, é fora de jogo.
   - Impedimentos por pouco podem passar ao fiscal; faltas também. Se desses lances sair golo, o VAR revê. */
(function(){
"use strict";
function active(){return typeof G!=="undefined"&&G&&(!G.tut||G.tut.allowOff)&&PREF.offsideVar!==false}
var _kick=kick;
kick=function(p){var r=_kick.apply(this,arguments);try{snap(p)}catch(e){}return r};
function snap(p){
  G.offs=null;if(!active()||p.off||G.pen)return;
  var sk=G.setp&&G.setp.kind;if(sk==="throw"||sk==="goalkick"||sk==="corner")return;
  var t=p.team,s=sd(t)===0?1:-1,b=G.ball,a=-1e9,b2=-1e9,i,q;
  for(i=0;i<G.players.length;i++){q=G.players[i];if(q.off||q.team===t)continue;var v=s*q.x;if(v>a){b2=a;a=v}else if(v>b2)b2=v}
  var ref=Math.max(s*W/2,s*b.x,b2),set=new Map();
  for(i=0;i<G.players.length;i++){q=G.players[i];if(q.off||q.team!==t||q===p||q.role==="GK")continue;var m=s*q.x-ref;if(m>4)set.set(q,m)}
  if(set.size)G.offs={team:t,set:set,lineX:s*b2,time:G.t};
}
window.checkOffside=function(q){
  var o=G.offs;if(!o||!active())return false;
  var pd=G.ball.pend;
  if(q.team!==o.team){G.offs=null;return false}
  if(!pd||pd.type!=="pass"||q===pd.from||G.t-o.time>7||q.role==="GK")return false;
  var m=o.set.get(q);if(m==null)return false;
  G.offs=null;
  if(m<6){return false}      // margem mínima de tolerância (≈ 40 cm): o benefício é do atacante; acima disso o fiscal assinala sempre
  callOffside(q,o);return true;
};
function callOffside(q,o){
  if(G.tut){G.tut.offDone=true;G.offLine={lineX:o.lineX,px:q.x,py:q.y,team:q.team,name:q.name,until:performance.now()+2600,label:"FORA DE JOGO"};G.ball.vx=G.ball.vy=0;G.ball.owner=null;G.ball.pend=null;G.msg="Fora de jogo!";G.msgSub="Passa ao colega que está em jogo";try{sfx("whistle")}catch(e){}return}
  var laws=discipline();laws[q.team].offsides=(laws[q.team].offsides||0)+1;
  G.varNote=null;
  G.offLine={lineX:o.lineX,px:q.x,py:q.y,team:q.team,name:q.name,until:performance.now()+3400,label:"FORA DE JOGO"};
  startSetPiece("freekick",1-q.team,clamp(q.x,X0+12,X1-12),clamp(q.y,Y0+12,Y1-12));
  G.msg="Fora de jogo";G.msgSub=q.name+" · "+G.teams[q.team].s;
  if(G.setp)G.setp.indirect=true;
  try{crowdEvent("foul")}catch(e){}
}
/* ---------- VAR ---------- */
var _goal=goal;
goal=function(t){
  if(!active()||G.varDone===true||G.state==="var")return _goal.apply(this,arguments);
  var n=G.varNote;
  if(!n||n.team!==t||G.t-n.t>16)return _goal.apply(this,arguments);
  var disallow=n.type==="offside"?true:!!n.reck;      // o VAR anula se a entrada foi descoordenada (de lado ou a grande velocidade)
  G.state="var";G.var={t:t,note:n,disallow:disallow,tm:0,shown:false};
  G.msg="VAR";G.msgSub="A verificar o golo…";G.charging=false;G.charge=0;G.passTarget=null;
  G.offLine=null;try{sfx("ui")}catch(e){}
};
function varTick(){
  var v=G.var;if(!v)return;v.tm+=DT;
  if(v.tm>=2.8&&!v.shown){
    v.shown=true;
    if(v.disallow){G.msg="GOLO ANULADO";G.msgSub=v.note.type==="offside"?"Fora de jogo de "+v.note.player.name:"Falta de "+v.note.player.name;try{sfx("whistle");crowdEvent("foul")}catch(e){}}
    else{G.msg="GOLO VÁLIDO";G.msgSub="Sem infração";try{sfx("ok")}catch(e){}}
  }
  if(v.tm>=5.4){
    var n=v.note,t=v.t;G.var=null;G.varNote=null;
    if(v.disallow){
      G.ball.pend=null;
      if(n.type==="offside")G.offLine={lineX:n.lineX,px:n.x,py:n.y,team:n.team,name:n.player.name,until:performance.now()+3000,label:"FORA DE JOGO"};
      startSetPiece("freekick",1-t,clamp(n.x,X0+12,X1-12),clamp(n.y,Y0+12,Y1-12));
      G.msg="Livre · golo anulado";G.msgSub=G.teams[1-t].n;
    }else{G.varDone=true;try{goal(t)}finally{G.varDone=false}}
  }
}
var _step=step;
step=function(){_step.apply(this,arguments);if(G&&!G.paused){if(G.state==="var")varTick();else if(G.state==="pen")penStep();if(G.fkWallT>0){G.fkWallT-=DT;if(G.fkWallT<=0)G.players.forEach(function(p){p.wall=false})}}};
/* ---------- gráficos sobre o campo ---------- */
function varGfx(c){
  if(!G)return;
  var show=null,now=performance.now(),v=G.state==="var"?G.var:null;
  if(v)show=v.note;else if(G.offLine&&now<G.offLine.until)show=G.offLine;
  if(!show)return;
  var off=show.type==="foul"?null:show;
  c.save();TF(c);
  var P,Q,pts,k=.5+.5*Math.sin(now/180);
  if(show.type==="foul"){
    var a=show.player,b=show.victim;
    c.lineWidth=3;c.strokeStyle="rgba(255,225,60,"+(.65+.3*k)+")";
    [a,b].forEach(function(p){P=proj(p.x,p.y,0);c.beginPath();c.ellipse(P.x,P.y,15*P.s,6.5*P.s,0,0,Math.PI*2);c.stroke()});
    var A=proj(a.x,a.y,0),B=proj(b.x,b.y,0);c.setLineDash([6,5]);c.beginPath();c.moveTo(A.x,A.y);c.lineTo(B.x,B.y);c.stroke();c.setLineDash([]);
  }else{
    var lx=off.lineX,px=off.px,py=off.py;
    // faixa entre a linha do último defesa e o atacante
    pts=[proj(lx,Y0,0),proj(lx,Y1,0),proj(px,Y1,0),proj(px,Y0,0)];
    c.beginPath();pts.forEach(function(p,i){i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y)});c.closePath();c.fillStyle="rgba(215,38,61,"+(.14+.08*k)+")";c.fill();
    c.lineWidth=2.4;
    P=proj(lx,Y0,0);Q=proj(lx,Y1,0);c.strokeStyle="rgba(255,255,255,.95)";c.beginPath();c.moveTo(P.x,P.y);c.lineTo(Q.x,Q.y);c.stroke();
    P=proj(px,Y0,0);Q=proj(px,Y1,0);c.strokeStyle="rgba(255,70,90,.95)";c.beginPath();c.moveTo(P.x,P.y);c.lineTo(Q.x,Q.y);c.stroke();
    P=proj(px,py,0);c.lineWidth=3;c.strokeStyle="rgba(255,70,90,"+(.7+.3*k)+")";c.beginPath();c.ellipse(P.x,P.y,16*P.s,7*P.s,0,0,Math.PI*2);c.stroke();
  }
  c.restore();
  // rótulos
  var txt=show.type==="foul"?"CONTACTO":(show.label||"FORA DE JOGO"),pp=show.type==="foul"?show.victim:{x:show.px,y:show.py};
  var L=proj(pp.x,pp.y,0);c.save();TF(c);
  c.font="700 "+Math.max(13,Math.min(24,L.s*10))+"px 'Rajdhani','Arial Narrow',sans-serif";c.textAlign="center";c.textBaseline="middle";c.lineWidth=4;c.lineJoin="round";c.strokeStyle="rgba(0,0,0,.8)";
  var ty=L.y-46*L.s;c.strokeText(txt,L.x,ty);c.fillStyle=show.type==="foul"?"#ffe13c":"#ff5a6e";c.fillText(txt,L.x,ty);
  c.restore();
}
function varBadge(c){
  if(!G||G.state!=="var"||!G.var)return;
  var now=performance.now(),v=G.var;
  TU(c);c.save();
  c.fillStyle="rgba(8,22,40,.22)";c.fillRect(0,0,VW,VH);
  var y=((now/1400)%1)*VH;c.fillStyle="rgba(120,200,255,.07)";c.fillRect(0,y,VW,3);
  var x=14,yy=60,w=214,h=54;
  c.fillStyle="rgba(8,18,32,.92)";c.strokeStyle="#47677a";c.lineWidth=2;c.beginPath();if(c.roundRect)c.roundRect(x,yy,w,h,12);else c.rect(x,yy,w,h);c.fill();c.stroke();
  c.font='700 28px Rajdhani,"Arial Narrow",sans-serif';c.fillStyle="#fff";c.textAlign="left";c.textBaseline="middle";c.fillText("VAR",x+14,yy+h/2+1);
  if(!v.shown){c.fillStyle=(now%700<420)?"#d7263d":"#661522";c.beginPath();c.arc(x+98,yy+h/2,6,0,Math.PI*2);c.fill();c.font="700 17px 'Rajdhani','Arial Narrow',sans-serif";c.fillStyle="#cfe3f2";c.fillText("A VERIFICAR",x+110,yy+h/2+1)}
  else{c.font="700 17px 'Rajdhani','Arial Narrow',sans-serif";c.fillStyle=v.disallow?"#ff6b7e":"#7df2a6";c.fillText(v.disallow?"ANULADO":"CONFIRMADO",x+98,yy+h/2+1)}
  c.restore();
}
/* ---------- penálti, câmara de penálti e desempate da Taça ---------- */
/* livre direto perto da baliza: barreira, guarda-redes e câmara por trás do marcador */
function fkInRange(team,x,y){
  if(G.shoot||G.tut)return false;
  var gx=sd(team)===0?X1:X0,dd=Math.hypot(gx-x,H/2-y);
  return dd>150&&dd<340&&Math.abs(y-H/2)<230;
}
function startFK(team,x,y){
  var b=G.ball,gx=sd(team)===0?X1:X0,dir=sd(team)===0?1:-1;
  var gk=G.players.find(function(p){return p.team!==team&&p.role==="GK"&&!p.off});
  var dx=gx-x,dy=H/2-y,dd=Math.hypot(dx,dy)||1,ux=dx/dd,uy=dy/dd,nx=-uy,ny=ux;
  var taker=nearestOf(team,{x:x,y:y},false)||G.players.find(function(p){return p.team===team&&!p.off});
  var defs=G.players.filter(function(p){return p.team!==team&&!p.off&&p.role!=="GK"});
  var wx=x+ux*Math.min(88,dd*.45),wy=y+uy*Math.min(88,dd*.45),N=Math.min(defs.length,dd<230?5:4);
  defs.sort(function(a,c){return Math.hypot(a.x-wx,a.y-wy)-Math.hypot(c.x-wx,c.y-wy)});
  var wall=defs.slice(0,N);
  G.state="pen";G.charging=false;G.charge=0;G.trail.length=0;G.hot=0;G.passTarget=null;G.setp=null;G.aim=null;
  b.owner=null;b.pend=null;b.vx=b.vy=0;b.x=x;b.y=y;b.lastTeam=team;b.last=taker;
  var ka=0,kd=0;
  G.players.forEach(function(p){
    if(p.off)return;
    p.vx=p.vy=p.dx=p.dy=0;p.stun=0;p.dash=0;p.tackling=false;p.dive=null;p.gkDown=0;p.gkJump=0;p.penPick=null;p.sprint=false;p.wall=false;
    var wi=wall.indexOf(p);
    if(p===taker){p.x=clamp(x-ux*15,X0+8,X1-8);p.y=clamp(y-uy*15,Y0+8,Y1-8);p.fx=ux;p.fy=uy}
    else if(wi>=0){p.x=wx+nx*(wi-(N-1)/2)*21;p.y=wy+ny*(wi-(N-1)/2)*21;p.fx=-ux;p.fy=-uy;p.wall=true}
    else if(p===gk){p.x=gx-dir*8;p.y=H/2+clamp((y-H/2)*.1,-22,22);p.fx=-dir;p.fy=0}
    else if(p.team===team){p.x=clamp(gx-dir*(105+(ka%3)*34),X0+8,X1-8);p.y=clamp(H/2+((ka%5)-2)*46,Y0+8,Y1-8);p.fx=dir;p.fy=0;ka++}
    else{p.x=clamp(gx-dir*(55+(kd%3)*38),X0+8,X1-8);p.y=clamp(H/2+((kd%5)-2)*38+(kd%2?9:-9),Y0+8,Y1-8);p.fx=-dir;p.fy=0;kd++}
  });
  G.pen={team:team,taker:taker,gk:gk,gx:gx,dir:dir,t:0,aim:0,fired:false,fk:true,bx:x,by:y,wall:wall,dd:dd};
  if(team===0)setCtrl(taker);
  sfx("whistle",2);
}
window.fkInRange=fkInRange;window.startFK=startFK;
var _ai=ai;ai=function(p){if(p.wall){p.dx=p.dy=0;return}return _ai.apply(this,arguments)};
function penStep(){
  var pn=G.pen;if(!pn){G.state="play";return}
  pn.t+=DT;var tk=pn.taker;tk.dx=tk.dy=0;
  if(pn.t>1.6&&G.msg&&G.msg.indexOf("Penálti")===0){G.msg="";G.msgSub=""}
  var human=pn.team===0&&!G.auto&&tk===G.ctrl;
  if(human){
    pn.aim+=((input.x||0)*pn.dir-pn.aim)*.25;
    if(pn.t>.7){
      if(input.shootHeld){G.charging=true;G.charge=Math.min(1,G.charge+DT/.9)}
      else if(G.charging){firePen(G.charge);return}
      if(pn.t>9){firePen(.6);return}
    }
  }else if(pn.t>1.9){
    pn.aim=[-.85,-.65,.65,.85,-.45,.45][(Math.random()*6)|0];
    if(pn.team===1&&!G.auto&&pn.gk&&Math.abs(input.x||0)>.4)pn.gk.penPick=H/2+(input.x>0?1:-1)*pn.dir*46;
    firePen(.5+Math.random()*.3);
  }
}
function firePen(c){
  var pn=G.pen,tk=pn.taker,gxp=sd(pn.team)===0?X1+6:X0-6,ty=H/2+pn.aim*(GH/2-14);
  var err=.012+(c>.86?.07:0)+(c<.3?.03:0);
  if(pn.fk){
    err=.016+(c>.9?.05:0)+(c<.3?.035:0)+pn.dd/14000;
    var hitP=c<.3?.55:(c>.9?.14:.08),hit=Math.random()<hitP&&pn.wall.length;
    pn.wall.forEach(function(w){w.gkJump=.6;w.wall=!hit});
    G.fkWallT=1.5;G.penCamB={x:pn.bx,y:pn.by};
    if(hit){var w=pn.wall[(pn.wall.length/2)|0];kick(tk,w.x,w.y,7+c*4,.01)}
    else kick(tk,gxp,ty,8.5+c*5.2,err);
  }else{G.penCamB=null;kick(tk,gxp,ty,8+c*5.5,err)}
  G.ball.pend={type:"shot",team:pn.team,pen:true};G.stats[pn.team].shots++;
  try{crowdEvent("shot")}catch(e){}
  G.penCamUntil=performance.now()+2300;G.penCamTeam=pn.team;
  if(G.shoot){G.shoot.flight=true;G.shoot.ft=0}
  G.pen=null;G.state="play";G.msg="";G.msgSub="";G.charging=false;G.charge=0;
}
function penCamCalc(){
  var on=false,team=0,now=performance.now();
  if(G){
    if(G.state==="pen"&&G.pen){on=true;team=G.pen.team}
    else if(G.shoot){on=true;team=G.shoot.kickTeam}
    else if(now<(G.penCamUntil||0)&&G.state!=="replay"){on=true;team=G.penCamTeam||0}
  }
  var sp=G&&G.state==="setpiece"&&G.setp&&(G.setp.kind==="freekick"||G.setp.kind==="corner"||G.setp.kind==="goalkick")&&G.setp.team===0&&G.setp.taker===G.ctrl&&!G.auto&&!G.shoot,spT=null;   // só nos livres: nos cantos, lançamentos e pontapés de baliza a câmara ficaria dentro da bancada
  if(sp){on=true;team=0;var k=G.setp.kind,s0=sd(0)===0;spT=k==="corner"?{x:s0?X1-70:X0+70,y:H/2,back:72,h:58}:(k==="throw"?{x:G.setp.x,y:H/2}:(k==="goalkick"?{x:W/2,y:H/2,back:78,h:52}:{x:s0?X1:X0,y:H/2,back:124,h:66}))}
  if(PREF.camera==="top")on=false;
  var fkB=spT?{x:G.setp.taker.x,y:G.setp.taker.y}:(G&&G.state==="pen"&&G.pen&&G.pen.fk)?{x:G.pen.bx,y:G.pen.by}:(G&&G.penCamB&&now<(G.penCamUntil||0)?G.penCamB:null);
  var fkM=!spT&&G&&G.state==="pen"&&G.pen&&G.pen.fk||(spT&&G.setp.kind==="freekick");
  window.__penCam=on?{on:true,gx:sd(team)===0?X1:X0,dir:sd(team)===0?1:-1,bx:fkB?fkB.x:null,by:fkB?fkB.y:null,tx:spT?spT.x:null,ty:spT?spT.y:null,back:spT&&spT.back||(fkM?124:null),hh:spT&&spT.h||(fkM?66:null)}:{on:false};
}
var _uc=updateCam;
updateCam=function(){var r=_uc.apply(this,arguments);try{penCamCalc()}catch(e){}return r};
/* desempate por penáltis em campo */
function startShootout(done){
  var sh=G.shoot={done:done,score:[0,0],res:[[],[]],taken:[0,0],idx:[0,0],first:Math.random()<.5?0:1,flight:false,ft:0,wait:0,kickTeam:0,sp:[]};
  G.ended=false;G.paused=false;G.half=2;G.t=1;G.charging=false;G.charge=0;
  try{hideOverlay()}catch(e){}
  G.players.forEach(function(p){sh.sp.push(p.sp);if(p.role!=="GK")p.sp=0;p.dive=null;p.gkDown=0;p.gkJump=0});
  shootNext();
}
function shootNext(){
  var sh=G.shoot,t=sh.taken[0]>sh.taken[1]?1:(sh.taken[1]>sh.taken[0]?0:sh.first);
  sh.kickTeam=t;
  var list=G.players.filter(function(p){return p.team===t&&!p.off&&p.role!=="GK"});
  var taker=list.length?list[sh.idx[t]%list.length]:G.players.find(function(p){return p.team===t&&!p.off});
  sh.idx[t]++;
  G.state="play";startPenalty(t,null,taker,taker);
  G.msg="Penálti · "+G.teams[t].s;G.msgSub=taker.name;
}
function shootRes(kind){
  var sh=G.shoot;if(!sh||!sh.flight)return;
  sh.flight=false;var t=sh.kickTeam,ok=kind==="goal";
  sh.res[t].push(ok?1:0);sh.taken[t]++;if(ok)sh.score[t]++;
  G.state="shootwait";sh.wait=0;G.ball.pend=null;
  G.msg=ok?"GOLO!":(kind==="save"?"DEFENDIDO!":"FORA!");G.msgSub="";
  try{
    if(ok){sfx("goal");crowdEvent("goal");confetti(t,50);G.net={x:sd(t)===0?X1:X0,dir:sd(t)===0?1:-1,y:clamp(G.ball.y,GY0+12,GY1-12),amp:1}}
    else crowdEvent(kind==="save"?"save":"miss");
  }catch(e){}
}
function shootDecided(){
  var sh=G.shoot,k0=sh.taken[0],k1=sh.taken[1],s0=sh.score[0],s1=sh.score[1];
  if(k0<=5&&k1<=5){if(s0>s1+(5-k1))return 0;if(s1>s0+(5-k0))return 1}
  if(k0>=5&&k1>=5&&k0===k1&&s0!==s1)return s0>s1?0:1;
  return -1;
}
function endShootout(w){
  var sh=G.shoot;G.players.forEach(function(p,i){p.sp=sh.sp[i]});
  var done=sh.done,s0=sh.score[0],s1=sh.score[1];
  G.shoot=null;G.state="end";G.ended=true;G.penCamUntil=0;
  G.msg=w===0?"Vitória nos penáltis":"Derrota nos penáltis";G.msgSub=s0+" – "+s1;
  setTimeout(function(){if(G&&G.ended)done(w===0)},1800);
}
function shootTick(){
  var sh=G.shoot;if(!sh)return;
  if(G.state==="play"&&sh.flight){
    sh.ft+=DT;var b=G.ball;
    if(b.owner)shootRes(b.owner.role==="GK"?"save":"miss");
    else if(b.last&&b.last.role==="GK"&&b.lastTeam!==sh.kickTeam&&b.pend==null)shootRes("save");
    else if(sh.ft>1.2&&Math.hypot(b.vx,b.vy)<.4)shootRes("miss");
    else if(sh.ft>4)shootRes("miss");
  }else if(G.state==="shootwait"){
    sh.wait+=DT;
    if(sh.wait>2.3){var w=shootDecided();if(w>=0)endShootout(w);else shootNext()}
  }
}
showPenalties=function(done){startShootout(done)};
var _goal2=goal;
goal=function(t){if(G&&G.shoot){if(G.shoot.flight)shootRes("goal");return}return _goal2.apply(this,arguments)};
var _ssp=startSetPiece;
startSetPiece=function(){if(G&&G.shoot){if(G.shoot.flight)shootRes("miss");return}return _ssp.apply(this,arguments)};
var _step2=step;
step=function(){_step2.apply(this,arguments);if(G&&G.shoot&&!G.paused)shootTick()};
var _hp=humanPass;
humanPass=function(p){var th=input.sprint||input.through;_hp.apply(this,arguments);if(G&&G.tut&&th)G.tut.thru=true};
function penCardGfx(c){
  if(!G)return;
  var now=performance.now(),pcOn=!!(window.__penCam&&window.__penCam.on),pn=G.pen;
  // mira e força do penálti (câmara por trás do marcador)
  if(G.state==="pen"&&pn&&pcOn&&window.__penProject){
    var human=pn.team===0&&!G.auto&&pn.taker===G.ctrl,pulse=.5+.5*Math.sin(now/160);
    TU(c);c.save();
    if(human){
      var ty=H/2+pn.aim*(GH/2-14),P=window.__penProject(pn.gx,ty,9);
      if(P){c.strokeStyle="rgba(255,225,60,"+(.7+.3*pulse)+")";c.lineWidth=3;var r=14*P.s*2.2;c.beginPath();c.arc(P.x,P.y,r,0,Math.PI*2);c.stroke();
        c.beginPath();c.moveTo(P.x-r*1.5,P.y);c.lineTo(P.x+r*1.5,P.y);c.moveTo(P.x,P.y-r*1.5);c.lineTo(P.x,P.y+r*1.5);c.stroke()}
      var bw=260,bx=VW/2-bw/2,by=VH-84;
      if(!window.__sp94){c.fillStyle="rgba(8,18,32,.85)";c.fillRect(bx-3,by-3,bw+6,16);c.fillStyle="#2a3a4a";c.fillRect(bx,by,bw,10);
      c.fillStyle=G.charge>.86?"#ff4d5e":(G.charge>.55?"#f2b705":"#3ddc84");c.fillRect(bx,by,bw*G.charge,10)}
    }
    c.font="700 22px 'Rajdhani','Arial Narrow',sans-serif";c.textAlign="center";c.textBaseline="middle";c.lineWidth=5;c.lineJoin="round";c.strokeStyle="rgba(0,0,0,.75)";
    var hint=human?(pn.t<.7?"Prepara-te…":"← → para apontar · segura REMATE e larga para chutar"):(pn.team===1&&!G.auto?"← → escolhe o lado do mergulho do guarda-redes":"");
    if(hint&&!window.__sp94){c.strokeText(hint,VW/2,VH-44);c.fillStyle="#fff";c.fillText(hint,VW/2,VH-44)}
    c.restore();
  }
  // quadro do desempate
  if(G.shoot){
    var sh=G.shoot,n=Math.max(5,Math.min(9,Math.max(sh.taken[0],sh.taken[1])+(sh.taken[0]>=5&&sh.taken[1]>=5?1:0)));
    var w=n*26+150,h=78,x0=VW/2-w/2,y0=58;
    TU(c);c.save();
    c.fillStyle="rgba(8,18,32,.92)";c.strokeStyle="#47677a";c.lineWidth=2;c.beginPath();if(c.roundRect)c.roundRect(x0,y0,w,h,12);else c.rect(x0,y0,w,h);c.fill();c.stroke();
    c.textBaseline="middle";c.font="700 18px 'Rajdhani','Arial Narrow',sans-serif";
    for(var t=0;t<2;t++){
      var yy=y0+22+t*34;c.textAlign="left";c.fillStyle=sh.kickTeam===t&&G.state!=="shootwait"?"#f6c744":"#cfe3f2";c.fillText(G.teams[t].s,x0+14,yy);
      for(var i=0;i<n;i++){var cx=x0+74+i*26,r=sh.res[t][i];
        if(r===1){c.fillStyle="#3ddc84";c.beginPath();c.arc(cx,yy,8,0,Math.PI*2);c.fill()}
        else if(r===0){c.strokeStyle="#ff6b7e";c.lineWidth=3;c.beginPath();c.moveTo(cx-6,yy-6);c.lineTo(cx+6,yy+6);c.moveTo(cx+6,yy-6);c.lineTo(cx-6,yy+6);c.stroke()}
        else{c.strokeStyle="#6d8aa0";c.lineWidth=2;c.beginPath();c.arc(cx,yy,7,0,Math.PI*2);c.stroke()}}
      c.textAlign="right";c.fillStyle="#fff";c.font="700 24px 'Rajdhani','Arial Narrow',sans-serif";c.fillText(String(sh.score[t]),x0+w-14,yy);c.font="700 18px 'Rajdhani','Arial Narrow',sans-serif"}
    c.restore();
  }
  // cartão mostrado pelo árbitro
  var cs=G.cardShow;
  if(cs&&now<cs.until){
    var life=1-(cs.until-now)/3200,pop=Math.min(1,life*5),fade=Math.min(1,(cs.until-now)/500),col=cs.color==="red"?"#e63238":"#ffe13c";
    if(!pcOn){
      var P2=proj(cs.x,cs.y,0);
      c.save();TF(c);c.globalAlpha=fade;
      var cw=9*P2.s,ch=13*P2.s,cy=P2.y-70*P2.s*pop-8*Math.sin(now/260);
      c.translate(P2.x,cy);c.rotate(-.14+.05*Math.sin(now/300));c.fillStyle="rgba(0,0,0,.35)";c.fillRect(-cw/2+3,-ch/2+4,cw,ch);
      c.fillStyle=col;c.strokeStyle="#111";c.lineWidth=1.6;c.beginPath();if(c.roundRect)c.roundRect(-cw/2,-ch/2,cw,ch,2);else c.rect(-cw/2,-ch/2,cw,ch);c.fill();c.stroke();
      c.restore();
    }
    TU(c);c.save();c.globalAlpha=fade;
    var bx2=14,by2=G.state==="var"?126:60,bw2=272,bh2=58;
    c.fillStyle="rgba(8,18,32,.92)";c.strokeStyle="#47677a";c.lineWidth=2;c.beginPath();if(c.roundRect)c.roundRect(bx2,by2,bw2,bh2,12);else c.rect(bx2,by2,bw2,bh2);c.fill();c.stroke();
    c.fillStyle=col;c.strokeStyle="#111";c.lineWidth=1.5;c.save();c.translate(bx2+30,by2+bh2/2);c.rotate(-.12);c.beginPath();c.rect(-11,-17,22,34);c.fill();c.stroke();c.restore();
    c.textAlign="left";c.textBaseline="middle";c.fillStyle="#fff";c.font="700 22px 'Rajdhani','Arial Narrow',sans-serif";c.fillText((cs.num?cs.num+" · ":"")+cs.name,bx2+56,by2+20);
    c.fillStyle=cs.color==="red"?"#ff7b86":"#ffe98a";c.font="700 17px 'Rajdhani','Arial Narrow',sans-serif";c.fillText(cs.text.toUpperCase(),bx2+56,by2+42);
    c.restore();
  }
}
var _dm=drawMsg;
drawMsg=function(c){try{varGfx(c);varBadge(c);penCardGfx(c)}catch(e){}_dm.apply(this,arguments)};
})();
