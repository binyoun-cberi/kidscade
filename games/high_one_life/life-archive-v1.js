/* One Life archive: truthful career, historical era and lifetime-count summaries. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeArchive1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const text=(value,max=80)=>typeof value==='string'?value.trim().slice(0,max):'';
 const valid=item=>!!item&&Number.isInteger(item.birthYear)&&item.birthYear>=1200&&item.birthYear<=2026&&
   Number.isInteger(item.age)&&item.age>=0&&item.age<=108;
 const entries=data=>Array.isArray(data)?data.filter(valid).slice(0,20):[];
 function era(birthYear,country){
  if(birthYear<1392)return '고려';
  if(birthYear<1894)return '조선';
  if(country==='대한민국'){
   if(birthYear>=1910&&birthYear<=1944)return '일제강점기';
   if(birthYear>=1897&&birthYear<=1909)return '대한제국기';
   if(birthYear>=1950&&birthYear<=1953)return '한국전쟁기';
  }
  if(birthYear<1910)return '근대';
  if(birthYear<1945)return '20세기 전반';
  return '근현대';
 }
 const nameOr=(v,fallback)=>text(v,32)||fallback;
 function make(life,details={}){
  const birthYear=life.birthYear,age=life.age;
  const career=nameOr(details.career||life.career,'살림과 일상');
  const name=text(details.name||life.profile?.name||life.birthSetup?.name,30);
  const origin=text(details.origin||life.birthSetup?.origin||life.familyLevel,80);
  const ending=text(details.ending,100);
  return {at:Date.now(),country:nameOr(life.country?.[0],'대한민국'),birthYear,age,
   name,origin,career,ending};
 }
 function nextCount(history,meta){
  const list=entries(history);
  const known=Number.isSafeInteger(meta?.total)&&meta.total>=list.length&&meta.total<100000000;
  return {total:(known?meta.total:list.length)+1,minimum:known?meta.minimum===true:list.length>=20};
 }
 function countLabel(history,meta){
  const list=entries(history);
  const known=Number.isSafeInteger(meta?.total)&&meta.total>=list.length&&meta.total<100000000;
  const count=known?meta.total:list.length;
  return ((known?meta.minimum===true:list.length>=20)?'최소 ':'')+count+'번의 인생';
 }
 function describe(item){
  const where=text(item.country,60)||'어느 곳';
  const who=text(item.name,30);
  const origin=text(item.origin,80);
  const career=text(item.career,80)||'살아온 이야기';
  const ending=text(item.ending,100);
  return {era:era(item.birthYear,where)+' · '+item.birthYear+'년 출생',
   title:(who?who+' · ':'')+career,
   detail:where+' · '+item.age+'세까지'+(origin?' · '+origin:'')+(ending?' · '+ending:'')};
 }
 return Object.freeze({entries,era,make,nextCount,countLabel,describe});
});
