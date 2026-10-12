/* Educational economy and occupation eras: model assumptions, never real wage data.
 * All money values in the game are arbitrary points; NOT historical won equivalents.
 */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeEraPolicy12=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const PERIODS=[
 {max:1909,era:'precolonial',label:'대한제국 시대의 생업',incomeFactor:.72,costFactor:.82,schoolCap:.58,secondaryCap:.36,jobDisruption:.025},
 {max:1944,era:'colonial',label:'일제강점기의 제한된 교육·일자리',incomeFactor:.70,costFactor:.88,schoolCap:.63,secondaryCap:.43,jobDisruption:.035},
 {max:1947,era:'transition',label:'광복 이후 교육·일자리 재정비',incomeFactor:.72,costFactor:.85,schoolCap:.68,secondaryCap:.47,jobDisruption:.075},
 {max:1953,era:'war',label:'한국전쟁기의 생활 기반',incomeFactor:.58,costFactor:.98,schoolCap:.55,secondaryCap:.38,jobDisruption:.12},
 {max:1961,era:'rebuilding',label:'전후 복구와 직업훈련',incomeFactor:.76,costFactor:.84,schoolCap:.78,secondaryCap:.60,jobDisruption:.06},
 {max:1987,era:'industrial',label:'산업화와 지역 이동',incomeFactor:.91,costFactor:.96,schoolCap:.85,secondaryCap:.74,jobDisruption:.04},
 {max:1996,era:'democracy',label:'민주화 이후 산업 변화',incomeFactor:1,costFactor:1,schoolCap:.97,secondaryCap:.91,jobDisruption:.04},
 {max:2009,era:'crisis',label:'외환위기·정보화 시기',incomeFactor:.97,costFactor:1.03,schoolCap:.98,secondaryCap:.95,jobDisruption:.055},
 {max:2019,era:'digital',label:'디지털 경제와 생활',incomeFactor:1,costFactor:1,schoolCap:1,secondaryCap:1,jobDisruption:.04},
 {max:2022,era:'pandemic',label:'감염병 유행기의 일상',incomeFactor:.94,costFactor:1.02,schoolCap:1,secondaryCap:1,jobDisruption:.07},
 {max:9999,era:'digital',label:'현대 또는 가상 미래',incomeFactor:1,costFactor:1,schoolCap:1,secondaryCap:1,jobDisruption:0}
].map(p=>Object.freeze(p));
const safe=(x,period,defaultValue)=>x?.country?.[0]==='대한민국'?period:defaultValue;
function at(life,year=life?.year){
 const yearValue=Number.isFinite(year)?year:2026;
 const found=PERIODS.find(x=>yearValue<=x.max)||PERIODS.at(-1);
 if(life?.country?.[0]!=='대한민국')return null;
 // Macro context only affects country-level fictional play, never asserted per-person fact.
 const shock=([1997,1998].includes(yearValue)?0.09:
  yearValue===2008?0.05:yearValue===2020?0.06:0);
 return {...found,jobDisruption:found.jobDisruption+shock};
}
const JOBS={
 precolonial:{
  agriculture:['소작·자영 농업 종사자','농사와 가축 돌봄 종사자'],trades:['목수','대장장이'],
  education:['서당·지역 배움터 교육자','글과 셈을 가르치는 사람'],science:['관측·측량 보조','기술 기록 보조'],
  health:['약방 보조','지역 의료 종사자'],service:['장터 일꾼','음식점 종업원'],
  business:['장터 상인','작은 가게 운영자'],civic:['지역 서기','공공 업무 보조'],
  media:['인쇄소 직원','서책 편집 보조'],technology:['전신·우편 업무 종사자','기계 수리 기술자'],
  arts:['공예 장인','공연인'],sports:['체육 활동 지도자','지역 놀이 지도자']
 },
 colonial:{
  agriculture:['농업 노동자','농산물 유통 종사자'],trades:['목수','방직·수공업 노동자'],
  education:['지역 교육자','야학 학습 도우미'],science:['실험실 보조','측량 보조'],
  health:['의료 보조','약방 종사자'],service:['상점 종업원','식당 종업원'],
  business:['장터 상인','소규모 가게 운영자'],civic:['지역 서무 직원','행정 업무 보조'],
  media:['인쇄소 직원','신문·출판 보조'],technology:['철도 노동자','전신·통신 기술자'],
  arts:['공예 제작자','공연인'],sports:['체육 활동 지도자','체육 동호인']
 },
 war:{
  agriculture:['농업 노동자','식량 생산 종사자'],trades:['옷 수선 기술자','목공·수리 기술자'],
  education:['임시 배움터 도우미','지역 교육자'],science:['기술 보조','공구 수리 보조'],
  health:['보건 보조','의료기관 보조'],service:['지역 상점 종업원','급식·식품 보조'],
  business:['생필품 판매 종사자','작은 가게 운영자'],civic:['지역 공동체 지원자','행정 업무 보조'],
  media:['신문 인쇄 보조','기록 정리 보조'],technology:['운송·통신 기술자','기계 수리 종사자'],
  arts:['지역 공예 제작자','공연인'],sports:['체육 활동 도우미','체육 지도자']
 },
 rebuilding:{
  agriculture:['농업 종사자','식품 생산 노동자'],trades:['건설 기술자','기계 수리 기술자'],
  education:['학교 교육자','직업훈련 지도자'],science:['기술 연구 보조','측량 기술자'],
  health:['지역 의료 종사자','보건소 업무 보조'],service:['상점 직원','교통 서비스 종사자'],
  business:['작은 가게 운영자','시장 상인'],civic:['지역 행정 업무 종사자','마을 공동체 지원자'],
  media:['신문 인쇄 직원','라디오 방송 보조'],technology:['전기 설비 기술자','철도·통신 기술자'],
  arts:['미술·공예 종사자','공연인'],sports:['체육 지도자','학교 체육 지원자']
 },
 industrial:{
  agriculture:['농업 종사자','농업 기계 관련 종사자'],trades:['봉제·제조 노동자','건설 기능공'],
  education:['학교 교육자','직업학교 지도자'],science:['산업 연구 보조','공장 품질 관리 종사자'],
  health:['병원 의료 종사자','보건 업무 종사자'],service:['운송·물류 종사자','매장 종업원'],
  business:['소규모 가게 운영자','제조업 자영업자'],civic:['지역 공공 행정 종사자','지역 사회 활동가'],
  media:['신문·출판 직원','방송 제작 보조'],technology:['전기·전자 기술자','기계 설비 기술자'],
  arts:['공연인','미술·디자인 종사자'],sports:['체육 지도자','경기 지원 종사자']
 },
 democracy:{
  agriculture:['농업 경영자','식품 가공 종사자'],trades:['기계·제조 기술자','건축 기능공'],
  education:['학교 교육자','교육 프로그램 운영자'],science:['연구 보조','연구개발 기술자'],
  health:['보건 의료 종사자','병원 지원 종사자'],service:['관광 서비스 종사자','물류 업무 종사자'],
  business:['소매업 경영자','지역 서비스업 자영업자'],civic:['지방 행정 종사자','공공서비스 업무 종사자'],
  media:['언론·출판 종사자','방송 기술자'],technology:['컴퓨터 전산 업무 종사자','전자 기술자'],
  arts:['미술·디자인 종사자','공연인'],sports:['체육 지도자','경기 운영 종사자']
 },
 crisis:{
  agriculture:['농업 생산 종사자','농식품 유통 종사자'],trades:['제조·정비 기술자','건설 기능공'],
  education:['학교 교육자','직업 재교육 강사'],science:['연구개발 종사자','시험·분석 보조'],
  health:['병원 의료 종사자','보건 지원 종사자'],service:['매장 서비스 종사자','물류 업무 종사자'],
  business:['지역 자영업자','온라인 상점 운영자'],civic:['지역 사회 서비스 종사자','공공 행정 종사자'],
  media:['출판·방송 종사자','영상 편집자'],technology:['전산실 담당자','웹·소프트웨어 개발자'],
  arts:['시각디자인 종사자','공연인'],sports:['체육 지도자','경기 지원 종사자']
 }
};
const qualified=new Set(['education','science','health','technology']);
function careerName(life,sector,index,fallback){
 const p=at(life);
 if(!p||life.year>=2010)return fallback;
 const professions=JOBS[p.era]||JOBS[p.era==='transition'?'rebuilding':'industrial'];
 const names=professions?.[sector]||['생활 기술 종사자','지역 일자리 종사자'];
 const id=(Math.abs(Math.floor(index))+(life.seed>>>0)%2)%names.length;
 const name=names[id];
 const level=life.world?.educationYears||0;
 if(qualified.has(sector)&&level<5){
  if(sector==='education')return '지역 배움터 보조';
  if(sector==='science')return '연구·기술 업무 보조';
  if(sector==='health')return '보건·의료 업무 보조';
  return p.era==='precolonial'?'전신·우편 업무 보조':'기계·전기 업무 보조';
 }
 return name;
}
return Object.freeze({PERIODS,JOBS,at,careerName});
});
