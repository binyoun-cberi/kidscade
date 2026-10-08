import {chromium} from 'playwright';
import sharp from 'sharp';
const browser=await chromium.launch({headless:true,args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1050,height:890},deviceScaleFactor:1});
await page.addInitScript(()=>sessionStorage.setItem('kc_teacher_admin_key','audit-key'));
page.on('pageerror',e=>console.log('PAGEERROR',e.message));
await page.route('**/api/teacher/overview',route=>route.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"scope":"global"}'}));
await page.route('**/teacher/character-3d-studio.js*',async route=>{
  const response=await route.fetch();
  const old=await response.text();
  await route.fulfill({response,body:old+`
window.__auditFace=()=>{
 const ns=['character_low','kidscade_male_body','eyes','eyelashes','kidscade_male_eyes','kidscade_male_brows','kidscade_male_hair_short'];
 const obj={};
 for(const name of ns){
   const mesh=getNode(name);
   const g=mesh?.geometry;
   if(g&&!g.boundingBox)g.computeBoundingBox();
   obj[name]={localVisible:mesh?.visible,effective:mesh?isEffectivelyVisible(mesh,sourceScene):null,verts:g?.getAttribute('position')?.count??null,
   triangles:g?.index?.count/3??null,
   min:g?.boundingBox?.min.toArray(),max:g?.boundingBox?.max.toArray(),parents:[]};
   let p=mesh?.parent;while(p&&p!==sourceScene){obj[name].parents.push({name:p.name,visible:p.visible});p=p.parent;}
 }
 return obj;
};
window.__componentStats=()=>{
 const mesh=getNode('eyelashes'),g=mesh.geometry,p=g.getAttribute('position'),indices=g.index.array;
 const root=Array.from({length:p.count},(_,i)=>i);
 const find=x=>{let r=x;while(root[r]!==r)r=root[r];while(root[x]!==x){let q=root[x];root[x]=r;x=q;}return r;};
 const merge=(a,b)=>{a=find(a);b=find(b);if(a!==b)root[b]=a;};
 for(let i=0;i<indices.length;i+=3){merge(indices[i],indices[i+1]);merge(indices[i],indices[i+2]);}
 const comps=new Map();
 for(let i=0;i<p.count;i++){
  const r=find(i);if(!comps.has(r))comps.set(r,{verts:0,tris:0,min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity],sum:[0,0,0]});
  const d=comps.get(r);d.verts++;
  for(let a=0;a<3;a++){const v=a===0?p.getX(i):a===1?p.getY(i):p.getZ(i);d.min[a]=Math.min(d.min[a],v);d.max[a]=Math.max(d.max[a],v);d.sum[a]+=v;}
 }
 for(let i=0;i<indices.length;i+=3)comps.get(find(indices[i])).tris++;
 const arr=[...comps.values()].map(d=>({...d,center:d.sum.map(v=>v/d.verts)}));
 return arr.sort((a,b)=>b.tris-a.tris);
};
window.__changeFace=(show)=>{
 for(const name of ['eyes','eyelashes','kidscade_male_eyes','kidscade_male_brows','kidscade_male_hair_short']){
   setNodeVisible(name,show.includes(name));
 }
 refreshMetrics();
};
`});
});
await page.goto('http://127.0.0.1:4173/teacher/character-3d-studio.html',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>document.querySelector('#chibiAssetStatus')?.textContent?.includes('로드 완료'),{timeout:45000});
await page.click('[data-chibi-preset="male"]');
await page.click('[data-view="front"]');
await page.click('[data-clip="anim_iddle"]');
await page.waitForTimeout(420);
console.log('AUDIT_VISIBLE_DEFAULT '+JSON.stringify(await page.evaluate(()=>window.__auditFace())));
console.log('AUDIT_LASH_COMPONENTS '+JSON.stringify(await page.evaluate(()=>window.__componentStats())));
const cases=[
 ['MALE DEFAULT',['kidscade_male_eyes','kidscade_male_brows','kidscade_male_hair_short']],
 ['NO BROWS',['kidscade_male_eyes','kidscade_male_hair_short']],
 ['BROWS ONLY',['kidscade_male_brows','kidscade_male_hair_short']],
 ['BODY ONLY',['kidscade_male_hair_short']]
];
const composites=[];
for(let i=0;i<cases.length;i++){
 const [label,names]=cases[i];await page.evaluate(names=>window.__changeFace(names),names);
 await page.waitForTimeout(350);
 const png=await page.locator('#view').screenshot({type:'png'});
 const m=await sharp(png).metadata();
 const crop=await sharp(png).extract({left:Math.round(m.width*.25),top:Math.round(m.height*.12),width:Math.round(m.width*.5),height:Math.round(m.height*.43)})
 .resize(470,450,{fit:'contain'}).webp({quality:58}).toBuffer();
 const x=(i%2)*470,y=Math.floor(i/2)*480;
 composites.push({input:crop,left:x,top:y+30});
 const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="470" height="30"><rect fill="#fff" width="470" height="30"/><text font-family="Arial" font-size="17" x="7" y="20">'+label+'</text></svg>');
 composites.push({input:svg,left:x,top:y});
 console.log('AUDIT_CASE '+label+' '+JSON.stringify(await page.evaluate(()=>window.__auditFace())));
}
const buf=await sharp({create:{width:940,height:960,channels:4,background:'#17212b'}}).composite(composites).webp({quality:54}).toBuffer();
console.log('AUDIT_IMAGE_BEGIN');
let b64=buf.toString('base64');for(let i=0;i<b64.length;i+=12000)console.log(b64.slice(i,i+12000));
console.log('AUDIT_IMAGE_END');
await browser.close();
