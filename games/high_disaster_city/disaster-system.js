(function(root){
'use strict';
const DC=root.DisasterCity=root.DisasterCity||{},D=DC.DATA;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function slotProgress(slot,side){const span=650;return side==='left'?clamp((slot.x-70)/span,0,1):clamp((1370-slot.x)/span,0,1)}
function spawn(sim){
 const s=sim.state,type=s.next.type,side=s.next.side,p=sim.pressure(),base=type==='wildfire'?105:112,d={id:(s.time*1000|0)+'-'+side+'-'+type,type,side,strength:p,energy:base*p,maxEnergy:base*p,progress:0,age:0,blockPause:0,blockedSlot:-1,pulse:0};
 s.disasters.push(d);sim.scheduleNext(d);sim.emit('warning',(side==='left'?'서쪽':'동쪽')+'에서 '+(type==='wildfire'?'산불':'홍수')+'이 시작됐습니다!');
 if(s.tutorial&&s.tutorialStep===2){s.tutorialStep=3;sim.emit('tip',type==='wildfire'?'산불에는 소방대와 방화선이 서로 다른 방식으로 효과적입니다.':'홍수에는 모래주머니·긴급 배수·제방·펌프를 조합하세요.')}
}
function preview(sim){
 const s=sim.state;if(s.next.visible||!s.disasters.length)return;const oldest=s.disasters.reduce((a,b)=>a.age>b.age?a:b);if(oldest.age>7.5){s.next.visible=true;sim.emit('omen',(s.next.side==='left'?'서쪽':'동쪽')+'에서 다음 재앙의 징조가 보입니다.')}
}
function nearestBlockingLevee(sim,d){
 let best=null,bp=2;for(const slot of sim.state.slots){const b=slot.building;if(!b||b.id!=='levee'||(slot.x<D.TOWN_X?'left':'right')!==d.side)continue;const p=slotProgress(slot,d.side);if(p>=d.progress-.025&&p<bp){bp=p;best=slot}}
 return best
}
function damageAroundFront(sim,d,dt,kind){
 const pwr=d.strength||sim.pressure();for(const slot of sim.state.slots){const b=slot.building;if(!b)continue;const p=slotProgress(slot,d.side),delta=d.progress-p,lvl=b.level||1;
  if(kind==='wildfire'){
   if(Math.abs(delta)<.09){const vuln=b.id==='farm'?1.35:b.id==='reservoir'?.85:1,fort=1+.12*(lvl-1);sim.damageBuilding(slot.i,(7.0*pwr*vuln/fort)*dt,'wildfire')}
  }else if(delta>=0&&delta<.17&&b.id!=='levee'){const vuln=b.id==='farm'?1.22:b.id==='pump'?.78:1,fort=1+.12*(lvl-1);sim.damageBuilding(slot.i,(5.0*pwr*vuln/fort)*dt,'flood')}
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
DC.Disasters={
 update(sim,dt){
  const s=sim.state;s.next.in-=dt;
  if(s.next.in<=0&&s.disasters.length<sim.maxConcurrent())spawn(sim);
  preview(sim);
  const list=s.disasters.slice();
  for(const d of list){
   d.age+=dt;d.pulse+=dt;if(d.type==='wildfire')updateWildfire(sim,d,dt);else updateFlood(sim,d,dt);
   d.energy=clamp(d.energy,0,d.maxEnergy);d.progress=clamp(d.progress,0,1);if(d.energy<=0)sim.resolveDisaster(d);
  }
 }
};
})(window);