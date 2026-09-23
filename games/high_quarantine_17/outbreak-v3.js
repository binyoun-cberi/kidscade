(()=>{'use strict';

const A='../../assets/game/characters/people/kenney-platformer-characters/';
const SPRITES={
 player:A+'player/poses/player-stand.png',
 playerWalk1:A+'player/poses/player-walk1.png',
 playerWalk2:A+'player/poses/player-walk2.png',
 playerJump:A+'player/poses/player-jump.png',
 playerShoot:A+'player/poses/player-action1.png',
 playerHurt:A+'player/poses/player-hurt.png',
 female:A+'female/poses/female-stand.png',
 adventurer:A+'adventurer/poses/adventurer-stand.png',
 soldier:A+'soldier/poses/soldier-stand.png',
 zombie:A+'zombie/poses/zombie-stand.png',
 zombieWalk1:A+'zombie/poses/zombie-walk1.png',
 zombieWalk2:A+'zombie/poses/zombie-walk2.png',
 zombieAttack:A+'zombie/poses/zombie-action1.png',
 zombieHurt:A+'zombie/poses/zombie-hurt.png'
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
'.q17-mobile-controls{display:none;padding:8px;background:#0b0f13;border-top:1px solid #313a43;gap:8px;grid-template-columns:1fr 1.45fr}.q17-mobile-pad,.q17-mobile-actions{display:grid;gap:7px}.q17-mobile-pad{grid-template-columns:1fr 1fr}.q17-mobile-actions{grid-template-columns:repeat(3,1fr)}.q17-mobile-controls button{min-height:48px;border:1px solid #59636e;background:#202830;color:#f2f5f7;font-weight:950;border-radius:8px;touch-action:none;user-select:none;-webkit-user-select:none}.q17-mobile-controls button:active,.q17-mobile-controls button.active{transform:translateY(1px);background:#36424d}.q17-mobile-controls .shoot{background:#8e3035;border-color:#d85f66}.q17-mobile-controls .jump{background:#314f68}.q17-mobile-controls .melee{background:#59472c}.q17-mobile-controls .reload{grid-column:3;background:#3b4147;font-size:11px}',
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
'@media(max-width:680px){#q17Outbreak{padding:0;align-items:flex-start}.q17-combat-shell{width:100%;height:auto;max-height:100dvh;display:flex;flex-direction:column}.q17-combat-head{padding:8px 10px}.q17-combat-title{font-size:12px}.q17-combat-stats{gap:8px;font-size:10px}#q17CombatCanvas{flex:none;width:100%;height:auto;aspect-ratio:16/9}.q17-mobile-controls{display:grid}.q17-combat-help{font-size:9px;padding:5px 8px}.q17-combat-help span:last-child{display:none}.q17-alert{top:42%;padding:14px 15px;min-width:min(520px,92%)}.q17-alert h2{font-size:21px}.q17-alert p{font-size:13px}.q17-iso-room{grid-template-columns:repeat(2,minmax(0,1fr));padding:10px}.q17-iso-btn,.q17-help-btn{padding:5px 7px;font-size:10px}.q17-tutorial-card{padding:16px}}'
].join('\n');
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);

const wrap=document.createElement('div');wrap.id='q17Outbreak';
wrap.innerHTML='<div class="q17-combat-shell"><div class="q17-combat-head"><div class="q17-combat-title" id="q17CombatTitle">⚠ 격리선 붕괴 · 긴급 진압</div><div class="q17-combat-stats"><span>체력 <b id="q17Hp">100</b></span><span>잔여 좀비 <b id="q17Left">0</b></span><span id="q17SurvivorStat" style="display:none">캠프 생존자 <b id="q17Survivors">0</b></span><span>탄창 <b id="q17Ammo">12</b></span><span>감염률 <b id="q17Risk">0%</b></span></div></div><canvas id="q17CombatCanvas" width="960" height="540"></canvas><div class="q17-mobile-controls" id="q17MobileControls"><div class="q17-mobile-pad"><button type="button" data-hold="left">◀ 이동</button><button type="button" data-hold="right">이동 ▶</button></div><div class="q17-mobile-actions"><button type="button" class="jump" id="q17Jump">점프</button><button type="button" class="shoot" id="q17Shoot">사격</button><button type="button" class="melee" id="q17Melee">밀치기</button><button type="button" class="reload" id="q17Reload">재장전</button></div></div><div class="q17-combat-help"><span>달리기 A/D · 점프 W/↑/Space · 조준 마우스 · 클릭/J 사격 · F 근접 타격 · R 재장전</span><span>짧은 구역을 빠르게 돌파하고, 좀비가 시민에게 닿기 전에 먼저 끊어내세요.</span></div><div class="q17-alert" id="q17Alert"><h2 id="q17AlertTitle">격리선 붕괴</h2><p id="q17AlertText"></p><button id="q17AlertBtn" type="button">진압 시작</button></div></div>';
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
const Q17_TUTORIAL_KEY='kidscade_quarantine17_tutorial_seen',Q17_TUTORIAL_LEGACY='q17Tutorial'+'Seen';
let tutorialIndex=0;
function renderTutorial(){const s=tutorialSteps[tutorialIndex];document.getElementById('q17TutProgress').textContent=(tutorialIndex+1)+' / '+tutorialSteps.length;document.getElementById('q17TutTitle').textContent=s.title;document.getElementById('q17TutText').textContent=s.text;document.getElementById('q17TutDemo').innerHTML=s.demo;document.getElementById('q17TutPrev').disabled=tutorialIndex===0;document.getElementById('q17TutNext').textContent=tutorialIndex===tutorialSteps.length-1?'완료':'다음'}
function openTutorial(step){tutorialIndex=Math.max(0,Math.min(tutorialSteps.length-1,step||0));renderTutorial();tutorial.classList.add('show')}
function closeTutorial(){tutorial.classList.remove('show');try{localStorage.setItem(Q17_TUTORIAL_KEY,'1')}catch(e){}}
helpBtn.addEventListener('click',function(){openTutorial(0)});
document.getElementById('q17TutPrev').addEventListener('click',function(){if(tutorialIndex>0){tutorialIndex--;renderTutorial()}});
document.getElementById('q17TutNext').addEventListener('click',function(){if(tutorialIndex<tutorialSteps.length-1){tutorialIndex++;renderTutorial()}else closeTutorial()});
document.getElementById('q17TutClose').addEventListener('click',closeTutorial);
const startForTutorial=document.getElementById('startBtnV2');if(startForTutorial)startForTutorial.addEventListener('click',function(){let seen=false;try{seen=localStorage.getItem(Q17_TUTORIAL_KEY)==='1'||localStorage.getItem(Q17_TUTORIAL_LEGACY)==='1';if(seen&&!localStorage.getItem(Q17_TUTORIAL_KEY))localStorage.setItem(Q17_TUTORIAL_KEY,'1')}catch(e){}if(!seen)setTimeout(function(){openTutorial(0)},450)});

const canvas=document.getElementById('q17CombatCanvas'),ctx=canvas.getContext('2d');
const images={};Object.keys(SPRITES).forEach(function(k){const im=new Image();im.src=SPRITES[k];images[k]=im});
const keys={},mouse={x:canvas.width/2,y:canvas.height/2,down:false};
let viewScale=.82;
let audioCtx=null;

function getCombatAudio(){
 const AC=window.AudioContext||window.webkitAudioContext;
 if(!AC)return null;
 if(!audioCtx)audioCtx=new AC();
 if(audioCtx.state==='suspended')audioCtx.resume().catch(function(){});
 return audioCtx;
}
function playGunshot(){
 const ac=getCombatAudio();if(!ac)return;
 const now=ac.currentTime+.004;
 const comp=ac.createDynamicsCompressor();
 comp.threshold.setValueAtTime(-10,now);comp.knee.setValueAtTime(8,now);comp.ratio.setValueAtTime(10,now);comp.attack.setValueAtTime(.002,now);comp.release.setValueAtTime(.12,now);
 comp.connect(ac.destination);

 const noiseLen=Math.max(1,Math.floor(ac.sampleRate*.105)),buffer=ac.createBuffer(1,noiseLen,ac.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<noiseLen;i++){const p=1-i/noiseLen;data[i]=(Math.random()*2-1)*p*p}
 const noise=ac.createBufferSource(),band=ac.createBiquadFilter(),ng=ac.createGain();
 noise.buffer=buffer;band.type='bandpass';band.frequency.setValueAtTime(1250,now);band.Q.setValueAtTime(.8,now);
 ng.gain.setValueAtTime(.82,now);ng.gain.exponentialRampToValueAtTime(.001,now+.105);
 noise.connect(band);band.connect(ng);ng.connect(comp);noise.start(now);noise.stop(now+.11);

 const crack=ac.createOscillator(),cg=ac.createGain();
 crack.type='square';crack.frequency.setValueAtTime(210,now);crack.frequency.exponentialRampToValueAtTime(72,now+.055);
 cg.gain.setValueAtTime(.42,now);cg.gain.exponentialRampToValueAtTime(.001,now+.065);
 crack.connect(cg);cg.connect(comp);crack.start(now);crack.stop(now+.07);

 const thump=ac.createOscillator(),tg=ac.createGain();
 thump.type='sine';thump.frequency.setValueAtTime(105,now);thump.frequency.exponentialRampToValueAtTime(48,now+.11);
 tg.gain.setValueAtTime(.62,now);tg.gain.exponentialRampToValueAtTime(.001,now+.13);
 thump.connect(tg);tg.connect(comp);thump.start(now);thump.stop(now+.14);
}

let active=false,started=false,last=0,player=null,zombies=[],bullets=[],survivors=[],reload=0,shootCd=0,meleeCd=0,autoTarget=null;let cameraX=0,worldW=0,worldH=0,groundY=0,obstacles=[];
let mode='outbreak',continuation=null,campLosses=0,currentIncidentInf=0,currentIntruder='';
let combatTime=0,muzzle=0,screenShake=0,damageFlash=0,particles=[];
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
 return {inf:inf,count:Math.max(4,Math.min(14,5+Math.floor((inf-18)*.42))),speed:112+Math.max(0,inf-20)*.8,hp:2+Math.floor(Math.max(0,inf-42)/18)};
}
function resizeCanvas(){
 const r=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
 const cssW=Math.max(320,r.width||Math.min(1040,window.innerWidth||960));
 const cssH=Math.max(180,r.height||cssW*9/16);
 viewScale=cssW<=700?.82:.90;
 const w=Math.max(320,Math.round(cssW*dpr)),h=Math.max(180,Math.round(cssH*dpr));
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
}
function spawnZombie(x,y,hp,speed,name,attackDelay){zombies.push({x:x,y:y,vx:0,vy:0,r:21*(window.devicePixelRatio||1),hp:hp||2,speed:speed||124*(window.devicePixelRatio||1),hit:0,attack:0,name:name||'',attackDelay:attackDelay||0,onGround:true,knock:0})}
function makeWorld(kind){
 const dpr=Math.min(2,window.devicePixelRatio||1);
 worldH=canvas.height;
 const base=kind==='camp'?1450:kind==='isolation'?1320:1760;
 worldW=Math.max(canvas.width/viewScale+220*dpr,base*dpr);
 groundY=worldH-54*dpr;
 const raw=kind==='isolation'
  ?[[320,58,82,'crate'],[610,95,120,'container'],[930,48,108,'barrier'],[1120,72,80,'crate']]
  :kind==='camp'
  ?[[350,58,76,'crate'],[650,44,118,'barrier'],[900,92,128,'container'],[1180,55,88,'crate']]
  :[[340,58,82,'crate'],[610,44,125,'barrier'],[860,96,132,'container'],[1180,60,92,'crate'],[1440,82,125,'container']];
 obstacles=raw.map(function(o){return{x:o[0]*dpr,y:groundY-o[1]*dpr,w:o[2]*dpr,h:o[1]*dpr,type:o[3]}});
}
function setupCombat(kind,payload){
 resizeCanvas();mode=kind;currentIncidentInf=infection();currentIntruder=payload&&payload.name||'';campLosses=0;makeWorld(kind);
 const dpr=Math.min(2,window.devicePixelRatio||1);
 player={x:150*dpr,y:groundY,r:22*dpr,hp:100,ammo:12,maxAmmo:12,vx:0,vy:0,onGround:true,facing:1,iframes:0,hurt:0,shot:0};
 zombies=[];bullets=[];survivors=[];reload=0;shootCd=0;meleeCd=0;autoTarget=null;cameraX=0;combatTime=0;muzzle=0;screenShake=0;damageFlash=0;particles=[];
 if(kind==='isolation'){
  const roomZombies=isolation.filter(function(d){return d.status==='zombie'});roomZombies.forEach(function(d,i){spawnZombie((540+i*210)*dpr,groundY,2,118*dpr,d.name,1+i*.16)});document.getElementById('q17CombatTitle').textContent='⚠ 격리실 직접 진입 · 좀비 소탕';document.getElementById('q17SurvivorStat').style.display='none';
 }else if(kind==='camp'){
  const survivorSprites=['female','adventurer','soldier','player','female','adventurer'];
  const xs=[760,900,1030,1160,1280,1380];
  xs.forEach(function(x,i){survivors.push({x:x*dpr,y:groundY,r:18*dpr,sprite:survivorSprites[i],alive:true,speed:(84+(i%3)*5)*dpr,dir:i%2?1:-1,bite:0,bitten:false,turnTimer:0})});
  spawnZombie(560*dpr,groundY,2,126*dpr,currentIntruder,2.1);
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
 if(active)return;active=true;started=false;continuation=null;iso.classList.remove('show');wrap.classList.add('show');setupCombat('isolation',{});
 document.getElementById('q17AlertTitle').textContent='격리실 진입';
 document.getElementById('q17AlertText').innerHTML='격리실 내부에 <b>'+count+'명</b>의 좀비가 확인됐습니다.<br>소각 대신 직접 진입합니다. 장애물 위로 뛰어넘고 거리를 벌리며 제압하세요. <b>F 근접 타격</b>은 강하지만 물릴 위험이 큽니다.';
 document.getElementById('q17Alert').classList.add('show');
}
function showGlobalOutbreak(){
 if(active||!bridge())return;
 const d=difficulty();if(d.inf<20)return;
 active=true;started=false;continuation=null;wrap.classList.add('show');setupCombat('outbreak',{});
 const severity=d.inf>=40?'대규모 붕괴':d.inf>=30?'중대 경보':'국지적 돌파';
 document.getElementById('q17AlertTitle').textContent=severity;
 document.getElementById('q17AlertText').innerHTML='도시 감염률이 <b>'+d.inf+'%</b>까지 올라 격리선 바깥에서 집단 감염이 발생했습니다.<br>이번 진압 대상은 <b>'+d.count+'명</b>입니다. 검역 단계에서 놓친 감염이 많을수록 더 위험합니다.';
 document.getElementById('q17Alert').classList.add('show');
}
function showCampBreach(payload,next){
 if(active)return false;
 active=true;started=false;continuation=typeof next==='function'?next:null;wrap.classList.add('show');setupCombat('camp',payload);
 document.getElementById('q17AlertTitle').textContent='생존자 캠프 긴급 경보';
 document.getElementById('q17AlertText').innerHTML='<b>'+escapeHtml(payload.name)+'</b>이(가) 감염자였습니다.<br><b>짧은 캠프 구역</b> 안에서 다른 생존자에게 닿기 전에 끊어내세요.<br>달리기와 점프로 거리를 만들고, 사격 또는 밀치기로 빠르게 제압합니다.';
 document.getElementById('q17Alert').classList.add('show');
 return true;
}
function shoot(tx,ty){
 if(!started||shootCd>0||reload>0)return;
 if(player.ammo<=0){startReload();return}
 const dx=tx-player.x,dy=ty-(player.y-30*(window.devicePixelRatio||1)),len=Math.hypot(dx,dy)||1;
 bullets.push({x:player.x+player.facing*24*(window.devicePixelRatio||1),y:player.y-29*(window.devicePixelRatio||1),px:player.x,py:player.y-29*(window.devicePixelRatio||1),vx:dx/len*850*(window.devicePixelRatio||1),vy:dy/len*850*(window.devicePixelRatio||1),life:1.1});
 player.facing=dx>=0?1:-1;player.ammo--;shootCd=.17;player.shot=.12;muzzle=.07;screenShake=Math.max(screenShake,2.8);playGunshot();updateHud();if(player.ammo<=0)startReload();
}
function burstFx(x,y,count){
 for(let i=0;i<count;i++)particles.push({x:x,y:y,vx:(Math.random()-.5)*180,vy:(Math.random()-.9)*150,life:.24+Math.random()*.22,size:2+Math.random()*3});
}
function melee(){
 if(!started||meleeCd>0)return;meleeCd=.5;
 const dpr=Math.min(2,window.devicePixelRatio||1),range=82*dpr,targets=zombies.filter(function(z){return Math.abs(z.x-player.x)<range&&Math.abs(z.y-player.y)<70*dpr});
 let hit=false;targets.forEach(function(z){const side=z.x>=player.x?1:-1;z.hp-=2;z.knock=side*245*dpr;z.hit=.24;burstFx(z.x,z.y-30*dpr,7);hit=true});
 if(hit){screenShake=Math.max(screenShake,5);notify('밀치기 성공')}else notify('밀치기가 빗나갔습니다.');
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
function worldMouse(e){const r=canvas.getBoundingClientRect(),sx=(e.clientX-r.left)*canvas.width/r.width,sy=(e.clientY-r.top)*canvas.height/r.height;return{x:cameraX+sx/viewScale,y:(sy-canvas.height*(1-viewScale))/viewScale}}
function update(dt){
 if(!started)return;
 const dpr=Math.min(2,window.devicePixelRatio||1);
 combatTime+=dt;muzzle=Math.max(0,muzzle-dt);screenShake=Math.max(0,screenShake-dt*18);damageFlash=Math.max(0,damageFlash-dt*3.4);
 shootCd=Math.max(0,shootCd-dt);meleeCd=Math.max(0,meleeCd-dt);
 if(player){player.iframes=Math.max(0,player.iframes-dt);player.hurt=Math.max(0,player.hurt-dt);player.shot=Math.max(0,player.shot-dt)}
 particles.forEach(function(p){p.x+=p.vx*dt*dpr;p.y+=p.vy*dt*dpr;p.vy+=330*dt;p.life-=dt});particles=particles.filter(function(p){return p.life>0});
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
 if(keys.mobileShoot){const n=nearestZombie();if(n)shoot(n.x,n.y-28*dpr)}
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
 bullets.forEach(function(b){b.px=b.x;b.py=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(obstacles.some(function(o){return b.x>o.x&&b.x<o.x+o.w&&b.y>o.y&&b.y<o.y+o.h}))b.life=0});
 bullets=bullets.filter(function(b){return b.life>0&&b.x>-20&&b.x<worldW+20&&b.y>-20&&b.y<worldH+20});
 zombies.forEach(function(z){
  z.attackDelay=Math.max(0,z.attackDelay-dt);z.hit=Math.max(0,z.hit-dt);z.attack=Math.max(0,z.attack-dt);
  const target=nearestTargetForZombie(z),dir=target.x>=z.x?1:-1;
  if(Math.abs(z.knock)>1){z.x+=z.knock*dt;z.knock*=Math.pow(.02,dt)}
  else{z.x+=dir*z.speed*dt;const obs=obstacleAhead(z,dir);if(obs){z.x+=dir*z.speed*.45*dt}}
  const dist=Math.abs(target.x-z.x);
  if(target===player){
   if(dist<player.r+z.r&&Math.abs(player.y-groundY)<60*dpr&&player.iframes<=0){player.hp=Math.max(0,player.hp-10);player.iframes=.72;player.hurt=.28;z.attack=.22;player.vx=dir*210*dpr;damageFlash=.45;screenShake=Math.max(screenShake,8);updateHud();if(player.hp<=0){lose();return}}
  }else if(target.alive&&!target.bitten&&z.attackDelay<=0&&dist<target.r+z.r+6*dpr){
   z.attack=.18;target.bite=(target.bite||0)+dt;if(target.bite>=1.85){target.bitten=true;target.turnTimer=5.5;target.bite=0;z.attackDelay=1.05;notify('생존자 물림 · 약 5초 안에 제압 필요')}
  }
 });
 bullets.forEach(function(b){zombies.forEach(function(z){if(z.hp<=0||b.life<=0)return;const dx=b.x-z.x,dy=b.y-(z.y-28*dpr);if(Math.abs(dx)<z.r*1.05&&Math.abs(dy)<z.r*1.55){const headshot=b.y<z.y-38*dpr;z.hp-=headshot?2:1;z.hit=.18;z.knock=(b.vx>0?1:-1)*115*dpr;b.life=0;burstFx(z.x,b.y,headshot?8:5);screenShake=Math.max(screenShake,headshot?5:3);if(headshot)notify('헤드샷')}})});
 zombies=zombies.filter(function(z){return z.hp>0});updateHud();
 cameraX=Math.max(0,Math.min(Math.max(0,worldW-canvas.width/viewScale),player.x-(canvas.width/viewScale)*.40));
 if(zombies.length===0&&!survivors.some(function(s){return s.alive&&s.bitten}))win();
}
function draw(){
 const W=canvas.width,H=canvas.height,dpr=Math.min(2,window.devicePixelRatio||1);
 ctx.clearRect(0,0,W,H);
 const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,mode==='camp'?'#17231f':'#17212a');bg.addColorStop(.68,mode==='camp'?'#25302a':'#26313a');bg.addColorStop(1,'#11171c');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);

 const shakeX=(Math.random()-.5)*screenShake*dpr,shakeY=(Math.random()-.5)*screenShake*dpr;
 ctx.save();ctx.translate(shakeX,H*(1-viewScale)+shakeY);ctx.scale(viewScale,viewScale);ctx.translate(-cameraX,0);

 const visibleW=W/viewScale;
 const startX=Math.max(0,cameraX-120*dpr),endX=Math.min(worldW,cameraX+visibleW+160*dpr);
 ctx.fillStyle='#202a31';ctx.fillRect(startX,groundY-175*dpr,endX-startX,175*dpr);

 // 먼 배경: 철망, 조명, 격리 시설
 ctx.strokeStyle='#48565f';ctx.lineWidth=2*dpr;
 for(let x=Math.floor(startX/(120*dpr))*120*dpr;x<endX;x+=120*dpr){
  ctx.beginPath();ctx.moveTo(x,groundY-132*dpr);ctx.lineTo(x,groundY);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x,groundY-132*dpr);ctx.lineTo(x+120*dpr,groundY);ctx.moveTo(x+120*dpr,groundY-132*dpr);ctx.lineTo(x,groundY);ctx.stroke();
 }
 for(let x=Math.floor(startX/(420*dpr))*420*dpr;x<endX;x+=420*dpr){
  ctx.fillStyle='#5a6266';ctx.fillRect(x+70*dpr,groundY-210*dpr,5*dpr,78*dpr);
  ctx.fillStyle='#ddd27a';ctx.beginPath();ctx.arc(x+73*dpr,groundY-214*dpr,7*dpr,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ddd27a18';ctx.beginPath();ctx.moveTo(x+73*dpr,groundY-205*dpr);ctx.lineTo(x+5*dpr,groundY-110*dpr);ctx.lineTo(x+145*dpr,groundY-110*dpr);ctx.closePath();ctx.fill();
 }
 if(mode==='camp'){
  [760,1040,1270].forEach(function(x,i){x*=dpr;ctx.fillStyle=i%2?'#46554a':'#4c594a';ctx.beginPath();ctx.moveTo(x,groundY);ctx.lineTo(x+70*dpr,groundY-92*dpr);ctx.lineTo(x+140*dpr,groundY);ctx.closePath();ctx.fill();ctx.strokeStyle='#747d6a';ctx.stroke()});
  ctx.fillStyle='#b9ad65';ctx.font=(12*dpr)+'px sans-serif';ctx.fillText('SURVIVOR CAMP 17',720*dpr,groundY-118*dpr);
 }else if(mode==='isolation'){
  ctx.fillStyle='#303a40';ctx.fillRect(430*dpr,groundY-150*dpr,690*dpr,150*dpr);
  ctx.strokeStyle='#66727b';ctx.strokeRect(430*dpr,groundY-150*dpr,690*dpr,150*dpr);
  ctx.fillStyle='#a9774b';ctx.fillRect(735*dpr,groundY-120*dpr,80*dpr,120*dpr);
  ctx.fillStyle='#9ca7ae';ctx.font=(11*dpr)+'px sans-serif';ctx.fillText('ISOLATION A',452*dpr,groundY-122*dpr);
 }

 // 바닥
 ctx.fillStyle='#242e36';ctx.fillRect(0,groundY,worldW,Math.max(H,120*dpr));
 ctx.fillStyle='#39454d';for(let x=0;x<worldW;x+=150*dpr)ctx.fillRect(x,groundY-4*dpr,96*dpr,4*dpr);
 ctx.fillStyle='#bba84d';for(let x=40*dpr;x<worldW;x+=260*dpr)ctx.fillRect(x,groundY+16*dpr,120*dpr,3*dpr);

 obstacles.forEach(function(o){
  ctx.fillStyle=o.type==='container'?'#3c4b53':o.type==='crate'?'#5a4939':'#51575b';ctx.fillRect(o.x,o.y,o.w,o.h);
  ctx.strokeStyle=o.type==='crate'?'#8b745a':'#7d8990';ctx.lineWidth=2*dpr;ctx.strokeRect(o.x,o.y,o.w,o.h);
  if(o.type==='crate'||o.type==='container'){ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(o.x+o.w,o.y+o.h);ctx.moveTo(o.x+o.w,o.y);ctx.lineTo(o.x,o.y+o.h);ctx.stroke()}
 });

 if(mode==='camp'){
  survivors.forEach(function(s){
   if(!s.alive)return;const im=images[s.sprite]||images.player,ss=s.r*3;
   ctx.save();ctx.translate(s.x,s.y);ctx.scale(s.dir<0?-1:1,1);ctx.drawImage(im,-ss/2,-ss*.76,ss,ss);ctx.restore();
   if(s.bitten){
    const p=Math.max(0,Math.min(1,s.turnTimer/5.5));ctx.fillStyle='#180d0ddd';ctx.fillRect(s.x-22*dpr,s.y-62*dpr,44*dpr,5*dpr);ctx.fillStyle='#d6575f';ctx.fillRect(s.x-22*dpr,s.y-62*dpr,44*dpr*p,5*dpr);
   }
  });
 }

 bullets.forEach(function(b){ctx.strokeStyle='#ffe78a';ctx.lineWidth=2.5*dpr;ctx.beginPath();ctx.moveTo(b.px||b.x,b.py||b.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.fillStyle='#fff4b0';ctx.beginPath();ctx.arc(b.x,b.y,2.8*dpr,0,Math.PI*2);ctx.fill()});

 zombies.forEach(function(z){
  const ss=z.r*3,flip=player.x<z.x?-1:1;
  let im=z.hit>0?images.zombieHurt:z.attack>0?images.zombieAttack:((Math.floor(combatTime*7+z.x*.01)%2)?images.zombieWalk1:images.zombieWalk2);
  im=im||images.zombie;
  ctx.save();ctx.translate(z.x,z.y);ctx.scale(flip,1);if(z.hit>0)ctx.globalAlpha=.72;ctx.drawImage(im,-ss/2,-ss*.76,ss,ss);ctx.restore();
 });

 let pim=images.player;
 if(player.hurt>0)pim=images.playerHurt||pim;
 else if(!player.onGround)pim=images.playerJump||pim;
 else if(player.shot>0)pim=images.playerShoot||pim;
 else if(Math.abs(player.vx)>35*dpr)pim=(Math.floor(combatTime*9)%2?images.playerWalk1:images.playerWalk2)||pim;
 const ps=player.r*3.05;
 ctx.save();ctx.translate(player.x,player.y);ctx.scale(player.facing,1);
 if(player.iframes>0&&Math.floor(combatTime*18)%2===0)ctx.globalAlpha=.45;
 ctx.drawImage(pim,-ps/2,-ps*.76,ps,ps);
 ctx.globalAlpha=1;ctx.fillStyle='#22282d';ctx.fillRect(10*dpr,-36*dpr,30*dpr,5*dpr);ctx.fillRect(7*dpr,-34*dpr,8*dpr,10*dpr);
 if(muzzle>0){ctx.fillStyle='#ffd769';ctx.beginPath();ctx.moveTo(42*dpr,-40*dpr);ctx.lineTo(58*dpr,-34*dpr);ctx.lineTo(42*dpr,-29*dpr);ctx.closePath();ctx.fill()}
 ctx.restore();

 if(reload>0){ctx.fillStyle='#000c';ctx.fillRect(player.x-30*dpr,player.y-72*dpr,60*dpr,6*dpr);ctx.fillStyle='#e2c65c';ctx.fillRect(player.x-30*dpr,player.y-72*dpr,60*dpr*(1-reload/1.05),6*dpr)}
 particles.forEach(function(p){ctx.globalAlpha=Math.max(0,p.life/.45);ctx.fillStyle='#efc56d';ctx.fillRect(p.x,p.y,p.size*dpr,p.size*dpr)});ctx.globalAlpha=1;
 ctx.restore();

 const progress=Math.max(0,Math.min(100,Math.round((player.x/Math.max(1,worldW))*100)));
 ctx.fillStyle='#090c10c8';ctx.fillRect(10*dpr,10*dpr,190*dpr,25*dpr);ctx.fillStyle='#d5dde2';ctx.font=(10*dpr)+'px sans-serif';
 ctx.fillText((mode==='camp'?'캠프 방어':mode==='isolation'?'격리실 소탕':'격리선 진압')+' · 진행 '+progress+'%',18*dpr,27*dpr);
 if(damageFlash>0){ctx.fillStyle='rgba(190,35,45,'+(damageFlash*.22)+')';ctx.fillRect(0,0,W,H)}
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
 const lostMode=mode,next=continuation;started=false;active=false;continuation=null;wrap.classList.remove('show');
 const b=bridge();
 if(lostMode==='camp'){
  if(b)b.applyOutbreakResult({won:false,infectionDelta:5,trustDelta:-7,scoreDelta:-240});
  notify('캠프 진압 실패 · 감염률 상승');
  if(next)setTimeout(next,450);
  return;
 }
 if(lostMode==='isolation'){
  if(b)b.applyOutbreakResult({won:false,infectionDelta:2,trustDelta:-3,scoreDelta:-140});
  addIsoLog('<b>직접 진입 실패</b> · 남은 좀비는 격리실에 계속 존재함');renderIsolation();notify('격리실에서 긴급 철수했습니다.');
  return;
 }
 if(b)b.applyOutbreakResult({won:false,infectionDelta:8,trustDelta:-15,scoreDelta:-500,gameOver:true});
 document.getElementById('q17DeadTitle').textContent='검역소 함락';
 document.getElementById('q17DeadText').innerHTML='격리선이 무너졌고 감염자들이 검역소 안까지 들어왔습니다.<br>대규모 진압에 실패해 제17구역은 폐쇄되었습니다.';
 dead.classList.add('show');
}

document.getElementById('q17AlertBtn').addEventListener('click',function(){getCombatAudio();document.getElementById('q17Alert').classList.remove('show');started=true;last=performance.now();requestAnimationFrame(loop)});
document.getElementById('q17Restart').addEventListener('click',function(){dead.classList.remove('show');location.reload()});
window.addEventListener('keydown',function(e){const k=e.key.toLowerCase();keys[k]=true;if(k==='r')startReload();if(k==='f'&&active)melee();if(k==='j'&&active){const n=nearestZombie();if(n)shoot(n.x,n.y-25*(window.devicePixelRatio||1))}if(e.code==='Space'&&active)e.preventDefault()});
window.addEventListener('keyup',function(e){keys[e.key.toLowerCase()]=false});
canvas.addEventListener('pointermove',function(e){const p=worldMouse(e);mouse.x=p.x;mouse.y=p.y});
canvas.addEventListener('pointerdown',function(e){const p=worldMouse(e);mouse.x=p.x;mouse.y=p.y;if(e.pointerType==='touch'){const n=nearestZombie();if(n)shoot(n.x,n.y-28*(window.devicePixelRatio||1));else shoot(p.x,p.y)}else{mouse.down=true;shoot(p.x,p.y)}});
canvas.addEventListener('pointerup',function(){mouse.down=false});
canvas.addEventListener('pointercancel',function(){mouse.down=false});

function bindHold(btn,key){
 if(!btn)return;
 const on=function(e){e.preventDefault();getCombatAudio();keys[key]=true;btn.classList.add('active');try{btn.setPointerCapture(e.pointerId)}catch(_){}};
 const off=function(e){e.preventDefault();keys[key]=false;btn.classList.remove('active')};
 btn.addEventListener('pointerdown',on);btn.addEventListener('pointerup',off);btn.addEventListener('pointercancel',off);btn.addEventListener('lostpointercapture',off);
}
bindHold(document.querySelector('[data-hold="left"]'),'a');
bindHold(document.querySelector('[data-hold="right"]'),'d');
bindHold(document.getElementById('q17Shoot'),'mobileShoot');
document.getElementById('q17Jump').addEventListener('pointerdown',function(e){e.preventDefault();keys[' ']=true});
document.getElementById('q17Melee').addEventListener('pointerdown',function(e){e.preventDefault();melee()});
document.getElementById('q17Reload').addEventListener('pointerdown',function(e){e.preventDefault();startReload()});
window.addEventListener('resize',function(){if(active){resizeCanvas();makeWorld(mode);if(player){player.y=groundY;survivors.forEach(function(x){x.y=groundY});zombies.forEach(function(x){x.y=groundY})}}});

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