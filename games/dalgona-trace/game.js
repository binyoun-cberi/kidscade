(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const engine=window.DalgonaTrace;
  const SURVIVAL_MODE=new URLSearchParams(window.location.search).get('survival')==='1'&&window.parent!==window;
  const el={
    board:$('board'),wrap:$('boardWrap'),intro:$('intro'),result:$('result'),help:$('help'),
    shape:$('shapeName'),hint:$('hintText'),desc:$('stageDescription'),stage:$('stageText'),
    best:$('bestText'),time:$('timeText'),speed:$('speedText'),needle:$('speedNeedle'),
    crack:$('crackText'),stuck:$('stuckText'),crackFill:$('crackFill'),stuckFill:$('stuckFill'),
    progress:$('progressFill'),progressText:$('progressText'),instruction:$('instructionText'),
    toast:$('toast'),continue:$('continueBtn'),sound:$('soundBtn'),retry:$('retryBtn'),
    resultCaption:$('resultCaption'),resultTitle:$('resultTitle'),resultMessage:$('resultMessage'),
    resultAccuracy:$('resultAccuracy'),resultScore:$('resultScore'),resultTime:$('resultTime'),
    resultStars:$('stars')
  };
  const SAVE_KEY='kidscade_dalgona_trace_v1';
  const AUDIO_ROOT='../../assets/audio/ui/kenney_interface/';
  const SOUND={start:'select_002.ogg',trace:'tick_001.ogg',error:'error_002.ogg',win:'confirmation_003.ogg',retry:'click_002.ogg'};
  const loadedAudio=Object.create(null);
  const canvas=el.board,ctx=canvas.getContext('2d');
  const record=(()=>{
    try{const obj=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');
      return {best:Math.max(0,Number(obj.best)||0),clears:Math.max(0,Number(obj.clears)||0)};}
    catch(_){return {best:0,clears:0};}
  })();
  const game={
    stage:1,trace:null,state:null,phase:'intro',pointerId:null,
    frameW:0,frameH:0,viewX:0,viewY:0,scale:1,lastFrame:0,
    lastSound:0,lastToast:0,soundOn:true,confetti:[],crumble:[],startAt:0
  };
  const fmt=ms=>{const n=Math.max(0,Math.ceil(ms/1000));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');};
  function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(record));}catch(_){}}
  function sdk(method,payload){try{window.KidscadeGame?.[method]?.(payload);}catch(_){}}
  function play(name){
    if(!game.soundOn || !SOUND[name] || typeof Audio!=='function')return;
    const now=Date.now();
    if(name==='trace'&&now-game.lastSound<105)return;
    if(name==='trace')game.lastSound=now;
    try {
      let a=loadedAudio[name];
      if(!a){a=new Audio(AUDIO_ROOT+SOUND[name]);a.preload='auto';a.volume=name==='trace'?.16:.4;loadedAudio[name]=a;}
      a.pause();a.currentTime=0;
      const p=a.play();if(p?.catch)p.catch(()=>{});
    }catch(_){}
  }
  function message(msg){
    el.toast.textContent=msg;el.toast.classList.add('show');
    game.lastToast=Date.now()+1450;
  }
  function resize(){
    const r=el.wrap.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
    game.frameW=Math.max(1,r.width);game.frameH=Math.max(1,r.height);
    canvas.width=Math.round(game.frameW*dpr);canvas.height=Math.round(game.frameH*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const size=Math.max(1,Math.min(game.frameW,game.frameH)*.96);
    game.scale=size/engine.SIZE;
    game.viewX=(game.frameW-size)/2;game.viewY=(game.frameH-size)/2;
  }
  function toPoint(event){
    const rect=canvas.getBoundingClientRect();
    return {x:(event.clientX-rect.left-game.viewX)/game.scale,
      y:(event.clientY-rect.top-game.viewY)/game.scale};
  }
  function stageStart(stage){
    game.stage=stage;
    game.trace=engine.buildTrace(stage);
    game.state=engine.createState(game.trace);
    game.phase='ready';game.pointerId=null;game.confetti=[];game.crumble=[];
    el.result.classList.add('hidden');el.intro.classList.add('hidden');
    el.stage.textContent=String(stage).padStart(2,'0');
    el.best.textContent=String(record.best).padStart(2,'0');
    el.shape.textContent=game.trace.name;
    el.desc.textContent=game.trace.description;
    el.hint.textContent='노란 점에서 출발해 선을 따라 그려요';
    ui();resize();
  }
  function start(){
    sdk('start',{mode:'dalgona-trace'});
    play('start');stageStart(1);
  }
  function outcome(success){
    if(game.phase==='cleared'||game.phase==='failed')return;
    game.phase=success?'cleared':'failed';game.pointerId=null;
    const trace=game.trace,s=game.state,score=engine.grade(trace,s);
    if(success){
      if(!SURVIVAL_MODE){record.best=Math.max(record.best,game.stage);record.clears++;save();sdk('score',score.score);}
      sdk('result',{scope:'stage',status:'completed',outcome:'clear',stage:game.stage,score:score.score,accuracy:score.accuracy,checks:0});
      if(!SURVIVAL_MODE&&game.stage===1)sdk('milestone','first_dalgona_clear');
      play('win');
      game.confetti=Array.from({length:32},(_,i)=>({x:(i*93)%400,y:-(i*41)%220,vy:30+(i*19)%70,phase:i*.8}));
    }else{
      sdk('result',{scope:'stage',status:'failed',outcome:'loss',stage:game.stage,reason:s.reason,score:0});
      play('error');
      if(navigator.vibrate)navigator.vibrate(65);
    }
    el.resultCaption.textContent=success?'DALGONA COMPLETE':'COOKIE BROKEN';
    el.resultTitle.textContent=success?'달고나 완성!':'달고나 실패!';
    el.resultMessage.textContent=success?
      '모양을 끝까지 따라 그렸어요. 다음 단계에서는 더 어려운 선이 기다려요.':
      (s.reason||'달고나를 조심해서 다시 긁어보세요.')+' 다시 도전할 수 있어요.';
    el.result.classList.toggle('failed',!success);
    el.resultStars.textContent=success?'★'.repeat(score.stars)+'☆'.repeat(3-score.stars):'☆☆☆';
    el.resultAccuracy.textContent=score.accuracy+'%';
    el.resultScore.textContent=success?score.score+'점':'0점';
    el.resultTime.textContent=fmt(score.timeLeft);
    el.continue.textContent=success?'다음 달고나 →':'이 모양 다시 도전 ↻';
    if(!SURVIVAL_MODE)el.result.classList.remove('hidden');
    ui();
  }
  function ui(){
    const t=game.trace,s=game.state;
    if(!t||!s)return;
    el.time.textContent=fmt(t.timeLimitMs-s.elapsedMs);
    el.time.parentElement.classList.toggle('urgent',t.timeLimitMs-s.elapsedMs<10000 && s.startedAt!==null);
    el.progress.style.width=(s.progress/t.total*100).toFixed(1)+'%';
    el.progressText.textContent=Math.round(s.progress/t.total*100)+'%';
    el.crackFill.style.width=s.crack.toFixed(1)+'%';
    el.stuckFill.style.width=s.stuck.toFixed(1)+'%';
    el.crack.textContent=Math.round(s.crack)+'%';el.stuck.textContent=Math.round(s.stuck)+'%';
    if(s.startedAt===null){el.speed.textContent='시작 대기';el.needle.style.left='50%';}
    else{
      const lo=t.minSpeed,hi=t.maxSpeed;
      el.needle.style.left=(s.speed<lo?Math.max(4,27*s.speed/lo):s.speed>hi?Math.min(96,73+(s.speed-hi)*.055):27+46*(s.speed-lo)/(hi-lo))+'%';
      el.speed.textContent=s.speed<lo?'조금 더 빠르게':s.speed>hi?'너무 빨라요!':'딱 좋아!';
    }
    if(game.phase==='ready'){
      el.instruction.textContent='노란 출발점을 누르면 시작해요.';
    }else if(game.phase==='playing'){
      el.instruction.textContent=s.crack>70?'금이 많이 갔어요! 선을 지켜요.':s.stuck>65?'달고나가 굳어요! 조금 더 움직여요.':s.active?'일정한 속도로 선을 따라 이동해요.':'노란 표시에서 이어서 긁어요.';
    }else{
      el.instruction.textContent=game.phase==='cleared'?'성공! 다음 모양에 도전하세요.':'다시 도전할 수 있어요.';
    }
  }
  function pointerDown(event){
    if(game.phase!=='ready'&&game.phase!=='playing')return;
    if(game.pointerId!==null)return;
    const point=toPoint(event),res=engine.begin(game.trace,game.state,point,Date.now());
    if(!res.accepted){message(game.state.startedAt===null?'노란 출발점을 눌러주세요!':'지금까지 그린 선 끝에서 이어가세요!');return;}
    game.state=res.state;game.phase='playing';game.pointerId=event.pointerId;
    try{canvas.setPointerCapture(event.pointerId);}catch(_){}
    if(event.cancelable)event.preventDefault();
    play('start');ui();
  }
  function pointerMove(event){
    if(game.pointerId!==event.pointerId||game.phase!=='playing')return;
    if(event.cancelable)event.preventDefault();
    const before=game.state,point=toPoint(event);
    game.state=engine.move(game.trace,game.state,point,Date.now());
    if(game.state.progress>before.progress+.8)play('trace');
    if(game.state.failed||game.state.complete)outcome(game.state.complete);
    else if((game.state.crack>before.crack+10||game.state.stuck>before.stuck+12) && Date.now()>game.lastToast+200){
      message(game.state.crack>before.crack+10?'선에서 벗어나거나 너무 빨라요!':'너무 느려요. 조금만 더 빠르게!');
    }
    ui();
  }
  function pointerUp(event){
    if(game.pointerId!==event.pointerId)return;
    game.pointerId=null;
    if(game.phase==='playing'){
      game.state=engine.release(game.trace,game.state,Date.now());
      if(game.state.failed)outcome(false);
      else message('같은 지점에서 계속할 수 있어요. 작은 금 +7');
      ui();
    }
  }
  function drawCookie(now){
    const t=game.trace,s=game.state;
    if(!t)return;
    const cx=200,cy=202,r=172;
    ctx.save();
    ctx.shadowColor='#3c2219bd';ctx.shadowBlur=21;ctx.shadowOffsetY=9;
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
    const edge=ctx.createRadialGradient(172,156,12,cx,cy,r+9);
    edge.addColorStop(0,'#f9dba0');edge.addColorStop(.68,'#e1a85f');edge.addColorStop(.91,'#b87a3e');edge.addColorStop(1,'#8b572e');
    ctx.fillStyle=edge;ctx.fill();ctx.restore();
    ctx.save();ctx.beginPath();ctx.arc(cx,cy,r-9,0,Math.PI*2);ctx.clip();
    ctx.strokeStyle='#f7c48755';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,cy,r-13,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<148;i++){
      const angle=i*2.3999632,dist=155*Math.sqrt((i+.5)/148),x=cx+Math.cos(angle)*dist,y=cy+Math.sin(angle)*dist;
      ctx.beginPath();ctx.arc(x,y,i%5===0?1.65:.75,0,Math.PI*2);
      ctx.fillStyle=i%3===0?'#fff3c135':'#9d63392e';ctx.fill();
    }
    // Etched guide never disappears. Its bright traced portion records real progress.
    const path=t.path;
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);
    for(let i=1;i<path.length;i++)ctx.lineTo(path[i].x,path[i].y);
    ctx.strokeStyle='#875022';ctx.lineWidth=12;ctx.stroke();
    ctx.strokeStyle='#e5b57e';ctx.lineWidth=5;ctx.stroke();
    if(s.progress>1){
      ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);
      const last=Math.min(path.length-1,Math.ceil(s.progress/2.5));
      for(let i=1;i<=last;i++)ctx.lineTo(path[i].x,path[i].y);
      const lastAt=engine.sampleAt(t,s.progress);ctx.lineTo(lastAt.x,lastAt.y);
      ctx.strokeStyle='#3a7860';ctx.lineWidth=6;ctx.stroke();
      ctx.strokeStyle='#c7ffe0';ctx.lineWidth=2;ctx.stroke();
    }
    // Crack scars are visible outside the actively drawn line and never hide it.
    if(s.crack>4){
      const count=Math.min(10,Math.ceil(s.crack/11));
      ctx.strokeStyle='#80402688';ctx.lineWidth=1.7;
      for(let i=0;i<count;i++){
        const angle=i*2.15,rr=137,px=cx+rr*Math.cos(angle),py=cy+rr*Math.sin(angle);
        ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+13*Math.cos(angle+.4),py+13*Math.sin(angle+.4));
        ctx.lineTo(px+20*Math.cos(angle-.25),py+20*Math.sin(angle-.25));ctx.stroke();
      }
    }
    if(s.stuck>40){ctx.fillStyle='rgba(215,229,223,'+((s.stuck-40)*.0014)+')';ctx.fillRect(25,25,350,350);}
    ctx.restore();
    const center=engine.sampleAt(t,s.progress);
    ctx.beginPath();ctx.arc(center.x,center.y,12+2*Math.sin(now/240),0,Math.PI*2);
    ctx.fillStyle=game.phase==='failed'?'#ec6e65':'#fff8c0';ctx.shadowColor='#fff4aa';ctx.shadowBlur=14;ctx.fill();ctx.shadowBlur=0;
    ctx.lineWidth=3;ctx.strokeStyle='#83552f';ctx.stroke();
    // Starting position remains identifiable for an unstarted stage.
    if(game.phase==='ready'){
      ctx.font='900 15px system-ui';ctx.textAlign='center';ctx.fillStyle='#603b1f';
      ctx.fillText('START',t.path[0].x,t.path[0].y-28);
    }
  }
  function draw(now){
    const w=game.frameW,h=game.frameH;
    if(w<1||h<1)return;
    ctx.clearRect(0,0,w,h);
    const paper=ctx.createLinearGradient(0,0,w,h);
    paper.addColorStop(0,'#b98c60');paper.addColorStop(.48,'#936c4e');paper.addColorStop(1,'#75523d');
    ctx.fillStyle=paper;ctx.fillRect(0,0,w,h);
    ctx.save();ctx.translate(game.viewX,game.viewY);ctx.scale(game.scale,game.scale);
    drawCookie(now);
    ctx.restore();
  }
  function frame(now){
    requestAnimationFrame(frame);
    if(now-game.lastFrame<28)return;
    game.lastFrame=now;
    if(game.phase==='playing'){
      game.state=engine.tick(game.trace,game.state,Date.now());
      if(game.state.failed)outcome(false);
      ui();
    }
    if(game.lastToast&&Date.now()>game.lastToast){el.toast.classList.remove('show');game.lastToast=0;}
    draw(now);
  }
  canvas.addEventListener('pointerdown',pointerDown);
  canvas.addEventListener('pointermove',pointerMove);
  canvas.addEventListener('pointerup',pointerUp);
  canvas.addEventListener('pointercancel',pointerUp);
  canvas.addEventListener('lostpointercapture',event=>{if(game.pointerId===event.pointerId)pointerUp(event);});
  canvas.addEventListener('contextmenu',event=>event.preventDefault());
  $('startBtn').addEventListener('click',start);
  el.continue.addEventListener('click',()=>{if(SURVIVAL_MODE)return;play('start');stageStart(game.phase==='cleared'?game.stage+1:game.stage);});
  el.retry.addEventListener('click',()=>{if(SURVIVAL_MODE||!game.trace)return;play('retry');stageStart(game.stage);});
  if(SURVIVAL_MODE)el.retry.hidden=true;
  $('helpBtn').addEventListener('click',()=>{el.help.classList.remove('hidden');});
  $('closeHelpBtn').addEventListener('click',()=>{el.help.classList.add('hidden');});
  el.sound.addEventListener('click',()=>{game.soundOn=!game.soundOn;el.sound.textContent=game.soundOn?'♪':'×';el.sound.setAttribute('aria-label',game.soundOn?'소리 끄기':'소리 켜기');});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!el.help.classList.contains('hidden')){el.help.classList.add('hidden');return;}
    if(!SURVIVAL_MODE&&event.key==='r'&&game.phase!=='intro')stageStart(game.stage);
  });
  window.addEventListener('resize',resize,{passive:true});
  if(window.ResizeObserver)new ResizeObserver(resize).observe(el.wrap);
  game.trace=engine.buildTrace(1);game.state=engine.createState(game.trace);
  el.best.textContent=String(record.best).padStart(2,'0');
  resize();ui();requestAnimationFrame(frame);
  if(SURVIVAL_MODE)start();
})();
