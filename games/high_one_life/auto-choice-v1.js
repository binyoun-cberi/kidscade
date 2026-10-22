/* Automatic decisions are opt-in. Policy never changes simulation RNG. */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeAutoChoiceV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 function hash(value){
   let h=2166136261;
   for(const char of String(value))h=Math.imul(h^char.charCodeAt(0),16777619);
   return h>>>0;
 }
 function canAfford(life,option){
   if(!option||typeof option!=='object')return true;
   const g=life.goryeo343;
   // Goryeo options may spend from two independently tracked stores.
   if(g&&option.delta&&typeof option.delta==='object'){
     for(const key of ['grain','pocket']){
       const cost=option.delta[key];
       if(Number.isFinite(cost)&&cost<0&&Number.isFinite(g[key])&&g[key]<-cost)return false;
     }
   }
   // Later Joseon prompts explicitly tag costs in the game's own abstract
   // counters. Never confuse these with actual historical currency amounts.
   const j=life.joseon;
   if(j&&Number.isFinite(option.cost)&&option.cost>0&&
      Number.isFinite(j.capital)&&j.capital<option.cost)return false;
   if(j&&Number.isFinite(option.grain)&&option.grain>0&&
      Number.isFinite(life.joseon2?.grain)&&life.joseon2.grain<option.grain)return false;
   return true;
 }
 function eligibleIndices(life,options){
   const all=options.map((_,index)=>index);
   const affordable=all.filter(index=>canAfford(life,options[index]));
   return affordable.length?affordable:all;
 }
 function decide(life){
   if(!life||life.alive===false||!life.pending)return null;
   if(typeof life.getReflection==='function'&&life.getReflection())
     return {type:'reflection'};
   const choice=typeof life.getChoice==='function'?life.getChoice():null;
   if(!choice||!Array.isArray(choice.options)||!choice.options.length)return null;
   // Seed and the current dilemma change the chosen option. Never call life.rand():
   // the ordinary game's future random events must not be consumed for UI choices.
   const key=[life.seed,life.year,life.age,String(life.pending),
     choice.title||'',life.log?.length??0].join('|');
   const indices=eligibleIndices(life,choice.options);
   return {type:'choice',index:indices[hash(key)%indices.length]};
 }
 function tick(life){
   const action=decide(life);
   if(!action)return false;
   if(action.type==='reflection')return Boolean(life.reflect(''));
   return Boolean(life.choose(action.index));
 }
 return Object.freeze({decide,tick,hash,canAfford,eligibleIndices});
});