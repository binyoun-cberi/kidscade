/* Rune Forest combat v2: enemy patterns, exact-division streaks and dash.
 * Pure gameplay helpers, independent from Canvas/DOM rendering. */
(()=>{
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const TYPES=Object.freeze({
 stone:'기본 골렘',warden:'증폭 골렘',blast:'충격파 골렘',
 slime:'일반 슬라임',charger:'돌진 슬라임',splitter:'분열 슬라임',
 thief:'룬 도둑',mini:'작은 슬라임'
});
function chooseKind(phase,random=Math.random){
 const list=phase%2===0?(phase<2?['stone','stone','warden']:['stone','stone','warden','blast']):
  (phase<3?['slime','slime','charger','splitter']:['slime','slime','charger','splitter','thief']);
 return list[Math.min(list.length-1,Math.floor(random()*list.length))];
}
function decorate(enemy,kind,random=Math.random){
 enemy.kind=kind;enemy.mode='normal';enemy.aiT=0;enemy.skillCD=1+random()*2;
 enemy.aim=0;enemy.vx=0;enemy.vy=0;enemy.stun=0;
 if(kind==='warden'||kind==='blast')enemy.skillCD=2.5+random()*2;
 if(kind==='mini'){enemy.r=8;enemy.speed+=7;enemy.stun=.25;enemy.skillCD=0;}
 return enemy;
}
function child(parent,scene,choices,random=Math.random){
 const cap=scene.easy?32:52,created=[];
 const live=scene.enemies.filter(e=>!e.dead).length;
 for(let i=0;i<Math.min(2,Math.max(0,cap-live));i++){
  const n=choices[Math.floor(random()*choices.length)];
  if(!n||!Number.isInteger(n))break;
  const x=clamp(parent.x+(i?16:-16),-900,900),y=clamp(parent.y+(i?-10:10),-900,900);
  const e=decorate({id:++scene.id,x,y,n,original:n,factor:false,r:8,speed:22+scene.phase*1.5,
   cd:.4,blocked:0,hit:0,wiggle:0,dead:false,chain:[n],lastFail:0},'mini',random);
  scene.enemies.push(e);created.push(e);
 }
 return created;
}
function streak(scene,{fx=()=>{},tone=()=>{}}={}){
 scene.combo=scene.comboT>0?scene.combo+1:1;
 scene.comboT=6.5;scene.bestCombo=Math.max(scene.bestCombo,scene.combo);
 if(scene.combo===3){scene.comboHaste=3.5;fx(scene.x,scene.y-37,'3연속 · 룬 가속!','#eaf09a');tone(760,.09);}
 if(scene.combo%5===0){
  scene.burst=.5;
  for(const e of scene.enemies){
   if(e.dead)continue;
   const dx=e.x-scene.x,dy=e.y-scene.y,d=Math.hypot(dx,dy)||1;
   if(d<105){e.stun=Math.max(e.stun,.65);e.x=clamp(e.x+dx/d*26,-900,900);e.y=clamp(e.y+dy/d*26,-900,900);}
  }
  fx(scene.x,scene.y-44,scene.combo+'연속 · 충격파!','#a5f6db');tone(930,.16);
 }
 if(scene.combo%10===0){scene.chainShots=Math.min(2,scene.chainShots+1);fx(scene.x,scene.y-61,'연쇄 번개 준비!','#f1dc8e');}
}
function dash(scene,dx,dy,{fx=()=>{},tone=()=>{}}={}){
 if(scene.dashCD>0||scene.dashT>0)return false;
 const angle=Math.hypot(dx,dy)>.06?Math.atan2(dy,dx):scene.angle;
 scene.angle=angle;scene.dashVX=Math.cos(angle)*530;scene.dashVY=Math.sin(angle)*530;
 scene.dashT=.19;scene.dashCD=scene.dashMax;
 scene.inv=Math.max(scene.inv,.32);scene.shake=Math.max(scene.shake,.5);
 fx(scene.x,scene.y-13,'회피!','#b8efff');tone(690,.08);
 return true;
}
function hurt(scene,amount,{fx=()=>{},tone=()=>{}}={}){
 if(scene.inv>0)return false;
 const dmg=amount*scene.armor;scene.hp-=dmg;scene.inv=1.1;scene.shake=3;
 scene.combo=0;scene.comboT=0;scene.chainShots=0;
 fx(scene.x,scene.y,'−'+Math.ceil(dmg),'#ff9d99');tone(100);
 return true;
}
function step(e,scene,dt,{fx=()=>{},tone=()=>{},hurtPlayer=()=>{}}={}){
 e.cd=Math.max(0,e.cd-dt);e.blocked=Math.max(0,e.blocked-dt);
 e.hit=Math.max(0,e.hit-dt);e.stun=Math.max(0,e.stun-dt);
 e.skillCD=Math.max(0,e.skillCD-dt);e.wiggle+=dt*4;
 const dx=scene.x-e.x,dy=scene.y-e.y,d=Math.hypot(dx,dy)||1,ux=dx/d,uy=dy/d;
 if(e.stun>0)return;
 if(e.kind==='charger'){
  if(e.mode==='windup'){
   e.aiT-=dt;
   if(e.aiT<=0){e.mode='rush';e.aiT=.36;e.vx=Math.cos(e.aim)*185;e.vy=Math.sin(e.aim)*185;}
   return;
  }
  if(e.mode==='rush'){
   e.x=clamp(e.x+e.vx*dt,-900,900);e.y=clamp(e.y+e.vy*dt,-900,900);e.aiT-=dt;
   if(e.aiT<=0){e.mode='normal';e.skillCD=2.8;}
   return;
  }
  if(e.skillCD<=0&&d<150){e.mode='windup';e.aiT=.82;e.aim=Math.atan2(dy,dx);return;}
 }
 if(e.kind==='blast'){
  if(e.mode==='windup'){
   e.aiT-=dt;
   if(e.aiT<=0){
    e.mode='normal';e.skillCD=6.2;e.hit=Math.max(e.hit,.28);
    fx(e.x,e.y-35,'충격파!','#ffd5ab');
    if(d<85)hurtPlayer(scene.easy?9:13);
   }
   return;
  }
  if(e.skillCD<=0&&d<135){e.mode='windup';e.aiT=1.15;return;}
 }
 if(e.kind==='thief'&&e.skillCD<=0&&d<57){
  scene.orbitSlow=Math.max(scene.orbitSlow,2.8);e.skillCD=7.2;
  fx(scene.x,scene.y-42,'룬 느려짐!','#d9aaf5');tone(210,.17);
 }
 const boosted=e.factor&&e.kind!=='warden'&&scene.enemies.some(q=>!q.dead&&q.kind==='warden'&&
  Math.hypot(q.x-e.x,q.y-e.y)<110);
 const speed=e.speed*(scene.easy?.8:1)*(boosted?1.34:1);
 e.x=clamp(e.x+ux*speed*dt,-900,900);e.y=clamp(e.y+uy*speed*dt,-900,900);
}
window.RuneForestCombat={TYPES,chooseKind,decorate,child,streak,dash,hurt,step};
})();
