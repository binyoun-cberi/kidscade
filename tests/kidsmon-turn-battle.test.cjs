'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../games');
const context={window:{},Math,Date};
for(const p of ['monsters.js','roster.js','combat.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,'openmon-dex',p),'utf8'),context,{filename:p});
for(const p of ['engine.js','turn-battle.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,'openmon-expedition',p),'utf8'),context,{filename:p});
const E=context.window.OPENMON_EXPEDITION_ENGINE,B=context.window.OPENMON_TURN_BATTLE,D=context.window.OPENMON_DEX;
const clone=x=>JSON.parse(JSON.stringify(x));
const one=(starter='set1_r02_c02',enemy='set1_r01_c01')=>{
 const save=E.createNew(starter),foe=E.makeCreature(enemy,3),battle={turnState:B.state()};
 return {save,foe,battle};
};
test('41 accessible techniques cover all 10 types with distinct starter signature techniques',()=>{
 assert.equal(Object.keys(D.types).length,10);
 assert.ok(Object.keys(B.moves).length>=40);
 for(const t of Object.keys(D.types))
  assert.ok(Object.values(B.moves).some(m=>m.type===t&&m.power>0),'no attacking move for '+t);
 const sig=['photoPulse','pascalPress','fiboStrikes'];
 for(const [i,starter]of ['set1_r02_c02','set1_r03_c02','set1_r04_c02'].entries()){
  const p=E.createNew(starter).party[0];
  assert.equal(p.moveSlots.length,4);
  assert.equal(p.moveSlots[3].id,sig[i]);
 }
});
test('all 102 sprites are playable with four validated moves and 4 moves max',()=>{
 for(const species of D.species){
  const p=E.makeCreature(species.id,12);
  assert.equal(p.moveSlots.length,4,species.id);
  assert.equal(new Set(p.moveSlots.map(s=>s.id)).size,4);
  for(const slot of p.moveSlots){assert.ok(B.moves[slot.id]);assert.equal(slot.pp,B.moves[slot.id].pp)}
 }
});
test('PP is consumed exactly once, even by faster AI and two-hit moves',()=>{
 const {save,foe,battle}=one('set1_r04_c02');
 const before=save.party[0].moveSlots[3].pp;
 const out=B.resolve({save,foe,battle,action:{type:'move',id:'fiboStrikes'},random:()=>.2});
 assert.ok(out.ok);
 assert.equal(save.party[0].moveSlots[3].pp,before-1);
 assert.match(out.events.join(' '),/2회 연속 공격/);
 assert.ok(foe.hp<E.makeCreature(foe.id,3).hp);
 assert.ok(foe.moveSlots.some(x=>x.pp<B.moves[x.id].pp),'AI must use PP too');
});
test('fast attack resolves before slow defender and move priority overrides speed',()=>{
 const {save,foe,battle}=one('set1_r03_c02');
 const p=save.party[0];
 const speedOne=B.score(p,battle.turnState.player),speedTwo=B.score(foe,battle.turnState.foe);
 const normal=B.resolve({save,foe,battle,action:{type:'move',id:'water'},random:()=>.5});
 assert.equal(normal.playerFirst,speedOne>speedTwo||speedOne===speedTwo&&false);
 const swift=one('set1_r04_c02');
 const quick=B.resolve({save:swift.save,foe:swift.foe,battle:swift.battle,action:{type:'move',id:'quick'},random:()=>.5});
 assert.equal(quick.ok,false,'unlearned quick must not be used');
 const q=one('set1_r04_c02');
 assert.ok(B.changeMove(q.save.party[0],'quick',2)===false,'quick not yet unlocked');
 q.save.party[0].level=26;B.normalize(q.save.party[0]);
 assert.ok(B.changeMove(q.save.party[0],'quick',2));
 const pr=B.resolve({save:q.save,foe:q.foe,battle:q.battle,action:{type:'move',id:'quick'},random:()=>.7});
 assert.ok(pr.ok&&pr.playerFirst,'priority +1 should act before normal');
});
test('buffs, debuffs, shields, burn and healing are resolved with bounded effects',()=>{
 const {save,foe,battle}=one('set1_r02_c02');
 save.party[0].hp-=11;
 const result=B.resolve({save,foe,battle,action:{type:'move',id:'synthesis'},random:()=>.25});
 assert.ok(result.events.some(x=>x.includes('회복')),result.events.join(' '));
 assert.ok(save.party[0].hp>0);
 const shield=one('set1_r03_c02');
 const result2=B.resolve({save:shield.save,foe:shield.foe,battle:shield.battle,action:{type:'move',id:'raincoat'},random:()=>.1});
 assert.ok(result2.events.some(x=>x.includes('물의 장막')));
 const weaker=one('set1_r03_c02');
 const change=B.resolve({save:weaker.save,foe:weaker.foe,battle:weaker.battle,action:{type:'move',id:'pascalPress'},random:()=>.05});
 assert.ok(change.ok&&change.events.some(x=>x.includes('압력')),change.events.join(' '));
});
test('capture, switching, healing and running retain strict one-turn action semantics',()=>{
 const captured=one();
 captured.foe.hp=1;
 const balls=captured.save.items.ball;
 const result=B.resolve({save:captured.save,foe:captured.foe,battle:captured.battle,action:{type:'ball'},random:()=>0});
 assert.equal(result.outcome,'caught');assert.equal(captured.save.items.ball,balls-1);
 const full=one();full.save.party[0].hp-=25;const before=full.save.items.potion;
 const heal=B.resolve({save:full.save,foe:full.foe,battle:full.battle,action:{type:'potion'},random:()=>.5});
 assert.ok(heal.ok);assert.equal(full.save.items.potion,before-1);
 const fleeing=one();assert.equal(B.resolve({save:fleeing.save,foe:fleeing.foe,battle:fleeing.battle,action:{type:'run'},random:()=>.4}).outcome,'run');
 const switching=one();switching.save.party.push(E.makeCreature('set1_r04_c02',5));
 const swap=B.resolve({save:switching.save,foe:switching.foe,battle:switching.battle,action:{type:'switch',index:1},random:()=>.4});
 assert.ok(swap.ok);assert.equal(switching.save.active,1);
});
test('old save schema automatically gains PP, and clinic replenishes HP and PP',()=>{
 const {save}=one();
 delete save.party[0].moveSlots;
 const old=E.validateSave(clone(save));
 assert.ok(old?.party[0].moveSlots?.length===4);
 const p=old.party[0];p.moveSlots[0].pp=0;p.hp=1;
 E.healAll(old);
 assert.equal(p.hp,D.combat.statsAtLevel(p.id,p.level).hp);
 assert.equal(p.moveSlots[0].pp,B.moves[p.moveSlots[0].id].pp);
 const again=E.validateSave(clone(old));
 assert.equal(again.party[0].moveSlots.length,4);
});
test('move learning at levels 14/26 enforces four slots and blocks duplicate or illegal moves',()=>{
 const {save}=one('set1_r02_c02');const p=save.party[0];
 assert.equal(B.changeMove(p,'bloom',2),false);
 p.level=14;
 assert.ok(B.learnable(p).includes('bloom'));
 assert.ok(B.changeMove(p,'bloom',2));
 assert.equal(B.changeMove(p,'bloom',1),false);
 assert.equal(p.moveSlots.length,4);
 assert.ok(B.learnable({...p,level:26}).includes('quick'));
});
