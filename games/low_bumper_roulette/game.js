(()=>{'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const ui={menu:$('menu'),result:$('result'),status:$('raceStatus'),names:$('names'),winnerCount:$('winnerCount'),chaos:$('chaos'),countdown:$('countdown'),toast:$('toast'),resultNames:$('resultNames'),bigWinner:$('bigWinner'),resultText:$('resultText')};
const WORLD={w:1000,h:620,left:55,right:945,top:76,finish:550};
const palette=['#ff6f91','#59c8ff','#ffd84d','#73df95','#8a73ff','#ff9b54','#ff6f5f','#4dd7c8','#d77cff','#84b6ff','#ff87c6','#a6df64'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
let dpr=1,scale=1,offX=0,offY=0;
let balls=[],bumpers=[],particles=[],confetti=[],finishers=[];
let state='menu',last=performance.now(),startAt=0,finishTarget=1,endAt=0,courseTime=0,toastTimer=0;
let names=[],audioCtx=null,lastHitSound=0;
let rng=Math.random;

function resize(){
 dpr=Math.min(devicePixelRatio||1,2);
 canvas.width=Math.max(1,innerWidth*dpr);canvas.height=Math.max(1,innerHeight*dpr);
 canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';
 ctx.setTransform(dpr,0,0,dpr,0,0);
 scale=Math.min(innerWidth/WORLD.w,innerHeight/WORLD.h);
 offX=(innerWidth-WORLD.w*scale)/2;offY=(innerHeight-WORLD.h*scale)/2;
}
addEventListener('resize',resize);resize();

function makeRng(){
 let seed=(Date.now()^Math.floor(performance.now()*1000))>>>0;
 try{const a=new Uint32Array(1);crypto.getRandomValues(a);seed^=a[0]}catch(_){}
 return()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296};
}
function parseNames(){
 const raw=ui.names.value.split(/[\n,]+/).map(v=>v.trim()).filter(Boolean);
 const out=[];for(const n of raw){if(!out.includes(n))out.push(n)}
 return out.slice(0,24);
}
function setNumbered(n){ui.names.value=Array.from({length:n},(_,i)=>(i+1)+'번').join('\n');ui.status.textContent='준비 중 · 참가자 '+n+'명'}
function shuffleText(){
 const a=parseNames();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}ui.names.value=a.join('\n');
}
function sdkStart(){try{window.KidscadeGame?.start?.({mode:'roulette',participants:names.length,winners:finishTarget})}catch(_){}}
function sdkSound(name){try{window.KidscadeGame?.sound?.(name)}catch(_){}}

function ensureAudio(){try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume()}catch(_){}}
function tone(f=440,d=.05,vol=.025,type='sine'){
 if(!audioCtx)return;const t=audioCtx.currentTime,o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(t+d+.01);
}
function hitSound(speed){
 const now=performance.now();if(now-lastHitSound<36)return;lastHitSound=now;tone(360+Math.min(500,speed*.65),.035,.012,'triangle');
}
function fanfare(){
 if(!audioCtx)return;[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.16,.04,'square'),i*85));sdkSound('correct');
}
function showToast(text,ms=1200){
 ui.toast.textContent=text;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),ms);
}

function buildCourse(){
 bumpers.length=0;
 const rows=7,cols=8;
 for(let r=0;r<rows;r++){
   const y=165+r*53;
   for(let c=0;c<cols;c++){
     const alt=r%2?54:0;
     const x=105+c*105+alt;
     if(x>WORLD.right-28)continue;
     const special=(r===2&&c===2)||(r===4&&c===5)||(r===5&&c===1);
     bumpers.push({x,y,r:special?22:17,special,pulse:rng()*Math.PI*2});
   }
 }
 bumpers.push({x:WORLD.left+35,y:480,r:27,special:true,pulse:0},{x:WORLD.right-35,y:480,r:27,special:true,pulse:1});
}
function createBalls(){
 balls.length=0;finishers.length=0;particles.length=0;confetti.length=0;
 const n=names.length;
 const radius=n>18?8:n>12?9.5:n>8?11:13;
 const usable=WORLD.right-WORLD.left-60;
 const slots=Math.min(n,12);
 for(let i=0;i<n;i++){
   const row=Math.floor(i/slots),col=i%slots;
   const rowCount=Math.min(slots,n-row*slots);
   const x=WORLD.left+30+(col+1)*(usable/(rowCount+1))+(rng()-.5)*12;
   const y=WORLD.top+28-row*24+(rng()-.5)*5;
   balls.push({name:names[i],x,y,vx:(rng()-.5)*46,vy:0,r:radius,color:palette[i%palette.length],finished:false,place:0,slow:0,trail:[]});
 }
}

function startRace(){
 names=parseNames();
 if(names.length<2){showToast('참가자 이름을 2명 이상 넣어 주세요!',1600);return}
 finishTarget=clamp(Number(ui.winnerCount.value)||1,1,Math.min(3,names.length));
 rng=makeRng();ensureAudio();buildCourse();createBalls();
 ui.menu.classList.add('hidden');ui.result.classList.add('hidden');
 ui.status.textContent='참가자 '+names.length+'명 · '+finishTarget+'명 뽑기';
 sdkStart();courseTime=0;state='countdown';startAt=performance.now()+2900;
 ui.countdown.textContent='3';ui.countdown.classList.remove('hidden');tone(420,.08,.028,'square');
}
function resetToMenu(){state='menu';ui.result.classList.add('hidden');ui.menu.classList.remove('hidden');ui.countdown.classList.add('hidden');ui.status.textContent='준비 중 · 참가자 '+(parseNames().length||0)+'명'}
function launch(){state='racing';ui.countdown.classList.add('hidden');for(const b of balls){b.vy=20+rng()*40;b.vx+=(rng()-.5)*65}tone(720,.12,.04,'square');showToast('출발!',700)}
function sameAgain(){startRace()}

function resolveBumper(b,p){
 const dx=b.x-p.x,dy=b.y-p.y,min=b.r+p.r,d2=dx*dx+dy*dy;if(d2>=min*min||d2<.0001)return;
 const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,over=min-d;b.x+=nx*over;b.y+=ny*over;
 const vn=b.vx*nx+b.vy*ny;if(vn<0){const rest=p.special?1.08:.84;b.vx-=(1+rest)*vn*nx;b.vy-=(1+rest)*vn*ny}
 const chaos=ui.chaos.value||'normal',kick=chaos==='wild'?82:chaos==='calm'?20:48;
 if(p.special){b.vx+=(rng()-.5)*kick;b.vy-=18+rng()*24}
 spawnSpark(p.x+nx*p.r,p.y+ny*p.r,p.special?'✦':'•',p.special?5:2,b.color);hitSound(Math.abs(vn));
}
function resolveBallPair(a,b){
 const dx=b.x-a.x,dy=b.y-a.y,min=a.r+b.r,d2=dx*dx+dy*dy;if(d2>=min*min||d2<.0001)return;
 const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,over=(min-d)/2;a.x-=nx*over;a.y-=ny*over;b.x+=nx*over;b.y+=ny*over;
 const rvx=b.vx-a.vx,rvy=b.vy-a.vy,sep=rvx*nx+rvy*ny;if(sep>0)return;
 const j=-(1+.76)*sep/2;a.vx-=j*nx;a.vy-=j*ny;b.vx+=j*nx;b.vy+=j*ny;
}
function spawnSpark(x,y,char,n,color){
 for(let i=0;i<n;i++)particles.push({x,y,vx:(rng()-.5)*120,vy:(rng()-.5)*120,life:.32+rng()*.25,char,color});
}
function spawnConfetti(){
 for(let i=0;i<110;i++)confetti.push({x:rng()*WORLD.w,y:-rng()*180,vx:(rng()-.5)*80,vy:110+rng()*190,rot:rng()*6.2,vr:(rng()-.5)*7,life:3+rng()*2,color:palette[i%palette.length],size:5+rng()*8});
}
function finishBall(b){
 if(b.finished)return;b.finished=true;b.place=finishers.length+1;finishers.push(b);b.vx*=.2;b.vy=0;
 showToast(b.place+'등 · '+b.name+'!',1100);tone(b.place===1?880:720,.1,.035,'square');
 ui.status.textContent='도착 '+finishers.length+'명 · '+finishTarget+'명 뽑기';
 if(finishers.length>=finishTarget){state='ending';endAt=performance.now()+1350;spawnConfetti();fanfare()}
}
function finishGame(){
 state='result';
 ui.bigWinner.textContent=finishTarget===1?finishers[0].name:finishers[0].name+' 외 '+(finishTarget-1)+'명';
 ui.resultText.textContent=finishTarget===1?'범퍼 사이를 뚫고 가장 먼저 도착했어요!':'결승선을 먼저 통과한 순서대로 뽑혔어요!';
 ui.resultNames.innerHTML=finishers.slice(0,finishTarget).map((b,i)=>'<div class="resultRow"><span class="medal">'+(['🥇','🥈','🥉'][i]||'⭐')+'</span><span>'+escapeHtml(b.name)+'</span></div>').join('');
 ui.result.classList.remove('hidden');
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

function update(dt,now){
 if(state==='countdown'){
   const left=Math.ceil((startAt-now)/1000);
   const txt=left>0?String(left):'GO!';
   if(ui.countdown.textContent!==txt){ui.countdown.textContent=txt;tone(left>0?420+left*80:760,.07,.024,'square')}
   if(now>=startAt)launch();
 }
 if(state==='racing'){
   courseTime+=dt;
   const chaos=ui.chaos.value||'normal';
   const gravity=chaos==='wild'?760:chaos==='calm'?650:700;
   const late=courseTime>16?1+(courseTime-16)*.08:1;
   for(const b of balls){
     if(b.finished)continue;
     b.trail.push({x:b.x,y:b.y});if(b.trail.length>8)b.trail.shift();
     b.vy+=gravity*late*dt;
     const breeze=Math.sin(courseTime*1.9+b.x*.015)*(chaos==='wild'?38:chaos==='calm'?12:24);
     b.vx+=breeze*dt;b.vx*=Math.pow(.997,dt*60);b.vy=Math.min(b.vy,700);
     b.x+=b.vx*dt;b.y+=b.vy*dt;
     if(b.x-b.r<WORLD.left){b.x=WORLD.left+b.r;b.vx=Math.abs(b.vx)*.82+12}
     if(b.x+b.r>WORLD.right){b.x=WORLD.right-b.r;b.vx=-Math.abs(b.vx)*.82-12}
     if(b.y-b.r<WORLD.top){b.y=WORLD.top+b.r;b.vy=Math.abs(b.vy)}
     for(const p of bumpers)resolveBumper(b,p);
     const speed=Math.hypot(b.vx,b.vy);b.slow=speed<42?b.slow+dt:0;
     if(b.slow>1.2){b.vx+=(rng()-.5)*130;b.vy+=80;b.slow=0}
     if(b.y-b.r>WORLD.finish)finishBall(b);
   }
   for(let i=0;i<balls.length;i++)if(!balls[i].finished)for(let j=i+1;j<balls.length;j++)if(!balls[j].finished)resolveBallPair(balls[i],balls[j]);
 }
 if(state==='ending'&&now>=endAt)finishGame();
 for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){particles.splice(i,1);continue}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=160*dt}
 for(let i=confetti.length-1;i>=0;i--){const q=confetti[i];q.life-=dt;if(q.life<=0){confetti.splice(i,1);continue}q.x+=q.vx*dt;q.y+=q.vy*dt;q.rot+=q.vr*dt}
}

function drawBoard(){
 ctx.save();ctx.translate(offX,offY);ctx.scale(scale,scale);
 const g=ctx.createLinearGradient(0,0,0,WORLD.h);g.addColorStop(0,'#347fd1');g.addColorStop(.55,'#1f5ea8');g.addColorStop(1,'#163a73');ctx.fillStyle=g;ctx.fillRect(0,0,WORLD.w,WORLD.h);
 ctx.fillStyle='rgba(255,255,255,.08)';for(let y=100;y<WORLD.finish;y+=44)ctx.fillRect(WORLD.left,y,WORLD.right-WORLD.left,1);
 ctx.fillStyle='#18325f';ctx.fillRect(0,0,WORLD.left,WORLD.h);ctx.fillRect(WORLD.right,0,WORLD.w-WORLD.right,WORLD.h);
 ctx.fillStyle='#fff2b9';ctx.fillRect(WORLD.left,WORLD.finish,WORLD.right-WORLD.left,8);
 const tile=28;for(let x=WORLD.left;x<WORLD.right;x+=tile){ctx.fillStyle=((x/tile)|0)%2?'#fff':'#1d2538';ctx.fillRect(x,WORLD.finish,x+tile>WORLD.right?WORLD.right-x:tile,8)}
 ctx.fillStyle='rgba(255,255,255,.9)';ctx.font='900 15px system-ui';ctx.textAlign='left';ctx.fillText('START',WORLD.left+10,WORLD.top-13);ctx.fillText('FINISH',WORLD.left+10,WORLD.finish-10);
 for(const p of bumpers){
   const pulse=1+(p.special?Math.sin(performance.now()/220+p.pulse)*.07:0);
   ctx.save();ctx.translate(p.x,p.y);ctx.scale(pulse,pulse);ctx.shadowColor=p.special?'rgba(255,216,77,.9)':'rgba(10,25,55,.48)';ctx.shadowBlur=p.special?22:9;ctx.fillStyle=p.special?'#ffd84d':'#f5fbff';ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle=p.special?'#ff7b54':'#77b5e9';ctx.beginPath();ctx.arc(-p.r*.24,-p.r*.24,p.r*.36,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 ctx.restore();
}
function drawBalls(){
 ctx.save();ctx.translate(offX,offY);ctx.scale(scale,scale);
 for(const b of balls){
   if(b.finished)continue;
   for(let i=0;i<b.trail.length;i++){const t=b.trail[i],a=(i+1)/b.trail.length;ctx.globalAlpha=a*.08;ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(t.x,t.y,b.r*.75,0,7);ctx.fill()}ctx.globalAlpha=1;
   ctx.save();ctx.shadowColor='rgba(0,0,0,.28)';ctx.shadowBlur=10;ctx.shadowOffsetY=5;ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.shadowColor='transparent';ctx.fillStyle='rgba(255,255,255,.62)';ctx.beginPath();ctx.arc(b.x-b.r*.32,b.y-b.r*.32,b.r*.28,0,7);ctx.fill();
   const fs=clamp(12-(names.length-8)*.12,7.2,12);ctx.font='1000 '+fs+'px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=3;ctx.strokeStyle='rgba(18,31,55,.85)';ctx.strokeText(shortName(b.name),b.x,b.y+.5);ctx.fillStyle='white';ctx.fillText(shortName(b.name),b.x,b.y+.5);ctx.restore();
 }
 ctx.restore();
}
function shortName(s){const a=Array.from(String(s));return a.length<=4?s:a.slice(0,3).join('')+'…'}
function drawFinishers(){
 if(!finishers.length)return;
 ctx.save();ctx.translate(offX,offY);ctx.scale(scale,scale);
 finishers.slice(0,6).forEach((b,i)=>{const x=110+i*145,y=585;ctx.fillStyle='rgba(10,24,50,.72)';ctx.beginPath();ctx.roundRect(x-55,y-20,110,30,12);ctx.fill();ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(x-39,y-5,9,0,7);ctx.fill();ctx.fillStyle='white';ctx.font='900 12px system-ui';ctx.textAlign='left';ctx.fillText((i+1)+' '+shortName(b.name),x-24,y-1)});
 ctx.restore();
}
function drawParticles(){
 ctx.save();ctx.translate(offX,offY);ctx.scale(scale,scale);ctx.textAlign='center';
 for(const p of particles){ctx.globalAlpha=clamp(p.life/.45,0,1);ctx.fillStyle=p.color;ctx.font='900 16px system-ui';ctx.fillText(p.char,p.x,p.y)}ctx.globalAlpha=1;
 for(const q of confetti){ctx.save();ctx.translate(q.x,q.y);ctx.rotate(q.rot);ctx.fillStyle=q.color;ctx.fillRect(-q.size/2,-q.size/3,q.size,q.size*.66);ctx.restore()}ctx.restore();
}
function drawIdle(){if(state!=='menu')return;ctx.save();ctx.translate(offX,offY);ctx.scale(scale,scale);ctx.fillStyle='rgba(255,255,255,.08)';ctx.font='1000 90px system-ui';ctx.textAlign='center';ctx.fillText('🎡',WORLD.w/2,355);ctx.restore()}
function draw(){ctx.clearRect(0,0,innerWidth,innerHeight);drawBoard();drawBalls();drawFinishers();drawParticles();drawIdle()}
function frame(now){const dt=Math.min(.032,Math.max(0,(now-last)/1000));last=now;update(dt,now);draw();requestAnimationFrame(frame)}
requestAnimationFrame(frame);

$('fill8').addEventListener('click',()=>setNumbered(8));
$('fill20').addEventListener('click',()=>setNumbered(20));
$('clearNames').addEventListener('click',()=>{ui.names.value='';ui.names.focus();ui.status.textContent='준비 중 · 참가자 0명'});
$('shuffleNames').addEventListener('click',shuffleText);
$('startBtn').addEventListener('click',startRace);
$('againBtn').addEventListener('click',sameAgain);
$('editBtn').addEventListener('click',resetToMenu);
$('menuBtn').addEventListener('click',resetToMenu);
ui.names.addEventListener('input',()=>{ui.status.textContent='준비 중 · 참가자 '+parseNames().length+'명'});
document.addEventListener('visibilitychange',()=>{last=performance.now()});
})();