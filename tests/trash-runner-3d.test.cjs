const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','trash_runner');
const html=fs.readFileSync(path.join(dir,'달려라! 분리수거 트럭.html'),'utf8');
const runtime=fs.readFileSync(path.join(dir,'trash-runner-3d.js'),'utf8');
const loader=fs.readFileSync(path.join(dir,'trash-runner-3d-loader.js'),'utf8');

test('Trash Runner v3 JavaScript parses',()=>{
  const scripts=[...html.matchAll(/<script(?![^>]*type=["'](?:module|importmap)["'])(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).join('\n');
  let result=spawnSync(process.execPath,['--check'],{input:scripts,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
  result=spawnSync(process.execPath,['--check'],{input:runtime,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.match(loader,/import \* as THREE from 'three'/);
  assert.match(loader,/GLTFLoader/);
  assert.match(loader,/trash-runner-3d\.js\?v=3/);
});

test('Trash Runner v3 uses tracked 3D route and trash assets',()=>{
  const required=[
    'assets/game/3d/vehicles/kenney-car-kit/garbage-truck.glb',
    'assets/game/3d/city/kenney-city-kit-roads/road-straight.glb',
    'assets/game/3d/city/kenney-city-kit-roads/traffic-light.glb',
    'assets/game/3d/city/kenney-city-kit-roads/dumpster.glb',
    'assets/game/3d/nature/kenney-nature-kit/tree-default.glb',
    'assets/game/food/soda-bottle.glb',
    'assets/game/food/soda-can.glb',
    'assets/game/food/can.glb',
    'assets/game/food/cup.glb',
    'assets/game/food/carton.glb',
    'assets/game/food/bag.glb',
    'assets/game/food/pizza-box.glb',
    'assets/game/food/apple-half.glb',
    'assets/game/food/banana.glb',
    'assets/game/food/bread.glb',
    'assets/game/food/orange.glb',
    'assets/game/food/egg-half.glb',
    'assets/game/food/onion-half.glb',
    'assets/game/food/leek.glb',
    'assets/game/food/fish-bones.glb'
  ];
  for(const rel of required)assert.ok(fs.existsSync(path.join(root,rel)),'missing '+rel);
  assert.match(runtime,/const TRASH_MODEL=/);
  assert.match(runtime,/soda-bottle\.glb/);
  assert.match(runtime,/soda-can\.glb/);
  assert.match(runtime,/banana\.glb/);
  assert.match(runtime,/pizza-box\.glb/);
  assert.match(runtime,/proceduralTrash/);
});

test('Trash Runner v3 removes the old 2D safety plate',()=>{
  assert.match(html,/id="city3d"/);
  assert.match(html,/trash-runner-3d-loader\.js\?v=3/);
  assert.doesNotMatch(html,/id="truck-fallback"/);
  assert.doesNotMatch(html,/id="road-area"/);
  assert.doesNotMatch(html,/legacy-sky/);
  assert.doesNotMatch(html,/pickup-card/);
  assert.doesNotMatch(html,/moving-trash/);
  assert.doesNotMatch(html,/animate-road/);
});

test('Trash Runner v3 picks and misses real 3D trash',()=>{
  assert.match(runtime,/new THREE\.Raycaster/);
  assert.match(runtime,/function spawnTrash\(data,duration=5\.5\)/);
  assert.match(runtime,/canvas\.addEventListener\('pointerdown',pick/);
  assert.match(runtime,/TrashRunnerGame\?\.onCollect/);
  assert.match(runtime,/TrashRunnerGame\?\.onMiss/);
  assert.match(runtime,/function clearTrash\(\)/);
  assert.match(html,/window\.TrashRunnerGame =/);
  assert.match(html,/TrashRunner3D\?\.spawnTrash/);
  assert.match(html,/trashrunner3d-ready/);
});

test('Trash Runner keeps the sorting learning loop',()=>{
  assert.match(html,/const TRASH_DATA = \[/);
  assert.match(html,/const BINS = \[/);
  assert.match(html,/function handleBinClick/);
  assert.match(html,/heldTrash\.type === binId/);
  assert.match(html,/trash_runner_high_score/);
});

test('Trash Runner catalog points to v3',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game=catalog.games.find(g=>g.id==='trash_runner');
  assert.ok(game);
  assert.equal(game.href,'games/trash_runner/달려라! 분리수거 트럭.html?v=3');
});