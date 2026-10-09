'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..','games','openmon-dex');
const sandbox={window:{}};
for(const name of ['monsters.js','roster.js','combat.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,name),'utf8'),sandbox,{filename:name});
const db=sandbox.window.OPENMON_DEX;
const all=new Map(db.sprites.map(s=>[s.id,s]));
const valid=new Set(db.species.map(s=>s.id));
test('stable dex ID assigns exactly 102 unique collectible sprites and excludes concepts',()=>{
 assert.equal(db.sprites.length,118);
 assert.equal(db.dexEntries.length,102);
 assert.equal(db.families.length,47);
 assert.equal(db.concepts.length,15);
 assert.equal(db.objects.length,1);
 assert.deepEqual(Array.from(db.dexEntries,s=>s.dexNo),Array.from({length:102},(_,i)=>i+1));
 assert.ok(db.sprites.filter(s=>!s.playable).every(s=>s.dexNo===null&&s.battle===null));
 assert.ok(!valid.has('set1_r00_c05'));
 assert.equal(db.species.find(x=>x.id==='set1_r01_c01').name,'멘델콩');
});
test('family grouping includes all collectible slots exactly once and is acyclic',()=>{
 const seen=new Set();
 for(const f of db.families){
  assert.ok(f.parts.length>=1);
  for(const id of f.parts){
   assert.ok(valid.has(id),'missing member '+id);
   assert.ok(!seen.has(id),'duplicate member '+id);
   seen.add(id);
   assert.equal(all.get(id).familyKey,f.key);
  }
 }
 assert.equal(seen.size,102);
 for(const s of db.species){
  let curr=s;const ids=new Set();
  while(curr.evolvesFrom){
   assert.ok(!ids.has(curr.id),'evolution cycle '+s.id);
   ids.add(curr.id);
   curr=all.get(curr.evolvesFrom);
   assert.ok(curr&&curr.playable);
  }
 }
});
test('provisional Set 2 pair relations never silently activate auto-evolution',()=>{
 for(const s of db.species.filter(x=>x.atlas==='set2')){
  assert.equal(s.familyOrigin,'provisional');
  assert.equal(s.verifiedEvolution,false);
  if(s.evolvesFrom)assert.equal(s.evolutionCondition.enabled,false);
  assert.equal(db.combat.evolutionAvailable(s.id,60).length,0);
 }
 assert.equal(db.shibuBranches.length,18);
 assert.equal(db.combat.evolutionAvailable('shibu_r00_c00',13).length,0);
 assert.equal(db.combat.evolutionAvailable('shibu_r00_c00',14).length,18);
 for(const row of [2,3,4]){
  const root='set1_r'+String(row).padStart(2,'0')+'_c02';
  assert.equal(db.combat.evolutionAvailable(root,14).length,1);
 }
});
test('each playable form has valid bounded base stats and level progression',()=>{
 for(const s of db.species){
  assert.ok(s.battle?.base);
  const b=s.battle.base;
  for(const k of ['hp','attack','defense','speed'])assert.ok(Number.isInteger(b[k])&&b[k]>0);
  assert.ok(s.battle.statBudget>=52&&s.battle.statBudget<=113);
  let prev=null;
  for(const level of [1,5,10,14,20,26,40,60]){
   const now=db.combat.statsAtLevel(s,level);
   if(prev)for(const k of ['hp','attack','defense','speed'])assert.ok(now[k]>prev[k]);
   prev=now;
  }
 }
});
test('starter type advantages cycle and battles keep nonzero reasonable damage',()=>{
 const t=['set1_r02_c02','set1_r03_c02','set1_r04_c02'];
 for(let i=0;i<3;i++){
  assert.equal(db.combat.effectiveness(all.get(t[i]).type,all.get(t[(i+1)%3]).type),2);
  const own=db.combat.statsAtLevel(t[i],5);
  assert.ok(own.hp>=32&&own.hp<=49);
 }
 for(const id1 of t)for(const id2 of t){
  const v=db.combat.damage({attacker:id1,defender:id2,attackerLevel:5,defenderLevel:5,power:9});
  assert.ok(v>=1&&v<=55,id1+'/'+id2+' -> '+v);
 }
});
test('early areas never spawn starters, evolved stages or props',()=>{
 for(const zone of Object.values(db.encounters)){
  assert.ok(zone.pool.length>0);
  for(const id of zone.pool){
   const item=all.get(id);
   assert.ok(item.playable);
   assert.equal(item.evolutionRank,1);
   assert.notEqual(item.rarity,'starter');
   assert.ok(item.dexNo>=1&&item.dexNo<=102);
  }
 }
});
test('low HP improves catch chance; no invalid probabilities or impossible HP',()=>{
 const target='set1_r01_c01',h=db.combat.statsAtLevel(target,3).hp;
 const full=db.combat.captureChance({target,level:3,hp:h,maxHp:h});
 const weak=db.combat.captureChance({target,level:3,hp:Math.ceil(h/4),maxHp:h});
 assert.ok(weak>full&&weak<1);
 assert.ok(db.combat.captureChance({target,level:3,hp:h,maxHp:h,ball:'advanced'})>full);
 assert.equal(db.combat.captureChance({target:'set1_r02_c04',level:24,hp:1,maxHp:80}),0);
 for(const s of db.species.slice(0,70)){
  let mh=db.combat.statsAtLevel(s,8).hp;
  let prob=db.combat.captureChance({target:s,level:8,hp:Math.max(1,Math.floor(mh*.3)),maxHp:mh});
  assert.ok(Number.isFinite(prob)&&prob>=0&&prob<=1,s.id);
 }
});
test('starter can level after about three early wild battles without grinding',()=>{
 const wild='set1_r01_c01';
 const reward=db.combat.xpReward(wild,3);
 const required=db.combat.xpToNext(5);
 assert.ok(Math.ceil(required/reward)>=2&&Math.ceil(required/reward)<=4);
});
test('curator browser loads both gameplay data and stat preview',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/src="roster\.js"/);assert.match(html,/src="combat\.js"/);
 for(const id of ['levelPreview','battleStats','battleNote','familyValue'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(html,/db\.combat\.statsAtLevel/);
});
