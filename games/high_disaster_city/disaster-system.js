(function(root){
'use strict';
const DC=root.DisasterCity=root.DisasterCity||{},D=DC.DATA;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function definition(type){return D.DISASTERS?.[type]||D.DISASTERS?.wildfire||{name:type,icon:'⚠️',baseEnergy:105,baseAge:36}}
function phaseFor(d){
 const p=d.age/Math.max(1,d.maxAge||1);
 if(p<.16)return'approach';
 if(p<.72)return'impact';
 if(p<.93)return'receding';
 return'recovery';
}
function spawn(sim){
 const s=sim.state,type=s.next.type,side=s.next.side,p=sim.pressure(),def=definition(type),base=def.baseEnergy||105,maxAge=(def.baseAge||36)+Math.min(12,p*6);
 const d={id:(s.time*1000|0)+'-'+side+'-'+type,type,side,strength:p,energy:base*p,maxEnergy:base*p,progress:0,age:0,maxAge,phase:'approach',blockPause:0,blockedSlot:-1,pulse:0,fieldAmount:0,fieldPeak:0};
 s.disasters.push(d);DC.Field?.startDisaster?.(sim,d);sim.scheduleNext(d);
 sim.emit('warning',(side==='left'?'서쪽':'동쪽')+'에서 '+def.icon+' '+def.name+'이(가) 시작됐습니다!');
 if(s.tutorial&&s.tutorialStep===2){
  s.tutorialStep=3;
  const tips={
   wildfire:'산불은 실제 셀을 따라 번집니다. 소방서·저수조·방화선으로 길을 끊으세요.',
   flood:'홍수는 실제 물이 이동합니다. 제방으로 막고 펌프·긴급 배수로 물을 빼세요.',
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
function damageAroundFront(sim,d,dt,kind){
 const pwr=d.strength||sim.pressure();
 for(const slot of sim.state.slots){
  const b=slot.building;if(!b)continue;
  const span=650,p=slot.x<D.TOWN_X?clamp((slot.x-70)/span,0,1):clamp((1370-slot.x)/span,0,1),delta=d.progress-p,lvl=b.level||1,fort=1+.12*(lvl-1);
  if(kind==='typhoon'&&Math.abs(delta)<.14){const vuln=b.id==='farm'?1.25:b.id==='shelter'?.62:1;sim.damageBuilding(slot.i,(5.8*pwr*vuln/fort)*dt,'typhoon')}
  else if(kind==='blizzard'&&delta>=-.02&&delta<.16){const vuln=b.id==='farm'?1.42:b.id==='snowDepot'?.58:1;sim.damageBuilding(slot.i,(4.3*pwr*vuln/fort)*dt,'blizzard')}
 }
}
function updateWildfire(sim,d,dt){
 d.blockPause=Math.max(0,(d.blockPause||0)-dt);
 DC.Field?.updateWildfire?.(sim,d,dt);
}
function updateFlood(sim,d,dt){
 d.blockPause=Math.max(0,(d.blockPause||0)-dt);
 DC.Field?.updateFlood?.(sim,d,dt);
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
const FIELD_TYPES=new Set(['wildfire','flood']);
const DIRECTIONAL=new Set(['typhoon','blizzard']);
DC.Disasters={
 update(sim,dt){
  const s=sim.state,choosingReward=s.rewardChoices.length>0||s.cleanupChoices.length>0;
  DC.Field?.ambient?.(sim,dt);
  if(!choosingReward)s.next.in-=dt;
  const sideBusy=s.disasters.some(d=>d.side===s.next.side);
  if(!choosingReward&&s.next.in<=0&&s.disasters.length<sim.maxConcurrent()&&!sideBusy)spawn(sim);
  preview(sim);
  const list=s.disasters.slice();
  for(const d of list){
   d.age+=dt;d.pulse+=dt;d.phase=phaseFor(d);
   (UPDATERS[d.type]||updateWildfire)(sim,d,dt);
   const maxAge=d.maxAge||48,fadeStart=maxAge*.68;
   if(d.age>fadeStart&&!FIELD_TYPES.has(d.type)){
    const fade=(d.age-fadeStart)/Math.max(1,maxAge-fadeStart);d.energy-=dt*(2.2+fade*7.5);
    if(DIRECTIONAL.has(d.type))d.progress=Math.max(0,d.progress-dt*(.004+fade*.012));
   }
   d.energy=clamp(d.energy,0,d.maxEnergy);d.progress=clamp(d.progress,0,1);
   const exhausted=d.energy<=.01&&d.age>6;
   if(exhausted||d.age>=maxAge)sim.resolveDisaster(d);
  }
 }
};
})(window);
