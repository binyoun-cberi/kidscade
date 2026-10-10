(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const ui = {
    canvas:$('board'),frame:$('boardFrame'),intro:$('intro'),result:$('result'),help:$('help'),
    stage:$('stageText'),best:$('bestText'),time:$('timeText'),timerBox:$('timerBox'),
    mission:$('missionText'),path:$('pathText'),turn:$('turnText'),checks:$('attemptText'),
    progress:$('progressFill'),check:$('checkBtn'),preview:$('previewTag'),
    previewSeconds:$('previewSeconds'),toast:$('toast'),controlTitle:$('controlTitle'),controlHint:$('controlHint'),
    resultPanel:document.querySelector('#result .dialog'),resultLabel:$('resultLabel'),resultTitle:$('resultTitle'),
    resultMsg:$('resultMessage'),resultStage:$('resultStage'),resultTime:$('resultTime'),
    resultChecks:$('resultChecks'),continue:$('continueBtn'),sound:$('soundBtn')
  };
  const ctx = ui.canvas.getContext('2d');
  const SAVE_KEY = 'kidscade_squid_bridge_v1';
  const DIRECTION = {left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]};
  const record = (() => {
    try {
      const result = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      return {best:Math.max(0,Number(result.best) || 0),clears:Math.max(0,Number(result.clears) || 0)};
    } catch (_) {return {best:0,clears:0};}
  })();
  const s = {
    phase:'intro',stage:1,map:null,index:0,checks:0,deadline:0,
    previewStarted:0,previewDuration:0,failedCell:-1,soundOn:true,
    width:0,height:0,tile:48,offsetX:0,offsetY:0,camera:0,
    drag:null,toastUntil:0,audio:null,lastFrame:0,lastUI:0,hasStarted:false,
    facing:1,lastStepAt:0
  };
  function save() {try {localStorage.setItem(SAVE_KEY,JSON.stringify(record));} catch (_) {}}
  function sdk(name,payload) {try {window.KidscadeGame?.[name]?.(payload);} catch (_) {}}
  function format(seconds) {
    const secs = Math.max(0,Math.ceil(seconds));
    return String(Math.floor(secs/60)).padStart(2,'0') + ':' + String(secs%60).padStart(2,'0');
  }
  function remaining() {return s.deadline ? Math.max(0,(s.deadline - Date.now()) / 1000) : 300;}
  function seed() {
    if (globalThis.crypto?.getRandomValues) {
      const value = new Uint32Array(1);crypto.getRandomValues(value);return value[0];
    }
    return Math.floor(Math.random() * 4294967296);
  }
  function makeMap(stage) {
    for (let i=0;i<10;i++) {
      try {return SquidPath.generate(stage,seed());} catch (_) {}
    }
    throw new Error('길을 생성하지 못했습니다. 다시 시도해 주세요.');
  }
  function sound(kind) {
    if (!s.soundOn) return;
    if (window.SquidBridgeArt?.play?.(kind)) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!s.audio) s.audio = new AudioContext();
      if (s.audio.state === 'suspended') s.audio.resume();
      const now = s.audio.currentTime;
      const notes = kind === 'wrong' ? [240,140] : kind === 'win' ? [500,670,880] : kind === 'check' ? [490,410] : [500];
      notes.forEach((hz,i) => {
        const o=s.audio.createOscillator(),g=s.audio.createGain(),start=now+i*.085;
        o.type=kind==='wrong'?'sawtooth':'sine';o.frequency.setValueAtTime(hz,start);
        g.gain.setValueAtTime(.0001,start);
        g.gain.exponentialRampToValueAtTime(kind==='wrong'?.07:.055,start+.012);
        g.gain.exponentialRampToValueAtTime(.0001,start+.11);
        o.connect(g);g.connect(s.audio.destination);o.start(start);o.stop(start+.12);
      });
    } catch (_) {}
  }
  function toast(message,ms=1300) {
    ui.toast.textContent=message;ui.toast.classList.add('show');s.toastUntil=Date.now()+ms;
  }
  function startRun() {
    s.stage=1;s.hasStarted=true;
    sdk('start',{mode:'memory-bridge'});
    startStage();
  }
  function startStage() {
    try {s.map=makeMap(s.stage);} catch (error) {
      toast('미로 생성 오류. 다시 시작해 주세요.',4000);
      ui.intro.classList.remove('hidden');ui.result.classList.add('hidden');s.phase='intro';return;
    }
    s.index=0;s.checks=0;s.failedCell=-1;s.camera=0;s.facing=1;s.lastStepAt=0;
    s.deadline=0; // Initial route preview is free; the five-minute clock starts afterward.
    ui.result.classList.add('hidden');ui.intro.classList.add('hidden');ui.help.classList.add('hidden');
    beginPreview(false);
    resize();updateUI();
    ui.canvas.focus({preventScroll:true});
  }
  function beginPreview(isCheck) {
    if (isCheck) {
      s.checks++;
      s.index=0; // Same path and the same deadline: only the cursor and visible trail reset.
      s.lastStepAt=0;
      sound('check');
      toast('같은 맵! 남은 시간은 그대로 줄어들어요.',1900);
    }
    s.phase='preview';s.previewStarted=Date.now();
    s.previewDuration=Math.min(32000,Math.round(8000+s.stage*1800));
    ui.preview.hidden=false;ui.check.disabled=true;
    updateUI();
  }
  function step(dx,dy) {
    if (s.phase!=='playing') return;
    if (remaining() <= 0) {fail('시간 초과');return;}
    const map=s.map,current=map.path[s.index];
    const x=current%map.width+dx,y=Math.floor(current/map.width)+dy;
    if (x<0||x>=map.width||y<0||y>=map.height) return;
    const next=y*map.width+x;
    if (dx) s.facing=dx;
    s.lastStepAt=Date.now();
    if (next!==map.path[s.index+1]) {
      s.failedCell=next;sound('wrong');fail('틀린 발판을 밟았어요');return;
    }
    s.index++;
    sound('step');
    if (s.index===map.path.length-1) clear();
    else updateUI();
  }
  function fail(reason) {
    if (s.phase==='failed'||s.phase==='cleared') return;
    s.phase='failed';ui.preview.hidden=true;ui.check.disabled=true;
    sdk('result',{scope:'run',status:'failed',outcome:'loss',score:s.stage-1,stage:s.stage,reason,checks:s.checks});
    showResult(false,reason);
  }
  function clear() {
    s.phase='cleared';ui.preview.hidden=true;ui.check.disabled=true;
    record.best=Math.max(record.best,s.stage);
    record.clears++;save();
    sdk('score',s.stage);
    sdk('result',{scope:'stage',status:'completed',outcome:'clear',score:s.stage,stage:s.stage,checks:s.checks});
    if (s.stage===1) sdk('milestone','first_bridge_clear');
    sound('win');showResult(true,'');
  }
  function showResult(won,reason) {
    ui.resultPanel.classList.toggle('failed',!won);
    ui.resultLabel.textContent=won?'STAGE CLEAR':'GAME OVER';
    ui.resultTitle.textContent=won?'돌파 성공!':'여기서 탈락!';
    ui.resultMsg.textContent=won?
      '정확한 경로로 끝까지 도착했어요. 다음 미로는 더 길고 더 많이 꺾입니다.':
      reason+'! 이번 도전은 종료되었어요. 새 맵으로 다시 도전하세요.';
    ui.resultStage.textContent=String(s.stage).padStart(2,'0');
    ui.resultTime.textContent=format(remaining());
    ui.resultChecks.textContent=s.checks+'회';
    ui.continue.textContent=won?'다음 스테이지 →':'새 맵으로 다시 시작 ↻';
    ui.result.classList.remove('hidden');
    updateUI();
  }
  function updateUI() {
    const map=s.map,conf=map?SquidPath.specs(s.stage):SquidPath.specs(1);
    ui.stage.textContent=String(s.stage).padStart(2,'0');
    ui.best.textContent=String(record.best);
    ui.time.textContent=s.deadline?format(remaining()):'05:00';
    ui.timerBox.classList.toggle('urgent',s.deadline>0 && remaining()<=30 && (s.phase==='preview'||s.phase==='playing'));
    ui.turn.textContent='최소 '+conf.minTurns+'회 꺾임 · '+conf.width+'×'+conf.height;
    ui.checks.textContent='정답 확인 '+s.checks+'회';
    ui.path.textContent=map?(s.index+1)+' / '+map.path.length+'칸':'0 / 0칸';
    ui.progress.style.width=map?((s.index+1)/map.path.length*100)+'%':'0%';
    ui.check.disabled=s.phase!=='playing';
    ui.preview.hidden=s.phase!=='preview';
    if (s.phase==='preview') {
      ui.mission.textContent='초록색 경로의 순서를 기억하세요';
      ui.controlTitle.textContent='경로 암기 중';
      ui.controlHint.textContent='밝은 빛이 움직이는 순서대로 기억하세요.';
      ui.previewSeconds.textContent=Math.max(0,Math.ceil((s.previewDuration-(Date.now()-s.previewStarted))/1000));
    } else if (s.phase==='playing') {
      ui.mission.textContent='한 칸만 잘못 밟아도 게임 종료!';
      ui.controlTitle.textContent='기억한 길로 이동';
      ui.controlHint.textContent='방향키 · 터치 · 스와이프 · 아래 화살표';
    } else {
      ui.mission.textContent=s.phase==='cleared'?'스테이지 돌파!':s.phase==='failed'?'도전 종료':'초록색 발판을 기억하세요';
    }
  }
  function resize() {
    const rect=ui.frame.getBoundingClientRect();
    const width=Math.max(1,rect.width),height=Math.max(1,rect.height);
    const pixelRatio=Math.min(2,window.devicePixelRatio||1);
    s.width=width;s.height=height;
    ui.canvas.width=Math.round(width*pixelRatio);ui.canvas.height=Math.round(height*pixelRatio);
    ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
    if(s.map) {
      s.tile=Math.max(19,Math.min(76,Math.floor((height-13)/s.map.height),Math.floor(width/Math.min(s.map.width,12))));
      s.offsetY=Math.floor((height-s.map.height*s.tile)/2);
      s.offsetX=Math.max(0,Math.floor((width-s.map.width*s.tile)/2));
      s.camera=Math.min(s.camera,maxCamera());
    }
  }
  function maxCamera() {return Math.max(0,s.map.width*s.tile-s.width);}
  function viewTarget() {
    const map=s.map;
    let idx=s.index;
    if (s.phase==='preview') {
      const ratio=Math.min(1,(Date.now()-s.previewStarted)/s.previewDuration);
      idx=Math.min(map.path.length-1,Math.floor(ratio*(map.path.length-1)));
    }
    const x=map.path[idx]%map.width*s.tile+s.tile/2;
    return Math.max(0,Math.min(maxCamera(),x-s.width*.37));
  }
  function roundRect(x,y,w,h,r,fill,stroke) {
    ctx.beginPath();ctx.roundRect(x,y,w,h,r);
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}
  }
  function drawPlayer(x,y,size) {
    const r=Math.max(8,size*.22),centerX=x+size/2,centerY=y+size/2;
    ctx.save();ctx.translate(centerX,centerY);
    ctx.shadowColor='#071b24';ctx.shadowBlur=7;
    ctx.fillStyle='#194b59';ctx.strokeStyle='#f5ffff';ctx.lineWidth=Math.max(1.4,size*.035);
    ctx.beginPath();ctx.ellipse(0,-r*.1,r*.8,r,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(-r*.62,r*.65);ctx.lineTo(-r*.65,r*1.2);ctx.moveTo(0,r*.8);ctx.lineTo(0,r*1.32);ctx.moveTo(r*.6,r*.65);ctx.lineTo(r*.65,r*1.2);ctx.stroke();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-r*.28,-r*.25,r*.17,0,Math.PI*2);ctx.arc(r*.28,-r*.25,r*.17,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  function draw(now) {
    const W=s.width,H=s.height,ctx2=ctx;
    if (!W||!H)return;
    ctx2.clearRect(0,0,W,H);
    const bg=ctx2.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'#274047');bg.addColorStop(1,'#10262e');ctx2.fillStyle=bg;ctx2.fillRect(0,0,W,H);
    // Decorative world art stays below the crisp memory tiles.
    window.SquidBridgeArt?.drawBackdrop?.(ctx2,W,H);
    if(!s.map) return;
    const map=s.map,t=s.tile;
    const x0=Math.max(0,Math.floor(s.camera/t)-2),x1=Math.min(map.width,Math.ceil((s.camera+W)/t)+2);
    const isPreview=s.phase==='preview',reveal=isPreview||s.phase==='failed'||s.phase==='cleared';
    const pathSet=reveal?new Set(map.path):null;
    const reached=new Set(map.path.slice(0,s.index+1));
    const timeRatio=isPreview?Math.min(1,(Date.now()-s.previewStarted)/s.previewDuration):0;
    const highlightAt=isPreview?map.path[Math.floor(timeRatio*(map.path.length-1))]:-1;
    const left=s.offsetX-s.camera,top=s.offsetY;
    // Subtle tile shadows and bright grid, matching the memory-floor reference.
    for(let y=0;y<map.height;y++)for(let x=x0;x<x1;x++){
      const at=y*map.width+x,sx=left+x*t,sy=top+y*t;
      let fill=(x+y)%3===0?'#e1e8e9':'#d1dee0';
      if(pathSet?.has(at))fill='#21cd77';
      if(reached.has(at)&&!reveal)fill='#62bddd';
      if(at===map.path[0])fill=reveal?'#50ffc0':'#40daa0';
      if(at===map.path[map.path.length-1])fill='#f9a765';
      if(at===s.failedCell)fill='#fe536d';
      roundRect(sx+2,sy+2,t-4,t-4,Math.max(2,t*.065),fill,null);
      ctx2.fillStyle='rgba(10,50,55,.20)';
      ctx2.fillRect(sx+3,sy+t-5,t-6,Math.max(1,t*.045));
      ctx2.strokeStyle='#112930';ctx2.lineWidth=Math.max(1,t*.027);
      ctx2.strokeRect(sx+1.5,sy+1.5,t-3,t-3);
    }
    if (reveal) {
      ctx2.beginPath();
      for(let i=0;i<map.path.length;i++){
        const at=map.path[i],px=left+(at%map.width+.5)*t,py=top+(Math.floor(at/map.width)+.5)*t;
        if(i===0)ctx2.moveTo(px,py);else ctx2.lineTo(px,py);
      }
      ctx2.strokeStyle='rgba(0,78,60,.6)';ctx2.lineWidth=Math.max(2,t*.095);
      ctx2.lineCap='round';ctx2.lineJoin='round';ctx2.stroke();
      if(isPreview){
        const hx=left+(highlightAt%map.width+.5)*t,hy=top+(Math.floor(highlightAt/map.width)+.5)*t;
        ctx2.beginPath();ctx2.arc(hx,hy,Math.max(4,t*.18),0,Math.PI*2);
        ctx2.fillStyle='#fff8cc';ctx2.shadowBlur=18;ctx2.shadowColor='#fff5b2';ctx2.fill();ctx2.shadowBlur=0;
      }
    } else {
      // A visible breadcrumb trail, but no hint about the next correct tile.
      for(let i=0;i<=s.index;i++){
        const at=map.path[i],px=left+(at%map.width+.5)*t,py=top+(Math.floor(at/map.width)+.5)*t;
        if(i===s.index)continue;
        ctx2.beginPath();ctx2.arc(px,py,Math.max(2,t*.10),0,Math.PI*2);
        ctx2.fillStyle='#236580';ctx2.fill();
      }
    }
    const first=map.path[0],last=map.path[map.path.length-1];
    const sx=left+(first%map.width)*t,sy=top+Math.floor(first/map.width)*t;
    const gx=left+(last%map.width)*t,gy=top+Math.floor(last/map.width)*t;
    window.SquidBridgeArt?.drawFlag?.(ctx2,'start',sx,sy,t);
    window.SquidBridgeArt?.drawFlag?.(ctx2,'goal',gx,gy,t);
    if (s.phase==='cleared') window.SquidBridgeArt?.drawGem?.(ctx2,gx,gy,t,now);
    const current=map.path[s.index],px=left+(current%map.width)*t,py=top+Math.floor(current/map.width)*t;
    const drewAsset=window.SquidBridgeArt?.drawAvatar?.(ctx2,px,py,t,{now:Date.now(),phase:s.phase,lastStepAt:s.lastStepAt,facing:s.facing});
    if (!drewAsset) drawPlayer(px,py,t);
    ctx2.font='900 '+Math.max(8,Math.round(t*.2))+'px system-ui';
    ctx2.textAlign='center';ctx2.textBaseline='middle';
    if(first!==current){ctx2.fillStyle='#064c32';ctx2.fillText('S',left+(first%map.width+.5)*t,top+(Math.floor(first/map.width)+.5)*t);}
    if(last!==current){ctx2.fillStyle='#6a3315';ctx2.fillText('G',left+(last%map.width+.5)*t,top+(Math.floor(last/map.width)+.5)*t);}
  }
  function tick(time) {
    requestAnimationFrame(tick);
    if(time-s.lastFrame<25) return;
    const delta=Math.min(100,time-(s.lastFrame||time));s.lastFrame=time;
    if(s.map&&(s.phase==='playing'||s.phase==='preview')){
      if(s.deadline && Date.now()>=s.deadline){fail('시간 초과');}
      else if(s.phase==='preview'&&Date.now()-s.previewStarted>=s.previewDuration){
        if (!s.deadline) s.deadline=Date.now()+300000;
        s.phase='playing';ui.preview.hidden=true;ui.check.disabled=false;
        toast('시작! 기억한 발판을 밟으세요.');
      }
    }
    if(s.map){
      s.camera+=(viewTarget()-s.camera)*Math.min(1,delta/110);
      if(Math.abs(s.camera-viewTarget())<.4)s.camera=viewTarget();
    }
    draw(time);
    if(s.toastUntil&&Date.now()>s.toastUntil){ui.toast.classList.remove('show');s.toastUntil=0;}
    if(time-s.lastUI>140){updateUI();s.lastUI=time;}
  }
  function onPointerUp(event) {
    if(!s.drag)return;
    const start=s.drag;s.drag=null;
    if(s.phase!=='playing')return;
    const dx=event.clientX-start.x,dy=event.clientY-start.y;
    if(Math.max(Math.abs(dx),Math.abs(dy))>22){
      if(Math.abs(dx)>Math.abs(dy))step(Math.sign(dx),0);
      else step(0,Math.sign(dy));
      return;
    }
    const rect=ui.canvas.getBoundingClientRect(),lx=event.clientX-rect.left,ly=event.clientY-rect.top;
    const x=Math.floor((lx+s.camera-s.offsetX)/s.tile),y=Math.floor((ly-s.offsetY)/s.tile);
    if(x<0||x>=s.map.width||y<0||y>=s.map.height)return;
    const current=s.map.path[s.index],cx=current%s.map.width,cy=Math.floor(current/s.map.width);
    if(Math.abs(x-cx)+Math.abs(y-cy)===1)step(x-cx,y-cy);
  }
  ui.canvas.addEventListener('pointerdown',e=>{if(s.phase==='playing'){s.drag={x:e.clientX,y:e.clientY};ui.canvas.setPointerCapture(e.pointerId);}});
  ui.canvas.addEventListener('pointerup',onPointerUp);
  ui.canvas.addEventListener('pointercancel',()=>{s.drag=null;});
  document.querySelectorAll('[data-dir]').forEach(btn=>{
    btn.addEventListener('click',()=>{const dir=DIRECTION[btn.dataset.dir];step(...dir);});
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!ui.help.classList.contains('hidden')){ui.help.classList.add('hidden');return;}
    if(!ui.help.classList.contains('hidden')||s.phase==='intro')return;
    const keys={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',a:'left',s:'down',d:'right',W:'up',A:'left',S:'down',D:'right'};
    const dir=DIRECTION[keys[event.key]];
    if(dir){event.preventDefault();step(...dir);}
  });
  $('startBtn').addEventListener('click',startRun);
  ui.check.addEventListener('click',()=>{if(s.phase==='playing'&&remaining()>0)beginPreview(true);});
  ui.continue.addEventListener('click',()=>{if(s.phase==='cleared'){s.stage++;startStage();}else if(s.phase==='failed')startRun();});
  $('helpBtn').addEventListener('click',()=>ui.help.classList.remove('hidden'));
  $('helpCloseBtn').addEventListener('click',()=>{ui.help.classList.add('hidden');ui.canvas.focus({preventScroll:true});});
  ui.sound.addEventListener('click',()=>{s.soundOn=!s.soundOn;ui.sound.textContent=s.soundOn?'♪':'×';ui.sound.setAttribute('aria-label',s.soundOn?'소리 끄기':'소리 켜기');if(s.soundOn)sound('step');});
  window.addEventListener('resize',resize,{passive:true});
  if(window.ResizeObserver)new ResizeObserver(resize).observe(ui.frame);
  updateUI();resize();requestAnimationFrame(tick);
})();
