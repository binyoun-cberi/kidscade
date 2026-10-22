/* Preserve era-specific meaning in the second-life comparison.
 * Historical resources are abstract game counts, NEVER real period currency/area units.
 * Read-only; older replay snapshots without eraSummary show "기록 없음". */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeEndingEraV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 function eraOf(year){
   return year>=1200&&year<1392?'goryeo':year>=1392&&year<1900?'joseon':'modern';
 }
 function safeNumber(value){return Number.isFinite(value)?value:null;}
 function roleSummary(people,year){
   if(!Array.isArray(people))return null;
   const living=people.filter(p=>p&&p.alive!==false&&!p.missing&&
     (p.birthYear===undefined||(Number.isFinite(Number(p.birthYear))&&Number(p.birthYear)<=year)));
   const partner=living.filter(p=>p.role==='배우자').length;
   const children=living.filter(p=>p.role==='자녀').length;
   return {partner,children};
 }
 function capture(life){
   const era=eraOf(Number(life?.birthYear));
   if(era==='goryeo'){
     const g=life?.goryeo343;
     return {era,resources:g?{grain:safeNumber(g.grain),pocket:safeNumber(g.pocket),
       land:safeNumber(g.land)}:null,
       household:g?roleSummary(g.people,Number(life.year)):null};
   }
   if(era==='joseon'){
     const g=life?.joseon,j2=life?.joseon2,j4=life?.joseon4;
     return {era,resources:g?{capital:safeNumber(g.capital),
       grain:safeNumber(j2?.grain)}:null,
       household:j4?roleSummary(j4.people,Number(life.year)):null};
   }
   return {era:'modern'};
 }
 function numberText(value){
   return typeof value==='number'&&Number.isFinite(value)?String(value):'기록 없음';
 }
 function householdText(value){
   if(!value)return '기록 없음';
   return '기록된 생존 배우자 '+numberText(value.partner)+'명 · 자녀 '+numberText(value.children)+'명';
 }
 function rows(previous,current,formatCredits){
   const a=previous||{},b=current||{};
   const output=[
     ['출생 시대와 지역',a.country??'기록 없음',b.country??'기록 없음'],
     ['가정환경',a.family??'기록 없음',b.family??'기록 없음'],
     ['살아온 기간',a.age==null?'기록 없음':a.age+'세',b.age==null?'기록 없음':b.age+'세'],
     ['삶의 방향',a.career??'기록 없음',b.career??'기록 없음']
   ];
   const era=a.eraSummary?.era||b.eraSummary?.era||eraOf(Number(b.birthYear??a.birthYear));
   const prior=a.eraSummary||{},now=b.eraSummary||{};
   if(era==='goryeo'||era==='joseon'){
     output.push(['가족·관계',householdText(prior.household),householdText(now.household)]);
     if(era==='goryeo'){
       for(const [title,key] of [
         ['곡식 (게임 속 수치)','grain'],
         ['살림에 쓸 것 (게임 속 수치)','pocket'],
         ['경작지 (게임 속 수치)','land']
       ])output.push([title,numberText(prior.resources?.[key]),numberText(now.resources?.[key])]);
     }else{
       for(const [title,key] of [
         ['살림 밑천 (게임 속 수치)','capital'],
         ['곡식 (게임 속 수치)','grain']
       ])output.push([title,numberText(prior.resources?.[key]),numberText(now.resources?.[key])]);
     }
     return output;
   }
   const money=typeof formatCredits==='function'?formatCredits:value=>numberText(value);
   output.push(
     ['출생 주거',a.housing||'기록 없음',b.housing||'기록 없음'],
     ['거쳐 온 직업',a.roles?.join(' → ')||'없음',b.roles?.join(' → ')||'없음'],
     ['교육 경험',a.education||'기록 없음',b.education||'기록 없음'],
     ['자격 이력',a.qualification||'없음',b.qualification||'없음'],
     ['최종 순자산',a.netWorth==null?'기록 없음':money(a.netWorth),
       b.netWorth==null?'기록 없음':money(b.netWorth)],
     ['가족·관계',a.child?'아이 돌봄':a.partner?'동반자':'다양한 관계',
       b.child?'아이 돌봄':b.partner?'동반자':'다양한 관계']
   );
   return output;
 }
 return Object.freeze({eraOf,roleSummary,capture,rows});
});