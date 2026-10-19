(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.FractionSmithOrders=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const ITEMS=[
    {id:'sword',name:'여행자의 철검',icon:'⚔️',material:'강철',request:'길을 떠나기 전에 튼튼한 검이 필요해요!'},
    {id:'axe',name:'나무꾼의 도끼',icon:'🪓',material:'무쇠',request:'큰 나무도 거뜬히 벨 수 있게 부탁해요.'},
    {id:'shield',name:'수호자의 방패',icon:'🛡️',material:'청동',request:'우리 마을을 지킬 단단한 방패를 만들어 주세요.'}
  ];
  const CUSTOMERS=[
    {name:'여행자 루나',icon:'🧑‍🦰'},
    {name:'나무꾼 토비',icon:'🧔'},
    {name:'수비대 미나',icon:'👩‍✈️'},
    {name:'상인 모모',icon:'🧑‍🌾'}
  ];
  function create(number=0,mode='practice'){
    const index=mode==='master'?2:number%ITEMS.length;
    return {item:{...ITEMS[index]},customer:{...CUSTOMERS[number%CUSTOMERS.length]},number:number+1};
  }
  return {ITEMS,CUSTOMERS,create};
});
