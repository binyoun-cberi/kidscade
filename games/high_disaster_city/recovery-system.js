(function(root){
'use strict';
const DC=root.DisasterCity=root.DisasterCity||{},D=DC.DATA;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function ensure(sim){const s=sim.state;if(!s.recovery)s.recovery={debris:[],recovered:0};return s.recovery}
function markFlooded(sim,slotIndex,depth){
 const slot=sim.state.slots[slotIndex];if(!slot?.building)return;
 const b=slot.building;b.condition='flooded';b.recovery=Math.min(b.recovery??1,clamp(1-depth,.08,.72));ensure(sim)
}
function markDamaged(sim,slotIndex){
 const slot=sim.state.slots[slotIndex];if(!slot?.building)return;
 const b=slot.building;if(b.condition!=='flooded'&&b.hp<b.maxHp*.72){b.condition='damaged';b.recovery=Math.min(b.recovery??1,clamp(b.hp/b.maxHp,.15,.8))}ensure(sim)
}
function markDestroyed(sim,slot,old){
 const r=ensure(sim);r.debris.push({x:slot.x,slotIndex:slot.i,kind:old.id,age:0});if(r.debris.length>18)r.debris.shift()
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
 }
 for(const d of r.debris)d.age+=dt;
}
function efficiency(building){
 if(!building)return 0;
 if(building.condition==='flooded')return .35+.35*clamp(building.recovery??0,0,1);
 if(building.condition==='damaged')return .60+.35*clamp(building.recovery??0,0,1);
 return 1
}
function repair(sim,slot){
 if(!slot?.building)return false;const b=slot.building;b.condition='normal';b.recovery=1;return true
}
function summary(sim){
 let flooded=0,damaged=0;for(const slot of sim.state.slots){if(slot.building?.condition==='flooded')flooded++;else if(slot.building?.condition==='damaged')damaged++}
 return{flooded,damaged,debris:ensure(sim).debris.length}
}
DC.Recovery={ensure,markFlooded,markDamaged,markDestroyed,update,efficiency,repair,summary};
})(window);
