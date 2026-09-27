(function(root){
'use strict';
const DC=root.DisasterCity=root.DisasterCity||{},D=DC.DATA;
const C=D.FIELD||{cols:24,rows:5,flowRate:.48,ambientDrain:.006,recedingDrain:.026,fireSpread:.20,fireDecay:.08};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const idx=(c,r)=>r*C.cols+c;
function elevation(c,r){
 const mid=(C.rows-1)/2,center=(C.cols-1)/2;
 return .12+Math.abs(r-mid)*.035+Math.abs(c-center)*.0015;
}
function makeCell(c,r){
 return{c,r,elevation:elevation(c,r),water:0,moisture:.22,fire:0,heat:0,fuel:.72,burned:0,snow:0,debris:0};
}
function createState(){
 const cells=[];for(let r=0;r<C.rows;r++)for(let c=0;c<C.cols;c++)cells.push(makeCell(c,r));
 return{cols:C.cols,rows:C.rows,cells,tempBarriers:[],firebreaks:[]};
}
function ensure(sim){if(!sim.state.field||!Array.isArray(sim.state.field.cells))sim.state.field=createState();return sim.state.field}
function cell(field,c,r){return c<0||r<0||c>=C.cols||r>=C.rows?null:field.cells[idx(c,r)]}
function slotCol(slot){return clamp(Math.floor((slot.x/D.W)*C.cols),0,C.cols-1)}
function slotRow(){return Math.floor(C.rows/2)}
function cellsInRadius(field,c,r,radius){
 const out=[];for(let y=Math.max(0,r-radius);y<=Math.min(C.rows-1,r+radius);y++)for(let x=Math.max(0,c-radius);x<=Math.min(C.cols-1,c+radius);x++){
  if(Math.abs(x-c)+Math.abs(y-r)<=radius+1)out.push(cell(field,x,y));
 }return out
}
function sideRange(side){const half=Math.floor(C.cols/2);return side==='left'?[0,half]:[half,C.cols-1]}
function sideCells(field,side){const [a,b]=sideRange(side);return field.cells.filter(x=>x.c>=a&&x.c<=b)}
function inwardDir(side){return side==='left'?1:-1}
function fieldProgress(field,side,key,threshold){
 const active=field.cells.filter(x=>(x[key]||0)>threshold);if(!active.length)return 0;
 const half=C.cols/2;
 if(side==='left'){const far=Math.max(...active.map(x=>x.c));return clamp((far+1)/half,0,1)}
 const near=Math.min(...active.map(x=>x.c));return clamp((C.cols-near)/half,0,1)
}
function total(field,key,side){
 const list=side?sideCells(field,side):field.cells;return list.reduce((n,x)=>n+(x[key]||0),0)
}
function activeLeveeAt(sim,col,side){
 let best=null;
 for(const slot of sim.state.slots){
  const b=slot.building;if(!b||b.id!=='levee')continue;
  const sc=slotCol(slot),slotSide=slot.x<D.TOWN_X?'left':'right';
  if(sc===col&&slotSide===side){best=slot;break}
 }
 return best
}
function tempBarrierAt(field,col,side){
 return field.tempBarriers.find(x=>x.col===col&&x.side===side&&x.hp>0&&x.life>0)||null
}
function barrierFor(sim,field,from,to,d,potential,dt){
 if(!d||d.type!=='flood')return 1;
 const dir=inwardDir(d.side),crossing=to.c-from.c===dir;
 if(!crossing)return 1;
 let factor=1;
 const levee=activeLeveeAt(sim,to.c,d.side)||activeLeveeAt(sim,from.c,d.side);
 if(levee){
  const level=levee.building.level||1,resistance=clamp(.86+.035*(level-1),0,.94);
  factor*=1-resistance;d.blockedSlot=levee.i;
  const pressure=Math.max(0,potential)*(.72+.30*(d.strength||1));
  if(pressure>.02)sim.damageBuilding(levee.i,pressure*dt*4.2,'flood');
 }
 const temp=tempBarrierAt(field,to.c,d.side)||tempBarrierAt(field,from.c,d.side);
 if(temp){
  factor*=.16;temp.hp-=Math.max(0,potential)*dt*8.5;
 }
 return factor
}
function stepWater(sim,d,dt){
 const f=ensure(sim),delta=new Float64Array(f.cells.length),outgoing=new Float64Array(f.cells.length),rate=C.flowRate||.48;
 d.blockedSlot=-1;
 for(let r=0;r<C.rows;r++)for(let c=0;c<C.cols;c++){
  const a=cell(f,c,r);
  for(const [dc,dr] of [[1,0],[0,1]]){
   const b=cell(f,c+dc,r+dr);if(!b)continue;
   const sa=a.elevation+a.water,sb=b.elevation+b.water,diff=sa-sb;
   if(Math.abs(diff)<.002)continue;
   const src=diff>0?a:b,dst=diff>0?b:a,si=idx(src.c,src.r),di=idx(dst.c,dst.r);
   const available=Math.max(0,src.water-outgoing[si]),potential=Math.min(available,Math.abs(diff)*rate*dt);
   if(potential<=0)continue;
   const factor=barrierFor(sim,f,src,dst,d,potential,dt),flow=potential*factor;
   outgoing[si]+=flow;delta[si]-=flow;delta[di]+=flow;
  }
 }
 for(let i=0;i<f.cells.length;i++)f.cells[i].water=clamp(f.cells[i].water+delta[i],0,1.5);
}
function injectFlood(sim,d,dt){
 const f=ensure(sim),edge=d.side==='left'?0:C.cols-1;
 let rate=0;if(d.phase==='approach')rate=.20;else if(d.phase==='impact')rate=.58;else if(d.phase==='receding')rate=.05;
 rate*=.72+.34*(d.strength||1);
 if(rate<=0)return;
 for(let r=0;r<C.rows;r++){const x=cell(f,edge,r);x.water=clamp(x.water+rate*dt*(r===slotRow()?1.12:.92),0,1.5)}
}
function pumpDrain(sim,dt){
 const f=ensure(sim);
 for(const slot of sim.state.slots){
  const b=slot.building;if(!b||b.id!=='pump')continue;
  const def=D.BUILDINGS.pump||{},lvl=b.level||1,range=(def.range||2)+(lvl>=3?1:0),power=(def.drainPower||.08)*(1+.48*(lvl-1));
  const list=cellsInRadius(f,slotCol(slot),slotRow(),range),share=power*dt/Math.max(1,list.length*.42);
  for(const x of list)x.water=Math.max(0,x.water-share);
 }
}
function floodDamage(sim,d,dt){
 const f=ensure(sim),p=d.strength||1;
 for(const slot of sim.state.slots){
  const b=slot.building;if(!b||b.id==='levee')continue;
  const c=slotCol(slot),r=slotRow(),depth=Math.max(...cellsInRadius(f,c,r,1).map(x=>x.water));
  if(depth<.16)continue;
  const def=D.BUILDINGS[b.id]||{},res=def.floodResistance||.68;
  if(depth>.28)DC.Recovery?.markFlooded?.(sim,slot.i,depth);
  const excess=Math.max(0,depth-res*.32),vuln=b.id==='farm'?1.28:b.id==='pump'?.72:1;
  if(excess>0)sim.damageBuilding(slot.i,excess*(3.8*p*vuln)*dt,'flood');
 }
}
function updateFlood(sim,d,dt){
 const f=ensure(sim);injectFlood(sim,d,dt);stepWater(sim,d,dt);pumpDrain(sim,dt);
 const drain=(C.ambientDrain||.006)+(d.phase==='receding'?(C.recedingDrain||.026):0)+(d.phase==='recovery'?.045:0);
 for(const x of f.cells)x.water=Math.max(0,x.water-drain*dt);
 if(d.phase!=='recovery')floodDamage(sim,d,dt);
 d.progress=fieldProgress(f,d.side,'water',.055);
 const wet=sideCells(f,d.side),sum=wet.reduce((n,x)=>n+x.water,0),peak=wet.reduce((m,x)=>Math.max(m,x.water),0);
 d.fieldAmount=sum;d.fieldPeak=peak;d.energy=clamp(sum*11+peak*18,0,d.maxEnergy);
 if(d.progress>.94&&peak>.35)sim.state.stability=Math.max(0,sim.state.stability-dt*(1.7*(d.strength||1)));
}
function reservoirBonus(sim,slot){
 const f=ensure(sim),c=slotCol(slot),r=slotRow();let n=0;
 for(const other of sim.state.slots){if(other.building?.id!=='reservoir')continue;const oc=slotCol(other);if(Math.abs(oc-c)<=4)n+=other.building.level||1}
 return 1+Math.min(.6,n*.18);
}
function suppressByStations(sim,dt){
 const f=ensure(sim);
 for(const slot of sim.state.slots){
  const b=slot.building;if(!b||b.id!=='fireStation')continue;
  const def=D.BUILDINGS.fireStation||{},lvl=b.level||1,range=(def.range||3)+(lvl>=2?1:0)+(lvl>=3?1:0),power=(def.firePower||.20)*(1+.38*(lvl-1))*reservoirBonus(sim,slot);
  for(const x of cellsInRadius(f,slotCol(slot),slotRow(),range)){x.fire=Math.max(0,x.fire-power*dt);x.heat=Math.max(0,x.heat-power*.6*dt);x.moisture=clamp(x.moisture+.012*dt,0,1)}
 }
}
function igniteEdge(sim,d){
 const f=ensure(sim),edge=d.side==='left'?0:C.cols-1;
 for(let r=0;r<C.rows;r++){const x=cell(f,edge,r);x.fire=Math.max(x.fire,.48+(r===slotRow()?.22:.08));x.heat=Math.max(x.heat,.7)}
}
function localFuel(sim,x){
 let mult=1;
 if(x.r===slotRow()){
  for(const slot of sim.state.slots){if(slotCol(slot)!==x.c||!slot.building)continue;mult+=D.BUILDINGS[slot.building.id]?.fuelBonus||0}
 }
 return clamp(x.fuel*mult,0,1.35)
}
function stepFire(sim,d,dt){
 const f=ensure(sim),deltaFire=new Float64Array(f.cells.length),deltaHeat=new Float64Array(f.cells.length),dir=inwardDir(d.side),spreadBase=C.fireSpread||.20;
 for(const x of f.cells){
  const i=idx(x.c,x.r);if(x.fire>.01&&x.fuel>.005){
   const burn=Math.min(x.fuel,x.fire*(.045+.025*(d.strength||1))*dt);x.fuel=Math.max(0,x.fuel-burn);x.burned=clamp(x.burned+burn*.85,0,1);x.heat=clamp(x.heat+x.fire*.08*dt,0,1.5);
   for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const n=cell(f,x.c+dc,x.r+dr);if(!n||n.fuel<=.01)continue;
    let wind=1;if(dc===dir)wind=1.55;else if(dc===-dir)wind=.65;
    const add=x.fire*localFuel(sim,n)*(1-n.moisture)*spreadBase*wind*dt;
    deltaFire[idx(n.c,n.r)]+=add;deltaHeat[idx(n.c,n.r)]+=add*.8;
   }
  }
  const decay=(C.fireDecay||.08)+(1-x.fuel)*.18+(d.phase==='receding'?.10:d.phase==='recovery'?.22:0);
  deltaFire[i]-=decay*dt;deltaHeat[i]-=.10*dt;
 }
 for(let i=0;i<f.cells.length;i++){const x=f.cells[i];x.fire=clamp(x.fire+deltaFire[i],0,1.35);x.heat=clamp(x.heat+deltaHeat[i],0,1.5)}
 suppressByStations(sim,dt);
}
function fireDamage(sim,d,dt){
 const f=ensure(sim),p=d.strength||1;
 for(const slot of sim.state.slots){
  const b=slot.building;if(!b)continue;const list=cellsInRadius(f,slotCol(slot),slotRow(),1),flame=Math.max(...list.map(x=>x.fire));
  if(flame<.12)continue;const vuln=b.id==='farm'?1.38:b.id==='reservoir'?.78:b.id==='fireStation'?.82:1;
  sim.damageBuilding(slot.i,flame*4.4*p*vuln*dt,'wildfire');
 }
}
function updateWildfire(sim,d,dt){
 const f=ensure(sim);if(d.phase==='approach'&&d.age<.2)igniteEdge(sim,d);stepFire(sim,d,dt);if(d.phase!=='recovery')fireDamage(sim,d,dt);
 d.progress=fieldProgress(f,d.side,'fire',.035);
 const burning=sideCells(f,d.side),sum=burning.reduce((n,x)=>n+x.fire,0),peak=burning.reduce((m,x)=>Math.max(m,x.fire),0);
 d.fieldAmount=sum;d.fieldPeak=peak;d.energy=clamp(sum*9+peak*14,0,d.maxEnergy);
 if(d.progress>.94&&peak>.3)sim.state.stability=Math.max(0,sim.state.stability-dt*(2.0*(d.strength||1)));
}
function ambient(sim,dt){
 const f=ensure(sim);
 for(const x of f.cells){
  x.water=Math.max(0,x.water-(C.ambientDrain||.006)*dt);
  if(!sim.state.disasters.some(d=>d.type==='wildfire')){x.fire=Math.max(0,x.fire-.16*dt);x.heat=Math.max(0,x.heat-.12*dt)}
  x.moisture=clamp(x.moisture+(x.water>.05?.02:.002)*dt,0,1);
 }
 for(const b of f.tempBarriers)b.life-=dt;
 f.tempBarriers=f.tempBarriers.filter(x=>x.hp>0&&x.life>0);
}
function sandbags(sim,d){
 const f=ensure(sim),wet=sideCells(f,d.side).filter(x=>x.water>.04),dir=inwardDir(d.side);
 let front=d.side==='left'?0:C.cols-1;
 if(wet.length)front=d.side==='left'?Math.max(...wet.map(x=>x.c)):Math.min(...wet.map(x=>x.c));
 const col=clamp(front+dir,1,C.cols-2);
 const old=tempBarrierAt(f,col,d.side);if(old){old.hp=Math.min(60,old.hp+26);old.life=Math.max(old.life,18)}else f.tempBarriers.push({side:d.side,col,hp:42,life:18});
 d.blockPause=Math.max(d.blockPause||0,1.2);return col
}
function emergencyDrain(sim,d){
 const f=ensure(sim),list=sideCells(f,d.side).sort((a,b)=>b.water-a.water).slice(0,Math.ceil(C.rows*4));
 for(const x of list)x.water*=.42;
 d.energy=Math.max(0,d.energy-12);return list.length
}
function firebreak(sim,d){
 const f=ensure(sim),active=sideCells(f,d.side).filter(x=>x.fire>.025),dir=inwardDir(d.side);
 let front=d.side==='left'?0:C.cols-1;
 if(active.length)front=d.side==='left'?Math.max(...active.map(x=>x.c)):Math.min(...active.map(x=>x.c));
 const col=clamp(front+dir,1,C.cols-2);
 for(let r=0;r<C.rows;r++){const x=cell(f,col,r);x.fuel=0;x.fire=0;x.heat*=.15}
 if(!f.firebreaks.includes(col))f.firebreaks.push(col);d.blockPause=Math.max(d.blockPause||0,1.5);return col
}
function fireBrigade(sim,d){
 const f=ensure(sim),list=sideCells(f,d.side).sort((a,b)=>b.fire-a.fire).slice(0,Math.ceil(C.rows*5));
 for(const x of list){x.fire*=.38;x.heat*=.52;x.moisture=clamp(x.moisture+.18,0,1)}
 d.energy=Math.max(0,d.energy-20);return list.length
}
function startDisaster(sim,d){
 ensure(sim);if(d.type==='flood'){const f=sim.state.field,edge=d.side==='left'?0:C.cols-1;for(let r=0;r<C.rows;r++)cell(f,edge,r).water=Math.max(cell(f,edge,r).water,.14)}
 else if(d.type==='wildfire')igniteEdge(sim,d)
}
DC.Field={createState,ensure,cell,slotCol,slotRow,cellsInRadius,sideCells,total,fieldProgress,startDisaster,updateFlood,updateWildfire,ambient,sandbags,emergencyDrain,firebreak,fireBrigade};
})(window);
