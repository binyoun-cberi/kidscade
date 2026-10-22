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
 // Follow the player's chosen everyday direction only when the current
 // options explicitly describe comparable effects. Historical dilemmas keep
 // their own decision rules; no guessed effects or random rolls are added.
 function preferredIndices(life,options,indices){
   const stat={learning:'knowledge',people:'bonds',health:'health',work:'wealth'}[life.focus];
   if(!stat||indices.length<2)return indices;
   // A missing property within an explicit effects object means zero change
   // in Life.change(). An absent effects object means the impact is unknown.
   if(!indices.every(i=>options[i]?.effects&&typeof options[i].effects==='object'))return indices;
   if(!indices.every(i=>options[i].effects[stat]===undefined||Number.isFinite(options[i].effects[stat])))return indices;
   const effect=i=>options[i].effects[stat]??0;
   const best=Math.max(...indices.map(effect));
   return indices.filter(i=>effect(i)===best);
 }
 function decide(life){
   if(!life||life.alive===false||!life.pending)return null;
   if(typeof life.getReflection==='function'&&life.getReflection())
     return {type:'reflection'};
   const choice=typeof life.getChoice==='function'?life.getChoice():null;
   if(!choice||!Array.isArray(choice.options)||!choice.options.length)return null;
   // Seed and the current dilemma change the chosen option. Never call life.rand():
   // the ordinary game's future random events must not be consumed for UI choices.
   // Older save restoration prunes long logs; their length is not a stable
   // identity for a pending decision. Year/pending/title stay fixed instead.
   const key=[life.seed,life.year,life.age,String(life.pending),
     choice.title||''].join('|')+
     (life.focus&&life.focus!=='balance'?'|'+life.focus:'');
   const indices=preferredIndices(life,choice.options,eligibleIndices(life,choice.options));
   return {type:'choice',index:indices[hash(key)%indices.length]};
 }
 function tick(life){
   const action=decide(life);
   if(!action)return false;
   if(action.type==='reflection')return Boolean(life.reflect(''));
   return Boolean(life.choose(action.index));
 }
 return Object.freeze({decide,tick,hash,canAfford,eligibleIndices,preferredIndices});
});