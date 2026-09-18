"use strict";
window.__policePatrolOwnAudio=true;
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const mm=document.getElementById('minimap'),mctx=mm.getContext('2d');
const $=s=>document.querySelector(s);
const ui={shift:$('#shift'),solved:$('#solved'),score:$('#score'),speed:$('#speed'),health:$('#health'),siren:$('#sirenText'),kind:$('#missionKind'),title:$('#missionTitle'),text:$('#missionText'),meta:$('#missionMeta'),radio:$('#radio'),action:$('#actionBtn'),progress:$('#progress'),progressBar:$('#progress i'),start:$('#start'),end:$('#end'),endTitle:$('#endTitle'),endText:$('#endText')};
const ROOT='../../assets/game/2d/racing/kenney-racing-pack/';
const A={
 cars:['car_black_1.png','car_blue_1.png','car_green_1.png','car_red_1.png','car_yellow_1.png','car_black_3.png','car_blue_3.png','car_green_3.png','car_red_3.png','car_yellow_3.png'].map(x=>ROOT+'cars/'+x),
 police:ROOT+'cars/car_blue_1.png',suspect:ROOT+'cars/car_red_2.png',
 lights:ROOT+'objects/lights.png',cone:ROOT+'objects/cone_straight.png',barrier:ROOT+'objects/barrier_red.png',
 tree:ROOT+'objects/tree_large.png',treeSmall:ROOT+'objects/tree_small.png',skid:ROOT+'objects/skidmark_long_1.png',
 grass:ROOT+'tiles/grass/land_grass01.png',road:ROOT+'tiles/asphalt-road/road_asphalt01.png'
};
const images=new Map();
function load(src){const im=new Image(),rec={im,ok:false};images.set(src,rec);im.onload=()=>rec.ok=true;im.src=src}
Object.values(A).flat().forEach(load);
const img=s=>images.get(s)?.ok?images.get(s).im:null;
const TAU=Math.PI*2,WORLD=2300,ROAD_MAIN=280,ROAD_SIDE=190,GRID=720,SHIFT=360;
const roadXs=[-1440,-720,0,720,1440],roadYs=[-1440,-720,0,720,1440],roads=[],blocks=[],decor=[];
let player=null,cars=[],mission=null,state='menu',last=performance.now(),score=0,solved=0,shiftTime=0,missionDelay=1.2,radioTimer=0,raf=false;
const camera={x:0,y:0,zoom:1},keys={w:false,a:false,s:false,d:false,r:false},touch={steer:0,brake:false,reverse:false,boost:false};
const coarse=matchMedia('(hover:none),(pointer:coarse)').matches;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function resize(){canvas.width=innerWidth*devicePixelRatio;canvas.height=innerHeight*devicePixelRatio;canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)}
addEventListener('resize',resize);resize();
function sfx(k,o={}){try{window.KidscadeAudio?.play?.(k,o)}catch(_){}}
function radio(text,color='#9dd3ff'){ui.radio.textContent='무전 · '+text;ui.radio.style.color=color;ui.radio.classList.add('show');radioTimer=2.5}
function setMission(kind,title,text){ui.kind.textContent=kind;ui.title.textContent=title;ui.text.textContent=text}
function buildWorld(){
 roads.length=0;blocks.length=0;decor.length=0;
 roadXs.forEach(x=>roads.push({x:x-(x===0?ROAD_MAIN:ROAD_SIDE)/2,y:-WORLD,w:x===0?ROAD_MAIN:ROAD_SIDE,h:WORLD*2,axis:'v'}));
 roadYs.forEach(y=>roads.push({x:-WORLD,y:y-(y===0?ROAD_MAIN:ROAD_SIDE)/2,w:WORLD*2,h:y===0?ROAD_MAIN:ROAD_SIDE,axis:'h'}));
 const halfX=x=>x===0?ROAD_MAIN/2:ROAD_SIDE/2,halfY=y=>y===0?ROAD_MAIN/2:ROAD_SIDE/2;
 for(let xi=0;xi<roadXs.length-1;xi++)for(let yi=0;yi<roadYs.length-1;yi++){
   const l=roadXs[xi]+halfX(roadXs[xi])+22,r=roadXs[xi+1]-halfX(roadXs[xi+1])-22,t=roadYs[yi]+halfY(roadYs[yi])+22,b=roadYs[yi+1]-halfY(roadYs[yi+1])-22;
   const type=(xi+yi)%5===0?'park':(xi*3+yi)%4===0?'parking':'building';
   blocks.push({x:l,y:t,w:r-l,h:b-t,type,shade:(xi+yi)%4});
   if(type==='park'){for(let k=0;k<6;k++)decor.push({type:'tree',x:l+45+Math.random()*(r-l-90),y:t+45+Math.random()*(b-t-90),small:k%2===0})}
   else{for(let k=0;k<2;k++)decor.push({type:'tree',x:l+25+(k?Math.max(20,r-l-50):0),y:t+30+Math.random()*Math.max(20,b-t-60),small:true})}
 }
}
function onRoad(x,y,m=0){return roads.some(r=>x>r.x-m&&x<r.x+r.w+m&&y>r.y-m&&y<r.y+r.h+m)}
function buildingHit(x,y,r=15){if(Math.abs(x)>WORLD-r||Math.abs(y)>WORLD-r)return true;return blocks.some(b=>b.type==='building'&&x+r>b.x+10&&x-r<b.x+b.w-10&&y+r>b.y+10&&y-r<b.y+b.h-10)}
function nearRoad(x,y){let best={x,y,d:1e9};for(const rx of roadXs){const d=Math.abs(x-rx);if(d<best.d)best={x:rx,y:clamp(y,-WORLD+70,WORLD-70),d}}for(const ry of roadYs){const d=Math.abs(y-ry);if(d<best.d)best={x:clamp(x,-WORLD+70,WORLD-70),y:ry,d}}return best}
function nearestIntersection(x,y){let out={x:0,y:0,d:1e9};for(const rx of roadXs)for(const ry of roadYs){const d=Math.hypot(x-rx,y-ry);if(d<out.d)out={x:rx,y:ry,d}}return out}
function roadPoint(origin,min=400,max=950){for(let i=0;i<80;i++){const vertical=Math.random()<.5,p=vertical?{x:roadXs[Math.floor(Math.random()*roadXs.length)]+(Math.random()<.5?-34:34),y:origin.y+(Math.random()*2-1)*max}:{x:origin.x+(Math.random()*2-1)*max,y:roadYs[Math.floor(Math.random()*roadYs.length)]+(Math.random()<.5?-34:34)};p.x=clamp(p.x,-WORLD+100,WORLD-100);p.y=clamp(p.y,-WORLD+100,WORLD-100);const d=Math.hypot(p.x-origin.x,p.y-origin.y);if(d>=min&&d<=max&&onRoad(p.x,p.y,10))return p}return{x:origin.x+500,y:origin.y}}
class Car{
 constructor(x,y,a=0,sprite=A.cars[0]){this.x=x;this.y=y;this.a=a;this.speed=0;this.sprite=sprite;this.radius=17;this.health=100;this.target=145+Math.random()*28;this.turnCd=0;this.stopped=false;this.suspect=false;this.fleeing=false;this.yield=0}
 move(dt){const nx=this.x+Math.cos(this.a)*this.speed*dt,ny=this.y+Math.sin(this.a)*this.speed*dt;if(buildingHit(nx,ny,this.radius)){const impact=Math.abs(this.speed);this.speed*=-.12;if(this===player&&impact>70){this.health=clamp(this.health-(impact-60)*.04,0,100);sfx('combat.impact_heavy',{volume:.18,cooldownMs:150})}}else{this.x=nx;this.y=ny}}
}
class Player extends Car{
 constructor(){super(32,360,-Math.PI/2,A.police);this.siren=false;this.cooldown=0}
 update(dt){this.cooldown=Math.max(0,this.cooldown-dt);let throttle=0,brake=false,rev=false;if(coarse){throttle=touch.boost?1:.38;brake=touch.brake;rev=touch.reverse;if(brake||rev)throttle=0}else{throttle=keys.w?1:0;brake=keys.s;rev=keys.r}
  if(throttle){if(this.speed<0)this.speed=Math.min(0,this.speed+380*dt);else this.speed+=285*throttle*dt}
  if(brake)this.speed=this.speed>0?Math.max(0,this.speed-470*dt):Math.min(0,this.speed+470*dt);
  if(rev&&!brake)this.speed=this.speed>0?Math.max(0,this.speed-480*dt):this.speed-200*dt;
  if(!throttle&&!brake&&!rev)this.speed+=(this.speed>0?-1:1)*Math.min(Math.abs(this.speed),115*dt);
  this.speed=clamp(this.speed,-105,270);
  const steer=coarse?touch.steer:(keys.a?-1:0)+(keys.d?1:0),grip=clamp(Math.abs(this.speed)/40,0,1);
  if(Math.abs(this.speed)>2)this.a+=steer*1.85*grip*(1-.32*Math.abs(this.speed)/270)*dt*(this.speed>=0?1:-1);
  this.move(dt);if(!onRoad(this.x,this.y,18))this.speed*=Math.pow(.978,dt*60)
 }
}
class TrafficCar extends Car{
 update(dt){if(this.stopped){this.speed=Math.max(0,this.speed-300*dt);return}this.turnCd=Math.max(0,this.turnCd-dt);let desired=this.suspect&&this.fleeing?185:this.target;
  if(this.yield>0){this.yield-=dt;desired=65;const side=this.yieldSide||1,isH=Math.abs(Math.cos(this.a))>.7;if(isH)this.y=lerp(this.y,nearestIntersection(this.x,this.y).y+side*58,dt*1.7);else this.x=lerp(this.x,nearestIntersection(this.x,this.y).x+side*58,dt*1.7)}
  if(this.speed<desired)this.speed+=105*dt;else this.speed-=135*dt;
  const inter=nearestIntersection(this.x,this.y);
  if(inter.d<42&&this.turnCd<=0&&this.yield<=0){let turn=Math.random()<.58?0:(Math.random()<.5?-1:1);if(this.suspect&&this.fleeing)turn=[-1,0,1][Math.floor(Math.random()*3)];this.a+=turn*Math.PI/2;this.x=inter.x+Math.cos(this.a)*55;this.y=inter.y+Math.sin(this.a)*55;this.turnCd=1.4}
  if(Math.abs(Math.cos(this.a))>.7){const ry=roadYs.reduce((a,b)=>Math.abs(b-this.y)<Math.abs(a-this.y)?b:a,roadYs[0]);this.y=lerp(this.y,ry+(Math.sin(this.a)>0?30:-30),dt*2)}
  else{const rx=roadXs.reduce((a,b)=>Math.abs(b-this.x)<Math.abs(a-this.x)?b:a,roadXs[0]);this.x=lerp(this.x,rx+(Math.cos(this.a)>0?-30:30),dt*2)}
  this.move(dt)
 }
}
function spawnTraffic(n=16){cars=[];for(let i=0;i<n;i++){const p=roadPoint({x:0,y:0},500,2100),horizontal=Math.random()<.5,a=horizontal?(Math.random()<.5?0:Math.PI):(Math.random()<.5?Math.PI/2:-Math.PI/2);cars.push(new TrafficCar(p.x,p.y,a,A.cars[i%A.cars.length]))}}
function updateYield(){if(!player.siren)return;for(const c of cars){if(c.suspect)continue;const d=dist(player,c);if(d<330){c.yield=Math.max(c.yield,1.2);c.yieldSide=((c.x+c.y)%2>0?1:-1)}}}
function collisions(){for(const c of cars){const dx=c.x-player.x,dy=c.y-player.y,d=Math.hypot(dx,dy);if(d>0&&d<34){const nx=dx/d,ny=dy/d,over=34-d;player.x-=nx*over*.5;player.y-=ny*over*.5;c.x+=nx*over*.5;c.y+=ny*over*.5;const impact=Math.abs(player.speed-c.speed);player.speed*=.73;c.speed*=.73;if(impact>100)player.health=clamp(player.health-(impact-90)*.025,0,100)}}}
function missionTarget(){if(!mission)return null;if(mission.type==='pursuit')return mission.suspect;if(mission.type==='accident'||mission.type==='obstacle')return mission.scene;if(mission.type==='traffic')return mission.points[Math.min(mission.index,2)];return mission.point}
function spawnMission(){const r=Math.random();if(r<.34)spawnPursuit();else if(r<.60)spawnAccident();else if(r<.80)spawnTrafficMission();else spawnObstacle()}
function spawnPursuit(){const p=roadPoint(player,470,850),a=Math.random()<.5?0:Math.PI/2,s=new TrafficCar(p.x,p.y,a,A.suspect);s.suspect=true;s.target=165;cars.push(s);mission={type:'pursuit',suspect:s,time:0,max:58,progress:0};setMission('긴급 신고','수배 차량 추격','사이렌을 켜고 접근한 뒤 용의 차량 앞을 막아 정차시키세요.');radio('수배 차량 발견. 가까운 순찰차 출동 바랍니다.','#ff8290')}
function spawnAccident(){const p=roadPoint(player,380,760);mission={type:'accident',scene:p,time:0,max:52};setMission('교통 사고','현장 안전 확보','파란 안전 구역 안에 완전히 정차한 뒤 현장 조치를 하세요.');radio('접촉 사고 신고. 2차 사고 예방이 우선입니다.')}
function spawnTrafficMission(){const c=nearestIntersection(player.x+(Math.random()<.5?GRID:-GRID),player.y+(Math.random()<.5?GRID:-GRID)),pts=[{x:c.x-150,y:c.y-30},{x:c.x+30,y:c.y-150},{x:c.x+150,y:c.y+30}];mission={type:'traffic',points:pts,index:0,time:0,max:62};setMission('교통 정리','안전콘 설치','노란 표시 3곳에 정차해 안전콘을 설치하세요.');radio('교차로 혼잡 신고. 안전 구역을 만들어 주세요.','#ffe18b')}
function spawnObstacle(){const p=roadPoint(player,350,720);mission={type:'obstacle',scene:p,time:0,max:48};setMission('도로 위험','낙하물 정리','현장에 정차한 뒤 도로 장애물을 안전하게 치우세요.');radio('차로에 장애물이 있다는 신고입니다.','#ffd17a')}
function finish(points,msg){score+=points;solved++;mission=null;missionDelay=2.6;setMission('순찰','다음 신고 대기 중','주변을 순찰하며 무전을 기다리세요.');ui.meta.textContent='';setAction();setProgress();radio(msg,'#8ef0ac');sfx('success.cheer_yay',{volume:.2,cooldownMs:500})}
function fail(msg){if(mission?.suspect){const i=cars.indexOf(mission.suspect);if(i>=0)cars.splice(i,1)}mission=null;missionDelay=2.2;setMission('순찰','신고 재배정','다음 신고를 확인하고 있습니다.');ui.meta.textContent='';setAction();setProgress();radio(msg,'#ff9aa4')}
function setProgress(pct=null,color='#ff5a67'){if(pct==null){ui.progress.style.display='none';return}ui.progress.style.display='block';ui.progressBar.style.width=clamp(pct,0,100)+'%';ui.progressBar.style.background=color}
function setAction(label,fn){if(!label){ui.action.style.display='none';ui.action.onclick=null;return}ui.action.style.display='block';ui.action.textContent=label;ui.action.onclick=fn||null}
function updateMission(dt){
 if(!mission){missionDelay-=dt;if(missionDelay<=0)spawnMission();return}
 mission.time+=dt;if(mission.time>mission.max)return fail('처리 시간이 지나 다음 신고로 넘어갑니다.');
 const t=missionTarget(),d=t?dist(player,t):0;ui.meta.textContent='목표 '+Math.round(d)+'m · '+Math.ceil(mission.max-mission.time)+'초';
 if(mission.type==='pursuit'){const s=mission.suspect;if(d<360&&player.siren)s.fleeing=true;const rx=player.x-s.x,ry=player.y-s.y,front=rx*Math.cos(s.a)+ry*Math.sin(s.a),lat=Math.abs(-rx*Math.sin(s.a)+ry*Math.cos(s.a)),block=player.siren&&front>18&&front<145&&lat<90&&Math.abs(player.speed)<78&&d<175;if(block){mission.progress+=dt;s.speed=Math.max(0,s.speed-260*dt);setProgress(mission.progress/1.35*100)}else{mission.progress=Math.max(0,mission.progress-dt);setProgress(d<220?mission.progress/1.35*100:null)}if(mission.progress>=1.35||s.speed<8&&d<130&&player.siren){s.stopped=true;const i=cars.indexOf(s);if(i>=0)cars.splice(i,1);finish(1.5,'수배 차량 검거 완료')}}
 else if(mission.type==='accident'){const parked=d<118&&Math.abs(player.speed)<8;setProgress(d<150?(parked?100:55):null,'#4aa8ff');if(d<135)setAction(parked?'현장 안전 확보 (Enter)':'완전히 정차하세요',parked?()=>finish(1,'사고 현장 수습 완료'):null);else setAction()}
 else if(mission.type==='traffic'){const p=mission.points[mission.index],dd=dist(player,p),parked=dd<82&&Math.abs(player.speed)<8;if(dd<90)setAction(parked?'안전콘 설치 '+(mission.index+1)+'/3':'이 지점에 정차하세요',parked?()=>{mission.index++;sfx('collect.coin_drop',{volume:.15,cooldownMs:100});if(mission.index>=3)finish(1.2,'교차로 안전 확보 완료')}:null);else setAction()}
 else if(mission.type==='obstacle'){const parked=d<105&&Math.abs(player.speed)<8;if(d<120)setAction(parked?'장애물 치우기':'차량을 정차하세요',parked?()=>finish(1,'도로 장애물 제거 완료'):null);else setAction()}
}
function toggleSiren(){if(state!=='playing')return;player.siren=!player.siren;ui.siren.textContent=player.siren?'ON':'OFF';ui.siren.style.color=player.siren?'#6bb6ff':'#eef5ff';sfx(player.siren?'collect.coin_pickup':'collect.coin_drop',{volume:.14,cooldownMs:100})}
function recover(){if(!player||state!=='playing'||player.cooldown>0)return;const p=nearRoad(player.x,player.y);player.x=p.x;player.y=p.y;player.speed=0;player.cooldown=4;radio('가까운 도로로 복귀했습니다.')}
function drawSprite(src,x,y,w,h,a=0,alpha=1){const im=img(src);if(!im)return false;ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(a+Math.PI/2);ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore();return true}
let grassPattern=null,roadPattern=null;
function patterns(){if(!grassPattern&&img(A.grass))grassPattern=ctx.createPattern(img(A.grass),'repeat');if(!roadPattern&&img(A.road))roadPattern=ctx.createPattern(img(A.road),'repeat')}
function drawWorld(){
 patterns();ctx.fillStyle=grassPattern||'#476f3f';ctx.fillRect(-WORLD,-WORLD,WORLD*2,WORLD*2);
 for(const b of blocks){if(b.type==='park'){ctx.fillStyle='rgba(81,137,73,.72)';ctx.fillRect(b.x,b.y,b.w,b.h)}
 else if(b.type==='parking'){ctx.fillStyle='#6f7578';ctx.fillRect(b.x,b.y,b.w,b.h);ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=3;for(let y=b.y+30;y<b.y+b.h-20;y+=48){ctx.beginPath();ctx.moveTo(b.x+20,y);ctx.lineTo(b.x+b.w-20,y);ctx.stroke()}}
 else{const colors=['#6f7d89','#8a786d','#71887d','#80758b'];ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(b.x+10,b.y+12,b.w-4,b.h-4);ctx.fillStyle=colors[b.shade];ctx.fillRect(b.x,b.y,b.w-10,b.h-10);ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(b.x+14,b.y+14,b.w-38,16);ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=4;ctx.strokeRect(b.x,b.y,b.w-10,b.h-10)}}
 for(const r of roads){ctx.fillStyle=roadPattern||'#555b60';ctx.fillRect(r.x,r.y,r.w,r.h);ctx.fillStyle='rgba(45,48,51,.66)';ctx.fillRect(r.x,r.y,r.w,r.h)}
 ctx.strokeStyle='#f3c94f';ctx.lineWidth=4;for(const x of roadXs){ctx.beginPath();ctx.moveTo(x,-WORLD);ctx.lineTo(x,WORLD);ctx.stroke()}for(const y of roadYs){ctx.beginPath();ctx.moveTo(-WORLD,y);ctx.lineTo(WORLD,y);ctx.stroke()}
 ctx.strokeStyle='rgba(255,255,255,.65)';ctx.lineWidth=2;ctx.setLineDash([22,20]);for(const x of roadXs){ctx.beginPath();ctx.moveTo(x-55,-WORLD);ctx.lineTo(x-55,WORLD);ctx.stroke();ctx.beginPath();ctx.moveTo(x+55,-WORLD);ctx.lineTo(x+55,WORLD);ctx.stroke()}for(const y of roadYs){ctx.beginPath();ctx.moveTo(-WORLD,y-55);ctx.lineTo(WORLD,y-55);ctx.stroke();ctx.beginPath();ctx.moveTo(-WORLD,y+55);ctx.lineTo(WORLD,y+55);ctx.stroke()}ctx.setLineDash([]);
 for(const d of decor)drawSprite(d.small?A.treeSmall:A.tree,d.x,d.y,d.small?42:58,d.small?42:58,-Math.PI/2)
}
function drawCar(c,police=false){const ok=drawSprite(c.sprite,c.x,c.y,police?46:42,police?82:76,c.a);if(!ok){ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.a);ctx.fillStyle=police?'#3d8deb':'#ddd';ctx.fillRect(-36,-17,72,34);ctx.restore()}if(police){drawSprite(A.lights,c.x,c.y,18,34,c.a);if(player.siren){ctx.save();ctx.globalAlpha=.25+.15*Math.sin(shiftTime*12);ctx.fillStyle=Math.sin(shiftTime*12)>0?'#ff3348':'#3387ff';ctx.beginPath();ctx.arc(c.x,c.y,46,0,TAU);ctx.fill();ctx.restore()}}}
function drawMission(){
 if(!mission)return;const t=missionTarget();if(!t)return;const col=mission.type==='pursuit'?'#ff586a':mission.type==='traffic'?'#ffd85e':'#53aaff';
 ctx.save();ctx.strokeStyle=col;ctx.lineWidth=5;ctx.globalAlpha=.9;ctx.beginPath();ctx.arc(t.x,t.y,mission.type==='pursuit'?62:90,0,TAU);ctx.stroke();ctx.globalAlpha=.14;ctx.fillStyle=col;ctx.fill();ctx.restore();
 if(mission.type==='accident'){for(let i=-1;i<=1;i++){drawSprite(A.cone,t.x+55,t.y+i*34,24,30,-Math.PI/2);drawSprite(A.skid,t.x-18+i*20,t.y+14+i*8,45,11,.25)}drawSprite(A.barrier,t.x-55,t.y,46,24,-Math.PI/2)}
 if(mission.type==='traffic')for(let i=0;i<mission.index;i++)drawSprite(A.cone,mission.points[i].x,mission.points[i].y,24,30,-Math.PI/2);
 if(mission.type==='obstacle'){drawSprite(A.barrier,t.x,t.y,52,28,-Math.PI/2);drawSprite(A.cone,t.x+35,t.y+28,22,28,-Math.PI/2)}
}
function drawArrow(){if(!mission)return;const t=missionTarget();if(!t)return;const a=Math.atan2(t.y-player.y,t.x-player.x);ctx.save();ctx.translate(player.x,player.y);ctx.rotate(a);ctx.fillStyle='rgba(255,214,91,.95)';ctx.beginPath();ctx.moveTo(96,0);ctx.lineTo(67,-13);ctx.lineTo(67,13);ctx.closePath();ctx.fill();ctx.restore()}
function drawMinimap(){const w=mm.width,h=mm.height,range=1550,sc=w*.46/range;mctx.clearRect(0,0,w,h);mctx.save();mctx.translate(w/2,h/2);mctx.scale(sc,sc);mctx.translate(-player.x,-player.y);mctx.fillStyle='#355b36';mctx.fillRect(-WORLD,-WORLD,WORLD*2,WORLD*2);mctx.fillStyle='#656b70';for(const r of roads)mctx.fillRect(r.x,r.y,r.w,r.h);if(mission){const t=missionTarget();if(t){mctx.strokeStyle='#ffda5b';mctx.lineWidth=20;mctx.globalAlpha=.55;mctx.beginPath();mctx.moveTo(player.x,player.y);mctx.lineTo(t.x,player.y);mctx.lineTo(t.x,t.y);mctx.stroke();mctx.globalAlpha=1;mctx.fillStyle='#ffda5b';mctx.beginPath();mctx.arc(t.x,t.y,30,0,TAU);mctx.fill()}}mctx.fillStyle='#49a8ff';mctx.beginPath();mctx.arc(player.x,player.y,27,0,TAU);mctx.fill();mctx.restore()}
function update(dt){
 if(state!=='playing')return;shiftTime+=dt;if(shiftTime>=SHIFT){endGame();return}
 player.update(dt);for(const c of cars)c.update(dt);updateYield();collisions();updateMission(dt);
 camera.x=lerp(camera.x,player.x,1-Math.pow(.002,dt));camera.y=lerp(camera.y,player.y,1-Math.pow(.002,dt));camera.zoom=lerp(camera.zoom,clamp(1.03-Math.abs(player.speed)/1350,.84,1.02),1-Math.pow(.03,dt));
 if(radioTimer>0&&(radioTimer-=dt)<=0)ui.radio.classList.remove('show');
 if(player.health<=0){const p=nearRoad(player.x,player.y);player.x=p.x;player.y=p.y;player.speed=0;player.health=65;radio('차량이 견인되어 65% 상태로 복귀했습니다.','#ffb074')}
 ui.speed.textContent=Math.round(Math.abs(player.speed)*.44);ui.health.textContent=Math.round(player.health)+'%';ui.health.style.color=player.health<35?'#ff6879':'#eef5ff';ui.solved.textContent=solved;ui.score.textContent=score.toFixed(1);
 const remain=Math.max(0,SHIFT-shiftTime),m=Math.floor(remain/60),s=Math.floor(remain%60);ui.shift.textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')
}
function render(){ctx.clearRect(0,0,innerWidth,innerHeight);ctx.save();ctx.translate(innerWidth/2,innerHeight/2);ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.x,-camera.y);drawWorld();drawMission();drawArrow();for(const c of cars)drawCar(c);if(player)drawCar(player,true);ctx.restore();if(player)drawMinimap()}
function loop(now){const dt=clamp((now-last)/1000,0,.05);last=now;update(dt);render();requestAnimationFrame(loop)}
function startGame(){score=0;solved=0;shiftTime=0;mission=null;missionDelay=1.1;buildWorld();player=new Player();spawnTraffic();camera.x=player.x;camera.y=player.y;camera.zoom=1;state='playing';ui.start.classList.remove('show');ui.end.classList.remove('show');setMission('순찰','근무 시작','첫 신고를 기다리며 주변을 순찰하세요.');setAction();setProgress();radio('순찰 근무를 시작합니다. 안전 운전하세요.');if(!raf){raf=true;last=performance.now();requestAnimationFrame(loop)}}
function endGame(){state='end';player.siren=false;setAction();setProgress();ui.endTitle.textContent=solved>=7?'베테랑 순찰팀':solved>=4?'안정적인 순찰 완료':'오늘의 순찰 완료';ui.endText.textContent='6분 동안 '+solved+'건을 해결하고 실적 '+score.toFixed(1)+'점을 기록했어요.';ui.end.classList.add('show')}
addEventListener('keydown',e=>{if(state!=='playing')return;const k=e.key.toLowerCase();if(k==='w'||k==='arrowup')keys.w=true;if(k==='s'||k==='arrowdown')keys.s=true;if(k==='a'||k==='arrowleft')keys.a=true;if(k==='d'||k==='arrowright')keys.d=true;if(k==='r')keys.r=true;if(k===' '&&!e.repeat){e.preventDefault();toggleSiren()}if(k==='enter'&&!e.repeat&&ui.action.onclick)ui.action.onclick();if(k==='t'&&!e.repeat)recover()});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(k==='w'||k==='arrowup')keys.w=false;if(k==='s'||k==='arrowdown')keys.s=false;if(k==='a'||k==='arrowleft')keys.a=false;if(k==='d'||k==='arrowright')keys.d=false;if(k==='r')keys.r=false});
function hold(el,key){const on=e=>{e.preventDefault();touch[key]=true},off=e=>{e.preventDefault();touch[key]=false};el.addEventListener('pointerdown',on);el.addEventListener('pointerup',off);el.addEventListener('pointercancel',off)}
hold($('#brakeBtn'),'brake');hold($('#reverseBtn'),'reverse');hold($('#boostBtn'),'boost');$('#sirenBtn').addEventListener('pointerdown',e=>{e.preventDefault();toggleSiren()});
let joyId=null;const joy=$('#joy'),knob=$('#knob');
function joyMove(e){const r=joy.getBoundingClientRect(),dx=clamp(e.clientX-(r.left+r.width/2),-36,36);touch.steer=dx/36;knob.style.transform='translate('+dx+'px,0)'}
joy.addEventListener('pointerdown',e=>{joyId=e.pointerId;joy.setPointerCapture?.(e.pointerId);joyMove(e)});joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)joyMove(e)});
function joyEnd(e){if(e.pointerId!==joyId)return;joyId=null;touch.steer=0;knob.style.transform='translate(0,0)'}
joy.addEventListener('pointerup',joyEnd);joy.addEventListener('pointercancel',joyEnd);
$('#startBtn').addEventListener('click',startGame);$('#restartBtn').addEventListener('click',startGame);
buildWorld();render();
