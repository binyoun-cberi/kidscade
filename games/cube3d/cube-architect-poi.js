/* Survival landmark POIs derived from the hard-mode blueprint data.
   v19 keeps landmarks intact in the overworld and uses them as dungeon entrances. */
(()=>{
'use strict';
const plans=window.CubeArchitectLandmarks();
const WORLD_SCALE=window.CubeArchitectWorld?.WORLD_SCALE||1.5;
const sp=n=>Math.round(n*WORLD_SCALE);
const CONFIG=[
  {id:'taj',missionIndex:0,biome:'desert',center:[sp(32),sp(-29)],name:'타지마할',
   dungeon:{title:'빛과 대칭의 궁전',theme:'marble',trial:'대칭 거울을 맞추고 설계실을 여세요.'},
   tech:{id:'windows',label:'유리 건축',recipes:['glassPane','windowFrame'],reward:{glass:4}}},
  {id:'sagrada',missionIndex:1,biome:'flowers',center:[sp(-35),sp(30)],name:'사그라다 파밀리아',
   dungeon:{title:'솟아오른 성당',theme:'cathedral',trial:'첨탑의 길을 따라 설계실까지 올라가세요.'},
   tech:{id:'largeCuboid',label:'대형 직육면체',recipes:[],reward:{planks:6}}},
  {id:'eiffel',missionIndex:2,biome:'snow',center:[sp(-5),sp(-44)],name:'에펠탑',
   dungeon:{title:'철골 기계탑',theme:'iron',trial:'기계 장치를 작동시켜 상층 설계실을 여세요.'},
   tech:{id:'slabs',label:'반블록 건축',recipes:['slab'],reward:{ironOre:3}}},
  {id:'towerBridge',missionIndex:3,biome:'badlands',center:[sp(43),sp(23)],name:'타워 브리지',
   dungeon:{title:'개폐교 제어실',theme:'bridge',trial:'좌우 제어 장치를 맞춰 중앙 통로를 여세요.'},
   tech:{id:'stairs',label:'계단 건축',recipes:['stairs'],reward:{brick:4}}},
  {id:'himeji',missionIndex:4,biome:'forest',center:[sp(-27),sp(-9)],name:'히메지성',
   dungeon:{title:'백로성 미로',theme:'castle',trial:'숨은 길을 찾아 천수각 설계실에 도달하세요.'},
   tech:{id:'roofs',label:'경사지붕 건축',recipes:['roof'],reward:{planks:5}}},
  {id:'angkor',missionIndex:5,biome:'marsh',center:[sp(5),sp(39)],name:'앙코르와트',
   dungeon:{title:'정글의 석실',theme:'jungle',trial:'고대 문양을 해독해 중앙 성소를 여세요.'},
   tech:{id:'geometry',label:'고급 도형 장식',recipes:['reedMat'],reward:{clay:4}}}
];
function exposed(set,[x,y,z]){
  return [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]
    .some(([a,b,c])=>!set.has((x+a)+','+(y+b)+','+(z+c)));
}
function materialFor(role,config){
  if(role==='window')return 'glassPane';
  if(config.id==='taj')return role==='window'?'glassPane':'snowBrick';
  if(config.id==='eiffel')return role==='base'?'smoothStone':'ironBlock';
  if(config.id==='himeji'){
    if(role==='roof'||role==='spire')return 'roof';
    return 'snowBrick';
  }
  if(config.id==='towerBridge'){
    if(role==='roof'||role==='spire')return 'roof';
    return role==='base'?'smoothStone':'brick';
  }
  if(config.id==='angkor')return role==='detail'||role==='arch'?'brick':'sandstone';
  if(config.id==='sagrada')return role==='window'?'glassPane':role==='detail'||role==='spire'?'brick':'sandstone';
  if(role==='roof'||role==='dome'||role==='spire')return config.biome==='snow'?'snowBrick':'roof';
  if(role==='detail'||role==='arch')return config.biome==='desert'?'sandstone':'brick';
  if(role==='base')return config.biome==='desert'?'sandstone':config.biome==='badlands'?'redSand':'stone';
  return config.biome==='desert'?'sandstone':config.biome==='snow'?'snowBrick':'smoothStone';
}
function compress(plan,target=30){
  const xs=plan.blocks.map(p=>p[0]),ys=plan.blocks.map(p=>p[1]),zs=plan.blocks.map(p=>p[2]);
  const min=[Math.min(...xs),Math.min(...ys),Math.min(...zs)];
  const max=[Math.max(...xs),Math.max(...ys),Math.max(...zs)];
  const spanX=max[0]-min[0]+1,spanZ=max[2]-min[2]+1;
  const scale=Math.min(1,target/Math.max(spanX,spanZ));
  // Use the original blueprint resolution whenever possible. The v18/v19 21-cell
  // compression made landmark blocks feel oversized next to a 1.8-block-tall player.
  const sy=Math.min(1,Math.max(.72,scale));
  const map=new Map();
  const priority=r=>({spire:7,dome:6,tower:5,roof:4,window:4,arch:3,detail:2,body:1,base:0}[r]||0);
  for(const p of plan.blocks){
    const key=p.join(','),role=plan.roles?.[key]||'body',color=plan.colors?.[key]||'#c6b79d';
    const q=[
      Math.round((p[0]-min[0])*scale),
      Math.round((p[1]-min[1])*sy),
      Math.round((p[2]-min[2])*scale)
    ];
    const k=q.join(','),prior=map.get(k);
    if(!prior||priority(role)>=priority(prior.role))map.set(k,{p:q,role,color});
  }
  const set=new Set(map.keys());
  const shell=[...map.values()].filter(v=>exposed(set,v.p)||v.role==='base');
  const maxX=Math.max(...shell.map(v=>v.p[0])),maxY=Math.max(...shell.map(v=>v.p[1])),
    maxZ=Math.max(...shell.map(v=>v.p[2]));
  return {blocks:shell,fullShell:shell,size:[maxX+1,maxY+1,maxZ+1]};
}
const POIS=CONFIG.map(config=>{
  const compact=compress(plans[config.missionIndex]);
  compact.blocks=compact.blocks.map(v=>({...v,type:materialFor(v.role,config)}));
  compact.fullShell=compact.fullShell.map(v=>({...v,type:materialFor(v.role,config)}));
  const [w,h,d]=compact.size,[cx,cz]=config.center;
  return {...config,sourceName:plans[config.missionIndex].name,
    tip:plans[config.missionIndex].tip,compact,
    origin:[Math.round(cx-w/2),Math.round(cz-d/2)],
    radius:Math.max(w,d)*.72+3,
    clearRadius:Math.max(w,d)*.72+10};
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
function isLandmarkClearZone(x,z,padding=0){
  return POIS.some(p=>Math.hypot(x-p.center[0],z-p.center[1])<=p.clearRadius+padding);
}
window.CubeArchitectPOI={POIS,poiById,poiAt,poisForChunk,isLandmarkClearZone};
})();
