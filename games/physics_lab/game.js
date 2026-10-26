import {W,H,FIXED_DT,ZONES,ITEMS,SURFACES,ALL_STAGES,createWorld,stepWorld,pickup,drop,throwItem,surfaceAt,medal,getStage} from './sim.mjs';
const $=id=>document.getElementById(id);
const canvas=$('arena'),ctx=canvas.getContext('2d');
const ui={overlay:$('overlay'),title:$('overlay-title'),description:$('overlay-description'),content:$('overlay-content'),actions:$('overlay-actions'),
  mission:$('mission'),chapter:$('chapter-label'),goals:$('goal-count'),shots:$('shots'),score:$('score'),
  concept:$('concept'),tip:$('tip'),surface:$('surface-label'),heldName:$('held-name'),heldDescription:$('held-description'),heldIcon:$('held-icon'),
  progress:$('progress-label'),progressFill:$('progress-fill'),toast:$('toast'),power:$('power'),powerValue:$('power-value')};
const experimentLog=$('experiment-log');
const ICONS={tennis:'●',ball:'●',wood:'▣',metal:'●',cube:'◆'};
const savedKey='kidscade.physics_lab.progress.v1';
function loadProgress(){try{const o=JSON.parse(localStorage.getItem(savedKey)||'null');return {unlocked:Math.max(1,Math.min(ALL_STAGES.length,Number(o?.unlocked)||1)),medals:typeof o?.medals==='object'&&o.medals?o.medals:{}};}catch{return {unlocked:1,medals:{}};}}
let progress=loadProgress();
function saveProgress(){try{localStorage.setItem(savedKey,JSON.stringify(progress));}catch{}}
let aimAngle=-Math.PI/2;
let world=createWorld(1),scene='menu',last=0,acc=0,aim={x:800,y:300},power=.85,muted=false,toastUntil=0,zoneSelected=0,reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const keys=new Set(),stick={active:false,pointer:null,dx:0,dy:0};
let lastSound=0,ac=null,uiClock=0;
function beep(freq=420,duration=.09,kind='triangle',volume=.045){if(muted||Date.now()-lastSound<35)return;lastSound=Date.now();try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();const osc=ac.createOscillator(),gain=ac.createGain();osc.type=kind;osc.frequency.setValueAtTime(freq,ac.currentTime);gain.gain.setValueAtTime(volume,ac.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ac.currentTime+duration);osc.connect(gain);gain.connect(ac.destination);osc.start();osc.stop(ac.currentTime+duration);}catch{}}
function toast(text){ui.toast.textContent=text;ui.toast.classList.add('visible');toastUntil=performance.now()+2100;}
function setOverlay(show){ui.overlay.hidden=!show;}
function button(label,callback,secondary=false){const b=document.createElement('button');b.type='button';b.textContent=label;if(secondary)b.className='secondary';b.addEventListener('click',callback);ui.actions.append(b);return b;}
function sdkStart(mode){try{window.KidscadeGame?.start?.({mode});}catch{}}
function sdkResult(outcome){if(world.mode==='arcade'){try{const key='kidscade.physics_lab.survival.best.v1';const best=Number(localStorage.getItem(key)||0);if(world.score>best)localStorage.setItem(key,String(world.score));}catch{}}try{window.KidscadeGame?.score?.(world.score);window.KidscadeGame?.result?.({scope:world.mode==='arcade'?'run':'stage',status:'completed',outcome,score:world.score,stage:world.mode==='arcade'?'arcade':world.stage.id,shots:world.shots,medal:medal(world),concept:world.stage.concept});}catch{}}
function clearModal(){ui.content.replaceChildren();ui.actions.replaceChildren();}
function showMenu(initial=false){scene='menu';setOverlay(true);clearModal();ui.title.textContent='와르르! 물리 연구소';ui.description.textContent='회전하는 화살표에 맞춰 물건을 던져! 적들을 연쇄로 맞혀 살아남자.';
  const intro=document.createElement('div');intro.className='lesson-note';intro.textContent='메인 생존전: 방향키 이동 · Space로 줍고 다시 Space로 던지기 · 상자를 부수어 40종의 잡동사니 확보. 아래 36단계는 별도의 과학 실험실이야.';ui.content.append(intro);
  const startSurvival=document.createElement('button');startSurvival.type='button';startSurvival.className='survival-featured';startSurvival.textContent='▶ 와르르 생존전 시작';startSurvival.addEventListener('click',beginArcade);ui.content.append(startSurvival);
  const zones=document.createElement('div');zones.className='zones';zones.style.marginTop='14px';
  ZONES.forEach((zone,i)=>{const card=document.createElement('button');card.className='zone-card'+(zoneSelected===i?' selected':'');card.innerHTML=`<b>${i+1}구역</b><strong>${zone.name}</strong><span>${zone.concept} · ${Math.max(0,Math.min(6,progress.unlocked-1-i*6))}/6 완료</span>`;
    card.addEventListener('click',()=>{zoneSelected=i;showMenu();});zones.append(card);});ui.content.append(zones);
  const grid=document.createElement('div');grid.className='stage-grid';
  ALL_STAGES.slice(zoneSelected*6,zoneSelected*6+6).forEach(s=>{const b=document.createElement('button');b.disabled=s.id>progress.unlocked;b.className=s.id===world.stage.id?'selected':'';
    b.innerHTML=`<b>${s.id}</b>${s.id>progress.unlocked?'잠김':('★'.repeat(progress.medals[s.id]||0)||'도전')}`;
    b.title=s.title;b.addEventListener('click',()=>beginStage(s.id));grid.append(b);});ui.content.append(grid);
  button('물리 퍼즐 이어하기 · '+getStage(progress.unlocked).title,()=>beginStage(progress.unlocked),true);
  if(!initial)button('돌아가기',()=>{if(world.status==='playing')resume();else beginStage(world.stage.id);},true);
}
function beginStage(id){world=createWorld(id,'campaign');setArcadeControls(false);scene='playing';setOverlay(false);keys.clear();stick.dx=stick.dy=0;aim={x:780,y:world.goals[0]?.y||300};acc=0;syncUi();sdkStart('campaign');toast(`${world.stage.id}단계 · ${world.stage.title}`);}
function beginArcade(){world=createWorld(1,'arcade');setArcadeControls(true);aimAngle=-Math.PI/2;scene='playing';setOverlay(false);keys.clear();stick.dx=stick.dy=0;aim={x:800,y:300};acc=0;syncUi();sdkStart('arcade');toast('회전하는 화살표에 맞춰 던져! Space = 집기 / 던지기');}
function setArcadeControls(arcade){
  $('throw-btn').hidden=arcade;$('drop-btn').hidden=arcade;
  ui.power.closest('.power-control').hidden=arcade;
  $('hint-btn').hidden=arcade;
  $('pickup-btn').innerHTML=arcade?'집기 / 던지기 <small>Space · 터치</small>':'집기 <small>Space / E</small>';
  document.querySelector('.help-line').textContent=arcade?'이동: 방향키·WASD·조이스틱 · Space 또는 집기/던지기 버튼 한 번으로 줍기, 다시 한 번으로 발사 · 화살표가 저절로 돌아요.':'이동: 방향키·WASD·조이스틱 · 물건을 집어 화면을 누르고 끌어서 조준한 뒤 던지세요.';
}
function showResult(won){syncUi();scene='result';setOverlay(true);clearModal();ui.title.textContent=won?'실험 성공!':'연구소 방어 종료';ui.description.textContent=won?'여러 번 시도하면서 원리를 발견했어!':'새로운 방법으로 다시 도전해 봐.';
  const d=document.createElement('div');d.className='results';
  const star=document.createElement('div');star.className='stars';star.textContent=won?'★'.repeat(medal(world))+'☆'.repeat(3-medal(world)):'⚙';d.append(star);
  const h=document.createElement('h3');h.textContent=world.mode==='arcade'?`${world.score.toLocaleString()}점 기록!`:`${world.stage.title} · ${world.score.toLocaleString()}점`;d.append(h);
  const p=document.createElement('p');p.textContent=world.mode==='arcade'?`타격 ${world.survivalHits}회 · 최고 연속 타격 ${world.maxCombo}회 · 보급상자 ${world.cratesBroken}개`:`물건 ${world.shots}번 던지기 · 스위치 ${world.hits}개 작동`;d.append(p);
  if(world.mode==='arcade'){try{const best=Number(localStorage.getItem('kidscade.physics_lab.survival.best.v1')||0);const r=document.createElement('p');r.textContent=`내 최고 기록 ${Math.max(best,world.score).toLocaleString()}점 · 다음 판에는 한 번의 투척으로 여러 명 맞혀 보자!`;d.append(r);}catch{}}
  if(world.mode==='campaign'){const lesson=document.createElement('div');lesson.className='lesson-note';lesson.textContent=`오늘의 발견 · ${ZONES[world.stage.zone].concept} — ${world.stage.tip}`;d.append(lesson);}
  ui.content.append(d);button('다시 도전',()=>world.mode==='arcade'?beginArcade():beginStage(world.stage.id));
  if(won&&world.mode==='campaign'&&world.stage.id<ALL_STAGES.length)button('다음 실험으로',()=>beginStage(world.stage.id+1));
  button('단계 선택',()=>{zoneSelected=world.mode==='arcade'?0:world.stage.zone;showMenu();},true);
  sdkResult(won?'clear':'loss');
}
function pause(){if(scene!=='playing')return;scene='paused';setOverlay(true);clearModal();ui.title.textContent='잠깐 쉬는 시간';ui.description.textContent='진행 중인 실험은 그대로 남아 있어.';button('이어서 하기',resume);button('처음부터',()=>world.mode==='arcade'?beginArcade():beginStage(world.stage.id),true);button('구역 선택',()=>showMenu(),true);}
function resume(){scene='playing';setOverlay(false);last=performance.now();acc=0;}
function tryAction(){if(world.mode==='arcade'&&world.player.held!==null)return tryThrow();return tryPickup();}
function tryPickup(){if(scene!=='playing')return;if(pickup(world)){beep(580);syncUi();}else toast(world.player.held===null?'물건 가까이에서 집어 봐!':'이미 물건을 들고 있어.');}
function tryThrow(){if(scene!=='playing')return;if(throwItem(world,aim.x,aim.y,world.mode==='arcade'?1:power)){beep(250,.12,'sawtooth');syncUi();}else toast('먼저 물건을 집어 보자!');}
function syncUi(){ui.mission.textContent=world.mode==='arcade'?'와르르 생존전 · 40종의 잡동사니':`${world.stage.id}단계 · ${world.stage.title}`;
  ui.chapter.textContent=world.mode==='arcade'?'메인 · 생존 액션':`${world.stage.zone+1}구역 · ${ZONES[world.stage.zone].concept}`;
  ui.goals.textContent=world.mode==='arcade'?`생명 ${'♥'.repeat(Math.max(0,world.hearts))} · 적 ${world.bots.length}명`:`스위치 ${world.goals.filter(x=>x.active).length} / ${world.goals.length}`;
  $('mechanism-status').textContent=world.mode==='arcade'?'':world.dominos.length?`도미노 ${world.dominos.filter(x=>x.fallen).length}/${world.dominos.length} · 문 ${world.gates.every(g=>g.open)?'열림':'닫힘'}`:world.pads.length?`압력판 ${world.pads.filter(p=>p.active).length}/${world.pads.length} · 문 ${world.gates.every(g=>g.open)?'열림':'닫힘'}`:'';
  ui.shots.textContent=world.mode==='arcade'?`연속 타격 ${world.combo}회 · 상자 ${world.cratesBroken}개`:`투척 ${world.shots}회`;ui.score.textContent=`${world.score.toLocaleString()}점`;
  ui.concept.textContent=world.mode==='arcade'?'한 번의 투척으로 몇 번 맞힐까?':ZONES[world.stage.zone].concept;
  ui.tip.textContent=world.stage.tip;
  ui.surface.textContent=`현재 바닥: ${SURFACES[surfaceAt(world,world.player.x,world.player.y)].label}`;
  const item=world.items.find(it=>it.id===world.player.held);
  ui.heldName.textContent=item?ITEMS[item.type].name:'없음';ui.heldIcon.textContent=item?ICONS[item.type]:'◯';
  ui.heldDescription.textContent=item?`질량 ${ITEMS[item.type].mass} · 튕김 ${Math.round(ITEMS[item.type].restitution*100)}%`:'물건 가까이에서 집기를 눌러.';
  $('progress-heading').textContent=world.mode==='arcade'?'생존 기록':'탐험 일지';$('progress-note').textContent=world.mode==='arcade'?'문이 번쩍이면 적이 등장해요. 상자를 깨면 새 물건을 얻을 수 있어요.':'실패해도 괜찮아. 조건을 바꾸고 다시 실험해 봐!';
  if(world.mode==='arcade'){$('pickup-btn').innerHTML=world.player.held===null?'줍기 <small>Space</small>':'던지기! <small>Space</small>';ui.heldDescription.textContent=item?`질량 ${ITEMS[item.type].mass.toFixed(1)} · 화살표에 맞춰 Space!`:'주변의 물건을 줍거나 상자를 부숴 봐.';}
  if(world.mode==='arcade'){ui.progress.textContent=`최고 콤보 ${world.maxCombo} · ${Math.floor(world.time)}초 생존`;ui.progressFill.style.width=`${Math.max(0,world.hearts)/3*100}%`;experimentLog.textContent=`한 번의 투척 최대 연속 타격 ${world.maxCombo}회 · 보급상자 ${world.cratesBroken}개 · 던진 물건 ${world.shots}개`;return;}
  ui.progress.textContent=`${Math.min(progress.unlocked,ALL_STAGES.length)} / ${ALL_STAGES.length}`;ui.progressFill.style.width=`${(progress.unlocked-1)/(ALL_STAGES.length-1)*100}%`;
  experimentLog.textContent=world.experiments.length?world.experiments.slice(-2).map(e=>`${ITEMS[e.type].name} · ${SURFACES[e.surface].label} · 힘 ${Math.round(e.power*100)}% · 이동 약 ${Math.round(e.distance/40)}칸 · 튕김 ${e.bounces||0}회 (${e.reason})`).join(' / '):'던진 뒤 움직임을 관찰하면 이동 거리와 튕긴 횟수가 기록돼요.';
}
function processEvents(){for(const event of world.events){switch(event.type){case'goal':toast(`스위치 작동! +${event.score}점${event.combo>1?` · ${event.combo}콤보`:''}`);beep(770,.16,'triangle');break;
  case'bot-hit':toast(`${event.combo}연속 타격! +${event.points}점`);beep(Math.min(1080,420+event.combo*130),.09);break;
  case'crate-break':toast(`상자가 부서졌어! ${event.name} 등장`);beep(720,.11);break;
  case'warning':beep(300,.07);break;
  case'bot-down':beep(250,.08);break;
  case'hurt':toast(`적과 부딪혔어! 생명 ${event.hearts}개 남음`);beep(180,.22,'sawtooth');break;
  case'restock':toast('새 물건이 도착했어!');break;
  case'experiment':syncUi();break;
  case'soft-hit':if(event.reason==='bounce')toast('이 스위치는 물건이 한 번 튕긴 뒤에야 켜져!');else toast('충격이 약했어. 힘이나 물건을 바꿔 봐!');break;
  case'bounce':beep(360,.055);break;
  case'domino':if(event.id===0)toast('첫 도미노가 쓰러졌어! 이어지는 움직임을 봐.');beep(490,.06);break;
  case'gate':toast('연쇄 장치 성공! 문이 열렸어!');beep(840,.17);break;
  case'pad':toast('압력판 작동! 이제 문으로 갈 수 있어.');beep(710,.11);break;
  case'won':if(world.stage.id>=progress.unlocked)progress.unlocked=Math.min(ALL_STAGES.length,world.stage.id+1);progress.medals[world.stage.id]=Math.max(progress.medals[world.stage.id]||0,medal(world));saveProgress();showResult(true);break;
  case'lost':showResult(false);break;
 }}world.events.length=0;}
function roundrect(x,y,w,h,r,fill,stroke,line=2){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}}
function text(str,x,y,size=15,color='#305a54',align='center',bold=true){ctx.font=`${bold?800:500} ${size}px system-ui,sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(str,x,y);}
function circle(x,y,r,color,stroke=null,sw=2){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=sw;ctx.stroke();}}
function drawFloor(time){const zone=world.mode==='arcade'?0:world.stage.zone,colors=['#e8ebd2','#e2eff2','#f2e7d3','#efe1e9','#f4e6d6','#e0e9f2'];ctx.fillStyle=colors[zone];ctx.fillRect(0,0,W,H);
  ctx.save();ctx.strokeStyle='#517c7524';ctx.lineWidth=1;for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}ctx.restore();
  roundrect(28,52,904,518,21,'#c4c4aa','#426d68',6);roundrect(36,60,888,502,17,'#ebe6cc','#a8c6b1',2);
  for(const s of world.stage.surfaces){
    const c=SURFACES[s.type].color;roundrect(s.x,s.y,s.w,s.h,14,c,'#729f99',2);
    ctx.save();ctx.beginPath();ctx.roundRect(s.x+2,s.y+2,s.w-4,s.h-4,12);ctx.clip();
    ctx.globalAlpha=.24;ctx.strokeStyle='#ffffff';ctx.lineWidth=3;
    for(let x=s.x-s.h;x<s.x+s.w+s.h;x+=55){ctx.beginPath();ctx.moveTo(x,s.y);ctx.lineTo(x+s.h,s.y+s.h);ctx.stroke();}
    ctx.restore();text(SURFACES[s.type].label+' 바닥',s.x+82,s.y+22,18,'#335a62');
  }
  for(let i=0;i<9;i++){roundrect(48+i*99,62,10,10,3,'#a2bdad');roundrect(48+i*99,552,10,7,2,'#a2bdad');}
  if(world.mode!=='arcade'){roundrect(74,187,188,227,21,'#bfd4b4','#749c88',3);text('물건 보관 구역',168,203,18,'#35635b');}
  for(let i=0;i<5;i++)circle(75+i*37,94,3,'#adc2af');
  text(world.mode==='arcade'?'문이 번쩍이면 적이 나타나요!':'스위치 목표 →',750,80,16,'#618c82');
  if(world.mode==='arcade'){ctx.strokeStyle='#bf90bc';ctx.lineWidth=8;ctx.strokeRect(45,67,871,489);text('물건을 주워 던져서 살아남자!',480,89,17,'#7c5182');}
}
function drawMachines(t){
  for(const belt of world.belts){
    roundrect(belt.x,belt.y,belt.w,belt.h,13,'#7799ba','#365a83',4);
    ctx.save();ctx.beginPath();ctx.rect(belt.x+7,belt.y+7,belt.w-14,belt.h-14);ctx.clip();
    const offset=reduceMotion?0:((t* Math.abs(belt.vx)/3)%53);
    for(let x=belt.x-52+offset;x<belt.x+belt.w;x+=53){
      const dir=Math.sign(belt.vx);text(dir>0?'➜':'⬅',x,belt.y+belt.h/2,26,'#e2f4ff');
    }ctx.restore();
  }
  for(const pad of world.pads){
    circle(pad.x,pad.y,pad.r+6,pad.active?'#50b999':'#bd956a','#ffffff',3);
    circle(pad.x,pad.y,pad.r-1,pad.active?'#b3f3d8':'#f8dcac','#816b50',3);
    text(pad.active?'✓':'↓',pad.x,pad.y,23,pad.active?'#147857':'#9b6735');
    text('무게 '+pad.requiredMass+'↑',pad.x,pad.y+42,12,'#38555d');
  }
  for(const gate of world.gates){
    if(gate.open){ctx.strokeStyle='#58ac8b';ctx.lineWidth=3;ctx.setLineDash([9,8]);ctx.strokeRect(gate.x,gate.y,gate.w,gate.h);ctx.setLineDash([]);}
    else{roundrect(gate.x,gate.y,gate.w,gate.h,5,'#be7868','#803f36',3);
      for(let y=gate.y+14;y<gate.y+gate.h-5;y+=33)roundrect(gate.x+5,y,gate.w-10,13,3,'#f2c183');
      text('닫힘',gate.x+14,gate.y-18,12,'#9a4d42');}
  }
  for(const d of world.dominos){
    ctx.save();ctx.translate(d.x,d.y);if(d.fallen){ctx.rotate(-.98);roundrect(-13,-19,26,38,5,'#e5c78d','#9c7b40',3);}
    else{roundrect(-11,-23,22,46,5,'#f5bc72','#925c3e',3);circle(0,-8,3,'#d7834d');}
    ctx.restore();
  }
}
function drawBarriers(){for(const b of world.barriers){roundrect(b.x+4,b.y+6,b.w,b.h,6,'#6576745d');roundrect(b.x,b.y,b.w,b.h,5,'#8c9995','#596d69',4);for(let y=b.y+10;y<b.y+b.h-8;y+=26){ctx.fillStyle='#ffdd81';ctx.fillRect(b.x+4,y,b.w-8,7);}}}
function drawBumpers(t){for(const b of world.bumpers){circle(b.x+3,b.y+5,b.r+6,'#0000001f');circle(b.x,b.y,b.r+6,'#6b518a');circle(b.x,b.y,b.r+2,'#c0a1e8','#fff',3);circle(b.x,b.y,b.r*.6,`rgba(248,240,255,${.45+Math.sin(t*3+b.x)*.14})`);text('✦',b.x,b.y+1,24,'#8158b1');}}
function drawGoals(t){for(const g of world.goals){ctx.save();ctx.translate(g.x,g.y);const breathe=reduceMotion?0:Math.sin(t*4+g.id)*2;
    circle(3,5,32,'#00000022');circle(0,0,30+breathe,g.active?'#53c3a6':'#c3595c','#ffffff',3);
    circle(0,0,21,g.active?'#b4ffdf':'#ffbfb8',g.active?'#2c9068':'#8b3537',4);
    text(g.active?'✓':g.requiredBounces?'↶':'!',0,1,22,g.active?'#18784c':'#ba3a39');if(g.requiredBounces&&!g.active)text('튕겨서 켜기',0,54,18,'#963c47');if(g.pulse>0){circle(0,0,30+(1-g.pulse/.6)*30,'#ffffff00','#8bdfa3',4);}ctx.restore();}}
function drawItem(item,t){const data=ITEMS[item.type],x=item.x,y=item.y;circle(x+3,y+5,item.r+2,'#224a4d33');ctx.save();ctx.translate(x,y);
  if(item.type==='wood'||item.type==='cube'){ctx.rotate(.08*Math.sin(t*2+item.id));roundrect(-item.r,-item.r,item.r*2,item.r*2,4,data.color,data.outline,3);ctx.strokeStyle=data.outline;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-item.r+6,-item.r+7);ctx.lineTo(item.r-6,item.r-7);ctx.stroke();}
  else{circle(0,0,item.r,data.color,data.outline,3);circle(-item.r*.28,-item.r*.32,item.r*.32,'#ffffff88');if(item.type==='metal'){ctx.strokeStyle='#ffffffa9';ctx.lineWidth=3;ctx.beginPath();ctx.arc(1,0,item.r*.67,-.9,.9);ctx.stroke();}else{ctx.strokeStyle=data.outline;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,item.r*.66,-.8,.7);ctx.stroke();}}
  if(data.icon){text(data.icon,0,1,Math.max(16,item.r*1.25),'#ffffff');}
  ctx.restore();}
function drawPlayer(t){const {x,y,r,held}=world.player;if(world.mode==='arcade'&&world.player.invulnerable>0&&Math.floor(t*10)%2===0)return;circle(x+4,y+7,25,'#183c3d3c');circle(x,y+2,22,'#174c62');circle(x,y-2,19,'#51b4ae','#1e7074',3);
  circle(x-6,y-5,2.7,'#114650');circle(x+6,y-5,2.7,'#114650');ctx.strokeStyle='#114650';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y-1,5,0,Math.PI);ctx.stroke();
  roundrect(x-14,y-22,28,9,5,'#ffd76c','#b78d42',2);
  if(held!==null){const dir={x:aim.x-x,y:aim.y-y},d=Math.hypot(dir.x,dir.y)||1;ctx.strokeStyle='#20817a';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x+dir.x/d*15,y+dir.y/d*15);ctx.lineTo(x+dir.x/d*29,y+dir.y/d*29);ctx.stroke();}}
function drawAim(){if(scene!=='playing'||world.player.held===null)return;
  const {x,y}=world.player;const dx=aim.x-x,dy=aim.y-y,len=Math.hypot(dx,dy)||1;const nx=dx/len,ny=dy/len;
  ctx.save();ctx.strokeStyle='#075c609c';ctx.lineWidth=4;ctx.setLineDash([10,9]);ctx.beginPath();ctx.moveTo(x+nx*36,y+ny*36);ctx.lineTo(x+nx*Math.min(260,len),y+ny*Math.min(260,len));ctx.stroke();ctx.setLineDash([]);
  const d=90+power*165;const px=x+nx*d,py=y+ny*d;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-nx*13-ny*9,py-ny*13+nx*9);ctx.lineTo(px-nx*13+ny*9,py-ny*13-nx*9);ctx.closePath();ctx.fillStyle='#0f7073';ctx.fill();text(world.mode==='arcade'?'지금!':'힘 '+Math.round(power*100)+'%',px,py-22,14,'#075c60');ctx.restore();}
function drawCrates(){if(world.mode!=='arcade')return;
  for(const c of world.crates){ctx.save();ctx.translate(c.x,c.y);roundrect(-25,-25,50,50,6,'#c9945c','#754d34',4);
    ctx.strokeStyle='#f5d08b';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-19,-19);ctx.lineTo(19,19);ctx.moveTo(19,-19);ctx.lineTo(-19,19);ctx.stroke();
    text('?',0,-1,24,'#654129');ctx.restore();}
}
function drawWarnings(t){if(world.mode!=='arcade')return;
  for(const w of world.spawnWarnings){const pulse=reduceMotion?0:Math.sin(t*16)*3;
    circle(w.x,w.y,28+pulse,'#ffdba299','#c4546b',4);text('!',w.x,w.y,25,'#a83e59');
    text('곧 등장',w.x,w.y-41,14,'#a34662');}
}
function drawBots(t){for(const b of world.bots){ctx.save();ctx.translate(b.x,b.y);
  if(b.knock>0){ctx.rotate(.6);circle(3,5,b.r+6,'#0002');circle(0,0,b.r,'#e6b9d2','#a15d80',3);text('×',0,0,26,'#793a64');}
  else {circle(3,5,b.r+5,'#0002');circle(0,0,b.r,'#e0a0c1','#994878',3);circle(-6,-4,3,'#412f5b');circle(6,-4,3,'#412f5b');ctx.strokeStyle='#793a64';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,3,7,0,Math.PI);ctx.stroke();}
  ctx.restore();}
}
function drawParticles(){for(const p of world.particles){ctx.globalAlpha=Math.max(0,p.life/p.max);circle(p.x,p.y,3.5,p.color);}ctx.globalAlpha=1;}
function drawAnnotations(){if(world.mode==='campaign'){
    const goals=world.goals.filter(g=>!g.active);if(goals.length){const g=goals[0];text(`목표 ${world.goals.filter(x=>x.active).length+1}/${world.goals.length}`,g.x,g.y-47,12,'#7a4545');}
  }
  if(world.player.held===null){const near=world.items.filter(i=>!i.held&&Math.hypot(i.x-world.player.x,i.y-world.player.y)<92).sort((a,b)=>Math.hypot(a.x-world.player.x,a.y-world.player.y)-Math.hypot(b.x-world.player.x,b.y-world.player.y))[0];if(near){text('집기!',near.x,near.y-34,13,'#216e72');}}
}
function render(t){ctx.clearRect(0,0,W,H);drawFloor(t);drawMachines(t);drawBarriers();drawBumpers(t);drawGoals(t);
  for(const item of world.items)if(!item.held)drawItem(item,t);
  drawCrates();drawWarnings(t);drawBots(t);drawAim();drawPlayer(t);for(const item of world.items)if(item.held)drawItem(item,t);drawParticles();drawAnnotations();}
function frame(timestamp){requestAnimationFrame(frame);const dt=Math.min((timestamp-last)/1000||0,0.06);last=timestamp;
  if(scene==='playing'){acc+=dt;let iterations=0;
    let dx=stick.dx+(keys.has('arrowleft')||keys.has('a')?-1:0)+(keys.has('arrowright')||keys.has('d')?1:0);
    let dy=stick.dy+(keys.has('arrowup')||keys.has('w')?-1:0)+(keys.has('arrowdown')||keys.has('s')?1:0);
    while(acc>=FIXED_DT && iterations++<4){if(world.mode==='arcade'){aimAngle+=Math.PI/2*FIXED_DT;aim={x:world.player.x+Math.cos(aimAngle)*400,y:world.player.y+Math.sin(aimAngle)*400};}stepWorld(world,{dx,dy},FIXED_DT);acc-=FIXED_DT;processEvents();if(scene!=='playing'){acc=0;break;}}
    uiClock+=dt;if(uiClock>.12){uiClock=0;syncUi();}
  }else acc=0;
  render(timestamp/1000);if(ui.toast.classList.contains('visible')&&timestamp>toastUntil)ui.toast.classList.remove('visible');}
function pointerWorld(e){const rect=canvas.getBoundingClientRect();return{x:(e.clientX-rect.left)/rect.width*W,y:(e.clientY-rect.top)/rect.height*H};}
// Aim on pointer down, release to throw: prevents accidental firing on mobile
// and lets learners adjust the arrow while keeping a finger on the arena.
let aimingPointer=null;
canvas.addEventListener('pointerdown',e=>{
  if(scene!=='playing')return;
  e.preventDefault();if(world.mode==='arcade'){tryAction();return;}const p=pointerWorld(e);aim=p;
  if(world.player.held!==null){aimingPointer=e.pointerId;canvas.setPointerCapture(e.pointerId);return;}
  const near=world.items.find(i=>!i.held&&Math.hypot(i.x-p.x,i.y-p.y)<i.r+12&&Math.hypot(i.x-world.player.x,i.y-world.player.y)<92);
  if(near)tryPickup();else if(e.pointerType==='mouse')toast('먼저 물건을 집어 보자!');
});
canvas.addEventListener('pointermove',e=>{if(scene==='playing'&&world.mode!=='arcade'&&(e.pointerType==='mouse'||e.pointerId===aimingPointer))aim=pointerWorld(e);});
canvas.addEventListener('pointerup',e=>{if(e.pointerId!==aimingPointer)return;aim=pointerWorld(e);aimingPointer=null;tryThrow();});
canvas.addEventListener('pointercancel',e=>{if(e.pointerId===aimingPointer)aimingPointer=null;});
$('pickup-btn').addEventListener('click',tryAction);$('throw-btn').addEventListener('click',tryThrow);$('drop-btn').addEventListener('click',()=>{if(drop(world)){beep(350);syncUi();}});
$('hint-btn').addEventListener('click',()=>{if(scene!=='playing')return;const remaining=world.goals.filter(g=>!g.active);
  if(world.gates.some(g=>!g.open)){toast(world.dominos.length?'첫 도미노를 움직여 마지막 도미노까지 반응시키자.':`압력판에 올릴 물건의 질량을 살펴봐!`);}
  else if(remaining.some(g=>g.requiredBounces)){toast('스위치까지 곧바로 던지지 말고 벽이나 범퍼에 먼저 맞혀 봐.');}
  else toast(world.stage.tip);});
$('restart-btn').addEventListener('click',()=>{world.mode==='arcade'?beginArcade():beginStage(world.stage.id);});
$('home-btn').addEventListener('click',()=>showMenu());$('close-overlay').addEventListener('click',()=>{if(scene==='paused'||scene==='menu'&&world.status==='playing')resume();else if(scene==='result')showMenu();else showMenu();});
$('sound-btn').addEventListener('click',()=>{muted=!muted;$('sound-btn').textContent=muted?'♪̸':'♫';$('sound-btn').setAttribute('aria-label',muted?'소리 켜기':'소리 끄기');});
ui.power.addEventListener('input',()=>{power=Number(ui.power.value)/100;ui.powerValue.textContent=`${ui.power.value}%`;});
window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key)&&scene==='playing')e.preventDefault();if(e.repeat&&[' ','e','enter','q','escape'].includes(key))return;
  keys.add(key);if(scene==='playing'){if(key===' ')tryAction();else if(key==='e')tryPickup();if(key==='enter')tryThrow();if(key==='q'){drop(world);syncUi();}if(key==='escape')pause();}
  else if(scene==='paused'&&key==='escape')resume();else if(scene==='menu'&&key==='escape'&&world.status==='playing')resume();});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();stick.dx=stick.dy=0;if(scene==='playing')pause();});
const stickElement=$('stick'),stickKnob=$('stick-knob');
function moveStick(e){const rect=stickElement.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2,dx=e.clientX-cx,dy=e.clientY-cy,d=Math.max(1,Math.hypot(dx,dy)),lim=rect.width*.33;stick.dx=dx/Math.max(d,lim);stick.dy=dy/Math.max(d,lim);stickKnob.style.transform=`translate(${stick.dx*lim}px,${stick.dy*lim}px)`;}
stickElement.addEventListener('pointerdown',e=>{if(scene!=='playing')return;e.preventDefault();stick.active=true;stick.pointer=e.pointerId;stickElement.setPointerCapture(e.pointerId);moveStick(e);});
stickElement.addEventListener('pointermove',e=>{if(stick.active&&e.pointerId===stick.pointer)moveStick(e);});
function stopStick(e){if(e.pointerId!==stick.pointer)return;stick.active=false;stick.dx=stick.dy=0;stickKnob.style.transform='translate(0px,0px)';}
stickElement.addEventListener('pointerup',stopStick);stickElement.addEventListener('pointercancel',stopStick);
// SDK-driven pause/resume: do not progress physics while the iframe is paused.
try{window.KidscadeGame?.registerPauseHandlers?.({pause:()=>{if(scene==='playing')pause();},resume:()=>{if(scene==='paused')resume();}});}catch{}
showMenu(true);syncUi();requestAnimationFrame(frame);
