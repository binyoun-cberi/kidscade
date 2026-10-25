(function(){
'use strict';
const C=window.RuleSettingsModeConfig;
if(!C)throw new Error('설정 탈출: 스테이지 정보가 없습니다.');
const $=id=>document.getElementById(id);
const canvas=$('scene'),ctx=canvas.getContext('2d'),screen=$('screen'),panelEl=$('floatingPanel');
const stageDialog=$('stageDialog'),clearDialog=$('clearDialog'),settings=C.defaultSettings();
const SAVE='kidscade_game_v1:high_rule_lab:settings_mode_v1';
const heroImage=new Image();
heroImage.src='../../../assets/game/characters/people/kenney-platformer-characters/player/poses/player-stand.png';
const scenery={};
for(const [name,file] of Object.entries({
 cloud1:'cloud1.png',cloud2:'cloud2.png',bush:'bush.png',rock:'rock.png',spike:'spikes.png',flag:'flag-blue.png'
})){
 const image=new Image();image.src='../../../assets/game/2d/platformer-art/base/items/'+file;scenery[name]=image;
}
const guardArt=new Image();guardArt.src='../../../assets/game/2d/platformer-art/base/enemies/poker-mad.png';
function sprite(name,x,y,w,h){
 const im=name==='guard'?guardArt:scenery[name];
 if(!im||!im.complete||!im.naturalWidth)return false;
 try{ctx.drawImage(im,x,y,w,h);return true}catch(_){return false}
}
const player={x:64,y:C.FLOOR-38,w:29,h:38,vx:0,vy:0,grounded:true,coyote:0,jumpBuffer:0};
const keys={left:false,right:false,jump:false};
const panel={x:180,y:260,w:155,h:64};
let stage=0,unlocked=1,cleared={},attempts=0,bullets=[],hits=0,shotClock=0,ended=false,paused=false,drag=null,prev=0,frame=0,noticeTimer=0;
let audio=null;
function loadProgress(){
 try{const s=JSON.parse(localStorage.getItem(SAVE)||'{}');unlocked=C.clamp(s.unlocked||1,1,C.STAGES.length);cleared=s.cleared&&typeof s.cleared==='object'?s.cleared:{}}catch(_){unlocked=1;cleared={}}
}
function store(){try{localStorage.setItem(SAVE,JSON.stringify({unlocked,cleared}))}catch(_){}}
function announce(text,ttl=2){
 $('feedback').textContent=text;$('boardMessage').textContent=text;noticeTimer=ttl;
}
function playSound(hz=550,len=.08){
 try{
  if(settings.volume===0)return;
  audio=audio||new(window.AudioContext||window.webkitAudioContext)();
  if(audio.state==='suspended')audio.resume();
  const osc=audio.createOscillator(),gain=audio.createGain();
  gain.gain.value=settings.volume/100*.035;osc.type='triangle';osc.frequency.value=hz;
  gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+len);
  osc.connect(gain).connect(audio.destination);osc.start();osc.stop(audio.currentTime+len);
 }catch(_){}
}
function stageSettings(){
 const fresh=C.defaultSettings();
 fresh.brightness=stage===1?15:35;
 fresh.volume=stage===2?75:70;
 Object.assign(settings,fresh);
 ['brightness','volume','frame'].forEach(k=>{$(k).value=settings[k];$(k+'Value').textContent=settings[k]+'%'});
}
function updatePanel(){
 panelEl.style.left=(panel.x/C.W*100)+'%';
 panelEl.style.top=(panel.y/C.H*100)+'%';
}
function resetPlayer(message){
 player.x=C.STAGES[stage].spawn;player.y=C.FLOOR-player.h;
 player.vx=0;player.vy=0;player.grounded=true;player.coyote=.12;player.jumpBuffer=0;
 attempts++;
 if(message)announce(message);
}
function showStage(index){
 stage=C.clamp(index,0,C.STAGES.length-1);
 ended=false;clearDialog.open&&clearDialog.close();
 Object.keys(keys).forEach(k=>keys[k]=false);
 bullets=[];hits=0;shotClock=0;attempts=0;frame=0;
 panel.x=stage===3?180:stage===5?140:205;
 panel.y=stage===3?275:stage===5?255:270;
 panelEl.hidden=stage!==3&&stage!==5;
 stageSettings();updatePanel();resetPlayer();
 const info=C.STAGES[stage];
 $('stageTitle').textContent=info.title;$('stageDesc').textContent=info.description;
 $('chapter').textContent=info.chapter;$('stageCount').textContent=String(stage+1).padStart(2,'0')+' / '+String(C.STAGES.length).padStart(2,'0');
 $('tip').textContent='← → / A·D 이동 · 스페이스 / ↑ 점프';
 $('puzzleTip').textContent=info.tip;
 $('status').textContent='출구를 찾아요';$('boardMessage').textContent=info.chapter;
 $('feedback').textContent='';noticeTimer=0;
 window.KidscadeGame?.start?.({stage:stage+101,mode:'settings'});
 renderStageList();
}
function getPlatforms(){const parts=C.floorParts(stage,settings);if(stage===3)parts.push({...panel,oneWay:true});return parts}
function obstacle(){
 const kind=C.STAGES[stage].kind;
 if(kind==='dark'&&!C.canExit(stage,settings,hits))return {x:777,y:357,w:23,h:C.FLOOR-357};
 return null;
}
function tryJump(){player.jumpBuffer=.13}
function movePhysics(dt){
 const direction=(keys.right?1:0)-(keys.left?1:0);
 player.vx=direction*250;
 player.x=C.clamp(player.x+player.vx*dt,0,C.W-player.w);
 const gate=obstacle();
 if(gate&&player.x+player.w>gate.x&&player.x<gate.x+gate.w&&player.y+player.h>gate.y){
  if(direction>0)player.x=gate.x-player.w;else if(direction<0)player.x=gate.x+gate.w;
 }
 player.jumpBuffer=Math.max(0,player.jumpBuffer-dt);
 player.coyote=player.grounded?.11:Math.max(0,player.coyote-dt);
 if(player.jumpBuffer>0&&player.coyote>0){
  player.vy=-480;player.grounded=false;player.coyote=0;player.jumpBuffer=0;playSound(490,.055);
 }
 const oldBottom=player.y+player.h;
 player.vy=Math.min(820,player.vy+1260*dt);
 player.y+=player.vy*dt;
 player.grounded=false;
 if(player.vy>=0){
  let land=Infinity;
  for(const p of getPlatforms()){
   if(player.x+player.w<=p.x+3||player.x>=p.x+p.w-3)continue;
   if(oldBottom<=p.y+9&&player.y+player.h>=p.y-1&&p.y<land)land=p.y;
  }
  if(land<Infinity){player.y=land-player.h;player.vy=0;player.grounded=true}
 }
 if(player.y>C.H+45)resetPlayer('발밑이 비었어요. 다시 도전!');
}
function advanceShots(dt){
 if(C.STAGES[stage].kind!=='shield')return;
 if(hits>=2){bullets.length=0;return}
 shotClock+=dt;
 if(shotClock>=1.55){shotClock=0;bullets.push({x:822,y:415,r:10,vx:-310})}
 for(let i=bullets.length-1;i>=0;i--){
  const shot=bullets[i];shot.x+=shot.vx*dt;
  if(C.interceptsShield(shot,panel)){
   bullets.splice(i,1);hits++;announce('설정 창으로 막았어요! '+hits+' / 2');
   playSound(770,.08);continue;
  }
  if(shot.x<0){bullets.splice(i,1);continue}
  if(shot.x+shot.r>player.x&&shot.x-shot.r<player.x+player.w&&shot.y+shot.r>player.y&&shot.y-shot.r<player.y+player.h){
   bullets.splice(i,1);resetPlayer('신호탄에 맞았어요. 창을 방패로 놓아 보세요.');
  }
 }
}
function advanceGuard(){
 if(!C.isGuardActive(stage,settings))return;
 const guardX=stage===2?640:810;
 const dist=Math.abs(player.x+player.w/2-guardX);
 if(dist<C.guardRadius(settings.volume)&&player.y+player.h>C.FLOOR-66){
  if(frame%20===0)playSound(145,.07);
  resetPlayer('감시자에게 들켰어요. 소리를 낮춰 보세요.');
 }
}
function complete(){
 if(ended)return;
 ended=true;Object.keys(keys).forEach(k=>keys[k]=false);
 cleared[stage]=true;unlocked=Math.max(unlocked,Math.min(C.STAGES.length,stage+2));store();
 $('clearTitle').textContent=stage===C.STAGES.length-1?'모든 방을 탈출했어요!':'문이 열렸어요!';
 $('clearCopy').textContent=stage===C.STAGES.length-1?'이제 어떤 설정도 그냥 지나치지 않을 거예요.':'설정을 바꾸자 세상도 달라졌어요. 다음 방에서 새 규칙을 찾아봐요.';
 $('next').textContent=stage===C.STAGES.length-1?'첫 방으로':'다음 방';
 $('status').textContent='탈출 성공';playSound(880,.2);
 window.KidscadeGame?.result?.({scope:'stage',status:'completed',outcome:'clear',stage:stage+101,mode:'settings',score:Object.keys(cleared).length,scoreOptions:{unit:'방',higherIsBetter:true},completed:true});
 if(!clearDialog.open)clearDialog.showModal();
}
function update(dt){
 if(ended||paused||stageDialog.open||clearDialog.open)return;
 frame++;if(noticeTimer>0){noticeTimer-=dt;if(noticeTimer<=0){$('feedback').textContent='';$('boardMessage').textContent=C.STAGES[stage].chapter}}
 movePhysics(dt);advanceShots(dt);advanceGuard();
 if(player.x+player.w>884&&player.y+player.h>C.FLOOR-80){
  if(C.canExit(stage,settings,hits))complete();
  else if(noticeTimer<=0)announce('문이 잠겼어요. 설정을 살펴보세요.',1.2);
 }
}
function roundRect(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function drawBackground(t){
 ctx.fillStyle='#12243b';ctx.fillRect(0,0,C.W,C.H);
 for(let i=0;i<52;i++){
  const x=(i*187+53)%C.W,y=(i*79+27)%325;
  roundRect(x,y,i%4===0?3:2,i%4===0?3:2,0,i%3?'#385171':'#5e7998');
 }
 ctx.fillStyle='#1d3853';ctx.fillRect(0,310,C.W,138);
 for(let i=0;i<13;i++){
  const x=i*82+15,h=40+(i*29)%105;
  ctx.fillStyle=i%3?'#23445e':'#24405b';ctx.fillRect(x,448-h,60,h);
  ctx.fillStyle='#4a6475';for(let y=448-h+13;y<433;y+=22)for(let z=x+12;z<x+50;z+=17)if((Math.round(z+y)%3)!==0)ctx.fillRect(z,y,4,5);
 }
 ctx.fillStyle='#172e44';ctx.fillRect(0,C.FLOOR,C.W,C.H-C.FLOOR);
 sprite('cloud1',110,76,118,54);
 sprite('cloud2',612,112,142,54);
 ctx.strokeStyle='#203e57';ctx.lineWidth=1;for(let x=0;x<C.W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,C.H);ctx.stroke()}
 if(C.STAGES[stage].kind==='dark'||C.STAGES[stage].kind==='final'){
  const alpha=C.clamp((80-settings.brightness)/100,0,.68);
  ctx.fillStyle='rgba(4,9,26,'+alpha+')';ctx.fillRect(0,0,C.W,C.FLOOR);
 }
}
function drawFloor(){
 for(const p of C.floorParts(stage,settings)){
  if(p.w<=0)continue;
  ctx.fillStyle=p.bridge?'#7bdfc7':'#294d5e';ctx.fillRect(p.x,p.y,p.w,p.h);
  ctx.fillStyle=p.bridge?'#bdfcea':'#66af9c';ctx.fillRect(p.x,p.y,p.w,8);
  ctx.fillStyle=p.bridge?'#469e97':'#203f50';
  for(let x=p.x+8;x<p.x+p.w-4;x+=29)ctx.fillRect(x,p.y+20,13,3);
 }
 // Existing Kidscade platformer artwork; visual scenery never changes the collision map.
 sprite('bush',120,C.FLOOR-34,44,35);
 sprite('rock',777,C.FLOOR-34,38,35);
 if(stage===3||stage===4||stage===6){
  ctx.fillStyle='#ec7c70';for(let x=345;x<690;x+=24){
   if(!sprite('spike',x,500,24,26)){ctx.beginPath();ctx.moveTo(x,526);ctx.lineTo(x+12,507);ctx.lineTo(x+24,526);ctx.fill()}
  }
 }
 const gate=obstacle();
 if(gate){roundRect(gate.x,gate.y,gate.w,gate.h,4,'#a65e8d');ctx.fillStyle='#f0b8ce';ctx.fillRect(gate.x+6,gate.y+12,5,45)}
}
function drawGuard(){
 if(!C.isGuardActive(stage,settings))return;
 const x=stage===2?640:810,rad=C.guardRadius(settings.volume);
 ctx.fillStyle='rgba(248,121,107,.1)';ctx.beginPath();ctx.arc(x,420,rad,0,Math.PI*2);ctx.fill();
 ctx.lineWidth=2;ctx.strokeStyle='rgba(248,121,107,.65)';ctx.stroke();
 if(!sprite('guard',x-24,394,48,54)){
  roundRect(x-18,398,36,48,10,'#ce6878');roundRect(x-11,410,22,13,5,'#311e43');
  roundRect(x-5,412,10,4,1,'#fcdbc7');
 }
}
function drawTurret(){
 if(C.STAGES[stage].kind!=='shield')return;
 roundRect(812,384,54,64,7,hits>=2?'#4f8f7a':'#8e5c75');
 roundRect(793,407,32,17,3,hits>=2?'#8bdeb5':'#d7a6b7');
 ctx.fillStyle='#fbe6aa';ctx.font='bold 20px system-ui';ctx.fillText(hits+'/2',818,407);
 for(const b of bullets){
  ctx.fillStyle='#ffcba4';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ff7f79';ctx.fillRect(b.x+10,b.y-4,20,8);
 }
}
function drawExit(t){
 const open=C.canExit(stage,settings,hits);
 roundRect(882,367,54,81,7,open?'#2b9684':'#684c62');
 roundRect(889,376,40,72,5,open?'#9be7cc':'#9a7188');
 roundRect(894,385,30,55,2,open?'#1e584f':'#412a3e');
 ctx.fillStyle=open?'#f9e8ad':'#e3a3ab';ctx.fillRect(915,416,5,5);
 ctx.textAlign='center';ctx.font='bold 13px system-ui';ctx.fillStyle='#f6e1ae';ctx.fillText(open?'EXIT':'LOCK',909,357);
 ctx.textAlign='left';sprite('flag',883,335,31,34);
}
function drawPlayer(){
 if(heroImage.complete&&heroImage.naturalWidth>0){
  try{ctx.drawImage(heroImage,player.x-5,player.y-5,player.w+10,player.h+7);return}catch(_){}
 }
 roundRect(player.x+4,player.y,player.w-8,player.h-2,7,'#f6c77b');
 roundRect(player.x+4,player.y+17,player.w-8,player.h-19,4,'#4b86af');
 ctx.fillStyle='#17273e';ctx.fillRect(player.x+17,player.y+9,4,4);
 ctx.fillStyle='#25324d';ctx.fillRect(player.x+5,player.y+player.h-5,8,5);ctx.fillRect(player.x+18,player.y+player.h-5,8,5);
}
function drawHints(){
 ctx.font='bold 15px system-ui';ctx.fillStyle='#d9e9f0';
 const kind=C.STAGES[stage].kind;
 let caption='';
 if(kind==='dark')caption='밝기 '+settings.brightness+'% · 문 개방 '+(C.canExit(stage,settings,hits)?'완료':'대기');
 else if(kind==='sound')caption='소리 '+settings.volume+'% · 감시 범위';
 else if(kind==='platform')caption='작은 창을 끌어 움직여 보세요';
 else if(kind==='frame'||kind==='final')caption='화면 길이 '+C.bridgeWidth(settings.frame)+'px';
 else if(kind==='shield')caption='방어 '+hits+' / 2';
 else caption='방향키로 출구까지 이동';
 roundRect(17,18,Math.min(545,Math.max(235,ctx.measureText(caption).width+35)),34,9,'rgba(6,22,38,.85)');
 ctx.fillText(caption,32,41);
}
function paint(t){
 ctx.clearRect(0,0,C.W,C.H);drawBackground(t);drawFloor();drawGuard();drawTurret();drawExit(t);drawPlayer();drawHints();
}
function loop(t){
 if(!prev)prev=t;const dt=Math.min(.033,Math.max(0,(t-prev)/1000));prev=t;
 update(dt);paint(t);requestAnimationFrame(loop);
}
function renderStageList(){
 const grid=$('stageGrid');grid.textContent='';
 C.STAGES.forEach((s,i)=>{
  const b=document.createElement('button');b.type='button';b.disabled=i>=unlocked;
  if(cleared[i])b.classList.add('done');
  const title=document.createElement('b'),desc=document.createElement('small');
  title.textContent=String(i+1).padStart(2,'0')+' · '+s.title;
  desc.textContent=i>=unlocked?'앞의 방을 먼저 탈출해요':cleared[i]?'탈출 완료 · 다시 도전 가능':s.chapter;
  b.append(title,desc);
  b.onclick=()=>{stageDialog.close();showStage(i)};
  grid.appendChild(b);
 });
}
function onSettings(){
 for(const k of ['brightness','volume','frame']){
  $(k).addEventListener('input',()=>{settings[k]=Number($(k).value);$(k+'Value').textContent=settings[k]+'%';if(stage===1&&k==='brightness'&&settings[k]>=70)announce('문이 보이기 시작해요!');if(stage===6&&C.canExit(stage,settings,hits))announce('모든 설정이 맞았어요!')});
 }
 $('resetSettings').onclick=()=>{stageSettings();announce('설정을 처음 값으로 돌렸어요.')};
 $('hint').onclick=()=>announce(C.STAGES[stage].tip,5);
 $('chooseStage').onclick=()=>{renderStageList();stageDialog.showModal()};
 $('closeStages').onclick=()=>stageDialog.close();
 $('restart').onclick=()=>showStage(stage);
 $('retry').onclick=()=>showStage(stage);
 $('next').onclick=()=>showStage(stage===C.STAGES.length-1?0:stage+1);
 stageDialog.addEventListener('click',e=>{if(e.target===stageDialog)stageDialog.close()});
}
function bindKeyboard(){
 const isField=t=>t&&(['INPUT','TEXTAREA','SELECT'].includes(t.tagName)||t.isContentEditable);
 window.addEventListener('keydown',e=>{
  if(isField(e.target)||stageDialog.open||clearDialog.open)return;
  if(e.target===$('dragHandle')&&e.key.startsWith('Arrow')){
   e.preventDefault();
   const amt=e.shiftKey?24:12;
   if(e.key==='ArrowLeft')panel.x-=amt;else if(e.key==='ArrowRight')panel.x+=amt;
   else if(e.key==='ArrowUp')panel.y-=amt;else panel.y+=amt;
   panel.x=C.clamp(panel.x,0,C.W-panel.w);panel.y=C.clamp(panel.y,120,C.FLOOR-12);updatePanel();return;
  }
  const key=e.key.toLowerCase();
  if(['arrowleft','a'].includes(key)){keys.left=true;e.preventDefault()}
  if(['arrowright','d'].includes(key)){keys.right=true;e.preventDefault()}
  if([' ','arrowup','w'].includes(key)){if(!keys.jump)tryJump();keys.jump=true;e.preventDefault()}
  if(key==='r'&&!e.repeat){showStage(stage);e.preventDefault()}
 });
 window.addEventListener('keyup',e=>{
  const k=e.key.toLowerCase();
  if(['arrowleft','a'].includes(k))keys.left=false;
  if(['arrowright','d'].includes(k))keys.right=false;
  if([' ','arrowup','w'].includes(k))keys.jump=false;
 });
 window.addEventListener('blur',()=>{Object.keys(keys).forEach(k=>keys[k]=false)});
}
function bindTouchControls(){
 document.querySelectorAll('[data-action]').forEach(b=>{
  const action=b.dataset.action;
  function up(e){if(b.hasPointerCapture?.(e.pointerId))b.releasePointerCapture(e.pointerId);if(action==='jump')keys.jump=false;else keys[action]=false;b.classList.remove('pressed')}
  b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(action==='jump'){keys.jump=true;tryJump()}else keys[action]=true;b.classList.add('pressed')});
  b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',()=>{keys[action]=false;b.classList.remove('pressed')});
 });
}
function bindPanelDrag(){
 const handle=$('dragHandle');
 handle.addEventListener('pointerdown',e=>{
  if(panelEl.hidden)return;
  e.preventDefault();handle.setPointerCapture(e.pointerId);
  const rect=screen.getBoundingClientRect();
  drag={pointer:e.pointerId,offsetX:(e.clientX-rect.left)*C.W/rect.width-panel.x,offsetY:(e.clientY-rect.top)*C.H/rect.height-panel.y};
 });
 handle.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pointer)return;
  e.preventDefault();const rect=screen.getBoundingClientRect();
  panel.x=C.clamp((e.clientX-rect.left)*C.W/rect.width-drag.offsetX,0,C.W-panel.w);
  panel.y=C.clamp((e.clientY-rect.top)*C.H/rect.height-drag.offsetY,120,C.FLOOR-12);
  updatePanel();
 });
 const end=e=>{if(drag?.pointer===e.pointerId)drag=null};
 handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
 handle.addEventListener('lostpointercapture',()=>{drag=null});
}
window.KidscadeGame?.registerPauseHandlers?.({pause(){paused=true;Object.keys(keys).forEach(k=>keys[k]=false)},resume(){paused=false}});
document.addEventListener('visibilitychange',()=>{paused=document.hidden;if(paused)Object.keys(keys).forEach(k=>keys[k]=false)});
loadProgress();onSettings();bindKeyboard();bindTouchControls();bindPanelDrag();showStage(Math.min(C.STAGES.length-1,unlocked-1));requestAnimationFrame(loop);
})();
