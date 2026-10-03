const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const enginePath = path.join(root, 'games', 'shared', 'restaurant-engine.js');
const source = fs.readFileSync(enginePath, 'utf8');

async function loadEngine() {
  const url = 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
  return import(url);
}

test('Restaurant Engine parses as browser ESM', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: source, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout || 'restaurant engine syntax check failed');
});

test('RecipeBook supports exact and partial recipe matching', async () => {
  const { RecipeBook } = await loadEngine();
  const book = new RecipeBook({
    items: [{ id: 'noodle' }, { id: 'soup' }, { id: 'egg' }],
    recipes: [{ id: 'egg', need: ['noodle', 'soup', 'egg'], price: 900 }]
  });
  assert.equal(book.findExact(['egg', 'soup', 'noodle']).id, 'egg');
  assert.equal(book.compatibleWithPartial(['noodle', 'soup']).length, 1);
  assert.equal(book.compatibleWithPartial(['noodle', 'cheese']).length, 0);
});

test('orders decay and expired customers are counted', async () => {
  const { RestaurantEngine } = await loadEngine();
  const engine = new RestaurantEngine({
    recipes: [{ id: 'toast', ingredients: ['bread'], price: 500 }],
    order: { maxOrders: 2, basePatience: 2, decayPerSecond: 2 },
    shift: { duration: 30 }
  });
  engine.spawnOrder('toast');
  const result = engine.tick(1.1, { advanceShift: false, advanceAutomation: false });
  assert.equal(result.expiredOrders.length, 1);
  assert.equal(engine.orders.items.length, 0);
  assert.equal(engine.economy.missed, 1);
});

test('serving validates recipe and records custom pricing', async () => {
  const { RestaurantEngine } = await loadEngine();
  const engine = new RestaurantEngine({
    recipes: [
      { id: 'a', ingredients: ['a'], price: 1000 },
      { id: 'b', ingredients: ['b'], price: 1000 }
    ],
    pricing: ({ recipe, quality }) => recipe.price * quality / 100
  });
  const order = engine.spawnOrder('a');
  assert.equal(engine.serve(order.id, 'b', { quality: 90 }).reason, 'wrong-recipe');
  const sale = engine.serve(order.id, 'a', { quality: 90 });
  assert.equal(sale.ok, true);
  assert.equal(sale.earned, 900);
  assert.equal(engine.economy.revenue, 900);
  assert.equal(engine.economy.served, 1);
  assert.equal(engine.economy.perfect, 1);
});

test('automation uses fixed ticks and never duplicates items on transfer', async () => {
  const { RestaurantEngine } = await loadEngine();
  const engine = new RestaurantEngine({
    automation: {
      width: 3,
      height: 1,
      fixedStep: 0.05,
      applianceTypes: [
        { id: 'source', source: { item: 'raw', interval: 5 }, outputDirection: 'east', transportSeconds: 0.05 },
        { id: 'processor', accepts: ['raw'], process: { input: 'raw', output: 'cooked', seconds: 0.1 }, outputDirection: 'east', transportSeconds: 0.05 },
        { id: 'counter', accepts: ['cooked'] }
      ]
    }
  });
  engine.automation.place('source', 0, 0);
  engine.automation.place('processor', 1, 0);
  engine.automation.place('counter', 2, 0);
  engine.tick(0.4, { advanceShift: false, advanceOrders: false });
  const items = engine.automation.snapshot().filter(cell => cell.item).map(cell => cell.item.id);
  assert.deepEqual(items, ['cooked']);
});

test('same-destination transport conflicts resolve to one item', async () => {
  const { AutomationGrid } = await loadEngine();
  const grid = new AutomationGrid({
    width: 3,
    height: 2,
    fixedStep: 0.05,
    applianceTypes: [
      { id: 'right', transport: true, direction: 'east', transportSeconds: 0.05 },
      { id: 'up', transport: true, direction: 'north', transportSeconds: 0.05 }
    ]
  });
  grid.place('right', 0, 0, { direction: 'east' });
  grid.place('up', 1, 1, { direction: 'north' });
  grid.putItem(0, 0, 'a');
  grid.putItem(1, 1, 'b');
  grid.tick(0.05);
  const snapshot = grid.snapshot();
  const itemCount = snapshot.filter(cell => cell.item).length;
  assert.equal(itemCount, 2);
  assert.ok(grid.cell(1, 0).item);
});
