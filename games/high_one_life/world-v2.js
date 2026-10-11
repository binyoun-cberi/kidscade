/* One Life v2: birth identity, contextual milestones and an illustrative economy.
   All names, city assignments and financial figures are fictional educational models,
   NOT real personal data, census probabilities, wages, or PPP statistics. */
(function(root,factory){
  const lib=factory(root?.OneLifeSim);
  if(typeof module!=='undefined'&&module.exports)module.exports=lib;
  if(root)root.OneLifeWorld2=lib;
})(typeof window!=='undefined'?window:null,function(sim){
  'use strict';
  const METADATA={
    '대한민국':['서울','부산','대전','광주'], '프랑스':['파리','리옹','마르세유'], '미국':['뉴욕','시카고','시애틀'], '인도':['뭄바이','델리','벵갈루루'],
    '중국':['상하이','베이징','청두'], '일본':['도쿄','오사카','삿포로'], '독일':['베를린','뮌헨','함부르크'], '브라질':['상파울루','리우데자네이루'],
    '인도네시아':['자카르타','수라바야'], '나이지리아':['라고스','아부자'], '파키스탄':['라호르','카라치'], '방글라데시':['다카','치타공'],
    '러시아':['모스크바','상트페테르부르크'], '에티오피아':['아디스아바바','곤다르'], '멕시코':['멕시코시티','과달라하라'], '필리핀':['마닐라','세부'],
    '베트남':['하노이','호찌민'], '튀르키예':['이스탄불','앙카라'], '영국':['런던','맨체스터'], '이집트':['카이로','알렉산드리아'],
    '스페인':['마드리드','바르셀로나'], '캐나다':['토론토','밴쿠버'], '태국':['방콕','치앙마이'], '남아프리카공화국':['케이프타운','요하네스버그'],
    '호주':['시드니','멜버른'], '모나코':['모나코','몬테카를로'], '이탈리아':['로마','밀라노'], '말레이시아':['쿠알라룸푸르','페낭'], '케냐':['나이로비','몸바사']
  };
  const NAMES={
    '대한민국':[['서윤','지우','하린','소연'],['민준','도윤','지호','준서']],
    '일본':[['유이','하나','미오','사쿠라'],['하루토','렌','유토','소타']],
    '중국':[['메이','샤오위','린','위에'],['웨이','하오','준','지안']],
    '인도':[['아샤','프리야','아난야','미라'],['아르준','라훌','로한','비벡']],
    '프랑스':[['엠마','클로에','레아','마농'],['루카','가브리엘','레오','위고']],
    '미국':[['에마','올리비아','에이바','소피아'],['노아','리엄','메이슨','제임스']],
    '브라질':[['아나','마리아','줄리아','베아트리스'],['페드루','루카스','가브리엘','주앙']],
    '독일':[['미아','한나','에밀리아','레나'],['레온','벤','파울','펠릭스']],
    '인도네시아':[['푸트리','사리','디아','아유'],['아디','리잘','부디','다니']],
    '나이지리아':[['아다','치오마','아미나','조이'],['치디','툰데','무사','에메카']],
    '멕시코':[['소피아','발레리아','카밀라','루시아'],['산티아고','마테오','디에고','호세']],
    '영국':[['올리비아','릴리','그레이스','아멜리아'],['올리버','조지','아서','해리']],
    '베트남':[['린','안','하','찌'],['민','남','꾸옥','호앙']],
    '필리핀':[['마리아','안젤라','소피아','니나'],['호세','카를로','미겔','루이스']]
  };
  const DEFAULT_NAMES=[['미나','사라','리아','엘라'],['아민','아담','오마르','다니엘']];
  const FAMILY_JOBS=['가게 직원','농업 종사자','택시 운전사','사무직','기술자','조리사','돌봄 노동자','자영업자','건설 노동자','병원 직원','교사','판매직'];
  const EXTRA_CHOICES=[
    {age:24,title:'첫걸음을 정해야 할 때',description:'어떤 일을 이어가며 살아갈까요?',options:[
      {label:'안정적인 일자리를 찾아본다',note:'소득의 안정성',effects:{wealth:5,knowledge:2},career:'사무·서비스직',text:'꾸준한 일을 찾아 생활의 기반을 다졌다.',incomeFactor:1.03},
      {label:'기술을 배우며 일한다',note:'미래 소득 잠재력',effects:{knowledge:10,wealth:-4},career:'기술직',text:'기술을 익히며 조금씩 전문가가 되어 갔다.',incomeFactor:1.16},
      {label:'작은 사업을 시작한다',note:'위험과 가능성',effects:{wealth:-8,happiness:5},career:'자영업',text:'자신의 가게를 꾸리며 불확실한 도전을 시작했다.',incomeFactor:1.34}
    ]},
    {age:33,title:'소중한 인연',description:'누군가와 함께하는 삶도, 혼자의 시간도 서로 다른 가치를 가집니다.',options:[
      {label:'오랜 연인과 삶을 함께한다',note:'관계의 변화와 공동생활',effects:{bonds:10,happiness:5},partner:true,text:'서로 의지하는 동반자와 삶을 함께하기로 했다.'},
      {label:'혼자만의 길을 이어 간다',note:'자립과 자유',effects:{happiness:7,knowledge:3},partner:false,text:'나 자신에게 충실하며 삶을 이어 갔다.'},
      {label:'친구와 이웃의 관계를 깊게 한다',note:'우정과 공동체',effects:{bonds:14,happiness:5},partner:false,text:'다양한 사람들과 서로 돕는 관계를 만들었다.'}
    ]},
    {age:37,title:'돌봄과 가족의 모습',description:'삶에는 여러 가족 형태가 있습니다. 누구와 어떤 관계를 만들어 가고 싶나요?',options:[
      {label:'아이를 돌보는 삶을 선택한다',note:'돌봄과 책임, 생활비 증가',effects:{bonds:10,happiness:7,wealth:-6},child:true,text:'새로운 아이를 돌보며 하루가 바쁘고 따뜻해졌다.'},
      {label:'함께 사는 사람과 삶을 가꾼다',note:'관계와 여유',effects:{bonds:8,happiness:8},text:'가까운 사람과 일상을 소중하게 채웠다.'},
      {label:'자기만의 꿈에 시간을 쓴다',note:'배움과 선택의 자유',effects:{knowledge:10,happiness:8},text:'오래 생각해 온 목표에 집중했다.'}
    ]},
    {age:48,title:'뜻밖의 목돈이 필요하다',description:'살다 보면 예기치 못한 지출을 감당해야 할 때도 있습니다.',options:[
      {label:'필요한 만큼 저축을 사용한다',note:'부채를 줄이고 자산을 사용',effects:{wealth:-5,happiness:2},payment:'cash',text:'모아 둔 돈으로 급한 문제를 해결했다.'},
      {label:'지출을 줄이며 나누어 마련한다',note:'당장의 삶에 부담',effects:{happiness:-5,health:-2},payment:'budget',text:'생활비를 아껴 차근차근 문제를 해결했다.'},
      {label:'주변의 도움을 구한다',note:'관계와 채무의 가능성',effects:{bonds:5,happiness:-2},payment:'help',text:'주변 사람들에게 도움을 요청했다.'}
    ]},
    {age:64,title:'일에서 한 걸음 물러날 때',description:'그동안 해 온 일과 앞으로 보내고 싶은 시간을 생각합니다.',options:[
      {label:'일을 정리하고 휴식한다',note:'연금과 생활비 조절',effects:{health:7,happiness:6},retire:true,text:'긴 직장 생활을 마치고 하루의 속도를 늦췄다.'},
      {label:'시간을 줄여 계속 일한다',note:'일부 소득 유지',effects:{knowledge:4,health:-2},retire:'partial',text:'필요한 만큼만 일하며 여유를 만들었다.'},
      {label:'새로운 일을 가볍게 시작한다',note:'소득 변동과 새로운 만남',effects:{bonds:5,happiness:6},retire:'new',text:'새로운 환경에서 소소한 일을 시작했다.'}
    ]}
  ];
  function hash(seed,salt){
    let x=(seed^Math.imul(salt+1,0x9e3779b9))>>>0;
    x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);
    return (x^(x>>>16))>>>0;
  }
  const between=(s,k,min,max)=>min+hash(s,k)%(max-min+1);
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const round=v=>Math.round(v);
  const Official=typeof module!=='undefined'&&module.exports
    ? require('./official-data.js') : (typeof window!=='undefined'?window.OneLifeOfficialStats:null);
  // Urban share describes the overall population, not the share of births.
  // Applying it to newborn settlement is an explicitly approximate game rule.
  function settlementFor(country,seed,community,birthYear=2026){
    const urban=birthYear===2026?Official?.countries?.[country]?.urbanPercent?.value:null;
    if(!Number.isFinite(urban)||urban<0||urban>100)
      return community%3===0?'농촌':community%3===1?'도시':'소도시';
    const share=urban/100,toss=hash(seed,1001)/4294967296;
    if(toss>=share)return '농촌';
    return hash(seed,1002)%10<7?'도시':'소도시';
  }
  const BASE=22000;
  const COUNTRY_FACTOR=country=>clamp(0.15+(country[3]||.5)*1.52,.4,1.7);
  function enrich(life){
    if(life.profile && life.money)return life;
    const seed=life.seed,ct=life.country[0];
    const pair=NAMES[ct]||DEFAULT_NAMES;
    const row=life.gender==='여자'?pair[0]:pair[1];
    const historic=life.country[0]==='대한민국'&&life.birthYear<1970;
    const namesHistoric=life.gender==='여자'
      ?['정숙','영희','순덕','옥순','명자','복순']
      :['영수','영길','춘식','덕수','기석','병철'];
    const jobsHistoric=['농업 노동자','상인','수공업자','방직 노동자','목수','판매 노동자','학교 교육자','음식점 종사자'];
    const cities=METADATA[ct]||['도시 지역','작은 마을'];
    const community=between(seed,11,0,99);
    const place=cities[community % cities.length];
    const familyAsset=life.familyLevel==='여유 있는 형편'?1.8:life.familyLevel==='빠듯한 형편'?.37:1;
    const p={name:historic?namesHistoric[between(seed,1,0,namesHistoric.length-1)]:row[between(seed,1,0,row.length-1)],city:place,
      birthMonth:between(seed,2,1,12),birthDay:between(seed,3,1,28),
      motherAge:between(seed,4,22,41),fatherAge:between(seed,5,23,48),
      motherJob:historic?jobsHistoric[between(seed,6,0,jobsHistoric.length-1)]:FAMILY_JOBS[between(seed,6,0,FAMILY_JOBS.length-1)],
      fatherJob:historic?jobsHistoric[between(seed,7,0,jobsHistoric.length-1)]:FAMILY_JOBS[between(seed,7,0,FAMILY_JOBS.length-1)],
      familyIncome:round(BASE*COUNTRY_FACTOR(life.country)*familyAsset),
      siblings:between(seed,8,0,3),settlement:settlementFor(ct,seed,community,life.birthYear),
      partner:false,child:false};
    life.profile=p;
    life.money={netWorth:0,income:0,expense:0,careerIncomeFactor:1,
      employment:'자녀',retired:false,pension:0,lastBalance:0,educationCost:0};
    return life;
  }
  function financialYear(life){
    enrich(life);
    const m=life.money,p=life.profile,age=life.age;
    if(age<18)return;
    const factor=COUNTRY_FACTOR(life.country)*(life.world?.economyScale||1);
    const personalFactor=.58+between(life.seed,21,0,110)/100; // personal chances vary widely
    const schoolingBoost=life.world?.educationLevel==='고등 교육·훈련 수료'?1.30
      : life.world?.educationLevel==='직업훈련 수료'?1.10
      : life.world?.educationLevel==='직업훈련 중'?.95
      : life.world?.educationLevel==='중등 과정 이수'?1.08
      : life.world?.educationLevel==='기초 교육'?.96:.79;
    const householdCost=.58+between(life.seed,22,0,45)/100; // housing and living expenses
    if(age===18) {
      const help=round(p.familyIncome * (life.familyLevel==='여유 있는 형편'?.65:life.familyLevel==='빠듯한 형편'?.04:.19));
      m.netWorth+=help;
      life.logEvent('성인이 되며 가족으로부터 시작 자금 '+Math.abs(help).toLocaleString('en-US')+'점을 지원받았다.','money');
    }
    const skill=clamp(.62+life.stats.knowledge/130,.6,1.50);
    const arc=life.arc;
    const employed=age>=20 && !['학생','진로 탐색 중','아직 정해지지 않음'].includes(life.career);
    if(age===75 && m.retired!==true){
      m.pension=round(Math.max(m.pension,m.income*(.12+.32*(life.world?.formalWorkAccess||.5))));
      m.retired=true;life.logEvent('일을 정리하고 연금과 모은 돈으로 생활하기 시작했다.','money');
    }
    let yearly=0;
    if(m.retired===true){
      yearly=m.pension;
      m.employment='은퇴';
    }else if(employed){
      const jobBoost=/기술|전문/.test(life.career)?1.15:/자영업|도전/.test(life.career)?1.02:1;
      const experienceBoost=arc?Math.max(.65,Math.min(1.95,1+
        arc.skill*.052+arc.learning*.021+arc.network*.014+arc.ambition*.028+
        arc.security*.018-arc.careerRisk*.014)):1;
      yearly=round(BASE*factor*skill*schoolingBoost*jobBoost*personalFactor*m.careerIncomeFactor*experienceBoost*(life.world6?.incomeFactor||1)
        *(.77+Math.min(25,age-19)*.012));
      const chance=life.rand();
      const jobLossChance=(.05+(1-(life.world?.formalWorkAccess||life.country[3]||.55))*.12-(life.world?.safetyNetAccess||.4)*.025)*(arc?
        Math.max(.40,Math.min(2.0,1-arc.security*.065+arc.careerRisk*.065)):1);
      if(arc?.unemployedUntil>=age){
        yearly=0;m.employment='구직 중';
      }else if(chance<jobLossChance && age<62){
        yearly=0;m.employment='구직 중';
        life.logEvent('예상치 못한 실직으로 잠시 일자리를 찾아야 했다.','money');
      }else if(chance<.15){
        yearly=round(yearly*.70);m.employment='근로 시간 감소';
      }else m.employment=life.career;
      if(arc?.business) {
        const trend=life.rand(); // one economic cycle per active business year
        yearly=round(yearly*(trend<.18?.28:trend>.86?1.85:1.05));
        m.employment='자영업·사업 운영';
      }
      if(m.retired==='partial'||m.retired==='new') yearly=round(yearly*.46+m.pension*.4);
    }else if(age>=21){
      m.employment=life.career;
      yearly=round(BASE*factor*(.12+.12*(life.familyLevel==='여유 있는 형편'?1:0)));
    }else{
      m.employment='학업·성장';
      // 18-19 year olds may still live in their family household.
      // Only personal spending, offset by part-time/family support, is charged.
      yearly=round(BASE*factor*.10);
    }
    const housing=p.settlement==='도시'?1.12:p.settlement==='농촌'?.91:1;
    // Study and the transition to adulthood often happen in a shared household;
    // charging a full independent home at age 20 before a career choice creates forced debt.
    const studying=life.career==='학생'&&age<=24;
    const costRate=age<=20?.12:studying?householdCost*.44:m.retired===true?.56:householdCost;
    const fixedCost=round(BASE*factor*costRate*housing);
    const dependent=p.child&&age>=37&&age<=56?
      round(BASE*factor*.17*(arc?.tags?.includes('care-support')?.68:1)):0;
    const tuition=studying?round(BASE*factor*.23):0;
    const healthcare=age>=25&&life.stats.health<35?
      round(BASE*factor*.12*(arc?.wellness>=4?.77:1)*(1-(life.world?.healthcareAccess||.35)*.38)):0;
    const familyCost=p.partner?round(BASE*factor*.10):0;
    const extraCost=arc?.business?round(BASE*factor*.075):0;
    const networkSupport=arc&&arc.network>=5?round(BASE*factor*.035):0;
    const publicSupport=m.employment==='구직 중'?round(BASE*factor*(life.world?.safetyNetAccess||.25)*.055):0;
    const support=networkSupport+publicSupport;
    const expense=Math.max(0,fixedCost+dependent+tuition+healthcare+familyCost+extraCost-support);
    m.income=yearly;
    m.expense=expense;
    m.educationCost=tuition;
    m.lastBalance=yearly-expense;
    m.netWorth=clamp(round(m.netWorth+m.lastBalance),-20000000,20000000);
    // Economic wellbeing must reflect the ledger, not unrelated random "wealth" points.
    const relative=m.netWorth/Math.max(1,BASE*factor);
    life.stats.wealth=clamp(round(43+9*Math.sign(relative)*Math.log1p(Math.abs(relative))),0,97);
    if(age===21 && tuition)life.logEvent('학업 비용과 생활비를 마련하며 지출을 조정했다.','money');
    if(m.netWorth<0 && age%8===0)life.logEvent('빚이 남아 있어 지출 계획을 다시 살폈다.','money');
    if(age%9===0 && m.netWorth>BASE*factor*3)life.logEvent('수년간 모은 돈이 작은 안전망이 되어 주었다.','money');
  }
  function applyExtra(life,opt){
    if(opt.partner!==undefined)life.profile.partner=opt.partner;
    if(opt.child)life.profile.child=true;
    if(opt.incomeFactor)life.money.careerIncomeFactor=opt.incomeFactor;
    if(opt.retire){
      life.money.pension=round(life.money.income*.35);
      life.money.retired=opt.retire;
    }
    if(opt.payment){
      const cost=round(BASE*COUNTRY_FACTOR(life.country)*(life.world?.economyScale||1)*.68);
      const ratio=opt.payment==='budget'?.8:opt.payment==='help'?.48:1;
      life.money.netWorth-=round(cost*ratio);
    }
  }
  function install(){
    if(!sim?.Life || sim.Life.prototype.__world2)return false;
    const Life=sim.Life;
    const tick=Life.prototype.tick,choose=Life.prototype.choose,choice=Life.prototype.getChoice;
    const snapshot=Life.prototype.snapshot,restore=Life.restore;
    Life.prototype.tick=function(){
      if(!this.alive||this.pending)return false;
      enrich(this);
      const result=tick.call(this);
      if(result && this.age>=18)financialYear(this);
      if(this.alive && !this.pending && EXTRA_CHOICES.some(c=>c.age===this.age))this.pending='extra:'+this.age;
      return result;
    };
    Life.prototype.choose=function(index){
      const extra=EXTRA_CHOICES.find(c=>this.pending==='extra:'+c.age);
      if(!extra)return choose.call(this,index);
      const opt=extra.options[index];
      if(!this.alive||!Number.isInteger(index)||!opt)return false;
      enrich(this);
      this.change(opt.effects);this.career=opt.career||this.career;
      applyExtra(this,opt);this.logEvent(opt.text,'decision');this.pending=null;
      return true;
    };
    Life.prototype.getChoice=function(){
      return choice.call(this)||EXTRA_CHOICES.find(c=>this.pending==='extra:'+c.age)||null;
    };
    Life.prototype.snapshot=function(){
      enrich(this);
      return {...snapshot.call(this),profile:{...this.profile},money:{...this.money}};
    };
    Life.restore=function(data){
      const obj=restore.call(this,data);
      if(!obj)return null;
      enrich(obj);
      if(data?.alive && typeof data.pending==='string' && /^extra:(24|33|37|48|64)$/.test(data.pending) && Number(data.pending.split(':')[1])===obj.age) obj.pending=data.pending;
      if(data?.profile && data?.money){
        // Carefully filter saved state; never allow NaN or arbitrary huge financial values.
        for(const key of ['partner','child'])obj.profile[key]=Boolean(data.profile[key]);
        for(const key of ['name','city','settlement'])if(typeof data.profile[key]==='string')obj.profile[key]=data.profile[key].slice(0,48);
        for(const key of ['netWorth','income','expense','careerIncomeFactor','pension','lastBalance','educationCost']){
          if(Number.isFinite(data.money[key]))obj.money[key]=clamp(Number(data.money[key]),(key==='netWorth'||key==='lastBalance')?-20000000:0,20000000);
        }
        if(['true','false','partial','new'].includes(String(data.money.retired)))obj.money.retired=data.money.retired;
        if(typeof data.money.employment==='string')obj.money.employment=data.money.employment.slice(0,40);
      }
      return obj;
    };
    Object.defineProperty(Life.prototype,'__world2',{value:true});
    return true;
  }
  // The original engine is loaded first in the browser; node can invoke install with global sim.
  install();
  return Object.freeze({install,enrich,EXTRA_CHOICES,METADATA,NAMES,COUNTRY_FACTOR,financialYear});
});