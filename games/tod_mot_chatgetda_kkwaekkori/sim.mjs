// Seeded, renderer-independent town activities and fair observation puzzles.
export const WORLD_VERSION = 3;
export const BLOCK_PITCH = 7;
// Critter Catchin' inspired optional arcade pacing; the untimed town mode is unchanged.
export const CHALLENGE = Object.freeze({firstCrowd:10,additionalCrowd:3,maxCrowd:50,seconds:20,wrongPenalty:2});
export function getChallengeSettings(level=1) {
  const safeLevel=Math.max(1,Math.min(10000,Math.floor(Number(level)||1)));
  const distractors=Math.min(CHALLENGE.maxCrowd,CHALLENGE.firstCrowd+(safeLevel-1)*CHALLENGE.additionalCrowd);
  const residents=distractors+1; // Critter Catchin' spawns the special target separately.
  return {level:safeLevel,distractors,residents,targets:1,stageName:residents<=18?'small':'medium', // denser, less empty cities
    cols:residents<=18?3:residents<=36?4:5,rows:residents<=18?2:residents<=36?3:4,
    speed:Math.min(2.3,1+Math.max(0,safeLevel-10)*.12),seconds:CHALLENGE.seconds,wrongPenalty:CHALLENGE.wrongPenalty};
}
export const STAGES = Object.freeze({
  small: { label: '작은 마을', cols: 3, rows: 2, residents: 18, targets: 1 },
  medium: { label: '북적북적 동네', cols: 5, rows: 3, residents: 45, targets: 3 },
  large: { label: '와글와글 대도시', cols: 7, rows: 4, residents: 84, targets: 5 }
});
export const DIFFICULTIES = Object.freeze({
  easy: {name:'똑같은 친구',description:'그림과 같은 친구를 찾아요'},
  normal: {name:'자세히 보기',description:'옷과 하고 있는 일을 함께 봐요'},
  hard: {name:'꼼꼼히 찾기',description:'손에 든 물건까지 비교해요'}
});
export const COLORS = Object.freeze([
  { name:'빨간',hex:'#ee5963' },{ name:'노란',hex:'#f4cc4e' },{ name:'파란',hex:'#5b83d5' }
]);
export const ACTIVITIES = Object.freeze([
  {id:'browse',name:'빵을 고르는',clip:'holding-both',props:['식빵','크루아상','도넛']},
  {id:'deliver',name:'빵을 배달하는',clip:'walk',props:['식빵','크루아상','도넛']},
  {id:'eat',name:'빵을 먹는',clip:'holding-right',props:['식빵','크루아상','도넛']},
  {id:'read',name:'책을 읽는',clip:'holding-both',props:['빨간 책','노란 책','파란 책']},
  {id:'ball',name:'공놀이하는',clip:'idle',props:['빨간 공','노란 공','파란 공']},
  {id:'sit',name:'벤치에서 쉬는',clip:'sit',props:['빨간 방석','노란 방석','파란 방석']},
  {id:'wait',name:'버스를 기다리는',clip:'idle',props:['빨간 가방','노란 가방','파란 가방']},
  {id:'wave',name:'손을 흔드는',clip:'interact-right',props:['빨간 손수건','노란 손수건','파란 손수건']},
  {id:'map',name:'지도를 보는',clip:'holding-both',props:['빨간 지도','노란 지도','파란 지도']}
]);
export const DISTRICTS = Object.freeze([
  {name:'달콤한 빵집',kind:'bakery',activities:['browse','deliver','eat']},
  {name:'햇살 공원',kind:'park',activities:['read','ball','sit']},
  {name:'와글와글 정류장',kind:'stop',activities:['wait','wave','map']},
  {name:'알록달록 시장',kind:'market',activities:['browse','deliver','eat']},
  {name:'다정한 주택가',kind:'home',activities:['read','wave','sit']},
  {name:'학교 앞 거리',kind:'school',activities:['read','ball','wait']}
]);
export function createRng(seed) {
  let state=(Number(seed)>>>0)||1;
  return ()=>{state+=0x6D2B79F5;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
function shuffled(input,random){const a=[...input];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function getBlockCenter(block,stage){const c=typeof stage==='string'?STAGES[stage]:stage;return {x:(block.col-(c.cols-1)/2)*BLOCK_PITCH,z:(block.row-(c.rows-1)/2)*BLOCK_PITCH};}
export function signature(p){return `${p.modelVariant}:${p.activity}:${p.propVariant}`;}
// One geometry contract is shared by the simulation and the renderer.
// Props/buildings stay behind the activity bays; the perimeter is pedestrians only.
export const WALK = Object.freeze({edge:2.65, bayZ:1.15, bayX:[-1.8,-.6,.6,1.8], clearance:.82});
export function getRoutePosition(person){return {...person.position};}
export function getPose(person){return person.state==='walking'?'walk':person.activity==='deliver'?'holding-both':ACTIVITIES.find(a=>a.id===person.activity).clip;}

function makePaths(blocks,config){
  const nodes=new Map(),slots=[];
  const add=(id,x,z)=>{nodes.set(id,{id,x,z,next:[]});return id;};
  const link=(a,b)=>nodes.get(a).next.push(b);
  for(const block of blocks){
    const c=getBlockCenter(block,config),id=block.id,e=WALK.edge;
    add(id+':nw',c.x-e,c.z-e);add(id+':ne',c.x+e,c.z-e);
    add(id+':se',c.x+e,c.z+e);add(id+':sw',c.x-e,c.z+e);
    // Clockwise one-way footways avoid head-on traffic, including at crossings.
    link(id+':nw',id+':ne');link(id+':ne',id+':se');link(id+':sw',id+':nw');
    let last=id+':se';
    for(let i=3;i>=0;i--){
      const lane=add(id+':lane'+i,c.x+WALK.bayX[i],c.z+e);
      const bay=add(id+':bay'+i,c.x+WALK.bayX[i],c.z+WALK.bayZ);
      link(last,lane);link(lane,bay);link(bay,lane);last=lane;
      slots.push({id:bay,lane,block,index:i});
    }
    link(last,id+':sw');
  }
  for(const b of blocks){
    const right=blocks.find(q=>q.row===b.row&&q.col===b.col+1);
    const below=blocks.find(q=>q.col===b.col&&q.row===b.row+1);
    if(right){link(b.id+':ne',right.id+':nw');link(right.id+':sw',b.id+':se');}
    if(below){link(b.id+':se',below.id+':ne');link(below.id+':nw',b.id+':sw');}
  }
  return {nodes,slots,occupied:new Map(),routes:new Map()};
}
function findRoute(paths,start,goal){
  const key=start+'>'+goal;if(paths.routes.has(key))return [...paths.routes.get(key)];
  const previous=new Map([[start,null]]),queue=[start];
  for(let index=0;index<queue.length;index++){
    const id=queue[index];
    if(id===goal){
      const route=[];for(let at=goal;at!==start;at=previous.get(at))route.unshift(at);
      paths.routes.set(key,route);return [...route];
    }
    for(const next of paths.nodes.get(id).next){
      if((next.includes(':bay')&&next!==goal)||previous.has(next))continue;
      previous.set(next,id);queue.push(next);
    }
  }
  return [];
}
const visits={browse:['market','bakery'],deliver:['home','bakery'],eat:['park','bakery'],read:['park','home','school'],ball:['park','school'],sit:['park','home'],wait:['stop','school'],wave:['home','stop'],map:['stop','park','market']};
const ROUTINES={
  browse:[['bakery','browse'],['park','eat'],['home','sit']],
  eat:[['bakery','browse'],['park','eat'],['home','sit']],
  deliver:[['bakery','deliver'],['home','deliver'],['market','browse']],
  read:[['home','read'],['park','read'],['bakery','browse']],
  sit:[['home','sit'],['park','sit'],['bakery','browse']],
  ball:[['school','ball'],['park','ball'],['home','sit']],
  wait:[['home','read'],['stop','wait'],['market','browse']],
  wave:[['home','wave'],['market','browse'],['stop','wave']],
  map:[['stop','map'],['market','browse'],['park','read']]
};
function reservedNodes(town,p){
  const nodes=new Set(p.route);
  const last=town.paths.nodes.get(p.lastNode||p.slotId);
  if(last&&Math.hypot(last.x-p.position.x,last.z-p.position.z)<WALK.clearance+.05)nodes.add(last.id);
  return nodes;
}
function depart(town,p){
  p.requestedAt??=town.time;p.pendingRoute=[];
  const routine=ROUTINES[p.routine];
  const kinds=p.reserved?visits[p.activity]:[routine[(p.lifeStop+1)%routine.length][0]];
  const candidates=town.paths.slots.filter(s=>s.block.id!==p.block.id&&!town.paths.occupied.has(s.id));
  const preferred=candidates.filter(s=>kinds.includes(s.block.kind));
  // Background neighbors can do another errand if a favorite district is full.
  // Clue residents retain their action/prop and only visit suitable places.
  const pool=[...preferred.filter(s=>s.block.kind!==p.block.kind),...preferred.filter(s=>s.block.kind===p.block.kind),
    ...(p.reserved?[]:candidates.filter(s=>!kinds.includes(s.block.kind)))];
  const busy=new Set();
  for(const q of town.people){
    if(q.state==='walking')for(const id of reservedNodes(town,q))busy.add(id);
    else if(q!==p&&q.pendingRoute?.length&&town.time-q.requestedAt>6&&
      (q.trips<p.trips||(q.trips===p.trips&&q.requestedAt<p.requestedAt))){
      busy.add(q.slotId);for(const id of q.pendingRoute)busy.add(id);
    }
  }
  pool.sort((a,b)=>{
    const score=s=>(kinds.includes(s.block.kind)?0:100)+Math.abs(town.paths.nodes.get(s.id).x-p.position.x)+Math.abs(town.paths.nodes.get(s.id).z-p.position.z);
    return score(a)-score(b);
  });
  for(let i=0;i<pool.length;i++){
    const slot=pool[i],route=findRoute(town.paths,p.slotId,slot.id);
    if(!route.length)continue;
    if(!p.pendingRoute.length)p.pendingRoute=route;
    // Reserve the clear corridor before leaving a bay. Residents wait while doing
    // their activity, rather than getting stuck face-to-face in a narrow junction.
    if(busy.has(p.slotId)||route.some(id=>busy.has(id)))continue;
    town.paths.occupied.set(slot.id,p.id);
    p.pendingRoute=[];p.requestedAt=null;
    p.originSlot=p.slotId;p.destination=slot;p.route=route;p.state='walking';p.waiting=0;
    return;
  }
  p.routineAt=p.elapsed+1.5;
}
function arrive(town,p){
  p.block=p.destination.block;p.slot=p.destination.index;p.slotId=p.destination.id;
  p.destination=null;p.route=[];p.state='acting';p.trips++;
  // Sought neighbors keep their identifying prop/action, but travel like everyone else.
  if(!p.reserved&&!p.found){
    const routine=ROUTINES[p.routine],stop=routine.findIndex(([kind])=>kind===p.block.kind);
    if(stop>=0)p.lifeStop=stop;
    const choices=[...(stop>=0?[routine[stop][1]]:[]),...p.block.activities];
    if(p.block.kind==='park'&&['browse','deliver','eat'].includes(p.activity))choices.unshift('eat');
    if(p.block.kind==='home'&&p.activity==='deliver')choices.unshift('deliver');
    const next=choices.find(id=>!town.people.some(q=>q.id!==p.id&&signature(q)===signature({...p,activity:id})));
    if(next)p.activity=next;
  }
  p.action=p.activity;p.routineAt=p.elapsed+8+(Number(p.id.slice(7))%5)*1.7;
}
export function makeTown(stageName='small',seed=1,difficulty='easy',autoSelect=true,challenge=null){
  const base=STAGES[stageName];if(!base)throw new Error(`알 수 없는 마을 크기: ${stageName}`);
  const config=challenge?{...base,cols:challenge.cols,rows:challenge.rows,residents:challenge.residents,targets:1}:base;
  if(!DIFFICULTIES[difficulty])difficulty='easy';
  const random=createRng(seed),blocks=[],used=new Set();
  for(let row=0;row<config.rows;row++)for(let col=0;col<config.cols;col++)blocks.push({id:`b${row}-${col}`,col,row,...DISTRICTS[(col+row*config.cols)%6]});
  const people=Array.from({length:config.residents},(_,i)=>{
    const block=blocks[i%blocks.length],slot=Math.floor(i/blocks.length),activity=block.activities[slot%3];
    const choices=shuffled(Array.from({length:36},(_,n)=>({modelVariant:n%12,propVariant:Math.floor(n/12)})),random);
    const look=choices.find(v=>!used.has(signature({...v,activity})));
    // Delivery starts before the longer browsing/resting activities reserve the
    // shared corridors. Keep one RNG draw per resident so saved appearances stay stable.
    const person={id:`person-${i}`,block,slot,...look,activity,action:activity,elapsed:0,routineAt:activity==='deliver'?.8+random():3+random()*9,reserved:false,found:false,
      challengeSpeed:challenge?.speed||0,phase:i*2.39996+(seed%19)*.37};
    used.add(signature(person));return person;
  });
  const paths=makePaths(blocks,config);
  for(const p of people){
    const slot=paths.slots.find(s=>s.block.id===p.block.id&&s.index===p.slot);
    const point=paths.nodes.get(slot.id);
    Object.assign(p,{slotId:slot.id,position:{x:point.x,z:point.z},state:'acting',route:[],destination:null,trips:0,facing:0,waiting:0});
    paths.occupied.set(slot.id,p.id);
  }
  for(const p of people){p.routine=p.activity;p.lifeStop=Math.max(0,ROUTINES[p.routine].findIndex(([kind])=>kind===p.block.kind));}
  const town={stageName,config,seed,difficulty,challenge:!!challenge,blocks,people,paths,order:[],time:0};
  if(autoSelect)selectTargets(town,people.map(p=>p.id));return town;
}
export function selectTargets(town,eligibleIds,previous=[]){
  const eligible=new Set(eligibleIds),random=createRng(town.seed^0x51fa77);
  const pool=shuffled(town.people.filter(p=>eligible.has(p.id)&&(town.difficulty!=='hard'||town.people.some(q=>eligible.has(q.id)&&q.id!==p.id&&q.activity===p.activity))),random),order=[];
  const recent=new Set(previous),kinds=new Set();
  while(order.length<town.config.targets&&pool.length){
    let index=pool.findIndex(p=>!recent.has(signature(p))&&!kinds.has(p.block.kind)&&!order.some(id=>town.people.find(q=>q.id===id).activity===p.activity));
    if(index<0)index=0;
    const [person]=pool.splice(index,1);order.push(person.id);kinds.add(person.block.kind);
  }
  town.order=order;for(const p of town.people)p.reserved=order.includes(p.id);
  // Preserve the seeded target IDs/order used by existing saved games. Resolve
  // look collisions after choosing that order, rather than choosing new targets.
  const usedModels=new Set(),usedLooks=new Set(),variants=new Set(town.people.filter(p=>eligible.has(p.id)).map(p=>p.modelVariant));
  for(const id of order){
    const target=town.people.find(p=>p.id===id);
    if(usedModels.has(target.modelVariant)){
      const look=Array.from({length:36},(_,i)=>({modelVariant:(target.modelVariant+Math.floor(i/3))%12,propVariant:(target.propVariant+i)%3}))
        .find(v=>variants.has(v.modelVariant)&&!usedModels.has(v.modelVariant))||
        Array.from({length:3},(_,i)=>({modelVariant:target.modelVariant,propVariant:i})).find(v=>!usedLooks.has(`${v.modelVariant}:${v.propVariant}`));
      if(look)Object.assign(target,look);
    }
    usedModels.add(target.modelVariant);usedLooks.add(`${target.modelVariant}:${target.propVariant}`);
  }
  if(town.difficulty!=='easy')for(const id of order){
    const target=town.people.find(p=>p.id===id);
    const candidates=town.people.filter(p=>eligible.has(p.id)&&!p.reserved&&!p.foilFor&&p.id!==id&&(town.difficulty==='hard'?p.activity===target.activity:p.activity!==target.activity));
    let assigned=false;
    for(const foil of candidates){
      for(const propVariant of [(target.propVariant+1)%3,(target.propVariant+2)%3]){
        const look={...foil,modelVariant:target.modelVariant,propVariant};
        if(town.people.some(p=>p.id!==foil.id&&signature(p)===signature(look)))continue;
        Object.assign(foil,{modelVariant:target.modelVariant,propVariant,foilFor:id,reserved:true});assigned=true;break;
      }
      if(assigned)break;
    }
  }
  // Walking changes the pose. Keep each sought face + prop combination unique
  // even during travel, so the reference card never points at two residents.
  const targets=town.people.filter(p=>order.includes(p.id)),used=new Set(targets.map(signature));
  // Place near-matches first; ordinary background looks can move out of their way.
  const neighbors=town.people.filter(p=>!order.includes(p.id)).sort((a,b)=>Number(!!b.foilFor)-Number(!!a.foilFor));
  for(const p of neighbors){
    if(used.has(signature(p))||targets.some(t=>t.modelVariant===p.modelVariant&&t.propVariant===p.propVariant)){
      const choices=Array.from({length:36},(_,i)=>({modelVariant:(p.modelVariant+Math.floor(i/3))%12,propVariant:(p.propVariant+i)%3}));
      const look=choices.find(v=>(!p.foilFor||v.modelVariant===p.modelVariant)&&
        !targets.some(t=>t.modelVariant===v.modelVariant&&t.propVariant===v.propVariant)&&!used.has(signature({...p,...v})));
      if(look)Object.assign(p,look);
    }
    used.add(signature(p));
  }
  return order;
}
export function movePeople(town,deltaSeconds){
  const dt=Math.min(.25,Math.max(0,Number(deltaSeconds)||0));town.time+=dt;
  // Rotate priority to avoid giving low IDs a permanent advantage at junctions.
  const offset=Math.floor(town.time*2)%town.people.length;
  const people=[...town.people.slice(offset),...town.people.slice(0,offset)].sort((a,b)=>a.trips-b.trips);
  for(const p of people){
    p.elapsed+=dt;
    if(p.state!=='walking'){
      if(p.elapsed>=p.routineAt)depart(town,p);
      continue;
    }
    const node=town.paths.nodes.get(p.route[0]);if(!node)continue;
    const dx=node.x-p.position.x,dz=node.z-p.position.z,distance=Math.hypot(dx,dz);
    const step=Math.min(distance,dt*(.95+(Number(p.id.slice(7))%4)*.04)*Math.min(p.challengeSpeed||1,1.35));
    const next=distance?{x:p.position.x+dx/distance*step,z:p.position.z+dz/distance*step}:{...p.position};
    const blocked=town.people.some(q=>{
      if(q.id===p.id)return false;
      const before=Math.hypot(p.position.x-q.position.x,p.position.z-q.position.z);
      const after=Math.hypot(next.x-q.position.x,next.z-q.position.z);
      return after<WALK.clearance&&after<before-1e-7;
    });
    if(blocked){p.waiting+=dt;continue;}
    p.waiting=0;p.position=next;
    if(distance>.001)p.facing=Math.atan2(dx,dz);
    if(distance<=step+.00001){
      p.lastNode=p.route.shift();
      if(p.originSlot){town.paths.occupied.delete(p.originSlot);p.originSlot=null;}
      if(!p.route.length)arrive(town,p);
    }
  }
}
export function getClue(person,difficulty='easy'){
  if(!person)return null;const a=ACTIVITIES.find(a=>a.id===person.activity),prop=a.props[person.propVariant];
  const walking=person.state==='walking';
  const place=walking?`${person.destination.block.name} 쪽으로 가고 있어요.`:`${person.block.name} 근처에 있어요.`;
  return {title:walking?`${prop} · 걸어가는 친구`:difficulty==='hard'?`${prop} · ${a.name} 친구`:`${a.name} 친구`,subtitle:`${walking?'걸어가는':a.name} 친구를 찾아줘! ${prop}도 확인해 봐.`,place,prop};
}
export function getComparison(target,picked){
  if(target.modelVariant!==picked.modelVariant)return '하고 있는 일은 비슷할까? 얼굴과 옷도 살펴봐!';
  if(target.state==='walking'&&target.propVariant!==picked.propVariant)return '옷이 같은 친구네! 들고 가는 물건의 모양과 색도 살펴봐!';
  if(target.activity!==picked.activity)return '옷이 같은 친구네! 무엇을 하고 있는지도 살펴봐!';
  return '아주 비슷하네! 손에 든 물건의 모양과 색도 살펴봐!';
}
export function personIsDiscoverable(town,id){const p=town.people.find(p=>p.id===id);return !!p&&town.people.filter(q=>signature(q)===signature(p)).length===1;}
