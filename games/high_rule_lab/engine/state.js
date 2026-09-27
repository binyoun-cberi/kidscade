(function(g){
'use strict';
const E=g.RuleLabEngine=g.RuleLabEngine||{};
function clone(v){return JSON.parse(JSON.stringify(v))}
function normalizeFacing(e){
 if(e&&e.facing&&Number.isFinite(e.facing.dx)&&Number.isFinite(e.facing.dy))return {dx:e.facing.dx,dy:e.facing.dy};
 if(e&&Number.isFinite(e.dir))return {dx:e.dir||1,dy:0};
 return {dx:1,dy:0};
}
function fromLevel(src){
 let n=0;
 const all=[].concat(src.objects||[],src.words||[]);
 const entities=all.map(raw=>{
  const e=clone(raw);
  e.id=e.id||('e'+(++n));
  e.kind=e.kind||(e.token?'word':'object');
  e.facing=normalizeFacing(e);
  delete e.dir;
  return e;
 });
 return {w:src.w,h:src.h,entities,moves:0,status:'playing',turn:0};
}
function key(x,y){return x+','+y}
function cells(state){
 const map=new Map();
 for(const e of state.entities||[]){
  if(e.dead)continue;
  const k=key(e.x,e.y);
  if(!map.has(k))map.set(k,[]);
  map.get(k).push(e);
 }
 return map;
}
function at(state,x,y,excludeId){
 return (state.entities||[]).filter(e=>!e.dead&&e.id!==excludeId&&e.x===x&&e.y===y);
}
function inBounds(state,x,y){return x>=0&&y>=0&&x<state.w&&y<state.h}
function serialize(state){
 const copy=clone(state);
 copy.entities=(copy.entities||[]).slice().sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 return JSON.stringify(copy);
}
function makeId(state,prefix){
 prefix=prefix||'e';
 let i=1,id='';
 const used=new Set((state.entities||[]).map(e=>e.id));
 do{id=prefix+i++;}while(used.has(id));
 return id;
}
E.State={clone,fromLevel,key,cells,at,inBounds,serialize,makeId};
})(typeof window!=='undefined'?window:globalThis);
