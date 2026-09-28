(function(){
'use strict';
const W=960,H=540,GROUND=470,NETX=480,NETTOP=282,NETW=18,FIXED=1/120,SERVE_CHARGE_TIME=1.3;
const BALL_GRAVITY=900,PLAYER_GRAVITY=1420,PLAYER_MAX=455,AIR_MAX=425;
const DEBUG=new URLSearchParams(location.search).has('debug');
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d',{alpha:false});
const DPR=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);ctx.imageSmoothingEnabled=true;
const menu=document.getElementById('menu'),result=document.getElementById('result'),help=document.getElementById('help'),pauseLayer=document.getElementById('pauseLayer');
const app=document.getElementById('app'),tip=document.getElementById('tip'),pad2=document.getElementById('pad2'),serveText=document.getElementById('serveText'),serveGauge=document.getElementById('serveGauge'),serveGaugeFill=document.getElementById('serveGaugeFill'),serveGaugeLabel=document.getElementById('serveGaugeLabel');
const scoreEls=[document.querySelector('#score1 span'),document.querySelector('#score2 span')],rallyEl=document.getElementById('rallyInfo');
const keys=Object.create(null),touch=Object.create(null);
const inputCache=[{l:false,r:false,j:false,s:false,aim:0},{l:false,r:false,j:false,s:false,aim:0}];
const audioDefs={jump:['../../assets/audio/sfx/movement/jump-cartoon-01.mp3',.22],hit:['../../assets/audio/sfx/combat/impact-heavy-01.mp3',.18],cheer:['../../assets/audio/sfx/success/cheer-yay-01.mp3',.24],win:['../../assets/audio/sfx/success/victory-fanfare-01.mp3',.28]};
const audioPools={};
Object.entries(audioDefs).forEach(([k,[src,vol]])=>{audioPools[k]={i:0,a:Array.from({length:4},()=>{const a=new Audio(src);a.preload='auto';a.volume=vol;return a})}});
function sound(name,rate=1){const pool=audioPools[name];if(!pool)return;const a=pool.a[pool.i++%pool.a.length];try{a.pause();a.currentTime=0;a.playbackRate=rate;a.play().catch(()=>{})}catch(e){}}
function clamp(v,a,z){return Math.max(a,Math.min(z,v))}
function lerp(a,b,t){return a+(b-a)*t}

let mode='cpu',difficulty='normal',target=7,playing=false,paused=false,last=0,acc=0,practice=false,simTime=0,renderDirty=true;
let score=[0,0],serveSide=0,rally=0,bestRally=Number(localStorage.getItem('seedVolleyBestRally')||0),hintTimer=0;
let phase='serve',phaseTimer=.9,shake=0,particles=[],trailTimer=0,practiceStage=0;

function player(side){
 return {side,x:side===0?250:710,y:GROUND-48,w:72,h:96,vx:0,vy:0,onGround:true,state:'GROUND',jumpLatch:false,smashLatch:false,attack:0,slideTimer:0,recover:0,land:0,run:0,face:side===0?1:-1,touches:0};
}
let p=[player(0),player(1)];
let ball={x:300,y:210,vx:0,vy:0,r:18,lastTouch:-1,hitLock:0,speedCap:520,trail:Array.from({length:7},()=>({x:300,y:210,a:0})),trailHead:0};
const CHARACTER_ROOT='../../assets/game/characters/people/kenney-platformer-characters/';
function makeSpriteSet(name){const pose=(poseName)=>{const img=new Image();img.src=CHARACTER_ROOT+name+'/poses/'+name+'-'+poseName+'.png';return img};return {stand:pose('stand'),walk1:pose('walk1'),walk2:pose('walk2'),jump:pose('jump'),action:pose('action1'),cheer:pose('cheer1'),hurt:pose('hurt')}}
const athleteSprites=[makeSpriteSet('player'),makeSpriteSet('female')];

const AVATAR_PREVIEW_KEY='kidscade-avatar-studio-preview';
function kidscadeHost(){
 try{if(parent&&parent!==window&&parent.location.origin===location.origin)return parent}catch(_){}
 return window;
}
function safeAvatar(fn,fallback=''){try{return fn()}catch(_){return fallback}}
function avatarFrameApi(){
 const h=kidscadeHost();
 const candidates=[
   safeAvatar(()=>window.KidscadeAvatarShop,null),
   safeAvatar(()=>h.KidscadeAvatarShop,null),
   safeAvatar(()=>h.document?.getElementById('kidscade-avatar-studio-frame')?.contentWindow?.KidscadeAvatarShop,null)
 ];
 return candidates.find(api=>api&&typeof api.renderPreviewFrame==='function')||null;
}
const avatarLiveFrameCache=new Map();
function cachedAvatarFrame(mode,now){
 const cached=avatarLiveFrameCache.get(mode);
 if(cached&&now-cached.time<95)return cached.src;
 const api=avatarFrameApi();if(!api)return cached?.src||'';
 const src=safeAvatar(()=>api.renderPreviewFrame(mode,now/1000),'')||'';
 if(src&&src.startsWith('data:image')){avatarLiveFrameCache.set(mode,{time:now,src});return src}
 return cached?.src||'';
}
function svgDataUrl(svg){
 if(!svg)return'';
 const embedded=(svg.match(/<image[^>]+href=["']([^"']+)["']/i)||[])[1];
 if(embedded&&embedded.startsWith('data:image'))return embedded;
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function savedAvatarSource(){
 const h=kidscadeHost();
 const saved=safeAvatar(()=>h.localStorage.getItem(AVATAR_PREVIEW_KEY),'')||safeAvatar(()=>localStorage.getItem(AVATAR_PREVIEW_KEY),'');
 if(saved&&saved.startsWith('data:image'))return saved;
 const svg=safeAvatar(()=>typeof h.renderAvatarSVG==='function'?h.renderAvatarSVG():'','');
 return svgDataUrl(svg);
}
const CPU_AVATAR_PRESETS=[
 {name:'블루 스파이크',equipment:{skin:'skin_warm',hair:'hair_short',top:'top_soccer',bottom:'bottom_track',head:'head_cap',face:'face_none',hand:'hand_none',background:'bg_basic',aura:'aura_none'}},
 {name:'네온 리베로',equipment:{skin:'skin_peach',hair:'hair_bob',top:'top_hoodie',bottom:'bottom_jeans',head:'head_headphones',face:'face_round',hand:'hand_none',background:'bg_basic',aura:'aura_none'}},
 {name:'썬더 세터',equipment:{skin:'skin_deep',hair:'hair_curl',top:'top_uniform',bottom:'bottom_track',head:'head_none',face:'face_sun',hand:'hand_none',background:'bg_basic',aura:'aura_none'}},
 {name:'포니 에이스',equipment:{skin:'skin_warm',hair:'hair_pony',top:'top_soccer',bottom:'bottom_shorts',head:'head_beanie',face:'face_none',hand:'hand_none',background:'bg_basic',aura:'aura_none'}}
];
let cpuAvatarPresetIndex=0;
function cpuAvatarPreset(){return CPU_AVATAR_PRESETS[cpuAvatarPresetIndex%CPU_AVATAR_PRESETS.length]}
function cpuAvatarSource(){
 const h=kidscadeHost(),preset=cpuAvatarPreset();
 const svg=safeAvatar(()=>typeof h.renderAvatarSVG==='function'?h.renderAvatarSVG(preset.equipment):'','');
 return svgDataUrl(svg);
}
function rotateCpuAvatarPreset(){
 let next=Math.floor(Math.random()*CPU_AVATAR_PRESETS.length);
 if(CPU_AVATAR_PRESETS.length>1&&next===cpuAvatarPresetIndex)next=(next+1)%CPU_AVATAR_PRESETS.length;
 cpuAvatarPresetIndex=next;
 volleyAvatars?.[1]?.refreshStatic(true);
}
class VolleyAvatarActor{
 constructor(side){
   this.side=side;this.img=new Image();this.img.decoding='async';this.ready=false;this.source='';this.lastCapture=0;this.lastStatic=0;
   this.img.onload=()=>{this.ready=true};this.img.onerror=()=>{this.ready=false};this.refreshStatic(true);
 }
 setSource(src){
   if(!src||src===this.source)return false;
   this.source=src;this.ready=false;this.img.src=src;return true;
 }
 refreshStatic(force=false){
   const now=performance.now();if(!force&&now-this.lastStatic<1300)return;
   this.lastStatic=now;
   const src=this.side===1?cpuAvatarSource():savedAvatarSource();
   this.setSource(src);
 }
 modeFor(me){
   if(me.state==='SLIDE'||me.attack>0)return 'smile';
   if(!me.onGround)return 'jump';
   if(Math.abs(me.vx)>34)return 'walk';
   return 'idle';
 }
 capture(mode,now){
   if(this.side===1)return false;
   if(now-this.lastCapture<105)return false;
   this.lastCapture=now;
   const src=cachedAvatarFrame(mode,now);
   if(src&&src.startsWith('data:image')){this.setSource(src);return true}
   return false;
 }
 render(ctx,me,number){
   const now=performance.now(),mode=this.modeFor(me);
   if(!this.capture(mode,now))this.refreshStatic(false);
   if(!this.ready||!this.img.naturalWidth)return false;

   const footY=me.y+me.h*.5,air=!me.onGround;
   const walk=Math.sin(me.run*2.1),idle=Math.sin(now/520);
   let bob=me.onGround?(Math.abs(me.vx)>34?walk*2.6:idle*.45):0;
   let sx=1,sy=1,rot=0,ox=0,oy=0,targetH=132;

   if(me.state==='SLIDE'){
     targetH=118;sx=1.10;sy=.80;rot=me.face*.34;ox=me.face*15;oy=8;bob=0;
   }else if(me.state==='RECOVER'){
     targetH=126;sx=1.05;sy=.90;rot=me.face*.08;oy=5;bob=0;
   }else if(me.attack>0&&!me.onGround){
     targetH=136;sx=1.07;sy=.96;rot=me.face*-.12;ox=me.face*6;oy=-2;
   }else if(air){
     targetH=136;sx=.97;sy=1.05;rot=me.vx/7000;
   }else if(me.land>0){
     sx=1.08;sy=.91;oy=4;
   }else if(Math.abs(me.vx)>34){
     sx=1+Math.abs(walk)*.018;sy=1-Math.abs(walk)*.025;rot=clamp(me.vx/9000,-.045,.045);
   }

   const ratio=this.img.naturalWidth/Math.max(1,this.img.naturalHeight),targetW=targetH*ratio;
   ctx.save();
   ctx.fillStyle='rgba(15,23,42,.17)';ctx.beginPath();
   ctx.ellipse(me.x,GROUND+3,31*(air?.78:1),7*(air?.72:1),0,0,Math.PI*2);ctx.fill();
   ctx.translate(me.x+ox,footY+bob+oy);
   ctx.rotate(rot);
   ctx.scale((me.face>=0?1:-1)*sx,sy);
   ctx.filter=this.side===0?'drop-shadow(0 0 3px rgba(34,197,94,.78))':'drop-shadow(0 0 3px rgba(59,130,246,.82))';
   ctx.drawImage(this.img,-targetW/2,-targetH*.93,targetW,targetH);
   ctx.filter='none';

   // Small team badge keeps mirrored/custom avatars readable without recoloring skin/hair.
   ctx.scale(me.face>=0?1:-1,1);
   const badgeX=me.face*0,badgeY=-targetH*.58;
   ctx.fillStyle=this.side===0?'rgba(34,197,94,.94)':'rgba(59,130,246,.94)';
   ctx.beginPath();ctx.arc(badgeX,badgeY,11,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle='rgba(255,255,255,.95)';ctx.lineWidth=2;ctx.stroke();
   ctx.fillStyle='#fff';ctx.font='900 11px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(number),badgeX,badgeY+.5);
   ctx.restore();
   if(this.side===1&&(mode==='cpu'||mode==='practice')){
     ctx.save();ctx.font='900 11px system-ui';ctx.textAlign='center';ctx.fillStyle='rgba(15,23,42,.82)';
     ctx.fillText(cpuAvatarPreset().name,me.x,footY-targetH-8);ctx.restore();
   }
   return true;
 }
}
const volleyAvatars=[new VolleyAvatarActor(0),new VolleyAvatarActor(1)];
let serveArmed=false,serveCharging=false,serveCharge=0,cpuServeTarget=.55;

const bg=document.createElement('canvas');bg.width=W;bg.height=H;const b=bg.getContext('2d');
(function buildBackground(){
 const sky=b.createLinearGradient(0,0,0,GROUND);sky.addColorStop(0,'#38bdf8');sky.addColorStop(1,'#d8f3ff');b.fillStyle=sky;b.fillRect(0,0,W,GROUND);
 b.fillStyle='rgba(255,255,255,.78)';[[90,78],[275,125],[470,82],[680,135],[855,92]].forEach(([x,y])=>{b.beginPath();b.arc(x,y,24,0,7);b.arc(x+29,y+5,18,0,7);b.arc(x-25,y+9,16,0,7);b.fill()});
 b.fillStyle='#f5cd65';b.fillRect(0,GROUND,W,H-GROUND);b.fillStyle='#fff0b7';for(let i=0;i<28;i++)b.fillRect((i*73)%W,GROUND+12+(i%4)*13,3,2);
 b.strokeStyle='rgba(255,255,255,.9)';b.lineWidth=5;b.beginPath();b.moveTo(0,GROUND);b.lineTo(W,GROUND);b.stroke();b.fillStyle='rgba(255,255,255,.19)';b.fillRect(0,GROUND-6,NETX-NETW/2,6);b.fillRect(NETX+NETW/2,GROUND-6,W-NETX,6);
})();

function setPhase(next,time){phase=next;phaseTimer=time}
function resetEntities(server){
 p=[player(0),player(1)];serveSide=server;cpuState.think=0;cpuState.targetX=710;cpuState.jumpTimer=0;cpuState.attackTimer=0;cpuState.aim=0;cpuState.predX=710;cpuState.predT=1;cpuState.shotCooldown=0;
 const sx=server===0?305:655;ball.x=sx;ball.y=220;ball.vx=0;ball.vy=0;ball.lastTouch=-1;ball.hitLock=0;ball.trail.forEach(t=>{t.x=sx;t.y=220;t.a=0});ball.trailHead=0;
 rally=0;rallyEl.textContent='랠리 0';serveArmed=false;serveCharging=false;serveCharge=0;ball.speedCap=520;cpuServeTarget=-1;updateServeGauge(0,false);setPhase('serve',.42);renderDirty=true;
 const cpuServing=(mode==='cpu'||mode==='practice')&&server===1;const serveKey=server===0?'S':'↓';serveText.textContent=cpuServing?'파랑 팀 서브 충전':(server===0?'초록 팀':'파랑 팀')+' · '+serveKey+' 꾹 누르고 떼서 서브';serveText.classList.add('show');
}
function startGame(){
 mode=document.querySelector('.mode.active[data-mode]')?.dataset.mode||'cpu';difficulty=document.getElementById('difficulty').value;target=Number(document.getElementById('target').value)||7;practice=mode==='practice';practiceStage=0;
 score=[0,0];playing=true;paused=false;simTime=0;last=performance.now();acc=0;if(mode==='cpu'||mode==='practice')rotateCpuAvatarPreset();menu.classList.add('hidden');result.classList.add('hidden');pauseLayer.classList.add('hidden');pad2.classList.toggle('hidden',mode!=='2p');document.getElementById('pauseBtn').textContent='⏸';
 document.getElementById('matchInfo').textContent=practice?'연습 모드 · 최고 '+bestRally:target+'점 · 2점 차 승리';updateScore();resetEntities(0);showTip(practice?'먼저 좌우로 움직여 공 아래에 자리 잡아 보세요.':'공을 쫓지 말고 먼저 타점으로 이동하세요.',2600);app.focus();
}
function updateScore(){scoreEls[0].textContent=score[0];scoreEls[1].textContent=score[1]}
function showTip(text,ms=1800){tip.textContent=text;tip.classList.add('show');clearTimeout(hintTimer);hintTimer=setTimeout(()=>tip.classList.remove('show'),ms)}
function pressed(name){return !!(keys[name]||touch[name])}
function inputFor(i){
 const out=inputCache[i];
 if(i===0){out.l=pressed('KeyA')||pressed('p1left');out.r=pressed('KeyD')||pressed('p1right');out.j=pressed('KeyW')||pressed('p1jump');out.s=pressed('KeyS')||pressed('p1smash')}
 else{out.l=pressed('ArrowLeft')||pressed('p2left');out.r=pressed('ArrowRight')||pressed('p2right');out.j=pressed('ArrowUp')||pressed('p2jump');out.s=pressed('ArrowDown')||pressed('p2smash')}
 out.aim=0;return out;
}

function capBallBody(obj){const max=obj.speedCap||520,s=Math.hypot(obj.vx,obj.vy);if(s>max){obj.vx*=max/s;obj.vy*=max/s}obj.vx=clamp(obj.vx,-600,600);obj.vy=clamp(obj.vy,-650,650)}
function resolveNetBody(obj,prevX,prevY){
 const r=obj.r||ball.r;if(obj.y-r>GROUND||obj.y+r<NETTOP-12)return;
 const capR=NETW*.5+4,dx=obj.x-NETX,dy=obj.y-NETTOP,dist=Math.hypot(dx,dy),touchR=r+capR;
 if(dist<touchR&&obj.y<NETTOP+22){const nx=dist?dx/dist:(prevX<NETX?-1:1),ny=dist?dy/dist:-1;obj.x=NETX+nx*touchR;obj.y=NETTOP+ny*touchR;const vn=obj.vx*nx+obj.vy*ny;if(vn<0){obj.vx-=(1.72*vn)*nx;obj.vy-=(1.72*vn)*ny}obj.vx*=.92;obj.vy*=.92;capBallBody(obj);return}
 if(obj.y+r>NETTOP&&Math.abs(obj.x-NETX)<NETW/2+r){if(prevX<NETX){obj.x=NETX-NETW/2-r;obj.vx=-Math.abs(obj.vx)*.8}else{obj.x=NETX+NETW/2+r;obj.vx=Math.abs(obj.vx)*.8}capBallBody(obj)}
}
function stepBallBody(obj,dt){
 const px=obj.x,py=obj.y;obj.vy+=BALL_GRAVITY*dt;obj.x+=obj.vx*dt;obj.y+=obj.vy*dt;obj.vx*=Math.pow(.9992,dt*60);const r=obj.r||ball.r;
 if(obj.x-r<0){obj.x=r;obj.vx=Math.abs(obj.vx)*.83}else if(obj.x+r>W){obj.x=W-r;obj.vx=-Math.abs(obj.vx)*.83}
 if(obj.y-r<0){obj.y=r;obj.vy=Math.abs(obj.vy)*.78}resolveNetBody(obj,px,py);capBallBody(obj);
}
function predictBallLanding(){
 const g={x:ball.x,y:ball.y,vx:ball.vx,vy:ball.vy,r:ball.r,speedCap:ball.speedCap};let t=0;
 for(let i=0;i<720;i++){stepBallBody(g,FIXED);t+=FIXED;if(g.y+g.r>=GROUND)return {x:g.x,t}}
 return {x:g.x,t:6};
}

const cpuState={think:0,targetX:710,jumpTimer:0,attackTimer:0,aim:0,predX:710,predT:1,shotCooldown:0};

function cpuBallClone(){
 return {x:ball.x,y:ball.y,vx:ball.vx,vy:ball.vy,r:ball.r,speedCap:ball.speedCap||520};
}
function simulateCpuSmashLanding(aim){
 const g=cpuBallClone(),courtDir=-1;
 const profiles={
   '-2':{vx:300,vy:285},
   '-1':{vx:340,vy:245},
   '0':{vx:405,vy:195},
   '1':{vx:450,vy:150},
   '2':{vx:485,vy:115}
 },profile=profiles[String(aim)]||profiles['0'];
 const targetVX=courtDir*profile.vx,targetVY=profile.vy;
 g.vx=lerp(g.vx,targetVX,.72);g.vy=lerp(g.vy,targetVY,.78);g.speedCap=520;capBallBody(g);
 let t=0;
 for(let i=0;i<240;i++){
   stepBallBody(g,1/120);t+=1/120;
   if(g.y+g.r>=GROUND)return {x:g.x,t,valid:g.x<NETX-10};
 }
 return {x:g.x,t,valid:false};
}
function chooseCpuAttackAim(){
 const opp=p[0],candidates=[-2,-1,0,1,2].map(aim=>({aim,...simulateCpuSmashLanding(aim)}));
 const valid=candidates.filter(q=>q.valid);
 if(!valid.length)return 0;
 valid.forEach(q=>{
   const separation=Math.abs(q.x-opp.x);
   const safeCourt=q.x>45&&q.x<NETX-36?22:0;
   const behindBonus=(opp.x>285&&q.x<220)||(opp.x<210&&q.x>300)?28:0;
   q.score=separation+safeCourt+behindBonus;
 });
 valid.sort((a,b)=>b.score-a.score);
 if(difficulty==='easy'&&valid.length>1&&Math.random()<.32)return valid[1].aim;
 if(difficulty==='normal'&&valid.length>1&&Math.random()<.10)return valid[1].aim;
 return valid[0].aim;
}
function predictCpuJumpIntercept(me){
 const g=cpuBallClone(),floorY=GROUND-me.h*.5,dt=1/60;
 let t=0;
 for(let i=0;i<55;i++){
   stepBallBody(g,dt);t+=dt;
   if(g.y+g.r>=GROUND)break;
   if(g.x<NETX-18||g.x>W-18)continue;
   if(g.y<175||g.y>390)continue;
   const rawY=floorY-620*t+.5*PLAYER_GRAVITY*t*t;
   const jumpY=t<.88?Math.min(floorY,rawY):floorY;
   const playerCenterY=jumpY-13;
   const verticalOK=Math.abs(g.y-playerCenterY)<78;
   const horizontalReach=AIR_MAX*t+88;
   const horizontalOK=Math.abs(g.x-me.x)<horizontalReach;
   if(verticalOK&&horizontalOK)return {x:g.x,y:g.y,t};
 }
 return null;
}
function cpuInput(dt){
 const cfg=difficulty==='easy'
  ?{think:.080,err:60,offset:18,dead:14,slideMargin:150}
  :difficulty==='hard'
  ?{think:.018,err:4,offset:38,dead:4,slideMargin:255}
  :{think:.035,err:18,offset:30,dead:7,slideMargin:205};

 const me=p[1],out=inputCache[1];
 cpuState.jumpTimer=Math.max(0,cpuState.jumpTimer-dt);
 cpuState.attackTimer=Math.max(0,cpuState.attackTimer-dt);
 cpuState.shotCooldown=Math.max(0,cpuState.shotCooldown-dt);
 cpuState.think-=dt;

 if(cpuState.think<=0){
   cpuState.think=cfg.think;
   const pred=predictBallLanding();
   cpuState.predX=pred.x;cpuState.predT=pred.t;
   const onMySide=pred.x>NETX;
   if(onMySide){
     const error=(Math.random()-.5)*cfg.err;
     const behind=cfg.offset+clamp(Math.abs(ball.vx)*.035,0,16);
     cpuState.targetX=clamp(pred.x+behind+error,NETX+58,W-44);
   }else{
     // Original Pikachu AI does not chase a ball that belongs to the other side;
     // it takes a useful standby position and waits for the return.
     const oppThreat=clamp((p[0].x-250)*.18,-32,32);
     cpuState.targetX=clamp(720+oppThreat,650,790);
   }

   // Predict whether jumping now can create an actual contact window.
   if(phase==='play'&&me.onGround&&me.recover<=0&&me.state!=='SLIDE'){
     const intercept=predictCpuJumpIntercept(me);
     if(intercept&&intercept.t>.10&&intercept.t<.62){
       cpuState.targetX=clamp(intercept.x+16,NETX+58,W-44);
       if(intercept.t<.50)cpuState.jumpTimer=.055;
     }
   }
 }

 // Pikachu Volleyball switches from landing-point pursuit to direct ball pursuit
 // after jumping. This keeps the CPU under the ball instead of committing to an old prediction.
 if(phase==='play'&&!me.onGround&&me.state!=='SLIDE'&&me.recover<=0){
   cpuState.targetX=clamp(ball.x+18,NETX+56,W-42);
 }

 // Last-chance ground slide: deterministic when running cannot reach but the slide can.
 if(phase==='play'&&me.onGround&&me.state!=='SLIDE'&&me.recover<=0&&ball.vy>0&&cpuState.predX>NETX){
   const gap=Math.abs(cpuState.predX-me.x);
   const runReach=PLAYER_MAX*Math.max(0,cpuState.predT)+48;
   if(cpuState.predT<.50&&gap>runReach*.82&&gap<runReach+cfg.slideMargin){
     cpuState.targetX=clamp(cpuState.predX,NETX+50,W-38);
     if(!me.smashLatch)cpuState.attackTimer=.045;
   }
 }

 // Attack every frame while airborne so a narrow hit window is not missed between AI think ticks.
 const close=Math.abs(ball.x-me.x),vertical=Math.abs(ball.y-(me.y-18));
 const attackWindow=phase==='play'&&!me.onGround&&me.recover<=0&&me.state!=='SLIDE'&&ball.x>NETX-28&&close<92&&vertical<88;
 if(attackWindow&&cpuState.shotCooldown<=0&&!me.smashLatch){
   cpuState.aim=chooseCpuAttackAim();
   cpuState.attackTimer=.045;
   cpuState.shotCooldown=.16;
 }

 const dead=cfg.dead;
 out.l=me.x>cpuState.targetX+dead;
 out.r=me.x<cpuState.targetX-dead;
 out.j=cpuState.jumpTimer>0;
 out.s=cpuState.attackTimer>0;
 out.aim=cpuState.aim;
 return out;
}

function beginSlide(me,dir){
 me.state='SLIDE';me.slideTimer=.31;me.recover=0;me.onGround=true;me.vy=0;me.vx=dir*640;me.face=dir;me.y=GROUND-me.h*.5;shake=Math.max(shake,.8);sound('jump',.86);
}
function updatePlayer(me,inp,dt){
 me.attack=Math.max(0,me.attack-dt);me.slideTimer=Math.max(0,me.slideTimer-dt);me.recover=Math.max(0,me.recover-dt);me.land=Math.max(0,me.land-dt);
 const pressedAttack=inp.s&&!me.smashLatch;const dir=(inp.r?1:0)-(inp.l?1:0);const floorY=GROUND-me.h*.5;
 if(me.recover>0){me.state='RECOVER';me.vx*=Math.pow(.74,dt*60);me.y=floorY;me.vy=0;me.onGround=true}
 else if(me.state==='SLIDE'){
   me.vx*=Math.pow(.992,dt*60);me.x+=me.vx*dt;me.y=floorY;me.vy=0;me.onGround=true;
   if(me.slideTimer<=0){me.recover=.22;me.state='RECOVER';me.vx*=.32}
 }else{
   const accel=me.onGround?5000:2600,max=me.onGround?PLAYER_MAX:AIR_MAX;if(inp.l){me.vx-=accel*dt;me.face=-1}if(inp.r){me.vx+=accel*dt;me.face=1}if(!inp.l&&!inp.r)me.vx*=Math.pow(me.onGround?.58:.91,dt*60);me.vx=clamp(me.vx,-max,max);
   if(inp.j&&!me.jumpLatch&&me.onGround){me.vy=-620;me.onGround=false;me.state='JUMP';me.land=0;sound('jump',1.06)}
   if(pressedAttack){if(me.onGround&&dir!==0)beginSlide(me,dir);else if(!me.onGround){me.attack=.18;me.state='ATTACK'}}
   if(me.state!=='SLIDE'){me.vy+=PLAYER_GRAVITY*dt;me.x+=me.vx*dt;me.y+=me.vy*dt}
 }
 me.jumpLatch=inp.j;me.smashLatch=inp.s;me.run+=Math.abs(me.vx)*dt*.045;
 const half=me.state==='SLIDE'?me.w*.58:me.w*.42,lo=me.side===0?half:NETX+NETW/2+half,hi=me.side===0?NETX-NETW/2-half:W-half;me.x=clamp(me.x,lo,hi);
 if(me.state!=='SLIDE'&&me.recover<=0){
   if(me.y>=floorY){const wasAir=!me.onGround;if(wasAir&&me.vy>170){me.land=.12;shake=Math.max(shake,1.2)}me.y=floorY;me.vy=0;me.onGround=true;me.state=Math.abs(me.vx)>28?'RUN':'GROUND'}
   else if(me.attack<=0){me.onGround=false;me.state='JUMP'}
 }
}

function shotAimFor(me,inp){
 if(me.side===1&&(mode==='cpu'||mode==='practice')&&Number.isFinite(inp.aim))return inp.aim;
 if(Number.isFinite(inp.aim)&&inp.aim!==0)return inp.aim;
 const towardOpponent=me.side===0?inp.r:inp.l,towardOwn=me.side===0?inp.l:inp.r;
 return towardOpponent?1:towardOwn?-1:0;
}
function colliderFor(me){
 if(me.state==='SLIDE')return {cx:me.x+me.face*34,cy:GROUND-27,rx:84,ry:29};
 if(me.attack>0&&!me.onGround)return {cx:me.x+me.face*12,cy:me.y-20,rx:56,ry:48};
 if(!me.onGround)return {cx:me.x+me.face*4,cy:me.y-18,rx:50,ry:49};
 return {cx:me.x,cy:me.y-11,rx:48,ry:47};
}
function collidePlayer(me,inp){
 if(ball.hitLock>0)return;const c=colliderFor(me),ex=c.rx+ball.r,ey=c.ry+ball.r,qx=(ball.x-c.cx)/ex,qy=(ball.y-c.cy)/ey,d2=qx*qx+qy*qy;if(d2>=1)return;
 const qlen=Math.sqrt(d2)||.0001,ux=qx/qlen,uy=qy/qlen;ball.x=c.cx+ux*ex;ball.y=c.cy+uy*ey;
 let nx=ux/ex,ny=uy/ey,nlen=Math.hypot(nx,ny)||1;nx/=nlen;ny/=nlen;
 const smash=me.attack>0&&!me.onGround&&me.state!=='SLIDE',dive=me.state==='SLIDE';ball.speedCap=520;let rvx=ball.vx-me.vx,rvy=ball.vy-me.vy,vn=rvx*nx+rvy*ny;
 if(vn<0){const restitution=smash?1.06:dive?1.00:.96;rvx-=(1+restitution)*vn*nx;rvy-=(1+restitution)*vn*ny}else{rvx+=nx*92;rvy+=ny*92}
 ball.vx=rvx+me.vx*(smash?.42:dive?.34:.28);ball.vy=rvy+me.vy*(smash?.18:.12);
 const courtDir=me.side===0?1:-1;
 if(smash){
   const aim=shotAimFor(me,inp),profiles={
     '-2':{vx:300,vy:285},'-1':{vx:340,vy:245},'0':{vx:405,vy:195},'1':{vx:450,vy:150},'2':{vx:485,vy:115}
   },profile=profiles[String(aim)]||profiles['0'],targetVX=courtDir*profile.vx,targetVY=profile.vy;
   ball.vx=lerp(ball.vx,targetVX,.72);ball.vy=lerp(ball.vy,targetVY,.78);me.attack=0;shake=Math.max(shake,4.2);burst(ball.x,ball.y,11);sound('hit',1.04)
 }
 else{
   const minForward=dive?145:115,forward=ball.vx*courtDir;if(forward<minForward)ball.vx+=courtDir*(minForward-forward)*.72;
   // A receive must actually pop the ball upward. The old lerp could leave a fast
   // descending ball with almost no rebound, so guarantee a minimum lift while
   // still preserving stronger physically-reflected bounces.
   const lift=dive?-510:-390-Math.max(0,-ny)*100;
   if(ball.vy>lift)ball.vy=lift;
   if(dive){burst(ball.x,ball.y,5);shake=Math.max(shake,1.8);sound('hit',1.24)}else sound('hit',1.44);
 }
 capBallBody(ball);ball.hitLock=.07;
 if(ball.lastTouch!==me.side){ball.lastTouch=me.side;me.touches++;rally++;rallyEl.textContent='랠리 '+rally;if(practice){if(rally>bestRally){bestRally=rally;localStorage.setItem('seedVolleyBestRally',String(bestRally));document.getElementById('matchInfo').textContent='연습 모드 · 최고 '+bestRally}practiceCoach(me,smash,dive)}}
}
function practiceCoach(me,smash,dive){if(me.side!==0)return;if(practiceStage===0){practiceStage=1;showTip('좋아요! 이제 W로 점프해서 더 높은 타점을 만들어 보세요.',1800)}else if(practiceStage===1&&!me.onGround){practiceStage=2;showTip('공중에서 S를 누르면 강타! 방향키를 함께 누르면 길이를 조절해요.',2100)}else if(practiceStage===2&&smash){practiceStage=3;showTip('마지막 기술: 땅에서 방향키+S를 누르면 슬라이딩 수비!',2100)}else if(practiceStage===3&&dive){practiceStage=4;showTip('조작 완료! 이제 긴 랠리에 도전하세요.',2200)}}
function updateServeGauge(power,show=true){
 power=clamp(power,0,1);serveGaugeFill.style.width=Math.round(power*100)+'%';serveGaugeLabel.textContent=power>=.98?'MAX POWER!':('서브 파워 '+Math.round(power*100)+'%');serveGauge.classList.toggle('hidden',!show);
}
function burst(x,y,n){for(let i=0;i<n&&particles.length<52;i++)particles.push({x,y,vx:(Math.random()-.5)*230,vy:(Math.random()-.5)*190-45,t:.34})}
function simulateServeLanding(power,side=serveSide){
 power=clamp(power,0,1);const ease=power*power*(3-2*power),dir=side===0?1:-1,me=p[side];
 const g={x:me.x+dir*44,y:me.y-82,vx:dir*lerp(300,540,ease),vy:-lerp(480,440,ease),r:ball.r,speedCap:lerp(570,720,ease)};
 let t=0,netHit=false;
 for(let i=0;i<360;i++){
   const beforeX=g.x,beforeVX=g.vx;stepBallBody(g,FIXED);t+=FIXED;
   if((beforeX-NETX)*(g.x-NETX)<=0&&Math.sign(beforeVX)!==Math.sign(g.vx))netHit=true;
   if(g.y+g.r>=GROUND)return {x:g.x,t,valid:side===1?(g.x>38&&g.x<NETX-30):(g.x< W-38&&g.x>NETX+30),netHit};
 }
 return {x:g.x,t,valid:false,netHit:true};
}
function chooseCpuServePower(){
 const opp=p[0],candidates=[];
 for(let i=0;i<=20;i++){
   const power=i/20,res=simulateServeLanding(power,1);
   if(!res.valid||res.netHit)continue;
   const boundarySafety=Math.min(res.x-38,(NETX-30)-res.x);
   const separation=Math.abs(res.x-opp.x);
   const fastBonus=power*18;
   candidates.push({power,...res,score:separation+Math.min(70,boundarySafety)*.10+fastBonus});
 }
 if(!candidates.length)return .55;
 candidates.sort((a,b)=>b.score-a.score);
 if(difficulty==='easy'){
   const pool=candidates.slice(0,Math.min(7,candidates.length));
   return pool[Math.min(pool.length-1,2+Math.floor(Math.random()*Math.max(1,pool.length-2)))].power;
 }
 if(difficulty==='normal'&&candidates.length>2&&Math.random()<.18)return candidates[1+Math.floor(Math.random()*2)].power;
 return candidates[0].power;
}
function launchServe(power=0){
 power=clamp(power,0,1);const dir=serveSide===0?1:-1,ease=power*power*(3-2*power);
 ball.x=p[serveSide].x+dir*44;ball.y=p[serveSide].y-82;
 ball.vx=dir*lerp(300,540,ease);ball.vy=-lerp(480,440,ease);ball.speedCap=lerp(570,720,ease);ball.hitLock=.14;p[serveSide].attack=.12;
 if(power>.72){shake=Math.max(shake,2.8);burst(ball.x,ball.y,8)}
 setPhase('play',0);serveCharging=false;serveCharge=0;serveText.classList.remove('show');updateServeGauge(0,false);sound('hit',lerp(1.32,.98,ease));
}
function scorePoint(winner){
 if(phase!=='play')return;if(practice){sound('cheer',1.04);resetEntities(winner===0?1:0);showTip('괜찮아요. 다시 타점을 잡아 이어 가요!',900);return}
 score[winner]++;updateScore();sound('cheer',winner===0?1.07:.98);serveSide=1-winner;setPhase('point',.75);serveText.textContent=(winner===0?'초록 팀':'파랑 팀')+' 득점!';serveText.classList.add('show');const a=score[0],bb=score[1],done=Math.max(a,bb)>=target&&Math.abs(a-bb)>=2;if(done){phase='finish';phaseTimer=.72;serveSide=a>bb?0:1}
}
function finish(winner){playing=false;renderDirty=true;serveText.classList.remove('show');document.getElementById('resultTitle').textContent=(winner===0?'초록 팀':'파랑 팀')+' 승리!';document.getElementById('resultText').textContent=score[0]+' : '+score[1]+' · 최고 랠리 '+Math.max(bestRally,rally);result.classList.remove('hidden');sound('win',1)}
function updateBall(dt){ball.hitLock=Math.max(0,ball.hitLock-dt);stepBallBody(ball,dt)}
function updateParticles(dt){for(let i=particles.length-1;i>=0;i--){const q=particles[i];q.t-=dt;if(q.t<=0){particles.splice(i,1);continue}q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=420*dt}}
function update(dt){
 simTime+=dt;const in0=inputFor(0),in1=mode==='cpu'||mode==='practice'?cpuInput(dt):inputFor(1);updatePlayer(p[0],in0,dt);updatePlayer(p[1],in1,dt);updateParticles(dt);shake=Math.max(0,shake-dt*18);
 if(phase==='serve'){
   const me=p[serveSide],dir=serveSide===0?1:-1,serveInput=serveSide===0?in0:in1;ball.x=me.x+dir*44;ball.y=me.y-82+Math.sin(simTime*8)*3;ball.vx=ball.vy=0;
   const cpuServing=(mode==='cpu'||mode==='practice')&&serveSide===1;
   if(cpuServing){
     phaseTimer-=dt;
     if(phaseTimer<=0){
       if(cpuServeTarget<0)cpuServeTarget=chooseCpuServePower();
       serveCharging=true;serveCharge=Math.min(cpuServeTarget,serveCharge+dt/SERVE_CHARGE_TIME);
       updateServeGauge(serveCharge,true);
       if(serveCharge>=cpuServeTarget)launchServe(serveCharge);
     }
   }else{
     if(!serveInput.s&&!serveCharging)serveArmed=true;
     if(serveArmed&&serveInput.s){serveCharging=true;serveCharge=Math.min(1,serveCharge+dt/SERVE_CHARGE_TIME);updateServeGauge(serveCharge,true)}
     else if(serveCharging&&!serveInput.s){launchServe(serveCharge)}
   }
   return;
 }
 if(phase==='point'){phaseTimer-=dt;if(phaseTimer<=0)resetEntities(serveSide);return}if(phase==='finish'){phaseTimer-=dt;if(phaseTimer<=0)finish(serveSide);return}if(phase!=='play')return;
 updateBall(dt);collidePlayer(p[0],in0);collidePlayer(p[1],in1);trailTimer-=dt;if(trailTimer<=0){trailTimer=1/45;const t=ball.trail[ball.trailHead];t.x=ball.x;t.y=ball.y;t.a=1;ball.trailHead=(ball.trailHead+1)%ball.trail.length}for(const t of ball.trail)t.a=Math.max(0,t.a-dt*3.8);
 if(ball.y+ball.r>=GROUND){ball.y=GROUND-ball.r;ball.vx=ball.vy=0;scorePoint(ball.x<NETX?1:0)}
}

function drawAthlete(me,color,number){
 if(volleyAvatars[me.side]?.render(ctx,me,number)){
   if(DEBUG){const c=colliderFor(me);ctx.strokeStyle=me.side===0?'#16a34a':'#2563eb';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(c.cx,c.cy,c.rx,c.ry,0,0,Math.PI*2);ctx.stroke()}
   return;
 }
 // Avatar data/API unavailable: keep the existing Kenney character as a safe fallback.
 const set=athleteSprites[me.side];let img=set.stand;if(me.state==='SLIDE'||me.state==='RECOVER')img=set.hurt;else if(me.attack>0)img=set.action;else if(!me.onGround)img=set.jump;else if(Math.abs(me.vx)>38)img=(Math.floor(me.run)%2===0?set.walk1:set.walk2);
 const footY=me.y+me.h*.5;ctx.save();ctx.fillStyle='rgba(15,23,42,.16)';ctx.beginPath();ctx.ellipse(me.x,GROUND+3,30*(me.onGround?1:.72),7*(me.onGround?1:.72),0,0,Math.PI*2);ctx.fill();
 if(img&&img.complete&&img.naturalWidth){const h=me.state==='SLIDE'?104:126,w=h*(img.naturalWidth/img.naturalHeight);ctx.translate(me.x,footY);if(me.state==='SLIDE')ctx.rotate(me.face*.32);ctx.scale(me.face>=0?1:-1,1);ctx.drawImage(img,-w/2,-h,w,h);if(me.attack>0){ctx.fillStyle='rgba(250,204,21,.25)';ctx.beginPath();ctx.arc(34,-70,19,0,Math.PI*2);ctx.fill()}}
 else{ctx.fillStyle=color;ctx.fillRect(me.x-24,footY-92,48,92);ctx.fillStyle='#fff';ctx.font='900 20px system-ui';ctx.textAlign='center';ctx.fillText(number,me.x,footY-45)}ctx.restore();
 if(DEBUG){const c=colliderFor(me);ctx.strokeStyle=me.side===0?'#16a34a':'#2563eb';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(c.cx,c.cy,c.rx,c.ry,0,0,Math.PI*2);ctx.stroke()}
}
function drawNet(){ctx.fillStyle='#334155';ctx.fillRect(NETX-NETW/2,NETTOP,NETW,GROUND-NETTOP);ctx.fillStyle='#f8fafc';ctx.beginPath();ctx.arc(NETX,NETTOP,NETW*.5+4,Math.PI,0);ctx.fill();ctx.fillRect(NETX-NETW/2-4,NETTOP-2,NETW+8,8);ctx.strokeStyle='rgba(255,255,255,.62)';ctx.lineWidth=2;for(let y=NETTOP+16;y<GROUND;y+=18){ctx.beginPath();ctx.moveTo(NETX-NETW/2,y);ctx.lineTo(NETX+NETW/2,y);ctx.stroke()}}
function drawBall(){const height=clamp((GROUND-ball.y)/300,0,1);ctx.fillStyle='rgba(15,23,42,'+(0.08+.12*(1-height))+')';ctx.beginPath();ctx.ellipse(ball.x,GROUND+2,22*(1-height*.45),6*(1-height*.45),0,0,7);ctx.fill();for(let i=0;i<ball.trail.length;i++){const t=ball.trail[(ball.trailHead+i)%ball.trail.length];if(t.a<=0)continue;ctx.globalAlpha=t.a*.11;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(t.x,t.y,ball.r*(.34+t.a*.35),0,7);ctx.fill()}ctx.globalAlpha=1;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,7);ctx.fill();ctx.strokeStyle='#f59e0b';ctx.lineWidth=4;ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r*.58,-.5,2.5);ctx.stroke();ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r*.58,2.6,5.7);ctx.stroke()}
function drawDebug(){if(!DEBUG)return;const pred=predictBallLanding();ctx.save();ctx.setLineDash([6,6]);ctx.strokeStyle='rgba(220,38,38,.8)';ctx.beginPath();ctx.moveTo(pred.x,GROUND-34);ctx.lineTo(pred.x,GROUND);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#111827';ctx.font='700 12px system-ui';ctx.fillText('예상 '+Math.round(pred.x)+' / '+pred.t.toFixed(2)+'s',pred.x-42,GROUND-40);ctx.restore()}
function draw(){ctx.drawImage(bg,0,0);ctx.save();if(shake)ctx.translate(Math.sin(simTime*56)*shake,Math.cos(simTime*61)*shake*.5);drawNet();drawAthlete(p[0],'#22c55e','1');drawAthlete(p[1],'#3b82f6','2');drawBall();for(const q of particles){ctx.globalAlpha=Math.max(0,q.t/.34);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(q.x,q.y,3,0,7);ctx.fill()}ctx.globalAlpha=1;drawDebug();ctx.restore()}
function frame(t){requestAnimationFrame(frame);if(!playing||paused){if(renderDirty){draw();renderDirty=false}last=t;return}let delta=Math.min(.05,Math.max(0,(t-last)/1000||0));last=t;acc+=delta;let steps=0;while(acc>=FIXED&&steps<6){update(FIXED);acc-=FIXED;steps++}if(steps===6)acc=0;draw()}
requestAnimationFrame(frame);

document.getElementById('modeGrid').addEventListener('click',e=>{const btn=e.target.closest('[data-mode]');if(!btn)return;document.querySelectorAll('.mode[data-mode]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');document.getElementById('difficulty').disabled=btn.dataset.mode!=='cpu'});
document.getElementById('startBtn').addEventListener('click',startGame);document.getElementById('helpBtn').addEventListener('click',()=>help.classList.remove('hidden'));document.getElementById('closeHelp').addEventListener('click',()=>help.classList.add('hidden'));
document.getElementById('rematchBtn').addEventListener('click',startGame);document.getElementById('menuBtn').addEventListener('click',()=>{result.classList.add('hidden');menu.classList.remove('hidden');renderDirty=true});
function togglePause(force){if(!playing)return;paused=typeof force==='boolean'?force:!paused;pauseLayer.classList.toggle('hidden',!paused);document.getElementById('pauseBtn').textContent=paused?'▶':'⏸';renderDirty=true;if(!paused){last=performance.now();acc=0;app.focus()}}
document.getElementById('pauseBtn').addEventListener('click',()=>togglePause());document.getElementById('resumeBtn').addEventListener('click',()=>togglePause(false));
addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.code==='KeyP'&&playing)togglePause()},{passive:false});addEventListener('keyup',e=>{keys[e.code]=false});
document.querySelectorAll('#touch button[data-key]').forEach(btn=>{const k=btn.dataset.key;const on=e=>{e.preventDefault();touch[k]=true};const off=e=>{e.preventDefault();touch[k]=false};btn.addEventListener('pointerdown',on);btn.addEventListener('pointerup',off);btn.addEventListener('pointercancel',off);btn.addEventListener('pointerleave',off)});
addEventListener('blur',()=>{Object.keys(keys).forEach(k=>keys[k]=false);Object.keys(touch).forEach(k=>touch[k]=false);if(playing&&!paused)togglePause(true)});
addEventListener('storage',e=>{if(e.key===AVATAR_PREVIEW_KEY)volleyAvatars[0]?.refreshStatic(true)});
})();