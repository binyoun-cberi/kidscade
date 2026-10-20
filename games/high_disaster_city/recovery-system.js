(function(root){
'use strict';
const DC=root.DisasterCity=root.DisasterCity||{},D=DC.DATA;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function ensure(sim){const s=sim.state;if(!s.recovery)s.recovery={debris:[],recovered:0};return s.recovery}
function markFlooded(sim,slotIndex,depth){
 const slot=sim.state.slots[slotIndex];if(!slot?.building)return;
 const b=slot.building;b.condition='flooded';b.recovery=Math.min(b.recovery??1,clamp(1-depth,.08,.72));
 const strength=clamp(depth*.92,.24,.96);b.visualDamage={kind:'flood',strength:Math.max(strength,b.visualDamage?.kind==='flood'?b.visualDamage.strength:0)};ensure(sim)
}
function markDamaged(sim,slotIndex,cause){
 const slot=sim.state.slots[slotIndex];if(!slot?.building)return;
 const b=slot.building,loss=clamp(1-b.hp/b.maxHp,0,1);
 if(b.condition!=='flooded'&&b.hp<b.maxHp*.72){b.condition='damaged';b.recovery=Math.min(b.recovery??1,clamp(b.hp/b.maxHp,.15,.8))}
 if(loss>.075&&b.condition!=='flooded'){
  const kind=cause==='wildfire'?'fire':cause==='flood'?'flood':cause==='earthquake'?'quake':'storm';
  b.visualDamage={kind,strength:Math.max(clamp(loss*1.45,.17,.95),b.visualDamage?.kind===kind?b.visualDamage.strength:0)};
 }
 ensure(sim)
}
function nearbyCells(sim,slot){
 const field=sim.state.field;
 return field?.cells?.length&&DC.Field?DC.Field.cellsInRadius(field,DC.Field.slotCol(slot),DC.Field.slotRow(),1):[]
}
function markDestroyed(sim,slot,old,cause){
 const r=ensure(sim);r.debris=r.debris.filter(d=>d.slotIndex!==slot.i);
 r.debris.push({x:slot.x,slotIndex:slot.i,kind:old.id,cause:cause||'collapse',age:0});if(r.debris.length>18)r.debris.shift();
 for(const c of nearbyCells(sim,slot))c.debris=clamp((c.debris||0)+.32,0,1)
}
function clearSite(sim,slot){
 const r=ensure(sim);r.debris=r.debris.filter(d=>d.slotIndex!==slot.i);
 for(const c of nearbyCells(sim,slot))c.debris=Math.max(0,(c.debris||0)-.26)
}
function fieldWaterAt(sim,slot){
 const f=sim.state.field;if(!f?.cells?.length||!DC.Field)return 0;
 const c=DC.Field.slotCol(slot),r=DC.Field.slotRow();return Math.max(...DC.Field.cellsInRadius(f,c,r,1).map(x=>x.water||0))
}
function update(sim,dt){
 const r=ensure(sim),activeFlood=sim.state.disasters.some(d=>d.type==='flood'&&d.phase!=='recovery');
 for(const slot of sim.state.slots){
  const b=slot.building;if(!b)continue;
  if(!b.condition)b.condition='normal';if(!Number.isFinite(b.recovery))b.recovery=1;
  if(b.condition==='flooded'){
   const water=fieldWaterAt(sim,slot);if(!activeFlood&&water<.10)b.recovery=clamp(b.recovery+dt*.055,0,1);
   if(b.recovery>=.999){b.condition='normal';b.recovery=1;r.recovered++;sim.emit('recover',D.BUILDINGS[b.id].name+' 침수 복구 완료',{x:slot.x})}
  }else if(b.condition==='damaged'){
   b.recovery=clamp(b.recovery+dt*.006,0,1);
   if(b.recovery>=.999||b.hp>=b.maxHp*.96){b.condition='normal';b.recovery=1;r.recovered++}
  }
  if(b.condition==='normal'&&b.visualDamage){b.visualDamage.strength=Math.max(0,b.visualDamage.strength-dt*.003);if(b.visualDamage.strength<.035)delete b.visualDamage}
 }
 for(const d of r.debris)d.age+=dt;
 r.debris=r.debris.filter(d=>d.age<95&&sim.state.slots[d.slotIndex]&&!sim.state.slots[d.slotIndex].building);
}
function efficiency(building){
 if(!building)return 0;
 if(building.condition==='flooded')return .35+.35*clamp(building.recovery??0,0,1);
 if(building.condition==='damaged')return .60+.35*clamp(building.recovery??0,0,1);
 return 1
}
function repair(sim,slot){
 if(!slot?.building)return false;const b=slot.building;b.condition='normal';b.recovery=1;delete b.visualDamage;
 for(const c of nearbyCells(sim,slot)){c.debris=Math.max(0,(c.debris||0)-.42);c.silt=Math.max(0,(c.silt||0)-.48)}return true
}
function summary(sim){
 let flooded=0,damaged=0;for(const slot of sim.state.slots){if(slot.building?.condition==='flooded')flooded++;else if(slot.building?.condition==='damaged')damaged++}
 return{flooded,damaged,debris:ensure(sim).debris.length}
}
DC.Recovery={ensure,markFlooded,markDamaged,markDestroyed,clearSite,update,efficiency,repair,summary};
})(window);
