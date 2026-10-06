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

const vm=require('node:vm');
function mealHarness(){const source=js.slice(js.indexOf('function applyMeal('),js.indexOf('function rollEvent('));const state={running:true,location:'home',day:1,slot:0,hunger:40,condition:75,satisfaction:62,dailyKcal:0,mealFoods:[],mealCooked:false,mealQuick:false,inventory:[],weekStats:{sugar:0,sodium:0,veg:0,protein:0,meals:0,cooked:0,quick:0}};const context={state,nearest:{type:'table'},clamp:(x,a,b)=>Math.min(b,Math.max(a,x)),toast(){},save(){},renderHud(){},showWeekReport(){},rollEvent(){}};vm.createContext(context);vm.runInContext(source,context);return context}
const food={name:'사과',nutrition:{kcal:95,satiety:17,veg:2,protein:0,sugar:10,sodium:0,mood:2}};
test('multiple foods stay in one meal until explicit finish, and finish cannot repeat',()=>{const c=mealHarness();c.applyMeal(food,false,false);c.applyMeal(food,false,false);assert.equal(c.state.slot,0);assert.equal(c.state.dailyKcal,190);assert.equal(c.state.weekStats.meals,0);c.finishMeal();assert.equal(c.state.slot,1);assert.equal(c.state.weekStats.meals,1);assert.equal(c.state.weekStats.quick,0);c.finishMeal();assert.equal(c.state.slot,1)});
test('meal completion requires proximity to the table and preserves food records otherwise',()=>{const c=mealHarness();c.applyMeal(food,true,false);c.nearest={type:'stove'};c.finishMeal();assert.equal(c.state.slot,0);assert.equal(c.state.mealFoods.length,1);c.nearest={type:'table'};c.finishMeal();assert.equal(c.state.weekStats.cooked,1)});
test('cooking does not manufacture vegetables or an unconditional condition bonus',()=>{const a=mealHarness(),b=mealHarness();a.applyMeal(food,true,false);b.applyMeal(food,false,false);assert.equal(a.state.condition,b.state.condition);assert.doesNotMatch(js,/nutrition\.veg\+=/)});
test('a day changes only after three finished meals and calorie totals reset then',()=>{const c=mealHarness();for(let i=0;i<3;i++){c.applyMeal(food,false,false);c.finishMeal()}assert.equal(c.state.day,2);assert.equal(c.state.slot,0);assert.equal(c.state.dailyKcal,0);assert.equal(c.state.weekStats.meals,3)});
