const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'games/math_base10_blocks/우리 동네 마트 계산대.html'),'utf8');
const js=fs.readFileSync(path.join(root,'games/math_base10_blocks/market-walk.js'),'utf8');

test('walkable market uses shopping and self checkout flow',()=>{
  assert.match(html,/직접 장보고, 직접 계산해요/);
  assert.match(html,/SELF CHECKOUT/);
  assert.match(js,/state\.phase='shopping'/);
  assert.match(js,/function openCheckout/);
  assert.match(js,/function tryPick/);
  assert.match(js,/function updatePlayer/);
  assert.doesNotMatch(js,/CUSTOMER_LINES|advanceCustomer|대기 손님/);
});

test('walkable market required assets exist',()=>{
  const required=[
    'assets/game/shops/market/cash-register.glb',
    'assets/game/shops/market/shopping-cart.glb',
    'assets/game/shops/market/display-fruit.glb',
    'assets/game/shops/market/display-bread.glb',
    'assets/game/shops/market/freezer.glb',
    'assets/game/shops/market/freezers-standing.glb',
    'assets/game/shops/market/shelf-boxes.glb',
    'assets/game/shops/market/shelf-bags.glb',
    'assets/game/shops/market/shelf-end.glb',
    'assets/game/food/apple.glb',
    'assets/game/food/carton.glb',
    'assets/game/food/pizza.glb',
    'assets/game/characters/people/character-male-a.glb'
  ];
  for(const rel of required)assert.ok(fs.existsSync(path.join(root,rel)),'missing asset: '+rel);
});