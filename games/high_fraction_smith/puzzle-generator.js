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
              const c=canon(rest);if(seen.has(c))continue;seen.add(c);next.push(rest);
              if(next.length>1800)break;
            }
          }
        }
      }
      frontier=next.slice(0,1800);if(!frontier.length)break;
    }
    return null;
  }
  function decoys(count,r=Math.random,exclude=[]){
    const pool=[...EASY,...MID].filter(v=>!exclude.some(x=>E.eq(x,v)));return shuffle(pool,r).slice(0,count).map(clone)
  }
  function create(mode='practice',r=Math.random){
    const depth=mode==='master'?3:mode==='rush'?(r()<.55?1:2):1;
    let base=generateChain(depth,r);
    let mats=[...base.materials,...decoys(mode==='master'?3:2,r,[...base.materials,base.target])];
    mats=shuffle(mats,r);
    const best=shortestStrikes(mats,base.target,Math.max(4,depth));
    const preferDecimal=E.isTerminating(base.target)&&r()<.45;
    return {
      id:'fs-'+Date.now().toString(36)+'-'+Math.floor(r()*1e6).toString(36),
      target:clone(base.target),
      targetDisplay:E.display(base.target,preferDecimal?'decimal':'fraction'),
      targetPrefer:preferDecimal?'decimal':'fraction',
      materials:mats.map((v,i)=>({id:'m'+i,value:clone(v),prefer:E.isTerminating(v)&&r()<.28?'decimal':'fraction'})),
      recipe:base.recipe,
      authoredStrikes:depth,
      bestStrikes:best??depth
    };
  }
  return {OPS,create,shortestStrikes,safeApply};
});