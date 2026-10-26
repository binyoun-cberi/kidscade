(()=>{'use strict';
const $=id=>document.getElementById(id);
const canvas=$('scene'),ctx=canvas.getContext('2d');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(a,b)=>a+(b-a)*Math.random();
const specs={
 horse:{name:'말',speed:34,stamina:7.5,icon:'🐎'},
 buffalo:{name:'물소',speed:29,stamina:8.2,icon:'🐃'},
 zebra:{name:'얼룩말',speed:39,stamina:6,icon:'🦓'},
 cow:{name:'소',speed:27,stamina:9.3,icon:'🐄'},
 goat:{name:'염소',speed:43,stamina:5.3,icon:'🐐'},
 elephant:{name:'코끼리',speed:25,stamina:5.7,icon:'🐘'}
};
const animalNames=Object.keys(specs);
const STORAGE='kidscade-western-stampede-v1';
const picture={};
for(const id of animalNames){const image=new Image();image.src='../../assets/game/2d/animals/round/'+id+'.png';picture[id]=image}
const fx={jump:'../../assets/audio/sfx/combat/projectile-whoosh-01.mp3',catch:'../../assets/audio/sfx/collect/coin-pickup-01.mp3',win:'../../assets/audio/sfx/success/cheer-yay-01.mp3',fail:'../../assets/audio/sfx/failure/fail-sting-01.mp3'};
const audios={};
function sfx(name){try{const a=audios[name]||(audios[name]=new Audio(fx[name]));a.pause();a.currentTime=0;a.volume=.19;void a.play().catch(()=>{})}catch(_){}}
function sdk(method,data){try{window.KidscadeGame?.[method]?.(data)}catch(_){}}
function load(){try{const v=JSON.parse(localStorage.getItem(STORAGE)||'null');if(v&&typeof v==='object'&&!Array.isArray(v))return {best:Math.max(0,Number(v.best)||0),tamed:Array.isArray(v.tamed)?v.tamed.filter(id=>specs[id]):[]}}catch(_){}return {best:0,tamed:[]}}
let saved=load(),phase='menu',g=null,lastFrame=0,W=900,H=900,primaryPointer=null,keys={left:false,right:false};
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(saved))}catch(_){}}
function show(id,on){$(id).classList.toggle('hidden',!on)}
function message(text){$('instruction').textContent=text}
function refreshRecords(){
 $('best').textContent='최고 거리 '+Math.floor(saved.best)+'m';
 $('collection').textContent='동물 도감 '+new Set(saved.tamed).size+'/'+animalNames.length;
}
function newAnimal(id,x,z){return {id,x,z,wobble:rand(-2,2),time:rand(0,7),tamed:false}}
function createGame(){
 return {time:0,distance:0,transfers:0,x:0,aimX:0,mount:'horse',mountTime:0,
  status:'mounted',held:false,airTimer:0,airAttempts:0,airFrom:0,invincible:2,
  animals:[newAnimal('buffalo',-.12,44),newAnimal('zebra',.48,78),newAnimal('cow',-.38,108)],
  rocks:[],nextAnimal:1.65,nextRock:3.2,flash:0,newFinds:[],reason:'',lastSpeed:34};
}
function setPhase(next){phase=next;show('menu',next==='menu');show('result',next==='result');show('paused',next==='pause');show('hud',next==='run');show('meter',next==='run');show('instruction',next==='run')}
function start(){
 g=createGame();primaryPointer=null;keys={left:false,right:false};
 setPhase('run');resize();lastFrame=performance.now();updateHUD();
 message('화면을 꾹 누르고 좌우로 끌어 보세요');
 sdk('start',{mode:'stampede',miniGame:'animal_hopping'});
 try{canvas.focus({preventScroll:true})}catch(_){}
}
function end(reason){
 if(phase!=='run'||!g)return;
 g.reason=reason;
 const meters=Math.floor(g.distance);
 if(meters>saved.best){saved.best=meters;save()}
 sdk('result',{scope:'run',status:'completed',outcome:meters>=60?'clear':'fail',
  mode:'stampede',miniGame:'animal_hopping',distanceMeters:meters,transfers:g.transfers,score:meters,
  scoreOptions:{unit:'m',higherIsBetter:true},animalsDiscovered:saved.tamed.length,endsSession:true});
 $('resultTitle').textContent=meters>=60?'멋진 질주!':'한 번 더 달려 봐요!';
 $('resultReason').textContent=reason;
 $('resultDistance').textContent=meters+'m';$('resultTransfers').textContent=g.transfers+'회';
 $('resultAnimals').textContent=g.newFinds.length?'새로 만난 동물: '+g.newFinds.map(id=>specs[id].name).join(' · '):'동물 등에 오래 머물러 새로운 친구를 발견해 보세요.';
 sfx(meters>=60?'win':'fail');refreshRecords();setPhase('result');
}
function home(){primaryPointer=null;g=null;setPhase('menu');refreshRecords()}
function pause(){if(phase==='run'){setPhase('pause');primaryPointer=null;if(g)g.held=false}}
function resume(){if(phase==='pause'){setPhase('run');lastFrame=performance.now();message(g.status==='air'?'다음 동물을 누르고 잡으세요!':'꾹 누르고 이어서 달려요!')}}
function tameIfReady(){
 if(!g||g.mountTime<2.4||saved.tamed.includes(g.mount))return;
 saved.tamed.push(g.mount);g.newFinds.push(g.mount);save();g.flash=1.5;
 message('새 친구! '+specs[g.mount].name+' 길들이기 성공!');
}
function leaveMount(){
 if(phase!=='run'||g.status!=='mounted')return;
 g.status='air';g.airTimer=1.35;g.airAttempts=0;g.airFrom=g.x;g.held=false;g.flash=.3;
 sfx('jump');message('점프! 다음 동물 위에서 다시 누르세요');
}
function landOn(animal){
 if(!animal||g.status!=='air')return false;
 const spec=specs[animal.id];
 g.mount=animal.id;g.mountTime=0;g.lastSpeed=spec.speed;g.transfers++;
 g.x=clamp(animal.x,-.94,.94);g.aimX=g.x;
 g.status='mounted';g.held=true;g.invincible=1.05;g.flash=.6;
 g.animals.splice(g.animals.indexOf(animal),1);
 sfx('catch');message(spec.icon+' '+spec.name+'에 올라탔어요! 손을 떼면 다시 점프!');
 return true;
}
function findLanding(){
 if(!g||g.status!=='air'||!g.held)return false;
 let target=null,best=Infinity;
 for(const a of g.animals){
  const delta=Math.abs(a.x-g.aimX);
  if(a.z<5||a.z>66||delta>.36)continue;
  const weight=delta*110+Math.abs(a.z-30)*.35;
  if(weight<best){best=weight;target=a}
 }
 if(target)return landOn(target);
 return false;
}
function steer(x){if(!g||phase!=='run')return;g.aimX=clamp(x,-.9,.9);if(g.status==='air')findLanding()}
function hold(){
 if(!g||phase!=='run')return;
 g.held=true;
 if(g.status==='air'){g.airAttempts++;if(!findLanding())message('올가미! 앞에 있는 동물을 조준해요')}
 else message('꾹 누르고 방향을 바꾸세요. 손을 떼면 점프!');
}
function release(){
 if(!g||phase!=='run')return;
 if(g.status==='mounted'&&g.held)leaveMount();
 else g.held=false;
}
function pointerX(e){
 const r=canvas.getBoundingClientRect();
 return clamp(((e.clientX-r.left)/Math.max(1,r.width)-.5)*2,-.95,.95);
}
canvas.addEventListener('pointerdown',e=>{
 if(phase!=='run'||primaryPointer!==null)return;
 e.preventDefault();primaryPointer=e.pointerId??1;
 try{canvas.setPointerCapture?.(primaryPointer)}catch(_){}
 steer(pointerX(e));hold();
},{passive:false});
canvas.addEventListener('pointermove',e=>{
 if(phase!=='run'||primaryPointer===null||e.pointerId!==primaryPointer)return;
 e.preventDefault();steer(pointerX(e));
},{passive:false});
function releasePointer(e,cancel=false){
 if(primaryPointer===null||e.pointerId!==primaryPointer)return;
 primaryPointer=null;
 if(cancel){pause();return}
 release();
}
canvas.addEventListener('pointerup',e=>releasePointer(e));
canvas.addEventListener('pointercancel',e=>releasePointer(e,true));
window.addEventListener('keydown',e=>{
 if(phase!=='run'||e.target?.closest?.('button,a'))return;
 if(e.code==='ArrowLeft'||e.code==='ArrowRight'){
  e.preventDefault();keys[e.code==='ArrowLeft'?'left':'right']=true;
 }else if(e.code==='Space'){
  e.preventDefault();if(!e.repeat)hold();
 }else if(e.code==='Escape'){e.preventDefault();pause()}
});
window.addEventListener('keyup',e=>{
 if(e.code==='ArrowLeft'||e.code==='ArrowRight')keys[e.code==='ArrowLeft'?'left':'right']=false;
 if(e.code==='Space'){e.preventDefault();release()}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
window.addEventListener('blur',pause);
$('startBtn').addEventListener('click',start);
$('retryBtn').addEventListener('click',start);
$('homeBtn').addEventListener('click',home);
$('pauseBtn').addEventListener('click',pause);
$('resumeBtn').addEventListener('click',resume);
$('pauseHomeBtn').addEventListener('click',home);
function spawnAnimals(){
 if(g.animals.length>14)return;
 const x=rand(-.74,.74),types=g.distance<75?['buffalo','cow','horse']:animalNames;
 const id=types[Math.floor(Math.random()*types.length)];
 const z=rand(125,172);
 if(g.animals.some(a=>Math.abs(a.z-z)<13&&Math.abs(a.x-x)<.3))return;
 g.animals.push(newAnimal(id,x,z));
}
function tick(dt){
 if(phase!=='run'||!g)return;
 g.time+=dt;g.flash=Math.max(0,g.flash-dt);g.invincible=Math.max(0,g.invincible-dt);
 const spec=specs[g.mount],speed=spec.speed*(g.status==='air'?.94:1);
 g.lastSpeed=speed;g.distance+=speed*dt;
 if(g.status==='mounted'){
  g.mountTime+=dt;
  tameIfReady();
  if(g.held){g.x+=(g.aimX-g.x)*Math.min(1,dt*4.3)}
  if(g.mountTime>=spec.stamina){end(spec.name+'이(가) 날뛰기 시작했어요! 더 일찍 갈아타 보세요.');return}
 }else{
  g.airTimer-=dt;
  if(g.held)findLanding();
  if(g.status==='air'&&g.airTimer<=0){end('착지할 동물을 찾지 못했어요. 가까운 동물 위에서 다시 누르세요.');return}
 }
 const dir=(keys.right?1:0)-(keys.left?1:0);
 if(dir){g.aimX=clamp(g.aimX+dir*dt*1.5,-.92,.92);if(g.status==='mounted')g.x=clamp(g.x+dir*dt*1.25,-.92,.92);else findLanding()}
 for(const a of [...g.animals]){
  a.z-=speed*dt;a.time+=dt;
  a.x=clamp(a.x+Math.sin(a.time*1.7+a.wobble)*dt*.033,-.85,.85);
  if(a.z< -18)g.animals.splice(g.animals.indexOf(a),1);
 }
 for(const r of [...g.rocks]){
  r.z-=speed*dt;
  if(r.z<=7&&r.z>=-8&&!r.passed){
   r.passed=true;
   if(g.status==='mounted'&&g.invincible<=0&&Math.abs(g.x-r.x)<.21){
    if(g.mount==='elephant'){g.flash=.4;message('코끼리가 바위를 밀어냈어요!')}
    else{end('바위를 피하지 못했어요. 좌우로 이동해 보세요.');return}
   }
  }
  if(r.z< -18)g.rocks.splice(g.rocks.indexOf(r),1);
 }
 g.nextAnimal-=dt;if(g.nextAnimal<=0){spawnAnimals();g.nextAnimal=rand(.8,1.4)}
 g.nextRock-=dt;if(g.nextRock<=0&&g.distance>55){if(g.rocks.length<9)g.rocks.push({x:rand(-.7,.7),z:rand(135,175),passed:false});g.nextRock=rand(2.6,4.1)}
 updateHUD();
}
function updateHUD(){
 if(!g)return;
 $('distance').textContent=Math.floor(g.distance)+'m';
 $('rideCount').textContent='갈아타기 '+g.transfers+'회';
 $('speciesLabel').textContent=g.status==='air'?'공중 점프':specs[g.mount].icon+' '+specs[g.mount].name;
 const stamina=specs[g.mount].stamina;
 const used=g.status==='air'?0:g.mountTime/stamina;
 $('meterFill').style.width=Math.round(clamp(used,0,1)*100)+'%';
 $('meter').setAttribute?.('aria-label',g.status==='air'?'공중에서 올가미 조준 중':'동물 기분 '+Math.round(used*100)+'퍼센트');
}
function resize(){
 const r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
 canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));
 W=900;H=clamp(900*r.height/Math.max(1,r.width),560,1600);
}
window.addEventListener('resize',resize);
function poly(pts,color){ctx.fillStyle=color;ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill()}
function circle(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
function line(x,y,x2,y2,color,w=2){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke()}
function text(v,x,y,size,color='#fff',align='center'){ctx.font='900 '+size+'px system-ui,sans-serif';ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(v,x,y)}
const horizon=()=>H*.235,bottom=()=>H*.91;
function project(lane,z){
 const p=132/(132+Math.max(-12,z)),ground=horizon()+(bottom()-horizon())*p;
 return {x:W*.5+lane*W*.39*p,y:ground,s:.18+.86*p,p};
}
function imageAnimal(id,x,y,scale){
 const p=picture[id],size=Math.max(28,116*scale);
 if(p?.complete&&p.naturalWidth>0){ctx.drawImage(p,x-size*.50,y-size*.83,size,size);return}
 ctx.save();ctx.translate(x,y);ctx.fillStyle=id==='elephant'?'#929898':id==='zebra'?'#dedbcf':'#a18f73';
 ctx.fillRect(-size*.36,-size*.6,size*.72,size*.38);ctx.fillRect(-size*.30,-size*.25,size*.13,size*.25);
 ctx.fillRect(size*.14,-size*.25,size*.13,size*.25);circle(size*.36,-size*.54,size*.22,'#898574');ctx.restore();
}
function drawField(){
 const sky=ctx.createLinearGradient(0,0,0,H);
 sky.addColorStop(0,'#cfd9bd');sky.addColorStop(.58,'#d5e2c4');sky.addColorStop(1,'#91b26f');
 ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 poly([[0,horizon()],[W,horizon()],[W,H],[0,H]],'#9bb67b');
 poly([[W*.44,horizon()],[W*.56,horizon()],[W*.93,H],[W*.07,H]],'#8cae75');
 const strip=(color,z,side)=>{const a=project(side,-8),b=project(side,z);line(a.x,a.y,b.x,b.y,color,5)};
 strip('#c3d39d',175,-1.1);strip('#c3d39d',175,1.1);
 // Parallel rails and posts make forward movement visible without replicating game assets.
 const shift=g?g.distance%18:0;
 for(let z=184-shift;z>=0;z-=18){
  for(const side of [-1.13,1.13]){
   const p=project(side,z),w=4+15*p.p,h=13+32*p.p;
   line(p.x,p.y,p.x,p.y-h,'#f7f5eb',w);
   line(p.x,p.y-h*.84,p.x+side*2,p.y-h*.84,'#d7d9d0',1+4*p.p);
  }
 }
 for(let z=160-(g?g.distance%27:0);z>0;z-=27){
  for(const x of [-1.45,1.48]){const q=project(x,z);circle(q.x,q.y,2+9*q.p,'#7b9b64')}
 }
}
function drawEntity(item){
 const q=project(item.x,item.z);
 if(item.id){circle(q.x,q.y+3,16*q.s,'#547d55aa');imageAnimal(item.id,q.x,q.y,Math.max(.38,q.s));
  if(g.status==='air'&&Math.abs(item.x-g.aimX)<.36&&item.z>5&&item.z<66){ctx.strokeStyle='#fff0b4';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(q.x,q.y-39*q.s,54*q.s,31*q.s,0,0,Math.PI*2);ctx.stroke()}
 }else{
  circle(q.x,q.y+4,10*q.s,'#6c795e66');circle(q.x,q.y-9*q.s,22*q.s,'#8b8d84');
  circle(q.x-9*q.s,q.y-23*q.s,10*q.s,'#9b9b91');
 }
}
function drawHero(){
 const q=project(g.x,-5),jump=g.status==='air'?(1-Math.pow(2*g.airTimer/1.35-1,2))*Math.min(145,H*.19):0;
 const y=q.y-jump,scale=Math.max(.85,Math.min(1.2,W/900));
 circle(q.x,q.y+4,42,'#36594265');
 if(g.status==='mounted')imageAnimal(g.mount,q.x,y,scale*1.15);
 ctx.save();ctx.translate(q.x,y-(g.status==='mounted'?84:34)*scale);ctx.scale(scale,scale);
 // Minimal cowboy silhouette over reused animal sprites.
 ctx.fillStyle='#3e3431';ctx.fillRect(-19,-52,38,8);ctx.fillRect(-13,-68,26,21);
 ctx.fillStyle='#c4966b';ctx.fillRect(-10,-45,20,17);
 ctx.fillStyle='#61473a';ctx.fillRect(-18,-27,36,37);
 ctx.fillStyle='#bd8970';ctx.fillRect(-22,-24,9,22);ctx.fillRect(13,-24,9,22);
 if(g.status==='air'){ctx.fillStyle='#eee1aa';ctx.beginPath();ctx.ellipse(25,-40,34,20,-.15,0,Math.PI*2);ctx.lineWidth=6;ctx.strokeStyle='#b9966a';ctx.stroke()}
 ctx.restore();
 if(g.status==='air'){
  const aim=project(g.aimX,28);
  ctx.strokeStyle='#f7e6ad';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(aim.x,aim.y-44,50,25,0,0,Math.PI*2);ctx.stroke();
  line(q.x,y-95*scale,aim.x,aim.y-44,'#e9d6a9',2);
 }
}
function paint(){
 if(!g||phase!=='run')return;
 ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.clearRect(0,0,W,H);
 drawField();
 const list=[...g.animals,...g.rocks];list.sort((a,b)=>b.z-a.z);list.forEach(drawEntity);
 drawHero();
 if(g.flash>0){ctx.fillStyle='rgba(255,246,204,'+Math.min(.22,g.flash*.18)+')';ctx.fillRect(0,0,W,H)}
 if(g.status==='air')text('다음 동물에 올가미!',W*.5,H*.62,Math.min(28,W*.06),'#fff5d6');
}
function loop(time){
 requestAnimationFrame(loop);
 if(phase!=='run')return;
 const dt=clamp((time-lastFrame)/1000,0,.05);lastFrame=time;
 tick(dt);if(phase==='run')paint();
}
resize();refreshRecords();requestAnimationFrame(loop);
window.KidscadeStampede=Object.freeze({
 getState:()=>g?{phase,status:g.status,held:g.held,distance:Math.floor(g.distance),x:g.x,aimX:g.aimX,mount:g.mount,mountTime:g.mountTime,airTimer:g.airTimer,transfers:g.transfers,animals:g.animals.map(a=>({id:a.id,x:a.x,z:a.z})),rocks:g.rocks.map(a=>({x:a.x,z:a.z})),tamed:[...saved.tamed],best:saved.best}: {phase:'menu',best:saved.best,tamed:[...saved.tamed]},
 getAnimals:()=>animalNames.slice()
});
})();
