(() => {
'use strict';
const W=960,H=540,FIXED=1/120;
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d',{alpha:false});
const DPR=Math.min(window.devicePixelRatio||1,2);
canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);ctx.imageSmoothingEnabled=true;

const $=s=>document.querySelector(s);
const menu=$('#menu'),result=$('#result'),records=$('#records'),controlGroup=$('#controlGroup');
const userRunsEl=$('#userRuns'),cpuRunsEl=$('#cpuRuns'),inningText=$('#inningText'),ballsEl=$('#balls'),strikesEl=$('#strikes'),outsEl=$('#outs');
const msgEl=$('#message'),zoneHint=$('#zoneHint'),chargeWrap=$('#chargeWrap'),chargeFill=$('#chargeFill'),chargeText=$('#chargeText');
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
const lerp=(a,b,t)=>a+(b-a)*t;
const rand=(a,b)=>a+Math.random()*(b-a);
function dotString(n,max){let s='';for(let i=0;i<max;i++)s+=i<n?'●':'○';return s}
function zoneInside(x,y){return x>=405&&x<=555&&y>=268&&y<=382}

let difficulty='normal',playing=false,last=0,acc=0,simTime=0;
let state='menu',inning=1,half='top',outs=0,balls=0,strikes=0,bases=[false,false,false],score=[0,0];
let tutorialStep=0,messageTimer=0,controlMode='',swingHold=0,throwHold=0,chargeActive=false;
let cursor={x:480,y:328},pitchAim={x:480,y:325},selectedPitch='fastball';
let pitch=null,fieldBall=null,fielders=[],activeFielder=-1,defenseRunners=[],throwPlay=null;
let offenseDecision='stop',offenseOutcome=null,offenseTimer=0,particles=[];
let gameStats=null;

const DIFF={
 easy:{pitchSpeed:.83,batWindow:.19,cpuContact:.50,cpuDiscipline:.56,fieldSpeed:150,runnerSpeed:.32,error:44},
 normal:{pitchSpeed:1,cpuContact:.63,cpuDiscipline:.68,batWindow:.15,fieldSpeed:175,runnerSpeed:.36,error:32},
 hard:{pitchSpeed:1.15,cpuContact:.75,cpuDiscipline:.79,batWindow:.12,fieldSpeed:205,runnerSpeed:.40,error:22}
};
function cfg(){return DIFF[difficulty]}

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

const held={aimLeft:false,aimRight:false,aimUp:false,aimDown:false,left:false,right:false,up:false,down:false,swing:false,throw:false};
function setControls(mode){
 if(controlMode===mode)return;controlMode=mode;controlGroup.innerHTML='';
 const add=(text,cls,action,hold=false)=>{
  const b=document.createElement('button');b.type='button';b.className='ctrl '+(cls||'');b.textContent=text;b.dataset.action=action;
  if(hold){
   const down=e=>{e.preventDefault();held[action]=true;b.classList.add('active')};
   const up=e=>{e.preventDefault();held[action]=false;b.classList.remove('active')};
   b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',e=>{if(e.buttons===0)up(e)});
  }else b.addEventListener('click',e=>{e.preventDefault();controlAction(action)});
  controlGroup.appendChild(b);return b;
 };
 if(mode==='bat'){
  add('조준 ◀','', 'aimLeft',true);add('조준 ▶','', 'aimRight',true);add('조준 ▲','', 'aimUp',true);add('조준 ▼','', 'aimDown',true);
  const sw=add('스윙','primary','swing',true);
  sw.addEventListener('pointerdown',()=>beginSwing());sw.addEventListener('pointerup',()=>releaseSwing());sw.addEventListener('pointercancel',()=>releaseSwing());
 }else if(mode==='pitch'){
  ['fastball:직구','curve:커브','change:체인지업','slider:슬라이더'].forEach(pair=>{const [a,t]=pair.split(':');add(t,a===selectedPitch?'active':'','pitch:'+a)});
  const th=add('던지기','primary','throw',true);th.addEventListener('pointerdown',()=>beginThrow());th.addEventListener('pointerup',()=>releaseThrow());th.addEventListener('pointercancel',()=>releaseThrow());
 }else if(mode==='field'){
  add('◀','', 'left',true);add('▲','', 'up',true);add('▼','', 'down',true);add('▶','', 'right',true);
  if(activeFielder>=0&&fielders[activeFielder]?.hasBall){add('1루','blue','base1');add('2루','blue','base2');add('3루','blue','base3');add('홈','red','base4')}
 }else if(mode==='run'){
  add('멈춘다','', 'stop');add('더 간다!','green','go');
 }
}
function controlAction(a){
 sound('click');
 if(a.startsWith('pitch:')){selectedPitch=a.split(':')[1];setControls('');setControls('pitch');return}
 if(/^base[1-4]$/.test(a)){throwToBase(Number(a.slice(-1)));return}
 if(a==='go'){offenseDecision='go';message('한 베이스 더 노린다!',.9);return}
 if(a==='stop'){offenseDecision='stop';message('안전하게 멈춘다!',.9)}
}

let delayed=[];
function setTimeoutLike(fn,t){delayed.push({fn,t})}
function updateDelayed(dt){for(let i=delayed.length-1;i>=0;i--){delayed[i].t-=dt;if(delayed[i].t<=0){const fn=delayed[i].fn;delayed.splice(i,1);try{fn()}catch(e){console.error(e)}}}}

function startGame(){
 delayed=[];score=[0,0];inning=1;half='top';outs=0;bases=[false,false,false];clearCounts();resetStats();playing=true;state='between';tutorialStep=0;menu.classList.add('hidden');result.classList.add('hidden');
 message('PLAY BALL!',1.2);setTimeoutLike(()=>nextPlateAppearance(),.7);updateHud();
}
function nextPlateAppearance(){
 if(!playing)return;
 clearCounts();pitch=null;fieldBall=null;throwPlay=null;hideCharge();offenseOutcome=null;offenseDecision='stop';
 if(half==='top')startBatting();else startPitching();
}
function startBatting(){
 state='batting';cursor.x=480;cursor.y=330;setControls('bat');hint('커서를 스트라이크 존에 맞추고 공을 기다리세요');
 if(tutorialStep===0){message('공의 코스를 보고 조준하세요. 스윙은 누르고 있다가 공이 올 때 놓기!',3);tutorialStep=1}
 setTimeoutLike(()=>spawnCpuPitch(),.75);
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
 const type=types[Math.floor(Math.random()*types.length)],p=pitchProfile(type);
 const strikeProb=difficulty==='easy'?.72:.62,isLikelyStrike=Math.random()<strikeProb;
 let tx,ty;
 if(isLikelyStrike){tx=rand(420,540);ty=rand(282,368)}else{
  const side=Math.floor(Math.random()*4);
  if(side===0){tx=rand(370,400);ty=rand(275,375)}
  if(side===1){tx=rand(560,590);ty=rand(275,375)}
  if(side===2){tx=rand(410,550);ty=rand(230,260)}
  if(side===3){tx=rand(410,550);ty=rand(390,420)}
 }
 pitch={owner:'cpu',type,t:0,duration:(1.06/p.speed)/cfg().pitchSpeed,target:{x:tx,y:ty},actual:{x:tx,y:ty},breakX:p.breakX,breakY:p.breakY,swung:false};
 message(p.label,.7);
}
function beginSwing(){if(state!=='batting'||!pitch||pitch.swung)return;swingHold=0;chargeActive=true}
function releaseSwing(){
 if(state!=='batting'||!pitch||pitch.swung||!chargeActive)return;
 pitch.swung=true;chargeActive=false;hideCharge();sound('swing',.92);const power=clamp(swingHold/.65,0,1);resolveUserSwing(power);
}
function resolveUserSwing(power){
 const p=pitch,bx=p.actual.x+p.breakX*Math.max(0,p.t-.55),by=p.actual.y+p.breakY*Math.max(0,p.t-.55);
 const timing=p.t-.91,window=cfg().batWindow*(1-.16*power),spatial=Math.hypot(cursor.x-bx,cursor.y-by);
 const timingScore=clamp(1-Math.abs(timing)/window,0,1),spaceScore=clamp(1-spatial/92,0,1),q=timingScore*spaceScore;
 if(q<.17){strikes++;sound('fail',1.15);message(timing<-.03?'너무 일찍!':'헛스윙!',1.1);finishCountPitch();return}
 if(q<.31&&Math.random()<.62){
  sound('hit',1.5);message('파울!',.8);if(strikes<2)strikes++;updateHud();setTimeoutLike(()=>{if(state==='batting')spawnCpuPitch()},.75);return;
 }
 sound('hit',.86+q*.32);startOffenseBall(q,power,timing,cursor.y-by);
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

function startOffenseBall(q,power,timing,verticalErr){
 state='offenseField';setControls('run');hint('');
 const spray=clamp(timing/cfg().batWindow*1.1+rand(-.075,.075),-.95,.95),launch=clamp(.33-verticalErr/180+rand(-.05,.05),.05,.76);
 const rawDist=65+q*170+power*145+rand(-24,24),distanceM=Math.round(rawDist*.31+32),dir=Math.PI/2+spray,speed=rawDist/(1.15+launch*1.7);
 fieldBall={x:480,y:470,z:10,vx:Math.cos(dir)*speed,vy:-Math.sin(dir)*speed,vz:170+launch*260,bounced:false,owner:null,age:0,maxDist:rawDist};
 offenseOutcome={q,power,rawDist,distanceM,launch,spray};offenseTimer=0;offenseDecision='stop';makeFielders(false);
 message(rawDist>325&&launch>.32?'담장까지 간다! 더 달릴까?':'타구가 날아갑니다! 주루를 판단하세요.',1.6);
}
function makeFielders(userDefense){
 const pos=[[480,405,'P'],[625,365,'1B'],[545,315,'2B'],[415,315,'SS'],[335,365,'3B'],[300,205,'LF'],[480,160,'CF'],[660,205,'RF']];
 fielders=pos.map((p,i)=>({x:p[0],y:p[1],homeX:p[0],homeY:p[1],role:p[2],hasBall:false,user:userDefense,speed:(userDefense?cfg().fieldSpeed:cfg().fieldSpeed*.92)*(i===6?1.03:1)}));
 activeFielder=-1;
}
function updateOffenseField(dt){
 if(!fieldBall)return;offenseTimer+=dt;updateBallPhysics(dt);
 let nearest=-1,nd=1e9;fielders.forEach((f,i)=>{const d=Math.hypot(f.x-fieldBall.x,f.y-fieldBall.y);if(d<nd){nd=d;nearest=i}});
 if(offenseTimer>(difficulty==='easy'?.42:difficulty==='normal'?.3:.2))fielders.forEach((f,i)=>{const target=i===nearest?fieldBall:{x:f.homeX,y:f.homeY},dx=target.x-f.x,dy=target.y-f.y,l=Math.hypot(dx,dy)||1,sp=f.speed*(i===nearest?1:.45);f.x+=dx/l*sp*dt;f.y+=dy/l*sp*dt});
 const f=fielders[nearest];
 if(f&&fieldBall.z<24&&Math.hypot(f.x-fieldBall.x,f.y-fieldBall.y)<20){
  let caught=fieldBall.bounced;
  if(!caught&&!fieldBall.catchAttempted){fieldBall.catchAttempted=true;caught=Math.random()<(difficulty==='easy'?.58:difficulty==='normal'?.75:.87)}
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
 else if(fieldBall?.owner&&fieldBall.bounced&&o.rawDist<245&&Math.random()<(difficulty==='easy'?.34:difficulty==='normal'?.47:.58))out=true;
 else if(o.q<.28&&o.launch<.22&&Math.random()<.62+(difficulty==='hard'?.12:0))out=true;
 else if(o.launch>.42&&o.q<.58&&Math.random()<.52+(difficulty==='hard'?.1:0))out=true;
 else if(o.rawDist>280&&o.launch<.25&&Math.abs(o.spray)>.35)basesEarned=3;
 else if(o.rawDist>260)basesEarned=2;
 if(!out&&offenseDecision==='go'&&!hr){
  const risk=clamp(.58-o.q*.28+(difficulty==='hard'?.12:0),.18,.66);
  if(Math.random()<risk){out=true;message('욕심냈다가 주루사!',1.3)}else basesEarned=Math.min(4,basesEarned+1);
 }
 if(out){outs++;message(fieldBall?.owner&&!fieldBall.bounced||o.launch>.35?'외야 플라이 아웃!':'땅볼 아웃!',1.25);afterOutOrPlay();return}
 const before=score[0];advanceRunners(0,basesEarned);const rbi=score[0]-before;
 gameStats.hits++;
 if(hr){gameStats.hr++;sound('cheer');message('HOME RUN! '+o.distanceM+'m',2.1);burst(480,230,42)}
 else{sound('cheer',1.15);message(basesEarned===3?'3루타!':basesEarned===2?'2루타!':'안타!',1.3)}
 clearCounts();updateHud();if(rbi>0)gameStats.runs+=rbi;setTimeoutLike(()=>nextPlateAppearance(),hr?1.9:1.05);
}
function advanceRunners(side,n){
 const old=bases.slice();bases=[false,false,false];let runs=0;
 for(let i=2;i>=0;i--)if(old[i]){const dest=i+1+n;if(dest>=4)runs++;else bases[dest-1]=true}
 if(n>=4)runs++;else bases[n-1]=true;score[side]+=runs;updateHud();
}

function startPitching(){
 state='pitching';selectedPitch='fastball';pitchAim.x=480;pitchAim.y=325;setControls('pitch');hint('스트라이크 존을 눌러 코스를 정하세요');
 if(tutorialStep===1){message('이번에는 투수! 코스를 찍고 구종을 고른 뒤, 던지기를 적당히 충전해 놓으세요.',3);tutorialStep=2}
}
function beginThrow(){if(state!=='pitching'||pitch)return;throwHold=0;chargeActive=true}
function releaseThrow(){
 if(state!=='pitching'||pitch||!chargeActive)return;chargeActive=false;hideCharge();
 const charge=clamp(throwHold/1.05,0,1),accuracy=clamp(1-Math.abs(charge-.72)/.72,0,1),err=cfg().error*(1-accuracy),prof=pitchProfile(selectedPitch);
 const ax=pitchAim.x+rand(-err,err),ay=pitchAim.y+rand(-err,err);
 pitch={owner:'user',type:selectedPitch,t:0,duration:(1.05/prof.speed)/cfg().pitchSpeed,target:{...pitchAim},actual:{x:ax,y:ay},breakX:prof.breakX,breakY:prof.breakY,accuracy,swung:false,cpuDecision:null};sound('pitch',.8+prof.speed*.16);
 decideCpuSwing();message(prof.label+' 간다!',.7);
}
function decideCpuSwing(){
 const p=pitch,fx=p.actual.x+p.breakX,fy=p.actual.y+p.breakY,inside=zoneInside(fx,fy);
 let chance=inside?.80:clamp(.33-cfg().cpuDiscipline*.25,.08,.24);
 if(selectedPitch==='change'||selectedPitch==='curve')chance+=.04;
 if(!inside&&Math.random()<cfg().cpuDiscipline*.55)chance*=.35;p.cpuDecision=Math.random()<chance;
}
function resolveCpuAtPlate(){
 const p=pitch,fx=p.actual.x+p.breakX,fy=p.actual.y+p.breakY,inside=zoneInside(fx,fy);
 if(!p.cpuDecision){
  if(inside){strikes++;message('스트라이크!',.9)}else{balls++;message('볼!',.9)}updateHud();
  if(strikes>=3){outs++;gameStats.pitchKs++;clearCounts();message('삼진 잡았다!',1.3);afterOutOrPlay()}
  else if(balls>=4){walkRunner(1);clearCounts();message('볼넷 허용',1.1);setTimeoutLike(()=>nextPlateAppearance(),.9)}
  else{pitch=null;setTimeoutLike(()=>{if(state==='pitching')setControls('pitch')},.55)}
  return;
 }
 const locPenalty=clamp(Math.hypot(fx-480,fy-325)/150,0,1),stuff=(selectedPitch==='fastball'?.12:selectedPitch==='change'?.08:.1)+p.accuracy*.12;
 const contactChance=clamp(cfg().cpuContact+.16*(1-locPenalty)-stuff,.22,.86);
 if(Math.random()>contactChance){
  strikes++;sound('fail',1.2);message('헛스윙!',.9);updateHud();
  if(strikes>=3){outs++;gameStats.pitchKs++;clearCounts();message('삼진 아웃!',1.3);afterOutOrPlay()}
  else{pitch=null;setTimeoutLike(()=>{if(state==='pitching')setControls('pitch')},.55)}
  return;
 }
 sound('hit',.95);startDefenseBall(contactChance,p.accuracy,fx,fy);
}
function startDefenseBall(contact,accuracy,fx,fy){
 state='defenseField';hint('가까운 수비수를 움직여 공을 잡으세요');makeFielders(true);
 const spray=clamp((fx-480)/150+rand(-.42,.42),-.9,.9),launch=clamp((350-fy)/170+rand(.08,.38),.08,.72),power=clamp(contact+rand(-.18,.26)+(1-accuracy)*.18,.25,.95),rawDist=120+power*235;
 const dir=Math.PI/2+spray,speed=rawDist/(1.2+launch*1.55);
 fieldBall={x:480,y:470,z:10,vx:Math.cos(dir)*speed,vy:-Math.sin(dir)*speed,vz:160+launch*250,bounced:false,owner:null,age:0,maxDist:rawDist};
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
  const dx=(held.right?1:0)-(held.left?1:0),dy=(held.down?1:0)-(held.up?1:0),l=Math.hypot(dx,dy)||1;
  a.x=clamp(a.x+dx/l*a.speed*dt,185,775);a.y=clamp(a.y+dy/l*a.speed*dt,125,470);
 }
 fielders.forEach((f,i)=>{if(i===activeFielder||f.hasBall)return;const target=fieldBall.owner?{x:f.homeX,y:f.homeY}:fieldBall,dx=target.x-f.x,dy=target.y-f.y,l=Math.hypot(dx,dy)||1;f.x+=dx/l*f.speed*.48*dt;f.y+=dy/l*f.speed*.48*dt});
 if(!fieldBall.owner){
  const candidates=fielders.map((f,i)=>({f,i,d:Math.hypot(f.x-fieldBall.x,f.y-fieldBall.y)})).sort((a,b)=>a.d-b.d),c=candidates[0];
  if(c&&fieldBall.z<26&&c.d<27){
   let mayCatch=true;
   if(c.i!==activeFielder&&!fieldBall.bounced){mayCatch=!fieldBall.assistAttempted&&Math.random()<(difficulty==='easy'?.8:difficulty==='normal'?.42:.18);fieldBall.assistAttempted=true}
   if(mayCatch){
    sound('catch');c.f.hasBall=true;fieldBall.owner=c.f;activeFielder=c.i;const caught=!fieldBall.bounced&&fieldBall.z>4;fieldBall.vx=fieldBall.vy=fieldBall.vz=0;
    if(caught){outs++;message('플라이 아웃!',1.25);defenseRunners=[];afterOutOrPlay();return}
    message('잡았다! 어느 베이스로 던질까?',1.4);setControls('');setControls('field');
   }
  }
 }
 if(fieldBall.owner&&!throwPlay){fieldBall.heldTime=(fieldBall.heldTime||0)+dt;if(fieldBall.heldTime>2.4){message('송구가 너무 늦었다!',1.2);settleDefenseHit(fieldBall.maxDist>285?2:1);return}}
 if(throwPlay){throwPlay.t-=dt;if(throwPlay.t<=0){resolveThrowPlay();return}}
 if(fieldBall.age>5.2&&!fieldBall.owner){message('타구가 빠져나갔다!',1.1);settleDefenseHit(2)}
}
function basePoint(n){return n===1?{x:650,y:345}:n===2?{x:480,y:215}:n===3?{x:310,y:345}:{x:480,y:470}}
function throwToBase(n){
 if(state!=='defenseField'||activeFielder<0)return;const f=fielders[activeFielder];if(!f?.hasBall||throwPlay)return;
 const bp=basePoint(n),d=Math.hypot(f.x-bp.x,f.y-bp.y);throwPlay={base:n,t:.34+d/620,total:.34+d/620};message((n===4?'홈':n+'루')+' 송구!',.8);sound('throw',1.15)
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
 fieldBall.age+=dt;fieldBall.x+=fieldBall.vx*dt;fieldBall.y+=fieldBall.vy*dt;fieldBall.z+=fieldBall.vz*dt;fieldBall.vz-=390*dt;
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
 if(half==='top'){if(inning>=3&&score[1]>score[0]){endGame();return}half='bottom';message(inning+'회말 — 수비!',1.25);updateHud();setTimeoutLike(()=>nextPlateAppearance(),1.0);return}
 half='top';inning++;
 if(inning>3&&score[0]!==score[1]){endGame();return}
 if(inning>5){endGame();return}
 message(inning>3?inning+'회 연장전!':inning+'회초 — 공격!',1.3);updateHud();setTimeoutLike(()=>nextPlateAppearance(),1.0);
}
function endGame(){
 if(!playing)return;playing=false;state='gameover';setControls('');hideCharge();saveCareer();
 const win=score[0]>score[1],tie=score[0]===score[1];if(win)sound('win');else if(!tie)sound('fail');
 $('#resultTitle').textContent=tie?'무승부':win?'승리!':'경기 종료';
 $('#resultText').innerHTML='최종 스코어 <b>'+score[0]+' : '+score[1]+'</b><br><br>이번 경기 안타 <b>'+gameStats.hits+'</b> · 홈런 <b>'+gameStats.hr+'</b> · 타자 삼진 <b>'+gameStats.ks+'</b><br>투수 탈삼진 <b>'+gameStats.pitchKs+'</b> · 최장 타구 <b>'+Math.round(gameStats.bestDistance)+'m</b>';
 result.classList.remove('hidden');
}

function updatePitch(dt){
 if(!pitch)return;pitch.t+=dt/pitch.duration;
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
  const sp=185;cursor.x=clamp(cursor.x+((held.aimRight?1:0)-(held.aimLeft?1:0))*sp*dt,380,580);cursor.y=clamp(cursor.y+((held.aimDown?1:0)-(held.aimUp?1:0))*sp*dt,235,420);
  if(chargeActive){swingHold+=dt;showCharge('스윙 파워',clamp(swingHold/.65,0,1))}updatePitch(dt);
 }else if(state==='pitching'){
  if(chargeActive){throwHold+=dt;showCharge('정확도 — 70% 부근에서 놓기',clamp(throwHold/1.05,0,1))}updatePitch(dt);
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
function drawPlayer(img,x,y,scale=1,flip=false,jersey='#16a34a'){
 ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);
 if(img&&img.complete&&img.naturalWidth){const h=76*scale,w=h*(img.naturalWidth/img.naturalHeight);ctx.drawImage(img,-w/2,-h,w,h)}
 else{ctx.fillStyle='#f5cda7';ctx.beginPath();ctx.arc(0,-48*scale,12*scale,0,Math.PI*2);ctx.fill();ctx.fillStyle=jersey;ctx.fillRect(-13*scale,-38*scale,26*scale,34*scale)}
 ctx.restore();
}
function drawBall(x,y,r=7){
 ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ef4444';ctx.lineWidth=Math.max(1,r*.12);
 ctx.beginPath();ctx.arc(x-r*.18,y,r*.62,-1.1,1.1);ctx.stroke();ctx.beginPath();ctx.arc(x+r*.18,y,r*.62,2.04,4.24);ctx.stroke();
}
function drawPlateView(isBatting){
 ctx.fillStyle='#10253c';ctx.fillRect(0,0,W,H);ctx.fillStyle='#1f3852';ctx.fillRect(0,80,W,115);
 for(let y=95;y<180;y+=22)for(let x=20;x<W;x+=34){ctx.fillStyle=((x+y)%3===0)?'#f59e0b':'#94a3b8';ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill()}
 const g=ctx.createLinearGradient(0,185,0,H);g.addColorStop(0,'#37814c');g.addColorStop(1,'#1f6038');ctx.fillStyle=g;ctx.fillRect(0,185,W,H-185);
 ctx.fillStyle='#c89f68';ctx.beginPath();ctx.ellipse(480,230,78,35,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(480,445,130,80,0,0,Math.PI*2);ctx.fill();
 const zx=405,zy=268,zw=150,zh=114;ctx.strokeStyle='rgba(255,255,255,.65)';ctx.lineWidth=2;ctx.strokeRect(zx,zy,zw,zh);
 ctx.strokeStyle='rgba(255,255,255,.17)';for(let i=1;i<3;i++){ctx.beginPath();ctx.moveTo(zx+i*50,zy);ctx.lineTo(zx+i*50,zy+zh);ctx.stroke();ctx.beginPath();ctx.moveTo(zx,zy+i*38);ctx.lineTo(zx+zw,zy+i*38);ctx.stroke()}
 if(isBatting){
  drawPlayer(sprites.cpu.stand,480,244,.86,false,'#2563eb');
  const batter=avatarImg&&avatarImg.complete?avatarImg:sprites.user.stand;drawPlayer(batter,620,438,1.15,true,'#16a34a');
  if(batImg.complete&&batImg.naturalWidth){ctx.save();ctx.translate(588,374);ctx.rotate(-.62);ctx.drawImage(batImg,-6,-42,12,84);ctx.restore()}
  ctx.strokeStyle='#fbbf24';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cursor.x,cursor.y,17,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(cursor.x-24,cursor.y);ctx.lineTo(cursor.x+24,cursor.y);ctx.moveTo(cursor.x,cursor.y-24);ctx.lineTo(cursor.x,cursor.y+24);ctx.stroke();
 }else{
  drawPlayer(sprites.user.stand,480,242,.9,false,'#16a34a');drawPlayer(sprites.cpu.stand,590,440,1.15,true,'#2563eb');
  ctx.strokeStyle='#fbbf24';ctx.lineWidth=3;ctx.beginPath();ctx.arc(pitchAim.x,pitchAim.y,12,0,Math.PI*2);ctx.stroke();
 }
 if(pitch){
  const p=pitch,t=clamp(p.t,0,1),curve=Math.max(0,(t-.48)/.52),tx=p.actual.x+p.breakX*curve,ty=p.actual.y+p.breakY*curve;let x,y,r;
  if(p.owner==='cpu'){x=lerp(480,tx,t);y=lerp(228,ty,t);r=lerp(5,14,t)}else{x=lerp(480,tx,t);y=lerp(235,ty,t);r=lerp(11,5,t)}drawBall(x,y,r);
 }
}
function drawField(){
 drawStadium();drawBase(650,345,bases[0]);drawBase(480,215,bases[1]);drawBase(310,345,bases[2]);drawBase(480,470,false);
 fielders.forEach((f,i)=>{
  const img=f.user?sprites.user.stand:sprites.cpu.stand;drawPlayer(img,f.x,f.y+22,.62,false,f.user?'#16a34a':'#2563eb');
  if(i===activeFielder&&state==='defenseField'){ctx.strokeStyle='#fbbf24';ctx.lineWidth=4;ctx.beginPath();ctx.arc(f.x,f.y,24,0,Math.PI*2);ctx.stroke()}
  ctx.fillStyle='rgba(2,6,23,.7)';ctx.font='800 11px system-ui';ctx.textAlign='center';ctx.fillText(f.role,f.x,f.y-30);
 });
 if(fieldBall){
  if(fieldBall.z>0){ctx.fillStyle='rgba(0,0,0,.24)';ctx.beginPath();ctx.ellipse(fieldBall.x,fieldBall.y,9,4,0,0,Math.PI*2);ctx.fill()}
  drawBall(fieldBall.owner?fieldBall.owner.x:fieldBall.x,(fieldBall.owner?fieldBall.owner.y:fieldBall.y)-fieldBall.z*.23,7+Math.min(4,fieldBall.z*.01));
 }
 if(state==='defenseField')drawDefenseRunners();
 if(throwPlay&&activeFielder>=0){const f=fielders[activeFielder],bp=basePoint(throwPlay.base),k=1-throwPlay.t/throwPlay.total;drawBall(lerp(f.x,bp.x,k),lerp(f.y,bp.y,k)-18,6)}
}
function runnerPoint(r){const pts=[basePoint(4),basePoint(1),basePoint(2),basePoint(3),basePoint(4)],a=pts[r.from],b=pts[r.to];return{x:lerp(a.x,b.x,r.p),y:lerp(a.y,b.y,r.p)}}
function drawDefenseRunners(){defenseRunners.forEach(r=>{const p=runnerPoint(r);ctx.fillStyle='#2563eb';ctx.beginPath();ctx.arc(p.x,p.y,8,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke()})}
function drawParticles(){particles.forEach(p=>{ctx.globalAlpha=clamp(p.life,0,1);ctx.fillStyle='#fbbf24';ctx.fillRect(p.x,p.y,p.r,p.r)});ctx.globalAlpha=1}
function draw(){
 ctx.setTransform(DPR,0,0,DPR,0,0);
 if(state==='batting')drawPlateView(true);else if(state==='pitching')drawPlateView(false);else if(state==='offenseField'||state==='defenseField')drawField();else drawStadium();
 drawParticles();
}
function loop(now){const dt=Math.min(.05,(now-last)/1000||0);last=now;acc+=dt;while(acc>=FIXED){update(FIXED);acc-=FIXED}draw();requestAnimationFrame(loop)}
requestAnimationFrame(loop);

function logicalPos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
canvas.addEventListener('pointerdown',e=>{const p=logicalPos(e);if(state==='batting'){cursor.x=clamp(p.x,380,580);cursor.y=clamp(p.y,235,420)}else if(state==='pitching'&&!pitch){pitchAim.x=clamp(p.x,370,590);pitchAim.y=clamp(p.y,230,420)}else if(state==='defenseField'&&fielders.length){let best=-1,dist=50;fielders.forEach((f,i)=>{const d=Math.hypot(p.x-f.x,p.y-f.y);if(d<dist){dist=d;best=i}});if(best>=0){activeFielder=best;setControls('field');message(fielders[best].role+' 선택',.7)}}});
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.buttons){const p=logicalPos(e);if(state==='batting'){cursor.x=clamp(p.x,380,580);cursor.y=clamp(p.y,235,420)}else if(state==='pitching'&&!pitch){pitchAim.x=clamp(p.x,370,590);pitchAim.y=clamp(p.y,230,420)}}});

window.addEventListener('keydown',e=>{
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','a','d','w','s','A','D','W','S'].includes(e.key))e.preventDefault();
 if(state==='batting'){
  if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A')held.aimLeft=true;if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')held.aimRight=true;if(e.key==='ArrowUp'||e.key==='w'||e.key==='W')held.aimUp=true;if(e.key==='ArrowDown'||e.key==='s'||e.key==='S')held.aimDown=true;if(e.code==='Space'&&!e.repeat)beginSwing();
 }else if(state==='pitching'){if(e.code==='Space'&&!e.repeat)beginThrow()}
 else if(state==='defenseField'){
  if(e.key==='Tab'){e.preventDefault();activeFielder=(activeFielder+1)%fielders.length;message(fielders[activeFielder].role+' 선택',.7)}
  if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A')held.left=true;if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')held.right=true;if(e.key==='ArrowUp'||e.key==='w'||e.key==='W')held.up=true;if(e.key==='ArrowDown'||e.key==='s'||e.key==='S')held.down=true;
  if(e.key==='1')throwToBase(1);if(e.key==='2')throwToBase(2);if(e.key==='3')throwToBase(3);if(e.key==='4')throwToBase(4);
 }
});
window.addEventListener('keyup',e=>{
 if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A'){held.aimLeft=false;held.left=false}
 if(e.key==='ArrowRight'||e.key==='d'||e.key==='D'){held.aimRight=false;held.right=false}
 if(e.key==='ArrowUp'||e.key==='w'||e.key==='W'){held.aimUp=false;held.up=false}
 if(e.key==='ArrowDown'||e.key==='s'||e.key==='S'){held.aimDown=false;held.down=false}
 if(e.code==='Space'){if(state==='batting')releaseSwing();else if(state==='pitching')releaseThrow()}
});

document.querySelectorAll('[data-diff]').forEach(b=>b.addEventListener('click',()=>{difficulty=b.dataset.diff;document.querySelectorAll('[data-diff]').forEach(x=>x.classList.toggle('active',x===b));sound('click')}));
$('#startBtn').addEventListener('click',startGame);
$('#recordsBtn').addEventListener('click',showRecords);
$('#closeRecords').addEventListener('click',()=>records.classList.add('hidden'));
$('#rematchBtn').addEventListener('click',()=>{result.classList.add('hidden');startGame()});
$('#menuBtn').addEventListener('click',()=>{result.classList.add('hidden');menu.classList.remove('hidden');state='menu';draw()});

updateHud();draw();
})();