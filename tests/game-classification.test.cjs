const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'games.json'), 'utf8'));
const games = Array.isArray(catalog.games) ? catalog.games : [];
const byId = new Map(games.map(game => [game.id, game]));

const distCatalogPath = path.join(ROOT, 'dist', 'data', 'games.json');
const deployedCatalog = fs.existsSync(distCatalogPath)
  ? JSON.parse(fs.readFileSync(distCatalogPath, 'utf8'))
  : { games: [] };
const deployedGames = Array.isArray(deployedCatalog.games) ? deployedCatalog.games : [];
const deployedById = new Map(deployedGames.map(game => [game.id, game]));

const reviewedAges = {
  math_timing_lcd: 'low',
  high_star_hoppers: 'high',
  toddler_monkey_vines: 'toddler',
  toddler_penguin_ice_pop: 'toddler',
  toddler_color_stack: 'toddler',
  toddler_three_friends_set: 'low',
  high_omok_arena: 'high',
  sim_mosquito: 'high',
  low_big_puzzle_time: 'high',
  tod_emoji_minesweeper: 'high',
  low_rubiks_cube: 'high',
  high_3d_block_painter: 'low',
  magic_scale: 'low',
  hanja_survivors_8: 'low',
  high_gugudan_stairs: 'low',
  joseon_janggu: 'low',
  burger_master: 'job',
  tod_puzzle_time: 'low'
};

const allowedAges = new Set(['toddler', 'low', 'high', 'job']);
const allowedCategories = new Set(['math', 'korean', 'lang', 'trivia', 'music', 'job']);

function normalizeHref(value) {
  return String(value || '').split('#')[0].split('?')[0].trim();
}

function normalizeTitle(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

test('reviewed games keep their intended primary age group', () => {
  for (const [id, expectedAge] of Object.entries(reviewedAges)) {
    const game = byId.get(id);
    assert.ok(game, `missing reviewed game: ${id}`);
    assert.equal(game.age, expectedAge, `${game.title} (${id}) should be ${expectedAge}`);
  }
});

test('catalog age distribution matches the reviewed inventory', () => {
  const counts = games.reduce((result, game) => {
    result[game.age] = (result[game.age] || 0) + 1;
    return result;
  }, {});

  assert.deepEqual(counts, {
    low: 27,
    high: 54,
    job: 8,
    toddler: 11
  });
});

test('a game is not duplicated under another title/id through the same target file', () => {
  const hrefs = new Map();
  const titles = new Map();

  for (const game of games) {
    const href = normalizeHref(game.href);
    if (href) {
      assert.equal(hrefs.has(href), false, `duplicate game target: ${href} (${hrefs.get(href)} / ${game.id})`);
      hrefs.set(href, game.id);
    }

    const title = normalizeTitle(game.title);
    assert.equal(titles.has(title), false, `duplicate game title: ${game.title} (${titles.get(title)} / ${game.id})`);
    titles.set(title, game.id);
  }
});

test('legacy id prefixes do not define the current age classification', () => {
  assert.equal(byId.get('tod_puzzle_time').age, 'low');
  assert.equal(byId.get('tod_emoji_minesweeper').age, 'high');
  assert.equal(byId.get('low_rubiks_cube').age, 'high');
  assert.equal(byId.get('high_gugudan_stairs').age, 'low');
});

test('deployed catalog uses only supported age and category values', () => {
  assert.equal(deployedGames.length, games.length, 'deployed catalog should keep every source game');
  for (const game of deployedGames) {
    assert.ok(allowedAges.has(game.age), `unsupported age: ${game.id} -> ${game.age}`);
    assert.ok(allowedCategories.has(game.category), `unsupported category: ${game.id} -> ${game.category}`);
    if (game.ages != null) {
      assert.ok(Array.isArray(game.ages) && game.ages.length > 0, `ages must be a non-empty array: ${game.id}`);
      game.ages.forEach(age => assert.ok(allowedAges.has(age), `unsupported secondary age: ${game.id} -> ${age}`));
      assert.ok(game.ages.includes(game.age), `multi-age game must include its primary age: ${game.id}`);
    }
  }
});

test('딱! 타임 is visible to both low and high elementary groups', () => {
  const game = deployedById.get('math_timing_lcd');
  assert.ok(game, '딱! 타임 LCD should exist in the deployed catalog');
  assert.deepEqual(game.ages, ['low', 'high']);
  assert.equal(game.category, 'math');
});

test('all job-experience games are classified under the job category', () => {
  const jobGames = deployedGames.filter(game => game.age === 'job');
  assert.equal(jobGames.length, 8);
  for (const game of jobGames) {
    assert.equal(game.category, 'job', `${game.title} should use the job category`);
  }
});
