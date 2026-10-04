import * as THREE from 'three';

const ROOT=new URL('../assets/game/3d/',import.meta.url);
const NATURE=new URL('nature/kenney-nature-kit/',ROOT).href;
const SURVIVAL=new URL('survival/kenney-survival-kit/',ROOT).href;

const VISITORS={
  none:null,
  crafter:{name:'토리',title:'떠돌이 목공가',icon:'🪵',item:'wood',count:3,reward:34,line:'여행 중에 작은 수리할 일이 생겼어. 목재가 조금 필요해!'},
  collector:{name:'모아',title:'숲 수집가',icon:'🍄',item:'mushroom',count:2,reward:36,line:'이 마을 버섯은 색이 참 예쁘네. 두 개만 모아줄래?'},
  prospector:{name:'반짝',title:'돌 수집가',icon:'🪨',item:'stone',count:3,reward:36,line:'여기 돌은 결이 독특해. 표본으로 조금 가져가고 싶어.'},
  angler:{name:'파도',title:'여행 낚시꾼',icon:'🎣',item:'fish',count:2,reward:46,line:'씨앗마을 물고기가 궁금해. 오늘 잡은 물고기 두 마리와 바꿀까?'}
};

const REQUEST_POOL=[
  {npc:'junho',name:'준호',item:'wood',count:[4,6],reward:8,text:'작업대에 쓸 목재가 부족해.'},
  {npc:'doyun',name:'도윤',item:'stone',count:[4,6],reward:8,text:'마을 길 가장자리를 손볼 돌이 필요해.'},
  {npc:'woojin',name:'우진',item:'mushroom',count:[2,3],reward:13,text:'숲 버섯을 조금 조사하고 싶어.'},
  {npc:'yuna',name:'유나',item:'carrot',count:[2,3],reward:14,text:'오늘 요리에 싱싱한 당근이 필요해.'},
  {npc:'minji',name:'민지',item:'potato',count:[2,4],reward:13,text:'마트 시식 코너에 쓸 감자를 구하고 있어.'},
  {npc:'haneul',name:'하늘',item:'tomato',count:[2,3],reward:16,text:'카페 오늘 메뉴에 토마토를 쓰려고 해.'},
  {npc:'seoyeon',name:'서연',item:'fish',count:[2,3],reward:18,needsFishing:true,text:'Cube Pets 간식으로 신선한 물고기가 필요해.'}
];

function rngFrom(seed){
  let x=(Number(seed)||1)>>>0;
  return ()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296};
}
function shellMesh(){
  const g=new THREE.Group();
  const mat=new THREE.MeshStandardMaterial({color:0xf3b7a6,roughness:.78});
  const shell=new THREE.Mesh(new THREE.SphereGeometry(.23,10,7),mat);
  shell.scale.set(1,.38,.82);shell.rotation.z=-.22;shell.position.y=.12;g.add(shell);
  for(let i=-2;i<=2;i++){
    const ridge=new THREE.Mesh(new THREE.BoxGeometry(.025,.025,.32),new THREE.MeshStandardMaterial({color:0xd98f84,roughness:.8}));
    ridge.position.set(i*.07,.19,0);ridge.rotation.y=.15*i;g.add(ridge);
  }
  return g;
}
function sparkleMesh(){
  const g=new THREE.Group();
  const ring=new THREE.Mesh(new THREE.RingGeometry(.22,.34,18),new THREE.MeshStandardMaterial({color:0xffdc65,emissive:0xffb52d,emissiveIntensity:1.15,side:THREE.DoubleSide,roughness:.5}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.035;g.add(ring);
  const light=new THREE.PointLight(0xffc95d,1.15,3.2,2);light.position.y=.42;g.add(light);
  return g;
}

export async function createDailyLife(ctx){
  const {parent,addModel,interact,prog,inv,persist,toast,openPanel,itemName,addInventoryItem,canCarryNewKey,townEconomy,getDailyState,getDevelopment,setAvatarAction,playSfx}=ctx;
  const actors=[],group=new THREE.Group();group.name='daily-life';parent.add(group);
  let day=0,state=null;

  function taken(){const p=prog();p.dailyWorld=p.dailyWorld&&typeof p.dailyWorld==='object'?p.dailyWorld:{};p.dailyWorld.taken=p.dailyWorld.taken&&typeof p.dailyWorld.taken==='object'?p.dailyWorld.taken:{};return p.dailyWorld.taken}
  function mark(key){taken()[key]=true;persist();syncVisibility()}
  function addActor(key,kind,object,r,label,action){
    object.visible=false;group.add(object);
    const it=interact('outdoor',0,0,r,label,action);
    const a={key,kind,object,interaction:it,x:0,z:0};actors.push(a);return a;
  }
  function posActor(a,x,z){a.x=x;a.z=z;a.object.position.x=x;a.object.position.z=z;a.interaction.x=x;a.interaction.z=z}
  function syncVisibility(){const got=taken();for(const a of actors){const visible=!got[a.key];a.object.visible=visible;a.interaction.enabled=visible}}
  function collectItem(a,key,qty,label){
    if(!canCarryNewKey(key)){toast('🎒 '+label+'을(를) 넣을 가방 칸이 없어요.');return}
    if(!addInventoryItem(key,qty,{silent:true}))return;
    mark(a.key);setAvatarAction?.('smile',500);playSfx?.('pickup',.13);toast(label+' +'+qty);
  }

  for(let i=0;i<3;i++){
    const a=addActor('shell-'+i,'shell',shellMesh(),.9,'🐚 조개껍데기 줍기',()=>collectItem(a,'shell',1,'조개껍데기'));
  }
  for(let i=0;i<3;i++){
    const obj=await addModel(group,NATURE+'mushroom-red-group.glb',{x:0,z:0,w:.72,h:.52,d:.68,name:'daily-mushroom-'+i});
    if(!obj)continue;group.remove(obj);
    const a=addActor('mushroom-'+i,'mushroom',obj,1.0,'🍄 오늘의 버섯 줍기',()=>{
      const bonus=(prog().cubePets?.companion==='fox'?1:0)+(Number(prog().town?.perks?.mushroomBonus)||0);
      collectItem(a,'mushroom',1+bonus,'버섯');
    });
  }
  const bottleObj=await addModel(group,SURVIVAL+'bottle.glb',{x:0,z:0,w:.42,h:.30,d:.42,rot:Math.PI/2,name:'daily-message-bottle'});
  let bottleActor=null;
  if(bottleObj){group.remove(bottleObj);bottleActor=addActor('message-bottle','bottle',bottleObj,1.0,'🍾 병 편지 열어보기',()=>openBottle())}
  const sparkle=addActor('sparkle-ground','sparkle',sparkleMesh(),1.0,'✨ 반짝이는 땅 파보기',()=>digSparkle());

  function openBottle(){
    if(taken()['message-bottle'])return;
    const types=['potato','carrot','tomato','strawberry','corn','pumpkin'],seed=Number(state?.forageSeed)||1,type=types[seed%types.length],p=prog();
    p.seeds[type]=(p.seeds[type]||0)+2;mark('message-bottle');setAvatarAction?.('smile',700);playSfx?.('success',.12);
    toast('💌 병 편지 속 선물 · '+itemName(type)+' 씨앗 +2');
  }
  function digSparkle(){
    if(taken()['sparkle-ground'])return;
    const coins=35+(Number(state?.forageSeed||0)%4)*5,t=townEconomy.ensureState(prog());
    t.coins+=coins;mark('sparkle-ground');setAvatarAction?.('smile',700);playSfx?.('pickup',.16);
    toast('✨ 반짝이는 땅에서 '+coins+'코인을 찾았어요!');
  }

  function generateRequests(){
    const p=prog(),daily=p.dailyWorld;
    if(Array.isArray(daily.requests)&&Number(daily.requestDay)===p.survival.day)return daily.requests;
    const rng=rngFrom(state?.requestSeed||state?.forageSeed||1),dev=getDevelopment?.()||{},pool=REQUEST_POOL.filter(x=>!x.needsFishing||Number(dev.fishingLevel)>0);
    const shuffled=[...pool].sort(()=>rng()-.5),requests=[];
    for(const def of shuffled){
      if(requests.length>=3)break;
      const count=def.count[0]+Math.floor(rng()*(def.count[1]-def.count[0]+1));
      requests.push({id:p.survival.day+'-'+def.npc+'-'+def.item,npc:def.npc,name:def.name,item:def.item,count,reward:def.reward*count+8,text:def.text});
    }
    daily.requestDay=p.survival.day;daily.requests=requests;daily.requestDone={};persist();return requests;
  }
  function requestDone(){const p=prog();p.dailyWorld.requestDone=p.dailyWorld.requestDone&&typeof p.dailyWorld.requestDone==='object'?p.dailyWorld.requestDone:{};return p.dailyWorld.requestDone}
  function boardPanel(){
    const reqs=generateRequests(),done=requestDone(),cards=reqs.map(q=>{
      const have=Number(inv()[q.item]||0),finished=!!done[q.id];
      return '<div class="item"><b>📌 '+q.name+'의 부탁</b><div>'+q.text+'</div><small>'+itemName(q.item)+' '+q.count+'개 · 보상 '+q.reward+'코인 + 친밀도 ♥1</small><br><button data-daily-request="'+q.id+'" '+(finished||have<q.count?'disabled':'')+'>'+(finished?'완료':have>=q.count?'전해주기':'보유 '+have+'/'+q.count)+'</button></div>';
    }).join('');
    openPanel('<h2>📌 오늘의 주민 부탁</h2><p>오늘 붙은 메모는 오늘 밤까지 유효해요. 부탁을 들어주면 판매보다 조금 더 좋은 보상과 친밀도를 받아요.</p><div class="grid">'+cards+'</div>');
  }
  function completeRequest(id){
    const q=generateRequests().find(x=>x.id===id),done=requestDone();if(!q||done[id])return;
    const bag=inv();if((bag[q.item]||0)<q.count){toast('필요한 물건이 부족해요.');return}
    bag[q.item]-=q.count;done[id]=true;
    const t=townEconomy.ensureState(prog());t.coins+=q.reward;
    townEconomy.addFriendship?.(q.npc,1,{silent:true});
    persist();setAvatarAction?.('smile',650);playSfx?.('success',.12);toast(q.name+'의 부탁 완료 · +'+q.reward+'코인 · 친밀도 ♥1');boardPanel();
  }

  function visitorPanel(){
    const v=VISITORS[state?.visitor]||null;
    if(!v){toast('오늘은 광장에 특별한 방문객이 없어요.');return}
    const done=!!prog().dailyWorld.visitorDone,have=Number(inv()[v.item]||0);
    openPanel('<h2>'+v.icon+' '+v.name+' · '+v.title+'</h2><p>'+v.line+'</p><div class="item"><b>'+itemName(v.item)+' '+v.count+'개 ↔ '+v.reward+'코인</b><br><button data-daily-visitor="trade" '+(done||have<v.count?'disabled':'')+'>'+(done?'오늘 거래 완료':have>=v.count?'교환하기':'보유 '+have+'/'+v.count)+'</button></div>');
  }
  function tradeVisitor(){
    const v=VISITORS[state?.visitor]||null,p=prog();if(!v||p.dailyWorld.visitorDone)return;
    if((inv()[v.item]||0)<v.count){toast('교환할 물건이 부족해요.');return}
    inv()[v.item]-=v.count;p.dailyWorld.visitorDone=true;townEconomy.ensureState(p).coins+=v.reward;
    persist();setAvatarAction?.('smile',650);playSfx?.('success',.12);toast(v.name+'와 거래 완료 · +'+v.reward+'코인');visitorPanel();
  }

  function layoutFor(current){
    const rng=rngFrom(current?.forageSeed||1);
    const beach=[[-43,-28],[-40,-20],[-36,-29],[-33,-19],[-29,-27],[-31,-23],[-42,-24]];
    const forest=[[-43,5],[-40,-5],[-36,6],[-33,-6],[-29,4],[-31,-1],[-41,0]];
    const sparkleSpots=[[-7,6],[7,7],[-29,29],[31,7],[-5,31],[20,-27]];
    const take=(arr,count)=>[...arr].sort(()=>rng()-.5).slice(0,count).map(([x,z])=>({x:x+(rng()-.5)*1.2,z:z+(rng()-.5)*1.2}));
    const shells=take(beach,3),mushrooms=take(forest,3),bottle=take(beach.filter(p=>!shells.some(s=>Math.hypot(s.x-p[0],s.z-p[1])<2)),1)[0]||{x:-36,z:-20},sp=take(sparkleSpots,1)[0];
    return {shells,mushrooms,bottle,sparkle:sp};
  }
  function refreshDay(current=getDailyState?.()){
    if(!current)return;state=current;day=Number(current.day)||0;
    const p=prog();p.dailyWorld=p.dailyWorld&&typeof p.dailyWorld==='object'?p.dailyWorld:{...current};
    p.dailyWorld.taken=p.dailyWorld.taken&&typeof p.dailyWorld.taken==='object'?p.dailyWorld.taken:{};
    p.dailyWorld.visitorDone=!!p.dailyWorld.visitorDone;
    const lay=layoutFor(current),shellActors=actors.filter(a=>a.kind==='shell'),mushActors=actors.filter(a=>a.kind==='mushroom');
    shellActors.forEach((a,i)=>posActor(a,lay.shells[i].x,lay.shells[i].z));
    mushActors.forEach((a,i)=>posActor(a,lay.mushrooms[i].x,lay.mushrooms[i].z));
    if(bottleActor)posActor(bottleActor,lay.bottle.x,lay.bottle.z);
    posActor(sparkle,lay.sparkle.x,lay.sparkle.z);
    generateRequests();syncVisibility();persist();
  }
  function sync(){
    const current=getDailyState?.();if(!current)return;
    if(Number(current.day)!==day)refreshDay(current);
  }
  function handlePanelClick(target){
    const req=target.closest?.('[data-daily-request]');if(req){completeRequest(req.dataset.dailyRequest);return true}
    const vis=target.closest?.('[data-daily-visitor]');if(vis){tradeVisitor();return true}
    return false;
  }
  function visitorInfo(){return VISITORS[state?.visitor]||null}
  refreshDay(getDailyState?.());
  return {refreshDay,sync,boardPanel,visitorPanel,handlePanelClick,visitorInfo,VISITORS};
}
