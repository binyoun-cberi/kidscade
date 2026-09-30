const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','high_apocalypse_survival');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const js=fs.readFileSync(path.join(dir,'game.js'),'utf8');
const css=fs.readFileSync(path.join(dir,'style.css'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
const home=fs.readFileSync(path.join(root,'index_base.html'),'utf8');

test('apocalypse survival module parses and loads Kidscade shell',()=>{
  const stripped=js.replace(/^import .*$/gm,'');
  const r=spawnSync(process.execPath,['--check'],{input:stripped,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr||r.stdout);
  assert.match(html,/kidscade-game-sdk\.js/);
  assert.match(html,/data-game-id="high_apocalypse_survival"/);
  assert.match(html,/type="importmap"/);
  assert.match(html,/game\.js\?v=21/);
});

test('seven-day science and social survival loop is wired',()=>{
  for(const day of [1,2,3,4,5,6,7])assert.match(js,new RegExp('\\n '+day+':\\{title:'));
  for(const id of ['waterRisk','boiling','chemicalPollution','combustion','insulation','plantGrowth','foodPreservation','waterTreatment','ruinSafety','vibrationRisk','electricity','division','logistics','scarcity','community','riverSettlement','flood'])assert.ok(js.includes("'"+id+"'"),id);
  for(const id of ['campfire','shelter','workbench','farm','cooler','purifier'])assert.ok(js.includes(id),id);
  assert.match(js,/chooseDistribution/);
  assert.match(js,/readyFlood/);
  assert.match(js,/repairPower/);
  assert.match(js,/assignJob/);
  assert.match(js,/floodLevel/);
  assert.match(js,/currentObjective/);
  assert.match(js,/samplePollutedWater/);
  assert.match(js,/updateNpc/);
  assert.match(js,/terrainHeight/);
  assert.match(js,/blockedAt/);
  assert.match(js,/ruinShell/);
  assert.match(js,/lootRuin/);
  assert.match(js,/residentCount/);
  assert.match(js,/jobPower/);
  assert.match(js,/updateFarms/);
  assert.match(js,/spoilFood/);
  assert.match(js,/powerUse/);
  assert.match(js,/togglePowerLoad/);
  assert.match(js,/settlementSteps/);
  assert.match(js,/continueSettlement/);
  assert.match(js,/createSkyDome/);
  assert.match(js,/decorateWorld/);
  assert.match(js,/const TUTORIAL=/);
  assert.match(js,/tutorialSignal/);
  assert.match(js,/tutorialActive/);
  assert.match(js,/repairAchromaticModel/);
  assert.match(js,/updatePlayerVisual/);
  assert.match(js,/upgradePerson/);
  assert.match(js,/character-male-a\.glb/);
  assert.match(js,/road-bridge\.glb/);
  assert.match(js,/ambulance\.glb/);
  assert.match(js,/player\.wishDir\.addScaledVector\(right,x\)\.addScaledVector\(forward,-y\)/);
  assert.match(js,/groundColor/);
  assert.match(js,/makeRiverGeometry/);
  assert.match(js,/cameraBlocked/);
  assert.match(js,/resolveCamera/);
  assert.match(js,/updateInteriorVisibility/);
  assert.match(js,/wall-doorway-wide-square\.glb/);
  assert.match(js,/road-crossroad-line\.glb/);
  assert.match(js,/fence-1x4\.glb/);
  assert.match(js,/tree-pine-tall-a\.glb/);
  assert.match(js,/phase:'survival'/);
  assert.match(js,/finish\(\)/);
});

test('tracked Kidscade 3D assets used by the survival map exist',()=>{
  const packs=[
    ['assets/game/3d/survival/kenney-survival-kit',['tree.glb','rock-a.glb','campfire-pit.glb','structure.glb','workbench.glb','patch-grass-large.glb','chest.glb','barrel.glb','tent-canvas.glb','box-large.glb']],
    ['assets/game/characters/people',['character-female-a.glb','character-male-a.glb','character-female-d.glb','character-male-d.glb','character-male-b.glb','character-female-b.glb','character-female-c.glb']],
    ['assets/game/3d/city/kenney-city-kit-roads',['road-bridge.glb','road-straight.glb','road-crossroad-line.glb','traffic-light.glb','electricity-pole.glb','construction-barrier.glb']],
    ['assets/game/3d/city/kenney-city-kit-suburban',['fence-1x4.glb','path-stones-long.glb','path-stones-messy.glb']],
    ['assets/game/3d/buildings/kenney-building-kit',['wall-doorway-wide-square.glb','wall-window-wide-square-detailed.glb','wall-window-square-detailed.glb','door-rotate-square-b.glb']],
    ['assets/game/3d/vehicles/kenney-car-kit',['ambulance.glb','sedan.glb','van.glb','suv.glb','debris-tire.glb']],
    ['assets/game/3d/nature/kenney-nature-kit',['fence-gate.glb','canoe.glb','cliff-large-rock.glb','tree-pine-tall-a.glb','plant-bush-large.glb','rock-small-c.glb']],
    ['assets/game/3d/city/poly-pizza-city-pack',['big-building.glb','bench.glb','bus-stop.glb','dumpster.glb','building-green.glb','brown-building.glb']]
  ];
  for(const [dir,files] of packs)for(const file of files)assert.ok(fs.existsSync(path.join(root,dir,file)),'missing '+dir+'/'+file);
  assert.match(js,/kenney-survival-kit/);
  assert.match(js,/renderAvatarSVG/);
});

test('game is registered in catalog metadata v21',()=>{
  const game=catalog.games.find(g=>g.id==='high_apocalypse_survival');
  assert.ok(game,'catalog entry missing');
  assert.equal(game.href,'games/high_apocalypse_survival/index.html?v=21');
  assert.equal(game.subject,'science');
  assert.equal(game.genre,'sandbox');
  assert.ok(game.players.includes('solo'));
  assert.ok(game.input.includes('keyboard'));
  assert.ok(game.input.includes('touch'));
});

test('responsive classroom UI exposes survival tablet and mobile controls',()=>{
  for(const text of ['생존 도감','지도','정착지','공동체 의사결정','멸망 7일째','정착지 계속 운영','tutorialCoach','건너뛰기'])assert.ok(html.includes(text),text);
  assert.match(css,/\.tutorial-coach/);
  assert.match(css,/\.mobile-move/);
  assert.match(css,/@media/);
});


test('apocalypse survival uses the shared 3D asset catalog for the map art rework',()=>{
  assert.match(js,/shared-community-3d\.js/);
  for(const id of ['nature.commonTreeA','nature.pineTreeA','prop.waterTower','prop.well','prop.woodLog']) assert.match(js,new RegExp(id.replace(/\./g,'\\.')));
  assert.match(html,/game\.js\?v=21/);
  assert.match(catalog.games.find(g=>g.id==='high_apocalypse_survival').href,/\?v=21$/);
});


test('apocalypse repairs achromatic assets and renders a real 3D survivor player',()=>{
  assert.match(js,/shared3DCanUse/);
  assert.match(js,/shared3DRepairPreset/);
  assert.match(js,/normalizeShared/);
  assert.match(js,/recolorShared/);
  assert.match(js,/schoolBus/);
  assert.match(js,/ruinedHouse/);
  assert.match(js,/placeSharedWorldModel\('vehicle\.schoolBus'/);
  assert.match(js,/placeSharedWorldModel\('building\.house'/);
  assert.match(js,/currentAvatarSource/);
  assert.match(js,/kidscade-avatar-studio-preview/);
  assert.match(js,/repairAchromaticModel/);
  assert.match(js,/genericPalette/);
  assert.match(js,/playerModelFile/);
  assert.match(js,/character-female-a\.glb/);
  assert.match(js,/character-male-d\.glb/);
  assert.match(js,/makeSurvivorFallback/);
  assert.doesNotMatch(js,/new THREE\.Sprite\(new THREE\.SpriteMaterial\(\{map:t/);
  assert.doesNotMatch(js,/placeSharedWorldModel\('animal\.deer'/);
});


test('apocalypse v21 uses clustered scenery and disables tiny decor shadows',()=>{
  assert.match(js,/function scatterSharedCluster/);
  assert.match(js,/shadow:true/);
  assert.match(js,/shadow:!\/grass\|plant\|mushroom/);
  assert.match(js,/scatterSharedCluster\(-45,36/);
  assert.match(html,/game\.js\?v=21/);
});

test('boot bindings use selector lists rather than single-element helpers',()=>{
  assert.match(js,/document\.querySelectorAll\('#hotbar button'\)\.forEach/);
  assert.match(js,/document\.querySelectorAll\('#panel nav button'\)\.forEach/);
  assert.match(js,/document\.querySelectorAll\('#decision \[data-choice\]'\)\.forEach/);
  assert.doesNotMatch(js,/(^|[^$])\$\([^)]*\)\.(forEach|map|filter|some|every|find)\b/m);
});


test('third-person camera and deterministic city lots are enforced',()=>{
  assert.match(js,/camPitch=\.31,camDist=6\.8/);
  assert.match(js,/screenForward=orbit\.clone\(\)\.multiplyScalar\(-1\)/);
  assert.match(js,/addScaledVector\(screenRight,\.58\)/);
  assert.match(js,/minDist=2\.75/);
  assert.match(js,/player\.root\.add\(player\.visual\)/);
  assert.match(js,/CircleGeometry\(\.62,20\)/);
  assert.match(js,/artFootprints/);
  assert.match(js,/footprintOverlaps/);
  assert.match(js,/reserveFootprint/);
  assert.match(js,/placeWorldModelSafe/);
  assert.match(js,/cityBuilding/);
  assert.match(js,/road-crossroad-path\.glb/);
  assert.match(js,/MARKET_POS/);
  assert.match(js,/CLINIC_POS/);
  assert.match(js,/GARAGE_POS/);
  assert.match(js,/m\.visible=false/);
  assert.match(js,/updateWorldLabels/);
});


test('game feel layer provides audio, impact feedback and living residents',()=>{
  for(const token of ['ensureAudio','noiseHit','sfx','spawnImpact','updateFx','updateAudio','cameraKick','residentActivity','residentTarget','updateBuildingFx'])assert.match(js,new RegExp(token));
  assert.match(js,/sfx\('step'\)/);
  assert.match(js,/sfx\(t==='tree'\?'chop':t==='rock'\?'mine':'pickup'\)/);
  assert.match(js,/PointLight\(0xff9b4a,2\.4,11,2\)/);
  assert.match(js,/powerIndicator/);
  assert.match(js,/function updateNpc\(dt\)/);
  assert.match(js,/speed\*dt/);
  assert.match(js,/fovTarget=player\.speed>7\?59:55/);
  assert.match(css,/\.interact\.pop/);
  assert.match(css,/\.resident-row span small/);
});


test('controller architecture follows the reference projects without regressing classroom controls',()=>{
  assert.match(js,/velocity:new THREE\.Vector3\(\)/);
  assert.match(js,/wishDir:new THREE\.Vector3\(\)/);
  assert.match(js,/locomotion:'idle'/);
  assert.match(js,/function setLocomotion/);
  assert.match(js,/function dampAngle/);
  assert.match(js,/function tryPlayerMove/);
  assert.match(js,/player\.velocity\.x=damp/);
  assert.match(js,/sprinting&&player\.speed>5\.8\?'sprint':'walk'/);
  assert.match(js,/circleAabbHit/);
  assert.match(js,/segmentAabbT/);
  assert.match(js,/interactionLineClear/);
  assert.match(js,/facing<-\.18/);
});

test('resident simulation is schedule-driven and settlement metrics come from live world state',()=>{
  assert.match(js,/const JOB_SCHEDULES=/);
  assert.match(js,/function residentSchedule/);
  assert.match(js,/function settlementMetrics/);
  assert.match(js,/function residentTryStep/);
  assert.match(js,/detourSide/);
  assert.match(js,/stuck=\(n\.userData\.stuck\|\|0\)\+dt/);
  assert.match(js,/resilience=Math\.round/);
  assert.match(js,/생활 압박/);
  assert.match(css,/\.settlement-metrics/);
  assert.match(css,/\.settlement-bars/);
});


test('road graph and ruined interiors form a navigable exploration layer',()=>{
  assert.match(js,/const ROAD_NODES=/);
  assert.match(js,/const ROAD_EDGES=/);
  assert.match(js,/BRIDGE_Z=-27/);
  assert.match(js,/function findRoadPath/);
  assert.match(js,/function residentWaypoint/);
  assert.match(js,/bridgeW/);
  assert.match(js,/bridgeE/);
  assert.match(js,/function currentRuinZone/);
  assert.match(js,/function toggleRuinDoor/);
  assert.match(js,/function searchRuinSpot/);
  assert.match(js,/function updateRuinInteriors/);
  assert.match(js,/door-rotate-square-b\.glb/);
  assert.match(js,/marketShelf/);
  assert.match(js,/clinicSupply/);
  assert.match(js,/garageLocker/);
  assert.match(js,/hazard:'unstable'/);
  assert.match(js,/hazard:'sharp'/);
  assert.match(js,/ruinSearchProgress/);
  assert.match(js,/문간에서 조금 떨어져야 닫을 수 있습니다/);
  assert.match(js,/indoor=currentRuinZone/);
});


test('expedition survival loop connects darkness noise companions and storage',()=>{
  assert.match(js,/flashlight:\['손전등','🔦'\]/);
  assert.match(js,/storehouse:\{name:'공동창고'/);
  assert.match(js,/function toggleFlashlight/);
  assert.match(js,/function updateFlashlight/);
  assert.match(js,/SpotLight\(0xfff3cf,0,30/);
  assert.match(js,/flashlightCharge/);
  assert.match(js,/function emitRuinNoise/);
  assert.match(js,/function triggerRuinEvent/);
  assert.match(js,/game\.ruinNoise>=70/);
  assert.match(js,/const RUIN_EVENTS=/);
  assert.match(js,/const SITE_SKILL=/);
  assert.match(js,/function companionMatches/);
  assert.match(js,/function setCompanion/);
  assert.match(js,/function companionTarget/);
  assert.match(js,/function ruinSearchBonus/);
  assert.match(js,/specialist\?' · 전문 동행 보너스'/);
  assert.match(js,/function storageBuilt/);
  assert.match(js,/function depositStorage/);
  assert.match(js,/function withdrawStorage/);
  assert.match(html,/data-tab="storage"/);
  assert.match(html,/id="ruinStatus"/);
  assert.match(html,/id="mobileFlashlight"/);
  assert.match(html,/id="hotFlashlight"/);
  assert.match(css,/\.storage-list/);
  assert.match(css,/\.companion-btn/);
  assert.match(css,/\.ruin-status/);
});

test('legacy saves migrate into flashlight and split ruin-search progression',()=>{
  assert.match(js,/merged\.flags\.crate&&!merged\.inv\.flashlight/);
  assert.match(js,/merged\.inv\.flashlight=1/);
  assert.match(js,/market:\['marketShelf','marketBack'\]/);
  assert.match(js,/clinic:\['clinicCabinet','clinicSupply'\]/);
  assert.match(js,/garage:\['garageBench','garageLocker'\]/);
  assert.match(js,/Number\.isFinite\(s\.worldSeed\)/);
});


test('village civilization milestone is driven by housing exploration stock and logistics',()=>{
  assert.match(js,/function villageSteps/);
  assert.match(js,/공동창고 건설/);
  assert.match(js,/쉼터 2개 확보/);
  assert.match(js,/폐허 3곳 완전 수색/);
  assert.match(js,/식수 6 · 식량 8 비축/);
  assert.match(js,/공동창고 물자 6개 이상/);
  assert.match(js,/settlementLevel<2/);
  assert.match(js,/문명도 3 · 마을/);
  assert.match(js,/storehouse:\{name:'공동창고',icon:'📦',cost:\{wood:3,scrap:1\}/);
});


test('tablet boot regression: all panel handlers are declared and tabs are connected',()=>{
 for(const fn of ['openPanel','closePanel','togglePanel','renderOpenPanel','renderPanel'])assert.match(js,new RegExp('function '+fn+'\\s*\\('),fn);
 for(const tab of ['inventory','craft','build','knowledge','map','storage','settlement'])assert.ok(html.includes('data-tab="'+tab+'"'),tab);
 assert.match(js,/addEventListener\('click',togglePanel\)/);
 assert.match(js,/addEventListener\('click',closePanel\)/);
 assert.match(js,/renderPanel\('storage'\)/);
});

test('tablet handlers can open all seven tabs and toggle without runtime errors',()=>{
 const a=js.indexOf("let activePanelTab='inventory';"),b=js.indexOf('function updateUI(){',a);
 assert.ok(a>=0&&b>a,'tablet function block missing');
 const names=new Set(['hidden']),classList={contains:k=>names.has(k),add:k=>names.add(k),remove:k=>names.delete(k)};
 const nav=['inventory','craft','build','knowledge','map','storage','settlement'].map(tab=>({dataset:{tab},classList:{toggle:()=>{}}}));
 const body={innerHTML:'',querySelectorAll:()=>[],querySelector:()=>null};
 const ctx={ui:{panel:{classList,querySelectorAll:()=>nav},panelBody:body,panelTitle:{textContent:''},zone:{textContent:'야영지'}},
   game:{inv:{wood:1},storage:{},residents:{},flags:{power:false},knowledge:[],trust:60,communityHealth:70,morale:70,buildings:[],distribution:null,powerKw:0},
   running:true,buildMode:null,cancelBuild:()=>{},ITEMS:{wood:['목재','🪵']},BUILD:{shelter:{name:'쉼터',icon:'⛺',cost:{wood:1}}},
   KNOWLEDGE:[{id:'water',subject:'과학',title:'물',text:'물'}],itemHint:()=>'',has:()=>true,costText:()=>'',craft:()=>{},beginBuild:()=>{},
   clamp:(n,a,b)=>Math.max(a,Math.min(n,b)),player:{root:{position:{x:0,z:8}}},currentObjective:()=>null,
   ruinSearchProgress:()=>({done:0,total:2}),storageBuilt:()=>false,storageItems:()=>[],residentCount:()=>0,
   settlementMetrics:()=>({label:'긴장',resilience:40,pressure:30,water:1,food:1,housing:.5,supply:.5,power:0,population:1,shelters:0,farms:0}),
   RESIDENTS:{},JOBS:{},powerUse:()=>0,hasBuilding:()=>false,distributionName:()=>''};
 const actions=new Function('ctx','with(ctx){'+js.slice(a,b)+'return {openPanel,closePanel,togglePanel,renderOpenPanel,renderPanel};}')(ctx);
 for(const tab of ['inventory','craft','build','knowledge','map','storage','settlement']){
   assert.doesNotThrow(()=>{actions.openPanel(tab);actions.renderOpenPanel()},'failed to open '+tab);
   assert.equal(classList.contains('hidden'),false,tab);
 }
 actions.closePanel();assert.equal(classList.contains('hidden'),true);
 actions.togglePanel();assert.equal(classList.contains('hidden'),false);
 actions.togglePanel();assert.equal(classList.contains('hidden'),true);
});
