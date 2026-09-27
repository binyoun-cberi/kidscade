(function(g){
'use strict';
const E=g.RuleLabEngine=g.RuleLabEngine||{};
function isPushable(e,rules){return e.kind==='word'||E.Rules.hasProp(e.type,'PUSH',rules)}
function isStop(e,rules){return e.kind==='object'&&E.Rules.hasProp(e.type,'STOP',rules)}
function moveMutable(state,id,dx,dy,rules,moved,visiting){
 const e=state.entities.find(x=>x.id===id&&!x.dead);
 if(!e)return false;
 if(moved.has(id))return true;
 if(visiting.has(id))return false;
 const nx=e.x+dx,ny=e.y+dy;
 if(!E.State.inBounds(state,nx,ny))return false;
 visiting.add(id);
 const occupants=E.State.at(state,nx,ny,id).slice().sort((a,b)=>Number(isPushable(b,rules))-Number(isPushable(a,rules)));
 for(const other of occupants){
  if(isPushable(other,rules)){
   if(!moveMutable(state,other.id,dx,dy,rules,moved,visiting)){visiting.delete(id);return false}
  }else if(isStop(other,rules)){visiting.delete(id);return false}
 }
 const oldX=e.x,oldY=e.y;
 e.x=nx;e.y=ny;moved.add(id);visiting.delete(id);
 const bx=oldX-dx,by=oldY-dy;
 for(const tail of E.State.at(state,bx,by)){
  if(tail.kind==='object'&&E.Rules.hasProp(tail.type,'PULL',rules)){
   moveMutable(state,tail.id,dx,dy,rules,moved,new Set());
  }
 }
 return true;
}
function attemptMove(state,id,dx,dy,rules){
 const draft=E.State.clone(state),moved=new Set();
 const ok=moveMutable(draft,id,dx,dy,rules,moved,new Set());
 return {ok,state:ok?draft:state,movedIds:[...moved]};
}
function moveYou(state,dx,dy,rules){
 let work=E.State.clone(state),any=false;
 const you=work.entities.filter(e=>e.kind==='object'&&E.Rules.hasProp(e.type,'YOU',rules));
 you.sort((a,b)=>dx>0?b.x-a.x:dx<0?a.x-b.x:dy>0?b.y-a.y:a.y-b.y);
 const movedIds=new Set();
 for(const original of you){
  const attempt=attemptMove(work,original.id,dx,dy,rules);
  if(!attempt.ok)continue;
  work=attempt.state;any=true;attempt.movedIds.forEach(id=>movedIds.add(id));
  const controlled=work.entities.find(e=>e.id===original.id);
  if(controlled)controlled.facing={dx,dy};
 }
 return {state:any?work:state,moved:any,movedIds:[...movedIds]};
}
function autoMove(state,rules){
 let work=E.State.clone(state),changed=false;
 const moverIds=work.entities.filter(e=>e.kind==='object'&&E.Rules.hasProp(e.type,'MOVE',rules)).map(e=>e.id);
 for(const id of moverIds){
  let e=work.entities.find(x=>x.id===id);
  if(!e)continue;
  let f=e.facing||{dx:1,dy:0};
  if(!f.dx&&!f.dy)f={dx:1,dy:0};
  let a=attemptMove(work,id,f.dx,f.dy,rules);
  if(a.ok){work=a.state;changed=true;continue}
  e=work.entities.find(x=>x.id===id);if(e)e.facing={dx:-f.dx,dy:-f.dy};
  a=attemptMove(work,id,-f.dx,-f.dy,rules);
  if(a.ok){work=a.state;changed=true}
 }
 const fallIds=work.entities.filter(e=>e.kind==='object'&&E.Rules.hasProp(e.type,'FALL',rules)).map(e=>e.id);
 for(const id of fallIds){
  const a=attemptMove(work,id,0,1,rules);
  if(a.ok){work=a.state;changed=true}
 }
 return {state:work,changed};
}
E.Movement={attemptMove,moveYou,autoMove,isPushable,isStop};
})(typeof window!=='undefined'?window:globalThis);
