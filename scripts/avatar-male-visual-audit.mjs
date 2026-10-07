import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const OUT=path.resolve('tmp-avatar-audit');
fs.mkdirSync(OUT,{recursive:true});

const browser=await chromium.launch({
  headless:true,
  args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']
});
const context=await browser.newContext({
  viewport:{width:1440,height:1000},
  deviceScaleFactor:1
});
await context.addInitScript(()=>{
  sessionStorage.setItem('kc_teacher_admin_key','audit-key');
});
const page=await context.newPage();
page.on('console',msg=>console.log('[browser]',msg.type(),msg.text()));
page.on('pageerror',err=>console.error('[pageerror]',err.message));

await page.route('**/api/teacher/overview',async route=>{
  await route.fulfill({
    status:200,
    contentType:'application/json',
    body:JSON.stringify({ok:true,scope:'global'})
  });
});


await page.route('**/teacher/character-3d-studio-*.js',async route=>{
  const response=await route.fetch();
  const original=await response.text();
  const helper=`
  window.__kcFaceAudit=()=>{
    const read=(name)=>{
      const mesh=getNode(name);
      if(!mesh?.isSkinnedMesh)return null;
      const g=mesh.geometry;
      g.computeBoundingBox();
      return {name,vertices:g.getAttribute('position').count,
        uv:g.getAttribute('uv')?.count||0,
        weight:g.getAttribute('skinWeight')?.count||0,
        skeletonBones:mesh.skeleton.bones.length,
        box:{min:g.boundingBox.min.toArray(),max:g.boundingBox.max.toArray()}};
    };
    return {sourceEyes:read('eyes'),maleEyes:read('kidscade_male_eyes'),
      sourceLashes:read('eyelashes'),maleBrows:read('kidscade_male_brows')};
  };
  `;
  await route.fulfill({response,body:original+helper});
});

await page.goto('http://127.0.0.1:4173/teacher/character-3d-studio.html',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>{
  const t=document.querySelector('#chibiAssetStatus')?.textContent||'';
  const e=document.querySelector('#assetMissing');
  return t.includes('로드 완료') || (e && !e.classList.contains('hidden'));
},{timeout:45000});

const assetError=await page.locator('#assetMissing').evaluate(el=>!el.classList.contains('hidden')?el.textContent:'');
if(assetError)throw new Error('Studio asset error: '+assetError);

await page.click('[data-chibi-preset="male"]');
await page.waitForTimeout(350);

const state=await page.evaluate(()=>({
  assetStatus:document.querySelector('#chibiAssetStatus')?.textContent,
  status:document.querySelector('#status')?.textContent,
  rig:document.querySelector('#rigBadge')?.textContent,
  clips:document.querySelector('#clipBadge')?.textContent,
  triangles:document.querySelector('#triangleCount')?.textContent,
  info:document.querySelector('#modelInfoTip')?.textContent,
  activePreset:[...document.querySelectorAll('[data-chibi-preset].active')].map(x=>x.textContent.trim()),
  hair:document.querySelector('#chibiHair')?.value,
  checkedParts:[...document.querySelectorAll('[data-chibi-part]:checked')].map(x=>x.dataset.chibiPart)
}));
console.log('AUDIT_STATE '+JSON.stringify(state));
console.log('FACE_GEOMETRY_AUDIT '+JSON.stringify(await page.evaluate(()=>window.__kcFaceAudit())));

async function capture(name){
  const file=path.join(OUT,name+'.jpg');
  await page.locator('#view').screenshot({path:file,type:'jpeg',quality:82});
  return file;
}

const faces=[];
for(const view of ['front','threeQuarter']){
  for(const preset of ['male','base']){
    await page.click('[data-chibi-preset="'+preset+'"]');
    if(preset==='base')await page.selectOption('#chibiHair','kidscade_male_hair_short');
    await page.click('[data-view="'+view+'"]');
    await page.click('[data-clip="anim_iddle"]');
    await page.waitForTimeout(500);
    faces.push({file:await capture('face-'+preset+'-'+view),label:(preset==='male'?'NEW MALE ':'FEMALE ')+view,face:true});
  }
}
await page.click('[data-chibi-preset="male"]');
const motions=[];
for(const [clip,label] of [
  ['anim_walk','WALK'],['anim_run','RUN'],['anim_jump','JUMP'],
  ['anim_crouch','CROUCH'],['anim_flip','FLIP'],['anim_dying','DYING']
]){
  await page.click('[data-view="threeQuarter"]');
  await page.click('[data-clip="'+clip+'"]');
  await page.waitForTimeout(400);
  motions.push({file:await capture('motion-'+clip),label});
}
async function tile(item,width,height){
  let img=sharp(item.file);
  if(item.face){
    const meta=await img.metadata();
    const left=Math.round(meta.width*.27);
    const top=Math.round(meta.height*.10);
    const w=Math.round(meta.width*.46);
    const h=Math.round(meta.height*.54);
    img=img.extract({left,top,width:w,height:h});
  }
  const base=await img.resize(width,height,{fit:'contain',background:{r:23,g:32,b:42}})
    .webp({quality:47}).toBuffer();
  const label='<svg width="'+width+'" height="'+height+'" xmlns="http://www.w3.org/2000/svg">'+
    '<rect x="10" y="10" rx="8" ry="8" width="185" height="34" fill="rgba(255,255,255,0.92)"/>'+
    '<text x="22" y="33" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#1f2937">'+item.label+'</text>'+
    '</svg>';
  return sharp(base).composite([{input:Buffer.from(label),top:0,left:0}]).webp({quality:47}).toBuffer();
}

async function makeSheet(items,cols,tileW,tileH,outFile){
  const rows=Math.ceil(items.length/cols);
  const canvas=sharp({
    create:{width:cols*tileW,height:rows*tileH,channels:3,background:{r:17,g:24,b:39}}
  });
  const comps=[];
  for(let i=0;i<items.length;i++){
    comps.push({
      input:await tile(items[i],tileW,tileH),
      left:(i%cols)*tileW,
      top:Math.floor(i/cols)*tileH
    });
  }
  await canvas.composite(comps).webp({quality:38}).toFile(outFile);
}

const faceSheet=path.join(OUT,'face-sheet.webp');
const motionSheet=path.join(OUT,'motion-sheet.webp');
await makeSheet(faces,2,310,340,faceSheet);
await makeSheet(motions,3,215,230,motionSheet);

function printB64(tag,file){
  const b64=fs.readFileSync(file).toString('base64');
  console.log(tag+'_B64_BEGIN');
  for(let i=0;i<b64.length;i+=12000)console.log(b64.slice(i,i+12000));
  console.log(tag+'_B64_END');
  console.log(tag+'_BYTES '+fs.statSync(file).size);
}
printB64('AUDIT_FACE',faceSheet);
printB64('AUDIT_MOTION',motionSheet);
await browser.close();
