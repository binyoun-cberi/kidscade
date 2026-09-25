const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/games.json'), 'utf8'));
const games = Array.isArray(catalog.games) ? catalog.games : [];

const SUBJECTS = new Set(['math','korean','language','social','science','arts','career','thinking']);
const GENRES = new Set(['action','puzzle','strategy','simulation','management','quiz','rhythm','sports','sandbox','rpg']);
const DIFFICULTIES = new Set(['easy','medium','hard']);
const PLAYERS = new Set(['solo','local2','localMulti','online','classroom']);
const INPUTS = new Set(['touch','keyboard']);
const QUALITY = new Set(['featured','standard','rework']);

test('catalog v7 gives every game discovery metadata', () => {
  assert.equal(catalog.schemaVersion, 7);
  assert.ok(games.length >= 100, `unexpectedly small catalog: ${games.length}`);
  assert.ok(catalog.taxonomy?.subjects?.thinking);
  assert.ok(catalog.taxonomy?.genres?.simulation);

  for (const game of games) {
    assert.ok(SUBJECTS.has(game.subject), `${game.id}: invalid subject ${game.subject}`);
    assert.ok(GENRES.has(game.genre), `${game.id}: invalid genre ${game.genre}`);
    assert.ok(DIFFICULTIES.has(game.difficulty), `${game.id}: invalid difficulty ${game.difficulty}`);
    assert.ok(Number.isInteger(game.sessionMinutes) && game.sessionMinutes >= 1, `${game.id}: invalid sessionMinutes`);
    assert.ok(Array.isArray(game.players) && game.players.length > 0, `${game.id}: players missing`);
    game.players.forEach(value => assert.ok(PLAYERS.has(value), `${game.id}: invalid player mode ${value}`));
    assert.ok(Array.isArray(game.input) && game.input.length > 0, `${game.id}: input missing`);
    game.input.forEach(value => assert.ok(INPUTS.has(value), `${game.id}: invalid input ${value}`));
    assert.ok(QUALITY.has(game.qualityStatus), `${game.id}: invalid qualityStatus ${game.qualityStatus}`);
    assert.equal(typeof game.classroom, 'boolean', `${game.id}: classroom must be boolean`);
  }
});

test('legacy trivia bucket is split into useful discovery subjects and genres', () => {
  const trivia = games.filter(game => game.category === 'trivia');
  assert.ok(new Set(trivia.map(game => game.subject)).size >= 4);
  assert.ok(new Set(trivia.map(game => game.genre)).size >= 5);
  assert.equal(games.find(game => game.id === 'high_seed_volleyball')?.genre, 'sports');
  assert.equal(games.find(game => game.id === 'high_metro_planner')?.genre, 'strategy');
  assert.equal(games.find(game => game.id === 'high_history_timebattle_live')?.subject, 'social');
  assert.equal(games.find(game => game.id === 'low_wordchain_arena')?.subject, 'korean');
});

test('curation status is conservative and rework games are explicit', () => {
  const featured = games.filter(game => game.qualityStatus === 'featured');
  assert.ok(featured.length >= 10 && featured.length <= 25);
  assert.equal(games.find(game => game.id === 'job_teacher_classroom')?.qualityStatus, 'rework');
});
