export function createTownEconomy(ctx){
  const {prog,inv,openPanel,toast,persist,updateStatus,setAvatarAction,itemName,foodName=(key=>key),travel,playSfx,addInventoryItem,canCarryNewKey}=ctx;

  const BUY={
    market:{
      seedPotato:{name:'감자 씨앗',price:12,type:'seed',key:'potato',qty:1},
      seedCarrot:{name:'당근 씨앗',price:12,type:'seed',key:'carrot',qty:1},
      seedTomato:{name:'토마토 씨앗',price:16,type:'seed',key:'tomato',qty:1},
      seedStrawberry:{name:'딸기 씨앗',price:18,type:'seed',key:'strawberry',qty:1},
      seedCorn:{name:'옥수수 씨앗',price:18,type:'seed',key:'corn',qty:1},
      seedPumpkin:{name:'호박 씨앗',price:22,type:'seed',key:'pumpkin',qty:1},
      lunch:{name:'도시락',price:34,type:'food',key:'cityLunch',qty:1},
      rugRound:{name:'둥근 러그',price:68,type:'furniture',key:'rugRound',qty:1},
      teddy:{name:'곰 인형',price:55,type:'furniture',key:'teddy',qty:1},
      fabric:{name:'튼튼한 천',price:24,type:'inv',key:'fabric',qty:1},
      paint:{name:'가구용 페인트',price:30,type:'inv',key:'paint',qty:1,friend:'minji',needFriend:3},
      backpack2:{name:'12칸 배낭',price:90,type:'backpack',level:2},
      backpack3:{name:'16칸 큰 배낭',price:190,type:'backpack',level:3,friend:'minji',needFriend:5},
      backpack4:{name:'20칸 탐험가방',price:340,type:'backpack',level:4,friend:'minji',needFriend:9}
    },
    hardware:{
      wood3:{name:'목재 3개',price:24,type:'inv',key:'wood',qty:3},
      stone3:{name:'돌 3개',price:24,type:'inv',key:'stone',qty:3},
      axe:{name:'돌도끼',price:72,type:'tool',key:'axe',tier:'stone',dur:18},
      pick:{name:'돌곡괭이',price:82,type:'tool',key:'pick',tier:'stone',dur:18},
      floorLamp:{name:'플로어 램프',price:96,type:'furniture',key:'floorLamp',qty:1},
      nails:{name:'못 묶음',price:18,type:'inv',key:'nails',qty:2},
      glass:{name:'가공 유리',price:38,type:'inv',key:'glass',qty:1,friend:'junho',needFriend:3},
      wire:{name:'전선 묶음',price:52,type:'inv',key:'wire',qty:2,friend:'junho',needFriend:7}
    },
    cafe:{
      toast:{name:'카페 토스트',price:26,type:'food',key:'cafeToast',qty:1},
      lunch:{name:'도시락',price:36,type:'food',key:'cityLunch',qty:1}
    }
  };
  const SELL={wood:4,stone:4,iron:12,copper:24,quartz:28,gold:70,semiconductor:160,fish:14,rareFish:38,pearl:90,potato:8,carrot:8,tomato:10,strawberry:13,corn:12,pumpkin:16,apple:14,pear:16,peach:18,orange:20,cherry:26,mushroom:10,milk:18,egg:12,truffle:38};
  const JOBS={
    market:{name:'마트 진열 돕기',reward:65,energy:12,hunger:5},
    cafe:{name:'카페 설거지',reward:72,energy:14,hunger:6},
    cleanup:{name:'광장 정리하기',reward:55,energy:9,hunger:3}
  };
  const HOURS={
    market:{open:7,close:22,label:'07:00~22:00'},
    hardware:{open:8,close:20,label:'08:00~20:00'},
    cafe:{open:6,close:23,label:'06:00~23:00'}
  };
  const GIFT_FAVORITES={
    minji:['fruitSalad'],junho:['grilledFish'],haneul:['omelet','fruitSalad'],doyun:['cityLunch'],
    yuna:['bakedPotato','veggieSoup'],taeho:['cafeToast'],sora:['mushroomSoup'],hyunwoo:['cityLunch'],
    nari:['veggieSoup'],woojin:['mushroomSoup'],seoyeon:['omelet'],minseok:['grilledFish']
  };
  const RESIDENTS={
    minji:{name:'민지',role:'씨앗마트 운영',service:'market',serviceLabel:'씨앗마트 이용'},
    junho:{name:'준호',role:'철물·도구 전문가',service:'hardware',serviceLabel:'튼튼 철물점 이용'},
    haneul:{name:'하늘',role:'카페 운영·요리',service:'cafe',serviceLabel:'하늘 카페 이용'},
    doyun:{name:'도윤',role:'마을 일자리·행정',service:'jobs',serviceLabel:'오늘의 일거리 보기'},
    yuna:{name:'유나',role:'농사·마을생활 조언',service:'advice',serviceLabel:'농사 이야기 듣기'},
    taeho:{name:'태호',role:'키즈 아케이드 운영',service:'arcade',serviceLabel:'아케이드 놀기'},
    sora:{name:'소라',role:'도서관·생활지식',service:'library',serviceLabel:'도서관 이용'},
    hyunwoo:{name:'현우',role:'마을 배달',service:'delivery',serviceLabel:'배달 일 받기'},
    nari:{name:'나리',role:'보건소·회복',service:'clinic',serviceLabel:'보건소 이용'},
    woojin:{name:'우진',role:'숲 채집·탐험',service:'forest',serviceLabel:'숲 정보 듣기'},
    seoyeon:{name:'서연',role:'Cube Pets 돌봄',service:'pets',serviceLabel:'펫 이야기 듣기'},
    minseok:{name:'민석',role:'씨앗버스 운행',service:'transport',serviceLabel:'씨앗버스 타기'}
  };
  const FRIENDSHIP_REWARDS={
    minji:[{at:3,type:'seedBundle',name:'민지의 씨앗 꾸러미'},{at:7,type:'perk',key:'marketDiscount',value:.10,name:'씨앗마트 10% 단골 할인'},{at:12,type:'furniture',key:'minjiPlanter',name:'민지의 시장 화분'}],
    junho:[{at:3,type:'item',key:'iron',qty:3,name:'정제 철광석 3개'},{at:7,type:'perk',key:'hardwareDiscount',value:.12,name:'철물점 12% 단골 할인'},{at:12,type:'furniture',key:'junhoStool',name:'준호의 작업 스툴'}],
    haneul:[{at:3,type:'food',key:'cafeToast',qty:3,name:'하늘의 토스트 3개'},{at:7,type:'perk',key:'cafeDiscount',value:.15,name:'카페 15% 단골 할인'},{at:12,type:'furniture',key:'haneulTable',name:'하늘의 카페 테이블'}],
    doyun:[{at:3,type:'coins',qty:120,name:'마을 봉사 격려금 120코인'},{at:7,type:'perk',key:'jobBonus',value:.15,name:'알바 보수 15% 증가'},{at:12,type:'furniture',key:'doyunBench',name:'도윤의 마을 벤치'}],
    yuna:[{at:3,type:'seedBundle',name:'유나의 텃밭 씨앗 꾸러미'},{at:7,type:'perk',key:'harvestBonus',value:1,name:'작물 수확량 +1'},{at:12,type:'furniture',key:'yunaPlant',name:'유나의 작은 화초'}],
    taeho:[{at:3,type:'coins',qty:60,name:'아케이드 토큰 환급 60코인'},{at:7,type:'perk',key:'arcadeDiscount',value:3,name:'아케이드 이용료 3코인 할인'},{at:12,type:'furniture',key:'taehoRetroTv',name:'태호의 레트로 게임 TV'}],
    sora:[{at:3,type:'food',key:'cityLunch',qty:2,name:'독서 도시락 2개'},{at:7,type:'perk',key:'libraryEnergyBonus',value:4,name:'도서관 체력 회복 +4'},{at:12,type:'furniture',key:'soraBookcase',name:'소라의 고전 책장'}],
    hyunwoo:[{at:3,type:'coins',qty:100,name:'배달 감사비 100코인'},{at:7,type:'perk',key:'deliveryBonus',value:25,name:'배달 보상 +25코인'},{at:12,type:'furniture',key:'hyunwooDrawers',name:'현우의 배달 서랍장'}],
    nari:[{at:3,type:'food',key:'cityLunch',qty:2,name:'회복 도시락 2개'},{at:7,type:'perk',key:'clinicDiscount',value:10,name:'보건소 진료비 10코인 할인'},{at:12,type:'furniture',key:'nariLamp',name:'나리의 진료실 램프'}],
    woojin:[{at:3,type:'item',key:'mushroom',qty:4,name:'숲 버섯 4개'},{at:7,type:'perk',key:'mushroomBonus',value:1,name:'버섯 채집량 +1'},{at:12,type:'furniture',key:'woojinRelaxChair',name:'우진의 숲 휴식의자'}],
    seoyeon:[{at:3,type:'petBundle',name:'Cube Pets 간식 꾸러미'},{at:7,type:'perk',key:'petFriendBonus',value:1,name:'펫 길들이기 요구량 1개 감소'},{at:12,type:'furniture',key:'seoyeonPetChair',name:'서연의 펫 의자'}],
    minseok:[{at:3,type:'coins',qty:80,name:'교통 지원금 80코인'},{at:7,type:'perk',key:'riverBus',value:1,name:'북쪽 강가 버스 노선 해금'},{at:12,type:'furniture',key:'minseokTravelBench',name:'민석의 여행 벤치'}]
  };
  const TALK_LINES={
    minji:['오늘 들어온 씨앗 상태가 아주 좋아.','작물은 급하게 키우기보다 매일 조금씩 돌보는 게 좋아.','단골이 되면 내가 챙겨줄 것도 있지!'],
    junho:['도구는 좋은 것보다 관리가 더 중요해.','돌도구로 시작해도 철을 모으면 훨씬 편해질 거야.','집 꾸미기 재료가 부족하면 철물점에 들러.'],
    haneul:['탐험 전에 든든하게 먹는 게 제일 중요해.','카페에서는 쉬어가도 괜찮아.','언젠가 네 집에도 멋진 카페 공간이 생기겠네.'],
    doyun:['오늘 마을 일거리 게시판 확인했어?','작은 일을 꾸준히 하면 마을도 점점 좋아져.','마을 주민들과 친해지는 것도 중요한 일이야.'],
    yuna:[
      '농장 쪽 해 질 무렵 풍경이 정말 예뻐.',
      '마을 사람들과 매일 조금씩 이야기해봐. 금방 친해질 거야.',
      '버스 정류장에서는 집이나 숲으로 바로 갈 수도 있어.'
    ],
    woojin:[
      '나는 저녁이면 광장 산책을 자주 해.',
      '일만 하지 말고 아케이드나 도서관에도 들러봐!',
      '숲에서 버섯을 따오면 마트에서 꽤 괜찮게 팔려.'
    ],
    seoyeon:[
      'Cube Pets랑 같이 다니면 마을에서도 인기 만점이야.',
      '먹이를 줄 때는 동물마다 좋아하는 걸 잘 살펴봐.',
      '친해지면 펫을 돌보는 내 비법도 알려줄게.'
    ],
    taeho:['오늘도 한 판 할래?','게임도 적당히 쉬면서 해야 오래 즐길 수 있어.','진짜 단골에게만 주는 레트로 물건이 하나 있어.'],
    sora:['오늘은 어떤 책이 궁금해?','생활 팁은 도서관 책 속에도 꽤 많이 있어.','오래된 책장 하나를 정말 소중한 친구에게 주고 싶어.'],
    hyunwoo:['배달은 길을 잘 아는 게 절반이야.','하늘 카페까지는 광장을 가로지르면 빨라.','계속 도와줘서 정말 든든해.'],
    nari:['무리한 뒤에는 꼭 쉬어야 해.','허기와 체력은 서로 영향을 줘.','건강은 모험을 오래 이어가는 가장 좋은 준비야.'],
    woojin:['숲은 낮이랑 저녁 분위기가 꽤 달라.','버섯은 깊은 숲 쪽에서 더 잘 보여.','좋은 채집 자리는 친한 사람한테만 알려주는 거야.'],
    minseok:['버스는 이동 시간을 아끼는 가장 좋은 방법이지.','노선은 마을 사람들이 자주 찾는 곳부터 늘리고 있어.','북쪽 강가 노선도 언젠가 열어볼 생각이야.']
  };
  const LIBRARY_TIPS=[
    '나뭇가지와 작은 돌은 도구 없이 주울 수 있어요.',
    '비버와 동행하면 벌목할 때 목재를 하나 더 얻어요.',
    '고양이와 함께라면 밤 야외 피로가 줄어요.',
    '철도구는 돌도구보다 내구도가 높고 채집 효율도 좋아요.',
    '농작물과 물고기는 씨앗마트에서 코인으로 팔 수 있어요.',
    '광산을 발전시키면 석영·구리·금이 나오고 3×3 제작대의 새 조합이 열려요.',
    '모던 TV는 상점 판매품이 아니라 기술 공방 3단계에서 직접 만들어야 해요.'
  ];

  function ensureState(p=prog()){
    const old=p.town&&typeof p.town==='object'?p.town:{};
    const d=old.delivery&&typeof old.delivery==='object'?old.delivery:{};
    const daily=old.dailyPlay&&typeof old.dailyPlay==='object'?old.dailyPlay:{};
    p.town={
      coins:Number.isFinite(Number(old.coins))?Math.max(0,Math.floor(Number(old.coins))):120,
      fun:Number.isFinite(Number(old.fun))?Math.max(0,Math.min(100,Number(old.fun))):80,
      jobs:old.jobs&&typeof old.jobs==='object'?old.jobs:{},
      friendship:old.friendship&&typeof old.friendship==='object'?old.friendship:{},
      talked:old.talked&&typeof old.talked==='object'?old.talked:{},
      rewardClaims:old.rewardClaims&&typeof old.rewardClaims==='object'?old.rewardClaims:{},
      gifts:old.gifts&&typeof old.gifts==='object'?old.gifts:{},
      perks:old.perks&&typeof old.perks==='object'?old.perks:{},
      visits:Math.max(0,Math.floor(Number(old.visits)||0)),
      delivery:{
        active:!!d.active,
        target:d.target||'cafe',
        startedDay:Math.max(0,Math.floor(Number(d.startedDay)||0)),
        completedDay:Math.max(0,Math.floor(Number(d.completedDay)||0)),
        reward:95
      },
      dailyPlay:{arcadePrizeDay:Math.max(0,Math.floor(Number(daily.arcadePrizeDay)||0))},
      libraryDay:Math.max(0,Math.floor(Number(old.libraryDay)||0))
    };
    const day=p.survival.day;
    if(p.town.delivery.active&&p.town.delivery.startedDay!==day)p.town.delivery.active=false;
    return p.town;
  }
  function addFurniture(key,qty=1){
    const p=prog();
    p.housing=p.housing&&typeof p.housing==='object'?p.housing:{version:3,owned:{},placed:[],starterGiftClaimed:false,defaultLayoutMigrated:false,functionalLayoutMigrated:false,nextId:1};
    p.housing.owned=p.housing.owned&&typeof p.housing.owned==='object'?p.housing.owned:{};
    p.housing.owned[key]=(p.housing.owned[key]||0)+qty;
  }
  function grantReward(id,reward){
    const p=prog(),t=ensureState(p),claimKey=id+':'+reward.at;
    if(t.rewardClaims[claimKey])return false;
    if((t.friendship[id]||0)<reward.at)return false;
    t.rewardClaims[claimKey]=true;
    if(reward.type==='coins')t.coins+=reward.qty||0;
    else if(reward.type==='item'){if(addInventoryItem)addInventoryItem(reward.key,reward.qty||1,{silent:true});else inv()[reward.key]=(inv()[reward.key]||0)+(reward.qty||1);}
    else if(reward.type==='food')p.food[reward.key]=(p.food[reward.key]||0)+(reward.qty||1);
    else if(reward.type==='seedBundle'){for(const key of ['potato','carrot','tomato','strawberry','corn','pumpkin'])p.seeds[key]=(p.seeds[key]||0)+(key==='potato'||key==='carrot'||key==='tomato'?2:1);}
    else if(reward.type==='petBundle'){inv().carrot=(inv().carrot||0)+2;inv().tomato=(inv().tomato||0)+2;inv().fish=(inv().fish||0)+1;inv().mushroom=(inv().mushroom||0)+1;}
    else if(reward.type==='perk')t.perks[reward.key]=reward.value??1;
    else if(reward.type==='furniture')addFurniture(reward.key,reward.qty||1);
    persist();updateStatus();toast((RESIDENTS[id]?.name||id)+' 친밀도 보상 · '+reward.name);return true;
  }
  function claimFriendshipRewards(id){
    for(const r of FRIENDSHIP_REWARDS[id]||[])grantReward(id,r);
  }
  function nextRewardText(id){
    const t=ensureState(),f=t.friendship[id]||0;
    const next=(FRIENDSHIP_REWARDS[id]||[]).find(r=>f<r.at);
    return next?'다음 보상 ♥ '+next.at+' · '+next.name:'모든 친밀도 보상을 받았어요.';
  }
  function discountFor(kind){
    const perks=ensureState().perks||{};
    if(kind==='market')return Number(perks.marketDiscount)||0;
    if(kind==='hardware')return Number(perks.hardwareDiscount)||0;
    if(kind==='cafe')return Number(perks.cafeDiscount)||0;
    return 0;
  }
  function priceFor(kind,base){return Math.max(1,Math.round(base*(1-discountFor(kind))))}
  function hour(){return ((prog().survival.time%1440)+1440)%1440/60}
  function isOpen(kind){
    const h=HOURS[kind];if(!h)return true;
    const now=hour();return now>=h.open&&now<h.close;
  }
  function closedPanel(kind,npcName){
    const h=HOURS[kind],title=kind==='market'?'씨앗마트':kind==='hardware'?'튼튼 철물점':'하늘 카페';
    openPanel('<h2>'+npcName+' · '+title+'</h2><p>지금은 문을 닫았어요.</p><p><b>영업시간 '+h.label+'</b></p><small>시간을 보내거나 집에서 자고 다시 와보세요.</small>');
  }

  function itemUnlockState(d){
    const t=ensureState(),friend=d.friend?Number(t.friendship[d.friend]||0):999;
    if(d.friend&&friend<(d.needFriend||0))return {ok:false,text:(RESIDENTS[d.friend]?.name||d.friend)+' 친밀도 ♥ '+d.needFriend};
    if(d.type==='backpack'&&(prog().homestead?.backpackLevel||1)>=d.level)return {ok:false,text:'이미 사용 중이거나 더 좋은 가방 보유'};
    return {ok:true,text:''};
  }
  function shop(kind,npcName='상인'){
    if(!isOpen(kind)){closedPanel(kind,npcName);return;}
    const p=prog(),t=ensureState(p),items=BUY[kind]||{};
    const buyCards=Object.entries(items).map(([key,d])=>{const price=priceFor(kind,d.price),lock=itemUnlockState(d);return '<div class="item"><b>'+(lock.ok?'':'🔒 ')+d.name+'</b><div>'+price+' 코인'+(price<d.price?' <small>(단골 할인)</small>':'')+'</div>'+(lock.text?'<small>'+lock.text+'</small><br>':'')+'<button data-city-buy="'+kind+':'+key+'" '+(lock.ok?'':'disabled')+'>구매</button></div>';}).join('');
    const sellCards=kind==='market'?Object.entries(SELL).map(([key,price])=>'<div class="item"><b>'+itemName(key)+'</b><div>1개당 '+price+' 코인</div><button data-city-sell="'+key+'" '+((inv()[key]||0)>0?'':'disabled')+'>1개 팔기</button></div>').join(''):'';
    const delivery=kind==='cafe'&&t.delivery.active&&t.delivery.target==='cafe'
      ?'<h3>📦 배달</h3><div class="item"><b>현우의 배달 상자</b><div>하늘에게 전달하면 95코인</div><button data-city-delivery-complete="1">배달 완료</button></div>'
      :'';
    const title=kind==='market'?'씨앗마트':kind==='hardware'?'튼튼 철물점':'하늘 카페';
    openPanel('<h2>'+npcName+' · '+title+'</h2><p><b>보유 '+t.coins+' 코인</b> · 영업 '+HOURS[kind].label+'</p><div class="grid">'+buyCards+'</div>'+(sellCards?'<h3>내 물건 팔기</h3><div class="grid">'+sellCards+'</div>':'')+delivery);
  }
  function buy(kind,key){
    const d=BUY[kind]?.[key];if(!d)return;
    const unlock=itemUnlockState(d);if(!unlock.ok){toast(unlock.text);return;}
    const p=prog(),t=ensureState(p),price=priceFor(kind,d.price);if(t.coins<price){toast('코인이 부족해요.');return;}
    if(d.type==='inv'&&canCarryNewKey&&!canCarryNewKey(d.key)){toast('🎒 가방에 빈 칸이 없어요.');return;}
    t.coins-=price;
    if(d.type==='seed')p.seeds[d.key]=(p.seeds[d.key]||0)+d.qty;
    else if(d.type==='inv'){if(addInventoryItem)addInventoryItem(d.key,d.qty,{silent:true});else inv()[d.key]=(inv()[d.key]||0)+d.qty;}
    else if(d.type==='food')p.food[d.key]=(p.food[d.key]||0)+d.qty;
    else if(d.type==='furniture'){
      p.housing=p.housing&&typeof p.housing==='object'?p.housing:{version:3,owned:{},placed:[],starterGiftClaimed:false,defaultLayoutMigrated:false,functionalLayoutMigrated:false,nextId:1};
      p.housing.owned=p.housing.owned&&typeof p.housing.owned==='object'?p.housing.owned:{};
      p.housing.owned[d.key]=(p.housing.owned[d.key]||0)+(d.qty||1);
    }
    else if(d.type==='tool')p.tools[d.key]={dur:d.dur,max:d.dur,tier:d.tier,boughtAt:Date.now()};
    else if(d.type==='backpack')p.homestead.backpackLevel=Math.max(p.homestead.backpackLevel||1,d.level);
    persist();setAvatarAction('smile',500);playSfx?.('purchase',.18);toast(d.name+' 구매!');updateStatus();
    shop(kind,kind==='market'?'민지':kind==='hardware'?'준호':'하늘');
  }
  function sell(key){
    const price=SELL[key],i=inv();if(!price||(i[key]||0)<=0)return;
    i[key]--;ensureState().coins+=price;persist();playSfx?.('pickup',.16);toast(itemName(key)+' 판매 +'+price+' 코인');updateStatus();shop('market','민지');
  }

  function jobs(){
    const p=prog(),t=ensureState(p),day=p.survival.day;
    const cards=Object.entries(JOBS).map(([id,j])=>'<div class="item"><b>'+j.name+'</b><div>보상 '+j.reward+' 코인</div><small>체력 -'+j.energy+' · 허기 -'+j.hunger+'</small><br><button data-city-job="'+id+'" '+(t.jobs[id]===day?'disabled':'')+'>'+(t.jobs[id]===day?'오늘 완료':'일하기')+'</button></div>').join('');
    const deliveryStatus=t.delivery.completedDay===day?'오늘 배달 완료':t.delivery.active?'배달 진행 중':'현우에게 가면 배달 일을 받을 수 있어요.';
    openPanel('<h2>오늘의 일거리</h2><p>도윤: “마을 일을 도와주면 코인을 벌 수 있어!”</p><div class="grid">'+cards+'</div><p>📦 '+deliveryStatus+'</p>');
  }
  function doJob(id){
    const p=prog(),t=ensureState(p),j=JOBS[id];if(!j)return;
    if(t.jobs[id]===p.survival.day){toast('이 일은 오늘 이미 했어요.');return;}
    if(p.energy<j.energy||p.survival.hunger<j.hunger){toast('체력이나 허기가 부족해요.');return;}
    p.energy-=j.energy;p.survival.hunger=Math.max(0,p.survival.hunger-j.hunger);
    const bonus=1+(Number(t.perks.jobBonus)||0);const reward=Math.round(j.reward*bonus);
    t.coins+=reward;t.jobs[id]=p.survival.day;t.fun=Math.max(0,t.fun-3);
    persist();setAvatarAction('smile',700);playSfx?.('success',.10);toast(j.name+' 완료! +'+reward+' 코인');updateStatus();jobs();
  }

  function delivery(){
    const p=prog(),t=ensureState(p),day=p.survival.day;
    if(t.delivery.completedDay===day){
      openPanel('<h2>현우 · 배달소</h2><p>“오늘 배달은 이미 끝났어. 고마워!”</p>');return;
    }
    if(t.delivery.active){
      openPanel('<h2>현우 · 배달소</h2><p>📦 <b>하늘 카페</b>에 상자를 전달해줘.</p><p>완료 보상 95코인</p>');return;
    }
    openPanel('<h2>현우 · 배달소</h2><p>“하늘 카페에 이 상자를 가져다줄래?”</p><p>완료 보상 <b>95코인</b></p><button data-city-delivery-start="1">배달 맡기</button>');
  }
  function startDelivery(){
    const p=prog(),t=ensureState(p),day=p.survival.day;
    if(t.delivery.completedDay===day||t.delivery.active)return;
    t.delivery.active=true;t.delivery.target='cafe';t.delivery.startedDay=day;
    persist();toast('배달 시작! 하늘 카페로 가세요.');updateStatus();delivery();
  }
  function completeDelivery(){
    const p=prog(),t=ensureState(p),day=p.survival.day;
    if(!t.delivery.active||t.delivery.target!=='cafe')return;
    const reward=t.delivery.reward+(Number(t.perks.deliveryBonus)||0);
    t.delivery.active=false;t.delivery.completedDay=day;t.coins+=reward;
    t.friendship.haneul=(t.friendship.haneul||0)+1;t.friendship.hyunwoo=(t.friendship.hyunwoo||0)+1;t.fun=Math.min(100,t.fun+6);
    claimFriendshipRewards('haneul');claimFriendshipRewards('hyunwoo');
    persist();setAvatarAction('smile',800);playSfx?.('success',.11);toast('배달 완료! +'+reward+' 코인');updateStatus();shop('cafe','하늘');
  }

  function talk(id,name=RESIDENTS[id]?.name||id){
    const p=prog(),t=ensureState(p),day=p.survival.day;
    let grew=false;
    if(t.talked[id]!==day){t.talked[id]=day;t.friendship[id]=(t.friendship[id]||0)+1;grew=true;persist();}
    if(grew)claimFriendshipRewards(id);
    const f=t.friendship[id]||0,custom=TALK_LINES[id]||[];
    const generic=f<3?['처음 보는 얼굴이네! 씨앗마을에 온 걸 환영해.','마을에는 낮과 밤마다 분위기가 조금 달라져.']:
      f<7?['요즘 꽤 자주 보네. 농장은 잘 되어가?','일만 하지 말고 광장에서도 쉬어가!']:
      ['이제 완전히 우리 마을 주민 같아!','오래 알고 지낸 친구에게만 해주는 이야기도 있어.'];
    const lines=custom.length?custom:generic;
    openPanel('<h2>'+name+' · 대화</h2><p>'+lines[p.survival.day%lines.length]+'</p><p>친밀도 ♥ '+f+(grew?' <small>오늘 +1</small>':' <small>오늘 대화 완료</small>')+'</p><p><small>'+nextRewardText(id)+'</small></p><button data-resident-back="'+id+'">주민 카드로</button>');
  }
  function giftPanel(id){
    const r=RESIDENTS[id];if(!r)return;
    const p=prog(),t=ensureState(p),day=p.survival.day,foods=Object.entries(p.food||{}).filter(([,qty])=>Number(qty)>0);
    const cards=foods.map(([key,qty])=>{
      const favorite=(GIFT_FAVORITES[id]||[]).includes(key);
      return '<div class="item"><b>'+(favorite?'💖 ':'🍱 ')+foodName(key)+'</b><div>'+qty+'개</div><button data-resident-gift="'+id+':'+key+'" '+(t.gifts[id]===day?'disabled':'')+'>선물하기</button></div>';
    }).join('');
    openPanel('<h2>🎁 '+r.name+'에게 요리 선물</h2><p>좋아하는 요리를 주면 친밀도가 더 많이 올라가요. 하루 한 번 선물할 수 있어요.</p><div class="grid">'+(cards||'<div class="item">가방에 선물할 요리가 없어요.</div>')+'</div><button data-resident-back="'+id+'">돌아가기</button>');
  }
  function giftFood(id,key){
    const p=prog(),t=ensureState(p),day=p.survival.day;if(t.gifts[id]===day){toast('오늘은 이미 선물했어요.');return;}
    if((p.food[key]||0)<=0){toast('그 요리가 없어요.');return;}
    p.food[key]--;t.gifts[id]=day;
    const favorite=(GIFT_FAVORITES[id]||[]).includes(key),gain=favorite?2:1;
    t.friendship[id]=(t.friendship[id]||0)+gain;t.fun=Math.min(100,t.fun+(favorite?4:2));
    claimFriendshipRewards(id);persist();setAvatarAction('smile',750);playSfx?.('success',.10);toast((RESIDENTS[id]?.name||id)+' 친밀도 ♥ +'+gain+(favorite?' · 정말 좋아해요!':''));updateStatus();resident(id);
  }
  function resident(id){
    const r=RESIDENTS[id];if(!r)return;
    const t=ensureState(),f=t.friendship[id]||0,rewards=FRIENDSHIP_REWARDS[id]||[];
    const rewardHtml=rewards.map(x=>'<div class="item"><b>♥ '+x.at+'</b><div>'+x.name+'</div><small>'+(t.rewardClaims[id+':'+x.at]?'획득 완료':f>=x.at?'획득 가능':'친밀도 필요')+'</small></div>').join('');
    openPanel('<h2>'+r.name+' · '+r.role+'</h2><p>친밀도 <b>♥ '+f+'</b></p><div class="grid"><button data-resident-talk="'+id+'">💬 대화하기</button><button data-resident-gift-open="'+id+'">🎁 요리 선물</button><button data-resident-service="'+id+'">'+r.serviceLabel+'</button></div><h3>친밀도 보상</h3><div class="grid">'+rewardHtml+'</div>');
  }
  function residentService(id){
    const r=RESIDENTS[id];if(!r)return;
    if(r.service==='market')return shop('market',r.name);
    if(r.service==='hardware')return shop('hardware',r.name);
    if(r.service==='cafe')return shop('cafe',r.name);
    if(r.service==='jobs')return jobs();
    if(r.service==='arcade')return arcade();
    if(r.service==='library')return library();
    if(r.service==='delivery')return delivery();
    if(r.service==='clinic')return clinic();
    if(r.service==='transport')return transport();
    if(r.service==='advice')return openPanel('<h2>유나 · 농사 조언</h2><p>익은 작물은 바로 수확하면 씨앗도 다시 얻을 수 있어. 친해지면 수확하는 요령도 알려줄게.</p><button data-resident-back="yuna">돌아가기</button>');
    if(r.service==='forest')return openPanel('<h2>우진 · 숲 정보</h2><p>깊은 숲에서는 버섯이 잘 보여. 여우와 함께라면 더 많이 모을 수 있고, 나와 친해져도 채집 요령을 배울 수 있어.</p><button data-resident-back="woojin">돌아가기</button>');
    if(r.service==='pets')return openPanel('<h2>서연 · Cube Pets</h2><p>동물마다 좋아하는 재료가 달라. 친해지면 길들이기에 필요한 먹이를 조금 아끼는 방법을 알려줄게.</p><button data-resident-back="seoyeon">돌아가기</button>');
  }

  function arcade(){
    const t=ensureState(),cost=Math.max(1,8-(Number(t.perks.arcadeDiscount)||0));
    openPanel('<h2>태호 · 키즈 아케이드</h2><p>한 판 '+cost+'코인. 이기면 재미가 크게 올라가고, 오늘 첫 승리에는 작은 코인 상품도 있어!</p><p><b>보유 '+t.coins+' 코인</b></p><div class="grid"><button data-city-rps="rock">✊ 바위</button><button data-city-rps="paper">✋ 보</button><button data-city-rps="scissors">✌️ 가위</button></div>');
  }
  function playRps(choice){
    const p=prog(),t=ensureState(p),day=p.survival.day,cost=Math.max(1,8-(Number(t.perks.arcadeDiscount)||0));
    if(t.coins<cost){toast('아케이드 이용료 '+cost+'코인이 필요해요.');return;}
    t.coins-=cost;
    const options=['rock','paper','scissors'],cpu=options[Math.floor(Math.random()*3)];
    const win=(choice==='rock'&&cpu==='scissors')||(choice==='paper'&&cpu==='rock')||(choice==='scissors'&&cpu==='paper');
    const tie=choice===cpu;
    const name={rock:'바위',paper:'보',scissors:'가위'};
    let msg='태호는 '+name[cpu]+'!';
    if(win){
      t.fun=Math.min(100,t.fun+18);
      if(t.dailyPlay.arcadePrizeDay!==day){t.dailyPlay.arcadePrizeDay=day;t.coins+=15;msg+=' 승리! 오늘의 첫 승리 상품 +15코인';}
      else msg+=' 승리! 재미 +18';
    }else if(tie){t.fun=Math.min(100,t.fun+9);msg+=' 비겼어요. 재미 +9';}
    else{t.fun=Math.min(100,t.fun+5);msg+=' 아쉽게 졌어요. 재미 +5';}
    p.energy=Math.max(0,p.energy-1);persist();setAvatarAction('smile',650);toast(msg);updateStatus();arcade();
  }

  function library(){
    const p=prog(),t=ensureState(p),day=p.survival.day;
    const tip=LIBRARY_TIPS[day%LIBRARY_TIPS.length];
    let bonus='';
    if(t.libraryDay!==day){const energy=2+(Number(t.perks.libraryEnergyBonus)||0);t.libraryDay=day;t.fun=Math.min(100,t.fun+8);p.energy=Math.min(p.maxEnergy,p.energy+energy);bonus='<p>오늘의 독서 보너스: 재미 +8 · 체력 +'+energy+'</p>';persist();updateStatus();}
    openPanel('<h2>소라 · 마을 도서관</h2><p>📖 '+tip+'</p>'+bonus+'<p>조용히 쉬어가도 좋아요.</p>');
  }
  function clinic(){
    const p=prog(),t=ensureState(p),missing=Math.max(0,p.maxEnergy-p.energy);
    if(missing<1){openPanel('<h2>나리 · 튼튼 보건소</h2><p>지금은 아주 건강해 보여요!</p>');return;}
    const fee=Math.max(5,25-(Number(t.perks.clinicDiscount)||0));openPanel('<h2>나리 · 튼튼 보건소</h2><p>진료비 '+fee+'코인으로 체력을 전부 회복할 수 있어요.</p><p>현재 체력 '+Math.round(p.energy)+' / '+p.maxEnergy+' · 보유 '+t.coins+'코인</p><button data-city-clinic="1">진료받기</button>');
  }
  function heal(){
    const p=prog(),t=ensureState(p),fee=Math.max(5,25-(Number(t.perks.clinicDiscount)||0));if(t.coins<fee){toast('코인이 부족해요.');return;}
    if(p.energy>=p.maxEnergy){toast('이미 건강해요.');return;}
    t.coins-=fee;p.energy=p.maxEnergy;persist();setAvatarAction('smile',650);toast('체력이 모두 회복됐어요.');updateStatus();clinic();
  }

  function transport(){
    const unlocked=!!ensureState().perks.riverBus;
    openPanel('<h2>민석 · 씨앗버스</h2><p>지금은 마을 시범 운행 기간이라 무료예요.</p><div class="grid"><button data-city-travel="home">🏠 집 구역</button><button data-city-travel="forest">🌲 깊은 숲</button><button data-city-travel="quarry">⛏️ 광산</button><button data-city-travel="ranch">🐄 목장</button><button data-city-travel="beach">🏖️ 해변</button><button data-city-travel="camp">🔥 야영지</button><button data-city-travel="city">🏙️ 상점가</button>'+(unlocked?'<button data-city-travel="river">🌉 북쪽 강가</button>':'')+'</div>'+(unlocked?'':'<p><small>민석과 더 친해지면 북쪽 강가 노선을 열 수 있어요.</small></p>'));
  }

  function bench(){
    const p=prog(),t=ensureState(p);p.energy=Math.min(p.maxEnergy,p.energy+7);t.fun=Math.min(100,t.fun+8);
    persist();toast('도시 벤치에서 쉬었어요.');updateStatus();
  }
  function tick(dt){const t=ensureState();t.fun=Math.max(0,t.fun-dt*.006)}

  function handlePanelClick(e){
    const rt=e.target.closest('[data-resident-talk]');if(rt){talk(rt.dataset.residentTalk);return true;}
    const giftOpen=e.target.closest('[data-resident-gift-open]');if(giftOpen){giftPanel(giftOpen.dataset.residentGiftOpen);return true;}
    const gift=e.target.closest('[data-resident-gift]');if(gift){const [id,key]=gift.dataset.residentGift.split(':');giftFood(id,key);return true;}
    const rs=e.target.closest('[data-resident-service]');if(rs){residentService(rs.dataset.residentService);return true;}
    const rb=e.target.closest('[data-resident-back]');if(rb){resident(rb.dataset.residentBack);return true;}
    const buyBtn=e.target.closest('[data-city-buy]');
    if(buyBtn){const [kind,key]=buyBtn.dataset.cityBuy.split(':');buy(kind,key);return true;}
    const sellBtn=e.target.closest('[data-city-sell]');if(sellBtn){sell(sellBtn.dataset.citySell);return true;}
    const jobBtn=e.target.closest('[data-city-job]');if(jobBtn){doJob(jobBtn.dataset.cityJob);return true;}
    if(e.target.closest('[data-city-delivery-start]')){startDelivery();return true;}
    if(e.target.closest('[data-city-delivery-complete]')){completeDelivery();return true;}
    const rps=e.target.closest('[data-city-rps]');if(rps){playRps(rps.dataset.cityRps);return true;}
    if(e.target.closest('[data-city-clinic]')){heal();return true;}
    const tr=e.target.closest('[data-city-travel]');if(tr){travel?.(tr.dataset.cityTravel);return true;}
    return false;
  }

  return {
    ensureState,shop,jobs,delivery,talk,giftPanel,giftFood,resident,residentService,arcade,library,clinic,transport,bench,tick,handlePanelClick,
    BUY,SELL,JOBS,HOURS,RESIDENTS,FRIENDSHIP_REWARDS
  };
}
