/* 단 하나의 인생: 출생 추첨, 자동 시간, 선택, 기록 화면 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const Sim = window.OneLifeSim;
  if (!Sim) throw new Error('OneLifeSim engine not loaded');
  const World2 = window.OneLifeWorld2;
  const Pixel = window.OneLifeScenes8 || window.OneLifeScenes6 || window.OneLifeScene;
  const World3 = window.OneLifeWorld3;
  const World4 = window.OneLifeWorld4;
  const World5 = window.OneLifeWorld5;
  const World6 = window.OneLifeWorld6;
  const World7 = window.OneLifeWorld7;
  const World8 = window.OneLifeWorld8;
  const World9 = window.OneLifeWorld9;
  const World10 = window.OneLifeWorld10;
  const World12 = window.OneLifeWorld12;
  const World13 = window.OneLifeWorld13;
  const Joseon = window.OneLifeJoseon;
  const Joseon2 = window.OneLifeJoseon2;
  const JoseonCulture = window.OneLifeJoseonCulture;
  const Joseon3 = window.OneLifeJoseon3;
  const Joseon4 = window.OneLifeJoseon4;
  const Joseon5 = window.OneLifeJoseon5 || null;
  const Joseon6 = window.OneLifeJoseon6 || null;
  const History = window.OneLifeHistory;
  const Official=window.OneLifeOfficialStats||{countries:{}};
  const metric=(key)=>life?.birthYear===2026?Official.countries?.[life?.country?.[0]]?.[key]||null:null;
  const metricLabel=(key,label,unit='')=>{
    const row=metric(key);
    return row&&Number.isFinite(row.value)
      ? label+' '+Number(row.value).toLocaleString('ko-KR',{maximumFractionDigits:1})+unit+' ('+row.year+'년)'
      : label+' 자료 없음';
  };
  if (!World2 || !Pixel || !World3 || !World4 || !World5 || !World6 || !World7 || !World8 || !World9 || !World10 || !World12 || !World13 || !Joseon || !Joseon2 || !Joseon3 || !Joseon4 || !History) throw new Error('One Life world assets missing');
  const SAVE_KEY = 'kidscade_one_life_save_v1';
  const RECORD_KEY = 'kidscade_one_life_history_v1';
  // About 20–30 seconds of automatic years, excluding choices.
  const YEAR_MS = 260;
  const STAT_NAMES = [['health','건강'],['happiness','행복'],['knowledge','배움'],['bonds','인연'],['wealth','경제']];
  const views = ['intro','birth','play','end'];
  let life = null, paused = false, stage = 'intro';
  let lastTick = performance.now(), elapsed = 0, roulette = null, screenTime = 0;
  let completed = false, ruleWasRunning = false, replayBasis = null;
  let peerCache = null, lastPeerRenderedAge = -1, lastMapRenderedAge = -1;
  let storyTab='', peerAgeChoice=0, timelineVisible=22, playSpeed=1, nextDecision=false;
  const sdk = window.KidscadeGame || null;
  const show = name => {
    stage = name;
    document.body.classList.toggle('joseon-book', name!=='intro' && !!life && Joseon.isJoseon(life));
    for (const id of views) $(id).classList.toggle('hidden',id!==name);
    window.scrollTo?.(0,0);
  };
  // 토지 수치는 역사적 면적·소유 비율이 아닌 이야기 속 자원이다.
  // 이용자가 처음 만나는 문장에는 그 수치 대신 먹고사는 모습을 보여 준다.
  const oldPlaces = {
    '한양':'도성의 거리에는 장인과 장사꾼, 관청으로 향하는 사람이 오간다.',
    '경기도':'논밭 사이에 마을이 있고, 장날이면 고을이 북적인다.',
    '충청도':'마을을 둘러싼 논밭에서 철마다 농사일이 이어진다.',
    '전라도':'넓은 논과 포구를 따라 곡식과 물건이 오간다.',
    '경상도':'산길과 물길을 따라 마을과 장터가 이어진다.',
    '강원도':'산기슭의 마을에서는 밭일과 나무하는 일이 바쁘다.',
    '황해도':'들판 너머로 포구가 보이고, 장날이면 길이 분주하다.',
    '평안도':'고을의 장과 북쪽으로 향하는 길에 낯선 소식이 오간다.',
    '함경도':'산자락의 마을은 긴 겨울을 앞두고 땔감과 양식을 챙긴다.'
  };
  function oldPlace(life) {
    return oldPlaces[Joseon.summary(life).region] || '고을마다 사는 모습과 생업은 저마다 다르다.';
  }
  function oldFarm(life) {
    const j=Joseon.summary(life),e=j.economy;
    if(!e.workedLand)return '일구는 논밭이 없어, '+j.occupation+'과 집안의 일손으로 살아간다.';
    if(e.ownedLand>0&&e.leasedLand>0)return '집안에서 가진 논밭을 일구고, 남의 땅도 빌려 농사짓는다.';
    if(e.ownedLand>0)return '집안에서 가진 논밭을 일구며 한 해의 살림을 꾸린다.';
    return '남의 논밭을 빌려 농사짓고, 수확으로 살림을 꾸린다.';
  }
  function oldSeason(month) {
    return month>=3&&month<=5?'봄':month>=6&&month<=8?'여름':month>=9&&month<=11?'가을':'겨울';
  }
  const safeGet = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; } };
  const safeSet = (key,data) => { try { localStorage.setItem(key,JSON.stringify(data)); return true; } catch (_) { return false; } };
  const safeRemove = key => { try { localStorage.removeItem(key); } catch (_) {} };
  function currentSave() {
    const stored = safeGet(SAVE_KEY);
    if(!stored?.life)return null;
    const restored=Sim.Life.restore(stored.life);
    return restored?.country?.[0]==='대한민국'?restored:null;
  }
  function refreshResume() {
    const resume = currentSave();
    $('resumeBtn').classList.toggle('hidden', !resume || !resume.alive);
  }
  function save() {
    if (stage === 'play' && life?.alive) safeSet(SAVE_KEY, {life:life.snapshot(),replayBasis,at:Date.now()});
  }
  function draw() {
    clearInterval(roulette);
    roulette = null;
    playSpeed=1;nextDecision=false;refreshSpeedControls();
    const desired=Number($('birthYearInput').value);
    const birthYear=Number.isInteger(desired)&&desired>=1392&&desired<=2026?desired:2026;
    $('birthYearInput').value=String(birthYear);
    const countryName='대한민국';
    life = new Sim.Life(undefined,{birthYear,countryName});
    World8.ensure(life);if(Joseon.isJoseon(life))Joseon.ensure(life);
    else {World8.moment(life);World10.ensure(life);}History.contextualize(life);
    storyTab='';peerAgeChoice=0;timelineVisible=22;
    replayBasis=null;
    peerCache = null;lastPeerRenderedAge = -1;lastMapRenderedAge = -1;
    $('birthCertificate').classList.add('hidden');
    completed = false; paused = false; elapsed = 0;
    $('lifeStartBtn').classList.add('hidden');
    $('birthCountry').textContent = '출생 지역을 정하는 중…';
    $('birthFlag').textContent = Joseon.isJoseon(life)?'生':'🇰🇷';
    $('birthDetail').textContent = Joseon.isJoseon(life)?birthYear+'년, 어느 집에 태어나게 될까요?':birthYear+'년에 시작될 인생을 추첨합니다.';
    document.querySelector('.birth-heading').textContent=Joseon.isJoseon(life)?'조선의 어느 집, 한 아이가 태어납니다.':'당신은 어디에서 태어날까요?';
    show('birth');
    let loops = 0;
    const sample = [['한양','📜'],['경상도','📜'],['평안도','📜'],['함경도','📜'],['제주도','📜']];
    const paint = country => { $('birthFlag').textContent = country[1]; $('birthCountry').textContent = country[0]; };
    roulette = setInterval(() => {
      loops++;
      paint(sample[(loops*7)%sample.length]);
      if(loops >= 19) {
        clearInterval(roulette); roulette = null;
        $('birthFlag').textContent=Joseon.isJoseon(life)?'生':'🇰🇷';
        $('birthCountry').textContent=History.place(life);
        $('birthDetail').textContent = life.gender + ' · ' + life.familyLevel + ' · ' + life.year + '년 출생';
        paintCertificate();
        $('lifeStartBtn').classList.remove('hidden');
        $('lifeStartBtn').focus();
      }
    }, 76);
  }
  const formatCredits = value => {
    const n=Math.round(Number(value)||0);
    return (n<0?'−':'')+Math.abs(n).toLocaleString('ko-KR')+'점';
  };
  function paintCertificate() {
    if(!life)return;
    const p=World2.enrich(life).profile;
    const historical=Joseon.inOldEra(life);
    const j=historical?Joseon.summary(life):null;
    const parents=historical?Joseon4.summary(life).people:[];
    const father=parents.find(person=>person.role==='father');
    const mother=parents.find(person=>person.role==='mother');
    $('birthName').textContent=p.name;
    $('birthPlace').textContent=historical
      ?j.region+'의 어느 '+(j.settlement==='도시'?'도성 안 집':j.settlement==='소도시'?'고을':'마을')
      :History.place(life)+' · '+p.city+' ('+p.settlement+')';
    $('birthGender').textContent=life.gender;
    $('birthDate').textContent=historical?life.birthYear+'년 · '+oldSeason(p.birthMonth)+' 무렵'
      :life.birthYear+'년 '+p.birthMonth+'월 '+p.birthDay+'일';
    $('birthFamily').textContent=life.familyLevel+(historical&&Joseon5?' · '+Joseon5.summary(life).originLabel:'');
    $('birthMother').textContent=(mother?mother.name+' · ':'')+p.motherAge+'세 · '+p.motherJob;
    $('birthFather').textContent=(father?father.name+' · ':'')+p.fatherAge+'세 · '+p.fatherJob;
    $('birthSiblings').textContent=p.siblings+'명';
    const setting=World8.ensure(life);
    $('birthHome').textContent=historical?oldFarm(life):setting.housing+' · '+setting.familyNote;
    $('birthContext').textContent=historical?oldPlace(life):History.period(life)+' · '+setting.regionName+' · '+setting.neighborhood;
    $('birthEraNote').textContent=historical
      ?'새로 태어난 아이를 위해 식구들이 부엌 불을 지피고 자리를 마련한다.'
      :life.birthYear===2026
        ?'어느 나라에서 태어날지는 우연이지만, 그곳의 환경은 저마다 다릅니다.'
        :'그 시대의 한반도에서 이야기가 시작됩니다. 어떤 일들이 기다리고 있을까요?';
    $('birthCountry').textContent=historical?'조선 · '+j.region:History.place(life);
    $('certificateTitle').textContent=historical?'집안의 첫 기록':'출생 신고서';
    $('birthTicketMark').textContent=historical?'朝鮮 · '+life.birthYear+'年':'ONE LIFE / 0001';
    $('birthTicketKind').textContent=historical?'한 생의 첫 장':'출생 기록';
    $('birthCertificate').setAttribute('aria-label',historical?'태어난 집의 기록':'출생 신고서');
    $('hopaDisplay').classList.toggle('hidden',!historical);
    if(historical){
      $('hopaHolder').textContent=father?.name||'집안 어른';
      $('hopaTown').textContent=j.region;
      $('hopaRole').textContent='부친의 이름을 적은 모형';
    }
    $('birthCertificate').classList.remove('hidden');
  }
  function paintLifeRecord() {
    if(Joseon.inOldEra(life)){
      const v2=Joseon2.summary(life),j=Joseon.summary(life),v3=Joseon3.summary(life),v4=Joseon4.summary(life),social=Joseon5?.summary(life),jobs=Joseon6?.summary(life),p=Joseon.ensure(life)&&life.profile,m=life.money,e=j.economy;
      const put=(id,value)=>{$(id).textContent=String(value);};
      put('v10HistoricalCount',Joseon.ensure(life).seen.length+'개 역사 사건');
      put('v10HistoryStatus',j.era+' · '+(Joseon.eventFor(life.year)?.title||j.region+'에서 살아가는 중'));
      put('v10HistoryEffects',[j.warMemory.length?'삶을 바꾼 사건 · '+j.warMemory.join(' · '):'고을의 생활이 이어지고 있습니다.',v2.lastMemory,social?.memories.at(-1)].filter(Boolean).join(' · '));
      put('v12EducationEra','배움 · '+j.school+(j.literacy>=4?' · 글과 경전을 익혔다':j.literacy?' · 글자를 조금씩 익힌다':''));
      put('v12WorkEra','생업 · '+(jobs?.primary?.name||j.occupation)+(jobs?.secondary?' · 겸업 '+jobs.secondary.name:'')+' · '+(social?.originLabel||j.status)+' · '+e.labor);
      put('v12EconomyEra',oldFarm(life)+' '+e.condition+'.');
      put('v12ChoicesCount','삶의 갈림길 '+(j.decisions+v2.decisions+v3.choices+v4.decisions+(social?.decisions||0)+(jobs?.decisions||0))+'번 · 이주 '+j.relocations+'번 · '+(social?.obligations?.at(-1)||'이웃을 도운 횟수 '+v2.helpGiven+'번'));
      if(social)put('v10HistoryStatus',j.era+' · '+social.originLabel+' · '+social.legal);
      put('v13CareYears','한집에서 지내는 식구 '+(v4.atHome+1)+'명 · 부모님 돌봄 '+v4.careYears+'번');
      put('v13FamilyStatus',(v4.spouse?(v4.spouse.alive?'배우자 '+v4.spouse.name+'와 함께 지내는 중':'배우자 '+v4.spouse.name+'와 함께한 기억'):'집안의 생활을 이어가는 중')+' · 자녀 '+v4.children+'명 · 살아 계신 부모님 '+v4.parents+'명');
      put('v13LifeMemories',[...j.memories.slice(-1),...v3.memories.slice(-1),...v4.memories.slice(-2),...(jobs?.memories||[]).slice(-1)].join(' · ')||'세월이 지나며 이야기들이 남습니다.');
      put('nameHeadline',p.name+' · '+j.region);put('profileName',p.name);
      put('profileMeta',life.gender+' · '+j.region+' · '+life.age+'세');
      put('profileFamily',(social?.originLabel||j.status)+(social?.freed?' · 법적 예속에서 벗어남':''));
      put('netWorth',formatCredits(m.netWorth));$('netWorth').classList.toggle('negative',m.netWorth<0);
      $('netWorthLabel').textContent='살림의 남은 몫';
      put('annualIncome',formatCredits(m.income));put('annualExpense',formatCredits(m.expense));
      put('annualBalance',formatCredits(m.lastBalance));$('annualBalance').classList.toggle('negative',m.lastBalance<0);
      put('employmentStatus',(jobs?.primary?.name||j.occupation)+(jobs?.secondary?' · 겸업 '+jobs.secondary.name:''));put('traitEducation',j.school);
      put('traitAptitude','생활의 경험과 배움');put('traitQualification',j.office?'과거 급제·관직 경험':j.literacy?'글과 셈의 배움':'생활 기술을 익히는 중');
      put('traitRegion',j.region+' · '+oldPlace(life));
      put('countryContextText',(social?.originLabel||j.status)+'에서 태어났다. '+oldPlace(life));
      put('countrySourceNote','한 고을에 살아도 집안마다 걸어가는 길은 달랐다.');
      put('officialContext',oldFarm(life));
      const people=$('v9PeopleList');people.replaceChildren();
      for(const member of v4.people.slice(0,11)){
        const item=document.createElement('li'),role=Joseon4.ROLES[member.role]||'가족';
        item.textContent=role+' '+member.name+' · '+member.age+'세 · '+(member.alive?member.work+(member.atHome?' · 한집 거주':' · 따로 거주'):member.diedYear+'년 별세')+(member.role==='child'&&member.legal?' · 법적 처지 '+member.legal:'')+' · '+member.trait+' 성격';
        people.append(item);
      }
      put('v9PeopleCount','가족 '+v4.people.length+'명 중 '+v4.alive+'명 생존 · 함께 사는 식구 '+v4.atHome+'명');put('v9Hobby',v3.memories.at(-1)||'생업과 이웃 사이에서 남은 일상');
      put('v9Loan',e.debt?'이웃이나 친척에게 진 빚을 아직 다 갚지 못했다. '+e.why:'빚을 지지 않고 살림을 꾸려 가고 있다. '+e.why);
      put('v9Hobby',jobs?.primary?jobs.primary.supply+'을 돌보며 '+jobs.primary.people+'과 인연을 이어 간다. '+e.labor:(social?.memories.at(-1)||v3.memories.at(-1)||'생업과 이웃 사이에서 남은 일상')+' · '+e.labor);
      const picture=window.OneLifeJoseonPixel2?.paint($('lifeScene'),life)||Joseon3.paint($('lifeScene'),life)||Joseon.paint($('lifeScene'),life);
      if(!picture)Pixel.paint($('lifeScene'),life);
      put('sceneLabel',life.year+'년 '+v3.season+' · '+j.region+'에서 '+v3.sceneLabel);
      const hopaeShown=life.gender==='남자'&&life.age>=16&&life.year>=1413&&life.year<1897;
      $('lifeHopa').classList.toggle('hidden',!hopaeShown);
      if(hopaeShown){put('lifeHopaName',p.name);put('lifeHopaTown',j.region+' · 호패를 본뜬 기록');}
      const culture=JoseonCulture?.describe(life,{joseon:j,scene:v3.zone,role:jobs?.primary?.name||j.occupation});
      put('sceneCulture',culture?[culture.period+' · '+culture.clothing,culture.housing,culture.meal].join('  |  '):'');
      return;
    }
    $('lifeHopa').classList.add('hidden');
    const p=World2.enrich(life).profile;
    const money=life.money;
    const personal=World7.ensure(life);
    const hometown=World8.ensure(life);
    const memories=World9.ensure(life);
    const livedEra=World10.summary(life);
    const periodLife=World12.summary(life);
    const livedFamily=World13.summary(life);
    const people=$('v9PeopleList');people.replaceChildren();
    const ordered=[...memories.people].sort((a,b)=>Number(b.alive)-Number(a.alive));
    for(const member of ordered.slice(0,7)){
      const li=document.createElement('li');
      const age=Math.max(0,life.year-member.birthYear);
      li.textContent=member.name+' · '+member.role+' · '+(member.alive?age+'세':'작고 ('+member.deadYear+'년)');
      people.append(li);
    }
    $('v9PeopleCount').textContent=memories.people.filter(x=>x.alive).length+'명';
    $('v9Hobby').textContent=memories.hobby?'오래 이어온 취미 · '+memories.hobby+' ('+memories.hobbySince+'세부터)':'아직 정해진 취미가 없습니다.';
    $('v9Loan').textContent=memories.finance.debt
      ?'생활 대출 잔액 '+formatCredits(memories.finance.debt)+' · 남은 상환 '+memories.finance.yearsLeft+'년'
      :memories.finance.paidOff?'생활 대출 모두 상환':'생활 대출 없음';
    if(livedEra){
      $('v10HistoricalCount').textContent=livedEra.facts+'개 역사 사건 · '+livedEra.impacts+'개 영향 기록';
      $('v10HistoryStatus').textContent=livedEra.period+
        (livedEra.event?' · '+livedEra.event.title:' · 현재 해에 등록된 별도 역사 사건은 없음');
      const marks=[...livedEra.memories];
      if(livedEra.schoolInterrupted)marks.push('학업을 이어 가기 어려웠던 경험');
      if(livedEra.moved)marks.push('거주지 이동 '+livedEra.moved+'회');
      $('v10HistoryEffects').textContent=marks.length?'살면서 겪은 일 · '+marks.join(' · '):
        '아직 특별히 남은 기억은 없습니다.';
    }else{
      $('v10HistoricalCount').textContent='한국 역사 모드가 아님';
      $('v10HistoryStatus').textContent='이 지역의 역사 효과는 아직 별도 모델로 제공되지 않습니다.';
      $('v10HistoryEffects').textContent='세상이 바뀌는 동안 이 사람의 하루도 조금씩 달라지고 있다.';
    }
    if(periodLife){
      $('v12EducationEra').textContent=periodLife.schoolNote||
        '학교에 다닐 무렵의 세상은 어땠을까요?';
      $('v12WorkEra').textContent='그해의 일자리 · '+periodLife.period+
        (life.world6?.profession?' · 현재 '+life.world6.profession:'');
      $('v12EconomyEra').textContent='살림살이 · '+
        (periodLife.incomeFactor<.85?'벌이가 넉넉하지 않은 시기':periodLife.incomeFactor<1?'수입이 들쭉날쭉한 시기':'일자리가 변해 가는 시기')+
        ' · '+(periodLife.costFactor>1?'생활비 부담이 늘어남':'평소 생활비를 꾸려 나가는 중');
      $('v12ChoicesCount').textContent='지금까지 고민했던 갈림길 '+periodLife.choices+'번'+
        (periodLife.longConsequences.length?' · 오래 남은 경험 '+periodLife.longConsequences.length+'가지':'');
    }else{
      $('v12EducationEra').textContent='학교와 배움의 이야기';
      $('v12WorkEra').textContent='일터와 일상의 변화';
      $('v12EconomyEra').textContent='그해의 살림살이';
      $('v12ChoicesCount').textContent='살아온 시간 속 선택';
    }
    $('v13CareYears').textContent='가족과 함께 돌본 시간 '+livedFamily.careYears+'년';
    $('v13FamilyStatus').textContent=livedFamily.caringFor.length?
      '요즘 함께 돌보는 가족 · '+livedFamily.caringFor.join(' · '):
      livedFamily.episodes?'몸과 마음을 살피며 지내는 중':
      '가족들도 저마다의 시간을 살아갑니다.';
    $('v13LifeMemories').textContent=livedFamily.memories.length?
      '마음에 남은 일 · '+livedFamily.memories.join(' · '):
      '언젠가 오늘의 일이 다시 떠오르겠지요.';
    $('nameHeadline').textContent=p.name+' · '+p.city;
    $('profileName').textContent=p.name;
    $('profileMeta').textContent=life.gender+' · '+p.city+' · '+life.age+'세';
    $('profileFamily').textContent=p.child?'돌봄 중인 아이가 있어요':p.partner?'함께하는 동반자가 있어요':life.familyLevel;
    $('netWorthLabel').textContent='순자산';
    $('netWorth').textContent=formatCredits(money.netWorth);
    $('netWorth').classList.toggle('negative',money.netWorth<0);
    $('annualIncome').textContent=formatCredits(money.income);
    $('annualExpense').textContent=formatCredits(money.expense);
    $('annualBalance').textContent=formatCredits(money.lastBalance);
    $('annualBalance').classList.toggle('negative',money.lastBalance<0);
    $('employmentStatus').textContent=money.employment;
    $('traitEducation').textContent=life.world?.educationLevel||'배움의 기회를 기다리는 중';
    const names={language:'언어·표현',logic:'논리·탐구',physical:'신체·운동',creative:'창작·예술',social:'사회·관계'};
    $('traitAptitude').textContent=personal.interests.map(k=>names[k]).join(' · ')+'에 관심';
    $('traitQualification').textContent=personal.qualification.length
      ? (personal.degree?'학위 수료 · ':'')+personal.qualification.filter(x=>!x.startsWith('degree:')).map(x=>({
        teaching:'교육 자격',nursing:'간호 자격',therapy:'재활 자격',pharmacy:'약학 자격',
        emergency:'응급 지원 자격',socialwork:'사회복지 자격',electrical:'전기 자격',
        vocational:'직업훈련 수료','continuing-education':'계속 학습'}[x]||x)).join(' · ')
      : (life.age<16?'학교와 경험으로 배우는 중':'학습·직업 경험을 쌓는 중');
    $('traitRegion').textContent=p.settlement+' · '+p.city+' · '+hometown.housing;
    $('countryContextText').textContent=life.world?.schooling+' · 지역 경제 기회 '+(life.world?.economyScale>=1?'상대적으로 넓은 편':'상대적으로 제한적인 편');
    const observed=metric('lifeExpectancy');
    $('countrySourceNote').textContent=life.birthYear!==2026
      ? '이 시기의 생활환경을 바탕으로 한 이야기입니다.'
      : observed
      ? observed.year+'년 기준 평균 기대수명 '+observed.value.toFixed(1)+'세 · 세계은행'
      : '이 나라의 수명 자료가 충분하지 않습니다.';
    $('officialContext').textContent=[
      metricLabel('estimatedBirths','연간 출생아 수(인구×출생률 계산)','명'),
      metricLabel('urbanPercent','도시 인구 비중','%'),
      metricLabel('primaryCompletion','초등 최종 학년 진입 비율(총량 지표)','%'),
      metricLabel('unemployment','ILO 추정 실업률','%'),
      metricLabel('healthCoverage','WHO 필수의료 보장 지수','점'),
      metricLabel('physiciansPerThousand','WHO 의료진 밀도(인구 천 명당 의사)','명')
    ].join(' · ');
    const sceneName=History.paint($('lifeScene'),life)?'역사 속 생활':Pixel.paint($('lifeScene'),life);
    const sceneTitle=Pixel.names?.[sceneName]||sceneName;
    $('sceneLabel').textContent=life.year+'년 · '+History.place(life)+' '+p.city+' ('+p.settlement+') · '+(life.birthYear===2026?sceneTitle+'에서 보내는 하루':History.period(life)+'의 풍경');
    // A Joseon-born family keeps aging after 1900 even when work and school use newer rules.
    if(Joseon.isJoseon(life)){
      const family=Joseon4.summary(life);
      const people=$('v9PeopleList');people.replaceChildren();
      for(const relative of family.people.slice(0,11)){
        const item=document.createElement('li');
        item.textContent=(Joseon4.ROLES[relative.role]||'가족')+' '+relative.name+' · '+relative.age+'세 · '+
          (relative.alive?relative.work+(relative.atHome?' · 한집 거주':' · 따로 거주'):relative.diedYear+'년 별세');
        people.append(item);
      }
      $('v9PeopleCount').textContent='가족 '+family.people.length+'명 중 '+family.alive+'명 생존';
      $('v13CareYears').textContent='가족에게 마음을 쓴 시간 · 부모님 돌봄 '+family.careYears+'번';
      $('v13FamilyStatus').textContent='집을 떠나 살아가는 식구도 있다. 현재 한집에 사는 가족 '+family.atHome+'명';
      $('v13LifeMemories').textContent=family.memories.join(' · ')||'고향에서 함께 지낸 가족의 기억이 남아 있다.';
      $('countrySourceNote').textContent='조선 시대에 태어나 이 시대까지 살아온 이야기다. 가족의 기억은 앞선 세월부터 이어진다.';
    }
  }
  function paintArc() {
    if(!life)return;
    if(Joseon.inOldEra(life)){
      const j=Joseon.summary(life),s=Joseon.ensure(life),allChoices=life.log
        .filter(e=>['joseon-choice','joseon2-choice','joseon3-choice','joseon4-choice','joseon5-choice','joseon6-choice'].includes(e.kind)).slice(-3);
      const n=j.decisions+Joseon2.summary(life).decisions+Joseon3.summary(life).choices+Joseon4.summary(life).decisions+(Joseon5?.summary(life)?.decisions||0);
      $('careerChangeCount').textContent=n+'번의 선택';
      $('careerCurrent').textContent=j.occupation;
      const list=$('careerJourney');list.replaceChildren();
      for(const event of allChoices){
        const item=document.createElement('div');item.className='career-chapter';
        const when=document.createElement('b');when.textContent=event.age+'세';
        const what=document.createElement('span');what.textContent=event.text;
        item.append(when,what);list.append(item);
      }
      $('worldRegionLabel').textContent='조선 · '+j.region;
      $('worldEventCount').textContent=(s.seen.length+Joseon2.summary(life).events)+'개 역사 사건';
      $('worldLatest').textContent=Joseon2.summary(life).lastMemory||s.warMemory.at(-1)||j.era+'의 하루';
      $('arcCount').textContent=n+'번의 선택';
      $('arcStatus').textContent='삶의 방향 · '+j.occupation+(Joseon3.summary(life).legacy?' · '+Joseon3.summary(life).legacy:'');
      const tags=$('arcMilestones');tags.replaceChildren();
      for(const event of allChoices){
        const item=document.createElement('div');item.className='arc-milestone';
        item.textContent=event.age+'세 · '+event.text;tags.append(item);
      }
      return;
    }

    const a=World4.ensure(life);
    const world=World5.ensure(life);
    const career=World6.ensure(life);
    $('careerChangeCount').textContent=career.history.length+'개 직업 이력';
    $('careerCurrent').textContent=career.profession
      ? career.profession+' · '+(career.active?'활동 중':'은퇴 후 새로운 생활')
      : '배우고 성장하는 중';
    const journey=$('careerJourney');journey.replaceChildren();
    for(const c of career.history.slice(-3)){
      const item=document.createElement('div');item.className='career-chapter';
      const date=document.createElement('b');date.textContent=c.age+'세';
      const job=document.createElement('span');job.textContent=c.job;
      item.append(date,job);journey.append(item);
    }
    const region=World5.groupFor(life.country[0]);
    const category={
      southAsia:'남아시아',eastAsia:'동아시아',southEastAsia:'동남아시아',
      westernEurope:'서유럽',eastEurope:'동유럽',centralAsia:'중앙아시아',
      northAfrica:'북아프리카',westAfrica:'서아프리카',eastAfrica:'동아프리카',
      centralSouthAfrica:'중·남부 아프리카',middleEast:'서아시아·중동',
      latinAmerica:'라틴아메리카',northAmerica:'북아메리카',pacific:'오세아니아',
      other:'다른 지역'};
    $('worldRegionLabel').textContent=category[region]+' · '+(world.faith==='없음'?'다양한 삶':world.faith);
    $('worldEventCount').textContent=world.eventCount+'개 사건';
    $('worldLatest').textContent=world.lastContext||'어떤 세계적 변화와 만남이 찾아올까요?';
    const choiceLog=life.log.filter(e=>['decision','history-choice','era-choice','care13-choice','joseon-choice','joseon2-choice','joseon3-choice','joseon4-choice','joseon5-choice'].includes(e.kind));
    $('arcCount').textContent=choiceLog.length+'번의 선택';
    $('arcStatus').textContent=a.lastEvent || '아직 미래는 정해지지 않았어요.';
    const box=$('arcMilestones');box.replaceChildren();
    for(const d of choiceLog.slice(-3)){
      const pill=document.createElement('div');pill.className='arc-milestone';
      const age=document.createElement('b');age.textContent=d.age+'세';
      const label=document.createElement('span');label.textContent=d.text;
      pill.append(age,label);box.append(pill);
    }
  }
  function captureEnding(life){
    return {seed:life.seed,birthYear:life.birthYear,country:life.country[0],family:life.familyLevel,
      age:life.age,career:life.career,education:life.world?.educationLevel||'',
      qualification:life.world7?.qualification?.join(', ')||'없음',
      netWorth:life.money.netWorth,health:life.stats.health,
      child:!!life.profile.child,partner:!!life.profile.partner,
      housing:life.world8?.housing||'',
      roles:life.world6?.history?.map(x=>x.job)||[],
      choices:life.log.filter(e=>['decision','joseon-choice','joseon2-choice','joseon3-choice','joseon4-choice','joseon5-choice','joseon6-choice'].includes(e.kind)).map(e=>({age:e.age,label:e.text}))};
  }
  function showComparison(){
    const panel=$('endComparison'),rows=$('endComparisonRows');
    const now=captureEnding(life);
    panel.classList.toggle('hidden',!replayBasis || replayBasis.seed!==life.seed);
    rows.replaceChildren();
    if(!replayBasis || replayBasis.seed!==life.seed)return;
    const items=[
      ['출생 시대와 지역',replayBasis.country,now.country],
      ['가정환경',replayBasis.family,now.family],
      ['출생 주거',replayBasis.housing||'미상',now.housing||'미상'],
      ['살아온 기간',replayBasis.age+'세',now.age+'세'],
      ['삶의 방향',replayBasis.career,now.career],
      ['거쳐 온 직업',replayBasis.roles?.join(' → ')||'없음',now.roles?.join(' → ')||'없음'],
      ['교육 경험',replayBasis.education,now.education],
      ['자격 이력',replayBasis.qualification||'없음',now.qualification||'없음'],
      ['최종 순자산',formatCredits(replayBasis.netWorth),formatCredits(now.netWorth)],
      ['가족·관계',replayBasis.child?'아이 돌봄':replayBasis.partner?'동반자':'다양한 관계',
        now.child?'아이 돌봄':now.partner?'동반자':'다양한 관계']
    ];
    for(const [name,before,after] of items){
      const line=document.createElement('div');line.className='counter-row';
      const heading=document.createElement('strong');heading.textContent=name;
      const left=document.createElement('span');left.textContent=String(before);
      const icon=document.createElement('span');icon.textContent='→';icon.setAttribute('aria-hidden','true');
      const right=document.createElement('b');right.textContent=String(after);
      if(before!==after)line.classList.add('changed');
      line.append(heading,left,icon,right);rows.append(line);
    }
    const previousChoices=new Map(replayBasis.choices.map(d=>[d.age,d.label]));
    const nowChoices=new Map(now.choices.map(d=>[d.age,d.label]));
    for(const age of World4.GATES){
      const a=previousChoices.get(age),b=nowChoices.get(age);
      if(!a&&!b)continue;
      const line=document.createElement('div');line.className='counter-row';
      if(a!==b)line.classList.add('changed');
      const title=document.createElement('strong');title.textContent=age+'세 선택';
      const before=document.createElement('span');before.textContent=a||'선택 이전에 삶을 마침';
      const icon=document.createElement('span');icon.textContent='→';
      const after=document.createElement('b');after.textContent=b||'선택 이전에 삶을 마침';
      line.append(title,before,icon,after);rows.append(line);
    }
  }
  function refreshSpeedControls(){
    document.querySelectorAll('[data-life-speed]').forEach(button=>{
      button.setAttribute('aria-pressed',String(Number(button.dataset.lifeSpeed)===playSpeed&&!nextDecision));
    });
    $('v9NextChoice').setAttribute('aria-pressed',String(nextDecision));
  }
  function updatePause() {
    $('pauseBtn').textContent = paused ? '▶ 이어가기' : 'Ⅱ 일시정지';
    $('pauseBtn').disabled = !!life?.pending || !life?.alive;
    $('playStatus').textContent = life?.pending ? '당신의 선택을 기다리는 중'
      : paused ? '일시정지' : '인생이 흘러가는 중';
  }
  function paintTimeline() {
    const timeline = $('timeline');
    const endWasNear = timeline.scrollTop+timeline.clientHeight>=timeline.scrollHeight-38;
    timeline.replaceChildren();
    const recent = life.log.slice(-timelineVisible);
    $('v9ChronicleCount').textContent='누적 기록 '+life.log.length+'개';
    $('v9TimelineMore').hidden=timelineVisible>=life.log.length;
    for (const entry of recent) {
      const li = document.createElement('li');
      if (entry.kind === 'decision') li.className = 'is-decision';
      else if (entry.kind === 'decision-effect') li.className = 'is-choice-effect';
      else if (entry.kind === 'history') li.className = 'is-history';
      else if (['history-choice','history-impact','history-followup','joseon-choice','joseon2-choice','joseon3-choice','joseon4-choice','joseon5-choice','joseon5-memory','joseon5-family','joseon6-choice','joseon6-followup','joseon6-memory','joseon-followup','joseon2-followup','joseon3-followup','joseon4-followup','joseon-memory','joseon2-memory','joseon3-memory','joseon4-memory'].includes(entry.kind)) li.className = 'is-history-choice';
      const age = document.createElement('b');
      age.textContent = entry.age + '세';
      const text = document.createElement('span');
      text.textContent = entry.text;
      li.append(age,text);
      timeline.append(li);
    }
    if(endWasNear || life.age<=3) timeline.scrollTop = timeline.scrollHeight;
  }
  function paintStats() {
    const list = $('statList');
    list.replaceChildren();
    for(const [key,title] of STAT_NAMES) {
      const box=document.createElement('div'); box.className='stat';
      const label=document.createElement('div'); label.className='stat-label';
      const labelName=document.createElement('span'); labelName.textContent=title;
      const value=document.createElement('b'); value.textContent=String(life.stats[key]);
      label.append(labelName,value);
      const track=document.createElement('div'); track.className='stat-track';
      const bar=document.createElement('div'); bar.className='stat-fill';
      bar.style.width=life.stats[key]+'%';
      track.append(bar); box.append(label,track); list.append(box);
    }
  }
  function showDecision() {
    const choice = life.getChoice();
    const reflection = life.getReflection();
    $('decision').classList.toggle('hidden',!choice && !reflection);
    $('waiting').classList.toggle('hidden',!!choice || !!reflection);
    if(reflection) {
      const prompts={5:'지금 가장 좋아하는 것은 무엇인가요?',15:'이 사람은 어떤 어른이 되고 싶었을까요?',30:'어릴 적에 꿈꾼 삶과 지금은 얼마나 다른가요?',50:'이 사람의 삶에서 가장 소중했던 것은 무엇일까요?',70:'지나온 시간을 돌아본다면 어떤 말을 남길까요?'};
      $('choiceTitle').textContent=reflection+'세, 잠시 멈추어 돌아봅니다.';
      $('choiceText').textContent=prompts[reflection];
      const target=$('choiceOptions');target.replaceChildren();
      const note=document.createElement('textarea');note.className='reflection-note';note.rows=2;note.maxLength=140;note.placeholder='생각을 한 줄로 남겨도 좋습니다 (선택 사항).';
      note.setAttribute('aria-label','이 사람의 삶을 돌아보는 한 줄');
      const btn=document.createElement('button');btn.type='button';btn.className='reflection-next';btn.textContent='계속 살아가기 →';
      btn.addEventListener('click',()=>{life.reflect(note.value);save();elapsed=0;lastTick=performance.now();render();});
      target.append(note,btn);
      return;
    }
    if (!choice) return;
    $('choiceTitle').textContent=choice.title;
    $('choiceText').textContent=choice.description;
    const target=$('choiceOptions'); target.replaceChildren();
    choice.options.forEach((opt,index)=>{
      const btn=document.createElement('button'); btn.type='button'; btn.className='choice-option';
      const wrap=document.createElement('span');
      const title=document.createElement('strong'); title.textContent=opt.label;
      const note=document.createElement('small'); note.textContent=opt.note;
      const arrow=document.createElement('i'); arrow.textContent='↗'; arrow.setAttribute('aria-hidden','true');
      wrap.append(title,note); btn.append(wrap,arrow);
      btn.addEventListener('click',()=>{
        const before={stats:{...life.stats},netWorth:life.money?.netWorth,career:life.career};
        if(!life?.choose(index)) return;
        if(!life.alive){finish();return;}
        const labels={health:'건강',happiness:'행복',knowledge:'배움',bonds:'인연',wealth:'살림'};
        const changes=Object.entries(labels).flatMap(([key,label])=>{
          const delta=(life.stats?.[key]||0)-(before.stats?.[key]||0);
          return delta?[label+' '+(delta>0?'+':'')+delta]:[];
        });
        const moneyDelta=(life.money?.netWorth??before.netWorth)-(before.netWorth??life.money?.netWorth??0);
        if(moneyDelta)changes.push('살림 '+(moneyDelta>0?'+':'')+formatCredits(moneyDelta));
        if(life.career!==before.career)changes.push('진로 '+life.career);
        const effectText=changes.length?'이후 달라진 점 · '+changes.join(' · '):'당장은 눈에 띄는 변화가 없었다.';
        life.logEvent(effectText,'decision-effect');
        save(); elapsed=0; lastTick=performance.now(); render();
      });
      target.append(btn);
    });
    $('decision').scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function peerView(peer){
    return {age:peer.age,alive:peer.alive,name:peer.profile?.name||'이름 없는 이웃',
      country:peer.country[0],flag:peer.country[1],career:peer.world6?.profession||peer.career,
      school:peer.world?.educationLevel||'배움을 시작하는 중',
      history:peer.log?.filter(e=>['decision','world','profession','family'].includes(e.kind)).slice(-1)[0]?.text||'자신만의 하루를 살아가는 중'};
  }
  function paintPeers(force=false) {
    if(!life)return;
    if(!force && (life.age===lastPeerRenderedAge || (storyTab!=='peers' && life.age%4!==0 && life.age!==0 && !life.pending)))return;
    lastPeerRenderedAge=life.age;
    if(!peerCache||peerCache.seed!==life.seed){
      peerCache={seed:life.seed,people:Array.from({length:4},(_,i)=>{
        const peer=new Sim.Life((life.seed+Math.imul(i+1,2654435761))>>>0,{birthYear:life.birthYear,countryName:'대한민국'});
        World8.ensure(peer);if(Joseon.isJoseon(peer))Joseon.ensure(peer);else World8.moment(peer);History.contextualize(peer);
        return {life:peer,samples:[peerView(peer)]};
      })};
    }
    const board=$('peers');board.replaceChildren();
    for(const record of peerCache.people){
      const peer=record.life;let guard=0;
      while(peer.alive && peer.age<life.age && guard++<150){
        if(peer.pending){
          const decision=peer.getChoice();
          if(decision)peer.choose(Math.floor(peer.rand()*decision.options.length));
          else if(peer.getReflection())peer.reflect();
          else break;
        }else{
          peer.tick();History.contextualize(peer);
          if(peer.age===10||peer.age===20||peer.age===40||peer.age===60||!peer.alive)record.samples.push(peerView(peer));
        }
      }
      const target=peerAgeChoice?Math.min(peerAgeChoice,life.age):life.age;
      const sample=peerAgeChoice
        ? (record.samples.filter(x=>x.age<=target).at(-1)||record.samples[0])
        :peerView(peer);
      const card=document.createElement('div');card.className='peer';
      const flag=document.createElement('span');flag.className='peer-flag';flag.textContent=sample.flag;
      const name=document.createElement('b');name.textContent=sample.name;
      const label=document.createElement('small');label.textContent=sample.country+' · '+sample.age+'세 · '+
        (sample.alive?sample.career||'성장 중':'삶을 마침');
      const detail=document.createElement('small');detail.textContent=sample.history;
      card.append(flag,name,label,detail);board.append(card);
    }
    document.querySelectorAll('[data-peer-age]').forEach(button=>{
      const age=Number(button.dataset.peerAge);
      button.disabled=age>life.age;
      button.setAttribute('aria-pressed',String(age===peerAgeChoice));
    });
  }
  function paintAgeMap(force=false) {
    const board=$('ageMap');
    if(!board||!life || (!force && life.age===lastMapRenderedAge))return;
    lastMapRenderedAge=life.age;
    board.replaceChildren();
    const notable=['decision','reflection','family','profession','world','safety','death','history','history-choice','history-impact','history-followup','era-choice','era-followup','care13-choice','care13-followup','care13-memory','joseon-choice','joseon2-choice','joseon3-choice','joseon4-choice','joseon-memory','joseon2-memory','joseon3-memory','joseon4-memory','joseon4-family','joseon-family','joseon6-choice','joseon6-followup','joseon6-memory','joseon-followup','joseon2-followup','joseon3-followup','joseon4-followup'];
    const entries=new Map();
    for(const entry of life.log){
      if(!notable.includes(entry.kind))continue;
      const sameYear=entries.get(entry.age)||[];
      sameYear.push(entry);
      entries.set(entry.age,sameYear);
    }
    for(let year=0;year<108;year++){
      const cell=document.createElement('button');cell.type='button';cell.className='age-cell';
      if(year<=life.age)cell.classList.add(year<7?'child':year<19?'teen':year<35?'young':year<65?'adult':'elder');
      if(year===life.age)cell.classList.add('now');
      const events=entries.get(year)||[];
      if(events.length)cell.classList.add(events.some(entry=>['decision','reflection'].includes(entry.kind))?'landmark':'important');
      const future=year>life.age;
      cell.disabled=future;
      cell.title=(life.birthYear+year)+'년 · '+year+'세'+(future?' · 아직 살아보지 않은 시간':events.length?' · '+events.length+'가지 기록':'');
      cell.setAttribute('aria-label',cell.title);
      if(!future)cell.addEventListener('click',()=>{
        $('yearDetail').textContent=year+'세 · '+(events.length?events.map(x=>'• '+x.text).join('\n'):'특별한 기록이 없는 해. 평범한 하루들도 이 인생을 이루었어요.');
        $('yearDetail').style.whiteSpace='pre-line';
      });
      board.append(cell);
    }
  }
  function paintSurvival() {
    if(!life)return;
    if(Joseon.isJoseon(life)){
      $('survivalChart').classList.add('hidden');
      $('survivalActual').setAttribute('d','');$('survivalOther').setAttribute('d','');
      $('survivalSummary').textContent='이 사람의 시대에 해당하는 개인별 생존 기록은 확인할 수 없다.';
      $('v8CountryStats').textContent='조선의 삶과 사망 시기는 게임의 이야기 규칙으로 전개된다. 현대 세계은행의 생존 통계를 적용하지 않는다.';
      return;
    }
    $('survivalChart').classList.remove('hidden');
    const world=['게임 세계 기준','',0,.55,.69];
    const point=(country,gender,a)=>{
      const x=38+3.1*a,y=12+131*(1-World8.survival(country,gender,a,life.birthYear));
      return [x.toFixed(1),y.toFixed(1)];
    };
    const draw=(country,gender)=>Array.from({length:51},(_,i)=>{
      const p=point(country,gender,i*2);
      return (i?'L':'M')+p.join(' ');
    }).join(' ');
    $('survivalActual').setAttribute('d',draw(life.country,life.gender));
    $('survivalOther').setAttribute('d',draw(world,'남자'));
    const m=point(life.country,life.gender,Math.min(life.age,100));
    $('survivalDot').setAttribute('cx',m[0]);$('survivalDot').setAttribute('cy',m[1]);
    const mod=World8.mortality(life.country,life.gender,life.birthYear);
    $('survivalSummary').textContent=life.country[0]+' · '+life.gender+
      ' · 출생부터 5세까지 생존 '+Math.round(World8.survival(life.country,life.gender,5,life.birthYear)*1000)/10+
      '%, '+life.age+'세까지 생존 '+Math.round(World8.survival(life.country,life.gender,life.age,life.birthYear)*1000)/10+
      '% · 참고용 생존 곡선';
    $('v8CountryStats').textContent=
      metricLabel('under5Mortality','5세 이전 사망 추정치','‰')+' · '+
      metricLabel('lifeExpectancy','출생 시 평균 기대수명','세')+
      ' · 학교 접근 가능성 '+Math.round(life.world.schoolChance*100)+
      '% · 사는 집 '+World8.ensure(life).housing;
  }
  function renderStoryPanel(){
    const active=!!storyTab;
    $('storyTools').classList.toggle('hidden',!active);
    document.querySelectorAll('[data-story-tab]').forEach(button=>
      button.setAttribute('aria-pressed',String(button.dataset.storyTab===storyTab)));
    for(const [name,id] of [['birth','storyBirth'],['years','storyYears'],['stats','storyStats'],['peers','storyPeers']])
      $(id).classList.toggle('hidden',name!==storyTab);
    if(!life||!active)return;
    if(storyTab==='birth'){
      if(Joseon.isJoseon(life)){
        const home=Joseon.summary(life),family=Joseon4.summary(life);
        $('storyBirthText').textContent=life.birthYear+'년, '+home.region+'의 '+(Joseon5?.summary(life)?.originLabel||Joseon.ensure(life).birthStatus+' 집안')+'에서 태어났다. '+
          family.people.filter(x=>x.role==='mother'||x.role==='father').map(x=>x.name+'('+Joseon4.ROLES[x.role]+')').join(', ')+'이 곁에 있었다.';
        $('storyBirthNote').textContent=oldPlace(life)+' '+oldFarm(life);
        return;
      }
      $('storyBirthText').textContent=History.period(life)+' · '+life.birthYear+'년 출생. '+World8.synopsis(life)+'. '+World8.ensure(life).familyNote+'.';
      $('storyBirthNote').textContent=World8.ensure(life).climate+' · '+
        World8.ensure(life).accent+' · '+life.profile.city+'에서 시작된 삶.';
    }
    if(storyTab==='stats')paintSurvival();
    if(storyTab==='years')paintAgeMap();
    if(storyTab==='peers')paintPeers();
  }
  function render() {
    if (!life) return;
    paintLifeRecord();
    paintArc();
    $('placeFlag').textContent=life.country[0]==='대한민국'&&life.year<1945?'📜':life.country[1];
    $('placeName').textContent=History.place(life);
    $('currentYear').textContent=life.year+'년';
    $('historyContext').textContent=Joseon.inOldEra(life)?Joseon2.summary(life).ruler+' 재위 · '+Joseon.era(life.year)+' · '+life.year+'년':life.birthYear===2026
      ? '2026년, 새로운 인생이 시작됐다.'
      : History.period(life)+' · '+life.year+'년의 세상';
    const archive=(Joseon.inOldEra(life)?(Joseon.eventFor(life.year)||Joseon2.at(life.year)):null)||World10.readCurrent(life)||History.currentEvent(life),sourceLink=$('historySourceLink');
    sourceLink.classList.toggle('hidden',!archive);
    if(archive){sourceLink.href=archive.source;sourceLink.textContent=archive.year+'년 '+archive.title+' · 역사 자료';}
    $('currentAge').textContent=String(life.age);
    $('lifeStage').textContent=Sim.stages(life.age);
    $('chapterNumber').textContent=String(Math.floor(life.age/10)+1).padStart(2,'0');
    $('traitCountry').textContent=History.place(life)+' · '+life.gender;
    $('traitFamily').textContent=life.familyLevel;
    $('traitCareer').textContent=life.career;
    $('storyTitle').textContent=life.getChoice()?.title || (Joseon.isJoseon(life)?(life.age<7?'집안의 첫 기억':life.age<20?'배워야 할 일들':life.age<40?'고을에서 살아가는 날들':life.age<65?'살림과 사람 사이에서':'지나온 계절들'):(life.age<6?'인생의 첫 장면':life.age<20?'세상을 배우는 날들':life.age<40?'나만의 길을 찾아서':life.age<65?'살아온 시간의 무게':'오늘이라는 선물'));
    const current = life.log[life.log.length-1];
    $('storyCaption').textContent=life.getChoice()
      ? '이번에는 어떻게 할까?'
      : current?.text || '올해도 하루하루가 흘러간다.';
    $('lifeProgress').style.width=Math.min(100,life.age/105*100)+'%';
    paintTimeline();
    paintStats();
    paintPeers();
    if(storyTab==='years')paintAgeMap();
    if(storyTab==='stats')paintSurvival();
    document.querySelectorAll('[data-focus]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.focus===life.focus)));
    showDecision();
    updatePause();
  }
  function startLife(fromSave=false) {
    if (!life) return;
    if(!fromSave) safeRemove(SAVE_KEY);
    paused=false; elapsed=0; lastTick=performance.now();
    show('play');
    render();renderStoryPanel();
    sdk?.start?.({mode:'one-life',country:life.country[0]});
    save();
  }
  function rememberLife() {
    const previous=safeGet(RECORD_KEY);
    const history=Array.isArray(previous)?previous.filter(x=>x&&Number.isInteger(x.age)):[];
    history.unshift({at:Date.now(),country:life.country[0],birthYear:life.birthYear,age:life.age,career:life.career});
    safeSet(RECORD_KEY,history.slice(0,20));
    return history.length;
  }
  function finish() {
    if(completed || !life || life.alive) return;
    completed=true;
    safeRemove(SAVE_KEY);
    const summary=life.summary();
    const choiceLog=life.log.filter(e=>['decision','history-choice','era-choice','care13-choice','joseon-choice','joseon2-choice','joseon3-choice','joseon4-choice','joseon5-choice','joseon6-choice'].includes(e.kind));
    const careLife=World13.summary(life);
    const oldLife=Joseon.isJoseon(life)?Joseon.summary(life):null;
    const oldSocial=oldLife&&Joseon5?.summary(life);
    const oldJobs=oldLife&&Joseon6?.summary(life);
    const count=rememberLife();
    $('endYears').textContent=life.birthYear+' — '+life.year;
    $('endCountry').textContent=(life.country[0]==='대한민국'&&life.year<1945?'📜':life.country[1])+' '+History.place({...life,year:life.birthYear})+' · '+life.profile.name+' ('+life.profile.city+')';
    $('endNetWorth').textContent=formatCredits(life.money.netWorth);
    $('endAge').textContent=summary.age+'년';
    $('endCareer').textContent=oldJobs?.primary?.name||life.career;
    const firstPlace=History.place({...life,year:life.birthYear});
    const chapters=[
      life.birthYear+'년, '+firstPlace+'에서 태어났다.',
      oldLife?'태어날 때는 '+(oldSocial?.originLabel||Joseon.ensure(life).birthStatus+' 집안')+'에서 자랐다. '+oldLife.region+'에서 '+oldLife.occupation+' 일을 하며 세월을 보냈다.':summary.story,
      oldSocial&&oldSocial.obligations.length?'사는 동안 '+oldSocial.obligations.slice(-2).join(', ')+' 같은 부담과 의무도 겪었다.':'',
      oldSocial&&oldSocial.memories.length?'살면서 남은 일에는 '+oldSocial.memories.slice(-2).join(' ') :'',
      oldJobs?.primary?'오랫동안 '+oldJobs.primary.name+'으로 일하며 '+oldJobs.primary.supply+', '+oldJobs.primary.people+'을 돌보았다. 가르침과 기술을 잇는 관계도 '+oldJobs.primary.contacts.length+'명 남았다.':'',
      oldJobs?.secondary?'틈틈이 '+oldJobs.secondary.name+'의 일도 함께 했다.':'',
      oldJobs?.primary?.stories?.length?'기억에 남는 생업의 일은 '+oldJobs.primary.stories.slice(-2).join(' ') :'',
      oldLife&&oldLife.warMemory.length?'삶에 영향을 준 사건은 '+oldLife.warMemory.join(', ')+'이었다.':'',
      oldLife&&Joseon4.summary(life).spouse?'혼인하여 '+Joseon4.particle(Joseon4.summary(life).spouse.name,'과','와')+' 삶을 함께한 시절이 있었다.':'',
      oldLife&&Joseon2.summary(life).events?'살아가는 동안 '+Joseon2.summary(life).events+'가지 지역·시대 변화도 지나갔다.':'',
      oldLife&&Joseon3.summary(life).legacy?'마지막에는 '+Joseon3.summary(life).legacy+'의 시간을 보냈다.':'',
      oldLife&&Joseon4.summary(life).memories.length?'가족과 함께한 기억으로 '+Joseon4.summary(life).memories.slice(-2).join(' ') :'',
      oldLife?(life.year>=1900?'조선에서 살던 시절에는 ':'')+
        '경작한 땅 '+oldLife.economy.workedLand+'몫 중 자신의 땅 '+oldLife.economy.ownedLand+'몫, 빌려 가꾼 땅 '+oldLife.economy.leasedLand+'몫이었다. '+
        (oldLife.economy.debt?'살림이 어려워 갚지 못한 빚 '+oldLife.economy.debt+'몫도 있었다.':'많이 모으지 못했어도 그해의 살림을 이어 갔다.'):'',
      oldLife&&life.stats.bonds>=65?'돈의 많고 적음과 관계없이 곁을 지킨 사람과 함께한 시간이 있었다.':'',
      life.deathReason,
      !oldLife&&life.world?.educationLevel&&life.world.educationLevel!=='없음'
        ?'살면서 '+life.world.educationLevel+'의 시간을 보냈다.':'',
      life.career&&life.career!=='학생'?'마지막으로 기억되는 일은 '+life.career+'이었다.':'',
      !oldLife&&careLife.careYears?'가족을 돌보며 보낸 시간도 '+careLife.careYears+'년이었다.':'',
      !oldLife&&careLife.memories.length?'마지막까지 떠오른 기억은 '+careLife.memories.slice(-2).join(', ')+'였다.':''
    ].filter(Boolean);
    $('endStory').textContent=chapters.join(' ');
    const endChoices=$('endChoices');endChoices.replaceChildren();
    choiceLog.slice(-60).forEach(e=>{
      const item=document.createElement('li');item.className='end-choice-item';
      const age=document.createElement('b');age.textContent=e.age+'세';
      const text=document.createElement('span');text.textContent=e.text;
      const copy=document.createElement('div');copy.append(text);
      const effect=life.log.find(x=>x.kind==='decision-effect'&&x.age===e.age);
      const detail=document.createElement('small');detail.textContent=effect?.text||'그때는 무엇이 달라질지 몰랐다.';
      if(e.kind==='decision')copy.append(detail);
      else if(['history-choice','era-choice','care13-choice','joseon-choice','joseon2-choice','joseon3-choice','joseon4-choice','joseon5-choice','joseon6-choice'].includes(e.kind)){
        const aftermath={'history-choice':'history-followup','era-choice':'era-followup','care13-choice':'care13-followup',
          'joseon-choice':'joseon-followup','joseon2-choice':'joseon2-followup',
          'joseon3-choice':'joseon3-followup','joseon4-choice':'joseon4-followup','joseon5-choice':'joseon5-followup','joseon6-choice':'joseon6-followup'}[e.kind];
        // Only an explicitly linked outcome belongs to this choice. Older saves without
        // cause identifiers show no follow-up rather than a misleading one.
        const after=e.causeId?life.log.find(x=>x.kind===aftermath&&x.causeId===e.causeId):null;
        if(after){detail.textContent='그 뒤 '+after.age+'세 · '+after.text;copy.append(detail);}
      }
      item.append(age,copy);endChoices.append(item);
    });
    showComparison();
    const list=$('endHighlights'); list.replaceChildren();
    const highlights=[...life.log.filter(e=>['joseon4-family','joseon-family','milestone','decision','chain','world','safety','profession','history-choice','history-followup','era-choice','era-followup','care13-choice','care13-followup','care13-memory','joseon-choice','joseon2-choice','joseon3-choice','joseon4-choice','joseon-followup','joseon2-followup','joseon3-followup','joseon4-followup','joseon-memory','joseon2-memory','joseon3-memory','joseon4-memory','joseon5-choice','joseon5-followup','joseon5-memory','joseon6-choice','joseon6-followup','joseon6-memory'].includes(e.kind))]
      .filter(e=>['decision','chain','world','safety','profession','history-choice','history-followup','care13-choice','care13-followup','joseon-choice','joseon-followup','joseon-memory','joseon2-choice','joseon2-followup','joseon2-memory','joseon3-choice','joseon3-followup','joseon3-memory','joseon4-choice','joseon4-followup','joseon4-memory','joseon4-family','joseon5-choice','joseon5-memory','joseon5-family','joseon6-choice','joseon6-followup','joseon6-memory','joseon-family'].includes(e.kind)||e.age<21)
      .slice(-16);
    if(!highlights.length) highlights.push(life.log[0]);
    highlights.forEach(e=>{
      const item=document.createElement('li');
      const age=document.createElement('b');age.textContent=e.age+'세';
      const description=document.createElement('span');description.textContent=e.text;
      item.append(age,description);list.append(item);
    });
    $('livesCount').textContent='지금까지 체험한 인생 '+count+'개';
    show('end');
    sdk?.result?.({scope:'run',status:'completed',outcome:'clear',age:life.age,country:summary.country});
  }
  function stepYear() {
    if(!life || !life.alive || life.pending) return;
    life.tick();
    History.contextualize(life);
    if(!life.alive) return finish();
    if(nextDecision&&life.pending){nextDecision=false;playSpeed=1;refreshSpeedControls();}
    render();
    // Each year may have several linked events: save complete year boundaries.
    save();
  }
  function loop() {
    const now=performance.now();
    const delta=Math.max(0,Math.min(260,now-lastTick));
    lastTick=now;
    if(stage!=='play' || !life || !life.alive || life.pending || paused || document.hidden) return;
    elapsed+=delta*playSpeed;
    let count=0;
    const yearMs=YEAR_MS;
    while(elapsed>=yearMs && count++<5) {
      elapsed-=yearMs;
      stepYear();
      if(stage!=='play' || life.pending || !life.alive) {elapsed=0;break;}
    }
  }
  function togglePause() {
    if(stage!=='play'||!life?.alive||life.pending) return;
    paused=!paused; lastTick=performance.now(); updatePause();
    if(paused) save();
  }
  function openRules() { ruleWasRunning = stage==='play' && !paused && life?.alive && !life?.pending; if(ruleWasRunning){ paused=true; updatePause(); save(); } $('rules').classList.remove('hidden'); $('rulesClose').focus(); }
  function closeRules() { $('rules').classList.add('hidden'); if(ruleWasRunning && !document.hidden){paused=false;lastTick=performance.now();updatePause();} ruleWasRunning=false; $('rulesBtn').focus(); }
  $('rulesBtn').addEventListener('click',openRules);
  $('rulesClose').addEventListener('click',closeRules);
  $('rulesOkay').addEventListener('click',closeRules);
  document.querySelector('[data-close="rules"]').addEventListener('click',closeRules);
  document.querySelectorAll('[data-era-year]').forEach(btn=>btn.addEventListener('click',()=>{
    $('birthYearInput').value=btn.dataset.eraYear;
    document.querySelectorAll('[data-era-year]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
  }));
  document.querySelectorAll('[data-life-speed]').forEach(button=>button.addEventListener('click',()=>{
    const n=Number(button.dataset.lifeSpeed);
    if(![1,2,4,8].includes(n))return;
    playSpeed=n;nextDecision=false;refreshSpeedControls();
  }));
  $('v9NextChoice').addEventListener('click',()=>{
    if(!life?.alive||life.pending||stage!=='play')return;
    playSpeed=8;nextDecision=true;
    if(paused){paused=false;updatePause();}
    refreshSpeedControls();
  });
  $('v9TimelineMore').addEventListener('click',()=>{timelineVisible=Math.min(760,timelineVisible+60);paintTimeline();});
  $('drawBtn').addEventListener('click',draw);
  $('lifeStartBtn').addEventListener('click',()=>startLife());
  $('againBtn').addEventListener('click',()=>{replayBasis=null;life=null;show('intro');refreshResume();draw();});
  $('sameBirthBtn').addEventListener('click',()=>{
    if(!life||life.alive)return;
    const snapshot=captureEnding(life);
    replayBasis=snapshot;
    life=new Sim.Life(snapshot.seed,{birthYear:snapshot.birthYear,countryName:'대한민국'});
    World8.ensure(life);if(Joseon.isJoseon(life))Joseon.ensure(life);else {World8.moment(life);World10.ensure(life);}History.contextualize(life);
    storyTab='';peerAgeChoice=0;timelineVisible=22;playSpeed=1;nextDecision=false;refreshSpeedControls();
    peerCache=null;lastPeerRenderedAge=-1;lastMapRenderedAge=-1;
    $('birthCertificate').classList.add('hidden');
    $('birthFlag').textContent=Joseon.isJoseon(life)?'生':life.country[0]==='대한민국'&&life.year<1945?'📜':life.country[1];
    $('birthCountry').textContent=History.place(life);
    $('birthDetail').textContent=life.gender+' · '+life.familyLevel+' · '+life.birthYear+'년 출생';
    document.querySelector('.birth-heading').textContent=Joseon.isJoseon(life)?'조선의 어느 집, 한 아이가 태어납니다.':'당신은 어디에서 태어날까요?';
    $('lifeStartBtn').classList.remove('hidden');
    paintCertificate();
    completed=false;paused=false;elapsed=0;
    show('birth');
  });
  $('resumeBtn').addEventListener('click',()=>{
    const restored=currentSave();
    if(!restored || !restored.alive){refreshResume();return;}
    life=restored;timelineVisible=22;playSpeed=1;nextDecision=false;refreshSpeedControls();World9.ensure(life);World8.ensure(life);replayBasis=safeGet(SAVE_KEY)?.replayBasis||null;completed=false;peerCache=null;lastPeerRenderedAge=-1;lastMapRenderedAge=-1;startLife(true);
  });
  $('pauseBtn').addEventListener('click',togglePause);
  document.querySelectorAll('[data-story-tab]').forEach(button=>button.addEventListener('click',()=>{
    storyTab=storyTab===button.dataset.storyTab?'':button.dataset.storyTab;
    lastMapRenderedAge=-1;lastPeerRenderedAge=-1;renderStoryPanel();
  }));
  document.querySelectorAll('[data-peer-age]').forEach(button=>button.addEventListener('click',()=>{
    const age=Number(button.dataset.peerAge);
    if(!life||age>life.age)return;
    peerAgeChoice=age;lastPeerRenderedAge=-1;paintPeers(true);
  }));
  document.querySelectorAll('[data-focus]').forEach(button=>button.addEventListener('click',()=>{
    if(stage!=='play'||!life?.setFocus(button.dataset.focus))return;
    save();render();
  }));
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape' && !$('rules').classList.contains('hidden')) closeRules();
    else if(e.code==='Space' && stage==='play' && $('rules').classList.contains('hidden') && !life?.pending){
      if(e.target===document.body){e.preventDefault();togglePause();}
    }
  });
  document.addEventListener('visibilitychange',()=>{
    lastTick=performance.now();
    if(document.hidden && stage==='play'){paused=true;updatePause();save();}
  });
  window.addEventListener('pagehide',save);
  sdk?.registerPauseHandlers?.({pause:()=>{paused=true;updatePause();save();},resume:()=>{if(life?.pending)return;paused=false;lastTick=performance.now();updatePause();}});
  const heartbeat=setInterval(loop,90);
  sdk?.registerCleanup?.(()=>{save();clearInterval(heartbeat);if(roulette)clearInterval(roulette);});
  refreshResume();show('intro');
})();
