const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'games/math_base10_blocks/index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'games/math_base10_blocks/market-walk.js'),'utf8');

test('neighborhood mart is a free-form life simulator instead of a shopping-list mission',()=>{
  assert.match(html,/우리 동네에서 먹고 살아보기/);
  assert.match(html,/정해진 장보기 목록은 없어요/);
  assert.doesNotMatch(html,/class="missionCard"|id="shoppingList"/);
  assert.match(js,/WEEKLY_BUDGET=35000/);
  assert.match(js,/function buildHome\(/);
  assert.match(js,/function buildStore\(/);
  assert.match(js,/function rollEvent\(/);
  assert.match(js,/dailyKcal/);
});

test('market is first-person, cart based, and checkout requires manual arithmetic',()=>{
  assert.match(js,/PerspectiveCamera\(62/);
  assert.match(js,/function tryTakeMarketProduct\(/);
  assert.match(js,/function putHeldInCart\(/);
  assert.match(js,/async function spawnCart\(/);
  assert.match(html,/총액 직접 계산/);
  assert.match(html,/거스름돈 직접 계산/);
  assert.doesNotMatch(html,/id="checkoutTotal"/);
  assert.match(js,/function submitTotal\(/);
  assert.match(js,/function submitChange\(/);
});

test('home kitchen supports physical storage, cooking, quick food, and eating',()=>{
  assert.match(js,/interactable\('fridge'/);
  assert.match(js,/interactable\('pantry'/);
  assert.match(js,/interactable\('counter'/);
  assert.match(js,/interactable\('stove'/);
  assert.match(js,/interactable\('microwave'/);
  assert.match(js,/interactable\('table'/);
  assert.match(js,/async function cookPrep\(/);
  assert.match(js,/async function microwaveHeld\(/);
  assert.match(js,/async function eatAtTable\(/);
  assert.match(js,/protein:/);
  assert.match(js,/sodium:/);
  assert.match(js,/sugar:/);
});

test('required 3D market and food assets exist',()=>{
  const required=[
    'assets/game/shops/market/cash-register.glb',
    'assets/game/shops/market/shopping-cart.glb',
    'assets/game/shops/market/display-fruit.glb',
    'assets/game/shops/market/display-bread.glb',
    'assets/game/shops/market/freezer.glb',
    'assets/game/shops/market/freezers-standing.glb',
    'assets/game/shops/market/shelf-boxes.glb',
    'assets/game/shops/market/shelf-bags.glb',
    'assets/game/food/apple.glb',
    'assets/game/food/egg.glb',
    'assets/game/food/tomato.glb',
    'assets/game/food/fish.glb',
    'assets/game/food/pizza.glb'
  ];
  for(const rel of required)assert.ok(fs.existsSync(path.join(root,rel)),'missing asset: '+rel);
});
