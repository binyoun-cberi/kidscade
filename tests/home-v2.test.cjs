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


test('Home V2 supports recommended and classic presentation modes', () => {
  assert.equal(home.normalizeLayout('recommend'), 'recommend');
  assert.equal(home.normalizeLayout('classic'), 'classic');
  assert.equal(home.normalizeLayout('anything-else'), 'recommend');
});

test('home layout switch is wired without duplicating the catalog', () => {
  const fs=require('node:fs');
  const path=require('node:path');
  const html=fs.readFileSync(path.resolve(__dirname,'..','index_base.html'),'utf8');
  const css=fs.readFileSync(path.resolve(__dirname,'..','home-v2.css'),'utf8');
  const storage=fs.readFileSync(path.resolve(__dirname,'..','kidscade-storage.js'),'utf8');
  assert.match(html, /id="btn-home-layout"/);
  assert.match(css, /data-kc-home-layout="classic"/);
  assert.match(storage, /homeLayout:\s*'kidscade_home_layout'/);
});


test('Home V2 rail salts prevent the same deterministic ordering everywhere', () => {
  const pool = Array.from({length:8}, (_,index) => ({
    id:`g-${index}`, title:`G${index}`, age:'high', subject:'math',
    genre:'quiz', sessionMinutes:5, players:['solo']
  }));
  const quick = home.deterministicGames(pool, () => true, 'high', 8, '2026-09-28', 'quick').map(game => game.id);
  const math = home.deterministicGames(pool, () => true, 'high', 8, '2026-09-28', 'subject:math').map(game => game.id);
  assert.notDeepEqual(quick, math);
  assert.deepEqual(
    home.deterministicGames(pool, () => true, 'high', 8, '2026-09-28', 'quick').map(game => game.id),
    quick
  );
});

test('Home V2 pushes already-promoted games behind fresh rail leaders', () => {
  const pool = ['a','b','c','d','e'].map(id => ({ id }));
  const seen = new Set(['a','b']);
  const result = home.diversifyRail(pool, seen, 5, 3);
  assert.deepEqual(result.slice(0,3).map(game => game.id), ['c','d','e']);
  assert.deepEqual([...seen].sort(), ['a','b','c','d','e']);
});

test('Home V2 adds subject shelves when the current age has enough games', () => {
  const subjectGames = [
    ...games,
    { id:'math-2', title:'수학2', age:'high', subject:'math', genre:'puzzle', sessionMinutes:10, players:['solo'] },
    { id:'korean-1', title:'국어1', age:'high', subject:'korean', genre:'quiz', sessionMinutes:10, players:['solo'] },
    { id:'korean-2', title:'국어2', age:'high', subject:'korean', genre:'quiz', sessionMinutes:10, players:['solo'] },
    { id:'science-1', title:'과학1', age:'high', subject:'science', genre:'simulation', sessionMinutes:10, players:['solo'] },
    { id:'science-2', title:'과학2', age:'high', subject:'science', genre:'quiz', sessionMinutes:10, players:['solo'] }
  ];
  const rails = home.railDefinitions(subjectGames, {
    age:'high',
    dateKey:'2026-09-28',
    recentGames:[],
    popularGames:[],
    recommendedGames:[]
  });
  assert.ok(rails.find(rail => rail.key === 'subject-math'));
  assert.ok(rails.find(rail => rail.key === 'subject-korean'));
  assert.ok(rails.find(rail => rail.key === 'subject-science'));
  assert.equal(rails.some(rail => rail.key === 'thinking'), false);
});

test('recommended home no longer duplicates the all-games CTA already handled by the home toggle', () => {
  const fs=require('node:fs');
  const path=require('node:path');
  const source=fs.readFileSync(path.resolve(__dirname,'..','home-v2.js'),'utf8');
  const css=fs.readFileSync(path.resolve(__dirname,'..','home-v2.css'),'utf8');
  assert.doesNotMatch(source, /kc-home-library-cta|kc-home-library-open|모든 게임 둘러보기/);
  assert.doesNotMatch(css, /kc-home-library-cta|kc-home-library-open/);
});
