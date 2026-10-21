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

  // Workbench moves include cutting one ingot into two. Master jobs must not
  // have a one- or two-action shortcut through that tool.
  function shortRouteWithCuts(materials,target){
    const equals=v=>E.eq(v,target);
    const legal=v=>v.n>=0&&E.nice(v,{maxAbs:8,maxDen:40,allowZero:true});
    const cutPairs=v=>{
      const result=[];
      for(const parts of [2,3,4]){
        const left=E.make(v.n,v.d*parts),right=E.make(v.n*(parts-1),v.d*parts);
        if(E.nice(left,{maxAbs:8,maxDen:40,allowZero:false})&&E.nice(right,{maxAbs:8,maxDen:40,allowZero:false}))
          result.push([left,right]);
      }
      return result;
    };
    const forge=(a,b,op)=>{
      try{return op==='÷'&&b.n===0?null:(v=>legal(v)?v:null)(E.apply(op,a,b))}catch(_){return null}
    };
    if(materials.some(equals))return true;
    for(let i=0;i<materials.length;i++){
      const a=materials[i];
      for(const pair of cutPairs(a)){
        if(pair.some(equals))return true;
        if(pair.some(v=>cutPairs(v).some(c=>c.some(equals))))return true;
        const rest=materials.filter((_,j)=>j!==i),next=rest.concat(pair);
        for(let x=0;x<next.length;x++)for(let y=0;y<next.length;y++){
          if(x===y||(x<rest.length&&y<rest.length))continue;
          for(const op of OPS){const result=forge(next[x],next[y],op);if(result&&equals(result))return true}
        }
      }
      for(let j=0;j<materials.length;j++){
        if(j===i)continue;
        for(const op of OPS){
          const result=forge(a,materials[j],op);
          if(!result)continue;
          if(equals(result)||cutPairs(result).some(pair=>pair.some(equals)))return true;
        }
      }
    }
    return false;
  }
  // Product blueprints determine beginner and rush target quantities. Every
  // recipe is guaranteed executable with the actual in-game fraction limits.
  function createFor(mode='practice',part={},r=Math.random){
    if(mode==='master'){
      // Master commissions are custom measurements rather than fixed beginner
      // stock lengths. Keep only verified three-move jobs and prefer sizes near
      // the named part's workshop specification.
      const nominal=E.parse(part.metal||'3/4').n/E.parse(part.metal||'3/4').d;
      let chosen=null,bestGap=Infinity;
      for(let i=0;i<3;i++){
        const q=create('master',r),size=q.target.n/q.target.d,gap=Math.abs(Math.log(Math.max(.1,size)/Math.max(.1,nominal)));
        if(gap<bestGap){chosen=q;bestGap=gap}
        if(gap<.28)break;
      }
      return chosen;
    }
    const target=E.parse(part.metal||'3/4'),op=part.method||'+';
    let a,b;
    if(op==='-'){b=E.parse('1/4');a=E.add(target,b)}
    else if(op==='×'){a=E.mul(target,E.parse('2'));b=E.parse('1/2')}
    else if(op==='÷'){a=E.div(target,E.parse('2'));b=E.parse('1/2')}
    else {a=E.mul(target,E.parse('3/4'));b=E.mul(target,E.parse('1/4'))}
    if(!E.nice(a,{maxAbs:8,maxDen:40,allowZero:false})||!E.nice(b,{maxAbs:8,maxDen:40,allowZero:false}))
      throw Error('Invalid blueprint measurements: '+part.metal);
    const used=[a,b,target],pool=shuffle([...EASY,...MID],r).filter(v=>!used.some(x=>E.eq(v,x)));
    const materials=shuffle([a,b,...pool.slice(0,2)],r);
    const preferDecimal=E.isTerminating(target)&&r()<.25;
    return {
      id:'fs-blueprint-'+Date.now().toString(36)+'-'+Math.floor(r()*1e6).toString(36),
      target:clone(target),targetDisplay:E.display(target,preferDecimal?'decimal':'fraction'),
      targetPrefer:preferDecimal?'decimal':'fraction',
      materials:materials.map((v,i)=>({id:'m'+i,value:clone(v),prefer:E.isTerminating(v)&&r()<.24?'decimal':'fraction'})),
      recipe:[{a:clone(a),b:clone(b),op,result:clone(target)}],authoredStrikes:1,bestStrikes:1,
      method:op,blueprint:true
    };
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
        if(shortRouteExists(mats,base.target)||shortRouteWithCuts(mats,base.target))continue;
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
  return {OPS,create,createFor,shortestStrikes,shortRouteExists,shortRouteWithCuts,safeApply};
});
