/* Kidscade Seed World meta loop: game parcels, trophies, daily life goals and seed cosmetics. */
((factory)=>{
  const root=typeof window!=='undefined'?window:null;
  const api=factory(root);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.KidscadeSeedWorldMeta=Object.freeze(api);
})(root=>{
  'use strict';
  const KEY='kidscade_seed_world_meta_v1';
  const VERSION=1;
  const CHANGE_EVENT='kidscade-seed-world-meta-change';

  const CATEGORY_GIFTS=Object.freeze({
    math:{icon:'🧱',name:'수학 공방 재료 상자',reward:{kind:'resources',items:{wood:1,stone:2}}},
    korean:{icon:'📚',name:'국어 책장 재료 꾸러미',reward:{kind:'resources',items:{wood:3}}},
    lang:{icon:'🌎',name:'세계 기념품 교환권',reward:{kind:'townCoins',amount:35}},
    trivia:{icon:'🔬',name:'탐험 표본 상자',reward:{kind:'resources',items:{iron:1,mushroom:1}}},
    music:{icon:'🎵',name:'신나는 음반 선물',reward:{kind:'fun',amount:15}},
    job:{icon:'🧰',name:'직업 체험 수당',reward:{kind:'townCoins',amount:40}},
    all:{icon:'🎁',name:'게임 도전 선물',reward:{kind:'townCoins',amount:25}}
  });
  const TROPHY_ICONS=Object.freeze({math:'🧮',korean:'📖',lang:'🌐',trivia:'🔎',music:'🎼',job:'🧰',all:'🏆'});
  const COSMETICS=Object.freeze([
    {id:'leafAura',name:'새싹 오라',icon:'🍃',price:60,kind:'aura',color:0x75b84b,desc:'발밑에 싱그러운 초록빛 고리가 생겨요.'},
    {id:'starAura',name:'별빛 오라',icon:'⭐',price:100,kind:'aura',color:0xf4d35e,desc:'발밑에 따뜻한 별빛 고리가 생겨요.'},
    {id:'skyAura',name:'하늘 오라',icon:'💠',price:140,kind:'aura',color:0x56a9d8,desc:'발밑에 시원한 하늘빛 고리가 생겨요.'},
    {id:'festivalAura',name:'축제 오라',icon:'🎉',price:190,kind:'aura',color:0xe86aa8,desc:'희귀한 축제빛 오라를 둘러요.'}
  ]);

  function dateKey(date=new Date()){
    const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');
    return y+'-'+m+'-'+d;
  }
  function parse(raw,fallback){try{return raw?JSON.parse(raw):fallback}catch(_){return fallback}}
  function fresh(){
    return {
      version:VERSION,
      mailbox:[],
      trophies:{},
      daily:null,
      cosmetics:{owned:[],equipped:''},
      createdAt:Date.now(),
      updatedAt:Date.now()
    };
  }
  function normalize(raw){
    const base=fresh(),src=raw&&typeof raw==='object'?raw:{};
    base.mailbox=Array.isArray(src.mailbox)?src.mailbox.filter(Boolean).slice(-40):[];
    base.trophies=src.trophies&&typeof src.trophies==='object'?{...src.trophies}:{};
    const cos=src.cosmetics&&typeof src.cosmetics==='object'?src.cosmetics:{};
    base.cosmetics={
      owned:Array.isArray(cos.owned)?[...new Set(cos.owned.filter(id=>COSMETICS.some(c=>c.id===id)))]:[],
      equipped:COSMETICS.some(c=>c.id===cos.equipped)?cos.equipped:''
    };
    base.daily=src.daily&&typeof src.daily==='object'?src.daily:null;
    base.createdAt=Number(src.createdAt)||base.createdAt;
    base.updatedAt=Number(src.updatedAt)||Date.now();
    return base;
  }
  function read(){
    if(!root?.localStorage)return fresh();
    return normalize(parse(root.localStorage.getItem(KEY),null));
  }
  function emit(detail={}){
    try{root?.dispatchEvent?.(new CustomEvent(CHANGE_EVENT,{detail}))}catch(_){}
  }
  function write(state,detail={}){
    state=normalize(state);state.updatedAt=Date.now();
    try{root?.localStorage?.setItem(KEY,JSON.stringify(state))}catch(_){}
    emit({state,...detail});return state;
  }
  function dailyTemplate(date=new Date()){
    return {
      date:dateKey(date),
      tasks:[
        {id:'mail',icon:'📬',title:'도착한 선물 열기',goal:1,progress:0},
        {id:'harvest',icon:'🥕',title:'작물이나 목장 생산물 수확하기',goal:1,progress:0},
        {id:'explore',icon:'🗺️',title:'서로 다른 구역 2곳 둘러보기',goal:2,progress:0}
      ],
      visitedZones:[],
      bonusQueued:false
    };
  }
  function ensureDaily(state,date=new Date()){
    const today=dateKey(date);
    if(!state.daily||state.daily.date!==today||!Array.isArray(state.daily.tasks))state.daily=dailyTemplate(date);
    state.daily.visitedZones=Array.isArray(state.daily.visitedZones)?state.daily.visitedZones:[];
    return state.daily;
  }
  function taskProgress(daily,id){
    return daily.tasks.find(t=>t.id===id)||null;
  }
  function allDailyDone(daily){
    return daily.tasks.every(t=>(Number(t.progress)||0)>=(Number(t.goal)||1));
  }
  function maybeQueueDailyBonus(state){
    const daily=ensureDaily(state);
    if(!allDailyDone(daily)||daily.bonusQueued)return null;
    daily.bonusQueued=true;
    const parcel={
      id:'daily-'+daily.date,
      createdAt:Date.now(),
      game:'seed-world-daily',
      title:'오늘의 씨앗 생활',
      category:'all',
      icon:'🎁',
      name:'오늘의 생활 선물',
      reward:{kind:'seeds',amount:30},
      claimed:false,
      dailyBonus:true
    };
    state.mailbox.push(parcel);return parcel;
  }
  function advanceTask(id,amount=1){
    const state=read(),daily=ensureDaily(state),task=taskProgress(daily,id);
    if(!task)return {state,daily,completed:false};
    const before=Number(task.progress)||0;
    task.progress=Math.min(task.goal,before+Math.max(0,Number(amount)||0));
    const bonus=maybeQueueDailyBonus(state);
    write(state,{reason:'daily-task',task:id,bonusQueued:!!bonus});
    return {state,daily,task,completed:before<task.goal&&task.progress>=task.goal,bonus};
  }
  function recordExplore(zone){
    zone=String(zone||'').trim();if(!zone)return summary();
    const state=read(),daily=ensureDaily(state);
    if(!daily.visitedZones.includes(zone)){
      daily.visitedZones.push(zone);
      const task=taskProgress(daily,'explore');
      if(task)task.progress=Math.min(task.goal,daily.visitedZones.length);
    }
    const bonus=maybeQueueDailyBonus(state);
    write(state,{reason:'explore',zone,bonusQueued:!!bonus});
    return summary(state);
  }
  function categoryGift(category){
    return CATEGORY_GIFTS[category]||CATEGORY_GIFTS.all;
  }
  function recordGameSession(payload={}){
    const game=String(payload.game||'').trim();
    if(!game)return {ok:false,reason:'missing-game'};
    const category=String(payload.category||'all'),title=String(payload.title||game);
    const state=read(),today=dateKey();
    ensureDaily(state);
    const existing=state.trophies[game]||{};
    state.trophies[game]={
      game,title,category,
      icon:TROPHY_ICONS[category]||TROPHY_ICONS.all,
      count:(Number(existing.count)||0)+1,
      firstAt:Number(existing.firstAt)||Date.now(),
      lastAt:Date.now(),
      seconds:(Number(existing.seconds)||0)+Math.max(0,Number(payload.seconds)||0)
    };
    const dailyId='game-'+today+'-'+game;
    let parcel=state.mailbox.find(p=>p.id===dailyId);
    let parcelCreated=false;
    if(!parcel){
      const gift=categoryGift(category);
      parcel={
        id:dailyId,createdAt:Date.now(),game,title,category,
        icon:gift.icon,name:gift.name,reward:JSON.parse(JSON.stringify(gift.reward)),claimed:false
      };
      state.mailbox.push(parcel);parcelCreated=true;
    }
    write(state,{reason:'game-session',game,parcelCreated});
    return {ok:true,parcelCreated,parcel,trophy:state.trophies[game],summary:summary(state)};
  }
  function pendingParcels(state=read()){
    return state.mailbox.filter(p=>p&&!p.claimed).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
  }
  function claimParcel(id){
    const state=read(),parcel=state.mailbox.find(p=>p.id===id&&!p.claimed);
    if(!parcel)return {ok:false,reason:'not-found'};
    parcel.claimed=true;parcel.claimedAt=Date.now();
    const daily=ensureDaily(state),task=taskProgress(daily,'mail');
    if(task)task.progress=Math.min(task.goal,(Number(task.progress)||0)+1);
    const bonus=maybeQueueDailyBonus(state);
    write(state,{reason:'parcel-claimed',parcel:id,bonusQueued:!!bonus});
    return {ok:true,parcel,bonus,summary:summary(state)};
  }
  function trophies(state=read()){
    return Object.values(state.trophies).sort((a,b)=>(b.lastAt||0)-(a.lastAt||0));
  }
  function unlockCosmetic(id){
    const state=read(),def=COSMETICS.find(c=>c.id===id);if(!def)return {ok:false,reason:'missing-cosmetic'};
    if(!state.cosmetics.owned.includes(id))state.cosmetics.owned.push(id);
    if(!state.cosmetics.equipped)state.cosmetics.equipped=id;
    write(state,{reason:'cosmetic-unlocked',id});return {ok:true,state,def};
  }
  function equipCosmetic(id){
    const state=read();
    if(id&&(!state.cosmetics.owned.includes(id)||!COSMETICS.some(c=>c.id===id)))return {ok:false,reason:'not-owned'};
    state.cosmetics.equipped=id||'';write(state,{reason:'cosmetic-equipped',id});return {ok:true,state};
  }
  function cosmeticState(state=read()){return {...state.cosmetics,defs:COSMETICS.map(v=>({...v}))}}
  function summary(state=read()){
    const daily=ensureDaily(state),done=daily.tasks.filter(t=>t.progress>=t.goal).length;
    return {
      pendingMail:pendingParcels(state).length,
      trophies:Object.keys(state.trophies).length,
      dailyDone:done,
      dailyTotal:daily.tasks.length,
      dailyComplete:done>=daily.tasks.length,
      equippedCosmetic:state.cosmetics.equipped||'',
      hasAttention:pendingParcels(state).length>0||done<daily.tasks.length
    };
  }
  function getState(){const state=read();ensureDaily(state);return state}
  function reset(){try{root?.localStorage?.removeItem(KEY)}catch(_){}emit({reason:'reset'});return fresh()}

  return {
    KEY,VERSION,CHANGE_EVENT,CATEGORY_GIFTS,COSMETICS,
    dateKey,getState,summary,pendingParcels,claimParcel,trophies,
    recordGameSession,advanceTask,recordExplore,unlockCosmetic,equipCosmetic,cosmeticState,reset
  };
});
