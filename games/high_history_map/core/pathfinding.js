(function(global){
"use strict";
function MinHeap(){this.items=[];}
MinHeap.prototype.push=function(item){
  var a=this.items;a.push(item);var i=a.length-1;
  while(i>0){var p=(i-1)>>1;if(a[p].priority<=item.priority)break;a[i]=a[p];i=p;}
  a[i]=item;
};
MinHeap.prototype.pop=function(){
  var a=this.items;if(!a.length)return null;
  var root=a[0],last=a.pop();
  if(a.length){
    var i=0;
    while(true){
      var l=i*2+1,r=l+1,b=i,base=(b===i?last.priority:a[b].priority);
      if(l<a.length&&a[l].priority<base){b=l;base=a[l].priority;}
      if(r<a.length&&a[r].priority<base){b=r;base=a[r].priority;}
      if(b===i)break;
      a[i]=a[b];i=b;
    }
    a[i]=last;
  }
  return root;
};
MinHeap.prototype.size=function(){return this.items.length;};

function reachable(options){
  var start=options.start,startKey=options.keyOf(start),maxCost=options.maxCost;
  var costs=Object.create(null),out=Object.create(null),previous=Object.create(null),heap=new MinHeap();
  costs[startKey]=0;heap.push({node:start,key:startKey,cost:0,priority:0});
  while(heap.size()){
    var cur=heap.pop();
    if(cur.cost!==costs[cur.key])continue;
    var ns=options.neighbors(cur.node)||[];
    for(var i=0;i<ns.length;i++){
      var n=ns[i],nk=options.keyOf(n),cls=options.classify?options.classify(n,cur.node):null;
      if(cls&&cls.blocked)continue;
      var step=options.cost(n,cur.node),nextCost=cur.cost+step;
      if(!isFinite(step)||step>=99||nextCost>maxCost)continue;
      if(costs[nk]!=null&&costs[nk]<=nextCost)continue;
      costs[nk]=nextCost;previous[nk]=cur.key;
      var attack=!!(cls&&cls.attack),frontier=!!(cls&&cls.frontier),zoc=!!(cls&&cls.zoc),stop=!!(cls&&cls.stop);
      out[nk]={cost:nextCost,attack:attack,frontier:frontier,zoc:zoc,from:cur.key};
      if(!attack&&!frontier&&!stop)heap.push({node:n,key:nk,cost:nextCost,priority:nextCost});
    }
  }
  delete out[startKey];
  return{tiles:out,costs:costs,previous:previous};
}
function reconstruct(previous,startKey,targetKey){
  if(startKey===targetKey)return[startKey];
  if(!previous[targetKey])return[];
  var path=[targetKey],guard=0,cur=targetKey;
  while(cur!==startKey&&guard++<10000){cur=previous[cur];if(!cur)return[];path.push(cur);}
  path.reverse();return path;
}
global.UnificationWarPathfinding={MinHeap:MinHeap,reachable:reachable,reconstruct:reconstruct};
})(window);
