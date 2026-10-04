const CATEGORY_ORDER=['fish','nature','mineral','crop','fruit','food','pet'];
const CATEGORY_META={
  fish:{name:'물고기·해양',icon:'🐟'},
  nature:{name:'곤충·채집',icon:'🍄'},
  mineral:{name:'광물',icon:'💎'},
  crop:{name:'작물',icon:'🌱'},
  fruit:{name:'과일',icon:'🍎'},
  food:{name:'요리',icon:'🍳'},
  pet:{name:'Cube Pets',icon:'🐾'}
};

export const MUSEUM_CATALOG=[
  {id:'fish:pond',category:'fish',name:'연못 물고기',icon:'🐟',fishDex:'연못 물고기',consume:'fish',location:'집 연못',size:true},
  {id:'fish:river',category:'fish',name:'강가 물고기',icon:'🐠',fishDex:'강가 물고기',consume:'fish',location:'북쪽 강가',size:true},
  {id:'fish:beach',category:'fish',name:'해변 물고기',icon:'🐡',fishDex:'해변 물고기',consume:'fish',location:'해변가',size:true},
  {id:'fish:rare',category:'fish',name:'희귀 물고기',icon:'✨',item:'rareFish',location:'강가·해변',size:true},
  {id:'nature:pearl',category:'nature',name:'진주',icon:'🫧',item:'pearl',location:'해변가'},
  {id:'nature:shell',category:'nature',name:'조개껍데기',icon:'🐚',item:'shell',location:'해변가'},
  {id:'nature:bug',category:'nature',name:'곤충',icon:'🪲',item:'bug',location:'숲과 들판'},
  {id:'nature:mushroom',category:'nature',name:'야생 버섯',icon:'🍄',item:'mushroom',location:'깊은 숲'},
  {id:'mineral:stone',category:'mineral',name:'돌',icon:'🪨',item:'stone',location:'광산'},
  {id:'mineral:iron',category:'mineral',name:'철광석',icon:'⛏️',item:'iron',location:'철 광산'},
  {id:'mineral:copper',category:'mineral',name:'구리',icon:'🟠',item:'copper',location:'철 광산'},
  {id:'mineral:quartz',category:'mineral',name:'석영',icon:'🔹',item:'quartz',location:'돌 광산'},
  {id:'mineral:gold',category:'mineral',name:'금',icon:'🟡',item:'gold',location:'깊은 광산'},
  ...[
    ['potato','감자','🥔'],['carrot','당근','🥕'],['tomato','토마토','🍅'],['strawberry','딸기','🍓'],
    ['corn','옥수수','🌽'],['pumpkin','호박','🎃'],['beet','비트','🫜'],['lettuce','상추','🥬'],
    ['mushroom','재배 버섯','🍄'],['rice','벼','🌾'],['watermelon','수박','🍉'],['wheat','밀','🌾'],
    ['bamboo','대나무','🎋'],['berry','베리','🫐']
  ].map(([key,name,icon])=>({id:'crop:'+key,category:'crop',name,icon,item:key,location:'농장'})),
  ...[
    ['apple','사과','🍎'],['pear','배','🍐'],['peach','복숭아','🍑'],['orange','감귤','🍊'],['cherry','체리','🍒']
  ].map(([key,name,icon])=>({id:'fruit:'+key,category:'fruit',name,icon,item:key,location:'과수원'})),
  ...[
    ['grilledFish','구운 생선','🐟'],['bakedPotato','구운 감자','🥔'],['veggieSoup','채소 수프','🥣'],
    ['mushroomSoup','버섯 수프','🍲'],['omelet','달걀 오믈렛','🍳'],['fruitSalad','과일 샐러드','🥗'],
    ['cityLunch','도시락','🍱'],['cafeToast','카페 토스트','🍞']
  ].map(([key,name,icon])=>({id:'food:'+key,category:'food',name,icon,food:key,location:'주방·씨앗마을'})),
  ...[
    ['dog','강아지','🐶','첫 친구'],['cat','고양이','🐱','연못 근처'],['bunny','토끼','🐰','목장'],
    ['pig','돼지','🐷','목장'],['cow','소','🐮','목장'],['chick','병아리','🐥','목장'],
    ['fox','여우','🦊','깊은 숲'],['deer','사슴','🦌','깊은 숲'],['parrot','앵무새','🦜','깊은 숲'],
    ['beaver','비버','🦫','북쪽 강가']
  ].map(([key,name,icon,location])=>({id:'pet:'+key,category:'pet',name,icon,pet:key,location,donatable:false}))
];

const BY_ID=Object.fromEntries(MUSEUM_CATALOG.map(v=>[v.id,v]));
const ITEM_ENTRIES=new Map();
for(const entry of MUSEUM_CATALOG){
  if(entry.item&&!ITEM_ENTRIES.has(entry.item))ITEM_ENTRIES.set(entry.item,entry);
}
const FOOD_ENTRIES=new Map(MUSEUM_CATALOG.filter(v=>v.food).map(v=>[v.food,v]));

function safeNumber(v){const n=Number(v);return Number.isFinite(n)?n:0}

export function createMuseumSystem(ctx){
  const {prog,inv,persist,openPanel,toast,getDay=()=>1}=ctx;

  function state(){
    const p=prog();
    p.museum=p.museum&&typeof p.museum==='object'?p.museum:{};
    p.museum.version=1;
    p.museum.discovered=p.museum.discovered&&typeof p.museum.discovered==='object'?p.museum.discovered:{};
    p.museum.donated=p.museum.donated&&typeof p.museum.donated==='object'?p.museum.donated:{};
    p.museum.records=p.museum.records&&typeof p.museum.records==='object'?p.museum.records:{};
    return p.museum;
  }

  function discover(id,{day=getDay(),location='',size=0,silent=true}={}){
    const entry=BY_ID[id];if(!entry)return false;
    const s=state();let changed=false;
    if(!s.discovered[id]){
      s.discovered[id]={day:Math.max(1,Math.floor(safeNumber(day)||1)),location:location||entry.location||''};
      changed=true;
    }else if(location&&!s.discovered[id].location){
      s.discovered[id].location=location;changed=true;
    }
    if(entry.size&&safeNumber(size)>safeNumber(s.records[id]?.maxSize)){
      s.records[id]={...(s.records[id]||{}),maxSize:Math.round(safeNumber(size)*10)/10};changed=true;
    }
    if(changed){
      persist?.();
      if(!silent)toast?.('📖 도감에 '+entry.name+' 기록!');
    }
    return changed;
  }

  function discoverItem(key,opts={}){
    const entry=opts.kind==='food'?FOOD_ENTRIES.get(key):ITEM_ENTRIES.get(key);
    if(!entry)return false;
    return discover(entry.id,{...opts,location:opts.location||entry.location});
  }

  function syncKnown(){
    const p=prog(),i=inv(),s=state();let changed=false;
    for(const entry of MUSEUM_CATALOG){
      let known=false;
      if(entry.item)known=safeNumber(i[entry.item])>0;
      if(entry.food)known=safeNumber(p.food?.[entry.food])>0;
      if(entry.fishDex)known=safeNumber(p.fishDex?.[entry.fishDex])>0;
      if(entry.pet)known=(p.cubePets?.owned||[]).includes(entry.pet)||(p.cubePets?.met||[]).includes(entry.pet);
      if(known&&!s.discovered[entry.id]){
        s.discovered[entry.id]={day:Math.max(1,Math.floor(safeNumber(p.survival?.day)||1)),location:entry.location||''};changed=true;
      }
    }
    if(changed)persist?.();
    return changed;
  }

  function ownedCount(entry){
    const p=prog(),i=inv();
    if(entry.food)return safeNumber(p.food?.[entry.food]);
    if(entry.consume)return safeNumber(i[entry.consume]);
    if(entry.item)return safeNumber(i[entry.item]);
    if(entry.pet)return (p.cubePets?.owned||[]).includes(entry.pet)?1:0;
    return 0;
  }

  function canDonate(entry){
    const s=state();
    if(!entry||entry.donatable===false||!s.discovered[entry.id]||s.donated[entry.id])return false;
    return ownedCount(entry)>0;
  }

  function donate(id){
    const entry=BY_ID[id],s=state();if(!entry)return false;
    if(entry.donatable===false){toast?.('🐾 Cube Pets는 친구 기록만 남기고 전시 기증은 받지 않아요.');return false;}
    if(s.donated[id]){toast?.('🏛️ 이미 박물관에 기증한 기록이에요.');return false;}
    if(!s.discovered[id]){toast?.('먼저 월드에서 직접 발견해야 기증할 수 있어요.');return false;}
    if(!canDonate(entry)){toast?.('🎒 기증할 '+entry.name+'을(를) 가방에 가지고 와주세요.');return false;}
    const p=prog(),i=inv();
    if(entry.food)p.food[entry.food]=Math.max(0,safeNumber(p.food[entry.food])-1);
    else {
      const key=entry.consume||entry.item;
      i[key]=Math.max(0,safeNumber(i[key])-1);
    }
    s.donated[id]=Math.max(1,Math.floor(safeNumber(getDay())||1));
    persist?.();toast?.('🏛️ '+entry.name+' 기증 완료! 박물관 전시가 늘어났어요.');
    donationPanel();
    return true;
  }

  function summary(){
    const s=state(),discovered=MUSEUM_CATALOG.filter(v=>!!s.discovered[v.id]).length,donated=MUSEUM_CATALOG.filter(v=>!!s.donated[v.id]).length;
    const donatedByCategory={};
    for(const category of CATEGORY_ORDER)donatedByCategory[category]=MUSEUM_CATALOG.filter(v=>v.category===category&&!!s.donated[v.id]).length;
    return {
      total:MUSEUM_CATALOG.length,discovered,donated,donatedByCategory,
      exhibits:{
        aquarium:donatedByCategory.fish>0,
        nature:donatedByCategory.nature>0,
        mineral:donatedByCategory.mineral>0,
        farm:(donatedByCategory.crop+donatedByCategory.fruit+donatedByCategory.food)>0
      }
    };
  }

  function entryCard(entry){
    const s=state(),found=s.discovered[entry.id],donated=s.donated[entry.id],record=s.records[entry.id];
    if(!found)return '<div class="item"><b>❔ ???</b><div>아직 발견하지 못했어요.</div><small>'+(CATEGORY_META[entry.category]?.name||'자연')+'에서 새로운 기록을 찾아보세요.</small></div>';
    const size=record?.maxSize?'<br><small>최대 기록 '+Number(record.maxSize).toFixed(1)+'cm</small>':'';
    const donation=entry.donatable===false?'친구 기록':donated?'🏛️ 기증 완료':'기증 전';
    return '<div class="item"><b>'+entry.icon+' '+entry.name+'</b><div>'+donation+' · 보유 '+ownedCount(entry)+'</div><small>첫 발견 Day '+found.day+(found.location?' · '+found.location:'')+'</small>'+size+'</div>';
  }

  function catalogPanel(){
    syncKnown();const s=summary();
    const sections=CATEGORY_ORDER.map(category=>{
      const meta=CATEGORY_META[category],entries=MUSEUM_CATALOG.filter(v=>v.category===category);
      const found=entries.filter(v=>state().discovered[v.id]).length;
      return '<h3>'+meta.icon+' '+meta.name+' · '+found+'/'+entries.length+'</h3><div class="grid">'+entries.map(entryCard).join('')+'</div>';
    }).join('');
    openPanel?.('<h2>📖 씨앗 자연도감 · '+s.discovered+'/'+s.total+'</h2><p>직접 잡고, 캐고, 기르고, 요리하고, 친구가 된 기록이 자동으로 쌓여요. 기증 가능한 발견물은 박물관에 한 점씩 기증할 수 있어요.</p>'+sections+'<p><button data-museum-open-donate="1">🏛️ 박물관 기증 목록 보기</button></p>');
  }

  function donationPanel(){
    syncKnown();const s=state(),sum=summary();
    const entries=MUSEUM_CATALOG.filter(v=>v.donatable!==false&&s.discovered[v.id]);
    const cards=entries.length?entries.map(entry=>{
      const done=!!s.donated[entry.id],count=ownedCount(entry);
      return '<div class="item"><b>'+entry.icon+' '+entry.name+'</b><div>'+(done?'🏛️ 전시 중':'보유 '+count+'개')+'</div><button data-museum-donate="'+entry.id+'" '+(done||count<=0?'disabled':'')+'>'+(done?'기증 완료':'1개 기증')+'</button></div>';
    }).join(''):'<div class="item">아직 기증할 수 있는 발견물이 없어요. 먼저 월드를 탐험해 보세요.</div>';
    openPanel?.('<h2>🏛️ 씨앗 자연박물관 기증 · '+sum.donated+'점</h2><p>같은 종류는 한 번만 기증해요. 기증품은 사라지는 대신 박물관 전시에 영구 기록됩니다.</p><div class="grid">'+cards+'</div><p><button data-world-hub="catalog">📖 자연도감으로 돌아가기</button></p>');
  }

  syncKnown();
  return {state,discover,discoverItem,syncKnown,catalogPanel,donationPanel,donate,summary,catalog:MUSEUM_CATALOG};
}
