/* 단 하나의 인생: 출생 추첨, 자동 시간, 선택, 기록 화면 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const Sim = window.OneLifeSim;
  if (!Sim) throw new Error('OneLifeSim engine not loaded');
  const World2 = window.OneLifeWorld2;
  const Pixel = window.OneLifeScenes6 || window.OneLifeScene;
  const World3 = window.OneLifeWorld3;
  const World4 = window.OneLifeWorld4;
  const World5 = window.OneLifeWorld5;
  const World6 = window.OneLifeWorld6;
  if (!World2 || !Pixel || !World3 || !World4 || !World5 || !World6) throw new Error('One Life world assets missing');
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
    World6.ensure(life);
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
    $('birthCertificate').classList.remove('hidden');
  }
  function paintLifeRecord() {
    const p=World2.enrich(life).profile;
    const money=life.money;
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
    $('traitRegion').textContent=p.settlement+' · '+p.city;
    $('countryContextText').textContent=life.world?.schooling+' · 지역 경제 기회 '+(life.world?.economyScale>=1?'상대적으로 넓은 편':'상대적으로 제한적인 편');
    $('countrySourceNote').textContent=life.world?.hasPublishedBaseline
      ? '2024 세계은행 출생 시 기대수명 '+life.world.lifeBaseline.toFixed(1)+'세 · 학교·직업 기회는 가상 모델, 개인 수명 예측이 아님'
      : '국가별 평균 수명은 게임 추정치 · 교육·일자리 조건도 게임용 모델';
    const sceneName=Pixel.paint($('lifeScene'),life);
    const sceneTitle=Pixel.names?.[sceneName]||sceneName;
    $('sceneLabel').textContent=life.year+'년 · '+life.country[0]+' '+p.city+' · '+sceneTitle+'에서 보내는 하루';
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
      netWorth:life.money.netWorth,health:life.stats.health,
      child:!!life.profile.child,partner:!!life.profile.partner,
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
      ['살아온 기간',replayBasis.age+'세',now.age+'세'],
      ['삶의 방향',replayBasis.career,now.career],
      ['거쳐 온 직업',replayBasis.roles?.join(' → ')||'없음',now.roles?.join(' → ')||'없음'],
      ['교육 경험',replayBasis.education,now.education],
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
  function paintPeers() {
    const board=$('peers');
    if(!life || !board)return;
    if(life.age===lastPeerRenderedAge || (life.age%4!==0 && life.age!==0 && !life.pending))return;
    lastPeerRenderedAge=life.age;
    if(!peerCache || peerCache.seed!==life.seed){
      peerCache={seed:life.seed,people:Array.from({length:4},(_,i)=>new Sim.Life((life.seed+Math.imul(i+1,2654435761))>>>0))};
    }
    board.replaceChildren();
    for(const peer of peerCache.people){
      let guard=0;
      while(peer.alive && peer.age<life.age && guard++<140){
        if(peer.pending){
          const decision=peer.getChoice();
          if(decision)peer.choose(Math.floor(peer.rand()*decision.options.length));
          else if(peer.getReflection())peer.reflect();
          else break;
        } else peer.tick();
      }
      const card=document.createElement('div');card.className='peer';
      const flag=document.createElement('span');flag.className='peer-flag';flag.textContent=peer.country[1];
      const label=document.createElement('b');label.textContent=peer.country[0];
      const age=document.createElement('small');
      age.textContent=peer.alive?peer.age+'세 · 살아가는 중':peer.age+'세 · 삶을 마침';
      card.append(flag,label,age);board.append(card);
    }
  }
  function paintAgeMap() {
    const board=$('ageMap');if(!board||!life || (life.age===lastMapRenderedAge) || (life.age%4!==0 && !life.pending))return;
    lastMapRenderedAge=life.age;
    board.replaceChildren();
    for(let year=0;year<108;year++) {
      const box=document.createElement('span');box.className='age-cell';
      if(year<=life.age) box.classList.add(year<7?'child':year<19?'teen':year<35?'young':year<65?'adult':'elder');
      if(year===life.age) box.classList.add('now');
      const entry=life.log.find(e=>e.age===year&&(e.kind==='decision'||e.kind==='reflection'));
      if(entry)box.classList.add('landmark');
      box.title=year+'세'+(entry?(' · '+entry.text):'');
      board.append(box);
    }
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
    $('traitFamily').textContent=life.familyLevel;
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
    paintAgeMap();
    document.querySelectorAll('[data-focus]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.focus===life.focus)));
    showDecision();
    updatePause();
  }
  function startLife(fromSave=false) {
    if (!life) return;
    if(!fromSave) safeRemove(SAVE_KEY);
    paused=false; elapsed=0; lastTick=performance.now();
    show('play');
    render();
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
    $('endStory').textContent=summary.story+' '+life.deathReason+' '+(life.world?.educationLevel||'')+' · '+life.career+'의 경로를 걸었다. '+(life.world6?.history?.length||0)+'개 직업 이력과 '+(life.world6?.eventCount||0)+'개 직업·생활 사건, '+(life.world5?.eventCount||0)+'개 지역 사건, 중요한 선택 '+choiceLog.length+'번이 삶을 바꾸었다.';
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
    World6.ensure(life);
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
    life=restored;replayBasis=safeGet(SAVE_KEY)?.replayBasis||null;completed=false;peerCache=null;lastPeerRenderedAge=-1;lastMapRenderedAge=-1;startLife(true);
  });
  $('pauseBtn').addEventListener('click',togglePause);
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
