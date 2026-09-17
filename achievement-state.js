((factory) => {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.KidscadeAchievements = Object.freeze(api);
})(() => {
  'use strict';

  const CLAIMED_KEY = 'kidscade_claimed_ranks';
  const HIGH_RANK_MARKERS = Object.freeze([
    '플래티넘', '다이아몬드', '마스터', '그랜드마스터', '챌린저',
    '세종대왕', '강철 위장', '조선시대', '대한제국', '대한민국', '역사왕'
  ]);

  function storageApi() {
    return typeof window !== 'undefined' ? window.KidscadeStorage : null;
  }

  function browserStorage() {
    try {
      return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch (_) {
      return null;
    }
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
    try {
      return normalizeClaimed(JSON.parse(storage.getItem(CLAIMED_KEY) || '{}'));
    } catch (_) {
      return {};
    }
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
    } catch (_) {
      return 0;
    }
  }

  function normalizeRankValue(gameId, rawRank) {
    if (!rawRank) return '언랭크';
    if (String(gameId || '') === 'high_history_match') {
      return getCustomHistoryRank(getHistoryMaxScore(rawRank));
    }
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
      return `⏱️ 최고 ${minutes}:${seconds}`;
    }
    return `🏆 최고 ${value.toLocaleString()}점`;
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
      gameId,
      rank,
      score,
      hasRank: rank !== '언랭크',
      highRank: isHighRank(rank),
      scoreText: formatScore(score, meta.isTime === true || meta.isTime === 'true'),
      rewardClaimed: isRewardClaimed(gameId)
    };
  }

  return Object.freeze({
    claimedKey: CLAIMED_KEY,
    highRankMarkers: HIGH_RANK_MARKERS,
    normalizeClaimed,
    loadClaimedRanks,
    saveClaimedRanks,
    isRewardClaimed,
    markRewardClaimed,
    getCustomHistoryRank,
    getHistoryMaxScore,
    normalizeRankValue,
    normalizeScoreValue,
    isHighRank,
    formatScore,
    inspect
  });
});
