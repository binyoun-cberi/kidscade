from pathlib import Path

p=Path('outbreak_korea_v3.html')
s=p.read_text(encoding='utf-8')

def replace_between(start,end,new):
    global s
    a=s.find(start)
    assert a>=0, f'missing start: {start}'
    b=s.find(end,a)
    assert b>=0, f'missing end: {end}'
    s=s[:a]+new+'\n'+s[b:]

# CSS: number milestone feedback
s=s.replace('/* v3.3 · transport network + people-count infection view */', '''/* v3.4 · true integer population simulation */
#nationalPct.caseMilestone{display:inline-block;animation:caseShock .75s ease-out;color:#ff7b82;text-shadow:0 0 12px rgba(255,63,74,.6)}
@keyframes caseShock{0%{transform:scale(1)}35%{transform:scale(1.42)}100%{transform:scale(1)}}

/* v3.3 · transport network + people-count infection view */''',1)

# Core count helpers. Infected/recovered are now integer people, never percentages.
replace_between('function regionPopulation(r){','function colorFor(p){', '''function regionPopulation(r){return Math.max(1,Math.round(r.pop*10000))}
function regionInfectedCount(r){return Math.max(0,Math.round(state.regions[r.id].infected))}
function regionInfectedRate(r){return clamp(regionInfectedCount(r)/regionPopulation(r),0,1)}
function totalPopulation(){return regions.reduce((sum,r)=>sum+regionPopulation(r),0)}
function totalInfectedCount(){return regions.reduce((sum,r)=>sum+regionInfectedCount(r),0)}
function totalRecoveredCount(){return regions.reduce((sum,r)=>sum+Math.max(0,Math.round(state.regions[r.id].recovered||0)),0)}
function formatPeople(n){return `${Math.max(0,Math.round(n)).toLocaleString('ko-KR')}명`}
function stochasticCount(expected){if(expected<=0)return 0;const whole=Math.floor(expected),frac=expected-whole;return whole+(Math.random()<frac?1:0)}
function checkCaseMilestone(){if(state.phase!==1)return;const total=totalInfectedCount();while(total>=state.nextCaseMilestone&&state.nextCaseMilestone<=10000000){const mark=state.nextCaseMilestone;addNews('감염 규모 증가',`전국 감염자가 ${formatPeople(mark)}을 넘어섰습니다.`);state.dna+=2;const el=$('#nationalPct');if(el){el.classList.remove('caseMilestone');void el.offsetWidth;el.classList.add('caseMilestone')}state.nextCaseMilestone*=10}}
''')

# State milestone field
old="specialReadyDay:1,specialBuffUntil:0,done:false,maxMedical:0}"
new="specialReadyDay:1,specialBuffUntil:0,done:false,maxMedical:0,nextCaseMilestone:10}"
assert old in s
s=s.replace(old,new,1)

# National calculations now derive ratios from integer people.
replace_between('function nationalInfected(){','function govLevel(){', '''function nationalInfected(){return clamp(totalInfectedCount()/totalPopulation(),0,1)}
function infectedRegions(){return regions.filter(r=>state.regions[r.id].infected>0).length}
''')

# First case really is one person.
assert 'rr.infected=.012;rr.daysInfected=1;' in s
s=s.replace('rr.infected=.012;rr.daysInfected=1;','rr.infected=1;rr.daysInfected=1;rr.recovered=0;state.nextCaseMilestone=10;',1)

# Specials use people counts.
replace_between('function useSpecial(){','function regionFactor(r){', '''function useSpecial(){if(state.phase!==1||state.day<state.specialReadyDay)return;const t=pathogenTypes[state.type];state.specialReadyDay=state.day+t.cooldown;if(state.type==='세균형'){state.specialBuffUntil=state.day+12;addNews('적응 전환','현재 계절에 대한 적응력이 일시적으로 상승했습니다.')}else if(state.type==='바이러스형'){mutateFree()}else if(state.type==='진균형'){const src=regions.filter(r=>state.regions[r.id].infected>=100),targets=regions.filter(r=>state.regions[r.id].infected===0);if(src.length&&targets.length){const tar=targets[Math.floor(Math.random()*targets.length)];state.regions[tar.id].infected=1+Math.floor(Math.random()*3);addNews('확산 도약',`${tar.name}에서 첫 감염자 ${formatPeople(state.regions[tar.id].infected)}이 확인되었습니다.`)}}else if(state.type==='기생형'){state.eventMods.attention=-.7;state.specialBuffUntil=state.day+10;addNews('조용한 공존','10일 동안 정부 관심도 상승이 크게 둔화됩니다.')}else{const rr=state.regions[state.selected];rr.pressure+=.7;state.specialBuffUntil=state.day+15;addNews('지속 강화',`${byId[state.selected].name}에서 장기 정착력이 강화되었습니다.`)}renderAll()}
''')

# Red dots are based on actual case counts; 1-9 cases literally show 1-9 dots.
replace_between('function renderInfectionDots(){','function updateTransportHubs(){', '''function renderInfectionDots(){
 const layer=$('#infectionDotsLayer');if(!layer)return;const ns='http://www.w3.org/2000/svg';
 for(const r of regions){const rr=state.regions[r.id],shape=document.querySelector(`.region[data-id="${r.id}"] .fill`);if(!shape)continue;const infected=regionInfectedCount(r),rate=regionInfectedRate(r);let count=0;if(infected>0&&infected<10)count=infected;else if(infected>=10)count=Math.min(120,Math.max(9,Math.round(9+(Math.log10(infected)-1)*20+Math.pow(rate,.55)*32)));let g=layer.querySelector(`g[data-dots="${r.id}"]`);
   if(!g){g=document.createElementNS(ns,'g');g.dataset.dots=r.id;g.setAttribute('clip-path',`url(#region-clip-${r.id})`);layer.appendChild(g)}
   if(Number(g.dataset.count||-1)===count)continue;g.dataset.count=count;g.innerHTML='';const b=shape.getBBox(),seed=regionSeed(r.id);
   for(let i=0;i<count;i++){const c=document.createElementNS(ns,'circle'),rx=hash01(seed+i*17+1),ry=hash01(seed+i*29+7);c.setAttribute('class','infectionDot');c.setAttribute('cx',b.x+rx*b.width);c.setAttribute('cy',b.y+ry*b.height);c.setAttribute('r',String(1.55+Math.min(1.5,rate*2.4)));g.appendChild(c)}
 }
}
''')

replace_between('function updateTransportHubs(){','function transportBoost(type){', '''function updateTransportHubs(){for(const h of transportHubs){const g=document.querySelector(`.transportHub[data-hub="${h.id}"]`);if(g)g.classList.toggle('hot',state.regions[h.region].infected>=100)}}
''')

# Transport movement seeds actual travellers/cases, not fractions of a province.
replace_between('function transportSpreadStep(defenseMode=false){','function selectRegion(id){', '''function transportSpreadStep(defenseMode=false){
 for(const h of transportHubs){const src=state.regions[h.region];if(!src||src.infected<10)continue;const meta=transportMeta[h.type],srcRate=regionInfectedRate(byId[h.region]),mobility=clamp(Math.log10(src.infected+1)/7,.08,1);let chance=meta.rate*5.5*(.35+mobility+srcRate*.8)*transportBoost(h.type);
   if(defenseMode)chance*=Math.max(.18,Math.min(1.15,state.r/1.8))*(1-Math.min(.62,state.response.control*.10));if(Math.random()>=chance)continue;
   let targets=transportHubs.filter(x=>x.type===h.type&&x.region!==h.region);if(h.type==='bus')targets=targets.filter(x=>byId[h.region].links.includes(x.region));if(!targets.length)continue;const target=targets[Math.floor(Math.random()*targets.length)],trr=state.regions[target.region],pop=regionPopulation(byId[target.region]);let seed=Math.max(1,Math.round(Math.log10(src.infected+1)*(h.type==='airport'?1.8:h.type==='ktx'?1.5:h.type==='bus'?1.1:.9)));seed+=Math.floor(Math.random()*3);if(defenseMode)seed=Math.max(1,Math.ceil(seed*.55));const before=trr.infected;trr.infected=Math.min(pop,Math.round(trr.infected+seed));if(trr.infected>before){flashTransport(h,target,h.type);if(before===0||Math.random()<.12)addNews(`${transportMeta[h.type].label} 유입`,`${h.name}에서 ${target.name} 방향으로 감염자 ${formatPeople(seed)}이 이동했습니다.`)}}
 }
}
''')

# Phase 1: integer-case stochastic exponential growth with saturation.
replace_between('function phase1Tick(){','function phase2Tick(){', '''function phase1Tick(){
 state.tick++;if(state.tick%10===0){state.day++;if(state.specialBuffUntil&&state.day>state.specialBuffUntil&&state.type==='기생형')state.eventMods.attention=0}
 const govPenalty=1-(state.attention/100)*(.38-state.stats.resilience*.06),evoCount=state.bought.size,evoFactor=clamp(.10+evoCount*.055,.10,1);
 const routeNodes=['air1','water1','saliva1','blood1','animal1','bird1','rodent1','insect1'],routeBought=routeNodes.some(id=>state.bought.has(id));
 const travelUnlocked=routeBought||state.bought.has('regional')||state.bought.has('transit')||state.bought.has('road')||state.bought.has('long')||state.bought.has('gather');
 const travelGate=travelUnlocked?clamp(.26+evoCount*.065+state.stats.travel*.14,.26,1):.012;
 for(const r of regions){const rr=state.regions[r.id];if(rr.infected<=0)continue;rr.daysInfected++;const pop=regionPopulation(r),rate=rr.infected/pop,susceptible=Math.max(0,pop-rr.infected-rr.recovered);let growthRate=.055*state.stats.spread*govPenalty*evoFactor*(1+state.eventMods.spread)*regionFactor(r)*(1+rr.pressure*.12);if(state.bought.has('gather'))growthRate*=1+state.stats.eventSpread*.06;let expected=rr.infected*growthRate*(susceptible/pop);if(rr.infected<10)expected+=.022+evoCount*.0035;let newCases=Math.min(susceptible,stochasticCount(expected));const extraPersist=(state.type==='진균형'?.55:0)+(state.type==='비정형형'?.35:0)+rr.pressure;const recoverRate=rr.infected>=100?.0014/(1+state.stats.persist+extraPersist):0;const recovered=Math.min(rr.infected,stochasticCount(rr.infected*recoverRate));rr.infected=Math.max(0,Math.min(pop,Math.round(rr.infected+newCases-recovered)));rr.recovered=Math.min(pop,Math.round(rr.recovered+recovered));
   const mobility=clamp(Math.log10(rr.infected+1)/7,.03,1);if(Math.random()<.0055*travelGate*(.48+state.stats.travel+state.eventMods.travel)*(.18+mobility)){const target=r.links[Math.floor(Math.random()*r.links.length)];if(target&&Math.random()<routeGate(target)){const tar=state.regions[target],tarPop=regionPopulation(byId[target]),seed=Math.max(1,Math.floor(1+mobility*5));tar.infected=Math.min(tarPop,tar.infected+seed)}}
 }
 for(const r of regions){const rr=state.regions[r.id];if(rr.infected>=100){const mobility=clamp(Math.log10(rr.infected+1)/7,.05,1);for(const lid of r.links){if(Math.random()<.0022*travelGate*state.stats.spread*(.42+state.stats.travel+state.eventMods.travel)*mobility*routeGate(lid)){const tar=state.regions[lid],tarPop=regionPopulation(byId[lid]);tar.infected=Math.min(tarPop,tar.infected+Math.max(1,Math.round(mobility*4)))}}}}
 if(state.bought.has('long')&&Math.random()<.008*(1+state.stats.travel)){const targets=regions.filter(r=>state.regions[r.id].infected===0&&(r.id!=='ulleungdo'||routeGate('ulleungdo')>.18));if(targets.length){const t=targets[Math.floor(Math.random()*targets.length)];state.regions[t.id].infected=1+Math.floor(Math.random()*3)}}
 if(state.type==='진균형'&&state.bought.size>=2&&Math.random()<.0010*evoFactor){const targets=regions.filter(r=>state.regions[r.id].infected===0&&r.id!=='ulleungdo');if(targets.length){const t=targets[Math.floor(Math.random()*targets.length)];state.regions[t.id].infected=1;addNews('예상 밖 지역 유입',`${t.name}에서 첫 감염자 1명이 확인됩니다.`)}}
 transportSpreadStep(false);const nat=nationalInfected(),cases=totalInfectedCount(),sev=Math.max(0,state.stats.severity),caseSignal=clamp((Math.log10(cases+1)-2)/6,0,1);let att=(nat*.82+caseSignal*.018+sev*.045-state.stats.stealth*.006)*(1+state.eventMods.attention);if(state.type==='기생형')att*=.78;if(state.type==='비정형형')att*=.86;state.attention=clamp(state.attention+Math.max(0,att),0,100);
 if(state.tick%7===0)state.dna+=Math.max(1,Math.floor(infectedRegions()/5));if(state.day===18&&state.tick%10===0&&state.manualEvolutions===0)addNews('확산 정체','기본 상태만으로는 전국 확산이 어렵습니다. 진화 트리에서 전파 방식과 지역 적응을 선택해 전략을 만드세요.');checkCaseMilestone();maybeMutation();maybeEvent();recordHistory();
 if(nat>=.70&&infectedRegions()>=16&&state.regions.ulleungdo.infected>=1&&state.manualEvolutions>=4)beginTransition()
}
''')

# Phase 2: counts remain integers; R controls new cases vs recoveries.
replace_between('function phase2Tick(){','function maybeEvent(){', '''function phase2Tick(){state.tick++;if(state.tick%10===0)state.day++;const analysisPenalty=state.type==='비정형형'?.72:1;state.analysis=clamp(state.analysis+(.24+state.response.analysis*.14)*analysisPenalty,0,100);if(state.tick%12===0)state.research+=Math.max(1,Math.floor(1+state.response.researchRate));const coopFactor=.75+state.coop/400;const localAverage=regions.reduce((sum,r)=>sum+state.regions[r.id].localControl,0)/regions.length;const baseR=1.78+state.stats.spread*.17+state.stats.travel*.08-state.response.control*.58*coopFactor-localAverage*.04;state.r=clamp(baseR,.42,3.6);for(const r of regions){const rr=state.regions[r.id];if(rr.infected<=0)continue;const pop=regionPopulation(r),susceptible=Math.max(0,pop-rr.infected-rr.recovered),localCtrl=rr.localControl*(.25+state.response.localPower*.2),effectiveR=clamp(state.r-localCtrl,.18,3.8),therapyBoost=1+(state.therapySupply/100)*(.65+Math.max(0,state.response.therapyEfficiency)*.25),recoveryRate=(.0042+state.response.recovery*.0017+rr.localMedical*.0010)*therapyBoost,preventionFactor=clamp(1-(state.preventionSupply/100)*(.42+Math.max(0,state.response.preventionEfficiency)*.16),.30,1);const newCases=Math.min(susceptible,stochasticCount(rr.infected*recoveryRate*effectiveR*preventionFactor*(susceptible/pop))),recovered=Math.min(rr.infected,stochasticCount(rr.infected*recoveryRate));rr.infected=Math.max(0,Math.min(pop,Math.round(rr.infected+newCases-recovered)));rr.recovered=Math.min(pop,Math.round(rr.recovered+recovered));rr.localControl*=.997;rr.localMedical*=.997;rr.localCoop*=.997;for(const lid of r.links){if(state.r>1&&rr.infected>=50&&Math.random()<.0010*state.r){const tar=state.regions[lid],tarPop=regionPopulation(byId[lid]);tar.infected=Math.min(tarPop,tar.infected+1)}}}if(state.r>1)transportSpreadStep(true);const totalInf=totalInfectedCount(),totalPop=totalPopulation(),shield=1-state.response.overloadShield*.28;state.medicalLoad=clamp(((totalInf/totalPop)*155-state.medicalCap*.13)*shield,0,140);state.maxMedical=Math.max(state.maxMedical,state.medicalLoad);const decay=(.015*(1-Math.min(.72,state.response.coopDecay))+(state.medicalLoad>95?.028:0))*state.speed;state.coop=clamp(state.coop-decay/state.speed,0,100);if(state.phase2Bought.has('therapy'))state.therapy=clamp(state.therapy+(.25+.12*state.response.therapy),0,100);if(state.phase2Bought.has('prevention'))state.prevention=clamp(state.prevention+(.22+.11*state.response.prevention),0,100);if(state.therapy>=100)state.therapySupply=clamp(state.therapySupply+(.18+.08*state.response.production),0,100);if(state.prevention>=100)state.preventionSupply=clamp(state.preventionSupply+(.16+.075*state.response.production),0,100);if(state.day%3===0&&state.tick%10===0)state.budget=Math.min(99,state.budget+1);maybeEvent();recordHistory();if((nationalInfected()<.018&&state.r<1)||(state.therapySupply>=75&&nationalInfected()<.04))finishGame(true);if(state.coop<=1&&state.medicalLoad>=118)finishGame(false)}
''')

# History is actual case count; chart displays log growth so 1 -> 10 -> 100 is visible.
assert "function recordHistory(){if(state.tick%5!==0)return;state.history.push(nationalInfected());if(state.history.length>80)state.history.shift()}" in s
s=s.replace("function recordHistory(){if(state.tick%5!==0)return;state.history.push(nationalInfected());if(state.history.length>80)state.history.shift()}","function recordHistory(){if(state.tick%5!==0)return;state.history.push(totalInfectedCount());if(state.history.length>80)state.history.shift()}",1)
replace_between('function renderChart(){','function renderObjective(){', '''function renderChart(){const c=$('#trendChart'),ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.clearRect(0,0,w,h);ctx.strokeStyle='#27483e';ctx.lineWidth=1;for(let i=1;i<4;i++){const y=h*i/4;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}const arr=state.history;if(arr.length<2)return;const maxLog=Math.log10(totalPopulation()+1);ctx.strokeStyle=state.phase===1?'#ff5b64':'#6ab7ff';ctx.lineWidth=2;ctx.beginPath();arr.forEach((v,i)=>{const x=i/(arr.length-1)*(w-4)+2,scaled=Math.log10(Math.max(0,v)+1)/maxLog,y=h-2-clamp(scaled,0,1)*(h-6);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.stroke()}
''')

# Region card: no infection percentage; show people counts only.
replace_between('function renderRegionInfo(){','function renderNews(){', '''function renderRegionInfo(){const r=byId[state.selected],rr=state.regions[r.id];let actions='';if(state.phase===2)actions=`<div class="regionActionGrid"><button class="regionAction" data-local="test"><b>🔎 집중검사 · 💰4</b><small>분석 + 지역 억제</small></button><button class="regionAction" data-local="medical"><b>🏥 의료지원 · 💰5</b><small>지역 회복 + 수용력</small></button><button class="regionAction" data-local="comm"><b>📢 소통 · 💰3</b><small>협조도 회복</small></button><button class="regionAction" data-local="restrict"><b>🚧 이동관리 · 💰6</b><small>강한 억제 · 협조도 감소</small></button></div>`;const hubs=transportHubs.filter(h=>h.region===r.id),pop=regionPopulation(r),infected=regionInfectedCount(r),recovered=Math.max(0,Math.round(rr.recovered||0)),uninfected=Math.max(0,pop-infected-recovered);$('#regionInfo').innerHTML=`<div class="regionCard"><div class="name">${r.name}</div><div class="tagRow">${r.traits.map(t=>`<span class="badge">${t}</span>`).join('')}</div>${hubs.length?`<div class="tagRow transportTags">${hubs.map(h=>`<span class="badge">${transportMeta[h.type].icon} ${h.name}</span>`).join('')}</div>`:''}<div class="kv"><span>전체 인구</span><strong>${formatPeople(pop)}</strong></div><div class="kv"><span>현재 감염자</span><strong class="dangerText">${formatPeople(infected)}</strong></div><div class="kv"><span>회복</span><strong>${formatPeople(recovered)}</strong></div><div class="kv"><span>아직 감염되지 않음</span><strong>${formatPeople(uninfected)}</strong></div>${state.phase===2?`<div class="kv"><span>지역 억제</span><strong>${rr.localControl.toFixed(2)}</strong></div><div class="kv"><span>전국 의료부하</span><strong>${Math.round(state.medicalLoad)}%</strong></div>`:''}${actions}</div>`;$$('[data-local]').forEach(b=>b.addEventListener('click',()=>localAction(b.dataset.local)))}
''')

# Objective and end screen use people counts; Ulleung entry is one actual case.
s=s.replace("const target=Math.round(totalPopulation()*.70),ulleung=state.regions.ulleungdo.infected>.005;","const target=Math.round(totalPopulation()*.70),ulleung=state.regions.ulleungdo.infected>=1;",1)
replace_between('function finishGame(win){','function pulse(){', '''function finishGame(win){if(state.done)return;state.done=true;state.speed=0;$('#helpBody').innerHTML=`<h2>${win?'대한민국 회복':'대응 실패'}</h2><p>${win?'감염 확산을 통제했습니다.':'의료체계와 사회 협조가 동시에 붕괴했습니다.'}</p><div class="regionCard"><div class="kv"><span>병원체</span><strong>${state.name} · ${state.type}</strong></div><div class="kv"><span>빌드</span><strong>${computeBuild()}</strong></div><div class="kv"><span>현재 감염자</span><strong>${formatPeople(totalInfectedCount())}</strong></div><div class="kv"><span>누적 회복</span><strong>${formatPeople(totalRecoveredCount())}</strong></div><div class="kv"><span>최종 R</span><strong>${state.r.toFixed(2)}</strong></div><div class="kv"><span>최대 의료부하</span><strong>${Math.round(state.maxMedical)}%</strong></div><div class="kv"><span>치료 보급</span><strong>${Math.round(state.therapySupply)}%</strong></div><div class="kv"><span>예방 보급</span><strong>${Math.round(state.preventionSupply)}%</strong></div></div><button class="actionBtn primary" type="button" id="restartBtn">새 게임</button>`;openHelp();setTimeout(()=>{const b=$('#restartBtn');if(b)b.addEventListener('click',()=>location.reload())},0)}
''')

replace_between('function pulse(){','function localAction(kind){', '''function pulse(){if(state.phase!==1)return;const rr=state.regions[state.selected];if(state.dna<3){toast('🧬 3이 필요합니다.');return}state.dna-=3;rr.pressure+=.28;toast(`${byId[state.selected].name}의 확산 압력이 높아졌습니다.`);renderAll()}
''')

# Render all: no hidden conversion; value is already integer count.
# Existing formatPeople(totalInfectedCount()) remains valid.

# Sanity checks against old percentage-state idioms in critical functions.
assert 'rr.infected=.012' not in s
assert 'state.regions[tar.id].infected=.006' not in s
assert 'state.regions.ulleungdo.infected>=.005' not in s
assert 'state.history.push(nationalInfected())' not in s

p.write_text(s,encoding='utf-8')
print('converted OUTBREAK to integer people simulation')
