((factory) => {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    window.KidscadeProfileHistory = Object.freeze(api);
    api.startBrowserUI();
  }
})(() => {
  'use strict';

  const PROFILE_VERSION = 1;
  const HISTORY_VERSION = 1;
  const MIN_VALID_SECONDS = 30;
  const MAX_RECENT_SESSIONS = 30;
  const MAX_WEEK_BUCKETS = 12;
  const DEFAULT_NICKNAME = '새싹 게이머';
  const STYLE_ID = 'kidscade-profile-history-style';
  const CARD_ID = 'kc-local-profile-card';

  const clampInt = (value, min = 0) => Math.max(min, Math.floor(Number(value) || 0));

  function localDateKey(value = Date.now()) {
    const date = new Date(value);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function weekKey(value = Date.now()) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    const mondayOffset = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - mondayOffset);
    return localDateKey(date);
  }

  function sanitizeNickname(value) {
    return String(value ?? '')
      .replace(/[<>\u0000-\u001f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 12);
  }

  function defaultProfile(now = Date.now()) {
    const iso = new Date(now).toISOString();
    return {
      version: PROFILE_VERSION,
      nickname: DEFAULT_NICKNAME,
      createdAt: iso,
      updatedAt: iso
    };
  }

  function normalizeProfile(input, now = Date.now()) {
    const fallback = defaultProfile(now);
    if (!input || typeof input !== 'object') return fallback;
    const nickname = sanitizeNickname(input.nickname) || DEFAULT_NICKNAME;
    return {
      version: PROFILE_VERSION,
      nickname,
      createdAt: typeof input.createdAt === 'string' && input.createdAt ? input.createdAt : fallback.createdAt,
      updatedAt: typeof input.updatedAt === 'string' && input.updatedAt ? input.updatedAt : fallback.updatedAt
    };
  }

  function emptyHistory() {
    return {
      version: HISTORY_VERSION,
      games: {},
      recent: []
    };
  }

  function normalizeGameRecord(record) {
    const input = record && typeof record === 'object' ? record : {};
    const weeks = {};
    if (input.weeks && typeof input.weeks === 'object') {
      Object.entries(input.weeks).forEach(([key, value]) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
        weeks[key] = {
          plays: clampInt(value?.plays),
          seconds: clampInt(value?.seconds)
        };
      });
    }
    return {
      plays: clampInt(input.plays),
      seconds: clampInt(input.seconds),
      firstPlayedAt: typeof input.firstPlayedAt === 'string' ? input.firstPlayedAt : '',
      lastPlayedAt: typeof input.lastPlayedAt === 'string' ? input.lastPlayedAt : '',
      category: typeof input.category === 'string' ? input.category : 'all',
      weeks
    };
  }

  function normalizeHistory(input) {
    if (!input || typeof input !== 'object') return emptyHistory();
    const games = {};
    if (input.games && typeof input.games === 'object') {
      Object.entries(input.games).forEach(([id, record]) => {
        if (!String(id).trim()) return;
        games[String(id)] = normalizeGameRecord(record);
      });
    }
    const recent = Array.isArray(input.recent)
      ? input.recent
          .filter(item => item && String(item.id || '').trim())
          .slice(0, MAX_RECENT_SESSIONS)
          .map(item => ({
            id: String(item.id),
            category: String(item.category || 'all'),
            seconds: clampInt(item.seconds),
            at: typeof item.at === 'string' ? item.at : ''
          }))
      : [];
    return { version: HISTORY_VERSION, games, recent };
  }

  function pruneWeeks(record) {
    const keys = Object.keys(record.weeks || {}).sort().reverse();
    keys.slice(MAX_WEEK_BUCKETS).forEach(key => delete record.weeks[key]);
  }

  function recordSessionState(historyInput, session = {}, now = Date.now()) {
    const history = normalizeHistory(historyInput);
    const id = String(session.id || '').trim();
    const seconds = clampInt(session.seconds);
    if (!id || seconds < MIN_VALID_SECONDS) return history;

    const iso = new Date(now).toISOString();
    const currentWeek = weekKey(now);
    const record = history.games[id] || normalizeGameRecord();
    record.plays += 1;
    record.seconds += seconds;
    record.category = String(session.category || record.category || 'all');
    if (!record.firstPlayedAt) record.firstPlayedAt = iso;
    record.lastPlayedAt = iso;
    const bucket = record.weeks[currentWeek] || { plays: 0, seconds: 0 };
    bucket.plays += 1;
    bucket.seconds += seconds;
    record.weeks[currentWeek] = bucket;
    pruneWeeks(record);
    history.games[id] = record;

    history.recent.unshift({ id, category: record.category, seconds, at: iso });
    history.recent = history.recent.slice(0, MAX_RECENT_SESSIONS);
    return history;
  }

  function summarize(historyInput, options = {}) {
    const history = normalizeHistory(historyInput);
    const currentWeek = weekKey(options.now ?? Date.now());
    let totalPlays = 0;
    let totalSeconds = 0;
    let weekPlays = 0;
    let weekSeconds = 0;
    const ranked = [];

    Object.entries(history.games).forEach(([id, record]) => {
      totalPlays += record.plays;
      totalSeconds += record.seconds;
      const bucket = record.weeks?.[currentWeek] || { plays: 0, seconds: 0 };
      weekPlays += clampInt(bucket.plays);
      weekSeconds += clampInt(bucket.seconds);
      if (record.plays > 0) ranked.push({ id, ...record });
    });

    ranked.sort((a, b) => b.plays - a.plays || b.seconds - a.seconds || String(b.lastPlayedAt).localeCompare(String(a.lastPlayedAt)));
    const recentIds = [];
    const seen = new Set();
    history.recent.forEach(item => {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        recentIds.push(item.id);
      }
    });

    return {
      totalPlays,
      totalSeconds,
      weekPlays,
      weekSeconds,
      uniqueGames: ranked.length,
      topGames: ranked.slice(0, 3),
      recentGameIds: recentIds.slice(0, 5)
    };
  }

  function formatDuration(seconds) {
    const total = clampInt(seconds);
    if (total < 60) return total > 0 ? `${total}초` : '0분';
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    if (hours > 0) return `${hours}시간${minutes ? ` ${minutes}분` : ''}`;
    return `${minutes}분`;
  }

  function formatShortDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
  }

  function storageApi() {
    return typeof window !== 'undefined' ? window.KidscadeStorage : null;
  }

  function loadProfile() {
    const storage = storageApi();
    const profile = normalizeProfile(storage?.getJson?.('profile', null));
    storage?.setJson?.('profile', profile);
    return profile;
  }

  function saveProfile(profile) {
    const storage = storageApi();
    const normalized = normalizeProfile(profile);
    normalized.updatedAt = new Date().toISOString();
    storage?.setJson?.('profile', normalized);
    emitChanged('profile');
    return normalized;
  }

  function loadHistory() {
    return normalizeHistory(storageApi()?.getJson?.('playHistory', emptyHistory()));
  }

  function saveHistory(history) {
    const normalized = normalizeHistory(history);
    storageApi()?.setJson?.('playHistory', normalized);
    emitChanged('history');
    return normalized;
  }

  function recordSession(session) {
    const seconds = clampInt(session?.seconds);
    if (!session?.id || seconds < MIN_VALID_SECONDS) return false;
    saveHistory(recordSessionState(loadHistory(), session, Date.now()));
    return true;
  }

  function updateNickname(nickname) {
    const clean = sanitizeNickname(nickname);
    if (!clean) return false;
    const profile = loadProfile();
    profile.nickname = clean;
    saveProfile(profile);
    return true;
  }

  function emitChanged(kind) {
    if (typeof document === 'undefined' || typeof CustomEvent === 'undefined') return;
    document.dispatchEvent(new CustomEvent('kidscade:profile-history-changed', { detail: { kind } }));
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function getGameMeta(id) {
    const catalogGame = window.KidscadeCatalog?.games?.find?.(game => game.id === id);
    if (catalogGame) return catalogGame;
    const card = document.querySelector(`#game-list .game-card[data-id="${CSS.escape(String(id))}"]`);
    return {
      id,
      title: card?.querySelector('.game-title')?.textContent?.trim() || id,
      cover: card?.dataset?.cover || '',
      disabled: card?.classList?.contains('disabled') || false
    };
  }

  function enabledGameCount() {
    const catalog = window.KidscadeCatalog?.games;
    if (Array.isArray(catalog)) return catalog.filter(game => !game.disabled).length;
    return document.querySelectorAll('#game-list .game-card:not(.disabled)').length;
  }

  function openGame(id) {
    const card = document.querySelector(`#game-list .game-card[data-id="${CSS.escape(String(id))}"]`);
    if (card && !card.classList.contains('disabled')) card.click();
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${CARD_ID}{padding:15px;border-radius:22px;background:var(--card-bg,#fff);border:1px solid rgba(148,163,184,.22);box-shadow:0 10px 26px rgba(15,23,42,.07);text-align:left;color:var(--text-color,#334155)}
      #${CARD_ID} .kph-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:11px}
      #${CARD_ID} .kph-kicker{font-size:.68rem;font-weight:1000;color:#8b5cf6;letter-spacing:.08em}
      #${CARD_ID} .kph-name{margin:2px 0 0;font-size:1.08rem;font-weight:1000;letter-spacing:-.03em}
      #${CARD_ID} .kph-edit{border:0;border-radius:12px;padding:7px 9px;background:#f1f5f9;color:#475569;font-weight:900;font-size:.72rem;cursor:pointer}
      #${CARD_ID} .kph-note{font-size:.67rem;color:#94a3b8;margin-top:2px}
      #${CARD_ID} .kph-stats{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:10px 0}
      #${CARD_ID} .kph-stat{background:#f8fafc;border:1px solid #eef2f7;border-radius:14px;padding:9px}
      #${CARD_ID} .kph-stat b{display:block;font-size:.95rem;color:#334155}
      #${CARD_ID} .kph-stat span{font-size:.64rem;color:#94a3b8;font-weight:800}
      #${CARD_ID} .kph-section-title{font-size:.72rem;font-weight:1000;margin:12px 0 6px;color:#64748b}
      #${CARD_ID} .kph-progress{height:9px;background:#e2e8f0;border-radius:999px;overflow:hidden}
      #${CARD_ID} .kph-progress>i{display:block;height:100%;background:linear-gradient(90deg,#8b5cf6,#ec4899);border-radius:inherit}
      #${CARD_ID} .kph-progress-copy{display:flex;justify-content:space-between;gap:8px;margin-top:5px;font-size:.66rem;color:#64748b;font-weight:900}
      #${CARD_ID} .kph-list{display:grid;gap:5px}
      #${CARD_ID} .kph-game{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;border:0;border-radius:11px;padding:7px 9px;background:#f8fafc;color:#334155;cursor:pointer;text-align:left}
      #${CARD_ID} .kph-game strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.72rem}
      #${CARD_ID} .kph-game span{flex:none;font-size:.64rem;color:#8b5cf6;font-weight:1000}
      #${CARD_ID} .kph-recent{display:flex;flex-wrap:wrap;gap:5px}
      #${CARD_ID} .kph-chip{border:1px solid #e2e8f0;background:#fff;border-radius:999px;padding:5px 7px;font-size:.64rem;font-weight:900;color:#475569;cursor:pointer;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #${CARD_ID} .kph-empty{font-size:.7rem;color:#94a3b8;line-height:1.45}
      body.dark-mode #${CARD_ID}{background:#1e293b;border-color:#334155;color:#e2e8f0}
      body.dark-mode #${CARD_ID} .kph-stat,body.dark-mode #${CARD_ID} .kph-game{background:#253145;border-color:#334155;color:#e2e8f0}
      body.dark-mode #${CARD_ID} .kph-stat b{color:#f8fafc}
      body.dark-mode #${CARD_ID} .kph-chip,body.dark-mode #${CARD_ID} .kph-edit{background:#253145;border-color:#475569;color:#e2e8f0}
    `;
    document.head.appendChild(style);
  }

  function renderBrowserUI() {
    const card = document.getElementById(CARD_ID);
    if (!card) return false;
    const profile = loadProfile();
    const history = loadHistory();
    const summary = summarize(history);
    const totalGames = enabledGameCount();
    const progress = totalGames > 0 ? Math.min(100, Math.round(summary.uniqueGames / totalGames * 100)) : 0;

    const topMarkup = summary.topGames.length
      ? summary.topGames.map((record, index) => {
          const game = getGameMeta(record.id);
          return `<button class="kph-game" type="button" data-kph-game="${escapeHtml(record.id)}"><strong>${index + 1}. ${escapeHtml(game.title || record.id)}</strong><span>${record.plays}회 · ${escapeHtml(formatDuration(record.seconds))}</span></button>`;
        }).join('')
      : '<div class="kph-empty">30초 이상 게임을 플레이하면 좋아하는 게임이 여기에 기록돼요.</div>';

    const recentMarkup = summary.recentGameIds.length
      ? summary.recentGameIds.map(id => {
          const game = getGameMeta(id);
          return `<button class="kph-chip" type="button" data-kph-game="${escapeHtml(id)}">${escapeHtml(game.title || id)}</button>`;
        }).join('')
      : '<span class="kph-empty">아직 기록이 없어요.</span>';

    card.innerHTML = `
      <div class="kph-head">
        <div><div class="kph-kicker">LOCAL PROFILE</div><div class="kph-name">${escapeHtml(profile.nickname)}</div><div class="kph-note">이 브라우저에만 저장되는 임시 프로필 · 시작 ${escapeHtml(formatShortDate(profile.createdAt))}</div></div>
        <button class="kph-edit" id="kph-edit-name" type="button">닉네임 수정</button>
      </div>
      <div class="kph-stats">
        <div class="kph-stat"><b>${escapeHtml(formatDuration(summary.totalSeconds))}</b><span>총 플레이 시간</span></div>
        <div class="kph-stat"><b>${summary.totalPlays}회</b><span>총 유효 플레이</span></div>
        <div class="kph-stat"><b>${summary.weekPlays}회</b><span>이번 주 플레이</span></div>
        <div class="kph-stat"><b>${escapeHtml(formatDuration(summary.weekSeconds))}</b><span>이번 주 시간</span></div>
      </div>
      <div class="kph-section-title">🎮 게임 탐험도</div>
      <div class="kph-progress"><i style="width:${progress}%"></i></div>
      <div class="kph-progress-copy"><span>${summary.uniqueGames} / ${totalGames}개 플레이</span><span>${progress}%</span></div>
      <div class="kph-section-title">🏆 내가 많이 한 게임</div>
      <div class="kph-list">${topMarkup}</div>
      <div class="kph-section-title">🕘 최근 플레이</div>
      <div class="kph-recent">${recentMarkup}</div>
    `;

    card.querySelector('#kph-edit-name')?.addEventListener('click', () => {
      const value = window.prompt('Kidscade에서 사용할 닉네임을 입력하세요. (최대 12자)', profile.nickname);
      if (value === null) return;
      const clean = sanitizeNickname(value);
      if (!clean) {
        window.alert('닉네임을 한 글자 이상 입력해 주세요.');
        return;
      }
      updateNickname(clean);
    });
    card.querySelectorAll('[data-kph-game]').forEach(button => {
      button.addEventListener('click', () => openGame(button.getAttribute('data-kph-game')));
    });
    return true;
  }

  function mountBrowserUI() {
    if (typeof document === 'undefined') return false;
    const host = document.querySelector('.kc-myspace-inner');
    if (!host) return false;
    installStyles();
    let card = document.getElementById(CARD_ID);
    if (!card) {
      card = document.createElement('section');
      card.id = CARD_ID;
      card.setAttribute('aria-label', '내 플레이 기록');
      const avatarShell = host.querySelector('.kc-side-card.avatar-shell');
      if (avatarShell?.nextSibling) host.insertBefore(card, avatarShell.nextSibling);
      else host.appendChild(card);
    }
    renderBrowserUI();
    return true;
  }

  function startBrowserUI() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (mountBrowserUI() || attempts >= 80) window.clearInterval(timer);
    }, 200);

    window.addEventListener('pageshow', () => mountBrowserUI());
    document.addEventListener('kidscade:profile-history-changed', () => renderBrowserUI());
    document.addEventListener('kidscade:catalog-ready', () => mountBrowserUI());
  }

  return Object.freeze({
    PROFILE_VERSION,
    HISTORY_VERSION,
    MIN_VALID_SECONDS,
    DEFAULT_NICKNAME,
    localDateKey,
    weekKey,
    sanitizeNickname,
    defaultProfile,
    normalizeProfile,
    emptyHistory,
    normalizeHistory,
    recordSessionState,
    summarize,
    formatDuration,
    loadProfile,
    saveProfile,
    loadHistory,
    saveHistory,
    recordSession,
    updateNickname,
    mountBrowserUI,
    renderBrowserUI,
    startBrowserUI
  });
});
