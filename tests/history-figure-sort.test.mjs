import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CORE_HISTORY_FACTS,ERA_ORDER} from '../data/history-live-question-bank.mjs';
import {FIGURE_SORT_STAGES,makeFigureSortRound,gradeFigureSortRound} from '../games/high_history_timebattle/figure-sort-engine.mjs';

test('all four figure-sort stages use existing eras and have enough unique cards',()=>{
  assert.equal(FIGURE_SORT_STAGES.length,4);
  for(let i=0;i<FIGURE_SORT_STAGES.length;i++){
    const stage=FIGURE_SORT_STAGES[i];
    assert.equal(stage.eras.length,3);
    assert.ok(stage.eras.every(era=>ERA_ORDER.includes(era)));
    for(const count of [6,9]){
      const round=makeFigureSortRound(CORE_HISTORY_FACTS,i,count,()=>0.6);
      assert.equal(round.figures.length,count);
      assert.equal(new Set(round.figures.map(f=>f.term)).size,count);
      assert.ok(round.figures.every(f=>stage.eras.includes(f.era)&&f.clue));
      assert.ok(stage.eras.every(era=>round.figures.filter(f=>f.era===era).length>=2));
    }
  }
});

test('grade counts misplacements and omissions without mutating cards',()=>{
  const round=makeFigureSortRound(CORE_HISTORY_FACTS,0,6,()=>0.25);
  const placements=Object.fromEntries(round.figures.map(f=>[f.term,f.era]));
  const perfect=gradeFigureSortRound(round,placements);
  assert.equal(perfect.correct,6);
  assert.equal(perfect.points,600);
  const wrong=round.figures[0];
  placements[wrong.term]=round.stage.eras.find(era=>era!==wrong.era);
  delete placements[round.figures[1].term];
  const result=gradeFigureSortRound(round,placements);
  assert.equal(result.correct,4);
  assert.equal(result.accuracy,67);
  assert.equal(result.results.find(f=>f.term===wrong.term).era,wrong.era);
  assert.equal(result.results.find(f=>f.term===round.figures[1].term).placedEra,null);
  assert.equal(round.figures.length,6);
});

test('invalid stage, card count, or too little data fails clearly',()=>{
  assert.throws(()=>makeFigureSortRound(CORE_HISTORY_FACTS,99,6),RangeError);
  assert.throws(()=>makeFigureSortRound(CORE_HISTORY_FACTS,0,7),RangeError);
  assert.throws(()=>makeFigureSortRound([],0,6),/Not enough/);
});

test('figure sort is a solo practice question type with drag, touch and tap fallback',()=>{
  const html=readFileSync(new URL('../games/high_history_timebattle/history_timebattle.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('../games/high_history_timebattle/figure-sort-ui.mjs',import.meta.url),'utf8');
  const css=readFileSync(new URL('../games/high_history_timebattle/figure-sort.css',import.meta.url),'utf8');
  const enhancement=readFileSync(new URL('../games/high_history_timebattle/timebattle-ui-v2.js',import.meta.url),'utf8');
  const soloModes=html.match(/<select id="soloQuestionMode">([\s\S]*?)<\/select>/)?.[1];
  const hostModes=html.match(/<select id="questionMode">([\s\S]*?)<\/select>/)?.[1];
  const roundModes=html.match(/<select id="roundQuestionMode">([\s\S]*?)<\/select>/)?.[1];
  assert.match(soloModes,/option value="figure-sort">시대별 인물 모으기/);
  assert.doesNotMatch(hostModes,/figure-sort/);
  assert.doesNotMatch(roundModes,/figure-sort/);
  assert.doesNotMatch(html,/id="sortSetup"|onclick="openFigureSort\(\)"|id="sortStart"/);
  assert.match(html,/id="sortSoloOptions" class="hidden"/);
  assert.match(html,/id="sortStages"/);
  assert.match(html,/id="sortCount"/);
  assert.match(html,/id="sortPlay"/);
  assert.match(html,/id="sortTray"/);
  assert.match(html,/id="sortSubmit"/);
  assert.match(html,/if\(\$\('soloQuestionMode'\)\.value==='figure-sort'\)/);
  assert.match(html,/HistoryFigureSortUI\.start\(\)/);
  assert.match(html,/figure-sort-ui\.mjs\?v=2/);
  assert.match(enhancement,/figure-sort':\{title:'시대별 인물 모으기'/);
  assert.match(enhancement,/sort-mode-selected/);
  assert.match(enhancement,/sortSoloOptions/);
  assert.match(js,/function backToSolo\(/);
  assert.match(js,/sortResultBackSetup/);
  assert.match(js,/HistoryFigureSortUI=\{start,renderStages,backToSolo\}/);
  assert.match(js,/pointerdown/);
  assert.match(js,/pointermove/);
  assert.match(js,/pointerup/);
  assert.match(js,/function placeSelected/);
  assert.match(js,/function onPlayKey/);
  assert.match(css,/touch-action:none/);
  assert.match(css,/#soloSetup\.sort-mode-selected \.setup-essentials/);
});
