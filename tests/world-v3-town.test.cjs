const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const runtime=fs.readFileSync(path.join(root,'world-v3','kidscade-world-v3.js'),'utf8');
const city=fs.readFileSync(path.join(root,'world-v3','kidscade-world-city.js'),'utf8');
const economy=fs.readFileSync(path.join(root,'world-v3','kidscade-world-economy.js'),'utf8');
const storage=fs.readFileSync(path.join(root,'world-v2','kidscade-world-storage.js'),'utf8');

test('Seed Town modules parse as modules after import/export stripping',()=>{
  for(const src0 of [runtime,city,economy]){
    const src=src0
      .replace(/^import .*$/gm,'')
      .replace(/^export /gm,'')
      .replace(/import\.meta\.url/g,"'https://example.test/world-v3/module.js'");
    const r=spawnSync(process.execPath,['--check'],{input:src,encoding:'utf8'});
    assert.equal(r.status,0,r.stderr||r.stdout);
  }
});

test('starter resources can be picked up without tools',()=>{
  for(const id of ['starter-wood-1','starter-wood-5','starter-stone-1','starter-stone-5'])assert.ok(runtime.includes(id),id);
  assert.match(runtime,/떨어진 나뭇가지 줍기/);
  assert.match(runtime,/작은 돌 줍기/);
  assert.match(runtime,/도구 없이 주웠어요/);
  assert.match(runtime,/setTimeout\(\(\)=>\{actor\.ready=true;actor\.object\.visible=true;\},45000\)/);
});

test('Seed Town uses actual tracked 3D human NPC assets',()=>{
  const files=[
    'character-female-a.glb','character-female-b.glb','character-female-c.glb',
    'character-male-a.glb','character-male-b.glb','character-male-c.glb'
  ];
  for(const file of files){
    assert.ok(fs.existsSync(path.join(root,'assets','game','characters','people',file)),'missing '+file);
    assert.ok(city.includes(file),'city missing '+file);
  }
  assert.match(city,/민지/);
  assert.match(city,/준호/);
  assert.match(city,/하늘/);
  assert.match(city,/도윤/);
  assert.match(city,/유나/);
  assert.match(city,/태호/);
});

test('Seed Town reuses tracked city and market assets',()=>{
  const files=[
    ['assets','game','shops','market','display-fruit.glb'],
    ['assets','game','shops','market','display-bread.glb'],
    ['assets','game','shops','market','cash-register.glb'],
    ['assets','game','shops','market','shopping-cart.glb'],
    ['assets','game','3d','city','kenney-city-kit-roads','road-crossroad.glb'],
    ['assets','game','3d','city','kenney-city-kit-suburban','building-type-b.glb']
  ];
  for(const parts of files)assert.ok(fs.existsSync(path.join(root,...parts)),'missing '+parts.join('/'));
  assert.match(city,/씨앗마트/);
  assert.match(city,/튼튼 철물점/);
  assert.match(city,/하늘 카페/);
  assert.match(city,/키즈 아케이드/);
  assert.match(city,/마을회관/);
});

test('town economy supports shopping selling jobs leisure and friendship',()=>{
  assert.match(economy,/const BUY=/);
  assert.match(economy,/const SELL=/);
  assert.match(economy,/const JOBS=/);
  assert.match(economy,/마트 진열 돕기/);
  assert.match(economy,/카페 설거지/);
  assert.match(economy,/광장 정리하기/);
  assert.match(economy,/아케이드/);
  assert.match(economy,/friendship/);
  assert.match(runtime,/코인/);
  assert.match(runtime,/재미/);
  assert.match(storage,/town:\{coins:120,fun:80/);
});

test('hardware shop offers a second way out of the starter tool loop',()=>{
  assert.match(economy,/돌도끼/);
  assert.match(economy,/돌곡괭이/);
  assert.match(economy,/wood3/);
  assert.match(economy,/stone3/);
});

test('Seed Town is connected into the continuous World v3 map',()=>{
  assert.match(runtime,/buildKidscadeCity/);
  assert.match(runtime,/씨앗마을 중심가 · 장보기·일·놀이/);
  assert.match(runtime,/z2:40/);
  assert.match(runtime,/cityRuntime\?\.update\?\.\(now,dt\)/);
  assert.match(runtime,/createTownEconomy/);
});
