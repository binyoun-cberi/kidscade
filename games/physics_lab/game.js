import {W,H,FIXED_DT,ZONES,ITEMS,SURFACES,STAGES,createWorld,stepWorld,pickup,drop,throwItem,surfaceAt,medal,getStage} from './sim.mjs';
const $=id=>document.getElementById(id);
const canvas=$('arena'),ctx=canvas.getContext('2d');
const ui={overlay:$('overlay'),title:$('overlay-title'),description:$('overlay-description'),content:$('overlay-content'),actions:$('overlay-actions'),
  mission:$('mission'),chapter:$('chapter-label'),goals:$('goal-count'),shots:$('shots'),score:$('score'),
  concept:$('concept'),tip:$('tip'),surface:$('surface-label'),heldName:$('held-name'),heldDescription:$('held-description'),heldIcon:$('held-icon'),
  progress:$('progress-label'),progressFill:$('progress-fill'),toast:$('toast'),power:$('power'),powerValue:$('power-value')};
const experimentLog=$('experiment-log');
const ICONS={tennis:'●',ball:'●',wood:'▣',metal:'●',cube:'◆'};
const savedKey='kidscade.physics_lab.progress.v1';
function loadProgress(){try{const o=JSON.parse(localStorage.getItem(savedKey)||'null');return {unlocked:Math.max(1,Math.min(24,Number(o?.unlocked)||1)),medals:typeof o?.medals==='object'&&o.medals?o.medals:{}};}catch{return {unlocked:1,medals:{}};}}
let progress=loadProgress();
function saveProgress(){try{localStorage.setItem(savedKey,JSON.stringify(progress));}catch{}}
let world=createWorld(1),scene='menu',last=0,acc=0,aim={x:800,y:300},power=.85,muted=false,toastUntil=0,zoneSelected=0,reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const keys=new Set(),stick={active:false,pointer:null,dx:0,dy:0};
let lastSound=0,ac=null,uiClock=0;
function beep(freq=420,duration=.09,kind='triangle',volume=.045){if(muted||Date.now()-lastSound<35)return;lastSound=Date.now();try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();const osc=ac.createOscillator(),gain=ac.createGain();osc.type=kind;osc.frequency.setValueAtTime(freq,ac.currentTime);gain.gain.setValueAtTime(volume,ac.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ac.currentTime+duration);osc.connect(gain);gain.connect(ac.destination);osc.start();osc.stop(ac.currentTime+duration);}catch{}}
function toast(text){ui.toast.textContent=text;ui.toast.classList.add('visible');toastUntil=performance.now()+2100;}
function setOverlay(show){ui.overlay.hidden=!show;}
function button(label,callback,secondary=false){const b=document.createElement('button');b.type='button';b.textContent=label;if(secondary)b.className='secondary';b.addEventListener('click',callback);ui.actions.append(b);return b;}
function sdkStart(mode){try{window.KidscadeGame?.start?.({mode});}catch{}}
function sdkResult(outcome){try{window.KidscadeGame?.score?.(world.score);window.KidscadeGame?.result?.({scope:world.mode==='arcade'?'run':'stage',status:'completed',outcome,score:world.score,stage:world.mode==='arcade'?'arcade':world.stage.id,shots:world.shots,medal:medal(world),concept:world.stage.concept});}catch{}}
function clearModal(){ui.content.replaceChildren();ui.actions.replaceChildren();}
function showMenu(initial=false){scene='menu';setOverlay(true);clearModal();ui.title.textContent='와르르! 물리 연구소';ui.description.textContent='움직이고 · 집고 · 던지고 · 발견하는 2D 과학 액션!';
  const intro=document.createElement('div');intro.className='lesson-note';intro.textContent='길을 움직이며 물건을 집어 들고, 목표를 향해 던져 봐. 물건마다 무게와 튀어 오르는 정도가 다르단다.';ui.content.append(intro);
  const zones=document.createElement('div');zones.className='zones';zones.style.marginTop='14px';
  ZONES.forEach((zone,i)=>{const card=document.createElement('button');card.className='zone-card'+(zoneSelected===i?' selected':'');card.innerHTML=`<b>${i+1}구역</b><strong>${zone.name}</strong><span>${zone.concept} · ${Math.max(0,Math.min(6,progress.unlocked-1-i*6))}/6 완료</span>`;
    card.addEventListener('click',()=>{zoneSelected=i;showMenu();});zones.append(card);});ui.content.append(zones);
  const grid=document.createElement('div');grid.className='stage-grid';
  STAGES.slice(zoneSelected*6,zoneSelected*6+6).forEach(s=>{const b=document.createElement('button');b.disabled=s.id>progress.unlocked;b.className=s.id===world.stage.id?'selected':'';
    b.innerHTML=`<b>${s.id}</b>${s.id>progress.unlocked?'잠김':('★'.repeat(progress.medals[s.id]||0)||'도전')}`;
    b.title=s.title;b.addEventListener('click',()=>beginStage(s.id));grid.append(b);});ui.content.append(grid);
  button('이어하기 · '+getStage(progress.unlocked).title,()=>beginStage(progress.unlocked));
  button('와르르 챌린지',beginArcade,true);
  if(!initial)button('돌아가기',()=>{if(world.status==='playing')resume();else beginStage(world.stage.id);},true);
}
function beginStage(id){world=createWorld(id,'campaign');scene='playing';setOverlay(false);keys.clear();stick.dx=stick.dy=0;aim={x:780,y:world.goals[0]?.y||300};acc=0;syncUi();sdkStart('campaign');toast(`${world.stage.id}단계 · ${world.stage.title}`);}
function beginArcade(){world=createWorld(1,'arcade');scene='playing';setOverlay(false);keys.clear();stick.dx=stick.dy=0;aim={x:800,y:300};acc=0;syncUi();sdkStart('arcade');toast('무한 도전! 다가오는 장난감 로봇을 밀어내자!');}
function showResult(won){syncUi();scene='result';setOverlay(true);clearModal();ui.title.textContent=won?'실험 성공!':'연구소 방어 종료';ui.description.textContent=won?'여러 번 시도하면서 원리를 발견했어!':'새로운 방법으로 다시 도전해 봐.';
  const d=document.createElement('div');d.className='results';
  const star=document.createElement('div');star.className='stars';star.textContent=won?'★'.repeat(medal(world))+'☆'.repeat(3-medal(world)):'⚙';d.append(star);
  const h=document.createElement('h3');h.textContent=world.mode==='arcade'?`${world.score.toLocaleString()}점 기록!`:`${world.stage.title} · ${world.score.toLocaleString()}점`;d.append(h);
  const p=document.createElement('p');p.textContent=world.mode==='arcade'?`로봇 ${world.hits}대 · 최고 콤보 ${world.maxCombo}회`:`물건 ${world.shots}번 던지기 · 스위치 ${world.hits}개 작동`;d.append(p);
  if(world.mode==='campaign'){const lesson=document.createElement('div');lesson.className='lesson-note';lesson.textContent=`오늘의 발견 · ${ZONES[world.stage.zone].concept} — ${world.stage.tip}`;d.append(lesson);}
  ui.content.append(d);button('다시 도전',()=>world.mode==='arcade'?beginArcade():beginStage(world.stage.id));
  if(won&&world.mode==='campaign'&&world.stage.id<STAGES.length)button('다음 실험으로',()=>beginStage(world.stage.id+1));
  button('단계 선택',()=>{zoneSelected=world.mode==='arcade'?0:world.stage.zone;showMenu();},true);
  sdkResult(won?'clear':'loss');
}
function pause(){if(scene!=='playing')return;scene='paused';setOverlay(true);clearModal();ui.title.textContent='잠깐 쉬는 시간';ui.description.textContent='진행 중인 실험은 그대로 남아 있어.';button('이어서 하기',resume);button('처음부터',()=>world.mode==='arcade'?beginArcade():beginStage(world.stage.id),true);button('구역 선택',()=>showMenu(),true);}
function resume(){scene='playing';setOverlay(false);last=performance.now();acc=0;}
function tryPickup(){if(scene!=='playing')return;if(pickup(world)){beep(580);syncUi();}else toast(world.player.held===null?'물건 가까이에서 집어 봐!':'이미 물건을 들고 있어.');}
function tryThrow(){if(scene!=='playing')return;if(throwItem(world,aim.x,aim.y,power)){beep(250,.12,'sawtooth');syncUi();}else toast('먼저 물건을 집어 보자!');}
function syncUi(){ui.mission.textContent=world.mode==='arcade'?'와르르 챌린지 · 로봇을 막아라':`${world.stage.id}단계 · ${world.stage.title}`;
  ui.chapter.textContent=world.mode==='arcade'?'무한 액션 도전':`${world.stage.zone+1}구역 · ${ZONES[world.stage.zone].concept}`;
  ui.goals.textContent=world.mode==='arcade'?`남은 생명 ${'♥'.repeat(Math.max(0,world.hearts))}`:`스위치 ${world.goals.filter(x=>x.active).length} / ${world.goals.length}`;
  ui.shots.textContent=`투척 ${world.shots}회`;ui.score.textContent=`${world.score.toLocaleString()}점`;
  ui.concept.textContent=world.mode==='arcade'?'연쇄 반응':ZONES[world.stage.zone].concept;
  ui.tip.textContent=world.stage.tip;
  ui.surface.textContent=`현재 바닥: ${SURFACES[surfaceAt(world,world.player.x,world.player.y)].label}`;
  const item=world.items.find(it=>it.id===world.player.held);
  ui.heldName.textContent=item?ITEMS[item.type].name:'없음';ui.heldIcon.textContent=item?ICONS[item.type]:'◯';
  ui.heldDescription.textContent=item?`질량 ${ITEMS[item.type].mass} · 튕김 ${Math.round(ITEMS[item.type].restitution*100)}%`:'물건 가까이에서 집기를 눌러.';
  ui.progress.textContent=`${Math.min(progress.unlocked,24)} / 24`;ui.progressFill.style.width=`${(progress.unlocked-1)/23*100}%`;
  experimentLog.textContent=world.experiments.length?world.experiments.slice(-2).map(e=>`${ITEMS[e.type].name} · ${SURFACES[e.surface].label} · 힘 ${Math.round(e.power*100)}% → ${e.distance} 걸음`).join(' / '):'실험한 물건의 이동 거리가 여기에 기록돼요.';
}
function processEvents(){for(const event of world.events){switch(event.type){case'goal':toast(`스위치 작동! +${event.score}점${event.combo>1?` · ${event.combo}콤보`:''}`);beep(770,.16,'triangle');break;
  case'bot-hit':toast(`로봇 밀어내기 +${event.points}점!`);beep(620,.1);break;
  case'hurt':toast(`로봇이 도착했어! 생명 ${event.hearts}개 남음`);beep(180,.22,'sawtooth');break;
  case'restock':toast('새 물건이 도착했어!');break;
  case'experiment':syncUi();break;
  case'bounce':beep(360,.055);break;
  case'won':if(world.stage.id>=progress.unlocked)progress.unlocked=Math.min(24,world.stage.id+1);progress.medals[world.stage.id]=Math.max(progress.medals[world.stage.id]||0,medal(world));saveProgress();showResult(true);break;
  case'lost':showResult(false);break;
 }}world.events.length=0;}
function roundrect(x,y,w,h,r,fill,stroke,line=2){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}}
function text(str,x,y,size=15,color='#305a54',align='center',bold=true){ctx.font=`${bold?800:500} ${size}px system-ui,sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(str,x,y);}
function circle(x,y,r,color,stroke=null,sw=2){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=sw;ctx.stroke();}}
function drawFloor(time){const zone=world.mode==='arcade'?0:world.stage.zone,colors=['#e8ebd2','#e2eff2','#f2e7d3','#efe1e9'];ctx.fillStyle=colors[zone];ctx.fillRect(0,0,W,H);
  ctx.save();ctx.strokeStyle='#517c7524';ctx.lineWidth=1;for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}ctx.restore();
  roundrect(28,52,904,518,21,'#c4c4aa','#426d68',6);roundrect(36,60,888,502,17,'#ebe6cc','#a8c6b1',2);
  for(const s of world.stage.surfaces){const c=SURFACES[s.type].color;roundrect(s.x,s.y,s.w,s.h,14,c,'#729f99',2);ctx.save();ctx.globalAlpha=.3;ctx.strokeStyle='#fff';ctx.lineWidth=4;
    for(let v=-s.h;v<s.w+s.h;v+=54){ctx.beginPath();ctx.moveTo(s.x+Math.max(0,v),s.y+Math.max(0,-v));ctx.lineTo(s.x+Math.min(s.w,v+s.h),s.y+Math.min(s.h,s.h+v));ctx.stroke();}ctx.restore();}
  for(let i=0;i<9;i++){roundrect(48+i*99,62,10,10,3,'#a2bdad');roundrect(48+i*99,552,10,7,2,'#a2bdad');}
  roundrect(74,187,188,227,21,'#bfd4b4','#749c88',3);text('물건 보관 구역',168,203,14,'#35635b');
  for(let i=0;i<5;i++)circle(75+i*37,94,3,'#adc2af');
  text(world.mode==='arcade'?'로봇 진입 방향 →':'스위치 목표 →',750,80,16,'#618c82');
  if(world.mode==='arcade'){roundrect(150,95,10,410,4,'#d6a3a1');text('방어선',157,85,12,'#a95451');}
}
function drawBarriers(){for(const b of world.barriers){roundrect(b.x+4,b.y+6,b.w,b.h,6,'#6576745d');roundrect(b.x,b.y,b.w,b.h,5,'#8c9995','#596d69',4);for(let y=b.y+10;y<b.y+b.h-8;y+=26){ctx.fillStyle='#ffdd81';ctx.fillRect(b.x+4,y,b.w-8,7);}}}
function drawBumpers(t){for(const b of world.bumpers){circle(b.x+3,b.y+5,b.r+6,'#0000001f');circle(b.x,b.y,b.r+6,'#6b518a');circle(b.x,b.y,b.r+2,'#c0a1e8','#fff',3);circle(b.x,b.y,b.r*.6,`rgba(248,240,255,${.45+Math.sin(t*3+b.x)*.14})`);text('✦',b.x,b.y+1,24,'#8158b1');}}
function drawGoals(t){for(const g of world.goals){ctx.save();ctx.translate(g.x,g.y);const breathe=reduceMotion?0:Math.sin(t*4+g.id)*2;
    circle(3,5,32,'#00000022');circle(0,0,30+breathe,g.active?'#53c3a6':'#c3595c','#ffffff',3);
    circle(0,0,21,g.active?'#b4ffdf':'#ffbfb8',g.active?'#2c9068':'#8b3537',4);
    text(g.active?'✓':'!',0,1,22,g.active?'#18784c':'#ba3a39');if(g.pulse>0){circle(0,0,30+(1-g.pulse/.6)*30,'#ffffff00','#8bdfa3',4);}ctx.restore();}}
function drawItem(item,t){const data=ITEMS[item.type],x=item.x,y=item.y;circle(x+3,y+5,item.r+2,'#224a4d33');ctx.save();ctx.translate(x,y);
  if(item.type==='wood'||item.type==='cube'){ctx.rotate(.08*Math.sin(t*2+item.id));roundrect(-item.r,-item.r,item.r*2,item.r*2,4,data.color,data.outline,3);ctx.strokeStyle=data.outline;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-item.r+6,-item.r+7);ctx.lineTo(item.r-6,item.r-7);ctx.stroke();}
  else{circle(0,0,item.r,data.color,data.outline,3);circle(-item.r*.28,-item.r*.32,item.r*.32,'#ffffff88');if(item.type==='metal'){ctx.strokeStyle='#ffffffa9';ctx.lineWidth=3;ctx.beginPath();ctx.arc(1,0,item.r*.67,-.9,.9);ctx.stroke();}else{ctx.strokeStyle=data.outline;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,item.r*.66,-.8,.7);ctx.stroke();}}
  ctx.restore();}
function drawPlayer(t){const {x,y,r,held}=world.player;circle(x+4,y+7,25,'#183c3d3c');circle(x,y+2,22,'#174c62');circle(x,y-2,19,'#51b4ae','#1e7074',3);
  circle(x-6,y-5,2.7,'#114650');circle(x+6,y-5,2.7,'#114650');ctx.strokeStyle='#114650';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y-1,5,0,Math.PI);ctx.stroke();
  roundrect(x-14,y-22,28,9,5,'#ffd76c','#b78d42',2);
  if(held!==null){const dir={x:aim.x-x,y:aim.y-y},d=Math.hypot(dir.x,dir.y)||1;ctx.strokeStyle='#20817a';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x+dir.x/d*15,y+dir.y/d*15);ctx.lineTo(x+dir.x/d*29,y+dir.y/d*29);ctx.stroke();}}
function drawAim(){if(scene!=='playing'||world.player.held===null)return;
  const {x,y}=world.player;const dx=aim.x-x,dy=aim.y-y,len=Math.hypot(dx,dy)||1;const nx=dx/len,ny=dy/len;
  ctx.save();ctx.strokeStyle='#075c609c';ctx.lineWidth=4;ctx.setLineDash([10,9]);ctx.beginPath();ctx.moveTo(x+nx*36,y+ny*36);ctx.lineTo(x+nx*Math.min(260,len),y+ny*Math.min(260,len));ctx.stroke();ctx.setLineDash([]);
  const d=170;const px=x+nx*d,py=y+ny*d;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-nx*13-ny*9,py-ny*13+nx*9);ctx.lineTo(px-nx*13+ny*9,py-ny*13-nx*9);ctx.closePath();ctx.fillStyle='#0f7073';ctx.fill();ctx.restore();}
function drawBots(t){for(const b of world.bots){circle(b.x+3,b.y+5,b.r+3,'#0003');circle(b.x,b.y,b.r,'#e5a0b3','#b25271',4);roundrect(b.x-13,b.y-8,26,13,5,'#512f53');circle(b.x-7,b.y-2,3,'#8fecec');circle(b.x+7,b.y-2,3,'#8fecec');ctx.strokeStyle='#974e68';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(b.x-10,b.y-19);ctx.lineTo(b.x-14,b.y-27);ctx.moveTo(b.x+10,b.y-19);ctx.lineTo(b.x+14,b.y-27);ctx.stroke();}}
function drawParticles(){for(const p of world.particles){ctx.globalAlpha=Math.max(0,p.life/p.max);circle(p.x,p.y,3.5,p.color);}ctx.globalAlpha=1;}
function drawAnnotations(){if(world.mode==='campaign'){
    const goals=world.goals.filter(g=>!g.active);if(goals.length){const g=goals[0];text(`목표 ${world.goals.filter(x=>x.active).length+1}/${world.goals.length}`,g.x,g.y-47,12,'#7a4545');}
  }
  if(world.player.held===null){const near=world.items.filter(i=>!i.held&&Math.hypot(i.x-world.player.x,i.y-world.player.y)<92).sort((a,b)=>Math.hypot(a.x-world.player.x,a.y-world.player.y)-Math.hypot(b.x-world.player.x,b.y-world.player.y))[0];if(near){text('집기!',near.x,near.y-34,13,'#216e72');}}
}
function render(t){ctx.clearRect(0,0,W,H);drawFloor(t);drawBarriers();drawBumpers(t);drawGoals(t);
  for(const item of world.items)if(!item.held)drawItem(item,t);
  drawBots(t);drawAim();drawPlayer(t);for(const item of world.items)if(item.held)drawItem(item,t);drawParticles();drawAnnotations();}
function frame(timestamp){requestAnimationFrame(frame);const dt=Math.min((timestamp-last)/1000||0,0.06);last=timestamp;
  if(scene==='playing'){acc+=dt;let iterations=0;
    let dx=stick.dx+(keys.has('arrowleft')||keys.has('a')?-1:0)+(keys.has('arrowright')||keys.has('d')?1:0);
    let dy=stick.dy+(keys.has('arrowup')||keys.has('w')?-1:0)+(keys.has('arrowdown')||keys.has('s')?1:0);
    while(acc>=FIXED_DT && iterations++<4){stepWorld(world,{dx,dy},FIXED_DT);acc-=FIXED_DT;processEvents();if(scene!=='playing'){acc=0;break;}}
    uiClock+=dt;if(uiClock>.12){uiClock=0;syncUi();}
  }else acc=0;
  render(timestamp/1000);if(ui.toast.classList.contains('visible')&&timestamp>toastUntil)ui.toast.classList.remove('visible');}
function pointerWorld(e){const rect=canvas.getBoundingClientRect();return{x:(e.clientX-rect.left)/rect.width*W,y:(e.clientY-rect.top)/rect.height*H};}
canvas.addEventListener('pointermove',e=>{if(scene==='playing'){aim=pointerWorld(e);}});
canvas.addEventListener('pointerdown',e=>{if(scene!=='playing')return;const p=pointerWorld(e);aim=p;
  // On touch, the on-screen stick is used for movement; touching the scene points and throws.
  if(world.player.held!==null){tryThrow();return;}
  const near=world.items.find(i=>!i.held&&Math.hypot(i.x-p.x,i.y-p.y)<i.r+12&&Math.hypot(i.x-world.player.x,i.y-world.player.y)<92);
  if(near)tryPickup();else if(e.pointerType==='mouse')toast('먼저 물건을 집어 보자!');});
$('pickup-btn').addEventListener('click',tryPickup);$('throw-btn').addEventListener('click',tryThrow);$('drop-btn').addEventListener('click',()=>{if(drop(world)){beep(350);syncUi();}});
$('restart-btn').addEventListener('click',()=>{world.mode==='arcade'?beginArcade():beginStage(world.stage.id);});
$('home-btn').addEventListener('click',()=>showMenu());$('close-overlay').addEventListener('click',()=>{if(scene==='paused'||scene==='menu'&&world.status==='playing')resume();else if(scene==='result')showMenu();else showMenu();});
$('sound-btn').addEventListener('click',()=>{muted=!muted;$('sound-btn').textContent=muted?'♪̸':'♫';$('sound-btn').setAttribute('aria-label',muted?'소리 켜기':'소리 끄기');});
ui.power.addEventListener('input',()=>{power=Number(ui.power.value)/100;ui.powerValue.textContent=`${ui.power.value}%`;});
window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key)&&scene==='playing')e.preventDefault();if(e.repeat&&[' ','e','enter','q','escape'].includes(key))return;
  keys.add(key);if(scene==='playing'){if(key===' '||key==='e')tryPickup();if(key==='enter')tryThrow();if(key==='q'){drop(world);syncUi();}if(key==='escape')pause();}
  else if(scene==='paused'&&key==='escape')resume();else if(scene==='menu'&&key==='escape'&&world.status==='playing')resume();});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();stick.dx=stick.dy=0;if(scene==='playing')pause();});
const stickElement=$('stick'),stickKnob=$('stick-knob');
function moveStick(e){const rect=stickElement.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2,dx=e.clientX-cx,dy=e.clientY-cy,d=Math.max(1,Math.hypot(dx,dy)),lim=rect.width*.33;stick.dx=dx/Math.max(d,lim);stick.dy=dy/Math.max(d,lim);stickKnob.style.transform=`translate(${stick.dx*lim}px,${stick.dy*lim}px)`;}
stickElement.addEventListener('pointerdown',e=>{if(scene!=='playing')return;e.preventDefault();stick.active=true;stick.pointer=e.pointerId;stickElement.setPointerCapture(e.pointerId);moveStick(e);});
stickElement.addEventListener('pointermove',e=>{if(stick.active&&e.pointerId===stick.pointer)moveStick(e);});
function stopStick(e){if(e.pointerId!==stick.pointer)return;stick.active=false;stick.dx=stick.dy=0;stickKnob.style.transform='translate(0px,0px)';}
stickElement.addEventListener('pointerup',stopStick);stickElement.addEventListener('pointercancel',stopStick);
// SDK-driven pause/resume: do not progress physics while the iframe is paused.
try{window.KidscadeGame?.onPauseChange?.(paused=>paused?pause():resume());}catch{}
showMenu(true);syncUi();requestAnimationFrame(frame);