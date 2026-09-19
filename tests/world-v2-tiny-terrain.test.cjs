const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const world=fs.readFileSync(path.join(root,'world-v2','kidscade-world.html'),'utf8');
const terrain=fs.readFileSync(path.join(root,'world-v2','kidscade-world-tiny-tiles.js'),'utf8');

test('Tiny terrain bridge parses and is loaded by World v2',()=>{
  const r=spawnSync(process.execPath,['--check'],{input:terrain,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr||r.stdout);
  assert.match(world,/kidscade-world-tiny-tiles\.js\?v=1/);
  assert.match(terrain,/GRID:48/);
  assert.match(terrain,/const TILE=16/);
});

test('Tiny Farm and Tiny Town atlases are committed',()=>{
  const files=[
    ['kenney-tiny-farm','atlas','tilemap-packed.png'],
    ['kenney-tiny-town','atlas','tilemap-packed.png']
  ];
  for(const parts of files){
    assert.ok(fs.existsSync(path.join(root,'assets','game','2d','tilesets',...parts)),parts.join('/'));
  }
  assert.match(terrain,/kenney-tiny-farm\/atlas\/tilemap-packed\.png/);
  assert.match(terrain,/kenney-tiny-town\/atlas\/tilemap-packed\.png/);
});

test('Terrain selection rejects sprite-like transparent cells',()=>{
  assert.match(terrain,/coverage>\.985/);
  for(const kind of ['grass','soil','water','path'])assert.match(terrain,new RegExp('palette\\.'+kind));
});

test('Outdoor ground uses tiled terrain with BQ3 fallback',()=>{
  assert.match(world,/terrain\('grass',0,0,3360,1536\)/);
  assert.match(world,/terrain\('path',0,690,3360,144,'path'\)/);
  assert.match(world,/terrain\('soil',x,y,190,205,'soil'\)/);
  assert.match(world,/terrain\('water',60,1190,540,220,'water'\)/);
  assert.match(world,/D\.fill\(g,fallback,x,y,w,h\)/);
  assert.match(world,/K\.TinyTiles\?\.onReady/);
});

test('World v2 terrain pass remains available in the stability fallback',()=>{
  assert.match(world,/kidscade-world-tiny-tiles\.js\?v=1/);
});
