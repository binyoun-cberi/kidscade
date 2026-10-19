(() => {
  'use strict';

  const Core = window.MoleculeWorkshopCore;
  if (!Core) throw new Error('분자 공방 준비에 실패했어요.');
  const $ = id => document.getElementById(id);
  const SAVE_KEY = 'kidscade_molecule_workshop_progress_v1';
  let save = Core.normalizeSave(readSave());
  let board = [];
  let selectedGoal = 'water';
  let bestStreak = 0;
  let streak = 0;
  let gameStarted = false;
  let toastTimer = 0;

  function readSave() {
    try {
      if (window.KidscadeStorage?.getJson) return window.KidscadeStorage.getJson(SAVE_KEY, {});
      return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    } catch (_) { return {}; }
  }
  function persist() {
    save = Core.normalizeSave(save);
    try {
      if (window.KidscadeStorage?.setJson) window.KidscadeStorage.setJson(SAVE_KEY, save);
      else localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch (_) { showToast('저장 공간을 사용할 수 없어 이번 발견은 임시로만 보관돼요.'); }
  }
  function sdk(method, payload) {
    try { window.KidscadeGame?.[method]?.(payload); } catch (_) {}
  }
  function startSession() {
    if (gameStarted) return;
    gameStarted = true;
    sdk('start');
  }
  function recipeByGoal() { return Core.recipeById.get(selectedGoal) || Core.RECIPES[0]; }
  function formulaHtml(formula) { return formula.replace(/([0-9]+)/g, '<sub>$1</sub>'); }
  function setGoal(id) {
    if (!Core.recipeById.has(id)) return;
    selectedGoal = id;
    $('goal-select').value = id;
    renderGoal();
  }
  function renderGoal() {
    const goal = recipeByGoal();
    $('goal-name').textContent = goal.name;
    $('goal-formula').innerHTML = formulaHtml(goal.formula);
    $('goal-kind').textContent = goal.kind;
    $('goal-composition').textContent = Core.compositionLabel(goal.composition);
    $('goal-status').textContent = save.completed.includes(goal.id) ? '다시 만들어 보기' : `목표 ${save.completed.length} / ${Core.RECIPES.length}`;
    $('goal-card').style.setProperty('--goal-color', goal.color);
    $('goal-select').value = goal.id;
  }
  function renderMaterials() {
    $('materials').innerHTML = Core.ELEMENTS.map(element => `
      <button class="element-card" type="button" draggable="true" data-symbol="${element.symbol}" aria-label="${element.name} 원자 하나 놓기" style="--atom-color:${element.color}">
        <span class="atom-symbol">${element.symbol}</span><span class="atom-name">${element.name}</span>
      </button>`).join('');
  }
  function renderBoard() {
    const boardEl = $('board');
    boardEl.dataset.count = board.length;
    boardEl.innerHTML = board.length ? board.map((symbol, index) => {
      const element = Core.elementBySymbol.get(symbol);
      return `<button class="tile" type="button" data-index="${index}" aria-label="${element.name} 원자 제거" title="눌러서 빼기" style="--atom-color:${element.color}"><span>${symbol}</span><small>${element.name}</small><i aria-hidden="true">×</i></button>`;
    }).join('') : '<p class="board-empty">원자 타일을 여기에 놓아 봐!</p>';
    $('piece-count').textContent = `${board.length} / ${Core.MAX_TILES} 타일`;
    const counts = Core.countTiles(board);
    $('current-formula').innerHTML = board.length ? formulaHtml(Core.formulaFromCounts(counts)) : '아직 비어 있어요';
    $('combine-button').disabled = board.length === 0;
    $('undo-button').disabled = board.length === 0;
  }
  function renderCollection() {
    $('discovery-count').textContent = `${save.discovered.length} / ${Core.RECIPES.length}`;
    $('collection-discovery-count').textContent = `${save.discovered.length} / ${Core.RECIPES.length}`;
    $('collection-fill').style.width = `${Math.round(save.discovered.length / Core.RECIPES.length * 100)}%`;
    const list = Core.RECIPES.map(recipe => {
      const discovered = save.discovered.includes(recipe.id);
      return `<button class="collection-item ${discovered ? 'is-known' : ''}" type="button" data-goal="${recipe.id}" ${discovered ? '' : 'aria-label="미발견 물질. 목표로 선택"'}>
        <span class="collection-dot" style="--goal-color:${recipe.color}">${discovered ? formulaHtml(recipe.formula) : '?'}</span>
        <span><b>${discovered ? recipe.name : '아직 못 만난 물질'}</b><small>${discovered ? recipe.kind : '원자 조합을 찾아보세요'}</small></span>
      </button>`;
    }).join('');
    $('collection').innerHTML = list;
    $('completed-count').textContent = `${save.completed.length}개 목표 달성`;
  }
  function showToast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2400);
  }
  function addAtom(symbol) {
    if (!Core.elementBySymbol.has(symbol)) return;
    if (board.length >= Core.MAX_TILES) { showToast('작업대가 꽉 찼어. 원자를 하나 빼고 다시 놓아 봐!'); return; }
    startSession();
    board.push(symbol);
    streak = 0;
    renderBoard();
  }
  function checkCombination() {
    startSession();
    const result = Core.findRecipe(board);
    const goal = recipeByGoal();
    if (!result) {
      streak = 0;
      $('result-symbol').textContent = '…';
      $('result-title').textContent = '아직 등록된 조합이 아니야';
      $('result-copy').textContent = '원자 타일의 종류와 개수를 바꿔서 다시 맞춰 봐. 모양보다 화학식의 원자 수를 살펴보면 좋아!';
      $('result-fact').textContent = `지금 작업대: ${Core.compositionLabel(Core.countTiles(board)) || '빈 작업대'}`;
      $('result-next').textContent = '다시 조합하기';
      $('result-dialog').showModal();
      return;
    }
    streak += 1;
    bestStreak = Math.max(bestStreak, streak);
    const fresh = !save.discovered.includes(result.id);
    if (fresh) {
      save.discovered.push(result.id);
      save.discoveries += 1;
      save.bestScore += 100;
    } else {
      save.bestScore += 10;
    }
    const goalReached = result.id === goal.id;
    if (goalReached && !save.completed.includes(goal.id)) save.completed.push(goal.id);
    persist();
    renderCollection();
    renderGoal();
    $('result-symbol').innerHTML = formulaHtml(result.formula);
    $('result-title').textContent = fresh ? `${result.name} 발견!` : `${result.name} 조합 성공!`;
    $('result-copy').textContent = goalReached ? '오늘의 목표까지 완성했어. 새로운 목표를 골라 이어서 탐험해 보자!' : `현재 목표는 ${goal.name}이야. 다른 물질도 발견했으니 목표를 바꾸거나 계속 실험해 봐!`;
    $('result-fact').textContent = result.fact;
    $('result-next').textContent = '계속 탐험하기';
    $('result-dialog').showModal();
    sdk('score', save.bestScore);
    if (goalReached) sdk('result', { scope: 'round', status: 'completed', outcome: 'win', score: save.bestScore });
    if (save.discovered.length === 1) sdk('milestone', { id: 'first_molecule_found', title: '첫 발견', description: `${result.name}을(를) 발견했어요.` });
    board = [];
    renderBoard();
  }
  function showHint() {
    const goal = recipeByGoal();
    const { missing, excess } = Core.hintForComposition(goal.composition, board);
    const format = items => items.map(({ symbol, count }) => `${Core.elementBySymbol.get(symbol).name} ${count}개`).join(' · ');
    if (missing.length && excess.length) showToast(`힌트 · 더 놓기: ${format(missing)} / 빼기: ${format(excess)}`);
    else if (missing.length) showToast(`힌트 · 더 놓기: ${format(missing)}`);
    else if (excess.length) showToast(`힌트 · 빼기: ${format(excess)}`);
    else showToast('필요한 원자 수가 맞아. 조합하기를 눌러 확인해 봐!');
  }
  function resetBoard() { board = []; renderBoard(); }
  function removeTile(index) { board.splice(index, 1); renderBoard(); }

  renderMaterials();
  renderGoal();
  renderCollection();
  renderBoard();

  $('materials').addEventListener('click', event => {
    const button = event.target.closest('[data-symbol]');
    if (button) addAtom(button.dataset.symbol);
  });
  $('materials').addEventListener('dragstart', event => {
    const button = event.target.closest('[data-symbol]');
    if (!button) return;
    event.dataTransfer.setData('text/plain', button.dataset.symbol);
    event.dataTransfer.effectAllowed = 'copy';
  });
  $('board').addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; });
  $('board').addEventListener('drop', event => { event.preventDefault(); addAtom(event.dataTransfer.getData('text/plain')); });
  $('board').addEventListener('click', event => {
    const tile = event.target.closest('[data-index]');
    if (tile) removeTile(Number(tile.dataset.index));
  });
  $('combine-button').addEventListener('click', checkCombination);
  $('undo-button').addEventListener('click', () => { board.pop(); renderBoard(); });
  $('clear-button').addEventListener('click', resetBoard);
  $('hint-button').addEventListener('click', showHint);
  $('goal-select').addEventListener('change', event => setGoal(event.target.value));
  $('collection').addEventListener('click', event => {
    const item = event.target.closest('[data-goal]');
    if (item) { setGoal(item.dataset.goal); showToast(`${recipeByGoal().name}을(를) 다음 목표로 골랐어.`); }
  });
  $('result-next').addEventListener('click', () => $('result-dialog').close());
  $('result-dialog').addEventListener('click', event => { if (event.target === $('result-dialog')) $('result-dialog').close(); });
  $('goal-select').innerHTML = Core.RECIPES.map(recipe => `<option value="${recipe.id}">${recipe.level === 1 ? '기초' : recipe.level === 2 ? '탐험' : '도전'} · ${recipe.name} (${recipe.formula})</option>`).join('');
  $('goal-select').value = selectedGoal;
  renderGoal();
})();
