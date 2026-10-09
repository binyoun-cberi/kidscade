/* Suspicious Midnight Diner — deterministic, browser/Node-compatible rules. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.MidnightDinerRules=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const FOODS=Object.freeze([
 {id:'pancake',title:'의문의 부침개',detail:'초록빛 부침개 · 8조각',banned:'seed',count:8,hazards:2,word:'붉은 씨앗',line:'식으면 맛없어. 천천히 살펴보진 말고.'},
 {id:'soup',title:'검은 국물 수프',detail:'국물 속 건더기 · 6개',banned:'mushroom',count:6,hazards:2,word:'달빛 버섯',line:'젓지 마. 속까지 보는 건 예의가 아니야.'},
 {id:'skewer',title:'다섯 조각 꼬치',detail:'수상한 꼬치 · 5조각',banned:'bean',count:5,hazards:2,word:'그림자 콩',line:'규칙이 있을 거야. 하지만 다 맞힐 필요는 없지.'}
]);
const INGREDIENTS=Object.freeze({
 seed:{name:'붉은 씨앗',clue:'작고 진한 붉은 점 세 개가 모여 있다.',safety:'붉은 점이 한곳에 세 개 모였는지 보세요.'},
 mushroom:{name:'달빛 버섯',clue:'보랏빛 반달 모양 갓과 두 줄 무늬가 있다.',safety:'보라색 반달 무늬를 찾으세요.'},
 bean:{name:'그림자 콩',clue:'파란빛 쌍둥이 점 두 개가 붙어 있다.',safety:'파란 점 한 개가 아니라 한 쌍인지 확인하세요.'}
});
function rng(seed){let s=(Number(seed)>>>0)||0x1234abcd;return()=>((s^=s<<13,s^=s>>>17,s^=s<<5)>>>0)/4294967296;}
function dishFor(index,rand){
 const spec=FOODS[index], ids=Array.from({length:spec.count},(_,i)=>i);
 for(let i=ids.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
 const dangerous=new Set(ids.slice(0,spec.hazards));
 // All dangerous zones have a consistent, visible sign; decoys may look similar but never copy the full sign.
 const zones=Array.from({length:spec.count},(_,i)=>({
   id:i,dangerous:dangerous.has(i),removed:false,inspected:false,
   garnish:Math.floor(rand()*4),rotation:rand()*6.28,shade:rand()
 }));
 return {spec,zones,eaten:0,successful:0,inspectionsLeft:2,asked:false};
}
function begin(seed){
 const value=seed===undefined?Math.floor(Math.random()*2147483647):seed;
 const rand=rng(value);
 const state={seed:value,course:0,health:100,hunger:70,suspicion:8,score:0,safeBites:0,
  dangers:0,rejections:0,discovered:[],turns:0,phase:'playing',ending:null,dish:dishFor(0,rand)};
 return state;
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
 const loss=status(state);
 if(loss){state.phase='finished';state.ending={won:false,title:'식당에 남겨진 손님',message:loss};return true;}
 return false;
}
function advance(state){
 if(evaluate(state))return;
 state.course++;
 if(state.course>=FOODS.length){
   const won=state.safeBites>=6;
   state.phase='finished';
   state.ending={won,title:won?'새벽 첫차':'빈 접시의 대가',
    message:won?'식당의 규칙을 읽어 내고 문밖으로 나왔다.':'식사를 너무 적게 했다. 문이 다시 잠긴다.'};
   if(won)state.score+=200;return;
 }
 state.hunger=limit(state.hunger-7);state.suspicion=limit(state.suspicion+4);
 if(evaluate(state))return;
 state.dish=dishFor(state.course,rng((state.seed+state.course*7919)>>>0));
}
function inspect(state,index){
 if(state.phase!=='playing')return {ok:false,message:'식사가 끝났습니다.'};
 const z=state.dish.zones[index];
 if(!z||z.removed)return {ok:false,message:'먹을 수 없는 부분입니다.'};
 if(z.inspected)return {ok:true,message:z.dangerous?'확인한 부분: 위험 재료가 있습니다.':'확인한 부분: 위험 재료가 없습니다.',free:true};
 if(state.dish.inspectionsLeft<=0)return {ok:false,message:'이 접시의 조사 기회가 없습니다.'};
 state.dish.inspectionsLeft--;state.suspicion+=5;z.inspected=true;state.turns++;
 if(z.dangerous&&!state.discovered.includes(state.dish.spec.banned))state.discovered.push(state.dish.spec.banned);
 evaluate(state);
 return {ok:true,dangerous:z.dangerous,message:z.dangerous?
   '위험! '+state.dish.spec.word+'의 특징이 보입니다.':'안전. 이 부분에서는 금지 재료가 발견되지 않았습니다.'};
}
function eat(state,index){
 if(state.phase!=='playing')return {ok:false,message:'식사가 끝났습니다.'};
 const dish=state.dish,z=dish.zones[index];
 if(!z||z.removed)return {ok:false,message:'이미 먹었거나 선택할 수 없는 부분입니다.'};
 z.removed=true;dish.eaten++;state.turns++;
 const dangerous=z.dangerous;
 if(dangerous){
  state.health-=32;state.hunger+=5;state.suspicion+=7;state.dangers++;
  if(!state.discovered.includes(dish.spec.banned))state.discovered.push(dish.spec.banned);
 }else{
  state.hunger+=13;state.score+=100;state.safeBites++;dish.successful++;
  state.suspicion=Math.max(0,state.suspicion-2);
 }
 evaluate(state);
 const finishedCourse=dish.eaten>=3;
 if(state.phase==='playing'&&finishedCourse)advance(state);
 return {ok:true,dangerous,finishedCourse,message:dangerous?
  '잘못 골랐다! '+dish.spec.word+'이(가) 섞여 있었다.':'안전한 한입. 하지만 요리사는 여전히 보고 있다.'};
}
function reject(state){
 if(state.phase!=='playing')return {ok:false,message:'식사가 끝났습니다.'};
 state.rejections++;state.hunger-=24;state.suspicion+=31;state.turns++;
 evaluate(state);
 if(state.phase==='playing')advance(state);
 return {ok:true,message:'접시를 밀어냈다. 요리사의 손이 잠시 멈춘다.'};
}
function question(state){
 if(state.phase!=='playing')return {ok:false,message:'식사가 끝났습니다.'};
 if(state.dish.asked)return {ok:false,message:'요리사는 더 대답하지 않는다.'};
 state.dish.asked=true;state.suspicion+=9;state.turns++;evaluate(state);
 const dangerous=state.dish.zones.filter(z=>z.dangerous);
 // True but incomplete — chef never asserts a false safety guarantee.
 return {ok:true,message:'요리사: “'+FOODS[state.course].word+'? 정확히 '+dangerous.length+'군데 넣었지.”'};
}
return {FOODS,INGREDIENTS,begin,inspect,eat,reject,question,advance,rng};
});
