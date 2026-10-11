'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../games'),ctx={window:{},Math,Date};
for(const p of ['monsters.js','roster.js','combat.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,'openmon-dex',p),'utf8'),ctx,{filename:p});
for(const p of ['engine.js','turn-battle.js','family-signatures.js','move-dex.js','trainer-battle.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,'openmon-expedition',p),'utf8'),ctx,{filename:p});
const E=ctx.window.OPENMON_EXPEDITION_ENGINE,B=ctx.window.OPENMON_TURN_BATTLE,
 D=ctx.window.OPENMON_DEX,T=ctx.window.KIDSMON_TRAINERS;
const rng=()=>.5;
const clone=x=>JSON.parse(JSON.stringify(x));
function party(){
 const save=E.createNew('set1_r02_c02');
 save.party.push(E.makeCreature('set1_r03_c02',10,rng),E.makeCreature('set1_r04_c02',10,rng));
 save.party[0].level=10;
 for(const p of save.party)p.hp=D.combat.statsAtLevel(p.id,p.level,p).hp;
 return save;
}
function start(save,id='meadow'){
 const trainer=T.makeTrainer(save,id,rng);
 assert.ok(trainer);
 return {trainer,foe:trainer.party[0],turnState:B.state()};
}
function forceMoves(mon,ids){
 mon.moveSlots=ids.map(id=>({id,pp:B.moves[id].pp}));
 mon.moveLoadoutCustomized=true;
}
test('trainer mode requires three healthy party members and respects research unlocks',()=>{
 const save=E.createNew('set1_r02_c02');
 assert.equal(T.available(save,'meadow'),false);
 assert.equal(T.makeTrainer(save,'meadow'),null);
 save.party.push(E.makeCreature('set1_r03_c02',5,rng),E.makeCreature('set1_r04_c02',5,rng));
 assert.equal(T.available(save,'meadow'),true);
 assert.equal(T.available(save,'forest'),false);
 save.wins=3;assert.equal(T.available(save,'forest'),true);
 save.party[2].hp=0;assert.equal(T.available(save,'meadow'),false);
});
test('initial trainer creates three opponents, locks a 3-member player squad, and leaves wild data unchanged',()=>{
 const save=party();
 const battle=start(save);
 assert.equal(battle.trainer.party.length,3);
 assert.equal(battle.trainer.playerSlots.length,3);
 assert.deepEqual(Array.from(battle.trainer.playerSlots),[0,1,2]);
 assert.equal(save.wins,0);assert.equal(save.catches,0);
 const result=B.resolve({save,foe:battle.foe,battle,
  action:{type:'move',id:save.party[0].moveSlots[0].id},random:rng});
 assert.equal(result.ok,true);
 assert.equal(result.outcome,'continue');
});
test('trainer forbids balls, running, soft captures, and switching outside selected slots',()=>{
 const save=party();
 save.party.push(E.makeCreature('set1_r00_c01',10,rng));
 const battle=start(save),foe=battle.foe;
 for(const type of ['ball','soft','run']){
  const r=B.resolve({save,foe,battle,action:{type},random:rng});
  assert.equal(r.ok,false,type);assert.equal(r.reason,'trainer-action');
 }
 const invalid=B.resolve({save,foe,battle,action:{type:'switch',index:3},random:rng});
 assert.equal(invalid.ok,false);assert.equal(invalid.reason,'switch');
 const valid=B.resolve({save,foe,battle,action:{type:'switch',index:1},random:rng});
 assert.equal(valid.ok,true);assert.equal(save.active,1);
});
test('type-aware trainer AI chooses a better live reserve, and a swap consumes its attack',()=>{
 const save=party();
 save.party[0]=E.makeCreature('set4_r01_c02',15,rng);
 save.active=0;
 const water=E.makeCreature('set2_r00_c04',15,rng);
 const earth=E.makeCreature('set1_r00_c01',15,rng);
 const fire=E.makeCreature('set4_r00_c03',15,rng);
 const trainer={id:'meadow',name:'연구원',party:[water,earth,fire],
  playerSlots:[0,1,2],active:0,turn:3,switches:0,lastSwitchTurn:-9,maxSwitches:3};
 const battle={foe:water,trainer,turnState:B.state()};
 const selected=T.chooseSwitch({trainer,player:save.party[0],foe:water,side:battle.turnState});
 assert.equal(selected,1);
 const waterHP=water.hp,earthHP=earth.hp;
 const result=B.resolve({save,foe:water,battle,
   action:{type:'move',id:save.party[0].moveSlots[0].id},random:rng});
 assert.equal(result.ok,true);
 assert.equal(result.enemySwitched,true);
 assert.equal(trainer.active,1);
 assert.equal(battle.foe,earth);
 assert.equal(water.hp,waterHP,'recalled enemy must not absorb the attack');
 assert.ok(earth.hp<earthHP,'player attack must reach incoming enemy');
 assert.ok(result.events.some(x=>x.includes('교체')));
 assert.equal(trainer.switches,1);
});
test('trap prevents opponent AI switching until its control effect expires',()=>{
 const save=party(),trainer=T.makeTrainer(save,'meadow',rng);
 const side=B.state();
 side.foe.trapTurns=1;
 trainer.turn=5;
 const selected=T.chooseSwitch({trainer,player:save.party[0],foe:trainer.party[0],side});
 assert.equal(selected,-1);
 side.player.trapTurns=1;
 const battle={trainer,foe:trainer.party[0],turnState:side};
 assert.equal(B.resolve({save,foe:battle.foe,battle,action:{type:'switch',index:1},random:rng}).reason,'trapped');
});
test('knockouts bring in the next live opponent, and win only on the third knockout',()=>{
 const save=party(),battle=start(save),trainer=battle.trainer;
 trainer.maxSwitches=0; // Test forced KO replacements separately from optional tactical swaps.
 save.party[0].level=50;save.party[0].hp=D.combat.statsAtLevel(save.party[0].id,50,save.party[0]).hp;
 forceMoves(save.party[0],['tackle','quick','focus','leaf']);
 for(let i=0;i<3;i++){
  trainer.party[trainer.active].hp=1;
  const foe=battle.foe;
  const result=B.resolve({save,foe,battle,action:{type:'move',id:'tackle'},random:rng});
  assert.equal(result.ok,true);
  assert.equal(result.outcome,i===2?'won':'continue');
  if(i<2){
   assert.ok(result.events.some(x=>x.includes('다음 키즈몬')));
   assert.equal(trainer.party.filter(p=>p.hp>0).length,2-i);
   assert.notEqual(battle.foe,foe);
  }
 }
});
test('player auto-substitution cannot borrow a fourth unslotted party member',()=>{
 const save=party();save.party.push(E.makeCreature('set1_r00_c01',10,rng));
 const battle=start(save);
 for(const i of battle.trainer.playerSlots)save.party[i].hp=0;
 save.party[0].hp=1;
 forceMoves(battle.foe,['quick','tackle','stone','leaf']);
 const result=B.resolve({save,foe:battle.foe,battle,action:{type:'move',id:save.party[0].moveSlots[0].id},random:rng});
 assert.equal(result.ok,true);assert.equal(result.outcome,'lost');
 assert.equal(save.party[3].hp>0,true,'fourth reserve must remain outside the match');
});
test('trainer reward awards party XP once per victory, tracks clears, and does not increase wild wins',()=>{
 const save=party();const trainer=T.makeTrainer(save,'meadow',rng);
 const before=save.party.map(x=>x.xp),wins=save.wins,catches=save.catches;
 const first=T.reward(save,trainer);
 assert.equal(first.coins,120);assert.equal(first.first,true);
 assert.equal(save.trainerWins.meadow,1);
 assert.equal(save.wins,wins);assert.equal(save.catches,catches);
 for(let i=0;i<3;i++)assert.ok(save.party[i].xp>before[i]);
 const again=T.reward(save,trainer);
 assert.equal(again.coins,35);assert.equal(again.first,false);
 assert.equal(save.trainerWins.meadow,2);
 const restored=E.validateSave(clone(save));
 assert.equal(restored.trainerWins.meadow,2);
});
test('wild 1v1 behavior still allows capture and preserves battle engine compatibility',()=>{
 const save=E.createNew('set1_r02_c02');
 const foe=E.makeCreature('set1_r01_c01',3,rng);
 const battle={turnState:B.state()};
 assert.equal(B.resolve({save,foe,battle,action:{type:'ball'},random:()=>0}).outcome,'caught');
 const foe2=E.makeCreature('set1_r01_c01',3,rng);
 const result=B.resolve({save,foe:foe2,battle:{turnState:B.state()},
  action:{type:'move',id:save.party[0].moveSlots[0].id},random:rng});
 assert.equal(result.ok,true);
});
