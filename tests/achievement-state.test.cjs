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


test('achievement registry exposes platform and pilot-game definitions', () => {
  assert.equal(achievements.progressKey, 'kidscade_achievements_v1');
  assert.equal(achievements.progressVersion, 2);
  assert.equal(achievements.getDefinition('cube3d.net_master').target, 10);
  assert.equal(achievements.getDefinition('high_micro_evolution.multicellular').hidden, true);
  assert.equal(achievements.getDefinition('infinite_gugudan.combo_20').target, 20);
  assert.equal(achievements.getGameProgress('cube3d').total, 6);
});

test('achievement state normalization ignores unknown ids and preserves known progress', () => {
  const state = achievements.normalizeAchievementState({
    unlocked: {
      'cube3d.first_blueprint': { unlockedAt: 1234 },
      'unknown.badge': { unlockedAt: 9 }
    },
    progress: {
      'cube3d.net_master': 7,
      'unknown.progress': 99
    },
    playedGames: { cube3d: 4567 }
  });

  assert.equal(state.unlocked['cube3d.first_blueprint'].unlockedAt, 1234);
  assert.equal(state.unlocked['unknown.badge'], undefined);
  assert.equal(state.progress['cube3d.net_master'], 7);
  assert.equal(state.progress['unknown.progress'], undefined);
  assert.equal(state.playedGames.cube3d, 4567);
});


test('opening a game records analytics but does not unlock achievements', () => {
  const memory = new Map();
  global.localStorage = {
    getItem:key => memory.has(key) ? memory.get(key) : null,
    setItem:(key,value) => memory.set(key,String(value)),
    removeItem:key => memory.delete(key)
  };
  try {
    achievements.registerDefinitions({
      id:'test_game.first_finish',
      gameId:'test_game',
      title:'첫 완주',
      enabled:true,
      trigger:'completion_count',
      target:1
    });
    achievements.recordPlayedGame('test_game', 12345);
    const state = achievements.loadAchievementState();
    assert.equal(Boolean(state.unlocked['test_game.first_finish']), false);
    assert.equal(state.playedGames.test_game, 12345);
    assert.equal(state.completedGames.test_game, undefined);
  } finally {
    delete global.localStorage;
  }
});

test('completion milestones progress from completed games instead of entry', () => {
  const memory = new Map();
  global.localStorage = {
    getItem:key => memory.has(key) ? memory.get(key) : null,
    setItem:(key,value) => memory.set(key,String(value)),
    removeItem:key => memory.delete(key)
  };
  try {
    achievements.registerDefinitions([
      {
        id:'completion_game.first_finish',
        gameId:'completion_game',
        title:'첫 완주',
        enabled:true,
        trigger:'completion_count',
        target:1
      },
      {
        id:'completion_game.finisher_5',
        gameId:'completion_game',
        title:'5회 완주',
        enabled:true,
        trigger:'completion_count',
        target:5
      }
    ]);
    achievements.recordCompletedGame('completion_game', 20000);
    let state = achievements.loadAchievementState();
    assert.equal(Boolean(state.unlocked['completion_game.first_finish']), true);
    assert.equal(Boolean(state.unlocked['completion_game.finisher_5']), false);
    assert.equal(state.progress['completion_game.finisher_5'], 1);
    assert.equal(state.completedGames.completion_game.count, 1);
    assert.equal(Boolean(state.unlocked['kidscade.first_finish']), true);

    for (let i = 0; i < 4; i += 1) achievements.recordCompletedGame('completion_game', 21000 + i);
    state = achievements.loadAchievementState();
    assert.equal(Boolean(state.unlocked['completion_game.finisher_5']), true);
    assert.equal(state.progress['completion_game.finisher_5'], 5);
    assert.equal(state.completedGames.completion_game.count, 5);
  } finally {
    delete global.localStorage;
  }
});

test('disabled planned achievements stay out of summaries and cannot unlock', () => {
  const before = achievements.getSummary().total;
  achievements.registerDefinitions({
    id:'planned_game.secret',
    gameId:'planned_game',
    title:'아직 연결 전',
    enabled:false,
    type:'secret',
    hidden:true
  });
  assert.equal(achievements.getSummary().total, before);
  assert.equal(achievements.unlock('planned_game.secret').unlocked, false);
  assert.equal(achievements.getDefinitions().some(def => def.id === 'planned_game.secret'), false);
  assert.equal(achievements.getAllDefinitions().some(def => def.id === 'planned_game.secret'), true);
});

test('event rules unlock only when the reported game-over condition is satisfied', () => {
  const memory = new Map();
  global.localStorage = {
    getItem:key => memory.has(key) ? memory.get(key) : null,
    setItem:(key,value) => memory.set(key,String(value)),
    removeItem:key => memory.delete(key)
  };
  try {
    achievements.registerDefinitions({
      id:'rule_game.combo',
      gameId:'rule_game',
      title:'콤보',
      enabled:true,
      rule:{event:'game-over',field:'maxCombo',op:'gte',value:10}
    });
    achievements.applyEventRules({event:'game-over',gameId:'rule_game',maxCombo:9});
    assert.equal(Boolean(achievements.loadAchievementState().unlocked['rule_game.combo']), false);
    achievements.applyEventRules({event:'game-over',gameId:'rule_game',maxCombo:10});
    assert.equal(Boolean(achievements.loadAchievementState().unlocked['rule_game.combo']), true);
  } finally {
    delete global.localStorage;
  }
});
