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
  if (!World2 || !Pixel || !World3 || !World4 || !World5 || !World6 || !World7 || !World8) throw new Error('One Life world assets missing');
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
  let storyTab='', peerAgeChoice=0;
  const sdk = window.KidscadeGame || null;
  const show = name => { stage = name; for (const id of views) $(id).classList.toggle('hidden',id!==name); window.scrollTo?.(0,0); };
  const safeGet = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; } };
  const safeSet = (key,data) => { try { localStorage.setItem(key,JSON.stringify(data)); return true; } catch (_) { return false; } };
  const safeRemove = key => { try { localStorage.removeItem(key); } catch (_) {} };
  function currentSave() {
    const stored = safeGet(SAVE_KEY);
    return stored && stored.life ? Sim.Life.restore(stored.life) : null;
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
    life = new Sim.Life();
    World8.ensure(life);World8.moment(life);
    storyTab='';peerAgeChoice=0;
    replayBasis=null;
    peerCache = null;lastPeerRenderedAge = -1;lastMapRenderedAge = -1;
    $('birthCertificate').classList.add('hidden');
    completed = false; paused = false; elapsed = 0;
    $('lifeStartBtn').classList.add('hidden');
    $('birthCountry').textContent = '출생을 기다리는 중…';
    $('birthFlag').textContent = '🌐';
    $('birthDetail').textContent = '수많은 사람 중 하나의 삶을 추첨합니다.';
    show('birth');
    let loops = 0;
    const sample = Sim.COUNTRIES;
    const paint = country => { $('birthFlag').textContent = country[1]; $('birthCountry').textContent = country[0]; };
    roulette = setInterval(() => {
      loops++;
      paint(sample[(loops*7)%sample.length]);
      if(loops >= 19) {
        clearInterval(roulette); roulette = null;
        paint(life.country);
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
    $('birthName').textContent=p.name;
    $('birthPlace').textContent=life.country[0]+' · '+p.city+' ('+p.settlement+')';
    $('birthGender').textContent=life.gender;
    $('birthDate').textContent='2026년 '+p.birthMonth+'월 '+p.birthDay+'일';
    $('birthFamily').textContent=life.familyLevel;
    $('birthMother').textContent=p.motherAge+'세 · '+p.motherJob;
    $('birthFather').textContent=p.fatherAge+'세 · '+p.fatherJob;
    $('birthSiblings').textContent=p.siblings+'명';
    const setting=World8.ensure(life);
    $('birthHome').textContent=setting.housing+' · '+setting.familyNote;
    $('birthContext').textContent=setting.regionName+' · '+setting.climate+' · '+setting.neighborhood;
    $('birthCertificate').classList.remove('hidden');
  }
  function paintLifeRecord() {
    const p=World2.enrich(life).profile;
    const money=life.money;
    const personal=World7.ensure(life);
    const hometown=World8.ensure(life);
    $('nameHeadline').textContent=p.name+' · '+p.city;
    $('profileName').textContent=p.name;
    $('profileMeta').textContent=life.gender+' · '+p.city+' · '+life.age+'세';
    $('profileFamily').textContent=p.child?'돌봄 중인 아이가 있어요':p.partner?'함께하는 동반자가 있어요':life.familyLevel;
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
    $('countrySourceNote').textContent='참고 수명 '+(life.world?.lifeBaseline||0).toFixed(1)+'세는 게임용 근사값 · 실제 자료와 다를 수 있음. 교육·직업·미래 사건은 모두 가상 모델';
    const sceneName=Pixel.paint($('lifeScene'),life);
    const sceneTitle=Pixel.names?.[sceneName]||sceneName;
    $('sceneLabel').textContent=life.year+'년 · '+life.country[0]+' '+p.city+' ('+p.settlement+') · '+sceneTitle+'에서 보내는 하루';
  }
  function paintArc() {
    if(!life)return;
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
    const choiceLog=life.log.filter(e=>e.kind==='decision');
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
    return {seed:life.seed,country:life.country[0],family:life.familyLevel,
      age:life.age,career:life.career,education:life.world?.educationLevel||'',
      qualification:life.world7?.qualification?.join(', ')||'없음',
      netWorth:life.money.netWorth,health:life.stats.health,
      child:!!life.profile.child,partner:!!life.profile.partner,
      housing:life.world8?.housing||'',
      roles:life.world6?.history?.map(x=>x.job)||[],
      choices:life.log.filter(e=>e.kind==='decision').map(e=>({age:e.age,label:e.text}))};
  }
  function showComparison(){
    const panel=$('endComparison'),rows=$('endComparisonRows');
    const now=captureEnding(life);
    panel.classList.toggle('hidden',!replayBasis || replayBasis.seed!==life.seed);
    rows.replaceChildren();
    if(!replayBasis || replayBasis.seed!==life.seed)return;
    const items=[
      ['출생 국가',replayBasis.country,now.country],
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
    const recent = life.log.slice(-22);
    for (const entry of recent) {
      const li = document.createElement('li');
      if (entry.kind === 'decision') li.className = 'is-decision';
      else if (entry.kind === 'decision-effect') li.className = 'is-choice-effect';
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
        const labels={health:'건강',happiness:'행복',knowledge:'배움',bonds:'인연',wealth:'경제 지표'};
        const changes=Object.entries(labels).flatMap(([key,label])=>{
          const delta=(life.stats?.[key]||0)-(before.stats?.[key]||0);
          return delta?[label+' '+(delta>0?'+':'')+delta]:[];
        });
        const moneyDelta=(life.money?.netWorth??before.netWorth)-(before.netWorth??life.money?.netWorth??0);
        if(moneyDelta)changes.push('가상 순자산 '+(moneyDelta>0?'+':'')+formatCredits(moneyDelta));
        if(life.career!==before.career)changes.push('진로 '+life.career);
        const effectText=changes.length?'선택 직후 변화: '+changes.join(' · '):'선택 직후 지표 변화 없음 · 이후 선택지와 사건에 반영될 수 있음';
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
    if(!force && life.age===lastPeerRenderedAge)return;
    lastPeerRenderedAge=life.age;
    if(!peerCache||peerCache.seed!==life.seed){
      peerCache={seed:life.seed,people:Array.from({length:4},(_,i)=>{
        const peer=new Sim.Life((life.seed+Math.imul(i+1,2654435761))>>>0);
        World8.ensure(peer);World8.moment(peer);
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
          peer.tick();
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
    const notable=['decision','reflection','family','profession','world','safety','death'];
    const entries=new Map();
    for(const entry of life.log){
      if(!notable.includes(entry.kind))continue;
      const old=entries.get(entry.age);
      if(!old||['decision','death'].includes(entry.kind))entries.set(entry.age,entry);
    }
    for(let year=0;year<108;year++){
      const cell=document.createElement('button');cell.type='button';cell.className='age-cell';
      if(year<=life.age)cell.classList.add(year<7?'child':year<19?'teen':year<35?'young':year<65?'adult':'elder');
      if(year===life.age)cell.classList.add('now');
      const entry=entries.get(year);
      if(entry)cell.classList.add(['decision','reflection'].includes(entry.kind)?'landmark':'important');
      cell.title=year+'세'+(entry?' · '+entry.text:'');
      cell.setAttribute('aria-label',cell.title);
      cell.addEventListener('click',()=>{
        $('yearDetail').textContent=year+'세 · '+(entry?.text||'특별한 기록이 없는 해. 평범한 하루들도 이 인생을 이루었어요.');
      });
      board.append(cell);
    }
  }
  function paintSurvival() {
    if(!life)return;
    const world=['게임 세계 기준','',0,.55,.69];
    const point=(country,gender,a)=>{
      const x=38+3.1*a,y=12+131*(1-World8.survival(country,gender,a));
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
    const mod=World8.mortality(life.country,life.gender);
    $('survivalSummary').textContent=life.country[0]+' · '+life.gender+
      ' · 출생부터 5세까지 생존 '+Math.round(World8.survival(life.country,life.gender,5)*1000)/10+
      '%(게임 모형), '+life.age+'세 기준 '+Math.round(World8.survival(life.country,life.gender,life.age)*1000)/10+
      '%(동일 가상 집단). 개인의 실제 생존 확률이 아니에요.';
    $('v8CountryStats').textContent='모델 기대수명 참고치 '+mod.baseline.toFixed(1)+
      '세 · 학교 접근성 '+Math.round(life.world.schoolChance*100)+
      '%(게임 가정) · 가족 생활: '+World8.ensure(life).housing+
      ' · 실제 국가통계가 아닌 근사·가상값.';
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
      $('storyBirthText').textContent=World8.synopsis(life)+'. '+World8.ensure(life).familyNote+'.';
      $('storyBirthNote').textContent=World8.ensure(life).climate+' · '+
        World8.ensure(life).accent+' · 부모 직업·집·이름은 교육용 가상 설정.';
    }
    if(storyTab==='stats')paintSurvival();
    if(storyTab==='years')paintAgeMap();
    if(storyTab==='peers')paintPeers();
  }
  function render() {
    if (!life) return;
    paintLifeRecord();
    paintArc();
    $('placeFlag').textContent=life.country[1];
    $('placeName').textContent=life.country[0];
    $('currentYear').textContent=life.year+'년';
    $('currentAge').textContent=String(life.age);
    $('lifeStage').textContent=Sim.stages(life.age);
    $('chapterNumber').textContent=String(Math.floor(life.age/10)+1).padStart(2,'0');
    $('traitCountry').textContent=life.country[0]+' · '+life.gender;
    $('traitFamily').textContent=life.familyLevel+' · 가정 안에서도 다양한 경제 여건';
    $('traitCareer').textContent=life.career;
    $('storyTitle').textContent=life.getChoice()?.title || (life.age<6?'인생의 첫 장면':life.age<20?'세상을 배우는 날들':life.age<40?'나만의 길을 찾아서':life.age<65?'살아온 시간의 무게':'오늘이라는 선물');
    const current = life.log[life.log.length-1];
    $('storyCaption').textContent=life.getChoice()
      ? '이 선택은 앞으로의 삶에 영향을 줄 수 있습니다.'
      : current?.text || '인생은 천천히 흘러갑니다.';
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
    history.unshift({at:Date.now(),country:life.country[0],age:life.age,career:life.career});
    safeSet(RECORD_KEY,history.slice(0,20));
    return history.length;
  }
  function finish() {
    if(completed || !life || life.alive) return;
    completed=true;
    safeRemove(SAVE_KEY);
    const summary=life.summary();
    const choiceLog=life.log.filter(e=>e.kind==='decision');
    const count=rememberLife();
    $('endYears').textContent='2026 — '+life.year;
    $('endCountry').textContent=life.country[1]+' '+summary.country+' · '+life.profile.name+' ('+life.profile.city+')';
    $('endNetWorth').textContent=formatCredits(life.money.netWorth);
    $('endAge').textContent=summary.age+'년';
    $('endCareer').textContent=life.career;
    $('endStory').textContent=World8.synopsis(life)+'에서 시작했다. '+summary.story+' '+life.deathReason+' '+(life.world?.educationLevel||'')+' · '+life.career+'의 경로를 걸었다. '+(life.world6?.history?.length||0)+'개 직업 이력과 '+(life.world6?.eventCount||0)+'개 직업·생활 사건, '+(life.world5?.eventCount||0)+'개 지역 사건, 중요한 선택 '+choiceLog.length+'번이 삶을 바꾸었다.';
    const endChoices=$('endChoices');endChoices.replaceChildren();
    choiceLog.forEach(e=>{
      const item=document.createElement('li');item.className='end-choice-item';
      const age=document.createElement('b');age.textContent=e.age+'세';
      const text=document.createElement('span');text.textContent=e.text;
      const copy=document.createElement('div');copy.append(text);
      const effect=life.log.find(x=>x.kind==='decision-effect'&&x.age===e.age);
      const detail=document.createElement('small');detail.textContent=effect?.text||'선택 직후의 지표 변화 기록 없음';
      copy.append(detail);item.append(age,copy);endChoices.append(item);
    });
    showComparison();
    const list=$('endHighlights'); list.replaceChildren();
    const highlights=[...life.log.filter(e=>['milestone','decision','chain','world','safety','profession'].includes(e.kind))]
      .filter(e=>e.kind==='decision'||e.kind==='chain'||e.kind==='world'||e.kind==='safety'||e.kind==='profession'||e.age<21)
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
    if(!life.alive) return finish();
    render();
    if(life.pending || life.age%5===0) save();
  }
  function loop() {
    const now=performance.now();
    const delta=Math.max(0,Math.min(260,now-lastTick));
    lastTick=now;
    if(stage!=='play' || !life || !life.alive || life.pending || paused || document.hidden) return;
    elapsed+=delta;
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
  $('drawBtn').addEventListener('click',draw);
  $('lifeStartBtn').addEventListener('click',()=>startLife());
  $('againBtn').addEventListener('click',()=>{replayBasis=null;life=null;show('intro');refreshResume();draw();});
  $('sameBirthBtn').addEventListener('click',()=>{
    if(!life||life.alive)return;
    const snapshot=captureEnding(life);
    replayBasis=snapshot;
    life=new Sim.Life(snapshot.seed);
    World8.ensure(life);World8.moment(life);
    storyTab='';peerAgeChoice=0;
    peerCache=null;lastPeerRenderedAge=-1;lastMapRenderedAge=-1;
    $('birthCertificate').classList.add('hidden');
    $('birthFlag').textContent=life.country[1];
    $('birthCountry').textContent=life.country[0];
    $('birthDetail').textContent=life.gender+' · '+life.familyLevel+' · 2026년 출생';
    $('lifeStartBtn').classList.remove('hidden');
    paintCertificate();
    completed=false;paused=false;elapsed=0;
    show('birth');
  });
  $('resumeBtn').addEventListener('click',()=>{
    const restored=currentSave();
    if(!restored || !restored.alive){refreshResume();return;}
    life=restored;World8.ensure(life);replayBasis=safeGet(SAVE_KEY)?.replayBasis||null;completed=false;peerCache=null;lastPeerRenderedAge=-1;lastMapRenderedAge=-1;startLife(true);
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
