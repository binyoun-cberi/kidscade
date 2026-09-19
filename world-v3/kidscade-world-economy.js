export function createTownEconomy(ctx){
  const {prog,inv,openPanel,toast,persist,updateStatus,setAvatarAction,itemName,travel}=ctx;

  const BUY={
    market:{
      seedPotato:{name:'감자 씨앗',price:12,type:'seed',key:'potato',qty:1},
      seedCarrot:{name:'당근 씨앗',price:12,type:'seed',key:'carrot',qty:1},
      seedTomato:{name:'토마토 씨앗',price:16,type:'seed',key:'tomato',qty:1},
      lunch:{name:'도시락',price:34,type:'food',key:'cityLunch',qty:1}
    },
    hardware:{
      wood3:{name:'목재 3개',price:24,type:'inv',key:'wood',qty:3},
      stone3:{name:'돌 3개',price:24,type:'inv',key:'stone',qty:3},
      axe:{name:'돌도끼',price:72,type:'tool',key:'axe',tier:'stone',dur:18},
      pick:{name:'돌곡괭이',price:82,type:'tool',key:'pick',tier:'stone',dur:18}
    },
    cafe:{
      toast:{name:'카페 토스트',price:26,type:'food',key:'cafeToast',qty:1},
      lunch:{name:'도시락',price:36,type:'food',key:'cityLunch',qty:1}
    }
  };
  const SELL={wood:4,stone:4,iron:12,fish:14,potato:8,carrot:8,tomato:10,mushroom:10};
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
  const TALK_LINES={
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
      '카페 토스트 먹어봤어? 탐험 전에 먹으면 든든해.',
      '언젠가는 여기서 축제도 열렸으면 좋겠다.'
    ]
  };
  const LIBRARY_TIPS=[
    '나뭇가지와 작은 돌은 도구 없이 주울 수 있어요.',
    '비버와 동행하면 벌목할 때 목재를 하나 더 얻어요.',
    '고양이와 함께라면 밤 야외 피로가 줄어요.',
    '철도구는 돌도구보다 내구도가 높고 채집 효율도 좋아요.',
    '농작물과 물고기는 씨앗마트에서 코인으로 팔 수 있어요.'
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
  function hour(){return ((prog().survival.time%1440)+1440)%1440/60}
  function isOpen(kind){
    const h=HOURS[kind];if(!h)return true;
    const now=hour();return now>=h.open&&now<h.close;
  }
  function closedPanel(kind,npcName){
    const h=HOURS[kind],title=kind==='market'?'씨앗마트':kind==='hardware'?'튼튼 철물점':'하늘 카페';
    openPanel('<h2>'+npcName+' · '+title+'</h2><p>지금은 문을 닫았어요.</p><p><b>영업시간 '+h.label+'</b></p><small>시간을 보내거나 집에서 자고 다시 와보세요.</small>');
  }

  function shop(kind,npcName='상인'){
    if(!isOpen(kind)){closedPanel(kind,npcName);return;}
    const p=prog(),t=ensureState(p),items=BUY[kind]||{};
    const buyCards=Object.entries(items).map(([key,d])=>'<div class="item"><b>'+d.name+'</b><div>'+d.price+' 코인</div><button data-city-buy="'+kind+':'+key+'">구매</button></div>').join('');
    const sellCards=kind==='market'?Object.entries(SELL).map(([key,price])=>'<div class="item"><b>'+itemName(key)+'</b><div>1개당 '+price+' 코인</div><button data-city-sell="'+key+'" '+((inv()[key]||0)>0?'':'disabled')+'>1개 팔기</button></div>').join(''):'';
    const delivery=kind==='cafe'&&t.delivery.active&&t.delivery.target==='cafe'
      ?'<h3>📦 배달</h3><div class="item"><b>현우의 배달 상자</b><div>하늘에게 전달하면 95코인</div><button data-city-delivery-complete="1">배달 완료</button></div>'
      :'';
    const title=kind==='market'?'씨앗마트':kind==='hardware'?'튼튼 철물점':'하늘 카페';
    openPanel('<h2>'+npcName+' · '+title+'</h2><p><b>보유 '+t.coins+' 코인</b> · 영업 '+HOURS[kind].label+'</p><div class="grid">'+buyCards+'</div>'+(sellCards?'<h3>내 물건 팔기</h3><div class="grid">'+sellCards+'</div>':'')+delivery);
  }
  function buy(kind,key){
    const d=BUY[kind]?.[key];if(!d)return;
    const p=prog(),t=ensureState(p);if(t.coins<d.price){toast('코인이 부족해요.');return;}
    t.coins-=d.price;
    if(d.type==='seed')p.seeds[d.key]=(p.seeds[d.key]||0)+d.qty;
    else if(d.type==='inv')inv()[d.key]=(inv()[d.key]||0)+d.qty;
    else if(d.type==='food')p.food[d.key]=(p.food[d.key]||0)+d.qty;
    else if(d.type==='tool')p.tools[d.key]={dur:d.dur,max:d.dur,tier:d.tier,boughtAt:Date.now()};
    persist();setAvatarAction('smile',500);toast(d.name+' 구매!');updateStatus();
    shop(kind,kind==='market'?'민지':kind==='hardware'?'준호':'하늘');
  }
  function sell(key){
    const price=SELL[key],i=inv();if(!price||(i[key]||0)<=0)return;
    i[key]--;ensureState().coins+=price;persist();toast(itemName(key)+' 판매 +'+price+' 코인');updateStatus();shop('market','민지');
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
    t.coins+=j.reward;t.jobs[id]=p.survival.day;t.fun=Math.max(0,t.fun-3);
    persist();setAvatarAction('smile',700);toast(j.name+' 완료! +'+j.reward+' 코인');updateStatus();jobs();
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
    t.delivery.active=false;t.delivery.completedDay=day;t.coins+=t.delivery.reward;
    t.friendship.haneul=(t.friendship.haneul||0)+1;t.fun=Math.min(100,t.fun+6);
    persist();setAvatarAction('smile',800);toast('배달 완료! +'+t.delivery.reward+' 코인');updateStatus();shop('cafe','하늘');
  }

  function talk(id,name){
    const p=prog(),t=ensureState(p),day=p.survival.day;
    if(t.talked[id]!==day){t.talked[id]=day;t.friendship[id]=(t.friendship[id]||0)+1;persist();}
    const f=t.friendship[id]||0,custom=TALK_LINES[id]||[];
    const generic=f<2?['처음 보는 얼굴이네! 씨앗마을에 온 걸 환영해.','마을에는 낮과 밤마다 분위기가 조금 달라져.']:
      f<5?['요즘 꽤 자주 보네. 농장은 잘 되어가?','일만 하지 말고 광장에서도 쉬어가!']:
      ['이제 완전히 우리 마을 주민 같아!','다음에는 마을 축제도 같이 준비하자.'];
    const lines=custom.length?custom:generic;
    openPanel('<h2>'+name+'</h2><p>'+lines[p.survival.day%lines.length]+'</p><p>친밀도 ♥ '+f+'</p>');
  }

  function arcade(){
    const t=ensureState();
    openPanel('<h2>태호 · 키즈 아케이드</h2><p>한 판 8코인. 이기면 재미가 크게 올라가고, 오늘 첫 승리에는 작은 코인 상품도 있어!</p><p><b>보유 '+t.coins+' 코인</b></p><div class="grid"><button data-city-rps="rock">✊ 바위</button><button data-city-rps="paper">✋ 보</button><button data-city-rps="scissors">✌️ 가위</button></div>');
  }
  function playRps(choice){
    const p=prog(),t=ensureState(p),day=p.survival.day;
    if(t.coins<8){toast('아케이드 이용료 8코인이 필요해요.');return;}
    t.coins-=8;
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
    if(t.libraryDay!==day){t.libraryDay=day;t.fun=Math.min(100,t.fun+8);p.energy=Math.min(p.maxEnergy,p.energy+2);bonus='<p>오늘의 독서 보너스: 재미 +8 · 체력 +2</p>';persist();updateStatus();}
    openPanel('<h2>소라 · 마을 도서관</h2><p>📖 '+tip+'</p>'+bonus+'<p>조용히 쉬어가도 좋아요.</p>');
  }
  function clinic(){
    const p=prog(),t=ensureState(p),missing=Math.max(0,p.maxEnergy-p.energy);
    if(missing<1){openPanel('<h2>나리 · 튼튼 보건소</h2><p>지금은 아주 건강해 보여요!</p>');return;}
    openPanel('<h2>나리 · 튼튼 보건소</h2><p>진료비 25코인으로 체력을 전부 회복할 수 있어요.</p><p>현재 체력 '+Math.round(p.energy)+' / '+p.maxEnergy+' · 보유 '+t.coins+'코인</p><button data-city-clinic="1">진료받기</button>');
  }
  function heal(){
    const p=prog(),t=ensureState(p);if(t.coins<25){toast('코인이 부족해요.');return;}
    if(p.energy>=p.maxEnergy){toast('이미 건강해요.');return;}
    t.coins-=25;p.energy=p.maxEnergy;persist();setAvatarAction('smile',650);toast('체력이 모두 회복됐어요.');updateStatus();clinic();
  }

  function transport(){
    openPanel('<h2>민석 · 씨앗버스</h2><p>지금은 마을 시범 운행 기간이라 무료예요.</p><div class="grid"><button data-city-travel="home">🏠 집 앞</button><button data-city-travel="forest">🌲 깊은 숲</button><button data-city-travel="quarry">⛏️ 돌산</button><button data-city-travel="camp">🔥 야영지</button><button data-city-travel="city">🏙️ 중심가</button></div>');
  }

  function bench(){
    const p=prog(),t=ensureState(p);p.energy=Math.min(p.maxEnergy,p.energy+7);t.fun=Math.min(100,t.fun+8);
    persist();toast('도시 벤치에서 쉬었어요.');updateStatus();
  }
  function tick(dt){const t=ensureState();t.fun=Math.max(0,t.fun-dt*.006)}

  function handlePanelClick(e){
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
    ensureState,shop,jobs,delivery,talk,arcade,library,clinic,transport,bench,tick,handlePanelClick,
    BUY,SELL,JOBS,HOURS
  };
}
