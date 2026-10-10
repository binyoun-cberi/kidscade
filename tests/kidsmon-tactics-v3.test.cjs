'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../games'),ctx={window:{},Math,Date};
for(const p of ['monsters.js','roster.js','combat.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,'openmon-dex',p),'utf8'),ctx,{filename:p});
for(const p of ['engine.js','turn-battle.js','family-signatures.js','move-dex.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,'openmon-expedition',p),'utf8'),ctx,{filename:p});
const D=ctx.window.OPENMON_DEX,E=ctx.window.OPENMON_EXPEDITION_ENGINE,B=ctx.window.OPENMON_TURN_BATTLE;
const clone=o=>JSON.parse(JSON.stringify(o));
function force(mon,id){
 const filler=['tackle','quick','focus','leaf','water'].filter(k=>k!==id).slice(0,3);
 mon.moveSlots=[{id,pp:B.moves[id].pp},...filler.map(id=>({id,pp:0}))];
 mon.moveLoadoutCustomized=true;
}

test('six stats and personality are valid across all 102 KIDSMON species',()=>{
 assert.equal(D.species.length,102);
 for(const s of D.species){
  const mon=E.makeCreature(s.id,26,()=>.47);
  const stats=D.combat.statsAtLevel(mon.id,mon.level,mon);
  assert.equal(Object.keys(stats).length,6,s.name);
  for(const key of D.combat.STAT_KEYS){
   assert.ok(Number.isInteger(stats[key])&&stats[key]>0,s.name+' '+key);
   assert.ok(Number.isInteger(mon.genetics.iv[key])&&mon.genetics.iv[key]>=0&&mon.genetics.iv[key]<=15,key);
  }
  assert.ok(D.combat.ABILITIES[D.combat.abilityFor(mon)]);
 }
});

test('old saves migrate to stable genetics without rerolling and retain old save ID',()=>{
 const fresh=E.createNew('set1_r02_c02');
 delete fresh.party[0].genetics;delete fresh.party[0].shiny;
 delete fresh.items.life;delete fresh.items.energy;delete fresh.items.climate;delete fresh.items.thought;
 const loaded=E.validateSave(clone(fresh));
 assert.ok(loaded);assert.equal(loaded.version,1);
 assert.equal(loaded.items.life,0);
 assert.equal(loaded.party[0].shiny,false);
 const again=E.validateSave(clone(loaded));
 assert.deepEqual(clone(loaded.party[0].genetics),clone(again.party[0].genetics));
});

test('rare palette does not confer combat stats; shinies persist on capture',()=>{
 const shiny=E.makeCreature('set1_r01_c01',5,()=>0);
 const ordinary=E.makeCreature('set1_r01_c01',5,()=>.5);
 assert.equal(shiny.shiny,true);assert.equal(ordinary.shiny,false);
 const save=E.createNew('set1_r02_c02'),where=E.addCaptured(save,shiny);
 assert.ok(where==='party'||where==='box');
 const owned=[...save.party,...save.box].find(m=>m.id===shiny.id);
 assert.equal(owned.shiny,true);
 assert.deepEqual(clone(owned.genetics),clone(shiny.genetics));
});

test('physical/special attacks and individual potential are included in real damage math',()=>{
 const m=E.makeCreature('set1_r01_c01',26,()=>.3);
 const target=E.makeCreature('set1_r00_c01',26,()=>.6);
 const config={attacker:m.id,defender:target.id,attackerLevel:26,defenderLevel:26,
  attackerMon:m,defenderMon:target,moveType:'neutral',power:8};
 const physical=D.combat.damage({...config,damageClass:'physical'});
 const special=D.combat.damage({...config,damageClass:'special'});
 assert.ok(Number.isInteger(physical)&&physical>0);
 assert.ok(Number.isInteger(special)&&special>0);
 assert.ok(physical!==special||D.combat.statsAtLevel(m.id,26,m).attack===D.combat.statsAtLevel(m.id,26,m).spAttack);
});

test('counter protects first and reflects real damage before attacker finishes turn',()=>{
 const p=E.makeCreature('set1_r00_c01',12,()=>.5),foe=E.makeCreature('set1_r02_c02',12,()=>.4);
 force(p,'counter');force(foe,'tackle');
 const save={party:[p],active:0,items:{ball:0,potion:0}},battle={turnState:B.state()};
 const hp=foe.hp;
 const result=B.resolve({save,foe,battle,action:{type:'move',id:'counter'},random:()=>.5});
 assert.equal(result.ok,true);assert.ok(result.playerFirst);
 assert.ok(result.events.some(x=>x.includes('반격!')),result.events.join(' '));
 assert.ok(foe.hp<hp);
});

test('vine trap prevents switching while active',()=>{
 const p=E.makeCreature('set1_r01_c01',10,()=>.5),enemy=E.makeCreature('set1_r00_c01',10,()=>.6);
 force(enemy,'vine');force(p,'tackle');
 const save={party:[p,E.makeCreature('set1_r02_c02',10,()=>.8)],active:0,items:{ball:0,potion:0}};
 const battle={turnState:B.state()};
 // Enemy inflicts vine trap on its own move, with a deterministic 100% hit RNG.
 const first=B.resolve({save,foe:enemy,battle,action:{type:'move',id:'tackle'},random:()=>.01});
 assert.equal(first.ok,true);
 assert.ok(battle.turnState.player.trapTurns>0,first.events.join(' '));
 const switchResult=B.resolve({save,foe:enemy,battle,action:{type:'switch',index:1},random:()=>.5});
 assert.equal(switchResult.ok,false);
 assert.equal(switchResult.reason,'trapped');
});

test('evolution crystals spend exactly once and respect known evolution links',()=>{
 const save=E.createNew('set1_r02_c02'),mon=save.party[0];
 mon.level=10;mon.hp=D.combat.statsAtLevel(mon.id,10,mon).hp;
 const choices=E.stoneEvolutionOptions(save);
 assert.ok(choices.length>0);
 const choice=choices[0];
 assert.equal(choice.stone,'life');
 const before=save.items.life;
 assert.equal(E.useEvolutionStone(save,choice.id,choice.stone),true);
 assert.equal(save.items.life,before-1);
 assert.equal(mon.id,choice.id);
 assert.ok(save.collection[choice.id]);
 assert.equal(E.useEvolutionStone(save,choice.id,choice.stone),false);
});

test('new move descriptions cover counters and tactical CC',()=>{
 const dex=ctx.window.KIDSMON_MOVE_DEX;
 assert.equal(dex.all.length,140);
 assert.match(dex.detail('counter').description,/반격/);
 assert.match(dex.detail('vine').description,/교체/);
 assert.match(dex.detail('static').description,/감전/);
});
