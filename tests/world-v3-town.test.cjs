const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const runtime=fs.readFileSync(path.join(root,'world-v3','kidscade-world-v3.js'),'utf8');
const city=fs.readFileSync(path.join(root,'world-v3','kidscade-world-city.js'),'utf8');
const residents=fs.readFileSync(path.join(root,'world-v3','kidscade-world-residents.js'),'utf8');
const npcStyle=fs.readFileSync(path.join(root,'world-v3','kidscade-world-npc-style.js'),'utf8');
const school=fs.readFileSync(path.join(root,'world-v3','kidscade-world-school.js'),'utf8');
const daily=fs.readFileSync(path.join(root,'world-v3','kidscade-world-daily.js'),'utf8');
const dailyLife=fs.readFileSync(path.join(root,'world-v3','kidscade-world-daily-life.js'),'utf8');
const interiors=fs.readFileSync(path.join(root,'world-v3','kidscade-world-interiors.js'),'utf8');
const museum=fs.readFileSync(path.join(root,'world-v3','kidscade-world-museum.js'),'utf8');
const grid=fs.readFileSync(path.join(root,'world-v3','kidscade-world-grid.js'),'utf8');
const landscape=fs.readFileSync(path.join(root,'world-v3','kidscade-world-landscape.js'),'utf8');
const economy=fs.readFileSync(path.join(root,'world-v3','kidscade-world-economy.js'),'utf8');
const furnishing=fs.readFileSync(path.join(root,'world-v3','kidscade-world-furnishing.js'),'utf8');
const interiorKit=fs.readFileSync(path.join(root,'world-v3','kidscade-world-interior-kit.js'),'utf8');
const audio=fs.readFileSync(path.join(root,'world-v3','kidscade-world-audio.js'),'utf8');
const storage=fs.readFileSync(path.join(root,'world-v2','kidscade-world-storage.js'),'utf8');
const html=fs.readFileSync(path.join(root,'world-v3','kidscade-world.html'),'utf8');
const integration=fs.readFileSync(path.join(root,'life-world-integration.js'),'utf8');
const uiInfo=fs.readFileSync(path.join(root,'ui-information-architecture.js'),'utf8');
const seedEntry=fs.readFileSync(path.join(root,'seed-house-entry.js'),'utf8');
const indexBase=fs.readFileSync(path.join(root,'index_base.html'),'utf8');

test('Seed Town modules parse as modules after import/export stripping',()=>{
  for(const src0 of [runtime,city,residents,npcStyle,school,daily,dailyLife,interiors,museum,grid,landscape,economy,furnishing,interiorKit,audio]){
    const src=src0
      .replace(/^import .*$/gm,'')
      .replace(/^export /gm,'')
      .replace(/import\.meta\.url/g,"'https://example.test/world-v3/module.js'");
    const r=spawnSync(process.execPath,['--check'],{input:src,encoding:'utf8'});
    assert.equal(r.status,0,r.stderr||r.stdout);
  }
});

test('Seed World daily director keeps weather stable and visible',()=>{
  assert.match(runtime,/createDailyDirector/);
  assert.match(runtime,/dailyDirector\.applyLighting/);
  assert.match(runtime,/dailyDirector\?\.update/);
  assert.match(runtime,/getDailyState:\(\)=>dailyDirector/);
  assert.match(runtime,/state\.weather==='rain'/);
  assert.match(runtime,/crop\.phase='growing'/);
  assert.match(daily,/function seeded\(day,salt=0\)/);
  assert.match(daily,/shopSeed/);
  assert.match(daily,/forageSeed/);
  assert.match(daily,/visitorSeed/);
  assert.match(daily,/day===1.*WEATHER\.clear/s);
  for(const id of ['clear','cloudy','rain','fog'])assert.ok(daily.includes(id+':{id:'),id);
  assert.match(daily,/makeRain\(parent\)/);
});

test('Seed Town permanent NPCs are school teachers or students with persistent life quests',()=>{
  const roles=['수학 선생님','실과 선생님','영양 선생님','사회 선생님','국어 선생님','보건 선생님','체육 선생님','원예부 학생','과학탐구부 학생','동물돌봄부 학생','게임동아리 학생','방송봉사부 학생'];
  for(const role of roles)assert.ok(school.includes("role:'"+role+"'"),'missing school role '+role);
  for(const id of ['minji','junho','haneul','doyun','sora','nari','minseok','yuna','woojin','seoyeon','taeho','hyunwoo']){
    assert.ok(school.includes(id+":{id:'"),'missing school life quest '+id);
  }
  assert.match(school,/minji:\{id:'math-market-budget'/);
  assert.match(school,/clerk:\{name:'서준',kind:'student'/);
  assert.match(school,/visitor:\{name:'교류 학생',kind:'student'/);
  assert.match(economy,/schoolQuests:/);
  assert.match(economy,/data-school-quest/);
  assert.match(economy,/data-school-answer/);
  assert.match(economy,/data-school-turnin/);
  assert.match(economy,/function finishSchoolQuest/);
  assert.match(city,/schoolInteractionLabel/);
  assert.match(city,/오늘의 학교생활 보기/);
  assert.match(dailyLife,/오늘의 학교생활/);
  assert.match(npcStyle,/SCHOOL_PROFILES/);
  assert.match(interiors,/민지 선생님과 이야기하기/);
});

test('Seed School is a walk-in campus with a classroom and shared school-day routines',()=>{
  assert.match(grid,/cityCivic:\{id:'cityCivic',name:'씨앗마을 · 학교\/도서관'/);
  assert.match(city,/\['school',CITY_ASSET\.school/);
  assert.match(city,/씨앗학교 들어가기/);
  assert.match(city,/school-yard/);
  assert.match(city,/schoolGate/);
  assert.match(city,/schoolYard/);
  assert.match(interiors,/school:'venue-school'/);
  assert.match(interiors,/async function buildSchool\(\)/);
  assert.match(interiors,/school-desk-/);
  assert.match(interiors,/내 자리에서 수업 준비하기/);
  assert.match(interiors,/function syncSchoolActors\(\)/);
  for(const id of ['minji','yuna','woojin','seoyeon','taeho','hyunwoo'])assert.ok(interiors.includes("['"+id+"'"),'missing classroom NPC '+id);
  for(const file of ['desk.glb','chair-desk.glb','bookcase-open.glb','bathroom-cabinet.glb','table.glb','bench.glb']){
    assert.ok(fs.existsSync(path.join(root,'assets','game','3d','interiors','kenney-furniture-kit',file)),'missing school furniture '+file);
  }
  for(const id of ['minji','junho','haneul','taeho','doyun','sora','nari','minseok','yuna','woojin','seoyeon','hyunwoo']){
    const line=residents.match(new RegExp(id+":\\{[^\\n]+"))?.[0]||'';
    assert.ok(line.includes('schoolGate')||line.includes('schoolYard'),'school routine missing '+id);
  }
  assert.match(residents,/if\(key==='schoolYard'\|\|key==='schoolGarden'\)key='schoolGate'/);
  assert.match(runtime,/school:\{x:-7\.3,z:45\.45\}/);
  assert.match(runtime,/school:\{x:-7\.3,z:46\.0,name:'씨앗학교'\}/);
  assert.match(economy,/function schoolSchedule\(\)/);
  assert.match(economy,/data-city-travel="school"/);
  assert.match(runtime,/schoolSchedule:\(\)=>townEconomy\?\.schoolSchedule/);
  assert.match(runtime,/getGameTime:\(\)=>prog\(\)\.survival\.time/);
});

test('Seed Town residents follow routines, chat, avoid buildings and go home',()=>{
  assert.match(city,/createResidentLife/);
  assert.match(city,/getDailyState/);
  assert.match(city,/npcBlockers/);
  assert.match(city,/isBlocked:isNpcBlocked/);
  assert.match(residents,/const ROUTINES=/);
  for(const id of ['minji','junho','haneul','taeho','doyun','sora','nari','minseok','yuna','woojin','seoyeon','hyunwoo'])assert.ok(residents.includes(id+':{wake:'),'missing routine '+id);
  for(const state of ['GO_TO_POI','USE_POI','CHATTING','GO_HOME','HOME'])assert.ok(residents.includes("'"+state+"'"),'missing life state '+state);
  assert.match(residents,/weather==='rain'\|\|weather==='fog'/);
  assert.match(residents,/coveredPlaza/);
  assert.match(residents,/if\(!isBlocked\?\.\(nx,nz\)\)/);
  assert.match(residents,/n\.partnerId=best\.id/);
  assert.match(city,/makeLabel\('💬'/);
  assert.match(city,/userData\.setText/);
  assert.match(residents,/CHAT_LINES\[serial%CHAT_LINES\.length\]/);
  assert.match(city,/home-minji/);
  assert.match(city,/home-hyunwoo/);
});

test('Today in Seed Town changes daily content without blocking progression',()=>{
  assert.match(runtime,/createDailyLife/);
  assert.match(runtime,/dailyLife=await createDailyLife/);
  assert.match(runtime,/dailyLife\?\.sync/);
  assert.match(runtime,/dailyBoard:\(\)=>dailyLife/);
  assert.match(runtime,/dailyVisitor:\(\)=>dailyLife/);
  assert.match(runtime,/shell:'조개껍데기'/);
  assert.match(daily,/requestSeed/);
  assert.match(daily,/visitorSeed/);
  assert.match(daily,/visitor/);
  assert.match(dailyLife,/function shuffle\(list,rng\)/);
  assert.match(dailyLife,/message-bottle/);
  assert.match(dailyLife,/sparkle-ground/);
  assert.match(dailyLife,/오늘의 학교생활/);
  assert.match(dailyLife,/townEconomy\.addFriendship/);
  assert.match(city,/오늘의 학교생활 보기/);
  assert.match(city,/오늘의 교류 학생과 이야기하기/);
  assert.match(economy,/const DAILY_DEAL_POOL=/);
  assert.match(economy,/오늘 특가/);
  assert.match(economy,/shell:7/);
  for(const essential of ['seedPotato','seedCarrot','axe','pick'])assert.ok(economy.includes(essential+':{'),'essential progression item removed '+essential);
});

test('starter loop cannot deadlock on a fresh save',()=>{
  for(const id of ['starter-wood-1','starter-wood-6','starter-stone-1','starter-stone-6'])assert.ok(runtime.includes(id),id);
  assert.match(runtime,/떨어진 나뭇가지 줍기/);
  assert.match(runtime,/작은 돌 줍기/);
  assert.match(runtime,/도구 없이 주웠어요/);
  assert.match(runtime,/초보자 보급 상자 열기/);
  assert.match(runtime,/canCarryBundle\(\{wood:5,stone:5\}\)/);
  assert.match(runtime,/addInventoryItem\('wood',5/);
  assert.match(runtime,/addInventoryItem\('stone',5/);
  assert.match(runtime,/starterKitClaimed/);
  assert.match(storage,/starterKitClaimed:false/);
});

test('Seed Town gives named residents diverse role-matched 3D NPC assets',()=>{
  const files=[
    'Casual_Female.gltf','Worker_Male.gltf','Chef_Female.gltf','Casual2_Male.gltf',
    'Suit_Male.gltf','Suit_Female.gltf','Doctor_Female_Young.gltf','OldClassy_Male.gltf',
    'Casual3_Female.gltf','Cowboy_Male.gltf','Casual2_Female.gltf','Casual_Male.gltf'
  ];
  for(const file of files){
    assert.ok(fs.existsSync(path.join(root,'assets','game','npcs','glTF',file)),'missing '+file);
    assert.ok(npcStyle.includes(file),'resident visual missing '+file);
  }
  assert.ok(fs.existsSync(path.join(root,'assets','game','shops','market','character-employee.glb')));
  assert.match(npcStyle,/character-employee\.glb/);
  for(const name of ['민지','준호','하늘','도윤','유나','태호','소라','현우','나리','우진','서연','민석']){
    assert.ok(school.includes("name:'"+name+"'"),'school NPC profile missing '+name);
  }
  assert.match(school,/clerk:\{name:'서준',kind:'student'/);
  assert.match(city,/residentVisual\(id\)/);
  assert.match(city,/Number\(visual\.height\)\|\|1\.82/);
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
  for(const label of ['씨앗마트','튼튼 철물점','하늘 카페','키즈 아케이드','씨앗학교','마을 도서관','튼튼 보건소']){
    assert.ok(city.includes(label),'venue missing '+label);
  }
});

test('Seed World uses Quaternius staged crops and distinct CC0 town buildings',()=>{
  assert.match(runtime,/FBXLoader/);
  for(const crop of ['Carrot_1.fbx','Carrot_4.fbx','Tomato_1.fbx','Tomato_4.fbx','Corn_1.fbx','Corn_4.fbx','Pumpkin_1.fbx','Pumpkin_4.fbx']){
    assert.ok(runtime.includes(crop),'missing staged crop '+crop);
    assert.ok(fs.existsSync(path.join(root,'assets','game','crops','FBX',crop)),'missing crop asset '+crop);
  }
  for(const fruit of ['Apple_Crop.fbx','Apple_Harvested.fbx','Orange_Crop.fbx','Orange_Harvested.fbx']){
    assert.ok(runtime.includes(fruit),'missing orchard asset '+fruit);
    assert.ok(fs.existsSync(path.join(root,'assets','game','crops','FBX',fruit)),'missing orchard asset '+fruit);
  }
  for(const building of ['1Story_Sign_Mat.fbx','1Story_GableRoof_Mat.fbx','2Story_Columns_Mat.fbx','2Story_Balcony_Mat.fbx','1Story_RoundRoof_Mat.fbx']){
    assert.ok(city.includes(building),'town building not wired '+building);
    assert.ok(fs.existsSync(path.join(root,'assets','game','buildings','Models with Materials','FBX',building)),'missing town building '+building);
  }
});

test('home interior kit uses tracked architecture plus bakery and restaurant assets without changing furniture behavior keys',()=>{
  for(const file of ['stove-multi-decorated.glb','kitchencounter-sink-backsplash.glb','kitchencounter-straight-a-decorated.glb','fridge-a-decorated.glb']){
    assert.ok(furnishing.includes(file),'functional kitchen asset not wired '+file);
    assert.ok(fs.existsSync(path.join(root,'assets','game','3d','bakery','restaurant-bits',file)),'missing kitchen asset '+file);
  }
  for(const file of ['wall-window-slide.glb','rug-doormat.glb','lamp-wall.glb']){
    assert.ok(interiorKit.includes(file),'home architecture not wired '+file);
    assert.ok(fs.existsSync(path.join(root,'assets','game','3d','interiors','kenney-furniture-kit',file)),'missing home architecture '+file);
  }
  for(const file of ['curtains.glb','wall-shelf-bakery-a.glb','wall-shelf-bakery-b.glb']){
    assert.ok(interiorKit.includes(file),'home decor not wired '+file);
    assert.ok(fs.existsSync(path.join(root,'assets','game','3d','bakery','interior',file)),'missing home decor '+file);
  }
  for(const key of ['kitchenStove','kitchenSink','kitchenCabinet','kitchenFridge'])assert.ok(furnishing.includes(key),'functional key changed '+key);
  assert.match(runtime,/homeInteriorRuntime\?\.setLevel/);
  assert.match(interiorKit,/addKitchenInset/);
});

test('Seed Town market hardware and cafe are walk-in 3D interiors',()=>{
  assert.match(runtime,/buildVenueInteriors/);
  assert.match(runtime,/VENUE_MODES/);
  assert.match(runtime,/function enterVenue\(kind\)/);
  assert.match(runtime,/function exitVenue\(\)/);
  for(const id of ['market','hardware','cafe'])assert.ok(interiors.includes(id+":"),'missing venue '+id);
  for(const label of ['씨앗마트 들어가기','튼튼 철물점 들어가기','하늘 카페 들어가기'])assert.ok(city.includes(label),'missing door '+label);
  const required=[
    ['shops','market','shelf-boxes.glb'],['shops','market','freezers-standing.glb'],['shops','market','cash-register.glb'],
    ['3d','survival','kenney-survival-kit','workbench.glb'],['3d','survival','kenney-survival-kit','workbench-anvil.glb'],
    ['3d','bakery','interior','counter-table.glb'],['3d','bakery','interior','display-case-long.glb'],['3d','bakery','interior','coffee-machine.glb']
  ];
  for(const parts of required)assert.ok(fs.existsSync(path.join(root,'assets','game',...parts)),'missing venue asset '+parts.join('/'));
  assert.match(interiors,/actions\.shop\('market','민지 선생님'\)/);
  assert.match(interiors,/actions\.shop\('hardware','준호 선생님'\)/);
  assert.match(interiors,/actions\.shop\('cafe','하늘 선생님'\)/);
});

test('walk-in venues keep social loops, animated merchants, themed density and bounded cafe rest',()=>{
  assert.match(interiors,/built=new Set\(\),buildPromises=\{\}/);
  assert.match(interiors,/async function show\(kind\)/);
  assert.match(interiors,/AmbientLight/);
  assert.match(interiors,/PointLight/);
  assert.match(interiors,/cloneSkeleton\(gltf\.scene\)/);
  assert.match(interiors,/merchantMixers/);
  assert.match(runtime,/venueInteriors\?\.update\?\.\(dt\)/);
  assert.match(runtime,/loadGLTF,prepModel/);
  assert.match(interiors,/market-shelf-boxes-b/);
  assert.match(interiors,/hardware-wall-hammer/);
  assert.match(interiors,/cafe-wall-window-a/);
  assert.match(interiors,/cafe-floor-tile/);
  assert.match(interiors,/mug-b-stacked\.glb/);
  for(const id of ['minji','junho','haneul'])assert.ok(interiors.includes("actions.resident('"+id+"')"),'missing interior resident '+id);
  assert.match(economy,/residentServiceLabel/);
  assert.match(economy,/getVenue\?\.\(\)===r\.service/);
  assert.match(economy,/enterVenue\(r\.service\)/);
  assert.match(economy,/function cafeRest\(\)/);
  assert.match(economy,/cafeRestDay===day/);
  assert.match(economy,/benchRestDay===day/);
  assert.match(runtime,/enterVenue,getVenue:\(\)=>activeVenue/);
  assert.match(runtime,/cafeRest:\(\)=>townEconomy\?\.cafeRest\?\.\(\)/);
});

test('shop interior props keep service items off the floor and away from cutaway walls',()=>{
  assert.match(interiors,/VENUE_BOUNDS=\{x1:-5\.15,x2:5\.15,z1:-3\.62,z2:3\.62\}/);
  assert.ok(interiors.includes("MARKET+'cash-register.glb',{x:3.18,y:.94,z:1.48"),'market register must sit on the counter');
  assert.ok(interiors.includes("BAKERY+'coffee-machine.glb',{x:1.85,y:.91,z:-2.05"),'coffee machine must sit on the counter');
  assert.ok(interiors.includes("BAKERY+'cash-register.glb',{x:.70,y:.91,z:-2.05"),'cafe register must sit on the counter');
  assert.ok(interiors.includes("BAKERY+'cookie-jar.glb',{x:-1.88,y:.92,z:-1.75"),'cafe small props must sit on furniture');
  assert.doesNotMatch(interiors,/x:4\.35,z:2\.65/);
  assert.doesNotMatch(interiors,/resource-wood\.glb/);
});

test('fishing cannot queue multiple delayed catches from rapid input',()=>{
  assert.match(runtime,/let fishingBusy=false/);
  assert.match(runtime,/if\(fishingBusy\)/);
  assert.match(runtime,/fishingBusy=true/);
  assert.match(runtime,/finally\{fishingBusy=false\}/);
  assert.match(runtime,/const added=addInventoryItem\('fish',gain,\{silent:true\}\)/);
  assert.match(runtime,/if\(!added\).*가방이 가득/s);
});

test('rest and gather loops cannot generate unlimited free recovery or mushrooms',()=>{
  assert.match(runtime,/function restAtCamp\(\)/);
  assert.match(runtime,/if\(s\.hunger<4\)/);
  assert.match(runtime,/s\.time=next%1440/);
  assert.match(runtime,/bookcaseReadDay===day/);
  assert.match(runtime,/const MUSHROOM_RESPAWN_MS=30000/);
  assert.match(runtime,/function addMushroomPatch\(id,x,z\)/);
  assert.match(runtime,/prog\(\)\.groundPickups\[id\]=nextAt/);
  assert.match(runtime,/scheduleGroundPickup\(actor,MUSHROOM_RESPAWN_MS\)/);
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
  assert.match(city,/schoolInteractionLabel\(id\)/);
  assert.match(school,/minseok:\{name:'민석',kind:'teacher',role:'체육 선생님'/);
  assert.match(city,/getMinutes:\(\)=>typeof getGameTime==='function'\?getGameTime\(\):720/);
  assert.match(residents,/const ROUTINES=\{/);
  assert.match(residents,/minseok:\{wake:6\.5,sleep:22/);
  assert.match(residents,/minseok:.*schoolYard/s);
  assert.match(residents,/minseok:.*schoolGate/s);
});



test('Seed Town is connected into the continuous World v3 map and current cache',()=>{
  assert.match(runtime,/WORLD_GRID,WORLD_BOUNDS,CITY_BOUNDS,ROAD_X,ROAD_Z,zoneAt,isCityArea,isTravelCorridor,footprintTouchesRoad/);
  assert.match(runtime,/buildKidscadeCity/);
  assert.match(runtime,/cityRuntime\?\.update\?\.\(now,dt\)/);
  assert.match(runtime,/createTownEconomy/);
  assert.match(runtime,/kidscade-world-city\.js\?v=\d+/);
  assert.match(runtime,/kidscade-world-grid\.js\?v=\d+/);
  assert.match(runtime,/kidscade-world-economy\.js\?v=\d+/);
  assert.match(runtime,/kidscade-world-furnishing\.js\?v=\d+/);
  assert.match(runtime,/kidscade-world-interior-kit\.js\?v=\d+/);
  assert.match(runtime,/kidscade-world-audio\.js\?v=\d+/);
  const runtimeVersion=html.match(/kidscade-world-v3\.js\?v=(\d+)/)?.[1];
  const integrationVersion=integration.match(/world-v3\/kidscade-world\.html\?v=(\d+)/)?.[1];
  assert.ok(runtimeVersion,'world-v3 HTML must version its runtime');
  assert.equal(integrationVersion,runtimeVersion,'world overlay and runtime cache versions must stay aligned');
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
  assert.match(furnishing,/가구 창고 · 집 꾸미기/);
  assert.match(runtime,/canPlaceFurniture/);
  assert.match(furnishing,/FURNITURE_CATALOG/);
  assert.match(furnishing,/data-furnish-rotate/);
  assert.match(furnishing,/data-furnish-confirm/);
  assert.match(furnishing,/data-furnish-cancel/);
  assert.match(furnishing,/data-furn-move/);
  assert.match(furnishing,/data-furn-wallfit/);
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


test('fresh homes no longer contain the retired auto-furnishing path',()=>{
  assert.doesNotMatch(furnishing,/function migrateDefaultLayout/);
  assert.doesNotMatch(furnishing,/function migrateFunctionalLayout/);
  assert.doesNotMatch(furnishing,/function claimStarterGift/);
  assert.doesNotMatch(furnishing,/data-furn-craft/);
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
  assert.doesNotMatch(furnishing,/function migrateFunctionalLayout/);
  assert.match(runtime,/const CARPENTER_RECIPES=/);
  assert.match(runtime,/kidscade:open-avatar-studio/);
  assert.match(runtime,/hasPlacedFurniture\('kitchenSink'\)/);
});

test('named Seed Town residents expose roles services friendship milestones and exclusive rewards',()=>{
  for(const id of ['minji','junho','haneul','doyun','yuna','taeho','sora','hyunwoo','nari','woojin','seoyeon','minseok']){
    assert.ok(school.includes(id+":{name:'"),'school resident profile missing '+id);
    assert.ok(economy.includes("Object.entries(SCHOOL_PROFILES)"),'economy must derive residents from school profiles');
    assert.ok(economy.includes(id+':['),'friendship reward track missing '+id);
    assert.ok(city.includes("addNpc(npcCtx,'"+id+"'"),'city NPC missing '+id);
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
  assert.match(runtime,/river:\{x:-12,z:-18\.0,name:'북쪽 강가'\}/);
});

test('friendship level 12 grants resident-exclusive tracked 3D furniture',()=>{
  const rewards=[
    ['minjiPlanter','plant-small3.glb'],['junhoStool','stool-bar-square.glb'],
    ['haneulTable','table-round-a.glb'],['doyunBench','bench-cushion.glb'],
    ['yunaPlant','plant-small2.glb'],['taehoRetroTv','television-vintage.glb'],
    ['soraBookcase','bookcase-closed-wide.glb'],['hyunwooDrawers','side-table-drawers.glb'],
    ['nariLamp','lamp-square-floor.glb'],['woojinRelaxChair','lounge-chair-relax.glb'],
    ['seoyeonPetChair','chair-rounded.glb'],['minseokTravelBench','bench-cushion-low.glb']
  ];
  for(const [key,file] of rewards){
    assert.ok(furnishing.includes(key),'rare reward missing '+key);
    assert.ok(furnishing.includes(file),'rare reward asset missing '+file);
    const assetPath=key==='haneulTable'
      ? path.join(root,'assets','game','3d','bakery','interior',file)
      : path.join(root,'assets','game','3d','interiors','kenney-furniture-kit',file);
    assert.ok(fs.existsSync(assetPath),'untracked reward asset '+file);
  }
  assert.match(runtime,/key==='taehoRetroTv'/);
  assert.match(runtime,/key==='soraBookcase'/);
});




test('World v3 road-first grid keeps the core town plus museum district connected',()=>{
  assert.match(grid,/export const CELL_SIZE=20/);
  assert.match(grid,/export const ROAD_WIDTH=4/);
  assert.match(grid,/export const CELL_PITCH=CELL_SIZE\+ROAD_WIDTH/);
  assert.match(grid,/CITY_BOUNDS=\{x1:-22,x2:46,z1:14,z2:58\}/);
  for(const id of ['cityMarket','cityLeisure','cityCivic','cityTransit','museum','residentialSouth','residentialNorth'])assert.ok(grid.includes(id+':{id:'),'missing city square '+id);
  assert.match(city,/city-road-mid-horizontal/);
  assert.match(city,/city-road-museum/);
  assert.match(city,/city-road-mid-vertical/);
  assert.match(city,/city-road-south/);
  assert.match(city,/market-fruit/);
  assert.match(city,/market-register/);
  assert.match(city,/transport-corner/);
  assert.match(city,/validateMapLayout/);
  assert.doesNotMatch(city,/traffic-light\.glb/);
});


test('Seed World landscape visually connects nature districts and softens the rigid grid',()=>{
  assert.match(runtime,/buildWorldLandscape\(\{parent:outdoor,addModel,box,plane\}\)/);
  assert.match(runtime,/kidscade-world-landscape\.js\?v=1/);
  assert.match(landscape,/bridge-wood-narrow\.glb/);
  assert.match(landscape,/tree-palm-detailed-tall\.glb/);
  assert.match(landscape,/tent-detailed-open\.glb/);
  assert.match(landscape,/waterShape/);
  assert.match(landscape,/softenedRoads:true/);
  assert.match(landscape,/connectedRiver:true/);
});

test('east Seed Town has twelve real resident homes with doorstep lanes and pocket park',()=>{
  assert.equal((city.match(/\['(?:minji|junho|haneul|taeho|yuna|woojin|seoyeon|hyunwoo|doyun|sora|nari|minseok)'/g)||[]).length>=12,true);
  assert.match(city,/const homeDefs=\[/);
  assert.match(city,/resident-home-/);
  assert.match(city,/residentHomes\[id\]=door/);
  assert.match(city,/residential-pocket-park/);
  for(const id of ['minji','junho','haneul','taeho','yuna','woojin','seoyeon','hyunwoo','doyun','sora','nari','minseok']){
    assert.ok(city.includes("'home-"+id+"':{...residentHomes."+id),'missing real home POI '+id);
  }
});

test('world map is a spatial four-by-four map instead of a flat travel button list',()=>{
  assert.match(runtime,/const WORLD_MAP_META=\{/);
  assert.match(runtime,/const xs=\[-36,-12,12,36\],zs=\[48,24,0,-24\]/);
  assert.match(runtime,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(runtime,/현재 위치/);
  assert.match(runtime,/미발견 지역/);
  assert.match(runtime,/residentialSouth:\{icon:'🏘️',travel:'residential'\}/);
  assert.match(runtime,/residentialNorth:\{icon:'🌳',travel:'residentialNorth'\}/);
});

test('resident AI movement keeps interaction anchors attached inside the new city squares',()=>{
  assert.match(city,/interaction:null/);
  assert.match(city,/function bind\(id,r,label,action\)/);
  assert.match(residents,/n\.interaction\.x=n\.object\.position\.x/);
  assert.match(residents,/n\.interaction\.z=n\.object\.position\.z/);
  assert.match(residents,/function routineTarget\(id,hour,weather,pois\)/);
  assert.match(residents,/yuna:\{wake:6\.5,sleep:21\.5/);
  assert.match(residents,/woojin:\{wake:8,sleep:23/);
  assert.match(residents,/seoyeon:\{wake:7,sleep:21\.8/);
  assert.match(city,/plazaWest:\{x:leisure\.x-4\.0,z:leisure\.z\+4\.0/);
  assert.match(city,/plazaEast:\{x:leisure\.x\+4\.0,z:leisure\.z\+4\.0/);
  assert.match(city,/plazaCenter:\{x:leisure\.x,z:leisure\.z\+3\.4/);
});


test('Cube Pets are separated into home yard ranch and biome habitats',()=>{
  assert.match(runtime,/isCityArea,isTravelCorridor,footprintTouchesRoad/);
  for(const habitat of ['pond','ranch','deep-forest','waterfront'])assert.ok(runtime.includes("habitat:'"+habitat+"'"),'missing habitat '+habitat);
  assert.match(runtime,/pet-yard-sign/);
  assert.match(runtime,/Cube Pets 보기/);
  assert.match(runtime,/Ranch grows physically/);
  assert.match(runtime,/if\(isCityArea\(a\.targetX,a\.targetZ\)\)/);
  assert.match(runtime,/a\.interaction\.x=a\.object\.position\.x/);
  assert.match(runtime,/a\.interaction\.z=a\.object\.position\.z/);
  assert.match(runtime,/const LAYOUT_VERSION=8/);
});

test('regression: NPCs and animals preserve GLB ground offsets instead of sinking or floating',()=>{
  assert.match(city,/model\.position\.x-=center\.x/);
  assert.match(city,/model\.position\.z-=center\.z/);
  assert.match(city,/model\.position\.y-=b\.min\.y/);
  assert.match(city,/const anchor=new THREE\.Group\(\)/);
  assert.match(city,/object:anchor,model/);
  assert.match(residents,/n\.object\.position\.y=n\.groundY\+/);
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
  assert.match(runtime,/box\(outdoor,0,12,92,92,\.24,0x617b54,-\.34\)/);
  assert.match(runtime,/for\(const cell of Object\.values\(WORLD_GRID\)\)/);
  assert.match(runtime,/20,20,\.10,cell\.color,-\.10/);
  assert.doesNotMatch(runtime,/plane\(outdoor,0,5,82,96/);
});

test('resident nameplates are readable role cards while building labels stay proximity based',()=>{
  assert.match(city,/function makeResidentLabel/);
  assert.match(city,/sp\.scale\.set\(1\.92,\.56,1\)/);
  assert.match(city,/depthTest:true/);
  assert.match(city,/visual\.role/);
  assert.match(city,/tag\.visible=false/);
  assert.match(city,/buildingLabels/);
  assert.match(residents,/Math\.hypot\(player\.x-n\.object\.position\.x,player\.z-n\.object\.position\.z\)<5\.6/);
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



test('farm square expands from one to nine reusable plots with six selectable crops',()=>{
  assert.match(runtime,/const CROP_DEF=\{/);
  for(const crop of ['potato','carrot','tomato','strawberry','corn','pumpkin'])assert.ok(runtime.includes(crop+':{name:'),'missing crop '+crop);
  assert.match(runtime,/const plotPos=\[/);
  assert.match(runtime,/\[f\.x-6\.0,f\.z\+1\.1\]/);
  assert.match(runtime,/\[f\.x-\.7,f\.z\+6\.5\]/);
  assert.match(runtime,/data-plant/);
  assert.match(runtime,/무엇을 심을까요/);
  assert.match(runtime,/'밭 '\+\(i\+1\)\+' 살펴보기'/);
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
  assert.match(residents,/n\.mixer\?\.update\(dt\)/);
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


test('residents actually idle between short walks instead of perpetual motion',()=>{
  assert.match(residents,/function stopAt\(n,now\)/);
  assert.match(residents,/n\.moving=false;n\.lifeState=n\.lifeState==='GO_HOME'\?'HOME':'USE_POI'/);
  assert.match(residents,/n\.nextDecision=now\+2800\+/);
  assert.match(residents,/if\(n\.lifeState==='USE_POI'&&now>=n\.nextDecision\)/);
  assert.match(residents,/const waitBias=weather==='rain'\?\.86:\.64/);
  assert.match(residents,/if\(Math\.random\(\)<waitBias\)\{n\.nextDecision=now\+2200\+Math\.random\(\)\*3600;\}/);
  assert.match(residents,/n\.playAnim\?\.\(walking\?'walk':'idle'\)/);
});



test('natural props and wayfinding stay inside parcels and off road gutters',()=>{
  assert.match(runtime,/function isPathClearance\(x,z,w=0,d=0\)\{return footprintTouchesRoad\(x,z,w,d,\.18\)\}/);
  assert.match(runtime,/if\(isPathClearance\(x,z,2\.5,2\.5\)\)continue/);
  assert.match(runtime,/if\(isPathClearance\(x,z,1\.7,1\.6\)\)continue/);
  assert.match(runtime,/const addZoneSign=async\(id,dx,dz,label,rot=0,action=null\)=>/);

  for(const id of ['forest','quarry','waterfront','beach']){
    const match=runtime.match(new RegExp("addZoneSign\\('"+id+"',(-?\\d+(?:\\.\\d+)?),(-?\\d+(?:\\.\\d+)?)"));
    assert.ok(match,'missing zone sign '+id);
    const dx=Number(match[1]),dz=Number(match[2]);
    assert.ok(Math.abs(dx)<=8.5 && Math.abs(dz)<=8.5, id+' sign must remain safely inside its 20m parcel: '+dx+','+dz);
  }
});


test('four city squares use only shared road gutters and centered crosswalks',()=>{
  assert.match(city,/box\(parent,0,36,44,4/);
  assert.match(city,/box\(parent,0,36,4,44/);
  assert.match(city,/box\(parent,0,12,44,4/);
  assert.match(city,/for\(const x of \[-12,12\]\)/);
  assert.match(city,/for\(const z of \[10\.8,11\.55,12\.3,13\.05\]\)/);
  assert.match(city,/for\(const z of \[24,48\]\)/);
  assert.match(runtime,/const LAYOUT_VERSION=8/);
});


test('World v3 has one authoritative 20x20 parcel plus 4m road grid',()=>{
  assert.match(grid,/export const CELL_SIZE=20/);
  assert.match(grid,/export const ROAD_WIDTH=4/);
  assert.match(grid,/export const CELL_PITCH=CELL_SIZE\+ROAD_WIDTH/);
  for(const spec of [
    ["beach",-36,-24],["waterfront",-12,-24],["ranch",12,-24],["orchard",36,-24],
    ["forest",-36,0],["home",-12,0],["farm",12,0],["quarry",36,0],
    ["camp",-36,24],["cityMarket",-12,24],["cityLeisure",12,24],["residentialSouth",36,24],
    ["museum",-36,48],["cityCivic",-12,48],["cityTransit",12,48],["residentialNorth",36,48]
  ]){
    const [id,cx,cz]=spec;
    assert.ok(grid.includes(id+":{id:'"+id+"'"),'missing grid cell '+id);
    assert.ok(grid.includes('cx:'+cx+',cz:'+cz),'wrong center for '+id);
  }
  assert.match(grid,/WORLD_BOUNDS=\{x1:-46,x2:46,z1:-34,z2:58\}/);
  assert.match(runtime,/zoneAt\(player\.x,player\.z\)/);
});

test('Seed Bus exposes ranch orchard and beach districts',()=>{
  assert.match(economy,/data-city-travel="ranch"/);
  assert.match(economy,/data-city-travel="orchard"/);
  assert.match(economy,/data-city-travel="beach"/);
  assert.match(runtime,/ranch:\{x:12,z:-18\.0,name:'목장'\}/);
  assert.match(runtime,/orchard:\{x:36,z:-18\.0,name:'과수원'\}/);
  assert.match(runtime,/beach:\{x:-36,z:-18\.0,name:'해변가'\}/);
});


test('profile Seed World entry replaces legacy garden and main pet navigation',()=>{
  assert.doesNotMatch(indexBase,/id="sidebar-pet-open"/);
  assert.doesNotMatch(indexBase,/id="kc-pet-card"/);
  assert.doesNotMatch(indexBase,/id="pet-widget"/);
  assert.match(indexBase,/id="btn-open-shop"[^>]*data-open-life-world="profile-world"[^>]*>🌱 씨앗 월드</);
  assert.match(uiInfo,/kc-world-title/);
  assert.match(uiInfo,/씨앗 월드/);
  assert.match(integration,/kc-world-meta/);
  assert.doesNotMatch(uiInfo,/kc-pet-card|sidebar-pet-open|pet-widget/);
  assert.match(integration,/if\(openBtn\)openBtn\.remove\(\)/);
  assert.match(seedEntry,/document\.querySelector\('\.kc-seed-house-card'\)\?\.remove\(\)/);
});


test('town jobs now require short playable work sequences',()=>{
  assert.match(economy,/steps:\['빈 진열대 확인하기'/);
  assert.match(economy,/steps:\['컵 물에 불리기'/);
  assert.match(economy,/steps:\['떨어진 쓰레기 줍기'/);
  assert.match(economy,/function jobActivityPanel/);
  assert.match(economy,/data-city-job-step/);
  assert.match(economy,/function advanceJob/);
});


test('market props are individually tracked and no longer share the register footprint',()=>{
  assert.match(city,/track\('market-fruit','decor'/);
  assert.match(city,/track\('market-register','decor'/);
  assert.match(city,/market\.z\+2\.0/);
  assert.doesNotMatch(city,/market-register'\}\),\s*addModel[^\n]*market\.z\+\.1/s);
});


test('Seed Natural Museum tracks source-aware specimens and one-by-one exhibit growth',()=>{
  assert.match(runtime,/createMuseumSystem/);
  assert.match(runtime,/museumRuntime\.syncKnown\(\)/);
  assert.match(runtime,/recordSpecimen\?\.\('fish:'\+place/);
  assert.match(runtime,/museumId:'crop:'\+state\.type/);
  assert.match(runtime,/museumRuntime\?\.discover\?\.\('pet:'\+id/);
  assert.match(runtime,/data-museum-donate/);
  assert.match(runtime,/function removeInventoryItem/);
  assert.match(storage,/museum:\{version:2,discovered:\{\},donated:\{\},records:\{\},specimens:\{\}\}/);
  assert.match(museum,/export const MUSEUM_CATALOG=/);
  assert.match(museum,/function recordSpecimen\(/);
  assert.match(museum,/function consumeItem\(/);
  assert.match(museum,/donatedIds/);
  assert.match(museum,/ITEM_ENTRY_LISTS/);
  assert.match(interiors,/museum:'venue-museum'/);
  assert.match(interiors,/museum-aquarium/);
  assert.match(interiors,/museumSlots/);
  assert.match(interiors,/museum-slot-/);
  assert.match(interiors,/donated=new Set\(summary\.donatedIds/);
  assert.match(interiors,/syncMuseumDisplays/);
  assert.match(dailyLife,/function bugMesh\(\)/);
  assert.match(dailyLife,/🪲 곤충 잡기/);
  assert.match(dailyLife,/museumId:'nature:mushroom'/);
  assert.match(city,/씨앗 자연박물관/);
  assert.match(city,/\['museum',museum\.x,museum\.z-\.55/);
  assert.match(grid,/museum:\{id:'museum',name:'씨앗 자연박물관',cx:-36,cz:48/);
  assert.match(runtime,/museum:\{x:-36,z:52\.0,name:'씨앗 자연박물관'\}/);
});
