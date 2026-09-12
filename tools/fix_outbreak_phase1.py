from pathlib import Path

p = Path('outbreak_korea_v3.html')
s = p.read_text(encoding='utf-8')

repls = [
("selected:'chungbuk',type:'세균형'", "selected:'chungbuk',type:'세균형',manualEvolutions:0"),
("if(state.phase===1){state.dna-=cost;state.bought.add(id);applyP1(node)}else", "if(state.phase===1){state.dna-=cost;state.bought.add(id);state.manualEvolutions++;applyP1(node)}else"),
("const govPenalty=1-(state.attention/100)*(.38-state.stats.resilience*.06);for(const r of regions){", "const govPenalty=1-(state.attention/100)*(.38-state.stats.resilience*.06);const evoCount=state.bought.size;const evoFactor=clamp(.12+evoCount*.07,.12,1);const travelUnlocked=state.bought.has('regional')||state.bought.has('transit')||state.bought.has('road')||state.bought.has('long')||state.bought.has('gather');const travelGate=travelUnlocked?clamp(.35+evoCount*.08+state.stats.travel*.18,.35,1):.03;for(const r of regions){"),
("let local=.00082*state.stats.spread*govPenalty*(1+state.eventMods.spread)*regionFactor(r);", "let local=.00078*state.stats.spread*govPenalty*evoFactor*(1+state.eventMods.spread)*regionFactor(r);"),
("const recover=.00011/(1+state.stats.persist+extraPersist);", "const recover=.00014/(1+state.stats.persist+extraPersist);"),
("if(Math.random()<.0065*(.55+state.stats.travel+state.eventMods.travel)*(0.3+rr.infected))", "if(Math.random()<.0065*travelGate*(.55+state.stats.travel+state.eventMods.travel)*(0.3+rr.infected))"),
("if(Math.random()<.0027*state.stats.spread*(.55+state.stats.travel+state.eventMods.travel))", "if(Math.random()<.0027*travelGate*state.stats.spread*(.55+state.stats.travel+state.eventMods.travel))"),
("if(state.type==='진균형'&&Math.random()<.0014){", "if(state.type==='진균형'&&state.bought.size>=2&&Math.random()<.0014*evoFactor){"),
("if((nat>=.70&&infectedRegions()>=15)||state.day>=110)beginTransition()", "if(nat>=.70&&infectedRegions()>=15&&state.manualEvolutions>=4)beginTransition()"),
("$('#objText').textContent='15개 이상 지역 진입 + 전국 감염률 70%를 달성하세요.';$('#objStatus').textContent=`${infectedRegions()} / 17 · ${(nationalInfected()*100).toFixed(0)}%`", "$('#objText').textContent='직접 진화 4회 이상 + 15개 이상 지역 진입 + 전국 감염률 70%를 달성하세요.';$('#objStatus').textContent=`진화 ${state.manualEvolutions}/4 · ${infectedRegions()}/17 · ${(nationalInfected()*100).toFixed(0)}%`"),
("state.specialReadyDay=1;selectRegion(state.selected);", "state.specialReadyDay=1;state.manualEvolutions=0;selectRegion(state.selected);")
]

for old, new in repls:
    if old not in s:
        raise SystemExit(f'MISSING PATTERN: {old[:100]}')
    s = s.replace(old, new, 1)

# Add a one-time hint when the player idles without evolving.
needle = "if(state.tick%7===0)state.dna+=Math.max(1,Math.floor(infectedRegions()/5));maybeMutation();maybeEvent();recordHistory();"
replacement = "if(state.tick%7===0)state.dna+=Math.max(1,Math.floor(infectedRegions()/5));if(state.day===18&&state.tick%10===0&&state.manualEvolutions===0)addNews('확산 정체','기본 상태만으로는 전국 확산이 어렵습니다. 진화 트리에서 확산·환경·잠복 특성을 선택해 전략을 만드세요.');maybeMutation();maybeEvent();recordHistory();"
if needle not in s:
    raise SystemExit('MISSING IDLE HINT NEEDLE')
s = s.replace(needle, replacement, 1)

p.write_text(s, encoding='utf-8')
