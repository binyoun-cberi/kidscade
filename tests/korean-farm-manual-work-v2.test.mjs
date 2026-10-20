import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createFarmState,restoreFarmState,fieldById,applyFarmStrip,
  canWorkFieldStrip,advanceFarmDay,applyFarmAction,scoopCompost} from '../games/korean-farm/farming/farm-sim.mjs';
import {WORK_STRIPS,nextWorkStrip,workStripPosition,completedWorkStrips}
  from '../games/korean-farm/farming/field-work.mjs';
import {FIELD_DEFS} from '../games/korean-farm/world.mjs';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const src=name=>fs.readFileSync(path.join(repo,'games/korean-farm',name),'utf8');
const work=(state,id,action)=>Array.from({length:WORK_STRIPS},(_,i)=>applyFarmStrip(state,id,action,i));

test('a fallow rice plot requires five physical hoe strokes before planting',()=>{
  const state=createFarmState(),f=fieldById(state,'rice-4');
  assert.equal(applyFarmAction(state,f.id,'harvest').ok,true);
  assert.equal(f.tilled,false);
  assert.equal(nextWorkStrip(f,'till'),0);
  const initial=state.energy,instant=state.minute;
  for(let i=0;i<WORK_STRIPS;i++){
    const stroke=applyFarmStrip(state,f.id,'till',i);
    assert.equal(stroke.ok,true);
    assert.equal(f.work.tilled[i],true);
    assert.equal(f.tilled,i===WORK_STRIPS-1);
  }
  assert.equal(state.energy,initial-10);
  assert.equal(state.minute,instant+15);
  assert.equal(canWorkFieldStrip(state,f.id,'till',3).ok,false);
  assert.equal(completedWorkStrips(f,'till'),WORK_STRIPS);
});
test('hand-watering changes each vegetable bed, remembers five strips, resets next day',()=>{
  const state=createFarmState(),field=fieldById(state,'carrot-1');
  const moisture=field.moisture;
  const first=applyFarmStrip(state,field.id,'water',0);
  assert.equal(first.ok,true);
  assert.equal(field.work.watered[0],true);
  assert.ok(field.moisture>moisture);
  assert.ok(field.moisture<moisture+.2,'one motion cannot water the entire plot');
  assert.equal(applyFarmStrip(state,field.id,'water',0).ok,false);
  for(let i=1;i<WORK_STRIPS;i++)assert.equal(applyFarmStrip(state,field.id,'water',i).ok,true);
  assert.ok(Math.abs(field.moisture-Math.min(1,moisture+.37))<1e-9);
  assert.equal(canWorkFieldStrip(state,'rice-1','water',0).ok,false);
  advanceFarmDay(state);
  assert.equal(completedWorkStrips(field,'water'),0);
  assert.equal(nextWorkStrip(field,'water'),0);
});
test('five weeding touches remove only their worked rows, not all weeds instantly',()=>{
  const state=createFarmState(),field=fieldById(state,'corn-1');
  field.weeds=.37;
  const initial=field.weeds;
  assert.equal(applyFarmStrip(state,field.id,'weed',2).ok,true);
  assert.ok(field.weeds<initial);
  assert.ok(field.weeds>.1);
  assert.deepEqual(field.work.weeded,[false,false,true,false,false]);
  assert.equal(nextWorkStrip(field,'weed'),0);
  for(const i of [0,1,3,4])assert.equal(applyFarmStrip(state,field.id,'weed',i).ok,true);
  assert.equal(completedWorkStrips(field,'weed'),5);
  assert.equal(applyFarmStrip(state,field.id,'weed',1).ok,false);
  advanceFarmDay(state);
  assert.equal(completedWorkStrips(field,'weed'),0);
});
test('harvest gives no stock or harvest stat before the fifth sickle swing',()=>{
  const state=createFarmState(),field=fieldById(state,'rice-4');
  const stock=state.inventory.rice,stat=state.stats.harvests;
  for(let i=0;i<WORK_STRIPS-1;i++){
    const result=applyFarmStrip(state,field.id,'harvest',i);
    assert.equal(result.ok,true);
    assert.equal(result.complete,false);
    assert.equal(field.work.harvested[i],true);
    assert.equal(field.planted,true);
    assert.equal(state.inventory.rice,stock);
    assert.equal(state.stats.harvests,stat);
  }
  assert.equal(applyFarmStrip(state,field.id,'harvest',2).ok,false);
  const done=applyFarmStrip(state,field.id,'harvest',4);
  assert.equal(done.complete,true);
  assert.ok(done.quantity>0);
  assert.equal(state.inventory.rice,stock+done.quantity);
  assert.equal(state.stats.harvests,stat+1);
  assert.equal(field.planted,false);
  assert.deepEqual(field.work.tilled,[false,false,false,false,false]);
  assert.equal(field.transplants.filter(Boolean).length,0);
});
test('partial till and harvest are restored from v2 saves with no rewards duplicated',()=>{
  const state=createFarmState();
  const ripe=fieldById(state,'rice-4');
  applyFarmStrip(state,ripe.id,'harvest',0);
  applyFarmStrip(state,ripe.id,'harvest',2);
  const harvested=restoreFarmState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(fieldById(harvested,ripe.id).work.harvested,[true,false,true,false,false]);
  assert.equal(harvested.inventory.rice,0);
  for(const i of [1,3,4])applyFarmStrip(harvested,ripe.id,'harvest',i);
  assert.equal(harvested.stats.harvests,1);
  applyFarmStrip(harvested,ripe.id,'till',1);
  const again=restoreFarmState(JSON.parse(JSON.stringify(harvested)));
  assert.deepEqual(fieldById(again,ripe.id).work.tilled,[false,true,false,false,false]);
  assert.equal(fieldById(again,ripe.id).tilled,false);
  const old=JSON.parse(JSON.stringify(state));
  for(const f of old.fields)delete f.work;
  const migrated=restoreFarmState(old);
  assert.deepEqual(fieldById(migrated,'rice-1').work.tilled,[true,true,true,true,true]);
});
test('invalid strip actions and exhausted energy have no save-side effects',()=>{
  const state=createFarmState(),before=JSON.stringify(state);
  for(const i of [-1,5,2.7,NaN]){
    assert.equal(applyFarmStrip(state,'rice-4','harvest',i).ok,false);
  }
  assert.equal(applyFarmStrip(state,'rice-4','water',0).ok,false);
  assert.equal(applyFarmStrip(state,'missing','harvest',0).ok,false);
  assert.equal(JSON.stringify(state),before);
  state.energy=0;
  assert.equal(applyFarmStrip(state,'rice-4','harvest',0).ok,false);
});
test('world positions stay inside plot, controls and visible rows are wired',()=>{
  for(const plot of FIELD_DEFS){
    const points=Array.from({length:WORK_STRIPS},(_,i)=>workStripPosition(plot,i));
    assert.equal(new Set(points.map(p=>p.z)).size,WORK_STRIPS);
    for(const point of points){
      assert.ok(point.x>plot.x-plot.w/2&&point.x<plot.x+plot.w/2);
      assert.ok(point.z>plot.z-plot.d/2&&point.z<plot.z+plot.d/2);
    }
  }
  const game=src('game.js'),html=src('index.html'),view=src('rendering/field-work-grid.js');
  for(const token of ['fieldWorkHud','workStripFill','exitFieldWork'])assert.match(html,new RegExp('id="'+token+'"'));
  for(const token of ['workStripGrid','workOne','seedlingGrid','plantOne'])assert.doesNotMatch(html,new RegExp('id="'+token+'"'));
  assert.match(game,/applyFarmStrip\(state,plot\.id,event\.action,event\.cellIndex\)/);
  assert.match(game,/fieldWorkHits/);
  assert.match(game,/runFieldStrip/);
  assert.match(view,/weedClumps/);
  assert.match(view,/furrows/);
  assert.match(view,/stubble/);
  assert.match(view,/fertilizerPatches/);
  assert.match(game,/requestStation\('market'\)/);
  assert.match(game,/requestStation\('home'\)/);
  assert.match(game,/scoopCompostBatch\(state\)/);
  assert.match(game,/runSeedlingPlant\(cell\.userData\.cellIndex\)/);
  assert.match(src('animation/farmer-animator.js'),/const sickle=make\('sickle'\)/);
  assert.match(src('animation/farmer-animator.js'),/const shovel=make\('shovel'\)/);
  for(const p of ['game.js','rendering/field-work-grid.js','farming/farm-sim.mjs','farming/field-work.mjs']){
    execFileSync(process.execPath,['--check',path.join(repo,'games/korean-farm',p)],{stdio:'pipe'});
  }
});


test('compost is collected at the heap and applied strip by strip',()=>{
  const state=createFarmState(),field=fieldById(state,'carrot-1');
  assert.equal(state.inventory.fertilizer,0);
  assert.equal(scoopCompost(state).ok,true);
  assert.equal(state.inventory.fertilizer,1);
  const initialNitrogen=field.nitrogen;
  assert.equal(applyFarmStrip(state,field.id,'fertilize',0).ok,true);
  assert.equal(field.work.fertilized[0],true);
  assert.equal(state.inventory.fertilizer,0);
  assert.ok(field.nitrogen>initialNitrogen);
  assert.equal(applyFarmStrip(state,field.id,'fertilize',0).ok,false);
  assert.equal(applyFarmStrip(state,field.id,'fertilize',1).ok,false);
  assert.equal(scoopCompost(state).ok,true);
  assert.equal(advanceFarmDay(state).ok,true);
  assert.equal(field.work.fertilized.every(Boolean),false);
});
