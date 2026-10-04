const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('games/cube3d/cube-architect.js');
const html=read('games/cube3d/index.html');

test('Cube Architect world physics parses and cache-busts the runtime',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.match(html,/cube-architect\.js\?v=20261003-31-physics1/);
});

test('water and lava use fluid movement instead of ground walking',()=>{
  assert.match(js,/function playerEnvironmentState/);
  assert.match(js,/freeFluidKind=environment\.lava\?'lava':environment\.water\?'water':''/);
  assert.match(js,/freeFluidKind==='water'\?\.58:freeFluidKind==='lava'\?\.35:1/);
  assert.match(js,/const swimUp=!!freeKeys\.Space,swimDown=/);
  assert.match(js,/freeVelocityY=THREE\.MathUtils\.clamp\(freeVelocityY,-2\.5,3\.4\)/);
});

test('full cubes no longer auto-step while slabs and stairs have partial collision tops',()=>{
  assert.match(js,/function collisionTopForData/);
  assert.match(js,/data\.type==='slab'\)return y\+\.5/);
  assert.match(js,/data\.type==='stairs'/);
  assert.match(js,/function stepHeightAt/);
  assert.doesNotMatch(js,/camera\.position\.y\+=1;camera\.position\.x=nx/);
  assert.doesNotMatch(js,/camera\.position\.y\+=1;camera\.position\.z=nz/);
});

test('survival environmental hazards use the existing health system',()=>{
  assert.match(js,/function damageByEnvironment/);
  assert.match(js,/state\.lava\?'용암':state\.fire\?'불':state\.cactus\?'선인장'/);
  assert.match(js,/survivalHealth=Math\.max\(0,survivalHealth-\(state\.lava\?2:1\)\)/);
  assert.match(js,/returnAfterCreatureDefeat\(\)/);
});
