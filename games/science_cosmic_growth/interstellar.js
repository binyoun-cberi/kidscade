import {SAVE_KEY,UPGRADES,fresh,sanitize,level,cost,buy,stats,bodyStats,sizeFor,format,FOCUSES,SPECIALS,refund,breakSeconds,tierFor} from './interstellar-core.mjs';
const $=id=>document.getElementById(id),canvas=$('universe'),ctx=canvas.getContext('2d');
let state;try{state=sanitize(JSON.parse(localStorage.getItem(SAVE_KEY)))}catch{state=fresh()}
state.reduced=state.reduced||matchMedia('(prefers-reduced-motion: reduce)').matches;
let w=innerWidth,h=innerHeight,phase='welcome',time=20,elapsed=0,last=performance.now(),hitClock=0,spawnClock=0,saveClock=0,earned=0,destroyed=0,selected=null,moonTimers=[],rainbow=0,noticeTimer=0,shake=0,audio;
let bodies=[],fx=[],dust=[],nextId=0;
let charge=0,pulse=0,overloadCooldown=0,warp=0,wormhole=0,eventStage=0,finale=0,justCleared=false,touch=false,impactTier=0;
const lowPower=matchMedia('(pointer: coarse)').matches;

const pointer={x:w/2,y:h/2,active:false},l=id=>level(state,id),colors={rock:'#a3a3e6',planet:'#f69b79',star:'#ffdd8a',gold:'#f5cb56',lightning:'#6cdff7',moon:'#dfebff',comet:'#dd9bff',laser:'#ff88b2',nova:'#f6b7ff'};
const positions=[[0,2],[1,1],[1,3],[2,0],[2,3],[3,3],[1,2],[2,2],[3,2],[4,2],[5,2],[2,4],[3,4],[2,1],[3,1],[4,1],[2,5],[3,5],[4,5],[5,5],[4,3],[6,2],[7,2],[8,2],[8,3],[3,0],[4,0]];
function save(){try{if(window.KidscadeStorage)window.KidscadeStorage.setJson(SAVE_KEY,state);else localStorage.setItem(SAVE_KEY,JSON.stringify(state))}catch{notice('저장 공간이 부족해 진행을 저장하지 못했어요')}}
function notice(text){$('notice').textContent=text;$('notice').style.opacity=1;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').style.opacity=0,2600)}
function sound(freq=400,type='sine'){if(!state.sound)return;try{audio??=new AudioContext();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(40,freq*.4),audio.currentTime+.1);g.gain.setValueAtTime(.025,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.12);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.13)}catch{}}
function resize(){w=innerWidth;h=innerHeight;const d=Math.min(devicePixelRatio||1,2);canvas.width=w*d;canvas.height=h*d;ctx.setTransform(d,0,0,d,0,0);for(const b of bodies){b.x=Math.min(w-20,Math.max(20,b.x));b.y=Math.min(h-35,Math.max(160,b.y))}dust=Array.from({length:90},()=>({x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.4+.3}))}
addEventListener('resize',resize);resize();
function show(id){phase=id;document.body.classList.remove('playing');for(const k of ['welcome','summary','tree','paused'])$(k).hidden=k!==id;$('pause').disabled=id!=='paused';if(id==='tree')renderTree();if(id==='welcome'){$('start').textContent=state.rounds?'세션 '+(state.rounds+1)+' 시작':'첫 번째 세션 시작';$('quickLabel').hidden=!state.cleared;$('quick').checked=state.quick}}
function spawn(){let tier=tierFor(state,Math.random());let type=['rock','planet','star'][tier];const roll=Math.random();let cumulative=0;for(const [kind,chance] of [['nova',.015*l('nova')],['laser',.02*l('laser')],['comet',.008*l('comet')],['moon',.015*l('moon')],['lightning',.03*l('lightning')],['gold',.02*l('gold')]]){cumulative+=chance;if(roll<cumulative){type=kind;break}}
 if(type==='moon'||type==='comet')tier=0;const base=bodyStats(state,tier),r=type==='moon'?9:10+tier*10+Math.random()*7;
 // Fragile rubble keeps chain starters available even after aggressive mass research.
 const fragile=tier===0&&type==='rock'&&Math.random()<.3;if(fragile){base.hp=1;base.value=1}
 return {id:nextId++,x:30+Math.random()*Math.max(1,w-60),y:165+Math.random()*Math.max(1,h-215),vx:(Math.random()-.5)*12,vy:(Math.random()-.5)*12,r:fragile?8:r,tier,type,hp:base.hp,max:base.hp,value:base.value,angle:Math.random()*7,fragile,dead:false};}
function begin(){earned=0;destroyed=0;elapsed=0;charge=0;pulse=0;overloadCooldown=0;warp=0;wormhole=0;eventStage=0;finale=0;justCleared=false;pending=[];replacement=0;time=stats(state).duration;moonTimers=[];rainbow=0;hitClock=0;spawnClock=0;saveClock=0;fx=[];phase='play';pointer.active=false;bodies=Array.from({length:stats(state).count},spawn);introduceSpecials();seedRubble();document.body.classList.add('playing');$('pause').disabled=false;last=performance.now();window.KidscadeGame?.start?.({mode:'interstellar'});notice('쓸어서 파괴! 세션이 끝나면 에너지로 강화하세요');hud()}
function finish(){
 if(phase!=='play'&&phase!=='paused')return;
 if(destroyed>=12){state.money+=25;state.total+=25;earned+=25}
 state.rounds++;state.best=Math.max(state.best,earned);justCleared=!state.cleared&&sizeFor(state.total)>=20;
 if(justCleared){
  state.cleared=true;finale=2.8;phase='finale';document.body.classList.add('playing');$('pause').disabled=true;
  for(const b of bodies)feedFragments(b);bodies=[];
  notice('특이점 도달 · 마지막 빛이 사건의 지평선으로 사라집니다');
  sound(90,'sine');window.KidscadeGame?.achievement?.('science_cosmic_growth.interstellar_singularity');
 }else summary();
 save();
}
function summary(){
 $('summaryTitle').textContent=justCleared?'특이점 도달 · 빠른 모드 해금!':'우주를 삼켰어요';
 $('results').innerHTML=[['이번 수익',format(earned)],['파괴 천체',format(destroyed)],['최고 수익',format(state.best)],['블랙홀 크기',sizeFor(state.total)+' / 20']].map(([k,v])=>`<div><small>${k}</small><b>${v}</b></div>`).join('');
 $('roundAdvice').textContent=(destroyed>=12?'천체 12개 파괴 보너스 +25 포함. ':'다음에는 천체 12개를 부수면 보너스 +25! ')+(justCleared?'시작 화면에서 빠른 모드를 선택할 수 있어요.':!l('lightning')?'번개 연구로 연쇄 파괴를 시작해 보세요.':!l('moon')?'달 연구로 공격 범위와 속도를 키워 보세요.':'연구 무료 재배분으로 다른 성장 방향도 시도해 보세요.');
 show('summary');hud();
}
function introduceSpecials(){
 const unlocked=SPECIALS.filter(id=>l(id)&&!state.seen.includes(id));
 if(state.rounds<3)for(const id of ['lightning','moon'])if(!state.seen.includes(id)&&!unlocked.includes(id))unlocked.push(id);
 unlocked.forEach((type,i)=>{const b=bodies[i];if(!b)return;b.type=type;b.tier=0;b.hp=b.max=1;b.value=bodyStats(state,0).value;b.r=type==='moon'?12:19;b.intro=true;b.x=w*(.3+.4*(i%3)/2);b.y=Math.max(180,h*.58+Math.floor(i/3)*45)});
 if(unlocked.length)notice('빛나는 천체를 찾아보세요 · 새 능력 체험');
}
function seedRubble(){for(const b of bodies.slice(-6)){b.type='rock';b.tier=0;b.hp=b.max=b.value=1;b.fragile=true;b.r=8}}
function feedFragments(b){
 const count=state.reduced?1:Math.min(8,3+b.tier*2),life=state.reduced?.4:1.1+b.tier*.1;
 for(let i=0;i<count;i++)effect({kind:'feed',x:b.x,y:b.y,startX:b.x,startY:b.y,angle:Math.atan2(b.y-h*.54,b.x-w/2)+i*.09,radius:Math.hypot(b.x-w/2,b.y-h*.54),color:colors[b.type],tier:b.tier,life,max:life});
}
function updateEffects(dt){
 pulse=Math.max(0,pulse-dt*2);shake=Math.max(0,shake-dt*20);
 for(const e of fx){e.life-=dt;const t=1-Math.max(0,e.life/e.max);
  if(e.kind==='spark'){e.x+=e.vx*dt;e.y+=e.vy*dt}
  if(e.kind==='text')e.y-=dt*25;
  if(e.kind==='feed'){
   if(state.reduced){e.x=e.startX+(w/2-e.startX)*t;e.y=e.startY+(h*.54-e.startY)*t}
   else{const radius=e.radius*Math.pow(1-t,2)+(t<.15?Math.sin(t/.15*Math.PI)*12:0),a=e.angle+t*5;e.x=w/2+Math.cos(a)*radius;e.y=h*.54+Math.sin(a)*radius}
   if(t>.88&&!e.arrived){e.arrived=true;pulse=Math.min(1,pulse+.2+e.tier*.12)}
  }
 }
 fx=fx.filter(e=>e.life>0);
}
function accretionBurst(){
 charge=0;overloadCooldown=3;pulse=1;
 const power=stats(state,moonTimers.length,rainbow>0).damage*(state.focus==='burst'?12:6),radius=Math.min(w,h)*.38;
 effect({kind:'ring',x:w/2,y:h*.54,r:radius,color:'#a8f3e5',life:.65,max:.65});
 for(const b of bodies)if(!b.dead&&Math.hypot(b.x-w/2,b.y-h*.54)<radius+b.r)damage(b,power);
 specials();sound(100,'sine');notice('강착원반 폭주 · 중력 충격파');
}
function travelWormhole(){
 wormhole=2;
 bodies=Array.from({length:stats(state).count},()=>{const b=spawn();b.x=Math.max(b.r,Math.min(w-b.r,w*.5+(Math.random()-.5)*w*.65));b.y=Math.max(175+b.r,Math.min(h-40-b.r,h*.58+(Math.random()-.5)*h*.45));return b});
 introduceSpecials();seedRubble();notice('웜홀 통과 · 새로운 성역에 천체가 모입니다');
}
function pause(){if(phase!=='play')return;pointer.active=false;show('paused');save()}
function resume(){if(phase!=='paused')return;phase='play';document.body.classList.add('playing');$('pause').disabled=false;last=performance.now()}
function effect(e){if(fx.length<(state.reduced?65:lowPower?140:240))fx.push(e)}
function damage(b,amount,crit=false){if(b.dead)return;b.hp-=amount;b.hit=.18;if(b.hp>0){effect({kind:'text',x:b.x,y:b.y-10,text:crit?'CRIT':'−'+format(amount),color:crit?'#ffe49e':'#aec6e9',life:.4,max:.4});return}b.dead=true;impactTier=Math.max(impactTier,b.tier);const s=stats(state,moonTimers.length,rainbow>0),oldSize=sizeFor(state.total),reward=b.value*s.reward*(crit?s.critPower:1)*(b.type==='gold'?20*Math.pow(3,l('goldPower'))*(state.focus==='gold'?2:1):1)*(state.quick&&state.cleared?5:1);state.money+=reward;state.total+=reward;state.kills++;earned+=reward;destroyed++;charge+=(1+b.tier*.5)*(state.focus==='burst'?1.5:1);if(SPECIALS.includes(b.type)&&!state.seen.includes(b.type))state.seen.push(b.type);if(sizeFor(state.total)>oldSize){time=Math.min(time+2*l('growthTime'),stats(state).duration+20);notice('블랙홀 성장 · SIZE '+sizeFor(state.total))}if(Math.random()<.02*l('luckyTime'))time=Math.min(time+.4,stats(state).duration+20);
 effect({kind:'text',x:b.x,y:b.y,text:'+'+format(reward),color:crit?'#ffe49e':'#a7eed2',life:.7,max:.7});feedFragments(b);
 if(!state.reduced)for(let i=0;i<5;i++)effect({kind:'spark',x:b.x,y:b.y,vx:(Math.random()-.5)*120,vy:(Math.random()-.5)*120,color:colors[b.type],life:.35,max:.35});
 if(b.type==='moon'){if(moonTimers.length>=stats(state).moonCap)moonTimers.shift();moonTimers.push(6+2*l('moonDuration')+(state.focus==='moon'?3:0));notice('달 중첩 ×'+moonTimers.length+' · 속도와 반경 증가')}
 if(b.type==='comet'){rainbow=8;notice('무지개 공명 · 8초간 피해·수익 ×4')}
 // Queue special effects rather than recursing into destruction chains.
 if(['lightning','laser','nova'].includes(b.type))pending.push({b,damage:stats(state,moonTimers.length,rainbow>0).damage});
 if(Math.random()<.08*l('respawn'))replacement++;
}
let pending=[],replacement=0;
function specials(){let budget=0;while(pending.length&&budget++<180){const {b,damage:power}=pending.shift();const targets=bodies.filter(x=>!x.dead&&x!==b);if(b.type==='lightning'){targets.sort((a,c)=>Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(c.x-b.x,c.y-b.y));let prev=b;for(const target of targets.slice(0,3+2*l('chain')+(state.focus==='lightning'?2:0))){effect({kind:'line',x:prev.x,y:prev.y,x2:target.x,y2:target.y,color:'#83e7ff',width:2,life:.18,max:.18});damage(target,power*(2+2*l('electricPower'))*(state.focus==='lightning'?2:1));prev=target}}
 if(b.type==='laser'){const horizontal=Math.random()<.5,width=18+8*l('laserPower');effect({kind:'line',x:horizontal?0:b.x,y:horizontal?b.y:145,x2:horizontal?w:b.x,y2:horizontal?b.y:h,color:'#ffa5de',width,life:.24,max:.24});for(const t of targets)if(Math.abs(horizontal?t.y-b.y:t.x-b.x)<width/2+t.r)damage(t,power*8*Math.pow(2,l('laserPower'))*(state.focus==='burst'?2:1))}
 if(b.type==='nova'){const radius=130+35*l('novaPower');effect({kind:'ring',x:b.x,y:b.y,r:radius,color:'#ecc1ff',life:.5,max:.5});for(const t of targets)if(Math.hypot(t.x-b.x,t.y-b.y)<radius+t.r)damage(t,power*20*Math.pow(2,l('novaPower'))*(state.focus==='burst'?2:1));if(!state.reduced)shake=5}}
 pending=[];}
function tick(dt){time=Math.max(0,time-dt*(warp>0?.35:1));elapsed+=dt;warp=Math.max(0,warp-dt);wormhole=Math.max(0,wormhole-dt);overloadCooldown=Math.max(0,overloadCooldown-dt);if(elapsed>=8&&eventStage===0){warp=4;eventStage=1;notice('시간 왜곡 · 4초 동안 타이머 감속')}if(elapsed>=14&&eventStage===1){eventStage=2;travelWormhole()}rainbow=Math.max(0,rainbow-dt);moonTimers=moonTimers.map(v=>v-dt).filter(v=>v>0);const s=stats(state,moonTimers.length,rainbow>0);hitClock-=dt;if(pointer.active&&hitClock<=0){hitClock=s.interval;let hit=false;impactTier=0;for(const b of bodies)if(!b.dead&&Math.hypot(b.x-pointer.x,b.y-pointer.y)<s.radius+b.r){const crit=Math.random()<s.crit;damage(b,s.damage*(crit?s.critPower:1),crit);hit=true}specials();if(hit)sound(impactTier?140/(impactTier+1):rainbow?700:250+Math.random()*200,'triangle')}
 bodies=bodies.filter(b=>!b.dead);spawnClock+=dt;if(spawnClock>.25){spawnClock=0;const count=Math.min(s.count-bodies.length,5+replacement);for(let i=0;i<count;i++)bodies.push(spawn());replacement=0}
 for(const b of bodies){b.x+=b.vx*dt;b.y+=b.vy*dt;b.angle+=dt*.2;b.hit=Math.max(0,(b.hit||0)-dt);if(b.x<b.r||b.x>w-b.r)b.vx*=-1;if(b.y<155+b.r||b.y>h-35-b.r)b.vy*=-1}
 updateEffects(dt);if(charge>=18&&overloadCooldown<=0)accretionBurst();saveClock+=dt;if(saveClock>2){saveClock=0;save()}if(time<=0)finish();hud()}
function hud(){const set=(id,value)=>{if($(id).textContent!==value)$(id).textContent=value};const size=sizeFor(state.total);set('money',format(state.money));set('timer',time.toFixed(1));$('timer').style.color=time<5?'#ff99a7':'';set('size','블랙홀 SIZE '+size+' / 20');$('growth').value=size;set('eventStatus',phase==='play'?[(warp>0?'시간 왜곡 '+Math.ceil(warp)+'초 · 시간 ×0.35':''),(wormhole>0?'새로운 성역 · 천체 밀집':''),'폭주 충전 '+Math.min(100,Math.floor(charge/18*100))+'%'].filter(Boolean).join(' · '):'');set('buffs',[moonTimers.length?'☾ 달 ×'+moonTimers.length+' · '+Math.ceil(Math.max(...moonTimers))+'초':'',rainbow>0?'☄ 무지개 ×4 · '+Math.ceil(rainbow)+'초':''].filter(Boolean).join('   '))}
function circle(x,y,r,fill){ctx.beginPath();ctx.arc(x,y,Math.max(.1,r),0,Math.PI*2);ctx.fillStyle=fill;ctx.fill()}
function draw(now){ctx.clearRect(0,0,w,h);ctx.fillStyle='#070b19';ctx.fillRect(0,0,w,h);for(const d of dust)circle(d.x,d.y,d.r,'#43516d');const size=sizeFor(state.total),r=(14+size*2.5)*(1+pulse*.13+(phase==='finale'?(1-finale/2.8)*.7:0)),cx=w/2,cy=h*.54;ctx.save();if(wormhole>0){ctx.strokeStyle='#86f3dc';ctx.lineWidth=3;ctx.beginPath();ctx.arc(w/2,h*.54,Math.min(w,h)*.45*(1-wormhole/2),0,Math.PI*2);ctx.stroke()}if(shake)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);const glow=ctx.createRadialGradient(cx,cy,r,cx,cy,r*4);glow.addColorStop(0,rainbow?'#c2888050':'#9489e635');glow.addColorStop(1,'#11122400');circle(cx,cy,r*4,glow);ctx.save();ctx.translate(cx,cy);ctx.rotate(state.reduced?-.2:now*.00012);ctx.scale(1,.32);ctx.strokeStyle=rainbow?'#e6a0f8':'#c7b5f7';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,r*1.8,0,Math.PI*2);ctx.stroke();ctx.restore();circle(cx,cy,r,'#02040b');ctx.strokeStyle='#70648a';ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#a8f3e5';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,r*2.15,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,charge/18));ctx.stroke();
 for(const b of bodies){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.angle);const color=b.hit>0?'#fff5dc':colors[b.type];if(b.type==='rock'||b.type==='gold'||b.type==='lightning'){ctx.beginPath();for(let i=0;i<7;i++){const a=i/7*Math.PI*2,rad=b.r*(i%2?.85:1);ctx.lineTo(Math.cos(a)*rad,Math.sin(a)*rad)}ctx.closePath();ctx.fillStyle=color;ctx.fill()}else{circle(0,0,b.r,color);if(b.type==='planet'){ctx.strokeStyle='#8b4a6466';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-b.r*.8,0);ctx.lineTo(b.r*.8,0);ctx.stroke()}}if(!['rock','planet'].includes(b.type)){ctx.fillStyle='#13213b';ctx.font=`bold ${Math.max(13,b.r)}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(({gold:'◆',lightning:'ϟ',moon:'☾',comet:'☄',laser:'✦',nova:'✺',star:'☀'})[b.type],0,0)}if(b.hp<b.max){ctx.strokeStyle='#13213b';ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(-b.r*.5,-b.r*.7);ctx.lineTo(0,0);ctx.lineTo(b.r*.4,-b.r*.15);ctx.lineTo(b.r*.15,b.r*.8);ctx.stroke()}if(b.intro){ctx.strokeStyle='#fff3b3';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,b.r+6,0,Math.PI*2);ctx.stroke()}ctx.restore();if(b.hp<b.max){ctx.fillStyle='#273249';ctx.fillRect(b.x-b.r,b.y+b.r+3,b.r*2,3);ctx.fillStyle=color;ctx.fillRect(b.x-b.r,b.y+b.r+3,b.r*2*b.hp/b.max,3)}}
 for(const e of fx){ctx.globalAlpha=Math.max(0,e.life/e.max);if(e.kind==='text'){ctx.font='bold 13px system-ui';ctx.fillStyle=e.color;ctx.textAlign='center';ctx.fillText(e.text,e.x,e.y)}else if(e.kind==='spark'||e.kind==='feed')circle(e.x,e.y,e.kind==='feed'?Math.max(1,(3+(e.tier||0))*e.life/e.max):2,e.color);else if(e.kind==='line'){ctx.strokeStyle=e.color;ctx.lineWidth=e.width;ctx.beginPath();ctx.moveTo(e.x,e.y);if(!state.reduced&&e.width<5)ctx.lineTo((e.x+e.x2)/2+10,(e.y+e.y2)/2-10);ctx.lineTo(e.x2,e.y2);ctx.stroke()}else if(e.kind==='ring'){ctx.strokeStyle=e.color;ctx.lineWidth=4;ctx.beginPath();ctx.arc(e.x,e.y,e.r*(1-e.life/e.max),0,Math.PI*2);ctx.stroke()}}ctx.globalAlpha=1;
 if(pointer.active&&phase==='play'){const s=stats(state,moonTimers.length,rainbow>0);ctx.strokeStyle=rainbow?`hsl(${now*.1%360} 85% 75%)`:moonTimers.length?'#dbedff':'#c9e8e0';ctx.lineWidth=2;ctx.setLineDash([6,6]);ctx.beginPath();ctx.arc(pointer.x,pointer.y,s.radius,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);if(touch){circle(pointer.x,Math.min(h-10,pointer.y+46),4,'#d9f7ef');ctx.strokeStyle='#d9f7ef66';ctx.beginPath();ctx.moveTo(pointer.x,pointer.y+s.radius);ctx.lineTo(pointer.x,Math.min(h-10,pointer.y+42));ctx.stroke()}for(let i=0;i<moonTimers.length;i++){const a=state.reduced?i*2:now*.002+i*2;circle(pointer.x+Math.cos(a)*s.radius,pointer.y+Math.sin(a)*s.radius,5,'#edf3ff')}}ctx.restore()}
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;if(phase==='play')tick(dt);if(phase==='finale'){finale=Math.max(0,finale-dt);updateEffects(dt);if(finale===0)summary()}draw(now)}
function renderTree(){renderBuild();const node=$('nodes'),svg=$('connections');node.replaceChildren();svg.replaceChildren();UPGRADES.forEach((u,i)=>{const [col,row]=positions[i],x=15+col*116,y=12+row*94;if(u.parent){const j=UPGRADES.findIndex(v=>v.id===u.parent),[pc,pr]=positions[j],p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',`M${15+pc*116+51} ${12+pr*94+42} H${x+51} V${y+42}`);if(l(u.parent))p.classList.add('owned');svg.append(p)}const btn=document.createElement('button');btn.className='node'+(l(u.id)?' owned':'')+(u.parent&&!l(u.parent)?' locked':'')+(selected===u.id?' selected':'');btn.style.left=x+'px';btn.style.top=y+'px';btn.innerHTML=`<span class="symbol">${u.icon}</span>${u.name}<small>${l(u.id)} / ${u.max}</small>`;btn.setAttribute('aria-label',u.name+' '+l(u.id)+'단계');btn.onclick=()=>{selected=u.id;renderTree()};node.append(btn)});const u=UPGRADES.find(u=>u.id===selected);if(u){const locked=u.parent&&!l(u.parent),maxed=l(u.id)>=u.max;$('detail').textContent=`${u.name} · ${u.description} · 현재 ${l(u.id)}/${u.max}`+(locked?' · 먼저 '+UPGRADES.find(v=>v.id===u.parent).name+' 연구 필요':'');$('purchase').textContent=maxed?'연구 완료':'에너지 '+format(cost(state,u))+' · 구매';$('purchase').disabled=maxed||locked||state.money<cost(state,u)}if(u&&l(u.id)<u.max&&['mass','planet','star'].includes(u.id)){const tier=u.id==='star'?2:u.id==='planet'?1:0,preview={...state,levels:{...state.levels,[u.id]:l(u.id)+1}};$('detail').textContent+=' · 기본 타격 기준 '+breakSeconds(state,tier).toFixed(1)+'초 → 연구 후 '+breakSeconds(preview,tier).toFixed(1)+'초. 느리면 피해 강화·천체 비율·무료 재배분을 활용하세요.'}hud()}
function renderBuild(){
 $('focus').value=state.focus;$('mix').value=state.mix;
 $('refund').disabled=state.investment<=0;
 $('refund').textContent='연구 무료 재배분 · '+format(state.investment)+' 환급';
 $('buildInfo').textContent=FOCUSES[state.focus].text+' · 기본 소행성 '+breakSeconds(state,0).toFixed(1)+'초/개 · 재배분해도 블랙홀 크기와 기록은 유지됩니다.';
}
for(const [id,focus] of Object.entries(FOCUSES)){const option=document.createElement('option');option.value=id;option.textContent=focus.name;$('focus').append(option)}
$('focus').onchange=()=>{if(phase!=='tree'||!FOCUSES[$('focus').value])return;state.focus=$('focus').value;save();renderTree()};
$('mix').onchange=()=>{if(phase!=='tree')return;state.mix=$('mix').value;save();renderTree()};
$('refund').onclick=()=>{if(phase!=='tree')return;const amount=refund(state);selected=null;$('detail').textContent='연구비 '+format(amount)+'를 전액 돌려받았어요. 다른 경로로 다시 연구해 보세요.';$('purchase').disabled=true;save();renderTree()};
$('purchase').onclick=()=>{if(buy(state,selected)){sound(650);save();renderTree()}};
for(const id of ['start','again','launch'])$(id).onclick=begin;for(const id of ['openTree','upgrade'])$(id).onclick=()=>show('tree');$('treeBack').onclick=()=>show('welcome');$('pause').onclick=()=>phase==='play'?pause():resume();$('resume').onclick=resume;$('end').onclick=finish;
function settings(){$('sound').textContent=state.sound?'소리 ON':'소리 OFF';$('effects').textContent=state.reduced?'효과 줄임 ON':'효과 줄이기';$('sound').setAttribute('aria-pressed',String(state.sound));$('effects').setAttribute('aria-pressed',String(state.reduced))}
$('sound').onclick=()=>{state.sound=!state.sound;settings();sound(500);save()};$('effects').onclick=()=>{state.reduced=!state.reduced;settings();save()};$('quick').onchange=()=>{state.quick=state.cleared&&$('quick').checked;save()};
function move(e){touch=e.pointerType!=='mouse';pointer.x=Math.max(10,Math.min(w-10,e.clientX));pointer.y=Math.max(170,Math.min(h-30,e.clientY-(touch?46:0)));pointer.active=e.pointerType==='mouse'||e.buttons>0}
canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerdown',e=>{if(phase!=='play')return;canvas.setPointerCapture(e.pointerId);move(e);pointer.active=true});canvas.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')pointer.active=false});canvas.addEventListener('pointercancel',()=>pointer.active=false);canvas.addEventListener('pointerleave',()=>pointer.active=false);
addEventListener('keydown',e=>{if(e.target instanceof HTMLButtonElement||e.target instanceof HTMLInputElement||e.target.tagName==='SELECT')return;if(e.code==='Space'){e.preventDefault();phase==='play'?pause():resume()}if(phase==='play'&&e.key.startsWith('Arrow')){e.preventDefault();pointer.active=true;pointer.x=Math.max(0,Math.min(w,pointer.x+(e.key==='ArrowRight'?25:e.key==='ArrowLeft'?-25:0)));pointer.y=Math.max(145,Math.min(h,pointer.y+(e.key==='ArrowDown'?25:e.key==='ArrowUp'?-25:0)))}});
addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();save()}});addEventListener('pagehide',save);window.KidscadeGame?.registerPauseHandlers?.({pause,resume});settings();show('welcome');hud();requestAnimationFrame(frame);
