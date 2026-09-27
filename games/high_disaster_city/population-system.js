(function(root){
'use strict';
const DC=root.DisasterCity=root.DisasterCity||{},D=DC.DATA;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function ensure(sim){const s=sim.state;if(!s.evacuation)s.evacuation={groups:[],boostUntil:0,evacuatedTotal:0,stranded:0,sheltered:0};return s.evacuation}
function shelterCapacity(b){const lvl=b?.level||1;return lvl===1?10:lvl===2?18:28}
function hazardAt(sim,slot){
 let hazard=0;const f=sim.state.field;
 if(f?.cells?.length&&DC.Field){const c=DC.Field.slotCol(slot),r=DC.Field.slotRow(),cells=DC.Field.cellsInRadius(f,c,r,1);hazard=Math.max(hazard,...cells.map(x=>Math.max((x.water||0)*.85,x.fire||0)))}
 for(const d of sim.state.disasters){
  if(d.type==='earthquake')hazard=Math.max(hazard,.62+.18*(d.strength||1));
  else if(d.type==='typhoon'){
   const side=slot.x<D.TOWN_X?'left':'right';if(side===d.side)hazard=Math.max(hazard,d.progress>.45?.52:.26)
  }
 }
 return clamp(hazard,0,1.5)
}
function sync(sim){
 const e=ensure(sim),houses=sim.state.slots.filter(x=>x.building?.id==='house'),bySlot=new Map(e.groups.map(g=>[g.slotIndex,g]));
 const cap=houses.reduce((n,x)=>n+6*(x.building.level||1),0)||1;let remaining=Math.max(0,Math.round(sim.state.population));
 const next=[];
 for(let i=0;i<houses.length;i++){
  const slot=houses[i],capacity=6*(slot.building.level||1),share=i===houses.length-1?remaining:Math.min(remaining,Math.round(sim.state.population*capacity/cap));remaining-=share;
  const old=bySlot.get(slot.i),g=old||{slotIndex:slot.i,total:0,status:'home',progress:0,targetSlot:-1};
  g.total=share;if(g.total<=0){g.status='home';g.progress=0;g.targetSlot=-1}next.push(g)
 }
 e.groups=next;return e
}
function assignShelter(sim,g,used){
 const home=sim.state.slots[g.slotIndex],shelters=sim.state.slots.filter(x=>x.building?.id==='shelter').sort((a,b)=>Math.abs(a.x-home.x)-Math.abs(b.x-home.x));
 for(const slot of shelters){const cap=shelterCapacity(slot.building),taken=used.get(slot.i)||0,room=Math.max(0,cap-taken);if(room<g.total)continue;used.set(slot.i,taken+g.total);g.targetSlot=slot.i;return true}
 g.targetSlot=-1;return false
}
function update(sim,dt){
 const e=sync(sim),used=new Map();
 for(const g of e.groups)if(g.status==='sheltered'&&g.targetSlot>=0)used.set(g.targetSlot,(used.get(g.targetSlot)||0)+g.total);
 const active=sim.state.disasters.length>0,boost=sim.state.time<(e.boostUntil||0);
 let stranded=0,sheltered=0;
 for(const g of e.groups){
  const home=sim.state.slots[g.slotIndex];if(!home?.building)continue;const risk=hazardAt(sim,home);
  if(!active&&risk<.12){g.status='home';g.progress=0;g.targetSlot=-1;continue}
  if(risk>.24&&g.status==='home'){
   const full=assignShelter(sim,g,used);g.status=g.targetSlot>=0?'evacuating':'stranded';g.progress=0;if(!full&&g.targetSlot<0)g.status='stranded'
  }
  if(g.status==='evacuating'){
   const target=sim.state.slots[g.targetSlot];if(!target?.building||target.building.id!=='shelter'){g.status='stranded';g.targetSlot=-1}
   else{const distance=Math.max(1,Math.abs(target.x-home.x)/90),speed=(boost?.95:.48)/(1+distance*.12);g.progress=clamp(g.progress+dt*speed,0,1);if(g.progress>=1){g.status='sheltered';e.evacuatedTotal+=g.total;sim.emit('evacuate',g.total+'명이 대피소에 도착했습니다.',{x:target.x})}}
  }
  if(g.status==='sheltered')sheltered+=g.total;
  else if(g.status==='stranded'){stranded+=g.total;if(risk>.35)sim.state.stability=Math.max(0,sim.state.stability-dt*g.total*.006*risk)}
 }
 e.stranded=stranded;e.sheltered=sheltered;
}
function emergency(sim,seconds=15){const e=ensure(sim);e.boostUntil=Math.max(e.boostUntil||0,sim.state.time+seconds);for(const g of e.groups)if(g.status==='stranded')g.status='home';return seconds}
function summary(sim){const e=ensure(sim);return{sheltered:e.sheltered||0,stranded:e.stranded||0,total:e.groups.reduce((n,g)=>n+g.total,0),evacuatedTotal:e.evacuatedTotal||0}}
DC.Population={ensure,sync,update,emergency,summary,shelterCapacity,hazardAt};
})(window);
