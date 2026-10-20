// Low-cost physical harvest feedback: cut rice bundles, sacks at the farm shed,
// and a hand basket when the farmer carries produce to market.
import * as THREE from 'three';

const materials={
  straw:new THREE.MeshStandardMaterial({color:0xdab868,roughness:1}),
  tie:new THREE.MeshStandardMaterial({color:0x88623b,roughness:1}),
  sack:new THREE.MeshStandardMaterial({color:0xc8ae83,roughness:1}),
  rice:new THREE.MeshStandardMaterial({color:0xd8c77e,roughness:1}),
  carrot:new THREE.MeshStandardMaterial({color:0xdf8948,roughness:1}),
  corn:new THREE.MeshStandardMaterial({color:0xecc46a,roughness:1}),
  basket:new THREE.MeshStandardMaterial({color:0x936d46,roughness:1}),
  wood:new THREE.MeshStandardMaterial({color:0x876345,roughness:.95}),
  rim:new THREE.MeshStandardMaterial({color:0x536f56,roughness:.85}),
  wheel:new THREE.MeshStandardMaterial({color:0x424b43,roughness:.97})
};
function mesh(parent,geo,mat,x,y,z){
  const object=new THREE.Mesh(geo,mat);object.position.set(x,y,z);
  object.castShadow=true;parent.add(object);return object;
}
function bundle(parent,x,z){
  const group=new THREE.Group();group.position.set(x,.22,z);parent.add(group);
  for(let i=0;i<4;i++){
    const shoot=mesh(group,new THREE.ConeGeometry(.07,.54,5),materials.straw,(i-1.5)*.095,.23,0);
    shoot.rotation.z=(i-1.5)*.1;
  }
  mesh(group,new THREE.CylinderGeometry(.055,.055,.42,7),materials.tie,0,.17,0).rotation.z=Math.PI/2;
  return group;
}
function counts(inventory){return ['rice','carrot','corn'].filter(k=>(inventory?.[k]||0)>0)}
export function createHarvestCargo(scene,farmer){
  const store=new THREE.Group();store.position.set(17.1,0,-8.35);scene.add(store);
  const basket=new THREE.Group();basket.position.set(.35,1.02,.25);farmer.add(basket);
  mesh(basket,new THREE.CylinderGeometry(.29,.22,.24,10),materials.basket,0,0,0);
  const compostPouch=new THREE.Group();compostPouch.position.set(-.3,.8,.21);farmer.add(compostPouch);
  mesh(compostPouch,new THREE.SphereGeometry(.19,8,7),materials.sack,0,0,0).scale.set(1.1,1,.8);
  mesh(compostPouch,new THREE.ConeGeometry(.13,.19,6),materials.tie,0,.18,0);
  // This is the SAME cart when parked at the shed and pulled by the farmer.
  // Reparenting prevents a second, fake cart from staying behind in the yard.
  const handcart=new THREE.Group();handcart.name='farm-working-handcart';
  const cartBox=mesh(handcart,new THREE.BoxGeometry(1.04,.20,1.1),materials.wood,0,.50,0);
  const cargoLayer=new THREE.Group();handcart.add(cargoLayer);
  for(const x of [-.51,.51]){
    mesh(handcart,new THREE.BoxGeometry(.075,.29,1.10),materials.rim,x,.67,0);
    mesh(handcart,new THREE.BoxGeometry(.08,.07,1.04),materials.wood,x,.51,-.84);
  }
  for(const z of [-.53,.53])mesh(handcart,new THREE.BoxGeometry(1.08,.29,.07),materials.rim,0,.66,z);
  const wheels=[];
  for(const x of [-.65,.65]){
    const wheel=mesh(handcart,new THREE.CylinderGeometry(.27,.27,.13,12),materials.wheel,x,.32,.05);
    wheel.rotation.z=Math.PI/2;wheels.push(wheel);
    mesh(handcart,new THREE.CylinderGeometry(.085,.085,.15,8),materials.straw,x,.32,.05).rotation.z=Math.PI/2;
  }
  scene.add(handcart);handcart.position.set(16.8,0,-8.1);handcart.rotation.y=-.3;
  let cartAttached=false;
  const setCart=(attached,owned)=>{
    cartAttached=Boolean(attached&&owned);
    if(handcart.parent!== (cartAttached?farmer:scene)){
      handcart.parent?.remove(handcart);
      (cartAttached?farmer:scene).add(handcart);
    }
    handcart.position.set(cartAttached?0:16.8,0,cartAttached?1.13:-8.1);
    handcart.rotation.y=cartAttached?0:-.3;
    handcart.visible=Boolean(owned);
    basket.visible=!cartAttached&&basket.visible;
  };
  const refreshCartCargo=cargo=>{
    for(const child of [...cargoLayer.children]){cargoLayer.remove(child);child.geometry?.dispose?.()}
    let total=0;
    for(const crop of ['rice','carrot','corn']){
      const amount=cargo?.[crop]||0;
      for(let n=0;n<Math.min(8,Math.ceil(amount/5));n++){
        const x=-.33+(total%3)*.33,z=-.3+Math.floor(total/3)*.32;
        mesh(cargoLayer,new THREE.SphereGeometry(.18,8,6),materials[crop],x,.70,z);
        total++;
      }
    }
  };
  const fieldBundles=new Map();
  const rebuild=(parent,keys,limit)=>{
    for(const child of [...parent.children]){
      parent.remove(child);child.traverse?.(item=>item.geometry?.dispose?.());
    }
    keys.slice(0,limit).forEach((key,i)=>{
      const x=(i%3)*.65-(limit===3?.65:.3),z=Math.floor(i/3)*.61;
      const bag=mesh(parent,new THREE.SphereGeometry(.28,8,7),materials.sack,x,.29,z);
      bag.scale.set(1,.9,.8);
      mesh(parent,new THREE.ConeGeometry(.18,.27,7),materials[key],x,.61,z);
    });
  };
  const setStorage=(inventory)=>{
    const keys=counts(inventory);
    rebuild(store,keys.flatMap(k=>Array(Math.min(3,Math.ceil(inventory[k]/5))).fill(k)),7);
  };
  const setCarrying=(inventory)=>{
    basket.visible=!cartAttached&&Boolean(counts(inventory).length);
    refreshCartCargo(inventory);
    if(!basket.visible)return;
    // Basket walls remain while crops change; contents are keyed by stock.
    for(const child of [...basket.children].slice(1)){
      basket.remove(child);child.geometry?.dispose?.();
    }
    counts(inventory).slice(0,3).forEach((key,i)=>
      mesh(basket,new THREE.SphereGeometry(.10,7,6),materials[key],(i-1)*.14,.16,0));
  };
  const setField=(plot,field)=>{
    let layer=fieldBundles.get(plot.id);
    if(!layer){layer=new THREE.Group();scene.add(layer);fieldBundles.set(plot.id,layer)}
    const completed=field.work?.harvested?.filter(Boolean).length||0;
    while(layer.children.length>completed){
      const child=layer.children[layer.children.length-1];layer.remove(child);
      child.traverse(item=>item.geometry?.dispose?.());
    }
    for(let i=layer.children.length;i<completed;i++){
      const row=i-(5-1)/2;
      bundle(layer,plot.x+plot.w/2+.14,plot.z+row*.46);
    }
  };
  return {setStorage,setCarrying,setCart,rollCart(distance){
    if(cartAttached&&distance>0)for(const wheel of wheels)wheel.rotateY(distance/.27);
  },setCompost(amount){compostPouch.visible=amount>0},setField,dispose(){
    store.parent?.remove(store);basket.parent?.remove(basket);compostPouch.parent?.remove(compostPouch);
    for(const group of [store,basket,compostPouch,handcart,...fieldBundles.values()]){
      group.parent?.remove(group);
      group.traverse(item=>item.geometry?.dispose?.());group.clear();
    }
    for(const material of Object.values(materials))material.dispose();
  }};
}
