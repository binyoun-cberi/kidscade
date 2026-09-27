(()=>{
'use strict';

const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const $=sel=>document.querySelector(sel);
const els={
  playerHp:$('#playerHp'),playerHpText:$('#playerHpText'),enemyHp:$('#enemyHp'),enemyHpText:$('#enemyHpText'),
  roundLabel:$('#roundLabel'),timer:$('#timer'),fightState:$('#fightState'),leftState:$('#leftState'),rightState:$('#rightState'),
  xrayBtn:$('#xrayBtn'),helpBtn:$('#helpBtn'),resetBtn:$('#resetBtn'),cue:$('#cue'),toast:$('#toast'),
  combo:$('#combo'),comboCount:$('#comboCount'),card:$('#resultCard'),resultIcon:$('#resultIcon'),
  resultTitle:$('#resultTitle'),resultText:$('#resultText'),scienceTitle:$('#scienceTitle'),
  scienceText:$('#scienceText'),nextBtn:$('#nextBtn'),tutorial:$('#tutorial'),tutorialStart:$('#tutorialStart')
};

const keyButtons=[...document.querySelectorAll('.muscle-key')];
const inputs={q:false,w:false,e:false,r:false};
const activation={q:0,w:0,e:0,r:0};
const MUSCLES={
  q:{side:'left',role:'flexor',name:'왼팔 상완이두근'},
  w:{side:'left',role:'extensor',name:'왼팔 상완삼두근'},
  e:{side:'right',role:'flexor',name:'오른팔 상완이두근'},
  r:{side:'right',role:'extensor',name:'오른팔 상완삼두근'}
};
const ROUND_CONFIG=[
  {seconds:45,enemyWait:[1.25,1.9],telegraph:.58,power:10,enemyGuard:.76},
  {seconds:45,enemyWait:[.95,1.55],telegraph:.48,power:12,enemyGuard:.80},
  {seconds:50,enemyWait:[.72,1.28],telegraph:.40,power:15,enemyGuard:.84}
];
const SCIENCE_TEXT='상완이두근은 팔꿈치를 굽히는 데 크게 작용하고, 상완삼두근은 팔꿈치를 펴는 데 크게 작용하는 길항근입니다. 이 게임은 팔꿈치 굽힘·폄에 집중한 단순화된 모델이며 실제 복싱은 어깨·가슴·몸통·다리 근육도 함께 사용합니다.';

const state={
  round:0,running:false,paused:false,helpOpen:false,xray:false,lastTime:performance.now(),
  timeLeft:45,playerHp:100,enemyHp:100,toastTimer:0,comboTimer:0,roundWon:false,final:false,
  arms:{
    left:{flex:.78,vel:0,cocked:true,cooldown:0,lastFlex:.78,flash:0},
    right:{flex:.78,vel:0,cocked:true,cooldown:0,lastFlex:.78,flash:0}
  },
  enemy:{phase:'idle',timer:1.4,target:'left',extension:0,hitDone:false,flash:0},
  stats:{hits:0,guards:0,taken:0,blocked:0,wins:0,combo:0,maxCombo:0}
};

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function lerp(a,b,t){return a+(b-a)*t}
function rand(a,b){return a+Math.random()*(b-a)}
function roundCfg(){return ROUND_CONFIG[state.round]||ROUND_CONFIG[0]}

function showToast(message){
  els.toast.textContent=message;
  els.toast.classList.add('show');
  clearTimeout(state.toastTimer);
  state.toastTimer=setTimeout(()=>els.toast.classList.remove('show'),950);
}

function sound(name){
  try{window.KidscadeGame?.sound?.(name)}catch(_){}
}

function setInput(key,on){
  if(!(key in inputs)||state.final)return;
  inputs[key]=Boolean(on);
  syncControls();
}

function syncControls(){
  keyButtons.forEach(btn=>{
    const key=btn.dataset.key;
    btn.classList.toggle('active',Boolean(inputs[key]));
    btn.setAttribute('aria-pressed',inputs[key]?'true':'false');
  });
  syncArmLabel('left');
  syncArmLabel('right');
}

function syncArmLabel(side){
  const arm=state.arms[side];
  const flexKey=side==='left'?'q':'e';
  const extendKey=side==='left'?'w':'r';
  const el=side==='left'?els.leftState:els.rightState;
  if(!el)return;
  el.classList.remove('guard','attack','tense');
  if(activation[flexKey]>.55&&activation[extendKey]>.55){
    el.textContent='동시 수축';
    el.classList.add('tense');
  }else if(arm.flex>=.68){
    el.textContent='자동 가드';
    el.classList.add('guard');
  }else if(arm.flex<=.2&&arm.vel<-.45){
    el.textContent='펀치';
    el.classList.add('attack');
  }else{
    el.textContent='팔꿈치 '+Math.round(arm.flex*130)+'°';
  }
}

function resetArms(){
  state.arms.left={flex:.78,vel:0,cocked:true,cooldown:0,lastFlex:.78,flash:0};
  state.arms.right={flex:.78,vel:0,cocked:true,cooldown:0,lastFlex:.78,flash:0};
  Object.keys(inputs).forEach(k=>inputs[k]=false);
  Object.keys(activation).forEach(k=>activation[k]=0);
}

function resetEnemy(){
  const cfg=roundCfg();
  state.enemy={phase:'idle',timer:rand(cfg.enemyWait[0],cfg.enemyWait[1]),target:Math.random()<.5?'left':'right',extension:0,hitDone:false,flash:0};
}

function resetRound(){
  const cfg=roundCfg();
  state.timeLeft=cfg.seconds;
  state.playerHp=100;
  state.enemyHp=100;
  state.roundWon=false;
  state.final=false;
  state.running=true;
  state.stats.combo=0;
  resetArms();
  resetEnemy();
  els.card.classList.add('hidden');
  els.combo.classList.add('hidden');
  els.cue.textContent='팔을 접으면 자동 가드 · 접었다가 빠르게 펴서 닿으면 펀치!';
  syncHud();
  syncControls();
}

function resetRun(){
  state.round=0;
  state.stats={hits:0,guards:0,taken:0,blocked:0,wins:0,combo:0,maxCombo:0};
  resetRound();
  try{window.KidscadeGame?.start?.({restart:true,mode:'muscle-boxing'})}catch(_){}
}

function startFight(){
  if(state.running)return;
  state.running=true;
  state.lastTime=performance.now();
  try{window.KidscadeGame?.start?.({round:state.round+1,mode:'muscle-boxing'})}catch(_){}
}

function playerArmPose(side){
  const arm=state.arms[side];
  const isLeft=side==='left';
  const shoulder={x:330,y:isLeft?252:322};
  const guardHand={x:402,y:isLeft?215:272};
  const extendedHand={x:575,y:isLeft?255:306};
  const guardElbow={x:365,y:isLeft?315:375};
  const extendedElbow={x:455,y:isLeft?265:320};
  const t=1-arm.flex;
  return{
    shoulder,
    elbow:{x:lerp(guardElbow.x,extendedElbow.x,t),y:lerp(guardElbow.y,extendedElbow.y,t)},
    hand:{x:lerp(guardHand.x,extendedHand.x,t),y:lerp(guardHand.y,extendedHand.y,t)}
  };
}

function enemyGuardFlex(side){
  const e=state.enemy;
  const attacking=e.target===side&&(e.phase==='telegraph'||e.phase==='extend'||e.phase==='retract');
  if(!attacking)return 1;
  if(e.phase==='telegraph')return lerp(1,.45,clamp(e.extension,0,1));
  return 1-e.extension;
}

function enemyArmPose(side){
  const isLeft=side==='left';
  const flex=enemyGuardFlex(side);
  const shoulder={x:630,y:isLeft?252:322};
  const guardHand={x:558,y:isLeft?215:272};
  const extendedHand={x:385,y:isLeft?255:306};
  const guardElbow={x:595,y:isLeft?315:375};
  const extendedElbow={x:505,y:isLeft?265:320};
  const t=1-flex;
  return{
    shoulder,
    elbow:{x:lerp(guardElbow.x,extendedElbow.x,t),y:lerp(guardElbow.y,extendedElbow.y,t)},
    hand:{x:lerp(guardHand.x,extendedHand.x,t),y:lerp(guardHand.y,extendedHand.y,t)}
  };
}

function updateActivation(dt){
  for(const key of Object.keys(activation)){
    const target=inputs[key]?1:0;
    activation[key]=lerp(activation[key],target,clamp(dt*(inputs[key]?11:8),0,1));
  }
}

function updatePlayerArm(side,dt){
  const arm=state.arms[side];
  const flexKey=side==='left'?'q':'e';
  const extendKey=side==='left'?'w':'r';
  const biceps=activation[flexKey];
  const triceps=activation[extendKey];
  const co=Math.min(biceps,triceps);
  const drive=(biceps-triceps)*(1-co*.62);
  const relax=(.48-arm.flex)*.34;
  arm.vel+=(drive*4.9+relax-arm.vel*5.1)*dt;
  arm.lastFlex=arm.flex;
  arm.flex=clamp(arm.flex+arm.vel*dt,0,1);
  if(arm.flex===0&&arm.vel<0)arm.vel=0;
  if(arm.flex===1&&arm.vel>0)arm.vel=0;
  arm.cooldown=Math.max(0,arm.cooldown-dt);
  arm.flash=Math.max(0,arm.flash-dt);

  if(arm.flex>.64)arm.cocked=true;
  const crossedContact=arm.lastFlex>.18&&arm.flex<=.18;
  const fastExtension=arm.vel<-.55||triceps>.84;
  if(state.running&&crossedContact&&fastExtension&&arm.cocked&&arm.cooldown<=0){
    resolvePlayerPunch(side,Math.abs(arm.vel)+triceps);
    arm.cocked=false;
    arm.cooldown=.36;
  }
}

function resolvePlayerPunch(side,speed){
  const enemySide=side;
  const enemyGuard=enemyGuardFlex(enemySide);
  const blocked=enemyGuard>.72;
  const arm=state.arms[side];
  arm.flash=.16;
  if(blocked){
    const chip=2;
    state.enemyHp=clamp(state.enemyHp-chip,0,100);
    state.stats.blocked++;
    state.stats.combo=0;
    showToast('상대 가드에 막혔어요');
    sound('click');
  }else{
    const damage=clamp(Math.round(8+speed*3),9,15);
    state.enemyHp=clamp(state.enemyHp-damage,0,100);
    state.enemy.flash=.18;
    state.stats.hits++;
    state.stats.combo++;
    state.stats.maxCombo=Math.max(state.stats.maxCombo,state.stats.combo);
    els.comboCount.textContent=state.stats.combo;
    els.combo.classList.toggle('hidden',state.stats.combo<2);
    clearTimeout(state.comboTimer);
    state.comboTimer=setTimeout(()=>els.combo.classList.add('hidden'),900);
    showToast(side==='left'?'왼팔 펀치 적중!':'오른팔 펀치 적중!');
    sound('correct');
  }
  syncHud();
  if(state.enemyHp<=0)finishRound(true,'KO!');
}

function beginEnemyPunch(){
  state.enemy.phase='telegraph';
  state.enemy.target=Math.random()<.5?'left':'right';
  state.enemy.timer=roundCfg().telegraph;
  state.enemy.extension=0;
  state.enemy.hitDone=false;
  const sideText=state.enemy.target==='left'?'왼팔':'오른팔';
  els.fightState.textContent=`상대 펀치! ${sideText}을 접어 가드`;
  els.cue.textContent=`${sideText} 상완이두근을 수축해서 얼굴 앞에 붙이세요!`;
}

function resolveEnemyPunch(){
  if(state.enemy.hitDone)return;
  state.enemy.hitDone=true;
  const side=state.enemy.target;
  const arm=state.arms[side];
  const guarded=arm.flex>=.66;
  if(guarded){
    state.stats.guards++;
    arm.flash=.14;
    showToast('자동 가드 성공!');
    sound('correct');
  }else{
    const damage=roundCfg().power;
    state.playerHp=clamp(state.playerHp-damage,0,100);
    state.stats.taken++;
    state.stats.combo=0;
    els.combo.classList.add('hidden');
    showToast('가드가 늦었어요!');
    sound('wrong');
  }
  syncHud();
  if(state.playerHp<=0)finishRound(false,'다운!');
}

function updateEnemy(dt){
  const e=state.enemy;
  if(!state.running)return;
  e.flash=Math.max(0,e.flash-dt);
  e.timer-=dt;

  if(e.phase==='idle'){
    if(e.timer<=0)beginEnemyPunch();
    return;
  }
  if(e.phase==='telegraph'){
    e.extension=clamp(1-e.timer/roundCfg().telegraph,0,1)*.28;
    if(e.timer<=0){
      e.phase='extend';
      e.timer=.24;
      e.extension=.28;
    }
    return;
  }
  if(e.phase==='extend'){
    e.extension=clamp(1-e.timer/.24,0,1);
    if(e.extension>=.84)resolveEnemyPunch();
    if(e.timer<=0){
      e.phase='retract';
      e.timer=.30;
      e.extension=1;
    }
    return;
  }
  if(e.phase==='retract'){
    e.extension=clamp(e.timer/.30,0,1);
    if(e.timer<=0){
      const cfg=roundCfg();
      e.phase='idle';
      e.timer=rand(cfg.enemyWait[0],cfg.enemyWait[1]);
      e.extension=0;
      e.hitDone=false;
      els.fightState.textContent='상대 움직임을 보고 가드와 펀치를 바꿔 보세요';
      els.cue.textContent='상대가 공격할 때 한쪽 가드가 열립니다. 접었다가 빠르게 펴 보세요!';
    }
  }
}

function update(dt){
  if(!state.running||state.paused||state.helpOpen||state.final)return;
  updateActivation(dt);
  updatePlayerArm('left',dt);
  updatePlayerArm('right',dt);
  updateEnemy(dt);
  state.timeLeft=Math.max(0,state.timeLeft-dt);
  if(state.timeLeft<=0){
    finishRound(state.enemyHp<state.playerHp,state.enemyHp===state.playerHp?'무승부':(state.enemyHp<state.playerHp?'판정승':'판정패'));
  }
  syncHud();
  syncControls();
}

function finishRound(won,label){
  if(!state.running)return;
  state.running=false;
  state.roundWon=Boolean(won);
  Object.keys(inputs).forEach(k=>inputs[k]=false);
  state.stats.combo=0;
  els.combo.classList.add('hidden');
  syncControls();

  if(won)state.stats.wins++;
  const finalWin=won&&state.round===ROUND_CONFIG.length-1;
  const title=finalWin?'3라운드 승리!':won?`${state.round+1}라운드 승리!`:`${state.round+1}라운드 아쉬운 종료`;
  els.resultIcon.textContent=won?'🥊':'🛡️';
  els.resultTitle.textContent=title;
  els.resultText.textContent=`${label} · 적중 ${state.stats.hits}회 · 가드 ${state.stats.guards}회 · 피격 ${state.stats.taken}회`;
  els.scienceTitle.textContent='근육 포인트';
  els.scienceText.textContent=SCIENCE_TEXT;

  if(finalWin){
    state.final=true;
    els.nextBtn.textContent='처음부터 다시';
    const score=Math.max(100,1000+state.stats.hits*70+state.stats.guards*55-state.stats.taken*35-state.stats.blocked*8);
    try{
      window.KidscadeGame?.score?.(score);
      window.KidscadeGame?.gameOver?.({score,rounds:3,...state.stats});
    }catch(_){}
  }else if(won){
    els.nextBtn.textContent='다음 라운드';
  }else{
    els.nextBtn.textContent='이 라운드 다시';
  }
  els.card.classList.remove('hidden');
}

function nextRound(){
  if(state.final){
    resetRun();
    return;
  }
  if(state.roundWon)state.round=Math.min(ROUND_CONFIG.length-1,state.round+1);
  resetRound();
  state.lastTime=performance.now();
  try{window.KidscadeGame?.start?.({round:state.round+1})}catch(_){}
}

function syncHud(){
  const player=Math.round(state.playerHp);
  const enemy=Math.round(state.enemyHp);
  els.playerHp.style.width=player+'%';
  els.enemyHp.style.width=enemy+'%';
  els.playerHpText.textContent=player;
  els.enemyHpText.textContent=enemy;
  els.roundLabel.textContent=`${state.round+1}라운드`;
  els.timer.textContent=Math.ceil(state.timeLeft);
}

function drawRing(){
  const g=ctx.createLinearGradient(0,0,0,560);
  g.addColorStop(0,'#dff4fb');
  g.addColorStop(.56,'#f8fbfd');
  g.addColorStop(.57,'#dce8ed');
  g.addColorStop(1,'#cbd9df');
  ctx.fillStyle=g;ctx.fillRect(0,0,960,560);
  ctx.strokeStyle='#d9465f';ctx.lineWidth=5;
  for(const y of [128,178,228]){
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(960,y);ctx.stroke();
  }
  ctx.strokeStyle='#f8fafc';ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(480,360);ctx.lineTo(480,560);ctx.stroke();
  ctx.globalAlpha=.12;ctx.fillStyle='#2563eb';
  ctx.beginPath();ctx.arc(480,440,95,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;
}

function line(a,b,width,color){
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
}

function circle(p,r,color){
  ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();
}

function drawFighterBase(x,faceRight,color,flash){
  const dir=faceRight?1:-1;
  ctx.save();
  if(flash>0){ctx.shadowColor='#fff';ctx.shadowBlur=22}
  circle({x,y:185},46,'#f0c59b');
  ctx.fillStyle='#263238';ctx.beginPath();ctx.arc(x,169,42,Math.PI,0);ctx.fill();
  ctx.fillStyle=color;
  ctx.beginPath();ctx.roundRect(x-58,235,116,150,38);ctx.fill();
  ctx.fillStyle='#263238';ctx.fillRect(x-55,370,48,115);ctx.fillRect(x+7,370,48,115);
  ctx.fillStyle='#f8fafc';ctx.fillRect(x-61,477,54,16);ctx.fillRect(x+7,477,54,16);
  ctx.fillStyle='#183246';ctx.beginPath();ctx.arc(x+dir*16,184,4,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function drawPlayerArm(side){
  const pose=playerArmPose(side);
  const arm=state.arms[side];
  const flexKey=side==='left'?'q':'e';
  const extKey=side==='left'?'w':'r';
  const activeB=activation[flexKey],activeT=activation[extKey];
  const skin='#e6ad82';
  if(state.xray){
    line(pose.shoulder,pose.elbow,12,'#d8eef8');
    line(pose.elbow,pose.hand,10,'#d8eef8');
    line(pose.shoulder,pose.elbow,7+activeB*9,'#f59e0b');
    line(pose.shoulder,{x:pose.elbow.x-3,y:pose.elbow.y+7},6+activeT*9,'#ef4444');
  }else{
    line(pose.shoulder,pose.elbow,25,skin);
    line(pose.elbow,pose.hand,21,skin);
  }
  circle(pose.hand,23,arm.flash>0?'#ffe082':'#2563eb');
  if(state.xray){
    ctx.font='800 12px system-ui';
    ctx.fillStyle='#9a6400';ctx.fillText('상완이두근',pose.shoulder.x-44,pose.shoulder.y-20);
    ctx.fillStyle='#b91c1c';ctx.fillText('상완삼두근',pose.shoulder.x-44,pose.shoulder.y+42);
  }
}

function drawEnemyArm(side){
  const pose=enemyArmPose(side);
  const skin='#d79b72';
  if(state.xray){
    line(pose.shoulder,pose.elbow,12,'#d8eef8');
    line(pose.elbow,pose.hand,10,'#d8eef8');
    const flex=enemyGuardFlex(side);
    line(pose.shoulder,pose.elbow,7+flex*5,'#f59e0b');
    line(pose.shoulder,{x:pose.elbow.x+3,y:pose.elbow.y+7},7+(1-flex)*7,'#ef4444');
  }else{
    line(pose.shoulder,pose.elbow,25,skin);
    line(pose.elbow,pose.hand,21,skin);
  }
  circle(pose.hand,23,state.enemy.flash>0?'#ffe082':'#ef4444');
}

function drawLabels(){
  if(!state.xray)return;
  ctx.save();
  ctx.fillStyle='rgba(255,255,255,.9)';
  ctx.fillRect(355,505,250,35);
  ctx.font='800 12px system-ui';
  ctx.fillStyle='#8a6100';ctx.fillText('주황 = 상완이두근(굽힘)',370,527);
  ctx.fillStyle='#b91c1c';ctx.fillText('빨강 = 상완삼두근(폄)',490,527);
  ctx.restore();
}

function render(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawRing();
  drawFighterBase(310,true,'#437bd9',state.arms.left.flash+state.arms.right.flash);
  drawFighterBase(650,false,'#e35b63',state.enemy.flash);
  drawPlayerArm('right');
  drawEnemyArm('right');
  drawPlayerArm('left');
  drawEnemyArm('left');
  drawLabels();

  if(state.enemy.phase==='telegraph'){
    const side=state.enemy.target==='left'?'왼팔':'오른팔';
    ctx.save();
    ctx.font='1000 25px system-ui';
    ctx.textAlign='center';
    ctx.fillStyle='#c2410c';
    ctx.fillText(`⚠ ${side} 가드!`,480,92);
    ctx.restore();
  }
}

function tick(now){
  const dt=clamp((now-state.lastTime)/1000,0,.034);
  state.lastTime=now;
  update(dt);
  render();
  requestAnimationFrame(tick);
}

function toggleXray(){
  state.xray=!state.xray;
  els.xrayBtn.classList.toggle('on',state.xray);
  els.xrayBtn.setAttribute('aria-pressed',state.xray?'true':'false');
  showToast(state.xray?'뼈와 근육 표시 켜짐':'일반 화면');
}

function showTutorial(){
  state.helpOpen=true;
  els.tutorial.classList.remove('hidden');
}

function hideTutorial(){
  els.tutorial.classList.add('hidden');
  state.helpOpen=false;
  try{localStorage.setItem('kidscade_body_boxing_tutorial_v1','1')}catch(_){}
  if(!state.running)startFight();
  state.lastTime=performance.now();
}

window.addEventListener('keydown',event=>{
  const key=event.key.toLowerCase();
  if(key in inputs){
    event.preventDefault();
    if(!event.repeat)setInput(key,true);
  }
});
window.addEventListener('keyup',event=>{
  const key=event.key.toLowerCase();
  if(key in inputs){
    event.preventDefault();
    setInput(key,false);
  }
});
window.addEventListener('blur',()=>Object.keys(inputs).forEach(k=>setInput(k,false)));

keyButtons.forEach(btn=>{
  const key=btn.dataset.key;
  const on=event=>{event.preventDefault();btn.setPointerCapture?.(event.pointerId);setInput(key,true)};
  const off=event=>{event.preventDefault();setInput(key,false)};
  btn.addEventListener('pointerdown',on);
  btn.addEventListener('pointerup',off);
  btn.addEventListener('pointercancel',off);
  btn.addEventListener('lostpointercapture',off);
});

els.xrayBtn.addEventListener('click',toggleXray);
els.helpBtn.addEventListener('click',showTutorial);
els.resetBtn.addEventListener('click',resetRun);
els.nextBtn.addEventListener('click',nextRound);
els.tutorialStart.addEventListener('click',hideTutorial);

try{
  window.KidscadeGame?.registerPauseHandlers?.({
    pause(){state.paused=true;Object.keys(inputs).forEach(k=>inputs[k]=false);syncControls()},
    resume(){state.paused=false;state.lastTime=performance.now()}
  });
}catch(_){}


// ============================================================
// REWORK V6 — pattern boxing + live muscle feedback + camera input
// References: JustMove pose scoring, Punch-Out state telegraphs,
// browser pose games, and anatomy visualization projects.
// ============================================================

const modeEls={
  manual:document.getElementById('manualModeBtn'),
  camera:document.getElementById('cameraModeBtn'),
  status:document.getElementById('cameraStatus'),
  preview:document.getElementById('cameraPreview'),
  coach:document.getElementById('muscleCoach')
};

const REWORK_ENEMIES=[
  {name:'기본 자세',comboChance:0,feintChance:0,recovery:.62},
  {name:'연속 공격',comboChance:.58,feintChance:0,recovery:.54},
  {name:'페인트 마스터',comboChance:.48,feintChance:.42,recovery:.46}
];

const cameraInput={
  mode:'manual',stream:null,detector:null,loading:false,active:false,busy:false,raf:0,
  arms:{
    left:{angle:120,lastAngle:120,seen:false,confidence:0},
    right:{angle:120,lastAngle:120,seen:false,confidence:0}
  }
};

let coachCooldown=0;

function ensureReworkStats(){
  const defaults={counters:0,perfectGuards:0,feintsRead:0,coContractTime:0};
  for(const [key,value] of Object.entries(defaults)){
    if(!Number.isFinite(state.stats[key]))state.stats[key]=value;
  }
}

function setCoach(text,tone=''){
  if(!modeEls.coach)return;
  modeEls.coach.textContent=text;
  modeEls.coach.className='muscle-coach'+(tone?' '+tone:'');
}

function setModeStatus(text,tone=''){
  if(!modeEls.status)return;
  modeEls.status.textContent=text;
  modeEls.status.className='camera-status'+(tone?' '+tone:'');
}

function syncModeButtons(){
  modeEls.manual?.classList.toggle('active',cameraInput.mode==='manual');
  modeEls.camera?.classList.toggle('active',cameraInput.mode==='camera');
}

function loadExternalScript(src,id){
  return new Promise((resolve,reject)=>{
    if(document.getElementById(id)){resolve();return}
    const script=document.createElement('script');
    script.id=id;script.src=src;script.async=true;
    script.onload=()=>resolve();
    script.onerror=()=>reject(new Error('script load failed'));
    document.head.appendChild(script);
  });
}

async function ensurePoseDetector(){
  if(cameraInput.detector)return cameraInput.detector;
  if(cameraInput.loading)return null;
  cameraInput.loading=true;
  setModeStatus('몸 인식 준비 중…','loading');
  try{
    await loadExternalScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.10.0/dist/tf.min.js','bodyTfjs');
    await loadExternalScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@2.1.0/dist/pose-detection.js','bodyPoseDetection');
    await window.tf.ready();
    const pd=window.poseDetection;
    const model=pd.SupportedModels.MoveNet;
    cameraInput.detector=await pd.createDetector(model,{
      modelType:pd.movenet.modelType.SINGLEPOSE_LIGHTNING,
      enableSmoothing:true
    });
    return cameraInput.detector;
  }finally{
    cameraInput.loading=false;
  }
}

async function startCameraMode(){
  if(cameraInput.active)return;
  try{
    const detector=await ensurePoseDetector();
    if(!detector)throw new Error('pose detector unavailable');
    const stream=await navigator.mediaDevices.getUserMedia({
      video:{width:{ideal:640},height:{ideal:480},facingMode:'user'},audio:false
    });
    cameraInput.stream=stream;
    if(modeEls.preview){
      modeEls.preview.srcObject=stream;
      await modeEls.preview.play();
      modeEls.preview.classList.remove('hidden');
    }
    cameraInput.mode='camera';
    cameraInput.active=true;
    Object.keys(inputs).forEach(k=>inputs[k]=false);
    cameraInput.arms.left.seen=false;
    cameraInput.arms.right.seen=false;
    syncModeButtons();
    setModeStatus('몸 인식 켜짐','ok');
    setCoach('팔꿈치를 굽혔다가 빠르게 펴 보세요. 실제 팔 움직임이 캐릭터에 연결돼요.','good');
    runPoseLoop();
  }catch(error){
    stopCameraMode(false);
    cameraInput.mode='manual';
    syncModeButtons();
    setModeStatus('카메라 사용 불가 · 키/터치로 계속','warn');
    showToast('카메라를 쓸 수 없어 키/터치 모드로 돌아왔어요');
  }
}

function stopCameraMode(showMessage=true){
  cameraInput.active=false;
  if(cameraInput.raf)cancelAnimationFrame(cameraInput.raf);
  cameraInput.raf=0;
  if(cameraInput.stream){
    cameraInput.stream.getTracks().forEach(track=>track.stop());
    cameraInput.stream=null;
  }
  if(modeEls.preview){
    modeEls.preview.pause?.();
    modeEls.preview.srcObject=null;
    modeEls.preview.classList.add('hidden');
  }
  cameraInput.mode='manual';
  Object.keys(activation).forEach(k=>activation[k]=0);
  syncModeButtons();
  setModeStatus('키보드 · 터치','');
  if(showMessage)setCoach('Q/W/E/R 또는 화면 버튼으로 근육을 직접 수축시키세요.');
}

function keypointByName(pose,name){
  return pose?.keypoints?.find(point=>point.name===name);
}

function jointAngle(a,b,c){
  if(!a||!b||!c)return null;
  const abx=a.x-b.x,aby=a.y-b.y,cbx=c.x-b.x,cby=c.y-b.y;
  const den=Math.hypot(abx,aby)*Math.hypot(cbx,cby);
  if(den<1e-5)return null;
  const cosine=clamp((abx*cbx+aby*cby)/den,-1,1);
  return Math.acos(cosine)*180/Math.PI;
}

function updateCameraPose(pose){
  for(const side of ['left','right']){
    const shoulder=keypointByName(pose,side+'_shoulder');
    const elbow=keypointByName(pose,side+'_elbow');
    const wrist=keypointByName(pose,side+'_wrist');
    const confidence=Math.min(shoulder?.score||0,elbow?.score||0,wrist?.score||0);
    const angle=jointAngle(shoulder,elbow,wrist);
    const slot=cameraInput.arms[side];
    if(angle!==null&&confidence>.28){
      slot.lastAngle=slot.seen?slot.angle:angle;
      slot.angle=angle;
      slot.confidence=confidence;
      slot.seen=true;
    }else{
      slot.confidence=0;
    }
  }
}

async function runPoseLoop(){
  if(!cameraInput.active)return;
  if(!cameraInput.busy&&cameraInput.detector&&modeEls.preview?.readyState>=2){
    cameraInput.busy=true;
    try{
      const poses=await cameraInput.detector.estimatePoses(modeEls.preview,{flipHorizontal:false});
      if(poses?.[0])updateCameraPose(poses[0]);
    }catch(_){}
    cameraInput.busy=false;
  }
  if(cameraInput.active)cameraInput.raf=requestAnimationFrame(runPoseLoop);
}

function enemyProfile(){
  return REWORK_ENEMIES[state.round]||REWORK_ENEMIES[0];
}

function buildEnemySequence(){
  const profile=enemyProfile();
  const first=Math.random()<.5?'left':'right';
  if(state.round===2&&Math.random()<profile.feintChance){
    return[
      {target:first,fake:true},
      {target:first==='left'?'right':'left',fake:false}
    ];
  }
  if(Math.random()<profile.comboChance){
    return[
      {target:first,fake:false},
      {target:first==='left'?'right':'left',fake:false}
    ];
  }
  return[{target:first,fake:false}];
}

function startEnemyAction(action){
  const cfg=roundCfg();
  state.enemy.target=action.target;
  state.enemy.fake=Boolean(action.fake);
  state.enemy.phase='telegraph';
  state.enemy.timer=state.enemy.fake?cfg.telegraph*.72:cfg.telegraph;
  state.enemy.extension=0;
  state.enemy.hitDone=false;
  const sideText=state.enemy.target==='left'?'왼팔':'오른팔';
  if(state.enemy.fake){
    els.fightState.textContent='페인트! 너무 일찍 풀지 마세요';
    els.cue.textContent=sideText+' 쪽 움직임을 끝까지 보고 판단!';
  }else{
    els.fightState.textContent='상대 펀치! '+sideText+'을 접어 가드';
    els.cue.textContent=sideText+' 상완이두근을 수축해서 얼굴 앞에 붙이세요!';
  }
}

function beginEnemyPunch(){
  state.enemy.sequence=buildEnemySequence();
  state.enemy.sequenceIndex=0;
  startEnemyAction(state.enemy.sequence[0]);
}

function enemyGuardFlex(side){
  const e=state.enemy;
  if((e.vulnerable||0)>0)return .08;
  const attacking=e.target===side&&(e.phase==='telegraph'||e.phase==='extend'||e.phase==='retract');
  if(!attacking)return 1;
  if(e.phase==='telegraph')return lerp(1,.45,clamp(e.extension,0,1));
  return 1-e.extension;
}

function resetEnemy(){
  const cfg=roundCfg();
  state.enemy={
    phase:'idle',timer:rand(cfg.enemyWait[0],cfg.enemyWait[1]),
    target:Math.random()<.5?'left':'right',extension:0,hitDone:false,flash:0,
    vulnerable:0,sequence:[],sequenceIndex:0,fake:false,lastOutcome:'none'
  };
}

function updateActivation(dt){
  if(cameraInput.mode==='camera'){
    for(const key of Object.keys(activation))activation[key]=lerp(activation[key],0,clamp(dt*6,0,1));
    return;
  }
  for(const key of Object.keys(activation)){
    const target=inputs[key]?1:0;
    activation[key]=lerp(activation[key],target,clamp(dt*(inputs[key]?11:8),0,1));
  }
}

function updateCameraArm(side,dt){
  const arm=state.arms[side];
  const slot=cameraInput.arms[side];
  const flexKey=side==='left'?'q':'e';
  const extendKey=side==='left'?'w':'r';
  arm.cooldown=Math.max(0,arm.cooldown-dt);
  arm.flash=Math.max(0,arm.flash-dt);
  arm.lastFlex=arm.flex;

  if(!slot.seen||slot.confidence<.28){
    activation[flexKey]=lerp(activation[flexKey],0,clamp(dt*7,0,1));
    activation[extendKey]=lerp(activation[extendKey],0,clamp(dt*7,0,1));
    return;
  }

  const targetFlex=clamp((165-slot.angle)/110,0,1);
  arm.flex=lerp(arm.flex,targetFlex,clamp(dt*13,0,1));
  arm.vel=(arm.flex-arm.lastFlex)/Math.max(dt,.001);

  const angularDelta=slot.angle-slot.lastAngle;
  const flexDrive=clamp((-angularDelta-1.2)/8,0,1);
  const extendDrive=clamp((angularDelta-1.2)/8,0,1);
  const holdFlex=arm.flex>.66?.42:0;
  const holdExtend=arm.flex<.18?.18:0;
  activation[flexKey]=lerp(activation[flexKey],Math.max(flexDrive,holdFlex),clamp(dt*12,0,1));
  activation[extendKey]=lerp(activation[extendKey],Math.max(extendDrive,holdExtend),clamp(dt*12,0,1));

  if(arm.flex>.64)arm.cocked=true;
  const crossedContact=arm.lastFlex>.18&&arm.flex<=.18;
  const fastExtension=arm.vel<-.55||extendDrive>.7;
  if(state.running&&crossedContact&&fastExtension&&arm.cocked&&arm.cooldown<=0){
    resolvePlayerPunch(side,Math.abs(arm.vel)+extendDrive);
    arm.cocked=false;
    arm.cooldown=.38;
  }
  slot.lastAngle=slot.angle;
}

function updatePlayerArm(side,dt){
  if(cameraInput.mode==='camera'){
    updateCameraArm(side,dt);
    return;
  }
  const arm=state.arms[side];
  const flexKey=side==='left'?'q':'e';
  const extendKey=side==='left'?'w':'r';
  const biceps=activation[flexKey];
  const triceps=activation[extendKey];
  const co=Math.min(biceps,triceps);
  const drive=(biceps-triceps)*(1-co*.68);
  const relax=(.48-arm.flex)*.34;
  arm.vel+=(drive*4.9+relax-arm.vel*5.1)*dt;
  arm.lastFlex=arm.flex;
  arm.flex=clamp(arm.flex+arm.vel*dt,0,1);
  if(arm.flex===0&&arm.vel<0)arm.vel=0;
  if(arm.flex===1&&arm.vel>0)arm.vel=0;
  arm.cooldown=Math.max(0,arm.cooldown-dt);
  arm.flash=Math.max(0,arm.flash-dt);

  ensureReworkStats();
  if(co>.58)state.stats.coContractTime+=dt;

  if(arm.flex>.64)arm.cocked=true;
  const crossedContact=arm.lastFlex>.18&&arm.flex<=.18;
  const fastExtension=arm.vel<-.55||triceps>.84;
  if(state.running&&crossedContact&&fastExtension&&arm.cocked&&arm.cooldown<=0){
    resolvePlayerPunch(side,Math.abs(arm.vel)+triceps);
    arm.cocked=false;
    arm.cooldown=.36;
  }
}

function resolvePlayerPunch(side,speed){
  ensureReworkStats();
  const arm=state.arms[side];
  const counter=(state.enemy.vulnerable||0)>0;
  const enemyGuard=enemyGuardFlex(side);
  const blocked=!counter&&enemyGuard>.72;
  arm.flash=.16;

  if(blocked){
    state.enemyHp=clamp(state.enemyHp-2,0,100);
    state.stats.blocked++;
    state.stats.combo=0;
    showToast('상대 가드에 막혔어요 · 공격 뒤 빈틈을 노려요');
    sound('click');
  }else{
    let damage=clamp(Math.round(8+speed*3),9,15);
    if(counter){
      damage=Math.round(damage*1.55);
      state.stats.counters++;
      state.enemy.vulnerable=0;
      showToast('카운터! 열린 가드를 정확히 맞혔어요');
    }else{
      showToast(side==='left'?'왼팔 펀치 적중!':'오른팔 펀치 적중!');
    }
    state.enemyHp=clamp(state.enemyHp-damage,0,100);
    state.enemy.flash=.18;
    state.stats.hits++;
    state.stats.combo++;
    state.stats.maxCombo=Math.max(state.stats.maxCombo,state.stats.combo);
    els.comboCount.textContent=state.stats.combo;
    els.combo.classList.toggle('hidden',state.stats.combo<2);
    clearTimeout(state.comboTimer);
    state.comboTimer=setTimeout(()=>els.combo.classList.add('hidden'),900);
    sound('correct');
  }
  syncHud();
  if(state.enemyHp<=0)finishRound(true,'KO!');
}

function resolveEnemyPunch(){
  if(state.enemy.hitDone)return;
  state.enemy.hitDone=true;
  ensureReworkStats();
  const side=state.enemy.target;
  const arm=state.arms[side];
  const guarded=arm.flex>=.66;
  if(guarded){
    state.stats.guards++;
    arm.flash=.14;
    const perfect=arm.flex>=.82;
    if(perfect){
      state.stats.perfectGuards++;
      state.enemy.lastOutcome='perfect';
      showToast('완벽 가드! 곧 카운터 기회!');
    }else{
      state.enemy.lastOutcome='blocked';
      showToast('가드 성공!');
    }
    sound('correct');
  }else{
    const damage=roundCfg().power;
    state.playerHp=clamp(state.playerHp-damage,0,100);
    state.stats.taken++;
    state.stats.combo=0;
    state.enemy.lastOutcome='hit';
    els.combo.classList.add('hidden');
    showToast('가드가 늦었어요!');
    sound('wrong');
  }
  syncHud();
  if(state.playerHp<=0)finishRound(false,'다운!');
}

function finishEnemySequence(){
  const cfg=roundCfg();
  const profile=enemyProfile();
  if(state.enemy.lastOutcome==='perfect')state.enemy.vulnerable=.95;
  else if(state.enemy.lastOutcome==='blocked')state.enemy.vulnerable=.68;
  else state.enemy.vulnerable=.34;
  state.enemy.phase='idle';
  state.enemy.timer=rand(cfg.enemyWait[0],cfg.enemyWait[1])+profile.recovery;
  state.enemy.extension=0;
  state.enemy.hitDone=false;
  state.enemy.sequence=[];
  state.enemy.sequenceIndex=0;
  state.enemy.fake=false;
  els.fightState.textContent=state.enemy.vulnerable>.5?'상대 가드가 열렸어요 · 지금 카운터!':'상대 움직임을 보고 다음 공격을 준비하세요';
  els.cue.textContent=state.enemy.vulnerable>.5?'접어 둔 팔을 삼두근으로 빠르게 펴세요!':'팔을 접어 준비하고 상대의 어깨 움직임을 보세요.';
}

function advanceEnemySequence(){
  state.enemy.sequenceIndex++;
  if(state.enemy.sequenceIndex<state.enemy.sequence.length){
    state.enemy.phase='gap';
    state.enemy.timer=.16;
    state.enemy.extension=0;
  }else{
    finishEnemySequence();
  }
}

function updateEnemy(dt){
  const e=state.enemy;
  if(!state.running)return;
  e.flash=Math.max(0,e.flash-dt);
  e.vulnerable=Math.max(0,(e.vulnerable||0)-dt);
  e.timer-=dt;

  if(e.phase==='idle'){
    if(e.timer<=0)beginEnemyPunch();
    return;
  }

  if(e.phase==='gap'){
    if(e.timer<=0)startEnemyAction(e.sequence[e.sequenceIndex]);
    return;
  }

  if(e.phase==='telegraph'){
    const tele=e.fake?roundCfg().telegraph*.72:roundCfg().telegraph;
    e.extension=clamp(1-e.timer/tele,0,1)*.28;
    if(e.timer<=0){
      if(e.fake){
        ensureReworkStats();
        state.stats.feintsRead++;
        showToast('페인트였어요! 다음 동작을 봐요');
        e.lastOutcome='feint';
        advanceEnemySequence();
      }else{
        e.phase='extend';
        e.timer=.24;
        e.extension=.28;
      }
    }
    return;
  }

  if(e.phase==='extend'){
    e.extension=clamp(1-e.timer/.24,0,1);
    if(e.extension>=.84)resolveEnemyPunch();
    if(e.timer<=0){
      e.phase='retract';
      e.timer=.30;
      e.extension=1;
    }
    return;
  }

  if(e.phase==='retract'){
    e.extension=clamp(e.timer/.30,0,1);
    if(e.timer<=0)advanceEnemySequence();
  }
}

function syncControls(){
  keyButtons.forEach(btn=>{
    const key=btn.dataset.key;
    const value=clamp(activation[key]||0,0,1);
    btn.classList.toggle('active',value>.35);
    btn.classList.toggle('camera-driven',cameraInput.mode==='camera');
    btn.setAttribute('aria-pressed',value>.35?'true':'false');
    btn.style.setProperty('--muscle-level',String(value));
    const bar=btn.querySelector('i span');
    if(bar)bar.style.width=Math.round(value*100)+'%';
  });
  syncArmLabel('left');
  syncArmLabel('right');
  syncCoach();
}

function syncCoach(){
  if(!modeEls.coach)return;
  const lCo=Math.min(activation.q,activation.w);
  const rCo=Math.min(activation.e,activation.r);
  const vulnerable=(state.enemy.vulnerable||0)>.08;
  if(vulnerable){
    setCoach('카운터 기회! 상대 가드가 열렸어요. 접어 둔 팔을 빠르게 펴세요.','counter');
  }else if(Math.max(lCo,rCo)>.6){
    setCoach('이두근과 삼두근이 함께 강하게 수축 중! 팔 움직임이 둔해져요.','warn');
  }else if(cameraInput.mode==='camera'){
    const seen=cameraInput.arms.left.confidence>.28||cameraInput.arms.right.confidence>.28;
    if(!seen)setCoach('팔이 잘 보이도록 카메라에서 조금 떨어져 서 보세요.','warn');
  }
}

function syncHud(){
  const player=Math.round(state.playerHp);
  const enemy=Math.round(state.enemyHp);
  els.playerHp.style.width=player+'%';
  els.enemyHp.style.width=enemy+'%';
  els.playerHpText.textContent=player;
  els.enemyHpText.textContent=enemy;
  els.roundLabel.textContent=(state.round+1)+'라운드 · '+enemyProfile().name;
  els.timer.textContent=Math.ceil(state.timeLeft);
}

function drawPlayerArm(side){
  const pose=playerArmPose(side);
  const arm=state.arms[side];
  const flexKey=side==='left'?'q':'e';
  const extKey=side==='left'?'w':'r';
  const activeB=activation[flexKey],activeT=activation[extKey];
  const skin='#e6ad82';

  if(state.xray){
    line(pose.shoulder,pose.elbow,12,'#d8eef8');
    line(pose.elbow,pose.hand,10,'#d8eef8');
    line(pose.shoulder,pose.elbow,7+activeB*11,'#f59e0b');
    line(pose.shoulder,{x:pose.elbow.x-3,y:pose.elbow.y+7},6+activeT*11,'#ef4444');
    if(activeB>.3)circle({x:lerp(pose.shoulder.x,pose.elbow.x,.55),y:lerp(pose.shoulder.y,pose.elbow.y,.55)},5+activeB*7,'rgba(245,158,11,.42)');
    if(activeT>.3)circle({x:lerp(pose.shoulder.x,pose.elbow.x,.62),y:lerp(pose.shoulder.y,pose.elbow.y,.62)+7},5+activeT*7,'rgba(239,68,68,.35)');
  }else{
    line(pose.shoulder,pose.elbow,25+activeB*2,skin);
    line(pose.elbow,pose.hand,21+activeT*2,skin);
  }
  circle(pose.hand,23,arm.flash>0?'#ffe082':'#2563eb');

  if(state.xray){
    ctx.font='800 12px system-ui';
    ctx.fillStyle=activeB>.45?'#7c4a00':'#9a6400';
    ctx.fillText('상완이두근',pose.shoulder.x-44,pose.shoulder.y-20);
    ctx.fillStyle=activeT>.45?'#991b1b':'#b91c1c';
    ctx.fillText('상완삼두근',pose.shoulder.x-44,pose.shoulder.y+42);
  }
}

function drawEnemyArm(side){
  const pose=enemyArmPose(side);
  const skin='#d79b72';
  if(state.xray){
    line(pose.shoulder,pose.elbow,12,'#d8eef8');
    line(pose.elbow,pose.hand,10,'#d8eef8');
    const flex=enemyGuardFlex(side);
    line(pose.shoulder,pose.elbow,7+flex*5,'#f59e0b');
    line(pose.shoulder,{x:pose.elbow.x+3,y:pose.elbow.y+7},7+(1-flex)*7,'#ef4444');
  }else{
    line(pose.shoulder,pose.elbow,25,skin);
    line(pose.elbow,pose.hand,21,skin);
  }
  circle(pose.hand,23,state.enemy.flash>0?'#ffe082':'#ef4444');
}

const originalRender=render;
render=function(){
  originalRender();
  if((state.enemy.vulnerable||0)>0){
    ctx.save();
    ctx.textAlign='center';
    ctx.font='1000 23px system-ui';
    ctx.fillStyle='#b45309';
    ctx.fillText('⚡ COUNTER!',650,112);
    ctx.restore();
  }
};

const originalResetRun=resetRun;
resetRun=function(){
  originalResetRun();
  ensureReworkStats();
  setCoach(cameraInput.mode==='camera'
    ?'팔꿈치를 굽혔다가 빠르게 펴 보세요. 실제 팔 움직임이 캐릭터에 연결돼요.'
    :'Q/W/E/R 또는 화면 버튼으로 근육을 직접 수축시키세요.');
};

const originalFinishRound=finishRound;
finishRound=function(won,label){
  ensureReworkStats();
  originalFinishRound(won,label);
  els.resultText.textContent=
    label+' · 적중 '+state.stats.hits+'회 · 가드 '+state.stats.guards+'회 · 카운터 '+state.stats.counters+'회 · 피격 '+state.stats.taken+'회';
  els.scienceText.textContent=
    '상완이두근은 팔꿈치를 굽히고 상완삼두근은 펴는 데 크게 작용하는 길항근입니다. '+
    '이번 경기에서는 완벽 가드 '+state.stats.perfectGuards+'회, 카운터 '+state.stats.counters+'회를 기록했어요. '+
    '두 근육을 동시에 강하게 수축하면 관절이 단단해지지만 빠른 움직임은 어려워집니다. 실제 복싱은 어깨·가슴·몸통·다리 근육도 함께 사용합니다.';
};

modeEls.manual?.addEventListener('click',()=>stopCameraMode());
modeEls.camera?.addEventListener('click',()=>startCameraMode());
window.addEventListener('beforeunload',()=>stopCameraMode(false));

syncModeButtons();
setModeStatus('키보드 · 터치','');
setCoach('Q/W/E/R 또는 화면 버튼으로 근육을 직접 수축시키세요.');

resetRound();
state.running=false;
let seen=false;
try{seen=localStorage.getItem('kidscade_body_boxing_tutorial_v1')==='1'}catch(_){}
if(!seen)showTutorial();
else startFight();
requestAnimationFrame(tick);
})();
