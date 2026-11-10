/* Corn Maze: deterministic, renderer-independent map and pursuer rules. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.CornMaze=api;
})(typeof window!=='undefined'?window:undefined,function(){
'use strict';
const SIZE=21,CELL=5.4,BITS=[1,2,4,8],DR=[-1,0,1,0],DC=[0,1,0,-1];
const LABELS=['풍차','우물','헛간','물탱크'];
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^(a>>>15),a|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const id=(r,c,size)=>r*size+c;
function neighbor(i,d,size){const r=Math.floor(i/size)+DR[d],c=i%size+DC[d];return r<0||c<0||r>=size||c>=size?-1:id(r,c,size);}
function carve(links,a,d,size){const b=neighbor(a,d,size);if(b<0)return;links[a]|=BITS[d];links[b]|=BITS[(d+2)%4];}
function adjacent(maze,at){const out=[];for(let d=0;d<4;d++)if(maze.links[at]&BITS[d]){const b=neighbor(at,d,maze.size);if(b>=0)out.push(b);}return out;}
function distances(maze,from){const dist=new Int16Array(maze.size*maze.size).fill(-1),q=[from];dist[from]=0;for(let h=0;h<q.length;h++)for(const n of adjacent(maze,q[h]))if(dist[n]<0){dist[n]=dist[q[h]]+1;q.push(n);}return dist;}
function route(maze,from,to){if(from<0||to<0)return[];const prev=new Int16Array(maze.links.length).fill(-1),q=[from];prev[from]=from;for(let h=0;h<q.length&&prev[to]===-1;h++)for(const n of adjacent(maze,q[h]))if(prev[n]===-1){prev[n]=q[h];q.push(n);}if(prev[to]===-1)return[];const result=[];for(let x=to;x!==from;x=prev[x])result.push(x);result.push(from);return result.reverse();}
function center(maze,i){return{x:((i%maze.size)-(maze.size-1)/2)*maze.cell,z:(Math.floor(i/maze.size)-(maze.size-1)/2)*maze.cell};}
function current(maze,x,z){const c=Math.floor((x+maze.size*maze.cell/2)/maze.cell),r=Math.floor((z+maze.size*maze.cell/2)/maze.cell);return r<0||c<0||r>=maze.size||c>=maze.size?-1:id(r,c,maze.size);}
function canStand(maze,x,z,radius=.43){const at=current(maze,x,z);if(at<0)return false;const p=center(maze,at),dx=x-p.x,dz=z-p.z,limit=maze.cell/2-radius,wall=maze.links[at];return !((dx>limit&&!(wall&2))||(dx< -limit&&!(wall&8))||(dz>limit&&!(wall&4))||(dz< -limit&&!(wall&1)));}
// Rate the actual shortest walking route rather than only the number of cells.
function pathQuality(path){
 const steps=path.length-1;let turns=0,streak=0,maxTurnStreak=0,longestStraight=1,straight=1;
 for(let i=2;i<path.length;i++)if(path[i]-path[i-1]!==path[i-1]-path[i-2]){
  turns++;streak++;maxTurnStreak=Math.max(maxTurnStreak,streak);
  longestStraight=Math.max(longestStraight,straight);straight=1;
 }else{straight++;streak=0;}
 return {steps,turns,turnRatio:turns/Math.max(1,steps-1),maxTurnStreak,longestStraight:Math.max(straight,longestStraight)};
}
// A few clues should reward short detours, not trace a painted line to the exit.
function pickBranch(maze,anchor,onSolution,used,random){
 const hops=distances(maze,anchor),items=[];
 for(let i=0;i<maze.links.length;i++){
  if(onSolution.has(i)||used.has(i)||hops[i]<2||hops[i]>4)continue;
  if([...used].some(other=>Math.abs(Math.floor(i/maze.size)-Math.floor(other/maze.size))+Math.abs(i%maze.size-other%maze.size)<2))continue;
  items.push({cell:i,score:Math.abs(hops[i]-3)*4+random()});
 }
 items.sort((a,b)=>a.score-b.score);
 return items.length?items[0].cell:-1;
}
function generate(seed=20261110,size=SIZE){
 size=Math.max(11,Math.min(29,Math.round(size)|1));
 const scale=size/SIZE,minSteps=Math.max(20,Math.round(85*scale)),maxSteps=Math.round(145*scale),MAX_ATTEMPTS=96;
 for(let attempt=0;attempt<MAX_ATTEMPTS;attempt++){
  const random=rng((seed>>>0)^(Math.imul(attempt+1,0x9e3779b9))),count=size*size,links=new Uint8Array(count),seen=new Uint8Array(count),stack=[0];seen[0]=1;
  while(stack.length){
   const at=stack[stack.length-1],choices=[];
   for(let d=0;d<4;d++){const n=neighbor(at,d,size);if(n>=0&&!seen[n])choices.push(d);}
   if(!choices.length){stack.pop();continue;}
   const d=choices[Math.floor(random()*choices.length)],n=neighbor(at,d,size);
   carve(links,at,d,size);seen[n]=1;stack.push(n);
  }
  const maze={size,cell:CELL,seed:seed>>>0,links:Array.from(links)},closed=[];
  for(let i=0;i<count;i++)for(const d of [1,2]){
   const n=neighbor(i,d,size);if(n>=0&&!(links[i]&BITS[d]))closed.push([i,d,n]);
  }
  const extra=Math.max(6,Math.floor(size*size*.048));
  for(let n=0,tries=0;n<extra&&tries<closed.length*3;tries++){
   const k=Math.floor(random()*closed.length),edge=closed.splice(k,1)[0];if(!edge)break;
   if(route(maze,edge[0],edge[2]).length<8)continue;
   carve(links,edge[0],edge[1],size);
   maze.links[edge[0]]=links[edge[0]];maze.links[edge[2]]=links[edge[2]];n++;
  }
  maze.links=Array.from(links);
  const junctions=maze.links.filter(v=>BITS.reduce((n,bit)=>n+!!(v&bit),0)>=3).length;
  const deadEnds=maze.links.filter(v=>BITS.reduce((n,bit)=>n+!!(v&bit),0)===1).length;
  if(junctions<Math.floor(18*scale*scale)||deadEnds<Math.floor(12*scale*scale))continue;
  // One BFS supplies distance and predecessors for all opposite-border exit candidates.
  const depth=new Int16Array(count).fill(-1),prev=new Int16Array(count).fill(-1),q=[0];depth[0]=0;prev[0]=0;
  for(let h=0;h<q.length;h++)for(const n of adjacent(maze,q[h]))if(depth[n]<0){depth[n]=depth[q[h]]+1;prev[n]=q[h];q.push(n);}
  const candidates=[];
  for(let i=1;i<count;i++){
   const row=Math.floor(i/size),col=i%size;
   if(row!==size-1&&col!==size-1)continue;
   if(depth[i]<minSteps||depth[i]>maxSteps)continue;
   const path=[];for(let p=i;p!==0;p=prev[p])path.push(p);
   path.push(0);path.reverse();
   const quality=pathQuality(path);
   if(quality.turnRatio>.68||quality.maxTurnStreak>12||quality.longestStraight<4)continue;
   const deadExit=((links[i]&(links[i]-1))===0);
   candidates.push({exit:i,path,quality,score:Math.abs(quality.steps-111*scale)+Math.max(0,quality.turnRatio-.58)*90+(deadExit?0:6)+random()*2});
  }
  if(!candidates.length)continue;
  candidates.sort((a,b)=>a.score-b.score);
  const chosen=candidates[0],main=chosen.path,onSolution=new Set(main),used=new Set([0,chosen.exit]),at=f=>main[Math.floor((main.length-1)*f)];
  const stations=[0,at(.32)],branch=pickBranch(maze,at(.60),onSolution,new Set([...used,...stations]),random);
  if(branch<0)continue;
  stations.push(branch,at(.82));stations.forEach(x=>used.add(x));
  const landmarks=[];
  for(let i=0;i<LABELS.length;i++){
   const anchor=at([.14,.38,.64,.77][i]),offRoute=i===1||i===3;
   const cell=offRoute?pickBranch(maze,anchor,onSolution,used,random):anchor;
   if(cell<0||used.has(cell))break;
   used.add(cell);landmarks.push({cell,name:LABELS[i],type:i});
  }
  if(landmarks.length!==4)continue;
  Object.assign(maze,{start:0,exit:chosen.exit,stations,landmarks,metrics:{shortest:chosen.quality.steps,junctions,deadEnds,turns:chosen.quality.turns,turnRatio:chosen.quality.turnRatio,maxTurnStreak:chosen.quality.maxTurnStreak,generationAttempts:attempt+1}});
  return maze;
 }
 throw new Error('Unable to generate a fair corn maze for seed '+seed+' and size '+size);
}
function createHunter(maze,mode='normal'){return{phase:mode==='explore'?'disabled':'waiting',timer:mode==='explore'?0:70,elapsed:0,routeTimer:0,path:[],x:0,z:0,encounters:0,caught:0,lost:0};}
function spawnHunter(maze,hunter,player){const at=current(maze,player.x,player.z);if(at<0)return false;const hop=distances(maze,at),options=[];for(let i=0;i<hop.length;i++)if(hop[i]>=6&&hop[i]<=11&&i!==maze.exit&&!maze.stations.includes(i))options.push(i);if(!options.length)return false;const cell=options[(maze.seed+hunter.encounters*23)%options.length];const p=center(maze,cell);hunter.x=p.x;hunter.z=p.z;hunter.phase='warning';hunter.timer=3;hunter.elapsed=0;hunter.lost=0;hunter.encounters++;return true;}
function stepHunter(maze,hunter,dt,player){dt=Math.max(0,Math.min(.08,Number(dt)||0));
 if(hunter.phase==='disabled')return{caught:false,phase:hunter.phase,distance:Infinity};
 if(hunter.phase==='waiting'){hunter.timer-=dt;if(hunter.timer<=0&&!spawnHunter(maze,hunter,player))hunter.timer=16;}
 else if(hunter.phase==='warning'){hunter.timer-=dt;if(hunter.timer<=0){hunter.phase='chase';hunter.elapsed=0;hunter.routeTimer=0;}}
 else if(hunter.phase==='chase'){
   hunter.elapsed+=dt;hunter.routeTimer-=dt;
   const here=current(maze,hunter.x,hunter.z),target=current(maze,player.x,player.z);
   if(here>=0&&target>=0&&hunter.routeTimer<=0){hunter.path=route(maze,here,target);hunter.routeTimer=.38;}
   const next=hunter.path?.length>1?center(maze,hunter.path[1]):player;
   const dx=next.x-hunter.x,dz=next.z-hunter.z,len=Math.hypot(dx,dz);
   if(len>.001){const step=Math.min(len,3.26*dt),x=hunter.x+dx/len*step,z=hunter.z+dz/len*step;if(canStand(maze,x,z,.34)){hunter.x=x;hunter.z=z;}}
   const cellHops=here>=0&&target>=0?route(maze,here,target).length:0;
   hunter.lost=cellHops>14?hunter.lost+dt:Math.max(0,hunter.lost-dt*2);
   if(hunter.elapsed>=155||hunter.lost>=15){hunter.phase='waiting';hunter.timer=95+(hunter.encounters*37)%40;}
 }
 const distance=Math.hypot(player.x-hunter.x,player.z-hunter.z);
 const caught=hunter.phase==='chase'&&distance<1.05&&hunter.elapsed>1;
 if(caught){hunter.caught++;hunter.phase='waiting';hunter.timer=105;hunter.path=[];}
 return{caught,phase:hunter.phase,distance};
}
return Object.freeze({SIZE,CELL,BITS,neighbor,adjacent,distances,route,center,current,canStand,generate,createHunter,stepHunter,spawnHunter});
});