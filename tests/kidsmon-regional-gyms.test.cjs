'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../games'),ctx={window:{},Math,Date};
for(const p of ['monsters.js','roster.js','combat.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,'openmon-dex',p),'utf8'),ctx,{filename:p});
for(const p of ['engine.js','turn-battle.js','trainer-battle.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,'openmon-expedition',p),'utf8'),ctx,{filename:p});
const D=ctx.window.OPENMON_DEX,E=ctx.window.OPENMON_EXPEDITION_ENGINE,B=ctx.window.OPENMON_TURN_BATTLE,T=ctx.window.KIDSMON_TRAINERS;
const clone=x=>JSON.parse(JSON.stringify(x));
const rand=()=>.42;
const copyParty=save=>{while(save.party.length<3)save.party.push(E.makeCreature('set1_r04_c02',12,rand));};
function prepare(village){
 const save=E.createNew('set1_r02_c02');copyParty(save);
 const q=E.REGIONAL_QUESTS[village];save.flags.visitedZones.push(village,q.zone);
 for(const id of D.encounters[q.zone].pool.slice(0,3))E.recordRegionEncounter(save,q.zone,id);
 save.collection[q.capture]=true;return save;
}
test('regional gyms retain the three research trainers and introduce three separate leaders',()=>{
 assert.equal(T.TRAINERS.length,3);assert.equal(T.GYMS.length,3);
 assert.equal(D.species.length,102);
 assert.deepEqual(Array.from(T.GYMS.map(x=>x.village)),['crystalTown','harborTown','snowTown']);
 for(const gym of T.GYMS)for(const id of gym.species)assert.ok(D.species.some(s=>s.id===id));
});
test('village missions require three different observations and a named capture',()=>{
 const s=E.createNew('set1_r02_c02'),v='crystalTown',q=E.REGIONAL_QUESTS[v];
 s.flags.visitedZones.push(v);
 assert.equal(E.claimRegionalQuest(s,v),null);
 for(const id of D.encounters[q.zone].pool.slice(0,3))E.recordRegionEncounter(s,q.zone,id);
 assert.equal(E.questStatus(s,v).observed,3);
 assert.equal(E.claimRegionalQuest(s,v),null);
 s.collection[q.capture]=true;
 assert.equal(E.questStatus(s,v).ready,true);
});
test('quests can only be claimed in a visited village and reward exactly once',()=>{
 const s=prepare('crystalTown'),q=E.REGIONAL_QUESTS.crystalTown;
 s.flags.visitedZones=s.flags.visitedZones.filter(x=>x!=='crystalTown');
 assert.equal(E.claimRegionalQuest(s,'crystalTown'),null);
 s.flags.visitedZones.push('crystalTown');
 const coins=s.coins,before=s.items[q.item];
 assert.ok(E.claimRegionalQuest(s,'crystalTown'));
 assert.equal(s.items[q.item],before+1);assert.equal(s.coins,coins+70);
 assert.equal(E.claimRegionalQuest(s,'crystalTown'),null);
 assert.equal(s.items[q.item],before+1);
});
test('gyms unlock only in order after local science quests',()=>{
 const s=prepare('crystalTown');
 assert.equal(T.available(s,'gym_energy'),false);
 E.claimRegionalQuest(s,'crystalTown');assert.equal(T.available(s,'gym_energy'),true);
 const mid=prepare('harborTown');E.claimRegionalQuest(mid,'harborTown');
 assert.equal(T.available(mid,'gym_tide'),false);
 mid.trainerWins={gym_energy:1};assert.equal(T.available(mid,'gym_tide'),true);
 const end=prepare('snowTown');E.claimRegionalQuest(end,'snowTown');
 assert.equal(T.available(end,'gym_frost'),false);
 end.trainerWins={gym_tide:1};assert.equal(T.available(end,'gym_frost'),true);
});
test('gym challenger uses the real 3v3 battle engine and receives the first badge once',()=>{
 const s=prepare('crystalTown');
 E.claimRegionalQuest(s,'crystalTown');
 const t=T.makeTrainer(s,'gym_energy',rand,[0,1,2]);assert.ok(t);
 assert.equal(t.party.length,3);
 const encounter={trainer:t,foe:t.party[0],turnState:B.state()};
 const first=B.resolve({save:s,foe:encounter.foe,battle:encounter,
  action:{type:'move',id:s.party[0].moveSlots[0].id},random:rand});
 assert.equal(first.ok,true);
 const reward=T.reward(s,t);assert.equal(reward.badge,'전류 배지');
 assert.equal(s.trainerWins.gym_energy,1);
 const repeat=T.reward(s,t);assert.equal(repeat.badge,null);
 assert.equal(repeat.coins,45);assert.equal(s.trainerWins.gym_energy,2);
});
test('weather phases are controlled by exploration steps rather than system time',()=>{
 const s=prepare('crystalTown');
 for(const [zone,phase] of [['powerPlant',1],['tidal',2],['snowfield',3]]){
  s.steps=phase*18;
  assert.equal(E.eventStatus(zone,s).active,true);
  s.steps=(phase+1)*18;
  assert.equal(E.eventStatus(zone,s).active,false);
 }
});
test('rare forms are blocked until the correct gym badge and phase are active',()=>{
 const s=prepare('crystalTown');
 for(const [zone,cfg] of Object.entries(E.RARE_EVENTS)){
  s.steps=cfg.phase*18;s.trainerWins={};
  const plain=E.pickEncounter(zone,()=>.001,s);
  assert.notEqual(plain.id,cfg.species);
  s.trainerWins[cfg.gym]=1;
  const rare=E.pickEncounter(zone,()=>.001,s);
  assert.equal(rare.id,cfg.species);
  assert.equal(rare.rareHabitat,zone);
  assert.ok(rare.hp>0);
  s.steps=((cfg.phase+1)%4)*18;
  assert.notEqual(E.pickEncounter(zone,()=>.001,s).id,cfg.species);
 }
});
test('rare species are still capturable with stable sprite and metadata',()=>{
 const s=prepare('crystalTown');s.trainerWins={gym_energy:1};s.steps=18;
 const m=E.pickEncounter('powerPlant',()=>0,s);
 assert.equal(m.rareHabitat,'powerPlant');
 const original=m.id;E.addCaptured(s,m);
 const captured=[...s.party,...s.box].find(p=>p.id===original&&p.rareHabitat);
 assert.ok(captured);assert.ok(s.collection[original]);
});
test('region quests and badge victories survive validation of old v1 saves',()=>{
 const s=prepare('harborTown');E.claimRegionalQuest(s,'harborTown');
 s.trainerWins={gym_energy:1,gym_tide:1};
 const v=E.validateSave(clone(s));
 assert.ok(v);assert.equal(v.version,1);
 assert.equal(v.regionQuests.harborTown,true);assert.equal(v.trainerWins.gym_tide,1);
 const old=E.createNew('set1_r02_c02');
 delete old.regionQuests;delete old.trainerWins;
 const legacy=E.validateSave(clone(old));
 assert.ok(legacy);assert.equal(legacy.regionQuests.crystalTown,false);
 assert.equal(legacy.trainerWins.gym_frost,0);
});
test('the original first-route tutorial remains unchanged with zero badge and zero quest progress',()=>{
 const s=E.createNew('set1_r02_c02');
 for(let i=0;i<12;i++){
  const movement=E.move(s,1,0,()=>.999);
  if(movement.firstRoad){
   assert.equal(movement.encounter.level,2);
   assert.ok(movement.encounter.id);break;
  }
 }
 assert.equal(s.trainerWins,undefined);
 assert.equal(s.regionQuests.crystalTown,undefined);
});
