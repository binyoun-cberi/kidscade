/* Agriculture, petty trade, tenancy and hardship for Joseon commoner families. */
(function(root){
 'use strict';
 const core=root.OneLifeSocial346,J=root.OneLifeJoseon,V5=root.OneLifeJoseon5,Paths=root.OneLifeJoseon325;
 if(!core)return;
 const data={"label":"상민의 생업·재산·이웃","arrival":"농사와 장사, 세금과 가족의 살림 사이에서 여러 번 선택해야 했다.","initial":{"harvest":35,"trade":25,"debt":24,"credit":40,"neighbors":40},"cases":[["논밭과 일손","농사를 지을 씨앗과 일손이 모자라다. 소작료를 내야 하는 집도 있다.",[["이웃과 품앗이를 한다","함께 거두되 빌린 일손을 갚아야 한다.","마을 사람들과 일손을 나누어 농사를 이어 갔다.",{"harvest":9,"neighbors":9,"debt":-3},-4],["돈을 빌려 농기구와 씨앗을 산다","수확이 적으면 빚이 남는다.","돈을 빌려 씨앗과 농기구를 마련했다.",{"harvest":12,"debt":12,"credit":2},-2],["규모를 줄이고 가족이 먹을 것부터 마련한다","큰 수입은 어렵지만 부담을 줄일 수 있다.","농사 규모를 줄여 식구가 먹을 곡식부터 남겼다.",{"harvest":-2,"debt":-7,"neighbors":2},-2]]],["장터의 거래","수확한 곡식이나 만든 물건을 장터에 내놓았다. 값과 운송 비용이 달라졌다.",[["무게와 값을 분명히 정해 판다","많이 남기지 못해도 거래의 신뢰를 쌓는다.","무게와 값을 약속대로 지켜 거래했다.",{"trade":9,"credit":12,"debt":-2},7],["큰값을 받기 위해 먼 장터로 간다","값이 좋을 수 있지만 운송에 돈이 든다.","먼 장터까지 물건을 가져가 팔았다.",{"trade":16,"debt":4,"credit":1},10],["믿는 이웃에게 먼저 물건을 나눠 준다","당장의 벌이는 적지만 관계를 이어 간다.","어려운 집과 곡식을 나누었다.",{"neighbors":12,"credit":4,"trade":-3},-5]]],["관아의 세금과 부역","추가로 거두는 곡식의 명목을 아전에게 물었다. 집집마다 형편이 다르다.",[["납부 문서를 확인하고 잘못된 항목을 고친다","시간이 들지만 억울한 세금을 줄일 근거를 모은다.","납부 문서를 대조해 잘못 적힌 항목을 찾아냈다.",{"debt":-5,"credit":6,"neighbors":5},-4],["곡식을 내고 더는 따지지 않는다","마찰은 적지만 곳간이 빈다.","필요한 곡식을 내고 다음 먹을 것을 계산했다.",{"debt":6,"neighbors":-3},-6],["이웃과 함께 감면을 청한다","함께 나서도 받아들여질 보장은 없다.","이웃과 실제로 낸 양을 모아 감면을 청했다.",{"neighbors":10,"credit":4,"debt":-2},-3]]],["흉년과 장마","비바람에 수확이 줄었다. 빚이 있는 집은 다음 해가 더 걱정이다.",[["먹을 곡식부터 남겨 가족을 돌본다","저축은 줄지만 당장의 끼니를 지킨다.","남은 곡식을 식구에게 나누어 주었다.",{"harvest":-9,"debt":4,"neighbors":5},-6],["다른 집의 품일을 하며 부족한 돈을 번다","몸이 고단하지만 조금씩 갚을 수 있다.","품을 팔아 남은 살림돈을 모았다.",{"harvest":-3,"debt":-5,"credit":4},7],["돈을 빌려 다시 농사를 크게 짓는다","풍년일 수도 있지만 실패하면 빚이 쌓인다.","돈을 빌려 다음 농사에 다시 도전했다.",{"harvest":13,"debt":16,"credit":-3},-4]]]],"endingOptions":[["살림을 줄이고 빚을 갚는다","큰 성공보다 오래 지속되는 생계를 택한다.","살림과 빚 장부를 다시 정리했다.",{"debt":-12,"credit":6},-5],["모은 돈으로 장사를 넓힌다","이익과 손실이 함께 커질 수 있다.","장터에 새 물건을 내놓았다.",{"trade":10,"debt":7},-12],["빚과 흉년을 피해 다른 고을로 떠난다","땅과 이웃을 두고 떠나야 한다.","고향의 집을 떠나 다른 생업을 찾아 나섰다.",{"neighbors":-10,"debt":4},-13]],"endings":{"stable":"살림을 지켜 낸 상민","merchant":"장터에서 성공한 상인","bankrupt":"빚을 갚으며 살아가는 사람","wanderer":"빚을 안고 고향을 떠난 농민","community":"이웃과 생계를 나눈 농민"}};
 const option=([label,note,result,meters,money=0])=>({label,note,result,delta:{meters,money}});
 core.register('commoner',{
  label:data.label,arrival:data.arrival,initial:data.initial,endings:data.endings,
  cases:data.cases.map(([title,intro,options])=>({title,intro,options:options.map(option)})),
  endingTitle:'상민의 살림, 다음 고개',endingIntro:'빚과 곡식, 거래를 믿어 준 사람들의 기억이 남았다.',
  endingOptions:data.endingOptions.map(option),fallback:'살림을 계속 꾸려 나갔다.',
  eligible(l,j,s){return l.age>=19&&l.year<=1885&&j.birthStatus==='상민'&&!j.office&&
    !['백정','사노비','공노비','노비 후손 가계'].includes(s.origin);},
  outcome(l,p,index,r){
   const j=J.ensure(l),m=p.meters;
   if(index===2&&m.debt>=34){
    const old=Paths.ensure(l);old.stage='forest';old.stageDue=l.year+3;
    old.originalRegion=j.region;old.residence='산골 화전';j.region='강원도';j.land=0;j.relocations++;
    j.occupation='산골에서 일자리를 찾는 농민';l.career=j.occupation;
    return {code:'wanderer',text:'고향을 떠나 산골에 살 곳을 찾았다. 빚이 사라지지는 않았고 낯선 땅에서 다시 일해야 했다.'};
   }
   if(index===1&&m.trade>=53&&m.credit>=40&&r<.78){
    j.occupation='장터에서 물건을 파는 상인';l.career=j.occupation;
    return {code:'merchant',text:'오랜 거래와 물건의 품질을 인정받아 장사를 넓혔다. 양반 신분으로 바뀐 것은 아니었다.'};
   }
   if(m.debt>=65||(m.harvest<28&&m.debt>=38)||j.capital<0)return {code:'bankrupt',text:'빚이 늘어나 살림을 줄이고 이웃과 갚을 때를 다시 의논해야 했다.'};
   if(m.neighbors>=55&&index===0)return {code:'community',text:'이웃과 농사일을 나누며 작은 살림을 지켜 냈다.'};
   return {code:'stable',text:'해마다 수입은 달랐지만 가족의 끼니와 생업을 이어 갔다.'};
  }
 });
})(typeof window!=='undefined'?window:null);
