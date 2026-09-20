/* Byeokrando hybrid port asset pass v2 */
(() => {
  'use strict';
  const T=window.THREE, Loader=window.GLTFLoader, B=window.__byeokrandoBridge;
  if(!T||!Loader||!B)return;

  const scriptBase=(()=>{try{return new URL('.',document.currentScript?.src||location.href)}catch(_){return new URL('.',location.href)}})();
  const url=p=>new URL(p,scriptBase).href;

  const MODELS={
    rowSmall:{preferred:url('../../assets/game/3d/byeokrando/ships/boat-row-small.glb')},
    rowLarge:{preferred:url('../../assets/game/3d/byeokrando/ships/boat-row-large.glb')},
    crate:{
      preferred:url('../../assets/game/3d/byeokrando/port_props/Crate.glb'),
      fallback:url('../../assets/game/3d/survival/kenney-survival-kit/box.glb')
    },
    bags:{
      preferred:url('../../assets/game/3d/byeokrando/port_props/Bags.glb'),
      fallback:url('../../assets/game/food/bag.glb')
    },
    cart:{preferred:url('../../assets/game/3d/byeokrando/port_props/Cart.glb')},
    parcel:{
      preferred:url('../../assets/game/3d/byeokrando/port_props/Package.glb'),
      fallback:url('../../assets/game/3d/survival/kenney-survival-kit/box-large.glb')
    },
    smoke:{preferred:url('../../assets/game/3d/byeokrando/port_props/Smoke.glb')},
    marketStand:{preferred:url('../../assets/game/3d/byeokrando/optional_review/Market%20Stand.glb')}
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
    const dense=ports?.[which]?.density||1,j=[];

    [
      ['crate',-47,0,42,3,.18],
      ['crate',-43,0,44,2.6,-.22],
      ['bags',-38,0,41,2.4,.35],
      ['parcel',-33,0,44,2.2,-.12],
      ['crate',29,0,39,2.8,.28],
      ['bags',34,0,42,2.3,-.26],
      ['parcel',40,0,40,2.1,.12]
    ].forEach(a=>j.push(place(layer,...a)));

    if(dense>=.7){
      j.push(place(layer,'cart',-20,0,34,5.3,-.35));
      j.push(place(layer,'marketStand',9,0,31,7.2,.08));
      j.push(place(layer,'marketStand',19,0,34,6.4,-.12));
    }

    j.push(place(layer,'rowSmall',-54,-.18,67,10,Math.PI+.12));
    j.push(place(layer,'rowLarge',53,-.18,71,13,Math.PI-.16));

    if(dense>1.1){
      j.push(place(layer,'crate',48,0,35,3,-.2));
      j.push(place(layer,'bags',44,0,32,2.5,.3));
      j.push(place(layer,'parcel',-52,0,36,2.4,.2));
    }
    await Promise.allSettled(j);
  }

  let threeD=false,toggle;

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
    return toggle;
  }

  function applyView(){
    const button=installToggle(),state=B.getState(),camera=B.getCamera();
    const inPort=state?.mode==='port';
    button.style.display=inPort?'block':'none';
    if(!inPort)return;
    if(threeD){
      B.hideIllustratedPort();
      button.textContent='삽화 보기';
      camera?.position.set(0,45,98);
      camera?.lookAt(0,4,20);
    }else{
      B.showIllustratedPort(state.place);
      button.textContent='3D 항구 보기';
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