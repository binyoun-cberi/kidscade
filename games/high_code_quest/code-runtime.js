(function(){
'use strict';
function wait(ms){return new Promise(function(resolve){setTimeout(resolve,ms);});}
function countNodes(list){
 let n=0;
 (list||[]).forEach(function(node){n++;if(node.body)n+=countNodes(node.body);});
 return n;
}
function containsType(list,type){
 return (list||[]).some(function(node){return node.type===type||(node.body&&containsType(node.body,type));});
}
class CodeQuestRuntime{
 constructor(options){
  this.world=options.world;
  this.onEvent=options.onEvent||function(){};
  this.onError=options.onError||function(){};
  this.onDone=options.onDone||function(){};
  this.delay=options.delay||250;
  this.running=false;
  this.stopped=false;
  this.iterator=null;
  this.actions=0;
  this.maxActions=64;
  this.program=[];
  this.functionProgram=[];
 }
 prepare(program,functionProgram){
  this.program=program||[];
  this.functionProgram=functionProgram||[];
  this.actions=0;
  this.stopped=false;
  this.iterator=this.walk(this.program,0);
 }
 *walk(list,depth){
  if(depth>10)throw new Error('함수를 너무 깊게 불렀어요.');
  for(const node of list||[]){
   if(this.stopped)return;
   const def=(window.CodeQuestData&&window.CodeQuestData.blocks[node.type])||{};
   if(def.kind==='action'){
    yield {kind:'action',node:node};
   }else if(def.kind==='structure'){
    const times=def.count||2;
    for(let i=0;i<times;i++){
     yield {kind:'loop',node:node,index:i+1,total:times};
     yield* this.walk(node.body||[],depth+1);
    }
   }else if(def.kind==='condition'){
    const result=Boolean(this.world.checkCondition(def.condition));
    yield {kind:'check',node:node,result:result,condition:def.condition};
    if(result)yield* this.walk(node.body||[],depth+1);
   }else if(def.kind==='call'){
    yield {kind:'call',node:node};
    if(!this.functionProgram.length)throw new Error('나의 함수가 비어 있어요.');
    yield* this.walk(this.functionProgram,depth+1);
   }
  }
 }
 async nextAction(){
  if(!this.iterator)this.prepare(this.program,this.functionProgram);
  while(!this.stopped){
   let step;
   try{step=this.iterator.next();}catch(err){return this.fail(null,err.message||String(err));}
   if(step.done){
    if(this.world.isComplete()){
     this.stopped=true;this.onDone();return {done:true,complete:true};
    }
    return this.fail(null,'코드가 끝났지만 아직 임무가 끝나지 않았어요.');
   }
   const event=step.value;
   this.onEvent(event);
   if(event.kind!=='action')continue;
   this.actions++;
   if(this.actions>this.maxActions)return this.fail(event.node,'명령이 너무 많이 실행됐어요. 반복을 확인해 보세요.');
   const result=await this.world.applyAction(event.node.type);
   if(!result||result.ok===false)return this.fail(event.node,(result&&result.message)||'이 명령을 실행할 수 없어요.');
   const enemyResult=await this.world.afterPlayerAction();
   if(enemyResult&&enemyResult.defeat)return this.fail(event.node,'체력이 모두 떨어졌어요. 코드를 고쳐 다시 도전해 보세요.');
   if(this.world.isComplete()){
    this.stopped=true;this.onDone();return {done:true,complete:true};
   }
   return {done:false,action:true};
  }
  return {done:true,stopped:true};
 }
 async run(program,functionProgram){
  if(this.running)return;
  this.prepare(program,functionProgram);
  this.running=true;
  this.onEvent({kind:'run-start'});
  while(this.running&&!this.stopped){
   const result=await this.nextAction();
   if(result.done)break;
   await wait(this.delay);
  }
  this.running=false;
  this.onEvent({kind:'run-stop'});
 }
 async step(program,functionProgram){
  if(this.running)return;
  if(!this.iterator||this.stopped)this.prepare(program,functionProgram);
  this.running=true;
  this.onEvent({kind:'step-start'});
  const result=await this.nextAction();
  this.running=false;
  this.onEvent({kind:'step-stop'});
  return result;
 }
 stop(){
  this.stopped=true;
  this.running=false;
  this.onEvent({kind:'run-stop'});
 }
 fail(node,message){
  this.stopped=true;
  this.running=false;
  this.onError(node,message);
  return {done:true,error:true,message:message};
 }
}
window.CodeQuestRuntime={Runtime:CodeQuestRuntime,countNodes:countNodes,containsType:containsType};
})();