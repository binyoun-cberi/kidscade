const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','high_little_world');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dir,'style.css'),'utf8');
const sim=fs.readFileSync(path.join(dir,'sim.js'),'utf8');
const game=fs.readFileSync(path.join(dir,'game.js'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));

test('Little World is registered as a high-grade science sandbox',()=>{
  const g=catalog.games.find(x=>x.id==='high_little_world');
  assert.ok(g);assert.equal(g.title,'작은 세계');assert.equal(g.age,'high');assert.equal(g.subject,'science');assert.equal(g.genre,'sandbox');assert.deepEqual(g.input,['touch','keyboard']);
});
test('Little World uses the local Three runtime and common game shell',()=>{
  assert.match(html,/three-r160\/three\.module\.js/);assert.match(html,/kidscade-game-sdk\.js/);assert.match(html,/data-game-id="high_little_world"/);assert.match(css,/touch-action:none/);
});
test('simulation is separated from rendering and contains world reactions',()=>{
  assert.doesNotMatch(sim,/from 'three'/);assert.match(sim,/export class WorldSim/);assert.match(sim,/const COLS=32/);assert.match(sim,/const ROWS=24/);
  for(const token of ['waterStep()','climateStep()','fireStep()','ecologyStep()','settlementStep()','rebuildRoads()','updateBiomes()','foundChildSettlement'])assert.ok(sim.includes(token),token);
});
test('god powers include terrain climate life civilization and disasters',()=>{
  for(const token of ["type==='raise'","type==='lower'","type==='rain'","type==='sun'","type==='plants'","type==='herbivore'","type==='predator'","type==='human'","type==='blessing'","type==='lightning'","type==='fire'","type==='drought'","type==='meteor'"])assert.ok(sim.includes(token),token);
  for(const cat of ['terrain','climate','life','civilization','disaster'])assert.match(html,new RegExp('data-category="'+cat+'"'));
});
test('renderer reuses Kidscade nature animal people and city GLBs',()=>{
  for(const token of ['tree-default.glb','animal-deer.glb','animal-fox.glb','character-male-a.glb','character-female-b.glb','building-type-a.glb','building-type-f.glb','GLTFLoader','SkeletonUtils','InstancedMesh'])assert.ok(game.includes(token),token);
});
test('game supports touch camera time acceleration tutorial and saving',()=>{
  for(const token of ['pointerdown','pointermove','pointerup','wheel','function saveGame','function loadGame','TUTORIAL','localStorage'])assert.ok(game.includes(token),token);
  assert.match(html,/data-speed="6"/);
});

test('Little World browser modules parse after removing ESM declarations',()=>{
  assert.doesNotThrow(()=>new Function(sim.replace(/^export /gm,'')));
  assert.doesNotThrow(()=>new Function(game.replace(/^import .*;$/gm,'')));
});
test('animals do not appear from vegetation until introduced',()=>{
  const make=new Function(sim.replace(/^export /gm,'')+';return {WorldSim};');
  const {WorldSim}=make(),world=new WorldSim(77);
  world.applyPower('plants',16,12);
  for(let i=0;i<80;i++)world.step();
  assert.equal(world.stats().herb,0);
  assert.equal(world.stats().pred,0);
});

test('Little World simulation survives a deterministic ecosystem smoke run',()=>{
  const make=new Function(sim.replace(/^export /gm,'')+';return {WorldSim,COLS,ROWS};');
  const {WorldSim,COLS,ROWS}=make(),world=new WorldSim(12345);
  world.applyPower('raise',16,12);world.applyPower('rain',16,12);world.applyPower('plants',16,12);
  for(let i=0;i<25;i++)world.step();
  const home=world.cells.find(c=>!c.sea&&[c,...world.neighbors(c)].some(q=>q.sea||q.water>.13));
  assert.ok(home);
  world.applyPower('herbivore',home.x,home.z);world.applyPower('human',home.x,home.z);
  for(let i=0;i<120;i++)world.step();
  assert.equal(world.cells.length,COLS*ROWS);
  assert.ok(world.cells.every(c=>['height','water','moisture','fertility','temperature','vegetation','herb','pred','fire'].every(k=>Number.isFinite(c[k]))));
  assert.ok(world.settlements.every(s=>Number.isFinite(s.pop)&&Number.isFinite(s.food)));
  assert.ok(world.settlements.some(s=>s.level>=1),'settlement should reach village level during the smoke run');
  assert.ok(world.stats().herb>=0);
});
