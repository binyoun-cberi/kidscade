/* v6 branching event data: invented probabilities, no forecasts. */
(function(root,factory){const api=factory(root?.OneLifeCareers6);if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.OneLifeEvents6=api;})(typeof window!=='undefined'?window:null,function(C){
'use strict';
const list=[];
function add(id,domain,min,max,lines,change={},needs=[],scene='',weight=1){list.push({id,domain,min,max,lines,change,needs,scene,weight});}
const beats=[
['first',22,39,d=>['처음으로 '+d.place+'에서 중요한 업무를 맡았다.',d.craft+'의 첫 프로젝트를 끝냈다.'],{skill:1,security:1}],
['mentor',22,54,d=>['선배에게 '+d.craft+'을 배웠다.','동료에게 조언을 구하며 새로운 일을 익혔다.'],{network:2,knowledge:3,tag:'mentor'}],
['outreach',24,73,d=>[d.people+'를 위한 지역 활동에 참여했다.',d.craft+' 경험을 이웃과 나누었다.'],{community:2,bonds:4}],
['setback',24,70,d=>[d.place+'의 환경이 바뀌어 계획을 조절했다.','예상 밖의 비용으로 생활 방식을 바꿨다.'],{money:-3200,happiness:-3,tag:'work-setback'}],
['invention',26,72,d=>[d.craft+'에 새 기술을 적용했다.','시행착오 끝에 기존 방법을 개선했다.'],{skill:2,knowledge:4,tag:'innovation'}],
['colleague',28,78,d=>[d.people+'와 공동 프로젝트를 시작했다.','오랫동안 믿을 수 있는 동료를 만났다.'],{network:3,security:1,tag:'partnership'}],
['reskill',29,82,d=>[d.craft+'을 다시 배우는 과정을 수료했다.','다른 분야의 기술을 현장에 활용했다.'],{skill:3,learning:2,tag:'retrained'}],
['pivot',30,73,d=>['직업을 유지할지 다른 일을 할지 고민했다.',d.place+'에서 배운 기술을 새 직장에 적용했다.'],{careerRisk:1,learning:1,tag:'career-change'}],
['recognized',32,77,d=>[d.craft+' 능력을 인정받아 책임이 커졌다.',d.people+'가 꾸준히 해 온 노력을 알아주었다.'],{security:2,network:2,money:2200,tag:'recognized'}],
['new-life',40,85,d=>[d.craft+'을 새로운 분야에서도 활용했다.','이직한 뒤에도 예전 경험이 큰 도움이 됐다.'],{skill:1,learning:2,tag:'transferable'}],
['legacy',49,102,d=>[d.craft+'을 다음 세대에 가르쳤다.',d.people+'와 함께 후배들의 도전을 도왔다.'],{community:3,bonds:5,tag:'legacy'}]
];
for(const [id,d] of Object.entries(C.tracks))for(const [key,a,b,fn,effect] of beats)add(id+'-'+key,id,a,b,fn(d),effect);
const arcs=[
['caregiver',28,80,'가족 돌봄으로 근무 시간을 조절했다.','가족과 돌봄 책임을 나눴다.',{bonds:5,money:-1500},'family','home'],
['night-school',25,75,'직장 생활과 저녁 공부를 병행했다.','미뤄 둔 공부를 다시 시작했다.',{knowledge:5,learning:2,money:-2000},'career','campus'],
['community-garden',16,89,'동네 사람들과 텃밭을 가꾸었다.','이웃과 작은 정원을 만들었다.',{community:2,happiness:4},'','garden'],
['migration-job',22,72,'다른 나라의 일터에 적응했다.','새로운 지역에서 직업 경력을 쌓았다.',{network:2,skill:2,tag:'migrant'},'career','airport'],
['migration-return',29,88,'멀리 떠났다가 고향으로 돌아왔다.','해외에서 배운 기술을 가족과 나눴다.',{bonds:5,network:1},'migrant','home'],
['legal-aid',19,79,'억울한 일을 겪어 법률 상담을 받았다.','오해를 풀기 위해 기록을 모았다.',{knowledge:3,happiness:-3,tag:'legal-help'},'','townhall'],
['reconciliation',25,91,'친구와 오랜 오해를 풀었다.','갈등을 대화로 해결했다.',{bonds:6},'legal-help','community'],
['rain-rescue',10,95,'폭우 피해를 입은 이웃을 도왔다.','재난 대비 방법을 배우고 공유했다.',{community:3,knowledge:2},'','shelter'],
['climate-adapt',18,97,'더운 날에는 건강에 맞춰 일했다.','변하는 계절에 생활 방식을 조정했다.',{health:3,wellness:2},'','home'],
['fair-work',24,73,'근로 조건을 확인하고 조언을 구했다.','공정한 대우에 관해 동료와 상의했다.',{network:3,knowledge:2},'career','townhall'],
['small-inheritance',26,80,'작은 유산을 생활비에 보탰다.','가족에게 받은 물건과 추억을 정리했다.',{money:3000,bonds:2},'','home'],
['surprise-gain',29,79,'오래 보유한 자산이 크게 올랐다.','작은 투자에서 뜻밖의 수익이 생겼다.',{money:22000,tag:'windfall'},'savings','market'],
['market-crash',27,78,'투자 가치가 떨어져 계획을 고쳤다.','경제 변동으로 저축이 줄었다.',{money:-17000,tag:'loss'},'savings','market'],
['debt-plan',25,89,'부채 상환 계획을 꾸준히 지켰다.','지출을 줄이며 재정을 회복했다.',{money:4000,security:2},'debt','home'],
['local-politics',31,83,'지역 현안을 함께 토론했다.','주민들의 의견을 공공기관에 전달했다.',{community:3,knowledge:3,tag:'civic-voice'},'community','townhall'],
['peaceful-march',23,78,'안전하고 평화로운 시민행사에 참여했다.','합법적인 집회에서 의견을 나눴다.',{community:3,bonds:2},'civic-voice','street'],
['mentor-return',31,85,'옛 선배에게 직업 조언을 얻었다.','스승과 오랜만에 다시 만났다.',{network:3,security:1},'mentor','classroom'],
['faith-service',25,95,'스스로 선택한 신앙 공동체에서 봉사했다.','서로 다른 철학을 가진 사람들과 이야기했다.',{community:3,bonds:2},'faith','temple'],
['faith-question',23,87,'삶의 신념을 다시 돌아보았다.','여러 종교와 철학을 알아보았다.',{knowledge:4},'faith','temple'],
['accessible-work',22,88,'보조기기를 활용해 일터를 조정했다.','동료들과 접근 가능한 공간을 만들었다.',{skill:2,network:3},'rehab','rehab'],
['help-after-injury',24,85,'재활 경험을 다른 사람과 나눴다.','몸에 맞는 운동과 기술을 익혔다.',{health:4,bonds:4},'rehab','gym'],
['late-study',55,100,'노년에도 새로운 언어를 배웠다.','지역 교육 프로그램에서 친구를 만났다.',{knowledge:5,happiness:4},'','library'],
['elder-care',53,101,'오랜 친구와 서로의 생활을 도왔다.','가족과 노후의 돌봄을 계획했다.',{bonds:4,network:2},'family','home'],
['teach-younger',50,103,'어린이들에게 자신의 기술을 가르쳤다.','후배들과 경험을 나눴다.',{community:3,bonds:5},'skill','classroom'],
['volunteer-aid',20,87,'안전한 응급처치를 배웠다.','위급한 상황에서 구조기관에 연락했다.',{knowledge:4,community:2},'','clinic'],
['social-business',30,80,'사회적기업 활동에 참여했다.','수익 일부를 공동체에 투자했다.',{network:2,community:3,money:-1000},'community','market'],
['business-fail',28,75,'사업이 어려워 새 직업을 준비했다.','가게를 정리하고 다시 공부했다.',{money:-6500,learning:2,tag:'business-failed'},'business','market'],
['business-return',31,77,'옛 동료의 도움으로 재창업했다.','실패의 경험으로 작은 일을 다시 시작했다.',{network:3,security:2},'business-failed','workshop'],
['art-street',19,81,'작은 광장에서 음악을 연주했다.','거리 전시에서 작품을 공개했다.',{happiness:5,network:2},'arts','street'],
['sport-rehab',19,82,'훈련 중 몸을 충분히 쉬게 했다.','운동 부상 예방과 재활을 배웠다.',{health:5,knowledge:2},'sports','gym'],
['family-food',10,95,'가족의 요리법을 배웠다.','음식을 함께 만들며 이야기를 나눴다.',{bonds:5,happiness:3},'','restaurant'],
['career-trip',24,70,'장기 출장 뒤 삶을 돌아봤다.','다른 지역에서 동료와 협력했다.',{network:2,happiness:-2},'career','airport'],
['regional-history',15,92,'마을의 오랜 이야기를 기록했다.','건물과 거리에 얽힌 역사를 조사했다.',{community:2,knowledge:4},'','library'],
['wildlife-care',12,80,'다친 동물을 보고 보호기관에 연락했다.','동물을 돌보는 책임을 배웠다.',{bonds:3,knowledge:3},'','forest'],
['public-transport',17,84,'교통편이 개선되어 취업 기회가 늘었다.','새 버스 노선을 이용해 학교에 다녔다.',{network:2,learning:1},'','street'],
['friendship',8,90,'낯선 곳에서 평생의 친구를 만났다.','작은 친절이 오래가는 관계가 됐다.',{bonds:6,network:1},'','community'],
['financial-literacy',17,75,'저축과 투자 위험을 배웠다.','수입과 지출을 기록했다.',{knowledge:4,security:2},'','library'],
['later-startup',48,90,'오랜 경험으로 작은 사업을 열었다.','후배와 새 일을 계획했다.',{skill:1,money:-2300},'skill','market']
];
for(const [id,min,max,a,b,change,need,scene] of arcs)add('life-'+id,'all',min,max,[a,b],change,need?[need]:[],scene,id==='surprise-gain'?.1:1);
return Object.freeze({events:list,careerFamilies:Object.keys(C.tracks).length,universalCount:arcs.length});
});