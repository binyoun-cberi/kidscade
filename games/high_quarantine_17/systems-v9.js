(()=>{
'use strict';

const NAMES=['김도윤','박유진','이주원','한예린','강태오','최은비','문지후','정하나','배시우','남지안','고민준','신유나','류정우','임소민','황도현','조아라','차시온','유채원','권태민','백서윤','송지호','이나경','도윤호','김하람','문태양','서민준','임하은','노준혁','정유리','박시현','최도겸','오세린','한도윤','배지훈','김예나','전우진','안서현','류민석','차윤아','신태경','마지수','김로아','윤재호','박하준','최수빈','오승민','서이안','강민호','한가은','정세아','김현우','이채린','남도현','권서영','문준서','백지아','오태성','신나연','윤하준','서지우','정민서','강서율','김시후','박채원','이현서','최우진','한지안'];
const JOBS=['정비사','서점원','배관공','학생','운송기사','조리사','우편원','교사','용접공','디자이너','경비원','화훼사','회계사','연구보조','목수','간호조무사','시설관리','약사','택배기사','전기기사','창고관리','간호사','사서','배달기사','미용사','연구원','실험기자재원','정비공','기술자'];
const DIALOGUE=[
 '검사 부탁드립니다.',
 '오늘 줄이 꽤 길군요.',
 '빨리 끝나면 좋겠습니다.',
 '이상한 건 없는 것 같은데요.',
 '요즘 검사가 더 꼼꼼해졌네요.',
 '안내받은 대로 검사하러 왔습니다.',
 '통행증은 여기 있습니다.',
 '몸 상태는 평소와 비슷합니다.'
];
const SPRITES=['player','female','adventurer','soldier'];
const DOC_ISSUES=[
 {id:'photo',label:'사진 불일치',detail:'통행증 사진과 실제 얼굴이 일치하지 않습니다.'},
 {id:'expired',label:'유효기간 만료',detail:'통행증 유효기간이 이미 지났습니다.'},
 {id:'code',label:'발급번호 오류',detail:'발급번호 형식이 현행 규격과 맞지 않습니다.'},
 {id:'district',label:'거주구역 불일치',detail:'신고된 거주구역과 통행증 구역이 다릅니다.'}
];

const RULESETS=[
 [
  {result:'quarantine',reason:'고열 + 지속 기침 · 즉시 격리/소각 기준',when:p=>p.temp>=38&&p.cough}
 ],
 [
  {result:'quarantine',reason:'고열 + 지속 기침 · 즉시 격리/소각 기준',when:p=>p.temp>=38&&p.cough},
  {result:'quarantine',reason:'UV 형광 반응 · 즉시 격리/소각 기준',when:p=>p.uv}
 ],
 [
  {result:'quarantine',reason:'고열 + 지속 기침 · 즉시 격리/소각 기준',when:p=>p.temp>=38&&p.cough},
  {result:'quarantine',reason:'D-7 혈액 양성 · 즉시 격리/소각',when:p=>p.district==='D-7'&&p.blood},
  {result:'retest',reason:'D-7 외 단독 UV 반응 · 추가검사/관찰 대상',when:p=>p.district!=='D-7'&&p.uv}
 ],
 [
  {result:'quarantine',reason:'고열 + 지속 기침 · 즉시 격리/소각 기준',when:p=>p.temp>=38&&p.cough},
  {result:'quarantine',reason:'D-7 혈액 양성 · 즉시 격리/소각',when:p=>p.district==='D-7'&&p.blood},
  {result:'retest',reason:'통행증 이상 · 추가검사/관찰 필요',when:p=>p.forged},
  {result:'retest',reason:'D-7 외 단독 UV 반응 · 추가검사/관찰 대상',when:p=>p.uv}
 ],
 [
  {result:'quarantine',reason:'오염 생체시료 반입 · 즉시 격리/소각',when:p=>p.bioSample},
  {result:'quarantine',reason:'고열 + 지속 기침 · 즉시 격리/소각 기준',when:p=>p.temp>=38&&p.cough},
  {result:'quarantine',reason:'D-7 혈액 양성 · 즉시 격리/소각',when:p=>p.district==='D-7'&&p.blood},
  {result:'retest',reason:'통행증 이상 · 추가검사/관찰 필요',when:p=>p.forged},
  {result:'retest',reason:'D-7 외 단독 UV 반응 · 추가검사/관찰 대상',when:p=>p.uv}
 ],
 [
  {result:'quarantine',reason:'오염 생체시료 반입 · 즉시 격리/소각',when:p=>p.bioSample},
  {result:'quarantine',reason:'D-7 혈액 양성 · 즉시 격리/소각',when:p=>p.district==='D-7'&&p.blood},
  {result:'quarantine',reason:'기침 + 비정상 호흡 · 즉시 격리/소각 기준',when:p=>p.cough&&p.resp},
  {result:'retest',reason:'통행증 이상 · 추가검사/관찰 필요',when:p=>p.forged},
  {result:'retest',reason:'D-7 외 단독 UV 반응 · 추가검사/관찰 대상',when:p=>p.uv},
  {result:'retest',reason:'고열·기침은 있으나 호흡 정상',when:p=>p.temp>=38&&p.cough&&!p.resp}
 ],
 [
  {result:'quarantine',reason:'오염 생체시료 반입 · 즉시 격리/소각',when:p=>p.bioSample},
  {result:'quarantine',reason:'D-7 혈액 양성 · 즉시 격리/소각',when:p=>p.district==='D-7'&&p.blood},
  {result:'quarantine',reason:'기침 + 비정상 호흡 · 즉시 격리/소각 기준',when:p=>p.cough&&p.resp},
  {result:'retest',reason:'통행증 이상 · 추가검사/관찰 필요',when:p=>p.forged},
  {result:'retest',reason:'D-7 외 단독 UV 반응 · 추가검사/관찰 대상',when:p=>p.uv},
  {result:'retest',reason:'D-7 외 혈액 단독 양성 · 추가검사/관찰 필요',when:p=>p.blood&&p.district!=='D-7'}
 ],
 [
  {result:'quarantine',reason:'오염 생체시료 반입 · 즉시 격리/소각',when:p=>p.bioSample},
  {result:'quarantine',reason:'D-7 혈액 양성 · 즉시 격리/소각',when:p=>p.district==='D-7'&&p.blood},
  {result:'quarantine',reason:'기침 + 비정상 호흡 · 즉시 격리/소각 기준',when:p=>p.cough&&p.resp},
  {result:'quarantine',reason:'혈액 양성 + 추가 이상 소견 · 즉시 격리/소각 기준',when:p=>p.blood&&(p.resp||p.uv)},
  {result:'retest',reason:'통행증 이상 · 추가검사/관찰 필요',when:p=>p.forged},
  {result:'retest',reason:'D-7 외 단독 UV 반응 · 추가검사/관찰 대상',when:p=>p.uv},
  {result:'retest',reason:'D-7 외 혈액 단독 양성 · 추가검사/관찰 필요',when:p=>p.blood&&p.district!=='D-7'},
  {result:'retest',reason:'고열·기침은 있으나 호흡 정상',when:p=>p.temp>=38&&p.cough&&!p.resp}
 ]
];

const DEFAULT_CITY={
 A:{label:'A 주거구역',infection:8,panic:4},
 B:{label:'B 상업구역',infection:11,panic:6},
 C:{label:'C 산업구역',infection:10,panic:5},
 D7:{label:'D-7 연구구역',infection:15,panic:8},
 CAMP:{label:'CAMP-17',infection:5,panic:3}
};
let city=JSON.parse(JSON.stringify(DEFAULT_CITY));
let cityLog=[];
let campaignSeed=0;
let activeIncident=null;
const INCIDENTS=[
 {id:'flu',label:'계절성 감기 유행',desc:'정상 시민 사이에서도 기침이 늘었습니다. 기침 하나만으로 감염을 단정하지 마십시오.',minWeek:1},
 {id:'heat',label:'폭염 경보',desc:'더위로 체온이 평소보다 높게 측정되는 시민이 있습니다. 복합 기준을 확인하십시오.',minWeek:1},
 {id:'supply',label:'혈액 키트 배송 지연',desc:'이번 주 혈액 검사 키트가 1개 적게 지급됩니다.',minWeek:2,bloodKitsDelta:-1,needsBlood:true},
 {id:'vent',label:'고위험 격리실 환기 고장',desc:'B 고위험실 환기 이상으로 내부 노출 위험이 증가했습니다. 양성자를 신속히 처리하고 A 관찰실과 분리하십시오.',minWeek:4,facilityRisk:1.5}
];

function hashString(s){
 let h=2166136261>>>0;
 for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
 return h>>>0;
}
function mulberry32(a){
 return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}
}
function ensureSeed(){
 if(campaignSeed)return campaignSeed;
 const q=new URLSearchParams(location.search).get('q17seed');
 if(q){campaignSeed=hashString(String(q));return campaignSeed}
 try{
  const saved=sessionStorage.getItem('q17_campaign_seed_v9');
  if(saved){campaignSeed=Number(saved)>>>0;return campaignSeed}
 }catch(_){}
 campaignSeed=(Date.now()^Math.floor(Math.random()*0xffffffff))>>>0;
 try{sessionStorage.setItem('q17_campaign_seed_v9',String(campaignSeed))}catch(_){}
 return campaignSeed;
}
function resetCampaign(){
 campaignSeed=(Date.now()^Math.floor(Math.random()*0xffffffff))>>>0;
 city=JSON.parse(JSON.stringify(DEFAULT_CITY));
 cityLog=[];
 activeIncident=null;
 try{sessionStorage.setItem('q17_campaign_seed_v9',String(campaignSeed))}catch(_){}
}
function rngFor(wi,index,salt){
 return mulberry32(hashString(ensureSeed()+':'+wi+':'+index+':'+(salt||'')));
}
function pick(arr,r){return arr[Math.floor(r()*arr.length)%arr.length]}
function weightedDistrict(r,infected){
 const entries=['A','B','C'];
 const weights=entries.map(k=>{
  const base=infected?city[k].infection:Math.max(6,22-city[k].infection);
  return Math.max(1,base);
 });
 const total=weights.reduce((a,b)=>a+b,0);let x=r()*total;
 for(let i=0;i<entries.length;i++){x-=weights[i];if(x<=0)return entries[i]}
 return 'A';
}
function uniqueName(r,used){
 for(let i=0;i<20;i++){const n=pick(NAMES,r);if(!used.has(n)){used.add(n);return n}}
 const n=pick(NAMES,r)+String(10+Math.floor(r()*89));used.add(n);return n;
}
function validPermit(wi,index,r){
 const n=170000+wi*100+index;
 return '#'+String(n)+'-'+String(Math.floor(r()*90)+10);
}
function invalidPermit(wi,index,r){
 return '#'+String(930000+wi*100+index)+'?'+String(Math.floor(r()*9));
}
function reskinCitizen(base,wi,index,used){
 const r=rngFor(wi,index,'citizen');
 const p=Object.assign({},base);
 p.name=uniqueName(r,used);
 p.age=Math.max(19,Math.min(61,(Number(base.age)||34)+Math.floor(r()*9)-4));
 p.job=pick(JOBS,r);
 p.sprite=pick(SPRITES,r);
 p.dialogue=pick(DIALOGUE,r);
 if(base.district==='D-7')p.district='D-7';
 else{
  const zone=weightedDistrict(r,!!base.infected);
  p.district=zone+'-'+(1+Math.floor(r()*7));
 }
 p.permitCode=validPermit(wi,index,r);
 p.docIssue=null;
 if(base.forged){
  const issue=pick(DOC_ISSUES,r);
  p.docIssue=issue.id;
  p.docIssueLabel=issue.label;
  p.docIssueDetail=issue.detail;
  if(issue.id==='photo'){
   const others=SPRITES.filter(s=>s!==p.sprite);
   p.docSprite=pick(others,r);
  }else{
   p.docSprite=p.sprite;
   if(issue.id==='code')p.permitCode=invalidPermit(wi,index,r);
   if(issue.id==='district'){
    const current=p.district==='D-7'?'D7':p.district.charAt(0);
    const choices=['A','B','C','D7'].filter(x=>x!==current);
    const z=pick(choices,r);
    p.documentDistrict=z==='D7'?'D-7':z+'-'+(1+Math.floor(r()*7));
   }
  }
 }else{
  p.docSprite=p.sprite;
 }
 return p;
}
function chooseIncident(week,wi){
 if(wi<=0)return null;
 const r=rngFor(wi,991,'incident');
 if(r()<.18)return null;
 const eligible=INCIDENTS.filter(x=>wi>=x.minWeek&&(!x.needsBlood||Number(week.bloodKits)>0));
 return eligible.length?eligible[Math.floor(r()*eligible.length)%eligible.length]:null;
}
function applyIncidentToCitizens(list,incident,wi){
 if(!incident||!list.length)return;
 const r=rngFor(wi,772,'incident-citizens');
 const healthy=list.filter(x=>!x.infected);
 if(!healthy.length)return;
 if(incident.id==='flu'){
  const p=healthy[Math.floor(r()*healthy.length)%healthy.length];
  p.cough=true;p.dialogue='콜록… 요즘 주변에도 감기 걸린 사람이 많아요.';
 }
 if(incident.id==='heat'){
  const candidates=healthy.filter(x=>x.temp<38);
  if(candidates.length){
   const p=candidates[Math.floor(r()*candidates.length)%candidates.length];
   p.temp=Math.min(38.6,Math.round((p.temp+.7+r()*.4)*10)/10);
   p.dialogue='밖이 너무 더워서 아직도 몸이 뜨거운 것 같아요.';
  }
 }
}
function prepareWeek(week,wi){
 if(!week||!Array.isArray(week.citizens))return{bloodKitsDelta:0};
 if(!week.__q17BaseCitizens){
  Object.defineProperty(week,'__q17BaseCitizens',{value:JSON.parse(JSON.stringify(week.citizens)),writable:true,enumerable:false});
 }
 activeIncident=chooseIncident(week,wi);
 const incidentId=activeIncident?activeIncident.id:'none';
 const key=String(ensureSeed())+':'+wi+':'+incidentId+':'+JSON.stringify(citySnapshot().map(x=>[x.id,x.infection]));
 if(week.__q17GeneratedKey!==key){
  const used=new Set();
  week.citizens=week.__q17BaseCitizens.map((p,i)=>reskinCitizen(p,wi,i,used));
  applyIncidentToCitizens(week.citizens,activeIncident,wi);
  week.__q17GeneratedKey=key;
 }
 return{bloodKitsDelta:activeIncident&&activeIncident.bloodKitsDelta||0,incident:activeIncident};
}
function evaluate(p,wi){
 const rules=RULESETS[Math.max(0,Math.min(RULESETS.length-1,wi))]||[];
 const hit=rules.find(r=>r.when(p));
 return hit?hit.result:'pass';
}
function reason(p,wi){
 const rules=RULESETS[Math.max(0,Math.min(RULESETS.length-1,wi))]||[];
 const hit=rules.find(r=>r.when(p));
 if(hit){
  if(p.forged&&hit.reason.indexOf('통행증')>=0&&p.docIssueLabel)return p.docIssueLabel+' · 추가검사 대상';
  return hit.reason;
 }
 if(p.district==='D-7')return'D-7 의무 혈액검사 음성 및 즉시 소각 기준 없음';
 return'현행 즉시 격리/소각·추가검사 기준에 해당하지 않음';
}
function documentCheck(p){
 if(!p)return{ok:true,label:'문서 이상 없음',detail:'통행증 항목이 현행 규정과 일치합니다.'};
 if(p.forged){
  return{ok:false,label:p.docIssueLabel||'통행증 이상',detail:p.docIssueDetail||'통행증 대조에서 불일치가 발견되었습니다.'};
 }
 return{ok:true,label:'문서 이상 없음',detail:'사진·발급번호·유효기간·거주구역을 대조했지만 이상이 없습니다.'};
}
function districtId(text){
 const s=String(text||'');
 if(s.indexOf('D-7')>=0)return'D7';
 if(s.charAt(0)==='A')return'A';
 if(s.charAt(0)==='B')return'B';
 if(s.charAt(0)==='C')return'C';
 return'A';
}
function pushCityLog(text){
 cityLog.unshift(text);
 if(cityLog.length>10)cityLog.length=10;
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function applyDecision(payload,districtText){
 if(!payload)return;
 const id=districtId(districtText||payload.district);
 const origin=city[id]||city.A;
 if(payload.action==='pass'&&payload.infected&&!payload.ok){
  origin.infection=clamp(origin.infection+3,0,99);
  city.CAMP.infection=clamp(city.CAMP.infection+5,0,99);
  origin.panic=clamp(origin.panic+2,0,100);
  pushCityLog(origin.label+' 감염자 통과 → CAMP-17 노출 증가');
 }else if(payload.action==='quarantine'&&payload.infected&&payload.ok){
  origin.infection=clamp(origin.infection-1,0,99);
  pushCityLog(origin.label+' 감염 의심자 차단');
 }else if(payload.wrongQuarantine){
  origin.panic=clamp(origin.panic+5,0,100);
  pushCityLog(origin.label+' 정상 시민 오판 소각 → 불안 급증');
 }else if(payload.ok){
  origin.panic=clamp(origin.panic-1,0,100);
 }
 return citySnapshot();
}
function applyCombat(result,context){
 result=result||{};context=context||'';
 if(context==='camp'){
  city.CAMP.infection=clamp(city.CAMP.infection+(Number(result.infectionDelta)||0),0,99);
  pushCityLog('CAMP-17 대응 결과 반영');
 }else if(context==='isolation'&&Number(result.infectionDelta)<0){
  city.D7.infection=clamp(city.D7.infection+Math.ceil(Number(result.infectionDelta)/2),0,99);
 }
}
function citySnapshot(){
 return Object.keys(city).map(id=>({id:id,label:city[id].label,infection:Math.round(city[id].infection),panic:Math.round(city[id].panic)}));
}
function citySummary(){
 const rows=citySnapshot();
 const highest=rows.slice().sort((a,b)=>b.infection-a.infection)[0];
 const avg=Math.round(rows.reduce((s,x)=>s+x.infection,0)/rows.length);
 return{average:avg,highest:highest,rows:rows,log:cityLog.slice(),incident:activeIncident};
}
function bulletin(){
 const s=citySummary();
 const event=s.incident?'<b>상황실 특보 · '+s.incident.label+'</b> · '+s.incident.desc+'<br>':'';
 if(!s.highest)return event+'도시 상황 자료가 없습니다.';
 if(s.highest.infection>=25)return event+'<b>'+s.highest.label+'</b>의 감염 위험이 높습니다. 해당 구역 통행자의 검사 누락에 주의하세요.';
 if(s.highest.infection>=16)return event+'<b>'+s.highest.label+'</b>에서 신고가 늘고 있습니다. 출신 구역은 단서일 뿐, 현재 지침으로 판정하세요.';
 return event+'도시 감염은 아직 통제 범위입니다. 출신 구역만 보고 단정하지 말고 검사 결과를 확인하세요.';
}
function weekIncident(){return activeIncident?Object.assign({},activeIncident):null}
function facilityExposureStep(){
 const s=citySummary();
 const incidentRisk=activeIncident&&activeIncident.facilityRisk||1;
 return Math.max(incidentRisk,s.average>=20?1.25:1);
}

window.Q17Systems={
 version:'9.0',
 prepareWeek:prepareWeek,
 evaluate:evaluate,
 reason:reason,
 documentCheck:documentCheck,
 applyDecision:applyDecision,
 applyCombat:applyCombat,
 citySnapshot:citySnapshot,
 citySummary:citySummary,
 bulletin:bulletin,
 weekIncident:weekIncident,
 facilityExposureStep:facilityExposureStep,
 resetCampaign:resetCampaign,
 getSeed:ensureSeed
};
})();