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

test('Bunsik Kitchen v5 is a fixed-camera four-pot ramen game', () => {
  assert.match(html, /<title>보글보글 분식집<\/title>/);
  assert.match(html, /bunsik-kitchen\.css\?v=5/);
  assert.match(html, /bunsik-kitchen\.js\?v=5/);
  assert.match(html, /id="potStrip"/);
  assert.match(html, /id="actionDock"/);
  assert.match(html, /id="trayBtn"/);
  assert.match(html, /data-action="water"/);
  assert.match(html, /data-action="plate"/);
  assert.doesNotMatch(html, /id="joystick"|id="actionBtn"|WASD로/);
  assert.match(js, /POT_COUNT=4/);
  assert.match(js, /TARGET_REVENUE=6500/);
});

test('Bunsik Kitchen module parses as JavaScript', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {input:js,encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr || result.stdout || 'Bunsik Kitchen syntax check failed');
});

test('Ramen gameplay has water, ingredient order, doneness and burning', () => {
  assert.match(js, /function addToPot/);
  assert.match(js, /p\.mistakes\+\+/);
  assert.match(js, /function updatePots/);
  assert.match(js, /p\.noodleTime\+=dt/);
  assert.match(js, /p\.noodleTime>16\.5/);
  assert.match(js, /설익음/);
  assert.match(js, /딱 좋아요!/);
  assert.match(js, /퍼지는 중/);
  assert.match(js, /탔어요!/);
  assert.match(js, /function qualityFor/);
});

test('Three ramen recipes require distinct toppings', () => {
  assert.match(js, /id:'egg',name:'계란 라면'.*'egg'/);
  assert.match(js, /id:'green',name:'파 라면'.*'green'/);
  assert.match(js, /id:'cheeseEgg',name:'치즈 계란 라면'.*'egg','cheese'/);
  assert.match(js, /function identifyRecipe/);
});

test('Finished ramen goes to a serving tray and must match a customer order', () => {
  assert.match(js, /function platePot/);
  assert.match(js, /state\.tray=/);
  assert.match(js, /function serveOrder/);
  assert.match(js, /state\.tray\.recipeId!==order\.recipeId/);
  assert.match(js, /state\.revenue\+=earned/);
  assert.match(js, /state\.perfect\+\+/);
  assert.match(html, /서빙 쟁반/);
});

test('Orders are revenue-driven instead of score-driven', () => {
  assert.match(html, /매출/);
  assert.match(html, /목표/);
  assert.doesNotMatch(html, />점수</);
  assert.match(js, /function makeOrder/);
  assert.match(js, /function spawnOrder/);
  assert.match(js, /function updateOrders/);
  assert.match(js, /o\.patience/);
  assert.match(js, /money\(earned\)/);
});

test('Bunsik Kitchen uses existing food, restaurant and customer assets', () => {
  const required = [
    'assets/game/food/egg.glb',
    'assets/game/food/leek.glb',
    'assets/game/food/cheese-cut.glb',
    'assets/game/3d/interiors/charming-kitchen-set/stove.glb',
    'assets/game/3d/interiors/charming-kitchen-set/spatula.glb',
    'assets/game/3d/interiors/modular-sushi-restaurant-kit/counter-sink.glb',
    'assets/game/3d/interiors/modular-sushi-restaurant-kit/can-fridge.glb',
    'assets/game/3d/interiors/modular-sushi-restaurant-kit/table.glb',
    'assets/game/3d/interiors/modular-sushi-restaurant-kit/chair.glb',
    'assets/game/characters/people/character-female-b.glb',
    'assets/game/characters/people/character-male-a.glb'
  ];
  for (const rel of required) assert.ok(fs.existsSync(path.join(root,rel)), 'missing asset: '+rel);
  assert.match(js, /charming-kitchen-set/);
  assert.match(js, /modular-sushi-restaurant-kit/);
  assert.match(js, /stove\.glb/);
  assert.match(js, /counter-sink\.glb/);
  assert.match(js, /can-fridge\.glb/);
  assert.match(js, /CUSTOMER_MODELS/);
  assert.match(html, /Isa Lousberg · CC BY/);
  assert.match(html, /Quaternius · CC0/);
});

test('Bunsik Kitchen is click/touch first and no longer depends on player walking', () => {
  assert.match(js, /canvas\.addEventListener\('pointerup'/);
  assert.match(js, /Raycaster/);
  assert.match(js, /userData\.potIndex/);
  assert.match(js, /data-action/);
  assert.doesNotMatch(js, /state\.joy|playerRadius|canMove\(|move\(dx|KeyA|KeyD|KeyS/);
  assert.match(css, /touch-action:none/);
});

test('Bunsik Kitchen keeps local Three.js and valid shared audio keys', () => {
  assert.match(html, /\.\.\/\.\.\/assets\/vendor\/three-r160\/three\.module\.js/);
  assert.doesNotMatch(html + css + js, /https?:\/\//i);
  const catalog = JSON.parse(fs.readFileSync(path.join(root,'assets','audio','audio-catalog.json'),'utf8'));
  const keys = [...js.matchAll(/sfx\(\s*['"]([a-z0-9_.-]+)['"]/g)].map(m=>m[1]);
  assert.ok(keys.length >= 5);
  assert.match(js, /window\.__bunsikKitchenOwnAudio=true/);
  for (const key of keys) assert.ok(catalog.sounds[key], 'missing audio key: '+key);
});

test('Bunsik Kitchen root compatibility entry points to v5', () => {
  assert.match(rootEntry, /games\/job_bogle_bunsik\/bunsik-kitchen\.css\?v=5/);
  assert.match(rootEntry, /games\/job_bogle_bunsik\/bunsik-kitchen\.js\?v=5/);
  assert.match(rootEntry, /"three":"assets\/vendor\/three-r160\/three\.module\.js"/);
  assert.doesNotMatch(rootEntry, /location\.replace|http-equiv="refresh"/i);
});

test('Bunsik Kitchen build output is v5', () => {
  const distCatalog=JSON.parse(fs.readFileSync(path.join(root,'dist','data','games.json'),'utf8'));
  const game=distCatalog.games.find(g=>g.id==='job_bogle_bunsik');
  assert.equal(game.href,'games/job_bogle_bunsik/보글보글 분식집.html?v=5');
  const builtDir=path.join(root,'dist','games','job_bogle_bunsik');
  const built=fs.readFileSync(path.join(builtDir,'보글보글 분식집.html'),'utf8');
  assert.match(built,/bunsik-kitchen\.css\?v=5/);
  assert.match(built,/bunsik-kitchen\.js\?v=5/);
  assert.ok(fs.existsSync(path.join(builtDir,'bunsik-kitchen.css')));
  assert.ok(fs.existsSync(path.join(builtDir,'bunsik-kitchen.js')));
});

test('Bunsik Kitchen build script publishes v5', () => {
  const build=fs.readFileSync(path.join(root,'scripts','bunsik-kitchen-build.cjs'),'utf8');
  assert.match(build,/\?v=5/);
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  assert.match(pkg.scripts.build,/bunsik-kitchen-build\.cjs/);
  assert.match(pkg.scripts['build:cloudflare'],/bunsik-kitchen-build\.cjs/);
});
