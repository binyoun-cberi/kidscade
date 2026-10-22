/* Joseon Baekjeong artisans: work, stigma, solidarity, contracts, mobility. */
(function(root){
 'use strict';const core=root.OneLifeSocial346,J=root.OneLifeJoseon,V5=root.OneLifeJoseon5;
 if(!core)return;
 const data={"label":"백정의 생업과 차별을 넘어서는 삶","arrival":"가죽과 고기를 손질하는 기술을 익히면서도 장터의 차별과 부당한 거래를 견뎌야 했다.","initial":{"craft":34,"allies":20,"trust":18,"barriers":52,"savings":16},"cases":[["장터에서 받는 값","정성껏 만든 가죽 물건을 장터에 내놓았지만 일부 손님은 백정 가계라고 값을 깎으려 한다.",[["값과 품질을 분명히 설명한다","흥정이 길어져도 만든 물건의 가치를 지킨다.","솜씨와 품질을 설명하며 정당한 거래를 청했다.",{"craft":6,"trust":11,"barriers":-3},6],["낮은 값을 받아들여 당장의 끼니를 마련한다","당장 먹을 것을 사지만 소득은 적다.","어쩔 수 없이 낮은 값에 물건을 팔았다.",{"savings":-3,"barriers":5,"trust":-2},2],["다른 상인과 함께 물건을 판다","협력할 사람이 필요하다.","이웃 상인과 판매할 자리를 나누어 썼다.",{"allies":11,"trust":5,"barriers":-4},4]]],["기술을 배울 사람","집안의 아이가 가죽과 도구를 다루는 법을 배우고 싶어 한다. 다른 일을 해 보고 싶은 마음도 있다.",[["기술을 차근차근 가르친다","생업의 기술을 다음 세대에 전한다.","아이에게 도구를 안전하게 다루는 법과 물건 만드는 순서를 가르쳤다.",{"craft":14,"trust":3},-3],["글과 셈도 배우게 한다","교육의 길이 제한될 수 있지만 배움을 포기하지 않는다.","글자를 아는 이웃에게 배울 기회를 물었다.",{"allies":6,"craft":2,"barriers":-5},-7],["아이가 하고 싶은 다른 일을 찾아본다","낯선 생업을 찾는 길에는 비용과 편견이 따른다.","아이가 원하는 길을 듣고 함께 의논했다.",{"allies":9,"barriers":-3,"savings":-4},-5]]],["동네의 부당한 배척","마을의 공동 우물과 장터 자리 이용을 둘러싸고 갈등이 생겼다.",[["마을 사람들과 직접 사정을 나눈다","서로 말해도 차별이 곧 없어지는 것은 아니다.","마을 사람들 앞에서 필요한 물과 장터 자리를 이야기했다.",{"allies":9,"trust":7,"barriers":-6},-2],["함께 겪은 이웃과 의견을 모은다","여럿이 말하면 힘이 되지만 반발을 살 수도 있다.","비슷한 일을 겪은 이웃과 함께 요청서를 마련했다.",{"allies":12,"barriers":-4,"trust":3},-4],["갈등을 피하고 먼 길로 돌아간다","마찰은 줄지만 불편과 차별은 남는다.","마찰을 피해 먼 길로 돌아 다녔다.",{"barriers":4,"savings":-4},-5]]],["관아에 물건을 납품하는 날","관아에서 가죽 물건을 주문했다. 대금이 밀릴 수 있어 계약 내용을 확인해야 한다.",[["수량과 약속한 값을 문서로 남긴다","대금을 받기 위한 근거가 생긴다.","납품 수량과 대금을 적고 서로 확인했다.",{"craft":8,"trust":7,"savings":5},6],["큰 주문을 모두 받아 더 많은 돈을 번다","돈은 벌 수 있지만 재료와 인력이 부족할 수도 있다.","큰 주문을 받아 무리하게 일을 늘렸다.",{"craft":4,"savings":13,"barriers":5},12],["여러 장인과 일을 나눠 맡는다","서로 솜씨를 맞추는 수고가 필요하다.","다른 장인과 재료와 주문을 나누었다.",{"allies":11,"trust":6,"craft":6},5]]]],"endingOptions":[["좋은 물건을 계속 만들며 거래를 넓힌다","신뢰를 쌓더라도 사회적 차별이 단번에 없어지지는 않는다.","만든 물건의 품질을 지키며 거래할 곳을 넓혔다.",{"craft":9,"trust":8},-5],["이웃과 힘을 모아 부당한 처우를 바로잡으려 한다","시간이 걸리지만 함께 요청할 수 있다.","이웃과 차별에 관해 이야기하고 개선을 청했다.",{"allies":12,"barriers":-7},-8],["다른 고을에서 기술로 새 삶을 찾는다","새로운 곳에도 편견이 있을 수 있다.","다른 고을에 가서 생업을 이어 갈 곳을 찾았다.",{"savings":-9,"barriers":4},-10]],"endings":{"artisan":"널리 알려진 가죽 장인","community":"이웃과 삶을 넓힌 백정","move":"새 고을에서 다시 시작한 장인","precarious":"편견과 가난을 견디며 생업을 지킨 사람"}};
 const option=([label,note,result,meters,money=0])=>({label,note,result,delta:{meters,money}});
 core.register('baekjeong',{
  label:data.label,arrival:data.arrival,initial:data.initial,endings:data.endings,
  cases:data.cases.map(([title,intro,options])=>({title,intro,options:options.map(option)})),
  endingTitle:'차별 속에서도 남은 솜씨와 인연',endingIntro:'문서와 솜씨, 함께 일해 준 이웃의 기억은 남는다. 부를 쌓아도 법적 출생을 임의로 바꾸지 않는다.',
  endingOptions:data.endingOptions.map(option),fallback:'도축과 가죽 손질의 생업을 이어 갔다.',
  eligible(l,j,s){return l.age>=17&&l.year<=1887&&s.origin==='백정';},
  outcome(l,p,index,r){
   const j=J.ensure(l),s=V5.ensure(l),m=p.meters;
   // Baekjeong is not bonded slavery: never set freed or automatically grant a civil office.
   if(index===2){j.region=j.region==='전라도'?'경상도':'전라도';j.relocations++;
    j.occupation='다른 고을에서 일하는 가죽 장인';l.career=j.occupation;
    return {code:'move',text:'새 고을로 옮겨 다시 일을 시작했다. 차별의 벽이 모두 사라진 것은 아니었다.'};}
   if(index===1&&m.allies>=42){j.occupation='이웃과 협력하는 가죽 장인';l.career=j.occupation;
    return {code:'community',text:'이웃과 뜻을 모아 더 나은 거래와 생활의 길을 찾았다. 아직 해결할 일도 남았다.'};}
   if(index===0&&m.craft>=52&&m.trust>=35&&r<.8){
    j.occupation='고을에 솜씨가 알려진 가죽 장인';l.career=j.occupation;
    return {code:'artisan',text:'만든 물건의 품질을 인정받으며 생업을 넓혔다. 신분 차별을 겪던 기억은 남았다.'};}
   return {code:'precarious',text:'가난과 편견 속에서도 가족과 함께 일을 지켰다.'};
  }
 });
})(typeof window!=='undefined'?window:null);
