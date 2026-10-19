import {CORE_HISTORY_FACTS} from '../../data/history-live-question-bank.mjs';
import {FIGURE_SORT_STAGES,makeFigureSortRound,gradeFigureSortRound} from './figure-sort-engine.mjs';

const $=id=>document.getElementById(id);
const escapeHtml=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const STORAGE_KEY='kidscade_game_v1:high_history_timebattle_live:figure-sort-best';
let stageIndex=0,game=null,activeDrag=null,ignoreClickUntil=0;

function bestScores(){
  try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{}}catch(_){return {}}
}

function renderStages(){
  $('sortStages').innerHTML=FIGURE_SORT_STAGES.map((stage,index)=>
    `<button type="button" class="sort-stage ${index===stageIndex?'selected':''}" data-sort-stage="${index}" aria-pressed="${index===stageIndex}"><span class="sort-stage-number">${index+1}</span><strong>${escapeHtml(stage.title)}</strong><small>${stage.eras.map(escapeHtml).join(' · ')}</small></button>`
  ).join('');
  const best=bestScores()[stageIndex];
  $('sortBest').textContent=Number.isFinite(best)?`이 구간 최고 기록 ${best}점`:'아직 기록이 없어요.';
}

function backToSolo(){
  cleanupDrag();
  game=null;
  window.showSetup('solo');
  $('soloQuestionMode').value='figure-sort';
  $('soloQuestionMode').dispatchEvent(new Event('change',{bubbles:true}));
  renderStages();
}

function start(stage=stageIndex){
  cleanupDrag();
  stageIndex=stage;
  try{
    game={round:makeFigureSortRound(CORE_HISTORY_FACTS,stageIndex,Number($('sortCount').value)),placements:{},selected:null};
  }catch(error){
    $('sortBest').textContent='이 구간의 카드를 준비하지 못했어요. 다시 시도해 주세요.';
    console.error('Figure sort round failed',error);
    return;
  }
  window.showOnly('sortPlay');
  renderPlay();
}

function cardHtml(figure){
  const chosen=game.selected===figure.term;
  return `<button type="button" class="sort-figure ${chosen?'selected':''}" data-sort-card="${escapeHtml(figure.term)}" aria-pressed="${chosen}" aria-label="${escapeHtml(figure.term)} 카드${chosen?', 선택됨':''}">${escapeHtml(figure.term)}<span class="sort-grip" aria-hidden="true">⠿</span></button>`;
}

function renderPlay(){
  const {round,placements,selected}=game;
  const placed=Object.keys(placements).length;
  $('sortStageTitle').textContent=round.stage.title;
  $('sortProgress').textContent=`${placed} / ${round.figures.length}명 배치`;
  $('sortProgressBar').style.width=`${Math.round(placed/round.figures.length*100)}%`;
  $('sortHint').textContent=selected?`${selected} 카드를 놓을 시대를 골라 주세요.`:'인물 카드를 끌어다 놓거나, 카드를 누르고 시대 칸을 눌러 보세요.';
  $('sortTray').innerHTML=round.figures.filter(f=>!placements[f.term]).map(cardHtml).join('') || '<p class="sort-tray-empty">모든 인물을 배치했어요!</p>';
  $('sortBins').innerHTML=round.stage.eras.map((era,index)=>{
    const assigned=round.figures.filter(f=>placements[f.term]===era);
    return `<div class="sort-bin" data-era-bin="${escapeHtml(era)}" role="group" tabindex="0" aria-label="${escapeHtml(era)} 칸, ${assigned.length}명 배치됨"><div class="sort-bin-heading"><span class="sort-bin-number">0${index+1}</span><strong>${escapeHtml(era)}</strong><small>${assigned.length}명</small></div><div class="sort-bin-cards">${assigned.map(cardHtml).join('')||'<span class="sort-bin-placeholder">이 시대의 인물을 모아 주세요</span>'}</div></div>`;
  }).join('');
  $('sortSubmit').disabled=placed!==round.figures.length;
  $('sortSubmit').textContent=placed===round.figures.length?'정답 확인하기':`${round.figures.length-placed}명 더 배치하기`;
  $('sortUndo').disabled=!selected||!placements[selected];
}

function selectCard(term){
  if(!game||!game.round.figures.some(f=>f.term===term))return;
  game.selected=game.selected===term?null:term;
  renderPlay();
  [...document.querySelectorAll('[data-sort-card]')].find(card=>card.dataset.sortCard===term)?.focus({preventScroll:true});
}

function placeSelected(era){
  if(!game?.selected||!game.round.stage.eras.includes(era))return;
  game.placements[game.selected]=era;
  game.selected=null;
  window.playSfx?.('ui.select',{volume:.22});
  renderPlay();
  [...document.querySelectorAll('[data-era-bin]')].find(bin=>bin.dataset.eraBin===era)?.focus({preventScroll:true});
}

function returnSelected(){
  if(!game?.selected)return;
  delete game.placements[game.selected];
  game.selected=null;
  renderPlay();
}

function cleanupDrag(){
  activeDrag?.ghost?.remove();
  document.querySelectorAll('.is-drop-target,.sort-figure.is-drag-source').forEach(el=>el.classList.remove('is-drop-target','is-drag-source'));
  activeDrag=null;
}

function dragTarget(x,y){
  const target=document.elementFromPoint(x,y);
  return target?.closest?.('[data-era-bin],#sortTray')||null;
}

function onPointerDown(event){
  if(!game||event.button!==0)return;
  const card=event.target.closest('[data-sort-card]');
  if(!card)return;
  activeDrag={id:card.dataset.sortCard,startX:event.clientX,startY:event.clientY,pointerId:event.pointerId,source:card,ghost:null};
  card.setPointerCapture(event.pointerId);
}

function onPointerMove(event){
  if(!activeDrag||activeDrag.pointerId!==event.pointerId)return;
  const drag=activeDrag;
  if(!drag.ghost&&Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)<7)return;
  if(!drag.ghost){
    drag.ghost=drag.source.cloneNode(true);
    drag.ghost.removeAttribute('data-sort-card');
    drag.ghost.className='sort-drag-ghost';
    drag.ghost.setAttribute('aria-hidden','true');
    document.body.append(drag.ghost);
    drag.source.classList.add('is-drag-source');
  }
  event.preventDefault();
  drag.ghost.style.left=`${event.clientX}px`;
  drag.ghost.style.top=`${event.clientY}px`;
  document.querySelectorAll('.sort-bin.is-drop-target').forEach(el=>el.classList.remove('is-drop-target'));
  dragTarget(event.clientX,event.clientY)?.classList?.add('is-drop-target');
}

function onPointerUp(event){
  if(!activeDrag||activeDrag.pointerId!==event.pointerId)return;
  const drag=activeDrag;
  const moved=Boolean(drag.ghost);
  const target=moved?dragTarget(event.clientX,event.clientY):null;
  cleanupDrag();
  if(!moved)return; // A short tap still uses the normal click event.
  ignoreClickUntil=Date.now()+250;
  game.selected=drag.id;
  if(target?.dataset.eraBin)placeSelected(target.dataset.eraBin);
  else if(target?.id==='sortTray')returnSelected();
  else renderPlay();
}

function onPlayClick(event){
  if(Date.now()<ignoreClickUntil)return;
  const card=event.target.closest('[data-sort-card]');
  if(card){selectCard(card.dataset.sortCard);return}
  const bin=event.target.closest('[data-era-bin]');
  if(bin){placeSelected(bin.dataset.eraBin);return}
  if(event.target.closest('#sortTray'))returnSelected();
}

function onPlayKey(event){
  if(!['Enter',' '].includes(event.key))return;
  const bin=event.target.closest('[data-era-bin]');
  if(bin&&event.target===bin){event.preventDefault();placeSelected(bin.dataset.eraBin)}
  if(event.target===$('sortTray')){event.preventDefault();returnSelected()}
}

function grade(){
  if(!game||Object.keys(game.placements).length!==game.round.figures.length)return;
  const result=gradeFigureSortRound(game.round,game.placements);
  const scores=bestScores();
  if(!Number.isFinite(scores[stageIndex])||result.points>scores[stageIndex]){
    scores[stageIndex]=result.points;
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(scores))}catch(_){}
  }
  $('sortResultScore').textContent=`${result.correct} / ${result.total}명 정답`;
  $('sortResultSub').textContent=`${result.points}점 · 정답률 ${result.accuracy}% · 최고 기록 ${Math.max(result.points,bestScores()[stageIndex]||0)}점`;
  $('sortReview').innerHTML=result.results.map(f=>
    `<article class="sort-review-card ${f.correct?'correct':'incorrect'}"><span class="sort-result-indicator">${f.correct?'✓':'✕'}</span><div><strong>${escapeHtml(f.term)}</strong><div class="sort-review-era">${f.correct?escapeHtml(f.era):`${escapeHtml(f.placedEra||'미분류')} → 정답: ${escapeHtml(f.era)}`}</div><p>${escapeHtml(f.clue)}</p></div></article>`
  ).join('');
  $('sortNextStage').textContent=stageIndex<FIGURE_SORT_STAGES.length-1?'다음 시대 도전':'다시 처음부터';
  window.showOnly('sortResult');
  if(result.correct===result.total){window.playSfx?.('victory',{volume:.3});window.confettiFx?.(28)}
  else window.playSfx?.('ui.confirm',{volume:.25});
}

function init(){
  $('sortStages').addEventListener('click',event=>{
    const button=event.target.closest('[data-sort-stage]');
    if(!button)return;
    stageIndex=Number(button.dataset.sortStage);
    renderStages();
  });
  const play=$('sortPlay');
  play.addEventListener('click',onPlayClick);
  play.addEventListener('keydown',onPlayKey);
  play.addEventListener('pointerdown',onPointerDown);
  play.addEventListener('pointermove',onPointerMove);
  play.addEventListener('pointerup',onPointerUp);
  play.addEventListener('pointercancel',cleanupDrag);
  $('sortUndo').addEventListener('click',returnSelected);
  $('sortSubmit').addEventListener('click',grade);
  $('sortRestart').addEventListener('click',()=>start());
  $('sortNextStage').addEventListener('click',()=>{stageIndex=(stageIndex+1)%FIGURE_SORT_STAGES.length;start()});
  $('sortBackSetup').addEventListener('click',backToSolo);
  $('sortResultBackSetup').addEventListener('click',backToSolo);
  renderStages();
}

window.HistoryFigureSortUI={start,renderStages,backToSolo};
init();
