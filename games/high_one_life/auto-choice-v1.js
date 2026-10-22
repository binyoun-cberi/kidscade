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
   return {type:'choice',index:hash(key)%choice.options.length};
 }
 function tick(life){
   const action=decide(life);
   if(!action)return false;
   if(action.type==='reflection')return Boolean(life.reflect(''));
   return Boolean(life.choose(action.index));
 }
 return Object.freeze({decide,tick,hash});
});