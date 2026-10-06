/* Pure first-day lesson rules. World edits and controls stay in the runtime. */
(()=>{
'use strict';
const SHELTER=[[ -4,3,3],[-4,4,3],[-4,5,3],[-3,3,2],[-3,4,2],[-3,5,3]];
const STEPS=[
 {id:'walk',title:'나무 앞으로 가 보자',text:'노란 고리까지 걸어가 보자.',action:'walk'},
 {id:'wood',title:'원목을 모아 보자',text:'나무 줄기에서 원목 3개를 얻어 보자.',action:'harvest',type:'log'},
 {id:'bag',title:'가방을 열어 보자',text:'모은 원목이 가방에 들어 있어.',action:'bag'},
 {id:'planks',title:'나무를 판자로 바꿔 보자',text:'나무 판자를 고르고 만들기를 눌러 보자.',recipe:'planks'},
 {id:'benchCraft',title:'제작대를 만들어 보자',text:'판자 4개로 제작대를 만들 수 있어.',recipe:'workbench'},
 {id:'benchPlace',title:'제작대를 놓아 보자',text:'제작대를 고른 뒤 빈 땅에 놓아 보자.',action:'place',type:'workbench'},
 {id:'morePlanks',title:'도구에 쓸 판자를 만들자',text:'제작대 옆에서 판자를 4개 준비해 보자.',recipe:'planks'},
 {id:'sticks',title:'곡괭이 손잡이를 만들자',text:'판자 1개로 막대 4개를 만들 수 있어.',recipe:'sticks'},
 {id:'pick',title:'나무 곡괭이를 만들자',text:'판자 3개와 막대 2개를 모아 곡괭이를 만들자.',recipe:'woodPick'},
 {id:'stone',title:'곡괭이로 돌을 캐 보자',text:'곡괭이를 고르고 돌 하나를 캐 보자.',action:'harvest',type:'stone'},
 {id:'shelter',title:'작은 쉼터를 지어 보자',text:'판자나 흙을 골라 노란 테두리를 하나씩 채워 보자.',action:'shelter',type:'planks'},
 {id:'inside',title:'쉼터 안으로 들어가 보자',text:'노란 고리 안에 서서 지붕 아래를 살펴보자.',action:'inside'},
 {id:'ownWood',title:'이번에는 혼자 원목을 얻어 보자',text:'원하는 나무에서 원목 하나를 얻어 보자.',action:'harvest',type:'log',independent:true},
 {id:'ownPlanks',title:'모은 원목으로 판자를 만들자',text:'가방을 열고 판자를 한 번 만들어 보자.',recipe:'planks',independent:true},
 {id:'ownPlace',title:'원하는 곳에 판자를 놓아 보자',text:'판자를 골라 쉼터를 더 꾸며 보자.',action:'place',type:'planks',independent:true},
 {id:'done',title:'첫 생존 성공!',text:'이제 나무를 모으고, 물건을 만들고, 집도 지을 수 있어. 더 넓은 세상으로 가 보자.'}
];
function snapshot(stats){return {wood:stats.harvestedWood||0,planks:stats.crafted?.planks||0,placed:stats.placed?.planks||0}}
function satisfied(id,c){
 const s=c.stats||{},crafted=s.crafted||{},bag=c.bag||{},placed=s.placed||{},base=c.baseline||{};
 switch(id){
  case 'walk':return c.walked||c.atWalkTarget&&c.moved>=.75;
  case 'wood':return (s.harvestedWood||0)>=3;
  case 'bag':return c.inventoryOpen||c.bagOpened;
  case 'planks':return (crafted.planks||0)>0;
  case 'benchCraft':return (crafted.workbench||0)>0||(bag.workbench||0)>0||(placed.workbench||0)>0;
  case 'benchPlace':return (placed.workbench||0)>0;
  case 'morePlanks':return (bag.planks||0)>=4||(crafted.woodPick||0)>0;
  case 'sticks':return (crafted.sticks||0)>0||(bag.sticks||0)>=2||(crafted.woodPick||0)>0;
  case 'pick':return (crafted.woodPick||0)>0||(bag.woodPick||0)>0;
  case 'stone':return (s.harvestedStone||0)>0;
  case 'shelter':return c.shelterComplete||s.shelterBuilt;
  case 'inside':return s.shelterBuilt;
  case 'ownWood':return (s.harvestedWood||0)>(base.wood??Infinity);
  case 'ownPlanks':return (crafted.planks||0)>(base.planks??Infinity);
  case 'ownPlace':return (placed.planks||0)>(base.placed??Infinity);
  default:return false;
 }
}
window.CubeArchitectCamp=Object.freeze({STEPS,SHELTER,snapshot,satisfied});
})();
