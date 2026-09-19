const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const runtime=fs.readFileSync(path.join(root,'world-v3','kidscade-world-v3.js'),'utf8');
const html=fs.readFileSync(path.join(root,'world-v3','kidscade-world.html'),'utf8');
const integration=fs.readFileSync(path.join(root,'life-world-integration.js'),'utf8');

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

test('World v3 has connected survival regions',()=>{
  for(const label of ['깊은 숲','돌산','북쪽 강가','남쪽 야영지'])assert.ok(runtime.includes(label),label);
  assert.match(runtime,/bridge-wood\.glb/);
  assert.match(runtime,/mushroom-red-group\.glb/);
  assert.match(runtime,/campfire-pit\.glb/);
  assert.match(runtime,/signpost\.glb/);
  assert.match(runtime,/철광석 캐기/);
  assert.match(runtime,/버섯 채집하기/);
});

test('World v3 has hunger, day-night and cooking loops',()=>{
  assert.match(runtime,/p\.survival=/);
  assert.match(runtime,/hunger/);
  assert.match(runtime,/updateSurvival\(dt,moving\)/);
  assert.match(runtime,/isNightTime/);
  assert.match(runtime,/grilledFish/);
  assert.match(runtime,/veggieSoup/);
  assert.match(runtime,/cookingPanel\('campfire'\)/);
  assert.match(runtime,/가스레인지에서 요리하기/);
});

test('World v3 supports stone to iron tool progression',()=>{
  assert.match(runtime,/axeIron/);
  assert.match(runtime,/pickIron/);
  assert.match(runtime,/tier:'iron'/);
  assert.match(runtime,/철도끼/);
  assert.match(runtime,/철곡괭이/);
});

test('World v3 reads garden pets and creates 3D companions',()=>{
  assert.match(runtime,/Bridge\?\.snapshot/);
  assert.match(runtime,/buildPets\(\)/);
  assert.match(runtime,/updatePets\(now,dt\)/);
  assert.match(runtime,/PET_PERKS/);
  const files=[
    'animal-dog.glb','animal-cat.glb','animal-bunny.glb','animal-parrot.glb','animal-pig.glb','animal-fish.glb'
  ];
  for(const file of files){
    assert.ok(fs.existsSync(path.join(root,'assets','game','characters','pets',file)),'missing '+file);
    assert.ok(runtime.includes(file),'runtime missing '+file);
  }
});

test('World v3 survival expansion is the current default cache',()=>{
  assert.match(html,/kidscade-world-v3\.js\?v=3/);
  assert.match(integration,/world-v3\/kidscade-world\.html\?v=3/);
});
