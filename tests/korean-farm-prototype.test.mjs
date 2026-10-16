import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {FIELD_DEFS,RICE_STAGES,makeFarmState,validateFarmState,plotStage,setPreviewStage,distanceToPlot} from '../games/korean-farm/world.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const farm=(name)=>fs.readFileSync(path.join(root,'games/korean-farm',name),'utf8');

test('farm seed map has four rice field previews and two vegetable beds',()=>{
  assert.equal(FIELD_DEFS.length,6);
  assert.equal(FIELD_DEFS.filter(p=>p.kind==='rice').length,4);
  assert.deepEqual(FIELD_DEFS.filter(p=>p.kind==='rice').map(p=>p.stage),[1,2,3,4]);
  assert.equal(RICE_STAGES.length,4);
  assert.equal(new Set(FIELD_DEFS.map(p=>p.id)).size,FIELD_DEFS.length);
});
test('preview stages only affect selected rice field, with stable clamping',()=>{
  const state=makeFarmState();
  assert.equal(setPreviewStage(state,'rice-1',4),true);
  assert.equal(plotStage(state,'rice-1'),4);
  assert.equal(plotStage(state,'rice-2'),2);
  assert.equal(setPreviewStage(state,'rice-2',90),true);
  assert.equal(plotStage(state,'rice-2'),4);
  assert.equal(setPreviewStage(state,'carrot-1',2),false);
  assert.equal(setPreviewStage(state,'missing',2),false);
  assert.equal(plotStage(state,'carrot-1'),4);
});
test('saves reject corruption, recover defaults, and preserve visited rice plots',()=>{
  const clean=validateFarmState({version:999});
  assert.equal(clean.version,1);assert.equal(clean.plots.length,6);
  const old=makeFarmState();
  old.player={x:Infinity,z:-999};old.camera={zoom:-11,angle:Infinity};
  old.seenPlots=['rice-2','rice-2','corn-1','rice-3'];
  old.plots=[{id:'rice-1',stage:9},{id:'corn-1',stage:-3}];
  const restored=validateFarmState(old);
  assert.equal(restored.player.x,makeFarmState().player.x);
  assert.equal(restored.player.z,-21.5);
  assert.equal(restored.camera.zoom,15);
  assert.deepEqual(restored.seenPlots,['rice-2','rice-3']);
  assert.equal(restored.visits,2);
  assert.equal(plotStage(restored,'rice-1'),4);
  assert.equal(plotStage(restored,'rice-2'),2);
});
test('field interaction distance is measured from field footprint',()=>{
  const p=FIELD_DEFS[0];
  assert.equal(distanceToPlot({x:p.x,z:p.z},p),0);
  assert.ok(distanceToPlot({x:22,z:22},p)>20);
});
test('prototype uses platform SDK, local Three.js, and original shared crop assets',()=>{
  const html=farm('index.html'),js=farm('game.js'),assets=farm('assets.js');
  assert.match(html,/kidscade-game-sdk\.js/);
  assert.match(html,/three-r160\/three\.module\.js/);
  assert.match(js,/registerCleanup/);
  assert.match(js,/requestAnimationFrame/);
  assert.match(js,/save\(true\)/);
  assert.match(assets,/Rice_.*\.fbx/);
  for(let stage=1;stage<=4;stage++){
    const p=path.join(root,'assets/game/crops/FBX',`Rice_${stage}.fbx`);
    assert.ok(fs.existsSync(p),`Missing source model ${p}`);
  }
  assert.ok(fs.existsSync(path.join(root,'assets/vendor/three-r160/addons/loaders/FBXLoader.js')));
  assert.ok(fs.existsSync(path.join(root,'assets/game/characters/people/character-male-a.glb')));
});
