(()=>{
'use strict';
const key=p=>p.join(',');
function nextCorrection(target,user,surfaceOnly=false){
 const wanted=new Set(target.map(key)),owned=new Set(user.map(key));
 const extra=user.find(p=>!wanted.has(key(p)));
 if(extra)return {kind:'remove',point:extra,text:'빨간 테두리의 블록 하나를 빼 보자.'};
 const visible=surfaceOnly?target.filter(p=>[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].some(d=>!wanted.has(key(p.map((v,i)=>v+d[i]))))):target;
 const missing=visible.filter(p=>!owned.has(key(p))).sort((a,b)=>a[1]-b[1]||a[0]-b[0]||a[2]-b[2])[0];
 return missing?{kind:'add',point:missing,text:'파란 테두리에 블록 하나를 놓아 보자.'}:null;
}
function bridgePlan(height,getBlock){
 for(const [x,z] of [[7,8],[8,12],[-12,8],[12,3],[-12,12],[6,-8]]){
  const levels=Array.from({length:5},(_,i)=>height(x+i,z));
  if(levels.some(y=>!Number.isFinite(y))||Math.max(...levels)!==Math.min(...levels))continue;
  const y=levels[0]+1;
  let clear=true;
  for(let i=-1;i<=5;i++)for(let zz=z-1;zz<=z+1;zz++)for(let yy=y-1;yy<=y+3;yy++){
   const d=getBlock(x+i,yy,zz);
   if(d?.playerBuilt||d?.protectedPoi||['water','lava','fire','cactus'].includes(d?.type)||(yy>=y&&d))clear=false;
  }
  if(clear)return {anchors:[[x,y,z],[x+4,y,z]],cells:[[x+1,y,z],[x+2,y,z],[x+3,y,z]],end:[x+4,y+1,z]};
 }
 return null;
}
function bridgeReady(plan,getBlock){return !!plan&&plan.cells.every(p=>{const d=getBlock(...p);return d?.type==='planks'&&d.playerBuilt})}
function readJourney(value){
 if(!value||!['idle','build','cross','done','skip'].includes(value.phase))return {phase:'idle',plan:null};
 const p=value.plan,valid=p&&p.anchors?.length===2&&p.cells?.length===3&&p.end?.length===3&&[...p.anchors,...p.cells,p.end].every(a=>Array.isArray(a)&&a.length===3&&a.every(n=>Number.isInteger(n)&&Math.abs(n)<300));
 if(['build','cross'].includes(value.phase)&&!valid)return {phase:'idle',plan:null};
 return {phase:value.phase,plan:valid?p:null};
}
function readWorks(value){return Array.isArray(value)?value.filter(v=>v&&typeof v.name==='string'&&typeof v.photo==='string'&&/^data:image\/jpeg;base64,/.test(v.photo)&&v.photo.length<90000).slice(-6).map(v=>({name:v.name.slice(0,30),photo:v.photo,date:String(v.date||'').slice(0,24)})):[]}
window.CubeArchitectExperience={nextCorrection,bridgePlan,bridgeReady,readJourney,readWorks};
})();
