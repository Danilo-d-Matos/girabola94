/* ===== Áudio: efeitos, música angolana (semba, kizomba, kuduro) e adeptos reativos =====
   Tudo gerado em tempo real com Web Audio (sem ficheiros de som). */
(function(){
"use strict";
var Aud={ctx:null,ok:false},c=null,master,comp,sfxBus,crowdBus,musicBus,musicGate,noiseBuf,started=false;
function nv(k,d){var v=PREF[k];return typeof v==="number"?v:d}
function init(){
  if(Aud.ctx)return true;var C=window.AudioContext||window.webkitAudioContext;if(!C)return false;
  try{c=new C()}catch(e){return false}
  Aud.ctx=c;
  master=c.createGain();comp=c.createDynamicsCompressor();comp.threshold.value=-16;comp.knee.value=12;comp.ratio.value=4;comp.attack.value=.008;comp.release.value=.25;
  master.connect(comp);comp.connect(c.destination);
  sfxBus=c.createGain();crowdBus=c.createGain();musicBus=c.createGain();musicGate=c.createGain();
  sfxBus.connect(master);crowdBus.connect(master);musicGate.connect(musicBus);concertFx();
  var n=c.sampleRate*2;noiseBuf=c.createBuffer(1,n,c.sampleRate);var d=noiseBuf.getChannelData(0);for(var i=0;i<n;i++)d[i]=Math.random()*2-1;
  Aud.CR=CR;Aud.master=master;Aud.comp=comp;Aud.crowd=crowdBus;Aud.music=musicBus;Aud.sfxBus=sfxBus;Aud.ok=true;buildCrowd();return true;
}
function unlock(){
  if(!init())return;if(c.state==="suspended")c.resume();
  if(!started){started=true;setInterval(tick,90);setInterval(sched,25)}
}
["pointerdown","keydown","touchstart"].forEach(function(ev){addEventListener(ev,unlock,{passive:true})});
/* ---------- utilitários ---------- */
function env(g,t,a,peak,dur,floor){var fl=floor||.0001;g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(fl,t);g.gain.exponentialRampToValueAtTime(Math.max(fl*1.01,peak),t+a);g.gain.exponentialRampToValueAtTime(fl,t+dur)}
function hz(m){return 440*Math.pow(2,(m-69)/12)}
function noiseSrc(t,dur,loop){var s=c.createBufferSource();s.buffer=noiseBuf;s.loop=!!loop;s.playbackRate.value=.8+Math.random()*.4;s.start(t,Math.random()*1.2);if(!loop)s.stop(t+dur+.05);return s}
/* Música com som de estádio vazio / concerto: reverberação grande e abafada (impulso de ruído a decair, ~3 s, sem agudos),
   eco de 350 ms (2 repetições, −12 dB) e filtro passa-baixo a 7 kHz; seco −4 dB, molhado −2 dB. */
/* efeito de estádio vazio: ligado/desligado e intensidade (0–100) vêm da área de administração */
Aud.efeito={on:true,nivel:100};
Aud.setEfeito=function(on,nivel){
  if(typeof on==="boolean")Aud.efeito.on=on;if(typeof nivel==="number"&&nivel>=0&&nivel<=100)Aud.efeito.nivel=nivel;
  var cn=Aud.concert;if(!cn||!c)return;var k=Aud.efeito.on?Aud.efeito.nivel/100:0,t=c.currentTime;
  cn.dry.gain.setTargetAtTime(1-.37*k,t,.3);cn.wet.gain.setTargetAtTime(.8*k,t,.3);cn.eco.gain.setTargetAtTime(.25*k,t,.3);
};
function concertFx(){
  var sr=c.sampleRate,len=Math.floor(sr*3.2),ir=c.createBuffer(2,len,sr);
  for(var ch=0;ch<2;ch++){var d=ir.getChannelData(ch),lp=0;for(var i=0;i<len;i++){var t=i/len,w=(Math.random()*2-1)*Math.pow(1-t,2.6);lp+=(w-lp)*(.55-.4*t);d[i]=lp*(i<sr*.02?i/(sr*.02):1)}}
  var dry=c.createGain(),rev=c.createConvolver(),wet=c.createGain(),dl=c.createDelay(1),fb=c.createGain(),eco=c.createGain(),air=c.createBiquadFilter();
  dry.gain.value=.63;wet.gain.value=.8;rev.buffer=ir;dl.delayTime.value=.35;fb.gain.value=.25;eco.gain.value=.25;air.type="lowpass";air.frequency.value=7000;air.Q.value=.7;
  musicBus.connect(dry);dry.connect(air);
  musicBus.connect(rev);rev.connect(wet);wet.connect(air);
  musicBus.connect(dl);dl.connect(fb);fb.connect(dl);dl.connect(eco);eco.connect(air);
  air.connect(master);Aud.concert={dry:dry,wet:wet,eco:eco};Aud.setEfeito();
}
function nburst(out,t,o){var s=noiseSrc(t,o.dur),f=c.createBiquadFilter(),g=c.createGain();f.type=o.type||"bandpass";f.frequency.value=o.f||2000;f.Q.value=o.q||1;if(o.f1)f.frequency.exponentialRampToValueAtTime(o.f1,t+o.dur);s.connect(f);f.connect(g);g.connect(out);env(g,t,o.a||.004,o.peak||.3,o.dur);return g}
function tone(out,t,o){var os=c.createOscillator(),g=c.createGain();os.type=o.type||"sine";os.frequency.setValueAtTime(o.f0,t);if(o.f1)os.frequency.exponentialRampToValueAtTime(o.f1,t+(o.sw||o.dur));os.connect(g);var last=g;if(o.lp){var f=c.createBiquadFilter();f.type="lowpass";f.frequency.value=o.lp;g.disconnect();g.connect(f);last=f}last.connect(out);env(g,t,o.a||.004,o.peak||.3,o.dur);os.start(t);os.stop(t+o.dur+.05);return os}
/* ---------- efeitos sonoros ---------- */
function sfx(k,v){
  if(!PREF.sound)return;if(!c||c.state!=="running")return;
  if(Aud.menuOn&&(k==="ui"||k==="popin"||k==="popout"))return;   // substituídos por audio-menu.js
  if(Aud.sample&&Aud.sample(k,v))return;
  var t=c.currentTime,out=sfxBus;
  switch(k){
    case "kick":{var p=Math.min(1,.25+(v||6)/13);tone(out,t,{f0:190,f1:55,sw:.09,dur:.14,peak:.34*p,type:"sine"});nburst(out,t,{type:"highpass",f:1800,dur:.035,peak:.16*p});if((v||0)>9.6)nburst(out,t,{type:"bandpass",f:700,q:.8,dur:.18,peak:.12*p,f1:300});break}
    case "tackle":nburst(out,t,{type:"lowpass",f:1100,dur:.2,peak:.38,f1:300});tone(out,t,{f0:110,f1:60,dur:.14,peak:.25});break;
    case "switch":tone(out,t,{type:"triangle",f0:880,dur:.07,peak:.12});break;
    case "ui":tone(out,t,{type:"triangle",f0:1200,f1:900,dur:.05,peak:.07});break;
    case "popin":tone(out,t,{type:"sine",f0:420,f1:840,dur:.16,peak:.1});tone(out,t+.05,{type:"triangle",f0:1260,dur:.1,peak:.05});break;
    case "popout":tone(out,t,{type:"sine",f0:700,f1:350,dur:.12,peak:.08});break;
    case "post":tone(out,t,{type:"sine",f0:900,dur:.7,peak:.28});tone(out,t,{type:"sine",f0:1620,dur:.5,peak:.14});nburst(out,t,{type:"highpass",f:3000,dur:.05,peak:.2});break;
    case "net":nburst(out,t,{type:"bandpass",f:2200,q:.7,dur:.5,peak:.22,f1:700,a:.03});break;
    case "save":nburst(out,t,{type:"lowpass",f:1600,dur:.12,peak:.34});tone(out,t,{f0:150,f1:80,dur:.12,peak:.28});break;
    case "card":nburst(out,t,{type:"bandpass",f:3200,q:3,dur:.08,peak:.2});nburst(out,t+.07,{type:"bandpass",f:3800,q:3,dur:.08,peak:.2});break;
    case "whistle":{var n=Math.max(1,Math.min(3,Math.round(v||1)));for(var i=0;i<n;i++){var t0=t+i*.32,d=(i===n-1&&n>1)?.55:.26,os=c.createOscillator(),lf=c.createOscillator(),lg=c.createGain(),g=c.createGain();
      os.type="sine";os.frequency.value=2750;lf.frequency.value=30;lg.gain.value=170;lf.connect(lg);lg.connect(os.frequency);os.connect(g);g.connect(out);env(g,t0,.02,.2,d);os.start(t0);lf.start(t0);os.stop(t0+d+.03);lf.stop(t0+d+.03);
      nburst(out,t0,{type:"bandpass",f:3100,q:2,dur:d,peak:.05})}break}
    case "goal":if(G)goalFx();else fanfare();break;
    case "ok":tone(out,t,{type:"triangle",f0:660,dur:.09,peak:.1});tone(out,t+.09,{type:"triangle",f0:990,dur:.14,peak:.1});break;
  }
}
function fanfare(){if(!c)return;var t=c.currentTime;[[523,0],[659,.1],[784,.2],[1047,.32]].forEach(function(p){tone(sfxBus,t+p[1],{type:"sawtooth",f0:p[0],dur:.5,peak:.08,lp:2400})})}
/* ---------- adeptos ---------- */
var CR={exc:.12,cheer:0,groan:0,tension:0,boo:0,murmur:null,voices:[],claps:0,nextBeat:0,beat:0,chant:0};
function buildCrowd(){
  var m=c.createGain(),n=noiseSrc(c.currentTime,0,true),f1=c.createBiquadFilter(),f2=c.createBiquadFilter();
  f1.type="bandpass";f1.frequency.value=480;f1.Q.value=.7;f2.type="lowpass";f2.frequency.value=2400;n.connect(f1);f1.connect(f2);f2.connect(m);m.gain.value=0;m.connect(crowdBus);CR.murmur=m;
  var hi=c.createGain(),n2=noiseSrc(c.currentTime,0,true),h=c.createBiquadFilter();h.type="bandpass";h.frequency.value=1700;h.Q.value=.5;n2.connect(h);h.connect(hi);hi.gain.value=0;hi.connect(crowdBus);CR.hiss=hi;
  for(var i=0;i<7;i++){var os=c.createOscillator(),g=c.createGain(),a=c.createBiquadFilter(),b=c.createBiquadFilter(),lf=c.createOscillator(),lg=c.createGain();
    os.type="sawtooth";os.frequency.value=135+i*26;lf.frequency.value=4+Math.random()*3;lg.gain.value=4;lf.connect(lg);lg.connect(os.frequency);
    a.type="bandpass";a.frequency.value=700;a.Q.value=5;b.type="bandpass";b.frequency.value=1150;b.Q.value=6;
    os.connect(a);os.connect(b);a.connect(g);b.connect(g);g.gain.value=0;g.connect(crowdBus);os.start();lf.start();CR.voices.push({os:os,g:g,a:a,b:b,base:135+i*26})}
}
function crowdEvent(kind){
  if(typeof G==="undefined"||!G||!c)return;
  var smp=!!(Aud.crowdSample&&Aud.crowdSample(kind));   // true: a reacção é uma gravação, não se sintetiza
  switch(kind){
    case "goal":CR.resolved=true;CR.cheer=1.3;CR.exc=1;CR.tension=0;if(!smp){applause(3.2);horn()}break;
    case "shot":CR.tension=Math.max(CR.tension,.7);CR.exc=Math.min(1,CR.exc+.12);if(!smp)gasp();break;
    case "save":CR.resolved=true;CR.tension=0;CR.cheer=Math.max(CR.cheer,.55);CR.exc=Math.min(1,CR.exc+.1);if(!smp)applause(1.2);sfx("save");break;
    case "miss":CR.tension=0;CR.groan=.9;break;
    case "foul":CR.boo=.9;if(!smp)whistleCrowd(1.4);break;
    case "half":case "end":if(!smp)applause(3.5);CR.cheer=Math.max(CR.cheer,.5);break;
    case "kickoff":CR.cheer=Math.max(CR.cheer,.35);CR.exc=Math.min(1,CR.exc+.2);break;
  }
}
function gasp(){if(!c)return;var t=c.currentTime;nburst(crowdBus,t,{type:"bandpass",f:900,q:.8,dur:.55,peak:.22,f1:2400,a:.2})}
function whistleCrowd(d){if(!c)return;var t=c.currentTime;for(var i=0;i<4;i++){var t0=t+i*.22+Math.random()*.1;tone(crowdBus,t0,{type:"sine",f0:2200+Math.random()*900,f1:2000+Math.random()*700,dur:d*.4,peak:.035})}}
function horn(){if(!c)return;var t=c.currentTime;[0,.28].forEach(function(o,i){tone(crowdBus,t+o,{type:"sawtooth",f0:i?233:196,dur:.24,peak:.07,lp:900});tone(crowdBus,t+o,{type:"square",f0:i?351:294,dur:.24,peak:.04,lp:900})})}
function applause(sec){if(!c)return;var t=c.currentTime,n=Math.round(sec*26);for(var i=0;i<n;i++){var tt=t+i/26+Math.random()*.03,fall=1-i/n;nburst(crowdBus,tt,{type:"bandpass",f:1800+Math.random()*2200,q:1.2,dur:.045,peak:.1*(.3+.7*fall)})}}
function goalFx(){
  var t=c.currentTime;sfx("net");
  if(!Aud.sampleOn){nburst(sfxBus,t,{type:"bandpass",f:1800,q:.6,dur:.6,peak:.2,f1:700,a:.02});
  // fanfarra curta de celebração em kuduro (só se as gravações não carregaram)
  [[57,0],[60,.14],[64,.28],[69,.42],[72,.56]].forEach(function(p){tone(sfxBus,t+.15+p[1],{type:"sawtooth",f0:hz(p[0]+12),dur:.22,peak:.06,lp:3000})})}
  CR.duck=t+3.2;
}
/* batuque de bancada + palmas no ritmo do cântico */
function crowdBeats(){
  if(Aud.sampleOn)return;
  if(!c||typeof G==="undefined"||!G||CR.exc<.2||G.paused)return;
  var bpm=112,spb=60/bpm/2;
  if(CR.nextBeat<c.currentTime-.2)CR.nextBeat=c.currentTime+.05;
  while(CR.nextBeat<c.currentTime+.14){
    var s=CR.beat%16,t=CR.nextBeat,e=CR.exc;
    // surdo e tumbadoras em tresillo 3+3+2
    if(s===0||s===8)drumTone(crowdBus,t,95,.1+.18*e,.22);
    if([0,3,6,8,11,14].indexOf(s)>=0&&e>.3)congaHit(crowdBus,t,s%2?300:210,.05+.1*e);
    if([2,4,10,12].indexOf(s)>=0&&e>.45)nburst(crowdBus,t,{type:"bandpass",f:1900+Math.random()*900,q:1.1,dur:.05,peak:.06+.1*e});
    if(s%2===1&&e>.25)nburst(crowdBus,t,{type:"highpass",f:6000,dur:.03,peak:.012+.03*e});   // dikanza/reco-reco
    CR.beat++;CR.nextBeat+=spb;
  }
}
function drumTone(out,t,f,peak,dur){tone(out,t,{f0:f*1.6,f1:f,sw:.08,dur:dur,peak:peak});nburst(out,t,{type:"lowpass",f:500,dur:.04,peak:peak*.5})}
function congaHit(out,t,f,peak){tone(out,t,{f0:f*1.15,f1:f,sw:.05,dur:.14,peak:peak});nburst(out,t,{type:"bandpass",f:f*5,q:2,dur:.02,peak:peak*.5})}
function crowdUpdate(dt){
  if(!Aud.ok||typeof G==="undefined"||!G)return;
  var b=G.ball,playing=G.state==="play"||G.state==="setpiece"||G.state==="kickoff";
  var near=0,fin=0;if(b){near=Math.max(0,1-Math.min(Math.abs(b.x-X0),Math.abs(b.x-X1))/190)*Math.max(0,1-Math.abs(b.y-H/2)/190);fin=Math.max(0,Math.max(Defs_n(b.x),0))}
  var diff=Math.abs(G.score[0]-G.score[1]),late=G.t/MATCH_LEN;
  var target=(playing?.2:.1)+near*.4+fin*.12+late*.14+(diff<=1?.08:0);
  if(G.state==="goal")target=1;if(G.state==="half"||G.state==="end")target=.35;if(G.state==="replay")target=.3;
  CR.exc+=(Math.min(1,target)-CR.exc)*(1-Math.exp(-dt*1.4));
  CR.cheer=Math.max(0,CR.cheer-dt*.45);CR.groan=Math.max(0,CR.groan-dt*.9);CR.tension=Math.max(0,CR.tension-dt*.35);CR.boo=Math.max(0,CR.boo-dt*.8);
  // remate em voo: no fim, golo/defesa tratam do resto; se nada aconteceu, foi falhado
  var pend=b&&b.pend&&b.pend.type==="shot";
  if(CR.shotFlight&&!pend&&G.state==="play"&&!CR.resolved){crowdEvent("miss")}
  if(pend){CR.shotFlight=true;CR.resolved=false}else{CR.shotFlight=false}
  var now=c.currentTime,duck=(CR.duck&&now<CR.duck)?.5:1;
  var e=CR.exc,tt=.12;
  var syn=Aud.sampleOn?0:1;
  CR.murmur.gain.setTargetAtTime(syn*(.03+.17*e)*(G.paused?.15:1),now,tt);
  CR.hiss.gain.setTargetAtTime(syn*(.01+.05*CR.tension+.04*e),now,.2);
  var open=CR.cheer>.15?1:0;
  for(var i=0;i<CR.voices.length;i++){var v=CR.voices[i];
    var lift=1+.28*e+.4*CR.cheer-.28*CR.groan-.2*CR.boo+.1*CR.tension;
    v.os.frequency.setTargetAtTime(v.base*lift,now,.08);
    v.a.frequency.setTargetAtTime(520+260*CR.cheer+120*CR.tension-120*CR.groan,now,.1);v.b.frequency.setTargetAtTime(900+300*CR.cheer-150*CR.groan,now,.1);
    var gv=(.002+.014*e)+.05*CR.cheer+.03*CR.tension+.035*CR.groan+.03*CR.boo;
    v.g.gain.setTargetAtTime(syn*gv*(G.paused?0:1),now,.12)}
  var cb=nv("crowdVol",.8)*(G.paused?.25:1)*duck;crowdBus.gain.setTargetAtTime(cb,now,.2);
  crowdBeats();
  if(Aud.crowdTick)Aud.crowdTick(dt,CR,G);
}
function Defs_n(x){var nx=Math.max((x-X0)/(X1-X0),0);return Math.max(nx,1-nx)-.62}
/* ---------- música ---------- */
var ST={
 kizomba:{bpm:90,sw:.0,chords:[[62,65,69,72],[58,62,65,69],[55,58,62,65],[57,61,64,67]],roots:[38,34,31,33],
   kick:[0,6,10],rim:[4,12],shaker:[0,2,4,6,8,10,12,14],conga:[3,7,11,14],bass:[0,6,10,14],gtr:[0,3,6,8,11,14],pad:true,bell:[0,8]},
 semba:{bpm:108,sw:.05,chords:[[60,64,67,72],[57,60,64,69],[53,57,60,65],[55,59,62,67]],roots:[36,33,29,31],
   kick:[0,8],rim:[4,12],dik:[0,2,3,5,6,8,10,11,13,14],acc:[0,3,6,8,11,14],conga:[3,6,11,14],bass:[0,3,6,8,11,14],gtr:[0,2,3,6,8,10,11,14],pad:false},
 kuduro:{bpm:136,sw:0,chords:[[57,60,64],[53,57,60],[60,64,67],[55,59,62]],roots:[33,29,36,31],
   kick:[0,4,8,12],clap:[4,12],hat:[2,6,10,14],bass:[0,2,4,6,8,10,12,14],lead:[0,3,6,8,10,12,14],stab:[0,6,10]}
};
var M={style:null,next:0,step:0,bar:0,pending:null,sw:false};
function kick(t,v){tone(musicGate,t,{f0:160,f1:42,sw:.12,dur:.28,peak:.5*v});nburst(musicGate,t,{type:"lowpass",f:900,dur:.04,peak:.12*v})}
function snare(t,v){nburst(musicGate,t,{type:"highpass",f:1700,dur:.14,peak:.2*v});tone(musicGate,t,{f0:210,f1:150,dur:.1,peak:.18*v})}
function clap(t,v){for(var i=0;i<3;i++)nburst(musicGate,t+i*.012,{type:"bandpass",f:1600,q:1.1,dur:.06,peak:.16*v})}
function rim(t,v){tone(musicGate,t,{type:"square",f0:820,f1:700,dur:.04,peak:.08*v,lp:3000});nburst(musicGate,t,{type:"highpass",f:2500,dur:.02,peak:.1*v})}
function hat(t,v,open){nburst(musicGate,t,{type:"highpass",f:7500,dur:open?.12:.03,peak:.09*v})}
function shaker(t,v){nburst(musicGate,t,{type:"highpass",f:6000,dur:.04,peak:.05*v})}
function conga(t,f,v){tone(musicGate,t,{f0:f*1.12,f1:f,sw:.05,dur:.16,peak:.18*v});nburst(musicGate,t,{type:"bandpass",f:f*4.5,q:2,dur:.025,peak:.07*v})}
function dik(t,v){nburst(musicGate,t,{type:"bandpass",f:4300,q:3,dur:.025,peak:.1*v});nburst(musicGate,t+.02,{type:"bandpass",f:5200,q:3,dur:.02,peak:.07*v})}
function bass(t,m,dur,v){tone(musicGate,t,{type:"triangle",f0:hz(m),dur:dur,peak:.34*v,lp:520,a:.01});tone(musicGate,t,{type:"sine",f0:hz(m-12),dur:dur,peak:.22*v,a:.01})}
function pluck(t,m,dur,v){var f=hz(m);[["triangle",1,.12],["sawtooth",1.004,.05]].forEach(function(p){var os=c.createOscillator(),g=c.createGain(),lp=c.createBiquadFilter();os.type=p[0];os.frequency.value=f*p[1];lp.type="lowpass";lp.frequency.setValueAtTime(3200,t);lp.frequency.exponentialRampToValueAtTime(700,t+dur);os.connect(lp);lp.connect(g);g.connect(musicGate);env(g,t,.004,p[2]*v,dur);os.start(t);os.stop(t+dur+.05)})}
function bell(t,m,v){[1,2,3.01].forEach(function(k,i){tone(musicGate,t,{f0:hz(m)*k,dur:1.1-i*.25,peak:.07*v/(i+1)})})}
function pad(t,chord,dur,v){chord.forEach(function(m){[0,6].forEach(function(dt){var os=c.createOscillator(),g=c.createGain(),lp=c.createBiquadFilter();os.type="triangle";os.frequency.value=hz(m)*(1+dt*.0007);lp.type="lowpass";lp.frequency.value=1300;os.connect(lp);lp.connect(g);g.connect(musicGate);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.025*v,t+dur*.3);g.gain.linearRampToValueAtTime(.0001,t+dur);os.start(t);os.stop(t+dur+.05)})})}
function lead(t,m,dur,v){var os=c.createOscillator(),os2=c.createOscillator(),g=c.createGain(),lp=c.createBiquadFilter();os.type="sawtooth";os2.type="square";os.frequency.value=hz(m);os2.frequency.value=hz(m)*1.005;lp.type="lowpass";lp.Q.value=6;lp.frequency.setValueAtTime(3600,t);lp.frequency.exponentialRampToValueAtTime(600,t+dur);os.connect(lp);os2.connect(lp);lp.connect(g);g.connect(musicGate);env(g,t,.005,.07*v,dur);os.start(t);os2.start(t);os.stop(t+dur+.05);os2.stop(t+dur+.05)}
function stab(t,chord,v){chord.forEach(function(m){lead(t,m+12,.16,v*.55)})}
function has(a,s){return a.indexOf(s)>=0}
function playStep(st,s,bar,t){
  var ci=bar%4,chord=st.chords[ci],root=st.roots[ci],h=function(){return (Math.random()-.5)*.012},v=function(){return .9+Math.random()*.2},fill=(bar%4===3&&s>=12);
  t+=h();
  if(st===ST.kizomba){
    if(has(st.kick,s))kick(t,.8*v());if(has(st.rim,s))rim(t,v());if(has(st.shaker,s))shaker(t,s%4===0?1:.6);if(has(st.conga,s))conga(t,s%2?330:230,v());
    if(has(st.bass,s))bass(t,root+(s===14?7:0),.34,v());
    if(has(st.gtr,s)){var idx=[0,1,2,3,2,1][st.gtr.indexOf(s)%6];pluck(t,chord[idx]+12,.5,v())}
    if(s===0&&st.pad)pad(t,chord,60/st.bpm*4,1);
    if(has(st.bell,s)&&bar%2===0)bell(t,chord[3]+24,.8);
    if(fill&&s%2===0)conga(t,s%4?330:260,.9);
  }else if(st===ST.semba){
    if(has(st.kick,s))kick(t,.7*v());if(has(st.rim,s))rim(t,.8*v());
    if(has(st.dik,s))dik(t,has(st.acc,s)?1:.45);if(has(st.conga,s))conga(t,s%2?340:240,v());
    if(has(st.bass,s))bass(t,root+(s===8||s===14?7:0),.22,v());
    if(has(st.gtr,s)){var k=st.gtr.indexOf(s),pick=[0,2,1,3,2,1,0,2][k%8];pluck(t,chord[pick]+12,.28,v())}
    if(fill&&s%2===0)conga(t,s%4?360:250,1);
  }else{
    if(has(st.kick,s))kick(t,v());if(has(st.clap,s))clap(t,v());if(has(st.hat,s))hat(t,.9,false);
    if(has(st.bass,s))bass(t,root+(s%8===6?12:0),.16,.9*v());
    if(has(st.lead,s)){var q=st.lead.indexOf(s),note=chord[[0,1,2,1,0,2,1][q%7]]+12+(bar%2?0:12);lead(t,note,.14,v())}
    if(has(st.stab,s)&&bar%2===1)stab(t,chord,.8);
    if(fill){snare(t,.9);if(s===15)clap(t,1)}
  }
}
function sched(){
  if(!c||c.state!=="running"||!M.style)return;var st=ST[M.style];if(!st)return;var spb=60/st.bpm/4;
  if(M.next<c.currentTime-.3)M.next=c.currentTime+.05;
  while(M.next<c.currentTime+.14){playStep(st,M.step,M.bar,M.next);M.next+=spb*(1+(M.step%2?-st.sw:st.sw));M.step++;if(M.step>=16){M.step=0;M.bar++}}
}
function setStyle(name){
  if(M.style===name||M.pending===name)return;
  if(!c)return;M.pending=name;var now=c.currentTime;
  musicGate.gain.cancelScheduledValues(now);musicGate.gain.setTargetAtTime(0,now,.18);
  setTimeout(function(){M.style=M.pending;M.pending=null;M.step=0;M.bar=0;M.next=c.currentTime+.1;var n=c.currentTime;musicGate.gain.cancelScheduledValues(n);musicGate.gain.setValueAtTime(0,n);if(M.style)musicGate.gain.setTargetAtTime(1,n+.1,.35)},650);
}
/* ---------- coordenação (contexto → estilo, volumes) ---------- */
function tick(){
  if(!Aud.ok)return;
  var inGame=typeof G!=="undefined"&&!!G,snd=!!PREF.sound;
  master.gain.setTargetAtTime(snd?1:0,c.currentTime,.05);
  sfxBus.gain.setTargetAtTime(nv("sfxVol",.9),c.currentTime,.1);
  var style=PREF.musicStyle||"auto",faixas=!!(window.G94Faixas&&G94Faixas.ativo()),target=null,mv=nv("musicVol",.15),ctx=inGame?(G.paused?"pause":G.tut?"tutorial":"match"):"menu",mult=1;
  if(style==="gerada"||style==="faixas")style="auto";
  if(style!=="off"){
    if(style==="auto")target={menu:document.querySelector(".menu-screen")?"kizomba":"semba",pause:"semba",tutorial:"semba",match:"kuduro"}[ctx];else target=style;
  }
  if(ctx==="match"||ctx==="tutorial"){var gm=PREF.gameMusic||"low";mult=gm==="off"?0:gm==="normal"?.5:.2;if(G&&G.state==="goal")mult*=.25}
  else if(ctx==="pause")mult=.7;
  if(mult===0||!snd||faixas)target=null;      // com faixas do servidor ativas, não se gera música sintética
  if(target!==(M.pending||M.style))setStyle(target);
  musicBus.gain.setTargetAtTime(mv*mult,c.currentTime,.4);
  if(!inGame)crowdBus.gain.setTargetAtTime(0,c.currentTime,.3);
}
/* ---------- ligação ao jogo ---------- */
window.Aud=Aud;
window.sfx=sfx;window.crowdEvent=crowdEvent;window.crowdUpdate=crowdUpdate;
window.drums=function(){};
window.ambientStart=function(){unlock()};
window.ambientStop=function(){if(Aud.ok&&crowdBus)crowdBus.gain.setTargetAtTime(0,c.currentTime,.2)};
// eventos extra do jogo
var _tH=toHalf;toHalf=function(){_tH.apply(this,arguments);crowdEvent("half")};
var _tE=toEnd;toEnd=function(){_tE.apply(this,arguments);crowdEvent("end")};
var _sk=setupKickoff;setupKickoff=function(){_sk.apply(this,arguments);crowdEvent("kickoff")};
var _cf=callFoul;callFoul=function(){var r=_cf.apply(this,arguments);if(r){crowdEvent("foul");sfx("card")}return r};
var _sp=startSetPiece;startSetPiece=function(kind){_sp.apply(this,arguments);if(kind==="corner")CR.exc=Math.min(1,CR.exc+.15)};
var _g=goal;goal=function(t){CR.resolved=true;var s0=G.score[0]+G.score[1];_g.apply(this,arguments);return};
var _dg=onDeflectGK;onDeflectGK=function(){CR.resolved=true;return _dg.apply(this,arguments)};
/* sons de interface */
/* os sons de clique dos menus vêm de audio-menu.js (gravações); estes só servem enquanto não carregam */
document.addEventListener("click",function(e){if(Aud.menuOn)return;var b=e.target.closest&&e.target.closest("button,.btn,.team,.chip");if(b&&!b.disabled&&c)sfx("ui")},true);
var _po=Pop.open;Pop.open=function(o){if(c&&o){if(o.kind==="celebrate")fanfare();else if(!Aud.menuOn)sfx("popin")}return _po.apply(this,arguments)};
var _pc=Pop.close;Pop.close=function(){if(c&&!Aud.menuOn)sfx("popout");return _pc.apply(this,arguments)};
/* ---------- opções de som ---------- */
function slider(label,key,def){var d=document.createElement("label");d.className="aud-row";d.innerHTML='<span>'+label+'</span><input type="range" min="0" max="100" step="5" value="'+Math.round(nv(key,def)*100)+'"><b>'+Math.round(nv(key,def)*100)+'%</b>';
  var inp=d.querySelector("input"),out=d.querySelector("b");inp.addEventListener("input",function(){PREF[key]=inp.value/100;out.textContent=inp.value+"%";savePrefs();if(c)sfx("kick",6)});return d}
function seg(label,key,items,def){var d=document.createElement("div");d.className="aud-seg";d.innerHTML='<span class="panel-title">'+label+'</span><div class="seg" role="group"></div>';var g=d.querySelector(".seg");
  items.forEach(function(it){var b=document.createElement("button");b.type="button";b.textContent=it[1];b.setAttribute("aria-pressed",String((PREF[key]||def)===it[0]));b.addEventListener("click",function(){PREF[key]=it[0];savePrefs();g.querySelectorAll("button").forEach(function(x){x.setAttribute("aria-pressed",String(x===b))});if(key==="musicStyle"){unlock();tick()}});g.appendChild(b)});return d}
function injectOptions(){
  var o=document.querySelector(".options-screen");if(!o||o.querySelector(".aud-panel"))return;
  var p=document.createElement("div");p.className="panel aud-panel";p.innerHTML='<p class="panel-title">Som e música</p>';
  p.appendChild(slider("Efeitos","sfxVol",.9));if(window.MenuSfx)MenuSfx.options(p);p.appendChild(slider("Bola","ballVol",1));p.appendChild(slider("Árbitro","refVol",1));p.appendChild(slider("Adeptos","crowdVol",.8));p.appendChild(slider("Música","musicVol",.15));
  var n=document.createElement("p");n.className="note";n.textContent="A bola, os apitos e os adeptos usam gravações; a música e os sons de interface são gerados pelo jogo. O público reage aos remates, defesas, golos e faltas.";p.appendChild(n);
  o.appendChild(p);
}
if(window.MutationObserver){var q=false;new MutationObserver(function(){if(!q){q=true;setTimeout(function(){q=false;injectOptions()},80)}}).observe(document.getElementById("app"),{childList:true})}
var st=document.createElement("style");st.textContent=".aud-row{display:grid;grid-template-columns:110px 1fr 48px;gap:12px;align-items:center;margin:6px 0}.aud-row input{width:100%;accent-color:#f6c744;height:28px}.aud-row b{color:#f6c744;text-align:right;font-variant-numeric:tabular-nums}.aud-seg{display:grid;gap:6px;margin-top:10px}.aud-seg .seg{justify-self:start;max-width:100%;flex-wrap:wrap}@media(max-width:520px){.aud-row{grid-template-columns:84px 1fr 44px}}";document.head.appendChild(st);
setTimeout(injectOptions,300);
})();
