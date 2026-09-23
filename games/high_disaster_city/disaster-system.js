(function(root){
'use strict';
const DC=root.DisasterCity=root.DisasterCity||{},D=DC.DATA;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function slotProgress(slot,side){
 const span=650;return side==='left'?clamp((slot.x-70)/span,0,1):clamp((1370-slot.x)/span,0,1)
}
function spawn(sim){
 const s=sim.state,type=s.next.type,side=s.next.side,p=sim.pressure(),base=type==='wildfire'?105:112;
 s.disaster={type,side,energy:base*p,maxEnergy:base*p,progress:0,age:0,blockPause:0,blockedSlot:-1,pulse:0};
 sim.planNextAfterSpawn();sim.emit('warning',(side==='left'?'서쪽':'동쪽')+'에서 '+(type==='wildfire'?'산불':'홍수')+'이 시작됐습니다!');
 if(s.tutorial&&s.tutorialStep===2){s.tutorialStep=3;sim.emit('tip',type==='wildfire'?'산불에는 「소방대 출동」과 소방서가 효과적입니다.':'홍수에는 「모래주머니」와 제방·배수펌프가 효과적입니다.')}
}
function preview(sim,d){
 const s=sim.state;if(!s.next.visible&&d.age>7.5){s.next.visible=true;sim.emit('omen',(s.next.side==='left'?'서쪽':'동쪽')+'에서 다음 재앙의 징조가 보입니다.')}
}
function nearestBlockingLevee(sim,d){
 let best=null,bp=2;for(const slot of sim.state.slots){const b=slot.building;if(!b||b.id!=='levee'|| (slot.x<D.TOWN_X?'left':'right')!==d.side)continue;const p=slotProgress(slot,d.side);if(p>=d.progress-.025&&p<bp){bp=p;best=slot}}
 return best
}
function damageAroundFront(sim,d,dt,kind){
 const pwr=sim.pressure();for(const slot of sim.state.slots){const b=slot.building;if(!b)continue;const p=slotProgress(slot,d.side),delta=d.progress-p;
  if(kind==='wildfire'){
   if(Math.abs(delta)<.09){const vuln=b.id==='farm'?1.35:b.id==='reservoir'?.85:1;sim.damageBuilding(slot.i,(7.4*pwr*vuln)*dt,'wildfire')}
  }else{
   if(delta>=0&&delta<.17&&b.id!=='levee'){const vuln=b.id==='farm'?1.22:b.id==='pump'?.78:1;sim.damageBuilding(slot.i,(5.2*pwr*vuln)*dt,'flood')}
  }
 }
}
function updateWildfire(sim,d,dt){
 const s=sim.state,p=sim.pressure(),stations=sim.buildingCount('fireStation',d.side),reservoirs=sim.buildingCount('reservoir');
 const suppression=stations*(1.05+reservoirs*.18);d.energy-=dt*(2.05+suppression);d.progress+=dt*(.0315*p);
 d.progress=Math.max(0,d.progress-dt*stations*.0045);damageAroundFront(sim,d,dt,'wildfire');
 if(d.progress>.94){s.stability=Math.max(0,s.stability-dt*(3.1*p));d.energy-=dt*.8}
}
function updateFlood(sim,d,dt){
 const s=sim.state,p=sim.pressure(),pumps=sim.buildingCount('pump'),block=nearestBlockingLevee(sim,d);
 d.blockPause=Math.max(0,(d.blockPause||0)-dt);d.energy-=dt*(1.45+pumps*1.65);d.progress=Math.max(0,d.progress-dt*pumps*.0018);
 if(block&&d.progress>=slotProgress(block,d.side)-.025){
  d.blockedSlot=block.i;d.progress=Math.min(d.progress,slotProgress(block,d.side));d.energy-=dt*.55;sim.damageBuilding(block.i,dt*(8.4*p),'flood');
 }else{d.blockedSlot=-1;if(d.blockPause<=0)d.progress+=dt*(.0275*p)}
 damageAroundFront(sim,d,dt,'flood');if(d.progress>.94){s.stability=Math.max(0,s.stability-dt*(2.7*p));d.energy-=dt*.65}
}
DC.Disasters={
 update(sim,dt){
  const s=sim.state,d=s.disaster;
  if(!d){
   s.next.in-=dt;if(s.next.in<=0)spawn(sim);return
  }
  d.age+=dt;d.pulse+=dt;preview(sim,d);
  if(d.type==='wildfire')updateWildfire(sim,d,dt);else updateFlood(sim,d,dt);
  d.energy=clamp(d.energy,0,d.maxEnergy);d.progress=clamp(d.progress,0,1);
  if(d.energy<=0)sim.resolveDisaster();
 }
};
})(window);