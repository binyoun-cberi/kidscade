/* ONE LIFE v9 — persistent people, causal memories and in-year stories.
 * Educational fiction: social, financial and health probabilities below
 * are never represented as measured country-specific population rates.
 * The module wraps v8 once. Existing v1-v8 saves remain loadable.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeWorld2,root?.OneLifeWorld4,root?.OneLifeWorld8);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeWorld9=api;
})(typeof window!=='undefined'?window:null,function(Sim,W2,W4,W8){
'use strict';
const VERSION=9,MAX_PEOPLE=24,MAX_LOG=760,MAX_QUEUE=12;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const roll=(life,salt)=>W4.roll(life,life.age,salt);
const names={
 대한민국:{female:['지민','하윤','수연','소희','은서','영희'],male:['지훈','도현','민수','준호','성민','영수']},
 일본:{female:['아오이','유이','미오','하나'],male:['렌','하루토','소타','유토']},
 브라질:{female:['아나','마리아','줄리아','베아트리스'],male:['페드루','루카스','주앙','가브리엘']},
 미국:{female:['에마','올리비아','소피아','릴리'],male:['노아','제임스','리엄','올리버']}
};
const common={female:['미나','리아','사라','엘라'],male:['아민','다니엘','아담','레오']};
const HOBBIES=['축구','그림','독서','음악','요리','체스','정원 가꾸기','사진'];
function chooseName(life,salt,sex){
 const pool=(names[life.country[0]]||common)[sex]||common.female;
 const hash=((life.seed ^ Math.imul(salt+1,2654435761))>>>0);
 return pool[hash%pool.length];
}
function person(state,id,role,name,birthYear,relationship=65){
 const found=state.people.find(p=>p.id===id);
 if(found)return found;
 if(state.people.length>=MAX_PEOPLE)return null;
 const p={id,role,name,birthYear,alive:true,relation:relationship,school:'',job:'',milestones:[],deadYear:null};
 state.people.push(p);return p;
}
function addMemory(state,tag){if(!state.memories.includes(tag)&&state.memories.length<80)state.memories.push(tag);}
function init(life){
 const p=W2.enrich(life).profile;
 const state={version:VERSION,people:[],memories:[],hobby:'',hobbySince:null,
   eventsSeen:[],yearQueue:[],activeChoice:null,queueYear:-1,decisions:[],annualEvents:0,
   finance:{debt:0,originalDebt:0,rate:.05,yearsLeft:0,home:false,paidOff:false,lastInterest:0,lastPrincipal:0},
   source:'fictional-lifepath-v9'};
 person(state,'mother','어머니',chooseName(life,21,'female'),life.birthYear-p.motherAge,85).job=p.motherJob;
 person(state,'father','아버지',chooseName(life,22,'male'),life.birthYear-p.fatherAge,78).job=p.fatherJob;
 for(let i=0;i<Math.min(3,p.siblings);i++)
  person(state,'sibling-'+i,'형제자매',chooseName(life,33+i,i%2?'female':'male'),life.birthYear+(i-1)*3,66);
 person(state,'grandmother','외할머니',chooseName(life,56,'female'),life.birthYear-p.motherAge-28,82);
 return state;
}
function ensure(life){
 W8.ensure(life);
 if(!life.world9)life.world9=init(life);
 return life.world9;
}
function markPerson(life,p,marker,text){
 if(!p||p.milestones.includes(marker))return false;
 p.milestones.push(marker);
 life.logEvent(text,'relationship');
 return true;
}
function record(life,state,key,text,kind='life9'){
 if(state.eventsSeen.includes(key))return false;
 state.eventsSeen.push(key);
 if(state.eventsSeen.length>560)state.eventsSeen.shift();
 life.logEvent(text,kind);state.annualEvents++;
 return true;
}
function syncPeople(life){
 const state=ensure(life),p=life.profile;
 if(p.partner&&!state.people.some(x=>x.id==='partner')){
  const sex=life.gender==='여자'?'male':'female';
  const partner=person(state,'partner','동반자',chooseName(life,93,sex),life.birthYear+2,84);
  if(partner)life.logEvent(partner.name+'(와)과 함께 생활하며 서로의 이야기를 나누기 시작했다.','relationship');
 }
 if(p.child&&!state.people.some(x=>x.id==='child-1')){
  const child=person(state,'child-1','자녀',chooseName(life,95,'female'),life.year,92);
  if(child){addMemory(state,'첫 자녀');life.logEvent(child.name+'(이)가 가족이 되었다.','relationship');}
 }
 return state;
}
function families(life,state){
 for(const p of state.people){
  if(!p.alive)continue;
  const age=life.year-p.birthYear;
  if(age<0)continue;
  if(p.role==='자녀'){
   for(const [mark,a,name,school] of [
    ['school',6,'학교에 입학','초등 재학'],['middle',12,'중등 과정을 시작','중등 재학'],
    ['graduate',18,'학교를 마치고 자신의 진로를 고민','교육·진로 탐색'],
    ['adult',25,'스스로의 생활을 꾸리기 시작','성인기']
   ]){
    if(age===a&&!p.milestones.includes(mark)){
     p.school=school;
     markPerson(life,p,mark,p.name+'(이)가 '+a+'세가 되어 '+name+'했다.');
    }
   }
  }
  if(p.role==='동반자'&&life.age>=40&&life.age%10===0)
   record(life,state,'partner-anniversary-'+life.age,p.name+'(와)과 서로의 삶을 돌아보며 함께한 시간을 소중하게 여겼다.','relationship');
  // A personal modelled passing, not a real demographic life-table.
  const lifespan=p.id==='grandmother'?86:(p.id==='mother'||p.id==='father')?88:97;
  const offset=p.id==='father'?2:p.id==='mother'?0:p.id==='grandmother'?0:4;
  if((p.id==='grandmother'||p.id==='mother'||p.id==='father')&&age>=lifespan+offset){
   p.alive=false;p.deadYear=life.year;
   record(life,state,'loss-'+p.id,p.name+'(이)가 세상을 떠났다. 함께했던 기억이 마음에 오래 남았다.','relationship');
   addMemory(state,p.name+'과의 추억');
  }
 }
}
function debtYear(life,state){
 const f=state.finance;
 f.lastInterest=0;f.lastPrincipal=0;
 if(!f.debt||f.yearsLeft<=0)return;
 const interest=Math.round(f.debt*f.rate);
 const payment=Math.min(f.debt,Math.max(1,Math.ceil(f.originalDebt/8)));
 f.debt=Math.max(0,f.debt-payment);
 f.yearsLeft=Math.max(0,f.yearsLeft-1);
 f.lastInterest=interest;f.lastPrincipal=payment;
 // Principal repayment exchanges cash for a smaller liability; only interest
 // reduces total net worth. The base economy already models ordinary spending.
 life.money.netWorth=Math.round(clamp(life.money.netWorth-interest,-2e7,2e7));
 if(f.debt===0&&!f.paidOff){
  f.paidOff=true;
  record(life,state,'loan-paid-'+life.year,'오랫동안 갚아 온 생활 대출을 모두 상환했다.','finance9');
 }else if(life.age%3===0){
  record(life,state,'loan-progress-'+life.year,'올해 생활 대출 원금 '+payment.toLocaleString('ko-KR')+
   '점과 이자 '+interest.toLocaleString('ko-KR')+'점을 납부했다. 남은 대출 '+f.debt.toLocaleString('ko-KR')+'점.','finance9');
 }
}
function newFriend(life,state){
 if(state.people.filter(p=>p.role==='친구').length>=4)return null;
 const i=state.people.filter(p=>p.role==='친구').length;
 const who=person(state,'friend-'+(i+1),'친구',chooseName(life,200+i,i%2?'female':'male'),
  life.birthYear+(i%3)-1,64);
 if(who)record(life,state,'new-friend-'+who.id+'-'+life.year,who.name+'(와)과 친구가 되었다. 함께할 이야기가 생겼다.','relationship');
 return who;
}
// Micro stories are fictional slices of everyday life, not country-level statistics.
// Each authored variant is remembered and not selected again until the local pool is exhausted.
const STORY_BANK=Object.freeze({
 childhood:[
  '혼자 하던 놀이에 이웃 아이가 끼어들어 둘이 함께 놀게 되었다.',
  '새로운 음식을 먹어 보고 좋아하는 맛이 하나 늘었다.',
  '몇 번이나 실패했던 일을 결국 해냈다. 오늘은 누구보다 신이 났다.',
  '어른에게 오래전 동네 이야기를 들으며 시간을 보냈다.',
  '친구와 다툰 뒤 먼저 말을 걸어 화해했다.',
  '집안일을 도우며 자신도 가족에게 필요한 사람이라는 걸 느꼈다.',
  '친구가 힘들어할 때 자기가 가진 것을 나누었다.',
  '비가 내리는 날 창밖을 보며 한참 이야기를 나누었다.',
  '처음으로 혼자 작은 심부름을 해냈다.',
  '가족과 함께 모여 소박한 식사를 했다.',
  '왜 그런지 궁금해 어른을 졸졸 따라다니며 물어보았다.',
  '새 놀이의 규칙을 몰라 몇 번이나 다시 시작했다.',
  '좋아하는 이야기를 다른 아이에게 들려주었다.',
  '가족 중 누군가에게 직접 만든 작은 선물을 건넸다.',
  '처음에는 아는 얼굴이 없었다. 며칠 지나자 같이 놀 친구가 생겼다.'
 ],
 school:[
  '학교에서 새로 배운 것을 집에 와서 이야기했다.',
  '수업이 끝난 뒤에도 궁금한 게 남아 도서관에 들렀다.',
  '어려운 숙제 때문에 고민하다 결국 도움을 요청했다.',
  '시험을 잘 치르지 못했지만 다시 공부하는 방법을 찾았다.',
  '서로 다른 생각을 가진 친구와 한 조가 되어 과제를 했다.',
  '학교 행사 날, 맡은 순서를 잊을까 봐 종이를 손에 꼭 쥐었다.',
  '친구에게 문제를 설명하다 보니 나도 뒤늦게 답이 보였다.',
  '학교로 향하는 길에 이웃과 인사를 나누었다.',
  '함께 공부하던 친구가 다른 곳으로 이사한다는 이야기를 들었다.',
  '집에서 공부할 시간을 확보하려고 가족과 약속을 정했다.',
  '오래 읽고 싶던 책을 빌려 끝까지 읽었다.',
  '수업이 없는 날, 평소 궁금했던 일을 직접 따라 해 보았다.',
  '새로운 선생님을 만나 이전에 몰랐던 분야에 흥미가 생겼다.',
  '발표할 차례가 되어 떨렸지만 끝까지 자신의 생각을 전했다.'
 ],
 teen:[
  '미래의 진로를 이야기하다 친구와 서로 다른 꿈을 갖고 있음을 알았다.',
  '가족에게 자신의 생각을 말하는 일이 점점 중요해졌다.',
  '친구와 약속한 일을 지키려고 다른 계획을 미뤘다.',
  '뜻대로 풀리지 않는 날이 길었다. 오늘은 작게나마 할 일을 끝냈다.',
  '관심 분야의 일을 하는 어른에게 직접 질문했다.',
  '새벽 공부도 밤 공부도 해 봤다. 집중이 되는 때를 조금 알 것 같았다.',
  '하고 싶은 일과 당장 해야 할 일 사이에서 고민했다.',
  '오래된 친구와 다른 학교에 가게 될지도 모른다는 생각에 아쉬웠다.',
  '처음으로 용돈이나 작은 수입을 나누어 쓰는 계획을 세웠다.',
  '친구의 고민을 듣다가 자신도 비슷한 감정을 느낀다는 걸 알았다.',
  '이전에는 관심 없던 분야의 책을 읽고 생각이 달라졌다.',
  '집에서 바라는 길과 내가 가고 싶은 길이 달랐다. 말을 꺼내기가 어려웠다.'
 ],
 young:[
  '처음으로 혼자 서류를 내고 장을 봤다. 하루가 금세 지나갔다.',
  '오랫동안 연락하지 못한 사람에게 먼저 안부를 전했다.',
  '월급에서 저축할 돈을 빼자, 이번 달 쓸 돈이 얼마 남지 않았다.',
  '진로가 예상과 달라 다시 공부할 방법을 찾아보았다.',
  '지인과 만난 자리에서 새로운 일에 대한 이야기를 들었다.',
  '종일 되는 일이 없었다. 그래도 오늘 할 일 하나는 끝냈다.',
  '한 달 동안 쓴 돈을 정리하며 불필요한 지출을 알아냈다.',
  '바쁜 날에도 가족에게 짧게나마 연락을 남겼다.',
  '처음 만난 사람과 일을 나눴다. 생각보다 손발이 잘 맞았다.',
  '일의 방식이 맞지 않아 다른 방법을 조심스럽게 제안했다.',
  '주말에 쉬는 시간을 만들어 다음 주를 준비했다.',
  '낯선 골목을 걷다가 작은 가게 하나를 눈여겨봤다.',
  '친구의 중요한 날을 기억하고 마음을 전했다.',
  '실수한 일을 숨기지 않고 인정하며 해결 방법을 찾았다.',
  '아침마다 창문을 열고 물 한 잔을 마시는 일이 익숙해졌다.'
 ],
 adult:[
  '혼자서는 도저히 끝낼 수 없는 일이었다. 동료가 마지막까지 남아 도와줬다.',
  '가족의 일정과 자신의 일정을 맞추느라 하루가 바빴다.',
  '통장을 다시 보니 예상보다 돈이 적게 남았다. 다음 달은 아껴 써야겠다.',
  '어릴 때 좋아했던 장소를 다시 찾아가 추억을 떠올렸다.',
  '낯선 일을 맡게 되어 한동안 서툴렀지만 조금씩 익숙해졌다.',
  '너무 바쁘게 지냈다. 오랜만에 아무 약속 없는 하루를 보냈다.',
  '도움을 받은 사람에게 시간이 지난 뒤 감사 인사를 건넸다.',
  '새로운 일을 배워 보고 싶어 관련 강좌를 알아보았다.',
  '직장에서 후배에게 자신이 아는 일을 차근차근 설명했다.',
  '기억 속의 작은 실수가 새로운 일을 할 때 도움이 되었다.',
  '한동안 미뤄 둔 가족 모임에 참석했다.',
  '집안의 고장 난 물건을 고쳐 쓰기로 했다.',
  '옆집 사람의 하루는 나와 꽤 달랐다. 저녁을 먹으며 그 이야기를 들었다.',
  '어려운 시기를 함께 보낸 사람의 안부를 물었다.',
  '문득 다른 일을 택했다면 어땠을까 생각했다. 금세 다시 일하러 나갔다.',
  '계단을 오르는데 숨이 찼다. 오늘은 조금 일찍 잠자리에 들었다.',
  '모아 둔 돈으로 꼭 필요했던 생활용품을 바꿨다.',
  '오래된 친구와 이전에 다녔던 동네 이야기를 나누었다.'
 ],
 senior:[
  '예전에 익혔던 기술을 젊은 사람에게 알려 주었다.',
  '예전에 살던 동네 이야기를 하며 오래전 사람들을 떠올렸다.',
  '시간이 많아지자 미뤄 둔 책을 다시 읽기 시작했다.',
  '가까운 사람의 안부를 묻는 일이 일상의 소중한 습관이 되었다.',
  '서랍 속 오래된 사진을 꺼냈다. 누군가의 젊은 얼굴이 반가웠다.',
  '자신의 속도에 맞게 걷고 쉬는 하루를 보냈다.',
  '동네 모임에서 예전에 만났던 사람과 다시 인사를 나눴다.',
  '창밖 나무가 예전보다 훨씬 커졌다. 이 집에 산 세월이 떠올랐다.',
  '젊을 때 고집했던 생각을 이제는 조금 다르게 바라보게 되었다.',
  '오래 사용한 물건을 살펴보며 거기에 담긴 추억을 떠올렸다.',
  '가족이 찾아와 함께 식사하며 새로운 이야기를 들려주었다.',
  '자신이 배운 일을 다른 사람에게 전하는 시간이 즐거웠다.',
  '연락이 뜸했던 지인에게 오랜만에 안부를 전했다.',
  '작은 성취를 자축하고 한동안 미뤄 둔 일을 끝냈다.',
  '오늘은 멀리 가지 않았다. 천천히 걷고 해가 지기 전에 돌아왔다.',
  '오랫동안 익숙했던 길을 천천히 걸으며 주변의 변화를 살폈다.',
  '잘한 일도 후회되는 일도 있었다. 모두 지나온 내 시간이다.'
 ],
 friend:[
  '{friend}(와)과 오랜만에 마주 앉았다. 별일 없냐는 말로 이야기가 시작됐다.',
  '{friend}(이)가 고민을 털어놓아 차분히 이야기를 들어 주었다.',
  '{friend}에게 도움을 받은 일을 떠올리며 고맙다는 인사를 전했다.',
  '{friend}(와)과 예전에 함께했던 장소를 다시 찾아갔다.',
  '{friend}(이)가 보내 준 짧은 소식에 한동안 웃음이 났다.',
  '{friend}(와)과 의견이 달랐지만 서로의 선택을 존중했다.',
  '{friend}(이)가 새로운 일을 시작했다는 이야기를 전해 왔다.',
  '{friend}(와)과 약속을 잡고 오랜만에 함께 식사했다.',
  '{friend}(이)가 힘든 시기를 지나고 있다는 이야기를 듣고 연락했다.',
  '{friend}(와)과 함께한 오래전 일을 가족에게 들려주었다.'
 ],
 partner:[
  '{partner}(와)과 앞으로의 생활비 계획을 이야기했다.',
  '{partner}(이)가 힘들어 보이는 날 집안일을 나누어 맡았다.',
  '{partner}(와)과 함께 쉬는 날을 보내며 서로의 근황을 들었다.',
  '{partner}(이)가 오래전 함께했던 일을 기억하고 있었다.',
  '{partner}(와)과 집에서 쓸 돈을 계산하다 밤이 깊었다.',
  '{partner}(이)가 기쁜 일을 겪어 함께 축하했다.',
  '{partner}(와)과 서로 다른 생활 습관을 조율하기로 했다.',
  '{partner}(와)과 힘든 날을 겪은 뒤 서로에게 고마움을 전했다.'
 ],
 child:[
  '{child}(이)가 좋아하는 놀이를 보여 주며 함께하자고 했다.',
  '{child}(이)가 어제 배운 것을 신이 나서 이야기했다.',
  '{child}(와)과 주말에 산책하며 여러 이야기를 나누었다.',
  '{child}(이)가 고민을 말하자 답을 서두르지 않고 들어 주었다.',
  '{child}(이)가 새로운 친구를 사귀었다는 소식을 전했다.',
  '{child}(이)가 작은 성취를 이루어 함께 기뻐했다.',
  '{child}(와)과 시간을 보내기 위해 일을 조금 일찍 마쳤다.',
  '{child}(이)가 예전에 찍은 사진을 보고 한참 웃었다.',
  '{child}(이)가 왜 그러냐고 몇 번이나 묻는다. 쉽게 설명할 말을 찾느라 진땀을 뺐다.',
  '{child}(와)과 우연히 같은 노래를 흥얼거려 둘 다 웃었다.'
 ],
 hobby:[
  '{hobby}(을)를 함께 즐기는 사람들과 새로운 이야기를 나눴다.',
  '{hobby}(을)를 배우기 시작했던 어린 시절을 떠올렸다.',
  '오랫동안 좋아한 {hobby} 덕분에 바쁜 날에도 잠시 쉬어 갈 수 있었다.',
  '{hobby}(을)를 더 잘하기 위해 새로운 방법을 연습해 보았다.',
  '{hobby}와 관련된 작은 모임에서 새로운 친구를 만났다.',
  '하루의 끝에 잠시 {hobby}(을)를 즐기며 기분을 가라앉혔다.',
  '가족에게 자신이 좋아하는 {hobby}의 즐거움을 설명했다.',
  '{hobby}와 관련된 옛 물건을 정리하며 지난 시간을 떠올렸다.'
 ],
 employed:[
  '동료와 함께 업무 순서를 조정해 어려운 일을 마쳤다.',
  '작은 실수를 계기로 일을 더 안전하게 하는 방법을 생각했다.',
  '새로 들어온 동료에게 기본적인 일을 알려 주었다.',
  '일과를 마친 뒤 자신이 해낸 일을 하나씩 돌아보았다.',
  '어려운 업무가 생겨 경험 많은 사람에게 조언을 구했다.',
  '예상하지 못한 일이 생겨 하루 일정을 다시 짰다.',
  '자신이 익숙한 업무에도 새로 배울 점이 있음을 알게 되었다.',
  '일터에서 서로의 역할을 조율하며 갈등을 줄였다.',
  '일이 끝난 뒤 동료에게 수고했다고 인사했다.',
  '근무와 여가 시간의 균형을 고민했다.'
 ],
 debt:[
  '생활 대출 상환 일정을 확인하고 다음 달 지출을 조정했다.',
  '미루었던 소비 대신 대출 상환을 먼저 생각했다.',
  '남은 대출 잔액을 확인하며 꾸준히 갚아 나갈 계획을 세웠다.',
  '갑작스러운 지출이 생기지 않도록 비상금을 조금씩 모았다.',
  '대출 이자와 생활비를 비교하며 가계부를 정리했다.'
 ],
 rural:[
  '이웃과 계절에 따라 달라지는 마을의 일을 함께했다.',
  '마을 사람들이 모여 생활에 필요한 일을 의논했다.',
  '다른 지역으로 나가는 교통편을 미리 알아보았다.',
  '가까운 이웃과 생활에 필요한 물건을 나누었다.',
  '계절의 변화를 느끼며 집 주변을 정리했다.',
  '마을 행사에 참여해 낯익은 사람들과 인사했다.'
 ],
 urban:[
  '분주한 거리에서 우연히 옛 지인을 만났다.',
  '출퇴근이나 이동 시간을 어떻게 활용할지 고민했다.',
  '주거비와 생활 편의를 함께 고려하며 계획을 세웠다.',
  '가까운 문화 공간에서 잠깐 쉬어 갈 시간을 가졌다.',
  '새로 생긴 가게를 지나며 동네가 변하고 있음을 느꼈다.',
  '이웃과 짧게 인사를 나누면서 서서히 얼굴을 익혀 갔다.'
 ],
 history:[
  '어른들은 자신이 어릴 적 살던 집을 아직도 선명히 기억하고 있었다.',
  '어제까지 익숙하던 일이 올해는 다른 방식으로 돌아갔다.',
  '동네에 전해진 소식 때문에 저녁 밥상에서도 같은 이야기가 오갔다.',
  '배울 곳이 마땅치 않아 아는 사람에게 책을 빌렸다.',
  '생활용품을 아껴 쓰며 다음 계절을 준비했다.',
  '오랫동안 장사를 하던 가게가 문을 닫았다. 길이 낯설게 느껴졌다.',
  '가족이 겪은 일을 오래 기억하려고 이야기를 나누었다.',
  '일하는 방식이 조금씩 변하면서 새로 배워야 할 것이 생겼다.',
  '익숙한 동네 풍경이 시간과 함께 조금씩 달라졌다.',
  '어른들이 들려준 지난 시절 이야기를 마음에 간직했다.'
 ]
});
function everydayStories(life,state,count){
 const age=life.age,older=life.year<1990,profile=life.profile||{};
 const groups=[];
 if(older)groups.push('history');
 else groups.push(age<7?'childhood':age<13?'school':age<19?'teen':age<33?'young':age<65?'adult':'senior');
 if(!older&&age>=7&&age<=18)groups.push('school');
 if(!older&&age>=13&&age<19)groups.push('teen');
 if(!older&&age>=25&&age<65)groups.push('adult');
 if(!older&&age>=65)groups.push('senior');
 if(state.hobby)groups.push('hobby');
 const aliveFriends=state.people.filter(p=>p.role==='친구'&&p.alive);
 const partner=state.people.find(p=>p.id==='partner'&&p.alive);
 const child=state.people.find(p=>p.role==='자녀'&&p.alive&&life.year>=p.birthYear+3);
 if(aliveFriends.length)groups.push('friend');
 if(partner)groups.push('partner');
 if(child)groups.push('child');
 if(life.money?.employment&&life.money.employment!=='구직 중'&&age>=18&&age<65)groups.push('employed');
 if(state.finance.debt>0)groups.push('debt');
 groups.push(profile.settlement==='농촌'?'rural':'urban');
 const pool=groups.flatMap(group=>(STORY_BANK[group]||[]).map((line,index)=>({id:'story:'+group+':'+index,line})));
 const out=[];
 for(let i=0;i<count;i++){
  const fresh=pool.filter(p=>!state.eventsSeen.includes(p.id)&&!out.some(x=>x.key===p.id));
  const entries=fresh.length?fresh:pool;
  if(!entries.length)break;
  const selected=entries[Math.floor(roll(life,884+i)*entries.length)];
  // Reserve an authored variation to avoid reading the same line repeatedly.
  if(!state.eventsSeen.includes(selected.id))state.eventsSeen.push(selected.id);
  const friend=aliveFriends[Math.floor(roll(life,887+i)*aliveFriends.length)]?.name||'친구';
  out.push({key:selected.id,text:selected.line.replaceAll('{friend}',friend)
   .replaceAll('{partner}',partner?.name||'동반자')
   .replaceAll('{child}',child?.name||'아이')
   .replaceAll('{hobby}',state.hobby||'취미')});
 }
 return out;
}

function eventsForYear(life,state){
 const a=life.age,year=life.year;
 const q=[],push=(id,text,kind='life9',month=5)=>q.push({id,text,kind,month});
 const childhood=a>=2&&a<=17;
 if(a===7&&!state.hobby)
  q.push({id:'choose-hobby',text:'',month:3,kind:'memory',choice:'hobby'});
 if(a===23&&life.year>=1990&&!state.finance.originalDebt&&life.money?.netWorth<6500)
  q.push({id:'repair-cost',text:'',month:8,kind:'finance9',choice:'repair'});
 if(a===35&&life.profile?.partner&&!state.memories.includes('혼인'))
  q.push({id:'marriage',text:'',month:9,kind:'relationship',choice:'marriage'});
 if(a===43&&life.year>=1990&&life.money?.netWorth>11000&&!state.finance.home)
  q.push({id:'housing',text:'',month:6,kind:'finance9',choice:'housing'});
 if(a===64&&state.hobby)
  push('hobby-retirement',state.hobbySince+'세에 시작한 '+state.hobby+'(을)를 다시 즐겼다. 오래전 취미가 노년의 하루를 채워 주었다.','memory',9);
 if(a===30&&state.hobby)
  push('hobby-30',state.hobby+'(을)를 꾸준히 즐기는 친구들과 모임을 가졌다.','memory',3);
 if(a===15&&state.hobby)
  push('hobby-teen','어린 시절 시작한 '+state.hobby+' 실력이 조금씩 늘었다.','memory',4);
 if(a===8||a===15||a===27||a===45)newFriend(life,state);
 const friends=state.people.filter(p=>p.role==='친구'&&p.alive);
 if(friends.length&&a>=16&&a%11===0){
  const who=friends[Math.floor(roll(life,931)*friends.length)];
  push('friend-reunion-'+a,who.name+'(와)과 오랜만에 만났다. 예전에 함께했던 일들을 떠올리며 웃었다.','relationship',6);
 }
 if(state.hobby&&a>8&&a%13===0)
  push('hobby-return-'+a,'바쁜 하루를 마치고 '+state.hobby+'(을)를 즐겼다. 오랫동안 좋아해 온 일이다.','memory',10);
 // Contextual filler: 2 to 3 modest events each year rather than hard choices.
 const filler=2+Math.floor(roll(life,883)*2);
 const everyday=everydayStories(life,state,filler);
 for(let i=0;i<everyday.length;i++)push('everyday-'+year+'-'+i,everyday[i].text,'life9',2+i*3);
 q.sort((x,y)=>x.month-y.month);
 return q.slice(0,MAX_QUEUE);
}
function prompt(choice,life){
 const state=ensure(life);
 if(choice==='hobby')return {age:life.age,title:'오래도록 기억할 작은 취미',description:'어린 시절 무엇을 즐겨 볼까요?',options:[
  {label:'축구',note:'친구와 공을 차며 즐기는 시간'},
  {label:'독서',note:'이야기를 읽으며 상상하는 시간'},
  {label:'그림',note:'그림으로 생각을 표현하는 시간'},
  {label:'음악',note:'소리와 리듬을 즐기는 시간'}
 ]};
 if(choice==='repair')return {age:life.age,title:'예상하지 못한 주거 수리비',description:'집에 손볼 곳이 생겼다. 수리비가 2,400이나 나온다. 이번 달 살림을 어떻게 꾸려야 할까?',options:[
  {label:'생활 대출을 받아 수리한다',note:'생활 여건을 빨리 회복하지만 8년에 걸쳐 원리금을 갚음'},
  {label:'모은 돈으로 가능한 만큼 해결한다',note:'새 빚은 피하지만 순자산 감소'},
  {label:'가족과 함께 수리 방법을 찾는다',note:'일부 도움을 받을 수 있지만 다른 사람의 부담도 생각해야 함'}
 ]};
 if(choice==='marriage')return {age:life.age,title:'함께하는 관계의 다음 장',description:'함께 살아온 사람과 앞으로도 어떤 사이로 지낼지 이야기했다.',options:[
  {label:'혼인하고 함께 살아간다',note:'가족의 형태를 새롭게 정함'},
  {label:'혼인하지 않고 동반자로 지낸다',note:'혼인과 별개로 관계를 이어 감'}
 ]};
 if(choice==='housing')return {age:life.age,title:'주거 계획을 세울 때',description:'모은 돈으로 집을 마련할 수 있을 것 같다. 지금 사는 곳을 떠날까?',options:[
  {label:'집을 마련하고 유지비를 부담한다',note:'집은 남지만 목돈과 유지비가 든다'},
  {label:'지금의 주거 형태를 유지한다',note:'유동성을 보존하고 이사를 미룸'}
 ]};
 return null;
}
function applyChoice(life,state,event,index){
 const kind=event.choice;
 if(kind==='hobby'){
  state.hobby=['축구','독서','그림','음악'][index];
  state.hobbySince=life.age;
  addMemory(state,'취미:'+state.hobby);
  record(life,state,'hobby-start','어린 시절 '+state.hobby+'(을)를 즐기기 시작했다. 훗날에도 이 경험을 기억하게 될 것이다.','decision');
 }else if(kind==='repair'){
  const cost=2400,finance=state.finance;
  if(index===0){
   finance.debt=cost;finance.originalDebt=cost;finance.yearsLeft=8;
   life.money.netWorth=clamp(life.money.netWorth-cost,-2e7,2e7);
   record(life,state,'repair','생활 대출 2,400점을 빌려 집을 수리했다. 앞으로 8년 동안 갚아야 한다.','decision');
  }else if(index===1){
   life.money.netWorth=clamp(life.money.netWorth-cost,-2e7,2e7);
   record(life,state,'repair','모아 둔 돈으로 집을 수리했다. 지출 때문에 당분간 생활비를 조절하기로 했다.','decision');
  }else{
   life.money.netWorth=clamp(life.money.netWorth-800,-2e7,2e7);
   record(life,state,'repair','가족과 수리비를 나누어 마련했다. 서로 도운 경험이 관계에 남았다.','decision');
   life.change({bonds:2});
  }
  addMemory(state,'주거 수리');
 }else if(kind==='marriage'){
  if(index===0){
   addMemory(state,'혼인');
   record(life,state,'marriage','서로의 선택으로 혼인하고 함께 살아가기로 했다.','decision');
  }else record(life,state,'nonmarital-partner','혼인하지 않고도 동반자로 서로의 삶을 존중하며 지내기로 했다.','decision');
 }else if(kind==='housing'){
  if(index===0){
   state.finance.home=true;
   life.money.netWorth=clamp(life.money.netWorth-1300,-2e7,2e7);
   record(life,state,'housing','자신의 집을 마련했다. 취득 비용과 앞으로의 관리비를 함께 고민하게 되었다.','decision');
  }else record(life,state,'housing','당장 집을 사지 않고 생활과 저축을 더 안정시키기로 했다.','decision');
 }
 state.decisions.push({age:life.age,year:life.year,id:event.id,index});
}
function advance(life,state){
 if(!life.alive||life.pending)return;
 let guard=0;
 while(state.yearQueue.length&&guard++<MAX_QUEUE){
  const event=state.yearQueue.shift();
  if(event.choice){
   state.activeChoice=event;
   life.pending='v9:'+event.id;
   return;
  }
  record(life,state,event.id,event.month+'월 · '+event.text,event.kind);
 }
 state.activeChoice=null;
}
function install(){
 if(!Sim?.Life||!W2?.enrich||!W4?.roll||!W8?.ensure||Sim.Life.prototype.__world9)return false;
 const Life=Sim.Life,tick=Life.prototype.tick,choose=Life.prototype.choose,getChoice=Life.prototype.getChoice,
  reflect=Life.prototype.reflect,snapshot=Life.prototype.snapshot,restore=Life.restore;
 // The existing v1 chronology prunes at 100 entries. Keep the complete v9 lived
 // chronicle within a bounded payload; do not replace its original ordering.
 Life.prototype.logEvent=function(text,kind='life'){
  this.log.push({age:this.age,year:this.year,text:String(text).slice(0,320),kind});
  if(this.log.length>MAX_LOG){
   const extra=this.log.length-MAX_LOG;
   this.log.splice(0,extra);
  }
 };
 Life.prototype.tick=function(){
  if(!this.alive||this.pending)return false;
  const state=ensure(this),before=this.age;
  const ok=tick.call(this);
  if(!ok||this.age===before)return ok;
  if(!this.alive)return ok;
  syncPeople(this);
  families(this,state);
  debtYear(this,state);
  if(state.queueYear!==this.year){
   state.queueYear=this.year;state.annualEvents=0;
   state.yearQueue=eventsForYear(this,state);
  }
  if(!this.pending)advance(this,state);
  return ok;
 };
 Life.prototype.getChoice=function(){
  if(typeof this.pending==='string'&&this.pending.startsWith('v9:')){
   const state=ensure(this);
   return state.activeChoice?prompt(state.activeChoice.choice,this):null;
  }
  return getChoice.call(this);
 };
 Life.prototype.choose=function(index){
  if(typeof this.pending==='string'&&this.pending.startsWith('v9:')){
   const state=ensure(this),event=state.activeChoice,offer=event&&prompt(event.choice,this);
   if(!event||!offer||!Number.isInteger(index)||index<0||index>=offer.options.length)return false;
   this.pending=null;state.activeChoice=null;
   applyChoice(this,state,event,index);
   advance(this,state);
   return true;
  }
  const ok=choose.call(this,index);
  if(ok&&!this.pending)advance(this,syncPeople(this));
  return ok;
 };
 Life.prototype.reflect=function(text){
  const ok=reflect.call(this,text);
  if(ok&&!this.pending)advance(this,syncPeople(this));
  return ok;
 };
 Life.prototype.snapshot=function(){
  const s=ensure(this);
  return {...snapshot.call(this),world9:JSON.parse(JSON.stringify(s))};
 };
 Life.restore=function(data){
  const life=restore.call(this,data);if(!life)return null;
  const saved=data?.world9;
  // Rehydrate with bounded strict fields: old saves are simply initialized.
  const state=ensure(life);
  if(saved&&saved.version===VERSION&&typeof saved==='object'){
   if(Array.isArray(saved.people))state.people=saved.people.slice(0,MAX_PEOPLE)
     .filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&Number.isInteger(p.birthYear))
     .map(p=>({id:p.id.slice(0,45),role:String(p.role||'친구').slice(0,25),
      name:p.name.slice(0,55),birthYear:p.birthYear,alive:p.alive!==false,
      relation:clamp(Number(p.relation)||65,0,100),school:String(p.school||'').slice(0,50),
      job:String(p.job||'').slice(0,60),
      milestones:Array.isArray(p.milestones)?p.milestones.filter(x=>typeof x==='string').slice(0,20):[],
      deadYear:Number.isInteger(p.deadYear)?p.deadYear:null}));
   for(const key of ['memories','eventsSeen'])
    if(Array.isArray(saved[key]))state[key]=saved[key].filter(x=>typeof x==='string').slice(0,key==='memories'?80:560);
   if(Array.isArray(saved.decisions))state.decisions=saved.decisions.filter(x=>x&&Number.isInteger(x.age)&&typeof x.id==='string').slice(-75);
   state.hobby=HOBBIES.includes(saved.hobby)?saved.hobby:'';
   state.hobbySince=Number.isInteger(saved.hobbySince)?clamp(saved.hobbySince,0,108):null;
   if(saved.finance&&typeof saved.finance==='object'){
    const f=saved.finance;
    for(const k of ['debt','originalDebt','lastInterest','lastPrincipal'])
     state.finance[k]=Number.isFinite(f[k])?clamp(Math.round(f[k]),0,2e7):0;
    state.finance.yearsLeft=Number.isInteger(f.yearsLeft)?clamp(f.yearsLeft,0,50):0;
    state.finance.rate=.05;state.finance.home=f.home===true;state.finance.paidOff=f.paidOff===true;
   }
   state.queueYear=Number.isInteger(saved.queueYear)?saved.queueYear:-1;
   state.annualEvents=Number.isInteger(saved.annualEvents)?clamp(saved.annualEvents,0,25):0;
   if(Array.isArray(saved.yearQueue))state.yearQueue=saved.yearQueue.slice(0,MAX_QUEUE)
    .filter(e=>e&&typeof e.id==='string'&&typeof e.text==='string'||e&&['hobby','repair','marriage','housing'].includes(e.choice)&&typeof e.id==='string')
    .map(e=>({id:e.id.slice(0,90),text:String(e.text||'').slice(0,250),
     month:clamp(Number(e.month)||5,1,12),kind:String(e.kind||'life9').slice(0,25),
     choice:['hobby','repair','marriage','housing'].includes(e.choice)?e.choice:undefined}));
   const e=saved.activeChoice;
   if(e&&typeof e.id==='string'&&['hobby','repair','marriage','housing'].includes(e.choice))
    state.activeChoice={id:e.id.slice(0,90),text:String(e.text||''),kind:String(e.kind||'life9'),choice:e.choice,month:clamp(Number(e.month)||5,1,12)};
   if(typeof data.pending==='string'&&data.pending.startsWith('v9:')&&data.pending==='v9:'+state.activeChoice?.id&&life.alive)
    life.pending=data.pending;
  }
  return life;
 };
 Object.defineProperty(Life.prototype,'__world9',{value:true});
 return true;
}
install();
return Object.freeze({install,ensure,eventsForYear,prompt,advance,syncPeople,VERSION});
});
