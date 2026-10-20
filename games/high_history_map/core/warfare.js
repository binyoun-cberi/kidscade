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

// Forecasts and resolution use exactly the same casualty model.
function combatOutcome(atk,def,attackers,defenders,ranged){
  var won=atk>def,ownLoss,enemyLoss;
  if(ranged){ownLoss=Math.max(.02,Math.min(.18,def/Math.max(atk,1)*.055));enemyLoss=Math.max(.12,Math.min(.62,atk/Math.max(def,1)*.36));}
  else if(won){ownLoss=Math.max(.12,Math.min(.66,def/Math.max(atk,1)*.44));enemyLoss=1;}
  else{ownLoss=Math.max(.25,Math.min(.82,def/Math.max(atk,1)*.34));enemyLoss=Math.max(.10,Math.min(.60,atk/Math.max(def,1)*.43));}
  return {won:ranged?false:won,attackers:Math.max(0,Math.round(attackers*(1-ownLoss))),defenders:Math.max(0,Math.round(defenders*(1-enemyLoss)))};
}
function combatRange(atk,def,attackers,defenders,ranged){
  var a=[],d=[];
  function sample(x,y){var r=combatOutcome(x,y,attackers,defenders,ranged);a.push(attackers-r.attackers);d.push(defenders-r.defenders);}
  [.93,1.07].forEach(function(x){[.93,1.07].forEach(function(y){sample(atk*x,def*y);});});
  // Crossing the win/loss boundary changes the casualty formula discontinuously.
  var low=Math.max(atk*.93,def*.93),high=Math.min(atk*1.07,def*1.07);
  if(!ranged&&low<=high){[low,high].forEach(function(p){sample(p,p);sample(p*(1+1e-10),p);});}
  return {ownMin:Math.min.apply(null,a),ownMax:Math.max.apply(null,a),enemyMin:Math.min.apply(null,d),enemyMax:Math.max.apply(null,d)};
}
global.UnificationWarWarfare={
  combatOutcome:combatOutcome,
  combatRange:combatRange,
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
