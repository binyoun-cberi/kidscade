(function(){
'use strict';
const W=960,H=540,GROUND=470,NETX=480,NETTOP=282,NETW=18,FIXED=1/120;
const BALL_GRAVITY=1120,PLAYER_GRAVITY=1420,PLAYER_MAX=455,AIR_MAX=425;
const DEBUG=new URLSearchParams(location.search).has('debug');
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d',{alpha:false});
const DPR=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);ctx.imageSmoothingEnabled=true;
const menu=document.getElementById('menu'),result=document.getElementById('result'),help=document.getElementById('help'),pauseLayer=document.getElementById('pauseLayer');
const app=document.getElementById('app'),tip=document.getElementById('tip'),pad2=document.getElementById('pad2'),serveText=document.getElementById('serveText');
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
 return {side,x:side===0?250:710,y:GROUND-48,w:72,h:96,vx:0,vy:0,onGround:true,state:'GROUND',jumpLatch:false,smashLatch:false,attack:0,diveTimer:0,recover:0,land:0,run:0,face:side===0?1:-1,touches:0};
}
let p=[player(0),player(1)];
let ball={x:300,y:210,vx:0,vy:0,r:18,lastTouch:-1,hitLock:0,trail:Array.from({length:7},()=>({x:300,y:210,a:0})),trailHead:0};
const CHARACTER_ROOT='../../assets/game/characters/people/kenney-platformer-characters/';
function makeSpriteSet(name){const pose=(poseName)=>{const img=new Image();img.src=CHARACTER_ROOT+name+'/poses/'+name+'-'+poseName+'.png';return img};return {stand:pose('stand'),walk1:pose('walk1'),walk2:pose('walk2'),jump:pose('jump'),action:pose('action1'),cheer:pose('cheer1'),hurt:pose('hurt')}}
const athleteSprites=[makeSpriteSet('player'),makeSpriteSet('female')];
let serveArmed=false;

const bg=document.createElement('canvas');bg.width=W;bg.height=H;const b=bg.getContext('2d');
(function buildBackground(){
 const sky=b.createLinearGradient(0,0,0,GROUND);sky.addColorStop(0,'#38bdf8');sky.addColorStop(1,'#d8f3ff');b.fillStyle=sky;b.fillRect(0,0,W,GROUND);
 b.fillStyle='rgba(255,255,255,.78)';[[90,78],[275,125],[470,82],[680,135],[855,92]].forEach(([x,y])=>{b.beginPath();b.arc(x,y,24,0,7);b.arc(x+29,y+5,18,0,7);b.arc(x-25,y+9,16,0,7);b.fill()});
 b.fillStyle='#f5cd65';b.fillRect(0,GROUND,W,H-GROUND);b.fillStyle='#fff0b7';for(let i=0;i<28;i++)b.fillRect((i*73)%W,GROUND+12+(i%4)*13,3,2);
 b.strokeStyle='rgba(255,255,255,.9)';b.lineWidth=5;b.beginPath();b.moveTo(0,GROUND);b.lineTo(W,GROUND);b.stroke();b.fillStyle='rgba(255,255,255,.19)';b.fillRect(0,GROUND-6,NETX-NETW/2,6);b.fillRect(NETX+NETW/2,GROUND-6,W-NETX,6);
})();

function setPhase(next,time){phase=next;phaseTimer=time}
function resetEntities(server){
 p=[player(0),player(1)];serveSide=server;cpuState.think=0;cpuState.targetX=710;cpuState.jump=false;cpuState.smash=false;cpuState.aim=0;
 const sx=server===0?305:655;ball.x=sx;ball.y=220;ball.vx=0;ball.vy=0;ball.lastTouch=-1;ball.hitLock=0;ball.trail.forEach(t=>{t.x=sx;t.y=220;t.a=0});ball.trailHead=0;
 rally=0;rallyEl.textContent='랠리 0';serveArmed=false;setPhase('serve',.68);renderDirty=true;
 const cpuServing=(mode==='cpu'||mode==='practice')&&server===1;const serveKey=server===0?'S':'↓';serveText.textContent=cpuServing?'파랑 팀 서브 준비':(server===0?'초록 팀':'파랑 팀')+' · '+serveKey+' 눌러 서브';serveText.classList.add('show');
}
function startGame(){
 mode=document.querySelector('.mode.active[data-mode]')?.dataset.mode||'cpu';difficulty=document.getElementById('difficulty').value;target=Number(document.getElementById('target').value)||7;practice=mode==='practice';practiceStage=0;
 score=[0,0];playing=true;paused=false;simTime=0;last=performance.now();acc=0;menu.classList.add('hidden');result.classList.add('hidden');pauseLayer.classList.add('hidden');pad2.classList.toggle('hidden',mode!=='2p');document.getElementById('pauseBtn').textContent='⏸';
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

function capBallBody(obj){const max=555,s=Math.hypot(obj.vx,obj.vy);if(s>max){obj.vx*=max/s;obj.vy*=max/s}obj.vx=clamp(obj.vx,-505,505);obj.vy=clamp(obj.vy,-625,625)}
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
 const g={x:ball.x,y:ball.y,vx:ball.vx,vy:ball.vy,r:ball.r};let t=0;
 for(let i=0;i<720;i++){stepBallBody(g,FIXED);t+=FIXED;if(g.y+g.r>=GROUND)return {x:g.x,t}}
 return {x:g.x,t:6};
}

const cpuState={think:0,targetX:710,jump:false,smash:false,aim:0,predX:710,predT:1};
function cpuInput(dt){
 const cfg=difficulty==='easy'?{react:.27,err:105,offset:10,jump:.48,smash:.18,mistake:.28}:difficulty==='hard'?{react:.075,err:22,offset:38,jump:.91,smash:.74,mistake:.08}:{react:.145,err:50,offset:28,jump:.72,smash:.48,mistake:.16};
 cpuState.think-=dt;
 if(cpuState.think<=0){
   cpuState.think=cfg.react;const me=p[1],pred=predictBallLanding();cpuState.predX=pred.x;cpuState.predT=pred.t;
   const onMySide=pred.x>NETX;const noisy=pred.x+(Math.random()-.5)*cfg.err;let offset=onMySide?cfg.offset:0;if(Math.random()<cfg.mistake)offset*=(Math.random()>.5?-0.3:.25);
   cpuState.targetX=clamp(onMySide?noisy+offset:720,NETX+62,W-42);cpuState.jump=false;cpuState.smash=false;
   const close=Math.abs(ball.x-me.x);if(phase==='play'&&ball.x>NETX-30&&pred.t<.62&&close<126&&ball.y<me.y-24&&ball.y>me.y-205&&Math.random()<cfg.jump)cpuState.jump=true;
   if(!me.onGround&&me.recover<=0&&close<96&&ball.y<me.y+8&&ball.y>me.y-115&&Math.random()<cfg.smash){cpuState.smash=true;cpuState.aim=p[0].x<240?1:-1}
 }
 const me=p[1],dead=9,out=inputCache[1];out.l=me.x>cpuState.targetX+dead;out.r=me.x<cpuState.targetX-dead;out.j=cpuState.jump;out.s=cpuState.smash;out.aim=cpuState.aim;return out;
}

function beginDive(me,dir){me.state='DIVE';me.diveTimer=.24;me.recover=0;me.onGround=false;me.vx=dir*575;me.vy=-165;me.face=dir;shake=Math.max(shake,.7);sound('jump',.9)}
function updatePlayer(me,inp,dt){
 me.attack=Math.max(0,me.attack-dt);me.diveTimer=Math.max(0,me.diveTimer-dt);me.recover=Math.max(0,me.recover-dt);me.land=Math.max(0,me.land-dt);
 const pressedAttack=inp.s&&!me.smashLatch;const dir=(inp.r?1:0)-(inp.l?1:0);
 if(me.recover>0){me.state='RECOVER';me.vx*=Math.pow(.78,dt*60)}
 else if(me.state==='DIVE'){
   me.vx*=Math.pow(.985,dt*60);if(me.diveTimer<=0)me.state='JUMP';
 }else{
   const accel=me.onGround?5000:2600,max=me.onGround?PLAYER_MAX:AIR_MAX;if(inp.l){me.vx-=accel*dt;me.face=-1}if(inp.r){me.vx+=accel*dt;me.face=1}if(!inp.l&&!inp.r)me.vx*=Math.pow(me.onGround?.58:.91,dt*60);me.vx=clamp(me.vx,-max,max);
   if(inp.j&&!me.jumpLatch&&me.onGround){me.vy=-620;me.onGround=false;me.state='JUMP';me.land=0;sound('jump',1.06)}
   if(pressedAttack){if(me.onGround&&dir!==0)beginDive(me,dir);else if(!me.onGround){me.attack=.18;me.state='ATTACK'}}
 }
 me.jumpLatch=inp.j;me.smashLatch=inp.s;me.vy+=PLAYER_GRAVITY*dt;me.x+=me.vx*dt;me.y+=me.vy*dt;me.run+=Math.abs(me.vx)*dt*.045;
 const half=me.state==='DIVE'?me.w*.50:me.w*.42,lo=me.side===0?half:NETX+NETW/2+half,hi=me.side===0?NETX-NETW/2-half:W-half;me.x=clamp(me.x,lo,hi);
 const floorY=GROUND-me.h*.5;if(me.y>=floorY){const wasAir=!me.onGround;if(wasAir&&me.vy>170){me.land=.12;shake=Math.max(shake,1.2)}me.y=floorY;me.vy=0;me.onGround=true;if(me.state==='DIVE'||me.diveTimer>0){me.recover=.3;me.state='RECOVER';me.vx*=.38}else if(me.recover<=0)me.state=Math.abs(me.vx)>28?'RUN':'GROUND'}
 else if(me.attack<=0&&me.state!=='DIVE')me.state='JUMP';
}

function shotAimFor(me,inp){if(Number.isFinite(inp.aim)&&inp.aim!==0)return inp.aim;const towardOpponent=me.side===0?inp.r:inp.l;const towardOwn=me.side===0?inp.l:inp.r;return towardOpponent?1:towardOwn?-1:0}
function colliderFor(me){if(me.state==='DIVE')return {cx:me.x+me.face*12,cy:me.y+10,rx:52,ry:31};return {cx:me.x,cy:me.y-13,rx:me.w*.54,ry:me.h*.52}}
function collidePlayer(me,inp){
 if(ball.hitLock>0)return;const c=colliderFor(me),ex=c.rx+ball.r,ey=c.ry+ball.r,qx=(ball.x-c.cx)/ex,qy=(ball.y-c.cy)/ey,d2=qx*qx+qy*qy;if(d2>=1)return;
 const qlen=Math.sqrt(d2)||.0001,ux=qx/qlen,uy=qy/qlen;ball.x=c.cx+ux*ex;ball.y=c.cy+uy*ey;
 let nx=ux/ex,ny=uy/ey,nlen=Math.hypot(nx,ny)||1;nx/=nlen;ny/=nlen;
 const smash=me.attack>0&&!me.onGround&&me.state!=='DIVE',dive=me.state==='DIVE';let rvx=ball.vx-me.vx,rvy=ball.vy-me.vy,vn=rvx*nx+rvy*ny;
 if(vn<0){const restitution=smash?1.05:dive?.94:.88;rvx-=(1+restitution)*vn*nx;rvy-=(1+restitution)*vn*ny}else{rvx+=nx*85;rvy+=ny*85}
 ball.vx=rvx+me.vx*(smash?.42:dive?.34:.28);ball.vy=rvy+me.vy*(smash?.18:.12);
 const courtDir=me.side===0?1:-1;
 if(smash){const aim=shotAimFor(me,inp),deep=aim>0,short=aim<0,targetVX=courtDir*(deep?490:short?365:435),targetVY=deep?170:short?285:225;ball.vx=lerp(ball.vx,targetVX,.72);ball.vy=lerp(ball.vy,targetVY,.78);me.attack=0;shake=Math.max(shake,4.2);burst(ball.x,ball.y,11);sound('hit',1.04)}
 else{
   const minForward=dive?135:105,forward=ball.vx*courtDir;if(forward<minForward)ball.vx+=courtDir*(minForward-forward)*.72;
   const lift=dive?-255:-175-Math.max(0,-ny)*90;if(ball.vy>lift)ball.vy=lerp(ball.vy,lift,dive?.82:.68);if(dive){burst(ball.x,ball.y,5);shake=Math.max(shake,1.8);sound('hit',1.24)}else sound('hit',1.44);
 }
 capBallBody(ball);ball.hitLock=.07;
 if(ball.lastTouch!==me.side){ball.lastTouch=me.side;me.touches++;rally++;rallyEl.textContent='랠리 '+rally;if(practice){if(rally>bestRally){bestRally=rally;localStorage.setItem('seedVolleyBestRally',String(bestRally));document.getElementById('matchInfo').textContent='연습 모드 · 최고 '+bestRally}practiceCoach(me,smash,dive)}}
}
function practiceCoach(me,smash,dive){if(me.side!==0)return;if(practiceStage===0){practiceStage=1;showTip('좋아요! 이제 W로 점프해서 더 높은 타점을 만들어 보세요.',1800)}else if(practiceStage===1&&!me.onGround){practiceStage=2;showTip('공중에서 S를 누르면 강타! 방향키를 함께 누르면 길이를 조절해요.',2100)}else if(practiceStage===2&&smash){practiceStage=3;showTip('마지막 기술: 땅에서 방향키+S를 누르면 다이브 수비!',2100)}else if(practiceStage===3&&dive){practiceStage=4;showTip('조작 완료! 이제 긴 랠리에 도전하세요.',2200)}}
function burst(x,y,n){for(let i=0;i<n&&particles.length<52;i++)particles.push({x,y,vx:(Math.random()-.5)*230,vy:(Math.random()-.5)*190-45,t:.34})}
function launchServe(){const dir=serveSide===0?1:-1;ball.x=p[serveSide].x+dir*44;ball.y=p[serveSide].y-82;ball.vx=dir*285;ball.vy=-455;ball.hitLock=.14;p[serveSide].attack=.1;setPhase('play',0);serveText.classList.remove('show');sound('hit',1.32)}
function scorePoint(winner){
 if(phase!=='play')return;if(practice){sound('cheer',1.04);resetEntities(winner===0?1:0);showTip('괜찮아요. 다시 타점을 잡아 이어 가요!',900);return}
 score[winner]++;updateScore();sound('cheer',winner===0?1.07:.98);serveSide=1-winner;setPhase('point',.75);serveText.textContent=(winner===0?'초록 팀':'파랑 팀')+' 득점!';serveText.classList.add('show');const a=score[0],bb=score[1],done=Math.max(a,bb)>=target&&Math.abs(a-bb)>=2;if(done){phase='finish';phaseTimer=.72;serveSide=a>bb?0:1}
}
function finish(winner){playing=false;renderDirty=true;serveText.classList.remove('show');document.getElementById('resultTitle').textContent=(winner===0?'초록 팀':'파랑 팀')+' 승리!';document.getElementById('resultText').textContent=score[0]+' : '+score[1]+' · 최고 랠리 '+Math.max(bestRally,rally);result.classList.remove('hidden');sound('win',1)}
function updateBall(dt){ball.hitLock=Math.max(0,ball.hitLock-dt);stepBallBody(ball,dt)}
function updateParticles(dt){for(let i=particles.length-1;i>=0;i--){const q=particles[i];q.t-=dt;if(q.t<=0){particles.splice(i,1);continue}q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=420*dt}}
function update(dt){
 simTime+=dt;const in0=inputFor(0),in1=mode==='cpu'||mode==='practice'?cpuInput(dt):inputFor(1);updatePlayer(p[0],in0,dt);updatePlayer(p[1],in1,dt);updateParticles(dt);shake=Math.max(0,shake-dt*18);
 if(phase==='serve'){const me=p[serveSide],dir=serveSide===0?1:-1,serveInput=serveSide===0?in0:in1;ball.x=me.x+dir*44;ball.y=me.y-82+Math.sin(simTime*8)*3;ball.vx=ball.vy=0;if(!serveInput.s)serveArmed=true;const cpuServing=(mode==='cpu'||mode==='practice')&&serveSide===1;if(cpuServing){phaseTimer-=dt;if(phaseTimer<=0)launchServe()}else if(serveArmed&&serveInput.s)launchServe();return}
 if(phase==='point'){phaseTimer-=dt;if(phaseTimer<=0)resetEntities(serveSide);return}if(phase==='finish'){phaseTimer-=dt;if(phaseTimer<=0)finish(serveSide);return}if(phase!=='play')return;
 updateBall(dt);collidePlayer(p[0],in0);collidePlayer(p[1],in1);trailTimer-=dt;if(trailTimer<=0){trailTimer=1/45;const t=ball.trail[ball.trailHead];t.x=ball.x;t.y=ball.y;t.a=1;ball.trailHead=(ball.trailHead+1)%ball.trail.length}for(const t of ball.trail)t.a=Math.max(0,t.a-dt*3.8);
 if(ball.y+ball.r>=GROUND){ball.y=GROUND-ball.r;ball.vx=ball.vy=0;scorePoint(ball.x<NETX?1:0)}
}

function drawAthlete(me,color,number){
 const set=athleteSprites[me.side];let img=set.stand;if(me.state==='DIVE'||me.state==='RECOVER')img=set.hurt;else if(me.attack>0)img=set.action;else if(!me.onGround)img=set.jump;else if(Math.abs(me.vx)>38)img=(Math.floor(me.run)%2===0?set.walk1:set.walk2);
 const footY=me.y+me.h*.5;ctx.save();ctx.fillStyle='rgba(15,23,42,.16)';ctx.beginPath();ctx.ellipse(me.x,GROUND+3,30*(me.onGround?1:.72),7*(me.onGround?1:.72),0,0,Math.PI*2);ctx.fill();
 if(img&&img.complete&&img.naturalWidth){const h=me.state==='DIVE'?112:126,w=h*(img.naturalWidth/img.naturalHeight);ctx.translate(me.x,footY);if(me.state==='DIVE')ctx.rotate(me.face*.22);ctx.scale(me.face>=0?1:-1,1);ctx.drawImage(img,-w/2,-h,w,h);if(me.attack>0){ctx.fillStyle='rgba(250,204,21,.25)';ctx.beginPath();ctx.arc(34,-70,19,0,Math.PI*2);ctx.fill()}}
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
})();