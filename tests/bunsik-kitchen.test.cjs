const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const gameDir = path.join(root, 'games', 'job_bogle_bunsik');
const html = fs.readFileSync(path.join(gameDir, '보글보글 분식집.html'), 'utf8');
const rootEntry = fs.readFileSync(path.join(root, '보글보글 분식집.html'), 'utf8');
const css = fs.readFileSync(path.join(gameDir, 'bunsik-kitchen.css'), 'utf8');
const js = fs.readFileSync(path.join(gameDir, 'bunsik-kitchen.js'), 'utf8');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data', 'games.json'), 'utf8'));
const game = catalog.games.find(g => g.id === 'job_bogle_bunsik');

test('Bunsik Kitchen v33 keeps the 3D kitchen visually dominant', () => {
  assert.match(html, /bunsik-kitchen\.css\?v=33/);
  assert.match(html, /bunsik-kitchen\.js\?v=33/);
  assert.match(html, /class="customer-orders"/);
  assert.match(html, /class="pot-world-labels"/);
  assert.match(html, /class="context-panel"/);
  assert.doesNotMatch(html, /class="selected-help"/);
  assert.doesNotMatch(html, /class="tray-btn/);
  assert.doesNotMatch(html, /data-action="water"/);
  assert.match(css, /\.order-ticket/);
  assert.match(css, /\.pot-tag/);
  assert.match(css, /\.serve-drag/);
});

test('Bunsik Kitchen module parses as JavaScript', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {input:js,encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr || result.stdout || 'Bunsik Kitchen syntax check failed');
});

test('Bunsik Kitchen v33 connects expanded food, kitchen, service, and hall assets', () => {
  assert.match(js, /const ULTIMATE_FOOD=/);
  assert.match(js, /root:ULTIMATE_FOOD/);
  assert.match(js, /attachModel\(holder,root,file,size/);
  assert.match(js, /extractor-hood\.glb/);
  assert.match(js, /wall-knife-rack\.glb/);
  assert.match(js, /udon\.glb/);
  assert.match(js, /can-fridge\.glb/);
  assert.match(js, /bottles\.glb/);
  assert.match(js, /chopsticks\.glb/);
  assert.match(js, /this\.loadModel\(info\.root\|\|FOOD,info\.model,.28\)/);
});

test('context actions are tied to nearby physical stations instead of instant pot actions', () => {
  assert.match(js, /function updateActionButtons\(\)/);
  assert.match(js, /n\?\.type==='fridge'/);
  assert.match(js, /n\?\.type==='sink'/);
  assert.match(js, /n\?\.type==='pot'/);
  assert.match(js, /dataset\.pick/);
  assert.match(js, /pickIngredient\(id\)/);
  assert.doesNotMatch(js, /const actionKeys=\{Digit1:/);
});

test('plating animates into a meal carried by the player', () => {
  assert.match(js, /makeServiceStation\(\)/);
  assert.match(js, /ramen\.glb/);
  assert.match(js, /animatePlate\(index,onDone\)/);
  assert.match(js, /p\.plating=true/);
  assert.match(js, /state\.tray=\{orderId,recipeId:recipe\.id[\s\S]*ready:false/);
  assert.match(js, /const meal=\{kind:'meal'/);
  assert.match(js, /setHeldItem\(meal\)/);
  assert.match(js, /kitchen\.setTrayMeal\(false\)/);
});

test('serving is now a direct carry interaction at the service counter', () => {
  assert.match(html, /id="heldStatus"/);
  assert.match(js, /function serveHeldMeal\(\)/);
  assert.match(js, /state\.heldItem\?\.kind==='meal'/);
  assert.match(js, /type:'service'/);
  assert.match(js, /if\(n\.type==='service'\)\{serveHeldMeal\(\);return\}/);
  assert.match(js, /animateServe\(slot,onDone\)/);
  assert.match(js, /customerCelebrate\(slot,q,streak\.combo,totalEarned\)/);
  assert.match(css, /\.serve-drag\{display:none!important/);
});

test('order rendering declares potIndex locally before receipt rendering', () => {
  assert.match(js, /const r=recipeById\(o\.recipeId\),d=document\.createElement\('button'\),potIndex=potIndexForOrder\(o\.id\);d\.type='button';/);
  assert.doesNotMatch(js, /d\.type='button',potIndex=potIndexForOrder/);
});

test('orders are receipt-style tickets with printer and completion feedback', () => {
  assert.match(js, /className='order-ticket '/);
  assert.match(js, /ticket-brand/);
  assert.match(js, /ticket-no/);
  assert.match(js, /ticket-row/);
  assert.match(js, /조리 힌트/);
  assert.match(js, /orderWaitState\(o\.patience\)/);
  assert.match(js, /ticket\.classList\.add\('served'\)/);
  assert.match(css, /\.order-ticket\{/);
  assert.match(css, /@keyframes receiptPrint/);
  assert.match(css, /\.ticket-stamp/);
  assert.match(css, /@keyframes stampIn/);
  assert.match(css, /\.order-ticket\.urgent/);
  assert.doesNotMatch(js, /className='order-card'/);
});

test('burners unlock gradually so the first shift starts readable', () => {
  assert.match(js, /function activePotCount\(\)/);
  assert.match(js, /state\.served>=6\?4:state\.served>=3\?3:2/);
  assert.match(js, /if\(index>=activePotCount\(\)\)/);
  assert.match(js, /v\.actionTile\.visible=!locked/);
  assert.match(js, /새 화구가 열렸어요/);
});

test('ramen gameplay still keeps recipe, timing, burning and safe discards', () => {
  assert.match(js, /function addToPot/);
  assert.match(js, /function identifyRecipe/);
  assert.match(js, /function qualityFor/);
  assert.match(js, /p\.noodleTime>16\.5/);
  assert.match(js, /function requestDiscard/);
  assert.match(js, /trayDiscardArmedUntil/);
  assert.match(js, /한 번 더 눌러 쟁반 비우기/);
  for (const id of ['egg','green','cheeseEgg']) assert.match(js, new RegExp("id:'"+id+"'"));
});

test('Bunsik Kitchen reuses existing food, restaurant, customer and tray assets', () => {
  const required = [
    'assets/game/food/egg.glb',
    'assets/game/food/leek.glb',
    'assets/game/food/cheese-cut.glb',
    'assets/game/3d/interiors/charming-kitchen-set/stove.glb',
    'assets/game/3d/interiors/charming-kitchen-set/extractor-hood.glb',
    'assets/game/3d/interiors/charming-kitchen-set/wall-knife-rack.glb',
    'assets/game/3d/interiors/charming-kitchen-set/kettle.glb',
    'assets/game/3d/interiors/charming-kitchen-set/wall-cabinet-straight.glb',
    'assets/game/3d/interiors/charming-kitchen-set/wall-cabinet-single.glb',
    'assets/game/3d/interiors/charming-kitchen-set/wall-shelf-kitchen.glb',
    'assets/game/3d/interiors/charming-kitchen-set/red-mug.glb',
    'assets/game/3d/interiors/charming-kitchen-set/blue-mug.glb',
    'assets/game/3d/interiors/charming-kitchen-set/spoon.glb',
    'assets/game/3d/interiors/charming-kitchen-set/spatula.glb',
    'assets/game/3d/interiors/charming-kitchen-set/oven-glove.glb',
    'assets/game/3d/interiors/charming-kitchen-set/kitchen-knife.glb',
    'assets/game/3d/interiors/charming-kitchen-set/container-kitchen-a.glb',
    'assets/game/3d/interiors/charming-kitchen-set/container-kitchen-b.glb',
    'assets/game/3d/interiors/charming-kitchen-set/papertowel-holder.glb',
    'assets/game/3d/interiors/modular-sushi-restaurant-kit/ramen.glb',
    'assets/game/3d/interiors/modular-sushi-restaurant-kit/udon.glb',
    'assets/game/3d/interiors/modular-sushi-restaurant-kit/bottles.glb',
    'assets/game/3d/interiors/modular-sushi-restaurant-kit/can-fridge.glb',
    'assets/game/3d/interiors/modular-sushi-restaurant-kit/wall-with-shelves.glb',
    'assets/game/3d/interiors/modular-sushi-restaurant-kit/bottle.glb',
    'assets/game/3d/bakery/interior/cash-register.glb',
    'assets/game/3d/bakery/interior/pricing-card.glb',
    'assets/game/3d/bakery/restaurant-bits/menu.glb',
    'assets/game/3d/bakery/restaurant-bits/jar-a-large.glb',
    'assets/game/3d/food/ultimate-food-pack/egg.glb',
    'assets/game/3d/food/ultimate-food-pack/chopsticks.glb',
    'assets/game/3d/bakery/interior/serving-tray.glb',
    'assets/game/characters/people/character-female-b.glb',
    'assets/game/characters/people/character-male-a.glb',
    'assets/game/npcs/glTF/Casual_Female.gltf',
    'assets/game/npcs/glTF/Casual_Male.gltf',
    'assets/game/characters/kidscade-avatar-v3/school-starter/school-starter-sheet.png'
  ];
  for (const rel of required) assert.ok(fs.existsSync(path.join(root,rel)), 'missing asset: '+rel);
  assert.match(js, /const BAKERY=/);
  assert.match(js, /CUSTOMER_MODELS/);
  assert.match(js, /const NPCS=/);
  assert.match(js, /const AVATAR_SHEET=/);
  assert.match(js, /makeCuteCook\('player'\)/);
  assert.match(js, /makeCuteCook\('helper'\)/);
  assert.match(js, /paintCuteCook\(/);
});

test('catalog and compatibility entry publish v33', () => {
  assert.ok(game);
  assert.equal(game.href, 'games/job_bogle_bunsik/보글보글 분식집.html?v=33');
  assert.equal(game.difficulty, 'easy');
  assert.match(rootEntry, /games\/job_bogle_bunsik\/bunsik-kitchen\.css\?v=33/);
  assert.match(rootEntry, /games\/job_bogle_bunsik\/bunsik-kitchen\.js\?v=33/);
  assert.match(rootEntry, /"three":"assets\/vendor\/three-r160\/three\.module\.js"/);
});

test('Bunsik Kitchen build script publishes v33', () => {
  const build=fs.readFileSync(path.join(root,'scripts','bunsik-kitchen-build.cjs'),'utf8');
  assert.match(build,/\?v=30/);
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  assert.match(pkg.scripts.build,/bunsik-kitchen-build\.cjs/);
});




test('Bunsik Kitchen v33 adds a PlateUp-style prep phase and movable layout stations', () => {
  assert.match(html, /id="prepBar" class="prep-bar hidden"/);
  assert.match(html, /id="openShopBtn"/);
  assert.match(html, /id="stationHint"/);
  assert.match(js, /phase:'idle'/);
  assert.match(js, /function beginService\(\)/);
  assert.match(js, /state\.phase='prep'/);
  assert.match(js, /state\.phase='service'/);
  assert.match(js, /makeLayoutStation\(/);
  assert.match(js, /pointerDown\(e\)/);
  assert.match(js, /pointerMove\(e\)/);
  assert.match(js, /Math\.round\(p\.x\*2\)\/2/);
  assert.match(css, /\.prep-bar\{/);
  assert.match(css, /\.layout-mode #gameCanvas/);
});

test('Bunsik Kitchen v33 uses committed CC0 assets for the physical kitchen sources', () => {
  const required = [
    'assets/game/3d/bakery/restaurant-bits/kitchencounter-sink.glb',
    'assets/game/3d/bakery/restaurant-bits/fridge-a.glb',
    'assets/game/3d/bakery/restaurant-bits/dishrack-plates.glb',
    'assets/game/3d/bakery/restaurant-bits/plate-dirty.glb',
    'assets/game/3d/bakery/interior/basket-a.glb',
    'assets/game/3d/bakery/interior/basket-b.glb'
  ];
  for (const rel of required) assert.ok(fs.existsSync(path.join(root,rel)), 'missing PlateUp-style asset: '+rel);
  assert.match(js, /const BAKERY_BITS=/);
  assert.match(js, /'kitchencounter-sink\.glb'/);
  assert.match(js, /'dishrack-plates\.glb'/);
  assert.match(js, /'plate-dirty\.glb'/);
  assert.match(js, /'basket-a\.glb'/);
  assert.match(js, /'basket-b\.glb'/);
  assert.match(js, /'noodleSource'/);
  assert.match(js, /'soupSource'/);
});

test('Bunsik Kitchen v33 uses cute KIDSCADE cook sprites for player and helper', () => {
  assert.match(js, /school-starter\/school-starter-sheet\.png/);
  assert.match(js, /makeCuteCook\(role='player'\)/);
  assert.match(js, /paintCuteCook\(look,moving=false,faceRight=false/);
  assert.match(js, /makeRoleFloorLabel\('사장'/);
  assert.match(js, /makeRoleFloorLabel\('알바'/);
  assert.match(js, /const apron=look\.role==='player'\?'#d95343':'#4b8fc7'/);
});

test('Bunsik Kitchen v33 adds player movement and proximity interaction', () => {
  assert.match(html, /id="moveControls"/);
  assert.match(html, /data-move="ArrowUp"/);
  assert.match(html, /data-interact/);
  assert.match(js, /makePlayer\(\)/);
  assert.match(js, /updatePlayer\(dt\)/);
  assert.match(js, /setMoveKey\(code,on\)/);
  assert.match(js, /interactNearest\(\)/);
  assert.match(js, /KeyW/);
  assert.match(js, /KeyE/);
  assert.match(js, /stationDistance\(group\)/);
  assert.match(css, /\.move-controls\{/);
});

test('Bunsik Kitchen v33 turns plates into a reusable washing bottleneck', () => {
  assert.match(html, /id="dishStatus"/);
  assert.match(js, /cleanPlates:3,dirtyPlates:0/);
  assert.match(js, /if\(state\.cleanPlates<=0\)/);
  assert.match(js, /state\.cleanPlates=Math\.max\(0,state\.cleanPlates-1\)/);
  assert.match(js, /function addDirtyPlate\(\)/);
  assert.match(js, /function washOnePlate\(\)/);
  assert.match(js, /state\.dirtyPlates=Math\.max\(0,state\.dirtyPlates-1\)/);
  assert.match(js, /state\.cleanPlates\+=1/);
  assert.match(js, /setTimeout\(\(\)=>\{if\(state\.running\)addDirtyPlate\(\)\},1050\)/);
  assert.match(css, /\.dish-stat/);
});

test('Bunsik Kitchen delegates restaurant state to the shared engine', () => {
  assert.match(js, /import \{ RestaurantEngine \} from '\.\.\/shared\/restaurant-engine\.js\?v=1'/);
  assert.match(js, /restaurant=new RestaurantEngine\(/);
  assert.match(js, /restaurant\.recipes\.findExact\(p\.ingredients\)/);
  assert.match(js, /restaurant\.spawnOrder\(/);
  assert.match(js, /restaurant\.orders\.adjustPatience\(/);
  assert.match(js, /restaurant\.quote\(/);
  assert.match(js, /restaurant\.serve\(/);
  assert.match(js, /restaurant\.tick\(dt,\{/);
  assert.match(js, /restaurant\.startShift\(/);
  assert.match(js, /restaurant\.stopShift\(\)/);
});


test('Bunsik Kitchen v33 enforces a one-item carry invariant', () => {
  assert.match(js, /heldItem:null/);
  assert.match(js, /function setHeldItem\(item\)/);
  assert.match(js, /if\(state\.heldItem\)\{toast\('한 번에 하나만 들 수 있어요/);
  assert.match(js, /function pickIngredient\(id\)/);
  assert.match(js, /function insertHeldIntoPot\(index\)/);
  assert.match(js, /setHeldItem\(null\)/);
  assert.match(js, /setCarryVisual\(item\)/);
  assert.match(html, /id="heldStatus"/);
  assert.match(css, /\.held-status\{/);
});

test('Bunsik Kitchen v33 tutorial follows the split source route', () => {
  assert.match(js, /싱크로 가서 E로 물을 받아/);
  assert.match(js, /면 바구니로 가서 E로 면을 들고/);
  assert.match(js, /스프 바구니에서 스프를 들고/);
  assert.match(js, /토핑 냉장고에서 계란을 꺼내/);
  assert.match(js, /완성 라면을 들고 배식대로 이동해 E로 서빙/);
  assert.match(js, /function recommendedToppingIngredient\(\)/);
});

test('Bunsik Kitchen v33 no longer exposes instant ingredient keyboard shortcuts', () => {
  assert.doesNotMatch(js, /Digit1:'water'/);
  assert.doesNotMatch(js, /Digit2:'noodle'/);
  assert.doesNotMatch(js, /Digit3:'soup'/);
  assert.doesNotMatch(js, /Digit4:'egg'/);
  assert.match(js, /KeyE/);
  assert.match(js, /Space/);
});


test('Bunsik Kitchen v33 makes furniture collision matter during service', () => {
  assert.match(js, /isBlockedPosition\(x,z,pr=/);
  assert.match(js, /layoutPlacementBlocked\(holder,x,z\)/);
  assert.match(js, /this\.potVisuals\.some\(v=>Math\.hypot/);
  assert.match(js, /this\.layoutStations\.some\(s=>s\.group\.visible&&Math\.hypot/);
  assert.match(js, /if\(!this\.isBlockedPosition\(nx,this\.player\.position\.z\)\)/);
  assert.match(js, /if\(!this\.isBlockedPosition\(this\.player\.position\.x,nz\)\)/);
});

test('Bunsik Kitchen v33 lets players recover from a wrong carried item', () => {
  assert.match(js, /function returnHeldAtSource\(ids\)/);
  assert.match(js, /function dropHeldItem\(\)/);
  assert.match(js, /state\.heldItem\.kind==='ingredient'/);
  assert.match(js, /재료 내려놓기/);
  assert.match(js, /heldDiscardArmedUntil/);
  assert.match(js, /완성 라면을 정말 버릴까요/);
});

test('Bunsik Kitchen v33 rebalance matches the longer direct-carry loop', () => {
  assert.match(js, /const SHIFT_SECONDS=150;/);
  assert.match(js, /const TARGET_REVENUE=5200;/);
  assert.match(html, /id="time">150</);
  assert.match(html, /id="goal">5,200원</);
});


test('Bunsik Kitchen v33 adds two movable one-slot prep counters', () => {
  assert.match(js, /makePrepCounter\('prepCounterA','조리대 A'/);
  assert.match(js, /makePrepCounter\('prepCounterB','조리대 B'/);
  assert.match(js, /storageSlot=true/);
  assert.match(js, /storedItem=null/);
  assert.match(js, /itemAnchor/);
  assert.match(js, /counter-straight\.glb/);
});

test('Bunsik Kitchen v33 moves items between hand and prep counters without duplication', () => {
  assert.match(js, /function usePrepCounter\(group\)/);
  assert.match(js, /if\(held&&stored\)/);
  assert.match(js, /group\.userData\.storedItem=\{\.\.\.held\}/);
  assert.match(js, /setHeldItem\(null\)/);
  assert.match(js, /const item=\{\.\.\.stored\}/);
  assert.match(js, /group\.userData\.storedItem=null/);
  assert.match(js, /setHeldItem\(item\)/);
});

test('Bunsik Kitchen v33 renders stored prep-counter items in the 3D world', () => {
  assert.match(js, /makeItemSprite\(item\)/);
  assert.match(js, /syncCounterVisual\(group\)/);
  assert.match(js, /group\.userData\.storedItem/);
  assert.match(js, /anchor\.add\(this\.makeItemSprite/);
});

test('Bunsik Kitchen v33 clears prep counters between shifts', () => {
  assert.match(js, /clearPrepCounters\(\)/);
  assert.match(js, /kitchen\.clearPrepCounters\(\)/);
});

test('Bunsik Kitchen v33 exposes generic storage-slot actions in the proximity dock', () => {
  assert.match(js, /n\?\.group\?\.userData\?\.storageSlot/);
  assert.match(js, /function storageLabel\(group\)/);
  assert.match(js, /에 내려놓기/);
  assert.match(js, /집기/);
  assert.match(js, /사용 중/);
});

test('Bunsik Kitchen v33 publishes the automation strategy', () => {
  assert.match(html, /컨베이어\/Grabber 방향/);
  assert.match(html, /Grabber는 재료를 당기고/);
  assert.match(html, /장비 구매/);
});


test('Bunsik Kitchen v33 unlocks a helper worker after the first tutorial dish', () => {
  assert.match(html, /id="helperBtn" class="helper-toggle hidden"/);
  assert.match(js, /helperUnlocked:false,helperEnabled:false/);
  assert.match(js, /function unlockHelper\(\)/);
  assert.match(js, /state\.tutorial\.active=false;state\.tutorial\.step=7;state\.spawnClock=0;unlockHelper\(\)/);
  assert.match(js, /알바생 합류!/);
  assert.match(css, /\.helper-toggle\.active/);
});

test('Bunsik Kitchen v33 helper only consumes prepared non-automation counter ingredients', () => {
  assert.match(js, /findHelperTask\(\)/);
  assert.match(js, /counter\.userData\.storageSlot&&!counter\.userData\.automationType&&counter\.userData\.storedItem/);
  assert.match(js, /item\.kind!=='ingredient'/);
  assert.match(js, /helperCanDeliver\(item\.id,p\)/);
  assert.doesNotMatch(js, /helper.*pickIngredient\(/i);
});

test('Bunsik Kitchen v33 reserves counter work to avoid player-worker duplication', () => {
  assert.match(js, /counter\.userData\.reservedBy='helper'/);
  assert.match(js, /group\.userData\.reservedBy==='helper'/);
  assert.match(js, /알바생이 이 조리대 재료를 가지러 오는 중이에요/);
  assert.match(js, /delete task\.counter\.userData\.reservedBy/);
});

test('Bunsik Kitchen v33 helper paths around solid kitchen furniture', () => {
  assert.match(js, /buildHelperPath\(group,approach=/);
  assert.match(js, /this\.isBlockedPosition\(x,z,\.26\)/);
  assert.match(js, /moveHelperPath\(dt\)/);
  assert.match(js, /for\(const \[dx,dz\] of \[\[step,0\],\[-step,0\],\[0,step\],\[0,-step\]\]\)/);
});

test('Bunsik Kitchen v33 helper safely returns or releases carried work', () => {
  assert.match(js, /returnHelperCarry\(\)/);
  assert.match(js, /preferred\?\.visible&&!preferred\.userData\.storedItem/);
  assert.match(js, /this\.setHelperCarry\(null\);return false/);
  assert.match(js, /resetHelper\(\)/);
});

test('Bunsik Kitchen v33 helper can be toggled without disabling player cooking', () => {
  assert.match(js, /setHelperEnabled\(on\)/);
  assert.match(js, /els\.helper\?\.addEventListener\('click'/);
  assert.match(js, /알바생 자동 운반 ON/);
  assert.match(js, /알바생 자동 운반 OFF/);
  assert.match(html, /aria-label="알바생 자동 운반 켜기\/끄기"/);
});


test('Bunsik Kitchen v33 adds movable conveyor and grabber storage devices', () => {
  assert.match(js, /makeAutomationStation\('conveyorA','컨베이어 A','conveyor'/);
  assert.match(js, /makeAutomationStation\('grabberA','Grabber','grabber'/);
  assert.match(js, /holder\.userData\.automationType=type/);
  assert.match(js, /holder\.userData\.storageSlot=true/);
  assert.match(js, /new THREE\.ArrowHelper/);
  assert.match(js, /automationClock=0/);
});

test('Bunsik Kitchen v33 automation is directional and rotatable during prep', () => {
  assert.match(html, /id="rotateStationBtn"/);
  assert.match(js, /rotateSelectedAutomation\(\)/);
  assert.match(js, /g\.userData\.direction=\(g\.userData\.direction\+1\)%4/);
  assert.match(js, /g\.rotation\.y=g\.userData\.direction\*Math\.PI\/2/);
  assert.match(js, /e\.code==='KeyR'&&state\.phase==='prep'/);
  assert.match(js, /automationVector\(group\)/);
  assert.match(css, /\.prep-bar \.rotate-btn/);
});

test('Bunsik Kitchen v33 conveyor moves one item only into an empty forward slot', () => {
  assert.match(js, /transferAutomationItem\(from,to\)/);
  assert.match(js, /!from\?\.userData\?\.storedItem/);
  assert.match(js, /to\.userData\.storedItem/);
  assert.match(js, /to\.userData\.reservedBy/);
  assert.match(js, /to\.userData\.storedItem=\{\.\.\.from\.userData\.storedItem\}/);
  assert.match(js, /from\.userData\.storedItem=null/);
  assert.match(js, /findStorageInDirection\(g,1,'empty'\)/);
});

test('Bunsik Kitchen v33 automation inserts only compatible ingredients into pots', () => {
  assert.match(js, /findPotInDirection\(origin,item\)/);
  assert.match(js, /item\.kind!=='ingredient'/);
  assert.match(js, /this\.helperCanDeliver\(item\.id,state\.pots\[i\]\)/);
  assert.match(js, /potIndex!=null&&addToPot\(potIndex,item\.id\)/);
  assert.match(js, /g\.userData\.storedItem=null/);
});

test('Bunsik Kitchen v33 grabber pulls from a prepared slot behind it without stealing reserved work', () => {
  assert.match(js, /g\.userData\.automationType==='grabber'\|\|g\.userData\.automationType==='smartGrabber'/);
  assert.match(js, /findStorageInDirection\(g,-1,'filled',/);
  assert.match(js, /item\?\.kind==='ingredient'/);
  assert.match(js, /!candidate\.userData\.automationType/);
  assert.match(js, /candidate\.userData\.reservedBy!=='helper'/);
});

test('Bunsik Kitchen v33 automation waits until free service and shares the storage contract', () => {
  assert.match(js, /updateAutomation\(dt\)/);
  assert.match(js, /state\.phase!=='service'\|\|state\.tutorial\.active/);
  assert.match(js, /this\.updateAutomation\(dt\)/);
  assert.match(js, /storageLabel\(group\)/);
  assert.match(js, /automationType==='conveyor'/);
  assert.match(js, /automationType==='grabber'/);
});

test('Bunsik Kitchen v33 clears automation buffers and reservations between shifts', () => {
  assert.match(js, /delete s\.group\.userData\.reservedBy/);
  assert.match(js, /s\.group\.userData\.automationClock=0/);
  assert.match(js, /s\.group\.userData\.storedItem=null/);
  assert.match(js, /kitchen\.clearPrepCounters\(\)/);
});


test('Bunsik Kitchen v33 registers and loads persistent tycoon progression', () => {
  const storage=fs.readFileSync(path.join(root,'kidscade-storage.js'),'utf8');
  assert.match(html, /\.\.\/\.\.\/kidscade-storage\.js/);
  assert.match(storage, /bunsikTycoonProgressV1:\s*'kidscade_bunsik_tycoon_progress_v1'/);
  assert.match(js, /const SAVE_KEY='bunsikTycoonProgressV1'/);
  assert.match(js, /KidscadeStorage\?\.getJson\?\.\(SAVE_KEY,null\)/);
  assert.match(js, /KidscadeStorage\?\.setJson\?\.\(SAVE_KEY,progress\)/);
});

test('Bunsik Kitchen v33 starts as manual-first progression instead of granting automation', () => {
  assert.match(js, /owned:\{prepCounter:2,conveyor:0,grabber:0,smartGrabber:0\}/);
  assert.match(js, /syncEquipmentVisibility\(\)/);
  assert.match(js, /return \(progress\.owned\[key\]\|\|0\)>\(group\.userData\.equipmentIndex\|\|0\)/);
  assert.match(js, /g\.visible=active/);
});

test('Bunsik Kitchen v33 adds an end-of-shift equipment shop and bank', () => {
  assert.match(html, /id="bankCash"/);
  assert.match(html, /id="equipmentShop"/);
  assert.match(html, /data-buy="prepCounter" data-price="900"/);
  assert.match(html, /data-buy="conveyor" data-price="1400"/);
  assert.match(html, /data-buy="grabber" data-price="2200"/);
  assert.match(html, /data-buy="smartGrabber" data-price="3400"/);
  assert.match(js, /progress\.cash\+=earned;progress\.shifts\+=1/);
  assert.match(js, /function purchaseEquipment\(key\)/);
  assert.match(js, /progress\.cash-=info\.price/);
  assert.match(js, /progress\.owned\[key\]=count\+1/);
});

test('Bunsik Kitchen v33 gates Smart Grabber behind a normal Grabber', () => {
  assert.match(js, /smartGrabber:\{name:'Smart Grabber',price:3400,min:0,max:1,requires:'grabber'\}/);
  assert.match(js, /if\(info\.requires&&\(progress\.owned\[info\.requires\]\|\|0\)<1\)/);
  assert.match(js, /를 먼저 구매해야 해요/);
});

test('Bunsik Kitchen v33 adds a filterable Smart Grabber', () => {
  assert.match(js, /makeAutomationStation\('smartGrabberA','Smart Grabber','smartGrabber'/);
  assert.match(js, /const SMART_FILTERS=\['noodle','soup','egg','green','cheese'\]/);
  assert.match(js, /holder\.userData\.filterId=progress\.filters\[id\]\|\|'noodle'/);
  assert.match(js, /g\.userData\.automationType!=='smartGrabber'\|\|item\.id===g\.userData\.filterId/);
  assert.match(html, /id="smartFilterBtn"/);
  assert.match(js, /function cycleSmartFilter\(\)/);
  assert.match(js, /progress\.filters\[g\.userData\.stationId\]=next/);
});

test('Bunsik Kitchen v33 persists purchased equipment layout, direction and Smart Grabber filter', () => {
  assert.match(js, /snapshotEquipmentLayout\(\)/);
  assert.match(js, /layout\[s\.id\]=\{x:/);
  assert.match(js, /layout\[s\.id\]\.dir=g\.userData\.direction\|\|0/);
  assert.match(js, /progress\.filters\[s\.id\]=s\.group\.userData\.filterId\|\|'noodle'/);
  assert.match(js, /applySavedEquipmentState\(\)/);
  assert.match(js, /g\.position\.set\(saved\.x,0,saved\.z\)/);
});

test('Bunsik Kitchen v33 only runs the onboarding tutorial once', () => {
  assert.match(js, /tutorialDone:false/);
  assert.match(js, /progress\.tutorialDone=true;saveProgress\(\)/);
  assert.match(js, /state\.tutorial=\{active:!progress\.tutorialDone,step:progress\.tutorialDone\?7:0\}/);
  assert.match(js, /if\(state\.tutorial\.active\)spawnOrder\('egg'\);else\{spawnOrder\(\);spawnOrder\(\)\}/);
});

test('Bunsik Kitchen v33 shop result card stays scrollable on small screens', () => {
  assert.match(css, /\.result-card\{max-height:92vh;overflow:auto\}/);
  assert.match(css, /\.equipment-shop\{/);
  assert.match(css, /\.shop-item\{/);
});

test('Bunsik Kitchen v33 compatibility entry is synchronized with the live game', () => {
  assert.match(rootEntry, /id="equipmentShop"/);
  assert.match(rootEntry, /id="smartFilterBtn"/);
  assert.match(rootEntry, /kidscade-storage\.js/);
  assert.match(rootEntry, /games\/job_bogle_bunsik\/bunsik-kitchen\.js\?v=33/);
});

test('Bunsik Kitchen v33 fills visible kitchen and hall gaps with shared 3D props', () => {
  for (const file of [
    'wall-cabinet-straight.glb','wall-cabinet-single.glb','wall-shelf-kitchen.glb',
    'red-mug.glb','blue-mug.glb','spoon.glb','spatula.glb','oven-glove.glb',
    'kitchen-knife.glb','container-kitchen-a.glb','container-kitchen-b.glb',
    'wall-with-shelves.glb','cash-register.glb','pricing-card.glb','menu.glb','jar-a-large.glb'
  ]) assert.match(js,new RegExp(file.replaceAll('.', '\\.')));
  assert.match(js, /this\.attachModel\(prepA,KITCHEN,'container-kitchen-a\.glb'/);
  assert.match(js, /this\.placeModel\(BAKERY,'cash-register\.glb'/);
  assert.match(js, /this\.placeModel\(BAKERY_BITS,'menu\.glb'/);
});

test('Bunsik Kitchen v33 routes customers, hall staff, and dish cart around hall furniture', () => {
  assert.match(js, /dishReturnPoint=new THREE\.Vector3\(-3\.55,0,-5\.05\)/);
  assert.match(js, /hallLaneZ\(seat\)/);
  assert.match(js, /new THREE\.Vector3\(-\.45,0,laneZ\)/);
  assert.match(js, /new THREE\.Vector3\(\.45,0,laneZ\)/);
  assert.match(js, /hallWorkerServePath\(slot\)/);
  assert.match(js, /new THREE\.Vector3\(\.75,0,laneZ\)/);
  assert.match(js, /dishCartPathToTable\(seat\)/);
  assert.match(js, /dishCartPathToSink\(seat\)/);
  assert.match(js, /dishCartPathHome\(\)/);
  assert.match(js, /new THREE\.Vector3\(-\.75,\.02,laneZ\)/);
  assert.match(js, /new THREE\.Vector3\(0,\.02,-5\.2\)/);
  assert.doesNotMatch(js, /seat\.position\.z\+1\.15/);
});

test('Bunsik Kitchen v33 hall route geometry clears non-target furniture', () => {
  const tables={1:[-4.65,-6.65],2:[4.65,-6.65],3:[-4.65,-10.25],4:[4.65,-10.25],5:[7.45,-10.35]};
  const seats={1:[-4.65,-5.55],2:[4.65,-5.55],3:[-4.65,-9.15],4:[4.65,-9.15],5:[7.45,-9.25]};
  const lane=n=>n<=2?-5.85:n<=4?-8.35:-8.55;
  const obstacles=[['return',[-3.55,-4.28],1.15],...Object.entries(tables).map(([n,p])=>['table'+n,p,1.45])];
  const segDist=(a,b,p)=>{
    const vx=b[0]-a[0],vz=b[1]-a[1],l=vx*vx+vz*vz||1;
    const t=Math.max(0,Math.min(1,((p[0]-a[0])*vx+(p[1]-a[1])*vz)/l));
    return Math.hypot(p[0]-(a[0]+t*vx),p[1]-(a[1]+t*vz))
  };
  const clear=(route,ignore)=>route.slice(1).every((b,i)=>obstacles.every(([name,p,r])=>ignore.has(name)||segDist(route[i],b,p)>=r));
  for(const n of [1,2,3,4,5]){
    const [sx,sz]=seats[n],lz=lane(n),ignore=new Set(['table'+n]);
    const arrival=[[0,-15.15],[0,-12.15],[-.45,-12.15],[-.45,lz],[sx,lz],[sx,sz]];
    const sideX=sx+(sx < 0 ? .9 : -.9),worker=[[2.6,-4.75],[.75,-5.85],[.75,lz],[sideX,lz],[sideX,sz]];
    const target=[tables[n][0],tables[n][1]+.82];
    const cart=[[-7.7,-6.1],[-6.3,-8.35],[-.75,-8.35],[-.75,lz],[sx,lz],target];
    assert.equal(clear(arrival,ignore),true,'arrival route '+n);
    assert.equal(clear(worker,ignore),true,'hall worker route '+n);
    assert.equal(clear(cart,ignore),true,'dish cart route '+n);
  }
});

test('Bunsik Kitchen v33 lets the player walk between kitchen and dining hall', () => {
  assert.match(js, /hallBlockedPosition\(x,z,pr=\.34\)/);
  assert.match(js, /z<-13\.45\|\|z>6\.0/);
  assert.match(js, /Math\.abs\(x\)>1\.05-pr/);
  assert.doesNotMatch(js, /this\.box\(9\.4,\.86,1\.0/);
  assert.match(js, /홀 ↕ 주방/);
  assert.match(js, /const inHall=this\.player\.position\.z<-3\.3/);
  assert.match(js, /Math\.max\(-12\.8,Math\.min\(4\.75,this\.player\.position\.z\)\)/);
  assert.match(js, /minZ=-3\.45,maxZ=5\.95/);
});

test('Bunsik Kitchen v33 keeps two-tile movement lanes and a player follow camera', () => {
  assert.match(js, /const xs=\[-3\.15,-1\.05,1\.05,3\.15\],z=-\.05/);
  assert.match(js, /protectedAisle\(x,z,r=\.7\)/);
  assert.match(js, /약 1m 격자 두 칸/);
  assert.match(js, /updateCamera\(dt=0,immediate=false\)/);
  assert.match(js, /state\.phase==='service'&&this\.player/);
  assert.match(js, /targetFov=mobile\?44:35/);
  assert.match(js, /this\.updateCamera\(dt\)/);
  assert.match(js, /version:2/);
  assert.match(js, /layoutOk=Number\(v\.version\)>=2/);
});

test('Bunsik Kitchen v33 zones ingredients left and cleanup stations right', () => {
  assert.match(js, /'sink','싱크 · 물\/설거지'.*,-8\.15,-2\.65/);
  assert.match(js, /'fridge','토핑 냉장고'.*,-8\.05,4\.15/);
  assert.match(js, /'rack','깨끗한 접시'.*,8\.15,-2\.1/);
  assert.match(js, /'prepCounterA','조리대 A',8\.05,\.15/);
  assert.match(js, /serviceHome=new THREE\.Vector3\(0,\.92,5\.25\)/);
});

test('Bunsik Kitchen v33 anchors orders bottom-left and tasks bottom-right', () => {
  assert.match(html, /class="order-corner-panel"/);
  assert.match(html, /id="taskPanel" class="task-panel"/);
  assert.match(html, /id="taskList"/);
  assert.match(html, /id="taskProgress"/);
  assert.match(css, /\.order-corner-panel\{[\s\S]*left:14px;bottom:14px/);
  assert.match(css, /\.task-panel\{[\s\S]*right:14px;bottom:14px/);
  assert.match(css, /\.customer-orders\{[\s\S]*position:static/);
  assert.match(css, /\.pot-world-labels\{display:none!important\}/);
});

test('Bunsik Kitchen v33 replaces floating labels with rounded dashed floor interaction tiles', () => {
  assert.match(js, /makeFloorActionTile\(text,opt=\{\}\)/);
  assert.match(js, /g\.setLineDash\(\[20,14\]\)/);
  assert.match(js, /attachStationFloorTile\(holder,id,label\)/);
  assert.match(js, /floorLabelForStation\(id,label\)/);
  assert.match(js, /if\(id==='sink'\)return'싱크대'/);
  assert.match(js, /makeFloorActionTile\('냄비 '\+\(i\+1\)\)/);
  assert.match(js, /makeFloorActionTile\('배식대'\)/);
  assert.doesNotMatch(js, /makeTextSprite\('나 · 점장'\)/);
  assert.doesNotMatch(js, /makeTextSprite\('알바생'\)/);
});

test('Bunsik Kitchen v33 renders a stacked live task checklist', () => {
  assert.match(js, /function taskPlan\(\)/);
  assert.match(js, /function renderTaskPanel\(\)/);
  assert.match(js, /싱크대에서 물 2컵/);
  assert.match(js, /면 바구니에서 면 가져오기/);
  assert.match(js, /스프 바구니에서 스프 가져오기/);
  assert.match(js, /토핑 냉장고에서/);
  assert.match(js, /배식대에서 서빙하기/);
  assert.match(css, /\.task-list li\.done/);
  assert.match(css, /\.task-list li\.current/);
  assert.match(css, /\.task-list li\.urgent/);
});

test('Bunsik Kitchen v33 binds each order to a specific pot and carries that order through serving', () => {
  assert.match(js, /orderId:null/);
  assert.match(js, /function potIndexForOrder\(orderId\)/);
  assert.match(js, /function assignOrderToPot\(index,orderId,announce=true\)/);
  assert.match(js, /function focusOrder\(orderId\)/);
  assert.match(js, /if\(state\.phase==='service'\)ensurePotOrder\(index\)/);
  assert.match(js, /ticket-assignment/);
  assert.match(js, /🍳 냄비/);
  assert.match(js, /orderId:state\.tray\.orderId/);
  assert.match(js, /releaseOrderBinding\(order\.id\)/);
  assert.match(js, /const bound=orderForPot\(p\)/);
});

test('Bunsik Kitchen v33 reduces water errands to one two-cup pitcher trip', () => {
  assert.match(js, /const amount=id==='water'\?2:1/);
  assert.match(js, /물 2컵을 주전자에 받았어요/);
  assert.match(js, /addToPot\(index,action,held\.amount\|\|1\)/);
  assert.match(js, /const waterTarget=2/);
  assert.match(js, /주전자에 물 2컵 받기/);
  assert.doesNotMatch(js, /물 한 컵 받기/);
});

test('Bunsik Kitchen v33 rewards consecutive good serves with combo bonuses and customer celebration', () => {
  assert.match(html, /id="comboStat"/);
  assert.match(js, /function applyServeCombo\(quality\)/);
  assert.match(js, /state\.combo>=2\?Math\.min\(300,\(state\.combo-1\)\*100\):0/);
  assert.match(js, /customerCelebrate\(slot,q,streak\.combo,totalEarned\)/);
  assert.match(js, /PERFECT!/);
  assert.match(css, /\.combo-stat/);
  assert.match(css, /@keyframes comboPop/);
  assert.match(css, /\.ticket-assignment\.assigned/);
});

test('Bunsik Kitchen v33 task list follows the selected pot order rather than the oldest ticket', () => {
  assert.match(js, /orderForPot\(p\)\|\|state\.orders\.find/);
  assert.match(js, /els\.taskProgress\.textContent=o\?'냄비 '/);
  assert.match(js, /mealReady=.*state\.heldItem\.orderId===order\.id/);
});

test('Bunsik Kitchen v33 preserves two-cup water through helper and automation', () => {
  assert.match(js, /addToPot\(potIndex,item\.id,item\.amount\|\|1\)/);
  assert.match(js, /addToPot\(task\.potIndex,id,this\.helperCarry\.amount\|\|1\)/);
  assert.match(js, /const amount=id==='water'\?2:1/);
});

test('Bunsik Kitchen v33 recovers safely when a bound customer leaves', () => {
  assert.match(js, /const affected=expiredOrders\.map\(o=>potIndexForOrder\(o\.id\)\)/);
  assert.match(js, /expiredOrders\.forEach\(o=>releaseOrderBinding\(o\.id\)\)/);
  assert.match(js, /affected\.forEach\(i=>ensurePotOrder\(i\)\)/);
  assert.match(js, /이 냄비의 손님이 떠났어요 · 냄비 비우기/);
  assert.match(js, /const p=selectedIndex>=0\?state\.pots\[selectedIndex\]:state\.pots\[0\],boundOrder=orderForPot\(p\),compatible=boundOrder\|\|compatibleOrderForPot\(p\)/);
});

test('Bunsik Kitchen v33 builds a dining hall with a real entrance and four seats', () => {
  assert.match(js, /this\.hallSeats=\[\];this\.hallTableGroups=\[\];this\.customerStates=\[\]/);
  assert.match(js, /makeDiningHall\(\)/);
  assert.match(js, /door-modular\.glb/);
  assert.match(js, /tableNo:1/);
  assert.match(js, /tableNo:4/);
  assert.match(js, /tableNo:5/);
  assert.match(js, /this\.hallSeats\.push\(/);
  assert.match(js, /this\.box\(20\.4,\.3,21\.6/);
});

test('Bunsik Kitchen v33 makes customers enter, walk to a free table, and sit', () => {
  assert.match(js, /beginCustomerArrival\(order\)/);
  assert.match(js, /order\.paused=true;order\.arriving=true;order\.seated=false/);
  assert.match(js, /c\.phase=c\.wait>0\?'waiting':'walking'/);
  assert.match(js, /updateCustomerHall\(dt\)/);
  assert.match(js, /seatCustomer\(c\)/);
  assert.match(js, /order\.paused=false;order\.arriving=false;order\.seated=true/);
  assert.match(js, /this\.updateCustomerHall\(dt\)/);
});

test('Bunsik Kitchen v33 staggers arrivals, opens the door, and serves the actual table', () => {
  assert.match(js, /ahead\*\.55/);
  assert.match(js, /this\.hallDoorOpenUntil=Math\.max/);
  assert.match(js, /target=open\?-1\.08:0/);
  assert.match(js, /guest=this\.customerHolders\[slot\]/);
  assert.match(js, /guest\?\.position\.z/);
  assert.match(js, /o\.tableNo\?o\.tableNo\+'번 테이블'/);
});

test('Bunsik Kitchen v33 frees hall seats on expiration and reset', () => {
  assert.match(js, /resetCustomerForOrder\(orderId\)/);
  assert.match(js, /resetCustomerHall\(\)/);
  assert.match(js, /seat\.occupiedBy=null/);
  assert.match(js, /kitchen\.dismissCustomerOrder\(o\.id/);
  assert.match(js, /kitchen\.resetCustomerHall\(\)/);
});

test('Bunsik Kitchen v33 adds money plus reputation progression without wiping v2 saves', () => {
  assert.match(js, /version:3/);
  assert.match(js, /reputation:0,satisfied:0/);
  assert.match(js, /layoutOk=Number\(v\.version\)>=2/);
  assert.match(js, /REP_THRESHOLDS=\[0,8,24,55,100\]/);
  assert.match(js, /function reputationStars/);
  assert.match(js, /function addServeReputation/);
  assert.match(html, /id="repStars"/);
  assert.match(html, /id="endRep"/);
});

test('Bunsik Kitchen v33 gates five dining seats behind visible hall upgrades', () => {
  assert.match(js, /tableNo:3[\s\S]*upgrade:'table3'/);
  assert.match(js, /tableNo:4[\s\S]*upgrade:'table4'/);
  assert.match(js, /tableNo:5[\s\S]*upgrade:'hallExpansion'/);
  assert.match(js, /seat\.enabled=enabled/);
  assert.match(js, /function unlockedSeatSlots\(\)/);
  assert.match(js, /filter\(s=>s\.enabled\)/);
  assert.match(js, /state\.orders\.length>=Math\.min\(MAX_ORDERS,unlockedSeatSlots\(\)\.length\)/);
});

test('Bunsik Kitchen v33 growth shop has real kitchen hall staff menu and expansion effects', () => {
  assert.match(js, /dishRack:\{name:'대형 식기 선반'/);
  assert.match(js, /wideSink:\{name:'넓은 싱크대'/);
  assert.match(js, /hallStaff:\{name:'홀 알바 고용'/);
  assert.match(js, /dishCart:\{name:'퇴식 카트'/);
  assert.match(js, /menuPlus:\{name:'토핑 메뉴 연구'/);
  assert.match(js, /hallExpansion:\{name:'홀 확장 공사'/);
  assert.match(js, /famousSign:\{name:'동네 명물 간판'/);
  assert.match(js, /hasUpgrade\('dishRack'\)\?5:3/);
  assert.match(js, /hasUpgrade\('wideSink'\)\?900:1450/);
  assert.match(js, /hasUpgrade\('dishCart'\)/);
  assert.match(js, /makeHallWorker\(\)/);
  assert.match(js, /animateHallWorkerServe/);
  assert.match(js, /shopping-cart\.glb/);
  assert.match(js, /매출 10% 보너스/);
});

test('Bunsik Kitchen v33 unlocks additional real recipes instead of placeholder menu buttons', () => {
  assert.match(js, /id:'eggGreen',name:'계란 파 라면'/);
  assert.match(js, /id:'cheeseGreen',name:'치즈 파 라면'/);
  assert.match(js, /unlock:'menuPlus'/);
  assert.match(js, /function availableRecipeIds\(\)/);
  assert.match(js, /RECIPES\.filter\(r=>!r\.unlock\|\|hasUpgrade\(r\.unlock\)\)/);
});

test('Bunsik Kitchen v33 renders categorized reputation-gated growth shop', () => {
  assert.match(html, /id="shopTabs"/);
  assert.match(html, /data-shop-category="kitchen"/);
  assert.match(html, /data-shop-category="hall"/);
  assert.match(html, /data-shop-category="staff"/);
  assert.match(html, /data-shop-category="menu"/);
  assert.match(html, /data-shop-category="expansion"/);
  assert.match(js, /function renderEquipmentShop/);
  assert.match(js, /function shopLockReason/);
  assert.match(css, /\.shop-tabs/);
  assert.match(css, /\.growth-shop/);
});

test('Bunsik Kitchen v33 keeps bound multi-topping orders authoritative over subset recipes', () => {
  assert.match(js, /const bound=orderForPot\(p\),target=bound&&recipeById\(bound\.recipeId\)/);
  assert.match(js, /const missing=target\.need\.filter/);
  assert.match(js, /exact\?\.id===target\.id&&p\.noodleTime>=5\.5\?\['plate'\]:\[\]/);
  assert.match(js, /target\.name\+' · '\+missing\.map\(ingredientLabel\)\.join\(' \+ '\)\+'을 더 넣으세요'/);
});

test('Bunsik Kitchen v33 does not bank the shift before an active serve or plating finishes', () => {
  assert.match(js, /if\(state\.time<=0&&!state\.busy\)endShift\(\)/);
  assert.match(js, /state\.time>0&&state\.spawnClock>=spawnInterval/);
});

test('Bunsik Kitchen v33 cancels old customer celebration effects before a seat is reused', () => {
  assert.match(js, /reactionToken/);
  assert.match(js, /customerFx/);
  assert.match(js, /h\.userData\.reactionToken!==token/);
  assert.match(js, /setTimeout\(\(\)=>\{if\(state\.running\)spawnOrder\(\)\},1250\)/);
});

test('Bunsik Kitchen v33 prints receipts only after customers sit and place the order', () => {
  assert.match(js, /state\.orders\.filter\(o=>o\.seated\)\.forEach/);
  assert.doesNotMatch(js, /spawnOrder\(forcedId=null\)[\s\S]{0,500}assignOrderToPot/);
  assert.match(js, /seatCustomer\(c\)[\s\S]*order\.seated=true/);
  assert.match(js, /makeTextSprite\('주문할게요!'\)/);
  assert.match(js, /renderOrders\(\);renderTaskPanel\(\)/);
  assert.match(js, /번 테이블 주문이 들어왔어요!/);
});

test('Bunsik Kitchen v33 keeps eating customers occupying their table until they physically leave', () => {
  assert.match(js, /filter\(s=>s\.enabled&&!s\.occupiedBy&&!s\.dirtyPending\)/);
  assert.match(js, /beginDining\(orderId,meta=\{\}\)/);
  assert.match(js, /c\.phase='eating'/);
  assert.match(js, /eatRemaining=6\.4\+\(orderId%4\)\*1\.05/);
  assert.match(js, /setSeatDish\(c\.seat,'meal'\)/);
  assert.match(js, /setSeatDish\(c\.seat,'dirty'\)/);
  assert.match(js, /c\.phase='leaving'/);
  assert.match(js, /resetCustomerForOrder\(id\)/);
});

test('Bunsik Kitchen v33 has a physical dish return loop with and without the cart', () => {
  assert.match(js, /beginReturnDish\(c\)/);
  assert.match(js, /setCustomerDishCarry\(c,true\)/);
  assert.match(js, /addDirtyPlate\(\);this\.beginCustomerExit\(c\)/);
  assert.match(js, /queueDishCart\(c\)/);
  assert.match(js, /updateDishCart\(dt\)/);
  assert.match(js, /task\.phase==='toTable'/);
  assert.match(js, /task\.phase==='toSink'/);
  assert.match(js, /this\.setSeatDish\(seat,'none'\)/);
  assert.match(js, /addDirtyPlate\(\);task\.phase='home'/);
  assert.match(js, /식사 끝난 테이블의 그릇을 싱크대로 자동 회수/);
});

test('Bunsik Kitchen v33 turns the hall expansion into a visible construction change', () => {
  assert.match(js, /this\.hallExpansionLocked=new THREE\.Group/);
  assert.match(js, /🚧 확장 공사 예정/);
  assert.match(js, /this\.hallExpansionOpen=new THREE\.Group/);
  assert.match(js, /this\.hallExpansionLocked\.visible=!hasUpgrade\('hallExpansion'\)/);
  assert.match(js, /this\.hallExpansionOpen\.visible=hasUpgrade\('hallExpansion'\)/);
  assert.match(js, /tableNo:5[\s\S]*upgrade:'hallExpansion'/);
});

test('Bunsik Kitchen v33 closes gracefully after accepted orders and diners finish', () => {
  assert.match(js, /state\.closingGrace=25/);
  assert.match(js, /받은 주문은 25초 동안 마저 만들 수 있어요/);
  assert.match(js, /if\(state\.closingGrace<=0&&state\.orders\.length\)expireClosingOrders\(\)/);
  assert.match(js, /state\.orders\.length===0&&!kitchen\.hasActiveDiningCustomers\(\)/);
  assert.match(js, /dismissCustomerOrder\(o\.id,'😕 마감 시간이 끝났네요\. 다음에 올게요!'\)/);
});

test('Bunsik Kitchen v33 makes impatient customers complain and walk out instead of vanishing', () => {
  assert.match(js, /dismissCustomerOrder\(orderId,text='😠 너무 오래 기다렸어요!'\)/);
  assert.match(js, /c\.phase='complaining'/);
  assert.match(js, /this\.beginCustomerExit\(c\)/);
  assert.match(js, /'eating','reviewing','complaining','returningDish','leaving'/);
  assert.match(js, /kitchen\.dismissCustomerOrder\(o\.id,'😠 너무 오래 기다렸어요!'\)/);
});
