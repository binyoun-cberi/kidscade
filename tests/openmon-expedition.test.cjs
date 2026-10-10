'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..','games');
const ctx={window:{},Math,Date};
for(const name of ['monsters.js','roster.js','combat.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,'openmon-dex',name),'utf8'),ctx,{filename:name});
vm.runInNewContext(fs.readFileSync(path.join(root,'openmon-expedition','engine.js'),'utf8'),ctx,{filename:'engine.js'});
const E=ctx.window.OPENMON_EXPEDITION_ENGINE;
const DB=ctx.window.OPENMON_DEX;
function snapshot(a){return JSON.parse(JSON.stringify(a))}
function route(start,destination){
 const queue=[start],seen=new Set([start.x+':'+start.y]);const parents=new Map();
 for(let head=0;head<queue.length;head++){
  const at=queue[head];if(at.x===destination.x&&at.y===destination.y){
   const path=[];let p=at;
   while(p.x!==start.x||p.y!==start.y){path.unshift(p);p=parents.get(p.x+':'+p.y)}
   return path
  }
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const x=at.x+dx,y=at.y+dy,k=x+':'+y;
   if(!seen.has(k)&&E.canMove(x,y)){seen.add(k);const next={x,y};parents.set(k,at);queue.push(next)}
  }
 }
 return null;
}
test('new expedition uses the three original starter families and supplies',()=>{
 for(const key of ['set1_r02_c02','set1_r03_c02','set1_r04_c02']){
  const game=E.createNew(key),lead=game.party[0];
  assert.equal(lead.id,key);assert.equal(lead.level,5);assert.equal(game.items.ball,7);
  assert.equal(lead.hp,DB.combat.statsAtLevel(key,5,lead).hp);
  assert.deepEqual(snapshot(game.pos),{x:8,y:13});
  assert.equal(E.validateSave(snapshot(game)).party.length,1);
 }
});
test('road gives a walkable route to every zone and the secret clearing',()=>{
 for(const x of [20,45,67,78])assert.ok(route(E.START,{x,y:12}),'cannot reach x='+x);
 assert.ok(route(E.START,{x:56,y:7}),'cannot reach Shibu clearing');
 assert.equal(E.terrain(56,7),'clearing');
 assert.ok(E.canMove(56,7));
 for(const x of [2,22,46,73])assert.ok(E.canMove(x,12));
});
test('hazard encounter eventually triggers even with unlucky random numbers',()=>{
 const s=E.createNew('set1_r02_c02');
 for(let i=0;i<4;i++)assert.equal(E.shouldMeet(s,'grass',()=>.999),false);
 assert.equal(E.shouldMeet(s,'grass',()=>.999),true);
 assert.equal(E.shouldMeet(s,'path',()=>0),false);
 for(const z of ['meadow','forest','cave']){
  const seen=new Set();for(let i=0;i<200;i++){
   const creature=E.pickEncounter(z,()=>((i%6)+.01)/6);
   assert.ok(DB.species.some(s=>s.id===creature.id));
   const l=DB.encounters[z].level;assert.ok(creature.level>=l[0]&&creature.level<=l[1]);
   seen.add(creature.id);
  }
  assert.ok(seen.size>=5,z);
 }
});
test('special Shibu encounter is deterministic once on entering clearing',()=>{
 const game=E.createNew('set1_r03_c02');
 const path=route(game.pos,{x:56,y:7});
 assert.ok(path);
 let special=null;for(const {x,y} of path){
  const out=E.move(game,x-game.pos.x,y-game.pos.y,()=>.999);
  if(out.encounter?.id==='shibu_r00_c00'){special=out.encounter;break}
 }
 assert.equal(special.id,'shibu_r00_c00');
 assert.equal(game.flags.shibuSeen,true);
});
test('captured monster joins party then PC when six are already present',()=>{
 const game=E.createNew('set1_r04_c02');
 for(let i=0;i<5;i++){
  const mon=E.makeCreature('set1_r01_c01',3);
  assert.equal(E.addCaptured(game,mon),'party');
 }
 assert.equal(game.party.length,6);
 assert.equal(E.addCaptured(game,E.makeCreature('set1_r00_c01',4)),'box');
 assert.equal(game.box.length,1);
 assert.equal(game.catches,6);
 assert.equal(game.collection['set1_r00_c01'],true);
 assert.equal(E.validateSave(snapshot(game)).box.length,1);
});
test('battle damage, weakening, reward and evolution form a complete deterministic loop',()=>{
 const game=E.createNew('set1_r02_c02');
 const opponent=E.makeCreature('set1_r01_c01',3);
 let remaining=opponent.hp;
 const normal=DB.combat.damage({attacker:game.party[0].id,defender:opponent.id,attackerLevel:5,defenderLevel:3,moveType:'neutral',power:7});
 assert.ok(normal>=1&&normal<remaining);
 remaining=Math.max(1,remaining-normal);
 const high=DB.combat.captureChance({target:opponent.id,level:3,hp:remaining,maxHp:opponent.hp});
 const low=DB.combat.captureChance({target:opponent.id,level:3,hp:opponent.hp,maxHp:opponent.hp});
 assert.ok(high>low);
 opponent.hp=remaining;
 const slot=E.addCaptured(game,opponent);
 assert.equal(slot,'party');assert.equal(game.party.length,2);
 for(let i=0;i<14;i++)E.levelRewards(game,E.makeCreature('set1_r01_c01',3));
 assert.ok(game.party[0].level>=6);
 assert.ok(E.validateSave(snapshot(game)));
 const ready=DB.combat.evolutionAvailable(game.party[0].id,game.party[0].level);
 if(ready.length){const old=game.party[0].id;assert.equal(E.maybeEvolve(game,ready[0].id),true);assert.notEqual(game.party[0].id,old)}
});
test('fainted party is healed at clinic and invalid saves are rejected',()=>{
 const game=E.createNew('set1_r03_c02');
 game.party[0].hp=0;E.healAll(game);
 assert.equal(game.party[0].hp,DB.combat.statsAtLevel(game.party[0].id,5,game.party[0]).hp);
 assert.equal(E.validateSave({...snapshot(game),pos:{x:-5,y:0}}),null);
 assert.equal(E.validateSave({...snapshot(game),party:[{id:'missing',level:4,hp:22,xp:0}]}),null);
 assert.equal(E.validateSave({...snapshot(game),version:99}),null);
});
test('front-end includes actual responsive touch + keyboard RPG interactions',()=>{
 const html=fs.readFileSync(path.join(root,'openmon-expedition','index.html'),'utf8');
 const js=fs.readFileSync(path.join(root,'openmon-expedition','game.js'),'utf8');
 for(const id of ['worldCanvas','starterChoices','battleButtons','battleContinue','teamList','openDex','interactBtn','genericOverlay','mapToast'])
  assert.ok(html.includes('id="'+id+'"'),id);
 for(const source of ['../openmon-dex/roster.js','../openmon-dex/combat.js','engine.js','game.js'])
  assert.ok(html.includes('src="'+source+'"'),source);
 assert.match(js,/requestAnimationFrame\(render\)/);
 assert.match(js,/pointerdown/);
 assert.match(js,/keydown/);
 assert.match(js,/captureChance/);
 assert.match(js,/kidscade:close-game/);
 assert.doesNotThrow(()=>new Function(js));
});
