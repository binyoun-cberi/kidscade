(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.FractionSmithProgress=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const KEY='kidscade_fraction_smith_progress_v2';
  const COSTS={furnace:[80,180],hammer:[90,210],counter:[100,250]};
  const IDS=['sword','axe','shield','spear','helmet','dagger','hammer','crown'];
  const fresh=()=>({gold:0,crafted:0,collection:{},upgrades:{furnace:0,hammer:0,counter:0}});
  const count=value=>Number.isSafeInteger(value)&&value>=0?Math.min(value,100000000):0;
  const upgradeLevel=value=>Math.min(2,count(value));
  function normalize(saved){
    const data=fresh();if(!saved||typeof saved!=='object')return data;
    data.gold=count(saved.gold);data.crafted=count(saved.crafted);
    for(const id of IDS)data.collection[id]=count(saved.collection?.[id]);
    for(const id of Object.keys(COSTS))data.upgrades[id]=upgradeLevel(saved.upgrades?.[id]);
    return data;
  }
  function load(){
    try{
      const saved=JSON.parse(root.localStorage?.getItem(KEY)||'null');
      return normalize(saved);
    }catch(_){return fresh()}
  }
  function save(data){
    try{root.localStorage?.setItem(KEY,JSON.stringify(data));return true}catch(_){return false}
  }
  function reward(data,itemId,amount){
    const next=normalize(data);
    next.gold=count(next.gold+count(amount));next.crafted=count(next.crafted+1);
    next.collection[itemId]=count((next.collection[itemId]||0)+1);
    save(next);return next;
  }
  function upgradeCost(data,id){
    if(!Object.hasOwn(COSTS,id))return null;
    const level=upgradeLevel(data?.upgrades?.[id]);
    return COSTS[id][level]??null;
  }
  function purchase(data,id){
    const current=normalize(data),cost=upgradeCost(current,id);
    if(cost===null)return {ok:false,reason:'max',progress:current};
    if(current.gold<cost)return {ok:false,reason:'gold',cost,progress:current};
    current.gold-=cost;current.upgrades[id]++;
    save(current);return {ok:true,cost,progress:current};
  }
  return {KEY,COSTS,load,save,reward,upgradeCost,purchase};
});
