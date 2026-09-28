const test = require('node:test');
const assert = require('node:assert/strict');
const home = require('../home-v2.js');

const games = [
  { id:'featured', title:'추천', age:'high', qualityStatus:'featured', subject:'thinking', genre:'strategy', sessionMinutes:15, players:['solo'] },
  { id:'quick', title:'짧게', age:'high', subject:'math', genre:'quiz', sessionMinutes:5, players:['solo'] },
  { id:'together', title:'같이', age:'high', subject:'thinking', genre:'action', sessionMinutes:10, players:['local2'] },
  { id:'puzzle', title:'퍼즐', age:'high', subject:'thinking', genre:'puzzle', sessionMinutes:10, players:['solo'] },
  { id:'job-a', title:'직업A', age:'job', subject:'career', genre:'simulation', sessionMinutes:20, players:['solo'] },
  { id:'job-b', title:'직업B', age:'job', subject:'career', genre:'management', sessionMinutes:20, players:['solo'] }
];

test('Home V2 age matching keeps career games separate from normal age rails', () => {
  assert.equal(home.supportsAge(games[0], 'high'), true);
  assert.equal(home.supportsAge(games[4], 'high'), false);
  assert.equal(home.supportsAge(games[4], 'job'), true);
});

test('Home V2 hero is deterministic and prefers featured games', () => {
  const first = home.heroGame(games, 'high', { dateKey:'2026-09-28', recentIds:[] });
  const second = home.heroGame(games, 'high', { dateKey:'2026-09-28', recentIds:[] });
  assert.equal(first.id, 'featured');
  assert.equal(second.id, first.id);
});

test('Home V2 popular ranking follows weekly plays before total plays', () => {
  const ranked = home.rankPopular(games, {
    games: {
      featured:{ weeklyPlays:2,totalPlays:99 },
      quick:{ weeklyPlays:8,totalPlays:10 },
      together:{ weeklyPlays:5,totalPlays:40 }
    }
  }, 'high');
  assert.deepEqual(ranked.slice(0,3).map(game => game.id), ['quick','together','featured']);
});

test('Home V2 recommendation rewards unseen games and preference affinity', () => {
  const ranked = home.recommendGames(games, {
    age:'high',
    recentIds:['featured'],
    favoriteIds:['puzzle'],
    dateKey:'2026-09-28'
  });
  assert.equal(ranked.includes(games[4]), false);
  assert.ok(ranked.findIndex(game => game.id === 'puzzle') < ranked.findIndex(game => game.id === 'quick'));
});

test('Home V2 rails expose career as a discovery row for school ages', () => {
  const rails = home.railDefinitions(games, {
    age:'high',
    dateKey:'2026-09-28',
    recentGames:[],
    popularGames:[],
    recommendedGames:[games[0],games[1],games[2],games[3]]
  });
  const career = rails.find(rail => rail.key === 'career');
  assert.ok(career);
  assert.deepEqual(career.games.map(game => game.id).sort(), ['job-a','job-b']);
});
