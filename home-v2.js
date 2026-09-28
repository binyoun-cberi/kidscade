((factory) => {
  const root = typeof window !== 'undefined' ? window : null;
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    root.KidscadeHomeV2 = Object.freeze(api);
    api.mount();
  }
})(root => {
  'use strict';

  const HOME_ID = 'kc-home-v2';
  const BACKBAR_ID = 'kc-home-backbar';
  const MAX_RAIL_GAMES = 12;
  const AGE_LABELS = Object.freeze({
    toddler: '유아',
    low: '1~3학년',
    high: '4~6학년',
    job: '직업체험'
  });
  const SUBJECT_LABELS = Object.freeze({
    math: '수학',
    korean: '국어',
    language: '외국어·한자',
    social: '사회',
    science: '과학·환경',
    arts: '예술',
    career: '진로',
    thinking: '사고력'
  });
  const GENRE_LABELS = Object.freeze({
    action: '액션',
    puzzle: '퍼즐',
    strategy: '전략',
    simulation: '시뮬레이션',
    management: '경영',
    quiz: '퀴즈',
    rhythm: '리듬',
    sports: '스포츠',
    sandbox: '샌드박스',
    rpg: 'RPG'
  });

  let mounted = false;
  let renderQueued = false;
  let bodyObserver = null;
  let searchBound = false;

  const cleanIds = value => Array.isArray(value)
    ? value.map(item => String(item || '')).filter(Boolean)
    : [];

  function currentAge() {
    if (!root?.document) return '';
    return root.document.body.dataset.kidscadeAge ||
      root.localStorage?.getItem?.('kidscade_age') ||
      'high';
  }

  function supportsAge(game, age) {
    if (!game || game.disabled) return false;
    if (!age || age === 'all') return true;
    const ages = Array.isArray(game.ages) && game.ages.length ? game.ages : [game.age];
    return ages.includes(age);
  }

  function dailyHash(value, dateKey = '') {
    let h = 2166136261;
    const input = `${dateKey}|${String(value || '')}`;
    for (const ch of input) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function kstDateKey(input = new Date()) {
    const kst = new Date(input.getTime() + 9 * 60 * 60 * 1000);
    return [
      kst.getUTCFullYear(),
      String(kst.getUTCMonth() + 1).padStart(2, '0'),
      String(kst.getUTCDate()).padStart(2, '0')
    ].join('-');
  }

  function games() {
    const list = root?.KidscadeGames?.all?.() || root?.KidscadeCatalog?.games || [];
    return Array.isArray(list) ? list.filter(game => game && !game.disabled && game.qualityStatus !== 'rework') : [];
  }

  function gameById(id) {
    const gameId = String(id || '');
    if (!gameId) return null;
    return root?.KidscadeGames?.get?.(gameId) ||
      games().find(game => String(game.id) === gameId) ||
      null;
  }

  function idsFromDashboard(name, storageKey) {
    try {
      const method = root?.KidscadeDashboard?.[name];
      const result = typeof method === 'function' ? method() : null;
      if (Array.isArray(result)) return cleanIds(result);
      return cleanIds(JSON.parse(root?.localStorage?.getItem?.(storageKey) || '[]'));
    } catch (_) {
      return [];
    }
  }

  function recentIds() {
    return idsFromDashboard('recents', 'kidscade_recents');
  }

  function favoriteIds() {
    return idsFromDashboard('favorites', 'kidscade_favs');
  }

  function recentGames(age) {
    return recentIds().map(gameById).filter(game => game && supportsAge(game, age));
  }

  function rankPopular(gameList, stats, age, limit = MAX_RAIL_GAMES) {
    const byId = stats?.games || {};
    return gameList
      .filter(game => supportsAge(game, age))
      .map(game => ({
        game,
        weekly: Number(byId?.[game.id]?.weeklyPlays || 0),
        total: Number(byId?.[game.id]?.totalPlays || 0)
      }))
      .filter(entry => entry.weekly > 0 || entry.total > 0)
      .sort((a, b) => b.weekly - a.weekly || b.total - a.total || String(a.game.title).localeCompare(String(b.game.title), 'ko'))
      .slice(0, limit)
      .map(entry => entry.game);
  }

  function affinity(gamesById, ids, key) {
    const counts = new Map();
    ids.forEach(id => {
      const game = gamesById.get(id);
      const value = game?.[key];
      if (!value) return;
      counts.set(value, (counts.get(value) || 0) + 1);
    });
    return counts;
  }

  function recommendGames(gameList, options = {}) {
    const age = options.age || 'high';
    const recent = new Set(cleanIds(options.recentIds));
    const favorites = new Set(cleanIds(options.favoriteIds));
    const dateKey = options.dateKey || kstDateKey();
    const eligible = gameList.filter(game => supportsAge(game, age));
    const map = new Map(gameList.map(game => [String(game.id), game]));
    const subjectAffinity = affinity(map, [...recent, ...favorites], 'subject');
    const genreAffinity = affinity(map, [...recent, ...favorites], 'genre');

    return eligible
      .map(game => {
        let score = 0;
        if (game.qualityStatus === 'featured') score += 12;
        score += (subjectAffinity.get(game.subject) || 0) * 2.4;
        score += (genreAffinity.get(game.genre) || 0) * 2.8;
        if (favorites.has(String(game.id))) score += 2;
        if (!