const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const runtime=fs.readFileSync(path.join(root,'world-v3','kidscade-world-v3.js'),'utf8');
const city=fs.readFileSync(path.join(root,'world-v3','kidscade-world-city.js'),'utf8');
const grid=fs.readFileSync(path.join(root,'world-v3','kidscade-world-grid.js'),'utf8');
const economy=fs.readFileSync(path.join(root,'world-v3','kidscade-world-economy.js'),'utf8');
const furnishing=fs.readFileSync(path.join(root,'world-v3','kidscade-world-furnishing.js'),'utf8');
const audio=fs.readFileSync(path.join(root,'world-v3','kidscade-world-audio.js'),'utf8');
const storage=fs.readFileSync(path.join(root,'world-v2','kidscade-world-storage.js'),'utf8');
const html=fs.readFileSync(path.join(root,'world-v3','kidscade-world.html'),'utf8');
const integration=fs.readFileSync(path.join(root,'life-world-integration.js'),'utf8');
const uiInfo=fs.readFileSync(path.join(root,'ui-information-architecture.js'),'utf8');
const seedEntry=fs.readFileSync(path.join(root,'seed-house-entry.js'),'utf8');
const indexBase=fs.readFileSync(path.join(root,'index_base.html'),'utf8');

test('Seed Town modules parse as modules after import/export stripping',()=>{
  for(const src0 of [runtime,city,grid,economy,furnishing,audio]){
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
  assert.match(runtime,/WORLD_GRID,WORLD_BOUNDS,CITY_BOUNDS,ROAD_X,ROAD_Z,zoneAt,isCityArea,isTravelCorridor,footprintTouchesRoad/);
  assert.match(runtime,/buildKidscadeCity/);
  assert.match(runtime,/cityRuntime\?\.update\?\.\(now,dt\)/);
  assert.match(runtime,/createTownEconomy/);
  assert.match(runtime,/kidscade-world-city\.js\?v=16/);
  assert.match(runtime,/kidscade-world-grid\.js\?v=3/);
  assert.match(runtime,/kidscade-world-economy\.js\?v=12/);
  assert.match(runtime,/kidscade-world-furnishing\.js\?v=6/);
  assert.match(runtime,/kidscade-world-audio\.js\?v=1/);
  assert.match(html,/kidscade-world-v3\.js\?v=28/);
  assert.match(integration,/world-v3\/kidscade-world\.html\?v=28/);
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
  assert.match(storage,/housing:\{version:4,owned:\{\},placed:\[\],starterGiftClaimed:false,defaultLayoutMigrated:false,functionalLayoutMigrated:false,nextId:1\}/);
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
  assert.doesNotMatch(economy,/television:\{name:'모던 TV'/);
  assert.match(runtime,/id:'television'/);
});


test('fresh homes no longer auto-fill study and living furniture',()=>{
  assert.match(furnishing,/function migrateDefaultLayout/);
  assert.doesNotMatch(furnishing,/async function restore\(\)\{[\s\S]*migrateDefaultLayout\(\)/);
  assert.match(runtime,/starter-home-storage/);
  assert.match(runtime,/바닥 이불에서 자기/);
  assert.match(runtime,/HOUSE_BOUNDS/);
  for(const key of ['classicDesk','tallBookcase','classicSofa','diningTable']){
    assert.ok(runtime.includes("key==='"+key+"'"),'missing retained furniture callback '+key);
  }
});

test('bed kitchen storage and wardrobe are earned through homestead progression',()=>{
  assert.match(furnishing,/bedSingle:\{name:'나무 침대'/);
  assert.match(furnishing,/kitchenStove/);
  assert.match(furnishing,/kitchenSink/);
  assert.match(furnishing,/kitchenCabinet/);
  assert.match(furnishing,/kitchenFridge/);
  assert.match(furnishing,/homeDrawers/);
  assert.match(furnishing,/wardrobe/);
  assert.doesNotMatch(furnishing,/async function restore\(\)\{[\s\S]*migrateFunctionalLayout\(\)/);
  assert.match(runtime,/const CARPENTER_RECIPES=/);
  assert.match(runtime,/kidscade:open-avatar-studio/);
  assert.match(runtime,/hasPlacedFurniture\('kitchenSink'\)/);
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
  assert.match(runtime,/river:\{x:-10,z:-14\.0,name:'북쪽 강가'\}/);
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




test('World v3 road-first grid keeps Seed Town in four equal districts',()=>{
  assert.match(grid,/export const CELL_SIZE=20/);
  assert.match(grid,/export const ROAD_WIDTH=4/);
  assert.match(grid,/export const CELL_PITCH=CELL_SIZE\+ROAD_WIDTH/);
  assert.match(grid,/CITY_BOUNDS=\{x1:-22,x2:22,z1:14,z2:58\}/);
  for(const id of ['cityMarket','cityLeisure','cityCivic','cityTransit'])assert.ok(grid.includes(id+':{id:'),'missing city square '+id);
  assert.match(city,/city-road-mid-horizontal/);
  assert.match(city,/city-road-mid-vertical/);
  assert.match(city,/city-road-south/);
  assert.match(city,/market-display/);
  assert.match(city,/transport-corner/);
  assert.match(city,/validateMapLayout/);
  assert.doesNotMatch(city,/traffic-light\.glb/);
});


test('resident AI movement keeps interaction anchors attached inside the new city squares',()=>{
  assert.match(city,/interaction:null/);
  assert.match(city,/function bind\(id,r,label,action\)/);
  assert.match(city,/n\.interaction\.x=n\.object\.position\.x/);
  assert.match(city,/n\.interaction\.z=n\.object\.position\.z/);
  assert.match(city,/dayRoleTargets/);
  assert.match(city,/eveningSlots/);
  assert.match(city,/yuna:\{x:leisure\.x-4\.0,z:leisure\.z\+4\.2/);
  assert.match(city,/woojin:\{x:leisure\.x,z:leisure\.z\+4\.8/);
  assert.match(city,/seoyeon:\{x:leisure\.x\+4\.0,z:leisure\.z\+4\.2/);
});


test('Cube Pets are separated into home yard ranch and biome habitats',()=>{
  assert.match(runtime,/isCityArea,isTravelCorridor,footprintTouchesRoad/);
  for(const habitat of ['pond','ranch','deep-forest','waterfront'])assert.ok(runtime.includes("habitat:'"+habitat+"'"),'missing habitat '+habitat);
  assert.match(runtime,/pet-yard-sign/);
  assert.match(runtime,/Cube Pets 보기/);
  assert.match(runtime,/Ranch square/);
  assert.match(runtime,/if\(isCityArea\(a\.targetX,a\.targetZ\)\)/);
  assert.match(runtime,/a\.interaction\.x=a\.object\.position\.x/);
  assert.match(runtime,/a\.interaction\.z=a\.object\.position\.z/);
  assert.match(runtime,/const LAYOUT_VERSION=7/);
});

test('regression: NPCs and animals preserve GLB ground offsets instead of sinking or floating',()=>{
  assert.match(city,/model\.position\.x-=center\.x/);
  assert.match(city,/model\.position\.z-=center\.z/);
  assert.match(city,/model\.position\.y-=b\.min\.y/);
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

test('movement input resets on focus loss and panels without interrupting city crossing',()=>{
  assert.match(runtime,/function resetInput\(requireRelease=false\)/);
  assert.match(runtime,/inputNeedsRelease/);
  assert.match(runtime,/addEventListener\('blur',\(\)=>resetInput\(true\)\)/);
  assert.match(runtime,/visibilitychange/);
  assert.match(runtime,/pagehide/);
  assert.doesNotMatch(runtime,/if\(nowInCity&&!wasInCity\)\{resetInput\(true\);\}/);
  assert.match(runtime,/function openPanel\(html\)\{resetInput\(true\)/);
  assert.match(runtime,/function setMode\(next\)\{\n  resetInput\(true\)/);
});


test('outdoor map uses one sub-base plus separated square tiles without overlapping lawn planes',()=>{
  assert.match(runtime,/box\(outdoor,0,10,80,80,\.24,0x668858,-\.30\)/);
  assert.match(runtime,/for\(const cell of Object\.values\(WORLD_GRID\)\)/);
  assert.match(runtime,/19\.6,19\.6,\.08,cell\.color,-\.08/);
  assert.doesNotMatch(runtime,/plane\(outdoor,0,5,82,96/);
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



test('farm square has six reusable plots and six selectable crops with market seeds',()=>{
  assert.match(runtime,/const CROP_DEF=\{/);
  for(const crop of ['potato','carrot','tomato','strawberry','corn','pumpkin'])assert.ok(runtime.includes(crop+':{name:'),'missing crop '+crop);
  assert.match(runtime,/const plotPos=\[/);
  assert.match(runtime,/\[f\.x-6\.0,f\.z\+2\.9\]/);
  assert.match(runtime,/\[f\.x-\.7,f\.z\+5\.65\]/);
  assert.match(runtime,/data-plant/);
  assert.match(runtime,/무엇을 심을까요/);
  assert.match(runtime,/밭 살펴보기/);
  for(const seed of ['seedStrawberry','seedCorn','seedPumpkin'])assert.ok(economy.includes(seed+':{name:'),'market missing '+seed);
  assert.match(storage,/strawberry:1,corn:1,pumpkin:1/);
});


test('workshop camp bridge and beach each stay in their owning square',()=>{
  assert.match(runtime,/ASSET\.workbench,\{x:f\.x\+6\.2,z:f\.z\+6\.5/);
  assert.match(runtime,/ASSET\.chest,\{x:f\.x\+4\.1,z:f\.z\+6\.9/);
  assert.match(runtime,/ASSET\.campfire,\{x:c\.x-1\.5,z:c\.z/);
  assert.match(runtime,/ASSET\.bridge,\{x:w\.x,z:w\.z,w:4\.2,h:\.9,d:5\.4,rot:Math\.PI\/2,name:'northBridge'\}/);
  assert.match(runtime,/sea\.position\.set\(b\.x,\.055,b\.z-7\.0\)/);
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
  assert.match(city,/cloneSkeleton\(gltf\.scene\)/);
  assert.doesNotMatch(city,/base\.clone\(true\)/);
  assert.match(city,/const anchor=new THREE\.Group\(\)/);
  assert.match(city,/anchor\.add\(model\)/);
});


test('resident GLBs retain full animations and use the proven people normalization pipeline',()=>{
  assert.match(runtime,/const gltfCache=new Map\(\)/);
  assert.match(runtime,/function loadGLTF\(url\)/);
  assert.match(city,/cloneSkeleton\(gltf\.scene\)/);
  assert.match(city,/const baseSize=Math\.max\(size\.x,size\.y,size\.z\)\|\|1/);
  assert.match(city,/model\.position\.x-=center\.x/);
  assert.match(city,/model\.position\.z-=center\.z/);
  assert.match(city,/model\.position\.y-=b\.min\.y/);
  assert.match(city,/new THREE\.AnimationMixer\(model\)/);
  assert.match(city,/\/idle\|stand\/i/);
  assert.match(city,/\/walk\|run\/i/);
  assert.match(city,/n\.mixer\?\.update\(dt\)/);
});



test('roads are four-metre gutters between parcels, not paths drawn through parcels',()=>{
  assert.match(grid,/export const ROAD_WIDTH=4/);
  assert.match(grid,/export const ROAD_X=\[-24,0,24\]/);
  assert.match(grid,/export const ROAD_Z=\[-12,12,36\]/);
  assert.match(grid,/function isRoadArea\(x,z,pad=0\)/);
  assert.match(grid,/function footprintTouchesRoad\(x,z,w=0,d=0,pad=\.12\)/);
  assert.match(runtime,/for\(const x of ROAD_X\)box\(outdoor,x,12,4,92/);
  assert.match(runtime,/for\(const z of ROAD_Z\)box\(outdoor,0,z,92,4/);
  assert.doesNotMatch(runtime,/if\(mode==='outdoor'&&isTravelCorridor\(nx,nz\)\)return false/);
  assert.match(runtime,/function addNatureCollider\(x,z,w,d\)/);
});

test('resident walk animation strips root motion so visual bodies cannot detach from labels',()=>{
  assert.match(city,/const walkSource=/);
  assert.match(city,/walkSource\?walkSource\.clone\(\):null/);
  assert.match(city,/walkClip\.tracks=walkClip\.tracks\.filter/);
  assert.match(city,/\^root\\\.position\$/);
  assert.match(city,/n\.frustumCulled=false/);
});


test('residents actually idle between short walks instead of perpetual sinusoidal motion',()=>{
  assert.match(city,/function chooseNpcDecision\(n,hx,hz,r,now\)/);
  assert.match(city,/pauseChance=mostlyStationary\?\.82:\.55/);
  assert.match(city,/n\.moving=false;n\.targetX=n\.object\.position\.x/);
  assert.match(city,/n\.nextDecision=now\+1800\+Math\.random\(\)\*3200/);
  assert.match(city,/n\.playAnim\?\.\(walking\?'walk':'idle'\)/);
  assert.doesNotMatch(city,/Math\.sin\(now\/2600\+n\.phase\)/);
});



test('natural props and wayfinding stay inside parcels and off road gutters',()=>{
  assert.match(runtime,/function isPathClearance\(x,z,w=0,d=0\)\{return footprintTouchesRoad\(x,z,w,d,\.18\)\}/);
  assert.match(runtime,/if\(isPathClearance\(x,z,2\.5,2\.5\)\)continue/);
  assert.match(runtime,/if\(isPathClearance\(x,z,1\.7,1\.6\)\)continue/);
  assert.match(runtime,/const addZoneSign=async\(id,dx,dz,label,rot=0\)=>/);
  assert.match(runtime,/addZoneSign\('forest',7\.0,6\.6/);
  assert.match(runtime,/addZoneSign\('quarry',-7\.0,6\.6/);
  assert.match(runtime,/addZoneSign\('waterfront',6\.5,6\.8/);
  assert.match(runtime,/addZoneSign\('beach',6\.4,6\.6/);
});


test('four city squares use only shared road gutters and centered crosswalks',()=>{
  assert.match(city,/box\(parent,0,36,44,4/);
  assert.match(city,/box\(parent,0,36,4,44/);
  assert.match(city,/box\(parent,0,12,44,4/);
  assert.match(city,/for\(const x of \[-12,12\]\)/);
  assert.match(city,/for\(const z of \[10\.8,11\.55,12\.3,13\.05\]\)/);
  assert.match(city,/for\(const z of \[24,48\]\)/);
  assert.match(runtime,/const LAYOUT_VERSION=7/);
});


test('World v3 has one authoritative 20x20 parcel plus 4m road grid',()=>{
  assert.match(grid,/export const CELL_SIZE=20/);
  assert.match(grid,/export const ROAD_WIDTH=4/);
  assert.match(grid,/export const CELL_PITCH=CELL_SIZE\+ROAD_WIDTH/);
  for(const spec of [
    ["beach",-36,-24],["waterfront",-12,-24],["ranch",12,-24],
    ["forest",-36,0],["home",-12,0],["farm",12,0],["quarry",36,0],
    ["camp",-36,24],["cityMarket",-12,24],["cityLeisure",12,24],
    ["cityCivic",-12,48],["cityTransit",12,48]
  ]){
    const [id,cx,cz]=spec;
    assert.ok(grid.includes(id+":{id:'"+id+"'"),'missing grid cell '+id);
    assert.ok(grid.includes('cx:'+cx+',cz:'+cz),'wrong center for '+id);
  }
  assert.match(grid,/WORLD_BOUNDS=\{x1:-46,x2:46,z1:-34,z2:58\}/);
  assert.match(runtime,/zoneAt\(player\.x,player\.z\)/);
});

test('Seed Bus exposes the new square ranch and beach districts',()=>{
  assert.match(economy,/data-city-travel="ranch"/);
  assert.match(economy,/data-city-travel="beach"/);
  assert.match(runtime,/ranch:\{x:10,z:-14\.0,name:'목장'\}/);
  assert.match(runtime,/beach:\{x:-30,z:-14\.0,name:'해변가'\}/);
});


test('profile Seed World entry replaces legacy garden and shop navigation',()=>{
  assert.doesNotMatch(indexBase,/id="sidebar-pet-open"/);
  assert.match(indexBase,/id="kc-pet-card" aria-label="Cube Pets 현황"/);
  assert.match(indexBase,/id="btn-open-shop"[^>]*data-open-life-world="profile-world"[^>]*>🌱 씨앗 월드</);
  assert.doesNotMatch(indexBase,/kc-pet-card'\)\?\.addEventListener\('click'/);
  assert.match(uiInfo,/shopButton\.textContent = '🌱 씨앗 월드'/);
  assert.match(uiInfo,/document\.getElementById\('sidebar-pet-open'\)\?\.remove\(\)/);
  assert.match(integration,/if\(openBtn\)openBtn\.remove\(\)/);
  assert.match(seedEntry,/document\.querySelector\('\.kc-seed-house-card'\)\?\.remove\(\)/);
});
