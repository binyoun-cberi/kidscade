/* Source-linked historical guardrails for One Life Joseon.
 * Separate established policy dates from fictional event frequency and outcomes.
 */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeJoseonPolicy=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const SOURCES=Object.freeze({
 tax:'https://encykorea.aks.ac.kr/Article/E0014246',
 military:'https://encykorea.aks.ac.kr/Article/E0007303',
 hopo:'https://encykorea.aks.ac.kr/Article/E0063881',
 enslaved:'https://encykorea.aks.ac.kr/Article/E0012757',
 inherited:'https://contents.history.go.kr/mobile/nh/view.do?levelId=nh_039_0040_0040_0010_0010',
 baekjeong:'https://encykorea.aks.ac.kr/Article/E0022352'
});
const REGIONAL_DAEDONG=Object.freeze({
 '경기도':1608,'강원도':1623,'충청도':1651,'전라도':1662,
 '경상도':1678,'황해도':1708
});
// Whole-province start years are simplified; Jeolla's coast received it in
// 1658 and inland in 1662. Pyeongan used distinct fiscal arrangements.
function tribute(year,region){
 if(year>=1894)return {kind:'land-reform',title:'갑오개혁 이후의 조세 변화',note:'지세와 납세 제도가 개편되었다.',source:SOURCES.tax};
 if(region==='한양')return {kind:'capital',title:'도성의 세금과 생업 부담',note:'도성의 호역·상업과 생업에 따른 부담은 지방의 공납과 같지 않았다.',source:SOURCES.tax};
 if(region==='함경도'&&year>=1666)return {kind:'sangjeong',title:'함경도의 대동상정법',note:'함경도의 상정 공납 규정은 삼남 등의 대동미와 달랐다.',start:1666,source:'https://encykorea.aks.ac.kr/Article/E0014255'};
 if(region==='평안도')return {kind:'pyeongan',title:'평안도의 고유한 세금과 공역',note:'평안도는 전국 대동미 규칙을 그대로 적용할 수 없었다.',source:SOURCES.tax};
 const start=REGIONAL_DAEDONG[region];
 if(year>=(start??Infinity)){
  return {kind:'daedong',title:'대동법에 따른 쌀·포·돈 납부',note:'공물을 현물로 직접 바치는 대신 토지에 따라 부담하는 대동세. 쌀만이 납부 방식은 아니었다.',start,source:SOURCES.tax};
 }
 return {kind:'tribute',title:'공납과 관아의 부담',note:'농가와 지역에서 정해진 현물을 마련하며 방납의 폐해도 겪을 수 있었다.',source:SOURCES.tax};
}
function military(year,origin,gender){
 if(year>=1894)return {kind:'reform',eligible:false,title:'갑오개혁 이후 군제 변화',source:SOURCES.military};
 const royal=origin==='왕실 종친',bonded=['사노비','공노비'].includes(origin);
 const noble=royal||/양반/.test(origin);
 const free=origin==='백정'?true:!bonded;
 const isMale=gender==='남자';
 if(year>=1871){
  return {kind:'hopo',eligible:true,title:'호포법으로 집안마다 매겨진 부담',note:'1871년부터 양반호까지 호 단위로 부담하는 호포.',cost:3,source:SOURCES.hopo};
 }
 if(!isMale||royal||!free)return {kind:'exempt',eligible:false,title:'일반 군포 대상이 아닌 처지',source:SOURCES.military};
 if(noble&&year>=1600)return {kind:'noble-exempt',eligible:false,title:'군역 면제·회피의 특권과 논란',source:SOURCES.military};
 if(year>=1750)return {kind:'gyunyeok',eligible:true,title:'균역법 이후 군포 한 필',note:'1750년 균역법으로 군포가 한 필로 줄어든 부담.',cost:3,source:SOURCES.military};
 if(year>=1541)return {kind:'gunpo',eligible:true,title:'군포와 양역의 부담',note:'수포군이 늘면서 베를 납부하는 부담이 커졌다.',cost:6,source:SOURCES.military};
 return {kind:'service',eligible:true,title:'군역과 번상의 의무',note:'군적과 신분·역종에 따라 직접 복무하는 부담이 달랐다.',cost:5,source:SOURCES.military};
}
function originLabel(year,origin){
 if(origin==='백정'&&year<1423)return '화척·재인 계열 가계';
 if(year<1600&&['역관 가계','의관 가계','서리 가계','관청 장인'].includes(origin))
  return ({'역관 가계':'통역을 맡은 역관 가계','의관 가계':'의술을 맡은 의관 가계','서리 가계':'관아의 서리 가계','관청 장인':'관아의 장인 가계'})[origin];
 return origin;
}
function legalStatus(birthYear,origin,currentYear=birthYear,freed=false){
 if(currentYear>=1894)return '법적 신분 구별 폐지';
 const fromBonded=['사노비','공노비'].includes(origin);
 if(fromBonded&&birthYear>=1886)return '양인 (노비 출신 가계)';
 if(fromBonded&&!freed)return '천인';
 return '양인';
}
function childStatus(birthYear,motherBonded,fatherBonded){
 // Simplification: 1731 established maternal-status rule; not a universal
 // reconstruction of contested mixed-parentage practice before that year.
 if(birthYear>=1886)return '양인';
 if(birthYear>=1731)return motherBonded?'천인':'양인';
 return (motherBonded||fatherBonded)?'천인':'양인';
}
function templeEntry(origin,age){
 return age>=15&&['사찰 주변 가계','소작 농가','자작 농가','몰락 양반','상인 가계','어부 가계','백정'].includes(origin);
}
function royalSuccession(year,birthYear,origin,gender){
 // A random relative may not replace a recorded reigning monarch.
 // Historical kings require a separate verified named-biography mode.
 return {allowed:false,reason:'실제 국왕의 재위·계보와 인물을 확인하지 않은 무작위 왕위 계승은 허용하지 않음',year,birthYear,origin,gender};
}
function canInspect(origin,rank,office,role,year){
 return !!office&&rank>=2&&year>=1500&&year<1894&&role!=='왕'&&origin!=='왕실 종친';
}
return Object.freeze({SOURCES,REGIONAL_DAEDONG,tribute,military,originLabel,legalStatus,childStatus,templeEntry,royalSuccession,canInspect});
});
