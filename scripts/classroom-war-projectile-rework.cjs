const fs=require('fs');
const p='classroom_war_3d.html';
let s=fs.readFileSync(p,'utf8');

function rep(oldText,newText,label){
  if(!s.includes(oldText))throw new Error('target not found: '+label);
  s=s.replace(oldText,newText);
}
function repRe(re,newText,label){
  if(!re.test(s))throw new Error('regex target not found: '+label);
  s=s.replace(re,newText);
}

rep('<title>교실전쟁 3D v3.8 - 계급 승급과 방어선 HP</title>','<title>교실전쟁 3D v4.0 - 진짜 투사체와 전선 위협</title>','title');
rep('v3.8 · 병사→엘리트→부사관→장교→장군','v4.0 · 진짜 투사체 · 교과서 방어벽 · 숙제 폭탄','version label');
rep('let enemies=[],shots=[],gates=[],enemyGates=[],particles=[],textSprites=[],shockwaves=[];','let combatUid=0;\nlet enemies=[],shots=[],gates=[],enemyGates=[],obstacles=[],particles=[],textSprites=[],shockwaves=[];','combat arrays');
rep('spawnT:.5,gateT:4.5,eventT:23,eliteT:12,bossT:52,period:1,shownPeriod:1,','spawnT:.5,gateT:4.5,eventT:23,eliteT:12,bossT:52,hazardT:20,period:1,shownPeriod:1,','initial hazard timer');

repRe(/function enemyStats\(type\)\{[^\n]*\}\nfunction addHealthBar/,
`function enemyStats(type){
  const p=Math.max(1,state.period),grow=Math.pow(1.24,p-1);
  const map={normal:{hp:6,sp:2.7,dmg:1,score:10},runner:{hp:4,sp:4.15,dmg:1,score:14},tank:{hp:18,sp:1.75,dmg:3,score:28},elite:{hp:42,sp:2.15,dmg:5,score:55},boss:{hp:420,sp:1.10,dmg:12,score:520}}[type];
  const hp=type==="boss"?Math.ceil(map.hp*Math.pow(1.32,p-1)+Math.sqrt(Math.max(1,player.maxArmy||1))*22):Math.ceil(map.hp*grow);
  return {hp,speed:map.sp*(1+Math.min(.35,(p-1)*.025)),baseDmg:map.dmg,score:map.score};
}
function addHealthBar`, 'enemy stats');

repRe(/function spawnEnemy\(type=null,x=null\)\{[^\n]*\}/,
`function spawnEnemy(type=null,x=null){
  if(!type){const r=Math.random();type=state.period>=4&&r<.08?"elite":state.period>=2&&r<.22?"tank":r<.43?"runner":"normal";}
  const st=enemyStats(type),group=createEnemyModel(type);
  const e={uid:++combatUid,type,group,x:x??rand(-3.85,3.85),z:-56,hp:st.hp,maxHp:st.hp,speed:st.speed,baseDmg:st.baseDmg,score:st.score,dead:false,t:rand(0,6.28),phase70:false,phase40:false,phase18:false,hitRadius:type==="boss"?1.18:type==="tank"?.82:.62};
  group.position.set(e.x,0,e.z);actorRoot.add(group);addHealthBar(e);enemies.push(e);
  if(type==="boss"){showBanner("🚨 강화 보스 출현!",`HP ${e.hp.toLocaleString()} · 체력 구간마다 전선 위협을 꺼냅니다.`,2.4);tone("boss");}
  return e;
}`, 'spawn enemy');

repRe(/function damageEnemy\(e,amount,hitX=null\)\{[^\n]*\}/,
`function damageEnemy(e,amount,hitX=null){
  if(!e||e.dead)return;
  e.hp-=amount;
  const ratio=clamp(e.hp/e.maxHp,0,1);e.hpFill.scale.x=ratio;e.hpFill.position.x=-(1.14*(1-ratio))/2;
  hitSound();if(Math.random()<.45)burst(hitX??e.x,1.0,e.z,0xfde68a,3,1.1);
  if(e.type==="boss"&&e.hp>0){
    if(ratio<=.70&&!e.phase70){e.phase70=true;showBanner("📚 보스 2단계","교과서 방어벽 전개!",1.7);spawnTextbookWall(clamp(e.z+7,-42,3),true);}
    if(ratio<=.40&&!e.phase40){e.phase40=true;showBanner("💣 보스 3단계","숙제 폭탄 2개 투척!",1.8);spawnHomeworkBomb(clamp(e.x-1.6,-3.3,3.3),clamp(e.z+5,-40,1),true);spawnHomeworkBomb(clamp(e.x+1.6,-3.3,3.3),clamp(e.z+3,-42,-1),true);}
    if(ratio<=.18&&!e.phase18){e.phase18=true;e.speed*=1.65;showBanner("🚨 보스 최종 돌진","남은 체력 18% · 이동 속도 증가!",1.8);}
  }
  if(e.hp<=0)killEnemy(e);
}`, 'damage enemy');

const combatBlock=`const RANK_POWER=[1,3,9,27,81];
const PROJECTILE_SPECS=[
  {speed:29,pierce:0,splash:0,scale:.90},
  {speed:32,pierce:0,splash:0,scale:1.02},
  {speed:34,pierce:1,splash:0,scale:1.12},
  {speed:32,pierce:0,splash:1.15,scale:1.32},
  {speed:30,pierce:3,splash:1.55,scale:1.62}
];

function attachObstacleLabel(o){
  const canvas=document.createElement("canvas");canvas.width=512;canvas.height=128;
  const texture=new THREE.CanvasTexture(canvas);texture.userData.ownedTexture=true;
  if("colorSpace" in texture&&THREE.SRGBColorSpace)texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
  sprite.scale.set(o.type==="textbook"?5.8:3.8,1.45,1);sprite.position.set(0,o.type==="textbook"?3.05:2.55,0);
  o.group.add(sprite);o.labelCanvas=canvas;o.labelTexture=texture;o.labelSprite=sprite;o.labelKey="";updateObstacleLabel(o,true);
}
function updateObstacleLabel(o,force=false){
  if(!o.labelCanvas)return;
  const hp=Math.max(0,Math.ceil(o.hp)),extra=o.type==="homework"?(o.rolling?"굴러온다!":`${Math.max(0,o.timer).toFixed(1)}초`):"총알을 막는 방어벽";
  const key=`${hp}|${extra}`;if(!force&&key===o.labelKey)return;o.labelKey=key;
  const g=o.labelCanvas.getContext("2d");g.clearRect(0,0,512,128);g.fillStyle="rgba(3,10,20,.84)";g.fillRect(14,14,484,100);g.strokeStyle=o.type==="homework"?"#fb7185":"#60a5fa";g.lineWidth=6;g.strokeRect(14,14,484,100);
  g.textAlign="center";g.fillStyle="#fff";g.font="900 31px system-ui";g.fillText(o.type==="homework"?`숙제 폭탄 HP ${hp.toLocaleString()}`:`교과서 벽 HP ${hp.toLocaleString()}`,256,54);g.font="800 22px system-ui";g.fillStyle=o.type==="homework"?"#fecdd3":"#bfdbfe";g.fillText(extra,256,91);o.labelTexture.needsUpdate=true;
}
function createTextbookWallModel(){
  const g=new THREE.Group(),colors=[0x2563eb,0xdc2626,0x16a34a,0xf59e0b,0x7c3aed];
  for(let row=0;row<3;row++)for(let col=0;col<5;col++){
    const book=box(1.38,.50,.74,colors[(row+col)%colors.length],.48,.08);book.position.set((col-2)*1.46,.34+row*.52,(row%2)*.06);g.add(book);
    const page=box(1.18,.07,.77,0xf8fafc,.82,0);page.position.set((col-2)*1.46,.13+row*.52,(row%2)*.06);g.add(page);
  }
  const sign=box(3.7,.72,.26,0x1e3a8a,.42,.12);sign.position.set(0,2.20,.08);g.add(sign);
  return g;
}
function createHomeworkBombModel(){
  const g=new THREE.Group();
  const body=sphere(.72,0xdc2626);body.position.y=.88;g.add(body);
  const band1=box(1.18,.16,.82,0xf8fafc,.75,.02);band1.position.set(0,.88,0);g.add(band1);
  const band2=box(.82,.16,1.18,0xf8fafc,.75,.02);band2.position.set(0,.88,0);g.add(band2);
  const fuse=cyl(.055,.52,0x1f2937);fuse.position.set(.35,1.55,0);fuse.rotation.z=-.45;g.add(fuse);
  const spark=sphere(.13,0xfbbf24);spark.position.set(.48,1.77,0);spark.material.emissive?.setHex?.(0xf59e0b);if(spark.material)spark.material.emissiveIntensity=1.8;g.add(spark);
  return g;
}
function obstacleHp(type){const p=Math.max(1,state.period),army=Math.sqrt(Math.max(1,player.maxArmy||1));return type==="textbook"?Math.ceil(120*Math.pow(1.65,p-1)+army*15):Math.ceil(58*Math.pow(1.46,p-1)+army*6);}
function spawnTextbookWall(z=-40,forced=false){
  if(!forced&&obstacles.some(o=>!o.dead&&o.type==="textbook"))return null;
  const group=createTextbookWallModel(),hp=obstacleHp("textbook"),o={uid:++combatUid,type:"textbook",group,x:0,z,hp,maxHp:hp,dead:false,halfW:3.9,hitRadius:.72,speed:.45+state.period*.055};
  group.position.set(0,0,z);actorRoot.add(group);obstacles.push(o);attachObstacleLabel(o);showBanner("📚 교과서 방어벽",`HP ${hp.toLocaleString()} · 모든 탄환을 먼저 받아냅니다.`,1.7);return o;
}
function spawnHomeworkBomb(x=rand(-3.1,3.1),z=-38,forced=false){
  const active=obstacles.filter(o=>!o.dead&&o.type==="homework").length;if(!forced&&active>=2)return null;
  const group=createHomeworkBombModel(),hp=obstacleHp("homework"),timer=Math.max(5.5,8.2-state.period*.18),o={uid:++combatUid,type:"homework",group,x,z,hp,maxHp:hp,dead:false,hitRadius:.88,timer,rolling:false,speed:10.0+state.period*.35};
  group.position.set(x,0,z);actorRoot.add(group);obstacles.push(o);attachObstacleLabel(o);showBanner("💣 숙제 폭탄!",`${timer.toFixed(1)}초 안에 HP ${hp.toLocaleString()}을 깎으세요.`,1.8);return o;
}
function destroyObstacle(o){if(!o||o.dead)return;o.dead=true;state.hazardsDestroyed=(state.hazardsDestroyed||0)+1;burst(o.x,1.0,o.z,o.type==="homework"?0xf97316:0x60a5fa,o.type==="homework"?18:14,3);shockwave(o.x,o.z,o.type==="homework"?0xf97316:0x60a5fa);floatText(o.type==="homework"?"숙제 해결!":"방어벽 파괴!",o.x,2.0,o.z,o.type==="homework"?"#fdba74":"#93c5fd");removeObject(actorRoot,o.group,true);tone("gate");}
function damageObstacle(o,amount,hitX=null){if(!o||o.dead)return;o.hp-=amount;hitSound();if(Math.random()<.5)burst(hitX??o.x,1.0,o.z,o.type==="homework"?0xfca5a5:0x93c5fd,3,1.0);updateObstacleLabel(o);if(o.hp<=0)destroyObstacle(o);}
function explodeHomework(o){
  if(!o||o.dead)return;const n=totalArmy(),loss=n>1?Math.min(n-1,Math.max(1,Math.ceil(n*.20))):0,baseLoss=Math.min(8,3+Math.floor(state.period/2));
  if(loss>0)setArmyTotal(n-loss,{announce:true,reason:`숙제 폭발 -${loss}명`});state.baseHp=Math.max(0,state.baseHp-baseLoss);ui.flash.style.opacity=".9";state.flash=.28;state.camShake=.48;burst(o.x,1.0,7.6,0xef4444,30,4.4);shockwave(o.x,7.6,0xef4444);showBanner("💥 숙제 폭발!",`병력 ${loss}명 · 방어선 ${baseLoss} 피해`,1.8);o.dead=true;removeObject(actorRoot,o.group,true);updateHud();tone("hurt");if(state.baseHp<=0)gameOver();
}
function textbookImpact(o){if(!o||o.dead)return;const dmg=Math.min(9,3+Math.floor(state.period/2));state.baseHp=Math.max(0,state.baseHp-dmg);showBanner("📚 교과서 벽 충돌!",`방어선 ${dmg} 피해`,1.5);o.dead=true;removeObject(actorRoot,o.group,true);state.camShake=.32;updateHud();if(state.baseHp<=0)gameOver();}
function updateObstacles(dt){
  for(const o of obstacles){if(o.dead)continue;if(o.type==="textbook"){o.z+=o.speed*dt;o.group.position.z=o.z;if(o.z>=8.0)textbookImpact(o);}else if(o.type==="homework"){if(!o.rolling){o.timer-=dt;if(o.timer<=0){o.timer=0;o.rolling=true;showBanner("💣 숙제 폭탄 굴러온다!","방어선에 닿기 전에 마지막으로 부술 수 있습니다.",1.6);}}else{o.z+=o.speed*dt;o.group.rotation.x-=dt*5.5;o.group.position.z=o.z;if(o.z>=7.55)explodeHomework(o);}updateObstacleLabel(o);}}
  obstacles=obstacles.filter(o=>!o.dead);
}
function spawnHazard(){if(state.period<2)return;const wallChance=state.period<3?.78:.52;if(Math.random()<wallChance)spawnTextbookWall();else spawnHomeworkBomb();}

function combatTargets(){return [...obstacles.filter(o=>!o.dead),...enemies.filter(e=>!e.dead)];}
function nearestTarget(){let best=null,bz=-Infinity;for(const t of combatTargets()){if(t.z>bz){best=t;bz=t.z;}}return best;}
function targetAimX(t,sourceX){if(t?.type==="textbook")return clamp(sourceX,t.x-t.halfW+.2,t.x+t.halfW-.2);return t?.x??0;}
function targetSegmentHitT(t,ax,az,bx,bz){
  if(!t||t.dead)return null;
  if(t.type==="textbook"){
    const dz=bz-az;if(Math.abs(dz)<1e-6)return null;const q=(t.z-az)/dz;if(q<0||q>1)return null;const x=ax+(bx-ax)*q;return Math.abs(x-t.x)<=t.halfW?q:null;
  }
  const dx=bx-ax,dz=bz-az,len2=dx*dx+dz*dz;if(len2<1e-8)return null;const q=clamp(((t.x-ax)*dx+(t.z-az)*dz)/len2,0,1),px=ax+dx*q,pz=az+dz*q,r=t.hitRadius||.65;return (px-t.x)*(px-t.x)+(pz-t.z)*(pz-t.z)<=r*r?q:null;
}
function damageTarget(t,amount,hitX=null){if(!t||t.dead)return;if(t.type==="textbook"||t.type==="homework")damageObstacle(t,amount,hitX);else damageEnemy(t,amount,hitX);}
function splashAt(x,z,radius,damage,skipUid){if(!radius||damage<=0)return;for(const t of combatTargets()){if(t.uid===skipUid||t.dead)continue;let dist;if(t.type==="textbook"){const dx=Math.max(0,Math.abs(x-t.x)-t.halfW);dist=Math.hypot(dx,z-t.z);}else dist=Math.hypot(x-t.x,z-t.z);if(dist<=radius)damageTarget(t,damage*.42,x);}}

const tempWorldPos=new THREE.Vector3();function rankList(i){return [player.agents,player.eliteAgents,player.ncoAgents,player.officerAgents,player.generalAgents][i];}
function fireRank(i){
  const list=rankList(i);if(!list.length)return;const target=nearestTarget();if(!target)return;
  const visible=Math.min(3,list.length),damage=(RANK_POWER[i]*list.length)/visible,spec=PROJECTILE_SPECS[i];
  for(let k=0;k<visible;k++){
    const source=list[(k*2)%list.length];source.getWorldPosition(tempWorldPos);const sx=tempWorldPos.x,sz=tempWorldPos.z,aimX=targetAimX(target,sx)+rand(-.10,.10),aimZ=target.z,dx=aimX-sx,dz=aimZ-sz,d=Math.max(.001,Math.hypot(dx,dz));
    const mesh=new THREE.Mesh(bulletGeometry,rankBulletMaterials[i]);mesh.rotation.x=Math.PI/2;mesh.rotation.y=Math.atan2(dx,-dz);mesh.scale.setScalar(spec.scale);mesh.position.copy(tempWorldPos);mesh.position.y+=.56;fxRoot.add(mesh);
    shots.push({mesh,damage,speed:spec.speed,vx:dx/d*spec.speed,vz:dz/d*spec.speed,life:3.5,pierce:spec.pierce,splash:spec.splash,hitIds:new Set(),rank:i});
  }
  player.recoil=.09;tone("shot");
}
function updateShooting(dt){if(totalArmy()<=0)return;for(let i=0;i<5;i++){const count=rankList(i).length;if(!count)continue;player.fireTimers[i]-=dt;if(player.fireTimers[i]<=0){fireRank(i);player.fireTimers[i]=1/RANKS[i].fireRate;}}}
function updateShots(dt){
  for(const s of shots){
    if(s.life<=0)continue;s.life-=dt;const ax=s.mesh.position.x,az=s.mesh.position.z,bx=ax+s.vx*dt,bz=az+s.vz*dt;
    let hit=null,bestT=Infinity;for(const t of combatTargets()){if(s.hitIds.has(t.uid))continue;const q=targetSegmentHitT(t,ax,az,bx,bz);if(q!==null&&q<bestT){bestT=q;hit=t;}}
    if(hit){const hx=ax+(bx-ax)*bestT,hz=az+(bz-az)*bestT;s.mesh.position.x=hx;s.mesh.position.z=hz;s.hitIds.add(hit.uid);damageTarget(hit,s.damage,hx);if(s.splash>0)splashAt(hx,hz,s.splash,s.damage,hit.uid);burst(hx,.9,hz,RANKS[s.rank].bullet,s.rank>=3?6:3,1.1);if(s.pierce>0){s.pierce--;s.mesh.position.x=hx+s.vx*.012;s.mesh.position.z=hz+s.vz*.012;}else s.life=0;}else{s.mesh.position.x=bx;s.mesh.position.z=bz;}
    if(s.mesh.position.z<-64||s.mesh.position.z>12||Math.abs(s.mesh.position.x)>10)s.life=0;
  }
  shots=shots.filter(s=>{if(s.life>0)return true;if(s.mesh.parent)fxRoot.remove(s.mesh);return false;});
}`;

repRe(/const RANK_POWER=\[1,3,9,27,81\];[\s\S]*?function updateShots\(dt\)\{[^\n]*\}/,combatBlock,'projectile combat block');

repRe(/function updateSpawns\(dt\)\{[^\n]*\}/,
`function updateSpawns(dt){
  state.spawnT-=dt;state.gateT-=dt;state.eventT-=dt;state.bossT-=dt;state.hazardT-=dt;
  if(state.spawnT<=0){spawnEnemy();const base=Math.max(.28,1.18*Math.pow(.89,state.period-1));state.spawnT=base*rand(.72,1.18);}
  if(state.gateT<=0){spawnGate();state.gateT=rand(7.3,9.2);}
  if(state.eventT<=0){spawnWaveEvent();state.eventT=rand(18,25);}
  if(state.hazardT<=0){spawnHazard();state.hazardT=Math.max(12,24-state.period*.8)*rand(.82,1.18);}
  if(state.bossT<=0){spawnEnemy("boss",rand(-2.3,2.3));state.bossT=Math.max(28,50-state.period*1.45);}
  const shouldPeriod=Math.floor(state.t/30)+1;if(shouldPeriod>state.period)periodUp();
}`, 'spawn timers');

repRe(/function clearBattle\(\)\{[^\n]*\}/,
`function clearBattle(){clearSceneArray(enemies,actorRoot);clearSceneArray(obstacles,actorRoot);obstacles=[];clearSceneArray(gates.flatMap(g=>g.items.map(it=>({mesh:it.mesh,texture:it.mesh.userData.texture}))),actorRoot);gates=[];for(const s of shots){if(s.mesh.parent)fxRoot.remove(s.mesh);}shots=[];for(const p of particles){if(p.mesh.parent)fxRoot.remove(p.mesh);}particles=[];for(const s of textSprites){if(s.parent)fxRoot.remove(s);s.userData.texture?.dispose?.();s.material.dispose?.();}textSprites=[];for(const w of shockwaves){if(w.mesh.parent)fxRoot.remove(w.mesh);w.mesh.geometry.dispose();w.mesh.material.dispose();}shockwaves=[];}`, 'clear battle');

rep('spawnT:.55,gateT:4.6,eventT:18,bossT:48,period:1,shownPeriod:1,gatesPassed:0,','spawnT:.55,gateT:4.6,eventT:18,bossT:48,hazardT:20,period:1,shownPeriod:1,gatesPassed:0,hazardsDestroyed:0,','reset hazard state');
rep('updateSpawns(dt);updateGates(dt);updateEnemies(dt);updateShooting(dt);updateShots(dt);updateHud();','updateSpawns(dt);updateGates(dt);updateEnemies(dt);updateObstacles(dt);updateShooting(dt);updateShots(dt);updateHud();','main update hazards');
rep('state.bossKills*180+player.maxArmy/20','state.bossKills*260+(state.hazardsDestroyed||0)*75+player.maxArmy/20','score hazards');
rep('적 ${state.kills}명 처치 · 보스 ${state.bossKills}명 격파','적 ${state.kills}명 처치 · 보스 ${state.bossKills}명 격파 · 전선 위협 ${state.hazardsDestroyed||0}개 제거','report hazards');
rep('<div class="mini"><b>전선 충돌</b>적이 병사 진형까지 오면 병사와 적이 함께 사라져 방어선 이전에 병력이 먼저 소모됩니다.</div>','<div class="mini"><b>전선 위협</b>교과서 벽은 탄환을 막고, 숙제 폭탄은 제한시간 뒤 굴러와 폭발합니다.</div>','intro hazard card');

if(!s.includes('hitIds:new Set()'))throw new Error('true projectile payload missing');
if(s.includes('shots.push({mesh,target'))throw new Error('old locked-target projectile still present');
if(!s.includes('function spawnTextbookWall'))throw new Error('textbook wall missing');
if(!s.includes('function spawnHomeworkBomb'))throw new Error('homework bomb missing');
if(!s.includes('e.phase70=true'))throw new Error('boss phases missing');

const scripts=[...s.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(x=>x.trim());
for(let i=0;i<scripts.length;i++){
  try{new Function(scripts[i]);}catch(err){throw new Error(`inline script ${i+1} syntax error: ${err.message}`);}
}
fs.writeFileSync(p,s);
console.log('Classroom War v4.0 projectile combat rework applied and syntax checked');