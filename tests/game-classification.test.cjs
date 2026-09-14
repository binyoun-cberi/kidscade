const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'games.json'), 'utf8'));
const games = Array.isArray(catalog.games) ? catalog.games : [];
const byId = new Map(games.map(game => [game.id, game]));

const reviewedAges = {
  math_timing_lcd: 'low',
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

function normalizeHref(value) {
  return String(value || '').split('#')[0].split('?')[0].trim();
}

function normalizeTitle(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

test('reviewed games keep their intended age group', () => {
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
    high: 52,
    job: 8,
    toddler: 8
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
  // IDs are permanent localStorage keys. A reviewed age move must not force an ID rename.
  assert.equal(byId.get('tod_puzzle_time').age, 'low');
  assert.equal(byId.get('tod_emoji_minesweeper').age, 'high');
  assert.equal(byId.get('low_rubiks_cube').age, 'high');
  assert.equal(byId.get('high_gugudan_stairs').age, 'low');
});
