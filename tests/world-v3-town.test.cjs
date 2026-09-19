const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const runtime=fs.readFileSync(path.join(root,'world-v3','kidscade-world-v3.js'),'utf8');
const city=fs.readFileSync(path.join(root,'world-v3','kidscade-world-city.js'),'utf8');
const economy=fs.readFileSync(path.join(root,'world-v3','kidscade-world-economy.js'),'utf8');
const furnishing=fs.readFileSync(path.join(root,'world-v3','kidscade-world-furnishing.js'),'utf8');
const storage=fs.readFileSync(path.join(root,'world-v2','kidscade-world-storage.js'),'utf8');
const html=fs.readFileSync(path.join(root,'world-v3','kidscade-world.html'),'utf8');
const integration=fs.readFileSync(path.join(root,'life-world-integration.js'),'utf8');

test('Seed Town modules parse as modules after import/export stripping',()=>{
  for(const src0 of [runtime,city,economy,furnishing]){
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
  assert.match(runtime,/kidscade-world-economy\.js\?v=6/);
  assert.match(runtime,/kidscade-world-furnishing\.js\?v=3/);
  assert.match(html,/kidscade-world-v3\.js\?v=10/);
  assert.match(integration,/world-v3\/kidscade-world\.html\?v=10/);
});


test('starter resources provide six hand pickups per material and one-time guidance',()=>{
  assert.equal((runtime.match(/addGroundPickup\('starter-wood-/g)||[]).length,6);
  assert.equal((runtime.match(/addGroundPickup\('starter-stone-/g)||[]).length,6);
  assert.match(runtime,/GROUND_PICKUP_RESPAWN_MS=45000/);
  assert.match(runtime,/function showStarterHintOnce\(\)/);
  assert.match(runtime,/showStarterHintOnce\(\);/);
  assert.match(runtime,/starterHintSeen/);
  assert.match(storage,/starterHintSeen:false/);
  assert.match(runtime,/초보자 보급: 목재 \+5 · 돌 \+5/);
  assert.match(runtime,/돌도끼[\s\S]*wood:3,stone:2/);
  assert.match(runtime,/돌곡괭이[\s\S]*wood:2,stone:3/);
});


test('World v3 furnishing supports persistent craft buy place rotate move and store loops',()=>{
  assert.match(storage,/housing:\{version:3,owned:\{\},placed:\[\],starterGiftClaimed:false,defaultLayoutMigrated:false,functionalLayoutMigrated:false,nextId:1\}/);
  assert.match(runtime,/createFurnishingSystem/);
  assert.match(runtime,/가구 창고 · 집 꾸미기/);
  assert.match(runtime,/canPlaceFurniture/);
  assert.match(furnishing,/FURNITURE_CATALOG/);
  assert.match(furnishing,/data-furnish-rotate/);
  assert.match(furnishing,/data-furnish-confirm/);
  assert.match(furnishing,/data-furnish-cancel/);
  assert.match(furnishing,/data-furn-move/);
  assert.match(furnishing,/data-furn-store/);
  assert.match(furnishing,/starterGiftClaimed/);
  for(const file of ['chair.glb','side-table.glb','potted-plant.glb','bookcase-open-low.glb','table-coffee.glb','lounge-chair.glb','rug-round.glb','lamp-round-floor.glb','bear.glb','television-modern.glb']){
    assert.ok(fs.existsSync(path.join(root,'assets','game','3d','interiors','kenney-furniture-kit',file)),'missing furniture '+file);
    assert.ok(furnishing.includes(file),'catalog missing '+file);
  }
  assert.match(economy,/type:'furniture'/);
  assert.match(economy,/둥근 러그/);
  assert.match(economy,/플로어 램프/);
  assert.match(economy,/모던 TV/);
});


test('default home study and living furniture migrates once into movable saved furniture',()=>{
  assert.match(furnishing,/defaultLayoutMigrated/);
  assert.match(furnishing,/id:'home-desk',key:'classicDesk'/);
  assert.match(furnishing,/id:'home-bookcase',key:'tallBookcase'/);
  assert.match(furnishing,/id:'home-rug',key:'rugRectangle'/);
  assert.match(furnishing,/id:'home-sofa',key:'classicSofa'/);
  assert.match(furnishing,/id:'home-table',key:'diningTable'/);
  assert.match(furnishing,/migrateDefaultLayout\(\);/);
  for(const file of ['desk.glb','bookcase-open.glb','rug-rectangle.glb','lounge-sofa.glb','table.glb']){
    assert.ok(fs.existsSync(path.join(root,'assets','game','3d','interiors','kenney-furniture-kit',file)),'missing default furniture '+file);
    assert.ok(furnishing.includes(file),'movable catalog missing '+file);
  }
  assert.doesNotMatch(runtime,/addModel\(indoor,ASSET\.desk/);
  assert.doesNotMatch(runtime,/addModel\(indoor,ASSET\.bookcase/);
  assert.doesNotMatch(runtime,/addModel\(indoor,ASSET\.rug/);
  assert.doesNotMatch(runtime,/addModel\(indoor,ASSET\.sofa/);
  assert.doesNotMatch(runtime,/addModel\(indoor,ASSET\.table/);
  assert.doesNotMatch(runtime,/addModel\(indoor,ASSET\.bed/);
  assert.doesNotMatch(runtime,/addModel\(indoor,ASSET\.stove/);
  assert.doesNotMatch(runtime,/addModel\(indoor,ASSET\.fridge/);
  assert.match(furnishing,/data-furn-use/);
  assert.match(runtime,/key==='classicSofa'/);
  assert.match(runtime,/key==='tallBookcase'/);
  assert.match(runtime,/key==='diningTable'/);
  assert.match(runtime,/key==='classicDesk'/);
});


test('functional home essentials migrate separately and keep their actions while movable',()=>{
  assert.match(furnishing,/functionalLayoutMigrated/);
  assert.match(furnishing,/id:'home-bed',key:'bedSingle'/);
  assert.match(furnishing,/id:'home-stove',key:'kitchenStove'/);
  assert.match(furnishing,/id:'home-sink',key:'kitchenSink'/);
  assert.match(furnishing,/id:'home-cabinet',key:'kitchenCabinet'/);
  assert.match(furnishing,/id:'home-fridge',key:'kitchenFridge'/);
  assert.match(furnishing,/migrateFunctionalLayout\(\);/);
  for(const file of ['bed-single.glb','kitchen-stove.glb','kitchen-sink.glb','kitchen-cabinet.glb','kitchen-fridge.glb']){
    assert.ok(fs.existsSync(path.join(root,'assets','game','3d','interiors','kenney-furniture-kit',file)),'missing functional furniture '+file);
    assert.ok(furnishing.includes(file),'functional catalog missing '+file);
  }
  assert.doesNotMatch(runtime,/addModel\(indoor,ASSET\.bed/);
  assert.doesNotMatch(runtime,/addModel\(indoor,ASSET\.stove/);
  assert.doesNotMatch(runtime,/addModel\(indoor,ASSET\.sink/);
  assert.doesNotMatch(runtime,/addModel\(indoor,ASSET\.cabinet/);
  assert.doesNotMatch(runtime,/addModel\(indoor,ASSET\.fridge/);
  for(const key of ['bedSingle','kitchenStove','kitchenSink','kitchenCabinet','kitchenFridge','television']){
    assert.ok(runtime.includes("key==='"+key+"'"),'missing functional callback '+key);
  }
  assert.match(furnishing,/사용·꾸미기/);
  assert.match(storage,/functionalLayoutMigrated:false/);
});
