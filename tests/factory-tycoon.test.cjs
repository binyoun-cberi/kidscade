const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','high_factory_tycoon');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dir,'factory-tycoon.css'),'utf8');
const js=fs.readFileSync(path.join(dir,'factory-tycoon.js'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));

test('Factory Tycoon is registered as a high-grade thinking sandbox',()=>{
  const game=catalog.games.find(g=>g.id==='high_factory_tycoon');
  assert.ok(game);
  assert.equal(game.title,'공장 타이쿤');
  assert.equal(game.age,'high');
  assert.equal(game.subject,'thinking');
  assert.equal(game.genre,'sandbox');
  assert.deepEqual(game.input,['touch','keyboard']);
  assert.equal(game.href,'games/high_factory_tycoon/index.html?v=1');
});

test('Factory Tycoon uses the common game shell and local Three runtime',()=>{
  assert.match(html,/kidscade-game-sdk\.js/);
  assert.match(html,/data-game-id="high_factory_tycoon"/);
  assert.match(html,/data-shell="true"/);
  assert.match(html,/three-r160\/three\.module\.js/);
  assert.match(js,/from 'three'/);
  assert.match(js,/GLTFLoader/);
});

test('Factory Tycoon includes the planned automation systems',()=>{
  for(const pattern of [
    /type:'belt'/,
    /assembler/,
    /slicer/,
    /toaster/,
    /packer/,
    /splitter/,
    /merger/,
    /cross/,
    /function tickSuppliers/,
    /function tickMachines/,
    /function tickItems/,
    /function shipItem/,
    /function openDiscovery/,
    /function toggleAnalysis/,
    /function saveGame/
  ]) assert.match(js,pattern);
  assert.match(js,/MAX_ITEMS=360/);
  assert.match(js,/TICK=1\/20/);
});

test('Factory Tycoon is touch-first and keeps construction free',()=>{
  assert.match(css,/touch-action:none/);
  assert.match(js,/pointerdown/);
  assert.match(js,/activePointers/);
  assert.match(js,/beginTouchPan/);
  assert.doesNotMatch(js,/buildCost|constructionCost|canAfford/);
});

test('Factory Tycoon reuses Kidscade food and bakery assets',()=>{
  const required=[
    'assets/game/3d/bakery/baked-goods/bread-slice.glb',
    'assets/game/food/cheese-cut.glb',
    'assets/game/food/tomato.glb',
    'assets/game/food/tomato-slice.glb',
    'assets/game/food/egg.glb',
    'assets/game/food/egg-cooked.glb',
    'assets/game/food/bacon-raw.glb',
    'assets/game/food/bacon.glb',
    'assets/audio/sfx/bakery/bread-slice-01.mp3'
  ];
  for(const rel of required)assert.ok(fs.existsSync(path.join(root,rel)),rel);
});
