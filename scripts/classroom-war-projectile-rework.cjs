const fs=require('fs');
const p='classroom_war_3d.html';
let s=fs.readFileSync(p,'utf8');
const combatBlock=fs.readFileSync('scripts/classroom-war-v4-combat.txt','utf8').trimEnd();

function rep(oldText,newText,label){if(!s.includes(oldText))throw new Error('target not found: '+label);s=s.replace(oldText,newText);}
function repRe(re,newText,label){if(!re.test(s))throw new Error('regex target not found: '+label);s=s.replace(re,newText);}

rep('<title>교실전쟁 3D v3.8 - 계급 승급과 방어선 HP</title>','<title>교실전쟁 3D v4.0 - 진짜 투사체와 전선 위협</title>','title');
rep('v3.8 · 병사→엘리트→부사관→장교→장군','v4.0 · 진짜 투사체 · 교과서 방어벽 · 숙제 폭탄','version label');
rep('let enemies=[],shots=[],gates=[],enemyGates=[],particles=[],textSprites=[],shockwaves=[];','let combatUid=0;\nlet enemies=[],shots=[],gates=[],enemyGates=[],obstacles=[],particles=[],textSprites=[],shockwaves=[];','combat arrays');
rep('spawnT:.5,gateT:4.5,eventT:23,eliteT:12,bossT:52,period:1,shownPeriod:1,','spawnT:.5,gateT:4.5,eventT:23,eliteT:12,bossT:52,hazardT:20,period:1,shownPeriod:1,','initial hazard timer');

const enemyStats=[
'function enemyStats(type){',
'  const p=Math.max(1,state.period),grow=Math.pow(1.24,p-1);',
'  const map={normal:{hp:6,sp:2.7,dmg:1,score:10},runner:{hp:4,sp:4.15,dmg:1,score:14},tank:{hp:18,sp:1.75,dmg:3,score:28},elite:{hp:42,sp:2.15,dmg:5,score:55},boss:{hp:420,sp:1.10,dmg:12,score:520}}[type];',
'  const hp=type==="boss"?Math.ceil(map.hp*Math.pow(1.32,p-1)+Math.sqrt(Math.max(1,player.maxArmy||1))*22):Math.ceil(map.hp*grow);',
'  return {hp,speed:map.sp*(1+Math.min(.35,(p-1)*.025)),baseDmg:map.dmg,score:map.score};',
'}',
'function addHealthBar'
].join('\n');
repRe(/function enemyStats\(type\)\{[^\n]*\}\nfunction addHealthBar/,enemyStats,'enemy stats');

const spawnEnemy=[
'function spawnEnemy(type=null,x=null){',
'  if(!type){const r=Math.random();type=state.period>=4&&r<.08?"elite":state.period>=2&&r<.22?"tank":r<.43?"runner":"normal";}',
'  const st=enemyStats(type),group=createEnemyModel(type);',
'  const e={uid:++combatUid,type,group,x:x??rand(-3.85,3.85),z:-56,hp:st.hp,maxHp:st.hp,speed:st.speed,baseDmg:st.baseDmg,score:st.score,dead:false,t:rand(0,6.28),phase70:false,phase40:false,phase18:false,hitRadius:type==="boss"?1.18:type==="tank"?.82:.62};',
'  group.position.set(e.x,0,e.z);actorRoot.add(group);addHealthBar(e);enemies.push(e);',
'  if(type==="boss"){showBanner("🚨 강화 보스 출현!","HP "+e.hp.toLocaleString()+" · 체력 구간마다 전선 위협을 꺼냅니다.",2.4);tone("boss");}',
'  return e;',
'}'
].join('\n');
repRe(/function spawnEnemy\(type=null,x=null\)\{[^\n]*\}/,spawnEnemy,'spawn enemy');

const damageEnemy=[
'function damageEnemy(e,amount,hitX=null){',
'  if(!e||e.dead)return;',
'  e.hp-=amount;',
'  const ratio=clamp(e.hp/e.maxHp,0,1);e.hpFill.scale.x=ratio;e.hpFill.position.x=-(1.14*(1-ratio))/2;',
'  hitSound();if(Math.random()<.45)burst(hitX??e.x,1.0,e.z,0xfde68a,3,1.1);',
'  if(e.type==="boss"&&e.hp>0){',
'    if(ratio<=.70&&!e.phase70){e.phase70=true;showBanner("📚 보스 2단계","교과서 방어벽 전개!",1.7);spawnTextbookWall(clamp(e.z+7,-42,3),true);}',
'    if(ratio<=.40&&!e.phase40){e.phase40=true;showBanner("💣 보스 3단계","숙제 폭탄 2개 투척!",1.8);spawnHomeworkBomb(clamp(e.x-1.6,-3.3,3.3),clamp(e.z+5,-40,1),true);spawnHomeworkBomb(clamp(e.x+1.6,-3.3,3.3),clamp(e.z+3,-42,-1),true);}',
'    if(ratio<=.18&&!e.phase18){e.phase18=true;e.speed*=1.65;showBanner("🚨 보스 최종 돌진","남은 체력 18% · 이동 속도 증가!",1.8);}',
'  }',
'  if(e.hp<=0)killEnemy(e);',
'}'
].join('\n');
repRe(/function damageEnemy\(e,amount,hitX=null\)\{[^\n]*\}/,damageEnemy,'damage enemy');

repRe(/const RANK_POWER=\[1,3,9,27,81\];[\s\S]*?function updateShots\(dt\)\{[^\n]*\}/,combatBlock,'projectile combat block');

const updateSpawns=[
'function updateSpawns(dt){',
'  state.spawnT-=dt;state.gateT-=dt;state.eventT-=dt;state.bossT-=dt;state.hazardT-=dt;',
'  if(state.spawnT<=0){spawnEnemy();const base=Math.max(.28,1.18*Math.pow(.89,state.period-1));state.spawnT=base*rand(.72,1.18);}',
'  if(state.gateT<=0){spawnGate();state.gateT=rand(7.3,9.2);}',
'  if(state.eventT<=0){spawnWaveEvent();state.eventT=rand(18,25);}',
'  if(state.hazardT<=0){spawnHazard();state.hazardT=Math.max(12,24-state.period*.8)*rand(.82,1.18);}',
'  if(state.bossT<=0){spawnEnemy("boss",rand(-2.3,2.3));state.bossT=Math.max(28,50-state.period*1.45);}',
'  const shouldPeriod=Math.floor(state.t/30)+1;if(shouldPeriod>state.period)periodUp();',
'}'
].join('\n');
repRe(/function updateSpawns\(dt\)\{[^\n]*\}/,updateSpawns,'spawn timers');

const clearBattle='function clearBattle(){clearSceneArray(enemies,actorRoot);clearSceneArray(obstacles,actorRoot);obstacles=[];clearSceneArray(gates.flatMap(g=>g.items.map(it=>({mesh:it.mesh,texture:it.mesh.userData.texture}))),actorRoot);gates=[];for(const s of shots){if(s.mesh.parent)fxRoot.remove(s.mesh);}shots=[];for(const p of particles){if(p.mesh.parent)fxRoot.remove(p.mesh);}particles=[];for(const s of textSprites){if(s.parent)fxRoot.remove(s);s.userData.texture?.dispose?.();s.material.dispose?.();}textSprites=[];for(const w of shockwaves){if(w.mesh.parent)fxRoot.remove(w.mesh);w.mesh.geometry.dispose();w.mesh.material.dispose();}shockwaves=[];}';
repRe(/function clearBattle\(\)\{[^\n]*\}/,clearBattle,'clear battle');

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
for(let i=0;i<scripts.length;i++){try{new Function(scripts[i]);}catch(err){throw new Error('inline script '+(i+1)+' syntax error: '+err.message);}}
fs.writeFileSync(p,s);
console.log('Classroom War v4.0 projectile combat rework applied and syntax checked');