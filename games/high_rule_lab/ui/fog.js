(function(g){
'use strict';
const UI=g.RuleLabUI=g.RuleLabUI||{};
function Fog(board){
 this.board=board;this.cells=[];this.width=0;this.height=0;this.visited=new Set();
 this.enabled=false;this.layer=document.createElement('div');
 this.layer.className='exploration-fog';this.layer.setAttribute('aria-hidden','true');
 this.layer.dataset.runtime='fog';board.appendChild(this.layer);
}
Fog.prototype.reset=function(width,height,enabled){
 this.width=width;this.height=height;this.enabled=Boolean(enabled);
 this.visited.clear();this.layer.textContent='';this.cells=[];
 this.layer.hidden=!this.enabled;
 if(!this.enabled)return;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const cell=document.createElement('div');cell.className='fog-cell unseen';
  cell.style.setProperty('--x',x);cell.style.setProperty('--y',y);
  this.layer.appendChild(cell);this.cells.push(cell);
 }
};
Fog.prototype.toggle=function(value){
 const enabled=Boolean(value);
 if(enabled&&this.cells.length===0)this.reset(this.width,this.height,true);
 this.enabled=enabled;this.layer.hidden=!enabled;
};
Fog.prototype.visible=function(x,y,state,rules){
 return (state.entities||[]).some(e=>e.kind==='object'&&!e.dead&&
  g.RuleLabEngine.Rules.hasProp(e.type,'YOU',rules)&&
  Math.abs(e.x-x)+Math.abs(e.y-y)<=2);
};
Fog.prototype.render=function(state,rules){
 if(!this.enabled)return;
 const active=[];
 for(const e of state.entities||[])if(e.kind==='object'&&!e.dead&&g.RuleLabEngine.Rules.hasProp(e.type,'YOU',rules))active.push(e);
 for(let y=0;y<this.height;y++)for(let x=0;x<this.width;x++){
  const idx=y*this.width+x,cell=this.cells[idx],key=x+','+y;
  const lit=active.some(e=>Math.abs(e.x-x)+Math.abs(e.y-y)<=2);
  if(lit)this.visited.add(key);
  cell.className='fog-cell '+(lit?'visible':this.visited.has(key)?'seen':'unseen');
 }
};
UI.Fog=Fog;
})(typeof window!=='undefined'?window:globalThis);