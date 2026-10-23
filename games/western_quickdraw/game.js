(()=>{'use strict';
const $=id=>document.getElementById(id);
const canvas=$('scene'),ctx=canvas.getContext('2d'),app=$('app');
const names=['졸린 빌리','느긋한 샘','수염 잭','모자 쓴 루','독수리 톰','먼지바람 조','검은 모자 맥','번개 손 벤','황혼의 제인','전설의 눈'];
const cpuTimes=[352,334,315,297,277,255,231,205,180,160];
const storeKey='kidscade-western-quickdraw-v1';
let saved={unlocked:1,best:null,cleared:[]};
try{const p=JSON.parse(localStorage.getItem(storeKey)||'null');if(p&&typeof p==='object'){saved.unlocked=Math.max(1,Math.min(10,Number(p.unlocked)||1));saved.best=Number.isFinite(p.best)&&p.best>0?p.best:null;saved.cleared=Array.isArray(p.cleared)?p.cleared.filter(n=>Number.isInteger(n)&&n>=0&&n<10):[]}}catch(_){}
let mode='solo',difficulty='normal',opponent=0,target=5,state='menu',scores=[0,0],round=0;
let signalAt=0,cpuAt=Infinity,playerShot=null,shotAt=null,endedBy=null,shotSide=-1,phaseStart=0,animT=0;
let timers=[],frame=0,soundOn=true,currentToken=0,matchResults=[],bestThisMatch=null,pendingHit=null,assets={};
const dpr=()=>Math.min(window.devicePixelRatio||1,2);
function save(){try{localStorage.setItem(storeKey,JSON.stringify(saved))}catch(_){}}
function later(fn,ms){const id=setTimeout(fn,ms);timers.push(id);return id}
function cancelTimers(){timers.forEach(clearTimeout);timers=[];currentToken++;pendingHit=null}
function sound(type){if(!soundOn)return;const urls={
 signal:'../../assets/audio/sfx/combat/projectile-whoosh-01.mp3',
 shoot:'../../assets/audio/sfx/combat/impact-heavy-01.mp3',
 win:'../../assets/audio/sfx/success/cheer-yay-01.mp3',
 lose:'../../assets/audio/sfx/failure/fail-sting-01.mp3'
};try{let a=assets[type];if(!a){a=new Audio(urls[type]);a.preload='auto';assets[type]=a}a.pause();a.currentTime=0;a.volume=type==='signal'?.14:.22;void a.play().catch(()=>{})}catch(_){}}
function sdk(method,arg){try{const game=window.KidscadeGame;if(typeof game?.[method]==='function')game[method](arg)}catch(_){}}
function setVisible(id,visible){$(id).classList.toggle('hidden',!visible)}
function setSignal(text,bang=false){$('centerSignal').textContent=text;$('centerSignal').classList.toggle('bang',bang)}
function drawMarks(id,value){$(id).innerHTML='';for(let i=0;i<target;i++){const mark=document.createElement('i');if(i<value)mark.className='won';$(id).appendChild(mark)}}
function refreshMenu(){
 const select=$('opponent');select.innerHTML='';
 names.forEach((name,i)=>{const o=document.createElement('option');o.value=String(i);o.disabled=i>=saved.unlocked;o.textContent=(i+1)+'. '+name+(i>=saved.unlocked?' · 잠김':'');select.appendChild(o)});
 if(opponent>=saved.unlocked)opponent=saved.unlocked-1;select.value=String(opponent);
 $('progressText').textContent='해금 '+saved.unlocked+'/10'+(saved.best?' · 최고 '+Math.round(saved.best)+'ms':'');
}
function chooseMode(m){
 mode=m;document.querySelectorAll('[data-mode]').forEach(el=>{const active=el.dataset.mode===m;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active))});
 setVisible('soloOptions',m==='solo');setVisible('duoOptions',m==='duo');setVisible('practiceOptions',m==='practice');
 $('help').innerHTML=m==='duo'?'화면 위쪽은 친구, 아래쪽은 나!<br>PC는 <kbd>W</kbd> (위) · <kbd>↑</kbd> (아래)':
 m==='practice'?'불빛이 켜지면 빠르게 터치해요.<br>PC에서는 <kbd>스페이스</kbd>':'‘탕!’이 나왔을 때 누르세요. 너무 빨리 누르면 실격!<br>PC에서는 <kbd>스페이스</kbd>';
}
function startMatch(){
 cancelTimers();difficulty=$('difficulty').value;opponent=Number($('opponent').value)||0;target=mode==='duo'?Number($('target').value)||5:5;
 scores=[0,0];round=0;matchResults=[];bestThisMatch=null;
 document.body.classList.toggle('duo',mode==='duo');$('topName').textContent=mode==='duo'?'친구':mode==='solo'?names[opponent]:'연습';
 $('bottomName').textContent=mode==='duo'?'나':'보안관';
 $('topScore').textContent='0';$('bottomScore').textContent='0';drawMarks('topMarks',0);drawMarks('bottomMarks',0);
 setVisible('menu',false);setVisible('result',false);setVisible('pause',false);setVisible('hud',true);setVisible('instruction',mode==='duo');
 sdk('start',{mode,difficulty,opponent:mode==='solo'?opponent:null});
 beginRound();try{app.focus({preventScroll:true})}catch(_){}
}
function beginRound(){
 cancelTimers();round++;const token=currentToken;state='ready';phaseStart=performance.now();shotAt=null;endedBy=null;shotSide=-1;playerShot=null;
 $('reactionInfo').textContent='';$('roundInfo').textContent=mode==='practice'?'연습 '+Math.min(scores[0]+1,5)+'/5':'라운드 '+round;
 setSignal('준비…');
 later(()=>{if(token!==currentToken||state!=='ready')return;state='steady';phaseStart=performance.now();setSignal('기다려…')},650);
 const randomWait=1250+Math.random()*2700;
 later(()=>{
  if(token!==currentToken||state!=='steady')return;
  state='bang';signalAt=performance.now();phaseStart=signalAt;setSignal('탕!',true);sound('signal');
  if(mode==='solo'){
   const offsets={easy:105,normal:0,hard:-30};const jitter=(Math.random()-.5)*52;
   cpuAt=signalAt+Math.max(125,cpuTimes[opponent]+offsets[difficulty]+jitter);
   later(()=>{if(token===currentToken&&state==='bang')resolveShot(1,cpuAt-signalAt,'cpu')},Math.max(0,cpuAt-performance.now()));
  }
 },650+randomWait);
}
function finishRound(winner,elapsed,reason){
 if(state==='resolve'||state==='finished'||state==='menu'||state==='pause')return;
 const prev=state;cancelTimers();state='resolve';phaseStart=performance.now();animT=phaseStart;endedBy=winner;shotSide=winner;
 if(winner===0)scores[0]++;else if(winner===1)scores[1]++;
 if(Number.isFinite(elapsed)&&reason==='player') {
  matchResults.push(elapsed);bestThisMatch=bestThisMatch===null?elapsed:Math.min(bestThisMatch,elapsed);
  if(saved.best===null||elapsed<saved.best){saved.best=elapsed;save()}
 }
 $('bottomScore').textContent=String(scores[0]);$('topScore').textContent=String(scores[1]);
 drawMarks('bottomMarks',scores[0]);drawMarks('topMarks',scores[1]);
 let msg='';
 if(reason==='early'){msg=winner===0?'상대가 먼저 움직였어요!':'너무 일찍 눌렀어요!'}
 else if(reason==='cpu'){msg='현상범이 먼저 쐈어요!'}
 else if(reason==='tie'){msg='동시에 눌렀어요!'}
 else {msg=Number.isFinite(elapsed)?Math.round(elapsed)+'ms · '+(winner===0?'성공!':'친구 승리!'):'좋아요!'}
 setSignal(reason==='tie'?'무승부':winner===0?'승리!':winner===1?'아쉬워요!':'다시!');
 $('reactionInfo').textContent=msg;
 sound(winner===0?'win':winner===1?'lose':'signal');
 const token=currentToken;
 later(()=>{if(token!==currentToken)return;if(mode==='practice'?scores[0]>=5:scores[0]>=target||scores[1]>=target)endMatch();
 else beginRound()},1450);
}
function resolveShot(side,elapsed,reason){
 if(state!=='bang')return;
 if(mode==='solo'&&side===0&&performance.now()>=cpuAt){finishRound(1,cpuAt-signalAt,'cpu');return}
 if(mode==='practice'){finishRound(0,elapsed,'player');return}
 if(mode==='duo'){
  const t=performance.now();
  if(!pendingHit){
   pendingHit={side,t,elapsed};const token=currentToken;
   later(()=>{if(token!==currentToken||state!=='bang'||!pendingHit)return;const p=pendingHit;pendingHit=null;finishRound(p.side,p.elapsed,p.side===0?'player':'duo')},22);
  }else if(pendingHit.side!==side){
   const p=pendingHit;pendingHit=null;
   if(Math.abs(p.t-t)<3)finishRound(null,null,'tie');
   else{const w=p.t<t?p.side:side;finishRound(w,w===p.side?p.elapsed:elapsed,w===0?'player':'duo')}
  }
  return;
 }
 finishRound(side,elapsed,reason);
}
function fire(side){
 if(!['ready','steady','bang'].includes(state))return;
 if(mode!=='duo'&&side!==0)return;
 if(state!=='bang'){
  if(mode==='practice'){finishRound(null,null,'early');return}
  finishRound(1-side,null,'early');return;
 }
 const reaction=performance.now()-signalAt;
 resolveShot(side,reaction,side===0?'player':'duo');
}
function endMatch(){
 cancelTimers();state='finished';const won=scores[0]>=target;let newUnlock=false;
 if(mode==='solo'&&won){if(!saved.cleared.includes(opponent))saved.cleared.push(opponent);
 if(opponent+1===saved.unlocked&&saved.unlocked<10){saved.unlocked++;newUnlock=true}save()}
 sdk('result',{scope:'match',status:'completed',outcome:mode==='practice'?'clear':won?'win':'loss',
 ...(mode==='practice'?{}:{score:scores[0],scoreOptions:{unit:'승',higherIsBetter:true}}),
 mode,opponent:mode==='solo'?opponent:null,playerWins:scores[0],opponentWins:scores[1],bestReactionMs:bestThisMatch===null?null:Math.round(bestThisMatch)});
 $('resultEyebrow').textContent=mode==='practice'?'반응속도 기록':mode==='duo'?'친구와의 승부':'현상범 도전';
 $('resultTitle').textContent=mode==='practice'?'연습 완료!':won?'승리!':'다음에는 이겨봐요!';
 $('resultMessage').textContent=mode==='practice'?'다섯 번의 신호에 잘 반응했어요.':mode==='duo'?(won?'아래쪽 보안관이 승리했어요!':'위쪽 친구가 승리했어요!'):(won?names[opponent]+'을(를) 이겼어요!':names[opponent]+'에게 졌어요. 다시 도전해요!');
 $('resultTime').textContent=bestThisMatch===null?'—':Math.round(bestThisMatch)+'ms';
 $('resultScore').textContent=mode==='practice'?scores[0]+'/5':scores[0]+' : '+scores[1];
 $('resultRecord').textContent=newUnlock?'새 현상범이 해금됐어요!':saved.best?'내 최고 반응 '+Math.round(saved.best)+'ms':'';
 $('continueButton').textContent=mode==='solo'&&newUnlock?'다음 현상범 도전':mode==='practice'?'다시 연습':'다시 도전';
 setVisible('hud',false);setVisible('instruction',false);setVisible('result',true);refreshMenu();
}
function goHome(){cancelTimers();state='menu';document.body.classList.remove('duo');setVisible('hud',false);setVisible('pause',false);setVisible('result',false);setVisible('instruction',false);setVisible('menu',true);setSignal('');refreshMenu()}
function pause(){
 if(!['ready','steady','bang'].includes(state))return;
 cancelTimers();state='pause';setVisible('pause',true);
}
function resume(){if(state!=='pause')return;setVisible('pause',false);beginRound()}
function onShotPointer(e){
 if(state==='pause'||e.target.closest('button,select,.overlay'))return;
 if(!['ready','steady','bang'].includes(state))return;
 e.preventDefault();
 const r=canvas.getBoundingClientRect();
 const y=e.clientY-r.top;
 const side=mode==='duo'?(y<r.height/2?1:0):0;
 fire(side);
}
canvas.addEventListener('pointerdown',onShotPointer,{passive:false});
window.addEventListener('keydown',e=>{
 if(!['Space','KeyW','ArrowUp','Enter'].includes(e.code))return;
 if(e.repeat||e.target.matches('button,select,input'))return;
 if(!['ready','steady','bang'].includes(state))return;
 if(mode==='duo'&&!['KeyW','ArrowUp'].includes(e.code))return;
 e.preventDefault();fire(mode==='duo'&&e.code==='KeyW'?1:0);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
window.addEventListener('blur',pause);
document.querySelectorAll('[data-mode]').forEach(el=>el.addEventListener('click',()=>chooseMode(el.dataset.mode)));
$('opponent').addEventListener('change',e=>opponent=Number(e.target.value)||0);
$('startButton').addEventListener('click',startMatch);
$('continueButton').addEventListener('click',()=>{
 if(mode==='solo'&&scores[0]>=target&&opponent+1<saved.unlocked){opponent++;$('opponent').value=String(opponent)}
 startMatch();
});
$('resultHome').addEventListener('click',goHome);$('pauseHome').addEventListener('click',goHome);
$('pauseButton').addEventListener('click',pause);$('resumeButton').addEventListener('click',resume);
$('soundButton').addEventListener('click',()=>{soundOn=!soundOn;$('soundButton').textContent=soundOn?'소리 켜짐':'소리 꺼짐';$('soundButton').setAttribute('aria-pressed',String(!soundOn))});
let W=0,H=0,scale=1;
function resize(){const r=canvas.getBoundingClientRect();W=r.width;H=r.height;scale=dpr();canvas.width=Math.max(1,Math.round(W*scale));canvas.height=Math.max(1,Math.round(H*scale));ctx.setTransform(scale,0,0,scale,0,0)}
window.addEventListener('resize',resize);resize();
function poly(points,color){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill()}
function cowboy(x,y,size,flip,side,t){
 ctx.save();ctx.translate(x,y);if(flip)ctx.rotate(Math.PI);ctx.scale(size,size);
 const hop=state==='resolve'&&endedBy!==side?Math.min(20,(t-animT)*.05):Math.sin(t*.002+side)*1.2;
 const defeated=state==='resolve'&&endedBy!==side;
 ctx.translate(0,hop*(defeated?-1:.05));if(defeated)ctx.rotate(Math.min(.85,(t-animT)/450)*(side===0?-1:1));
 const coat=side===0?'#6c6b67':'#989793',hat=side===0?'#41413f':'#686763';
 ctx.strokeStyle=coat;ctx.lineWidth=7;ctx.lineCap='square';
 ctx.beginPath();ctx.moveTo(-12,20);ctx.lineTo(-12,53);ctx.moveTo(12,20);ctx.lineTo(12,53);ctx.stroke();
 poly([[-19,-17],[19,-17],[25,27],[-25,27]],coat);
 ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-19,-11);ctx.lineTo(-30,12);ctx.moveTo(19,-11);ctx.lineTo(30,10);ctx.stroke();
 ctx.fillStyle='#c4c1ba';ctx.fillRect(-12,-40,24,24);
 poly([[-17,-16],[0,-5],[17,-16]],'#c4a290');
 const variant=side===0?0:opponent%4;
 poly([[-31,-43],[-18,-45],[-16,-64],[17,-64],[20,-45],[31,-43],[31,-38],[-31,-38]],hat);
 if(variant===1){ctx.fillStyle='#777';ctx.fillRect(-10,-62,20,4)}
 if(variant===2){ctx.fillStyle='#565656';ctx.fillRect(-18,-51,37,3)}
 if(variant===3){ctx.fillStyle='#777';ctx.fillRect(-19,-47,38,5)}
 ctx.fillStyle='#4f4e4b';ctx.fillRect(-8,-31,3,3);ctx.fillRect(6,-31,3,3);
 if(state==='resolve'&&shotSide===side){ctx.fillStyle='#b2765f';ctx.beginPath();ctx.arc(31,7,12,0,Math.PI*2);ctx.fill()}
 ctx.restore();
 if(state==='resolve'&&endedBy!==side&&t-animT<1250){
   const v=(t-animT)*.07;ctx.save();ctx.translate(x+(side===0?-1:1)*v,y-65*size-v*.8);ctx.rotate(v*.035);ctx.fillStyle='#676661';ctx.fillRect(-21*size,-5*size,42*size,8*size);ctx.restore()
 }
}
function scenery(t){
 ctx.fillStyle='#faf9f6';ctx.fillRect(0,0,W,H);
 // distant pastel dust clouds, barbed-wire-like ridge and a clear ground
 ctx.fillStyle='#eae6dd';ctx.beginPath();ctx.arc(W*.77,H*.2,Math.min(W,H)*.095,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#d8d5cf';ctx.lineWidth=1.2;ctx.beginPath();
 ctx.moveTo(0,H*.46);ctx.lineTo(W*.23,H*.43);ctx.lineTo(W*.44,H*.465);ctx.lineTo(W*.65,H*.445);ctx.lineTo(W,H*.475);ctx.stroke();
 ctx.strokeStyle='#bcb9b3';ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(W*.12,H*.37);ctx.lineTo(W*.43,H*.37);ctx.moveTo(W*.57,H*.77);ctx.lineTo(W*.88,H*.77);ctx.stroke();
 const cap=Math.min(W/330,H/700)*1.2;
 cowboy(W*(mode==='duo'?.5:.28),H*.29,Math.max(.62,Math.min(1.25,cap)),mode==='duo',1,t);
 cowboy(W*(mode==='duo'?.5:.72),H*.70,Math.max(.62,Math.min(1.25,cap)),false,0,t);
 if(state==='bang'){const h=Math.sin(t*.045)*.5+.5;ctx.fillStyle='rgba(166,95,74,'+(h*.14)+')';ctx.fillRect(0,0,W,H)}
 if(state==='resolve'){ctx.strokeStyle='#d4cec1';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(W*.19,H*.51);ctx.lineTo(W*.81,H*.51);ctx.stroke()}
}
function loop(t){frame=requestAnimationFrame(loop);if(!W||!H)return;ctx.clearRect(0,0,W,H);scenery(t)}
refreshMenu();chooseMode('solo');frame=requestAnimationFrame(loop);
window.KidscadeWesternQuickdraw=Object.freeze({getState:()=>({mode,state,scores:[...scores],round,opponent,target,best:saved.best}),getReactionLimit:(i,d='normal')=>Math.max(125,cpuTimes[i]+({easy:105,normal:0,hard:-30}[d]||0))});
})();