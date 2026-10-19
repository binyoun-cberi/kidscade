const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const gameFile = path.join(root, 'games/job_takoyaki_simulator/빙글빙글 타코야키집.html');
const html = fs.readFileSync(gameFile, 'utf8');
const source = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];

function makeElement() {
  return {
    style: {},
    textContent: '',
    className: '',
    classList: { add() {}, remove() {} },
    children: [],
    addEventListener() {},
    appendChild() {},
    setAttribute() {},
    querySelector() { return null; },
    getBoundingClientRect() { return { width: 800, height: 600 }; },
  };
}

function loadGame() {
  assert.ok(source, 'The game should have an inline module');
  const elements = new Map();
  const mockCtx = {
    setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, roundRect() {},
    arc() {}, ellipse() {}, fill() {}, stroke() {}, moveTo() {}, quadraticCurveTo() {},
    fillText() {}, createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
  };
  const stage = makeElement();
  stage.clientWidth = 800;
  stage.clientHeight = 600;
  stage.getContext = type => (type === '2d' ? mockCtx : null);
  elements.set('stage', stage);
  const context = {
    console,
    Math,
    performance: { now: () => 20000 },
    localStorage: { getItem: () => null, setItem() {} },
    window: { devicePixelRatio: 1, addEventListener() {} },
    document: {
      addEventListener() {},
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, makeElement());
        return elements.get(id);
      },
      createElement() { return makeElement(); }
    }
  };
  context.globalThis = context;
  const modified = source
    .replace(/^import .*;\s*$/gm, '')
    .replace(/boot\(\);\s*\}\)\(\);/, [
      'globalThis.takoyakiTest = {',
      'game, emptySlot, updateOrders, scoreBall, getDayRank, initThree,',
      'renderFallbackPan, fallbackHits',
      '};',
      '})();'
    ].join('\n'));
  vm.runInNewContext(modified, context, { filename: 'takoyaki-inline-module.js' });
  assert.ok(context.takoyakiTest, 'Test hooks should be attached');
  return { api: context.takoyakiTest, stage, elements };
}

test('orders age normally but preschool customers do not disappear', () => {
  const { api } = loadGame();
  const { game, updateOrders } = api;
  game.started = true;
  game.paused = false;
  game.nextOrderAt = Infinity;
  game.orders = [{ age: 0, maxWait: 10, type: 'basic' }];
  updateOrders(6);
  assert.equal(game.orders[0].age, 6);
  updateOrders(6);
  assert.equal(game.orders[0].age, 12);
  assert.equal(game.orders[0].waitedLong, true);
  assert.equal(game.orders.length, 1);
  const bonus = Math.round(Math.max(0, 1 - game.orders[0].age / game.orders[0].maxWait) * 80);
  assert.equal(bonus, 0);
});

test('daily rank measures cooking quality instead of lifetime points', () => {
  const { api } = loadGame();
  api.game.dayServed = 2;
  api.game.dayQualitySum = 250;
  api.game.totalScore = 10;
  assert.equal(api.getDayRank(), '타코야키 명인');
});

test('2D fallback displays 12 visible pan positions without WebGL', () => {
  const { api, stage } = loadGame();
  api.game.slots = Array.from({ length: 12 }, (_, i) => api.emptySlot(i));
  api.game.slots[0].unlocked = true;
  assert.equal(api.initThree(), true);
  api.renderFallbackPan();
  assert.equal(api.fallbackHits.length, 12);
  assert.ok(stage.width > 0 && stage.height > 0);
});

test('scene props and Three.js are owned by Kidscade', () => {
  assert.match(html, /three-r160\/three\.module\.js/);
  assert.match(html, /three\/addons\/loaders\/GLTFLoader\.js/);
  for (const file of [
    'plate.glb', 'bottles.glb', 'bowl.glb', 'chopping-board.glb',
    'tentacle.glb', 'chukaman-steamer.glb'
  ]) {
    const asset = path.join(root, 'assets/game/3d/interiors/modular-sushi-restaurant-kit', file);
    assert.ok(fs.existsSync(asset), `Missing existing CC0 asset: ${file}`);
  }
});
