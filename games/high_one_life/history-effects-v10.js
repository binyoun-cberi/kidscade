/* Historical effects are EDUCATIONAL FICTION.
 * Source-driven factual dates live in history-data-v10.js.
 * Effects never infer a real person's politics, participation, mortality or guilt.
 */
(function(root,factory){
 const api=factory(root?.OneLifeHistoryData10);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeHistoryEffects10=api;
})(typeof window!=='undefined'?window:null,function(Data){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const c=(label,note)=>Object.freeze({label,note});
const OPTIONS=Object.freeze({
 'colonial-school':[c('가족과 배울 방법을 알아본다','시간·거리·경제적 제약 속에서 다른 배움터도 찾음'),c('생업에 필요한 기술을 먼저 배운다','교육 기회는 줄 수 있지만 기술 경험을 얻음')],
 'rural-land':[c('가족의 생업을 지킬 방법을 알아본다','생활과 거주 여건을 다시 의논함'),c('다른 지역의 일을 알아본다','거주지와 직업 경로가 달라질 수 있음')],
 'community-news':[c('사실을 확인하러 나선다','사실을 확인하고 주변의 이야기를 경청함'),c('가족과 일상의 안전을 먼저 살핀다','가정의 생활과 안전에 더 집중함')],
 'wartime-labor':[c('가족과 현재 상황을 의논한다','일자리와 생계를 유지하기 위한 방안을 찾음'),c('가능한 기술과 배움을 이어 간다','제약 속에서도 공부·훈련 기회를 알아봄')],
 liberation:[c('중단했던 배움의 기회를 알아본다','학업과 기술을 다시 배울 가능성'),c('가족의 생계를 정비한다','변화 속에서도 일상과 생활을 다시 세움')],
 transition:[c('지역의 새로운 교육·훈련 정보를 찾아본다','진학·기술 관련 기회 탐색'),c('가족과 생계를 위한 계획을 세운다','생활 기반 정비')],
 'war-start':[c('가족과 피란·연락 방법을 준비한다','안전한 이동을 도모하지만 시간·비용 부담이 생길 수 있음'),c('이웃과 서로 도울 방법을 찾는다','주변 지원 관계를 살리며 생활 필수품을 준비함'),c('가족의 돌봄과 생계를 우선 정리한다','당장 이동하지 않더라도 대비하며 생활을 조정함')],
 'war-years':[c('가족의 안부와 생활필수품을 확인한다','모든 사람에게 같은 피해가 발생하는 것은 아님'),c('아이와 가족의 배움·생활을 지킬 방법을 찾는다','임시 배움·돌봄을 고려함')],
 armistice:[c('다시 책을 펼친다','복학·지역 학습·기술훈련 중 가능한 경로 탐색'),c('일터를 찾아 나선다','생계 기반을 다시 만드는 경로')],
 rebuild:[c('주거와 가족 생활을 함께 정비한다','생활 안정에 시간을 쓰고 비용을 나눠 부담함'),c('지역의 직업훈련을 알아본다','새로운 기술을 익히는 기회')],
 'civic-life':[c('사건의 배경을 공부하고 주변의 이야기를 듣는다','주변에서 들은 소식을 기록해 두었다'),c('가족과 생활을 이어 가며 소식을 살핀다','가족의 일상과 안전에 집중함')],
 'industrial-choice':[c('기술을 배우고 새로운 일자리를 찾아본다','직업 기술·교육 기회 확대'),c('지금 지역에서 생업을 이어 간다','지역의 인연을 유지하며 기존 일을 다듬음')],
 mobility:[c('다른 지역의 일자리와 생활을 비교한다','이동 비용과 새로운 관계를 함께 고려함'),c('지금 사는 지역을 기반으로 성장한다','기존 인연과 거주지를 유지함')],
 'labor-rights':[c('안전과 권리를 지키는 방법을 배운다','노동환경과 안전을 살필 수 있음'),c('동료와 휴식·근무 여건을 의논한다','일상 속 근로 환경을 돌아봄')],
 'family-memories':[c('가족의 옛 이야기와 기억을 기록한다','과거에 겪은 일을 기억하며 관계를 살핌'),c('가까운 사람에게 안부를 전한다','가족과 연락을 이어 감')],
 'community-festival':[c('사람들과 축제·행사를 즐긴다','지역의 새로운 경험과 인연'),c('집에서 소식을 접하며 가족과 시간을 보낸다','소박한 일상과 가족의 관계')],
 'financial-crisis':[c('당분간 생활비를 줄이고 안전자금을 마련한다','현금 여력을 보존하지만 생활에 제약'),c('재교육과 새 일자리를 알아본다','시간과 비용이 들지만 다른 직업 가능성'),c('가족·이웃과 서로 도울 방법을 찾는다','지원 관계와 생계 부담을 함께 고려함')],
 recovery:[c('다시 취업·훈련 기회를 알아본다','경험을 살려 새로운 경로 탐색'),c('현재 생활을 유지하며 가계를 점검한다','지출과 저축 균형을 점검함')],
 pandemic:[c('가족과 안전한 생활·연락 방식을 정한다','건강과 일상 리듬을 살피며 관계 유지'),c('학교·일터의 바뀐 환경에 적응한다','배움과 일에 필요한 다른 방법 모색')],
 'pandemic-recovery':[c('변화한 생활과 관계를 돌본다','지나온 일을 돌아보고 필요한 도움을 살핌'),c('새로운 학습·근무 방식을 익힌다','생활에 맞는 기술과 일정을 마련함')]
});
const ACTION_ACCOUNTS=Object.freeze({
 '가족과 생계를 위한 계획을 세운다':'가족과 생계를 위한 계획을 세우기로 했다',
 '가족·이웃과 서로 도울 방법을 찾는다':'가족·이웃과 서로 도울 방법을 찾기로 했다'
});
const important=new Set(['colonial-school','rural-land','wartime-labor','liberation','war-start','war-years','armistice','industrial-choice','mobility','financial-crisis','pandemic']);
function eligible(life,fact){
 if(!fact?.scenario||!OPTIONS[fact.scenario])return false;
 if(life.country?.[0]!=='대한민국'||!life.alive)return false;
 if(life.age<8)return false; // Preschoolers do not make adult war or economic decisions.
 if(['financial-crisis','industrial-choice','labor-rights','mobility','recovery','rebuild'].includes(fact.scenario)&&life.age<16)return false;
 if(['colonial-school'].includes(fact.scenario)&&life.age>32)return false;
 if(fact.scenario==='rural-land'&&life.profile?.settlement!=='농촌')return false;
 if(fact.scenario==='armistice'&&life.age<8)return false;
 if(fact.scenario==='war-years'&&life.age<10)return false;
 if(fact.scenario==='family-memories'&&life.age<14)return false;
 return true;
}
function selectFact(life,facts){
 const options=(facts||[]).filter(f=>eligible(life,f));
 options.sort((a,b)=>Number(important.has(b.scenario))-Number(important.has(a.scenario)));
 return options[0]||null;
}
function prompt(fact,life){
 if(!eligible(life,fact))return null;
 return {age:life.age,title:fact.year+'년 · '+fact.title,
 description:fact.detail+' 그해 우리 가족은 어떻게 살아갈까?',
 options:OPTIONS[fact.scenario],history:true,source:fact.source};
}
function tag(life,state,value){
 if(!state.tags.includes(value))state.tags.push(value);
 if(life.world9&&!life.world9.memories.includes('역사:'+value)&&life.world9.memories.length<80)
  life.world9.memories.push('역사:'+value);
 if(life.arc&&!life.arc.tags.includes('v10-'+value))life.arc.tags.push('v10-'+value);
}
function money(life,amount){
 if(life.money&&Number.isFinite(life.money.netWorth))
  life.money.netWorth=Math.round(clamp(life.money.netWorth+amount,-2e7,2e7));
}
function stats(life,delta){life.change(delta);}
function move(life,state){
 if(state.moves>=2)return false;
 const p=life.profile;if(!p)return false;
 const before=p.city;
 // Symbolic fictional relocation; avoids claiming exact real-world refugee routes.
 const dest=p.settlement==='농촌'?'지역의 다른 마을':'다른 지역의 임시 거처';
 p.city=dest;p.settlement='소도시';state.moves++;
 tag(life,state,'거주지 이동');
 life.logEvent('가족과 상의해 '+before+'에서 '+dest+'로 생활 터전을 옮겼다.','history-impact');
 return true;
}
function school(life,state){
 if(life.age<6||life.age>21)return false;
 if(!state.schoolInterrupted){
  state.schoolInterrupted=true;
  if(life.world)life.world.schooling='전쟁과 시대 변화로 공부를 쉬는 중';
  tag(life,state,'학업 중단');
  life.logEvent('한동안 학교에 갈 수 없었다. 다시 공부할 날을 기다렸다.','history-impact');
 }
 return true;
}
function plan(life,state,year,kind,text){
 if(state.followups.length>=12)return;
 if(state.followups.some(x=>x.year===year&&x.kind===kind))return;
 state.followups.push({year,kind,text});
}
function apply(life,state,fact,index){
 const opts=OPTIONS[fact.scenario],i=Number(index);
 if(!opts||!Number.isInteger(i)||i<0||i>=opts.length)return false;
 const key=fact.scenario,year=life.year;
 const notes=[];
 switch(key){
 case 'war-start':
  tag(life,state,'한국전쟁 시기');
  school(life,state);
  state.hardship=Math.max(state.hardship,2);
  if(i===0){move(life,state);money(life,-450);notes.push('안전을 위한 이동과 생활비를 마련했다.');}
  if(i===1){stats(life,{bonds:4,knowledge:1});notes.push('이웃과 연락망을 만들고 필요한 물건을 나눴다.');}
  if(i===2){money(life,-180);stats(life,{bonds:2});notes.push('가족이 함께 생계와 돌봄을 이어 갈 계획을 세웠다.');}
  plan(life,state,1953,'war-after','전쟁 시기에 겪은 이동·돌봄·학업 경험을 돌아보며 생활을 다시 정비했다.');
  break;
 case 'war-years':
  tag(life,state,'전쟁 중 가족 돌봄');
  if(i===0){stats(life,{bonds:3});money(life,-80);}
  else{stats(life,{knowledge:2,bonds:1});school(life,state);}
  break;
 case 'armistice':
  tag(life,state,'정전 이후 생활 회복');
  if(i===0){
   if(state.schoolInterrupted){
     state.schoolInterrupted=false;
     life.world.schooling='다시 교육·기술을 배우는 중';
     life.world.educationYears=Math.min(16,(life.world.educationYears||0)+1);
     life.world.educationLevel=life.age>=17?'직업훈련·재교육 탐색':'기초 교육 재개';
     tag(life,state,'재교육 시작');
    }
   stats(life,{knowledge:5,happiness:2});notes.push('교육과 기술을 다시 배울 길을 찾기 시작했다.');
  }else{stats(life,{knowledge:2,bonds:1});money(life,110);notes.push('지역에서 생계를 꾸릴 방법을 찾아보기 시작했다.');}
  break;
 case 'liberation':
  tag(life,state,'광복의 해');
  if(i===0){stats(life,{knowledge:4});notes.push('새로운 교육 경로를 알아보았다.');}
  else{stats(life,{bonds:2});money(life,70);notes.push('가족의 생계를 다시 정비했다.');}
  break;
 case 'industrial-choice':
 case 'mobility':
  if(i===0){
   tag(life,state,key==='mobility'?'이동·진로 탐색':'기술 교육');
   stats(life,{knowledge:3});money(life,-90);
   if(key==='mobility'&&life.profile?.settlement==='농촌')move(life,state);
   notes.push('새로운 일자리와 배움을 알아보았다.');
  }else{stats(life,{bonds:2,knowledge:1});notes.push('현재 지역의 생업과 관계를 이어 갔다.');}
  plan(life,state,year+4,'skill-echo','예전에 익힌 기술과 사람들의 도움을 바탕으로 새로운 일을 고려했다.');
  break;
 case 'financial-crisis':
  tag(life,state,'외환·금융 위기 경험');
  state.hardship=Math.max(state.hardship,2);
  if(i===0){stats(life,{happiness:-1});money(life,110);notes.push('허리띠를 졸라매며 비상금을 모았다.');}
  if(i===1){stats(life,{knowledge:4});money(life,-130);notes.push('재교육을 알아보고 새로운 일자리에 대비했다.');}
  if(i===2){stats(life,{bonds:5});money(life,-40);notes.push('가족·이웃과 도움을 주고받을 방법을 마련했다.');}
  plan(life,state,year+2,'financial-recovery','경제가 어려웠던 시기의 선택을 돌아보며 저축·기술·인연을 다시 살펴보았다.');
  break;
 case 'pandemic':
  tag(life,state,'감염병 유행기의 생활');
  if(life.age>=6&&life.age<=18){stats(life,{knowledge:1,bonds:-1});notes.push('학교에서 달라진 생활 규칙을 익혔다.');}
  if(i===0){stats(life,{bonds:2,health:1});notes.push('가족과 연락하고 안전한 생활을 이어 가기로 했다.');}
  else{stats(life,{knowledge:3});notes.push('일과 배움의 방식을 조정했다.');}
  plan(life,state,year+2,'pandemic-memory','달라진 생활을 겪은 뒤 관계와 공부·일하는 방법을 다시 생각했다.');
  break;
 case 'colonial-school':
  tag(life,state,'식민지 시기 배움의 제약');
  if(i===0){stats(life,{knowledge:2});money(life,-35);}else{stats(life,{knowledge:1});money(life,30);}
  break;
 case 'rural-land':
  tag(life,state,'식민지 시기 생업 변화');
  if(i===0){stats(life,{bonds:2});money(life,-65);}
  else{stats(life,{knowledge:2});money(life,-70);move(life,state);}
  break;
 case 'wartime-labor':
  tag(life,state,'전시 동원 체제의 영향');
  if(i===0){stats(life,{bonds:2});money(life,-55);}else{stats(life,{knowledge:2});money(life,-25);}
  break;
 case 'rebuild':
  tag(life,state,'전후 복구');
  if(i===0){stats(life,{bonds:2});money(life,-70);}else{stats(life,{knowledge:3});money(life,-40);}
  break;
 case 'community-news':
 case 'civic-life':
 case 'labor-rights':
 case 'family-memories':
  if(i===0)stats(life,{knowledge:2,bonds:1});else stats(life,{bonds:3});
  tag(life,state,'시대의 변화에 관한 기억');
  break;
 case 'transition':
 case 'recovery':
 case 'pandemic-recovery':
  if(i===0)stats(life,{knowledge:3});else stats(life,{bonds:2});
  break;
 case 'community-festival':
  if(i===0)stats(life,{happiness:3,bonds:2});else stats(life,{happiness:2,bonds:1});
  break;
 default:return false;
 }
 state.decisions.push({id:fact.id,scenario:key,year,age:life.age,index:i});
 state.decisions=state.decisions.slice(-50);
 const action=ACTION_ACCOUNTS[opts[i].label]||opts[i].label;
 life.logEvent(fact.year+'년 '+fact.title+'. '+action+'. '+notes.join(' ')+'','history-choice');
 return true;
}
function autoContext(life,state,fact){
 if(fact.scenario==='war-start'&&life.age<8){
  state.hardship=Math.max(state.hardship,2);tag(life,state,'한국전쟁 시기');
  state.familyProtected=true;
  if(life.age>=6)school(life,state);
  life.logEvent('어른들은 어린아이를 안고 어디서 밤을 보내야 할지 의논했다.','history-impact');
  plan(life,state,1953,'war-after','전쟁 시기의 가족 경험을 돌아보며 생활을 다시 정비했다.');
 }
 if(fact.scenario==='pandemic'&&life.age<8){
  tag(life,state,'감염병 유행기의 생활');
  life.logEvent('어른들은 아이를 곁에 두고 하루를 조심스레 보냈다.','history-impact');
 }
}
return Object.freeze({OPTIONS,ACTION_ACCOUNTS,eligible,selectFact,prompt,apply,autoContext,important});
});
