const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'약수 타워 디펜스.html'),'utf8');
const mod=fs.readFileSync(path.join(root,'games','math_tower_defense','number-td-3d.js'),'utf8');

test('Divisor Tower Defense exposes a 3D battlefield while preserving the math runtime',()=>{
  assert.match(html,/id="gameCanvas3d"/);
  assert.match(html,/window\.__numTD3D/);
  assert.match(html,/number-td-3d\.js\?v=2/);
  assert.match(html,/÷2/);
  assert.match(html,/÷3/);
  assert.match(html,/÷5/);
  assert.match(html,/\+1/);
  assert.match(html,/-1/);
});

test('3D battlefield uses local Three.js, sci-fi turrets and animated monster assets',()=>{
  assert.match(html,/assets\/vendor\/three-r160\/three\.module\.js/);
  assert.match(mod,/GLTFLoader/);
  assert.match(mod,/GLTFLoader/);
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
});


test('3D board appears before optional GLB assets finish loading',()=>{
  assert.match(mod,/ready=true;box\.classList\.add\('td3d-ready'\)/);
  assert.match(mod,/requestAnimationFrame\(loop\)/);
  assert.match(mod,/Promise\.allSettled/);
  assert.match(mod,/asset timeout/);
  assert.doesNotMatch(mod,/SkeletonUtils/);
});

test('3D battle keeps numbers and equations visible for learning',()=>{
  assert.match(mod,/makeTextSprite\(e\.hp/);
  assert.match(mod,/api\.isPrime\(e\.hp\)\?'소수'/);
  assert.match(mod,/api\.state\.texts/);
  assert.match(mod,/syncTexts/);
});

test('3D battlefield supports direct raycast tower placement',()=>{
  assert.match(mod,/Raycaster/);
  assert.match(mod,/intersectPlane/);
  assert.match(mod,/api\.interactCell\(p\.x,p\.y\)/);
  assert.match(mod,/api\.setHover/);
});

test('turret attribution is visible in the game UI',()=>{
  assert.match(html,/3D Turrets: Zsky/);
  assert.match(html,/Creative Commons Attribution/);
});
