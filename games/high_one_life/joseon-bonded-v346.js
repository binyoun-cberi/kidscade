/* Three-stage life choices of privately and publicly bonded Joseon workers. */
(function(root){
 'use strict';const core=root.OneLifeSocial346,J=root.OneLifeJoseon,V5=root.OneLifeJoseon5;
 if(!core)return;
 const data={"label":"노비의 가족과 해방을 향한 삶","arrival":"예속된 처지에서 가족, 기술, 속량의 길을 찾아 나섰다.","initial":{"skills":14,"family":38,"documents":8,"savings":10,"danger":12},"cases":[["가족을 돌볼 시간","집에서 아픈 사람이 생겼다. 맡은 일은 그대로인데 가족을 돌볼 시간도 필요하다.",[["동료와 하루 일을 바꾼다","일을 나누어도 주인의 허락이 필요할 수 있다.","동료와 일을 나누어 가족을 돌볼 시간을 마련했다.",{"family":12,"skills":4,"danger":4},-3],["허락 없이 가족에게 간다","가족은 돌보지만 문책을 받을 수 있다.","급히 가족을 돌보러 갔고 일을 쉰 까닭을 설명해야 했다.",{"family":14,"danger":10},-2],["먹을 것을 보내고 맡은 일을 지킨다","곁에서 돌보기는 어렵다.","먹을 곡식을 보낸 뒤 맡은 일을 마쳤다.",{"family":5,"savings":-3,"skills":2},-4]]],["힘든 노동과 익히는 솜씨","맡은 일이 많아졌지만 오래 일한 동료에게 기술을 배울 기회도 있다.",[["동료에게 기술을 배운다","바로 자유로운 직업을 얻는 것은 아니다.","동료에게 손기술을 배우고 익혔다.",{"skills":15,"family":2,"savings":2},1],["늘어난 노동을 문서로 남긴다","날짜와 일의 양을 기록한다.","추가로 맡은 일과 날짜를 기록했다.",{"documents":13,"danger":6,"skills":2},-2],["일을 계속하며 품삯을 모은다","건강에 무리가 갈 수 있다.","힘든 일 속에서도 작은 품삯을 모았다.",{"savings":10,"danger":2},6]]],["속량과 관련된 소문","관아에서 신분 문서를 다시 확인한다는 말을 들었다. 속량할 돈과 증인이 있는지가 중요하다.",[["속량 조건을 알아본다","문서와 동의가 필요하다.","주인이나 관아에 필요한 조건을 물었다.",{"documents":15,"savings":-4,"danger":5},-5],["가족과 증인을 찾아본다","도움이 되지만 허락은 보장되지 않는다.","오래된 문서와 친족의 증언을 모았다.",{"documents":12,"family":9,"danger":4},-3],["기회를 기다리며 일을 계속한다","위험은 적지만 변화도 늦다.","소문을 듣고도 맡은 일을 이어 갔다.",{"skills":4,"savings":6,"danger":-3},4]]],["도망친 노비의 소식","도망친 사람을 찾는 추쇄꾼이 고을에 왔다. 그 가족도 불안해한다.",[["아는 사실만 말한다","확인하지 못한 소문은 보태지 않는다.","아는 사실만 전했다.",{"documents":6,"danger":-3,"family":3},0],["도망자의 식구에게 먹을 것을 준다","수색 대상이 될 위험이 있다.","남은 식구에게 먹을 것을 전했다.",{"family":9,"danger":8,"savings":-5},-4],["소문을 피해 거처를 옮긴다","허락 없이 이동하면 위험할 수 있다.","한동안 다른 곳에서 지냈다.",{"danger":12,"savings":-7,"family":-4},-7]]]],"endingOptions":[["정식 속량을 청한다","문서와 돈이 필요하고 결과를 장담할 수 없다.","속량에 필요한 문서를 제출했다.",{"documents":12,"savings":-8,"danger":2},-12],["다른 고을로 도망친다","도망쳐도 법적 노비 신분은 남는다.","다른 고을에서 신분을 숨겼다.",{"danger":22,"family":-8,"savings":-7},-8],["기술과 가족을 지키며 살아간다","주어진 처지에서 미래를 준비한다.","함께 기술을 익히며 살았다.",{"skills":9,"family":7,"danger":-5},2]],"endings":{"freed":"문서로 속량한 양인","petition":"속량을 계속 청하는 노비","fugitive":"추쇄를 피하는 도망 노비","recaptured":"추쇄에 붙잡힌 도망 노비","craft":"기술을 익힌 예속 노동자","survive":"가족을 지킨 노비"}};
 const option=([label,note,result,meters,money=0])=>({label,note,result,delta:{meters,money}});
 const cfg={
  label:data.label,arrival:data.arrival,initial:data.initial,endings:data.endings,
  cases:data.cases.map(([title,intro,options])=>({title,intro,options:options.map(option)})),
  endingTitle:'예속된 처지에서의 다음 삶',endingIntro:'기술과 가족, 문서가 남았다. 도망이 곧 법적 해방은 아니다.',
  endingOptions:data.endingOptions.map(option),
  fallback:'가족과 생계를 지킬 길을 찾아 나섰다.',
  eligible(l,j,s){return l.age>=17&&l.year<1886&&['사노비','공노비'].includes(s.origin)&&!s.freed;},
  outcome(l,p,index,r){
   const soc=V5.ensure(l),j=J.ensure(l),m=p.meters;
   if(index===0){
    const chance=Math.min(.78,.09+m.documents*.006+m.savings*.003+m.family*.001);
    if(r<chance){soc.freed=true;soc.legal='양인';soc.role='속량되어 생업을 찾는 사람';
     j.status='속량된 양인';j.occupation='속량 뒤 생업을 찾는 사람';l.career=j.occupation;
     return {code:'freed',text:'문서를 확인받아 속량되었다. 옛 차별과 생활의 어려움은 남았다.'};}
    return {code:'petition',text:'속량을 청했지만 이번에는 허락을 얻지 못했다.'};
   }
   if(index===1){
    const caught=r<Math.min(.78,.08+m.danger*.008);
    j.occupation=caught?'추쇄에 붙잡혀 다시 노동하는 노비':'신분을 숨기고 품을 파는 도망 노비';l.career=j.occupation;
    const fate=l.joseon344;
    if(fate){fate.fugitive=caught?'recaptured':'escaped';if(!caught)fate.follow={key:'slaveAfter',due:l.year+2};}
    return caught?{code:'recaptured',text:'다른 고을로 떠났으나 추쇄에 붙잡혀 다시 예속된 노동을 하게 되었다.'}:
     {code:'fugitive',text:'다른 고을로 도망쳤다. 아직 법적으로 예속에서 벗어난 것은 아니었다.'};}
   return m.skills>=42&&m.family>=50?
    {code:'craft',text:'기술과 가족의 인연을 지키며 삶을 이어 갔다.'}:
    {code:'survive',text:'일과 거처를 정하기 어려운 가운데도 가족과 하루하루를 이어 갔다.'};
  }
 };
 core.register('bonded',cfg);
})(typeof window!=='undefined'?window:null);
