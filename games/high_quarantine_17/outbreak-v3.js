(()=>{'use strict';
const A='../../assets/game/characters/people/kenney-platformer-characters/';
const PLAYER=A+'player/poses/player-stand.png';
const ZOMBIE=A+'zombie/poses/zombie-stand.png';

const style=document.createElement('style');
style.textContent=`
#q17Outbreak{position:fixed;inset:0;z-index:260;background:#050708f2;display:none;align-items:center;justify-content:center;padding:10px}
#q17Outbreak.show{display:flex}
.q17-combat-shell{width:min(1040px,100%);background:#11161b;border:1px solid #59636e;box-shadow:0 24px 90px #000;position:relative}
.q17-combat-head{display:flex;gap:14px;align-items:center;justify-content:space-between;padding:10px 14px;background:#251517;border-bottom:1px solid #734146;flex-wrap:wrap}
.q17-combat-title{font-weight:1000;letter-spacing:.08em;color:#ff8989}.q17-combat-stats{display:flex;gap:15px;font-size:12px;color:#ccd3d9}.q17-combat-stats b{color:#fff}
#q17CombatCanvas{display:block;width:100%;height:auto;aspect-ratio:16/9;background:linear-gradient(#202830,#0e1318);touch-action:none;cursor:crosshair}
.q17-combat-help{padding:9px 12px;color:#9ca7b1;font-size:11px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
.q17-alert{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#090c0fe8;border:2px solid #b64f55;padding:18px 22px;text-align:center;min-width:min(460px,85%);box-shadow:0 12px 45px #000;display:none}
.q17-alert.show{display:block}.q17-alert h2{margin:0 0 8px;color:#ff7b7b}.q17-alert p{color:#ccd1d5;line-height:1.5}.q17-alert button{border:0;background:#c2a64c;color:#171717;font-weight:900;padding:10px 16px;cursor:pointer}
.q17-dead{position:fixed;inset:0;z-index:400;background:#050505f7;display:none;align-items:center;justify-content:center;padding:20px}.q17-dead.show{display:flex}
.q17-dead-card{width:min(620px,100%);border:1px solid #65383b;background:#171112;padding:25px;text-align:center;box-shadow:0 20px 80px #000}.q17-dead-card h1{color:#e36b70;margin-top:0}.q17-dead-card p{color:#c8c1c1;line-height:1.65}.q17-dead-card button{border:0;background:#d2b450;color:#171717;font-weight:950;padding:12px 18px;cursor:pointer}
@media(max-width:680px){#q17Outbreak{padding:0}.q17-combat-shell{height:100%;display:flex;flex-direction:column}.q17-combat-head{padding:8px 10px}.q17-combat-title{font-size:13px}.q17-combat-stats{gap:9px;font-size:10px}#q17CombatCanvas{flex:1;min-height:0;aspect-ratio:auto}.q17-combat-help{font-size:9px;padding:6px 8px}}
`;
document.head.appendChild(style);

const wrap=document.createElement('div');wrap.id='q17Outbreak';
wrap.innerHTML='<div class="q17-combat-shell"><div class="q17-combat-head"><div class="q17-combat-title">⚠ 격리선 붕괴 · 긴급 진압</div><div class="q17-combat-stats"><span>체력 <b id="q17Hp">100</b></span><span>잔여 좀비 <b id="q17Left">0</b></span><span>탄창 <b id="q17Ammo">12</b></span><span>감염률 <b id="q17Risk">0%</b></span></div></div><canvas id="q17CombatCanvas" width="960" height="540"></canvas><div class="q17-combat-help"><span>이동 WASD / 방향키 · 조준 마우스 · 클릭/스페이스 사격 · R 재장전</span><span>모바일: 화면을 누르면 해당 방향으로 이동하며 자동 사격</span></div><div class="q17-alert" id="q17Alert"><h2 id="q17AlertTitle">격리선 붕괴</h2><p id="q17AlertText"></p><button id="q17AlertBtn" type="button">진압 시작</button></div></div>';
document.body.appendChild(wrap);

const dead=document.createElement('div');dead.className='q17-dead';dead.id='q17Dead';
dead.innerHTML='<div class="q17-dead-card"><h1>검역소 함락</h1><p>격리선이 무너졌고 감염자들이 검역소 안까지 들어왔습니다.<br>진압에 실패해 제17구역은 폐쇄되었습니다.</p><p><b>검역 단계에서 감염자를 더 정확히 걸러냈다면 전투 규모 자체가 작아졌을 것입니다.</b></p><button type="button" id="q17Restart">처음부터 다시</button></div>';
document.body.appendChild(dead);

const canvas=document.getElementById('q17CombatCanvas'),ctx=canvas.getContext('2d');
const playerImg=new Image(),zombieImg=new Image();playerImg.src=PLAYER;zombieImg.src=ZOMBIE;
const keys={},mouse={x:canvas.width/2,y:canvas.height/2,down:false};
let active=false,started=false,last=0,player,zombies=[],bullets=[],reload=0,shootCd=0,autoTarget=null;

function bridge(){return window.Q17Bridge||null}
function infection(){const b=bridge();return b?b.getState().infection:Number((document.getElementById('infection')||{}).textContent?.replace('%',''))||0}
function difficulty(){
 const inf=infection();
 return {inf,count:Math.min(26,6+Math.floor((inf-18)*.75)),speed:46+Math.max(0,inf-20)*1.2,hp:1+Math.floor(Math.max(0,inf-28)/10)};
}
function resizeCanvas(){
 const r=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
 const w=Math.max(320,Math.round(r.width*dpr)),h=Math.max(240,Math.round(r.height*dpr));
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
}
function spawn(){
 resizeCanvas();
 const d=difficulty(),W=canvas.width,H=canvas.height;
 player={x:W/2,y:H/2,r:25*(window.devicePixelRatio||1),hp:100,ammo:12,maxAmmo:12};
 zombies=[];bullets=[];reload=0;shootCd=0;
 for(let i=0;i<d.count;i++){
  const side=i%4;let x,y;
  if(side===0){x=Math.random()*W;y=-30}else if(side===1){x=W+30;y=Math.random()*H}else if(side===2){x=Math.random()*W;y=H+30}else{x=-30;y=Math.random()*H}
  zombies.push({x,y,r:22*(window.devicePixelRatio||1),hp:d.hp,speed:d.speed*(.8+Math.random()*.35)*(window.devicePixelRatio||1),hit:0});
 }
 document.getElementById('q17Left').textContent=zombies.length;
 document.getElementById('q17Hp').textContent=player.hp;
 document.getElementById('q17Ammo').textContent=player.ammo;
 document.getElementById('q17Risk').textContent=d.inf+'%';
}
function showOutbreak(){
 if(active||!bridge())return;
 const d=difficulty(); if(d.inf<20)return;
 active=true;started=false;spawn();wrap.classList.add('show');
 const severity=d.inf>=40?'대규모 붕괴':d.inf>=30?'중대 경보':'국지적 돌파';
 document.getElementById('q17AlertTitle').textContent=severity;
 document.getElementById('q17AlertText').innerHTML='도시 감염률이 <b>'+d.inf+'%</b>까지 올라 격리 대기 구역에서 집단 감염이 발생했습니다.<br>이번 진압 대상은 <b>'+d.count+'명</b>입니다. 검역 단계에서 놓친 감염이 많을수록 더 위험해집니다.';
 document.getElementById('q17Alert').classList.add('show');
}
function shoot(tx,ty){
 if(!started||shootCd>0||reload>0)return;
 if(player.ammo<=0){startReload();return}
 const dx=tx-player.x,dy=ty-player.y,len=Math.hypot(dx,dy)||1;
 bullets.push({x:player.x,y:player.y,vx:dx/len*650*(window.devicePixelRatio||1),vy:dy/len*650*(window.devicePixelRatio||1),life:1.2});
 player.ammo--;shootCd=.13;document.getElementById('q17Ammo').textContent=player.ammo;
 if(player.ammo<=0)startReload();
}
function startReload(){if(reload>0||player.ammo===player.maxAmmo)return;reload=1.05}
function nearest(){
 let best=null,bd=Infinity;for(const z of zombies){const d=(z.x-player.x)**2+(z.y-player.y)**2;if(d<bd){bd=d;best=z}}return best;
}
function update(dt){
 if(!started)return;
 shootCd=Math.max(0,shootCd-dt);
 if(reload>0){reload-=dt;if(reload<=0){player.ammo=player.maxAmmo;document.getElementById('q17Ammo').textContent=player.ammo}}
 let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
 if(dx||dy){const l=Math.hypot(dx,dy);player.x+=dx/l*220*dt*(window.devicePixelRatio||1);player.y+=dy/l*220*dt*(window.devicePixelRatio||1)}
 player.x=Math.max(player.r,Math.min(canvas.width-player.r,player.x));player.y=Math.max(player.r,Math.min(canvas.height-player.r,player.y));
 if(mouse.down)shoot(mouse.x,mouse.y);
 if(autoTarget){const ax=autoTarget.x-player.x,ay=autoTarget.y-player.y,l=Math.hypot(ax,ay);if(l>55*(window.devicePixelRatio||1)){player.x+=ax/l*150*dt*(window.devicePixelRatio||1);player.y+=ay/l*150*dt*(window.devicePixelRatio||1)}const n=nearest();if(n)shoot(n.x,n.y)}
 for(const b of bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt}
 bullets=bullets.filter(b=>b.life>0&&b.x>-20&&b.y>-20&&b.x<canvas.width+20&&b.y<canvas.height+20);
 const d=difficulty();
 for(const z of zombies){
  const ax=player.x-z.x,ay=player.y-z.y,l=Math.hypot(ax,ay)||1;z.x+=ax/l*z.speed*dt;z.y+=ay/l*z.speed*dt;z.hit=Math.max(0,z.hit-dt);
  if(l<player.r+z.r&&z.hit<=0){player.hp=Math.max(0,player.hp-12);z.hit=.65;document.getElementById('q17Hp').textContent=player.hp;if(player.hp<=0){lose();return}}
 }
 for(const b of bullets){for(const z of zombies){if(z.hp<=0)continue;if(Math.hypot(b.x-z.x,b.y-z.y)<z.r+5){z.hp--;b.life=0;if(z.hp<=0){document.getElementById('q17Left').textContent=zombies.filter(q=>q.hp>0).length-0}}}}
 zombies=zombies.filter(z=>z.hp>0);
 if(zombies.length===0)win(d.inf);
}
function draw(){
 const W=canvas.width,H=canvas.height;ctx.clearRect(0,0,W,H);
 ctx.fillStyle='#151b20';ctx.fillRect(0,0,W,H);
 ctx.strokeStyle='#2a343d';ctx.lineWidth=2;const g=64*(window.devicePixelRatio||1);for(let x=0;x<W;x+=g){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=g){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
 ctx.fillStyle='#784047';ctx.fillRect(0,0,W,8*(window.devicePixelRatio||1));ctx.fillRect(0,H-8*(window.devicePixelRatio||1),W,8*(window.devicePixelRatio||1));ctx.fillRect(0,0,8*(window.devicePixelRatio||1),H);ctx.fillRect(W-8*(window.devicePixelRatio||1),0,8*(window.devicePixelRatio||1),H);
 for(const b of bullets){ctx.fillStyle='#f6d86d';ctx.beginPath();ctx.arc(b.x,b.y,4*(window.devicePixelRatio||1),0,Math.PI*2);ctx.fill()}
 for(const z of zombies){const s=z.r*3;ctx.save();ctx.translate(z.x,z.y);const flip=player.x<z.x?-1:1;ctx.scale(flip,1);if(z.hit>0){ctx.globalAlpha=.55}ctx.drawImage(zombieImg,-s/2,-s*.68,s,s);ctx.restore()}
 const ps=player.r*3.1;ctx.drawImage(playerImg,player.x-ps/2,player.y-ps*.7,ps,ps);
 if(reload>0){ctx.fillStyle='#000a';ctx.fillRect(player.x-35,player.y+35,70,8);ctx.fillStyle='#e2c65c';ctx.fillRect(player.x-35,player.y+35,70*(1-reload/1.05),8)}
}
function loop(t){if(!active)return;const dt=Math.min(.033,(t-last)/1000||0);last=t;update(dt);draw();requestAnimationFrame(loop)}
function win(inf){
 if(!active)return;started=false;active=false;wrap.classList.remove('show');
 const b=bridge();if(b)b.applyOutbreakResult({won:true,infectionDelta:-Math.min(10,4+Math.floor(inf/8)),trustDelta:-2,scoreDelta:450+inf*8});
 const m=document.getElementById('statusMsg');if(m){m.textContent='긴급 진압 성공 · 감염률 감소';m.classList.add('show','big');setTimeout(()=>m.classList.remove('show','big'),2200)}
}
function lose(){
 if(!active)return;started=false;active=false;wrap.classList.remove('show');dead.classList.add('show');const b=bridge();if(b)b.applyOutbreakResult({won:false,infectionDelta:8,trustDelta:-15,scoreDelta:-500,gameOver:true});
}
document.getElementById('q17AlertBtn').addEventListener('click',()=>{document.getElementById('q17Alert').classList.remove('show');started=true;last=performance.now();requestAnimationFrame(loop)});
document.getElementById('q17Restart').addEventListener('click',()=>{dead.classList.remove('show');location.reload()});
window.addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key.toLowerCase()==='r')startReload();if(e.code==='Space'){e.preventDefault();const n=nearest();if(n)shoot(n.x,n.y)}});
window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
function pos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}}
canvas.addEventListener('pointermove',e=>{const p=pos(e);mouse.x=p.x;mouse.y=p.y});
canvas.addEventListener('pointerdown',e=>{const p=pos(e);mouse.x=p.x;mouse.y=p.y;if(e.pointerType==='touch'){autoTarget=p}else{mouse.down=true;shoot(p.x,p.y)}});
canvas.addEventListener('pointerup',e=>{mouse.down=false;if(e.pointerType==='touch')autoTarget=null});
canvas.addEventListener('pointercancel',()=>{mouse.down=false;autoTarget=null});
window.addEventListener('resize',()=>{if(active)resizeCanvas()});

let seenReport=false;
const obs=new MutationObserver(()=>{
 const report=document.getElementById('reportModal');
 const showing=!!report&&report.classList.contains('show');
 if(showing&&!seenReport){seenReport=true;setTimeout(showOutbreak,700)}
 if(!showing)seenReport=false;
});
obs.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
})();