(function(root,factory){
  const E=typeof module==='object'&&module.exports?require('./fraction-engine.js'):root.FractionSmithMath;
  const api=factory(E);
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.FractionSmithPuzzles=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(E){
  'use strict';
  const OPS=['+','-','×','÷'];
  const EASY=['1/2','1/3','1/4','2/3','3/4','1','2','0.2','0.25','0.5','0.75'].map(E.parse);
  const MID=['1/5','2/5','3/5','4/5','1/6','5/6','1/8','3/8','5/8','7/8','1.2','1.5'].map(E.parse);
  function pick(a,r=Math.random){return a[Math.floor(r()*a.length)]}
  function clone(v){return E.make(v.n,v.d)}
  function shuffle(a,r=Math.random){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
  function safeApply(op,a,b){
    try{
      if(op==='÷'&&b.n===0)return null;
      const v=E.apply(op,a,b);
      if(!E.nice(v,{maxAbs:5,maxDen:20,allowZero:false})||v.n<0)return null;
      return v;
    }catch(_){return null}
  }
  function generateChain(depth,r=Math.random){
    for(let attempt=0;attempt<250;attempt++){
      let materials=[clone(pick(EASY,r)),clone(pick(EASY,r))];
      const recipe=[];
      let current=safeApply(pick(OPS,r),materials[0],materials[1]);
      if(!current)continue;
      let op=pick(OPS,r);
      current=safeApply(op,materials[0],materials[1]);
      if(!current)continue;
      recipe.push({a:clone(materials[0]),b:clone(materials[1]),op,result:clone(current)});
      materials=[...materials];
      for(let step=1;step<depth;step++){
        const next=clone(pick(step>1?[...EASY,...MID]:EASY,r));
        const options=shuffle(OPS,r);
        let made=null,chosen=null,left=current,right=next;
        for(const candidate of options){
          let a=current,b=next;
          if((candidate==='-'||candidate==='÷')&&r()<.35){a=next;b=current}
          const v=safeApply(candidate,a,b);
          if(v){made=v;chosen=candidate;left=a;right=b;break}
        }
        if(!made){current=null;break}
        materials.push(next);
        recipe.push({a:clone(left),b:clone(right),op:chosen,result:clone(made)});
        current=made;
      }
      if(!current)continue;
      if(materials.some(v=>E.eq(v,current)))continue;
      const unique=new Set(materials.map(E.key));
      if(unique.size<Math.min(2,materials.length))continue;
      return {target:clone(current),materials,recipe};
    }
    return {target:E.parse('3/4'),materials:[E.parse('1/2'),E.parse('1/4')],recipe:[{a:E.parse('1/2'),b:E.parse('1/4'),op:'+',result:E.parse('3/4')}]};
  }
  function shortestStrikes(materials,target,maxDepth=4){
    const start=materials.map(clone);
    const targetKey=E.key(target);
    const canon=list=>list.map(E.key).sort().join('|');
    if(start.some(v=>E.key(v)===targetKey))return 0;
    let frontier=[start],seen=new Set([canon(start)]);
    for(let depth=1;depth<=maxDepth;depth++){
      const next=[];
      for(const state of frontier){
        for(let i=0;i<state.length;i++)for(let j=i+1;j<state.length;j++){
          for(const op of OPS){
            const orders=(op==='-'||op==='÷')?[[state[i],state[j]],[state[j],state[i]]]:[[state[i],state[j]]];
            for(const [a,b] of orders){
              const value=safeApply(op,a,b);if(!value)continue;
              if(E.key(value)===targetKey)return depth;
              const rest=state.filter((_,k)=>k!==i&&k!==j);rest.push(value);
              const c=canon(rest);if(seen.has(c))continue;seen.add(c);
              // A truncated two-step frontier can hide valid three-step
              // solutions. Enumerate all short routes; cap only deeper ones.
              if(depth<=2||next.length<1800)next.push(rest);
            }
          }
        }
      }
      frontier=next;if(!frontier.length)break;
    }
    return null;
  }
  // Master orders are advertised as three-step jobs. Check every one- and
  // two-step route (without a breadth cap) before accepting a generated job.
  function shortRouteExists(materials,target){
    const targetKey=E.key(target);
    if(materials.some(v=>E.key(v)===targetKey))return true;
    const moves=list=>{
      const out=[];
      for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
        for(const op of OPS){
          const pairs=(op==='-'||op==='÷')?[[list[i],list[j]],[list[j],list[i]]]:[[list[i],list[j]]];
          for(const [a,b] of pairs){const value=safeApply(op,a,b);if(value)out.push({i,j,value})}
        }
      }
      return out;
    };
    for(const move of moves(materials)){
      if(E.key(move.value)===targetKey)return true;
      const rest=materials.filter((_,i)=>i!==move.i&&i!==move.j).concat(move.value);
      if(moves(rest).some(next=>E.key(next.value)===targetKey))return true;
    }
    return false;
  }
  function decoys(count,r=Math.random,exclude=[]){
    const pool=[...EASY,...MID].filter(v=>!exclude.some(x=>E.eq(x,v)));return shuffle(pool,r).slice(0,count).map(clone)
  }
  function create(mode='practice',r=Math.random){
    let depth=1,base,mats,best=null;
    // A valid authored recipe is not enough: decoys can expand the bounded
    // shortest-solution search beyond its limit. Reroll those puzzles instead
    // of presenting a problem whose best-strike record cannot be verified.
    for(let attempt=0;attempt<(mode==='master'?300:32);attempt++){
      depth=mode==='master'?3:mode==='rush'?(r()<.55?1:2):1;
      base=generateChain(depth,r);
      mats=[...base.materials,...decoys(mode==='master'?3:2,r,[...base.materials,base.target])];
      mats=shuffle(mats,r);
      if(mode==='master'){
        if(shortRouteExists(mats,base.target))continue;
        best=3; // The authored chain uses three operations, and none use fewer.
      }else best=shortestStrikes(mats,base.target,Math.max(4,depth));
      if(best!==null&&best>=1&&best<=4)break;
      best=null;
    }
    if(best===null){
      // Fully verified emergency recipe for pathological RNGs.
      depth=1;best=1;
      base={target:E.parse('3/4'),materials:[E.parse('1/2'),E.parse('1/4')],
        recipe:[{a:E.parse('1/2'),b:E.parse('1/4'),op:'+',result:E.parse('3/4')}]};
      mats=[...base.materials,E.parse('1'),E.parse('2')];
      if(mode==='master'){
        // A long fixed chain with a known result; filter the decoys exactly.
        const first=E.add('1/2','1/4'),second=E.add(first,'1/5'),target=E.add(second,'3/5');
        base={target,materials:['1/2','1/4','1/5','3/5'].map(E.parse),recipe:[
          {a:E.parse('1/2'),b:E.parse('1/4'),op:'+',result:first},
          {a:first,b:E.parse('1/5'),op:'+',result:second},
          {a:second,b:E.parse('3/5'),op:'+',result:target}
        ]};
        mats=[...base.materials,...['1/6','1/8','2/3'].map(E.parse)];
        depth=3;best=3;
      }
    }
    const preferDecimal=E.isTerminating(base.target)&&r()<.45;
    return {
      id:'fs-'+Date.now().toString(36)+'-'+Math.floor(r()*1e6).toString(36),
      target:clone(base.target),
      targetDisplay:E.display(base.target,preferDecimal?'decimal':'fraction'),
      targetPrefer:preferDecimal?'decimal':'fraction',
      materials:mats.map((v,i)=>({id:'m'+i,value:clone(v),prefer:E.isTerminating(v)&&r()<.28?'decimal':'fraction'})),
      recipe:base.recipe,
      authoredStrikes:depth,
      bestStrikes:best
    };
  }
  return {OPS,create,shortestStrikes,shortRouteExists,safeApply};
});
