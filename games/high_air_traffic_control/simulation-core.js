/* Independent gameplay implementation inspired by the design of AIROBICS.
 * No source code, audio, artwork or shaders from the referenced game are included.
 * Pure simulation module: also runs under Node for deterministic checks.
 */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AirTrafficCore = api;
})(typeof window !== 'undefined' ? window : null, function() {
  'use strict';
  const WIDTH = 960, HEIGHT = 640, TAU = Math.PI * 2;
  const MAPS = {
    practice: {
      title: '하늘빛 공항', duration: 150, interval: 13, required: 4, requiredCommands: 2,
      airports: [{id:'HBA',name:'하늘빛',x:488,y:320,angle:-0.32}],
      zones: [], backdrop:'forest'
    },
    coast: {
      title: '해안 관제구역', duration: 175, interval: 10, required: 6, requiredCommands: 3,
      airports: [{id:'BAY',name:'바다 공항',x:312,y:270,angle:.4},{id:'ISL',name:'섬 공항',x:697,y:413,angle:-.7}],
      zones: [{id:'W1',kind:'weather',x:570,y:170,w:144,h:109}], backdrop:'coast'
    },
    metro: {
      title: '도시 관제구역', duration: 195, interval: 8, required: 8, requiredCommands: 4,
      airports: [{id:'CTY',name:'중앙 공항',x:466,y:314,angle:.26},{id:'NTH',name:'북부 공항',x:266,y:183,angle:1.1},{id:'EST',name:'동부 공항',x:765,y:426,angle:-.55}],
      zones: [{id:'W2',kind:'weather',x:647,y:150,w:152,h:109},{id:'R1',kind:'restricted',x:330,y:490,w:132,h:103}],
      backdrop:'metro'
    }
  };
  const GATES = [
    {id:'N',name:'북쪽 항로',x:480,y:18,heading:Math.PI/2},
    {id:'E',name:'동쪽 항로',x:942,y:315,heading:Math.PI},
    {id:'S',name:'남쪽 항로',x:500,y:622,heading:-Math.PI/2},
    {id:'W',name:'서쪽 항로',x:18,y:335,heading:0}
  ];
  const TYPES = [
    {name:'여객기',prefix:'SKY',speed:49,weight:6},
    {name:'화물기',prefix:'BOX',speed:37,weight:3},
    {name:'구조기',prefix:'MED',speed:61,weight:1}
  ];
  const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const signedAngle = (v) => Math.atan2(Math.sin(v), Math.cos(v));
  function random(s) {
    s.seed = (Math.imul(s.seed,1664525) + 1013904223) >>> 0;
    return s.seed / 4294967296;
  }
  function choose(s, array) { return array[Math.floor(random(s)*array.length)]; }
  function notice(s, text, warn) {
    const time = Math.floor(s.elapsed);
    s.messages.unshift({id:++s.messageId,at:time,text:String(text),warn:Boolean(warn)});
    s.messages.length = Math.min(s.messages.length,12);
  }
  function create(mapKey, seed) {
    const m = MAPS[mapKey] || MAPS.practice;
    const s = {
      mapKey:MAPS[mapKey] ? mapKey : 'practice', map:m, seed:(Number(seed)>>>0)||20261025,
      elapsed:0,duration:m.duration,phase:'running', endReason:'',
      nextSpawn:9, sequence:0, planes:[], airports:m.airports.map(a=>({...a,busyUntil:0})),
      zones:m.zones.map(z=>({...z})), warnings:0, incidents:0, delivered:0, missed:0,
      score:0, totalDelay:0, warningPairs:{}, messages:[],messageId:0, managedIds:[], controlled:0, issuedInstructions:0,
      lastWeatherAt:0, activeAlerts:[], selectedId:null
    };
    notice(s,'관제 업무를 시작했어요. 항공기를 선택해 경로를 바꾸세요.');
    spawn(s);
    return s;
  }
  function spawn(s) {
    if(s.phase!=='running') return null;
    let gate=choose(s,GATES);
    for(let n=0;n<8;n++) {
      if(!s.planes.some(p=>distance(p,gate)<125)) break;
      gate=choose(s,GATES);
    }
    const r=random(s)*10;
    const type=r<6?TYPES[0]:r<9?TYPES[1]:TYPES[2];
    const toGate=random(s)<.17;
    const destination=toGate?choose(s,GATES.filter(g=>g.id!==gate.id)):choose(s,s.airports);
    const isExit=toGate;
    const jitter=(random(s)-.5)*140;
    let x=gate.x, y=gate.y;
    if(gate.id==='N'||gate.id==='S') x=clamp(gate.x+jitter,45,915);
    else y=clamp(gate.y+jitter,45,595);
    const plane={
      id:++s.sequence, callSign:type.prefix+'-'+String(100+s.sequence),
      type:type.name, from:gate.id, destId:destination.id,destName:destination.name,
      isExit,x,y,previousX:x,previousY:y,
      heading:gate.heading, speed:type.speed, currentSpeed:type.speed, altitude:s.sequence%3===0?2:1,
      targetAltitude:s.sequence%3===0?2:1, waypoint:null, holding:false, automaticHold:false,
      timeIn:s.elapsed, expectedTravel:distance({x,y},destination)/type.speed,
      warnedZone:{}, safeFrom:s.elapsed+2.5, status:'이동 중', trail:[]
    };
    s.planes.push(plane);
    notice(s,plane.callSign+' 출현 · 목적지 '+destination.name);
    return plane;
  }
  function findPlane(s,id) { return s&&s.planes.find(p=>p.id===Number(id))||null; }
  function findDest(s,p) {return p.isExit?GATES.find(g=>g.id===p.destId):s.airports.find(a=>a.id===p.destId);}
  function registerCommand(s,p) {
    s.issuedInstructions++;
    if (!s.managedIds.includes(p.id)) { s.managedIds.push(p.id); s.controlled++; }
  }
  function route(s,id,x,y) {
    const p=findPlane(s,id);
    if(!p||s.phase!=='running'||!Number.isFinite(x)||!Number.isFinite(y)) return false;
    p.waypoint={x:clamp(x,34,WIDTH-34),y:clamp(y,34,HEIGHT-34)};
    if (distance(p,p.waypoint)>=40) registerCommand(s,p);
    p.holding=false;p.automaticHold=false;p.status='경유점 이동';
    notice(s,p.callSign+' 경유점 변경');
    return true;
  }
  function direct(s,id) {
    const p=findPlane(s,id);
    if(!p||s.phase!=='running')return false;
    p.waypoint=null;p.holding=false;p.automaticHold=false;p.status='목적지 이동';
    notice(s,p.callSign+' 목적지로 재진입');
    return true;
  }
  function altitude(s,id,level) {
    const p=findPlane(s,id);
    if(!p||s.phase!=='running'||(level!==1&&level!==2))return false;
    if (p.targetAltitude!==level) registerCommand(s,p);
    p.targetAltitude=level;
    notice(s,p.callSign+' · 고도 '+level+'단계 지시');
    return true;
  }
  function hold(s,id) {
    const p=findPlane(s,id);
    if(!p||s.phase!=='running')return false;
    if (!p.holding) registerCommand(s,p);
    p.holding=!p.holding;
    p.automaticHold=false;p.waypoint=null;
    p.status=p.holding?'대기 선회':'목적지 이동';
    notice(s,p.callSign+(p.holding?' 대기 선회':' 목적지 재진입'));
    return true;
  }
  function inZone(p,z) {
    return Math.abs(p.x-z.x)<z.w/2 && Math.abs(p.y-z.y)<z.h/2;
  }
  function removeFlight(s,p,successful) {
    const dest=findDest(s,p);
    if(successful) {
      const delay=Math.max(0,s.elapsed-p.timeIn-p.expectedTravel-15);
      const gained=Math.max(35,Math.round(140-delay*2));
      s.score+=gained;s.delivered++;s.totalDelay+=Math.round(delay);
      if(!p.isExit)dest.busyUntil=s.elapsed+5;
      notice(s,p.callSign+(p.isExit?' 항로 통과':' 착륙 완료')+' · +'+gained+'점');
    } else {
      s.missed++;s.score=Math.max(0,s.score-60);
      notice(s,p.callSign+' 관제 구역을 벗어났어요.',true);
    }
    s.planes=s.planes.filter(other=>other.id!==p.id);
    if(s.selectedId===p.id)s.selectedId=null;
  }
  function updatePlane(s,p,dt) {
    const dest=findDest(s,p);
    if(!dest){removeFlight(s,p,false);return;}
    if(p.automaticHold && (!dest.busyUntil||dest.busyUntil<=s.elapsed)) {
      p.holding=false;p.automaticHold=false;p.status='활주로 진입';
    }
    const distToDest=distance(p,dest);
    if(!p.isExit && distToDest<110 && p.altitude>1.22 && !p.holding) {
      p.holding=true;p.automaticHold=true;p.status='강하 지시 필요';
      if(!p.warnedZone.alt) {notice(s,p.callSign+' · 착륙하려면 낮은 고도를 선택하세요.',true);p.warnedZone.alt=true;}
    }
    if(!p.isExit && p.automaticHold && p.targetAltitude===1 && p.altitude<=1.22) {
      p.holding=false;p.automaticHold=false;p.status='착륙 접근';
    }
    let goal=p.waypoint||dest;
    if(p.holding) {
      const center=p.isExit?{x:480,y:320}:dest;
      const theta=Math.atan2(p.y-center.y,p.x-center.x);
      const a=theta+0.75;
      goal={x:clamp(center.x+105*Math.cos(a),50,WIDTH-50),y:clamp(center.y+105*Math.sin(a),50,HEIGHT-50)};
    } else if(p.waypoint && distance(p,p.waypoint)<19) {
      p.waypoint=null;goal=dest;p.status='목적지 이동';
    }
    const wanted=Math.atan2(goal.y-p.y,goal.x-p.x);
    const difference=signedAngle(wanted-p.heading);
    const maxTurn=(p.type==='화물기'?.65:.9)*dt;
    p.heading=signedAngle(p.heading+clamp(difference,-maxTurn,maxTurn));
    p.altitude+=(p.targetAltitude-p.altitude)*Math.min(1,dt*.8);
    p.currentSpeed=p.speed;
    for(const z of s.zones) {
      if(!inZone(p,z))continue;
      if(z.kind==='weather') {
        p.currentSpeed*=.62;
        if(!p.warnedZone[z.id]){notice(s,p.callSign+' · 기상 구역 진입, 감속 중',true);p.warnedZone[z.id]=true;}
      } else if(!p.warnedZone[z.id]) {
        notice(s,p.callSign+' · 비행제한구역 통과, 감점',true);
        p.warnedZone[z.id]=true;s.score=Math.max(0,s.score-35);
      }
    }
    p.previousX=p.x;p.previousY=p.y;
    p.x+=Math.cos(p.heading)*p.currentSpeed*dt;
    p.y+=Math.sin(p.heading)*p.currentSpeed*dt;
    if(s.elapsed-Math.floor(s.elapsed*2)/2<dt*2) {
      p.trail.push({x:p.x,y:p.y});
      if(p.trail.length>14)p.trail.shift();
    }
    if(!p.holding && distance(p,dest)<27) {
      if(p.isExit)removeFlight(s,p,true);
      else if(p.altitude<=1.22 && dest.busyUntil<=s.elapsed) removeFlight(s,p,true);
      else if(dest.busyUntil>s.elapsed) {
        p.holding=true;p.automaticHold=true;p.status='활주로 사용 중';
        if(!p.warnedZone.busy){notice(s,p.callSign+' · 활주로 사용 중, 자동 대기 선회',true);p.warnedZone.busy=true;}
      }
    }
    if(s.planes.includes(p)&&(p.x<0||p.x>WIDTH||p.y<0||p.y>HEIGHT))removeFlight(s,p,false);
  }
  function checkSeparation(s) {
    const flights=s.planes;
    s.activeAlerts=[];
    const removed=new Set();
    for(let i=0;i<flights.length;i++)for(let j=i+1;j<flights.length;j++) {
      const a=flights[i],b=flights[j];
      if(removed.has(a.id)||removed.has(b.id)||s.elapsed<a.safeFrom||s.elapsed<b.safeFrom)continue;
      if(Math.abs(a.altitude-b.altitude)>.64)continue;
      const d=distance(a,b);
      const key=a.id+'-'+b.id;
      if(d<74) {
        s.activeAlerts.push(a.id,b.id);
        if(!s.warningPairs[key]) {
          s.warningPairs[key]=true;s.warnings++;s.score=Math.max(0,s.score-10);
          notice(s,a.callSign+' / '+b.callSign+' 접근 경고! 고도와 경로를 바꿔 주세요.',true);
        }
      }
      if(d<24) {
        removed.add(a.id);removed.add(b.id);s.incidents++;s.score=Math.max(0,s.score-110);
        notice(s,'안전 거리 부족 · 자동 관제가 두 항공기를 분리했어요.',true);
      }
    }
    if(removed.size) {
      s.planes=s.planes.filter(p=>!removed.has(p.id));
      if(removed.has(s.selectedId))s.selectedId=null;
    }
    if(s.incidents>=3){s.phase='failed';s.endReason='안전 개입이 세 번 발생해 근무가 종료되었어요.';}
  }
  function step(s,dt) {
    if(!s||s.phase!=='running'||!Number.isFinite(dt)||dt<=0)return s;
    dt=Math.min(dt,.1);s.elapsed+=dt;
    if(s.elapsed>=s.duration) {
      s.elapsed=s.duration;
      const passed=s.incidents<3 && s.delivered>=s.map.required && s.controlled>=s.map.requiredCommands;
      s.phase=passed?'completed':'failed';
      s.endReason=passed?'오늘의 관제 업무를 안전하게 마쳤어요.':s.controlled<s.map.requiredCommands?'항공기를 직접 안내한 횟수가 부족해요. 다음에는 여러 비행기의 경로와 고도를 지시해 보세요.':'근무가 끝났어요. 안전하게 도착한 항공기가 더 필요해요.';
      notice(s,s.endReason,!passed);
      return s;
    }
    if(s.elapsed>=s.nextSpawn) {
      spawn(s);
      // Additional traffic appears gradually; avoid an immediate crowd at start.
      const difficulty=.97-Math.min(.2,s.elapsed/s.duration*.2);
      s.nextSpawn+=s.map.interval*difficulty;
    }
    for(const z of s.zones)if(z.kind==='weather')z.x=clamp((s.map.zones.find(o=>o.id===z.id)||z).x+Math.sin(s.elapsed*.035)*15,100,860);
    for(const p of s.planes.slice())if(s.planes.includes(p))updatePlane(s,p,dt);
    checkSeparation(s);
    return s;
  }
  return {WIDTH,HEIGHT,MAPS,GATES,create,spawn,step,route,direct,altitude,hold,findPlane,findDest,distance};
});