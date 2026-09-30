((factory) => {
  const library = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = library;
  if (typeof window !== 'undefined') {
    const instance = library.create({ storageApi: window.KidscadeStorage, localStorage: window.localStorage });
    window.KidscadeActivity = Object.freeze(instance);
    instance.startBrowserUI();
  }
})(() => {
  'use strict';

  const KEY = 'kidscade_activity_feed_v1';
  const MAX_EVENTS = 250;
  const TYPES = Object.freeze({
    attendance: { icon: '📅', group: 'reward', label: '출석' },
    start: { icon: '🎮', group: 'game', label: '게임 시작' },
    play: { icon: '🕹️', group: 'game', label: '플레이' },
    clear: { icon: '🏆', group: 'achievement', label: '클리어' },
    record: { icon: '⭐', group: 'achievement', label: '최고 기록' },
    mission: { icon: '🎯', group: 'achievement', label: '미션' },
    reward: { icon: '🌱', group: 'reward', label: '보상' }
  });
  const FILTERS = Object.freeze([
    ['all', '전체'], ['game', '게임'], ['achievement', '달성'], ['reward', '보상']
  ]);

  function clean(value, max = 100) {
    return String(value ?? '').replace(/[<>\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function emptyState() {
    return { version: 1, events: [], lastReadId: '' };
  }

  function normalizeState(input) {
    const state = emptyState();
    if (!input || typeof input !== 'object') return state;
    state.lastReadId = clean(input.lastReadId, 90);
    const entries = Array.isArray(input.events) ? input.events : [];
    const seen = new Set();
    for (const entry of entries) {
      if (!entry || !TYPES[entry.type]) continue;
      const id = clean(entry.id, 90);
      const at = Number(entry.at);
      if (!id || seen.has(id) || !Number.isFinite(at) || at <= 0) continue;
      seen.add(id);
      state.events.push({
        id, at, type: entry.type,
        title: clean(entry.title), summary: clean(entry.summary, 200),
        place: clean(entry.place, 70), gameId: clean(entry.gameId, 90)
      });
    }
    state.events.sort((a, b) => b.at - a.at);
    state.events = state.events.slice(0, MAX_EVENTS);
    return state;
  }

  function countUnread(input) {
    const state = normalizeState(input);
    if (!state.lastReadId) return state.events.length;
    const index = state.events.findIndex(entry => entry.id === state.lastReadId);
    return index < 0 ? state.events.length : index;
  }

  function formatTime(at) {
    const date = new Date(at);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }

  function dateKey(at) {
    const date = new Date(at);
    return String(date.getFullYear()) + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function create(options = {}) {
    const storageApi = options.storageApi || null;
    const storage = options.localStorage || null;
    const now = typeof options.now === 'function' ? options.now : Date.now;
    let sequence = 0;
    let activeFilter = 'all';
    let previousOverflow = '';
    let isOpen = false;
    let bodyObserver = null;
    let syncQueued = false;

    function read() {
      try {
        const saved = storageApi?.getJson ? storageApi.getJson('activityFeed', null)
          : JSON.parse(storage?.getItem?.(KEY) || 'null');
        return normalizeState(saved);
      } catch (_) {
        return emptyState();
      }
    }

    function write(state) {
      try {
        if (storageApi?.setJson) return storageApi.setJson('activityFeed', state);
        storage?.setItem?.(KEY, JSON.stringify(state));
        return true;
      } catch (_) {
        return false;
      }
    }

    // Carry forward the existing local play history so the new tab is useful
    // immediately. Imported events are already read and never award currency.
    function migrateExistingHistory() {
      if (typeof window === 'undefined') return false;
      try {
        const existing = storageApi?.getRaw
          ? storageApi.getRaw('activityFeed', null)
          : storage?.getItem?.(KEY);
        if (existing !== null && existing !== undefined) return false;
        const history = window.KidscadeProfileHistory?.loadHistory?.();
        const events = (Array.isArray(history?.recent) ? history.recent : []).map(item => {
          const at = new Date(item.at).getTime();
          if (!item.id || !Number.isFinite(at) || at <= 0) return null;
          const gameId = clean(item.id, 90);
          const title = clean(gameMeta(gameId)?.title || gameId, 70);
          const seconds = Math.max(0, Math.floor(Number(item.seconds) || 0));
          const minutes = Math.floor(seconds / 60);
          return {
            id: clean('legacy-' + gameId + '-' + at, 90), at, type: 'play',
            title: title + ' 플레이 완료',
            summary: minutes > 0 ? minutes + '분 ' + (seconds % 60) + '초 플레이' : seconds + '초 플레이',
            place: title, gameId
          };
        }).filter(Boolean);
        if (window.KidscadeDaily?.isAttendanceClaimed?.()) {
          const date = new Date();
          const id = 'attendance-' + dateKey(date.getTime());
          events.push({
            id, at: date.getTime(), type: 'attendance', title: '오늘의 출석 완료!',
            summary: '씨앗 +30 · 쑥쑥이 친밀도 +20', place: '키즈케이드', gameId: ''
          });
        }
        const state = normalizeState({ events });
        state.lastReadId = state.events[0]?.id || '';
        return write(state);
      } catch (error) {
        console.warn('[KidscadeActivity] old play history migration failed:', error);
        return false;
      }
    }

    function record(type, detail = {}) {
      if (!TYPES[type]) return null;
      const state = read();
      const dedupeKey = clean(detail.dedupeKey, 90);
      if (dedupeKey && state.events.some(event => event.id === dedupeKey)) return null;
      const at = Number(now());
      const id = dedupeKey || ('activity-' + at + '-' + (++sequence));
      const entry = {
        id, at, type,
        title: clean(detail.title || TYPES[type].label),
        summary: clean(detail.summary, 200),
        place: clean(detail.place, 70),
        gameId: clean(detail.gameId, 90)
      };
      state.events.unshift(entry);
      state.events = state.events.slice(0, MAX_EVENTS);
      if (!write(state)) return null;
      if (typeof document !== 'undefined' && typeof CustomEvent !== 'undefined') {
        document.dispatchEvent(new CustomEvent('kidscade:activity-changed', { detail: { type, entry } }));
      }
      render();
      return entry;
    }

    function markRead() {
      const state = read();
      state.lastReadId = state.events[0]?.id || '';
      write(state);
      render();
      return state.lastReadId;
    }

    function gameMeta(gameId) {
      if (typeof window === 'undefined') return null;
      return window.KidscadeCatalog?.games?.find?.(game => game.id === gameId) || null;
    }

    function currentGameId() {
      if (typeof document === 'undefined') return '';
      return String(window.KidscadeGameFrame?.getState?.()?.gameId || '');
    }

    function handleGameMessage(event) {
      if (typeof window === 'undefined' || event.origin !== window.location.origin) return;
      const frame = document.getElementById('game-iframe');
      if (!frame || event.source !== frame.contentWindow) return;
      const payload = event.data;
      if (!payload || payload.type !== 'kidscade:game-event' || !payload.detail) return;
      const gameId = clean(payload.gameId || payload.detail.gameId, 90);
      const activeId = currentGameId();
      if (!gameId || !activeId || gameId !== activeId) return;
      const detail = payload.detail;
      const name = clean(gameMeta(gameId)?.title || gameId, 70);
      if (detail.event === 'score' && detail.improved === true && Number.isFinite(Number(detail.score))) {
        record('record', {
          title: name + ' 최고 기록 갱신',
          summary: '새 기록 ' + detail.score + (detail.unit ? ' ' + clean(detail.unit, 20) : ''),
          place: name, gameId
        });
      }
      if (detail.event === 'game-over' &&
          (detail.cleared === true || detail.victory === true || detail.win === true || detail.success === true ||
           detail.result === 'win' || detail.result === 'clear' || detail.outcome === 'win')) {
        record('clear', {
          title: name + ' 클리어!',
          summary: clean(detail.stage || detail.level || detail.message || '도전을 완료했어요.', 120),
          place: name, gameId
        });
      }
    }

    function ensureUI() {
      if (typeof document === 'undefined' || !document.body) return false;
      const host = document.querySelector('.kc-top-actions');
      if (!host) return false;
      let launcher = document.getElementById('kc-feed-launcher');
      if (!launcher) {
        launcher = document.createElement('button');
        launcher.id = 'kc-feed-launcher';
        launcher.className = 'header-btn kc-feed-launcher';
        launcher.type = 'button';
        launcher.setAttribute('aria-label', '활동 기록 열기');
        launcher.innerHTML = '<span aria-hidden="true">🔔</span><span class="kc-feed-launcher-label">활동 기록</span><span class="kc-feed-badge" hidden></span>';
        host.insertBefore(launcher, host.firstChild);
        launcher.addEventListener('click', open);
      }
      const nav = document.querySelector('.kc-mobile-nav');
      if (nav) {
        nav.classList.add('kc-feed-nav');
        if (!nav.querySelector('[data-mobile-nav="activity"]')) {
          const item = document.createElement('button');
          item.className = 'kc-mobile-nav-btn';
          item.type = 'button';
          item.dataset.mobileNav = 'activity';
          item.innerHTML = '<span class="kc-mobile-nav-icon">🔔</span>활동<span class="kc-feed-nav-badge" hidden></span>';
          nav.appendChild(item);
        }
      }
      let overlay = document.getElementById('kc-feed-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'kc-feed-overlay';
        overlay.className = 'kc-feed-overlay hidden';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML =
          '<section class="kc-feed-panel" role="dialog" aria-modal="true" aria-label="활동 기록">' +
          '<header class="kc-feed-head"><div><span class="kc-feed-eyebrow">MY ACTIVITY</span><h2>🔔 활동 기록</h2>' +
          '<p>언제, 어떤 게임에서 무엇을 했는지 모아봐요.</p></div>' +
          '<button class="kc-feed-close" type="button" aria-label="활동 기록 닫기">✕</button></header>' +
          '<div class="kc-feed-filters" role="group" aria-label="활동 분류"></div>' +
          '<div class="kc-feed-list" aria-live="polite"></div>' +
          '<footer class="kc-feed-foot">이 기기의 브라우저에만 저장돼요. 데이터를 지우거나 다른 기기로 접속하면 기록이 이어지지 않을 수 있어요.</footer>' +
          '</section>';
        document.body.appendChild(overlay);
        overlay.querySelector('.kc-feed-close')?.addEventListener('click', close);
        overlay.addEventListener('click', event => {
          if (event.target === overlay) close();
          const gameButton = event.target.closest?.('[data-kc-feed-game]');
          if (gameButton) {
            const id = gameButton.dataset.kcFeedGame;
            close();
            window.KidscadePlay?.open?.(id);
          }
          const filter = event.target.closest?.('[data-kc-feed-filter]');
          if (filter) {
            activeFilter = filter.dataset.kcFeedFilter;
            render();
          }
        });
      }
      render();
      return true;
    }

    function render() {
      if (typeof document === 'undefined') return;
      const state = read();
      const unread = countUnread(state);
      document.querySelectorAll('.kc-feed-badge,.kc-feed-nav-badge').forEach(badge => {
        badge.hidden = unread === 0;
        badge.textContent = unread > 99 ? '99+' : String(unread);
      });
      const overlay = document.getElementById('kc-feed-overlay');
      if (!overlay || !isOpen) return;
      const filters = overlay.querySelector('.kc-feed-filters');
      if (filters) {
        filters.innerHTML = FILTERS.map(([key, label]) =>
          '<button type="button" data-kc-feed-filter="' + key + '" class="' +
          (activeFilter === key ? 'active' : '') + '" aria-pressed="' + (activeFilter === key) +
          '">' + label + '</button>').join('');
      }
      const entries = state.events.filter(entry =>
        activeFilter === 'all' || TYPES[entry.type].group === activeFilter);
      const list = overlay.querySelector('.kc-feed-list');
      if (!list) return;
      if (!entries.length) {
        list.innerHTML = '<div class="kc-feed-empty">아직 이 분류에 기록이 없어요.<br>게임을 플레이하면 여기에 차곡차곡 쌓여요.</div>';
        return;
      }
      let lastDate = '';
      list.innerHTML = entries.map(entry => {
        const day = dateKey(entry.at);
        const group = day === lastDate ? '' : '<div class="kc-feed-date">' + escapeHtml(
          new Date(entry.at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
        ) + '</div>';
        lastDate = day;
        const info = TYPES[entry.type];
        const game = entry.gameId && gameMeta(entry.gameId);
        const footer = entry.place ? '<span>' + escapeHtml(entry.place) + '</span>' : '';
        const action = game && !game.disabled
          ? '<button type="button" data-kc-feed-game="' + escapeHtml(entry.gameId) + '">다시 하기 ›</button>' : '';
        return group + '<article class="kc-feed-entry"><span class="kc-feed-icon" aria-hidden="true">' + info.icon +
          '</span><div class="kc-feed-copy"><div class="kc-feed-time">' + formatTime(entry.at) + ' · ' +
          escapeHtml(info.label) + '</div><strong>' + escapeHtml(entry.title) + '</strong>' +
          (entry.summary ? '<p>' + escapeHtml(entry.summary) + '</p>' : '') +
          '<div class="kc-feed-meta">' + footer + action + '</div></div></article>';
      }).join('');
    }

    function open() {
      if (!ensureUI()) return false;
      const overlay = document.getElementById('kc-feed-overlay');
      if (!overlay) return false;
      previousOverflow = document.body.style.overflow;
      isOpen = true;
      overlay.classList.remove('hidden');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      document.querySelectorAll('.kc-mobile-nav-btn').forEach(button =>
        button.classList.toggle('active', button.dataset.mobileNav === 'activity'));
      markRead();
      overlay.querySelector('.kc-feed-close')?.focus?.();
      return true;
    }

    function close() {
      const overlay = document.getElementById('kc-feed-overlay');
      if (!overlay || !isOpen) return false;
      isOpen = false;
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = previousOverflow;
      if (document.querySelector('.kc-mobile-nav-btn.active')?.dataset.mobileNav === 'activity') {
        document.querySelectorAll('.kc-mobile-nav-btn').forEach(button =>
          button.classList.toggle('active', button.dataset.mobileNav === 'games'));
      }
      return true;
    }

    function scheduleSync() {
      if (syncQueued || typeof window === 'undefined') return;
      syncQueued = true;
      window.requestAnimationFrame(() => {
        syncQueued = false;
        ensureUI();
      });
    }

    function startBrowserUI() {
      if (typeof window === 'undefined' || typeof document === 'undefined') return false;
      migrateExistingHistory();
      document.addEventListener('click', event => {
        const button = event.target.closest?.('.kc-mobile-nav-btn');
        if (!button) return;
        if (button.dataset.mobileNav === 'activity') open();
        else if (isOpen) close();
      });
      window.addEventListener('keydown', event => {
        if (event.key === 'Escape' && isOpen) close();
      });
      window.addEventListener('message', handleGameMessage);
      window.addEventListener('storage', event => { if (event.key === KEY) scheduleSync(); });
      document.addEventListener('kidscade:activity-changed', scheduleSync);
      document.addEventListener('kidscade:catalog-ready', scheduleSync);
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleSync, { once: true });
      else scheduleSync();
      let attempts = 0;
      const timer = window.setInterval(() => {
        attempts += 1;
        if (ensureUI() || attempts >= 80) window.clearInterval(timer);
      }, 200);
      if (typeof MutationObserver !== 'undefined') {
        bodyObserver = new MutationObserver(() => {
          if (!document.getElementById('kc-feed-launcher') ||
              (document.querySelector('.kc-mobile-nav') &&
               !document.querySelector('[data-mobile-nav="activity"]'))) scheduleSync();
        });
        bodyObserver.observe(document.documentElement, { childList: true, subtree: true });
      }
      return true;
    }

    return Object.freeze({
      key: KEY, types: TYPES, read, record, migrateExistingHistory, markRead, countUnread: () => countUnread(read()),
      render, open, close, handleGameMessage, startBrowserUI
    });
  }

  return Object.freeze({ KEY, TYPES, MAX_EVENTS, clean, emptyState, normalizeState, countUnread, dateKey, create });
});
