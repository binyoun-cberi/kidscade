(function(g){
'use strict';
const E=g.RuleLabEngine=g.RuleLabEngine||{};
function History(initial,max){this.max=Math.max(2,max||200);this.stack=[];this.cursor=-1;if(initial)this.push(initial)}
History.prototype.push=function(state){
 if(this.cursor<this.stack.length-1)this.stack=this.stack.slice(0,this.cursor+1);
 this.stack.push(E.State.clone(state));
 if(this.stack.length>this.max)this.stack.shift();
 this.cursor=this.stack.length-1;
};
History.prototype.undo=function(){
 if(this.cursor<=0)return null;
 this.cursor--;return E.State.clone(this.stack[this.cursor]);
};
History.prototype.redo=function(){
 if(this.cursor>=this.stack.length-1)return null;
 this.cursor++;return E.State.clone(this.stack[this.cursor]);
};
History.prototype.reset=function(){
 if(!this.stack.length)return null;
 const first=E.State.clone(this.stack[0]);
 this.stack=[E.State.clone(first)];this.cursor=0;return first;
};
History.prototype.current=function(){return this.cursor>=0?E.State.clone(this.stack[this.cursor]):null};
History.prototype.canUndo=function(){return this.cursor>0};
History.prototype.canRedo=function(){return this.cursor>=0&&this.cursor<this.stack.length-1};
E.History=History;
})(typeof window!=='undefined'?window:globalThis);
