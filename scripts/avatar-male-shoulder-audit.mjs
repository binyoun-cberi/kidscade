import {chromium} from 'playwright';
import fs from 'node:fs';
import sharp from 'sharp';
const browser=await chromium.launch({headless:true,args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1100,height:850},deviceScaleFactor:1});
await page.addInitScript(()=>sessionStorage.setItem('kc_teacher_admin_key','audit-key'));
page.on('pageerror',e=>console.log('PAGEERROR',e.message));
await page.route('**/api/teacher/overview',route=>route.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"scope":"global"}'}));
await page.route('**/teacher/character-3d-studio.js*',async route=>{
  const response=await route.fetch();
  const old=await response.text();
  await route.fulfill({response,body:old+`
window.__auditMeshes=()=>{
  const names=['character_low','kidscade_male_body','shirt','chemise','ninjassuit','greenoutfit','kidscade_male_tshirt','eyelashes','kidscade_male_brows'];
  const out={};
  for(const name of names){
    const o=getNode(name);if(!o?.isSkinnedMesh){out[name]=null;continue;}
    const g=o.geometry;g.computeBoundingBox();const b=g.boundingBox,p=g.attributes.position;
    const bands=[.85,1.02,1.15,1.28,1.4].map(y=>{
      let n=0,mx=0,mz=0;for(let i=0;i<p.count;i++){if(Math.abs(p.getY(i)-y)<.045){n++;mx=Math.max(mx,Math.abs(p.getX(i)));mz=Math.max(mz,Math.abs(p.getZ(i)));}}
      return {y,n,mx,mz};
    });
    out[name]={nodes:p.count,index:g.index?.count||0,min:b.min.toArray(),max:b.max.toArray(),bands,
     skinIndex:g.attributes.skinIndex?.count||0,visible:o.visible,
     groups:g.groups?.length||0};
  }
  return out;
};
window.__showOutfit=(name)=>{
  for(const n of ['kidscade_male_tshirt','shirt','chemise','ninjassuit','greenoutfit'])setNodeVisible(n,n===name);
  refreshMetrics();
};
`});
});
await page.goto('http://127.0.0.1:4173/teacher/character-3d-studio.html',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>document.querySelector('#chibiAssetStatus')?.textContent?.includes('로드 완료'),{timeout:45000});
await page.click('[data-chibi-preset="male"]');
await page.click('[data-view="front"]');
await page.click('[data-clip="anim_iddle"]');
await page.waitForTimeout(500);
console.log('AUDIT_MESH_DATA '+JSON.stringify(await page.evaluate(()=>window.__auditMeshes())));
const shots=[];
let itemIndex=0;
for(const [name,label] of [['kidscade_male_tshirt','MALE TEE'],['shirt','ORIGINAL SHIRT'],['chemise','MERCHANT CHEMISE'],['ninjassuit','NINJA SUIT'],['greenoutfit','ARCHER OUTFIT']]){
  await page.evaluate(x=>window.__showOutfit(x),name);
  await page.waitForTimeout(250);
  const png=await page.locator('#view').screenshot({type:'png'});
  const met=await sharp(png).metadata();
  const im=await sharp(png).extract({left:Math.round(met.width*.22),top:Math.round(met.height*.08),width:Math.round(met.width*.56),height:Math.round(met.height*.63)}).resize(260,325,{fit:'cover'}).webp({quality:38}).toBuffer();
  shots.push({input:im,left:(itemIndex%3)*260,top:Math.floor(itemIndex/3)*345+24});
  const svg=Buffer.from('<svg width="260" height="24" xmlns="http://www.w3.org/2000/svg"><rect width="260" height="24" fill="#fff"/><text x="6" y="17" font-size="14" fill="#111">'+label+'</text></svg>');
  shots.push({input:svg,left:(itemIndex%3)*260,top:Math.floor(itemIndex/3)*345});
  itemIndex++;
}
const sheet=await sharp({create:{width:780,height:690,channels:4,background:'#1b2732'}}).composite(shots).webp({quality:39}).toBuffer();
console.log('AUDIT_IMAGE_START');
const b64=sheet.toString('base64');for(let i=0;i<b64.length;i+=12000)console.log(b64.slice(i,i+12000));
console.log('AUDIT_IMAGE_END');
await browser.close();
