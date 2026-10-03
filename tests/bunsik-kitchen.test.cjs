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

test('Bunsik Kitchen v10 publishes the direct-carry build', () => {
  assert.match(html, /bunsik-kitchen\.css\?v=10/);
  assert.match(html, /bunsik-kitchen\.js\?v=10/);
  assert.ok(game);
  assert.equal(game.href, 'games/job_bogle_bunsik/보글보글 분식집.html?v=10');
  assert.match(rootEntry, /games\/job_bogle_bunsik\/bunsik-kitchen\.css\?v=10/);
  assert.match(rootEntry, /games\/job_bogle_bunsik\/bunsik-kitchen\.js\?v=10/);
});

test('Bunsik Kitchen module parses as JavaScript', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {input:js,encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr || result.stdout || 'Bunsik Kitchen syntax check failed');
});

test('Bunsik Kitchen v10 keeps the 3D kitchen visually dominant', () => {
  assert.match(html, /id="gameCanvas"/);
  assert.match(html, /class="customer-orders"/);
  assert.match(html, /class="pot-world-labels"/);
  assert.match(html, /id="carryHud"/);
  assert.match(css, /#gameCanvas/);
  assert.match(css, /\.carry-hud\{/);
  assert.match(css, /\.order-bubble/);
});

test('v10 turns ingredient providers into physical movable stations', () => {
  for (const id of ['src-water','src-noodle','src-soup','src-egg','src-green','src-cheese']) {
    assert.match(js, new RegExp("'"+id+"'"));
  }
  assert.match(js, /makeIngredientSource\(id,ingredientId,label,x,z/);
  assert.match(js, /this\.layoutStations\.push\(\{id,label,group:holder,ingredientId,source:true\}\)/);
  assert.match(js, /pointerDown\(e\)/);
  assert.match(js, /pointerMove\(e\)/);
  assert.match(js, /Math\.round\(p\.x\*2\)\/2/);
});

test('player carries real ingredient and meal visuals in the world', () => {
  assert.match(js, /this\.heldGroup=new THREE\.Group\(\)/);
  assert.match(js, /setHeldVisual\(carry\)/);
  assert.match(js, /carry\.kind==='meal'/);
  assert.match(js, /state\.carry/);
  assert.match(js, /function setCarry\(carry\)/);
  assert.match(js, /function clearCarry\(\)/);
  assert.match(js, /function renderCarryHud\(\)/);
});

test('movement is spatial gameplay with appliance collision instead of decoration', () => {
  assert.match(js, /canStand\(x,z\)/);
  assert.match(js, /if\(this\.canStand\(nx,this\.player\.position\.z\)\)/);
  assert.match(js, /if\(this\.canStand\(this\.player\.position\.x,nz\)\)/);
  assert.match(js, /this\.layoutStations/);
  assert.match(js, /this\.potVisuals/);
  assert.match(js, /WASD|KeyW/);
  assert.match(html, /id="moveControls"/);
  assert.match(html, /data-interact/);
});

test('remote cooking shortcuts are removed from the primary play path', () => {
  assert.doesNotMatch(html, /data-action="water"/);
  assert.doesNotMatch(js, /trayDrag/);
  assert.doesNotMatch(js, /const actionKeys=/);
  assert.doesNotMatch(js, /const potKeys=/);
  assert.match(js, /document\.createElement\('span'\),locked=i>=activePotCount/);
  assert.match(css, /\.serve-drag\{display:none!important/);
});

test('ingredients must be picked up and physically delivered to a pot', () => {
  assert.match(js, /function pickupIngredient\(id\)/);
  assert.match(js, /setCarry\(\{kind:'ingredient',id\}\)/);
  assert.match(js, /function interactPot\(index\)/);
  assert.match(js, /if\(state\.carry\?\.kind==='ingredient'\)/);
  assert.match(js, /if\(applyAction\(index,id\)\)\{clearCarry\(\);return\}/);
  assert.match(js, /function addToPot\(index,id\)/);
});

test('tutorial teaches the physical water-to-pot-to-customer route', () => {
  assert.match(js, /물 상자로 걸어가 E/);
  assert.match(js, /면 상자에서 면을 들고/);
  assert.match(js, /스프 상자/);
  assert.match(js, /계란을 들고 냄비에/);
  assert.match(js, /손님 앞으로 가서 E로 서빙/);
  assert.match(js, /if\(state\.tutorial\.step===0&&id==='water'\)state\.tutorial\.step=1/);
});

test('plating transfers the finished ramen into the player hand', () => {
  assert.match(js, /function platePot\(index\)/);
  assert.match(js, /if\(state\.carry\)\{toast\('그릇에 담으려면 먼저 손을 비워 주세요'/);
  assert.match(js, /state\.cleanPlates=Math\.max\(0,state\.cleanPlates-1\)/);
  assert.match(js, /state\.tray\.ready=true/);
  assert.match(js, /setCarry\(\{kind:'meal',recipeId:state\.tray\.recipeId/);
  assert.match(js, /직접 들고 주문 손님에게 가져가세요/);
});

test('customers are proximity targets and serving happens in place', () => {
  assert.match(js, /type:'customer'/);
  assert.match(js, /orderId:o\.id/);
  assert.match(js, /function serveCarriedMeal\(orderId\)/);
  assert.match(js, /serveOrder\(orderId\)/);
  assert.match(js, /kitchen\.customerReact\(slot\);setTimeout/);
  const serving = js.slice(js.indexOf('function serveOrder(orderId)'), js.indexOf('function updateDishHud()'));
  assert.doesNotMatch(serving, /animateServe\(/);
  assert.match(serving, /clearCarry\(\)/);
});

test('wrong-customer delivery keeps the meal and penalizes patience', () => {
  assert.match(js, /state\.tray\.recipeId!==order\.recipeId/);
  assert.match(js, /restaurant\.orders\.adjustPatience\(order\.id,-5\)/);
  assert.match(js, /앗, 이 손님은/);
});

test('dirty plates remain a reusable washing bottleneck', () => {
  assert.match(html, /id="dishStatus"/);
  assert.match(js, /cleanPlates:3,dirtyPlates:0/);
  assert.match(js, /function addDirtyPlate\(\)/);
  assert.match(js, /function washOnePlate\(\)/);
  assert.match(js, /state\.dirtyPlates=Math\.max\(0,state\.dirtyPlates-1\)/);
  assert.match(js, /state\.cleanPlates\+=1/);
  assert.match(js, /깨끗한 그릇이 없어요/);
});

test('Bunsik Kitchen reuses committed restaurant and food assets', () => {
  const required = [
    'assets/game/food/egg.glb',
    'assets/game/food/leek.glb',
    'assets/game/food/cheese-cut.glb',
    'assets/game/3d/bakery/restaurant-bits/kitchencounter-sink.glb',
    'assets/game/3d/bakery/restaurant-bits/fridge-a.glb',
    'assets/game/3d/bakery/restaurant-bits/dishrack-plates.glb',
    'assets/game/3d/bakery/restaurant-bits/plate-dirty.glb',
    'assets/game/3d/interiors/modular-sushi-restaurant-kit/ramen.glb',
    'assets/game/characters/people/character-female-b.glb'
  ];
  for (const rel of required) assert.ok(fs.existsSync(path.join(root,rel)), 'missing asset: '+rel);
  assert.match(js, /const BAKERY_BITS=/);
});

test('prep phase remains separate from the timed service phase', () => {
  assert.match(html, /id="prepBar" class="prep-bar hidden"/);
  assert.match(html, /id="openShopBtn"/);
  assert.match(js, /state\.phase='prep'/);
  assert.match(js, /function beginService\(\)/);
  assert.match(js, /state\.phase='service'/);
  assert.match(js, /restaurant\.startShift/);
});

test('Bunsik Kitchen still delegates restaurant state to the shared engine', () => {
  assert.match(js, /import \{ RestaurantEngine \} from '\.\.\/shared\/restaurant-engine\.js\?v=1'/);
  assert.match(js, /restaurant=new RestaurantEngine\(/);
  assert.match(js, /restaurant\.recipes\.findExact\(p\.ingredients\)/);
  assert.match(js, /restaurant\.spawnOrder\(/);
  assert.match(js, /restaurant\.quote\(/);
  assert.match(js, /restaurant\.serve\(/);
  assert.match(js, /restaurant\.tick\(dt,\{/);
  assert.match(js, /restaurant\.stopShift\(\)/);
});

test('Bunsik Kitchen build script publishes v10', () => {
  const build=fs.readFileSync(path.join(root,'scripts','bunsik-kitchen-build.cjs'),'utf8');
  assert.match(build,/\?v=10/);
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  assert.match(pkg.scripts.build,/bunsik-kitchen-build\.cjs/);
});
