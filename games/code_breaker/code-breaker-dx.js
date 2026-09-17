(() => {
'use strict';
window.__codeBreakerDxOwnAudio = true;

const $ = s => document.querySelector(s);
const els = {
  deck: $('#deck'), deckCount: $('#deck-count'), status: $('#status-msg'), turn: $('#turn-indicator'),
  player: $('#player-hand'), cpu: $('#cpu-hand'), playerHidden: $('#player-hidden-count'), cpuHidden: $('#cpu-hidden-count'),
  guessModal: $('#guess-modal'), guessTitle: $('#guess-modal-title'), guessPreview: $('#guess-target-preview'),
  guessGuide: $('#guess-guide'), candidateSummary: $('#candidate-summary'), numpad: $('#numpad'),
  actionModal: $('#action-modal'), revealModal: $('#reveal-modal'), gameoverModal: $('#gameover-modal'),
  helpModal: $('#help-modal'), goTitle: $('#go-title'), goDesc: $('#go-desc'), cpuDiff: $('#cpu-diff-label'),
  numberStrip: $('#number-strip'), toast: $('#toast'), stepDraw: $('#stepDraw'), stepGuess: $('#stepGuess'), stepDecide: $('#stepDecide'),
  endDeck: $('#end-deck'), endExposed: $('#end-exposed'), btnEasy: $('#btn-easy'), btnHard: $('#btn-hard')
};

let deck = [], playerHand = [], cpuHand = [];
let currentTurn = 'PLAYER', turnState = 'WAIT', newlyDrawnTile = null, targetTile = null;
let aiDifficulty = 'hard', audioEnabled = true, cpuFocusId = null, gameStarted = false;
let actionToken = 0;

function audio(key, options={}) {
  if (!audioEnabled) return;
  try { window.KidscadeAudio?.play?.(key, options); } catch (_) {}
}
function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => els.toast.classList.remove('show'), 1200);
}
function shuffle(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function createDeck() {
  const out = [];
  for (let n = 0; n <= 11; n++) {
    out.push({id:'b'+n,color:'black',number:n,revealed:false,isNew:false});
    out.push({id:'w'+n,color:'white',number:n,revealed:false,isNew:false});
  }
  return shuffle(out);
}
function sortHand(hand) {
  hand.sort((a,b) => a.number === b.number ? (a.color === 'black' ? -1 : 1) : a.number - b.number);
}
function hiddenCount(hand) { return hand.filter(t => !t.revealed).length; }
function tileRank(tile) { return tile.number * 2 + (tile.color === 'white' ? 1 : 0); }
function rankFor(number,color) { return number * 2 + (color === 'white' ? 1 : 0); }

function setStep(which) {
  [els.stepDraw,els.stepGuess,els.stepDecide].forEach(x=>x.classList.remove('active'));
  if (which === 'draw') els.stepDraw.classList.add('active');
  if (which === 'guess') els.stepGuess.classList.add('active');
  if (which === 'decide') els.stepDecide.classList.add('active');
}
function setStatus(text) { els.status.textContent = text; }
function setTurnLabel() {
  if (!gameStarted) { els.turn.textContent = '게임 준비 중'; return; }
  els.turn.textContent = currentTurn === 'PLAYER' ? '내 차례' : 'AI 차례';
}
function setDifficulty(diff) {
  aiDifficulty = diff === 'easy' ? 'easy' : 'hard';
  els.btnEasy?.classList.toggle('selected', aiDifficulty === 'easy');
  els.btnHard?.classList.toggle('selected', aiDifficulty === 'hard');
  els.cpuDiff.textContent = 'AI · ' + (aiDifficulty === 'hard' ? '어려움' : '쉬움');
}
function toggleAudio() {
  audioEnabled = !audioEnabled;
  const b = $('#soundBtn');
  b.textContent = audioEnabled ? 'SOUND ON' : 'SOUND OFF';
}
function drawTile(hand) {
  if (!deck.length) return null;
  const tile = deck.pop();
  tile.isNew = true;
  hand.push(tile);
  sortHand(hand);
  return tile;
}

function candidateNumbersFor(hand, index, observerHand) {
  const tile = hand[index];
  if (!tile || tile.revealed) return [];
  const targetRankMin = 0, targetRankMax = 23;
  let low = targetRankMin, high = targetRankMax;
  for (let i = index - 1; i >= 0; i--) {
    if (hand[i].revealed) { low = tileRank(hand[i]) + 1; break; }
  }
  for (let i = index + 1; i < hand.length; i++) {
    if (hand[i].revealed) { high = tileRank(hand[i]) - 1; break; }
  }
  const unavailable = new Set();
  observerHand.forEach(t => {
    if (t.color === tile.color) unavailable.add(t.number);
  });
  hand.forEach(t => {
    if (t.revealed && t !== tile && t.color === tile.color) unavailable.add(t.number);
  });
  const possible = [];
  for (let n = 0; n <= 11; n++) {
    const rank = rankFor(n,tile.color);
    if (rank >= low && rank <= high && !unavailable.has(n)) possible.push(n);
  }
  return possible.length ? possible : Array.from({length:12},(_,i)=>i).filter(n=>!unavailable.has(n));
}

function buildEvidenceStrip() {
  els.numberStrip.innerHTML = '';
  for (let n=0;n<=11;n++) {
    const d = document.createElement('div');
    d.className='note-num';
    const bothKnown = [...playerHand,...cpuHand].filter(t=>t.number===n && (playerHand.includes(t) || t.revealed)).length >= 2;
    if (bothKnown) d.classList.add('used');
    d.textContent=n;
    els.numberStrip.appendChild(d);
  }
}

function createTileElement(tile, owner, index) {
  const hidden = owner === 'cpu' && !tile.revealed;
  const btn = document.createElement('button');
  btn.type='button';
  btn.className=`code-tile ${owner} ${tile.color}`;
  btn.dataset.id=tile.id;
  if (tile.revealed) btn.classList.add('exposed');
  if (tile.isNew) btn.classList.add('new-draw');
  if (cpuFocusId === tile.id) btn.classList.add('cpu-focus');

  if (hidden) {
    const face=document.createElement('span');
    face.className='tile-face tile-back';
    btn.appendChild(face);
  } else {
    const face=document.createElement('span');
    face.className='tile-face revealed-face';
    const num=document.createElement('span');
    num.className='tile-number'; num.textContent=tile.number;
    face.appendChild(num); btn.appendChild(face);
  }

  if (owner === 'cpu' && currentTurn === 'PLAYER' && turnState === 'GUESS' && !tile.revealed) {
    btn.classList.add('targetable');
    btn.addEventListener('click',()=>openGuess(tile));
  }
  if (owner === 'player' && turnState === 'FORCE_REVEAL' && !tile.revealed) {
    btn.classList.add('targetable');
    btn.addEventListener('click',()=>forceRevealPlayerTile(tile));
  }
  return btn;
}

function renderBoard() {
  els.deckCount.textContent=deck.length;
  els.deck.classList.toggle('active', currentTurn==='PLAYER' && turnState==='DRAW' && deck.length>0);
  els.deck.classList.toggle('disabled', !(currentTurn==='PLAYER' && turnState==='DRAW' && deck.length>0));
  els.cpu.innerHTML=''; els.player.innerHTML='';
  cpuHand.forEach((t,i)=>els.cpu.appendChild(createTileElement(t,'cpu',i)));
  playerHand.forEach((t,i)=>els.player.appendChild(createTileElement(t,'player',i)));
  els.cpuHidden.textContent=hiddenCount(cpuHand);
  els.playerHidden.textContent=hiddenCount(playerHand);
  setTurnLabel();
  buildEvidenceStrip();
}

function closeModal(el){ el.style.display='none'; }
function openModal(el){ el.style.display='flex'; }

function openGuess(tile) {
  if (currentTurn!=='PLAYER' || turnState!=='GUESS' || tile.revealed) return;
  targetTile=tile;
  const index=cpuHand.indexOf(tile);
  const candidates=candidateNumbersFor(cpuHand,index,playerHand);
  els.guessTitle.textContent=`${tile.color==='black'?'검정':'흰색'} 타일의 숫자는?`;
  els.guessPreview.className='target-preview'+(tile.color==='white'?' white':'');
  els.guessPreview.textContent='?';
  els.guessGuide.textContent=`위치 ${index+1}번째 · 정렬 규칙으로 가능한 숫자를 좁혀보세요.`;
  els.candidateSummary.textContent=`논리적으로 가능한 후보: ${candidates.join(', ')}`;
  els.numpad.innerHTML='';
  for(let n=0;n<=11;n++){
    const b=document.createElement('button'); b.type='button'; b.className='num-btn';
    const possible=candidates.includes(n);
    if(possible)b.classList.add('possible'); else b.disabled=true;
    b.textContent=n; b.addEventListener('click',()=>submitGuess(n));
    els.numpad.appendChild(b);
  }
  openModal(els.guessModal);
}
function closeGuessModal(){ closeModal(els.guessModal); targetTile=null; }

function submitGuess(number) {
  if (!targetTile) return;
  const tile=targetTile; targetTile=null; closeModal(els.guessModal);
  if (number===tile.number) {
    tile.revealed=true;
    cpuFocusId=tile.id;
    renderBoard();
    const node=els.cpu.querySelector(`[data-id="${tile.id}"]`);
    node?.classList.add('flash-good');
    audio('success.cheer_yay',{volume:.28,cooldownMs:300});
    toast('암호 적중');
    if(checkWin()) return;
    turnState='DECIDE'; setStep('decide'); setStatus('정답! 계속 추리할까요?');
    openModal(els.actionModal);
  } else {
    audio('failure.fail_sting',{volume:.24,cooldownMs:450});
    toast(`${number}이(가) 아닙니다`);
    if (newlyDrawnTile) {
      newlyDrawnTile.revealed=true; newlyDrawnTile.isNew=false;
      const id=newlyDrawnTile.id; newlyDrawnTile=null;
      renderBoard();
      els.player.querySelector(`[data-id="${id}"]`)?.classList.add('shake');
      if(checkWin()) return;
      turnState='WAIT'; setStatus('오답으로 새 타일이 공개되었습니다.');
      setTimeout(startCpuTurn,850);
    } else {
      turnState='FORCE_REVEAL'; setStatus('오답! 내 타일 하나를 공개하세요.');
      renderBoard(); openModal(els.revealModal);
    }
  }
}

function forceRevealPlayerTile(tile) {
  if (turnState!=='FORCE_REVEAL' || tile.revealed) return;
  tile.revealed=true; closeModal(els.revealModal); renderBoard();
  audio('failure.fail_sting',{volume:.20,cooldownMs:450});
  if(checkWin()) return;
  turnState='WAIT'; setTimeout(startCpuTurn,650);
}
function closeRevealNotice(){ closeModal(els.revealModal); }

function passTurn() {
  closeModal(els.actionModal);
  if(newlyDrawnTile){ newlyDrawnTile.isNew=false; newlyDrawnTile=null; }
  cpuFocusId=null; renderBoard(); startCpuTurn();
}
function continueGuessing() {
  closeModal(els.actionModal);
  cpuFocusId=null; turnState='GUESS'; setStep('guess'); setStatus('다른 숨은 타일을 선택하세요.'); renderBoard();
}

function handleDeckClick() {
  if(currentTurn!=='PLAYER' || turnState!=='DRAW' || !deck.length) return;
  newlyDrawnTile=drawTile(playerHand);
  renderBoard();
  audio('collect.coin_pickup',{volume:.18,rate:1.08,cooldownMs:120});
  turnState='GUESS'; setStep('guess'); setStatus('AI의 숨은 타일 하나를 선택하세요.'); renderBoard();
}

function startPlayerTurn() {
  if(checkWin())return;
  actionToken++; currentTurn='PLAYER'; cpuFocusId=null; newlyDrawnTile=null;
  playerHand.forEach(t=>t.isNew=false); cpuHand.forEach(t=>t.isNew=false);
  if(deck.length){
    turnState='DRAW'; setStep('draw'); setStatus('중앙 덱에서 타일 한 장을 뽑으세요.');
  }else{
    turnState='GUESS'; setStep('guess'); setStatus('덱이 비었습니다. AI의 숨은 타일을 바로 추리하세요.');
  }
  renderBoard();
}

function aiChoice() {
  const hidden = playerHand.map((t,i)=>({tile:t,index:i})).filter(x=>!x.tile.revealed);
  if(!hidden.length)return null;
  if(aiDifficulty==='easy'){
    const pick=hidden[Math.floor(Math.random()*hidden.length)];
    return {...pick,candidates:Array.from({length:12},(_,i)=>i)};
  }
  const scored=hidden.map(x=>({...x,candidates:candidateNumbersFor(playerHand,x.index,cpuHand)}));
  scored.sort((a,b)=>a.candidates.length-b.candidates.length);
  const bestLen=scored[0].candidates.length;
  const best=scored.filter(x=>x.candidates.length===bestLen);
  return best[Math.floor(Math.random()*best.length)];
}

function startCpuTurn() {
  if(checkWin())return;
  const token=++actionToken; currentTurn='CPU'; turnState='WAIT'; cpuFocusId=null;
  setStep('draw'); setStatus('AI가 타일을 확인하고 있습니다.'); renderBoard();
  setTimeout(()=>{
    if(token!==actionToken)return;
    newlyDrawnTile=deck.length?drawTile(cpuHand):null;
    renderBoard(); audio('collect.coin_pickup',{volume:.12,rate:.94,cooldownMs:150});
    setStep('guess'); setStatus('AI가 내 암호열을 분석 중입니다.');
    setTimeout(()=>cpuGuess(token),650);
  },520);
}

function cpuGuess(token=actionToken) {
  if(token!==actionToken || currentTurn!=='CPU')return;
  const choice=aiChoice(); if(!choice){checkWin();return;}
  const candidates=choice.candidates.length?choice.candidates:Array.from({length:12},(_,i)=>i);
  let guess;
  if(aiDifficulty==='hard'){
    guess=candidates[Math.floor(Math.random()*candidates.length)];
  }else{
    guess=Math.floor(Math.random()*12);
  }
  cpuFocusId=choice.tile.id; renderBoard();
  setStatus(`AI 추리: 이 타일은 ${guess}?`);
  setTimeout(()=>{
    if(token!==actionToken)return;
    if(guess===choice.tile.number){
      choice.tile.revealed=true; cpuFocusId=null; renderBoard();
      audio('failure.fail_sting',{volume:.13,cooldownMs:350});
      if(checkWin())return;
      const confidence = aiDifficulty==='hard' && candidates.length<=2;
      const keepGoing = confidence ? Math.random()<.72 : Math.random()<(aiDifficulty==='hard'?.46:.22);
      if(keepGoing){
        setStatus('AI가 연속 추리를 시도합니다.');
        setTimeout(()=>cpuGuess(token),700);
      }else{
        if(newlyDrawnTile){newlyDrawnTile.isNew=false; newlyDrawnTile=null;}
        setStatus('AI가 턴을 넘겼습니다.');
        setTimeout(startPlayerTurn,650);
      }
    }else{
      audio('success.cheer_yay',{volume:.16,cooldownMs:350});
      if(newlyDrawnTile){
        newlyDrawnTile.revealed=true; newlyDrawnTile.isNew=false; newlyDrawnTile=null;
      }else{
        const hiddenOwn=cpuHand.filter(t=>!t.revealed);
        if(hiddenOwn.length) hiddenOwn[Math.floor(Math.random()*hiddenOwn.length)].revealed=true;
      }
      cpuFocusId=null; renderBoard();
      if(checkWin())return;
      setStatus('AI의 추리가 빗나갔습니다.');
      setTimeout(startPlayerTurn,750);
    }
  },750);
}

function checkWin() {
  if(!gameStarted)return false;
  if(cpuHand.length && cpuHand.every(t=>t.revealed)){finishGame(true);return true;}
  if(playerHand.length && playerHand.every(t=>t.revealed)){finishGame(false);return true;}
  return false;
}
function finishGame(won) {
  actionToken++; turnState='GAME_OVER'; gameStarted=false;
  closeModal(els.guessModal);closeModal(els.actionModal);closeModal(els.revealModal);
  els.goTitle.textContent=won?'VICTORY':'DEFEAT';
  els.goDesc.textContent=won?'상대의 모든 암호를 해독했습니다.':'내 암호가 먼저 모두 노출되었습니다.';
  els.endDeck.textContent=deck.length;
  els.endExposed.textContent=playerHand.filter(t=>t.revealed).length;
  openModal(els.gameoverModal);
  audio(won?'success.victory_fanfare':'failure.fail_sting',{volume:won ? .42 : .34,cooldownMs:1000});
}

function dealInitial() {
  for(let i=0;i<4;i++){ playerHand.push(deck.pop()); cpuHand.push(deck.pop()); }
  sortHand(playerHand); sortHand(cpuHand);
}
function initGame() {
  actionToken++; deck=createDeck(); playerHand=[];cpuHand=[];targetTile=null;newlyDrawnTile=null;cpuFocusId=null;
  gameStarted=true; dealInitial();
  closeModal($('#start-screen')); closeModal(els.gameoverModal);
  setDifficulty(aiDifficulty); renderBoard(); startPlayerTurn();
}
function restartGame(){ closeModal(els.gameoverModal); $('#start-screen').style.display='flex'; gameStarted=false; setTurnLabel(); }

function openHelp(){ openModal(els.helpModal); }
function closeHelp(){ closeModal(els.helpModal); }
$('#helpBtn').addEventListener('click',openHelp);
$('#helpCloseBtn').addEventListener('click',closeHelp);
els.helpModal.addEventListener('click',e=>{if(e.target===els.helpModal)closeHelp()});
els.guessModal.addEventListener('click',e=>{if(e.target===els.guessModal)closeGuessModal()});

Object.assign(window,{setDifficulty,toggleAudio,initGame,restartGame,handleDeckClick,closeGuessModal,passTurn,continueGuessing,closeRevealNotice});
setDifficulty('hard');
buildEvidenceStrip();
renderBoard();
})();