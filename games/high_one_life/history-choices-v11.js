/* 45 contextual, fictional choice seeds from Korean social history.
 * These do not claim a person actually participated in a factual event.
 */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeHistoryChoices11=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const OPTIONS=Object.freeze({
 study:[['배울 기회를 찾아본다','공부와 기술을 익히는 데 시간을 쓴다'],['가족의 생업과 배움을 병행한다','가정과 일상에서 익힐 방법을 찾는다']],
 trade:[['기술을 배우는 시간을 마련한다','기술을 배우며 다른 직업을 준비한다'],['지금 하던 일을 더 익힌다','익숙한 일을 정리하고 경험을 쌓는다']],
 work:[['새로운 일자리를 알아본다','새로운 직업의 조건과 이동 비용을 알아본다'],['기존 일터에서 일하는 방법을 바꾼다','경험을 활용해 현재의 생업을 다듬는다']],
 move:[['다른 지역의 생활을 준비한다','거주지 이동 비용을 알아보고 주변에 연락한다'],['기존 지역에서 생활을 정비한다','친숙한 지역과 인연을 유지한다']],
 family:[['가족들과 시간을 나누어 돌본다','생활 속에서 서로 돌보는 역할을 조정한다'],['지역의 도움을 찾아본다','이웃과 친척에게 도움을 요청한다']],
 market:[['소비를 줄이고 저축을 우선한다','필수 지출을 정리하고 비상 여력을 마련한다'],['새로운 수입 경로를 알아본다','소규모 생업이나 다른 기술을 알아본다']],
 civic:[['사건의 역사적 배경을 더 배운다','서로 다른 기록을 살펴보고 상황을 이해한다'],['가족과 주변 사람의 이야기를 듣는다','안부와 생활을 살피며 관계를 돌본다']],
 community:[['이웃들과 함께 준비한다','다른 사람과 역할을 나누어 생활을 돕는다'],['가족의 일상을 먼저 정비한다','식구들과 필요한 일을 나누어 맡는다']],
 health:[['생활 습관과 위생을 점검한다','건강 관리에 필요한 정보를 확인한다'],['가족·이웃 돌봄을 계획한다','주변의 돌봄 지원과 생활 여건을 살핀다']],
 digital:[['새로운 기술을 직접 배운다','디지털 기기와 업무 도구를 익힌다'],['가족과 필요한 기술을 나눈다','익힌 기술을 주변 사람과 함께 사용한다']]
});
const row=(id,era,min,max,topic,title,detail,condition='')=>
 Object.freeze({id,era,min,max,topic,title,detail,condition});
const PATHS=Object.freeze([
 row('imperial-literacy','precolonial',7,18,'study','동네에서 글을 배우는 기회','먼 거리나 생업 시간 때문에 배우는 방법을 정해야 한다.'),
 row('imperial-craft','precolonial',13,32,'trade','가족의 생업을 이어 갈 방법','주변에서 배우는 기술과 현재의 일을 비교한다.'),
 row('imperial-market','precolonial',18,65,'market','장날의 지출 계획','가족 생활비와 새 물건 구입을 함께 고민한다.'),
 row('imperial-neighbors','precolonial',8,70,'community','함께 고치는 마을 길','이웃들과 시간을 맞춰 필요한 일을 도울 기회다.'),
 row('colonial-school','colonial',7,17,'study','어려운 환경의 통학과 배움','학교까지의 거리와 생활 여건을 생각하며 방법을 고른다.'),
 row('colonial-books','colonial',11,25,'study','이웃에게서 빌린 책','공부할 시간을 따로 마련할지 고민한다.'),
 row('colonial-trade','colonial',15,35,'trade','가족에게 배우는 손기술','새로운 기술을 배울 시간과 생업을 고민한다.'),
 row('colonial-work','colonial',18,59,'work','다른 지역의 생업 소식','친척에게서 새로운 일자리에 관한 편지를 받았다.'),
 row('colonial-transport','colonial',16,55,'move','먼 곳에서 지내는 가족','직장과 가족이 사는 곳을 함께 생각한다.'),
 row('colonial-rural','colonial',20,70,'market','농촌 가계 지출과 수입','가족은 한 계절의 생업과 지출을 정리한다.','rural'),
 row('colonial-urban','colonial',15,55,'work','도시의 수공업 일자리','수공업과 서비스 일을 비교해 본다.','urban'),
 row('colonial-news','colonial',12,80,'civic','변화하는 시대의 소식','여러 사람이 서로 다른 이야기를 전한다.'),
 row('colonial-family','colonial',12,70,'family','다른 지역에 사는 친척','멀리 있는 가족과 돌봄 방법을 의논한다.'),
 row('colonial-community','colonial',12,65,'community','마을 배움터를 함께 꾸리다','이웃들과 필요한 생활의 도움을 나눌 수 있다.'),
 row('transition-school','transition',8,21,'study','새로 정비되는 교육 기회','광복 이후 배움터를 다시 알아본다.'),
 row('transition-trade','transition',16,60,'trade','바뀐 시대의 생업','익숙한 기술과 새로 필요한 일을 비교한다.'),
 row('transition-family','transition',7,80,'family','새로운 생활을 함께 계획','식구들과 거주지와 가계 계획을 의논한다.'),
 row('war-learning','war',8,20,'study','어려운 시기의 배움','사회 상황이 바뀌어 공부할 방법도 달라졌다.'),
 row('war-letters','war',12,85,'family','소식을 기다리는 가족','떨어져 지내는 가족과 연락할 방법을 찾는다.'),
 row('war-supplies','war',16,75,'community','필요한 생활용품 준비','가족과 이웃이 하루에 필요한 물건을 확인한다.'),
 row('war-work','war',18,70,'work','생업을 이어 가는 방법','바뀐 생활 상황 속에서 일할 방법을 고민한다.'),
 row('war-care','war',8,85,'health','함께 지내는 이들의 건강','사람들의 안전과 휴식을 우선 생각한다.'),
 row('rebuild-study','rebuilding',8,23,'study','다시 시작하는 배움','이어 가지 못했던 공부를 어떻게 배울지 고민한다.'),
 row('rebuild-training','rebuilding',16,55,'trade','지역의 직업훈련','새로운 기술을 배울 기회가 생겼다.'),
 row('rebuild-work','rebuilding',18,70,'work','복구하는 마을의 일자리','일을 새로 시작하거나 익숙한 생업을 이어 간다.'),
 row('rebuild-home','rebuilding',15,70,'family','가족의 주거를 정비하다','생활 공간을 정비하는 방법을 가족과 의논한다.'),
 row('rebuild-neighbor','rebuilding',8,85,'community','이웃과 함께하는 복구','동네에서 필요한 일을 함께 나눈다.'),
 row('industrial-tech','industrial',15,50,'trade','새로운 산업 기술','생업에서 쓰는 도구와 기술이 달라지기 시작했다.'),
 row('industrial-factory','industrial',18,55,'work','도시의 새로운 일터','새로운 취업 기회와 기존 생업을 비교한다.'),
 row('industrial-migration','industrial',18,65,'move','고향에 남을까 도시로 갈까','새로운 직장과 기존 관계를 함께 생각한다.'),
 row('industrial-commute','industrial',16,55,'move','통학과 출퇴근 거리','교통비와 시간을 계산한다.'),
 row('industrial-workplace','industrial',18,68,'health','안전한 일터 만들기','몸을 돌보며 일하는 방법을 고민한다.'),
 row('industrial-savings','industrial',18,70,'market','월급에서 저축하기','꾸준히 모을 돈과 필수 생활비를 나누어 본다.'),
 row('industrial-family','industrial',12,80,'family','도시와 고향을 오가는 가족','가족과 연락하고 돌보는 방법을 정한다.'),
 row('industrial-study','industrial',8,18,'study','직업과 공부의 선택','새로운 교육과 기존의 배움을 비교한다.'),
 row('democracy-media','democracy',14,80,'civic','달라지는 사회를 이해하기','신문과 토론에서 들은 이야기를 생각해 본다.'),
 row('democracy-college','democracy',16,28,'study','높아지는 교육 수요','진학과 취업 준비에 쓰는 시간을 비교한다.'),
 row('democracy-employment','democracy',18,60,'work','변화하는 취업 환경','새로운 직업에 도전할지 고민한다.'),
 row('democracy-community','democracy',12,80,'community','동네에서 함께 해결할 일','이웃과 생활환경을 이야기할 기회가 생겼다.'),
 row('crisis-retraining','crisis',19,62,'trade','경제 변화 속 재교육','예전 경험을 살릴 새 기술을 찾아본다.'),
 row('crisis-budget','crisis',18,85,'market','줄어든 여유 자금','가족과 생활비를 다시 계획한다.'),
 row('crisis-job','crisis',18,63,'work','앞으로의 직업 계획','기존 경력을 이어 가거나 새로운 일에 도전한다.'),
 row('crisis-family','crisis',15,85,'family','가족 사이의 상호 지원','힘들 때 서로를 도울 방법을 의논한다.'),
 row('crisis-neighbors','crisis',12,85,'community','서로 나누는 생활 정보','주변 사람들과 필요한 정보를 교환한다.'),
 row('digital-learning','digital',8,85,'digital','처음 배우는 디지털 도구','새로운 기기로 공부하거나 연락할 수 있다.'),
 row('digital-job','digital',18,65,'work','달라지는 업무 방식','새로운 일을 배울지 지금의 경험을 발전시킬지 고민한다.'),
 row('digital-budget','digital',18,85,'market','디지털 가계부','가족의 지출을 편리하게 관리할 방법을 알아본다.'),
 row('digital-family','digital',8,90,'family','멀리 있는 가족과 연락','화면과 전화로 관계를 이어 가는 방법을 생각한다.'),
 row('pandemic-study','pandemic',8,22,'study','바뀐 교육 환경','익숙하지 않은 생활 속에서 배우는 방법을 생각한다.'),
 row('pandemic-care','pandemic',8,90,'health','가족의 건강과 돌봄','안전과 일상의 균형을 고민한다.'),
 row('pandemic-work','pandemic',18,68,'work','달라진 일터의 하루','일하는 방식을 바꾸거나 기존 방법을 조정한다.'),
 row('pandemic-contact','pandemic',8,90,'family','멀리 있는 사람들과의 만남','이전과 다른 방식으로 안부를 나누고 싶다.'),
 row('pandemic-community','pandemic',8,85,'community','이웃과 소식을 나누는 방법','가까운 사람들에게 필요한 도움을 알아본다.')
]);
function candidates(life,seen,era){
 return PATHS.filter(p=>p.era===era&&life.age>=p.min&&life.age<=p.max&&
  !seen.includes(p.id)&&(!p.condition||p.condition===life.profile?.settlement||
    p.condition==='urban'&&life.profile?.settlement==='도시'));
}
function select(life,seen,era){
 if(life.country?.[0]!=='대한민국'||life.age<7||life.year<1900||life.year>2026)return null;
 // A readable narrative: one additional consequential fork every 4 years, not every year.
 if(((life.year+Math.abs(life.seed%4))%4)!==0)return null;
 const choices=candidates(life,seen,era);
 if(!choices.length)return null;
 const n=((life.seed>>>0)^Math.imul(life.year,2246822519))>>>0;
 return choices[n%choices.length];
}
function prompt(item,life){
 if(!item||life.age<item.min||life.age>item.max)return null;
 return {age:life.age,title:item.title,description:item.detail,
  options:OPTIONS[item.topic].map(([label,note])=>({label,note})),historicalLife:true};
}
return Object.freeze({PATHS,OPTIONS,candidates,select,prompt,count:PATHS.length});
});
