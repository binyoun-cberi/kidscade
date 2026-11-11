// Renderer-independent shuttle on the town's existing public road grid.
import { trafficLightAllows, reserveBusRoad, releaseBusRoad, TRAFFIC_RULES } from './traffic.mjs';
// Never consumes the seeded puzzle RNG or changes target/foil identities.
export const SHUTTLE = Object.freeze({speed:2.35,dwell:5.5,doorSeconds:2.1,capacity:1,
  halfLength:1.25,halfWidth:.44,personRadius:.22,bodyMargin:.075});
// Signed edge-to-edge spacing from a standing/walking resident to the
// bus's oriented actual visible footprint (not center-to-center distance).
export function busBodyGap(bus,point){
  const dx=point.x-bus.position.x,dz=point.z-bus.position.z;
  const length=dx*Math.sin(bus.heading)+dz*Math.cos(bus.heading);
  const side=dx*Math.cos(bus.heading)-dz*Math.sin(bus.heading);
  return Math.hypot(Math.max(0,Math.abs(length)-SHUTTLE.halfLength),
    Math.max(0,Math.abs(side)-SHUTTLE.halfWidth))-SHUTTLE.personRadius;
}
export function walkingClearOfBus(town,p,next){
  const bus=town.transit?.bus;
  if(!bus||p.transit)return true;
  const upcoming=busBodyGap(bus,next),before=busBodyGap(bus,p.position);
  // If the vehicle is already at the crossing, wait outside its footprint.
  // If already within that footprint, walk outward to avoid imprisoning
  // people or deadlocking against a stationary door.
  return upcoming>=SHUTTLE.bodyMargin-1e-6||
    (before<SHUTTLE.bodyMargin-1e-6&&upcoming>before+1e-6);
}
export function reservedShuttleDropBay(town){
  const service=town.transit,bus=service?.bus;
  const passenger=town.people.find(p=>p.id===bus?.rider);
  if(!passenger?.transit)return null;
  const station=service.stations[passenger.transit.toIndex];
  return station.platformId;
}
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
  // Dedicated, outbound-only platforms never compete with residents' four
  // activity bays. The platform lies on the already-drawn perimeter sidewalk.
  for(const station of stations){
    const c=getBlockCenter(station.block,town.config);
    const id=station.block.id+':bus-platform',gate=station.block.id+':bus-curb',side=station.side;
    // The platform is a pocket INSIDE the parcel, 1.05 from the busy
    // outer sidewalk; departing riders merge into the existing one-way
    // pavement through a short, visible perpendicular access strip.
    town.paths.nodes.set(id,{id,x:c.x+side*1.6,z:c.z,next:[gate]});
    town.paths.nodes.set(gate,{id:gate,x:c.x+side*2.65,z:c.z,
      next:[station.block.id+(side<0?':nw':':se')]});
    station.platformId=id;
    station.gateId=gate;
  }
  const bus={position:{x:stations[0].x,z:stations[0].z},heading:0,
    phase:'stopped',stopIndex:0,targetIndex:1,dwellUntil:4.5,
    route:[],routeIndex:0,rider:null};
  return {stations,bus,pitch:blockPitch,boarded:0,alighted:0,arrivals:0,recent:[],delayedAlighting:0,maxDestinationHold:0};
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
  if(town.people.some(q=>q!==p&&q.state==='walking'&&
    distanceToApproach(q.position,p.position,bus.position)<1.55))return;
  p.transit={phase:'boarding',from:station.block.id,toIndex:bus.targetIndex,
    start:{...p.position},goal:{...bus.position},progress:0,duration:SHUTTLE.doorSeconds};
  p.state='boarding';p.pendingRoute=[];p.requestedAt=null;
  bus.rider=p.id;
  bus.dwellUntil=Math.max(bus.dwellUntil,town.time+SHUTTLE.doorSeconds+1);
}
function distanceToApproach(point,from,to){
  const dx=to.x-from.x,dz=to.z-from.z;
  const length2=dx*dx+dz*dz;
  const ratio=length2?Math.max(0,Math.min(1,((point.x-from.x)*dx+(point.z-from.z)*dz)/length2)):0;
  return Math.hypot(point.x-from.x-dx*ratio,point.z-from.z-dz*ratio);
}
// A short, temporary boarding lane yields to pedestrians already crossing
// BEFORE it opens, then blocks new walkers from entering until the door closes.
export function shuttleDoorLaneBusy(town,position){
  if(!town.transit)return false;
  return town.people.some(p=>p.transit&&
    ['boarding','alighting'].includes(p.transit.phase)&&
    distanceToApproach(position,p.transit.start,p.transit.goal)<1.14);
}
function startAlighting(town,station){
  const service=town.transit,bus=service.bus;
  const p=town.people.find(p=>p.id===bus.rider);
  if(!p||p.transit?.phase!=='riding'||p.transit.toIndex!==bus.stopIndex)return;
  const dock={id:station.platformId,index:-1};
  if(town.paths.occupied.has(dock.id)){service.delayedAlighting++;return;}
  const node=town.paths.nodes.get(dock.id);
  // Do not begin crossing the sidewalk while another walker is already
  // entering the vehicle-to-bay approach. This prevents mutual yield locks.
  const target={x:node.x,z:node.z};
  if(town.people.some(q=>q!==p&&q.state==='walking'&&
    distanceToApproach(q.position,bus.position,target)<1.55))return;
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
    // Leave the short-lived, exclusive curb platform via the real one-way sidewalk.
    person.lastNode=person.slotId;person.routineAt=person.elapsed+.35;
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
    // Do not pass a rider's destination while its designated curb bay is
    // occupied. Stay on the road until the existing walker can depart.
    if(rider?.transit?.phase==='riding'&&rider.transit.toIndex===bus.stopIndex){
      bus.dwellUntil=Math.max(bus.dwellUntil,town.time+.7);
      bus.destinationWaitSince??=town.time;
      service.maxDestinationHold=Math.max(service.maxDestinationHold,town.time-bus.destinationWaitSince);
      return;
    }
    bus.destinationWaitSince=null;
    if(!bus.rider)startBoarding(town,station);
    const doorBusy=town.people.some(p=>p.id===bus.rider&&
      ['boarding','alighting'].includes(p.transit?.phase));
    if(town.time<bus.dwellUntil||doorBusy)return;
    const route=routeOnRoads(town,station,service.stations[bus.targetIndex]);
    if(!reserveBusRoad(town,route,bus.position))return;
    bus.phase='driving';
    bus.route=route;
    bus.routeIndex=0;
  }
  if(bus.phase==='driving'){
    const point=bus.route[bus.routeIndex];
    if(!point){
      bus.phase='stopped';bus.stopIndex=bus.targetIndex;
      bus.targetIndex=(bus.stopIndex+1)%service.stations.length;
      bus.dwellUntil=town.time+SHUTTLE.dwell;service.arrivals++;
      releaseBusRoad(town);
      return;
    }
    const dx=point.x-bus.position.x,dz=point.z-bus.position.z;
    const remaining=Math.hypot(dx,dz),step=Math.min(remaining,SHUTTLE.speed*dt);
    const next=remaining?{x:bus.position.x+dx/remaining*step,
      z:bus.position.z+dz/remaining*step}:{...bus.position};
    // The visible signal applies to this actual route segment.
    const axis=Math.abs(dx)>Math.abs(dz)?'horizontal':'vertical';
    if(!trafficLightAllows(town,bus.position,next,axis))return;
    // The entire bus mesh must clear a crossing resident; a center-only
    // 1.2-unit check still clipped the bus nose into crossing characters.
    const nextBus={position:next,heading:remaining>.001?Math.atan2(dx,dz):bus.heading};
    if(town.people.some(p=>p.id!==bus.rider&&p.state==='walking'&&
      busBodyGap(nextBus,p.position)<SHUTTLE.bodyMargin))return;
    // No bus may enter an occupied car intersection.
    if(town.traffic?.cars.some(car=>
      Math.hypot(next.x-car.position.x,next.z-car.position.z)<TRAFFIC_RULES.vehicleClearance))return;
    bus.position=next;
    if(remaining>.001)bus.heading=Math.atan2(dx,dz);
    if(step>=remaining-1e-6)bus.routeIndex++;
    const passenger=town.people.find(p=>p.id===bus.rider);
    if(passenger?.transit?.phase==='riding')passenger.position={...next};
  }
}
