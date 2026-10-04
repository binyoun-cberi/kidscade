import { travelFX } from './travel-fx.js';

'use strict';

const {COUNTRIES,ROUTES,EVENTS,CONTINENTS}=window.WorldMarbleData;
const BY_ID=new Map(COUNTRIES.map(c=>[c.id,c]));
const ADJ=new Map(COUNTRIES.map(c=>[c.id,[]]));
ROUTES.forEach(r=>{
  ADJ.get(r.a)?.push({to:r.b,route:r});
  ADJ.get(r.b)?.push({to:r.a,route:r});
});

const COLORS=['#2f80ed','#eb5c7a','#27ae60','#9b51e0'];
const AVATARS=['🧳','🎒','📸','🗺️'];
const SAVE_KEY=window.KidscadeGame?.storageKey?.('korea_marble','world_best')||'kidscade_game_v1:korea_marble:world_best';
const MAP_URL='../../assets/maps/world-countries-110m.geojson';
const MAP_W=1000,MAP_H=520,LAT_TOP=80,LAT_BOTTOM=-58;
const GEO_NAME_FALLBACK={France:'FR',Singapore:'SG'};

const $=id=>document.getElementById(id);
const ui={
  start:$('startScreen'),game:$('gameScreen'),result:$('resultScreen'),
  startBtn:$('startBtn'),map:$('worldMap'),countryLayer:$('countryLayer'),routeLayer:$('routeLayer'),nodeLayer:$('nodeLayer'),playerLayer:$('playerLayer'),
  playerDock:$('playerDock'),round:$('roundText'),turnAvatar:$('turnAvatar'),turnTitle:$('turnTitle'),turnSub:$('turnSub'),moveLeft:$('moveLeft'),
  destinationStrip:$('destinationStrip'),die:$('die'),roll:$('rollBtn'),message:$('messageTitle'),messageSub:$('messageSub'),status:$('statusText'),
  actionModal:$('actionModal'),actionIcon:$('actionIcon'),actionTitle:$('actionTitle'),actionSub:$('actionSub'),economy:$('countryEconomy'),actionChoices:$('actionChoices'),
  eventModal:$('eventModal'),eventIcon:$('eventIcon'),eventTitle:$('eventTitle'),eventDesc:$('eventDesc'),eventChoices:$('eventChoices'),
  tooltip:$('tooltip'),resultTitle:$('resultTitle'),resultDesc:$('resultDesc'),ranking:$('ranking'),restart:$('restartBtn'),menu:$('menuBtn')
};

let geo=null;
let state={
  started:false,players:[],turn:0,round:1,maxRounds:10,cpuDifficulty:'normal',speed:'normal',
  investments:{},festival:null,phase:'menu',rolled:0,routeOptions:[],selectedRoute:null,eventUsed:false,
  totalPlayers:4,humanPlayers:1
};
let mapEls={countries:new Map(),nodes:new Map(),routes:new Map()};
let setup={total:4,human:1,rounds:10,diff:'normal',speed:'normal'};
let timers=new Set();

function later(fn,ms){
  const id=setTimeout(()=>{timers.delete(id);fn()},ms);timers.add(id);return id;
}
function clearTimers(){timers.forEach(clearTimeout);timers.clear()}
function sdkSound(name){try{window.KidscadeGame?.sound?.(name)}catch(_){}}
function sdkScore(){try{window.KidscadeGame?.score?.(netWorth(state.players[0]||{}),{unit:'만',higherIsBetter:true})}catch(_){}}

function project(lon,lat){
  return {
    x:(Number(lon)+180)/360*MAP_W,
    y:(LAT_TOP-Math.max(LAT_BOTTOM,Math.min(LAT_TOP,Number(lat))))/(LAT_TOP-LAT_BOTTOM)*MAP_H
  };
}

function ringPath(ring){
  if(!ring?.length)return '';
  let out='',prevLon=null,shift=0;
  for(let i=0;i<ring.length;i++){
    let lon=Number(ring[i][0]),lat=Number(ring[i][1]);
    if(prevLon!==null){
      const raw=lon+shift-prevLon;
      if(raw>180)shift-=360;
      if(raw<-180)shift+=360;
    }
    const adj=lon+shift;prevLon=adj;
    const p=project(adj,lat);
    out+=(i?'L':'M')+p.x.toFixed(2)+','+p.y.toFixed(2);
  }
  return out+'Z';
}

function geometryPath(geom){
  if(!geom)return '';
  if(geom.type==='Polygon')return geom.coordinates.map(ringPath).join('');
  if(geom.type==='MultiPolygon')return geom.coordinates.map(poly=>poly.map(ringPath).join('')).join('');
  return '';
}

function routeGeometry(a,b){
  const p1=project(a.lon,a.lat),p2=project(b.lon,b.lat);
  let x2=p2.x;
  if(Math.abs(x2-p1.x)>MAP_W/2)x2+=x2>p1.x?-MAP_W:MAP_W;
  const mx=(p1.x+x2)/2;
  const arc=Math.min(55,18+Math.abs(x2-p1.x)*.09);
  const my=(p1.y+p2.y)/2-arc;
  const main='M'+p1.x.toFixed(1)+','+p1.y.toFixed(1)+' Q'+mx.toFixed(1)+','+my.toFixed(1)+' '+x2.toFixed(1)+','+p2.y.toFixed(1);
  if(x2>=0&&x2<=MAP_W)return [main];
  const shift=x2<0?MAP_W:-MAP_W;
  const second='M'+(p1.x+shift).toFixed(1)+','+p1.y.toFixed(1)+' Q'+(mx+shift).toFixed(1)+','+my.toFixed(1)+' '+(x2+shift).toFixed(1)+','+p2.y.toFixed(1);
  return [main,second];
}

function primaryMode(route){
  if(route.modes.includes('rail'))return 'rail';
  if(route.modes.includes('sea'))return 'sea';
  return 'air';
}

async function loadMap(){
  try{
    const res=await fetch(MAP_URL,{cache:'force-cache'});
    if(!res.ok)throw new Error('map '+res.status);
    geo=await res.json();
    renderMapBase();
    ui.startBtn.disabled=false;
    ui.startBtn.textContent='세계여행 출발!';
  }catch(err){
    ui.startBtn.disabled=true;
    ui.startBtn.textContent='세계 지도를 불러오지 못했어요';
    document.querySelector('.start-help').textContent='세계 지도 파일을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.';
    console.error(err);
  }
}

function renderMapBase(){
  ui.countryLayer.innerHTML='';ui.routeLayer.innerHTML='';ui.nodeLayer.innerHTML='';ui.playerLayer.innerHTML='';
  mapEls={countries:new Map(),nodes:new Map(),routes:new Map()};
  const playable=new Set(COUNTRIES.map(c=>c.id));
  for(const f of geo.features||[]){
    let iso=String(f.properties?.ISO_A2||'').toUpperCase();
    if(!playable.has(iso))iso=GEO_NAME_FALLBACK[String(f.properties?.NAME||'')]||iso;
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',geometryPath(f.geometry));
    path.setAttribute('class','country-shape'+(playable.has(iso)?' playable':''));
    path.dataset.iso=iso;
    ui.countryLayer.appendChild(path);
    if(playable.has(iso))mapEls.countries.set(iso,path);
  }

  for(const r of ROUTES){
    const a=BY_ID.get(r.a),b=BY_ID.get(r.b);if(!a||!b)continue;
    const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.dataset.route=r.id;
    const mode=primaryMode(r);
    for(const d of routeGeometry(a,b)){
      const p=document.createElementNS('http://www.w3.org/2000/svg','path');
      p.setAttribute('d',d);p.setAttribute('class','route '+mode);g.appendChild(p);
    }
    ui.routeLayer.appendChild(g);mapEls.routes.set(r.id,g);
  }

  for(const c of COUNTRIES){
    const p=project(c.lon,c.lat);
    const g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.setAttribute('class','node');g.setAttribute('transform','translate('+p.x+' '+p.y+')');g.dataset.id=c.id;
    const ring=document.createElementNS('http://www.w3.org/2000/svg','circle');ring.setAttribute('class','node-ring');ring.setAttribute('r','7');
    const core=document.createElementNS('http://www.w3.org/2000/svg','circle');core.setAttribute('class','node-core');core.setAttribute('r','3.2');
    const flag=document.createElementNS('http://www.w3.org/2000/svg','text');flag.setAttribute('class','node-flag');flag.setAttribute('x','0');flag.setAttribute('y','-10');flag.setAttribute('text-anchor','middle');flag.textContent=c.icon;
    g.append(ring,core,flag);
    g.addEventListener('pointerenter',e=>showTooltip(e,c));
    g.addEventListener('pointermove',e=>moveTooltip(e));
    g.addEventListener('pointerleave',hideTooltip);
    g.addEventListener('click',()=>onNodeClick(c.id));
    ui.nodeLayer.appendChild(g);mapEls.nodes.set(c.id,g);
  }
  refreshMap();
}

function showTooltip(e,c){
  const inv=state.investments[c.id];
  let owner='투자자 없음';
  if(inv&&state.players[inv.owner])owner=state.players[inv.owner].name+' · Lv.'+inv.level;
  ui.tooltip.innerHTML='<b>'+c.icon+' '+c.name+' · '+c.city+'</b><small>'+CONTINENTS[c.continent].name+' · 투자 '+c.value+'만 · '+owner+'</small>';
  ui.tooltip.classList.add('show');moveTooltip(e);
}
function moveTooltip(e){ui.tooltip.style.left=Math.min(innerWidth-190,e.clientX+13)+'px';ui.tooltip.style.top=Math.min(innerHeight-70,e.clientY+13)+'px'}
function hideTooltip(){ui.tooltip.classList.remove('show')}

function refreshMap(){
  if(!geo)return;
  for(const c of COUNTRIES){
    const inv=state.investments[c.id];
    const shape=mapEls.countries.get(c.id),node=mapEls.nodes.get(c.id);
    if(shape){
      shape.classList.remove('owned','focused','destination');
      shape.style.fill='';
      if(inv&&state.players[inv.owner]){
        shape.classList.add('owned');shape.style.fill=state.players[inv.owner].color;
      }
    }
    if(node){
      node.setAttribute('class','node');
      if(inv)node.classList.add('owned-p'+inv.owner);
      if(state.routeOptions.some(o=>o.dest===c.id))node.classList.add('reachable');
      if(state.players[state.turn]?.country===c.id)node.classList.add('current');
      const star=node.querySelector('.landmark-star');if(star)star.remove();
      if(inv?.level===3){
        const t=document.createElementNS('http://www.w3.org/2000/svg','text');
        t.setAttribute('class','landmark-star');t.setAttribute('x','9');t.setAttribute('y','7');t.textContent='⭐';node.appendChild(t);
      }
    }
  }
  for(const g of mapEls.routes.values())g.querySelectorAll('.route').forEach(p=>p.classList.remove('active','preview'));
  renderTokens();
}

function renderTokens(){
  ui.playerLayer.innerHTML='';
  const groups={};
  state.players.forEach(p=>{if(!p.bankrupt)(groups[p.country]||(groups[p.country]=[])).push(p)});
  Object.entries(groups).forEach(([countryId,list])=>{
    const c=BY_ID.get(countryId);if(!c)return;const base=project(c.lon,c.lat);
    list.forEach((p,i)=>{
      const angle=list.length>1?i/list.length*Math.PI*2:0,rad=list.length>1?11:0;
      const x=base.x+Math.cos(angle)*rad,y=base.y+Math.sin(angle)*rad+12;
      const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.setAttribute('class','player-token');g.setAttribute('transform','translate('+x+' '+y+')');
      const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');circle.setAttribute('r','9');circle.setAttribute('fill',p.color);
      const txt=document.createElementNS('http://www.w3.org/2000/svg','text');txt.textContent=p.emoji;
      g.append(circle,txt);ui.playerLayer.appendChild(g);
    });
  });
}

function readSetup(){
  setup.total=Number(document.querySelector('[data-group="total"].active')?.dataset.value||4);
  setup.human=Math.min(setup.total,Number(document.querySelector('[data-group="human"].active')?.dataset.value||1));
  setup.rounds=Number(document.querySelector('[data-group="rounds"].active')?.dataset.value||10);
  setup.diff=$('cpuDiff').value;setup.speed=$('speedMode').value;
}
function syncHumanButtons(){
  document.querySelectorAll('[data-group="human"]').forEach(b=>{b.disabled=Number(b.dataset.value)>setup.total;if(b.disabled)b.classList.remove('active')});
  const current=document.querySelector('[data-group="human"].active');
  if(!current){const b=document.querySelector('[data-group="human"][data-value="1"]');b?.classList.add('active')}
}

function newGame(){
  readSetup();clearTimers();
  state={
    started:true,players:[],turn:0,round:1,maxRounds:setup.rounds,cpuDifficulty:setup.diff,speed:setup.speed,
    investments:{},festival:null,phase:'roll',rolled:0,routeOptions:[],selectedRoute:null,eventUsed:false,
    totalPlayers:setup.total,humanPlayers:setup.human
  };
  let cpuNo=1;
  for(let i=0;i<setup.total;i++){
    const isCpu=i>=setup.human;
    state.players.push({
      id:i,name:isCpu?'CPU '+cpuNo++:'플레이어 '+(i+1),isCpu,color:COLORS[i],emoji:AVATARS[i],
      money:300,country:'KR',rest:0,pass:0,discount:1,buildPoints:1,turnTransitPaid:0,bankrupt:false,visited:['KR'],continents:['asia'],landmarks:0,seenModes:[]
    });
  }
  ui.start.classList.add('hidden');ui.result.classList.add('hidden');ui.game.classList.remove('hidden');
  ui.die.textContent='🎲';
  try{window.KidscadeGame?.start?.({mode:'world-route-marble',players:setup.total,humanPlayers:setup.human,rounds:setup.rounds})}catch(_){}
  updateAll();
  announce('대한민국에서 세계여행을 시작합니다.','주사위를 굴려 교통망을 따라 이동하세요.');
  beginTurn();
}

function activePlayer(){return state.players[state.turn]}

function beginTurn(){
  if(!state.started)return;
  if(activePlayers().length<=1){finishGame('last-player');return}
  if(state.round>state.maxRounds){finishGame('round-limit');return}
  const p=activePlayer();
  if(!p||p.bankrupt){nextTurn();return}
  state.phase='preturn';state.rolled=0;state.routeOptions=[];state.selectedRoute=null;state.eventUsed=false;p.turnTransitPaid=0;
  if(p.rest>0){
    p.rest--;announce(p.name+'은(는) 여행 지연 중이에요.','이번 턴을 쉬고 다음 여행을 준비합니다.');
    updateAll();later(nextTurn,850);return;
  }
  updateAll();
  if(maybeOfferBuild(p))return;
  enterRollPhase(p);
}

function enterRollPhase(player){
  state.phase='roll';
  updateAll();
  announce(player.name+'의 여행 차례','현재 '+BY_ID.get(player.country).name+' · 주사위를 굴려주세요.');
  if(player.isCpu){
    ui.roll.disabled=true;
    later(()=>rollDice(),state.speed==='fast'?260:520);
  }else ui.roll.disabled=false;
}

function remoteBuildCost(player,c,level){
  return Math.max(1,Math.round(upgradeCost(player,c,level)*.55));
}

function upgradeableCountries(player){
  return COUNTRIES
    .filter(c=>state.investments[c.id]?.owner===player.id&&state.investments[c.id].level<3)
    .sort((a,b)=>{
      const ai=state.investments[a.id],bi=state.investments[b.id];
      return (bi.level-ai.level)||(b.value-a.value)||a.id.localeCompare(b.id);
    });
}

function maybeOfferBuild(player){
  const owned=upgradeableCountries(player);
  if(player.buildPoints<=0||!owned.length)return false;
  state.phase='build';
  if(player.isCpu){
    const affordable=owned.filter(c=>player.money>=remoteBuildCost(player,c,state.investments[c.id].level));
    if(!affordable.length){enterRollPhase(player);return true}
    const target=affordable[0],inv=state.investments[target.id],cost=remoteBuildCost(player,target,inv.level);
    const reserve=state.cpuDifficulty==='hard'?40:state.cpuDifficulty==='normal'?80:105;
    const use=player.money-cost>=reserve&&(state.cpuDifficulty!=='easy'||Math.random()>.45);
    if(use)later(()=>remoteUpgrade(player,target,inv,cost),state.speed==='fast'?140:360);
    else enterRollPhase(player);
    return true;
  }
  showBuildPicker(player,owned);
  return true;
}

function showBuildPicker(player,owned){
  ui.actionIcon.textContent='🏗️';
  ui.actionTitle.textContent='출발 전 건설';
  ui.actionSub.textContent='건설권 '+player.buildPoints+'장 · 내 투자국 한 곳을 성장시키고 여행을 시작할 수 있어요.';
  ui.economy.innerHTML='<div><span>건설권</span><b>'+player.buildPoints+'장</b></div><div><span>투자국</span><b>'+ownedCount(player.id)+'개</b></div><div><span>랜드마크</span><b>'+player.landmarks+'개</b></div>';
  ui.actionChoices.innerHTML='';
  const wrap=document.createElement('div');wrap.className='owned-choice';
  owned.slice(0,8).forEach(c=>{
    const inv=state.investments[c.id],cost=remoteBuildCost(player,c,inv.level),btn=document.createElement('button');
    btn.disabled=player.money<cost;
    btn.innerHTML=c.icon+' '+c.name+'<br><small>Lv.'+inv.level+' → Lv.'+(inv.level+1)+' · '+cost+'만</small>';
    btn.onclick=()=>{if(btn.disabled)return;ui.actionModal.classList.add('hidden');remoteUpgrade(player,c,inv,cost)};
    wrap.appendChild(btn);
  });
  ui.actionChoices.appendChild(wrap);
  const skip=document.createElement('button');skip.className='secondary';skip.textContent='건설하지 않고 여행';
  skip.onclick=()=>{ui.actionModal.classList.add('hidden');enterRollPhase(player)};
  ui.actionChoices.appendChild(skip);
  ui.actionModal.classList.remove('hidden');
}

function remoteUpgrade(player,c,inv,cost){
  if(player.buildPoints<=0||inv.level>=3||player.money<cost)return enterRollPhase(player);
  player.buildPoints--;player.money-=cost;if(player.discount<1)player.discount=1;inv.level++;
  if(inv.level===3)player.landmarks++;
  sdkSound('success');
  announce(c.name+' '+c.build[inv.level-1]+' 건설!', '건설권을 사용해 여행 전에 사업을 성장시켰습니다.');
  refreshMap();updateAll();
  later(()=>enterRollPhase(player),state.speed==='fast'?180:520);
}

function rollDice(){
  if(state.phase!=='roll')return;
  const p=activePlayer();if(!p||p.bankrupt)return;
  state.phase='rolling';ui.roll.disabled=true;sdkSound('click');
  let ticks=0;
  const spin=()=>{
    ui.die.classList.add('rolling');ui.die.textContent=['⚀','⚁','⚂','⚃','⚄','⚅'][Math.floor(Math.random()*6)];
    ticks++;
    if(ticks<8){later(spin,state.speed==='fast'?35:65);return}
    const value=1+Math.floor(Math.random()*6);
    ui.die.classList.remove('rolling');ui.die.textContent=['⚀','⚁','⚂','⚃','⚄','⚅'][value-1];
    state.rolled=value;
    prepareRouteChoice(p,value);
  };
  spin();
}

function exactRoutes(start,steps){
  const found=new Map(),visited=new Set([start]);
  const dfs=(cur,left,path)=>{
    if(left===0){
      if(cur!==start&&!found.has(cur))found.set(cur,[...path]);
      return;
    }
    const nbs=[...(ADJ.get(cur)||[])].sort((a,b)=>a.to.localeCompare(b.to));
    for(const edge of nbs){
      if(visited.has(edge.to))continue;
      visited.add(edge.to);path.push({from:cur,to:edge.to,route:edge.route});
      dfs(edge.to,left-1,path);
      path.pop();visited.delete(edge.to);
    }
  };
  dfs(start,steps,[]);
  return [...found.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([dest,path])=>({dest,path}));
}

function ticketHash(text){
  let h=2166136261;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}
  return h>>>0;
}

function seededPick(list,key){
  if(!list.length)return null;
  return list[ticketHash(key)%list.length];
}

function pickTravelTickets(routes,player,roll){
  if(routes.length<=4)return routes;
  const target=state.round>=7?3:(roll<=2?3:4),picked=[];
  const add=route=>{if(route&&!picked.some(x=>x.dest===route.dest))picked.push(route)};
  const opponent=routes.filter(r=>{
    const inv=state.investments[r.dest];return inv&&inv.owner!==player.id;
  }).sort((a,b)=>getToll(b.dest)-getToll(a.dest)||a.dest.localeCompare(b.dest));
  const mine=routes.filter(r=>{
    const inv=state.investments[r.dest];return inv?.owner===player.id&&inv.level<3;
  }).sort((a,b)=>(state.investments[b.dest].level-state.investments[a.dest].level)||BY_ID.get(b.dest).value-BY_ID.get(a.dest).value);
  const open=routes.filter(r=>!state.investments[r.dest]).sort((a,b)=>BY_ID.get(b.dest).value-BY_ID.get(a.dest).value||a.dest.localeCompare(b.dest));
  const seed=state.round+'|'+player.id+'|'+player.country+'|'+roll;
  if(state.round<=3){
    add(seededPick(open,seed+'|open'));
    add(seededPick(mine,seed+'|mine'));
    add(seededPick(opponent,seed+'|risk'));
  }else if(state.round<=6){
    add(seededPick(opponent,seed+'|risk'));
    add(seededPick(mine,seed+'|mine'));
    add(seededPick(open,seed+'|open'));
  }else{
    const risk1=seededPick(opponent,seed+'|risk-a');add(risk1);
    add(seededPick(opponent.filter(r=>r.dest!==risk1?.dest),seed+'|risk-b'));
    add(seededPick(mine,seed+'|mine'));
  }
  const rest=routes.filter(r=>!picked.some(x=>x.dest===r.dest))
    .sort((a,b)=>ticketHash(seed+'|'+a.dest)-ticketHash(seed+'|'+b.dest));
  for(const route of rest){add(route);if(picked.length>=target)break}
  return picked.slice(0,target);
}

function prepareRouteChoice(player,roll){
  let allRoutes=exactRoutes(player.country,roll),used=roll;
  while(!allRoutes.length&&used>1){used--;allRoutes=exactRoutes(player.country,used)}
  if(!allRoutes.length){
    const n=(ADJ.get(player.country)||[])[0];
    if(n)allRoutes=[{dest:n.to,path:[{from:player.country,to:n.to,route:n.route}]}],used=1;
  }
  const routes=pickTravelTickets(allRoutes,player,roll);
  state.routeOptions=routes;state.phase='choose';
  refreshMap();renderDestinationStrip();
  announce('주사위 '+roll+' · '+used+'구간 여행','여행사에서 '+routes.length+'개의 목적지 티켓을 제안했어요. 하나를 골라 출발하세요.');
  ui.moveLeft.textContent='🎲 '+roll+' → '+used+'구간 · 티켓 '+routes.length+'장';
  ui.moveLeft.classList.add('choose');
  if(player.isCpu)later(()=>chooseCpuRoute(player,routes),state.speed==='fast'?180:460);
}

function destinationInterest(player,id){
  const c=BY_ID.get(id),inv=state.investments[id];
  let score=c.value;
  if(!inv){
    score+=state.round<=3?40:18;
  }else if(inv.owner===player.id){
    score+=inv.level<3?48:6;
  }else{
    const riskWeight=state.cpuDifficulty==='hard'?.45:.7;
    score-=getToll(id)*riskWeight;
    const takeCost=takeoverCost(c,inv);
    if(inv.level<3&&player.money-takeCost>90&&state.cpuDifficulty==='hard')score+=34;
  }
  const owned=countContinent(player.id,c.continent);
  if(owned===CONTINENTS[c.continent].need-1&&!inv)score+=55;
  if(!player.continents.includes(c.continent))score+=state.round<=5?14:6;
  return score;
}

function routeTransitFee(player,path){
  for(let i=0;i<Math.max(0,path.length-1);i++){
    const countryId=path[i].to,inv=state.investments[countryId];
    if(!inv||inv.owner===player.id)continue;
    return Math.max(1,Math.min(6,Math.round(getToll(countryId)*.08)));
  }
  return 0;
}

function chooseCpuRoute(player,routes){
  if(state.phase!=='choose')return;
  let pick;
  if(state.cpuDifficulty==='easy')pick=routes[Math.floor(Math.random()*routes.length)];
  else{
    const scored=routes.map(r=>({
      r,
      s:destinationInterest(player,r.dest)-routeTransitFee(player,r.path)*.8+(state.cpuDifficulty==='hard'?Math.random()*6:Math.random()*20)
    })).sort((a,b)=>b.s-a.s);
    pick=scored[0]?.r;
  }
  if(pick)travelRoute(player,pick);
}

function routeTicketStatus(player,c,path){
  const inv=state.investments[c.id],transit=routeTransitFee(player,path);
  const via=transit?' · 환승 '+transit+'만':'';
  if(!inv)return {cls:'open',text:'✨ 투자 가능'+via};
  if(inv.owner===player.id)return {cls:'mine',text:(inv.level<3?'🏗️ 내 사업 Lv.'+inv.level:'⭐ 내 랜드마크')+via};
  return {cls:'risk',text:'⚠️ 여행비 '+getToll(c.id)+'만'+via};
}

function renderDestinationStrip(){
  ui.destinationStrip.innerHTML='';
  const player=activePlayer();
  state.routeOptions.forEach(o=>{
    const c=BY_ID.get(o.dest),status=routeTicketStatus(player,c,o.path),btn=document.createElement('button');btn.className='dest-btn '+status.cls;
    const modes=[...new Set(o.path.map(s=>chooseMode(s.route,0,player)))].map(m=>m==='rail'?'🚄':m==='sea'?'🚢':'✈️').join('');
    btn.innerHTML='<b>'+c.icon+' '+c.name+'</b><small>'+status.text+' · '+o.path.length+'구간 '+modes+'</small>';
    btn.addEventListener('mouseenter',()=>previewRoute(o,true));
    btn.addEventListener('mouseleave',()=>previewRoute(o,false));
    btn.addEventListener('click',()=>{if(!activePlayer()?.isCpu)travelRoute(activePlayer(),o)});
    ui.destinationStrip.appendChild(btn);
  });
}

function previewRoute(option,on){
  option.path.forEach(s=>mapEls.routes.get(s.route.id)?.querySelectorAll('.route').forEach(p=>p.classList.toggle('preview',on)));
}

function onNodeClick(id){
  if(state.phase!=='choose'||activePlayer()?.isCpu)return;
  const option=state.routeOptions.find(o=>o.dest===id);
  if(option)travelRoute(activePlayer(),option);
}

function chooseMode(route,segmentIndex,player){
  const modes=route.modes||['air'];
  return modes[(state.round+player.id+segmentIndex)%modes.length];
}

function animateMapSegment(from,to,mode,fast=false){
  return new Promise(resolve=>{
    const a=project(from.lon,from.lat),b=project(to.lon,to.lat);
    let bx=b.x;if(Math.abs(bx-a.x)>MAP_W/2)bx+=bx>a.x?-MAP_W:MAP_W;
    const icon=document.createElementNS('http://www.w3.org/2000/svg','text');
    icon.setAttribute('class','travel-map-icon '+mode);
    icon.textContent=mode==='rail'?'🚄':mode==='sea'?'🚢':'✈️';
    ui.playerLayer.appendChild(icon);
    const duration=fast?95:210,start=performance.now();
    const frame=now=>{
      const t=Math.min(1,(now-start)/duration),ease=1-Math.pow(1-t,2);
      let x=a.x+(bx-a.x)*ease;x=((x%MAP_W)+MAP_W)%MAP_W;
      const y=a.y+(b.y-a.y)*ease-Math.sin(t*Math.PI)*8;
      icon.setAttribute('x',x);icon.setAttribute('y',y);
      if(t<1)requestAnimationFrame(frame);else{icon.remove();resolve()}
    };
    requestAnimationFrame(frame);
  });
}

function shouldShowcaseTravel(player,mode,from,to){
  return !player.seenModes.includes(mode)||from.continent!==to.continent;
}

function chargeTransit(player,countryId){
  if(player.turnTransitPaid>0)return true;
  const inv=state.investments[countryId];
  if(!inv||inv.owner===player.id)return true;
  const fee=Math.max(1,Math.min(6,Math.round(getToll(countryId)*.08)));
  const owner=state.players[inv.owner];
  player.money-=fee;owner.money+=fee;player.turnTransitPaid=fee;
  if(player.money<0){bankrupt(player);return false}
  return true;
}

async function travelRoute(player,option){
  if(state.phase!=='choose')return;
  state.phase='travel';state.routeOptions=[];ui.destinationStrip.innerHTML='';ui.moveLeft.classList.remove('choose');
  refreshMap();announce(player.name+' 이동 중','교통편을 갈아타며 '+BY_ID.get(option.dest).name+'(으)로 여행합니다.');
  for(let i=0;i<option.path.length;i++){
    const seg=option.path[i],mode=chooseMode(seg.route,i,player);
    const group=mapEls.routes.get(seg.route.id);group?.querySelectorAll('.route').forEach(p=>p.classList.add('active'));
    const from=BY_ID.get(seg.from),to=BY_ID.get(seg.to);
    const showcase=shouldShowcaseTravel(player,mode,from,to);
    if(showcase)await travelFX.play({kind:mode,from:from.name,to:to.name,fast:state.speed==='fast'});
    else await animateMapSegment(from,to,mode,state.speed==='fast');
    if(!player.seenModes.includes(mode))player.seenModes.push(mode);
    group?.querySelectorAll('.route').forEach(p=>p.classList.remove('active'));
    player.country=seg.to;
    if(i<option.path.length-1&&!chargeTransit(player,seg.to))return;
    if(!player.visited.includes(seg.to)){
      player.visited.push(seg.to);
      try{window.KidscadeGame?.milestone?.('country_visit',{country:seg.to,firstVisit:player.visited.length===2,visitedCount:player.visited.length})}catch(_){}
    }
    const cont=BY_ID.get(seg.to).continent;
    if(!player.continents.includes(cont)){
      player.continents.push(cont);
      try{window.KidscadeGame?.milestone?.('continent_visit',{continent:cont,continentsVisited:player.continents.length})}catch(_){}
    }
    refreshMap();renderPlayerDock();
  }
  state.selectedRoute=option;
  handleArrival(player,option.dest);
}

function handleArrival(player,countryId){
  state.phase='action';refreshMap();updateAll();
  const c=BY_ID.get(countryId),inv=state.investments[countryId];
  announce(c.icon+' '+c.name+' 도착!',c.city+' · '+CONTINENTS[c.continent].name+(player.turnTransitPaid?' · 환승비 '+player.turnTransitPaid+'만 지불':''));
  sdkSound('correct');
  if(!inv)return promptInvestment(player,c);
  if(inv.owner===player.id)return promptUpgrade(player,c,inv);
  return payToll(player,c,inv);
}

function investmentCost(player,c){
  const mult=player.discount<1?player.discount:1;
  return Math.max(1,Math.round(c.value*mult));
}
function upgradeCost(player,c,level){
  const mult=player.discount<1?player.discount:1;
  return Math.max(1,Math.round(c.value*(.65+level*.55)*mult));
}
function takeoverCost(c,inv){return Math.round(c.value*(2+inv.level*1.35))}

function showAction({icon,title,sub,stats,choices}){
  ui.actionIcon.textContent=icon||'🌍';ui.actionTitle.textContent=title||'';ui.actionSub.textContent=sub||'';
  ui.economy.innerHTML=(stats||[]).map(s=>'<div><span>'+s.label+'</span><b>'+s.value+'</b></div>').join('');
  ui.actionChoices.innerHTML='';
  (choices||[]).forEach(ch=>{
    const b=document.createElement('button');b.className=ch.kind==='primary'?'primary':ch.kind==='danger'?'danger-btn':'secondary';
    b.textContent=ch.label;b.disabled=!!ch.disabled;b.onclick=()=>{if(b.disabled)return;ui.actionModal.classList.add('hidden');ch.action()};
    ui.actionChoices.appendChild(b);
  });
  ui.actionModal.classList.remove('hidden');
}

function promptInvestment(player,c){
  const cost=investmentCost(player,c),can=player.money>=cost;
  if(player.isCpu){
    let buy=can&&(state.cpuDifficulty!=='easy'||Math.random()>.38);
    if(state.cpuDifficulty==='normal'&&player.money-cost<75)buy=false;
    if(state.cpuDifficulty==='hard'&&countContinent(player.id,c.continent)===CONTINENTS[c.continent].need-1)buy=can;
    return later(()=>buy?buyCountry(player,c,cost):finishLanding(player),state.speed==='fast'?220:650);
  }
  showAction({
    icon:c.icon,title:c.name+'에 투자할까요?',sub:c.city+'의 관광 사업을 시작하면 다른 여행자가 방문할 때 수익을 얻습니다.',
    stats:[{label:'투자 비용',value:cost+'만'},{label:'기본 여행비',value:Math.round(c.value*.55)+'만'},{label:'대륙',value:CONTINENTS[c.continent].name}],
    choices:[
      {label:can?'투자하기':'자금 부족',kind:'primary',disabled:!can,action:()=>buyCountry(player,c,cost)},
      {label:'이번엔 통과',kind:'secondary',action:()=>finishLanding(player)}
    ]
  });
}

function buyCountry(player,c,cost){
  player.money-=cost;if(player.discount<1)player.discount=1;
  state.investments[c.id]={owner:player.id,level:1};
  sdkSound('success');announce(c.name+' 여행 사업 시작!',c.build[0]+'에 투자했습니다.');
  refreshMap();updateAll();later(()=>finishLanding(player),state.speed==='fast'?260:700);
}

function promptUpgrade(player,c,inv){
  if(inv.level>=3)return finishLanding(player);
  const cost=upgradeCost(player,c,inv.level),can=player.money>=cost,nextName=c.build[inv.level];
  if(player.isCpu){
    const yes=can&&(state.cpuDifficulty==='hard'||player.money-cost>70||Math.random()>.45);
    return later(()=>yes?upgradeCountry(player,c,inv,cost):finishLanding(player),state.speed==='fast'?200:600);
  }
  showAction({
    icon:inv.level===2?'⭐':c.icon,title:c.name+' 사업 확장',sub:'',
    stats:[{label:'현재',value:'Lv.'+inv.level+' '+c.build[inv.level-1]},{label:'다음',value:'Lv.'+(inv.level+1)+' '+nextName},{label:'건설비',value:cost+'만'}],
    choices:[
      {label:can?'건설하기':'자금 부족',kind:'primary',disabled:!can,action:()=>upgradeCountry(player,c,inv,cost)},
      {label:'유지하기',kind:'secondary',action:()=>finishLanding(player)}
    ]
  });
  ui.actionSub.textContent=inv.level===2?'완성하면 이 나라의 대표 랜드마크가 됩니다.':'관광 시설을 성장시키면 여행 수익이 올라갑니다.';
}

function upgradeCountry(player,c,inv,cost){
  player.money-=cost;if(player.discount<1)player.discount=1;inv.level++;
  if(inv.level===3)player.landmarks++;
  sdkSound('success');announce(c.name+' '+c.build[inv.level-1]+' 완성!','여행 수익이 더 높아졌습니다.');
  refreshMap();updateAll();later(()=>finishLanding(player),state.speed==='fast'?250:700);
}

function countContinent(owner,continent){
  return COUNTRIES.filter(c=>c.continent===continent&&state.investments[c.id]?.owner===owner).length;
}
function collectionActive(owner,continent){return countContinent(owner,continent)>=CONTINENTS[continent].need}

function getToll(countryId){
  const c=BY_ID.get(countryId),inv=state.investments[countryId];if(!inv)return 0;
  const levelMul=[0,.45,.9,1.9][inv.level]||.45;
  let toll=c.value*levelMul;
  if(collectionActive(inv.owner,c.continent))toll*=1.3;
  if(state.festival?.country===countryId&&state.round<=state.festival.expires)toll*=1.6;
  return Math.max(1,Math.round(toll));
}

function payToll(player,c,inv){
  const owner=state.players[inv.owner],toll=getToll(c.id);
  if(player.pass>0){
    player.pass--;announce('글로벌 패스 사용!','여행비 '+toll+'만이 면제됐습니다.');sdkSound('click');
    return later(()=>offerTakeover(player,c,inv),state.speed==='fast'?260:700);
  }
  player.money-=toll;owner.money+=toll;sdkSound('wrong');
  announce(owner.name+'의 '+c.name,'여행비 '+toll+'만을 지불했습니다.');
  updateAll();
  if(player.money<0)return later(()=>bankrupt(player),state.speed==='fast'?300:800);
  later(()=>offerTakeover(player,c,inv),state.speed==='fast'?280:800);
}

function offerTakeover(player,c,inv){
  const cost=takeoverCost(c,inv),can=player.money>=cost;
  if(!can||inv.level>=3)return finishLanding(player);
  if(player.isCpu){
    const hard=state.cpuDifficulty==='hard'&&player.money-cost>55&&Math.random()>.3;
    return hard?takeover(player,c,inv,cost):finishLanding(player);
  }
  showAction({
    icon:'🤝',title:c.name+' 사업 인수',sub:'여행비를 낸 뒤 기존 사업을 인수할 수도 있어요.',
    stats:[{label:'인수 비용',value:cost+'만'},{label:'현재 단계',value:'Lv.'+inv.level},{label:'내 자금',value:player.money+'만'}],
    choices:[
      {label:'인수하기',kind:'danger',action:()=>takeover(player,c,inv,cost)},
      {label:'그냥 여행',kind:'secondary',action:()=>finishLanding(player)}
    ]
  });
}

function takeover(player,c,inv,cost){
  const old=state.players[inv.owner];player.money-=cost;old.money+=cost;inv.owner=player.id;
  announce(c.name+' 사업 인수 성공!','기존 투자자에게 '+cost+'만을 지불했습니다.');sdkSound('success');
  refreshMap();updateAll();later(()=>finishLanding(player),state.speed==='fast'?250:700);
}

function finishLanding(player){
  updateAll();sdkScore();
  if(!state.eventUsed&&Math.random()<.18){
    state.eventUsed=true;return drawEvent(player);
  }
  nextTurn();
}

function drawEvent(player){
  const event=EVENTS[Math.floor(Math.random()*EVENTS.length)];
  ui.eventIcon.textContent=event.icon;ui.eventTitle.textContent=event.title;ui.eventDesc.textContent=event.desc;ui.eventChoices.innerHTML='';
  const ok=document.createElement('button');ok.className='primary';ok.textContent='확인';ok.onclick=()=>{
    ui.eventModal.classList.add('hidden');applyEvent(player,event);
  };
  ui.eventChoices.appendChild(ok);ui.eventModal.classList.remove('hidden');sdkSound('click');
  if(player.isCpu)later(()=>ok.click(),state.speed==='fast'?350:900);
}

function applyEvent(player,event){
  if(event.kind==='money'){
    player.money+=event.value;updateAll();
    if(player.money<0)return bankrupt(player);
    return nextTurn();
  }
  if(event.kind==='rest'){player.rest+=event.value;updateAll();return nextTurn()}
  if(event.kind==='discount'){player.discount=event.value;updateAll();return nextTurn()}
  if(event.kind==='pass'){player.pass+=event.value;updateAll();return nextTurn()}
  if(event.kind==='upgrade'){
    const owned=COUNTRIES.filter(c=>state.investments[c.id]?.owner===player.id&&state.investments[c.id].level<3);
    if(owned.length){
      const c=owned[Math.floor(Math.random()*owned.length)],inv=state.investments[c.id];inv.level++;if(inv.level===3)player.landmarks++;
      announce('관광청 지원 성공!',c.name+'의 '+c.build[inv.level-1]+'이(가) 무료 완성됐습니다.');
    }
    refreshMap();updateAll();return nextTurn();
  }
  if(event.kind==='festival'){
    const owned=COUNTRIES.filter(c=>state.investments[c.id]?.owner===player.id);
    if(!owned.length)return nextTurn();
    if(player.isCpu){
      owned.sort((a,b)=>getToll(b.id)-getToll(a.id));
      return setFestival(owned[0],event.value);
    }
    ui.eventIcon.textContent='🎉';ui.eventTitle.textContent='축제를 열 나라를 선택하세요';ui.eventDesc.textContent='선택한 나라의 여행 수익이 '+event.value+'라운드 동안 2배가 됩니다.';ui.eventChoices.innerHTML='';
    const wrap=document.createElement('div');wrap.className='owned-choice';
    owned.forEach(c=>{
      const b=document.createElement('button');b.textContent=c.icon+' '+c.name+' · '+getToll(c.id)+'만';
      b.onclick=()=>{ui.eventModal.classList.add('hidden');setFestival(c,event.value)};wrap.appendChild(b);
    });
    ui.eventChoices.appendChild(wrap);ui.eventModal.classList.remove('hidden');return;
  }
  nextTurn();
}

function setFestival(c,duration){
  state.festival={country:c.id,expires:state.round+duration-1};
  announce(c.icon+' '+c.name+' 세계 축제!','이 나라 여행 수익이 '+duration+'라운드 동안 2배입니다.');
  refreshMap();later(nextTurn,state.speed==='fast'?250:700);
}

function bankrupt(player){
  player.bankrupt=true;player.money=0;
  Object.keys(state.investments).forEach(id=>{if(state.investments[id].owner===player.id)delete state.investments[id]});
  announce(player.name+' 여행 종료','자금이 모두 떨어져 이번 세계여행에서 빠집니다.');
  sdkSound('fail');refreshMap();updateAll();
  if(activePlayers().length<=1)return later(()=>finishGame('last-player'),700);
  later(nextTurn,state.speed==='fast'?350:950);
}

function activePlayers(){return state.players.filter(p=>!p.bankrupt)}

function nextTurn(){
  if(!state.started)return;
  ui.actionModal.classList.add('hidden');ui.eventModal.classList.add('hidden');ui.destinationStrip.innerHTML='';
  state.routeOptions=[];state.selectedRoute=null;state.phase='between';
  let next=state.turn,wrapped=false,guard=0;
  do{
    next=(next+1)%state.players.length;
    if(next===0)wrapped=true;
    guard++;
  }while(state.players[next]?.bankrupt&&guard<=state.players.length+1);
  state.turn=next;
  if(wrapped){
    state.round++;
    if(state.festival&&state.round>state.festival.expires)state.festival=null;
    if(state.round>state.maxRounds)return finishGame('round-limit');
    activePlayers().forEach(p=>p.buildPoints=Math.min(3,p.buildPoints+1));
    if(state.round%3===1){
      activePlayers().forEach(p=>p.money+=12);
      announce('세계여행 지원금 + 건설권','새 라운드! 여행 중인 모두에게 12만과 건설권 1장이 지급됩니다.');
    }else{
      announce('새 라운드 건설권','여행 중인 모두에게 건설권 1장이 지급됩니다.');
    }
  }
  updateAll();later(beginTurn,state.speed==='fast'?140:420);
}

function netWorth(player){
  if(!player||player.bankrupt)return 0;
  let assets=0;
  for(const c of COUNTRIES){
    const inv=state.investments[c.id];
    if(inv?.owner===player.id)assets+=Math.round(c.value*(.8+inv.level*.7));
  }
  return Math.max(0,Math.round((player.money||0)+assets));
}

function updateAll(){
  ui.round.textContent=Math.min(state.round,state.maxRounds)+' / '+state.maxRounds;
  renderPlayerDock();refreshMap();
  const p=activePlayer();
  if(p){
    ui.turnAvatar.textContent=p.emoji;ui.turnAvatar.style.background=p.color;
    ui.turnTitle.textContent=p.name+' · '+BY_ID.get(p.country).name;
    ui.turnSub.textContent='현금 '+p.money+'만 · 총자산 '+netWorth(p)+'만';
    ui.status.textContent=(state.festival?'🎉 '+BY_ID.get(state.festival.country)?.name+' 축제 · ':'')+'🏗️ '+p.buildPoints+' · 투자국 '+ownedCount(p.id)+' · 랜드마크 '+p.landmarks;
  }
}

function ownedCount(id){return Object.values(state.investments).filter(v=>v.owner===id).length}

function renderPlayerDock(){
  ui.playerDock.innerHTML='';
  state.players.forEach(p=>{
    const card=document.createElement('div');card.className='player-card'+(p.id===state.turn?' active':'')+(p.bankrupt?' bankrupt':'');card.style.borderColor=p.id===state.turn?p.color:'transparent';
    const collections=Object.keys(CONTINENTS).filter(k=>collectionActive(p.id,k));
    card.innerHTML=
      '<div class="player-row"><div class="p-avatar" style="background:'+p.color+'">'+p.emoji+'</div><div class="p-main"><b>'+p.name+(p.bankrupt?' · 여행종료':'')+'</b><small>'+BY_ID.get(p.country)?.name+' · '+ownedCount(p.id)+'개국 투자</small></div><div class="p-money">'+p.money+'만</div></div>'+
      '<div class="p-tags">'+
      (p.pass?'<span class="p-tag">🎟️ 패스 '+p.pass+'</span>':'')+
      (p.discount<1?'<span class="p-tag">💸 50% 할인</span>':'')+
      (p.buildPoints?'<span class="p-tag">🏗️ 건설권 '+p.buildPoints+'</span>':'')+
      collections.map(k=>'<span class="p-tag">'+CONTINENTS[k].icon+' '+CONTINENTS[k].name+'</span>').join('')+
      '</div>';
    ui.playerDock.appendChild(card);
  });
}

function announce(title,sub){
  ui.message.textContent=title;ui.messageSub.textContent=sub||'';
  const p=activePlayer();
  if(p)ui.moveLeft.textContent=state.phase==='choose'?'목적지를 선택하세요':'현재 '+BY_ID.get(p.country).name;
}

function finishGame(reason){
  if(!state.started)return;state.started=false;state.phase='ended';clearTimers();
  ui.actionModal.classList.add('hidden');ui.eventModal.classList.add('hidden');ui.game.classList.add('hidden');ui.result.classList.remove('hidden');
  const ranks=state.players.map(p=>({p,worth:netWorth(p),countries:ownedCount(p.id)})).sort((a,b)=>b.worth-a.worth);
  const winner=ranks[0]?.p;
  ui.resultTitle.textContent=winner?winner.name+' 세계여행 우승!':'세계여행 종료';
  ui.resultDesc.textContent=reason==='last-player'?'마지막까지 여행을 이어간 플레이어가 우승했습니다.':state.maxRounds+'라운드 여행 후 총자산으로 순위를 정했습니다.';
  ui.ranking.innerHTML='';
  ranks.forEach((r,i)=>{
    const row=document.createElement('div');row.className='rank-row';
    row.innerHTML='<div class="rank-no">'+(i+1)+'</div><div><b>'+r.p.emoji+' '+r.p.name+'</b><small>투자 '+r.countries+'개국 · 방문 '+r.p.visited.length+'개국 · 랜드마크 '+r.p.landmarks+'</small></div><div class="rank-worth">'+r.worth+'만</div>';
    ui.ranking.appendChild(row);
  });
  const me=state.players[0],score=netWorth(me),outcome=winner?.id===0?'win':'loss';
  try{
    window.KidscadeGame?.score?.(score,{unit:'만',higherIsBetter:true});
    window.KidscadeGame?.result?.({
      scope:'campaign',status:'completed',outcome,score,scoreOptions:{unit:'만',higherIsBetter:true},
      winner:winner?.id??null,rounds:Math.min(state.round,state.maxRounds),countriesVisited:me.visited.length,
      continentsVisited:me.continents.length,landmarks:me.landmarks,ownedCountries:ownedCount(0),completed:true
    });
  }catch(_){}
  try{
    const prev=Number(localStorage.getItem(SAVE_KEY)||0);
    if(score>prev)localStorage.setItem(SAVE_KEY,String(score));
  }catch(_){}
}

function resetToMenu(){
  clearTimers();state.started=false;state.phase='menu';state.routeOptions=[];ui.destinationStrip.innerHTML='';
  ui.result.classList.add('hidden');ui.game.classList.add('hidden');ui.start.classList.remove('hidden');
  if(geo)renderMapBase();
}

document.querySelectorAll('.seg button').forEach(btn=>btn.addEventListener('click',()=>{
  const group=btn.dataset.group;
  document.querySelectorAll('[data-group="'+group+'"]').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(group==='total'){setup.total=Number(btn.dataset.value);syncHumanButtons()}
}));
ui.startBtn.addEventListener('click',newGame);
ui.roll.addEventListener('click',()=>rollDice());
ui.restart.addEventListener('click',newGame);
ui.menu.addEventListener('click',resetToMenu);
$('quitBtn').addEventListener('click',()=>{if(state.started&&confirm('현재 세계여행을 종료하고 설정 화면으로 돌아갈까요?'))resetToMenu()});
addEventListener('keydown',e=>{if(e.code==='Space'&&state.phase==='roll'&&!activePlayer()?.isCpu){e.preventDefault();rollDice()}});
try{window.KidscadeGame?.registerCleanup?.(()=>{clearTimers();state.started=false})}catch(_){}

syncHumanButtons();
loadMap();
