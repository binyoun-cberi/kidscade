const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const shared=fs.readFileSync(path.join(root,'assets/game/manifest/shared-community-3d.js'),'utf8');
const runtime=fs.readFileSync(path.join(root,'assets/game/manifest/shared-community-3d-runtime.js'),'utf8');
const farm=fs.readFileSync(path.join(root,'assets/game/manifest/shared-farm-3d.js'),'utf8');
const viewer=fs.readFileSync(path.join(root,'tools/shared-3d-review.js'),'utf8');

test('shared 3D registry tracks all 69 imported GLBs and safety metadata',()=>{
  const files=[...shared.matchAll(/"(?:plaggy|quaternius)_cc0-[^"]+\.glb"/g)].map(m=>m[0].slice(1,-1));
  assert.equal(new Set(files).size,69);
  assert.match(shared,/loadPolicy/);
  assert.match(shared,/maxInstances/);
  assert.match(shared,/cloneMode/);
  assert.match(shared,/animatedCandidate/);
  assert.match(shared,/"prop\.tinCan":Object\.freeze\(\{state:"blocked"/);
  assert.match(shared,/"vehicle\.schoolBus":Object\.freeze\(\{state:"repair"/);
  assert.match(shared,/"building\.house":Object\.freeze\(\{state:"repair"/);
});

test('shared 3D runtime repairs and grounds reusable models',()=>{
  assert.match(runtime,/normalizeShared3DObject/);
  assert.match(runtime,/repairShared3DMaterials/);
  assert.match(runtime,/prepareShared3DObject/);
  assert.match(runtime,/schoolBus/);
  assert.match(runtime,/ruinedHouse/);
});

test('farm pack separates static ranch assets from animals needing QA',()=>{
  for(const id of ['farm.barn','farm.chickenCoop','farm.siloHouse','farm.windmill','prop.fence','prop.well','crop.cornA','crop.rice','crop.wheat'])assert.match(farm,new RegExp(id.replace(/\./g,'\\.')));
  for(const id of ['animal.chick','animal.pig','animal.cowA','animal.bull','animal.sheepA','animal.donkey','animal.horse'])assert.match(farm,new RegExp(id.replace(/\./g,'\\.')));
  assert.match(farm,/FARM_STATIC_ASSETS/);
  assert.match(farm,/FARM_ANIMAL_ASSETS/);
  assert.match(farm,/FARM_ASSET_TIERS/);
});

test('QA viewer can batch inspect the whole shared asset library',()=>{
  assert.match(viewer,/runFullAudit/);
  assert.match(viewer,/auditSuggestion/);
  assert.match(viewer,/skinnedMeshes/);
  assert.match(viewer,/animations/);
  assert.match(viewer,/texturedMaterials/);
  assert.match(viewer,/kidscade-shared3d-audit-v1/);
});
