/* Survival landmark POIs derived from the exact hard-mode blueprint data.
   The world uses compressed ruins; restoration opens the full blueprint challenge. */
(()=>{
'use strict';
const plans=window.CubeArchitectLandmarks();
const CONFIG=[
  {id:'taj',missionIndex:0,biome:'desert',center:[32,-29],name:'타지마할 폐허',
   tech:{id:'windows',label:'유리 건축',recipes:['glassPane','windowFrame'],reward:{glass:4}}},
  {id:'sagrada',missionIndex:1,biome:'flowers',center:[-35,30],name:'사그라다 파밀리아 흔적',
   tech:{id:'largeCuboid',label:'대형 직육면체',recipes:[],reward:{planks:6}}},
  {id:'eiffel',missionIndex:2,biome:'snow',center:[-5,-44],name:'에펠탑 철골 유적',
   tech:{id:'slabs',label:'반블록 건축',recipes:['slab'],reward:{ironOre:3}}},
  {id:'towerBridge',missionIndex:3,biome:'badlands',center:[43,23],name:'타워 브리지 유적',
   tech:{id:'stairs',label:'계단 건축',recipes:['stairs'],reward:{brick:4}}},
  {id:'himeji',missionIndex:4,biome:'forest',center:[-27,-9],name:'히메지성 터',
   tech:{id:'roofs',label:'경사지붕 건축',recipes:['roof'],reward:{planks:5}}},
  {id:'angkor',missionIndex:5,biome:'marsh',center:[5,39],name:'앙코르와트 유적',
   tech:{id:'geometry',label:'고급 도형 장식',recipes:['reedMat'],reward:{clay:4}}}
];
function hash(a,b,c=0){
  const v=Math.sin(a*127.1+b*311.7+c*74.7)*43758.5453;
  return v-Math.floor(v);
}
function exposed(set,[x,y,z]){
  return [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]
    .some(([a,b,c])=>!set.has((x+a)+','+(y+b)+','+(z+c)));
}
function materialFor(role,biome){
  if(role==='window')return 'glassPane';
  if(role==='roof'||role==='dome'||role==='spire')return biome==='snow'?'snowBrick':'roof';
  if(role==='detail'||role==='arch')return biome==='desert'?'sandstone':'brick';
  if(role==='base')return biome==='desert'?'sandstone':biome==='badlands'?'redSand':'stone';
  return biome==='desert'?'sandstone':biome==='snow'?'snowBrick':'smoothStone';
}
function compress(plan,target=17){
  const xs=plan.blocks.map(p=>p[0]),ys=plan.blocks.map(p=>p[1]),zs=plan.blocks.map(p=>p[2]);
  const min=[Math.min(...xs),Math.min(...ys),Math.min(...zs)];
  const max=[Math.max(...xs),Math.max(...ys),Math.max(...zs)];
  const spanX=max[0]-min[0]+1,spanZ=max[2]-min[2]+1;
  const scale=Math.min(1,target/Math.max(spanX,spanZ));
  const sy=Math.min(.82,Math.max(.58,scale*.92));
  const map=new Map();
  for(const p of plan.blocks){
    const key=p.join(','),role=plan.roles?.[key]||'body',color=plan.colors?.[key]||'#c6b79d';
    const q=[
      Math.round((p[0]-min[0])*scale),
      Math.round((p[1]-min[1])*sy),
      Math.round((p[2]-min[2])*scale)
    ];
    const k=q.join(',');
    const prior=map.get(k);
    const priority=r=>({spire:7,dome:6,tower:5,roof:4,window:4,arch:3,detail:2,body:1,base:0}[r]||0);
    if(!prior||priority(role)>=priority(prior.role))map.set(k,{p:q,role,color});
  }
  const set=new Set(map.keys());
  const shell=[...map.values()].filter(v=>exposed(set,v.p)||v.role==='base');
  // Turn the complete blueprint into a recognisable ruin. Important structural
  // pieces survive more often than decoration, while the exact full plan remains
  // available in challenge mode.
  const ruin=shell.filter(v=>{
    const [x,y,z]=v.p;
    const keep=v.role==='base'?.93:
      (v.role==='tower'||v.role==='spire'||v.role==='dome')?.84:
      v.role==='roof'?.78:.70;
    return hash(x,z,y)<keep;
  });
  const maxX=Math.max(...shell.map(v=>v.p[0])),maxY=Math.max(...shell.map(v=>v.p[1])),
    maxZ=Math.max(...shell.map(v=>v.p[2]));
  return {blocks:ruin,fullShell:shell,size:[maxX+1,maxY+1,maxZ+1]};
}
const POIS=CONFIG.map(config=>{
  const compact=compress(plans[config.missionIndex]);
  compact.blocks=compact.blocks.map(v=>({...v,type:materialFor(v.role,config.biome)}));
  compact.fullShell=compact.fullShell.map(v=>({...v,type:materialFor(v.role,config.biome)}));
  const [w,h,d]=compact.size,[cx,cz]=config.center;
  return {...config,sourceName:plans[config.missionIndex].name,
    tip:plans[config.missionIndex].tip,compact,
    origin:[Math.round(cx-w/2),Math.round(cz-d/2)],
    radius:Math.max(w,d)*.72+3};
});
function poiById(id){return POIS.find(p=>p.id===id)||null}
function poiAt(x,z,maxDistance=Infinity){
  return POIS.map(p=>({...p,distance:Math.hypot(x-p.center[0],z-p.center[1])}))
    .filter(p=>p.distance<=maxDistance).sort((a,b)=>a.distance-b.distance)[0]||null;
}
function poisForChunk(cx,cz,size=16){
  const minX=cx*size,minZ=cz*size,maxX=minX+size-1,maxZ=minZ+size-1;
  return POIS.filter(p=>{
    const [ox,oz]=p.origin,[w,,d]=p.compact.size;
    return ox<=maxX&&ox+w>=minX&&oz<=maxZ&&oz+d>=minZ;
  });
}
window.CubeArchitectPOI={POIS,poiById,poiAt,poisForChunk};
})();
