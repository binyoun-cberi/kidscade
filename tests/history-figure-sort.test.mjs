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

test('mode is linked from the game and supports drag, touch and tap fallback',()=>{
  const html=readFileSync(new URL('../games/high_history_timebattle/history_timebattle.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('../games/high_history_timebattle/figure-sort-ui.mjs',import.meta.url),'utf8');
  const css=readFileSync(new URL('../games/high_history_timebattle/figure-sort.css',import.meta.url),'utf8');
  assert.match(html,/onclick="openFigureSort\(\)"/);
  assert.match(html,/id="sortPlay"/);
  assert.match(html,/id="sortTray"/);
  assert.match(html,/id="sortSubmit"/);
  assert.match(html,/figure-sort-ui\.mjs\?v=1/);
  assert.match(js,/pointerdown/);
  assert.match(js,/pointermove/);
  assert.match(js,/pointerup/);
  assert.match(js,/function placeSelected/);
  assert.match(js,/function onPlayKey/);
  assert.match(css,/touch-action:none/);
});
