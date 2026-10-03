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

test('Bunsik Kitchen v10 keeps the 3D kitchen visually dominant', () => {
  assert.match(html, /bunsik-kitchen\.css\?v=10/);
  assert.match(html, /bunsik-kitchen\.js\?v=10/);
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

test('catalog and compatibility entry publish v10', () => {
  assert.ok(game);
  assert.equal(game.href, 'games/job_bogle_bunsik/보글보글 분식집.html?v=10');
  assert.equal(game.difficulty, 'easy');
  assert.match(rootEntry, /games\/job_bogle_bunsik\/bunsik-kitchen\.css\?v=10/);
  assert.match(rootEntry, /games\/job_bogle_bunsik\/bunsik-kitchen\.js\?v=10/);
  assert.match(rootEntry, /"three":"assets\/vendor\/three-r160\/three\.module\.js"/);
});

test('Bunsik Kitchen build script publishes v10', () => {
  const build=fs.readFileSync(path.join(root,'scripts','bunsik-kitchen-build.cjs'),'utf8');
  assert.match(build,/\?v=10/);
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  assert.match(pkg.scripts.build,/bunsik-kitchen-build\.cjs/);
});




test('Bunsik Kitchen v10 adds a PlateUp-style prep phase and movable layout stations', () => {
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

test('Bunsik Kitchen v10 uses committed CC0 restaurant assets for sink, fridge and dish rack', () => {
  const required = [
    'assets/game/3d/bakery/restaurant-bits/kitchencounter-sink.glb',
    'assets/game/3d/bakery/restaurant-bits/fridge-a.glb',
    'assets/game/3d/bakery/restaurant-bits/dishrack-plates.glb',
    'assets/game/3d/bakery/restaurant-bits/plate-dirty.glb'
  ];
  for (const rel of required) assert.ok(fs.existsSync(path.join(root,rel)), 'missing PlateUp-style asset: '+rel);
  assert.match(js, /const BAKERY_BITS=/);
  assert.match(js, /'kitchencounter-sink\.glb'/);
  assert.match(js, /'dishrack-plates\.glb'/);
  assert.match(js, /'plate-dirty\.glb'/);
});

test('Bunsik Kitchen v10 adds player movement and proximity interaction', () => {
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

test('Bunsik Kitchen v10 turns plates into a reusable washing bottleneck', () => {
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


test('Bunsik Kitchen v10 enforces a one-item carry invariant', () => {
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

test('Bunsik Kitchen v10 tutorial follows sink fridge pot and service-counter travel', () => {
  assert.match(js, /싱크로 가서 E로 물을 받아/);
  assert.match(js, /냉장고에서 E로 면을 꺼내/);
  assert.match(js, /냉장고에서 스프를 꺼내/);
  assert.match(js, /냉장고에서 계란을 꺼내/);
  assert.match(js, /완성 라면을 들고 배식대로 이동해 E로 서빙/);
  assert.match(js, /function recommendedCarryIngredient\(\)/);
});

test('Bunsik Kitchen v10 no longer exposes instant ingredient keyboard shortcuts', () => {
  assert.doesNotMatch(js, /Digit1:'water'/);
  assert.doesNotMatch(js, /Digit2:'noodle'/);
  assert.doesNotMatch(js, /Digit3:'soup'/);
  assert.doesNotMatch(js, /Digit4:'egg'/);
  assert.match(js, /KeyE/);
  assert.match(js, /Space/);
});
