(() => {
'use strict';
const $=s=>document.querySelector(s);
const board=$('#board');
const ui={
 era:$('#eraLabel'),day:$('#dayLabel'),food:$('#foodLabel'),pop:$('#popLabel'),meal:$('#mealLabel'),settlement:$('#settlementLabel'),
 questList:$('#questList'),discoveries:$('#discoveries'),discoveryCount:$('#discoveryCount'),hint:$('#hintText'),goalTitle:$('#goalTitle'),goalText:$('#goalText'),
 toast:$('#toast'),explore:$('#exploreBtn'),
 bars:{hunt:$('#huntBar'),farm:$('#farmBar'),fish:$('#fishBar'),herd:$('#herdBar')},
 values:{hunt:$('#huntValue'),farm:$('#farmValue'),fish:$('#fishValue'),herd:$('#herdValue')}
};

const C={
 person:{name:'사람',emoji:'👤',kind:'human',sub:'여러 일을 배울 수 있음'},
 hunter:{name:'사냥꾼',emoji:'🏹',kind:'human',sub:'큰 사냥감을 잡을 수 있음'},
 fisher:{name:'어부',emoji:'🎣',kind:'human',sub:'어로 생산량 증가'},
 farmer:{name:'농부',emoji:'🧑‍🌾',kind:'human',sub:'농경 생산량 증가'},
 herder:{name:'목축민',emoji:'🧑‍🌾',kind:'human',sub:'야생 염소를 길들임'},
 forest:{name:'숲',emoji:'🌲',kind:'node',sub:'목재와 개간지의 원천'},
 berryBush:{name:'열매 덤불',emoji:'🫐',kind:'node',sub:'열매를 채집할 수 있음'},
 stoneSource:{name:'돌무더기',emoji:'🪨',kind:'node',sub:'석재를 구할 수 있음'},
 reedBed:{name:'갈대밭',emoji:'🌿',kind:'node',sub:'식물 섬유를 얻음'},
 clayBank:{name:'점토층',emoji:'🟤',kind:'node',sub:'토기의 재료'},
 river:{name:'강가',emoji:'🏞️',kind:'node',sub:'어로와 돌 갈기의 장소'},
 wildMillet:{name:'야생 조',emoji:'🌾',kind:'node',sub:'곡식과 씨앗을 얻음'},
 deer:{name:'사슴',emoji:'🦌',kind:'node',sub:'고기·가죽·뼈의 원천'},
 wildGoat:{name:'야생 염소',emoji:'🐐',kind:'node',sub:'길들이면 가축이 됨'},

 wood:{name:'나무',emoji:'🪵',kind:'item',sub:'도구·시설 재료'},
 stone:{name:'돌',emoji:'🪨',kind:'item',sub:'석기의 기본 재료'},
 fiber:{name:'식물 섬유',emoji:'🌿',kind:'item',sub:'꼬아 끈을 만들 수 있음'},
 clay:{name:'점토',emoji:'🟤',kind:'item',sub:'그릇을 빚는 재료'},
 berry:{name:'열매',emoji:'🫐',kind:'food',sub:'식량 1',food:1},
 wildGrain:{name:'야생 곡식',emoji:'🌾',kind:'food',sub:'식량 1',food:1},
 milletSeed:{name:'조 씨앗',emoji:'🌱',kind:'item',sub:'개간지에 심을 수 있음'},
 rawMeat:{name:'날고기',emoji:'🥩',kind:'item',sub:'익히거나 훈연 가능'},
 rawHide:{name:'생가죽',emoji:'🟫',kind:'item',sub:'긁개로 손질해야 함'},
 bone:{name:'뼈',emoji:'🦴',kind:'item',sub:'바늘·낚시도구 재료'},
 sinew:{name:'힘줄',emoji:'🧵',kind:'item',sub:'질긴 결속 재료'},
 freshFish:{name:'민물고기',emoji:'🐟',kind:'food',sub:'식량 1 · 훈연 가능',food:1},
 shellfish:{name:'조개',emoji:'🐚',kind:'food',sub:'식량 1',food:1},
 milk:{name:'염소젖',emoji:'🥛',kind:'food',sub:'식량 1',food:1},
 milletGrain:{name:'조',emoji:'🌾',kind:'food',sub:'식량 1 · 갈아서 가공',food:1},
 cookedMeat:{name:'익힌 고기',emoji:'🍖',kind:'food',sub:'식량 1',food:1},
 smokedMeat:{name:'훈제 고기',emoji:'🥓',kind:'food',sub:'보존식 · 식량 2',food:2},
 smokedFish:{name:'훈제 생선',emoji:'🐟',kind:'food',sub:'보존식 · 식량 2',food:2},
 flour:{name:'간 곡물',emoji:'🥣',kind:'item',sub:'죽의 재료'},
 porridgePrep:{name:'곡물죽 재료',emoji:'🍲',kind:'item',sub:'불에 끓이면 완성'},
 porridge:{name:'곡물죽',emoji:'🥣',kind:'food',sub:'식량 2',food:2},

 chopper:{name:'찍개',emoji:'🪨',kind:'tool',sub:'돌을 다듬는 기본 석기'},
 stoneBlade:{name:'돌날',emoji:'🔪',kind:'tool',sub:'창·낫 제작 재료'},
 scraper:{name:'긁개',emoji:'🪒',kind:'tool',sub:'가죽 손질 도구'},
 boneNeedle:{name:'뼈바늘',emoji:'🪡',kind:'tool',sub:'가죽을 꿰맴'},
 cord:{name:'끈',emoji:'🪢',kind:'tool',sub:'섬유를 꼬아 만든 결속재'},
 fishHook:{name:'뼈 낚싯바늘',emoji:'🪝',kind:'tool',sub:'낚시 자리 조성'},
 net:{name:'그물',emoji:'🕸️',kind:'tool',sub:'그물 어장 조성'},
 basket:{name:'바구니',emoji:'🧺',kind:'tool',sub:'통발 제작 재료'},
 fishTrap:{name:'통발',emoji:'🪤',kind:'tool',sub:'통발 어장 조성'},
 spear:{name:'돌창',emoji:'🗡️',kind:'tool',sub:'사냥꾼 양성'},
 groundStone:{name:'간 돌',emoji:'⚪',kind:'tool',sub:'강에서 매끈하게 간 석재'},
 groundAxe:{name:'간돌도끼',emoji:'🪓',kind:'tool',sub:'숲 개간 가능'},
 stoneHoe:{name:'돌괭이',emoji:'⛏️',kind:'tool',sub:'농부 양성'},
 sickle:{name:'돌낫',emoji:'🌙',kind:'tool',sub:'곡물 작업 도구'},
 grindingStone:{name:'갈돌·갈판',emoji:'🪨',kind:'tool',sub:'곡물을 갈 수 있음'},

 campfire:{name:'모닥불',emoji:'🔥',kind:'building',sub:'조리와 토기 소성'},
 smokingRack:{name:'훈연대',emoji:'♨️',kind:'building',sub:'고기·생선을 보존'},
 clayVessel:{name:'말린 토기',emoji:'🏺',kind:'item',sub:'불에 구우면 토기'},
 combRawPot:{name:'무늬 넣은 토기',emoji:'🏺',kind:'item',sub:'소성 전 빗살무늬토기'},
 pottery:{name:'토기',emoji:'🏺',kind:'tool',sub:'저장·조리 용기'},
 combPottery:{name:'빗살무늬토기',emoji:'🏺',kind:'tool',sub:'신석기 저장·조리 도구'},
 storageJars:{name:'저장 토기 묶음',emoji:'🏺',kind:'building',sub:'정착지 저장 능력 증가'},
 dressedHide:{name:'손질한 가죽',emoji:'🟫',kind:'item',sub:'옷·천막 제작 가능'},
 leatherClothing:{name:'가죽옷',emoji:'🧥',kind:'tool',sub:'생활 안정도 증가'},
 hutFrame:{name:'움집 골조',emoji:'🪵',kind:'building',sub:'가죽·토기로 완성'},
 hideTent:{name:'가죽 천막',emoji:'⛺',kind:'building',sub:'이동 생활 거처'},
 pitHouse:{name:'움집',emoji:'🏠',kind:'building',sub:'정착 생활 거처'},
 camp:{name:'사냥 캠프',emoji:'🏕️',kind:'building',sub:'천막이 모인 생활지'},
 village:{name:'신석기 마을',emoji:'🏘️',kind:'building',sub:'움집이 모인 정착지'},
 clearedPlot:{name:'개간지',emoji:'🟫',kind:'node',sub:'씨앗을 심을 수 있음'},
 milletPlot:{name:'조밭',emoji:'🌱',kind:'node',sub:'사람이 돌보면 조 생산'},
 milletFarm:{name:'조 농장',emoji:'🌾',kind:'building',sub:'조밭 3개가 합쳐진 생산지'},
 granary:{name:'곡식 저장소',emoji:'🛖',kind:'building',sub:'농경 정착의 핵심'},
 fishingSpot:{name:'낚시 자리',emoji:'🎣',kind:'node',sub:'강가의 작은 낚시 지점'},
 fishingGround:{name:'낚시터',emoji:'🐟',kind:'building',sub:'낚시 자리 3개가 합쳐짐'},
 netSpot:{name:'그물 자리',emoji:'🕸️',kind:'node',sub:'그물로 물고기를 잡음'},
 netFishery:{name:'그물 어장',emoji:'🐟',kind:'building',sub:'그물 자리 3개가 합쳐짐'},
 trapSpot:{name:'통발 자리',emoji:'🪤',kind:'node',sub:'통발로 물고기를 잡음'},
 trapFishery:{name:'통발 어장',emoji:'🐟',kind:'building',sub:'통발 자리 3개가 합쳐짐'},
 fence:{name:'울타리',emoji:'🪵',kind:'building',sub:'가축 우리 재료'},
 tamedGoat:{name:'길들인 염소',emoji:'🐐',kind:'item',sub:'울타리와 합쳐 우리 조성'},
 goatPen:{name:'염소 우리',emoji:'🐐',kind:'node',sub:'젖을 얻을 수 있음'},
 goatRanch:{name:'염소 목장',emoji:'🐐',kind:'building',sub:'염소 우리 3개가 합쳐짐'}
};

const state={
 started:false,over:false,runId:0,id:0,z:20,day:1,mealLeft:70,cards:new Map(),discoveries:new Set(),timers:[],
 lifestyle:{hunt:0,farm:0,fish:0,herd:0},stats:{crafted:0,gathered:0,meals:0,explores:0},milestoneShown:false
};

const SAME={
 stone:{need:2,out:'chopper',name:'찍개'},
 fiber:{need:3,out:'cord',name:'끈 꼬기'},
 cord:{need:2,out:'net',name:'그물 짜기'},
 clay:{need:2,out:'clayVessel',name:'토기 성형'},
 combPottery:{need:3,out:'storageJars',name:'저장 토기'},
 hideTent:{need:3,out:'camp',name:'사냥 캠프'},
 pitHouse:{need:3,out:'village',name:'신석기 마을'},
 milletPlot:{need:3,out:'milletFarm',name:'조 농장'},
 fishingSpot:{need:3,out:'fishingGround',name:'낚시터'},
 netSpot:{need:3,out:'netFishery',name:'그물 어장'},
 trapSpot:{need:3,out:'trapFishery',name:'통발 어장'},
 goatPen:{need:3,out:'goatRanch',name:'염소 목장'}
};

const R=[
 ['chopper','stone',0,1,[['stoneBlade',1]],'돌날'],
 ['stoneBlade','bone',1,1,[['scraper',1]],'긁개'],
 ['chopper','bone',0,1,[['boneNeedle',1]],'뼈바늘'],
 ['bone','cord',1,1,[['fishHook',1]],'뼈 낚싯바늘'],
 ['fiber','cord',1,1,[['basket',1]],'바구니'],
 ['basket','cord',1,1,[['fishTrap',1]],'통발'],
 ['stoneBlade','wood',1,1,[['spear',1]],'돌창'],
 ['groundStone','wood',1,1,[['groundAxe',1]],'간돌도끼'],
 ['groundStone','cord',1,1,[['stoneHoe',1]],'돌괭이'],
 ['stoneBlade','cord',1,1,[['sickle',1]],'돌낫'],
 ['groundStone','stone',1,1,[['grindingStone',1]],'갈돌·갈판'],
 ['wood','fiber',1,1,[['campfire',1]],'불 피우기'],
 ['wood','cord',1,1,[['fence',1]],'울타리'],
 ['wood','cord',2,1,[['hutFrame',1]],'움집 골조'],
 ['wood','campfire',2,0,[['smokingRack',1]],'훈연대'],
 ['rawHide','scraper',1,0,[['dressedHide',1]],'가죽 손질'],
 ['dressedHide','boneNeedle',1,0,[['leatherClothing',1]],'가죽옷'],
 ['dressedHide','hutFrame',1,1,[['hideTent',1]],'가죽 천막'],
 ['hutFrame','clayVessel',1,1,[['pitHouse',1]],'움집'],
 ['clayVessel','boneNeedle',1,0,[['combRawPot',1]],'빗살무늬 새기기'],
 ['clayVessel','campfire',1,0,[['pottery',1]],'토기 굽기'],
 ['combRawPot','campfire',1,0,[['combPottery',1]],'빗살무늬토기 굽기'],
 ['rawMeat','campfire',1,0,[['cookedMeat',1]],'고기 익히기'],
 ['rawMeat','smokingRack',1,0,[['smokedMeat',1]],'고기 훈연'],
 ['freshFish','smokingRack',1,0,[['smokedFish',1]],'생선 훈연'],
 ['milletGrain','grindingStone',1,0,[['flour',1]],'곡물 갈기'],
 ['flour','pottery',1,0,[['porridgePrep',1]],'죽 준비'],
 ['porridgePrep','campfire',1,0,[['porridge',1]],'곡물죽 끓이기'],
 ['milletSeed','clearedPlot',1,1,[['milletPlot',1]],'조밭 만들기'],
 ['milletFarm','storageJars',0,1,[['granary',1]],'곡식 저장소'],
 ['tamedGoat','fence',1,1,[['goatPen',1]],'염소 우리'],
 ['person','spear',1,1,[['hunter',1]],'사냥꾼'],
 ['person','fishHook',1,1,[['fisher',1]],'어부'],
 ['person','stoneHoe',1,1,[['farmer',1]],'농부'],
 ['person','cord',1,1,[['herder',1]],'목축민']
].map(x=>({a:x[0],b:x[1],ca:x[2],cb:x[3],out:x[4],name:x[5]}));

const SETTLE_POINTS={camp:2,village:5,pitHouse:1,milletFarm:3,granary:2,fishingGround:3,netFishery:3,trapFishery:3,goatRanch:3,storageJars:1,combPottery:1,groundAxe:1,leatherClothing:1};
const FOOD_TYPES=()=>Object.keys(C).filter(k=>C[k].food);
const isWorker=t=>['person','hunter','fisher','farmer','herder'].includes(t);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function reset(){
 state.runId++;state.started=true;state.over=false;state.id=0;state.z=20;state.day=1;state.mealLeft=70;state.cards.clear();state.discoveries.clear();
 state.lifestyle={hunt:0,farm:0,fish:0,herd:0};state.stats={crafted:0,gathered:0,meals:0,explores:0};state.milestoneShown=false;
 state.timers.forEach(clearInterval);state.timers=[];board.innerHTML='';ui.era.textContent='구석기 생활';
 $('#milestoneLayer').classList.add('hidden');$('#gameOverLayer').classList.add('hidden');
 spawnInitial();renderAll();
 const t=setInterval(()=>{if(!state.started||state.over)return;state.mealLeft--;if(state.mealLeft<=0)eatMeal();renderHud();},1000);
 state.timers.push(t);
}

function spawnInitial(){
 const w=Math.max(620,board.clientWidth),h=Math.max(390,board.clientHeight);
 const list=[
  ['person',.11,.16],['person',.22,.26],['berry',.10,.60],['berry',.20,.69],
  ['forest',.40,.12],['berryBush',.58,.14],['stoneSource',.76,.18],['reedBed',.87,.36],
  ['clayBank',.70,.54],['river',.48,.58],['wildMillet',.31,.50],['deer',.17,.43],['wildGoat',.83,.66]
 ];
 list.forEach(([t,x,y])=>addCard(t,Math.min(w-120,w*x),Math.min(h-150,h*y),1,false));
}

function addCard(type,x,y,count=1,animate=true){
 if(!C[type])return null;
 const id=++state.id,el=document.createElement('div'),d=C[type];
 el.className='card '+d.kind+(animate?' newborn':'');el.dataset.id=id;
 el.innerHTML='<div class="workTag">진행 중…</div><div class="cardTop">'+d.emoji+'<span class="countBadge"></span></div><div class="cardName">'+d.name+'</div><div class="cardSub">'+d.sub+'</div><div class="progress"></div>';
 board.appendChild(el);
 const c={id,type,count,busy:false,x:0,y:0,el};state.cards.set(id,c);updateCard(c);
 place(c,clamp(x,4,Math.max(4,board.clientWidth-el.offsetWidth-4)),clamp(y,4,Math.max(4,board.clientHeight-el.offsetHeight-4)));
 bindDrag(c);if(animate)onCreated(type);return c;
}
function updateCard(c){if(!c||!state.cards.has(c.id))return;const b=c.el.querySelector('.countBadge');b.textContent='×'+c.count;b.classList.toggle('one',c.count===1);}
function place(c,x,y){c.x=x;c.y=y;c.el.style.left=x+'px';c.el.style.top=y+'px';}
function removeCard(c){if(!c||!state.cards.has(c.id))return;c.el.remove();state.cards.delete(c.id);}
function consume(c,n){if(n<=0)return true;if(!c||c.count<n)return false;c.count-=n;if(c.count<=0)removeCard(c);else updateCard(c);return true;}

function bindDrag(c){
 let dragging=false,ox=0,oy=0;
 c.el.addEventListener('pointerdown',e=>{if(!state.started||state.over||c.busy)return;dragging=true;c.el.setPointerCapture(e.pointerId);c.el.classList.add('dragging');const r=c.el.getBoundingClientRect();ox=e.clientX-r.left;oy=e.clientY-r.top;c.el.style.zIndex=++state.z;e.preventDefault();});
 c.el.addEventListener('pointermove',e=>{if(!dragging)return;const r=board.getBoundingClientRect();place(c,clamp(e.clientX-r.left-ox,4,Math.max(4,r.width-c.el.offsetWidth-4)),clamp(e.clientY-r.top-oy,4,Math.max(4,r.height-c.el.offsetHeight-4)));e.preventDefault();});
 const end=e=>{if(!dragging)return;dragging=false;c.el.classList.remove('dragging');try{c.el.releasePointerCapture(e.pointerId)}catch(_){}const target=findTarget(c);if(target)resolve(c,target);};
 c.el.addEventListener('pointerup',end);c.el.addEventListener('pointercancel',end);
}

function findTarget(c){
 const r=c.el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let best=null,dist=1e9;
 for(const o of state.cards.values()){if(o.id===c.id||o.busy)continue;const q=o.el.getBoundingClientRect();if(cx>=q.left&&cx<=q.right&&cy>=q.top&&cy<=q.bottom){const d=Math.hypot(cx-q.left-q.width/2,cy-q.top-q.height/2);if(d<dist){best=o;dist=d;}}}
 return best;
}

function resolve(a,b){
 if(a.busy||b.busy)return;
 if(a.type===b.type){mergeSame(a,b);return;}
 const recipe=findRecipe(a,b);
 if(recipe){craftRecipe(a,b,recipe);return;}
 const worker=isWorker(a.type)?a:(isWorker(b.type)?b:null);
 if(worker){const node=worker.id===a.id?b:a;const act=workerAction(worker,node);if(act){runAction(worker,node,act);return;}}
 const special=specialAction(a,b);if(special){runSpecial(a,b,special);return;}
 showToast('이 조합은 아직 쓸 방법을 찾지 못했어요.');separate(a,b);
}

function mergeSame(a,b){
 const total=a.count+b.count,rule=SAME[a.type],x=b.x,y=b.y;
 removeCard(a);removeCard(b);
 if(rule&&total>=rule.need){
  addCard(rule.out,x,y,1);discover(rule.name);state.stats.crafted++;
  const rest=total-rule.need;if(rest>0)addCard(a.type,x+22,y+22,rest);
 }else addCard(a.type,x,y,total);
 renderAll();checkMilestone();
}

function findRecipe(a,b){
 return R.filter(r=>((a.type===r.a&&b.type===r.b&&a.count>=r.ca&&b.count>=r.cb)||(a.type===r.b&&b.type===r.a&&a.count>=r.cb&&b.count>=r.ca))).sort((x,y)=>(y.ca+y.cb)-(x.ca+x.cb))[0]||null;
}
function craftRecipe(a,b,r){
 const direct=a.type===r.a;const ca=direct?r.ca:r.cb,cb=direct?r.cb:r.ca,x=(a.x+b.x)/2,y=(a.y+b.y)/2;
 consume(a,ca);consume(b,cb);r.out.forEach((o,i)=>addCard(o[0],x+i*20,y+i*20,o[1]||1));
 discover(r.name);state.stats.crafted++;renderAll();checkMilestone();
}

function workerAction(worker,node){
 const base={
  forest:{ms:1100,label:'나무 모으는 중',out:[['wood',1]],life:'hunt'},
  berryBush:{ms:900,label:'열매 따는 중',out:[['berry',1]],life:'hunt'},
  stoneSource:{ms:1050,label:'돌 줍는 중',out:[['stone',1]],life:'hunt'},
  reedBed:{ms:950,label:'섬유 모으는 중',out:[['fiber',1]],life:'hunt'},
  clayBank:{ms:1100,label:'점토 캐는 중',out:[['clay',1]],life:null},
  wildMillet:{ms:1200,label:'야생 곡식 거두는 중',out:[['wildGrain',1],['milletSeed',1]],life:'farm'},
  river:{ms:1250,label:'강가 채집 중',out:[['shellfish',1]],life:'fish'}
 };
 if(base[node.type])return base[node.type];
 if(node.type==='deer'){
  if(worker.type!=='hunter'){showToast('큰 사슴은 돌창을 든 사냥꾼이 필요해요.');return null;}
  return {ms:1900,label:'사슴 사냥 중',out:[['rawMeat',2],['rawHide',1],['bone',1],['sinew',1]],life:'hunt',consumeNode:true,discover:'큰 사냥'};
 }
 if(node.type==='wildGoat'){
  if(worker.type!=='herder'){showToast('야생 염소는 끈을 다루는 목축민이 길들일 수 있어요.');return null;}
  return {ms:1900,label:'염소 길들이는 중',out:[['tamedGoat',1]],life:'herd',consumeNode:true,discover:'가축 길들이기'};
 }
 const prod={
  milletPlot:{ms:1500,label:'조밭 돌보는 중',out:[['milletGrain',worker.type==='farmer'?2:1],['milletSeed',1]],life:'farm'},
  milletFarm:{ms:1800,label:'조 농장 수확 중',out:[['milletGrain',worker.type==='farmer'?4:3],['milletSeed',1]],life:'farm',lifeGain:3},
  fishingSpot:{ms:1500,label:'낚시 중',out:[['freshFish',worker.type==='fisher'?2:1]],life:'fish'},
  fishingGround:{ms:1750,label:'낚시터 운영 중',out:[['freshFish',worker.type==='fisher'?4:3]],life:'fish',lifeGain:3},
  netSpot:{ms:1450,label:'그물 걷는 중',out:[['freshFish',2]],life:'fish',lifeGain:2},
  netFishery:{ms:1750,label:'그물 어장 운영 중',out:[['freshFish',4]],life:'fish',lifeGain:3},
  trapSpot:{ms:1450,label:'통발 확인 중',out:[['freshFish',2]],life:'fish',lifeGain:2},
  trapFishery:{ms:1750,label:'통발 어장 운영 중',out:[['freshFish',4]],life:'fish',lifeGain:3},
  goatPen:{ms:1500,label:'염소 돌보는 중',out:[['milk',1]],life:'herd'},
  goatRanch:{ms:1800,label:'염소 목장 돌보는 중',out:[['milk',3]],life:'herd',lifeGain:3}
 };
 return prod[node.type]||null;
}

function specialAction(a,b){
 const has=(x,y)=>((a.type===x&&b.type===y)||(a.type===y&&b.type===x));
 if(has('stone','river'))return {ms:1300,label:'돌 가는 중',consume:'stone',preserve:'river',out:[['groundStone',1]],discover:'간석기 제작'};
 if(has('groundAxe','forest'))return {ms:1700,label:'숲 개간 중',consume:null,preserve:null,out:[['clearedPlot',1],['wood',2]],discover:'숲 개간'};
 if(has('fishHook','river'))return {ms:1200,label:'낚시 자리 찾는 중',consume:null,preserve:null,out:[['fishingSpot',1]],discover:'낚시 자리'};
 if(has('net','river'))return {ms:1500,label:'그물 설치 중',consume:null,preserve:null,out:[['netSpot',1]],discover:'그물 어로'};
 if(has('fishTrap','river'))return {ms:1500,label:'통발 설치 중',consume:null,preserve:null,out:[['trapSpot',1]],discover:'통발 어로'};
 return null;
}

function runAction(worker,node,d){
 const run=state.runId;worker.busy=true;node.busy=true;markBusy(worker,d.label,d.ms);markBusy(node,d.label,d.ms);snap(worker,node);
 setTimeout(()=>{if(state.over||run!==state.runId)return;worker.busy=false;worker.el.classList.remove('busy');if(state.cards.has(node.id)){if(d.consumeNode)removeCard(node);else{node.busy=false;node.el.classList.remove('busy');}}
  d.out.forEach((o,i)=>addCard(o[0],worker.x+108+i*20,worker.y+i*18,o[1]||1));state.stats.gathered+=d.out.reduce((s,o)=>s+(o[1]||1),0);
  if(d.life)addLife(d.life,d.lifeGain||1);if(d.discover)discover(d.discover);renderAll();checkMilestone();},d.ms);
}

function runSpecial(a,b,d){
 const run=state.runId;a.busy=true;b.busy=true;markBusy(a,d.label,d.ms);markBusy(b,d.label,d.ms);snap(a,b);
 setTimeout(()=>{if(state.over||run!==state.runId)return;
  [a,b].forEach(c=>{if(state.cards.has(c.id)){c.busy=false;c.el.classList.remove('busy');}});
  if(d.consume){const c=a.type===d.consume?a:b;consume(c,1);}
  const base=state.cards.has(b.id)?b:(state.cards.has(a.id)?a:null),x=base?base.x:120,y=base?base.y:120;
  d.out.forEach((o,i)=>addCard(o[0],x+112+i*20,y+i*20,o[1]||1));discover(d.discover);renderAll();checkMilestone();
 },d.ms);
}

function markBusy(c,label,ms){c.el.classList.add('busy');c.el.querySelector('.workTag').textContent=label;const p=c.el.querySelector('.progress');p.style.transition='none';p.style.width='0';requestAnimationFrame(()=>requestAnimationFrame(()=>{p.style.transition='width '+ms+'ms linear';p.style.width='100%';}));}
function snap(a,b){place(a,b.x+10,b.y+12);a.el.style.zIndex=++state.z;}
function separate(a,b){if(!a||!state.cards.has(a.id)||!b||!state.cards.has(b.id))return;place(a,clamp(b.x+b.el.offsetWidth+12,4,Math.max(4,board.clientWidth-a.el.offsetWidth-4)),clamp(b.y+14,4,Math.max(4,board.clientHeight-a.el.offsetHeight-4)));}

function onCreated(type){
 if(['campfire','dressedHide','groundAxe','combPottery','milletFarm','fishingGround','netFishery','trapFishery','goatRanch','pitHouse','village'].includes(type))discover(C[type].name);
 if(['groundAxe','combPottery','pitHouse','milletFarm','fishingGround','goatRanch'].includes(type))ui.era.textContent='신석기 생활 확장';
}
function discover(name){if(state.discoveries.has(name))return;state.discoveries.add(name);showToast('💡 새 기술: '+name);try{window.KidscadeGame?.sound?.('correct')}catch(_){}}
function addLife(k,n=1){state.lifestyle[k]+=n;}

function settlementScore(){
 let score=0;const seen=new Set();
 for(const c of state.cards.values()){if(SETTLE_POINTS[c.type]&&!seen.has(c.type)){score+=SETTLE_POINTS[c.type];seen.add(c.type);}}
 return score;
}
function checkMilestone(){
 if(state.milestoneShown||state.over)return;
 const score=settlementScore(),advanced=['milletFarm','fishingGround','netFishery','trapFishery','goatRanch','village','granary'].filter(t=>[...state.cards.values()].some(c=>c.type===t)).length;
 if(score>=9&&advanced>=2){
  state.milestoneShown=true;
  $('#milestoneText').textContent='농경·어로·목축 중 여러 생활 기술과 주거·저장 기술이 연결되며 정착도가 '+score+'에 도달했습니다. 한 가지 길만 고르지 않아도 됩니다.';
  $('#resultStats').innerHTML='<div><span>생존</span><b>'+state.day+'일</b></div><div><span>정착도</span><b>'+score+'</b></div><div><span>발견 기술</span><b>'+state.discoveries.size+'</b></div>';
  $('#milestoneLayer').classList.remove('hidden');
  try{window.KidscadeGame?.score?.(score*100+state.discoveries.size*20)}catch(_){}
 }
}

function foodUnits(){let n=0;for(const c of state.cards.values())n+=(C[c.type].food||0)*c.count;return n;}
function population(){let n=0;for(const c of state.cards.values())if(isWorker(c.type))n+=c.count;return n;}
function consumeFood(need){
 const piles=[...state.cards.values()].filter(c=>C[c.type].food).sort((a,b)=>(C[a.type].food||1)-(C[b.type].food||1));
 let left=need;
 for(const c of piles){while(left>0&&state.cards.has(c.id)&&c.count>0){left-=C[c.type].food||1;consume(c,1);}if(left<=0)break;}
 return left<=0;
}
function eatMeal(){
 const need=population();if(foodUnits()<need){state.over=true;$('#gameOverLayer').classList.remove('hidden');return;}
 consumeFood(need);state.day++;state.mealLeft=70;state.stats.meals++;showToast('🍲 부족이 한 끼를 먹고 '+state.day+'일째를 맞았습니다.');renderAll();
}

function explore(){
 if(state.over)return;if(foodUnits()<1){showToast('탐색에는 식량 1이 필요해요.');return;}consumeFood(1);state.stats.explores++;
 const pool=['deer','wildGoat','berryBush','forest','stoneSource','reedBed','clayBank','wildMillet','river'];
 const t=pool[Math.floor(Math.random()*pool.length)],x=35+Math.random()*Math.max(60,board.clientWidth-170),y=45+Math.random()*Math.max(70,board.clientHeight-210);
 addCard(t,x,y);showToast('🧭 '+C[t].name+'을(를) 새로 발견했습니다.');renderAll();
}
function tidy(){
 const cards=[...state.cards.values()].filter(c=>!c.busy),cols=Math.max(3,Math.floor((board.clientWidth-15)/114));
 cards.forEach((c,i)=>place(c,8+(i%cols)*112,8+Math.floor(i/cols)*143));
}

function renderAll(){renderHud();renderLife();renderDiscoveries();renderQuests();renderGoal();}
function renderHud(){ui.day.textContent=state.day+'일';ui.food.textContent=foodUnits();ui.pop.textContent=population();ui.meal.textContent=state.mealLeft+'초';ui.settlement.textContent=settlementScore();ui.explore.disabled=foodUnits()<1;}
function renderLife(){
 for(const k of ['hunt','farm','fish','herd']){const v=state.lifestyle[k];ui.values[k].textContent=v;ui.bars[k].style.width=Math.min(100,v*9)+'%';}
}
function renderDiscoveries(){const list=[...state.discoveries];ui.discoveryCount.textContent=list.length+'개';ui.discoveries.innerHTML=list.length?list.slice(-18).map(x=>'<span class="discovery">'+x+'</span>').join(''):'<span class="discovery">아직 없음</span>';}
function has(t){return [...state.cards.values()].some(c=>c.type===t);}
function renderQuests(){
 const q=[
  ['불을 안정적으로 피운다',has('campfire')],
  ['사슴을 잡아 가죽·뼈를 얻는다',state.discoveries.has('큰 사냥')],
  ['섬유를 꼬아 끈을 만든다',has('cord')||has('net')],
  ['생가죽을 긁개로 손질한다',has('dressedHide')||has('leatherClothing')||has('hideTent')],
  ['간돌도끼 같은 간석기를 만든다',has('groundAxe')],
  ['빗살무늬토기를 굽는다',has('combPottery')||has('storageJars')],
  ['농장·어장·목장 중 하나를 성장시킨다',has('milletFarm')||has('fishingGround')||has('netFishery')||has('trapFishery')||has('goatRanch')],
  ['정착도 9 이상',settlementScore()>=9]
 ];
 ui.questList.innerHTML=q.map(x=>'<div class="quest '+(x[1]?'done':'')+'"><i>'+(x[1]?'✓':'·')+'</i><span>'+x[0]+'</span></div>').join('');
}
function renderGoal(){
 const score=settlementScore();
 if(!has('campfire')){ui.goalTitle.textContent='첫 생활 기술 만들기';ui.goalText.textContent='재료를 모아 불과 석기를 만들어 보세요.';ui.hint.textContent='돌 + 돌 → 찍개 · 나무 + 섬유 → 모닥불';return;}
 if(!has('groundAxe')&&!has('combPottery')){ui.goalTitle.textContent='생활 기술 넓히기';ui.goalText.textContent='가죽, 간석기, 토기 중 원하는 방향부터 발전시키세요.';ui.hint.textContent='돌 + 강가 → 간 돌 · 생가죽 + 긁개 → 손질한 가죽 · 점토 2장 → 말린 토기';return;}
 if(score<9){ui.goalTitle.textContent='정착지를 키우기';ui.goalText.textContent='한 길만 고르지 말고 농경·어로·목축 생산지를 조합해도 됩니다.';ui.hint.textContent='조밭×3 → 조 농장 · 낚시 자리×3 → 낚시터 · 염소 우리×3 → 염소 목장';return;}
 ui.goalTitle.textContent='나만의 석기 사회';ui.goalText.textContent='이미 안정적인 정착지입니다. 다른 생산 방식과 생활 기술도 계속 연결해 보세요.';ui.hint.textContent='곡물 저장소·그물 어장·통발 어장·가죽옷·신석기 마을까지 확장할 수 있어요.';
}

let toastTimer;
function showToast(msg){ui.toast.textContent=msg;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),2100);}
function closeLayer(id){$('#'+id)?.classList.add('hidden');}
function start(){$('#startLayer').classList.add('hidden');reset();try{window.KidscadeGame?.start?.()}catch(_){}}

$('#startBtn').addEventListener('click',start);
$('#retryBtn').addEventListener('click',reset);
$('#restartBtn').addEventListener('click',reset);
$('#continueBtn').addEventListener('click',()=>$('#milestoneLayer').classList.add('hidden'));
$('#exploreBtn').addEventListener('click',explore);
$('#tidyBtn').addEventListener('click',tidy);
$('#helpBtn').addEventListener('click',()=>$('#helpLayer').classList.remove('hidden'));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeLayer(b.dataset.close)));
window.addEventListener('resize',()=>{for(const c of state.cards.values())place(c,clamp(c.x,4,Math.max(4,board.clientWidth-c.el.offsetWidth-4)),clamp(c.y,4,Math.max(4,board.clientHeight-c.el.offsetHeight-4)));});
})();