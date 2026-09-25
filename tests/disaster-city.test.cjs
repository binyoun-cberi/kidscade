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
 assert.match(sim,/Math\.exp\(-t\/180\)/);
 assert.match(sim,/\.52/);
 assert.match(disasters,/strength:p/);
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
 assert.equal(item.href,'games/high_disaster_city/index.html?v=9');
 assert.equal(item.title,'이머전시티');
 assert.equal(item.age,'high');
});

test('Disaster City renderer declares citizen movement targets locally',()=>{
 const renderer=fs.readFileSync(path.join(game,'renderer.js'),'utf8');
 assert.match(renderer,/const\\s+targets\\s*=\\s*\\[D\\.TOWN_X/);
 assert.doesNotMatch(renderer,/lastCitizenTime\\s*=\\s*s\\.time\\s*,\\s*targets\\s*=/);
});

test('Disaster City core simulation supports upgrades, deck cleanup and spatial defense',()=>{
 const vm=require('node:vm');
 const context={console,performance:{now:()=>0},window:{}};
 context.window.window=context.window;
 vm.createContext(context);
 for(const file of ['game-data.js','sim-core.js','disaster-system.js']){
  vm.runInContext(fs.readFileSync(path.join(game,file),'utf8'),context,{filename:file});
 }
 const Sim=context.window.DisasterCity.Simulation,sim=new Sim();
 sim.start({seed:12345});
 sim.state.money=9999;
 sim.state.hand=[{id:'house',uid:9001}];
 sim.state.deck=[];sim.state.discard=[];
 sim.selectCard(9001);assert.equal(sim.placeSelected(0),true);
 sim.state.hand=[{id:'house',uid:9002}];
 sim.selectCard(9002);assert.equal(sim.placeSelected(0),true);
 assert.equal(sim.state.slots[0].building.level,2);
 sim.state.hand=[{id:'farm',uid:9003}];
 sim.selectCard(9003);assert.equal(sim.placeSelected(0),true);
 assert.equal(sim.state.slots[0].building.id,'farm');
 sim.state.slots[1].building={id:'pump',hp:105,maxHp:105,level:1};
 assert.ok(sim.supportPower('pump','left',.5)>0);
 assert.equal(sim.supportPower('pump','right',.5),0);
 sim.state.deck=['house','farm','market','repair','ration','levee','fireStation','sandbags','fireBrigade'];
 sim.state.hand=[];sim.state.discard=[];
 const rewards=sim.makeRewards();
 assert.ok(rewards.some(x=>x.kind==='cleanup'));
});

test('Disaster City floods end naturally and urgent repair prioritizes the blocking levee',()=>{
 const vm=require('node:vm');
 const context={console,performance:{now:()=>0},window:{}};
 context.window.window=context.window;
 vm.createContext(context);
 for(const file of ['game-data.js','sim-core.js','disaster-system.js']){
  vm.runInContext(fs.readFileSync(path.join(game,file),'utf8'),context,{filename:file});
 }
 const Sim=context.window.DisasterCity.Simulation,sim=new Sim();
 sim.start({seed:777});
 sim.state.next={side:'left',type:'flood',in:0,visible:true};
 sim.update(1/30);
 const flood=sim.state.disasters[0];
 assert.ok(flood&&flood.type==='flood');
 assert.ok(Number.isFinite(flood.maxAge)&&flood.maxAge<=55);
 const floodId=flood.id,maxAge=flood.maxAge;
 sim.state.next.in=999;
 for(let i=0;i<Math.ceil((maxAge+1)*30);i++){
  sim.state.stability=100;
  sim.update(1/30);
 }
 assert.equal(sim.state.disasters.some(d=>d.id===floodId),false,'a flood must not linger forever');
 assert.ok(sim.state.stats.resolved>=1);

 sim.state.disasters=[{id:'repair-test',type:'flood',side:'left',progress:.35,blockedSlot:1,energy:50,maxEnergy:50,age:1,maxAge:40,strength:1}];
 sim.state.slots[1].building={id:'levee',hp:30,maxHp:150,level:1};
 sim.state.slots[2].building={id:'farm',hp:1,maxHp:85,level:1};
 sim.state.hand=[{id:'repair',uid:9999}];
 sim.state.deck=[];sim.state.discard=[];sim.state.money=500;
 const beforeLevee=sim.state.slots[1].building.hp,beforeFarm=sim.state.slots[2].building.hp;
 assert.equal(sim.playAction(9999),true);
 assert.ok(sim.state.slots[1].building.hp>beforeLevee,'blocking levee should be repaired first');
 assert.equal(sim.state.slots[2].building.hp,beforeFarm,'other damaged buildings should wait while a levee is actively blocking floodwater');
});

test('Disaster City wildfire also ends naturally, rewards preserve the rest timer, and streaks are capped',()=>{
 const vm=require('node:vm');
 const context={console,performance:{now:()=>0},window:{}};
 context.window.window=context.window;
 vm.createContext(context);
 for(const file of ['game-data.js','sim-core.js','disaster-system.js']){
  vm.runInContext(fs.readFileSync(path.join(game,file),'utf8'),context,{filename:file});
 }
 const Sim=context.window.DisasterCity.Simulation,sim=new Sim();
 sim.start({seed:778});
 sim.state.next={side:'left',type:'wildfire',in:0,visible:true};
 sim.update(1/30);
 const fire=sim.state.disasters[0];
 assert.ok(fire&&fire.type==='wildfire');
 assert.ok(Number.isFinite(fire.maxAge)&&fire.maxAge<=50);
 const fireId=fire.id,maxAge=fire.maxAge;
 sim.state.next.in=999;
 for(let i=0;i<Math.ceil((maxAge+1)*30);i++){
  sim.state.stability=100;
  sim.update(1/30);
 }
 assert.equal(sim.state.disasters.some(d=>d.id===fireId),false,'a wildfire must not linger forever');

 sim.state.disasters=[];
 sim.state.rewardChoices=[{kind:'add',id:'farm'}];
 sim.state.cleanupChoices=[];
 sim.state.next.in=11;
 context.window.DisasterCity.Disasters.update(sim,2);
 assert.equal(sim.state.next.in,11,'reward choice should not consume the next-wave rest timer');
 sim.state.rewardChoices=[];
 context.window.DisasterCity.Disasters.update(sim,2);
 assert.ok(sim.state.next.in<11,'next-wave timer should resume after reward choice');

 sim.state.lastType=null;sim.state.typeStreak=0;
 sim.scheduleNext({side:'left',type:'flood'});
 sim.scheduleNext({side:'right',type:'flood'});
 assert.equal(sim.state.typeStreak,2);
 assert.equal(sim.state.next.type,'wildfire','three identical disasters in a row should be prevented');
});

test('Disaster City survives a long deterministic stress simulation without invalid state',()=>{
 const vm=require('node:vm');
 const context={console,performance:{now:()=>0},window:{}};
 context.window.window=context.window;
 vm.createContext(context);
 for(const file of ['game-data.js','sim-core.js','disaster-system.js']){
  vm.runInContext(fs.readFileSync(path.join(game,file),'utf8'),context,{filename:file});
 }
 const Sim=context.window.DisasterCity.Simulation,sim=new Sim();
 sim.start({seed:24680});
 let maxConcurrent=0;
 for(let i=0;i<20*60*30;i++){
  sim.state.money=Math.max(sim.state.money,500);
  sim.state.food=Math.max(sim.state.food,100);
  sim.state.stability=Math.max(sim.state.stability,80);
  sim.update(1/30);
  maxConcurrent=Math.max(maxConcurrent,sim.state.disasters.length);
  assert.ok(Number.isFinite(sim.state.money));
  assert.ok(Number.isFinite(sim.state.food));
  assert.ok(Number.isFinite(sim.state.population));
  assert.ok(Number.isFinite(sim.state.stability));
  assert.ok(sim.state.hand.length<=5);
  assert.ok(sim.state.disasters.length<=2);
  for(const d of sim.state.disasters){
   assert.ok(Number.isFinite(d.energy));
   assert.ok(Number.isFinite(d.progress));
   assert.ok(d.progress>=0&&d.progress<=1);
  }
 }
 assert.ok(maxConcurrent>=2,'late game should permit overlapping left/right disasters');
});