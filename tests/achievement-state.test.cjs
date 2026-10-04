const test = require('node:test');
const assert = require('node:assert/strict');

const achievements = require('../achievement-state.js');

function withMemory(run) {
  const memory = new Map();
  global.localStorage = {
    getItem:key => memory.has(key) ? memory.get(key) : null,
    setItem:(key,value) => memory.set(key,String(value)),
    removeItem:key => memory.delete(key)
  };
  try { return run(memory); }
  finally { delete global.localStorage; }
}

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
  assert.equal(achievements.progressVersion, 3);
  assert.equal(achievements.getDefinition('kidscade.first_result').title, '첫 기록');
  assert.equal(achievements.getDefinition('cube3d.net_master').target, 10);
  assert.equal(achievements.getDefinition('high_micro_evolution.multicellular').hidden, true);
  assert.equal(achievements.getDefinition('infinite_gugudan.combo_20').target, 20);
  assert.equal(achievements.getGameProgress('cube3d').total, 6);
});

test('achievement state normalization ignores unknown ids and preserves known progress and stats', () => {
  const state = achievements.normalizeAchievementState({
    unlocked: {
      'cube3d.first_blueprint': { unlockedAt: 1234 },
      'unknown.badge': { unlockedAt: 9 }
    },
    progress: {
      'cube3d.net_master': 7,
      'unknown.progress': 99
    },
    playedGames: { cube3d: 4567 },
    gameStats: {
      cube3d: { results:2, stagesCleared:3, uniqueMilestones:{ 'landmark:taj':true } }
    }
  });

  assert.equal(state.unlocked['cube3d.first_blueprint'].unlockedAt, 1234);
  assert.equal(state.unlocked['unknown.badge'], undefined);
  assert.equal(state.progress['cube3d.net_master'], 7);
  assert.equal(state.progress['unknown.progress'], undefined);
  assert.equal(state.playedGames.cube3d, 4567);
  assert.equal(state.gameStats.cube3d.results, 2);
  assert.equal(state.gameStats.cube3d.stagesCleared, 3);
  assert.equal(state.gameStats.cube3d.uniqueMilestones['landmark:taj'], true);
});

test('opening a game records analytics but never counts as a result', () => withMemory(() => {
  achievements.registerDefinitions({
    id:'low_blind_elephant.test_session',
    gameId:'low_blind_elephant',
    title:'테스트 한 판',
    enabled:true,
    trigger:'metric',
    metric:'sessionsCompleted',
    target:1
  });
  achievements.recordPlayedGame('low_blind_elephant', 12345);
  const state = achievements.loadAchievementState();
  assert.equal(Boolean(state.unlocked['low_blind_elephant.test_session']), false);
  assert.equal(state.playedGames.low_blind_elephant, 12345);
  assert.equal(state.gameStats.low_blind_elephant, undefined);
  assert.equal(Boolean(state.unlocked['kidscade.first_result']), false);
}));

test('match game-over records the match but requires an actual win for win achievements', () => withMemory(() => {
  achievements.registerDefinitions({
    id:'low_pong_battle.test_first_win',
    gameId:'low_pong_battle',
    title:'테스트 첫 승리',
    enabled:true,
    trigger:'metric',
    metric:'wins',
    target:1
  });

  achievements.handleGameEvent({event:'game-over',gameId:'low_pong_battle',score:3});
  let stats = achievements.getGameStats('low_pong_battle');
  assert.equal(stats.matchesCompleted, 1);
  assert.equal(stats.wins, 0);
  assert.equal(Boolean(achievements.loadAchievementState().unlocked['low_pong_battle.test_first_win']), false);

  achievements.handleGameEvent({event:'game-over',gameId:'low_pong_battle',won:true});
  stats = achievements.getGameStats('low_pong_battle');
  assert.equal(stats.matchesCompleted, 2);
  assert.equal(stats.wins, 1);
  assert.equal(Boolean(achievements.loadAchievementState().unlocked['low_pong_battle.test_first_win']), true);
}));

test('stage game-over is ignored unless legacy code reports explicit success or failure', () => withMemory(() => {
  achievements.registerDefinitions({
    id:'low_pattern_lock.test_clear',
    gameId:'low_pattern_lock',
    title:'테스트 클리어',
    enabled:true,
    trigger:'metric',
    metric:'stagesCleared',
    target:1
  });

  achievements.handleGameEvent({event:'game-over',gameId:'low_pattern_lock'});
  assert.equal(achievements.getGameStats('low_pattern_lock').results, 0);
  assert.equal(Boolean(achievements.loadAchievementState().unlocked['low_pattern_lock.test_clear']), false);

  achievements.handleGameEvent({event:'game-over',gameId:'low_pattern_lock',completed:true});
  assert.equal(achievements.getGameStats('low_pattern_lock').stagesCleared, 1);
  assert.equal(Boolean(achievements.loadAchievementState().unlocked['low_pattern_lock.test_clear']), true);
}));

test('run game-over is a valid run end even when the player eventually crashes or loses', () => withMemory(() => {
  achievements.registerDefinitions({
    id:'jineung_bird.test_run',
    gameId:'jineung_bird',
    title:'테스트 런',
    enabled:true,
    trigger:'metric',
    metric:'runs',
    target:1
  });
  achievements.handleGameEvent({event:'game-over',gameId:'jineung_bird'});
  const stats = achievements.getGameStats('jineung_bird');
  assert.equal(stats.runs, 1);
  assert.equal(stats.results, 1);
  assert.equal(Boolean(achievements.loadAchievementState().unlocked['jineung_bird.test_run']), true);
}));

test('structured result events keep completed, failed and abandoned meanings separate', () => withMemory(() => {
  achievements.registerDefinitions({
    id:'structured_match.test_win',
    gameId:'structured_match',
    title:'구조화 승리',
    enabled:true,
    trigger:'metric',
    metric:'wins',
    target:1
  });

  achievements.handleGameEvent({
    event:'result',
    gameId:'structured_match',
    scope:'match',
    status:'completed',
    outcome:'loss'
  });
  let stats = achievements.getGameStats('structured_match');
  assert.equal(stats.losses, 1);
  assert.equal(stats.wins, 0);

  achievements.handleGameEvent({
    event:'result',
    gameId:'structured_match',
    scope:'match',
    status:'abandoned',
    outcome:null
  });
  stats = achievements.getGameStats('structured_match');
  assert.equal(stats.abandoned, 1);
  assert.equal(stats.results, 1);

  achievements.handleGameEvent({
    event:'result',
    gameId:'structured_match',
    scope:'match',
    status:'completed',
    outcome:'win'
  });
  stats = achievements.getGameStats('structured_match');
  assert.equal(stats.wins, 1);
  assert.equal(Boolean(achievements.loadAchievementState().unlocked['structured_match.test_win']), true);
}));

test('sandbox and progression achievements advance from distinct milestones, not game-over', () => withMemory(() => {
  achievements.registerDefinitions({
    id:'high_little_world.test_discoveries',
    gameId:'high_little_world',
    title:'발견 둘',
    enabled:true,
    trigger:'metric',
    metric:'uniqueMilestones',
    target:2
  });

  achievements.handleGameEvent({event:'game-over',gameId:'high_little_world'});
  assert.equal(achievements.getGameStats('high_little_world').results, 0);

  achievements.handleGameEvent({event:'milestone',gameId:'high_little_world',name:'ecosystem_stable',value:'forest'});
  achievements.handleGameEvent({event:'milestone',gameId:'high_little_world',name:'ecosystem_stable',value:'forest'});
  assert.equal(Object.keys(achievements.getGameStats('high_little_world').uniqueMilestones).length, 1);
  assert.equal(Boolean(achievements.loadAchievementState().unlocked['high_little_world.test_discoveries']), false);

  achievements.handleGameEvent({event:'milestone',gameId:'high_little_world',name:'predator_chain',value:'complete'});
  assert.equal(Object.keys(achievements.getGameStats('high_little_world').uniqueMilestones).length, 2);
  assert.equal(Boolean(achievements.loadAchievementState().unlocked['high_little_world.test_discoveries']), true);
}));

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

test('new result events still satisfy compatible legacy game-over mastery rules', () => withMemory(() => {
  achievements.registerDefinitions({
    id:'rule_game.combo',
    gameId:'rule_game',
    title:'콤보',
    enabled:true,
    rule:{event:'game-over',field:'maxCombo',op:'gte',value:10}
  });
  achievements.handleGameEvent({
    event:'result',
    gameId:'rule_game',
    scope:'run',
    status:'completed',
    maxCombo:9
  });
  assert.equal(Boolean(achievements.loadAchievementState().unlocked['rule_game.combo']), false);
  achievements.handleGameEvent({
    event:'result',
    gameId:'rule_game',
    scope:'run',
    status:'completed',
    maxCombo:10
  });
  assert.equal(Boolean(achievements.loadAchievementState().unlocked['rule_game.combo']), true);
}));
