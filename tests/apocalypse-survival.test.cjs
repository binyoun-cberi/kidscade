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
  assert.match(html,/game\.js\?v=18/);
});

test('seven-day science and social survival loop is wired',()=>{
  for(const day of [1,2,3,4,5,6,7])assert.match(js,new RegExp('\\n '+day+':\\{title:'));
  for(const id of ['waterRisk','boiling','chemicalPollution','combustion','insulation','plantGrowth','foodPreservation','waterTreatment','ruinSafety','electricity','division','scarcity','community','riverSettlement','flood'])assert.ok(js.includes("'"+id+"'"),id);
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
    ['assets/game/3d/buildings/kenney-building-kit',['wall-doorway-wide-square.glb','wall-window-wide-square-detailed.glb','wall-window-square-detailed.glb']],
    ['assets/game/3d/vehicles/kenney-car-kit',['ambulance.glb','sedan.glb','van.glb','suv.glb','debris-tire.glb']],
    ['assets/game/3d/nature/kenney-nature-kit',['fence-gate.glb','canoe.glb','cliff-large-rock.glb','tree-pine-tall-a.glb','plant-bush-large.glb','rock-small-c.glb']],
    ['assets/game/3d/city/poly-pizza-city-pack',['big-building.glb','bench.glb','bus-stop.glb','dumpster.glb','building-green.glb','brown-building.glb']]
  ];
  for(const [dir,files] of packs)for(const file of files)assert.ok(fs.existsSync(path.join(root,dir,file)),'missing '+dir+'/'+file);
  assert.match(js,/kenney-survival-kit/);
  assert.match(js,/renderAvatarSVG/);
});

test('game is registered in catalog metadata v18',()=>{
  const game=catalog.games.find(g=>g.id==='high_apocalypse_survival');
  assert.ok(game,'catalog entry missing');
  assert.equal(game.href,'games/high_apocalypse_survival/index.html?v=18');
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
  assert.match(html,/game\.js\?v=18/);
  assert.match(catalog.games.find(g=>g.id==='high_apocalypse_survival').href,/\?v=17$/);
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


test('apocalypse v18 uses clustered scenery and disables tiny decor shadows',()=>{
  assert.match(js,/function scatterSharedCluster/);
  assert.match(js,/shadow:true/);
  assert.match(js,/shadow:!\/grass\|plant\|mushroom/);
  assert.match(js,/scatterSharedCluster\(-45,36/);
  assert.match(html,/game\.js\?v=18/);
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
