// The labels deliberately match the quiz bank's representative-activity eras.
// A person may have lived across several eras; this game uses the bank's teaching-era label.
export const FIGURE_SORT_STAGES = Object.freeze([
  Object.freeze({title:'삼국에서 고려까지',eras:Object.freeze(['삼국','남북국','고려'])}),
  Object.freeze({title:'조선의 변화',eras:Object.freeze(['조선 전기','조선 후기','개항기'])}),
  Object.freeze({title:'나라를 지키려던 시대',eras:Object.freeze(['대한제국','국권 피탈','일제강점기'])}),
  Object.freeze({title:'독립과 현대',eras:Object.freeze(['일제강점기','광복 이후','6·25 전쟁'])})
]);

function shuffle(items,random){
  const result=[...items];
  for(let i=result.length-1;i>0;i--){
    const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1))));
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}

export function makeFigureSortRound(facts,stageIndex=0,count=9,random=Math.random){
  const stage=FIGURE_SORT_STAGES[stageIndex];
  if(!stage)throw new RangeError('Unknown figure sort stage');
  if(![6,9].includes(count))throw new RangeError('Figure sort uses 6 or 9 cards');
  const seen=new Set();
  const pools=stage.eras.map(era=>shuffle(facts.filter(f=>f.type==='인물'&&f.era===era&&f.term&&!seen.has(f.term))
    .filter(f=>{if(seen.has(f.term))return false;seen.add(f.term);return true;}),random));
  if(pools.some(pool=>pool.length<2))throw new Error('Not enough distinct figures in each era');
  const picked=[];
  // Start with two from every era, then deal the rest in round-robin order.
  for(let round=0;round<2;round++)for(const pool of pools)picked.push(pool.shift());
  while(picked.length<count){
    let added=false;
    for(const pool of pools){
      if(picked.length===count)break;
      if(pool.length){picked.push(pool.shift());added=true;}
    }
    if(!added)throw new Error('Not enough figure cards for requested round');
  }
  return {stageIndex,stage,figures:shuffle(picked,random).map(f=>({term:f.term,era:f.era,clue:f.clue||''}))};
}

export function gradeFigureSortRound(round,placements){
  const results=round.figures.map(figure=>({
    ...figure,
    placedEra:placements[figure.term]||null,
    correct:placements[figure.term]===figure.era
  }));
  const correct=results.filter(result=>result.correct).length;
  return {results,correct,total:results.length,points:correct*100,accuracy:Math.round(correct/results.length*100)};
}
