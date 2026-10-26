import {RoadWeaver,TOWN_TYPES,costOfRoad,pointOnPath,isWeekend} from './sim-core.mjs';

const $=id=>document.getElementById(id);
const canvas=$('map'),ctx=canvas.getContext('2d',{alpha:false});
let sim=new RoadWeaver();
let paused=true,speed=1,mode='road',lanes=2,zoom=1;
let cam={x:540,y:360},scale=1,dpr=1,viewW=1,viewH=1;
let draft=null,pending=null,active=new Map(),gesture=null;
let accumulator=0,lastFrame=0,lastUi=0,lastSave=0,toastUntil=0;
let guideCache='',saveAvailable=false,sessionStarted=false,suppressGesture=false,confirmNewCity=false;
const STORAGE_KEY='kidscade_game_v1:high_road_weaver:world';
const imageRoot='../../assets/game/2d/vehicles/pixel/cars/';
const sprites={};
const terrainTiles={};
for(const name of ['land_grass01','land_grass05','land_grass09']){
  const image=new Image();
  image.src='../../assets/game/2d/racing/kenney-racing-pack/tiles/grass/'+name+'.png';
  image.onload=()=>render();
  terrainTiles[name]=image;
}
for(const name of ['sedan','sedan-blue','taxi','rounded-green','suv','truck','truckdelivery','bus','van-small','tractor']){
  const img=new Image();img.src=imageRoot+name+'.png';img.onload=()=>render();
  sprites[name]=img;
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function safeRead(){
  try{const raw=localStorage.getItem(STORAGE_KEY);return raw?JSON.parse(raw):null;}catch(_){return null;}
}
function save(){
  if(!sessionStarted)return;
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(sim.snapshot()));saveAvailable=true;}catch(_){}
}
function notice(message){
  const el=$('toast');el.textContent=message;el.classList.add('show');toastUntil=performance.now()+3300;
}
function resize(){
  const r=canvas.getBoundingClientRect();viewW=r.width;viewH=r.height;
  dpr=Math.min(2,devicePixelRatio||1);
  canvas.width=Math.max(1,Math.floor(r.width*dpr));
  canvas.height=Math.max(1,Math.floor(r.height*dpr));
  render();
}
function currentScale(){return Math.min(viewW/1080,viewH/720)*zoom;}
function worldOf(clientX,clientY){
  const r=canvas.getBoundingClientRect(),s=currentScale();
  return {x:cam.x+(clientX-r.left-r.width/2)/s,y:cam.y+(clientY-r.top-r.height/2)/s};
}
function worldAtScreen(x,y){const s=currentScale();return {x:cam.x+(x-viewW/2)/s,y:cam.y+(y-viewH/2)/s};}
function moveCameraFromDrag(dx,dy){
  const s=currentScale();cam.x-=dx/s;cam.y-=dy/s;clampCamera();
}
function clampCamera(){
  cam.x=clamp(cam.x,100,980);cam.y=clamp(cam.y,75,645);
}
function setZoom(newZoom,x=viewW/2,y=viewH/2){
  const before=worldAtScreen(x,y);zoom=clamp(newZoom,.72,3.6);
  const after=worldAtScreen(x,y);cam.x+=before.x-after.x;cam.y+=before.y-after.y;clampCamera();
}
function showOverlay(id,show=true){$(id).classList.toggle('hidden',!show);}
function setMode(next){
  mode=next;pending=null;draft=null;
  document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.mode===next));
  const hints={
    road:'시작점부터 끝점까지 드래그하거나, 시작과 끝을 차례로 누르세요.',
    overpass:'고가도로는 다른 도로 위를 지나가요. 진출입로를 그려 연결해 주세요.',
    ramp:'먼저 지상 도로에서 출발해 고가도로까지 진출입로를 그리세요.',
    roundabout:'지상 도로가 만나는 교차로를 눌러 회전교차로를 설치하세요.',
    island:'교차로의 우회전할 모퉁이를 누르면 우회전 전용 차로가 생겨요.',
    widen:'넓히고 싶은 도로를 눌러 주세요. 자재가 필요해요.',
    light:'교차로를 누르면 신호등을 설치하거나 철거할 수 있어요.',
    pan:'화면을 드래그해서 지도를 이동하세요. 손가락 두 개로 확대할 수 있어요.'
  };
  $('editHint').textContent=hints[next];
}
function setLanes(n){
  lanes=n;document.querySelectorAll('[data-lanes]').forEach(b=>b.classList.toggle('selected',+b.dataset.lanes===n));
  setMode('road');
}
const drawingMode=()=>mode==='road'||mode==='overpass'||mode==='ramp';
function finishBuild(points){
  const kind=mode==='overpass'?'bridge':mode==='ramp'?'ramp':'ground';
  const crossings=sim.previewCrossings(points,kind);
  const result=sim.addRoad(points,kind==='ramp'?2:lanes,kind);
  if(result.ok){
    const hint=crossings.length?' 교차로가 '+crossings.length+'곳 생겼어요. 차량 흐름을 살펴보세요.':'';
    notice((kind==='bridge'?'고가도로':kind==='ramp'?'진출입로':'도로')+' 완성! 자재 '+result.cost+'을 사용했어요.'+hint);
    save();
  }
  else notice(result.reason);
}
function applyEdit(p){
  let result;
  if(mode==='widen')result=sim.widenRoad(p);
  if(mode==='light')result=sim.toggleLight(p);
  if(mode==='roundabout')result=sim.addRoundabout(p);
  if(mode==='island')result=sim.addTrafficIsland(p);
  if(result){
    notice(result.ok?(mode==='widen'?'차로를 넓혔어요.':mode==='light'?'신호등을 바꿨어요.':mode==='island'?'교통섬과 우회전 전용 차로가 생겼어요.':result.lanes===4?'넓은 회전교차로를 만들었어요. 차가 계속 몰리면 우회도로도 고려해 보세요.':'회전교차로를 만들었어요. 차량이 원형 차로를 따라 이동해요.'):result.reason);
    if(result.ok)save();
  }
}
function stopDraft(){draft=null;pending=null;gesture=null;active.clear();suppressGesture=false;}
canvas.addEventListener('pointerdown',event=>{
  event.preventDefault();
  canvas.setPointerCapture(event.pointerId);
  const p=worldOf(event.clientX,event.clientY);
  active.set(event.pointerId,{clientX:event.clientX,clientY:event.clientY,startX:event.clientX,startY:event.clientY,world:p,moved:false});
  if(active.size===2){
    suppressGesture=true;draft=null;pending=null;
    const a=[...active.values()],midX=(a[0].clientX+a[1].clientX)/2,midY=(a[0].clientY+a[1].clientY)/2;
    gesture={distance:Math.hypot(a[0].clientX-a[1].clientX,a[0].clientY-a[1].clientY),zoom,anchor:worldOf(midX,midY)};
  }else if(active.size===1&&drawingMode()){
    draft=[sim.snap(p,mode==='overpass'?1:0)];
  }
});
canvas.addEventListener('pointermove',event=>{
  const state=active.get(event.pointerId);if(!state)return;
  const dx=event.clientX-state.clientX,dy=event.clientY-state.clientY;
  state.clientX=event.clientX;state.clientY=event.clientY;
  if(Math.hypot(event.clientX-state.startX,event.clientY-state.startY)>8)state.moved=true;
  if(active.size===2&&gesture){
    const a=[...active.values()],dist=Math.hypot(a[0].clientX-a[1].clientX,a[0].clientY-a[1].clientY);
    const midX=(a[0].clientX+a[1].clientX)/2,midY=(a[0].clientY+a[1].clientY)/2;
    zoom=clamp(gesture.zoom*dist/Math.max(4,gesture.distance),.72,3.6);
    const after=worldOf(midX,midY);
    cam.x+=gesture.anchor.x-after.x;cam.y+=gesture.anchor.y-after.y;clampCamera();return;
  }
  if(mode==='pan'){moveCameraFromDrag(dx,dy);return;}
  if(drawingMode()&&draft&&state.moved){
    const p=worldOf(event.clientX,event.clientY);
    if(distance(p,draft.at(-1))>8)draft.push(p);
  }
});
function pointerEnd(event,cancel=false){
  const state=active.get(event.pointerId);if(!state)return;
  active.delete(event.pointerId);
  if(suppressGesture){
    if(active.size===0){suppressGesture=false;gesture=null;}
    draft=null;return;
  }
  if(gesture||active.size){
    if(active.size<2)gesture=null;
    draft=null;
    return;
  }
  if(cancel){draft=null;pending=null;return;}
  const p=worldOf(event.clientX,event.clientY);
  if(drawingMode()){
    if(state.moved&&draft&&draft.length>=1){
      const path=[...draft,p];draft=null;pending=null;finishBuild(path);
    }else if(pending){
      const from=pending;pending=null;draft=null;finishBuild([from,p]);
    }else{
      pending=sim.snap(p,mode==='overpass'?1:0);draft=null;notice('시작점을 골랐어요. 이제 끝점을 눌러 주세요.');
    }
  }else if(mode!=='pan'&&!state.moved)applyEdit(p);
}
canvas.addEventListener('pointerup',e=>pointerEnd(e));
canvas.addEventListener('pointercancel',e=>pointerEnd(e,true));
canvas.addEventListener('wheel',event=>{
  event.preventDefault();
  const r=canvas.getBoundingClientRect();
  setZoom(zoom*(event.deltaY>0?.89:1.12),event.clientX-r.left,event.clientY-r.top);
},{passive:false});
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
document.querySelectorAll('[data-lanes]').forEach(b=>b.addEventListener('click',()=>setLanes(+b.dataset.lanes)));
$('zoomIn').addEventListener('click',()=>setZoom(zoom*1.18));
$('zoomOut').addEventListener('click',()=>setZoom(zoom/1.18));
$('resetView').addEventListener('click',()=>{zoom=1;cam={x:540,y:360};});
$('pauseBtn').addEventListener('click',()=>{paused=!paused;refreshButtons();});
$('speedBtn').addEventListener('click',()=>{speed=speed===1?2:speed===2?3:1;refreshButtons();});
$('undoBtn').addEventListener('click',()=>{const r=sim.undo();notice(r.ok?'마지막 작업을 되돌렸어요.':r.reason);if(r.ok)save();});
$('helpBtn').addEventListener('click',()=>showOverlay('help'));
$('closeHelp').addEventListener('click',()=>showOverlay('help',false));
function startNew(){confirmNewCity=false;sessionStarted=true;sim=new RoadWeaver();zoom=1;cam={x:540,y:360};paused=false;speed=1;stopDraft();save();showOverlay('intro',false);refreshButtons();notice('두 도시 사이에 도로를 그려 보세요.');}
$('startBtn').addEventListener('click',()=>{
  if(saveAvailable&&!confirmNewCity){
    confirmNewCity=true;
    $('overwriteWarning').classList.remove('hidden');
    $('startBtn').textContent='이전 도시를 지우고 새로 시작';
    $('continueBtn').classList.remove('hidden');
    return;
  }
  startNew();
});
$('continueBtn').addEventListener('click',()=>{
  const data=safeRead();
  if(!sim.restore(data)){notice('저장 기록을 불러올 수 없어 새 도시를 시작합니다.');startNew();return;}
  sessionStarted=true;paused=false;stopDraft();showOverlay('intro',false);refreshButtons();notice('이전 도로망을 불러왔어요.');
});
window.addEventListener('keydown',event=>{
  if(event.key==='Escape'){pending=null;draft=null;showOverlay('help',false);}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){
    event.preventDefault();$('undoBtn').click();
  }
  if(event.target instanceof HTMLButtonElement)return;
  if(event.key===' '){event.preventDefault();$('pauseBtn').click();}
  if(event.key==='2'||event.key==='4'||event.key==='6')setLanes(+event.key);
});
window.addEventListener('pagehide',save);
document.addEventListener('visibilitychange',()=>{if(document.hidden){save();paused=true;refreshButtons();}});
function refreshButtons(){
  $('pauseBtn').textContent=paused?'▶':'Ⅱ';
  $('pauseBtn').title=paused?'재개':'일시정지';
  $('speedBtn').textContent='×'+speed;
}
function drawPath(points){
  ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
}
function drawRoad(road,alpha=1){
  const pts=road.points,w=road.lanes*11+6;
  const bridge=road.kind==='bridge',ramp=road.kind==='ramp',circle=road.kind==='roundabout',slip=road.kind==='slip';
  ctx.save();ctx.globalAlpha=alpha;ctx.lineJoin='round';ctx.lineCap='round';
  if(bridge){
    ctx.save();ctx.translate(5,9);drawPath(pts);ctx.strokeStyle='rgba(48,53,62,.37)';ctx.lineWidth=w+16;ctx.stroke();ctx.restore();
  }
  drawPath(pts);ctx.strokeStyle=bridge?'#9ea9b1':circle?'#769a81':slip?'#d2ad6d':'#627469';ctx.lineWidth=w+6;ctx.stroke();
  drawPath(pts);ctx.strokeStyle=bridge?'#637483':ramp?'#737f88':circle?'#5b6965':slip?'#75716b':'#606b70';ctx.lineWidth=w;ctx.stroke();
  if(circle){
    offsetLine(pts,-w/2+3,'#d0dbd1',1.8,[6,8]);
    // 넓은 회전교차로의 두 순환 차로가 시각적으로도 구분되도록 차선 경계선을 긋는다.
    if(road.lanes===4)offsetLine(pts,0,'#d7e1d8',1.5,[5,7]);
    ctx.restore();return;
  }
  drawPath(pts);ctx.strokeStyle=bridge?'#f9ecbb':'#f4e3a2';ctx.lineWidth=2.2;ctx.setLineDash(ramp?[5,9]:[12,10]);ctx.stroke();ctx.setLineDash([]);
  if(slip){const pos=pointOnPath(pts,road.length/2);ctx.save();ctx.translate(pos.x,pos.y);ctx.rotate(pos.angle);ctx.fillStyle='#fff4d4';ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(-6,-5);ctx.lineTo(-6,5);ctx.closePath();ctx.fill();ctx.restore();}
  for(const side of [-1,1]){
    const outer=w/2-2;offsetLine(pts,side*outer,bridge?'#d8e4e9':'#b8c5c2',1.3,[]);
    for(let x=1;x<road.lanes/2;x++)offsetLine(pts,side*(x*11+4),'#d9dfdd',1.1,[7,9]);
  }
  ctx.restore();
}
function offsetLine(pts,offset,color,width,dash){
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);
  ctx.beginPath();
  for(let i=0;i<pts.length;i++){
    const prev=pts[Math.max(0,i-1)],next=pts[Math.min(pts.length-1,i+1)];
    const dx=next.x-prev.x,dy=next.y-prev.y,mag=Math.hypot(dx,dy)||1;
    const x=pts[i].x-dy/mag*offset,y=pts[i].y+dx/mag*offset;
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.stroke();ctx.restore();
}
function rounded(x,y,w,h,r,fill){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();
}
function drawGrass(){
  ctx.fillStyle='#d3e8c9';ctx.fillRect(0,0,1080,720);
  // 기존 Kenney Racing Pack 잔디 타일을 얇게 섞어 도로가 놓이는 들판의 질감을 유지한다.
  const tileNames=['land_grass01','land_grass05','land_grass09'];
  ctx.save();ctx.globalAlpha=.28;ctx.imageSmoothingEnabled=false;
  for(let row=0;row<9;row++)for(let col=0;col<14;col++){
    const img=terrainTiles[tileNames[(row*7+col*5)%3]];
    if(img&&img.complete&&img.naturalWidth)ctx.drawImage(img,col*80,row*80,80,80);
  }
  ctx.restore();
  for(let i=0;i<165;i++){
    const x=(i*319.3+73)%1080,y=(i*169.7+47)%720;
    ctx.beginPath();ctx.ellipse(x,y,9+i%5*3,5+i%3*4,(i%7)*.5,0,Math.PI*2);
    ctx.fillStyle=i%3===0?'#c8e0bf':'#ddebce';ctx.fill();
  }
  // 설계망 밖에도 도시 외곽 풍경이 이어지는 느낌을 줍니다.
  ctx.strokeStyle='rgba(121,169,128,.21)';ctx.lineWidth=1;
  for(let x=0;x<=1080;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,720);ctx.stroke();}
  for(let y=0;y<=720;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1080,y);ctx.stroke();}
}
function drawTrees(cx,cy,spread){
  for(let i=0;i<18;i++){
    const angle=i*2.399,r=spread*(.65+(i%4)*.16),x=cx+Math.cos(angle)*r,y=cy+Math.sin(angle)*r;
    ctx.beginPath();ctx.arc(x,y,3+i%3,0,Math.PI*2);ctx.fillStyle=i%3?'#94bd83':'#76ad78';ctx.fill();
  }
}
function drawCity(t,index){
  const near=76;
  ctx.save();
  ctx.beginPath();ctx.arc(t.x,t.y,near,0,Math.PI*2);
  ctx.fillStyle=t.color+'19';ctx.fill();
  ctx.strokeStyle=t.color;ctx.lineWidth=2.4;ctx.setLineDash([7,7]);ctx.stroke();ctx.setLineDash([]);
  drawTrees(t.x,t.y,93);
  const cx=t.x,cy=t.y;
  ctx.save();ctx.translate(cx,cy);
  if(t.id==='farm'){
    // 밭의 고랑과 창고를 그려 납품 트럭이 출발하는 농업지역임을 알 수 있다.
    ctx.save();ctx.translate(-4,-9);ctx.rotate(-.24);
    rounded(-51,-27,99,53,7,'#b4cb79');
    for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(-44,i*9);ctx.lineTo(40,i*9);ctx.strokeStyle=i%2?'#e2d39d':'#78a36b';ctx.lineWidth=5;ctx.stroke();}
    ctx.restore();
    rounded(-15,13,42,29,4,'#dcaf7c');ctx.fillStyle='#ab6f54';
    ctx.beginPath();ctx.moveTo(-21,14);ctx.lineTo(6,-3);ctx.lineTo(31,14);ctx.closePath();ctx.fill();
    rounded(9,24,10,18,2,'#916c4b');
    rounded(32,-40,16,33,4,'#d4e2dd');
    rounded(30,-43,20,6,2,'#90ada4');
  }else if(t.id==='tourism'){
    ctx.beginPath();ctx.ellipse(0,34,51,21,-.05,0,Math.PI*2);ctx.fillStyle='#b5dbd7';ctx.fill();
    ctx.fillStyle='#a0bda9';
    for(const [x,h] of [[-40,41],[-8,55],[30,37]]){
      ctx.beginPath();ctx.moveTo(x-28,15);ctx.lineTo(x,-h);ctx.lineTo(x+27,15);ctx.closePath();ctx.fill();
    }
    ctx.fillStyle='#e3eddf';ctx.beginPath();ctx.moveTo(-18,-35);ctx.lineTo(-8,-55);ctx.lineTo(3,-33);ctx.closePath();ctx.fill();
    for(const [x,y] of [[-55,18],[48,-13],[54,18]]){
      ctx.fillStyle='#7fb49a';ctx.beginPath();ctx.moveTo(x-9,y+12);ctx.lineTo(x,y-19);ctx.lineTo(x+9,y+12);ctx.fill();
    }
    ctx.fillStyle='#efc67b';ctx.beginPath();ctx.moveTo(-24,25);ctx.lineTo(-10,4);ctx.lineTo(5,25);ctx.closePath();ctx.fill();
  }else if(t.id==='market'){
    rounded(-54,-39,109,56,7,'#e9ded0');
    rounded(-50,-45,100,17,5,'#bb7271');
    rounded(-36,-22,71,22,2,'#cee5e8');
    rounded(-14,0,26,17,2,'#91a7ae');
    rounded(-59,24,119,30,5,'#a4b0ab');
    ctx.strokeStyle='#f2f5ed';ctx.lineWidth=2;
    for(let i=-4;i<=4;i++){ctx.beginPath();ctx.moveTo(i*11,30);ctx.lineTo(i*11+6,48);ctx.stroke();}
    rounded(-38,35,15,7,3,'#e8a875');
    rounded(18,36,14,7,3,'#779bc3');
  }else{
    const floors=index===1?3:index===2?2:1;
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4+.3,r=28+(i%3)*4,x=Math.cos(a)*r,y=Math.sin(a)*r;
      const w=index===1?19:20,h=index===1?26:19;
      rounded(x-w/2+3,y-h/2+5,w,h,3,'#9bae9f');
      rounded(x-w/2,y-h/2,w,h,3,index===0?'#f5e0ad':index===1?'#c2b4d4':index===2?'#b4b7b6':'#f1d9a5');
      ctx.fillStyle=index===1?'#8f78b5':index===2?'#b47d62':'#c9816a';
      ctx.fillRect(x-w/2+3,y-h/2+3,w-6,4+floors);
      if(index===2){ctx.fillStyle='#77929a';ctx.fillRect(x+w/2-5,y-h/2-9,4,10);}
    }
  }
  ctx.restore();
  ctx.beginPath();ctx.arc(cx,cy,17,0,Math.PI*2);ctx.fillStyle=t.color;ctx.fill();
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='bold 16px system-ui';
  const icons={home:'⌂',office:'▦',factory:'⚙',mall:'▤',farm:'✿',tourism:'▲',market:'▣'};
  ctx.fillText(icons[t.id]||'⌂',cx,cy+1);
  ctx.font='bold 15px system-ui';
  const w=Math.max(113,ctx.measureText(t.name).width+28);
  const labelY=cy>575?cy-116:cy+83;
  // 지도를 전체 보기로 표시하는 휴대전화에서도 지구 이름이 읽히도록 라벨만 확대한다.
  const labelScale=viewW<=600?Math.min(1.75,Math.max(1,0.64/scale)):1;
  ctx.save();ctx.translate(cx,labelY+17);ctx.scale(labelScale,labelScale);
  rounded(-w/2,-17,w,34,10,'rgba(255,255,251,.96)');
  ctx.fillStyle='#254b3b';ctx.fillText(t.name,0,0);
  ctx.restore();
  ctx.restore();
}
function drawParkedCar(x,y,name,angle=0){
  const image=sprites[name];
  if(!image||!image.complete||!image.naturalWidth)return;
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  ctx.imageSmoothingEnabled=false;ctx.globalAlpha=.88;
  ctx.drawImage(image,-7,-12,14,24);
  ctx.restore();
}
function drawDistrictLife(){
  for(const t of sim.towns){
    if(t.id==='market'){
      drawParkedCar(t.x-31,t.y+41,'sedan-blue');
      drawParkedCar(t.x+31,t.y+41,'suv');
      drawParkedCar(t.x+5,t.y+41,'taxi');
    }else if(t.id==='farm'){
      drawParkedCar(t.x+53,t.y+39,'tractor',-.22);
      drawParkedCar(t.x-54,t.y+44,'truck',.24);
    }else if(t.id==='tourism'){
      drawParkedCar(t.x+54,t.y+43,'bus',-.12);
    }
  }
}
function drawRoundaboutCenters(){
  for(const circle of sim.roundabouts){
    ctx.save();
    ctx.beginPath();ctx.arc(circle.x,circle.y,circle.radius-(circle.lanes===4?29:14),0,Math.PI*2);
    ctx.fillStyle='#95c78b';ctx.fill();ctx.strokeStyle='#cfddd0';ctx.lineWidth=2;ctx.stroke();
    ctx.beginPath();ctx.arc(circle.x,circle.y,11,0,Math.PI*2);ctx.fillStyle='#70a875';ctx.fill();
    ctx.strokeStyle='rgba(250,255,245,.9)';ctx.lineWidth=2;
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2+.3,x=circle.x+Math.cos(a)*(circle.radius-1),y=circle.y+Math.sin(a)*(circle.radius-1);
      ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI/2);
      ctx.beginPath();ctx.moveTo(-4,4);ctx.lineTo(0,-3);ctx.lineTo(4,4);ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
}
function drawSignals(){
  for(const n of sim.nodes.values()){
    if(n.level!==0||sim.roundabouts.some(c=>distance(n,c)<c.radius+8))continue;
    if((sim.adj.get(n.id)||[]).length<3)continue;
    const active=sim.lights.has(n.id);
    ctx.beginPath();ctx.arc(n.x,n.y,active?10:5,0,Math.PI*2);
    ctx.fillStyle=active?'#254943':'#a0b3ad';ctx.fill();
    if(active){
      ctx.beginPath();ctx.arc(n.x,n.y,4,0,Math.PI*2);
      ctx.fillStyle=Math.floor(sim.tickTime/6)%2===0?'#8ceb9b':'#eebd62';ctx.fill();
    }
  }
}
function drawCongestion(){
  // 플레이어에게 교통량 숫자를 보여주는 대신 실제 느린 차가 모인 자리만 시각화한다.
  // 막 출발한 차는 제외해 도시 출입구 전체가 계속 붉게 보이지 않도록 한다.
  ctx.save();
  for(const c of sim.cars){
    if(c.s<26||c.speed>=c.maxSpeed*.32)continue;
    const p=sim.sampleCar(c);
    const radius=c.speed<4?17:12;
    ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);
    ctx.fillStyle=c.speed<4?'rgba(219,101,75,.13)':'rgba(230,160,66,.09)';
    ctx.fill();
  }
  ctx.restore();
}
function drawCar(c){
  const p=sim.sampleCar(c),name=c.kind==='tractor'?'tractor':c.kind==='bus'?'bus':
    c.kind==='truck'?(Number(c.id.slice(1))%2?'truck':'truckdelivery'):
    ['sedan','sedan-blue','taxi','rounded-green','suv','van-small'][Number(c.id.slice(1))%6];
  const img=sprites[name],long=['truck','tractor','bus'].includes(c.kind);
  // 한눈에 보는 작은 화면에서는 자동차가 4px짜리 점으로 사라지지 않게 표시 크기를 보정한다.
  const mobileScale=viewW<=600?Math.min(1.55,Math.max(1,.62/scale)):1;
  const w=(long?14:12)*mobileScale,h=(long?26:21)*mobileScale;
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle+Math.PI/2);
  ctx.fillStyle='rgba(32,45,37,.28)';ctx.beginPath();ctx.ellipse(2,2,w/2+1,h/2,0,0,Math.PI*2);ctx.fill();
  if(img&&img.complete&&img.naturalWidth){
    ctx.imageSmoothingEnabled=false;ctx.drawImage(img,-w/2,-h/2,w,h);
  }else{
    rounded(-w/2,-h/2,w,h,3,c.kind==='tractor'?'#aac774':long?'#d9b576':'#f0e5d3');
    rounded(-w/2+2,-h/2+4,w-4,5,1,'#8ca8b6');
  }
  ctx.restore();
}
function drawDraft(){
  const pts=draft&&draft.length?draft:pending?[pending]:null;
  if(!pts)return;
  ctx.save();
  if(pts.length>=2){
    const selectedLanes=mode==='ramp'?2:lanes;
    const cost=Math.ceil(costOfRoad(pts,selectedLanes)*(mode==='overpass'?1.75:mode==='ramp'?1.4:1)),bad=cost>sim.budget;
    drawPath(pts);
    ctx.strokeStyle=bad?'#bd605d':mode==='overpass'?'#4c78c5':mode==='ramp'?'#da9b52':'#3eab8a';
    ctx.lineWidth=selectedLanes*11+6;ctx.globalAlpha=.38;ctx.setLineDash([15,8]);ctx.stroke();ctx.setLineDash([]);
    const last=pts.at(-1);rounded(last.x-36,last.y-54,72,27,7,bad?'#8d3f41':'#286850');
    ctx.fillStyle='#fff';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText('자재 '+cost,last.x,last.y-37);
    const kind=mode==='overpass'?'bridge':mode==='ramp'?'ramp':'ground';
    const crossings=sim.previewCrossings(pts,kind);
    if(crossings.length){
      for(const p of crossings){
        ctx.beginPath();ctx.arc(p.x,p.y,18,0,Math.PI*2);
        ctx.fillStyle='rgba(242,169,58,.26)';ctx.fill();
        ctx.lineWidth=3;ctx.strokeStyle='#cc7b28';ctx.stroke();
      }
      rounded(last.x-58,last.y-89,116,28,7,'#875727');
      ctx.fillStyle='#fff';ctx.fillText('교차로 '+crossings.length+'곳 예상',last.x,last.y-71);
    }
  }else{
    ctx.beginPath();ctx.arc(pts[0].x,pts[0].y,16,0,Math.PI*2);ctx.strokeStyle='#25845e';ctx.lineWidth=4;ctx.stroke();
  }
  ctx.restore();
}
function render(){
  if(!viewW||!viewH)return;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,viewW,viewH);
  ctx.fillStyle='#d5e8cb';ctx.fillRect(0,0,viewW,viewH);
  scale=currentScale();
  ctx.save();ctx.translate(viewW/2,viewH/2);ctx.scale(scale,scale);ctx.translate(-cam.x,-cam.y);
  drawGrass();
  for(const old of sim.oldRoads)for(const e of old.edges)drawRoad(e,.12);
  for(const e of sim.edges.filter(e=>e.kind!=='bridge'))drawRoad(e);
  for(const e of sim.edges.filter(e=>e.kind==='bridge'))drawRoad(e);
  drawRoundaboutCenters();
  drawSignals();
  sim.towns.forEach(drawCity);
  drawDistrictLife();
  drawCongestion();
  for(const c of sim.cars)drawCar(c);
  drawDraft();
  ctx.restore();
}
function updateHud(now){
  const hr=Math.floor(sim.minutes/60),min=Math.floor(sim.minutes%60);
  $('clock').textContent=String(hr).padStart(2,'0')+':'+String(min).padStart(2,'0');
  const weekday=['월','화','수','목','금','토','일'][(sim.day-1)%7];
  $('day').textContent=sim.day+'일째 · '+weekday+'요일';
  $('budget').textContent=sim.budget;
  const traffic=sim.trafficOverview();
  $('flow').textContent=traffic.flow;
  $('queueState').textContent=traffic.queue;
  const peak=sim.peak;
  $('timePhase').textContent=peak==='출근'?'출근':peak==='퇴근'?'퇴근':hr>=6&&hr<18?'낮':'밤';
  $('timePhase').style.background=peak==='일상'?'#dbead9':'#f5dba3';
  const canRoute=sim.route(sim.towns[0],sim.towns[1]);
  const disconnected=canRoute?sim.towns.slice(2).find(t=>!sim.route(sim.towns[0],t)):null;
  let title='',description='',label='오늘의 설계';
  if(!canRoute){
    title='두 도시를 이어 주세요.';description='햇살마을과 중앙업무지구를 도로로 연결하세요.';
  }else if(disconnected){
    title=disconnected.name+'에 길이 필요해요.';
    description=disconnected.type+'의 새로운 교통 흐름을 살펴보도록 기존 도로망에 연결하세요.';
  }else if(isWeekend(sim.day)&&sim.towns.some(t=>t.id==='tourism')&&hr>=8&&hr<20){
    title='주말 관광길에 차가 몰려요.';
    description='관광지구로 향하는 차들이 줄을 서는 곳을 찾아보세요.';
  }else if(sim.towns.some(t=>t.id==='farm')&&hr>=5&&hr<8){
    title='농산물이 출발하는 새벽이에요.';
    description='농업지구에서 출하 차량이 막힘없이 이동하는지 살펴보세요.';
  }else if(peak==='출근'){
    title='출근길이 붐비고 있어요.';description='사무지구로 향하는 자동차의 줄을 살펴보세요.';
  }else if(peak==='퇴근'){
    title='집으로 돌아오는 시간이에요.';description='아침과 반대 방향에서 길이 막히지 않는지 확인해 보세요.';
  }else{
    title='차량의 흐름을 살펴보세요.';description='도로를 추가하거나 차선을 넓혀 병목을 해결할 수 있어요.';
  }
  const str=label+'|'+title+'|'+description;
  if(guideCache!==str){$('guideLabel').textContent=label;$('guideTitle').textContent=title;$('guideText').textContent=description;guideCache=str;}
  if(now>toastUntil)$('toast').classList.remove('show');
}
function loop(time){
  const dt=Math.min(.08,Math.max(0,(time-lastFrame)/1000||0));lastFrame=time;
  if(!paused&&$('intro').classList.contains('hidden')&&$('help').classList.contains('hidden')){
    accumulator=Math.min(.15,accumulator+dt*speed);
    while(accumulator>=1/30){sim.update(1/30);accumulator-=1/30;}
    if(sim.announcements.length){for(const n of sim.announcements.splice(0))notice(n);save();}
  }
  if(time-lastUi>160){updateHud(time);lastUi=time;}
  if(time-lastSave>6500&&!paused){save();lastSave=time;}
  render();requestAnimationFrame(loop);
}
const stored=safeRead();saveAvailable=Boolean(stored&&[1,2,3].includes(stored.version));
$('continueBtn').classList.toggle('hidden',!saveAvailable);
resize();window.addEventListener('resize',resize,{passive:true});
refreshButtons();requestAnimationFrame(loop);
