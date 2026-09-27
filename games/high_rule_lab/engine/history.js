(function(g){
'use strict';
const E=g.RuleLabEngine=g.RuleLabEngine||{};
function History(initial,max){
 this.max=max||200;this.stack=[];if(initial)this.push(initial);
}
History.prototype.push=function(state){
 this.stack.push(E.State.clone(state));
 if(this.stack.length>this.max)this.stack.shift();
};
History.prototype.undo=function(){
 if(this.stack.length<=1)return null;
 this.stack.pop();
 return E.State.clone(this.stack[this.stack.length-1]);
};
History.prototype.reset=function(){
 if(!this.stack.length)return null;
 const first=E.State.clone(this.stack[0]);this.stack=[E.State.clone(first)];return first;
};
History.prototype.current=function(){return this.stack.length?E.State.clone(this.stack[this.stack.length-1]):null};
E.History=History;
})(typeof window!=='undefined'?window:globalThis);
