/* Player-selected births and newborn names. All historical odds remain fictional. */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeIdentity20=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const ORIGIN_STATUS=Object.freeze({
  '왕실 종친':'양반','양반':'양반','중인':'중인','상민':'상민',
  '사노비':'천민','공노비':'천민','백정':'상민'
 });
 const SOCIAL_CHOICES=Object.freeze(['왕실 종친','양반','중인','상민','사노비','공노비','백정']);
 const FAMILIES=Object.freeze(['빠듯한 형편','평범한 형편','여유 있는 형편']);
 function cleanName(value){
  if(typeof value!=='string')return '';
  const name=value.normalize('NFC').trim().replace(/\s+/g,' ');
  return name.length<=20&&/^[가-힣A-Za-z]+(?: [가-힣A-Za-z]+)*$/.test(name)?name:'';
 }
 function validOrigin(year,origin){
  return Number.isInteger(year)&&year>=1392&&year<1894&&
   SOCIAL_CHOICES.includes(origin)&&
   (year<1886||!['사노비','공노비'].includes(origin));
 }
 function normalizeBirth(year,input){
  const o=input&&typeof input==='object'?input:{};
  return {name:cleanName(o.name),gender:['남자','여자'].includes(o.gender)?o.gender:'',
    origin:validOrigin(year,o.origin)?o.origin:'',
    familyLevel:year>=1894&&FAMILIES.includes(o.familyLevel)?o.familyLevel:''};
 }
 function originStatus(origin){return ORIGIN_STATUS[origin]||'';}
 function childName(value,surname=''){
  const cleaned=cleanName(value);
  if(!cleaned)return '';
  return surname&&/^[가-힣]$/.test(surname)&&/^[가-힣]{1,2}$/.test(cleaned)&&!cleaned.startsWith(surname)
    ? surname+cleaned:cleaned;
 }
 function newborn(life,historicalPeople,modernPeople){
  if(!life?.alive||!Array.isArray(life.namedChildIds))return null;
  const historical=life.birthYear>=1392&&life.birthYear<=1897;
  const people=historical?historicalPeople:modernPeople;
  const child=people?.find(p=>p.role===(historical?'child':'자녀')&&
    p.birthYear===life.year&&p.alive!==false&&
    !life.namedChildIds.includes((historical?'j:':'m:')+p.id));
  return child?{child,id:(historical?'j:':'m:')+child.id,historical}:null;
 }
 function rename(life,candidate,provided,surname=''){
  if(!candidate||!life?.alive||!Array.isArray(life.namedChildIds)||life.namedChildIds.includes(candidate.id))return false;
  const person=candidate.child,old=person.name;
  const chosen=childName(provided,candidate.historical?surname:'');
  if(chosen)person.name=chosen;
  life.namedChildIds.push(candidate.id);
  if(life.namedChildIds.length>80)life.namedChildIds=life.namedChildIds.slice(-80);
  if(old!==person.name){
   for(const entry of life.log||[]){
    if(entry.year===person.birthYear&&typeof entry.text==='string'&&entry.text.includes(old)&&
      (/태어났다|가족이 되었다/.test(entry.text)))entry.text=entry.text.replace(old,person.name);
   }
  }
  return true;
 }
 return Object.freeze({cleanName,normalizeBirth,validOrigin,originStatus,childName,newborn,rename,SOCIAL_CHOICES,FAMILIES});
});
