(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.FractionSmithOrders=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const ITEMS=[
    {id:'sword',name:'여행자의 철검',icon:'⚔️',material:'강철',request:'길을 떠나기 전에 튼튼한 검이 필요해요!',unlockAt:0,customer:0},
    {id:'axe',name:'나무꾼의 도끼',icon:'🪓',material:'무쇠',request:'큰 나무도 거뜬히 벨 수 있게 부탁해요.',unlockAt:0,customer:1},
    {id:'shield',name:'수호자의 방패',icon:'🛡️',material:'청동',request:'우리 마을을 지킬 단단한 방패를 만들어 주세요.',unlockAt:0,customer:2},
    {id:'spear',name:'정찰병의 창',icon:'🔱',material:'강철',request:'먼 곳까지 닿는 길고 곧은 창이 필요해요.',unlockAt:2,customer:3},
    {id:'helmet',name:'기사의 투구',icon:'🪖',material:'강철',request:'머리를 든든하게 지켜 줄 투구를 부탁해요.',unlockAt:4,customer:4},
    {id:'dagger',name:'상인의 단검',icon:'🗡️',material:'무쇠',request:'여행길에 지닐 가벼운 단검을 만들어 주세요.',unlockAt:6,customer:5},
    {id:'hammer',name:'목수의 쇠망치',icon:'🔨',material:'강철',request:'오래 쓸 수 있는 튼튼한 망치를 부탁해요.',unlockAt:9,customer:6},
    {id:'crown',name:'왕실의 왕관',icon:'👑',material:'금속',request:'궁궐에 올릴 아름다운 왕관을 만들어 주세요.',unlockAt:12,customer:7}
  ];
  const CUSTOMERS=[
    {name:'여행자 루나',icon:'🧑‍🦰'},
    {name:'나무꾼 토비',icon:'🧔'},
    {name:'수비대 미나',icon:'👩‍✈️'},
    {name:'정찰병 레오',icon:'🧑‍🚀'},
    {name:'기사 아린',icon:'🦸'},
    {name:'상인 모모',icon:'🧑‍🌾'},
    {name:'목수 벤',icon:'👷'},
    {name:'왕실 전령',icon:'🤴'}
  ];
  function unlockedItems(crafted=0){
    const count=Number.isSafeInteger(crafted)&&crafted>=0?crafted:0;
    return ITEMS.filter(item=>item.unlockAt<=count);
  }
  function create(number=0,mode='practice',crafted=0){
    const available=unlockedItems(crafted);
    const newest=available.find(item=>item.unlockAt>0&&item.unlockAt===crafted);
    const item=newest||available[(number+(mode==='master'?2:0))%available.length];
    return {item:{...item},customer:{...CUSTOMERS[item.customer]},number:number+1};
  }
  return {ITEMS,CUSTOMERS,unlockedItems,create};
});
