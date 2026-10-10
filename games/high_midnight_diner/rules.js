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
 seed:{name:'붉은 씨앗',clue:'붉은 점이 세 개 모여 있으면 위험. 한 점은 안전한 장식.',safety:'붉은 점이 세 개인가요?'},
 mushroom:{name:'달빛 버섯',clue:'보라색 반달 갓과 평행한 두 줄 무늬. 일반 버섯은 갈색.',safety:'보라색 반달과 두 줄을 찾으세요.'},
 bean:{name:'그림자 콩',clue:'파란 점 두 개가 붙어 있으면 위험. 초록 점 한 개는 안전.',safety:'파란 점 두 개인가요?'},
 thread:{name:'검은 실뿌리',clue:'만두 주름 위에 검은 실선 세 줄. 일반 만두는 갈색 접힘.',safety:'주름 위 검은 실선이 세 개인지 확인하세요.'},
 dust:{name:'은빛 가루',clue:'케이크 위에 은색 마름모 네 개. 갈색 부스러기 하나는 안전.',safety:'은색 마름모가 네 개인가요?'}
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
 return {spec,zones,eaten:0,successful:0,inspectionsLeft:2,asked:false};
}
function begin(seed){
 const value=seed===undefined?Math.floor(Math.random()*2147483647):seed;
 return {seed:value,course:0,health:100,hunger:75,suspicion:8,score:0,safeBites:0,
 dangers:0,rejections:0,discovered:[],turns:0,phase:'playing',ending:null,history:[],lastReview:null,
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
 return last;
}
function inspect(state,index){
 if(state.phase!=='playing')return {ok:false,message:'식사가 끝났습니다.'};
 const z=state.dish.zones[index];
 if(!z||z.removed)return {ok:false,message:'먹을 수 없는 부분입니다.'};
 if(z.inspected)return {ok:true,message:z.dangerous?'이전에 확인한 위험 재료입니다.':'이전에 확인한 안전한 부분입니다.',free:true,dangerous:z.dangerous};
 if(state.dish.inspectionsLeft<=0)return {ok:false,message:'이 접시의 조사 기회가 없습니다.'};
 state.dish.inspectionsLeft--;state.suspicion+=6;state.turns++;z.inspected=true;
 if(z.dangerous&&!state.discovered.includes(state.dish.spec.banned))state.discovered.push(state.dish.spec.banned);
 evaluate(state);
 return {ok:true,dangerous:z.dangerous,message:z.dangerous?
 '위험! '+state.dish.spec.word+'의 결정적인 특징이 보입니다.':'안전. 이 부분에서는 금지 재료가 발견되지 않았습니다.'};
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
return {FOODS,INGREDIENTS,begin,inspect,eat,reject,question,advance,rng,dishFor};
});
