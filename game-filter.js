(() => {
  'use strict';

  const DEFAULT_CATEGORY_NAMES = {
    all: '전체', math: '수학', korean: '국어', lang: '외국어',
    trivia: '상식·탐구', music: '음악·예술', job: '직업'
  };

  function clean(value) {
    return String(value || '').trim().toLowerCase();
  }

  function getStateFromDom() {
    const activeCategory = document.querySelector('.filter-nav-btn.active')?.dataset?.filter || 'all';
    return {
      age: document.body.dataset.kidscadeAge || localStorage.getItem('kidscade_age') || '',
      category: activeCategory,
      keyword: document.getElementById('game-search-input')?.value || '',
      categoryNames: DEFAULT_CATEGORY_NAMES,
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
      category: input.category || fallback.category || 'all',
      keyword: input.keyword ?? fallback.keyword,
      categoryNames: input.categoryNames || fallback.categoryNames || DEFAULT_CATEGORY_NAMES,
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
      const categoryLabel = state.categoryNames?.[game.category] || DEFAULT_CATEGORY_NAMES[game.category] || '';
      const searchText = clean(`${game.title || ''} ${game.description || ''} ${categoryLabel}`);
      const matchSearch = !keyword || searchText.includes(keyword);

      if (matchAge) ageTotalCount++;
      const visible = matchAge && matchCategory && matchSearch;
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
