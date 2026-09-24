(() => {
  'use strict';

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
    rhythm: '리듬', sports: '스포츠', sandbox: '샌드박스'
  };

  function clean(value) {
    return String(value || '').trim().toLowerCase();
  }

  function getStateFromDom() {
    const activeSubject = document.querySelector('.filter-nav-btn.active')?.dataset?.subject ||
      document.querySelector('.filter-nav-btn.active')?.dataset?.filter || 'all';
    const activeGenre = document.querySelector('.kc-genre-filter.active')?.dataset?.genre ||
      document.body.dataset.kidscadeGenre || 'all';
    return {
      age: document.body.dataset.kidscadeAge || localStorage.getItem('kidscade_age') || '',
      category: 'all',
      subject: activeSubject,
      genre: activeGenre,
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

  function apply(input = {}) {
    const fallback = getStateFromDom();
    const state = {
      age: input.age || fallback.age,
      category: input.category ?? fallback.category ?? 'all',
      subject: input.subject ?? fallback.subject ?? 'all',
      genre: input.genre ?? fallback.genre ?? 'all',
      keyword: input.keyword ?? fallback.keyword,
      categoryNames: input.categoryNames || fallback.categoryNames || DEFAULT_CATEGORY_NAMES,
      subjectNames: input.subjectNames || fallback.subjectNames || DEFAULT_SUBJECT_NAMES,
      genreNames: input.genreNames || fallback.genreNames || DEFAULT_GENRE_NAMES,
      ageNames: input.ageNames || fallback.ageNames || {}
    };

    const keyword = clean(state.keyword);
    let visibleCount = 0;
    let ageTotalCount = 0;

    getGames().forEach(game => {
      const card = getCard(game.id);
      if (!card) return;

      const matchAge = matchesAge(game, state.age);
      const matchCategory = state.category === 'all' || game.category === state.category;
      const matchSubject = state.subject === 'all' || game.subject === state.subject;
      const matchGenre = state.genre === 'all' || game.genre === state.genre;
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

    document.dispatchEvent(new CustomEvent('kidscade:filter-applied', {
      detail: { ...state, visibleCount, ageTotalCount }
    }));
    return true;
  }

  function refresh() {
    return apply(getStateFromDom());
  }

  window.KidscadeFilter = { apply, refresh, state: getStateFromDom, matchesAge };

  function boot() {
    refresh();
    window.addEventListener('pageshow', refresh);
    document.addEventListener('kidscade:registry-ready', refresh);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
