'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const root=require('node:path').resolve(__dirname,'..');
const read=p=>fs.readFileSync(root+'/'+p,'utf8');
const main=read('games/cube3d/cube-architect.js');
const index=read('games/cube3d/index.html');
const css=read('games/cube3d/cube-architect.css');
const w={};new Function('window',read('games/cube3d/cube-architect-world.js'))(w);
const rules=w.CubeArchitectWorld;

test('base life recipes connect storage, sleep, map, display and farming',()=>{
  const ids=new Set(rules.RECIPES.map(r=>r.id));
  for(const id of ['chest','bed','mapBoard','displayStand','bread'])assert.ok(ids.has(id),id);
  assert.match(main,/chest:\{name:'나무 상자'/);
  assert.match(main,/bed:\{name:'양털 침대'/);
  assert.match(main,/mapBoard:\{name:'탐험 지도판'/);
  assert.match(main,/displayStand:\{name:'기념품 전시대'/);
});

test('chest contents live in block data and are returned before the chest breaks',()=>{
  assert.match(main,/target\.data\.items\|\|\{\}/);
  assert.match(main,/data\.type==='chest'&&data\.items/);
  assert.match(main,/상자 안의 물건도 가방으로 챙겼어요/);
  assert.match(main,/setChestLabel/);
});

test('bed is a sheltered home, sleep skips night and respawn uses the bed',()=>{
  assert.match(main,/shelterAt\(getBlock,x,y,z\)/);
  assert.match(main,/survivalHome=\{bed:\[x,y,z\],position:pos\}/);
  assert.match(main,/dayTime=\.28/);
  assert.match(main,/function survivalReturnPoint\(\)/);
  assert.match(main,/bed\?\.type==='bed'/);
});

test('map board only exposes discovered places and supports tracking',()=>{
  assert.match(main,/직접 발견한 지역과 랜드마크만 기록돼요/);
  assert.match(main,/for\(const biomeId of visitedBiomes\)/);
  assert.match(main,/collected\.has\('mini:'\+spec\.id\)/);
  assert.match(main,/for\(const id of discoveredLandmarks\)/);
  assert.match(main,/trackedTarget=\{\.\.\.target\}/);
  assert.match(main,/추적 중 · /);
});

test('three crops grow on tilled soil and can be harvested',()=>{
  assert.match(main,/FARM_PLANT_TYPES=\['wheatSeed','carrot','potato'\]/);
  assert.match(main,/FARM_CROP_TYPES=\['wheatCrop','carrotCrop','potatoCrop'\]/);
  assert.match(main,/if\(FARM_CROP_TYPES\.includes\(type\)\)return belowType==='tilledSoil'/);
  assert.match(main,/function plantFarmItem\(hit\)/);
  assert.match(main,/function harvestCrop\(x,y,z,data\)/);
  assert.match(main,/CROP_MATURE_AGE=24/);
  assert.match(main,/CROP_MATURE_SECONDS=150/);
  assert.match(main,/plantedAt:survivalWorldTime,lastGrowAt:survivalWorldTime,lastGrowReal:Date\.now\(\)\/1000/);
  assert.match(main,/const elapsed=Math\.max\(worldElapsed,realElapsed\),rate=CROP_MATURE_AGE\/CROP_MATURE_SECONDS/);
});

test('base life panel is published and mobile interactions can use it',()=>{
  assert.match(index,/id="lifePanel"/);
  assert.match(index,/cube-architect\.css\?v=20261007-base-life2/);
  assert.match(index,/cube-architect\.js\?v=20261007-base-life4/);
  assert.match(css,/#lifePanel\{/);
  assert.match(main,/interactLifeBlock\(type,u\.gx,u\.gy,u\.gz\)/);
  assert.match(main,/!PLACEABLE_TYPES\.includes\(selectedType\)&&!FARM_PLANT_TYPES\.includes\(selectedType\)/);
  assert.match(main,/PLACEABLE_TYPES\.includes\(selectedType\)\|\|FARM_PLANT_TYPES\.includes\(selectedType\)/);
});

test('tracked map destinations have a live direction arrow and an explicit arrival finish',()=>{
  assert.match(index,/id="trackingGuide"/);
  assert.match(index,/id="trackingArrow"/);
  assert.match(index,/id="trackingStop"/);
  assert.match(main,/function updateTrackingGuide\(\)/);
  assert.match(main,/Math\.atan2\(lookX\*tz-lookZ\*tx,lookX\*tx\+lookZ\*tz\)/);
  assert.match(main,/arrived\?'도착 · 추적 끝':'추적 취소'/);
  assert.match(main,/function stopTrackedTarget\(\)/);
});
