import * as THREE from 'three';

function urgencyColor(value){
  const stops=[[0,[48,165,102]],[.52,[231,182,57]],[1,[221,75,67]]];
  const t=Math.max(0,Math.min(1,value));
  const i=t<=.52?0:1,from=stops[i],to=stops[i+1];
  const blend=(t-from[0])/(to[0]-from[0]);
  return 'rgb('+from[1].map((n,k)=>Math.round(n+(to[1][k]-n)*blend)).join(',')+')';
}
function makeBadge(){
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({
    map:texture,transparent:true,depthTest:true,depthWrite:false,alphaTest:.04
  }));
  sprite.scale.set(.68,.68,1);sprite.renderOrder=5;
  return {canvas,texture,ctx:canvas.getContext('2d'),sprite};
}
function drawBadge(badge,item){
  const {ctx,canvas,texture}=badge;ctx.clearRect(0,0,128,128);
  ctx.beginPath();ctx.arc(64,64,48,0,Math.PI*2);
  ctx.fillStyle='rgba(255,252,239,.94)';ctx.fill();
  ctx.lineWidth=10;ctx.lineCap='round';ctx.strokeStyle='rgba(70,78,67,.16)';
  ctx.beginPath();ctx.arc(64,64,53,0,Math.PI*2);ctx.stroke();
  const fraction=Math.max(.12,1-.82*item.urgency);
  ctx.strokeStyle=urgencyColor(item.urgency);ctx.lineWidth=10;ctx.lineCap='round';
  ctx.beginPath();ctx.arc(64,64,53,-Math.PI/2,-Math.PI/2+Math.PI*2*fraction);ctx.stroke();
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='58px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  ctx.fillText(item.icon,64,66);
  texture.needsUpdate=true;
  badge.sprite.userData.label=item.label;
}
export function createFieldStatusMarkers(plot){
  const group=new THREE.Group();group.name='field-status-'+plot.id;
  group.position.set(plot.x,2.65,plot.z);group.renderOrder=5;
  const badges=[makeBadge(),makeBadge()];
  for(const badge of badges)group.add(badge.sprite);
  return {
    group,
    update(items=[]){
      const visible=items.slice(0,badges.length);
      badges.forEach((badge,index)=>{
        const item=visible[index];
        badge.sprite.visible=Boolean(item);
        if(!item)return;
        const x=(index-(visible.length-1)/2)*.64;
        badge.sprite.position.set(x,index===0?0:.16,0);
        drawBadge(badge,item);
      });
      group.visible=visible.length>0;
    },
    dispose(){
      for(const badge of badges){badge.texture.dispose();badge.sprite.material.dispose()}
      group.parent?.remove(group);group.clear();
    }
  };
}
