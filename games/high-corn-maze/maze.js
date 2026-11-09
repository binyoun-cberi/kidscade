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
function generate(seed=20261110,size=SIZE){size=Math.max(11,Math.min(29,Math.round(size)|1));let winner=null;
for(let attempt=0;attempt<32;attempt++){
 const random=rng((seed>>>0)^(Math.imul(attempt+1,0x9e3779b9))),count=size*size,links=new Uint8Array(count),seen=new Uint8Array(count),stack=[0];seen[0]=1;
 while(stack.length){const at=stack[stack.length-1],choices=[];for(let d=0;d<4;d++){const n=neighbor(at,d,size);if(n>=0&&!seen[n])choices.push(d);}if(!choices.length){stack.pop();continue;}const d=choices[Math.floor(random()*choices.length)],n=neighbor(at,d,size);carve(links,at,d,size);seen[n]=1;stack.push(n);}
 const maze={size,cell:CELL,seed:seed>>>0,links:Array.from(links)};
 const closed=[];for(let i=0;i<count;i++)for(const d of [1,2]){const n=neighbor(i,d,size);if(n>=0&&!(links[i]&BITS[d]))closed.push([i,d,n]);}
 const extra=Math.max(10,Math.floor(size*size*.048));
 for(let n=0,tries=0;n<extra&&tries<closed.length*3;tries++){const k=Math.floor(random()*closed.length),edge=closed.splice(k,1)[0];if(!edge)break;if(route(maze,edge[0],edge[2]).length<8)continue;carve(links,edge[0],edge[1],size);maze.links[edge[0]]=links[edge[0]];maze.links[edge[2]]=links[edge[2]];n++;}
 maze.links=Array.from(links);
 const dists=distances(maze,0);let exit=1;for(let i=2;i<count;i++)if(dists[i]>dists[exit])exit=i;
 const main=route(maze,0,exit);
 const junctions=maze.links.filter(v=>[0,1,2,3].reduce((n,d)=>n+!!(v&BITS[d]),0)>=3).length;
 const deadEnds=maze.links.filter(v=>[0,1,2,3].reduce((n,d)=>n+!!(v&BITS[d]),0)===1).length;
 const stations=[.19,.39,.62,.82].map(f=>main[Math.floor((main.length-1)*f)]);
 const landmarks=[.14,.35,.57,.76].map((f,i)=>({cell:main[Math.floor((main.length-1)*f)],name:LABELS[i],type:i}));
 Object.assign(maze,{start:0,exit,stations,landmarks,metrics:{shortest:main.length-1,junctions,deadEnds}});
 const score=Math.abs(main.length-120)+Math.abs(junctions-45)*.6;
 if(!winner||score<winner.score)winner={maze,score};
 if(main.length>=70&&main.length<=185&&junctions>=18&&deadEnds>=12)return maze;
}
return winner.maze;
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