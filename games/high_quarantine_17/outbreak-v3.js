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
'.q17-iso-card{width:min(1160px,100%);max-height:92vh;overflow:auto;background:#11161b;border:1px solid #59636e;box-shadow:0 25px 80px #000}',
'.q17-iso-head{position:sticky;top:0;z-index:2;background:#20262d;border-bottom:1px solid #47515b;padding:11px 14px;display:flex;justify-content:space-between;gap:10px;align-items:center}.q17-iso-head h2{font-size:15px;margin:0}.q17-iso-head-actions{display:flex;gap:7px;flex-wrap:wrap}.q17-iso-close,.q17-burn-room{border:1px solid #59636e;background:#12171c;color:#dde2e5;padding:6px 10px;cursor:pointer}.q17-burn-room{border-color:#93474c;background:#391b1e;color:#ffb5b8;font-weight:900}',
'.q17-iso-note{margin:12px 14px;background:#251e18;border-left:4px solid #b99847;padding:9px 11px;color:#c9c0ae;font-size:11px;line-height:1.55}',
'.q17-iso-room{margin:12px 14px;padding:18px;background:linear-gradient(#202930 0 16%,#11171b 16% 82%,#28231d 82%);border:9px solid #333c43;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;min-height:270px;position:relative}.q17-iso-room:before{content:"격리동 A · 안전문 / 차단벽 / 관찰창";position:absolute;left:12px;top:8px;color:#7f8b94;font-size:9px;letter-spacing:.08em}.q17-iso-room:after{content:"";position:absolute;left:0;right:0;bottom:42px;height:10px;background:repeating-linear-gradient(135deg,#c2a843 0 14px,#202326 14px 28px);opacity:.6;pointer-events:none}',
'.q17-detainee{position:relative;background:#0d1115cc;border:1px solid #46515a;min-height:180px;padding:7px;text-align:center;overflow:hidden}.q17-detainee:after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 24px,#86919a36 24px 27px);pointer-events:none}',
'.q17-detainee img{height:105px;max-width:90%;object-fit:contain;filter:drop-shadow(0 6px 5px #0008)}.q17-detainee.zombie{border-color:#873f43;background:#241315cc}.q17-detainee.exposed{border-color:#9c7e3e}',
'.q17-detainee b{display:block;font-size:11px}.q17-detainee small{display:block;color:#9da7af;font-size:9px;margin-top:2px}.q17-detainee .q17-status{margin-top:5px;font-size:10px;font-weight:900;color:#d8c46b}.q17-detainee.zombie .q17-status{color:#ff7777}',
'.q17-wrong{display:inline-block;margin-top:4px;background:#71383b;color:#ffd5d5;font-size:8px;font-weight:900;padding:2px 4px}.q17-detainee-actions{position:relative;z-index:2;display:flex;gap:4px;justify-content:center;flex-wrap:wrap;margin-top:7px}.q17-detainee-actions button{border:1px solid #56616b;background:#1a2026;color:#e2e7ea;padding:4px 6px;font-size:9px;font-weight:850;cursor:pointer}.q17-detainee-actions .release{border-color:#477b58;background:#183021;color:#9ee0af}.q17-detainee-actions .burn{border-color:#8c4449;background:#33191c;color:#ff9da2}',
'.q17-iso-log{margin:12px 14px 16px;background:#0b0f12;border:1px solid #343d45;padding:10px;max-height:150px;overflow:auto;font-size:10px;color:#aeb7be;line-height:1.6}.q17-iso-log b{color:#e7c65c}',
'.q17-camp-label{position:absolute;left:14px;top:14px;color:#c7d0d6;font-size:10px;background:#111a;padding:5px 7px;border:1px solid #4a555e}',
'.q17-help-btn{border:1px solid #65717c;background:#202830;color:#e8edf0;padding:6px 9px;font-size:11px;font-weight:900;cursor:pointer}.q17-help-btn:hover{background:#303b45}',
'#q17Tutorial{position:fixed;inset:0;z-index:520;background:#050709e8;display:none;align-items:center;justify-content:center;padding:18px}#q17Tutorial.show{display:flex}',
'.q17-tutorial-card{width:min(720px,100%);background:#161c22;border:1px solid #66727e;box-shadow:0 24px 90px #000;padding:22px}.q17-tutorial-card h2{margin:0 0 8px;color:#efd06f}.q17-tutorial-card p{color:#c2cad0;line-height:1.7}.q17-tutorial-demo{background:#0d1216;border:1px solid #3d4852;padding:14px;margin:14px 0;min-height:112px}.q17-tutorial-demo b{color:#fff}.q17-tutorial-nav{display:flex;justify-content:space-between;gap:8px}.q17-tutorial-nav button{border:1px solid #596570;background:#222a31;color:#eef2f4;padding:9px 14px;font-weight:850;cursor:pointer}.q17-tutorial-nav .next{background:#c4a84b;color:#171717;border:0}.q17-tutorial-progress{color:#7f8b94;font-size:10px;margin-bottom:6px}',
'@keyframes q17pulse{50%{transform:scale(1.06);box-shadow:0 0 24px #b34b4b88}}',
'@media(max-width:680px){#q17Outbreak{padding:0}.q17-combat-shell{height:100%;display:flex;flex-direction:column}.q17-combat-head{padding:8px 10px}.q17-combat-title{font-size:12px}.q17-combat-stats{gap:8px;font-size:10px}#q17CombatCanvas{flex:1;min-height:0;aspect-ratio:auto}.q17-combat-help{font-size:9px;padding:6px 8px}.q17-iso-room{grid-template-columns:repeat(2,minmax(0,1fr));padding:10px}.q17-iso-btn,.q17-help-btn{padding:5px 7px;font-size:10px}.q17-tutorial-card{padding:16px}}'
].join('\n');
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);

const wrap=document.createElement('div');wrap.id='q17Outbreak';
wrap.innerHTML='<div class="q17-combat-shell"><div class="q17-combat-head"><div class="q17-combat-title" id="q17CombatTitle">⚠ 격리선 붕괴 · 긴급 진압</div><div class="q17-combat-stats"><span>체력 <b id="q17Hp">100</b></span><span>잔여 좀비 <b id="q17Left">0</b></span><span id="q17SurvivorStat" style="display:none">캠프 생존자 <b id="q17Survivors">0</b></span><span>탄창 <b id="q17Ammo">12</b></span><span>감염률 <b id="q17Risk">0%</b></span></div></div><canvas id="q17CombatCanvas" width="960" height="540"></canvas><div class="q17-combat-help"><span>달리기 A/D · 점프 W/↑/Space · 조준 마우스 · 클릭/J 사격 · F 근접 타격 · R 재장전</span><span>플레이어는 매우 빠름 · 좀비는 시민보다 조금 빠름 · 장애물과 발판을 이용하세요</span></div><div class="q17-alert" id="q17Alert"><h2 id="q17AlertTitle">격리선 붕괴</h2><p id="q17AlertText"></p><button id="q17AlertBtn" type="button">진압 시작</button></div></div>';
document.body.appendChild(wrap);

const dead=document.createElement('div');dead.className='q17-dead';dead.id='q17Dead';
dead.innerHTML='<div class="q17-dead-card"><h1 id="q17DeadTitle">검역소 함락</h1><p id="q17DeadText"></p><p><b>검역 단계의 한 번의 판정이 뒤쪽 생존 상황까지 이어집니다.</b></p><button type="button" id="q17Restart">처음부터 다시</button></div>';
document.body.appendChild(dead);

const metersHost=document.querySelector('.meters')||document.body;const isoBtn=document.createElement('button');isoBtn.type='button';isoBtn.className='q17-iso-btn';isoBtn.id='q17IsoBtn';isoBtn.textContent='격리실 0/6 · CCTV';metersHost.appendChild(isoBtn);const helpBtn=document.createElement('button');helpBtn.type='button';helpBtn.className='q17-help-btn';helpBtn.textContent='튜토리얼';metersHost.appendChild(helpBtn);
const iso=document.createElement('div');iso.id='q17Isolation';
iso.innerHTML='<div class="q17-iso-card"><div class="q17-iso-head"><h2>공동 격리실 CCTV · <span id="q17IsoCapacity">0 / 6</span></h2><div class="q17-iso-head-actions"><button type="button" class="q17-iso-close" id="q17FightRoom">직접 진입 · 좀비 소탕</button><button type="button" class="q17-burn-room" id="q17BurnRoom">격리실 비상 소각</button><button type="button" class="q17-iso-close" id="q17IsoClose">닫기</button></div></div><div class="q17-iso-note">정원은 6명입니다. 정상으로 보이는 사람은 충분히 관찰한 뒤 생존자 캠프로 돌려보낼 수 있습니다. <b>비상 소각은 격리실 전체</b>를 태우므로 정상인이 남아 있다면 큰 불이익이 생깁니다.</div><div class="q17-iso-room" id="q17IsoRoom"></div><div class="q17-iso-log" id="q17IsoLog"></div></div>';
document.body.appendChild(iso);

const tutorial=document.createElement('div');tutorial.id='q17Tutorial';
tutorial.innerHTML='<div class="q17-tutorial-card"><div class="q17-tutorial-progress" id="q17TutProgress"></div><h2 id="q17TutTitle"></h2><p id="q17TutText"></p><div class="q17-tutorial-demo" id="q17TutDemo"></div><div class="q17-tutorial-nav"><button type="button" id="q17TutPrev">이전</button><button type="button" id="q17TutClose">닫기</button><button type="button" class="next" id="q17TutNext">다음</button></div></div>';
document.body.appendChild(tutorial);
const tutorialSteps=[
 {title:'1. 검역 판정',text:'시민을 바로 찍어 맞히는 게임이 아니라, 필요한 검사를 하고 현재 주차의 지침과 대조하는 게임입니다.',demo:'<b>I/T/U/B/R/G</b>로 검사 · <b>V</b>로 지금까지 본 검사 결과 다시보기 · <b>1/2/3</b>으로 통과/추가검사/격리'},
 {title:'2. 격리실 관리',text:'격리 판정을 받은 시민은 정원 6명의 공동 격리실로 이동합니다. 정상인은 관찰 후 다시 생존자 캠프로 보낼 수 있고, 감염이 확실하면 개별 소각실로 이송할 수 있습니다.',demo:'상단의 <b>격리실 CCTV</b>에서 상태를 확인하세요. 좀비가 생기면 소각하거나 <b>직접 진입</b>해 넓은 격리동에서 소탕할 수 있습니다. 방치하면 오판 격리된 정상인까지 감염될 수 있습니다.'},
 {title:'3. 잘못 통과시키면',text:'감염자를 통과시키면 생존자 캠프로 들어가 버립니다. 캠프에 들어가 직접 제압해야 하며, 늦으면 시민이 물리고 시간이 지난 뒤 새 좀비가 됩니다.',demo:'생존자 한 명이 감염되는 순간 즉시 모두 좀비가 되지는 않습니다. 도망칠 시간과 구조할 시간이 있습니다.'},
 {title:'4. 전투',text:'전투는 넓은 횡스크롤 구역입니다. 플레이어는 좀비보다 훨씬 빠르고, 좀비는 시민보다 조금 빠릅니다. 장애물과 발판을 넘나들며 거리를 벌리세요.',demo:'<b>A/D</b> 달리기 · <b>W/↑/Space</b> 점프 · <b>마우스 클릭 또는 J</b> 사격 · <b>F</b> 근접 타격 · <b>R</b> 재장전<br>총은 안전하지만 탄약과 재장전이 필요하고, 근접 공격은 강하지만 가까이 가야 해서 위험합니다.'}
];
let tutorialIndex=0;
function renderTutorial(){const s=tutorialSteps[tutorialIndex];document.getElementById('q17TutProgress').textContent=(tutorialIndex+1)+' / '+tutorialSteps.length;document.getElementById('q17TutTitle').textContent=s.title;document.getElementById('q17TutText').textContent=s.text;document.getElementById('q17TutDemo').innerHTML=s.demo;document.getElementById('q17TutPrev').disabled=tutorialIndex===0;document.getElementById('q17TutNext').textContent=tutorialIndex===tutorialSteps.length-1?'완료':'다음'}
function openTutorial(step){tutorialIndex=Math.max(0,Math.min(tutorialSteps.length-1,step||0));renderTutorial();tutorial.classList.add('show')}
function closeTutorial(){tutorial.classList.remove('show');try{localStorage.setItem('q17TutorialSeen','1')}catch(e){}}
helpBtn.addEventListener('click',function(){openTutorial(0)});
document.getElementById('q17TutPrev').addEventListener('click',function(){if(tutorialIndex>0){tutorialIndex--;renderTutorial()}});
document.getElementById('q17TutNext').addEventListener('click',function(){if(tutorialIndex<tutorialSteps.length-1){tutorialIndex++;renderTutorial()}else closeTutorial()});
document.getElementById('q17TutClose').addEventListener('click',closeTutorial);
const startForTutorial=document.getElementById('startBtnV2');if(startForTutorial)startForTutorial.addEventListener('click',function(){let seen=false;try{seen=localStorage.getItem('q17TutorialSeen')==='1'}catch(e){}if(!seen)setTimeout(function(){openTutorial(0)},450)});

const canvas=document.getElementById('q17CombatCanvas'),ctx=canvas.getContext('2d');
const images={};Object.keys(SPRITES).forEach(function(k){const im=new Image();im.src=SPRITES[k];images[k]=im});
const keys={},mouse={x:canvas.width/2,y:canvas.height/2,down:false};

let active=false,started=false,last=0,player=null,zombies=[],bullets=[],survivors=[],reload=0,shootCd=0,meleeCd=0,autoTarget=null;let cameraX=0,worldW=0,worldH=0,groundY=0,obstacles=[];
let mode='outbreak',continuation=null,campLosses=0,currentIncidentInf=0,currentIntruder='';
const ISOLATION_CAPACITY=6;
let isolation=[],isoLog=[],isoSeq=0;

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
 const zombiesHere=isolation.filter(function(d){return d.status==='zombie'}).length;const fightBtn=document.getElementById('q17FightRoom');if(fightBtn){fightBtn.disabled=zombiesHere===0;fightBtn.textContent=zombiesHere?'직접 진입 · 좀비 '+zombiesHere+'명 소탕':'직접 진입 · 좀비 없음'}
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
document.getElementById('q17FightRoom').addEventListener('click',showIsolationFight);document.getElementById('q17BurnRoom').addEventListener('click',burnRoom);
document.getElementById('q17IsoRoom').addEventListener('click',function(e){const btn=e.target.closest('button[data-iso-action]');if(!btn)return;const id=Number(btn.dataset.id);if(btn.dataset.isoAction==='release')releaseDetainee(id);else if(btn.dataset.isoAction==='burn')burnDetainee(id)});
iso.addEventListener('click',function(e){if(e.target===iso)iso.classList.remove('show')});
renderIsolation();

function difficulty(){
 const inf=infection();
 return {inf:inf,count:Math.max(5,Math.min(26,6+Math.floor((inf-18)*.75))),speed:120+Math.max(0,inf-20)*1.15,hp:2+Math.floor(Math.max(0,inf-34)/12)};
}
function resizeCanvas(){
 const r=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
 const w=Math.max(320,Math.round(r.width*dpr)),h=Math.max(240,Math.round(r.height*dpr));
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
}
function spawnZombie(x,y,hp,speed,name,attackDelay){zombies.push({x:x,y:y,vx:0,vy:0,r:22*(window.devicePixelRatio||1),hp:hp||2,speed:speed||130*(window.devicePixelRatio||1),hit:0,name:name||'',attackDelay:attackDelay||0,onGround:true,knock:0})}
function makeWorld(kind){
 const dpr=Math.min(2,window.devicePixelRatio||1);
 worldH=canvas.height;worldW=Math.max(canvas.width*2.7,2200*dpr);groundY=worldH-64*dpr;
 obstacles=[
  {x:420*dpr,y:groundY-80*dpr,w:86*dpr,h:80*dpr,type:'crate'},
  {x:760*dpr,y:groundY-45*dpr,w:130*dpr,h:45*dpr,type:'barrier'},
  {x:1060*dpr,y:groundY-125*dpr,w:145*dpr,h:125*dpr,type:'container'},
  {x:1380*dpr,y:groundY-65*dpr,w:100*dpr,h:65*dpr,type:'crate'},
  {x:1690*dpr,y:groundY-105*dpr,w:170*dpr,h:105*dpr,type:'container'},
  {x:2020*dpr,y:groundY-55*dpr,w:115*dpr,h:55*dpr,type:'barrier'}
 ];
}
function setupCombat(kind,payload){
 resizeCanvas();mode=kind;currentIncidentInf=infection();currentIntruder=payload&&payload.name||'';campLosses=0;makeWorld(kind);
 const dpr=Math.min(2,window.devicePixelRatio||1);
 player={x:110*dpr,y:groundY,r:23*dpr,hp:100,ammo:12,maxAmmo:12,vx:0,vy:0,onGround:true,facing:1};
 zombies=[];bullets=[];survivors=[];reload=0;shootCd=0;meleeCd=0;autoTarget=null;cameraX=0;
 if(kind==='isolation'){
  const roomZombies=isolation.filter(function(d){return d.status==='zombie'});roomZombies.forEach(function(d,i){spawnZombie((620+i*260)*dpr,groundY,2,126*dpr,d.name,.8+i*.15)});document.getElementById('q17CombatTitle').textContent='⚠ 격리실 직접 진입 · 좀비 소탕';document.getElementById('q17SurvivorStat').style.display='none';
 }else if(kind==='camp'){
  const survivorSprites=['female','adventurer','soldier','player','female','adventurer','soldier'];
  const xs=[720,940,1210,1510,1740,1940,2140];
  xs.forEach(function(x,i){survivors.push({x:x*dpr,y:groundY,r:19*dpr,sprite:survivorSprites[i],alive:true,speed:(96+(i%3)*5)*dpr,dir:i%2?1:-1,bite:0,bitten:false,turnTimer:0})});
  spawnZombie(560*dpr,groundY,2,132*dpr,currentIntruder,1.7);
  document.getElementById('q17CombatTitle').textContent='⚠ 생존자 캠프 침입 · 감염자 추격';
  document.getElementById('q17SurvivorStat').style.display='';
 }else{
  const d=difficulty();
  for(let i=0;i<d.count;i++){const x=(520+i*(worldW-650)/Math.max(1,d.count-1));spawnZombie(x,groundY,d.hp,d.speed*dpr*(.9+Math.random()*.18),'',.8+Math.random()*.7)}
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
function showIsolationFight(){
 const count=isolation.filter(function(d){return d.status==='zombie'}).length;if(!count){notify('격리실에 좀비가 없습니다.');return}
 if(active)return;active=true;started=false;continuation=null;iso.classList.remove('show');setupCombat('isolation',{});
 wrap.classList.add('show');document.getElementById('q17AlertTitle').textContent='격리실 진입';
 document.getElementById('q17AlertText').innerHTML='격리실 내부에 <b>'+count+'명</b>의 좀비가 확인됐습니다.<br>소각 대신 직접 진입합니다. 장애물 위로 뛰어넘고 거리를 벌리며 제압하세요. <b>F 근접 타격</b>은 강하지만 물릴 위험이 큽니다.';
 document.getElementById('q17Alert').classList.add('show');
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
 document.getElementById('q17AlertText').innerHTML='<b>'+escapeHtml(payload.name)+'</b>을(를) 통과시켰지만 감염자였습니다.<br>이미 생존자 캠프로 들어갔습니다. <b>다른 생존자를 물기 전에</b> 직접 들어가 제압하십시오.<br>플레이어는 좀비보다 훨씬 빠릅니다. 장애물을 넘고 거리를 벌려 사격하거나, 가까이 붙었을 때 F로 강하게 밀쳐내세요.';
 document.getElementById('q17Alert').classList.add('show');
 return true;
}
function shoot(tx,ty){
 if(!started||shootCd>0||reload>0)return;
 if(player.ammo<=0){startReload();return}
 const dx=tx-player.x,dy=ty-(player.y-30*(window.devicePixelRatio||1)),len=Math.hypot(dx,dy)||1;
 bullets.push({x:player.x+player.facing*18*(window.devicePixelRatio||1),y:player.y-30*(window.devicePixelRatio||1),vx:dx/len*720*(window.devicePixelRatio||1),vy:dy/len*720*(window.devicePixelRatio||1),life:1.35});
 player.facing=dx>=0?1:-1;player.ammo--;shootCd=.18;updateHud();if(player.ammo<=0)startReload();
}
function melee(){
 if(!started||meleeCd>0)return;meleeCd=.55;
 const range=78*(window.devicePixelRatio||1),targets=zombies.filter(function(z){return Math.abs(z.x-player.x)<range&&Math.abs(z.y-player.y)<70*(window.devicePixelRatio||1)});
 let hit=false;targets.forEach(function(z){const side=z.x>=player.x?1:-1;z.hp-=2;z.knock=side*210*(window.devicePixelRatio||1);z.hit=.22;hit=true});
 if(hit)notify('근접 타격 · 강한 피해');else notify('근접 공격이 빗나갔습니다.');
}
function startReload(){if(!player||reload>0||player.ammo===player.maxAmmo)return;reload=1.05}
function nearestZombie(){let best=null,bd=Infinity;zombies.forEach(function(z){const d=Math.abs(z.x-player.x);if(d<bd){bd=d;best=z}});return best}
function nearestTargetForZombie(z){
 let target=player,bd=Math.abs(z.x-player.x);
 if(mode==='camp'&&z.attackDelay<=0){
  survivors.forEach(function(s){if(!s.alive||s.bitten)return;const d=Math.abs(z.x-s.x)*.92;if(d<bd){bd=d;target=s}});
 }
 return target;
}
function convertSurvivor(s){
 if(!s.alive)return;s.alive=false;campLosses++;
 spawnZombie(s.x,groundY,2,128*(window.devicePixelRatio||1),'캠프 감염자',2.2);
 notify('캠프 감염 확산 · 생존자 1명이 좀비로 변했습니다.');updateHud();
}
function collidesObstacle(x,y,r){
 return obstacles.some(function(o){return x+r>o.x&&x-r<o.x+o.w&&y>o.y&&y-r*1.6<o.y+o.h});
}
function obstacleAhead(entity,dir){
 return obstacles.find(function(o){return dir>0?entity.x+entity.r+10>o.x&&entity.x<o.x&&entity.x+entity.r<o.x+o.w:entity.x-entity.r-10<o.x+o.w&&entity.x>o.x+o.w&&entity.x-entity.r>o.x});
}
function worldMouse(e){const r=canvas.getBoundingClientRect();return{x:cameraX+(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}}
function update(dt){
 if(!started)return;
 const dpr=Math.min(2,window.devicePixelRatio||1);
 shootCd=Math.max(0,shootCd-dt);meleeCd=Math.max(0,meleeCd-dt);
 if(reload>0){reload-=dt;if(reload<=0){player.ammo=player.maxAmmo;updateHud()}}
 const move=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
 const playerSpeed=330*dpr;
 if(move){player.vx=move*playerSpeed;player.facing=move}else player.vx*=Math.pow(.0008,dt);
 if((keys.w||keys.arrowup||keys[' '])&&player.onGround){player.vy=-470*dpr;player.onGround=false;keys.w=false;keys.arrowup=false;keys[' ']=false}
 player.vy+=1080*dpr*dt;
 let nx=player.x+player.vx*dt,ny=player.y+player.vy*dt;
 const hitObs=collidesObstacle(nx,ny,player.r);
 if(hitObs&&player.y>=groundY-2*dpr){nx=player.x;player.vx=0}
 player.x=Math.max(player.r,Math.min(worldW-player.r,nx));player.y=ny;
 if(player.y>=groundY){player.y=groundY;player.vy=0;player.onGround=true}
 obstacles.forEach(function(o){if(player.vy>0&&player.x+player.r*.6>o.x&&player.x-player.r*.6<o.x+o.w&&player.y>=o.y&&player.y-player.vy*dt<o.y){player.y=o.y;player.vy=0;player.onGround=true}});
 if(mouse.down)shoot(mouse.x,mouse.y);
 if(autoTarget){const dx=autoTarget.x-player.x;if(Math.abs(dx)>45*dpr){player.vx=Math.sign(dx)*260*dpr;player.facing=Math.sign(dx)}const n=nearestZombie();if(n)shoot(n.x,n.y-25*dpr)}
 if(mode==='camp'){
  survivors.forEach(function(s){
   if(!s.alive)return;
   if(s.bitten){s.turnTimer-=dt;if(s.turnTimer<=0){convertSurvivor(s);return}}
   let near=null,nd=Infinity;zombies.forEach(function(z){const d=Math.abs(z.x-s.x);if(d<nd){nd=d;near=z}});
   if(near&&nd<210*dpr&&!s.bitten){s.dir=near.x<s.x?1:-1}
   s.x+=s.dir*s.speed*dt;
   const obs=obstacleAhead(s,s.dir);if(obs){s.dir*=-1}
   if(s.x<520*dpr){s.x=520*dpr;s.dir=1}if(s.x>worldW-80*dpr){s.x=worldW-80*dpr;s.dir=-1}
   if(!s.bitten)s.bite=Math.max(0,s.bite-dt*.22);
  });
 }
 bullets.forEach(function(b){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(obstacles.some(function(o){return b.x>o.x&&b.x<o.x+o.w&&b.y>o.y&&b.y<o.y+o.h}))b.life=0});
 bullets=bullets.filter(function(b){return b.life>0&&b.x>-20&&b.x<worldW+20&&b.y>-20&&b.y<worldH+20});
 zombies.forEach(function(z){
  z.attackDelay=Math.max(0,z.attackDelay-dt);z.hit=Math.max(0,z.hit-dt);
  const target=nearestTargetForZombie(z),dir=target.x>=z.x?1:-1;
  if(Math.abs(z.knock)>1){z.x+=z.knock*dt;z.knock*=Math.pow(.02,dt)}
  else{z.x+=dir*z.speed*dt;const obs=obstacleAhead(z,dir);if(obs){z.x+=dir*z.speed*.45*dt}}
  const dist=Math.abs(target.x-z.x);
  if(target===player){
   if(dist<player.r+z.r&&Math.abs(player.y-groundY)<60*dpr&&z.hit<=0){player.hp=Math.max(0,player.hp-12);z.hit=.65;player.vx=dir*180*dpr;updateHud();if(player.hp<=0){lose();return}}
  }else if(target.alive&&!target.bitten&&z.attackDelay<=0&&dist<target.r+z.r+6*dpr){
   target.bite=(target.bite||0)+dt;if(target.bite>=1.55){target.bitten=true;target.turnTimer=4.8;target.bite=0;z.attackDelay=.9;notify('생존자 물림 · 약 5초 뒤 변이 위험')}
  }
 });
 bullets.forEach(function(b){zombies.forEach(function(z){if(z.hp<=0||b.life<=0)return;const dx=b.x-z.x,dy=b.y-(z.y-28*dpr);if(Math.abs(dx)<z.r*1.05&&Math.abs(dy)<z.r*1.55){const headshot=b.y<z.y-38*dpr;z.hp-=headshot?2:1;z.hit=.16;z.knock=(b.vx>0?1:-1)*95*dpr;b.life=0;if(headshot)notify('헤드샷 · 추가 피해')}})});
 zombies=zombies.filter(function(z){return z.hp>0});updateHud();
 cameraX=Math.max(0,Math.min(worldW-canvas.width,player.x-canvas.width*.42));
 if(zombies.length===0&&!survivors.some(function(s){return s.alive&&s.bitten}))win();
}
function draw(){
 const W=canvas.width,H=canvas.height,dpr=Math.min(2,window.devicePixelRatio||1);ctx.clearRect(0,0,W,H);
 ctx.fillStyle=mode==='camp'?'#18211d':'#161d22';ctx.fillRect(0,0,W,H);
 ctx.save();ctx.translate(-cameraX,0);
 ctx.fillStyle='#263139';ctx.fillRect(0,groundY,worldW,H-groundY);
 ctx.fillStyle='#36424a';for(let x=0;x<worldW;x+=180*dpr){ctx.fillRect(x,groundY-4*dpr,120*dpr,4*dpr)}
 if(mode==='camp'){ctx.fillStyle='#293b30';ctx.fillRect(480*dpr,groundY-260*dpr,worldW-570*dpr,260*dpr);ctx.strokeStyle='#8a8e76';ctx.lineWidth=5*dpr;ctx.strokeRect(480*dpr,groundY-260*dpr,worldW-570*dpr,260*dpr);ctx.fillStyle='#d7c45e';ctx.font=(13*dpr)+'px sans-serif';ctx.fillText('SURVIVOR CAMP · SECTOR 17',520*dpr,groundY-220*dpr)}
 obstacles.forEach(function(o){ctx.fillStyle=o.type==='container'?'#39464d':o.type==='crate'?'#564737':'#4b5052';ctx.fillRect(o.x,o.y,o.w,o.h);ctx.strokeStyle='#78828a';ctx.lineWidth=2*dpr;ctx.strokeRect(o.x,o.y,o.w,o.h);if(o.type==='crate'){ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(o.x+o.w,o.y+o.h);ctx.moveTo(o.x+o.w,o.y);ctx.lineTo(o.x,o.y+o.h);ctx.stroke()}})
 if(mode==='camp'){survivors.forEach(function(s){if(!s.alive)return;const im=images[s.sprite]||images.player,ss=s.r*3;ctx.drawImage(im,s.x-ss/2,s.y-ss*.72,ss,ss);if(s.bitten){ctx.fillStyle='#d6575f';ctx.beginPath();ctx.arc(s.x,s.y-ss*.76,6*dpr,0,Math.PI*2);ctx.fill()}})}
 bullets.forEach(function(b){ctx.fillStyle='#f6d86d';ctx.beginPath();ctx.arc(b.x,b.y,4*dpr,0,Math.PI*2);ctx.fill()});
 zombies.forEach(function(z){const s=z.r*3;ctx.save();ctx.translate(z.x,z.y);const flip=player.x<z.x?-1:1;ctx.scale(flip,1);if(z.hit>0)ctx.globalAlpha=.55;ctx.drawImage(images.zombie,-s/2,-s*.75,s,s);ctx.restore()});
 const ps=player.r*3.1;ctx.save();ctx.translate(player.x,player.y);ctx.scale(player.facing,1);ctx.drawImage(images.player,-ps/2,-ps*.75,ps,ps);ctx.restore();
 if(reload>0){ctx.fillStyle='#000a';ctx.fillRect(player.x-35*dpr,player.y+10*dpr,70*dpr,8*dpr);ctx.fillStyle='#e2c65c';ctx.fillRect(player.x-35*dpr,player.y+10*dpr,70*dpr*(1-reload/1.05),8*dpr)}
 ctx.restore();
 ctx.fillStyle='#0a0d10bb';ctx.fillRect(10,10,210*dpr,26*dpr);ctx.fillStyle='#c7d0d6';ctx.font=(10*dpr)+'px sans-serif';ctx.fillText('거리 '+Math.round(player.x/dpr)+'m / '+Math.round(worldW/dpr)+'m',18*dpr,28*dpr);
}
function loop(t){if(!active)return;const dt=Math.min(.033,(t-last)/1000||0);last=t;update(dt);draw();if(active)requestAnimationFrame(loop)}
function win(){
 if(!active)return;
 const wonMode=mode,losses=campLosses,inf=currentIncidentInf,next=continuation;
 started=false;active=false;continuation=null;wrap.classList.remove('show');
 const b=bridge();
 if(wonMode==='isolation'){
  const cleared=isolation.filter(function(d){return d.status==='zombie'}).length;isolation=isolation.filter(function(d){return d.status!=='zombie'});addIsoLog('<b>직접 진입 소탕 완료</b> · 좀비 '+cleared+'명 제거');renderIsolation();if(b)b.applyOutbreakResult({infectionDelta:-Math.min(5,cleared),trustDelta:1,scoreDelta:cleared*110});notify('격리실 소탕 완료 · '+cleared+'명 제거');
 }else if(wonMode==='camp'){
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
 document.getElementById('q17DeadTitle').textContent=lostMode==='camp'?'생존자 캠프 붕괴':lostMode==='isolation'?'격리실 진입 실패':'검역소 함락';
 document.getElementById('q17DeadText').innerHTML=lostMode==='camp'?'통과시킨 감염자를 제때 막지 못했습니다.<br>캠프에서 감염이 연쇄적으로 번졌고 플레이어도 공격을 받아 사망했습니다.':lostMode==='isolation'?'격리실 내부 소탕 중 좀비에게 포위되었습니다.<br>직접 진입은 소각보다 보상은 크지만 훨씬 위험합니다.':'격리선이 무너졌고 감염자들이 검역소 안까지 들어왔습니다.<br>진압에 실패해 제17구역은 폐쇄되었습니다.';
 dead.classList.add('show');
}

document.getElementById('q17AlertBtn').addEventListener('click',function(){document.getElementById('q17Alert').classList.remove('show');started=true;last=performance.now();requestAnimationFrame(loop)});
document.getElementById('q17Restart').addEventListener('click',function(){dead.classList.remove('show');location.reload()});
window.addEventListener('keydown',function(e){const k=e.key.toLowerCase();keys[k]=true;if(k==='r')startReload();if(k==='f'&&active)melee();if(k==='j'&&active){const n=nearestZombie();if(n)shoot(n.x,n.y-25*(window.devicePixelRatio||1))}if(e.code==='Space'&&active)e.preventDefault()});
window.addEventListener('keyup',function(e){keys[e.key.toLowerCase()]=false});
canvas.addEventListener('pointermove',function(e){const p=worldMouse(e);mouse.x=p.x;mouse.y=p.y});
canvas.addEventListener('pointerdown',function(e){const p=worldMouse(e);mouse.x=p.x;mouse.y=p.y;if(e.pointerType==='touch'){autoTarget=p}else{mouse.down=true;shoot(p.x,p.y)}});
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