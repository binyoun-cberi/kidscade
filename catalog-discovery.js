((factory) => {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') {
    window.KidscadeDiscovery = api;
    api.mount();
  }
})(() => {
  'use strict';

  const STYLE_ID = 'kidscade-catalog-discovery-style';
  const COLLECTIONS = Object.freeze({
    featured: { label: '추천', note: '지금 하기 좋은 게임을 골랐어요' },
    quick: { label: '5분 한 판', note: '짧게 즐기기 좋은 게임이에요' },
    together: { label: '같이 하기', note: '친구나 반 친구와 함께하기 좋아요' },
    deep: { label: '푹 빠지기', note: '오래 파고들기 좋은 게임이에요' },
    classroom: { label: '수업용', note: '교실에서 함께 돌리기 좋아요' }
  });

  function supportsAge(game, age) {
    if (!age || age === 'all') return true;
    const ages = Array.isArray(game?.ages) && game.ages.length ? game.ages : [game?.age];
    return ages.includes(age);
  }

  function hash(value) {
    let h = 2166136261;
    for (const ch of String(value || '')) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function collectionMatch(game, key) {
    if (key === 'featured') return game.qualityStatus === 'featured';
    if (key === 'quick') return Number(game.sessionMinutes || 99) <= 5;
    if (key === 'together') return (game.players || []).some(mode => mode !== 'solo');
    if (key === 'deep') return Number(game.sessionMinutes || 0) >= 15;
    if (key === 'classroom') return Boolean(game.classroom);
    return false;
  }

  function collectionGames(games, key, state = {}, limit = 6, seed = 0) {
    const eligible = (Array.isArray(games) ? games : []).filter(game => {
      if (!game || game.disabled || game.qualityStatus === 'rework') return false;
      if (!supportsAge(game, state.age)) return false;
      const subjects = Array.isArray(state.subjects) ? state.subjects : (state.subject && state.subject !== 'all' ? [state.subject] : []);
      const genres = Array.isArray(state.genres) ? state.genres : (state.genre && state.genre !== 'all' ? [state.genre] : []);
      if (subjects.length && !subjects.includes(game.subject)) return false;
      if (genres.length && !genres.includes(game.genre)) return false;
      return true;
    });

    let picked = eligible.filter(game => collectionMatch(game, key));
    if (key === 'featured' && picked.length < limit) {
      const ids = new Set(picked.map(game => game.id));
      picked = picked.concat(eligible.filter(game => !ids.has(game.id)));
    }

    picked.sort((a, b) => {
      const aq = a.qualityStatus === 'featured' ? 1 : 0;
      const bq = b.qualityStatus === 'featured' ? 1 : 0;
      if (aq !== bq) return bq - aq;
      return hash(a.id + ':' + seed) - hash(b.id + ':' + seed);
    });
    return picked.slice(0, limit);
  }

  function currentState() {
    const filter = window.KidscadeFilter?.state?.() || {};
    return {
      age: filter.age || document.body.dataset.kidscadeAge || '',
      subject: filter.subject || 'all',
      genre: filter.genre || document.body.dataset.kidscadeGenre || 'all',
      subjects: Array.isArray(filter.subjects) ? filter.subjects : [],
      genres: Array.isArray(filter.genres) ? filter.genres : []
    };
  }

  function currentSeed() {
    const now = new Date();
    return Number(`${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`);
  }

  function openGame(id) {
    const card = window.KidscadeGames?.getCard?.(id) ||
      document.querySelector(`#game-list > .game-card[data-id="${CSS.escape(String(id || ''))}"]`);
    if (!card || card.classList.contains('disabled')) return false;
    card.click();
    return true;
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .kc-curated-discovery {
        margin:0 0 18px;
        padding:13px 14px 14px;
        border:1px solid rgba(124,92,255,.16);
        border-radius:22px;
        background:linear-gradient(135deg,rgba(124,92,255,.055),var(--kc-panel) 40%);
        box-shadow:0 8px 22px rgba(15,23,42,.045);
        overflow:hidden;
      }
      .kc-curated-head {
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:12px;
        margin-bottom:9px;
      }
      .kc-curated-kicker {
        margin-bottom:2px;
        color:#7c5ce7;
        font-size:.58rem;
        font-weight:1000;
        letter-spacing:.04em;
      }
      .kc-curated-title { font-size:1rem; font-weight:1000; letter-spacing:-.03em; }
      .kc-curated-note { margin-top:2px; color:var(--kc-muted); font-size:.66rem; font-weight:750; }
      .kc-curated-tools {
        display:flex;
        align-items:center;
        justify-content:flex-end;
        gap:6px;
        flex-wrap:wrap;
      }
      .kc-curated-tabs {
        display:flex;
        gap:4px;
        overflow-x:auto;
        scrollbar-width:none;
      }
      .kc-curated-tabs::-webkit-scrollbar { display:none; }
      .kc-curated-tab {
        flex:0 0 auto;
        min-height:28px;
        padding:0 8px;
        border:0;
        border-radius:9px;
        background:transparent;
        color:var(--kc-muted);
        font-size:.61rem;
        font-weight:900;
        cursor:pointer;
      }
      .kc-curated-tab:hover { background:rgba(124,92,255,.06); }
      .kc-curated-tab.active { background:rgba(124,92,255,.10); color:#6d4fd7; }
      .kc-curated-shuffle {
        flex:0 0 auto;
        min-height:30px;
        padding:0 10px;
        border:1px solid rgba(124,92,255,.18);
        border-radius:10px;
        background:var(--kc-panel);
        color:#6d4fd7;
        font:inherit;
        font-size:.61rem;
        font-weight:1000;
        cursor:pointer;
      }
      .kc-curated-shuffle:hover { background:rgba(124,92,255,.07); }
      body.dark-mode .kc-curated-discovery { background:linear-gradient(135deg,rgba(124,92,255,.10),var(--kc-panel) 44%); }
      body.dark-mode .kc-curated-tab.active { background:#342b55; color:#ddd6fe; }
      body.dark-mode .kc-curated-shuffle { background:#263244; color:#ddd6fe; border-color:#4b416c; }
      .kc-curated-list {
        display:grid;
        grid-auto-flow:column;
        grid-auto-columns:minmax(178px,1fr);
        gap:9px;
        overflow-x:auto;
        padding:1px 1px 4px;
        scrollbar-width:thin;
      }
      .kc-curated-card {
        min-height:126px;
        padding:9px;
        border:1px solid var(--kc-line);
        border-radius:17px;
        background:color-mix(in srgb,var(--kc-panel) 96%,#f8fafc 4%);
        color:var(--kc-ink);
        text-align:left;
        cursor:pointer;
        display:grid;
        grid-template-columns:56px minmax(0,1fr);
        gap:9px;
        align-items:center;
      }
      .kc-curated-card:hover { transform:translateY(-2px); border-color:rgba(124,92,255,.28); }
      .kc-curated-cover {
        width:56px;
        height:76px;
        border-radius:12px;
        object-fit:cover;
        background:#f3f4f6;
      }
      .kc-curated-icon {
        width:56px;
        height:76px;
        border-radius:12px;
        display:grid;
        place-items:center;
        background:#f3f4f6;
        font-size:2rem;
      }
      body.dark-mode .kc-curated-cover, body.dark-mode .kc-curated-icon { background:#263244; }
      .kc-curated-card-title { font-size:.78rem; line-height:1.25; font-weight:1000; word-break:keep-all; }
      .kc-curated-card-meta { margin-top:5px; color:var(--kc-muted); font-size:.58rem; font-weight:850; line-height:1.35; }
      .kc-curated-card-featured { margin-top:5px; color:#7c5ce7; font-size:.57rem; font-weight:1000; }
      @media (max-width:940px) {
        .kc-curated-discovery { padding:11px; margin-bottom:13px; border-radius:18px; }
        .kc-curated-head { display:block; }
        .kc-curated-tools { margin-top:8px; justify-content:flex-start; flex-wrap:nowrap; overflow-x:auto; }
        .kc-curated-list { grid-auto-columns:minmax(168px,72vw); }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureShell() {
    let shell = document.getElementById('kc-curated-discovery');
    if (shell) return shell;
    const library = document.querySelector('.kc-library-head');
    if (!library?.parentElement) return null;

    shell = document.createElement('section');
    shell.id = 'kc-curated-discovery';
    shell.className = 'kc-curated-discovery';
    shell.setAttribute('aria-label', '추천 게임');
    shell.innerHTML = `
      <div class="kc-curated-head">
        <div>
          <div class="kc-curated-kicker">KIDSCADE PICK</div>
          <div class="kc-curated-title">✨ 뭐 할지 모르겠다면</div>
          <div class="kc-curated-note" id="kc-curated-note">선택한 태그 안에서 게임을 골라드려요.</div>
        </div>
        <div class="kc-curated-tools">
          <div class="kc-curated-tabs" role="tablist" aria-label="추천 기준"></div>
          <button class="kc-curated-shuffle" type="button">🎲 다른 추천</button>
        </div>
      </div>
      <div class="kc-curated-list" id="kc-curated-list"></div>
    `;
    library.parentElement.insertBefore(shell, library);
    return shell;
  }

  function makeCuratedCard(game, taxonomy) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'kc-curated-card';
    button.dataset.gameId = game.id;

    let visual;
    if (game.cover) {
      visual = document.createElement('img');
      visual.className = 'kc-curated-cover';
      visual.src = game.cover;
      visual.alt = '';
      visual.loading = 'lazy';
    } else {
      visual = document.createElement('div');
      visual.className = 'kc-curated-icon';
      visual.textContent = game.icon || '🎮';
    }

    const copy = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'kc-curated-card-title';
    title.textContent = game.title;

    const meta = document.createElement('div');
    meta.className = 'kc-curated-card-meta';
    const genre = taxonomy?.genres?.[game.genre] || game.genre;
    const difficulty = taxonomy?.difficulty?.[game.difficulty] || game.difficulty;
    const people = (game.players || []).includes('online') ? '온라인' :
      (game.players || []).includes('localMulti') ? '여럿이' :
      (game.players || []).includes('local2') ? '2인' : '혼자';
    meta.textContent = `${genre} · ${game.sessionMinutes}분 · ${difficulty} · ${people}`;

    copy.append(title, meta);
    if (game.qualityStatus === 'featured') {
      const featured = document.createElement('div');
      featured.className = 'kc-curated-card-featured';
      featured.textContent = 'KIDSCADE 추천';
      copy.appendChild(featured);
    }
    button.append(visual, copy);
    return button;
  }

  let activeCollection = 'featured';
  let recommendationSalt = 0;

  function render() {
    const shell = ensureShell();
    const list = document.getElementById('kc-curated-list');
    const tabs = shell?.querySelector('.kc-curated-tabs');
    const note = document.getElementById('kc-curated-note');
    const games = window.KidscadeGames?.all?.() || [];
    if (!shell || !list || !tabs || !games.length) return false;

    const state = currentState();
    const available = Object.keys(COLLECTIONS).filter(key =>
      collectionGames(games, key, state, 1, currentSeed() + recommendationSalt).length > 0
    );
    if (!available.length) {
      shell.hidden = true;
      return false;
    }
    shell.hidden = false;
    if (!available.includes(activeCollection)) activeCollection = available[0];

    tabs.replaceChildren();
    for (const key of available) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'kc-curated-tab' + (key === activeCollection ? ' active' : '');
      button.dataset.collection = key;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(key === activeCollection));
      button.textContent = COLLECTIONS[key].label;
      tabs.appendChild(button);
    }

    const picked = collectionGames(games, activeCollection, state, 6, currentSeed() + recommendationSalt);
    list.replaceChildren(...picked.map(game => makeCuratedCard(game, window.KidscadeCatalog?.taxonomy)));
    if (note) {
      const tagCount = (state.subjects?.length || 0) + (state.genres?.length || 0);
      const prefix = tagCount ? `선택한 ${tagCount}개 태그 안에서 · ` : '';
      note.textContent = prefix + COLLECTIONS[activeCollection].note;
    }
    return true;
  }

  function bindCurated() {
    const shell = ensureShell();
    if (!shell || shell.dataset.bound === '1') return;
    shell.dataset.bound = '1';
    shell.addEventListener('click', event => {
      const tab = event.target.closest('.kc-curated-tab');
      if (tab) {
        activeCollection = tab.dataset.collection || 'featured';
        render();
        return;
      }
      const shuffle = event.target.closest('.kc-curated-shuffle');
      if (shuffle) {
        recommendationSalt += 97;
        render();
        return;
      }
      const card = event.target.closest('.kc-curated-card');
      if (card) openGame(card.dataset.gameId);
    });
  }

  function refresh() {
    bindCurated();
    render();
  }

  function mount() {
    if (typeof document === 'undefined') return;
    const init = () => {
      addStyles();
      refresh();
      document.addEventListener('kidscade:filter-applied', () => requestAnimationFrame(render));
      document.addEventListener('kidscade:registry-ready', () => requestAnimationFrame(render));
      window.addEventListener('pageshow', render);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
    else init();
  }

  return Object.freeze({ COLLECTIONS, supportsAge, collectionGames, mount, render });
});
