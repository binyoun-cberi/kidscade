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
const audio=fs.readFileSync(path.join(root,'world-v3','kidscade-world-audio.js'),'utf8');
const storage=fs.readFileSync(path.join(root,'world-v2','kidscade-world-storage.js'),'utf8');
const html=fs.readFileSync(path.join(root,'world-v3','kidscade-world.html'),'utf8');
const integration=fs.readFileSync(path.join(root,'life-world-integration.js'),'utf8');

test('Seed Town modules parse as modules after import/export stripping',()=>{
  for(const src0 of [runtime,city,economy,furnishing,audio]){
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
  assert.match(city,/민석과 이야기하기/);
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
  assert.match(runtime,/kidscade-world-city\.js\?v=9/);
  assert.match(runtime,/kidscade-world-economy\.js\?v=9/);
  assert.match(runtime,/kidscade-world-furnishing\.js\?v=4/);
  assert.match(runtime,/kidscade-world-audio\.js\?v=1/);
  assert.match(html,/kidscade-world-v3\.js\?v=16/);
  assert.match(integration,/world-v3\/kidscade-world\.html\?v=16/);
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


test('named Seed Town residents expose roles services friendship milestones and exclusive rewards',()=>{
  for(const id of ['minji','junho','haneul','doyun','yuna','taeho','sora','hyunwoo','nari','woojin','seoyeon','minseok']){
    assert.ok(economy.includes(id+':{name:'),'resident profile missing '+id);
    assert.ok(economy.includes(id+':['),'friendship reward track missing '+id);
    assert.ok(city.includes("actions.resident('"+id+"')"),'city interaction missing '+id);
  }
  assert.match(economy,/data-resident-talk/);
  assert.match(economy,/data-resident-service/);
  assert.match(economy,/rewardClaims/);
  assert.match(economy,/perks/);
  assert.match(storage,/rewardClaims:\{\},perks:\{\}/);
  for(const at of ['at:3','at:7','at:12'])assert.ok(economy.includes(at),'missing friendship milestone '+at);
});

test('friendship perks affect the systems matching each resident role',()=>{
  assert.match(economy,/marketDiscount/);
  assert.match(economy,/hardwareDiscount/);
  assert.match(economy,/cafeDiscount/);
  assert.match(economy,/jobBonus/);
  assert.match(economy,/arcadeDiscount/);
  assert.match(economy,/libraryEnergyBonus/);
  assert.match(economy,/deliveryBonus/);
  assert.match(economy,/clinicDiscount/);
  assert.match(economy,/riverBus/);
  assert.match(runtime,/townPerks\(\)\.harvestBonus/);
  assert.match(runtime,/townPerks\(\)\.mushroomBonus/);
  assert.match(runtime,/townPerks\(\)\.petFriendBonus/);
  assert.match(runtime,/river:\{x:0,z:-15\.0,name:'북쪽 강가'\}/);
});

test('friendship level 12 grants resident-exclusive tracked 3D furniture',()=>{
  const rewards=[
    ['minjiPlanter','plant-small3.glb'],['junhoStool','stool-bar-square.glb'],
    ['haneulTable','table-round.glb'],['doyunBench','bench-cushion.glb'],
    ['yunaPlant','plant-small2.glb'],['taehoRetroTv','television-vintage.glb'],
    ['soraBookcase','bookcase-closed-wide.glb'],['hyunwooDrawers','side-table-drawers.glb'],
    ['nariLamp','lamp-square-floor.glb'],['woojinRelaxChair','lounge-chair-relax.glb'],
    ['seoyeonPetChair','chair-rounded.glb'],['minseokTravelBench','bench-cushion-low.glb']
  ];
  for(const [key,file] of rewards){
    assert.ok(furnishing.includes(key),'rare reward missing '+key);
    assert.ok(furnishing.includes(file),'rare reward asset missing '+file);
    assert.ok(fs.existsSync(path.join(root,'assets','game','3d','interiors','kenney-furniture-kit',file)),'untracked reward asset '+file);
  }
  assert.match(runtime,/key==='taehoRetroTv'/);
  assert.match(runtime,/key==='soraBookcase'/);
});


test('World v3 map cleanup keeps town roads zones props and NPC anchors organized',()=>{
  assert.match(city,/CITY_BOUNDS=\{x1:-26,x2:26,z1:20,z2:40\}/);
  assert.match(city,/const roadX=\[-24,-20,-16,-12,-8,-4,4,8,12,16,20,24\]/);
  assert.match(city,/city-road-cross/);
  assert.match(city,/city-road-entry-25/);
  assert.match(city,/city-road-entry-21/);
  assert.doesNotMatch(city,/traffic-light\.glb/);
  assert.match(city,/city-plaza/);
  assert.match(city,/market-display/);
  assert.match(city,/transport-corner/);
  assert.match(city,/validateMapLayout/);
  assert.match(city,/\[World v3 map overlap\]/);
});

test('resident AI movement keeps interaction anchors attached to moving NPC models',()=>{
  assert.match(city,/interaction:null/);
  assert.match(city,/function bind\(id,r,label,action\)/);
  assert.match(city,/n\.interaction\.x=n\.object\.position\.x/);
  assert.match(city,/n\.interaction\.z=n\.object\.position\.z/);
  assert.match(city,/dayRoleTargets/);
  assert.match(city,/eveningSlots/);
  assert.match(city,/yuna:\{x:-15\.4,z:32\.0/);
  assert.match(city,/woojin:\{x:-8\.0,z:32\.15/);
  assert.match(city,/seoyeon:\{x:8\.0,z:32\.15/);
});

test('Cube Pets are separated into owned yard companions and habitat-based wild animals',()=>{
  assert.match(runtime,/CITY_LIMITS=\{x1:-26,x2:26,z1:20,z2:40\}/);
  assert.match(runtime,/function isCityArea\(x,z\)/);
  for(const habitat of ["pond","farm-pasture","deep-forest","riverbank"])assert.ok(runtime.includes("habitat:'"+habitat+"'"),'missing habitat '+habitat);
  assert.match(runtime,/pet-yard-sign/);
  assert.match(runtime,/Cube Pets 마당 보기/);
  assert.match(runtime,/farm-side ranch is the permanent home/);
  assert.match(runtime,/if\(isCityArea\(a\.targetX,a\.targetZ\)\)/);
  assert.match(runtime,/a\.interaction\.x=a\.object\.position\.x/);
  assert.match(runtime,/a\.interaction\.z=a\.object\.position\.z/);
  assert.match(runtime,/const LAYOUT_VERSION=4/);
  assert.match(runtime,/if\(z>20\)zoneEl\.textContent='씨앗마을 중심가/);
});


test('regression: NPCs and animals preserve GLB ground offsets instead of sinking or floating',()=>{
  assert.match(city,/model\.position\.set\(0,-b\.min\.y,0\)/);
  assert.match(city,/const anchor=new THREE\.Group\(\)/);
  assert.match(city,/object:anchor,model/);
  assert.match(city,/n\.object\.position\.y=n\.groundY/);
  assert.match(runtime,/o\.userData\.groundY=o\.position\.y/);
  assert.match(runtime,/groundY=Number\(object\.userData\.groundY\)\|\|0/);
  assert.match(runtime,/a\.object\.position\.y=a\.groundY/);
});

test('wild and yard animals have roaming decisions pauses and directional facing',()=>{
  assert.match(runtime,/function chooseAnimalTarget/);
  assert.match(runtime,/function stepAnimal/);
  assert.match(runtime,/Math\.random\(\)<\.32/);
  assert.match(runtime,/a\.object\.rotation\.y=Math\.atan2\(dx,dz\)/);
  assert.match(runtime,/a\.moving=false/);
  assert.match(runtime,/speed:\.22\+Math\.random\(\)\*\.18/);
});

test('movement input cannot remain stuck across focus loss panels travel or city entry',()=>{
  assert.match(runtime,/function resetInput\(requireRelease=false\)/);
  assert.match(runtime,/inputNeedsRelease/);
  assert.match(runtime,/addEventListener\('blur',\(\)=>resetInput\(true\)\)/);
  assert.match(runtime,/visibilitychange/);
  assert.match(runtime,/pagehide/);
  assert.match(runtime,/if\(nowInCity&&!wasInCity\)\{resetInput\(true\);\}/);
  assert.match(runtime,/function openPanel\(html\)\{resetInput\(true\)/);
  assert.match(runtime,/function setMode\(next\)\{\n  resetInput\(true\)/);
});

test('map camera no longer exposes the blue void at town and river edges',()=>{
  assert.match(runtime,/plane\(outdoor,0,5,82,96,0x7caf63,0\)/);
  assert.match(runtime,/box\(outdoor,0,5,82,96,.22,0x6c9657,-.22\)/);
});

test('city labels are smaller and only shown near the player',()=>{
  assert.match(city,/width:1\.2,height:\.30/);
  assert.match(city,/tag\.visible=false/);
  assert.match(city,/buildingLabels/);
  assert.match(city,/Math\.hypot\(player\.x-n\.object\.position\.x,player\.z-n\.object\.position\.z\)<3\.4/);
  assert.match(city,/Math\.hypot\(player\.x-a\.x,player\.z-a\.z\)<7\.5/);
});


test('v3.14 removes the 2D fallback entry and exposes audio control instead',()=>{
  assert.doesNotMatch(html,/id="stable"/);
  assert.doesNotMatch(html,/2D 안정판/);
  assert.doesNotMatch(runtime,/getElementById\('stable'\)/);
  assert.match(html,/id="audioToggle"/);
  assert.match(runtime,/createWorldAudio/);
  assert.match(runtime,/pauseAudio\(\)/);
  assert.match(runtime,/resumeAudio\(\)/);
  assert.match(integration,/pauseAudio/);
  assert.match(integration,/resumeAudio/);
});

test('farm has six reusable plots and six selectable crops with market seeds',()=>{
  assert.match(runtime,/const CROP_DEF=\{/);
  for(const crop of ['potato','carrot','tomato','strawberry','corn','pumpkin'])assert.ok(runtime.includes(crop+':{name:'),'missing crop '+crop);
  assert.match(runtime,/const plotPos=\[\[4\.8,4\.25\],\[7\.4,4\.25\],\[10\.0,4\.25\],\[4\.8,7\.0\],\[7\.4,7\.0\],\[10\.0,7\.0\]\]/);
  assert.match(runtime,/data-plant/);
  assert.match(runtime,/무엇을 심을까요/);
  assert.match(runtime,/밭 살펴보기/);
  for(const seed of ['seedStrawberry','seedCorn','seedPumpkin'])assert.ok(economy.includes(seed+':{name:'),'market missing '+seed);
  assert.match(storage,/strawberry:1,corn:1,pumpkin:1/);
});

test('workshop camp and bridge are separated from farm and travel paths',()=>{
  assert.match(runtime,/workbench,\{x:15\.2,z:7\.35/);
  assert.match(runtime,/chest,\{x:13\.55,z:7\.55/);
  assert.match(runtime,/campfire,\{x:-3\.2,z:16\.7/);
  assert.match(runtime,/ASSET\.bridge,\{x:0,z:-15\.9,w:4\.2,h:\.9,d:5\.4,rot:Math\.PI\/2,name:'northBridge'\}/);
  assert.doesNotMatch(runtime,/campfire,\{x:0,z:17\.0/);
});

test('owned ranch pets have daily products and dedicated ranch slots',()=>{
  assert.match(runtime,/const RANCH_SLOTS=\{/);
  assert.match(runtime,/const RANCH_PRODUCTS=\{/);
  assert.match(runtime,/cow:\{key:'milk'/);
  assert.match(runtime,/chick:\{key:'egg'/);
  assert.match(runtime,/pig:\{key:'truffle'/);
  assert.match(runtime,/function ranchPanel\(\)/);
  assert.match(runtime,/function collectRanchProducts\(\)/);
  assert.match(runtime,/목장 생산물 확인하기/);
  assert.match(storage,/milk:0,egg:0,truffle:0/);
  assert.match(economy,/milk:18,egg:12,truffle:38/);
});

test('World v3 audio uses local licensed project assets for BGM and interaction feedback',()=>{
  assert.match(audio,/idoberg-relaxing-guitar-loop-v8-252351\.mp3/);
  assert.match(audio,/coin-pickup-01\.mp3/);
  assert.match(audio,/purchase-kaching-01\.mp3/);
  assert.match(audio,/impact-heavy-01\.mp3/);
  assert.match(audio,/localStorage\.getItem\(SETTINGS_KEY\)/);
  assert.match(runtime,/worldAudio\.sfx\('impact'/);
  assert.match(runtime,/worldAudio\.sfx\('pickup'/);
  assert.match(economy,/playSfx\?\.\('purchase'/);
});


test('resident skinned GLBs use SkeletonUtils clone instead of shared Object3D skeletons',()=>{
  assert.match(city,/SkeletonUtils\.js/);
  assert.match(city,/clone as cloneSkeleton/);
  assert.match(city,/cloneSkeleton\(base\)/);
  assert.doesNotMatch(city,/base\.clone\(true\)/);
  assert.match(city,/const anchor=new THREE\.Group\(\)/);
  assert.match(city,/anchor\.add\(model\)/);
});
