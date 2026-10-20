/* Ota Chapter 4: deterministic, traversable word maze. No DOM or Three.js. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.OtaMaze=api;
})(typeof window!=='undefined'?window:undefined,function(){
  'use strict';
  const SIZE=13,CELL=4.2,COUNT=SIZE*SIZE,ORIGIN_Z=-88;
  const DIRECTIONS=[[-1,0,1],[0,1,2],[1,0,4],[0,-1,8]];
  const OPPOSITE=[4,8,1,2];
  const WORDS=Object.freeze([
    {wrong:'몇일',answer:'며칠',choices:['몇일','며칠','몇칠'],clue:'달력에서 날짜를 셀 때 사용하는 말'},
    {wrong:'금새',answer:'금세',choices:['금새','금세','금쎄'],clue:'아주 짧은 시간 안에'},
    {wrong:'어의없다',answer:'어이없다',choices:['어의없다','어이없다','어이업다'],clue:'너무 뜻밖이어서 기가 막히다'},
    {wrong:'깨끗히',answer:'깨끗이',choices:['깨끗히','깨끗이','깨끗의'],clue:'더럽지 않고 말끔하게'},
    {wrong:'곰곰히',answer:'곰곰이',choices:['곰곰히','곰곰이','곰곰의'],clue:'여러 번 깊이 생각하다'},
    {wrong:'왠일',answer:'웬일',choices:['왠일','웬일','왠닐'],clue:'어찌 된 일인가'},
    {wrong:'설겆이',answer:'설거지',choices:['설겆이','설거지','설것이'],clue:'그릇을 씻어 정리하는 일'},
    {wrong:'구지',answer:'굳이',choices:['구지','굳이','궂이'],clue:'꼭 그렇게까지 할 필요가 없는데도'}
  ]);
  function rand(seed){
    let a=seed>>>0;
    return ()=>{a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^(a>>>15),a|1);
      t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
  }
  const id=(r,c)=>r*SIZE+c;
  const cell=(i)=>({row:Math.floor(i/SIZE),col:i%SIZE});
  const center=(i)=>{const v=cell(i);return {x:(v.col-(SIZE-1)/2)*CELL,z:ORIGIN_Z-v.row*CELL};};
  function neighbor(i,dir){
    const p=cell(i),r=p.row+DIRECTIONS[dir][0],c=p.col+DIRECTIONS[dir][1];
    return r<0||c<0||r>=SIZE||c>=SIZE?-1:id(r,c);
  }
  function open(links,a,dir){
    const b=neighbor(a,dir);if(b<0)return;
    links[a]|=DIRECTIONS[dir][2];links[b]|=OPPOSITE[dir];
  }
  function distances(links,from){
    const dist=new Int16Array(COUNT).fill(-1),queue=[from];dist[from]=0;
    for(let head=0;head<queue.length;head++){
      const at=queue[head];
      for(let dir=0;dir<4;dir++){
        if(!(links[at]&DIRECTIONS[dir][2]))continue;
        const next=neighbor(at,dir);
        if(next>=0&&dist[next]<0){dist[next]=dist[at]+1;queue.push(next);}
      }
    }
    return dist;
  }
  function create(seed){
    const rootSeed=(Number(seed)||0)>>>0;
    let best=null;
    for(let attempt=0;attempt<30;attempt++){
      const rng=rand((rootSeed^0x51ab913d)+Math.imul(attempt,0x9e3779b9));
      const links=new Uint8Array(COUNT),seen=new Uint8Array(COUNT),stack=[0];seen[0]=1;
      while(stack.length){
        const at=stack[stack.length-1],options=[];
        for(let dir=0;dir<4;dir++){
          const other=neighbor(at,dir);
          if(other>=0&&!seen[other])options.push(dir);
        }
        if(!options.length){stack.pop();continue;}
        const dir=options[Math.floor(rng()*options.length)],other=neighbor(at,dir);
        open(links,at,dir);seen[other]=1;stack.push(other);
      }
      // A few loops introduce real choices without erasing all wrong turns.
      const closed=[];
      for(let at=0;at<COUNT;at++)for(const dir of [1,2]){
        if(neighbor(at,dir)>=0 && !(links[at]&DIRECTIONS[dir][2]))closed.push([at,dir]);
      }
      for(let i=0;i<Math.min(7,closed.length);i++){
        const j=Math.floor(rng()*closed.length);
        const edge=closed.splice(j,1)[0];open(links,...edge);
      }
      const fromStart=distances(links,0);
      let exit=0;
      for(let i=1;i<COUNT;i++)if(fromStart[i]>fromStart[exit])exit=i;
      const ranked=Array.from({length:COUNT},(_,i)=>i)
        .filter(i=>i!==0&&i!==exit).sort((a,b)=>fromStart[b]-fromStart[a]+(rng()-.5)*.01);
      const stations=[];
      for(const i of ranked){
        if(stations.every(v=>distances(links,v)[i]>=19)&&fromStart[i]>=18)stations.push(i);
        if(stations.length===3)break;
      }
      if(stations.length!==3)continue;
      const dists=[0,...stations].map(v=>distances(links,v));
      const after=stations.map(v=>distances(links,v)[exit]);
      let minSteps=Infinity;
      for(const [a,b,c] of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]])
        minSteps=Math.min(minSteps,dists[0][stations[a]]+
          dists[a+1][stations[b]]+dists[b+1][stations[c]]+after[c]);
      const candidate={v:1,seed:rootSeed,links:Array.from(links),stations,
        exit,minSteps,solved:[false,false,false],visited:Array(COUNT).fill(false),wrong:0};
      if(!best||candidate.minSteps>best.minSteps)best=candidate;
      if(minSteps>=105)break;
    }
    if(!best)throw new Error('Unable to create Ota labyrinth');
    best.visited[0]=true;
    best.words=best.stations.map((_,i)=>WORDS[(rootSeed+i*3+(best.exit%WORDS.length))%WORDS.length]);
    return best;
  }
  function current(p){
    const col=Math.floor((p.x+(SIZE/2)*CELL)/CELL);
    const row=Math.floor((ORIGIN_Z+CELL/2-p.z)/CELL);
    if(row<0||col<0||row>=SIZE||col>=SIZE)return -1;
    return id(row,col);
  }
  function canMove(maze,x,z){
    const at=current({x,z});if(at<0)return false;
    const pos=center(at),dx=x-pos.x,dz=z-pos.z;
    const half=CELL/2-.35,links=maze.links[at];
    if(dx>half&&!(links&2))return false;
    if(dx< -half&&!(links&8))return false;
    if(dz< -half&&!(links&4))return false;
    if(dz>half&&!(links&1))return false;
    return true;
  }
  function enter(maze,p){
    const at=current(p);if(at>=0)maze.visited[at]=true;
    return at;
  }
  function action(maze,p){
    for(let i=0;i<maze.stations.length;i++){
      const spot=center(maze.stations[i]);
      if(!maze.solved[i]&&Math.hypot(spot.x-p.x,spot.z-p.z)<1.95)
        return {type:'mazeWord',station:i,label:'잘못 쓰인 색인 복구 ('+(maze.solved.filter(Boolean).length+1)+'/3)'};
    }
    const end=center(maze.exit);
    if(Math.hypot(end.x-p.x,end.z-p.z)<2.2)
      return maze.solved.every(Boolean)?{type:'mazeExit',label:'자신의 이름으로 탈출하기'}
        :{type:'mazeLocked',label:'색인 조각 '+maze.solved.filter(Boolean).length+'/3 · 아직 닫힌 문'};
    return null;
  }
  function solve(maze,station,answer){
    if(!Number.isInteger(station)||station<0||station>2||maze.solved[station])return false;
    if(answer!==maze.words[station].answer){maze.wrong++;return false;}
    maze.solved[station]=true;return true;
  }
  function hint(maze,p,level=1){
    const targetIndex=maze.solved.findIndex(v=>!v),goal=targetIndex<0?maze.exit:maze.stations[targetIndex];
    const here=current(p),goalPos=center(goal);
    if(here<0)return '미로의 첫 번째 방에서 다시 길을 살펴보세요.';
    if(level===1)return '찢어진 색인 '+maze.solved.filter(Boolean).length+'/3 · 아직 가 보지 않은 갈림길을 찾아보세요.';
    if(level===2){
      const dx=goalPos.x-p.x,dz=goalPos.z-p.z;
      return '찾아야 할 기록은 대략 '+(Math.abs(dx)>Math.abs(dz)?(dx>0?'동쪽':'서쪽'):(dz>0?'남쪽':'북쪽'))+'에 있습니다.';
    }
    const next=distances(maze.links,goal),currentDist=next[here];
    for(let dir=0;dir<4;dir++){
      const other=neighbor(here,dir);
      if(other>=0&&(maze.links[here]&DIRECTIONS[dir][2])&&next[other]===currentDist-1)
        return '가까운 갈림길에서 '+['북쪽','동쪽','남쪽','서쪽'][dir]+' 통로를 살펴보세요.';
    }
    return '지금 방을 충분히 살펴보세요.';
  }
  function snapshot(maze){return {v:1,seed:maze.seed,solved:[...maze.solved],visited:[...maze.visited],wrong:maze.wrong};}
  function restore(maze,data){
    if(!data||data.v!==1||data.seed!==maze.seed)return false;
    maze.solved=maze.solved.map((_,i)=>data.solved?.[i]===true);
    maze.visited=maze.visited.map((_,i)=>data.visited?.[i]===true);
    maze.visited[0]=true;maze.wrong=Math.max(0,Math.min(999,Number(data.wrong)||0));return true;
  }
  return Object.freeze({SIZE,CELL,COUNT,WORDS,center,cell,neighbor,distances,
    create,current,canMove,enter,action,solve,hint,snapshot,restore});
});