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

test('Bunsik Kitchen v6 is a guided fixed-camera four-pot ramen game', () => {
  assert.match(html, /<title>보글보글 분식집<\/title>/);
  assert.match(html, /bunsik-kitchen\.css\?v=6/);
  assert.match(html, /bunsik-kitchen\.js\?v=6/);
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


test('Bunsik Kitchen v6 uses pot-first direct actions and a guided first bowl', () => {
  assert.match(html, /id="tutorialBanner"/);
  assert.match(html, /id="discardBtn"/);
  assert.match(html, /① 냄비 먼저 선택/);
  assert.doesNotMatch(html, /data-action="discard"/);
  assert.match(js, /selectedPot:null/);
  assert.match(js, /tutorial:\{active:true,step:0\}/);
  assert.match(js, /function tutorialExpectedAction/);
  assert.match(js, /function tutorialMessage/);
  assert.match(js, /function renderTutorial/);
  assert.match(js, /function handleAction/);
  assert.match(js, /els\.dock\.addEventListener\('click'[\s\S]*handleAction\(b\.dataset\.action\)/);
  assert.match(js, /pointerUp\(e\)[\s\S]*this\.setSelectedPot\(hit\.object\.userData\.potIndex\)/);
  assert.doesNotMatch(js, /pointerUp\(e\)[\s\S]{0,500}applyAction\(index,state\.action\)/);
  assert.match(js, /spawnOrder\('egg'\)/);
});

test('Bunsik Kitchen v6 prevents accidental discards and highlights the right next action', () => {
  assert.match(js, /function requestDiscard/);
  assert.match(js, /discardArmedUntil/);
  assert.match(js, /discardArmedPot/);
  assert.match(js, /한 번 더 눌러/);
  assert.match(js, /trayDiscardArmedUntil/);
  assert.match(js, /function recommendedActionsForPot/);
  assert.match(js, /function updateActionButtons/);
  assert.match(js, /function nextInstruction/);
  assert.match(css, /button\.recommended/);
  assert.match(css, /button\.ready-now/);
  assert.match(css, /\.pot-chip\.tutorial-target/);
  assert.match(css, /\.discard-btn\.armed/);
});

test('Bunsik Kitchen v6 makes order and doneness targets visually legible', () => {
  assert.match(js, /function potPrompt/);
  assert.match(js, /✅ 지금 담기!/);
  assert.match(js, /orderIngredientIcons/);
  assert.match(html, /다음 행동/);
  assert.match(css, /\.order-icons/);
  assert.match(css, /\.pot-chip\.perfect/);
  assert.match(css, /\.pot-chip\.danger/);
});

test('Ramen gameplay has water, ingredient order, doneness and burning', () => {
  assert.match(js, /function addToPot/);
  assert.match(js, /function canUseAction/);
  assert.match(js, /p\.water>=1\.5/);
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

test('Bunsik Kitchen root compatibility entry points to v6', () => {
  assert.match(rootEntry, /games\/job_bogle_bunsik\/bunsik-kitchen\.css\?v=6/);
  assert.match(rootEntry, /games\/job_bogle_bunsik\/bunsik-kitchen\.js\?v=6/);
  assert.match(rootEntry, /"three":"assets\/vendor\/three-r160\/three\.module\.js"/);
  assert.doesNotMatch(rootEntry, /location\.replace|http-equiv="refresh"/i);
});

test('Bunsik Kitchen build output is v6', () => {
  const distCatalog=JSON.parse(fs.readFileSync(path.join(root,'dist','data','games.json'),'utf8'));
  const game=distCatalog.games.find(g=>g.id==='job_bogle_bunsik');
  assert.equal(game.href,'games/job_bogle_bunsik/보글보글 분식집.html?v=6');
  const builtDir=path.join(root,'dist','games','job_bogle_bunsik');
  const built=fs.readFileSync(path.join(builtDir,'보글보글 분식집.html'),'utf8');
  assert.match(built,/bunsik-kitchen\.css\?v=6/);
  assert.match(built,/bunsik-kitchen\.js\?v=6/);
  assert.ok(fs.existsSync(path.join(builtDir,'bunsik-kitchen.css')));
  assert.ok(fs.existsSync(path.join(builtDir,'bunsik-kitchen.js')));
});

test('Bunsik Kitchen build script publishes v6', () => {
  const build=fs.readFileSync(path.join(root,'scripts','bunsik-kitchen-build.cjs'),'utf8');
  assert.match(build,/\?v=6/);
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  assert.match(pkg.scripts.build,/bunsik-kitchen-build\.cjs/);
  assert.match(pkg.scripts['build:cloudflare'],/bunsik-kitchen-build\.cjs/);
});
