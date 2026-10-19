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
 function chapters(life,{place='',origin=''}={}){
  const seen=new Set(),events=(life.log||[]).filter(remembered).filter(e=>{
   if(['birth','death'].includes(e.kind)||!Number.isFinite(e.age)||e.text.includes(' — '))return false;
   if((e.age===0&&/태어났다/.test(e.text))||/(한다|살핀다|돌본다|알아본다|이어 간다|될 것이다)\.?\s*$/.test(e.text))return false;
   if(/아직 정해지지 않음|작은 흔적|다른 계절에도 이어|그때 겪은|개발|플레이스홀더/.test(e.text))return false;
   const textKey=e.age+':'+e.text,key=/^joseon(?:339|340|341)-followup$/.test(e.kind||'')?textKey:(e.causeId||textKey);if(seen.has(key)||seen.has(textKey))return false;seen.add(key);seen.add(textKey);return true;
  }).sort((a,b)=>a.age-b.age);
  const score=e=>(/^joseon(?:339|340|341)-followup$/.test(e.kind||'')?14:isChoice(e)?8:0)+(/세상을 떠났|혼인|태어났|돌아왔|피란|포로|급제/.test(e.text)?12:0);
  const selected=[];
  if(events.length){
   const first=events[0].age,last=events.at(-1).age;
   for(let i=0;i<6;i++){
    const lower=first+(last-first+1)*i/6,upper=first+(last-first+1)*(i+1)/6;
    const group=events.filter(e=>e.age>=lower&&e.age<upper);
    if(group.length)selected.push(group.reduce((best,e)=>score(e)>score(best)?e:best));
   }
  }
  const result=[life.birthYear+'년'+(place?', '+place+'에서':'에')+' 태어났다.'];
  if(origin&&life.age!==0)result.push(origin+'에서 자랐다.');
  if(!selected.length)result.push('중간 기록이 남아 있지 않아 그동안의 일을 자세히 되짚을 수 없다.');
  for(const e of selected)result.push(e.age+'세 무렵, '+e.text.trim());
  return result;
 }
 return Object.freeze({isChoice,highlights,recap,chapters});
});
