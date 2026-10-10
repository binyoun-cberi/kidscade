'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../games');
const ctx={window:{},Math,Date};
for(const file of ['monsters.js','roster.js','combat.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,'openmon-dex',file),'utf8'),ctx,{filename:file});
for(const file of ['engine.js','turn-battle.js','family-signatures.js','move-dex.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,'openmon-expedition',file),'utf8'),ctx,{filename:file});
const DB=ctx.window.OPENMON_DEX,E=ctx.window.OPENMON_EXPEDITION_ENGINE,
 TB=ctx.window.OPENMON_TURN_BATTLE,MD=ctx.window.KIDSMON_MOVE_DEX;
const clone=o=>JSON.parse(JSON.stringify(o));
test('47 different families each get one distinct named signature; all 140 moves have valid definitions',()=>{
 assert.equal(DB.families.length,47);
 assert.equal(TB.familyMoves.size,47);
 assert.equal(TB.branchMoves.size,18);
 assert.equal(MD.all.length,140);
 const base=[...TB.familyMoves.values()].map(x=>x.base);
 assert.equal(new Set(base).size,47);
 assert.equal(new Set(base.map(id=>TB.moves[id].name)).size,47);
 for(const family of DB.families){
  const move=TB.familyMoves.get(family.key);
  assert.ok(move,'missing '+family.key);
  assert.ok(TB.moves[move.base],family.key);
  assert.ok(MD.learners(move.base).length>0,family.key);
  for(const id of [move.advanced,move.ultimate].filter(Boolean))
   assert.ok(TB.moves[id]&&MD.learners(id).length>0);
 }
 for(const move of MD.all){
  assert.ok(move.name&&move.description&&move.accuracy>=75&&move.accuracy<=100,move.id);
  assert.ok(move.pp>=7&&move.pp<=35,move.id);
  assert.ok(move.power<=16,move.id);
  assert.ok(MD.learners(move.id).length>0,'unused '+move.id);
 }
});
test('all 102 creatures have individual families and 4 legal moves at entry, evolution and endgame levels',()=>{
 assert.equal(DB.species.length,102);
 const familySets=new Set();
 for(const mon of DB.species){
  const base=TB.familyMoves.get(mon.familyKey).base;
  const atEntry={id:mon.id,level:5}; const slots=TB.normalize(atEntry);
  assert.equal(slots.length,4,mon.id);
  assert.ok(slots.some(s=>s.id===base),'signature missing '+mon.id);
  assert.equal(new Set(slots.map(s=>s.id)).size,4);
  familySets.add(slots.map(x=>x.id).join('|'));
  for(const level of [14,26,40]){
   const leveled={id:mon.id,level};
   assert.equal(TB.normalize(leveled).length,4);
   if(mon.evolutionRank>=2&&level>=14){
    const evolved=TB.growthMoves(leveled).advanced;
    assert.ok(evolved&&TB.learnable(leveled).includes(evolved),mon.id);
    assert.ok(leveled.moveSlots.some(x=>x.id===evolved),mon.id);
   }
   if(mon.evolutionRank>=3&&level>=26){
    const ultimate=TB.growthMoves(leveled).ultimate;
    assert.ok(ultimate&&leveled.moveSlots.some(x=>x.id===ultimate),mon.id);
   }
  }
 }
 assert.ok(familySets.size>=47,'did not give every family a distinct starting lineup');
});
test('18 Shibu evolution choices use their own correct-type, individually named technique',()=>{
 const f=DB.families.find(x=>x.key==='shibu-main'),ids=[];
 for(const id of f.parts.slice(1)){
  const mon={id,level:14},sp=DB.species.find(x=>x.id===id);
  const evolved=TB.growthMoves(mon).advanced;
  assert.ok(evolved,'missing branch attack '+id);
  assert.equal(TB.moves[evolved].type,sp.type);
  assert.ok(TB.normalize(mon).some(x=>x.id===evolved));
  assert.equal(MD.earliestLevel(id,evolved),14);
  ids.push(evolved);
 }
 assert.equal(new Set(ids).size,18);
});
test('automatic evolution teaching preserves old PP, adds stage technique and existing saves',()=>{
 const starter=E.createNew('set1_r02_c02'),p=starter.party[0];
 p.level=14;
 p.moveSlots[1].pp=1;
 const before=p.moveSlots.map(x=>({...x}));
 const evolve=DB.combat.evolutionAvailable(p.id,p.level)[0];
 assert.ok(evolve);
 assert.equal(E.maybeEvolve(starter,evolve.id),true);
 const newMove=p.lastEvolutionTechnique;
 assert.ok(newMove&&TB.moves[newMove]?.signatureTier===1);
 assert.ok(p.moveSlots.some(x=>x.id===newMove));
 assert.ok(p.moveSlots.some(x=>x.id==='photoPulse'));
 assert.ok(p.moveSlots.every(x=>x.pp>=0&&x.pp<=TB.moves[x.id].pp));
 const saved=E.validateSave(clone(starter));
 assert.ok(saved?.party?.[0].moveSlots.some(x=>x.id===newMove));
 const old=E.createNew('set1_r02_c02');old.party[0]=E.makeCreature('set1_r01_c01',5);
 const oldMon=old.party[0];
 oldMon.moveSlots=[{id:'tackle',pp:3},{id:'leaf',pp:2},{id:'vine',pp:1},{id:'synthesis',pp:0}];
 const migrated=E.validateSave(clone(old)).party[0];
 assert.ok(migrated.moveSlots.some(x=>x.id===TB.familyMoves.get('set1-seed').base));
 assert.equal(migrated.moveSlots[0].pp,3);
 const changed=E.createNew('set1_r02_c02');changed.party[0]=E.makeCreature('set1_r01_c01',5);
 changed.party[0].moveSlots=[
 {id:'leaf',pp:1},{id:'vine',pp:2},{id:'tackle',pp:3},{id:'synthesis',pp:4}];
 const kept=E.validateSave(clone(changed)).party[0].moveSlots;
 assert.equal(kept[0].id,'leaf');assert.equal(kept[0].pp,1);
});
test('level progression blocks evolved and ultimate skills until applicable rank and level',()=>{
 for(const family of DB.families){
  const moves=TB.familyMoves.get(family.key),baseId=family.parts[0];
  assert.ok(TB.learnable({id:baseId,level:5}).includes(moves.base));
  if(moves.advanced){
   const advancedId=family.parts[1];
   assert.ok(!TB.learnable({id:advancedId,level:13}).includes(moves.advanced));
   assert.ok(TB.learnable({id:advancedId,level:14}).includes(moves.advanced));
   assert.ok(!TB.learnable({id:baseId,level:60}).includes(moves.advanced));
  }
  if(moves.ultimate){
   const final=family.parts[2];
   assert.ok(!TB.learnable({id:final,level:25}).includes(moves.ultimate));
   assert.ok(TB.learnable({id:final,level:26}).includes(moves.ultimate));
  }
 }
 const special=MD.search({family:'signature'}),common=MD.search({family:'common'});
 assert.equal(special.length,99);
 assert.equal(common.length,41);
 assert.ok(MD.search({query:'멘델콩',family:'signature'}).some(m=>m.familyKey==='set1-seed'));
});
test('turn engine can use every newly registered signature with PP, legal effects and bounded damage',()=>{
 let seed=24681357;
 const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296};
 for(const family of DB.families){
  const mon=E.makeCreature(family.parts[0],20),foe=E.makeCreature('set1_r01_c01',19);
  const save=E.createNew('set1_r02_c02');save.party[0]=mon;save.active=0;
  const battle={turnState:TB.state(),firstRoad:false};
  const sig=TB.familyMoves.get(family.key).base;
  const skill=mon.moveSlots.find(x=>x.id===sig);
  assert.ok(skill,family.key);
  const pp=skill.pp;
  const result=TB.resolve({save,foe,battle,action:{type:'move',id:sig},random:rng,rookieCap:0});
  assert.ok(result.ok,family.key);
  assert.equal(mon.moveSlots.find(x=>x.id===sig)?.pp,pp-1,family.key);
  assert.ok(mon.hp>=0&&mon.hp<=DB.combat.statsAtLevel(mon.id,mon.level,mon).hp);
  assert.ok(foe.hp>=0&&foe.hp<=DB.combat.statsAtLevel(foe.id,foe.level).hp);
  assert.ok(result.events.length>0);
 }
});
test('game scripts are loaded in order and 102 monster/save identities remain intact',()=>{
 const html=fs.readFileSync(path.join(root,'openmon-expedition','index.html'),'utf8'),
  game=fs.readFileSync(path.join(root,'openmon-expedition','game.js'),'utf8');
 const order=['turn-battle.js','family-signatures.js','move-dex.js','game.js'];
 assert.ok(order.every((file,i)=>i===0||html.indexOf('src="'+order[i-1]+'"')<html.indexOf('src="'+file+'"')));
 assert.ok(game.includes('family:"all"')&&game.includes('moveDexFamily'));
 assert.ok(game.includes('kidscade.openmon.expedition.save.v1'));
 assert.doesNotThrow(()=>new Function(game));
});
