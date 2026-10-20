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
  basket:new THREE.MeshStandardMaterial({color:0x936d46,roughness:1})
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
    basket.visible=Boolean(counts(inventory).length);
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
  return {setStorage,setCarrying,setCompost(amount){compostPouch.visible=amount>0},setField,dispose(){
    store.parent?.remove(store);basket.parent?.remove(basket);compostPouch.parent?.remove(compostPouch);
    for(const group of [store,basket,compostPouch,...fieldBundles.values()]){
      group.parent?.remove(group);
      group.traverse(item=>item.geometry?.dispose?.());group.clear();
    }
    for(const material of Object.values(materials))material.dispose();
  }};
}
