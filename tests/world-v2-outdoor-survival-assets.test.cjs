const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const world=fs.readFileSync(path.join(root,'world-v2','kidscade-world.html'),'utf8');
const sprites=fs.readFileSync(path.join(root,'world-v2','kidscade-world-model-sprites.js'),'utf8');
const work=fs.readFileSync(path.join(root,'world-v2','kidscade-world-work-animation.js'),'utf8');
const carry=fs.readFileSync(path.join(root,'world-v2','kidscade-world-carry-fishing.js'),'utf8');
const progress=fs.readFileSync(path.join(root,'world-v2','kidscade-world-progression.js'),'utf8');
const life=fs.readFileSync(path.join(root,'world-v2','kidscade-world-life-animation.js'),'utf8');
const integration=fs.readFileSync(path.join(root,'life-world-integration.js'),'utf8');

test('World v2 outdoor scripts parse',()=>{
  for(const src of [work,carry,progress,life]){
    const r=spawnSync(process.execPath,['--check'],{input:src,encoding:'utf8'});
    assert.equal(r.status,0,r.stderr||r.stdout);
  }
});

test('World v2 maps outdoor objects to committed Survival Kit GLBs',()=>{
  const files=[
    'tree.glb','tree-tall.glb','rock-a.glb','rock-b.glb','rock-c.glb',
    'resource-wood.glb','resource-stone.glb','chest.glb','workbench.glb',
    'tool-axe.glb','tool-axe-upgraded.glb','tool-pickaxe.glb','tool-pickaxe-upgraded.glb'
  ];
  for(const file of files){
    assert.ok(fs.existsSync(path.join(root,'assets','game','3d','survival','kenney-survival-kit',file)),'missing '+file);
    assert.ok(sprites.includes(file),'sprite map missing '+file);
  }
});

test('World v2 outdoor resources keep gameplay while using model sprites',()=>{
  assert.match(world,/modelRender\(i%3===0\?'outdoorTreeTall':'outdoorTree'/);
  assert.match(world,/outdoorRockA/);
  assert.match(work,/axeIron/);
  assert.match(work,/pickaxeIron/);
  assert.match(work,/__usedTier==='iron'/);
  assert.match(carry,/resourceWood/);
  assert.match(carry,/resourceStone/);
  assert.match(carry,/storageChest/);
  assert.match(progress,/K\.ModelSprites\?\.draw/);
  assert.match(progress,/'workbench'/);
});

test('World v2 retains safe procedural fallbacks',()=>{
  assert.match(world,/D\.render\.tree/);
  assert.match(world,/D\.render\.rock/);
  assert.match(carry,/fallback/);
  assert.match(progress,/fallback/);
  assert.match(work,/c\.strokeStyle='#5e3b26'/);
});

test('World v2 outdoor asset pass is cache-bumped',()=>{
  assert.match(world,/kidscade-world-model-sprites\.js\?v=2/);
  assert.match(life,/kidscade-world-work-animation\.js\?v=2/);
  assert.match(life,/kidscade-world-carry-fishing\.js\?v=2/);
  assert.match(life,/kidscade-world-progression\.js\?v=2/);
  assert.match(integration,/world-v2\\/kidscade-world\\.html\\?v=8/);
});
