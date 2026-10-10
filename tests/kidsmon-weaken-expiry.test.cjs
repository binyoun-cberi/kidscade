'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../games'),ctx={window:{},Math,Date};
for(const p of ['monsters.js','roster.js','combat.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,'openmon-dex',p),'utf8'),ctx,{filename:p});
for(const p of ['engine.js','turn-battle.js','family-signatures.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,'openmon-expedition',p),'utf8'),ctx,{filename:p});
const E=ctx.window.OPENMON_EXPEDITION_ENGINE,B=ctx.window.OPENMON_TURN_BATTLE;

function duel(){
 const my=E.makeCreature('set1_r03_c02',40),foe=E.makeCreature('set1_r00_c01',40);
 return {my,foe,save:{party:[my],active:0,items:{ball:0,potion:0}},battle:{turnState:B.state()}};
}
test('weaken lowers attack for its stated duration and restores it upon expiry',()=>{
 const d=duel(),side=d.battle.turnState.foe;
 const first=B.resolve({save:d.save,foe:d.foe,battle:d.battle,
  action:{type:'move',id:'pascalPress'},random:()=>.01});
 assert.equal(first.ok,true);
 assert.equal(side.attack,-1);
 assert.equal(side.condition,'weaken');
 assert.equal(side.conditionTurns,1);
 const next=B.resolve({save:d.save,foe:d.foe,battle:d.battle,
  action:{type:'move',id:'tackle'},random:()=>.01});
 assert.equal(next.ok,true);
 assert.equal(side.attack,0,'the 2-turn debuff must not last indefinitely');
 assert.equal(side.condition,null);
 assert.equal(side.weakenPenalty,0);
});
test('weaken cannot generate a free attack buff at the -3 stage limit',()=>{
 const d=duel(),side=d.battle.turnState.foe;
 side.attack=-3;side.condition='weaken';side.conditionTurns=1;side.weakenPenalty=0;
 const result=B.resolve({save:d.save,foe:d.foe,battle:d.battle,
  action:{type:'move',id:'tackle'},random:()=>.01});
 assert.equal(result.ok,true);
 assert.equal(side.attack,-3);
 assert.equal(side.condition,null);
});
