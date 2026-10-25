(function(){
  'use strict';
  const C=window.AirTrafficCore;
  if(!C)return;
  const $=id=>document.getElementById(id), canvas=$('radar'),g=canvas.getContext('2d');
  const W=C.WIDTH,H=C.HEIGHT;
  let game=null,preview='practice',paused=false,speed=1,lastFrame=0,accumulator=0,uiTime=0;
  let startPointer=null,reported=false,lastDelivered=0,lastWarnings=0;
  const safeText=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function sdk(method,...args){try{if(window.KidscadeGame&&typeof window.KidscadeGame[method]==='function')return window.KidscadeGame[method](...args);}catch(e){console.warn('관제 기록 연동',e.message);}}
  function fmt(t){t=Math.max(0,Math.ceil(t));return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');}
  function line(x1,y1,x2,y2,color,width=1,dash=[]){g.beginPath();g.setLineDash(dash);g.strokeStyle=color;g.lineWidth=width;g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();g.setLineDash([]);}
  function label(text,x,y,color='#8ac5c6',size=12,align='left'){g.font='600 '+size+'px system-ui, sans-serif';g.textAlign=align;g.fillStyle=color;g.fillText(text,x,y);}
  function polygon(pts,fill){g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.fillStyle=fill;g.fill();}
  function drawBackdrop(map){
    g.clearRect(0,0,W,H);g.fillStyle='#071f29';g.fillRect(0,0,W,H);
    if(map.backdrop==='forest'){
      polygon([[0,110],[175,72],[250,131],[204,218],[79,280],[0,243]],'#092c32');
      polygon([[960,260],[834,280],[805,375],[882,500],[960,480]],'#0b3438');
      polygon([[170,640],[217,517],[305,538],[363,640]],'#0b3035');
    }else if(map.backdrop==='coast'){
      polygon([[0,0],[580,0],[538,82],[475,121],[430,173],[366,184],[330,254],[259,285],[253,370],[190,414],[123,480],[0,450]],'#122e36');
      polygon([[620,640],[678,501],[757,448],[873,480],[960,563],[960,640]],'#0c303c');
      for(let i=0;i<6;i++)line(0,86+i*74,960,66+i*74,'#0c3340',1);
    }else{
      polygon([[0,0],[960,0],[960,640],[0,640]],'#0b2b34');
      for(let i=-500;i<1300;i+=68)line(i,0,i+340,640,'#11353c',2);
      for(let i=-180;i<800;i+=91)line(0,i,960,i+145,'#12333d',3);
    }
    const fade=g.createRadialGradient(480,320,30,480,320,590);
    fade.addColorStop(0,'rgba(20,73,82,.15)');fade.addColorStop(1,'rgba(0,4,13,.5)');
    g.fillStyle=fade;g.fillRect(0,0,W,H);
    for(let x=0;x<=W;x+=40)line(x,0,x,H,'rgba(102,186,171,.09)');
    for(let y=0;y<=H;y+=40)line(0,y,W,y,'rgba(102,186,171,.09)');
    for(let r=115;r<590;r+=115){g.beginPath();g.arc(W/2,H/2,r,0,Math.PI*2);g.lineWidth=1;g.strokeStyle='rgba(110,215,190,.115)';g.stroke();}
    line(W/2,0,W/2,H,'rgba(133,226,206,.22)');
    line(0,H/2,W,H/2,'rgba(133,226,206,.22)');
    label('N',480,34,'#74b4ad',14,'center');label('S',480,616,'#74b4ad',14,'center');
  }
  function drawSweep(t){
    const a=(t*.00036)% (Math.PI*2);g.save();g.translate(480,320);g.rotate(a);
    const grd=g.createLinearGradient(0,0,460,0);grd.addColorStop(0,'rgba(50,223,182,0)');grd.addColorStop(1,'rgba(67,226,177,.20)');
    g.beginPath();g.moveTo(0,0);g.arc(0,0,520,-.3,0);g.closePath();g.fillStyle=grd;g.fill();
    line(0,0,520,0,'rgba(111,242,189,.4)',1.5);g.restore();
  }
  function drawGate(gate){
    g.save();g.translate(gate.x,gate.y);
    g.beginPath();g.arc(0,0,12,0,Math.PI*2);g.strokeStyle='#4cbbd1';g.lineWidth=1.7;g.stroke();
    g.beginPath();g.arc(0,0,5,0,Math.PI*2);g.fillStyle='#59b9cb';g.fill();
    g.restore();
    const x=Math.min(W-55,Math.max(55,gate.x)),y=Math.min(H-27,Math.max(28,gate.y+(gate.id==='N'?30:gate.id==='S'?-24:28)));
    label(gate.name,x,y,'#8fc7d2',11,'center');
  }
  function drawAirport(a){
    g.save();g.translate(a.x,a.y);g.rotate(a.angle);
    g.beginPath();g.arc(0,0,47,0,Math.PI*2);g.strokeStyle='rgba(109,236,198,.23)';g.lineWidth=1.5;g.stroke();
    g.fillStyle='#123e4c';g.strokeStyle='#8bd9c1';g.lineWidth=2;
    g.beginPath();g.roundRect(-55,-10,110,20,4);g.fill();g.stroke();
    for(let i=-44;i<50;i+=15)line(i,0,i+8,0,'#d4f9d3',2);
    g.restore();
    g.beginPath();g.arc(a.x,a.y,23,0,Math.PI*2);g.setLineDash([4,6]);g.strokeStyle='rgba(137,237,182,.55)';g.stroke();g.setLineDash([]);
    label(a.id,a.x,a.y-66,'#cbf9db',15,'center');label(a.name,a.x,a.y+70,'#93bfbf',12,'center');
    if(a.busyUntil && game && a.busyUntil>game.elapsed)label('활주로 사용 중',a.x,a.y+88,'#ffca83',10,'center');
  }
  function drawZones(zones){
    zones.forEach(z=>{
      const x=z.x-z.w/2,y=z.y-z.h/2;
      g.fillStyle=z.kind==='weather'?'rgba(50,134,162,.18)':'rgba(204,74,88,.14)';
      g.fillRect(x,y,z.w,z.h);
      g.strokeStyle=z.kind==='weather'?'#63aec5':'#f28988';g.lineWidth=2;g.setLineDash([8,6]);g.strokeRect(x,y,z.w,z.h);g.setLineDash([]);
      label(z.kind==='weather'?'기상 악화':'비행제한',z.x,z.y-5,z.kind==='weather'?'#87c9d9':'#ffb5a0',14,'center');
      label(z.kind==='weather'?'속도 감소':'진입 시 감점',z.x,z.y+14,'#bad4d7',10,'center');
    });
  }
  function drawAirplane(p,selected,danger,t){
    const color=danger?'#ff938d':p.type==='구조기'?'#ffcc86':p.type==='화물기'?'#9ac5ff':'#9cf4dd';
    if(p.trail.length>1){g.beginPath();p.trail.forEach((v,i)=>i?g.lineTo(v.x,v.y):g.moveTo(v.x,v.y));g.strokeStyle=danger?'rgba(255,123,132,.35)':'rgba(135,216,207,.30)';g.lineWidth=1.4;g.stroke();}
    const projected=23;
    line(p.x,p.y,p.x+Math.cos(p.heading)*projected,p.y+Math.sin(p.heading)*projected,color,1,[3,4]);
    if(selected){
      g.beginPath();g.arc(p.x,p.y,24,0,Math.PI*2);g.lineWidth=2;g.strokeStyle='#f6e6a2';g.stroke();
      const waypoint=p.waypoint||C.findDest(game,p);
      if(waypoint){line(p.x,p.y,waypoint.x,waypoint.y,'rgba(255,229,154,.76)',1.8,[7,5]);g.beginPath();g.arc(waypoint.x,waypoint.y,8,0,Math.PI*2);g.strokeStyle='#fae6a4';g.stroke();}
    }
    if(danger){g.beginPath();g.arc(p.x,p.y,32+3*Math.sin(t/220),0,Math.PI*2);g.strokeStyle='rgba(255,129,120,.64)';g.lineWidth=2;g.stroke();}
    g.save();g.translate(p.x,p.y);g.rotate(p.heading+Math.PI/2);
    polygon([[0,-16],[-5,-5],[-15,3],[-15,8],[-4,6],[-4,14],[0,17],[4,14],[4,6],[15,8],[15,3],[5,-5]],color);
    g.restore();
    label(p.callSign,p.x+18,p.y-12,selected?'#ffeab0':'#d2f0ed',12);
    label('고도 '+(p.altitude>1.5?'2':'1')+(p.holding?' · 대기':''),p.x+18,p.y+4,'#a1c3c8',10);
  }
  function draw(t){
    const map=game?game.map:C.MAPS[preview];
    drawBackdrop(map);drawSweep(t);
    C.GATES.forEach(drawGate);drawZones(game?game.zones:map.zones);
    (game?game.airports:map.airports).forEach(drawAirport);
    if(game)game.planes.forEach(p=>drawAirplane(p,p.id===game.selectedId,game.activeAlerts.includes(p.id),t));
    if(!game){label('항공기 흐름을 안전하게 이끄는 관제실',480,555,'#82b9b8',20,'center');}
    if(paused && game && game.phase==='running'){
      g.fillStyle='rgba(4,21,30,.55)';g.fillRect(0,0,W,H);
      label('일시정지',W/2,H/2,'#dbfff2',39,'center');label('아래의 계속하기 버튼을 누르세요',W/2,H/2+36,'#b9d8db',16,'center');
    }
  }
  function selectedPlane(){return game?C.findPlane(game,game.selectedId):null;}
  function updatePanel(){
    if(!game){$('timeValue').textContent='--:--';return;}
    $('sectorName').textContent=game.map.title;
    $('timeValue').textContent=fmt(game.duration-game.elapsed);
    $('safeValue').textContent=String(game.delivered);
    $('scoreValue').textContent=game.score.toLocaleString('ko-KR');
    $('safetyValue').textContent=('● '.repeat(Math.max(0,3-game.incidents))+'○ '.repeat(game.incidents)).trim();
    $('trafficCount').textContent=game.planes.length;
    $('weatherIndicator').textContent=game.zones.some(z=>z.kind==='weather')?'WEATHER ADVISORY':'WEATHER NORMAL';
    const p=selectedPlane();
    $('emptySelection').hidden=!!p;$('selection').hidden=!p;
    if(p){
      $('flightName').textContent=p.callSign;$('flightKind').textContent=p.type;
      $('flightDest').textContent=p.destName;
      $('flightMode').textContent=p.status;
      $('flightSpeed').textContent=Math.round(p.currentSpeed)+' 단위/초';
      $('flightAltitude').textContent=p.altitude.toFixed(1)+' → '+p.targetAltitude;
      $('lowAltBtn').classList.toggle('active',p.targetAltitude===1);
      $('highAltBtn').classList.toggle('active',p.targetAltitude===2);
      $('holdBtn').classList.toggle('active',p.holding);
      $('holdBtn').textContent=p.holding?'대기 끝내고 목적지로':'대기 선회 / 재진입';
    }
    const traffic=$('trafficList');traffic.replaceChildren();
    if(!game.planes.length){const para=document.createElement('p');para.textContent='현재 관제 중인 항공기가 없어요.';traffic.append(para);}
    for(const f of game.planes){
      const button=document.createElement('button');button.type='button';
      button.className='flight-row'+(f.id===game.selectedId?' chosen':'')+(game.activeAlerts.includes(f.id)?' danger':'');
      button.innerHTML='<b>'+safeText(f.callSign)+'</b><span>'+safeText(f.destId)+'</span><small>'+safeText(f.type)+'</small><small>고도 '+(f.altitude>1.5?'2':'1')+'</small>';
      button.addEventListener('click',()=>{game.selectedId=f.id;updatePanel();});
      traffic.append(button);
    }
    const log=$('logList');log.replaceChildren();
    for(const m of game.messages.slice(0,6)){
      const item=document.createElement('li');if(m.warn)item.className='warn';
      item.textContent=fmt(m.at)+' · '+m.text;log.append(item);
    }
    $('footerStatus').textContent=paused?'일시정지':game.phase==='running'?'현재 운항 '+game.planes.length+'대':'근무 종료';
    $('statusLabel').textContent=p?p.callSign+' 선택됨 · 지도를 터치해 경유점 지정':'항공기를 선택하고 지도에 경유점을 지정하세요';
    $('pauseBtn').textContent=paused?'계속하기':'일시정지';
  }
  function pointerPosition(event){
    const bounds=canvas.getBoundingClientRect();
    return {x:(event.clientX-bounds.left)/bounds.width*W,y:(event.clientY-bounds.top)/bounds.height*H};
  }
  function nearestPlane(pos){
    if(!game)return null;let best=null,d=36;
    for(const p of game.planes){const pd=C.distance(p,pos);if(pd<d){d=pd;best=p;}}
    return best;
  }
  canvas.addEventListener('pointerdown',event=>{
    if(!game||game.phase!=='running'||paused)return;
    const pos=pointerPosition(event);startPointer={id:event.pointerId,pos,hit:nearestPlane(pos)};
    if(canvas.setPointerCapture)canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  canvas.addEventListener('pointerup',event=>{
    if(!game||game.phase!=='running'||paused||!startPointer||startPointer.id!==event.pointerId)return;
    const pos=pointerPosition(event),origin=startPointer;startPointer=null;
    if(origin.hit && C.distance(origin.pos,pos)>26){
      game.selectedId=origin.hit.id;C.route(game,origin.hit.id,pos.x,pos.y);
    }else{
      const hit=nearestPlane(pos);
      if(hit)game.selectedId=hit.id;
      else if(game.selectedId)C.route(game,game.selectedId,pos.x,pos.y);
    }
    updatePanel();event.preventDefault();
  });
  canvas.addEventListener('pointercancel',()=>{startPointer=null;});
  canvas.addEventListener('pointermove',event=>{
    const pos=pointerPosition(event);
    $('coords').textContent=String(Math.round(pos.x)).padStart(3,'0')+' / '+String(Math.round(pos.y)).padStart(3,'0');
  });
  document.querySelectorAll('[data-map]').forEach(btn=>btn.addEventListener('click',()=>{
    preview=btn.dataset.map;
    document.querySelectorAll('[data-map]').forEach(x=>x.classList.toggle('selected',x===btn));
  }));
  document.querySelectorAll('[data-speed]').forEach(btn=>btn.addEventListener('click',()=>{
    speed=Number(btn.dataset.speed);
    document.querySelectorAll('[data-speed]').forEach(x=>x.classList.toggle('active',x===btn));
  }));
  function start(){
    game=C.create(preview,Date.now());
    game.selectedId=null;paused=false;speed=1;reported=false;lastDelivered=0;lastWarnings=0;accumulator=0;
    document.querySelectorAll('[data-speed]').forEach(b=>b.classList.toggle('active',b.dataset.speed==='1'));
    $('startModal').hidden=true;$('endModal').hidden=true;
    sdk('start',{level:preview});
    updatePanel();
  }
  function pause(force){
    if(!game||game.phase!=='running')return;
    paused=typeof force==='boolean'?force:!paused;
    sdk(paused?'pause':'resume',{reason:'air_traffic'});
    updatePanel();
  }
  function finish(){
    if(!game||reported)return;
    reported=true;paused=true;
    const passed=game.phase==='completed';
    $('endTitle').textContent=passed?'오늘의 근무 완료!':'오늘의 관제 보고서';
    $('endMessage').textContent=game.endReason;
    $('endSafe').textContent=game.delivered+'대';
    $('endWarnings').textContent=game.warnings+'회';
    $('endScore').textContent=game.score.toLocaleString('ko-KR');
    $('endIncidents').textContent=game.incidents+'회';
    $('endModal').hidden=false;
    sdk('result',{scope:'shift',status:passed?'completed':'failed',outcome:passed?'clear':'fail',score:game.score,level:game.mapKey,flights:game.delivered,warnings:game.warnings,incidents:game.incidents});
  }
  $('startBtn').addEventListener('click',start);
  $('againBtn').addEventListener('click',start);
  $('chooseBtn').addEventListener('click',()=>{$('endModal').hidden=true;$('startModal').hidden=false;game=null;paused=false;updatePanel();});
  $('newBtn').addEventListener('click',()=>{$('startModal').hidden=false;paused=true;});
  $('pauseBtn').addEventListener('click',()=>pause());
  $('lowAltBtn').addEventListener('click',()=>{if(game)C.altitude(game,game.selectedId,1);updatePanel();});
  $('highAltBtn').addEventListener('click',()=>{if(game)C.altitude(game,game.selectedId,2);updatePanel();});
  $('holdBtn').addEventListener('click',()=>{if(game)C.hold(game,game.selectedId);updatePanel();});
  $('directBtn').addEventListener('click',()=>{if(game)C.direct(game,game.selectedId);updatePanel();});
  window.addEventListener('keydown',event=>{
    if(!$('startModal').hidden||!$('endModal').hidden)return;
    if(['Space','Digit1','Digit2','Digit3','KeyA','KeyS','KeyH','Escape'].includes(event.code))event.preventDefault();
    if(event.code==='Space')pause();
    if(event.code==='Digit1'||event.code==='Digit2'||event.code==='Digit3'){
      const value=event.code==='Digit1'?1:event.code==='Digit2'?1.5:2;
      document.querySelector('[data-speed="'+value+'"]').click();
    }
    if(game&&event.code==='KeyA')C.altitude(game,game.selectedId,1);
    if(game&&event.code==='KeyS')C.altitude(game,game.selectedId,2);
    if(game&&event.code==='KeyH')C.hold(game,game.selectedId);
    if(game&&event.code==='Escape')game.selectedId=null;
    updatePanel();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&game&&game.phase==='running')pause(true);});
  function frame(t){
    const dt=lastFrame?Math.min((t-lastFrame)/1000,.12):0;lastFrame=t;
    if(game&&game.phase==='running'&&!paused&&$('startModal').hidden){
      accumulator+=dt*speed;
      let count=0;
      while(accumulator>=1/30&&count++<12&&game.phase==='running'){
        C.step(game,1/30);accumulator-=1/30;
      }
      if(game.delivered!==lastDelivered){lastDelivered=game.delivered;sdk('sound','correct');}
      if(game.warnings!==lastWarnings){lastWarnings=game.warnings;sdk('sound','wrong');}
      if(game.phase!=='running')finish();
    }
    draw(t);
    if(t-uiTime>180){updatePanel();uiTime=t;}
    requestAnimationFrame(frame);
  }
  sdk('registerPauseHandlers',{pause:()=>{paused=true;updatePanel();},resume:()=>{paused=false;updatePanel();}});
  updatePanel();
  requestAnimationFrame(frame);
})();