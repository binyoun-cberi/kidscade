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
const html=fs.readFileSync(path.join(root,'world-v3','kidscade-world.html'),'utf8');
const integration=fs.readFileSync(path.join(root,'life-world-integration.js'),'utf8');

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

test('starter loop cannot deadlock on a fresh save',()=>{
  for(const id of ['starter-wood-1','starter-wood-6','starter-stone-1','starter-stone-6'])assert.ok(runtime.includes(id),id);
  assert.match(runtime,/떨어진 나뭇가지 줍기/);
  assert.match(runtime,/작은 돌 줍기/);
  assert.match(runtime,/도구 없이 주웠어요/);
  assert.match(runtime,/초보자 보급 상자 열기/);
  assert.match(runtime,/i\.wood=\(i\.wood\|\|0\)\+5/);
  assert.match(runtime,/i\.stone=\(i\.stone\|\|0\)\+5/);
  assert.match(runtime,/starterKitClaimed/);
  assert.match(storage,/starterKitClaimed:false/);
});

test('Seed Town uses actual tracked 3D human NPC assets',()=>{
  const files=[
    'character-female-a.glb','character-female-b.glb','character-female-c.glb',
    'character-female-d.glb','character-female-e.glb','character-female-f.glb',
    'character-male-a.glb','character-male-b.glb','character-male-c.glb',
    'character-male-d.glb','character-male-e.glb','character-male-f.glb'
  ];
  for(const file of files){
    assert.ok(fs.existsSync(path.join(root,'assets','game','characters','people',file)),'missing '+file);
    assert.ok(city.includes(file),'city missing '+file);
  }
  assert.ok(fs.existsSync(path.join(root,'assets','game','shops','market','character-employee.glb')));
  assert.match(city,/character-employee\.glb/);
  for(const name of ['민지','준호','하늘','도윤','유나','태호','소라','현우','나리','우진','서연','민석','마트직원']){
    assert.ok(city.includes(name),'NPC missing '+name);
  }
});

test('Seed Town reuses tracked city market transport and service assets',()=>{
  const files=[
    ['assets','game','shops','market','display-fruit.glb'],
    ['assets','game','shops','market','display-bread.glb'],
    ['assets','game','shops','market','cash-register.glb'],
    ['assets','game','shops','market','shopping-cart.glb'],
    ['assets','game','3d','city','kenney-city-kit-roads','road-crossroad.glb'],
    ['assets','game','3d','city','poly-pizza-city-pack','bus-stop.glb'],
    ['assets','game','3d','city','poly-pizza-city-pack','bicycle.glb'],
    ['assets','game','3d','city','kenney-city-kit-suburban','building-type-h.glb'],
    ['assets','game','3d','city','kenney-city-kit-suburban','building-type-i.glb']
  ];
  for(const parts of files)assert.ok(fs.existsSync(path.join(root,...parts)),'missing '+parts.join('/'));
  for(const label of ['씨앗마트','튼튼 철물점','하늘 카페','키즈 아케이드','마을회관','마을 도서관','튼튼 보건소']){
    assert.ok(city.includes(label),'venue missing '+label);
  }
});

test('town economy supports shopping selling jobs delivery leisure services schedules and friendship',()=>{
  assert.match(economy,/const BUY=/);
  assert.match(economy,/const SELL=/);
  assert.match(economy,/const JOBS=/);
  assert.match(economy,/const HOURS=/);
  assert.match(economy,/function delivery\(\)/);
  assert.match(economy,/function completeDelivery\(\)/);
  assert.match(economy,/function arcade\(\)/);
  assert.match(economy,/function playRps\(choice\)/);
  assert.match(economy,/function library\(\)/);
  assert.match(economy,/function clinic\(\)/);
  assert.match(economy,/function transport\(\)/);
  assert.match(economy,/friendship/);
  assert.match(runtime,/코인/);
  assert.match(runtime,/재미/);
  assert.match(storage,/coins:120,fun:80/);
});

test('hardware shop and free starter resources both escape the tool loop',()=>{
  assert.match(economy,/돌도끼/);
  assert.match(economy,/돌곡괭이/);
  assert.match(economy,/wood3/);
  assert.match(economy,/stone3/);
  assert.match(runtime,/초보자 보급: 목재 \+5 · 돌 \+5/);
});

test('city has bus travel and passes game time to NPC schedules',()=>{
  assert.match(runtime,/const TRAVEL_POINTS=/);
  assert.match(runtime,/travel:travelTo/);
  assert.match(runtime,/getGameTime:\(\)=>prog\(\)\.survival\.time/);
  assert.match(city,/민석에게 씨앗버스 타기/);
  assert.match(city,/getGameTime/);
  assert.match(city,/evening/);
});

test('Seed Town is connected into the continuous World v3 map and current cache',()=>{
  assert.match(runtime,/buildKidscadeCity/);
  assert.match(runtime,/씨앗마을 중심가 · 장보기·일·놀이/);
  assert.match(runtime,/z2:40/);
  assert.match(runtime,/cityRuntime\?\.update\?\.\(now,dt\)/);
  assert.match(runtime,/도시 안내판 읽기/);
  assert.match(runtime,/interaction\.enabled=false/);
  assert.match(runtime,/createTownEconomy/);
  assert.match(runtime,/kidscade-world-city\.js\?v=4/);
  assert.match(runtime,/kidscade-world-economy\.js\?v=4/);
  assert.match(html,/kidscade-world-v3\.js\?v=6/);
  assert.match(integration,/world-v3\/kidscade-world\.html\?v=6/);
});
