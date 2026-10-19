(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.FractionSmithProgress=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const KEY='kidscade_fraction_smith_progress_v2';
  const fresh=()=>({gold:0,crafted:0,collection:{}});
  const count=value=>Number.isSafeInteger(value)&&value>=0?Math.min(value,100000000):0;
  function load(){
    try{
      const saved=JSON.parse(root.localStorage?.getItem(KEY)||'null');
      if(!saved||typeof saved!=='object')return fresh();
      const collection={};
      for(const id of ['sword','axe','shield'])collection[id]=count(saved.collection?.[id]);
      return {gold:count(saved.gold),crafted:count(saved.crafted),collection};
    }catch(_){return fresh()}
  }
  function save(data){
    try{root.localStorage?.setItem(KEY,JSON.stringify(data));return true}catch(_){return false}
  }
  function reward(data,itemId,amount){
    const next={gold:count(data.gold+amount),crafted:count(data.crafted+1),collection:{...data.collection}};
    next.collection[itemId]=count((next.collection[itemId]||0)+1);
    save(next);return next;
  }
  return {KEY,load,save,reward};
});
