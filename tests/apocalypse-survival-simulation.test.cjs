const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'games','high_apocalypse_survival','game.js'),'utf8');

function survivalSimulation(){
  const s={wood:0,stone:0,dirty:0,clean:0,food:1,potato:1,cooked:0,scrap:0,battery:0,cloth:0,flashlight:0,axe:false,power:false,buildings:new Set(),residents:0,storage:{}};
  const spend=(cost,label)=>{
    for(const [k,v] of Object.entries(cost))assert.ok((s[k]||0)>=v,label+' lacks '+k);
    for(const [k,v] of Object.entries(cost))s[k]-=v;
  };
  const trees=n=>s.wood+=n*(s.axe?2:1);
  const rocks=n=>s.stone+=n;

  // Day 1: tutorial water loop uses the one-shot emergency burner.
  s.dirty++; s.dirty--; s.clean++; s.clean--;
  assert.equal(s.clean,0);

  // Day 2: craft an axe, campfire and cook the starting potato.
  trees(3); rocks(2); spend({wood:3,stone:2},'axe'); s.axe=true;
  trees(2); rocks(4); spend({wood:3,stone:4},'campfire'); s.buildings.add('campfire');
  spend({wood:1,potato:1},'cook'); s.cooked++;

  // Day 3: shelter.
  trees(4); rocks(4); spend({wood:8,stone:4},'shelter'); s.buildings.add('shelter');

  // Day 4: ruined-city crate and emergency grid.
  s.scrap+=3; s.battery++; s.cloth++; s.food+=2; s.flashlight=1;
  spend({scrap:2,battery:1},'power'); s.power=true;

  // Day 5-7: technician works twice, stock two waters and survive the flood.
  s.residents=1; s.scrap+=2;
  trees(1); s.dirty+=2; spend({wood:2},'boil fuel'); s.dirty-=2; s.clean+=2;
  assert.ok(s.clean>=2 && s.food+s.cooked>=2 && s.buildings.has('shelter') && s.power,'day 7 readiness');

  // Settlement scavenging: market, clinic, garage (garage must contain the second battery).
  s.residents=3;
  s.food+=2; s.potato+=2;
  s.cloth+=2; s.food+=1;
  s.scrap+=2; s.wood+=1; s.battery+=1;

  trees(2); rocks(1); spend({wood:4,stone:1},'farm'); s.buildings.add('farm');
  rocks(2); spend({cloth:2,scrap:2,stone:2},'purifier'); s.buildings.add('purifier');
  if(s.wood<2)trees(1); spend({wood:2,scrap:3,battery:1},'cooler'); s.buildings.add('cooler');

  // Purifier can establish the final reserve without fuel.
  s.dirty+=4; s.dirty-=4; s.clean+=4;
  assert.ok(s.clean>=4,'settlement water reserve');
  assert.ok(s.food+s.potato+s.cooked>=6,'settlement food reserve');
  assert.equal(s.residents,3);
  for(const id of ['campfire','shelter','farm','purifier','cooler'])assert.ok(s.buildings.has(id),id);
  return s;
}

test('conservative seven-day route reaches the settlement without negative resources',()=>{
  assert.match(js,/garageLocker:\{site:'garage',name:'금속 보관함',loot:\{wood:1,battery:1\}/);
  const s=survivalSimulation();
  for(const key of ['wood','stone','dirty','clean','food','potato','cooked','scrap','battery','cloth','flashlight'])assert.ok(s[key]>=0,key);
  assert.equal(s.flashlight,1,'day 4 crate must provide a flashlight');
});

test('settlement power budget forces a meaningful radio tradeoff',()=>{
  const capacity=2.4;
  const light=.2,cooler=.8,purifier=1.2,radio=.8;
  assert.ok(light+cooler+purifier<=capacity,'normal settlement loads fit');
  assert.ok(light+cooler+purifier+radio>capacity,'radio should require shedding a load');
  assert.ok(light+cooler+radio<=capacity,'turning purifier off makes radio possible');
  assert.match(js,/powerKw=2\.4/);
  assert.match(js,/powerUse\(\.8\)>game\.powerKw/);
});

test('tutorial is action-driven and cannot deadlock after doing an action early',()=>{
  assert.match(js,/const TUTORIAL=\[/);
  for(const signal of ["tutorialSignal('move'","tutorialSignal('camera'","tutorialSignal('water'","tutorialSignal('boil'","tutorialSignal('drink'"])assert.ok(js.includes(signal),signal);
  assert.match(js,/s===3&&game\.flags\.water/);
  assert.match(js,/s===4&&game\.flags\.boil/);
  assert.match(js,/s===5&&game\.flags\.drink/);
  assert.match(js,/skipTutorial/);
});


test('road graph crosses the bridge before entering the ruined city',()=>{
  for(const token of ["['mainCross','bridgeW']","['bridgeW','bridgeE']","['bridgeE','cityWest']","['cityMid','clinic']","['citySouth','garage']"])assert.ok(js.includes(token),token);
  assert.match(js,/BRIDGE_Z=-27/);
  assert.match(js,/Math\.abs\(z-BRIDGE_Z\)>3\.5/);
});

test('ruin exploration preserves the settlement-critical loot budget',()=>{
  assert.match(js,/marketShelf:\{site:'market'.*loot:\{food:2\}/s);
  assert.match(js,/marketBack:\{site:'market'.*loot:\{potato:2\}/s);
  assert.match(js,/clinicCabinet:\{site:'clinic'.*loot:\{cloth:2\}/s);
  assert.match(js,/garageBench:\{site:'garage'.*loot:\{scrap:2\}/s);
  assert.match(js,/garageLocker:\{site:'garage'.*battery:1/s);
});


test('common storage remains valid community stock while crafting still needs carried items',()=>{
  const bag={cleanWater:0,food:1,potato:0,cookedPotato:0,wood:0,scrap:0},storage={cleanWater:3,food:1,potato:1,cookedPotato:0,wood:6,scrap:2};
  const stock=id=>(bag[id]||0)+(storage[id]||0);
  assert.ok(stock('cleanWater')>=2,'stored water counts for flood readiness');
  assert.ok(stock('food')+stock('potato')+stock('cookedPotato')>=2,'stored food counts for flood readiness');
  assert.equal(bag.wood,0,'building materials still have to be withdrawn before crafting');
  assert.match(js,/function stock\(id\)/);
  assert.match(js,/function depositStorage/);
  assert.match(js,/function withdrawStorage/);
  assert.match(js,/readyFlood\(\).*stock\('cleanWater'\)/s);
});

test('resident production is routed into the storehouse once it exists',()=>{
  assert.match(js,/if\(storageBuilt\(\)\)\{game\.storage\.scrap/);
  assert.match(js,/game\.storage\.wood/);
  assert.match(js,/game\.storage\.stone/);
  assert.match(js,/공동창고에/);
});

test('specialist companions reduce ruin-event damage and guarantee a search bonus',()=>{
  const base=9,specialist=Math.ceil(base*.25);
  assert.equal(specialist,3);
  assert.ok(specialist<base);
  assert.match(js,/SITE_SKILL=\{market:'gatherer',clinic:'medic',garage:'technician'\}/);
  assert.match(js,/damage=help\?Math\.ceil\(ev\.damage\*\.25\):ev\.damage/);
  assert.match(js,/const specialist=companionMatches\(info\.site\)/);
  assert.match(js,/specialist\?1:/);
});

test('flashlight is acquired before deep ruin exploration and recharges from restored power',()=>{
  assert.match(js,/game\.inv\.flashlight=1/);
  assert.match(js,/flashlightCharge=Math\.max\(100/);
  assert.match(js,/game\.flashlightCharge=Math\.max\(0,\(game\.flashlightCharge\|\|0\)-dt\*\.075\)/);
  assert.match(js,/game\.flags\.power&&game\.inv\.flashlight/);
  assert.match(js,/SpotLight\(0xfff3cf,0,30/);
});

test('ruin noise produces a deterministic one-time hazard per site',()=>{
  assert.match(js,/function seedHash/);
  assert.match(js,/function ruinEventFor/);
  assert.match(js,/game\.ruinNoise>=70/);
  assert.match(js,/const key='ruinEvent_'\+site/);
  assert.match(js,/discover\('vibrationRisk'\)/);
});
