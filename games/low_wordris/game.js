(() => {
  'use strict';

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d', { alpha:false });
  const $ = id => document.getElementById(id);

  const COLS = 8;
  const ROWS = 12;
  const WORDS = window.WORDRIS_WORDS || {};
  const WORD_SET = new Set(Object.keys(WORDS));
  const MAX_WORD = Math.max(3, ...[...WORD_SET].map(w => w.length));
  const VOWELS = new Set(['A','E','I','O','U']);
  const LETTER_WEIGHTS = [
    ['E',12.7],['T',9.1],['A',8.2],['O',7.5],['I',7.0],['N',6.7],['S',6.3],['H',6.1],['R',6.0],
    ['D',4.3],['L',4.0],['C',2.8],['U',2.8],['M',2.4],['W',2.4],['F',2.2],['G',2.0],['Y',2.0],
    ['P',1.9],['B',1.5],['V',1.0],['K',0.8],['J',0.15],['X',0.15],['Q',0.10],['Z',0.07]
  ];
  const DIFFICULTY = {
    easy:{ base:1120, min:620, step:42 },
    normal:{ base:850, min:390, step:40 },
    hard:{ base:620, min:260, step:34 }
  };
  const TUTORIAL = [
    {title:'1. 글자를 원하는 곳에 놓아요',text:'위에서 내려오는 알파벳을 좌우로 움직이세요. DROP을 누르면 바로 바닥까지 내려갑니다.',html:'<div class="tutorial-demo"><span class="tutorial-arrow">←</span><i class="tutorial-block">A</i><span class="tutorial-arrow">→</span></div>'},
    {title:'2. 가로·세로로 단어를 만들어요',text:'3글자 이상 영단어가 완성되면 자동으로 빛나고 사라집니다. 긴 단어일수록 점수가 훨씬 커요.',html:'<div class="tutorial-demo"><i class="tutorial-block gold">C</i><i class="tutorial-block gold">A</i><i class="tutorial-block gold">T</i></div>'},
    {title:'3. 같은 단어는 두 번 못 써요',text:'이번 판에 CAT을 이미 만들었다면 CAT은 다시 사라지지 않습니다. 다른 단어로 확장해 보세요.',html:'<div class="tutorial-demo"><i class="tutorial-block">C</i><i class="tutorial-block">A</i><i class="tutorial-block">T</i><strong style="font-size:28px;color:#ff7c8f">×</strong></div>'},
    {title:'4. 무너지며 새 단어가 생기면 콤보!',text:'단어가 사라진 뒤 위 글자들이 내려와 또 다른 단어를 만들면 연쇄 콤보가 됩니다.',html:'<div class="tutorial-demo"><i class="tutorial-block gold">R</i><i class="tutorial-block gold">A</i><i class="tutorial-block gold">I</i><i class="tutorial-block gold">N</i><b style="margin-left:8px;color:#ffd76f">×2</b></div>'}
  ];

  let board = makeBoard(), active = null, queue = [], used = new Set();
  let score = 0, wordCount = 0, level = 1, comboBest = 0, longestWord = '';
  let gameRunning = false, resolving = false, paused = false;
  let lastFrame = 0, dropAccumulator = 0, difficulty = 'normal', vowelGap = 0, toastTimer = 0, tutorialStep = 0, runToken = 0;

  function makeBoard(){ return Array.from({length:ROWS}, () => Array(COLS).fill(null)); }

  function weightedLetter(pool = LETTER_WEIGHTS){
    const total = pool.reduce((sum, [,w]) => sum + w, 0);
    let n = Math.random() * total;
    for (const [letter, weight] of pool) { n -= weight; if (n <= 0) return letter; }
    return pool[0][0];
  }

  function nextLetter(){
    const letter = vowelGap >= 4
      ? weightedLetter(LETTER_WEIGHTS.filter(([l]) => VOWELS.has(l)))
      : weightedLetter();
    vowelGap = VOWELS.has(letter) ? 0 : vowelGap + 1;
    return letter;
  }

  function fillQueue(){ while (queue.length < 4) queue.push(nextLetter()); renderQueue(); }
  function renderQueue(){ $('nextLetters').innerHTML = queue.slice(0,3).map(l => '<i>'+l+'</i>').join(''); }

  function spawn(){
    fillQueue();
    const letter = queue.shift();
    queue.push(nextLetter());
    renderQueue();
    const x = Math.floor(COLS / 2);
    if (board[0][x]) { endGame(); return false; }
    active = { x, y:0, letter };
    return true;
  }

  function fallDelay(){
    const cfg = DIFFICULTY[difficulty] || DIFFICULTY.normal;
    return Math.max(cfg.min, cfg.base - (level - 1) * cfg.step);
  }

  function canMove(dx, dy){
    if (!active) return false;
    const nx = active.x + dx, ny = active.y + dy;
    return nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && !board[ny][nx];
  }

  function move(dx){
    if (!gameRunning || resolving || paused || !active) return;
    if (canMove(dx,0)) active.x += dx;
    draw();
  }

  function softDrop(){
    if (!gameRunning || resolving || paused || !active) return;
    if (canMove(0,1)) { active.y++; score += 1; updateHUD(); }
    else lockActive();
    draw();
  }

  function hardDrop(){
    if (!gameRunning || resolving || paused || !active) return;
    let distance = 0;
    while (canMove(0,1)) { active.y++; distance++; }
    score += distance * 2;
    updateHUD();
    lockActive();
  }

  function lockActive(){
    if (!active || resolving || !gameRunning) return;
    board[active.y][active.x] = { letter:active.letter };
    active = null;
    resolving = true;
    draw();
    setTimeout(resolveBoard, 80);
  }

  function collectLineCells(){
    const out = [];
    for (let y=0;y<ROWS;y++){
      let start = 0;
      while (start < COLS){
        while (start < COLS && !board[y][start]) start++;
        if (start >= COLS) break;
        let end = start;
        while (end < COLS && board[y][end]) end++;
        if (end - start >= 3) out.push(Array.from({length:end-start},(_,i)=>({x:start+i,y})));
        start = end + 1;
      }
    }
    for (let x=0;x<COLS;x++){
      let start = 0;
      while (start < ROWS){
        while (start < ROWS && !board[start][x]) start++;
        if (start >= ROWS) break;
        let end = start;
        while (end < ROWS && board[end][x]) end++;
        if (end - start >= 3) out.push(Array.from({length:end-start},(_,i)=>({x,y:start+i})));
        start = end + 1;
      }
    }
    return out;
  }

  function candidatesFromLine(cells){
    const letters = cells.map(p => board[p.y][p.x]?.letter || '').join('');
    const candidates = [], maxLen = Math.min(MAX_WORD, cells.length);
    for (let len=maxLen; len>=3; len--){
      for (let start=0; start+len<=cells.length; start++){
        const word = letters.slice(start,start+len);
        if (WORD_SET.has(word)) candidates.push({word,cells:cells.slice(start,start+len)});
      }
    }
    return candidates;
  }

  function findWords(){
    const seen = new Set(), candidates = [];
    for (const line of collectLineCells()){
      for (const c of candidatesFromLine(line)){
        const key = c.cells.map(p => p.x+','+p.y).join('|') + ':' + c.word;
        if (!seen.has(key)){ seen.add(key); candidates.push(c); }
      }
    }
    candidates.sort((a,b) => b.word.length - a.word.length || a.word.localeCompare(b.word));
    return candidates;
  }

  function selectClearable(candidates){
    const occupied = new Set(), picked = [];
    for (const c of candidates){
      if (used.has(c.word)) continue;
      if (c.cells.some(p => occupied.has(p.x+','+p.y))) continue;
      picked.push(c);
      c.cells.forEach(p => occupied.add(p.x+','+p.y));
    }
    return picked;
  }

  async function resolveBoard(){
    let chain = 0, firstPass = true;
    const token = runToken;
    while (gameRunning && token === runToken){
      const all = findWords(), picked = selectClearable(all);
      if (!picked.length){
        if (firstPass) {
          const duplicate = all.find(c => used.has(c.word));
          if (duplicate) showToast('이미 쓴 단어 · '+duplicate.word, 'bad', 780);
        }
        break;
      }
      firstPass = false;
      chain++;
      comboBest = Math.max(comboBest, chain);
      await highlightWords(picked, chain, token);
      if (!gameRunning || token !== runToken) return;
      clearWords(picked, chain);
      applyGravity();
      draw();
      await wait(155);
    }
    resolving = false;
    if (!gameRunning || token !== runToken) return;
    if (!spawn()) return;
    draw();
  }

  function highlightWords(words, chain, token){
    const highlights = new Set();
    words.forEach(w => w.cells.forEach(p => highlights.add(p.x+','+p.y)));
    draw(highlights);
    showToast(words.map(w => w.word+' · '+WORDS[w.word]).join(' / '), 'good', 620);
    if (chain > 1) showCombo(chain);
    return wait(chain > 1 ? 360 : 310, token);
  }

  function clearWords(words, chain){
    const cells = new Set();
    let gained = 0;
    for (const item of words){
      used.add(item.word);
      wordCount++;
      if (item.word.length > longestWord.length) longestWord = item.word;
      gained += Math.round(item.word.length * item.word.length * 10 * (1 + (chain-1)*0.5));
      item.cells.forEach(p => cells.add(p.x+','+p.y));
    }
    for (const key of cells){
      const [x,y] = key.split(',').map(Number);
      board[y][x] = null;
    }
    score += gained;
    level = 1 + Math.floor(wordCount / 5);
    renderUsedWords(words.map(w => w.word));
    updateHUD();
    try { window.KidscadeGame?.sound?.('correct'); } catch (_) {}
  }

  function applyGravity(){
    for (let x=0;x<COLS;x++){
      const stack = [];
      for (let y=ROWS-1;y>=0;y--) if (board[y][x]) stack.push(board[y][x]);
      for (let y=ROWS-1, i=0;y>=0;y--) board[y][x] = i < stack.length ? stack[i++] : null;
    }
  }

  function escapeHtml(value){ return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }

  function renderUsedWords(latest=[]){
    const wrap = $('usedWords');
    $('usedCount').textContent = used.size;
    if (!used.size){ wrap.innerHTML = '<span class="empty-note">아직 만든 단어가 없어요.</span>'; return; }
    const latestSet = new Set(latest);
    wrap.innerHTML = [...used].slice().reverse().map(word =>
      '<button type="button" class="'+(latestSet.has(word)?'latest':'')+'" title="'+escapeHtml(WORDS[word] || '')+'">'+word+'</button>'
    ).join('');
  }

  function updateHUD(){
    $('score').textContent = score.toLocaleString('ko-KR');
    $('wordCount').textContent = String(wordCount);
    $('level').textContent = String(level);
    try { window.KidscadeGame?.score?.(score); } catch (_) {}
  }

  function showToast(text, type='', duration=650){
    const el = $('toast');
    clearTimeout(toastTimer);
    el.textContent = text;
    el.className = 'toast show '+type;
    toastTimer = setTimeout(() => { el.className = 'toast'; }, duration);
  }

  function showCombo(chain){
    const el = $('combo');
    el.textContent = 'WORD COMBO ×'+chain;
    el.className = 'combo';
    void el.offsetWidth;
    el.className = 'combo show';
  }

  function draw(highlights = null){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssWidth = canvas.clientWidth || 320;
    const cssHeight = cssWidth * (ROWS / COLS);
    const targetW = Math.max(1, Math.round(cssWidth * dpr)), targetH = Math.max(1, Math.round(cssHeight * dpr));
    if (canvas.width !== targetW || canvas.height !== targetH){ canvas.width = targetW; canvas.height = targetH; }
    const cw = canvas.width / COLS, ch = canvas.height / ROWS;
    ctx.fillStyle = '#090e1d';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle = 'rgba(94,116,164,.12)';
    ctx.lineWidth = Math.max(1,dpr);
    for (let x=1;x<COLS;x++){ ctx.beginPath(); ctx.moveTo(x*cw,0); ctx.lineTo(x*cw,canvas.height); ctx.stroke(); }
    for (let y=1;y<ROWS;y++){ ctx.beginPath(); ctx.moveTo(0,y*ch); ctx.lineTo(canvas.width,y*ch); ctx.stroke(); }
    for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++){
      const cell = board[y][x];
      if (cell) drawCell(x,y,cell.letter,cw,ch,highlights?.has(x+','+y),false);
    }
    if (active){
      let gy = active.y;
      while (gy + 1 < ROWS && !board[gy+1][active.x]) gy++;
      if (gy !== active.y) drawGhost(active.x,gy,cw,ch);
      drawCell(active.x,active.y,active.letter,cw,ch,false,true);
    }
  }

  function drawGhost(x,y,cw,ch){
    const pad = Math.max(2,cw*.12);
    ctx.save();
    ctx.strokeStyle = 'rgba(124,231,255,.32)';
    ctx.lineWidth = Math.max(1,cw*.06);
    ctx.setLineDash([Math.max(3,cw*.12),Math.max(3,cw*.1)]);
    roundRect(ctx,x*cw+pad,y*ch+pad,cw-pad*2,ch-pad*2,cw*.18);
    ctx.stroke();
    ctx.restore();
  }

  function drawCell(x,y,letter,cw,ch,highlight,falling){
    const pad = Math.max(1.5,cw*.07), px=x*cw+pad, py=y*ch+pad, w=cw-pad*2, h=ch-pad*2;
    const hue = 205 + (letter.charCodeAt(0)-65)*2.1;
    ctx.save();
    const grad = ctx.createLinearGradient(px,py,px,py+h);
    if (highlight){ grad.addColorStop(0,'#ffe69a'); grad.addColorStop(1,'#8a6b1e'); }
    else if (falling){ grad.addColorStop(0,'#71e6ff'); grad.addColorStop(1,'#267eaf'); }
    else { grad.addColorStop(0,'hsl('+hue+' 48% 43%)'); grad.addColorStop(1,'hsl('+hue+' 52% 27%)'); }
    ctx.fillStyle = grad;
    roundRect(ctx,px,py,w,h,cw*.18);
    ctx.fill();
    ctx.strokeStyle = highlight ? '#fff0b5' : 'rgba(196,220,255,.45)';
    ctx.lineWidth = Math.max(1,cw*.035);
    ctx.stroke();
    ctx.fillStyle = highlight ? '#2b2206' : '#f7fbff';
    ctx.font = '900 '+Math.floor(cw*.54)+'px system-ui,-apple-system,sans-serif';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText(letter,(x+.5)*cw,(y+.52)*ch);
    ctx.restore();
  }

  function roundRect(c,x,y,w,h,r){
    const rr=Math.min(r,w/2,h/2);
    c.beginPath(); c.moveTo(x+rr,y); c.arcTo(x+w,y,x+w,y+h,rr); c.arcTo(x+w,y+h,x,y+h,rr); c.arcTo(x,y+h,x,y,rr); c.arcTo(x,y,x+w,y,rr); c.closePath();
  }

  function startGame(){
    runToken++;
    board = makeBoard(); active = null; queue = []; used = new Set();
    score = 0; wordCount = 0; level = 1; comboBest = 0; longestWord = ''; vowelGap = 0;
    resolving = false; paused = false; gameRunning = true;
    lastFrame = performance.now(); dropAccumulator = 0;
    difficulty = $('difficulty').value in DIFFICULTY ? $('difficulty').value : 'normal';
    $('startOverlay').classList.remove('show');
    $('gameOverOverlay').classList.remove('show');
    renderUsedWords(); updateHUD(); fillQueue(); spawn(); draw();
    canvas.focus({preventScroll:true});
    try { window.KidscadeGame?.start?.({ mode:difficulty }); } catch (_) {}
  }

  function endGame(){
    gameRunning = false; resolving = false; active = null; draw();
    $('finalScore').textContent = score.toLocaleString('ko-KR');
    $('finalWords').textContent = String(wordCount);
    $('bestWord').textContent = longestWord || '-';
    $('bestCombo').textContent = comboBest ? '×'+comboBest : '-';
    $('resultWords').innerHTML = used.size ? [...used].map(w => '<span>'+w+'</span>').join('') : '<span>완성한 단어 없음</span>';
    $('gameOverOverlay').classList.add('show');
    try { window.KidscadeGame?.gameOver?.({score,words:wordCount,longestWord,bestCombo:comboBest,difficulty}); } catch (_) {}
  }

  function frame(now){
    requestAnimationFrame(frame);
    if (!gameRunning || resolving || paused || !active) return;
    const dt = Math.min(100, Math.max(0, now - lastFrame));
    lastFrame = now; dropAccumulator += dt;
    const delay = fallDelay();
    if (dropAccumulator >= delay){
      dropAccumulator %= delay;
      if (canMove(0,1)) active.y++; else lockActive();
      draw();
    }
  }

  function wait(ms, token = runToken){ return new Promise(resolve => setTimeout(() => resolve(token === runToken), ms)); }
  function setPaused(value){ paused = Boolean(value); lastFrame = performance.now(); }

  function bindRepeatButton(id, fn){
    const el = $(id);
    let timer = 0, interval = 0;
    const stop = () => { clearTimeout(timer); clearInterval(interval); timer = interval = 0; };
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); fn();
      timer = setTimeout(() => { interval = setInterval(fn, 85); }, 280);
    });
    ['pointerup','pointercancel','pointerleave'].forEach(type => el.addEventListener(type, stop));
  }

  function openTutorial(){ tutorialStep = 0; renderTutorial(); $('tutorialOverlay').classList.add('show'); }
  function renderTutorial(){
    const step = TUTORIAL[tutorialStep];
    $('tutorialTitle').textContent = step.title;
    $('tutorialText').textContent = step.text;
    $('tutorialVisual').innerHTML = step.html;
    $('tutorialDots').innerHTML = TUTORIAL.map((_,i) => '<i class="'+(i===tutorialStep?'on':'')+'"></i>').join('');
    $('tutorialNext').textContent = tutorialStep === TUTORIAL.length-1 ? '알겠어요' : '다음';
  }
  function closeTutorial(){ $('tutorialOverlay').classList.remove('show'); try { localStorage.setItem('wordrisTutorialSeenV1','1'); } catch (_) {} }
  function nextTutorial(){ if (tutorialStep >= TUTORIAL.length-1) closeTutorial(); else { tutorialStep++; renderTutorial(); } }

  document.addEventListener('keydown', e => {
    if (!gameRunning || resolving || paused) return;
    if (['ArrowLeft','ArrowRight','ArrowDown',' ','Spacebar'].includes(e.key)) e.preventDefault();
    if (e.key === 'ArrowLeft') move(-1);
    else if (e.key === 'ArrowRight') move(1);
    else if (e.key === 'ArrowDown') softDrop();
    else if (e.key === ' ' || e.key === 'Spacebar') hardDrop();
  }, {passive:false});

  bindRepeatButton('leftBtn', () => move(-1));
  bindRepeatButton('rightBtn', () => move(1));
  bindRepeatButton('downBtn', softDrop);
  $('dropBtn').addEventListener('click', hardDrop);
  $('startBtn').addEventListener('click', startGame);
  $('retryBtn').addEventListener('click', startGame);
  $('backBtn').addEventListener('click', () => { $('gameOverOverlay').classList.remove('show'); $('startOverlay').classList.add('show'); });
  $('tutorialBtn').addEventListener('click', openTutorial);
  $('tutorialNext').addEventListener('click', nextTutorial);
  $('tutorialSkip').addEventListener('click', closeTutorial);
  window.addEventListener('resize', draw);

  try { window.KidscadeGame?.registerPauseHandlers?.({pause:()=>setPaused(true),resume:()=>setPaused(false)}); } catch (_) {}

  fillQueue(); renderUsedWords(); updateHUD(); draw(); requestAnimationFrame(frame);
  try { if (!localStorage.getItem('wordrisTutorialSeenV1')) openTutorial(); } catch (_) {}
})();