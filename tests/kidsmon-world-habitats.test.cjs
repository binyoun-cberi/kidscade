'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..','games'),ctx={window:{},Math,Date};
for(const name of ['monsters.js','roster.js','combat.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,'openmon-dex',name),'utf8'),ctx,{filename:name});
vm.runInNewContext(fs.readFileSync(path.join(root,'openmon-expedition','engine.js'),'utf8'),ctx,{filename:'engine.js'});
const E=ctx.window.OPENMON_EXPEDITION_ENGINE,D=ctx.window.OPENMON_DEX;
const save=()=>E.createNew('set1_r02_c02');
const clone=x=>JSON.parse(JSON.stringify(x));
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
const biomes=['meadow','forest','cave','powerPlant','tidal','snowfield'];
test('world has four walkable villages, ten seamless region ranges and a 225-tile continuous road',()=>{
 assert.equal(E.WIDTH,225);assert.equal(E.HEIGHT,26);assert.equal(E.ZONES.length,10);assert.equal(E.VILLAGES.length,4);
 assert.equal(E.ZONES[0].left,0);assert.equal(E.ZONES.at(-1).right,E.WIDTH-1);
 for(let i=1;i<E.ZONES.length;i++)assert.equal(E.ZONES[i].left,E.ZONES[i-1].right+1);
 for(const x of range(8,E.WIDTH-1))assert.ok(E.canMove(x,12),'blocked public road x='+x);
 for(const v of E.VILLAGES){assert.equal(E.zoneAt(v.x),v.key);assert.ok(E.canMove(v.x,v.y));}
});
test('existing west continent and first encounter stay unchanged',()=>{
 for(const [x,expected] of [[9,'path'],[20,'grass'],[56,'clearing'],[73,'path']]){
  const y=x===56?7:13;assert.equal(E.terrain(x,y),expected);
 }
 const s=save();for(let x=9;x<=20;x++)E.move(s,1,0,()=>.999);
 assert.equal(s.flags.firstRoadEncounter,true);
 assert.equal(s.flags.visitedZones[0],'town');
 assert.equal(s.wins,0);
});
test('three new villages are safe and each region has a different palette of seven valid species',()=>{
 const expected={
  powerPlant:new Set(['electric','earth','fire']),
  tidal:new Set(['water','air']),
  snowfield:new Set(['ice','mind','air'])
 };
 for(const z of E.ZONES){
  if(E.VILLAGES.some(v=>v.key===z.key)){
   for(let x=z.left;x<=z.right;x++)assert.equal(E.shouldMeet(save(),E.terrain(x,12),()=>0),false);
   continue;
  }
  const conf=D.encounters[z.key];assert.ok(conf,z.name);
  assert.ok(conf.pool.length>=6);
  const mons=conf.pool.map(id=>D.species.find(s=>s.id===id));
  for(const m of mons)assert.ok(m.playable&&m.evolutionRank===1,z.name);
  if(expected[z.key]){
   assert.equal(conf.pool.length,7);
   assert.deepEqual([...new Set(mons.map(m=>m.type))].sort(),[...expected[z.key]].sort());
  }
 }
});
test('region spawn sampling obeys level ranges and research-wave unlock conditions',()=>{
 let seed=72;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 for(const zone of biomes){
  const cfg=D.encounters[zone],seen=new Set(),full=save();
  full.wins=12;
  const expanded=E.unlockedPool(zone,full);
  assert.ok(expanded.length>=cfg.pool.length,zone);
  for(let i=0;i<300;i++){
   const mon=E.pickEncounter(zone,rand,full);
   assert.ok(expanded.includes(mon.id),zone+' '+mon.id);
   assert.ok(mon.level>=cfg.level[0]&&mon.level<=cfg.level[1]+2,zone+' level '+mon.level);
   seen.add(mon.id);
  }
  assert.ok(seen.size>=4,zone+' sampled '+seen.size);
 }
});
test('new electric, tidal and alpine areas can always trigger encounters without walking back to original world',()=>{
 for(const [tile,zone] of [['charged','powerPlant'],['wetland','tidal'],['snow','snowfield']]){
  const s=save();s.encounters=3;
  for(let i=0;i<11;i++){if(E.shouldMeet(s,tile,()=>.999))break}
  assert.ok(s.grassSteps>=1&&s.grassSteps<=11,zone);
  assert.ok(E.pickEncounter(zone,()=>.25).id,zone);
 }
});
test('first village visit unlocks fast travel and grants the gift only once',()=>{
 const s=save(),balls=s.items.ball;
 assert.equal(E.fastTravel(s,'snowTown'),false);
 s.pos={x:83,y:12};const visit=E.move(s,1,0,()=>.999);
 assert.equal(visit.zone,'crystalTown');assert.equal(visit.welcome,true);
 assert.equal(s.items.ball,balls+2);
 assert.equal(E.fastTravel(s,'crystalTown'),true);
 assert.equal(E.fastTravel(s,'town'),true);
 assert.equal(E.fastTravel(s,'harborTown'),false);
 s.pos={x:83,y:12};
 const revisit=E.move(s,1,0,()=>.999);
 assert.equal(revisit.welcome,false);
 assert.equal(s.items.ball,balls+2);
});
test('three distinct discoveries in each biome award only one matching prize',()=>{
 for(const zone of biomes){
  const s=save(),pool=D.encounters[zone].pool,prize=E.HABITAT_REWARDS[zone];
  const before=s.items[prize.item];
  assert.equal(E.recordRegionEncounter(s,zone,pool[0]),null);
  assert.equal(E.recordRegionEncounter(s,zone,pool[0]),null);
  assert.equal(s.regionResearch[zone].seen.length,1);
  assert.equal(E.recordRegionEncounter(s,zone,pool[1]),null);
  const paid=E.recordRegionEncounter(s,zone,pool[2]);
  assert.equal(paid.zone,zone);
  assert.equal(paid.item,prize.item);
  assert.equal(s.items[prize.item],before+1);
  E.recordRegionEncounter(s,zone,pool[3]);
  assert.equal(s.items[prize.item],before+1);
  assert.equal(s.regionResearch[zone].rewarded,true);
 }
});
test('regional research, travelled towns and discovered species survive save/reload',()=>{
 const s=save();s.pos={x:175,y:12};s.flags.visitedZones.push('crystalTown','harborTown','snowTown','tidal');
 E.recordRegionEncounter(s,'tidal',D.encounters.tidal.pool[0]);
 E.recordRegionEncounter(s,'tidal',D.encounters.tidal.pool[1]);
 E.recordRegionEncounter(s,'tidal',D.encounters.tidal.pool[2]);
 const checked=E.validateSave(clone(s));
 assert.ok(checked);
 assert.equal(checked.regionResearch.tidal.rewarded,true);
 assert.equal(checked.regionResearch.tidal.seen.length,3);
 assert.equal(E.fastTravel(checked,'harborTown'),true);
 assert.equal(checked.pos.x,E.VILLAGES.find(v=>v.key==='harborTown').x);
});
test('legacy saves get safe region progress without losing earlier party or coordinates',()=>{
 const s=save();s.pos={x:56,y:8};delete s.flags.visitedZones;delete s.regionResearch;
 const old=E.validateSave(clone(s));
 assert.ok(old);
 assert.equal(old.pos.x,56);assert.equal(old.party[0].id,s.party[0].id);
 assert.ok(old.flags.visitedZones.includes('forest'));
 assert.ok(old.flags.visitedZones.includes('town'));
 assert.deepEqual(Array.from(old.regionResearch.meadow.seen),[]);
});
test('all legacy catchable species remain obtainable when new ecology zones are added',()=>{
 const ids=new Set();
 for(const zone of biomes)for(const id of E.unlockedPool(zone,{wins:20,catches:12}))ids.add(id);
 for(const s of D.species.filter(x=>x.evolutionRank===1&&x.rarity!=='starter'&&x.id!=='shibu_r00_c00'))
  assert.ok(ids.has(s.id),'Missing catchable root '+s.name);
});
