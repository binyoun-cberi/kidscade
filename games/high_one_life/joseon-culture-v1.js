/* Historical life cues used by the Joseon life story and pixel scene.
 * Period labels mark broad game chapters; food and clothing spread gradually,
 * and household resources are treated as story variables rather than census data.
 */
(function(root){
'use strict';
function period(year){
 const y=Number(year)||1480;
 if(y<1592)return {id:'early',label:'조선 전기'};
 if(y<1763)return {id:'middle',label:'조선 중기'};
 if(y<=1897)return {id:'late',label:'조선 후기'};
 return {id:'transition',label:'대한제국·근대 전환기'};
}
function wardrobe(year,origin='상민',sex='남자',role='',age=30){
 const p=period(year),female=sex==='여자',child=Number(age)<15;
 const elite=/양반|왕실|관직|대감|종친/.test(String(origin))||/관직|어사|왕실/.test(String(role));
 const palette={
  early:{elite:'#526b81',plain:'#98775c',accent:'#b69a6e'},
  middle:{elite:'#536b80',plain:'#927153',accent:'#b29a70'},
  late:{elite:'#536c86',plain:'#9a7157',accent:'#c0a16b'},
  transition:{elite:'#526c7a',plain:'#84745e',accent:'#b99b6c'}
 }[p.id];
 const jeogori=female?(p.id==='early'?22:p.id==='middle'?17:p.id==='late'?12:14):18;
 const hatSpan=elite?(p.id==='early'?14:p.id==='middle'?17:p.id==='late'?21:18):(p.id==='early'?10:p.id==='middle'?12:p.id==='late'?14:12);
 let label;
 if(child)label=p.id==='late'?'짧은 저고리와 치마를 입은 아이':'저고리와 치마를 입은 아이';
 else if(female)label=p.id==='early'?'긴 저고리와 치마':p.id==='middle'?'넉넉한 저고리와 치마':p.id==='late'?'짧은 저고리와 치마':'전통옷과 개화기 옷차림';
 else label=elite?(p.id==='late'?'갓과 도포':'관모와 긴 포'):(role?'생업에 맞춘 수수한 일옷':'수수한 일옷과 쓰개');
 return {period:p.id,label,jeogori,hatSpan,hat:elite?'formal':'work',color:elite?palette.elite:palette.plain,accent:palette.accent};
}
function household(life,opts={}){
 const j=opts.joseon||life.joseon||{},origin=opts.origin||life.joseon5?.origin||j.birthStatus||life.familyLevel||'상민';
 const role=opts.role||life.joseon6?.primary?.name||life.joseon5?.role||j.occupation||'';
 const scene=opts.scene||'farm',capital=Number(j.capital||0),land=Number(j.land||0);
 const royal=/왕실|왕족|세자|임금/.test(String(origin)+' '+String(role));
 const elite=/양반|왕실|관직|대감|종친/.test(String(origin)+' '+String(role));
 const poor=/사노비|공노비|소작|백정/.test(String(origin))||(capital<18&&land<2);
 if(royal&&scene==='study')return {kind:'palace',roof:'tile',label:'궁궐의 전각과 행각',yard:true};
 if(elite&&capital>=30)return {kind:'estate',roof:'tile',label:'안채와 사랑채를 둔 기와집',yard:true};
 if(capital>45||(/상인|주막|역관/.test(String(origin)+' '+String(role))&&capital>24))
  return {kind:'tile',roof:'tile',label:'기와집과 마당',yard:false};
 if(poor)return {kind:'small-thatch',roof:'thatch',label:'작은 초가집',yard:false};
 return {kind:'thatched-yard',roof:'thatch',label:'마당에 살림도구를 둔 초가집',yard:true};
}
function meal(life,opts={}){
 const j=opts.joseon||life.joseon||{},year=Number(life.year||life.birthYear||1480);
 const wealth=Number(j.capital||0),region=j.region||life.profile?.city||'';
 const choice=(array)=>array[Math.abs((Number(life.seed)||0)+year*7+Number(life.age||0)*13)%array.length];
 const grains=wealth<18?['조밥과 나물','보리와 콩을 섞어 지은 밥','묽은 조죽과 소금에 절인 무나물']:
   ['콩을 섞은 밥과 된장국','조밥과 산나물','밥과 장국, 무나물'];
 const early=['소금에 절인 무를 한 접시 꺼냈다.','오이와 무를 담근 맑은 김치를 곁들였다.','장독에 두었던 흰 김치를 그릇에 덜었다.'];
 const middle=['무를 절인 김치를 꺼내 식구들과 나누었다.','나물과 장에 절인 채소를 곁들였다.','김치와 된장국을 작은 상에 올렸다.'];
 const late=['김치를 꺼내 밥상에 놓았다.','무김치와 나물로 저녁상을 차렸다.','된장국과 절인 채소를 곁들였다.'];
 const dish=choice(grains),side=choice(year<1600?early:year<1750?middle:late);
 let seasonal='';
 if(year>=1763&&['경상도','전라도'].includes(region)&&((year+life.seed)%4===0))seasonal=' 아랫고을에서 가져온 고구마를 나누어 먹었다.';
 else if(year>=1824&&['함경도','강원도','평안도'].includes(region)&&((year+life.seed)%4===1))seasonal=' 겨울을 앞두고 감자를 삶아 먹었다.';
 return dish+'을 먹었다. '+side+seasonal;
}
function describe(life,opts={}){
 const j=opts.joseon||life.joseon||{},origin=opts.origin||life.joseon5?.origin||j.birthStatus||life.familyLevel||'상민';
 const role=opts.role||life.joseon6?.primary?.name||life.joseon5?.role||j.occupation||'';
 const scene=opts.scene||'farm',p=period(life.year||life.birthYear);
 const wear=wardrobe(life.year||life.birthYear,origin,life.gender,role,life.age);
 const home=household(life,{...opts,joseon:j,origin,role,scene});
 return {period:p.label,clothing:wear.label,housing:home.label,meal:meal(life,{...opts,joseon:j})};
}
function memoryNote(life,opts={}){
 const age=Number(life.age||0),d=describe(life,opts);
 if(age===6||age===32||age===68)return '마당을 지나 부엌에 들렀다. '+d.meal;
 if(age===11||age===23||age===49||age===77)return '그해엔 '+d.clothing+' 차림으로 바깥일을 다녔다. '+d.meal;
 return d.meal;
}
const api=Object.freeze({period,wardrobe,household,meal,describe,memoryNote});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.OneLifeJoseonCulture=api;
})(typeof window!=='undefined'?window:null);
