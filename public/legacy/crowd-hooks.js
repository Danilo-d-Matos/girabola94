/* os adeptos reagem aos mesmos eventos que o som da bancada */
(function(){
  var _g=goal;goal=function(t){var r=_g.apply(this,arguments);try{if(window.gstCrowdEvent&&G&&G.state==="goal")window.gstCrowdEvent("goal",t)}catch(e){}return r};
  var _c=crowdEvent;crowdEvent=function(k){var r=_c.apply(this,arguments);try{if((k!=="goal"||(G&&G.state==="shootwait"))&&window.gstCrowdEvent)window.gstCrowdEvent(k)}catch(e){}return r};
})();
(function(){
  var _launch=launch;
  // com ecrã de carregamento: só para os jogos que o pedem (assistente do pré-jogo e online); launch() continua síncrono
  window.launchPre=function(o){
    if(!window.gstPreload)return _launch.call(this,o);
    var m=document.createElement("div");m.id="loadmask";m.setAttribute("role","status");
    m.style.cssText="position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:#06101c;color:#eef4fa;font:600 18px system-ui,sans-serif";
    m.innerHTML='<div style="text-align:center"><div style="width:44px;height:44px;margin:0 auto 14px;border:4px solid #26425b;border-top-color:#f6c744;border-radius:50%;animation:lmspin 1s linear infinite"></div>A preparar o estádio…</div><style>@keyframes lmspin{to{transform:rotate(360deg)}}</style>';
    document.body.appendChild(m);
    var self=this;
    window.gstPreload(o,function(){if(m.parentNode)m.parentNode.removeChild(m);_launch.call(self,o)});
  };
})();
