(() => {
  'use strict';

  const STYLE_ID = 'kidscade-unified-tag-filter-style';

  const DEFAULT_CATEGORY_NAMES = {
    all: '전체', math: '수학', korean: '국어', lang: '외국어',
    trivia: '상식·탐구', music: '음악·예술', job: '직업'
  };
  const DEFAULT_SUBJECT_NAMES = {
    all: '전체', math: '수학', korean: '국어', language: '외국어·한자',
    social: '사회', science: '과학·환경', arts: '예술', career: '진로', thinking: '사고력'
  };
  const DEFAULT_GENRE_NAMES = {
    all: '전체 장르', action: '액션', puzzle: '퍼즐', strategy: '전략',
    simulation: '시뮬레이션', management: '경영', quiz: '퀴즈',
    rhythm: '리듬', sports: '스포츠', sandbox: '샌드박스', rpg: 'RPG'
  };

  function clean(value) {
    return String(value || '').trim().toLowerCase();
  }

  function normalizeValues(value) {
    const source = Array.isArray(value) ? value : [value];
    return Array.from(new Set(source.map(clean).filter(item => item && item !== 'all')));
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID) || !document.head) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .kc-tag-head {
        display:flex;
        align-items:flex-end;
        justify-content:space-between;
        gap:14px;
        margin:8px 2px 7px;
      }
      .kc-tag-head .kc-filter-label {
        margin:0 !important;
        color:var(--kc-ink,#334155);
        font-size:.78rem;
        font-weight:1000;
      }
      .kc-tag-help {
        margin-top:2px;
        color:var(--kc-muted,#64748b);
        font-size:.60rem;
        font-weight:750;
      }
      .kc-tag-head-actions {
        display:flex;
        align-items:center;
        justify-content:flex-end;
        gap:7px;
        flex-wrap:wrap;
      }
      .kc-tag-selection-status {
        color:var(--kc-muted,#64748b);
        font-size:.62rem;
        font-weight:900;
        white-space:nowrap;
      }
      .kc-tag-reset {
        min-height:29px;
        padding:0 10px;
        border:1px solid rgba(124,92,255,.18);
        border-radius:999px;
        background:rgba(124,92,255,.06);
        color:#6d4fd7;
        font:inherit;
        font-size:.61rem;
        font-weight:950;
        cursor:pointer;
      }
      .kc-tag-reset:not(.active) {
        background:transparent;
        color:var(--kc-muted,#64748b);
        border-color:var(--kc-line,rgba(148,163,184,.24));
      }
      .kc-tag-nav {
        display:grid;
        gap:7px;
        padding:10px 11px;
        border:1px solid var(--kc-line,rgba(148,163,184,.22));
        border-radius:18px;
        background:color-mix(in srgb,var(--kc-panel,#fff) 96%,#f8fafc 4%);
        box-shadow:0 6px 18px rgba(15,23,42,.035);
      }
      .kc-tag-group {
        min-width:0;
        display:grid;
        grid-template-columns:48px minmax(0,1fr);
        align-items:start;
        gap:8px;
      }
      .kc-tag-group + .kc-tag-group {
        padding-top:7px;
        border-top:1px dashed rgba(148,163,184,.24);
      }
      .kc-tag-group-label {
        min-height:31px;
        display:flex;
        align-items:center;
        justify-content:center;
        border-radius:10px;
        background:#f4f5f8;
        color:#667085;
        font-size:.61rem;
        font-weight:1000;
      }
      .kc-tag-group[data-tag-group="subject"] .kc-tag-group-label {
        background:#f4f0ff;
        color:#7552d7;
      }
      .kc-tag-group[data-tag-group="genre"] .kc-tag-group-label {
        background:#edf9f6;
        color:#17866f;
      }
      .kc-tag-group-items {
        min-width:0;
        display:flex;
        flex-wrap:wrap;
        gap:5px;
      }
      .kc-tag-filter {
        min-height:31px;
        padding:0 10px;
        border:1px solid var(--kc-line,rgba(148,163,184,.24));
        border-radius:999px;
        background:var(--kc-panel,#fff);
        color:var(--kc-muted,#64748b);
        font:inherit;
        font-size:.65rem;
        font-weight:900;
        cursor:pointer;
        transition:transform .14s ease,background .14s ease,border-color .14s ease,box-shadow .14s ease;
      }
      .kc-tag-filter:hover {
        transform:translateY(-1px);
        border-color:rgba(124,92,255,.28);
      }
      .kc-tag-filter.active {
        color:#fff;
        border-color:transparent;
        box-shadow:0 6px 14px rgba(79,70,229,.13);
      }
      .kc-tag-filter[data-tag-type="subject"].active {
        background:linear-gradient(135deg,#7c5cff,#9d62ed);
      }
      .kc-tag-filter[data-tag-type="genre"].active {
        background:linear-gradient(135deg,#2387f3,#17a981);
      }
      body.dark-mode .kc-tag-nav { background:#1e293b; border-color:#334155; }
      body.dark-mode .kc-tag-group-label { background:#2a3547; color:#cbd5e1; }
      body.dark-mode .kc-tag-group[data-tag-group="subject"] .kc-tag-group-label { background:#342b55; color:#ded5ff; }
      body.dark-mode .kc-tag-group[data-tag-group="genre"] .kc-tag-group-label { background:#183d39; color:#9fe6d3; }
      body.dark-mode .kc-tag-filter { background:#1e293b; color:#cbd5e1; border-color:#3b4759; }
      body.dark-mode .kc-tag-filter.active { color:#fff; }
      body.dark-mode .kc-tag-reset { color:#d9ceff; background:#342b55; border-color:#55477a; }

      @media (max-width:940px) {
        .kc-tag-head { margin-top:6px; }
        .kc-tag-nav { padding:9px; }
        .kc-tag-group { grid-template-columns:44px minmax(0,1fr); gap:6px; }
        .kc-tag-filter { min-height:31px; padding:0 9px; font-size:.63rem; }
      }
      @media (max-width:620px) {
        .kc-tag-head { align-items:flex-start; }
        .kc-tag-help { display:none; }
        .kc-tag-head-actions { gap:5px; }
        .kc-tag-selection-status { font-size:.56rem; }
        .kc-tag-reset { min-height:27px; padding:0 8px; font-size:.56rem; }
        .kc-tag-nav { gap:6px; padding:8px; border-radius:15px; }
        .kc-tag-group { grid-template-columns:1fr; gap:5px; }
        .kc-tag-group-label {
          min-height:auto;
          justify-content:flex-start;
          padding:0 2px;
          background:transparent !important;
          font-size:.58rem;
        }
        .kc-tag-group-items { gap:4px; }
        .kc-tag-filter { min-height:29px; padding:0 8px; font-size:.59rem; }
      }
    `;
    document.head.appendChild(style);
  }

  function selectedTagValues(type) {
    const nav = document.querySelector('.kc-tag-nav');
    if (!nav) return [];
    return Array.from(nav.querySelectorAll(`.kc-tag-filter.active[data-tag-type="${type}"]`))
      .map(button => clean(button.dataset.tag))
      .filter(Boolean);
  }

  function getStateFromDom() {
    const tagNav = document.querySelector('.kc-tag-nav');
    const age = document.body.dataset.kidscadeAge || localStorage.getItem('kidscade_age') || '';

    if (tagNav) {
      const subjects = selectedTagValues('subject');
      const genres = selectedTagValues('genre');
      return {
        age,
        category: 'all',
        subject: subjects.length === 1 ? subjects[0] : 'all',
        genre: genres.length === 1 ? genres[0] : 'all',
        subjects,
        genres,
        tagMode: true,
        keyword: document.getElementById('game-search-input')?.value || '',
        categoryNames: DEFAULT_CATEGORY_NAMES,
        subjectNames: DEFAULT_SUBJECT_NAMES,
        genreNames: DEFAULT_GENRE_NAMES,
        ageNames: {}
      };
    }

    const activeSubject = document.querySelector('.filter-nav-btn.active')?.dataset?.subject ||
      document.querySelector('.filter-nav-btn.active')?.dataset?.filter || 'all';
    const activeGenre = document.querySelector('.kc-genre-filter.active')?.dataset?.genre ||
      document.body.dataset.kidscadeGenre || 'all';
    return {
      age,
      category: 'all',
      subject: activeSubject,
      genre: activeGenre,
      subjects: normalizeValues(activeSubject),
      genres: normalizeValues(activeGenre),
      tagMode: false,
      keyword: document.getElementById('game-search-input')?.value || '',
      categoryNames: DEFAULT_CATEGORY_NAMES,
      subjectNames: DEFAULT_SUBJECT_NAMES,
      genreNames: DEFAULT_GENRE_NAMES,
      ageNames: {}
    };
  }

  function getGames() {
    if (window.KidscadeGames?.all) return window.KidscadeGames.all();
    return Array.from(document.querySelectorAll('#game-list > .game-card')).map(card => ({
      id: card.dataset.id || '',
      age: card.dataset.age || 'all',
      ages: (card.dataset.ages || card.dataset.age || 'all').split(',').map(value => value.trim()).filter(Boolean),
      category: card.dataset.category || 'all',
      subject: card.dataset.subject || 'thinking',
      genre: card.dataset.genre || 'simulation',
      title: card.querySelector('.game-title')?.textContent || '',
      description: card.querySelector('.game-desc')?.textContent || ''
    }));
  }

  function getCard(id) {
    return window.KidscadeGames?.getCard?.(id) ||
      document.querySelector(`#game-list > .game-card[data-id="${CSS.escape(String(id || ''))}"]`);
  }

  function matchesAge(game, age) {
    if (!age || age === 'all') return true;
    if (window.KidscadeGames?.supportsAge) return window.KidscadeGames.supportsAge(game, age);
    if (Array.isArray(game?.ages)) return game.ages.includes(age);
    return game?.age === age;
  }

  function updateTagStatus(subjects, genres, visibleCount = null) {
    const status = document.getElementById('kc-tag-selection-status');
    const count = subjects.length + genres.length;
    if (!status) return;
    const result = Number.isFinite(visibleCount) ? `${visibleCount}개 게임` : '';
    status.textContent = count
      ? `${count}개 태그 · ${result || '결과 계산 중'}`
      : (result ? `${result} · 여러 개 선택 가능` : '여러 개 선택 가능');
  }

  function apply(input = {}) {
    const fallback = getStateFromDom();
    const unifiedTags = Boolean(document.querySelector('.kc-tag-nav'));

    const subjects = unifiedTags
      ? (Array.isArray(input.subjects) ? normalizeValues(input.subjects) : fallback.subjects)
      : (Array.isArray(input.subjects) ? normalizeValues(input.subjects) : normalizeValues(input.subject ?? fallback.subject));

    const genres = unifiedTags
      ? (Array.isArray(input.genres) ? normalizeValues(input.genres) : fallback.genres)
      : (Array.isArray(input.genres) ? normalizeValues(input.genres) : normalizeValues(input.genre ?? fallback.genre));

    const state = {
      age: input.age || fallback.age,
      category: input.category ?? fallback.category ?? 'all',
      subject: subjects.length === 1 ? subjects[0] : 'all',
      genre: genres.length === 1 ? genres[0] : 'all',
      subjects,
      genres,
      tagMode: unifiedTags,
      keyword: input.keyword ?? fallback.keyword,
      categoryNames: input.categoryNames || fallback.categoryNames || DEFAULT_CATEGORY_NAMES,
      subjectNames: input.subjectNames || fallback.subjectNames || DEFAULT_SUBJECT_NAMES,
      genreNames: input.genreNames || fallback.genreNames || DEFAULT_GENRE_NAMES,
      ageNames: input.ageNames || fallback.ageNames || {}
    };

    document.body.dataset.kidscadeSubject = state.subject;
    document.body.dataset.kidscadeGenre = state.genre;

    const keyword = clean(state.keyword);
    let visibleCount = 0;
    let ageTotalCount = 0;

    getGames().forEach(game => {
      const card = getCard(game.id);
      if (!card) return;

      const matchAge = matchesAge(game, state.age);
      const matchCategory = state.category === 'all' || game.category === state.category;
      const matchSubject = subjects.length === 0 || subjects.includes(clean(game.subject));
      const matchGenre = genres.length === 0 || genres.includes(clean(game.genre));
      const categoryLabel = state.categoryNames?.[game.category] || DEFAULT_CATEGORY_NAMES[game.category] || '';
      const subjectLabel = state.subjectNames?.[game.subject] || DEFAULT_SUBJECT_NAMES[game.subject] || '';
      const genreLabel = state.genreNames?.[game.genre] || DEFAULT_GENRE_NAMES[game.genre] || '';
      const searchText = clean(`${game.title || ''} ${game.description || ''} ${categoryLabel} ${subjectLabel} ${genreLabel}`);
      const matchSearch = !keyword || searchText.includes(keyword);

      if (matchAge) ageTotalCount++;
      const visible = matchAge && matchCategory && matchSubject && matchGenre && matchSearch;
      card.classList.toggle('hidden', !visible);
      if (visible) visibleCount++;
    });

    const emptyMessage = document.getElementById('empty-message');
    if (emptyMessage) emptyMessage.classList.toggle('hidden', visibleCount !== 0);

    const visibleGameCount = document.getElementById('visible-game-count');
    if (visibleGameCount) {
      const ageLabel = state.ageNames?.[state.age] || document.getElementById('current-age-label')?.textContent?.trim() || '선택한 모드';
      visibleGameCount.textContent = `${ageLabel} 게임 ${visibleCount}/${ageTotalCount}개 표시`;
    }

    updateTagStatus(subjects, genres, visibleCount);
    document.dispatchEvent(new CustomEvent('kidscade:filter-applied', {
      detail: { ...state, visibleCount, ageTotalCount }
    }));
    return true;
  }

  function syncTagButtons() {
    const root = document.querySelector('.kc-discovery');
    const nav = root?.querySelector('.kc-tag-nav');
    if (!root || !nav) return;
    const selected = nav.querySelectorAll('.kc-tag-filter.active');
    const reset = root.querySelector('[data-tag-reset]');
    const hasSelection = selected.length > 0;
    reset?.classList.toggle('active', !hasSelection);
    reset?.setAttribute('aria-pressed', String(!hasSelection));
    nav.querySelectorAll('.kc-tag-filter').forEach(button => {
      button.setAttribute('aria-pressed', String(button.classList.contains('active')));
    });
  }

  function bindTagFilters() {
    const root = document.querySelector('.kc-discovery');
    const nav = root?.querySelector('.kc-tag-nav');
    if (!root || !nav || root.dataset.tagBound === '1') return false;
    root.dataset.tagBound = '1';
    syncTagButtons();

    root.addEventListener('click', event => {
      const reset = event.target.closest('[data-tag-reset]');
      if (reset && root.contains(reset)) {
        nav.querySelectorAll('.kc-tag-filter').forEach(item => item.classList.remove('active'));
        syncTagButtons();
        apply({});
        return;
      }

      const button = event.target.closest('.kc-tag-filter');
      if (!button || !nav.contains(button)) return;
      button.classList.toggle('active');
      syncTagButtons();
      apply({});
    });
    return true;
  }

  function refresh() {
    bindTagFilters();
    return apply(getStateFromDom());
  }

  window.KidscadeFilter = { apply, refresh, state: getStateFromDom, matchesAge };

  function boot() {
    installStyles();
    bindTagFilters();
    refresh();
    window.addEventListener('pageshow', refresh);
    document.addEventListener('kidscade:registry-ready', refresh);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
