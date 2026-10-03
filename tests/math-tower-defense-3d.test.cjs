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
  assert.match(html,/tower-defense-loader\.js\?v=11/);
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
  assert.match(loader,/tower-defense\.js\?v=11/);
});

test('classic 3D runtime parses',()=>{
  const result=spawnSync(process.execPath,['--check',path.join(dir,'tower-defense.js')],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.doesNotMatch(runtime,/^\s*import\s/m);
  assert.doesNotMatch(runtime,/import\.meta/);
});

test('math rules and scripted wave progression stay solvable as factors unlock',()=>{
  for(const op of ['SUB1','DIV2','DIV3','ADD1','DIV5']) assert.match(runtime,new RegExp(op));
  assert.match(runtime,/function unlockedDivisors/);
  assert.match(runtime,/function fullyReducibleNow/);
  assert.match(runtime,/e\.hp=before\/def\.value/);
  assert.match(runtime,/if\(e\.hp===1\)purifyEnemy\(e\)/);
  assert.match(runtime,/fullyReducibleNow\(e\.hp-1\)/);
  assert.match(runtime,/fullyReducibleNow\(e\.hp\+1\)/);
  assert.match(runtime,/\{nums:\[2,4,8,16\],count:7/);
  assert.match(runtime,/\{nums:\[17,19,23,29\],count:12/);

  const towerSource=runtime.match(/const TOWERS=(\{[\s\S]*?\});\nconst WAVES=/)?.[1];
  const waveSource=runtime.match(/const WAVES=(\[[\s\S]*?\]);\nconst PATH=/)?.[1];
  assert.ok(towerSource&&waveSource,'tower/wave tables must be extractable');
  const towers=Function('return ('+towerSource+')')();
  const waves=Function('return ('+waveSource+')')();
  const divisorsFor=wave=>[2,3,5].filter(v=>wave>=({2:towers.DIV2.unlock,3:towers.DIV3.unlock,5:towers.DIV5.unlock}[v]));
  const reachable=(start,wave)=>{
    const divisors=divisorsFor(wave),queue=[start],seen=new Set(queue);
    while(queue.length){
      const n=queue.shift();if(n===1)return true;
      const next=[];
      for(const d of divisors)if(n>1&&n%d===0)next.push(n/d);
      if(n>2&&!divisors.some(d=>n%d===0))next.push(n-1,n+1);
      for(const value of next)if(value>0&&value<1000&&!seen.has(value)){seen.add(value);queue.push(value)}
    }
    return false;
  };
  waves.forEach((waveDef,index)=>waveDef.nums.forEach(n=>assert.ok(reachable(n,index+1),'wave '+(index+1)+' cannot reduce '+n+' to 1')));
});

test('v11 runtime uses Quaternius zombies, turrets and city buildings',()=>{
  for(const rel of [
    'assets/game/turrets/FBX/Gun_2.fbx',
    'assets/game/turrets/FBX/Gun_10.fbx',
    'assets/game/turrets/FBX/Laser_2.fbx',
    'assets/game/turrets/FBX/Teleporter5.fbx',
    'assets/game/turrets/FBX/Cannon_7.fbx',
    'assets/game/npcs/glTF/Zombie_Male.gltf',
    'assets/game/npcs/glTF/Zombie_Female.gltf',
    'assets/game/buildings/Models with Materials/FBX/1Story_Sign_Mat.fbx',
    'assets/game/buildings/Models with Materials/FBX/6Story_Stack_Mat.fbx'
  ]) assert.ok(fs.existsSync(path.join(root,rel)),'missing '+rel);
  assert.match(loader,/FBXLoader/);
  assert.match(runtime,/Zombie_Male\.gltf/);
  assert.match(runtime,/Gun_10\.fbx/);
  assert.match(runtime,/6Story_Stack_Mat\.fbx/);
  assert.match(runtime,/function towerVisualKey/);
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
  assert.equal(game.title,'좀비 vs 약수 터렛');
  assert.equal(game.href,'games/math_tower_defense/약수 타워 디펜스.html?v=11');
  const dist=path.join(root,'dist');
  assert.ok(fs.existsSync(path.join(dist,'games','math_tower_defense',canonicalName)));
  assert.ok(fs.existsSync(path.join(dist,'games','math_tower_defense','tower-defense-loader.js')));
  assert.ok(fs.existsSync(path.join(dist,'games','math_tower_defense','tower-defense.js')));
  const distCatalog=JSON.parse(fs.readFileSync(path.join(dist,'data','games.json'),'utf8'));
  assert.equal(distCatalog.games.find(g=>g.id==='math_tower_defense')?.href,'games/math_tower_defense/약수 타워 디펜스.html?v=11');
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


test('v11 keeps camera/audio systems while rebuilding the battlefield as an outbreak city',()=>{
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
  assert.match(runtime,/scene\.background=new THREE\.Color\(0x71808d\)/);
  assert.match(runtime,/function zombieKey/);
  assert.match(runtime,/FACTOR ×/);
  assert.match(runtime,/완전 분해/);
  assert.doesNotMatch(runtime,/addFloatingIsland/);
  assert.match(runtime,/enemyMixers/);
  assert.match(runtime,/SkeletonUtils/);
  assert.match(runtime,/applyBuildMode/);
  assert.match(css,/body\.build-mode #buildHint/);
  assert.match(css,/#cameraHint/);
  assert.match(html,/id="cameraResetBtn"/);
  assert.match(runtime,/sergequadrado-cool-hip-hop-loop-275527\.mp3/);
  assert.match(runtime,/function syncBgm/);
  assert.match(runtime,/bgm\.loop=true/);
  assert.match(runtime,/bgm\.volume=\.14/);
  assert.match(runtime,/visibilitychange/);
});

test('v9 exposes direct 1x to 16x speed choices and substeps high-speed simulation',()=>{
  for(const speed of [1,2,4,8,16]) assert.match(html,new RegExp('data-speed="'+speed+'"'));
  assert.match(runtime,/const GAME_SPEEDS=\[1,2,4,8,16\]/);
  assert.match(runtime,/MAX_SIM_STEP=\.05/);
  assert.match(runtime,/Math\.ceil\(scaledDt\/MAX_SIM_STEP\)/);
  assert.match(runtime,/for\(let i=0;i<steps;i\+\+\)update\(simStep\)/);
  assert.match(runtime,/function setGameSpeed\(speed\)/);
  assert.match(css,/\.speedMenu/);
});

test('v11 credits the new CC0 Quaternius outbreak packs',()=>{
  assert.match(html,/Zombies · NPCs · Turrets · Buildings: Quaternius/);
  assert.match(html,/CC0/);
  assert.doesNotMatch(html,/Turrets: Zsky/);
});
