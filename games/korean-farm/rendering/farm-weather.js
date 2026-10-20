// One lightweight particle draw call for weather. No timers, external assets,
// per-frame allocations or flashing lights (important for classroom displays).
import * as THREE from 'three';

const SKY={
  sunny:{color:0xbedcd5,light:1.65},
  cloudy:{color:0xb9cfcb,light:1.37},
  rain:{color:0xa7c3c8,light:1.20},
  storm:{color:0x92b0b8,light:1.06}
};

export function createFarmWeather(scene,sun){
  const count=145,positions=new Float32Array(count*3),speeds=new Float32Array(count);
  for(let i=0;i<count;i++){
    // Deterministic, evenly scattered curtain in the immediate play area.
    const fraction=n=>(Math.sin((i+1)*n)*47327.36)%1;
    const unit=n=>(fraction(n)+1)%1;
    positions[i*3]=(unit(12.9898)-.5)*25;
    positions[i*3+1]=1+unit(78.233)*12;
    positions[i*3+2]=(unit(37.719)-.5)*25;
    speeds[i]=7+unit(8.147)*5;
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const material=new THREE.PointsMaterial({color:0xe5f4fa,size:.11,transparent:true,opacity:.72,
    depthWrite:false,sizeAttenuation:true});
  const rain=new THREE.Points(geometry,material);rain.name='farm-weather-rain';
  rain.frustumCulled=false;rain.visible=false;scene.add(rain);
  let current='sunny';
  function setWeather(weather){
    current=Object.hasOwn(SKY,weather)?weather:'sunny';
    scene.background.setHex(SKY[current].color);
    if(scene.fog)scene.fog.color.setHex(SKY[current].color);
    if(sun)sun.intensity=SKY[current].light;
    rain.visible=current==='rain'||current==='storm';
    material.opacity=current==='storm'?.90:.64;
  }
  function update(dt,farmer){
    if(!rain.visible||!farmer)return;
    // Rain follows the farmer's local view, but each particle moves vertically
    // in world space. Reset to a cloud layer after falling below the ground.
    rain.position.set(farmer.x,0,farmer.z);
    const modifier=current==='storm'?1.65:1;
    for(let i=0;i<count;i++){
      const index=i*3;
      positions[index+1]-=speeds[i]*modifier*Math.min(dt,.1);
      positions[index]-=(current==='storm'?.62:.18)*dt;
      if(positions[index+1]<.25){positions[index+1]+=12.75;positions[index]=((positions[index]+12.5)%25+25)%25-12.5}
    }
    geometry.attributes.position.needsUpdate=true;
  }
  return {rain,setWeather,update,dispose(){scene.remove(rain);geometry.dispose();material.dispose()}};
}
