/* ONE LIFE / WORLD 3
   The 2024 life-expectancy baseline (at birth, all sexes) for the named subset is from
   World Bank indicator SP.DYN.LE00.IN: https://data.worldbank.org/indicator/SP.DYN.LE00.IN
   It is NOT a prediction of a player character's death. Where not explicitly listed
   values are broad game-model estimates. Education, socioeconomic and job access
   probabilities are illustrative and are NOT published country rates.
   Country is context, not a destiny: household/settlement and chance vary independently. */
(function(root,factory){
  const api=factory(root?.OneLifeSim,root?.OneLifeWorld2);
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  if(root)root.OneLifeWorld3=api;
})(typeof window!=='undefined'?window:null,function(Sim,World2){
  'use strict';
  const LIFE_2024=Object.freeze({
    '인도':72.23,'중국':78.02,'미국':78.89,'인도네시아':71.29,
    '파키스탄':67.80,'나이지리아':54.63,'브라질':76.02,'방글라데시':74.93,
    '러시아':73.44,'에티오피아':67.60,'멕시코':75.26,'일본':84.04,
    '이집트':71.81,'필리핀':69.95,'콩고민주공화국':62.07,'베트남':74.74,
    '독일':80.79,'대한민국':83.63,'프랑스':82.98,'영국':81.39,
    '캐나다':82.11,'케냐':63.83,'남아프리카공화국':66.31,'우간다':68.49,
    '스페인':83.89,'호주':83.05,'튀르키예':77.42,'이란':77.85,
    '네덜란드':81.97,'스위스':84.41,'아이티':65.12,'차드':55.24,
    '소말리아':58.97,'수단':66.52,'아프가니스탄':66.29,
    '말라위':67.56,'니제르':61.43,'사우디아라비아':78.98,
    '이탈리아':83.95,'말레이시아':76.82,'태국':76.56,
    '콜롬비아':77.91,'모로코':75.49,'모잠비크':63.80,
    '네팔':70.64,'탄자니아':67.21,'가나':65.69,'우크라이나':74.69,
    '폴란드':78.41,'스리랑카':77.67,
    '미얀마':67.09,'카자흐스탄':74.53,'라오스':69.22,
    '핀란드':82.34,'세네갈':68.92,'카메룬':63.97,'앙골라':64.81,
    '페루':77.94,'칠레':81.36,'캄보디아':70.82,'벨기에':82.30,
    '튀니지':76.71,'아르헨티나':77.54,'요르단':77.98,
    '니카라과':75.10,'과테말라':72.75,'도미니카공화국':73.87,
    '르완다':68.02,'북한':73.74
  });
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  function hash(seed,k){
    let x=(seed^Math.imul(0x9e3779b9,k+1))>>>0;
    x=Math.imul(x^(x>>>16),0x7feb352d);
    x=Math.imul(x^(x>>>15),0x846ca68b);
    return (x^(x>>>16))>>>0;
  }
  const roll=(seed,k)=>hash(seed,k)/4294967296;
  // Not country-average income data; converts the older generic economic index
  // into a much wider range of illustrative purchasing-power environments.
  function countryEconomy(country){
    return clamp(.15+2.45*Math.pow(country[3],2.7),.21,2.02);
  }
  function baseline(country){
    return LIFE_2024[country[0]]??clamp(44+42*(country[4]||.6),56,85);
  }
  function structuralContext(life){
    const countryIndex=life.country[3],healthIndex=life.country[4];
    const family=life.familyLevel,settlement=life.profile?.settlement;
    const rural=settlement==='농촌'?.16:settlement==='소도시'?.06:0;
    const household=family==='여유 있는 형편'?.13:family==='빠듯한 형편'?-.17:0;
    // Fictional route weights informed by the game's existing national opportunity
    // and health indices; they are not measured country rates or predictions.
    return {
      formalWorkAccess:clamp(.10+countryIndex*.68+household*.35-rural*.35,.08,.91),
      safetyNetAccess:clamp(.08+countryIndex*.70+household*.28-rural*.22,.06,.90),
      mobilityPressure:clamp(.07+(1-countryIndex)*.34+rural*.50+(family==='빠듯한 형편'?.12:0),.06,.68),
      healthcareAccess:clamp(.22+healthIndex*.65+household*.20-rural*.30,.12,.91)
    };
  }
  function setup(life){
    World2.enrich(life);
    if(life.world){Object.assign(life.world,structuralContext(life));return life.world;}
    const p=life.profile,seed=life.seed,schoolIndex=life.country[3],family=life.familyLevel;
    const bonus=family==='여유 있는 형편'?.18:family==='빠듯한 형편'?-.15:0;
    const rural=p.settlement==='농촌'?.13:p.settlement==='소도시'?.04:0;
    // Separate access and completion; no geography or family state guarantees a result.
    const schoolChance=clamp(.38+schoolIndex*.68+bonus-rural,.17,.99);
    const secondaryChance=clamp(.19+schoolIndex*.67+bonus*.7-rural*.65,.13,.96);
    const ppp=countryEconomy(life.country);
    const individual=roll(seed,48)*2-1;
    const healthResource=structuralContext(life).healthcareAccess;
    const target=clamp(baseline(life.country)+(family==='여유 있는 형편'?3:family==='빠듯한 형편'?-4:0)
      -(rural*9)+individual*7+(life.gender==='여자'?1:-1),45,94);
    const w={
      lifeBaseline:baseline(life.country),hasPublishedBaseline:Object.hasOwn(LIFE_2024,life.country[0]),
      mortalityTarget:target,schoolChance,secondaryChance,healthResource,economyScale:ppp,
      schooling:'미취학',educationLevel:'없음',educationYears:0,occupation:'가족과 성장 중',
      startedWorking:false,eventCount:0,turningPoints:0,opportunityNarrative:'',
      schoolRoll:roll(seed,29),secondaryRoll:roll(seed,30),
      vocationalRoll:roll(seed,31),scholarshipRoll:roll(seed,32),
      employmentBonus:roll(seed,33),healthExtra:roll(seed,34),...structuralContext(life)
    };
    life.world=w;
    p.familyIncome=Math.round(p.familyIncome*ppp);
    life.stats.knowledge=clamp(Math.round(life.stats.knowledge* (.64+.30*schoolIndex)+roll(seed,42)*10),8,85);
    life.logEvent('태어난 곳의 의료·교육·직업 기회는 평균적인 조건만 알려 줍니다. 이 아이의 삶은 아직 정해지지 않았습니다.','context');
    return w;
  }
  function childEvents(life){
    const w=setup(life),p=life.profile,age=life.age;
    if(age===6){
      if(w.schoolRoll<w.schoolChance){
        w.schooling='학교에 다니는 중';w.educationYears=1;w.educationLevel='기초 교육';
        life.logEvent(p.city+'의 학교에서 글과 숫자를 배우기 시작했다.','milestone');
      }else{
        w.schooling='학교까지 먼 통학·돌봄·비용의 어려움';w.educationLevel='가정·지역 배움';
        life.logEvent('집안 사정이나 통학 문제로 학교에 바로 다니지 못했다. 지역의 도움과 다른 배움의 길을 찾았다.','milestone');
        life.change({happiness:-2,knowledge:-4});
      }
    }
    if(age>=7 && age<=15){
      if(w.schooling==='학교에 다니는 중'){
        w.educationYears++;life.change({knowledge:1});
      }else if(age===10 || age===13){
        // Informal education and late enrollment offer another path.
        if(life.rand()<.16+.3*w.schoolChance){
          w.schooling='늦게 학교에 다니기 시작함';w.educationYears+=2;w.educationLevel='기초 교육';
          life.logEvent('지역의 도움으로 뒤늦게 학교에서 배울 기회를 얻었다.','milestone');
        }else {
          w.educationYears+=1;life.logEvent('일과 집안일 사이에서 틈틈이 글과 기술을 익혔다.','event');
        }
      }else if(w.schooling==='늦게 학교에 다니기 시작함'){w.educationYears++;}
    }
    if(age===16){
      const attended=w.educationYears>=5;
      if(attended && w.secondaryRoll<w.secondaryChance){
        w.educationLevel='중등 과정 이수';w.schooling='중등 과정 마침';
        life.change({knowledge:8});life.logEvent('중등 과정을 마치고 새로운 진로를 알아보았다.','milestone');
      }else{
        w.educationLevel=attended?'기초 교육':'지역·자율 학습';
        life.logEvent('학업을 일찍 마치거나 다른 배움의 길을 찾으며 일을 준비했다.','milestone');
      }
    }
  }
  const OCCUPATIONS={
    '농촌':['농업·식품 생산','수공예·자영업','지역 상점 운영','지역 보건·교육','기술·수리 업무'],
    '도시':['사무·서비스 업무','판매·상점 운영','보건·돌봄 서비스','정보·기술 업무','운송·물류'],
    '소도시':['지역 서비스업','기술·수리 업무','농업·식품 가공','자영업','지역 행정·교육']
  };
  function startWork(life){
    const w=setup(life),p=life.profile,choice=OCCUPATIONS[p.settlement]||OCCUPATIONS['도시'];
    const workRoll=roll(life.seed,37),access=w.formalWorkAccess;
    let n=Math.floor(workRoll*choice.length);
    if(workRoll>.56+(access*.30)){
      w.occupation=p.settlement==='농촌'?'가족 생업·계절 일자리':p.settlement==='소도시'?'지역 상점·임시 일자리':'단기·비공식 서비스 일자리';
    }else if(workRoll<access*.28&&w.educationYears>=5){
      w.occupation=['교육·행정 보조','보건·돌봄 서비스','기술·사무 업무'][Math.floor(roll(life.seed,38)*3)];
    }else if(w.educationLevel==='중등 과정 이수' && w.employmentBonus>.78)n=3;
    else w.occupation=choice[n];
    w.startedWorking=true;
    if(life.career==='학생')return;
    if(life.career==='진로 탐색 중')life.career='일자리 탐색 중';
    else life.career=w.occupation;
    life.logEvent(w.occupation+' 분야에서 첫 일자리를 알아보기 시작했다.','milestone');
  }
  function variedEvents(life){
    const age=life.age,w=setup(life),p=life.profile;
    if(age===20 && life.career==='학생'){
      const grant=clamp(w.secondaryChance+.1+(life.familyLevel==='여유 있는 형편'?.16:0),.18,.95);
      if(w.educationLevel!=='중등 과정 이수' && w.scholarshipRoll>grant){
        life.career='직업 기술을 배우는 중';w.occupation='현장 실습생';
        life.logEvent('더 공부하려 했지만 입학·비용의 벽이 있었다. 대신 현장 기술을 배우기 시작했다.','milestone');
      }else{
        w.educationLevel='고등 교육·훈련 중';
        life.logEvent('장학금·교육기관의 기회 또는 가족의 도움으로 공부를 이어 갔다.','milestone');
      }
    }
    if(age===24 && w.educationLevel==='고등 교육·훈련 중'){
      w.educationLevel='고등 교육·훈련 수료';
      life.logEvent('교육·훈련 과정을 마치고 전문성을 살릴 일자리를 찾아보았다.','milestone');
    }
    if(age===25 && life.career==='학생'){w.educationLevel='고등 교육·훈련 수료';life.career='전문 분야 종사자';life.logEvent('교육·훈련을 마치고 관련 일을 시작했다.','milestone');}
    if(age===20||age===24){
      if(age===20 && !w.startedWorking && life.career!=='학생')startWork(life);
      if(age===24 && !w.startedWorking)startWork(life);
    }
    if(age===29 && life.career==='진로 탐색 중')startWork(life);
    // Stage-specific good and bad experiences occur across all countries.
    if(age===12 && life.rand()<.30){life.logEvent('같은 동네의 사람들과 축제·모임에서 새로운 문화를 접했다.','event');life.change({bonds:5,happiness:3});}
    if(age===23 && life.rand()<.25){life.logEvent('잘 풀리지 않던 구직과 생활을 다시 계획했다.','event');life.change({knowledge:2,happiness:-3});}
    if(age===31 || age===46 || age===60){
      const incomeGood=life.money?.lastBalance>0;
      const rollEvent=life.rand();
      if(rollEvent<.23+.16*(1-w.healthResource)){
        life.change({health:-5,happiness:-3});
        life.logEvent('병원이나 약국을 찾아 치료받을 일이 생겨 시간과 생활비가 필요했다.','event');
        if(life.money && w.healthResource<.55)life.money.netWorth-=Math.round(3600*(1-w.healthResource));
      }else if(rollEvent<.55){
        life.change({knowledge:4,bonds:3});
        life.logEvent(incomeGood?'모아 둔 돈으로 새로운 기술을 배우기 시작했다.':'이웃의 도움으로 새로운 일을 배울 기회를 얻었다.','event');
      }else{
        life.change({happiness:4,bonds:3});
        life.logEvent('가까운 사람들과 어울리며 좋아하는 일을 함께 해냈다.','event');
      }
    }
    if(age===18 && w.schooling!=='중등 과정 마침' && w.occupation==='가족과 성장 중'){
      life.logEvent('배운 과정과 가정 사정에 맞는 진로를 찾기 시작했다.','milestone');
    }
    const rollMove=life.rand();
    const moveChance=clamp(.08+w.mobilityPressure*.42+w.formalWorkAccess*.10,.07,.48);
    if((age===25||age===38||age===52) && rollMove<moveChance){
      const names=World2.METADATA[life.country[0]]||['도시 지역','작은 마을'];
      const where=names[Math.floor(life.rand()*names.length)];
      if(where!==p.city){p.city=where;life.logEvent('새로운 일과 기회를 찾아 '+where+'(으)로 이사했다.','milestone');}
    }
    // Not every country event is a catastrophe; randomly emerging paths include
    // support networks, schooling, migration, work transitions and medical needs.
  }
  function automaticDecision(life){
    const choice=life.getChoice();
    if(!choice)return;
    let index=Math.floor(life.rand()*choice.options.length);
    const w=setup(life);
    if(choice.age===20){
      const moreSchool=w.educationLevel==='중등 과정 이수' ? .47 : .14;
      if(life.rand()<moreSchool)index=0;
      else if(life.rand()<.70)index=1;
      else index=2;
    }
    if(choice.age===33)index=life.rand()<.38?0:life.rand()<.55?1:2;
    if(choice.age===37)index=life.rand()<.34?0:life.rand()<.7?1:2;
    if(choice.age===64)index=life.money?.netWorth<0?1:Math.floor(life.rand()*3);
    life.choose(index);
    w.turningPoints++;
  }
  const PAUSE_AGES=Object.freeze([16,20,29,42,64]);
  function install(){
    if(!Sim?.Life||!World2?.enrich||Sim.Life.prototype.__world3)return false;
    const Life=Sim.Life,priorTick=Life.prototype.tick,priorChoose=Life.prototype.choose,priorSnapshot=Life.prototype.snapshot,priorRestore=Life.restore;
    Life.prototype.tick=function(){
      if(!this.alive||this.pending)return false;
      setup(this);
      const result=priorTick.call(this);
      if(!result)return false;
      if(!this.alive)return true;
      childEvents(this);
      variedEvents(this);
      if(this.pending && !PAUSE_AGES.includes(this.age)){
        if(this.getReflection())this.reflect();
        else automaticDecision(this);
      }
      return true;
    };
    Life.prototype.choose=function(index){
      const ok=priorChoose.call(this,index);
      if(ok){
        setup(this);
        if(this.age===20 && this.career==='학생')variedEvents(this);
        if(this.age===24 && this.career!=='학생' && !this.world.startedWorking)startWork(this);
        if(this.age===64 && this.world)this.world.turningPoints++;
      }
      return ok;
    };
    Life.prototype.snapshot=function(){setup(this);return {...priorSnapshot.call(this),world:{...this.world}};};
    Life.restore=function(data){
      const life=priorRestore.call(this,data);
      if(!life)return null;
      // Initial setup changes newborn statistics and inserts a birth-context log.
      // Never reapply these one-time changes when loading an existing life.
      const restoredStats={...life.stats};
      const restoredLog=life.log.map(e=>({...e}));
      setup(life);
      life.stats=restoredStats;
      life.log=restoredLog;
      if(data.world && typeof data.world==='object'){
        for(const k of ['schooling','educationLevel','occupation','opportunityNarrative'])
          if(typeof data.world[k]==='string')life.world[k]=data.world[k].slice(0,100);
        for(const k of ['educationYears','eventCount','turningPoints'])
          if(Number.isFinite(data.world[k]))life.world[k]=clamp(data.world[k],0,110);
        life.world.startedWorking=data.world.startedWorking===true;
      }
      return life;
    };
    Object.defineProperty(Life.prototype,'__world3',{value:true});
    return true;
  }
  install();
  return Object.freeze({install,setup,baseline,structuralContext,PAUSE_AGES,LIFE_2024,countryEconomy,childEvents,automaticDecision});
});