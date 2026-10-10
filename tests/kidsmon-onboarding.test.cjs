'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..','games');
const context={window:{},Math,Date};
for(const p of ['monsters.js','roster.js','combat.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,'openmon-dex',p),'utf8'),context,{filename:p});
vm.runInNewContext(fs.readFileSync(path.join(root,'openmon-expedition','engine.js'),'utf8'),context,{filename:'engine.js'});
const D=context.window.OPENMON_DEX,E=context.window.OPENMON_EXPEDITION_ENGINE;
const starters=['set1_r02_c02','set1_r03_c02','set1_r04_c02'];
const clone=x=>JSON.parse(JSON.stringify(x));
const unique=s=>Object.keys(s.collection).length;
test('the main road delivers the first catch tutorial for all starters, without wandering',()=>{
 for(const starter of starters){
  let s=E.createNew(starter),first=null;
  for(let i=0;i<30;i++){
   let result=E.move(s,1,0,()=>.999);
   assert.ok(result.moved,'blocked road step '+i);
   if(result.encounter){first=result;break}
  }
  assert.ok(first&&first.firstRoad,'missing fixed first road encounter');
  assert.equal(first.encounter.id,({'set1_r02_c02':'set1_r01_c01','set1_r03_c02':'set2_r02_c00','set1_r04_c02':'set5_r02_c00'})[starter]);
  assert.equal(first.encounter.level,2);
  assert.ok(s.steps<=14,'intro encounter too late');
  assert.equal(E.terrain(20,13),'grass');
  assert.equal(s.flags.firstRoadEncounter,true);
  E.move(s,-1,0,()=>.999);
  const again=E.move(s,1,0,()=>.999);
  assert.equal(again.firstRoad,false,'first road scripted event duplicated');
 }
});
test('research encounters grow at 3, 7, 12 progress records and remain legitimate wild drawings',()=>{
 const save=E.createNew(starters[0]);
 const sizes=[];
 for(const n of [0,3,7,12]){
  save.wins=n;
  const all=new Set();
  for(const zone of ['meadow','forest','cave']){
   const pool=E.unlockedPool(zone,save);
   assert.ok(pool.length>=D.encounters[zone].pool.length);
   for(const id of pool){
    const s=D.species.find(m=>m.id===id);
    assert.ok(s?.playable,id);
    assert.notEqual(s.rarity,'starter');
    assert.ok(s.evolutionRank===1||(s.familyOrigin==='provisional'&&s.evolutionRank===2));
    all.add(id);
   }
  }
  sizes.push(all.size);
 }
 assert.ok(sizes[0]<sizes[1]&&sizes[1]<sizes[2]&&sizes[2]<sizes[3],sizes.join(','));
 assert.equal(sizes[sizes.length-1],53);
});
test('all 102 forms have an acquisition route through research wilds, evolutions and starter gifts',()=>{
 const research=new Set();
 const save=E.createNew(starters[0]);save.wins=12;
 for(const zone of ['meadow','forest','cave'])for(const id of E.unlockedPool(zone,save))research.add(id);
 research.add('shibu_r00_c00');
 starters.forEach(id=>research.add(id));
 let changed=true;
 while(changed){
  changed=false;
  for(const monster of D.species)
   if(!research.has(monster.id)&&research.has(monster.evolvesFrom)&&monster.evolutionCondition?.enabled){
    research.add(monster.id);changed=true;
   }
 }
 assert.equal(research.size,D.species.length);
 for(const id of research)assert.ok(D.species.some(s=>s.id===id),id);
 assert.equal(D.families.length,47);
});
test('research laboratory gifts both missing starters with party and box compatibility',()=>{
 const save=E.createNew(starters[0]);
 assert.equal(E.researchStarterOptions(save).available.length,0);
 for(const id of ['set1_r01_c01','set1_r00_c01','set2_r00_c00'])
  E.addCaptured(save,E.makeCreature(id,3));
 assert.equal(unique(save),4);
 assert.equal(E.researchStarterOptions(save).available.length,2);
 assert.equal(E.claimResearchStarter(save,starters[1]),true);
 assert.equal(E.claimResearchStarter(save,starters[1]),false);
 assert.equal(E.researchStarterOptions(save).available.length,0);
 for(const id of ['set2_r00_c04','set5_r02_c00'])
  E.addCaptured(save,E.makeCreature(id,3));
 assert.equal(unique(save),7);
 assert.equal(E.claimResearchStarter(save,starters[2]),true);
 assert.equal(E.researchStarterOptions(save).available.length,0);
 assert.equal(save.party.length,6);
 assert.ok(save.box.length>0);
 const first=save.box[0]?.id;
 assert.ok(first);
 const outgoing=save.party[save.active].id;
 assert.equal(E.withdrawFromBox(save,0),true);
 assert.equal(save.party[save.active].id,first);
 assert.ok(save.box.some(p=>p.id===outgoing));
 assert.ok(E.validateSave(clone(save)));
});
test('Shibu clearing can be revisited for the 18 valid evolution choices',()=>{
 const s=E.createNew(starters[0]);
 s.pos={x:56,y:8};
 assert.ok(E.canMove(56,8));
 let first=E.move(s,0,-1,()=>.999);
 assert.equal(first.encounter?.id,'shibu_r00_c00');
 assert.ok(s.flags.shibuSeen);
 E.move(s,0,1,()=>.999);
 const tooSoon=E.move(s,0,-1,()=>.999);
 assert.notEqual(tooSoon.encounter?.id,'shibu_r00_c00');
 s.steps+=24;
 E.move(s,0,1,()=>.999);
 const repeat=E.move(s,0,-1,()=>.999);
 assert.equal(repeat.encounter?.id,'shibu_r00_c00');
 assert.equal(D.shibuBranches.length,18);
});
test('first-route battle survival remains comparable for all three starters',()=>{
 let seed=0x1357abcd;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296};
 const survival=[];
 for(const starter of starters){
  let victories=0;
  for(let trial=0;trial<900;trial++){
   const s=E.createNew(starter);s.pos={x:20,y:13};s.encounters=1;
   let wins=0;
   for(let i=0;i<4;i++){
    const p=E.activeCreature(s);
    const firstIds={'set1_r02_c02':'set1_r01_c01','set1_r03_c02':'set2_r02_c00','set1_r04_c02':'set5_r02_c00'};
    const foe=i===0?E.makeCreature(firstIds[starter],2):E.pickEncounter('meadow',rand,s);
    for(let turn=0;turn<16;turn++){
     foe.hp-=D.combat.damage({attacker:p.id,defender:foe.id,attackerLevel:p.level,defenderLevel:foe.level,power:9});
     if(foe.hp<=0){E.levelRewards(s,foe);wins++;break;}
     p.hp=Math.max(0,p.hp-E.retaliationDamage(s,foe,p));
     if(p.hp===0)break;
    }
    if(!p.hp)break;
    const top=D.combat.statsAtLevel(p.id,p.level).hp;
    if(p.hp<top/2&&s.items.potion>0){p.hp=Math.min(top,p.hp+20);s.items.potion--;}
   }
   if(wins===4)victories++;
  }
  survival.push(victories/900);
 }
 assert.ok(Math.min(...survival)>=.80,'starter difficulty unacceptable: '+survival);
 assert.ok(Math.max(...survival)-Math.min(...survival)<=.16,'starter gap too large: '+survival);
});
test('existing save keys, draw loop, and optional box/research panels remain usable',()=>{
 const js=fs.readFileSync(path.join(root,'openmon-expedition','game.js'),'utf8');
 assert.ok(js.includes('kidscade.openmon.expedition.save.v1'));
 for(const snippet of ['result.firstRoad','retaliationDamage','researchStarterOptions','data-gift','data-withdraw','drawLandmarks','openBox','data-hud-action="evolve"'])
  assert.ok(js.includes(snippet),snippet);
 assert.doesNotThrow(()=>new Function(js));
});
