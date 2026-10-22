import * as THREE from 'three';
import {harvestRewardLabel} from '../rendering/crop-presentation.mjs';

// One reusable canvas label for genuine harvest payouts; no per-frame objects.
export class HarvestReward {
  constructor(scene){
    this.canvas=document.createElement('canvas');
    this.canvas.width=384;this.canvas.height=128;
    this.context=this.canvas.getContext('2d');
    this.texture=new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace=THREE.SRGBColorSpace;
    this.material=new THREE.SpriteMaterial({map:this.texture,transparent:true,opacity:0,depthWrite:false,depthTest:false});
    this.sprite=new THREE.Sprite(this.material);
    this.sprite.name='farm-harvest-reward';
    this.sprite.scale.set(3.25,1.08,1);
    this.sprite.visible=false;this.sprite.renderOrder=20;
    scene.add(this.sprite);
    this.remaining=0;this.duration=1.8;
  }
  show(plot,produce,quantity){
    const text=harvestRewardLabel(produce,quantity);
    if(!text||!plot)return false;
    const c=this.context;
    if(!c)return false;
    c.clearRect(0,0,384,128);
    c.fillStyle='#fff6da';c.beginPath();c.roundRect(12,12,360,100,32);c.fill();
    c.lineWidth=6;c.strokeStyle='#709255';c.stroke();
    c.fillStyle='#355b35';c.font='bold 48px sans-serif';c.textAlign='center';c.textBaseline='middle';
    c.fillText(text,192,64,340);
    this.texture.needsUpdate=true;
    this.sprite.position.set(plot.x,2.15,plot.z);
    this.material.opacity=1;this.sprite.visible=true;this.remaining=this.duration;
    return true;
  }
  update(dt){
    if(this.remaining<=0)return;
    const delta=Number.isFinite(dt)?Math.max(0,Math.min(.2,dt)):0;
    this.remaining=Math.max(0,this.remaining-delta);
    this.sprite.position.y+=delta*.48;
    this.material.opacity=Math.min(1,this.remaining/.55);
    if(this.remaining===0)this.sprite.visible=false;
  }
  dispose(){
    this.sprite.parent?.remove(this.sprite);
    this.material.dispose();this.texture.dispose();
  }
}
