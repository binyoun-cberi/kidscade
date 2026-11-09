// Road traffic and signals on the SAME town geometry as the walkers and bus.
// Renderer-free, deterministic, with no random draws or change to saved puzzles.
export const TRAFFIC_RULES=Object.freeze({
  horizontalGreen:9,allRed:1,verticalGreen:9,cycle:20,
  stopLine:2.75,pedestrianClearance:1.4,vehicleClearance:1.7
});
export function trafficPhase(town){
  const time=((town.time+2)%TRAFFIC_RULES.cycle+TRAFFIC_RULES.cycle)%TRAFFIC_RULES.cycle;
  if(time<9)return 'horizontal';
  if(time<10)return 'all-red';
  if(time<19)return 'vertical';
  return 'all-red';
}
export function createTraffic(town,streetPlan,pitch){
  if(town.challenge)return null;
  const vertical=streetPlan.roads.filter(r=>r.axis==='z').map(r=>r.x);
  const horizontal=streetPlan.roads.filter(r=>r.axis==='x').map(r=>r.z);
  const junctions=horizontal.flatMap(z=>vertical.map(x=>({x,z})));
  const span=(town.config.cols*pitch)/2+2.8;
  const cars=Array.from({length:Math.min(3,Math.max(1,Math.floor(town.config.cols/2)))},(_,i)=>{
    const roadRow=i%horizontal.length,direction=i%2?-1:1;
    const zRoad=horizontal[roadRow],z=zRoad; // centerlane has .85 sidewalk clearance
    return {id:'street-car-'+i,position:{x:(direction>0?-1:1)*(span-(i%3)*.65),z},
      zRoad,roadRow,direction,speed:2.05+i*.24,wait:0,trips:0};
  });
  return {junctions,crossings:streetPlan.crossings,cars,span,
    busHoldZ:null,vehicleYields:0,pedestrianYields:0,lightStops:0,
    busRowWaits:0,completions:0};
}
export function trafficLightAllows(town,oldPosition,newPosition,axis){
  const traffic=town.traffic;if(!traffic)return true;
  if(trafficPhase(town)===axis)return true;
  const isHorizontal=axis==='horizontal',coordinate=isHorizontal?'x':'z';
  const perpendicular=isHorizontal?'z':'x';
  for(const junction of traffic.junctions){
    if(Math.abs(oldPosition[perpendicular]-junction[perpendicular])>.75)continue;
    const oldGap=Math.abs(oldPosition[coordinate]-junction[coordinate]);
    const nextGap=Math.abs(newPosition[coordinate]-junction[coordinate]);
    // Never freeze an already-entered vehicle in the middle of a junction.
    if(oldGap>=TRAFFIC_RULES.stopLine-1e-6&&nextGap<TRAFFIC_RULES.stopLine)return false;
  }
  return true;
}
export function reserveBusRoad(town,route,origin){
  const traffic=town.traffic;if(!traffic)return true;
  let from=origin,roadZ=null;
  for(const to of route){
    if(Math.abs(to.x-from.x)>.01&&Math.abs(to.z-from.z)<.01){roadZ=to.z;break;}
    from=to;
  }
  if(roadZ===null){traffic.busHoldZ=null;return true;}
  traffic.busHoldZ=roadZ;
  // Cars already inside the shared road must leave before a bus turns onto it.
  const threshold=town.config.cols*7/2+1.0;
  const occupied=traffic.cars.some(car=>Math.abs(car.zRoad-roadZ)<.001&&
    Math.abs(car.position.x)<threshold);
  if(occupied){traffic.busRowWaits++;return false;}
  return true;
}
export function releaseBusRoad(town){
  if(town.traffic)town.traffic.busHoldZ=null;
}
// Only pedestrians on a REAL zebra crossing are traffic participants.
// Sidewalk walkers parallel to the road must not freeze cars indefinitely.
function zebraNear(town,car,x){
  return town.traffic.crossings.filter(c=>c.axis==='z'&&
    Math.abs(c.z-car.zRoad)<1&&Math.abs(c.x-x)<2.2);
}
function pedestrianInCarPath(town,car,next){
  // TWO zebras border each road: checking only the first one lets the
  // vehicle drive into a pedestrian using the other zebra.
  const crossings=zebraNear(town,car,next.x);
  return crossings.some(crossing=>{
    const carCommitted=Math.abs(car.position.x-crossing.x)<1.25;
    return town.people.some(p=>{
      if(p.state!=='walking'||Math.abs(p.position.x-crossing.x)>.22)return false;
      const to=town.paths.nodes.get(p.route[0]);
      if(!to||Math.abs(to.x-p.position.x)>.22)return false;
      const fromRoad=Math.abs(p.position.z-car.zRoad);
      return fromRoad<.72||(!carCommitted&&fromRoad<1.8);
    });
  });
}
export function pedestrianTrafficGuard(town,person,next){
  const traffic=town.traffic;
  if(!traffic||person.state!=='walking')return false;
  const to=town.paths.nodes.get(person.route[0]);
  if(!to||Math.abs(to.x-person.position.x)>.2||
    Math.abs(next.x-person.position.x)>.2)return false;
  for(const car of traffic.cars){
    const before=Math.abs(person.position.z-car.zRoad);
    const after=Math.abs(next.z-car.zRoad);
    if(before<.72||after>=before)continue;
    const crossing=zebraNear(town,car,car.position.x).find(c=>
      Math.abs(c.x-person.position.x)<.18&&
      Math.abs(car.position.x-c.x)<1.25);
    if(!crossing)continue;
    traffic.pedestrianYields++;
    return true;
  }
  return false;
}

export function stepTraffic(town,dt){
  const traffic=town.traffic;if(!traffic||!dt)return;
  for(const car of traffic.cars){
    if(traffic.busHoldZ!==null&&Math.abs(traffic.busHoldZ-car.zRoad)<.001&&
       Math.abs(car.position.x)>town.config.cols*7/2+1){
      car.wait+=dt;continue;
    }
    const x=car.position.x+car.direction*car.speed*dt;
    const next={x,z:car.position.z};
    if(!trafficLightAllows(town,car.position,next,'horizontal')){
      traffic.lightStops++;car.wait+=dt;continue;
    }
    if(pedestrianInCarPath(town,car,next)){
      traffic.vehicleYields++;car.wait+=dt;continue;
    }
    // At bus/road crossings the all-red phase separates axes. On the same
    // horizontal route, the bus holds this row until every car has cleared.
    const bus=town.transit?.bus;
    if(bus&&Math.abs(bus.position.z-next.z)<1.25&&
      Math.abs(bus.position.x-next.x)<TRAFFIC_RULES.vehicleClearance){
      // Do not stop a car that is already ahead and exiting a junction:
      // the bus's advance check waits for the car to clear.
      const before=Math.hypot(bus.position.x-car.position.x,bus.position.z-car.position.z);
      const after=Math.hypot(bus.position.x-next.x,bus.position.z-next.z);
      if(after<before-.001){traffic.vehicleYields++;car.wait+=dt;continue;}
    }
    car.wait=0;car.position=next;
    if(Math.abs(car.position.x)>traffic.span){
      const hold=traffic.busHoldZ!==null&&Math.abs(traffic.busHoldZ-car.zRoad)<.001;
      if(!hold){car.position.x=-car.direction*traffic.span;car.trips++;traffic.completions++;}
    }
  }
}
