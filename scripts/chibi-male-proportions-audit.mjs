import {chromium} from 'playwright';
import sharp from 'sharp';

const browser=await chromium.launch({headless:true,args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1100,height:900},deviceScaleFactor:1});
await page.addInitScript(()=>sessionStorage.setItem('kc_teacher_admin_key','audit-key'));
page.on('pageerror',e=>console.error('PAGEERROR '+e.message));
await page.route('**/api/teacher/overview',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"scope":"global"}'}));
await page.route('**/teacher/character-3d-studio.js*',async route=>{
 const response=await route.fetch();
 await route.fulfill({response,body:(await response.text())+`
window.__kcShapeAudit=()=>{
 const names=['character_low','kidscade_male_body','shirt','kidscade_male_tshirt','ninjasuitshort','kidscade_male_shorts'];
 const arr={};
 for(const name of names){
  const o=getNode(name);
  const p=o?.geometry?.getAttribute('position');
  if(!p){arr[name]=null;continue;}
  const bands=[.16,.32,.48,.58,.72,.9,1.04,1.16,1.27];
  arr[name]={
   vertexCount:p.count,skinWeights:o.geometry.getAttribute('skinWeight')?.count,
   visible:o.visible,
   bands:bands.map(y=>{
    let n=0,xmax=0,xmin=1e6,zmax=-1e6,zmin=1e6;
    for(let i=0;i<p.count;i++){
      const py=p.getY(i);
      if(Math.abs(py-y)>.045)continue;
      let x=p.getX(i),z=p.getZ(i);
      n++;xmax=Math.max(xmax,x);xmin=Math.min(xmin,x);zmax=Math.max(zmax,z);zmin=Math.min(zmin,z);
    }
    return {y,n,width:n?+(xmax-xmin).toFixed(4):0,depth:n?+(zmax-zmin).toFixed(4):0};
   })
  };
 }
 return arr;
};
`});
});
await page.goto('http://127.0.0.1:4173/teacher/character-3d-studio.html',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>document.querySelector('#chibiAssetStatus')?.textContent?.includes('로드 완료'),{timeout:45000});
await page.click('[data-chibi-preset="male"]');
console.log('SHAPE_MESH_AUDIT '+JSON.stringify(await page.evaluate(()=>window.__kcShapeAudit())));
const frames=[];
async function shot(label,view,clip,delay=380){
 await page.click('[data-view="'+view+'"]');
 await page.click('[data-clip="'+clip+'"]');
 await page.waitForTimeout(delay);
 const png=await page.locator('#view').screenshot({type:'png'});
 const meta=await sharp(png).metadata();
 const crop=await sharp(png).extract({
  left:Math.round(meta.width*.20),top:Math.round(meta.height*.07),
  width:Math.round(meta.width*.60),height:Math.round(meta.height*.88)
 }).resize(295,400,{fit:'contain',background:'#202c36'}).webp({quality:48}).toBuffer();
 const labelSvg=Buffer.from('<svg width="295" height="26" xmlns="http://www.w3.org/2000/svg"><rect width="295" height="26" fill="#fff"/><text x="8" y="19" font-family="Arial" font-size="16">'+label+'</text></svg>');
 const i=frames.length;
 frames.push({label,crop,labelSvg});
}
await shot('FRONT IDLE','front','anim_iddle');
await shot('45 DEG IDLE','threeQuarter','anim_iddle');
await shot('SIDE IDLE','side','anim_iddle');
await shot('FRONT WALK','front','anim_walk');
await shot('45 DEG RUN','threeQuarter','anim_run');
await shot('45 DEG JUMP','threeQuarter','anim_jump');
await shot('FRONT CROUCH','front','anim_crouch');
await shot('45 DEG PUSH','threeQuarter','anim_push');
await shot('45 DEG FLIP','threeQuarter','anim_flip');
const layers=[];
frames.forEach(({crop,labelSvg},i)=>{const left=(i%3)*295,top=Math.floor(i/3)*426;layers.push({input:labelSvg,left,top},{input:crop,left,top:top+26});});
const sheet=await sharp({create:{width:885,height:1278,channels:4,background:'#23303a'}}).composite(layers).webp({quality:50}).toBuffer();
console.log('SHAPE_IMAGE_BEGIN');
const b64=sheet.toString('base64');for(let i=0;i<b64.length;i+=12000)console.log(b64.slice(i,i+12000));
console.log('SHAPE_IMAGE_END');
await browser.close();
