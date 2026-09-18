const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'약수 타워 디펜스.html'),'utf8');
const loader=fs.readFileSync(path.join(root,'games','math_tower_defense','number-td-3d-loader.js'),'utf8');
const runtime=fs.readFileSync(path.join(root,'games','math_tower_defense','number-td-3d-runtime.js'),'utf8');

test('Divisor Tower Defense uses the proven loader -> classic runtime architecture',()=>{
  assert.match(html,/number-td-3d-loader\.js\?v=3/);
  assert.match(html,/type="importmap"/);
  assert.match(loader,/GLTFLoader/);
  assert.match(loader,/window\.THREE=THREE/);
  assert.match(loader,/number-td-3d-runtime\.js\?v=3/);
  assert.doesNotMatch(runtime,/^\s*import\s/m);
  assert.doesNotMatch(runtime,/import\.meta/);
  assert.match(runtime,/const THREE=window\.THREE,GLTFLoader=window\.GLTFLoader/);
});

test('classic Number TD 3D runtime parses in Node',()=>{
  const file=path.join(root,'games','math_tower_defense','number-td-3d-runtime.js');
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
});

test('3D battlefield still uses local sci-fi turrets and animated monster assets',()=>{
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
  assert.match(runtime,/ghost-skull\.glb/);
});

test('3D board becomes visible before optional GLB models finish',()=>{
  const visible=runtime.indexOf("ready=true;box.classList.add('td3d-ready')");
  const wait=runtime.indexOf('Promise.allSettled');
  assert.ok(visible>=0,'3D ready marker missing');
  assert.ok(wait>visible,'asset wait must happen after board is shown');
  assert.match(runtime,/asset timeout/);
});

test('numbers, equations and direct 3D placement remain connected to the math runtime',()=>{
  assert.match(html,/window\.__numTD3D/);
  assert.match(runtime,/makeTextSprite\(e\.hp/);
  assert.match(runtime,/api\.state\.texts/);
  assert.match(runtime,/Raycaster/);
  assert.match(runtime,/api\.interactCell\(p\.x,p\.y\)/);
});

test('turret attribution remains visible',()=>{
  assert.match(html,/3D Turrets: Zsky/);
  assert.match(html,/Creative Commons Attribution/);
});

test('Cloudflare build publishes both new Number TD 3D runtime files',()=>{
  const dist=path.join(root,'dist');
  assert.ok(fs.existsSync(path.join(dist,'games','math_tower_defense','number-td-3d-loader.js')));
  assert.ok(fs.existsSync(path.join(dist,'games','math_tower_defense','number-td-3d-runtime.js')));
  const catalog=JSON.parse(fs.readFileSync(path.join(dist,'data','games.json'),'utf8'));
  assert.equal(catalog.games.find(g=>g.id==='math_tower_defense')?.href,'약수 타워 디펜스.html?v=3d-3');
});
