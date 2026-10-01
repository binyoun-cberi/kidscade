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

test('Bunsik Kitchen v7 keeps the 3D kitchen visually dominant', () => {
  assert.match(html, /bunsik-kitchen\.css\?v=7/);
  assert.match(html, /bunsik-kitchen\.js\?v=7/);
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

test('context actions only show what the selected pot can do now', () => {
  assert.match(js, /function contextActionsForPot/);
  assert.match(js, /function updateActionButtons/);
  assert.match(js, /els\.dock\.innerHTML=''/);
  assert.match(js, /return\['water'\]/);
  assert.match(js, /return p\.noodleTime>=5\.5\?\['plate'\]/);
  assert.match(js, /new Set\(\)/);
});

test('plating is an animated physical transfer instead of an instant state swap', () => {
  assert.match(js, /makeServiceStation\(\)/);
  assert.match(js, /serving-tray\.glb/);
  assert.match(js, /ramen\.glb/);
  assert.match(js, /animatePlate\(index,onDone\)/);
  assert.match(js, /p\.plating=true/);
  assert.match(js, /state\.tray=\{recipeId:recipe\.id[\s\S]*ready:false/);
  assert.match(js, /state\.tray\.ready=true/);
  assert.match(js, /kitchen\.setTrayMeal\(true\)/);
});

test('serving requires dragging the tray onto a customer order bubble', () => {
  assert.match(html, /id="trayBtn" class="serve-drag hidden"/);
  assert.match(js, /trayDrag=null/);
  assert.match(js, /trayBtn\.addEventListener\('pointerdown'/);
  assert.match(js, /addEventListener\('pointermove'/);
  assert.match(js, /document\.elementFromPoint/);
  assert.match(js, /closest\?\.\('\[data-order\]'/);
  assert.match(js, /serveOrder\(Number\(order\.dataset\.order\)\)/);
  assert.match(js, /animateServe\(slot,onDone\)/);
  assert.match(js, /customerReact\(slot\)/);
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

test('catalog and compatibility entry publish v7', () => {
  assert.ok(game);
  assert.equal(game.href, 'games/job_bogle_bunsik/보글보글 분식집.html?v=7');
  assert.equal(game.difficulty, 'easy');
  assert.match(rootEntry, /games\/job_bogle_bunsik\/bunsik-kitchen\.css\?v=7/);
  assert.match(rootEntry, /games\/job_bogle_bunsik\/bunsik-kitchen\.js\?v=7/);
  assert.match(rootEntry, /"three":"assets\/vendor\/three-r160\/three\.module\.js"/);
});

test('Bunsik Kitchen build script publishes v7', () => {
  const build=fs.readFileSync(path.join(root,'scripts','bunsik-kitchen-build.cjs'),'utf8');
  assert.match(build,/\?v=7/);
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  assert.match(pkg.scripts.build,/bunsik-kitchen-build\.cjs/);
});
