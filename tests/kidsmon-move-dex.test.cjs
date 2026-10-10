'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../games');
const ctx={window:{},Math,Date};
for(const p of ['monsters.js','roster.js','combat.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,'openmon-dex',p),'utf8'),ctx,{filename:p});
for(const p of ['engine.js','turn-battle.js','family-signatures.js','move-dex.js'])
 vm.runInNewContext(fs.readFileSync(path.join(root,'openmon-expedition',p),'utf8'),ctx,{filename:p});
const D=ctx.window.OPENMON_DEX,B=ctx.window.OPENMON_TURN_BATTLE,MD=ctx.window.KIDSMON_MOVE_DEX;
test('encyclopedia indexes all 140 battle skills, 10 types and real PP',()=>{
 assert.equal(MD.all.length,Object.keys(B.moves).length);
 assert.equal(MD.all.length,140);
 assert.equal(MD.TYPE_ORDER.length,10);
 assert.equal(new Set(MD.all.map(x=>x.id)).size,MD.all.length);
 for(const m of MD.all){
  assert.ok(D.types[m.type],m.id);
  assert.equal(m.name,B.moves[m.id].name);
  assert.equal(m.pp,B.moves[m.id].pp);
  assert.equal(m.accuracy,B.moves[m.id].accuracy);
  assert.equal(m.power,B.moves[m.id].power||0);
  assert.ok(m.description.length>12,m.id);
  assert.ok(m.symbol,m.id);
 }
});
test('move descriptions truthfully reflect status chances, turn order, multi-hits, HP recovery',()=>{
 assert.match(MD.detail('fiboStrikes').description,/2번 연속/);
 assert.match(MD.detail('photoPulse').description,/25%/);
 assert.match(MD.detail('pascalPress').description,/50%/);
 assert.match(MD.detail('synthesis').description,/33%/);
 assert.match(MD.detail('raincoat').description,/38%/);
 assert.match(MD.detail('quick').description,/우선도 \+1/);
 assert.match(MD.detail('ember').description,/화상/);
 assert.match(MD.detail('frost').description,/둔화/);
 assert.match(MD.detail('focus').description,/공격을 1단계/);
 assert.equal(MD.detail('fake'),null);
});
test('every move has learnable species with accurate first eligible level',()=>{
 for(const skill of MD.all){
  const who=MD.learners(skill.id);
  assert.ok(who.length>0,'unlearnable move '+skill.id);
  for(const mon of who){
   assert.ok(D.species.some(x=>x.id===mon.id),'unknown learner '+mon.id);
   assert.ok(B.learnable({id:mon.id,level:mon.level}).includes(skill.id));
   assert.ok(mon.level===1||mon.level===10||mon.level===14||mon.level===26);
   const lower=mon.level===1?0:mon.level===10?1:mon.level===14?10:14;
   if(lower)assert.ok(!B.learnable({id:mon.id,level:lower}).includes(skill.id),'bad initial level '+skill.id);
  }
 }
});
test('search by move name, status, type, creature name and owner works',()=>{
 const leaf=MD.search({type:'leaf'});
 assert.ok(leaf.length>1&&leaf.every(x=>x.type==='leaf'));
 const controls=MD.search({category:'control'});
 assert.ok(controls.length>1&&controls.every(x=>x.category==='control'));
 assert.ok(MD.search({query:'압력파'}).some(x=>x.id==='pascalPress'));
 assert.ok(MD.search({query:'둔화'}).some(x=>x.id==='frost'));
 assert.ok(MD.search({query:'피보새'}).some(x=>x.id==='fiboStrikes'));
 assert.equal(MD.search({query:'zonsense-no-match-xyz'}).length,0);
 const owner={id:'set1_r02_c02',level:5};
 const chosen=MD.search({owner});
 assert.equal(chosen.length,new Set(B.learnable(owner)).size);
 assert.ok(chosen.every(x=>B.learnable(owner).includes(x.id)));
 assert.ok(!chosen.some(x=>x.id==='fiboStrikes'));
});
test('original monster encyclopedia and save key remain unchanged and move dex mounts to HUD',()=>{
 const html=fs.readFileSync(path.join(root,'openmon-expedition','index.html'),'utf8');
 const game=fs.readFileSync(path.join(root,'openmon-expedition','game.js'),'utf8');
 assert.match(html,/src="move-dex\.js"/);
 assert.ok(html.indexOf('src="turn-battle.js"')<html.indexOf('src="family-signatures.js"'));
 assert.ok(html.indexOf('src="family-signatures.js"')<html.indexOf('src="move-dex.js"'));
 assert.ok(html.indexOf('src="move-dex.js"')<html.indexOf('src="game.js"'));
 assert.match(game,/function openMoveDex/);
 assert.match(game,/data-dex-tab="moves"/);
 assert.match(game,/moveDexSearch/);
 assert.match(game,/moveDexOwner/);
 assert.match(game,/data-move-more/);
 assert.match(game,/data-hud-action="moveDex"/);
 assert.match(game,/kidscade\.openmon\.expedition\.save\.v1/);
 assert.match(game,/data-dex=/);
 assert.doesNotThrow(()=>new Function(game));
});
