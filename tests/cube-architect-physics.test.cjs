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
const world=read('games/cube3d/cube-architect-world.js');

test('Cube Architect world physics parses and cache-busts the runtime',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.match(html,/cube-architect\.js\?v=20261005-polish1/);
  assert.match(html,/cube-architect-world\.js\?v=20261005-hunt1/);
  assert.match(html,/cube-architect\.css\?v=20261003-29-shrine1/);
  assert.match(html,/cube-architect-avatar\.js\?v=20261005-avatar-actions1/);
  assert.doesNotThrow(()=>new Function(world));
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


test('flowing fluids render and collide at level-dependent heights',()=>{
  assert.match(js,/function fluidHeight\(data\)/);
  assert.match(js,/return \[\.34,\.50,\.67,\.84\]\[level-1\]/);
  assert.match(js,/root\.scale\.y=h\/\.84/);
  assert.match(js,/sy<y\+fluidHeight\(cell\)/);
  assert.match(js,/headY<hy\+fluidHeight\(headBlock\)/);
});

test('small wildlife follows edited voxel terrain instead of teleporting onto structures',()=>{
  assert.match(js,/const nextY=creatureGroundY\(nx,nz,c\.position\.y\)/);
  assert.match(js,/\['water','lava','fire','cactus'\]\.includes\(type\)/);
  assert.doesNotMatch(js,/c\.position\.y=getHighestSolidY\(nx,nz\)\+1/);
});

test('return points use the current edited world and solid blocks can displace replaceable fluids',()=>{
  assert.match(js,/function safeReturnEyeY\(\)\{return groundTopBelow\(0,WORLD_MAX_Y\+1\.62,5\)\+1\.62\}/);
  assert.match(js,/camera\.position\.set\(0,safeReturnEyeY\(\),5\)/);
  assert.match(js,/const canDisplaceFluid=occupied&&blockDef\(occupied\)\.liquid&&selectedDef\.solid/);
  assert.match(js,/const canReplaceFragile=occupied&&\['fire','flower','reed','sapling','torch'\]\.includes\(occupied\.type\)/);
  assert.match(js,/if\(replaceable\)removeWorldBlockData\(p\.x,p\.y,p\.z,true\)/);
});


test('player-built leaves persist and moving fluids wash away fragile props',()=>{
  assert.match(js,/if\(d\.playerBuilt\|\|hasNearbyLog\(x,y,z\)\)\{d\.decay=0;continue\}/);
  assert.match(js,/\['fire','flower','reed','sapling','torch'\]\.includes\(at\.type\)/);
  assert.match(js,/removeWorldBlockData\(x,y,z,true\)/);
});


test('creatures stand on the visible top of slabs stairs and roofs',()=>{
  assert.match(js,/const d=getBlock\(cx,y,cz\),top=collisionTopForData\(d,cx,y,cz,x,z\)/);
  assert.match(js,/function supportDataBelow/);
  assert.match(js,/return supportDataBelow\(camera\.position\.x,freePhysicsY-1\.62,camera\.position\.z\)/);
  assert.match(js,/return supportDataBelow\(root\.position\.x,root\.position\.y,root\.position\.z\)/);
});

test('open doors no longer behave like invisible liquid dams',()=>{
  assert.match(js,/function openDoorCell/);
  assert.match(js,/function flowLiquidStep/);
  assert.match(js,/while\(steps<2&&openDoorCell\(tx,ty,tz\)\)/);
  assert.match(js,/flowLiquidStep\(x,y,z,d\.type,level-1,v\[0\],0,v\[1\]\)/);
});

test('underwater state has a visible screen cue and clears between modes',()=>{
  assert.match(html,/id="underwaterOverlay"/);
  assert.match(css,/#underwaterOverlay\.active\{opacity:1\}/);
  assert.match(js,/function updateUnderwaterVisual/);
  assert.match(js,/overlay\.classList\.toggle\('active',!!underwater&&mode==='free'\)/);
  assert.match(js,/\$\('underwaterOverlay'\)\?\.classList\.remove\('active'\)/);
});

test('shelter checks ignore decoration partial walls and open doorways',()=>{
  assert.match(world,/SHELTER_PASSABLE=new Set\(\['air','water','lava','fire','leaves','pineLeaves','flower','reed','sapling','torch'\]\)/);
  assert.match(world,/d\.type==='cactus'/);
  assert.match(world,/role==='wall'&&d\.type==='slab'/);
  assert.match(world,/\(d\.type==='door'\|\|d\.type==='doorTop'\)&&d\.open/);
  assert.match(world,/shelterBlock\(d,'roof'\)/);
  assert.match(world,/shelterBlock\(d,'wall'\)/);
});


test('rabbit spawn and emergency return also use shaped surface heights',()=>{
  assert.match(js,/g\.position\.set\(x,creatureGroundY\(x,z,terrainHeight\(x,z\)\+1\),z\)/);
  assert.match(js,/function safeReturnEyeY\(\)\{return groundTopBelow\(0,WORLD_MAX_Y\+1\.62,5\)\+1\.62\}/);
});
