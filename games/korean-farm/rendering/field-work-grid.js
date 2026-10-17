import * as THREE from 'three';
import {WORK_STRIPS,workStripPosition} from '../farming/field-work.mjs';
// Ground-level changes remain visible after the tool touches each strip.
export function createFieldWorkGrid(plot){
  const group=new THREE.Group();group.name='field-work-'+plot.id;
  const targets=[],furrows=[],wetPatches=[],weedClumps=[],stubble=[],markers=[];
  const soilGeo=new THREE.BoxGeometry(plot.w-.28,.018,plot.d/WORK_STRIPS-.11);
  const waterGeo=new THREE.PlaneGeometry(plot.w-.32,plot.d/WORK_STRIPS-.09);
  const ringGeo=new THREE.RingGeometry(.18,.24,20);
  const stalkGeo=new THREE.ConeGeometry(.045,.23,4);
  const dirtMat=new THREE.MeshStandardMaterial({color:0x644b33,roughness:1});
  const wetMat=new THREE.MeshBasicMaterial({color:0x4b97a6,transparent:true,opacity:.33,depthWrite:false,side:THREE.DoubleSide});
  const markerMat=new THREE.MeshBasicMaterial({color:0xd1ebba,transparent:true,opacity:.76,side:THREE.DoubleSide,depthWrite:false});
  const chosenMat=new THREE.MeshBasicMaterial({color:0xf5cd69,transparent:true,opacity:1,side:THREE.DoubleSide,depthWrite:false});
  const weedMat=new THREE.MeshStandardMaterial({color:0x4f843b,roughness:1});
  const strawMat=new THREE.MeshStandardMaterial({color:0xb89e59,roughness:1});
  for(let i=0;i<WORK_STRIPS;i++){
    const point=workStripPosition(plot,i),z=point.z-plot.z;
    const target=new THREE.Mesh(new THREE.PlaneGeometry(plot.w-.18,plot.d/WORK_STRIPS-.045),
      new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}));
    target.rotation.x=-Math.PI/2;target.position.set(0,.42,z);
    target.userData.plotId=plot.id;target.userData.stripIndex=i;
    group.add(target);targets.push(target);
    const furrow=new THREE.Mesh(soilGeo,dirtMat);
    furrow.position.set(0,.291,z);group.add(furrow);furrows.push(furrow);
    const wet=new THREE.Mesh(waterGeo,wetMat);
    wet.rotation.x=-Math.PI/2;wet.position.set(0,.315,z);
    group.add(wet);wetPatches.push(wet);
    const ring=new THREE.Mesh(ringGeo,markerMat);
    ring.rotation.x=-Math.PI/2;ring.position.set(0,.443,z);
    ring.scale.setScalar(1.2);group.add(ring);markers.push(ring);
    const weeds=new THREE.Group();weeds.position.set(0,.31,z);
    const cut=new THREE.Group();cut.position.set(0,.33,z);
    for(let k=0;k<4;k++){
      const x=(k-1.5)*(plot.w/5.1);
      const grass=new THREE.Mesh(stalkGeo,weedMat);
      grass.position.set(x,.1,k%2?.07:-.08);grass.rotation.z=(k-1.5)*.21;weeds.add(grass);
      const tip=new THREE.Mesh(stalkGeo,strawMat);
      tip.scale.set(1,.5,1);tip.position.set(x,.03,k%2?.07:-.08);cut.add(tip);
    }
    group.add(weeds,cut);weedClumps.push(weeds);stubble.push(cut);
  }
  function refresh(field,action=null,selected=-1){
    for(let i=0;i<WORK_STRIPS;i++){
      const done=field?.work||{};
      furrows[i].visible=!field.planted&&!!done.tilled?.[i];
      wetPatches[i].visible=!!done.watered?.[i]&&field.kind!=='rice';
      weedClumps[i].visible=field.weeds>=.12&&!done.weeded?.[i]&&!done.harvested?.[i];
      stubble[i].visible=!!done.harvested?.[i]&&field.planted;
      const key=action==='till'?'tilled':action==='water'?'watered':action==='weed'?'weeded':'harvested';
      markers[i].visible=Boolean(action)&&!done[key]?.[i];
      markers[i].material=i===selected?chosenMat:markerMat;
      markers[i].scale.setScalar(i===selected?1.65:1.12);
    }
  }
  function dispose(){
    for(const target of targets){target.geometry.dispose();target.material.dispose()}
    for(const geo of [soilGeo,waterGeo,ringGeo,stalkGeo])geo.dispose();
    for(const mat of [dirtMat,wetMat,markerMat,chosenMat,weedMat,strawMat])mat.dispose();
    group.parent?.remove(group);
  }
  return {group,targets,refresh,dispose};
}
