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
        if (!recent.has(String(game.id))) score += 4;
        else score -= 5;
        if (Number(game.sessionMinutes || 0) <= 10) score += 1;
        score += (dailyHash(game.id, dateKey) % 1000) / 1000;
        return { game, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || MAX_RAIL_GAMES)
      .map(entry => entry.game);
  }

  function deterministicGames(gameList, predicate, age, limit = MAX_RAIL_GAMES, dateKey = kstDateKey()) {
    return gameList
      .filter(game => supportsAge(game, age) && predicate(game))
      .sort((a, b) => dailyHash(a.id, dateKey) - dailyHash(b.id, dateKey))
      .slice(0, limit);
  }

  function railDefinitions(gameList, options = {}) {
    const age = options.age || 'high';
    const dateKey = options.dateKey || kstDateKey();
    const definitions = [];

    const recent = Array.isArray(options.recentGames) ? options.recentGames : [];
    const popular = Array.isArray(options.popularGames) ? options.popularGames : [];
    const recommended = Array.isArray(options.recommendedGames)
      ? options.recommendedGames
      : recommendGames(gameList, {
          age,
          recentIds: options.recentIds || [],
          favoriteIds: options.favoriteIds || [],
          dateKey
        });

    if (recent.length) definitions.push({
      key: 'recent',
      title: '🕒 이어서 플레이',
      note: '최근에 하던 게임으로 바로 돌아가요.',
      games: recent.slice(0, MAX_RAIL_GAMES)
    });

    if (popular.length) definitions.push({
      key: 'popular',
      title: '🔥 지금 많이 하는 게임',
      note: '이번 주 KIDSCADE에서 자주 플레이한 게임이에요.',
      games: popular.slice(0, MAX_RAIL_GAMES),
      showPlayCount: true
    });

    if (recommended.length) definitions.push({
      key: 'recommended',
      title: '✨ 오늘 뭐 하지?',
      note: '최근 취향과 오늘의 추천을 섞어 골랐어요.',
      games: recommended
    });

    const quick = deterministicGames(gameList, game => Number(game.sessionMinutes || 99) <= 5, age, MAX_RAIL_GAMES, dateKey);
    if (quick.length >= 3) definitions.push({
      key: 'quick',
      title: age === 'toddler' ? '⚡ 짧게 놀아요' : '⚡ 5분이면 한 판',
      note: '짧은 시간에도 부담 없이 시작할 수 있어요.',
      games: quick
    });

    const together = deterministicGames(
      gameList,
      game => (game.players || []).some(mode => mode !== 'solo'),
      age,
      MAX_RAIL_GAMES,
      dateKey
    );
    if (together.length >= 3) definitions.push({
      key: 'together',
      title: '👥 친구랑 같이 해요',
      note: '2인·여럿이·온라인으로 함께할 수 있어요.',
      games: together
    });

    const thinking = deterministicGames(
      gameList,
      game => game.subject === 'thinking' || ['puzzle', 'strategy'].includes(game.genre),
      age,
      MAX_RAIL_GAMES,
      dateKey
    );
    if (thinking.length >= 4) definitions.push({
      key: 'thinking',
      title: age === 'toddler' ? '🧩 찾아보고 맞춰요' : '🧠 머리 쓰는 게임',
      note: '퍼즐과 전략으로 생각하는 재미를 느껴봐요.',
      games: thinking
    });

    if (age === 'low' || age === 'high') {
      const career = gameList
        .filter(game => game.age === 'job' && !game.disabled && game.qualityStatus !== 'rework')
        .sort((a, b) => dailyHash(a.id, dateKey) - dailyHash(b.id, dateKey))
        .slice(0, MAX_RAIL_GAMES);
      if (career.length) definitions.push({
        key: 'career',
        title: '🧑‍🔬 직업체험관',
        note: '가게·현장·전문 직업을 게임으로 체험해요.',
        games: career
      });
    }

    if (age === 'job') {
      const deep = deterministicGames(gameList, game => game.age === 'job', 'job', MAX_RAIL_GAMES, dateKey);
      if (deep.length) definitions.push({
        key: 'career-all',
        title: '💼 직업을 골라 체험해요',
        note: '직업체험 게임을 한곳에서 둘러볼 수 있어요.',
        games: deep
      });
    }

    return definitions.slice(0, age === 'toddler' ? 5 : 7);
  }

  function heroGame(gameList, age, options = {}) {
    const dateKey = options.dateKey || kstDateKey();
    const recent = new Set(cleanIds(options.recentIds));
    const eligible = gameList.filter(game => supportsAge(game, age));
    const featured = eligible.filter(game => game.qualityStatus === 'featured');
    const pool = featured.length ? featured : eligible;
    if (!pool.length) return null;

    return [...pool].sort((a, b) => {
      const ar = recent.has(String(a.id)) ? 1 : 0;
      const br = recent.has(String(b.id)) ? 1 : 0;
      if (ar !== br) return ar - br;
      return dailyHash(a.id, dateKey) - dailyHash(b.id, dateKey);
    })[0] || null;
  }

  function metaText(game) {
    const genre = GENRE_LABELS[game.genre] || '';
    const session = Number(game.sessionMinutes || 0) > 0 ? `${game.sessionMinutes}분` : '';
    const people = (game.players || []).includes('online') ? '온라인' :
      (game.players || []).includes('localMulti') ? '여럿이' :
      (game.players || []).includes('local2') ? '2인' :
      (game.players || []).includes('classroom') ? '교실' : '혼자';
    return [genre, session, people].filter(Boolean).join(' · ');
  }

  function playCount(gameId) {
    const value = root?.KidscadeServerStats?.current?.games?.[gameId];
    return Number(value?.weeklyPlays || 0);
  }

  function launch(gameId) {
    return root?.KidscadePlay?.open?.(gameId);
  }

  function toggleFavorite(gameId) {
    const result = root?.KidscadeDashboard?.toggleFavorite?.(gameId);
    scheduleRender();
    return result;
  }

  function isFavorite(gameId) {
    return root?.KidscadeDashboard?.isFavorite?.(gameId) === true ||
      favoriteIds().includes(String(gameId || ''));
  }

  function ensureStylesheet() {
    if (!root?.document || root.document.querySelector('link[data-kc-home-v2-style]')) return;
    const link = root.document.createElement('link');
    link.rel = 'stylesheet';
    link.dataset.kcHomeV2Style = '1';
    const version = root.KidscadeBoot?.version || 'dev';
    link.href = `home-v2.css?v=${encodeURIComponent(version)}`;
    root.document.head.appendChild(link);
  }

  function ensureShell() {
    if (!root?.document) return null;
    let shell = root.document.getElementById(HOME_ID);
    if (shell) return shell;
    const arcade = root.document.querySelector('.kc-arcade');
    const discovery = root.document.querySelector('.kc-discovery');
    if (!arcade || !discovery) return null;

    shell = root.document.createElement('section');
    shell.id = HOME_ID;
    shell.className = 'kc-home-v2';
    shell.setAttribute('aria-label', 'KIDSCADE 추천 홈');
    arcade.insertBefore(shell, discovery);

    let backbar = root.document.getElementById(BACKBAR_ID);
    if (!backbar) {
      backbar = root.document.createElement('div');
      backbar.id = BACKBAR_ID;
      backbar.className = 'kc-home-backbar';
      backbar.innerHTML = `
        <button type="button" class="kc-home-back">← 추천 홈</button>
        <div class="kc-home-back-copy">
          <strong class="kc-home-back-title">모든 게임</strong>
          <span class="kc-home-back-note">검색과 태그로 원하는 게임을 찾아보세요.</span>
        </div>
      `;
      arcade.insertBefore(backbar, discovery);
      backbar.querySelector('.kc-home-back')?.addEventListener('click', () => showHome());
    }

    root.document.body.classList.add('kc-home-v2-ready');
    return shell;
  }

  function heroMarkup(game, age) {
    if (!game) return '';
    const cover = game.cover || 'kidscade placeholder.png';
    const favorite = isFavorite(game.id);
    const subject = SUBJECT_LABELS[game.subject] || AGE_LABELS[age] || '추천';
    return `
      <article class="kc-home-hero" data-game-id="${escapeAttr(game.id)}">
        <img class="kc-home-hero-art" src="${escapeAttr(cover)}" alt="" decoding="async">
        <div class="kc-home-hero-shade"></div>
        <div class="kc-home-hero-copy">
          <div class="kc-home-hero-kicker">KIDSCADE PICK · ${escapeHtml(subject)}</div>
          <h1>${escapeHtml(game.title)}</h1>
          <p>${escapeHtml(game.description || '오늘의 추천 게임을 바로 시작해 보세요.')}</p>
          <div class="kc-home-hero-meta">${escapeHtml(metaText(game))}</div>
          <div class="kc-home-hero-actions">
            <button type="button" class="kc-home-play" data-home-play="${escapeAttr(game.id)}">▶ 바로 시작</button>
            <button type="button" class="kc-home-fav${favorite ? ' active' : ''}" data-home-fav="${escapeAttr(game.id)}" aria-pressed="${favorite ? 'true' : 'false'}">${favorite ? '★ 찜했어요' : '☆ 찜하기'}</button>
          </div>
        </div>
      </article>
    `;
  }

  function railCardMarkup(game, rail) {
    const cover = game.cover || 'kidscade placeholder.png';
    const count = rail.showPlayCount ? playCount(game.id) : 0;
    const countMarkup = count > 0 ? `<span class="kc-home-card-count">🔥 ${count.toLocaleString('ko-KR')}회</span>` : '';
    return `
      <button type="button" class="kc-home-card" data-home-play="${escapeAttr(game.id)}" data-home-card tabindex="-1">
        <span class="kc-home-card-art">
          <img src="${escapeAttr(cover)}" alt="" loading="lazy" decoding="async">
          ${countMarkup}
        </span>
        <span class="kc-home-card-title">${escapeHtml(game.title)}</span>
        <span class="kc-home-card-meta">${escapeHtml(metaText(game))}</span>
      </button>
    `;
  }

  function railMarkup(rail, index) {
    return `
      <section class="kc-home-rail" data-home-rail="${escapeAttr(rail.key)}" aria-labelledby="kc-home-rail-title-${index}">
        <div class="kc-home-rail-head">
          <div>
            <h2 id="kc-home-rail-title-${index}">${escapeHtml(rail.title)}</h2>
            <p>${escapeHtml(rail.note || '')}</p>
          </div>
          <div class="kc-home-rail-arrows" aria-label="${escapeAttr(rail.title)} 이동">
            <button type="button" data-rail-prev aria-label="이전 게임">‹</button>
            <button type="button" data-rail-next aria-label="다음 게임">›</button>
          </div>
        </div>
        <div class="kc-home-rail-track" data-rail-track>
          ${rail.games.map(game => railCardMarkup(game, rail)).join('')}
        </div>
      </section>
    `;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function render() {
    renderQueued = false;
    const shell = ensureShell();
    if (!shell) return false;
    const age = currentAge();
    const list = games();
    if (!list.length) return false;

    const recents = recentGames(age);
    const recentIdList = recentIds();
    const favoriteIdList = favoriteIds();
    const popular = rankPopular(list, root?.KidscadeServerStats?.current, age);
    const recommended = recommendGames(list, {
      age,
      recentIds: recentIdList,
      favoriteIds: favoriteIdList
    });
    const hero = heroGame(list, age, { recentIds: recentIdList });
    const rails = railDefinitions(list, {
      age,
      recentGames: recents,
      popularGames: popular,
      recommendedGames: recommended,
      recentIds: recentIdList,
      favoriteIds: favoriteIdList
    });

    shell.innerHTML = `
      ${heroMarkup(hero, age)}
      <div class="kc-home-rail-stack">
        ${rails.map(railMarkup).join('')}
      </div>
      <div class="kc-home-library-cta">
        <div>
          <strong>🎮 모든 게임 둘러보기</strong>
          <span>${escapeHtml(AGE_LABELS[age] || '선택한 연령')} 게임을 교과·장르·검색으로 찾아볼 수 있어요.</span>
        </div>
        <button type="button" class="kc-home-library-open">모든 게임 보기 ›</button>
      </div>
    `;

    wireShell(shell);
    prepareKeyboardNavigation(shell);
    root.document.body.classList.add('kc-home-v2-ready');
    root.document.body.dataset.kcHomeMode = 'home';
    updateBackbar();
    return true;
  }

  function scheduleRender() {
    if (!root?.document || renderQueued) return;
    renderQueued = true;
    const schedule = root.requestAnimationFrame || (callback => setTimeout(callback, 16));
    schedule(() => render());
  }

  function wireShell(shell) {
    if (shell.dataset.kcHomeBound === '1') return;
    shell.dataset.kcHomeBound = '1';
    shell.addEventListener('click', event => {
      const play = event.target.closest('[data-home-play]');
      if (play) {
        event.preventDefault();
        launch(play.dataset.homePlay);
        return;
      }
      const favorite = event.target.closest('[data-home-fav]');
      if (favorite) {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(favorite.dataset.homeFav);
        return;
      }
      const prev = event.target.closest('[data-rail-prev]');
      const next = event.target.closest('[data-rail-next]');
      if (prev || next) {
        const rail = event.target.closest('.kc-home-rail');
        scrollRail(rail, next ? 1 : -1);
        return;
      }
      if (event.target.closest('.kc-home-library-open')) {
        showLibrary();
      }
    });

    shell.addEventListener('keydown', event => {
      const card = event.target.closest('[data-home-card]');
      if (!card) return;
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      moveCardFocus(card, event.key);
    });
  }

  function prepareKeyboardNavigation(shell) {
    shell.querySelectorAll('.kc-home-rail').forEach(rail => {
      const cards = rail.querySelectorAll('[data-home-card]');
      cards.forEach((card, index) => { card.tabIndex = index === 0 ? 0 : -1; });
    });
  }

  function moveCardFocus(card, key) {
    const rail = card.closest('.kc-home-rail');
    if (!rail) return;
    const rails = Array.from(root.document.querySelectorAll('.kc-home-rail'));
    const cards = Array.from(rail.querySelectorAll('[data-home-card]'));
    const cardIndex = cards.indexOf(card);
    const railIndex = rails.indexOf(rail);
    let target = null;

    if (key === 'ArrowLeft') target = cards[Math.max(0, cardIndex - 1)];
    if (key === 'ArrowRight') target = cards[Math.min(cards.length - 1, cardIndex + 1)];
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      const nextRail = rails[railIndex + (key === 'ArrowDown' ? 1 : -1)];
      const nextCards = nextRail ? Array.from(nextRail.querySelectorAll('[data-home-card]')) : [];
      target = nextCards[Math.min(cardIndex, Math.max(0, nextCards.length - 1))] || null;
    }

    if (!target || target === card) return;
    card.tabIndex = -1;
    target.tabIndex = 0;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  function scrollRail(rail, direction) {
    const track = rail?.querySelector('[data-rail-track]');
    if (!track) return;
    track.scrollBy({ left: direction * Math.max(260, track.clientWidth * 0.82), behavior: 'smooth' });
  }

  function showLibrary() {
    if (!root?.document) return;
    root.document.body.dataset.kcHomeMode = 'library';
    updateBackbar();
    root.document.querySelector('.kc-library-head')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showHome() {
    if