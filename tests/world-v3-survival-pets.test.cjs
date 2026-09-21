const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const runtime=fs.readFileSync(path.join(root,'world-v3','kidscade-world-v3.js'),'utf8');
const html=fs.readFileSync(path.join(root,'world-v3','kidscade-world.html'),'utf8');
const integration=fs.readFileSync(path.join(root,'life-world-integration.js'),'utf8');
const gardenBoot=fs.readFileSync(path.join(root,'garden.js'),'utf8');
const indexBase=fs.readFileSync(path.join(root,'index_base.html'),'utf8');

test('World v3 survival runtime parses',()=>{
  const src=runtime.replace(/^import .*$/gm,'');
  const r=spawnSync(process.execPath,['--check'],{input:src,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr||r.stdout);
});

test('World v3 explicitly clears every rendered frame',()=>{
  assert.match(runtime,/preserveDrawingBuffer:false/);
  assert.match(runtime,/renderer\.autoClear=true/);
  assert.match(runtime,/renderer\.clear\(true,true,true\)/);
});

test('World v3 has connected survival regions and progression',()=>{
  for(const label of ['깊은 숲','광산','북쪽 강가','야영지'])assert.ok(runtime.includes(label),label);
  assert.match(runtime,/mushroom-red-group\.glb/);
  assert.match(runtime,/campfire-pit\.glb/);
  assert.match(runtime,/철광석 캐기/);
  assert.match(runtime,/버섯 채집하기/);
  assert.match(runtime,/updateSurvival\(dt,moving\)/);
  assert.match(runtime,/grilledFish/);
  assert.match(runtime,/ironAxe/);
  assert.match(runtime,/ironPick/);
});

test('Cube Pets ownership now belongs to World v3 instead of the garden',()=>{
  assert.match(runtime,/const CUBE_PETS=/);
  assert.match(runtime,/p\.cubePets=/);
  assert.match(runtime,/function tamePet\(id\)/);
  assert.match(runtime,/function migrateLegacyCubePets\(\)/);
  assert.match(runtime,/migratedLegacy/);
  assert.doesNotMatch(runtime,/Bridge\?\.snapshot\(\).*garden/s);
  assert.doesNotMatch(runtime,/function gardenOwned/);
  assert.doesNotMatch(runtime,/makeProceduralPet/);
  for(const retired of ['hamster','iguana','sugarGlider','miniPig'])assert.doesNotMatch(runtime,new RegExp("['\"]"+retired+"['\"]\\s*:"));
});

test('World v3 uses only real Cube Pets GLBs for its active pet roster',()=>{
  const files=[
    'animal-dog.glb','animal-cat.glb','animal-bunny.glb','animal-pig.glb','animal-cow.glb',
    'animal-chick.glb','animal-fox.glb','animal-deer.glb','animal-parrot.glb','animal-beaver.glb'
  ];
  for(const file of files){
    assert.ok(fs.existsSync(path.join(root,'assets','game','characters','pets',file)),'missing '+file);
    assert.ok(runtime.includes(file),'runtime missing '+file);
  }
});

test('legacy garden runtime is retired from active boot',()=>{
  assert.doesNotMatch(gardenBoot,/garden-core\.js/);
  assert.doesNotMatch(gardenBoot,/garden-life\.js/);
  assert.doesNotMatch(gardenBoot,/pet-art\.js/);
  assert.match(gardenBoot,/life-world-integration\.js/);
  assert.match(indexBase,/const gardenArtwork=\{\};/);
  assert.match(indexBase,/const gardenController=null;/);
  assert.match(indexBase,/window\.openKidscadeLifeWorld\?\.\(\)/);
});

test('Cube Pets survival expansion is the current default cache',()=>{
  assert.match(html,/kidscade-world-v3\.js\?v=32/);
  assert.match(integration,/world-v3\/kidscade-world\.html\?v=32/);
  assert.match(integration,/syncCubePetsSidebar/);
});
