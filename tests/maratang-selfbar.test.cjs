const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const gameDir = path.join(root, 'games', 'job_maratang_simulator');
const html = fs.readFileSync(path.join(gameDir, '마라탕 한 그릇.html'), 'utf8');
const css = fs.readFileSync(path.join(gameDir, 'maratang-selfbar.css'), 'utf8');
const js = fs.readFileSync(path.join(gameDir, 'maratang-selfbar.js'), 'utf8');

const foodModels = [
  'bowl.glb','pot-stew.glb','cabbage.glb','broccoli.glb','carrot.glb',
  'mushroom.glb','sausage.glb','meat-raw.glb','corn.glb','leek.glb','onion.glb'
];

test('Maratang v7 keeps the 3D selfbar and adds tycoon UI', () => {
  assert.match(html, /<title>마라탕 한 그릇<\/title>/);
  assert.match(html, /maratang-selfbar\.css\?v=7/);
  assert.match(html, /maratang-selfbar\.js\?v=7/);
  assert.doesNotMatch(html, /maratang-dx|maratang-ui-v4/i);
  assert.match(html, /id="orderTicket"/);
  assert.match(html, /id="weight"/);
  assert.match(html, /id="cost"/);
  assert.match(html, /id="checkoutBtn"/);
  assert.match(html, /id="cash"/);
  assert.match(html, /id="reputation"/);
  assert.match(html, /id="manageOverlay"/);
  assert.match(html, /data-upgrade="fridge"/);
  assert.ok(css.length > 5000);
  assert.ok(js.length > 12000);
});

test('Maratang start button is wired before play can begin', () => {
  assert.match(js, /startBtn: \$\('#startBtn'\)/);
  assert.match(js, /els\.startBtn\.addEventListener\('click'/);
  assert.match(js, /if\(!scene\)return/);
});

test('Maratang Selfbar browser module parses', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {input:js,encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr || result.stdout || 'module syntax check failed');
});

test('Maratang Selfbar uses local Three.js and real tracked food GLBs', () => {
  assert.match(html, /\.\.\/\.\.\/assets\/vendor\/three-r160\/three\.module\.js/);
  assert.match(js, /new URL\('\.\.\/\.\.\/assets\/game\/food\/', import\.meta\.url\)\.href/);
  assert.doesNotMatch(html + css + js, /https?:\/\//i);
  for (const model of foodModels) {
    assert.ok(fs.existsSync(path.join(root,'assets','game','food',model)), 'missing food model: '+model);
    assert.ok(js.includes(model), 'selfbar does not reference '+model);
  }
});

test('Maratang Selfbar interaction is direct shelf-to-bowl dragging', () => {
  assert.match(js, /class SelfBarScene/);
  assert.match(js, /pointerDown\(e\)/);
  assert.match(js, /pointerMove\(e\)/);
  assert.match(js, /pointerUp\(e\)/);
  assert.match(js, /isPointerOverBowl\(\)/);
  assert.match(js, /addBowlItem\(id\)/);
  assert.match(js, /this\.shelfGroup/);
  assert.match(js, /this\.bowlContents/);
  assert.match(css, /#scene\{[^}]*touch-action:none/);
});

test('Maratang v7 keeps compact play UI while adding between-day management', () => {
  assert.match(css, /\.order-ticket/);
  assert.match(css, /\.scale-readout/);
  assert.match(css, /\.ingredient-label/);
  assert.match(css, /\.shopping-actions/);
  assert.match(css, /\.spice-dock/);
  assert.match(css, /\.cook-dock/);
  assert.doesNotMatch(html, /도움말|예시 주문|3D 마라탕 조리대/);
  assert.match(css,/\.manage-card/);
  assert.match(css,/\.stock-row/);
  assert.match(css,/\.upgrade-grid/);
});

test('Maratang Selfbar runs a complete order to cook to serve loop', () => {
  assert.match(js, /CAMPAIGN_DAYS = 5/);
  assert.match(js, /PRICE_PER_100G = 1900/);
  assert.match(js, /START_CASH = 12000/);
  assert.match(js, /function checkout\(/);
  assert.match(js, /function startCook\(/);
  assert.match(js, /function evaluate\(/);
  assert.match(js, /function serve\(/);
  assert.match(js, /function finishDay\(/);
  assert.match(js, /state\.patience/);
  assert.match(js, /bowlCost\(\)/);
  assert.match(js, /bowlWeight\(\)/);
});

test('Maratang Selfbar uses valid shared audio keys', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(root,'assets','audio','audio-catalog.json'),'utf8'));
  const keys = [...js.matchAll(/sfx\(\s*['"]([a-z0-9_.-]+)['"]/g)].map(m=>m[1]);
  assert.ok(keys.length >= 4);
  for (const key of keys) assert.ok(catalog.sounds[key], 'missing shared audio key: '+key);
});

test('Maratang Selfbar build output is v7 and contains only new runtime files', () => {
  const distCatalog = JSON.parse(fs.readFileSync(path.join(root,'dist','data','games.json'),'utf8'));
  const game = distCatalog.games.find(g=>g.id==='job_maratang_simulator');
  assert.equal(game.href, 'games/job_maratang_simulator/마라탕 한 그릇.html?v=7');

  const builtDir=path.join(root,'dist','games','job_maratang_simulator');
  const built=fs.readFileSync(path.join(builtDir,'마라탕 한 그릇.html'),'utf8');
  assert.match(built,/audio-manager\.js\?v=20260917-1/);
  assert.match(built,/maratang-selfbar\.css\?v=7/);
  assert.match(built,/maratang-selfbar\.js\?v=7/);
  assert.ok(fs.existsSync(path.join(builtDir,'maratang-selfbar.css')));
  assert.ok(fs.existsSync(path.join(builtDir,'maratang-selfbar.js')));
  assert.ok(!fs.existsSync(path.join(builtDir,'maratang-dx.js')));
  assert.ok(!fs.existsSync(path.join(builtDir,'maratang-dx.css')));
  assert.ok(!fs.existsSync(path.join(builtDir,'maratang-ui-v4.css')));
});

test('Maratang Selfbar build step is wired into package scripts', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  assert.match(pkg.scripts.build,/maratang-selfbar-build\.cjs/);
  assert.match(pkg.scripts['build:cloudflare'],/maratang-selfbar-build\.cjs/);
  assert.doesNotMatch(pkg.scripts.build,/maratang-dx-build\.cjs/);
});


test('Maratang v7 depletes stock and makes weight drive the sale price',()=>{
  assert.match(js,/state\.stock\[id\]--/);
  assert.match(js,/state\.stock\[id\]=\(state\.stock\[id\]\|\|0\)\+1/);
  assert.match(js,/bowlWeight\(\)\/100\*PRICE_PER_100G/);
  assert.match(js,/stockCapacity/);
  assert.match(js,/function restockIngredient/);
  assert.match(js,/function restockAll/);
});

test('Maratang v7 turns patience and mistakes into business consequences',()=>{
  assert.match(js,/if\(state\.patience<=0\)customerLeaves\(\)/);
  assert.match(js,/function customerLeaves/);
  assert.match(js,/state\.dayWaste\+=waste/);
  assert.match(js,/state\.reputation=Math\.max\(0,state\.reputation-5\)/);
  assert.match(js,/function settleCustomer/);
  assert.match(js,/state\.cash\+=revenue/);
});

test('Maratang v7 has multi-day progression and purchasable upgrades',()=>{
  assert.match(js,/function finishDay/);
  assert.match(js,/function startNextDay/);
  assert.match(js,/function finishCampaign/);
  assert.match(js,/function buyUpgrade/);
  for(const key of ['fridge','burner','service','marketing']) assert.ok(js.includes(key),key);
  assert.match(js,/customersForDay/);
  assert.match(js,/state\.upgrades\.burner/);
  assert.match(js,/state\.upgrades\.service/);
});
