(() => {
'use strict';
const W=960,H=540,FIXED=1/120;
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d',{alpha:false});
const DPR=Math.min(window.devicePixelRatio||1,2);
canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);ctx.imageSmoothingEnabled=true;

const $=s=>document.querySelector(s);
const menu=$('#menu'),result=$('#result'),records=$('#records'),controlGroup=$('#controlGroup');
const userRunsEl=$('#userRuns'),cpuRunsEl=$('#cpuRuns'),inningText=$('#inningText'),ballsEl=$('#balls'),strikesEl=$('#strikes'),outsEl=$('#outs');
const msgEl=$('#message'),zoneHint=$('#zoneHint'),chargeWrap=$('#chargeWrap'),chargeFill=$('#chargeFill'),chargeText=$('#chargeText'),lessonEl=$('#lessonBanner');
const baseEls=[document.querySelector('.b1'),document.querySelector('.b2'),document.querySelector('.b3')];

const audioDefs={hit:['../../assets/audio/sfx/combat/impact-heavy-01.mp3',.27],swing:['../../assets/audio/sfx/combat/projectile-whoosh-01.mp3',.13],pitch:['../../assets/audio/sfx/combat/projectile-whoosh-01.mp3',.1],throw:['../../assets/audio/sfx/combat/projectile-whoosh-01.mp3',.15],catch:['../../assets/audio/ui/kenney_interface/confirmation_001.ogg',.15],strike:['../../assets/audio/ui/kenney_interface/select_006.ogg',.12],cheer:['../../assets/audio/sfx/success/cheer-yay-01.mp3',.25],fail:['../../assets/audio/sfx/failure/fail-sting-01.mp3',.16],win:['../../assets/audio/sfx/success/victory-fanfare-01.mp3',.24],click:['../../assets/audio/ui/kenney_interface/click_004.ogg',.12]};
const audioPools={};
Object.entries(audioDefs).forEach(([k,[src,vol]])=>audioPools[k]={i:0,a:Array.from({length:3},()=>{const a=new Audio(src);a.preload='auto';a.volume=vol;return a})});
function sound(k,rate=1){const p=audioPools[k];if(!p)return;const a=p.a[p.i++%p.a.length];try{a.pause();a.currentTime=0;a.playbackRate=rate;a.play().catch(()=>{})}catch(_){}}

const SPORT_EQUIPMENT='../../assets/game/2d/sports/equipment/';
const CHAR_ROOT='../../assets/game/characters/people/kenney-platformer-characters/';
function loadImage(src){const i=new Image();i.decoding='async';i.src=src;return i}
const batImg=loadImage(SPORT_EQUIPMENT+'bat_wood.png');
const metalBatImg=loadImage(SPORT_EQUIPMENT+'bat_metal.png');
const helmets={user:loadImage(SPORT_EQUIPMENT+'helmet_white2.png'),cpu:loadImage(SPORT_EQUIPMENT+'helmet_white3.png')};
const ballAsset=loadImage(SPORT_EQUIPMENT+'ball_generic1.png');
function sprite(name,pose){return loadImage(CHAR_ROOT+name+'/poses/'+name+'-'+pose+'.png')}
const sprites={
 user:{stand:sprite('player','stand'),action:sprite('player','action1'),walk1:sprite('player','walk1'),walk2:sprite('player','walk2'),cheer:sprite('player','cheer1')},
 cpu:{stand:sprite('female','stand'),action:sprite('female','action1'),walk1:sprite('female','walk1'),walk2:sprite('female','walk2'),cheer:sprite('female','cheer1')}
};
function readyImage(i){return !!(i&&i.complete&&i.naturalWidth>0&&i.naturalHeight>0)}
function liveAvatar(mode='idle'){const src=window.KidscadeGameAvatar?.frame?.(mode);if(!src)return avatarImg;if(!liveAvatar.cache)liveAvatar.cache=new Map();let im=liveAvatar.cache.get(src);if(!im){im=loadImage(src);liveAvatar.cache.set(src,im)}return readyImage(im)?im:avatarImg}
function teamColor(side){return side==='user'?'#22c55e':'#60a5fa'}
function drawShadow(x,y,w=24){ctx.save();ctx.fillStyle='rgba(5,20,13,.25)';ctx.beginPath();ctx.ellipse(x,y,w,5,0,0,Math.PI*2);ctx.fill();ctx.restore()}

let avatarImg=null;
function svgDataUrl(svg){if(!svg)return'';return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}
function loadAvatar(){
 try{
  const host=parent&&parent!==window&&parent.location.origin===location.origin?parent:window;
  let src=host.localStorage?.getItem('kidscade-avatar-studio-preview')||localStorage.getItem('kidscade-avatar-studio-preview')||'';
  if(!src&&typeof host.renderAvatarSVG==='function')src=svgDataUrl(host.renderAvatarSVG());
  if(src&&src.startsWith('data:image'))avatarImg=loadImage(src)
 }catch(_){}
}
loadAvatar();

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const reportedAchievements=new Set();
function reportAchievement(slot,detail={}){
 if(reportedAchievements.has(slot))return;
 reportedAchievements.add(slot);
 try{window.KidscadeGame?.achievement?.('high_seed_baseball.'+slot,detail)}catch(_){}
}
function checkTwoWay(){if(gameStats.hits>=2&&gameStats.pitchKs>=2)reportAchievement('two_way',{hits:gameStats.hits,pitchKs:gameStats.pitchKs})}
const lerp=(a,b,t)=>a+(b-a)*t;
const rand=(a,b)=>a+Math.random()*(b-a);
function dotString(n,max){let s='';for(let i=0;i<max;i++)s+=i<n?'●':'○';return s}
function zoneInside(x,y){return x>=405&&x<=555&&y>=268&&y<=382}

let difficulty='easy',fieldDifficulty='easy',playing=false,last=0,acc=0,simTime=0;
let state='menu',inning=1,half='top',outs=0,balls=0,strikes=0,bases=[false,false,false],score=[0,0];
// The tutorial flag is stored in the existing career record, not a new storage key.
let lessonActive=false,lessonReplay=false,lessonPitchCount=0,lessonBatAdjusted=false,lessonPitchSelected=false,lessonAimSelected=false,lessonThrown=false,lessonFieldTouched=false;
let messageTimer=0,controlMode='',throwHold=0,chargeActive=false,swingAnimationUntil=0,swing=null;
const BAT={px:608,py:400,length:242,min:-1.20,max:.30,speed:1.27};
let batAngle=Math.atan2(328-BAT.py,BAT.px-480);
let cursor={x:480,y:328},pitchAim={x:480,y:325},selectedPitch='fastball';
let pitch=null,fieldBall=null,fielders=[],activeFielder=-1,defenseRunners=[],throwPlay=null;
let offenseDecision='stop',offenseOutcome=null,offenseTimer=0,particles=[];
let gameStats=null,cpuPitchHistory=[];

const DIFF={
 easy:{pitchSpeed:.57,batWindow:.31,batReach:40,cpuContact:.50,cpuDiscipline:.56,fieldSpeed:150,runnerSpeed:.32,error:44},
 normal:{pitchSpeed:.75,cpuContact:.63,cpuDiscipline:.68,batWindow:.23,batReach:27,fieldSpeed:175,runnerSpeed:.36,error:36},
 hard:{pitchSpeed:1.04,cpuContact:.75,cpuDiscipline:.79,batWindow:.15,batReach:18,fieldSpeed:205,runnerSpeed:.40,error:26}
};
function cfg(){return DIFF[difficulty]}
const FIELD_DIFF={
 // Assist should help the player reach the ball, not play defense for them.
 easy:{assist:.12,flyCatch:.26,groundPickup:.50,support:.18,speed:160},
 normal:{assist:.04,flyCatch:.15,groundPickup:.34,support:.12,speed:178},
 hard:{assist:0,flyCatch:.07,groundPickup:.22,support:.08,speed:195}
};
const OPPONENT_FIELD={reaction:.38,speed:154};
function fieldCfg(){return FIELD_DIFF[fieldDifficulty]}
function pitchZone(x,y){return (x<448?0:x>512?2:1)+(y<298?0:y>350?6:3)}
function cpuReadability(type,zone){
 const recent=cpuPitchHistory.slice(-4);
 const sameType=recent.filter(x=>x.type===type).length,sameZone=recent.filter(x=>x.zone===zone).length;
 return clamp((sameType-1)*.105+(sameZone-1)*.07,0,.36);
}
function currentBatAngle(){return swing?batSwingAngle(swing):batAngle}
function batSwingAngle(sw){
 const u=clamp(sw.elapsed/sw.duration,0,1),smooth=u*u*(3-2*u);
 // A visibly readable 22–29 degree sweep instead of a tiny 10 degree twitch.
 return sw.baseAngle+(sw.mode==='power'?.50:.38)*(smooth-.5);
}
function closestBatPoint(x,y,angle=currentBatAngle()){
 const tip=batTip(angle),dx=tip.x-BAT.px,dy=tip.y-BAT.py,t=clamp(((x-BAT.px)*dx+(y-BAT.py)*dy)/(dx*dx+dy*dy),0,1);
 const px=BAT.px+dx*t,py=BAT.py+dy*t;
 return{x:px,y:py,position:t,distance:Math.hypot(x-px,y-py)};
}
function pitchScreenPoint(p,t=clamp(p.t,0,1)){
 const u=clamp(t,0,1),curve=Math.max(0,(u-.48)/.52);
 const targetX=p.actual.x+p.breakX*curve,targetY=p.actual.y+p.breakY*curve;
 return{x:lerp(480,targetX,u),y:lerp(235,targetY,u)};
}
const TRAIL_STYLE={
 fastball:{rgb:'219,234,254',interval:.018,bonus:0},
 // Breaking pitches keep a longer, fainter history so their bend is visible rather than just the latest direction.
 curve:{rgb:'253,230,138',interval:.028,bonus:6},
 change:{rgb:'186,230,253',interval:.034,bonus:1},
 slider:{rgb:'221,214,254',interval:.026,bonus:5},
 hit:{rgb:'255,244,202',interval:.030,bonus:0},
 throw:{rgb:'226,232,240',interval:.022,bonus:0}
};
function trailVisibility(){return difficulty==='easy'?1:difficulty==='normal'?.72:.46}
function pitchTrailLimit(type){
 const base=difficulty==='easy'?7:difficulty==='normal'?6:4;
 return base+(TRAIL_STYLE[type]?.bonus||0);
}
function recordPitchTrail(p,dt){
 const style=TRAIL_STYLE[p.type]||TRAIL_STYLE.fastball;
 p.trailClock=(p.trailClock||0)+dt;
 if(p.trailClock<style.interval)return;
 p.trailClock=0;p.trail=p.trail||[];
 const pt=pitchScreenPoint(p),r=p.owner==='cpu'?lerp(5,14,clamp(p.t,0,1)):lerp(11,5,clamp(p.t,0,1));
 p.trail.push({x:pt.x,y:pt.y,r});
 const max=pitchTrailLimit(p.type);if(p.trail.length>max)p.trail.splice(0,p.trail.length-max);
}
function recordFieldTrail(ball,dt){
 if(!ball||ball.owner)return;
 const style=TRAIL_STYLE.hit;ball.trailClock=(ball.trailClock||0)+dt;
 if(ball.trailClock<style.interval)return;
 ball.trailClock=0;ball.trail=ball.trail||[];
 ball.trail.push({x:ball.x,y:ball.y-ball.z*.23,r:5+Math.min(3,ball.z*.008)});
 const max=ball.trailMax||4;if(ball.trail.length>max)ball.trail.splice(0,ball.trail.length-max);
}
function drawTrajectoryTrail(points,type='fastball',intensity=1){
 if(!points||points.length<2)return;
 const style=TRAIL_STYLE[type]||TRAIL_STYLE.fastball,vis=trailVisibility()*intensity;
 ctx.save();ctx.lineCap='round';
 if((type==='curve'||type==='slider')&&points.length>=4){
  ctx.strokeStyle='rgba('+style.rgb+','+(.10*vis)+')';ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
  for(let i=1;i<points.length-1;i++){const p=points[i],n=points[i+1],mx=(p.x+n.x)/2,my=(p.y+n.y)/2;ctx.quadraticCurveTo(p.x,p.y,mx,my)}
  ctx.lineTo(points.at(-1).x,points.at(-1).y);ctx.stroke();
 }
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],k=i/(points.length-1);
  ctx.strokeStyle='rgba('+style.rgb+','+(.04+.25*k)*vis+')';
  ctx.lineWidth=Math.max(1,(b.r||6)*(.28+.30*k));
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
 }
 for(let i=0;i<points.length;i++){
  const p=points[i],k=(i+1)/points.length;
  ctx.fillStyle='rgba('+style.rgb+','+(.035+.18*k)*vis+')';
  ctx.beginPath();ctx.arc(p.x,p.y,Math.max(1,(p.r||5)*(.18+.32*k)),0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}
function batTip(angle=batAngle){return{x:BAT.px-BAT.length*Math.cos(angle),y:BAT.py+BAT.length*Math.sin(angle)}}
function batDistance(x,y,angle=batAngle){return closestBatPoint(x,y,angle).distance}
function setBatAngle(next){
 if(swing)return;
 const old=batAngle;batAngle=clamp(next,BAT.min,BAT.max);
 if(lessonActive&&Math.abs(batAngle-old)>.001){lessonBatAdjusted=true;updateLesson()}
}
function nudgeBat(step){setBatAngle(batAngle+step)}
function setBatFromPoint(p){setBatAngle(Math.atan2(p.y-BAT.py,BAT.px-480))}
function isLessonDone(){return !!career().batPitchLessonDone}
function updateLesson(){
 if(!lessonEl)return;
 if(!lessonActive||inning!==1||!playing){lessonEl.classList.add('hidden');lessonEl.textContent='';return}
 let title='',detail='';
 if(half==='top'){
  title='연습 1/2 · 타격 1회초';
  detail=state==='offenseField'?'잘 쳤어요! 멈추거나 더 달릴지 정해 보세요.':!lessonBatAdjusted?'배트 ▲ ▼ 또는 화면을 위아래로 끌어 배트 각도를 조절하세요.':'공 높이에 배트를 맞추고 초록 타이밍에 스윙하세요.';
 }else{
  title='연습 2/2 · 투구·수비 1회말';
  if(state==='defenseField')detail='타구를 쫓아 공을 잡고, 포구했다면 1·2·3루나 홈으로 송구하세요.';
  else if(!lessonPitchSelected)detail='직구·커브·체인지업·슬라이더 중 던질 구종을 골라 보세요.';
  else if(!lessonAimSelected)detail='스트라이크 존을 터치해 공이 향할 코스를 정해 보세요.';
  else if(!lessonThrown)detail=difficulty==='hard'?'던지기를 꾹 누르고 게이지 70%에 놓으세요.':'던지기 버튼을 한 번 누르면 공이 나가요.';
  else detail='좋아요! 타자를 상대해서 3아웃을 만들면 연습 완료예요.';
 }
 lessonEl.innerHTML='<b>'+title+'</b><span>'+detail+'</span>';lessonEl.classList.remove('hidden');
}


function career(){
 try{return Object.assign({games:0,wins:0,hits:0,homeRuns:0,strikeouts:0,pitchKs:0,bestDistance:0},JSON.parse(localStorage.getItem('seedBaseballCareerV1')||'{}'))}catch(_){return{games:0,wins:0,hits:0,homeRuns:0,strikeouts:0,pitchKs:0,bestDistance:0}}
}
function saveCareer(){
 const c=career();c.games++;if(score[0]>score[1])c.wins++;c.hits+=gameStats.hits;c.homeRuns+=gameStats.hr;c.strikeouts+=gameStats.ks;c.pitchKs+=gameStats.pitchKs;c.bestDistance=Math.max(c.bestDistance,gameStats.bestDistance);
 try{localStorage.setItem('seedBaseballCareerV1',JSON.stringify(c))}catch(_){}
}
function showRecords(){
 const c=career();$('#recordsText').innerHTML='경기 <b>'+c.games+'</b> · 승리 <b>'+c.wins+'</b><br>통산 안타 <b>'+c.hits+'</b> · 홈런 <b>'+c.homeRuns+'</b> · 타자 삼진 <b>'+c.strikeouts+'</b><br>투수 탈삼진 <b>'+c.pitchKs+'</b> · 최장 타구 <b>'+Math.round(c.bestDistance)+'m</b>';
 records.classList.remove('hidden');
}

function updateHud(){
 userRunsEl.textContent=score[0];cpuRunsEl.textContent=score[1];
 inningText.textContent=inning+'회'+(half==='top'?'초':'말');
 ballsEl.textContent=dotString(balls,3);strikesEl.textContent=dotString(strikes,2);outsEl.textContent=dotString(outs,2);
 baseEls.forEach((e,i)=>e.classList.toggle('on',!!bases[i]));
}
function message(text,t=1.6){msgEl.textContent=text;msgEl.classList.add('show');messageTimer=t}
function hint(text=''){zoneHint.textContent=text}
function hideCharge(){chargeActive=false;chargeWrap.style.display='none';chargeFill.style.width='0%'}
function showCharge(label,pct){chargeWrap.style.display='block';chargeText.textContent=label;chargeFill.style.width=Math.round(clamp(pct,0,1)*100)+'%'}
function clearCounts(){balls=0;strikes=0;updateHud()}
function resetStats(){gameStats={hits:0,hr:0,ks:0,pitchKs:0,bestDistance:0,atBats:0,runs:0,allowed:0}}

const held={batUp:false,batDown:false,left:false,right:false,up:false,down:false,throw:false};
function setControls(mode){
 if(controlMode===mode)return;controlMode=mode;controlGroup.dataset.mode=mode;controlGroup.innerHTML='';
 const add=(text,cls,action,hold=false)=>{
  const b=document.createElement('button');b.type='button';b.className='ctrl '+(cls||'');b.textContent=text;b.dataset.action=action;
  if(hold){
   const down=e=>{e.preventDefault();held[action]=true;b.classList.add('active');try{b.setPointerCapture?.(e.pointerId)}catch(_){}};
   const up=e=>{e.preventDefault();held[action]=false;b.classList.remove('active')};
   b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',e=>{if(e.buttons===0)up(e)});
  }else b.addEventListener('click',e=>{e.preventDefault();controlAction(action)});
  controlGroup.appendChild(b);return b;
 };
 if(mode==='bat'){
  const up=add('배트 ▲','angle','batUp',true),down=add('배트 ▼','angle','batDown',true);
  up.addEventListener('click',()=>nudgeBat(-.11));down.addEventListener('click',()=>nudgeBat(.11));
  add('⚾ 스윙','primary','swing');
  if(difficulty!=='easy')add('💥 강타','power','powerSwing');
 }else if(mode==='pitch'){
  ['fastball:직구','curve:커브','change:체인지업','slider:슬라이더'].forEach(pair=>{const [a,t]=pair.split(':');add(t,a===selectedPitch?'active':'','pitch:'+a)});
  if(difficulty==='hard'){const th=add('충전 후 던지기','primary','throw',true);th.addEventListener('pointerdown',()=>beginThrow());th.addEventListener('pointerup',()=>releaseThrow());th.addEventListener('pointercancel',()=>releaseThrow())}
  else add('⚾ 던지기','primary','pitchNow');
 }else if(mode==='field'){
  add('◀','', 'left',true);add('▲','', 'up',true);add('▼','', 'down',true);add('▶','', 'right',true);
  if(activeFielder>=0&&fielders[activeFielder]?.hasBall){add('1루','blue','base1');add('2루','blue','base2');add('3루','blue','base3');add('홈','red','base4')}
 }else if(mode==='run'){
  add('멈춘다','', 'stop');add('더 간다!','green','go');
 }
}
function controlAction(a){
 if(a==='swing'){swingNow('contact');return}
 if(a==='powerSwing'){swingNow('power');return}
 if(a==='pitchNow'){beginThrow();return}
 sound('click');
 if(a.startsWith('pitch:')){selectedPitch=a.split(':')[1];lessonPitchSelected=true;updateLesson();setControls('');setControls('pitch');return}
 if(/^base[1-4]$/.test(a)){throwToBase(Number(a.slice(-1)));return}
 if(a==='go'){offenseDecision='go';message('한 베이스 더 노린다!',.9);return}
 if(a==='stop'){offenseDecision='stop';message('안전하게 멈춘다!',.9)}
}

let delayed=[];
function setTimeoutLike(fn,t){delayed.push({fn,t})}
function updateDelayed(dt){for(let i=delayed.length-1;i>=0;i--){delayed[i].t-=dt;if(delayed[i].t<=0){const fn=delayed[i].fn;delayed.splice(i,1);try{fn()}catch(e){console.error(e)}}}}

function startGame(){
 delayed=[];score=[0,0];inning=1;half='top';outs=0;bases=[false,false,false];clearCounts();resetStats();playing=true;state='between';swing=null;cpuPitchHistory=[];
 lessonActive=lessonReplay||!isLessonDone();lessonReplay=false;lessonPitchCount=0;lessonBatAdjusted=false;lessonPitchSelected=false;lessonAimSelected=false;lessonThrown=false;lessonFieldTouched=false;
 batAngle=Math.atan2(328-BAT.py,BAT.px-480);
 menu.classList.add('hidden');result.classList.add('hidden');
 message(lessonActive?'연습 경기! 1회초 타격, 1회말 투구를 배워요.':'PLAY BALL!',lessonActive?2.6:1.2);
 updateLesson();setTimeoutLike(()=>nextPlateAppearance(),.7);updateHud();
}
function nextPlateAppearance(){
 if(!playing)return;
 clearCounts();pitch=null;swing=null;fieldBall=null;throwPlay=null;hideCharge();offenseOutcome=null;offenseDecision='stop';
 if(half==='top')startBatting();else startPitching();
}
function startBatting(){
 state='batting';setControls('bat');
 hint(lessonActive&&inning===1?'배트 ▲▼로 높이를 맞추고, 초록 타이밍에 스윙!':'');
 if(lessonActive&&inning===1&&half==='top'&&lessonPitchCount===0)message('배트 각도를 먼저 바꿔 보고, 초록 구간에 스윙하세요.',2.3);
 updateLesson();setTimeoutLike(()=>spawnCpuPitch(),.85);
}
function pitchProfile(type){
 return {
  fastball:{speed:1.16,breakX:0,breakY:-2,label:'직구'},
  curve:{speed:.90,breakX:rand(-18,18),breakY:24,label:'커브'},
  change:{speed:.82,breakX:rand(-8,8),breakY:8,label:'체인지업'},
  slider:{speed:.98,breakX:rand(-35,35),breakY:6,label:'슬라이더'}
 }[type];
}
function spawnCpuPitch(){
 if(state!=='batting')return;
 const types=['fastball','curve','change','slider'];
 const type=lessonActive&&inning===1&&half==='top'&&lessonPitchCount===0?'fastball':types[Math.floor(Math.random()*types.length)],p=pitchProfile(type);
 const strikeProb=difficulty==='easy'?.72:.62,isLikelyStrike=Math.random()<strikeProb;
 let tx,ty;
 if(isLikelyStrike){tx=rand(420,540);ty=rand(282,368)}else{
  const side=Math.floor(Math.random()*4);
  if(side===0){tx=rand(370,400);ty=rand(275,375)}
  if(side===1){tx=rand(560,590);ty=rand(275,375)}
  if(side===2){tx=rand(410,550);ty=rand(230,260)}
  if(side===3){tx=rand(410,550);ty=rand(390,420)}
 }
 if(lessonActive&&inning===1&&half==='top'&&lessonPitchCount===0){tx=480;ty=330}
 pitch={owner:'cpu',type,t:0,duration:(1.06/p.speed)/cfg().pitchSpeed*(lessonActive&&inning===1&&half==='top'?1.16:1),target:{x:tx,y:ty},actual:{x:tx,y:ty},breakX:p.breakX,breakY:p.breakY,swung:false,trail:[],trailClock:0};
 lessonPitchCount++;message(p.label,.7);
}
function beginSwing(){swingNow('contact')}
function releaseSwing(){} // A single press is a complete swing; keyboard keyup changes nothing.
function swingNow(mode='contact'){
 if(state!=='batting'||!pitch||pitch.swung||swing)return;
 pitch.swung=true;
 swing={mode,baseAngle:batAngle,elapsed:0,duration:mode==='power'?.27:.23,
        contact:null,startT:pitch.t,ballOnContact:null};
 swingAnimationUntil=simTime+swing.duration;
 sound('swing',mode==='power'?.84:1.04);
}
function updateSwing(dt){
 if(!swing||!pitch||state!=='batting')return;
 const sw=swing,p=pitch;
 sw.elapsed+=dt;
 const t=clamp(p.t,0,1),angle=batSwingAngle(sw);
 if(!sw.contact&&sw.elapsed>=.016&&t>=.68&&t<=1.065){
  const ball=pitchScreenPoint(p,t),near=closestBatPoint(ball.x,ball.y,angle);
  const isPower=sw.mode==='power',reach=Math.max(12,cfg().batReach-(isPower?6:0));
  const timing=t-.88,window=cfg().batWindow*(isPower?.82:1);
  const timeScore=clamp(1-Math.abs(timing)/window,0,1);
  if(near.distance<=reach&&timeScore>.16){
   const center=clamp(1-Math.abs(near.position-.64)/.64,0,1);
   const angleScore=clamp(1-near.distance/reach,0,1);
   const quality=clamp(timeScore*(.57+.43*angleScore)*(.73+.27*center),.08,1);
   sw.contact={q:quality,power:isPower?.98:.56+.19*timeScore,
     timing,verticalErr:ball.y-near.y,sweet:center,gap:near.distance};
   sw.ballOnContact={...ball,t};sound('hit',.86+quality*.32);
   burst(ball.x,ball.y,8);
  }
 }
 if(sw.elapsed<sw.duration)return;
 swing=null;
 if(sw.contact){
  const c=sw.contact;
  if(c.q<.22&&Math.random()<(sw.mode==='power'?.7:.46)){
   pitch=null;if(strikes<2)strikes++;updateHud();message('배트 끝에 맞아 파울!',.9);
   setTimeoutLike(()=>{if(state==='batting')spawnCpuPitch()},.7);return;
  }
  startOffenseBall(c.q,c.power,c.timing,c.verticalErr,c.sweet);return;
 }
 pitch=null;strikes++;sound('fail',1.13);
 message(sw.startT<.65?'너무 일찍 휘둘렀어요!':sw.startT>.98?'조금 늦었어요!':'배트 각도를 맞춰 보세요!',1.1);
 finishCountPitch();
}
function finishCountPitch(){
 updateHud();
 if(strikes>=3){gameStats.ks++;gameStats.atBats++;outs++;message('삼진 아웃!',1.3);clearCounts();afterOutOrPlay();return}
 setTimeoutLike(()=>{if(state==='batting')spawnCpuPitch()},.7);
}
function calledUserPitch(){
 if(!pitch)return;
 const bx=pitch.actual.x+pitch.breakX,by=pitch.actual.y+pitch.breakY;
 if(zoneInside(bx,by)){strikes++;sound('strike');message('스트라이크!',.9)}else{balls++;message('볼!',.9)}
 updateHud();
 if(strikes>=3){gameStats.ks++;gameStats.atBats++;outs++;clearCounts();message('삼진!',1.2);afterOutOrPlay()}
 else if(balls>=4){walkRunner(0);clearCounts();message('볼넷!',1.2);setTimeoutLike(()=>nextPlateAppearance(),.9)}
 else setTimeoutLike(()=>spawnCpuPitch(),.7);
}
function walkRunner(side){
 if(!bases[0])bases[0]=true;
 else if(!bases[1])bases[1]=true;
 else if(!bases[2])bases[2]=true;
 else{score[side]++;if(side===0)gameStats.runs++;else gameStats.allowed++}
 updateHud();
}

function startOffenseBall(q,power,timing,verticalErr,sweet=.75){
 state='offenseField';setControls('run');hint('');
 // Early contact pulls into left field; late contact pushes into right field.
 const spray=clamp(-timing/cfg().batWindow*.80+rand(-.065,.065),-.87,.87);
 // Hitting below the ball produces loft; hitting above produces a grounder.
 const launch=clamp(.32-verticalErr/64+rand(-.033,.033),.04,.79);
 const centerFactor=.68+.32*sweet;
 const rawDist=(65+q*170+power*145+rand(-21,21))*centerFactor;
 const distanceM=Math.round(rawDist*.31+32),dir=Math.PI/2+spray,speed=rawDist/(1.15+launch*1.7);
 fieldBall={x:480,y:470,z:10,vx:Math.cos(dir)*speed,vy:-Math.sin(dir)*speed,vz:170+launch*260,bounced:false,owner:null,age:0,maxDist:rawDist,trail:[],trailClock:0,trailMax:q>.72?8:q>.45?6:4,trailStrength:clamp(.42+q*.64,0,1)};
 offenseOutcome={q,power,sweet,rawDist,distanceM,launch,spray};offenseTimer=0;offenseDecision='stop';makeFielders(false);
 message(rawDist>325&&launch>.32?'담장까지 간다! 더 달릴까?':'타구가 날아갑니다! 주루를 판단하세요.',1.6);
}
function makeFielders(userDefense){
 const pos=[[480,405,'P'],[625,365,'1B'],[545,315,'2B'],[415,315,'SS'],[335,365,'3B'],[300,205,'LF'],[480,160,'CF'],[660,205,'RF']];
 fielders=pos.map((p,i)=>({x:p[0],y:p[1],homeX:p[0],homeY:p[1],role:p[2],hasBall:false,user:userDefense,speed:(userDefense?fieldCfg().speed:OPPONENT_FIELD.speed)*(i===6?1.03:1)}));
 activeFielder=-1;
}
function updateOffenseField(dt){
 if(!fieldBall)return;offenseTimer+=dt;updateBallPhysics(dt);
 let nearest=-1,nd=1e9;fielders.forEach((f,i)=>{const d=Math.hypot(f.x-fieldBall.x,f.y-fieldBall.y);if(d<nd){nd=d;nearest=i}});
 if(offenseTimer>OPPONENT_FIELD.reaction)fielders.forEach((f,i)=>{const target=i===nearest?fieldBall:{x:f.homeX,y:f.homeY},dx=target.x-f.x,dy=target.y-f.y,l=Math.hypot(dx,dy)||1,sp=f.speed*(i===nearest?1:.45);f.x+=dx/l*sp*dt;f.y+=dy/l*sp*dt});
 const f=fielders[nearest];
 if(f&&fieldBall.z<24&&Math.hypot(f.x-fieldBall.x,f.y-fieldBall.y)<20){
  let caught=fieldBall.bounced;
  if(!caught&&!fieldBall.catchAttempted){
   fieldBall.catchAttempted=true;
   const o=offenseOutcome||{q:.5,sweet:.5,rawDist:220};
   // Good contact is difficult to turn into an automatic fly out on every difficulty.
   const quality=clamp(o.q*.68+o.sweet*.32,0,1);
   const catchChance=clamp(.62-quality*.28-(o.rawDist>285?.06:0),.24,.58);
   caught=Math.random()<catchChance;
  }
  if(caught){f.hasBall=true;fieldBall.owner=f;fieldBall.vx=fieldBall.vy=fieldBall.vz=0}
 }
 if(offenseTimer>2.6||fieldBall.owner||fieldBall.y<130||fieldBall.x<160||fieldBall.x>800)resolveOffenseBall();
}
function resolveOffenseBall(){
 if(state!=='offenseField')return;
 const o=offenseOutcome;let basesEarned=1,out=false,hr=false;const fair=Math.abs(o.spray)<.82;
 if(!fair){message('파울!',.9);state='batting';if(strikes<2)strikes++;updateHud();setControls('bat');setTimeoutLike(()=>spawnCpuPitch(),.8);return}
 gameStats.atBats++;gameStats.bestDistance=Math.max(gameStats.bestDistance,o.distanceM);
 state='between';setControls('');hint('');
 if(o.rawDist>325&&o.launch>.30){hr=true;basesEarned=4}
 else if(fieldBall?.owner&&!fieldBall.bounced)out=true;
 else {
  const shapePenalty=(o.launch<.18||o.launch>.56)?.06:0;
  const weakPenalty=o.q<.45?.09:0;
  let fieldOut=.45-o.q*.22-o.sweet*.08+shapePenalty+(o.q<.45?.07:0);
  if(fieldBall?.owner&&fieldBall.bounced)fieldOut+=.14;
  else if(!fieldBall?.owner)fieldOut-=.08;
  fieldOut=clamp(fieldOut,.10,.54);
  if(Math.random()<fieldOut)out=true;
 }
 if(!out&&o.rawDist>280&&o.launch<.25&&Math.abs(o.spray)>.35)basesEarned=3;
 else if(!out&&o.rawDist>260)basesEarned=2;
 if(!out&&offenseDecision==='go'&&!hr){
  const risk=clamp(.58-o.q*.28,.18,.60);
  if(Math.random()<risk){out=true;message('욕심냈다가 주루사!',1.3)}else basesEarned=Math.min(4,basesEarned+1);
 }
 if(out){outs++;message(fieldBall?.owner&&!fieldBall.bounced||o.launch>.35?'외야 플라이 아웃!':'땅볼 아웃!',1.25);afterOutOrPlay();return}
 const before=score[0];advanceRunners(0,basesEarned);const rbi=score[0]-before;
 gameStats.hits++;reportAchievement('first_hit',{hits:gameStats.hits,distance:o.distanceM});
 if(hr){gameStats.hr++;reportAchievement('home_run',{homeRuns:gameStats.hr,distance:o.distanceM});sound('cheer');message('HOME RUN! '+o.distanceM+'m',2.1);burst(480,230,42)}
 else{sound('cheer',1.15);message(basesEarned===3?'3루타!':basesEarned===2?'2루타!':'안타!',1.3)}
 checkTwoWay();clearCounts();updateHud();if(rbi>0)gameStats.runs+=rbi;setTimeoutLike(()=>nextPlateAppearance(),hr?1.9:1.05);
}
function advanceRunners(side,n){
 const old=bases.slice();bases=[false,false,false];let runs=0;
 for(let i=2;i>=0;i--)if(old[i]){const dest=i+1+n;if(dest>=4)runs++;else bases[dest-1]=true}
 if(n>=4)runs++;else bases[n-1]=true;score[side]+=runs;updateHud();
}

function startPitching(){
 state='pitching';if(lessonActive&&inning===1&&half==='bottom'&&!lessonPitchSelected)selectedPitch='fastball';
 pitchAim.x=480;pitchAim.y=325;setControls('pitch');hint(lessonActive&&inning===1?(difficulty==='hard'?'코스를 고르고 70%까지 충전':'코스를 고르고 던지기 한 번 누르기'):'');
 if(lessonActive&&inning===1&&half==='bottom'&&!lessonThrown)message('투수 연습! 구종을 고르고 코스를 누른 뒤 던지세요.',2.2);
 updateLesson();
}
function beginThrow(){
 if(state!=='pitching'||pitch||chargeActive)return;
 if(difficulty!=='hard'){throwBall(difficulty==='easy'?1:clamp(.76+rand(-.09,.09),.55,.91));return}
 throwHold=0;chargeActive=true;
}
function releaseThrow(){
 if(difficulty!=='hard'||state!=='pitching'||pitch||!chargeActive)return;
 chargeActive=false;hideCharge();
 const charge=clamp(throwHold/1.05,0,1);
 throwBall(clamp(1-Math.abs(charge-.72)/.72,0,1));
}
function throwBall(accuracy){
 if(state!=='pitching'||pitch)return;
 chargeActive=false;hideCharge();lessonThrown=true;lessonPitchSelected=true;lessonAimSelected=true;updateLesson();
 const err=cfg().error*(1-accuracy),prof=pitchProfile(selectedPitch);
 const ax=pitchAim.x+rand(-err,err),ay=pitchAim.y+rand(-err,err);
 const zone=pitchZone(pitchAim.x,pitchAim.y),readability=cpuReadability(selectedPitch,zone);
 pitch={owner:'user',type:selectedPitch,t:0,duration:(1.05/prof.speed)/cfg().pitchSpeed,
 target:{...pitchAim},actual:{x:ax,y:ay},breakX:prof.breakX,breakY:prof.breakY,accuracy,
 readability,swung:false,cpuDecision:null,trail:[],trailClock:0};
 cpuPitchHistory.push({type:selectedPitch,zone});if(cpuPitchHistory.length>8)cpuPitchHistory.shift();
 sound('pitch',.8+prof.speed*.16);decideCpuSwing();
 message(readability>.18?'타자가 반복된 구종·코스를 눈치챘어요!':prof.label+' 간다!',readability>.18?1.4:.7);
}
function decideCpuSwing(){
 const p=pitch,fx=p.actual.x+p.breakX,fy=p.actual.y+p.breakY,inside=zoneInside(fx,fy);
 let chance=inside?.80:clamp(.33-cfg().cpuDiscipline*.25,.08,.24);
 if(p.type==='change'||p.type==='curve')chance+=.04;
 chance+=p.readability*.13;
 if(!inside&&Math.random()<cfg().cpuDiscipline*.55)chance*=.35;
 p.cpuDecision=Math.random()<clamp(chance,.04,.95);
}
function resolveCpuAtPlate(){
 const p=pitch,fx=p.actual.x+p.breakX,fy=p.actual.y+p.breakY,inside=zoneInside(fx,fy);
 if(!p.cpuDecision){
  if(inside){strikes++;message('스트라이크!',.9)}else{balls++;message('볼!',.9)}updateHud();
  if(strikes>=3){outs++;gameStats.pitchKs++;if(gameStats.pitchKs>=3)reportAchievement('doctor_k',{pitchKs:gameStats.pitchKs});checkTwoWay();clearCounts();message('삼진 잡았다!',1.3);afterOutOrPlay()}
  else if(balls>=4){walkRunner(1);clearCounts();message('볼넷 허용',1.1);setTimeoutLike(()=>nextPlateAppearance(),.9)}
  else{pitch=null;setTimeoutLike(()=>{if(state==='pitching')setControls('pitch')},.55)}
  return;
 }
 const locPenalty=clamp(Math.hypot(fx-480,fy-325)/150,0,1),stuff=(p.type==='fastball'?.12:p.type==='change'?.08:.1)+p.accuracy*.12;
 const contactChance=clamp(cfg().cpuContact+.16*(1-locPenalty)-stuff+p.readability*.36,.22,.92);
 if(Math.random()>contactChance){
  strikes++;sound('fail',1.2);message('헛스윙!',.9);updateHud();
  if(strikes>=3){outs++;gameStats.pitchKs++;if(gameStats.pitchKs>=3)reportAchievement('doctor_k',{pitchKs:gameStats.pitchKs});checkTwoWay();clearCounts();message('삼진 아웃!',1.3);afterOutOrPlay()}
  else{pitch=null;setTimeoutLike(()=>{if(state==='pitching')setControls('pitch')},.55)}
  return;
 }
 sound('hit',.95);startDefenseBall(contactChance,p.accuracy,fx,fy);
}
function startDefenseBall(contact,accuracy,fx,fy){
 state='defenseField';hint(lessonActive&&inning===1?'가까운 수비수를 움직여 공을 잡으세요':'');makeFielders(true);updateLesson();
 const spray=clamp((fx-480)/150+rand(-.42,.42),-.9,.9),launch=clamp((350-fy)/170+rand(.08,.38),.08,.72),power=clamp(contact+rand(-.18,.26)+(1-accuracy)*.18,.25,.95),rawDist=120+power*235;
 const dir=Math.PI/2+spray,speed=rawDist/(1.2+launch*1.55);
 fieldBall={x:480,y:470,z:10,vx:Math.cos(dir)*speed,vy:-Math.sin(dir)*speed,vz:160+launch*250,bounced:false,owner:null,age:0,maxDist:rawDist,trail:[],trailClock:0,trailMax:power>.72?7:5,trailStrength:clamp(.40+power*.48,0,1)};
 defenseRunners=[];bases.forEach((on,i)=>{if(on)defenseRunners.push({from:i+1,to:i+2,p:0,speed:cfg().runnerSpeed*(.95+Math.random()*.12),running:true})});
 defenseRunners.push({from:0,to:1,p:0,speed:cfg().runnerSpeed*(.96+Math.random()*.1),running:true,batter:true});
 activeFielder=nearestFielder(predictedLanding());setControls('field');message('타구! 직접 잡아 송구하세요.',1.4);
}
function predictedLanding(){
 if(!fieldBall)return{x:480,y:315};
 const t=(fieldBall.vz+Math.sqrt(fieldBall.vz*fieldBall.vz+780*fieldBall.z))/390;
 return{x:clamp(fieldBall.x+fieldBall.vx*t*.9,185,775),y:clamp(fieldBall.y+fieldBall.vy*t*.9,125,470)};
}
function nearestFielder(target=fieldBall){
 if(!target||!fielders.length)return -1;let bi=0,bd=1e9;
 fielders.forEach((f,i)=>{const d=Math.hypot(f.x-target.x,f.y-target.y);if(d<bd){bd=d;bi=i}});return bi;
}
function updateDefenseField(dt){
 if(!fieldBall)return;updateBallPhysics(dt);defenseRunners.forEach(r=>{if(r.running)r.p=clamp(r.p+r.speed*dt,0,1)});
 if(activeFielder<0)activeFielder=nearestFielder();const a=fielders[activeFielder];
 if(a&&!a.hasBall){
  let dx=(held.right?1:0)-(held.left?1:0),dy=(held.down?1:0)-(held.up?1:0),assist=1;
  if(!dx&&!dy&&fieldCfg().assist&&!fieldBall.owner){const dest=fieldBall.z>30?predictedLanding():fieldBall;dx=dest.x-a.x;dy=dest.y-a.y;assist=fieldCfg().assist}
  const l=Math.hypot(dx,dy)||1;a.x=clamp(a.x+dx/l*a.speed*assist*dt,185,775);a.y=clamp(a.y+dy/l*a.speed*assist*dt,125,470);
 }
 fielders.forEach((f,i)=>{if(i===activeFielder||f.hasBall)return;const target=fieldBall.owner?{x:f.homeX,y:f.homeY}:fieldBall,dx=target.x-f.x,dy=target.y-f.y,l=Math.hypot(dx,dy)||1,rate=fieldBall.owner?.32:fieldCfg().support;f.x+=dx/l*f.speed*rate*dt;f.y+=dy/l*f.speed*rate*dt});
 if(!fieldBall.owner){
  const candidates=fielders.map((f,i)=>({f,i,d:Math.hypot(f.x-fieldBall.x,f.y-fieldBall.y)})).sort((a,b)=>a.d-b.d),c=candidates[0];
  if(c&&fieldBall.z<26&&c.d<27){
   let mayCatch=true;
   if(c.i!==activeFielder){const chance=fieldBall.bounced?fieldCfg().groundPickup:fieldCfg().flyCatch;mayCatch=!fieldBall.assistAttempted&&Math.random()<chance;fieldBall.assistAttempted=true}
   if(mayCatch){
    sound('catch');c.f.hasBall=true;fieldBall.owner=c.f;activeFielder=c.i;const caught=!fieldBall.bounced&&fieldBall.z>4;fieldBall.vx=fieldBall.vy=fieldBall.vz=0;
    if(caught){outs++;message('플라이 아웃!',1.25);defenseRunners=[];afterOutOrPlay();return}
    message('잡았다! 어느 베이스로 던질까?',1.4);setControls('');setControls('field');
   }
  }
 }
 if(fieldBall.owner&&!throwPlay){fieldBall.heldTime=(fieldBall.heldTime||0)+dt;
  if(fieldBall.heldTime>2.4){message('송구가 너무 늦었다!',1.2);settleDefenseHit(fieldBall.maxDist>285?2:1);return}}
 if(throwPlay){
  throwPlay.t-=dt;throwPlay.trailClock+=dt;
  if(throwPlay.trailClock>=TRAIL_STYLE.throw.interval){throwPlay.trailClock=0;const bp=basePoint(throwPlay.base),k=clamp(1-throwPlay.t/throwPlay.total,0,1);throwPlay.trail.push({x:lerp(throwPlay.startX,bp.x,k),y:lerp(throwPlay.startY,bp.y,k)-18,r:6});if(throwPlay.trail.length>5)throwPlay.trail.shift()}
  if(throwPlay.t<=0){resolveThrowPlay();return}
 }
 if(fieldBall.age>5.2&&!fieldBall.owner){message('타구가 빠져나갔다!',1.1);settleDefenseHit(2)}
}
function basePoint(n){return n===1?{x:650,y:345}:n===2?{x:480,y:215}:n===3?{x:310,y:345}:{x:480,y:470}}
function throwToBase(n){
 if(state!=='defenseField'||activeFielder<0)return;const f=fielders[activeFielder];if(!f?.hasBall||throwPlay)return;
 const bp=basePoint(n),d=Math.hypot(f.x-bp.x,f.y-bp.y);throwPlay={base:n,t:.34+d/620,total:.34+d/620,startX:f.x,startY:f.y,trail:[],trailClock:0};message((n===4?'홈':n+'루')+' 송구!',.8);sound('throw',1.15)
}
function resolveThrowPlay(){
 if(!throwPlay)return;const n=throwPlay.base;throwPlay=null;
 let target=defenseRunners.filter(r=>r.running&&r.to===n).sort((a,b)=>b.p-a.p)[0];
 if(target&&target.p<.93){
  target.running=false;defenseRunners=defenseRunners.filter(r=>r!==target);outs++;message((n===4?'홈':n+'루')+'에서 아웃!',1.2);clearCounts();afterOutOrPlay();return
 }
 message('세이프!',1.0);settleDefenseHit(fieldBall.maxDist>285?2:1);
}
function settleDefenseHit(n){
 if(state!=='defenseField')return;state='between';setControls('');hint('');
 const old=bases.slice();bases=[false,false,false];let runs=0;
 for(let i=2;i>=0;i--)if(old[i]){const dest=i+1+n;if(dest>=4)runs++;else bases[dest-1]=true}
 if(n>=4)runs++;else bases[n-1]=true;score[1]+=runs;gameStats.allowed+=runs;message(n>=2?'장타 허용':'안타 허용',1.1);clearCounts();updateHud();
 if(inning>=3&&half==='bottom'&&score[1]>score[0]){setTimeoutLike(()=>endGame(),1.0);return}
 setTimeoutLike(()=>nextPlateAppearance(),.9);
}
function updateBallPhysics(dt){
 if(!fieldBall||fieldBall.owner)return;
 fieldBall.age+=dt;fieldBall.x+=fieldBall.vx*dt;fieldBall.y+=fieldBall.vy*dt;fieldBall.z+=fieldBall.vz*dt;fieldBall.vz-=390*dt;recordFieldTrail(fieldBall,dt);
 fieldBall.vx*=Math.pow(.994,dt*60);fieldBall.vy*=Math.pow(.994,dt*60);
 if(fieldBall.z<=0){fieldBall.z=0;if(Math.abs(fieldBall.vz)>55){fieldBall.vz=-fieldBall.vz*.34;fieldBall.bounced=true}else fieldBall.vz=0}
 fieldBall.x=clamp(fieldBall.x,115,845);fieldBall.y=clamp(fieldBall.y,105,490);
}
function afterOutOrPlay(){
 state='between';setControls('');hint('');updateHud();clearCounts();
 if(outs>=3)setTimeoutLike(()=>finishHalf(),1.05);else setTimeoutLike(()=>nextPlateAppearance(),1.0);
}
function finishHalf(){
 outs=0;bases=[false,false,false];clearCounts();
 if(half==='top'){
  if(inning>=3&&score[1]>score[0]){endGame();return}
  half='bottom';message(lessonActive&&inning===1?'타격 연습 완료! 이번에는 투수로 1이닝을 연습해요.':inning+'회말 — 수비!',lessonActive&&inning===1?2.6:1.25);
  updateLesson();updateHud();setTimeoutLike(()=>nextPlateAppearance(),1.0);return;
 }
 half='top';inning++;
 const trainingFinished=lessonActive&&inning===2;
 if(trainingFinished){lessonActive=false;try{const saved=career();saved.batPitchLessonDone=true;localStorage.setItem('seedBaseballCareerV1',JSON.stringify(saved))}catch(_){}}
 updateLesson();
 if(inning>3&&score[0]!==score[1]){endGame();return}
 if(inning>5){endGame();return}
 message(trainingFinished?'타격·투구 연습 완료! 이제부터 자유 경기예요.':inning>3?inning+'회 연장전!':inning+'회초 — 공격!',trainingFinished?2.6:1.3);
 updateHud();setTimeoutLike(()=>nextPlateAppearance(),1.0);
}
function endGame(){
 if(!playing)return;playing=false;state='gameover';setControls('');hideCharge();updateLesson();saveCareer();
 const win=score[0]>score[1],tie=score[0]===score[1];if(win)sound('win');else if(!tie)sound('fail');
 if(win&&score[1]===0)reportAchievement('shutout_win',{score:[...score],inning});
 if(win&&inning>3)reportAchievement('extra_inning_win',{score:[...score],inning});
 try{window.KidscadeGame?.result?.({scope:'match',status:'completed',outcome:tie?'draw':win?'win':'loss',score:score[0],runsAllowed:score[1],inning,hits:gameStats.hits,homeRuns:gameStats.hr,pitchKs:gameStats.pitchKs,bestDistance:gameStats.bestDistance})}catch(_){}
 $('#resultTitle').textContent=tie?'무승부':win?'승리!':'경기 종료';
 $('#resultText').innerHTML='최종 스코어 <b>'+score[0]+' : '+score[1]+'</b><br><br>이번 경기 안타 <b>'+gameStats.hits+'</b> · 홈런 <b>'+gameStats.hr+'</b> · 타자 삼진 <b>'+gameStats.ks+'</b><br>투수 탈삼진 <b>'+gameStats.pitchKs+'</b> · 최장 타구 <b>'+Math.round(gameStats.bestDistance)+'m</b>';
 result.classList.remove('hidden');
}

function updatePitch(dt){
 if(!pitch||(pitch.owner==='cpu'&&swing?.contact))return;
 pitch.t+=dt/pitch.duration;recordPitchTrail(pitch,dt);
 if(pitch.owner==='cpu'){if(pitch.t>=1&&!pitch.swung){calledUserPitch();pitch=null}}
 else{
  if(pitch.t>=.91&&!pitch.swung&&pitch.cpuDecision){pitch.swung=true;setTimeoutLike(()=>resolveCpuAtPlate(),.05)}
  else if(pitch.t>=1.02&&!pitch.swung){pitch.swung=true;resolveCpuAtPlate()}
 }
}
function update(dt){
 simTime+=dt;updateDelayed(dt);
 if(messageTimer>0){messageTimer-=dt;if(messageTimer<=0)msgEl.classList.remove('show')}
 particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=160*dt;p.life-=dt});particles=particles.filter(p=>p.life>0);
 if(!playing)return;
 if(state==='batting'){
  const a=(held.batDown?1:0)-(held.batUp?1:0);
  if(a&&!swing)setBatAngle(batAngle+a*BAT.speed*dt);
  updatePitch(dt);updateSwing(dt);
 }else if(state==='pitching'){
  if(difficulty==='hard'&&chargeActive){throwHold+=dt;showCharge('정확도 — 70% 부근에서 놓기',clamp(throwHold/1.05,0,1))}updatePitch(dt);
 }else if(state==='offenseField')updateOffenseField(dt);
 else if(state==='defenseField')updateDefenseField(dt);
}
function burst(x,y,n){for(let i=0;i<n;i++)particles.push({x,y,vx:rand(-170,170),vy:rand(-230,-50),life:rand(.6,1.3),r:rand(2,6)})}

// The ballpark backdrop is static and cached, so detailed scenery costs only one draw per frame.
function stadiumBackdrop(){
 const c=document.createElement('canvas');c.width=W;c.height=H;const b=c.getContext('2d');
 const sky=b.createLinearGradient(0,0,0,170);sky.addColorStop(0,'#071729');sky.addColorStop(1,'#153959');
 b.fillStyle=sky;b.fillRect(0,0,W,165);
 b.fillStyle='#091522';b.fillRect(0,49,W,88);
 b.fillStyle='#1f354c';
 for(let row=0;row<4;row++){
  b.fillRect(0,58+row*19,W,2);
  for(let x=11;x<W;x+=14){const k=(x*17+row*13)%7;b.fillStyle=['#f8d87b','#95acbb','#e4a98d','#8ec2cf','#c2d4cf','#738eae','#cfd7dc'][k];b.fillRect(x+(row%2)*6,62+row*19,5,6)}
  b.fillStyle='#253e56';
 }
 b.fillStyle='#0e2537';b.fillRect(0,129,W,25);b.fillStyle='#1a4e3e';b.fillRect(0,147,W,14);
 b.fillStyle='#e2b65e';b.font='900 14px system-ui';b.textAlign='center';b.fillText('★ SEED BALLPARK ★',480,29);
 b.fillStyle='#dbeafe';b.font='700 9px system-ui';b.fillText('KIDSCade · PLAY BALL!',480,45);
 for(const x of [72,888]){
  b.strokeStyle='#8299aa';b.lineWidth=4;b.beginPath();b.moveTo(x,125);b.lineTo(x,31);b.stroke();
  b.fillStyle='#fff5be';b.fillRect(x-26,23,52,10);
  for(let i=0;i<6;i++){b.fillStyle='#fffde8';b.fillRect(x-23+i*8,25,5,6)}
 }
 for(const [x,label,w] of [[68,'KIDSCade',126],[750,'PLAY BALL',134],[362,'SEED LEAGUE',236]]){
  b.fillStyle='#173449';b.fillRect(x,126,w,22);b.strokeStyle='#50766c';b.lineWidth=2;b.strokeRect(x,126,w,22);b.fillStyle='#fef3c7';b.font='900 11px system-ui';b.textAlign='center';b.fillText(label,x+w/2,141);
 }
 b.fillStyle='#316b48';b.fillRect(0,156,W,H-156);
 for(let y=156;y<H;y+=27){b.fillStyle=(Math.floor(y/27)%2)?'rgba(255,255,255,.045)':'rgba(3,38,20,.07)';b.fillRect(0,y,W,27)}
 b.strokeStyle='#d0c0a0';b.lineWidth=5;b.beginPath();b.moveTo(105,158);b.quadraticCurveTo(480,95,855,158);b.stroke();
 b.fillStyle='#c39561';b.beginPath();b.moveTo(480,472);b.lineTo(681,345);b.lineTo(480,201);b.lineTo(279,345);b.closePath();b.fill();
 b.fillStyle='#367e4b';b.beginPath();b.moveTo(480,429);b.lineTo(626,345);b.lineTo(480,257);b.lineTo(334,345);b.closePath();b.fill();
 b.fillStyle='#b18457';b.beginPath();b.ellipse(480,353,33,19,0,0,Math.PI*2);b.fill();
 b.strokeStyle='rgba(255,255,255,.83)';b.lineWidth=2.5;b.beginPath();b.moveTo(480,470);b.lineTo(109,153);b.moveTo(480,470);b.lineTo(851,153);b.stroke();
 b.fillStyle='#f5e6c6';b.beginPath();b.moveTo(480,468);b.lineTo(471,461);b.lineTo(489,461);b.closePath();b.fill();
 b.fillStyle='#fdf1d2';b.fillRect(474,350,12,3);b.fillStyle='#fbbf24';b.font='900 12px system-ui';b.textAlign='center';b.fillText('330',146,163);b.fillText('400',480,168);b.fillText('330',813,163);
 return c;
}
const fieldBackdrop=stadiumBackdrop();
function drawStadium(){ctx.drawImage(fieldBackdrop,0,0)}
function drawPlateBackdrop(){
 ctx.fillStyle='#0c2339';ctx.fillRect(0,0,W,H);
 const grad=ctx.createLinearGradient(0,0,0,192);grad.addColorStop(0,'#0c2339');grad.addColorStop(1,'#285375');ctx.fillStyle=grad;ctx.fillRect(0,0,W,192);
 ctx.fillStyle='#102338';ctx.fillRect(0,55,W,137);
 for(let row=0;row<4;row++)for(let x=16;x<W;x+=24){const v=(x*13+row*23)%5;ctx.fillStyle=['#d8a877','#f3d49b','#8db1c6','#a2bcaa','#d6d7dc'][v];ctx.beginPath();ctx.arc(x+(row%2)*11,78+row*23,4,0,Math.PI*2);ctx.fill()}
 ctx.fillStyle='#163f35';ctx.fillRect(0,182,W,14);
 ctx.fillStyle='#327a49';ctx.fillRect(0,196,W,344);
 for(let y=198;y<H;y+=28){ctx.fillStyle=Math.floor(y/28)%2?'rgba(255,255,255,.044)':'rgba(4,45,24,.045)';ctx.fillRect(0,y,W,28)}
 ctx.fillStyle='#bd905c';ctx.beginPath();ctx.moveTo(480,215);ctx.lineTo(960,480);ctx.lineTo(960,540);ctx.lineTo(0,540);ctx.lineTo(0,480);ctx.closePath();ctx.fill();
 ctx.fillStyle='#337b49';ctx.beginPath();ctx.moveTo(480,247);ctx.lineTo(960,530);ctx.lineTo(0,530);ctx.closePath();ctx.fill();
 ctx.fillStyle='#c89b62';ctx.beginPath();ctx.ellipse(480,247,65,30,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#b98d5e';ctx.beginPath();ctx.ellipse(480,440,157,76,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(555,394);ctx.lineTo(630,453);ctx.lineTo(630,504);ctx.moveTo(405,394);ctx.lineTo(330,453);ctx.lineTo(330,504);ctx.stroke();
 ctx.fillStyle='#faf7ed';ctx.beginPath();ctx.moveTo(468,439);ctx.lineTo(492,439);ctx.lineTo(494,446);ctx.lineTo(480,454);ctx.lineTo(466,446);ctx.closePath();ctx.fill();
 ctx.fillStyle='#fff2b8';ctx.font='900 12px system-ui';ctx.textAlign='center';ctx.fillText('KIDSCade BASEBALL',480,32);
}

function drawBase(x,y,on=false){ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.fillStyle=on?'#fbbf24':'#fff';ctx.fillRect(-8,-8,16,16);ctx.restore()}
function drawPlayer(img,x,y,scale=1,flip=false,jersey='#16a34a',wearHelmet=true,number=0){
 const h=76*scale,side=jersey==='#2563eb'?'cpu':'user';
 drawShadow(x,y,22*scale);
 ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);
 if(readyImage(img)){
  const w=h*img.naturalWidth/img.naturalHeight;ctx.drawImage(img,-w/2,-h,w,h);
 }else{
  ctx.fillStyle='#f1c8a3';ctx.beginPath();ctx.arc(0,-h*.73,12*scale,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=jersey;ctx.beginPath();ctx.roundRect(-14*scale,-h*.59,28*scale,30*scale,5*scale);ctx.fill();
  ctx.fillStyle='#e2e8f0';ctx.fillRect(-12*scale,-h*.2,9*scale,15*scale);ctx.fillRect(4*scale,-h*.2,9*scale,15*scale);
 }
 const helmet=helmets[side];
 if(wearHelmet&&img!==avatarImg&&readyImage(helmet)){
  const hw=h*.31,hh=hw*helmet.naturalHeight/helmet.naturalWidth;
  ctx.drawImage(helmet,-hw*.52,-h*.95,hw,hh);
  ctx.strokeStyle=teamColor(side);ctx.lineWidth=Math.max(2,scale*3);
  ctx.beginPath();ctx.moveTo(-hw*.30,-h*.81);ctx.lineTo(hw*.42,-h*.81);ctx.stroke();
 }
 ctx.restore();
 if(number){
  ctx.save();ctx.fillStyle=teamColor(side);ctx.strokeStyle='rgba(255,255,255,.95)';ctx.lineWidth=1.4;
  ctx.beginPath();ctx.arc(x,y-h*.49,Math.max(4,6.7*scale),0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='#07203a';ctx.font='900 '+Math.max(7,8.4*scale)+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(number),x,y-h*.49+.5);ctx.restore();
 }
}

function drawBall(x,y,r=7){
 ctx.save();ctx.shadowColor='rgba(3,15,22,.32)';ctx.shadowBlur=r*.65;
 if(readyImage(ballAsset))ctx.drawImage(ballAsset,x-r,y-r,r*2,r*2);
 else{ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
 ctx.shadowBlur=0;ctx.strokeStyle='#e45258';ctx.lineWidth=Math.max(1,r*.13);
 ctx.beginPath();ctx.arc(x-r*.20,y,r*.64,-1.12,1.12);ctx.stroke();
 ctx.beginPath();ctx.arc(x+r*.20,y,r*.64,2.03,4.26);ctx.stroke();ctx.restore();
}

function drawBatFan(){
 // The angle guide stays fixed; the physical bat is rendered at the current swing angle.
 const steps=30;ctx.save();
 ctx.fillStyle='rgba(250,204,21,.065)';ctx.strokeStyle='rgba(250,204,21,.20)';ctx.lineWidth=1.5;
 ctx.beginPath();ctx.moveTo(BAT.px,BAT.py);
 for(let i=0;i<=steps;i++){const tip=batTip(BAT.min+(BAT.max-BAT.min)*i/steps);ctx.lineTo(tip.x,tip.y)}
 ctx.closePath();ctx.fill();ctx.stroke();
 const angle=currentBatAngle();
 if(swing){
  const trail=[.055,.032,.012];
  trail.forEach((delta,i)=>{
   const phase=clamp((swing.elapsed-delta)/swing.duration,0,1),s=phase*phase*(3-2*phase);
   const oldAngle=swing.baseAngle+(swing.mode==='power'?.24:.18)*(s-.5),tip=batTip(oldAngle);
   ctx.strokeStyle='rgba(255,224,119,'+(.13+i*.07)+')';ctx.lineWidth=17-i*3;
   ctx.beginPath();ctx.moveTo(BAT.px,BAT.py);ctx.lineTo(tip.x,tip.y);ctx.stroke();
  });
 }
 ctx.translate(BAT.px,BAT.py);ctx.rotate(-angle);ctx.scale(-1,1);
 if(readyImage(batImg))ctx.drawImage(batImg,0,-12,BAT.length,24);
 else{ctx.strokeStyle='#d1a067';ctx.lineWidth=14;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(BAT.length,0);ctx.stroke()}
 ctx.restore();
 ctx.save();ctx.fillStyle='#ffe19a';ctx.beginPath();ctx.arc(BAT.px,BAT.py,5,0,Math.PI*2);ctx.fill();
 const target=batTip(angle),markerX=BAT.px+(target.x-BAT.px)*.70,markerY=BAT.py+(target.y-BAT.py)*.70;
 ctx.fillStyle='#fef3c7';ctx.font='900 12px system-ui';ctx.textAlign='center';ctx.fillText('배트 각도',BAT.px+54,BAT.py-44);
 ctx.fillStyle='#fdedaa';ctx.beginPath();ctx.arc(markerX,markerY,3,0,Math.PI*2);ctx.fill();ctx.restore();
}

function drawPlateView(isBatting){
 drawPlateBackdrop();
 const zx=405,zy=268,zw=150,zh=114;
 ctx.save();ctx.fillStyle='rgba(6,24,40,.11)';ctx.fillRect(zx,zy,zw,zh);
 ctx.strokeStyle='rgba(255,255,255,.58)';ctx.lineWidth=2;ctx.strokeRect(zx,zy,zw,zh);
 ctx.strokeStyle='rgba(255,255,255,.17)';
 for(let i=1;i<3;i++){ctx.beginPath();ctx.moveTo(zx+i*50,zy);ctx.lineTo(zx+i*50,zy+zh);ctx.stroke();ctx.beginPath();ctx.moveTo(zx,zy+i*38);ctx.lineTo(zx+zw,zy+i*38);ctx.stroke()}
 ctx.restore();
 if(isBatting){
  const throwing=pitch&&pitch.owner==='cpu'&&pitch.t<.38;
  drawPlayer(throwing?sprites.cpu.action:sprites.cpu.stand,480,254,.9,false,'#2563eb',true,1);
  const batter=readyImage(avatarImg)?avatarImg:(simTime<swingAnimationUntil?(liveAvatar('attack')||sprites.user.action):(liveAvatar('idle')||sprites.user.stand));
  drawPlayer(batter,626,449,1.2,true,'#16a34a',true,4);
  drawBatFan();
  if(swing?.contact){
   const c=swing.contact;
   ctx.save();ctx.fillStyle=c.q>.66&&c.sweet>.55?'#bbf7d0':'#fde68a';
   ctx.font='900 21px system-ui';ctx.textAlign='center';
   ctx.fillText(c.q>.66&&c.sweet>.55?'정타!':'맞혔다!',475,240);ctx.restore();
  }
  const cueStart=.88-cfg().batWindow*.52,cueEnd=Math.min(.99,.88+cfg().batWindow*.52);
  if(pitch&&pitch.owner==='cpu'&&!pitch.swung){
   const t=clamp(pitch.t,0,1),curve=Math.max(0,(t-.48)/.52),tx=pitch.actual.x+pitch.breakX*curve,ty=pitch.actual.y+pitch.breakY*curve;
   const ballX=lerp(480,tx,t),ballY=lerp(235,ty,t),gap=batDistance(ballX,ballY);
   const rightTime=t>=cueStart&&t<=cueEnd,aligned=gap<cfg().batReach*.65;
   if(rightTime){
    ctx.fillStyle=aligned?'#bbf7d0':'#fef08a';ctx.font='900 16px system-ui';ctx.textAlign='center';
    ctx.fillText(aligned?'지금 스윙!':'배트 각도를 맞춰요!',475,240);
   }
   ctx.save();ctx.strokeStyle=aligned?'rgba(74,222,128,.7)':'rgba(253,224,71,.48)';ctx.lineWidth=2;
   ctx.beginPath();ctx.arc(ballX,ballY,16,0,Math.PI*2);ctx.stroke();ctx.restore();
   // Fixed position makes the changing flight speed easy to read on mobile.
   const bx=383,by=408,bw=194;
   ctx.fillStyle='rgba(8,25,41,.88)';ctx.beginPath();ctx.roundRect(bx-8,by-7,bw+16,30,10);ctx.fill();
   ctx.fillStyle='#486173';ctx.fillRect(bx,by,bw,10);ctx.fillStyle='#4ade80';ctx.fillRect(bx+bw*cueStart,by,bw*(cueEnd-cueStart),10);
   ctx.fillStyle='#fff9db';ctx.fillRect(bx+bw*t-2,by-4,4,18);
   ctx.font='800 10px system-ui';ctx.textAlign='center';ctx.fillText(rightTime?'지금!':'공을 기다리세요',bx+bw/2,by+22);
  }
 }else{
  const throwing=pitch&&pitch.owner==='user'&&pitch.t<.38;
  drawPlayer(throwing?(liveAvatar('attack')||sprites.user.action):(liveAvatar('idle')||sprites.user.stand),480,254,.9,false,'#16a34a',true,1);
  const batting=pitch&&pitch.owner==='user'&&pitch.t>.78&&pitch.cpuDecision;
  drawPlayer(batting?sprites.cpu.action:sprites.cpu.stand,590,447,1.2,true,'#2563eb',true,4);
  ctx.save();ctx.translate(577,387);ctx.rotate(.58);ctx.scale(-1,1);
  if(readyImage(metalBatImg))ctx.drawImage(metalBatImg,-6,-10,93,24);ctx.restore();
  ctx.strokeStyle='#fbbf24';ctx.lineWidth=3;ctx.beginPath();ctx.arc(pitchAim.x,pitchAim.y,12,0,Math.PI*2);ctx.stroke();
 }
 if(pitch){
  const p=pitch,t=clamp(p.t,0,1),curve=Math.max(0,(t-.48)/.52),tx=p.actual.x+p.breakX*curve,ty=p.actual.y+p.breakY*curve;let x,y,r;
  if(p.owner==='cpu'){x=lerp(480,tx,t);y=lerp(235,ty,t);r=lerp(5,14,t)}
  else{x=lerp(480,tx,t);y=lerp(235,ty,t);r=lerp(11,5,t)}
  drawTrajectoryTrail(p.trail,p.type,1);
  ctx.save();ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=r*.55;ctx.beginPath();ctx.moveTo(x-((tx-480)*.06),y-(p.owner==='cpu'?10:5));ctx.lineTo(x,y);ctx.stroke();ctx.restore();drawBall(x,y,r);
 }
}
function drawField(){
 drawStadium();drawBase(650,345,bases[0]);drawBase(480,215,bases[1]);drawBase(310,345,bases[2]);drawBase(480,470,false);
 const items=fielders.slice().sort((a,b)=>a.y-b.y);
 items.forEach(f=>{
  const i=fielders.indexOf(f),team=f.user?'user':'cpu',set=sprites[team];
  const moving=!f.hasBall&&fieldBall&&!fieldBall.owner&&Math.hypot(f.x-f.homeX,f.y-f.homeY)>8;
  const fallbackFrame=moving?(Math.floor(simTime*8+i)%2?set.walk1:set.walk2):set.stand;
  const frame=f.user?(moving?(liveAvatar('walk')||fallbackFrame):(liveAvatar('idle')||fallbackFrame)):fallbackFrame;
  drawPlayer(frame,f.x,f.y+23,.67,false,f.user?'#16a34a':'#2563eb',true,i+1);
  if(f.hasBall){ctx.fillStyle='#875b32';ctx.beginPath();ctx.ellipse(f.x+12,f.y-10,9,6,.3,0,Math.PI*2);ctx.fill()}
  if(i===activeFielder&&state==='defenseField'){
   ctx.save();ctx.strokeStyle='#fbbf24';ctx.lineWidth=3;ctx.setLineDash([8,5]);ctx.beginPath();ctx.ellipse(f.x,f.y+2,24,12,0,0,Math.PI*2);ctx.stroke();ctx.restore();
   ctx.fillStyle='#fbbf24';ctx.beginPath();ctx.moveTo(f.x,f.y-45);ctx.lineTo(f.x-7,f.y-56);ctx.lineTo(f.x+7,f.y-56);ctx.closePath();ctx.fill();
  }
  ctx.font='900 10px system-ui';ctx.textAlign='center';ctx.fillStyle='rgba(255,255,255,.93)';ctx.fillText(f.role,f.x,f.y-32);
 });
 if(fieldBall){
  if(fieldBall.z>0){ctx.fillStyle='rgba(0,0,0,.23)';ctx.beginPath();ctx.ellipse(fieldBall.x,fieldBall.y,9,4,0,0,Math.PI*2);ctx.fill()}
  if(!fieldBall.owner)drawTrajectoryTrail(fieldBall.trail,'hit',fieldBall.trailStrength||.55);
  if(!throwPlay)drawBall(fieldBall.owner?fieldBall.owner.x+12:fieldBall.x,(fieldBall.owner?fieldBall.owner.y-13:fieldBall.y)-fieldBall.z*.23,7+Math.min(4,fieldBall.z*.01));
 }
 if(state==='defenseField')drawDefenseRunners();
 if(throwPlay&&activeFielder>=0){const bp=basePoint(throwPlay.base),k=clamp(1-throwPlay.t/throwPlay.total,0,1),x=lerp(throwPlay.startX,bp.x,k),y=lerp(throwPlay.startY,bp.y,k)-18;drawTrajectoryTrail(throwPlay.trail,'throw',.65);drawBall(x,y,6)}
}
function runnerPoint(r){const pts=[basePoint(4),basePoint(1),basePoint(2),basePoint(3),basePoint(4)],a=pts[r.from],b=pts[r.to];return{x:lerp(a.x,b.x,r.p),y:lerp(a.y,b.y,r.p)}}
function drawDefenseRunners(){
 defenseRunners.forEach(r=>{
  const p=runnerPoint(r),frame=Math.floor(simTime*10+(r.from||0))%2?sprites.cpu.walk1:sprites.cpu.walk2;
  drawPlayer(frame,p.x,p.y+16,.39,false,'#2563eb',false);
 });
}
function drawParticles(){particles.forEach(p=>{ctx.globalAlpha=clamp(p.life,0,1);ctx.fillStyle='#fbbf24';ctx.fillRect(p.x,p.y,p.r,p.r)});ctx.globalAlpha=1}
function draw(){
 ctx.setTransform(DPR,0,0,DPR,0,0);
 if(state==='batting')drawPlateView(true);else if(state==='pitching')drawPlateView(false);else if(state==='offenseField'||state==='defenseField')drawField();else drawStadium();
 drawParticles();
}
function loop(now){const dt=Math.min(.05,(now-last)/1000||0);last=now;acc+=dt;while(acc>=FIXED){update(FIXED);acc-=FIXED}draw();requestAnimationFrame(loop)}
requestAnimationFrame(loop);

function logicalPos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
canvas.addEventListener('pointerdown',e=>{const p=logicalPos(e);
 if(state==='batting'){setBatFromPoint(p);try{canvas.setPointerCapture?.(e.pointerId)}catch(_){}}
 else if(state==='pitching'&&!pitch){pitchAim.x=clamp(p.x,370,590);pitchAim.y=clamp(p.y,230,420);lessonAimSelected=true;updateLesson()}
 else if(state==='defenseField'&&fielders.length){let best=-1,dist=50;fielders.forEach((f,i)=>{const d=Math.hypot(p.x-f.x,p.y-f.y);if(d<dist){dist=d;best=i}});if(best>=0){activeFielder=best;lessonFieldTouched=true;setControls('field');updateLesson();message(fielders[best].role+' 선택',.7)}}
});
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.buttons){const p=logicalPos(e);
 if(state==='batting')setBatFromPoint(p);
 else if(state==='pitching'&&!pitch){pitchAim.x=clamp(p.x,370,590);pitchAim.y=clamp(p.y,230,420);lessonAimSelected=true;updateLesson()}
}});

window.addEventListener('keydown',e=>{
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','a','d','w','s','A','D','W','S'].includes(e.key))e.preventDefault();
 if(state==='batting'){
  if(e.key==='ArrowUp'||e.key==='w'||e.key==='W')held.batUp=true;
  if(e.key==='ArrowDown'||e.key==='s'||e.key==='S')held.batDown=true;
  if(e.code==='Space'&&!e.repeat)swingNow(e.shiftKey&&difficulty!=='easy'?'power':'contact');
 }else if(state==='pitching'){if(e.code==='Space'&&!e.repeat)beginThrow()}
 else if(state==='defenseField'){
  if(e.key==='Tab'){e.preventDefault();activeFielder=(activeFielder+1)%fielders.length;message(fielders[activeFielder].role+' 선택',.7)}
  if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A')held.left=true;if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')held.right=true;if(e.key==='ArrowUp'||e.key==='w'||e.key==='W')held.up=true;if(e.key==='ArrowDown'||e.key==='s'||e.key==='S')held.down=true;
  if(e.key==='1')throwToBase(1);if(e.key==='2')throwToBase(2);if(e.key==='3')throwToBase(3);if(e.key==='4')throwToBase(4);
 }
});
window.addEventListener('keyup',e=>{
 if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A')held.left=false;
 if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')held.right=false;
 if(e.key==='ArrowUp'||e.key==='w'||e.key==='W'){held.batUp=false;held.up=false}
 if(e.key==='ArrowDown'||e.key==='s'||e.key==='S'){held.batDown=false;held.down=false}
 if(e.code==='Space'&&state==='pitching')releaseThrow()
});

document.querySelectorAll('[data-diff]').forEach(b=>b.addEventListener('click',()=>{difficulty=b.dataset.diff;document.querySelectorAll('[data-diff]').forEach(x=>x.classList.toggle('active',x===b));sound('click')}));
document.querySelectorAll('[data-fielddiff]').forEach(b=>b.addEventListener('click',()=>{fieldDifficulty=b.dataset.fielddiff;document.querySelectorAll('[data-fielddiff]').forEach(x=>x.classList.toggle('active',x===b));sound('click')}));
$('#startBtn').addEventListener('click',startGame);
$('#tutorialBtn').addEventListener('click',()=>{lessonReplay=true;startGame()});
$('#recordsBtn').addEventListener('click',showRecords);
$('#closeRecords').addEventListener('click',()=>records.classList.add('hidden'));
$('#rematchBtn').addEventListener('click',()=>{result.classList.add('hidden');startGame()});
$('#menuBtn').addEventListener('click',()=>{result.classList.add('hidden');menu.classList.remove('hidden');state='menu';draw()});

updateHud();draw();
})();