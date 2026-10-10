/* Midnight Diner v2 — deterministic rules, shared by browser and Node tests. */
(function(root,factory){
 const rules=factory();
 if(typeof module==='object'&&module.exports)module.exports=rules;
 else root.MidnightDinerRules=rules;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const FOODS=Object.freeze([
 {id:'pancake',title:'의문의 부침개',detail:'초록빛 부침개 · 8조각',banned:'seed',count:8,hazards:2,word:'붉은 씨앗',line:'식으면 맛없어. 천천히 살펴보진 말고.',glb:'pancakes-stack.glb'},
 {id:'soup',title:'검은 국물 수프',detail:'국물 속 건더기 · 6개',banned:'mushroom',count:6,hazards:2,word:'달빛 버섯',line:'국물을 젓지 마. 속을 들여다보는 건 실례야.',glb:'ramen.glb'},
 {id:'skewer',title:'다섯 조각 꼬치',detail:'수상한 꼬치 · 5조각',banned:'bean',count:5,hazards:2,word:'그림자 콩',line:'푸른 점이 전부 나쁜 건 아니지.',glb:'dango.glb'},
 {id:'dumpling',title:'봉인된 만두',detail:'얇은 피 속의 비밀 · 6개',banned:'thread',count:6,hazards:2,word:'검은 실뿌리',line:'만두에 꼭꼭 접힌 자국이 보이니?',glb:'gyoza.glb'},
 {id:'cake',title:'마지막 조각 케이크',detail:'은빛 가루를 뿌린 케이크 · 7조각',banned:'dust',count:7,hazards:3,word:'은빛 가루',line:'자정이 지나면 은빛이 더 잘 보인단다.',glb:'cupcake.glb'}
]);
const INGREDIENTS=Object.freeze({
 seed:{name:'붉은 씨앗',clue:'조리 과정에서 1개씩 올린 붉은 씨앗은 뒤집힌 부침개에 섞여 겉에서 확실히 드러나지 않는다.',safety:'조리 중 어느 번호에 붉은 씨앗이 들어갔나요?'},
 mushroom:{name:'달빛 버섯',clue:'조리 중 달빛 버섯을 집어 넣은 위치를 기억해야 한다. 국물을 저으면 색과 질감만으로는 알기 어렵다.',safety:'조리 중 버섯을 넣은 순서와 위치를 기억하세요.'},
 bean:{name:'그림자 콩',clue:'푸른 그림자 콩과 일반 양념은 굽고 나면 색이 비슷하다. 손에 든 재료를 먼저 확인해야 한다.',safety:'어느 꼬치에 파란 콩을 묻혔는지 기억하세요.'},
 thread:{name:'검은 실뿌리',clue:'특정 만두 속에만 검은 실뿌리가 들어간다. 쪄내면 겉모습으로는 알 수 없다.',safety:'만두를 만들 때 재료를 넣은 번호를 관찰하세요.'},
 dust:{name:'은빛 가루',clue:'은빛 가루는 굽고 나면 설탕가루처럼 보인다. 요리사가 뿌린 위치가 더 확실한 단서다.',safety:'가루를 뿌린 위치와 순서를 기억하세요.'}
});
function rng(seed){let s=(Number(seed)>>>0)||0x1234abcd;return()=>((s^=s<<13,s^=s>>>17,s^=s<<5)>>>0)/4294967296;}
function dishFor(index,rand){
 const spec=FOODS[index];if(!spec)throw new Error('Unknown diner course '+index);
 const ids=Array.from({length:spec.count},(_,i)=>i);
 for(let i=ids.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
 const dangerous=new Set(ids.slice(0,spec.hazards));
 const zones=Array.from({length:spec.count},(_,id)=>({
   id,dangerous:dangerous.has(id),removed:false,inspected:false,
   garnish:Math.floor(rand()*4),rotation:rand()*6.28,shade:rand()
 }));
 // Every plated zone has exactly one corresponding, observable cooking action.
 // Occlusion is infrequent, and never hides every dangerous addition.
 const sequence=ids.slice().reverse();
 const dangerEvents=sequence.filter(id=>dangerous.has(id));
 if(dangerEvents.every(id=>zones[id].shade<.18))zones[dangerEvents[0]].shade=.7;
 return {spec,zones,eaten:0,successful:0,inspectionsLeft:2,asked:false,
  cookOrder:sequence,cookIndex:0,observed:[],peekCount:0};
}
function begin(seed){
 const value=seed===undefined?Math.floor(Math.random()*2147483647):seed;
 return {seed:value,course:0,health:100,hunger:75,suspicion:8,score:0,safeBites:0,
 dangers:0,rejections:0,discovered:[],turns:0,phase:'cooking',ending:null,history:[],lastReview:null,
 dish:dishFor(0,rng(value))};
}
function limit(n){return Math.max(0,Math.min(100,n));}
function status(state){
 if(state.health<=0)return '체력이 바닥나 의식을 잃었다.';
 if(state.hunger<=0)return '허기를 견디지 못하고 쓰러졌다.';
 if(state.suspicion>=100)return '요리사가 당신의 식사를 중단시켰다.';
 return '';
}
function evaluate(state){
 state.health=limit(state.health);state.hunger=limit(state.hunger);state.suspicion=limit(state.suspicion);
 const failure=status(state);
 if(failure){state.phase='finished';state.ending={won:false,title:'식당에 남겨진 손님',message:failure};return true;}
 return false;
}
function review(state,dish,wasRejected){
 const detail={
  course:state.course,title:dish.spec.title,banned:dish.spec.banned,rejected:!!wasRejected,
  safe: dish.successful,misses:dish.zones.filter(z=>z.removed&&z.dangerous).length,
  dangerousZones:dish.zones.filter(z=>z.dangerous).map(z=>z.id+1),
  inspectedZones:dish.zones.filter(z=>z.inspected).map(z=>z.id+1),
  clue:INGREDIENTS[dish.spec.banned].clue
 };
 state.lastReview=detail;state.history.push(detail);
 if(!state.discovered.includes(dish.spec.banned))state.discovered.push(dish.spec.banned);
 return detail;
}
function advance(state,wasRejected){
 if(state.phase!=='playing')return null;
 const last=review(state,state.dish,wasRejected);
 if(!wasRejected&&last.safe===3){state.score+=60;last.bonus=60;}
 state.course++;
 if(state.course>=FOODS.length){
   const won=state.safeBites>=10;
   state.phase='finished';
   state.ending={
    won,title:won?'새벽 첫차':'빈 접시의 대가',
    message:won?'다섯 접시의 규칙을 읽어 내고 식당 문밖으로 나왔다.':'식사를 충분히 하지 못했다. 문이 다시 잠긴다.'
   };
   if(won)state.score+=250;
   return last;
 }
 state.hunger=limit(state.hunger-5);state.suspicion=limit(state.suspicion+5);
 if(evaluate(state))return last;
 state.dish=dishFor(state.course,rng((state.seed+state.course*7919)>>>0));
 state.phase='cooking';
 return last;
}
function cookingEvent(state){
 if(state.phase!=='cooking')return null;
 const dish=state.dish,id=dish.cookOrder[dish.cookIndex];
 if(id===undefined)return null;
 return {index:dish.cookIndex,total:dish.cookOrder.length,zone:id+1,course:state.course};
}
function peekCooking(state){
 if(state.phase!=='cooking')return {ok:false,message:'지금은 볼 수 없습니다.'};
 const dish=state.dish,id=dish.cookOrder[dish.cookIndex],z=dish.zones[id];
 if(dish.currentPeek)return {...dish.currentPeek,free:true};
 dish.peekCount++;state.turns++;
 state.suspicion+=dish.peekCount<=3?2:5;
 const concealed=z.shade<.18,ingredient=concealed?'가려진 재료':z.dangerous?dish.spec.word:'일반 양념';
 const result={ok:true,zone:id+1,concealed,ingredient,
  message:concealed?(id+1)+'번을 살폈지만 손에 가려졌다.':
  (id+1)+'번에 '+ingredient+'을(를) 넣는 모습을 봤다.'};
 dish.currentPeek=result;
 if(!concealed)dish.observed.push({zone:id+1,ingredient,dangerous:z.dangerous});
 evaluate(state);
 return result;
}
function observeCooking(state,looking){
 if(state.phase!=='cooking')return {ok:false,message:'현재 조리 중이 아닙니다.'};
 const dish=state.dish,id=dish.cookOrder[dish.cookIndex],z=dish.zones[id];
 if(looking&&!dish.currentPeek)peekCooking(state);
 if(state.phase==='finished')return {ok:false,message:'요리사가 당신을 돌려보냈습니다.'};
 const observation=dish.currentPeek;
 dish.cookIndex++;dish.currentPeek=null;
 if(dish.cookIndex>=dish.cookOrder.length)state.phase='playing';
 return {ok:true,zone:id+1,looking:!!observation,concealed:!!observation?.concealed,
  message:observation?.message||((id+1)+'번에 재료가 들어갔지만 무엇인지는 보지 못했다.'),
  finishedCooking:state.phase==='playing'};
}

function inspect(state,index){
 if(state.phase!=='playing')return {ok:false,message:'식사가 끝났습니다.'};
 const z=state.dish.zones[index];
 if(!z||z.removed)return {ok:false,message:'먹을 수 없는 부분입니다.'};
 if(z.inspected)return {ok:true,message:'전에 조사한 부분입니다. 기록한 냄새를 다시 확인하세요.',free:true};
 if(state.dish.inspectionsLeft<=0)return {ok:false,message:'이 접시의 조사 기회가 없습니다.'};
 state.dish.inspectionsLeft--;state.suspicion+=6;state.turns++;z.inspected=true;
 evaluate(state);
 // No exact answer on inspection; a noisy but useful secondary clue.
 const strong=z.dangerous?z.garnish!==0:z.garnish===0;
 return {ok:true,strong,message:strong?
 '향이 진하고 평소와 다른 질감이 느껴진다. 하지만 확실하지 않다.':
 '냄새가 약하고 다른 조각과 비슷하다. 단정할 수는 없다.'};
}
function eat(state,index){
 if(state.phase!=='playing')return {ok:false,message:'식사가 끝났습니다.'};
 const dish=state.dish,z=dish.zones[index];
 if(!z||z.removed)return {ok:false,message:'이미 먹었거나 선택할 수 없는 부분입니다.'};
 z.removed=true;dish.eaten++;state.turns++;
 const dangerous=z.dangerous;
 if(dangerous){
  state.health-=33;state.hunger+=6;state.suspicion+=8;state.dangers++;
  if(!state.discovered.includes(dish.spec.banned))state.discovered.push(dish.spec.banned);
 }else{
  state.hunger+=11;state.score+=100;state.safeBites++;dish.successful++;
  state.suspicion=Math.max(0,state.suspicion-2);
 }
 evaluate(state);
 const finishedCourse=dish.eaten>=3;
 const courseReview=(finishedCourse&&state.phase==='playing')?advance(state,false):null;
 return {ok:true,dangerous,finishedCourse,courseReview,message:dangerous?
  '잘못 골랐다! '+dish.spec.word+'이(가) 섞여 있었다.':'안전한 한입. 하지만 요리사는 여전히 보고 있다.'};
}
function reject(state){
 if(state.phase!=='playing')return {ok:false,message:'식사가 끝났습니다.'};
 state.rejections++;state.hunger-=22;state.suspicion+=31;state.turns++;
 evaluate(state);
 const courseReview=state.phase==='playing'?advance(state,true):null;
 return {ok:true,finishedCourse:true,courseReview,message:'접시를 밀어냈다. 요리사의 손이 잠시 멈춘다.'};
}
function question(state){
 if(state.phase!=='playing')return {ok:false,message:'식사가 끝났습니다.'};
 const dish=state.dish;
 if(dish.asked)return {ok:false,message:'요리사는 더 대답하지 않는다.'};
 dish.asked=true;state.suspicion+=10;state.turns++;evaluate(state);
 const half=Math.ceil(dish.spec.count/2);
 const inFirst=dish.zones.filter(z=>z.id<half&&z.dangerous).length;
 return {ok:true,half,count:inFirst,message:'요리사: “처음 '+half+'조각에는 위험한 것이 '+inFirst+'개 있지. 세어 봐.”'};
}
return {FOODS,INGREDIENTS,begin,inspect,eat,reject,question,advance,rng,dishFor,cookingEvent,peekCooking,observeCooking};
});
