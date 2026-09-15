const test = require('node:test');
const assert = require('node:assert/strict');
const profile = require('../profile-history.js');

test('nickname cleanup is safe and capped at 12 characters', () => {
  assert.equal(profile.sanitizeNickname('  새싹   게이머  '), '새싹 게이머');
  assert.equal(profile.sanitizeNickname('<b>용사</b>'), 'b용사/b');
  assert.equal(profile.sanitizeNickname('abcdefghijklmnop'), 'abcdefghijkl');
});

test('sessions shorter than 30 seconds are not recorded', () => {
  const history = profile.recordSessionState(profile.emptyHistory(), {
    id: 'demo',
    category: 'math',
    seconds: 29
  }, new Date(2026, 8, 15, 10, 0).getTime());

  assert.equal(Object.keys(history.games).length, 0);
  assert.equal(history.recent.length, 0);
});

test('valid sessions aggregate play count, time and weekly totals', () => {
  const monday = new Date(2026, 8, 14, 10, 0).getTime();
  let history = profile.emptyHistory();
  history = profile.recordSessionState(history, { id: 'game-a', category: 'math', seconds: 60 }, monday);
  history = profile.recordSessionState(history, { id: 'game-a', category: 'math', seconds: 90 }, monday + 3600000);
  history = profile.recordSessionState(history, { id: 'game-b', category: 'lang', seconds: 30 }, monday + 7200000);

  const summary = profile.summarize(history, { now: monday + 7200000 });
  assert.equal(summary.totalPlays, 3);
  assert.equal(summary.totalSeconds, 180);
  assert.equal(summary.weekPlays, 3);
  assert.equal(summary.weekSeconds, 180);
  assert.equal(summary.uniqueGames, 2);
  assert.equal(summary.topGames[0].id, 'game-a');
  assert.equal(summary.topGames[0].plays, 2);
  assert.deepEqual(summary.recentGameIds, ['game-b', 'game-a']);
});

test('weekly totals roll over without losing cumulative history', () => {
  const firstMonday = new Date(2026, 8, 14, 10, 0).getTime();
  const nextMonday = new Date(2026, 8, 21, 10, 0).getTime();
  let history = profile.emptyHistory();
  history = profile.recordSessionState(history, { id: 'game-a', seconds: 45 }, firstMonday);
  history = profile.recordSessionState(history, { id: 'game-a', seconds: 75 }, nextMonday);

  const current = profile.summarize(history, { now: nextMonday });
  assert.equal(current.totalPlays, 2);
  assert.equal(current.totalSeconds, 120);
  assert.equal(current.weekPlays, 1);
  assert.equal(current.weekSeconds, 75);
});

test('profile normalization creates an anonymous local-only default', () => {
  const now = new Date(2026, 8, 15, 12, 0).getTime();
  const value = profile.normalizeProfile(null, now);
  assert.equal(value.nickname, '새싹 게이머');
  assert.equal(value.version, 1);
  assert.ok(value.createdAt.includes('2026-09-15'));
});

test('duration formatting stays compact for the MY SPACE card', () => {
  assert.equal(profile.formatDuration(0), '0분');
  assert.equal(profile.formatDuration(45), '45초');
  assert.equal(profile.formatDuration(125), '2분');
  assert.equal(profile.formatDuration(3720), '1시간 2분');
});
