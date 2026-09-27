(function(global){
"use strict";
function createActionBus(options){
  options=options||{};
  var handlers=Object.create(null);
  function register(type,handler){
    if(!type||typeof handler!=="function")throw new Error("Invalid action handler");
    handlers[type]=handler;return api;
  }
  function apply(action,meta){
    meta=meta||{};
    if(!action||typeof action.type!=="string")return{ok:false,reason:"잘못된 명령입니다."};
    var handler=handlers[action.type];
    if(!handler)return{ok:false,reason:"지원하지 않는 명령입니다: "+action.type};
    var state=typeof options.getState==="function"?options.getState():null,result;
    try{result=handler({state:state,action:action,meta:meta})||{ok:true};}
    catch(err){
      if(options.onError)options.onError(err,action,meta);
      else if(global.console&&console.error)console.error("[통일전쟁 action]",action,err);
      return{ok:false,reason:"명령 처리 중 오류가 발생했습니다.",error:err};
    }
    if(result.ok===false)return result;
    if(state)state.engineRevision=(state.engineRevision||0)+1;
    if(typeof options.afterAction==="function")options.afterAction(state,action,result,meta);
    return result;
  }
  function has(type){return typeof handlers[type]==="function";}
  var api={register:register,apply:apply,has:has};
  return api;
}
global.UnificationWarActions={createActionBus:createActionBus};
})(window);
