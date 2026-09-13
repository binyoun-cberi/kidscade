from pathlib import Path
import re

path = Path('outbreak_korea_v3.html')
s = path.read_text(encoding='utf-8')

# --- Map / copy updates ---
s = s.replace('17개 시·도 실제 행정경계 · 감염률에 따라 영역 색상 변화', '17개 시·도 + 울릉도 특별지역 · 지역 특성에 따라 확산 양상이 달라집니다.')
s = s.replace('대한민국 17개 시도 행정경계 감염 지도', '대한민국 17개 시도와 울릉도 특별지역 감염 지도')
s = s.replace('17개 시·도 경계를 불러오는 중…', '17개 시·도와 특별지역을 불러오는 중…')

# --- Region model: add stronger regional identities + Ulleungdo ---
region_block = """const regions=[
{id:'seoul',name:'서울',x:338,y:176,pop:940,links:['incheon','gyeonggi'],traits:['초밀집','대도시','교통허브']},{id:'incheon',name:'인천',x:285,y:190,pop:300,links:['seoul','gyeonggi'],traits:['항구','공항','해안']},{id:'gyeonggi',name:'경기',x:360,y:226,pop:1360,links:['seoul','incheon','gangwon','chungbuk','chungnam'],traits:['대도시권','교통허브','인구대지역']},{id:'gangwon',name:'강원',x:500,y:190,pop:153,links:['gyeonggi','chungbuk','gyeongbuk'],traits:['산간','저밀도','한랭']},{id:'chungbuk',name:'충북',x:410,y:315,pop:160,links:['gyeonggi','gangwon','sejong','daejeon','chungnam','gyeongbuk'],traits:['내륙','교통연결']},{id:'chungnam',name:'충남',x:300,y:350,pop:213,links:['gyeonggi','sejong','daejeon','jeonbuk'],traits:['서해권','해안','농축산']},{id:'sejong',name:'세종',x:355,y:340,pop:39,links:['chungbuk','chungnam','daejeon'],traits:['행정','저밀도']},{id:'daejeon',name:'대전',x:370,y:390,pop:144,links:['chungbuk','chungnam','sejong','jeonbuk'],traits:['도시','교통허브']},{id:'gyeongbuk',name:'경북',x:500,y:390,pop:255,links:['gangwon','chungbuk','daegu','ulsan','gyeongnam','ulleungdo'],traits:['광역','저밀도','산간']},{id:'daegu',name:'대구',x:500,y:445,pop:236,links:['gyeongbuk','gyeongnam'],traits:['대도시','분지']},{id:'jeonbuk',name:'전북',x:340,y:465,pop:176,links:['chungnam','daejeon','gwangju','jeonnam','gyeongnam'],traits:['내륙','농촌혼합','농축산']},{id:'gwangju',name:'광주',x:300,y:545,pop:141,links:['jeonbuk','jeonnam'],traits:['도시','호남허브']},{id:'jeonnam',name:'전남',x:285,y:610,pop:180,links:['jeonbuk','gwangju','gyeongnam','jeju'],traits:['해안','도서','저밀도']},{id:'gyeongnam',name:'경남',x:445,y:545,pop:325,links:['gyeongbuk','daegu','jeonbuk','jeonnam','busan','ulsan'],traits:['산업','도시혼합','해안']},{id:'ulsan',name:'울산',x:555,y:500,pop:110,links:['gyeongbuk','gyeongnam','busan'],traits:['산업','항구','해안']},{id:'busan',name:'부산',x:535,y:570,pop:329,links:['gyeongnam','ulsan','jeju'],traits:['대도시','항구','해안']},{id:'jeju',name:'제주',x:350,y:700,pop:68,links:['jeonnam','busan'],traits:['관광','섬','공항','해안']},{id:'ulleungdo',name:'울릉도',x:625,y:300,pop:1,links:['gyeongbuk'],traits:['외딴섬','항로','저밀도','한랭'],special:true}
];"""
s, n = re.subn(r"const regions=\[\n.*?\n\];(?=\nconst byId=)", region_block, s, count=1, flags=re.S)
assert n == 1, 'regions block not replaced'

# --- Plague-Inc-inspired abstract transmission routes ---
transmission_branch = """'전파 방식':[
{id:'air1',n:'공기·비말 전파 I',c:5,d:'사람이 많은 곳과 교통거점에서 확산 보너스를 얻습니다.',e:{airborne:.45,spread:.10}},{id:'air2',n:'공기·비말 전파 II',c:8,d:'대도시·공항·광역 이동에서 전파 보너스가 커집니다.',req:'air1',e:{airborne:.55,travel:.18}},{id:'water1',n:'수인성 전파 I',c:5,d:'해안·항구·섬 지역에서 확산 보너스를 얻습니다.',e:{water:.50,spread:.08}},{id:'water2',n:'수인성 전파 II',c:8,d:'항로를 통한 섬 지역 진입 가능성이 크게 증가합니다.',req:'water1',e:{water:.60,travel:.12}},{id:'saliva1',n:'밀접접촉·타액 I',c:5,d:'초밀집·도시·행사 지역에서 확산 보너스를 얻습니다.',e:{saliva:.50,dense:.16}},{id:'saliva2',n:'밀접접촉·타액 II',c:8,d:'생활권과 행사에서 확산 압력이 더 커집니다.',req:'saliva1',e:{saliva:.55,eventSpread:.20}},{id:'blood1',n:'혈액·체액 전파 I',c:5,d:'지역 환경 영향을 덜 받는 느린 전파 경로를 추가합니다.',e:{blood:.45,spread:.06}},{id:'blood2',n:'혈액·체액 전파 II',c:8,d:'다른 전파 방식이 약한 지역에서도 기본 확산을 보완합니다.',req:'blood1',e:{blood:.55,adapt:.10}},{id:'animal1',n:'가축·동물 전파 I',c:5,d:'농촌·농축산 지역에서 확산 보너스를 얻습니다.',e:{animal:.50,rural:.12}},{id:'animal2',n:'가축·동물 전파 II',c:8,d:'저밀도 지역에서 전파력이 더 안정적으로 유지됩니다.',req:'animal1',e:{animal:.55,persist:.10}},{id:'bird1',n:'조류 전파 I',c:6,d:'산간·도서·외딴 지역으로 건너갈 가능성이 증가합니다.',e:{bird:.52,travel:.10}},{id:'bird2',n:'조류 전파 II',c:9,d:'울릉도 같은 고립 지역에 진입하기 쉬워집니다.',req:'bird1',e:{bird:.65,travel:.14}},{id:'rodent1',n:'설치류 전파 I',c:5,d:'대도시 생활권에서 추가 확산 보너스를 얻습니다.',e:{rodent:.48,urban:.10}},{id:'rodent2',n:'설치류 전파 II',c:8,d:'도시 지역 정착력이 증가합니다.',req:'rodent1',e:{rodent:.55,persist:.08}},{id:'insect1',n:'곤충 매개 I',c:5,d:'따뜻한 계절과 저밀도 지역에서 보너스를 얻습니다.',e:{insect:.48,heat:.10}},{id:'insect2',n:'곤충 매개 II',c:8,d:'여름철 전파 보너스가 더 커집니다.',req:'insect1',e:{insect:.58,summer:.12}}
],
"""
needle = "const P1={\n'확산':[
"
assert needle in s, 'P1 insertion point missing'
s = s.replace(needle, "const P1={\n" + transmission_branch + "'확산':[\n", 1)

# Add route stats.
old_stats = "resilience:0},response:{analysis:0"
new_stats = "resilience:0,airborne:0,water:0,saliva:0,blood:0,animal:0,bird:0,rodent:0,insect:0},response:{analysis:0"
assert old_stats in s, 'state stats insertion point missing'
s = s.replace(old_stats, new_stats, 1)

# Add response nodes for route-specific counters (abstract, non-procedural).
old_protect = "{id:'local',n:'지역 맞춤 대응',c:9,d:'지역 조치의 효과가 크게 증가합니다.',req:'facility',e:{localPower:.4}}"
new_protect = "{id:'local',n:'지역 맞춤 대응',c:9,d:'지역 조치의 효과가 크게 증가합니다.',req:'facility',e:{localPower:.4}},{id:'airProtect',n:'환기·밀집 대응',c:8,d:'공기·비말·밀접접촉형 특성에 대한 대응력이 올라갑니다.',req:'facility',e:{control:.30,detect:.08}},{id:'waterProtect',n:'물·환경 위생 대응',c:8,d:'수인성 전파와 항구·섬 지역 확산을 억제합니다.',req:'basicProtect',e:{control:.28,localPower:.12}},{id:'animalWatch',n:'동물 매개 감시',c:8,d:'동물·조류·설치류·곤충 매개형 특성을 더 빠르게 파악합니다.',req:'basicProtect',e:{control:.22,detect:.16}},{id:'bloodSafe',n:'혈액 안전 관리',c:8,d:'혈액·체액 전파형 특성에 대한 대응력을 높입니다.',req:'basicProtect',e:{control:.24,detect:.12}}"
assert old_protect in s, 'P2 protection insertion point missing'
s = s.replace(old_protect, new_protect, 1)

# Build labels / combos.
s = s.replace("const treeIcons={'확산':'🚇'", "const treeIcons={'전파 방식':'🦠','확산':'🚇'", 1)
s = s.replace("const effectNames={spread:'확산성',", "const effectNames={airborne:'공기·비말',water:'수인성',saliva:'밀접접촉',blood:'혈액·체액',animal:'동물',bird:'조류',rodent:'설치류',insect:'곤충',spread:'확산성',", 1)
old_build = "function computeBuild(){const b=state.bought;if(b.has('latent')&&b.has('silent'))return'★ 은밀 잠복형';"
new_build = "function computeBuild(){const b=state.bought;if(b.has('water2')&&b.has('bird2'))return'★ 도서 침투형';if(b.has('air2')&&b.has('saliva2'))return'★ 도시 호흡기형';if(b.has('animal2')&&b.has('bird2'))return'★ 동물 매개형';if(b.has('blood2')&&b.has('insect2'))return'★ 매개 전파형';if(b.has('latent')&&b.has('silent'))return'★ 은밀 잠복형';"
assert old_build in s, 'computeBuild insertion point missing'
s = s.replace(old_build, new_build, 1)

# Add Ulleungdo to the real SVG as a special gameplay node.
marker_anchor = "svg.appendChild(labelLayer);$('#mapSource').textContent='통계청 SGIS 2020 시·도 경계 · StatGarten maps (MIT)';renderMap();selectRegion(state.selected);"
marker_repl = """svg.appendChild(labelLayer);
   const ug=document.createElementNS('http://www.w3.org/2000/svg','g');ug.setAttribute('class','region specialRegion');ug.dataset.id='ulleungdo';ug.setAttribute('tabindex','0');ug.setAttribute('role','button');ug.setAttribute('aria-label','울릉도 특별지역');
   const uc=document.createElementNS('http://www.w3.org/2000/svg','circle');uc.setAttribute('class','fill');uc.setAttribute('cx','735');uc.setAttribute('cy','315');uc.setAttribute('r','9');uc.setAttribute('fill','#3e514b');ug.appendChild(uc);
   const ut=document.createElementNS('http://www.w3.org/2000/svg','text');ut.setAttribute('class','map-label small');ut.dataset.label='ulleungdo';ut.setAttribute('x','735');ut.setAttribute('y','294');ut.textContent='울릉도';ug.appendChild(ut);
   ug.addEventListener('click',()=>selectRegion('ulleungdo'));ug.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectRegion('ulleungdo')}});svg.appendChild(ug);
   $('#mapSource').textContent='통계청 SGIS 2020 시·도 경계 · 울릉도는 게임용 특별지역 · StatGarten maps (MIT)';renderMap();selectRegion(state.selected);"""
assert marker_anchor in s, 'map marker insertion point missing'
s = s.replace(marker_anchor, marker_repl, 1)

# Replace regional/transmission simulation. Broad game abstractions only.
new_sim = r"""function regionFactor(r){
 let f=1+state.stats.adapt*.025;const tr=r.traits;
 if(r.pop>500)f*=1+state.stats.dense*.20+state.stats.urban*.14+state.stats.saliva*.06;
 if(tr.includes('초밀집')||tr.includes('대도시')||tr.includes('도시'))f*=1+state.stats.urban*.12+state.stats.saliva*.08+state.stats.rodent*.07;
 if(tr.includes('저밀도')||tr.includes('산간'))f*=1+state.stats.rural*.14+state.stats.animal*.07+state.stats.bird*.06;
 if(tr.includes('농축산')||tr.includes('농촌혼합'))f*=1+state.stats.animal*.16;
 if(tr.includes('교통허브')||tr.includes('공항'))f*=1+state.stats.travel*.11+state.stats.airborne*.12;
 if(tr.includes('항구')||tr.includes('해안')||tr.includes('섬')||tr.includes('항로')||tr.includes('도서'))f*=1+state.stats.water*.13;
 if(tr.includes('산간')||tr.includes('도서')||tr.includes('외딴섬'))f*=1+state.stats.bird*.11;
 f*=1+state.stats.blood*.018;
 const ss=season();if(ss==='겨울')f*=1+state.stats.cold*.08+state.stats.winter*.1;if(ss==='여름')f*=1+state.stats.heat*.08+state.stats.summer*.1+state.stats.insect*.11;
 if(r.id==='jeju')f*=.72+state.stats.island*.18+state.stats.water*.08+state.stats.airborne*.06;
 if(r.id==='ulleungdo')f*=.22+state.stats.island*.16+state.stats.water*.13+state.stats.bird*.16+state.stats.airborne*.05;
 if(state.type==='세균형'&&state.day<=state.specialBuffUntil)f*=1.22;return f
}
function routeGate(targetId){
 if(targetId==='ulleungdo')return clamp(.015+state.stats.water*.16+state.stats.bird*.20+state.stats.airborne*.08+state.stats.travel*.08,.015,.92);
 if(targetId==='jeju')return clamp(.12+state.stats.water*.10+state.stats.airborne*.10+state.stats.travel*.10,.12,1);
 return clamp(.52+state.stats.travel*.10+state.stats.airborne*.05+state.stats.bird*.025,.30,1)
}
function phase1Tick(){
 state.tick++;if(state.tick%10===0){state.day++;if(state.specialBuffUntil&&state.day>state.specialBuffUntil&&state.type==='기생형')state.eventMods.attention=0}
 const govPenalty=1-(state.attention/100)*(.38-state.stats.resilience*.06),evoCount=state.bought.size,evoFactor=clamp(.10+evoCount*.055,.10,1);
 const routeNodes=['air1','water1','saliva1','blood1','animal1','bird1','rodent1','insect1'],routeBought=routeNodes.some(id=>state.bought.has(id));
 const travelUnlocked=routeBought||state.bought.has('regional')||state.bought.has('transit')||state.bought.has('road')||state.bought.has('long')||state.bought.has('gather');
 const travelGate=travelUnlocked?clamp(.26+evoCount*.065+state.stats.travel*.14,.26,1):.015;
 for(const r of regions){const rr=state.regions[r.id];if(rr.infected<=0)continue;rr.daysInfected++;let local=.00074*state.stats.spread*govPenalty*evoFactor*(1+state.eventMods.spread)*regionFactor(r);if(state.bought.has('gather'))local*=1+state.stats.eventSpread*.06;rr.infected=clamp(rr.infected+local*(1-rr.infected)*(1+Math.random()*.20),0,1);const extraPersist=(state.type==='진균형'?.55:0)+(state.type==='비정형형'?.35:0)+rr.pressure;const recover=.00015/(1+state.stats.persist+extraPersist);rr.infected=Math.max(0,rr.infected-recover);
  if(Math.random()<.0062*travelGate*(.48+state.stats.travel+state.eventMods.travel)*(0.28+rr.infected)){const target=r.links[Math.floor(Math.random()*r.links.length)];if(target&&Math.random()<routeGate(target))state.regions[target].infected=Math.max(state.regions[target].infected,.0022+rr.infected*.008)}
 }
 for(const r of regions){const rr=state.regions[r.id];if(rr.infected>.03){for(const lid of r.links){if(Math.random()<.0025*travelGate*state.stats.spread*(.50+state.stats.travel+state.eventMods.travel)*routeGate(lid))state.regions[lid].infected=Math.max(state.regions[lid].infected,.0012+rr.infected*.0035)}}}
 if(state.bought.has('long')&&Math.random()<.010*(1+state.stats.travel)){const targets=regions.filter(r=>state.regions[r.id].infected<.003&&(r.id!=='ulleungdo'||routeGate('ulleungdo')>.18));if(targets.length){const t=targets[Math.floor(Math.random()*targets.length)];state.regions[t.id].infected=Math.max(state.regions[t.id].infected,.0032)}}
 if(state.type==='진균형'&&state.bought.size>=2&&Math.random()<.0012*evoFactor){const targets=regions.filter(r=>state.regions[r.id].infected<.002&&r.id!=='ulleungdo');if(targets.length){const t=targets[Math.floor(Math.random()*targets.length)];state.regions[t.id].infected=.0026;addNews('예상 밖 지역 유입',`${t.name}에서 작은 감염 거점이 확인됩니다.`)}}
 const nat=nationalInfected(),sev=Math.max(0,state.stats.severity);let att=(nat*1.05+sev*.052-state.stats.stealth*.012)*(1+state.eventMods.attention);if(state.type==='기생형')att*=.78;if(state.type==='비정형형')att*=.86;state.attention=clamp(state.attention+att,0,100);
 if(state.tick%7===0)state.dna+=Math.max(1,Math.floor(infectedRegions()/5));if(state.day===18&&state.tick%10===0&&state.manualEvolutions===0)addNews('확산 정체','기본 상태만으로는 전국 확산이 어렵습니다. 진화 트리에서 전파 방식과 지역 적응을 선택해 전략을 만드세요.');maybeMutation();maybeEvent();recordHistory();
 if(nat>=.70&&infectedRegions()>=16&&state.regions.ulleungdo.infected>=.005&&state.manualEvolutions>=4)beginTransition()
}
function phase2Tick"""
s, n = re.subn(r"function regionFactor\(r\)\{.*?\nfunction phase2Tick", new_sim, s, count=1, flags=re.S)
assert n == 1, 'simulation block not replaced'

# Objective / help / recommendations.
s = re.sub(r"function renderObjective\(\)\{if\(state\.phase===1\)\{.*?\}\}\nfunction renderSpecial", "function renderObjective(){if(state.phase===1){$('#objPhase').textContent='1부';$('#objTitle').textContent='전국 확산';$('#objText').textContent='직접 진화 4회 + 16개 지역 진입 + 전국 감염률 70% + 울릉도 진입을 달성하세요.';$('#objStatus').textContent=`진화 ${state.manualEvolutions}/4 · ${infectedRegions()}/18 · 울릉도 ${(state.regions.ulleungdo.infected*100).toFixed(0)}% · ${(nationalInfected()*100).toFixed(0)}%`}else{$('#objPhase').textContent='2부';$('#objTitle').textContent='확산 억제';$('#objText').textContent='R을 1 미만으로 낮추고 의료체계를 지키면서 치료·예방 연구를 보급하세요.';$('#objStatus').textContent=`R ${state.r.toFixed(2)} · 의료 ${Math.round(state.medicalLoad)}%`}}\nfunction renderSpecial", s, count=1, flags=re.S)
s = s.replace("<b>목표:</b> 15개 이상 지역에 진입하고 전국 감염률 70%를 달성합니다.", "<b>목표:</b> 진화 4회 이상, 16개 지역 진입, 전국 감염률 70%, 울릉도 진입을 달성합니다.")
s = s.replace("진화 트리에서는 확산·잠복·환경·생존 중 무엇을 강화할지 고르세요.", "진화 트리에서는 공기·물·조류·동물·설치류·곤충·혈액·밀접접촉 같은 전파 방식과 확산·잠복·환경·생존 중 무엇을 강화할지 고르세요.")

# Recommendation function with route counters.
new_rec = """function recommendation(){if(state.phase!==2)return'';const b=state.bought,rec=[];if((b.has('air1')||b.has('air2')||b.has('saliva1')||b.has('saliva2'))&&!state.phase2Bought.has('airProtect'))rec.push('환기·밀집 대응');if((b.has('water1')||b.has('water2'))&&!state.phase2Bought.has('waterProtect'))rec.push('물·환경 위생 대응');if((b.has('animal1')||b.has('animal2')||b.has('bird1')||b.has('bird2')||b.has('rodent1')||b.has('insect1'))&&!state.phase2Bought.has('animalWatch'))rec.push('동물 매개 감시');if((b.has('blood1')||b.has('blood2'))&&!state.phase2Bought.has('bloodSafe'))rec.push('혈액 안전 관리');if((b.has('transit')||b.has('metro')||b.has('long'))&&!state.phase2Bought.has('transport'))rec.push('교통 대응');if((b.has('latent')||b.has('silent'))&&!state.phase2Bought.has('testing'))rec.push('검사 확대');if((b.has('urban')||b.has('dense'))&&!state.phase2Bought.has('facility'))rec.push('시설 관리');if((b.has('persist')||b.has('longterm'))&&!state.phase2Bought.has('trace'))rec.push('역학 조사');if(state.medicalLoad>75&&!state.phase2Bought.has('medSupport'))rec.push('의료 지원');return rec.slice(0,2).join(' · ')||'현재 전략을 유지하며 R값과 의료부하를 관찰하세요.'}"""
s, n = re.subn(r"function recommendation\(\)\{.*?\}\nfunction renderRecommendation", new_rec + "\nfunction renderRecommendation", s, count=1, flags=re.S)
assert n == 1, 'recommendation function not replaced'

# --- Mobile: large, always reachable evolution button + larger tree targets ---
mobile_css = r'''
/* v3.2 · touch-first evolution controls */
.mobileTreeFab{display:none}
@media(max-width:780px){
 .mobileTreeFab{display:flex;position:fixed;right:12px;bottom:calc(82px + env(safe-area-inset-bottom));z-index:74;min-width:132px;height:54px;padding:0 14px;border:1px solid #74efc0;border-radius:18px;background:linear-gradient(135deg,#5df0b5,#34c997);color:#06231a;font-weight:1000;font-size:15px;align-items:center;justify-content:center;gap:8px;box-shadow:0 10px 28px rgba(0,0,0,.48);touch-action:manipulation}
 .mobileTreeFab b{display:flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 6px;border-radius:999px;background:#08241b;color:#baffdf;font-size:12px}
 body.mobile-modal-open .mobileTreeFab,body.mobile-left-open .mobileTreeFab,body.mobile-right-open .mobileTreeFab{display:none}
 #treeOverlay .tab{min-height:42px;padding:9px 13px;font-size:12px}
 #treeOverlay .treeHint{display:none}
 #treeOverlay .skillViewport{height:calc(100dvh - 112px);padding-bottom:180px;border-radius:10px}
 #treeOverlay .skillCanvas{width:860px;min-height:560px}
 #treeOverlay .skillNode{width:178px;min-height:98px;padding:10px 9px;border-radius:15px;border-width:2px;touch-action:manipulation}
 #treeOverlay .skillNode .skillIcon{font-size:23px}#treeOverlay .skillNode .skillName{font-size:13px}#treeOverlay .skillNode .skillCost{font-size:11px}#treeOverlay .skillNode .skillState{font-size:10px}
 #treeOverlay .skillNode.available{box-shadow:0 0 0 3px rgba(239,217,128,.10),0 0 22px rgba(239,217,128,.18)}
 #treeOverlay .treeDetail{position:fixed;left:8px;right:8px;bottom:max(8px,env(safe-area-inset-bottom));z-index:225;max-height:166px;overflow:auto;padding:10px 12px;border:1px solid #4b6f63;background:rgba(7,23,19,.98);box-shadow:0 -8px 30px rgba(0,0,0,.52)}
 #treeOverlay .treeDetail .detailIcon{font-size:20px;float:left;margin-right:8px}#treeOverlay .treeDetail h3{font-size:16px;margin:1px 0 2px}#treeOverlay .treeDetail p{font-size:10px;line-height:1.3;margin:4px 0}.effectChips{margin:5px 0}.effectChip{font-size:9px;padding:3px 5px}.requireBox{font-size:9px;padding:5px;margin:4px 0}.unlockBtn{min-height:44px;font-size:14px}
}
'''
assert '</style>' in s
s = s.replace('</style>', mobile_css + '\n</style>', 1)

fab_html = """<button type=\"button\" class=\"mobileTreeFab\" id=\"mobileTreeFab\"><span id=\"mobileTreeFabLabel\">🧬 진화 트리</span><b id=\"mobileTreeFabCount\">8</b></button>\n"""
anchor = '<div class="mobileSheetBackdrop" id="mobileSheetBackdrop" aria-hidden="true"></div>\n'
assert anchor in s, 'mobile dock anchor missing'
s = s.replace(anchor, anchor + fab_html, 1)

# Enhance mobile script resource sync + direct fab action.
s = s.replace("const dna=document.getElementById('dna'),mobileDna=document.getElementById('mobileDna');const syncDna=()=>{if(dna&&mobileDna)mobileDna.textContent=dna.textContent||'0'};", "const dna=document.getElementById('dna'),mobileDna=document.getElementById('mobileDna'),fab=document.getElementById('mobileTreeFab'),fabCount=document.getElementById('mobileTreeFabCount'),fabLabel=document.getElementById('mobileTreeFabLabel'),phaseLabel=document.getElementById('phaseLabel'),research=document.getElementById('research');const syncDna=()=>{const phase2=phaseLabel?.textContent?.includes('2부'),v=phase2?(research?.textContent||'0'):(dna?.textContent||'0');if(mobileDna)mobileDna.textContent=v;if(fabCount)fabCount.textContent=v;if(fabLabel)fabLabel.textContent=phase2?'🛡 대응 트리':'🧬 진화 트리'};", 1)
s = s.replace("if(dna)new MutationObserver(syncDna).observe(dna,{childList:true,subtree:true,characterData:true});", "if(dna)new MutationObserver(syncDna).observe(dna,{childList:true,subtree:true,characterData:true});if(research)new MutationObserver(syncDna).observe(research,{childList:true,subtree:true,characterData:true});if(phaseLabel)new MutationObserver(syncDna).observe(phaseLabel,{childList:true,subtree:true,characterData:true});", 1)
insert_after = "const closeSheets=()=>{body.classList.remove('mobile-left-open','mobile-right-open');setActive('map')};document.getElementById('mobileSheetBackdrop')?.addEventListener('click',closeSheets);"
assert insert_after in s, 'mobile listener insertion point missing'
s = s.replace(insert_after, insert_after + "fab?.addEventListener('click',()=>buttons.find(b=>b.dataset.mobilePanel==='tree')?.click());", 1)

path.write_text(s, encoding='utf-8')
print('OUTBREAK v3.2 patch complete')
