const test = require('node:test');
const assert = require('node:assert/strict');
const recommendations = require('../game-recommendations.js');

const game = {
  id: 'math_demo',
  category: 'math',
  description: '짧은 설명',
  scoreKey: 'math_demo_score'
};

const base = {
  answers: {},
  favoriteIds: [],
  recentIds: [],
  playState: { plays: 1 },
  random: () => 0
};

test('recommendation scorer rewards requested category and favorite state', () => {
  const score = recommendations.scoreGame(game, {
    ...base,
    answers: { category: 'math', style: 'favorite' },
    favoriteIds: ['math_demo']
  });
  assert.equal(score, 22);
});

test('recommendation scorer distinguishes fresh and recent games', () => {
  const fresh = recommendations.scoreGame(game, {
    ...base,
    answers: { style: 'fresh' },
    recentIds: []
  });
  const recent = recommendations.scoreGame(game, {
    ...base,
    answers: { style: 'fresh' },
    recentIds: ['math_demo']
  });
  assert.equal(fresh, 5);
  assert.equal(recent, -4);
});

test('recommendation scorer uses catalog metadata for challenge and short-play signals', () => {
  const challenge = recommendations.scoreGame(game, {
    ...base,
    answers: { style: 'challenge' }
  });
  const short = recommendations.scoreGame(game, {
    ...base,
    answers: { style: 'short' }
  });
  assert.equal(challenge, 4);
  assert.equal(short, 2);
});

test('recommendation scorer uses dominant category and preserves the existing unplayed penalty', () => {
  const score = recommendations.scoreGame(game, {
    ...base,
    answers: { category: 'any' },
    dominantCategory: { key: 'math', value: 12 },
    playState: { plays: 0 }
  });
  assert.equal(score, -14);
});

test('recommendation scorer rejects missing games and supports deterministic random tie-breaking', () => {
  assert.equal(recommendations.scoreGame(null, base), null);
  const score = recommendations.scoreGame(game, {
    ...base,
    random: () => 0.75
  });
  assert.equal(score, 1.5);
});
