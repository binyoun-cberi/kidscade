// A small, explicit bakery → park → home route. No rendering or timers outside simulation time.
const BREAD_ACTIVITIES=['browse','deliver','eat'];
const point=(x,z)=>({x,z});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const WALK_RADIUS=.28;

export function setupBakeryTrips(town,centerOf,models=Array.from({length:12},(_,i)=>i),props=[0,1,2]){
  if(town.stageName!=='small')return null;
  const bakery=town.blocks.find(b=>b.kind==='bakery');
  const park=town.blocks.find(b=>b.kind==='park'&&b.row===bakery?.row&&b.col===bakery.col+1);
  if(!bakery||!park)return null;
  const b=centerOf(bakery),p=centerOf(park);
  const state={bakery,park,bakeryCenter:b,parkCenter:p,people:[],movementOwner:null,counterOwner:null,
    seats:[{id:'west',x:p.x-1.7,z:p.z+.8,owner:null},{id:'east',x:p.x+1.7,z:p.z+.8,owner:null}],
    bought:0,eaten:0,returned:0,active:true};
  for(const person of town.people.filter(q=>q.block.id===bakery.id&&!q.reserved&&!q.found).slice(0,2)){
    let look=null;
    for(const propVariant of props){
      for(const modelVariant of models){
        // Reserve all three future appearances, not just the appearance visible right now.
        if(!town.people.some(q=>q.id!==person.id&&q.modelVariant===modelVariant&&q.propVariant===propVariant&&
          (BREAD_ACTIVITIES.includes(q.activity)||q.block.activities.some(a=>BREAD_ACTIVITIES.includes(a))))){look={modelVariant,propVariant};break;}
      }
      if(look)break;
    }
    if(!look)continue;
    Object.assign(person,look);
    const home=point(b.x+(person.slot-1)*1.55,b.z+2.15);
    person.trip={stage:'queue',...home,home,yaw:0,carrying:false,moving:false,route:[],cursor:0,timer:state.people.length*2,seat:null,cycles:0,phaseElapsed:0};
    person.activity='browse';person.action='browse';state.people.push(person.id);
  }
  town.trips=state;return state;
}

function setStage(person,stage,timer=0){
  const t=person.trip;t.stage=stage;t.timer=timer;t.phaseElapsed=0;
  person.activity=stage==='eat'?'eat':t.carrying?'deliver':'browse';person.action=person.activity;
}
function takeMovement(state,person,stage,route){
  if(state.movementOwner&&state.movementOwner!==person.id)return false;
  state.movementOwner=person.id;
  Object.assign(person.trip,{route:route.map(p=>({...p})),cursor:0,moving:true});setStage(person,stage);return true;
}
function leaveMovement(state,person){if(state.movementOwner===person.id)state.movementOwner=null;person.trip.moving=false;}
function serviceRoute(state,person){
  const b=state.bakeryCenter,t=person.trip;
  return [point(t.home.x,b.z+2.75),point(b.x+2.55,b.z+2.75),point(b.x+2.55,b.z+1.45),point(b.x+2.2,b.z+1.45)];
}
function parkRoute(state,seat){
  const b=state.bakeryCenter,p=state.parkCenter,side=seat.id==='west'?-2.55:2.55;
  return [point(b.x+2.55,b.z+1.45),point(b.x+2.55,b.z+2.75),point(p.x-2.55,p.z+2.75),
    point(p.x+side,p.z+2.75),point(p.x+side,seat.z),point(seat.x,seat.z)];
}
function returnRoute(state,person){
  const b=state.bakeryCenter,p=state.parkCenter,t=person.trip,seat=state.seats.find(s=>s.id===t.seat),side=seat.id==='west'?-2.55:2.55;
  return [point(p.x+side,seat.z),point(p.x+side,p.z+2.75),point(p.x-2.55,p.z+2.75),
    point(b.x+2.55,b.z+2.75),point(t.home.x,b.z+2.75),point(t.home.x,t.home.z)];
}
function advanceRoute(state,person,dt){
  const t=person.trip;
  let budget=.72*dt;
  while(budget>0&&t.cursor<t.route.length){
    const goal=t.route[t.cursor],gap=distance(t,goal);
    if(gap<.00001){t.cursor++;continue;}
    const step=Math.min(gap,budget);
    const next=point(t.x+(goal.x-t.x)*step/gap,t.z+(goal.z-t.z)*step/gap);
    // A second guard covers stationary visitors and any future added route branches.
    if(state.people.some(id=>id!==person.id&&distance(next,state.personById.get(id).trip)<WALK_RADIUS*2))return false;
    t.yaw=Math.atan2(goal.x-t.x,goal.z-t.z);t.x=next.x;t.z=next.z;budget-=step;
    if(step>=gap-.00001)t.cursor++;
  }
  return t.cursor>=t.route.length;
}

export function stepBakeryTrips(town,dt){
  const s=town.trips;if(!s?.people.length)return;
  // Runtime lookup stays out of serialized resident records.
  s.personById=new Map(town.people.map(p=>[p.id,p]));
  for(const id of s.people){
    const person=s.personById.get(id),t=person.trip;t.phaseElapsed+=dt;t.timer=Math.max(0,t.timer-dt);
    if(t.moving){
      if(!advanceRoute(s,person,dt))continue;
      leaveMovement(s,person);
      if(t.stage==='toCounter'){t.yaw=Math.PI;setStage(person,'buy',1.8);}
      else if(t.stage==='toPark'){t.yaw=Math.PI;setStage(person,'eat',8);}
      else if(t.stage==='return'){t.yaw=0;t.seat=null;t.cycles++;s.returned++;setStage(person,'rest',4);}
      continue;
    }
    if(t.stage==='queue'&&t.timer===0&&!s.counterOwner&&!s.movementOwner){
      s.counterOwner=id;takeMovement(s,person,'toCounter',serviceRoute(s,person));
    }else if(t.stage==='buy'&&t.timer===0){
      t.carrying=true;s.bought++;setStage(person,'pickup',.9);
    }else if(t.stage==='pickup'&&t.timer===0){setStage(person,'depart');
    }else if(t.stage==='depart'&&!s.movementOwner){
      const seat=s.seats.find(seat=>!seat.owner);
      if(!seat)continue;
      seat.owner=id;t.seat=seat.id;s.counterOwner=null;takeMovement(s,person,'toPark',parkRoute(s,seat));
    }else if(t.stage==='eat'&&t.timer===0){
      t.carrying=false;s.eaten++;setStage(person,'returnWait');
    }else if(t.stage==='returnWait'&&!s.movementOwner){
      const route=returnRoute(s,person),seat=s.seats.find(seat=>seat.id===t.seat);
      seat.owner=null;takeMovement(s,person,'return',route);
    }else if(t.stage==='rest'&&t.timer===0){setStage(person,'queue');}
  }
}

export function getCitizenClip(person,activities){
  if(!person.trip)return activities.find(a=>a.id===person.activity).clip;
  if(person.trip.moving)return 'walk';
  if(person.trip.stage==='eat')return 'holding-right';
  return person.trip.carrying?'holding-both':'idle';
}
export function getCitizenVisualKey(person){return `${person.activity}:${person.trip?.carrying??true}:${person.trip?.moving??false}`;}
