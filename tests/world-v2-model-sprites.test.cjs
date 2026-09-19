const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'world-v2','kidscade-world.html'),'utf8');
const sprites=fs.readFileSync(path.join(root,'world-v2','kidscade-world-model-sprites.js'),'utf8');
const life=fs.readFileSync(path.join(root,'world-v2','kidscade-world-life-animation.js'),'utf8');
const integration=fs.readFileSync(path.join(root,'life-world-integration.js'),'utf8');

test('World v2 loads the local Three.js furniture sprite bridge',()=>{
  assert.match(html,/assets\/vendor\/three-r160\/three\.module\.js/);
  assert.match(html,/kidscade-world-model-sprites\.js\?v=1/);
  assert.match(sprites,/import \* as THREE from 'three'/);
  assert.match(sprites,/GLTFLoader/);
  assert.match(sprites,/NS\.ModelSprites=/);
});

test('World v2 furniture maps to committed Kenney Furniture Kit GLBs',()=>{
  const files=[
    'bed-single.glb','desk.glb','bookcase-open.glb','lounge-sofa.glb','table.glb',
    'kitchen-fridge.glb','kitchen-sink.glb','kitchen-cabinet.glb',
    'kitchen-stove.glb','rug-rectangle.glb'
  ];
  for(const file of files){
    assert.ok(fs.existsSync(path.join(root,'assets','game','3d','interiors','kenney-furniture-kit',file)),'missing '+file);
    assert.ok(sprites.includes(file),'sprite map missing '+file);
  }
});

test('World v2 keeps existing furniture interactions and falls back safely',()=>{
  for(const type of ['bed','sofa','desk','diningTable','fridge','sink','counter','stove','bookshelf','rug']){
    assert.ok(html.includes(`addFurniture('`),'furniture setup missing');
    assert.ok(life.includes(type+':{pose:'),'life action missing '+type);
  }
  assert.match(html,/sprites\?\.draw/);
  assert.match(html,/fallbackRender/);
  assert.match(sprites,/fallback\?\.\(ctx,e\)/);
});

test('World v2 embedded entry is cache bumped',()=>{
  assert.match(integration,/world-v2\/kidscade-world\.html\?v=8/);
});
