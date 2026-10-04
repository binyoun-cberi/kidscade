import * as THREE from 'three';

const WEATHER={
  clear:{id:'clear',label:'맑음',icon:'☀️',weight:42,sun:1,hemi:1,sky:0xb9d8ee,skyMix:.05,fogNear:28,fogFar:52},
  cloudy:{id:'cloudy',label:'흐림',icon:'☁️',weight:26,sun:.72,hemi:.92,sky:0xaebdc6,skyMix:.38,fogNear:25,fogFar:47},
  rain:{id:'rain',label:'비',icon:'🌧️',weight:22,sun:.50,hemi:.84,sky:0x879eaf,skyMix:.52,fogNear:22,fogFar:42},
  fog:{id:'fog',label:'안개',icon:'🌫️',weight:10,sun:.58,hemi:.91,sky:0xc4ced0,skyMix:.60,fogNear:16,fogFar:34}
};
const THEMES=[
  '광장 산책이 좋은 날','강가에 들러보기 좋은 날','주민들과 이야기하기 좋은 날',
  '채집하기 좋은 날','카페에서 쉬어가기 좋은 날','마을 구석구석 둘러보는 날'
];

function seeded(day,salt=0){
  let x=((Math.max(1,day)*2654435761)^(salt*1597334677))>>>0;
  return ()=>{
    x+=0x6D2B79F5;let t=x;
    t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
function pickWeather(day){
  if(day===1)return WEATHER.clear;
  if(day===2)return WEATHER.clear;
  if(day===3)return WEATHER.cloudy;
  const r=seeded(day,17)()*100;let acc=0;
  for(const def of Object.values(WEATHER)){acc+=def.weight;if(r<acc)return def}
  return WEATHER.clear;
}
function rollDay(day){
  const rng=seeded(day,43),weather=pickWeather(day);
  const visitorSeed=Math.floor(rng()*1e9),visitorRoll=seeded(visitorSeed,71)();
  let visitor='none';
  if(day===2)visitor='crafter';
  else if(day===3)visitor='collector';
  else if(day>3){
    const pool=['none','crafter','collector','prospector','angler'];
    visitor=pool[Math.min(pool.length-1,Math.floor(visitorRoll*pool.length))];
  }
  return {
    version:2,day,weather:weather.id,
    theme:THEMES[Math.floor(rng()*THEMES.length)%THEMES.length],
    shopSeed:Math.floor(rng()*1e9),forageSeed:Math.floor(rng()*1e9),
    visitorSeed,requestSeed:Math.floor(rng()*1e9),visitor
  };
}

function makeRain(parent){
  const count=170,positions=new Float32Array(count*3),speeds=new Float32Array(count);
  const rng=seeded(917,3);
  for(let i=0;i<count;i++){
    positions[i*3]=(rng()-.5)*22;positions[i*3+1]=rng()*12+.5;positions[i*3+2]=(rng()-.5)*22;
    speeds[i]=5+rng()*5;
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const material=new THREE.PointsMaterial({color:0xcbe4f3,size:.075,transparent:true,opacity:.72,depthWrite:false});
  const points=new THREE.Points(geometry,material);points.frustumCulled=false;points.visible=false;points.renderOrder=8;
  parent.add(points);
  return {points,positions,speeds,count};
}

export function createDailyDirector(ctx){
  const {parent,prog,persist,onDayStart}=ctx;
  const rain=makeRain(parent);
  let current=rollDay(Math.max(1,prog().survival?.day||1)),lastSyncedDay=0;

  function weatherDef(){return WEATHER[current?.weather]||WEATHER.clear}
  function ensure(day,{initial=false}={}){
    day=Math.max(1,Math.floor(Number(day)||1));
    const p=prog();p.dailyWorld=p.dailyWorld&&typeof p.dailyWorld==='object'?p.dailyWorld:{};
    const saved=p.dailyWorld;
    const same=Number(saved.day)===day&&WEATHER[saved.weather];
    const previousDay=Number(saved.day)||0,rolled=rollDay(day);
    if(same){
      const extras={
        taken:saved.taken,requests:saved.requests,requestDay:saved.requestDay,requestDone:saved.requestDone,
        visitorDone:saved.visitorDone
      };
      current={...rolled};
      for(const [key,value] of Object.entries(extras))if(value!==undefined)current[key]=value;
      p.dailyWorld={...current};
      if(Number(saved.version)!==2)persist();
    }else{
      current=rolled;p.dailyWorld={...current};persist();
      if(!initial&&previousDay!==day)onDayStart?.(current);
    }
    lastSyncedDay=day;
    rain.points.visible=current.weather==='rain';
    return current;
  }

  function update(now,dt,player,day){
    if(Number(day)!==lastSyncedDay)ensure(day,{initial:lastSyncedDay===0});
    const raining=current.weather==='rain';rain.points.visible=raining;
    if(!raining)return;
    const pos=rain.positions;
    for(let i=0;i<rain.count;i++){
      pos[i*3+1]-=rain.speeds[i]*dt;
      pos[i*3]+=.45*dt;
      if(pos[i*3+1]<.05){pos[i*3+1]=10+((i*37)%23)/3;pos[i*3]=(i*97%220)/10-11;pos[i*3+2]=(i*53%220)/10-11;}
    }
    rain.points.position.x=player?.x||0;rain.points.position.z=player?.z||0;
    rain.points.geometry.attributes.position.needsUpdate=true;
  }

  function applyLighting(base){
    const d=weatherDef(),dayTint=new THREE.Color(d.sky);
    const tinted=base.dayColor.clone().lerp(dayTint,d.skyMix);
    const sky=base.nightColor.clone().lerp(tinted,base.daylight);
    base.sun.intensity=(.45+base.daylight*2.95)*d.sun;
    base.hemi.intensity=(.55+base.daylight*1.45)*d.hemi;
    base.scene.background.copy(sky);base.scene.fog.color.copy(sky);
    base.scene.fog.near=d.fogNear;base.scene.fog.far=d.fogFar;
    base.renderer.setClearColor(sky,1);
    return sky;
  }

  function state(){return current}
  function weather(){return weatherDef()}
  function summary(){const d=weatherDef();return d.icon+' '+d.label+' · '+(current.theme||'평범한 하루')}

  ensure(prog().survival?.day||1,{initial:true});
  return {ensure,update,applyLighting,state,weather,summary,WEATHER};
}
