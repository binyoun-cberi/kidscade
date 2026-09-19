const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'한붓쓱.html'),'utf8');
const runtime=fs.readFileSync(path.join(root,'one-stroke-city-3d.js'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));

test('One Stroke keeps the original route puzzle logic intact',()=>{
  assert.match(html,/function completionTrail/);
  assert.match(html,/function startDelivery/);
  assert.match(html,/function drawDelivery/);
  assert.match(html,/function processSegment/);
  assert.match(html,/function isCompletePath/);
});

test('One Stroke layers a real Three.js city under the interactive route canvas',()=>{
  assert.match(html,/id="city3d"/);
  assert.match(html,/type="importmap"/);
  assert.match(html,/one-stroke-city-3d\.js\?v=2/);
  assert.match(html,/publishCity3D/);
  assert.match(html,/one-stroke-city-layout/);
  assert.match(html,/__oneStroke3DReady/);
});

test('One Stroke 3D renderer uses committed Kenney buildings, nature, vehicles and props',()=>{
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

test('One Stroke keeps dense city placement while swapping fake drawings for 3D assets',()=>{
  assert.match(html,/target=small\?30:58/);
  assert.match(html,/o\.kind==='building'/);
  assert.match(html,/o\.kind==='parking'/);
  assert.match(html,/o\.kind==='plaza'/);
  assert.match(html,/o\.kind==='treeCluster'/);
  assert.match(runtime,/function addLandmark/);
  assert.match(runtime,/function addDecor/);
  assert.match(runtime,/function screenToGround/);
  assert.match(runtime,/OrthographicCamera/);
});

test('One Stroke catalog points to the real 3D city rework',()=>{
  const game=catalog.games.find(g=>g.id==='low_one_stroke');
  assert.ok(game);
  assert.equal(game.href,'한붓쓱.html?v=5');
});
