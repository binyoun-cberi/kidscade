(function(global){
'use strict';
var NS='http://www.w3.org/2000/svg',KEY='kidscade_unification_presentation_v1';
var playing=false,skipped=false,mode='normal',cancelFrame=null;
try{var stored=global.localStorage.getItem(KEY);if(['normal','fast','off'].indexOf(stored)>=0)mode=stored;}catch(_){}
function el(id){return document.getElementById(id);}
function svg(tag,attrs,parent){var n=document.createElementNS(NS,tag);Object.keys(attrs||{}).forEach(function(k){n.setAttribute(k,attrs[k]);});if(parent)parent.appendChild(n);return n;}
function point(p){return p||[0,0];}
function pawn(parent,color,type){
  var g=svg('g',{'class':'war-pawn'},parent);
  svg('path',{d:'M-9 -12 L9 -12 L9 4 L0 11 L-9 4Z',fill:color,stroke:'#f4ead0','stroke-width':1.2},g);
  var d=type==='archer'?'M-3 -7 Q9 0 -3 7 M-3 -7 L-3 7 M-6 0 L6 0 M3 -3 L6 0 L3 3':type==='cavalry'?'M-5 7 L5 7 L3 3 L6 -1 L3 -7 L-1 -9 L-2 -5 L-6 -2 L-5 1 L0 0 L-2 4Z':'M0 -8 L2 -5 L1 3 L5 3 M-5 3 L1 3 M0 3 L0 8';
  svg('path',{d:d,fill:type==='cavalry'?'#fff4db':'none',stroke:'#fff4db','stroke-width':1.5,'stroke-linecap':'round','stroke-linejoin':'round'},g);return g;
}
function setMode(next){mode=['normal','fast','off'].indexOf(next)>=0?next:'normal';try{global.localStorage.setItem(KEY,mode);}catch(_){}if(el('warSpeed'))el('warSpeed').textContent='연출 · '+(mode==='normal'?'보통':mode==='fast'?'빠르게':'끄기');if(mode==='off')skip();}
function reduced(){return global.matchMedia&&global.matchMedia('(prefers-reduced-motion: reduce)').matches;}
function skip(){skipped=true;if(cancelFrame)cancelFrame();}
function animate(ms,draw){
  return new Promise(function(resolve,reject){
    var done=false,last=null,elapsed=0,id;
    function finish(error){if(done)return;done=true;global.cancelAnimationFrame(id);cancelFrame=null;if(error)reject(error);else resolve();}
    cancelFrame=function(){finish();};
    function tick(now){if(skipped||mode==='off'){finish();return;}if(last!==null)elapsed+=Math.min(80,now-last)*(mode==='fast'?3:1);last=now;var t=Math.min(1,elapsed/ms);try{draw(t);}catch(error){finish(error);return;}if(t>=1)finish();else id=global.requestAnimationFrame(tick);}
    if(skipped||mode==='off'){finish();return;}id=global.requestAnimationFrame(tick);
  });
}
function sound(kind){try{var audio=global.KidscadeAudio;if(audio&&audio.play)Promise.resolve(audio.play(kind,{volume:.32})).catch(function(){});}catch(_){}
}
function title(e){
  if(e.kind==='attack')return e.ranged?'사격 · '+e.place:(e.won?'돌파 · ':'공격 · ')+e.place;
  if(e.kind==='turn')return e.place;
  if(e.kind==='retreat')return '후퇴 · '+e.faction;
  if(e.kind==='recruit')return '증원 집결 · '+e.place;
  if(e.kind==='build')return '시설 건설 · '+e.place;
  return (e.city?'거점 확보 · ':'진군 · ')+e.place;
}
function chooseEvents(events,limit){
  var selected=events.map(function(e,i){return {e:e,i:i};}).filter(function(x){return x.e.relevant;});
  // Preserve chronological order, giving battles and city changes space before routine movement.
  var ranked=selected.slice().sort(function(a,b){return (b.e.priority||0)-(a.e.priority||0)||a.i-b.i;}).slice(0,limit||10);
  var ids={};ranked.forEach(function(x){ids[x.i]=true;});return events.map(function(e,i){return !!ids[i];});
}
async function playEvent(e,options){
  var layer=el('warEffects');if(!layer){options.after(e);return;}
  layer.textContent='';el('warEventTitle').textContent=title(e);el('warEventDetail').textContent=e.faction||'';
  if(e.kind==='turn'){options.after(e);await animate(500,function(){});return;}
  var from=point(e.from),to=point(e.to),group=svg('g',{},layer);
  var route=e.route&&e.route.length>1?e.route:[from,to];
  if(e.kind==='move'||e.kind==='retreat'){
    var path=svg('path',{d:route.map(function(p,i){return(i?'L':'M')+p[0]+' '+p[1];}).join(' '),'class':'war-route',stroke:e.color},group);
    var length=path.getTotalLength(),ghost=pawn(group,e.color,e.unitType);
    var original=document.querySelector('[data-unit-id="'+e.unitId+'"]');if(original)original.style.opacity='0';
    sound('whoosh');await animate(Math.min(650,220+route.length*85),function(t){var p=path.getPointAtLength(length*(t*t*(3-2*t)));ghost.setAttribute('transform','translate('+p.x+','+p.y+')');});
  }else if(e.kind==='attack'){
    var ghost=pawn(group,e.color,e.unitType),ring=svg('circle',{cx:to[0],cy:to[1],r:7,'class':'war-impact'},group);
    var arrow=svg('path',{d:'M'+from[0]+' '+from[1]+' L'+to[0]+' '+to[1],stroke:e.color,'class':e.ranged?'war-arrow':'war-strike'},group);
    var missile=e.ranged?svg('path',{d:'M-5 0 L4 0 M1 -3 L4 0 L1 3',stroke:'#fff0b0','stroke-width':1.6,fill:'none'},group):null;
    var supporters=e.supporters||[];supporters.forEach(function(p){svg('path',{d:'M'+p[0]+' '+p[1]+' L'+to[0]+' '+to[1],'class':'war-support'},group);});
    if(supporters.length)el('warEventDetail').textContent=e.faction+' · 인접 병종의 지원 공격';
    var original=document.querySelector('[data-unit-id="'+e.unitId+'"]');if(original)original.style.opacity='0';
    sound(e.ranged?'whoosh':'impact');
    await animate(480,function(t){var k=e.ranged?0:Math.sin(t*Math.PI)*.48,dx=to[0]-from[0],dy=to[1]-from[1],bend=e.unitType==='cavalry'?Math.sin(t*Math.PI)*.22:0;ghost.setAttribute('transform','translate('+(from[0]+dx*k-dy*bend)+','+(from[1]+dy*k+dx*bend)+')');if(missile){var flight=Math.min(1,t*2);missile.setAttribute('transform','translate('+(from[0]+dx*flight)+','+(from[1]+dy*flight)+') rotate('+(Math.atan2(dy,dx)*180/Math.PI)+')');}ring.setAttribute('r',7+t*17);ring.style.opacity=String(1-t);arrow.style.strokeDashoffset=String(60*(1-t));});
    layer.textContent='';options.after(e);group=svg('g',{},el('warEffects'));
    var own=svg('text',{x:from[0],y:from[1]-18,'class':'war-loss war-own-loss'},group);own.textContent='−'+e.ownLoss;
    var enemy=svg('text',{x:to[0],y:to[1]-18,'class':'war-loss'},group);enemy.textContent='−'+e.enemyLoss;
    await animate(480,function(t){group.setAttribute('transform','translate(0,'+(-12*t)+')');group.style.opacity=String(1-t*.45);});
  }
  if(e.kind!=='attack'){layer.textContent='';options.after(e);}
  if(['build','recruit','split'].indexOf(e.kind)>=0){var pulse=svg('circle',{cx:to[0],cy:to[1],r:8,fill:'none',stroke:e.color,'stroke-width':2},layer);await animate(350,function(t){pulse.setAttribute('r',8+16*t);pulse.style.opacity=String(1-t);});}
  if(e.city){
    layer.textContent='';
    el('warEventTitle').textContent=e.place+' 확보';el('warEventDetail').textContent=e.capital?'수도의 깃발이 바뀌었습니다.':e.faction+'의 새 거점이 되었습니다.';
    var flags=svg('g',{},el('warEffects'));svg('circle',{cx:to[0],cy:to[1],r:18,'class':'war-capture-ring',stroke:e.color},flags);
    var pole=svg('g',{},flags);svg('path',{d:'M0 10 L0 -24 M0 -24 L18 -19 L0 -13',stroke:'#fff4db',fill:e.color,'stroke-width':1.5},pole);
    sound('victory');await animate(e.capital?1000:550,function(t){pole.setAttribute('transform','translate('+to[0]+','+(to[1]+(1-t)*20)+')');flags.style.opacity=String(Math.min(1,t*3));});
  }
  layer=el('warEffects');if(layer)layer.textContent='';
}
async function play(events,options){
  if(playing)throw new Error('A presentation is already playing');
  playing=true;skipped=false;var chosen=chooseEvents(events,options.turn?8:10),total=chosen.filter(Boolean).length,index=0;
  var bar=el('warPlayback');if(bar)bar.classList.remove('hidden');
  try{
    for(var i=0;i<events.length;i++){
      var e=events[i];
      if(!chosen[i]||skipped||mode==='off'||reduced()){options.after(e);continue;}
      index++;if(el('warEventCount'))el('warEventCount').textContent=index+' / '+total;
      if(options.focus)options.focus(e);await playEvent(e,options);
    }
  }finally{playing=false;cancelFrame=null;if(bar)bar.classList.add('hidden');if(el('warEffects'))el('warEffects').textContent='';}
}
function bind(){
  if(el('warSkip'))el('warSkip').addEventListener('click',skip);
  if(el('warSpeed'))el('warSpeed').addEventListener('click',function(){setMode(mode==='normal'?'fast':mode==='fast'?'off':'normal');});
  setMode(mode);document.addEventListener('visibilitychange',function(){if(document.hidden)skip();});
}
global.UnificationWarPresentation={play:play,skip:skip,setMode:setMode,getMode:function(){return mode;},isPlaying:function(){return playing;},chooseEvents:chooseEvents,pawn:pawn,bind:bind};
})(window);
