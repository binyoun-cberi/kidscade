(()=>{
'use strict';
if(!window.Q17Outbreak)return;

const A='../../assets/game/characters/people/kenney-platformer-characters/';
const SPRITES={
 player:A+'player/poses/player-stand.png',
 female:A+'female/poses/female-stand.png',
 adventurer:A+'adventurer/poses/adventurer-stand.png',
 soldier:A+'soldier/poses/soldier-stand.png',
 zombie:A+'zombie/poses/zombie-stand.png'
};
const ZONES=[
 {id:'residential',name:'주거동',desc:'휴식 · 숙소 정리'},
 {id:'supply',name:'배급소',desc:'식량 · 물자 분배'},
 {id:'gate',name:'경계초소',desc:'출입 감시 · 순찰'}
];
const TASKS={
 residential:['침상 정리','휴식','의무실 보조','세탁물 정리'],
 supply:['식량 배급','식수 운반','물자 정리','배급표 확인'],
 gate:['철책 순찰','출입 확인','무전 대기','경계 근무']
};
const NAMES=['강서아','윤도현','박하린','김우진','정민서','오태윤','한예지','이준호'];
const ROLES=['배급 담당','시설 정비','의무 보조','경계 근무','조리 담당','물자 기록','통신 담당','환경 정리'];
const RESIDENT_SPRITES=['female','adventurer','player','soldier','female','player','adventurer','soldier'];

let residents=[],threats=[],campLog=[],seq=0,tickNo=0,campCollapsed=false,globalIncident=null,currentView='station';

function esc(s){return String(s).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})}
function rand(a){return a[Math.floor(Math.random()*a.length)]}
function bridge(){return window.Q17Bridge||null}
function dangerCount(){return threats.filter(function(t){return t.phase==='infected'||t.phase==='zombie'}).length+residents.filter(function(r){return r.status==='bitten'}).length}
function livingCount(){return residents.filter(function(r){return r.status!=='lost'&&r.status!=='zombie'}).length}
function safeCount(){return residents.filter(function(r){return r.status==='safe'}).length}
function addCampLog(text){
 campLog.unshift(text);
 if(campLog.length>18)campLog.length=18;
 renderCamp();
}
function resetCamp(){
 residents=NAMES.map(function(name,i){
  const zone=ZONES[i%ZONES.length].id;
  return{id:i+1,name:name,role:ROLES[i],sprite:RESIDENT_SPRITES[i],zone:zone,status:'safe',task:rand(TASKS[zone]),turn:0};
 });
 threats=[];campLog=[];seq=0;tickNo=0;campCollapsed=false;globalIncident=null;
 addCampLog('CAMP-17 정상 운영 시작 · 생존자 '+residents.length+'명');
 renderAll();
}
function zoneInfo(id){return ZONES.find(function(z){return z.id===id})||ZONES[0]}
function randomZone(exclude){
 const arr=ZONES.filter(function(z){return z.id!==exclude});
 return rand(arr).id;
}
function updateRoutine(r){
 if(r.status!=='safe')return;
 if(Math.random()<.28)r.zone=randomZone(r.zone);
 r.task=rand(TASKS[r.zone]);
}
function convertResident(r){
 if(!r||r.status!=='bitten')return;
 r.status='zombie';r.task='변이 완료';
 threats.push({id:'r'+r.id,name:r.name,sprite:r.sprite,zone:r.zone,phase:'zombie',timer:0,attackCd:2,source:'resident'});
 addCampLog('<b>'+esc(r.name)+'</b> 변이 완료 · '+zoneInfo(r.zone).name+'에 좀비 발생');
 const b=bridge();if(b)b.applyOutbreakResult({infectionDelta:2,trustDelta:-2,scoreDelta:-80});
}
function biteResident(t){
 const candidates=residents.filter(function(r){return r.status==='safe'&&r.zone===t.zone});
 if(!candidates.length){t.zone=randomZone(t.zone);addCampLog(esc(t.name)+'이(가) '+zoneInfo(t.zone).name+' 쪽으로 이동');return}
 const r=rand(candidates);r.status='bitten';r.turn=3;r.task='응급 격리 필요';
 addCampLog('<b>'+esc(r.name)+'</b> 물림 · 약 '+(r.turn*3)+'초 후 변이 위험');
}
function campTick(){
 if(document.hidden||window.Q17Outbreak.isCombatActive&&window.Q17Outbreak.isCombatActive())return;
 tickNo++;
 residents.forEach(function(r){
  if(r.status==='safe')updateRoutine(r);
  else if(r.status==='bitten'){r.turn--;if(r.turn<=0)convertResident(r)}
 });
 threats.forEach(function(t){
  if(t.phase==='infected'){
   t.timer--;
   if(t.timer<=0){t.phase='zombie';t.attackCd=2;addCampLog('<b>'+esc(t.name)+'</b> 캠프 내부에서 좀비화 · '+zoneInfo(t.zone).name+' 비상')}
  }else if(t.phase==='zombie'){
   t.attackCd=(t.attackCd||0)-1;
   if(t.attackCd<=0){t.attackCd=2;biteResident(t)}
  }
 });
 const living=livingCount();
 if(!campCollapsed&&living===0&&dangerCount()>0){
  campCollapsed=true;addCampLog('<b>CAMP-17 붕괴</b> · 생존자가 남지 않았습니다.');
  const b=bridge();if(b)b.applyOutbreakResult({infectionDelta:10,trustDelta:-10,scoreDelta:-500});
 }
 renderAll();
}
function isolationTick(){
 if(document.hidden||window.Q17Outbreak.isCombatActive&&window.Q17Outbreak.isCombatActive())return;
 if(window.Q17Outbreak.tickIsolation)window.Q17Outbreak.tickIsolation();
 renderDock();
}
function onCampBreach(payload){
 const zone='gate';
 threats.push({id:'t'+(++seq),name:payload.name||'미확인 감염자',sprite:payload.sprite||'player',zone:zone,phase:'infected',timer:2,attackCd:2,source:'intruder'});
 addCampLog('<b>'+esc(payload.name||'미확인 시민')+'</b> 감염 상태로 캠프 진입 · 경계초소에서 이상 행동');
 renderAll();
 flashDock('camp');
}
function registerGlobalOutbreak(info){
 globalIncident=Object.assign({},info||{});
 addCampLog('외곽 격리선 경보 · '+(globalIncident.severity||'감염자 집단')+' 발생');
 renderAll();
 flashDock('station');
}
function responsePayload(){
 const active=threats.filter(function(t){return t.phase==='infected'||t.phase==='zombie'});
 return{name:active.length?active[0].name:'캠프 감염자',threatCount:Math.max(1,active.length)};
}
function applyCombatLosses(n){
 let candidates=residents.filter(function(r){return r.status==='safe'||r.status==='bitten'});
 n=Math.min(Number(n)||0,candidates.length);
 for(let i=0;i<n;i++){
  const r=candidates.splice(Math.floor(Math.random()*candidates.length),1)[0];
  if(!r)break;r.status='lost';r.task='진압 중 사망';
  addCampLog('<b>'+esc(r.name)+'</b> 진압 과정에서 사망');
 }
}
function respondCamp(){
 if(!dangerCount()){return}
 const btn=document.getElementById('q17CampRespond');if(btn)btn.disabled=true;
 const payload=responsePayload();
 const ok=window.Q17Outbreak.respondCamp&&window.Q17Outbreak.respondCamp(payload,function(result){
  if(result&&result.won){
   applyCombatLosses(result.losses||0);
   threats=[];
   residents.forEach(function(r){if(r.status==='bitten'){r.status='safe';r.turn=0;r.task='응급 처치 후 안정'}});
   addCampLog('현장 진압 완료 · 캠프 내부 감염원 제거');
  }else{
   applyCombatLosses(result&&result.losses||0);
   addCampLog('현장 진압 실패 · 캠프 감염 상황 지속');
  }
  renderAll();
 });
 if(ok===false&&btn)btn.disabled=false;
}
function respondGlobal(){
 if(!globalIncident)return;
 const ok=window.Q17Outbreak.respondGlobal&&window.Q17Outbreak.respondGlobal(function(result){
  if(result&&result.won){addCampLog('외곽 격리선 진압 완료');globalIncident=null}
  else addCampLog('외곽 격리선 진압 실패');
  renderAll();
 });
 if(ok===false)return;
}
function spriteFor(key){return SPRITES[key]||SPRITES.player}
function residentHtml(r){
 const status=r.status==='safe'?'안전':r.status==='bitten'?'물림 · 변이 '+Math.max(0,r.turn):r.status==='zombie'?'좀비화':'사망';
 const cls=' '+r.status;
 return '<div class="q17-camp-person'+cls+'"><img src="'+spriteFor(r.status==='zombie'?'zombie':r.sprite)+'" alt=""><b>'+esc(r.name)+'</b><small>'+esc(r.role)+'</small><span>'+esc(r.task)+'</span><em>'+status+'</em></div>';
}
function threatHtml(t){
 const label=t.phase==='infected'?'감염 의심 · 변이 '+Math.max(0,t.timer):'좀비';
 return '<div class="q17-camp-person threat '+t.phase+'"><img src="'+spriteFor(t.phase==='zombie'?'zombie':t.sprite)+'" alt=""><b>'+esc(t.name)+'</b><small>검역 누락자</small><span>'+esc(zoneInfo(t.zone).name)+'</span><em>'+label+'</em></div>';
}
function zoneHtml(z){
 const people=residents.filter(function(r){return r.zone===z.id&&r.status!=='lost'}).map(residentHtml).join('');
 const danger=threats.filter(function(t){return t.zone===z.id}).map(threatHtml).join('');
 return '<section class="q17-camp-zone '+(danger?'danger':'')+'"><div class="q17-camp-zone-head"><b>'+z.name+'</b><small>'+z.desc+'</small></div><div class="q17-camp-people">'+(people+danger||'<div class="q17-camp-empty">현재 인원 없음</div>')+'</div></section>';
}
function renderCamp(){
 const host=document.getElementById('q17CampZones');if(!host)return;
 host.innerHTML=ZONES.map(zoneHtml).join('');
 const safe=document.getElementById('q17CampSafe'),bitten=document.getElementById('q17CampBitten'),z=document.getElementById('q17CampZombie');
 if(safe)safe.textContent=safeCount();if(bitten)bitten.textContent=residents.filter(function(r){return r.status==='bitten'}).length;
 if(z)z.textContent=threats.filter(function(t){return t.phase==='zombie'}).length+residents.filter(function(r){return r.status==='zombie'}).length;
 const log=document.getElementById('q17CampLog');if(log)log.innerHTML=campLog.length?campLog.map(function(x){return '• '+x}).join('<br>'):'• 캠프 기록 없음';
 const state=document.getElementById('q17CampState');if(state)state.textContent=campCollapsed?'붕괴':dangerCount()?'감염 경보':'정상 운영';
 const respond=document.getElementById('q17CampRespond');if(respond){respond.disabled=!dangerCount();respond.textContent=dangerCount()?'현장 출동 · 위험 '+dangerCount()+'건':'현장 출동 · 위험 없음'}
}
function renderDock(){
 const iso=window.Q17Outbreak.getIsolationSnapshot?window.Q17Outbreak.getIsolationSnapshot():[];
 const isoDanger=iso.filter(function(x){return x.status==='positive'||x.status==='turning'||x.status==='zombie'||x.status==='exposed'}).length;
 const campDanger=dangerCount();
 const ib=document.getElementById('q17ViewIsoBadge'),cb=document.getElementById('q17ViewCampBadge'),sb=document.getElementById('q17ViewStationBadge');
 if(ib){ib.textContent=isoDanger;ib.hidden=!isoDanger}
 if(cb){cb.textContent=campDanger;cb.hidden=!campDanger}
 if(sb){sb.textContent=globalIncident?'!':'';sb.hidden=!globalIncident}
 document.querySelectorAll('.q17-view-btn').forEach(function(b){b.classList.toggle('active',b.dataset.view===currentView)});
 const alert=document.getElementById('q17GlobalAlert');
 if(alert){
  alert.classList.toggle('show',!!globalIncident);
  if(globalIncident)document.getElementById('q17GlobalAlertText').textContent=(globalIncident.severity||'외곽 감염')+' · 감염률 '+globalIncident.infection+'% · 예상 '+globalIncident.count+'명';
 }
}
function renderAll(){renderCamp();renderDock()}
function closeViews(){
 const camp=document.getElementById('q17Camp');if(camp)camp.classList.remove('show');
 const iso=document.getElementById('q17Isolation');if(iso)iso.classList.remove('show');
}
function switchView(view){
 currentView=view;
 if(view==='station'){closeViews()}
 else if(view==='isolation'){const camp=document.getElementById('q17Camp');if(camp)camp.classList.remove('show');if(window.Q17Outbreak.openIsolation)window.Q17Outbreak.openIsolation()}
 else if(view==='camp'){const iso=document.getElementById('q17Isolation');if(iso)iso.classList.remove('show');document.getElementById('q17Camp').classList.add('show');renderCamp()}
 renderDock();
}
function flashDock(view){
 const b=document.querySelector('.q17-view-btn[data-view="'+view+'"]');if(!b)return;b.classList.remove('flash');void b.offsetWidth;b.classList.add('flash');
}
function mount(){
 const css=document.createElement('style');
 css.textContent=[
 '#q17ViewDock{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:255;display:flex;gap:6px;padding:6px;background:#070a0ddd;border:1px solid #4a555f;box-shadow:0 10px 35px #000b;backdrop-filter:blur(7px)}',
 '.q17-view-btn{position:relative;border:1px solid #4d5963;background:#1b2228;color:#dbe2e6;padding:9px 13px;font-size:11px;font-weight:900;cursor:pointer;min-width:96px}.q17-view-btn.active{background:#c1a84e;color:#171717;border-color:#d4bc60}.q17-view-btn.flash{animation:q17viewflash .65s ease 3}',
 '.q17-view-badge{position:absolute;right:3px;top:2px;min-width:17px;height:17px;border-radius:9px;background:#b83f46;color:#fff;font-size:9px;line-height:17px;text-align:center;font-style:normal}',
 '#q17Camp{position:fixed;inset:0;z-index:244;background:#050708e8;display:none;align-items:center;justify-content:center;padding:15px 15px 74px}#q17Camp.show{display:flex}',
 '.q17-camp-card{width:min(1180px,100%);max-height:90vh;overflow:auto;background:#10161b;border:1px solid #5d6872;box-shadow:0 25px 80px #000}',
 '.q17-camp-head{position:sticky;top:0;z-index:2;background:#1d252b;border-bottom:1px solid #46515a;padding:11px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.q17-camp-head h2{margin:0;font-size:16px}.q17-live{color:#ef7777;font-size:10px;font-weight:900;letter-spacing:.08em}.q17-live:before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:#e94f57;margin-right:5px;animation:q17live 1s infinite}',
 '.q17-camp-stats{display:flex;gap:8px;padding:10px 14px;background:#151c21;border-bottom:1px solid #313b43;flex-wrap:wrap}.q17-camp-stat{background:#0b1014;border:1px solid #34414a;padding:8px 11px;font-size:10px;color:#94a0a8}.q17-camp-stat b{display:block;color:#eef2f4;font-size:17px;margin-top:2px}',
 '.q17-camp-zones{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:12px 14px}.q17-camp-zone{position:relative;background:linear-gradient(#28332f 0 22%,#151c19 22%);border:1px solid #435149;min-height:330px;padding:48px 8px 8px;overflow:hidden}.q17-camp-zone.danger{border-color:#95464b;background:linear-gradient(#3b2022 0 22%,#1b1213 22%)}',
 '.q17-camp-zone-head{position:absolute;left:8px;right:8px;top:8px}.q17-camp-zone-head b{display:block;font-size:13px}.q17-camp-zone-head small{color:#8f9d95;font-size:9px}.q17-camp-people{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}',
 '.q17-camp-person{position:relative;min-height:126px;background:#0d1310cc;border:1px solid #46554b;padding:6px;text-align:center}.q17-camp-person img{height:68px;max-width:70px;object-fit:contain}.q17-camp-person b{display:block;font-size:10px}.q17-camp-person small,.q17-camp-person span{display:block;font-size:8px;color:#8f9a94}.q17-camp-person em{display:inline-block;margin-top:4px;padding:2px 5px;font-size:8px;font-style:normal;font-weight:900;background:#183021;color:#9ee0af}.q17-camp-person.bitten{border-color:#a17f3d}.q17-camp-person.bitten em{background:#3a2a11;color:#f0cf79}.q17-camp-person.zombie,.q17-camp-person.threat{border-color:#99454a;background:#251416}.q17-camp-person.zombie em,.q17-camp-person.threat em{background:#411b1f;color:#ff9da2}.q17-camp-person.infected em{background:#382a16;color:#ebcb76}.q17-camp-empty{grid-column:1/-1;min-height:230px;display:flex;align-items:center;justify-content:center;border:1px dashed #39463f;color:#69776f;font-size:10px}',
 '.q17-camp-bottom{display:grid;grid-template-columns:1fr auto;gap:10px;padding:0 14px 14px}.q17-camp-log{background:#090d10;border:1px solid #303941;padding:10px;max-height:130px;overflow:auto;font-size:10px;line-height:1.65;color:#aab4ba}.q17-camp-log b{color:#e8c65e}.q17-camp-actions{display:flex;align-items:flex-start}.q17-camp-respond{border:1px solid #a64a50;background:#3b1a1e;color:#ffb0b4;padding:12px 15px;font-weight:950;cursor:pointer;min-width:170px}.q17-camp-respond:disabled{opacity:.38;cursor:not-allowed}',
 '#q17GlobalAlert{position:fixed;left:50%;bottom:72px;transform:translateX(-50%);z-index:254;display:none;align-items:center;gap:10px;background:#31191c;border:1px solid #98454b;color:#f5c0c2;padding:8px 10px;box-shadow:0 8px 25px #000a;font-size:10px}#q17GlobalAlert.show{display:flex}#q17GlobalAlert button{border:0;background:#d2b450;color:#171717;font-weight:900;padding:7px 10px;cursor:pointer}',
 '@keyframes q17viewflash{50%{box-shadow:0 0 22px #d94e5688;border-color:#e45e65}}@keyframes q17live{50%{opacity:.25}}',
 '@media(max-width:760px){#q17ViewDock{bottom:6px;width:calc(100% - 12px)}.q17-view-btn{flex:1;min-width:0;padding:8px 5px;font-size:9px}.q17-camp-zones{grid-template-columns:1fr}.q17-camp-zone{min-height:260px}.q17-camp-people{grid-template-columns:repeat(3,1fr)}.q17-camp-bottom{grid-template-columns:1fr}.q17-camp-respond{width:100%}#q17GlobalAlert{bottom:59px;max-width:calc(100% - 18px)}}',
 '@media(max-width:470px){.q17-camp-people{grid-template-columns:repeat(2,1fr)}}'
 ].join('\n');
 document.head.appendChild(css);

 const dock=document.createElement('div');dock.id='q17ViewDock';
 dock.innerHTML='<button type="button" class="q17-view-btn active" data-view="station">검역소<em class="q17-view-badge" id="q17ViewStationBadge" hidden></em></button><button type="button" class="q17-view-btn" data-view="isolation">격리시설<em class="q17-view-badge" id="q17ViewIsoBadge" hidden></em></button><button type="button" class="q17-view-btn" data-view="camp">생존자 캠프<em class="q17-view-badge" id="q17ViewCampBadge" hidden></em></button>';
 document.body.appendChild(dock);

 const camp=document.createElement('div');camp.id='q17Camp';
 camp.innerHTML='<div class="q17-camp-card"><div class="q17-camp-head"><div><h2>CAMP-17 생존자 캠프</h2><span class="q17-live">LIVE CCTV</span></div><b id="q17CampState">정상 운영</b></div><div class="q17-camp-stats"><div class="q17-camp-stat">안전<b id="q17CampSafe">0</b></div><div class="q17-camp-stat">물림<b id="q17CampBitten">0</b></div><div class="q17-camp-stat">좀비<b id="q17CampZombie">0</b></div><div class="q17-camp-stat">운영 상태<b>자동 순환</b></div></div><div class="q17-camp-zones" id="q17CampZones"></div><div class="q17-camp-bottom"><div class="q17-camp-log" id="q17CampLog"></div><div class="q17-camp-actions"><button type="button" class="q17-camp-respond" id="q17CampRespond">현장 출동 · 위험 없음</button></div></div></div>';
 document.body.appendChild(camp);

 const alert=document.createElement('div');alert.id='q17GlobalAlert';
 alert.innerHTML='<span id="q17GlobalAlertText"></span><button type="button" id="q17GlobalRespond">외곽 출동</button>';
 document.body.appendChild(alert);

 dock.addEventListener('click',function(e){const b=e.target.closest('.q17-view-btn');if(b)switchView(b.dataset.view)});
 document.getElementById('q17CampRespond').addEventListener('click',respondCamp);
 document.getElementById('q17GlobalRespond').addEventListener('click',respondGlobal);
 camp.addEventListener('click',function(e){if(e.target===camp)switchView('station')});

 const oldIsoClose=document.getElementById('q17IsoClose');
 if(oldIsoClose)oldIsoClose.addEventListener('click',function(){currentView='station';renderDock()});
 const iso=document.getElementById('q17Isolation');
 if(iso)iso.addEventListener('click',function(e){if(e.target===iso){currentView='station';renderDock()}});

 if(window.Q17Outbreak&&typeof window.Q17Outbreak.reset==='function'){
  const oldReset=window.Q17Outbreak.reset;
  window.Q17Outbreak.reset=function(){const v=oldReset.apply(this,arguments);resetCamp();return v};
 }
 resetCamp();
 setInterval(campTick,3200);
 setInterval(isolationTick,5000);
}
mount();

window.Q17Surveillance={
 onCampBreach:onCampBreach,
 registerGlobalOutbreak:registerGlobalOutbreak,
 openCamp:function(){switchView('camp')},
 switchView:switchView,
 snapshot:function(){return{residents:residents.map(function(r){return Object.assign({},r)}),threats:threats.map(function(t){return Object.assign({},t)}),globalIncident:globalIncident}}
};
})();