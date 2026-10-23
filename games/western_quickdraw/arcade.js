(()=>{'use strict';
const $=id=>document.getElementById(id);
const canvas=$('playfield'),ctx=canvas.getContext('2d');
const MODES={
 gallery:{title:'서부 사격장',duration:48,tip:'움직이는 표적을 맞히세요. 여섯 발을 모두 쓰고 장전하면 배수가 올라가요.'},
 hurdles:{title:'목마 허들',duration:45,tip:'장애물 앞에서 점프! 완벽 점프 세 번마다 부스터를 쓸 수 있어요.'},
 coins:{title:'동전 명사수',duration:45,tip:'동전이 땅에 닿지 않게 튕겨요. 가까운 동전을 연달아 맞히면 보너스!'},
 cattle:{title:'우당탕 소몰이',duration:45,tip:'소가 지나갈 곳을 미리 누르세요. 올가미가 도착할 때 잡혀요.'},
 disco:{title:'춤추는 카우보이',duration:27,tip:'박자에 맞춰 4칸을 누르세요. 총알 여섯 발을 모두 쓰고 장전!'}
};
const STORAGE='kidscade-western-arcade-v1';
const ASSETS={
 horse:'../../assets/game/2d/animals/round/horse.png',
 cow:'../../assets/game/2d/animals/round/cow.png'
};
const FX={
 click:'../../assets/audio/sfx/collect/coin-pickup-01.mp3',
 reload:'../../assets/audio/sfx/combat/projectile-whoosh-01.mp3',
 hit:'../../assets/audio/sfx/combat/impact-heavy-01.mp3',
 win:'../../assets/audio/sfx/success/cheer-yay-01.mp3',
 lose:'../../assets/audio/sfx/failure/fail-sting-01.mp3'
};
const images={};for(const [name,url] of Object.entries(ASSETS)){const img=new Image();img.src=url;images[name]=img}
const sounds={};let audioEnabled=true;
function sound(name){if(!audioEnabled)return;try{const audio=sounds[name]||(sounds[name]=new Audio(FX[name]));audio.pause();audio.currentTime=0;audio.volume=.17;void audio.play().catch(()=>{})}catch(_){}}
function sdk(method,payload){try{window.KidscadeGame?.[method]?.(payload)}catch(_){}}
function load(){try{const raw=JSON.parse(localStorage.getItem(STORAGE)||'null');if(raw&&typeof raw==='object'&&!Array.isArray(raw))return raw}catch(_){}return {}}
let records=load(),mode=null,phase='menu',g=null,lastFrame=0,W=900,H=620;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const random=(a,b)=>a+(b-a)*Math.random();
function show(id,on){$(id).classList.toggle('hidden',!on)}
function announce(message){$('hint').textContent=message}
function best(modeName){return Number.isFinite(records[modeName])?records[modeName]:0}
function refreshRecords(){
 document.querySelectorAll('[data-best]').forEach(el=>{
  const number=best(el.dataset.best);el.textContent=number>0?'최고 '+number.toLocaleString('ko-KR')+'점':'최고 기록 —';
 })
}
function menu(){
 phase='menu';g=null;mode=null;show('arcadeMenu',true);show('session',false);show('finishScreen',false);show('pauseScreen',false);refreshRecords();
}
function resetState(key){
 const duration=MODES[key].duration;
 return {mode:key,elapsed:0,duration,points:0,combo:0,level:1,lives:3,ammo:6,maxAmmo:6,
  multiplier:1,objects:[],spawnIn:0.6,feedback:'',feedbackTimer:0,
  obstacles:[],jumpY:0,jumpV:0,boost:0,boostTime:0,invincible:0,passed:0,distance:0,
  dropped:0,ropes:[],ropeCooldown:0,aim:{x:700,y:310},coinShots:0,
  notes:[],noteHits:0,misses:0,finished:false};
}
function start(key){
 if(!MODES[key])return;
 mode=key;phase='playing';g=resetState(key);
 if(key==='disco'){
  for(let i=0;i<36;i++)g.notes.push({lane:Math.floor(Math.random()*4),due:2+i*.68,done:false});
  g.duration=g.notes[g.notes.length-1].due+1.2;
 }else if(key==='coins'){spawnCoin()}
 show('arcadeMenu',false);show('finishScreen',false);show('pauseScreen',false);show('session',true);
 resize();
 $('gameName').textContent=MODES[key].title;
 $('actionBtn').classList.toggle('hidden',!['gallery','hurdles','cattle','disco'].includes(key));
 $('extraBtn').classList.toggle('hidden',key!=='hurdles');
 $('actionBtn').innerHTML=key==='hurdles'?'점프 <kbd>Space</kbd>':key==='cattle'?'올가미 <kbd>Space</kbd>':'장전 <kbd>R</kbd>';
 announce(MODES[key].tip);lastFrame=performance.now();updateHud();
 sdk('start',{mode:'arcade',miniGame:key});
 try{canvas.focus({preventScroll:true})}catch(_){}
}
function finish(clear,reason){
 if(phase!=='playing')return;
 phase='finish';g.finished=true;
 const points=Math.max(0,Math.floor(g.points));
 const old=best(mode);if(points>old){records[mode]=points;try{localStorage.setItem(STORAGE,JSON.stringify(records))}catch(_){}}
 sdk('result',{scope:'run',status:'completed',outcome:clear?'clear':'fail',mode:'arcade',miniGame:mode,arcadeScore:points,
  bestArcadeScore:best(mode),timeSeconds:Math.round(g.elapsed),endsSession:true});
 sound(clear?'win':'lose');
 $('endKicker').textContent=MODES[mode].title;
 $('endTitle').textContent=clear?'멋진 기록!':'이번 도전은 여기까지!';
 $('endText').textContent=reason||'한 번 더 하면 더 잘할 수 있어요.';
 $('endPoints').textContent=points.toLocaleString('ko-KR')+'점';
 $('endBest').textContent=best(mode).toLocaleString('ko-KR')+'점';
 show('session',false);show('finishScreen',true);
}
function pause(){
 if(phase!=='playing')return;
 phase='paused';show('pauseScreen',true);
}
function resume(){if(phase!=='paused')return;show('pauseScreen',false);phase='playing';lastFrame=performance.now()}
function message(s){g.feedback=s;g.feedbackTimer=1.3;announce(s)}
function score(value){
 g.points+=Math.max(0,value);updateHud();
}
function updateHud(){
 if(!g)return;
 $('points').textContent=Math.max(0,Math.floor(g.points)).toLocaleString('ko-KR')+'점';
 $('clock').textContent= mode==='disco'?g.notes.filter(n=>n.done).length+'/36':Math.max(0,Math.ceil(g.duration-g.elapsed))+'초';
 $('lives').textContent=mode==='gallery'||mode==='hurdles'||mode==='cattle'||mode==='coins'?'기회 '+g.lives:'실수 '+g.misses+'/12';
 $('actionBtn').disabled=mode==='hurdles'&&g.jumpY>0||mode==='cattle'&&g.ropeCooldown>0;
 $('extraBtn').disabled=mode!=='hurdles'||g.boost<3||g.boostTime>0;
}
function reload(){
 if(phase!=='playing'||!['gallery','disco'].includes(mode))return;
 const fullUsed=g.ammo===0;
 g.multiplier=fullUsed?Math.min(5,g.multiplier+1):1;
 g.ammo=g.maxAmmo;if(!fullUsed)g.combo=0;
 sound('reload');message(fullUsed?'완벽 장전! '+g.multiplier+'배':'일찍 장전했어요. 배수 초기화!');
}
function spawnGallery(){
 if(g.objects.length>=4)return;
 const kind=Math.random()<.68?'outlaw':Math.random()<.65?'bottle':'friendly';
 const y=random(Math.max(170,H*.23),Math.max(190,H*.68));
 let x=random(100,800);
 for(let attempt=0;attempt<9&&g.objects.some(o=>Math.hypot(x-o.x,y-o.y)<110);attempt++)x=random(100,800);
 g.objects.push({id:random(0,99999),kind,x,y,r:kind==='bottle'?29:40,age:0,ttl:random(2.6,3.5)});
}
function shotGallery(x,y){
 if(g.ammo<=0){message('총알이 없어요! 장전하세요.');return}
 g.ammo--;sound('hit');
 let bestTarget=null,near=Infinity;
 for(const o of g.objects){const d=Math.hypot(o.x-x,o.y-y);if(d<o.r+20&&d<near){bestTarget=o;near=d}}
 if(!bestTarget){g.combo=0;message('빗나갔어요!');return}
 g.objects.splice(g.objects.indexOf(bestTarget),1);
 if(bestTarget.kind==='friendly'){g.combo=0;g.multiplier=1;message('아군 표적이에요! 조심!');return}
 g.combo++;
 score((bestTarget.kind==='bottle'?35:100)*g.multiplier+Math.min(10,g.combo)*5);
 sound('click');message(bestTarget.kind==='bottle'?'병 표적 +보너스!':'정확해요! '+g.combo+'연속');
}
function stepGallery(dt){
 g.spawnIn-=dt;
 if(g.spawnIn<=0){spawnGallery();g.spawnIn=random(.9,1.35)*Math.max(.62,1-g.elapsed/125)}
 for(const o of [...g.objects]){
  o.age+=dt;
  if(o.age>=o.ttl){g.objects.splice(g.objects.indexOf(o),1);
   if(o.kind==='outlaw'){g.lives--;g.combo=0;message('놓친 표적! 남은 기회 '+g.lives)}
  }
 }
 if(g.lives<=0)finish(false,'표적을 세 번 놓쳤어요. 차분히 다시 도전!');
 else if(g.elapsed>=g.duration)finish(true,'끝까지 사격장을 지켰어요!');
}
function jump(){
 if(phase!=='playing'||mode!=='hurdles'||g.jumpY>0)return;
 g.jumpV=660;g.jumpY=.01;sound('reload');
}
function boost(){
 if(phase!=='playing'||mode!=='hurdles'||g.boost<3||g.boostTime>0)return;
 g.boost-=3;g.boostTime=3.5;g.invincible=3.5;message('질주 부스터!');sound('win');
}
function spawnObstacle(){
 const kind=Math.random()<.23?'gap':Math.random()<.55?'dynamite':'barrel';
 g.obstacles.push({kind,x:955,w:kind==='gap'?65:46,passed:false,hit:false});
}
function stepHurdles(dt){
 const speed=(252+Math.min(95,g.elapsed*2))*(g.boostTime>0?1.55:1);
 g.boostTime=Math.max(0,g.boostTime-dt);g.invincible=Math.max(0,g.invincible-dt);
 g.jumpY=Math.max(0,g.jumpY+g.jumpV*dt);
 if(g.jumpY>0)g.jumpV-=1550*dt;else g.jumpV=0;
 g.distance+=dt*speed*.086;g.points=Math.floor(g.distance);
 g.spawnIn-=dt;if(g.spawnIn<=0){spawnObstacle();g.spawnIn=random(1.5,2.15)}
 for(const ob of [...g.obstacles]){
  ob.x-=speed*dt;
  const atPlayer=ob.x<198&&ob.x+ob.w>150;
  if(atPlayer&&!ob.hit){
   ob.hit=true;
   const required=ob.kind==='gap'?54:ob.kind==='dynamite'?100:72;
   if(g.jumpY<required&&g.invincible<=0){g.lives--;g.invincible=1.2;message('앗, 장애물! 기회 '+g.lives);sound('lose')}
   else if(g.jumpY>=required&&g.boostTime<=0){g.boost=Math.min(6,g.boost+1);score(35);message('완벽 점프! 부스터 '+Math.min(g.boost,3)+'/3')}
  }
  if(ob.x+ob.w<0)g.obstacles.splice(g.obstacles.indexOf(ob),1);
 }
 if(g.lives<=0)finish(false,'장애물을 세 번 만났어요. 점프 타이밍을 바꿔봐요.');
 else if(g.elapsed>=g.duration)finish(true,'목마와 함께 끝까지 달렸어요!');
}
function spawnCoin(){
 if(g.objects.length>=8)return;
 g.objects.push({x:random(100,800),y:Math.max(100,H*.25),vx:random(-95,95),vy:random(-200,-110),r:25});
}
function shotCoin(x,y){
 let target=null,distance=Infinity;
 for(const o of g.objects){const d=Math.hypot(o.x-x,o.y-y);if(d<o.r+22&&d<distance){target=o;distance=d}}
 if(!target){g.combo=0;message('동전을 잘 보고 눌러요!');return}
 target.vy=-random(420,500);target.vx=clamp(target.vx+random(-80,80),-220,220);
 g.combo++;g.coinShots++;score(20*Math.min(6,g.combo));sound('click');
 let chain=0;
 for(const other of g.objects){if(other===target)continue;
  if(Math.hypot(other.x-target.x,other.y-target.y)<75){other.vy=-360;other.vx+=random(-45,45);chain++;score(45*Math.min(4,chain))}
 }
 message(chain?'동전 '+(chain+1)+'개 연쇄!':'톡! '+g.combo+'연속');
}
function stepCoins(dt){
 g.spawnIn-=dt;if(g.spawnIn<=0){spawnCoin();g.spawnIn=random(1.9,2.5)}
 for(const o of [...g.objects]){
  o.vy+=260*dt;o.x+=o.vx*dt;o.y+=o.vy*dt;
  if(o.x<35){o.x=35;o.vx=Math.abs(o.vx)}
  if(o.x>865){o.x=865;o.vx=-Math.abs(o.vx)}
  if(o.y>H-145){g.objects.splice(g.objects.indexOf(o),1);g.lives--;g.combo=0;message('동전을 놓쳤어요!')}
 }
 if(g.lives<=0)finish(false,'동전이 세 번 떨어졌어요. 잘 보고 튕겨봐요.');
 else if(g.elapsed>=g.duration)finish(true,'동전이 땅에 떨어지지 않게 잘 버텼어요!');
}
function spawnCow(){
 if(g.objects.length>=6)return;
 const lane=Math.floor(random(0,4));
 const minY=Math.max(180,H*.25),maxY=Math.min(H-195,H*.70);
 g.objects.push({x:-65,y:minY+(maxY-minY)*(lane+.5)/4,vx:random(150,244)+g.elapsed*.85,r:37});
}
function throwLasso(x,y){
 if(g.ropeCooldown>0)return;
 g.ropeCooldown=.55;
 g.ropes.push({x:clamp(x,30,870),y:clamp(y,110,H-140),remaining:.32,total:.32});
 sound('reload');
}
function stepCattle(dt){
 g.spawnIn-=dt;g.ropeCooldown=Math.max(0,g.ropeCooldown-dt);
 if(g.spawnIn<=0){spawnCow();g.spawnIn=random(1.25,1.85)}
 for(const o of [...g.objects]){
  o.x+=o.vx*dt;
  if(o.x>970){g.objects.splice(g.objects.indexOf(o),1);g.lives--;g.combo=0;message('소가 달아났어요!')}
 }
 for(const r of [...g.ropes]){
  r.remaining-=dt;
  if(r.remaining<=0){
   let hits=0;
   for(const o of [...g.objects])if(Math.hypot(o.x-r.x,o.y-r.y)<o.r+33){g.objects.splice(g.objects.indexOf(o),1);hits++}
   g.ropes.splice(g.ropes.indexOf(r),1);
   if(hits){g.combo++;score(hits*90*Math.min(5,g.combo)+(hits>1?hits*60:0));message(hits>1?hits+'마리 한꺼번에!':'잡았다! '+g.combo+'연속');sound('click')}
   else{g.combo=0;message('아쉽게 비껴갔어요. 조금 앞을 노려봐요!')}
  }
 }
 if(g.lives<=0)finish(false,'세 마리가 울타리를 넘어갔어요.');
 else if(g.elapsed>=g.duration)finish(true,'우리의 소들을 잘 돌봤어요!');
}
function laneX(i){return 140+Math.round((i+.5)*620/4)}
function shotDisco(lane){
 if(g.ammo<=0){message('장전! R 또는 아래 버튼');return}
 g.ammo--;
 let note=null,delta=.22;
 for(const n of g.notes)if(!n.done&&n.lane===lane){
  const diff=Math.abs(n.due-g.elapsed);if(diff<delta){delta=diff;note=n}
 }
 if(!note){g.combo=0;g.misses++;message('박자를 놓쳤어요!');sound('lose');return}
 note.done=true;g.noteHits++;g.combo++;
 const perfect=delta<=.09;score((perfect?120:70)*g.multiplier+Math.min(12,g.combo)*5);
 message(perfect?'완벽한 박자!':'좋은 타이밍!');sound('click');
}
function stepDisco(dt){
 for(const n of g.notes)if(!n.done&&g.elapsed>n.due+.22){n.done=true;g.combo=0;g.misses++}
 if(g.misses>=12)finish(false,'박자를 조금 놓쳤어요. 음악에 맞춰 다시 해봐요.');
 else if(g.notes.every(n=>n.done))finish(true,'마지막 박자까지 멋지게 연주했어요!');
}
function tick(dt){
 if(phase!=='playing'||!g)return;
 g.elapsed+=dt;g.feedbackTimer=Math.max(0,g.feedbackTimer-dt);
 if(mode==='gallery')stepGallery(dt);
 else if(mode==='hurdles')stepHurdles(dt);
 else if(mode==='coins')stepCoins(dt);
 else if(mode==='cattle')stepCattle(dt);
 else if(mode==='disco')stepDisco(dt);
 if(phase==='playing')updateHud();
}
function pointerPosition(e){
 const rect=canvas.getBoundingClientRect();return {
 x:clamp((e.clientX-rect.left)/Math.max(1,rect.width)*W,0,W),
 y:clamp((e.clientY-rect.top)/Math.max(1,rect.height)*H,0,H)
 };
}
function shootAt(x,y){
 if(phase!=='playing')return;
 g.aim={x,y};
 if(mode==='gallery')shotGallery(x,y);
 if(mode==='hurdles')jump();
 if(mode==='coins')shotCoin(x,y);
 if(mode==='cattle')throwLasso(x,y);
 if(mode==='disco'){
  if(x<105||x>795)return;
  const lane=clamp(Math.floor((x-140)/155),0,3);
  shotDisco(lane);
 }
}
function primaryAction(){
 if(phase!=='playing')return;
 if(mode==='gallery'||mode==='disco')reload();
 else if(mode==='hurdles')jump();
 else if(mode==='cattle')throwLasso(g.aim.x,g.aim.y);
}
canvas.addEventListener('pointerdown',e=>{if(phase!=='playing')return;e.preventDefault();const p=pointerPosition(e);shootAt(p.x,p.y)},{passive:false});
canvas.addEventListener('pointermove',e=>{if(phase==='playing'&&mode==='cattle')g.aim=pointerPosition(e)});
window.addEventListener('keydown',e=>{
 if(phase!=='playing'||e.repeat||e.target?.closest?.('button,a'))return;
 const key=e.code;
 if(key==='Escape'){e.preventDefault();pause();return}
 if(key==='KeyR'&&(mode==='gallery'||mode==='disco')){e.preventDefault();reload();return}
 if(key==='KeyB'&&mode==='hurdles'){e.preventDefault();boost();return}
 if(mode==='disco'){
  const lane={KeyA:0,KeyS:1,KeyK:2,KeyL:3}[key];
  if(lane!==undefined){e.preventDefault();shotDisco(lane)}return;
 }
 if(key==='Space'){
  e.preventDefault();if(mode==='hurdles')jump();else shootAt(g.aim.x,g.aim.y);return;
 }
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(key)){
  e.preventDefault();
  g.aim.x=clamp(g.aim.x+(key==='ArrowLeft'?-42:key==='ArrowRight'?42:0),35,865);
  g.aim.y=clamp(g.aim.y+(key==='ArrowUp'?-42:key==='ArrowDown'?42:0),130,H-155);
 }
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
window.addEventListener('blur',pause);
document.querySelectorAll('[data-arcade]').forEach(b=>b.addEventListener('click',()=>start(b.dataset.arcade)));
$('actionBtn').addEventListener('click',primaryAction);
$('extraBtn').addEventListener('click',boost);
$('pauseBtn').addEventListener('click',pause);
$('resumeBtn').addEventListener('click',resume);
$('pauseMenuBtn').addEventListener('click',menu);
$('menuBtn').addEventListener('click',menu);
$('retryBtn').addEventListener('click',()=>start(mode));
function resize(){
 const r=canvas.getBoundingClientRect(),ratio=window.devicePixelRatio||1;
 const dpr=Math.min(2,ratio);
 canvas.width=Math.max(1,Math.floor(r.width*dpr));canvas.height=Math.max(1,Math.floor(r.height*dpr));
 W=900;H=clamp(Math.floor(900*r.height/Math.max(1,r.width)),490,1700);
}
window.addEventListener('resize',resize);resize();
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h)}
function circle(x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
function line(x1,y1,x2,y2,color,width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function text(s,x,y,px=22,color='#4e4d48',align='center'){
 ctx.fillStyle=color;ctx.font='800 '+px+'px system-ui,sans-serif';ctx.textAlign=align;ctx.fillText(s,x,y);
}
function sprite(name,x,y,w,h){
 const img=images[name];
 if(img?.complete&&img.naturalWidth>0){
  ctx.save();ctx.filter='grayscale(1) contrast(.85)';ctx.drawImage(img,x,y,w,h);ctx.restore();return true
 }
 return false;
}
function background(){
 rect(0,0,W,H,'#faf9f6');
 circle(755,Math.max(110,H*.20),72,'#eee4d5');
 line(0,H*.77,900,H*.77,'#c5c1ba',4);
 ctx.fillStyle='#e7e4db';ctx.beginPath();ctx.moveTo(0,H*.70);ctx.lineTo(195,H*.67);ctx.lineTo(310,H*.72);ctx.lineTo(520,H*.66);ctx.lineTo(900,H*.71);ctx.lineTo(900,H*.77);ctx.closePath();ctx.fill();
 for(const [x,y] of [[50,.76],[840,.76]]){
  const ground=H*y;rect(x,ground-68,36,68,'#d7d1c6');rect(x-7,ground-73,50,8,'#929088');rect(x+9,ground-49,14,18,'#f7f3ea');
 }
}
function character(x,y,scale=1){
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
 rect(-13,-45,26,20,'#c5c0b8');rect(-23,-67,46,10,'#55534f');rect(-16,-84,32,24,'#55534f');
 rect(-22,-20,44,47,'#76736c');rect(-16,25,11,27,'#585650');rect(7,25,11,27,'#585650');
 rect(-30,-14,10,34,'#969087');rect(20,-14,10,34,'#969087');rect(-18,-25,36,8,'#b28069');ctx.restore();
}
function paintGallery(){
 const targets=g.objects;
 text('서부 사격장',450,Math.max(142,H*.16),32);
 targets.forEach(o=>{
  const urgency=clamp(o.age/o.ttl,0,1);
  line(o.x-48,o.y+60,o.x+48,o.y+60,'#aea69b',4);
  if(o.kind==='outlaw'){circle(o.x,o.y,38,'#66645e');rect(o.x-35,o.y-44,70,13,'#46453f');rect(o.x-22,o.y-58,44,24,'#46453f');circle(o.x-12,o.y-5,4,'#faf9f6');circle(o.x+13,o.y-5,4,'#faf9f6')}
  else if(o.kind==='friendly'){circle(o.x,o.y,37,'#bdb9b2');circle(o.x,o.y-2,19,'#faf9f6');text('✓',o.x,o.y+12,31,'#63645f')}
  else{rect(o.x-13,o.y-40,26,75,'#a29c91');rect(o.x-23,o.y-40,46,11,'#e8dfd1')}
  rect(o.x-34,o.y+46,68,7,'#e0d8ce');rect(o.x-34,o.y+46,(1-urgency)*68,7,urgency>.72?'#a25f4a':'#7f8274');
 });
 text('탄약 '+g.ammo+'/6',450,H-110,28);
 text('연속 '+g.combo+' · '+g.multiplier+'배',450,H-68,20);
}
function paintHurdles(){
 const ground=H*.76;
 rect(0,ground+5,900,H-ground-5,'#e7e2d8');
 for(let x=0;x<900;x+=60)line(x,ground+12,x+24,ground+12,'#c9c3b6',3);
 const y=ground-40-g.jumpY;
 if(!sprite('horse',119,y-62,100,90))character(165,y,1.2);
 character(170,y-52,.65);
 for(const ob of g.obstacles){
  if(ob.kind==='gap'){rect(ob.x,ground+4,ob.w,30,'#77716a');rect(ob.x+3,ground+6,ob.w-6,23,'#46403c')}
  else if(ob.kind==='dynamite'){rect(ob.x,ground-45,ob.w,45,'#9f7a6b');text('!',ob.x+ob.w/2,ground-10,29,'#fff')}
  else{rect(ob.x,ground-44,ob.w,44,'#8a8376');line(ob.x+8,ground-40,ob.x+8,ground-4,'#ddd7cb',3)}
 }
 text('질주 '+Math.round(g.distance)+' m',440,Math.max(158,H*.2),30);
 text('완벽 점프 '+Math.min(g.boost,3)+'/3',440,H-114,21);
 if(g.boostTime>0)text('부스터!',450,H*.38,32,'#a65f4a');
}
function paintCoins(){
 text('동전 명사수',450,Math.max(145,H*.17),31);
 g.objects.forEach(o=>{
  circle(o.x,o.y,o.r+3,'#dad5cb');circle(o.x,o.y,o.r-3,'#9e998f');circle(o.x,o.y,o.r-9,'#f4f0e7');
  text('★',o.x,o.y+8,25,'#938779');
 });
 text('튕긴 동전 '+g.coinShots+'개',450,H-104,22);
}
function paintCattle(){
 text('우당탕 소몰이',450,Math.max(144,H*.16),31);
 g.objects.forEach(o=>{
  if(!sprite('cow',o.x-39,o.y-29,78,58)){
   circle(o.x,o.y,30,'#a8a39b');rect(o.x-26,o.y+18,12,24,'#6e6d68');rect(o.x+15,o.y+18,12,24,'#6e6d68');circle(o.x+26,o.y-14,17,'#918b81');
  }
  line(o.x-20,o.y+42,o.x+20,o.y+42,'#bcb7ad',2);
 });
 character(90,H*.80,1.15);
 for(const r of g.ropes){
  const p=clamp(1-r.remaining/r.total,0,1);
  line(113,H*.78,113+(r.x-113)*p,H*.78+(r.y-H*.78)*p,'#968777',3);
  ctx.strokeStyle='#9a7b61';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(r.x,r.y,36*p+3,20*p+3,0,0,Math.PI*2);ctx.stroke();
 }
 ctx.strokeStyle='#9c8979';ctx.lineWidth=2;ctx.beginPath();ctx.arc(g.aim.x,g.aim.y,26,0,Math.PI*2);ctx.stroke();
 line(g.aim.x-35,g.aim.y,g.aim.x+35,g.aim.y,'#9c8979',1);line(g.aim.x,g.aim.y-35,g.aim.x,g.aim.y+35,'#9c8979',1);
 text('잡은 소 '+Math.round(g.points/90)+'점수',450,H-110,19);
}
function paintDisco(){
 const lineY=H*.74;
 const left=140,space=155;
 for(let i=0;i<4;i++){
  const x=laneX(i);
  rect(x-65,135,130,lineY-110,'#efebe5');
  rect(x-65,lineY-5,130,8,'#b4ada3');
  if(g.elapsed<g.duration*.5)text(['A','S','K','L'][i],x,lineY+52,32,'#7d776f');
 }
 for(const n of g.notes){
  if(n.done)continue;
  const ahead=n.due-g.elapsed;
  if(ahead>1.9||ahead<-.26)continue;
  const y=lineY-ahead*265;
  if(y<125)continue;
  const x=laneX(n.lane);circle(x,y,28,'#9f9a91');circle(x,y,18,'#e7e0d6');
 }
 text('맞힌 박자 '+g.noteHits+'/36',450,Math.max(104,H*.13),29);
 text('탄약 '+g.ammo+'/6 · '+g.multiplier+'배 · 연속 '+g.combo,450,H-106,23);
}
function draw(){
 if(phase!=='playing'||!g)return;
 ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
 ctx.clearRect(0,0,W,H);background();
 if(mode==='gallery')paintGallery();
 else if(mode==='hurdles')paintHurdles();
 else if(mode==='coins')paintCoins();
 else if(mode==='cattle')paintCattle();
 else if(mode==='disco')paintDisco();
 if(g.feedbackTimer>0){
  rect(160,H*.34,580,62,'#fffdf8e8');
  text(g.feedback,450,H*.34+39,25,'#a3624d');
 }
}
function loop(t){
 requestAnimationFrame(loop);
 if(phase!=='playing')return;
 const dt=clamp((t-lastFrame)/1000,0,.05);lastFrame=t;
 tick(dt);if(phase==='playing')draw();
}
refreshRecords();requestAnimationFrame(loop);
window.KidscadeWesternArcade=Object.freeze({
 modes:Object.keys(MODES),
 getState:()=>g?{mode,phase,points:g.points,lives:g.lives,ammo:g.ammo,combo:g.combo,multiplier:g.multiplier,elapsed:g.elapsed,spawned:g.objects.length,notesDone:g.notes.filter(n=>n.done).length,boost:g.boost,jumpY:g.jumpY,ropes:g.ropes.length,misses:g.misses}: {mode:null,phase:'menu'},
 getBest:name=>best(name)
});
})();