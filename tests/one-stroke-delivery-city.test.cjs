const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'한붓쓱.html'),'utf8');
const runtime=fs.readFileSync(path.join(root,'one-stroke-city-3d.js'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));

test('One Stroke keeps the original one-stroke route logic intact',()=>{
  for(const token of ['function completionTrail','function startDelivery','function drawDelivery','function processSegment','function isCompletePath']){
    assert.ok(html.includes(token),'missing '+token);
  }
});

test('One Stroke layers a real Three.js city under the interactive route canvas',()=>{
  assert.match(html,/id="city3d"/);
  assert.match(html,/type="importmap"/);
  assert.match(html,/one-stroke-city-3d\\.js\\?v=4/);
  assert.match(html,/publishCity3D/);
  assert.match(html,/one-stroke-city-layout/);
  assert.match(html,/__oneStroke3DReady/);
});

test('One Stroke builds neighborhoods from puzzle roads instead of random scatter',()=>{
  assert.match(html,/Main urban fabric follows the puzzle roads/);
  assert.match(html,/Large areas far from any route become compact neighborhoods/);
  assert.match(html,/Final micro-fill uses greenery only/);
  assert.match(html,/roadSide:side/);
  assert.match(html,/edgeId:e\.id/);
  assert.match(html,/distanceToRoad/);
  assert.match(html,/const bx=n\.x\+\(l\.x-n\.x\)\*\.48/);
});

test('One Stroke 3D renderer uses committed Kenney city assets',()=>{
  const required=[
    'assets/game/3d/city/kenney-city-kit-suburban/building-type-a.glb',
    'assets/game/3d/city/kenney-city-kit-suburban/building-type-b.glb',
    'assets/game/3d/city/kenney-city-kit-suburban/building-type-c.glb',
    'assets/game/3d/city/kenney-city-kit-suburban/building-type-d.glb',
    'assets/game/3d/city/kenney-city-kit-suburban/building-type-e.glb',
    'assets/game/3d/city/kenney-city-kit-suburban/building-type-f.glb',
    'assets/game/3d/city/kenney-city-kit-suburban/building-type-g.glb',
    'assets/game/3d/city/kenney-city-kit-suburban/building-type-h.glb',
    'assets/game/3d/city/kenney-city-kit-suburban/building-type-i.glb',
    'assets/game/3d/nature/kenney-nature-kit/tree-default.glb',
    'assets/game/3d/nature/kenney-nature-kit/tree-oak.glb',
    'assets/game/3d/nature/kenney-nature-kit/tree-pine-round-a.glb',
    'assets/game/3d/vehicles/kenney-car-kit/sedan.glb',
    'assets/game/3d/vehicles/kenney-car-kit/suv.glb',
    'assets/game/3d/vehicles/kenney-car-kit/taxi.glb',
    'assets/game/3d/city/kenney-city-kit-roads/light-square.glb',
    'assets/game/3d/city/kenney-city-kit-roads/construction-cone.glb'
  ];
  for(const rel of required)assert.ok(fs.existsSync(path.join(root,rel)),'missing '+rel);
  for(const token of ['building-type-a.glb','building-type-i.glb','tree-oak.glb','sedan.glb','taxi.glb','light-square.glb']){
    assert.ok(runtime.includes(token),'runtime missing '+token);
  }
});

test('One Stroke makes the city visibly larger and more three-dimensional',()=>{
  assert.match(runtime,/OrthographicCamera/);
  assert.match(runtime,/camera\.position\.set\(11,76,58\)/);
  assert.match(runtime,/const scale=o\.district\?3\.0:2\.82/);
  assert.match(runtime,/l\.role==='apartment'\?3\.55/);
  assert.match(runtime,/addTreeCluster\(p\.x-r\*\.26/);
  assert.match(html,/lineW=Math\.min\(9/);
});

test('One Stroke catalog points to the road-oriented 3D rework',()=>{
  const game=catalog.games.find(g=>g.id==='low_one_stroke');
  assert.ok(game);
  assert.equal(game.href,'한붓쓱.html?v=8');
  assert.deepEqual(game.input,['touch']);
});

test('One Stroke uses role-based roof colors to break up repeated green roofs',()=>{
  assert.match(runtime,/const ROOF=\{/);
  assert.match(runtime,/function tintRoof/);
  assert.match(runtime,/roofColor\(roofRole\(l\.role\)/);
  assert.match(runtime,/const roles=o\.edgeId!=null/);
  assert.match(runtime,/if\(roof!=null&&key\.startsWith\('building'\)\)tintRoof/);
});


test('One Stroke teaches strategy without auto-solving every move',()=>{
  assert.match(html,/const TUTORIALS =/);
  assert.match(html,/힌트 1\/3/);
  assert.match(html,/힌트 2\/3/);
  assert.match(html,/힌트 3\/3/);
  assert.doesNotMatch(html,/이 경로로는 끝까지 이어지지 않아요/);
  assert.match(html,/completionTrail\(next\)/);
});

test('One Stroke keeps stages valid while smoothing chapter difficulty',()=>{
  assert.match(html,/const RAW_STAGES =/);
  assert.match(html,/const DIFFICULTY_ORDER =/);
  assert.match(html,/1,2,3,4,5,7,6,9,8,10/);
  assert.match(html,/sourceNum,num:slot,chapter/);
});

test('One Stroke delivery reward is short, boostable, and restores the bright city',()=>{
  assert.match(html,/Math\.min\(4200,Math\.max\(2200,state\.edges\.length\*155\)\)/);
  assert.match(html,/function boostDelivery/);
  assert.match(html,/state\.delivery\.speed=2/);
  assert.match(html,/board-shell\.solving #city3d/);
  assert.match(html,/classList\.add\('delivering'\)/);
});

test('One Stroke reports results and achievements through the common SDK',()=>{
  assert.match(html,/kidscade-game-sdk\.js/);
  assert.match(html,/KidscadeGame\?\.start/);
  assert.match(html,/KidscadeGame\?\.gameOver/);
  assert.match(html,/completedCount:save\.completed\.length/);
  assert.match(html,/clean,elapsedMs/);
});


test('One Stroke activates its planned mastery and secret achievement rules',()=>{
  const catalog=fs.readFileSync(path.join(root,'achievement-catalog.js'),'utf8');
  assert.match(catalog,/low_one_stroke:\s*\{[\s\S]*field:'clean'[\s\S]*field:'completedCount'/);
});
