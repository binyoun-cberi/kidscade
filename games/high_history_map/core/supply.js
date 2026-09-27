(function(global){
"use strict";
function buildSupplyMap(options){
  var costs=Object.create(null),heap=new global.UnificationWarPathfinding.MinHeap();
  (options.sources||[]).forEach(function(s){
    var k=options.keyOf(s);
    if(costs[k]===0)return;
    costs[k]=0;heap.push({node:s,key:k,cost:0,priority:0});
  });
  while(heap.size()){
    var cur=heap.pop();
    if(cur.cost!==costs[cur.key])continue;
    var ns=options.neighbors(cur.node)||[];
    for(var i=0;i<ns.length;i++){
      var n=ns[i],nk=options.keyOf(n);
      if(options.passable&&!options.passable(n,cur.node))continue;
      var step=options.cost(n,cur.node),nc=cur.cost+step;
      if(!isFinite(step)||nc>options.maxCost)continue;
      if(costs[nk]!=null&&costs[nk]<=nc)continue;
      costs[nk]=nc;heap.push({node:n,key:nk,cost:nc,priority:nc});
    }
  }
  return costs;
}
function statusForCost(cost){
  if(cost==null||!isFinite(cost)||cost>10)return{key:"isolated",name:"고립",attack:.85,defense:.90};
  if(cost>6)return{key:"strained",name:"불안",attack:.95,defense:.96};
  return{key:"good",name:"원활",attack:1,defense:1};
}
global.UnificationWarSupply={buildSupplyMap:buildSupplyMap,statusForCost:statusForCost};
})(window);
