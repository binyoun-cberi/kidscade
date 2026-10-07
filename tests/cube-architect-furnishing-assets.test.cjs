'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const assets=read('games/cube3d/cube-architect-world-assets.js');
const main=read('games/cube3d/cube-architect.js');
const rulesSource=read('games/cube3d/cube-architect-world.js');
const index=read('games/cube3d/index.html');

test('Cube Architect asset loader adds on-demand, floor-aligned furniture and survival GLBs',()=>{
  assert.doesNotThrow(()=>new Function(assets.replace(/^import.*$/gm,'')));
  const modelNames=[
    'interiors/kenney-furniture-kit/chair.glb',
    'interiors/kenney-furniture-kit/desk.glb',
    'interiors/kenney-furniture-kit/bookcase-open.glb',
    'interiors/kenney-furniture-kit/bed-single.glb',
    'interiors/kenney-furniture-kit/lounge-sofa.glb',
    'interiors/kenney-furniture-kit/bench.glb',
    'interiors/kenney-furniture-kit/table-coffee.glb',
    'interiors/kenney-furniture-kit/lamp-round-floor.glb',
    'interiors/kenney-furniture-kit/rug-round.glb',
    'survival/kenney-survival-kit/workbench.glb',
    'survival/kenney-survival-kit/chest.glb',
    'survival/kenney-survival-kit/box-large.glb',
    'survival/kenney-survival-kit/campfire-pit.glb',
    'survival/kenney-survival-kit/fence.glb',
    'survival/kenney-survival-kit/tent-canvas.glb',
    'survival/kenney-survival-kit/bedroll.glb'
  ];
  for(const file of modelNames)assert.ok(fs.existsSync(path.join(root,'assets/game/3d',file)),'missing '+file);
  assert.match(assets,/function loadPlacement\(key\)/);
  assert.match(assets,/floorCentered:true/);
  assert.match(assets,/Math\.min\(\(spec\.height\|\|1\)\/h,spec\.footprint/);
  assert.match(main,/if\(worldMeshMap\.get\(key\)!==root\|\|getBlock\(x,y,z\)\?\.type!==type\)return/);
  assert.match(main,/registerWorldObject\(model,key,x,y,z,type\)/);
});

test('recipes connect buildable furniture and campsites without removing old home recipes',()=>{
  const context={window:{}};new Function('window',rulesSource)(context.window);
  const recipes=context.window.CubeArchitectWorld.RECIPES;
  const ids=new Set(recipes.map(r=>r.id));
  for(const id of ['workbench','chest','bed','chair','desk','bookshelf','sign','sofa','bench','coffeeTable','floorLamp','rug','crate','campfire','fence','tent','bedroll'])assert.ok(ids.has(id),id);
  for(const id of ['sofa','bench','coffeeTable','floorLamp','rug','crate','campfire','fence','tent','bedroll']){
    const recipe=recipes.find(r=>r.id===id);
    assert.equal(recipe.bench,true,id+' needs a workbench');
    assert.ok(recipe.needs&&Object.keys(recipe.needs).length,id+' needs resources');
    assert.equal(recipe.gives[id]>0,true);
  }
  assert.doesNotThrow(()=>new Function(main));
});

test('old saves and placement rules remain intact, with new interactions',()=>{
  assert.match(main,/FURNISHING_ASSET_TYPES=new Set/);
  assert.match(main,/FURNISHING_ASSET_TYPES\.has\(type\)/);
  assert.match(main,/CAMP_STRUCTURE_TYPES\.has\(type\)/);
  assert.match(main,/hydrateFurnishingGLB\(root,key,x,y,z,type,data\)/);
  assert.match(main,/const next=d\.lit===false/);
  assert.match(main,/type==='campfire'&&d\.lit!==false/);
  assert.match(main,/\['chair','sofa','bench'\]\.includes\(data\.type\)/);
  assert.match(main,/data\.items&&gameFreeMode==='survival'/);
  assert.match(main,/setWorldBlock\(p\.x,p\.y,p\.z,\{type:selectedType,facing,playerBuilt:true\},true\)/);
  assert.match(index,/data-inv-cat="가구"/);
  assert.match(index,/data-inv-cat="생존"/);
  assert.match(index,/cube-architect-world-assets\.js\?v=20261005-hunt1&furnishing=1/);
  assert.match(index,/cube-architect\.js\?v=20261007-homestead4&furnishing=1/);
});
