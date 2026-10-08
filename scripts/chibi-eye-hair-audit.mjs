import { chromium } from 'playwright';
import sharp from 'sharp';

const browser=await chromium.launch({headless:true,args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1160,height:880},deviceScaleFactor:1});
await page.addInitScript(()=>sessionStorage.setItem('kc_teacher_admin_key','audit-key'));
page.on('pageerror',e=>console.log('PAGEERROR '+e.message));
await page.route('**/api/teacher/overview',route=>route.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"scope":"global"}'}));
await page.route('**/teacher/character-3d-studio.js*',async route=>{
 const response=await route.fetch();
 await route.fulfill({response,body:(await response.text())+`
window.__auditHair={
  info(){
    const h=getNode('kidscade_male_hair_short'),face=getNode('kidscade_male_body'),eye=getNode('kidscade_male_eyes');
    const p=h.geometry.getAttribute('position');let bands=[];
    for(let floor=1.5;floor<1.95;floor+=.05){let n=0,nFront=0,nEye=0,zFront=-Infinity;
      for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
       if(y>=floor&&y<floor+.05){n++;if(z>.08){nFront++;zFront=Math.max(zFront,z)}if(z>.08&&Math.abs(x)<.34)nEye++;}
      }bands.push({floor:+floor.toFixed(2),n,nFront,nEye,zFront:zFront===-Infinity?null:zFront});
    }
    const fmt=m=>Array.isArray(m)?m.map(fmt):({name:m.name,type:m.type,transparent:m.transparent,depthTest:m.depthTest,depthWrite:m.depthWrite,alphaTest:m.alphaTest,side:m.side,opacity:m.opacity,map:!!m.map});
    return {hair:{vertices:p.count,indices:h.geometry.index?.count,materials:fmt(h.material),bands},eyes:{material:fmt(eye.material)},face:{material:fmt(face.material)}};
  },
  variant(mode){
    const h=getNode('kidscade_male_hair_short');
    window.__hairOriginalGeometry ||=h.geometry.clone();
    if(mode==='hidden'){h.visible=false;return;}
    h.visible=true;
    const g=window.__hairOriginalGeometry.clone();
    const p=g.getAttribute('position');
    if(mode==='frontLift'||mode==='uniformLift'||mode==='templeOut'){
      for(let i=0;i<p.count;i++){
        let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
        if(mode==='frontLift'&&z>-.08){
          const fac=THREE.MathUtils.smoothstep(z,-.08,.11);
          if(y<1.78)y+=(1.78-y)*.80*fac;
        }else if(mode==='uniformLift'&&y<1.77){
          y=1.77+(y-1.77)*.16;
        }else if(mode==='templeOut'&&y<1.79&&z>-.08){
          y=1.79+(y-1.79)*.5;
          const ax=Math.abs(x),side=THREE.MathUtils.smoothstep(ax,.1,.36);
          x+=Math.sign(x)*.028*side;
          z+=.016;
        }
        p.setXYZ(i,x,y,z);
      }
    }else if(mode==='prune'){
      const idx=g.index?.array,keep=[];
      if(idx){
        for(let k=0;k<idx.length;k+=3){
          const a=idx[k],b=idx[k+1],c=idx[k+2];
          const ymin=Math.min(p.getY(a),p.getY(b),p.getY(c));
          const zmax=Math.max(p.getZ(a),p.getZ(b),p.getZ(c));
          if(ymin>=1.74||zmax<=-.10)keep.push(a,b,c);
        }
        g.setIndex(keep);
      }
    }else if(mode==='alphaFix'){
      const materials=Array.isArray(h.material)?h.material:[h.material];
      for(const m of materials){m.transparent=false;m.alphaTest=0.5;m.depthWrite=true;m.depthTest=true;m.side=THREE.FrontSide;m.needsUpdate=true;}
    }
    p.needsUpdate=true;
    g.computeVertexNormals();g.computeBoundingSphere();
    const old=h.geometry;h.geometry=g;if(old!==window.__hairOriginalGeometry)old.dispose();
  }
};
`});
});
await page.goto('http://127.0.0.1:4173/teacher/character-3d-studio.html',{waitUntil:'domcontentloaded',timeout:35000});
await page.waitForFunction(()=>document.querySelector('#chibiAssetStatus')?.textContent?.includes('로드 완료'),{timeout:45000});
await page.click('[data-chibi-preset="male"]');
console.log('HAIR_DIAGNOSTIC '+JSON.stringify(await page.evaluate(()=>window.__auditHair.info())));
const modes=['original','hidden','frontLift','uniformLift','templeOut','prune','alphaFix'];
let items=[];
for(const [view,title] of [['front','FRONT'],['threeQuarter','45 DEG'],['side','SIDE']]){
 await page.click('[data-view="'+view+'"]');
 for(let i=0;i<modes.length;i++){
  const mode=modes[i];
  await page.evaluate(mode=>window.__auditHair.variant(mode),mode);
  await page.waitForTimeout(330);
  const buf=await page.locator('#view').screenshot({type:'png'});
  const meta=await sharp(buf).metadata();
  const crop=await sharp(buf).extract({left:Math.round(meta.width*.23),top:Math.round(meta.height*.07),width:Math.round(meta.width*.54),height:Math.round(meta.height*.56)}).resize(260,260,{fit:'contain',background:'#1b2834'}).webp({quality:48}).toBuffer();
  const x=(i%7)*260,y=items.length/7*285;
  const rect=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="260" height="25"><rect width="260" height="25" fill="#fff"/><text font-family="Arial" x="7" y="18" font-size="15">'+title+' '+mode+'</text></svg>');
  items.push([{input:rect,left:x,top:Math.floor(items.length/7)*285},{input:crop,left:x,top:Math.floor(items.length/7)*285+25}]);
 }
}
const composites=items.flat();
const sheet=await sharp({create:{width:1820,height:855,channels:4,background:'#18232d'}}).composite(composites).webp({quality:46}).toBuffer();
console.log('HAIR_IMAGE_BEGIN');
const b64=sheet.toString('base64');for(let i=0;i<b64.length;i+=12000)console.log(b64.slice(i,i+12000));
console.log('HAIR_IMAGE_END');
await browser.close();