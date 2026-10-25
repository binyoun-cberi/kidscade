(function(g){
'use strict';
const E=g.RuleLabEngine=g.RuleLabEngine||{};
const EXTRA_PROPS=new Set(['PULL','FALL']);
function validateLevel(level,data,index){
 const errors=[],warnings=[],label='stage '+((index||0)+1);
 if(!Number.isInteger(level.w)||!Number.isInteger(level.h)||level.w<3||level.h<3)errors.push(label+': invalid board size');
 const arrays=[['objects',level.objects||[]],['words',level.words||[]]];
 const seenIds=new Set();
 for(const pair of arrays){
  for(const e of pair[1]){
   if(!Number.isInteger(e.x)||!Number.isInteger(e.y)||e.x<0||e.y<0||e.x>=level.w||e.y>=level.h)errors.push(label+': out of bounds '+e.x+','+e.y);
   if(e.id){if(seenIds.has(e.id))errors.push(label+': duplicate id '+e.id);seenIds.add(e.id)}
   if(pair[0]==='objects'&&e.kind==='word')warnings.push(label+': word stored in objects array at '+e.x+','+e.y);
   if(e.kind==='word'||e.token){
    const t=String(e.token||'');
    if(t==='EQ'||t==='NEQ'||t==='AND')continue;
    if(t.indexOf('N:')===0){if(!data.N[t.slice(2)])errors.push(label+': unknown noun '+t);continue}
    if(t.indexOf('P:')===0){const p=t.slice(2);if(!data.P[p]&&!EXTRA_PROPS.has(p))errors.push(label+': unknown property '+t);continue}
    errors.push(label+': unknown token '+t);
   }else if(e.type&&!data.N[e.type])errors.push(label+': unknown object '+e.type);
  }
 }
 try{
  const s=E.State.fromLevel(level),r=E.Rules.parse(s);
  if(!Object.keys(r.props).some(k=>r.props[k].has('YOU')))warnings.push(label+': starts without YOU');
 }catch(err){errors.push(label+': runtime normalization failed '+err.message)}
 return {errors,warnings};
}
function validateAll(levels,data){
 const errors=[],warnings=[];
 (levels||[]).forEach((l,i)=>{const r=validateLevel(l,data,i);errors.push(...r.errors);warnings.push(...r.warnings)});
 return {errors,warnings};
}

function analyzeTopology(level){
 const wall=new Set((level.objects||[]).filter(e=>e.type==='wall').map(e=>e.x+','+e.y));
 const hero=(level.objects||[]).find(e=>e.type==='hero');
 if(!hero)return {reachable:0,branches:0,deadEnds:0,upper:false,lower:false,wordAccess:0,shortestFlag:null};
 const key=(x,y)=>x+','+y;
 const origin=key(hero.x,hero.y),q=[{x:hero.x,y:hero.y,d:0}],seen=new Set([origin]);
 const goal=new Set((level.objects||[]).filter(e=>e.type==='flag').map(e=>key(e.x,e.y)));
 let branches=0,deadEnds=0,shortestFlag=null;
 for(let i=0;i<q.length;i++){
  const {x,y,d}=q[i],next=[];
  if(goal.has(key(x,y))&&shortestFlag===null)shortestFlag=d;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,ny=y+dy,k=key(nx,ny);
   if(nx<0||ny<0||nx>=level.w||ny>=level.h||wall.has(k))continue;
   next.push(k);
   if(!seen.has(k)){seen.add(k);q.push({x:nx,y:ny,d:d+1})}
  }
  if(next.length>=3)branches++;
  if(next.length<=1)deadEnds++;
 }
 const accessibleWord=(level.words||[]).filter(w=>
  [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen.has(key(w.x+dx,w.y+dy)))
 ).length;
 return {reachable:seen.size,branches,deadEnds,
  upper:q.some(p=>p.y<=3),lower:q.some(p=>p.y>=7),
  wordAccess:accessibleWord,totalWords:(level.words||[]).length,shortestFlag};
}
function auditLayouts(levels){
 const map=new Map(),details=(levels||[]).map((l,i)=>{
  const topology=analyzeTopology(l);
  const signature=(l.objects||[]).filter(e=>e.type==='wall').map(e=>e.x+','+e.y).sort().join(';');
  map.set(signature,(map.get(signature)||0)+1);
  return {stage:i+1,title:l.title,chapter:l.chapter,...topology};
 });
 return {levels:details.length,uniqueWallLayouts:map.size,
  upperReachable:details.filter(x=>x.upper).length,lowerReachable:details.filter(x=>x.lower).length,
  meanBranches:details.reduce((a,x)=>a+x.branches,0)/(details.length||1),
  details};
}
E.Validator={validateLevel,validateAll,analyzeTopology,auditLayouts};
})(typeof window!=='undefined'?window:globalThis);
