/* Careers in One Life v6: fictional job opportunities, not national employment rates. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.OneLifeCareers6=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
const data={
education:['교실','배움과 교육','학생과 보호자',.91,'유아교사,초등교사,특수교육 교사,직업훈련 강사,도서관 교육사,교육 콘텐츠 제작자,평생교육 지도자'],
science:['연구실','실험과 분석','연구 동료',1.14,'생명과학 연구원,화학 분석가,환경 과학자,천문 연구원,실험 기술자,의학 연구원,지질 조사원'],
health:['진료실','건강과 돌봄','환자와 가족',1.02,'간호사,물리치료사,보건 교육사,약사,응급구조사,돌봄 지원사,의료 행정가'],
technology:['기술 작업장','기술과 개발','사용자와 동료',1.17,'소프트웨어 개발자,게임 개발자,전기 기사,로봇 정비사,통신 기술자,데이터 분석가,전자 제품 수리사'],
trades:['수리 작업장','제작과 수리','고객과 동료',1.03,'목수,용접 기술자,배관 기술자,자동차 정비사,제빵사,미용사,의류 재단사'],
agriculture:['농장','생태와 재배','이웃과 생산자',.86,'벼 재배 농부,과수 재배자,축산 관리자,산림 관리사,어업 종사자,식품 가공사,도시농업 활동가'],
arts:['공연장','예술과 창작','관객과 동료 예술가',.85,'싱어송라이터,연극 배우,음악 교사,화가,만화가,사진작가,영화 편집자'],
media:['편집실','기록과 전달','독자와 취재원',.91,'기자,소설가,통번역사,라디오 진행자,출판 편집자,다큐멘터리 감독,방송 기술자'],
sports:['경기장','훈련과 지도','선수와 팀원',.87,'육상 선수,팀 스포츠 선수,체육 지도자,재활운동 지도자,스포츠 해설가,산악구조 활동가,유소년 스포츠 감독'],
business:['가게','경영과 판매','손님과 거래처',1.03,'동네 상점 운영자,음식점 운영자,온라인 판매자,물류 사업가,공예 공방 운영자,관광 서비스업자,사회적기업 운영자'],
civic:['지역 기관','공공 문제 해결','주민과 이웃',.91,'사회복지사,소방 안전요원,도시계획 전문가,지역 권익 활동가,공공기관 직원,이주민 지원 통역사,환경 보전 활동가'],
service:['서비스 일터','현장 서비스','이용객과 동료',.88,'버스 운전사,물류 관리사,호텔 안내원,요리사,카페 바리스타,여행 안내사,건물 관리사']
};
const tracks=Object.fromEntries(Object.entries(data).map(([id,v])=>[id,Object.freeze({id,place:v[0],craft:v[1],people:v[2],income:v[3],jobs:v[4].split(',')})]));
const scenes=Object.freeze(['home','classroom','campus','library','laboratory','clinic','hospital','rehab','computers','workshop','factory','construction','farm','orchard','forest','harbor','stage','gallery','studio','stadium','gym','market','bakery','restaurant','cafe','townhall','street','airport','temple','community','retirement','shelter']);
const mainScene={education:'classroom',science:'laboratory',health:'clinic',technology:'computers',trades:'workshop',agriculture:'farm',arts:'stage',media:'studio',sports:'stadium',business:'market',civic:'townhall',service:'cafe'};
return Object.freeze({tracks,scenes,mainScene});
});