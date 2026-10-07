/* Hanja Sichuan: path finding and constructive, solvable board generation.
 * Pure JavaScript: shared by the browser and node:test.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.HanjaSichuanEngine=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const DIRECTIONS=[[1,0],[0,1],[-1,0],[0,-1]];
  const randomInt=(max,rng)=>Math.floor(rng()*max);
  function shuffle(array,rng=Math.random){
    const result=array.slice();
    for(let i=result.length-1;i>0;i--){
      const j=randomInt(i+1,rng);
      [result[i],result[j]]=[result[j],result[i]];
    }
    return result;
  }
  // The search has a one-cell empty border, which allows paths around the board.
  // Every state tracks direction and bends; a turn is allowed at most twice.
  function findPath(board,cols,rows,start,end){
    if(start===end||start<0||end<0||start>=board.length||end>=board.length||
       !board[start]||!board[end])return null;
    const sx=start%cols+1,sy=Math.floor(start/cols)+1;
    const tx=end%cols+1,ty=Math.floor(end/cols)+1;
    const queue=[{x:sx,y:sy,d:-1,bends:0,parent:null}];
    const seen=new Set();
    for(let head=0;head<queue.length;head++){
      const current=queue[head];
      if(current.x===tx&&current.y===ty){
        const points=[];
        for(let node=current;node;node=node.parent)points.push({x:node.x-1,y:node.y-1});
        points.reverse();
        const corners=[points[0]];
        for(let i=1;i<points.length-1;i++){
          const prev=points[i-1],at=points[i],next=points[i+1];
          if((at.x-prev.x)!==(next.x-at.x)||(at.y-prev.y)!==(next.y-at.y))corners.push(at);
        }
        corners.push(points[points.length-1]);
        return corners;
      }
      for(let d=0;d<4;d++){
        const nx=current.x+DIRECTIONS[d][0],ny=current.y+DIRECTIONS[d][1];
        if(nx<0||ny<0||nx>cols+1||ny>rows+1)continue;
        const bends=current.bends+(current.d===-1||current.d===d?0:1);
        if(bends>2)continue;
        const isBorder=nx===0||ny===0||nx===cols+1||ny===rows+1;
        const isEnd=nx===tx&&ny===ty;
        if(!isBorder&&!isEnd&&board[(ny-1)*cols+(nx-1)])continue;
        const key=nx+','+ny+','+d+','+bends;
        if(seen.has(key))continue;
        seen.add(key);
        queue.push({x:nx,y:ny,d,bends,parent:current});
      }
    }
    return null;
  }
  function matchPath(board,cols,rows,a,b){
    const first=board[a],second=board[b];
    if(!first||!second||first.pairId!==second.pairId||
       first.kind===second.kind)return null;
    return findPath(board,cols,rows,a,b);
  }
  function availableMatches(board,cols,rows){
    const grouped=new Map();
    board.forEach((tile,i)=>{
      if(!tile)return;
      if(!grouped.has(tile.pairId))grouped.set(tile.pairId,[]);
      grouped.get(tile.pairId).push(i);
    });
    const result=[];
    for(const indexes of grouped.values()){
      if(indexes.length!==2)continue;
      const [a,b]=indexes;
      const path=matchPath(board,cols,rows,a,b);
      if(path)result.push({a,b,path});
    }
    return result;
  }
  // Start full, remove any path-connectable pairs, then put learning pairs in
  // those slots. Replaying the recorded removals is therefore always possible.
  // Extra pairs of slots stay empty for reshuffles of partially cleared boards.
  function generateBoard(pairs,cols,rows,rng=Math.random){
    const capacity=cols*rows;
    if(capacity%2||pairs.length*2>capacity||!pairs.length)
      throw new Error('Invalid Sichuan dimensions or pair count');
    for(let round=0;round<24;round++){
      const occupancy=Array(capacity).fill(1);
      const remaining=Array.from({length:capacity},(_,i)=>i);
      const removals=[];
      while(remaining.length>1){
        let choice=null;
        for(let trial=0;trial<Math.min(400,remaining.length*remaining.length*2);trial++){
          const i=randomInt(remaining.length,rng);
          let j=randomInt(remaining.length-1,rng);
          if(j>=i)j++;
          const a=remaining[i],b=remaining[j];
          if(findPath(occupancy,cols,rows,a,b)){choice=[a,b];break;}
        }
        if(!choice){
          const candidate=shuffle(remaining,rng);
          outer:for(let i=0;i<candidate.length;i++){
            for(let j=i+1;j<candidate.length;j++){
              if(findPath(occupancy,cols,rows,candidate[i],candidate[j])){
                choice=[candidate[i],candidate[j]];break outer;
              }
            }
          }
        }
        if(!choice)break;
        const [a,b]=choice;
        occupancy[a]=null;occupancy[b]=null;
        remaining.splice(remaining.indexOf(a),1);
        remaining.splice(remaining.indexOf(b),1);
        removals.push([a,b]);
      }
      if(removals.length!==capacity/2)continue;
      const board=Array(capacity).fill(null);
      const tiles=shuffle(pairs,rng);
      const solution=[];
      for(let i=0;i<tiles.length;i++){
        const pair=tiles[i],positions=removals[i];
        const [a,b]=rng()<.5?positions:[positions[1],positions[0]];
        board[a]={...pair,kind:'hanja'};
        board[b]={...pair,kind:'reading'};
        solution.push([a,b]);
      }
      return {board,solution};
    }
    throw new Error('Could not construct a solvable Sichuan board');
  }
  function pickEntries(entries,grade,count,rng=Math.random){
    const unique=new Map();
    for(const row of entries||[]){
      if(Number(row[1])<grade)continue;
      const sense=row[2]&&row[2][0];
      const meaning=sense&&sense[0]&&sense[0][0];
      const reading=sense&&sense[1]&&sense[1][0];
      if(!meaning||!reading)continue;
      const label=String(meaning).trim()+' '+String(reading).trim();
      if(!unique.has(label))unique.set(label,{pairId:String(row[0]),hanja:String(row[0]),meaning:String(meaning),reading:String(reading),label});
    }
    if(unique.size<count)throw new Error('Not enough distinct readings for this board');
    return shuffle([...unique.values()],rng).slice(0,count);
  }
  return Object.freeze({findPath,matchPath,availableMatches,generateBoard,pickEntries,shuffle});
});
