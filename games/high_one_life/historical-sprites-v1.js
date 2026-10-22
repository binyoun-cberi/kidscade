/* Original, deliberately stylized historical pixel families. No third-party art.
 * Goryeo figures use wrap collars and compact head cloth; Joseon keeps the
 * game's pre-existing wardrobe logic and borrows only stable face identities.
 * These silhouettes are illustrative, not archaeological reconstructions. */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeHistoricalSpritesV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const skin=['#dcae85','#c99470','#e4b895','#bd906e'];
 const hair=['#35312d','#453a32','#312f31','#51473d'];
 const villageCloth=['#95795e','#6b8575','#956e68','#8a8069'];
 const eliteCloth=['#627889','#77738b','#5d827b'];
 const hash=value=>{
   let h=2166136261;
   for(const c of String(value??''))h=Math.imul(h^c.charCodeAt(0),16777619);
   return h>>>0;
 };
 function appearance(seed,id='self'){
   const h=hash(String(seed??0)+'|'+String(id));
   return Object.freeze({skin:skin[h%skin.length],hair:hair[(h>>>5)%hair.length],
     everyday:villageCloth[(h>>>11)%villageCloth.length],fine:eliteCloth[(h>>>16)%eliteCloth.length],
     hairPart:(h>>>21)%3});
 }
 function rect(ctx,x,y,w,h,color){
   if(!ctx||!Number.isFinite(x)||!Number.isFinite(y)||!(w>0&&h>0))return;
   ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
 }
 function activityFor(work,age,away=false){
   if(away)return 'walk';
   if(age<14||age>=68)return 'idle';
   const label=String(work||'');
   if(/농사|경작|밭일/.test(label))return 'farm';
   if(/삼베|모시|길쌈|옷 짓기|솜이불/.test(label))return 'weave';
   if(/나루|사공/.test(label))return 'river';
   if(/바구니|장인|공예/.test(label))return 'craft';
   if(/글과 셈|글공부|배움/.test(label))return 'read';
   return 'idle';
 }
 function actor(ctx,{x=350,feet=191,age=25,seed=0,id='self',status='plain',phase=0,activity='idle',scale=1}={}){
   const iden=appearance(seed,id),u=Math.max(1,Math.round(scale*2));
   const child=age<13,elder=age>=65,body=child?8:elder?11:13,head=child?8:9;
   const robe=status==='elite'?iden.fine:status==='bound'?'#837b69':iden.everyday;
   const R=(px,py,w,h,c)=>rect(ctx,x+px*u,feet+py*u,w*u,h*u,c);
   const step=activity==='walk'?(phase%2===0?1:-1):0;
   const working=['farm','weave','river','craft'].includes(activity)&&age>=14&&age<68;
   const arm=working?(phase%2===0?-2:1):0;
   // Feet have the same ground anchor throughout every animation.
   R(-5,-1,11,1,'#806d56');
   R(-4+step,-6,3,5,'#55443d');R(2-step,-6,3,5,'#55443d');
   R(-5,-6-body,10,body,robe);
   R(-6,-6-body+5,12,2,status==='elite'?'#d0b78d':'#b69a70');
   R(-7,-5-body+arm,2,7,robe);R(5,-5-body-arm,2,7,robe);
   R(-4,-7-body-head,8,head,iden.skin);
   // Illustrative Goryeo head cloth, distinct from Joseon gat/samo or modern haircuts.
   const hairTop=-8-body-head;
   R(-5,hairTop,10,3,elder?'#a9a69d':iden.hair);
   if(age>=16&&status!=='travel'){
     R(-5,hairTop-2,10,2,status==='elite'?'#455463':'#a99980');
     R(4,hairTop,2,6,status==='elite'?'#455463':'#a99980');
   }else if(iden.hairPart===1)R(-5,hairTop+3,2,4,iden.hair);
   R(-2,hairTop+head-3,1,1,'#332f2d');R(2,hairTop+head-3,1,1,'#332f2d');
   if(working){
     // Props are attached to the animated right wrist. These represent the
     // recorded work, not new harvests, sales or physical inventory.
     const py=-6-body+arm+3;
     if(activity==='farm'){
       R(7,py-8,1,15,'#806449');
       R(6,py+5,8,2,'#72776b');
     }else if(activity==='weave'){
       R(7,py,9,1,'#a88d62');
       R(7,py+4,9,1,'#a88d62');
       for(let k=0;k<3;k++)R(8+k*3,py,1,7,'#d6c6a6');
     }else if(activity==='river'){
       R(7,py-1,2,9,'#836f50');
       R(8,py+7,11,1,'#bdad81');
       R(18,py+4,1,4,'#bdad81');
     }else if(activity==='craft'){
       R(7,py+1,7,6,'#a68354');
       R(8,py-1,5,2,'#745c44');
     }
   }else if(activity==='read'&&age>=14){
     R(7,-6-body+4,9,6,'#e4d4ad');
     R(11,-6-body+4,1,6,'#917d60');
   }
   return Object.freeze({identity:iden,feet,x,ageBand:child?'child':elder?'elder':'adult',width:14*u,height:(9+body+head)*u});
 }
 function occupants(life,g){
   const year=Number(life.year??life.birthYear) || 1300;
   const away=Number(g.away||0)>0,displaced=away||Boolean(g.refuge);
   const result=[];
   if(life.alive!==false)result.push({id:'self',age:Math.max(0,Number(life.age)||0),
       status:away?'travel':g.bound?'bound':/관료|향리/.test(String(g.origin))?'elite':'plain',
       activity:activityFor(g.job,Number(life.age)||0,displaced),self:true});
   if(!away)for(const p of g.people||[]){
     if(p.alive===false||p.missing||p.atHome===false||Number(p.birthYear)>year)continue;
     const age=year-Number(p.birthYear);
     if(!Number.isFinite(age)||age<0)continue;
     result.push({id:String(p.id??p.name),age,
       status:g.bound?'bound':/관료|향리/.test(String(g.origin))?'elite':'plain',
       activity:activityFor(p.plan,age,displaced),self:false});
   }
   return result.slice(0,5);
 }
 function scene(ctx,life,g,{phase=0}={}){
   if(!ctx||!life||!g)return null;
   const year=Number(life.year||life.birthYear)||1300;
   const coast=/해안|탐라|강화/.test(String(g.region)),away=Number(g.away||0)>0;
   const temporary=away||Boolean(g.refuge);
   const mountain=g.refuge||/내륙|서북/.test(String(g.region));
   const people=occupants(life,g);
   const ferryWork=people.some(p=>p.activity==='river');
   // Sky, mountain silhouettes and coast — all hard-edged, no gradients/curves.
   rect(ctx,0,0,720,220,'#c4d5c6');
   for(let x=0;x<720;x+=24){
     const ridge=72+(hash(String(g.region)+'-ridge-'+Math.floor(x/96))%37);
     rect(ctx,x,ridge,24,143-ridge,'#94aba0');
     const hill=123+(hash(String(g.region)+'-hill-'+Math.floor(x/72))%16);
     rect(ctx,x,hill,24,157-hill,'#809d84');
   }
   rect(ctx,0,148,720,72,mountain?'#a1a98a':'#b5b98e');
   if(coast||ferryWork){
     // Inland ferry work needs an actual riverside, not a person rowing grass.
     rect(ctx,0,177,210,43,'#759ca0');
     for(let i=0;i<5;i++)rect(ctx,10+i*41,191+(i%2)*13,23,3,'#bcd1c1');
   }else{
     for(let i=0;i<8;i++)rect(ctx,10+i*43,180+(i%2)*9,30,4,'#87966c');
   }
   rect(ctx,184,174,352,36,'#c6ae86');
   if(!temporary){
     const wealthy=/관료 가문|향리 가문/.test(String(g.origin));
     const houses=wealthy?2:1;
     for(let i=0;i<houses;i++){
       const hx=i?492:58,hy=i?98:105,w=i?133:144;
       rect(ctx,hx,hy,w,67,wealthy?'#dccdb0':'#d4bf9b');
       // Stepped roof, built as 4px strips for consistent pixel density.
       for(let row=0;row<7;row++){
         rect(ctx,hx-12+row*4,hy-24+row*4,w+24-row*8,4,
              wealthy?'#56626a':'#8c8061');
       }
       rect(ctx,hx+22,hy+28,26,39,'#725b48');
       rect(ctx,hx+66,hy+25,33,24,'#f0dfc3');
       rect(ctx,hx+81,hy+25,3,24,'#846d54');
     }
   }else{
     // Travel or recorded refuge: replace the normal home, never fake a settled house.
     rect(ctx,55,146,135,20,'#9f8765');
     for(let row=0;row<9;row++)rect(ctx,61+row*6,102+row*5,123-row*12,5,'#baa079');
   }
   const places=[[330,195],[265,193],[405,193],[485,197],[220,198]];
   for(let i=0;i<people.length;i++){
     const p=people[i],[x,feet]=places[i],scale=p.age<12?.72:i===0?1:0.88;
     actor(ctx,{x,feet,age:p.age,id:p.id,seed:life.seed,status:p.status,
       activity:p.activity,phase,scale});
     if(p.self){
       rect(ctx,x-5,feet-75*scale,10,4,'#e3c47d');
       rect(ctx,x-2,feet-78*scale,4,9,'#e6cf8e');
     }
   }
   // Foreground fencing is only on edges; actor silhouettes remain unobstructed.
   for(const base of [0,625]){
     rect(ctx,base,206,95,3,'#816d54');
     for(let i=0;i<4;i++)rect(ctx,base+10+i*24,198,4,17,'#776148');
   }
   return Object.freeze({visiblePeople:people.length,away,coast,year});
 }
 return Object.freeze({appearance,activityFor,actor,occupants,scene});
});
