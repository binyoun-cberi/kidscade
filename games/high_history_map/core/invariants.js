(function(global){
"use strict";
function validateState(state,options){
  options=options||{};var issues=[];
  if(!state||typeof state!=="object")return["state가 없습니다."];
  if(!state.tiles||typeof state.tiles!=="object")issues.push("tiles가 없습니다.");
  if(!Array.isArray(state.units))issues.push("units가 배열이 아닙니다.");
  if(!state.resources||typeof state.resources!=="object")issues.push("resources가 없습니다.");
  Object.keys(state.resources||{}).forEach(function(owner){
    var r=state.resources[owner]||{};
    ["food","money","manpower","authority"].forEach(function(k){
      if(typeof r[k]!=="number"||!isFinite(r[k]))issues.push(owner+"."+k+" 값이 올바르지 않습니다.");
    });
  });
  var occupied=Object.create(null);
  (state.units||[]).forEach(function(u){
    var k=options.keyOf?options.keyOf(u.q,u.r):(u.q+"_"+u.r),t=state.tiles&&state.tiles[k];
    if(!t)issues.push("유닛 "+u.id+"가 지도 밖에 있습니다.");
    else if(t.terrain==="sea")issues.push("유닛 "+u.id+"가 바다 위에 있습니다.");
    if(typeof u.troops!=="number"||!isFinite(u.troops)||u.troops<0)issues.push("유닛 "+u.id+" 병력 값이 올바르지 않습니다.");
    var occKey=(u.owner||"?")+"@"+k;
    if(u.troops>0&&occupied[occKey])issues.push("같은 세력 유닛이 "+k+"에 중복되어 있습니다.");
    if(u.troops>0)occupied[occKey]=u.id;
  });
  Object.keys(state.cityGarrisons||{}).forEach(function(id){
    var v=state.cityGarrisons[id];
    if(typeof v!=="number"||!isFinite(v)||v<0)issues.push(id+" 수비대 값이 올바르지 않습니다.");
  });
  return issues;
}
global.UnificationWarInvariants={validateState:validateState};
})(window);
