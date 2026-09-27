(function(global){
"use strict";
var PERSONALITIES={
  goguryeo:{warTurn:12,launchRatio:1.08,recoverRatio:.72,preparedRatio:1.08},
  baekje:{warTurn:13,launchRatio:1.04,recoverRatio:.70,preparedRatio:1.04},
  silla:{warTurn:15,launchRatio:1.14,recoverRatio:.78,preparedRatio:1.15},
  gaya:{warTurn:20,launchRatio:1.24,recoverRatio:.82,preparedRatio:1.25},
  sui:{warTurn:16,launchRatio:1.12,recoverRatio:.75,preparedRatio:1.12},
  wa:{warTurn:17,launchRatio:1.10,recoverRatio:.75,preparedRatio:1.10}
};
function personality(owner){return PERSONALITIES[owner]||{warTurn:13,launchRatio:1.1,recoverRatio:.75,preparedRatio:1.1};}
function chooseMode(input){
  if(input.passive)return"HOLD";
  if(input.threat)return"DEFEND";
  if(input.atWar)return"WAR";
  if(input.turn<input.personality.warTurn&&input.hasExpansion)return"EXPAND";
  if(!input.hasTarget)return input.hasExpansion?"EXPAND":"HOLD";
  if(input.powerRatio<input.personality.recoverRatio)return"RECOVER";
  return"PREPARE_WAR";
}
function shouldLaunch(input){
  if(!input.targetDefense)return input.preparedPower>=360&&input.powerRatio>=input.personality.launchRatio;
  return input.powerRatio>=input.personality.launchRatio&&
    input.preparedPower>=Math.max(360,input.targetDefense*input.personality.preparedRatio);
}
global.UnificationWarAIStrategy={
  personality:personality,
  chooseMode:chooseMode,
  shouldLaunch:shouldLaunch
};
})(window);
