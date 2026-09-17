const test = require('node:test');
const assert = require('node:assert/strict');

const achievements = require('../achievement-state.js');

test('history rank thresholds remain compatible', () => {
  assert.equal(achievements.getCustomHistoryRank(0), '구석기');
  assert.equal(achievements.getCustomHistoryRank(41), '조선시대');
  assert.equal(achievements.getCustomHistoryRank(42), '대한제국');
  assert.equal(achievements.getCustomHistoryRank(50), '대한민국');
  assert.equal(achievements.getCustomHistoryRank(60), '역사왕 👑');
});

test('history composite score uses figures/events maximum', () => {
  assert.equal(achievements.getHistoryMaxScore('{"figures":17,"events":31}'), 31);
  assert.equal(achievements.normalizeScoreValue('high_history_match', '{"figures":12,"events":8}'), 12);
  assert.equal(achievements.normalizeRankValue('high_history_match', '{"figures":42,"events":11}'), '대한제국');
});

test('high ranks and normal ranks are classified consistently', () => {
  assert.equal(achievements.isHighRank('마스터'), true);
  assert.equal(achievements.isHighRank('역사왕 👑'), true);
  assert.equal(achievements.isHighRank('골드'), false);
  assert.equal(achievements.normalizeRankValue('other', '언랭크'), '언랭크');
});

test('score formatting preserves score and time labels', () => {
  assert.equal(achievements.formatScore(125, true), '⏱️ 최고 02:05');
  assert.match(achievements.formatScore(1234, false), /^🏆 최고 1[,\s]?234점$/);
  assert.equal(achievements.formatScore(0, false), '');
});

test('inspect accepts an injected reader for game-specific keys', () => {
  const values = new Map([
    ['rank-key', '다이아몬드'],
    ['score-key', '987']
  ]);
  const result = achievements.inspect({
    gameId: 'sample',
    rankKey: 'rank-key',
    scoreKey: 'score-key',
    isTime: false
  }, key => values.get(key) ?? null);

  assert.equal(result.rank, '다이아몬드');
  assert.equal(result.score, 987);
  assert.equal(result.highRank, true);
  assert.match(result.scoreText, /987점/);
});
