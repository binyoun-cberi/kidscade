// Renderer-independent shuttle on the town's existing public road grid.
// Never consumes the seeded puzzle RNG or changes target/foil identities.
export const SHUTTLE = Object.freeze({speed:2.35,dwell:5.5,doorSeconds:2.1,capacity:1});
export function createTransit(town,getBlockCenter,blockPitch){
  if(town.challenge)return null;
  const hubs=town.blocks.filter(b=>b.kind==='stop'||b.kind==='school');
  const stride=Math.max(1,Math.ceil(hubs.length/4));
  const stations=hubs.filter((_,i)=>i%stride===0).slice(0,4).map(block=>{
    const center=getBlockCenter(block,town.config),side=block.col>0?-1:1;
    return {block,dock:side<0?0:3,side,
      x:center.x+side*blockPitch/2,z:center.z};
  });
  if(stations.length<2)return null;
  const bus={position:{x:stations[0].x,z:stations[0].z},heading:0,
    phase:'stopped',stopIndex:0,targetIndex:1,dwellUntil:4.5,
    route:[],routeIndex:0,rider:null};
  return {stations,bus,pitch:blockPitch,boarded:0,alighted:0,arrivals:0,recent:[]};
}
function routeOnRoads(town,from,to){
  const {rows}=town.config;
  const blockPitch=town.transit.pitch;
  const roadRow=Math.max(0,Math.min(rows-2,Math.min(from.block.row,to.block.row)));
  const zRoad=(roadRow+.5-(rows-1)/2)*blockPitch;
  const raw=from.x===to.x?[{x:to.x,z:to.z}]:
    [{x:from.x,z:zRoad},{x:to.x,z:zRoad},{x:to.x,z:to.z}];
  const output=[],start={x:from.x,z:from.z};
  for(const point of raw){
    const prev=output[output.length-1]||start;
    if(Math.hypot(prev.x-point.x,prev.z-point.z)>1e-6)output.push(point);
  }
  return output;
}
function nearPeople(town,self,position,clearance){
  return town.people.some(p=>p!==self&&p.state!=='riding'&&
    Math.hypot(p.position.x-position.x,p.position.z-position.z)<clearance-1e-6);
}
function startBoarding(town,station){
  const service=town.transit,bus=service.bus;
  if(bus.rider)return;
  const dock=town.paths.slots.find(s=>s.block.id===station.block.id&&s.index===station.dock);
  if(!dock)return;
  const p=town.people.find(p=>p.state==='acting'&&p.slotId===dock.id&&
    !p.reserved&&!p.found&&!p.errand&&!p.socialWith&&!p.transit&&
    town.time>=(p.nextBusAt||0));
  if(!p)return;
  p.transit={phase:'boarding',from:station.block.id,toIndex:bus.targetIndex,
    start:{...p.position},goal:{...bus.position},progress:0,duration:SHUTTLE.doorSeconds};
  p.state='boarding';p.pendingRoute=[];p.requestedAt=null;
  bus.rider=p.id;
  bus.dwellUntil=Math.max(bus.dwellUntil,town.time+SHUTTLE.doorSeconds+1);
}
function startAlighting(town,station){
  const service=town.transit,bus=service.bus;
  const p=town.people.find(p=>p.id===bus.rider);
  if(!p||p.transit?.phase!=='riding'||p.transit.toIndex!==bus.stopIndex)return;
  const dock=town.paths.slots.find(s=>s.block.id===station.block.id&&s.index===station.dock);
  if(!dock||town.paths.occupied.has(dock.id))return;
  const node=town.paths.nodes.get(dock.id);
  const duration=Math.max(1.6,Math.hypot(node.x-bus.position.x,node.z-bus.position.z)/1.5);
  p.transit={...p.transit,phase:'alighting',start:{...bus.position},
    goal:{x:node.x,z:node.z},duration,progress:0};
  town.paths.occupied.set(dock.id,p.id);
  p.slotId=dock.id;p.slot=dock.index;p.block=station.block;p.state='alighting';
  bus.dwellUntil=Math.max(bus.dwellUntil,town.time+duration+.8);
}
function moveDoorPassenger(town,person,dt,clearance,uniqueActivity){
  const service=town.transit,bus=service.bus,trip=person.transit;
  if(!trip||!['boarding','alighting'].includes(trip.phase))return;
  const progress=Math.min(1,trip.progress+dt/trip.duration);
  const next={x:trip.start.x+(trip.goal.x-trip.start.x)*progress,
    z:trip.start.z+(trip.goal.z-trip.start.z)*progress};
  // A short approach between the assigned curb and the real bus door.
  if(nearPeople(town,person,next,clearance))return;
  person.position=next;trip.progress=progress;
  person.facing=Math.atan2(trip.goal.x-trip.start.x,trip.goal.z-trip.start.z);
  if(progress<1)return;
  if(trip.phase==='boarding'){
    town.paths.occupied.delete(person.slotId);
    person.state='riding';trip.phase='riding';service.boarded++;
  }else{
    person.transit=null;person.state='acting';person.trips++;
    person.lastNode=person.slotId;person.routineAt=person.elapsed+10;
    person.nextBusAt=town.time+42;
    const nextActivity=person.block.kind==='school'?'read':'map';
    if(uniqueActivity(town,person,nextActivity))person.activity=nextActivity;
    person.action=person.activity;
    service.alighted++;
    service.recent.push({person:person.id,from:trip.from,to:person.block.id,time:town.time});
    if(service.recent.length>8)service.recent.shift();
    bus.rider=null;
  }
}
export function stepTransit(town,dt,clearance,uniqueActivity){
  const service=town.transit;if(!service||!dt)return;
  const bus=service.bus;
  const current=town.people.find(p=>p.id===bus.rider);
  if(current&&['boarding','alighting'].includes(current.transit?.phase)){
    moveDoorPassenger(town,current,dt,clearance,uniqueActivity);
    bus.dwellUntil=Math.max(bus.dwellUntil,town.time+.5);
  }
  if(bus.phase==='stopped'){
    const station=service.stations[bus.stopIndex];
    const rider=town.people.find(p=>p.id===bus.rider);
    if(rider?.transit?.phase==='riding')startAlighting(town,station);
    if(!bus.rider)startBoarding(town,station);
    const doorBusy=town.people.some(p=>p.id===bus.rider&&
      ['boarding','alighting'].includes(p.transit?.phase));
    if(town.time<bus.dwellUntil||doorBusy)return;
    bus.phase='driving';
    bus.route=routeOnRoads(town,station,service.stations[bus.targetIndex]);
    bus.routeIndex=0;
  }
  if(bus.phase==='driving'){
    const point=bus.route[bus.routeIndex];
    if(!point){
      bus.phase='stopped';bus.stopIndex=bus.targetIndex;
      bus.targetIndex=(bus.stopIndex+1)%service.stations.length;
      bus.dwellUntil=town.time+SHUTTLE.dwell;service.arrivals++;
      return;
    }
    const dx=point.x-bus.position.x,dz=point.z-bus.position.z;
    const remaining=Math.hypot(dx,dz),step=Math.min(remaining,SHUTTLE.speed*dt);
    const next=remaining?{x:bus.position.x+dx/remaining*step,
      z:bus.position.z+dz/remaining*step}:{...bus.position};
    // Give pedestrians the right of way at shared zebra crossings.
    if(town.people.some(p=>p.id!==bus.rider&&p.state==='walking'&&
      Math.hypot(next.x-p.position.x,next.z-p.position.z)<1.2))return;
    bus.position=next;
    if(remaining>.001)bus.heading=Math.atan2(dx,dz);
    if(step>=remaining-1e-6)bus.routeIndex++;
    const passenger=town.people.find(p=>p.id===bus.rider);
    if(passenger?.transit?.phase==='riding')passenger.position={...next};
  }
}
