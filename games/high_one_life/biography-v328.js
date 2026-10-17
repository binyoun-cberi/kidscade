/* Ending selections use actual records from every installed story module. */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeBiography328=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const isChoice=e=>!!e&&(e.kind==='decision'||/(?:-|:)choice$/.test(e.kind||''));
 const remembered=e=>!!e&&typeof e.text==='string'&&e.text.trim()&&
  (isChoice(e)||['birth','death','milestone','history','event','profession','family','relationship','chain','world','safety'].includes(e.kind)||
   /(?:family|memory|followup|life|career|return|fact|depart|daily|work|captivity|generations)(?:\d+)?$/.test(e.kind||''));
 function highlights(life,limit=16){
  const items=(life.log||[]).filter(remembered).filter((e,i,a)=>a.findIndex(x=>x.age===e.age&&x.text===e.text)===i);
  if(items.length<=limit)return items;
  // Preserve childhood, middle age and the ending rather than only the last screenful.
  return Array.from({length:limit},(_,i)=>items[Math.round(i*(items.length-1)/(limit-1))]);
 }
 function recap(life){
  const items=(life.log||[]).filter(remembered).filter(e=>!['birth','death'].includes(e.kind));
  if(!items.length)return '이 생애의 중간 기록이 남아 있지 않아 자세한 일상을 되짚을 수 없다.';
  const selected=highlights({log:items},Math.min(3,items.length));
  return selected.map(e=>e.age+'세에는 '+e.text).join(' ');
 }
 return Object.freeze({isChoice,highlights,recap});
});
