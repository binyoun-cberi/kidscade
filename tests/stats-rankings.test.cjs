const test = require('node:test');
const assert = require('node:assert/strict');
const rankings = require('../stats-rankings.js');

test('weekly ranking orders by weekly plays then total plays', () => {
  const result = rankings.rankGames({
    alpha: { weeklyPlays: 4, totalPlays: 10 },
    beta: { weeklyPlays: 7, totalPlays: 8 },
    gamma: { weeklyPlays: 4, totalPlays: 20 },
    zero: { weeklyPlays: 0, totalPlays: 99 }
  }, 'weekly', 5);

  assert.deepEqual(result.map(item => item.gameId), ['beta', 'gamma', 'alpha']);
  assert.deepEqual(result.map(item => item.rank), [1, 2, 3]);
});

test('all-time ranking orders by total plays then current week plays', () => {
  const result = rankings.rankGames({
    alpha: { weeklyPlays: 3, totalPlays: 25 },
    beta: { weeklyPlays: 8, totalPlays: 25 },
    gamma: { weeklyPlays: 20, totalPlays: 21 },
    zero: { weeklyPlays: 5, totalPlays: 0 }
  }, 'allTime', 5);

  assert.deepEqual(result.map(item => item.gameId), ['beta', 'alpha', 'gamma']);
});

test('popular lists cap each board independently at five games', () => {
  const games = {};
  for (let index = 1; index <= 8; index += 1) {
    games[`game_${index}`] = { weeklyPlays: index, totalPlays: 100 - index };
  }
  const result = rankings.buildPopularLists(games, 5);
  assert.equal(result.weekly.length, 5);
  assert.equal(result.allTime.length, 5);
  assert.equal(result.weekly[0].gameId, 'game_8');
  assert.equal(result.allTime[0].gameId, 'game_1');
});
