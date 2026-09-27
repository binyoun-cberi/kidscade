(function(g){
'use strict';
const R=g.RuleLabUI=g.RuleLabUI||{};
function Renderer(board,activeRules,data,assets){
 this.board=board;this.activeRules=activeRules;this.data=data;this.assets=assets||{};this.nodes=new Map();
 const grid=document.createElement('div');grid.className='grid-lines';grid.dataset.runtime='grid';board.appendChild(grid);this.grid=grid;
}
Renderer.prototype.tokenInfo=function(token){
 if(token==='EQ')return {kind:'operator',label:'='};
 if(token==='NEQ')return {kind:'operator',label:'≠'};
 if(token==='AND')return {kind:'operator',label:'그리고'};
 if(String(token).indexOf('N:')===0)return {kind:'noun',label:this.data.N[token.slice(2)]||token.slice(2)};
 if(String(token).indexOf('P:')===0)return {kind:'property',label:this.data.P[token.slice(2)]||token.slice(2)};
 return {kind:'noun',label:token};
};
Renderer.prototype.objectMarkup=function(e){
 if(e.type==='hero')return '<img alt="아이" src="'+this.assets.hero+'">';
 if(e.type==='rock')return '<img alt="돌" src="'+this.assets.rock+'">';
 return ({flag:'🚩',key:'🔑',door:'🚪',fire:'🔥'}[e.type])||'';
};
Renderer.prototype.render=function(state,rules,diff){
 const alive=new Set(),involved=new Set();
 (rules.rules||[]).forEach(r=>(r.ids||[]).forEach(id=>involved.add(id)));
 for(const e of state.entities){
  if(e.dead)continue;alive.add(e.id);
  let el=this.nodes.get(e.id);
  if(!el){
   el=document.createElement('div');el.dataset.entityId=e.id;this.nodes.set(e.id,el);this.board.appendChild(el);
  }
  el.className='entity '+e.kind+(e.kind==='object'?' '+e.type:'');
  el.style.setProperty('--x',e.x);el.style.setProperty('--y',e.y);
  if(e.kind==='word'){
   const inf=this.tokenInfo(e.token);el.classList.add(inf.kind);if(involved.has(e.id))el.classList.add('rule-active');
   const sig=e.token;
   if(el.dataset.content!==sig){el.innerHTML='';const tile=document.createElement('div');tile.className='word-tile';tile.textContent=inf.label;el.appendChild(tile);el.dataset.content=sig}
  }else{
   if(g.RuleLabEngine.Rules.hasProp(e.type,'YOU',rules))el.classList.add('you');
   const sig=e.type;
   if(el.dataset.content!==sig){el.innerHTML=this.objectMarkup(e);el.dataset.content=sig}
   el.setAttribute('aria-label',this.data.N[e.type]||e.type);
  }
 }
 for(const [id,el] of this.nodes)if(!alive.has(id)){el.remove();this.nodes.delete(id)}
 this.renderRules(rules,diff||{added:[],removed:[]});
};
Renderer.prototype.renderRules=function(rules,diff){
 const added=new Set(diff.added||[]);
 this.activeRules.innerHTML='';
 if(!rules.rules.length){this.activeRules.innerHTML='<div class="rule-empty">이어진 규칙 문장이 없어요.<br>단어를 밀어 새 법칙을 만들어 보세요.</div>';return}
 for(const r of rules.rules){
  const div=document.createElement('div');div.className='rule-chip compound'+(r.operator==='NEQ'?' negated':'');
  const pieces=[];
  for(const p of r.predicates){
   const k=r.subject+'|'+r.operator+'|'+p.kind+'|'+p.value;
   const label=p.kind==='property'?(this.data.P[p.value]||p.value):(this.data.N[p.value]||p.value);
   pieces.push('<span>'+label+'</span>');
   if(added.has(k))div.classList.add('new');
  }
  div.innerHTML='<span>'+(this.data.N[r.subject]||r.subject)+'</span><span class="eq">'+(r.operator==='NEQ'?'≠':'=')+'</span>'+pieces.join('<span class="and">그리고</span>');
  this.activeRules.appendChild(div);
 }
};
R.Renderer=Renderer;
})(typeof window!=='undefined'?window:globalThis);
