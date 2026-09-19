const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const gameDir=path.join(root,'games','toddler_monkey_vines');
const html=fs.readFileSync(path.join(gameDir,'몽키 쏙쏙!.html'),'utf8');
const runtime=fs.readFileSync(path.join(gameDir,'monkey-tumble.js'),'utf8');
const css=fs.readFileSync(path.join(gameDir,'monkey-tumble.css'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
const legacy=fs.readFileSync(path.join(root,'유아_덤블링몽키즈.html'),'utf8');

test('Monkey Tumble canonical entry loads its local 3D runtime',()=>{
  assert.match(html,/type="importmap"/);
  assert.match(html,/monkey-tumble\.css/);
  assert.match(html,/monkey-tumble\.js/);
  assert.match(html,/board3d/);
  assert.match(css,/#board3d/);
});

test('Monkey Tumble uses committed Kidscade assets',()=>{
  const assets=[
    'assets/game/characters/pets/animal-monkey.glb',
    'assets/game/food/banana.glb',
    'assets/game/3d/nature/kenney-nature-kit/tree-palm.glb',
    'assets/game/3d/nature/kenney-nature-kit/plant-bush.glb'
  ];
  for(const rel of assets) assert.ok(fs.existsSync(path.join(root,rel)),'missing Monkey Tumble asset '+rel);
  assert.match(runtime,/animal-monkey\.glb/);
  assert.match(runtime,/banana\.glb/);
  assert.match(runtime,/tree-palm\.glb/);
  assert.match(runtime,/plant-bush\.glb/);
});

test('Monkey Tumble keeps physical board-game interactions',()=>{
  assert.match(runtime,/THREE\.Raycaster/);
  assert.match(runtime,/CylinderGeometry/);
  assert.match(runtime,/function findSupport/);
  assert.match(runtime,/function pullRod/);
  assert.match(runtime,/function rotateBoard/);
  assert.match(runtime,/state\.players\[state\.current\]\.fallen/);
});

test('Monkey Tumble catalog and legacy URL still resolve to canonical game',()=>{
  const game=catalog.games.find(g=>g.id==='toddler_monkey_vines');
  assert.ok(game);
  assert.equal(game.href,'games/toddler_monkey_vines/몽키 쏙쏙!.html');
  assert.match(legacy,/games\/toddler_monkey_vines/);
});
