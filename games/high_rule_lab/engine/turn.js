(function(g){
'use strict';
const E=g.RuleLabEngine=g.RuleLabEngine||{};
function step(state,input){
 const beforeRules=E.Rules.parse(state);
 const moved=E.Movement.moveYou(state,input.dx,input.dy,beforeRules);
 if(!moved.moved)return {state,rules:beforeRules,diff:{added:[],removed:[]},moved:false,won:false};
 let work=moved.state;
 work.moves=(state.moves||0)+1;work.turn=(state.turn||0)+1;
 let rules=E.Rules.parse(work);
 work=E.Interactions.applyTransforms(work,rules);
 rules=E.Rules.parse(work);
 work=E.Interactions.apply(work,rules);
 rules=E.Rules.parse(work);
 const auto=E.Movement.autoMove(work,rules);work=auto.state;
 rules=E.Rules.parse(work);
 work=E.Interactions.apply(work,rules);
 rules=E.Rules.parse(work);
 const won=E.Interactions.checkWin(work,rules);
 work.status=won?'won':'playing';
 return {state:work,rules,diff:E.Rules.diff(beforeRules,rules),moved:true,won};
}
E.Turn={step};
})(typeof window!=='undefined'?window:globalThis);
