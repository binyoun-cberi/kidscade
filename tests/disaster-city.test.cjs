const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const game=path.join(root,'games','high_disaster_city');
const files=['game-data.js','sim-core.js','disaster-system.js','renderer.js','ui.js','main.js'];

test('Disaster City browser scripts parse',()=>{
 for(const file of files){
  const src=fs.readFileSync(path.join(game,file),'utf8');
  const r=spawnSync(process.execPath,['--check'],{input:src,encoding:'utf8'});
  assert.equal(r.status,0,file+' parse failed: '+r.stderr);
 }
});

test('Disaster City keeps simulation and rendering separated',()=>{
 const sim=fs.readFileSync(path.join(game,'sim-core.js'),'utf8');
 const disasters=fs.readFileSync(path.join(game,'disaster-system.js'),'utf8');
 assert.doesNotMatch(sim,/document\./);
 assert.doesNotMatch(disasters,/document\./);
 assert.doesNotMatch(sim,/setInterval|setTimeout/);
 assert.match(disasters,/wildfire/);
 assert.match(disasters,/flood/);
});

test('Disaster City has twelve build slots and safe shared storage',()=>{
 const data=fs.readFileSync(path.join(game,'game-data.js'),'utf8');
 const sim=fs.readFileSync(path.join(game,'sim-core.js'),'utf8');
 const slots=(data.match(/SLOT_X=\[([^\]]+)\]/)||[])[1].split(',').filter(Boolean);
 assert.equal(slots.length,12);
 assert.match(sim,/KidscadeStorage/);
 assert.doesNotMatch(sim,/localStorage/);
});

test('Disaster City tracked assets exist',()=>{
 for(const rel of [
  'assets/game/2d/platformer-art/expansions/buildings/house-beige.png',
  'assets/game/2d/platformer-art/expansions/buildings/roof-red-mid.png',
  'assets/game/2d/platformer-art/base/tiles/liquid-water-top-mid.png',
  'assets/game/effects/particles/kenney-particle-pack/fire-01.png',
  'assets/game/effects/particles/kenney-particle-pack/smoke-01.png',
  'assets/game/characters/people/kenney-platformer-characters/player/poses/player-stand.png'
 ]) assert.ok(fs.existsSync(path.join(root,rel)),'missing '+rel);
});

test('Disaster City is registered in the game catalog',()=>{
 const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
 const item=catalog.games.find(g=>g.id==='high_disaster_city');
 assert.ok(item);
 assert.equal(item.href,'games/high_disaster_city/index.html?v=1');
 assert.equal(item.age,'high');
});