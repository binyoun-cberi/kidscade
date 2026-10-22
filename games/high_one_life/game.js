/* 단 하나의 인생: 출생 추첨, 자동 시간, 선택, 기록 화면 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const Sim = window.OneLifeSim;
  const UIFlow=window.OneLifeUIFlow;
  if(!UIFlow)throw new Error('One Life UI helpers missing');
  const Goryeo=window.OneLifeGoryeo343||{is:()=>false};
  const Identity=window.OneLifeIdentity20;
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
  const Joseon7 = window.OneLifeJoseon7 || null;
  const Joseon8 = window.OneLifeJoseon8 || null;
  const Joseon9 = window.OneLifeJoseon9 || null;
  const Annals = window.OneLifeJoseonAnnals || null;
  const Joseon11 = window.OneLifeJoseon11 || null;
  const Joseon12 = window.OneLifeJoseon12 || null;
  const Joseon13 = window.OneLifeJoseon13 || null;
  const Joseon14 = window.OneLifeJoseon14 || null;
  const Joseon18 = window.OneLifeJoseon18 || null;
  const Joseon19 = window.OneLifeJoseon19 || null;
  const Genealogy = window.OneLifeGenealogyV15 || null;
  const BranchSwitch = window.OneLifeBranchSwitchV17 || null;
  const ColonialLife = window.OneLifeColonialDaily || null;
  const Travel22 = window.OneLifeTravel22 || null;
  const Life30 = window.OneLifeConsequences30 || null;
  const Joseon325 = window.OneLifeJoseon325 || null;
  const JoseonWomen326 = window.OneLifeJoseonWomen326 || null;
  const JoseonWomen327 = window.OneLifeJoseonWomen327 || null;
  const History = window.OneLifeHistory;
  const Calendar=window.OneLifeCalendar337;
  const HistoryLife=window.OneLifeHistoryLife338;
  const Diaspora=window.OneLifeDiaspora340;
  const Collaboration=window.OneLifeCollaboration341;
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
  const YEAR_MS = 4000;
  const STAT_NAMES = [['health','건강'],['happiness','행복'],['knowledge','배움'],['bonds','인연'],['wealth','경제']];
  const views = ['intro','birth','play','end'];
  let life = null, paused = false, stage = 'intro';
  let lastTick = performance.now(), elapsed = 0, roulette = null, screenTime = 0;
  let completed = false, ruleWasRunning = false, replayBasis = null;
  let peerCache = null, lastPeerRenderedAge = -1, lastMapRenderedAge = -1;
  let storyTab='', peerAgeChoice=0, timelineVisible=22, playSpeed=1, nextDecision=false;
  let autoChoiceMode=false,lastAutoChoiceAt=0;
  let lastDecisionKey=null;
  let namingChild=null,wasPausedBeforeNaming=false;
  function updateBirthChoices(){
    const year=Number($('birthYearInput').value);
    const historical=Number.isInteger(year)&&year<1894;
    const originGroup=$('birthOriginGroup'),familyGroup=$('birthFamilyGroup'),select=$('birthOriginInput');
    const previous=select.value;
    const birthCountry=$('birthCountryInput'),previousCountry=birthCountry.value;
    $('birthCountryGroup').classList.toggle('hidden',year<1900);
    birthCountry.replaceChildren();
    const allOption=document.createElement('option');allOption.value='';allOption.textContent='세상 어디든';birthCountry.append(allOption);
    if(year>=1900)for(const country of Sim.COUNTRIES){
      const option=document.createElement('option');
      option.value=country[0];option.textContent=country[1]+' '+country[0];birthCountry.append(option);
    }
    birthCountry.value=year>=1900&&Sim.COUNTRIES.some(c=>c[0]===previousCountry)?previousCountry:'';
    originGroup.classList.toggle('hidden',!historical);
    familyGroup.classList.toggle('hidden',historical);
    select.replaceChildren();
    const add=(value,label)=>{const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);};
    add('','우연에 맡기기');
    if(historical){
      for(const origin of (year<1392?Identity.GORYEO_ORIGINS:Identity.SOCIAL_CHOICES)){
        if(Identity.validOrigin(year,origin))add(origin,origin);
      }
    }
    select.value=historical&&Identity.validOrigin(year,previous)?previous:'';
    $('birthIdentityHelp').textContent=historical
      ? (year<1392?'고려 후기의 관료·향리·농민·장인·사공·특수 행정구역 주민·노비 가구를 고릅니다.':year<1886?'왕실 종친·양반·중인·상민·노비·백정 등 집안의 출발점을 정합니다.':'이 시기에는 세습 노비 신분으로 태어나는 선택은 할 수 없습니다.')
      :'1894년 이후 법적 신분 대신 집안의 경제적 형편을 정합니다.';
    $('birthIdentityError').classList.add('hidden');
  }
  function newbornCandidate(){
    return Identity?.newborn(life,
      Joseon.isJoseon(life)?Joseon4.ensure(life).people:null,
      !Joseon.isJoseon(life)?World9.ensure(life).people:null)||null;
  }
  function offerNewbornName(){
    if(Goryeo.is(life)||stage!=='play'||!life?.alive||namingChild)return false;
    const found=newbornCandidate();if(!found)return false;
    // In auto mode, use the family's existing suggested name instead of
    // interrupting a hands-free playthrough with a naming dialog.
    if(autoChoiceMode){
      const surname=found.historical?Joseon8?.ensure(life)?.surname||'':'';
      if(Identity.rename(life,found,'',surname)){
        if(found.historical)Genealogy?.sync?.(life);
        save();return false;
      }
    }
    namingChild=found;wasPausedBeforeNaming=paused;paused=true;updatePause();
    $('newbornDescription').textContent=found.historical
      ?life.year+'년, 집안에 '+(found.child.sex==='여자'?'딸':'아들')+'이 태어났다. 어떤 이름으로 불러 줄까?'
      :life.year+'년, 아이가 가족의 품에 안겼다. 어떤 이름을 지어 줄까?';
    const surname=found.historical?Joseon8?.ensure(life)?.surname||'':'';
    $('newbornNameHint').textContent=found.historical
      ?'이름만 적으면 집안의 성씨 '+surname+'가 앞에 붙습니다. 성과 이름을 모두 적어도 됩니다. 기본 이름: '+found.child.name
      :'이름은 가족의 기억에 오래 남습니다. 기본 이름: '+found.child.name;
    $('newbornNameInput').value='';$('newbornNameInput').placeholder=found.child.name;
    $('newbornNameError').classList.add('hidden');
    $('newbornModal').classList.remove('hidden');
    $('newbornNameInput').focus();
    save();return true;
  }
  function finishNewbornName(automatic){
    if(!namingChild||!life)return;
    const name=$('newbornNameInput').value.trim();
    if(!automatic&&(!name||!Identity.cleanName(name))){
      $('newbornNameError').textContent='한글 또는 영문으로 이름을 적어 주세요.';
      $('newbornNameError').classList.remove('hidden');return;
    }
    const surname=namingChild.historical?Joseon8?.ensure(life)?.surname||'':'';
    if(!Identity.rename(life,namingChild,automatic?'':name,surname))return;
    if(namingChild.historical)Genealogy?.sync?.(life);
    namingChild=null;
    $('newbornModal').classList.add('hidden');
    paused=wasPausedBeforeNaming;lastTick=performance.now();
    updatePause();render();save();
  }
  const sdk = window.KidscadeGame || null;
  const show = name => {
    stage = name;
    document.body.classList.toggle('goryeo-book',name==='play'&&Goryeo.is(life));
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
  // 1결 = 100부. 원본 s.land 값은 면적이 아닌 추상 자원이므로
  // 통계로 오해되는 원래의 추상 수치을 직접 1결로 치환하지 않는다.
  // 본 작품의 가구별 경작 규모를 위해 전답을 10부 단위로 별도 표시한다.
  function landAmount(units){
    const bu=Math.max(0,Math.round((Number(units)||0)*10));
    if(!bu)return '없음';
    const gyeol=(bu/100).toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
    return gyeol+'결';
  }
  function oldLandLedger(life){
    const j=Joseon.summary(life),e=j.economy;
    if(!e.workedLand)return '일구는 전답 없음';
    const pieces=['일구는 전답 '+landAmount(e.workedLand)];
    if(e.ownedLand)pieces.push('집안 소유 '+landAmount(e.ownedLand));
    if(e.leasedLand)pieces.push('빌린 전답 '+landAmount(e.leasedLand));
    return pieces.join(' · ');
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
    return restored||null;
  }
  function refreshResume() {
    const resume = currentSave();
    $('resumeBtn').classList.toggle('hidden', !resume || !resume.alive);
  }
  function save() {
    if (stage === 'play' && life?.alive) safeSet(SAVE_KEY, {life:life.snapshot(),replayBasis,autoChoiceMode,at:Date.now()});
  }
  function draw() {
    clearInterval(roulette);
    roulette = null;
    playSpeed=1;nextDecision=false;autoChoiceMode=false;lastDecisionKey=null;refreshSpeedControls();
    const desired=Number($('birthYearInput').value);
    const birthYear=Number.isInteger(desired)&&desired>=1200&&desired<=2026?desired:2026;
    $('birthYearInput').value=String(birthYear);
    updateBirthChoices();
    const chosenName=$('birthNameInput').value.trim();
    if(chosenName&&!Identity.cleanName(chosenName)){
      $('birthIdentityError').textContent='이름은 한글 또는 영문으로 20자 이내로 적어 주세요.';
      $('birthIdentityError').classList.remove('hidden');$('birthNameInput').focus();return;
    }
    const countryName=birthYear<1900?'대한민국':$('birthCountryInput').value||undefined;
    const birthSetup={name:chosenName,gender:$('birthGenderInput').value,
      origin:$('birthOriginInput').value,familyLevel:$('birthFamilyInput').value};
    life = new Sim.Life(undefined,{birthYear,countryName,birthSetup});
    World8.ensure(life);if(Goryeo.is(life))Goryeo.ensure(life);else if(Joseon.isJoseon(life)){Joseon.ensure(life);Joseon8?.ensure(life);Joseon9?.ensure(life);}
    else {World8.moment(life);World10.ensure(life);}History.contextualize(life);Calendar?.record(life);
    storyTab='';peerAgeChoice=0;timelineVisible=22;
    replayBasis=null;
    peerCache = null;lastPeerRenderedAge = -1;lastMapRenderedAge = -1;
    $('birthCertificate').classList.add('hidden');
    completed = false; paused = false; elapsed = 0;
    $('lifeStartBtn').classList.add('hidden');
    $('birthCountry').textContent = '출생 지역을 정하는 중…';
    $('birthFlag').textContent = (Goryeo.is(life)||Joseon.isJoseon(life))?'生':'🇰🇷';
    $('birthDetail').textContent = Joseon.isJoseon(life)?birthYear+'년, 어느 집에 태어나게 될까요?':birthYear+'년에 시작될 인생을 추첨합니다.';
    $('birthHeading').textContent=Goryeo.is(life)?'고려의 어느 집, 한 아이가 태어납니다.':Joseon.isJoseon(life)?'조선의 어느 집, 한 아이가 태어납니다.':'당신은 어디에서 태어날까요?';
    show('birth');
    let loops = 0;
    const sample = Goryeo.is(life)?Goryeo.regions.map(region=>[region,'生']):Joseon.isJoseon(life)?[['한양','📜'],['경상도','📜'],['평안도','📜'],['함경도','📜'],['제주도','📜']]:Sim.COUNTRIES.map(country=>[country[0],country[1]]);
    const paint = country => { $('birthFlag').textContent = country[1]; $('birthCountry').textContent = country[0]; };
    const completeBirthReveal=()=>{
      clearInterval(roulette);roulette=null;
      $('birthFlag').textContent=(Goryeo.is(life)||Joseon.isJoseon(life))?'生':life.country[1];
      $('birthCountry').textContent=History.place(life);
      $('birthDetail').textContent=life.gender+' · '+life.familyLevel+' · '+life.year+'년 출생';
      paintCertificate();
      $('lifeStartBtn').classList.remove('hidden');
      $('lifeStartBtn').focus();
    };
    // No flickering/moving roulette for visitors requesting reduced motion.
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
      completeBirthReveal();
    }else{
      roulette=setInterval(()=>{
        loops++;
        paint(sample[UIFlow.rouletteIndex(loops,sample.length)]);
        if(loops>=19)completeBirthReveal();
      },76);
    }
  }
  const formatCredits = value => {
    const n=Math.round(Number(value)||0);
    return (n<0?'−':'')+Math.abs(n).toLocaleString('ko-KR')+'점';
  };
  function paintCertificate() {
    if(!life)return;
    if(Goryeo.is(life)){window.OneLifeGoryeoView343.certificate(life);return;}
    if(Joseon.isJoseon(life))Joseon8?.ensure(life);
    const p=World2.enrich(life).profile;
    const historical=Joseon.inOldEra(life);
    const j=historical?Joseon.summary(life):null;
    const parents=historical?Joseon4.summary(life).people:[];
    const father=parents.find(person=>person.role==='father');
    const mother=parents.find(person=>person.role==='mother');
    $('birthName').textContent=p.name;
    const lineage=historical?Joseon8?.summary(life):null;
    $('birthLineage').classList.toggle('hidden',!lineage);
    if(lineage){
      $('birthLineageText').textContent=lineage.clan+' · '+lineage.residence+'에 자리 잡은 집안';
      $('birthLineageNote').textContent='어머니는 '+lineage.motherClan+' 집안에서 왔다.';
    }
    $('birthPlace').textContent=historical
      ?j.region+'의 어느 '+(Joseon.ensure(life).settlement==='도시'?'도성 안 집':Joseon.ensure(life).settlement==='소도시'?'고을':'마을')
      :History.place(life)+' · '+p.city+' ('+p.settlement+')';
    $('birthGender').textContent=life.gender;
    $('birthDate').textContent=historical?life.birthYear+'년 · '+oldSeason(p.birthMonth)+' 무렵'
      :life.birthYear+'년 '+p.birthMonth+'월 '+p.birthDay+'일';
    $('birthFamily').textContent=life.familyLevel+(historical&&Joseon5?' · '+Joseon5.summary(life).originLabel:'');
    $('birthMother').textContent=(mother?mother.name+' · ':'')+p.motherAge+'세 · '+p.motherJob;
    $('birthFather').textContent=(father?father.name+' · ':'')+p.fatherAge+'세 · '+p.fatherJob;
    $('birthSiblings').textContent=p.siblings+'명';
    const setting=World8.ensure(life);
    $('birthHome').textContent=historical?oldFarm(life)+' '+oldLandLedger(life)+'.':setting.housing+' · '+setting.familyNote;
    $('birthContext').textContent=historical?oldPlace(life):History.period(life)+' · '+life.profile.city+'의 '+setting.neighborhood;
    $('birthEraNote').textContent=historical
      ?'새로 태어난 아이를 위해 식구들이 부엌 불을 지피고 자리를 마련한다.'
      :life.birthYear===2026
        ?'어느 나라에서 태어날지는 우연이지만, 그곳의 환경은 저마다 다릅니다.'
        :'그 시대의 한반도에서 이야기가 시작됩니다. 어떤 일들이 기다리고 있을까요?';
    $('birthCountry').textContent=historical?'조선 · '+j.region:History.period(life)+' · '+life.profile.city;
    $('certificateTitle').textContent=historical?'집안의 첫 기록':'출생 신고서';
    $('birthTicketMark').textContent=historical?'朝鮮 · '+life.birthYear+'年':'ONE LIFE / 0001';
    $('birthTicketKind').textContent=historical?'한 생의 첫 장':'출생 기록';
    $('birthTicketFoot').textContent=historical
      ?'하나의 생이 시작되었다. 그 앞날은 누구도 알지 못한다.'
      :'탄생은 우연입니다. 살아가는 이야기는 지금부터 시작됩니다.';
    $('birthTagline').textContent=historical
      ?'작은 울음소리가 집 안에 번진다.'
      :'이 집에서 당신의 이야기가 시작됩니다.';
    $('birthCertificate').setAttribute('aria-label',historical?'태어난 집의 기록':'출생 신고서');
    $('hopaDisplay').classList.toggle('hidden',!(historical&&life.birthYear>=1413));
    if(historical){
      $('hopaHolder').textContent=father?.name||'집안 어른';
      $('hopaTown').textContent=j.region;
      $('hopaRole').textContent='부친의 이름을 적은 모형';
    }
    $('birthCertificate').classList.remove('hidden');
  }
  function paintLifeRecord() {
    if(Joseon.inOldEra(life)){
      const lineage=Joseon8?.summary(life),village=Joseon9?.summary(life),late=Joseon11?.summary(life),regional=Joseon12?.summary(life),wartime=Joseon13?.summary(life),aftermath=Joseon14?.summary(life),samjeong=Joseon18?.summary(life),localOffice=Joseon19?.summary(life);
      const v2=Joseon2.summary(life),j=Joseon.summary(life),v3=Joseon3.summary(life),v4=Joseon4.summary(life),social=Joseon5?.summary(life),jobs=Joseon6?.summary(life),p=Joseon.ensure(life)&&life.profile,m=life.money,e=j.economy;
      const put=(id,value)=>{$(id).textContent=String(value);};
      const source=Annals?.sourceFor(life);
      $('annalsSourcePanel').classList.toggle('hidden',!source);
      if(source){
        put('annalsSourceText',source.sourceTitle+' · '+source.year+'년. '+source.fact);
        $('annalsSourceLink').href=source.url;
      }
      put('v10HistoricalCount',Joseon.ensure(life).seen.length?Joseon.ensure(life).seen.length+'가지 큰일을 겪음':'고을의 하루');
      put('v10HistoryStatus',j.era+' · '+(Joseon.eventFor(life.year)?.title||j.region+'에서 살아가는 중'));
      put('v10HistoryEffects',[j.warMemory.length?'삶을 바꾼 사건 · '+j.warMemory.join(' · '):'고을에서는 오늘도 저마다의 살림을 이어 간다.',v2.lastMemory,social?.memories.at(-1)].filter(Boolean).join(' · '));
      put('v12EducationEra',j.literacy>=4?'글과 경전을 읽을 수 있다.':j.literacy?'글자를 조금씩 익혀 간다.':'집안에서 필요한 일을 배우며 지낸다.');
      put('v12WorkEra',aftermath?.captivity?.status==='held'?
        '타향에서 포로로 지내며 주어진 일과 하루를 견디고 있다.':
        (jobs?.primary?.name||j.occupation)+' 일을 하며 살아간다.'+(jobs?.secondary?' 틈틈이 '+jobs.secondary.name+'의 일도 돕는다.':''));
      put('v12EconomyEra',oldLandLedger(life)+'. '+e.condition+'.');
      $('joseonVillagePanel').classList.toggle('hidden',!village);
      if(village){
        const livingAbroad=aftermath?.captivity?.status==='held';
        put('villageHomeSummary',livingAbroad?
          '고향의 가족과 마을에 대한 기억이다. 지금은 먼 타향에 머물러 국내 농사와 장시의 일을 직접 할 수 없다.':
          '마을의 물 사정 '+(village.water<20?'몹시 부족':village.water<45?'빠듯함':'넉넉함')+' · 우리 집 가축: 소 '+village.animals.ox+'마리, 돼지 '+village.animals.pig+'마리, 닭 '+village.animals.chicken+'마리.');
        const officeVisible=life.year>=1800&&life.year<=1869&&!!localOffice&&!livingAbroad;
        $('localOfficePanel').classList.toggle('hidden',!officeVisible);
        if(officeVisible){
          put('localOfficeName',localOffice.name+' 수령 · '+localOffice.from+'년 부임 · '+localOffice.region);
          put('localOfficeConduct','관아 평판: '+localOffice.reputation);
          put('localOfficeTax','추가 징수: '+(localOffice.levy>=62?'부담이 큰 편':localOffice.levy>=38?'일부 부담이 있음':'비교적 적은 편'));
          put('localOfficeClerks','아전의 관행: '+(localOffice.clerks>=62?'쉽게 바뀌지 않음':'조정할 여지가 있음'));
          put('localOfficePatronage','새 수령이 부임해도 중앙의 권세가와 아전들이 얽힌 사정은 한순간에 사라지지 않는다.');
          put('localOfficeAudit',localOffice.audit.state==='investigating'?'관리들이 장부를 펼치고 백성들의 사정을 듣고 있다.':
            localOffice.audit.state==='rumor'?'어사가 고을을 살핀다는 소문이 장터에 돌고 있다.':
            localOffice.audit.state==='reported'?'감찰 보고: '+localOffice.audit.outcome:
            '아직 감찰이 내려왔다는 소식은 들리지 않는다.');
          put('localOfficeHistory','이 집안이 겪은 수령 교체 '+Math.max(0,localOffice.turnovers-1)+'차례 · '+(localOffice.petitions?'탄원과 호소의 기록이 남아 있다.':'아직 집안에서 올린 탄원 기록이 없다.'));
          const link=$('localOfficeSource');
          link.classList.toggle('hidden',!localOffice.lastSource);
          if(localOffice.lastSource)link.href=localOffice.lastSource;
        }
        const fiscalVisible=life.year>=1800&&life.year<=1894&&!!samjeong&&!livingAbroad;
        $('samjeongLedger').classList.toggle('hidden',!fiscalVisible);
        if(fiscalVisible){
          const burden=v=>v>=15?'여러 해 쌓인 부담':v>=5?'부담이 남아 있음':v>0?'일부 부담이 남음':'특별히 기록된 부담 없음';
          put('samjeongLand','전정 · '+burden(samjeong.land));
          put('samjeongMilitary','군정 · '+burden(samjeong.military));
          put('samjeongGrain','환정 · '+burden(samjeong.grain));
          put('samjeongPoliticalContext',life.year<1862?
            '세도정치 시대의 중앙 인사와 지방 재정 문제가 고을마다 다르게 영향을 주었다.':
            '1862년 임술민란과 삼정 개선 논의 이후에도 고을의 징수 관행이 곧바로 바뀐 것은 아니다.');
          put('samjeongResistance',[
            samjeong.proof?'남겨 둔 장부와 증언이 있다.':'',
            samjeong.complaints?'부당한 징수에 탄원하거나 의견을 낸 일이 있다.':'',
            samjeong.integrity?'부당한 지시를 거절하거나 장부를 조사한 기억이 있다.':'',
            samjeong.corruption?'관청의 부정한 관행에 얽혔던 흔적이 있다.':'',
            samjeong.anger?'이웃과 집안에 억울함이 쌓여 있다.':''
          ].filter(Boolean).join(' ')||'아직 이 집안의 장부에는 별다른 사연이 적혀 있지 않다.');
          const src=$('samjeongSource');src.classList.toggle('hidden',!samjeong.lastSource);
          if(samjeong.lastSource)src.href=samjeong.lastSource;
        }
        const lateVisible=life.year>=1800&&life.year<1900&&!!late;
        $('lateJoseonLedger').classList.toggle('hidden',!lateVisible);
        if(lateVisible){
          const fragments=[];
          if(late.taxDebt)fragments.push('아직 갚지 못한 곡식과 세금이 있다.');
          if(late.moves)fragments.push('어려운 때 피란하거나 살 곳을 찾은 적이 있다.');
          if(late.solidarity)fragments.push('이웃과 서로 돕고 함께 의견을 낸 일이 있다.');
          if(late.disputes)fragments.push('고을 사람들과 다투거나 어려운 일을 겪기도 했다.');
          put('lateJoseonLedgerText',fragments.join(' ')||'집안의 살림을 꾸리며 이웃과 고을에서 살아간다.');
          const data=Joseon11?.ensure(life),src=data?.lastSource;
          $('lateJoseonSource').classList.toggle('hidden',!src);
          if(src)$('lateJoseonSourceLink').href=src;
        }
        $('joseonRegionalLedger').classList.toggle('hidden',!regional||livingAbroad);
        if(regional){
          put('regionalWorkType',regional.work+' · 여러 해 익힌 솜씨가 남는다.');
          let tools='재료 '+regional.materials+' · 만들거나 모은 물건 '+regional.goods+' · 거래 인연 '+regional.customers;
          if(regional.work.includes('어업')||regional.work.includes('물질'))tools=
            '그물과 도구 '+regional.nets+' · 바다에서 모은 것 '+regional.catch+' · 안전을 살피는 정도 '+regional.safety;
          if(regional.work.includes('농사'))tools='땔감 '+regional.firewood+' · 약초 '+regional.herbs+' · 이웃의 일손과 날씨를 살핀다.';
          put('regionalTools',tools);
          put('regionalConnection',regional.memory||'이웃과 생업을 이어 가는 중이다.');
          const link=$('regionalSourceLink');
          link.classList.toggle('hidden',!regional.source);
          if(regional.source)link.href=regional.source;
        }
        const warVisible=!!wartime&&(wartime.decisions>0||wartime.damage>0||wartime.missing.length>0||wartime.returned.length>0);
        $('joseonWarRecord').classList.toggle('hidden',!warVisible||livingAbroad);
        if(warVisible){
          const notes=[];
          if(wartime.damage)notes.push('고쳐야 할 집터의 흔적이 남아 있다.');
          if(wartime.fields)notes.push('묵은 논밭을 다시 돌봐야 한다.');
          if(wartime.repair)notes.push('집과 논밭을 고쳐 온 일이 있다.');
          if(wartime.moves)notes.push('피란하거나 살 곳을 옮긴 경험이 있다.');
          put('warRecoveryStatus',notes.join(' ')||'전란을 지나온 집안의 기억이 남아 있다.');
          const missingNames=wartime.missing.map(p=>p.name);
          const returnedNames=wartime.returned.map(p=>p.name);
          const kinText=[missingNames.length?'소식을 기다리는 식구: '+missingNames.join(', '):'',
            returnedNames.length?'다시 만난 식구: '+returnedNames.join(', '):''].filter(Boolean).join(' · ');
          put('warMissingFamily',kinText||'가족의 안부와 살림을 함께 돌보았다.');
          put('warRecoveryMemory',wartime.memory||'전쟁이 끝난 뒤에도 마을의 삶은 이어졌다.');
          const link=$('warHistorySource');link.classList.toggle('hidden',!wartime.source);
          if(wartime.source)link.href=wartime.source;
        }
        const captive=aftermath?.captivity;
        $('joseonCaptivityRecord').classList.toggle('hidden',!aftermath||
          (!captive&&!aftermath.familyLine.length&&!aftermath.body.movement&&!aftermath.body.hearing&&!aftermath.body.pain));
        if(aftermath){
          const capText=captive?.status==='held'?
            '전란 중 고향에서 멀리 끌려와 '+captive.years+'년째 지내고 있다.':
            captive?.status==='returned'?'오랜 타향 생활을 마치고 '+captive.returnedYear+'년에 귀환했다.':
            '집안이 겪은 전쟁과 이후의 삶에 관한 기록이다.';
          put('captivityChapter',capText);
          const body=[aftermath.body.movement,aftermath.body.hearing,
            aftermath.body.pain?'오래된 부상이나 통증을 살피는 날이 있다.':'',
            aftermath.body.access?'일하는 도구와 방법을 바꾸어 살아가고 있다.':''].filter(Boolean);
          put('captivityBody',body.join(' ')||'몸에 남은 변화는 사람마다 다르다.');
          put('captivityMind',
            (aftermath.experience.sleep?'밤에 잠을 설치기도 한다. ':'')+
            (aftermath.experience.vigilance?'때때로 주변 소리에 민감해진다. ':'')+
            '그렇다고 삶 전체가 이 경험으로 결정되는 것은 아니다.');
          put('captivityAncestry',aftermath.familyLine.length?
            '이어 온 가족의 이야기: '+aftermath.familyLine.map(p=>p.name).join(' → '):
            '아이들에게 전할 기술과 가족의 기억을 쌓아 가는 중이다.');
          const link=$('captivitySource');link.classList.toggle('hidden',!aftermath.source);
          if(aftermath.source)link.href=aftermath.source;
        }
        const list=$('villageNeighbors');list.replaceChildren();
        for(const neighbor of (livingAbroad?[]:village.neighbors)){const li=document.createElement('li');
          li.textContent=neighbor.name+'네 · '+(neighbor.wealth<28?'형편이 어려운 집':neighbor.wealth>80?'살림이 넉넉한 집':'그럭저럭 살아가는 집')+' · '+(neighbor.trust>65?'가까운 이웃':neighbor.trust<34?'서먹한 사이':'인사를 나누는 사이');list.append(li);}
      }
      put('v12ChoicesCount',social?.obligations?.at(-1)||'집안과 고을의 일이 하루하루 이어지고 있다.');
      if(social)put('v10HistoryStatus',j.era+' · '+social.originLabel+' · '+social.legal);
      put('v13CareYears',aftermath?.captivity?.status==='held'?
        '고향의 가족과 떨어져 지내는 중':
        '한집에서 지내는 식구 '+(v4.atHome+1)+'명'+(lineage?' · '+lineage.clan:''));
      put('v13FamilyStatus',aftermath?.captivity?.status==='held'?
        '고향에 남은 배우자와 가족의 소식을 기다린다. 가족이 있는 곳과 포로 생활 중인 곳은 다르다.':
        (v4.spouse?(v4.spouse.alive?'배우자 '+v4.spouse.name+'와 함께 지낸다.':'배우자 '+v4.spouse.name+'를 그리워한다.'):'식구들과 살림을 이어 간다.')+' 자녀 '+v4.children+'명.');
      put('v13LifeMemories',[...j.memories.slice(-1),...v3.memories.slice(-1),...v4.memories.slice(-2),...(jobs?.memories||[]).slice(-1)].join(' · ')||'남아 있는 기록이 없습니다.');
      put('nameHeadline',p.name+' · '+j.region);put('profileName',p.name);
      put('profileMeta',life.gender+' · '+j.region+' · '+life.age+'세');
      put('profileFamily',(social?.originLabel||j.status)+(social?.freed?' · 법적 예속에서 벗어남':''));
      put('netWorth',formatCredits(m.netWorth));$('netWorth').classList.toggle('negative',m.netWorth<0);
      $('netWorthLabel').textContent='남은 살림 자산';
      put('annualIncome',formatCredits(m.income));put('annualExpense',formatCredits(m.expense));
      put('annualBalance',formatCredits(m.lastBalance));$('annualBalance').classList.toggle('negative',m.lastBalance<0);
      put('employmentStatus',aftermath?.captivity?.status==='held'?'타향에서 주어진 일을 하며 지내는 중':
        (jobs?.primary?.name||j.occupation)+(jobs?.secondary?' · 겸업 '+jobs.secondary.name:''));put('traitEducation',j.school);
      put('traitAptitude','생활의 경험과 배움');put('traitQualification',j.office?'과거 급제·관직 경험':j.literacy?'글과 셈의 배움':'생활 기술을 익히는 중');
      put('traitRegion',aftermath?.captivity?.status==='held'?
        '타향에서 포로 생활 중 · 고향 '+j.region:j.region+' · '+oldPlace(life));
      put('countryContextText',(social?.originLabel||j.status)+'에서 태어났다. '+oldPlace(life));
      put('countrySourceNote','한 고을에 살아도 집안마다 걸어가는 길은 달랐다.');
      put('officialContext',aftermath?.captivity?.status==='held'?
        '고향의 농사와 장시를 직접 돌볼 수 없는 때다. 타향에서 주어진 일과 살아갈 방법을 찾는다.':
        oldFarm(life));
      const people=$('v9PeopleList');people.replaceChildren();
      for(const member of v4.people.slice(0,11)){
        const item=document.createElement('li'),role=Joseon4.ROLES[member.role]||'가족';
        const person=role+' '+member.name+' ('+member.age+'세)';
        item.textContent=person+' — '+(member.alive?
          (aftermath?.captivity?.status==='held'?'고향의 가족 · ':
            (member.atHome?'한집에서 ':'따로 살며 '))+member.work:
          member.diedYear+'년에 세상을 떠났다.');
        people.append(item);
      }
      put('v9PeopleCount',aftermath?.captivity?.status==='held'?
        '고향의 가족 '+v4.people.length+'명 중 '+v4.alive+'명 생존':
        '가족 '+v4.people.length+'명 중 '+v4.alive+'명 생존 · 함께 사는 식구 '+v4.atHome+'명');put('v9Hobby',v3.memories.at(-1)||'생업과 이웃 사이에서 남은 일상');
      put('v9Loan',e.debt?'이웃이나 친척에게 진 빚을 아직 다 갚지 못했다. '+e.why:'빚을 지지 않고 살림을 꾸려 가고 있다. '+e.why);
      put('v9Hobby',jobs?.primary?jobs.primary.name+' 일을 계속해 왔다.':(social?.memories.at(-1)||v3.memories.at(-1)||'아직 기록된 일이 없습니다.'));
      const picture=window.OneLifeJoseonPixel2?.paint($('lifeScene'),life)||Joseon3.paint($('lifeScene'),life)||Joseon.paint($('lifeScene'),life);
      if(!picture)Pixel.paint($('lifeScene'),life);
      put('sceneLabel',aftermath?.captivity?.status==='held'?
        life.year+'년 · 타향에서 보내는 하루 · 고향은 '+j.region:
        life.year+'년 '+v3.season+' · '+j.region+'에서 '+v3.sceneLabel);
      const hopaeShown=aftermath?.captivity?.status!=='held'&&life.gender==='남자'&&life.age>=16&&life.year>=1413&&life.year<1897;
      $('lifeHopa').classList.toggle('hidden',!hopaeShown);
      if(hopaeShown){put('lifeHopaName',p.name);put('lifeHopaTown',j.region+' · 호패를 본뜬 기록');}
      const culture=JoseonCulture?.describe(life,{joseon:j,scene:v3.zone,role:jobs?.primary?.name||j.occupation});
      put('sceneCulture',aftermath?.captivity?.status==='held'?
        '낯선 사람들과 낯선 지붕 아래에서 하루를 보낸다. 고향의 집과 논밭은 멀리 있다.':
        culture?[culture.period+' · '+culture.clothing,culture.housing,culture.meal].join('  |  '):'');
      return;
    }
    $('lifeHopa').classList.add('hidden');
    $('joseonVillagePanel').classList.add('hidden');
    $('lateJoseonLedger').classList.add('hidden');
    $('samjeongLedger').classList.add('hidden');
    $('localOfficePanel').classList.add('hidden');
    $('joseonRegionalLedger').classList.add('hidden');
    $('joseonWarRecord').classList.add('hidden');
    $('joseonCaptivityRecord').classList.add('hidden');
    $('annalsSourcePanel').classList.add('hidden');
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
        (livedEra.event?' · '+livedEra.event.title:' · 그해도 집안의 일상은 이어진다');
      const marks=[...livedEra.memories];
      if(livedEra.schoolInterrupted)marks.push('학업을 이어 가기 어려웠던 경험');
      if(livedEra.moved)marks.push('거주지 이동 '+livedEra.moved+'회');
      $('v10HistoryEffects').textContent=marks.length?'살면서 겪은 일 · '+marks.join(' · '):
        '아직 특별히 남은 기억은 없습니다.';
    }else{
      $('v10HistoricalCount').textContent='살아가는 시대의 기록';
      $('v10HistoryStatus').textContent='이곳에서도 세월이 흐르고 사람들의 생활은 달라진다.';
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
        const separated=Joseon13?.ensure(life)?.missing.find(p=>p.personId===relative.id&&p.status==='missing');
        item.textContent=(Joseon4.ROLES[relative.role]||'가족')+' '+relative.name+' · '+relative.age+'세 · '+
          (separated&&relative.alive?'전란에 헤어져 소식을 기다리는 중':
          relative.alive?relative.work+(relative.atHome?' · 한집 거주':' · 따로 거주'):relative.diedYear+'년 별세');
        people.append(item);
      }
      $('v9PeopleCount').textContent='가족 '+family.people.length+'명 중 '+family.alive+'명 생존';
      $('v13CareYears').textContent='가족에게 마음을 쓴 시간 · 부모님 돌봄 '+family.careYears+'번';
      $('v13FamilyStatus').textContent='집을 떠나 살아가는 식구도 있다. 현재 한집에 사는 가족 '+family.atHome+'명';
      $('v13LifeMemories').textContent=family.memories.join(' · ')||'고향에서 함께 지낸 가족의 기억이 남아 있다.';
      $('countrySourceNote').textContent='조선 시대에 태어나 이 시대까지 살아온 이야기다. 가족의 기억은 앞선 세월부터 이어진다.';
    }
  }
  function paintDiaspora340(){
    const panel=$('diaspora340Panel'),list=$('diaspora340Records');if(!panel||!list)return;
    const s=life?.diaspora340;panel.hidden=!s?.history?.length;list.replaceChildren();
    for(const h of (s?.history||[]).slice(-8).reverse()){
      const li=document.createElement('li');li.textContent=h.year+'년 · '+h.text;list.append(li);
    }
  }
  function paintCollaboration341(){
    const panel=$('collaboration341Panel'),list=$('collaboration341Records');if(!panel||!list)return;
    const s=life?.collaboration341;panel.hidden=!s?.history?.length;list.replaceChildren();
    for(const h of (s?.history||[]).slice(-8).reverse()){
      const li=document.createElement('li');li.textContent=h.year+'년 · '+h.text;list.append(li);
    }
  }
  function paintHousehold342(){
    const H=window.OneLifeHousehold342,panel=$('household342Panel');
    if(!panel)return;panel.hidden=!H?.enabled(life);if(panel.hidden)return;
    const s=H.ensure(life),people=H.members(life),busy=!!life.pending||!life.alive;
    const box=$('household342Members'),actions=$('household342Actions'),stock=$('household342Stock'),history=$('household342History');
    box.replaceChildren();actions.replaceChildren();stock.replaceChildren();history.replaceChildren();
    const manager=people.find(p=>p.id===H.manager(life));
    $('household342Status').textContent='살림을 맡은 사람 · '+(manager?.name||'함께 의논할 어른이 없음')+' · '+(life.age<18?'내가 모은 푼돈 '+s.pocket+' · 가족의 믿음 '+s.trust:'살림에 쓸 돈 '+Math.max(0,Joseon.ensure(life).capital))+(H.away(life)?' · 집을 떠나 있는 중':'');
    function run(fn){if(busy)return;paused=true;updatePause();if(fn()){save();render();}else{$('household342Status').textContent+=' · 돈이나 일손이 부족하거나, 지금 할 수 없는 일입니다.';}}
    function button(parent,label,fn,disabled=false){const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=busy||disabled;b.addEventListener('click',()=>run(fn));parent.append(b);return b;}
    for(const p of people){
      const row=document.createElement('div');row.className='household-person';
      const title=document.createElement('p'),plan=s.plans[p.id],sk=H.book(life,p);
      title.textContent=p.name+' · '+H.roles[p.role]+' · '+(life.year-p.birthYear)+'세 · '+(p.atHome===false?'다른 곳에 거주':plan?H.tasks[plan.task]+(plan.recipe?' / '+H.recipes[plan.recipe].name:''):'평소의 일상')+' · 손기술 '+sk.craft+' · 피로 '+(s.fatigue[p.id]||0)+(p.id!=='self'?' · 관계 '+p.relation:'');row.append(title);
      if((H.canManage(life)||p.id==='self')&&!H.away(life)){
        const select=document.createElement('select');select.setAttribute('aria-label',p.name+'의 할 일');
        for(const t of H.workOptions(life,p)){const o=document.createElement('option');o.value=t;o.textContent=H.tasks[t];select.append(o);}
        const recipe=document.createElement('select');recipe.setAttribute('aria-label',p.name+'의 만들 물건');
        for(const [key,r] of Object.entries(H.recipes)){const o=document.createElement('option');o.value=key;o.textContent=r.name+' · 재료 '+r.cost+' · 손기술 '+r.skill+' · '+r.years+'년';o.disabled=sk.craft<r.skill;recipe.append(o);}
        recipe.hidden=true;select.addEventListener('change',()=>{recipe.hidden=select.value!=='craft';});
        const label=document.createElement('label'),force=document.createElement('input');force.type='checkbox';label.append(force,document.createTextNode('싫다고 해도 일을 재촉하기'));label.hidden=p.id==='self';
        row.append(select,recipe,label);
        const assigned=plan?.year===life.year||(plan?.task==='craft'&&plan.remaining>0);
        if(plan?.task==='craft'&&plan.remaining>0)button(row,'만들던 일 쉬기 · 재료값은 돌려받지 못해요',()=>H.action(life,'pause',p.id),!H.canManage(life));
        button(row,p.id==='self'?'이번 해 할 일 정하기':'이번 해 일 의논하기',()=>H.assign(life,p.id,select.value,recipe.value,force.checked),assigned);
        if(p.id!=='self'&&life.year-p.birthYear>=18)button(row,'집을 비울 때 살림 부탁하기',()=>H.action(life,'manager',p.id),!H.canManage(life));
        button(row,'손기술 함께 익히기 · 재료 1',()=>H.action(life,'practice',p.id),assigned||life.year-p.birthYear<12||!H.canManage(life));
      }
      box.append(row);
    }
    if(life.age>=6&&life.age<18){for(const [k,label] of [['errand','이웃 심부름'],['gather','들에서 먹을 것 찾기'],['sweet','엿 사 먹기 · 푼돈 1'],['trinket','작은 물건 사기 · 푼돈 2'],['save','돈 모아 두기'],['steal','집안 물건 몰래 팔기']])button(actions,label,()=>H.action(life,k),s.used.includes(life.year+':child'));}
    if(H.canManage(life)){
      if(Joseon.ensure(life).office||/군관|군인|수군/.test(Joseon.ensure(life).occupation))button(actions,'먼 고을로 일하러 가기 · 2년',()=>H.action(life,'dispatch'));
      for(const [k,label] of [['donate','절에 시주하기 · 비용 2'],['ritual','집안 의례 준비하기 · 비용 2'],['kin','명절에 친척 만나기 · 비용 2'],['strict','예법을 어겼다고 자녀 꾸짖기']])button(actions,label,()=>H.action(life,k),s.used.includes(life.year+':social'));
      button(actions,'밭 일부에 목화 심기 · 비용 3',()=>H.action(life,'crop','cotton'),!!s.crop);
      if(life.year>=1700)button(actions,'인삼 심기 · 비용 3 / 4년',()=>H.action(life,'crop','ginseng'),!!s.crop);
    }
    if(H.inCrisis(life)){for(const p of people.filter(p=>p.id==='self'||p.role==='child'))button(actions,(p.id==='self'?'내 몸을 팔라는 제안 듣기':p.name+'의 몸을 팔라는 제안 듣기'),()=>H.action(life,'crisis',p.id));}
    for(const contract of s.contracts.filter(x=>x.status==='bound'&&x.id!=='self'))button(actions,contract.name+'의 속량을 의논하기 · 비용 12',()=>H.action(life,'redeem',contract.id),!H.canManage(life));
    if(H.away(life)&&life.age>=18){for(const t of ['care','study','wage'])button(actions,'집에 편지 쓰기 · '+H.tasks[t]+' / 비용 1',()=>H.action(life,'letter',t),s.used.includes(life.year+':letter'));}
    if(s.crop){const li=document.createElement('li');li.textContent=s.crop.name+' · '+s.crop.due+'년 수확을 기다리는 중';stock.append(li);}
    for(const item of s.stock){const li=document.createElement('li');li.textContent=(item.raw?'보관한 목화솜':H.recipes[item.recipe].name)+' · '+item.year+'년 마련 ';if(!item.raw&&H.canManage(life)){button(li,'장에 내다 팔기',()=>H.action(life,'sell',item.id),s.used.includes(life.year+':market'));button(li,'집에서 쓰기',()=>H.action(life,'keep',item.id),s.used.includes(life.year+':market'));}stock.append(li);}
    for(const h of s.history.slice(-8).reverse()){const li=document.createElement('li');li.textContent=h.year+'년 · '+h.text;history.append(li);}
  }
  function paintPaths339(){
    const panel=$('paths339Panel'),list=$('paths339Records');
    if(!panel||!list)return;
    const s=life?.paths339,projects=s?.projects||[];
    panel.hidden=!projects.length;list.replaceChildren();
    const titles={craft:'공방의 공동 작업',trade:'함께 맡은 거래',writing:'경험을 엮은 글',training:'다시 배우는 손기술',workgroup:'동료들과 나눈 일터의 이야기'};
    for(const p of projects){
      const li=document.createElement('li');
      const status=p.status==='completed'?'마친 일':p.status==='archived'?'보관한 기록':p.stage===0?'의논 중':p.stage===1?'시간을 들이는 중':'마무리를 앞둔 일';
      const person=s.contacts.find(c=>c.id===p.contactId);
      li.textContent=p.started+'년부터 · '+titles[p.key]+' · '+status+(person?' · '+person.name+'와 함께한 기록':'');
      list.append(li);
    }
    for(const w of s?.works||[]){const li=document.createElement('li');li.textContent=w.year+'년 · '+w.title+' · 남긴 필사본 '+w.copies+'부';list.append(li);}
  }
  function paintJoseon325(){
    const panel=$('life325Panel'),records=$('life325Records');
    if(!panel||!records)return;
    const entry=Joseon325&&life&&Joseon.isJoseon(life)?Joseon325.summary(life):null;
    const visible=!!entry&&(entry.decisions>0||entry.law.kind!=='free'||entry.profession);
    panel.classList.toggle('hidden',!visible);
    records.replaceChildren();
    if(!visible)return;
    $('life325Count').textContent=entry.decisions+'번의 갈림길';
    const law=entry.law.kind==='exile'?'유배 중 · '+entry.law.place:
      entry.law.kind==='prison'?'구금 중':'';
    $('life325Summary').textContent=[
      entry.residence!=='고향'?'살아가는 곳: '+entry.residence:'',
      entry.profession?entry.profession.name+' · 익힌 솜씨 '+entry.profession.skill:'',
      law
    ].filter(Boolean).join(' · ')||'지금의 생업과 인연을 이어 가고 있어요.';
    for(const r of entry.recent.slice().reverse()){
      const li=document.createElement('li'),date=document.createElement('small'),p=document.createElement('p');
      date.textContent=r.year+'년';p.textContent=r.text;li.append(date,p);records.append(li);
    }
  }
  function paintJoseonWomen326(){
    const panel=$('lifeWomen326Panel'),list=$('lifeWomen326Records');
    if(!panel||!list)return;
    const entry=JoseonWomen326&&life&&Joseon.isJoseon(life)?JoseonWomen326.summary(life):null;
    const more=JoseonWomen327&&life&&Joseon.isJoseon(life)?JoseonWomen327.summary(life):null;
    const count=(entry?.decisions||0)+(more?.decisions||0);
    const visible=count>0;
    panel.classList.toggle('hidden',!visible);
    list.replaceChildren();
    if(!visible)return;
    $('lifeWomen326Count').textContent=count+'번의 갈림길';
    $('lifeWomen326Summary').textContent=[
      more?.profession?'지금 하는 일: '+more.profession+' · 익힌 솜씨 '+more.skill:'이어 온 일: '+entry.livelihood,
      more?.serviceBound?'관아 소속으로 일하는 중':'',
      more?.household?'살림: '+more.household:entry.familyPath?'가족과 이웃: '+entry.familyPath:'',
      more?.estate?.status==='settled'?'옛 문서를 확인해 살림의 일부를 나누어 받았다.':
      entry.property?'옛 살림과 문서를 살핀 기록이 있다.':''
    ].filter(Boolean).join(' · ');
    const records=[...(entry?.recent||[]),...(more?.recent||[])].sort((a,b)=>b.year-a.year).slice(0,12);
    for(const r of records){
      const li=document.createElement('li'),date=document.createElement('small'),p=document.createElement('p');
      date.textContent=r.year+'년';p.textContent=r.text;li.append(date,p);list.append(li);
    }
  }
  function paintLife30(){
    const panel=$('life30Panel'),list=$('life30Records');
    if(!panel||!list)return;
    const record=Life30&&life&&Joseon.isJoseon(life)?Life30.summary(life):null;
    const arcs=record?.arcs||[];
    panel.classList.toggle('hidden',!arcs.length);
    if(!arcs.length){list.replaceChildren();return;}
    $('life30Count').textContent=(record.open||0)+'건 남음 · '+(record.resolved||0)+'건 마무리';
    list.replaceChildren();
    for(const a of arcs.slice(-8).reverse()){
      const li=document.createElement('li'),name=document.createElement('strong'),
        when=document.createElement('small'),body=document.createElement('p');
      name.textContent=a.title;
      const state=a.status==='resolved'?'마무리':a.status==='closed'?'이어지지 못함':'아직 남은 일';
      when.textContent=a.year+'년 · '+a.personName+' · '+state;
      body.textContent=a.outcome||a.evidence.join(' · ')||'이전에 했던 일이 아직 마음에 남아 있다.';
      li.append(name,when,body);list.append(li);
    }
  }
  function paintArc() {
    if(!life)return;
    if(Joseon.inOldEra(life)){
      const j=Joseon.summary(life),s=Joseon.ensure(life),allChoices=life.log
        .filter(e=>['joseon-choice','joseon2-choice','joseon3-choice','joseon4-choice','joseon5-choice','joseon6-choice','joseon7-choice','joseon9-choice','colonialDaily-choice','joseonAnnals-choice','joseon11-choice','joseon12-choice','joseon13-choice','joseon14-choice','joseon18-choice','joseon19-choice','joseon325-choice'].includes(e.kind)).slice(-3);
      const n=j.decisions+Joseon2.summary(life).decisions+Joseon3.summary(life).choices+Joseon4.summary(life).decisions+(Joseon5?.summary(life)?.decisions||0)+(Joseon7?.summary(life)?.decisions||0)+(Joseon9?.summary(life)?.decisions||0)+(Annals?.ensure(life)?.decisions.length||0)+(Joseon11?.summary(life)?.decisions||0)+(Joseon12?.summary(life)?.decisions||0)+(Joseon13?.summary(life)?.decisions||0)+(Joseon14?.summary(life)?.decisions||0)+(Joseon325?.summary(life)?.decisions||0);
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
    const choiceLog=life.log.filter(window.OneLifeBiography328.isChoice);
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
      eraSummary:window.OneLifeEndingEraV1.capture(life),
      choices:life.log.filter(window.OneLifeBiography328.isChoice)
        .map(e=>({age:e.age,label:e.text,kind:e.kind}))};
  }
  function showComparison(){
    const panel=$('endComparison'),rows=$('endComparisonRows');
    const now=captureEnding(life);
    panel.classList.toggle('hidden',!replayBasis || replayBasis.seed!==life.seed);
    rows.replaceChildren();
    if(!replayBasis || replayBasis.seed!==life.seed)return;
    const items=window.OneLifeEndingEraV1.rows(replayBasis,now,formatCredits);
    for(const [name,before,after] of items){
      const line=document.createElement('div');line.className='counter-row';
      const heading=document.createElement('strong');heading.textContent=name;
      const left=document.createElement('span');left.textContent=String(before);
      const icon=document.createElement('span');icon.textContent='→';icon.setAttribute('aria-hidden','true');
      const right=document.createElement('b');right.textContent=String(after);
      if(before!==after)line.classList.add('changed');
      line.append(heading,left,icon,right);rows.append(line);
    }
    // Historical lives can have many choices per year: summarize changes and
    // collapse only the unchanged, densely recorded years for phone readers.
    const choiceCompare=window.OneLifeEndingChoiceCompare;
    const choiceEntries=choiceCompare.rows(replayBasis.choices,now.choices);
    if(choiceEntries.length){
      const overview=document.createElement('p');
      overview.className='counter-summary';
      overview.textContent=choiceCompare.summaryText(choiceCompare.summary(replayBasis.choices,now.choices));
      rows.append(overview);
    }
    for(const entry of choiceEntries){
      const dense=Math.max(entry.before.length,entry.after.length)>2;
      const line=document.createElement(dense?'details':'div');
      line.className='counter-row'+(dense?' counter-details':'');
      if(entry.changed)line.classList.add('changed');
      if(dense)line.open=entry.changed;
      const title=document.createElement(dense?'summary':'strong');
      const multi=Math.max(entry.before.length,entry.after.length)>1;
      title.textContent=entry.age+'세 선택'+(multi?' (이전 '+entry.before.length+'건 · 이번 '+entry.after.length+'건)':'');
      const before=document.createElement('span');
      before.textContent=choiceCompare.readable(entry.before);
      const icon=document.createElement('span');icon.textContent='→';icon.setAttribute('aria-hidden','true');
      const after=document.createElement('b');
      after.textContent=choiceCompare.readable(entry.after);
      line.append(title,before,icon,after);rows.append(line);
    }
  }
  function refreshSpeedControls(){
    document.querySelectorAll('[data-life-speed]').forEach(button=>{
      button.setAttribute('aria-pressed',String(Number(button.dataset.lifeSpeed)===playSpeed&&!nextDecision));
    });
    $('v9NextChoice').setAttribute('aria-pressed',String(nextDecision));
    const autoButton=$('autoChoiceBtn');
    if(autoButton){autoButton.setAttribute('aria-pressed',String(autoChoiceMode));autoButton.textContent=autoChoiceMode?'자동 선택 켬':'자동 선택 끔';}
  }
  function updatePause() {
    $('pauseBtn').textContent = paused ? '▶ 이어가기' : 'Ⅱ 일시정지';
    $('pauseBtn').disabled = !life?.alive;
    $('playStatus').textContent = paused ? '일시정지' : life?.pending
      ? (autoChoiceMode?'다음 일을 고르는 중':'당신의 선택을 기다리는 중') : '인생이 흘러가는 중';
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
      else if (/^joseon(?:33[89]|340|341)-/.test(entry.kind||''))li.className='is-history-choice';
      else if (['history-choice','history-impact','history-followup','joseon-choice','joseon2-choice','joseon3-choice','joseon4-choice','joseon5-choice','joseon5-memory','joseon5-family','joseon6-choice','joseon6-followup','joseon6-memory','joseon7-followup','joseon9-followup','joseon7-choice','joseon9-choice','joseon-followup','joseon2-followup','joseon3-followup','joseon4-followup','joseon-memory','joseon2-memory','joseon3-memory','joseon4-memory','colonialDaily-choice','colonialDaily-followup','joseonAnnals-choice','joseonAnnals-followup','joseonAnnals-fact','joseon11-choice','joseon11-followup','joseon11-memory','joseon12-choice','joseon12-followup','joseon12-memory','joseon13-choice','joseon13-followup','joseon13-family','joseon13-memory','joseon14-choice','joseon14-followup','joseon14-return','joseon14-captivity','joseon14-generations'].includes(entry.kind)) li.className = 'is-history-choice';
      const age = document.createElement('b');
      age.textContent = entry.age + '세';
      const text = document.createElement('span');
      text.textContent = entry.text;
      li.append(age,text);
      const fact=Calendar?.matchEntry(entry)||HistoryLife?.matchEntry(life,entry)||Diaspora?.matchEntry(life,entry)||Collaboration?.matchEntry(life,entry);
      if(fact){
        const source=document.createElement('a');source.href=fact.source;
        source.target='_blank';source.rel='noopener noreferrer';source.className='calendar-source';
        source.textContent='역사 자료 ↗';source.setAttribute('aria-label',fact.title+' 역사 자료');text.append(' ',source);
      }
      timeline.append(li);
    }
    if(endWasNear || life.age<=3) timeline.scrollTop = timeline.scrollHeight;
  }
  function paintCalendar(){
    if(!Calendar)return;
    $('calendar337Year').textContent=life.year+'년';
    const current=Calendar.forYear(life.year);
    $('calendar337Empty').classList.toggle('hidden',current.length>0);
    const row=(event,withYear)=>{
      const li=document.createElement('li'),head=document.createElement('div');
      const tag=document.createElement('small');tag.textContent=Calendar.CATEGORIES[event.category];
      const title=document.createElement('strong');title.textContent=(withYear?event.year+'년 · ':'')+event.title;
      head.append(tag,title);
      const detail=document.createElement('p');detail.textContent=event.detail;
      const link=document.createElement('a');link.href=event.source;link.target='_blank';link.rel='noopener noreferrer';
      link.textContent='역사 자료 ↗';link.setAttribute('aria-label',event.title+' 역사 자료');
      li.append(head,detail,link);return li;
    };
    $('calendar337Current').replaceChildren(...current.map(e=>row(e,false)));
    const past=Calendar.events().filter(e=>e.year>=life.birthYear&&e.year<=life.year);
    $('calendar337Past').replaceChildren(...past.map(e=>row(e,true)));
    $('calendar337End').replaceChildren(...past.map(e=>row(e,true)));
    if(!past.length){const li=document.createElement('li');li.textContent='이 시대의 기록이 아직 쌓이지 않았습니다.';$('calendar337Past').append(li);}
  }
  function paintMomentVitals(){
    // Use the simulation's real values; no extra 'happiness' derived from
    // fictional scene art or a guessed social comparison.
    for(const [stat,id] of [
      ['health','vitalHealth'],['happiness','vitalHappiness'],
      ['knowledge','vitalKnowledge'],['bonds','vitalBonds']
    ]){
      const value=life.stats?.[stat];
      $(id).textContent=Number.isFinite(value)?String(Math.round(value)):'—';
    }
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
    const decisionKey=UIFlow.decisionKey(life,choice,reflection);
    const isNewDecision=decisionKey!==null&&decisionKey!==lastDecisionKey;
    lastDecisionKey=decisionKey;
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
      if(isNewDecision&&!autoChoiceMode)$('decision').scrollIntoView({behavior:'smooth',block:'nearest'});
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
        let effectText=changes.length?'이후 달라진 점 · '+changes.join(' · '):'';
        if(Joseon.inOldEra(life)){
          const lines=[];
          if(life.stats.health<before.stats.health)lines.push('몸이 조금 고단해졌다');
          if(life.stats.health>before.stats.health)lines.push('쉬어 갈 힘을 되찾았다');
          if(life.stats.bonds>before.stats.bonds)lines.push('사람들과의 관계에 조금 힘이 되었다');
          if(life.stats.knowledge>before.stats.knowledge)lines.push('전에 모르던 일을 하나 더 배웠다');
          if(moneyDelta<0)lines.push('집안 살림에는 다소 부담이 남았다');
          if(moneyDelta>0)lines.push('집안 살림에 작은 여유가 생겼다');
          if(life.career!==before.career)lines.push('새로운 생업을 시작했다');
          effectText=lines.length?lines.slice(0,2).join('. ')+'.':'';
        }
        // The choice itself is already recorded. Avoid generic aftermath
        // sentences when there is no verified immediate numerical change.
        if(effectText)life.logEvent(effectText,'decision-effect');
        save(); elapsed=0; lastTick=performance.now(); render(); offerNewbornName();
      });
      target.append(btn);
    });
    // Repainting a still-open choice must not pull readers out of history.
    if(isNewDecision&&!autoChoiceMode)$('decision').scrollIntoView({behavior:'smooth',block:'nearest'});
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
        const peer=new Sim.Life((life.seed+Math.imul(i+1,2654435761))>>>0,{birthYear:life.birthYear,countryName:life.country[0]});
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
    const notable=['decision','reflection','family','profession','world','safety','death','history','history-choice','history-impact','history-followup','era-choice','era-followup','care13-choice','care13-followup','care13-memory','joseon-choice','joseon2-choice','joseon3-choice','joseon4-choice','joseon-memory','joseon2-memory','joseon3-memory','joseon4-memory','joseon4-family','joseon-family','joseon6-choice','joseon6-followup','joseon6-memory','joseon7-followup','joseon9-followup','joseon7-choice','joseon9-choice','joseon-followup','joseon2-followup','joseon3-followup','joseon4-followup','colonialDaily-choice','colonialDaily-followup','joseonAnnals-choice','joseonAnnals-followup','joseonAnnals-fact','joseon11-choice','joseon11-followup','joseon11-memory','joseon12-choice','joseon12-followup','joseon12-memory','joseon13-choice','joseon13-followup','joseon13-family','joseon13-memory','joseon14-choice','joseon14-followup','joseon14-return','joseon14-captivity','joseon14-generations'];
    const entries=new Map();
    for(const entry of life.log){
      if(!notable.includes(entry.kind)&&!String(entry.kind).startsWith('joseon341-'))continue;
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
      $('v8CountryStats').textContent='이 시대의 삶은 사람마다 달랐고, 남겨진 기록도 고르지 않다.';
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
    const measurementGuide=$('historicalUnits');
    if(measurementGuide)measurementGuide.hidden=life.year>=1900;
    if(Goryeo.is(life)){
      window.OneLifeGoryeoView343.paint(life,{paused,autoEnabled:autoChoiceMode,toggleAuto:toggleAutoChoice,choose:i=>{if(life.choose(i)){if(!life.alive)finish();else render();save();}},action:(kind,id,value)=>{Goryeo.action(life,kind,id,value);render();save();},pause:()=>{paused=!paused;lastTick=performance.now();render();},next:()=>{stepYear();}});
      return;
    }
    const journey=Travel22?.summary(life)||null;
    const abroad=!!journey?.residence?.abroad;
    $('travel22Panel').classList.toggle('hidden',!abroad&&!journey?.movements?.length);
    if(journey&&(abroad||journey.movements.length)){
      const residence=journey.residence;
      $('travel22Status').textContent=abroad?'타향에서 '+journey.yearsAbroad+'년':'고향에 돌아온 뒤';
      $('travel22Place').textContent=abroad?residence.place:'고향에서 다시 일상을 이어 간다.';
      $('travel22Reason').textContent=abroad?'떠나온 까닭 · '+residence.reason+' · 고향 '+journey.birthplace:'태어난 고향 · '+journey.birthplace;
      $('travel22Memory').textContent=abroad&&Diaspora?.ownsRoute(residence.route)?Diaspora.describe(life):abroad&&residence.route==='hawaii'?'편지 '+journey.letters+'통 · 함께한 이웃의 기억 '+journey.relationships+' · 살림의 기록 '+journey.earnings:
        abroad&&residence.route==='captivity'&&journey.captivityTies?'타향의 일손 '+(journey.captivityTies.workplace||0)+' · 현지 인연 '+(journey.captivityTies.localTies||0)+' · 익힌 말 '+(journey.captivityTies.language||0)+' · 고향 소식 '+(journey.captivityTies.homeNews||0):
        abroad&&['jurchen','qingMarket'].includes(residence.route)?'물건과 말을 서로 나누며 변경의 하루를 보낸다. 돌아갈 길과 집안의 안부도 함께 챙긴다.':
        abroad&&residence.route==='ming'?'사행 중 맡은 일과 돌아갈 길을 살핀다.':
        abroad?'돌아갈 길을 헤아리며 고향의 소식을 기다린다.':'먼 곳에서 보낸 시간이 집안의 기억으로 남았다.';
      const list=$('travel22Moves');list.replaceChildren();
      journey.movements.slice(-8).forEach(item=>{const li=document.createElement('li');li.textContent=item.year+'년 · '+item.action+' · '+item.place;list.append(li);});
      const link=$('travel22Source');link.classList.toggle('hidden',!journey.source);
      if(journey.source)link.href=journey.source;
    }
    $('openGenealogyBtn').classList.toggle('hidden',!Genealogy||!Joseon.isJoseon(life));
    paintLifeRecord();
    paintLife30();
    paintHousehold342();
    paintPaths339();
    paintDiaspora340();
    paintCollaboration341();
    paintJoseon325();
    paintJoseonWomen326();
    paintArc();
    $('placeFlag').textContent=life.country[0]==='대한민국'&&life.year<1945?'📜':life.country[1];
    const captiveHere=Joseon14?.summary(life)?.captivity;
    $('placeName').textContent=abroad?journey.residence.place:captiveHere?.status==='held'?
      (captiveHere.realm==='japan'?'일본에서 포로로 지내는 중':'후금·청에서 포로로 지내는 중')+
      ' · 고향 '+Joseon.summary(life).region:
      History.place(life);
    $('currentYear').textContent=life.year+'년';
    $('historyContext').textContent=Joseon.inOldEra(life)?Joseon2.summary(life).ruler+' 재위 · '+Joseon.era(life.year)+' · '+life.year+'년':life.birthYear===2026
      ? '2026년, 새로운 인생이 시작됐다.'
      : History.period(life)+' · '+life.year+'년의 세상';
    const reign=Calendar?.ruler(life.year);
    if(reign)$('historyContext').textContent=reign+' · '+life.year+'년';
    paintCalendar();
    if(abroad)$('historyContext').textContent=life.year+'년 · '+journey.residence.region+' · 고향 '+journey.birthplace+'에서 떠난 삶';
    const archive=(Joseon.inOldEra(life)?(Joseon.eventFor(life.year)||Joseon2.at(life.year)):null)||World10.readCurrent(life)||History.currentEvent(life),sourceLink=$('historySourceLink');
    sourceLink.classList.toggle('hidden',!archive);
    if(archive){sourceLink.href=archive.source;sourceLink.textContent=archive.year+'년 '+archive.title+' · 역사 자료';}
    $('currentAge').textContent=String(life.age);
    $('lifeStage').textContent=Sim.stages(life.age);
    $('chapterNumber').textContent=String(Math.floor(life.age/10)+1).padStart(2,'0');
    $('traitCountry').textContent=(abroad?journey.residence.region:History.place(life))+' · '+life.gender;
    $('traitFamily').textContent=life.familyLevel;
    $('traitCareer').textContent=life.career;
    $('storyTitle').textContent=life.getChoice()?.title || (Joseon.isJoseon(life)?(life.age<7?'어린 시절':life.age<20?'자라며 배우는 일':life.age<40?'청년기의 생업':life.age<65?'살림과 생업':'노년의 생활'):(life.age<6?'어린 시절':life.age<20?'자라며 겪은 일':life.age<40?'배움과 일터':life.age<65?'생업과 일상':'노년의 생활'));
    const current = life.log[life.log.length-1];
    $('storyCaption').textContent=life.getChoice()
      ? '아래에서 선택할 일을 확인하세요.'
      : current?.text || '아직 올해 남겨진 기록이 없습니다.';
    $('lifeProgress').style.width=Math.min(100,life.age/105*100)+'%';
    paintTimeline();
    paintStats();
    paintMomentVitals();
    paintPeers();
    if(storyTab==='years')paintAgeMap();
    if(storyTab==='stats')paintSurvival();
    document.querySelectorAll('[data-focus]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.focus===life.focus)));
    showDecision();
    updatePause();
  }
  let genealogyPreviousRunning=false,genealogySelected=null,genealogyOpener=null;
  function showGenealogyPerson(data,id){
    const n=data.nodes.find(p=>p.id===id)||data.nodes.find(p=>p.id===data.selfId);
    if(!n)return;
    genealogySelected=n.id;
    document.querySelectorAll('.genealogy-person').forEach(button=>
      button.setAttribute('aria-pressed',String(button.dataset.genealogyId===n.id)));
    const find=id=>data.nodes.find(p=>p.id===id)?.name||'기록 없음';
    const yearLabel=n.birthYear+'년생'+(n.diedYear?' · '+n.diedYear+'년 별세':'');
    const now=n.id===data.selfId;
    const status=n.missing?'전란 중 소식이 끊겨 생사를 확인하지 못함':
      n.returned?'전란 중 헤어졌다가 귀환한 기록이 있음':
      !n.alive?'세상을 떠남':
      n.lastSeen===life.year?'이 해의 기록에서 생존':
      n.lastSeen+'년까지 생존한 것으로 기록됨. 이후의 행적은 아직 없음';
    $('genealogyDetailName').textContent=n.name+(now?' · 현재 인생':'');
    $('genealogyDetailLife').textContent=yearLabel+' · '+(Genealogy.ROLES[n.role]||'가족')+' · '+status;
    const kin=[];
    if(n.motherId)kin.push('어머니 '+find(n.motherId));
    if(n.fatherId)kin.push('아버지 '+find(n.fatherId));
    if(n.partnerId)kin.push('배우자 '+find(n.partnerId));
    const children=data.nodes.filter(x=>x.motherId===n.id||x.fatherId===n.id);
    if(children.length)kin.push('자녀 '+children.map(x=>x.name).join(', '));
    $('genealogyDetailRelations').textContent=kin.length?kin.join(' · '):'현재 남아 있는 기록에는 연결된 가족관계가 더 없습니다.';
    const branch=data.branches.find(b=>b.id===n.branchId||b.id===n.id);
    const swappable=BranchSwitch?.options(life).some(p=>p.id===n.id)||false;
    $('genealogySwitchBtn').classList.toggle('hidden',!swappable);
    $('genealogySwitchBtn').disabled=!swappable;
    $('genealogySwitchHint').textContent=n.id===data.selfId?
      '지금 살아가는 인물이다.':
      swappable?
        '이 식구의 삶을 이어 볼 수 있다. 지금까지 살아온 인생으로도 다시 돌아올 수 있다.':
        !n.alive?'세상을 떠난 식구의 삶으로는 갈아탈 수 없다.':
        n.missing?'소식이 끊긴 식구는 살아 돌아왔다는 소식을 기다려야 한다.':
        '지금은 이 식구의 삶을 이어 볼 수 없다.';
    $('genealogyDetailStory').textContent=(n.simulated?
      '본가에서 갈라져 나온 '+(branch?.label||'방계 집안')+'의 후손이다. 집안을 떠나 살아온 세월은 자세히 전해지지 않는다. ':
      branch?'다른 살림을 꾸린 '+branch.label+'의 집안 사람이다. ':'')+
      (n.work?'살아온 일 · '+n.work:'어떤 일로 생계를 꾸렸는지는 전해지지 않는다.');
  }
  let genealogyFolded=new Set();
  function drawGenealogy(){
    const data=Genealogy?.summary(life);if(!data)return;
    $('genealogyClan').textContent=data.clan+' · '+data.residence+' · '+data.nodes.length+'명의 인물 기록';
    $('genealogyBranchCount').textContent=data.branches.length?
      '따로 살림을 이은 집안 '+data.branches.length+'갈래 · 이름을 누르면 살아온 이야기를 읽을 수 있다.':
      '부모와 자녀, 형제자매의 인연이 가지처럼 이어진다.';
    const area=$('genealogyGenerations');area.replaceChildren();
    const people=data.nodes,idMap=new Map(people.map(p=>[p.id,p])),displayed=new Set();
    const sorted=group=>group.sort((a,b)=>a.birthYear-b.birthYear||a.id.localeCompare(b.id));
    const makeCard=person=>{
      const button=document.createElement('button');button.type='button';
      button.className='genealogy-person'+(person.id===data.selfId?' genealogy-self':'')+
        (!person.alive?' genealogy-deceased':'')+(person.simulated?' genealogy-simulated':'');
      button.dataset.genealogyId=person.id;button.setAttribute('aria-pressed','false');
      const name=document.createElement('strong');name.textContent=person.name;
      const years=document.createElement('span');years.textContent=person.birthYear+'년생'+
        (person.diedYear?' ~ '+person.diedYear+'년':'');
      const tag=document.createElement('small');
      const branch=data.branches.find(b=>b.id===person.id);
      tag.textContent=person.id===data.selfId?'지금의 주인공':
        branch?branch.label:person.simulated?'방계의 후손':
        person.missing?'소식을 기다리는 중':person.returned?'귀환 기록':
        person.role==='spouse'?'배우자':'가족 기록';
      button.append(name,years,tag);
      button.addEventListener('click',()=>showGenealogyPerson(data,person.id));
      return button;
    };
    const renderBranch=(person,depth=0)=>{
      if(!person||displayed.has(person.id)||depth>18)return null;
      displayed.add(person.id);
      const root=document.createElement('section');root.className='genealogy-family-branch';
      const adults=document.createElement('div');adults.className='genealogy-pair';
      adults.append(makeCard(person));
      const partner=idMap.get(person.partnerId);
      if(partner&&!displayed.has(partner.id)){
        displayed.add(partner.id);
        const symbol=document.createElement('span');symbol.className='genealogy-union';symbol.textContent='─';
        adults.append(symbol,makeCard(partner));
      }
      root.append(adults);
      const offspring=sorted(people.filter(kid=>!displayed.has(kid.id)&&(
        kid.motherId===person.id||kid.fatherId===person.id||
        (partner&&(kid.motherId===partner.id||kid.fatherId===partner.id)))));
      if(offspring.length){
        const toggle=document.createElement('button');toggle.type='button';toggle.className='genealogy-fold';
        const count=offspring.length;
        const updateFold=()=>{
          const closed=genealogyFolded.has(person.id);
          toggle.textContent=closed?'후손 '+count+'명 펼치기 ＋':'후손 '+count+'명 접기 −';
          toggle.setAttribute('aria-expanded',String(!closed));
          group.hidden=closed;
        };
        const group=document.createElement('div');group.className='genealogy-fork';
        for(const child of offspring){
          const sub=renderBranch(child,depth+1);
          if(sub)group.append(sub);
        }
        toggle.addEventListener('click',()=>{
          if(genealogyFolded.has(person.id))genealogyFolded.delete(person.id);
          else genealogyFolded.add(person.id);
          updateFold();
        });
        root.append(toggle,group);updateFold();
      }
      return root;
    };
    // A union is rendered once even when both parents appear as independent
    // records. Only actual parent links determine the fork, never surname.
    const roots=sorted(people.filter(p=>!idMap.has(p.motherId)&&!idMap.has(p.fatherId)));
    for(const person of [...roots,...sorted(people.slice())]){
      if(displayed.has(person.id))continue;
      const part=renderBranch(person);
      if(part)area.append(part);
    }
    showGenealogyPerson(data,genealogySelected||data.selfId);
  }
  function openGenealogy(){
    if(!life||!Genealogy||!Joseon.isJoseon(life))return;
    genealogyPreviousRunning=stage==='play'&&!paused&&!life.pending;
    genealogyOpener=document.activeElement;
    if(stage==='play'){paused=true;updatePause();}
    genealogySelected=null;genealogyFolded=new Set();drawGenealogy();
    $('genealogyModal').classList.remove('hidden');
    $('genealogyClose').focus();
  }
  function closeGenealogy(){
    if($('genealogyModal').classList.contains('hidden'))return;
    $('genealogyModal').classList.add('hidden');
    if(genealogyPreviousRunning&&stage==='play'&&life?.alive&&!life.pending){
      paused=false;lastTick=performance.now();updatePause();
    }
    genealogyPreviousRunning=false;
    genealogyOpener?.focus?.();genealogyOpener=null;
  }
  function startLife(fromSave=false) {
    if (!life) return;
    if(!fromSave) safeRemove(SAVE_KEY);
    paused=false; elapsed=0; lastTick=performance.now();
    show('play');
    render();renderStoryPanel();
    sdk?.start?.({mode:'one-life',country:life.country[0]});
    if(fromSave)offerNewbornName();
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
    paintCalendar();
    safeRemove(SAVE_KEY);
    const summary=life.summary();
    const choiceLog=life.log.filter(window.OneLifeBiography328.isChoice);
    const oldLife=Joseon.isJoseon(life)?Joseon.summary(life):null;
    const oldSocial=oldLife&&Joseon5?.summary(life);
    const oldJobs=oldLife&&Joseon6?.summary(life);
    const count=rememberLife();
    $('endYears').textContent=life.birthYear+' — '+life.year;
    $('endCountry').textContent=(life.country[0]==='대한민국'&&life.year<1945?'📜':life.country[1])+' '+History.place({...life,year:life.birthYear})+' · '+life.profile.name+' ('+life.profile.city+')';
    $('endNetWorth').textContent=Goryeo.is(life)?'곡식 '+Goryeo.ensure(life).grain+'말':Joseon.inOldEra(life)?'살림 '+Joseon.ensure(life).capital+'냥':formatCredits(life.money.netWorth);
    $('endAge').textContent=summary.age+'년';
    $('endCareer').textContent=oldJobs?.primary?.name||(!['아직 정해지지 않음','학생'].includes(life.career)?life.career:'살림과 일상');
    const firstPlace=History.place({...life,year:life.birthYear});
    const chapters=window.OneLifeBiography328.chapters(life,{
      place:firstPlace,origin:Goryeo.is(life)?Goryeo.ensure(life).origin:oldLife?(oldSocial?.originLabel||Joseon.ensure(life).birthStatus+' 집안'):''
    });
    $('endStory').replaceChildren(...chapters.map(text=>{
      const p=document.createElement('p');p.textContent=text;return p;
    }));
    $('endGenealogyBtn').classList.toggle('hidden',!Genealogy||!Joseon.isJoseon(life));
    const heirs=Joseon14?.heirs(life)||[];
    $('heirControls').classList.toggle('hidden',!heirs.length);
    const picker=$('heirSelect');picker.replaceChildren();
    for(const heir of heirs){
      const option=document.createElement('option');option.value=heir.id;
      option.textContent=heir.name+' · '+heir.age+'세 · '+heir.birthYear+'년생';
      picker.append(option);
    }
    const endChoices=$('endChoices');endChoices.replaceChildren();
    choiceLog.slice(-60).forEach(e=>{
      const item=document.createElement('li');item.className='end-choice-item';
      const age=document.createElement('b');age.textContent=e.age+'세';
      const text=document.createElement('span');text.textContent=e.text;
      const copy=document.createElement('div');copy.append(text);
      const effect=UIFlow.decisionAftermath(life.log,e);
      const detail=document.createElement('small');
      if(effect){detail.textContent=effect.text;copy.append(detail);}
      else if(['history-choice','era-choice','care13-choice','joseon-choice','joseon2-choice','joseon3-choice','joseon4-choice','joseon5-choice','joseon6-choice','joseon7-choice','joseon9-choice','colonialDaily-choice','joseonAnnals-choice','joseon11-choice','joseon12-choice','joseon13-choice','joseon14-choice','joseon339-choice','joseon340-choice','joseon341-choice'].includes(e.kind)){
        const aftermath={'joseon341-choice':'joseon341-followup','joseon340-choice':'joseon340-followup','joseon339-choice':'joseon339-followup','history-choice':'history-followup','era-choice':'era-followup','care13-choice':'care13-followup',
          'joseon-choice':'joseon-followup','joseon2-choice':'joseon2-followup',
          'joseon3-choice':'joseon3-followup','joseon4-choice':'joseon4-followup','joseon5-choice':'joseon5-followup','joseon6-choice':'joseon6-followup','joseon7-choice':'joseon7-followup','joseon9-choice':'joseon9-followup','joseonAnnals-choice':'joseonAnnals-followup','joseon11-choice':'joseon11-followup','joseon12-choice':'joseon12-followup','joseon13-choice':'joseon13-followup','joseon14-choice':'joseon14-followup','colonialDaily-choice':'colonialDaily-followup'}[e.kind];
        // Only an explicitly linked outcome belongs to this choice. Older saves without
        // cause identifiers show no follow-up rather than a misleading one.
        const after=e.causeId?life.log.find(x=>x.kind===aftermath&&x.causeId===e.causeId):null;
        if(after){detail.textContent='그 뒤 '+after.age+'세 · '+after.text;copy.append(detail);}
      }
      item.append(age,copy);endChoices.append(item);
    });
    showComparison();
    const list=$('endHighlights'); list.replaceChildren();
    const highlights=window.OneLifeBiography328.highlights(life);
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
    History.contextualize(life);Calendar?.record(life);
    if(!life.alive) return finish();
    if(nextDecision&&life.pending){nextDecision=false;playSpeed=1;refreshSpeedControls();}
    render();
    offerNewbornName();
    // Each year may have several linked events: save complete year boundaries.
    save();
  }
  let lastSceneFrame=0;
  function loop() {
    const now=performance.now();
    const delta=Math.max(0,Math.min(260,now-lastTick));
    lastTick=now;
    if(stage!=='play'||!life||!life.alive||paused||document.hidden)return;
    if(life.pending){
      // A single decision per animation tick; no recursion through linked events.
      if(autoChoiceMode&&now-lastAutoChoiceAt>=650&&!namingChild){
        lastAutoChoiceAt=now;
        const changed=window.OneLifeAutoChoiceV1.tick(life);
        if(changed){elapsed=0;if(!life.alive)finish();else{render();offerNewbornName();save();}}
      }
      return;
    }
    if(now-lastSceneFrame>=180&&Joseon.isJoseon(life)&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
      window.OneLifeJoseonPixel2?.paint($('lifeScene'),life,{time:now});lastSceneFrame=now;
    }
    elapsed+=delta*playSpeed;
    let count=0;
    const yearMs=YEAR_MS;
    while(elapsed>=yearMs && count++<5) {
      elapsed-=yearMs;
      stepYear();
      if(stage!=='play' || life.pending || !life.alive) {elapsed=0;break;}
    }
  }
  function toggleAutoChoice(){
    autoChoiceMode=!autoChoiceMode;
    lastAutoChoiceAt=performance.now()-350;
    refreshSpeedControls();updatePause();save();
    if(Goryeo.is(life)&&stage==='play')render();
  }
  function togglePause() {
    if(stage!=='play'||!life?.alive) return;
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
    updateBirthChoices();
  }));
  $('birthYearInput').addEventListener('change',updateBirthChoices);
  $('birthRandomBtn').addEventListener('click',()=>{
    $('birthNameInput').value='';$('birthGenderInput').value='';
    $('birthOriginInput').value='';$('birthFamilyInput').value='';$('birthCountryInput').value='';
    $('birthIdentityError').classList.add('hidden');
  });
  $('newbornNameConfirm').addEventListener('click',()=>finishNewbornName(false));
  $('newbornNameRandom').addEventListener('click',()=>finishNewbornName(true));
  $('newbornNameInput').addEventListener('keydown',e=>{if(e.key==='Enter')finishNewbornName(false);});
  document.querySelectorAll('[data-life-speed]').forEach(button=>button.addEventListener('click',()=>{
    const n=Number(button.dataset.lifeSpeed);
    if(![1,2,4,8].includes(n))return;
    playSpeed=n;nextDecision=false;refreshSpeedControls();
  }));
  $('autoChoiceBtn').addEventListener('click',toggleAutoChoice);
  $('v9NextChoice').addEventListener('click',()=>{
    if(!life?.alive||life.pending||stage!=='play')return;
    playSpeed=8;nextDecision=true;
    if(paused){paused=false;updatePause();}
    refreshSpeedControls();
  });
  $('v9TimelineMore').addEventListener('click',()=>{timelineVisible=Math.min(760,timelineVisible+60);paintTimeline();});
  $('drawBtn').addEventListener('click',draw);
  $('lifeStartBtn').addEventListener('click',()=>startLife());
  $('againBtn').addEventListener('click',()=>{replayBasis=null;life=null;show('intro');refreshResume();updateBirthChoices();});
  $('openGenealogyBtn').addEventListener('click',openGenealogy);
  $('endGenealogyBtn').addEventListener('click',openGenealogy);
  $('genealogyExpandAll').addEventListener('click',()=>{genealogyFolded.clear();drawGenealogy();});
  $('genealogySwitchBtn').addEventListener('click',()=>{
    if(!BranchSwitch||!life||!genealogySelected)return;
    const switched=BranchSwitch.switchTo(life,genealogySelected);
    if(!switched)return;
    genealogyPreviousRunning=false;
    closeGenealogy();
    life=switched;replayBasis=null;completed=false;
    storyTab='';timelineVisible=22;peerAgeChoice=0;
    playSpeed=1;nextDecision=false;paused=false;elapsed=0;
    peerCache=null;lastPeerRenderedAge=-1;lastMapRenderedAge=-1;
    World8.ensure(life);History.contextualize(life);Calendar?.record(life);
    refreshSpeedControls();startLife();
  });
  $('genealogyClose').addEventListener('click',closeGenealogy);
  $('genealogyBackdrop').addEventListener('click',closeGenealogy);
  $('heirContinueBtn').addEventListener('click',()=>{
    if(!life||life.alive||!Joseon14)return;
    const successor=Joseon14.continueAsHeir(life,$('heirSelect').value);
    if(!successor)return;
    BranchSwitch?.carryToSuccessor(life,successor);
    life=successor;replayBasis=null;completed=false;
    storyTab='';timelineVisible=22;peerAgeChoice=0;
    playSpeed=1;nextDecision=false;paused=false;elapsed=0;
    peerCache=null;lastPeerRenderedAge=-1;lastMapRenderedAge=-1;
    World8.ensure(life);History.contextualize(life);Calendar?.record(life);
    refreshSpeedControls();startLife();
  });
  $('sameBirthBtn').addEventListener('click',()=>{
    if(!life||life.alive)return;
    const snapshot=captureEnding(life);
    replayBasis=snapshot;
    life=new Sim.Life(snapshot.seed,{birthYear:snapshot.birthYear,countryName:snapshot.country,birthSetup:life.birthSetup});
    World8.ensure(life);if(Goryeo.is(life))Goryeo.ensure(life);else if(Joseon.isJoseon(life))Joseon.ensure(life);else {World8.moment(life);World10.ensure(life);}History.contextualize(life);Calendar?.record(life);
    storyTab='';peerAgeChoice=0;timelineVisible=22;playSpeed=1;nextDecision=false;refreshSpeedControls();
    peerCache=null;lastPeerRenderedAge=-1;lastMapRenderedAge=-1;
    $('birthCertificate').classList.add('hidden');
    $('birthFlag').textContent=(Goryeo.is(life)||Joseon.isJoseon(life))?'生':life.country[0]==='대한민국'&&life.year<1945?'📜':life.country[1];
    $('birthCountry').textContent=History.place(life);
    $('birthDetail').textContent=life.gender+' · '+life.familyLevel+' · '+life.birthYear+'년 출생';
    $('birthHeading').textContent=Goryeo.is(life)?'고려의 어느 집, 한 아이가 태어납니다.':Joseon.isJoseon(life)?'조선의 어느 집, 한 아이가 태어납니다.':'당신은 어디에서 태어날까요?';
    $('lifeStartBtn').classList.remove('hidden');
    paintCertificate();
    completed=false;paused=false;elapsed=0;
    show('birth');
  });
  $('resumeBtn').addEventListener('click',()=>{
    const restored=currentSave();
    if(!restored || !restored.alive){refreshResume();return;}
    life=restored;timelineVisible=22;playSpeed=1;nextDecision=false;autoChoiceMode=safeGet(SAVE_KEY)?.autoChoiceMode===true;refreshSpeedControls();World9.ensure(life);World8.ensure(life);replayBasis=safeGet(SAVE_KEY)?.replayBasis||null;completed=false;peerCache=null;lastPeerRenderedAge=-1;lastMapRenderedAge=-1;startLife(true);
  });
  $('household342Panel')?.addEventListener('toggle',()=>{if($('household342Panel').open&&stage==='play'){paused=true;updatePause();}});
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
    if(e.key==='Escape'&&!$('genealogyModal').classList.contains('hidden')){
      e.preventDefault();closeGenealogy();return;
    }
    if(e.key==='Tab'&&!$('genealogyModal').classList.contains('hidden')){
      const focusables=[...$('genealogyModal').querySelectorAll('button:not(:disabled)')];
      const first=focusables[0],last=focusables.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      return;
    }
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
  sdk?.registerPauseHandlers?.({pause:()=>{paused=true;updatePause();save();},resume:()=>{if(stage!=='play'||!life?.alive)return;paused=false;lastTick=performance.now();updatePause();}});
  const heartbeat=setInterval(loop,90);
  sdk?.registerCleanup?.(()=>{save();clearInterval(heartbeat);if(roulette)clearInterval(roulette);});
  updateBirthChoices();refreshResume();show('intro');
})();
