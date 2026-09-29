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
  const LAYOUT_BUTTON_ID = 'btn-home-layout';
  const MAX_RAIL_GAMES = 12;
  const HOUR_MS = 60 * 60 * 1000;
  const DAY_MS = 24 * HOUR_MS;
  const KST_OFFSET_MS = 9 * HOUR_MS;
  const NEW_RELEASE_WINDOW_DAYS = 30;
  const HOME_LAYOUTS = Object.freeze({ recommend: 'recommend', classic: 'classic' });

  function normalizeLayout(value) {
    return value === HOME_LAYOUTS.classic ? HOME_LAYOUTS.classic : HOME_LAYOUTS.recommend;
  }
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
  const SUBJECT_RAILS = Object.freeze([
    { subject:'math', emoji:'➗', title:'수학으로 놀아요', note:'수와 연산, 도형을 게임으로 익혀요.' },
    { subject:'korean', emoji:'✍️', title:'국어로 놀아요', note:'말과 글을 재미있는 게임으로 익혀요.' },
    { subject:'language', emoji:'🌏', title:'외국어·한자', note:'영어와 여러 언어, 한자를 게임으로 만나요.' },
    { subject:'social', emoji:'🗺️', title:'사회·역사', note:'사람과 지역, 역사를 게임으로 탐험해요.' },
    { subject:'science', emoji:'🔬', title:'과학·환경', note:'관찰하고 실험하며 세상을 알아가요.' },
    { subject:'arts', emoji:'🎨', title:'예술·창작', note:'그리고 만들고 표현하는 게임을 모았어요.' },
    { subject:'thinking', emoji:'🧠', title:'사고력', note:'퍼즐과 전략으로 생각하는 힘을 길러요.' }
  ]);

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
  let heroRotationTimer = null;

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

  function kstHourSlot(input = new Date()) {
    return Math.floor((input.getTime() + KST_OFFSET_MS) / HOUR_MS);
  }

  function kstHourLabel(input = new Date()) {
    const kst = new Date(input.getTime() + KST_OFFSET_MS);
    return kst.getUTCHours();
  }

  function addedAtMs(game) {
    const value = Date.parse(String(game?.addedAt || ''));
    return Number.isFinite(value) ? value : 0;
  }

  function newReleaseGames(gameList, age, options = {}) {
    const nowMs = Number(options.nowMs ?? Date.now());
    const maxAgeDays = Math.max(1, Number(options.maxAgeDays || NEW_RELEASE_WINDOW_DAYS));
    const minMs = nowMs - maxAgeDays * DAY_MS;
    const dateKey = options.dateKey || kstDateKey(new Date(nowMs));
    return gameList
      .filter(game => {
        if (!supportsAge(game, age)) return false;
        const stamp = addedAtMs(game);
        return stamp > 0 && stamp <= nowMs + DAY_MS && stamp >= minMs;
      })
      .sort((a, b) =>
        addedAtMs(b) - addedAtMs(a) ||
        dailyHash(`new:${a.id}`, dateKey) - dailyHash(`new:${b.id}`, dateKey)
      )
      .slice(0, options.limit || MAX_RAIL_GAMES);
  }

  function hiddenGemGames(gameList, stats, age, options = {}) {
    const byId = stats?.games || {};
    if (!Object.keys(byId).length) return [];

    const excluded = new Set([
      ...cleanIds(options.newIds),
      ...cleanIds(options.recentIds),
      ...cleanIds(options.favoriteIds),
      ...cleanIds(options.popularIds)
    ]);
    const dateKey = options.dateKey || kstDateKey();
    const eligible = gameList.filter(game =>
      supportsAge(game, age) &&
      !excluded.has(String(game.id))
    );
    if (!eligible.length) return [];

    const entries = eligible.map(game => {
      const stat = byId?.[game.id] || {};
      const weekly = Number(stat.weeklyPlays || 0);
      const total = Number(stat.totalPlays || 0);
      const exposure = weekly * 20 + total;
      const quality = (game.cover ? 2 : 0) +
        (game.classroom ? 1 : 0) +
        (game.qualityStatus === 'featured' ? 1 : 0);
      return { game, weekly, total, exposure, quality };
    });

    const exposures = entries.map(entry => entry.exposure).sort((a, b) => a - b);
    const percentileIndex = Math.min(
      exposures.length - 1,
      Math.floor((exposures.length - 1) * 0.55)
    );
    const threshold = exposures[percentileIndex] ?? Infinity;

    return entries
      .filter(entry => entry.exposure <= threshold)
      .sort((a, b) =>
        a.exposure - b.exposure ||
        b.quality - a.quality ||
        dailyHash(`hidden:${a.game.id}`, dateKey) -
          dailyHash(`hidden:${b.game.id}`, dateKey)
      )
      .slice(0, options.limit || MAX_RAIL_GAMES)
      .map(entry => entry.game);
  }

  function heroCandidates(gameList, age, options = {}) {
    const dateKey = options.dateKey || kstDateKey();
    const sources = [
      options.newGames || [],
      options.recommendedGames || [],
      options.hiddenGames || [],
      options.popularGames || []
    ];
    const result = [];
    const seen = new Set();
    const add = game => {
      const id = String(game?.id || '');
      if (!id || seen.has(id) || !supportsAge(game, age)) return;
      seen.add(id);
      result.push(game);
    };

    sources.forEach(source => source.slice(0, 5).forEach(add));
    if (result.length < 6) {
      deterministicGames(
        gameList,
        game => Boolean(game.cover),
        age,
        12,
        dateKey,
        'hero-fallback'
      ).forEach(add);
    }
    if (!result.length) {
      deterministicGames(gameList, () => true, age, 12, dateKey, 'hero-any').forEach(add);
    }
    return result.slice(0, 16);
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

  function deterministicGames(
    gameList,
    predicate,
    age,
    limit = MAX_RAIL_GAMES,
    dateKey = kstDateKey(),
    salt = 'default'
  ) {
    return gameList
      .filter(game => supportsAge(game, age) && predicate(game))
      .sort((a, b) =>
        dailyHash(`${salt}:${a.id}`, dateKey) -
        dailyHash(`${salt}:${b.id}`, dateKey)
      )
      .slice(0, limit);
  }

  function diversifyRail(candidates, seenLeadIds, limit = MAX_RAIL_GAMES, leadCount = 3) {
    const seen = seenLeadIds instanceof Set ? seenLeadIds : new Set();
    const unique = [];
    const known = new Set();
    for (const game of candidates || []) {
      const id = String(game?.id || '');
      if (!id || known.has(id)) continue;
      known.add(id);
      unique.push(game);
    }

    const fresh = unique.filter(game => !seen.has(String(game.id)));
    const reused = unique.filter(game => seen.has(String(game.id)));
    const result = [...fresh, ...reused].slice(0, limit);

    result.slice(0, leadCount).forEach(game => seen.add(String(game.id)));
    return result;
  }

  function railDefinitions(gameList, options = {}) {
    const age = options.age || 'high';
    const dateKey = options.dateKey || kstDateKey();
    const definitions = [];
    const seenLeadIds = new Set(cleanIds(options.heroId ? [options.heroId] : []));

    const addRail = (rail, config = {}) => {
      const rawGames = Array.isArray(rail.games) ? rail.games : [];
      const minGames = Number(config.minGames ?? 1);
      if (rawGames.length < minGames) return false;
      const gamesForRail = config.preserveOrder
        ? rawGames.slice(0, MAX_RAIL_GAMES)
        : diversifyRail(rawGames, seenLeadIds, MAX_RAIL_GAMES, config.leadCount ?? 3);
      if (gamesForRail.length < minGames) return false;
      definitions.push({ ...rail, games: gamesForRail });
      if (config.preserveOrder) {
        gamesForRail.slice(0, config.leadCount ?? 3).forEach(game => seenLeadIds.add(String(game.id)));
      }
      return true;
    };

    const recent = Array.isArray(options.recentGames) ? options.recentGames : [];
    const newest = Array.isArray(options.newGames) ? options.newGames : [];
    const popular = Array.isArray(options.popularGames) ? options.popularGames : [];
    const hidden = Array.isArray(options.hiddenGames) ? options.hiddenGames : [];
    const recommended = Array.isArray(options.recommendedGames)
      ? options.recommendedGames
      : recommendGames(gameList, {
          age,
          recentIds: options.recentIds || [],
          favoriteIds: options.favoriteIds || [],
          dateKey
        });

    if (recent.length) addRail({
      key:'recent',
      title:'🕒 이어서 플레이',
      note:'최근에 하던 게임으로 바로 돌아가요.',
      games:recent
    }, { preserveOrder:true, leadCount:3 });

    if (newest.length) addRail({
      key:'new',
      title:'🆕 신작 게임',
      note:'KIDSCADE에 최근 새로 들어온 게임이에요.',
      games:newest
    }, { leadCount:3 });

    if (popular.length) addRail({
      key:'popular',
      title:'🔥 지금 많이 하는 게임',
      note:'이번 주 KIDSCADE에서 자주 플레이한 게임이에요.',
      games:popular,
      showPlayCount:true
    }, { leadCount:3 });

    if (recommended.length) addRail({
      key:'recommended',
      title:'✨ 오늘 뭐 하지?',
      note:'최근 취향과 오늘의 추천을 섞어 골랐어요.',
      games:recommended
    }, { leadCount:4 });

    if (hidden.length) addRail({
      key:'hidden',
      title:'💎 숨겨진 꿀잼',
      note:'아직 많이 알려지지 않았지만 다시 발견할 만한 게임이에요.',
      games:hidden
    }, { minGames:2, leadCount:3 });

    const quick = deterministicGames(
      gameList,
      game => Number(game.sessionMinutes || 99) <= 5,
      age,
      MAX_RAIL_GAMES * 2,
      dateKey,
      'quick'
    );
    addRail({
      key:'quick',
      title:age === 'toddler' ? '⚡ 짧게 놀아요' : '⚡ 5분이면 한 판',
      note:'짧은 시간에도 부담 없이 시작할 수 있어요.',
      games:quick
    }, { minGames:3, leadCount:3 });

    const together = deterministicGames(
      gameList,
      game => (game.players || []).some(mode => mode !== 'solo'),
      age,
      MAX_RAIL_GAMES * 2,
      dateKey,
      'together'
    );
    addRail({
      key:'together',
      title:'👥 친구랑 같이 해요',
      note:'2인·여럿이·온라인으로 함께할 수 있어요.',
      games:together
    }, { minGames:3, leadCount:3 });

    if (age === 'low' || age === 'high') {
      const career = gameList
        .filter(game => game.age === 'job' && !game.disabled && game.qualityStatus !== 'rework')
        .sort((a, b) =>
          dailyHash(`career:${a.id}`, dateKey) -
          dailyHash(`career:${b.id}`, dateKey)
        )
        .slice(0, MAX_RAIL_GAMES * 2);
      addRail({
        key:'career',
        title:'🧑‍🔬 직업체험관',
        note:'가게·현장·전문 직업을 게임으로 체험해요.',
        games:career
      }, { leadCount:3 });
    }

    if (age === 'job') {
      const deep = deterministicGames(
        gameList,
        game => game.age === 'job',
        'job',
        MAX_RAIL_GAMES * 2,
        dateKey,
        'career-all'
      );
      addRail({
        key:'career-all',
        title:'💼 직업을 골라 체험해요',
        note:'직업체험 게임을 한곳에서 둘러볼 수 있어요.',
        games:deep
      }, { leadCount:3 });
    }

    const subjectMinimum = age === 'toddler' ? 3 : 2;
    for (const config of SUBJECT_RAILS) {
      const candidates = deterministicGames(
        gameList,
        game => game.subject === config.subject,
        age,
        MAX_RAIL_GAMES * 2,
        dateKey,
        `subject:${config.subject}`
      );
      addRail({
        key:`subject-${config.subject}`,
        title:`${config.emoji} ${config.title}`,
        note:config.note,
        subject:config.subject,
        games:candidates
      }, { minGames:subjectMinimum, leadCount:3 });
    }

    return definitions;
  }

  function heroGame(gameList, age, options = {}) {
    const dateKey = options.dateKey || kstDateKey();
    const recent = new Set(cleanIds(options.recentIds));
    const supplied = Array.isArray(options.candidates)
      ? options.candidates.filter(game => supportsAge(game, age))
      : [];
    const eligible = gameList.filter(game => supportsAge(game, age));
    const featured = eligible.filter(game => game.qualityStatus === 'featured');
    const basePool = supplied.length ? supplied : (featured.length ? featured : eligible);
    if (!basePool.length) return null;

    const pool = [...basePool]
      .filter((game, index, list) =>
        list.findIndex(candidate => String(candidate.id) === String(game.id)) === index
      )
      .sort((a, b) => {
        const ar = recent.has(String(a.id)) ? 1 : 0;
        const br = recent.has(String(b.id)) ? 1 : 0;
        if (ar !== br) return ar - br;
        return dailyHash(`hero:${a.id}`, dateKey) - dailyHash(`hero:${b.id}`, dateKey);
      });

    const slot = Number.isFinite(Number(options.hourSlot))
      ? Number(options.hourSlot)
      : kstHourSlot();
    return pool[((slot % pool.length) + pool.length) % pool.length] || null;
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
          <div class="kc-home-hero-kicker">⏰ ${kstHourLabel()}시 KIDSCADE PICK · ${escapeHtml(subject)}</div>
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

  function storedLayout() {
    try {
      return normalizeLayout(root?.KidscadeStorage?.getRaw?.('homeLayout', HOME_LAYOUTS.recommend));
    } catch (_) {
      return HOME_LAYOUTS.recommend;
    }
  }

  function currentLayout() {
    if (!root?.document) return storedLayout();
    return normalizeLayout(root.document.body.dataset.kcHomeLayout || storedLayout());
  }

  function updateLayoutButton(layout = currentLayout()) {
    const button = root?.document?.getElementById(LAYOUT_BUTTON_ID);
    if (!button) return;
    const classic = layout === HOME_LAYOUTS.classic;
    const icon = button.querySelector('.kc-home-layout-icon');
    const label = button.querySelector('.kc-home-layout-label');
    if (icon) icon.textContent = classic ? '▦' : '✨';
    if (label) label.textContent = classic ? '전체 홈' : '추천 홈';
    button.dataset.layout = layout;
    button.setAttribute('aria-label', classic
      ? '현재 전체형 홈. 추천형 홈으로 바꾸기'
      : '현재 추천형 홈. 전체형 홈으로 바꾸기');
    button.setAttribute('title', classic
      ? '전체형 홈 사용 중 · 추천형으로 바꾸기'
      : '추천형 홈 사용 중 · 전체형으로 바꾸기');
  }

  function setLayout(nextLayout, options = {}) {
    if (!root?.document) return normalizeLayout(nextLayout);
    const layout = normalizeLayout(nextLayout);
    const body = root.document.body;
    const search = root.document.getElementById('game-search-input');
    const hasSearch = Boolean(search?.value?.trim());

    body.dataset.kcHomeLayout = layout;
    body.dataset.kcHomeMode = layout === HOME_LAYOUTS.classic
      ? (hasSearch ? 'search' : 'library')
      : 'home';
    delete body.dataset.kcHomeSearchReturn;

    if (options.persist !== false) {
      try { root.KidscadeStorage?.setRaw?.('homeLayout', layout); } catch (_) {}
    }

    updateLayoutButton(layout);
    updateBackbar();
    root.KidscadeDashboard?.render?.({ age: currentAge() });
    root.document.dispatchEvent(new CustomEvent('kidscade:home-layout-changed', {
      detail: { layout }
    }));

    if (options.scroll !== false) {
      const target = layout === HOME_LAYOUTS.classic
        ? root.document.querySelector('.kc-discovery')
        : root.document.getElementById(HOME_ID);
      target?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }
    return layout;
  }

  function toggleLayout() {
    return setLayout(currentLayout() === HOME_LAYOUTS.classic
      ? HOME_LAYOUTS.recommend
      : HOME_LAYOUTS.classic);
  }

  function bindLayoutToggle() {
    const button = root?.document?.getElementById(LAYOUT_BUTTON_ID);
    if (!button || button.dataset.kcHomeLayoutBound === '1') return;
    button.dataset.kcHomeLayoutBound = '1';
    button.addEventListener('click', event => {
      event.preventDefault();
      toggleLayout();
    });
    updateLayoutButton();
  }

  function render() {
    renderQueued = false;
    const shell = ensureShell();
    if (!shell) return false;
    const age = currentAge();
    const list = games();
    if (!list.length) return false;

    const now = new Date();
    const dateKey = kstDateKey(now);
    const recents = recentGames(age);
    const recentIdList = recentIds();
    const favoriteIdList = favoriteIds();
    const stats = root?.KidscadeServerStats?.current;
    const newest = newReleaseGames(list, age, {
      nowMs: now.getTime(),
      dateKey,
      limit: MAX_RAIL_GAMES * 2
    });
    const popular = rankPopular(list, stats, age, MAX_RAIL_GAMES * 2);
    const recommended = recommendGames(list, {
      age,
      recentIds: recentIdList,
      favoriteIds: favoriteIdList,
      dateKey,
      limit: MAX_RAIL_GAMES * 2
    });
    const hidden = hiddenGemGames(list, stats, age, {
      dateKey,
      newIds: newest.map(game => game.id),
      recentIds: recentIdList,
      favoriteIds: favoriteIdList,
      popularIds: popular.slice(0, MAX_RAIL_GAMES).map(game => game.id),
      limit: MAX_RAIL_GAMES * 2
    });
    const heroPool = heroCandidates(list, age, {
      dateKey,
      newGames: newest,
      recommendedGames: recommended,
      hiddenGames: hidden,
      popularGames: popular
    });
    const hero = heroGame(list, age, {
      dateKey,
      hourSlot: kstHourSlot(now),
      recentIds: recentIdList,
      candidates: heroPool
    });
    const rails = railDefinitions(list, {
      age,
      dateKey,
      heroId: hero?.id || '',
      recentGames: recents,
      newGames: newest,
      popularGames: popular,
      recommendedGames: recommended,
      hiddenGames: hidden,
      recentIds: recentIdList,
      favoriteIds: favoriteIdList
    });

    shell.innerHTML = `
      ${heroMarkup(hero, age)}
      <div class="kc-home-rail-stack">
        ${rails.map(railMarkup).join('')}
      </div>
    `;

    wireShell(shell);
    prepareKeyboardNavigation(shell);
    root.document.body.classList.add('kc-home-v2-ready');
    if (!root.document.body.dataset.kcHomeLayout) {
      setLayout(storedLayout(), { persist: false, scroll: false });
    } else {
      updateLayoutButton(currentLayout());
      updateBackbar();
    }
    return true;
  }

  function scheduleRender() {
    if (!root?.document || renderQueued) return;
    renderQueued = true;
    const schedule = root.requestAnimationFrame || (callback => setTimeout(callback, 16));
    schedule(() => render());
  }

  function scheduleHourlyHeroRefresh() {
    if (!root?.setTimeout) return;
    if (heroRotationTimer) root.clearTimeout?.(heroRotationTimer);
    const now = Date.now();
    const delay = Math.max(1000, HOUR_MS - (now % HOUR_MS) + 250);
    heroRotationTimer = root.setTimeout(() => {
      scheduleRender();
      scheduleHourlyHeroRefresh();
    }, delay);
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
    if (!root?.document) return;
    const search = root.document.getElementById('game-search-input');
    if (search?.value) {
      search.value = '';
      search.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (currentLayout() === HOME_LAYOUTS.classic) {
      root.document.body.dataset.kcHomeMode = 'library';
      root.document.querySelector('.kc-discovery')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      root.document.body.dataset.kcHomeMode = 'home';
      root.document.getElementById(HOME_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    updateBackbar();
  }

  function updateBackbar() {
    const bar = root?.document?.getElementById(BACKBAR_ID);
    if (!bar) return;
    const mode = root.document.body.dataset.kcHomeMode || 'home';
    const title = bar.querySelector('.kc-home-back-title');
    const note = bar.querySelector('.kc-home-back-note');
    if (title) title.textContent = mode === 'search' ? '검색 결과' : '모든 게임';
    if (note) note.textContent = mode === 'search'
      ? '검색어와 태그에 맞는 게임만 보여주고 있어요.'
      : '검색과 태그로 원하는 게임을 찾아보세요.';
  }

  function bindSearch() {
    const search = root?.document?.getElementById('game-search-input');
    if (!search || searchBound) return;
    searchBound = true;
    search.addEventListener('input', () => {
      const value = search.value.trim();
      const body = root.document.body;
      const layout = currentLayout();
      const currentMode = body.dataset.kcHomeMode || (layout === HOME_LAYOUTS.classic ? 'library' : 'home');
      if (value) {
        if (currentMode !== 'search') {
          body.dataset.kcHomeSearchReturn = layout === HOME_LAYOUTS.classic
            ? 'library'
            : (currentMode === 'library' ? 'library' : 'home');
        }
        body.dataset.kcHomeMode = 'search';
      } else if (currentMode === 'search') {
        body.dataset.kcHomeMode = body.dataset.kcHomeSearchReturn ||
          (layout === HOME_LAYOUTS.classic ? 'library' : 'home');
        delete body.dataset.kcHomeSearchReturn;
      }
      updateBackbar();
    });
  }

  function bindGlobalEvents() {
    root.document.addEventListener('kidscade:favorites-changed', scheduleRender);
    root.document.addEventListener('kidscade:recents-changed', scheduleRender);
    root.document.addEventListener('kidscade:server-stats-updated', scheduleRender);
    root.document.addEventListener('kidscade:game-closed', () => {
      root.KidscadeServerStats?.load?.(false)?.then?.(() => scheduleRender());
      scheduleRender();
    });

    if (!bodyObserver && root.MutationObserver) {
      bodyObserver = new MutationObserver(mutations => {
        if (mutations.some(mutation => mutation.attributeName === 'data-kidscade-age')) scheduleRender();
      });
      bodyObserver.observe(root.document.body, { attributes: true, attributeFilter: ['data-kidscade-age'] });
    }
  }

  async function refreshStats() {
    try {
      await root?.KidscadeServerStats?.load?.(false);
    } catch (_) {}
    scheduleRender();
  }

  function mount() {
    if (!root?.document || mounted) return false;
    ensureStylesheet();
    const attempt = () => {
      if (mounted) return;
      const shell = ensureShell();
      const ready = shell && games().length && root.KidscadePlay && root.KidscadeDashboard;
      if (!ready) {
        setTimeout(attempt, 80);
        return;
      }
      mounted = true;
      bindSearch();
      bindLayoutToggle();
      bindGlobalEvents();
      render();
      scheduleHourlyHeroRefresh();
      refreshStats();
    };
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', attempt, { once: true });
    else attempt();
    return true;
  }

  return Object.freeze({
    mount,
    render,
    showHome,
    showLibrary,
    setLayout,
    toggleLayout,
    currentLayout,
    normalizeLayout,
    supportsAge,
    dailyHash,
    kstHourSlot,
    newReleaseGames,
    hiddenGemGames,
    heroCandidates,
    rankPopular,
    recommendGames,
    deterministicGames,
    diversifyRail,
    railDefinitions,
    heroGame
  });
});
