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

test('Bunsik Kitchen v13 keeps the 3D kitchen visually dominant', () => {
  assert.match(html, /bunsik-kitchen\.css\?v=13/);
  assert.match(html, /bunsik-kitchen\.js\?v=13/);
  assert.match(html, /class="customer-orders"/);
  assert.match(html, /class="pot-world-labels"/);
  assert.match(html, /class="context-panel"/);
  assert.doesNotMatch(html, /class="selected-help"/);
  assert.doesNotMatch(html, /class="tray-btn/);
  assert.doesNotMatch(html, /data-action="water"/);
  assert.match(css, /\.order-bubble/);
  assert.match(css, /\.pot-tag/);
  assert.match(css, /\.serve-drag/);
});

test('Bunsik Kitchen module parses as JavaScript', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {input:js,encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr || result.stdout || 'Bunsik Kitchen syntax check failed');
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
  assert.match(js, /state\.tray=\{recipeId:recipe\.id[\s\S]*ready:false/);
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
  assert.match(js, /customerReact\(slot\)/);
  assert.match(css, /\.serve-drag\{display:none!important/);
});

test('orders are compact customer speech bubbles rather than dashboard cards', () => {
  assert.match(js, /className='order-bubble'/);
  assert.match(js, /customer-face/);
  assert.match(js, /recipe-icons/);
  assert.match(js, /patience/);
  assert.doesNotMatch(js, /className='order-card'/);
  assert.doesNotMatch(css, /\.order-card\{/);
});

test('burners unlock gradually so the first shift starts readable', () => {
  assert.match(js, /function activePotCount\(\)/);
  assert.match(js, /state\.served>=6\?4:state\.served>=3\?3:2/);
  assert.match(js, /if\(index>=activePotCount\(\)\)/);
  assert.match(js, /lockTag/);
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
    'assets/game/3d/interiors/modular-sushi-restaurant-kit/ramen.glb',
    'assets/game/3d/bakery/interior/serving-tray.glb',
    'assets/game/characters/people/character-female-b.glb',
    'assets/game/characters/people/character-male-a.glb'
  ];
  for (const rel of required) assert.ok(fs.existsSync(path.join(root,rel)), 'missing asset: '+rel);
  assert.match(js, /const BAKERY=/);
  assert.match(js, /CUSTOMER_MODELS/);
});

test('catalog and compatibility entry publish v13', () => {
  assert.ok(game);
  assert.equal(game.href, 'games/job_bogle_bunsik/보글보글 분식집.html?v=13');
  assert.equal(game.difficulty, 'easy');
  assert.match(rootEntry, /games\/job_bogle_bunsik\/bunsik-kitchen\.css\?v=13/);
  assert.match(rootEntry, /games\/job_bogle_bunsik\/bunsik-kitchen\.js\?v=13/);
  assert.match(rootEntry, /"three":"assets\/vendor\/three-r160\/three\.module\.js"/);
});

test('Bunsik Kitchen build script publishes v13', () => {
  const build=fs.readFileSync(path.join(root,'scripts','bunsik-kitchen-build.cjs'),'utf8');
  assert.match(build,/\?v=13/);
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  assert.match(pkg.scripts.build,/bunsik-kitchen-build\.cjs/);
});




test('Bunsik Kitchen v13 adds a PlateUp-style prep phase and movable layout stations', () => {
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

test('Bunsik Kitchen v13 uses committed CC0 assets for the physical kitchen sources', () => {
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

test('Bunsik Kitchen v13 adds player movement and proximity interaction', () => {
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

test('Bunsik Kitchen v13 turns plates into a reusable washing bottleneck', () => {
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


test('Bunsik Kitchen v13 enforces a one-item carry invariant', () => {
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

test('Bunsik Kitchen v13 tutorial follows the split source route', () => {
  assert.match(js, /싱크로 가서 E로 물을 받아/);
  assert.match(js, /면 바구니로 가서 E로 면을 들고/);
  assert.match(js, /스프 바구니에서 스프를 들고/);
  assert.match(js, /토핑 냉장고에서 계란을 꺼내/);
  assert.match(js, /완성 라면을 들고 배식대로 이동해 E로 서빙/);
  assert.match(js, /function recommendedToppingIngredient\(\)/);
});

test('Bunsik Kitchen v13 no longer exposes instant ingredient keyboard shortcuts', () => {
  assert.doesNotMatch(js, /Digit1:'water'/);
  assert.doesNotMatch(js, /Digit2:'noodle'/);
  assert.doesNotMatch(js, /Digit3:'soup'/);
  assert.doesNotMatch(js, /Digit4:'egg'/);
  assert.match(js, /KeyE/);
  assert.match(js, /Space/);
});


test('Bunsik Kitchen v13 makes furniture collision matter during service', () => {
  assert.match(js, /isBlockedPosition\(x,z,pr=/);
  assert.match(js, /layoutPlacementBlocked\(holder,x,z\)/);
  assert.match(js, /this\.potVisuals\.some\(v=>Math\.hypot/);
  assert.match(js, /this\.layoutStations\.some\(s=>Math\.hypot/);
  assert.match(js, /if\(!this\.isBlockedPosition\(nx,this\.player\.position\.z\)\)/);
  assert.match(js, /if\(!this\.isBlockedPosition\(this\.player\.position\.x,nz\)\)/);
});

test('Bunsik Kitchen v13 lets players recover from a wrong carried item', () => {
  assert.match(js, /function returnHeldAtSource\(ids\)/);
  assert.match(js, /function dropHeldItem\(\)/);
  assert.match(js, /state\.heldItem\.kind==='ingredient'/);
  assert.match(js, /재료 내려놓기/);
  assert.match(js, /heldDiscardArmedUntil/);
  assert.match(js, /완성 라면을 정말 버릴까요/);
});

test('Bunsik Kitchen v13 rebalance matches the longer direct-carry loop', () => {
  assert.match(js, /const SHIFT_SECONDS=150;/);
  assert.match(js, /const TARGET_REVENUE=5200;/);
  assert.match(html, /id="time">150</);
  assert.match(html, /id="goal">5,200원</);
});


test('Bunsik Kitchen v13 adds two movable one-slot prep counters', () => {
  assert.match(js, /makePrepCounter\('prepCounterA','조리대 A'/);
  assert.match(js, /makePrepCounter\('prepCounterB','조리대 B'/);
  assert.match(js, /storageSlot=true/);
  assert.match(js, /storedItem=null/);
  assert.match(js, /itemAnchor/);
  assert.match(js, /counter-straight\.glb/);
});

test('Bunsik Kitchen v13 moves items between hand and prep counters without duplication', () => {
  assert.match(js, /function usePrepCounter\(group\)/);
  assert.match(js, /if\(held&&stored\)/);
  assert.match(js, /group\.userData\.storedItem=\{\.\.\.held\}/);
  assert.match(js, /setHeldItem\(null\)/);
  assert.match(js, /const item=\{\.\.\.stored\}/);
  assert.match(js, /group\.userData\.storedItem=null/);
  assert.match(js, /setHeldItem\(item\)/);
});

test('Bunsik Kitchen v13 renders stored prep-counter items in the 3D world', () => {
  assert.match(js, /makeItemSprite\(item\)/);
  assert.match(js, /syncCounterVisual\(group\)/);
  assert.match(js, /group\.userData\.storedItem/);
  assert.match(js, /anchor\.add\(this\.makeItemSprite/);
});

test('Bunsik Kitchen v13 clears prep counters between shifts', () => {
  assert.match(js, /clearPrepCounters\(\)/);
  assert.match(js, /kitchen\.clearPrepCounters\(\)/);
});

test('Bunsik Kitchen v13 exposes prep-counter actions in the proximity dock', () => {
  assert.match(js, /n\?\.group\?\.userData\?\.storageSlot/);
  assert.match(js, /조리대에 내려놓기/);
  assert.match(js, /집기/);
  assert.match(js, /조리대 사용 중/);
});

test('Bunsik Kitchen v13 publishes the prep-counter strategy', () => {
  assert.match(html, /조리대 2개/);
  assert.match(html, /조리대에 재료를 미리 두면/);
  assert.match(html, /알바 운반/);
});


test('Bunsik Kitchen v13 unlocks a helper worker after the first tutorial dish', () => {
  assert.match(html, /id="helperBtn" class="helper-toggle hidden"/);
  assert.match(js, /helperUnlocked:false,helperEnabled:false/);
  assert.match(js, /function unlockHelper\(\)/);
  assert.match(js, /state\.tutorial\.active=false;state\.tutorial\.step=7;state\.spawnClock=0;unlockHelper\(\)/);
  assert.match(js, /알바생 합류!/);
  assert.match(css, /\.helper-toggle\.active/);
});

test('Bunsik Kitchen v13 helper only consumes prepared counter ingredients', () => {
  assert.match(js, /findHelperTask\(\)/);
  assert.match(js, /counter\.userData\.storageSlot&&counter\.userData\.storedItem/);
  assert.match(js, /item\.kind!=='ingredient'/);
  assert.match(js, /helperCanDeliver\(item\.id,p\)/);
  assert.doesNotMatch(js, /helper.*pickIngredient\(/i);
});

test('Bunsik Kitchen v13 reserves counter work to avoid player-worker duplication', () => {
  assert.match(js, /counter\.userData\.reservedBy='helper'/);
  assert.match(js, /group\.userData\.reservedBy==='helper'/);
  assert.match(js, /알바생이 이 조리대 재료를 가지러 오는 중이에요/);
  assert.match(js, /delete task\.counter\.userData\.reservedBy/);
});

test('Bunsik Kitchen v13 helper paths around solid kitchen furniture', () => {
  assert.match(js, /buildHelperPath\(group,approach=/);
  assert.match(js, /this\.isBlockedPosition\(x,z,\.26\)/);
  assert.match(js, /moveHelperPath\(dt\)/);
  assert.match(js, /for\(const \[dx,dz\] of \[\[step,0\],\[-step,0\],\[0,step\],\[0,-step\]\]\)/);
});

test('Bunsik Kitchen v13 helper safely returns or releases carried work', () => {
  assert.match(js, /returnHelperCarry\(\)/);
  assert.match(js, /preferred&&!preferred\.userData\.storedItem/);
  assert.match(js, /this\.setHelperCarry\(null\);return false/);
  assert.match(js, /resetHelper\(\)/);
});

test('Bunsik Kitchen v13 helper can be toggled without disabling player cooking', () => {
  assert.match(js, /setHelperEnabled\(on\)/);
  assert.match(js, /els\.helper\?\.addEventListener\('click'/);
  assert.match(js, /알바생 자동 운반 ON/);
  assert.match(js, /알바생 자동 운반 OFF/);
  assert.match(html, /aria-label="알바생 자동 운반 켜기\/끄기"/);
});
