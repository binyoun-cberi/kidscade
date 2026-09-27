(function(g){
'use strict';
const E=g.RuleLabEngine=g.RuleLabEngine||{};
function tokenKind(token){
 if(token==='EQ'||token==='NEQ'||token==='AND')return 'operator';
 if(String(token||'').indexOf('N:')===0)return 'noun';
 if(String(token||'').indexOf('P:')===0)return 'property';
 return 'unknown';
}
function wordsAt(state,x,y){
 return E.State.at(state,x,y).filter(e=>e.kind==='word');
}
function predicate(token){
 if(String(token).indexOf('P:')===0)return {kind:'property',value:token.slice(2)};
 if(String(token).indexOf('N:')===0)return {kind:'transform',value:token.slice(2)};
 return null;
}
function parse(state){
 const found=[];
 const seen=new Set();
 const words=(state.entities||[]).filter(e=>!e.dead&&e.kind==='word');
 const dirs=[[1,0,'horizontal'],[0,1,'vertical']];
 for(const start of words){
  if(tokenKind(start.token)!=='noun')continue;
  const subject=start.token.slice(2);
  for(const d of dirs){
   const ops=wordsAt(state,start.x+d[0],start.y+d[1]).filter(e=>e.token==='EQ'||e.token==='NEQ');
   for(const op of ops){
    const first=wordsAt(state,start.x+d[0]*2,start.y+d[1]*2);
    for(const p0 of first){
     const pred0=predicate(p0.token);
     if(!pred0)continue;
     const predicates=[pred0],ids=[start.id,op.id,p0.id];
     let step=3;
     while(true){
      const ands=wordsAt(state,start.x+d[0]*step,start.y+d[1]*step).filter(e=>e.token==='AND');
      if(!ands.length)break;
      const next=wordsAt(state,start.x+d[0]*(step+1),start.y+d[1]*(step+1));
      const np=next.find(e=>predicate(e.token));
      if(!np)break;
      predicates.push(predicate(np.token));ids.push(ands[0].id,np.id);step+=2;
     }
     const sig=subject+'|'+op.token+'|'+predicates.map(p=>p.kind+':'+p.value).join('&')+'|'+d[2]+'|'+start.x+','+start.y;
     if(seen.has(sig))continue;
     seen.add(sig);
     found.push({subject,operator:op.token,predicates,axis:d[2],ids});
    }
   }
  }
 }
 const props={},transforms={},negative={};
 const add=(box,k,v)=>{if(!box[k])box[k]=new Set();box[k].add(v)};
 for(const r of found){
  for(const p of r.predicates){
   if(p.kind==='property'){
    if(r.operator==='NEQ')add(negative,r.subject,p.value);else add(props,r.subject,p.value);
   }else if(p.kind==='transform'&&r.operator==='EQ')add(transforms,r.subject,p.value);
  }
 }
 for(const subject of Object.keys(negative)){
  if(!props[subject])continue;
  for(const p of negative[subject])props[subject].delete(p);
 }
 return {rules:found,props,transforms,negative};
}
function hasProp(type,prop,rules){return !!(rules&&rules.props[type]&&rules.props[type].has(prop))}
function flatSignatures(parsed){
 const out=[];
 for(const r of parsed.rules||[]){
  for(const p of r.predicates)out.push(r.subject+'|'+r.operator+'|'+p.kind+'|'+p.value);
 }
 return out.sort();
}
function diff(before,after){
 const a=new Set(flatSignatures(before)),b=new Set(flatSignatures(after));
 return {added:[...b].filter(x=>!a.has(x)),removed:[...a].filter(x=>!b.has(x))};
}
E.Rules={parse,hasProp,diff,tokenKind,flatSignatures};
})(typeof window!=='undefined'?window:globalThis);
