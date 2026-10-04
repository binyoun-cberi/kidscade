(() => {
  'use strict';

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d', { alpha:false });
  const $ = id => document.getElementById(id);

  const COLS = 8;
  const ROWS = 12;
  const MIN_WORD = 3;
  const WORDS = window.WORDRIS_WORDS || {};
  const WORD_SET = new Set(Object.keys(WORDS));
  const MAX_WORD = Math.max(MIN_WORD, ...[...WORD_SET].map(w => w.length));
  const VOWELS = new Set(['A','E','I','O','U']);
  const LETTER_VALUES = {
    A:1,E:1,I:1,O:1,U:1,L:1,N:1,S:1,T:1,R:1,
    D:2,G:2,B:3,C:3,M:3,P:3,F:4,H:4,V:4,W:4,Y:4,
    K:5,J:8,X:8,Q:10,Z:10
  };
  const BASE_WEIGHTS = {
    E:12.7,T:9.1,A:8.2,O:7.5,I:7,N:6.7,S:6.3,H:6.1,R:6,
    D:4.3,L:4,C:2.8,U:2.8,M:2.4,W:2.4,F:2.2,G:2,Y:2,
    P:1.9,B:1.5,V:1,K:.8,J:.15,X:.15,Q:.1,Z:.07
  };
  const LENGTH_MULTIPLIER = {3:1,4:2,5:3,6:5,7:8};
  const DIFFICULTY = {
    easy:{base:1180,min:650,step:40},
    normal:{base:900,min:420,step:38},
    hard:{base:670,min:290,step:34}
  };
  const TUTORIAL = [
    {
      title:'1. 글자를 원하는 곳에 놓아요',
      text:'좌우로 움직이고 DROP으로 빠르게 놓으세요. 위쪽 붉은 위험 구역까지 쌓이면 게임이 끝나요.',
      html:'<div class="tutorial-demo"><span class="tutorial-arrow">←</span><i class="tutorial-block">A</i><span class="tutorial-arrow">→</span></div>'
    },
    {
      title:'2. 단어가 되어도 바로 사라지지 않아요',
      text:'3글자 이상 단어가 완성되면 금색으로 빛납니다. 빛나는 글자나 오른쪽 단어 버튼을 눌러야 제거돼요.',
      html:'<div class="tutorial-demo"><i class="tutorial-block gold">C</i><i class="tutorial-block gold">A</i><i class="tutorial-block gold">T</i><b style="margin-left:8px">TAP</b></div>'
    },
    {
      title:'3. 짧은 단어를 더 길게 키워요',
      text:'CAT을 바로 터뜨리지 않고 S를 붙여 CATS처럼 더 긴 단어를 노릴 수 있어요. 긴 단어와 희귀 글자는 점수가 커요.',
      html:'<div class="tutorial-demo"><i class="tutorial-block">C</i><i class="tutorial-block">A</i><i class="tutorial-block">T</i><span class="tutorial-arrow">+</span><i class="tutorial-block gold">S</i></div>'
    },
    {
      title:'4. HOLD로 필요한 글자를 보관해요',
      text:'현재 글자가 지금 필요 없으면 HOLD에 한 번 보관하세요. 다음 글자가 내려오고, 나중에 다시 바꿔 쓸 수 있어요.',
      html:'<div class="tutorial-demo"><i class="tutorial-block">R</i><span class="tutorial-arrow">→</span><b>HOLD</b><span class="tutorial-arrow">→</span><i class="tutorial-block gold">R</i></div>'
    },
    {
      title:'5. 같은 단어는 다시 못 써요',
      text:'한 번 사용한 단어는 붉게 표시되고 다시 제거할 수 없어요. 제거 뒤 중력으로 새 단어가 생기면 연쇄 보너스를 노리세요.',
      html:'<div class="tutorial-demo"><i class="tutorial-block red">C</i><i class="tutorial-block red">A</i><i class="tutorial-block red">T</i><b style="margin-left:8px;color:#7fffd4">CHAIN</b></div>'
    }
  ];

  const prefixNext = new Map();
  for (const word of WORD_SET) {
    for (let len=2; len<word.length; len++) {
      const prefix = word.slice(0,len);
      if (!prefixNext.has(prefix)) prefixNext.set(prefix,new Set());
      prefixNext.get(prefix).add(word[len]);
    }
  }

  let board = makeBoard();
  let active = null;
  let queue = [];
  let used = new Set();
  let highlightedWords = [];
  let prefixHints = [];
  let chainEligible = new Set();
  let flashCells = null;
  let holdLetter = null;
  let holdUsed = false;
  let rerolls = 0;

  let score = 0;
  let wordCount = 0;
  let level = 1;
  let longestWord = '';
  let bestCombo = 0;
  let chainStep = 0;
  let placedLetters = 0;
  let gameRunning = false;
  let resolving = false;
  let paused = false;
  let lastFrame = 0;
  let dropAccumulator = 0;
  let difficulty = 'normal';
  let vowelGap = 0;
  let toastTimer = 0;
  let tutorialStep = 0;
  let runToken = 0;

  function makeBoard(){
    return Array.from({length:ROWS},()=>Array(COLS).fill(null));
  }

  function fallDelay(){
    const cfg = DIFFICULTY[difficulty] || DIFFICULTY.normal;
    return Math.max(cfg.min, cfg.base - (level-1)*cfg.step);
  }

  function boardVowelRatio(){
    let vowels=0,total=0;
    for (const row of board) for (const cell of row) if (cell) {
      total++;
      if (VOWELS.has(cell.letter)) vowels++;
    }
    return total ? vowels/total : .4;
  }

  function weightedPick(weights, allowed=null){
    const entries = Object.entries(weights).filter(([letter,weight]) => weight>0 && (!allowed || allowed.has(letter)));
    const total = entries.reduce((sum,[,weight])=>sum+weight,0);
    let n = Math.random()*Math.max(total,1);
    for (const [letter,weight] of entries) {
      n -= weight;
      if (n<=0) return letter;
    }
    return entries[0]?.[0] || 'E';
  }

  function promisingNextLetters(){
    const out = new Set();
    for (const hint of prefixHints.slice(0,4)) {
      const next = prefixNext.get(hint.prefix);
      if (next) next.forEach(letter=>out.add(letter));
    }
    return out;
  }

  function nextLetter(){
    const weights = {...BASE_WEIGHTS};
    const ratio = boardVowelRatio();
    if (ratio < .32) VOWELS.forEach(v=>weights[v]*=1.9);
    else if (ratio > .52) VOWELS.forEach(v=>weights[v]*=.55);

    const useful = promisingNextLetters();
    useful.forEach(letter=>{ if (weights[letter]) weights[letter]*=1.55; });

    let letter;
    if (vowelGap >= 4) letter = weightedPick(weights,VOWELS);
    else letter = weightedPick(weights);

    vowelGap = VOWELS.has(letter) ? 0 : vowelGap+1;
    return letter;
  }

  function fillQueue(){
    while (queue.length<4) queue.push(nextLetter());
    renderQueue();
  }

  function renderQueue(){
    $('nextLetters').innerHTML = queue.slice(0,3).map(letter=>'<i>'+letter+'</i>').join('');
  }

  function renderHold(){
    $('holdLetter').textContent = holdLetter || '+';
    $('holdState').textContent = holdUsed ? '사용함' : '1회';
    $('holdBtn').disabled = !gameRunning || resolving || paused || !active || holdUsed;
  }

  function renderReroll(){
    $('rerollCount').textContent = String(rerolls);
    $('rerollBtn').disabled = !gameRunning || resolving || paused || rerolls<=0;
  }

  function spawn(resetHold=true, forcedLetter=null){
    fillQueue();
    const letter = forcedLetter || queue.shift();
    if (!forcedLetter) {
      queue.push(nextLetter());
      renderQueue();
    }
    const x = Math.floor(COLS/2);
    if (board[0][x]) {
      endGame();
      return false;
    }
    active = {x,y:0,letter};
    if (resetHold) holdUsed=false;
    renderHold();
    return true;
  }

  function canMove(dx,dy){
    if (!active) return false;
    const nx=active.x+dx, ny=active.y+dy;
    return nx>=0 && nx<COLS && ny>=0 && ny<ROWS && !board[ny][nx];
  }

  function move(dx){
    if (!gameRunning || resolving || paused || !active) return;
    if (canMove(dx,0)) active.x+=dx;
    draw();
  }

  function softDrop(){
    if (!gameRunning || resolving || paused || !active) return;
    if (canMove(0,1)) {
      active.y++;
      score++;
      updateHUD();
    } else {
      lockActive();
    }
    draw();
  }

  function hardDrop(){
    if (!gameRunning || resolving || paused || !active) return;
    let distance=0;
    while (canMove(0,1)) {
      active.y++;
      distance++;
    }
    score += distance*2;
    updateHUD();
    lockActive();
  }

  function holdCurrent(){
    if (!gameRunning || resolving || paused || !active || holdUsed) return;
    const outgoing = active.letter;
    const incoming = holdLetter;
    holdLetter = outgoing;
    active = null;
    holdUsed = true;
    if (incoming) spawn(false,incoming);
    else spawn(false);
    renderHold();
    showToast('HOLD · '+outgoing,'info',520);
    draw();
  }

  function rerollNext(){
    if (!gameRunning || resolving || paused || rerolls<=0 || !queue.length) return;
    const old = queue[0];
    queue[0] = nextLetter();
    rerolls--;
    renderQueue();
    renderReroll();
    showToast('다음 글자 교환 · '+old+' → '+queue[0],'info',650);
  }

  function lockActive(){
    if (!active || resolving || !gameRunning) return;
    board[active.y][active.x] = {letter:active.letter};
    active = null;
    placedLetters++;
    chainEligible.clear();
    chainStep=0;
    refreshAnalysis();
    if (!spawn(true)) return;
    draw();
  }

  function collectRuns(){
    const runs=[];
    for (let y=0;y<ROWS;y++) {
      let start=0;
      while (start<COLS) {
        while (start<COLS && !board[y][start]) start++;
        if (start>=COLS) break;
        let end=start;
        while (end<COLS && board[y][end]) end++;
        const cells=Array.from({length:end-start},(_,i)=>({x:start+i,y}));
        if (cells.length>=2) runs.push(cells);
        start=end+1;
      }
    }
    for (let x=0;x<COLS;x++) {
      let start=0;
      while (start<ROWS) {
        while (start<ROWS && !board[start][x]) start++;
        if (start>=ROWS) break;
        let end=start;
        while (end<ROWS && board[end][x]) end++;
        const cells=Array.from({length:end-start},(_,i)=>({x,y:start+i}));
        if (cells.length>=2) runs.push(cells);
        start=end+1;
      }
    }
    return runs;
  }

  function wordSignature(item){
    return item.word+':'+item.cells.map(p=>p.x+','+p.y).join('|');
  }

  function wordsFromRun(cells){
    if (cells.length<MIN_WORD) return [];
    const letters=cells.map(p=>board[p.y][p.x]?.letter || '').join('');
    const out=[];
    for (let len=Math.min(MAX_WORD,cells.length);len>=MIN_WORD;len--) {
      for (let start=0;start+len<=cells.length;start++) {
        const word=letters.slice(start,start+len);
        if (WORD_SET.has(word)) {
          const item={word,cells:cells.slice(start,start+len)};
          item.signature=wordSignature(item);
          out.push(item);
        }
      }
    }
    return out;
  }

  function findWords(){
    const seen=new Set(),out=[];
    for (const run of collectRuns()) {
      for (const item of wordsFromRun(run)) {
        if (seen.has(item.signature)) continue;
        seen.add(item.signature);
        item.blocked=used.has(item.word);
        out.push(item);
      }
    }
    out.sort((a,b)=>{
      const ac=chainEligible.has(a.signature)?1:0;
      const bc=chainEligible.has(b.signature)?1:0;
      if (ac!==bc) return bc-ac;
      if (a.blocked!==b.blocked) return Number(a.blocked)-Number(b.blocked);
      return b.word.length-a.word.length || a.word.localeCompare(b.word);
    });
    return out;
  }

  function findPrefixHints(){
    const hints=new Map();
    for (const run of collectRuns()) {
      const letters=run.map(p=>board[p.y][p.x]?.letter || '').join('');
      for (let start=0;start<letters.length-1;start++) {
        const prefix=letters.slice(start);
        if (prefix.length<2 || prefix.length>=MAX_WORD || !prefixNext.has(prefix)) continue;
        if (!hints.has(prefix)) hints.set(prefix,{prefix,length:prefix.length,next:[...prefixNext.get(prefix)]});
      }
    }
    return [...hints.values()].sort((a,b)=>b.length-a.length || a.prefix.localeCompare(b.prefix)).slice(0,4);
  }

  function refreshAnalysis(){
    highlightedWords=findWords();
    prefixHints=findPrefixHints();
    renderReadyWords();
    renderPrefixHints();
    draw();
  }

  function renderReadyWords(){
    $('readyCount').textContent = String(highlightedWords.filter(w=>!w.blocked).length);
    const wrap=$('readyWords');
    if (!highlightedWords.length) {
      wrap.innerHTML='<span class="empty-note">단어를 만들면 여기에 떠요.</span>';
      return;
    }
    wrap.innerHTML=highlightedWords.slice(0,8).map(item=>{
      const chain=chainEligible.has(item.signature);
      const cls='ready-word'+(item.blocked?' used':'')+(chain?' chain':'');
      const meaning=WORDS[item.word] || '';
      return '<button type="button" class="'+cls+'" data-word-sig="'+encodeURIComponent(item.signature)+'" '+(item.blocked?'disabled':'')+' title="'+escapeHtml(meaning)+'">'+item.word+(chain?' ×CHAIN':'')+'</button>';
    }).join('');
    wrap.querySelectorAll('[data-word-sig]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const sig=decodeURIComponent(btn.dataset.wordSig || '');
        const item=highlightedWords.find(w=>w.signature===sig);
        if (item) clearWord(item);
      });
    });
  }

  function renderPrefixHints(){
    const wrap=$('prefixHints');
    if (!prefixHints.length) {
      wrap.innerHTML='<span class="empty-note">두 글자 이상 이어 붙여 보세요.</span>';
      return;
    }
    wrap.innerHTML=prefixHints.map(h=>'<span>'+h.prefix+'…</span>').join('');
  }

  function renderUsedWords(latest=''){
    $('usedCount').textContent=String(used.size);
    const wrap=$('usedWords');
    if (!used.size) {
      wrap.innerHTML='<span class="empty-note">아직 쓴 단어가 없어요.</span>';
      return;
    }
    wrap.innerHTML=[...used].slice().reverse().map(word=>'<span class="word '+(word===latest?'latest':'')+'" title="'+escapeHtml(WORDS[word]||'')+'">'+word+'</span>').join('');
  }

  function lengthMultiplier(len){
    return len>=8 ? 12 : (LENGTH_MULTIPLIER[len] || 1);
  }

  function baseWordScore(word){
    const letterScore=[...word].reduce((sum,ch)=>sum+(LETTER_VALUES[ch]||1),0);
    return letterScore * lengthMultiplier(word.length) * 10;
  }

  function chainMultiplier(step){
    if (step<=1) return 1;
    if (step===2) return 1.5;
    if (step===3) return 2;
    return 3;
  }

  function clearWord(item){
    if (!gameRunning || paused || resolving || !item) return;
    if (used.has(item.word) || item.blocked) {
      showToast('이미 쓴 단어 · '+item.word,'bad',700);
      return;
    }

    const isChain=chainEligible.has(item.signature);
    const currentChain=isChain ? chainStep+1 : 1;
    const before=new Set(highlightedWords.filter(w=>!w.blocked).map(w=>w.signature));
    flashCells=new Set(item.cells.map(p=>p.x+','+p.y));
    resolving=true;
    draw();

    setTimeout(()=>{
      if (!gameRunning) return;
      for (const p of item.cells) board[p.y][p.x]=null;
      used.add(item.word);
      wordCount++;
      longestWord = item.word.length>longestWord.length ? item.word : longestWord;

      const gained=Math.round(baseWordScore(item.word)*chainMultiplier(currentChain));
      score += gained;
      if (item.word.length>=6) {
        rerolls=Math.min(3,rerolls+1);
      }

      applyGravity();
      flashCells=null;
      chainEligible.clear();
      highlightedWords=findWords();

      const fresh=highlightedWords.filter(w=>!w.blocked && !before.has(w.signature));
      if (fresh.length) {
        chainStep=currentChain;
        fresh.forEach(w=>chainEligible.add(w.signature));
        if (currentChain>=1) showCombo(currentChain+1,true);
      } else {
        chainStep=0;
      }

      prefixHints=findPrefixHints();
      level=1+Math.floor(wordCount/5);
      bestCombo=Math.max(bestCombo,currentChain);
      renderUsedWords(item.word);
      renderReadyWords();
      renderPrefixHints();
      renderReroll();
      updateHUD();

      const chainText=currentChain>1?' · COMBO ×'+currentChain:'';
      const reward=item.word.length>=6?' · 교환권 +1':'';
      showToast(item.word+' · '+(WORDS[item.word]||'')+' +'+gained+chainText+reward,'good',950);
      if (currentChain>1) showCombo(currentChain,false);
      try { window.KidscadeGame?.sound?.('correct'); } catch (_) {}
      resolving=false;
      lastFrame=performance.now();
      draw();
    },150);
  }

  function applyGravity(){
    for (let x=0;x<COLS;x++) {
      const stack=[];
      for (let y=ROWS-1;y>=0;y--) if (board[y][x]) stack.push(board[y][x]);
      for (let y=ROWS-1,i=0;y>=0;y--) board[y][x]=i<stack.length ? stack[i++] : null;
    }
  }

  function updateHUD(){
    $('score').textContent=score.toLocaleString('ko-KR');
    $('wordCount').textContent=String(wordCount);
    $('level').textContent=String(level);
    try { window.KidscadeGame?.score?.(score); } catch (_) {}
  }

  function showToast(text,type='',duration=650){
    const el=$('toast');
    clearTimeout(toastTimer);
    el.textContent=text;
    el.className='toast show '+type;
    toastTimer=setTimeout(()=>{el.className='toast';},duration);
  }

  function showCombo(step,ready=false){
    const el=$('combo');
    el.textContent=ready ? 'CHAIN READY ×'+step : 'WORD COMBO ×'+step;
    el.className='combo';
    void el.offsetWidth;
    el.className='combo show';
  }

  function cellStatus(x,y){
    const here=highlightedWords.filter(w=>w.cells.some(p=>p.x===x&&p.y===y));
    const chain=here.some(w=>!w.blocked && chainEligible.has(w.signature));
    const ready=here.some(w=>!w.blocked);
    const blocked=!ready && here.some(w=>w.blocked);
    return {chain,ready,blocked};
  }

  function draw(){
    const dpr=Math.min(2,window.devicePixelRatio||1);
    const cssWidth=canvas.clientWidth||320;
    const cssHeight=cssWidth*(ROWS/COLS);
    const targetW=Math.max(1,Math.round(cssWidth*dpr));
    const targetH=Math.max(1,Math.round(cssHeight*dpr));
    if (canvas.width!==targetW || canvas.height!==targetH) {
      canvas.width=targetW;
      canvas.height=targetH;
    }
    const cw=canvas.width/COLS, ch=canvas.height/ROWS;

    ctx.fillStyle='#090e1d';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    let dangerCells=0;
    for (let y=0;y<2;y++) for (let x=0;x<COLS;x++) if (board[y][x]) dangerCells++;
    ctx.fillStyle='rgba(255,70,94,'+(0.05+dangerCells*.012)+')';
    ctx.fillRect(0,0,canvas.width,ch*2);
    ctx.strokeStyle='rgba(255,124,143,.45)';
    ctx.lineWidth=Math.max(1,dpr);
    ctx.setLineDash([6*dpr,5*dpr]);
    ctx.beginPath();ctx.moveTo(0,ch*2);ctx.lineTo(canvas.width,ch*2);ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle='rgba(94,116,164,.12)';
    for (let x=1;x<COLS;x++){ctx.beginPath();ctx.moveTo(x*cw,0);ctx.lineTo(x*cw,canvas.height);ctx.stroke();}
    for (let y=1;y<ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*ch);ctx.lineTo(canvas.width,y*ch);ctx.stroke();}

    for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++) {
      const cell=board[y][x];
      if (!cell) continue;
      const status=cellStatus(x,y);
      drawCell(x,y,cell.letter,cw,ch,status,flashCells?.has(x+','+y),false);
    }

    if (active) {
      let gy=active.y;
      while (gy+1<ROWS && !board[gy+1][active.x]) gy++;
      if (gy!==active.y) drawGhost(active.x,gy,cw,ch);
      drawCell(active.x,active.y,active.letter,cw,ch,{chain:false,ready:false,blocked:false},false,true);
    }
  }

  function drawCell(x,y,letter,cw,ch,status,flash,falling){
    const pad=Math.max(1.5,cw*.07),px=x*cw+pad,py=y*ch+pad,w=cw-pad*2,h=ch-pad*2;
    const hue=205+(letter.charCodeAt(0)-65)*2.1;
    const grad=ctx.createLinearGradient(px,py,px,py+h);

    if (flash || status.chain) {
      grad.addColorStop(0,'#baffeb');grad.addColorStop(1,'#2a816a');
    } else if (status.ready) {
      grad.addColorStop(0,'#ffe69a');grad.addColorStop(1,'#8a6b1e');
    } else if (status.blocked) {
      grad.addColorStop(0,'#9a4055');grad.addColorStop(1,'#4a1f2b');
    } else if (falling) {
      grad.addColorStop(0,'#71e6ff');grad.addColorStop(1,'#267eaf');
    } else {
      grad.addColorStop(0,'hsl('+hue+' 48% 43%)');grad.addColorStop(1,'hsl('+hue+' 52% 27%)');
    }

    ctx.save();
    ctx.fillStyle=grad;
    roundRect(ctx,px,py,w,h,cw*.18);
    ctx.fill();
    ctx.strokeStyle=status.blocked?'#ff8ca0':status.chain?'#9fffe6':status.ready?'#ffeaa4':'rgba(196,220,255,.45)';
    ctx.lineWidth=Math.max(1,cw*(status.ready||status.blocked||status.chain?.05:.035));
    ctx.stroke();

    ctx.fillStyle=status.ready && !status.chain ? '#2b2206' : '#f7fbff';
    if (status.blocked) ctx.fillStyle='#ffe1e7';
    ctx.font='900 '+Math.floor(cw*.54)+'px system-ui,-apple-system,sans-serif';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(letter,(x+.5)*cw,(y+.52)*ch);

    const value=LETTER_VALUES[letter]||1;
    ctx.font='800 '+Math.max(7,Math.floor(cw*.18))+'px system-ui,sans-serif';
    ctx.textAlign='right';ctx.textBaseline='bottom';
    ctx.fillStyle=status.ready&&!status.blocked?'rgba(35,28,4,.72)':'rgba(255,255,255,.65)';
    ctx.fillText(String(value),(x+1)*cw-pad*1.5,(y+1)*ch-pad*1.1);
    ctx.restore();
  }

  function drawGhost(x,y,cw,ch){
    const pad=Math.max(2,cw*.12);
    ctx.save();
    ctx.strokeStyle='rgba(124,231,255,.32)';
    ctx.lineWidth=Math.max(1,cw*.05);
    ctx.setLineDash([Math.max(3,cw*.12),Math.max(3,cw*.1)]);
    roundRect(ctx,x*cw+pad,y*ch+pad,cw-pad*2,ch-pad*2,cw*.18);
    ctx.stroke();
    ctx.restore();
  }

  function roundRect(c,x,y,w,h,r){
    const rr=Math.min(r,w/2,h/2);
    c.beginPath();c.moveTo(x+rr,y);c.arcTo(x+w,y,x+w,y+h,rr);c.arcTo(x+w,y+h,x,y+h,rr);c.arcTo(x,y+h,x,y,rr);c.arcTo(x,y,x+w,y,rr);c.closePath();
  }

  function handleBoardTap(clientX,clientY){
    if (!gameRunning || paused || resolving) return;
    const rect=canvas.getBoundingClientRect();
    const x=Math.floor(((clientX-rect.left)/rect.width)*COLS);
    const y=Math.floor(((clientY-rect.top)/rect.height)*ROWS);
    if (x<0||x>=COLS||y<0||y>=ROWS) return;

    const matches=highlightedWords
      .filter(w=>w.cells.some(p=>p.x===x&&p.y===y))
      .sort((a,b)=>{
        const ac=chainEligible.has(a.signature)?1:0,bc=chainEligible.has(b.signature)?1:0;
        if (ac!==bc) return bc-ac;
        if (a.blocked!==b.blocked) return Number(a.blocked)-Number(b.blocked);
        return b.word.length-a.word.length;
      });

    const clearable=matches.find(w=>!w.blocked);
    if (clearable) clearWord(clearable);
    else if (matches.length) showToast('이미 쓴 단어 · '+matches[0].word,'bad',700);
  }

  function startGame(){
    runToken++;
    board=makeBoard();
    active=null;queue=[];used=new Set();highlightedWords=[];prefixHints=[];chainEligible=new Set();flashCells=null;
    holdLetter=null;holdUsed=false;rerolls=0;
    score=0;wordCount=0;level=1;longestWord='';bestCombo=0;chainStep=0;placedLetters=0;vowelGap=0;
    resolving=false;paused=false;gameRunning=true;
    lastFrame=performance.now();dropAccumulator=0;
    difficulty=$('difficulty').value in DIFFICULTY ? $('difficulty').value : 'normal';

    $('startOverlay').classList.remove('show');
    $('gameOverOverlay').classList.remove('show');
    renderUsedWords();renderPrefixHints();renderReadyWords();renderHold();renderReroll();updateHUD();
    fillQueue();spawn(true);draw();
    canvas.focus({preventScroll:true});
    try { window.KidscadeGame?.start?.({mode:difficulty,dictionarySize:WORD_SET.size}); } catch (_) {}
  }

  function endGame(){
    if (!gameRunning) return;
    gameRunning=false;resolving=false;active=null;
    draw();
    $('finalScore').textContent=score.toLocaleString('ko-KR');
    $('finalWords').textContent=String(wordCount);
    $('bestWord').textContent=longestWord||'-';
    $('bestCombo').textContent=bestCombo>1?'×'+bestCombo:'-';
    $('resultWords').innerHTML=used.size?[...used].map(w=>'<span>'+w+'</span>').join(''):'<span>사용한 단어 없음</span>';
    $('gameOverOverlay').classList.add('show');
    try { window.KidscadeGame?.result?.({scope:'run',status:'completed',outcome:'fail',score,words:wordCount,longestWord,bestCombo,difficulty,lettersPlaced:placedLetters}); } catch (_) {}
  }

  function frame(now){
    requestAnimationFrame(frame);
    if (!gameRunning || resolving || paused || !active) {
      lastFrame=now;
      return;
    }
    const dt=Math.min(100,Math.max(0,now-lastFrame));
    lastFrame=now;
    dropAccumulator+=dt;
    const delay=fallDelay();
    if (dropAccumulator>=delay) {
      dropAccumulator%=delay;
      if (canMove(0,1)) active.y++;
      else lockActive();
      draw();
    }
  }

  function setPaused(value){
    paused=Boolean(value);
    lastFrame=performance.now();
    renderHold();renderReroll();
  }

  function bindRepeatButton(id,fn){
    const el=$(id);
    let timer=0,interval=0;
    const stop=()=>{clearTimeout(timer);clearInterval(interval);timer=interval=0;};
    el.addEventListener('pointerdown',e=>{
      e.preventDefault();fn();
      timer=setTimeout(()=>{interval=setInterval(fn,85);},280);
    });
    ['pointerup','pointercancel','pointerleave'].forEach(type=>el.addEventListener(type,stop));
  }

  function openTutorial(){tutorialStep=0;renderTutorial();$('tutorialOverlay').classList.add('show');}
  function renderTutorial(){
    const step=TUTORIAL[tutorialStep];
    $('tutorialTitle').textContent=step.title;
    $('tutorialText').textContent=step.text;
    $('tutorialVisual').innerHTML=step.html;
    $('tutorialDots').innerHTML=TUTORIAL.map((_,i)=>'<i class="'+(i===tutorialStep?'on':'')+'"></i>').join('');
    $('tutorialNext').textContent=tutorialStep===TUTORIAL.length-1?'알겠어요':'다음';
  }
  function closeTutorial(){
    $('tutorialOverlay').classList.remove('show');
    try {localStorage.setItem('wordrisTutorialSeenV2','1');} catch (_) {}
  }
  function nextTutorial(){
    if (tutorialStep>=TUTORIAL.length-1) closeTutorial();
    else {tutorialStep++;renderTutorial();}
  }

  function escapeHtml(value){
    return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  document.addEventListener('keydown',e=>{
    if (!gameRunning || paused || resolving) return;
    if (['ArrowLeft','ArrowRight','ArrowDown',' ','Spacebar','Shift'].includes(e.key)) e.preventDefault();
    if (e.key==='ArrowLeft') move(-1);
    else if (e.key==='ArrowRight') move(1);
    else if (e.key==='ArrowDown') softDrop();
    else if (e.key===' '||e.key==='Spacebar') hardDrop();
    else if (e.key==='c'||e.key==='C'||e.key==='Shift') holdCurrent();
  },{passive:false});

  canvas.addEventListener('pointerup',e=>handleBoardTap(e.clientX,e.clientY));
  bindRepeatButton('leftBtn',()=>move(-1));
  bindRepeatButton('rightBtn',()=>move(1));
  bindRepeatButton('downBtn',softDrop);
  $('dropBtn').addEventListener('click',hardDrop);
  $('holdBtn').addEventListener('click',holdCurrent);
  $('rerollBtn').addEventListener('click',rerollNext);
  $('startBtn').addEventListener('click',startGame);
  $('retryBtn').addEventListener('click',startGame);
  $('backBtn').addEventListener('click',()=>{$('gameOverOverlay').classList.remove('show');$('startOverlay').classList.add('show');});
  $('tutorialBtn').addEventListener('click',openTutorial);
  $('tutorialNext').addEventListener('click',nextTutorial);
  $('tutorialSkip').addEventListener('click',closeTutorial);
  window.addEventListener('resize',draw);

  try {
    window.KidscadeGame?.registerPauseHandlers?.({
      pause:()=>setPaused(true),
      resume:()=>setPaused(false)
    });
  } catch (_) {}

  renderUsedWords();renderReadyWords();renderPrefixHints();renderHold();renderReroll();updateHUD();fillQueue();draw();
  requestAnimationFrame(frame);
  try {if (!localStorage.getItem('wordrisTutorialSeenV2')) openTutorial();} catch (_) {}
})();
