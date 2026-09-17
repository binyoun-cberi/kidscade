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

const foodModels = [
  'egg.glb','leek.glb','cheese-cut.glb','corn-dog.glb','maki-vegetable.glb',
  'dim-sum.glb','pot-stew.glb','frying-pan.glb','plate-deep.glb'
];

test('Bunsik Kitchen is a fresh walkaround implementation', () => {
  assert.match(html, /<title>보글보글 분식집<\/title>/);
  assert.match(html, /bunsik-kitchen\.css\?v=4/);
  assert.match(html, /bunsik-kitchen\.js\?v=4/);
  assert.doesNotMatch(html, /bogle-bunsik-dx|bogle-bunsik-mobile/i);
  assert.match(html, /id="gameCanvas"/);
  assert.match(html, /id="joystick"/);
  assert.match(html, /id="actionBtn"/);
  assert.ok(css.length > 5000);
  assert.ok(js.length > 15000);
});

test('Bunsik Kitchen module parses as JavaScript', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {input:js,encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr || result.stdout || 'Bunsik Kitchen syntax check failed');
});

test('Bunsik Kitchen uses local Three.js, player GLB and food assets', () => {
  assert.match(html, /\.\.\/\.\.\/assets\/vendor\/three-r160\/three\.module\.js/);
  assert.match(js, /new URL\('\.\.\/\.\.\/assets\/game\/food\/',import\.meta\.url\)\.href/);
  assert.match(js, /new URL\('\.\.\/\.\.\/assets\/game\/characters\/people\/',import\.meta\.url\)\.href/);
  assert.match(js, /character-female-a\.glb/);
  assert.doesNotMatch(html + css + js, /https?:\/\//i);
  assert.ok(fs.existsSync(path.join(root,'assets','game','characters','people','character-female-a.glb')));
  for (const model of foodModels) {
    assert.ok(fs.existsSync(path.join(root,'assets','game','food',model)), 'missing model: '+model);
    assert.ok(js.includes(model), 'game does not reference '+model);
  }
});

test('Bunsik Kitchen player has visible materials and movement animation support', () => {
  assert.match(js, /new THREE\.AnimationMixer/);
  assert.match(js, /walk\|run/);
  assert.match(js, /idle\|stand/);
  assert.match(js, /setPlayerMoving/);
  assert.match(js, /playerVisual\.position\.y/);
  assert.match(js, /palette=\[0xc94f45/);
  assert.match(js, /playerRing/);
  assert.match(js, /focusRing/);
});

test('Bunsik Kitchen movement and interaction are player-driven', () => {
  assert.match(js, /WASD|KeyW/);
  assert.match(js, /function interact\(\)/);
  assert.match(js, /kitchen\.nearest\(\)/);
  assert.match(js, /,'source',/);
  assert.match(js, /,'station',/);
  assert.match(js, /,'serve',/);
  assert.match(js, /,'trash',/);
  assert.match(js, /one|한 번에 하나만/);
  assert.match(js, /state\.joy\.x/);
  assert.match(css, /\.mobile-controls/);
});

test('Bunsik Kitchen has independent ramen, tteok and side cooking loops', () => {
  assert.match(js, /ramen:\{name:'라면 냄비'/);
  assert.match(js, /tteok:\{name:'떡볶이 팬'/);
  assert.match(js, /side:\{name:'사이드 조리대'/);
  assert.match(js, /phase:'idle'/);
  assert.match(js, /s\.phase='cooking'/);
  assert.match(js, /s\.phase='ready'/);
  assert.match(js, /s\.phase='burnt'/);
  assert.match(js, /meta\.grace/);
  assert.match(js, /scoreDish/);
});

test('Bunsik Kitchen kitchen design has stronger zones and station lighting', () => {
  assert.match(js, /GridHelper/);
  assert.match(js, /stationLights/);
  assert.match(js, /PointLight/);
  assert.match(js, /0x315b5c/);
  assert.match(js, /setFocus/);
  assert.match(css, /\.world-label\.near/);
  assert.match(css, /\.world-label\.station/);
});

test('Bunsik Kitchen keeps UI minimal and world-first', () => {
  assert.match(html, /id="orderStrip"/);
  assert.match(html, /id="heldBadge"/);
  assert.match(html, /id="prompt"/);
  assert.doesNotMatch(html, /도움말|주문 예시|ingredientBtns|stationCard|3D 오픈 키친/);
  assert.match(css, /\.world-label/);
  assert.match(css, /\.order-strip/);
  assert.match(css, /\.held-badge/);
});

test('Bunsik Kitchen root compatibility shell points to the same new game', () => {
  assert.match(rootEntry, /games\/job_bogle_bunsik\/bunsik-kitchen\.css\?v=4/);
  assert.match(rootEntry, /games\/job_bogle_bunsik\/bunsik-kitchen\.js\?v=4/);
  assert.match(rootEntry, /"three":"assets\/vendor\/three-r160\/three\.module\.js"/);
  assert.doesNotMatch(rootEntry, /bogle-bunsik-dx|bogle-bunsik-mobile/i);
  assert.doesNotMatch(rootEntry, /location\.replace|http-equiv="refresh"/i);
});

test('Bunsik Kitchen uses valid shared audio keys', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(root,'assets','audio','audio-catalog.json'),'utf8'));
  const keys = [...js.matchAll(/sfx\(\s*['"]([a-z0-9_.-]+)['"]/g)].map(m=>m[1]);
  assert.ok(keys.length >= 5);
  assert.match(js, /window\.__bunsikKitchenOwnAudio=true/);
  for (const key of keys) assert.ok(catalog.sounds[key], 'missing audio key: '+key);
});

test('Bunsik Kitchen build output is v3 and old runtime is gone', () => {
  const distCatalog=JSON.parse(fs.readFileSync(path.join(root,'dist','data','games.json'),'utf8'));
  const game=distCatalog.games.find(g=>g.id==='job_bogle_bunsik');
  assert.equal(game.href,'games/job_bogle_bunsik/보글보글 분식집.html?v=4');
  const builtDir=path.join(root,'dist','games','job_bogle_bunsik');
  const built=fs.readFileSync(path.join(builtDir,'보글보글 분식집.html'),'utf8');
  assert.match(built,/bunsik-kitchen\.css\?v=4/);
  assert.match(built,/bunsik-kitchen\.js\?v=4/);
  assert.match(built,/audio-manager\.js\?v=20260917-1/);
  assert.ok(fs.existsSync(path.join(builtDir,'bunsik-kitchen.css')));
  assert.ok(fs.existsSync(path.join(builtDir,'bunsik-kitchen.js')));
  assert.ok(!fs.existsSync(path.join(builtDir,'bogle-bunsik-dx.js')));
  assert.ok(!fs.existsSync(path.join(builtDir,'bogle-bunsik-dx.css')));
  assert.ok(!fs.existsSync(path.join(builtDir,'bogle-bunsik-mobile-v2.css')));
});

test('Bunsik Kitchen build script replaces the old DX build step', () => {
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  assert.match(pkg.scripts.build,/bunsik-kitchen-build\.cjs/);
  assert.match(pkg.scripts['build:cloudflare'],/bunsik-kitchen-build\.cjs/);
  assert.doesNotMatch(pkg.scripts.build,/bogle-bunsik-dx-build\.cjs/);
});
