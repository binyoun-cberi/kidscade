(() => {
'use strict';

const $ = id => document.getElementById(id);
const screens = {
  intro:$('introScreen'), calibration:$('calibrationScreen'), game:$('gameScreen'), result:$('resultScreen')
};
const ui = {
  difficultyList:$('difficultyList'), calibrateBtn:$('calibrateBtn'), defaultBtn:$('defaultBtn'), introStatus:$('introStatus'),
  calOrb:$('calOrb'), calValue:$('calValue'), calNote:$('calNote'), calProgress:$('calProgress'), calHint:$('calHint'),
  retryCalBtn:$('retryCalBtn'), cancelCalBtn:$('cancelCalBtn'),
  modeLabel:$('modeLabel'), score:$('scoreText'), combo:$('comboText'), time:$('timeText'),
  targetNote:$('targetNote'), targetText:$('targetText'), targetHz:$('targetHz'), currentNote:$('currentNote'), currentHz:$('currentHz'),
  tuneNeedle:$('tuneNeedle'), stage:$('stage'), stageWrap:$('stageWrap'), micBadge:$('micBadge'), micText:$('micText'), floatGrade:$('floatGrade'),
  resultScore:$('resultScore'), resultGrade:$('resultGrade'), perfectCount:$('perfectCount'), goodCount:$('goodCount'),
  accuracyText:$('accuracyText'), maxComboText:$('maxComboText'), resultComment:$('resultComment'), retryBtn:$('retryBtn'), menuBtn:$('menuBtn')
};

const DIFFICULTY = {
  easy:{label:'초급',seconds:30,noteCount:5,passCents:110,perfectCents:36,speed:112,spawnMs:2450,gapPx:112},
  normal:{label:'보통',seconds:45,noteCount:8,passCents:78,perfectCents:28,speed:132,spawnMs:2150,gapPx:92},
  hard:{label:'도전',seconds:60,noteCount:8,passCents:52,perfectCents:20,speed:154,spawnMs:1850,gapPx:76}
};
const NOTE_NAMES = ['도','레','미','파','솔','라','시','높은 도'];
const SCALE = [0,2,4,5,7,9,11,12];
const SAVE_KEY = 'kidscade_perfect_pitch_v1';
const TAU = Math.PI * 2;

const state = {
  phase:'intro', difficulty:'easy', audioCtx:null, analyser:null, stream:null, buffer:null,
  pitchHz:null, smoothHz:null, voiced:false, rms:0, rootMidi:60, calibrated:false,
  calSamples:[], calStartedAt:0, calCollectAt:0, calRaf:0,
  gameStartedAt:0, gameEndsAt:0, lastFrame:0, lastPitchAt:0, lastSpawnAt:0,
  gates:[], particles:[], sequenceIndex:0, score:0, combo:0, maxCombo:0, perfect:0, good:0, miss:0,
  currentTarget:null, raf:0, resizeNeeded:true, best:loadBest()
};

function showScreen(name){
  Object.entries(screens).forEach(([key,el])=>el.classList.toggle('active',key===name));
  state.phase=name;
}
function loadBest(){
  try{
    const v=window.KidscadeStorage?.getJson?.(SAVE_KEY,null);
    if(v&&typeof v==='object')return {score:Number(v.score)||0,combo:Number(v.combo)||0};
  }catch(_){}
  return {score:0,combo:0};
}
function saveBest(){
  const next={score:Math.max(state.best.score,state.score),combo:Math.max(state.best.combo,state.maxCombo)};
  state.best=next;
  try{window.KidscadeStorage?.setJson?.(SAVE_KEY,next)}catch(_){}
}
function stopMic(){
  if(state.stream){state.stream.getTracks().forEach(t=>t.stop());state.stream=null}
  if(state.audioCtx&&state.audioCtx.state!=='closed'){try{state.audioCtx.close()}catch(_){}}
  state.audioCtx=null;state.analyser=null;state.buffer=null;state.pitchHz=null;state.smoothHz=null;state.voiced=false;
}
async function requestMic(){
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('이 브라우저는 마이크 입력을 지원하지 않아요.');
  stopMic();
  const stream=await navigator.mediaDevices.getUserMedia({
    audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},
    video:false
  });
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC){stream.getTracks().forEach(t=>t.stop());throw new Error('오디오 분석 기능을 사용할 수 없어요.')}
  const ctx=new AC();
  if(ctx.state==='suspended')await ctx.resume();
  const analyser=ctx.createAnalyser();
  analyser.fftSize=2048;
  analyser.smoothingTimeConstant=0;
  const source=ctx.createMediaStreamSource(stream);
  source.connect(analyser);
  state.stream=stream;state.audioCtx=ctx;state.analyser=analyser;state.buffer=new Float32Array(analyser.fftSize);
}

function hzToMidi(hz){return 69+12*Math.log2(hz/440)}
function midiToHz(midi){return 440*Math.pow(2,(midi-69)/12)}
function nearestNoteName(hz){
  if(!hz||!Number.isFinite(hz))return '--';
  const midi=Math.round(hzToMidi(hz));
  const names=['도','도♯','레','레♯','미','파','파♯','솔','솔♯','라','라♯','시'];
  return names[(midi%12+12)%12];
}
function median(arr){
  if(!arr.length)return null;
  const a=arr.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
}
function detectPitch(){
  if(!state.analyser||!state.buffer)return null;
  state.analyser.getFloatTimeDomainData(state.buffer);
  const buf=state.buffer;
  let rms=0;
  for(let i=0;i<buf.length;i++)rms+=buf[i]*buf[i];
  rms=Math.sqrt(rms/buf.length);state.rms=rms;
  if(rms<0.012){state.voiced=false;return null}

  const sampleRate=state.audioCtx.sampleRate;
  const minFreq=80,maxFreq=950;
  const minTau=Math.max(2,Math.floor(sampleRate/maxFreq));
  const maxTau=Math.min(Math.floor(sampleRate/minFreq),Math.floor(buf.length/2));
  const difference=new Float32Array(maxTau+1);
  const cmnd=new Float32Array(maxTau+1);

  for(let tau=1;tau<=maxTau;tau++){
    let sum=0;
    const limit=buf.length-tau;
    for(let i=0;i<limit;i++){
      const delta=buf[i]-buf[i+tau];
      sum+=delta*delta;
    }
    difference[tau]=sum;
  }

  cmnd[0]=1;
  let running=0;
  for(let tau=1;tau<=maxTau;tau++){
    running+=difference[tau];
    cmnd[tau]=running?difference[tau]*tau/running:1;
  }

  const threshold=0.14;
  let bestTau=-1;
  for(let tau=minTau;tau<=maxTau;tau++){
    if(cmnd[tau]<threshold){
      while(tau+1<=maxTau&&cmnd[tau+1]<cmnd[tau])tau++;
      bestTau=tau;
      break;
    }
  }
  if(bestTau<0){
    let bestValue=1;
    for(let tau=minTau;tau<=maxTau;tau++){
      if(cmnd[tau]<bestValue){bestValue=cmnd[tau];bestTau=tau}
    }
    if(bestTau<0||bestValue>0.30){state.voiced=false;return null}
  }

  let refined=bestTau;
  if(bestTau>1&&bestTau<maxTau){
    const left=cmnd[bestTau-1],center=cmnd[bestTau],right=cmnd[bestTau+1];
    const den=2*center-right-left;
    if(Math.abs(den)>1e-6)refined=bestTau+(right-left)/(2*den);
  }

  const hz=sampleRate/refined;
  if(!Number.isFinite(hz)||hz<minFreq||hz>maxFreq){state.voiced=false;return null}
  state.voiced=true;
  return hz;
}
function updatePitch(now){
  if(now-state.lastPitchAt<45)return;
  state.lastPitchAt=now;
  const hz=detectPitch();
  if(hz){
    if(state.smoothHz){
      const a=hzToMidi(state.smoothHz),b=hzToMidi(hz);
      const diff=Math.abs(a-b);
      const mix=diff>3?0.5:0.28;
      state.smoothHz=midiToHz(a+(b-a)*mix);
    }else state.smoothHz=hz;
    state.pitchHz=hz;
  }else{
    state.pitchHz=null;
    if(state.phase!=='game')state.smoothHz=null;
  }
}

function chooseDifficulty(value){
  if(!DIFFICULTY[value])return;
  state.difficulty=value;
  document.querySelectorAll('.diff').forEach(b=>b.classList.toggle('active',b.dataset.difficulty===value));
}
ui.difficultyList.addEventListener('click',e=>{
  const b=e.target.closest('.diff');if(b)chooseDifficulty(b.dataset.difficulty);
});

async function beginCalibration(){
  ui.introStatus.textContent='';
  try{
    await requestMic();
    state.calSamples=[];state.calStartedAt=performance.now();state.calCollectAt=state.calStartedAt+450;state.lastPitchAt=0;
    ui.calProgress.style.width='0%';ui.calHint.textContent='1.5초 이상 안정적으로 소리를 내주세요.';
    showScreen('calibration');
    cancelAnimationFrame(state.calRaf);
    state.calRaf=requestAnimationFrame(calibrationLoop);
  }catch(err){
    ui.introStatus.textContent=err?.name==='NotAllowedError'?'마이크 권한이 필요해요. 브라우저 설정에서 마이크를 허용해 주세요.':(err?.message||'마이크를 시작하지 못했어요.');
  }
}
function calibrationLoop(now){
  if(state.phase!=='calibration')return;
  updatePitch(now);
  if(state.voiced&&state.pitchHz){
    ui.calValue.textContent=Math.round(state.pitchHz)+' Hz';
    ui.calNote.textContent='현재 '+nearestNoteName(state.pitchHz)+' 근처';
    const scale=Math.max(.82,Math.min(1.14,.9+state.rms*3.2));ui.calOrb.style.transform='scale('+scale+')';
    if(now>=state.calCollectAt){
      state.calSamples.push(hzToMidi(state.pitchHz));
      if(state.calSamples.length>60)state.calSamples.shift();
    }
  }else{
    ui.calValue.textContent='-- Hz';ui.calNote.textContent='목소리를 기다리는 중';ui.calOrb.style.transform='scale(.94)';
  }
  const voicedMs=Math.min(1700,state.calSamples.length*45);
  const pct=Math.round(voicedMs/1700*100);ui.calProgress.style.width=pct+'%';
  if(state.calSamples.length>=34){
    const m=median(state.calSamples);
    const spread=Math.max(...state.calSamples)-Math.min(...state.calSamples);
    if(spread<2.4){
      state.rootMidi=Math.round(m-4);
      state.calibrated=true;
      ui.calHint.textContent='좋아요! 이 목소리를 기준으로 음역을 맞췄어요.';
      setTimeout(()=>{if(state.phase==='calibration')startGame()},360);
      return;
    }
    if(state.calSamples.length>=55){
      state.calSamples=state.calSamples.slice(-18);
      ui.calHint.textContent='조금 더 한 높이로 길게 “아~~~” 해주세요.';
    }
  }
  state.calRaf=requestAnimationFrame(calibrationLoop);
}
function useDefaultRange(){
  state.rootMidi=60;state.calibrated=false;
  requestMic().then(()=>startGame()).catch(err=>{
    ui.introStatus.textContent=err?.name==='NotAllowedError'?'마이크 권한이 필요해요.':'마이크를 시작하지 못했어요.';
  });
}

function resizeCanvas(){
  const rect=ui.stageWrap.getBoundingClientRect();
  const dpr=Math.min(2,window.devicePixelRatio||1);
  const w=Math.max(320,Math.round(rect.width)),h=Math.max(260,Math.round(rect.height));
  ui.stage.width=Math.round(w*dpr);ui.stage.height=Math.round(h*dpr);
  ui.stage.style.width=w+'px';ui.stage.style.height=h+'px';
  const ctx=ui.stage.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  state.viewW=w;state.viewH=h;state.dpr=dpr;state.resizeNeeded=false;
}
window.addEventListener('resize',()=>state.resizeNeeded=true);

function cfg(){return DIFFICULTY[state.difficulty]}
function laneYBySemitone(semi){
  const h=state.viewH||400,margin=Math.max(42,h*.10);
  return h-margin-(semi/12)*(h-margin*2);
}
function pitchY(){
  if(!state.smoothHz)return state.viewH*.72;
  const semi=hzToMidi(state.smoothHz)-state.rootMidi;
  const clamped=Math.max(-1,Math.min(13,semi));
  return laneYBySemitone(clamped);
}
function targetMidi(index){return state.rootMidi+SCALE[index]}
function targetFrequency(index){return midiToHz(targetMidi(index))}
function noteErrorCents(index){
  if(!state.pitchHz||!state.voiced)return null;
  return 1200*Math.log2(state.pitchHz/targetFrequency(index));
}
function nextTargetIndex(){
  const c=cfg();
  const opening=c.noteCount===5?[0,1,2,3,4,2,0]:[0,1,2,3,4,5,6,7,4,2];
  if(state.sequenceIndex<opening.length)return opening[state.sequenceIndex++];
  const prev=state.gates.length?state.gates[state.gates.length-1].target:(state.currentTarget??2);
  let options=[];
  for(let i=0;i<c.noteCount;i++)if(i!==prev&&Math.abs(i-prev)<=3)options.push(i);
  if(!options.length)options=Array.from({length:c.noteCount},(_,i)=>i);
  state.sequenceIndex++;
  return options[Math.floor(Math.random()*options.length)];
}
function spawnGate(initial=false){
  const target=nextTargetIndex(),w=state.viewW||900;
  state.gates.push({x:initial?w*.70:w+70,target,judged:false,grade:null,flash:0});
  updateTargetHud();
}
function updateTargetHud(){
  const approaching=state.gates.filter(g=>!g.judged&&g.x>(state.viewW||900)*.20-50).sort((a,b)=>a.x-b.x)[0];
  if(!approaching)return;
  state.currentTarget=approaching.target;
  ui.targetNote.textContent=NOTE_NAMES[approaching.target];
  ui.targetText.textContent='다음 문 · '+NOTE_NAMES[approaching.target];
  ui.targetHz.textContent='목표 '+Math.round(targetFrequency(approaching.target))+' Hz · 음표 문에 공을 맞춰요';
}

function startGame(){
  cancelAnimationFrame(state.calRaf);
  const c=cfg();
  state.score=0;state.combo=0;state.maxCombo=0;state.perfect=0;state.good=0;state.miss=0;state.gates=[];state.particles=[];
  state.sequenceIndex=0;state.currentTarget=null;state.lastFrame=performance.now();state.lastPitchAt=0;state.lastSpawnAt=state.lastFrame;
  state.gameStartedAt=state.lastFrame;state.gameEndsAt=state.lastFrame+c.seconds*1000;
  showScreen('game');state.resizeNeeded=true;resizeCanvas();spawnGate(true);
  ui.modeLabel.textContent=c.label+' · '+(state.calibrated?'맞춤 음역':'기본 C 음역');
  updateHud();
  try{window.KidscadeGame?.start?.({difficulty:state.difficulty,calibrated:state.calibrated,rootMidi:state.rootMidi})}catch(_){}
  cancelAnimationFrame(state.raf);state.raf=requestAnimationFrame(gameLoop);
}
function updateHud(){
  ui.score.textContent=state.score;ui.combo.textContent=state.combo;
}
function burst(x,y,kind){
  const count=kind==='perfect'?20:12;
  for(let i=0;i<count;i++){
    const a=Math.random()*TAU,s=50+Math.random()*120;
    state.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.55+Math.random()*.35,max:.9,r:2+Math.random()*4,kind});
  }
}
function popGrade(text,kind){
  ui.floatGrade.textContent=text;
  ui.floatGrade.style.color=kind==='perfect'?'#ffe66f':kind==='good'?'#79f2ad':'#ff8a9b';
  ui.floatGrade.classList.remove('show');void ui.floatGrade.offsetWidth;ui.floatGrade.classList.add('show');
}
function judgeGate(g){
  if(g.judged)return;
  g.judged=true;
  const err=noteErrorCents(g.target),c=cfg();
  if(err!==null&&Math.abs(err)<=c.perfectCents){
    g.grade='perfect';state.perfect++;state.combo++;state.score+=120+Math.min(100,state.combo*4);
    popGrade('PERFECT!','perfect');burst((state.viewW||900)*.22,laneYBySemitone(SCALE[g.target]),'perfect');
  }else if(err!==null&&Math.abs(err)<=c.passCents){
    g.grade='good';state.good++;state.combo++;state.score+=75+Math.min(60,state.combo*2);
    popGrade('GOOD!','good');burst((state.viewW||900)*.22,laneYBySemitone(SCALE[g.target]),'good');
  }else{
    g.grade='miss';state.miss++;state.combo=0;popGrade(err===null?'소리를 내봐요!':'MISS','miss');
  }
  state.maxCombo=Math.max(state.maxCombo,state.combo);
  g.flash=.34;updateHud();
  try{window.KidscadeGame?.score?.(state.score,{unit:'점',higherIsBetter:true})}catch(_){}
}
function gameLoop(now){
  if(state.phase!=='game')return;
  if(state.resizeNeeded)resizeCanvas();
  updatePitch(now);
  const dt=Math.min(.05,(now-state.lastFrame)/1000||0);state.lastFrame=now;
  const c=cfg(),px=(state.viewW||900)*.22;
  if(now-state.lastSpawnAt>=c.spawnMs){spawnGate(false);state.lastSpawnAt=now}
  for(const g of state.gates){
    g.x-=c.speed*dt;if(g.flash>0)g.flash-=dt;
    if(!g.judged&&g.x<=px+8)judgeGate(g);
  }
  state.gates=state.gates.filter(g=>g.x>-100);
  for(const p of state.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=90*dt;p.life-=dt}
  state.particles=state.particles.filter(p=>p.life>0);
  updateTargetHud();
  updatePitchHud();
  draw();
  const left=Math.max(0,state.gameEndsAt-now);ui.time.textContent=Math.ceil(left/1000);
  if(left<=0){endGame();return}
  state.raf=requestAnimationFrame(gameLoop);
}
function updatePitchHud(){
  ui.micBadge.classList.toggle('voiced',state.voiced);
  if(state.voiced&&state.pitchHz){
    ui.currentNote.textContent=nearestNoteName(state.pitchHz);
    ui.currentHz.textContent=Math.round(state.pitchHz)+' Hz';
    ui.micText.textContent='목소리 감지 중';
  }else{
    ui.currentNote.textContent='--';ui.currentHz.textContent='목소리를 내보세요';ui.micText.textContent='목소리를 기다리는 중';
  }
  if(state.currentTarget!=null){
    const err=noteErrorCents(state.currentTarget);
    const clamped=err==null?0:Math.max(-150,Math.min(150,err));
    ui.tuneNeedle.style.left=(50+clamped/3)+'%';
  }else ui.tuneNeedle.style.left='50%';
}

function draw(){
  const ctx=ui.stage.getContext('2d'),w=state.viewW,h=state.viewH,c=cfg();
  const grad=ctx.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#111845');grad.addColorStop(.55,'#080d2b');grad.addColorStop(1,'#050817');
  ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  for(let i=0;i<42;i++){
    const x=(i*137+performance.now()*.012*(i%3+1))%(w+40)-20,y=(i*83)%h;
    ctx.globalAlpha=.13+(i%4)*.05;ctx.fillStyle=i%5===0?'#ff78d2':'#9edfff';ctx.fillRect(x,y,1.5,1.5);
  }
  ctx.globalAlpha=1;
  const count=c.noteCount;
  for(let i=0;i<count;i++){
    const y=laneYBySemitone(SCALE[i]);
    ctx.strokeStyle=i===0||i===count-1?'#6276bb44':'#6276bb25';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();
    ctx.fillStyle='#8693c8';ctx.font='900 11px system-ui';ctx.fillText(NOTE_NAMES[i],10,y-7);
  }
  for(const g of state.gates)drawGate(ctx,g,w,h);
  const py=pitchY(),px=w*.22;
  ctx.save();
  if(state.voiced){
    const halo=ctx.createRadialGradient(px,py,5,px,py,38);halo.addColorStop(0,'#8ff3ff88');halo.addColorStop(1,'#8ff3ff00');
    ctx.fillStyle=halo;ctx.beginPath();ctx.arc(px,py,38,0,TAU);ctx.fill();
  }
  ctx.shadowBlur=22;ctx.shadowColor=state.voiced?'#72e9ff':'#65709c';
  const ball=ctx.createRadialGradient(px-8,py-9,3,px,py,22);ball.addColorStop(0,'#fff');ball.addColorStop(.28,state.voiced?'#9af5ff':'#aab1c8');ball.addColorStop(1,state.voiced?'#657eff':'#4f5878');
  ctx.fillStyle=ball;ctx.beginPath();ctx.arc(px,py,20,0,TAU);ctx.fill();ctx.restore();
  ctx.strokeStyle='#ffffff22';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px-45,py);ctx.lineTo(px-25,py);ctx.stroke();

  for(const p of state.particles){
    ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.kind==='perfect'?'#ffe66f':'#79f2ad';
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,TAU);ctx.fill();
  }
  ctx.globalAlpha=1;
}
function drawGate(ctx,g,w,h){
  const y=laneYBySemitone(SCALE[g.target]),gap=cfg().gapPx,gw=38;
  let color='#815dff';
  if(g.grade==='perfect')color='#ffd95e';else if(g.grade==='good')color='#69e7a2';else if(g.grade==='miss')color='#ff7086';
  ctx.save();ctx.shadowBlur=g.flash>0?28:14;ctx.shadowColor=color;
  const gg=ctx.createLinearGradient(g.x-gw/2,0,g.x+gw/2,0);gg.addColorStop(0,'#343f8f');gg.addColorStop(.5,color);gg.addColorStop(1,'#2c3276');
  ctx.fillStyle=gg;
  ctx.fillRect(g.x-gw/2,0,gw,Math.max(0,y-gap/2));
  ctx.fillRect(g.x-gw/2,y+gap/2,gw,Math.max(0,h-(y+gap/2)));
  ctx.shadowBlur=0;
  ctx.strokeStyle=color;ctx.lineWidth=3;ctx.strokeRect(g.x-gw/2,y-gap/2,gw,gap);
  ctx.fillStyle='#09102e';ctx.beginPath();ctx.roundRect(g.x-34,y-27,68,54,14);ctx.fill();
  ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle=color;ctx.font='1000 25px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(NOTE_NAMES[g.target],g.x,y+1);
  ctx.restore();
}

function endGame(){
  cancelAnimationFrame(state.raf);
  const total=state.perfect+state.good+state.miss,passed=state.perfect+state.good,accuracy=total?Math.round(passed/total*100):0;
  saveBest();stopMic();
  ui.resultScore.textContent=state.score.toLocaleString('ko-KR');
  ui.perfectCount.textContent=state.perfect;ui.goodCount.textContent=state.good;ui.accuracyText.textContent=accuracy+'%';ui.maxComboText.textContent=state.maxCombo;
  if(accuracy>=90&&state.perfect>=state.good)ui.resultGrade.textContent='음정을 아주 정확하게 잡았어요!';
  else if(accuracy>=75)ui.resultGrade.textContent='목소리 높낮이를 잘 조절했어요!';
  else if(accuracy>=50)ui.resultGrade.textContent='좋아요! 다음에는 음표 문 앞에서 조금 더 천천히 맞춰봐요.';
  else ui.resultGrade.textContent='처음엔 어려울 수 있어요. 초급에서 길게 소리 내며 움직임부터 익혀봐요.';
  const rootName=nearestNoteName(midiToHz(state.rootMidi));
  ui.resultComment.textContent=(state.calibrated?'맞춤 음역의 시작음은 '+rootName+' 근처였어요. ':'기본 C 음역으로 플레이했어요. ')+
    '최고 기록 '+state.best.score.toLocaleString('ko-KR')+'점 · 최고 콤보 '+state.best.combo+'회';
  showScreen('result');
  try{window.KidscadeGame?.gameOver?.({score:state.score,scoreOptions:{unit:'점',higherIsBetter:true},accuracy,perfect:state.perfect,good:state.good,miss:state.miss,maxCombo:state.maxCombo})}catch(_){}
}

ui.calibrateBtn.addEventListener('click',beginCalibration);
ui.defaultBtn.addEventListener('click',useDefaultRange);
ui.retryCalBtn.addEventListener('click',()=>{stopMic();beginCalibration()});
ui.cancelCalBtn.addEventListener('click',()=>{cancelAnimationFrame(state.calRaf);stopMic();showScreen('intro')});
ui.retryBtn.addEventListener('click',()=>{
  ui.introStatus.textContent='';
  requestMic().then(()=>startGame()).catch(()=>{showScreen('intro');ui.introStatus.textContent='마이크를 다시 허용해 주세요.'});
});
ui.menuBtn.addEventListener('click',()=>{stopMic();showScreen('intro')});

document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&state.phase==='game'){
    state.gameEndsAt+=1200;
  }
});
window.addEventListener('pagehide',stopMic);
window.addEventListener('beforeunload',stopMic);

})();
