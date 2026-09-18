const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','job_police_car');
const html=fs.readFileSync(path.join(dir,'경찰차 시뮬레이터.html'),'utf8');
const css=fs.readFileSync(path.join(dir,'police-patrol.css'),'utf8');
const js=fs.readFileSync(path.join(dir,'police-patrol.js'),'utf8');
const loader=fs.readFileSync(path.join(dir,'police-patrol-loader.js'),'utf8');
const rootEntry=fs.readFileSync(path.join(root,'경찰차 시뮬레이터.html'),'utf8');

test('Police Patrol loads its local Three.js 3D runtime',()=>{
  assert.match(html,/id="game3d"/);
  assert.match(html,/type="importmap"/);
  assert.match(html,/police-patrol-loader\.js\?v=7/);
  assert.match(html,/police-patrol\.css\?v=7/);
  assert.match(loader,/GLTFLoader/);
  assert.match(loader,/police-patrol\.js\?v=7/);
  assert.match(rootEntry,/games\/job_police_car\/police-patrol-loader\.js\?v=7/);
  assert.doesNotMatch(rootEntry,/location\.replace|http-equiv="refresh"/i);
});


test('Police Patrol startup does not touch 3D lexical state before initialization',()=>{
  assert.match(js,/window\.__police3dResize\?\.\(\)/);
  assert.match(js,/window\.__police3dResize=resize3D/);
  assert.doesNotMatch(js,/ctx\.setTransform\([^;]+;resize3D\(\)/);
  assert.match(js,/function startGame\(\)\{driveAudio\.init\(\)/);
});


test('Police Patrol v7 fades buildings that block the chase camera',()=>{
  assert.match(js,/function registerBuildingOccluder3/);
  assert.match(js,/function updateCameraOcclusion3/);
  assert.match(js,/function restoreOccluders3/);
  assert.match(js,/updateCameraOcclusion3\(target\)/);
  assert.match(js,/mat\.opacity=Math\.min\(\.18/);
});

test('Police Patrol v7 adds moving pedestrians using existing people assets',()=>{
  for(const rel of [
    'assets/game/characters/people/character-male-a.glb',
    'assets/game/characters/people/character-male-b.glb',
    'assets/game/characters/people/character-female-b.glb',
    'assets/game/characters/people/character-female-c.glb'
  ]) assert.ok(fs.existsSync(path.join(root,rel)),'missing '+rel);
  assert.match(js,/function spawnPedestrians/);
  assert.match(js,/function updatePedestrians/);
  assert.match(js,/function syncPedestrians3D/);
  assert.match(js,/character-male-a\.glb/);
  assert.match(js,/spawnPedestrians\(\)/);
});

test('Police Patrol v7 repairs lane following and guarantees an early pursuit',()=>{
  assert.match(js,/function laneOffsetForAngle/);
  assert.match(js,/function trafficDesiredSpeed/);
  assert.match(js,/function separateTrafficCars/);
  assert.match(js,/missionIssued===0\?'pursuit'/);
  assert.match(js,/정차 명령/);
  assert.match(js,/mission\.progress\/4\.2/);
  assert.doesNotMatch(js,/Math\.sin\(this\.a\)>0\?30:-30/);
});

test('Police Patrol v7 uses a lower chase camera and human-scale mission distance',()=>{
  assert.match(js,/height=portrait\?5\.15:4\.55/);
  assert.match(js,/Math\.round\(d\*\.12\)/);
  assert.match(js,/bangSprite3/);
  assert.match(js,/missionArrow3\.visible=raw>180/);
});

test('Police Patrol v7 adds CC0 city landmark props and compact portrait UI',()=>{
  assert.ok(fs.existsSync(path.join(root,'assets','game','3d','city','poly-pizza-city-pack','big-building.glb')));
  assert.ok(fs.existsSync(path.join(root,'assets','game','3d','city','poly-pizza-city-pack','dumpster.glb')));
  assert.match(js,/big-building\.glb/);
  assert.match(js,/dumpster\.glb/);
  assert.match(css,/mobile driving polish v7/);
  assert.match(css,/#minimap\{top:116px/);
});

test('Police Patrol browser runtime parses',()=>{
  const result=spawnSync(process.execPath,['--check',path.join(dir,'police-patrol.js')],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
});

test('Police Patrol uses shared 3D police, traffic, city and nature assets',()=>{
  const required=[
    'assets/game/3d/vehicles/kenney-car-kit/police.glb',
    'assets/game/3d/vehicles/kenney-car-kit/sedan.glb',
    'assets/game/3d/vehicles/kenney-car-kit/suv.glb',
    'assets/game/3d/vehicles/kenney-car-kit/hatchback-sports.glb',
    'assets/game/3d/vehicles/kenney-car-kit/taxi.glb',
    'assets/game/3d/vehicles/kenney-car-kit/truck.glb',
    'assets/game/3d/city/kenney-city-kit-roads/traffic-light.glb',
    'assets/game/3d/city/kenney-city-kit-roads/construction-cone.glb',
    'assets/game/3d/city/kenney-city-kit-roads/construction-barrier.glb',
    'assets/game/3d/nature/kenney-nature-kit/tree-default.glb'
  ];
  for(const rel of required)assert.ok(fs.existsSync(path.join(root,rel)),'missing '+rel);
  assert.match(js,/police\.glb/);
  assert.match(js,/construction-cone\.glb/);
  assert.match(js,/tree-default\.glb/);
  assert.match(js,/function rebuildCity3D/);
  assert.match(js,/function syncCars3D/);
});

test('Police Patrol has third-person camera, siren lighting and 3D collision feedback',()=>{
  assert.match(js,/PerspectiveCamera/);
  assert.match(js,/distBack/);
  assert.match(js,/PointLight/);
  assert.match(js,/player\.siren/);
  assert.match(js,/sparkBurst3/);
  assert.match(js,/cameraShake3/);
  assert.match(css,/body\.three-ready #game3d/);
});

test('Police Patrol retains varied job missions in 3D',()=>{
  assert.match(js,/spawnPursuit/);
  assert.match(js,/spawnAccident/);
  assert.match(js,/spawnTrafficMission/);
  assert.match(js,/spawnObstacle/);
  assert.match(js,/rebuildMissionProps3/);
  assert.match(js,/수배 차량 추격/);
  assert.match(js,/현장 안전 확보/);
  assert.match(js,/안전콘 설치/);
  assert.match(js,/낙하물 정리/);
});

test('Police siren still makes civilian traffic yield',()=>{
  assert.match(js,/function updateYield/);
  assert.match(js,/if\(!player\.siren\)return/);
  assert.match(js,/c\.yield=Math\.max\(c\.yield,1\.2\)/);
  assert.match(js,/desired=Math\.min\(desired,55\)/);
});

test('Mobile Police Patrol does not accelerate unless the boost button is held',()=>{
  assert.match(js,/if\(coarse\)\{throttle=touch\.boost\?1:0/);
  assert.match(js,/touch\.steer/);
  assert.match(html,/id="boostBtn"/);
  assert.match(html,/id="joy"/);
  assert.match(css,/모바일: 가속 버튼을 누를 때만 전진합니다/);
});

test('Police Patrol only uses valid shared static audio keys',()=>{
  const audio=JSON.parse(fs.readFileSync(path.join(root,'assets','audio','audio-catalog.json'),'utf8'));
  const keys=[...js.matchAll(/sfx\(\s*['"]([a-z0-9_.-]+)['"]/g)].map(m=>m[1]);
  assert.ok(keys.length>=3);
  for(const key of keys)assert.ok(audio.sounds[key],'missing audio key '+key);
});

test('catalog and Cloudflare build point to Police Patrol v7',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game=catalog.games.find(g=>g.id==='job_police_car');
  assert.equal(game.href,'games/job_police_car/경찰차 시뮬레이터.html?v=7');
  const distCatalog=JSON.parse(fs.readFileSync(path.join(root,'dist','data','games.json'),'utf8'));
  const builtGame=distCatalog.games.find(g=>g.id==='job_police_car');
  assert.equal(builtGame.href,'games/job_police_car/경찰차 시뮬레이터.html?v=7');
  assert.ok(fs.existsSync(path.join(root,'dist','games','job_police_car','police-patrol-loader.js')));
  assert.ok(fs.existsSync(path.join(root,'dist','assets','game','3d','vehicles','kenney-car-kit','police.glb')));
});
