import * as THREE from 'three';
import {TRANSPLANT_COUNT,seedlingPosition,normalizeSeedlings} from '../farming/rice-transplant.mjs';
// Individual touch targets remain visible at all times when a field is being planted.
const hoverColor=0xf0d17a,available=0xd9efd2;
export function createRicePlantingGrid(plot){
  const group=new THREE.Group();group.name='rice-planting-grid-'+plot.id;
  const targets=[],rings=[],shoots=[];
  const ringGeo=new THREE.RingGeometry(.15,.21,20);
  const ringMat=new THREE.MeshBasicMaterial({color:available,side:THREE.DoubleSide,
    transparent:true,opacity:.74,depthWrite:false});
  const chosenMat=new THREE.MeshBasicMaterial({color:hoverColor,side:THREE.DoubleSide,
    transparent:true,opacity:.98,depthWrite:false});
  const seedMat=new THREE.MeshStandardMaterial({color:0x4a9b62,roughness:.87,side:THREE.DoubleSide});
  const seedBladeGeo=new THREE.ConeGeometry(.045,.29,4);
  for(let i=0;i<TRANSPLANT_COUNT;i++){
    const p=seedlingPosition(plot,i),x=p.x-plot.x,z=p.z-plot.z;
    const target=new THREE.Mesh(new THREE.PlaneGeometry(.48,.48),new THREE.MeshBasicMaterial({
      visible:false,side:THREE.DoubleSide}));
    target.rotation.x=-Math.PI/2;target.position.set(x,.29,z);
    target.userData.plotId=plot.id;target.userData.cellIndex=i;
    target.userData.plantingTarget=true;group.add(target);targets.push(target);
    const ring=new THREE.Mesh(ringGeo,ringMat);
    ring.position.set(x,.292,z);ring.rotation.x=-Math.PI/2;
    group.add(ring);rings.push(ring);
    const seedling=new THREE.Group();
    seedling.position.set(x,.3,z);
    for(let n=0;n<3;n++){
      const blade=new THREE.Mesh(seedBladeGeo,seedMat);
      blade.position.set((n-1)*.052,.13,0);
      blade.rotation.z=(n-1)*.28;
      seedling.add(blade);
    }
    group.add(seedling);shoots.push(seedling);
  }
  function refresh(field,selected=-1,active=false){
    const state=normalizeSeedlings(field?.transplants,field?.planted);
    for(let i=0;i<TRANSPLANT_COUNT;i++){
      const s=state[i];
      rings[i].visible=active&&!s;
      rings[i].material=i===selected?chosenMat:ringMat;
      rings[i].scale.setScalar(i===selected?1.2:1);
      shoots[i].visible=s&&!field.planted;
      targets[i].visible=false; // Invisible still raycast-able.
    }
  }
  return {group,targets,refresh,
    dispose(){
      targetDisposal();
      ringGeo.dispose();ringMat.dispose();chosenMat.dispose();
      seedBladeGeo.dispose();seedMat.dispose();
      group.parent?.remove(group);
    }};
  function targetDisposal(){for(const t of targets){t.geometry.dispose();t.material.dispose()}}
}
