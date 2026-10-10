'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../games'),ctx={window:{},Math,Date};
for(const p of ['monsters.js','roster.js','combat.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,'openmon-dex',p),'utf8'),ctx,{filename:p});
for(const p of ['engine.js','turn-battle.js','family-signatures.js','move-dex.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,'openmon-expedition',p),'utf8'),ctx,{filename:p});
const D=ctx.window.OPENMON_DEX,E=ctx.window.OPENMON_EXPEDITION_ENGINE;
const B=ctx.window.OPENMON_TURN_BATTLE,MD=ctx.window.KIDSMON_MOVE_DEX;

test('all 140 skills can be equipped, resolve in battle and consume exactly 1 PP',()=>{
 assert.equal(MD.all.length,140);
 for(const skill of MD.all){
  const learner=MD.learners(skill.id)[0];
  assert.ok(learner,'learner missing for '+skill.id);
  const mon=E.makeCreature(learner.id,Math.max(26,learner.level));
  assert.ok(B.learnable(mon).includes(skill.id),'cannot learn '+skill.id);
  if(!mon.moveSlots.some(x=>x.id===skill.id))
   assert.equal(B.changeMove(mon,skill.id,3),true,'cannot equip '+skill.id);
  const before=mon.moveSlots.find(x=>x.id===skill.id)?.pp;
  assert.ok(before>0,skill.id);
  mon.hp=Math.floor(D.combat.statsAtLevel(mon.id,mon.level).hp*.78);
  const foe=E.makeCreature('set1_r00_c01',26);
  const result=B.resolve({save:{party:[mon],active:0,items:{ball:0,potion:0}},
   foe,battle:{turnState:B.state()},action:{type:'move',id:skill.id},random:()=>.01});
  assert.equal(result.ok,true,'battle rejected '+skill.id+': '+result.reason);
  assert.equal(mon.moveSlots.find(x=>x.id===skill.id)?.pp,before-1,'PP mismatch '+skill.id);
  assert.ok(result.events.some(x=>x.includes(skill.name)),'move not fired '+skill.id);
 }
});
test('manual move configuration survives normalization, combat and save reloading',()=>{
 const save=E.createNew('set1_r03_c02'),p=save.party[0];
 p.level=26;p.hp=D.combat.statsAtLevel(p.id,p.level).hp;
 assert.ok(B.changeMove(p,'pressure',3));
 assert.equal(p.moveLoadoutCustomized,true);
 B.normalize(p);
 assert.ok(p.moveSlots.some(x=>x.id==='pressure'));
 const foe=E.makeCreature('set1_r00_c01',26);
 assert.ok(B.resolve({save,foe,battle:{turnState:B.state()},
  action:{type:'move',id:'pressure'},random:()=>.01}).ok);
 assert.ok(p.moveSlots.some(x=>x.id==='pressure'));
 const recovered=E.validateSave(JSON.parse(JSON.stringify(save)));
 assert.ok(recovered?.party[0]?.moveSlots.some(x=>x.id==='pressure'));
 assert.equal(recovered.party[0].moveLoadoutCustomized,true);
});
test('auto-teaching an evolution move never replaces a user-configured slot',()=>{
 const mon=E.makeCreature('set1_r01_c01',26);
 assert.equal(B.changeMove(mon,'quick',3),true);
 const original=mon.moveSlots.map(x=>x.id);
 mon.id='set1_r01_c02';
 const taught=B.equipEvolutionTechnique(mon);
 assert.equal(taught,null);
 assert.deepEqual(Array.from(mon.moveSlots,x=>x.id),Array.from(original));
});
