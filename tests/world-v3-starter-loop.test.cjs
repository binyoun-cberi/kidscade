const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const runtime=fs.readFileSync(path.join(root,'world-v3','kidscade-world-v3.js'),'utf8');
const storage=fs.readFileSync(path.join(root,'world-v2','kidscade-world-storage.js'),'utf8');
const html=fs.readFileSync(path.join(root,'world-v3','kidscade-world.html'),'utf8');
const integration=fs.readFileSync(path.join(root,'life-world-integration.js'),'utf8');

test('starter loop has enough hand-pickable resources for both stone tools',()=>{
  assert.equal((runtime.match(/addGroundPickup\('starter-wood-/g)||[]).length,6);
  assert.equal((runtime.match(/addGroundPickup\('starter-stone-/g)||[]).length,6);
  assert.match(runtime,/돌도끼',\{wood:3,stone:2\}/);
  assert.match(runtime,/돌곡괭이',\{wood:2,stone:3\}/);
  assert.match(runtime,/목재 5 · 돌 5/);
});

test('ground pickups persist their respawn cooldown across reloads',()=>{
  assert.match(runtime,/GROUND_PICKUP_RESPAWN_MS=45000/);
  assert.match(runtime,/prog\(\)\.groundPickups\[id\]=nextAt/);
  assert.match(runtime,/const remain=nextAt-Date\.now\(\)/);
  assert.match(storage,/groundPickups:\{\}/);
  assert.match(storage,/groundPickups:\{\.\.\.base\.progression\.groundPickups,/);
});

test('starter crate is a one-time fail-safe',()=>{
  assert.match(runtime,/starterKitClaimed/);
  assert.match(runtime,/i\.wood=\(i\.wood\|\|0\)\+5/);
  assert.match(runtime,/i\.stone=\(i\.stone\|\|0\)\+5/);
  assert.match(runtime,/초보자 보급 상자는 이미 받았어요/);
});

test('starter guidance is visible in-world and at the workbench',()=>{
  assert.match(runtime,/초보자 안내 읽기/);
  assert.match(runtime,/처음 살아남기/);
  assert.match(runtime,/떨어진 나뭇가지와 작은 돌/);
  assert.match(runtime,/현재 재료/);
});

test('starter loop is current cached World v3',()=>{
  assert.match(html,/kidscade-world-v3\.js\?v=7/);
  assert.match(integration,/world-v3\/kidscade-world\.html\?v=7/);
});
