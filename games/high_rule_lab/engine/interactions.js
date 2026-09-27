(function(g){
'use strict';
const E=g.RuleLabEngine=g.RuleLabEngine||{};
function applyTransforms(state,rules){
 const work=E.State.clone(state),additions=[];
 const originals=work.entities.filter(e=>!e.dead&&e.kind==='object').map(e=>({id:e.id,type:e.type}));
 for(const src of originals){
  const e=work.entities.find(x=>x.id===src.id);if(!e)continue;
  const dests=rules.transforms[src.type];
  if(!dests||!dests.size)continue;
  const list=[...dests].filter(t=>t!==src.type);
  if(!list.length)continue;
  e.type=list[0];
  for(let i=1;i<list.length;i++){
   const copy=E.State.clone(e);copy.id=E.State.makeId({entities:work.entities.concat(additions)},'t');copy.type=list[i];additions.push(copy);
  }
 }
 if(additions.length)work.entities.push(...additions);
 return work;
}
function remove(e){e.dead=true}
function apply(state,rules){
 const work=E.State.clone(state);
 const cells=E.State.cells(work);
 for(const list0 of cells.values()){
  const list=list0.filter(e=>e.kind==='object');
  const living=()=>list.filter(e=>!e.dead);
  const sinks=living().filter(e=>E.Rules.hasProp(e.type,'SINK',rules));
  if(sinks.length&&living().length>1){living().forEach(remove);continue}
  const hot=living().some(e=>E.Rules.hasProp(e.type,'HOT',rules));
  if(hot)for(const e of living())if(E.Rules.hasProp(e.type,'MELT',rules))remove(e);
  let opens=living().filter(e=>E.Rules.hasProp(e.type,'OPEN',rules));
  let shuts=living().filter(e=>E.Rules.hasProp(e.type,'SHUT',rules));
  while(opens.length&&shuts.length){remove(opens.shift());remove(shuts.shift())}
  const defeat=living().some(e=>E.Rules.hasProp(e.type,'DEFEAT',rules));
  if(defeat)for(const e of living())if(E.Rules.hasProp(e.type,'YOU',rules)&&!E.Rules.hasProp(e.type,'DEFEAT',rules))remove(e);
  if(living().length>1)for(const e of living())if(E.Rules.hasProp(e.type,'WEAK',rules))remove(e);
 }
 work.entities=work.entities.filter(e=>!e.dead);
 return work;
}
function checkWin(state,rules){
 for(const list0 of E.State.cells(state).values()){
  const list=list0.filter(e=>e.kind==='object'&&!e.dead);
  if(list.some(e=>E.Rules.hasProp(e.type,'YOU',rules))&&list.some(e=>E.Rules.hasProp(e.type,'WIN',rules)))return true;
 }
 return false;
}
E.Interactions={applyTransforms,apply,checkWin};
})(typeof window!=='undefined'?window:globalThis);
