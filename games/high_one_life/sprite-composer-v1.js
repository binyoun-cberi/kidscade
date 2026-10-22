/* Deterministic pixel sprite + environment layers. Original art; no copied assets.
 * Character identity comes from the person's stable seed, not current age.
 * Draw order: sky -> distant terrain -> buildings -> actor -> foreground. */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeSpriteComposerV1=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const skins=['#e9bd91','#c99064','#a66c4b','#78513d','#f0ceb1'];
 const hair=['#252c31','#453128','#704e31','#977248','#474341'];
 const clothes=['#4f798b','#a36f57','#718c65','#8c6e91','#84694c'];
 function hash(value){
   const s=String(value??'');let h=2166136261;
   for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),16777619);}
   return h>>>0;
 }
 function appearance(person,id='self'){
   const stable=hash(String(person?.seed??0)+'|'+String(id));
   return Object.freeze({skin:skins[stable%skins.length],hair:hair[(stable>>>5)%hair.length],
     clothing:clothes[(stable>>>12)%clothes.length],haircut:(stable>>>17)%4,face:(stable>>>21)%3});
 }
 function rect(ctx,x,y,w,h,c){
   if(!(w>0&&h>0))return;
   ctx.fillStyle=c;
   ctx.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));
 }
 function character(ctx,{x=300,feet=217,age=25,scale=1.4,identity=0,pose='idle',frame=0}={}){
   if(!ctx)return null;
   const a=appearance({seed:identity}),unit=Math.max(1,Math.round(scale*2));
   const child=age<13,elder=age>=65;
   const u=(v)=>v*unit;
   const px=(bx,by,bw,bh,c)=>rect(ctx,x+u(bx),feet+u(by),u(bw),u(bh),c);
   const body=child?6:8,head=child?6:7;
   const stride=pose==='walk'?(frame%2===0?1:-1):0;
   const arm=pose==='work'?(frame%2===0?-2:1):0;
   // Drop shadow anchors all generations to the same ground baseline.
   px(-4,-1,9,1,'#536b61');
   px(-3+stride,-6,2,5,'#293b45');px(1-stride,-6,2,5,'#293b45');
   px(-3,-6,6,1,'#4c4a4a');
   px(-4,-6-body,8,body,elder?'#7b7185':a.clothing);
   px(-6,-5-body+arm,2,6,a.clothing);px(4,-5-body-arm,2,6,a.clothing);
   px(-3,-6-body-head,6,head,a.skin);
   const top=-6-body-head-1;
   if(a.haircut===0){px(-3,top,6,2,a.hair);px(-4,top+2,1,3,a.hair);}
   else if(a.haircut===1){px(-4,top,8,2,a.hair);px(-4,top+2,2,4,a.hair);}
   else if(a.haircut===2){px(-3,top,7,2,a.hair);px(3,top+2,1,4,a.hair);}
   else{px(-4,top,7,3,a.hair);}
   if(elder){px(-4,top,4,1,'#c4bbaa');}
   px(-2,top+head-3,1,1,'#28343a');px(1,top+head-3,1,1,'#28343a');
   if(a.face===1)px(0,top+head-1,1,1,'#9c614d');
   if(a.face===2)px(-1,top+head-1,2,1,'#70483c');
   return Object.freeze({identity:a,feet,x,width:8*unit,height:(6+body+head+3)*unit});
 }
 function distant(ctx,{rural=false,seed=0,season=0}={}){
   // Rectangular 2px tiles, no subpixel anti-aliasing or network assets.
   const tone=season===3?'#aabcb3':'#7b9fb2';
   const far=season===3?'#b9b7a5':'#94b8ad';
   let count=0;
   for(let x=0;x<600;x+=16){
     const peak=104+((hash(seed+'-ridge-'+Math.floor(x/80))%31));
     const lower=135+((hash(seed+'-hill-'+Math.floor(x/48))%18));
     rect(ctx,x,peak,16,146-peak,tone);rect(ctx,x,lower,16,155-lower,far);count+=2;
   }
   if(rural){
     for(let x=7;x<600;x+=48){const h=hash(seed+'tree'+x)%11;
       rect(ctx,x,146-h,8,30,'#567765');rect(ctx,x-10,136-h,28,17,'#568d74');count+=2;}
   }
   return count;
 }
 function foreground(ctx,{rural=false,seed=0}={}){
   let count=0;
   // Peripheral fencing does not cover the protagonist in the central 220–420px.
   if(rural)for(const start of [0,500]){
     rect(ctx,start,204,100,3,'#6d6651');rect(ctx,start,214,100,3,'#6d6651');
     for(let x=start+8;x<start+100;x+=20)rect(ctx,x,196,5,28,'#816c4e');
     count+=7;
   }else{
     for(const start of [0,500]){
       rect(ctx,start,204,100,5,'#737e80');rect(ctx,start+10,192,8,13,'#889790');count+=2;
     }
   }
   return count;
 }
 return Object.freeze({appearance,character,distant,foreground,hash});
});
