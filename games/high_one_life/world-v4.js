/* ONE LIFE v4 — lasting decisions, contextual turning points and connected events.
   All socioeconomic probabilities and stories are fictional educational models,
   not statistics or claims about real people or their countries. */
(function(root,factory){
  const api=factory(root?.OneLifeSim,root?.OneLifeWorld2,root?.OneLifeWorld3);
  if(typeof module!=='undefined' && module.exports)module.exports=api;
  if(root)root.OneLifeWorld4=api;
})(typeof window!=='undefined'?window:null,function(Sim,W2,W3){
  'use strict';
  const GATES=[16,20,29,42,64];
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function hash(seed,age,salt){
    let x=(seed^Math.imul(age+101,2654435761)^Math.imul(salt+1,2246822519))>>>0;
    x=Math.imul(x^(x>>>16),0x7feb352d);
    x=Math.imul(x^(x>>>15),0x846ca68b);
    return (x^(x>>>16))>>>0;
  }
  const roll=(life,age,salt)=>hash(life.seed,age,salt)/4294967296;
  const evt=(id,min,max,requires,lines,effects,weight=1)=>({id,min,max,requires,lines,effects,weight});
  // Different chains require prior decisions, income, family responsibilities,
  // previous setbacks or community connections. Each rule can fire only once.
  const EVENTS=[
    evt('late-school',9,19,['school-gap'],['지역의 도움으로 통학할 길이 생겼다.','이웃이 책을 빌려주어 공부를 다시 시작했다.'],{learning:1,knowledge:6,tag:'late-learning'}),
    evt('school-club',10,23,['learning'],['학교의 작은 동아리에서 친구를 사귀었다.','함께 공부하던 친구가 멘토가 되었다.'],{network:2,bonds:7,tag:'mentor'}),
    evt('school-cost',13,22,['academic'],['학업 비용 때문에 계획을 다시 세웠다.','가족과 학교를 오가며 비용을 마련했다.'],{money:-1200,grit:1,tag:'study-cost'}),
    evt('scholarship',17,28,['academic','mentor'],['지도자의 도움으로 장학 지원을 받았다.','예전에 만난 사람의 추천으로 교육 기회를 얻었다.'],{money:3300,learning:2,tag:'grant'}),
    evt('trade-master',17,31,['trade'],['기술자가 현장 실습을 맡겨 주었다.','어려운 수리 작업을 처음 혼자 해결했다.'],{skill:3,knowledge:5,tag:'journey'}),
    evt('trade-customer',24,48,['trade','network'],['기술을 믿고 찾아온 단골손님이 생겼다.','예전 동료가 더 큰 일감을 소개했다.'],{network:2,money:3200,tag:'referral'}),
    evt('early-income',19,34,['earlywork'],['일찍 벌기 시작한 돈으로 생활이 안정됐다.','작은 저축이 갑작스러운 지출에 도움이 됐다.'],{money:2000,security:1}),
    evt('return-study',22,41,['earlywork','learning'],['일을 하면서 야간 교육을 수료했다.','직장과 공부를 병행해 새로운 자격을 얻었다.'],{skill:3,knowledge:8,tag:'adult-study'}),
    evt('mentor-reunion',28,54,['mentor'],['오래전 배움을 도와준 사람과 다시 만났다.','옛 스승의 소개로 뜻밖의 기회를 얻었다.'],{network:3,skill:1,tag:'referral'}),
    evt('new-work',23,52,['career'],['경험을 인정받아 새 직장을 제안받았다.','동료의 소개로 다른 일자리 면접에 나섰다.'],{security:2,skill:1,money:2500,tag:'job-offer'}),
    evt('job-loss',22,59,['career'],['일자리가 줄어드는 바람에 직장을 옮겨야 했다.','경영 사정이 어려워 잠시 일을 쉬었다.'],{security:-3,money:-5500,happiness:-6,tag:'layoff'}),
    evt('job-recovery',24,62,['layoff','network'],['전에 알던 동료가 재취업 기회를 소개했다.','이웃의 추천으로 일터에 다시 돌아갔다.'],{security:4,money:1700,tag:'reemployed'}),
    evt('job-retrain',25,62,['layoff','learning'],['배워 두었던 기술로 새 직업에 도전했다.','교육받은 경험을 살려 다른 업종에서 일을 시작했다.'],{skill:3,security:2,tag:'retrain'}),
    evt('promotion',28,56,['career','skill'],['오랜 경력을 인정받아 책임이 커졌다.','꾸준히 일한 경험으로 새로운 역할을 맡았다.'],{security:3,money:4000,tag:'promoted'}),
    evt('work-burnout',24,61,['ambition'],['일이 너무 바빠 몸과 마음에 피로가 쌓였다.','성과를 내는 동안 가까운 사람과 시간을 보내기 어려웠다.'],{health:-9,bonds:-5,security:1,tag:'overworked'}),
    evt('work-balance',33,72,['wellness'],['꾸준한 휴식이 몸을 회복하는 데 도움이 됐다.','활동과 휴식의 균형을 되찾았다.'],{health:9,happiness:5,tag:'recovery'}),
    evt('health-cost',20,83,[],['검진과 치료에 돈과 시간이 필요했다.','건강 문제로 한동안 무리하지 않아야 했다.'],{health:-6,money:-2500,tag:'treatment'}),
    evt('health-support',30,85,['network'],['함께 도와주는 사람이 병원에 동행해 주었다.','가까운 사람이 몸을 회복하도록 도와주었다.'],{health:5,bonds:5,tag:'care-network'}),
    evt('health-work',27,68,['treatment','career'],['몸 상태에 맞추어 근무 시간을 조절했다.','건강을 고려해 다른 일을 찾기 시작했다.'],{security:-1,health:6,tag:'adjusted-work'}),
    evt('business-first',24,55,['business'],['첫 단골이 생기며 가게가 알려지기 시작했다.','작은 사업에 주문이 들어오기 시작했다.'],{money:4500,security:1,tag:'customers'}),
    evt('business-debt',25,60,['business'],['재료비가 올라 사업 자금을 마련해야 했다.','확장 비용을 빌려 한동안 부채가 생겼다.'],{money:-10000,security:-2,tag:'business-debt'}),
    evt('business-growth',29,61,['business','customers'],['손님이 늘어 일하는 사람을 더 구했다.','다른 지역에서 사업 제안을 받았다.'],{money:13500,security:2,tag:'expanded'}),
    evt('business-crisis',32,68,['business'],['손님이 줄어 사업 방식을 바꿔야 했다.','예상하지 못한 지출로 사업 운영이 어려워졌다.'],{money:-14000,security:-3,tag:'crisis'}),
    evt('business-restart',34,66,['crisis','network'],['예전 동료의 도움으로 다시 사업을 시작했다.','오랜 인맥을 통해 새 거래처를 찾았다.'],{money:3600,security:3,tag:'restart'}),
    evt('business-close',38,69,['crisis'],['사업을 정리하고 다른 일자리를 찾았다.','가게를 접었지만 얻은 경험으로 새 출발을 준비했다.'],{money:-2400,skill:2,tag:'closed'}),
    evt('housing-start',23,52,['security'],['모아 둔 돈으로 더 안정적인 집을 구했다.','생활비를 조절하여 오래 살 집을 마련했다.'],{money:-3500,happiness:6,tag:'housing'}),
    evt('housing-risk',24,67,[],['주거비가 올라 지출을 줄여야 했다.','계약 조건이 바뀌어 이사를 고민했다.'],{money:-4600,happiness:-3,tag:'housing-pressure'}),
    evt('housing-relief',27,72,['housing-pressure','network'],['친구의 도움으로 부담이 적은 집을 찾았다.','가까운 사람의 정보로 새 집을 구했다.'],{money:3300,bonds:3,tag:'housing-relief'}),
    evt('partner-meet',24,62,['people'],['믿고 의지할 사람과 새로운 관계가 시작됐다.','오랜 친구와 미래를 함께 고민했다.'],{bonds:8,tag:'partner-connection'}),
    evt('partner-effort',33,71,['partner'],['서로의 생활을 존중하며 관계를 가꾸었다.','다툼 뒤에 대화하며 서로를 이해했다.'],{bonds:8,happiness:6,tag:'relationship-care'}),
    evt('partner-change',35,74,['partner'],['서로 다른 길을 선택하며 생활을 다시 꾸렸다.','함께하던 사람과 떨어져 지내게 되었다.'],{bonds:-7,money:-3200,tag:'relationship-shift'}),
    evt('partner-rebuild',37,80,['relationship-shift','network'],['오래된 친구가 새로운 시작을 도왔다.','어려운 시기에 이웃들의 도움을 받았다.'],{bonds:7,happiness:6,tag:'reconnected'}),
    evt('caregiving',36,67,['child'],['아이를 돌보느라 일하는 시간이 줄었다.','돌봄과 생업 사이에서 시간을 조절했다.'],{money:-2800,bonds:6,tag:'care-duty'}),
    evt('care-community',38,68,['child','network'],['이웃과 돌봄을 나누며 일할 시간을 확보했다.','가족과 친구가 돌봄을 도와주었다.'],{money:2200,bonds:8,tag:'care-support'}),
    evt('care-education',40,66,['child','learning'],['아이와 함께 공부하며 새로운 것을 배웠다.','돌봄 경험을 지역 교육 활동에 살렸다.'],{knowledge:6,network:2,tag:'teaching'}),
    evt('friend-help',18,84,['network'],['친구가 힘든 시기에 격려해 주었다.','서로 돕는 모임을 통해 생활의 활기를 찾았다.'],{bonds:5,happiness:5,tag:'community'}),
    evt('friend-loss',29,90,['network'],['오래 알고 지낸 사람과 멀어졌다.','친했던 사람과의 변화로 슬픈 시간을 보냈다.'],{bonds:-8,happiness:-5,tag:'farewell'}),
    evt('volunteer',34,94,['people'],['지역 활동에 참여하며 다양한 이웃을 만났다.','배운 것을 다른 사람에게 나누는 일을 시작했다.'],{network:3,happiness:6,tag:'volunteer'}),
    evt('move-job',24,68,['career'],['새로운 일자리를 찾아 다른 동네로 옮겼다.','다른 지역에서 업무를 시작했다.'],{money:-1500,security:2,tag:'relocation'}),
    evt('return-home',35,78,['relocation','people'],['고향 근처로 돌아와 새로운 일을 시작했다.','익숙한 동네에 다시 자리 잡았다.'],{network:3,happiness:4,tag:'homecoming'}),
    evt('learning-later',40,90,['learning'],['나이가 들어도 새 기술을 배우는 즐거움을 느꼈다.','책과 강의를 통해 관심 분야를 넓혔다.'],{skill:1,knowledge:5,tag:'lifelong'}),
    evt('savings-emergency',33,88,['security'],['저축이 갑작스러운 수리 비용을 감당했다.','예상 밖의 지출이 생겼지만 생활을 이어 갔다.'],{money:-3800,security:1,tag:'safety-net'}),
    evt('debt-payment',28,90,['debt'],['생활비를 조절하며 빚 일부를 갚았다.','오랜 기간 계획했던 부채 상환을 실천했다.'],{money:2800,happiness:4,tag:'debt-repaid'}),
    evt('debt-setback',30,82,['debt'],['이자가 부담돼 다른 지출을 미뤘다.','생활비 부족으로 상환 계획을 조정했다.'],{money:-2400,happiness:-4,tag:'debt-pressure'}),
    evt('retirement-help',65,105,['network'],['오랜 관계가 노후에 힘이 됐다.','이웃과 서로 돌보며 생활했다.'],{bonds:8,happiness:6,tag:'elder-community'}),
    evt('retirement-skill',64,105,['skill'],['평생 익힌 기술을 후배에게 전했다.','쌓아 온 경험으로 작은 일을 도왔다.'],{money:950,bonds:7,tag:'mentoring'}),
    evt('retirement-struggle',64,105,['debt'],['노후 생활비를 아끼며 지냈다.','필요한 물건을 줄여 지출을 관리했다.'],{money:-2100,happiness:-4,tag:'retirement-cost'}),
    evt('retirement-hobby',64,105,['wellness'],['좋아하는 취미를 오래도록 이어 갔다.','새로운 취미를 배우며 몸과 마음을 돌보았다.'],{health:4,happiness:8,tag:'healthy-aging'}),
    evt('mentor-help',28,70,['mentor','crisis'],['옛 스승의 조언으로 다시 일어설 방법을 찾았다.','예전에 배운 기술 덕분에 어려움을 벗어났다.'],{security:2,skill:2,money:2000,tag:'second-chance'}),
    evt('community-enterprise',35,74,['volunteer','skill'],['지역 모임에서 작은 공동 사업을 시작했다.','이웃들과 배운 기술을 나누며 작은 수익을 얻었다.'],{money:3100,network:2,tag:'cooperative'}),
    evt('wealth-shock',31,80,['security'],['모아 둔 돈이 예상 밖의 일로 줄었다.','경제 상황이 바뀌어 계획한 지출을 미뤘다.'],{money:-6200,happiness:-4,tag:'setback'}),
    evt('wealth-gift',28,80,['network'],['가까운 사람의 뜻밖의 도움을 받았다.','오랜 관계 덕분에 새로운 기회를 얻었다.'],{money:3500,bonds:5,tag:'mutual-aid'}),
    evt('fresh-start',29,73,['crisis','learning'],['어려움을 겪은 뒤 다른 일을 배워 다시 시작했다.','실패했던 경험을 살려 새로운 기회를 찾았다.'],{skill:3,security:2,tag:'pivot'})
  ];
  const has=(life,tag)=>{
    const a=life.arc;if(!a)return false;
    if(tag==='school-gap')return life.world?.educationYears<5;
    if(tag==='academic')return a.path==='academic'||a.tags.includes('grant');
    if(tag==='trade')return a.path==='trade'||a.path==='training';
    if(tag==='earlywork')return a.path==='work';
    if(tag==='career')return life.age>=22&&life.career!=='학생'&&life.career!=='아직 정해지지 않음';
    if(tag==='business')return a.business===true;
    if(tag==='skill')return a.skill>=3;
    if(tag==='learning')return a.learning>=2||life.stats.knowledge>64;
    if(tag==='mentor')return a.tags.includes('mentor');
    if(tag==='ambition')return a.ambition>=2;
    if(tag==='wellness')return a.wellness>=2;
    if(tag==='security')return a.security>=2;
    if(tag==='network')return a.network>=2;
    if(tag==='people')return a.community>=2;
    if(tag==='partner')return life.profile?.partner===true;
    if(tag==='child')return life.profile?.child===true;
    if(tag==='debt')return life.money?.netWorth<0;
    return a.tags.includes(tag);
  };
  function ensure(life){
    W3.setup(life);
    if(life.arc)return life.arc;
    const a={path:'open',skill:0,learning:0,network:0,security:0,wellness:0,ambition:0,
      community:0,business:false,careerRisk:0,unemployedUntil:0,decisionCount:0,decisions:[],tags:[],
      seen:[],eventCount:0,earnedEvents:[],lastEvent:'',firstJob:'',replayFrom:null};
    life.arc=a;
    return a;
  }
  function addTag(a,tag){if(tag&&!a.tags.includes(tag))a.tags.push(tag);}
  function effects(life,e){
    const a=ensure(life),stats={};
    for(const [key,value] of Object.entries(e||{})){
      if(key==='money'){life.money.netWorth=clamp(Math.round(life.money.netWorth+value*(life.world?.economyScale||1)),-2e7,2e7);}
      else if(key==='tag')addTag(a,value);
      else if(['health','happiness','knowledge','bonds'].includes(key))stats[key]=value;
      else if(typeof a[key]==='number')a[key]=clamp(a[key]+value,-8,15);
    }
    life.change(stats);
  }
  function makeGate(life){
    const a=ensure(life),age=life.age,w=life.world,m=life.money;
    const c=(title,note)=>({label:title,note});
    if(age===16){
      if(w.educationYears<5)return {age,title:'배울 기회를 다시 찾다',description:'학교에 오래 다니지 못했지만 다른 길이 열려 있습니다.',options:[
        c('늦게라도 학교에 돌아간다','학업 시간·비용 부담, 추후 진학 기회'),
        c('기술을 배우며 일한다','현장 실습·빠른 소득'),
        c('가족과 지역 일을 돕는다','관계·실무 경험, 학업 기회 감소')]};
      return {age,title:'내가 좋아하는 길',description:'배움과 취미, 사람들과의 경험 중 무엇을 더 키울까요?',options:[
        c('심화 학업을 이어간다','대학·전문 교육의 선택지 증가'),
        c('기술과 만들기에 도전한다','기술 숙련·수리·제조 경로'),
        c('친구와 지역 활동을 한다','관계·지역 기회·사회적 지원')]};
    }
    if(age===20){
      const eligible=w.educationYears>=5||a.path==='academic';
      return {age,title:eligible?'성인으로서 첫 선택':'새로운 시작, 나의 진로',description:eligible?'공부를 계속할 수도, 돈을 벌기 시작할 수도 있습니다.':'학교 밖에서 배운 경험도 앞으로의 가능성을 만듭니다.',options:[
        c(eligible?'더 공부하거나 전문 교육을 받는다':'늦게 교육·직업훈련을 받는다','교육 비용·시간, 장기적인 진로 변화'),
        c('현장 기술을 익히고 취업한다','빠른 소득·숙련도·인맥'),
        c('일을 시작해 생활을 꾸린다','이른 소득·승진·창업의 기회')]};
    }
    if(age===29){
      if(a.business)return {age,title:'작은 사업의 갈림길',description:m.netWorth<0?'부채가 있지만 사업 경험이 있습니다.':'사업이 자리를 잡아 가는 중입니다.',options:[
        c('사업에 다시 투자한다','사업 규모·수익·파산 위험 증가'),
        c('안정적인 직업을 병행한다','소득 안정·성장 속도 감소'),
        c('기술과 인맥을 활용해 전환한다','전직 가능성·초기 비용')]};
      if(m.employment==='구직 중'||m.netWorth<0)return {age,title:'어려운 시기의 선택',description:'생활을 다시 안정시키려면 무엇이 필요할까요?',options:[
        c('빨리 일자리를 찾는다','즉시 소득·직업 안정'),
        c('재교육과 자격을 준비한다','당장의 비용·장기 기회'),
        c('주변 사람과 함께 창업한다','관계의 도움·큰 변동성')]};
      return {age,title:life.career+'로 살아가는 나',description:'지금까지의 경력과 관계를 앞으로 어떻게 키울까요?',options:[
        c('일에 집중하며 전문성을 키운다','소득·승진 기회, 피로 누적'),
        c('사람들과 균형 있게 살아간다','관계·건강·생활의 안정'),
        c('모은 경험으로 사업에 도전한다','사업 성장 또는 부채 위험')]};
    }
    if(age===42){
      if(life.profile?.child)return {age,title:'일과 가족을 돌보는 시간',description:'자녀를 돌보며 생활과 일을 조율하고 있습니다.',options:[
        c('건강과 가족에게 시간을 쓴다','몸과 관계 회복, 소득 증가 둔화'),
        c('경력을 쌓아 가족의 미래를 준비한다','소득 증가, 시간·건강 부담'),
        c('이웃과 돌봄을 나눈다','돌봄 도움·인맥·생활비 절약')]};
      if(a.business)return {age,title:'사업과 삶의 균형',description:'경영 경험이 쌓였지만 몸과 마음도 돌볼 때입니다.',options:[
        c('무리하지 않고 규모를 줄인다','건강·안정성, 성장 속도 감소'),
        c('사업을 더 크게 키운다','성공 기회와 위험 동시 증가'),
        c('후배를 키우며 일한다','관계·기술 전수·안정')]};
      return {age,title:'살아온 시간이 만든 고민',description:'몸·일·인간관계 중 무엇에 더 많은 시간을 쓸까요?',options:[
        c('건강을 챙기고 쉬어간다','건강 회복과 예방'),
        c('경력과 자산을 더 키운다','소득 상승 가능성·피로'),
        c('인연과 공동체에 시간을 쓴다','인간관계·도움받을 가능성')]};
    }
    if(age===64)return {age,title:'앞으로의 생활을 고르다',description:m.netWorth<0?'노후 자금이 빠듯하지만 경험과 인연이 남아 있습니다.':'그동안 일해 온 시간을 돌아보게 되었습니다.',options:[
      c('일에서 물러나 휴식한다','연금 중심 생활·건강 회복'),
      c('일하는 시간을 줄여 계속 일한다','일부 소득·피로의 균형'),
      c('경험과 기술을 나누며 새 일에 도전한다','새 관계와 소규모 소득') ]};
    return null;
  }
  function gateChoice(life,index){
    const a=ensure(life),age=life.age,opt=makeGate(life);
    if(!life.alive||!opt||!Number.isInteger(index)||index<0||index>=opt.options.length)return false;
    const w=life.world,m=life.money;let result='';
    if(age===16){
      if(index===0){a.path='academic';effects(life,{learning:4,knowledge:12,tag:'academic'});if(w.educationYears<5){w.educationYears+=3;w.schooling='늦게 학교로 돌아옴';w.educationLevel='기초 교육';}result='학업을 더 이어갈 수 있는 길을 찾았다.';}
      if(index===1){a.path='trade';effects(life,{skill:3,learning:1,knowledge:5,tag:'trade'});result='기술을 배우며 손으로 만드는 일에 관심을 가졌다.';}
      if(index===2){a.path='community';effects(life,{network:3,community:3,bonds:10,tag:'mentor'});result='함께하는 사람들에게서 많은 것을 배웠다.';}
    }
    if(age===20){
      if(index===0){
        a.path='academic';a.learning+=3;
        const access=clamp((w.schoolChance+w.secondaryChance)*.32+(.22)+(a.tags.includes('mentor')?.12:0),.19,.88);
        if(roll(life,age,41)<access){w.educationLevel='고등 교육·훈련 중';life.career='학생';addTag(a,'student');result='교육기관의 기회를 얻어 공부를 이어 갔다.';}
        else {a.path='training';life.career='직업 기술을 배우는 중';addTag(a,'training');result='원하던 진학은 어려웠지만 직업훈련을 통해 다시 길을 찾았다.';}
        effects(life,{knowledge:9,money:-4000,skill:2});
      } else if(index===1){
        a.path='trade';life.career='기술·수리 업무';w.occupation=life.career;
        effects(life,{skill:4,security:2,knowledge:5,tag:'trade'});result='일을 시작하고 기술을 꾸준히 쌓기로 했다.';
      } else {
        a.path='work';life.career='지역 서비스·생산 업무';w.occupation=life.career;
        effects(life,{security:3,network:1,money:2600,tag:'earlywork'});result='생활을 책임지기 위해 일을 시작했다.';
      }
      w.startedWorking=index!==0;
    }
    if(age===29){
      if(index===0){
        a.ambition+=4;a.security+=1;a.skill+=2;life.change({health:-4,knowledge:5});
        if(a.business){a.careerRisk+=3;addTag(a,'expanded');result='사업에 다시 투자하며 더 큰 위험과 가능성을 선택했다.';}
        else if(m.employment==='구직 중'||m.netWorth<0){a.security+=2;life.career='재취업 후 경력 쌓는 중';result='다시 일을 구하고 꾸준히 경력을 이어 갔다.';}
        else {life.career='경력 발전 중';result='일과 전문성에 집중하기 시작했다.';}
      } else if(index===1){
        a.network+=2;a.security+=3;a.wellness+=2;life.change({bonds:7,happiness:6});
        if(a.business){a.business=false;life.career='사업 정리 후 안정적인 직장';result='사업 규모를 정리하고 꾸준한 일자리로 옮겼다.';}
        else if(m.employment==='구직 중'||m.netWorth<0){a.learning+=2;result='생활을 안정시키며 재도전할 시간을 만들었다.';}
        else result='사람들과 함께할 시간과 안정적인 생활을 선택했다.';
      } else {
        a.business=!a.business || a.path==='trade';a.careerRisk+=3;a.network+=1;a.skill+=2;
        m.netWorth-=8000*(w.economyScale||1);
        life.career=a.business?'자영업·창업':'새로운 직업 탐색 중';
        result=a.business?'배운 경험으로 작은 사업을 시작했다.':'그동안의 경험을 바탕으로 새로운 일을 준비했다.';
        addTag(a,'business');
      }
    }
    if(age===42){
      if(index===0){a.wellness+=5;a.ambition=Math.max(0,a.ambition-1);life.change({health:12,happiness:5,bonds:5});result='몸과 마음, 소중한 사람을 돌보기로 했다.';}
      if(index===1){a.ambition+=3;a.careerRisk+=a.business?2:0;a.skill+=2;life.change({health:-7,knowledge:5});result='일에 시간을 더 쓰는 대신 성장의 가능성을 넓혔다.';}
      if(index===2){a.network+=4;a.community+=3;a.security+=1;life.change({bonds:9,happiness:4});result='이웃·가족·후배들과 도움을 나누었다.';}
    }
    if(age===64){
      m.pension=Math.max(m.pension,Math.round(m.income*.36));
      if(index===0){m.retired=true;a.wellness+=3;life.change({health:7,happiness:6});result='일을 마치고 건강과 여유로운 시간을 선택했다.';}
      if(index===1){m.retired='partial';a.security+=2;a.wellness+=1;life.change({health:2});result='일하는 시간을 줄이고 경험을 살려 계속 일했다.';}
      if(index===2){m.retired='new';a.network+=3;a.community+=2;a.skill+=1;life.change({happiness:7,bonds:4});result='배운 것을 다른 사람과 나누는 새 일을 시작했다.';}
    }
    life.logEvent(result,'decision');
    a.decisions.push({age,index,title:opt.title,label:opt.options[index].label,result});
    a.decisionCount++;life.pending=null;
    return true;
  }
  function eligible(life,rule){
    if(life.age<rule.min||life.age>rule.max||life.arc.seen.includes(rule.id))return false;
    return rule.requires.every(tag=>has(life,tag));
  }
  function runEvent(life){
    const a=ensure(life);if(roll(life,life.age,99)>.49)return;
    const possible=EVENTS.filter(e=>eligible(life,e));
    if(!possible.length)return;
    const total=possible.reduce((s,e)=>s+e.weight,0);
    let n=roll(life,life.age,100)*total,chosen=possible.at(-1);
    for(const e of possible){n-=e.weight;if(n<=0){chosen=e;break;}}
    const variation=hash(life.seed,life.age,101)%chosen.lines.length;
    const message=chosen.lines[variation];
    effects(life,chosen.effects);
    if(chosen.id==='late-school' && life.world?.educationYears<5){
      life.world.schooling='늦게 학교에 다니기 시작함';
      life.world.educationYears=Math.max(life.world.educationYears,2);
      life.world.educationLevel='기초 교육';
    }
    if(chosen.id==='job-loss')a.unemployedUntil=life.age+2;
    if(chosen.id==='job-recovery')a.unemployedUntil=0;
    if(chosen.id==='business-crisis')a.careerRisk+=2;
    if(chosen.id==='business-growth')a.security+=2;
    if(chosen.id==='business-close'){a.business=false;life.career='재취업·직업전환 중';}
    a.seen.push(chosen.id);a.eventCount++;a.lastEvent=message;
    a.earnedEvents.push({age:life.age,id:chosen.id,text:message});
    if(a.earnedEvents.length>35)a.earnedEvents.shift();
    life.logEvent(message,'chain');
  }
  function install(){
    if(!Sim?.Life||!W3?.setup||Sim.Life.prototype.__world4)return false;
    const Life=Sim.Life,oldTick=Life.prototype.tick,oldChoose=Life.prototype.choose,oldChoice=Life.prototype.getChoice;
    const oldSnapshot=Life.prototype.snapshot,oldRestore=Life.restore;
    Life.prototype.tick=function(){
      if(!this.alive||this.pending)return false;
      ensure(this);
      const ok=oldTick.call(this);
      if(!ok)return false;
      // After World3 life updates including death checks, let living adults
      // experience new events; never fire events after death.
      if(this.alive)runEvent(this);
      return true;
    };
    Life.prototype.getChoice=function(){
      if(typeof this.pending==='number'&&GATES.includes(this.pending))return makeGate(this);
      return oldChoice.call(this);
    };
    Life.prototype.choose=function(index){
      if(typeof this.pending==='number'&&GATES.includes(this.pending))return gateChoice(this,index);
      const ok=oldChoose.call(this,index);
      if(ok&&this.arc){
        const a=this.arc;
        if(this.profile?.partner)addTag(a,'partner');
        if(this.profile?.child)addTag(a,'child');
        if(this.career==='자영업'){a.business=true;addTag(a,'business');}
      }
      return ok;
    };
    Life.prototype.snapshot=function(){ensure(this);return {...oldSnapshot.call(this),arc:JSON.parse(JSON.stringify(this.arc))};};
    Life.restore=function(data){
      const life=oldRestore.call(this,data);if(!life)return null;
      ensure(life);
      if(data?.arc && typeof data.arc==='object'){
        const d=data.arc,a=life.arc;
        for(const k of ['path','lastEvent','firstJob'])if(typeof d[k]==='string')a[k]=d[k].slice(0,130);
        for(const k of ['skill','learning','network','security','wellness','ambition','community','careerRisk','unemployedUntil','decisionCount','eventCount'])
          if(Number.isFinite(d[k]))a[k]=clamp(d[k],k==='unemployedUntil'?0:-8,k==='unemployedUntil'?110:50);
        a.business=d.business===true;
        for(const key of ['tags','seen'])if(Array.isArray(d[key]))a[key]=d[key].filter(x=>typeof x==='string').slice(0,90);
        for(const key of ['decisions','earnedEvents'])if(Array.isArray(d[key]))a[key]=d[key].filter(x=>x&&typeof x==='object').slice(-40).map(x=>({...x}));
      }
      return life;
    };
    Object.defineProperty(Life.prototype,'__world4',{value:true});
    return true;
  }
  install();
  return Object.freeze({install,ensure,EVENTS,GATES,makeGate,gateChoice,hash,roll});
});