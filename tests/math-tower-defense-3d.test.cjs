const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','math_tower_defense');
const canonicalName='약수 타워 디펜스.html';
const html=fs.readFileSync(path.join(dir,canonicalName),'utf8');
const css=fs.readFileSync(path.join(dir,'tower-defense.css'),'utf8');
const loader=fs.readFileSync(path.join(dir,'tower-defense-loader.js'),'utf8');
const runtime=fs.readFileSync(path.join(dir,'tower-defense.js'),'utf8');
const rootAlias=fs.readFileSync(path.join(root,'약수 타워 디펜스.html'),'utf8');
const nestedAlias=fs.readFileSync(path.join(dir,'index.html'),'utf8');

test('Divisor Tower Defense has one canonical standalone 3D entry',()=>{
  assert.match(html,/id="world"/);
  assert.match(html,/tower-defense-loader\.js\?v=7/);
  assert.match(html,/type="importmap"/);
  assert.doesNotMatch(html,/gameCanvas|number-td-3d|__numTD3D/);
  assert.ok(html.length>1000);
  assert.match(rootAlias,/games\/math_tower_defense\/%EC%95%BD%EC%88%98/);
  assert.match(nestedAlias,/%EC%95%BD%EC%88%98%20%ED%83%80%EC%9B%8C/);
});

test('loader uses the proven Three.js bootstrap pattern',()=>{
  assert.match(loader,/import \* as THREE from 'three'/);
  assert.match(loader,/GLTFLoader/);
  assert.match(loader,/window\.THREE=THREE/);
  assert.match(loader,/tower-defense\.js\?v=7/);
});

test('classic 3D runtime parses',()=>{
  const result=spawnSync(process.execPath,['--check',path.join(dir,'tower-defense.js')],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.doesNotMatch(runtime,/^\s*import\s/m);
  assert.doesNotMatch(runtime,/import\.meta/);
});

test('math rules and original wave progression survive the rebuild',()=>{
  for(const op of ['SUB1','DIV2','DIV3','ADD1','DIV5']) assert.match(runtime,new RegExp(op));
  assert.match(runtime,/if\(t\.id==='SUB1'\)/);
  assert.match(runtime,/e\.hp=Math\.floor\(e\.hp\/def\.value\)/);
  assert.match(runtime,/isPrime\(e\.hp\)/);
  assert.match(runtime,/\{nums:\[2,3,4\],count:6/);
  assert.match(runtime,/\{nums:\[17,19,23,29\],count:12/);
});

test('3D runtime uses sci-fi turrets and monster assets',()=>{
  for(const rel of [
    'assets/game/3d/weapons/scifi-turrets/gatelng-gun-turret.glb',
    'assets/game/3d/weapons/scifi-turrets/rail-gun-turret.glb',
    'assets/game/3d/weapons/scifi-turrets/plasma-turret.glb',
    'assets/game/3d/weapons/scifi-turrets/emp-turret.glb',
    'assets/game/3d/weapons/scifi-turrets/missile-turret.glb',
    'assets/game/3d/characters/monsters/ultimate-monsters-bundle/green-blob.glb',
    'assets/game/3d/characters/monsters/ultimate-monsters-bundle/ghost-skull.glb',
    'assets/game/3d/characters/monsters/ultimate-monsters-bundle/orc-enemy.glb'
  ]) assert.ok(fs.existsSync(path.join(root,rel)),'missing '+rel);
  assert.match(runtime,/gatelng-gun-turret\.glb/);
  assert.match(runtime,/mushroom-king\.glb/);
});

test('3D placement and learning feedback are first class',()=>{
  assert.match(runtime,/Raycaster/);
  assert.match(runtime,/pointerCell/);
  assert.match(runtime,/placeTower/);
  assert.match(runtime,/state\.texts\.push/);
  assert.match(runtime,/feed\(label/);
  assert.match(html,/id="calcFeed"/);
  assert.doesNotMatch(runtime,/canvas\.getContext\(['"]2d/);
});

test('mobile UI reserves most of the screen for the battlefield',()=>{
  assert.match(css,/#towerDeck/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/#waveCard/);
});

test('catalog and Cloudflare build use the title-matching canonical file',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game=catalog.games.find(g=>g.id==='math_tower_defense');
  assert.equal(game.title,'약수 타워 디펜스');
  assert.equal(game.href,'games/math_tower_defense/약수 타워 디펜스.html?v=7');
  const dist=path.join(root,'dist');
  assert.ok(fs.existsSync(path.join(dist,'games','math_tower_defense',canonicalName)));
  assert.ok(fs.existsSync(path.join(dist,'games','math_tower_defense','tower-defense-loader.js')));
  assert.ok(fs.existsSync(path.join(dist,'games','math_tower_defense','tower-defense.js')));
  const distCatalog=JSON.parse(fs.readFileSync(path.join(dist,'data','games.json'),'utf8'));
  assert.equal(distCatalog.games.find(g=>g.id==='math_tower_defense')?.href,'games/math_tower_defense/약수 타워 디펜스.html?v=7');
});

test('legacy URLs are registered aliases to the canonical game',()=>{
  const aliases=JSON.parse(fs.readFileSync(path.join(root,'data','game-path-aliases.json'),'utf8'));
  assert.equal(aliases['약수 타워 디펜스.html'],'games/math_tower_defense/약수 타워 디펜스.html');
  assert.equal(aliases['games/math_tower_defense/index.html'],'games/math_tower_defense/약수 타워 디펜스.html');
});


test('v3 battlefield improves combat readability and feedback',()=>{
  assert.match(runtime,/function calcSprite/);
  assert.match(runtime,/function hitBurst/);
  assert.match(runtime,/CylinderGeometry\(thick/);
  assert.match(runtime,/labelLane/);
  assert.match(runtime,/impactShake/);
  assert.match(runtime,/ring2/);
});


test('v7 uses a cohesive eco-city battlefield with dependency-free camera controls',()=>{
  assert.match(runtime,/rebuildBoardDecor/);
  assert.match(runtime,/rebuildSkyWorld/);
  assert.match(runtime,/tree-default\.glb/);
  assert.match(runtime,/plant-bush\.glb/);
  assert.match(runtime,/makeParkBench/);
  assert.doesNotMatch(loader,/OrbitControls/);
  assert.match(runtime,/function updateCameraTransform/);
  assert.match(runtime,/function onWheel/);
  assert.match(runtime,/activePointers/);
  assert.match(runtime,/function readBest/);
  assert.match(runtime,/function roundRectPath/);
  assert.match(runtime,/const AC=window\.AudioContext/);
  assert.match(runtime,/function onPointerUp/);
  assert.match(runtime,/scene\.background=new THREE\.Color\(0xcfeeff\)/);
  assert.doesNotMatch(runtime,/addFloatingIsland/);
  assert.match(runtime,/enemyMixers/);
  assert.match(runtime,/SkeletonUtils/);
  assert.match(runtime,/applyBuildMode/);
  assert.match(css,/body\.build-mode #buildHint/);
  assert.match(css,/#cameraHint/);
  assert.match(html,/id="cameraResetBtn"/);
});

test('required CC-BY credit stays visible',()=>{
  assert.match(html,/Turrets: Zsky/);
  assert.match(html,/CC BY/);
});
