(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AquariumCore=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const traits={curious:{speed:65,interest:1.4},calm:{speed:35,interest:.8},shy:{speed:48,interest:.6}};
function fish(id,personality='curious',rng=Math.random){return{id,x:160+rng()*680,y:100+rng()*330,vx:0,vy:0,heading:1,targetX:150+rng()*700,targetY:90+rng()*360,timer:rng()*3,phase:rng()*6.28,personality,meals:0,age:0,state:'탐험 중'};}
function world(){return{fish:[],food:[],bubbles:[],decor:[],time:0,meals:0,pearls:0};}
function feed(w,x,y){if(w.food.length>=36)return false;for(let i=0;i<3;i++)w.food.push({x:clamp(x+(i-1)*14,30,970),y:clamp(y,35,500),age:0,owner:null});return true;}
function bubble(w,x,y){for(let i=0;i<7&&w.bubbles.length<70;i++)w.bubbles.push({x:x+(i%3-1)*12,y:y+i*7,r:3+i%4,age:0});}
function step(w,delta,rng=Math.random,pointer=null){
 const dt=clamp(delta,0,.05);w.time+=dt;
 for(const p of w.food){p.age+=dt;p.y=Math.min(536,p.y+17*dt);p.owner=null;}
 for(const p of w.bubbles){p.age+=dt;p.y-=45*dt;p.x+=Math.sin(p.age*2)*7*dt;}
 w.bubbles=w.bubbles.filter(p=>p.y>15&&p.age<12);
 w.food=w.food.filter(p=>p.age<35);
 // Assign different pellets to different fish; nobody owns a whole feeding spot.
 const reserved=new Set();
 for(const f of w.fish){
  f.age+=dt;f.timer-=dt;const tr=traits[f.personality]||traits.curious;let tx=f.targetX,ty=f.targetY,speed=tr.speed;
  const candidates=w.food.filter(p=>!reserved.has(p)).sort((a,b)=>Math.hypot(a.x-f.x,a.y-f.y)-Math.hypot(b.x-f.x,b.y-f.y));
  const meal=candidates[0];
  if(meal&&Math.hypot(meal.x-f.x,meal.y-f.y)<380*tr.interest){
   reserved.add(meal);tx=meal.x;ty=meal.y;f.state='먹이 찾는 중';speed*=1.35;
   if(Math.hypot(tx-f.x,ty-f.y)<19){w.food.splice(w.food.indexOf(meal),1);f.meals++;w.meals++;if(w.meals%3===0)w.pearls++;bubble(w,f.x,f.y);f.state='냠냠!';}
  }else if(pointer&&Math.hypot(pointer.x-f.x,pointer.y-f.y)<220&&f.personality==='curious'){tx=pointer.x;ty=pointer.y;f.state='손끝이 궁금해';}
  else{
   if(f.timer<=0||Math.hypot(tx-f.x,ty-f.y)<28){f.targetX=70+rng()*860;f.targetY=65+rng()*410;f.timer=4+rng()*6;tx=f.targetX;ty=f.targetY;}
   f.state=f.personality==='calm'?'느긋한 산책':'탐험 중';
   const friend=w.fish.find(o=>o!==f&&Math.hypot(o.x-f.x,o.y-f.y)>100&&Math.hypot(o.x-f.x,o.y-f.y)<240);
   if(friend&&Math.sin(w.time*.17+f.phase)>.65){tx=friend.x-friend.heading*85;ty=friend.y+24;f.state='친구 따라가기';}
   if(f.personality==='shy'&&w.bubbles.some(p=>Math.hypot(p.x-f.x,p.y-f.y)<85)){tx=1000-f.x;ty=100+Math.abs(Math.sin(f.phase))*300;f.state='거품을 피해요';}
  }
  let dx=tx-f.x,dy=ty-f.y,dist=Math.hypot(dx,dy)||1;let ax=dx/dist,ay=dy/dist;
  for(const o of w.fish){if(o===f)continue;const d=Math.hypot(f.x-o.x,f.y-o.y);if(d>0&&d<75){ax+=(f.x-o.x)/d*(75-d)/35;ay+=(f.y-o.y)/d*(75-d)/35;}}
  for(const o of w.decor){if(o.kind!=='rock')continue;const d=Math.hypot(f.x-o.x,f.y-o.y);const reach=65*(o.scale||1)+30;if(d<reach&&d>.1){ax+=(f.x-o.x)/d*3;ay+=(f.y-o.y)/d*3;}}
  const len=Math.hypot(ax,ay)||1;const k=1-Math.exp(-dt*2.5);const slow=clamp(dist/70,.18,1);
  f.vx+=(ax/len*speed*slow-f.vx)*k;f.vy+=(ay/len*speed*slow-f.vy)*k;
  f.x=clamp(f.x+f.vx*dt,45,955);f.y=clamp(f.y+f.vy*dt,45,505);
  const direction=f.vx>3?1:f.vx< -3?-1:f.heading;f.heading+=(direction-f.heading)*(1-Math.exp(-dt*4));
 }
 return w;
}
function validateSave(data){
 if(!data||data.version!==1||!Array.isArray(data.creatures)||!Array.isArray(data.decor)||data.creatures.length>30||data.decor.length>50)throw Error('올바른 수조 파일이 아니에요.');
 const ids=new Set();
 const imageOK=s=>typeof s==='string'&&s.length<=2200000&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(s);
 const creatures=data.creatures.map(c=>{
  if(!c||typeof c.id!=='string'||c.id.length>100||ids.has(c.id)||!imageOK(c.image))throw Error('물고기 그림을 확인해 주세요.');ids.add(c.id);
  return{id:c.id,active:c.active!==false,name:String(c.name||'이름 없는 친구').slice(0,24),image:c.image,personality:traits[c.personality]?c.personality:'curious',head:c.head==='right'?'right':'left',swim:['fish','float','eel'].includes(c.swim)?c.swim:'fish',meals:clamp(Number(c.meals)||0,0,10000),x:clamp(Number(c.x)||500,45,955),y:clamp(Number(c.y)||250,45,505)};
 });
 const decor=data.decor.map(d=>{if(!d||!['plant','rock','castle','drawing'].includes(d.kind))throw Error('장식을 확인해 주세요.');if(d.kind==='drawing'&&!imageOK(d.image))throw Error('장식 그림을 확인해 주세요.');return{kind:d.kind,image:d.kind==='drawing'?d.image:undefined,x:clamp(Number(d.x)||500,40,960),y:clamp(Number(d.y)||500,60,550),scale:clamp(Number(d.scale)||1,.5,2)};});
 return{version:1,creatures,decor,castleUnlocked:data.castleUnlocked===true,theme:['lagoon','night','sunset'].includes(data.theme)?data.theme:'lagoon',pearls:clamp(Number(data.pearls)||0,0,99999),meals:clamp(Number(data.meals)||0,0,99999)};
}
return{clamp,fish,world,feed,bubble,step,validateSave};
});
