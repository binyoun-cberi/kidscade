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
E.Validator={validateLevel,validateAll};
})(typeof window!=='undefined'?window:globalThis);
