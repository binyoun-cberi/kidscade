((factory) => {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.KidscadeAchievements = Object.freeze(api);
})(() => {
  'use strict';

  const CLAIMED_KEY = 'kidscade_claimed_ranks';
  const PROGRESS_KEY = 'kidscade_achievements_v1';
  const PROGRESS_VERSION = 3;
  const HIGH_RANK_MARKERS = Object.freeze([
    '플래티넘', '다이아몬드', '마스터', '그랜드마스터', '챌린저',
    '세종대왕', '강철 위장', '조선시대', '대한제국', '대한민국', '역사왕'
  ]);

  const BASE_DEFINITIONS = [
    { id:'kidscade.first_result', gameId:'kidscade', icon:'🏁', type:'normal', title:'첫 기록', description:'게임 하나에서 실제 플레이 결과나 주요 목표를 남겨 보세요.' },
    { id:'kidscade.explorer_5', gameId:'kidscade', icon:'🧭', type:'challenge', target:5, title:'게임 탐험가', description:'서로 다른 게임 5개에서 실제 플레이 기록을 남겨 보세요.' },
    { id:'kidscade.collector_25', gameId:'kidscade', icon:'🏆', type:'challenge', target:25, title:'업적 수집가', description:'업적 25개를 달성해 보세요.' },

    { id:'cube3d.first_blueprint', gameId:'cube3d', icon:'🏗️', type:'normal', title:'첫 설계 복원', description:'설계도 챌린지를 처음 성공하세요.' },
    { id:'cube3d.perfect_blueprint', gameId:'cube3d', icon:'💯', type:'secret', hidden:true, title:'오차 없는 설계', description:'설계도 챌린지를 100점으로 완성하세요.' },
    { id:'cube3d.first_net', gameId:'cube3d', icon:'📦', type:'normal', title:'접으면 딱!', description:'전개도 문제를 처음 해결하세요.' },
    { id:'cube3d.net_master', gameId:'cube3d', icon:'🧠', type:'challenge', target:10, title:'전개도 박사', description:'전개도 문제를 10번 해결하세요.' },
    { id:'cube3d.landmark_restorer', gameId:'cube3d', icon:'🗿', type:'challenge', title:'랜드마크 복원가', description:'생존 탐험에서 랜드마크 설계실을 복원하세요.' },
    { id:'cube3d.survival_complete', gameId:'cube3d', icon:'🌲', type:'challenge', title:'생존 건축가', description:'생존 원정의 모든 기본 목표를 완료하세요.' },

    { id:'high_micro_evolution.first_generation', gameId:'high_micro_evolution', icon:'🧬', type:'normal', title:'다음 세대', description:'처음으로 새로운 세대를 탄생시키세요.' },
    { id:'high_micro_evolution.generations_10', gameId:'high_micro_evolution', icon:'🔬', type:'challenge', target:10, title:'진화는 계속된다', description:'10번의 세대 교체를 경험하세요.' },
    { id:'high_micro_evolution.colony', gameId:'high_micro_evolution', icon:'🌐', type:'challenge', title:'혼자가 아니야', description:'처음으로 군체 단계에 진입하세요.' },
    { id:'high_micro_evolution.multicellular', gameId:'high_micro_evolution', icon:'🧩', type:'secret', hidden:true, title:'다세포의 탄생', description:'초기 다세포 생물 단계에 진입하세요.' },

    { id:'infinite_gugudan.first_win', gameId:'infinite_gugudan', icon:'⚡', type:'normal', title:'첫 에너지 승리', description:'CPU 대결에서 처음 승리하세요.' },
    { id:'infinite_gugudan.combo_10', gameId:'infinite_gugudan', icon:'🔥', type:'challenge', target:10, title:'10 콤보 각성', description:'한 경기에서 최대 10콤보를 달성하세요.' },
    { id:'infinite_gugudan.combo_20', gameId:'infinite_gugudan', icon:'🌟', type:'secret', hidden:true, target:20, title:'무한루 폭주', description:'한 경기에서 최대 20콤보를 달성하세요.' },
    { id:'infinite_gugudan.correct_25', gameId:'infinite_gugudan', icon:'🎯', type:'challenge', target:25, title:'계산 기관총', description:'한 경기에서 25문제 이상 정답을 맞히세요.' },
    { id:'infinite_gugudan.fraction_win', gameId:'infinite_gugudan', icon:'➗', type:'challenge', title:'분수의 고수', description:'분수 연산으로 CPU 대결에서 승리하세요.' },
  ].map(def => Object.freeze({ target:1, hidden:false, enabled:true, trigger:'', rule:null, ...def }));

  const definitionMap = new Map(BASE_DEFINITIONS.map(def => [def.id, def]));
  let browserEventsBound = false;

  function storageApi() {
    return typeof window !== 'undefined' ? window.KidscadeStorage : null;
  }

  function browserStorage() {
    try { return typeof localStorage !== 'undefined' ? localStorage : null; }
    catch (_) { return null; }
  }

  function cleanAchievementId(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '');
  }

  function normalizeClaimed(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
    const normalized = {};
    Object.entries(input).forEach(([id, value]) => {
      const key = String(id || '').trim();
      if (key && value) normalized[key] = true;
    });
    return normalized;
  }

  function loadClaimedRanks() {
    const shared = storageApi();
    if (shared?.getJson) return normalizeClaimed(shared.getJson('claimedRanks', {}));
    const storage = browserStorage();
    if (!storage) return {};
    try { return normalizeClaimed(JSON.parse(storage.getItem(CLAIMED_KEY) || '{}')); }
    catch (_) { return {}; }
  }

  function saveClaimedRanks(input) {
    const normalized = normalizeClaimed(input);
    const shared = storageApi();
    if (shared?.setJson) {
      shared.setJson('claimedRanks', normalized);
      return normalized;
    }
    const storage = browserStorage();
    if (storage) storage.setItem(CLAIMED_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function isRewardClaimed(gameId) {
    const id = String(gameId || '').trim();
    return Boolean(id && loadClaimedRanks()[id]);
  }

  function markRewardClaimed(gameId) {
    const id = String(gameId || '').trim();
    if (!id) return loadClaimedRanks();
    const claimed = loadClaimedRanks();
    claimed[id] = true;
    return saveClaimedRanks(claimed);
  }

  function defaultGameStats() {
    return {
      results:0,
      abandoned:0,
      matchesCompleted:0,
      wins:0,
      losses:0,
      draws:0,
      sessionsCompleted:0,
      runs:0,
      stagesCleared:0,
      shiftsCompleted:0,
      missionsCompleted:0,
      campaignsCompleted:0,
      creationsSaved:0,
      fails:0,
      milestonesReached:0,
      uniqueMilestones:{},
      lastAt:0
    };
  }

  function normalizeGameStatsEntry(input) {
    const raw = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    const stats = defaultGameStats();
    [
      'results','abandoned','matchesCompleted','wins','losses','draws','sessionsCompleted',
      'runs','stagesCleared','shiftsCompleted','missionsCompleted','campaignsCompleted',
      'creationsSaved','fails','milestonesReached'
    ].forEach(key => {
      stats[key] = Math.max(0, Math.floor(Number(raw[key]) || 0));
    });
    if (raw.uniqueMilestones && typeof raw.uniqueMilestones === 'object' && !Array.isArray(raw.uniqueMilestones)) {
      Object.entries(raw.uniqueMilestones).forEach(([key, value]) => {
        const id = String(key || '').trim();
        if (id && value) stats.uniqueMilestones[id] = true;
      });
    }
    stats.lastAt = Math.max(0, Number(raw.lastAt) || 0);
    return stats;
  }

  function defaultAchievementState() {
    return { version:PROGRESS_VERSION, unlocked:{}, progress:{}, playedGames:{}, gameStats:{} };
  }

  function normalizeAchievementState(input) {
    const raw = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    const state = defaultAchievementState();

    if (raw.unlocked && typeof raw.unlocked === 'object' && !Array.isArray(raw.unlocked)) {
      Object.entries(raw.unlocked).forEach(([rawId, value]) => {
        const id = cleanAchievementId(rawId);
        if (!id || !definitionMap.has(id) || !value) return;
        const at = Math.max(0, Number(value?.unlockedAt ?? value) || 0);
        state.unlocked[id] = { unlockedAt:at || Date.now() };
      });
    }

    if (raw.progress && typeof raw.progress === 'object' && !Array.isArray(raw.progress)) {
      Object.entries(raw.progress).forEach(([rawId, value]) => {
        const id = cleanAchievementId(rawId);
        const def = definitionMap.get(id);
        const numeric = Math.max(0, Number(value) || 0);
        if (def && numeric > 0) state.progress[id] = numeric;
      });
    }

    if (raw.playedGames && typeof raw.playedGames === 'object' && !Array.isArray(raw.playedGames)) {
      Object.entries(raw.playedGames).forEach(([rawId, value]) => {
        const id = String(rawId || '').trim();
        if (!id) return;
        const at = Math.max(0, Number(value) || 0);
        state.playedGames[id] = at || Date.now();
      });
    }

    if (raw.gameStats && typeof raw.gameStats === 'object' && !Array.isArray(raw.gameStats)) {
      Object.entries(raw.gameStats).forEach(([rawId, value]) => {
        const id = String(rawId || '').trim();
        if (!id) return;
        state.gameStats[id] = normalizeGameStatsEntry(value);
      });
    }

    Object.keys(state.unlocked).forEach(id => {
      const def = definitionMap.get(id);
      if (def && Number(def.target) > 1) {
        state.progress[id] = Math.max(Number(state.progress[id]) || 0, Number(def.target) || 1);
      }
    });
    return state;
  }

  function loadAchievementState() {
    const shared = storageApi();
    if (shared?.getJson) return normalizeAchievementState(shared.getJson('achievements', defaultAchievementState()));
    const storage = browserStorage();
    if (!storage) return defaultAchievementState();
    try { return normalizeAchievementState(JSON.parse(storage.getItem(PROGRESS_KEY) || 'null')); }
    catch (_) { return defaultAchievementState(); }
  }

  function saveAchievementState(input) {
    const state = normalizeAchievementState(input);
    const shared = storageApi();
    if (shared?.setJson) {
      shared.setJson('achievements', state);
      return state;
    }
    const storage = browserStorage();
    if (storage) {
      try { storage.setItem(PROGRESS_KEY, JSON.stringify(state)); } catch (_) {}
    }
    return state;
  }

  function getDefinition(id) {
    return definitionMap.get(cleanAchievementId(id)) || null;
  }

  function getDefinitions() {
    return Array.from(definitionMap.values()).filter(def => def.enabled !== false).map(def => ({ ...def }));
  }

  function getAllDefinitions() {
    return Array.from(definitionMap.values()).map(def => ({ ...def }));
  }

  function registerDefinitions(input) {
    const list = Array.isArray(input) ? input : [input];
    let added = 0;
    list.forEach(raw => {
      if (!raw || typeof raw !== 'object') return;
      const id = cleanAchievementId(raw.id);
      const gameId = String(raw.gameId || '').trim();
      const title = String(raw.title || '').trim();
      if (!id || !gameId || !title || definitionMap.has(id)) return;
      const target = Math.max(1, Number(raw.target) || 1);
      definitionMap.set(id, Object.freeze({
        id, gameId, title,
        description:String(raw.description || '').trim(),
        icon:String(raw.icon || '🏆'),
        type:['normal','challenge','secret'].includes(raw.type) ? raw.type : 'normal',
        hidden:Boolean(raw.hidden),
        enabled:raw.enabled !== false,
        trigger:String(raw.trigger || '').trim(),
        metric:String(raw.metric || '').trim(),
        rule:raw.rule && typeof raw.rule === 'object' ? { ...raw.rule } : null,
        target
      }));
      added += 1;
    });
    return added;
  }

  function unlockInState(state, id, unlockedIds, at = Date.now()) {
    const key = cleanAchievementId(id);
    const def = definitionMap.get(key);
    if (!def || def.enabled === false || state.unlocked[key]) return false;
    state.unlocked[key] = { unlockedAt:Math.max(1, Number(at) || Date.now()) };
    if (def.target > 1) state.progress[key] = Math.max(Number(state.progress[key]) || 0, def.target);
    if (!unlockedIds.includes(key)) unlockedIds.push(key);
    return true;
  }

  function setProgressInState(state, id, value, unlockedIds) {
    const key = cleanAchievementId(id);
    const def = definitionMap.get(key);
    if (!def || def.enabled === false) return false;
    const next = Math.max(Number(state.progress[key]) || 0, Math.max(0, Number(value) || 0));
    const before = Number(state.progress[key]) || 0;
    if (next > 0) state.progress[key] = next;
    if (next >= def.target) unlockInState(state, key, unlockedIds);
    return next !== before;
  }

  function statsHaveMeaning(stats) {
    if (!stats || typeof stats !== 'object') return false;
    return Number(stats.results) > 0 || Object.keys(stats.uniqueMilestones || {}).length > 0;
  }

  function syncMetaInState(state, unlockedIds) {
    const trackedGames = Object.values(state.gameStats || {}).filter(statsHaveMeaning).length;
    if (trackedGames > 0) unlockInState(state, 'kidscade.first_result', unlockedIds);
    setProgressInState(state, 'kidscade.explorer_5', trackedGames, unlockedIds);
    const collectorCount = Object.keys(state.unlocked).filter(id => id !== 'kidscade.collector_25').length;
    setProgressInState(state, 'kidscade.collector_25', collectorCount, unlockedIds);
  }

  function dispatchEventSafe(name, detail) {
    try {
      if (typeof document !== 'undefined' && typeof CustomEvent !== 'undefined') {
        document.dispatchEvent(new CustomEvent(name, { detail }));
      }
    } catch (_) {}
  }

  function commitAchievementState(state, unlockedIds, changed) {
    if (!changed && !unlockedIds.length) return normalizeAchievementState(state);
    const saved = saveAchievementState(state);
    unlockedIds.forEach(id => {
      const def = definitionMap.get(id);
      if (!def) return;
      dispatchEventSafe('kidscade:achievement-unlocked', {
        id,
        achievement:{ ...def },
        unlockedAt:saved.unlocked[id]?.unlockedAt || Date.now()
      });
    });
    dispatchEventSafe('kidscade:achievements-changed', {
      unlockedIds:[...unlockedIds],
      summary:getSummaryFromState(saved)
    });
    return saved;
  }

  function unlock(id, meta = {}) {
    const state = loadAchievementState();
    const unlockedIds = [];
    const changed = unlockInState(state, id, unlockedIds, meta.unlockedAt);
    syncMetaInState(state, unlockedIds);
    const saved = commitAchievementState(state, unlockedIds, changed || unlockedIds.length > 0);
    const key = cleanAchievementId(id);
    return { ok:Boolean(definitionMap.has(key)), unlocked:Boolean(saved.unlocked[key]), newlyUnlocked:unlockedIds.includes(key), state:saved };
  }

  function setProgress(id, value) {
    const state = loadAchievementState();
    const unlockedIds = [];
    const changed = setProgressInState(state, id, value, unlockedIds);
    syncMetaInState(state, unlockedIds);
    const saved = commitAchievementState(state, unlockedIds, changed || unlockedIds.length > 0);
    const key = cleanAchievementId(id);
    const def = definitionMap.get(key);
    return { ok:Boolean(def), value:Number(saved.progress[key]) || 0, target:Number(def?.target) || 1, unlocked:Boolean(saved.unlocked[key]), newlyUnlocked:unlockedIds.includes(key), state:saved };
  }

  function increment(id, amount = 1) {
    const key = cleanAchievementId(id);
    const state = loadAchievementState();
    const unlockedIds = [];
    const current = Number(state.progress[key]) || 0;
    const changed = setProgressInState(state, key, current + Math.max(0, Number(amount) || 0), unlockedIds);
    syncMetaInState(state, unlockedIds);
    const saved = commitAchievementState(state, unlockedIds, changed || unlockedIds.length > 0);
    const def = definitionMap.get(key);
    return { ok:Boolean(def), value:Number(saved.progress[key]) || 0, target:Number(def?.target) || 1, unlocked:Boolean(saved.unlocked[key]), newlyUnlocked:unlockedIds.includes(key), state:saved };
  }

  function recordPlayedGame(gameId, at = Date.now()) {
    const id = String(gameId || '').trim();
    if (!id || id === 'kidscade') return loadAchievementState();
    const state = loadAchievementState();
    if (state.playedGames[id]) return state;
    state.playedGames[id] = Math.max(1, Number(at) || Date.now());
    return commitAchievementState(state, [], true);
  }

  function profilesApi() {
    if (typeof window !== 'undefined' && window.KidscadeGameProfiles) return window.KidscadeGameProfiles;
    if (typeof require === 'function') {
      try { return require('./game-outcome-profiles.js'); } catch (_) {}
    }
    return null;
  }

  function metricValue(stats, metric) {
    const key = String(metric || '').trim();
    if (!stats || !key) return 0;
    if (key === 'uniqueMilestones') return Object.keys(stats.uniqueMilestones || {}).length;
    return Math.max(0, Number(stats[key]) || 0);
  }

  function syncMetricAchievementsInState(state, gameId, unlockedIds) {
    const id = String(gameId || '').trim();
    const stats = state.gameStats[id] || defaultGameStats();
    definitionMap.forEach(def => {
      if (def.enabled === false || def.gameId !== id || def.trigger !== 'metric' || !def.metric) return;
      setProgressInState(state, def.id, metricValue(stats, def.metric), unlockedIds);
    });
  }

  function ensureGameStats(state, gameId) {
    const id = String(gameId || '').trim();
    if (!id) return null;
    if (!state.gameStats[id]) state.gameStats[id] = defaultGameStats();
    return state.gameStats[id];
  }

  function normalizeOutcome(value) {
    const outcome = String(value || '').trim().toLowerCase();
    return ['win','loss','draw','clear','fail'].includes(outcome) ? outcome : '';
  }

  function normalizeResultStatus(value) {
    const status = String(value || 'completed').trim().toLowerCase();
    return ['completed','failed','abandoned'].includes(status) ? status : 'completed';
  }

  function recordResult(detail = {}) {
    const gameId = String(detail.gameId || '').trim();
    const scope = String(detail.scope || '').trim().toLowerCase();
    if (!gameId || !['match','session','run','stage','shift','mission','campaign','creation'].includes(scope) || gameId === 'kidscade') return loadAchievementState();
    const state = loadAchievementState();
    const stats = ensureGameStats(state, gameId);
    const unlockedIds = [];
    const at = Math.max(1, Number(detail.at || detail.completedAt) || Date.now());
    const status = normalizeResultStatus(detail.status);
    const outcome = normalizeOutcome(detail.outcome ?? detail.result);
    stats.lastAt = at;

    if (status === 'abandoned') {
      stats.abandoned += 1;
      return commitAchievementState(state, unlockedIds, true);
    }

    stats.results += 1;
    if (scope === 'match') {
      stats.matchesCompleted += 1;
      if (outcome === 'win') stats.wins += 1;
      else if (outcome === 'loss') stats.losses += 1;
      else if (outcome === 'draw') stats.draws += 1;
    } else if (scope === 'session') {
      if (status === 'completed') stats.sessionsCompleted += 1;
      else stats.fails += 1;
    } else if (scope === 'run') {
      stats.runs += 1;
      if (status === 'failed' || outcome === 'fail') stats.fails += 1;
    } else if (scope === 'stage') {
      if (status === 'completed' || outcome === 'clear' || outcome === 'win') stats.stagesCleared += 1;
      else stats.fails += 1;
    } else if (scope === 'shift') {
      if (status === 'completed') stats.shiftsCompleted += 1;
      else stats.fails += 1;
    } else if (scope === 'mission') {
      if (status === 'completed' || outcome === 'clear' || outcome === 'win') stats.missionsCompleted += 1;
      else stats.fails += 1;
    } else if (scope === 'campaign') {
      if (status === 'completed' || outcome === 'clear' || outcome === 'win') stats.campaignsCompleted += 1;
      else stats.fails += 1;
    } else if (scope === 'creation') {
      if (status === 'completed') stats.creationsSaved += 1;
      else stats.fails += 1;
    }

    syncMetricAchievementsInState(state, gameId, unlockedIds);
    syncMetaInState(state, unlockedIds);
    return commitAchievementState(state, unlockedIds, true);
  }

  function milestoneKey(detail = {}) {
    const name = String(detail.name || '').trim().toLowerCase();
    const discriminator = detail.uniqueKey ?? detail.id ?? detail.stage ?? detail.key ?? detail.level ?? detail.value ?? '';
    return [name, String(discriminator || '').trim()].filter(Boolean).join(':');
  }

  function recordMilestone(detail = {}) {
    const gameId = String(detail.gameId || '').trim();
    const name = String(detail.name || '').trim().toLowerCase();
    if (!gameId || !name || gameId === 'kidscade') return loadAchievementState();
    const state = loadAchievementState();
    const stats = ensureGameStats(state, gameId);
    const unlockedIds = [];
    const key = milestoneKey(detail);
    stats.lastAt = Math.max(1, Number(detail.at) || Date.now());
    stats.milestonesReached += 1;
    if (key) stats.uniqueMilestones[key] = true;

    if (name === 'stage_clear' || name === 'puzzle_clear') stats.stagesCleared += 1;
    else if (name === 'shift_complete') stats.shiftsCompleted += 1;
    else if (name === 'mission_complete') stats.missionsCompleted += 1;
    else if (name === 'campaign_complete') stats.campaignsCompleted += 1;
    else if (name === 'creation_saved' || name === 'creation_complete') stats.creationsSaved += 1;

    syncMetricAchievementsInState(state, gameId, unlockedIds);
    syncMetaInState(state, unlockedIds);
    return commitAchievementState(state, unlockedIds, true);
  }

  function inferLegacyOutcome(detail = {}) {
    const direct = normalizeOutcome(detail.outcome ?? detail.result);
    if (direct) return direct;
    if (detail.won === true || detail.win === true || detail.victory === true) return 'win';
    if (detail.lost === true || detail.loss === true || detail.defeat === true) return 'loss';
    if (detail.draw === true || detail.tied === true) return 'draw';
    if (detail.cleared === true || detail.passed === true || detail.success === true || detail.completed === true) return 'clear';
    if (detail.failed === true || detail.cleared === false || detail.passed === false || detail.success === false) return 'fail';
    return '';
  }

  function legacyGameOverResult(detail = {}) {
    const gameId = String(detail.gameId || '').trim();
    const profile = profilesApi()?.getProfile?.(gameId);
    if (!profile || profile.legacy === 'ignore') return null;
    if (detail.abandoned === true || detail.status === 'abandoned') {
      return { gameId, scope:profile.scope, status:'abandoned', outcome:null, at:detail.completedAt || Date.now() };
    }

    const outcome = inferLegacyOutcome(detail);
    if (profile.legacy === 'match-end') {
      return { gameId, scope:'match', status:'completed', outcome:outcome || null, at:detail.completedAt || Date.now() };
    }
    if (profile.legacy === 'session-end') {
      return { gameId, scope:'session', status:'completed', outcome:outcome || null, at:detail.completedAt || Date.now() };
    }
    if (profile.legacy === 'run-end') {
      return { gameId, scope:'run', status:'completed', outcome:outcome || null, at:detail.completedAt || Date.now() };
    }
    if (profile.legacy === 'explicit-success') {
      if (['win','clear'].includes(outcome)) {
        return { gameId, scope:profile.scope, status:'completed', outcome, at:detail.completedAt || Date.now() };
      }
      if (['loss','fail'].includes(outcome)) {
        return { gameId, scope:profile.scope, status:'failed', outcome, at:detail.completedAt || Date.now() };
      }
    }
    return null;
  }

  function recordCompletedGame(gameId, at = Date.now()) {
    return recordResult({ gameId, scope:'session', status:'completed', at });
  }

  function getSummaryFromState(input) {
    const state = normalizeAchievementState(input);
    const enabledIds = new Set(Array.from(definitionMap.values()).filter(def => def.enabled !== false).map(def => def.id));
    const total = enabledIds.size;
    const unlocked = Object.keys(state.unlocked).filter(id => enabledIds.has(id)).length;
    const trackedGames = Object.values(state.gameStats).filter(statsHaveMeaning).length;
    const totalResults = Object.values(state.gameStats).reduce((sum, stats) => sum + Math.max(0, Number(stats.results) || 0), 0);
    return {
      total,
      unlocked,
      percent:total ? Math.round(unlocked / total * 100) : 0,
      playedGames:Object.keys(state.playedGames).length,
      trackedGames,
      totalResults
    };
  }

  function getSummary() {
    return getSummaryFromState(loadAchievementState());
  }

  function getGameStats(gameId) {
    const id = String(gameId || '').trim();
    const state = loadAchievementState();
    return normalizeGameStatsEntry(state.gameStats[id]);
  }

  function getGameProgress(gameId) {
    const id = String(gameId || '').trim();
    const defs = Array.from(definitionMap.values()).filter(def => def.gameId === id && def.enabled !== false);
    const state = loadAchievementState();
    const items = defs.map(def => ({
      ...def,
      unlocked:Boolean(state.unlocked[def.id]),
      unlockedAt:Number(state.unlocked[def.id]?.unlockedAt) || 0,
      progress:Number(state.progress[def.id]) || (state.unlocked[def.id] ? def.target : 0)
    }));
    const unlocked = items.filter(item => item.unlocked).length;
    return { gameId:id, total:items.length, unlocked, percent:items.length ? Math.round(unlocked / items.length * 100) : 0, items };
  }

  function canGameReport(def, gameId) {
    const source = String(gameId || '').trim();
    return Boolean(def && def.enabled !== false && source && def.gameId === source);
  }

  function ruleMatches(rule, detail = {}) {
    if (!rule || typeof rule !== 'object') return false;
    const field = String(rule.field || '').trim();
    if (!field) return false;
    const actual = detail[field];
    const op = String(rule.op || 'eq');
    if (op === 'truthy') return Boolean(actual);
    if (op === 'falsy') return !actual;
    if (op === 'eq') return actual === rule.value;
    if (op === 'gte') return Number.isFinite(Number(actual)) && Number(actual) >= Number(rule.value);
    if (op === 'lte') return Number.isFinite(Number(actual)) && Number(actual) <= Number(rule.value);
    if (op === 'gt') return Number.isFinite(Number(actual)) && Number(actual) > Number(rule.value);
    if (op === 'lt') return Number.isFinite(Number(actual)) && Number(actual) < Number(rule.value);
    if (op === 'oneOf') return Array.isArray(rule.value) && rule.value.includes(actual);
    return false;
  }

  function applyEventRules(detail = {}) {
    const eventName = String(detail.event || '').trim();
    const gameId = String(detail.gameId || '').trim();
    if (!eventName || !gameId) return false;
    const state = loadAchievementState();
    const unlockedIds = [];
    let changed = false;
    definitionMap.forEach(def => {
      const rule = def.rule;
      if (def.enabled === false || def.gameId !== gameId || !rule || String(rule.event || '') !== eventName) return;
      if (ruleMatches(rule, detail) && unlockInState(state, def.id, unlockedIds)) changed = true;
    });
    if (!changed && !unlockedIds.length) return false;
    syncMetaInState(state, unlockedIds);
    commitAchievementState(state, unlockedIds, true);
    return true;
  }

  function handleGameEvent(detail = {}) {
    const eventName = String(detail.event || '').trim();
    const gameId = String(detail.gameId || '').trim();
    if ((eventName === 'ready' || eventName === 'start') && gameId) {
      recordPlayedGame(gameId);
      return true;
    }
    if (eventName === 'result' && gameId) {
      recordResult(detail);
      applyEventRules(detail);
      applyEventRules({ ...detail, event:'game-over' });
      return true;
    }
    if (eventName === 'milestone' && gameId) {
      recordMilestone(detail);
      applyEventRules(detail);
      return true;
    }
    if (eventName === 'game-over' && gameId) {
      const legacyResult = legacyGameOverResult(detail);
      if (legacyResult) recordResult(legacyResult);
      applyEventRules(detail);
      return Boolean(legacyResult);
    }
    if (eventName !== 'achievement') {
      applyEventRules(detail);
      return false;
    }

    const achievementId = cleanAchievementId(detail.achievementId);
    const def = definitionMap.get(achievementId);
    if (!canGameReport(def, gameId)) return false;

    const action = String(detail.action || 'unlock');
    if (action === 'progress') { setProgress(achievementId, detail.value); return true; }
    if (action === 'increment') { increment(achievementId, detail.amount); return true; }
    unlock(achievementId);
    return true;
  }

  function bindBrowserEvents() {
    if (browserEventsBound || typeof document === 'undefined') return false;
    browserEventsBound = true;
    document.addEventListener('kidscade:game-event', event => {
      try { handleGameEvent(event?.detail || {}); }
      catch (error) { console.warn('[KidscadeAchievements] game event ignored', error); }
    });
    return true;
  }

  function getCustomHistoryRank(score) {
    const value = Math.max(0, Number(score) || 0);
    if (value < 6) return '구석기';
    if (value < 12) return '신석기';
    if (value < 18) return '고조선';
    if (value < 24) return '삼국시대';
    if (value < 30) return '남북국시대';
    if (value < 36) return '고려시대';
    if (value < 42) return '조선시대';
    if (value < 50) return '대한제국';
    if (value < 60) return '대한민국';
    return '역사왕 👑';
  }

  function getHistoryMaxScore(rawValue) {
    if (!rawValue) return 0;
    try {
      const parsed = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
      if (!parsed || typeof parsed !== 'object') return 0;
      return Math.max(Number(parsed.figures) || 0, Number(parsed.events) || 0);
    } catch (_) { return 0; }
  }

  function normalizeRankValue(gameId, rawRank) {
    if (!rawRank) return '언랭크';
    if (String(gameId || '') === 'high_history_match') return getCustomHistoryRank(getHistoryMaxScore(rawRank));
    const value = String(rawRank).trim();
    return value && value !== '언랭크' ? value : '언랭크';
  }

  function normalizeScoreValue(gameId, rawScore) {
    if (!rawScore) return 0;
    if (String(gameId || '') === 'high_history_match') return getHistoryMaxScore(rawScore);
    const value = Number.parseInt(String(rawScore), 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function isHighRank(rank) {
    const value = String(rank || '');
    return HIGH_RANK_MARKERS.some(marker => value.includes(marker));
  }

  function formatScore(score, isTime = false) {
    const value = Math.max(0, Math.floor(Number(score) || 0));
    if (!value) return '';
    if (isTime) {
      const minutes = Math.floor(value / 60).toString().padStart(2, '0');
      const seconds = (value % 60).toString().padStart(2, '0');
      return '⏱️ 최고 ' + minutes + ':' + seconds;
    }
    return '🏆 최고 ' + value.toLocaleString() + '점';
  }

  function readRaw(key) {
    const storage = browserStorage();
    if (!storage || !key) return null;
    return storage.getItem(String(key));
  }

  function inspect(meta = {}, reader = readRaw) {
    const gameId = String(meta.gameId || meta.id || '').trim();
    const rankKey = String(meta.rankKey || '').trim();
    const scoreKey = String(meta.scoreKey || '').trim();
    const rawRank = rankKey ? reader(rankKey) : null;
    const rawScore = scoreKey ? reader(scoreKey) : null;
    const rank = normalizeRankValue(gameId, rawRank);
    const score = normalizeScoreValue(gameId, rawScore);
    return {
      gameId, rank, score,
      hasRank:rank !== '언랭크',
      highRank:isHighRank(rank),
      scoreText:formatScore(score, meta.isTime === true || meta.isTime === 'true'),
      rewardClaimed:isRewardClaimed(gameId)
    };
  }

  bindBrowserEvents();

  return Object.freeze({
    claimedKey:CLAIMED_KEY,
    progressKey:PROGRESS_KEY,
    progressVersion:PROGRESS_VERSION,
    highRankMarkers:HIGH_RANK_MARKERS,
    normalizeClaimed,
    loadClaimedRanks,
    saveClaimedRanks,
    isRewardClaimed,
    markRewardClaimed,
    defaultAchievementState,
    normalizeAchievementState,
    loadAchievementState,
    saveAchievementState,
    cleanAchievementId,
    getDefinition,
    getDefinitions,
    getAllDefinitions,
    registerDefinitions,
    unlock,
    setProgress,
    increment,
    recordPlayedGame,
    recordCompletedGame,
    recordResult,
    recordMilestone,
    legacyGameOverResult,
    getSummary,
    getGameStats,
    getGameProgress,
    ruleMatches,
    applyEventRules,
    handleGameEvent,
    bindBrowserEvents,
    getCustomHistoryRank,
    getHistoryMaxScore,
    normalizeRankValue,
    normalizeScoreValue,
    isHighRank,
    formatScore,
    inspect
  });
});
