const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const discovery = require('../catalog-discovery.js');

const ROOT = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8'));
const games = catalog.games;

test('featured discovery excludes rework games and respects age', () => {
  const picked = discovery.collectionGames(games, 'featured', { age:'high', subject:'all', genre:'all' }, 6, 20260924);
  assert.equal(picked.length, 6);
  assert.ok(picked.every(game => game.age === 'high' || game.ages?.includes('high')));
  assert.ok(picked.every(game => game.qualityStatus !== 'rework'));
  assert.ok(picked.some(game => game.qualityStatus === 'featured'));
  assert.equal(picked.some(game => game.id === 'job_teacher_classroom'), false);
});

test('quick and deep collections are driven by session metadata', () => {
  const quick = discovery.collectionGames(games, 'quick', { age:'low', subject:'all', genre:'all' }, 20, 1);
  assert.ok(quick.length > 0);
  assert.ok(quick.every(game => game.sessionMinutes <= 5));

  const deep = discovery.collectionGames(games, 'deep', { age:'high', subject:'all', genre:'all' }, 20, 1);
  assert.ok(deep.length > 0);
  assert.ok(deep.every(game => game.sessionMinutes >= 15));
});

test('together and classroom collections use explicit player metadata', () => {
  const together = discovery.collectionGames(games, 'together', { age:'high', subject:'all', genre:'all' }, 30, 1);
  assert.ok(together.some(game => game.id === 'high_seed_volleyball'));
  assert.ok(together.every(game => game.players.some(mode => mode !== 'solo')));

  const classroom = discovery.collectionGames(games, 'classroom', { age:'high', subject:'all', genre:'all' }, 30, 1);
  assert.ok(classroom.some(game => game.id === 'high_history_timebattle_live'));
  assert.ok(classroom.every(game => game.classroom === true));
});

test('curated discovery respects subject and genre together', () => {
  const picked = discovery.collectionGames(games, 'featured', { age:'high', subject:'science', genre:'strategy' }, 20, 1);
  assert.ok(picked.some(game => game.id === 'high_disaster_city'));
  assert.ok(picked.every(game => game.subject === 'science' && game.genre === 'strategy'));
});

test('discovery runtime defines the five intended collection tabs', () => {
  assert.deepEqual(Object.keys(discovery.COLLECTIONS), ['featured','quick','together','deep','classroom']);
});
