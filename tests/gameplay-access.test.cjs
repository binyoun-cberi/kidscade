const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const raft = fs.readFileSync(path.join(root, '블록래프트.html'), 'utf8');
const noop = () => {};
function loadFunctions(names, context) {
  const code = names.map(name => {
    const match = raft.match(new RegExp('^  function ' + name + '\\([^]*?^  }', 'm'));
    assert.ok(match, name);
    return match[0];
  }).join('\n');
  vm.createContext(context);
  vm.runInContext(code, context);
  return context;
}
function raftContext() {
  const ctx = { audio: {good: noop, collect: noop, place: noop}, toast: noop, renderUI: noop, saveGame: noop,
    checkMissions: noop, lessonOnce: noop, updateFacilityVisual: noop, maxStoredWater: () => 6,
    countStructures: () => 1, closePanels: () => ctx.activePanel = null,
    openPanel: name => ctx.activePanel = name, selectTool: id => ctx.selectedTool = id };
  loadFunctions(['freshState', 'craftAvailable', 'executeCraft', 'updateCooking', 'eatMeal', 'drinkWater'], ctx);
  ctx.state = ctx.freshState();
  ctx.craftRecipes = [];
  ctx.canAfford = cost => Object.entries(cost).every(([k,v]) => ctx.state.inventory[k] >= v);
  ctx.payCost = cost => Object.entries(cost).forEach(([k,v]) => ctx.state.inventory[k] -= v);
  ctx.craftStatus = () => 'unavailable';
  ctx.shark = {phase:'idle'};
  return ctx;
}
test('caught fish is cooked and collected by interacting with a grill', () => {
  const c = raftContext(); let saved = null;
  c.saveGame = () => saved = structuredClone(c.state);
  c.fishing = {species:{name:'test fish',quantity:2}};
  c.finishFishing = () => c.fishing.phase = 'idle';
  loadFunctions(['landFish','interactFacility','updateCooking'], c);
  c.landFish(); assert.equal(c.state.inventory.fish,2);
  c.state.inventory.wood = 2;
  const grill={id:1,type:'grill',x:0,z:0,level:0,cookRemaining:0,cookReady:false};
  c.state.structures=[grill];
  c.interactFacility(grill);
  assert.equal(c.state.inventory.fish,1);
  assert.equal(c.state.inventory.wood,1);
  assert.equal(grill.cookRemaining,8);
  assert.equal(c.state.inventory.cookedFish,0);
  c.updateCooking(8.1);
  assert.equal(grill.cookReady,true);
  assert.equal(c.state.inventory.cookedFish,0);
  c.interactFacility(grill);
  assert.equal(grill.cookReady,false);
  assert.equal(c.state.inventory.cookedFish,1);
  c.state.hunger=40; c.eatMeal();
  assert.equal(c.state.hunger,78); assert.equal(c.state.counts.ateMeal,1);
  assert.equal(saved.inventory.cookedFish,0); assert.equal(saved.counts.ateMeal,1);
});
test('food action guides players to rod, grill, and direct facility interaction without consuming raw fish', () => {
  const c=raftContext(); c.eatMeal(); assert.equal(c.selectedTool,'rod');
  c.state.inventory.fish=1; c.countStructures=()=>0; c.eatMeal();
  assert.equal(c.activePanel,'build'); assert.equal(c.selectedBuild,'grill');
  c.countStructures=()=>1; c.state.structures=[{id:1,type:'grill',x:0,z:0,level:0,cookRemaining:0,cookReady:false}];
  c.eatMeal(); assert.equal(c.activePanel,null);
  assert.equal(c.state.inventory.fish,1);
});
test('facility cooking pauses under help and collapse overlays', () => {
  const c=raftContext(); const grill={id:1,type:'grill',x:0,z:0,level:0,cookRemaining:8,cookReady:false}; c.state.structures=[grill];
  Object.assign(c,{running:true,activePanel:'craft',lastFrame:0,requestAnimationFrame:noop,
    ui:{helpScreen:{classList:{contains:()=>false}},collapseScreen:{classList:{contains:()=>true}}},
    updateEnvironment:noop,updateStructureAnimation:noop,updateCamera:noop,updateAimHint:noop,
    renderer:{render:noop},scene:{},camera:{}});
  loadFunctions(['animate'],c); c.animate(50); assert.equal(grill.cookRemaining,8);
});
test('water must be collected from a purifier instead of appearing in inventory automatically', () => {
  const c=raftContext();
  loadFunctions(['interactFacility'],c);
  const purifier={id:2,type:'purifier',x:0,z:0,level:0,storedWater:1,waterTimer:27};
  c.state.structures=[purifier]; c.state.inventory.water=0; c.state.counts.waterCollected=0;
  c.interactFacility(purifier);
  assert.equal(purifier.storedWater,0);
  assert.equal(c.state.inventory.water,1);
  assert.equal(c.state.counts.waterCollected,1);
});
test('duel entry works in launcher iframe and is absent only inside active duel', () => {
  const code=fs.readFileSync(path.join(root,'patience-tower-duel-entry.js'),'utf8');
  for (const embedded of [false,true]) {
    let inserted; const card={querySelector:()=>null,appendChild:el=>inserted=el};
    const window={top:{},self:{},__patienceDuelEmbedded:embedded,location:{}};
    const document={querySelector:()=>card,getElementById:()=>null,
      createElement:()=>({style:{},append(...children){this.children=children;},addEventListener(type,fn){this[type]=fn;}})};
    vm.runInNewContext(code,{window,document});
    assert.equal(Boolean(inserted),!embedded);
    if(inserted){inserted.children[0].click();assert.equal(window.location.href,'/games/patience-tower-duel/?v=20260918-1');}
  }
});
test('source and built tower include exactly one entry script', () => {
  for(const rel of ['인내의 탑.html','dist/인내의 탑.html']) {
    const file=path.join(root,rel); if(!fs.existsSync(file))continue;
    assert.equal((fs.readFileSync(file,'utf8').match(/<script src="\/patience-tower-duel-entry\.js/g)||[]).length,1);
  }
});
test('all modified inline game scripts parse', () => {
  for(const rel of ['블록래프트.html','인내의 탑.html','games/patience-tower-duel/index.html']) {
    for(const match of fs.readFileSync(path.join(root,rel),'utf8').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (/type=["']importmap["']/i.test(match[1])) continue;
      if (match[2].trim()) new vm.Script(match[2],{filename:rel});
    }
  }
});
test('Blockraft connects the existing CC0 3D library without making gameplay depend on it', () => {
  for(const rel of [
    'assets/game/platformer/platforms/floor_wood_1x1.glb',
    'assets/game/3d/buildings/kenney-building-kit/wall.glb',
    'assets/game/3d/buildings/kenney-building-kit/column.glb',
    'assets/game/3d/buildings/kenney-building-kit/stairs-open.glb',
    'assets/game/3d/interiors/modular-sushi-restaurant-kit/wood-floor.glb',
    'assets/game/3d/interiors/modular-sushi-restaurant-kit/red-wood-wall.glb',
    'assets/game/3d/city/poly-pizza-city-pack/box.glb',
    'assets/game/3d/interiors/modular-sushi-restaurant-kit/table.glb',
    'assets/game/food/barrel.glb',
    'assets/game/food/soda-bottle.glb',
    'assets/game/3d/nature/kenney-nature-kit/tree-palm.glb'
  ]) assert.ok(fs.existsSync(path.join(root,rel)), 'missing Blockraft asset '+rel);
  assert.match(raft,/type="importmap"/);
  assert.match(raft,/function loadBlockraftAsset/);
  assert.match(raft,/function enhanceStructureVisual/);
  assert.match(raft,/function interactiveFacilityNearPlayer/);
  assert.match(raft,/function interactFacility/);
  assert.match(raft,/function facilityHint/);
  assert.doesNotMatch(raft,/id: 'cook', name: '생선 굽기'/);

  assert.match(raft,/GLTF loader unavailable; using procedural fallbacks/);
  assert.match(raft,/floor_wood_1x1\.glb/);
  assert.match(raft,/red-wood-wall\.glb/);
  assert.match(raft,/stairs-open\.glb/);
  assert.match(raft,/tree-palm\.glb/);
  assert.match(raft,/soda-bottle\.glb/);
});
test('Blockraft advertised utility buildings have working simulation effects', () => {
  assert.match(raft,/maxStoredWater[\s\S]*countStructures\('storage'\)/);
  assert.match(raft,/maxEnergy[\s\S]*countStructures\('battery'\)/);
  assert.match(raft,/centerStructureAt\(cell\.x,cell\.z,0\)\?\.type === 'wall'/);
  assert.match(raft,/countStructures\('waveBreaker'\)/);
  assert.match(raft,/countStructures\('anchor'\).*\.82/);
  assert.match(raft,/anchorDamping/);
  assert.match(raft,/countStructures\('lightningRod'\)/);
  assert.match(raft,/countStructures\('sail'\) \* \.08/);
  assert.match(raft,/state\.structures\.filter\(\(s\) => s\.type === 'net'\)/);
});
