(function(){
'use strict';

const W=960,H=540;
const FIELD_W=1500,FIELD_H=840;
const GOAL_HALF=125,GOAL_Y1=FIELD_H/2-GOAL_HALF,GOAL_Y2=FIELD_H/2+GOAL_HALF;
const GOAL_DEPTH=82,GOAL_H=145;
const FIXED=1/120;
const PLAYER_R=23,BALL_R=10;
const BASE_SPEED=245,SPRINT_SPEED=330,AI_SPEED=238,GK_SPEED=215;
const BALL_DRAG=.985,GRAVITY=980;
const PITCH_TOP=67,PITCH_H=418,CAM_ZOOM=.88;
const HOME=0,AWAY=1;
const TEAM_COLOR=['#22c55e','#3b82f6'];
const ROLE_LABEL={GK:'GK · 골키퍼',FIXO:'FIXO · 수비',ALA_TOP:'ALA · 윙',ALA_BOTTOM:'ALA · 윙',PIVOT:'PIVOT · 공격'};
const DIFF={
  easy:{think:.34,error:42,pressure:34,shot:315},
  normal:{think:.19,error:24,pressure:48,shot:355},
  hard:{think:.10,error:11,pressure:62,shot:400}
};

const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d',{alpha:false});
const DPR=Math.min(window.devicePixelRatio||1,2);
canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);
ctx.setTransform(DPR,0,0,DPR,0,0);ctx.imageSmoothingEnabled=true;

const app=document.getElementById('app');
const menu=document.getElementById('menu');
const help=document.getElementById('help');
const pauseLayer=document.getElementById('pauseLayer');
const result=document.getElementById('result');
const scoreEl=document.getElementById('score');
const clockEl=document.getElementById('clock');
const statusEl=document.getElementById('status');
const playerNameEl=document.getElementById('playerName');
const playerRoleEl=document.getElementById('playerRole');
const powerFill=document.getElementById('powerFill');
const difficultyEl=document.getElementById('difficulty');
const assistEl=document.getElementById('assist');
const startBtn=document.getElementById('startBtn');
const pauseBtn=document.getElementById('pauseBtn');

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function lerp(a,b,t){return a+(b-a)*t}
function hypot(x,y){return Math.hypot(x,y)}
function dist(a,b){return hypot(a.x-b.x,a.y-b.y)}
function norm(x,y){const l=hypot(x,y)||1;return{x:x/l,y:y/l}}
function dot(ax,ay,bx,by){return ax*bx+ay*by}
function teamDir(team){return team===HOME?1:-1}
function ownGoalX(team){return team===HOME?0:FIELD_W}
function oppGoalX(team){return team===HOME?FIELD_W:0}
function segmentDistance(px,py,ax,ay,bx,by){
  const abx=bx-ax,aby=by-ay,den=abx*abx+aby*aby||1;
  const t=clamp(((px-ax)*abx+(py-ay)*aby)/den,0,1);
  return hypot(px-(ax+abx*t),py-(ay+aby*t));
}
function formatTime(s){
  s=Math.max(0,Math.ceil(s));
  const m=Math.floor(s/60),r=s%60;
  return String(m).padStart(2,'0')+':'+String(r).padStart(2,'0');
}

const keys=new Set();
const touchHold={up:false,down:false,left:false,right:false,sprint:false,jockey:false};
let charge=null;
let mode='match',difficulty='normal',assist='normal';
let state='menu',paused=false,playing=false;
let score=[0,0],matchTime=180,phaseTimer=0,kickoffTeam=HOME,pendingRestart=null;
let countdownLast=0,kickoffLabel='';
let tutorialStep=0,tutorialMoveTime=0,tutorialFinished=false;
let statusTimer=0,flash=0,shake=0;
let last=0,acc=0,simTime=0;
let cameraX=FIELD_W/2;
let controlled=null,owner=null,intendedReceiver=null;
let pendingPass=null;
let ballFree=0;
let lastTouchTeam=HOME;
let possessionTime=[0,0];
const stats={shots:[0,0],passes:[0,0],passAttempts:[0,0],saves:[0,0]};
let particles=[];

const ball={x:FIELD_W/2,y:FIELD_H/2,z:0,vx:0,vy:0,vz:0,spin:0};

function makePlayer(team,index,role,number,name,x,y){
  return {
    team:team,index:index,role:role,number:number,name:name,
    x:x,y:y,vx:0,vy:0,targetX:x,targetY:y,
    facing:teamDir(team),active:true,
    decision:Math.random()*.15,tackleTimer:0,tackleCooldown:0,
    kickTimer:0,recover:0,stealProtect:0,receiveAssist:0,
    oneTwoTimer:0,oneTwoX:x,oneTwoY:y,keeperHold:0,
    actor:null
  };
}
let teams=[[],[]];

function buildTeams(){
  teams=[
    [
      makePlayer(HOME,0,'GK',1,'새싹 수문장',75,FIELD_H/2),
      makePlayer(HOME,1,'FIXO',4,'초록 방패',330,FIELD_H/2),
      makePlayer(HOME,2,'ALA_TOP',7,'새별',505,225),
      makePlayer(HOME,3,'ALA_BOTTOM',11,'나래',505,615),
      makePlayer(HOME,4,'PIVOT',9,'나',720,FIELD_H/2)
    ],
    [
      makePlayer(AWAY,0,'GK',1,'블루 수문장',FIELD_W-75,FIELD_H/2),
      makePlayer(AWAY,1,'FIXO',4,'푸른 방패',FIELD_W-330,FIELD_H/2),
      makePlayer(AWAY,2,'ALA_TOP',7,'제트',FIELD_W-505,225),
      makePlayer(AWAY,3,'ALA_BOTTOM',11,'루나',FIELD_W-505,615),
      makePlayer(AWAY,4,'PIVOT',9,'스톰',FIELD_W-720,FIELD_H/2)
    ]
  ];
  const all=teams[0].concat(teams[1]);
  all.forEach(function(p){p.actor=new FutsalAvatarActor(p)});
}

function allPlayers(){return teams[0].concat(teams[1]).filter(function(p){return p.active})}
function outfield(team){return teams[team].filter(function(p){return p.active&&p.role!=='GK'})}

function host(){
  try{if(parent&&parent!==window&&parent.location.origin===location.origin)return parent}catch(_){}
  return window;
}
function safe(fn,fallback){try{return fn()}catch(_){return fallback}}
const AVATAR_PREVIEW_KEY='kidscade-avatar-studio-preview';
function avatarFrameApi(){
  const h=host();
  const candidates=[
    safe(function(){return window.KidscadeAvatarShop},null),
    safe(function(){return h.KidscadeAvatarShop},null),
    safe(function(){return h.document&&h.document.getElementById('kidscade-avatar-studio-frame')&&h.document.getElementById('kidscade-avatar-studio-frame').contentWindow.KidscadeAvatarShop},null)
  ];
  return candidates.find(function(api){return api&&typeof api.renderPreviewFrame==='function'})||null;
}
function svgDataUrl(svg){
  if(!svg)return'';
  const m=svg.match(/<image[^>]+href=["']([^"']+)["']/i);
  if(m&&m[1]&&m[1].indexOf('data:image')===0)return m[1];
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function savedAvatarSource(){
  const h=host();
  const saved=safe(function(){return h.localStorage.getItem(AVATAR_PREVIEW_KEY)},'')||safe(function(){return localStorage.getItem(AVATAR_PREVIEW_KEY)},'');
  if(saved&&saved.indexOf('data:image')===0)return saved;
  const svg=safe(function(){return typeof h.renderAvatarSVG==='function'?h.renderAvatarSVG():''},'');
  return svgDataUrl(svg);
}
const SQUAD_KITS=[
  // 씨앗 FC · GK / FIXO / ALA / ALA / PIVOT(사용자)
  {skin:'skin_tan',hair:'hair_spike',top:'top_hoodie',bottom:'bottom_track',head:'head_none',face:'face_none',hand:'hand_none',background:'bg_basic',aura:'aura_none'},
  {skin:'skin_warm',hair:'hair_short',top:'top_soccer',bottom:'bottom_track',head:'head_cap',face:'face_none',hand:'hand_none',background:'bg_basic',aura:'aura_none'},
  {skin:'skin_peach',hair:'hair_bob',top:'top_soccer',bottom:'bottom_shorts',head:'head_none',face:'face_round',hand:'hand_none',background:'bg_basic',aura:'aura_none'},
  {skin:'skin_deep',hair:'hair_curl',top:'top_soccer',bottom:'bottom_shorts',head:'head_beanie',face:'face_none',hand:'hand_none',background:'bg_basic',aura:'aura_none'},
  null,
  // 블루 FC · GK / FIXO / ALA / ALA / PIVOT
  {skin:'skin_deep',hair:'hair_short',top:'top_uniform',bottom:'bottom_track',head:'head_none',face:'face_none',hand:'hand_none',background:'bg_basic',aura:'aura_none'},
  {skin:'skin_tan',hair:'hair_curl',top:'top_soccer',bottom:'bottom_track',head:'head_headphones',face:'face_none',hand:'hand_none',background:'bg_basic',aura:'aura_none'},
  {skin:'skin_peach',hair:'hair_pony',top:'top_soccer',bottom:'bottom_shorts',head:'head_none',face:'face_round',hand:'hand_none',background:'bg_basic',aura:'aura_none'},
  {skin:'skin_warm',hair:'hair_spike',top:'top_soccer',bottom:'bottom_shorts',head:'head_cap',face:'face_none',hand:'hand_none',background:'bg_basic',aura:'aura_none'},
  {skin:'skin_deep',hair:'hair_bob',top:'top_soccer',bottom:'bottom_track',head:'head_beanie',face:'face_none',hand:'hand_none',background:'bg_basic',aura:'aura_none'}
];
const CHARACTER_ROOT='../../assets/game/characters/people/kenney-platformer-characters/';
const FALLBACK_CHARACTER_NAMES=['player','female'];
function squadSlot(p){return p.team*5+p.index}
function fallbackCharacterName(p){return FALLBACK_CHARACTER_NAMES[(squadSlot(p)+p.index)%FALLBACK_CHARACTER_NAMES.length]}
function fallbackPoseSource(p,pose){
  const name=fallbackCharacterName(p);
  const poseName=pose==='walk'?((Math.floor(performance.now()/150)+p.index)%2?'walk1':'walk2'):(pose==='action'?'action1':(pose==='hurt'?'hurt':'stand'));
  return CHARACTER_ROOT+name+'/poses/'+name+'-'+poseName+'.png';
}
function presetSource(p){
  if(p.team===HOME&&p.index===4)return savedAvatarSource();
  const h=host(),equip=SQUAD_KITS[squadSlot(p)];
  const svg=safe(function(){return equip&&typeof h.renderAvatarSVG==='function'?h.renderAvatarSVG(equip):''},'');
  return svgDataUrl(svg);
}
const liveFrameCache=new Map();
function liveAvatarFrame(modeName,now){
  const cached=liveFrameCache.get(modeName);
  if(cached&&now-cached.time<105)return cached.src;
  const api=avatarFrameApi();
  if(!api)return cached?cached.src:'';
  const src=safe(function(){return api.renderPreviewFrame(modeName,now/1000)},'')||'';
  if(src&&src.indexOf('data:image')===0){liveFrameCache.set(modeName,{time:now,src:src});return src}
  return cached?cached.src:'';
}
class FutsalAvatarActor{
  constructor(p){
    this.p=p;this.img=new Image();this.img.decoding='async';this.ready=false;this.src='';
    this.lastCapture=0;this.lastStatic=0;
    this.img.onload=()=>{this.ready=true};
    this.img.onerror=()=>{this.ready=false};
    this.refresh(true);
  }
  setSource(src){
    if(!src||src===this.src)return;
    this.src=src;this.ready=false;this.img.src=src;
  }
  refresh(force){
    const now=performance.now();
    if(!force&&now-this.lastStatic<1400)return;
    this.lastStatic=now;this.setSource(presetSource(this.p));
  }
  capture(modeName,now){
    if(!(this.p.team===HOME&&this.p.index===4))return false;
    if(now-this.lastCapture<115)return false;
    this.lastCapture=now;
    const src=liveAvatarFrame(modeName,now);
    if(src){this.setSource(src);return true}
    return false;
  }
  render(q){
    const p=this.p,now=performance.now();
    let modeName='idle';
    if(p.kickTimer>0||p.tackleTimer>0)modeName='smile';
    else if(hypot(p.vx,p.vy)>38)modeName='walk';
    if(!this.capture(modeName,now))this.refresh(false);
    const speed=hypot(p.vx,p.vy);
    const runPhase=now/95+p.index*.7+p.team*.4;
    const bob=speed>30?Math.sin(runPhase)*2.0:Math.sin(now/700+p.index)*.35;
    const actionLean=p.kickTimer>0?p.facing*-.12:(p.tackleTimer>0?p.facing*.26:clamp(p.vx/3200,-.07,.07));
    const baseH=78*q.s;
    const shadowW=20*q.s;
    ctx.save();
    ctx.fillStyle='rgba(2,6,23,.30)';
    ctx.beginPath();ctx.ellipse(q.x,q.y+4,shadowW,6*q.s,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=TEAM_COLOR[p.team];ctx.lineWidth=p===controlled?4:2;
    ctx.globalAlpha=p===controlled?1:.82;
    ctx.beginPath();ctx.ellipse(q.x,q.y+3,24*q.s,9*q.s,0,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=1;
    if(this.ready&&this.img.naturalWidth){
      const ratio=this.img.naturalWidth/Math.max(1,this.img.naturalHeight);
      const drawH=baseH*(p.tackleTimer>0?.82:1);
      const drawW=drawH*ratio*(p.tackleTimer>0?1.12:1);
      ctx.translate(q.x,q.y+bob);
      ctx.rotate(actionLean);
      ctx.scale(p.facing>=0?1:-1,1);
      ctx.drawImage(this.img,-drawW/2,-drawH*.91,drawW,drawH);
    }else{
      ctx.fillStyle=TEAM_COLOR[p.team];ctx.beginPath();ctx.arc(q.x,q.y-23*q.s,18*q.s,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    ctx.save();
    const by=q.y-55*q.s;
    ctx.fillStyle=TEAM_COLOR[p.team];
    ctx.beginPath();ctx.arc(q.x,by,10,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.95)';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#fff';ctx.font='900 10px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(p.number),q.x,by+.5);
    if(state==='countdown'&&owner===p){
      ctx.font='1000 11px system-ui';ctx.fillStyle='#fef08a';ctx.fillText('KICKOFF',q.x,by-43);
    }
    if(p===controlled){
      ctx.fillStyle='#facc15';ctx.beginPath();ctx.moveTo(q.x,by-20);ctx.lineTo(q.x-7,by-31);ctx.lineTo(q.x+7,by-31);ctx.closePath();ctx.fill();
    }else if(p===switchHint()){
      ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(q.x,by-18);ctx.lineTo(q.x-6,by-27);ctx.lineTo(q.x+6,by-27);ctx.closePath();ctx.stroke();
    }
    ctx.restore();
  }
}

const ballImg=new Image();
ballImg.src='../../assets/game/2d/sports/equipment/ball_soccer1.png';
const audioDefs={
  kick:['../../assets/audio/sfx/combat/projectile-whoosh-01.mp3',.08],
  tackle:['../../assets/audio/sfx/combat/impact-heavy-01.mp3',.11],
  goal:['../../assets/audio/sfx/success/cheer-yay-01.mp3',.28],
  save:['../../assets/audio/sfx/combat/impact-heavy-01.mp3',.09]
};
const audioPools={};
Object.keys(audioDefs).forEach(function(k){
  const d=audioDefs[k];
  audioPools[k]={i:0,a:Array.from({length:4},function(){const a=new Audio(d[0]);a.preload='auto';a.volume=d[1];return a})};
});
function muted(){
  const sdk=window.KidscadeGame;
  return !!(sdk&&sdk.state&&sdk.state().muted);
}
function sound(name,rate){
  if(muted())return;
  const pool=audioPools[name];if(!pool)return;
  const a=pool.a[pool.i++%pool.a.length];
  try{a.pause();a.currentTime=0;a.playbackRate=rate||1;a.play().catch(function(){})}catch(_){}
}
let webAudio=null;
function audioContext(){
  if(webAudio)return webAudio;
  const C=window.AudioContext||window.webkitAudioContext;
  if(!C)return null;
  try{webAudio=new C();return webAudio}catch(_){return null}
}
function wakeAudio(){
  const ac=audioContext();if(ac&&ac.state==='suspended')ac.resume().catch(function(){});
}
function tone(freq,duration,delay,type,volume,endFreq){
  if(muted())return;
  const ac=audioContext();if(!ac)return;
  const t=ac.currentTime+(delay||0),osc=ac.createOscillator(),gain=ac.createGain();
  osc.type=type||'sine';osc.frequency.setValueAtTime(freq,t);
  if(endFreq)osc.frequency.exponentialRampToValueAtTime(Math.max(30,endFreq),t+duration);
  gain.gain.setValueAtTime(.0001,t);
  gain.gain.exponentialRampToValueAtTime(volume||.04,t+.008);
  gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
  osc.connect(gain);gain.connect(ac.destination);osc.start(t);osc.stop(t+duration+.03);
}
function noiseBurst(duration,volume){
  if(muted())return;
  const ac=audioContext();if(!ac)return;
  const len=Math.max(1,Math.floor(ac.sampleRate*duration)),buffer=ac.createBuffer(1,len,ac.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*(1-i/len);
  const src=ac.createBufferSource(),gain=ac.createGain(),filter=ac.createBiquadFilter();
  filter.type='lowpass';filter.frequency.value=720;
  gain.gain.setValueAtTime(volume||.025,ac.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+duration);
  src.buffer=buffer;src.connect(filter);filter.connect(gain);gain.connect(ac.destination);src.start();
}
function countdownBeep(n){tone(n===1?740:620,.12,0,'sine',.055,n===1?860:690)}
function whistle(){
  tone(1850,.20,0,'sine',.052,2350);
  tone(2280,.24,.13,'sine',.045,1900);
  noiseBurst(.18,.012);
}
function finalWhistle(){
  whistle();
  tone(2050,.20,.38,'sine',.045,2420);
}
function kickThump(power){
  tone(105+(power||.5)*28,.075,0,'triangle',.045,65);
  noiseBurst(.055,.014);
}
function postClang(){
  tone(980,.16,0,'triangle',.045,620);
  tone(1450,.11,.02,'sine',.025,900);
}

function project(x,y,z){
  const t=clamp(y/FIELD_H,0,1);
  const s=(.76+.38*t)*CAM_ZOOM;
  return {x:W/2+(x-cameraX)*s,y:PITCH_TOP+t*PITCH_H-(z||0)*.40*s,s:s};
}
function worldPath(points,close){
  ctx.beginPath();
  points.forEach(function(p,i){const q=project(p.x,p.y,p.z||0);if(i===0)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y)});
  if(close!==false)ctx.closePath();
}
function drawPitch(){
  const sky=ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#07111d');sky.addColorStop(1,'#0c2533');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);

  ctx.fillStyle='#0f2b1d';
  worldPath([{x:-120,y:-45},{x:FIELD_W+120,y:-45},{x:FIELD_W+120,y:FIELD_H+55},{x:-120,y:FIELD_H+55}]);
  ctx.fill();

  const stripes=12,sw=FIELD_W/stripes;
  for(let i=0;i<stripes;i++){
    ctx.fillStyle=i%2===0?'#27884a':'#238044';
    worldPath([{x:i*sw,y:0},{x:(i+1)*sw,y:0},{x:(i+1)*sw,y:FIELD_H},{x:i*sw,y:FIELD_H}]);
    ctx.fill();
  }

  ctx.strokeStyle='rgba(255,255,255,.88)';ctx.lineWidth=2;
  worldPath([{x:0,y:0},{x:FIELD_W,y:0},{x:FIELD_W,y:FIELD_H},{x:0,y:FIELD_H}]);ctx.stroke();

  worldPath([{x:FIELD_W/2,y:0},{x:FIELD_W/2,y:FIELD_H}],false);ctx.stroke();

  const circle=[];
  for(let i=0;i<=40;i++){const a=i/40*Math.PI*2;circle.push({x:FIELD_W/2+105*Math.cos(a),y:FIELD_H/2+105*Math.sin(a)})}
  worldPath(circle);ctx.stroke();
  const c=project(FIELD_W/2,FIELD_H/2);
  ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.arc(c.x,c.y,3,0,Math.PI*2);ctx.fill();

  drawBox(HOME);drawBox(AWAY);drawGoal(HOME);drawGoal(AWAY);

  const centerTop=project(FIELD_W/2,0),centerBot=project(FIELD_W/2,FIELD_H);
  ctx.fillStyle='rgba(255,255,255,.12)';
  ctx.fillRect(0,Math.max(0,centerTop.y-38),W,20);
  ctx.fillStyle='rgba(255,255,255,.42)';ctx.font='800 11px system-ui';ctx.textAlign='center';
  ctx.fillText('KIDSCADE FUTSAL ARENA',W/2,Math.max(14,centerTop.y-24));
  if(centerBot.y<H-8){
    ctx.fillStyle='rgba(2,6,23,.2)';ctx.fillRect(0,centerBot.y+5,W,H-centerBot.y);
  }
}
function drawBox(team){
  const x0=team===HOME?0:FIELD_W-185,x1=team===HOME?185:FIELD_W;
  const y0=FIELD_H/2-235,y1=FIELD_H/2+235;
  ctx.strokeStyle='rgba(255,255,255,.78)';ctx.lineWidth=2;
  worldPath([{x:x0,y:y0},{x:x1,y:y0},{x:x1,y:y1},{x:x0,y:y1}]);ctx.stroke();
  const spot=project(team===HOME?120:FIELD_W-120,FIELD_H/2);
  ctx.fillStyle='rgba(255,255,255,.88)';ctx.beginPath();ctx.arc(spot.x,spot.y,3,0,Math.PI*2);ctx.fill();
}
function drawGoal(team){
  const lineX=team===HOME?0:FIELD_W;
  const backX=team===HOME?-GOAL_DEPTH:FIELD_W+GOAL_DEPTH;
  const q1=project(lineX,GOAL_Y1),q2=project(lineX,GOAL_Y2);
  const b1=project(backX,GOAL_Y1),b2=project(backX,GOAL_Y2);
  ctx.save();
  ctx.strokeStyle='rgba(226,232,240,.85)';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(q1.x,q1.y);ctx.lineTo(b1.x,b1.y);ctx.lineTo(b2.x,b2.y);ctx.lineTo(q2.x,q2.y);ctx.stroke();
  ctx.strokeStyle='rgba(226,232,240,.32)';ctx.lineWidth=1;
  for(let i=1;i<5;i++){
    const t=i/5;
    const a=project(lerp(lineX,backX,t),GOAL_Y1),b=project(lerp(lineX,backX,t),GOAL_Y2);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  ctx.strokeStyle='#f8fafc';ctx.lineWidth=5;
  ctx.beginPath();ctx.moveTo(q1.x,q1.y);ctx.lineTo(q2.x,q2.y);ctx.stroke();
  ctx.restore();
}
function drawBall(){
  const q=project(ball.x,ball.y,ball.z);
  const ground=project(ball.x,ball.y,0);
  ctx.save();
  ctx.fillStyle='rgba(2,6,23,.34)';ctx.beginPath();ctx.ellipse(ground.x,ground.y+3,11*q.s,5*q.s,0,0,Math.PI*2);ctx.fill();
  const r=13*q.s;
  if(ballImg.complete&&ballImg.naturalWidth)ctx.drawImage(ballImg,q.x-r,q.y-r,r*2,r*2);
  else{ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(q.x,q.y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#111827';ctx.lineWidth=2;ctx.stroke()}
  ctx.restore();
}
function drawParticles(){
  particles.forEach(function(pt){
    const q=project(pt.x,pt.y,pt.z);
    ctx.globalAlpha=clamp(pt.life/.6,0,1);ctx.fillStyle=pt.color;
    ctx.beginPath();ctx.arc(q.x,q.y,pt.size*q.s,0,Math.PI*2);ctx.fill();
  });
  ctx.globalAlpha=1;
}
function tutorialMessage(){
  if(mode!=='tutorial'||tutorialStep>=4)return'';
  if(tutorialStep===0)return'① 방향키로 움직여 보세요 · E를 누르면 질주합니다';
  if(tutorialStep===1)return'② 공을 잡고 S를 눌렀다 떼어 동료에게 패스하세요';
  if(tutorialStep===2)return'③ 공을 잡고 W로 앞 공간에 스루패스를 해보세요';
  return'④ 마지막! 공을 잡고 D를 눌렀다 떼어 슛하세요';
}
function advanceTutorial(kind){
  if(mode!=='tutorial'||tutorialStep>=4)return;
  if(tutorialStep===0&&kind==='move')tutorialStep=1;
  else if(tutorialStep===1&&kind==='pass')tutorialStep=2;
  else if(tutorialStep===2&&kind==='through')tutorialStep=3;
  else if(tutorialStep===3&&kind==='shot'){
    tutorialStep=4;tutorialFinished=true;
    try{localStorage.setItem('seedFutsalTutorialDone','1')}catch(_){}
    showStatus('튜토리얼 완료! 이제 자유롭게 경기해 보세요',3);
  }else return;
  countdownBeep(2);
}
function drawTutorialCoach(){
  const msg=tutorialMessage();if(!msg)return;
  ctx.save();
  ctx.font='900 15px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  const width=Math.min(690,ctx.measureText(msg).width+42);
  ctx.fillStyle='rgba(2,6,23,.84)';ctx.strokeStyle='rgba(250,204,21,.55)';ctx.lineWidth=2;
  const x=(W-width)/2,y=H-59,h=38,r=16;
  ctx.beginPath();ctx.roundRect(x,y,width,h,r);ctx.fill();ctx.stroke();
  ctx.fillStyle='#fff';ctx.fillText(msg,W/2,y+h/2);
  ctx.restore();
}
function drawCountdown(){
  if(state!=='countdown')return;
  const intro=phaseTimer>3;
  const main=intro?(kickoffLabel+' 킥오프'):String(Math.max(1,Math.ceil(phaseTimer)));
  const sub=intro?'센터서클의 공을 가진 선수가 먼저 시작합니다':'휘슬이 울리면 시작!';
  ctx.save();ctx.fillStyle='rgba(2,6,23,.30)';ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#fff';ctx.font=intro?'1000 38px system-ui':'1000 108px system-ui';
  ctx.shadowColor='rgba(0,0,0,.7)';ctx.shadowBlur=20;ctx.fillText(main,W/2,H/2-14);
  ctx.shadowBlur=0;ctx.font='900 15px system-ui';ctx.fillStyle='#fde68a';ctx.fillText(sub,W/2,H/2+58);
  ctx.restore();
}
function render(){
  const dx=shake>0?(Math.random()-.5)*shake:0,dy=shake>0?(Math.random()-.5)*shake*.45:0;
  ctx.save();ctx.translate(dx,dy);
  drawPitch();
  const drawables=[];
  allPlayers().forEach(function(p){drawables.push({d:p.y,fn:function(){p.actor.render(project(p.x,p.y,0))}})});
  drawables.push({d:ball.y+.5,fn:drawBall});
  drawables.sort(function(a,b){return a.d-b.d});
  drawables.forEach(function(x){x.fn()});
  drawParticles();
  ctx.restore();

  if(state==='restart'||state==='goal'){
    ctx.save();ctx.fillStyle='rgba(2,6,23,.52)';ctx.fillRect(0,218,W,74);
    ctx.fillStyle='#fff';ctx.font='1000 31px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(statusEl.dataset.banner||'',W/2,255);ctx.restore();
  }
  drawCountdown();
  drawTutorialCoach();
}

function inputVector(){
  let x=0,y=0;
  if(keys.has('ArrowLeft')||touchHold.left)x--;
  if(keys.has('ArrowRight')||touchHold.right)x++;
  if(keys.has('ArrowUp')||touchHold.up)y--;
  if(keys.has('ArrowDown')||touchHold.down)y++;
  if(!x&&!y)return{x:0,y:0};
  return norm(x,y);
}
function sprintHeld(){return keys.has('KeyE')||touchHold.sprint}
function jockeyHeld(){return keys.has('KeyC')||touchHold.jockey}

function moveToward(p,dx,dy,speed,dt,accel){
  const n=(dx||dy)?norm(dx,dy):{x:0,y:0};
  const tvx=n.x*speed,tvy=n.y*speed;
  const a=(accel||900)*dt;
  p.vx+=clamp(tvx-p.vx,-a,a);
  p.vy+=clamp(tvy-p.vy,-a,a);
  if(!dx&&!dy){p.vx*=Math.pow(.02,dt);p.vy*=Math.pow(.02,dt)}
}
function updateControlled(dt){
  if(!controlled||!controlled.active||controlled.role==='GK')return;
  const v=inputVector();
  let speed=sprintHeld()?SPRINT_SPEED:BASE_SPEED;
  if(jockeyHeld())speed*=.63;
  let dx=v.x,dy=v.y;
  if(controlled.receiveAssist>0&&owner===null&&intendedReceiver===controlled&&ball.z<60){
    const to=norm(ball.x-controlled.x,ball.y-controlled.y);
    const weight=(Math.abs(v.x)+Math.abs(v.y))?0.28:0.78;
    dx=lerp(dx,to.x,weight);dy=lerp(dy,to.y,weight);
  }
  moveToward(controlled,dx,dy,speed,dt,1050);
  if(Math.abs(v.x)>.1)controlled.facing=v.x>0?1:-1;
}

function formationTarget(p,attacking){
  const dir=teamDir(p.team),gx=ownGoalX(p.team);
  const bx=owner?owner.x:ball.x,by=owner?owner.y:ball.y;
  let x=p.x,y=p.y;
  if(p.role==='FIXO'){
    x=attacking?bx-dir*285:gx+dir*280;
    y=FIELD_H/2+(by-FIELD_H/2)*(attacking?.18:.35);
  }else if(p.role==='ALA_TOP'){
    x=attacking?bx+dir*15:gx+dir*455;
    y=210+(by-FIELD_H/2)*.10;
  }else if(p.role==='ALA_BOTTOM'){
    x=attacking?bx+dir*15:gx+dir*455;
    y=630+(by-FIELD_H/2)*.10;
  }else if(p.role==='PIVOT'){
    x=attacking?bx+dir*265:gx+dir*585;
    y=FIELD_H/2+(by-FIELD_H/2)*.23;
  }
  return{x:clamp(x,85,FIELD_W-85),y:clamp(y,90,FIELD_H-90)};
}
function nearestOutfield(team,point){
  let best=null,bd=Infinity;
  outfield(team).forEach(function(p){const d=dist(p,point);if(d<bd){bd=d;best=p}});
  return best;
}
function nearestOpponentDistance(p){
  let d=Infinity;
  teams[1-p.team].forEach(function(o){if(o.active)d=Math.min(d,dist(p,o))});
  return d;
}
function laneRisk(p,target){
  let risk=0;
  teams[1-p.team].forEach(function(o){
    if(!o.active)return;
    const d=segmentDistance(o.x,o.y,p.x,p.y,target.x,target.y);
    if(d<110)risk=Math.max(risk,(110-d)/110);
  });
  return risk;
}
function bestPassTarget(p,aim,type){
  const teammates=outfield(p.team).filter(function(t){return t!==p});
  let best=null,bestScore=-999;
  const assistThreshold=assist==='high'?-0.15:(assist==='low'?.30:.05);
  teammates.forEach(function(t){
    const dx=t.x-p.x,dy=t.y-p.y,d=hypot(dx,dy);
    if(d<45||d>720)return;
    const n=norm(dx,dy),alignment=dot(aim.x,aim.y,n.x,n.y);
    if(alignment<assistThreshold)return;
    const progress=(t.x-p.x)*teamDir(p.team)/FIELD_W;
    const open=clamp(nearestOpponentDistance(t)/180,0,1);
    const risk=laneRisk(p,t);
    let s=alignment*2.2+progress*.9+open*.55-risk*1.4-d/1100;
    if(type==='through')s+=progress*.85+(Math.abs(t.vx)>45?.16:0);
    if(type==='lob')s+=d/800-risk*.4;
    if(s>bestScore){bestScore=s;best=t}
  });
  return best;
}
function aiPassTarget(p){
  const dir=teamDir(p.team);
  return bestPassTarget(p,{x:dir,y:(FIELD_H/2-p.y)/FIELD_H*.25},'pass');
}

function kickBall(p,target,speed,vz,kind,receiver){
  const d=norm(target.x-p.x,target.y-p.y);
  owner=null;
  ball.x=p.x+d.x*27;ball.y=p.y+d.y*27;ball.z=10;
  ball.vx=d.x*speed;ball.vy=d.y*speed;ball.vz=vz||0;
  ballFree=.11;lastTouchTeam=p.team;
  p.kickTimer=.18;
  intendedReceiver=receiver||null;
  pendingPass=(kind==='pass'||kind==='through'||kind==='lob')?{team:p.team,passer:p,receiver:receiver,life:2.4}:null;
  if(kind==='shot'){stats.shots[p.team]++;intendedReceiver=null;pendingPass=null}
  sound('kick',kind==='shot'?1.12:(kind==='lob'?.92:1));
  kickThump(clamp((speed-500)/650,0,1));
  for(let i=0;i<5;i++)particles.push({x:ball.x,y:ball.y,z:6+Math.random()*8,vx:(Math.random()-.5)*45,vy:(Math.random()-.5)*45,vz:40+Math.random()*35,life:.35+Math.random()*.2,size:2+Math.random()*2,color:'rgba(255,255,255,.8)'});
}
function performPass(type,power,isOneTwo,actor){
  const p=actor||controlled;if(!p||owner!==p)return;
  const input=inputVector(),dir=teamDir(p.team);
  const aim=(input.x||input.y)?input:{x:p.facing||dir,y:0};
  const receiver=bestPassTarget(p,aim,type);
  let target;
  if(receiver){
    target={x:receiver.x,y:receiver.y};
    if(type==='through'){
      target.x+=receiver.vx*.48+dir*(75+power*105);
      target.y+=receiver.vy*.42;
    }
  }else target={x:p.x+aim.x*520,y:p.y+aim.y*520};
  target.x=clamp(target.x,-80,FIELD_W+80);target.y=clamp(target.y,15,FIELD_H-15);
  let speed=520+power*235,vz=0;
  if(type==='through')speed=625+power*270;
  if(type==='lob'){speed=545+power*180;vz=290+power*175}
  stats.passAttempts[p.team]++;
  kickBall(p,target,speed,vz,type,receiver);
  if(p.team===HOME&&receiver&&receiver.role!=='GK'){
    controlled=receiver;receiver.receiveAssist=.72;
  }
  if(mode==='tutorial'&&p.team===HOME){
    if(type==='pass')advanceTutorial('pass');
    else if(type==='through')advanceTutorial('through');
  }
  if(isOneTwo&&receiver){
    p.oneTwoTimer=1.85;
    p.oneTwoX=clamp(p.x+dir*300,80,FIELD_W-80);
    p.oneTwoY=clamp(p.y+(FIELD_H/2-p.y)*.18,80,FIELD_H-80);
    showStatus('원투! 패서가 다시 침투합니다',1.1);
  }
}
function performShot(power,actor){
  const p=actor||controlled;if(!p||owner!==p)return;
  const dir=teamDir(p.team),v=inputVector();
  const targetY=clamp(FIELD_H/2+v.y*105,GOAL_Y1+18,GOAL_Y2-18);
  const error=p.team===AWAY?((Math.random()-.5)*DIFF[difficulty].error):0;
  kickBall(p,{x:oppGoalX(p.team)+dir*45,y:targetY+error},790+power*355,75+power*95,'shot',null);
  if(mode==='tutorial'&&p.team===HOME)advanceTutorial('shot');
}
function aiKickPass(p,type){
  const receiver=aiPassTarget(p);if(!receiver)return false;
  let target={x:receiver.x,y:receiver.y};
  if(type==='through')target.x+=teamDir(p.team)*105+receiver.vx*.35;
  const err=(Math.random()-.5)*DIFF[difficulty].error;
  target.y+=err;
  stats.passAttempts[p.team]++;
  kickBall(p,target,type==='through'?760:625,0,type,receiver);
  return true;
}
function aiShoot(p){
  const err=(Math.random()-.5)*DIFF[difficulty].error;
  kickBall(p,{x:oppGoalX(p.team)+teamDir(p.team)*40,y:clamp(FIELD_H/2+err,GOAL_Y1+16,GOAL_Y2-16)},870+Math.random()*120,80+Math.random()*80,'shot',null);
}

function givePossession(p){
  if(!p||!p.active)return;
  if(pendingPass){
    if(p.team===pendingPass.team&&(!pendingPass.receiver||p===pendingPass.receiver))stats.passes[p.team]++;
    pendingPass=null;
  }
  owner=p;lastTouchTeam=p.team;intendedReceiver=null;ballFree=0;
  ball.z=0;ball.vz=0;ball.vx=p.vx;ball.vy=p.vy;
  p.stealProtect=.34;
  if(p.team===HOME&&p.role!=='GK')controlled=p;
  if(p.role==='GK')p.keeperHold=.65;
}
function tryTackle(p){
  if(!p||p.tackleCooldown>0||p.recover>0)return;
  p.tackleTimer=.22;p.tackleCooldown=.72;
  const target=owner;
  if(!target||target.team===p.team)return;
  const d=dist(p,target);
  const to=norm(target.x-p.x,target.y-p.y);
  p.vx+=to.x*125;p.vy+=to.y*125;
  if(d<48&&target.stealProtect<=0){
    const facingBonus=dot(to.x,to.y,p.facing,0)>.15?.12:0;
    const chance=clamp(.66+(48-d)/100+facingBonus,0,1);
    if(Math.random()<chance){
      target.recover=.28;givePossession(p);p.stealProtect=.5;
      sound('tackle',.92);showStatus('공을 빼앗았습니다!',.7);
    }else p.recover=.34;
  }
}

function predictedBallPoint(){
  const t=.28;
  return{x:clamp(ball.x+ball.vx*t,0,FIELD_W),y:clamp(ball.y+ball.vy*t,0,FIELD_H)};
}
function switchHint(){
  if(!controlled||owner&&owner.team===HOME)return null;
  const point=owner&&owner.team===AWAY?{x:owner.x+teamDir(owner.team)*65,y:owner.y}:predictedBallPoint();
  const list=outfield(HOME).slice().sort(function(a,b){return dist(a,point)-dist(b,point)});
  if(!list.length)return null;
  return list[0]===controlled?(list[1]||list[0]):list[0];
}
function switchPlayer(){
  const next=switchHint();if(next){controlled=next;showStatus('선수 전환 · '+next.number+' '+next.name,.45)}
}

function updateKeeper(p,dt){
  const dir=teamDir(p.team),gx=ownGoalX(p.team);
  let tx=gx+dir*64,ty=clamp(ball.y,GOAL_Y1+28,GOAL_Y2-28);
  const ballInBox=p.team===HOME?ball.x<220:ball.x>FIELD_W-220;
  if(owner===p){
    moveToward(p,0,0,0,dt,700);
    p.keeperHold-=dt;
    if(p.keeperHold<=0){
      const receiver=aiPassTarget(p)||outfield(p.team)[0];
      if(receiver){stats.passAttempts[p.team]++;kickBall(p,receiver,600,40,'pass',receiver)}
    }
    return;
  }
  if(owner&&owner.team!==p.team&&ballInBox&&dist(p,owner)<170){tx=owner.x;ty=owner.y}
  else if(!owner&&ballInBox&&ball.z<58){tx=ball.x;ty=ball.y}
  moveToward(p,tx-p.x,ty-p.y,GK_SPEED,dt,880);
  if(!owner&&ballFree<=0&&ball.z<68&&dist(p,ball)<42){
    const speed=hypot(ball.vx,ball.vy);
    if(speed>590){
      stats.saves[p.team]++;
      const away=teamDir(p.team);
      ball.vx=away*(300+Math.random()*140);
      ball.vy+=(ball.y-p.y)*4+(Math.random()-.5)*120;
      ball.vz=Math.max(ball.vz,120);
      ballFree=.16;lastTouchTeam=p.team;
      sound('save',1.05);showStatus('골키퍼 선방!',.75);
      shake=Math.max(shake,3);
    }else givePossession(p);
  }
}
function aiCarrier(p,dt){
  const dir=teamDir(p.team);
  p.decision-=dt;
  if(p.decision<=0){
    p.decision=DIFF[difficulty].think*(.85+Math.random()*.45);
    const goalDist=Math.abs(oppGoalX(p.team)-p.x);
    const pressure=nearestOpponentDistance(p);
    if(goalDist<DIFF[difficulty].shot&&Math.abs(p.y-FIELD_H/2)<255){aiShoot(p);return}
    if(pressure<DIFF[difficulty].pressure+55){
      if(aiKickPass(p,Math.random()<.34?'through':'pass'))return;
    }else if(Math.random()<.22&&goalDist<700){
      if(aiKickPass(p,'through'))return;
    }
  }
  const centerPull=(FIELD_H/2-p.y)*.34;
  const lane=(Math.sin(simTime*.8+p.index*2.1))*75;
  moveToward(p,dir,clamp((centerPull+lane)/260,-.55,.55),AI_SPEED,dt,780);
  p.facing=dir;
}
function updateAIPlayer(p,dt){
  if(!p.active||p.role==='GK'||p===controlled)return;
  if(p.oneTwoTimer>0){
    moveToward(p,p.oneTwoX-p.x,p.oneTwoY-p.y,AI_SPEED+25,dt,820);
    return;
  }
  if(owner===p){aiCarrier(p,dt);return}
  const hasBall=owner&&owner.team===p.team;
  const loose=!owner;
  if(loose){
    const chaser=nearestOutfield(p.team,ball);
    if(chaser===p&&ball.z<95){moveToward(p,ball.x-p.x,ball.y-p.y,AI_SPEED+18,dt,850);return}
  }
  if(owner&&owner.team!==p.team){
    const presser=nearestOutfield(p.team,owner);
    if(presser===p){
      moveToward(p,owner.x-p.x,owner.y-p.y,AI_SPEED+18,dt,860);
      p.facing=owner.x>p.x?1:-1;
      if(dist(p,owner)<38&&p.tackleCooldown<=0)tryTackle(p);
      return;
    }
  }
  const target=formationTarget(p,!!hasBall);
  moveToward(p,target.x-p.x,target.y-p.y,AI_SPEED,dt,720);
  p.facing=hasBall?teamDir(p.team):(ball.x>p.x?1:-1);
}

function updatePlayers(dt){
  updateControlled(dt);
  teams[HOME].forEach(function(p){if(p.role==='GK')updateKeeper(p,dt);else updateAIPlayer(p,dt)});
  teams[AWAY].forEach(function(p){if(p.role==='GK')updateKeeper(p,dt);else updateAIPlayer(p,dt)});

  allPlayers().forEach(function(p){
    p.x+=p.vx*dt;p.y+=p.vy*dt;
    p.x=clamp(p.x,18,FIELD_W-18);p.y=clamp(p.y,18,FIELD_H-18);
    p.tackleTimer=Math.max(0,p.tackleTimer-dt);
    p.tackleCooldown=Math.max(0,p.tackleCooldown-dt);
    p.kickTimer=Math.max(0,p.kickTimer-dt);
    p.recover=Math.max(0,p.recover-dt);
    p.stealProtect=Math.max(0,p.stealProtect-dt);
    p.receiveAssist=Math.max(0,p.receiveAssist-dt);
    p.oneTwoTimer=Math.max(0,p.oneTwoTimer-dt);
  });

  const ps=allPlayers();
  for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
    const a=ps[i],b=ps[j],dx=b.x-a.x,dy=b.y-a.y,d=hypot(dx,dy),min=PLAYER_R*1.52;
    if(d>0&&d<min){
      const push=(min-d)*.5,nx=dx/d,ny=dy/d;
      if(a.role!=='GK'){a.x-=nx*push;a.y-=ny*push}
      if(b.role!=='GK'){b.x+=nx*push;b.y+=ny*push}
    }
  }
  ps.forEach(function(p){p.x=clamp(p.x,18,FIELD_W-18);p.y=clamp(p.y,18,FIELD_H-18)});
}
function updateOwnedBall(dt){
  const p=owner;if(!p)return;
  const sp=hypot(p.vx,p.vy),lead=22+clamp(sp/SPRINT_SPEED,0,1)*10;
  const mv=sp>25?norm(p.vx,p.vy):{x:p.facing,y:0};
  const tx=p.x+mv.x*lead,ty=p.y+mv.y*lead;
  ball.x=lerp(ball.x,tx,clamp(dt*16,0,1));
  ball.y=lerp(ball.y,ty,clamp(dt*16,0,1));
  ball.z=0;ball.vx=p.vx;ball.vy=p.vy;ball.vz=0;
}
function tryGather(){
  if(owner||ballFree>0||ball.z>52)return;
  const ps=allPlayers().slice().sort(function(a,b){return dist(a,ball)-dist(b,ball)});
  if(intendedReceiver&&intendedReceiver.active&&dist(intendedReceiver,ball)<36){
    const receiverDist=dist(intendedReceiver,ball),nearestDist=ps.length?dist(ps[0],ball):Infinity;
    if(receiverDist<=nearestDist+5){givePossession(intendedReceiver);return}
  }
  for(let i=0;i<ps.length;i++){
    const p=ps[i],r=p.role==='GK'?41:29;
    if(dist(p,ball)<r){givePossession(p);return}
  }
}
function updateLooseBall(dt){
  ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.z+=ball.vz*dt;
  ball.vz-=GRAVITY*dt;
  const drag=Math.pow(BALL_DRAG,dt*60);ball.vx*=drag;ball.vy*=drag;
  if(ball.z<=0){
    ball.z=0;
    if(ball.vz<0){ball.vz=-ball.vz*.38;if(Math.abs(ball.vz)<48)ball.vz=0}
    ball.vx*=Math.pow(.975,dt*60);ball.vy*=Math.pow(.975,dt*60);
  }
  tryGather();
}
function scoreGoal(team){
  score[team]++;sound('goal',1);shake=8;flash=.45;
  owner=null;intendedReceiver=null;pendingPass=null;
  ball.vx=ball.vy=ball.vz=0;
  state='goal';phaseTimer=1.65;kickoffTeam=1-team;
  statusEl.dataset.banner='골!  '+score[0]+' : '+score[1];
  showStatus(team===HOME?'씨앗 FC 골!':'블루 FC 골!',1.6);
  for(let i=0;i<34;i++)particles.push({x:team===HOME?FIELD_W-40:40,y:FIELD_H/2+(Math.random()-.5)*210,z:20+Math.random()*110,vx:(Math.random()-.5)*160,vy:(Math.random()-.5)*160,vz:80+Math.random()*140,life:.7+Math.random()*.55,size:2+Math.random()*4,color:i%2?'#facc15':TEAM_COLOR[team]});
  if(mode==='practice')kickoffTeam=HOME;
}
function prepareRestart(team,x,y,label,kind){
  owner=null;intendedReceiver=null;pendingPass=null;
  ball.vx=ball.vy=ball.vz=0;ball.z=0;
  ball.x=clamp(x,10,FIELD_W-10);ball.y=clamp(y,10,FIELD_H-10);
  state='restart';phaseTimer=.82;
  let taker;
  if(kind==='clearance')taker=teams[team][0];
  else taker=outfield(team).slice().sort(function(a,b){return dist(a,ball)-dist(b,ball)})[0];
  pendingRestart={team:team,x:ball.x,y:ball.y,label:label,kind:kind,taker:taker};
  statusEl.dataset.banner=label;
}
function checkOut(){
  if(owner)return;
  const crossedGoalLine=ball.x<0||ball.x>FIELD_W;
  if(crossedGoalLine){
    const onPost=Math.abs(ball.y-GOAL_Y1)<16||Math.abs(ball.y-GOAL_Y2)<16;
    const onBar=ball.y>GOAL_Y1&&ball.y<GOAL_Y2&&Math.abs(ball.z-GOAL_H)<15;
    if(onPost&&ball.z<GOAL_H+12){
      const left=ball.x<0;ball.x=left?3:FIELD_W-3;ball.vx=(left?1:-1)*Math.max(260,Math.abs(ball.vx)*.68);
      ball.vy+=(ball.y<FIELD_H/2?-1:1)*70;ballFree=.08;shake=Math.max(shake,4);postClang();showStatus('골대!',.45);return true;
    }
    if(onBar){
      const left=ball.x<0;ball.x=left?3:FIELD_W-3;ball.vx=(left?1:-1)*Math.max(220,Math.abs(ball.vx)*.48);
      ball.vz=-Math.max(110,Math.abs(ball.vz)*.55);ballFree=.08;shake=Math.max(shake,4);postClang();showStatus('크로스바!',.45);return true;
    }
  }
  const inGoal=ball.y>GOAL_Y1&&ball.y<GOAL_Y2&&ball.z<GOAL_H;
  if(ball.x<0&&inGoal){scoreGoal(AWAY);return true}
  if(ball.x>FIELD_W&&inGoal){scoreGoal(HOME);return true}
  if(ball.y<0||ball.y>FIELD_H){
    const team=1-lastTouchTeam;
    prepareRestart(team,ball.x,ball.y<0?8:FIELD_H-8,'킥인','kickin');return true;
  }
  if(ball.x<0||ball.x>FIELD_W){
    const defending=ball.x<0?HOME:AWAY;
    if(lastTouchTeam===defending){
      const attacking=1-defending;
      prepareRestart(attacking,ball.x<0?12:FIELD_W-12,ball.y<FIELD_H/2?18:FIELD_H-18,'코너킥','corner');
    }else{
      prepareRestart(defending,defending===HOME?80:FIELD_W-80,FIELD_H/2,'골클리어런스','clearance');
    }
    return true;
  }
  return false;
}
function beginRestart(){
  if(!pendingRestart)return;
  const r=pendingRestart,p=r.taker;
  p.x=clamp(r.x-teamDir(p.team)*24,20,FIELD_W-20);
  p.y=clamp(r.y,20,FIELD_H-20);
  p.vx=p.vy=0;ball.x=r.x;ball.y=r.y;ball.z=0;
  givePossession(p);
  if(p.team===HOME&&p.role!=='GK')controlled=p;
  state=mode==='practice'?'practice':'play';
  pendingRestart=null;statusEl.dataset.banner='';
}
function basePosition(p){
  const mirror=p.team===HOME?1:-1;
  const xMap={GK:75,FIXO:330,ALA_TOP:505,ALA_BOTTOM:505,PIVOT:720};
  const yMap={GK:FIELD_H/2,FIXO:FIELD_H/2,ALA_TOP:225,ALA_BOTTOM:615,PIVOT:FIELD_H/2};
  let x=xMap[p.role],y=yMap[p.role];
  if(p.team===AWAY)x=FIELD_W-x;
  return{x:x,y:y};
}
function setupKickoff(team){
  allPlayers().forEach(function(p){const b=basePosition(p);p.x=b.x;p.y=b.y;p.vx=p.vy=0;p.tackleTimer=p.kickTimer=p.recover=0;p.oneTwoTimer=0});
  ball.x=FIELD_W/2;ball.y=FIELD_H/2;ball.z=0;ball.vx=ball.vy=ball.vz=0;
  const p=teams[team][4];p.x=FIELD_W/2-teamDir(team)*24;p.y=FIELD_H/2;
  owner=p;lastTouchTeam=team;p.stealProtect=.8;
  controlled=team===HOME?p:teams[HOME][1];
  cameraX=FIELD_W/2;
}
function resetKickoff(team){
  setupKickoff(team);
  state=mode==='practice'?'practice':'play';statusEl.dataset.banner='';
  showStatus((team===HOME?'씨앗 FC':'블루 FC')+' 킥오프',.9);
}
function startKickoffCountdown(team){
  setupKickoff(team);
  kickoffTeam=team;
  kickoffLabel=team===HOME?'씨앗 FC':'블루 FC';
  state='countdown';phaseTimer=3.85;countdownLast=4;
  statusEl.dataset.banner=kickoffLabel+' 킥오프';
}
function finishMatch(){
  playing=false;state='fulltime';owner=null;charge=null;
  finalWhistle();
  result.classList.remove('hidden');
  const title=score[0]>score[1]?'승리!':score[0]<score[1]?'아쉽게 패배':'무승부';
  document.getElementById('resultTitle').textContent=title;
  document.getElementById('resultText').textContent='최종 스코어 '+score[0]+' : '+score[1];
  document.getElementById('statShots').textContent=stats.shots[0];
  document.getElementById('statPasses').textContent=stats.passes[0];
  document.getElementById('statSaves').textContent=stats.saves[0];
  const value=score[0]*100+stats.passes[0]*3+stats.saves[0]*8;
  if(window.KidscadeGame)window.KidscadeGame.gameOver({score:value,scoreOptions:{unit:'pts',higherIsBetter:true},result:title,goals:score[0]});
}
function updatePhase(dt){
  if(state==='countdown'){
    phaseTimer-=dt;
    if(phaseTimer<=3){
      const n=Math.max(1,Math.ceil(phaseTimer));
      if(n!==countdownLast){countdownLast=n;countdownBeep(n)}
    }
    if(phaseTimer<=0){
      phaseTimer=0;whistle();
      state=mode==='practice'?'practice':'play';
      statusEl.dataset.banner='';
      showStatus('시작!',.65);
    }
    return true;
  }
  if(state==='goal'||state==='restart'){
    phaseTimer-=dt;
    if(phaseTimer<=0){
      if(state==='goal')resetKickoff(kickoffTeam);
      else beginRestart();
    }
    return true;
  }
  return false;
}
function update(dt){
  if(paused||state==='menu'||state==='fulltime')return;
  simTime+=dt;
  if(updatePhase(dt))return;
  if(mode==='tutorial'&&tutorialStep===0){
    const iv=inputVector();
    if(Math.abs(iv.x)+Math.abs(iv.y)>.1)tutorialMoveTime+=dt;
    if(tutorialMoveTime>=.7)advanceTutorial('move');
  }
  ballFree=Math.max(0,ballFree-dt);
  if(pendingPass){pendingPass.life-=dt;if(pendingPass.life<=0)pendingPass=null}
  if(owner)possessionTime[owner.team]+=dt;

  updatePlayers(dt);
  if(owner)updateOwnedBall(dt);else updateLooseBall(dt);
  if(owner&&(ball.x<0||ball.x>FIELD_W||ball.y<0||ball.y>FIELD_H)){
    lastTouchTeam=owner.team;owner=null;intendedReceiver=null;
  }
  if(!owner&&checkOut())return;

  particles.forEach(function(p){p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=420*dt;p.life-=dt});
  particles=particles.filter(function(p){return p.life>0});
  statusTimer=Math.max(0,statusTimer-dt);if(statusTimer===0)statusEl.classList.remove('show');
  shake=Math.max(0,shake-dt*18);flash=Math.max(0,flash-dt);
  const target=clamp(ball.x+(owner?teamDir(owner.team)*70:clamp(ball.vx*.08,-100,100)),570,FIELD_W-570);
  cameraX=lerp(cameraX,target,clamp(dt*3.5,0,1));

  if(mode!=='practice'&&state==='play'){
    matchTime-=dt;
    if(matchTime<=0){matchTime=0;finishMatch()}
  }
}
function updateHud(){
  scoreEl.textContent=score[0]+' : '+score[1];
  clockEl.textContent=mode==='practice'?'연습':formatTime(matchTime);
  if(controlled){
    playerNameEl.textContent=controlled.number+' · '+controlled.name;
    playerRoleEl.textContent=(ROLE_LABEL[controlled.role]||controlled.role)+(owner===controlled?' · 볼 소유':'');
  }
  const pct=charge?Math.round(chargePower()*100):0;
  powerFill.style.width=pct+'%';
}
function loop(t){
  if(!last)last=t;
  const frame=Math.min(.05,(t-last)/1000);last=t;acc+=frame;
  while(acc>=FIXED){update(FIXED);acc-=FIXED}
  render();updateHud();requestAnimationFrame(loop);
}

function chargePower(){
  if(!charge)return 0;
  return clamp((performance.now()-charge.start)/900,0,1);
}
function beginCharge(type){
  if(!playing||paused||state!=='play'&&state!=='practice')return;
  if(type==='shoot'&&owner!==controlled){tryTackle(controlled);return}
  if(owner!==controlled)return;
  if(charge)return;
  charge={type:type,start:performance.now(),oneTwo:keys.has('KeyQ')};
}
function releaseCharge(type){
  if(!charge||charge.type!==type)return;
  const p=chargePower(),oneTwo=charge.oneTwo;
  charge=null;
  if(type==='shoot')performShot(p);
  else performPass(type,p,oneTwo);
}
function handleActionPress(type){
  if(type==='switch'){if(!owner||owner.team!==HOME)switchPlayer();return}
  beginCharge(type);
}
function handleActionRelease(type){releaseCharge(type)}

function showStatus(text,seconds){
  statusEl.textContent=text;statusEl.classList.add('show');statusTimer=seconds||.8;
}

function startGame(){
  wakeAudio();
  mode=document.querySelector('.mode.active').dataset.mode;
  difficulty=mode==='tutorial'?'easy':difficultyEl.value;
  assist=mode==='tutorial'?'high':assistEl.value;
  score=[0,0];stats.shots=[0,0];stats.passes=[0,0];stats.passAttempts=[0,0];stats.saves=[0,0];possessionTime=[0,0];
  matchTime=mode==='long'?300:(mode==='tutorial'?120:180);
  playing=true;paused=false;charge=null;particles=[];pendingRestart=null;
  tutorialStep=0;tutorialMoveTime=0;tutorialFinished=false;
  buildTeams();
  if(mode==='practice')teams[AWAY].forEach(function(p){if(p.role!=='GK')p.active=false});
  kickoffTeam=(mode==='tutorial'||mode==='practice')?HOME:(Math.random()<.5?HOME:AWAY);
  startKickoffCountdown(kickoffTeam);
  menu.classList.add('hidden');result.classList.add('hidden');pauseLayer.classList.add('hidden');
  showStatus('첫 공 · '+(kickoffTeam===HOME?'씨앗 FC':'블루 FC'),3.2);
  app.focus();
  if(window.KidscadeGame)window.KidscadeGame.start({mode:mode,difficulty:difficulty,kickoff:kickoffLabel});
}
function setPaused(value){
  if(!playing||state==='fulltime')return;
  paused=!!value;
  pauseLayer.classList.toggle('hidden',!paused);
  charge=null;
}
function returnMenu(){
  playing=false;paused=false;state='menu';charge=null;
  result.classList.add('hidden');pauseLayer.classList.add('hidden');menu.classList.remove('hidden');
  if(mode==='tutorial'&&tutorialFinished){
    document.querySelectorAll('.mode').forEach(function(b){b.classList.toggle('active',b.dataset.mode==='match')});
    startBtn.textContent='경기 시작';
  }
}
function rematch(){startGame()}

document.querySelectorAll('.mode').forEach(function(btn){
  btn.addEventListener('click',function(){
    document.querySelectorAll('.mode').forEach(function(b){b.classList.remove('active')});
    btn.classList.add('active');
    startBtn.textContent=btn.dataset.mode==='practice'?'연습 시작':(btn.dataset.mode==='tutorial'?'튜토리얼 시작':'경기 시작');
  });
});
startBtn.addEventListener('click',startGame);
document.getElementById('helpBtn').addEventListener('click',function(){help.classList.remove('hidden')});
document.getElementById('closeHelp').addEventListener('click',function(){help.classList.add('hidden')});
pauseBtn.addEventListener('click',function(){if(paused)setPaused(false);else setPaused(true)});
document.getElementById('resumeBtn').addEventListener('click',function(){setPaused(false)});
document.getElementById('rematchBtn').addEventListener('click',rematch);
document.getElementById('menuBtn').addEventListener('click',returnMenu);

const actionKey={KeyS:'pass',KeyW:'through',KeyA:'lob',KeyD:'shoot'};
window.addEventListener('keydown',function(e){
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyA','KeyS','KeyD','KeyW','KeyQ','KeyE','KeyC'].indexOf(e.code)>=0)e.preventDefault();
  if(e.repeat)return;
  keys.add(e.code);
  if(e.code==='KeyQ'){if(!owner||owner.team!==HOME)switchPlayer();return}
  const type=actionKey[e.code];if(type)handleActionPress(type);
});
window.addEventListener('keyup',function(e){
  keys.delete(e.code);
  const type=actionKey[e.code];if(type)handleActionRelease(type);
});
window.addEventListener('blur',function(){if(playing&&!paused)setPaused(true)});

document.querySelectorAll('[data-hold]').forEach(function(btn){
  const k=btn.dataset.hold;
  const down=function(e){e.preventDefault();touchHold[k]=true;try{btn.setPointerCapture(e.pointerId)}catch(_){}};
  const up=function(e){e.preventDefault();touchHold[k]=false};
  btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);btn.addEventListener('lostpointercapture',up);
});
document.querySelectorAll('[data-action]').forEach(function(btn){
  const a=btn.dataset.action;
  btn.addEventListener('pointerdown',function(e){e.preventDefault();try{btn.setPointerCapture(e.pointerId)}catch(_){};handleActionPress(a)});
  const up=function(e){e.preventDefault();handleActionRelease(a)};
  btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);
});

window.addEventListener('load',function(){
  if(window.KidscadeGame){
    window.KidscadeGame.registerPauseHandlers({pause:function(){setPaused(true)},resume:function(){setPaused(false)}});
  }
});

try{
  if(localStorage.getItem('seedFutsalTutorialDone')==='1'){
    document.querySelectorAll('.mode').forEach(function(b){b.classList.toggle('active',b.dataset.mode==='match')});
    startBtn.textContent='경기 시작';
  }else startBtn.textContent='튜토리얼 시작';
}catch(_){startBtn.textContent='튜토리얼 시작'}

buildTeams();
requestAnimationFrame(loop);
})();