export function createTownEconomy(ctx){
  const {prog,inv,openPanel,toast,persist,updateStatus,setAvatarAction,itemName}=ctx;

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

  function ensureState(p=prog()){
    const old=p.town&&typeof p.town==='object'?p.town:{};
    p.town={
      coins:Number.isFinite(Number(old.coins))?Math.max(0,Math.floor(Number(old.coins))):120,
      fun:Number.isFinite(Number(old.fun))?Math.max(0,Math.min(100,Number(old.fun))):80,
      jobs:old.jobs&&typeof old.jobs==='object'?old.jobs:{},
      friendship:old.friendship&&typeof old.friendship==='object'?old.friendship:{},
      talked:old.talked&&typeof old.talked==='object'?old.talked:{},
      visits:Math.max(0,Math.floor(Number(old.visits)||0)
      )
    };
    return p.town;
  }
  function shop(kind,npcName='상인'){
    const p=prog(),t=ensureState(p),items=BUY[kind]||{};
    const buyCards=Object.entries(items).map(([key,d])=>'<div class="item"><b>'+d.name+'</b><div>'+d.price+' 코인</div><button data-city-buy="'+kind+':'+key+'">구매</button></div>').join('');
    const sellCards=kind==='market'?Object.entries(SELL).map(([key,price])=>'<div class="item"><b>'+itemName(key)+'</b><div>1개당 '+price+' 코인</div><button data-city-sell="'+key+'" '+((inv()[key]||0)>0?'':'disabled')+'>1개 팔기</button></div>').join(''):'';
    const title=kind==='market'?'씨앗마트':kind==='hardware'?'튼튼 철물점':'하늘 카페';
    openPanel('<h2>'+npcName+' · '+title+'</h2><p><b>보유 '+t.coins+' 코인</b></p><div class="grid">'+buyCards+'</div>'+(sellCards?'<h3>내 물건 팔기</h3><div class="grid">'+sellCards+'</div>':''));
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
    openPanel('<h2>오늘의 일거리</h2><p>도윤: “돈이 필요하면 마을 일부터 해봐!”</p><div class="grid">'+cards+'</div>');
  }
  function doJob(id){
    const p=prog(),t=ensureState(p),j=JOBS[id];if(!j)return;
    if(t.jobs[id]===p.survival.day){toast('이 일은 오늘 이미 했어요.');return;}
    if(p.energy<j.energy||p.survival.hunger<j.hunger){toast('체력이나 허기가 부족해요.');return;}
    p.energy-=j.energy;p.survival.hunger=Math.max(0,p.survival.hunger-j.hunger);
    t.coins+=j.reward;t.jobs[id]=p.survival.day;t.fun=Math.max(0,t.fun-3);
    persist();setAvatarAction('smile',700);toast(j.name+' 완료! +'+j.reward+' 코인');updateStatus();jobs();
  }
  function talk(id,name){
    const p=prog(),t=ensureState(p),day=p.survival.day;
    if(t.talked[id]!==day){t.talked[id]=day;t.friendship[id]=(t.friendship[id]||0)+1;persist();}
    const f=t.friendship[id]||0;
    const lines=f<2?['처음 보는 얼굴이네! 씨앗마을에 온 걸 환영해.','도시는 남쪽 길을 따라오면 언제든 다시 올 수 있어.']:
      f<5?['요즘 꽤 자주 보네. 농장은 잘 되어가?','광장 벤치에 앉아 쉬어가는 것도 좋아.']:
      ['이제 완전히 우리 마을 주민 같아!','다음 축제가 열리면 꼭 같이 놀자.'];
    openPanel('<h2>'+name+'</h2><p>'+lines[p.survival.day%lines.length]+'</p><p>친밀도 ♥ '+f+'</p>');
  }
  function arcade(){
    const p=prog(),t=ensureState(p);if(t.coins<20){toast('아케이드 이용료 20코인이 필요해요.');return;}
    t.coins-=20;t.fun=Math.min(100,t.fun+32);p.energy=Math.max(0,p.energy-3);
    persist();setAvatarAction('smile',900);toast('아케이드에서 신나게 놀았어요! 재미 +32');updateStatus();
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
    return false;
  }

  return {ensureState,shop,jobs,talk,arcade,bench,tick,handlePanelClick,BUY,SELL,JOBS};
}
