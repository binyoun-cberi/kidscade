from pathlib import Path
import re

path = Path('outbreak_korea_v3.html')
s = path.read_text(encoding='utf-8')

# 1) HUD / map copy: people counts + transport legend
s = s.replace('전국 감염 <strong id="nationalPct">0%</strong>', '전국 감염자 <strong id="nationalPct">0명</strong>')
s = s.replace('17개 시·도 + 울릉도 특별지역 · 지역 특성에 따라 확산 양상이 달라집니다.', '17개 시·도 + 울릉도 · KTX·공항·버스터미널·항구를 따라 감염자가 이동합니다.')
legend_pattern = re.compile(r'<div class="mapLegend">.*?</div>\s*<div class="map-source"', re.S)
legend_html = '''<div class="mapLegend transportLegend">
<div class="legendRow"><span class="infectionLegendDot"></span>감염자 분포</div>
<div class="legendRow"><span class="hubLegend ktx">K</span>KTX</div>
<div class="legendRow"><span class="hubLegend airport">✈</span>공항</div>
<div class="legendRow"><span class="hubLegend bus">B</span>버스터미널</div>
<div class="legendRow"><span class="hubLegend port">⚓</span>항구</div>
</div>
      <div class="map-source"'''
s, n = legend_pattern.subn(legend_html, s, count=1)
assert n == 1, 'map legend not replaced'

# 2) Transport hub data (representative gameplay nodes, not real schedules)
anchor = "const byId=Object.fromEntries(regions.map(r=>[r.id,r]));"
transport_data = r'''
const transportMeta={
 ktx:{label:'KTX',icon:'K',rate:.00110,color:'#77d8ff'},
 airport:{label:'공항',icon:'✈',rate:.00088,color:'#ffd166'},
 bus:{label:'버스터미널',icon:'B',rate:.00078,color:'#9ee493'},
 port:{label:'항구',icon:'⚓',rate:.00058,color:'#8ea8ff'}
};
const transportHubs=[
 {id:'seoul-ktx',name:'서울역',type:'ktx',region:'seoul'},{id:'osong-ktx',name:'오송역',type:'ktx',region:'chungbuk'},{id:'daejeon-ktx',name:'대전역',type:'ktx',region:'daejeon'},{id:'daegu-ktx',name:'동대구역',type:'ktx',region:'daegu'},{id:'busan-ktx',name:'부산역',type:'ktx',region:'busan'},{id:'gwangju-ktx',name:'광주송정역',type:'ktx',region:'gwangju'},
 {id:'incheon-air',name:'인천공항',type:'airport',region:'incheon'},{id:'cheongju-air',name:'청주공항',type:'airport',region:'chungbuk'},{id:'yangyang-air',name:'양양공항',type:'airport',region:'gangwon'},{id:'daegu-air',name:'대구공항',type:'airport',region:'daegu'},{id:'gwangju-air',name:'광주공항',type:'airport',region:'gwangju'},{id:'gimhae-air',name:'김해공항',type:'airport',region:'busan'},{id:'ulsan-air',name:'울산공항',type:'airport',region:'ulsan'},{id:'jeju-air',name:'제주공항',type:'airport',region:'jeju'},
 {id:'seoul-bus',name:'서울터미널',type:'bus',region:'seoul'},{id:'suwon-bus',name:'경기터미널',type:'bus',region:'gyeonggi'},{id:'gangwon-bus',name:'강원터미널',type:'bus',region:'gangwon'},{id:'cheongju-bus',name:'청주터미널',type:'bus',region:'chungbuk'},{id:'daejeon-bus',name:'대전터미널',type:'bus',region:'daejeon'},{id:'jeonju-bus',name:'전주터미널',type:'bus',region:'jeonbuk'},{id:'gwangju-bus',name:'광주터미널',type:'bus',region:'gwangju'},{id:'daegu-bus',name:'대구터미널',type:'bus',region:'daegu'},{id:'busan-bus',name:'부산터미널',type:'bus',region:'busan'},
 {id:'incheon-port',name:'인천항',type:'port',region:'incheon'},{id:'busan-port',name:'부산항',type:'port',region:'busan'},{id:'ulsan-port',name:'울산항',type:'port',region:'ulsan'},{id:'mokpo-port',name:'목포항',type:'port',region:'jeonnam'},{id:'jeju-port',name:'제주항',type:'port',region:'jeju'},{id:'ulleung-port',name:'울릉항',type:'port',region:'ulleungdo'}
];
'''
assert anchor in s, 'byId anchor missing'
s = s.replace(anchor, anchor + transport_data, 1)

# 3) Population helpers: existing pop values are approximately units of 10,000 people.
season_anchor = "const season=()=>seasonNames[Math.floor((state.day-1)/24)%4];"
pop_helpers = r'''
function regionPopulation(r){return Math.max(1,Math.round(r.pop*10000))}
function regionInfectedCount(r){return Math.max(0,Math.round(state.regions[r.id].infected*regionPopulation(r)))}
function totalPopulation(){return regions.reduce((sum,r)=>sum+regionPopulation(r),0)}
function totalInfectedCount(){return regions.reduce((sum,r)=>sum+regionInfectedCount(r),0)}
function formatPeople(n){return `${Math.max(0,Math.round(n)).toLocaleString('ko-KR')}명`}
'''
assert season_anchor in s, 'season anchor missing'
s = s.replace(season_anchor, season_anchor + pop_helpers, 1)

# 4) Visual infection dots + transport hubs.
insert_before = "function selectRegion(id){"
visual_code = r'''
function hash01(seed){const x=Math.sin(seed*12.9898+78.233)*43758.5453;return x-Math.floor(x)}
function regionSeed(id){let h=0;for(let i=0;i<id.length;i++)h=(h*31+id.charCodeAt(i))>>>0;return h||1}
function hubPosition(h){
 const shape=document.querySelector(`.region[data-id="${h.region}"] .fill`);if(!shape)return{x:0,y:0};const b=shape.getBBox();
 const same=transportHubs.filter(x=>x.region===h.region),idx=Math.max(0,same.findIndex(x=>x.id===h.id));
 const offsets=[[-11,-10],[12,-9],[-11,12],[12,12],[0,19]];const off=offsets[idx%offsets.length];
 return{x:b.x+b.width/2+off[0],y:b.y+b.height/2+off[1]};
}
function buildTransportOverlay(){
 const svg=$('#koreaMap');if(!svg)return;
 svg.querySelector('#infectionDefs')?.remove();svg.querySelector('#infectionDotsLayer')?.remove();svg.querySelector('#travelRouteLayer')?.remove();svg.querySelector('#transportHubLayer')?.remove();
 const ns='http://www.w3.org/2000/svg',defs=document.createElementNS(ns,'defs');defs.id='infectionDefs';
 for(const r of regions){const shape=svg.querySelector(`.region[data-id="${r.id}"] .fill`);if(!shape)continue;shape.id=`region-shape-${r.id}`;const cp=document.createElementNS(ns,'clipPath');cp.id=`region-clip-${r.id}`;const use=document.createElementNS(ns,'use');use.setAttribute('href',`#region-shape-${r.id}`);cp.appendChild(use);defs.appendChild(cp)}
 svg.appendChild(defs);
 const dots=document.createElementNS(ns,'g');dots.id='infectionDotsLayer';dots.setAttribute('pointer-events','none');svg.appendChild(dots);
 const routes=document.createElementNS(ns,'g');routes.id='travelRouteLayer';routes.setAttribute('pointer-events','none');svg.appendChild(routes);
 const hubs=document.createElementNS(ns,'g');hubs.id='transportHubLayer';
 for(const h of transportHubs){const p=hubPosition(h);h._x=p.x;h._y=p.y;const g=document.createElementNS(ns,'g');g.setAttribute('class',`transportHub ${h.type}`);g.dataset.hub=h.id;g.setAttribute('role','button');g.setAttribute('tabindex','0');const title=document.createElementNS(ns,'title');title.textContent=`${h.name} · ${transportMeta[h.type].label}`;g.appendChild(title);const c=document.createElementNS(ns,'circle');c.setAttribute('cx',p.x);c.setAttribute('cy',p.y);c.setAttribute('r','7');g.appendChild(c);const t=document.createElementNS(ns,'text');t.setAttribute('x',p.x);t.setAttribute('y',p.y+3);t.textContent=transportMeta[h.type].icon;g.appendChild(t);g.addEventListener('click',()=>selectRegion(h.region));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectRegion(h.region)}});hubs.appendChild(g)}
 svg.appendChild(hubs);renderInfectionDots();updateTransportHubs();
}
function renderInfectionDots(){
 const layer=$('#infectionDotsLayer');if(!layer)return;const ns='http://www.w3.org/2000/svg';
 for(const r of regions){const rr=state.regions[r.id],shape=document.querySelector(`.region[data-id="${r.id}"] .fill`);if(!shape)continue;const p=rr.infected;const count=p<=.00005?0:Math.min(120,Math.max(1,Math.round(Math.pow(p,.64)*112)));let g=layer.querySelector(`g[data-dots="${r.id}"]`);
   if(!g){g=document.createElementNS(ns,'g');g.dataset.dots=r.id;g.setAttribute('clip-path',`url(#region-clip-${r.id})`);layer.appendChild(g)}
   if(Number(g.dataset.count||-1)===count)continue;g.dataset.count=count;g.innerHTML='';const b=shape.getBBox(),seed=regionSeed(r.id);
   for(let i=0;i<count;i++){const c=document.createElementNS(ns,'circle'),rx=hash01(seed+i*17+1),ry=hash01(seed+i*29+7);c.setAttribute('class','infectionDot');c.setAttribute('cx',b.x+rx*b.width);c.setAttribute('cy',b.y+ry*b.height);c.setAttribute('r',String(1.6+Math.min(1.4,p*2.2)));g.appendChild(c)}
 }
}
function updateTransportHubs(){for(const h of transportHubs){const g=document.querySelector(`.transportHub[data-hub="${h.id}"]`);if(g)g.classList.toggle('hot',state.regions[h.region].infected>.006)}}
function transportBoost(type){if(type==='airport')return .35+state.stats.airborne*.25+state.stats.travel*.18;if(type==='port')return .26+state.stats.water*.30+state.stats.bird*.08;if(type==='ktx')return .34+state.stats.airborne*.16+state.stats.saliva*.16+state.stats.travel*.16;return .24+state.stats.saliva*.16+state.stats.airborne*.10+state.stats.travel*.08}
function flashTransport(a,b,type){const layer=$('#travelRouteLayer');if(!layer||a._x==null||b._x==null)return;const ns='http://www.w3.org/2000/svg',line=document.createElementNS(ns,'line');line.setAttribute('class',`travelFlash ${type}`);line.setAttribute('x1',a._x);line.setAttribute('y1',a._y);line.setAttribute('x2',b._x);line.setAttribute('y2',b._y);layer.appendChild(line);setTimeout(()=>line.remove(),900);const tg=document.querySelector(`.transportHub[data-hub="${b.id}"]`);tg?.classList.add('pulse');setTimeout(()=>tg?.classList.remove('pulse'),900)}
function transportSpreadStep(defenseMode=false){
 for(const h of transportHubs){const src=state.regions[h.region];if(!src||src.infected<.008)continue;const meta=transportMeta[h.type];let chance=meta.rate*(.28+Math.min(.9,src.infected*1.8))*transportBoost(h.type);
   if(defenseMode)chance*=Math.max(.18,Math.min(1.15,state.r/1.8))*(1-Math.min(.62,state.response.control*.10));if(Math.random()>=chance)continue;
   let targets=transportHubs.filter(x=>x.type===h.type&&x.region!==h.region);if(h.type==='bus')targets=targets.filter(x=>byId[h.region].links.includes(x.region));if(!targets.length)continue;const target=targets[Math.floor(Math.random()*targets.length)],trr=state.regions[target.region];let seed=.0012+src.infected*.0016;if(h.type==='airport')seed*=1.22;if(h.type==='ktx')seed*=1.12;if(h.type==='port')seed*=.9;if(defenseMode)seed*=.72;const before=trr.infected;trr.infected=Math.max(trr.infected,seed);if(trr.infected>before+.00005){flashTransport(h,target,h.type);if(Math.random()<.12)addNews(`${transportMeta[h.type].label} 유입`,`${h.name}에서 ${target.name} 방향으로 새로운 감염 이동이 포착되었습니다.`)}}
 }
}
'''
assert insert_before in s, 'selectRegion anchor missing'
s = s.replace(insert_before, visual_code + insert_before, 1)

# 5) Call overlays after map construction.
s = s.replace("svg.innerHTML=s;bindMapRegions();$('#mapSource').textContent='실제 경계 데이터를 불러오지 못해 간이 지도로 표시 중';renderMap();", "svg.innerHTML=s;bindMapRegions();$('#mapSource').textContent='실제 경계 데이터를 불러오지 못해 간이 지도로 표시 중';buildTransportOverlay();renderMap();", 1)
s = s.replace("$('#mapSource').textContent='통계청 SGIS 2020 시·도 경계 · 울릉도는 게임용 특별지역 · StatGarten maps (MIT)';renderMap();selectRegion(state.selected);", "$('#mapSource').textContent='통계청 SGIS 2020 시·도 경계 · 울릉도는 게임용 특별지역 · StatGarten maps (MIT)';buildTransportOverlay();renderMap();selectRegion(state.selected);", 1)

# 6) Transport spread in both phases.
s = s.replace("const nat=nationalInfected(),sev=Math.max(0,state.stats.severity);", "transportSpreadStep(false);const nat=nationalInfected(),sev=Math.max(0,state.stats.severity);", 1)
s = s.replace("const totalInf=regions.reduce((s,r)=>s+state.regions[r.id].infected*r.pop,0),totalPop=regions.reduce((s,r)=>s+r.pop,0);", "if(state.r>1)transportSpreadStep(true);const totalInf=regions.reduce((s,r)=>s+state.regions[r.id].infected*r.pop,0),totalPop=regions.reduce((s,r)=>s+r.pop,0);", 1)

# 7) Neutral province fills + red dots.
render_map_pattern = re.compile(r"function renderMap\(\)\{.*?\}\nfunction renderRegionInfo", re.S)
new_render_map = r'''function renderMap(){for(const r of regions){const g=document.querySelector(`.region[data-id="${r.id}"]`);if(!g)continue;const fill=g.querySelector('.fill');if(fill)fill.setAttribute('fill','#3c5049');g.classList.toggle('selected',r.id===state.selected);const label=document.querySelector(`[data-label="${r.id}"]`);if(label)label.classList.toggle('selected',r.id===state.selected)}renderInfectionDots();updateTransportHubs()}
function renderRegionInfo'''
s, n = render_map_pattern.subn(new_render_map, s, count=1)
assert n == 1, 'renderMap not replaced'

# 8) Region panel: people count first, percentage secondary.
region_info_pattern = re.compile(r"function renderRegionInfo\(\)\{.*?\}\nfunction renderNews", re.S)
new_region_info = r'''function renderRegionInfo(){const r=byId[state.selected],rr=state.regions[r.id];let actions='';if(state.phase===2)actions=`<div class="regionActionGrid"><button class="regionAction" data-local="test"><b>🔎 집중검사 · 💰4</b><small>분석 + 지역 억제</small></button><button class="regionAction" data-local="medical"><b>🏥 의료지원 · 💰5</b><small>지역 회복 + 수용력</small></button><button class="regionAction" data-local="comm"><b>📢 소통 · 💰3</b><small>협조도 회복</small></button><button class="regionAction" data-local="restrict"><b>🚧 이동관리 · 💰6</b><small>강한 억제 · 협조도 감소</small></button></div>`;const hubs=transportHubs.filter(h=>h.region===r.id);$('#regionInfo').innerHTML=`<div class="regionCard"><div class="name">${r.name}</div><div class="tagRow">${r.traits.map(t=>`<span class="badge">${t}</span>`).join('')}</div>${hubs.length?`<div class="tagRow transportTags">${hubs.map(h=>`<span class="badge">${transportMeta[h.type].icon} ${h.name}</span>`).join('')}</div>`:''}<div class="kv"><span>인구</span><strong>${formatPeople(regionPopulation(r))}</strong></div><div class="kv"><span>감염자</span><strong>${formatPeople(regionInfectedCount(r))}</strong></div><div class="tiny muted" style="text-align:right">지역 내 ${(rr.infected*100).toFixed(2)}%</div><div class="bar red"><span style="width:${clamp(rr.infected*100,0,100)}%"></span></div>${state.phase===2?`<div class="kv"><span>지역 억제</span><strong>${rr.localControl.toFixed(2)}</strong></div><div class="kv"><span>전국 의료부하</span><strong>${Math.round(state.medicalLoad)}%</strong></div>`:''}${actions}</div>`;$$('[data-local]').forEach(b=>b.addEventListener('click',()=>localAction(b.dataset.local)))}
function renderNews'''
s, n = region_info_pattern.subn(new_region_info, s, count=1)
assert n == 1, 'renderRegionInfo not replaced'

# 9) Objective uses population numbers while keeping internal fraction model.
objective_pattern = re.compile(r"function renderObjective\(\)\{.*?\}\nfunction renderSpecial", re.S)
new_objective = r'''function renderObjective(){if(state.phase===1){const target=Math.round(totalPopulation()*.70),ulleung=state.regions.ulleungdo.infected>.005;$('#objPhase').textContent='1부';$('#objTitle').textContent='전국 확산';$('#objText').textContent=`직접 진화 4회 이상 + 16개 이상 지역 진입 + 감염자 ${formatPeople(target)} 이상 + 울릉도 진입`;$('#objStatus').textContent=`진화 ${state.manualEvolutions}/4 · ${infectedRegions()}/${regions.length} · ${formatPeople(totalInfectedCount())} · 울릉 ${ulleung?'✓':'○'}`}else{$('#objPhase').textContent='2부';$('#objTitle').textContent='확산 억제';$('#objText').textContent='R을 1 미만으로 낮추고 의료체계를 지키면서 치료·예방 연구를 보급하세요.';$('#objStatus').textContent=`감염 ${formatPeople(totalInfectedCount())} · R ${state.r.toFixed(2)} · 의료 ${Math.round(state.medicalLoad)}%`}}
function renderSpecial'''
s, n = objective_pattern.subn(new_objective, s, count=1)
assert n == 1, 'renderObjective not replaced'

# 10) Main HUD displays people count.
s = s.replace("$('#nationalPct').textContent=`${(nat*100).toFixed(1)}%`;", "$('#nationalPct').textContent=formatPeople(totalInfectedCount());", 1)

# 11) Tree width auto-expands so root nodes never overlap on mobile.
s = s.replace("const W=820,layerGap=132,top=74,H=Math.max(510,top*2+maxDepth*layerGap+40),positions={};", "const maxLayerSize=Math.max(...layers.map(l=>l.length),1),W=Math.max(820,maxLayerSize*190),layerGap=132,top=74,H=Math.max(510,top*2+maxDepth*layerGap+40),positions={};", 1)

# 12) CSS for dots, hubs, route flashes, improved mobile tapping.
css = r'''
/* v3.3 · transport network + people-count infection view */
.infectionDot{fill:#ff3f4a;stroke:#ff8790;stroke-width:.35;opacity:.86;filter:drop-shadow(0 0 2px rgba(255,35,55,.38))}
.transportHub{cursor:pointer;outline:none}.transportHub circle{stroke:#07110f;stroke-width:2;fill:#17362e;transition:.18s}.transportHub text{font-size:8px;font-weight:1000;text-anchor:middle;fill:#fff;pointer-events:none;paint-order:stroke;stroke:#07110f;stroke-width:2px}.transportHub.ktx circle{fill:#1f7896}.transportHub.airport circle{fill:#8f7220}.transportHub.bus circle{fill:#397748}.transportHub.port circle{fill:#425a9a}.transportHub.hot circle{stroke:#fff;stroke-width:2.6}.transportHub.pulse circle{animation:hubPulse .45s ease-in-out 2 alternate}.travelFlash{stroke-width:2.5;stroke-dasharray:6 6;opacity:.9;animation:routeFlash .9s ease-out forwards}.travelFlash.ktx{stroke:#77d8ff}.travelFlash.airport{stroke:#ffd166}.travelFlash.bus{stroke:#9ee493}.travelFlash.port{stroke:#8ea8ff}@keyframes routeFlash{0%{stroke-dashoffset:32;opacity:0}25%{opacity:1}100%{stroke-dashoffset:0;opacity:0}}@keyframes hubPulse{to{transform:scale(1.35)}}
.transportLegend{max-width:260px}.infectionLegendDot{width:10px;height:10px;border-radius:50%;background:#ff3f4a;box-shadow:0 0 5px rgba(255,63,74,.6);display:inline-block}.hubLegend{width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:1000;color:#fff}.hubLegend.ktx{background:#1f7896}.hubLegend.airport{background:#8f7220}.hubLegend.bus{background:#397748}.hubLegend.port{background:#425a9a}.transportTags{margin-top:6px}.skillNode{touch-action:manipulation}
@media(max-width:780px){.skillNode{width:168px;min-height:94px}.skillNode .skillName{font-size:13px}.transportHub circle{r:8}.transportHub text{font-size:8.5px}.transportLegend{max-width:225px}.transportLegend .legendRow{font-size:8.5px}.infectionDot{stroke-width:.25}.skillViewport{touch-action:pan-x pan-y}}
'''
assert '</style>' in s
s = s.replace('</style>', css + '\n</style>', 1)

path.write_text(s, encoding='utf-8')
print('OUTBREAK transport/count/dot upgrade applied')
