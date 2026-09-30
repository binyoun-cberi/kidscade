(()=>{
'use strict';
if(!window.Q17Systems)return;

const style=document.createElement('style');
style.textContent=[
'.q17-city-btn{border:1px solid #526672;background:#17232a;color:#d9e7ed;padding:6px 9px;font-size:11px;font-weight:900;cursor:pointer}',
'.q17-city-btn.warn{border-color:#9b7438;background:#312617;color:#f2d082}.q17-city-btn.danger{border-color:#9b4449;background:#35191c;color:#ff9ea4}',
'#q17CityModal{position:fixed;inset:0;background:#050709dc;z-index:280;display:none;align-items:center;justify-content:center;padding:16px}#q17CityModal.show{display:flex}',
'.q17-city-card{width:min(820px,100%);max-height:90vh;overflow:auto;background:#151b20;border:1px solid #56636d;box-shadow:0 26px 90px #000;padding:18px}',
'.q17-city-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.q17-city-head h2{margin:0;font-size:18px}.q17-city-close{border:1px solid #59636e;background:#202830;color:#eef2f4;padding:7px 11px;cursor:pointer}',
'.q17-city-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:14px 0}.q17-district{background:#0e1317;border:1px solid #35414a;padding:10px}.q17-district b{display:block;font-size:12px}.q17-district strong{display:block;font-size:22px;margin:6px 0}.q17-district small{color:#8e9aa3}',
'.q17-riskbar{height:6px;background:#252d33;margin-top:7px;overflow:hidden}.q17-riskbar i{display:block;height:100%;background:#bf9a47}',
'.q17-city-log{background:#0b0f12;border:1px solid #313b43;padding:10px;font-size:11px;line-height:1.7;color:#b2bcc3;min-height:74px}',
'.q17-city-note{font-size:11px;color:#98a5ad;line-height:1.55;margin:8px 0 0}',
'.q17-city-report{margin:12px 0;background:#10161a;border:1px solid #3a464f;padding:12px}.q17-city-report h3{margin:0 0 8px;font-size:14px}.q17-city-report-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}.q17-city-report-grid div{background:#1c242a;padding:8px;font-size:10px}.q17-city-report-grid b{display:block;font-size:15px;margin-top:3px}',
'.q17-iso-room{grid-template-columns:1.35fr .8fr!important;gap:12px!important;padding:34px 12px 14px!important;min-height:320px!important}.q17-iso-room:before{content:"A 관찰·검사실 → 양성 확인 → B 고위험 격리실"!important}',
'.q17-room-zone{border:1px solid #49545d;background:#0d1216aa;padding:34px 8px 8px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;position:relative;min-height:235px}.q17-room-zone[data-room="A"]{grid-template-columns:repeat(2,minmax(0,1fr));border-color:#496775}.q17-room-zone[data-room="B"]{grid-template-columns:repeat(2,minmax(0,1fr));border-color:#75464a;background:#170f11cc}.q17-room-zone>h3{position:absolute;left:9px;top:7px;margin:0;font-size:11px;color:#d8c36b;letter-spacing:.05em}.q17-room-zone[data-room="A"]>h3{color:#9dcddd}.q17-room-zone[data-room="B"]>h3{color:#f0a0a4}.q17-room-empty{grid-column:1/-1;display:flex;align-items:center;justify-content:center;color:#697680;font-size:10px;border:1px dashed #374149;min-height:160px}',
'.q17-room-badge{display:inline-block;margin-top:4px;padding:2px 5px;border:1px solid #4d6572;background:#17232a;color:#acd0df;font-size:8px;font-weight:900}.q17-room-zone[data-room="B"] .q17-room-badge{border-color:#75464a;background:#2a1719;color:#f2acb0}.q17-detainee-actions .move{border-color:#8c7540;background:#302714;color:#ead27e}',
'@media(max-width:780px){.q17-city-grid,.q17-city-report-grid{grid-template-columns:repeat(2,1fr)}.q17-iso-room{grid-template-columns:1fr!important}.q17-room-zone,.q17-room-zone[data-room="A"],.q17-room-zone[data-room="B"]{grid-template-columns:repeat(2,1fr)}}',
'@media(max-width:520px){.q17-room-zone{grid-template-columns:1fr 1fr}.q17-city-grid{grid-template-columns:1fr 1fr}}'
].join('\n');
document.head.appendChild(style);

const meters=document.querySelector('.meters')||document.body;
const cityBtn=document.createElement('button');
cityBtn.type='button';cityBtn.id='q17CityBtn';cityBtn.className='q17-city-btn';cityBtn.textContent='도시 상황';
meters.appendChild(cityBtn);

const modal=document.createElement('div');
modal.id='q17CityModal';
modal.innerHTML='<div class="q17-city-card"><div class="q17-city-head"><h2>제17구역 도시 감염 상황</h2><button type="button" class="q17-city-close" id="q17CityClose">닫기</button></div><div class="q17-city-grid" id="q17CityGrid"></div><div class="q17-city-log" id="q17CityLog"></div><p class="q17-city-note">구역 감염도는 다음 주 시민 출신 분포에 반영됩니다. 감염자가 통과하면 출신 구역과 CAMP-17 위험이 함께 오릅니다.</p></div>';
document.body.appendChild(modal);

function esc(s){return String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
function renderCity(){
 const s=window.Q17Systems.citySummary();
 const grid=document.getElementById('q17CityGrid');
 if(grid)grid.innerHTML=s.rows.map(x=>{
  const width=Math.max(2,Math.min(100,x.infection));
  return '<div class="q17-district"><b>'+esc(x.label)+'</b><strong>'+x.infection+'%</strong><small>불안 '+x.panic+'</small><div class="q17-riskbar"><i style="width:'+width+'%"></i></div></div>';
 }).join('');
 const log=document.getElementById('q17CityLog');
 if(log)log.innerHTML=s.log.length?s.log.map(x=>'• '+esc(x)).join('<br>'):'• 아직 큰 변화가 없습니다.';
 cityBtn.textContent='도시 · '+s.highest.label.replace('구역','')+' '+s.highest.infection+'%';
 cityBtn.classList.toggle('danger',s.highest.infection>=25);
 cityBtn.classList.toggle('warn',s.highest.infection>=16&&s.highest.infection<25);
 const bulletin=document.getElementById('cityBulletin');
 if(bulletin)bulletin.innerHTML=window.Q17Systems.bulletin();
}
function openCity(){renderCity();modal.classList.add('show')}
function closeCity(){modal.classList.remove('show')}
cityBtn.addEventListener('click',openCity);
document.getElementById('q17CityClose').addEventListener('click',closeCity);
modal.addEventListener('click',e=>{if(e.target===modal)closeCity()});

function districtReportHtml(){
 const s=window.Q17Systems.citySummary();
 return '<div class="q17-city-report" id="q17CityReport"><h3>구역별 감염 상황</h3><div class="q17-city-report-grid">'+s.rows.map(x=>'<div>'+esc(x.label)+'<b>'+x.infection+'%</b></div>').join('')+'</div></div>';
}
function injectReport(){
 const report=document.getElementById('reportContent');
 if(!report)return;
 const old=document.getElementById('q17CityReport');if(old)old.remove();
 const wrap=document.createElement('div');wrap.innerHTML=districtReportHtml();
 const node=wrap.firstElementChild;
 const table=report.querySelector('table');
 if(table)report.insertBefore(node,table);else report.appendChild(node);
}

if(window.Q17Outbreak&&typeof window.Q17Outbreak.onDecision==='function'){
 const originalDecision=window.Q17Outbreak.onDecision;
 window.Q17Outbreak.onDecision=function(payload,next){
  try{window.Q17Systems.applyDecision(payload,payload&&payload.district)}catch(_){}
  renderCity();
  return originalDecision.call(this,payload,next);
 };
}
if(window.Q17Outbreak&&typeof window.Q17Outbreak.reset==='function'){
 const originalReset=window.Q17Outbreak.reset;
 window.Q17Outbreak.reset=function(){
  const v=originalReset.apply(this,arguments);
  try{window.Q17Systems.resetCampaign()}catch(_){}
  renderCity();return v;
 };
}

const reportModal=document.getElementById('reportModal');
if(reportModal){
 let was=false;
 new MutationObserver(()=>{
  const showing=reportModal.classList.contains('show');
  if(showing&&!was){injectReport();renderCity()}
  was=showing;
 }).observe(reportModal,{attributes:true,attributeFilter:['class']});
}
if(window.Q17Bridge&&typeof window.Q17Bridge.applyOutbreakResult==='function'){
 const originalApply=window.Q17Bridge.applyOutbreakResult;
 window.Q17Bridge.applyOutbreakResult=function(result){
  const overlay=document.getElementById('q17Outbreak');
  let context='';
  if(overlay&&overlay.classList.contains('show')){
   const title=(document.getElementById('q17CombatTitle')||{}).textContent||'';
   if(title.indexOf('생존자 캠프')>=0)context='camp';
   else if(title.indexOf('격리실')>=0)context='isolation';
  }
  const v=originalApply.apply(this,arguments);
  if(context)try{window.Q17Systems.applyCombat(result,context)}catch(_){}
  renderCity();
  return v;
 };
}

renderCity();
window.Q17Rework={renderCity:renderCity,openCity:openCity};
})();