(()=>{'use strict';

const A='../../assets/game/characters/people/kenney-platformer-characters/';
const SPRITES={
 player:A+'player/poses/player-stand.png',
 female:A+'female/poses/female-stand.png',
 adventurer:A+'adventurer/poses/adventurer-stand.png',
 soldier:A+'soldier/poses/soldier-stand.png',
 zombie:A+'zombie/poses/zombie-stand.png'
};
const PLAYER=SPRITES.player,ZOMBIE=SPRITES.zombie;

const css=[
'#q17Outbreak{position:fixed;inset:0;z-index:260;background:#050708f2;display:none;align-items:center;justify-content:center;padding:10px}',
'#q17Outbreak.show{display:flex}',
'.q17-combat-shell{width:min(1040px,100%);background:#11161b;border:1px solid #59636e;box-shadow:0 24px 90px #000;position:relative}',
'.q17-combat-head{display:flex;gap:14px;align-items:center;justify-content:space-between;padding:10px 14px;background:#251517;border-bottom:1px solid #734146;flex-wrap:wrap}',
'.q17-combat-title{font-weight:1000;letter-spacing:.06em;color:#ff8989}.q17-combat-stats{display:flex;gap:15px;font-size:12px;color:#ccd3d9;flex-wrap:wrap}.q17-combat-stats b{color:#fff}',
'#q17CombatCanvas{display:block;width:100%;height:auto;aspect-ratio:16/9;background:linear-gradient(#202830,#0e1318);touch-action:none;cursor:crosshair}',
'.q17-combat-help{padding:9px 12px;color:#9ca7b1;font-size:11px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}',
'.q17-alert{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#090c0ff2;border:2px solid #b64f55;padding:18px 22px;text-align:center;min-width:min(500px,88%);box-shadow:0 12px 45px #000;display:none;z-index:5}',
'.q17-alert.show{display:block}.q17-alert h2{margin:0 0 8px;color:#ff7b7b}.q17-alert p{color:#ccd1d5;line-height:1.55}.q17-alert button{border:0;background:#c2a64c;color:#171717;font-weight:900;padding:10px 16px;cursor:pointer}',
'.q17-dead{position:fixed;inset:0;z-index:400;background:#050505f7;display:none;align-items:center;justify-content:center;padding:20px}.q17-dead.show{display:flex}',
'.q17-dead-card{width:min(620px,100%);border:1px solid #65383b;background:#171112;padding:25px;text-align:center;box-shadow:0 20px 80px #000}.q17-dead-card h1{color:#e36b70;margin-top:0}.q17-dead-card p{color:#c8c1c1;line-height:1.65}.q17-dead-card button{border:0;background:#d2b450;color:#171717;font-weight:950;padding:12px 18px;cursor:pointer}',
'.q17-iso-btn{border:1px solid #6b747d;background:#222a32;color:#eef2f5;padding:6px 10px;font-size:11px;font-weight:900;box-shadow:inset 0 -2px #0005;cursor:pointer;white-space:nowrap}.q17-iso-btn:hover{background:#303a44}.q17-iso-btn.alert{border-color:#d45d64;color:#ff9ba1;background:#321a1d;animation:q17pulse .8s ease-in-out 2}',
'#q17Isolation{position:fixed;inset:0;z-index:245;background:#050708dc;display:none;align-items:center;justify-content:center;padding:15px}#q17Isolation.show{display:flex}',
'.q17-iso-card{width:min(900px,100%);max-height:90vh;overflow:auto;background:#11161b;border:1px solid #59636e;box-shadow:0 25px 80px #000}',
'.q17-iso-head{position:sticky;top:0;z-index:2;background:#20262d;border-bottom:1px solid #47515b;padding:11px 14px;display:flex;justify-content:space-between;gap:10px;align-items:center}.q17-iso-head h2{font-size:15px;margin:0}.q17-iso-head-actions{display:flex;gap:7px;flex-wrap:wrap}.q17-iso-close,.q17-burn-room{border:1px solid #59636e;background:#12171c;color:#dde2e5;padding:6px 10px;cursor:pointer}.q17-burn-room{border-color:#93474c;background:#391b1e;color:#ffb5b8;font-weight:900}',
'.q17-iso-note{margin:12px 14px;background:#251e18;border-left:4px solid #b99847;padding:9px 11px;color:#c9c0ae;font-size:11px;line-height:1.55}',
'.q17-iso-room{margin:12px 14px;padding:16px;background:repeating-linear-gradient(90deg,#171d22 0 62px,#232b31 62px 64px);border:9px solid #333c43;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;min-height:230px}',
'.q17-detainee{position:relative;background:#0d1115cc;border:1px solid #46515a;min-height:180px;padding:7px;text-align:center;overflow:hidden}.q17-detainee:after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 24px,#86919a36 24px 27px);pointer-events:none}',
'.q17-detainee img{height:105px;max-width:90%;object-fit:contain;filter:drop-shadow(0 6px 5px #0008)}.q17-detainee.zombie{border-color:#873f43;background:#241315cc}.q17-detainee.exposed{border-color:#9c7e3e}',
'.q17-detainee b{display:block;font-size:11px}.q17-detainee small{display:block;color:#9da7af;font-size:9px;margin-top:2px}.q17-detainee .q17-status{margin-top:5px;font-size:10px;font-weight:900;color:#d8c46b}.q17-detainee.zombie .q17-status{color:#ff7777}',
'.q17-wrong{display:inline-block;margin-top:4px;background:#71383b;color:#ffd5d5;font-size:8px;font-weight:900;padding:2px 4px}.q17-detainee-actions{position:relative;z-index:2;display:flex;gap:4px;justify-content:center;flex-wrap:wrap;margin-top:7px}.q17-detainee-actions button{border:1px solid #56616b;background:#1a2026;color:#e2e7ea;padding:4px 6px;font-size:9px;font-weight:850;cursor:pointer}.q17-detainee-actions .release{border-color:#477b58;background:#183021;color:#9ee0af}.q17-detainee-actions .burn{border-color:#8c4449;background:#33191c;color:#ff9da2}',
'.q17-iso-log{margin:12px 14px 16px;background:#0b0f12;border:1px solid #343d45;padding:10px;max-height:150px;overflow:auto;font-size:10px;color:#aeb7be;line-height:1.6}.q17-iso-log b{color:#e7c65c}',
'.q17-camp-label{position:absolute;left:14px;top:14px;color:#c7d0d6;font-size:10px;background:#111a;padding:5px 7px;border:1px solid #4a555e}',
'@keyframes q17pulse{50%{transform:scale(1.06);box-shadow:0 0 24px #b34b4b88}}',
'@media(max-width:680px){#q17Outbreak{padding:0}.q17-combat-shell{height:100%;display:flex;flex-direction:column}.q17-combat-head{padding:8px 10px}.q17-combat-title{font-size:12px}.q17-combat-stats{gap:8px;font-size:10px}#q17CombatCanvas{flex:1;min-height:0;aspect-ratio:auto}.q17-combat-help{font-size:9px;padding:6px 8px}.q17-iso-room{grid-template-columns:repeat(2,minmax(0,1fr));padding:8px}.q17-iso-btn{padding:5px 7px;font-size:10px}}'
].join('\n');
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);

const wrap=document.createElement('div');wrap.id='q17Outbreak';
wrap.innerHTML='<div class="q17-combat-shell"><div class="q17-combat-head"><div class="q17-combat-title" id="q17CombatTitle">⚠ 격리선 붕괴 · 긴급 진압</div><div class="q17-combat-stats"><span>체력 <b id="q17Hp">100</b></span><span>잔여 좀비 <b id="q17Left">0</b></span><span id="q17SurvivorStat" style="display:none">캠프 생존자 <b id="q17Survivors">0</b></span><span>탄창 <b id="q17Ammo">12</b></span><span>감염률 <b id="q17Risk">0%</b></span></div></div><canvas id="q17CombatCanvas" width="960" height="540"></canvas><div class="q17-combat-help"><span>이동 WASD / 방향키 · 조준 마우스 · 클릭/스페이스 사격 · R 재장전</span><span>모바일: 누른 방향으로 이동하며 가까운 좀비를 자동 사격</span></div><div class="q17-alert" id="q17Alert"><h2 id="q17AlertTitle">격리선 붕괴</h2><p id="q17AlertText"></p><button id="q17AlertBtn" type="button">진압 시작</button></div></div>';
document.body.appendChild(wrap);

const dead=document.createElement('div');dead.className='q17-dead';dead.id='q17Dead';
dead.innerHTML='<div class="q17-dead-card"><h1 id="q17DeadTitle">검역소 함락</h1><p id="q17DeadText"></p><p><b>검역 단계의 한 번의 판정이 뒤쪽 생존 상황까지 이어집니다.</b></p><button type="button" id="q17Restart">처음부터 다시</button></div>';
document.body.appendChild(dead);

const isoBtn=document.createElement('button');isoBtn.type='button';isoBtn.className='q17-iso-btn';isoBtn.id='q17IsoBtn';isoBtn.textContent='격리실 0/6 · CCTV';(document.querySelector('.meters')||document.body).appendChild(isoBtn);
const iso=document.createElement('div');iso.id='q17Isolation';
iso.innerHTML='<div class="q17-iso-card"><div class="q17-iso-head"><h2>공동 격리실 CCTV · <span id="q17IsoCapacity">0 / 6</span></h2><div class="q17-iso-head-actions"><button type="button" class="q17-burn-room" id="q17BurnRoom">격리실 비상 소각</button><button type="button" class="q17-iso-close" id="q17IsoClose">닫기</button></div></div><div class="q17-iso-note">정원은 6명입니다. 정상으로 보이는 사람은 충분히 관찰한 뒤 생존자 캠프로 돌려보낼 수 있습니다. <b>비상 소각은 격리실 전체</b>를 태우므로 정상인이 남아 있다면 큰 불이익이 생깁니다.</div><div class="q17-iso-room" id="q17IsoRoom"></div><div class="q17-iso-log" id="q17IsoLog"></div></div>';
document.body.appendChild(iso);

const canvas=document.getElementById('q17CombatCanvas'),ctx=canvas.getContext('2d');
const images={};Object.keys(SPRITES).forEach(function(k){const im=new Image();im.src=SPRITES[k];images[k]=im});
const keys={},mouse={x:canvas.width/2,y:canvas.height/2,down:false};

let active=false,started=false,last=0,player=null,zombies=[],bullets=[],survivors=[],reload=0,shootCd=0,autoTarget=null;
let mode='outbreak',continuation=null,campLosses=0,currentIncidentInf=0,currentIntruder='';
const ISOLATION_CAPACITY=6;\nlet isolation=[],isoLog=[],isoSeq=0;

function bridge(){return window.Q17Bridge||null}
function infection(){const b=bridge();return b?b.getState().infection:Number((document.getElementById('infection')||{}).textContent?.replace('%',''))||0}
function spriteUrl(key){return SPRITES[key]||SPRITES.player}
function notify(text){
 const m=document.getElementById('statusMsg');if(!m)return;
 m.textContent=text;m.classList.add('show','big');clearTimeout(notify.t);notify.t=setTimeout(function(){m.classList.remove('show','big')},1900);
}
function addIsoLog(text){isoLog.unshift(text);if(isoLog.length>12)isoLog.length=12}
function isoStatus(d){
 if(d.status==='zombie')return d.acquired?'격리 중 감염 → 좀비화':'좀비화';
 if(d.status==='turning')return'변이 진행 중';
 if(d.status==='infected')return d.acquired?'격리 중 감염':'증상 악화';
 if(d.status==='exposed')return'감염자에게 노출됨';
 if(d.status==='cleared')return'이상 없음 · 퇴실 가능';
 return d.wrong?'정상 · 관찰 '+Math.min(2,d.stage)+'/2':'관찰 '+Math.min(2,d.stage)+'/2';
}
function renderIsolation(){
 isoBtn.textContent='격리실 '+isolation.length+'/'+ISOLATION_CAPACITY+' · CCTV';
 const cap=document.getElementById('q17IsoCapacity');if(cap)cap.textContent=isolation.length+' / '+ISOLATION_CAPACITY;
 const zombiesHere=isolation.filter(function(d){return d.status==='zombie'}).length;
 isoBtn.classList.toggle('alert',zombiesHere>0||isolation.some(function(d){return d.status==='exposed'||d.acquired}));
 const room=document.getElementById('q17IsoRoom');
 if(!isolation.length){room.innerHTML='<div style="grid-column:1/-1;color:#7f8a93;text-align:center;padding:70px 10px">현재 격리 중인 시민이 없습니다.</div>'}
 else room.innerHTML=isolation.map(function(d){
  const img=d.status==='zombie'?SPRITES.zombie:spriteUrl(d.sprite);
  const cls=d.status==='zombie'?' zombie':(d.status==='exposed'||d.acquired?' exposed':'');
  const release=d.status==='cleared'?'<button type="button" class="release" data-iso-action="release" data-id="'+d.id+'">생존자 캠프로 보내기</button>':'';
  const burn='<button type="button" class="burn" data-iso-action="burn" data-id="'+d.id+'">소각실 이송</button>';
  return '<div class="q17-detainee'+cls+'"><img src="'+img+'" alt=""><b>'+escapeHtml(d.name)+'</b><small>'+(d.infectedAtEntry?'입실 당시 감염 의심':'입실 당시 정상')+'</small><div class="q17-status">'+escapeHtml(isoStatus(d))+'</div>'+(d.wrong?'<span class="q17-wrong">오판 격리</span>':'')+'<div class="q17-detainee-actions">'+release+burn+'</div></div>';
 }).join('');
 document.getElementById('q17IsoLog').innerHTML=isoLog.length?isoLog.map(function(x){return '• '+x}).join('<br>'):'아직 격리실 기록이 없습니다.';
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]})}
function addDetainee(p){
 if(isolation.length>=ISOLATION_CAPACITY){notify('격리실 정원 초과 · 먼저 자리를 확보하세요.');openIsolation();return false}
 const d={id:++isoSeq,name:p.name,sprite:p.sprite||'player',infectedAtEntry:!!p.infected,wrong:!!p.wrongQuarantine,status:p.infected?'infected':'stable',stage:0,exposure:0,acquired:false};
 isolation.push(d);
 addIsoLog('<b>'+escapeHtml(d.name)+'</b> 격리실 입실'+(d.wrong?' · 정상인을 잘못 격리함':''));
 renderIsolation();return true;
}
function advanceIsolation(){
 if(!isolation.length)return;
 let eventText='';
 isolation.forEach(function(d){
  if(d.status==='stable'){
   d.stage++;
   if(d.stage>=2){d.status='cleared';eventText=d.name+'의 관찰 결과 이상이 없습니다. 퇴실시킬 수 있습니다.';addIsoLog('<b>'+escapeHtml(d.name)+'</b> 관찰 종료 · 이상 없음')}
  }else if(d.status==='infected'){
   d.stage++;
   if(d.stage>=3){d.status='zombie';eventText=d.name+'이(가) 격리실에서 좀비로 변했습니다.';addIsoLog('<b>'+escapeHtml(d.name)+'</b> 좀비화 확인')}
   else if(d.stage>=2){d.status='turning';eventText=d.name+'의 상태가 급격히 악화되고 있습니다.';addIsoLog('<b>'+escapeHtml(d.name)+'</b> 변이 징후 발생')}
  }else if(d.status==='turning'){
   d.stage++;
   if(d.stage>=3){d.status='zombie';eventText=d.name+'이(가) 격리실에서 좀비로 변했습니다.';addIsoLog('<b>'+escapeHtml(d.name)+'</b> 좀비화 확인')}
  }
 });
 const hasZombie=isolation.some(function(d){return d.status==='zombie'});
 if(hasZombie){
  isolation.forEach(function(d){
   if(!d.wrong||d.infectedAtEntry||d.acquired||d.status==='zombie'||d.status==='infected'||d.status==='turning')return;
   d.exposure++;
   if(d.exposure===1){d.status='exposed';eventText=d.name+'이(가) 감염자와 같은 격리실에 노출됐습니다.';addIsoLog('<b>'+escapeHtml(d.name)+'</b> 감염자 접촉')}
   else if(d.exposure>=2){d.status='infected';d.acquired=true;d.stage=0;eventText=d.name+'이(가) 잘못 격리된 뒤 감염되었습니다.';addIsoLog('<b>'+escapeHtml(d.name)+'</b> 격리 중 감염 확인');const b=bridge();if(b)b.applyOutbreakResult({trustDelta:-4,scoreDelta:-120})}
  });
 }
 renderIsolation();
 if(eventText)notify('격리실 경보 · '+eventText);
}
function openIsolation(){renderIsolation();iso.classList.add('show')}
function releaseDetainee(id){
 const d=isolation.find(function(x){return x.id===id});if(!d||d.status!=='cleared')return;
 isolation=isolation.filter(function(x){return x.id!==id});
 addIsoLog('<b>'+escapeHtml(d.name)+'</b> 관찰 종료 · 생존자 캠프로 이동');
 const b=bridge();if(b)b.applyOutbreakResult({trustDelta:2,scoreDelta:70});
 notify(d.name+' · 이상 없음 확인, 생존자 캠프로 이동');renderIsolation();
}
function burnDetainee(id){
 const d=isolation.find(function(x){return x.id===id});if(!d)return;
 if(!window.confirm(d.name+'을(를) 소각실로 이송하시겠습니까? 되돌릴 수 없습니다.'))return;
 const infected=!!(d.infectedAtEntry||d.acquired||d.status==='infected'||d.status==='turning'||d.status==='zombie');
 isolation=isolation.filter(function(x){return x.id!==id});
 addIsoLog('<b>'+escapeHtml(d.name)+'</b> 소각실 이송'+(infected?' · 감염원 제거':' · 정상인 소각'));
 const b=bridge();if(b)b.applyOutbreakResult(infected?{infectionDelta:-1,trustDelta:-1,scoreDelta:60}:{trustDelta:-14,scoreDelta:-260});
 notify(infected?'감염원 소각 완료':'정상인을 소각했습니다 · 시민 신뢰 급락');renderIsolation();
}
function burnRoom(){
 if(!isolation.length){notify('격리실이 비어 있습니다.');return}
 if(!window.confirm('격리실 전체를 비상 소각하시겠습니까? 정상인도 함께 사망할 수 있습니다.'))return;
 const healthy=isolation.filter(function(d){return !(d.infectedAtEntry||d.acquired||d.status==='infected'||d.status==='turning'||d.status==='zombie')}).length;
 const infected=isolation.length-healthy;
 addIsoLog('<b>비상 소각 실시</b> · 감염 '+infected+'명 / 정상 '+healthy+'명');
 isolation=[];
 const b=bridge();if(b)b.applyOutbreakResult({infectionDelta:-Math.min(8,infected*2),trustDelta:-(healthy*12+2),scoreDelta:infected*80-healthy*260});
 notify(healthy?'격리실 소각 · 정상인 '+healthy+'명 희생':'격리실 소각 · 감염원 제거');renderIsolation();
}
function resetIsolation(){isolation=[];isoLog=[];isoSeq=0;renderIsolation();iso.classList.remove('show')}

isoBtn.addEventListener('click',openIsolation);
document.getElementById('q17IsoClose').addEventListener('click',function(){iso.classList.remove('show')});
document.getElementById('q17BurnRoom').addEventListener('click',burnRoom);
document.getElementById('q17IsoRoom').addEventListener('click',function(e){const btn=e.target.closest('button[data-iso-action]');if(!btn)return;const id=Number(btn.dataset.id);if(btn.dataset.isoAction==='release')releaseDetainee(id);else if(btn.dataset.isoAction==='burn')burnDetainee(id)});
iso.addEventListener('click',function(e){if(e.target===iso)iso.classList.remove('show')});
renderIsolation();

function difficulty(){
 const inf=infection();
 return {inf:inf,count:Math.max(5,Math.min(26,6+Math.floor((inf-18)*.75))),speed:46+Math.max(0,inf-20)*1.2,hp:1+Math.floor(Math.max(0,inf-28)/10)};
}
function resizeCanvas(){
 const r=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
 const w=Math.max(320,Math.round(r.width*dpr)),h=Math.max(240,Math.round(r.height*dpr));
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
}
function spawnZombie(x,y,hp,speed,name,attackDelay){zombies.push({x:x,y:y,r:22*(window.devicePixelRatio||1),hp:hp||1,speed:speed||70*(window.devicePixelRatio||1),hit:0,name:name||'',attackDelay:attackDelay||0})}
function setupCombat(kind,payload){
 resizeCanvas();mode=kind;currentIncidentInf=infection();currentIntruder=payload&&payload.name||'';campLosses=0;
 const W=canvas.width,H=canvas.height,dpr=window.devicePixelRatio||1;
 player={x:W/2,y:H*.82,r:25*dpr,hp:100,ammo:12,maxAmmo:12};
 zombies=[];bullets=[];survivors=[];reload=0;shootCd=0;autoTarget=null;
 if(kind==='camp'){
  const survivorSprites=['female','adventurer','soldier','player','female','adventurer','soldier'];
  const pts=[[.34,.34],[.48,.28],[.62,.36],[.40,.48],[.58,.50],[.47,.60],[.68,.58]];
  pts.forEach(function(p,i){survivors.push({x:W*p[0],y:H*p[1],r:20*dpr,sprite:survivorSprites[i],alive:true,wander:(i%2?1:-1)*(14+i*1.5)*dpr,bite:0,bitten:false,turnTimer:0})});
  spawnZombie(W*.10,H*.46,1,58*dpr,currentIntruder,1.5);
  document.getElementById('q17CombatTitle').textContent='⚠ 생존자 캠프 침입 · 감염자 추격';
  document.getElementById('q17SurvivorStat').style.display='';
 }else{
  const d=difficulty();
  for(let i=0;i<d.count;i++){
   const side=i%4;let x,y;
   if(side===0){x=Math.random()*W;y=-30}else if(side===1){x=W+30;y=Math.random()*H}else if(side===2){x=Math.random()*W;y=H+30}else{x=-30;y=Math.random()*H}
   spawnZombie(x,y,d.hp,d.speed*(.8+Math.random()*.35)*dpr,'');
  }
  document.getElementById('q17CombatTitle').textContent='⚠ 격리선 붕괴 · 긴급 진압';
  document.getElementById('q17SurvivorStat').style.display='none';
 }
 updateHud();
}
function updateHud(){
 document.getElementById('q17Left').textContent=zombies.length;
 document.getElementById('q17Hp').textContent=player?player.hp:100;
 document.getElementById('q17Ammo').textContent=player?player.ammo:12;
 document.getElementById('q17Risk').textContent=currentIncidentInf+'%';
 document.getElementById('q17Survivors').textContent=survivors.filter(function(s){return s.alive}).length;
}
function showGlobalOutbreak(){
 if(active||!bridge())return;
 const d=difficulty();if(d.inf<20)return;
 active=true;started=false;continuation=null;setupCombat('outbreak',{});
 wrap.classList.add('show');
 const severity=d.inf>=40?'대규모 붕괴':d.inf>=30?'중대 경보':'국지적 돌파';
 document.getElementById('q17AlertTitle').textContent=severity;
 document.getElementById('q17AlertText').innerHTML='도시 감염률이 <b>'+d.inf+'%</b>까지 올라 격리선 바깥에서 집단 감염이 발생했습니다.<br>이번 진압 대상은 <b>'+d.count+'명</b>입니다. 검역 단계에서 놓친 감염이 많을수록 더 위험합니다.';
 document.getElementById('q17Alert').classList.add('show');
}
function showCampBreach(payload,next){
 if(active)return false;
 active=true;started=false;continuation=typeof next==='function'?next:null;setupCombat('camp',payload);
 wrap.classList.add('show');
 document.getElementById('q17AlertTitle').textContent='생존자 캠프 긴급 경보';
 document.getElementById('q17AlertText').innerHTML='<b>'+escapeHtml(payload.name)+'</b>을(를) 통과시켰지만 감염자였습니다.<br>이미 생존자 캠프로 들어갔습니다. <b>다른 생존자를 물기 전에</b> 직접 들어가 제압하십시오. 늦을수록 좀비 수가 늘어납니다.';
 document.getElementById('q17Alert').classList.add('show');
 return true;
}
function shoot(tx,ty){
 if(!started||shootCd>0||reload>0)return;
 if(player.ammo<=0){startReload();return}
 const dx=tx-player.x,dy=ty-player.y,len=Math.hypot(dx,dy)||1;
 bullets.push({x:player.x,y:player.y,vx:dx/len*650*(window.devicePixelRatio||1),vy:dy/len*650*(window.devicePixelRatio||1),life:1.2});
 player.ammo--;shootCd=.13;updateHud();if(player.ammo<=0)startReload();
}
function startReload(){if(!player||reload>0||player.ammo===player.maxAmmo)return;reload=1.05}
function nearestZombie(){let best=null,bd=Infinity;zombies.forEach(function(z){const d=(z.x-player.x)*(z.x-player.x)+(z.y-player.y)*(z.y-player.y);if(d<bd){bd=d;best=z}});return best}
function nearestTargetForZombie(z){
 let target=player,bd=Math.hypot(z.x-player.x,z.y-player.y);
 if(mode==='camp'&&z.attackDelay<=0){
  survivors.forEach(function(s){if(!s.alive||s.bitten)return;const d=Math.hypot(z.x-s.x,z.y-s.y)*.86;if(d<bd){bd=d;target=s}});
 }
 return target;
}
function convertSurvivor(s){
 if(!s.alive)return;s.alive=false;campLosses++;
 spawnZombie(s.x,s.y,1,68*(window.devicePixelRatio||1),'캠프 감염자',2.0);
 notify('캠프 감염 확산 · 생존자 1명이 좀비로 변했습니다.');
 updateHud();
}
function update(dt){
 if(!started)return;
 shootCd=Math.max(0,shootCd-dt);
 if(reload>0){reload-=dt;if(reload<=0){player.ammo=player.maxAmmo;updateHud()}}
 let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
 if(dx||dy){const l=Math.hypot(dx,dy);player.x+=dx/l*220*dt*(window.devicePixelRatio||1);player.y+=dy/l*220*dt*(window.devicePixelRatio||1)}
 player.x=Math.max(player.r,Math.min(canvas.width-player.r,player.x));player.y=Math.max(player.r,Math.min(canvas.height-player.r,player.y));
 if(mouse.down)shoot(mouse.x,mouse.y);
 if(autoTarget){const ax=autoTarget.x-player.x,ay=autoTarget.y-player.y,l=Math.hypot(ax,ay);if(l>55*(window.devicePixelRatio||1)){player.x+=ax/l*150*dt*(window.devicePixelRatio||1);player.y+=ay/l*150*dt*(window.devicePixelRatio||1)}const n=nearestZombie();if(n)shoot(n.x,n.y)}
 if(mode==='camp'){
  survivors.forEach(function(s){
   if(!s.alive)return;
   if(s.bitten){s.turnTimer-=dt;if(s.turnTimer<=0){convertSurvivor(s);return}}
   let nearest=null,nd=Infinity;zombies.forEach(function(z){const d=Math.hypot(z.x-s.x,z.y-s.y);if(d<nd){nd=d;nearest=z}});
   if(nearest&&nd<155*(window.devicePixelRatio||1)&&!s.bitten){
    const ax=s.x-nearest.x,ay=s.y-nearest.y,l=Math.hypot(ax,ay)||1;
    s.x+=ax/l*72*dt*(window.devicePixelRatio||1);s.y+=ay/l*72*dt*(window.devicePixelRatio||1);
   }else if(!s.bitten){s.x+=s.wander*dt;if(s.x<canvas.width*.28||s.x>canvas.width*.74)s.wander*=-1}
   s.x=Math.max(canvas.width*.27,Math.min(canvas.width*.76,s.x));s.y=Math.max(canvas.height*.25,Math.min(canvas.height*.66,s.y));
   if(!s.bitten)s.bite=Math.max(0,s.bite-dt*.35);
  });
 }
 bullets.forEach(function(b){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt});
 bullets=bullets.filter(function(b){return b.life>0&&b.x>-20&&b.y>-20&&b.x<canvas.width+20&&b.y<canvas.height+20});
 zombies.forEach(function(z){
  z.attackDelay=Math.max(0,z.attackDelay-dt);
  const target=nearestTargetForZombie(z),ax=target.x-z.x,ay=target.y-z.y,l=Math.hypot(ax,ay)||1;
  z.x+=ax/l*z.speed*dt;z.y+=ay/l*z.speed*dt;z.hit=Math.max(0,z.hit-dt);
  if(target===player){
   if(l<player.r+z.r&&z.hit<=0){player.hp=Math.max(0,player.hp-12);z.hit=.65;updateHud();if(player.hp<=0){lose();return}}
  }else if(target.alive&&!target.bitten&&z.attackDelay<=0&&l<target.r+z.r){
   target.bite=(target.bite||0)+dt;
   if(target.bite>=1.35){target.bitten=true;target.turnTimer=4.2;target.bite=0;z.attackDelay=.8;notify('생존자 물림 · 약 4초 뒤 변이 위험');}
  }
 });
 bullets.forEach(function(b){zombies.forEach(function(z){if(z.hp<=0||b.life<=0)return;if(Math.hypot(b.x-z.x,b.y-z.y)<z.r+5){z.hp--;b.life=0}})});
 zombies=zombies.filter(function(z){return z.hp>0});updateHud();
 if(zombies.length===0&&!survivors.some(function(s){return s.alive&&s.bitten}))win();
}
function draw(){
 const W=canvas.width,H=canvas.height,dpr=window.devicePixelRatio||1;ctx.clearRect(0,0,W,H);
 ctx.fillStyle=mode==='camp'?'#18211d':'#151b20';ctx.fillRect(0,0,W,H);
 ctx.strokeStyle=mode==='camp'?'#32443a':'#2a343d';ctx.lineWidth=2;const g=64*dpr;
 for(let x=0;x<W;x+=g){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
 for(let y=0;y<H;y+=g){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
 if(mode==='camp'){
  ctx.fillStyle='#2e3c32';ctx.fillRect(W*.24,H*.18,W*.56,H*.52);
  ctx.strokeStyle='#8a8e76';ctx.lineWidth=5*dpr;ctx.strokeRect(W*.24,H*.18,W*.56,H*.52);
  ctx.fillStyle='#d7c45e';ctx.font=(12*dpr)+'px sans-serif';ctx.fillText('SURVIVOR CAMP',W*.27,H*.23);
  survivors.forEach(function(s){if(!s.alive)return;const im=images[s.sprite]||images.player,ss=s.r*3;ctx.drawImage(im,s.x-ss/2,s.y-ss*.67,ss,ss);if(s.bitten){ctx.fillStyle='#d6575f';ctx.beginPath();ctx.arc(s.x,s.y-ss*.6,6*dpr,0,Math.PI*2);ctx.fill()}});
 }else{
  ctx.fillStyle='#784047';ctx.fillRect(0,0,W,8*dpr);ctx.fillRect(0,H-8*dpr,W,8*dpr);ctx.fillRect(0,0,8*dpr,H);ctx.fillRect(W-8*dpr,0,8*dpr,H);
 }
 bullets.forEach(function(b){ctx.fillStyle='#f6d86d';ctx.beginPath();ctx.arc(b.x,b.y,4*dpr,0,Math.PI*2);ctx.fill()});
 zombies.forEach(function(z){const s=z.r*3;ctx.save();ctx.translate(z.x,z.y);const flip=player.x<z.x?-1:1;ctx.scale(flip,1);if(z.hit>0)ctx.globalAlpha=.55;ctx.drawImage(images.zombie,-s/2,-s*.68,s,s);ctx.restore()});
 const ps=player.r*3.1;ctx.drawImage(images.player,player.x-ps/2,player.y-ps*.7,ps,ps);
 if(reload>0){ctx.fillStyle='#000a';ctx.fillRect(player.x-35*dpr,player.y+35*dpr,70*dpr,8*dpr);ctx.fillStyle='#e2c65c';ctx.fillRect(player.x-35*dpr,player.y+35*dpr,70*dpr*(1-reload/1.05),8*dpr)}
}
function loop(t){if(!active)return;const dt=Math.min(.033,(t-last)/1000||0);last=t;update(dt);draw();if(active)requestAnimationFrame(loop)}
function win(){
 if(!active)return;
 const wonMode=mode,losses=campLosses,inf=currentIncidentInf,next=continuation;
 started=false;active=false;continuation=null;wrap.classList.remove('show');
 const b=bridge();
 if(wonMode==='camp'){
  const reduction=losses===0?4:Math.max(1,3-losses);
  if(b)b.applyOutbreakResult({won:true,infectionDelta:-reduction,trustDelta:-(1+losses*2),scoreDelta:Math.max(60,320-losses*70)});
  notify(losses===0?'생존자 캠프 진압 성공 · 추가 감염 없음':'생존자 캠프 진압 성공 · 추가 감염 '+losses+'명');
  if(next)setTimeout(next,350);
 }else{
  if(b)b.applyOutbreakResult({won:true,infectionDelta:-Math.min(10,4+Math.floor(inf/8)),trustDelta:-2,scoreDelta:450+inf*8});
  notify('격리선 진압 성공 · 도시 감염률 감소');
 }
}
function lose(){
 if(!active)return;
 const lostMode=mode;started=false;active=false;continuation=null;wrap.classList.remove('show');
 const b=bridge();if(b)b.applyOutbreakResult({won:false,infectionDelta:8,trustDelta:-15,scoreDelta:-500,gameOver:true});
 document.getElementById('q17DeadTitle').textContent=lostMode==='camp'?'생존자 캠프 붕괴':'검역소 함락';
 document.getElementById('q17DeadText').innerHTML=lostMode==='camp'?'통과시킨 감염자를 제때 막지 못했습니다.<br>캠프에서 감염이 연쇄적으로 번졌고 플레이어도 공격을 받아 사망했습니다.':'격리선이 무너졌고 감염자들이 검역소 안까지 들어왔습니다.<br>진압에 실패해 제17구역은 폐쇄되었습니다.';
 dead.classList.add('show');
}

document.getElementById('q17AlertBtn').addEventListener('click',function(){document.getElementById('q17Alert').classList.remove('show');started=true;last=performance.now();requestAnimationFrame(loop)});
document.getElementById('q17Restart').addEventListener('click',function(){dead.classList.remove('show');location.reload()});
window.addEventListener('keydown',function(e){keys[e.key.toLowerCase()]=true;if(e.key.toLowerCase()==='r')startReload();if(e.code==='Space'&&active){e.preventDefault();const n=nearestZombie();if(n)shoot(n.x,n.y)}});
window.addEventListener('keyup',function(e){keys[e.key.toLowerCase()]=false});
function pos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}}
canvas.addEventListener('pointermove',function(e){const p=pos(e);mouse.x=p.x;mouse.y=p.y});
canvas.addEventListener('pointerdown',function(e){const p=pos(e);mouse.x=p.x;mouse.y=p.y;if(e.pointerType==='touch'){autoTarget=p}else{mouse.down=true;shoot(p.x,p.y)}});
canvas.addEventListener('pointerup',function(e){mouse.down=false;if(e.pointerType==='touch')autoTarget=null});
canvas.addEventListener('pointercancel',function(){mouse.down=false;autoTarget=null});
window.addEventListener('resize',function(){if(active)resizeCanvas()});

window.Q17Outbreak={
 canQuarantine:function(){return isolation.length<ISOLATION_CAPACITY},
 openIsolation:openIsolation,
 onDecision:function(payload,next){
  advanceIsolation();
  if(payload.action==='quarantine')addDetainee(payload);
  if(payload.action==='pass'&&payload.infected&&!payload.ok){
   setTimeout(function(){showCampBreach(payload,next)},650);
   return true;
  }
  return false;
 },
 reset:function(){active=false;started=false;continuation=null;wrap.classList.remove('show');dead.classList.remove('show');resetIsolation()}
};

let seenReport=false;
const obs=new MutationObserver(function(){
 const report=document.getElementById('reportModal');
 const showing=!!report&&report.classList.contains('show');
 if(showing&&!seenReport){seenReport=true;setTimeout(showGlobalOutbreak,750)}
 if(!showing)seenReport=false;
});
obs.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
})();