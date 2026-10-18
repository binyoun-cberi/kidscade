/* Annual public chronology. Facts do not imply the fictional person witnessed them.
 * Years use the conventional years in Korean historical reference works, not
 * guessed Gregorian month/day conversions of premodern lunar dates.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeCalendar337=api;
})(typeof window!=='undefined'?window:null,function(root){
'use strict';
const ROYAL_SOURCE='https://sillok.history.go.kr/intro/haejae.do';
// Accession years, not the following year's regnal year 1.
const REIGNS=Object.freeze([
 [1392,'태조','조선 건국','이성계가 왕위에 올라 조선을 세웠다.'],
 [1398,'정종','정종 즉위','제1차 왕자의 난 뒤 태조가 왕위를 물려주고 정종이 즉위했다.'],
 [1400,'태종','태종 즉위','제2차 왕자의 난 뒤 정종이 왕위에서 물러나고 태종이 즉위했다.'],
 [1418,'세종','세종 즉위','태종이 세종에게 왕위를 물려주고 상왕이 되었다.'],
 [1450,'문종','문종 즉위','세종이 세상을 떠나고 문종이 왕위에 올랐다.'],
 [1452,'단종','단종 즉위','문종이 세상을 떠나고 어린 단종이 왕위에 올랐다.'],
 [1455,'세조','세조 즉위','수양대군의 압박 속에 단종이 왕위에서 물러나고 세조가 즉위했다.'],
 [1468,'예종','예종 즉위','세조가 예종에게 왕위를 물려준 뒤 세상을 떠났다.'],
 [1469,'성종','성종 즉위','예종이 세상을 떠나고 성종이 왕위에 올랐다.'],
 [1494,'연산군','연산군 즉위','성종이 세상을 떠나고 연산군이 왕위에 올랐다.'],
 [1506,'중종','중종반정','반정으로 연산군이 폐위되고 중종이 왕위에 올랐다.'],
 [1544,'인종','인종 즉위','중종이 세상을 떠나고 인종이 왕위에 올랐다.'],
 [1545,'명종','명종 즉위','인종이 세상을 떠나고 어린 명종이 왕위에 올랐다.'],
 [1567,'선조','선조 즉위','명종이 세상을 떠나고 선조가 왕위에 올랐다.'],
 [1608,'광해군','광해군 즉위','선조가 세상을 떠나고 광해군이 왕위에 올랐다.'],
 [1623,'인조','인조반정','반정으로 광해군이 폐위되고 인조가 왕위에 올랐다.'],
 [1649,'효종','효종 즉위','인조가 세상을 떠나고 효종이 왕위에 올랐다.'],
 [1659,'현종','현종 즉위','효종이 세상을 떠나고 현종이 왕위에 올랐다.'],
 [1674,'숙종','숙종 즉위','현종이 세상을 떠나고 숙종이 왕위에 올랐다.'],
 [1720,'경종','경종 즉위','숙종이 세상을 떠나고 경종이 왕위에 올랐다.'],
 [1724,'영조','영조 즉위','경종이 세상을 떠나고 영조가 왕위에 올랐다.'],
 [1776,'정조','정조 즉위','영조가 세상을 떠나고 정조가 왕위에 올랐다.'],
 [1800,'순조','순조 즉위','정조가 세상을 떠나고 순조가 왕위에 올랐다.'],
 [1834,'헌종','헌종 즉위','순조가 세상을 떠나고 어린 헌종이 왕위에 올랐다.'],
 [1849,'철종','철종 즉위','헌종이 세상을 떠나고 철종이 왕위에 올랐다.'],
 [1863,'고종','고종 즉위','철종이 세상을 떠나고 어린 고종이 왕위에 올랐다.'],
 [1897,'고종 황제','대한제국 선포','고종이 황제에 오르고 국호를 대한제국으로 정했다.'],
 [1907,'순종 황제','고종 강제 퇴위','일제의 강요로 고종이 황제 자리에서 물러나고 순종이 즉위했다. 대한제국 군대도 해산되었다.']
].map(Object.freeze));
const H='https://contents.history.go.kr/';
// [year, title, fact, category, source]. Introduction is distinct from adoption.
const ROWS=[
 [1453,'계유정난','수양대군이 김종서·황보인 등을 제거하고 권력을 장악했다. 세조가 왕위에 오른 것은 1455년이다.','event',H+'mobile/kc/view.do?levelId=kc_i300800'],
 [1498,'무오사화','사초에 실린 김종직의 조의제문이 문제가 되어 사림 세력이 탄압받았다.','event',H+'front/tg/view.do?levelId=tg_003_1390'],
 [1504,'갑자사화','폐비 윤씨의 죽음을 둘러싸고 연산군이 관련 인물들을 대대적으로 처벌했다.','event',H+'front/tg/view.do?levelId=tg_003_1390'],
 [1545,'을사사화','명종 즉위 뒤 외척 간 권력 다툼 속에 사림을 비롯한 여러 인물이 화를 입었다.','event',H+'front/tg/view.do?levelId=tg_003_1390'],
 [1637,'삼전도의 항복','남한산성에서 버티던 인조가 청에 항복했다. 조선과 청의 관계가 바뀌고 포로 문제도 남았다.','event',H+'front/hm/view.do?levelId=hm_099_0050'],
 [1402,'혼일강리역대국도지도 제작','조선과 중국·일본 등의 지도를 종합한 세계지도가 만들어졌다.','culture',H+'mobile/tt/view.do?levelId=tt_b91'],
 [1429,'농사직설 편찬','각지 농민들의 경험을 모아 조선의 풍토에 맞는 농법을 정리했다.','culture',H+'mobile/kc/view.do?levelId=kc_r300270'],
 [1441,'측우기 제작','내린 비의 양을 재는 측우기가 만들어졌다.','culture',H+'front/ta/view.do?levelId=ta_h71_0070'],
 [1443,'훈민정음 창제','세종이 새 문자 훈민정음을 만들었다. 해설서를 갖추어 반포한 것은 1446년이다.','culture','https://www.korean.go.kr/eng_hangeul/origin/001.html'],
 [1446,'훈민정음 반포','훈민정음 해례본이 완성되어 새 문자의 원리와 쓰는 법을 밝혔다.','culture','https://www.korean.go.kr/eng_hangeul/origin/001.html'],
 [1485,'경국대전 완성','최종 정비된 경국대전이 시행되어 나라의 법과 제도를 정리했다.','policy',H+'mobile/kc/view.do?levelId=kc_r300100'],
 [1608,'대동법 경기도 첫 시행','경기도에서 공납을 쌀로 거두는 대동법이 시행되었다. 다른 도의 시행 시기는 달랐다.','policy',H+'front/hm/view.do?levelId=hm_102_0040'],
 [1610,'동의보감 완성','허준이 동의보감의 편찬을 마쳤다. 책을 인쇄해 간행한 것은 1613년이다.','culture',H+'mobile/kc/view.do?levelId=kc_r300400'],
 [1613,'동의보감 간행','내의원에서 동의보감을 인쇄해 간행했다.','culture',H+'mobile/kc/view.do?levelId=kc_r300400'],
 [1678,'상평통보 유통 확대','상평통보의 주조와 유통이 본격화되었다. 동전의 보급 정도는 지역마다 달랐다.','culture','https://encykorea.aks.ac.kr/Article/E0027386'],
 [1708,'황해도 대동법 시행','황해도에서도 대동법이 시행되었다. 경기도에서 시작한 뒤 여러 도로 확대되는 데 약 백 년이 걸렸다.','policy',H+'front/hm/view.do?levelId=hm_102_0040'],
 [1750,'균역법 시행','양인 남성에게 거두던 군포가 두 필에서 한 필로 줄었다. 부족한 재정을 보충하는 부담은 따로 남았다.','policy',H+'mobile/kc/view.do?levelId=kc_i301400'],
 [1763,'조엄의 고구마 종자 전래','통신사로 일본에 간 조엄이 대마도에서 고구마 종자를 부산으로 보냈다.','culture',H+'front/km/view.do?levelId=km_010_0030_0020_0020'],
 [1861,'대동여지도 간행','김정호가 목판본 대동여지도를 간행했다.','culture',H+'mobile/tt/view.do?levelId=tt_b92'],
 [1883,'한성순보 창간','박문국에서 한문으로 된 신문 한성순보를 발행하기 시작했다.','culture',H+'front/hm/view.do?levelId=hm_139_0010'],
 [1884,'우정총국의 우편 업무 시작','우정총국이 근대식 우편 업무를 시작했다. 갑신정변 뒤 업무가 중단되었다.','culture',H+'mobile/ta/view.do?levelId=ta_h11_0080_0030'],
 [1885,'광혜원 설립','정부의 지원을 받은 서양식 병원 광혜원이 문을 열고 곧 제중원으로 이름을 바꾸었다.','culture',H+'mobile/ta/view.do?levelId=ta_h11_0080_0030'],
 [1887,'경복궁 전등 점등','경복궁 건청궁에 전등이 켜졌다. 민가에 전기가 널리 들어온 시기는 훨씬 뒤다.','culture',H+'mobile/km/view.do?levelId=km_004_0030_0010_0010'],
 [1896,'아관파천','고종이 러시아 공사관으로 거처를 옮겼다. 이듬해 경운궁으로 돌아왔다.','event',H+'front/ht/view.do?levelId=ht_003_0010'],
 [1899,'한성 전차 운행 시작','서대문에서 청량리로 이어지는 노선에 전차가 다니기 시작했다.','culture','https://webzine.nfm.go.kr/2016/10/30/전차電車의-추억/'],
 [1899,'경인선 일부 개통','인천과 노량진 사이에 철도가 개통되었다. 한강을 건너 서울까지 이어진 것은 이듬해다.','culture','https://theme.archives.go.kr/next/railroad/page2.do'],
 [1960,'이승만 하야','4·19혁명 뒤 이승만 대통령이 4월 26일 하야 성명을 발표했다.','royal',H+'mobile/kc/view.do?levelId=kc_i500700']
];
const CATEGORIES=Object.freeze({royal:'왕위·정권의 변화',culture:'새 문물과 문화',policy:'제도의 변화',event:'나라의 큰일'});
const own=Object.freeze([
 ...REIGNS.map(([year,name,title,detail])=>Object.freeze({id:'calendar-royal-'+year,year,title,detail,category:'royal',source:year>=1897?H+'mobile/kc/view.do?levelId=kc_n401800':ROYAL_SOURCE})),
 ...ROWS.map(([year,title,detail,category,source],i)=>Object.freeze({id:'calendar-fact-'+i,year,title,detail,category,source,order:year===1960?30:10}))
]);
function events(){
 const unique=new Map();
 for(const e of [...own,...(root?.OneLifeJoseon?.EVENTS||[]),...(root?.OneLifeJoseon2?.HISTORY||[]),...(root?.OneLifeHistoryData10?.FACTS||[])]){
  const key=e.year+'|'+e.title;
  if(!unique.has(key))unique.set(key,Object.freeze({...e,category:e.category||'event'}));
 }
 return [...unique.values()].sort((a,b)=>a.year-b.year||(a.order??20)-(b.order??20));
}
function forYear(year){return events().filter(e=>e.year===year);}
function ruler(year){
 if(year<1392||year>=1910)return null;
 const current=REIGNS.filter(r=>r[0]<=year).at(-1);
 const index=REIGNS.indexOf(current);
 return current[0]===year&&index>0?REIGNS[index-1][1]+' → '+current[1]:current[1]+' 재위';
}
function matchEntry(entry){
 return entry?.kind==='history'?forYear(entry.year).find(e=>entry.text.startsWith(e.year+'년 · '+e.title+' — '))||null:null;
}
function record(life){
 if(!life||!life.alive||life.country?.[0]!=='대한민국'||!Number.isInteger(life.year)||life.year<life.birthYear)return 0;
 let added=0;
 for(const e of forYear(life.year)){
  const prefix=e.year+'년 · '+e.title+' — ';
  if(life.log.some(x=>x.kind==='history'&&x.year===e.year&&x.text.startsWith(prefix)))continue;
  life.logEvent(prefix+e.detail,'history');added++;
 }
 return added;
}
function install(){
 const L=root?.OneLifeSim?.Life;
 if(!L||L.prototype.__calendar337)return false;
 const tick=L.prototype.tick;
 L.prototype.tick=function(){
  if(!this.alive||this.pending)return tick.call(this);
  // Include the birth year, but do not backfill unplayed years in old saves.
  if(this.age===0)record(this);
  const before=this.year,result=tick.call(this);
  if(result&&this.year!==before)record(this);
  return result;
 };
 Object.defineProperty(L.prototype,'__calendar337',{value:true});return true;
}
install();
return Object.freeze({REIGNS,CATEGORIES,own,events,forYear,ruler,matchEntry,record,install});
});
