const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('games/cube3d/cube-architect.js');
const html=read('games/cube3d/index.html');
const avatar=read('games/cube3d/cube-architect-avatar.js');
const css=read('games/cube3d/cube-architect.css');

test('Cube Architect world physics parses and cache-busts the runtime',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.match(html,/cube-architect\.js\?v=20261003-31-physics2/);
  assert.match(html,/cube-architect-avatar\.js\?v=20261003-30-swim1/);
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

test('thin blocks and roofs collide like their visible geometry',()=>{
  assert.match(js,/function thinBlockContains/);
  assert.match(js,/\['door','glassPane','windowFrame'\]\.includes\(type\)/);
  assert.match(js,/data\.type==='roof'/);
  assert.match(js,/Math\.max\(\.04,1-Math\.min\(\.5,across\)\*2\)/);
});

test('survival environmental hazards use the existing health system',()=>{
  assert.match(js,/function damageByEnvironment/);
  assert.match(js,/state\.lava\?'용암':state\.fire\?'불':state\.cactus\?'선인장'/);
  assert.match(js,/survivalHealth=Math\.max\(0,survivalHealth-\(state\.lava\?2:1\)\)/);
  assert.match(js,/returnAfterCreatureDefeat\(\)/);
});


test('living creatures avoid lava fire and cactus while water-capable species may still enter water',()=>{
  assert.match(js,/const danger=\[feetCell\?\.type,supportCell\?\.type\]\.some\(type=>\['lava','fire','cactus'\]\.includes\(type\)\)/);
  assert.match(js,/danger\|\|\(!allowWater&&feetCell\?\.type==='water'\)/);
});

test('fragile world objects require sensible support and clean up when support disappears',()=>{
  assert.match(js,/function placementSupportValid/);
  assert.match(js,/type==='sapling'\|\|type==='flower'/);
  assert.match(js,/type==='cactus'/);
  assert.match(js,/type==='door'\|\|type==='torch'\|\|type==='fire'/);
  assert.match(js,/function cleanupUnsupportedAt/);
  assert.match(js,/cleanupUnsupportedAt\(x,y\+1,z,record\)/);
  assert.match(js,/const supportError=placementSupportError\(selectedType,p\)/);
});

test('survival has forgiving fall damage and underwater breath',()=>{
  assert.match(html,/id="breathBar"/);
  assert.match(css,/#breathBar i/);
  assert.match(js,/function updateBreath\(state,dt,t\)/);
  assert.match(js,/survivalBreath=Math\.max\(0,survivalBreath-dt\*9\)/);
  assert.match(js,/t-lastDrownDamage>=1400/);
  assert.match(js,/function damageByFall\(distance\)/);
  assert.match(js,/distance<=4\.25/);
  assert.match(js,/damageByFall\(Math\.max\(0,freeFallPeakY-nextY\)\)/);
});

test('desktop mobile and avatar presentation react to swimming',()=>{
  assert.match(js,/previousFluid!==freeFluidKind\)refreshMobileFly\(\)/);
  assert.match(js,/swimming\?'수영 위':freeFlying\?'상승':'점프'/);
  assert.match(js,/!fluid\.water&&!fluid\.lava&&onGround/);
  assert.doesNotThrow(()=>new Function(avatar));
  assert.match(avatar,/motion='ground'/);
  assert.match(avatar,/const swimming=motion==='swim'/);
  assert.match(avatar,/rig\.plane\.rotation\.x=-\.78/);
});
