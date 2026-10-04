(()=>{'use strict';
const W=960,H=540,PAD_W=24,PAD_H=138,BALL_R=15;
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const dpr=Math.min(devicePixelRatio||1,2);canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
const $=id=>document.getElementById(id);
const ui={menu:$('menu'),pause:$('pauseLayer'),result:$('result'),leftScore:$('leftScore'),rightScore:$('rightScore'),leftName:$('leftName'),rightName:$('rightName'),match:$('matchInfo'),rally:$('rallyInfo'),message:$('message'),touchRight:$('touchRight'),difficulty:$('difficulty'),target:$('targetScore'),resultTitle:$('resultTitle'),resultText:$('resultText'),bestRally:$('bestRallyStat'),finalScore:$('finalScoreStat')};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const keys=new Set(),touch={p1up:false,p1down:false,p2up:false,p2down:false};
let drag={p1:null,p2:null};
const configs={
 easy:{ball:330,maxBall:560,paddle:430,ai:250,aiLag:.22,aiError:52,assist:18},
 normal:{ball:370,maxBall:650,paddle:455,ai:345,aiLag:.12,aiError:28,assist:10},
 hard:{ball:410,maxBall:740,paddle:485,ai:445,aiLag:.06,aiError:10,assist:2}
};
let mode='cpu',difficulty='easy',target=5,status='menu',pausedFrom='',countdownEnd=0,pointEnd=0,lastCountdown=0,lastTime=performance.now(),flashTimer=0;
let leftScore=0,rightScore=0,rally=0,bestRally=0,serveDir=1,particles=[],stars=[],aiThink=0,aiTarget=H/2;
const left={x:54,y:H/2-PAD_H/2,w:PAD_W,h:PAD_H,vy:0};
const right={x:W-54-PAD_W,y:H/2-PAD_H/2,w:PAD_W,h:PAD_H,vy:0};
const ball={x:W/2,y:H/2,vx:0,vy:0,r:BALL_R,trail:[]};

function sdkSound(name){try{window.KidscadeGame?.sound?.(name)}catch(_){}}
function sdkStart(){try{window.KidscadeGame?.start?.({mode,difficulty,target})}catch(_){}}
function sdkScore(){try{window.KidscadeGame?.score?.(bestRally,{unit:'랠리',higherIsBetter:true})}catch(_){}}
function sdkGameOver(winner){try{window.KidscadeGame?.result?.({scope:'match',status:'completed',outcome:winner==='left'?'win':'loss',score:bestRally,scoreOptions:{unit:'랠리',higherIsBetter:true},winner,mode,leftScore,rightScore})}catch(_){}}

function showMessage(text,ms=0){ui.message.textContent=text;ui.message.classList.add('show');clearTimeout(flashTimer);if(ms)flashTimer=setTimeout(()=>ui.message.classList.remove('show'),ms)}
function hideMessage(){clearTimeout(flashTimer);ui.message.classList.remove('show')}
function updateHud(){ui.leftScore.textContent=leftScore;ui.rightScore.textContent=rightScore;ui.rally.textContent='랠리 '+rally+' · 최고 '+bestRally;ui.match.textContent=target+'점 먼저!'}
function resetPaddles(){left.y=right.y=H/2-PAD_H/2;left.vy=right.vy=0;drag.p1=drag.p2=null}
function resetBall(){ball.x=W/2;ball.y=H/2;ball.vx=ball.vy=0;ball.trail.length=0}
function setMode(next){mode=next;document.querySelectorAll('.mode[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));ui.difficulty.disabled=mode==='2p';ui.rightName.textContent=mode==='2p'?'친구':'컴퓨터';ui.touchRight.style.visibility=mode==='2p'?'visible':'hidden'}
function readOptions(){difficulty=ui.difficulty.value||'easy';target=Number(ui.target.value)||5;mode=document.querySelector('.mode.active[data-mode]')?.dataset.mode||'cpu'}
function startGame(){
 readOptions();leftScore=rightScore=rally=bestRally=0;serveDir=Math.random()<.5?-1:1;particles.length=0;stars.length=0;resetPaddles();resetBall();ui.menu.classList.add('hidden');ui.result.classList.add('hidden');ui.pause.classList.add('hidden');setMode(mode);updateHud();sdkStart();beginCountdown();lastTime=performance.now();$('app').focus();
}
function beginCountdown(){
 status='countdown';resetBall();countdownEnd=performance.now()+3000;lastCountdown=0;showMessage('3');sdkSound('click');
}
function launchServe(){
 const cfg=configs[difficulty];const angle=(Math.random()*.58-.29);ball.vx=serveDir*cfg.ball*Math.cos(angle);ball.vy=cfg.ball*Math.sin(angle)+(Math.random()<.5?-75:75);status='playing';showMessage('퐁!',330);
}
function point(side){
 if(status!=='playing')return;
 if(side==='left')leftScore++;else rightScore++;
 sdkSound('correct');spawnBurst(side==='left'?W*.72:W*.28,H*.28,side==='left'?'⭐':'✨',16);
 showMessage(side==='left'?(mode==='2p'?'1P +1!':'좋아요! +1'):(mode==='2p'?'2P +1!':'컴퓨터 +1'),650);
 updateHud();status='point';pointEnd=performance.now()+850;serveDir*=-1;
 if((side==='left'?leftScore:rightScore)>=target)pointEnd=performance.now()+900,status='ending';
}
function endGame(){
 status='result';const leftWon=leftScore>rightScore;ui.resultTitle.textContent=leftWon?(mode==='2p'?'1P 승리!':'이겼어요!'):(mode==='2p'?'2P 승리!':'다음 판엔 이겨봐요!');
 ui.resultText.textContent=leftWon?'공을 끝까지 잘 따라갔어요.':'괜찮아요. 공이 오는 높이를 먼저 보고 움직여 보세요.';
 ui.bestRally.textContent=bestRally;ui.finalScore.textContent=leftScore+' : '+rightScore;ui.result.classList.remove('hidden');sdkScore();sdkGameOver(leftWon?'left':'right');
}
function pause(force){
 if(!['countdown','playing','point'].includes(status)&&!pausedFrom)return;
 if(force===false||pausedFrom){const resume=pausedFrom||'playing';pausedFrom='';status=resume;ui.pause.classList.add('hidden');$('pauseBtn').textContent='Ⅱ';lastTime=performance.now();return}
 pausedFrom=status;status='paused';ui.pause.classList.remove('hidden');$('pauseBtn').textContent='▶';
}
function toMenu(){pausedFrom='';status='menu';ui.pause.classList.add('hidden');ui.result.classList.add('hidden');ui.menu.classList.remove('hidden');$('pauseBtn').textContent='Ⅱ';resetBall();resetPaddles();hideMessage()}

function inputFor(p){
 const up=p===1?(keys.has('KeyW')||touch.p1up):(keys.has('ArrowUp')||touch.p2up);
 const down=p===1?(keys.has('KeyS')||touch.p1down):(keys.has('ArrowDown')||touch.p2down);
 return (down?1:0)-(up?1:0);
}
function updatePaddle(obj,dir,targetY,dt,speed){
 if(targetY!=null){const center=obj.y+obj.h/2,delta=targetY-center;obj.vy=clamp(delta*9,-speed,speed)}
 else obj.vy=dir*speed;
 obj.y=clamp(obj.y+obj.vy*dt,12,H-12-obj.h);
}
function updateAI(dt){
 const cfg=configs[difficulty];aiThink-=dt;if(aiThink<=0){aiThink=cfg.aiLag;const travel=ball.vx>0?(right.x-ball.x)/Math.max(1,ball.vx):.5;const projected=ball.y+ball.vy*clamp(travel,0,.9);aiTarget=clamp(projected+(Math.random()-.5)*cfg.aiError,PAD_H/2+16,H-PAD_H/2-16)}
 const center=right.y+right.h/2,dir=Math.abs(aiTarget-center)<8?0:aiTarget>center?1:-1;updatePaddle(right,dir,null,dt,cfg.ai);
}
function paddleHit(p,side){
 const cfg=configs[difficulty],assist=(mode==='cpu'&&difficulty==='easy'&&rally<4&&side==='left')?cfg.assist:0;
 const withinY=ball.y+ball.r>=p.y-assist&&ball.y-ball.r<=p.y+p.h+assist;
 if(!withinY)return false;
 if(side==='left'&&ball.vx<0&&ball.x-ball.r<=p.x+p.w&&ball.x>p.x-8){
   ball.x=p.x+p.w+ball.r;bounceFromPaddle(p,1);return true;
 }
 if(side==='right'&&ball.vx>0&&ball.x+ball.r>=p.x&&ball.x<p.x+p.w+8){
   ball.x=p.x-ball.r;bounceFromPaddle(p,-1);return true;
 }
 return false;
}
function bounceFromPaddle(p,dir){
 const cfg=configs[difficulty];const rel=clamp((ball.y-(p.y+p.h/2))/(p.h/2),-1,1);let speed=Math.min(cfg.maxBall,Math.hypot(ball.vx,ball.vy)*1.055+10);
 ball.vx=dir*Math.max(speed*.78,Math.abs(ball.vx)*1.04);ball.vy=rel*speed*.72+p.vy*.18;
 const mag=Math.hypot(ball.vx,ball.vy);if(mag>cfg.maxBall){ball.vx*=cfg.maxBall/mag;ball.vy*=cfg.maxBall/mag}
 rally++;bestRally=Math.max(bestRally,rally);updateHud();spawnBurst(ball.x,ball.y,dir>0?'✨':'⭐',7);sdkSound('click');if(rally===5||rally===10||rally===20)showMessage(rally+'번 랠리!',500);
}
function spawnBurst(x,y,char,n){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*210,vy:(Math.random()-.5)*190-20,life:.55+Math.random()*.3,char})}
function updateParticles(dt){for(let i=particles.length-1;i>=0;i--){const q=particles[i];q.life-=dt;if(q.life<=0){particles.splice(i,1);continue}q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=260*dt}}
function update(dt,now){
 const cfg=configs[difficulty];updateParticles(dt);
 if(status==='countdown'){
   const sec=Math.max(1,Math.ceil((countdownEnd-now)/1000));if(sec!==lastCountdown){lastCountdown=sec;showMessage(String(sec));if(sec<3)sdkSound('click')}
   if(now>=countdownEnd)launchServe();return;
 }
 if(status==='point'){if(now>=pointEnd){rally=0;updateHud();beginCountdown()}return}
 if(status==='ending'){if(now>=pointEnd)endGame();return}
 if(status!=='playing')return;
 updatePaddle(left,inputFor(1),drag.p1,dt,cfg.paddle);
 if(mode==='2p')updatePaddle(right,inputFor(2),drag.p2,dt,cfg.paddle);else updateAI(dt);
 ball.trail.push({x:ball.x,y:ball.y});if(ball.trail.length>10)ball.trail.shift();
 ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
 if(ball.y-ball.r<=8){ball.y=8+ball.r;ball.vy=Math.abs(ball.vy);sdkSound('click')}
 if(ball.y+ball.r>=H-8){ball.y=H-8-ball.r;ball.vy=-Math.abs(ball.vy);sdkSound('click')}
 paddleHit(left,'left');paddleHit(right,'right');
 if(ball.x+ball.r<0)point('right');else if(ball.x-ball.r>W)point('left');
}

function roundedRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function drawCourt(){
 const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#65c9ff');g.addColorStop(1,'#d9f5ff');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.fillStyle='rgba(255,255,255,.82)';for(const [x,y,s] of [[90,80,1],[270,145,.8],[475,86,1.1],[690,135,.9],[865,72,.8]]){ctx.beginPath();ctx.arc(x,y,24*s,0,7);ctx.arc(x+27*s,y+5,20*s,0,7);ctx.arc(x-26*s,y+8,17*s,0,7);ctx.fill()}
 ctx.fillStyle='#ffe59b';ctx.fillRect(0,H-70,W,70);ctx.strokeStyle='rgba(23,32,51,.18)';ctx.lineWidth=4;ctx.setLineDash([12,12]);ctx.beginPath();ctx.moveTo(W/2,18);ctx.lineTo(W/2,H-82);ctx.stroke();ctx.setLineDash([]);
 ctx.fillStyle='rgba(255,255,255,.35)';roundedRect(24,24,W-48,H-112,22);ctx.strokeStyle='rgba(255,255,255,.74)';ctx.lineWidth=4;ctx.stroke();
}
function drawPaddle(p,color,emoji){
 ctx.save();ctx.shadowColor='rgba(0,0,0,.18)';ctx.shadowBlur=14;ctx.shadowOffsetY=8;ctx.fillStyle=color;roundedRect(p.x,p.y,p.w,p.h,12);ctx.fill();ctx.shadowColor='transparent';ctx.fillStyle='#fff';ctx.font='700 20px system-ui';ctx.textAlign='center';ctx.fillText(emoji,p.x+p.w/2,p.y+p.h/2+7);ctx.restore();
}
function drawBall(){
 for(let i=0;i<ball.trail.length;i++){const t=ball.trail[i],a=(i+1)/ball.trail.length;ctx.globalAlpha=a*.12;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(t.x,t.y,ball.r*a*.8,0,7);ctx.fill()}ctx.globalAlpha=1;
 ctx.save();ctx.shadowColor='rgba(0,0,0,.22)';ctx.shadowBlur=12;ctx.shadowOffsetY=5;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,7);ctx.fill();ctx.shadowColor='transparent';ctx.strokeStyle='#ff9d3d';ctx.lineWidth=4;ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r*.58,-.7,2.2);ctx.stroke();ctx.restore();
}
function drawParticles(){ctx.textAlign='center';ctx.font='20px system-ui';for(const q of particles){ctx.globalAlpha=clamp(q.life/.7,0,1);ctx.fillText(q.char,q.x,q.y)}ctx.globalAlpha=1}
function draw(){
 drawCourt();drawPaddle(left,'#ff7f9f','1');drawPaddle(right,'#3e8fff',mode==='2p'?'2':'🤖');drawBall();drawParticles();
}
function frame(now){
 const dt=Math.min(.034,Math.max(0,(now-lastTime)/1000));lastTime=now;update(dt,now);draw();requestAnimationFrame(frame)
}
requestAnimationFrame(frame);

$('modeGrid').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(b)setMode(b.dataset.mode)});
$('startBtn').addEventListener('click',startGame);
$('rematchBtn').addEventListener('click',startGame);
$('resultMenuBtn').addEventListener('click',toMenu);
$('pauseMenuBtn').addEventListener('click',toMenu);
$('pauseBtn').addEventListener('click',()=>pause());
$('resumeBtn').addEventListener('click',()=>pause(false));
addEventListener('keydown',e=>{if(['KeyW','KeyS','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='KeyP')pause()},{passive:false});
addEventListener('keyup',e=>keys.delete(e.code));
document.querySelectorAll('[data-control]').forEach(btn=>{
 const k=btn.dataset.control;const on=e=>{e.preventDefault();touch[k]=true;btn.setPointerCapture?.(e.pointerId)};const off=e=>{e.preventDefault();touch[k]=false};
 btn.addEventListener('pointerdown',on);btn.addEventListener('pointerup',off);btn.addEventListener('pointercancel',off);btn.addEventListener('lostpointercapture',off);
});
function pointerToWorld(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
canvas.addEventListener('pointerdown',e=>{if(status!=='playing')return;const p=pointerToWorld(e);const side=p.x<W/2?'p1':'p2';if(side==='p2'&&mode!=='2p')return;drag[side]=p.y;canvas.setPointerCapture?.(e.pointerId);e.preventDefault()});
canvas.addEventListener('pointermove',e=>{if(!canvas.hasPointerCapture?.(e.pointerId))return;const p=pointerToWorld(e);if(p.x<W/2)drag.p1=p.y;else if(mode==='2p')drag.p2=p.y;e.preventDefault()});
const stopDrag=e=>{drag.p1=drag.p2=null;try{canvas.releasePointerCapture?.(e.pointerId)}catch(_){}};
canvas.addEventListener('pointerup',stopDrag);canvas.addEventListener('pointercancel',stopDrag);
addEventListener('blur',()=>{keys.clear();Object.keys(touch).forEach(k=>touch[k]=false);drag.p1=drag.p2=null;if(['playing','countdown','point'].includes(status))pause(true)});
setMode('cpu');resetPaddles();resetBall();updateHud();draw();
})();