(function(global){
"use strict";

var MISSIONS={
  attack:{name:"공격",icon:"⚔️",attack:1.06,defense:.98,desc:"전선을 밀어붙입니다. 공격 +6%"},
  defend:{name:"방어",icon:"🛡️",attack:.96,defense:1.09,desc:"현재 전선을 지킵니다. 방어 +9%"},
  reserve:{name:"대기",icon:"⏳",attack:1,defense:1.03,desc:"후방에서 재정비합니다. 방어 +3% · 증원 효율 증가"},
  raid:{name:"기동",icon:"🐎",attack:1.08,defense:.94,desc:"기병의 측면·보급로 공격에 유리합니다."}
};

function mission(id){return MISSIONS[id]||MISSIONS.attack;}
function attackMultiplier(id,type){
  var m=mission(id).attack;
  if(id==="raid"&&type==="cavalry")m*=1.06;
  return m;
}
function defenseMultiplier(id){return mission(id).defense;}

function fatigueMultiplier(value){
  var f=Math.max(0,Math.min(100,Number(value)||0));
  return Math.max(.86,1-f*.0014);
}
function fatigueLabel(value){
  var f=Math.max(0,Math.min(100,Number(value)||0));
  if(f>=75)return{key:"critical",name:"심각"};
  if(f>=50)return{key:"high",name:"높음"};
  if(f>=25)return{key:"medium",name:"누적"};
  return{key:"low",name:"낮음"};
}
function siegeStage(pressure){
  var p=Math.max(0,Math.min(100,Number(pressure)||0));
  if(p>=75)return{key:"breach",name:"성벽 붕괴",defense:.78,replenish:.15};
  if(p>=45)return{key:"tight",name:"강한 포위",defense:.86,replenish:.35};
  if(p>=20)return{key:"siege",name:"포위",defense:.93,replenish:.65};
  return{key:"watch",name:"압박",defense:1,replenish:1};
}
function retreatLoss(troops){
  return Math.max(4,Math.round((Number(troops)||0)*.08));
}
function reinforcementAmount(type,missionId){
  var base=type==="infantry"?12:type==="archer"?10:9;
  if(missionId==="reserve")base+=6;
  return base;
}

global.UnificationWarWarfare={
  MISSIONS:MISSIONS,
  mission:mission,
  attackMultiplier:attackMultiplier,
  defenseMultiplier:defenseMultiplier,
  fatigueMultiplier:fatigueMultiplier,
  fatigueLabel:fatigueLabel,
  siegeStage:siegeStage,
  retreatLoss:retreatLoss,
  reinforcementAmount:reinforcementAmount
};
})(window);
