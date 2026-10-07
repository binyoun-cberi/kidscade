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

async function capture(name){
  const file=path.join(OUT,name+'.jpg');
  await page.locator('#view').screenshot({path:file,type:'jpeg',quality:82});
  return file;
}

const idleViews=[];
for(const [view,label] of [['front','FRONT'],['threeQuarter','45 DEG'],['side','SIDE'],['back','BACK']]){
  await page.click('[data-view="'+view+'"]');
  await page.click('[data-clip="anim_iddle"]');
  await page.waitForTimeout(450);
  idleViews.push({file:await capture('idle-'+view),label});
}

const motions=[];
for(const [clip,label,wait] of [
  ['anim_walk','WALK',420],
  ['anim_run','RUN',300],
  ['anim_jump','JUMP',380],
  ['anim_push','PUSH',420],
  ['anim_crouch','CROUCH',420],
  ['anim_crouchiddle','CROUCH IDLE',450],
  ['anim_uncrouch','STAND',350],
  ['anim_flip','FLIP',340],
  ['anim_dying','DYING',500]
]){
  await page.click('[data-view="threeQuarter"]');
  await page.click('[data-clip="'+clip+'"]');
  await page.waitForTimeout(wait);
  motions.push({file:await capture('motion-'+clip),label});
}

async function tile(item,width,height){
  const base=await sharp(item.file)
    .resize(width,height,{fit:'contain',background:{r:23,g:32,b:42,alpha:1}})
    .jpeg({quality:72})
    .toBuffer();
  const label='<svg width="'+width+'" height="'+height+'" xmlns="http://www.w3.org/2000/svg">'+
    '<rect x="10" y="10" rx="8" ry="8" width="150" height="34" fill="rgba(255,255,255,0.90)"/>'+
    '<text x="22" y="33" font-family="Arial,sans-serif" font-size="17" font-weight="700" fill="#1f2937">'+item.label+'</text>'+
    '</svg>';
  return sharp(base).composite([{input:Buffer.from(label),top:0,left:0}]).jpeg({quality:72}).toBuffer();
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
  await canvas.composite(comps).jpeg({quality:68}).toFile(outFile);
}

const idleSheet=path.join(OUT,'idle-views-sheet.jpg');
const motionSheet=path.join(OUT,'motion-sheet.jpg');
await makeSheet(idleViews,2,420,420,idleSheet);
await makeSheet(motions,3,330,350,motionSheet);

function printB64(tag,file){
  const b64=fs.readFileSync(file).toString('base64');
  console.log(tag+'_B64_BEGIN');
  for(let i=0;i<b64.length;i+=12000)console.log(b64.slice(i,i+12000));
  console.log(tag+'_B64_END');
  console.log(tag+'_BYTES '+fs.statSync(file).size);
}
printB64('AUDIT_IDLE',idleSheet);
printB64('AUDIT_MOTION',motionSheet);

await browser.close();
