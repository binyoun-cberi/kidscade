import * as THREE from 'three';

const ROOT=new URL('../assets/game/3d/interiors/kenney-furniture-kit/',import.meta.url).href;

export const FURNITURE_CATALOG={
  bedSingle:{name:'나무 침대',file:'bed-single.glb',w:2.6,h:1.25,d:2.1,cw:1.6,cd:2.35,use:'침대에서 자기',source:'목수공방 제작'},
  kitchenStove:{name:'가스레인지',file:'kitchen-stove.glb',w:1.3,h:1.45,d:1.1,cw:1.1,cd:.78,use:'요리하기',source:'목수공방 2단계 제작'},
  kitchenSink:{name:'싱크대·수도꼭지',file:'kitchen-sink.glb',w:1.55,h:1.3,d:1.0,cw:1.35,cd:.78,use:'수도 사용하기',source:'수도 3단계 + 목수공방 제작'},
  kitchenCabinet:{name:'큰 수납장',file:'kitchen-cabinet.glb',w:1.55,h:1.3,d:1.0,cw:1.35,cd:.78,use:'집 수납 열기',source:'목수공방 제작'},
  kitchenFridge:{name:'냉장고',file:'kitchen-fridge.glb',w:1.25,h:2.3,d:1.2,cw:1.0,cd:.9,use:'냉장고 열기',source:'목수공방 3단계 제작'},
  homeDrawers:{name:'서랍장',file:'side-table-drawers.glb',w:1.15,h:1.05,d:1.0,cw:.85,cd:.76,use:'집 수납 열기',source:'목수공방 1단계 제작'},
  wardrobe:{name:'옷장',file:'bookcase-closed-wide.glb',w:2.0,h:2.2,d:.8,cw:1.7,cd:.65,use:'옷 갈아입기',source:'목수공방 2단계 제작'},
  classicDesk:{name:'기본 책상',file:'desk.glb',w:2.0,h:1.4,d:1.2,cw:1.8,cd:.9,recipe:{wood:8,iron:1},use:'책상 사용하기'},
  tallBookcase:{name:'기본 책장',file:'bookcase-open.glb',w:1.6,h:2.45,d:.78,cw:1.35,cd:.62,recipe:{wood:10},use:'책장 살펴보기'},
  classicSofa:{name:'기본 소파',file:'lounge-sofa.glb',w:2.9,h:1.4,d:1.45,cw:2.5,cd:1.1,recipe:{wood:12,iron:1},use:'소파에 앉기'},
  diningTable:{name:'기본 식탁',file:'table.glb',w:2.4,h:1.3,d:1.9,cw:2.0,cd:1.5,recipe:{wood:9},use:'식탁 사용하기'},
  rugRectangle:{name:'거실 러그',file:'rug-rectangle.glb',w:4.2,h:.10,d:2.8,cw:0,cd:0},
  woodChair:{name:'나무 의자',file:'chair.glb',w:.95,h:1.35,d:.95,cw:.72,cd:.72,recipe:{wood:4}},
  sideTable:{name:'작은 협탁',file:'side-table.glb',w:1.1,h:1.0,d:1.0,cw:.82,cd:.78,recipe:{wood:5,stone:1}},
  pottedPlant:{name:'화분',file:'potted-plant.glb',w:.9,h:1.35,d:.9,cw:.62,cd:.62,recipe:{wood:2,stone:2}},
  bookcase:{name:'낮은 책장',file:'bookcase-open-low.glb',w:1.8,h:1.55,d:.75,cw:1.55,cd:.62,recipe:{wood:7}},
  coffeeTable:{name:'커피 테이블',file:'table-coffee.glb',w:1.7,h:.8,d:1.15,cw:1.42,cd:.92,recipe:{wood:6}},
  loungeChair:{name:'라운지 의자',file:'lounge-chair.glb',w:1.25,h:1.25,d:1.35,cw:1.0,cd:1.08,recipe:{wood:5,iron:1}},
  rugRound:{name:'둥근 러그',file:'rug-round.glb',w:2.2,h:.10,d:2.2,cw:0,cd:0},
  floorLamp:{name:'플로어 램프',file:'lamp-round-floor.glb',w:.7,h:2.0,d:.7,cw:.46,cd:.46},
  teddy:{name:'곰 인형',file:'bear.glb',w:.8,h:.95,d:.75,cw:.45,cd:.42},
  television:{name:'모던 TV',file:'television-modern.glb',w:1.55,h:1.2,d:.55,cw:1.25,cd:.42,source:'기술 공방 3단계 · 3×3 제작대',use:'TV 보기'},
  minjiPlanter:{name:'민지의 시장 화분',file:'plant-small3.glb',w:.8,h:1.0,d:.8,cw:.5,cd:.5,source:'민지 친밀도 희귀 보상'},
  junhoStool:{name:'준호의 작업 스툴',file:'stool-bar-square.glb',w:.85,h:1.25,d:.85,cw:.6,cd:.6,source:'준호 친밀도 희귀 보상'},
  haneulTable:{name:'하늘의 카페 테이블',file:'table-round.glb',w:1.6,h:1.15,d:1.6,cw:1.3,cd:1.3,source:'하늘 친밀도 희귀 보상'},
  doyunBench:{name:'도윤의 마을 벤치',file:'bench-cushion.glb',w:2.0,h:1.0,d:.85,cw:1.7,cd:.7,source:'도윤 친밀도 희귀 보상'},
  yunaPlant:{name:'유나의 작은 화초',file:'plant-small2.glb',w:.75,h:.95,d:.75,cw:.46,cd:.46,source:'유나 친밀도 희귀 보상'},
  taehoRetroTv:{name:'태호의 레트로 게임 TV',file:'television-vintage.glb',w:1.35,h:1.1,d:.65,cw:1.1,cd:.5,source:'태호 친밀도 희귀 보상',use:'레트로 게임 하기'},
  soraBookcase:{name:'소라의 고전 책장',file:'bookcase-closed-wide.glb',w:2.0,h:2.2,d:.8,cw:1.7,cd:.65,source:'소라 친밀도 희귀 보상',use:'희귀 책 읽기'},
  hyunwooDrawers:{name:'현우의 배달 서랍장',file:'side-table-drawers.glb',w:1.05,h:1.0,d:.95,cw:.8,cd:.72,source:'현우 친밀도 희귀 보상'},
  nariLamp:{name:'나리의 진료실 램프',file:'lamp-square-floor.glb',w:.7,h:2.0,d:.7,cw:.46,cd:.46,source:'나리 친밀도 희귀 보상'},
  woojinRelaxChair:{name:'우진의 숲 휴식의자',file:'lounge-chair-relax.glb',w:1.35,h:1.25,d:1.5,cw:1.05,cd:1.2,source:'우진 친밀도 희귀 보상'},
  seoyeonPetChair:{name:'서연의 펫 의자',file:'chair-rounded.glb',w:1.0,h:1.25,d:1.0,cw:.75,cd:.75,source:'서연 친밀도 희귀 보상'},
  minseokTravelBench:{name:'민석의 여행 벤치',file:'bench-cushion-low.glb',w:2.0,h:.75,d:.85,cw:1.7,cd:.7,source:'민석 친밀도 희귀 보상'}
};

function recipeText(def,itemName){
  if(def.source)return def.source;
  if(!def.recipe)return '마을 상점에서 구할 수 있어요.';
  return Object.entries(def.recipe).map(([k,v])=>itemName(k)+' '+v).join(' · ');
}
function safeCount(v){return Math.max(0,Math.floor(Number(v)||0));}

export function createFurnishingSystem(ctx){
  const {
    parent,addModel,interact,collider,prog,inv,persist,openPanel,closePanel,toast,
    setAvatarAction,itemName,getMode,getPlacementPose,canPlace,useFurniture
  }=ctx;

  const actors=new Map();
  let active=null;

  const style=document.createElement('style');
  style.textContent='.furnish-toolbar{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);z-index:24;display:none;gap:7px;align-items:center;padding:8px 10px;background:rgba(35,46,35,.94);border:2px solid #e1d18d;border-radius:14px;box-shadow:0 8px 22px rgba(0,0,0,.24)}.furnish-toolbar.show{display:flex}.furnish-toolbar button{border:2px solid #647257;background:#fff5c9;color:#2f3b2e;border-radius:9px;padding:8px 10px;font-weight:900;touch-action:none}.furnish-toolbar .state{color:#fff3c4;font-size:11px;font-weight:900;min-width:96px;text-align:center}@media(max-width:760px){.furnish-toolbar{bottom:112px;max-width:92vw;flex-wrap:wrap;justify-content:center}.furnish-toolbar button{padding:9px 11px}.furnish-toolbar .state{width:100%;order:-1}}';
  document.head.appendChild(style);
  const toolbar=document.createElement('div');
  toolbar.className='furnish-toolbar';
  toolbar.innerHTML='<span class="state">배치 위치를 고르세요</span><button type="button" data-furnish-rotate>↻ 회전</button><button type="button" data-furnish-confirm>✓ 배치</button><button type="button" data-furnish-cancel>✕ 취소</button>';
  document.getElementById('app')?.appendChild(toolbar);
  const toolbarState=toolbar.querySelector('.state');
  toolbar.querySelector('[data-furnish-rotate]').onclick=()=>rotatePlacement();
  toolbar.querySelector('[data-furnish-confirm]').onclick=()=>confirmPlacement();
  toolbar.querySelector('[data-furnish-cancel]').onclick=()=>cancelPlacement();

  function ensureState(){
    const p=prog();
    const raw=p.housing&&typeof p.housing==='object'?p.housing:{};
    const owned=raw.owned&&typeof raw.owned==='object'?raw.owned:{};
    const cleanOwned={};
    for(const key of Object.keys(FURNITURE_CATALOG))cleanOwned[key]=safeCount(owned[key]);
    p.housing={
      version:4,
      owned:cleanOwned,
      placed:Array.isArray(raw.placed)?raw.placed.filter(r=>r&&FURNITURE_CATALOG[r.key]).map(r=>({
        id:String(r.id||'f'+Date.now()),
        key:r.key,
        x:Number.isFinite(Number(r.x))?Number(r.x):0,
        z:Number.isFinite(Number(r.z))?Number(r.z):0,
        rot:Math.round(Number(r.rot)||0)%4
      })):[],
      starterGiftClaimed:!!raw.starterGiftClaimed,
      defaultLayoutMigrated:!!raw.defaultLayoutMigrated,
      functionalLayoutMigrated:!!raw.functionalLayoutMigrated,
      nextId:Math.max(1,Math.floor(Number(raw.nextId)||1))
    };
    return p.housing;
  }

  function setGhost(object,on){
    object.traverse(n=>{
      if(!n.isMesh||!n.material)return;
      const mats=Array.isArray(n.material)?n.material:[n.material];
      for(const m of mats){m.transparent=!!on;m.opacity=on?.58:1;m.depthWrite=!on;}
    });
  }
  function dims(def,rot){
    const odd=Math.abs(rot)%2===1;
    return {w:odd?def.cd:def.cw,d:odd?def.cw:def.cd};
  }
  function setHandles(actor,enabled){
    if(actor.interaction)actor.interaction.enabled=enabled;
    if(actor.collision)actor.collision.enabled=enabled;
  }
  function updateHandles(actor){
    if(!actor)return;
    const rec=actor.rec,def=FURNITURE_CATALOG[rec.key],d=dims(def,rec.rot);
    if(actor.interaction){actor.interaction.x=rec.x;actor.interaction.z=rec.z;}
    if(actor.collision){actor.collision.x=rec.x;actor.collision.z=rec.z;actor.collision.w=d.w;actor.collision.d=d.d;}
  }
  function registerActor(rec,object){
    const def=FURNITURE_CATALOG[rec.key],d=dims(def,rec.rot);
    const actor={rec,object,interaction:null,collision:null};
    actor.interaction=interact('indoor',rec.x,rec.z,1.18,def.name+(def.use?' 사용·꾸미기':' 꾸미기'),()=>furnitureActionPanel(rec.id));
    if(d.w>0&&d.d>0)actor.collision=collider('indoor',rec.x,rec.z,d.w,d.d);
    actors.set(rec.id,actor);
    return actor;
  }
  async function spawn(rec){
    const def=FURNITURE_CATALOG[rec.key];if(!def)return null;
    const object=await addModel(parent,ROOT+def.file,{x:rec.x,z:rec.z,w:def.w,h:def.h,d:def.d,rot:rec.rot*Math.PI/2,name:'placed-'+rec.id});
    if(!object)return null;
    return registerActor(rec,object);
  }


  function catalogPanel(){
    if(getMode()!=='indoor'){toast('집 안에서만 꾸밀 수 있어요.');return;}
    const s=ensureState();
    const ownedCards=Object.entries(FURNITURE_CATALOG).map(([key,def])=>{
      const count=s.owned[key]||0;
      return '<div class="item"><b>'+def.name+'</b><div>보관 '+count+'개</div><small>'+recipeText(def,itemName)+'</small><br><button data-furn-place="'+key+'" '+(count>0?'':'disabled')+'>배치하기</button></div>';
    }).join('');
    openPanel('<h2>🏠 가구 창고 · 집 꾸미기</h2><p>목수공방이나 마을 보상으로 얻은 가구를 집 안에 직접 배치해요.</p><div class="grid">'+ownedCards+'</div><p style="font-size:12px">새 가구 제작은 농장 옆 <b>목수공방</b>에서 할 수 있어요.</p>');
  }

  async function beginPlacement(key,actor=null){
    if(active||getMode()!=='indoor')return;
    const def=FURNITURE_CATALOG[key],s=ensureState();if(!def)return;
    if(!actor&&(s.owned[key]||0)<=0){toast('보관 중인 '+def.name+'이(가) 없어요.');return;}
    closePanel();
    let object=actor?.object||null;
    if(actor){setHandles(actor,false);}
    else{
      object=await addModel(parent,ROOT+def.file,{x:0,z:0,w:def.w,h:def.h,d:def.d,rot:0,name:'placing-'+key});
      if(!object)return;
    }
    setGhost(object,true);
    active={key,actor,object,rot:actor?.rec.rot||0,valid:false,isNew:!actor};
    toolbar.classList.add('show');
    updatePreview();
    toast('이동해서 위치 선택 · 회전 후 배치');
  }

  function updatePreview(){
    if(!active)return;
    if(getMode()!=='indoor'){cancelPlacement();return;}
    const pose=getPlacementPose(),def=FURNITURE_CATALOG[active.key];
    let dx=Number(pose.dx)||0,dz=Number(pose.dz)||1;
    if(Math.abs(dx)+Math.abs(dz)<.01)dz=1;
    const len=Math.hypot(dx,dz)||1;dx/=len;dz/=len;
    const dist=Math.max(1.15,Math.max(def.cw,def.cd)*.72);
    const x=Math.round((pose.x+dx*dist)*2)/2,z=Math.round((pose.z+dz*dist)*2)/2;
    const d=dims(def,active.rot);
    active.valid=canPlace(x,z,d.w,d.d,active.actor?.collision||null);
    active.x=x;active.z=z;
    active.object.position.x=x;active.object.position.z=z;active.object.rotation.y=active.rot*Math.PI/2;
    toolbarState.textContent=active.valid?'✓ 여기에 놓을 수 있어요':'✕ 다른 위치를 골라주세요';
  }

  function rotatePlacement(){
    if(!active)return;
    active.rot=(active.rot+1)%4;updatePreview();
  }

  function finalizeActor(actor){
    const def=FURNITURE_CATALOG[actor.rec.key],d=dims(def,actor.rec.rot);
    actor.object.position.x=actor.rec.x;actor.object.position.z=actor.rec.z;actor.object.rotation.y=actor.rec.rot*Math.PI/2;
    if(!actor.interaction)actor.interaction=interact('indoor',actor.rec.x,actor.rec.z,1.18,def.name+(def.use?' 사용·꾸미기':' 꾸미기'),()=>furnitureActionPanel(actor.rec.id));
    if(d.w>0&&d.d>0&&!actor.collision)actor.collision=collider('indoor',actor.rec.x,actor.rec.z,d.w,d.d);
    updateHandles(actor);setHandles(actor,true);setGhost(actor.object,false);
  }

  function confirmPlacement(){
    if(!active)return false;
    if(!active.valid){toast('그 자리에는 놓을 수 없어요.');return true;}
    const s=ensureState(),def=FURNITURE_CATALOG[active.key];
    if(active.isNew){
      if((s.owned[active.key]||0)<=0){toast('보관 가구가 없어요.');cancelPlacement();return true;}
      s.owned[active.key]--;
      const rec={id:'f'+s.nextId++,key:active.key,x:active.x,z:active.z,rot:active.rot};
      s.placed.push(rec);
      const actor=registerActor(rec,active.object);
      finalizeActor(actor);
    }else{
      const actor=active.actor;
      actor.rec.x=active.x;actor.rec.z=active.z;actor.rec.rot=active.rot;
      finalizeActor(actor);
    }
    persist();setAvatarAction('smile',550);toast(def.name+' 배치 완료!');
    active=null;toolbar.classList.remove('show');return true;
  }

  function cancelPlacement(){
    if(!active)return false;
    if(active.isNew){parent.remove(active.object);}
    else{setGhost(active.object,false);setHandles(active.actor,true);active.object.position.x=active.actor.rec.x;active.object.position.z=active.actor.rec.z;active.object.rotation.y=active.actor.rec.rot*Math.PI/2;}
    active=null;toolbar.classList.remove('show');toast('가구 배치를 취소했어요.');return true;
  }

  function furnitureActionPanel(id){
    const actor=actors.get(String(id));if(!actor)return;
    const def=FURNITURE_CATALOG[actor.rec.key];
    const use=def.use?'<button data-furn-use="'+id+'">'+def.use+'</button>':'';
    openPanel('<h2>'+def.name+'</h2><p>이 가구는 이제 우리 집 어디든 옮길 수 있어요.</p><div class="grid">'+use+'<button data-furn-move="'+id+'">옮기기</button><button data-furn-turn="'+id+'">90° 회전</button><button data-furn-store="'+id+'">창고에 넣기</button></div>');
  }
  function usePlaced(id){
    const actor=actors.get(String(id));if(!actor)return true;
    closePanel();useFurniture?.(actor.rec.key);return true;
  }
  function turnPlaced(id){
    const actor=actors.get(String(id));if(!actor)return true;
    const def=FURNITURE_CATALOG[actor.rec.key],next=(actor.rec.rot+1)%4,d=dims(def,next);
    if(!canPlace(actor.rec.x,actor.rec.z,d.w,d.d,actor.collision)){toast('회전할 공간이 부족해요.');return true;}
    actor.rec.rot=next;actor.object.rotation.y=next*Math.PI/2;updateHandles(actor);persist();toast(def.name+' 회전');furnitureActionPanel(id);return true;
  }
  function storePlaced(id){
    const actor=actors.get(String(id));if(!actor)return true;
    const s=ensureState(),def=FURNITURE_CATALOG[actor.rec.key];
    s.placed=s.placed.filter(r=>String(r.id)!==String(id));
    s.owned[actor.rec.key]=(s.owned[actor.rec.key]||0)+1;
    setHandles(actor,false);parent.remove(actor.object);actors.delete(String(id));
    persist();closePanel();toast(def.name+'을(를) 창고에 넣었어요.');return true;
  }

  function handlePanelClick(e){
    const placeBtn=e.target.closest('[data-furn-place]');if(placeBtn){beginPlacement(placeBtn.dataset.furnPlace);return true;}
    const useBtn=e.target.closest('[data-furn-use]');if(useBtn)return usePlaced(useBtn.dataset.furnUse);
    const moveBtn=e.target.closest('[data-furn-move]');if(moveBtn){const a=actors.get(moveBtn.dataset.furnMove);if(a)beginPlacement(a.rec.key,a);return true;}
    const turnBtn=e.target.closest('[data-furn-turn]');if(turnBtn)return turnPlaced(turnBtn.dataset.furnTurn);
    const storeBtn=e.target.closest('[data-furn-store]');if(storeBtn)return storePlaced(storeBtn.dataset.furnStore);
    return false;
  }

  async function restore(){
    const s=ensureState();
    for(const rec of s.placed){
      if(actors.has(String(rec.id)))continue;
      await spawn(rec);
    }
  }

  return {
    ensureState,restore,openCatalog:catalogPanel,handlePanelClick,beginPlacement,
    updatePreview,rotate:rotatePlacement,confirm:confirmPlacement,cancel:cancelPlacement,
    isPlacing:()=>!!active,catalog:FURNITURE_CATALOG
  };
}
