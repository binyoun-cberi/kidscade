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
    style: { setProperty() {} },
    textContent: '',
    className: '',
    classList: { add() {}, remove() {}, toggle() {} },
    dataset: {},
    children: [],
    appendChild(child) { this.children.push(child); },
    remove() {},
    addEventListener() {},
    setAttribute() {},
    querySelector() { return null; },
    getBoundingClientRect() { return { width: 800, height: 600 }; },
  };
}

function loadGame(saved = null) {
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
    setTimeout() {},
    performance: { now: () => 20000 },
    localStorage: { getItem: () => saved, setItem() {} },
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
      'renderFallbackPan, fallbackHits, resetSlots, getCfg, activeHoles, selectPan, actionPack, loadProgress,',
      'activeOrder, selectOrder, orderReadyCount, slotCue, updateCooking, updateOrdersUI, tapSlot, endDay',
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

test('2D fallback shows only opened rows, without ghost holes', () => {
  const { api, stage } = loadGame();
  api.resetSlots();
  assert.equal(api.initThree(), true);
  api.renderFallbackPan();
  assert.equal(api.fallbackHits.length, 4);
  api.game.day = 2;
  api.resetSlots();
  api.renderFallbackPan();
  assert.equal(api.fallbackHits.length, 8);
  api.game.day = 3;
  api.resetSlots();
  api.renderFallbackPan();
  assert.equal(api.fallbackHits.length, 12);
  api.game.day = 4;
  api.resetSlots();
  api.game.activePan = 1;
  api.renderFallbackPan();
  assert.equal(api.fallbackHits.length, 4);
  assert.ok(api.fallbackHits.every(hit => hit.i >= 12 && hit.i < 16));
  assert.ok(stage.width > 0 && stage.height > 0);
});

test('specialty shrimp and corn score better with the correct filling', () => {
  const { api } = loadGame();
  for (const filling of ['shrimp','corn']) {
    const slot = api.emptySlot(12);
    Object.assign(slot, {batter:true,oil:1,filling,totalCook:42,innerCook:34,shape:90,rollCount:3,sauce:1,mayo:1});
    const order = {filling,crispy:false,extraOcto:false,sauce:1,mayo:1,katsu:0,aonori:0};
    const matched = api.scoreBall(slot,order).score;
    slot.filling = 'octopus';
    const mismatched = api.scoreBall(slot,order).score;
    assert.ok(matched > mismatched, `${filling} must match its special order`);
  }
});

test('old one-by-one save data migrates to completed rows and keeps the special unlock', () => {
  const { api: old } = loadGame(JSON.stringify({ unlockedHoles: 5 }));
  assert.equal(old.game.maxUnlockedHoles, 8);
  assert.equal(old.game.day, 2);
  const { api: special } = loadGame(JSON.stringify({ unlockedHoles: 12, specialUnlocked: true }));
  assert.equal(special.game.day, 4);
  assert.equal(special.game.specialUnlocked, true);
});

test('orders cannot be fulfilled by the other pan even when its food is finished', () => {
  const { api } = loadGame();
  api.game.day = 4;
  api.resetSlots();
  const order = { pan:1, pieces:2, filling:'shrimp', maxWait:100, age:0, sauce:1, mayo:1, katsu:0, aonori:0 };
  api.game.orders = [order];
  const basic = api.game.slots[0];
  const special = api.game.slots[12];
  for (const slot of [basic,special]) Object.assign(slot, {
    batter:true, oil:1, filling:'shrimp', finished:true, totalCook:42,
    innerCook:34, shape:95, rollCount:3, sauce:1, mayo:1
  });
  api.actionPack();
  assert.equal(api.game.orders.length, 1);
  assert.equal(api.game.dayServed, 0);
  assert.equal(api.game.slots[0].finished, true);
});

test('two simultaneous customers keep separate takoyaki and can be selected', () => {
  const { api } = loadGame();
  api.game.day = 3;
  api.resetSlots();
  const a={id:'guest-a',type:'basic',pan:0,pieces:2,filling:'octopus',sauce:1,mayo:0,katsu:0,aonori:0,maxWait:100,age:0};
  const b={id:'guest-b',type:'mayo',pan:0,pieces:2,filling:'octopus',sauce:0,mayo:1,katsu:0,aonori:0,maxWait:100,age:0};
  api.game.orders=[a,b];
  api.game.activeOrderId='guest-a';
  assert.equal(api.getCfg().queueMax,2);
  assert.equal(api.activeOrder(),a);
  api.game.slots[0].orderId=a.id;
  api.game.slots[0].finished=true;
  api.game.slots[1].orderId=b.id;
  api.game.slots[1].finished=true;
  assert.equal(api.orderReadyCount(a.id),1);
  assert.equal(api.orderReadyCount(b.id),1);
  api.selectOrder(b.id);
  assert.equal(api.activeOrder(),b);
  assert.equal(api.orderReadyCount(b.id),1);
});

test('a tap assigns food to the selected customer and serving preserves the other order', () => {
  const { api } = loadGame();
  api.game.day=3;
  api.resetSlots();
  api.game.started=true;
  const a={id:'a',type:'basic',pan:0,pieces:1,filling:'octopus',sauce:1,mayo:0,katsu:0,aonori:0,maxWait:100,age:0,customer:'👦'};
  const b={id:'b',type:'mayo',pan:0,pieces:1,filling:'octopus',sauce:0,mayo:1,katsu:0,aonori:0,maxWait:100,age:0,customer:'👧'};
  api.game.orders=[a,b];
  api.game.activeOrderId=a.id;
  api.tapSlot(0);
  assert.equal(api.game.slots[0].orderId,a.id);
  api.selectOrder(b.id);
  api.tapSlot(1);
  assert.equal(api.game.slots[1].orderId,b.id);
  api.selectOrder(a.id);
  const slot=api.game.slots[0];
  Object.assign(slot,{oil:1,batter:true,totalCook:42,innerCook:34,shape:95,burn:0,rollCount:3,sauce:1,finished:true});
  api.actionPack();
  assert.deepEqual(api.game.orders.map(o=>o.id),['b']);
  assert.equal(api.game.slots[0].batter,false);
  assert.equal(api.game.slots[1].orderId,b.id);
  assert.equal(api.game.slots[1].batter,true);
  assert.equal(api.activeOrder(),b);
});

test('roll and serving readiness have different signs', () => {
  const { api } = loadGame();
  const s=api.emptySlot(0);
  s.unlocked=true;
  assert.equal(api.slotCue(s).kind,'empty');
  Object.assign(s,{batter:true,phaseCook:8,rollCount:1});
  assert.equal(api.slotCue(s).icon,'↻');
  Object.assign(s,{rollCount:3,totalCook:35,innerCook:22,burn:0});
  assert.equal(api.slotCue(s).icon,'✓');
  s.burn=95;
  assert.equal(api.slotCue(s).kind,'burn');
});

test('inactive second pan rests while the current pan heats', () => {
  const { api } = loadGame();
  api.game.day=4;
  api.resetSlots();
  const main=api.game.slots[0], special=api.game.slots[12];
  main.batter=true;special.batter=true;
  api.game.started=true;api.game.paused=false;api.game.activePan=0;
  api.updateCooking(5);
  assert.ok(main.totalCook>0);
  assert.equal(special.totalCook,0);
  api.game.activePan=1;
  const mainBefore=main.totalCook;
  api.updateCooking(5);
  assert.equal(main.totalCook,mainBefore);
  assert.ok(special.totalCook>0);
});

test('a preschool child may close the shop after serving one order', () => {
  const { api, elements } = loadGame();
  api.game.day=1;
  api.game.started=true;
  api.game.paused=false;
  api.game.dayServed=1;
  api.endDay();
  assert.equal(api.game.paused,true);
  assert.match(elements.get('resultTitle').textContent,/8구 해금/);
  assert.equal(elements.get('finishDayBtn').hidden,true);
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
