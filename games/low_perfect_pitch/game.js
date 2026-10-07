(() => {
'use strict';

const $ = id => document.getElementById(id);
const screens = {
  intro:$('introScreen'), calibration:$('calibrationScreen'), game:$('gameScreen'), result:$('resultScreen')
};
const ui = {
  modeList:$('modeList'), modeHint:$('modeHint'), difficultyCopy:$('difficultyCopy'), difficultyList:$('difficultyList'), calibrateBtn:$('calibrateBtn'), defaultBtn:$('defaultBtn'), introStatus:$('introStatus'),
  calOrb:$('calOrb'), calValue:$('calValue'), calNote:$('calNote'), calProgress:$('calProgress'), calHint:$('calHint'), calDescription:$('calDescription'),
  retryCalBtn:$('retryCalBtn'), cancelCalBtn:$('cancelCalBtn'),
  modeLabel:$('modeLabel'), score:$('scoreText'), combo:$('comboText'), time:$('timeText'), thirdStatLabel:$('thirdStatLabel'), runProgress:$('runProgress'), coachPill:$('coachPill'),
  targetNote:$('targetNote'), targetText:$('targetText'), targetHz:$('targetHz'), currentNote:$('currentNote'), currentHz:$('currentHz'),
  tuneNeedle:$('tuneNeedle'), stage:$('stage'), stageWrap:$('stageWrap'), micBadge:$('micBadge'), micText:$('micText'), floatGrade:$('floatGrade'),
  resultTitle:$('resultTitle'), resultScore:$('resultScore'), resultGrade:$('resultGrade'), perfectCount:$('perfectCount'), goodCount:$('goodCount'),
  accuracyText:$('accuracyText'), accuracyLabel:$('accuracyLabel'), maxComboText:$('maxComboText'), maxComboLabel:$('maxComboLabel'), resultComment:$('resultComment'), retryBtn:$('retryBtn'), menuBtn:$('menuBtn')
};

const DIFFICULTY = {
  easy:{label:'초급',seconds:30,noteCount:5,passCents:110,perfectCents:36,speed:112,spawnMs:2450,gapPx:112},
  normal:{label:'보통',seconds:45,noteCount:8,passCents:78,perfectCents:28,speed:132,spawnMs:2150,gapPx:92},
  hard:{label:'도전',seconds:60,noteCount:8,passCents:52,perfectCents:20,speed:154,spawnMs:1850,gapPx:76}
};
const NOTE_NAMES = ['도','레','미','파','솔','라','시','높은 도'];
const SCALE = [0,2,4,5,7,9,11,12];
const MAJOR_SCALE = [0,2,4,5,7,9,11];
const STAIR = {passCents:88,perfectCents:32,holdMs:520,stepMs:6500,restEvery:7,restMs:2600,maxHz:900};
const CLASSIC = {
  countdownMs:2400,feverMs:5200,starEvery:5,
  chapters:[
    {name:'1막 · 목소리 깨우기',short:'워밍업',at:0},
    {name:'2막 · 멜로디 여행',short:'멜로디',at:.33},
    {name:'3막 · 반짝 피날레',short:'피날레',at:.72}
  ],
  patterns:{
    easy:[
      [[0,1,2,1,0],[0,1,2,3,2],[0,2,1,3,2]],
      [[0,2,4,2,0],[4,3,2,1,0],[0,1,3,4,3,2]],
      [[0,1,2,3,4],[4,3,2,1,0],[0,2,4,3,2,1,0]]
    ],
    normal:[
      [[0,1,2,3,2,1],[0,2,4,2,0],[2,3,4,5,4,2]],
      [[0,2,4,5,4,2],[1,3,5,4,2,0],[4,5,6,7,5,4]],
      [[0,2,4,7,5,3,1],[7,6,4,2,0],[0,3,5,7,6,4,2]]
    ],
    hard:[
      [[0,2,1,4,2,5],[3,1,4,6,3,0],[2,5,3,6,4,1]],
      [[0,4,2,6,3,7],[7,4,6,2,5,1],[1,5,2,7,4,0]],
      [[0,4,7,3,6,2,5],[7,2,6,1,5,0],[0,5,2,7,3,6,1]]
    ]
  }
};
const STAIR_ZONES = [
  {step:0,name:'꽃구름 정원',top:'#f7eaff',mid:'#eaf9ff',bottom:'#fff9d9'},
  {step:7,name:'노을 하늘',top:'#ffe8ef',mid:'#f3e9ff',bottom:'#fff0c9'},
  {step:14,name:'별빛 우주',top:'#151838',mid:'#2e3565',bottom:'#654b82'},
  {step:21,name:'오로라 정상',top:'#111632',mid:'#1d5966',bottom:'#775b8f'}
];
const SAVE_KEY = 'kidscade_perfect_pitch_v1';
const TAU = Math.PI * 2;

const state = {
  phase:'intro', gameMode:'classic', difficulty:'easy', audioCtx:null, analyser:null, stream:null, buffer:null,
  pitchHz:null, smoothHz:null, voiced:false, rms:0, rootMidi:60, calibrated:false,
  calSamples:[], calStartedAt:0, calCollectAt:0, calRaf:0,
  gameStartedAt:0, gameEndsAt:0, lastFrame:0, lastPitchAt:0, lastSpawnAt:0,
  gates:[], particles:[], sequenceIndex:0, phraseQueue:[], score:0, combo:0, maxCombo:0, perfect:0, good:0, miss:0,
  countdownUntil:0,classicStarted:false,gateCount:0,passedGates:0,chapterIndex:0,feverUntil:0,lastFeverCombo:0,starsEarned:0,
  stairStep:0,stairPeak:0,stairLives:3,stairHoldAt:0,stairStepStartedAt:0,stairRestUntil:0,stairLastError:null,stairBestCelebrated:false,
  currentTarget:null, raf:0, resizeNeeded:true, best:loadBest()
};

function showScreen(name){
  Object.entries(screens).forEach(([key,el])=>el.classList.toggle('active',key===name));
  state.phase=name;
}
function loadBest(){
  try{
    const v=window.KidscadeStorage?.getJson?.(SAVE_KEY,null);
    if(v&&typeof v==='object')return {score:Number(v.score)||0,combo:Number(v.combo)||0,stairPeak:Number(v.stairPeak)||0,stars:Number(v.stars)||0};
  }catch(_){}
  return {score:0,combo:0,stairPeak:0,stars:0};
}
function saveBest(){
  const next={score:Math.max(state.best.score,state.score),combo:Math.max(state.best.combo,state.maxCombo),stairPeak:Math.max(state.best.stairPeak||0,state.stairPeak||0),stars:Math.max(state.best.stars||0,state.starsEarned||0)};
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

function chooseMode(value){
  if(!['classic','stair'].includes(value))return;
  state.gameMode=value;
  document.querySelectorAll('.mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===value));
  const stair=value==='stair';
  ui.modeHint.textContent=stair
    ? '무한 고음 계단 · 7층마다 쉼터가 나오고, 하늘 풍경이 바뀌며 개인 최고 높이에 도전해요. 3번 실패하면 끝나요.'
    : '노래길 모드 · 1막 워밍업 → 2막 멜로디 → 3막 피날레로 이어져요. 5콤보마다 잠깐 FEVER가 시작됩니다.';
  ui.difficultyCopy.textContent=stair
    ? '난이도는 판정 폭에만 적용돼요. 계단은 성공할 때마다 계속 한 칸씩 높아집니다.'
    : '처음에는 초급을 추천해요. 판정 폭과 음표 수가 난이도에 따라 달라집니다.';
  ui.calDescription.innerHTML=stair
    ? '평소 가장 편한 음으로 “아~~~” 해주세요.<br>그 음을 기준으로 계단을 시작하므로 일부러 높게 부를 필요가 없어요.'
    : '높이려고 애쓰지 말고 평소 가장 편한 음을 길게 내면<br>게임이 그 목소리에 맞춰 도~높은 도 범위를 정해요.';
  ui.calibrateBtn.textContent=stair?'🎤 내 음역 맞추고 계단 시작':'🎤 내 음역 맞추고 시작';
  ui.defaultBtn.textContent=stair?'기본 음역으로 체험':'바로 체험';
}
ui.modeList.addEventListener('click',e=>{
  const b=e.target.closest('.mode-btn');if(b)chooseMode(b.dataset.mode);
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
function stairSemitone(step){
  const s=Math.max(0,Math.floor(step));
  return Math.floor(s/7)*12+MAJOR_SCALE[s%7];
}
function stairNoteName(step){
  const names=['도','레','미','파','솔','라','시'];
  const octave=Math.floor(step/7);
  return (octave===0?'':octave===1?'높은 ':octave===2?'더 높은 ':'+'+octave+'옥타브 ')+names[step%7];
}
function targetMidi(index){return state.rootMidi+(state.gameMode==='stair'?stairSemitone(index):SCALE[index])}
function targetFrequency(index){return midiToHz(targetMidi(index))}
function noteErrorCents(index){
  if(!state.pitchHz||!state.voiced)return null;
  return 1200*Math.log2(state.pitchHz/targetFrequency(index));
}
function nextTargetIndex(){
  if(!state.phraseQueue.length){
    const chapters=CLASSIC.patterns[state.difficulty]||CLASSIC.patterns.easy;
    const bank=chapters[Math.min(state.chapterIndex,chapters.length-1)]||chapters[0];
    const phrase=bank[state.sequenceIndex%bank.length]||bank[0];
    state.sequenceIndex++;
    state.phraseQueue=phrase.slice();
  }
  return state.phraseQueue.shift();
}
function spawnGate(initial=false){
  const target=nextTargetIndex(),w=state.viewW||900;
  state.gateCount++;
  const star=!initial&&(state.gateCount%CLASSIC.starEvery===0||(state.chapterIndex===2&&state.gateCount%3===0));
  state.gates.push({x:initial?w*.70:w+70,target,judged:false,grade:null,flash:0,kind:star?'star':'note'});
  updateTargetHud();
}
function classicChapterFor(now){
  const total=Math.max(1,state.gameEndsAt-state.gameStartedAt);
  const ratio=Math.max(0,Math.min(1,(now-state.gameStartedAt)/total));
  return {ratio,index:ratio>=.72?2:ratio>=.33?1:0};
}
function updateClassicChapter(now){
  const info=classicChapterFor(now),next=info.index;
  if(next!==state.chapterIndex){
    state.chapterIndex=next;state.phraseQueue=[];
    const ch=CLASSIC.chapters[next];
    popGrade(next===2?'피날레! 별 문을 잡아요 ⭐':ch.name,'perfect');
    burst((state.viewW||900)*.50,(state.viewH||400)*.42,'perfect');
  }
  const ch=CLASSIC.chapters[state.chapterIndex],c=cfg();
  ui.modeLabel.textContent=c.label+' · '+ch.name;
  if(ui.runProgress)ui.runProgress.style.width=Math.round(info.ratio*100)+'%';
  if(ui.coachPill){
    const fever=state.feverUntil>now;
    ui.coachPill.textContent=fever?'🔥 FEVER! 성공 점수 1.5배':state.chapterIndex===2?'⭐ 피날레 · 별 문은 보너스 점수':'🎤 5콤보마다 FEVER!';
    ui.coachPill.classList.toggle('fever',fever);
  }
  return info;
}
function drawCountdown(now){
  const ctx=ui.stage.getContext('2d'),w=state.viewW,h=state.viewH;
  const left=Math.max(0,state.countdownUntil-now),n=Math.max(1,Math.ceil(left/800));
  ctx.save();ctx.fillStyle='#ffffffc9';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#665274';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='1000 '+Math.max(48,Math.min(92,w*.09))+'px system-ui';ctx.fillText(n>3?'준비':String(n),w*.5,h*.47);
  ctx.font='900 16px system-ui';ctx.fillStyle='#8b7898';ctx.fillText('편하게 소리를 내며 공을 움직여 보세요',w*.5,h*.62);
  ctx.restore();
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
  if(state.gameMode==='stair'){startStairGame();return}
  const c=cfg();
  state.score=0;state.combo=0;state.maxCombo=0;state.perfect=0;state.good=0;state.miss=0;state.gates=[];state.particles=[];
  state.sequenceIndex=0;state.phraseQueue=[];state.currentTarget=null;state.gateCount=0;state.passedGates=0;state.chapterIndex=0;
  state.feverUntil=0;state.lastFeverCombo=0;state.starsEarned=0;state.classicStarted=false;
  state.lastFrame=performance.now();state.lastPitchAt=0;state.countdownUntil=state.lastFrame+CLASSIC.countdownMs;
  state.gameStartedAt=state.countdownUntil;state.gameEndsAt=state.gameStartedAt+c.seconds*1000;state.lastSpawnAt=state.gameStartedAt;
  showScreen('game');state.resizeNeeded=true;resizeCanvas();
  ui.modeLabel.textContent=c.label+' · '+CLASSIC.chapters[0].name;
  ui.thirdStatLabel.textContent='남은 시간';ui.time.textContent='준비';
  if(ui.runProgress)ui.runProgress.style.width='0%';
  updateHud();
  try{window.KidscadeGame?.start?.({difficulty:state.difficulty,calibrated:state.calibrated,rootMidi:state.rootMidi})}catch(_){}
  cancelAnimationFrame(state.raf);state.raf=requestAnimationFrame(gameLoop);
}
function updateHud(){
  ui.score.textContent=state.score;
  ui.combo.textContent=state.combo+(state.gameMode==='classic'&&state.feverUntil>performance.now()?'🔥':'');
}

function stairTolerance(){
  if(state.difficulty==='easy')return {pass:118,perfect:42};
  if(state.difficulty==='hard')return {pass:62,perfect:24};
  return {pass:STAIR.passCents,perfect:STAIR.perfectCents};
}
function startStairGame(){
  state.score=0;state.combo=0;state.maxCombo=0;state.perfect=0;state.good=0;state.miss=0;state.gates=[];state.particles=[];state.starsEarned=0;
  state.stairStep=0;state.stairPeak=0;state.stairLives=3;state.stairHoldAt=0;state.stairRestUntil=0;state.stairLastError=null;state.stairBestCelebrated=false;
  state.lastFrame=performance.now();state.lastPitchAt=0;state.stairStepStartedAt=state.lastFrame;state.gameStartedAt=state.lastFrame;
  state.currentTarget=0;showScreen('game');state.resizeNeeded=true;resizeCanvas();
  ui.modeLabel.textContent='무한 고음 계단 · '+stairZone(state.stairStep).name;
  ui.thirdStatLabel.textContent='기회';ui.time.textContent='♥♥♥';
  if(ui.runProgress)ui.runProgress.style.width='0%';
  if(ui.coachPill)ui.coachPill.textContent='☁ 7층마다 쉼터 · 최고 '+(state.best.stairPeak||0)+'층';
  updateStairTargetHud();updateHud();
  try{window.KidscadeGame?.start?.({mode:'stair',difficulty:state.difficulty,calibrated:state.calibrated,rootMidi:state.rootMidi})}catch(_){}
  cancelAnimationFrame(state.raf);state.raf=requestAnimationFrame(stairGameLoop);
}
function stairZone(step){
  let zone=STAIR_ZONES[0];
  for(const z of STAIR_ZONES)if(step>=z.step)zone=z;
  return zone;
}
function updateStairTargetHud(){
  state.currentTarget=state.stairStep;
  const label=stairNoteName(state.stairStep),hz=targetFrequency(state.stairStep),zone=stairZone(state.stairStep);
  ui.targetNote.textContent=label.length>4?String(state.stairStep+1):label;
  ui.targetText.textContent=(state.stairStep+1)+'층 · '+label+' · '+zone.name;
  ui.targetHz.textContent='목표 '+Math.round(hz)+' Hz · 큰 소리보다 편하게 정확히 맞춰요';
  ui.modeLabel.textContent='무한 고음 계단 · '+zone.name;
  if(ui.runProgress)ui.runProgress.style.width=Math.min(100,(state.stairStep%7)/7*100)+'%';
}
function stairSuccess(kind,now){
  state[kind]++;state.combo++;state.maxCombo=Math.max(state.maxCombo,state.combo);
  state.stairPeak=Math.max(state.stairPeak,state.stairStep+1);
  state.score+=kind==='perfect'?150+state.stairStep*12:95+state.stairStep*8;
  popGrade(kind==='perfect'?'반짝 PERFECT! ✨':'좋아요! ♪',kind);
  burst((state.viewW||900)*.34,(state.viewH||400)*.56,kind);
  state.stairStep++;state.stairHoldAt=0;state.stairLastError=null;state.stairStepStartedAt=now;
  if(!state.stairBestCelebrated&&(state.best.stairPeak||0)>0&&state.stairPeak>state.best.stairPeak){
    state.stairBestCelebrated=true;state.score+=250;popGrade('내 최고 기록 돌파! +250 ✨','perfect');
    burst((state.viewW||900)*.5,(state.viewH||400)*.35,'perfect');
  }
  if(targetFrequency(state.stairStep)>=STAIR.maxHz){endGame('ceiling');return}
  if(state.stairStep>0&&state.stairStep%STAIR.restEvery===0){
    state.score+=300;state.stairRestUntil=now+STAIR.restMs;popGrade('구름 쉼터! +300 ☁','perfect');
    burst((state.viewW||900)*.5,(state.viewH||400)*.30,'perfect');
  }
  if(ui.coachPill)ui.coachPill.textContent='☁ 7층마다 쉼터 · 최고 '+Math.max(state.best.stairPeak||0,state.stairPeak)+'층';
  updateStairTargetHud();updateHud();
  try{window.KidscadeGame?.score?.(state.score,{unit:'점',higherIsBetter:true})}catch(_){}
}
function stairMiss(now){
  state.miss++;state.combo=0;state.stairLives--;state.stairHoldAt=0;state.stairStepStartedAt=now;state.stairLastError=null;
  popGrade('아깝! 다시 한 번 🌷','miss');updateHud();
  if(state.stairLives<=0){endGame('lives');return}
  ui.time.textContent='♥'.repeat(state.stairLives)+'♡'.repeat(3-state.stairLives);
}
function stairGameLoop(now){
  if(state.phase!=='game'||state.gameMode!=='stair')return;
  if(state.resizeNeeded)resizeCanvas();
  updatePitch(now);
  const dt=Math.min(.05,(now-state.lastFrame)/1000||0);state.lastFrame=now;
  for(const p of state.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=90*dt;p.life-=dt}
  state.particles=state.particles.filter(p=>p.life>0);
  if(state.stairRestUntil>now){
    ui.time.textContent='쉼';state.stairStepStartedAt=now;state.stairHoldAt=0;
  }else{
    ui.time.textContent='♥'.repeat(state.stairLives)+'♡'.repeat(3-state.stairLives);
    const err=noteErrorCents(state.stairStep);state.stairLastError=err;
    const tol=stairTolerance();
    if(err!==null&&Math.abs(err)<=tol.pass){
      if(!state.stairHoldAt)state.stairHoldAt=now;
      if(now-state.stairHoldAt>=STAIR.holdMs){
        stairSuccess(Math.abs(err)<=tol.perfect?'perfect':'good',now);
        if(state.phase!=='game')return;
      }
    }else state.stairHoldAt=0;
    if(now-state.stairStepStartedAt>=STAIR.stepMs)stairMiss(now);
    if(state.phase!=='game')return;
  }
  updatePitchHud();drawStair(now);
  state.raf=requestAnimationFrame(stairGameLoop);
}
function drawStair(now){
  const ctx=ui.stage.getContext('2d'),w=state.viewW,h=state.viewH,zone=stairZone(state.stairStep);
  const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,zone.top);bg.addColorStop(.48,zone.mid);bg.addColorStop(1,zone.bottom);
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  for(let i=0;i<18;i++){
    const x=(i*173+now*.008*(i%3+1))%(w+70)-35,y=28+(i*71)%(Math.max(80,h-70));
    ctx.globalAlpha=.22+(i%4)*.05;ctx.fillStyle=i%3===0?'#ffffff':i%3===1?'#f5b8d5':'#9de2ea';
    ctx.beginPath();ctx.arc(x,y,3+(i%3)*2,0,TAU);ctx.fill();
  }
  ctx.globalAlpha=1;
  if(state.stairStep>=14){
    ctx.fillStyle='#ffffff';ctx.globalAlpha=.7;
    for(let i=0;i<26;i++){const sx=(i*97)%Math.max(1,w),sy=(i*53)%Math.max(1,h*.72),r=1+(i%3);ctx.beginPath();ctx.arc(sx,sy,r,0,TAU);ctx.fill()}
    ctx.globalAlpha=1;
  }
  const rest=state.stairRestUntil>now;
  const baseX=w*.14,baseY=h*.82,stepW=Math.max(68,w*.105),stepH=Math.max(34,h*.075);
  for(let i=-2;i<=6;i++){
    const floor=state.stairStep+i;if(floor<0)continue;
    const x=baseX+(i+1.7)*stepW,y=baseY-(i+1.7)*stepH;
    const active=i===0;
    ctx.fillStyle=active?'#ffd97d':i<0?'#e9d9f5':'#cceff3';ctx.globalAlpha=active?1:.88;
    ctx.shadowBlur=active?18:8;ctx.shadowColor=active?'#e9b84c55':'#a38eb633';
    ctx.beginPath();ctx.roundRect(x,y,stepW+4,stepH,16);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle=active?'#6d5526':'#665a78';ctx.font='900 12px system-ui';ctx.textAlign='center';
    ctx.fillText((floor+1)+'층',x+stepW/2,y+stepH*.62);
  }
  ctx.globalAlpha=1;
  const targetY=baseY-1.7*stepH-20,px=baseX+1.7*stepW+stepW*.5;
  let py=targetY;
  if(state.stairLastError!==null)py=targetY-Math.max(-150,Math.min(150,state.stairLastError))*.18;
  ctx.save();ctx.shadowBlur=22;ctx.shadowColor=state.voiced?'#f1a7cd':'#b8abc4';
  const ball=ctx.createRadialGradient(px-7,py-8,3,px,py,22);ball.addColorStop(0,'#fff');ball.addColorStop(.32,state.voiced?'#fff4a2':'#f5edf6');ball.addColorStop(1,state.voiced?'#f39fc7':'#bcb1c9');
  ctx.fillStyle=ball;ctx.beginPath();ctx.arc(px,py,20,0,TAU);ctx.fill();ctx.restore();
  ctx.fillStyle='#a36887';ctx.font='900 15px system-ui';ctx.textAlign='center';ctx.fillText('♪',px,py+5);
  const tol=stairTolerance(),err=state.stairLastError,within=err!==null&&Math.abs(err)<=tol.pass;
  const progress=state.stairHoldAt&&within?Math.min(1,(now-state.stairHoldAt)/STAIR.holdMs):0;
  ctx.fillStyle='#ffffffcc';ctx.fillRect(w*.24,h*.10,w*.52,14);
  ctx.fillStyle='#7ed9b4';ctx.fillRect(w*.24,h*.10,w*.52*progress,14);
  ctx.strokeStyle='#d6c7df';ctx.strokeRect(w*.24,h*.10,w*.52,14);
  ctx.fillStyle='#5f5370';ctx.font='900 16px system-ui';ctx.textAlign='center';
  ctx.fillText(rest?'구름 쉼터 · 목에 힘을 빼요 ☁':(state.stairStep+1)+'층  '+stairNoteName(state.stairStep),w*.5,h*.10-10);
  ctx.fillStyle='#877a94';ctx.font='800 11px system-ui';
  ctx.fillText('큰 소리는 필요 없어요 · 편안한 목소리로 올라가요',w*.5,h*.10+42);
  ctx.textAlign='right';ctx.fillStyle=state.stairStep>=14?'#ffffffcc':'#776b88';ctx.font='900 11px system-ui';
  ctx.fillText('내 최고 '+(state.best.stairPeak||0)+'층',w-18,24);
  for(const p of state.particles){
    ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.kind==='perfect'?'#f6bf55':'#72d6ae';
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,TAU);ctx.fill();
  }
  ctx.globalAlpha=1;
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
  ui.floatGrade.style.color=kind==='perfect'?'#c88618':kind==='good'?'#319c78':'#cf5f79';
  ui.floatGrade.classList.remove('show');void ui.floatGrade.offsetWidth;ui.floatGrade.classList.add('show');
}
function judgeGate(g){
  if(g.judged)return;
  g.judged=true;
  const err=noteErrorCents(g.target),c=cfg(),now=performance.now(),fever=state.feverUntil>now,bonus=g.kind==='star';
  const mult=fever?1.5:1;
  if(err!==null&&Math.abs(err)<=c.perfectCents){
    g.grade='perfect';state.perfect++;state.combo++;state.passedGates++;
    state.score+=Math.round((120+Math.min(100,state.combo*4)+(bonus?100:0))*mult);
    popGrade(bonus?'STAR PERFECT! ⭐':'반짝 PERFECT! ✨','perfect');burst((state.viewW||900)*.22,laneYBySemitone(SCALE[g.target]),'perfect');
  }else if(err!==null&&Math.abs(err)<=c.passCents){
    g.grade='good';state.good++;state.combo++;state.passedGates++;
    state.score+=Math.round((75+Math.min(60,state.combo*2)+(bonus?70:0))*mult);
    popGrade(bonus?'별 문 통과! ⭐':'좋아요! ♪','good');burst((state.viewW||900)*.22,laneYBySemitone(SCALE[g.target]),'good');
  }else{
    g.grade='miss';state.miss++;state.combo=0;state.feverUntil=0;popGrade(err===null?'목소리를 들려줘요 ♪':'아깝!','miss');
  }
  if(state.combo>=5&&state.combo%5===0&&state.combo!==state.lastFeverCombo){
    state.lastFeverCombo=state.combo;state.feverUntil=now+CLASSIC.feverMs;
    popGrade('FEVER! '+state.combo+'콤보 🔥','perfect');burst((state.viewW||900)*.5,(state.viewH||400)*.45,'perfect');
  }
  state.maxCombo=Math.max(state.maxCombo,state.combo);
  g.flash=.34;updateHud();
  try{window.KidscadeGame?.score?.(state.score,{unit:'점',higherIsBetter:true})}catch(_){}
}
function gameLoop(now){
  if(state.phase!=='game')return;
  if(state.resizeNeeded)resizeCanvas();
  updatePitch(now);
  const c=cfg(),px=(state.viewW||900)*.22;
  if(!state.classicStarted){
    draw();updatePitchHud();drawCountdown(now);
    if(now<state.countdownUntil){state.raf=requestAnimationFrame(gameLoop);return}
    state.classicStarted=true;state.lastFrame=now;state.lastSpawnAt=now;spawnGate(true);
    popGrade('노래길 출발! ♪','good');
  }
  const dt=Math.min(.05,(now-state.lastFrame)/1000||0);state.lastFrame=now;
  const progress=updateClassicChapter(now);
  const speedMul=[.92,1,1.10][progress.index],spawnMul=[1.06,1,.86][progress.index];
  if(state.feverUntil&&state.feverUntil<=now){state.feverUntil=0;updateHud()}
  if(now-state.lastSpawnAt>=c.spawnMs*spawnMul){spawnGate(false);state.lastSpawnAt=now}
  for(const g of state.gates){
    g.x-=c.speed*speedMul*dt;if(g.flash>0)g.flash-=dt;
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
  const ctx=ui.stage.getContext('2d'),w=state.viewW,h=state.viewH,c=cfg(),now=performance.now();
  const fever=state.gameMode==='classic'&&state.feverUntil>now;
  const grad=ctx.createLinearGradient(0,0,0,h);
  if(state.chapterIndex===2){grad.addColorStop(0,fever?'#ffe0ec':'#f2e7ff');grad.addColorStop(.52,'#e6f8ff');grad.addColorStop(1,'#fff0b8')}
  else if(state.chapterIndex===1){grad.addColorStop(0,'#f7eaff');grad.addColorStop(.52,'#e5fbff');grad.addColorStop(1,'#fff7d3')}
  else{grad.addColorStop(0,'#fff0f7');grad.addColorStop(.52,'#eefbff');grad.addColorStop(1,'#fffbea')}
  ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  for(let i=0;i<28;i++){
    const x=(i*139+now*.010*(i%3+1))%(w+50)-25,y=18+(i*67)%Math.max(80,h-36);
    ctx.globalAlpha=.18+(i%4)*.045;ctx.fillStyle=i%4===0?'#f3a6cb':i%4===1?'#8edbe5':i%4===2?'#f4c95f':'#ffffff';
    ctx.beginPath();ctx.arc(x,y,2+(i%3)*1.4,0,TAU);ctx.fill();
  }
  ctx.globalAlpha=.18;ctx.fillStyle='#ffffff';
  for(let i=0;i<5;i++){
    const cx=((i*233+now*.004*(i+1))%(w+220))-110,cy=46+(i%3)*82;
    ctx.beginPath();ctx.ellipse(cx,cy,55,18,0,0,TAU);ctx.fill();
    ctx.beginPath();ctx.arc(cx-30,cy-9,22,0,TAU);ctx.arc(cx+5,cy-13,29,0,TAU);ctx.arc(cx+34,cy-6,19,0,TAU);ctx.fill();
  }
  ctx.globalAlpha=1;
  const count=c.noteCount;
  for(let i=0;i<count;i++){
    const y=laneYBySemitone(SCALE[i]);
    ctx.strokeStyle=i===0||i===count-1?'#b39bc755':'#b39bc733';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();
    ctx.fillStyle='#756886';ctx.font='900 11px system-ui';ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillText(NOTE_NAMES[i],10,y-7);
  }
  for(const g of state.gates)drawGate(ctx,g,w,h);
  const py=pitchY(),px=w*.22;
  ctx.save();
  if(state.voiced){
    const halo=ctx.createRadialGradient(px,py,5,px,py,42);halo.addColorStop(0,'#ffd1e58a');halo.addColorStop(.6,'#fff0ad4d');halo.addColorStop(1,'#ffffff00');
    ctx.fillStyle=halo;ctx.beginPath();ctx.arc(px,py,42,0,TAU);ctx.fill();
  }
  ctx.shadowBlur=20;ctx.shadowColor=state.voiced?'#e58fbb':'#b3a6bf';
  const ball=ctx.createRadialGradient(px-8,py-9,3,px,py,22);ball.addColorStop(0,'#fff');ball.addColorStop(.3,state.voiced?'#fff3a5':'#f0e8f2');ball.addColorStop(1,state.voiced?'#f29bc4':'#b9afc4');
  ctx.fillStyle=ball;ctx.beginPath();ctx.arc(px,py,20,0,TAU);ctx.fill();ctx.restore();
  ctx.fillStyle='#a56586';ctx.font='900 15px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('♪',px,py+1);
  ctx.strokeStyle='#9a86ac44';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px-45,py);ctx.lineTo(px-25,py);ctx.stroke();
  for(const p of state.particles){
    ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.kind==='perfect'?'#f5bd4e':'#69cfaa';
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,TAU);ctx.fill();
  }
  ctx.globalAlpha=1;
}
function drawGate(ctx,g,w,h){
  const y=laneYBySemitone(SCALE[g.target]),gap=cfg().gapPx,gw=g.kind==='star'?48:38;
  let color=g.kind==='star'?'#e3ad32':'#c79be6';
  if(g.grade==='perfect')color='#efba49';else if(g.grade==='good')color='#63cda5';else if(g.grade==='miss')color='#e77d93';
  ctx.save();ctx.shadowBlur=g.flash>0?24:10;ctx.shadowColor=color+'66';
  const gg=ctx.createLinearGradient(g.x-gw/2,0,g.x+gw/2,0);gg.addColorStop(0,'#d7c7efcc');gg.addColorStop(.5,color+'dd');gg.addColorStop(1,'#9bdfe7cc');
  ctx.fillStyle=gg;
  ctx.globalAlpha=.68;
  ctx.beginPath();ctx.roundRect(g.x-gw/2,-12,gw,Math.max(0,y-gap/2+12),18);ctx.fill();
  ctx.beginPath();ctx.roundRect(g.x-gw/2,y+gap/2,gw,Math.max(0,h-(y+gap/2)+12),18);ctx.fill();
  ctx.globalAlpha=1;ctx.shadowBlur=0;
  ctx.strokeStyle=color;ctx.lineWidth=3;ctx.strokeRect(g.x-gw/2,y-gap/2,gw,gap);
  ctx.fillStyle='#fffdfddd';ctx.beginPath();ctx.roundRect(g.x-36,y-29,72,58,18);ctx.fill();
  ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle=color;ctx.font='1000 25px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(NOTE_NAMES[g.target],g.x,y+1);
  if(g.kind==='star'){ctx.font='1000 17px system-ui';ctx.fillStyle='#d99518';ctx.fillText('★',g.x,y-42)}
  ctx.fillStyle='#ffffff';ctx.globalAlpha=.75;ctx.beginPath();ctx.arc(g.x-12,y-13,4,0,TAU);ctx.fill();ctx.globalAlpha=1;
  ctx.restore();
}
function classicStarCount(accuracy){
  if(state.perfect+state.good===0)return 0;
  if(accuracy>=90&&state.maxCombo>=8)return 3;
  if(accuracy>=72&&state.maxCombo>=4)return 2;
  return 1;
}
function endGame(reason='time'){
  cancelAnimationFrame(state.raf);
  const total=state.perfect+state.good+state.miss,passed=state.perfect+state.good,accuracy=total?Math.round(passed/total*100):0;
  state.starsEarned=state.gameMode==='classic'?classicStarCount(accuracy):0;
  saveBest();stopMic();
  ui.resultScore.textContent=state.score.toLocaleString('ko-KR');
  ui.perfectCount.textContent=state.perfect;ui.goodCount.textContent=state.good;ui.accuracyText.textContent=accuracy+'%';ui.maxComboText.textContent=state.maxCombo;
  const rootName=nearestNoteName(midiToHz(state.rootMidi));
  if(state.gameMode==='stair'){
    ui.resultTitle.textContent=reason==='ceiling'?'고음 계단 정상 도착!':'고음 계단 기록';
    ui.resultGrade.textContent='최고 '+state.stairPeak+'층 · '+(state.stairPeak?stairNoteName(state.stairPeak-1):'시작음')+'까지 올라갔어요';
    ui.accuracyLabel.textContent='성공률';ui.maxComboLabel.textContent='최대 연속';
    ui.resultComment.textContent=(state.calibrated?'내 편한 목소리를 기준으로 시작했어요. ':'기본 C 음역으로 시작했어요. ')+
      '이 기기 최고 계단은 '+Math.max(state.best.stairPeak||0,state.stairPeak)+'층이에요. 높은 음은 큰 소리로 낼 필요가 없고, 목이 불편하면 기록과 상관없이 멈추는 게 좋아요.';
  }else{
    ui.resultTitle.textContent='피날레까지 완주!';
    ui.accuracyLabel.textContent='통과율';ui.maxComboLabel.textContent='최대 콤보';
    const stars='⭐'.repeat(state.starsEarned)+'☆'.repeat(3-state.starsEarned);
    if(state.starsEarned===3)ui.resultGrade.textContent=stars+' · 노래길 마스터!';
    else if(state.starsEarned===2)ui.resultGrade.textContent=stars+' · 아주 좋은 흐름이에요!';
    else if(state.starsEarned===1)ui.resultGrade.textContent=stars+' · 첫 별을 얻었어요!';
    else ui.resultGrade.textContent='☆☆☆ · 다음 판에서 첫 별을 노려봐요!';
    const nextGoal=state.starsEarned>=3?'다음엔 최고 점수와 콤보에 도전해 보세요.':state.starsEarned===2?'통과율 90%와 8콤보면 별 3개예요.':state.starsEarned===1?'통과율 72%와 4콤보면 별 2개예요.':'문 하나씩 통과하며 첫 별부터 모아봐요.';
    ui.resultComment.textContent=(state.calibrated?'맞춤 음역 '+rootName+' 근처에서 시작했어요. ':'기본 C 음역으로 플레이했어요. ')+
      '이번 판 '+passed+'개 문 통과 · 최고 기록 '+state.best.score.toLocaleString('ko-KR')+'점 · 최고 별 '+(state.best.stars||0)+'개. '+nextGoal;
  }
  showScreen('result');
  try{window.KidscadeGame?.result?.({scope:'run',status:'completed',score:state.score,scoreOptions:{unit:'점',higherIsBetter:true},mode:state.gameMode,accuracy,perfect:state.perfect,good:state.good,miss:state.miss,maxCombo:state.maxCombo,stairPeak:state.stairPeak,stars:state.starsEarned})}catch(_){}
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
chooseMode('classic');

document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&state.phase==='game'){
    state.gameEndsAt+=1200;
  }
});
window.addEventListener('pagehide',stopMic);
window.addEventListener('beforeunload',stopMic);

})();
