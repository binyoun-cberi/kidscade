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

test('Trash Runner v2 classic and 3D runtime JavaScript parse',()=>{
  const scripts=[...html.matchAll(/<script(?![^>]*type=["'](?:module|importmap)["'])(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).join('\n');
  let result=spawnSync(process.execPath,['--check'],{input:scripts,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
  result=spawnSync(process.execPath,['--check'],{input:runtime,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.match(loader,/import \* as THREE from 'three'/);
  assert.match(loader,/GLTFLoader/);
  assert.match(loader,/import\.meta\.url/);
});

test('Trash Runner v2 uses tracked CC0 3D route assets',()=>{
  const required=[
    'assets/game/3d/vehicles/kenney-car-kit/garbage-truck.glb',
    'assets/game/3d/city/kenney-city-kit-roads/road-straight.glb',
    'assets/game/3d/city/kenney-city-kit-roads/traffic-light.glb',
    'assets/game/3d/city/kenney-city-kit-roads/dumpster.glb',
    'assets/game/3d/nature/kenney-nature-kit/tree-default.glb',
    'assets/game/3d/nature/kenney-nature-kit/tree-oak.glb',
    'assets/game/3d/city/poly-pizza-city-pack/big-building.glb',
    'assets/game/ui/icons/kenney-game-icons/white/2x/trashcan-open.png'
  ];
  for(const rel of required)assert.ok(fs.existsSync(path.join(root,rel)),'missing '+rel);
  assert.match(runtime,/garbage-truck\.glb/);
  assert.match(runtime,/road-straight\.glb/);
  assert.match(runtime,/traffic-light\.glb/);
  assert.match(runtime,/dumpster\.glb/);
});

test('Trash Runner v2 keeps the sorting learning loop',()=>{
  assert.match(html,/const TRASH_DATA = \[/);
  assert.match(html,/const BINS = \[/);
  assert.match(html,/function spawnTrash\(\)/);
  assert.match(html,/function handleBinClick/);
  assert.match(html,/heldTrash\.type === binId/);
  assert.match(html,/trash_runner_high_score/);
  assert.match(html,/pickup-card/);
  assert.match(html,/recycle-bin/);
});

test('Trash Runner v2 integrates local Three.js with a 2D fallback',()=>{
  assert.match(html,/id="city3d"/);
  assert.match(html,/assets\/vendor\/three-r160\/three\.module\.js/);
  assert.match(html,/trash-runner-3d-loader\.js\?v=2/);
  assert.match(html,/id="truck-fallback"/);
  assert.match(html,/body\.three-ready #truck-fallback/);
  assert.match(html,/TrashRunner3D\?\.start/);
  assert.match(html,/TrashRunner3D\?\.wrong/);
});

test('Trash Runner catalog points to v2 rework',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game=catalog.games.find(g=>g.id==='trash_runner');
  assert.ok(game);
  assert.equal(game.href,'games/trash_runner/달려라! 분리수거 트럭.html?v=2');
});
