(function(root){
'use strict';
const DC=root.DisasterCity=root.DisasterCity||{},D=DC.DATA;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function slotProgress(slot,side){const span=650;return side==='left'?clamp((slot.x-70)/span,0,1):clamp((1370-slot.x)/span,0,1)}
function definition(type){return D.DISASTERS?.[type]||D.DISASTERS?.wildfire||{name:type,icon:'⚠️',baseEnergy:105,baseAge:36}}
function spawn(sim){
 const s=sim.state,type=s.next.type,side=s.next.side,p=sim.pressure(),def=definition(type),base=def.baseEnergy||105,maxAge=(def.baseAge||36)+Math.min(12,p*6),d={id:(s.time*1000|0)+'-'+side+'-'+type,type,side,strength:p,energy:base*p,maxEnergy:base*p,progress:0,age:0,maxAge,blockPause:0,blockedSlot:-1,pulse:0};
 s.disasters.push(d);sim.scheduleNext(d);sim.emit('warning',(side==='left'?'서쪽':'동쪽')+'에서 '+def.icon+' '+def.name+'이(가) 시작됐습니다!');
 if(s.tutorial&&s.tutorialStep===2){
  s.tutorialStep=3;
  const tips={
   wildfire:'산불에는 소방대·방화선·소방서를 조합하세요.',
   flood:'홍수에는 제방·배수펌프·긴급 배수를 조합하세요.',
   typhoon:'태풍은 재난대피소와 창문 보강으로 피해를 줄일 수 있어요.',
   heatwave:'폭염은 무더위 쉼터와 급수 지원으로 버티세요.',
   blizzard:'폭설은 제설기지와 제설차가 효과적입니다.',
   earthquake:'지진은 재난대피소와 긴급 대피가 핵심입니다.'
  };
  sim.emit('tip',tips[type]||'재난에 맞는 방재시설과 대응 카드를 조합하세요.');
 }
}
function preview(sim){
 const s=sim.state;if(s.next.visible||!s.disasters.length)return;const oldest=s.disasters.reduce((a,b)=>a.age>b.age?a:b);
 if(oldest.age>7.5){const def=definition(s.next.type);s.next.visible=true;sim.emit('omen',(s.next.side==='left'?'서쪽':'동쪽')+'에서 '+def.icon+' '+def.name+'의 징조가 보입니다.')}
}
function nearestBlockingLevee(sim,d){
 let best=null,bp=2;for(const slot of sim.state.slots){const b=slot.building;if(!b||b.id!=='levee'||(slot.x<D.TOWN_X?'left':'right')!==d.side)continue;const p=slotProgress(slot,d.side);if(p>=d.progress-.025&&p<bp){bp=p;best=slot}}
 return best
}
function damageAroundFront(sim,d,dt,kind){
 const pwr=d.strength||sim.pressure();for(const slot of sim.state.slots){const b=slot.building;if(!b)continue;const p=slotProgress(slot,d.side),delta=d.progress-p,lvl=b.level||1,fort=1+.12*(lvl-1);
  if(kind==='wildfire'&&Math.abs(delta)<.09){const vuln=b.id==='farm'?1.35:b.id==='reservoir'?.85:1;sim.damageBuilding(slot.i,(7.0*pwr*vuln/fort)*dt,'wildfire')}
  else if(kind==='flood'&&delta>=0&&delta<.17&&b.id!=='levee'){const vuln=b.id==='farm'?1.22:b.id==='pump'?.78:1;sim.damageBuilding(slot.i,(5.0*pwr*vuln/fort)*dt,'flood')}
  else if(kind==='typhoon'&&Math.abs(delta)<.14){const vuln=b.id==='farm'?1.25:b.id==='shelter'?.62:1;sim.damageBuilding(slot.i,(5.8*pwr*vuln/fort)*dt,'typhoon')}
  else if(kind==='blizzard'&&delta>=-.02&&delta<.16){const vuln=b.id==='farm'?1.42:b.id==='snowDepot'?.58:1;sim.damageBuilding(slot.i,(4.3*pwr*vuln/fort)*dt,'blizzard')}
 }
}
function updateWildfire(sim,d,dt){
 const s=sim.state,p=d.strength||sim.pressure(),stations=sim.supportPower('fireStation',d.side,d.progress),reservoirs=sim.supportPower('reservoir',d.side,d.progress);
 const suppression=stations*(1.12+reservoirs*.12);d.blockPause=Math.max(0,(d.blockPause||0)-dt);d.energy-=dt*(1.12+suppression);
 if(d.blockPause<=0)d.progress+=dt*(.0295*p);d.progress=Math.max(0,d.progress-dt*stations*.0048);damageAroundFront(sim,d,dt,'wildfire');
 if(d.progress>.94){s.stability=Math.max(0,s.stability-dt*(3.0*p));d.energy-=dt*.55}
}
function updateFlood(sim,d,dt){
 const s=sim.state,p=d.strength||sim.pressure(),pumps=sim.supportPower('pump',d.side,d.progress),block=nearestBlockingLevee(sim,d);
 d.blockPause=Math.max(0,(d.blockPause||0)-dt);d.energy-=dt*(.88+pumps*1.52);d.progress=Math.max(0,d.progress-dt*pumps*.0019);
 if(block&&d.progress>=slotProgress(block,d.side)-.025){
  d.blockedSlot=block.i;d.progress=Math.min(d.progress,slotProgress(block,d.side));d.energy-=dt*.45;sim.damageBuilding(block.i,dt*(7.4*p/(1+.14*((block.building.level||1)-1))),'flood');
 }else{d.blockedSlot=-1;if(d.blockPause<=0)d.progress+=dt*(.027*p)}
 damageAroundFront(sim,d,dt,'flood');if(d.progress>.94){s.stability=Math.max(0,s.stability-dt*(2.6*p));d.energy-=dt*.48}
}
function updateTyphoon(sim,d,dt){
 const s=sim.state,p=d.strength||sim.pressure(),shelters=sim.supportPower('shelter',d.side,d.progress),guard=1+shelters*.48;
 d.blockPause=Math.max(0,(d.blockPause||0)-dt);d.energy-=dt*(.96+shelters*1.08);
 if(d.blockPause<=0)d.progress+=dt*(.035*p/(1+shelters*.14));d.progress=Math.max(0,d.progress-dt*shelters*.0028);
 damageAroundFront(sim,d,dt,'typhoon');if(d.progress>.92)s.stability=Math.max(0,s.stability-dt*(2.45*p/guard));
}
function updateHeatwave(sim,d,dt){
 const s=sim.state,p=d.strength||sim.pressure(),cool=sim.buildingCount('coolingCenter'),water=sim.buildingCount('reservoir'),shield=1+cool*.55+water*.10;
 d.energy-=dt*(.92+cool*1.28);d.progress=clamp(d.age/Math.max(1,d.maxAge*.72),0,1);
 s.food=Math.max(0,s.food-dt*(.060*p/shield));s.stability=Math.max(0,s.stability-dt*(.13*p/shield));
 for(const slot of s.slots){const b=slot.building;if(b?.id==='farm')sim.damageBuilding(slot.i,dt*(.58*p/shield),'heatwave')}
 if(d.progress>.82)s.stability=Math.max(0,s.stability-dt*(.11*p/shield));
}
function updateBlizzard(sim,d,dt){
 const s=sim.state,p=d.strength||sim.pressure(),depots=sim.supportPower('snowDepot',d.side,d.progress),guard=1+depots*.35;
 d.blockPause=Math.max(0,(d.blockPause||0)-dt);d.energy-=dt*(.90+depots*1.32);
 if(d.blockPause<=0)d.progress+=dt*(.024*p/(1+depots*.13));d.progress=Math.max(0,d.progress-dt*depots*.0035);
 s.food=Math.max(0,s.food-dt*(.028*p/guard));damageAroundFront(sim,d,dt,'blizzard');
 if(d.progress>.92)s.stability=Math.max(0,s.stability-dt*(1.75*p/guard));
}
function updateEarthquake(sim,d,dt){
 const s=sim.state,p=d.strength||sim.pressure(),shelters=sim.buildingCount('shelter'),guard=1+shelters*.38;
 d.blockPause=Math.max(0,(d.blockPause||0)-dt);d.energy-=dt*(1.35+shelters*.92);d.progress=clamp(d.age/Math.max(1,d.maxAge),0,1);
 if(d.blockPause>0){d.pulse=Math.min(d.pulse,2);return}
 if(d.pulse>=3.1){
  d.pulse=0;const occupied=s.slots.filter(slot=>slot.building),hits=Math.min(occupied.length,1+(p>1.3?1:0)+(p>1.9?1:0));
  const pool=occupied.slice();for(let i=0;i<hits&&pool.length;i++){const n=Math.floor(sim.rand()*pool.length),slot=pool.splice(n,1)[0],lvl=slot.building.level||1;sim.damageBuilding(slot.i,(14*p/guard)/(1+.12*(lvl-1)),'earthquake')}
  s.stability=Math.max(0,s.stability-(1.15*p/(1+shelters*.45)));sim.emit('quake','여진이 도시를 흔들었습니다.');
 }
}
const UPDATERS={wildfire:updateWildfire,flood:updateFlood,typhoon:updateTyphoon,heatwave:updateHeatwave,blizzard:updateBlizzard,earthquake:updateEarthquake};
const DIRECTIONAL=new Set(['wildfire','flood','typhoon','blizzard']);
DC.Disasters={
 update(sim,dt){
  const s=sim.state,choosingReward=s.rewardChoices.length>0||s.cleanupChoices.length>0;
  if(!choosingReward)s.next.in-=dt;
  const sideBusy=s.disasters.some(d=>d.side===s.next.side);if(!choosingReward&&s.next.in<=0&&s.disasters.length<sim.maxConcurrent()&&!sideBusy)spawn(sim);
  preview(sim);
  const list=s.disasters.slice();
  for(const d of list){
   d.age+=dt;d.pulse+=dt;(UPDATERS[d.type]||updateWildfire)(sim,d,dt);
   const maxAge=d.maxAge||48,fadeStart=maxAge*.68;if(d.age>fadeStart){const fade=(d.age-fadeStart)/Math.max(1,maxAge-fadeStart);d.energy-=dt*(2.2+fade*7.5);if(DIRECTIONAL.has(d.type))d.progress=Math.max(0,d.progress-dt*(.004+fade*.012))}
   d.energy=clamp(d.energy,0,d.maxEnergy);d.progress=clamp(d.progress,0,1);if(d.energy<=0||d.age>=maxAge)sim.resolveDisaster(d);
  }
 }
};
})(window);
