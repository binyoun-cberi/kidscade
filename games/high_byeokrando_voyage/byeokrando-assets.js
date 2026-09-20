/* Byeokrando hybrid port asset pass v3: illustrated hub preserved, separate regional 3D views */
(() => {
  'use strict';
  const T=window.THREE, Loader=window.GLTFLoader, B=window.__byeokrandoBridge;
  if(!T||!Loader||!B)return;

  const scriptBase=(()=>{try{return new URL('.',document.currentScript?.src||location.href)}catch(_){return new URL('.',location.href)}})();
  const url=p=>new URL(p,scriptBase).href;

  const MODELS={
    rowSmall:{preferred:url('../../assets/game/3d/byeokrando/ships/boat-row-small.glb')},
    rowLarge:{preferred:url('../../assets/game/3d/byeokrando/ships/boat-row-large.glb')},
    crate:{preferred:url('../../assets/game/3d/byeokrando/port_props/Crate.glb'),fallback:url('../../assets/game/3d/survival/kenney-survival-kit/box.glb')},
    bags:{preferred:url('../../assets/game/3d/byeokrando/port_props/Bags.glb'),fallback:url('../../assets/game/food/bag.glb')},
    bag:{preferred:url('../../assets/game/3d/byeokrando/port_props/Bag.glb')},
    bagOpen:{preferred:url('../../assets/game/3d/byeokrando/port_props/Bag%20Open.glb')},
    cart:{preferred:url('../../assets/game/3d/byeokrando/port_props/Cart.glb')},
    parcel:{preferred:url('../../assets/game/3d/byeokrando/port_props/Package.glb'),fallback:url('../../assets/game/3d/survival/kenney-survival-kit/box-large.glb')},
    parcelAlt:{preferred:url('../../assets/game/3d/byeokrando/port_props/Package-kYvD6QCQRd.glb')},
    smoke:{preferred:url('../../assets/game/3d/byeokrando/port_props/Smoke.glb')},
    well:{preferred:url('../../assets/game/3d/byeokrando/port_props/Well.glb')},
    bench:{preferred:url('../../assets/game/3d/byeokrando/port_props/Bench.glb')},
    fence:{preferred:url('../../assets/game/3d/byeokrando/port_props/Fence.glb')},
    hay:{preferred:url('../../assets/game/3d/byeokrando/port_props/Hay.glb')},
    cauldron:{preferred:url('../../assets/game/3d/byeokrando/port_props/Cauldron.glb')},
    stairs:{preferred:url('../../assets/game/3d/byeokrando/port_props/Stairs.glb')},
    rocks:{preferred:url('../../assets/game/3d/byeokrando/port_props/Rocks.glb')},
    horse:{preferred:url('../../assets/game/3d/byeokrando/animals/Horse.glb')},
    donkey:{preferred:url('../../assets/game/3d/byeokrando/animals/Donkey.glb')},
    cow:{preferred:url('../../assets/game/3d/byeokrando/animals/Cow.glb')},
    bull:{preferred:url('../../assets/game/3d/byeokrando/animals/Bull.glb')},
    bucket:{preferred:url('../../assets/game/3d/byeokrando/trade_props/fantasy_props/Bucket_Wooden_1.gltf')},
    pot:{preferred:url('../../assets/game/3d/byeokrando/trade_props/fantasy_props/Pot_1.gltf')},
    vase2:{preferred:url('../../assets/game/3d/byeokrando/trade_props/fantasy_props/Vase_2.gltf')},
    vase4:{preferred:url('../../assets/game/3d/byeokrando/trade_props/fantasy_props/Vase_4.gltf')},
    scroll1:{preferred:url('../../assets/game/3d/byeokrando/trade_props/fantasy_props/Scroll_1.gltf')},
    scroll2:{preferred:url('../../assets/game/3d/byeokrando/trade_props/fantasy_props/Scroll_2.gltf')},
    rope1:{preferred:url('../../assets/game/3d/byeokrando/trade_props/fantasy_props/Rope_1.gltf')},
    rope2:{preferred:url('../../assets/game/3d/byeokrando/trade_props/fantasy_props/Rope_2.gltf')},
    rope3:{preferred:url('../../assets/game/3d/byeokrando/trade_props/fantasy_props/Rope_3.gltf')},
    table:{preferred:url('../../assets/game/3d/byeokrando/trade_props/fantasy_props/Table_Large.gltf')},
    workbench:{preferred:url('../../assets/game/3d/byeokrando/trade_props/fantasy_props/Workbench.gltf')},
    pouch:{preferred:url('../../assets/game/3d/byeokrando/trade_props/fantasy_props/Pouch_Large.gltf')}
  };

  const PORT_SCENES={
    byeokrando:{
      note:'고려청자·인삼·고려지와 외국 상인이 모이는 종합 무역항',
      items:[
        ['cart',-22,0,31,5.2,-.32],['vase2',-8,0,34,2.2,.1],['vase4',-4,0,35,2.0,-.2],
        ['scroll1',6,0,33,1.8,.15],['table',11,0,34,4.8,.05],['donkey',31,0,24,5.0,-.45],
        ['hay',36,0,23,3.1,.1],['bags',20,0,40,2.5,.25],['rope1',-42,0,50,2.4,.1]
      ]
    },
    donghae:{
      note:'어업·소금 교역이 중심인 비교적 작은 고려 연안항',
      items:[
        ['rope1',-42,0,50,2.5,.1],['rope2',-35,0,49,2.1,-.2],['bucket',-17,0,34,2.0,.1],
        ['cauldron',4,0,30,2.5,.1],['bagOpen',15,0,35,2.1,-.2],['smoke',7,0,28,3.8,0],
        ['bench',31,0,28,3.7,.15],['rocks',49,0,48,3.7,0]
      ]
    },
    namhae:{
      note:'송·일본 항로를 잇는 고려의 중계항',
      items:[
        ['cart',-21,0,33,4.8,-.25],['parcel',-8,0,38,2.1,.1],['parcelAlt',-3,0,39,2.0,-.1],
        ['pot',12,0,34,2.1,.2],['bags',23,0,39,2.4,-.15],['rope3',37,0,49,2.4,.15],
        ['bucket',44,0,34,1.8,-.1]
      ]
    },
    dengzhou:{
      note:'철·북방 물산이 오가고 고려와 왕래가 잦은 송의 북방항',
      items:[
        ['workbench',-23,0,31,4.8,-.2],['crate',-10,0,36,2.8,.15],['cart',4,0,32,5.0,.22],
        ['scroll2',19,0,33,1.8,-.1],['rope2',31,0,48,2.4,.2],['parcel',39,0,39,2.2,-.1],
        ['horse',51,0,22,5.2,-.55]
      ]
    },
    mingzhou:{
      note:'비단·차·문서와 여러 지역 상단이 몰리는 송의 대형 국제항',
      items:[
        ['parcel',-29,0,38,2.4,.1],['parcelAlt',-24,0,41,2.1,-.2],['bags',-15,0,39,2.5,.2],
        ['table',-1,0,33,5.2,.05],['scroll1',5,0,34,1.8,.1],['scroll2',9,0,34,1.7,-.15],
        ['pouch',15,0,34,1.6,.25],['cart',29,0,32,5.2,-.2],['donkey',44,0,23,4.8,.5]
      ]
    },
    quanzhou:{
      note:'향신료와 먼 바다의 물산이 들어오는 송의 원양무역 관문',
      items:[
        ['bagOpen',-27,0,36,2.4,.1],['bags',-20,0,39,2.5,-.2],['bag',-13,0,38,2.1,.2],
        ['parcel',-2,0,40,2.2,-.1],['pouch',7,0,34,1.6,.15],['table',14,0,33,5.0,-.05],
        ['bucket',28,0,34,1.9,.1],['cauldron',38,0,31,2.5,-.1],['smoke',41,0,28,3.6,0]
      ]
    },
    hakata:{
      note:'유황·칠기·공예품이 거래되는 규슈 북부의 교역항',
      items:[
        ['workbench',-25,0,31,4.8,-.2],['pot',-12,0,34,2.0,.1],['vase4',-7,0,35,1.9,-.15],
        ['crate',5,0,38,2.7,.15],['crate',11,0,40,2.4,-.2],['rope1',25,0,49,2.4,.2],
        ['table',36,0,33,4.7,-.1],['parcel',45,0,39,2.0,.1]
      ]
    },
    tsushima:{
      note:'목재와 연안 물자가 오가는 한일 사이의 작은 중계항',
      items:[
        ['cart',-24,0,32,4.8,-.3],['crate',-12,0,38,2.6,.15],['crate',-7,0,40,2.2,-.2],
        ['rope3',8,0,49,2.4,.1],['rocks',23,0,47,3.6,0],['bench',35,0,29,3.5,-.1],
        ['bag',46,0,37,2.0,.15]
      ]
    },
    liaodong:{
      note:'철·가죽·말이 모이는 북방 교역항. 육상 운송의 비중이 크다',
      items:[
        ['horse',-31,0,22,5.4,.45],['horse',-22,0,20,5.1,-.35],['donkey',-12,0,24,4.7,.2],
        ['hay',-3,0,24,3.3,.1],['fence',7,0,23,4.5,0],['cart',21,0,31,5.3,-.2],
        ['workbench',34,0,31,4.6,.2],['crate',45,0,38,2.8,-.1],['bull',55,0,21,5.0,-.45]
      ]
    },
    nuzhen:{
      note:'모피·약초·말이 거래되는 작고 거친 북방 연해 교역장',
      items:[
        ['horse',-28,0,21,5.2,.3],['donkey',-18,0,24,4.6,-.25],['cow',-7,0,22,4.8,.4],
        ['hay',4,0,24,3.2,.1],['fence',13,0,23,4.2,0],['bagOpen',25,0,36,2.2,-.1],
        ['bags',32,0,39,2.3,.2],['cauldron',44,0,30,2.4,.1],['smoke',47,0,27,3.5,0]
      ]
    }
  };

  const loader=new Loader();
  const cache=new Map();
  const status={preferred:0,fallback:0,failed:0,lastPort:null};
  window.byeokrandoAssetDebug={MODELS,status,cache,bridge:B};

  function loadUrl(src){
    if(cache.has(src))return cache.get(src);
    const p=new Promise((resolve,reject)=>loader.load(src,g=>resolve(g.scene),undefined,reject));
    cache.set(src,p);
    return p;
  }

  async function loadModel(key){
    const spec=MODELS[key];
    try{
      const scene=await loadUrl(spec.preferred);
      status.preferred++;
      return scene;
    }catch(err){
      if(!spec.fallback){status.failed++;throw err}
      const scene=await loadUrl(spec.fallback);
      status.fallback++;
      return scene;
    }
  }

  function fit(obj,target){
    obj.updateMatrixWorld(true);
    let box=new T.Box3().setFromObject(obj),size=new T.Vector3();
    box.getSize(size);
    obj.scale.multiplyScalar(target/Math.max(size.x,size.y,size.z,.001));
    obj.updateMatrixWorld(true);
    box=new T.Box3().setFromObject(obj);
    obj.position.y-=box.min.y;
    obj.traverse(n=>{
      if(!n.isMesh)return;
      n.castShadow=true;
      n.receiveShadow=true;
      if(n.material){
        (Array.isArray(n.material)?n.material:[n.material]).forEach(m=>{
          if('roughness' in m)m.roughness=Math.max(.68,m.roughness??.8);
        });
      }
    });
    return obj;
  }

  async function place(group,key,x,y,z,size,ry=0){
    try{
      const template=await loadModel(key);
      if(!group?.parent)return null;
      const obj=fit(template.clone(true),size);
      obj.position.x+=x;obj.position.y+=y;obj.position.z+=z;
      obj.rotation.y=ry;
      obj.name='byeokrando-'+key;
      group.add(obj);
      return obj;
    }catch(_){return null}
  }

  function removeOld(host){
    const old=host?.getObjectByName('byeokrando-asset-pass');
    if(old)host.remove(old);
  }

  async function enhancePort(which){
    const state=B.getState(),host=B.getPortGroup(),ports=B.getPorts();
    if(!state||state.mode!=='port'||!host)return;
    removeOld(host);
    const layer=new T.Group();
    layer.name='byeokrando-asset-pass';
    host.add(layer);
    status.lastPort=which;
    const dense=ports?.[which]?.density||1;
    const profile=PORT_SCENES[which]||PORT_SCENES.byeokrando;
    const jobs=[];

    const common=[
      ['crate',-48,0,41,2.8,.18],
      ['bags',-40,0,42,2.35,-.16],
      ['parcel',37,0,41,2.15,.12],
      ['rope1',-51,0,51,2.2,.08]
    ];
    if(dense>.8)common.push(['crate',44,0,38,2.6,-.18],['bag',31,0,39,2.0,.2]);
    if(dense>1.15)common.push(['parcelAlt',51,0,36,2.1,.1],['bags',-33,0,38,2.3,-.25]);
    common.forEach(a=>jobs.push(place(layer,...a)));
    profile.items.forEach(a=>jobs.push(place(layer,...a)));

    jobs.push(place(layer,'rowSmall',-54,-.18,67,9.5,Math.PI+.12));
    if(dense>=.65)jobs.push(place(layer,'rowLarge',53,-.18,71,12.5,Math.PI-.16));
    if(dense>1.25)jobs.push(place(layer,'rowSmall',18,-.18,75,8.3,Math.PI+.05));

    await Promise.allSettled(jobs);
  }

  let threeD=false,toggle,viewBadge;

  function installViewBadge(){
    if(viewBadge?.isConnected)return viewBadge;
    viewBadge=document.createElement('div');
    viewBadge.id='port3dBadge';
    Object.assign(viewBadge.style,{
      position:'absolute',left:'16px',bottom:'54px',zIndex:'84',
      maxWidth:'360px',padding:'8px 10px',
      border:'1px solid rgba(230,189,98,.45)',borderRadius:'6px',
      background:'rgba(18,13,9,.84)',color:'#dcc89b',
      fontWeight:'750',fontSize:'10px',lineHeight:'1.45',
      boxShadow:'0 5px 18px #0006',display:'none',pointerEvents:'none'
    });
    document.getElementById('app')?.appendChild(viewBadge);
    return viewBadge;
  }

  function installToggle(){
    if(document.getElementById('portViewToggle'))return document.getElementById('portViewToggle');
    toggle=document.createElement('button');
    toggle.id='portViewToggle';
    toggle.textContent='3D 항구 보기';
    Object.assign(toggle.style,{
      position:'absolute',right:'14px',bottom:'54px',zIndex:'85',
      border:'1px solid rgba(230,189,98,.8)',borderRadius:'6px',
      padding:'8px 11px',background:'rgba(25,17,11,.9)',color:'#f2d68f',
      fontWeight:'900',fontSize:'11px',cursor:'pointer',boxShadow:'0 5px 18px #0007'
    });
    toggle.onclick=()=>{
      const state=B.getState();
      if(!state||state.mode!=='port')return;
      threeD=!threeD;
      applyView();
    };
    document.getElementById('app')?.appendChild(toggle);
    installViewBadge();
    return toggle;
  }

  function applyView(){
    const button=installToggle(),badge=installViewBadge(),state=B.getState(),camera=B.getCamera(),host=B.getPortGroup();
    const hotspots=document.getElementById('hotspots');
    const inPort=state?.mode==='port';
    button.style.display=inPort?'block':'none';
    if(!inPort){
      badge.style.display='none';
      return;
    }

    if(threeD){
      B.hideIllustratedPort();
      if(host)host.visible=true;
      if(hotspots)hotspots.style.display='none';
      button.textContent='삽화로 돌아가기';
      const profile=PORT_SCENES[state.place]||PORT_SCENES.byeokrando;
      badge.textContent='3D 항구 별도 보기 · '+profile.note+' · 시설 선택은 삽화 화면에서 이용';
      badge.style.display='block';
      camera?.position.set(0,31,96);
      camera?.lookAt(0,5,27);
    }else{
      if(host)host.visible=false;
      B.showIllustratedPort(state.place);
      if(hotspots)hotspots.style.display='block';
      button.textContent='3D 항구 보기';
      badge.style.display='none';
      camera?.position.set(0,70,117);
      camera?.lookAt(0,6,10);
    }
  }

  const baseBuild=B.getBuildPort();
  B.setBuildPort(function(which){
    const result=baseBuild(which);
    threeD=false;
    Promise.resolve().then(()=>enhancePort(which));
    Promise.resolve().then(applyView);
    return result;
  });

  const baseSail=B.getStartSailing();
  B.setStartSailing(function(...args){
    threeD=false;
    installToggle().style.display='none';
    return baseSail.apply(this,args);
  });

  installToggle();
  const state=B.getState();
  if(state?.mode==='port'){
    enhancePort(state.place);
    applyView();
  }

  try{window.parent?.postMessage({type:'byeokrando-hybrid-ready'},'*')}catch(_){}
})();