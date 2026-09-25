(function(){
'use strict';
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
function countNodes(list){
 let n=0;
 (list||[]).forEach(node=>{
  n++;
  if(node.body)n+=countNodes(node.body);
  if(node.elseBody)n+=countNodes(node.elseBody);
 });
 return n;
}
function containsType(list,type){
 return (list||[]).some(node=>node.type===type||
   (node.body&&containsType(node.body,type))||
   (node.elseBody&&containsType(node.elseBody,type)));
}
class CodeQuestRuntime{
 constructor(options){
  this.world=options.world;
  this.onEvent=options.onEvent||function(){};
  this.onError=options.onError||function(){};
  this.onDone=options.onDone||function(){};
  this.delay=options.delay||180;
  this.running=false;this.stopped=false;this.iterator=null;
  this.actions=0;this.maxActions=140;this.program=[];this.functionProgram=[];
 }
 setDelay(ms){this.delay=Math.max(0,Number(ms)||0);}
 prepare(program,functionProgram){
  this.program=program||[];this.functionProgram=functionProgram||[];
  this.actions=0;this.stopped=false;this.iterator=this.walk(this.program,0);
 }
 *walk(list,depth){
  if(depth>12)throw new Error('함수를 너무 깊게 불렀어요.');
  for(const node of list||[]){
   if(this.stopped)return;
   const def=(window.CodeQuestData&&window.CodeQuestData.blocks[node.type])||{};
   if(def.kind==='action'){
    yield {kind:'action',node};
   }else if(def.kind==='structure'){
    const times=def.count||2;
    for(let i=0;i<times;i++){
     yield {kind:'loop',node,index:i+1,total:times};
     yield* this.walk(node.body||[],depth+1);
    }
   }else if(def.kind==='condition'){
    const result=Boolean(this.world.checkCondition(def.condition));
    yield {kind:'check',node,result,condition:def.condition};
    if(result)yield* this.walk(node.body||[],depth+1);
    else if(node.elseBody&&node.elseBody.length){
     yield {kind:'else',node};
     yield* this.walk(node.elseBody,depth+1);
    }
   }else if(def.kind==='call'){
    yield {kind:'call',node};
    if(!this.functionProgram.length)throw new Error('나의 기술이 비어 있어요.');
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
    return this.fail(null,'프로그램이 끝났지만 아직 목적지에 도착하지 못했어요.');
   }
   const event=step.value;
   this.onEvent(event);
   if(event.kind!=='action')continue;
   this.actions++;
   if(this.actions>this.maxActions)return this.fail(event.node,'같은 행동이 너무 오래 반복되고 있어요. 코드를 확인해 보세요.');
   const result=await this.world.applyAction(event.node.type);
   if(!result||result.ok===false)return this.fail(event.node,(result&&result.message)||'이 명령을 실행할 수 없어요.');
   if(result.checkpoint)this.onEvent({kind:'checkpoint',name:result.checkpoint});
   if(Array.isArray(result.events))result.events.forEach(e=>this.onEvent({kind:'world-event',...e}));
   const enemyResult=await this.world.afterPlayerAction(event.node.type);
   if(enemyResult&&enemyResult.event)this.onEvent({kind:'enemy-event',...enemyResult.event});
   if(enemyResult&&enemyResult.defeat)return this.fail(event.node,'체력이 모두 떨어졌어요. 장비와 코드를 바꿔 다시 도전해 보세요.');
   if(this.world.isComplete()){
    this.stopped=true;this.onDone();return {done:true,complete:true};
   }
   return {done:false,action:true};
  }
  return {done:true,stopped:true};
 }
 async run(program,functionProgram){
  if(this.running)return;
  this.prepare(program,functionProgram);this.running=true;this.onEvent({kind:'run-start'});
  while(this.running&&!this.stopped){
   const result=await this.nextAction();
   if(result.done)break;
   await wait(this.delay);
  }
  this.running=false;this.onEvent({kind:'run-stop'});
 }
 async step(program,functionProgram){
  if(this.running)return;
  if(!this.iterator||this.stopped)this.prepare(program,functionProgram);
  this.running=true;this.onEvent({kind:'step-start'});
  const result=await this.nextAction();
  this.running=false;this.onEvent({kind:'step-stop'});
  return result;
 }
 stop(){this.stopped=true;this.running=false;this.onEvent({kind:'run-stop'});}
 fail(node,message){
  this.stopped=true;this.running=false;this.onError(node,message);
  return {done:true,error:true,message};
 }
}
window.CodeQuestRuntime={Runtime:CodeQuestRuntime,countNodes,containsType};
})();