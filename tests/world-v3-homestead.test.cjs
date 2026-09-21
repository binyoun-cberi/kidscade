const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const runtime=read('world-v3/kidscade-world-v3.js');
const storage=read('world-v2/kidscade-world-storage.js');
const furnishing=read('world-v3/kidscade-world-furnishing.js');
const economy=read('world-v3/kidscade-world-economy.js');
const grid=read('world-v3/kidscade-world-grid.js');
const integration=read('life-world-integration.js');

test('fresh home begins as one room with bedding and no automatic modern facilities',()=>{
  assert.match(storage,/houseLevel:1/);
  assert.match(storage,/campfireBuilt:false/);
  assert.match(storage,/kitchenLevel:0/);
  assert.match(runtime,/HOUSE_BOUNDS=/);
  assert.match(runtime,/starter-home-storage/);
  assert.match(runtime,/바닥 이불에서 자기/);
  assert.doesNotMatch(furnishing,/function migrateDefaultLayout/);
  assert.doesNotMatch(furnishing,/function migrateFunctionalLayout/);
  assert.doesNotMatch(furnishing,/function claimStarterGift/);
  assert.doesNotMatch(furnishing,/data-furn-craft/);
});

test('water progression changes where water comes from',()=>{
  assert.match(runtime,/function collectWater/);
  assert.match(runtime,/collectWater\('river'\)/);
  assert.match(runtime,/collectWater\('well'\)/);
  assert.match(runtime,/collectWater\('pump'\)/);
  assert.match(runtime,/function hasIndoorTap/);
  assert.match(runtime,/hasPlacedFurniture\('kitchenSink'\)/);
  assert.match(runtime,/waterLevel/);
  assert.match(runtime,/우물/);
  assert.match(runtime,/수동 펌프/);
});

test('orchard grows from empty land to nine repeat-harvest fruit trees',()=>{
  assert.match(grid,/orchard:\{id:'orchard'/);
  assert.match(runtime,/ORCHARD_TREE_COUNTS=\[0,1,2,4,6,9\]/);
  for(const fruit of ['apple','pear','peach','orange','cherry'])assert.ok(runtime.includes(fruit),fruit);
  assert.match(runtime,/function harvestOrchardTree/);
  assert.match(runtime,/ORCHARD square/);
});

test('ranch appearance and animal capacity grow together',()=>{
  assert.match(runtime,/RANCH_CAPACITY=\[0,1,2,3,4\]/);
  assert.match(runtime,/function ranchCapacity/);
  assert.match(runtime,/function updateRanchExpansionVisuals/);
  assert.match(runtime,/목장이 가득 찼어요/);
  assert.match(runtime,/const ranchLayouts=/);
});

test('carpentry turns shop materials into functional home furniture',()=>{
  assert.match(runtime,/const CARPENTER_RECIPES=/);
  for(const key of ['bedSingle','homeDrawers','wardrobe','kitchenStove','kitchenSink','kitchenFridge'])assert.ok(runtime.includes(key),key);
  for(const mat of ['nails','fabric','glass','wire','paint'])assert.ok(economy.includes(mat),mat);
  assert.match(runtime,/data-carpenter-craft/);
  assert.match(furnishing,/homeDrawers/);
  assert.match(furnishing,/wardrobe/);
  assert.match(integration,/kidscade:open-avatar-studio/);
});

test('cooked gifts feed NPC friendship and unlock better shop/carpentry options',()=>{
  assert.match(economy,/const GIFT_FAVORITES=/);
  assert.match(economy,/data-resident-gift/);
  assert.match(economy,/favorite\?2:1/);
  assert.match(economy,/needFriend/);
  assert.match(runtime,/friendNeed/);
});

test('bag upgrades and placed storage furniture create meaningful capacity progression',()=>{
  assert.match(runtime,/BACKPACK_SLOTS=\[0,8,12,16,20\]/);
  assert.match(economy,/backpack2/);
  assert.match(economy,/backpack3/);
  assert.match(economy,/backpack4/);
  assert.match(runtime,/hasPlacedFurniture\('homeDrawers'\)/);
  assert.match(runtime,/hasPlacedFurniture\('kitchenCabinet'\)/);
});

test('inventory transactions never lose cooking crafting or friendship rewards',()=>{
  assert.match(runtime,/function addFoodItem/);
  assert.match(runtime,/function restoreRecipeIngredients/);
  assert.match(runtime,/재료는 그대로 돌려놓았어요/);
  assert.match(runtime,/제작 재료는 돌려놓았어요/);
  assert.match(economy,/공간을 비우면 다시 받을 수 있어요/);
  assert.ok(economy.indexOf("t.rewardClaims[claimKey]=true;")>economy.indexOf("canCarryFoodKey"));
  assert.match(economy,/d\.type==='food'&&canCarryFoodKey/);
});

test('refrigerator food storage and old-ranch migration persist safely',()=>{
  assert.match(storage,/homeFoodStorage:\{\}/);
  assert.match(storage,/hadRanchLevel/);
  assert.match(storage,/legacyRanchCount/);
  assert.match(runtime,/function homeFoodStoragePanel/);
  assert.match(runtime,/data-food-store-in/);
  assert.match(runtime,/data-food-store-out/);
});

test('homestead runtime still parses after the progression rework',()=>{
  const src=runtime.replace(/^import .*$/gm,'').replace(/^export /gm,'');
  const result=spawnSync(process.execPath,['--check'],{input:src,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
});
