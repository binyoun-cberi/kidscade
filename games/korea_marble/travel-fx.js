import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL_PATHS={
  rail:'../../assets/game/3d/rail/kenney-train-kit/train-electric-bullet-a.glb',
  sea:'../../assets/game/3d/byeokrando/ships/boat-row-large.glb'
};

function mat(color,metalness=.05,roughness=.65){
  return new THREE.MeshStandardMaterial({color,metalness,roughness});
}

function planeModel(){
  const g=new THREE.Group();
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.18,1.3,5,10),mat(0xf8fafc,.2,.35));
  body.rotation.z=Math.PI/2;g.add(body);
  const wing=new THREE.Mesh(new THREE.BoxGeometry(1.35,.055,.34),mat(0x4f8df7,.15,.45));
  g.add(wing);
  const tail=new THREE.Mesh(new THREE.BoxGeometry(.42,.04,.22),mat(0x4f8df7,.15,.45));
  tail.position.x=-.55;g.add(tail);
  const fin=new THREE.Mesh(new THREE.BoxGeometry(.18,.34,.05),mat(0x2c62c7,.1,.45));
  fin.position.set(-.58,.16,0);g.add(fin);
  const nose=new THREE.Mesh(new THREE.SphereGeometry(.19,12,8),mat(0xf8fafc,.2,.35));
  nose.scale.x=1.35;nose.position.x=.74;g.add(nose);
  g.rotation.y=-.08;
  return g;
}

class TravelFX {
  constructor(){
    this.overlay=document.getElementById('travelFx');
    this.canvas=document.getElementById('travelFxCanvas');
    this.icon=document.getElementById('travelFxIcon');
    this.title=document.getElementById('travelFxTitle');
    this.route=document.getElementById('travelFxRoute');
    this.renderer=null;this.scene=null;this.camera=null;this.clock=null;this.models={air:planeModel()};this.ready=false;
    this.init();
  }
  init(){
    if(!this.canvas)return;
    try{
      this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:true,powerPreference:'low-power'});
      this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
      this.renderer.outputColorSpace=THREE.SRGBColorSpace;
      this.scene=new THREE.Scene();
      this.camera=new THREE.PerspectiveCamera(40,2.2,.1,30);
      this.camera.position.set(0,1.15,5.6);
      this.camera.lookAt(0,.25,0);
      this.scene.add(new THREE.HemisphereLight(0xffffff,0x335577,2.4));
      const key=new THREE.DirectionalLight(0xffffff,2.7);key.position.set(3,5,4);this.scene.add(key);
      const rim=new THREE.PointLight(0x79c4ff,5,12);rim.position.set(-3,2,2);this.scene.add(rim);
      this.resize();
      addEventListener('resize',()=>this.resize());
      const loader=new GLTFLoader();
      for(const [kind,path] of Object.entries(MODEL_PATHS)){
        loader.load(path,g=>{
          const model=g.scene;
          model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
          this.fitModel(model,kind==='rail'?1.85:1.55);
          this.models[kind]=model;
        },undefined,()=>{});
      }
      this.ready=true;
    }catch(_){this.ready=false}
  }
  fitModel(model,target){
    const box=new THREE.Box3().setFromObject(model),size=new THREE.Vector3(),center=new THREE.Vector3();
    box.getSize(size);box.getCenter(center);
    model.position.sub(center);
    const m=Math.max(size.x,size.y,size.z)||1;
    model.scale.setScalar(target/m);
  }
  resize(){
    if(!this.renderer||!this.canvas)return;
    const w=Math.max(320,this.canvas.clientWidth||620),h=Math.max(150,this.canvas.clientHeight||260);
    this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
  }
  fallback(kind,from,to,duration){
    return new Promise(resolve=>{
      this.overlay.className='travel-fx show mode-'+kind+' fallback';
      this.icon.textContent=kind==='rail'?'🚄':kind==='sea'?'🚢':'✈️';
      this.title.textContent=kind==='rail'?'기차 이동':kind==='sea'?'배 이동':'항공 이동';
      this.route.textContent=from+' → '+to;
      setTimeout(()=>{this.overlay.classList.remove('show');resolve()},duration);
    });
  }
  play({kind='air',from='',to='',fast=false}={}){
    const duration=fast?430:760;
    if(!this.ready||!this.models[kind])return this.fallback(kind,from,to,duration);
    return new Promise(resolve=>{
      this.overlay.className='travel-fx show mode-'+kind;
      this.icon.textContent=kind==='rail'?'🚄':kind==='sea'?'🚢':'✈️';
      this.title.textContent=kind==='rail'?'철도 여행':kind==='sea'?'바닷길 여행':'하늘길 여행';
      this.route.textContent=from+' → '+to;
      this.resize();
      while(this.scene.children.length>3)this.scene.remove(this.scene.children[3]);
      const model=this.models[kind].clone(true);
      model.position.set(-2.6,.1,0);
      if(kind==='rail')model.rotation.y=Math.PI/2;
      if(kind==='sea')model.rotation.y=Math.PI/2;
      this.scene.add(model);
      const start=performance.now();
      const frame=now=>{
        const t=Math.min(1,(now-start)/duration);
        const eased=1-Math.pow(1-t,3);
        model.position.x=-2.7+5.4*eased;
        model.position.y=.03+Math.sin(t*Math.PI)*.32+(kind==='sea'?Math.sin(t*10)*.04:0);
        if(kind==='air')model.rotation.z=Math.sin(t*Math.PI)*-.08;
        model.rotation.y+=(kind==='air'?.003:0);
        this.renderer.render(this.scene,this.camera);
        if(t<1)requestAnimationFrame(frame);
        else{
          setTimeout(()=>{this.overlay.classList.remove('show');this.scene.remove(model);resolve()},fast?25:90);
        }
      };
      requestAnimationFrame(frame);
    });
  }
}

export const travelFX=new TravelFX();
