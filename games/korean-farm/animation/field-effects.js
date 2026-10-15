import * as THREE from 'three';
const clamp=(x)=>Math.max(0,Math.min(1,x));
const PALETTE=Object.freeze({
  till:[0x805a3c,0xae8054],plant:[0x69ab52,0x9fc875],water:[0x60b4d8,0xc1eaf4],
  gate:[0x60b4d8,0x9bdce6],weed:[0x679c4a,0x5c8b46],
  fertilize:[0x79603e,0xb7a16e],harvest:[0xd8b458,0xf2ce77]
});
export class FieldEffects{
  constructor(scene){this.scene=scene;this.effects=[];this.tick=0}
  emit(kind,plot){
    if(!plot||!Object.hasOwn(PALETTE,kind))return;
    const colors=PALETTE[kind],particles=kind==='water'||kind==='gate'?17:kind==='harvest'?15:10;
    const group=new THREE.Group();group.position.set(plot.x,0,plot.z);
    const meshes=[];
    // Deterministic variation per burst avoids global randomness in screenshots/tests.
    this.tick++;
    for(let i=0;i<particles;i++){
      const seed=this.tick*91+i*37,angle=i*2.3999+this.tick;
      const radius=.14+.55*((seed%13)/13),r=kind==='water'||kind==='gate'?.042:.063;
      const mat=new THREE.MeshBasicMaterial({color:colors[i%2],transparent:true,opacity:.95,depthWrite:false,side:THREE.DoubleSide});
      const geom=(kind==='water'||kind==='gate')?new THREE.OctahedronGeometry(r,0):new THREE.TetrahedronGeometry(r,0);
      const mesh=new THREE.Mesh(geom,mat);
      mesh.position.set(Math.sin(angle)*radius,.20+((i%4)*.035),Math.cos(angle)*radius);
      group.add(mesh);
      meshes.push({mesh,vx:Math.sin(angle)*(.65+(i%4)*.22),vy:kind==='water'?1.1+(i%5)*.22:.65+(i%6)*.16,
        vz:Math.cos(angle)*(.65+(i%5)*.2),spin:i%2?2.3:-2.1});
    }
    const ring=new THREE.Mesh(new THREE.RingGeometry(.28,.34,20),new THREE.MeshBasicMaterial({
      color:colors[0],side:THREE.DoubleSide,transparent:true,opacity:.65,depthWrite:false
    }));
    ring.rotation.x=-Math.PI/2;ring.position.y=.27;group.add(ring);
    this.scene.add(group);this.effects.push({group,meshes,ring,life:0,duration:.95});
  }
  update(dt){
    dt=Math.min(.075,Math.max(0,dt));
    for(let i=this.effects.length-1;i>=0;i--){
      const fx=this.effects[i];fx.life+=dt;
      const progress=clamp(fx.life/fx.duration),alpha=1-progress;
      for(const p of fx.meshes){
        p.mesh.position.x+=p.vx*dt;p.mesh.position.z+=p.vz*dt;
        p.mesh.position.y=Math.max(.17,p.mesh.position.y+p.vy*dt);
        p.vy-=4.8*dt;
        p.mesh.rotation.y+=p.spin*dt;
        p.mesh.material.opacity=alpha*.95;
      }
      fx.ring.scale.setScalar(1+progress*4);
      fx.ring.material.opacity=alpha*.6;
      if(progress>=1){
        this.scene.remove(fx.group);
        for(const mesh of [...fx.group.children]){mesh.geometry?.dispose?.();mesh.material?.dispose?.()}
        fx.group.clear();this.effects.splice(i,1);
      }
    }
  }
  clear(){
    for(const fx of this.effects){this.scene.remove(fx.group);
      for(const mesh of fx.group.children){mesh.geometry?.dispose?.();mesh.material?.dispose?.()}}
    this.effects.length=0;
  }
}
