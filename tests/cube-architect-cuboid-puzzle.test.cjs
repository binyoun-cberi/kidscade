const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'games/cube3d/index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'games/cube3d/cube-architect-cuboid-puzzle.js'),'utf8');
const css=fs.readFileSync(path.join(root,'games/cube3d/cube-architect-cuboid-puzzle.css'),'utf8');

test('cube architect exposes the cuboid gravity puzzle from the home screen',()=>{
  assert.match(html,/data-mode="cuboidPuzzle"/);
  assert.match(html,/직육면체 퍼즐/);
  assert.match(html,/mode-card-featured/);
  assert.match(html,/cube-architect-cuboid-puzzle\.css/);
  assert.match(html,/cube-architect-cuboid-puzzle\.js/);
  assert.match(html,/CubeArchitectCuboidPuzzle/);
});

test('cuboid puzzle models gravity-driven rail emitters and five stages',()=>{
  assert.match(js,/const WORLD_DOWN=new THREE\.Vector3\(0,-1,0\)/);
  assert.match(js,/function gravityLocal/);
  assert.match(js,/function settleRoute/);
  assert.match(js,/shape:'L'/);
  assert.match(js,/shape:'U'/);
  assert.match(js,/title:'5 · 빛의 왕관'/);
  assert.match(js,/solution:\['right','forward','left','forward','right'\]/);
  assert.match(js,/premultiply\(commandQuat\(cmd\)\)/);
  assert.match(js,/side<\.19/);
  assert.match(js,/function computeAlignment/);
  assert.match(js,/function disposeScene/);
  assert.match(js,/k>=\.42/);
  assert.match(js,/CubeArchitectExternalPause=true/);
});

test('cuboid puzzle has touch-friendly independent controls',()=>{
  assert.match(css,/\.ca-cp-turnpad/);
  assert.match(css,/touch-action:none/);
  assert.match(css,/@media\(max-width:820px\)/);
  assert.match(css,/ca-cp-align-meter/);
  assert.match(css,/ca-cp-busy/);
  assert.match(js,/data-cuboid-turn/);
  assert.match(js,/pointerdown/);
  assert.match(js,/arrowup/);
});